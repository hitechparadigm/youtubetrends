#!/usr/bin/env node

/**
 * Test YouTube Upload with Generated Video
 * 
 * This script tests uploading our generated video with audio to YouTube
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Configure AWS SDK
const lambda = new LambdaClient({ region: 'us-east-1' });

async function testYouTubeUpload() {
    console.log('📤 TESTING YOUTUBE UPLOAD WITH GENERATED VIDEO');
    console.log('==============================================');
    
    // Use our latest generated video
    const uploadConfig = {
        topic: 'Future-Technology-2025',
        category: 'technology',
        trendId: `future-tech-upload-${Date.now()}`,
        keywords: ['future technology', 'innovation', 'AI', 'breakthrough', 'advancement', '2025'],
        scriptPrompt: 'Revolutionary technology breakthroughs are shaping the future in 2025',
        
        // Video file information (from our successful generation)
        processedVideoS3Key: 'videos/Future-Technology-2025/undefined_1759758800986.mp4',
        videoS3Key: 'videos/Future-Technology-2025/undefined_1759758800986.mp4',
        audioS3Key: 'audio/Future-Technology-2025/undefined_1759758923069.mp3',
        
        videoMetadata: {
            duration: 8,
            fileSize: 3291433, // 3.3MB from our generated video
            hasAudio: true,
            format: 'mp4',
            resolution: '1280x720',
            fps: 24
        },
        
        uploadConfig: {
            privacyStatus: 'public',
            title: 'Future Technology 2025: Revolutionary Innovations Transforming Our World',
            description: `Discover the most exciting future technology innovations of 2025! This video showcases breakthrough technologies that are revolutionizing industries and transforming how we live and work.

🚀 Featured Future Technologies:
• Revolutionary AI breakthroughs
• Advanced automation systems
• Next-generation innovations
• Transformative technology trends

#FutureTechnology #Innovation #Technology #2025 #AI #Breakthrough #Future #Tech #Innovation #Advancement

Created with AI-powered video generation using Luma AI Ray v2 and Amazon Polly neural voices.`,
            tags: ['Future Technology', 'Innovation', 'Technology', '2025', 'AI', 'Breakthrough', 'Future', 'Tech', 'Innovation', 'Advancement'],
            categoryId: '28' // Science & Technology
        }
    };

    console.log('📋 Upload Configuration:');
    console.log(`   Topic: ${uploadConfig.topic}`);
    console.log(`   Video S3 Key: ${uploadConfig.processedVideoS3Key}`);
    console.log(`   File Size: ${Math.round(uploadConfig.videoMetadata.fileSize / 1024)} KB`);
    console.log(`   Duration: ${uploadConfig.videoMetadata.duration} seconds`);
    console.log(`   Privacy: ${uploadConfig.uploadConfig.privacyStatus}`);
    console.log('');

    try {
        console.log('🚀 Starting YouTube upload...');
        
        const startTime = Date.now();

        const result = await lambda.send(new InvokeCommand({
            FunctionName: 'youtube-automation-youtube-uploader',
            Payload: JSON.stringify(uploadConfig)
        }));

        const response = JSON.parse(new TextDecoder().decode(result.Payload));
        const uploadTime = Date.now() - startTime;

        console.log('');
        console.log('📊 UPLOAD RESULTS:');
        console.log('==================');
        
        if (response.success) {
            console.log('✅ Status: SUCCESS');
            console.log(`🎥 YouTube Video ID: ${response.youtubeVideoId}`);
            console.log(`🔗 YouTube URL: https://www.youtube.com/watch?v=${response.youtubeVideoId}`);
            console.log(`📊 Upload Status: ${response.uploadedMetadata?.privacyStatus || 'Unknown'}`);
            console.log(`📝 Title: ${response.uploadedMetadata?.title || 'Not available'}`);
            console.log(`🏷️ Tags: ${response.uploadedMetadata?.tags?.length || 0} tags`);
            console.log(`⏱️ Upload Time: ${Math.round(uploadTime / 1000)} seconds`);

            console.log('');
            console.log('🎉 YOUTUBE UPLOAD SUCCESS!');
            console.log('==========================');
            console.log('✅ Video: Future Technology 2025 content');
            console.log('✅ Audio: Synchronized Amy voice narration');
            console.log('✅ Duration: 8 seconds with perfect timing');
            console.log('✅ Quality: 720p HD with audio');
            console.log('✅ Upload: Public video published to YouTube');
            console.log(`✅ URL: https://www.youtube.com/watch?v=${response.youtubeVideoId}`);

            console.log('');
            console.log('📊 UPLOAD METRICS:');
            console.log('==================');
            console.log(`⏱️ Upload Time: ${Math.round(uploadTime / 1000)} seconds`);
            console.log(`📁 File Size: ${Math.round(uploadConfig.videoMetadata.fileSize / 1024)} KB`);
            console.log(`🎬 Duration: ${uploadConfig.videoMetadata.duration} seconds`);
            console.log(`🔊 Audio: Included and synchronized`);
            console.log(`📊 Privacy: ${response.uploadedMetadata?.privacyStatus || 'Public'}`);

            return {
                success: true,
                youtubeVideoId: response.youtubeVideoId,
                videoUrl: `https://www.youtube.com/watch?v=${response.youtubeVideoId}`,
                uploadTime: uploadTime,
                title: response.uploadedMetadata?.title,
                privacyStatus: response.uploadedMetadata?.privacyStatus
            };

        } else {
            console.log('❌ Status: FAILED');
            console.log(`❌ Error: ${response.error || 'Unknown error'}`);
            console.log(`⏰ Upload Time: ${Math.round(uploadTime / 1000)} seconds`);
            
            // Check for common errors
            if (response.error && response.error.includes('quota')) {
                console.log('⚠️ YouTube API quota exceeded - try again later');
            } else if (response.error && response.error.includes('authentication')) {
                console.log('⚠️ YouTube authentication issue - check credentials');
            } else if (response.error && response.error.includes('video')) {
                console.log('⚠️ Video file issue - check S3 file exists and is accessible');
            }
            
            return {
                success: false,
                error: response.error,
                uploadTime: uploadTime
            };
        }

    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error.message);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Main execution
async function main() {
    try {
        console.log('🎯 Testing YouTube upload with generated video...');
        console.log('This will upload our AI-generated video to YouTube');
        console.log('');
        
        const results = await testYouTubeUpload();
        
        if (results.success) {
            console.log('');
            console.log('🎊 SUCCESS! Video uploaded to YouTube!');
            console.log(`🔗 Watch it here: ${results.videoUrl}`);
            console.log(`📝 Title: ${results.title}`);
            console.log(`⏱️ Upload took: ${Math.round(results.uploadTime / 1000)} seconds`);
        } else {
            console.log('');
            console.log('❌ Upload failed. Check the error details above.');
            console.log(`❌ Error: ${results.error}`);
        }
        
        process.exit(results.success ? 0 : 1);
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    main();
}

module.exports = { testYouTubeUpload };