import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

async function testContentAnalyzer() {
  console.log('📝 Testing Content Analyzer Lambda...');
  
  try {
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    // Sample trends data (simplified structure)
    const testEvent = {
      topic: 'technology',
      trendsData: [
        {
          videoId: 'test123',
          title: 'Top 15 New Technology Trends That Will Decide Who Rules The World',
          description: 'Technology trends analysis...',
          viewCount: 3079,
          likeCount: 130,
          commentCount: 2,
          publishedAt: '2025-10-02T21:32:43Z',
          channelTitle: 'AI Uncovered',
          categoryId: '28',
          keywords: ['technology', 'trends', 'AI', 'future'],
          engagementScore: 2.05,
          topic: 'technology',
          timestamp: new Date().toISOString()
        }
      ],
      maxVideos: 2,
      minEngagementScore: 0.02
    };

    console.log('📤 Invoking Content Analyzer Lambda...');
    console.log('Input:', JSON.stringify(testEvent, null, 2));
    
    const response = await lambdaClient.send(new InvokeCommand({
      FunctionName: 'youtube-automation-content-analyzer',
      Payload: JSON.stringify(testEvent)
    }));

    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('\n📊 Content Analysis Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📂 Topic: ${result.topic}`);
    console.log(`📈 Selected Trends: ${result.selectedTrends?.length || 0}`);
    console.log(`📝 Script Prompts: ${result.scriptPrompts?.length || 0}`);
    console.log(`⏱️ Execution Time: ${result.executionTime}ms`);
    
    if (result.scriptPrompts && result.scriptPrompts.length > 0) {
      console.log('\n🎯 Generated Script Prompts:');
      for (let i = 0; i < result.scriptPrompts.length; i++) {
        const prompt = result.scriptPrompts[i];
        console.log(`\n${i + 1}. ${prompt.title}`);
        console.log(`   🏷️ Keywords: ${prompt.keywords?.slice(0, 3).join(', ')}`);
        console.log(`   ⏱️ Estimated Length: ${prompt.estimatedLength} seconds`);
        console.log(`   📝 Prompt: ${prompt.prompt.substring(0, 100)}...`);
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
testContentAnalyzer();