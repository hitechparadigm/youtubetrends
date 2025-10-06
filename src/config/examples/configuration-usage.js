/**
 * Configuration Usage Examples
 * 
 * This file demonstrates how to use the ConfigurationManager and ConfigurationFactory
 * in different scenarios across the YouTube Automation Platform.
 */

const ConfigurationFactory = require('../ConfigurationFactory');

/**
 * Example 1: Basic Configuration Access
 */
async function basicConfigurationExample() {
    console.log('=== Basic Configuration Example ===');
    
    // Get AI model configuration for content generation
    const contentModelConfig = await ConfigurationFactory.getAIModelConfig('content');
    console.log('Content AI Model:', contentModelConfig);
    
    // Get cost configuration
    const costConfig = await ConfigurationFactory.getCostConfig();
    console.log('Cost Configuration:', costConfig);
    
    // Get feature flags
    const features = await ConfigurationFactory.getFeatureFlags();
    console.log('Feature Flags:', features);
}

/**
 * Example 2: Environment-Specific Configuration
 */
async function environmentSpecificExample() {
    console.log('=== Environment-Specific Configuration Example ===');
    
    // Get configuration for different environments
    const devConfig = await ConfigurationFactory.getVideoConfig('development');
    const prodConfig = await ConfigurationFactory.getVideoConfig('production');
    
    console.log('Development Video Config:', devConfig);
    console.log('Production Video Config:', prodConfig);
}

/**
 * Example 3: Runtime Configuration Updates
 */
async function runtimeUpdateExample() {
    console.log('=== Runtime Configuration Update Example ===');
    
    // Update feature flag at runtime
    await ConfigurationFactory.updateConfiguration(
        'features.enableGenerativeAI',
        false,
        { persist: true }
    );
    
    // Verify the change
    const updatedFeatures = await ConfigurationFactory.getFeatureFlags();
    console.log('Updated Feature Flags:', updatedFeatures);
    
    // Restore original value
    await ConfigurationFactory.updateConfiguration(
        'features.enableGenerativeAI',
        true,
        { persist: true }
    );
}

/**
 * Example 4: Secret Management
 */
async function secretManagementExample() {
    console.log('=== Secret Management Example ===');
    
    try {
        // Get API secrets (these would be stored in AWS Secrets Manager)
        const youtubeApiKey = await ConfigurationFactory.getSecret('youtube.api.key');
        const anthropicApiKey = await ConfigurationFactory.getSecret('anthropic.api.key');
        
        console.log('YouTube API Key loaded:', youtubeApiKey ? 'Yes' : 'No');
        console.log('Anthropic API Key loaded:', anthropicApiKey ? 'Yes' : 'No');
        
    } catch (error) {
        console.log('Secret loading failed (expected in local environment):', error.message);
    }
}

/**
 * Example 5: Prompt Template Usage
 */
async function promptTemplateExample() {
    console.log('=== Prompt Template Example ===');
    
    // Get prompt templates for different content types
    const scriptTemplate = await ConfigurationFactory.getPromptTemplate('script', 'investing');
    const titleTemplate = await ConfigurationFactory.getPromptTemplate('title', 'investing');
    
    console.log('Script Template:', scriptTemplate);
    console.log('Title Template:', titleTemplate);
}

/**
 * Example 6: Direct ConfigurationManager Usage
 */
async function directConfigurationManagerExample() {
    console.log('=== Direct ConfigurationManager Example ===');
    
    const config = ConfigurationFactory.getInstance('production');
    
    // Add change listener
    config.addChangeListener('ai.models.content.primary.model', (key, value) => {
        console.log(`Configuration changed: ${key} = ${value}`);
    });
    
    // Get nested configuration
    const currentModel = await config.get('ai.models.content.primary.model', 'claude-3-haiku');
    console.log('Current Content Model:', currentModel);
    
    // Set runtime override
    await config.setRuntimeOverride('ai.models.content.primary.model', 'claude-3-5-sonnet-20241022');
    
    // Get updated value
    const updatedModel = await config.get('ai.models.content.primary.model');
    console.log('Updated Content Model:', updatedModel);
    
    // Clear override
    config.clearRuntimeOverride('ai.models.content.primary.model');
}

/**
 * Example 7: Configuration Validation
 */
async function configurationValidationExample() {
    console.log('=== Configuration Validation Example ===');
    
    try {
        // This should work
        await ConfigurationFactory.updateConfiguration(
            'cost.budgets.daily',
            15.00,
            { validate: true }
        );
        console.log('Valid configuration update succeeded');
        
        // This should fail validation
        await ConfigurationFactory.updateConfiguration(
            'cost.budgets.daily',
            -5.00,
            { validate: true }
        );
        
    } catch (error) {
        console.log('Configuration validation error (expected):', error.message);
    }
}

/**
 * Run all examples
 */
async function runAllExamples() {
    try {
        await basicConfigurationExample();
        await environmentSpecificExample();
        await runtimeUpdateExample();
        await secretManagementExample();
        await promptTemplateExample();
        await directConfigurationManagerExample();
        await configurationValidationExample();
        
        console.log('\n=== All Configuration Examples Completed ===');
        
    } catch (error) {
        console.error('Configuration example error:', error);
    }
}

// Run examples if this file is executed directly
if (require.main === module) {
    runAllExamples();
}

module.exports = {
    basicConfigurationExample,
    environmentSpecificExample,
    runtimeUpdateExample,
    secretManagementExample,
    promptTemplateExample,
    directConfigurationManagerExample,
    configurationValidationExample,
    runAllExamples
};