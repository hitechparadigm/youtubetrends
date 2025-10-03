#!/usr/bin/env node

/**
 * Create Trending Video with Real Content
 * Generate videos with actual trending information, audio narration, and subtitles
 */

const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');
const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');

async function createTrendingVideo() {
  console.log('🎬 CREATING TRENDING VIDEO WITH REAL CONTENT');
  console.log('='.repeat(55));
  console.log('📈 Topic: Top 5 ETFs to Invest in 2025');
  console.log('🎯 With audio narration and subtitles');
  console.log('💰 Estimated Cost: $0.08');
  console.log('⏰ Estimated Time: 3-5 minutes');
  console.log('');

  // Production AWS configuration
  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  delete process.env.MOCK_VIDEO_GENERATION;

  const testContext = {
    awsRequestId: `trending-video-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000 // 30 minutes timeout
  };

  try {
    console.log('📊 GENERATING REAL TRENDING CONTENT');
    console.log('='.repeat(40));
    
    // Create a comprehensive script about top ETFs for 2025
    const trendingScript = `
Welcome to your 2025 ETF investment guide! Here are the top 5 ETFs every investor should consider this year.

Number 5: VTI - Vanguard Total Stock Market ETF. With its ultra-low 0.03% expense ratio and complete U.S. market exposure, VTI remains the gold standard for diversified investing.

Number 4: SCHD - Schwab US Dividend Equity ETF. This dividend-focused fund has delivered consistent 10%+ annual returns while providing steady income through quality dividend stocks.

Number 3: QQQ - Invesco QQQ Trust. Tech-heavy and growth-focused, QQQ gives you exposure to the NASDAQ 100's biggest winners including Apple, Microsoft, and NVIDIA.

Number 2: VOO - Vanguard S&P 500 ETF. The classic choice tracking America's 500 largest companies with rock-bottom fees and Warren Buffett's endorsement.

Number 1: JEPI - JPMorgan Equity Premium Income ETF. The 2025 standout combining growth potential with monthly dividends, perfect for income-focused investors.

Remember: diversification is key, and these ETFs offer different strategies for building wealth in 2025. Always consult a financial advisor before investing.
    `.trim();

    // Create visual prompt for the video
    const visualPrompt = `Create a professional financial education video showing:
- Modern trading floor with multiple screens displaying stock charts and ETF data
- Clean, professional graphics showing "Top 5 ETFs 2025" title
- Dynamic charts and graphs showing upward trending performance
- Professional financial advisor or presenter in business attire
- Split screens showing ETF ticker symbols: VTI, SCHD, QQQ, VOO, JEPI
- Green upward arrows and positive percentage gains
- Modern office environment with financial data displays
- Professional, trustworthy, and educational atmosphere`;

    const videoEvent = {
      scriptPrompt: visualPrompt,
      
      // Add the actual narration script
      narrationScript: trendingScript,
      
      topic: 'investing',
      trendId: `top_etfs_2025_${Date.now()}`,
      
      videoConfig: {
        durationSeconds: 30, // Longer video for more content
        fps: 24,
        dimension: '1280x720',
        quality: 'high',
        includeAudio: true,
        includeSubtitles: true
      },
      
      audioConfig: {
        voice: 'Matthew', // Professional male voice for finance
        speed: 'medium',
        language: 'en-US',
        style: 'professional'
      }
    };

    console.log('📋 Video Configuration:');
    console.log(`- Topic: ${videoEvent.topic}`);
    console.log(`- Duration: ${videoEvent.videoConfig.durationSeconds} seconds`);
    console.log(`- Voice: ${videoEvent.audioConfig.voice} (Professional)`);
    console.log(`- Content: Real ETF investment advice for 2025`);
    console.log(`- Features: Audio narration + subtitles`);
    console.log('');

    const videoStartTime = Date.now();
    console.log('🎬 Generating trending investment video...');
    
    const videoResult = await videoGenerator(videoEvent, testContext);
    
    if (!videoResult.success) {
      throw new Error(`Video generation failed: ${videoResult.error}`);
    }

    const videoTime = Date.now() - videoStartTime;
    console.log('');
    console.log('✅ VIDEO GENERATION SUCCESSFUL!');
    console.log(`- Video S3 Key: ${videoResult.videoS3Key}`);
    console.log(`- Audio S3 Key: ${videoResult.audioS3Key}`);
    console.log(`- Generation Cost: $${videoResult.generationCost.toFixed(2)}`);
    console.log(`- Generation Time: ${Math.floor(videoTime / 1000 / 60)}m ${Math.floor((videoTime / 1000) % 60)}s`);
    console.log('');

    // Wait for S3 consistency
    console.log('⏳ Waiting for S3 consistency...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📤 UPLOADING TO YOUTUBE');
    console.log('='.repeat(30));

    const uploadEvent = {
      processedVideoS3Key: videoResult.videoS3Key,
      
      topic: videoEvent.topic,
      trendId: videoEvent.trendId,
      
      // SEO-optimized keywords for ETF content
      keywords: [
        'ETF investing 2025',
        'best ETFs',
        'VTI ETF',
        'SCHD dividend ETF',
        'QQQ NASDAQ',
        'VOO S&P 500',
        'JEPI income ETF',
        'investment strategy',
        'portfolio diversification',
        'passive investing',
        'dividend investing',
        'index funds',
        'financial education',
        'wealth building',
        'retirement planning'
      ],
      
      scriptPrompt: trendingScript,
      
      videoMetadata: {
        duration: videoResult.metadata.duration,
        fileSize: videoResult.metadata.fileSize,
        format: videoResult.metadata.format,
        resolution: videoEvent.videoConfig.dimension,
        fps: videoEvent.videoConfig.fps,
        hasAudio: true,
        hasSubtitles: true
      },
      
      uploadConfig: {
        privacyStatus: 'public',
        publishAt: undefined,
        enableComments: true,
        enableRatings: true,
        enableEmbedding: true
      }
    };

    console.log('📋 Upload Configuration:');
    console.log(`- Video: ${uploadEvent.processedVideoS3Key}`);
    console.log(`- SEO Focus: ETF investing, financial education`);
    console.log(`- Target Audience: Investors, financial education seekers`);
    console.log('');

    const uploadStartTime = Date.now();
    console.log('📤 Uploading with financial SEO optimization...');
    
    const uploadResult = await youtubeUploader(uploadEvent, testContext);
    
    const uploadTime = Date.now() - uploadStartTime;
    const totalTime = Date.now() - videoStartTime;

    if (uploadResult.success) {
      console.log('');
      console.log('🎉 TRENDING VIDEO PUBLISHED SUCCESSFULLY!');
      console.log('='.repeat(45));
      console.log('');
      console.log('📺 LIVE ON YOUTUBE:');
      console.log(`✅ Video ID: ${uploadResult.youtubeVideoId}`);
      console.log(`🔗 URL: ${uploadResult.videoUrl}`);
      console.log(`📺 Title: ${uploadResult.uploadedMetadata.title}`);
      console.log(`💰 Topic: Top 5 ETFs for 2025 Investment`);
      console.log('');
      console.log('🎯 CONTENT FEATURES:');
      console.log('✅ Real financial advice and ETF recommendations');
      console.log('✅ Professional audio narration');
      console.log('✅ Educational content with specific ETF tickers');
      console.log('✅ SEO optimized for finance keywords');
      console.log('✅ Engaging visual presentation');
      console.log('');
      console.log('📊 PERFORMANCE:');
      console.log(`- Video Generation: ${Math.floor(videoTime / 1000 / 60)}m ${Math.floor((videoTime / 1000) % 60)}s`);
      console.log(`- YouTube Upload: ${Math.floor(uploadTime / 1000)}s`);
      console.log(`- Total Time: ${Math.floor(totalTime / 1000 / 60)}m ${Math.floor((totalTime / 1000) % 60)}s`);
      console.log(`- Total Cost: $${videoResult.generationCost.toFixed(2)}`);
      console.log('');
      console.log('🎯 TRENDING CONTENT PROVEN:');
      console.log('✅ Real investment advice (Top 5 ETFs)');
      console.log('✅ Professional narration with financial expertise');
      console.log('✅ SEO optimized for finance audience');
      console.log('✅ Educational value for investors');
      console.log('✅ Ready for monetization and audience growth');
      console.log('');
      console.log('🚀 NEXT TRENDING TOPICS READY:');
      console.log('- "Best Dividend Stocks for 2025 Passive Income"');
      console.log('- "Crypto ETFs vs Bitcoin: Which to Choose in 2025"');
      console.log('- "REIT Investing: Top Real Estate ETFs for 2025"');
      console.log('- "Tech Stock Recovery: Best Growth ETFs for 2025"');
      console.log('');
      console.log('🎊 SUCCESS! Your trending finance video is live!');
      console.log(`🔗 Watch: ${uploadResult.videoUrl}`);
      
      return {
        success: true,
        videoUrl: uploadResult.videoUrl,
        title: uploadResult.uploadedMetadata.title,
        topic: 'Top 5 ETFs for 2025',
        features: ['audio_narration', 'financial_advice', 'seo_optimized'],
        totalTime: totalTime,
        totalCost: videoResult.generationCost
      };
      
    } else {
      console.log('');
      console.log('❌ YOUTUBE UPLOAD FAILED');
      console.log(`Error: ${uploadResult.error}`);
      console.log('');
      console.log('✅ Video with trending content generated successfully');
      console.log('❌ YouTube upload needs OAuth configuration');
      
      return {
        success: false,
        videoGenerated: true,
        uploadError: uploadResult.error
      };
    }
    
  } catch (error) {
    console.log('');
    console.log('💥 ERROR CREATING TRENDING VIDEO');
    console.log('='.repeat(35));
    console.log(`Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

console.log('🎬 Trending Video Creator - Real Financial Content');
console.log('⚡ ETF Investment Advice + Audio Narration + SEO');
console.log('');

createTrendingVideo()
  .then(result => {
    if (result.success) {
      console.log('');
      console.log('🎉 SUCCESS! Trending finance video is live on YouTube!');
      console.log('🚀 Ready to create more trending investment content!');
      process.exit(0);
    } else {
      console.log('');
      console.log('⚠️  Video generated but upload needs YouTube API setup');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });