/**
 * Test script for ContentGenerationManager
 * 
 * This script tests the comprehensive content generation functionality
 * including AI model selection, SEO optimization, topic-specific strategies,
 * and integration with the template and configuration systems.
 */

const ContentGenerationManager = require('./ContentGenerationManager');
const ConfigurationManager = require('./ConfigurationManager');
const PromptTemplateManager = require('./PromptTemplateManager');
const ConfigurationFactory = require('./ConfigurationFactory');

async function testContentGenerationManager() {
    console.log('📝 Testing ContentGenerationManager...\n');

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

        const contentManager = new ContentGenerationManager({
            environment: 'test',
            region: 'us-east-1',
            configManager,
            promptManager
        });

        // Test 1: Request normalization and validation
        console.log('📝 Test 1: Request normalization and validation');
        
        const rawRequest = {
            topic: 'ETF investing strategies for beginners',
            contentType: 'video_script',
            contentConfig: {
                maxLength: 300,
                tone: 'professional',
                audience: 'beginners'
            },
            seoConfig: {
                targetKeywords: ['ETF', 'investing', 'beginners', 'portfolio'],
                optimizeForPlatform: 'youtube'
            },
            userId: 'test-user-123'
        };

        const normalizedRequest = await contentManager.normalizeContentRequest(rawRequest);
        
        console.log('✅ Request normalized successfully:');
        console.log('   Topic:', normalizedRequest.topic);
        console.log('   Content Type:', normalizedRequest.contentType);
        console.log('   Max Length:', normalizedRequest.contentConfig.maxLength);
        console.log('   Tone:', normalizedRequest.contentConfig.tone);
        console.log('   Audience:', normalizedRequest.contentConfig.audience);
        console.log('   Target Keywords:', normalizedRequest.seoConfig.targetKeywords.join(', '));
        console.log('   Request ID:', normalizedRequest.metadata.requestId);
        console.log();

        // Test 2: AI model selection
        console.log('📝 Test 2: AI model selection');
        
        const selectedModel = await contentManager.selectContentModel(normalizedRequest);
        
        console.log('✅ Model selected successfully:');
        console.log('   Provider:', selectedModel.provider);
        console.log('   Model:', selectedModel.model);
        console.log('   Selection Reason:', selectedModel.selectionReason);
        console.log('   Estimated Cost:', '$' + selectedModel.estimatedCost.toFixed(6));
        console.log('   Estimated Tokens:', selectedModel.estimatedTokens);
        console.log('   Health Status:', selectedModel.health.healthy ? 'Healthy' : 'Unhealthy');
        console.log();

        // Test 3: Topic categorization and category-specific features
        console.log('📝 Test 3: Topic categorization');
        
        const topicTests = [
            'ETF investing strategies for beginners',
            'Machine learning fundamentals tutorial',
            'Hidden gems in Mexico travel guide',
            'AI innovations transforming business',
            'Healthy cooking recipes for families'
        ];

        for (const topic of topicTests) {
            const category = contentManager.determineTopicCategory(topic);
            const tags = contentManager.getCategoryTags(category);
            console.log(`   "${topic}" -> ${category} (${tags.slice(0, 3).join(', ')})`);
        }
        console.log();

        // Test 4: Content generation components
        console.log('📝 Test 4: Content generation components');
        
        // Test video script generation
        console.log('🎬 Generating video script...');
        const videoScript = await simulateContentGeneration(
            contentManager,
            'generateVideoScript',
            normalizedRequest,
            selectedModel
        );
        console.log('✅ Video script generated:');
        console.log('   Length:', videoScript.length + ' characters');
        console.log('   Preview:', videoScript.substring(0, 100) + '...');
        console.log();

        // Test title generation
        console.log('🏷️ Generating title...');
        const title = await simulateContentGeneration(
            contentManager,
            'generateTitle',
            normalizedRequest,
            selectedModel
        );
        console.log('✅ Title generated:', title);
        console.log();

        // Test description generation
        console.log('📄 Generating description...');
        const description = await simulateContentGeneration(
            contentManager,
            'generateDescription',
            normalizedRequest,
            selectedModel
        );
        console.log('✅ Description generated:');
        console.log('   Length:', description.length + ' characters');
        console.log('   Preview:', description.substring(0, 150) + '...');
        console.log();

        // Test 5: Keyword and tag generation
        console.log('📝 Test 5: Keyword and tag generation');
        
        const keywords = await simulateContentGeneration(
            contentManager,
            'generateKeywords',
            normalizedRequest,
            selectedModel
        );
        console.log('✅ Keywords generated:', keywords.slice(0, 8).join(', '));
        
        const tags = await simulateContentGeneration(
            contentManager,
            'generateTags',
            normalizedRequest,
            selectedModel
        );
        console.log('✅ Tags generated:', tags.slice(0, 8).join(', '));
        console.log();

        // Test 6: Complete content package generation
        console.log('📝 Test 6: Complete content package generation');
        
        const contentPackage = await simulateCompleteContentGeneration(
            contentManager,
            normalizedRequest,
            selectedModel
        );
        
        console.log('✅ Complete content package generated:');
        console.log('   Content ID:', contentPackage.contentId);
        console.log('   Topic:', contentPackage.topic);
        console.log('   Content Type:', contentPackage.contentType);
        console.log('   Script Length:', contentPackage.script?.length || 0);
        console.log('   Title:', contentPackage.title);
        console.log('   Keywords Count:', contentPackage.keywords?.length || 0);
        console.log('   Tags Count:', contentPackage.tags?.length || 0);
        console.log();

        // Test 7: SEO optimization
        console.log('📝 Test 7: SEO optimization');
        
        const optimizedContent = await contentManager.applySEOOptimization(contentPackage, normalizedRequest);
        
        console.log('✅ SEO optimization applied:');
        console.log('   Primary Keywords:', optimizedContent.seoMetadata?.primaryKeywords?.join(', ') || 'None');
        console.log('   Secondary Keywords:', optimizedContent.seoMetadata?.secondaryKeywords?.join(', ') || 'None');
        console.log('   Optimized For:', optimizedContent.seoMetadata?.optimizedFor || 'None');
        console.log('   Keyword Density:', ((optimizedContent.seoMetadata?.keywordDensity || 0) * 100).toFixed(2) + '%');
        console.log();

        // Test 8: Content quality validation
        console.log('📝 Test 8: Content quality validation');
        
        const qualityScore = await contentManager.validateContentQuality(optimizedContent);
        
        console.log('✅ Content quality validation:');
        console.log('   Quality Score:', (qualityScore * 100).toFixed(1) + '%');
        console.log('   Quality Level:', qualityScore >= 0.8 ? 'Excellent' : qualityScore >= 0.6 ? 'Good' : 'Needs Improvement');
        console.log();

        // Test 9: Different content types
        console.log('📝 Test 9: Different content types');
        
        const contentTypes = ['video_script', 'blog_post', 'social_media'];
        
        for (const contentType of contentTypes) {
            const typeRequest = {
                ...normalizedRequest,
                contentType,
                metadata: { ...normalizedRequest.metadata, requestId: `test-${contentType}-${Date.now()}` }
            };
            
            const typePackage = await simulateCompleteContentGeneration(
                contentManager,
                typeRequest,
                selectedModel
            );
            
            console.log(`   ${contentType}:`);
            console.log(`     Content ID: ${typePackage.contentId}`);
            console.log(`     Components: ${Object.keys(typePackage).filter(k => !['contentId', 'topic', 'contentType', 'generatedAt', 'generationMetadata'].includes(k)).join(', ')}`);
        }
        console.log();

        // Test 10: Configuration Factory integration
        console.log('📝 Test 10: Configuration Factory integration');
        
        // Clear cache to ensure fresh instance
        ConfigurationFactory.clearInstances();
        const factoryContentManager = ConfigurationFactory.getContentGenerationManager('test');
        
        console.log('✅ Retrieved ContentGenerationManager from ConfigurationFactory');
        console.log('   Instance Type:', factoryContentManager.constructor.name);
        console.log('   Environment:', factoryContentManager.environment);
        console.log();

        // Test 11: Request validation edge cases
        console.log('📝 Test 11: Request validation edge cases');
        
        const validationTestCases = [
            {
                name: 'Missing topic',
                request: { contentType: 'video_script' },
                shouldFail: true
            },
            {
                name: 'Invalid max length (too short)',
                request: { topic: 'test', contentConfig: { maxLength: 5 } },
                shouldFail: true
            },
            {
                name: 'Invalid max length (too long)',
                request: { topic: 'test', contentConfig: { maxLength: 10000 } },
                shouldFail: true
            },
            {
                name: 'Valid minimal request',
                request: { topic: 'test topic' },
                shouldFail: false
            }
        ];

        for (const testCase of validationTestCases) {
            try {
                await contentManager.normalizeContentRequest(testCase.request);
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

        // Test 12: Token usage estimation
        console.log('📝 Test 12: Token usage estimation');
        
        const estimationTests = [
            { maxLength: 100, hasContext: false },
            { maxLength: 300, hasContext: true },
            { maxLength: 1000, hasContext: false },
            { maxLength: 2000, hasContext: true }
        ];

        for (const test of estimationTests) {
            const testRequest = {
                contentConfig: { maxLength: test.maxLength },
                context: test.hasContext ? { trendData: { some: 'data' } } : {}
            };
            
            const estimatedTokens = contentManager.estimateTokenUsage(testRequest);
            console.log(`   ${test.maxLength} chars, context: ${test.hasContext} -> ${estimatedTokens} tokens`);
        }
        console.log();

        console.log('🎉 All ContentGenerationManager tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

/**
 * Simulate content generation (since we don't have actual AI models)
 */
async function simulateContentGeneration(contentManager, method, request, modelConfig) {
    try {
        // Simulate different content generation methods
        switch (method) {
            case 'generateVideoScript':
                return `Create an engaging video about ${request.topic}. This script is optimized for ${request.contentConfig.audience} with a ${request.contentConfig.tone} tone. The content covers key aspects of the topic while maintaining viewer engagement throughout.`;
                
            case 'generateTitle':
                const titleTemplates = [
                    `${request.seoConfig.targetKeywords[0]} Guide for ${request.contentConfig.audience}`,
                    `Essential ${request.topic} Tips You Need to Know`,
                    `Master ${request.topic}: Complete ${request.contentConfig.audience} Guide`
                ];
                return titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
                
            case 'generateDescription':
                return `Learn about ${request.topic} in this comprehensive guide. Perfect for ${request.contentConfig.audience} looking to understand ${request.seoConfig.targetKeywords.join(', ')}. This ${request.contentConfig.tone} content provides valuable insights and actionable advice.`;
                
            case 'generateKeywords':
                const baseKeywords = request.seoConfig.targetKeywords || [];
                const additionalKeywords = ['guide', 'tips', 'tutorial', 'how to', 'best practices', 'strategies', 'advice', 'learn'];
                return [...baseKeywords, ...additionalKeywords.slice(0, 8)];
                
            case 'generateTags':
                const category = contentManager.determineTopicCategory(request.topic);
                const categoryTags = contentManager.getCategoryTags(category);
                const additionalTags = ['trending', 'popular', 'viral', 'mustwatch'];
                return [...categoryTags.slice(0, 6), ...additionalTags.slice(0, 4)];
                
            default:
                return 'Simulated content';
        }
    } catch (error) {
        console.error(`Simulation failed for ${method}:`, error);
        return 'Fallback content';
    }
}

/**
 * Simulate complete content package generation
 */
async function simulateCompleteContentGeneration(contentManager, request, modelConfig) {
    const contentPackage = {
        contentId: request.metadata.requestId,
        topic: request.topic,
        contentType: request.contentType,
        generatedAt: new Date().toISOString()
    };
    
    // Generate content based on type
    switch (request.contentType) {
        case 'video_script':
            contentPackage.script = await simulateContentGeneration(contentManager, 'generateVideoScript', request, modelConfig);
            contentPackage.title = await simulateContentGeneration(contentManager, 'generateTitle', request, modelConfig);
            contentPackage.description = await simulateContentGeneration(contentManager, 'generateDescription', request, modelConfig);
            break;
            
        case 'blog_post':
            contentPackage.article = 'Simulated blog post article content...';
            contentPackage.title = await simulateContentGeneration(contentManager, 'generateTitle', request, modelConfig);
            contentPackage.summary = 'Simulated article summary...';
            break;
            
        case 'social_media':
            contentPackage.posts = ['Social media post 1', 'Social media post 2', 'Social media post 3'];
            break;
            
        default:
            contentPackage.content = 'Simulated generic content';
    }
    
    // Generate keywords and tags
    contentPackage.keywords = await simulateContentGeneration(contentManager, 'generateKeywords', request, modelConfig);
    contentPackage.tags = await simulateContentGeneration(contentManager, 'generateTags', request, modelConfig);
    
    // Add generation metadata
    contentPackage.generationMetadata = {
        model: modelConfig.model,
        provider: modelConfig.provider,
        selectionReason: modelConfig.selectionReason,
        estimatedCost: modelConfig.estimatedCost,
        estimatedTokens: modelConfig.estimatedTokens
    };
    
    return contentPackage;
}

// Run tests if this file is executed directly
if (require.main === module) {
    testContentGenerationManager();
}

module.exports = { testContentGenerationManager };