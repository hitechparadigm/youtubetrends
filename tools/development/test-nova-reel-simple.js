#!/usr/bin/env node

/**
 * Test Nova Reel with the simplest possible configuration
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testSimpleNovaReel() {
    console.log('🧪 SIMPLE NOVA REEL TEST');
    console.log('========================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1',
        maxAttempts: 3
    });
    
    try {
        // Try synchronous invocation first (if supported)
        console.log('Testing synchronous Nova Reel invocation...');
        
        const command = new InvokeModelCommand({
            modelId: 'amazon.nova-reel-v1:1',
            body: JSON.stringify({
                taskType: 'TEXT_VIDEO',
                textToVideoParams: {
                    text: 'A simple test video'
                },
                videoGenerationConfig: {
                    durationSeconds: 6
                }
            }),
            contentType: 'application/json',
            accept: 'application/json'
        });
        
        const response = await client.send(command);
        console.log('✅ Synchronous invocation works!');
        
    } catch (error) {
        console.log(`❌ Synchronous test failed: ${error.message}`);
        
        if (error.message.includes('AccessDeniedException')) {
            console.log('\n🚨 ACCESS DENIED - You need to request Nova Reel model access:');
            console.log('1. Go to AWS Console → Bedrock → Model access');
            console.log('2. Find "Amazon Nova Reel" models');
            console.log('3. Click "Request model access"');
            console.log('4. Submit request (usually approved instantly)');
            console.log('5. Wait for "Access granted" status');
        } else if (error.message.includes('ValidationException')) {
            if (error.message.includes('does not support synchronous invocation')) {
                console.log('✅ Model access is granted (async-only model)');
                console.log('❌ But S3 configuration is still failing');
            } else {
                console.log('❌ Configuration error:', error.message);
            }
        }
    }
}

testSimpleNovaReel().catch(console.error);