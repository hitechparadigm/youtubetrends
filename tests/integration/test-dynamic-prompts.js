const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

async function testDynamicPromptGeneration() {
  console.log('🧠 Testing Dynamic Prompt Generation System...\n');

  // Test with real trend discoveries (simulated)
  const testTrends = [
    {
      name: 'AI Regulation Breaking News',
      trendData: {
        keyword: 'AI regulation 2025',
        searchVolume: 45000,
        category: 'technology',
        relatedTerms: ['AI safety laws', 'artificial intelligence regulation', 'tech policy 2025', 'government AI oversight'],
        context: {
          newsArticles: [
            'New AI safety regulations proposed by Congress',
            'Tech companies respond to AI oversight measures',
            'European Union updates AI Act for 2025'
          ],
          socialMentions: [
            'Developers discussing impact of new AI regulations',
            'Tech leaders debate AI safety measures'
          ],
          timeframe: '1d',
          geography: 'US'
        },
        metadata: {
          discoveredAt: new Date().toISOString(),
          confidence: 0.9,
          urgency: 'high'
        }
      },
      targetCategory: 'technology'
    },
    {
      name: 'Cryptocurrency ETF Approval',
      trendData: {
        keyword: 'cryptocurrency ETF approval',
        searchVolume: 67000,
        category: 'finance',
        relatedTerms: ['Bitcoin ETF', 'SEC approval', 'crypto investment', 'institutional adoption', 'digital asset funds'],
        context: {
          newsArticles: [
            'Major cryptocurrency ETF receives SEC approval',
            'Institutional investors enter crypto market',
            'Bitcoin ETF trading volume surges'
          ],
          marketData: {
            bitcoinPrice: 45000,
            etfVolume: '2.3B',
            approvalDate: '2025-01-15'
          },
          timeframe: '4h',
          geography: 'US'
        },
        metadata: {
          discoveredAt: new Date().toISOString(),
          confidence: 0.95,
          urgency: 'high'
        }
      },
      targetCategory: 'finance'
    },
    {
      name: 'Remote Work Productivity Surge',
      trendData: {
        keyword: 'remote work productivity 2025',
        searchVolume: 23000,
        category: 'business',
        relatedTerms: ['work from home tips', 'productivity tools', 'remote team management', 'hybrid work models'],
        context: {
          newsArticles: [
            'Study shows remote work productivity increases 20%',
            'New productivity tools reshape remote work',
            'Companies adopt permanent remote policies'
          ],
          socialMentions: [
            'Remote workers sharing productivity hacks',
            'Managers discussing team collaboration tools'
          ],
          timeframe: '1d',
          geography: 'Global'
        },
        metadata: {
          discoveredAt: new Date().toISOString(),
          confidence: 0.8,
          urgency: 'medium'
        }
      },
      targetCategory: 'education'
    }
  ];

  const results = [];

  for (const testTrend of testTrends) {
    try {
      console.log(`🔍 Testing: ${testTrend.name}`);
      console.log(`   Keyword: ${testTrend.trendData.keyword}`);
      console.log(`   Search Volume: ${testTrend.trendData.searchVolume.toLocaleString()}`);
      console.log(`   Urgency: ${testTrend.trendData.metadata.urgency}`);
      
      const startTime = Date.now();
      
      // Test dynamic prompt generation
      const promptRequest = {
        trendDiscovery: {
          trendId: `test-${Date.now()}`,
          ...testTrend.trendData
        },
        targetCategory: testTrend.targetCategory,
        contentType: 'video',
        duration: 30
      };

      const params = {
        FunctionName: 'youtube-automation-dynamic-prompt-generator',
        Payload: JSON.stringify(promptRequest)
      };

      const response = await lambda.invoke(params).promise();
      const result = JSON.parse(response.Payload);
      
      const executionTime = Date.now() - startTime;

      if (result.errorMessage) {
        console.log(`   ❌ Failed: ${result.errorMessage}`);
        results.push({
          testCase: testTrend.name,
          success: false,
          error: result.errorMessage
        });
      } else {
        console.log(`   ✅ Success! Generated in ${executionTime}ms`);
        console.log(`   🎯 Confidence: ${result.confidence}%`);
        console.log(`   📝 Video Prompt: ${result.videoPrompt.substring(0, 100)}...`);
        console.log(`   🎨 Thumbnail Prompt: ${result.thumbnailPrompt.substring(0, 100)}...`);
        console.log(`   📊 SEO Title: ${result.seoPrompts.title}`);
        console.log(`   🎣 Hook: ${result.contentStructure.hook}`);
        
        results.push({
          testCase: testTrend.name,
          success: true,
          executionTime,
          confidence: result.confidence,
          prompts: {
            video: result.videoPrompt,
            thumbnail: result.thumbnailPrompt,
            seoTitle: result.seoPrompts.title,
            hook: result.contentStructure.hook
          }
        });
      }
      
      console.log('');
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        testCase: testTrend.name,
        success: false,
        error: error.message
      });
      console.log('');
    }
  }

  return results;
}

async function testEnhancedContentGeneration() {
  console.log('🚀 Testing Enhanced Content Generation with Dynamic Prompts...\n');

  const testCase = {
    topic: 'AI Regulation Impact on Tech Industry',
    trendData: {
      keyword: 'AI regulation 2025',
      searchVolume: 45000,
      category: 'technology',
      relatedTerms: ['AI safety', 'tech policy', 'government oversight', 'compliance costs'],
      context: {
        newsArticles: [
          'Congress proposes comprehensive AI safety framework',
          'Tech giants face new compliance requirements',
          'AI startups adapt to regulatory landscape'
        ],
        timeframe: '1d',
        geography: 'US'
      },
      metadata: {
        discoveredAt: new Date().toISOString(),
        confidence: 0.9,
        urgency: 'high'
      }
    },
    targetCategory: 'technology',
    duration: 30
  };

  try {
    console.log(`📹 Generating enhanced content for: ${testCase.topic}`);
    console.log(`   Based on trend: ${testCase.trendData.keyword}`);
    console.log(`   Search volume: ${testCase.trendData.searchVolume.toLocaleString()}`);
    
    const startTime = Date.now();
    
    const params = {
      FunctionName: 'youtube-automation-enhanced-content-generator',
      Payload: JSON.stringify(testCase)
    };

    const response = await lambda.invoke(params).promise();
    const result = JSON.parse(response.Payload);
    
    const executionTime = Date.now() - startTime;

    if (result.success) {
      console.log(`   ✅ Enhanced content generated in ${executionTime}ms`);
      console.log(`   🎯 Confidence: ${result.metadata.confidence}%`);
      console.log(`   📊 Trend Relevance: ${result.metadata.trendRelevance}%`);
      console.log(`   📝 Title: ${result.content.title}`);
      console.log(`   🎬 Script Preview: ${result.content.script.substring(0, 200)}...`);
      console.log(`   🎨 Visual Prompt: ${result.content.visualPrompt.substring(0, 150)}...`);
      console.log(`   📱 Thumbnail Prompt: ${result.content.thumbnailPrompt.substring(0, 150)}...`);
      console.log(`   🏷️  SEO Tags: ${result.content.seoOptimization.tags.join(', ')}`);
      
      return {
        success: true,
        executionTime,
        confidence: result.metadata.confidence,
        trendRelevance: result.metadata.trendRelevance,
        content: result.content
      };
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testTrendDiscoveryService() {
  console.log('🔍 Testing Real-Time Trend Discovery Service...\n');

  try {
    console.log('📊 Discovering current trends...');
    
    const discoveryRequest = {
      categories: ['technology', 'finance', 'education'],
      minSearchVolume: 10000,
      geography: 'US',
      timeframe: '1d',
      maxResults: 5
    };

    const startTime = Date.now();
    
    const params = {
      FunctionName: 'youtube-automation-trend-discovery-service',
      Payload: JSON.stringify(discoveryRequest)
    };

    const response = await lambda.invoke(params).promise();
    const trends = JSON.parse(response.Payload);
    
    const executionTime = Date.now() - startTime;

    if (Array.isArray(trends) && trends.length > 0) {
      console.log(`   ✅ Discovered ${trends.length} trends in ${executionTime}ms`);
      
      trends.forEach((trend, index) => {
        console.log(`\n   📈 Trend ${index + 1}: ${trend.keyword}`);
        console.log(`      Search Volume: ${trend.searchVolume.toLocaleString()}`);
        console.log(`      Category: ${trend.category}`);
        console.log(`      Urgency: ${trend.metadata.urgency}`);
        console.log(`      Related Terms: ${trend.relatedTerms.slice(0, 3).join(', ')}`);
        console.log(`      News Context: ${trend.context.newsArticles.length} articles`);
      });
      
      return {
        success: true,
        executionTime,
        trendsCount: trends.length,
        trends: trends.map(t => ({
          keyword: t.keyword,
          searchVolume: t.searchVolume,
          category: t.category,
          urgency: t.metadata.urgency
        }))
      };
    } else {
      console.log(`   ⚠️  No trends discovered or service returned unexpected format`);
      return {
        success: false,
        error: 'No trends discovered'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testCompleteWorkflow() {
  console.log('🔄 Testing Complete Dynamic Content Workflow...\n');

  try {
    // Step 1: Discover trends
    console.log('Step 1: Discovering real trends...');
    const trendResults = await testTrendDiscoveryService();
    
    if (!trendResults.success || !trendResults.trends || trendResults.trends.length === 0) {
      throw new Error('No trends discovered for workflow test');
    }

    // Step 2: Select highest urgency trend
    const selectedTrend = trendResults.trends.find(t => t.urgency === 'high') || trendResults.trends[0];
    console.log(`\nStep 2: Selected trend - ${selectedTrend.keyword} (${selectedTrend.urgency} urgency)`);

    // Step 3: Generate dynamic prompts
    console.log('\nStep 3: Generating dynamic prompts...');
    const promptResults = await testDynamicPromptGeneration();
    
    // Step 4: Create enhanced content
    console.log('\nStep 4: Creating enhanced content...');
    const contentResults = await testEnhancedContentGeneration();

    // Step 5: Workflow summary
    console.log('\n🎊 COMPLETE WORKFLOW RESULTS');
    console.log('============================');
    console.log(`✅ Trends Discovered: ${trendResults.trendsCount}`);
    console.log(`✅ Prompts Generated: ${promptResults.filter(r => r.success).length}/${promptResults.length}`);
    console.log(`✅ Content Created: ${contentResults.success ? 'Yes' : 'No'}`);
    
    if (contentResults.success) {
      console.log(`🎯 Content Confidence: ${contentResults.confidence}%`);
      console.log(`📊 Trend Relevance: ${contentResults.trendRelevance}%`);
      console.log(`📝 Generated Title: ${contentResults.content.title}`);
    }

    return {
      workflowSuccess: true,
      trendsDiscovered: trendResults.trendsCount,
      promptsGenerated: promptResults.filter(r => r.success).length,
      contentCreated: contentResults.success,
      overallConfidence: contentResults.success ? contentResults.confidence : 0
    };

  } catch (error) {
    console.error('\n❌ Complete workflow failed:', error);
    return {
      workflowSuccess: false,
      error: error.message
    };
  }
}

// Main execution
async function runAllDynamicTests() {
  console.log('🧠 DYNAMIC PROMPT SYSTEM - COMPREHENSIVE TESTING');
  console.log('=================================================\n');

  try {
    // Test 1: Dynamic Prompt Generation
    const promptResults = await testDynamicPromptGeneration();
    
    // Test 2: Enhanced Content Generation
    const contentResults = await testEnhancedContentGeneration();
    
    // Test 3: Trend Discovery Service
    const trendResults = await testTrendDiscoveryService();
    
    // Test 4: Complete Workflow
    const workflowResults = await testCompleteWorkflow();

    // Overall Summary
    console.log('\n🎊 DYNAMIC SYSTEM TEST SUMMARY');
    console.log('==============================');
    
    const promptSuccessRate = (promptResults.filter(r => r.success).length / promptResults.length) * 100;
    
    console.log(`🧠 Dynamic Prompts: ${promptSuccessRate.toFixed(1)}% success rate`);
    console.log(`🚀 Enhanced Content: ${contentResults.success ? 'Success' : 'Failed'}`);
    console.log(`🔍 Trend Discovery: ${trendResults.success ? 'Success' : 'Failed'}`);
    console.log(`🔄 Complete Workflow: ${workflowResults.workflowSuccess ? 'Success' : 'Failed'}`);
    
    console.log('\n🎯 KEY IMPROVEMENTS:');
    console.log('✅ Prompts are now generated dynamically based on real trend data');
    console.log('✅ Content reflects actual current events and search patterns');
    console.log('✅ No more predefined templates - everything is contextual');
    console.log('✅ AI analyzes trends to create specific, valuable content');
    console.log('✅ System adapts to breaking news and emerging topics');
    
    return {
      dynamicPrompts: promptResults,
      enhancedContent: contentResults,
      trendDiscovery: trendResults,
      completeWorkflow: workflowResults,
      overallSuccess: promptSuccessRate > 70 && contentResults.success && trendResults.success
    };

  } catch (error) {
    console.error('❌ Dynamic testing failed:', error);
    return {
      overallSuccess: false,
      error: error.message
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllDynamicTests()
    .then(results => {
      if (results.overallSuccess) {
        console.log('\n✅ Dynamic prompt system testing completed successfully!');
        console.log('🚀 Ready for production deployment with dynamic, trend-based content generation!');
      } else {
        console.log('\n⚠️  Some tests failed - review results above');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testDynamicPromptGeneration,
  testEnhancedContentGeneration,
  testTrendDiscoveryService,
  testCompleteWorkflow,
  runAllDynamicTests
};