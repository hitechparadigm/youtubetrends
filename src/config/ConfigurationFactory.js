/**
 * YouTube Automation Platform - Configuration Factory
 * 
 * Factory class that provides easy access to common configuration patterns
 * and pre-configured instances of ConfigurationManager for different use cases.
 * 
 * @fileoverview Simplifies configuration access across the application
 * @author YouTube Automation Platform Team
 * @version 2.0.0
 * @since 2025-01-06
 */

const ConfigurationManager = require('./ConfigurationManager');
const PromptTemplateManager = require('./PromptTemplateManager');
const ABTestManager = require('./ABTestManager');
const VideoGenerationManager = require('./VideoGenerationManager');
const SimpleCostControls = require('./SimpleCostControls');
const configSchema = require('./schemas/configuration-schema.json');

/**
 * Configuration Factory
 * 
 * Provides singleton instances and common configuration patterns
 */
class ConfigurationFactory {
    constructor() {
        this.instances = new Map();
        this.templateManagers = new Map();
        this.abTestManagers = new Map();
        this.videoGenerationManagers = new Map();
        this.contentGenerationManagers = new Map();
        this.featureFlagManagers = new Map();
        this.experimentManagers = new Map();
        this.metricsCollectors = new Map();
        this.costControls = new Map();
        this.defaultConfigurations = this.loadDefaultConfigurations();
    }

    /**
     * Get singleton ConfigurationManager instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - Configuration options
     * @returns {ConfigurationManager} Configuration manager instance
     */
    getInstance(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.instances.has(key)) {
            const config = new ConfigurationManager({
                environment: env,
                ...options
            });
            this.instances.set(key, config);
        }
        
        return this.instances.get(key);
    }

    /**
     * Get AI model configuration
     * 
     * @param {string} service - Service type ('content', 'video', 'audio')
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} AI model configuration
     */
    async getAIModelConfig(service, environment = null) {
        const config = this.getInstance(environment);
        
        const modelConfig = await config.get(`ai.models.${service}`, this.defaultConfigurations.ai.models[service]);
        
        // Validate configuration
        this.validateAIModelConfig(service, modelConfig);
        
        return modelConfig;
    }

    /**
     * Get cost management configuration
     * 
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Cost configuration
     */
    async getCostConfig(environment = null) {
        const config = this.getInstance(environment);
        
        return {
            budgets: await config.get('cost.budgets', this.defaultConfigurations.cost.budgets),
            rates: await config.get('cost.rates', this.defaultConfigurations.cost.rates),
            optimization: await config.get('cost.optimization', this.defaultConfigurations.cost.optimization)
        };
    }

    /**
     * Get video generation configuration
     * 
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Video configuration
     */
    async getVideoConfig(environment = null) {
        const config = this.getInstance(environment);
        
        return {
            defaultDuration: await config.get('video.defaultDuration', 8),
            resolution: await config.get('video.resolution', '1920x1080'),
            framerate: await config.get('video.framerate', 24),
            quality: await config.get('video.quality', 'high'),
            aspectRatio: await config.get('video.aspectRatio', '16:9'),
            effects: await config.get('video.effects', true)
        };
    }

    /**
     * Get feature flags configuration
     * 
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Feature flags
     */
    async getFeatureFlags(environment = null) {
        const config = this.getInstance(environment);
        
        return {
            enableGenerativeAI: await config.get('features.enableGenerativeAI', true),
            enableAdvancedVideoEffects: await config.get('features.enableAdvancedVideoEffects', false),
            enableMultiLanguage: await config.get('features.enableMultiLanguage', false),
            enableCustomThumbnails: await config.get('features.enableCustomThumbnails', true),
            enableABTesting: await config.get('features.enableABTesting', true)
        };
    }

    /**
     * Get PromptTemplateManager instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - Template manager options
     * @returns {PromptTemplateManager} Template manager instance
     */
    getTemplateManager(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.templateManagers.has(key)) {
            const configManager = this.getInstance(env);
            const templateManager = new PromptTemplateManager({
                environment: env,
                configManager,
                ...options
            });
            this.templateManagers.set(key, templateManager);
        }
        
        return this.templateManagers.get(key);
    }

    /**
     * Get prompt template configuration (legacy method - now uses PromptTemplateManager)
     * 
     * @param {string} templateType - Template type ('script', 'title', 'description', 'video_prompt')
     * @param {string} topic - Content topic
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Template configuration
     */
    async getPromptTemplate(templateType, topic, environment = null) {
        const templateManager = this.getTemplateManager(environment);
        return await templateManager.loadTemplate(templateType, topic);
    }

    /**
     * Render prompt template with variables
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {Object} variables - Template variables
     * @param {Object} options - Rendering options
     * @param {string} environment - Environment name
     * @returns {Promise<string>} Rendered template
     */
    async renderPromptTemplate(templateType, topic, variables = {}, options = {}, environment = null) {
        const templateManager = this.getTemplateManager(environment);
        return await templateManager.renderTemplate(templateType, topic, variables, options);
    }

    /**
     * Get ABTestManager instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - A/B test manager options
     * @returns {ABTestManager} A/B test manager instance
     */
    getABTestManager(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.abTestManagers.has(key)) {
            const configManager = this.getInstance(env);
            const abTestManager = new ABTestManager({
                environment: env,
                configManager,
                ...options
            });
            this.abTestManagers.set(key, abTestManager);
        }
        
        return this.abTestManagers.get(key);
    }

    /**
     * Get VideoGenerationManager instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - Video generation manager options
     * @returns {VideoGenerationManager} Video generation manager instance
     */
    getVideoGenerationManager(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.videoGenerationManagers.has(key)) {
            const configManager = this.getInstance(env);
            const promptManager = this.getTemplateManager(env);
            const videoManager = new VideoGenerationManager({
                environment: env,
                configManager,
                promptManager,
                ...options
            });
            this.videoGenerationManagers.set(key, videoManager);
        }
        
        return this.videoGenerationManagers.get(key);
    }

    /**
     * Get ContentGenerationManager instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - Content generation manager options
     * @returns {ContentGenerationManager} Content generation manager instance
     */
    getContentGenerationManager(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.contentGenerationManagers.has(key)) {
            // Lazy load ContentGenerationManager to avoid circular dependencies
            const ContentGenerationManager = require('./ContentGenerationManager');
            
            const configManager = this.getInstance(env);
            const promptManager = this.getTemplateManager(env);
            
            // Debug: Check if ContentGenerationManager is available
            if (typeof ContentGenerationManager !== 'function') {
                console.error('ContentGenerationManager is not a function:', typeof ContentGenerationManager);
                throw new Error(`ContentGenerationManager is not available as a constructor. Type: ${typeof ContentGenerationManager}`);
            }
            
            const contentManager = new ContentGenerationManager({
                environment: env,
                configManager,
                promptManager,
                ...options
            });
            this.contentGenerationManagers.set(key, contentManager);
        }
        
        return this.contentGenerationManagers.get(key);
    }

    /**
     * Get FeatureFlagManager instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - Feature flag manager options
     * @returns {FeatureFlagManager} Feature flag manager instance
     */
    getFeatureFlagManager(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.featureFlagManagers.has(key)) {
            // Lazy load FeatureFlagManager to avoid circular dependencies
            const FeatureFlagManager = require('./FeatureFlagManager');
            
            const configManager = this.getInstance(env);
            
            const flagManager = new FeatureFlagManager({
                environment: env,
                configManager,
                ...options
            });
            this.featureFlagManagers.set(key, flagManager);
        }
        
        return this.featureFlagManagers.get(key);
    }

    /**
     * Get SimpleCostControls instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - Cost controls options
     * @returns {SimpleCostControls} Cost controls instance
     */
    getCostControls(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.costControls.has(key)) {
            const configManager = this.getInstance(env);
            const costControls = new SimpleCostControls(configManager);
            this.costControls.set(key, costControls);
        }
        
        return this.costControls.get(key);
    }

    /**
     * Get environment-optimized model configuration
     * 
     * @param {string} service - Service type ('content', 'video', 'audio')
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Optimized model configuration
     */
    async getOptimizedModelConfig(service, environment = null) {
        const costControls = this.getCostControls(environment);
        return await costControls.getModelConfig(service);
    }

    /**
     * Get secret value
     * 
     * @param {string} secretName - Secret name
     * @param {string} environment - Environment name
     * @returns {Promise<*>} Secret value
     */
    async getSecret(secretName, environment = null) {
        const config = this.getInstance(environment);
        return await config.get(`secrets.${secretName}`);
    }

    /**
     * Update configuration at runtime
     * 
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     * @param {Object} options - Update options
     * @param {string} environment - Environment name
     */
    async updateConfiguration(key, value, options = {}, environment = null) {
        const config = this.getInstance(environment);
        
        // Validate against schema if available
        if (options.validate !== false) {
            this.validateConfigurationValue(key, value);
        }
        
        await config.setRuntimeOverride(key, value, options);
    }

    /**
     * Load default configurations
     * 
     * @returns {Object} Default configuration object
     */
    loadDefaultConfigurations() {
        return {
            ai: {
                models: {
                    content: {
                        primary: {
                            provider: 'anthropic',
                            model: 'claude-3-5-sonnet-20241022',
                            endpoint: 'https://api.anthropic.com',
                            maxTokens: 4096,
                            temperature: 0.7
                        },
                        fallback: {
                            provider: 'openai',
                            model: 'gpt-4o-mini',
                            endpoint: 'https://api.openai.com/v1'
                        }
                    },
                    video: {
                        primary: {
                            provider: 'bedrock',
                            model: 'amazon.nova-reel-v1:0',
                            region: 'us-east-1',
                            maxDuration: 300
                        },
                        fallback: {
                            provider: 'luma',
                            model: 'luma.ray-v2:0',
                            region: 'us-west-2'
                        }
                    },
                    audio: {
                        primary: {
                            provider: 'polly',
                            engine: 'generative',
                            voiceId: 'Ruth'
                        },
                        fallback: {
                            provider: 'polly',
                            engine: 'neural',
                            voiceId: 'Amy'
                        }
                    }
                }
            },
            cost: {
                budgets: {
                    daily: 10.00,
                    monthly: 300.00,
                    perVideo: 0.15
                },
                rates: {
                    polly: {
                        standard: 4.00,
                        neural: 16.00,
                        generative: 30.00
                    },
                    anthropic: {
                        'claude-3-5-sonnet': 3.00,
                        'claude-3-haiku': 0.25
                    },
                    openai: {
                        'gpt-4o': 5.00,
                        'gpt-4o-mini': 0.15
                    },
                    bedrock: {
                        'nova-reel': 0.05,
                        'nova-canvas': 0.04
                    }
                },
                optimization: {
                    enabled: true,
                    aggressiveness: 'balanced', // conservative, balanced, aggressive
                    fallbackThreshold: 0.8
                }
            },
            prompts: {
                storageType: 's3',
                bucket: 'youtube-automation-prompts',
                version: 'v2.1',
                templates: {
                    script: {
                        default: 'Create an engaging {duration}-second video about {topic}. Include {keywords} and provide valuable insights for the audience.'
                    },
                    title: {
                        default: '{number} Essential {topic} Tips You Need to Know'
                    },
                    description: {
                        default: 'Learn about {topic} in this comprehensive guide. We cover {keywords} and provide actionable advice.'
                    }
                }
            },
            features: {
                enableGenerativeAI: true,
                enableAdvancedVideoEffects: false,
                enableMultiLanguage: false,
                enableCustomThumbnails: true,
                enableABTesting: true
            }
        };
    }

    /**
     * Validate AI model configuration
     * 
     * @param {string} service - Service type
     * @param {Object} config - Model configuration
     */
    validateAIModelConfig(service, config) {
        if (!config || !config.primary) {
            throw new Error(`Invalid AI model configuration for service: ${service}`);
        }
        
        const { provider } = config.primary;
        if (!provider) {
            throw new Error(`AI model configuration missing required field: provider`);
        }
        
        // Service-specific validation
        if (service === 'audio') {
            // Audio services use engine instead of model
            const { engine } = config.primary;
            if (!engine) {
                throw new Error(`Audio configuration missing required field: engine`);
            }
            
            // Validate audio engines
            const validEngines = ['generative', 'neural', 'standard'];
            if (!validEngines.includes(engine)) {
                throw new Error(`Invalid audio engine: ${engine}. Must be one of: ${validEngines.join(', ')}`);
            }
        } else {
            // Content and video services use model
            const { model } = config.primary;
            if (!model) {
                throw new Error(`${service} configuration missing required field: model`);
            }
            
            // Validate provider-specific requirements
            if (provider === 'anthropic' && !model.startsWith('claude-')) {
                throw new Error(`Invalid Anthropic model: ${model}`);
            }
            
            if (provider === 'openai' && !model.startsWith('gpt-')) {
                throw new Error(`Invalid OpenAI model: ${model}`);
            }
        }
    }

    /**
     * Validate configuration value against schema
     * 
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     */
    validateConfigurationValue(key, value) {
        // Basic validation - can be extended with full JSON Schema validation
        const keyParts = key.split('.');
        
        if (keyParts[0] === 'cost' && keyParts[1] === 'budgets') {
            if (typeof value !== 'number' || value < 0) {
                throw new Error(`Budget values must be positive numbers: ${key}`);
            }
        }
        
        if (keyParts[0] === 'video' && keyParts[1] === 'defaultDuration') {
            if (typeof value !== 'number' || value < 1 || value > 300) {
                throw new Error(`Video duration must be between 1 and 300 seconds: ${key}`);
            }
        }
        
        if (keyParts[0] === 'features') {
            if (typeof value !== 'boolean') {
                throw new Error(`Feature flags must be boolean values: ${key}`);
            }
        }
    }

    /**
     * Clear all cached instances (useful for testing)
     */
    clearInstances() {
        this.instances.clear();
        this.templateManagers.clear();
        this.abTestManagers.clear();
        this.videoGenerationManagers.clear();
        this.contentGenerationManagers.clear();
        this.featureFlagManagers.clear();
        this.experimentManagers.clear();
        this.metricsCollectors.clear();
        this.costControls.clear();
    }
}

// Export singleton instance
module.exports = new ConfigurationFactory();