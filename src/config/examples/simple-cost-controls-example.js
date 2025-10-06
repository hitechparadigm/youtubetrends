/**
 * Simple Cost Controls Example
 * 
 * Demonstrates how to use environment-based model selection and cost tracking
 * to prevent expensive testing bills like the $172 AWS charge.
 */

const ConfigurationFactory = require('../ConfigurationFactory');

async function demonstrateCostControls() {
    console.log('=== Simple Cost Controls Demo ===\n');
    
    try {
        // Test in development environment (cheap models)
        console.log('1. Development Environment (Cost-Optimized):');
        const devCostControls = ConfigurationFactory.getCostControls('development');
        
        // Get model configurations for development
        const devContentModel = await devCostControls.getModelConfig('content');
        const devAudioModel = await devCostControls.getModelConfig('audio');
        
        console.log('   Content Model:', devContentModel.model, `($${devContentModel.costPerMToken}/1M tokens)`);
        console.log('   Audio Engine:', devAudioModel.engine, `($${devAudioModel.costPerMChar}/1M chars)`);
        
        // Simulate some API calls and cost tracking
        await devCostControls.trackCost('content', 0.05, { tokens: 200 });
        await devCostControls.trackCost('audio', 0.02, { characters: 500 });
        
        console.log('   Daily Spend:', `$${devCostControls.getDailySpend().toFixed(2)}`);
        
        // Test caching in development
        const cacheKey = devCostControls.generateCacheKey('content', { topic: 'investing' });
        const cachedResponse = devCostControls.getCachedResponse(cacheKey);
        
        if (!cachedResponse) {
            console.log('   Cache miss - would make API call');
            devCostControls.setCachedResponse(cacheKey, { content: 'Sample cached content' });
        } else {
            console.log('   Cache hit - saved API cost!');
        }
        
        console.log();
        
        // Test in production environment (high-quality models)
        console.log('2. Production Environment (High-Quality):');
        const prodCostControls = ConfigurationFactory.getCostControls('production');
        
        const prodContentModel = await prodCostControls.getModelConfig('content');
        const prodAudioModel = await prodCostControls.getModelConfig('audio');
        
        console.log('   Content Model:', prodContentModel.model, `($${prodContentModel.costPerMToken}/1M tokens)`);
        console.log('   Audio Engine:', prodAudioModel.engine, `($${prodAudioModel.costPerMChar}/1M chars)`);
        
        // Production doesn't use caching by default
        const prodCacheKey = prodCostControls.generateCacheKey('content', { topic: 'investing' });
        const prodCachedResponse = prodCostControls.getCachedResponse(prodCacheKey);
        console.log('   Caching enabled:', prodCachedResponse !== null ? 'Yes' : 'No (production)');
        
        console.log();
        
        // Demonstrate cost limit behavior
        console.log('3. Cost Limit Demonstration:');
        
        // Simulate exceeding development budget
        await devCostControls.trackCost('content', 1.50, { tokens: 6000 });
        await devCostControls.trackCost('audio', 0.60, { characters: 2000 });
        
        console.log('   Daily Spend after more usage:', `$${devCostControls.getDailySpend().toFixed(2)}`);
        
        // Check if we should use mocks now
        const shouldUseMock = devCostControls.shouldUseMock('content');
        console.log('   Should use mock responses:', shouldUseMock ? 'Yes (over $2 limit)' : 'No');
        
        if (shouldUseMock) {
            const mockModel = await devCostControls.getModelConfig('content');
            console.log('   Switched to:', mockModel.provider, '(cost: $0)');
        }
        
        console.log();
        
        // Show cost optimization recommendations
        console.log('4. Cost Optimization Recommendations:');
        const recommendations = devCostControls.getCostOptimizationRecommendations();
        
        if (recommendations.length > 0) {
            recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
                console.log(`      Action: ${rec.action}`);
            });
        } else {
            console.log('   No recommendations - costs are within limits');
        }
        
        console.log();
        
        // Demonstrate using ConfigurationFactory for optimized models
        console.log('5. Using ConfigurationFactory for Optimized Models:');
        
        const devOptimizedContent = await ConfigurationFactory.getOptimizedModelConfig('content', 'development');
        const prodOptimizedContent = await ConfigurationFactory.getOptimizedModelConfig('content', 'production');
        
        console.log('   Development optimized model:', devOptimizedContent.model);
        console.log('   Production optimized model:', prodOptimizedContent.model);
        
        console.log();
        console.log('=== Cost Savings Summary ===');
        console.log('Development vs Production cost difference:');
        console.log(`- Content: ${prodContentModel.costPerMToken / devContentModel.costPerMToken}x cheaper in dev`);
        console.log(`- Audio: ${prodAudioModel.costPerMChar / devAudioModel.costPerMChar}x cheaper in dev`);
        console.log('- Caching: Enabled in development, disabled in production');
        console.log('- Mock fallback: Enabled at $2/day in development');
        
    } catch (error) {
        console.error('Cost controls demo failed:', error);
    }
}

// Run the demo
if (require.main === module) {
    demonstrateCostControls();
}

module.exports = { demonstrateCostControls };