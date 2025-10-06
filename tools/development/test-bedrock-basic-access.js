#!/usr/bin/env node

/**
 * Test basic Bedrock access with different models
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testBasicBedrockAccess() {
    console.log('🧪 BASIC BEDROCK ACCESS TEST');
    console.log('============================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-east-1',
        maxAttempts: 3
    });
    
    // Test with a simple text model first
    const testModels = [
        'amazon.nova-lite-v1:0',
        'amazon.titan-text-lite-v1',
        'amazon.nova-reel-v1:0'
    ];
    
    for (const modelId of testModels) {
        console.log(`\n🔍 Testing model: ${modelId}`);
        
        try {
            let command;
            
            if (modelId.includes('nova-reel')) {
                console.log('   → Nova Reel requires async invocation, skipping basic test');
                continue;
            } else if (modelId.includes('nova-lite')) {
                // Nova Lite text model
                command = new InvokeModelCommand({
                    modelId: modelId,
                    body: JSON.stringify({
                        messages: [
                            {
                                role: 'user',
                                content: 'Hello, can you respond with just "test successful"?'
                            }
                        ],
                        max_tokens: 10,
                        temperature: 0.1
                    }),
                    contentType: 'application/json',
                    accept: 'application/json'
                });
            } else {
                // Titan text model
                command = new InvokeModelCommand({
                    modelId: modelId,
                    body: JSON.stringify({
                        inputText: 'Hello, can you respond with just "test successful"?',
                        textGenerationConfig: {
                            maxTokenCount: 10,
                            temperature: 0.1
                        }
                    }),
                    contentType: 'application/json',
                    accept: 'application/json'
                });
            }
            
            const response = await client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            console.log(`   ✅ ${modelId}: Access granted`);
            console.log(`   📝 Response: ${JSON.stringify(responseBody, null, 2).substring(0, 200)}...`);
            
        } catch (error) {
            console.log(`   ❌ ${modelId}: ${error.message}`);
            
            if (error.message.includes('AccessDeniedException')) {
                console.log('      → Need to request model access in Bedrock console');
            } else if (error.message.includes('ValidationException')) {
                console.log('      → Configuration issue:', error.message);
            }
        }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('If basic text models work, the issue is specifically with Nova Reel configuration');
    console.log('If no models work, need to check Bedrock model access permissions');
}

testBasicBedrockAccess().catch(console.error);