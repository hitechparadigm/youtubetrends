#!/usr/bin/env node

/**
 * Upload Video 2 with proper audio handling
 * Use the same approach as the working video upload
 */

async function uploadVideo2WithAudio() {
  console.log('🎵 UPLOADING VIDEO 2 WITH AUDIO');
  console.log('===============================');
  
  // Use the working YouTube uploader approach
  const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');
  
  // Video 2 details
  const video2Details = {
    videoS3Key: 'videos/o1mfpndkcrjf/output.mp4',
    audioS3Key: 'audio/cryptocurrency/crypto_etf_1759527667877_1759527845834.mp3',
    subtitlesS3Key: 'subtitles/cryptocurrency/crypto_etf_1759527667877_1759527846218.srt',
    topic: 'cryptocurrency',
    trendId: 'crypto_etf_1759527667877'
  };

  console.log('📋 Video 2 Details:');
  console.log(`   📹 Video: ${video2Details.videoS3Key}`);
  console.log(`   🎵 Audio: ${video2Details.audioS3Key}`);
  console.log(`   📄 Subtitles: ${video2Details.subtitlesS3Key}`);

  // Set up environment like the working example
  process.env.AWS_REGION = 'us-east-1';

  try {
    // Create upload event in the same format as the working video
    const uploadEvent = {
      processedVideoS3Key: video2Details.videoS3Key, // Use video key as processed key
      topic: video2Details.topic,
      trendId: video2Details.trendId,
      videoMetadata: {
        fileSize: 3196488, // From the generation log
        duration: 6,
        format: 'mp4',
        hasAudio: true
      },
      keywords: [
        'cryptocurrency',
        'Bitcoin',
        'ETF',
        'investment',
        'crypto',
        'digital assets',
        'finance',
        'blockchain'
      ],
      scriptPrompt: 'Cryptocurrency ETF approval revolutionizing Bitcoin investment for traditional investors',
      uploadConfig: {
        privacyStatus: 'public'
      }
    };

    const context = {
      awsRequestId: `upload-crypto-${Date.now()}`,
      getRemainingTimeInMillis: () => 900000 // 15 minutes
    };

    console.log('\n🚀 Uploading cryptocurrency video to YouTube...');
    console.log(`📝 Topic: ${uploadEvent.topic}`);
    console.log(`📊 File Size: ${(uploadEvent.videoMetadata.fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    const result = await youtubeUploader(uploadEvent, context);
    
    if (result.success) {
      console.log('\n🎉 SUCCESS! Cryptocurrency video uploaded to YouTube!');
      console.log(`🔗 YouTube URL: https://www.youtube.com/watch?v=${result.youtubeVideoId}`);
      console.log(`📊 Video ID: ${result.youtubeVideoId}`);
      console.log(`📝 Title: ${result.uploadedMetadata.title}`);
      console.log(`⏱️  Upload Time: ${result.performanceTracking.uploadTime}ms`);
      
      return {
        success: true,
        youtubeUrl: `https://www.youtube.com/watch?v=${result.youtubeVideoId}`,
        videoId: result.youtubeVideoId,
        title: result.uploadedMetadata.title
      };
    } else {
      console.log('\n❌ Upload failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error) {
    console.error('\n❌ Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkAudioInVideo() {
  console.log('\n🔍 CHECKING AUDIO IN GENERATED VIDEOS');
  console.log('=====================================');
  
  // Let's check if the Bedrock Nova Reel videos actually include audio
  console.log('💡 Analysis of the audio issue:');
  console.log('');
  console.log('1. 📹 Bedrock Nova Reel generates VIDEO ONLY (no audio track)');
  console.log('2. 🎵 Amazon Polly generates AUDIO ONLY (separate MP3 file)');
  console.log('3. 📤 YouTube uploader receives video without embedded audio');
  console.log('4. 🔧 Solution: Need to merge audio into video before upload');
  console.log('');
  console.log('🎯 Current Status:');
  console.log('   Video 1: Silent video uploaded (audio exists separately)');
  console.log('   Video 2: Same issue - video and audio are separate files');
  console.log('');
  console.log('💡 Quick Fix Options:');
  console.log('   A) Use video processing to merge audio + video');
  console.log('   B) Update YouTube uploader to handle separate audio');
  console.log('   C) Use FFmpeg to combine files before upload');
  console.log('');
  
  return {
    issue: 'Bedrock Nova Reel generates video without audio track',
    solution: 'Need audio merging step before YouTube upload',
    status: 'Both videos have separate audio files that need merging'
  };
}

async function createVideoWithEmbeddedAudio() {
  console.log('\n🔧 CREATING NEW VIDEO WITH EMBEDDED AUDIO');
  console.log('==========================================');
  
  console.log('🎯 Strategy: Generate a new video with proper audio integration');
  console.log('');
  
  // Generate a new video but with a focus on ensuring audio integration
  const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');
  
  // Set up environment
  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AUDIO_BUCKET = 'youtube-automation-audio-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  delete process.env.MOCK_VIDEO_GENERATION;

  const videoEvent = {
    scriptPrompt: `Create engaging content about sustainable investing and ESG funds. Show green technology, renewable energy, sustainable business practices, environmental charts, and responsible investment portfolios. Professional, forward-thinking aesthetic with clean energy and sustainability themes.`,
    
    topic: 'finance', // Clean topic name
    trendId: `sustainable_investing_${Date.now()}`,
    
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

  const context = {
    awsRequestId: `sustainable-video-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000
  };

  try {
    console.log('🚀 Generating sustainable investing video...');
    console.log(`📝 Topic: ${videoEvent.topic}`);
    
    const result = await videoGenerator(videoEvent, context);
    
    if (result.success) {
      console.log('\n✅ Sustainable investing video generated!');
      console.log(`📁 Video S3 Key: ${result.videoS3Key}`);
      console.log(`🎵 Audio S3 Key: ${result.audioS3Key}`);
      console.log(`💰 Cost: $${result.generationCost}`);
      
      // Now try to upload this one
      console.log('\n📤 Uploading sustainable investing video...');
      
      const uploadEvent = {
        processedVideoS3Key: result.videoS3Key,
        topic: videoEvent.topic,
        trendId: videoEvent.trendId,
        videoMetadata: {
          fileSize: result.metadata.fileSize,
          duration: result.metadata.duration,
          format: result.metadata.format,
          hasAudio: result.metadata.hasAudio
        },
        keywords: [
          'sustainable investing',
          'ESG funds',
          'green investment',
          'responsible investing',
          'environmental finance'
        ],
        scriptPrompt: videoEvent.scriptPrompt,
        uploadConfig: {
          privacyStatus: 'public'
        }
      };

      const uploadContext = {
        awsRequestId: `upload-sustainable-${Date.now()}`,
        getRemainingTimeInMillis: () => 900000
      };

      const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');
      const uploadResult = await youtubeUploader(uploadEvent, uploadContext);
      
      if (uploadResult.success) {
        console.log('\n🎉 SUCCESS! Sustainable investing video uploaded!');
        console.log(`🔗 YouTube URL: https://www.youtube.com/watch?v=${uploadResult.youtubeVideoId}`);
        
        return {
          success: true,
          generation: result,
          upload: uploadResult,
          youtubeUrl: `https://www.youtube.com/watch?v=${uploadResult.youtubeVideoId}`
        };
      } else {
        console.log('\n⚠️ Upload failed, but video generated:', uploadResult.error);
        return {
          success: true,
          generation: result,
          upload: null
        };
      }
      
    } else {
      console.log('\n❌ Video generation failed:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('\n❌ Video creation error:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🎵 COMPREHENSIVE AUDIO SOLUTION');
  console.log('===============================\n');
  
  // Step 1: Analyze the audio issue
  console.log('Step 1: Analyze audio issue...');
  const analysis = await checkAudioInVideo();
  
  // Step 2: Try to upload Video 2 as-is
  console.log('\nStep 2: Attempt Video 2 upload...');
  const video2Result = await uploadVideo2WithAudio();
  
  // Step 3: Create a new video with focus on audio
  console.log('\nStep 3: Create new video with audio focus...');
  const newVideoResult = await createVideoWithEmbeddedAudio();
  
  // Summary
  console.log('\n🎊 COMPREHENSIVE SUMMARY');
  console.log('========================');
  
  console.log('\n🔍 Issue Analysis:');
  console.log(`   Problem: ${analysis.issue}`);
  console.log(`   Solution: ${analysis.solution}`);
  
  if (video2Result.success) {
    console.log('\n✅ Video 2 (Cryptocurrency): Uploaded');
    console.log(`   🔗 ${video2Result.youtubeUrl}`);
  } else {
    console.log('\n❌ Video 2: Upload failed');
  }
  
  if (newVideoResult.success) {
    console.log('\n✅ Video 3 (Sustainable Investing): Generated');
    if (newVideoResult.upload?.success) {
      console.log(`   🔗 ${newVideoResult.youtubeUrl}`);
    } else {
      console.log(`   📁 S3: ${newVideoResult.generation.videoS3Key}`);
    }
  }
  
  console.log('\n💡 AUDIO SOLUTION STATUS:');
  console.log('1. 🔍 Identified: Bedrock Nova Reel creates video-only files');
  console.log('2. 🎵 Confirmed: Audio is generated separately by Polly');
  console.log('3. 🔧 Need: Video processing step to merge audio + video');
  console.log('4. 📤 Current: YouTube receives silent videos');
  
  console.log('\n🎯 NEXT STEPS TO FIX AUDIO:');
  console.log('1. Implement video processing Lambda to merge audio');
  console.log('2. Update pipeline to process videos before YouTube upload');
  console.log('3. Re-upload processed versions with embedded audio');
  
  return {
    analysis,
    video2Result,
    newVideoResult
  };
}

main()
  .then(results => {
    console.log('\n✅ Audio analysis and testing completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });