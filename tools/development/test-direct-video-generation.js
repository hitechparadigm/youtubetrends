#!/usr/bin/env node

/**
 * Test Direct Video Generation
 * Calls the video generator directly with the same format as Step Functions
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testDirectVideoGeneration() {
    console.log('🎬 TESTING DIRECT VIDEO GENERATION');
    console.log('=' .repeat(60));
    console.log('🎯 Using the same format as Step Functions workflow\n');

    const lambda = new LambdaClient({ region: 'us-east-1' });
    
    // Use the exact same format as the Step Functions workflow
    const videoGenerationEvent = {
        scriptPrompt: "Create a professional video about ETF investing benefits in 2025. Show modern financial graphics demonstrating how ETFs provide instant diversification across hundreds of companies with ultra-low expense ratios (often under 0.1% annually). Include visual examples of popular ETFs like VTI (Total Stock Market) and VOO (S&P 500). End with: Start your ETF journey today with broad market diversification and low fees.",
        topic: "investing",
        trendId: `direct-test-${Date.now()}`,
        videoConfig: {
            durationSeconds: 6, // Short for testing
            fps: 24,
            dimension: "1920x1080",
            quality: "high",
            includeAudio: true // CRITICAL: This is what we want to test
        },
        audioConfig: {
            voice: "neural",
            speed: "medium",
            language: "en-US"
        }
    };

    console.log('📋 Direct Video Generation Test:');
    console.log(`   🎯 Topic: ${videoGenerationEvent.topic}`);
    console.log(`   ⏱️  Duration: ${videoGenerationEvent.videoConfig.durationSeconds} seconds`);
    console.log(`   🎵 Audio: ${videoGenerationEvent.videoConfig.includeAudio ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    console.log(`   🎙️  Voice: ${videoGenerationEvent.audioConfig.voice}`);
    console.log(`   📊 Quality: ${videoGenerationEvent.videoConfig.quality}`);
    console.log(`   📐 Resolution: ${videoGenerationEvent.videoConfig.dimension}`);

    try {
        console.log('\n🚀 Calling video generator Lambda directly...');
        console.log('   📹 This will test Bedrock Nova Reel + Amazon Polly integration');
        console.log('   🔄 Please wait for video and audio generation...\n');
        
        const result = await lambda.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(videoGenerationEvent)
        }));

        const response = JSON.parse(new TextDecoder().decode(result.Payload));

        console.log('📊 VIDEO GENERATION RESULTS:');
        console.log('=' .repeat(40));

        if (response.success) {
            console.log('🎉 ✅ VIDEO GENERATION: SUCCESS!');
            console.log('');
            console.log('📹 Generated Content:');
            console.log(`   📁 Original Video: ${response.videoS3Key || 'N/A'}`);
            console.log(`   🎵 Audio File: ${response.audioS3Key || 'N/A'}`);
            console.log(`   🎬 Processed Video: ${response.processedVideoS3Key || 'N/A'}`);
            console.log(`   🔊 Has Audio: ${response.metadata?.hasAudio ? 'YES ✅' : 'NO ❌'}`);
            console.log(`   📏 Duration: ${response.metadata?.duration || 'Unknown'} seconds`);
            console.log(`   📦 File Size: ${response.metadata?.fileSize ? Math.round(response.metadata.fileSize / 1024 / 1024 * 100) / 100 : 'Unknown'} MB`);
            console.log(`   💰 Cost: $${response.generationCost || 'Unknown'}`);
            console.log(`   ⏱️  Time: ${response.executionTime || 'Unknown'}ms`);

            console.log('\n🎯 AUDIO INTEGRATION STATUS:');
            if (response.processedVideoS3Key && response.metadata?.hasAudio) {
                console.log('🎉 ✅ AUDIO INTEGRATION: WORKING PERFECTLY!');
                console.log('   • Video generated with Bedrock Nova Reel');
                console.log('   • Audio narration with Amazon Polly');
                console.log('   • Audio successfully integrated into video');
                console.log('   • Ready for YouTube upload with synchronized audio');
                
                // Now test YouTube upload with this video
                console.log('\n📤 TESTING YOUTUBE UPLOAD...');
                await testYouTubeUpload(response);
                
            } else if (response.processedVideoS3Key) {
                console.log('⚠️  PARTIAL SUCCESS: Video created but audio integration unclear');
            } else {
                console.log('❌ AUDIO INTEGRATION: FAILED');
                console.log('   No processed video created - audio merging failed');
            }

        } else {
            console.log('❌ VIDEO GENERATION: FAILED');
            console.log(`   Error: ${response.error || 'Unknown error'}`);
            
            if (response.error?.includes('Invalid Output Config')) {
                console.log('\n📋 BEDROCK CONFIGURATION ISSUE:');
                console.log('   • Check Nova Reel model access and permissions');
                console.log('   • Verify S3 output configuration format');
                console.log('   • Ensure IAM permissions for Bedrock async invoke');
            }
        }

    } catch (error) {
        console.error('\n❌ Direct video generation test failed:', error.message);
        
        if (error.message.includes('Function not found')) {
            console.log('\n📋 LAMBDA FUNCTION ISSUE:');
            console.log('   • Check if youtube-automation-video-generator exists');
            console.log('   • Verify Lambda function is deployed correctly');
        }
    }
}

async function testYouTubeUpload(videoGenerationResult) {
    const lambda = new LambdaClient({ region: 'us-east-1' });
    
    const uploadEvent = {
        processedVideoS3Key: videoGenerationResult.processedVideoS3Key,
        topic: "investing",
        trendId: videoGenerationResult.bedrockJobId || 'test-upload',
        scriptPrompt: "Professional video about ETF investing benefits with synchronized audio narration",
        keywords: ['ETF', 'investing', 'diversification', 'low fees', 'audio integration', 'AI generated'],
        videoMetadata: {
            duration: videoGenerationResult.metadata.duration,
            fileSize: videoGenerationResult.metadata.fileSize,
            format: videoGenerationResult.metadata.format || 'mp4',
            hasAudio: videoGenerationResult.metadata.hasAudio
        },
        uploadConfig: {
            privacyStatus: 'unlisted', // Keep test videos unlisted
            categoryId: '27' // Education category
        }
    };

    try {
        console.log('   📤 Uploading to YouTube...');
        
        const result = await lambda.send(new InvokeCommand({
            FunctionName: 'youtube-automation-youtube-uploader',
            Payload: JSON.stringify(uploadEvent)
        }));

        const response = JSON.parse(new TextDecoder().decode(result.Payload));

        if (response.success) {
            console.log('   🎉 ✅ YOUTUBE UPLOAD: SUCCESS!');
            console.log('');
            console.log('📺 YOUR AI VIDEO IS LIVE:');
            console.log(`   🔗 Video URL: ${response.videoUrl}`);
            console.log(`   🆔 YouTube ID: ${response.youtubeVideoId}`);
            console.log(`   📝 Title: ${response.uploadedMetadata.title}`);
            console.log(`   🔒 Privacy: ${response.uploadedMetadata.privacyStatus}`);
            console.log(`   ⏱️  Upload Time: ${response.performanceTracking.uploadTime}ms`);
            
            console.log('\n🎯 COMPLETE SUCCESS:');
            console.log('   ✅ AI video generation with Bedrock Nova Reel');
            console.log('   ✅ Audio narration with Amazon Polly');
            console.log('   ✅ Audio-video integration and synchronization');
            console.log('   ✅ YouTube upload with proper metadata');
            console.log('   ✅ End-to-end pipeline working with audio!');
            
        } else {
            console.log('   ❌ YouTube upload failed:', response.error);
        }
        
    } catch (error) {
        console.log('   ❌ YouTube upload error:', error.message);
    }
}

// Run the test
testDirectVideoGeneration().catch(console.error);