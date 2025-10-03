import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

async function testYouTubeUpload() {
  console.log('🎬 Testing YouTube Upload Capability...');
  
  try {
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    // Test event for YouTube uploader
    const testEvent = {
      processedVideoS3Key: 'test/sample-video.mp4', // This would need to be a real video
      topic: 'technology',
      trendId: 'test_trend_123',
      scriptPrompt: 'Test video about AI and technology trends',
      keywords: ['artificial intelligence', 'technology', 'AI trends', 'innovation'],
      videoMetadata: {
        duration: 300, // 5 minutes
        fileSize: 50000000, // 50MB
        format: 'mp4',
        resolution: '1920x1080',
        isYouTubeOptimized: true
      },
      uploadConfig: {
        privacyStatus: 'unlisted', // Use unlisted for testing
        categoryId: '28' // Science & Technology
      }
    };

    console.log('📤 Invoking YouTube Uploader Lambda...');
    
    const response = await lambdaClient.send(new InvokeCommand({
      FunctionName: 'youtube-automation-youtube-uploader',
      Payload: JSON.stringify(testEvent)
    }));

    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.success) {
      console.log('✅ YouTube Upload Test Successful!');
      console.log(`📺 Video ID: ${result.youtubeVideoId}`);
      console.log(`🔗 Video URL: ${result.videoUrl}`);
      console.log(`📝 Title: ${result.uploadedMetadata.title}`);
      console.log(`⏱️ Upload Time: ${result.performanceTracking.uploadTime}ms`);
    } else {
      console.log('❌ YouTube Upload Test Failed:');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('🚨 Test execution failed:', error);
  }
}

// Run the test
testYouTubeUpload();