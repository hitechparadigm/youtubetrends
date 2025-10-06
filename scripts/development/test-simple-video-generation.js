#!/usr/bin/env node

/**
 * Test simple video generation with minimal parameters
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testSimpleVideoGeneration() {
    console.log('🎬 SIMPLE VIDEO GENERATION TEST');
    console.log('===============================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    const testEvent = {
        scriptPrompt: 'A beautiful sunset over mountains',
        topic: 'nature',
        trendId: `test-${Date.now()}`,
        videoConfig: {
            durationSeconds: 6,
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: false // Disable audio for now
        }
    };
    
    try {
        console.log('Invoking video generator with simple request...');
        console.log('Topic:', testEvent.topic);
        console.log('Prompt:', testEvent.scriptPrompt);
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        if (result.errorMessage) {
            console.log('❌ Lambda failed:', result.errorMessage);
            console.log('Error type:', result.errorType);
            
            if (result.errorMessage.includes('Invalid Output Config')) {
                console.log('\n🔍 This suggests both Luma Ray AND Nova Reel are failing');
                console.log('   → Luma Ray fails first');
                console.log('   → Falls back to Nova Reel');
                console.log('   → Nova Reel also fails (known AWS issue)');
                console.log('   → Returns Nova Reel error instead of Luma Ray error');
            }
        } else if (result.success) {
            console.log('✅ SUCCESS! Video generation working!');
            console.log('Result:', JSON.stringify(result, null, 2));
            
            if (result.model) {
                console.log(`🎯 Used model: ${result.model}`);
            }
        } else {
            console.log('⚠️ Lambda succeeded but video generation failed');
            console.log('Error:', result.error);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testSimpleVideoGeneration().catch(console.error);