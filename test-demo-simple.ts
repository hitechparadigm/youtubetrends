import { YouTubeApiClientSimple } from './src/services/youtube-api-client-simple';
import { TrendDetectionServiceSimple } from './src/services/trend-detection-service-simple';
import { TrendRepository } from './src/repositories/trend-repository';

async function testDemoSimple() {
  console.log('🧪 Testing Demo with Simple Client...');
  
  try {
    // Initialize simple client
    const youtubeClient = new YouTubeApiClientSimple();
    await youtubeClient.initialize();
    
    // Test connection
    const connectionTest = await youtubeClient.testConnection();
    if (!connectionTest) {
      throw new Error('Connection test failed');
    }
    
    console.log('✅ Simple client initialized and connected');
    
    // Initialize trend detection service
    const trendRepository = new TrendRepository();
    const config = {
      topics: ['cooking'],
      regions: ['US'],
      maxResultsPerQuery: 5,
      hoursBack: 48
    };
    
    const trendService = new TrendDetectionServiceSimple(youtubeClient, trendRepository, config);
    
    // Test trend detection
    console.log('🔍 Testing trend detection...');
    const results = await trendService.detectTrends();
    
    console.log('✅ Trend detection results:');
    for (const result of results) {
      console.log(`  Topic: ${result.topic}`);
      console.log(`  Trends found: ${result.trendsFound}`);
      console.log(`  Average engagement: ${(result.averageEngagement * 100).toFixed(2)}%`);
      if (result.topTrend) {
        console.log(`  Top trend: ${result.topTrend.title}`);
        console.log(`  Views: ${result.topTrend.viewCount.toLocaleString()}`);
      }
    }
    
    console.log('\n🎉 Demo simple client test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Demo test failed:', error);
    return false;
  }
}

testDemoSimple();