/**
 * Test script for A/B Testing Framework
 * 
 * This script tests the comprehensive A/B testing functionality
 * including experiment management, user assignment, statistical analysis,
 * and integration with PromptTemplateManager.
 */

const ABTestManager = require('./ABTestManager');
const PromptTemplateManager = require('./PromptTemplateManager');
const ConfigurationManager = require('./ConfigurationManager');
const ConfigurationFactory = require('./ConfigurationFactory');

async function testABTestingFramework() {
    console.log('🧪 Testing A/B Testing Framework...\n');

    try {
        // Initialize managers
        const configManager = new ConfigurationManager({
            environment: 'test',
            region: 'us-east-1'
        });

        const abTestManager = new ABTestManager({
            environment: 'test',
            region: 'us-east-1',
            configManager
        });

        const templateManager = new PromptTemplateManager({
            environment: 'test',
            region: 'us-east-1',
            configManager,
            abTestManager
        });

        // Test 1: Create A/B test experiment
        console.log('📊 Test 1: Create A/B test experiment');
        
        const experimentConfig = {
            name: 'Script Template Optimization',
            description: 'Testing different script templates for investing content',
            templateType: 'script',
            topic: 'investing',
            variants: {
                control: { weight: 50 },
                variant_a: { weight: 30 },
                variant_b: { weight: 20 }
            },
            primaryMetric: 'conversion_rate',
            secondaryMetrics: ['engagement_rate', 'completion_rate'],
            duration: 14, // 14 days
            createdBy: 'test-user'
        };

        const experiment = await abTestManager.createExperiment(experimentConfig);
        console.log('✅ Created experiment:', experiment.id);
        console.log('   Name:', experiment.name);
        console.log('   Variants:', Object.keys(experiment.variants));
        console.log();

        // Test 2: Start experiment
        console.log('📊 Test 2: Start experiment');
        
        const startedExperiment = await abTestManager.startExperiment(experiment.id);
        console.log('✅ Started experiment:', startedExperiment.id);
        console.log('   Status:', startedExperiment.status);
        console.log('   Start Date:', startedExperiment.actualStartDate);
        console.log();

        // Test 3: User assignment and consistency
        console.log('📊 Test 3: User assignment and consistency');
        
        const testUsers = ['user-001', 'user-002', 'user-003', 'user-004', 'user-005'];
        const assignments = {};
        
        for (const userId of testUsers) {
            const assignment = await abTestManager.getUserAssignment(experiment.id, userId);
            assignments[userId] = assignment;
            console.log(`   ${userId} -> ${assignment.variant} (hash: ${assignment.hash})`);
        }
        
        // Test consistency - same user should get same assignment
        const consistencyTest = await abTestManager.getUserAssignment(experiment.id, 'user-001');
        const isConsistent = consistencyTest.variant === assignments['user-001'].variant;
        console.log('✅ Assignment consistency:', isConsistent ? 'PASS' : 'FAIL');
        console.log();

        // Test 4: Template integration with A/B testing
        console.log('📊 Test 4: Template integration with A/B testing');
        
        // Simulate template usage with A/B testing
        for (const userId of testUsers.slice(0, 3)) {
            const templateVariant = await templateManager.getTemplateVariant('script', 'investing', userId);
            console.log(`   ${userId} -> Template variant: ${templateVariant.variant}, Experiment: ${templateVariant.experiment}`);
            
            // Track template usage
            await templateManager.trackTemplateUsage(
                'script',
                'investing',
                templateVariant.variant,
                userId,
                templateVariant.experiment
            );
        }
        console.log();

        // Test 5: Event tracking
        console.log('📊 Test 5: Event tracking');
        
        // Simulate various events
        for (const userId of testUsers) {
            const assignment = assignments[userId];
            
            // Track assignment event (already done automatically)
            
            // Track template usage event
            await abTestManager.trackEvent(experiment.id, userId, 'template_render', {
                templateType: 'script',
                topic: 'investing',
                variant: assignment.variant
            });
            
            // Simulate conversion events (some users convert, some don't)
            const shouldConvert = Math.random() > 0.3; // 70% conversion rate
            if (shouldConvert) {
                await abTestManager.trackEvent(experiment.id, userId, 'conversion', {
                    conversionType: 'video_completion',
                    variant: assignment.variant,
                    value: 1
                });
            }
        }
        
        console.log('✅ Tracked events for all test users');
        console.log();

        // Test 6: Statistical significance calculation
        console.log('📊 Test 6: Statistical significance calculation');
        
        // Create mock metrics for testing
        const mockMetrics = {
            variants: {
                control: {
                    totalUsers: 100,
                    conversions: 10,
                    conversionRate: 0.10
                },
                variant_a: {
                    totalUsers: 100,
                    conversions: 16,
                    conversionRate: 0.16
                },
                variant_b: {
                    totalUsers: 100,
                    conversions: 8,
                    conversionRate: 0.08
                }
            }
        };
        
        const statisticalAnalysis = await abTestManager.calculateStatisticalSignificance(experiment.id, mockMetrics);
        
        console.log('✅ Statistical Analysis Results:');
        for (const [comparison, result] of Object.entries(statisticalAnalysis)) {
            if (comparison !== 'overall') {
                console.log(`   ${comparison}:`);
                console.log(`     Significant: ${result.significant}`);
                console.log(`     P-value: ${result.pValue?.toFixed(4) || 'N/A'}`);
                console.log(`     Effect: ${(result.effect * 100).toFixed(2)}%`);
                console.log(`     Relative Effect: ${(result.relativeEffect * 100).toFixed(2)}%`);
            }
        }
        console.log();

        // Test 7: Experiment results and recommendations
        console.log('📊 Test 7: Experiment results and recommendations');
        
        const results = await abTestManager.getExperimentResults(experiment.id);
        
        console.log('✅ Experiment Results:');
        console.log('   Experiment:', results.experiment.name);
        console.log('   Status:', results.experiment.status);
        console.log('   Recommendations:');
        console.log(`     Action: ${results.recommendations.action}`);
        console.log(`     Confidence: ${results.recommendations.confidence}`);
        console.log(`     Winner: ${results.recommendations.winner || 'None'}`);
        console.log(`     Reasons: ${results.recommendations.reasons.join(', ')}`);
        console.log();

        // Test 8: Template conversion tracking
        console.log('📊 Test 8: Template conversion tracking');
        
        // Simulate conversion tracking through template manager
        await templateManager.trackTemplateConversion(
            'script',
            'investing',
            'variant_a',
            'user-001',
            'video_completion',
            { duration: 8, engagement_score: 0.85 }
        );
        
        console.log('✅ Tracked template conversion event');
        console.log();

        // Test 9: Experiment lifecycle management
        console.log('📊 Test 9: Experiment lifecycle management');
        
        // Stop the experiment
        const stoppedExperiment = await abTestManager.stopExperiment(experiment.id, 'test_completion');
        
        console.log('✅ Stopped experiment:', stoppedExperiment.experiment.id);
        console.log('   Status:', stoppedExperiment.experiment.status);
        console.log('   Stop Reason:', stoppedExperiment.experiment.stopReason);
        console.log('   End Date:', stoppedExperiment.experiment.actualEndDate);
        console.log();

        // Test 10: Configuration Factory integration
        console.log('📊 Test 10: Configuration Factory integration');
        
        const factoryABTestManager = ConfigurationFactory.getABTestManager('test');
        const factoryTemplateManager = ConfigurationFactory.getTemplateManager('test');
        
        console.log('✅ Retrieved managers from ConfigurationFactory');
        console.log('   ABTestManager instance:', factoryABTestManager.constructor.name);
        console.log('   TemplateManager instance:', factoryTemplateManager.constructor.name);
        console.log();

        // Test 11: Hash consistency and distribution
        console.log('📊 Test 11: Hash consistency and distribution');
        
        // Create a new experiment for distribution testing since the previous one is stopped
        const distributionExperiment = await abTestManager.createExperiment({
            name: 'Distribution Test',
            templateType: 'script',
            topic: 'testing',
            variants: {
                control: { weight: 50 },
                variant_a: { weight: 30 },
                variant_b: { weight: 20 }
            }
        });
        
        await abTestManager.startExperiment(distributionExperiment.id);
        
        const hashDistribution = { control: 0, variant_a: 0, variant_b: 0 };
        const testUserCount = 1000;
        
        for (let i = 0; i < testUserCount; i++) {
            const userId = `test-user-${i}`;
            const assignment = await abTestManager.getUserAssignment(distributionExperiment.id, userId);
            if (assignment) {
                hashDistribution[assignment.variant]++;
            }
        }
        
        console.log('✅ Hash Distribution (1000 users):');
        console.log(`   Control: ${hashDistribution.control} (${(hashDistribution.control/testUserCount*100).toFixed(1)}%)`);
        console.log(`   Variant A: ${hashDistribution.variant_a} (${(hashDistribution.variant_a/testUserCount*100).toFixed(1)}%)`);
        console.log(`   Variant B: ${hashDistribution.variant_b} (${(hashDistribution.variant_b/testUserCount*100).toFixed(1)}%)`);
        console.log();

        console.log('🎉 All A/B Testing Framework tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testABTestingFramework();
}

module.exports = { testABTestingFramework };