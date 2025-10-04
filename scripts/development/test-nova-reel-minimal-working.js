#!/usr/bin/env node

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testMinimalWorking() {
    console.log('🧪 MINIMAL WORKING NOVA REEL TEST');
    console.log('=================================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1'
    });
    
    try {
        // Absolute minimal configuration that should work
        const command = new StartAsyncInvokeCommand({
            modelId: 'amazon.nova-reel-v1:0',
            modelInput: {
                taskType: 'TEXT_VIDEO',
                textToVideoParams: {
                    text: 'A sunset over mountains'
                }
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test.mp4'
                }
            }
        });
        
        console.log('Testing with minimal config...');
        const response = await client.send(command);
        
        console.log('✅ SUCCESS! Nova Reel is working!');
        console.log(`Job ID: ${response.invocationArn}`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        
        // Let's try waiting 5 minutes for IAM propagation
        console.log('\n⏳ IAM changes might need time to propagate...');
        console.log('Recommendation: Wait 5-10 minutes and try again');
        console.log('If it still fails after waiting, there might be an AWS service issue');
        
        return false;
    }
}

testMinimalWorking().catch(console.error);