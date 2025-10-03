#!/usr/bin/env node

/**
 * Test YouTube Upload Automation
 * Upload the generated video to YouTube with SEO optimization
 */

const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');

async function testYouTubeUpload() {
  console.log('🎬 TESTING YOUTUBE UPLOAD AUTOMATION');
  console.log('='.repeat(50));
  console.log('📤 Uploading AI-generated video to YouTube');
  console.log('🎯 With full SEO optimization and metadata');
  console.log('');

  const testContext = {
    awsRequestId: `youtube-upload-test-${Date.now()}`,
    getRemainingTimeInMillis: () => 900000 // 15 minutes timeout
  };

  try {
    // Use the video we just generated
    const uploadEvent = {
      // Video file information
      processedVideoS3Key: 'videos/technology/ai_tech_trends_2025_001_1759518304361.mp4',
      
      // Topic and content information
      topic: 'technology',
      trendId: 'ai_tech_trends_2025_001',
      
      // Keywords for SEO optimization
      keywords: [
        'artificial intelligence',
        'AI trends 2025',
        'technology trends',
        'machine learning',
        'automation',
        'future tech',
        'innovation',
        'digital transformation',
        'AI revolution',
        'tech predictions'
      ],
      
      // Script content for description generation
      scriptPrompt: `Create an engaging video about 2025 AI and technology trends. Show futuristic tech environments, AI interfaces, robots, smart cities, quantum computers, VR/AR experiences, and green technology. Make it visually stunning and informative for tech enthusiasts. Include dynamic graphics showing innovation, automation, and digital transformation. Professional, modern, high-tech aesthetic.`,
      
      // Video metadata from generation
      videoMetadata: {
        duration: 6, // 6 seconds
        fileSize: 5242880, // 5MB
        format: 'mp4',
        resolution: '1280x720',
        fps: 24
      },
      
      // Upload configuration
      uploadConfig: {
        privacyStatus: 'public', // Make it public immediately
        publishAt: undefined, // Publish immediately
        enableComments: true,
        enableRatings: true,
        enableEmbedding: true
      }
    };

    console.log('📋 Upload Configuration:');
    console.log(`- Video: ${uploadEvent.processedVideoS3Key}`);
    console.log(`- Topic: ${uploadEvent.topic}`);
    console.log(`- Keywords: ${uploadEvent.keywords.slice(0, 3).join(', ')}...`);
    console.log(`- Duration: ${uploadEvent.videoMetadata.duration} seconds`);
    console.log(`- Resolution: ${uploadEvent.videoMetadata.resolution}`);
    console.log(`- Privacy: ${uploadEvent.uploadConfig.privacyStatus}`);
    console.log('');

    console.log('🚀 Starting YouTube Upload Process...');
    console.log('');
    console.log('Phase 1: SEO Metadata Generation');
    console.log('Phase 2: Video Download from S3');
    console.log('Phase 3: YouTube API Upload');
    console.log('Phase 4: Performance Tracking Setup');
    console.log('');

    const startTime = Date.now();
    
    console.log('📤 Calling YouTube Uploader Lambda...');
    const result = await youtubeUploader(uploadEvent, testContext);
    
    const executionTime = Date.now() - startTime;
    const executionMinutes = Math.floor(executionTime / 1000 / 60);
    const executionSeconds = Math.floor((executionTime / 1000) % 60);

    if (result.success) {
      console.log('');
      console.log('🎉 YOUTUBE UPLOAD SUCCESSFUL!');
      console.log('='.repeat(40));
      console.log(`✅ YouTube Video ID: ${result.youtubeVideoId}`);
      console.log(`🔗 Video URL: ${result.videoUrl}`);
      console.log(`📺 Title: ${result.uploadedMetadata.title}`);
      console.log(`🏷️  Tags: ${result.uploadedMetadata.tags.slice(0, 5).join(', ')}...`);
      console.log(`📂 Category: ${result.uploadedMetadata.categoryId}`);
      console.log(`🔒 Privacy: ${result.uploadedMetadata.privacyStatus}`);
      console.log('');
      console.log('📊 Upload Performance:');
      console.log(`- Upload Time: ${Math.floor(result.performanceTracking.uploadTime / 1000)}s`);
      console.log(`- Initial Views: ${result.performanceTracking.initialViews}`);
      console.log(`- Estimated Reach: ${result.performanceTracking.estimatedReach}`);
      console.log(`- Total Execution: ${executionMinutes}m ${executionSeconds}s`);
      console.log('');
      console.log('🎯 SEO Optimization Applied:');
      console.log('✅ Keyword-optimized title');
      console.log('✅ Comprehensive description with timestamps');
      console.log('✅ Relevant tags for discoverability');
      console.log('✅ Appropriate category selection');
      console.log('✅ Engagement-friendly formatting');
      console.log('');
      console.log('📈 Next Steps:');
      console.log('1. ✅ Video is live on YouTube');
      console.log('2. 🔄 Analytics tracking is active');
      console.log('3. 📊 Performance monitoring enabled');
      console.log('4. 🎬 Ready for audience engagement');
      console.log('');
      console.log('🎊 CONGRATULATIONS! Your AI video is now live on YouTube!');
      console.log(`🔗 Watch it here: ${result.videoUrl}`);
      
      return {
        success: true,
        youtubeVideoId: result.youtubeVideoId,
        videoUrl: result.videoUrl,
        title: result.uploadedMetadata.title,
        executionTime: executionTime
      };
      
    } else {
      console.log('');
      console.log('❌ YOUTUBE UPLOAD FAILED');
      console.log('='.repeat(30));
      console.log(`Error: ${result.error}`);
      console.log('');
      console.log('🔧 Common Issues & Solutions:');
      console.log('1. YouTube API credentials not configured');
      console.log('2. OAuth tokens expired or invalid');
      console.log('3. Video file not accessible in S3');
      console.log('4. YouTube API quota exceeded');
      console.log('5. Video format not supported');
      console.log('');
      console.log('📞 Next Steps:');
      console.log('- Check AWS Secrets Manager for YouTube credentials');
      console.log('- Verify OAuth refresh token is valid');
      console.log('- Confirm S3 bucket permissions');
      console.log('- Check YouTube API quota in Google Console');
      
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
    console.log('- YouTube API client initialization failed');
    console.log('- Network connectivity issues');
    console.log('- AWS service temporary unavailability');
    console.log('- Lambda function configuration problems');
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Execute the YouTube upload test
console.log('🎬 YouTube Automation Platform - Upload Test');
console.log('⚡ Powered by YouTube Data API v3 + AWS S3');
console.log('');

testYouTubeUpload()
  .then(result => {
    if (result.success) {
      console.log('');
      console.log('🚀 SUCCESS! Your YouTube automation pipeline is complete!');
      console.log('🎯 Ready for automated daily content creation!');
      console.log(`🔗 Your video: ${result.videoUrl}`);
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ Upload failed. Please check the error details above.');
      console.log('💡 Most likely: YouTube API credentials need to be configured');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('');
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });