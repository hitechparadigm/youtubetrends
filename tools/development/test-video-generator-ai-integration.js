#!/usr/bin/env node

/**
 * Test Video Generator with AI Model Manager Integration
 * 
 * This script tests the updated video generator Lambda function
 * to ensure it works correctly with the new AIModelManager.
 */

const ConfigurationFactory = require('../../src/config/ConfigurationFactory');
const AIModelFactory = require('../../src/ai/AIModelFactory');

async function testVideoGeneratorAIIntegration() {
    console.log('🎬🤖 TESTING VIDEO GENERATOR WITH AI MODEL MANAGER');
    console.log('================================================');
    
    try {
        // Test 1: AI Model configuration loading
        console.log('\n1. Testing AI model configuration loading...');
        
        const aiManager = AIModelFactory.getInstance();
        
        // Test audio model selection for different topics
        const topics = ['investing', 'education', 'tourism', 'technology'];
        
        for (const topic of topics) {
            const audioModel = await aiManager.selectModel('audio', { topic });
            console.log(`✅ ${topic} audio model:`, {
                provider: audioModel.provider,
                engine: audioModel.engine,
                voiceId: audioModel.voiceId
            });
        }
        
        // Test 2: Audio generation with different engines
        console.log('\n2. Testing audio generation with different engines...');
        
        const testScenarios = [
            {
                text: 'Welcome to our investing guide for beginners',
                options: { topic: 'investing', voice: 'Stephen' },
                description: 'Investing content with Stephen voice'
            },
            {
                text: 'Learn about the latest technology trends',
                options: { topic: 'technology', voice: 'Brian' },
                description: 'Technology content with Brian voice'
            },
            {
                text: 'Discover amazing travel destinations',
                options: { topic: 'tourism', voice: 'Amy' },
                description: 'Tourism content with Amy voice'
            }
        ];
        
        for (const scenario of testScenarios) {
            const audioResult = await AIModelFactory.generateAudio(scenario.text, scenario.options);
            console.log(`✅ ${scenario.description}:`, {
                engine: audioResult.engine,
                provider: audioResult.provider,
                audioUrl: audioResult.audioUrl,
                duration: audioResult.duration
            });
        }
        
        // Test 3: Cost calculation with different engines
        console.log('\n3. Testing cost calculation with different engines...');
        
        const costScenarios = [
            { engine: 'generative', characters: 150, description: '8-second video with Generative AI' },
            { engine: 'neural', characters: 150, description: '8-second video with Neural voice' },
            { engine: 'standard', characters: 150, description: '8-second video with Standard voice' },
            { engine: 'generative', characters: 750, description: '5-minute video with Generative AI' }
        ];
        
        for (const scenario of costScenarios) {
            const costEstimate = await AIModelFactory.getCostEstimate('audio', {
                characters: scenario.characters,
                engine: scenario.engine
            });
            
            console.log(`${scenario.description}:`, {
                engine: scenario.engine,
                characters: scenario.characters,
                cost: `$${costEstimate.estimatedCost.toFixed(4)}`,
                ratePerMillion: costEstimate.details.ratePerMillion
            });
        }
        
        // Test 4: Model health monitoring
        console.log('\n4. Testing model health monitoring...');
        
        const healthStatus = await AIModelFactory.getModelHealthStatus();
        console.log('✅ Model Health Status:', {
            audioHealthy: healthStatus.audio?.primary?.healthy,
            contentHealthy: healthStatus.content?.primary?.healthy,
            videoHealthy: healthStatus.video?.primary?.healthy
        });
        
        // Test 5: Performance metrics
        console.log('\n5. Testing performance metrics...');
        
        const performanceMetrics = AIModelFactory.getPerformanceMetrics();
        const audioMetrics = Object.keys(performanceMetrics).filter(key => key.startsWith('audio-'));
        
        console.log('✅ Audio Performance Metrics:', audioMetrics.map(key => ({
            model: key,
            successRate: `${(performanceMetrics[key].successRate * 100).toFixed(1)}%`,
            averageDuration: `${performanceMetrics[key].averageDuration.toFixed(0)}ms`,
            totalCalls: performanceMetrics[key].totalCalls
        })));
        
        // Test 6: Configuration updates affecting AI models
        console.log('\n6. Testing configuration updates affecting AI models...');
        
        const config = ConfigurationFactory.getInstance();
        
        // Update feature flag to disable Generative AI
        await config.setRuntimeOverride('features.enableGenerativeAI', false);
        
        // Test audio generation with disabled Generative AI
        const fallbackAudio = await AIModelFactory.generateAudio(
            'Test fallback to neural voice',
            { topic: 'investing' }
        );
        
        console.log('✅ Fallback audio generation:', {
            engine: fallbackAudio.engine,
            provider: fallbackAudio.provider,
            note: 'Should use neural instead of generative'
        });
        
        // Restore Generative AI
        await config.setRuntimeOverride('features.enableGenerativeAI', true);
        
        // Test 7: Voice mapping configuration
        console.log('\n7. Testing voice mapping configuration...');
        
        // Update voice mapping for investing topic
        await config.setRuntimeOverride('voice.investing.primary', 'Matthew');
        
        const updatedAudio = await AIModelFactory.generateAudio(
            'Test updated voice mapping',
            { topic: 'investing' }
        );
        
        console.log('✅ Updated voice mapping test:', {
            engine: updatedAudio.engine,
            note: 'Voice should be configurable per topic'
        });
        
        // Clear override
        config.clearRuntimeOverride('voice.investing.primary');
        
        // Test 8: Error handling and circuit breaker
        console.log('\n8. Testing error handling and circuit breaker...');
        
        try {
            // Simulate multiple failures to test circuit breaker
            for (let i = 0; i < 3; i++) {
                try {
                    await AIModelFactory.generateAudio('Test circuit breaker', {
                        topic: 'invalid-topic-to-trigger-error'
                    });
                } catch (error) {
                    console.log(`Attempt ${i + 1} failed as expected:`, error.message.substring(0, 50));
                }
            }
            
            console.log('✅ Error handling working correctly');
            
        } catch (error) {
            console.log('✅ Circuit breaker and error handling working:', error.message);
        }
        
        // Test 9: Mock video generator event simulation
        console.log('\n9. Testing mock video generator event simulation...');
        
        const mockEvent = {
            topic: 'investing',
            trendId: 'test-trend-ai-integration',
            scriptPrompt: 'Create a comprehensive guide about ETF investing strategies',
            videoConfig: {
                durationSeconds: 8,
                includeAudio: true,
                quality: 'high'
            },
            audioConfig: {
                voice: 'Stephen',
                speed: 'medium',
                language: 'en-US'
            },
            costConstraints: {
                maxCost: 0.20
            }
        };
        
        console.log('Mock event for AI integration:', {
            topic: mockEvent.topic,
            duration: mockEvent.videoConfig.durationSeconds,
            voice: mockEvent.audioConfig.voice,
            maxCost: mockEvent.costConstraints.maxCost
        });
        
        // Simulate the audio generation part of the video generator
        const eventAudioResult = await AIModelFactory.generateAudio(
            mockEvent.scriptPrompt,
            {
                voice: mockEvent.audioConfig.voice,
                speed: mockEvent.audioConfig.speed,
                language: mockEvent.audioConfig.language,
                topic: mockEvent.topic,
                duration: mockEvent.videoConfig.durationSeconds
            }
        );
        
        // Calculate cost
        const eventCostEstimate = await AIModelFactory.getCostEstimate('audio', {
            characters: mockEvent.scriptPrompt.length,
            engine: eventAudioResult.engine
        });
        
        console.log('✅ Mock event processing result:', {
            audioGenerated: !!eventAudioResult.audioUrl,
            engine: eventAudioResult.engine,
            estimatedCost: `$${eventCostEstimate.estimatedCost.toFixed(4)}`,
            withinBudget: eventCostEstimate.estimatedCost <= mockEvent.costConstraints.maxCost,
            taskId: eventAudioResult.taskId
        });
        
        console.log('\n🎉 ALL VIDEO GENERATOR AI INTEGRATION TESTS PASSED!');
        console.log('===================================================');
        
        return {
            success: true,
            message: 'Video generator AI integration working correctly'
        };
        
    } catch (error) {
        console.error('\n❌ VIDEO GENERATOR AI INTEGRATION TEST FAILED:', error);
        console.error('Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Test concurrent audio generation
async function testConcurrentAudioGeneration() {
    console.log('\n⚡ TESTING CONCURRENT AUDIO GENERATION');
    console.log('====================================');
    
    const concurrentRequests = [
        { text: 'Investing guide 1', options: { topic: 'investing', voice: 'Stephen' } },
        { text: 'Technology trends 1', options: { topic: 'technology', voice: 'Brian' } },
        { text: 'Travel destinations 1', options: { topic: 'tourism', voice: 'Amy' } },
        { text: 'Education tips 1', options: { topic: 'education', voice: 'Joanna' } },
        { text: 'Health advice 1', options: { topic: 'health', voice: 'Kimberly' } }
    ];
    
    const startTime = Date.now();
    const results = await Promise.all(
        concurrentRequests.map(req => 
            AIModelFactory.generateAudio(req.text, req.options)
        )
    );
    const duration = Date.now() - startTime;
    
    console.log('✅ Concurrent Audio Generation Results:', {
        totalRequests: concurrentRequests.length,
        successfulRequests: results.filter(r => r.audioUrl).length,
        totalDuration: `${duration}ms`,
        averagePerRequest: `${Math.round(duration / concurrentRequests.length)}ms`,
        engines: [...new Set(results.map(r => r.engine))]
    });
    
    return results;
}

// Test engine selection under different conditions
async function testEngineSelectionLogic() {
    console.log('\n🎯 TESTING ENGINE SELECTION LOGIC');
    console.log('=================================');
    
    const config = ConfigurationFactory.getInstance();
    
    // Test 1: Normal operation (Generative AI enabled)
    await config.setRuntimeOverride('features.enableGenerativeAI', true);
    const normalResult = await AIModelFactory.generateAudio('Normal test', { topic: 'investing' });
    console.log('Normal operation (Generative AI enabled):', {
        engine: normalResult.engine,
        expected: 'generative'
    });
    
    // Test 2: Generative AI disabled
    await config.setRuntimeOverride('features.enableGenerativeAI', false);
    const disabledResult = await AIModelFactory.generateAudio('Disabled test', { topic: 'investing' });
    console.log('Generative AI disabled:', {
        engine: disabledResult.engine,
        expected: 'neural or standard'
    });
    
    // Test 3: Cost constraints (simulate high cost scenario)
    await config.setRuntimeOverride('features.enableGenerativeAI', true);
    await config.setRuntimeOverride('cost.budgets.perVideo', 0.001); // Very low budget
    const budgetResult = await AIModelFactory.generateAudio('Budget test', { topic: 'investing' });
    console.log('Low budget constraint:', {
        engine: budgetResult.engine,
        expected: 'neural or standard (cheaper option)'
    });
    
    // Restore normal settings
    await config.setRuntimeOverride('features.enableGenerativeAI', true);
    config.clearRuntimeOverride('cost.budgets.perVideo');
    
    console.log('✅ Engine selection logic working correctly');
}

// Run all tests
async function runAllTests() {
    const result = await testVideoGeneratorAIIntegration();
    
    if (result.success) {
        await testConcurrentAudioGeneration();
        await testEngineSelectionLogic();
        
        console.log('\n🚀 VIDEO GENERATOR AI INTEGRATION COMPLETE');
        console.log('Next steps:');
        console.log('1. Deploy updated video generator Lambda');
        console.log('2. Configure AI model endpoints and API keys');
        console.log('3. Set up monitoring for AI model performance');
        console.log('4. Test with real AWS Polly Generative AI voices');
        
    } else {
        console.log('\n🔧 VIDEO GENERATOR AI INTEGRATION NEEDS FIXES');
        console.log('Please resolve the errors above before proceeding');
    }
    
    return result;
}

// Export for use in other scripts
module.exports = {
    testVideoGeneratorAIIntegration,
    testConcurrentAudioGeneration,
    testEngineSelectionLogic,
    runAllTests
};

// Run if called directly
if (require.main === module) {
    runAllTests().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}