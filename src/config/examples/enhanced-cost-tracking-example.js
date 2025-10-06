/**
 * Enhanced Cost Tracking Example
 * 
 * Demonstrates the advanced cost tracking features including detailed
 * service breakdowns, threshold alerts, and comprehensive reporting.
 */

const ConfigurationFactory = require('../ConfigurationFactory');

async function demonstrateEnhancedCostTracking() {
    console.log('=== Enhanced Cost Tracking Demo ===\n');
    
    try {
        // Initialize cost controls for development
        console.log('1. Initializing Cost Tracking for Development Environment:');
        const costControls = ConfigurationFactory.getCostControls('development');
        
        console.log('   Environment: development');
        console.log('   Thresholds: Warning=$1.00, Critical=$2.00, Maximum=$5.00');
        console.log();
        
        // Simulate a series of API calls with different costs
        console.log('2. Simulating API Calls with Cost Tracking:');
        
        // Content generation calls
        console.log('   📝 Content Generation Calls:');
        await costControls.trackCost('content', 0.15, { 
            model: 'claude-3-haiku', 
            tokens: 600, 
            operation: 'script_generation' 
        });
        
        await costControls.trackCost('content', 0.08, { 
            model: 'claude-3-haiku', 
            tokens: 320, 
            operation: 'title_generation' 
        });
        
        // Audio generation calls
        console.log('   🎵 Audio Generation Calls:');
        await costControls.trackCost('audio', 0.12, { 
            engine: 'standard', 
            characters: 3000, 
            voice: 'Joanna',
            operation: 'voice_synthesis' 
        });
        
        // Video generation calls
        console.log('   🎬 Video Generation Calls:');
        await costControls.trackCost('video', 0.45, { 
            model: 'nova-reel', 
            duration: 8, 
            resolution: '1920x1080',
            operation: 'video_generation' 
        });
        
        console.log();
        
        // Show current status
        console.log('3. Current Cost Status:');
        const summary1 = costControls.getCostSummary();
        console.log(`   Daily Spend: $${summary1.dailySpend.toFixed(2)}`);
        console.log(`   Status: ${summary1.status.toUpperCase()}`);
        
        // Show service breakdown
        console.log('\n   Service Breakdown:');
        Object.entries(summary1.serviceBreakdown).forEach(([service, data]) => {
            console.log(`   - ${service}: $${data.amount.toFixed(2)} (${data.percentage.toFixed(1)}%)`);
        });
        
        console.log();
        
        // Trigger warning threshold
        console.log('4. Triggering Warning Threshold:');
        await costControls.trackCost('content', 0.50, { 
            model: 'claude-3-haiku', 
            tokens: 2000, 
            operation: 'long_content_generation' 
        });
        
        const summary2 = costControls.getCostSummary();
        console.log(`   Status after additional cost: ${summary2.status.toUpperCase()}`);
        
        if (summary2.recommendations.length > 0) {
            console.log('   Recommendations:');
            summary2.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
                if (rec.priority) console.log(`      Priority: ${rec.priority}`);
            });
        }
        
        console.log();
        
        // Trigger critical threshold
        console.log('5. Triggering Critical Threshold:');
        await costControls.trackCost('video', 0.85, { 
            model: 'nova-reel', 
            duration: 15, 
            resolution: '1920x1080',
            operation: 'extended_video_generation' 
        });
        
        const summary3 = costControls.getCostSummary();
        console.log(`   Status after critical threshold: ${summary3.status.toUpperCase()}`);
        console.log(`   Mock mode activated: ${costControls.shouldUseMock('content') ? 'YES' : 'NO'}`);
        
        console.log();
        
        // Show comprehensive cost summary
        console.log('6. Comprehensive Cost Summary:');
        const finalSummary = costControls.getCostSummary();
        
        console.log(`   Environment: ${finalSummary.environment}`);
        console.log(`   Total Daily Spend: $${finalSummary.dailySpend.toFixed(2)}`);
        console.log(`   Current Status: ${finalSummary.status.toUpperCase()}`);
        
        console.log('\n   Thresholds:');
        console.log(`   - Warning: $${finalSummary.thresholds.warning.toFixed(2)}`);
        console.log(`   - Critical: $${finalSummary.thresholds.critical.toFixed(2)}`);
        console.log(`   - Maximum: $${finalSummary.thresholds.maximum.toFixed(2)}`);
        
        console.log('\n   Service Breakdown:');
        Object.entries(finalSummary.serviceBreakdown).forEach(([service, data]) => {
            console.log(`   - ${service.padEnd(8)}: $${data.amount.toFixed(2).padStart(6)} (${data.percentage.toFixed(1).padStart(4)}%)`);
        });
        
        if (finalSummary.recommendations.length > 0) {
            console.log('\n   Active Recommendations:');
            finalSummary.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
                if (rec.priority) console.log(`      Priority: ${rec.priority}`);
            });
        }
        
        console.log();
        
        // Compare with production environment
        console.log('7. Production Environment Comparison:');
        const prodCostControls = ConfigurationFactory.getCostControls('production');
        
        // Same cost amount in production
        await prodCostControls.trackCost('content', finalSummary.dailySpend);
        const prodSummary = prodCostControls.getCostSummary();
        
        console.log(`   Development Status: ${finalSummary.status.toUpperCase()}`);
        console.log(`   Production Status: ${prodSummary.status.toUpperCase()}`);
        console.log(`   Production Thresholds: Warning=$${prodSummary.thresholds.warning}, Critical=$${prodSummary.thresholds.critical}`);
        
        console.log();
        
        // Demonstrate daily reset
        console.log('8. Daily Reset Demonstration:');
        console.log(`   Before reset: $${costControls.getDailySpend().toFixed(2)}`);
        costControls.resetDailySpend();
        console.log(`   After reset: $${costControls.getDailySpend().toFixed(2)}`);
        
        console.log();
        
        // Show cost savings summary
        console.log('=== Cost Tracking Benefits ===');
        console.log('✅ Real-time cost monitoring with detailed breakdowns');
        console.log('✅ Environment-specific thresholds (dev: $2, prod: $100)');
        console.log('✅ Automatic alerts at warning and critical levels');
        console.log('✅ Intelligent recommendations for cost optimization');
        console.log('✅ Service-level spending analysis');
        console.log('✅ Automatic mock mode activation to prevent overruns');
        console.log('✅ Historical data persistence for reporting');
        console.log('✅ Robust error handling and validation');
        
    } catch (error) {
        console.error('Enhanced cost tracking demo failed:', error);
    }
}

// Run the demo
if (require.main === module) {
    demonstrateEnhancedCostTracking();
}

module.exports = { demonstrateEnhancedCostTracking };