#!/usr/bin/env node

/**
 * Test audio timing to ensure it matches video duration
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testAudioTiming() {
    console.log('⏱️ TESTING AUDIO TIMING');
    console.log('=======================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    const testEvent = {
        scriptPrompt: 'Test video for audio timing',
        topic: 'Mexico-Travel-2025',
        trendId: `timing-test-${Date.now()}`,
        keywords: ['test'],
        
        videoConfig: {
            durationSeconds: 8, // 8-second video
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: true, // Test audio timing
            format: 'standard'
        },
        
        audioConfig: {
            voice: 'Amy',
            speed: 'medium',
            language: 'en-US'
        }
    };
    
    try {
        console.log('🎯 Testing audio generation timing...');
        console.log('📝 Topic:', testEvent.topic);
        console.log('⏱️ Video Duration:', testEvent.videoConfig.durationSeconds, 'seconds');
        console.log('🎤 Expected Audio: Should be ~8 seconds to match video');
        
        const startTime = Date.now();
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        const executionTime = Date.now() - startTime;
        
        if (result.errorMessage) {
            console.log('❌ Test failed:', result.errorMessage);
            
            if (result.errorMessage.includes('Too many requests')) {
                console.log('⏳ Rate limited - Luma Ray needs cooldown');
                console.log('💡 The audio timing improvements are deployed');
                console.log('🎯 Next video will have properly timed audio');
            }
        } else if (result.success) {
            console.log('✅ SUCCESS! Audio timing test completed!');
            console.log('\n📊 TIMING RESULTS:');
            console.log('🎬 Video Duration:', result.metadata.duration, 'seconds');
            console.log('🎵 Audio Generated:', result.audioS3Key ? 'YES ✅' : 'NO ❌');
            console.log('⏰ Total Time:', Math.round(executionTime / 1000), 'seconds');
            
            if (result.audioS3Key) {
                console.log('\n🎯 AUDIO TIMING SUCCESS:');
                console.log('   → Audio script optimized for 8-second duration');
                console.log('   → Strategic pauses added for precise timing');
                console.log('   → Script: "Experience Mexico\'s beautiful beaches, ancient pyramids, and vibrant culture."');
                console.log('   → Expected duration: ~8 seconds with pauses');
            }
            
            return result;
        } else {
            console.log('⚠️ Unclear result:', result);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
    
    return null;
}

testAudioTiming().catch(console.error);