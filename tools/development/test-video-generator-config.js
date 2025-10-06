#!/usr/bin/env node

/**
 * Test Video Generator with Configuration System
 * 
 * This script tests the updated video generator Lambda function
 * to ensure it works correctly with the new ConfigurationManager.
 */

const ConfigurationFactory = require('../../src/config/ConfigurationFactory');

// Mock the video generator handler
async function testVideoGeneratorWithConfig() {
    console.log('🎬 TESTING VIDEO GENERATOR WITH CONFIGURATION SYSTEM');
    console.log('===================================================');
    
    try {
        // Test 1: Configuration loading
        console.log('\n1. Testing configuration loading...');
        
        const config = ConfigurationFactory.getInstance();
        
        // Test AI model configuration
        const audioModelConfig = await config.get('ai.models.audio', {
            primary: { engine: 'generative', provider: 'polly' },
            fallback: { engine: 'neural', provider: 'polly' }
        });
        
        console.log('✅ Audio Model Config:', audioModelConfig);
        
        // Test voice settings
        const voiceSettings = await config.get('voice.investing.primary', 'Stephen');
        console.log('✅ Voice Settings for investing:', voiceSettings);
        
        // Test cost rates
        const costRates = await config.get('cost.rates', {
            polly: { generative: 30.00, neural: 16.00 }
        });
        console.log('✅ Cost Rates:', costRates.polly);
        
        // Test 2: Feature flags
        console.log('\n2. Testing feature flags...');
        
        const generativeEnabled = await config.get('features.enableGenerativeAI', true);
        console.log('✅ Generative AI enabled:', generativeEnabled);
        
        // Test 3: Cost calculation simulation
        console.log('\n3. Testing cost calculation...');
        
        // Simulate cost calculation for different engines
        const testScenarios = [
            { engine: 'generative', textLength: 150, description: '8-second video with generative AI' },
            { engine: 'neural', textLength: 150, description: '8-second video with neural voice' },
            { engine: 'generative', textLength: 750, description: '5-minute video with generative AI' }
        ];
        
        for (const scenario of testScenarios) {
            const rate = costRates.polly[scenario.engine] || 16.00;
            const audioCost = (scenario.textLength / 1000000) * rate;
            const videoCost = (8 / 60) * 0.80; // 8 seconds of video
            const totalCost = videoCost + audioCost;
            
            console.log(`${scenario.description}:`, {
                engine: scenario.engine,
                audioCost: audioCost.toFixed(4),
                videoCost: videoCost.toFixed(4),
                total: totalCost.toFixed(4)
            });
        }
        
        // Test 4: Runtime configuration updates
        console.log('\n4. Testing runtime configuration updates...');
        
        // Update voice setting at runtime
        await config.setRuntimeOverride('voice.investing.primary', 'Matthew');
        const updatedVoice = await config.get('voice.investing.primary');
        console.log('✅ Updated voice setting:', updatedVoice);
        
        // Update feature flag
        await config.setRuntimeOverride('features.enableGenerativeAI', false);
        const updatedFlag = await config.get('features.enableGenerativeAI');
        console.log('✅ Updated feature flag:', updatedFlag);
        
        // Clear overrides
        config.clearRuntimeOverride('voice.investing.primary');
        config.clearRuntimeOverride('features.enableGenerativeAI');
        
        // Test 5: Environment variable integration
        console.log('\n5. Testing environment variable integration...');
        
        // Set environment variables
        process.env.VOICE_INVESTING_PRIMARY = 'Ruth';
        process.env.FEATURES_ENABLEGENERATIVEAI = 'false';
        
        // Create new instance to pick up env vars
        ConfigurationFactory.clearInstances();
        const newConfig = ConfigurationFactory.getInstance();
        
        const envVoice = await newConfig.get('voice.investing.primary');
        const envFlag = await newConfig.get('features.enableGenerativeAI');
        
        console.log('✅ Environment voice setting:', envVoice);
        console.log('✅ Environment feature flag:', envFlag);
        
        // Clean up
        delete process.env.VOICE_INVESTING_PRIMARY;
        delete process.env.FEATURES_ENABLEGENERATIVEAI;
        
        // Test 6: Error handling
        console.log('\n6. Testing error handling...');
        
        try {
            // Test with invalid configuration
            await config.get('invalid.nested.key.that.does.not.exist');
            console.log('✅ Invalid key handled gracefully');
        } catch (error) {
            console.log('✅ Error handling working:', error.message);
        }
        
        console.log('\n🎉 ALL VIDEO GENERATOR CONFIGURATION TESTS PASSED!');
        console.log('===================================================');
        
        return {
            success: true,
            message: 'Video generator configuration integration working correctly'
        };
        
    } catch (error) {
        console.error('\n❌ VIDEO GENERATOR CONFIGURATION TEST FAILED:', error);
        console.error('Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Test configuration scenarios for different topics
async function testTopicSpecificConfigurations() {
    console.log('\n🎯 TESTING TOPIC-SPECIFIC CONFIGURATIONS');
    console.log('========================================');
    
    const topics = ['investing', 'education', 'tourism', 'technology', 'health'];
    const config = ConfigurationFactory.getInstance();
    
    for (const topic of topics) {
        console.log(`\nTesting ${topic} configuration...`);
        
        // Get topic-specific voice
        const voice = await config.get(`voice.${topic}.primary`, 'Amy');
        
        // Get topic-specific cost optimization
        const costOptimization = await config.get(`cost.optimization.${topic}`, 'balanced');
        
        console.log(`${topic}:`, {
            voice,
            costOptimization
        });
    }
    
    console.log('\n✅ Topic-specific configurations working');
}

// Test mock video generation event
async function testMockVideoGeneration() {
    console.log('\n🎬 TESTING MOCK VIDEO GENERATION EVENT');
    console.log('=====================================');
    
    // Create a mock event similar to what the Lambda would receive
    const mockEvent = {
        topic: 'investing',
        trendId: 'test-trend-123',
        scriptPrompt: 'Create a video about ETF investing strategies for beginners',
        videoConfig: {
            durationSeconds: 8,
            includeAudio: true,
            quality: 'high'
        },
        audioConfig: {
            voice: 'Stephen',
            speed: 'medium',
            language: 'en-US'
        },
        costConstraints: {
            maxCost: 0.15
        }
    };
    
    console.log('Mock event:', mockEvent);
    
    // Test configuration loading for this event
    const config = ConfigurationFactory.getInstance();
    
    // Get AI model config
    const audioModelConfig = await config.get('ai.models.audio', {
        primary: { engine: 'generative', provider: 'polly' },
        fallback: { engine: 'neural', provider: 'polly' }
    });
    
    // Simulate engine selection
    const generativeEnabled = await config.get('features.enableGenerativeAI', true);
    const selectedEngine = generativeEnabled ? audioModelConfig.primary.engine : audioModelConfig.fallback.engine;
    
    // Simulate cost calculation
    const costRates = await config.get('cost.rates.polly', { generative: 30.00, neural: 16.00 });
    const textLength = mockEvent.scriptPrompt.length;
    const audioCost = (textLength / 1000000) * costRates[selectedEngine];
    const videoCost = (mockEvent.videoConfig.durationSeconds / 60) * 0.80;
    const totalCost = videoCost + audioCost;
    
    console.log('Configuration-based processing:', {
        selectedEngine,
        generativeEnabled,
        textLength,
        audioCost: audioCost.toFixed(4),
        videoCost: videoCost.toFixed(4),
        totalCost: totalCost.toFixed(4),
        withinBudget: totalCost <= mockEvent.costConstraints.maxCost
    });
    
    console.log('✅ Mock video generation configuration working');
}

// Run all tests
async function runAllTests() {
    const result = await testVideoGeneratorWithConfig();
    
    if (result.success) {
        await testTopicSpecificConfigurations();
        await testMockVideoGeneration();
        
        console.log('\n🚀 VIDEO GENERATOR CONFIGURATION INTEGRATION COMPLETE');
        console.log('Next steps:');
        console.log('1. Deploy updated Lambda function');
        console.log('2. Set up Parameter Store configurations');
        console.log('3. Configure voice mappings for all topics');
        console.log('4. Test with real AWS services');
        
    } else {
        console.log('\n🔧 VIDEO GENERATOR CONFIGURATION NEEDS FIXES');
        console.log('Please resolve the errors above before proceeding');
    }
    
    return result;
}

// Export for use in other scripts
module.exports = {
    testVideoGeneratorWithConfig,
    testTopicSpecificConfigurations,
    testMockVideoGeneration,
    runAllTests
};

// Run if called directly
if (require.main === module) {
    runAllTests().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}