/**
 * YouTube Automation Platform - AI Model Factory
 * 
 * Factory class that provides easy access to AI model management
 * and integrates with the configuration system.
 * 
 * @fileoverview Simplifies AI model access across the application
 * @author YouTube Automation Platform Team
 * @version 2.0.0
 * @since 2025-01-06
 */

const AIModelManager = require('./AIModelManager');
const ConfigurationFactory = require('../config/ConfigurationFactory');

/**
 * AI Model Factory
 * 
 * Provides singleton instances and common AI model patterns
 */
class AIModelFactory {
    constructor() {
        this.instances = new Map();
    }

    /**
     * Get singleton AIModelManager instance
     * 
     * @param {string} environment - Environment name
     * @param {Object} options - Configuration options
     * @returns {AIModelManager} AI model manager instance
     */
    getInstance(environment = null, options = {}) {
        const env = environment || process.env.ENVIRONMENT || 'production';
        const key = `${env}-${JSON.stringify(options)}`;
        
        if (!this.instances.has(key)) {
            const configManager = ConfigurationFactory.getInstance(env);
            const aiModelManager = new AIModelManager({
                configManager,
                environment: env,
                ...options
            });
            this.instances.set(key, aiModelManager);
        }
        
        return this.instances.get(key);
    }

    /**
     * Generate content using configured AI models
     * 
     * @param {string} prompt - Content prompt
     * @param {Object} options - Generation options
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Generated content
     */
    async generateContent(prompt, options = {}, environment = null) {
        const aiManager = this.getInstance(environment);
        
        // Select optimal content model
        const modelConfig = await aiManager.selectModel('content', {
            maxTokens: options.maxTokens || 4096,
            temperature: options.temperature || 0.7,
            topic: options.topic
        });
        
        // Generate content
        const response = await aiManager.callModel('content', modelConfig, {
            prompt,
            maxTokens: options.maxTokens || 4096,
            temperature: options.temperature || 0.7
        });
        
        return {
            content: this.extractContentFromResponse('content', response),
            model: modelConfig.model,
            provider: modelConfig.provider,
            usage: response.usage || response.usage_metadata
        };
    }

    /**
     * Generate video using configured AI models
     * 
     * @param {string} prompt - Video prompt
     * @param {Object} options - Generation options
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Generated video
     */
    async generateVideo(prompt, options = {}, environment = null) {
        const aiManager = this.getInstance(environment);
        
        // Select optimal video model
        const modelConfig = await aiManager.selectModel('video', {
            duration: options.duration || 8,
            quality: options.quality || 'high',
            style: options.style
        });
        
        // Generate video
        const response = await aiManager.callModel('video', modelConfig, {
            prompt,
            duration: options.duration || 8,
            quality: options.quality || 'high',
            aspectRatio: options.aspectRatio || '16:9'
        });
        
        return {
            videoUrl: response.videoUrl,
            duration: response.duration,
            model: modelConfig.model,
            provider: modelConfig.provider,
            status: response.status
        };
    }

    /**
     * Generate audio using configured AI models
     * 
     * @param {string} text - Text to synthesize
     * @param {Object} options - Generation options
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Generated audio
     */
    async generateAudio(text, options = {}, environment = null) {
        const aiManager = this.getInstance(environment);
        
        // Select optimal audio model
        const modelConfig = await aiManager.selectModel('audio', {
            voice: options.voice,
            engine: options.engine,
            topic: options.topic
        });
        
        // Generate audio
        const response = await aiManager.callModel('audio', modelConfig, {
            text,
            voice: options.voice || modelConfig.voiceId,
            speed: options.speed || 'medium',
            language: options.language || 'en-US'
        });
        
        return {
            audioUrl: response.audioUrl,
            duration: response.duration,
            engine: response.engine || modelConfig.engine,
            provider: modelConfig.provider,
            taskId: response.taskId
        };
    }

    /**
     * Get model health status for all services
     * 
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Health status
     */
    async getModelHealthStatus(environment = null) {
        const aiManager = this.getInstance(environment);
        
        const services = ['content', 'video', 'audio'];
        const healthStatus = {};
        
        for (const service of services) {
            try {
                const serviceConfig = await aiManager.getServiceConfiguration(service);
                
                healthStatus[service] = {
                    primary: {
                        model: serviceConfig.primary.model,
                        provider: serviceConfig.primary.provider,
                        healthy: await aiManager.isModelHealthy(service, serviceConfig.primary)
                    }
                };
                
                if (serviceConfig.fallback) {
                    healthStatus[service].fallback = {
                        model: serviceConfig.fallback.model,
                        provider: serviceConfig.fallback.provider,
                        healthy: await aiManager.isModelHealthy(service, serviceConfig.fallback)
                    };
                }
                
            } catch (error) {
                healthStatus[service] = {
                    error: error.message
                };
            }
        }
        
        return healthStatus;
    }

    /**
     * Get performance metrics for all models
     * 
     * @param {string} environment - Environment name
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics(environment = null) {
        const aiManager = this.getInstance(environment);
        return aiManager.getPerformanceMetrics();
    }

    /**
     * Update model configuration at runtime
     * 
     * @param {string} service - Service type
     * @param {string} tier - Configuration tier ('primary' or 'fallback')
     * @param {Object} config - Model configuration
     * @param {string} environment - Environment name
     */
    async updateModelConfiguration(service, tier, config, environment = null) {
        const configManager = ConfigurationFactory.getInstance(environment);
        
        await configManager.setRuntimeOverride(
            `ai.models.${service}.${tier}`,
            config,
            { persist: true }
        );
        
        console.log(`Updated ${service} ${tier} model configuration:`, config);
    }

    /**
     * Test model connectivity and performance
     * 
     * @param {string} service - Service type
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Test results
     */
    async testModelConnectivity(service, environment = null) {
        const aiManager = this.getInstance(environment);
        
        try {
            const serviceConfig = await aiManager.getServiceConfiguration(service);
            const testParams = aiManager.getHealthCheckParameters(service);
            
            const startTime = Date.now();
            const response = await aiManager.callModel(service, serviceConfig.primary, testParams);
            const duration = Date.now() - startTime;
            
            return {
                success: true,
                model: serviceConfig.primary.model,
                provider: serviceConfig.primary.provider,
                duration,
                response: response ? 'Valid response received' : 'No response'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                model: 'Unknown',
                provider: 'Unknown'
            };
        }
    }

    /**
     * Get cost estimate for AI operations
     * 
     * @param {string} service - Service type
     * @param {Object} usage - Usage parameters
     * @param {string} environment - Environment name
     * @returns {Promise<Object>} Cost estimate
     */
    async getCostEstimate(service, usage, environment = null) {
        const configManager = ConfigurationFactory.getInstance(environment);
        const costRates = await configManager.get('cost.rates', {});
        
        let estimate = 0;
        let details = {};
        
        switch (service) {
            case 'content':
                const contentRate = costRates.anthropic?.['claude-3-5-sonnet'] || 3.00;
                estimate = (usage.tokens || 1000) / 1000000 * contentRate;
                details = { tokens: usage.tokens, ratePerMillion: contentRate };
                break;
                
            case 'video':
                const videoRate = costRates.bedrock?.['nova-reel'] || 0.05;
                estimate = videoRate; // Per video
                details = { videos: 1, ratePerVideo: videoRate };
                break;
                
            case 'audio':
                const audioEngine = usage.engine || 'generative';
                const audioRate = costRates.polly?.[audioEngine] || 30.00;
                estimate = (usage.characters || 150) / 1000000 * audioRate;
                details = { characters: usage.characters, engine: audioEngine, ratePerMillion: audioRate };
                break;
        }
        
        return {
            service,
            estimatedCost: Math.round(estimate * 10000) / 10000, // 4 decimal places
            details
        };
    }

    /**
     * Extract content from API response based on provider
     * 
     * @param {string} service - Service type
     * @param {Object} response - API response
     * @returns {string} Extracted content
     */
    extractContentFromResponse(service, response) {
        if (!response) return '';
        
        switch (service) {
            case 'content':
                // Handle different provider response formats
                if (response.content) return response.content;
                if (response.choices && response.choices[0]?.message?.content) {
                    return response.choices[0].message.content;
                }
                return response.text || '';
                
            default:
                return response.content || response.text || '';
        }
    }

    /**
     * Clear all cached instances (useful for testing)
     */
    clearInstances() {
        this.instances.clear();
    }
}

// Export singleton instance
module.exports = new AIModelFactory();