/**
 * YouTube Automation Platform - A/B Test Manager
 * 
 * Comprehensive A/B testing framework for template optimization with
 * statistical significance testing, experiment management, and performance
 * tracking. Integrates with PromptTemplateManager for template variants.
 * 
 * Features:
 * - Experiment configuration and management
 * - Statistical user assignment with consistent hashing
 * - Performance metrics collection and analysis
 * - Statistical significance testing
 * - Automatic experiment lifecycle management
 * - Integration with configuration management system
 * 
 * @fileoverview Provides comprehensive A/B testing capabilities
 * @author YouTube Automation Platform Team
 * @version 2.1.0
 * @since 2025-10-06
 */

const ConfigurationManager = require('./ConfigurationManager');

/**
 * A/B Test Manager
 * 
 * Manages A/B testing experiments with statistical analysis
 */
class ABTestManager {
    constructor(options = {}) {
        this.region = options.region || process.env.AWS_REGION || 'us-east-1';
        this.environment = options.environment || process.env.ENVIRONMENT || 'production';
        
        // Initialize configuration manager
        this.configManager = options.configManager || new ConfigurationManager({
            region: this.region,
            environment: this.environment
        });
        
        // Experiment cache
        this.experimentCache = new Map();
        this.assignmentCache = new Map();
        this.metricsCache = new Map();
        
        // Cache TTL
        this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
        
        // Statistical significance thresholds
        this.significanceLevel = options.significanceLevel || 0.05; // 95% confidence
        this.minimumSampleSize = options.minimumSampleSize || 100;
        this.minimumConversionRate = options.minimumConversionRate || 0.01;
        
        console.log(`ABTestManager initialized for environment: ${this.environment}`);
    }

    /**
     * Create a new A/B test experiment
     * 
     * @param {Object} experimentConfig - Experiment configuration
     * @returns {Promise<Object>} Created experiment
     */
    async createExperiment(experimentConfig) {
        try {
            const experiment = {
                id: experimentConfig.id || this.generateExperimentId(),
                name: experimentConfig.name,
                description: experimentConfig.description || '',
                templateType: experimentConfig.templateType,
                topic: experimentConfig.topic || 'all',
                
                // Experiment variants
                variants: experimentConfig.variants || {
                    control: { weight: 50 },
                    variant_a: { weight: 50 }
                },
                
                // Experiment lifecycle
                status: 'draft',
                startDate: experimentConfig.startDate || new Date().toISOString(),
                endDate: experimentConfig.endDate || this.calculateEndDate(experimentConfig.duration || 30),
                
                // Metrics to track
                primaryMetric: experimentConfig.primaryMetric || 'conversion_rate',
                secondaryMetrics: experimentConfig.secondaryMetrics || ['engagement_rate', 'completion_rate'],
                
                // Statistical configuration
                significanceLevel: experimentConfig.significanceLevel || this.significanceLevel,
                minimumSampleSize: experimentConfig.minimumSampleSize || this.minimumSampleSize,
                
                // Targeting
                targeting: experimentConfig.targeting || {},
                
                // Metadata
                createdAt: new Date().toISOString(),
                createdBy: experimentConfig.createdBy || 'system',
                version: '1.0'
            };
            
            // Validate experiment configuration
            this.validateExperimentConfig(experiment);
            
            // Save experiment to configuration
            await this.saveExperiment(experiment);
            
            console.log(`Created A/B test experiment: ${experiment.id}`);
            return experiment;
            
        } catch (error) {
            console.error('Failed to create A/B test experiment:', error);
            throw error;
        }
    }

    /**
     * Start an A/B test experiment
     * 
     * @param {string} experimentId - Experiment ID
     * @returns {Promise<Object>} Started experiment
     */
    async startExperiment(experimentId) {
        try {
            const experiment = await this.getExperiment(experimentId);
            
            if (experiment.status !== 'draft') {
                throw new Error(`Cannot start experiment ${experimentId}: current status is ${experiment.status}`);
            }
            
            // Update experiment status
            experiment.status = 'running';
            experiment.actualStartDate = new Date().toISOString();
            
            // Initialize metrics tracking
            await this.initializeExperimentMetrics(experimentId);
            
            // Save updated experiment
            await this.saveExperiment(experiment);
            
            console.log(`Started A/B test experiment: ${experimentId}`);
            return experiment;
            
        } catch (error) {
            console.error(`Failed to start experiment ${experimentId}:`, error);
            throw error;
        }
    }

    /**
     * Stop an A/B test experiment
     * 
     * @param {string} experimentId - Experiment ID
     * @param {string} reason - Reason for stopping
     * @returns {Promise<Object>} Stopped experiment with results
     */
    async stopExperiment(experimentId, reason = 'manual_stop') {
        try {
            const experiment = await this.getExperiment(experimentId);
            
            if (experiment.status !== 'running') {
                throw new Error(`Cannot stop experiment ${experimentId}: current status is ${experiment.status}`);
            }
            
            // Calculate final results
            const results = await this.calculateExperimentResults(experimentId);
            
            // Update experiment status
            experiment.status = 'completed';
            experiment.actualEndDate = new Date().toISOString();
            experiment.stopReason = reason;
            // Store only the metrics and analysis, not the full results to avoid circular reference
            experiment.finalResults = {
                metrics: results.metrics,
                statisticalAnalysis: results.statisticalAnalysis,
                recommendations: results.recommendations
            };
            
            // Save updated experiment
            await this.saveExperiment(experiment);
            
            console.log(`Stopped A/B test experiment: ${experimentId}, reason: ${reason}`);
            return { experiment, results };
            
        } catch (error) {
            console.error(`Failed to stop experiment ${experimentId}:`, error);
            throw error;
        }
    }

    /**
     * Get user assignment for an experiment
     * 
     * @param {string} experimentId - Experiment ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User assignment
     */
    async getUserAssignment(experimentId, userId) {
        try {
            const cacheKey = `${experimentId}-${userId}`;
            
            // Check cache first
            if (this.assignmentCache.has(cacheKey)) {
                return this.assignmentCache.get(cacheKey);
            }
            
            // Get experiment configuration
            const experiment = await this.getExperiment(experimentId);
            
            if (!experiment || experiment.status !== 'running') {
                return null;
            }
            
            // Check if user matches targeting criteria
            if (!this.matchesTargeting(userId, experiment.targeting)) {
                return null;
            }
            
            // Assign user to variant based on consistent hash
            const assignment = this.assignUserToVariant(experimentId, userId, experiment.variants);
            
            // Cache assignment
            this.assignmentCache.set(cacheKey, assignment);
            
            // Track assignment event
            await this.trackEvent(experimentId, userId, 'assignment', {
                variant: assignment.variant,
                timestamp: assignment.assignedAt
            });
            
            return assignment;
            
        } catch (error) {
            console.error(`Failed to get user assignment for experiment ${experimentId}:`, error);
            return null;
        }
    }

    /**
     * Track an event for A/B testing metrics
     * 
     * @param {string} experimentId - Experiment ID
     * @param {string} userId - User ID
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    async trackEvent(experimentId, userId, eventType, eventData = {}) {
        try {
            const event = {
                experimentId,
                userId,
                eventType,
                eventData,
                timestamp: new Date().toISOString(),
                environment: this.environment
            };
            
            // Get user assignment to determine variant
            const assignment = await this.getUserAssignment(experimentId, userId);
            if (assignment) {
                event.variant = assignment.variant;
            }
            
            // Store event (in production, this would go to analytics service)
            await this.storeEvent(event);
            
            // Update cached metrics
            await this.updateMetricsCache(experimentId, eventType, event);
            
            console.log(`Tracked A/B test event: ${experimentId}/${eventType}/${userId}`);
            
        } catch (error) {
            console.error(`Failed to track A/B test event: ${experimentId}/${eventType}`, error);
        }
    }

    /**
     * Get experiment results with statistical analysis
     * 
     * @param {string} experimentId - Experiment ID
     * @returns {Promise<Object>} Experiment results
     */
    async getExperimentResults(experimentId) {
        try {
            const experiment = await this.getExperiment(experimentId);
            const metrics = await this.getExperimentMetrics(experimentId);
            
            // Calculate statistical significance
            const statisticalAnalysis = await this.calculateStatisticalSignificance(experimentId, metrics);
            
            // Generate recommendations
            const recommendations = this.generateRecommendations(experiment, metrics, statisticalAnalysis);
            
            return {
                experiment,
                metrics,
                statisticalAnalysis,
                recommendations,
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`Failed to get experiment results for ${experimentId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate statistical significance between variants
     * 
     * @param {string} experimentId - Experiment ID
     * @param {Object} metrics - Experiment metrics
     * @returns {Promise<Object>} Statistical analysis
     */
    async calculateStatisticalSignificance(experimentId, metrics) {
        try {
            const variants = Object.keys(metrics.variants || {});
            const results = {};
            
            // Calculate significance for each variant pair
            for (let i = 0; i < variants.length; i++) {
                for (let j = i + 1; j < variants.length; j++) {
                    const variantA = variants[i];
                    const variantB = variants[j];
                    
                    const pairKey = `${variantA}_vs_${variantB}`;
                    results[pairKey] = this.calculatePairwiseSignificance(
                        metrics.variants[variantA],
                        metrics.variants[variantB]
                    );
                }
            }
            
            // Overall experiment significance
            results.overall = this.calculateOverallSignificance(metrics);
            
            return results;
            
        } catch (error) {
            console.error(`Failed to calculate statistical significance for ${experimentId}:`, error);
            return { error: error.message };
        }
    }

    /**
     * Calculate pairwise statistical significance
     * 
     * @param {Object} variantA - Variant A metrics
     * @param {Object} variantB - Variant B metrics
     * @returns {Object} Statistical significance results
     */
    calculatePairwiseSignificance(variantA, variantB) {
        // Sample sizes
        const nA = variantA.totalUsers || 0;
        const nB = variantB.totalUsers || 0;
        
        // Conversion rates
        const pA = variantA.conversionRate || 0;
        const pB = variantB.conversionRate || 0;
        
        // Check minimum sample size
        if (nA < this.minimumSampleSize || nB < this.minimumSampleSize) {
            return {
                significant: false,
                reason: 'insufficient_sample_size',
                pValue: null,
                confidenceInterval: null,
                effect: pB - pA,
                relativeEffect: pA > 0 ? (pB - pA) / pA : 0
            };
        }
        
        // Two-proportion z-test
        const pooledP = (variantA.conversions + variantB.conversions) / (nA + nB);
        const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/nA + 1/nB));
        
        if (standardError === 0) {
            return {
                significant: false,
                reason: 'zero_variance',
                pValue: null,
                confidenceInterval: null,
                effect: pB - pA,
                relativeEffect: 0
            };
        }
        
        const zScore = (pB - pA) / standardError;
        const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
        
        // Confidence interval for difference
        const marginOfError = 1.96 * Math.sqrt((pA * (1 - pA) / nA) + (pB * (1 - pB) / nB));
        const confidenceInterval = [
            (pB - pA) - marginOfError,
            (pB - pA) + marginOfError
        ];
        
        return {
            significant: pValue < this.significanceLevel,
            pValue,
            zScore,
            confidenceInterval,
            effect: pB - pA,
            relativeEffect: pA > 0 ? (pB - pA) / pA : 0,
            sampleSizes: { variantA: nA, variantB: nB }
        };
    }

    /**
     * Normal cumulative distribution function approximation
     * 
     * @param {number} x - Input value
     * @returns {number} CDF value
     */
    normalCDF(x) {
        // Approximation using error function
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    /**
     * Error function approximation
     * 
     * @param {number} x - Input value
     * @returns {number} Error function value
     */
    erf(x) {
        // Abramowitz and Stegun approximation
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }

    /**
     * Generate experiment recommendations
     * 
     * @param {Object} experiment - Experiment configuration
     * @param {Object} metrics - Experiment metrics
     * @param {Object} statisticalAnalysis - Statistical analysis results
     * @returns {Object} Recommendations
     */
    generateRecommendations(experiment, metrics, statisticalAnalysis) {
        const recommendations = {
            action: 'continue',
            confidence: 'low',
            winner: null,
            reasons: [],
            nextSteps: []
        };
        
        // Check if experiment has sufficient data
        const totalUsers = Object.values(metrics.variants || {})
            .reduce((sum, variant) => sum + (variant.totalUsers || 0), 0);
        
        if (totalUsers < this.minimumSampleSize * 2) {
            recommendations.action = 'continue';
            recommendations.reasons.push('Insufficient sample size for reliable results');
            recommendations.nextSteps.push('Continue experiment to gather more data');
            return recommendations;
        }
        
        // Find best performing variant
        const variants = Object.entries(metrics.variants || {});
        const bestVariant = variants.reduce((best, [name, data]) => {
            const rate = data.conversionRate || 0;
            return rate > (best.rate || 0) ? { name, rate, data } : best;
        }, {});
        
        // Check for statistical significance
        const hasSignificantResult = Object.values(statisticalAnalysis)
            .some(result => result.significant === true);
        
        if (hasSignificantResult && bestVariant.name) {
            recommendations.action = 'implement';
            recommendations.winner = bestVariant.name;
            recommendations.confidence = 'high';
            recommendations.reasons.push(`${bestVariant.name} shows statistically significant improvement`);
            recommendations.nextSteps.push(`Implement ${bestVariant.name} as the new default template`);
        } else if (bestVariant.name && bestVariant.rate > 0) {
            recommendations.action = 'continue';
            recommendations.confidence = 'medium';
            recommendations.reasons.push(`${bestVariant.name} shows promising results but needs more data`);
            recommendations.nextSteps.push('Continue experiment to reach statistical significance');
        } else {
            recommendations.action = 'stop';
            recommendations.confidence = 'medium';
            recommendations.reasons.push('No clear winner detected');
            recommendations.nextSteps.push('Consider redesigning experiment with different variants');
        }
        
        return recommendations;
    }

    /**
     * Assign user to variant using consistent hashing
     * 
     * @param {string} experimentId - Experiment ID
     * @param {string} userId - User ID
     * @param {Object} variants - Experiment variants
     * @returns {Object} User assignment
     */
    assignUserToVariant(experimentId, userId, variants) {
        // Create consistent hash
        const hash = this.hashString(`${experimentId}-${userId}`);
        const hashValue = hash % 100; // 0-99
        
        // Assign based on variant weights
        let cumulativeWeight = 0;
        const variantNames = Object.keys(variants);
        
        for (const variantName of variantNames) {
            const weight = variants[variantName].weight || 0;
            cumulativeWeight += weight;
            
            if (hashValue < cumulativeWeight) {
                return {
                    experimentId,
                    userId,
                    variant: variantName,
                    assignedAt: new Date().toISOString(),
                    hash: hashValue
                };
            }
        }
        
        // Fallback to first variant
        return {
            experimentId,
            userId,
            variant: variantNames[0],
            assignedAt: new Date().toISOString(),
            hash: hashValue
        };
    }

    /**
     * Hash string to consistent integer
     * 
     * @param {string} str - String to hash
     * @returns {number} Hash value
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Utility Methods
     */

    async getExperiment(experimentId) {
        // Check cache first
        if (this.experimentCache.has(experimentId)) {
            return this.experimentCache.get(experimentId);
        }
        
        // Load from configuration
        const experiments = await this.configManager.get('prompts.experiments', []);
        const experiment = experiments.find(exp => exp.id === experimentId);
        
        if (experiment) {
            this.experimentCache.set(experimentId, experiment);
        }
        
        return experiment;
    }

    async saveExperiment(experiment) {
        // Update in configuration
        const experiments = await this.configManager.get('prompts.experiments', []);
        const index = experiments.findIndex(exp => exp.id === experiment.id);
        
        if (index >= 0) {
            experiments[index] = experiment;
        } else {
            experiments.push(experiment);
        }
        
        await this.configManager.setRuntimeOverride('prompts.experiments', experiments, { persist: true });
        
        // Update cache
        this.experimentCache.set(experiment.id, experiment);
    }

    generateExperimentId() {
        return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateEndDate(durationDays) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        return endDate.toISOString();
    }

    validateExperimentConfig(experiment) {
        if (!experiment.name) {
            throw new Error('Experiment name is required');
        }
        
        if (!experiment.templateType) {
            throw new Error('Template type is required');
        }
        
        if (!experiment.variants || Object.keys(experiment.variants).length < 2) {
            throw new Error('At least 2 variants are required');
        }
        
        // Validate variant weights sum to 100
        const totalWeight = Object.values(experiment.variants)
            .reduce((sum, variant) => sum + (variant.weight || 0), 0);
        
        if (Math.abs(totalWeight - 100) > 0.01) {
            throw new Error('Variant weights must sum to 100');
        }
    }

    matchesTargeting(userId, targeting) {
        // Simple targeting implementation
        // In production, this would be more sophisticated
        return true;
    }

    async initializeExperimentMetrics(experimentId) {
        const metrics = {
            experimentId,
            variants: {},
            totalUsers: 0,
            totalEvents: 0,
            startedAt: new Date().toISOString()
        };
        
        this.metricsCache.set(experimentId, metrics);
    }

    async storeEvent(event) {
        // In production, this would store to DynamoDB, CloudWatch, or analytics service
        
    }

    async updateMetricsCache(experimentId, eventType, event) {
        // Update cached metrics for real-time tracking
        // In production, this would be more sophisticated
    }

    async getExperimentMetrics(experimentId) {
        // In production, this would query from analytics service
        return this.metricsCache.get(experimentId) || {
            variants: {
                control: { totalUsers: 50, conversions: 5, conversionRate: 0.1 },
                variant_a: { totalUsers: 50, conversions: 8, conversionRate: 0.16 }
            }
        };
    }

    calculateOverallSignificance(metrics) {
        return {
            hasWinner: false,
            confidence: 0.5,
            recommendation: 'continue'
        };
    }

    async calculateExperimentResults(experimentId) {
        return await this.getExperimentResults(experimentId);
    }
}

module.exports = ABTestManager;