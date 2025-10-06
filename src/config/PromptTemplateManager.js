/**
 * YouTube Automation Platform - Prompt Template Manager
 * 
 * Manages dynamic prompt templates with S3-based storage, versioning,
 * A/B testing, and topic-specific customization. Integrates with the
 * configuration management system for runtime template updates.
 * 
 * Features:
 * - S3-based template storage with versioning
 * - Dynamic variable substitution
 * - Topic-specific template selection
 * - A/B testing framework for template optimization
 * - Template performance tracking
 * - Runtime template updates without deployment
 * 
 * @fileoverview Provides comprehensive prompt template management
 * @author YouTube Automation Platform Team
 * @version 2.1.0
 * @since 2025-10-06
 */

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectVersionsCommand } = require('@aws-sdk/client-s3');
const ConfigurationManager = require('./ConfigurationManager');
const ABTestManager = require('./ABTestManager');

/**
 * Prompt Template Manager
 * 
 * Manages prompt templates with S3 storage, versioning, and A/B testing
 */
class PromptTemplateManager {
    constructor(options = {}) {
        this.region = options.region || process.env.AWS_REGION || 'us-east-1';
        this.environment = options.environment || process.env.ENVIRONMENT || 'production';
        this.bucket = options.bucket || process.env.PROMPT_TEMPLATE_BUCKET || 'youtube-automation-prompts';
        
        // Initialize AWS S3 client
        this.s3Client = new S3Client({ region: this.region });
        
        // Initialize configuration manager
        this.configManager = options.configManager || new ConfigurationManager({
            region: this.region,
            environment: this.environment
        });
        
        // Initialize A/B test manager
        this.abTestManager = options.abTestManager || new ABTestManager({
            region: this.region,
            environment: this.environment,
            configManager: this.configManager
        });
        
        // Template cache
        this.templateCache = new Map();
        this.cacheTimestamps = new Map();
        this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
        
        console.log(`PromptTemplateManager initialized for environment: ${this.environment}, bucket: ${this.bucket}`);
    }

    /**
     * Load template with versioning support
     * 
     * @param {string} templateType - Template type ('script', 'title', 'description', 'video_prompt')
     * @param {string} topic - Content topic ('investing', 'education', 'tourism', 'technology')
     * @param {string} version - Template version ('latest', 'v1.0', etc.)
     * @returns {Promise<Object>} Template configuration
     */
    async loadTemplate(templateType, topic, version = 'latest') {
        try {
            const cacheKey = `${templateType}-${topic}-${version}`;
            
            // Check cache first
            if (this.isCacheValid(cacheKey)) {
                console.log(`Template cache hit for: ${cacheKey}`);
                return this.templateCache.get(cacheKey);
            }

            // Load template from S3
            const template = await this.loadTemplateFromS3(templateType, topic, version);
            
            // Cache the template
            this.templateCache.set(cacheKey, template);
            this.cacheTimestamps.set(cacheKey, Date.now());
            
            console.log(`Loaded template: ${templateType}/${topic}/${version}`);
            return template;
            
        } catch (error) {
            console.error(`Failed to load template: ${templateType}/${topic}/${version}`, error);
            
            // Fallback to default template
            return await this.getDefaultTemplate(templateType, topic);
        }
    }

    /**
     * Load template from S3 with version support
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {string} version - Template version
     * @returns {Promise<Object>} Template data
     */
    async loadTemplateFromS3(templateType, topic, version) {
        const key = this.buildTemplateKey(templateType, topic, version);
        
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            VersionId: version !== 'latest' ? await this.getVersionId(key, version) : undefined
        });
        
        const response = await this.s3Client.send(command);
        const templateData = JSON.parse(await response.Body.transformToString());
        
        // Add metadata
        templateData.metadata = {
            templateType,
            topic,
            version,
            loadedAt: new Date().toISOString(),
            s3Key: key,
            versionId: response.VersionId
        };
        
        return templateData;
    }

    /**
     * Render template with dynamic variable substitution
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {Object} variables - Template variables
     * @param {Object} options - Rendering options
     * @returns {Promise<string>} Rendered template
     */
    async renderTemplate(templateType, topic, variables = {}, options = {}) {
        try {
            // Get template variant (for A/B testing)
            const template = await this.getTemplateVariant(templateType, topic, options.userId);
            
            // Merge variables with topic-specific defaults
            const mergedVariables = await this.mergeVariables(topic, variables);
            
            // Render template with variable substitution
            const rendered = this.substituteVariables(template.content, mergedVariables);
            
            // Track template usage for analytics
            await this.trackTemplateUsage(templateType, topic, template.variant, options.userId);
            
            console.log(`Rendered template: ${templateType}/${topic}/${template.variant}`);
            return rendered;
            
        } catch (error) {
            console.error(`Failed to render template: ${templateType}/${topic}`, error);
            
            // Fallback to simple template
            return await this.renderFallbackTemplate(templateType, variables);
        }
    }

    /**
     * Get template variant for A/B testing
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {string} userId - User ID for consistent assignment
     * @returns {Promise<Object>} Template variant
     */
    async getTemplateVariant(templateType, topic, userId = null) {
        // Check if A/B testing is enabled
        const abTestingEnabled = await this.configManager.get('features.enableABTesting', true);
        if (!abTestingEnabled || !userId) {
            // Return control template
            const template = await this.loadTemplate(templateType, topic);
            return {
                content: template.template || template.content,
                variant: 'control',
                experiment: null
            };
        }

        // Get active experiments for this template
        const experiments = await this.getActiveExperiments(templateType, topic);
        if (experiments.length === 0) {
            const template = await this.loadTemplate(templateType, topic);
            return {
                content: template.template || template.content,
                variant: 'control',
                experiment: null
            };
        }

        // Get user assignment for experiments using ABTestManager
        for (const experiment of experiments) {
            const assignment = await this.abTestManager.getUserAssignment(experiment.id, userId);
            if (assignment) {
                const template = await this.loadTemplate(templateType, topic, assignment.variant);
                return {
                    content: template.variants?.[assignment.variant] || template.template || template.content,
                    variant: assignment.variant,
                    experiment: experiment.id
                };
            }
        }

        // Default to control
        const template = await this.loadTemplate(templateType, topic);
        return {
            content: template.template || template.content,
            variant: 'control',
            experiment: null
        };
    }

    /**
     * Substitute variables in template content
     * 
     * @param {string} template - Template string
     * @param {Object} variables - Variables to substitute
     * @returns {string} Rendered template
     */
    substituteVariables(template, variables) {
        let rendered = template;
        
        // Replace {variable} placeholders
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`\\{${key}\\}`, 'g');
            rendered = rendered.replace(placeholder, String(value));
        }
        
        // Handle conditional blocks {if:condition}content{/if}
        rendered = this.processConditionals(rendered, variables);
        
        // Handle loops {for:items}template{/for}
        rendered = this.processLoops(rendered, variables);
        
        return rendered;
    }

    /**
     * Process conditional blocks in templates
     * 
     * @param {string} template - Template string
     * @param {Object} variables - Template variables
     * @returns {string} Processed template
     */
    processConditionals(template, variables) {
        const conditionalRegex = /\{if:(\w+)\}(.*?)\{\/if\}/gs;
        
        return template.replace(conditionalRegex, (match, condition, content) => {
            const value = variables[condition];
            return value ? content : '';
        });
    }

    /**
     * Process loop blocks in templates
     * 
     * @param {string} template - Template string
     * @param {Object} variables - Template variables
     * @returns {string} Processed template
     */
    processLoops(template, variables) {
        const loopRegex = /\{for:(\w+)\}(.*?)\{\/for\}/gs;
        
        return template.replace(loopRegex, (match, arrayName, content) => {
            const array = variables[arrayName];
            if (!Array.isArray(array)) return '';
            
            return array.map((item, index) => {
                let itemContent = content;
                
                // Replace {item} with current item
                itemContent = itemContent.replace(/\{item\}/g, String(item));
                
                // Replace {index} with current index
                itemContent = itemContent.replace(/\{index\}/g, String(index));
                
                // If item is object, replace {item.property}
                if (typeof item === 'object') {
                    for (const [key, value] of Object.entries(item)) {
                        const placeholder = new RegExp(`\\{item\\.${key}\\}`, 'g');
                        itemContent = itemContent.replace(placeholder, String(value));
                    }
                }
                
                return itemContent;
            }).join('');
        });
    }

    /**
     * Merge variables with topic-specific defaults
     * 
     * @param {string} topic - Content topic
     * @param {Object} variables - User-provided variables
     * @returns {Promise<Object>} Merged variables
     */
    async mergeVariables(topic, variables) {
        // Load topic-specific variable defaults
        const topicDefaults = await this.configManager.get(`prompts.variables.${topic}`, {});
        
        // Load global variable defaults
        const globalDefaults = await this.configManager.get('prompts.variables.global', {
            duration: 8,
            quality: 'high',
            style: 'professional',
            audience: 'general'
        });
        
        // Merge in priority order: user variables > topic defaults > global defaults
        return {
            ...globalDefaults,
            ...topicDefaults,
            ...variables,
            // Add computed variables
            timestamp: new Date().toISOString(),
            topic: topic
        };
    }

    /**
     * Save template to S3 with versioning
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {Object} templateData - Template data
     * @param {Object} options - Save options
     * @returns {Promise<Object>} Save result
     */
    async saveTemplate(templateType, topic, templateData, options = {}) {
        try {
            const key = this.buildTemplateKey(templateType, topic, 'latest');
            
            // Add metadata
            const enrichedData = {
                ...templateData,
                metadata: {
                    templateType,
                    topic,
                    version: options.version || 'latest',
                    createdAt: new Date().toISOString(),
                    createdBy: options.createdBy || 'system',
                    description: options.description || `Template for ${templateType}/${topic}`
                }
            };
            
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: JSON.stringify(enrichedData, null, 2),
                ContentType: 'application/json',
                Metadata: {
                    templateType,
                    topic,
                    version: options.version || 'latest'
                }
            });
            
            const response = await this.s3Client.send(command);
            
            // Invalidate cache
            this.invalidateTemplateCache(templateType, topic);
            
            console.log(`Saved template: ${templateType}/${topic} (version: ${response.VersionId})`);
            
            return {
                success: true,
                key,
                versionId: response.VersionId,
                etag: response.ETag
            };
            
        } catch (error) {
            console.error(`Failed to save template: ${templateType}/${topic}`, error);
            throw error;
        }
    }

    /**
     * Get active A/B testing experiments
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @returns {Promise<Array>} Active experiments
     */
    async getActiveExperiments(templateType, topic) {
        try {
            const experiments = await this.configManager.get('prompts.experiments', []);
            
            return experiments.filter(experiment => 
                experiment.active &&
                experiment.templateType === templateType &&
                (experiment.topic === topic || experiment.topic === 'all') &&
                new Date(experiment.endDate) > new Date()
            );
            
        } catch (error) {
            console.error('Failed to load active experiments', error);
            return [];
        }
    }



    /**
     * Track template usage for analytics and A/B testing
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {string} variant - Template variant
     * @param {string} userId - User ID
     * @param {string} experimentId - Experiment ID (optional)
     */
    async trackTemplateUsage(templateType, topic, variant, userId, experimentId = null) {
        try {
            // Basic usage tracking
            const usage = {
                templateType,
                topic,
                variant,
                userId,
                experimentId,
                timestamp: new Date().toISOString(),
                environment: this.environment
            };
            
            console.log('Template usage tracked:', JSON.stringify(usage));
            
            // Track A/B test event if experiment is active
            if (experimentId && userId) {
                await this.abTestManager.trackEvent(experimentId, userId, 'template_usage', {
                    templateType,
                    topic,
                    variant,
                    timestamp: usage.timestamp
                });
            }
            
        } catch (error) {
            console.error('Failed to track template usage', error);
        }
    }

    /**
     * Track template conversion event (e.g., video completion, engagement)
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {string} variant - Template variant
     * @param {string} userId - User ID
     * @param {string} conversionType - Type of conversion
     * @param {Object} conversionData - Additional conversion data
     */
    async trackTemplateConversion(templateType, topic, variant, userId, conversionType, conversionData = {}) {
        try {
            // Get active experiments for this template
            const experiments = await this.getActiveExperiments(templateType, topic);
            
            for (const experiment of experiments) {
                const assignment = await this.abTestManager.getUserAssignment(experiment.id, userId);
                if (assignment && assignment.variant === variant) {
                    await this.abTestManager.trackEvent(experiment.id, userId, 'conversion', {
                        templateType,
                        topic,
                        variant,
                        conversionType,
                        conversionData,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
        } catch (error) {
            console.error('Failed to track template conversion', error);
        }
    }

    /**
     * Get default template for fallback
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @returns {Promise<Object>} Default template
     */
    async getDefaultTemplate(templateType, topic) {
        const defaults = {
            script: {
                template: 'Create an engaging {duration}-second video about {topic}. Focus on {keywords} and provide valuable insights for {audience}.',
                variables: { duration: 8, audience: 'general' }
            },
            title: {
                template: '{number} Essential {topic} Tips You Need to Know',
                variables: { number: 5 }
            },
            description: {
                template: 'Learn about {topic} in this comprehensive guide. We cover {keywords} and provide actionable advice for {audience}.',
                variables: { audience: 'beginners' }
            },
            video_prompt: {
                template: 'Create a professional {duration}-second video about {topic} with {style} visuals and {quality} production value.',
                variables: { style: 'modern', quality: 'high' }
            }
        };
        
        return defaults[templateType] || {
            template: 'Default template for {topic}',
            variables: {}
        };
    }

    /**
     * Utility Methods
     */

    buildTemplateKey(templateType, topic, version) {
        return `${this.environment}/templates/${templateType}/${topic}/${version}.json`;
    }

    async getVersionId(key, version) {
        try {
            const command = new ListObjectVersionsCommand({
                Bucket: this.bucket,
                Prefix: key
            });
            
            const response = await this.s3Client.send(command);
            const versionObj = response.Versions?.find(v => v.Key === key && v.VersionId === version);
            
            return versionObj?.VersionId;
        } catch (error) {
            
            return null;
        }
    }

    isCacheValid(key) {
        const timestamp = this.cacheTimestamps.get(key);
        return timestamp && (Date.now() - timestamp) < this.cacheTTL;
    }

    invalidateTemplateCache(templateType, topic) {
        // Remove all cached versions for this template
        for (const [key] of this.templateCache) {
            if (key.startsWith(`${templateType}-${topic}-`)) {
                this.templateCache.delete(key);
                this.cacheTimestamps.delete(key);
            }
        }
    }



    /**
     * Get template performance metrics
     * 
     * @param {string} templateType - Template type
     * @param {string} topic - Content topic
     * @param {string} timeframe - Timeframe ('24h', '7d', '30d')
     * @returns {Promise<Object>} Performance metrics
     */
    async getTemplatePerformance(templateType, topic, timeframe = '7d') {
        // This would integrate with your analytics system
        // For now, return mock data
        return {
            templateType,
            topic,
            timeframe,
            metrics: {
                usageCount: 0,
                successRate: 0,
                averageEngagement: 0,
                variants: {}
            }
        };
    }
}

module.exports = PromptTemplateManager;