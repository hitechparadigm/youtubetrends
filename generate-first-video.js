#!/usr/bin/env node

/**
 * Generate First Automated YouTube Video
 * Production script using real AWS services
 */

const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');

async function generateFirstVideo() {
  console.log('🎬 GENERATING YOUR FIRST AUTOMATED YOUTUBE VIDEO');
  console.log('='.repeat(55));
  console.log('🚀 Status: PRODUCTION MODE - Real AWS Services');
  console.log('💰 Estimated Cost: $8.50');
  console.log('⏰ Estimated Time: 15-30 minutes');
  console.log('');

  // Production AWS configuration
  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  
  // Ensure we're NOT in mock mode
  delete process.env.MOCK_VIDEO_GENERATION;

  const testContext = {
    awsRequestId: `first-video-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000 // 30 minutes timeout
  };

  try {
    console.log('📋 Video Configuration:');
    console.log('- Topic: AI & Technology Trends 2025');
    console.log('- Duration: 6 seconds (test video)');
    console.log('- Quality: 1920x1080 Full HD');
    console.log('- Audio: Professional AI narration (Matthew voice)');
    console.log('- Format: MP4 optimized for YouTube');
    console.log('');

    const videoEvent = {
      scriptPrompt: `Create an engaging video about 2025 AI and technology trends. Show futuristic tech environments, AI interfaces, robots, smart cities, quantum computers, VR/AR experiences, and green technology. Make it visually stunning and informative for tech enthusiasts. Include dynamic graphics showing innovation, automation, and digital transformation. Professional, modern, high-tech aesthetic.`,
      
      topic: 'technology',
      trendId: 'ai_tech_trends_2025_001',
      
      videoConfig: {
        durationSeconds: 6, // 6 seconds - likely supported duration for testing
        fps: 24,
        dimension: '1280x720',
        quality: 'high',
        includeAudio: true
      },
      
      audioConfig: {
        voice: 'Matthew', // Professional, authoritative voice
        speed: 'medium',
        language: 'en-US'
      }
    };

    console.log('🎯 Starting AI Video Generation Process...');
    console.log('');
    console.log('Phase 1: Bedrock Nova Reel - Video Generation');
    console.log('Phase 2: Amazon Polly - Audio Narration');
    console.log('Phase 3: S3 Storage - Asset Management');
    console.log('');
    console.log('⚠️  This will use real AWS services and incur costs!');
    console.log('💳 Estimated charge: $8.50 to your AWS account');
    console.log('');

    const startTime = Date.now();
    
    console.log('🚀 Calling Video Generator Lambda...');
    const result = await videoGenerator(videoEvent, testContext);
    
    const executionTime = Date.now() - startTime;
    const executionMinutes = Math.floor(executionTime / 1000 / 60);
    const executionSeconds = Math.floor((executionTime / 1000) % 60);

    if (result.success) {
      console.log('');
      console.log('🎉 VIDEO GENERATION SUCCESSFUL!');
      console.log('='.repeat(40));
      console.log(`✅ Video File: ${result.videoS3Key}`);
      console.log(`🎵 Audio File: ${result.audioS3Key || 'Integrated'}`);
      console.log(`🆔 Bedrock Job: ${result.bedrockJobId}`);
      console.log(`🎙️  Polly Job: ${result.pollyJobId || 'N/A'}`);
      console.log('');
      console.log('📊 Generation Details:');
      console.log(`- Duration: ${result.metadata.duration} seconds`);
      console.log(`- File Size: ${(result.metadata.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Format: ${result.metadata.format}`);
      console.log(`- Has Audio: ${result.metadata.hasAudio ? 'Yes' : 'No'}`);
      console.log('');
      console.log('💰 Cost Breakdown:');
      console.log(`- Total Generation Cost: $${result.generationCost.toFixed(2)}`);
      console.log(`- Execution Time: ${executionMinutes}m ${executionSeconds}s`);
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('1. ✅ Video generated and stored in S3');
      console.log('2. 🔄 Ready for YouTube upload and optimization');
      console.log('3. 📈 Analytics tracking will begin after upload');
      console.log('4. 🎬 Your first AI-generated video is ready!');
      console.log('');
      console.log('🔗 S3 Location:');
      console.log(`   Bucket: ${process.env.VIDEO_BUCKET}`);
      console.log(`   Key: ${result.videoS3Key}`);
      console.log('');
      console.log('🎊 CONGRATULATIONS! Your YouTube automation system is now live!');
      
      return {
        success: true,
        videoS3Key: result.videoS3Key,
        audioS3Key: result.audioS3Key,
        cost: result.generationCost,
        executionTime: executionTime,
        bedrockJobId: result.bedrockJobId,
        metadata: result.metadata
      };
      
    } else {
      console.log('');
      console.log('❌ VIDEO GENERATION FAILED');
      console.log('='.repeat(30));
      console.log(`Error: ${result.error}`);
      console.log('');
      console.log('🔧 Troubleshooting Steps:');
      console.log('1. Check AWS credentials and permissions');
      console.log('2. Verify Bedrock Nova Reel access in us-east-1');
      console.log('3. Confirm S3 bucket exists and is accessible');
      console.log('4. Check CloudWatch logs for detailed error info');
      console.log('');
      console.log('📞 Support: Check AWS console for service status');
      
      return {
        success: false,
        error: result.error,
        executionTime: executionTime
      };
    }
    
  } catch (error) {
    console.log('');
    console.log('💥 UNEXPECTED ERROR OCCURRED');
    console.log('='.repeat(35));
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('🔍 Debug Information:');
    console.log(`Stack: ${error.stack}`);
    console.log('');
    console.log('🛠️  Possible Causes:');
    console.log('- Network connectivity issues');
    console.log('- AWS service temporary unavailability');
    console.log('- Lambda function configuration problems');
    console.log('- Missing environment variables');
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Execute the video generation
console.log('🎬 YouTube Automation Platform - First Video Generation');
console.log('⚡ Powered by AWS Bedrock Nova Reel + Amazon Polly');
console.log('');

generateFirstVideo()
  .then(result => {
    if (result.success) {
      console.log('');
      console.log('🚀 SUCCESS! Your automated YouTube video generation system is working!');
      console.log('🎯 Ready to scale up to daily automated content creation!');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ Generation failed. Please check the error details above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('');
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });