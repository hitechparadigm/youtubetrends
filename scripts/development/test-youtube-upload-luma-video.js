#!/usr/bin/env node

/**
 * Test YouTube upload with our first Luma Ray generated video
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testYouTubeUploadLumaVideo() {
    console.log('📤 YOUTUBE UPLOAD TEST - LUMA RAY VIDEO');
    console.log('=======================================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    // Use the actual video we generated with Luma Ray - with correct parameter format
    const uploadEvent = {
        processedVideoS3Key: 'videos/nature/luma-sunset-test.mp4',
        topic: 'Beautiful Nature Sunset',
        trendId: 'test-1759680906985',
        keywords: ['sunset', 'mountains', 'nature', 'beautiful', 'AI generated'],
        scriptPrompt: 'A beautiful sunset over mountains',
        videoMetadata: {
            fileSize: 528905, // Size from our S3 listing
            duration: 6,
            format: 'mp4',
            hasAudio: false
        },
        uploadConfig: {
            privacy: 'unlisted', // Start with unlisted for testing
            category: 'Entertainment'
        }
    };
    
    try {
        console.log('🎬 Uploading Luma Ray generated video to YouTube...');
        console.log('📄 S3 Key:', uploadEvent.processedVideoS3Key);
        console.log('🎯 Topic:', uploadEvent.topic);
        console.log('🔒 Privacy:', uploadEvent.uploadConfig.privacy);
        console.log('📦 File Size:', uploadEvent.videoMetadata.fileSize, 'bytes');
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-youtube-uploader',
            Payload: JSON.stringify(uploadEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        if (result.errorMessage) {
            console.log('❌ YouTube upload failed:', result.errorMessage);
            console.log('Error type:', result.errorType);
            
            if (result.errorMessage.includes('specified key does not exist')) {
                console.log('\n🔍 S3 Key Issue Detected:');
                console.log('   → The YouTube uploader might not have access to us-west-2 bucket');
                console.log('   → Or the S3 key format is different than expected');
                console.log('   → Need to check YouTube uploader Lambda configuration');
            }
        } else if (result.success) {
            console.log('✅ SUCCESS! Video uploaded to YouTube!');
            console.log('🎬 YouTube Video ID:', result.youtubeVideoId);
            console.log('🔗 YouTube URL:', result.videoUrl);
            console.log('📊 Upload Details:', {
                title: result.uploadedMetadata?.title,
                duration: result.performanceTracking?.uploadTime,
                privacy: result.uploadedMetadata?.privacyStatus,
                uploadTime: result.performanceTracking?.uploadTime
            });
            
            console.log('\n🎉 MILESTONE ACHIEVED:');
            console.log('   → First AI video generated with Luma Ray');
            console.log('   → Successfully uploaded to YouTube');
            console.log('   → Complete end-to-end automation working!');
        } else {
            console.log('⚠️ Upload response unclear:', result);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testYouTubeUploadLumaVideo().catch(console.error);