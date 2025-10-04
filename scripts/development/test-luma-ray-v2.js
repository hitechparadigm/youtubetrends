#!/usr/bin/env node

/**
 * Test Luma AI Ray v2 as alternative to Nova Reel
 */

const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testLumaRayV2() {
    console.log('🧪 LUMA AI RAY V2 TEST');
    console.log('=====================');
    
    const client = new BedrockRuntimeClient({ 
        region: 'us-west-2', // Luma Ray is available in us-west-2
        maxAttempts: 3
    });
    
    try {
        console.log('Testing Luma AI Ray v2 for video generation...');
        
        const command = new StartAsyncInvokeCommand({
            modelId: 'luma.ray-v2:0',
            modelInput: {
                prompt: 'Create a professional video about ETF investing benefits. Show charts, graphs, and financial data visualizations that explain how ETFs provide diversification, low costs, and easy access to various market sectors.'
            },
            outputDataConfig: {
                s3OutputDataConfig: {
                    s3Uri: 's3://youtube-automation-luma-786673323159/test-luma-ray.mp4'
                }
            }
        });
        
        const response = await client.send(command);
        console.log('✅ SUCCESS! Luma AI Ray v2 is working!');
        console.log(`Job ID: ${response.invocationArn}`);
        console.log('This could be our Nova Reel alternative!');
        
        return true;
        
    } catch (error) {
        console.log(`❌ Luma Ray failed: ${error.message}`);
        
        if (error.message.includes('AccessDeniedException')) {
            console.log('   → Need to request access to Luma AI models in Bedrock console');
        } else if (error.message.includes('ValidationException')) {
            console.log('   → Configuration issue, might need different parameters');
        } else if (error.message.includes('Invalid Output Config')) {
            console.log('   → Same S3 issue as Nova Reel');
        }
        
        // Try with different parameters
        console.log('\n🔍 Trying with different parameter format...');
        
        try {
            const altCommand = new StartAsyncInvokeCommand({
                modelId: 'luma.ray-v2:0',
                modelInput: {
                    text: 'A sunset over mountains', // Simpler prompt
                    duration: 5 // Try duration parameter
                },
                outputDataConfig: {
                    s3OutputDataConfig: {
                        s3Uri: 's3://youtube-automation-luma-786673323159/test-luma-simple.mp4'
                    }
                }
            });
            
            const altResponse = await client.send(altCommand);
            console.log('✅ SUCCESS with alternative parameters!');
            console.log(`Job ID: ${altResponse.invocationArn}`);
            
        } catch (altError) {
            console.log(`❌ Alternative format also failed: ${altError.message}`);
        }
        
        return false;
    }
}

testLumaRayV2().catch(console.error);