#!/usr/bin/env node

/**
 * Test Nova Reel with different parameter combinations
 */

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testNovaReelWithRole() {
    console.log('🧪 NOVA REEL WITH ROLE TEST');
    console.log('===========================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1',
        maxAttempts: 3
    });
    
    // Test with client request token
    console.log('\n🔍 Testing with clientRequestToken...');
    
    try {
        const command = new StartAsyncInvokeCommand({
            modelId: 'amazon.nova-reel-v1:1',
            clientRequestToken: `test-${Date.now()}`, // Add unique token
            modelInput: {
                taskType: 'TEXT_VIDEO',
                textToVideoParams: {
                    text: 'A simple sunset over mountains'
                },
                videoGenerationConfig: {
                    durationSeconds: 6,
                    fps: 24,
                    dimension: '1280x720'
                }
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test-nova-reel.mp4'
                }
            }
        });
        
        const response = await client.send(command);
        console.log(`✅ SUCCESS with clientRequestToken!`);
        console.log(`   Job ID: ${response.invocationArn}`);
        
    } catch (error) {
        console.log(`❌ Failed with clientRequestToken: ${error.message}`);
        
        // Try to get more detailed error info
        if (error.$metadata) {
            console.log(`   HTTP Status: ${error.$metadata.httpStatusCode}`);
            console.log(`   Request ID: ${error.$metadata.requestId}`);
        }
        
        // Check if it's a specific Nova Reel issue
        if (error.message.includes('Invalid Output Config')) {
            console.log('\n🚨 This suggests Nova Reel might need:');
            console.log('1. A specific IAM role for cross-service access');
            console.log('2. Different S3 bucket configuration');
            console.log('3. Model access request in Bedrock console (even though we have basic access)');
            
            console.log('\n📋 RECOMMENDED ACTIONS:');
            console.log('1. Go to AWS Console → Bedrock → Model access');
            console.log('2. Check if Nova Reel shows "Access granted" (not just "Available")');
            console.log('3. If not granted, click "Request access" for Nova Reel models');
            console.log('4. Wait for approval notification');
        }
    }
}

testNovaReelWithRole().catch(console.error);