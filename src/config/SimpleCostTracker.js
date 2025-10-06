/**
 * YouTube Automation Platform - Simple Cost Tracker
 * 
 * Dedicated cost tracking class to monitor daily testing spend and provide
 * warnings when development costs exceed safe limits.
 * 
 * @fileoverview Simple cost tracking with daily spend monitoring
 * @author YouTube Automation Platform Team
 * @version 1.0.0
 * @since 2025-01-06
 */

/**
 * Simple Cost Tracker
 * 
 * Monitors daily spending across all AI services and provides warnings
 * when costs exceed predefined thresholds.
 */
class SimpleCostTracker {
    constructor(configManager, options = {}) {
        this.config = configManager;
        this.environment = configManager.environment;
        this.dailySpend = 0;
        this.serviceSpend = new Map(); // Track spending per service
        this.costHistory = new Map(); // Track historical costs
        
        // Cost thresholds
        this.thresholds = {
            development: {
                warning: options.warningThreshold || 1.00,
                critical: options.criticalThreshold || 2.00,
                maximum: options.maximumThreshold || 5.00
            },
            staging: {
                warning: options.warningThreshold || 5.00,
                critical: options.criticalThreshold || 10.00,
                maximum: options.maximumThreshold || 20.00
            },
            production: {
                warning: options.warningThreshold || 50.00,
                critical: options.criticalThreshold || 100.00,
                maximum: options.maximumThreshold || 200.00
            }
        };
        
        // Alert tracking to prevent spam
        this.alertsSent = new Set();
        
        console.log(`SimpleCostTracker initialized for ${this.environment} environment`);
        console.log(`Cost thresholds: Warning=$${this.getCurrentThresholds().warning}, Critical=$${this.getCurrentThresholds().critical}`);
    }

    /**
     * Track cost for a service operation
     * 
     * @param {string} service - Service name ('content', 'video', 'audio')
     * @param {number} cost - Cost amount in USD
     * @param {Object} metadata - Additional metadata about the operation
     * @returns {Promise<Object>} Cost tracking result
     */
    async trackCost(service, cost, metadata = {}) {
        try {
            // Validate inputs
            if (typeof cost !== 'number' || cost < 0) {
                throw new Error(`Invalid cost value: ${cost}. Must be a positive number.`);
            }
            
            // Update spending totals
            this.dailySpend += cost;
            const currentServiceSpend = this.serviceSpend.get(service) || 0;
            this.serviceSpend.set(service, currentServiceSpend + cost);
            
            // Create cost entry
            const costEntry = {
                service,
                cost,
                timestamp: new Date().toISOString(),
                dailyTotal: this.dailySpend,
                serviceTotal: this.serviceSpend.get(service),
                environment: this.environment,
                metadata
            };
            
            // Log cost information
            this.logCostInformation(costEntry);
            
            // Check thresholds and send alerts if needed
            const alertResult = await this.checkThresholds(costEntry);
            
            // Persist cost data
            await this.persistCostData(costEntry);
            
            // Return tracking result
            return {
                success: true,
                costEntry,
                dailySpend: this.dailySpend,
                serviceSpend: this.serviceSpend.get(service),
                thresholdStatus: alertResult.status,
                recommendations: alertResult.recommendations
            };
            
        } catch (error) {
            console.error('Failed to track cost:', error);
            return {
                success: false,
                error: error.message,
                dailySpend: this.dailySpend
            };
        }
    }

    /**
     * Log cost information with appropriate detail level
     * 
     * @param {Object} costEntry - Cost entry to log
     */
    logCostInformation(costEntry) {
        const { service, cost, dailyTotal, serviceTotal } = costEntry;
        
        // Basic cost logging
        console.log(`💰 Cost tracked: ${service} = $${cost.toFixed(4)} | Daily total: $${dailyTotal.toFixed(2)} | Service total: $${serviceTotal.toFixed(2)}`);
        
        // Enhanced logging for development environment
        if (this.environment === 'development') {
            const thresholds = this.getCurrentThresholds();
            const percentOfWarning = (dailyTotal / thresholds.warning) * 100;
            const percentOfCritical = (dailyTotal / thresholds.critical) * 100;
            
            console.log(`📊 Development spend: ${percentOfWarning.toFixed(1)}% of warning threshold, ${percentOfCritical.toFixed(1)}% of critical threshold`);
        }
        
        // Log metadata if provided
        if (costEntry.metadata && Object.keys(costEntry.metadata).length > 0) {
            console.log(`📋 Metadata:`, JSON.stringify(costEntry.metadata, null, 2));
        }
    }

    /**
     * Check cost thresholds and generate alerts
     * 
     * @param {Object} costEntry - Cost entry to check
     * @returns {Promise<Object>} Alert result
     */
    async checkThresholds(costEntry) {
        const thresholds = this.getCurrentThresholds();
        const { dailyTotal } = costEntry;
        const recommendations = [];
        let status = 'normal';
        
        // Check warning threshold
        if (dailyTotal >= thresholds.warning && dailyTotal < thresholds.critical) {
            status = 'warning';
            const alertKey = `warning_${this.getToday()}`;
            
            if (!this.alertsSent.has(alertKey)) {
                console.warn(`⚠️  WARNING: Daily costs reached $${dailyTotal.toFixed(2)} (${thresholds.warning} threshold exceeded)`);
                recommendations.push({
                    type: 'warning',
                    message: `Daily costs at $${dailyTotal.toFixed(2)}. Consider using cached responses or reducing test frequency.`,
                    action: 'Enable aggressive caching and reduce API calls'
                });
                this.alertsSent.add(alertKey);
            }
        }
        
        // Check critical threshold
        if (dailyTotal >= thresholds.critical && dailyTotal < thresholds.maximum) {
            status = 'critical';
            const alertKey = `critical_${this.getToday()}`;
            
            if (!this.alertsSent.has(alertKey)) {
                console.error(`🚨 CRITICAL: Daily costs reached $${dailyTotal.toFixed(2)} (${thresholds.critical} threshold exceeded)`);
                console.error(`💡 Recommendation: Switch to mock responses or pause testing until tomorrow`);
                
                recommendations.push({
                    type: 'critical',
                    message: `Daily costs exceeded $${thresholds.critical}. Switching to mock responses recommended.`,
                    action: 'Use mock responses for remaining tests today'
                });
                this.alertsSent.add(alertKey);
            }
        }
        
        // Check maximum threshold
        if (dailyTotal >= thresholds.maximum) {
            status = 'maximum';
            const alertKey = `maximum_${this.getToday()}`;
            
            if (!this.alertsSent.has(alertKey)) {
                console.error(`🛑 MAXIMUM EXCEEDED: Daily costs reached $${dailyTotal.toFixed(2)} (${thresholds.maximum} limit exceeded)`);
                console.error(`🚫 All API calls should be blocked until tomorrow`);
                
                recommendations.push({
                    type: 'maximum',
                    message: `Daily costs exceeded maximum limit of $${thresholds.maximum}. All API calls should be blocked.`,
                    action: 'Block all API calls until daily reset'
                });
                this.alertsSent.add(alertKey);
            }
        }
        
        return { status, recommendations };
    }

    /**
     * Get current cost thresholds for environment
     * 
     * @returns {Object} Threshold configuration
     */
    getCurrentThresholds() {
        return this.thresholds[this.environment] || this.thresholds.development;
    }

    /**
     * Get current daily spend
     * 
     * @returns {number} Daily spend amount
     */
    getDailySpend() {
        return this.dailySpend;
    }

    /**
     * Get spending breakdown by service
     * 
     * @returns {Object} Service spending breakdown
     */
    getServiceBreakdown() {
        const breakdown = {};
        for (const [service, amount] of this.serviceSpend.entries()) {
            breakdown[service] = {
                amount: amount,
                percentage: this.dailySpend > 0 ? (amount / this.dailySpend) * 100 : 0
            };
        }
        return breakdown;
    }

    /**
     * Get cost summary for reporting
     * 
     * @returns {Object} Cost summary
     */
    getCostSummary() {
        const thresholds = this.getCurrentThresholds();
        const breakdown = this.getServiceBreakdown();
        
        return {
            environment: this.environment,
            dailySpend: this.dailySpend,
            thresholds,
            serviceBreakdown: breakdown,
            status: this.getSpendingStatus(),
            recommendations: this.getRecommendations(),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Get current spending status
     * 
     * @returns {string} Status ('normal', 'warning', 'critical', 'maximum')
     */
    getSpendingStatus() {
        const thresholds = this.getCurrentThresholds();
        
        if (this.dailySpend >= thresholds.maximum) return 'maximum';
        if (this.dailySpend >= thresholds.critical) return 'critical';
        if (this.dailySpend >= thresholds.warning) return 'warning';
        return 'normal';
    }

    /**
     * Get cost optimization recommendations
     * 
     * @returns {Array} Array of recommendations
     */
    getRecommendations() {
        const recommendations = [];
        const thresholds = this.getCurrentThresholds();
        const status = this.getSpendingStatus();
        
        if (status === 'warning') {
            recommendations.push({
                type: 'optimization',
                message: 'Consider enabling aggressive caching to reduce API calls',
                priority: 'medium'
            });
        }
        
        if (status === 'critical') {
            recommendations.push({
                type: 'fallback',
                message: 'Switch to mock responses for remaining tests today',
                priority: 'high'
            });
        }
        
        if (status === 'maximum') {
            recommendations.push({
                type: 'block',
                message: 'Block all API calls until daily reset',
                priority: 'critical'
            });
        }
        
        // Environment-specific recommendations
        if (this.environment === 'development' && this.dailySpend > 0.50) {
            recommendations.push({
                type: 'environment',
                message: 'Ensure you are using development-optimized models (Claude Haiku, Standard Polly)',
                priority: 'low'
            });
        }
        
        return recommendations;
    }

    /**
     * Reset daily spending (typically called at midnight)
     */
    resetDailySpend() {
        const previousSpend = this.dailySpend;
        
        console.log(`🔄 Resetting daily spend from $${previousSpend.toFixed(2)} to $0.00`);
        
        // Store previous day's data
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];
        
        this.costHistory.set(yesterdayKey, {
            totalSpend: previousSpend,
            serviceBreakdown: Object.fromEntries(this.serviceSpend),
            environment: this.environment
        });
        
        // Reset counters
        this.dailySpend = 0;
        this.serviceSpend.clear();
        this.alertsSent.clear();
        
        console.log(`📊 Previous day spend archived: $${previousSpend.toFixed(2)}`);
    }

    /**
     * Get today's date string
     * 
     * @returns {string} Today's date in YYYY-MM-DD format
     */
    getToday() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Persist cost data for reporting
     * 
     * @param {Object} costEntry - Cost entry to persist
     */
    async persistCostData(costEntry) {
        try {
            const today = this.getToday();
            const costKey = `cost.tracking.${today}.total`;
            const serviceKey = `cost.tracking.${today}.${costEntry.service}`;
            
            // Store total daily spend
            await this.config.setRuntimeOverride(costKey, this.dailySpend, { persist: true });
            
            // Store service-specific spend
            const serviceTotal = this.serviceSpend.get(costEntry.service);
            await this.config.setRuntimeOverride(serviceKey, serviceTotal, { persist: true });
            
        } catch (error) {
            // Don't fail the main operation if persistence fails
            console.warn('Failed to persist cost data:', error.message);
        }
    }

    /**
     * Load historical cost data
     * 
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object>} Historical cost data
     */
    async loadHistoricalData(date) {
        try {
            const totalKey = `cost.tracking.${date}.total`;
            const total = await this.config.get(totalKey, 0);
            
            const services = ['content', 'video', 'audio'];
            const serviceData = {};
            
            for (const service of services) {
                const serviceKey = `cost.tracking.${date}.${service}`;
                serviceData[service] = await this.config.get(serviceKey, 0);
            }
            
            return {
                date,
                total,
                services: serviceData,
                environment: this.environment
            };
            
        } catch (error) {
            console.warn(`Failed to load historical data for ${date}:`, error.message);
            return { date, total: 0, services: {}, environment: this.environment };
        }
    }
}

module.exports = SimpleCostTracker;