/**
 * Test Enhanced Cost Tracking
 * 
 * Tests the SimpleCostTracker implementation to ensure proper
 * cost monitoring, threshold alerts, and detailed reporting.
 */

const ConfigurationFactory = require('../src/config/ConfigurationFactory');

async function testEnhancedCostTracking() {
    console.log('Testing Enhanced Cost Tracking...\n');
    
    let testsPassed = 0;
    let testsTotal = 0;
    
    function test(description, condition) {
        testsTotal++;
        if (condition) {
            console.log(`✅ ${description}`);
            testsPassed++;
        } else {
            console.log(`❌ ${description}`);
        }
    }
    
    try {
        // Test 1: Basic cost tracking functionality
        console.log('1. Testing Basic Cost Tracking:');
        
        const costControls = ConfigurationFactory.getCostControls('development');
        
        // Track some costs
        const result1 = await costControls.trackCost('content', 0.25, { tokens: 1000 });
        const result2 = await costControls.trackCost('audio', 0.15, { characters: 500 });
        
        test('Cost tracking returns success', result1.success === true);
        test('Daily spend accumulates correctly', costControls.getDailySpend() === 0.40);
        test('Cost tracking includes metadata', result1.costEntry.metadata.tokens === 1000);
        
        console.log();
        
        // Test 2: Service breakdown tracking
        console.log('2. Testing Service Breakdown:');
        
        const breakdown = costControls.getServiceBreakdown();
        
        test('Service breakdown includes content', breakdown.content !== undefined);
        test('Service breakdown includes audio', breakdown.audio !== undefined);
        test('Content service amount correct', breakdown.content.amount === 0.25);
        test('Audio service amount correct', breakdown.audio.amount === 0.15);
        test('Percentages calculated correctly', Math.abs(breakdown.content.percentage - 62.5) < 0.1);
        
        console.log();
        
        // Test 3: Threshold warnings
        console.log('3. Testing Threshold Warnings:');
        
        // Add more cost to trigger warning threshold ($1.00)
        await costControls.trackCost('content', 0.70, { tokens: 2800 });
        
        const summary1 = costControls.getCostSummary();
        test('Warning threshold triggered', summary1.status === 'warning');
        test('Recommendations generated for warning', summary1.recommendations.length > 0);
        
        // Add more cost to trigger critical threshold ($2.00)
        await costControls.trackCost('video', 1.20, { duration: 10 });
        
        const summary2 = costControls.getCostSummary();
        test('Critical threshold triggered', summary2.status === 'critical');
        test('Mock mode activated', costControls.shouldUseMock('content') === true);
        
        console.log();
        
        // Test 4: Cost summary and reporting
        console.log('4. Testing Cost Summary and Reporting:');
        
        const fullSummary = costControls.getCostSummary();
        
        test('Summary includes environment', fullSummary.environment === 'development');
        test('Summary includes daily spend', typeof fullSummary.dailySpend === 'number');
        test('Summary includes thresholds', fullSummary.thresholds !== undefined);
        test('Summary includes service breakdown', fullSummary.serviceBreakdown !== undefined);
        test('Summary includes status', ['normal', 'warning', 'critical', 'maximum'].includes(fullSummary.status));
        test('Summary includes recommendations', Array.isArray(fullSummary.recommendations));
        test('Summary includes timestamp', fullSummary.lastUpdated !== undefined);
        
        console.log();
        
        // Test 5: Environment-specific thresholds
        console.log('5. Testing Environment-Specific Thresholds:');
        
        const prodCostControls = ConfigurationFactory.getCostControls('production');
        await prodCostControls.trackCost('content', 5.00); // Same amount, different environment
        
        const devSummary = costControls.getCostSummary();
        const prodSummary = prodCostControls.getCostSummary();
        
        test('Development has lower thresholds', devSummary.thresholds.critical < prodSummary.thresholds.critical);
        test('Production allows higher spending', prodSummary.thresholds.critical > devSummary.thresholds.critical);
        test('Same cost different status', devSummary.status !== prodSummary.status);
        
        console.log();
        
        // Test 6: Cost optimization recommendations
        console.log('6. Testing Cost Optimization Recommendations:');
        
        const recommendations = costControls.getCostOptimizationRecommendations();
        
        test('Recommendations array returned', Array.isArray(recommendations));
        test('Recommendations include type', recommendations.every(r => r.type !== undefined));
        test('Recommendations include message', recommendations.every(r => r.message !== undefined));
        test('Critical recommendations present', recommendations.some(r => r.priority === 'high' || r.priority === 'critical'));
        
        console.log();
        
        // Test 7: Daily spend reset
        console.log('7. Testing Daily Spend Reset:');
        
        const spendBeforeReset = costControls.getDailySpend();
        costControls.resetDailySpend();
        const spendAfterReset = costControls.getDailySpend();
        
        test('Daily spend reset to zero', spendAfterReset === 0);
        test('Previous spend was greater than zero', spendBeforeReset > 0);
        
        console.log();
        
        // Test 8: Error handling
        console.log('8. Testing Error Handling:');
        
        const errorResult1 = await costControls.trackCost('content', -1); // Negative cost
        const errorResult2 = await costControls.trackCost('content', 'invalid'); // Invalid cost type
        
        test('Negative cost handled gracefully', errorResult1.success === false);
        test('Invalid cost type handled gracefully', errorResult2.success === false);
        test('Error messages provided', errorResult1.error !== undefined);
        
        console.log();
        
        // Summary
        console.log('=== Enhanced Cost Tracking Test Results ===');
        console.log(`Tests passed: ${testsPassed}/${testsTotal}`);
        console.log(`Success rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
        
        if (testsPassed === testsTotal) {
            console.log('🎉 All enhanced cost tracking tests passed!');
            console.log('\n💰 Enhanced features verified:');
            console.log('   - Detailed service breakdown tracking');
            console.log('   - Environment-specific threshold alerts');
            console.log('   - Comprehensive cost summaries');
            console.log('   - Intelligent recommendations');
            console.log('   - Robust error handling');
            console.log('   - Daily spend reset functionality');
        } else {
            console.log('❌ Some enhanced cost tracking tests failed. Please check the implementation.');
        }
        
    } catch (error) {
        console.error('Enhanced cost tracking test execution failed:', error);
    }
}

// Run tests if executed directly
if (require.main === module) {
    testEnhancedCostTracking();
}

module.exports = { testEnhancedCostTracking };