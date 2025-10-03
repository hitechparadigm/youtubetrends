#!/usr/bin/env node

/**
 * Upload the existing generated video to YouTube
 */

const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');

async function uploadExistingVideo() {
  console.log('📤 UPLOADING EXISTING VIDEO TO YOUTUBE');
  console.log('======================================');
  
  // Set up environment
  process.env.AWS_REGION = 'us-east-1';
  
  const uploadEvent = {
    videoS3Key: 'videos/s9mph7badzaf/output.mp4',
    audioS3Key: 'audio/technology/ai_tech_trends_2025_001_1759527069791.mp3',
    metadata: {
      title: 'AI Technology Trends 2025 - What You Need to Know',
      description: `Discover the latest AI technology trends shaping 2025! This video covers breakthrough developments in artificial intelligence, machine learning innovations, and how these technologies will impact businesses and society.

🔥 Key Topics Covered:
• Latest AI breakthroughs in 2025
• Impact on technology industry  
• Future implications for businesses
• Innovation opportunities

#AI #Technology #Trends2025 #Innovation #MachineLearning #TechNews #ArtificialIntelligence #FutureTech

Generated using advanced AI automation platform.`,
      tags: [
        'AI',
        'artificial intelligence', 
        'technology trends',
        '2025',
        'machine learning',
        'innovation',
        'tech news',
        'future technology',
        'AI trends',
        'technology'
      ],
      categoryId: '28', // Science & Technology
      privacyStatus: 'public'
    }
  };

  const context = {
    awsRequestId: `upload-${Date.now()}`,
    getRemainingTimeInMillis: () => 900000 // 15 minutes
  };

  try {
    console.log('🚀 Uploading video to YouTube...');
    console.log(`📁 Video: ${uploadEvent.videoS3Key}`);
    console.log(`🎵 Audio: ${uploadEvent.audioS3Key}`);
    console.log(`📝 Title: ${uploadEvent.metadata.title}`);
    
    const result = await youtubeUploader(uploadEvent, context);
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Video uploaded to YouTube!');
      console.log(`🔗 YouTube URL: ${result.youtubeUrl}`);
      console.log(`📊 Video ID: ${result.videoId}`);
      console.log(`⏱️  Upload Time: ${result.uploadTime}ms`);
      
      return result;
    } else {
      console.log('\n❌ Upload failed:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('\n❌ Upload error:', error);
    return null;
  }
}

// Now create a second video
async function createSecondVideo() {
  console.log('\n🎥 CREATING SECOND VIDEO');
  console.log('========================');
  
  const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');
  
  // Set up environment
  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AUDIO_BUCKET = 'youtube-automation-audio-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  delete process.env.MOCK_VIDEO_GENERATION;

  const videoEvent = {
    scriptPrompt: `Create engaging content about cryptocurrency ETF approval and Bitcoin investment revolution. Show financial markets, trading floors, Bitcoin symbols, ETF graphics, institutional investors, financial charts, crypto exchanges, and investment portfolios. Include visuals of Wall Street, digital assets, blockchain networks, and financial innovation. Professional, financial news aesthetic with dynamic market data and investment themes.`,
    
    topic: 'Crypto ETF Approved - Game Changer for Bitcoin Investment',
    trendId: `crypto_etf_2025_${Date.now()}`,
    
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
    awsRequestId: `video2-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000
  };

  try {
    console.log('🚀 Generating second video...');
    console.log(`📝 Topic: ${videoEvent.topic}`);
    
    const result = await videoGenerator(videoEvent, context);
    
    if (result.success) {
      console.log('\n✅ Second video generated successfully!');
      console.log(`📁 Video S3 Key: ${result.videoS3Key}`);
      console.log(`🎵 Audio S3 Key: ${result.audioS3Key}`);
      console.log(`💰 Cost: $${result.generationCost}`);
      console.log(`⏱️  Generation Time: ${(result.executionTime / 1000).toFixed(1)}s`);
      
      // Upload second video
      console.log('\n📤 Uploading second video to YouTube...');
      
      const uploadEvent = {
        videoS3Key: result.videoS3Key,
        audioS3Key: result.audioS3Key,
        metadata: {
          title: 'Crypto ETF Approved - Game Changer for Bitcoin Investment',
          description: `BREAKING: Cryptocurrency ETF approval is revolutionizing Bitcoin investment! Learn how this historic decision opens crypto markets to traditional investors, what it means for Bitcoin prices, and how you can benefit from this game-changing development.

🚀 What This Means:
• Easier Bitcoin access for traditional investors
• Institutional adoption of cryptocurrency  
• Impact on Bitcoin and crypto market prices
• New investment opportunities and strategies

#CryptocurrencyETF #Bitcoin #CryptoInvestment #ETFApproval #DigitalAssets #CryptoNews #BitcoinETF #Investment #Finance #Cryptocurrency

Generated using advanced AI automation platform.`,
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
            'cryptocurrency'
          ],
          categoryId: '25',
          privacyStatus: 'public'
        }
      };

      const uploadContext = {
        awsRequestId: `upload2-${Date.now()}`,
        getRemainingTimeInMillis: () => 900000
      };

      const uploadResult = await youtubeUploader(uploadEvent, uploadContext);
      
      if (uploadResult.success) {
        console.log('\n✅ Second video uploaded to YouTube!');
        console.log(`🔗 YouTube URL: ${uploadResult.youtubeUrl}`);
        console.log(`📊 Video ID: ${uploadResult.videoId}`);
        
        return {
          generation: result,
          upload: uploadResult
        };
      } else {
        console.log('\n❌ Second video upload failed:', uploadResult.error);
        return { generation: result, upload: null };
      }
      
    } else {
      console.log('\n❌ Second video generation failed:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('\n❌ Second video error:', error);
    return null;
  }
}

async function main() {
  console.log('🎬 UPLOAD EXISTING + CREATE NEW VIDEO');
  console.log('=====================================\n');
  
  // Step 1: Upload existing video
  const firstUpload = await uploadExistingVideo();
  
  // Step 2: Create and upload second video  
  const secondVideo = await createSecondVideo();
  
  // Summary
  console.log('\n🎊 FINAL SUMMARY');
  console.log('================');
  
  let successCount = 0;
  let totalCost = 0;
  
  if (firstUpload?.success) {
    successCount++;
    console.log('✅ Video 1: AI Technology Trends 2025');
    console.log(`   🔗 ${firstUpload.youtubeUrl}`);
  }
  
  if (secondVideo?.generation?.success) {
    successCount++;
    totalCost += secondVideo.generation.generationCost || 0.08;
    console.log('✅ Video 2: Cryptocurrency ETF Revolution');
    if (secondVideo.upload?.success) {
      console.log(`   🔗 ${secondVideo.upload.youtubeUrl}`);
    } else {
      console.log(`   📁 S3: ${secondVideo.generation.videoS3Key}`);
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/2 videos processed`);
  console.log(`💰 Total New Cost: $${totalCost.toFixed(4)}`);
  
  if (successCount === 2) {
    console.log('\n🎉 SUCCESS! Both videos are ready!');
    console.log('🚀 Your YouTube automation platform is fully operational!');
  }
}

main()
  .then(() => {
    console.log('\n✅ Process completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });