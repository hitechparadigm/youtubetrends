#!/usr/bin/env node

/**
 * Test video generation WITH audio integration
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testVideoWithAudio() {
    console.log('🎬 VIDEO + AUDIO GENERATION TEST');
    console.log('================================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    const testEvent = {
        scriptPrompt: 'Create a professional video about ETF investing benefits. Show charts, graphs, and financial data visualizations that explain how ETFs provide diversification, low costs, and easy access to various market sectors.',
        topic: 'ETF investing benefits',
        trendId: `test-audio-${Date.now()}`,
        videoConfig: {
            durationSeconds: 10,
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: true // ENABLE AUDIO
        },
        audioConfig: {
            voice: 'Matthew',
            speed: 'medium',
            language: 'en-US',
            ssmlEnabled: true
        }
    };
    
    try {
        console.log('🎯 Testing video generation WITH audio...');
        console.log('Topic:', testEvent.topic);
        console.log('Duration:', testEvent.videoConfig.durationSeconds, 'seconds');
        console.log('Audio Voice:', testEvent.audioConfig.voice);
        console.log('Audio Enabled:', testEvent.videoConfig.includeAudio);
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        if (result.errorMessage) {
            console.log('❌ Lambda failed:', result.errorMessage);
            
            if (result.errorMessage.includes('Too many requests')) {
                console.log('⏳ Rate limited - need to wait longer between requests');
                console.log('💡 Luma Ray has strict rate limits, try again in 10-15 minutes');
            }
        } else if (result.success) {
            console.log('✅ SUCCESS! Video + Audio generation working!');
            console.log('📁 Original Video S3 Key:', result.videoS3Key);
            console.log('🎵 Audio S3 Key:', result.audioS3Key);
            console.log('🎬 Processed Video S3 Key:', result.processedVideoS3Key);
            console.log('🔊 Has Audio:', result.metadata.hasAudio ? 'YES ✅' : 'NO ❌');
            console.log('⏱️ Duration:', result.metadata.duration, 'seconds');
            console.log('📦 File Size:', Math.round(result.metadata.fileSize / 1024), 'KB');
            console.log('💰 Cost:', `$${result.generationCost}`);
            console.log('⏰ Generation Time:', Math.round(result.executionTime / 1000), 'seconds');
            
            if (result.metadata.hasAudio) {
                console.log('\n🎉 AUDIO INTEGRATION SUCCESS!');
                console.log('   → Video generated with Luma Ray');
                console.log('   → Audio generated with Polly');
                console.log('   → Audio and video merged successfully');
                console.log('   → Ready for YouTube upload!');
                
                return {
                    success: true,
                    processedVideoS3Key: result.processedVideoS3Key,
                    metadata: result.metadata,
                    trendId: testEvent.trendId,
                    topic: testEvent.topic
                };
            } else {
                console.log('\n⚠️ Audio integration issue:');
                console.log('   → Video generated successfully');
                console.log('   → Audio might have failed or not merged');
                console.log('   → Check audio generation logs');
            }
        } else {
            console.log('⚠️ Lambda succeeded but video generation failed');
            console.log('Error:', result.error);
        }
        
        return null;
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        return null;
    }
}

testVideoWithAudio().catch(console.error);