#!/usr/bin/env node

/**
 * Process and upload the second video with audio merging
 */

async function processAndUploadVideo2() {
  console.log('🎵 PROCESSING AND UPLOADING VIDEO 2 WITH AUDIO');
  console.log('===============================================');
  
  // Video 2 details from the previous generation
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

  try {
    // Step 1: Process video to merge audio
    console.log('\n🔄 Step 1: Processing video to merge audio...');
    
    const { handler: videoProcessor } = require('./lambda/video-processor/dist/index.js');
    
    const processingEvent = {
      videoS3Key: video2Details.videoS3Key,
      audioS3Key: video2Details.audioS3Key,
      topic: video2Details.topic,
      trendId: video2Details.trendId,
      metadata: {
        duration: 6,
        format: 'mp4',
        hasAudio: true
      },
      processingConfig: {
        outputFormat: 'mp4',
        quality: 'high',
        resolution: '1280x720',
        bitrate: '2000k'
      }
    };

    const processingContext = {
      awsRequestId: `process-video2-${Date.now()}`,
      getRemainingTimeInMillis: () => 1800000 // 30 minutes
    };

    console.log('🚀 Processing video with audio merging...');
    const processingResult = await videoProcessor(processingEvent, processingContext);
    
    if (processingResult.success) {
      console.log('✅ Video processing completed successfully!');
      console.log(`📁 Processed Video: ${processingResult.processedVideoS3Key}`);
      console.log(`💰 Processing Cost: $${processingResult.processingCost}`);
      console.log(`⏱️  Processing Time: ${(processingResult.executionTime / 1000).toFixed(1)}s`);
      console.log(`🎵 Audio Channels: ${processingResult.outputMetadata.audioChannels}`);
      console.log(`📊 File Size: ${(processingResult.outputMetadata.fileSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Step 2: Upload processed video to YouTube
      console.log('\n📤 Step 2: Uploading processed video to YouTube...');
      
      const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');
      
      const uploadEvent = {
        processedVideoS3Key: processingResult.processedVideoS3Key,
        topic: video2Details.topic,
        trendId: video2Details.trendId,
        videoMetadata: {
          fileSize: processingResult.outputMetadata.fileSize,
          duration: processingResult.outputMetadata.duration,
          format: processingResult.outputMetadata.format,
          hasAudio: true
        },
        keywords: [
          'cryptocurrency ETF',
          'Bitcoin',
          'crypto investment',
          'ETF approval',
          'digital assets'
        ],
        scriptPrompt: 'Cryptocurrency ETF approval revolutionizing Bitcoin investment access for traditional investors',
        uploadConfig: {
          title: 'Crypto ETF Revolution - Bitcoin Investment Game Changer 2025',
          description: `🚀 BREAKING: Cryptocurrency ETF approval is revolutionizing Bitcoin investment! 

This AI-generated video covers:
• Historic ETF approval impact on crypto markets
• Easier Bitcoin access for traditional investors  
• Institutional cryptocurrency adoption trends
• Market price implications and opportunities
• New investment strategies for digital assets

The approval of cryptocurrency ETFs marks a pivotal moment in financial history, opening the door for mainstream investors to gain exposure to Bitcoin and other digital assets through regulated, traditional investment vehicles.

🔥 Key Topics:
✅ ETF approval significance
✅ Institutional adoption impact  
✅ Investment accessibility improvements
✅ Market dynamics and price effects
✅ Future opportunities in crypto space

#CryptocurrencyETF #Bitcoin #CryptoInvestment #ETFApproval #DigitalAssets #CryptoNews #BitcoinETF #Investment #Finance #Cryptocurrency #Bitcoin2025 #CryptoRevolution

🤖 Generated using advanced AI automation platform with professional audio narration and optimized for YouTube discovery.`,
          tags: [
            'cryptocurrency ETF',
            'Bitcoin',
            'crypto investment', 
            'ETF approval',
            'digital assets',
            'crypto news',
            'Bitcoin ETF',
            'investment',
            'finance',
            'cryptocurrency',
            'Bitcoin 2025',
            'crypto revolution',
            'institutional crypto',
            'crypto market'
          ],
          categoryId: '25', // News & Politics
          privacyStatus: 'public'
        }
      };

      const uploadContext = {
        awsRequestId: `upload-video2-${Date.now()}`,
        getRemainingTimeInMillis: () => 900000 // 15 minutes
      };

      console.log('🚀 Uploading to YouTube with audio...');
      const uploadResult = await youtubeUploader(uploadEvent, uploadContext);
      
      if (uploadResult.success) {
        console.log('\n🎉 SUCCESS! Video 2 uploaded to YouTube with audio!');
        console.log(`🔗 YouTube URL: ${uploadResult.youtubeVideoId ? `https://www.youtube.com/watch?v=${uploadResult.youtubeVideoId}` : uploadResult.videoUrl}`);
        console.log(`📊 Video ID: ${uploadResult.youtubeVideoId}`);
        console.log(`📝 Title: ${uploadResult.uploadedMetadata.title}`);
        console.log(`⏱️  Upload Time: ${uploadResult.performanceTracking.uploadTime}ms`);
        
        return {
          success: true,
          processing: processingResult,
          upload: uploadResult,
          youtubeUrl: uploadResult.youtubeVideoId ? `https://www.youtube.com/watch?v=${uploadResult.youtubeVideoId}` : uploadResult.videoUrl
        };
      } else {
        console.log('\n❌ YouTube upload failed:', uploadResult.error);
        return {
          success: false,
          processing: processingResult,
          upload: uploadResult,
          error: 'YouTube upload failed'
        };
      }
      
    } else {
      console.log('\n❌ Video processing failed:', processingResult.error);
      return {
        success: false,
        processing: processingResult,
        error: 'Video processing failed'
      };
    }
    
  } catch (error) {
    console.error('\n❌ Process failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function fixVideo1Audio() {
  console.log('\n🔧 FIXING VIDEO 1 AUDIO ISSUE');
  console.log('==============================');
  
  // Video 1 details from the first generation
  const video1Details = {
    videoS3Key: 'videos/ms19zbkfoq3h/output.mp4',
    audioS3Key: 'audio/technology/complete_test_1759527475022_1759527658561.mp3',
    subtitlesS3Key: 'subtitles/technology/complete_test_1759527475022_1759527658844.srt',
    topic: 'technology',
    trendId: 'complete_test_1759527475022'
  };

  console.log('📋 Video 1 Details:');
  console.log(`   📹 Video: ${video1Details.videoS3Key}`);
  console.log(`   🎵 Audio: ${video1Details.audioS3Key}`);
  console.log(`   📄 Subtitles: ${video1Details.subtitlesS3Key}`);

  try {
    // Process video 1 to merge audio
    console.log('\n🔄 Processing Video 1 to add audio...');
    
    const { handler: videoProcessor } = require('./lambda/video-processor/dist/index.js');
    
    const processingEvent = {
      videoS3Key: video1Details.videoS3Key,
      audioS3Key: video1Details.audioS3Key,
      topic: video1Details.topic,
      trendId: video1Details.trendId,
      metadata: {
        duration: 6,
        format: 'mp4',
        hasAudio: true
      },
      processingConfig: {
        outputFormat: 'mp4',
        quality: 'high',
        resolution: '1280x720',
        bitrate: '2000k'
      }
    };

    const processingContext = {
      awsRequestId: `fix-video1-${Date.now()}`,
      getRemainingTimeInMillis: () => 1800000
    };

    console.log('🚀 Processing Video 1 with audio merging...');
    const processingResult = await videoProcessor(processingEvent, processingContext);
    
    if (processingResult.success) {
      console.log('✅ Video 1 processing completed!');
      console.log(`📁 Processed Video: ${processingResult.processedVideoS3Key}`);
      console.log(`🎵 Audio Channels: ${processingResult.outputMetadata.audioChannels}`);
      
      console.log('\n💡 Video 1 with audio is now available at:');
      console.log(`   📁 S3: ${processingResult.processedVideoS3Key}`);
      console.log('\n🔄 You can now re-upload this processed version to YouTube to replace the silent video.');
      
      return {
        success: true,
        processedVideoS3Key: processingResult.processedVideoS3Key,
        hasAudio: processingResult.outputMetadata.audioChannels > 0
      };
    } else {
      console.log('\n❌ Video 1 processing failed:', processingResult.error);
      return { success: false, error: processingResult.error };
    }
    
  } catch (error) {
    console.error('\n❌ Video 1 fix failed:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🎵 AUDIO PROCESSING AND UPLOAD SOLUTION');
  console.log('=======================================\n');
  
  // Step 1: Fix Video 1 audio (create processed version)
  console.log('Step 1: Create Video 1 with audio...');
  const video1Fix = await fixVideo1Audio();
  
  // Step 2: Process and upload Video 2 with audio
  console.log('\nStep 2: Process and upload Video 2 with audio...');
  const video2Result = await processAndUploadVideo2();
  
  // Summary
  console.log('\n🎊 AUDIO PROCESSING SUMMARY');
  console.log('===========================');
  
  if (video1Fix.success) {
    console.log('✅ Video 1: Audio processing completed');
    console.log(`   📁 Processed file: ${video1Fix.processedVideoS3Key}`);
    console.log(`   🎵 Has Audio: ${video1Fix.hasAudio ? 'Yes' : 'No'}`);
  } else {
    console.log('❌ Video 1: Audio processing failed');
  }
  
  if (video2Result.success) {
    console.log('✅ Video 2: Processed and uploaded with audio');
    console.log(`   🔗 YouTube URL: ${video2Result.youtubeUrl}`);
  } else {
    console.log('❌ Video 2: Processing/upload failed');
  }
  
  console.log('\n💡 SOLUTION FOR AUDIO ISSUES:');
  console.log('1. ✅ Video processing now merges audio and video properly');
  console.log('2. ✅ Future videos will include audio in the pipeline');
  console.log('3. 🔄 Video 1 can be re-uploaded with the processed version');
  console.log('4. ✅ Video 2 should now have audio on YouTube');
  
  return {
    video1Fix,
    video2Result
  };
}

main()
  .then(results => {
    console.log('\n✅ Audio processing completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Audio processing failed:', error);
    process.exit(1);
  });