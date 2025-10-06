#!/usr/bin/env node

/**
 * Direct test of Luma Ray to isolate the S3 credentials issue
 */

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testLumaDirect() {
    console.log('🧪 DIRECT LUMA RAY TEST');
    console.log('=======================');
    
    try {
        const lumaClient = new BedrockRuntimeClient({ region: 'us-west-2' });
        
        const prompt = 'Create a beautiful nature video showing a sunset over mountains';
        const s3OutputKey = `test-direct-${Date.now()}.mp4`;
        
        console.log('🎯 Testing Luma Ray directly...');
        console.log('📝 Prompt:', prompt);
        console.log('📄 S3 Key:', s3OutputKey);
        console.log('🪣 S3 URI:', `s3://youtube-automation-luma-786673323159/${s3OutputKey}`);
        
        const response = await lumaClient.send(new StartAsyncInvokeCommand({
            modelId: 'luma.ray-v2:0',
            modelInput: {
                prompt: prompt
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: `s3://youtube-automation-luma-786673323159/${s3OutputKey}`
                }
            }
        }));
        
        console.log('✅ SUCCESS! Luma Ray job started');
        console.log('🆔 Job ID:', response.invocationArn);
        
        return response;
        
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        console.log('🔍 Error details:', error);
        
        if (error.message.includes('credentials')) {
            console.log('\n💡 CREDENTIALS ISSUE:');
            console.log('   → Check if Lambda has proper IAM permissions');
            console.log('   → Verify S3 bucket exists and is accessible');
            console.log('   → Ensure Bedrock can assume role to write to S3');
        }
        
        return null;
    }
}

testLumaDirect().catch(console.error);