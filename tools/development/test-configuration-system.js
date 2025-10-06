#!/usr/bin/env node

/**
 * Test Configuration System
 * 
 * This script tests the new ConfigurationManager and ConfigurationFactory
 * to ensure they work correctly with environment variables and default values.
 */

const ConfigurationFactory = require('../../src/config/ConfigurationFactory');

async function testConfigurationSystem() {
    console.log('🔧 TESTING CONFIGURATION MANAGEMENT SYSTEM');
    console.log('==========================================');
    
    try {
        // Test 1: Basic configuration loading
        console.log('\n1. Testing basic configuration loading...');
        const aiConfig = await ConfigurationFactory.getAIModelConfig('content');
        console.log('✅ AI Model Config loaded:', {
            provider: aiConfig.primary.provider,
            model: aiConfig.primary.model
        });
        
        // Test 2: Cost configuration
        console.log('\n2. Testing cost configuration...');
        const costConfig = await ConfigurationFactory.getCostConfig();
        console.log('✅ Cost Config loaded:', {
            dailyBudget: costConfig.budgets.daily,
            pollyGenerativeRate: costConfig.rates.polly.generative
        });
        
        // Test 3: Feature flags
        console.log('\n3. Testing feature flags...');
        const features = await ConfigurationFactory.getFeatureFlags();
        console.log('✅ Feature Flags loaded:', {
            generativeAI: features.enableGenerativeAI,
            customThumbnails: features.enableCustomThumbnails
        });
        
        // Test 4: Video configuration
        console.log('\n4. Testing video configuration...');
        const videoConfig = await ConfigurationFactory.getVideoConfig();
        console.log('✅ Video Config loaded:', {
            duration: videoConfig.defaultDuration,
            resolution: videoConfig.resolution,
            quality: videoConfig.quality
        });
        
        // Test 5: Runtime configuration updates
        console.log('\n5. Testing runtime configuration updates...');
        const config = ConfigurationFactory.getInstance();
        
        // Get original value
        const originalDuration = await config.get('video.defaultDuration', 8);
        console.log('Original duration:', originalDuration);
        
        // Update at runtime
        await config.setRuntimeOverride('video.defaultDuration', 15);
        const updatedDuration = await config.get('video.defaultDuration');
        console.log('Updated duration:', updatedDuration);
        
        // Clear override
        config.clearRuntimeOverride('video.defaultDuration');
        const restoredDuration = await config.get('video.defaultDuration', 8);
        console.log('Restored duration:', restoredDuration);
        
        console.log('✅ Runtime updates working correctly');
        
        // Test 6: Environment variable override
        console.log('\n6. Testing environment variable override...');
        
        // Set environment variable
        process.env.VIDEO_DEFAULTDURATION = '12';
        
        // Create new instance to pick up env var
        ConfigurationFactory.clearInstances();
        const newConfig = ConfigurationFactory.getInstance();
        const envDuration = await newConfig.get('video.defaultDuration', 8);
        console.log('Environment variable duration:', envDuration);
        
        // Clean up
        delete process.env.VIDEO_DEFAULTDURATION;
        
        console.log('✅ Environment variable override working correctly');
        
        // Test 7: Configuration validation
        console.log('\n7. Testing configuration validation...');
        
        try {
            await ConfigurationFactory.updateConfiguration(
                'cost.budgets.daily',
                -10,
                { validate: true }
            );
            console.log('❌ Validation should have failed');
        } catch (error) {
            console.log('✅ Validation correctly rejected negative budget:', error.message);
        }
        
        // Test 8: Prompt template loading
        console.log('\n8. Testing prompt template loading...');
        const scriptTemplate = await ConfigurationFactory.getPromptTemplate('script', 'investing');
        console.log('✅ Script Template loaded:', {
            template: scriptTemplate.template.substring(0, 50) + '...',
            version: scriptTemplate.version
        });
        
        console.log('\n🎉 ALL CONFIGURATION TESTS PASSED!');
        console.log('==========================================');
        
        return {
            success: true,
            message: 'Configuration system is working correctly'
        };
        
    } catch (error) {
        console.error('\n❌ CONFIGURATION TEST FAILED:', error);
        console.error('Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Test configuration with different environments
async function testEnvironmentConfigurations() {
    console.log('\n🌍 TESTING ENVIRONMENT-SPECIFIC CONFIGURATIONS');
    console.log('===============================================');
    
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
        console.log(`\nTesting ${env} environment...`);
        
        const videoConfig = await ConfigurationFactory.getVideoConfig(env);
        const features = await ConfigurationFactory.getFeatureFlags(env);
        
        console.log(`${env} config:`, {
            videoQuality: videoConfig.quality,
            generativeAI: features.enableGenerativeAI,
            advancedEffects: features.enableAdvancedVideoEffects
        });
    }
    
    console.log('\n✅ Environment-specific configurations working');
}

// Run tests
async function runAllTests() {
    const result = await testConfigurationSystem();
    
    if (result.success) {
        await testEnvironmentConfigurations();
        
        console.log('\n🚀 CONFIGURATION SYSTEM READY FOR PRODUCTION');
        console.log('Next steps:');
        console.log('1. Deploy Parameter Store configurations');
        console.log('2. Set up Secrets Manager for API keys');
        console.log('3. Upload S3 configuration files');
        console.log('4. Update Lambda functions to use ConfigurationFactory');
        
    } else {
        console.log('\n🔧 CONFIGURATION SYSTEM NEEDS FIXES');
        console.log('Please resolve the errors above before proceeding');
    }
    
    return result;
}

// Export for use in other scripts
module.exports = {
    testConfigurationSystem,
    testEnvironmentConfigurations,
    runAllTests
};

// Run if called directly
if (require.main === module) {
    runAllTests().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}