#!/usr/bin/env npx ts-node
"use strict";
/**
 * Production Pipeline Test
 *
 * This script tests the complete YouTube automation pipeline
 * using real AWS services (when deployed) or mock services (for testing)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.testProductionPipeline = void 0;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const config = {
    useRealServices: process.env.USE_REAL_AWS_SERVICES === 'true',
    topic: process.env.TEST_TOPIC || 'technology',
    region: process.env.AWS_REGION || 'us-east-1',
    maxResults: parseInt(process.env.MAX_RESULTS || '5'),
    hoursBack: parseInt(process.env.HOURS_BACK || '24'),
    stateMachineArn: process.env.STATE_MACHINE_ARN
};
exports.config = config;
async function testProductionPipeline() {
    console.log('🚀 YouTube Automation Platform - Production Pipeline Test');
    console.log('='.repeat(70));
    console.log(`📊 Configuration:`);
    console.log(`   🎯 Topic: ${config.topic}`);
    console.log(`   🌍 Region: ${config.region}`);
    console.log(`   📈 Max Results: ${config.maxResults}`);
    console.log(`   ⏰ Hours Back: ${config.hoursBack}`);
    console.log(`   🔧 Real Services: ${config.useRealServices ? 'YES' : 'NO (Mock Mode)'}`);
    console.log('');
    if (config.useRealServices) {
        await testWithRealAWS();
    }
    else {
        await testWithMockServices();
    }
}
exports.testProductionPipeline = testProductionPipeline;
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
        const stepFunctions = new client_sfn_1.SFNClient({ region: config.region });
        const input = {
            topics: [config.topic],
            region: 'US',
            maxResults: config.maxResults,
            hoursBack: config.hoursBack
        };
        console.log('🚀 Starting Step Functions execution...');
        console.log(`📋 Input: ${JSON.stringify(input, null, 2)}`);
        const startResult = await stepFunctions.send(new client_sfn_1.StartExecutionCommand({
            stateMachineArn: config.stateMachineArn,
            input: JSON.stringify(input),
            name: `production-test-${Date.now()}`
        }));
        const executionArn = startResult.executionArn;
        console.log(`✅ Execution started: ${executionArn}`);
        console.log('');
        // Monitor execution
        console.log('📊 Monitoring execution progress...');
        let status = 'RUNNING';
        let attempts = 0;
        const maxAttempts = 60; // 30 minutes max
        while (status === 'RUNNING' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            const describeResult = await stepFunctions.send(new client_sfn_1.DescribeExecutionCommand({
                executionArn
            }));
            status = describeResult.status;
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
            }
            else if (status === 'FAILED') {
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
    }
    catch (error) {
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
        console.log('='.repeat(50));
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log(`💰 Total Cost: $${videoResult.generationCost.toFixed(2)} (estimated)`);
        console.log(`🎬 Video URL: https://youtube.com/watch?v=${uploadResult.youtubeVideoId}`);
        console.log(`📈 Topic: ${firstScript.topic}`);
        console.log(`📝 Title: "${firstScript.title}"`);
        console.log('');
        console.log('🚀 Ready for production deployment!');
        console.log('💡 Set USE_REAL_AWS_SERVICES=true to test with real AWS');
    }
    catch (error) {
        console.error('❌ Mock pipeline test failed:', error);
    }
}
// Usage instructions
function showUsage() {
    console.log('');
    console.log('📋 USAGE INSTRUCTIONS');
    console.log('='.repeat(50));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1wcm9kdWN0aW9uLXBpcGVsaW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdC1wcm9kdWN0aW9uLXBpcGVsaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7Ozs7O0dBS0c7OztBQUVILG9EQUFpRztBQVdqRyxNQUFNLE1BQU0sR0FBeUI7SUFDbkMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEtBQUssTUFBTTtJQUM3RCxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksWUFBWTtJQUM3QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztJQUM3QyxVQUFVLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQztJQUNwRCxTQUFTLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQztJQUNuRCxlQUFlLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUI7Q0FDL0MsQ0FBQztBQW1UK0Isd0JBQU07QUFqVHZDLEtBQUssVUFBVSxzQkFBc0I7SUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyREFBMkQsQ0FBQyxDQUFDO0lBQ3pFLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FB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LENBQUMsc0NBQXNDLENBQUMsQ0FBQztJQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9HQUFvRyxDQUFDLENBQUM7SUFDbEgsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0lBQzFELE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7SUFDMUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDO0FBQ2pGLENBQUM7QUFFRCxpQkFBaUI7QUFDakIsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtJQUMzQixzQkFBc0IsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNyQyxPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLFNBQVMsRUFBRSxDQUFDO1FBQ1osT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbnB4IHRzLW5vZGVcclxuXHJcbi8qKlxyXG4gKiBQcm9kdWN0aW9uIFBpcGVsaW5lIFRlc3RcclxuICogXHJcbiAqIFRoaXMgc2NyaXB0IHRlc3RzIHRoZSBjb21wbGV0ZSBZb3VUdWJlIGF1dG9tYXRpb24gcGlwZWxpbmVcclxuICogdXNpbmcgcmVhbCBBV1Mgc2VydmljZXMgKHdoZW4gZGVwbG95ZWQpIG9yIG1vY2sgc2VydmljZXMgKGZvciB0ZXN0aW5nKVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFNGTkNsaWVudCwgU3RhcnRFeGVjdXRpb25Db21tYW5kLCBEZXNjcmliZUV4ZWN1dGlvbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2ZuJztcclxuXHJcbmludGVyZmFjZSBQcm9kdWN0aW9uVGVzdENvbmZpZyB7XHJcbiAgdXNlUmVhbFNlcnZpY2VzOiBib29sZWFuO1xyXG4gIHRvcGljOiBzdHJpbmc7XHJcbiAgcmVnaW9uOiBzdHJpbmc7XHJcbiAgbWF4UmVzdWx0czogbnVtYmVyO1xyXG4gIGhvdXJzQmFjazogbnVtYmVyO1xyXG4gIHN0YXRlTWFjaGluZUFybj86IHN0cmluZztcclxufVxyXG5cclxuY29uc3QgY29uZmlnOiBQcm9kdWN0aW9uVGVzdENvbmZpZyA9IHtcclxuICB1c2VSZWFsU2VydmljZXM6IHByb2Nlc3MuZW52LlVTRV9SRUFMX0FXU19TRVJWSUNFUyA9PT0gJ3RydWUnLFxyXG4gIHRvcGljOiBwcm9jZXNzLmVudi5URVNUX1RPUElDIHx8ICd0ZWNobm9sb2d5JyxcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgbWF4UmVzdWx0czogcGFyc2VJbnQocHJvY2Vzcy5lbnYuTUFYX1JFU1VMVFMgfHwgJzUnKSxcclxuICBob3Vyc0JhY2s6IHBhcnNlSW50KHByb2Nlc3MuZW52LkhPVVJTX0JBQ0sgfHwgJzI0JyksXHJcbiAgc3RhdGVNYWNoaW5lQXJuOiBwcm9jZXNzLmVudi5TVEFURV9NQUNISU5FX0FSTlxyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gdGVzdFByb2R1Y3Rpb25QaXBlbGluZSgpIHtcclxuICBjb25zb2xlLmxvZygn8J+agCBZb3VUdWJlIEF1dG9tYXRpb24gUGxhdGZvcm0gLSBQcm9kdWN0aW9uIFBpcGVsaW5lIFRlc3QnKTtcclxuICBjb25zb2xlLmxvZygnPScgLnJlcGVhdCg3MCkpO1xyXG4gIGNvbnNvbGUubG9nKGDwn5OKIENvbmZpZ3VyYXRpb246YCk7XHJcbiAgY29uc29sZS5sb2coYCAgIPCfjq8gVG9waWM6ICR7Y29uZmlnLnRvcGljfWApO1xyXG4gIGNvbnNvbGUubG9nKGAgICDwn4yNIFJlZ2lvbjogJHtjb25maWcucmVnaW9ufWApO1xyXG4gIGNvbnNvbGUubG9nKGAgICDwn5OIIE1heCBSZXN1bHRzOiAke2NvbmZpZy5tYXhSZXN1bHRzfWApO1xyXG4gIGNvbnNvbGUubG9nKGAgICDij7AgSG91cnMgQmFjazogJHtjb25maWcuaG91cnNCYWNrfWApO1xyXG4gIGNvbnNvbGUubG9nKGAgICDwn5SnIFJlYWwgU2VydmljZXM6ICR7Y29uZmlnLnVzZVJlYWxTZXJ2aWNlcyA/ICdZRVMnIDogJ05PIChNb2NrIE1vZGUpJ31gKTtcclxuICBjb25zb2xlLmxvZygnJyk7XHJcblxyXG4gIGlmIChjb25maWcudXNlUmVhbFNlcnZpY2VzKSB7XHJcbiAgICBhd2FpdCB0ZXN0V2l0aFJlYWxBV1MoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgYXdhaXQgdGVzdFdpdGhNb2NrU2VydmljZXMoKTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRlc3RXaXRoUmVhbEFXUygpIHtcclxuICBjb25zb2xlLmxvZygn8J+UtCBQUk9EVUNUSU9OIE1PREU6IFVzaW5nIFJlYWwgQVdTIFNlcnZpY2VzJyk7XHJcbiAgY29uc29sZS5sb2coJ+KaoO+4jyAgVGhpcyB3aWxsIGluY3VyIGFjdHVhbCBBV1MgY29zdHMgKH4kOC4yNSBwZXIgdmlkZW8pJyk7XHJcbiAgY29uc29sZS5sb2coJycpO1xyXG5cclxuICBpZiAoIWNvbmZpZy5zdGF0ZU1hY2hpbmVBcm4pIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBTVEFURV9NQUNISU5FX0FSTiBlbnZpcm9ubWVudCB2YXJpYWJsZSByZXF1aXJlZCBmb3IgcHJvZHVjdGlvbiBtb2RlJyk7XHJcbiAgICBjb25zb2xlLmxvZygnJyk7XHJcbiAgICBjb25zb2xlLmxvZygn8J+SoSBUbyBnZXQgdGhlIEFSTiwgcnVuOicpO1xyXG4gICAgY29uc29sZS5sb2coJyAgIGF3cyBzdGVwZnVuY3Rpb25zIGxpc3Qtc3RhdGUtbWFjaGluZXMgLS1xdWVyeSBcInN0YXRlTWFjaGluZXNbP25hbWU9PVxcJ1lvdVR1YmVBdXRvbWF0aW9uV29ya2Zsb3dcXCddLnN0YXRlTWFjaGluZUFyblwiIC0tb3V0cHV0IHRleHQnKTtcclxuICAgIGNvbnNvbGUubG9nKCcnKTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5KhIFRoZW4gc2V0IHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZTonKTtcclxuICAgIGNvbnNvbGUubG9nKCcgICBleHBvcnQgU1RBVEVfTUFDSElORV9BUk49XCJhcm46YXdzOnN0YXRlczpyZWdpb246YWNjb3VudDpzdGF0ZU1hY2hpbmU6WW91VHViZUF1dG9tYXRpb25Xb3JrZmxvd1wiJyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3Qgc3RlcEZ1bmN0aW9ucyA9IG5ldyBTRk5DbGllbnQoeyByZWdpb246IGNvbmZpZy5yZWdpb24gfSk7XHJcbiAgICBcclxuICAgIGNvbnN0IGlucHV0ID0ge1xyXG4gICAgICB0b3BpY3M6IFtjb25maWcudG9waWNdLFxyXG4gICAgICByZWdpb246ICdVUycsXHJcbiAgICAgIG1heFJlc3VsdHM6IGNvbmZpZy5tYXhSZXN1bHRzLFxyXG4gICAgICBob3Vyc0JhY2s6IGNvbmZpZy5ob3Vyc0JhY2tcclxuICAgIH07XHJcblxyXG4gICAgY29uc29sZS5sb2coJ/CfmoAgU3RhcnRpbmcgU3RlcCBGdW5jdGlvbnMgZXhlY3V0aW9uLi4uJyk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TiyBJbnB1dDogJHtKU09OLnN0cmluZ2lmeShpbnB1dCwgbnVsbCwgMil9YCk7XHJcbiAgICBcclxuICAgIGNvbnN0IHN0YXJ0UmVzdWx0ID0gYXdhaXQgc3RlcEZ1bmN0aW9ucy5zZW5kKG5ldyBTdGFydEV4ZWN1dGlvbkNvbW1hbmQoe1xyXG4gICAgICBzdGF0ZU1hY2hpbmVBcm46IGNvbmZpZy5zdGF0ZU1hY2hpbmVBcm4sXHJcbiAgICAgIGlucHV0OiBKU09OLnN0cmluZ2lmeShpbnB1dCksXHJcbiAgICAgIG5hbWU6IGBwcm9kdWN0aW9uLXRlc3QtJHtEYXRlLm5vdygpfWBcclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCBleGVjdXRpb25Bcm4gPSBzdGFydFJlc3VsdC5leGVjdXRpb25Bcm4hO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBFeGVjdXRpb24gc3RhcnRlZDogJHtleGVjdXRpb25Bcm59YCk7XHJcbiAgICBjb25zb2xlLmxvZygnJyk7XHJcblxyXG4gICAgLy8gTW9uaXRvciBleGVjdXRpb25cclxuICAgIGNvbnNvbGUubG9nKCfwn5OKIE1vbml0b3JpbmcgZXhlY3V0aW9uIHByb2dyZXNzLi4uJyk7XHJcbiAgICBsZXQgc3RhdHVzID0gJ1JVTk5JTkcnO1xyXG4gICAgbGV0IGF0dGVtcHRzID0gMDtcclxuICAgIGNvbnN0IG1heEF0dGVtcHRzID0gNjA7IC8vIDMwIG1pbnV0ZXMgbWF4XHJcblxyXG4gICAgd2hpbGUgKHN0YXR1cyA9PT0gJ1JVTk5JTkcnICYmIGF0dGVtcHRzIDwgbWF4QXR0ZW1wdHMpIHtcclxuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDMwMDAwKSk7IC8vIFdhaXQgMzAgc2Vjb25kc1xyXG4gICAgICBcclxuICAgICAgY29uc3QgZGVzY3JpYmVSZXN1bHQgPSBhd2FpdCBzdGVwRnVuY3Rpb25zLnNlbmQobmV3IERlc2NyaWJlRXhlY3V0aW9uQ29tbWFuZCh7XHJcbiAgICAgICAgZXhlY3V0aW9uQXJuXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHN0YXR1cyA9IGRlc2NyaWJlUmVzdWx0LnN0YXR1cyE7XHJcbiAgICAgIGF0dGVtcHRzKys7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhg4o+x77iPICBTdGF0dXM6ICR7c3RhdHVzfSAoJHthdHRlbXB0cyAqIDMwfXMgZWxhcHNlZClgKTtcclxuXHJcbiAgICAgIGlmIChzdGF0dXMgPT09ICdTVUNDRUVERUQnKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJycpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfwn46JIFBJUEVMSU5FIENPTVBMRVRFRCBTVUNDRVNTRlVMTFkhJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4ogUmVzdWx0czonKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShKU09OLnBhcnNlKGRlc2NyaWJlUmVzdWx0Lm91dHB1dCB8fCAne30nKSwgbnVsbCwgMikpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+OrCBDaGVjayB5b3VyIFlvdVR1YmUgY2hhbm5lbCBmb3IgdGhlIG5ldyB2aWRlbyEnKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+TiCBNb25pdG9yIGNvc3RzIGluIEFXUyBCaWxsaW5nIERhc2hib2FyZCcpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PT0gJ0ZBSUxFRCcpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+KdjCBQSVBFTElORSBGQUlMRUQnKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+TiyBFcnJvciBkZXRhaWxzOicpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGRlc2NyaWJlUmVzdWx0LmVycm9yIHx8ICdObyBlcnJvciBkZXRhaWxzIGF2YWlsYWJsZScpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGF0dGVtcHRzID49IG1heEF0dGVtcHRzKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcclxuICAgICAgY29uc29sZS5sb2coJ+KPsCBFeGVjdXRpb24gbW9uaXRvcmluZyB0aW1lZCBvdXQgKDMwIG1pbnV0ZXMpJyk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCfwn5KhIENoZWNrIEFXUyBTdGVwIEZ1bmN0aW9ucyBjb25zb2xlIGZvciBjdXJyZW50IHN0YXR1cycpO1xyXG4gICAgICBjb25zb2xlLmxvZyhg8J+UlyBFeGVjdXRpb24gQVJOOiAke2V4ZWN1dGlvbkFybn1gKTtcclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBQcm9kdWN0aW9uIHRlc3QgZmFpbGVkOicsIGVycm9yKTtcclxuICAgIGNvbnNvbGUubG9nKCcnKTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5SnIFRyb3VibGVzaG9vdGluZyBzdGVwczonKTtcclxuICAgIGNvbnNvbGUubG9nKCcxLiBWZXJpZnkgQVdTIGNyZWRlbnRpYWxzIGFyZSBjb25maWd1cmVkJyk7XHJcbiAgICBjb25zb2xlLmxvZygnMi4gRW5zdXJlIFN0ZXAgRnVuY3Rpb25zIHN0YXRlIG1hY2hpbmUgaXMgZGVwbG95ZWQnKTtcclxuICAgIGNvbnNvbGUubG9nKCczLiBDaGVjayBJQU0gcGVybWlzc2lvbnMgZm9yIFN0ZXAgRnVuY3Rpb25zIGV4ZWN1dGlvbicpO1xyXG4gICAgY29uc29sZS5sb2coJzQuIFZlcmlmeSBZb3VUdWJlIEFQSSBjcmVkZW50aWFscyBpbiBTZWNyZXRzIE1hbmFnZXInKTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRlc3RXaXRoTW9ja1NlcnZpY2VzKCkge1xyXG4gIGNvbnNvbGUubG9nKCfwn5+hIE1PQ0sgTU9ERTogVXNpbmcgU2ltdWxhdGVkIFNlcnZpY2VzJyk7XHJcbiAgY29uc29sZS5sb2coJ/CfkqEgVGhpcyBkZW1vbnN0cmF0ZXMgdGhlIHBpcGVsaW5lIHdpdGhvdXQgQVdTIGNvc3RzJyk7XHJcbiAgY29uc29sZS5sb2coJycpO1xyXG5cclxuICAvLyBJbXBvcnQgYW5kIHJ1biB0aGUgbW9jayBwaXBlbGluZSB0ZXN0XHJcbiAgY29uc3QgeyBoYW5kbGVyOiB0cmVuZERldGVjdG9yIH0gPSByZXF1aXJlKCcuL2xhbWJkYS90cmVuZC1kZXRlY3Rvci9pbmRleC5qcycpO1xyXG4gIGNvbnN0IHsgaGFuZGxlcjogY29udGVudEFuYWx5emVyIH0gPSByZXF1aXJlKCcuL2xhbWJkYS9jb250ZW50LWFuYWx5emVyL2Rpc3QvaW5kZXguanMnKTtcclxuICBjb25zdCB7IGhhbmRsZXI6IHZpZGVvR2VuZXJhdG9yIH0gPSByZXF1aXJlKCcuL2xhbWJkYS92aWRlby1nZW5lcmF0b3IvZGlzdC9pbmRleC5qcycpO1xyXG4gIGNvbnN0IHsgaGFuZGxlcjogdmlkZW9Qcm9jZXNzb3IgfSA9IHJlcXVpcmUoJy4vbGFtYmRhL3ZpZGVvLXByb2Nlc3Nvci9pbmRleC5qcycpO1xyXG4gIGNvbnN0IHsgaGFuZGxlcjogeW91dHViZVVwbG9hZGVyIH0gPSByZXF1aXJlKCcuL2xhbWJkYS95b3V0dWJlLXVwbG9hZGVyL2luZGV4LmpzJyk7XHJcblxyXG4gIC8vIEVuYWJsZSBtb2NrIG1vZGVzXHJcbiAgcHJvY2Vzcy5lbnYuTU9DS19WSURFT19HRU5FUkFUSU9OID0gJ3RydWUnO1xyXG4gIHByb2Nlc3MuZW52Lk1PQ0tfWU9VVFVCRV9BUEkgPSAndHJ1ZSc7XHJcbiAgcHJvY2Vzcy5lbnYuTU9DS19NRURJQUNPTlZFUlQgPSAndHJ1ZSc7XHJcbiAgcHJvY2Vzcy5lbnYuQ09OVEVOVF9BTkFMWVNJU19UQUJMRSA9ICdtb2NrLXRhYmxlJztcclxuXHJcbiAgY29uc3QgdGVzdENvbnRleHQgPSB7XHJcbiAgICBhd3NSZXF1ZXN0SWQ6ICdwcm9kdWN0aW9uLXRlc3QtMTIzJyxcclxuICAgIGdldFJlbWFpbmluZ1RpbWVJbk1pbGxpczogKCkgPT4gMzAwMDAwXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgcGlwZWxpbmVTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gU3RlcCAxOiBUcmVuZCBEZXRlY3Rpb25cclxuICAgIGNvbnNvbGUubG9nKCfwn5OKIFNURVAgMTogVFJFTkQgREVURUNUSU9OJyk7XHJcbiAgICBjb25zdCB0cmVuZEV2ZW50ID0ge1xyXG4gICAgICB0b3BpY3M6IFtjb25maWcudG9waWNdLFxyXG4gICAgICByZWdpb246ICdVUycsXHJcbiAgICAgIG1heFJlc3VsdHM6IGNvbmZpZy5tYXhSZXN1bHRzLFxyXG4gICAgICBob3Vyc0JhY2s6IGNvbmZpZy5ob3Vyc0JhY2tcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdHJlbmRSZXN1bHQgPSBhd2FpdCB0cmVuZERldGVjdG9yKHRyZW5kRXZlbnQsIHRlc3RDb250ZXh0KTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgVHJlbmRzIGRldGVjdGVkOiAke3RyZW5kUmVzdWx0LnRyZW5kc0RldGVjdGVkfWApO1xyXG4gICAgY29uc29sZS5sb2coYOKPse+4jyAgVGltZTogJHt0cmVuZFJlc3VsdC5leGVjdXRpb25UaW1lfW1zYCk7XHJcbiAgICBjb25zb2xlLmxvZygnJyk7XHJcblxyXG4gICAgaWYgKCF0cmVuZFJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHJlbmQgZGV0ZWN0aW9uIGZhaWxlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgMjogQ29udGVudCBBbmFseXNpc1xyXG4gICAgY29uc29sZS5sb2coJ/Cfp6AgU1RFUCAyOiBDT05URU5UIEFOQUxZU0lTJyk7XHJcbiAgICBjb25zdCBmaXJzdFRvcGljUmVzdWx0ID0gdHJlbmRSZXN1bHQucmVzdWx0c1swXTtcclxuICAgIGNvbnN0IGNvbnRlbnRFdmVudCA9IHtcclxuICAgICAgdG9waWM6IGZpcnN0VG9waWNSZXN1bHQudG9waWMsXHJcbiAgICAgIHRyZW5kc0RhdGE6IGZpcnN0VG9waWNSZXN1bHQudHJlbmRzLFxyXG4gICAgICBtYXhWaWRlb3M6IDEsXHJcbiAgICAgIG1pbkVuZ2FnZW1lbnRTY29yZTogMC4wMlxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjb250ZW50UmVzdWx0ID0gYXdhaXQgY29udGVudEFuYWx5emVyKGNvbnRlbnRFdmVudCwgdGVzdENvbnRleHQpO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBTY3JpcHQgcHJvbXB0czogJHtjb250ZW50UmVzdWx0LnNjcmlwdFByb21wdHMubGVuZ3RofWApO1xyXG4gICAgY29uc29sZS5sb2coYPCfk50gVGl0bGU6IFwiJHtjb250ZW50UmVzdWx0LnNjcmlwdFByb21wdHNbMF0/LnRpdGxlfVwiYCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4o+x77iPICBUaW1lOiAke2NvbnRlbnRSZXN1bHQuZXhlY3V0aW9uVGltZX1tc2ApO1xyXG4gICAgY29uc29sZS5sb2coJycpO1xyXG5cclxuICAgIGlmICghY29udGVudFJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ29udGVudCBhbmFseXNpcyBmYWlsZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdGVwIDM6IFZpZGVvIEdlbmVyYXRpb25cclxuICAgIGNvbnNvbGUubG9nKCfwn46sIFNURVAgMzogVklERU8gR0VORVJBVElPTicpO1xyXG4gICAgY29uc3QgZmlyc3RTY3JpcHQgPSBjb250ZW50UmVzdWx0LnNjcmlwdFByb21wdHNbMF07XHJcbiAgICBjb25zdCB2aWRlb0V2ZW50ID0ge1xyXG4gICAgICBzY3JpcHRQcm9tcHQ6IGZpcnN0U2NyaXB0LnByb21wdCxcclxuICAgICAgdG9waWM6IGZpcnN0U2NyaXB0LnRvcGljLFxyXG4gICAgICB0cmVuZElkOiBmaXJzdFNjcmlwdC50cmVuZElkLFxyXG4gICAgICB2aWRlb0NvbmZpZzoge1xyXG4gICAgICAgIGR1cmF0aW9uU2Vjb25kczogTWF0aC5taW4oZmlyc3RTY3JpcHQuZXN0aW1hdGVkTGVuZ3RoLCA2MDApLFxyXG4gICAgICAgIGZwczogMjQsXHJcbiAgICAgICAgZGltZW5zaW9uOiAnMTkyMHgxMDgwJyxcclxuICAgICAgICBxdWFsaXR5OiAnaGlnaCcsXHJcbiAgICAgICAgaW5jbHVkZUF1ZGlvOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIGF1ZGlvQ29uZmlnOiB7XHJcbiAgICAgICAgdm9pY2U6ICdNYXR0aGV3JyxcclxuICAgICAgICBzcGVlZDogJ21lZGl1bScsXHJcbiAgICAgICAgbGFuZ3VhZ2U6ICdlbi1VUydcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCB2aWRlb1Jlc3VsdCA9IGF3YWl0IHZpZGVvR2VuZXJhdG9yKHZpZGVvRXZlbnQsIHRlc3RDb250ZXh0KTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgVmlkZW8gZ2VuZXJhdGVkOiAke3ZpZGVvUmVzdWx0LnN1Y2Nlc3N9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+SsCBDb3N0OiAkJHt2aWRlb1Jlc3VsdC5nZW5lcmF0aW9uQ29zdC50b0ZpeGVkKDIpfWApO1xyXG4gICAgY29uc29sZS5sb2coYPCfk4ogU2l6ZTogJHsodmlkZW9SZXN1bHQubWV0YWRhdGEuZmlsZVNpemUgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgyKX0gTUJgKTtcclxuICAgIGNvbnNvbGUubG9nKGDij7HvuI8gIFRpbWU6ICR7dmlkZW9SZXN1bHQuZXhlY3V0aW9uVGltZX1tc2ApO1xyXG4gICAgY29uc29sZS5sb2coJycpO1xyXG5cclxuICAgIGlmICghdmlkZW9SZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZGVvIGdlbmVyYXRpb24gZmFpbGVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RlcCA0OiBWaWRlbyBQcm9jZXNzaW5nXHJcbiAgICBjb25zb2xlLmxvZygn4pqZ77iPICBTVEVQIDQ6IFZJREVPIFBST0NFU1NJTkcnKTtcclxuICAgIGNvbnN0IHByb2Nlc3NpbmdFdmVudCA9IHtcclxuICAgICAgdmlkZW9TM0tleTogdmlkZW9SZXN1bHQudmlkZW9TM0tleSxcclxuICAgICAgYXVkaW9TM0tleTogdmlkZW9SZXN1bHQuYXVkaW9TM0tleSxcclxuICAgICAgdG9waWM6IGZpcnN0U2NyaXB0LnRvcGljLFxyXG4gICAgICB0cmVuZElkOiBmaXJzdFNjcmlwdC50cmVuZElkLFxyXG4gICAgICBtZXRhZGF0YTogdmlkZW9SZXN1bHQubWV0YWRhdGEsXHJcbiAgICAgIHByb2Nlc3NpbmdDb25maWc6IHtcclxuICAgICAgICBvdXRwdXRGb3JtYXQ6ICdtcDQnLFxyXG4gICAgICAgIHF1YWxpdHk6ICdoaWdoJyxcclxuICAgICAgICByZXNvbHV0aW9uOiAnMTkyMHgxMDgwJyxcclxuICAgICAgICBiaXRyYXRlOiAnODAwMCdcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBwcm9jZXNzaW5nUmVzdWx0ID0gYXdhaXQgdmlkZW9Qcm9jZXNzb3IocHJvY2Vzc2luZ0V2ZW50LCB0ZXN0Q29udGV4dCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFZpZGVvIHByb2Nlc3NlZDogJHtwcm9jZXNzaW5nUmVzdWx0LnN1Y2Nlc3N9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TkCBSZXNvbHV0aW9uOiAke3Byb2Nlc3NpbmdSZXN1bHQub3V0cHV0TWV0YWRhdGEucmVzb2x1dGlvbn1gKTtcclxuICAgIGNvbnNvbGUubG9nKGDij7HvuI8gIFRpbWU6ICR7cHJvY2Vzc2luZ1Jlc3VsdC5leGVjdXRpb25UaW1lfW1zYCk7XHJcbiAgICBjb25zb2xlLmxvZygnJyk7XHJcblxyXG4gICAgaWYgKCFwcm9jZXNzaW5nUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWRlbyBwcm9jZXNzaW5nIGZhaWxlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgNTogWW91VHViZSBVcGxvYWRcclxuICAgIGNvbnNvbGUubG9nKCfwn5OkIFNURVAgNTogWU9VVFVCRSBVUExPQUQnKTtcclxuICAgIGNvbnN0IHVwbG9hZEV2ZW50ID0ge1xyXG4gICAgICBwcm9jZXNzZWRWaWRlb1MzS2V5OiBwcm9jZXNzaW5nUmVzdWx0LnByb2Nlc3NlZFZpZGVvUzNLZXksXHJcbiAgICAgIHRvcGljOiBmaXJzdFNjcmlwdC50b3BpYyxcclxuICAgICAgdHJlbmRJZDogZmlyc3RTY3JpcHQudHJlbmRJZCxcclxuICAgICAgc2NyaXB0UHJvbXB0OiBmaXJzdFNjcmlwdC5wcm9tcHQsXHJcbiAgICAgIGtleXdvcmRzOiBmaXJzdFNjcmlwdC5rZXl3b3JkcyxcclxuICAgICAgdmlkZW9NZXRhZGF0YTogcHJvY2Vzc2luZ1Jlc3VsdC5vdXRwdXRNZXRhZGF0YSxcclxuICAgICAgdXBsb2FkQ29uZmlnOiB7XHJcbiAgICAgICAgcHJpdmFjeVN0YXR1czogJ3B1YmxpYycsXHJcbiAgICAgICAgY2F0ZWdvcnlJZDogZmlyc3RTY3JpcHQuc2VvTWV0YWRhdGEuY2F0ZWdvcnlcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCB1cGxvYWRSZXN1bHQgPSBhd2FpdCB5b3V0dWJlVXBsb2FkZXIodXBsb2FkRXZlbnQsIHRlc3RDb250ZXh0KTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgVXBsb2FkIHN1Y2Nlc3M6ICR7dXBsb2FkUmVzdWx0LnN1Y2Nlc3N9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+OryBWaWRlbyBJRDogJHt1cGxvYWRSZXN1bHQueW91dHViZVZpZGVvSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TiiBTRU8gU2NvcmU6ICR7dXBsb2FkUmVzdWx0LnBlcmZvcm1hbmNlTWV0cmljcy5zZW9TY29yZX0vMTAwYCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4o+x77iPICBUaW1lOiAke3VwbG9hZFJlc3VsdC5leGVjdXRpb25UaW1lfW1zYCk7XHJcbiAgICBjb25zb2xlLmxvZygnJyk7XHJcblxyXG4gICAgLy8gU3VtbWFyeVxyXG4gICAgY29uc3QgdG90YWxUaW1lID0gRGF0ZS5ub3coKSAtIHBpcGVsaW5lU3RhcnRUaW1lO1xyXG4gICAgY29uc29sZS5sb2coJ/CfjokgTU9DSyBQSVBFTElORSBDT01QTEVURUQgU1VDQ0VTU0ZVTExZIScpO1xyXG4gICAgY29uc29sZS5sb2coJz0nIC5yZXBlYXQoNTApKTtcclxuICAgIGNvbnNvbGUubG9nKGDij7HvuI8gIFRvdGFsIFRpbWU6ICR7dG90YWxUaW1lfW1zYCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+SsCBUb3RhbCBDb3N0OiAkJHt2aWRlb1Jlc3VsdC5nZW5lcmF0aW9uQ29zdC50b0ZpeGVkKDIpfSAoZXN0aW1hdGVkKWApO1xyXG4gICAgY29uc29sZS5sb2coYPCfjqwgVmlkZW8gVVJMOiBodHRwczovL3lvdXR1YmUuY29tL3dhdGNoP3Y9JHt1cGxvYWRSZXN1bHQueW91dHViZVZpZGVvSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TiCBUb3BpYzogJHtmaXJzdFNjcmlwdC50b3BpY31gKTtcclxuICAgIGNvbnNvbGUubG9nKGDwn5OdIFRpdGxlOiBcIiR7Zmlyc3RTY3JpcHQudGl0bGV9XCJgKTtcclxuICAgIGNvbnNvbGUubG9nKCcnKTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5qAIFJlYWR5IGZvciBwcm9kdWN0aW9uIGRlcGxveW1lbnQhJyk7XHJcbiAgICBjb25zb2xlLmxvZygn8J+SoSBTZXQgVVNFX1JFQUxfQVdTX1NFUlZJQ0VTPXRydWUgdG8gdGVzdCB3aXRoIHJlYWwgQVdTJyk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCfinYwgTW9jayBwaXBlbGluZSB0ZXN0IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBVc2FnZSBpbnN0cnVjdGlvbnNcclxuZnVuY3Rpb24gc2hvd1VzYWdlKCkge1xyXG4gIGNvbnNvbGUubG9nKCcnKTtcclxuICBjb25zb2xlLmxvZygn8J+TiyBVU0FHRSBJTlNUUlVDVElPTlMnKTtcclxuICBjb25zb2xlLmxvZygnPScgLnJlcGVhdCg1MCkpO1xyXG4gIGNvbnNvbGUubG9nKCcnKTtcclxuICBjb25zb2xlLmxvZygn8J+foSBNb2NrIE1vZGUgKERlZmF1bHQpOicpO1xyXG4gIGNvbnNvbGUubG9nKCcgICBucHggdHMtbm9kZSB0ZXN0LXByb2R1Y3Rpb24tcGlwZWxpbmUudHMnKTtcclxuICBjb25zb2xlLmxvZygnJyk7XHJcbiAgY29uc29sZS5sb2coJ/CflLQgUHJvZHVjdGlvbiBNb2RlOicpO1xyXG4gIGNvbnNvbGUubG9nKCcgICBleHBvcnQgVVNFX1JFQUxfQVdTX1NFUlZJQ0VTPXRydWUnKTtcclxuICBjb25zb2xlLmxvZygnICAgZXhwb3J0IFNUQVRFX01BQ0hJTkVfQVJOPVwiYXJuOmF3czpzdGF0ZXM6cmVnaW9uOmFjY291bnQ6c3RhdGVNYWNoaW5lOllvdVR1YmVBdXRvbWF0aW9uV29ya2Zsb3dcIicpO1xyXG4gIGNvbnNvbGUubG9nKCcgICBucHggdHMtbm9kZSB0ZXN0LXByb2R1Y3Rpb24tcGlwZWxpbmUudHMnKTtcclxuICBjb25zb2xlLmxvZygnJyk7XHJcbiAgY29uc29sZS5sb2coJ/Cfjq8gQ3VzdG9tIFRvcGljOicpO1xyXG4gIGNvbnNvbGUubG9nKCcgICBleHBvcnQgVEVTVF9UT1BJQz1cImludmVzdGluZ1wiJyk7XHJcbiAgY29uc29sZS5sb2coJyAgIG5weCB0cy1ub2RlIHRlc3QtcHJvZHVjdGlvbi1waXBlbGluZS50cycpO1xyXG4gIGNvbnNvbGUubG9nKCcnKTtcclxuICBjb25zb2xlLmxvZygn8J+TiiBBdmFpbGFibGUgVG9waWNzOicpO1xyXG4gIGNvbnNvbGUubG9nKCcgICAtIHRlY2hub2xvZ3ksIGludmVzdGluZywgZWR1Y2F0aW9uLCB0b3VyaXNtLCBoZWFsdGgsIGZpbmFuY2UnKTtcclxufVxyXG5cclxuLy8gTWFpbiBleGVjdXRpb25cclxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XHJcbiAgdGVzdFByb2R1Y3Rpb25QaXBlbGluZSgpLmNhdGNoKGVycm9yID0+IHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1Rlc3QgZXhlY3V0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICBzaG93VXNhZ2UoKTtcclxuICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IHsgdGVzdFByb2R1Y3Rpb25QaXBlbGluZSwgY29uZmlnIH07Il19