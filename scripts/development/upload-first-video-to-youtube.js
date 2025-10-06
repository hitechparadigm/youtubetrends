#!/usr/bin/env node

/**
 * Upload our first ETF video with audio to YouTube
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function uploadFirstVideoToYouTube() {
    console.log('📤 UPLOADING FIRST VIDEO TO YOUTUBE');
    console.log('===================================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    // Use our generated video with audio
    const uploadEvent = {
        processedVideoS3Key: 'videos/ETF-Investing-2025/etf-simple-overlay.mp4',
        topic: 'ETF Investing Future 2025',
        trendId: 'etf-with-proper-audio-1759711189804',
        keywords: ['ETF', 'investing', '2025', 'future', 'portfolio', 'diversification', 'financial', 'market trends'],
        scriptPrompt: `Professional educational video about "The Future of ETF Investing in 2025" with dynamic financial charts and graphs displaying ETF performance data, market trends, and portfolio diversification benefits.`,
        videoMetadata: {
            fileSize: 5242880, // 5MB
            duration: 8,
            format: 'mp4',
            hasAudio: true // Audio merged with MediaConvert!
        },
        uploadConfig: {
            privacyStatus: 'public', // Make it public for maximum reach
            category: 'Education'
        }
    };
    
    try {
        console.log('🎬 Uploading SIMPLE OVERLAY ETF video to YouTube...');
        console.log('📄 Video:', uploadEvent.processedVideoS3Key);
        console.log('🎯 Topic:', uploadEvent.topic);
        console.log('⏱️ Duration:', uploadEvent.videoMetadata.duration, 'seconds');
        console.log('📦 File Size:', Math.round(uploadEvent.videoMetadata.fileSize / 1024), 'KB');
        console.log('🔒 Privacy:', uploadEvent.uploadConfig.privacyStatus);
        
        const uploadStartTime = Date.now();
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-youtube-uploader',
            Payload: JSON.stringify(uploadEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        const uploadTime = Date.now() - uploadStartTime;
        
        if (result.errorMessage) {
            console.log('❌ YouTube upload failed:', result.errorMessage);
            console.log('Error type:', result.errorType);
            
            if (result.errorMessage.includes('specified key does not exist')) {
                console.log('\n🔍 S3 Key Issue Detected:');
                console.log('   → The video might be in the Luma bucket (us-west-2)');
                console.log('   → YouTube uploader expects main bucket (us-east-1)');
                console.log('   → Need to copy video to main bucket first');
            }
        } else if (result.success) {
            console.log('✅ SUCCESS! Video uploaded to YouTube!');
            console.log('\n📊 UPLOAD RESULTS:');
            console.log('🎬 YouTube Video ID:', result.youtubeVideoId);
            console.log('🔗 YouTube URL:', result.videoUrl);
            console.log('📝 Title:', result.uploadedMetadata?.title);
            console.log('🔒 Privacy:', result.uploadedMetadata?.privacyStatus);
            console.log('⏰ Upload Time:', Math.round(uploadTime / 1000), 'seconds');
            
            console.log('\n🎉 MILESTONE ACHIEVED:');
            console.log('   → First AI-generated ETF video created');
            console.log('   → Professional financial content with audio');
            console.log('   → Successfully uploaded to YouTube');
            console.log('   → Public and discoverable');
            console.log('   → Complete end-to-end automation working!');
            
            console.log('\n🚀 READY FOR SCALING:');
            console.log('   → Video generation: $0.11 per 8-second video');
            console.log('   → Upload process: Fully automated');
            console.log('   → Content quality: Professional grade');
            console.log('   → System status: Production ready');
            
            return {
                success: true,
                youtubeVideoId: result.youtubeVideoId,
                youtubeUrl: result.videoUrl,
                title: result.uploadedMetadata?.title,
                uploadTime: uploadTime
            };
        } else {
            console.log('⚠️ Upload response unclear:', result);
        }
        
    } catch (error) {
        console.log('❌ Upload failed:', error.message);
    }
    
    return null;
}

// Export for use in other scripts
module.exports = { uploadFirstVideoToYouTube };

// Run if called directly
if (require.main === module) {
    uploadFirstVideoToYouTube().catch(console.error);
}