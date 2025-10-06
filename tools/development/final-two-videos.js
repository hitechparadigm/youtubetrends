#!/usr/bin/env node

/**
 * Final script to upload first video and create second with clean naming
 */

async function uploadFirstVideo() {
  console.log('📤 UPLOADING FIRST VIDEO TO YOUTUBE');
  console.log('===================================');
  
  // Use the existing complete-pipeline-test.js approach which works
  const { execSync } = require('child_process');
  
  try {
    console.log('🚀 Running complete pipeline test to upload first video...');
    
    // This will upload the existing video
    const result = execSync('node complete-pipeline-test.js', { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log('✅ First video upload process completed');
    return true;
    
  } catch (error) {
    console.error('❌ First video upload failed:', error.message);
    return false;
  }
}

async function createSecondVideo() {
  console.log('\n🎥 CREATING SECOND VIDEO WITH CLEAN NAMING');
  console.log('==========================================');
  
  const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');
  
  // Set up environment
  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AUDIO_BUCKET = 'youtube-automation-audio-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  delete process.env.MOCK_VIDEO_GENERATION;

  const videoEvent = {
    scriptPrompt: `Create engaging content about cryptocurrency ETF approval and Bitcoin investment revolution. Show financial markets, trading floors, Bitcoin symbols, ETF graphics, institutional investors, financial charts, crypto exchanges, and investment portfolios. Professional, financial news aesthetic with dynamic market data.`,
    
    topic: 'cryptocurrency', // Clean topic name for S3 paths
    trendId: `crypto_etf_${Date.now()}`, // Clean trend ID
    
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
    awsRequestId: `crypto-video-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000
  };

  try {
    console.log('🚀 Generating cryptocurrency video...');
    console.log(`📝 Topic: ${videoEvent.topic}`);
    console.log(`🆔 Trend ID: ${videoEvent.trendId}`);
    
    const result = await videoGenerator(videoEvent, context);
    
    if (result.success) {
      console.log('\n✅ Cryptocurrency video generated successfully!');
      console.log(`📁 Video S3 Key: ${result.videoS3Key}`);
      console.log(`🎵 Audio S3 Key: ${result.audioS3Key}`);
      console.log(`💰 Cost: $${result.generationCost}`);
      console.log(`⏱️  Generation Time: ${(result.executionTime / 1000).toFixed(1)}s`);
      
      // Now upload to YouTube
      console.log('\n📤 Uploading cryptocurrency video to YouTube...');
      
      const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');
      
      const uploadEvent = {
        videoS3Key: result.videoS3Key,
        audioS3Key: result.audioS3Key,
        metadata: {
          title: 'Crypto ETF Revolution - Bitcoin Investment Game Changer 2025',
          description: `🚀 BREAKING: Cryptocurrency ETF approval is revolutionizing Bitcoin investment! 

This video covers:
• Historic ETF approval impact
• Easier Bitcoin access for investors  
• Institutional crypto adoption
• Market price implications
• New investment opportunities

#CryptocurrencyETF #Bitcoin #CryptoInvestment #ETF #DigitalAssets #CryptoNews #Investment #Finance #Cryptocurrency #Bitcoin2025

Generated using advanced AI automation.`,
          tags: [
            'cryptocurrency ETF',
            'Bitcoin', 
            'crypto investment',
            'ETF approval',
            'digital assets',
            'crypto news',
            'investment',
            'finance',
            'cryptocurrency',
            'Bitcoin 2025'
          ],
          categoryId: '25', // News & Politics
          privacyStatus: 'public'
        }
      };

      const uploadContext = {
        awsRequestId: `crypto-upload-${Date.now()}`,
        getRemainingTimeInMillis: () => 900000
      };

      try {
        const uploadResult = await youtubeUploader(uploadEvent, uploadContext);
        
        if (uploadResult.success) {
          console.log('\n✅ Cryptocurrency video uploaded to YouTube!');
          console.log(`🔗 YouTube URL: ${uploadResult.youtubeUrl}`);
          console.log(`📊 Video ID: ${uploadResult.videoId}`);
          
          return {
            generation: result,
            upload: uploadResult,
            success: true
          };
        } else {
          console.log('\n⚠️ Upload failed, but video is in S3:', uploadResult.error);
          return {
            generation: result,
            upload: null,
            success: true // Video was generated successfully
          };
        }
      } catch (uploadError) {
        console.log('\n⚠️ Upload error, but video is in S3:', uploadError.message);
        return {
          generation: result,
          upload: null,
          success: true // Video was generated successfully
        };
      }
      
    } else {
      console.log('\n❌ Cryptocurrency video generation failed:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('\n❌ Cryptocurrency video error:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🎬 FINAL TWO VIDEOS CREATION');
  console.log('============================\n');
  
  let results = {
    firstVideo: false,
    secondVideo: null,
    totalCost: 0
  };
  
  // Step 1: Upload existing first video
  console.log('Step 1: Upload existing AI Technology video...');
  results.firstVideo = await uploadFirstVideo();
  
  // Step 2: Create and upload second video
  console.log('\nStep 2: Create new Cryptocurrency video...');
  results.secondVideo = await createSecondVideo();
  
  if (results.secondVideo?.success) {
    results.totalCost = results.secondVideo.generation.generationCost || 0.08;
  }
  
  // Final Summary
  console.log('\n🎊 FINAL SUMMARY');
  console.log('================');
  
  let successCount = 0;
  
  if (results.firstVideo) {
    successCount++;
    console.log('✅ Video 1: AI Technology Trends 2025 (uploaded)');
  }
  
  if (results.secondVideo?.success) {
    successCount++;
    console.log('✅ Video 2: Cryptocurrency ETF Revolution (created)');
    console.log(`   📁 S3: ${results.secondVideo.generation.videoS3Key}`);
    if (results.secondVideo.upload?.success) {
      console.log(`   🔗 YouTube: ${results.secondVideo.upload.youtubeUrl}`);
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/2 videos processed`);
  console.log(`💰 Total Cost: $${results.totalCost.toFixed(4)}`);
  
  if (successCount === 2) {
    console.log('\n🎉 SUCCESS! Both videos are ready!');
    console.log('🚀 Your YouTube automation platform created 2 different videos!');
    console.log('\n📹 Video Topics:');
    console.log('   1. AI Technology Trends 2025');
    console.log('   2. Cryptocurrency ETF Revolution');
    console.log('\n💡 This demonstrates the platform can create diverse content across different categories!');
  } else {
    console.log(`\n⚠️ Partial success: ${successCount}/2 videos completed`);
  }
  
  return results;
}

main()
  .then(results => {
    console.log('\n✅ Two-video creation process completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });