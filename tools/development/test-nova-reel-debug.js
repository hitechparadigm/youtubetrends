#!/usr/bin/env node

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function debugNovaReel() {
    console.log('🧪 NOVA REEL DEBUG TEST');
    console.log('=======================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1',
        maxAttempts: 3
    });
    
    // Try with minimal parameters first
    console.log('\n🔍 Testing with absolute minimal config...');
    
    try {
        const command = new StartAsyncInvokeCommand({
            modelId: 'amazon.nova-reel-v1:1',
            modelInput: {
                taskType: 'TEXT_VIDEO',
                textToVideoParams: {
                    text: 'sunset'
                }
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: 's3://nova-reel-test-bucket-786673323159/minimal.mp4'
                }
            }
        });
        
        const response = await client.send(command);
        console.log(`✅ Minimal config works!`);
        console.log(`   Job ID: ${response.invocationArn}`);
        
    } catch (error) {
        console.log(`❌ Minimal config failed: ${error.message}`);
        
        // Let's try to understand what Nova Reel actually expects
        console.log('\n🔍 Checking error details...');
        console.log(`Error name: ${error.name}`);
        console.log(`Error code: ${error.code || 'N/A'}`);
        
        if (error.$metadata) {
            console.log(`HTTP Status: ${error.$metadata.httpStatusCode}`);
            console.log(`Request ID: ${error.$metadata.requestId}`);
        }
        
        // The error suggests we might need to check the actual Nova Reel documentation
        // or that there's a specific setup step we're missing
        console.log('\n💡 INSIGHT: The "Invalid Output Config/Credentials" error suggests:');
        console.log('1. Nova Reel might be in preview/limited access');
        console.log('2. There might be additional setup required beyond basic model access');
        console.log('3. The S3 configuration might need a specific format we haven\'t tried');
        
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Check AWS Nova Reel documentation for specific requirements');
        console.log('2. Verify if Nova Reel is in general availability or preview');
        console.log('3. Check if there are additional IAM permissions needed');
        console.log('4. Consider using mock mode temporarily while investigating');
    }
}

debugNovaReel().catch(console.error);