import { YouTubeApiClientSimple } from './src/services/youtube-api-client-simple';
import { TrendDetectionServiceSimple } from './src/services/trend-detection-service-simple';
import { TrendRepository } from './src/repositories/trend-repository';

async function testSimpleClient() {
  console.log('🧪 Testing Simple YouTube Client...');
  
  try {
    // Initialize the simple client
    const youtubeClient = new YouTubeApiClientSimple();
    await youtubeClient.initialize();
    
    // Test connection
    const connectionTest = await youtubeClient.testConnection();
    if (!connectionTest) {
      throw new Error('Connection test failed');
    }
    
    console.log('✅ Connection test passed');
    
    // Test search
    console.log('🔍 Testing search...');
    const searchResults = await youtubeClient.searchVideos('cooking', 5);
    console.log(`✅ Found ${searchResults.length} videos`);
    
    if (searchResults.length > 0) {
      console.log('First video:', searchResults[0].title);
      
      // Test video details
      console.log('📊 Testing video details...');
      const videoDetails = await youtubeClient.getVideoDetails([searchResults[0].videoId]);
      console.log(`✅ Got details for ${videoDetails.length} videos`);
      console.log('View count:', videoDetails[0].viewCount.toLocaleString());
    }
    
    // Test trending videos
    console.log('📈 Testing trending videos...');
    const trendingVideos = await youtubeClient.getTrendingVideos();
    console.log(`✅ Found ${trendingVideos.length} trending videos`);
    
    // Test quota usage
    const quota = youtubeClient.getQuotaUsage();
    console.log(`📊 Quota used: ${quota.used}/${quota.limit}`);
    
    console.log('\n🎉 All tests passed! Simple client is working perfectly.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testSimpleClient();