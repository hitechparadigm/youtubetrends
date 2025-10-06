#!/usr/bin/env node

/**
 * Debug the exact error from the Lambda
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function debugLambdaError() {
    console.log('🔍 DEBUGGING LAMBDA ERROR');
    console.log('=========================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    const testEvent = {
        scriptPrompt: `Create a professional educational video about "The Future of ETF Investing in 2025". 
        
        Show dynamic financial charts and graphs displaying ETF performance data, market trends, and portfolio diversification benefits. Include visualizations of:
        - Global ETF market growth statistics
        - Comparison charts between ETFs vs individual stocks
        - Pie charts showing sector diversification
        - Line graphs of historical performance
        - Modern trading interfaces and mobile apps
        
        The video should have a professional, modern aesthetic with clean animations, financial data overlays, and a sophisticated color scheme using blues, greens, and whites. Include text overlays highlighting key statistics and benefits.`,
        topic: 'ETF-Investing-2025',
        trendId: `etf-with-audio-${Date.now()}`,
        keywords: ['ETF', 'investing', '2025', 'future', 'portfolio', 'diversification', 'financial', 'market trends'],
        videoConfig: {
            durationSeconds: 8,
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: true,
            format: 'standard'
        }
    };
    
    try {
        console.log('🎯 Calling video generator Lambda...');
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        console.log('📊 FULL RESULT:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.errorMessage) {
            console.log('\n❌ ERROR DETAILS:');
            console.log('Message:', result.errorMessage);
            console.log('Type:', result.errorType);
        }
        
    } catch (error) {
        console.log('❌ Lambda invocation failed:', error.message);
    }
}

debugLambdaError().catch(console.error);