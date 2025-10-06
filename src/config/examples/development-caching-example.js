/**
 * Development Caching Example
 * 
 * Demonstrates how response caching works in development environment
 * to reduce API calls and prevent unnecessary costs during testing.
 */

const ConfigurationFactory = require('../ConfigurationFactory');

async function demonstrateDevelopmentCaching() {
    console.log('=== Development Caching Demo ===\n');
    
    try {
        // Initialize cost controls for development and production
        console.log('1. Environment Setup:');
        const devCostControls = ConfigurationFactory.getCostControls('development');
        const prodCostControls = ConfigurationFactory.getCostControls('production');
        
        console.log('   Development: Caching ENABLED (1-hour TTL)');
        console.log('   Production: Caching DISABLED (fresh content always)');
        console.log();
        
        // Test caching in development
        console.log('2. Development Environment Caching:');
        
        // Simulate a content generation request
        const requestParams = {
            topic: 'ETF investing strategies',
            contentType: 'video_script',
            targetAudience: 'beginners',
            maxLength: 300
        };
        
        const cacheKey = devCostControls.generateCacheKey('content', requestParams);
        console.log(`   Generated cache key: ${cacheKey.substring(0, 50)}...`);
        
        // First request - cache miss
        console.log('\n   First Request (Cache Miss):');
        let cachedResponse = devCostControls.getCachedResponse(cacheKey);
        
        if (!cachedResponse) {
            console.log('   ❌ Cache miss - would make API call');
            console.log('   💰 Cost: $0.05 (API call required)');
            
            // Simulate API response
            const apiResponse = {
                content: 'ETF investing is a great way for beginners to start building wealth...',
                title: '5 Essential ETF Strategies for Beginners',
                description: 'Learn the fundamentals of ETF investing with these proven strategies.',
                generatedAt: new Date().toISOString(),
                cost: 0.05,
                source: 'api'
            };
            
            // Cache the response
            devCostControls.setCachedResponse(cacheKey, apiResponse);
            console.log('   ✅ Response cached for future use');
        }
        
        // Second request - cache hit
        console.log('\n   Second Request (Cache Hit):');
        cachedResponse = devCostControls.getCachedResponse(cacheKey);
        
        if (cachedResponse) {
            console.log('   ✅ Cache hit - no API call needed!');
            console.log('   💰 Cost: $0.00 (saved API call)');
            console.log(`   📄 Cached content: ${cachedResponse.content.substring(0, 50)}...`);
            console.log(`   🕒 Generated at: ${cachedResponse.generatedAt}`);
        }
        
        console.log();
        
        // Test different cache keys
        console.log('3. Cache Key Variations:');
        
        const variations = [
            { topic: 'ETF investing strategies', audience: 'beginners' },
            { topic: 'ETF investing strategies', audience: 'advanced' }, // Different audience
            { topic: 'Stock market basics', audience: 'beginners' }, // Different topic
        ];
        
        variations.forEach((params, index) => {
            const varKey = devCostControls.generateCacheKey('content', params);
            const isCached = devCostControls.getCachedResponse(varKey) !== null;
            console.log(`   ${index + 1}. ${params.topic} (${params.audience}): ${isCached ? '✅ Cached' : '❌ Not cached'}`);
        });
        
        console.log();
        
        // Test production environment (no caching)
        console.log('4. Production Environment (No Caching):');
        
        const prodCacheKey = prodCostControls.generateCacheKey('content', requestParams);
        
        // Try to cache in production
        const prodResponse = {
            content: 'Production content should always be fresh...',
            source: 'production_api'
        };
        
        prodCostControls.setCachedResponse(prodCacheKey, prodResponse);
        const prodCached = prodCostControls.getCachedResponse(prodCacheKey);
        
        console.log(`   Caching attempt in production: ${prodCached ? 'Cached' : 'Not cached (as expected)'}`);
        console.log('   💡 Production always generates fresh content for quality');
        
        console.log();
        
        // Demonstrate cache expiration
        console.log('5. Cache TTL and Expiration:');
        
        // Create a short-lived cache entry for demonstration
        const shortLivedKey = 'demo_short_lived';
        const shortLivedResponse = {
            content: 'This will expire soon...',
            timestamp: Date.now()
        };
        
        devCostControls.setCachedResponse(shortLivedKey, shortLivedResponse);
        console.log('   ✅ Created cache entry');
        console.log('   ⏰ TTL: 1 hour (3600 seconds)');
        
        // Check immediate retrieval
        const immediateCheck = devCostControls.getCachedResponse(shortLivedKey);
        console.log(`   🔍 Immediate check: ${immediateCheck ? 'Found' : 'Not found'}`);
        
        console.log();
        
        // Show cache statistics
        console.log('6. Cache Statistics and Benefits:');
        
        // Simulate multiple requests to show savings
        const testRequests = [
            { topic: 'dividend investing', type: 'script' },
            { topic: 'dividend investing', type: 'script' }, // Duplicate
            { topic: 'dividend investing', type: 'title' }, // Different type
            { topic: 'real estate', type: 'script' }, // Different topic
            { topic: 'dividend investing', type: 'script' }, // Another duplicate
        ];
        
        let apiCalls = 0;
        let cacheHits = 0;
        let totalCost = 0;
        let savedCost = 0;
        
        console.log('   Simulating 5 requests:');
        
        testRequests.forEach((req, index) => {
            const key = devCostControls.generateCacheKey(req.type, req);
            const cached = devCostControls.getCachedResponse(key);
            
            if (cached) {
                cacheHits++;
                savedCost += 0.05; // Assume $0.05 per API call
                console.log(`   ${index + 1}. ${req.topic} (${req.type}): ✅ Cache hit - $0.00`);
            } else {
                apiCalls++;
                totalCost += 0.05;
                // Cache the response for future hits
                devCostControls.setCachedResponse(key, { 
                    content: `Generated content for ${req.topic}`,
                    type: req.type 
                });
                console.log(`   ${index + 1}. ${req.topic} (${req.type}): 💰 API call - $0.05`);
            }
        });
        
        console.log('\n   📊 Cache Statistics:');
        console.log(`   - API calls made: ${apiCalls}`);
        console.log(`   - Cache hits: ${cacheHits}`);
        console.log(`   - Total cost: $${totalCost.toFixed(2)}`);
        console.log(`   - Cost saved: $${savedCost.toFixed(2)}`);
        console.log(`   - Cache hit rate: ${((cacheHits / testRequests.length) * 100).toFixed(1)}%`);
        
        console.log();
        
        // Show environment comparison
        console.log('7. Environment Comparison:');
        console.log('   Development Environment:');
        console.log('   ✅ Aggressive caching enabled (1-hour TTL)');
        console.log('   ✅ Reduces redundant API calls during testing');
        console.log('   ✅ Significant cost savings for repeated requests');
        console.log('   ✅ Faster response times for cached content');
        
        console.log('\n   Production Environment:');
        console.log('   ❌ Caching disabled');
        console.log('   ✅ Always fresh, high-quality content');
        console.log('   ✅ No stale content issues');
        console.log('   ✅ Optimal for end-user experience');
        
        console.log();
        
        // Show best practices
        console.log('=== Caching Best Practices ===');
        console.log('✅ Cache only in development/testing environments');
        console.log('✅ Use intelligent cache keys based on request parameters');
        console.log('✅ Set appropriate TTL (1 hour for development)');
        console.log('✅ Clear cache when switching between major test scenarios');
        console.log('✅ Monitor cache hit rates to optimize testing patterns');
        console.log('✅ Never cache in production to ensure content freshness');
        
    } catch (error) {
        console.error('Development caching demo failed:', error);
    }
}

// Run the demo
if (require.main === module) {
    demonstrateDevelopmentCaching();
}

module.exports = { demonstrateDevelopmentCaching };