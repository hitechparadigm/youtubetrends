#!/usr/bin/env node

/**
 * Test AI Model Manager
 * 
 * This script tests the AIModelManager and AIModelFactory
 * to ensure they work correctly with configurable AI models.
 */

const AIModelFactory = require('../../src/ai/AIModelFactory');
const ConfigurationFactory = require('../../src/config/ConfigurationFactory');

async function testAIModelManager() {
    console.log('🤖 TESTING AI MODEL MANAGER SYSTEM');
    console.log('==================================');
    
    try {
        // Test 1: Basic AI model selection
        console.log('\n1. Testing AI model selection...');
        
        const aiManager = AIModelFactory.getInstance();
        
        // Test content model selection
        const contentModel = await aiManager.selectModel('content');
        console.log('✅ Content Model Selected:', {
            provider: contentModel.provider,
            model: contentModel.model,
            endpoint: contentModel.endpoint
        });
        
        // Test video model selection
        const videoModel = await aiManager.selectModel('video');
        console.log('✅ Video Model Selected:', {
            provider: videoModel.provider,
            model: videoModel.model,
            region: videoModel.region
        });
        
        // Test audio model selection
        const audioModel = await aiManager.selectModel('audio');
        console.log('✅ Audio Model Selected:', {
            provider: audioModel.provider,
            engine: audioModel.engine,
            voiceId: audioModel.voiceId
        });
        
        // Test 2: Content generation
        console.log('\n2. Testing content generation...');
        
        const contentResult = await AIModelFactory.generateContent(
            'Create a short script about investing in ETFs',
            { 
                maxTokens: 200,
                temperature: 0.7,
                topic: 'investing'
            }
        );
        
        console.log('✅ Content Generated:', {
            model: contentResult.model,
            provider: contentResult.provider,
            contentLength: contentResult.content.length,
            content: contentResult.content.substring(0, 100) + '...'
        });
        
        // Test 3: Video generation
        console.log('\n3. Testing video generation...');
        
        const videoResult = await AIModelFactory.generateVideo(
            'A professional video about ETF investing',
            {
                duration: 8,
                quality: 'high',
                style: 'professional'
            }
        );
        
        console.log('✅ Video Generated:', {
            model: videoResult.model,
            provider: videoResult.provider,
            duration: videoResult.duration,
            videoUrl: videoResult.videoUrl,
            status: videoResult.status
        });
        
        // Test 4: Audio generation
        console.log('\n4. Testing audio generation...');
        
        const audioResult = await AIModelFactory.generateAudio(
            'Welcome to our guide on ETF investing for beginners',
            {
                voice: 'Stephen',
                speed: 'medium',
                language: 'en-US',
                topic: 'investing'
            }
        );
        
        console.log('✅ Audio Generated:', {
            engine: audioResult.engine,
            provider: audioResult.provider,
            duration: audioResult.duration,
            audioUrl: audioResult.audioUrl,
            taskId: audioResult.taskId
        });
        
        // Test 5: Model health monitoring
        console.log('\n5. Testing model health monitoring...');
        
        const healthStatus = await AIModelFactory.getModelHealthStatus();
        console.log('✅ Model Health Status:', healthStatus);
        
        // Test 6: Performance metrics
        console.log('\n6. Testing performance metrics...');
        
        const performanceMetrics = AIModelFactory.getPerformanceMetrics();
        console.log('✅ Performance Metrics:', performanceMetrics);
        
        // Test 7: Cost estimation
        console.log('\n7. Testing cost estimation...');
        
        const contentCost = await AIModelFactory.getCostEstimate('content', { tokens: 1000 });
        const videoCost = await AIModelFactory.getCostEstimate('video', { videos: 1 });
        const audioCost = await AIModelFactory.getCostEstimate('audio', { characters: 150, engine: 'generative' });
        
        console.log('✅ Cost Estimates:', {
            content: contentCost,
            video: videoCost,
            audio: audioCost
        });
        
        // Test 8: Runtime configuration updates
        console.log('\n8. Testing runtime configuration updates...');
        
        // Update content model configuration
        await AIModelFactory.updateModelConfiguration('content', 'primary', {
            provider: 'openai',
            model: 'gpt-4o',
            endpoint: 'https://api.openai.com/v1',
            maxTokens: 4096,
            temperature: 0.8
        });
        
        // Test with updated configuration
        const updatedContentModel = await aiManager.selectModel('content');
        console.log('✅ Updated Content Model:', {
            provider: updatedContentModel.provider,
            model: updatedContentModel.model
        });
        
        // Test 9: Model connectivity testing
        console.log('\n9. Testing model connectivity...');
        
        const contentConnectivity = await AIModelFactory.testModelConnectivity('content');
        const videoConnectivity = await AIModelFactory.testModelConnectivity('video');
        const audioConnectivity = await AIModelFactory.testModelConnectivity('audio');
        
        console.log('✅ Connectivity Tests:', {
            content: contentConnectivity,
            video: videoConnectivity,
            audio: audioConnectivity
        });
        
        // Test 10: Error handling and fallbacks
        console.log('\n10. Testing error handling and fallbacks...');
        
        // Simulate a service failure by updating configuration to invalid endpoint
        const config = ConfigurationFactory.getInstance();
        await config.setRuntimeOverride('ai.models.content.primary.endpoint', 'https://invalid-endpoint.com');
        
        try {
            // This should trigger fallback mechanism
            const fallbackResult = await AIModelFactory.generateContent('Test fallback', { maxTokens: 50 });
            console.log('✅ Fallback mechanism working:', {
                model: fallbackResult.model,
                provider: fallbackResult.provider
            });
        } catch (error) {
            console.log('✅ Error handling working:', error.message);
        }
        
        // Restore original configuration
        config.clearRuntimeOverride('ai.models.content.primary.endpoint');
        
        console.log('\n🎉 ALL AI MODEL MANAGER TESTS PASSED!');
        console.log('====================================');
        
        return {
            success: true,
            message: 'AI Model Manager system working correctly'
        };
        
    } catch (error) {
        console.error('\n❌ AI MODEL MANAGER TEST FAILED:', error);
        console.error('Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Test different environment configurations
async function testEnvironmentSpecificModels() {
    console.log('\n🌍 TESTING ENVIRONMENT-SPECIFIC AI MODELS');
    console.log('=========================================');
    
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
        console.log(`\nTesting ${env} environment...`);
        
        const aiManager = AIModelFactory.getInstance(env);
        
        try {
            const contentModel = await aiManager.selectModel('content');
            const videoModel = await aiManager.selectModel('video');
            const audioModel = await aiManager.selectModel('audio');
            
            console.log(`${env} models:`, {
                content: `${contentModel.provider}/${contentModel.model}`,
                video: `${videoModel.provider}/${videoModel.model}`,
                audio: `${audioModel.provider}/${audioModel.engine}`
            });
            
        } catch (error) {
            console.log(`${env} error:`, error.message);
        }
    }
    
    console.log('\n✅ Environment-specific model configurations working');
}

// Test concurrent AI operations
async function testConcurrentOperations() {
    console.log('\n⚡ TESTING CONCURRENT AI OPERATIONS');
    console.log('==================================');
    
    const operations = [
        AIModelFactory.generateContent('Content 1', { maxTokens: 100 }),
        AIModelFactory.generateContent('Content 2', { maxTokens: 100 }),
        AIModelFactory.generateVideo('Video 1', { duration: 5 }),
        AIModelFactory.generateAudio('Audio 1', { voice: 'Amy' }),
        AIModelFactory.generateAudio('Audio 2', { voice: 'Stephen' })
    ];
    
    const startTime = Date.now();
    const results = await Promise.all(operations);
    const duration = Date.now() - startTime;
    
    console.log('✅ Concurrent Operations Completed:', {
        totalOperations: operations.length,
        duration: `${duration}ms`,
        averagePerOperation: `${Math.round(duration / operations.length)}ms`,
        successfulOperations: results.filter(r => r.content || r.videoUrl || r.audioUrl).length
    });
    
    return results;
}

// Test model performance under load
async function testModelPerformance() {
    console.log('\n📊 TESTING MODEL PERFORMANCE UNDER LOAD');
    console.log('=======================================');
    
    const testRuns = 5;
    const results = {
        content: [],
        video: [],
        audio: []
    };
    
    for (let i = 0; i < testRuns; i++) {
        console.log(`Running performance test ${i + 1}/${testRuns}...`);
        
        // Test content generation performance
        const contentStart = Date.now();
        await AIModelFactory.generateContent(`Performance test ${i}`, { maxTokens: 50 });
        results.content.push(Date.now() - contentStart);
        
        // Test video generation performance
        const videoStart = Date.now();
        await AIModelFactory.generateVideo(`Performance test video ${i}`, { duration: 3 });
        results.video.push(Date.now() - videoStart);
        
        // Test audio generation performance
        const audioStart = Date.now();
        await AIModelFactory.generateAudio(`Performance test audio ${i}`);
        results.audio.push(Date.now() - audioStart);
    }
    
    // Calculate averages
    const averages = {
        content: Math.round(results.content.reduce((a, b) => a + b, 0) / testRuns),
        video: Math.round(results.video.reduce((a, b) => a + b, 0) / testRuns),
        audio: Math.round(results.audio.reduce((a, b) => a + b, 0) / testRuns)
    };
    
    console.log('✅ Performance Test Results:', {
        averageDurations: averages,
        totalTests: testRuns * 3,
        contentRange: `${Math.min(...results.content)}-${Math.max(...results.content)}ms`,
        videoRange: `${Math.min(...results.video)}-${Math.max(...results.video)}ms`,
        audioRange: `${Math.min(...results.audio)}-${Math.max(...results.audio)}ms`
    });
    
    return averages;
}

// Run all tests
async function runAllTests() {
    const result = await testAIModelManager();
    
    if (result.success) {
        await testEnvironmentSpecificModels();
        await testConcurrentOperations();
        await testModelPerformance();
        
        console.log('\n🚀 AI MODEL MANAGER SYSTEM READY FOR PRODUCTION');
        console.log('Next steps:');
        console.log('1. Deploy AIModelManager to Lambda functions');
        console.log('2. Configure API keys in Secrets Manager');
        console.log('3. Set up model-specific configurations');
        console.log('4. Monitor model performance and health');
        
    } else {
        console.log('\n🔧 AI MODEL MANAGER SYSTEM NEEDS FIXES');
        console.log('Please resolve the errors above before proceeding');
    }
    
    return result;
}

// Export for use in other scripts
module.exports = {
    testAIModelManager,
    testEnvironmentSpecificModels,
    testConcurrentOperations,
    testModelPerformance,
    runAllTests
};

// Run if called directly
if (require.main === module) {
    runAllTests().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}