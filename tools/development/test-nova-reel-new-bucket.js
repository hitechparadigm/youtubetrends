#!/usr/bin/env node

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testNovaReelNewBucket() {
    console.log('🧪 NOVA REEL NEW BUCKET TEST');
    console.log('============================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1',
        maxAttempts: 3
    });
    
    try {
        const command = new StartAsyncInvokeCommand({
            modelId: 'amazon.nova-reel-v1:1',
            clientRequestToken: `test-${Date.now()}`,
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
                    s3Uri: 's3://nova-reel-test-bucket-786673323159/test-video.mp4'
                }
            }
        });
        
        const response = await client.send(command);
        console.log(`✅ SUCCESS with new bucket!`);
        console.log(`   Job ID: ${response.invocationArn}`);
        console.log(`   The issue was with the original bucket configuration`);
        
    } catch (error) {
        console.log(`❌ Still failing with new bucket: ${error.message}`);
        console.log(`   This suggests the issue is not bucket-specific`);
        
        if (error.message.includes('Invalid Output Config')) {
            console.log('\n🤔 Possible remaining issues:');
            console.log('1. Nova Reel might need a specific service role ARN');
            console.log('2. The model might require different parameters');
            console.log('3. There might be a region-specific requirement');
        }
    }
}

testNovaReelNewBucket().catch(console.error);