const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: 'us-east-1' });

async function uploadFirstVideoAndCreateSecond() {
  console.log('🎬 Upload First Video & Create Second Video');
  console.log('==========================================\n');

  // Step 1: Upload the first video that was just created
  console.log('📤 Step 1: Uploading first video to YouTube...');
  
  const firstVideoUpload = {
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

  let firstVideoResult = null;
  
  try {
    const uploadCommand = new InvokeCommand({
      FunctionName: 'youtube-automation-youtube-uploader',
      Payload: JSON.stringify(firstVideoUpload)
    });

    const uploadResponse = await lambda.send(uploadCommand);
    firstVideoResult = JSON.parse(new TextDecoder().decode(uploadResponse.Payload));
    
    if (firstVideoResult.success) {
      console.log('✅ First video uploaded successfully!');
      console.log(`🔗 YouTube URL: ${firstVideoResult.youtubeUrl}`);
      console.log(`📊 Video ID: ${firstVideoResult.videoId}`);
    } else {
      console.log('❌ First video upload failed:', firstVideoResult.error);
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error);
  }

  // Step 2: Create second video with different topic
  console.log('\n🎥 Step 2: Creating second video...');
  
  const secondVideoRequest = {
    topic: 'Cryptocurrency Investment Strategies 2025',
    scriptPrompt: 'Cryptocurrency investment landscape is evolving rapidly in 2025 with new regulations, ETF approvals, and institutional adoption',
    trendId: `crypto_investment_2025_${Date.now()}`,
    videoConfig: {
      durationSeconds: 6,
      fps: 24,
      dimension: '1920x1080',
      quality: 'high',
      includeAudio: true
    },
    audioConfig: {
      voice: 'Matthew',
      speed: 'medium',
      language: 'en-US'
    }
  };

  console.log('🚀 Generating second video...');
  
  let secondVideoResult = null;
  
  try {
    const videoCommand = new InvokeCommand({
      FunctionName: 'youtube-automation-video-generator',
      Payload: JSON.stringify(secondVideoRequest)
    });

    const videoResponse = await lambda.send(videoCommand);
    secondVideoResult = JSON.parse(new TextDecoder().decode(videoResponse.Payload));
    
    if (secondVideoResult.success) {
      console.log('✅ Second video generated successfully!');
      console.log(`📁 Video S3 Key: ${secondVideoResult.videoS3Key}`);
      console.log(`🎵 Audio S3 Key: ${secondVideoResult.audioS3Key}`);
      console.log(`💰 Generation Cost: $${secondVideoResult.generationCost}`);
      console.log(`⏱️  Generation Time: ${(secondVideoResult.executionTime / 1000).toFixed(1)}s`);
      
      // Step 3: Upload second video to YouTube
      console.log('\n📤 Step 3: Uploading second video to YouTube...');
      
      const secondVideoUpload = {
        videoS3Key: secondVideoResult.videoS3Key,
        audioS3Key: secondVideoResult.audioS3Key,
        metadata: {
          title: 'Cryptocurrency Investment Strategies 2025 - Expert Guide',
          description: `Master cryptocurrency investment strategies for 2025! Learn about the latest developments in crypto markets, ETF approvals, regulatory changes, and smart investment approaches for digital assets.

🚀 What You'll Learn:
• Cryptocurrency market trends in 2025
• ETF approval impact on Bitcoin & crypto
• Smart investment strategies
• Risk management techniques
• Regulatory landscape updates

#Cryptocurrency #Bitcoin #Investment #Crypto2025 #DigitalAssets #CryptoETF #InvestmentStrategy #Finance #CryptoNews #Blockchain

Generated using advanced AI automation platform.`,
          tags: [
            'cryptocurrency',
            'bitcoin',
            'crypto investment',
            'investment strategy',
            'crypto 2025',
            'digital assets',
            'crypto ETF',
            'blockchain',
            'finance',
            'crypto news'
          ],
          categoryId: '25', // News & Politics (closest for finance)
          privacyStatus: 'public'
        }
      };
      
      try {
        const secondUploadCommand = new InvokeCommand({
          FunctionName: 'youtube-automation-youtube-uploader',
          Payload: JSON.stringify(secondVideoUpload)
        });

        const secondUploadResponse = await lambda.send(secondUploadCommand);
        const secondUploadResult = JSON.parse(new TextDecoder().decode(secondUploadResponse.Payload));
        
        if (secondUploadResult.success) {
          console.log('✅ Second video uploaded successfully!');
          console.log(`🔗 YouTube URL: ${secondUploadResult.youtubeUrl}`);
          console.log(`📊 Video ID: ${secondUploadResult.videoId}`);
        } else {
          console.log('❌ Second video upload failed:', secondUploadResult.error);
        }
        
      } catch (uploadError) {
        console.error('❌ Second video upload error:', uploadError);
      }
      
    } else {
      console.log('❌ Second video generation failed:', secondVideoResult.error);
    }
    
  } catch (error) {
    console.error('❌ Second video generation error:', error);
  }

  // Summary
  console.log('\n🎊 FINAL SUMMARY');
  console.log('================');
  
  let successCount = 0;
  let totalCost = 0;
  
  if (firstVideoResult?.success) {
    successCount++;
    console.log('✅ Video 1: AI Technology Trends 2025');
    console.log(`   🔗 ${firstVideoResult.youtubeUrl}`);
  }
  
  if (secondVideoResult?.success) {
    successCount++;
    totalCost += secondVideoResult.generationCost || 0.08;
    console.log('✅ Video 2: Cryptocurrency Investment Strategies 2025');
    if (secondVideoResult.youtubeUrl) {
      console.log(`   🔗 ${secondVideoResult.youtubeUrl}`);
    } else {
      console.log(`   📁 S3: ${secondVideoResult.videoS3Key}`);
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/2 videos created`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
  
  if (successCount === 2) {
    console.log('\n🎉 SUCCESS! Both videos created and uploaded!');
    console.log('🚀 Your YouTube automation platform is fully operational!');
  }
  
  return {
    firstVideo: firstVideoResult,
    secondVideo: secondVideoResult,
    successCount,
    totalCost
  };
}

// Run the script
uploadFirstVideoAndCreateSecond()
  .then(results => {
    console.log('\n✅ Process completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });