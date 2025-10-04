#!/usr/bin/env node

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testNovaReelFresh() {
    console.log('🧪 FRESH NOVA REEL TEST - Exact Working Config');
    console.log('=============================================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1'
    });
    
    try {
        // Use the EXACT configuration that was working 2-3 hours ago
        const command = new StartAsyncInvokeCommand({
            modelId: 'amazon.nova-reel-v1:0', // Original working version
            modelInput: {
                taskType: 'TEXT_VIDEO',
                textToVideoParams: {
                    text: 'Create a professional video about ETF investing benefits. Show charts, graphs, and financial data visualizations that explain how ETFs provide diversification, low costs, and easy access to various market sectors.'
                },
                videoGenerationConfig: {
                    durationSeconds: 6,
                    fps: 24,
                    dimension: '1280x720',
                    seed: Math.floor(Math.random() * 1000000)
                }
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/videos/ETF investing benefits/test-fresh-' + Date.now() + '.mp4'
                }
            }
        });
        
        console.log('Sending request to Nova Reel...');
        const response = await client.send(command);
        
        console.log('✅ SUCCESS! Nova Reel is working again!');
        console.log(`Job ID: ${response.invocationArn}`);
        console.log('The issue was temporary or resolved by reverting changes');
        
    } catch (error) {
        console.log(`❌ Still failing: ${error.message}`);
        console.log(`Error type: ${error.name}`);
        
        if (error.$metadata) {
            console.log(`HTTP Status: ${error.$metadata.httpStatusCode}`);
            console.log(`Request ID: ${error.$metadata.requestId}`);
        }
        
        // If it's still failing, let's check what might be different
        console.log('\n🔍 Debugging info:');
        console.log('- Model ID: amazon.nova-reel-v1:0 (original working version)');
        console.log('- S3 URI: Using original format with spaces');
        console.log('- IAM permissions: Reverted to original');
        console.log('- Bucket policy: Removed (back to original state)');
        
        console.log('\n💡 If still failing, the issue might be:');
        console.log('1. IAM changes need time to propagate (wait 5-10 minutes)');
        console.log('2. AWS service temporary issue');
        console.log('3. Something else changed in the environment');
    }
}

testNovaReelFresh().catch(console.error);