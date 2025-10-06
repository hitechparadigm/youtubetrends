#!/usr/bin/env node

/**
 * Debug Luma Ray Lambda integration by simulating Lambda environment
 */

async function testLumaLambdaDebug() {
    console.log('🧪 LUMA RAY LAMBDA DEBUG TEST');
    console.log('=============================');
    
    try {
        // Simulate Lambda environment by importing the same way
        console.log('1. Testing BedrockRuntimeClient import...');
        const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');
        console.log('✅ Import successful');
        
        console.log('2. Creating Luma Ray client (us-west-2)...');
        const lumaClient = new BedrockRuntimeClient({ region: 'us-west-2' });
        console.log('✅ Client created');
        
        console.log('3. Testing Luma Ray command creation...');
        const command = new StartAsyncInvokeCommand({
            modelId: 'luma.ray-v2:0',
            modelInput: {
                prompt: 'A simple test video of a sunset over mountains'
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: 's3://youtube-automation-luma-786673323159/debug-test.mp4'
                }
            }
        });
        console.log('✅ Command created');
        
        console.log('4. Sending command to Luma Ray...');
        const response = await lumaClient.send(command);
        console.log('✅ SUCCESS! Luma Ray working in Lambda-like environment');
        console.log(`Job ID: ${response.invocationArn}`);
        
        console.log('\n💡 CONCLUSION: Luma Ray should work in Lambda');
        console.log('   → The issue might be in the Lambda function logic');
        console.log('   → Need to check the fallback logic or error handling');
        
        return true;
        
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        console.log(`Error type: ${error.name}`);
        
        if (error.message.includes('Invalid S3 credentials')) {
            console.log('\n💡 S3 credentials issue detected');
            console.log('   → Lambda execution role might not have us-west-2 S3 access');
            console.log('   → Need to check IAM permissions for cross-region S3');
        } else if (error.message.includes('AccessDeniedException')) {
            console.log('\n💡 Bedrock access issue detected');
            console.log('   → Lambda execution role might not have Luma Ray access');
            console.log('   → Need to check IAM permissions for Luma AI model');
        } else {
            console.log('\n💡 Unknown error - need further investigation');
        }
        
        return false;
    }
}

testLumaLambdaDebug().catch(console.error);