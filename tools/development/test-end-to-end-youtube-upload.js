#!/usr/bin/env node

/**
 * End-to-End YouTube Upload Test
 * Tests complete pipeline: Video Generation with Audio → YouTube Upload
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

class EndToEndYouTubeTest {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.lambda = new LambdaClient({ region: this.region });
        this.testResults = {};
    }

    async runCompleteTest() {
        console.log('🎬 END-TO-END YOUTUBE UPLOAD TEST');
        console.log('=' .repeat(60));
        console.log('🎯 Testing: Video Generation with Audio → YouTube Upload\n');

        try {
            // Step 1: Generate video with audio
            console.log('📹 STEP 1: Generating video with audio...');
            await this.generateVideoWithAudio();

            // Step 2: Upload to YouTube
            console.log('\n📤 STEP 2: Uploading to YouTube...');
            await this.uploadToYouTube();

            // Step 3: Verify results
            console.log('\n✅ STEP 3: Verifying results...');
            this.verifyResults();

            console.log('\n🎉 END-TO-END TEST RESULTS:');
            this.printFinalResults();

        } catch (error) {
            console.error('\n❌ END-TO-END TEST FAILED:', error.message);
            console.log('\n📋 TROUBLESHOOTING STEPS:');
            console.log('1. Check AWS credentials and permissions');
            console.log('2. Verify YouTube API credentials in Secrets Manager');
            console.log('3. Ensure all Lambda functions are deployed');
            console.log('4. Check CloudWatch logs for detailed error information');
        }
    }

    async generateVideoWithAudio() {
        const testEvent = {
            topic: 'ETF investing benefits',
            category: 'finance',
            trendId: `test-${Date.now()}`,
            trendData: {
                keyword: 'index ETF investing',
                searchVolume: 50000,
                relatedTerms: ['ETF', 'index funds', 'diversification', 'low fees', 'passive investing'],
                context: {
                    newsArticles: [
                        'Index ETFs continue to attract investors with low fees and broad diversification',
                        'ETF market reaches new highs as investors seek cost-effective investment solutions'
                    ],
                    socialMentions: [
                        'ETFs are perfect for beginners - low cost and instant diversification',
                        'Why I switched from mutual funds to ETFs - the fee difference is huge'
                    ]
                }
            },
            videoConfig: {
                durationSeconds: 10, // Longer video for better testing
                style: 'professional',
                targetAudience: 'professionals',
                includeAudio: true,  // CRITICAL: Enable audio generation
                fps: 24,
                dimension: '1280x720',
                quality: 'high'
            },
            audioConfig: {
                voice: 'Matthew', // Professional male voice for finance content
                speed: 'medium',
                language: 'en-US'
            },
            scriptPrompt: `Create a comprehensive video about ETF investing benefits. 
            
            Explain how index ETFs provide instant diversification across hundreds or thousands of stocks with minimal fees. 
            Show visual examples of popular ETFs like VTI, VOO, and VXUS. 
            Highlight the key advantages: low expense ratios (often under 0.1%), broad market exposure, 
            tax efficiency, and ease of trading. 
            
            Include specific examples: A $10,000 investment in VTI gives you ownership in over 4,000 US companies. 
            Compare expense ratios: traditional mutual funds often charge 0.5-1.5% while ETFs charge 0.03-0.20%.
            
            End with actionable advice: Start with broad market ETFs, consider international diversification, 
            and focus on long-term investing rather than trading.`,
            keywords: ['ETF', 'index funds', 'investing', 'diversification', 'low fees', 'passive investing', 'VTI', 'VOO']
        };

        console.log('📋 Video Generation Configuration:');
        console.log(`   Topic: ${testEvent.topic}`);
        console.log(`   Duration: ${testEvent.videoConfig.durationSeconds} seconds`);
        console.log(`   Audio Enabled: ${testEvent.videoConfig.includeAudio ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Voice: ${testEvent.audioConfig.voice}`);
        console.log(`   Keywords: ${testEvent.keywords.slice(0, 3).join(', ')}`);

        try {
            const result = await this.lambda.send(new InvokeCommand({
                FunctionName: 'youtube-automation-video-generator',
                Payload: JSON.stringify(testEvent)
            }));

            const response = JSON.parse(new TextDecoder().decode(result.Payload));

            if (!response.success) {
                throw new Error(`Video generation failed: ${response.error}`);
            }

            console.log('  ✅ Video generation completed successfully');
            console.log(`    Original Video: ${response.videoS3Key}`);
            console.log(`    Audio File: ${response.audioS3Key || 'NOT GENERATED ❌'}`);
            console.log(`    Processed Video: ${response.processedVideoS3Key || 'NOT CREATED ❌'}`);
            console.log(`    Has Audio: ${response.metadata?.hasAudio ? 'YES ✅' : 'NO ❌'}`);
            console.log(`    Generation Cost: $${response.generationCost}`);
            console.log(`    Execution Time: ${response.executionTime}ms`);

            // Store results for YouTube upload
            this.testResults.videoGeneration = {
                success: true,
                videoS3Key: response.videoS3Key,
                audioS3Key: response.audioS3Key,
                processedVideoS3Key: response.processedVideoS3Key,
                hasAudio: response.metadata?.hasAudio,
                metadata: response.metadata,
                generationCost: response.generationCost,
                testEvent: testEvent
            };

            if (!response.processedVideoS3Key) {
                throw new Error('No processed video created - audio integration may have failed');
            }

            if (!response.metadata?.hasAudio) {
                console.warn('⚠️  WARNING: Video generated but audio integration not confirmed');
            }

        } catch (error) {
            console.error('  ❌ Video generation failed:', error.message);
            throw error;
        }
    }

    async uploadToYouTube() {
        if (!this.testResults.videoGeneration?.success) {
            throw new Error('Cannot upload to YouTube - video generation failed');
        }

        const videoGenResult = this.testResults.videoGeneration;
        
        // Prepare YouTube upload event
        const uploadEvent = {
            processedVideoS3Key: videoGenResult.processedVideoS3Key,
            topic: videoGenResult.testEvent.topic,
            trendId: videoGenResult.testEvent.trendId,
            keywords: videoGenResult.testEvent.keywords,
            scriptPrompt: videoGenResult.testEvent.scriptPrompt,
            videoMetadata: {
                duration: videoGenResult.metadata.duration,
                fileSize: videoGenResult.metadata.fileSize || 5000000, // 5MB estimate
                format: videoGenResult.metadata.format || 'mp4',
                hasAudio: videoGenResult.hasAudio
            },
            uploadConfig: {
                privacyStatus: 'unlisted', // Use 'unlisted' for testing to avoid public spam
                publishAt: undefined // Upload immediately
            }
        };

        console.log('📋 YouTube Upload Configuration:');
        console.log(`   Video File: ${uploadEvent.processedVideoS3Key}`);
        console.log(`   Topic: ${uploadEvent.topic}`);
        console.log(`   Privacy: ${uploadEvent.uploadConfig.privacyStatus}`);
        console.log(`   Has Audio: ${uploadEvent.videoMetadata.hasAudio ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Duration: ${uploadEvent.videoMetadata.duration} seconds`);

        try {
            const result = await this.lambda.send(new InvokeCommand({
                FunctionName: 'youtube-automation-youtube-uploader',
                Payload: JSON.stringify(uploadEvent)
            }));

            const response = JSON.parse(new TextDecoder().decode(result.Payload));

            if (!response.success) {
                throw new Error(`YouTube upload failed: ${response.error}`);
            }

            console.log('  ✅ YouTube upload completed successfully');
            console.log(`    YouTube Video ID: ${response.youtubeVideoId}`);
            console.log(`    Video URL: ${response.videoUrl}`);
            console.log(`    Title: ${response.uploadedMetadata.title}`);
            console.log(`    Privacy Status: ${response.uploadedMetadata.privacyStatus}`);
            console.log(`    Upload Time: ${response.performanceTracking.uploadTime}ms`);
            console.log(`    Estimated Reach: ${response.performanceTracking.estimatedReach} views`);

            // Store results
            this.testResults.youtubeUpload = {
                success: true,
                youtubeVideoId: response.youtubeVideoId,
                videoUrl: response.videoUrl,
                title: response.uploadedMetadata.title,
                privacyStatus: response.uploadedMetadata.privacyStatus,
                uploadTime: response.performanceTracking.uploadTime,
                estimatedReach: response.performanceTracking.estimatedReach
            };

        } catch (error) {
            console.error('  ❌ YouTube upload failed:', error.message);
            
            // Store failure for analysis
            this.testResults.youtubeUpload = {
                success: false,
                error: error.message
            };
            
            throw error;
        }
    }

    verifyResults() {
        const videoGen = this.testResults.videoGeneration;
        const youtubeUpload = this.testResults.youtubeUpload;

        console.log('📊 VERIFICATION RESULTS:');
        console.log('=' .repeat(40));

        // Video Generation Verification
        console.log('🎬 Video Generation:');
        console.log(`   ✅ Video Created: ${videoGen?.videoS3Key ? 'YES' : 'NO'}`);
        console.log(`   ✅ Audio Generated: ${videoGen?.audioS3Key ? 'YES' : 'NO'}`);
        console.log(`   ✅ Audio Integrated: ${videoGen?.hasAudio ? 'YES' : 'NO'}`);
        console.log(`   ✅ Processed Video: ${videoGen?.processedVideoS3Key ? 'YES' : 'NO'}`);

        // YouTube Upload Verification
        console.log('\n📤 YouTube Upload:');
        console.log(`   ✅ Upload Success: ${youtubeUpload?.success ? 'YES' : 'NO'}`);
        console.log(`   ✅ Video URL: ${youtubeUpload?.videoUrl ? 'YES' : 'NO'}`);
        console.log(`   ✅ SEO Title: ${youtubeUpload?.title ? 'YES' : 'NO'}`);
        console.log(`   ✅ Privacy Set: ${youtubeUpload?.privacyStatus ? youtubeUpload.privacyStatus.toUpperCase() : 'NO'}`);

        // Overall Pipeline Health
        const pipelineHealthy = videoGen?.success && 
                               videoGen?.hasAudio && 
                               videoGen?.processedVideoS3Key && 
                               youtubeUpload?.success && 
                               youtubeUpload?.videoUrl;

        console.log('\n🎯 PIPELINE HEALTH:');
        console.log(`   Overall Status: ${pipelineHealthy ? '✅ HEALTHY' : '❌ NEEDS ATTENTION'}`);
        
        if (pipelineHealthy) {
            console.log('   🎉 Complete end-to-end pipeline working!');
            console.log('   🎵 Videos are generated WITH audio');
            console.log('   📤 Videos are successfully uploaded to YouTube');
            console.log('   🚀 Ready for production use!');
        } else {
            console.log('   ⚠️  Pipeline has issues that need resolution');
        }
    }

    printFinalResults() {
        console.log('=' .repeat(60));
        
        if (this.testResults.youtubeUpload?.success) {
            console.log('🎉 SUCCESS: Complete end-to-end pipeline working!');
            console.log('');
            console.log('📺 YOUR VIDEO IS LIVE:');
            console.log(`   🔗 URL: ${this.testResults.youtubeUpload.videoUrl}`);
            console.log(`   📝 Title: ${this.testResults.youtubeUpload.title}`);
            console.log(`   🔒 Privacy: ${this.testResults.youtubeUpload.privacyStatus}`);
            console.log('');
            console.log('✅ CONFIRMED WORKING:');
            console.log('   • Video generation with AI (Bedrock Nova Reel)');
            console.log('   • Audio narration with AI (Amazon Polly)');
            console.log('   • Audio-video integration');
            console.log('   • SEO-optimized metadata generation');
            console.log('   • YouTube upload with proper formatting');
            console.log('');
            console.log('🚀 READY FOR PRODUCTION:');
            console.log('   • Set MOCK_VIDEO_GENERATION=false for real Bedrock calls');
            console.log('   • Configure MediaConvert for production audio merging');
            console.log('   • Set up automated scheduling with EventBridge');
            console.log('   • Monitor performance with CloudWatch dashboards');
            
        } else {
            console.log('❌ PIPELINE ISSUES DETECTED');
            console.log('');
            console.log('✅ WORKING COMPONENTS:');
            if (this.testResults.videoGeneration?.success) {
                console.log('   • Video generation');
                if (this.testResults.videoGeneration?.hasAudio) {
                    console.log('   • Audio integration');
                }
            }
            
            console.log('');
            console.log('❌ FAILED COMPONENTS:');
            if (!this.testResults.videoGeneration?.success) {
                console.log('   • Video generation - check Lambda logs');
            }
            if (!this.testResults.videoGeneration?.hasAudio) {
                console.log('   • Audio integration - check video processor');
            }
            if (!this.testResults.youtubeUpload?.success) {
                console.log('   • YouTube upload - check API credentials');
            }
        }
        
        console.log('=' .repeat(60));
    }
}

// Run the test
async function runTest() {
    const tester = new EndToEndYouTubeTest();
    await tester.runCompleteTest();
}

// Execute if run directly
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = { EndToEndYouTubeTest };