const { LambdaClient, InvokeCommand, GetFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');

// Configure AWS SDK v3
const lambda = new LambdaClient({ region: 'us-east-1' });

async function createTwoVideosNow() {
  console.log('🎬 Creating 2 Videos with Current System');
  console.log('=======================================\n');

  // Two different trending topics for variety
  const videoConfigs = [
    {
      name: 'AI Regulation Impact 2025',
      scriptPrompt: 'Create engaging content about AI regulation changes in 2025, focusing on how new government policies will impact tech companies, developers, and AI innovation. Include specific examples of compliance requirements and what businesses need to prepare for.',
      topic: 'AI Regulation 2025 - What Tech Companies Must Know',
      trendId: `trend-ai-reg-${Date.now()}`,
      videoConfig: {
        durationSeconds: 6, // Start with proven 6-second format
        fps: 24,
        dimension: '1280x720',
        quality: 'high',
        includeAudio: true
      },
      audioConfig: {
        voice: 'Matthew',
        speed: 'medium',
        language: 'en-US'
      },
      category: 'technology'
    },
    {
      name: 'Cryptocurrency ETF Revolution',
      scriptPrompt: 'Create compelling content about the cryptocurrency ETF approval and its impact on Bitcoin investment. Explain how this makes crypto more accessible to traditional investors and what it means for the future of digital assets.',
      topic: 'Crypto ETF Approved - Game Changer for Bitcoin Investment',
      trendId: `trend-crypto-etf-${Date.now()}`,
      videoConfig: {
        durationSeconds: 6, // Consistent format for reliability
        fps: 24,
        dimension: '1280x720',
        quality: 'high',
        includeAudio: true
      },
      audioConfig: {
        voice: 'Matthew',
        speed: 'medium',
        language: 'en-US'
      },
      category: 'finance'
    }
  ];

  const results = [];

  for (let i = 0; i < videoConfigs.length; i++) {
    const config = videoConfigs[i];
    
    try {
      console.log(`\n🎯 Creating Video ${i + 1}: ${config.name}`);
      console.log(`   Topic: ${config.topic}`);
      console.log(`   Category: ${config.category}`);
      console.log(`   Duration: ${config.videoConfig.durationSeconds}s`);
      
      const result = await createSingleVideo(config, i + 1);
      results.push(result);
      
      // Wait between videos to avoid rate limiting
      if (i < videoConfigs.length - 1) {
        console.log('\n⏳ Waiting 60 seconds before creating next video...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to create video ${i + 1}:`, error);
      results.push({
        videoNumber: i + 1,
        name: config.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n🎊 VIDEO CREATION SUMMARY');
  console.log('=========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful Videos: ${successful.length}/${results.length}`);
  console.log(`❌ Failed Videos: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎬 Successfully Created Videos:');
    successful.forEach(video => {
      console.log(`\n   📹 Video ${video.videoNumber}: ${video.name}`);
      if (video.youtubeUrl) {
        console.log(`      🔗 YouTube URL: ${video.youtubeUrl}`);
      }
      console.log(`      📝 Title: ${video.title || 'Generated'}`);
      console.log(`      ⏱️  Generation Time: ${video.generationTime}ms`);
      console.log(`      💰 Cost: $${video.cost}`);
      if (video.videoS3Key) {
        console.log(`      📁 Video S3: ${video.videoS3Key}`);
      }
      if (video.audioS3Key) {
        console.log(`      🎵 Audio S3: ${video.audioS3Key}`);
      }
    });
    
    const totalCost = successful.reduce((sum, v) => sum + v.cost, 0);
    const avgTime = successful.reduce((sum, v) => sum + v.generationTime, 0) / successful.length;
    
    console.log(`\n💰 Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`⏱️  Average Generation Time: ${(avgTime / 1000).toFixed(1)} seconds`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Videos:');
    failed.forEach(video => {
      console.log(`   Video ${video.videoNumber}: ${video.name} - ${video.error}`);
    });
  }

  return {
    totalVideos: results.length,
    successful: successful.length,
    failed: failed.length,
    results: results,
    totalCost: successful.reduce((sum, v) => sum + v.cost, 0)
  };
}

async function createSingleVideo(config, videoNumber) {
  const startTime = Date.now();
  
  console.log(`\n🎥 Step 1: Generating video with Bedrock Nova Reel...`);
  
  // Step 1: Generate video
  const videoResult = await generateVideo(config);
  
  console.log(`   ✅ Video generated successfully`);
  console.log(`   📁 Video S3 Key: ${videoResult.videoS3Key}`);
  if (videoResult.audioS3Key) {
    console.log(`   🎵 Audio S3 Key: ${videoResult.audioS3Key}`);
  }
  console.log(`   💰 Generation Cost: $${videoResult.generationCost}`);
  
  let youtubeResult = null;
  
  // Step 2: Upload to YouTube (if video generation was successful)
  if (videoResult.success && videoResult.videoS3Key) {
    try {
      console.log(`\n📤 Step 2: Uploading to YouTube...`);
      youtubeResult = await uploadToYouTube(videoResult, config);
      
      console.log(`   ✅ Video uploaded to YouTube`);
      console.log(`   🔗 YouTube URL: ${youtubeResult.youtubeUrl}`);
      console.log(`   📊 Video ID: ${youtubeResult.videoId}`);
      
    } catch (uploadError) {
      console.log(`   ⚠️ YouTube upload failed: ${uploadError.message}`);
      console.log(`   📁 Video is available in S3: ${videoResult.videoS3Key}`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  console.log(`\n✅ Video ${videoNumber} completed in ${(totalTime / 1000).toFixed(1)} seconds`);
  
  return {
    videoNumber,
    name: config.name,
    success: videoResult.success,
    title: config.topic,
    generationTime: totalTime,
    cost: videoResult.generationCost || 0.08,
    videoS3Key: videoResult.videoS3Key,
    audioS3Key: videoResult.audioS3Key,
    youtubeUrl: youtubeResult?.youtubeUrl,
    youtubeVideoId: youtubeResult?.videoId,
    metadata: {
      category: config.category,
      duration: config.videoConfig.durationSeconds,
      bedrockJobId: videoResult.bedrockJobId,
      pollyJobId: videoResult.pollyJobId
    }
  };
}

async function generateVideo(config) {
  console.log('   🎬 Invoking video generator Lambda...');
  
  const params = {
    FunctionName: 'youtube-automation-video-generator',
    Payload: JSON.stringify(config)
  };

  try {
    const command = new InvokeCommand(params);
    const response = await lambda.send(command);
    
    if (response.StatusCode !== 200) {
      throw new Error(`Lambda invocation failed with status ${response.StatusCode}`);
    }
    
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.errorMessage) {
      throw new Error(`Video generation failed: ${result.errorMessage}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('   ❌ Video generation error:', error);
    throw error;
  }
}

async function uploadToYouTube(videoResult, config) {
  console.log('   📤 Invoking YouTube uploader Lambda...');
  
  const uploadRequest = {
    videoS3Key: videoResult.videoS3Key,
    audioS3Key: videoResult.audioS3Key,
    metadata: {
      title: config.topic,
      description: `${config.topic}\n\nGenerated using AI automation platform. This video covers the latest developments and insights about ${config.category} trends.\n\n#${config.category} #AI #automation #trends`,
      tags: [
        config.category,
        'AI generated',
        'automation',
        'trends',
        '2025',
        config.category === 'technology' ? 'tech' : 'finance',
        config.category === 'technology' ? 'innovation' : 'investment'
      ],
      categoryId: config.category === 'technology' ? '28' : '25', // Science & Technology or News & Politics
      privacyStatus: 'public'
    }
  };

  const params = {
    FunctionName: 'youtube-automation-youtube-uploader',
    Payload: JSON.stringify(uploadRequest)
  };

  try {
    const command = new InvokeCommand(params);
    const response = await lambda.send(command);
    
    if (response.StatusCode !== 200) {
      throw new Error(`YouTube upload Lambda failed with status ${response.StatusCode}`);
    }
    
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (!result.success) {
      throw new Error(`YouTube upload failed: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('   ❌ YouTube upload error:', error);
    throw error;
  }
}

// Test individual components first
async function testSystemComponents() {
  console.log('🧪 Testing System Components...\n');
  
  const tests = [
    {
      name: 'Video Generator Lambda',
      functionName: 'youtube-automation-video-generator'
    },
    {
      name: 'YouTube Uploader Lambda',
      functionName: 'youtube-automation-youtube-uploader'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`🔍 Testing ${test.name}...`);
      
      const command = new GetFunctionConfigurationCommand({
        FunctionName: test.functionName
      });
      const config = await lambda.send(command);
      
      console.log(`   ✅ Function exists: ${test.functionName}`);
      console.log(`   📋 Runtime: ${config.Runtime}`);
      console.log(`   💾 Memory: ${config.MemorySize}MB`);
      console.log(`   ⏱️  Timeout: ${config.Timeout}s`);
      console.log(`   📊 State: ${config.State}`);
      
    } catch (error) {
      console.log(`   ❌ ${test.name} not available: ${error.message}`);
    }
    
    console.log('');
  }
}

// Main execution with component testing
async function main() {
  console.log('🎬 YOUTUBE AUTOMATION - CREATE 2 VIDEOS');
  console.log('========================================\n');
  
  try {
    // First, test that our components are available
    await testSystemComponents();
    
    // Then create the videos
    const results = await createTwoVideosNow();
    
    console.log('\n🎊 FINAL RESULTS');
    console.log('================');
    console.log(`📹 Videos Created: ${results.successful}/${results.totalVideos}`);
    console.log(`💰 Total Cost: $${results.totalCost.toFixed(4)}`);
    
    if (results.successful > 0) {
      console.log('\n🚀 SUCCESS! Your AI-generated videos are ready!');
      
      results.results.filter(r => r.success).forEach(video => {
        if (video.youtubeUrl) {
          console.log(`🔗 Video ${video.videoNumber}: ${video.youtubeUrl}`);
        } else {
          console.log(`📁 Video ${video.videoNumber}: Available in S3 (${video.videoS3Key})`);
        }
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Video creation process failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(results => {
      console.log('\n✅ Video creation process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Process failed:', error);
      process.exit(1);
    });
}

module.exports = {
  createTwoVideosNow,
  createSingleVideo,
  testSystemComponents,
  main
};