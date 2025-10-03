import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

async function testTrendDetectorDirect() {
  console.log('🔍 Testing Trend Detector Lambda Directly...');
  
  try {
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    // Test event for trend detector
    const testEvent = {
      topics: ['technology', 'investing'],
      region: 'US',
      maxResults: 10,
      hoursBack: 24
    };

    console.log('📤 Invoking Trend Detector Lambda...');
    console.log('Input:', JSON.stringify(testEvent, null, 2));
    
    const response = await lambdaClient.send(new InvokeCommand({
      FunctionName: 'youtube-automation-trend-detector',
      Payload: JSON.stringify(testEvent)
    }));

    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('\n📊 Trend Detection Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📈 Trends Detected: ${result.trendsDetected}`);
    console.log(`🏷️ Topics Analyzed: ${result.topicsAnalyzed?.join(', ')}`);
    console.log(`⏱️ Execution Time: ${result.executionTime}ms`);
    console.log(`📊 Quota Used: ${result.quotaUsed}`);
    
    if (result.results && result.results.length > 0) {
      console.log('\n🎯 Detailed Results:');
      for (const topicResult of result.results) {
        console.log(`\n📂 Topic: ${topicResult.topic}`);
        console.log(`   📈 Trends Found: ${topicResult.trendsFound}`);
        console.log(`   📊 Average Engagement: ${(topicResult.averageEngagement * 100).toFixed(2)}%`);
        
        if (topicResult.topTrend) {
          console.log(`   🏆 Top Trend: ${topicResult.topTrend.title}`);
          console.log(`   👀 Views: ${topicResult.topTrend.viewCount?.toLocaleString()}`);
          console.log(`   💬 Engagement: ${(topicResult.topTrend.engagementScore * 100).toFixed(2)}%`);
        }
      }
    }
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }

  } catch (error) {
    console.error('🚨 Test execution failed:', error);
  }
}

// Run the test
testTrendDetectorDirect();