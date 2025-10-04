import { Handler, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface VideoProcessorEvent {
  videoS3Key: string;
  audioS3Key?: string;
  subtitlesS3Key?: string;
  processingConfig: {
    embedSubtitles: boolean;
    mergeAudio: boolean;
    outputFormat: 'mp4' | 'webm';
    quality: 'high' | 'medium' | 'low';
  };
  metadata: {
    duration: number;
    topic: string;
    trendId: string;
  };
}

export interface VideoProcessorResponse {
  success: boolean;
  processedVideoS3Key?: string;
  metadata: {
    originalSize: number;
    processedSize: number;
    hasAudio: boolean;
    hasSubtitles: boolean;
    processingTime: number;
  };
  error?: string;
}

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const PROCESSED_BUCKET = process.env.VIDEO_BUCKET || 'youtube-automation-videos';

export const handler: Handler<VideoProcessorEvent, VideoProcessorResponse> = async (
  event: VideoProcessorEvent,
  context: Context
): Promise<VideoProcessorResponse> => {
  const startTime = Date.now();
  const tempDir = '/tmp';
  
  console.log('🎬 Video Processor started', {
    videoS3Key: event.videoS3Key,
    audioS3Key: event.audioS3Key,
    subtitlesS3Key: event.subtitlesS3Key,
    embedSubtitles: event.processingConfig.embedSubtitles,
    mergeAudio: event.processingConfig.mergeAudio
  });

  try {
    // Step 1: Download video file from S3
    const videoPath = join(tempDir, 'input-video.mp4');
    const originalSize = await downloadFromS3(event.videoS3Key, videoPath);
    
    let audioPath: string | null = null;
    let subtitlesPath: string | null = null;
    
    // Step 2: Download audio file if needed
    if (event.audioS3Key && event.processingConfig.mergeAudio) {
      audioPath = join(tempDir, 'input-audio.mp3');
      await downloadFromS3(event.audioS3Key, audioPath);
      console.log('✅ Audio file downloaded');
    }
    
    // Step 3: Download subtitles file if needed
    if (event.subtitlesS3Key && event.processingConfig.embedSubtitles) {
      subtitlesPath = join(tempDir, 'subtitles.srt');
      await downloadFromS3(event.subtitlesS3Key, subtitlesPath);
      console.log('✅ Subtitles file downloaded');
    }
    
    // Step 4: Process video with FFmpeg
    const outputPath = join(tempDir, 'processed-video.mp4');
    await processVideoWithFFmpeg({
      inputVideo: videoPath,
      inputAudio: audioPath,
      inputSubtitles: subtitlesPath,
      output: outputPath,
      config: event.processingConfig
    });
    
    // Step 5: Upload processed video back to S3
    const processedS3Key = `processed/${event.metadata.trendId}/video-with-audio-subtitles.mp4`;
    const processedSize = await uploadToS3(outputPath, processedS3Key);
    
    // Step 6: Cleanup temporary files
    await cleanupTempFiles([videoPath, audioPath, subtitlesPath, outputPath]);
    
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Video processing completed', {
      processedS3Key,
      originalSize,
      processedSize,
      processingTime
    });

    return {
      success: true,
      processedVideoS3Key: processedS3Key,
      metadata: {
        originalSize,
        processedSize,
        hasAudio: !!audioPath,
        hasSubtitles: !!subtitlesPath,
        processingTime
      }
    };

  } catch (error) {
    console.error('❌ Video processing failed:', error);
    
    return {
      success: false,
      metadata: {
        originalSize: 0,
        processedSize: 0,
        hasAudio: false,
        hasSubtitles: false,
        processingTime: Date.now() - startTime
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function downloadFromS3(s3Key: string, localPath: string): Promise<number> {
  console.log(`📥 Downloading ${s3Key} to ${localPath}`);
  
  const command = new GetObjectCommand({
    Bucket: PROCESSED_BUCKET,
    Key: s3Key
  });
  
  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error(`File not found: ${s3Key}`);
  }
  
  const chunks: Uint8Array[] = [];
  const stream = response.Body as any;
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  const buffer = Buffer.concat(chunks);
  await fs.writeFile(localPath, buffer);
  
  console.log(`✅ Downloaded ${buffer.length} bytes`);
  return buffer.length;
}

async function uploadToS3(localPath: string, s3Key: string): Promise<number> {
  console.log(`📤 Uploading ${localPath} to ${s3Key}`);
  
  const fileBuffer = await fs.readFile(localPath);
  
  const command = new PutObjectCommand({
    Bucket: PROCESSED_BUCKET,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'video/mp4'
  });
  
  await s3Client.send(command);
  
  console.log(`✅ Uploaded ${fileBuffer.length} bytes`);
  return fileBuffer.length;
}

interface FFmpegProcessingOptions {
  inputVideo: string;
  inputAudio: string | null;
  inputSubtitles: string | null;
  output: string;
  config: {
    embedSubtitles: boolean;
    mergeAudio: boolean;
    outputFormat: string;
    quality: string;
  };
}

async function processVideoWithFFmpeg(options: FFmpegProcessingOptions): Promise<void> {
  console.log('🎞️ Processing video with FFmpeg...');
  
  const ffmpegArgs: string[] = [];
  
  // Input video
  ffmpegArgs.push('-i', options.inputVideo);
  
  // Input audio (if provided)
  if (options.inputAudio && options.config.mergeAudio) {
    ffmpegArgs.push('-i', options.inputAudio);
  }
  
  // Video codec and quality settings
  const qualitySettings = getQualitySettings(options.config.quality);
  ffmpegArgs.push(...qualitySettings);
  
  // Audio settings
  if (options.inputAudio && options.config.mergeAudio) {
    ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
    ffmpegArgs.push('-map', '0:v:0', '-map', '1:a:0'); // Map video from input 0, audio from input 1
  } else {
    ffmpegArgs.push('-c:a', 'copy'); // Copy existing audio if any
  }
  
  // Subtitle embedding
  if (options.inputSubtitles && options.config.embedSubtitles) {
    // Burn subtitles into video (hardcoded)
    ffmpegArgs.push('-vf', `subtitles=${options.inputSubtitles}:force_style='FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'`);
  }
  
  // Output settings
  ffmpegArgs.push('-f', 'mp4');
  ffmpegArgs.push('-movflags', '+faststart'); // Optimize for web streaming
  ffmpegArgs.push('-y'); // Overwrite output file
  ffmpegArgs.push(options.output);
  
  console.log('🔧 FFmpeg command:', ['ffmpeg', ...ffmpegArgs].join(' '));
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ FFmpeg processing completed successfully');
        resolve();
      } else {
        console.error('❌ FFmpeg failed with code:', code);
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`FFmpeg failed with exit code ${code}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.error('❌ FFmpeg spawn error:', error);
      reject(error);
    });
  });
}

function getQualitySettings(quality: string): string[] {
  switch (quality) {
    case 'high':
      return ['-c:v', 'libx264', '-crf', '18', '-preset', 'medium'];
    case 'medium':
      return ['-c:v', 'libx264', '-crf', '23', '-preset', 'medium'];
    case 'low':
      return ['-c:v', 'libx264', '-crf', '28', '-preset', 'fast'];
    default:
      return ['-c:v', 'libx264', '-crf', '23', '-preset', 'medium'];
  }
}

async function cleanupTempFiles(filePaths: (string | null)[]): Promise<void> {
  console.log('🧹 Cleaning up temporary files...');
  
  for (const filePath of filePaths) {
    if (filePath) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete ${filePath}:`, error);
      }
    }
  }
}

// Export for testing
export {
  downloadFromS3,
  uploadToS3,
  processVideoWithFFmpeg,
  getQualitySettings
};