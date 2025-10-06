/**
 * YouTube Automation Platform - Content Generation Manager
 * 
 * Comprehensive content generation management system with configurable AI models,
 * SEO optimization, and topic-specific content strategies. Integrates with
 * existing content analysis while providing enhanced configuration capabilities.
 * 
 * Features:
 * - Configurable content generation with multiple AI models
 * - Topic-specific content strategies and customization
 * - SEO optimization with configurable keywords
 * - Content quality analysis and enhancement
 * - Integration with PromptTemplateManager for dynamic content
 * - Performance tracking and cost optimization
 * 
 * @fileoverview Provides comprehensive content generation management
 * @author YouTube Automation Platform Team
 * @version 2.1.0
 * @since 2025-10-06
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const ConfigurationManager = require('./ConfigurationManager');
const PromptTemplateManager = require('./PromptTemplateManager');
const AIModelFactory = require('../ai/AIModelFactory');

/**
 * Content Generation Manager
 * 
 * Manages content generation with configurable AI models and SEO optimization
 */
class ContentGenerationManager {
    constructor(options = {}) {
        this.region = options.region || process.env.AWS_REGION || 'us-east-1';
        this.environment = options.environment || process.env.ENVIRONMENT || 'production';
        
        // Initialize configuration manager
        this.configManager = options.configManager || new ConfigurationManager({
            region: this.region,
            environment: this.environment
        });
        
        // Initialize prompt template manager
        this.promptManager = options.promptManager || new PromptTemplateManager({
            region: this.region,
            environment: this.environment,
            configManager: this.configManager
        });
        
        // Initialize AWS clients
        this.lambdaClient = new LambdaClient({ region: this.region });
        
        // Content generation cache
        this.contentCache = new Map();
        this.seoCache = new Map();
        this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
        
        console.log(`ContentGenerationManager initialized for environment: ${this.environment}`);
    }   
 /**
     * Generate comprehensive content for video creation
     * 
     * @param {Object} contentRequest - Content generation request
     * @returns {Promise<Object>} Generated content package
     */
    async generateContent(contentRequest) {
        const startTime = Date.now();
        
        try {
            // Validate and normalize request
            const normalizedRequest = await this.normalizeContentRequest(contentRequest);
            
            // Select optimal AI model for content generation
            const modelConfig = await this.selectContentModel(normalizedRequest);
            
            // Generate content components
            const contentPackage = await this.generateContentPackage(normalizedRequest, modelConfig);
            
            // Apply SEO optimization
            const optimizedContent = await this.applySEOOptimization(contentPackage, normalizedRequest);
            
            // Validate content quality
            const qualityScore = await this.validateContentQuality(optimizedContent);
            
            // Track generation metrics
            await this.trackContentMetrics(normalizedRequest, optimizedContent, startTime);
            
            console.log(`Content generation completed: ${optimizedContent.contentId}`);
            return optimizedContent;
            
        } catch (error) {
            console.error('Content generation failed:', error);
            throw error;
        }
    }

    /**
     * Normalize and validate content request
     * 
     * @param {Object} request - Raw content request
     * @returns {Promise<Object>} Normalized request
     */
    async normalizeContentRequest(request) {
        // Get default content configuration
        const defaultConfig = await this.configManager.get('content.defaults', {
            maxLength: 500,
            tone: 'professional',
            audience: 'general',
            includeKeywords: true,
            seoOptimization: true
        });
        
        const normalized = {
            // Required fields
            topic: request.topic || 'general content',
            contentType: request.contentType || 'video_script',
            
            // Content configuration
            contentConfig: {
                maxLength: request.contentConfig?.maxLength || defaultConfig.maxLength,
                tone: request.contentConfig?.tone || defaultConfig.tone,
                audience: request.contentConfig?.audience || defaultConfig.audience,
                style: request.contentConfig?.style || 'informative',
                language: request.contentConfig?.language || 'en-US'
            },
            
            // SEO configuration
            seoConfig: {
                includeKeywords: request.seoConfig?.includeKeywords !== false,
                targetKeywords: request.seoConfig?.targetKeywords || [],
                optimizeForPlatform: request.seoConfig?.optimizeForPlatform || 'youtube',
                includeHashtags: request.seoConfig?.includeHashtags || false
            },
            
            // Quality requirements
            qualityConfig: {
                minQualityScore: request.qualityConfig?.minQualityScore || 0.7,
                requireFactCheck: request.qualityConfig?.requireFactCheck || false,
                includeSources: request.qualityConfig?.includeSources || false
            },
            
            // Context and constraints
            context: {
                trendData: request.context?.trendData || null,
                relatedContent: request.context?.relatedContent || [],
                competitorAnalysis: request.context?.competitorAnalysis || null
            },
            
            // Metadata
            metadata: {
                requestId: request.requestId || `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: request.userId || 'system',
                timestamp: new Date().toISOString()
            }
        };
        
        // Validate request
        this.validateContentRequest(normalized);
        
        return normalized;
    }

    /**
     * Select optimal AI model for content generation
     * 
     * @param {Object} request - Normalized content request
     * @returns {Promise<Object>} Selected model configuration
     */
    async selectContentModel(request) {
        try {
            // Get available content models configuration
            const contentModels = await this.configManager.get('ai.models.content', {
                primary: {
                    provider: 'anthropic',
                    model: 'claude-3-5-sonnet-20241022',
                    endpoint: 'https://api.anthropic.com',
                    maxTokens: 4096,
                    costPerToken: 0.000003
                },
                fallback: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    endpoint: 'https://api.openai.com/v1',
                    maxTokens: 4096,
                    costPerToken: 0.0000015
                }
            });
            
            // Check model health and availability
            const primaryHealth = await this.checkModelHealth(contentModels.primary);
            const fallbackHealth = await this.checkModelHealth(contentModels.fallback);
            
            // Select model based on health, content type, and requirements
            let selectedModel = contentModels.primary;
            let selectionReason = 'primary_healthy';
            
            if (!primaryHealth.healthy) {
                if (fallbackHealth.healthy) {
                    selectedModel = contentModels.fallback;
                    selectionReason = 'primary_unhealthy_fallback_used';
                } else {
                    throw new Error('No healthy content models available');
                }
            }
            
            // Estimate cost
            const estimatedTokens = this.estimateTokenUsage(request);
            const estimatedCost = estimatedTokens * selectedModel.costPerToken;
            
            console.log(`Selected content model: ${selectedModel.provider}/${selectedModel.model} (${selectionReason})`);
            
            return {
                ...selectedModel,
                selectionReason,
                estimatedCost,
                estimatedTokens,
                health: selectedModel === contentModels.primary ? primaryHealth : fallbackHealth
            };
            
        } catch (error) {
            console.error('Content model selection failed:', error);
            throw new Error(`Failed to select content model: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive content package
     * 
     * @param {Object} request - Content request
     * @param {Object} modelConfig - Selected model configuration
     * @returns {Promise<Object>} Content package
     */
    async generateContentPackage(request, modelConfig) {
        try {
            const contentPackage = {
                contentId: request.metadata.requestId,
                topic: request.topic,
                contentType: request.contentType,
                generatedAt: new Date().toISOString()
            };
            
            // Generate different content components based on type
            switch (request.contentType) {
                case 'video_script':
                    contentPackage.script = await this.generateVideoScript(request, modelConfig);
                    contentPackage.title = await this.generateTitle(request, modelConfig);
                    contentPackage.description = await this.generateDescription(request, modelConfig);
                    break;
                    
                case 'blog_post':
                    contentPackage.article = await this.generateArticle(request, modelConfig);
                    contentPackage.title = await this.generateTitle(request, modelConfig);
                    contentPackage.summary = await this.generateSummary(request, modelConfig);
                    break;
                    
                case 'social_media':
                    contentPackage.posts = await this.generateSocialMediaPosts(request, modelConfig);
                    break;
                    
                default:
                    contentPackage.content = await this.generateGenericContent(request, modelConfig);
            }
            
            // Generate keywords and tags
            contentPackage.keywords = await this.generateKeywords(request, modelConfig);
            contentPackage.tags = await this.generateTags(request, modelConfig);
            
            // Add generation metadata
            contentPackage.generationMetadata = {
                model: modelConfig.model,
                provider: modelConfig.provider,
                selectionReason: modelConfig.selectionReason,
                estimatedCost: modelConfig.estimatedCost,
                estimatedTokens: modelConfig.estimatedTokens
            };
            
            return contentPackage;
            
        } catch (error) {
            console.error('Content package generation failed:', error);
            throw error;
        }
    } 
   /**
     * Generate video script using AI model and templates
     * 
     * @param {Object} request - Content request
     * @param {Object} modelConfig - Model configuration
     * @returns {Promise<string>} Generated script
     */
    async generateVideoScript(request, modelConfig) {
        try {
            // Get topic category for template selection
            const topicCategory = this.determineTopicCategory(request.topic);
            
            // Prepare template variables
            const templateVariables = {
                topic: request.topic,
                tone: request.contentConfig.tone,
                audience: request.contentConfig.audience,
                maxLength: request.contentConfig.maxLength,
                style: request.contentConfig.style,
                keywords: request.seoConfig.targetKeywords
            };
            
            // Render script template
            const scriptTemplate = await this.promptManager.renderTemplate(
                'script',
                topicCategory,
                templateVariables,
                { userId: request.metadata.userId }
            );
            
            // Generate enhanced script using AI model
            const enhancedScript = await this.callAIModel(modelConfig, {
                prompt: scriptTemplate,
                maxTokens: Math.min(modelConfig.maxTokens, request.contentConfig.maxLength * 2),
                temperature: 0.7,
                systemPrompt: this.getSystemPrompt('video_script', request)
            });
            
            return enhancedScript;
            
        } catch (error) {
            console.error('Video script generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate optimized title
     * 
     * @param {Object} request - Content request
     * @param {Object} modelConfig - Model configuration
     * @returns {Promise<string>} Generated title
     */
    async generateTitle(request, modelConfig) {
        try {
            const topicCategory = this.determineTopicCategory(request.topic);
            
            const templateVariables = {
                topic: request.topic,
                keywords: request.seoConfig.targetKeywords,
                audience: request.contentConfig.audience,
                number: Math.floor(Math.random() * 5) + 3 // Random number 3-7
            };
            
            const titleTemplate = await this.promptManager.renderTemplate(
                'title',
                topicCategory,
                templateVariables,
                { userId: request.metadata.userId }
            );
            
            const enhancedTitle = await this.callAIModel(modelConfig, {
                prompt: `Generate an engaging, SEO-optimized title based on: ${titleTemplate}. Make it compelling and click-worthy while staying accurate.`,
                maxTokens: 100,
                temperature: 0.8,
                systemPrompt: this.getSystemPrompt('title', request)
            });
            
            return enhancedTitle.trim();
            
        } catch (error) {
            console.error('Title generation failed:', error);
            return `${request.topic} - Essential Guide`;
        }
    }

    /**
     * Generate comprehensive description
     * 
     * @param {Object} request - Content request
     * @param {Object} modelConfig - Model configuration
     * @returns {Promise<string>} Generated description
     */
    async generateDescription(request, modelConfig) {
        try {
            const topicCategory = this.determineTopicCategory(request.topic);
            
            const templateVariables = {
                topic: request.topic,
                keywords: request.seoConfig.targetKeywords,
                audience: request.contentConfig.audience,
                tone: request.contentConfig.tone
            };
            
            const descriptionTemplate = await this.promptManager.renderTemplate(
                'description',
                topicCategory,
                templateVariables,
                { userId: request.metadata.userId }
            );
            
            const enhancedDescription = await this.callAIModel(modelConfig, {
                prompt: descriptionTemplate,
                maxTokens: 300,
                temperature: 0.7,
                systemPrompt: this.getSystemPrompt('description', request)
            });
            
            return enhancedDescription;
            
        } catch (error) {
            console.error('Description generation failed:', error);
            return `Learn about ${request.topic} in this comprehensive guide.`;
        }
    }

    /**
     * Generate keywords for SEO optimization
     * 
     * @param {Object} request - Content request
     * @param {Object} modelConfig - Model configuration
     * @returns {Promise<Array>} Generated keywords
     */
    async generateKeywords(request, modelConfig) {
        try {
            if (!request.seoConfig.includeKeywords) {
                return request.seoConfig.targetKeywords || [];
            }
            
            const keywordPrompt = `Generate 10-15 relevant SEO keywords for the topic "${request.topic}" targeting ${request.contentConfig.audience}. Include both short-tail and long-tail keywords. Return as a comma-separated list.`;
            
            const keywordsText = await this.callAIModel(modelConfig, {
                prompt: keywordPrompt,
                maxTokens: 200,
                temperature: 0.5,
                systemPrompt: 'You are an SEO expert. Generate relevant, searchable keywords.'
            });
            
            // Parse keywords from response
            const keywords = keywordsText
                .split(',')
                .map(k => k.trim().toLowerCase())
                .filter(k => k.length > 0)
                .slice(0, 15);
            
            // Combine with target keywords
            const allKeywords = [...new Set([...request.seoConfig.targetKeywords, ...keywords])];
            
            return allKeywords;
            
        } catch (error) {
            console.error('Keyword generation failed:', error);
            return request.seoConfig.targetKeywords || [];
        }
    }

    /**
     * Generate tags for content categorization
     * 
     * @param {Object} request - Content request
     * @param {Object} modelConfig - Model configuration
     * @returns {Promise<Array>} Generated tags
     */
    async generateTags(request, modelConfig) {
        try {
            const topicCategory = this.determineTopicCategory(request.topic);
            
            // Get category-specific tags
            const categoryTags = this.getCategoryTags(topicCategory);
            
            // Generate additional tags using AI
            const tagPrompt = `Generate 5-8 relevant tags for content about "${request.topic}" in the ${topicCategory} category. Focus on trending and discoverable tags. Return as a comma-separated list.`;
            
            const tagsText = await this.callAIModel(modelConfig, {
                prompt: tagPrompt,
                maxTokens: 100,
                temperature: 0.6,
                systemPrompt: 'Generate relevant, trending tags for content discovery.'
            });
            
            const generatedTags = tagsText
                .split(',')
                .map(t => t.trim().replace('#', ''))
                .filter(t => t.length > 0)
                .slice(0, 8);
            
            // Combine category tags with generated tags
            const allTags = [...new Set([...categoryTags, ...generatedTags])];
            
            return allTags.slice(0, 15); // Limit to 15 tags
            
        } catch (error) {
            console.error('Tag generation failed:', error);
            return this.getCategoryTags(this.determineTopicCategory(request.topic));
        }
    }

    /**
     * Apply SEO optimization to content package
     * 
     * @param {Object} contentPackage - Generated content package
     * @param {Object} request - Original request
     * @returns {Promise<Object>} SEO-optimized content
     */
    async applySEOOptimization(contentPackage, request) {
        try {
            const optimizedContent = { ...contentPackage };
            
            if (!request.seoConfig.includeKeywords) {
                return optimizedContent;
            }
            
            // Optimize title for SEO
            if (optimizedContent.title) {
                optimizedContent.title = await this.optimizeForSEO(
                    optimizedContent.title,
                    contentPackage.keywords,
                    'title'
                );
            }
            
            // Optimize description for SEO
            if (optimizedContent.description) {
                optimizedContent.description = await this.optimizeForSEO(
                    optimizedContent.description,
                    contentPackage.keywords,
                    'description'
                );
            }
            
            // Add SEO metadata
            optimizedContent.seoMetadata = {
                primaryKeywords: contentPackage.keywords.slice(0, 5),
                secondaryKeywords: contentPackage.keywords.slice(5, 10),
                tags: contentPackage.tags,
                optimizedFor: request.seoConfig.optimizeForPlatform,
                keywordDensity: this.calculateKeywordDensity(optimizedContent, contentPackage.keywords)
            };
            
            return optimizedContent;
            
        } catch (error) {
            console.error('SEO optimization failed:', error);
            return contentPackage;
        }
    }

    /**
     * Validate content quality
     * 
     * @param {Object} content - Content to validate
     * @returns {Promise<number>} Quality score (0-1)
     */
    async validateContentQuality(content) {
        try {
            let qualityScore = 0;
            let checks = 0;
            
            // Check content length
            if (content.script && content.script.length > 50) {
                qualityScore += 0.2;
            }
            checks++;
            
            // Check title quality
            if (content.title && content.title.length > 10 && content.title.length < 100) {
                qualityScore += 0.2;
            }
            checks++;
            
            // Check description quality
            if (content.description && content.description.length > 50) {
                qualityScore += 0.2;
            }
            checks++;
            
            // Check keyword presence
            if (content.keywords && content.keywords.length >= 5) {
                qualityScore += 0.2;
            }
            checks++;
            
            // Check tag quality
            if (content.tags && content.tags.length >= 3) {
                qualityScore += 0.2;
            }
            checks++;
            
            const finalScore = qualityScore / checks;
            
            console.log(`Content quality score: ${(finalScore * 100).toFixed(1)}%`);
            return finalScore;
            
        } catch (error) {
            console.error('Quality validation failed:', error);
            return 0.5; // Default score
        }
    } 
   /**
     * Utility Methods
     */

    validateContentRequest(request) {
        if (!request.topic) {
            throw new Error('Topic is required for content generation');
        }
        
        if (request.contentConfig.maxLength < 10 || request.contentConfig.maxLength > 5000) {
            throw new Error('Content length must be between 10 and 5000 characters');
        }
    }

    async checkModelHealth(modelConfig) {
        // Simple health check - could be enhanced with actual API calls
        return {
            healthy: true,
            responseTime: 0,
            lastChecked: new Date().toISOString()
        };
    }

    estimateTokenUsage(request) {
        // Rough estimation: 1 token ≈ 0.75 words ≈ 4 characters
        const baseTokens = Math.ceil(request.contentConfig.maxLength / 3);
        const contextTokens = request.context?.trendData ? 200 : 0;
        return baseTokens + contextTokens + 100; // Add buffer for prompts
    }

    determineTopicCategory(topic) {
        const topicLower = topic.toLowerCase();
        
        if (topicLower.includes('invest') || topicLower.includes('finance') || topicLower.includes('etf')) {
            return 'investing';
        } else if (topicLower.includes('education') || topicLower.includes('learn') || topicLower.includes('tutorial')) {
            return 'education';
        } else if (topicLower.includes('travel') || topicLower.includes('tourism') || topicLower.includes('destination')) {
            return 'tourism';
        } else if (topicLower.includes('tech') || topicLower.includes('ai') || topicLower.includes('software')) {
            return 'technology';
        }
        
        return 'general';
    }

    getCategoryTags(category) {
        const categoryTags = {
            investing: ['investing', 'finance', 'money', 'wealth', 'portfolio', 'stocks', 'etf'],
            education: ['education', 'learning', 'tutorial', 'guide', 'howto', 'tips', 'knowledge'],
            tourism: ['travel', 'tourism', 'destination', 'vacation', 'adventure', 'culture', 'explore'],
            technology: ['technology', 'tech', 'innovation', 'digital', 'ai', 'software', 'future'],
            general: ['tips', 'guide', 'howto', 'advice', 'information', 'helpful']
        };
        
        return categoryTags[category] || categoryTags.general;
    }

    getSystemPrompt(contentType, request) {
        const systemPrompts = {
            video_script: `You are an expert content creator specializing in ${request.contentConfig.audience} content. Create engaging, informative video scripts with a ${request.contentConfig.tone} tone.`,
            title: `You are an SEO expert and content strategist. Create compelling, click-worthy titles that are optimized for search and engagement.`,
            description: `You are a content marketing specialist. Write comprehensive, SEO-optimized descriptions that inform and engage the target audience.`,
            keywords: `You are an SEO specialist. Generate relevant, searchable keywords that will help content rank well and be discovered by the target audience.`
        };
        
        return systemPrompts[contentType] || 'You are a helpful content creation assistant.';
    }

    async callAIModel(modelConfig, params) {
        try {
            // Use AIModelFactory for consistent model calling
            if (typeof AIModelFactory !== 'undefined' && AIModelFactory.generateContent) {
                return await AIModelFactory.generateContent(params.prompt, {
                    model: modelConfig.model,
                    maxTokens: params.maxTokens,
                    temperature: params.temperature
                });
            }
            
            // Fallback to direct model calling
            if (modelConfig.provider === 'anthropic') {
                return await this.callAnthropicModel(modelConfig, params);
            } else if (modelConfig.provider === 'openai') {
                return await this.callOpenAIModel(modelConfig, params);
            } else if (modelConfig.provider === 'bedrock') {
                return await this.callBedrockModel(modelConfig, params);
            }
            
            throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
            
        } catch (error) {
            console.error('AI model call failed:', error);
            throw error;
        }
    }

    async callBedrockModel(modelConfig, params) {
        try {
            const bedrockClient = new BedrockRuntimeClient({ region: this.region });
            
            const response = await bedrockClient.send(new InvokeModelCommand({
                modelId: modelConfig.model,
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: params.maxTokens,
                    temperature: params.temperature,
                    system: params.systemPrompt,
                    messages: [
                        {
                            role: "user",
                            content: params.prompt
                        }
                    ]
                })
            }));
            
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            return responseBody.content[0].text;
            
        } catch (error) {
            console.error('Bedrock model call failed:', error);
            throw error;
        }
    }

    async optimizeForSEO(text, keywords, contentType) {
        // Simple SEO optimization - could be enhanced
        let optimizedText = text;
        
        // Ensure primary keywords are included
        const primaryKeywords = keywords.slice(0, 3);
        for (const keyword of primaryKeywords) {
            if (!optimizedText.toLowerCase().includes(keyword.toLowerCase())) {
                if (contentType === 'title') {
                    optimizedText = `${keyword} - ${optimizedText}`;
                } else {
                    optimizedText += ` Learn more about ${keyword}.`;
                }
            }
        }
        
        return optimizedText;
    }

    calculateKeywordDensity(content, keywords) {
        const text = (content.script || content.description || '').toLowerCase();
        const wordCount = text.split(/\s+/).length;
        
        if (wordCount === 0) return 0;
        
        let keywordCount = 0;
        for (const keyword of keywords) {
            const regex = new RegExp(keyword.toLowerCase(), 'g');
            const matches = text.match(regex);
            keywordCount += matches ? matches.length : 0;
        }
        
        return keywordCount / wordCount;
    }

    async trackContentMetrics(request, content, startTime) {
        const metrics = {
            contentId: content.contentId,
            topic: request.topic,
            contentType: request.contentType,
            generationTime: Date.now() - startTime,
            qualityScore: await this.validateContentQuality(content),
            keywordCount: content.keywords?.length || 0,
            tagCount: content.tags?.length || 0,
            estimatedCost: content.generationMetadata?.estimatedCost || 0,
            timestamp: new Date().toISOString()
        };
        
        console.log('Content generation metrics:', metrics);
        
        // In production, this would be sent to analytics service
        return metrics;
    }

    // Placeholder methods for additional content types
    async generateArticle(request, modelConfig) {
        // TODO: Implement article generation
        return 'Article content placeholder';
    }

    async generateSummary(request, modelConfig) {
        // TODO: Implement summary generation
        return 'Summary placeholder';
    }

    async generateSocialMediaPosts(request, modelConfig) {
        // TODO: Implement social media post generation
        return ['Social media post 1', 'Social media post 2'];
    }

    async generateGenericContent(request, modelConfig) {
        // TODO: Implement generic content generation
        return 'Generic content placeholder';
    }

    // Direct model calling methods (placeholders)
    async callAnthropicModel(modelConfig, params) {
        // TODO: Implement direct Anthropic API calling
        throw new Error('Direct Anthropic calling not implemented');
    }

    async callOpenAIModel(modelConfig, params) {
        // TODO: Implement direct OpenAI API calling
        throw new Error('Direct OpenAI calling not implemented');
    }
}

module.exports = ContentGenerationManager;