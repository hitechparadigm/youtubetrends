/**
 * YouTube Automation Platform - Configuration Manager
 * 
 * Centralized configuration management system that provides hierarchical
 * configuration loading with runtime updates, caching, and validation.
 * 
 * Configuration Priority (highest to lowest):
 * 1. Runtime Overrides (API-based changes)
 * 2. AWS Parameter Store (encrypted configuration)
 * 3. AWS Secrets Manager (sensitive data)
 * 4. S3 Configuration Files (complex configurations)
 * 5. Environment Variables (container/Lambda level)
 * 6. Default Values (fallback values in code)
 * 
 * @fileoverview Provides unified configuration access across all system components
 * @author YouTube Automation Platform Team
 * @version 2.0.0
 * @since 2025-01-06
 */

const { SSMClient, GetParameterCommand, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Centralized Configuration Manager
 * 
 * Manages configuration loading from multiple sources with caching,
 * validation, and runtime updates.
 */
class ConfigurationManager {
    constructor(options = {}) {
        this.region = options.region || process.env.AWS_REGION || 'us-east-1';
        this.environment = options.environment || process.env.ENVIRONMENT || 'production';
        this.cacheEnabled = options.cacheEnabled !== false;
        this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
        
        // Initialize AWS clients
        this.ssmClient = new SSMClient({ region: this.region });
        this.secretsClient = new SecretsManagerClient({ region: this.region });
        this.s3Client = new S3Client({ region: this.region });
        
        // Configuration cache
        this.cache = new Map();
        this.cacheTimestamps = new Map();
        
        // Runtime overrides
        this.runtimeOverrides = new Map();
        
        // Configuration change listeners
        this.changeListeners = new Map();
        
        console.log(`ConfigurationManager initialized for environment: ${this.environment}, region: ${this.region}`);
    }

    /**
     * Get configuration value with hierarchical loading
     * 
     * @param {string} key - Configuration key (e.g., 'ai.models.content.primary')
     * @param {*} defaultValue - Default value if not found
     * @param {Object} options - Loading options
     * @returns {Promise<*>} Configuration value
     */
    async get(key, defaultValue = null, options = {}) {
        try {
            // Check cache first (if enabled and not expired)
            if (this.cacheEnabled && this.isCacheValid(key)) {
                console.log(`Configuration cache hit for key: ${key}`);
                return this.cache.get(key);
            }

            // Load configuration with hierarchical priority
            const value = await this.loadConfigurationValue(key, defaultValue, options);
            
            // Cache the result
            if (this.cacheEnabled) {
                this.cache.set(key, value);
                this.cacheTimestamps.set(key, Date.now());
            }
            
            return value;
            
        } catch (error) {
            console.error(`Failed to load configuration for key: ${key}`, error);
            return defaultValue;
        }
    }

    /**
     * Load configuration value with hierarchical priority
     * 
     * @param {string} key - Configuration key
     * @param {*} defaultValue - Default value
     * @param {Object} options - Loading options
     * @returns {Promise<*>} Configuration value
     */
    async loadConfigurationValue(key, defaultValue, options) {
        // 1. Runtime Overrides (highest priority)
        if (this.runtimeOverrides.has(key)) {
            console.log(`Using runtime override for key: ${key}`);
            return this.runtimeOverrides.get(key);
        }

        // 2. AWS Parameter Store
        try {
            const parameterValue = await this.getParameterStoreValue(key);
            if (parameterValue !== null) {
                console.log(`Loaded from Parameter Store: ${key}`);
                return parameterValue;
            }
        } catch (error) {
            console.warn(`Failed to load from Parameter Store: ${key}`, error.message);
        }

        // 3. AWS Secrets Manager (for sensitive data)
        if (this.isSecretKey(key)) {
            try {
                const secretValue = await this.getSecretValue(key);
                if (secretValue !== null) {
                    console.log(`Loaded from Secrets Manager: ${key}`);
                    return secretValue;
                }
            } catch (error) {
                console.warn(`Failed to load from Secrets Manager: ${key}`, error.message);
            }
        }

        // 4. S3 Configuration Files
        try {
            const s3Value = await this.getS3ConfigValue(key);
            if (s3Value !== null) {
                console.log(`Loaded from S3 configuration: ${key}`);
                return s3Value;
            }
        } catch (error) {
            console.warn(`Failed to load from S3: ${key}`, error.message);
        }

        // 5. Environment Variables
        const envValue = this.getEnvironmentValue(key);
        if (envValue !== null) {
            console.log(`Loaded from environment variable: ${key}`);
            return envValue;
        }

        // 6. Default Values (lowest priority)
        console.log(`Using default value for key: ${key}`);
        return defaultValue;
    }

    /**
     * Get value from AWS Parameter Store
     * 
     * @param {string} key - Configuration key
     * @returns {Promise<*>} Parameter value or null
     */
    async getParameterStoreValue(key) {
        try {
            const parameterName = this.buildParameterPath(key);
            const command = new GetParameterCommand({
                Name: parameterName,
                WithDecryption: true
            });
            
            const response = await this.ssmClient.send(command);
            return this.parseConfigurationValue(response.Parameter.Value);
            
        } catch (error) {
            if (error.name === 'ParameterNotFound') {
                return null; // Parameter doesn't exist
            }
            throw error;
        }
    }

    /**
     * Get value from AWS Secrets Manager
     * 
     * @param {string} key - Configuration key
     * @returns {Promise<*>} Secret value or null
     */
    async getSecretValue(key) {
        try {
            const secretArn = this.buildSecretArn(key);
            const command = new GetSecretValueCommand({
                SecretId: secretArn
            });
            
            const response = await this.secretsClient.send(command);
            const secretData = JSON.parse(response.SecretString);
            
            // Extract specific key from secret if needed
            const secretKey = this.extractSecretKey(key);
            return secretKey ? secretData[secretKey] : secretData;
            
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                return null; // Secret doesn't exist
            }
            throw error;
        }
    }

    /**
     * Get value from S3 configuration files
     * 
     * @param {string} key - Configuration key
     * @returns {Promise<*>} Configuration value or null
     */
    async getS3ConfigValue(key) {
        try {
            const configBucket = process.env.CONFIG_BUCKET || 'youtube-automation-config';
            const configFile = this.getConfigFileName(key);
            
            const command = new GetObjectCommand({
                Bucket: configBucket,
                Key: configFile
            });
            
            const response = await this.s3Client.send(command);
            const configData = JSON.parse(await response.Body.transformToString());
            
            return this.extractNestedValue(configData, key);
            
        } catch (error) {
            if (error.name === 'NoSuchKey' || error.name === 'NoSuchBucket') {
                return null; // Configuration file doesn't exist
            }
            throw error;
        }
    }

    /**
     * Get value from environment variables
     * 
     * @param {string} key - Configuration key
     * @returns {*} Environment value or null
     */
    getEnvironmentValue(key) {
        // Convert dot notation to environment variable format
        const envKey = key.toUpperCase().replace(/\./g, '_');
        const value = process.env[envKey];
        
        if (value !== undefined) {
            return this.parseConfigurationValue(value);
        }
        
        return null;
    }

    /**
     * Set runtime override for configuration key
     * 
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     * @param {Object} options - Update options
     */
    async setRuntimeOverride(key, value, options = {}) {
        console.log(`Setting runtime override for key: ${key}`);
        
        // Validate configuration if schema provided
        if (options.schema) {
            this.validateConfiguration(key, value, options.schema);
        }
        
        // Set runtime override
        this.runtimeOverrides.set(key, value);
        
        // Invalidate cache
        this.invalidateCache(key);
        
        // Notify change listeners
        this.notifyChangeListeners(key, value);
        
        // Persist to Parameter Store if requested
        if (options.persist) {
            await this.persistToParameterStore(key, value);
        }
    }

    /**
     * Clear runtime override for configuration key
     * 
     * @param {string} key - Configuration key
     */
    clearRuntimeOverride(key) {
        console.log(`Clearing runtime override for key: ${key}`);
        this.runtimeOverrides.delete(key);
        this.invalidateCache(key);
        this.notifyChangeListeners(key, null);
    }

    /**
     * Add configuration change listener
     * 
     * @param {string} key - Configuration key to watch
     * @param {Function} callback - Callback function
     */
    addChangeListener(key, callback) {
        if (!this.changeListeners.has(key)) {
            this.changeListeners.set(key, []);
        }
        this.changeListeners.get(key).push(callback);
    }

    /**
     * Remove configuration change listener
     * 
     * @param {string} key - Configuration key
     * @param {Function} callback - Callback function to remove
     */
    removeChangeListener(key, callback) {
        const listeners = this.changeListeners.get(key);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Validate configuration value against schema
     * 
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     * @param {Object} schema - Validation schema
     */
    validateConfiguration(key, value, schema) {
        // Basic validation - can be extended with JSON Schema validation
        if (schema.type && typeof value !== schema.type) {
            throw new Error(`Configuration validation failed for ${key}: expected ${schema.type}, got ${typeof value}`);
        }
        
        if (schema.required && (value === null || value === undefined)) {
            throw new Error(`Configuration validation failed for ${key}: value is required`);
        }
        
        if (schema.enum && !schema.enum.includes(value)) {
            throw new Error(`Configuration validation failed for ${key}: value must be one of ${schema.enum.join(', ')}`);
        }
    }

    /**
     * Get all configuration for a namespace
     * 
     * @param {string} namespace - Configuration namespace (e.g., 'ai.models')
     * @returns {Promise<Object>} Configuration object
     */
    async getNamespace(namespace) {
        try {
            // Load from Parameter Store by path
            const parameterPath = this.buildParameterPath(namespace);
            const command = new GetParametersByPathCommand({
                Path: parameterPath,
                Recursive: true,
                WithDecryption: true
            });
            
            const response = await this.ssmClient.send(command);
            const config = {};
            
            for (const parameter of response.Parameters || []) {
                const key = parameter.Name.replace(parameterPath, '').replace(/^\//, '');
                config[key] = this.parseConfigurationValue(parameter.Value);
            }
            
            return config;
            
        } catch (error) {
            console.error(`Failed to load namespace configuration: ${namespace}`, error);
            return {};
        }
    }

    /**
     * Utility Methods
     */

    isCacheValid(key) {
        const timestamp = this.cacheTimestamps.get(key);
        return timestamp && (Date.now() - timestamp) < this.cacheTTL;
    }

    invalidateCache(key) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
    }

    notifyChangeListeners(key, value) {
        const listeners = this.changeListeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(key, value);
                } catch (error) {
                    console.error(`Configuration change listener error for ${key}:`, error);
                }
            });
        }
    }

    buildParameterPath(key) {
        return `/youtube-automation/${this.environment}/${key.replace(/\./g, '/')}`;
    }

    buildSecretArn(key) {
        // Extract secret name from key (e.g., 'secrets.youtube.api' -> 'youtube-api')
        const secretName = key.replace('secrets.', '').replace(/\./g, '-');
        return `arn:aws:secretsmanager:${this.region}:${process.env.AWS_ACCOUNT_ID}:secret:youtube-automation-${secretName}`;
    }

    isSecretKey(key) {
        return key.startsWith('secrets.') || key.includes('api.key') || key.includes('token') || key.includes('password');
    }

    extractSecretKey(key) {
        // Extract specific key from secret (e.g., 'secrets.youtube.api.key' -> 'key')
        const parts = key.split('.');
        return parts.length > 3 ? parts[parts.length - 1] : null;
    }

    getConfigFileName(key) {
        // Determine config file based on key namespace
        const namespace = key.split('.')[0];
        return `${this.environment}/${namespace}-config.json`;
    }

    extractNestedValue(obj, key) {
        const keys = key.split('.');
        let current = obj;
        
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return null;
            }
        }
        
        return current;
    }

    parseConfigurationValue(value) {
        if (typeof value !== 'string') {
            return value;
        }
        
        // Try to parse as JSON
        if (value.startsWith('{') || value.startsWith('[')) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        
        // Parse boolean values
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // Parse numeric values
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        
        return value;
    }

    async persistToParameterStore(key, value) {
        try {
            const { PutParameterCommand } = require('@aws-sdk/client-ssm');
            const parameterName = this.buildParameterPath(key);
            
            const command = new PutParameterCommand({
                Name: parameterName,
                Value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                Type: 'SecureString',
                Overwrite: true
            });
            
            await this.ssmClient.send(command);
            console.log(`Persisted configuration to Parameter Store: ${key}`);
            
        } catch (error) {
            console.error(`Failed to persist configuration to Parameter Store: ${key}`, error);
        }
    }
}

module.exports = ConfigurationManager;