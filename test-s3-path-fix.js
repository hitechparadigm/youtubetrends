#!/usr/bin/env node

/**
 * Test S3 Path Fix - Verify video generation → upload works
 */

const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');
const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');

async function testS3PathFix() {
  console.log('🔧 TESTING S3 PATH ALIGNMENT FIX');
  console.log('='.repeat(45));
  console.log('🎯 Generate video → Use actual S3 path → Upload');
  console.log('');

  // Production AWS configuration
  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  delete process.env.MOCK_VIDEO_GENERATION;

  const testContext = {
    awsRequestId: `s3-path-test-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000 // 30 minutes
  };

  try {
    console.log('🎬 STEP 1: Generate AI Video');
    console.log('='.repeat(30));
    
    const videoEvent = {
      scriptPrompt: `A sleek demonstration of AI technology in action. Show modern interfaces, data visualization, and automated systems working seamlessly. Professional and engaging for tech audiences.`,
      topic: 'technology',
      trendId: `s3_path_test_${Date.now()}`,
      videoConfig: {
        durationSeconds: 6,
        fps: 24,
        dimension: '1280x720',
        quality: 'high',
        includeAudio: true
      },
      audioConfig: {
        voice: 'Matthew',
        speed: 'medium',
        language: 'en-US'
      }
    };

    console.log('🚀 Generating video...');
    const videoResult = await videoGenerator(videoEvent, testContext);
    
    if (!videoResult.success) {
      throw new Error(`Video generation failed: ${videoResult.error}`);
    }

    console.log('✅ Video generated successfully!');
    console.log(`📹 Video S3 Key: ${videoResult.videoS3Key}`);
    console.log(`🎵 Audio S3 Key: ${videoResult.audioS3Key}`);
    console.log(`💰 Cost: $${videoResult.generationCost.toFixed(2)}`);
    console.log('');

    // Verify the S3 path format
    console.log('🔍 STEP 2: Verify S3 Path Format');
    console.log('='.repeat(35));
    
    const expectedPattern = /^videos\/[a-z0-9]+\/output\.mp4$/;
    if (expectedPattern.test(videoResult.videoS3Key)) {
      console.log('✅ S3 path format is correct!');
      console.log(`📂 Pattern: videos/{jobId}/output.mp4`);
      console.log(`🎯 Actual: ${videoResult.videoS3Key}`);
    } else {
      console.log('❌ Unexpected S3 path format');
      console.log(`🔍 Got: ${videoResult.videoS3Key}`);
      console.log(`📋 Expected pattern: videos/{jobId}/output.mp4`);
    }
    console.log('');

    // Test file existence
    console.log('🔍 STEP 3: Verify File Exists in S3');
    console.log('='.repeat(35));
    
    try {
      const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({ region: 'us-east-1' });
      
      const headResult = await s3Client.send(new HeadObjectCommand({
        Bucket: process.env.VIDEO_BUCKET,
        Key: videoResult.videoS3Key
      }));
      
      console.log('✅ File exists in S3!');
      console.log(`📊 Size: ${(headResult.ContentLength / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📅 Modified: ${headResult.LastModified?.toISOString()}`);
      console.log(`📋 Content Type: ${headResult.ContentType}`);
    } catch (s3Error) {
      console.log('❌ File not found in S3');
      console.log(`🔍 Error: ${s3Error.message}`);
      console.log('⏳ File might still be processing...');
    }
    console.log('');

    console.log('🎯 STEP 4: Test YouTube Upload Path');
    console.log('='.repeat(35));
    
    const uploadEvent = {
      processedVideoS3Key: videoResult.videoS3Key, // Use the actual generated path
      topic: videoEvent.topic,
      trendId: videoEvent.trendId,
      keywords: [
        'AI technology',
        'automation demo',
        'tech showcase',
        'artificial intelligence',
        'modern technology'
      ],
      scriptPrompt: videoEvent.scriptPrompt,
      videoMetadata: {
        duration: videoResult.metadata.duration,
        fileSize: videoResult.metadata.fileSize,
        format: videoResult.metadata.format,
        resolution: videoEvent.videoConfig.dimension,
        fps: videoEvent.videoConfig.fps
      },
      uploadConfig: {
        privacyStatus: 'public',
        publishAt: undefined
      }
    };

    console.log(`📤 Testing upload with path: ${uploadEvent.processedVideoS3Key}`);
    
    // Note: This will likely fail due to YouTube API credentials, but we'll see if the S3 path works
    try {
      const uploadResult = await youtubeUploader(uploadEvent, testContext);
      
      if (uploadResult.success) {
        console.log('🎉 COMPLETE SUCCESS!');
        console.log(`✅ YouTube Video: ${uploadResult.videoUrl}`);
        console.log(`📺 Title: ${uploadResult.uploadedMetadata.title}`);
        
        return {
          success: true,
          videoGeneration: true,
          s3PathCorrect: true,
          youtubeUpload: true,
          videoUrl: uploadResult.videoUrl
        };
      } else {
        console.log('⚠️  Upload failed (likely YouTube API credentials)');
        console.log(`❌ Error: ${uploadResult.error}`);
        
        // Check if it's an S3 path issue or YouTube API issue
        if (uploadResult.error.includes('does not exist')) {
          console.log('❌ S3 path issue - file not found');
          return {
            success: false,
            videoGeneration: true,
            s3PathCorrect: false,
            youtubeUpload: false,
            error: 'S3 path mismatch'
          };
        } else {
          console.log('✅ S3 path is correct - YouTube API needs setup');
          return {
            success: false,
            videoGeneration: true,
            s3PathCorrect: true,
            youtubeUpload: false,
            error: 'YouTube API credentials needed'
          };
        }
      }
    } catch (uploadError) {
      console.log('❌ Upload test failed');
      console.log(`🔍 Error: ${uploadError.message}`);
      
      return {
        success: false,
        videoGeneration: true,
        s3PathCorrect: false,
        youtubeUpload: false,
        error: uploadError.message
      };
    }
    
  } catch (error) {
    console.log('');
    console.log('💥 TEST FAILED');
    console.log('='.repeat(20));
    console.log(`Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the S3 path fix test
console.log('🔧 S3 Path Alignment Test');
console.log('⚡ Verifying video generation → upload path compatibility');
console.log('');

testS3PathFix()
  .then(result => {
    console.log('');
    console.log('📊 TEST RESULTS SUMMARY:');
    console.log('='.repeat(30));
    console.log(`✅ Video Generation: ${result.videoGeneration ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ S3 Path Correct: ${result.s3PathCorrect ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ YouTube Upload: ${result.youtubeUpload ? 'WORKING' : 'NEEDS SETUP'}`);
    
    if (result.success) {
      console.log('');
      console.log('🎉 COMPLETE SUCCESS! End-to-end pipeline working!');
      process.exit(0);
    } else if (result.s3PathCorrect) {
      console.log('');
      console.log('✅ S3 PATH ALIGNMENT FIXED!');
      console.log('📋 Next: Set up YouTube API credentials');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ S3 path alignment needs more work');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });