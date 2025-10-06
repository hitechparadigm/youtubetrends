/**
 * Test script for VideoGenerationManager
 * 
 * This script tests the comprehensive video generation management functionality
 * including configurable model selection, processing pipelines, cost optimization,
 * and integration with the template and configuration systems.
 */

const VideoGenerationManager = require('./VideoGenerationManager');
const ConfigurationManager = require('./ConfigurationManager');
const PromptTemplateManager = require('./PromptTemplateManager');
const ConfigurationFactory = require('./ConfigurationFactory');

async function testVideoGenerationManager() {
    console.log('🎬 Testing VideoGenerationManager...\n');

    try {
        // Initialize managers
        const configManager = new ConfigurationManager({
            environment: 'test',
            region: 'us-east-1'
        });

        const promptManager = new PromptTemplateManager({
            environment: 'test',
            region: 'us-east-1',
            configManager
        });

        const videoManager = new VideoGenerationManager({
            environment: 'test',
            region: 'us-east-1',
            configManager,
            promptManager
        });

        // Test 1: Request normalization and validation
        console.log('🎬 Test 1: Request normalization and validation');
        
        const rawRequest = {
            topic: 'AI innovations in 2025',
            content: 'Showcase the latest AI technologies transforming business',
            videoConfig: {
                durationSeconds: 15,
                quality: 'high'
            },
            processingConfig: {
                includeAudio: true
            },
            userId: 'test-user-123'
        };

        const normalizedRequest = await videoManager.normalizeGenerationRequest(rawRequest);
        
        console.log('✅ Request normalized successfully:');
        console.log('   Topic:', normalizedRequest.topic);
        console.log('   Duration:', normalizedRequest.videoConfig.durationSeconds + 's');
        console.log('   Resolution:', normalizedRequest.videoConfig.resolution);
        console.log('   Quality:', normalizedRequest.videoConfig.quality);
        console.log('   Include Audio:', normalizedRequest.processingConfig.includeAudio);
        console.log('   Request ID:', normalizedRequest.metadata.requestId);
        console.log();

        // Test 2: Model selection and health checking
        console.log('🎬 Test 2: Model selection and health checking');
        
        const selectedModel = await videoManager.selectOptimalModel(normalizedRequest);
        
        console.log('✅ Model selected successfully:');
        console.log('   Provider:', selectedModel.provider);
        console.log('   Model:', selectedModel.model);
        console.log('   Region:', selectedModel.region);
        console.log('   Selection Reason:', selectedModel.selectionReason);
        console.log('   Estimated Cost:', '$' + selectedModel.estimatedCost.toFixed(4));
        console.log('   Health Status:', selectedModel.health.healthy ? 'Healthy' : 'Unhealthy');
        console.log();

        // Test 3: Enhanced prompt generation
        console.log('🎬 Test 3: Enhanced prompt generation');
        
        const enhancedPrompt = await videoManager.generateEnhancedPrompt(normalizedRequest);
        
        console.log('✅ Enhanced prompt generated:');
        console.log('   Length:', enhancedPrompt.length + ' characters');
        console.log('   Preview:', enhancedPrompt.substring(0, 150) + '...');
        console.log();

        // Test 4: Cost estimation and validation
        console.log('🎬 Test 4: Cost estimation and validation');
        
        const estimatedCost = videoManager.estimateGenerationCost(selectedModel, normalizedRequest);
        
        console.log('✅ Cost estimation:');
        console.log('   Base Cost:', '$' + estimatedCost.toFixed(4));
        console.log('   Max Budget:', '$' + normalizedRequest.constraints.maxCost.toFixed(2));
        console.log('   Within Budget:', estimatedCost <= normalizedRequest.constraints.maxCost ? 'Yes' : 'No');
        console.log();

        // Test 5: Topic categorization and visual elements
        console.log('🎬 Test 5: Topic categorization and visual elements');
        
        const topicCategory = videoManager.determineTopicCategory(normalizedRequest.topic);
        const visualElements = videoManager.getVisualElementsForTopic(topicCategory);
        const colorScheme = videoManager.getColorSchemeForTopic(topicCategory);
        const cinematography = videoManager.getCinematographyForTopic(topicCategory);
        
        console.log('✅ Topic analysis:');
        console.log('   Category:', topicCategory);
        console.log('   Visual Elements:', visualElements.join(', '));
        console.log('   Color Scheme:', colorScheme);
        console.log('   Cinematography:', cinematography);
        console.log();

        // Test 6: Model health checking for different providers
        console.log('🎬 Test 6: Model health checking');
        
        const testModels = [
            { provider: 'bedrock', model: 'amazon.nova-reel-v1:0', region: 'us-east-1' },
            { provider: 'luma', model: 'luma.ray-v2:0', region: 'us-west-2' },
            { provider: 'lambda', model: 'video-generator', region: 'us-east-1' }
        ];

        for (const model of testModels) {
            const health = await videoManager.checkModelHealth(model);
            console.log(`   ${model.provider}/${model.model}:`);
            console.log(`     Healthy: ${health.healthy}`);
            console.log(`     Response Time: ${health.responseTime}ms`);
            console.log(`     Last Checked: ${health.lastChecked}`);
        }
        console.log();

        // Test 7: Fallback prompt generation
        console.log('🎬 Test 7: Fallback prompt generation');
        
        const fallbackPrompt = videoManager.generateFallbackPrompt(normalizedRequest);
        
        console.log('✅ Fallback prompt generated:');
        console.log('   Prompt:', fallbackPrompt);
        console.log();

        // Test 8: Performance metrics tracking
        console.log('🎬 Test 8: Performance metrics tracking');
        
        // Simulate some generations for metrics
        const mockResult = {
            videoId: 'test-video-123',
            cost: 0.08,
            executionTime: 120000
        };

        await videoManager.trackGenerationMetrics(normalizedRequest, mockResult, Date.now() - 120000);
        
        const metrics = videoManager.getPerformanceMetrics();
        
        console.log('✅ Performance metrics:');
        console.log('   Total Generations:', metrics.totalGenerations);
        console.log('   Successful Generations:', metrics.successfulGenerations);
        console.log('   Success Rate:', ((metrics.successfulGenerations / metrics.totalGenerations) * 100).toFixed(1) + '%');
        console.log('   Average Generation Time:', Math.round(metrics.averageGenerationTime) + 'ms');
        console.log('   Total Cost:', '$' + metrics.totalCost.toFixed(4));
        console.log();

        // Test 9: Configuration Factory integration
        console.log('🎬 Test 9: Configuration Factory integration');
        
        const factoryVideoManager = ConfigurationFactory.getVideoGenerationManager('test');
        
        console.log('✅ Retrieved VideoGenerationManager from ConfigurationFactory');
        console.log('   Instance Type:', factoryVideoManager.constructor.name);
        console.log('   Environment:', factoryVideoManager.environment);
        console.log();

        // Test 10: Request validation edge cases
        console.log('🎬 Test 10: Request validation edge cases');
        
        const testCases = [
            {
                name: 'Missing topic',
                request: { content: 'Test content' },
                shouldFail: true
            },
            {
                name: 'Invalid duration (too short)',
                request: { topic: 'test', videoConfig: { durationSeconds: 0 } },
                shouldFail: true
            },
            {
                name: 'Invalid duration (too long)',
                request: { topic: 'test', videoConfig: { durationSeconds: 400 } },
                shouldFail: true
            },
            {
                name: 'Missing content',
                request: { topic: 'test' },
                shouldFail: true
            },
            {
                name: 'Valid minimal request',
                request: { topic: 'test', content: 'test content' },
                shouldFail: false
            }
        ];

        for (const testCase of testCases) {
            try {
                await videoManager.normalizeGenerationRequest(testCase.request);
                if (testCase.shouldFail) {
                    console.log(`   ❌ ${testCase.name}: Expected to fail but passed`);
                } else {
                    console.log(`   ✅ ${testCase.name}: Passed as expected`);
                }
            } catch (error) {
                if (testCase.shouldFail) {
                    console.log(`   ✅ ${testCase.name}: Failed as expected (${error.message})`);
                } else {
                    console.log(`   ❌ ${testCase.name}: Unexpected failure (${error.message})`);
                }
            }
        }
        console.log();

        // Test 11: Different topic categories
        console.log('🎬 Test 11: Different topic categories');
        
        const topicTests = [
            'ETF investing strategies for beginners',
            'Machine learning fundamentals tutorial',
            'Hidden gems in Mexico travel guide',
            'AI innovations transforming business',
            'Healthy cooking recipes for families'
        ];

        for (const topic of topicTests) {
            const category = videoManager.determineTopicCategory(topic);
            const elements = videoManager.getVisualElementsForTopic(category);
            console.log(`   "${topic}" -> ${category} (${elements.slice(0, 2).join(', ')})`);
        }
        console.log();

        // Test 12: Cost estimation for different configurations
        console.log('🎬 Test 12: Cost estimation variations');
        
        const costTestConfigs = [
            { duration: 8, includeAudio: false, quality: 'medium' },
            { duration: 8, includeAudio: true, quality: 'high' },
            { duration: 30, includeAudio: true, quality: 'high' },
            { duration: 60, includeAudio: true, quality: 'high' }
        ];

        for (const config of costTestConfigs) {
            const testRequest = {
                videoConfig: { durationSeconds: config.duration, quality: config.quality },
                processingConfig: { includeAudio: config.includeAudio, generateSubtitles: false }
            };
            
            const cost = videoManager.estimateGenerationCost(selectedModel, testRequest);
            console.log(`   ${config.duration}s, ${config.quality}, audio: ${config.includeAudio} -> $${cost.toFixed(4)}`);
        }
        console.log();

        console.log('🎉 All VideoGenerationManager tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testVideoGenerationManager();
}

module.exports = { testVideoGenerationManager };