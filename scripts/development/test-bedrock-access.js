#!/usr/bin/env node

/**
 * Test Bedrock Access
 * Simple test to check if we can access Bedrock models
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testBedrockAccess() {
    console.log('🧪 TESTING BEDROCK ACCESS');
    console.log('=' .repeat(40));

    const bedrock = new BedrockRuntimeClient({
        region: 'us-east-1'
    });

    // Test 1: Try a simple text model first (Nova Micro)
    console.log('📝 Test 1: Testing Nova Micro (text model)...');
    try {
        const textResponse = await bedrock.send(new InvokeModelCommand({
            modelId: 'amazon.nova-micro-v1:0',
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, can you respond with just "Hello World"?'
                    }
                ],
                max_tokens: 10,
                temperature: 0.1
            })
        }));

        const textResult = JSON.parse(new TextDecoder().decode(textResponse.body));
        console.log('  ✅ Nova Micro: SUCCESS');
        console.log(`  📝 Response: ${textResult.content?.[0]?.text || 'No response'}`);
    } catch (error) {
        console.log('  ❌ Nova Micro: FAILED');
        console.log(`  📝 Error: ${error.message}`);
    }

    // Test 2: Try Nova Reel (video model) - this is what we need
    console.log('\n🎬 Test 2: Testing Nova Reel (video model)...');
    try {
        // Try to check if we can at least call the model
        const { BedrockClient, GetFoundationModelCommand } = require('@aws-sdk/client-bedrock');
        const bedrockClient = new BedrockClient({ region: 'us-east-1' });
        
        const modelInfo = await bedrockClient.send(new GetFoundationModelCommand({
            modelIdentifier: 'amazon.nova-reel-v1:0'
        }));
        
        console.log('  ✅ Nova Reel Model Info: SUCCESS');
        console.log(`  📝 Status: ${modelInfo.modelDetails?.modelLifecycle?.status}`);
        console.log(`  📝 Input: ${modelInfo.modelDetails?.inputModalities?.join(', ')}`);
        console.log(`  📝 Output: ${modelInfo.modelDetails?.outputModalities?.join(', ')}`);
        
    } catch (error) {
        console.log('  ❌ Nova Reel Model Info: FAILED');
        console.log(`  📝 Error: ${error.message}`);
        
        if (error.message.includes('AccessDenied') || error.message.includes('not authorized')) {
            console.log('\n🔧 SOLUTION: Model access needs to be requested');
            console.log('   1. Go to AWS Bedrock Console');
            console.log('   2. Navigate to "Model access" in the left sidebar');
            console.log('   3. Request access to "Amazon Nova Reel"');
            console.log('   4. Wait for approval (usually instant for Nova models)');
        }
    }

    // Test 3: Check if we can access the async invoke endpoint
    console.log('\n🔄 Test 3: Testing async invoke capability...');
    try {
        const { BedrockRuntimeClient, ListAsyncInvokesCommand } = require('@aws-sdk/client-bedrock-runtime');
        
        const asyncResponse = await bedrock.send(new ListAsyncInvokesCommand({
            maxResults: 1
        }));
        
        console.log('  ✅ Async Invoke Access: SUCCESS');
        console.log(`  📝 Can list async invokes: ${asyncResponse.asyncInvokeSummaries ? 'YES' : 'NO'}`);
        
    } catch (error) {
        console.log('  ❌ Async Invoke Access: FAILED');
        console.log(`  📝 Error: ${error.message}`);
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('If Nova Reel access failed:');
    console.log('1. 🌐 Go to AWS Bedrock Console: https://console.aws.amazon.com/bedrock/');
    console.log('2. 🔑 Click "Model access" in left sidebar');
    console.log('3. ✅ Enable "Amazon Nova Reel" if not already enabled');
    console.log('4. ⏱️  Wait for access to be granted (usually instant)');
    console.log('5. 🔄 Re-run the production video test');
}

// Run the test
testBedrockAccess().catch(console.error);