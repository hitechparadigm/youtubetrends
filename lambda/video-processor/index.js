/**
 * Video Processor Lambda - Handles audio merging and video post-processing
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event, context) => {
    const startTime = Date.now();
    
    console.log('Video Processor Lambda started', {
        requestId: context.awsRequestId,
        videoS3Key: event.videoS3Key,
        audioS3Key: event.audioS3Key,
        mergeAudio: event.processingConfig?.mergeAudio
    });

    try {
        // Validate inputs
        if (!event.videoS3Key) {
            throw new Error('videoS3Key is required');
        }

        const bucketName = process.env.VIDEO_BUCKET || 'youtube-automation-videos-786673323159-us-east-1';
        
        // If no audio merging needed, just return the original video
        if (!event.processingConfig?.mergeAudio || !event.audioS3Key) {
            console.log('No audio merging requested, returning original video');
            
            // Get original video metadata
            const videoMetadata = await getVideoMetadata(bucketName, event.videoS3Key);
            
            return {
                success: true,
                processedVideoS3Key: event.videoS3Key,
                metadata: {
                    ...videoMetadata,
                    hasAudio: false
                },
                processingCost: 0,
                executionTime: Date.now() - startTime
            };
        }

        // Download video and audio files
        console.log('Downloading video and audio files...');
        const videoBuffer = await downloadFromS3(bucketName, event.videoS3Key);
        const audioBuffer = await downloadFromS3(bucketName, event.audioS3Key);

        // Create temporary files
        const tempDir = '/tmp';
        const videoPath = path.join(tempDir, 'input_video.mp4');
        const audioPath = path.join(tempDir, 'input_audio.mp3');
        const outputPath = path.join(tempDir, 'output_video.mp4');

        fs.writeFileSync(videoPath, videoBuffer);
        fs.writeFileSync(audioPath, audioBuffer);

        // Merge audio and video using FFmpeg
        console.log('Merging audio and video...');
        await mergeAudioVideo(videoPath, audioPath, outputPath);

        // Upload merged video back to S3
        const outputBuffer = fs.readFileSync(outputPath);
        const outputS3Key = generateOutputS3Key(event.videoS3Key, 'with-audio');
        
        await uploadToS3(bucketName, outputS3Key, outputBuffer, 'video/mp4');

        // Get output metadata
        const outputMetadata = await getVideoMetadata(bucketName, outputS3Key);

        // Cleanup temp files
        [videoPath, audioPath, outputPath].forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        console.log('Video processing completed successfully', {
            originalVideo: event.videoS3Key,
            processedVideo: outputS3Key,
            hasAudio: true,
            executionTime: Date.now() - startTime
        });

        return {
            success: true,
            processedVideoS3Key: outputS3Key,
            metadata: {
                ...outputMetadata,
                hasAudio: true
            },
            processingCost: calculateProcessingCost(outputMetadata.duration),
            executionTime: Date.now() - startTime
        };

    } catch (error) {
        console.error('Video processing failed', {
            error: error.message,
            stack: error.stack,
            requestId: context.awsRequestId
        });

        return {
            success: false,
            outputMetadata: {
                duration: 0,
                fileSize: 0,
                format: '',
                resolution: '',
                bitrate: '',
                audioChannels: 0,
                isYouTubeOptimized: false
            },
            processingCost: 0,
            executionTime: Date.now() - startTime,
            error: error.message
        };
    }
};

async function downloadFromS3(bucket, key) {
    console.log(`Downloading s3://${bucket}/${key}`);
    
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }));

    if (!response.Body) {
        throw new Error(`File not found: s3://${bucket}/${key}`);
    }

    // Convert stream to buffer
    const chunks = [];
    if (response.Body instanceof Buffer) {
        return response.Body;
    }

    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

async function uploadToS3(bucket, key, buffer, contentType) {
    console.log(`Uploading to s3://${bucket}/${key}`);
    
    await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }));
}

async function mergeAudioVideo(videoPath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        // FFmpeg command to merge audio and video
        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,           // Input video
            '-i', audioPath,           // Input audio
            '-c:v', 'copy',            // Copy video codec (no re-encoding)
            '-c:a', 'aac',             // Convert audio to AAC
            '-shortest',               // Match shortest stream duration
            '-y',                      // Overwrite output file
            outputPath
        ]);

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('FFmpeg completed successfully');
                resolve();
            } else {
                console.error('FFmpeg failed:', stderr);
                reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
            }
        });

        ffmpeg.on('error', (error) => {
            console.error('FFmpeg spawn error:', error);
            reject(error);
        });
    });
}

async function getVideoMetadata(bucket, key) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: key
        }));

        return {
            duration: 10, // Default duration - could be enhanced with ffprobe
            fileSize: response.ContentLength || 0,
            format: 'mp4',
            resolution: '1280x720',
            bitrate: '1000k',
            audioChannels: 2,
            isYouTubeOptimized: true
        };
    } catch (error) {
        console.error('Failed to get video metadata:', error);
        return {
            duration: 0,
            fileSize: 0,
            format: '',
            resolution: '',
            bitrate: '',
            audioChannels: 0,
            isYouTubeOptimized: false
        };
    }
}

function generateOutputS3Key(originalKey, suffix) {
    // Extract path and filename
    const lastSlash = originalKey.lastIndexOf('/');
    const path = lastSlash >= 0 ? originalKey.substring(0, lastSlash + 1) : '';
    const filename = lastSlash >= 0 ? originalKey.substring(lastSlash + 1) : originalKey;
    
    // Remove extension and add suffix
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    return `${path}${nameWithoutExt}_${suffix}.mp4`;
}

function calculateProcessingCost(durationSeconds) {
    // Rough estimate: $0.01 per minute of processing
    return Math.round((durationSeconds / 60) * 0.01 * 100) / 100;
}