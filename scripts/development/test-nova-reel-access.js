#!/usr/bin/env node

/**
 * Test Nova Reel model access and permissions
 */

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testNovaReelAccess() {
    console.log('🧪 NOVA REEL ACCESS TEST');
    console.log('========================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1',
        maxAttempts: 3
    });
    
    const testModels = ['amazon.nova-reel-v1:0', 'amazon.nova-reel-v1:1'];
    
    for (const modelId of testModels) {
        console.log(`\n🔍 Testing model: ${modelId}`);
        
        try {
            // Test with minimal valid request - try different S3 configurations
            const testConfigs = [
                {
                    name: 'Standard S3 URI',
                    config: {
                        s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test/access-test.mp4'
                    }
                },
                {
                    name: 'S3 URI with encryption',
                    config: {
                        s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test/access-test.mp4',
                        s3EncryptionConfig: {
                            s3EncryptionType: 'SSE_S3'
                        }
                    }
                },
                {
                    name: 'Bucket and key separate',
                    config: {
                        s3BucketName: 'youtube-automation-videos-786673323159-us-east-1',
                        s3KeyPrefix: 'test/access-test.mp4'
                    }
                }
            ];
            
            for (const testConfig of testConfigs) {
                try {
                    console.log(`   Testing: ${testConfig.name}`);
                    
                    const command = new StartAsyncInvokeCommand({
                        modelId: modelId,
                        modelInput: {
                            taskType: 'TEXT_VIDEO',
                            textToVideoParams: {
                                text: 'A simple test video of a sunset'
                            },
                            videoGenerationConfig: {
                                durationSeconds: 6,
                                fps: 24,
                                dimension: '1280x720'
                            }
                        },
                        outputDataConfig: {
                            s3OutputDataConfig: testConfig.config
                        }
                    });
            
                    const response = await client.send(command);
                    console.log(`   ✅ ${testConfig.name}: Success - Job started: ${response.invocationArn}`);
                    break; // If one works, we're good
                    
                } catch (configError) {
                    console.log(`   ❌ ${testConfig.name}: ${configError.message}`);
                }
            }
            
        } catch (error) {
            console.log(`❌ ${modelId}: ${error.message}`);
            
            if (error.message.includes('AccessDeniedException')) {
                console.log('   → Need to request model access in Bedrock console');
            } else if (error.message.includes('ValidationException')) {
                console.log('   → Configuration issue:', error.message);
            } else if (error.message.includes('ResourceNotFoundException')) {
                console.log('   → Model not available in this region');
            }
        }
    }
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. If you see AccessDeniedException, go to AWS Bedrock console');
    console.log('2. Navigate to Model access in the left sidebar');
    console.log('3. Request access to Amazon Nova Reel models');
    console.log('4. Wait for approval (usually instant for Nova models)');
}

testNovaReelAccess().catch(console.error);