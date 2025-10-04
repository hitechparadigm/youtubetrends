#!/usr/bin/env node

/**
 * Test Nova Reel with minimal S3 configuration to isolate the issue
 */

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testMinimalNovaReel() {
    console.log('🧪 MINIMAL NOVA REEL S3 TEST');
    console.log('============================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1',
        maxAttempts: 3
    });
    
    // Test different S3 configurations
    const testConfigs = [
        {
            name: 'Basic S3 URI',
            config: {
                outputDataConfig: {
                    s3OutputDataConfig: {
                        s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test-nova-reel.mp4'
                    }
                }
            }
        },
        {
            name: 'S3 URI with folder',
            config: {
                outputDataConfig: {
                    s3OutputDataConfig: {
                        s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/videos/test-nova-reel.mp4'
                    }
                }
            }
        },
        {
            name: 'S3 with encryption',
            config: {
                outputDataConfig: {
                    s3OutputDataConfig: {
                        s3Uri: 's3://youtube-automation-videos-786673323159-us-east-1/test-nova-reel.mp4',
                        s3EncryptionConfig: {
                            s3EncryptionType: 'SSE_S3'
                        }
                    }
                }
            }
        }
    ];
    
    for (const testConfig of testConfigs) {
        console.log(`\n🔍 Testing: ${testConfig.name}`);
        
        try {
            const command = new StartAsyncInvokeCommand({
                modelId: 'amazon.nova-reel-v1:1',
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
                ...testConfig.config
            });
            
            const response = await client.send(command);
            console.log(`✅ ${testConfig.name}: SUCCESS!`);
            console.log(`   Job ID: ${response.invocationArn}`);
            console.log(`   This configuration works!`);
            break; // Stop on first success
            
        } catch (error) {
            console.log(`❌ ${testConfig.name}: ${error.message}`);
            
            if (error.message.includes('Invalid Output Config')) {
                console.log('   → S3 configuration issue');
            } else if (error.message.includes('AccessDenied')) {
                console.log('   → Permission issue');
            }
        }
    }
    
    console.log('\n📋 If all configurations fail, the issue might be:');
    console.log('1. S3 bucket policy missing Bedrock permissions');
    console.log('2. IAM role missing cross-service permissions');
    console.log('3. Region mismatch between Bedrock and S3');
}

testMinimalNovaReel().catch(console.error);