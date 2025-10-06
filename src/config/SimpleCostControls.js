/**
 * YouTube Automation Platform - Simple Cost Controls
 * 
 * Provides simple cost optimization for testing environments to prevent
 * unexpected AWS charges like the $172 bill. Uses cheaper models for
 * development while maintaining quality for production.
 * 
 * @fileoverview Simple cost controls with environment-based model selection
 * @author YouTube Automation Platform Team
 * @version 1.0.0
 * @since 2025-01-06
 */

const SimpleCostTracker = require('./SimpleCostTracker');

/**
 * Simple Cost Controls Manager
 * 
 * Manages environment-based model selection and basic cost tracking
 * to prevent expensive testing bills while maintaining production quality.
 */
class SimpleCostControls {
    constructor(configManager) {
        this.config = configManager;
        this.environment = configManager.environment;
        this.cache = new Map();
        this.cacheTimestamps = new Map();
        
        // Initialize cost tracker
        this.costTracker = new SimpleCostTracker(configManager);
        
        console.log(`SimpleCostControls initialized for environment: ${this.environment}`);
    }

    /**
     * Get optimal model configuration based on environment
     * 
     * @param {string} service - Service type ('content', 'video', 'audio')
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Model configuration
     */
    async getModelConfig(service, options = {}) {
        try {
            // Get environment-specific model configuration
            const modelConfig = await this.getEnvironmentModelConfig(service);
            
            // Check if we should use mock responses (development only)
            if (this.shouldUseMock(service)) {
                return {
                    ...modelConfig,
                    provider: 'mock',
                    reason: 'cost_limit_reached'
                };
            }
            
            return modelConfig;
            
        } catch (error) {
            console.error(`Failed to get model config for ${service}:`, error);
            return this.getDefaultModelConfig(service);
        }
    }

    /**
     * Get environment-specific model configuration
     * 
     * @param {string} service - Service type
     * @returns {Promise<Object>} Model configuration
     */
    async getEnvironmentModelConfig(service) {
        // Environment-specific configurations
        const environmentConfigs = {
            development: {
                content: {
                    provider: 'anthropic',
                    model: 'claude-3-haiku-20240307', // 12x cheaper than Sonnet
                    maxTokens: 4096,
                    temperature: 0.7,
                    costPerMToken: 0.25 // $0.25 per 1M tokens
                },
                audio: {
                    provider: 'polly',
                    engine: 'standard', // 7.5x cheaper than generative
                    voiceId: 'Joanna',
                    costPerMChar: 4.00 // $4 per 1M characters
                },
                video: {
                    provider: 'bedrock',
                    model: 'amazon.nova-reel-v1:0',
                    maxDuration: 5, // Limit video length for testing
                    costPerMinute: 0.80
                }
            },
            staging: {
                content: {
                    provider: 'anthropic',
                    model: 'claude-3-haiku-20240307', // Still cheap for staging
                    maxTokens: 4096,
                    temperature: 0.7,
                    costPerMToken: 0.25
                },
                audio: {
                    provider: 'polly',
                    engine: 'neural', // Mid-tier for staging
                    voiceId: 'Joanna',
                    costPerMChar: 16.00
                },
                video: {
                    provider: 'bedrock',
                    model: 'amazon.nova-reel-v1:0',
                    costPerMinute: 0.80
                }
            },
            production: {
                content: {
                    provider: 'anthropic',
                    model: 'claude-3-5-sonnet-20241022', // High quality for production
                    maxTokens: 4096,
                    temperature: 0.7,
                    costPerMToken: 3.00
                },
                audio: {
                    provider: 'polly',
                    engine: 'generative', // Best quality for production
                    voiceId: 'Ruth',
                    costPerMChar: 30.00
                },
                video: {
                    provider: 'bedrock',
                    model: 'amazon.nova-reel-v1:0',
                    costPerMinute: 0.80
                }
            }
        };

        // Get configuration for current environment
        const envConfig = environmentConfigs[this.environment] || environmentConfigs.production;
        return envConfig[service] || this.getDefaultModelConfig(service);
    }

    /**
     * Get default model configuration as fallback
     * 
     * @param {string} service - Service type
     * @returns {Object} Default model configuration
     */
    getDefaultModelConfig(service) {
        const defaults = {
            content: {
                provider: 'anthropic',
                model: 'claude-3-haiku-20240307',
                maxTokens: 4096,
                temperature: 0.7
            },
            audio: {
                provider: 'polly',
                engine: 'standard',
                voiceId: 'Joanna'
            },
            video: {
                provider: 'bedrock',
                model: 'amazon.nova-reel-v1:0'
            }
        };
        
        return defaults[service] || {};
    }

    /**
     * Track cost for a service call
     * 
     * @param {string} service - Service type
     * @param {number} cost - Cost of the operation
     * @param {Object} metadata - Additional metadata
     */
    async trackCost(service, cost, metadata = {}) {
        try {
            // Use the dedicated cost tracker
            const result = await this.costTracker.trackCost(service, cost, metadata);
            
            // Return the tracking result
            return result;
            
        } catch (error) {
            console.error('Failed to track cost:', error);
            return {
                success: false,
                error: error.message,
                dailySpend: this.getDailySpend()
            };
        }
    }

    /**
     * Check if we should use mock responses
     * 
     * @param {string} service - Service type
     * @returns {boolean} True if should use mock
     */
    shouldUseMock(service) {
        // Only use mocks in development environment
        if (this.environment !== 'development') {
            return false;
        }
        
        // Use mocks if daily spend exceeds critical threshold
        const status = this.costTracker.getSpendingStatus();
        return status === 'critical' || status === 'maximum';
    }

    /**
     * Get cached response if available
     * 
     * @param {string} cacheKey - Cache key
     * @returns {*} Cached response or null
     */
    getCachedResponse(cacheKey) {
        // Only use cache in development environment
        if (this.environment !== 'development') {
            return null;
        }
        
        const timestamp = this.cacheTimestamps.get(cacheKey);
        const cacheAge = Date.now() - (timestamp || 0);
        const cacheTTL = 3600000; // 1 hour for development
        
        if (timestamp && cacheAge < cacheTTL) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return this.cache.get(cacheKey);
        }
        
        return null;
    }

    /**
     * Cache response for future use
     * 
     * @param {string} cacheKey - Cache key
     * @param {*} response - Response to cache
     */
    setCachedResponse(cacheKey, response) {
        // Only cache in development environment
        if (this.environment !== 'development') {
            return;
        }
        
        this.cache.set(cacheKey, response);
        this.cacheTimestamps.set(cacheKey, Date.now());
        
    }

    /**
     * Generate cache key for request
     * 
     * @param {string} service - Service type
     * @param {Object} params - Request parameters
     * @returns {string} Cache key
     */
    generateCacheKey(service, params) {
        // Create a simple hash of the service and key parameters
        const keyData = {
            service,
            ...params
        };
        
        return `${service}_${JSON.stringify(keyData).replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    /**
     * Get current daily spend
     * 
     * @returns {number} Daily spend amount
     */
    getDailySpend() {
        return this.costTracker.getDailySpend();
    }

    /**
     * Reset daily spend (typically called at midnight)
     */
    resetDailySpend() {
        this.costTracker.resetDailySpend();
    }

    /**
     * Get detailed cost summary
     * 
     * @returns {Object} Comprehensive cost summary
     */
    getCostSummary() {
        return this.costTracker.getCostSummary();
    }

    /**
     * Get service spending breakdown
     * 
     * @returns {Object} Spending breakdown by service
     */
    getServiceBreakdown() {
        return this.costTracker.getServiceBreakdown();
    }

    /**
     * Get cost optimization recommendations
     * 
     * @returns {Array} Array of recommendations
     */
    getCostOptimizationRecommendations() {
        return this.costTracker.getRecommendations();
    }


}

module.exports = SimpleCostControls;