#!/usr/bin/env node

/**
 * Create Two Videos Using Direct Function Calls
 * Same approach as the working generate-first-video.js
 */

const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');
const { handler: youtubeUploader } = require('./lambda/youtube-uploader/dist/index.js');

async function createTwoVideosDirect() {
  console.log('🎬 CREATING 2 VIDEOS WITH DIRECT FUNCTION CALLS');
  console.log('===============================================');
  console.log('🚀 Status: PRODUCTION MODE - Real AWS Services');
  console.log('💰 Estimated Cost: $0.16 (2 videos × $0.08)');
  console.log('⏰ Estimated Time: 5-10 minutes');
  console.log('');

  // Production AWS configuration
  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AUDIO_BUCKET = 'youtube-automation-audio-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  
  // Ensure we're NOT in mock mode
  delete process.env.MOCK_VIDEO_GENERATION;

  const results = [];

  // Video 1: AI Regulation 2025
  console.log('🎯 Creating Video 1: AI Regulation Impact 2025');
  console.log('===============================================');
  
  const video1Event = {
    scriptPrompt: `Create compelling content about AI regulation changes in 2025. Show government buildings, tech company offices, AI systems, legal documents, compliance interfaces, and regulatory frameworks. Include visuals of lawmakers, tech executives, AI safety measures, and policy implementation. Professional, authoritative, news-style aesthetic focusing on the intersection of technology and governance.`,
    
    topic: 'AI Regulation 2025 - What Tech Companies Must Know',
    trendId: `ai_regulation_2025_${Date.now()}`,
    
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

  const video1Context = {
    awsRequestId: `video1-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000
  };

  try {
    console.log('🚀 Generating Video 1...');
    const video1Result = await videoGenerator(video1Event, video1Context);
    
    if (video1Result.success) {
      console.log('✅ Video 1 generated successfully!');
      console.log(`📁 Video S3 Key: ${video1Result.videoS3Key}`);
      console.log(`🎵 Audio S3 Key: ${video1Result.audioS3Key}`);
      console.log(`💰 Cost: $${video1Result.generationCost}`);
      
      // Upload Video 1 to YouTube
      console.log('\n📤 Uploading Video 1 to YouTube...');
      
      const upload1Event = {
        videoS3Key: video1Result.videoS3Key,
        audioS3Key: video1Result.audioS3Key,
        metadata: {
          title: 'AI Regulation 2025 - What Tech Companies Must Know',
          description: `Understanding the new AI regulation landscape in 2025! This video breaks down the latest government policies affecting tech companies, compliance requirements, and what businesses need to prepare for in the evolving AI regulatory environment.

🔥 Key Topics:
• New AI safety regulations for 2025
• Compliance requirements for tech companies
• Impact on AI development and innovation
• What businesses need to know

#AIRegulation #TechPolicy #AI2025 #Compliance #TechNews #ArtificialIntelligence #Government #Technology #Innovation #AILaws

Generated using advanced AI automation platform.`,
          tags: [
            'AI regulation',
            'tech policy',
            'AI 2025',
            'compliance',
            'artificial intelligence',
            'government',
            'technology',
            'tech news',
            'AI laws',
            'innovation'
          ],
          categoryId: '28',
          privacyStatus: 'public'
        }
      };

      const upload1Context = {
        awsRequestId: `upload1-${Date.now()}`,
        getRemainingTimeInMillis: () => 900000
      };

      try {
        const upload1Result = await youtubeUploader(upload1Event, upload1Context);
        
        if (upload1Result.success) {
          console.log('✅ Video 1 uploaded to YouTube!');
          console.log(`🔗 YouTube URL: ${upload1Result.youtubeUrl}`);
          
          results.push({
            videoNumber: 1,
            topic: 'AI Regulation 2025',
            success: true,
            youtubeUrl: upload1Result.youtubeUrl,
            videoId: upload1Result.videoId,
            cost: video1Result.generationCost
          });
        } else {
          console.log('❌ Video 1 upload failed:', upload1Result.error);
          results.push({
            videoNumber: 1,
            topic: 'AI Regulation 2025',
            success: false,
            error: upload1Result.error
          });
        }
      } catch (uploadError) {
        console.log('❌ Video 1 upload error:', uploadError.message);
        results.push({
          videoNumber: 1,
          topic: 'AI Regulation 2025',
          success: false,
          error: uploadError.message
        });
      }
      
    } else {
      console.log('❌ Video 1 generation failed:', video1Result.error);
      results.push({
        videoNumber: 1,
        topic: 'AI Regulation 2025',
        success: false,
        error: video1Result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Video 1 error:', error);
    results.push({
      videoNumber: 1,
      topic: 'AI Regulation 2025',
      success: false,
      error: error.message
    });
  }

  // Wait between videos
  console.log('\n⏳ Waiting 30 seconds before creating Video 2...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Video 2: Cryptocurrency ETF
  console.log('\n🎯 Creating Video 2: Cryptocurrency ETF Revolution');
  console.log('================================================');
  
  const video2Event = {
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

  const video2Context = {
    awsRequestId: `video2-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000
  };

  try {
    console.log('🚀 Generating Video 2...');
    const video2Result = await videoGenerator(video2Event, video2Context);
    
    if (video2Result.success) {
      console.log('✅ Video 2 generated successfully!');
      console.log(`📁 Video S3 Key: ${video2Result.videoS3Key}`);
      console.log(`🎵 Audio S3 Key: ${video2Result.audioS3Key}`);
      console.log(`💰 Cost: $${video2Result.generationCost}`);
      
      // Upload Video 2 to YouTube
      console.log('\n📤 Uploading Video 2 to YouTube...');
      
      const upload2Event = {
        videoS3Key: video2Result.videoS3Key,
        audioS3Key: video2Result.audioS3Key,
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

      const upload2Context = {
        awsRequestId: `upload2-${Date.now()}`,
        getRemainingTimeInMillis: () => 900000
      };

      try {
        const upload2Result = await youtubeUploader(upload2Event, upload2Context);
        
        if (upload2Result.success) {
          console.log('✅ Video 2 uploaded to YouTube!');
          console.log(`🔗 YouTube URL: ${upload2Result.youtubeUrl}`);
          
          results.push({
            videoNumber: 2,
            topic: 'Cryptocurrency ETF Revolution',
            success: true,
            youtubeUrl: upload2Result.youtubeUrl,
            videoId: upload2Result.videoId,
            cost: video2Result.generationCost
          });
        } else {
          console.log('❌ Video 2 upload failed:', upload2Result.error);
          results.push({
            videoNumber: 2,
            topic: 'Cryptocurrency ETF Revolution',
            success: false,
            error: upload2Result.error
          });
        }
      } catch (uploadError) {
        console.log('❌ Video 2 upload error:', uploadError.message);
        results.push({
          videoNumber: 2,
          topic: 'Cryptocurrency ETF Revolution',
          success: false,
          error: uploadError.message
        });
      }
      
    } else {
      console.log('❌ Video 2 generation failed:', video2Result.error);
      results.push({
        videoNumber: 2,
        topic: 'Cryptocurrency ETF Revolution',
        success: false,
        error: video2Result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Video 2 error:', error);
    results.push({
      videoNumber: 2,
      topic: 'Cryptocurrency ETF Revolution',
      success: false,
      error: error.message
    });
  }

  // Final Summary
  console.log('\n🎊 FINAL SUMMARY');
  console.log('================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful Videos: ${successful.length}/2`);
  console.log(`❌ Failed Videos: ${failed.length}/2`);
  
  if (successful.length > 0) {
    console.log('\n🎬 Successfully Created Videos:');
    successful.forEach(video => {
      console.log(`\n   📹 Video ${video.videoNumber}: ${video.topic}`);
      console.log(`      🔗 YouTube URL: ${video.youtubeUrl}`);
      console.log(`      💰 Cost: $${video.cost}`);
    });
    
    const totalCost = successful.reduce((sum, v) => sum + v.cost, 0);
    console.log(`\n💰 Total Cost: $${totalCost.toFixed(4)}`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Videos:');
    failed.forEach(video => {
      console.log(`   Video ${video.videoNumber}: ${video.topic} - ${video.error}`);
    });
  }

  if (successful.length === 2) {
    console.log('\n🎉 SUCCESS! Both videos created and uploaded to YouTube!');
    console.log('🚀 Your YouTube automation platform is fully operational!');
  }
  
  return results;
}

// Run the script
createTwoVideosDirect()
  .then(results => {
    console.log('\n✅ Video creation process completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });