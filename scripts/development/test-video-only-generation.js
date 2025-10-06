#!/usr/bin/env node

/**
 * Test video generation without audio to isolate issues
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testVideoOnlyGeneration() {
    console.log('🎬 VIDEO-ONLY GENERATION TEST');
    console.log('=============================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    const testEvent = {
        scriptPrompt: 'Create a professional video about ETF investing benefits. Show charts, graphs, and financial data visualizations that explain how ETFs provide diversification, low costs, and easy access to various market sectors.',
        topic: 'ETF investing benefits',
        trendId: `test-${Date.now()}`,
        videoConfig: {
            durationSeconds: 10,
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: false // NO AUDIO - just video
        }
    };
    
    try {
        console.log('🎯 Testing video generation WITHOUT audio...');
        console.log('Topic:', testEvent.topic);
        console.log('Duration:', testEvent.videoConfig.durationSeconds, 'seconds');
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        if (result.errorMessage) {
            console.log('❌ Lambda failed:', result.errorMessage);
            
            if (result.errorMessage.includes('Too many requests')) {
                console.log('⏳ Rate limited - Luma Ray needs more time between requests');
                console.log('💡 Wait 5-10 minutes between video generation attempts');
            }
        } else if (result.success) {
            console.log('✅ SUCCESS! Video-only generation working!');
            console.log('📁 Video S3 Key:', result.videoS3Key);
            console.log('🎬 Job ID:', result.bedrockJobId);
            console.log('⏱️ Duration:', result.metadata.duration, 'seconds');
            console.log('📦 File Size:', Math.round(result.metadata.fileSize / 1024), 'KB');
            console.log('💰 Cost:', `$${result.generationCost}`);
            console.log('⏰ Generation Time:', Math.round(result.executionTime / 1000), 'seconds');
            
            if (result.bedrockJobId.includes('us-west-2')) {
                console.log('🎯 Confirmed: Using Luma AI Ray v2 successfully!');
            }
        } else {
            console.log('⚠️ Lambda succeeded but video generation failed');
            console.log('Error:', result.error);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testVideoOnlyGeneration().catch(console.error);