#!/usr/bin/env npx ts-node

/**
 * Production Pipeline Test
 * 
 * This script tests the complete YouTube automation pipeline
 * using real AWS services (when deployed) or mock services (for testing)
 */

import { StepFunctionsClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-stepfunctions';

interface ProductionTestConfig {
  useRealServices: boolean;
  topic: string;
  region: string;
  maxResults: number;
  hoursBack: number;
  stateMachineArn?: string;
}

const config: ProductionTestConfig = {
  useRealServices: process.env.USE_REAL_AWS_SERVICES === 'true',
  topic: process.env.TEST_TOPIC || 'technology',
  region: process.env.AWS_REGION || 'us-east-1',
  maxResults: parseInt(process.env.MAX_RESULTS || '5'),
  hoursBack: parseInt(process.env.HOURS_BACK || '24'),
  stateMachineArn: process.env.STATE_MACHINE_ARN
};

async function testProductionPipeline() {
  console.log('🚀 YouTube Automation Platform - Production Pipeline Test');
  console.log('=' .repeat(70));
  console.log(`📊 Configuration:`);
  console.log(`   🎯 Topic: ${config.topic}`);
  console.log(`   🌍 Region: ${config.region}`);
  console.log(`   📈 Max Results: ${config.maxResults}`);
  console.log(`   ⏰ Hours Back: ${config.hoursBack}`);
  console.log(`   🔧 Real Services: ${config.useRealServices ? 'YES' : 'NO (Mock Mode)'}`);
  console.log('');

  if (config.useRealServices) {
    await testWithRealAWS();
  } else {
    await testWithMockServices();
  }
}

async function testWithRealAWS() {
  console.log('🔴 PRODUCTION MODE: Using Real AWS Services');
  console.log('⚠️  This will incur actual AWS costs (~$8.25 per video)');
  console.log('');

  if (!config.stateMachineArn) {
    console.error('❌ STATE_MACHINE_ARN environment variable required for production mode');
    console.log('');
    console.log('💡 To get the ARN, run:');
    console.log('   aws stepfunctions list-state-machines --query "stateMachines[?name==\'YouTubeAutomationWorkflow\'].stateMachineArn" --output text');
    console.log('');
    console.log('💡 Then set the environment variable:');
    console.log('   export STATE_MACHINE_ARN="arn:aws:states:region:account:stateMachine:YouTubeAutomationWorkflow"');
    return;
  }

  try {
    const stepFunctions = new StepFunctionsClient({ region: config.region });
    
    const input = {
      topics: [config.topic],
      region: 'US',
      maxResults: config.maxResults,
      hoursBack: config.hoursBack
    };

    console.log('🚀 Starting Step Functions execution...');
    console.log(`📋 Input: ${JSON.stringify(input, null, 2)}`);
    
    const startResult = await stepFunctions.send(new StartExecutionCommand({
      stateMachineArn: config.stateMachineArn,
      input: JSON.stringify(input),
      name: `production-test-${Date.now()}`
    }));

    const executionArn = startResult.executionArn!;
    console.log(`✅ Execution started: ${executionArn}`);
    console.log('');

    // Monitor execution
    console.log('📊 Monitoring execution progress...');
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60; // 30 minutes max

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      
      const describeResult = await stepFunctions.send(new DescribeExecutionCommand({
        executionArn
      }));

      status = describeResult.status!;
      attempts++;

      console.log(`⏱️  Status: ${status} (${attempts * 30}s elapsed)`);

      if (status === 'SUCCEEDED') {
        console.log('');
        console.log('🎉 PIPELINE COMPLETED SUCCESSFULLY!');
        console.log('📊 Results:');
        console.log(JSON.stringify(JSON.parse(describeResult.output || '{}'), null, 2));
        
        console.log('');
        console.log('🎬 Check your YouTube channel for the new video!');
        console.log('📈 Monitor costs in AWS Billing Dashboard');
        break;
      } else if (status === 'FAILED') {
        console.log('');
        console.log('❌ PIPELINE FAILED');
        console.log('📋 Error details:');
        console.log(describeResult.error || 'No error details available');
        break;
      }
    }

    if (attempts >= maxAttempts) {
      console.log('');
      console.log('⏰ Execution monitoring timed out (30 minutes)');
      console.log('💡 Check AWS Step Functions console for current status');
      console.log(`🔗 Execution ARN: ${executionArn}`);
    }

  } catch (error) {
    console.error('❌ Production test failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Verify AWS credentials are configured');
    console.log('2. Ensure Step Functions state machine is deployed');
    console.log('3. Check IAM permissions for Step Functions execution');
    console.log('4. Verify YouTube API credentials in Secrets Manager');
  }
}

async function testWithMockServices() {
  console.log('🟡 MOCK MODE: Using Simulated Services');
  console.log('💡 This demonstrates the pipeline without AWS costs');
  console.log('');

  // Import and run the mock pipeline test
  const { handler: trendDetector } = require('./lambda/trend-detector/index.js');
  const { handler: contentAnalyzer } = require('./lambda/content-analyzer/dist/index.js');
  const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');
  const { handler: videoProcessor } = require('./lambda/video-processor/index.js');
  const { handler: youtubeUploader } = require('./lambda/youtube-uploader/index.js');

  // Enable mock modes
  process.env.MOCK_VIDEO_GENERATION = 'true';
  process.env.MOCK_YOUTUBE_API = 'true';
  process.env.MOCK_MEDIACONVERT = 'true';
  process.env.CONTENT_ANALYSIS_TABLE = 'mock-table';

  const testContext = {
    awsRequestId: 'production-test-123',
    getRemainingTimeInMillis: () => 300000
  };

  const pipelineStartTime = Date.now();

  try {
    // Step 1: Trend Detection
    console.log('📊 STEP 1: TREND DETECTION');
    const trendEvent = {
      topics: [config.topic],
      region: 'US',
      maxResults: config.maxResults,
      hoursBack: config.hoursBack
    };

    const trendResult = await trendDetector(trendEvent, testContext);
    console.log(`✅ Trends detected: ${trendResult.trendsDetected}`);
    console.log(`⏱️  Time: ${trendResult.executionTime}ms`);
    console.log('');

    if (!trendResult.success) {
      throw new Error('Trend detection failed');
    }

    // Step 2: Content Analysis
    console.log('🧠 STEP 2: CONTENT ANALYSIS');
    const firstTopicResult = trendResult.results[0];
    const contentEvent = {
      topic: firstTopicResult.topic,
      trendsData: firstTopicResult.trends,
      maxVideos: 1,
      minEngagementScore: 0.02
    };

    const contentResult = await contentAnalyzer(contentEvent, testContext);
    console.log(`✅ Script prompts: ${contentResult.scriptPrompts.length}`);
    console.log(`📝 Title: "${contentResult.scriptPrompts[0]?.title}"`);
    console.log(`⏱️  Time: ${contentResult.executionTime}ms`);
    console.log('');

    if (!contentResult.success) {
      throw new Error('Content analysis failed');
    }

    // Step 3: Video Generation
    console.log('🎬 STEP 3: VIDEO GENERATION');
    const firstScript = contentResult.scriptPrompts[0];
    const videoEvent = {
      scriptPrompt: firstScript.prompt,
      topic: firstScript.topic,
      trendId: firstScript.trendId,
      videoConfig: {
        durationSeconds: Math.min(firstScript.estimatedLength, 600),
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

    const videoResult = await videoGenerator(videoEvent, testContext);
    console.log(`✅ Video generated: ${videoResult.success}`);
    console.log(`💰 Cost: $${videoResult.generationCost.toFixed(2)}`);
    console.log(`📊 Size: ${(videoResult.metadata.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️  Time: ${videoResult.executionTime}ms`);
    console.log('');

    if (!videoResult.success) {
      throw new Error('Video generation failed');
    }

    // Step 4: Video Processing
    console.log('⚙️  STEP 4: VIDEO PROCESSING');
    const processingEvent = {
      videoS3Key: videoResult.videoS3Key,
      audioS3Key: videoResult.audioS3Key,
      topic: firstScript.topic,
      trendId: firstScript.trendId,
      metadata: videoResult.metadata,
      processingConfig: {
        outputFormat: 'mp4',
        quality: 'high',
        resolution: '1920x1080',
        bitrate: '8000'
      }
    };

    const processingResult = await videoProcessor(processingEvent, testContext);
    console.log(`✅ Video processed: ${processingResult.success}`);
    console.log(`📐 Resolution: ${processingResult.outputMetadata.resolution}`);
    console.log(`⏱️  Time: ${processingResult.executionTime}ms`);
    console.log('');

    if (!processingResult.success) {
      throw new Error('Video processing failed');
    }

    // Step 5: YouTube Upload
    console.log('📤 STEP 5: YOUTUBE UPLOAD');
    const uploadEvent = {
      processedVideoS3Key: processingResult.processedVideoS3Key,
      topic: firstScript.topic,
      trendId: firstScript.trendId,
      scriptPrompt: firstScript.prompt,
      keywords: firstScript.keywords,
      videoMetadata: processingResult.outputMetadata,
      uploadConfig: {
        privacyStatus: 'public',
        categoryId: firstScript.seoMetadata.category
      }
    };

    const uploadResult = await youtubeUploader(uploadEvent, testContext);
    console.log(`✅ Upload success: ${uploadResult.success}`);
    console.log(`🎯 Video ID: ${uploadResult.youtubeVideoId}`);
    console.log(`📊 SEO Score: ${uploadResult.performanceMetrics.seoScore}/100`);
    console.log(`⏱️  Time: ${uploadResult.executionTime}ms`);
    console.log('');

    // Summary
    const totalTime = Date.now() - pipelineStartTime;
    console.log('🎉 MOCK PIPELINE COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(50));
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`💰 Total Cost: $${videoResult.generationCost.toFixed(2)} (estimated)`);
    console.log(`🎬 Video URL: https://youtube.com/watch?v=${uploadResult.youtubeVideoId}`);
    console.log(`📈 Topic: ${firstScript.topic}`);
    console.log(`📝 Title: "${firstScript.title}"`);
    console.log('');
    console.log('🚀 Ready for production deployment!');
    console.log('💡 Set USE_REAL_AWS_SERVICES=true to test with real AWS');

  } catch (error) {
    console.error('❌ Mock pipeline test failed:', error);
  }
}

// Usage instructions
function showUsage() {
  console.log('');
  console.log('📋 USAGE INSTRUCTIONS');
  console.log('=' .repeat(50));
  console.log('');
  console.log('🟡 Mock Mode (Default):');
  console.log('   npx ts-node test-production-pipeline.ts');
  console.log('');
  console.log('🔴 Production Mode:');
  console.log('   export USE_REAL_AWS_SERVICES=true');
  console.log('   export STATE_MACHINE_ARN="arn:aws:states:region:account:stateMachine:YouTubeAutomationWorkflow"');
  console.log('   npx ts-node test-production-pipeline.ts');
  console.log('');
  console.log('🎯 Custom Topic:');
  console.log('   export TEST_TOPIC="investing"');
  console.log('   npx ts-node test-production-pipeline.ts');
  console.log('');
  console.log('📊 Available Topics:');
  console.log('   - technology, investing, education, tourism, health, finance');
}

// Main execution
if (require.main === module) {
  testProductionPipeline().catch(error => {
    console.error('Test execution failed:', error);
    showUsage();
    process.exit(1);
  });
}

export { testProductionPipeline, config };