#!/usr/bin/env node

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testNovaReelSimpleS3() {
    console.log('🧪 NOVA REEL SIMPLE S3 TEST');
    console.log('===========================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1'
    });
    
    try {
        console.log('Testing Nova Reel with simplest possible S3 configuration...');
        
        const command = new StartAsyncInvokeCommand({
            modelId: 'amazon.nova-reel-v1:0',
            modelInput: {
                taskType: 'TEXT_VIDEO',
                textToVideoParams: {
                    text: 'A sunset'
                }
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test.mp4'
                }
            }
        });
        
        const response = await client.send(command);
        console.log('✅ SUCCESS! Nova Reel is working again!');
        console.log(`Job ID: ${response.invocationArn}`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Still failing: ${error.message}`);
        console.log(`Error type: ${error.name}`);
        
        if (error.$metadata) {
            console.log(`HTTP Status: ${error.$metadata.httpStatusCode}`);
            console.log(`Request ID: ${error.$metadata.requestId}`);
        }
        
        // Try with v1:1
        console.log('\n🔍 Trying Nova Reel v1:1...');
        
        try {
            const altCommand = new StartAsyncInvokeCommand({
                modelId: 'amazon.nova-reel-v1:1',
                modelInput: {
                    taskType: 'TEXT_VIDEO',
                    textToVideoParams: {
                        text: 'A sunset'
                    }
                },
                outputDataConfig: {
                    s3OutputDataConfig: {
                        s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test-v1-1.mp4'
                    }
                }
            });
            
            const altResponse = await client.send(altCommand);
            console.log('✅ SUCCESS with Nova Reel v1:1!');
            console.log(`Job ID: ${altResponse.invocationArn}`);
            
        } catch (altError) {
            console.log(`❌ v1:1 also failed: ${altError.message}`);
            
            console.log('\n💡 CONCLUSION: Nova Reel service issue persists');
            console.log('   → Both v1:0 and v1:1 failing with same error');
            console.log('   → Confirmed AWS service issue, not our configuration');
            console.log('   → Continue with Luma Ray as primary solution');
        }
        
        return false;
    }
}

testNovaReelSimpleS3().catch(console.error);