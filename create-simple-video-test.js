const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: 'us-east-1' });

async function createSimpleVideoTest() {
  console.log('🎬 Creating Simple Video Test...\n');

  // Use the existing working video generation approach
  const testRequest = {
    topic: 'AI Trends 2025',
    scriptPrompt: 'AI is transforming technology in 2025',
    trendId: `test-${Date.now()}`,
    videoConfig: {
      durationSeconds: 6,
      fps: 24,
      dimension: '1280x720',
      quality: 'high',
      includeAudio: true
    }
  };

  console.log('📋 Request:', JSON.stringify(testRequest, null, 2));
  console.log('\n🚀 Generating video...');

  try {
    const command = new InvokeCommand({
      FunctionName: 'youtube-automation-video-generator',
      Payload: JSON.stringify(testRequest)
    });

    const response = await lambda.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('\n📋 Result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.videoS3Key) {
      console.log('\n✅ SUCCESS! Video created');
      console.log(`📁 Video: ${result.videoS3Key}`);
      console.log(`💰 Cost: $${result.generationCost}`);
      
      // Try to upload to YouTube
      await uploadToYouTube(result);
    } else {
      console.log('\n❌ Video generation failed');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

async function uploadToYouTube(videoResult) {
  console.log('\n📤 Uploading to YouTube...');
  
  const uploadRequest = {
    videoS3Key: videoResult.videoS3Key,
    audioS3Key: videoResult.audioS3Key,
    metadata: {
      title: 'AI Trends 2025 - Test Video',
      description: 'Test video created with AI automation',
      tags: ['AI', 'technology', 'automation', 'test'],
      categoryId: '28',
      privacyStatus: 'public'
    }
  };

  try {
    const command = new InvokeCommand({
      FunctionName: 'youtube-automation-youtube-uploader',
      Payload: JSON.stringify(uploadRequest)
    });

    const response = await lambda.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.success) {
      console.log('✅ Uploaded to YouTube!');
      console.log(`🔗 URL: ${result.youtubeUrl}`);
      return result;
    } else {
      console.log('❌ Upload failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
  }
}

createSimpleVideoTest();