#!/usr/bin/env node

/**
 * Test the video generator Lambda directly
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testVideoGeneratorDirect() {
    console.log('🧪 DIRECT VIDEO GENERATOR TEST');
    console.log('==============================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    const testEvent = {
        scriptPrompt: 'Create a professional video about ETF investing benefits',
        topic: 'ETF investing benefits',
        trendId: `test-${Date.now()}`,
        videoConfig: {
            durationSeconds: 6,
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: false // Disable audio for now to focus on video
        }
    };
    
    try {
        console.log('Invoking video generator Lambda...');
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        if (result.errorMessage) {
            console.log('❌ Lambda failed:', result.errorMessage);
            console.log('Error type:', result.errorType);
        } else {
            console.log('✅ Lambda succeeded!');
            console.log('Result:', JSON.stringify(result, null, 2));
            
            if (result.model) {
                console.log(`🎯 Used model: ${result.model}`);
                console.log(`📦 S3 bucket: ${result.bucket}`);
            }
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testVideoGeneratorDirect().catch(console.error);