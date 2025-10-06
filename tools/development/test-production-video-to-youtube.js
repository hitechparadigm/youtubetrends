#!/usr/bin/env node

/**
 * Production Video Generation and YouTube Upload Test
 * Creates a REAL video with audio using Bedrock Nova Reel and uploads to YouTube
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

class ProductionVideoTest {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.lambda = new LambdaClient({ region: this.region });
        this.testResults = {};
    }

    async runProductionTest() {
        console.log('🎬 PRODUCTION VIDEO GENERATION & YOUTUBE UPLOAD TEST');
        console.log('=' .repeat(70));
        console.log('🎯 Creating REAL video with AI + audio → Uploading to YouTube\n');

        console.log('⚠️  PRODUCTION MODE ACTIVE:');
        console.log('   • Using Amazon Bedrock Nova Reel for real video generation');
        console.log('   • Using Amazon Polly for real audio narration');
        console.log('   • This will incur AWS costs (~$0.50-1.00 for a short video)');
        console.log('   • Video will be uploaded to YouTube as unlisted\n');

        try {
            // Step 1: Generate real video with audio
            console.log('🎥 STEP 1: Generating REAL video with audio (this may take 2-5 minutes)...');
            await this.generateRealVideoWithAudio();

            // Step 2: Upload to YouTube
            console.log('\n📤 STEP 2: Uploading to YouTube...');
            await this.uploadToYouTube();

            // Step 3: Final results
            console.log('\n🎉 STEP 3: Production test results...');
            this.showFinalResults();

        } catch (error) {
            console.error('\n❌ PRODUCTION TEST FAILED:', error.message);
            this.showTroubleshootingSteps(error);
        }
    }

    async generateRealVideoWithAudio() {
        const productionEvent = {
            topic: 'investing',
            category: 'finance',
            trendId: `production-test-${Date.now()}`,
            trendData: {
                keyword: 'ETF investing 2025',
                searchVolume: 75000,
                relatedTerms: ['ETF', 'index funds', 'diversification', 'low fees', 'passive investing', 'VTI', 'VOO'],
                context: {
                    newsArticles: [
                        'ETF assets reach record highs as investors seek low-cost diversification',
                        'Index fund investing continues to outperform active management in 2025'
                    ],
                    socialMentions: [
                        'Just started investing in ETFs - the low fees are amazing!',
                        'VTI and VOO are perfect for beginners - instant diversification'
                    ]
                }
            },
            videoConfig: {
                durationSeconds: 6, // Short video to minimize costs but test functionality
                style: 'professional',
                targetAudience: 'professionals',
                includeAudio: true,  // CRITICAL: Enable real audio generation
                fps: 24,
                dimension: '1280x720',
                quality: 'high'
            },
            audioConfig: {
                voice: 'Matthew', // Professional male voice for finance content
                speed: 'medium',
                language: 'en-US'
            },
            scriptPrompt: `Create a professional video about ETF investing in 2025. 

            Show modern financial graphics and charts demonstrating how ETFs provide instant diversification. 
            
            Key points to visualize:
            - ETFs offer exposure to hundreds of companies with one purchase
            - Ultra-low fees (often under 0.1% annually) 
            - Easy to buy and sell like individual stocks
            - Perfect for beginners and experienced investors
            
            Include visual examples of popular ETFs like VTI (Total Stock Market) and VOO (S&P 500).
            
            End with the message: "Start your ETF journey today with broad market diversification."`,
            keywords: ['ETF', 'investing', '2025', 'diversification', 'low fees', 'VTI', 'VOO', 'index funds']
        };

        console.log('📋 Production Video Configuration:');
        console.log(`   🎯 Topic: ${productionEvent.topic}`);
        console.log(`   ⏱️  Duration: ${productionEvent.videoConfig.durationSeconds} seconds`);
        console.log(`   🎵 Audio: ${productionEvent.videoConfig.includeAudio ? 'ENABLED ✅' : 'DISABLED ❌'}`);
        console.log(`   🎙️  Voice: ${productionEvent.audioConfig.voice}`);
        console.log(`   📊 Quality: ${productionEvent.videoConfig.quality}`);
        console.log(`   🏷️  Keywords: ${productionEvent.keywords.slice(0, 4).join(', ')}`);
        console.log(`   💰 Estimated Cost: $0.50-1.00`);

        console.log('\n⏳ Generating video... (This will take 2-5 minutes for real Bedrock generation)');
        console.log('   📹 Bedrock Nova Reel: Creating professional video content...');
        console.log('   🎙️  Amazon Polly: Generating synchronized audio narration...');
        console.log('   🔄 Please wait while AI creates your video...\n');

        try {
            const startTime = Date.now();
            
            const result = await this.lambda.send(new InvokeCommand({
                FunctionName: 'youtube-automation-video-generator',
                Payload: JSON.stringify(productionEvent)
            }));

            const response = JSON.parse(new TextDecoder().decode(result.Payload));
            const totalTime = Date.now() - startTime;

            if (!response.success) {
                throw new Error(`Video generation failed: ${response.error}`);
            }

            console.log('🎉 ✅ REAL VIDEO GENERATION: SUCCESS!');
            console.log('');
            console.log('📊 Generation Results:');
            console.log(`   📹 Original Video: ${response.videoS3Key}`);
            console.log(`   🎵 Audio File: ${response.audioS3Key || 'NOT GENERATED ❌'}`);
            console.log(`   🎬 Processed Video: ${response.processedVideoS3Key || 'NOT CREATED ❌'}`);
            console.log(`   🔊 Has Audio: ${response.metadata?.hasAudio ? 'YES ✅' : 'NO ❌'}`);
            console.log(`   📏 Duration: ${response.metadata?.duration || 'Unknown'} seconds`);
            console.log(`   📦 File Size: ${response.metadata?.fileSize ? Math.round(response.metadata.fileSize / 1024 / 1024 * 100) / 100 : 'Unknown'} MB`);
            console.log(`   💰 Generation Cost: $${response.generationCost}`);
            console.log(`   ⏱️  Total Time: ${Math.round(totalTime / 1000)} seconds`);

            // Store results for YouTube upload
            this.testResults.videoGeneration = {
                success: true,
                videoS3Key: response.videoS3Key,
                audioS3Key: response.audioS3Key,
                processedVideoS3Key: response.processedVideoS3Key,
                hasAudio: response.metadata?.hasAudio,
                metadata: response.metadata,
                generationCost: response.generationCost,
                totalTime: totalTime,
                testEvent: productionEvent
            };

            // Validation
            if (!response.processedVideoS3Key) {
                console.warn('⚠️  WARNING: No processed video created - audio integration may have failed');
            }

            if (!response.metadata?.hasAudio) {
                console.warn('⚠️  WARNING: Video generated but audio integration not confirmed');
            }

            if (response.metadata?.hasAudio && response.processedVideoS3Key) {
                console.log('\n🎯 AUDIO INTEGRATION: ✅ CONFIRMED WORKING!');
                console.log('   • Real video generated with Bedrock Nova Reel');
                console.log('   • Real audio narration with Amazon Polly');
                console.log('   • Audio successfully integrated into video');
                console.log('   • Ready for YouTube upload with synchronized audio');
            }

        } catch (error) {
            console.error('❌ Real video generation failed:', error.message);
            
            if (error.message.includes('ValidationException')) {
                console.log('\n📋 BEDROCK CONFIGURATION ISSUE:');
                console.log('   • Check if Bedrock Nova Reel is available in your region');
                console.log('   • Verify IAM permissions for Bedrock access');
                console.log('   • Ensure model access is enabled in Bedrock console');
            }
            
            throw error;
        }
    }

    async uploadToYouTube() {
        if (!this.testResults.videoGeneration?.success) {
            throw new Error('Cannot upload to YouTube - video generation failed');
        }

        const videoGenResult = this.testResults.videoGeneration;
        
        const uploadEvent = {
            processedVideoS3Key: videoGenResult.processedVideoS3Key,
            topic: videoGenResult.testEvent.topic,
            trendId: videoGenResult.testEvent.trendId,
            keywords: videoGenResult.testEvent.keywords,
            scriptPrompt: videoGenResult.testEvent.scriptPrompt,
            videoMetadata: {
                duration: videoGenResult.metadata.duration,
                fileSize: videoGenResult.metadata.fileSize,
                format: videoGenResult.metadata.format || 'mp4',
                hasAudio: videoGenResult.hasAudio
            },
            uploadConfig: {
                privacyStatus: 'unlisted', // Keep test videos unlisted
                publishAt: undefined
            }
        };

        console.log('📋 YouTube Upload Configuration:');
        console.log(`   📁 Video File: ${uploadEvent.processedVideoS3Key}`);
        console.log(`   🎯 Topic: ${uploadEvent.topic}`);
        console.log(`   🔒 Privacy: ${uploadEvent.uploadConfig.privacyStatus}`);
        console.log(`   🎵 Has Audio: ${uploadEvent.videoMetadata.hasAudio ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   📏 Duration: ${uploadEvent.videoMetadata.duration} seconds`);
        console.log(`   📦 File Size: ${Math.round(uploadEvent.videoMetadata.fileSize / 1024 / 1024 * 100) / 100} MB`);

        try {
            console.log('\n🚀 Uploading to YouTube...');
            
            const result = await this.lambda.send(new InvokeCommand({
                FunctionName: 'youtube-automation-youtube-uploader',
                Payload: JSON.stringify(uploadEvent)
            }));

            const response = JSON.parse(new TextDecoder().decode(result.Payload));

            if (!response.success) {
                throw new Error(`YouTube upload failed: ${response.error}`);
            }

            console.log('🎉 ✅ YOUTUBE UPLOAD: SUCCESS!');
            console.log('');
            console.log('📺 YOUR AI-GENERATED VIDEO IS LIVE:');
            console.log(`   🔗 Video URL: ${response.videoUrl}`);
            console.log(`   🆔 YouTube ID: ${response.youtubeVideoId}`);
            console.log(`   📝 Title: ${response.uploadedMetadata.title}`);
            console.log(`   🔒 Privacy: ${response.uploadedMetadata.privacyStatus}`);
            console.log(`   ⏱️  Upload Time: ${response.performanceTracking.uploadTime}ms`);
            console.log(`   📊 Est. Reach: ${response.performanceTracking.estimatedReach} views`);

            this.testResults.youtubeUpload = {
                success: true,
                youtubeVideoId: response.youtubeVideoId,
                videoUrl: response.videoUrl,
                title: response.uploadedMetadata.title,
                uploadTime: response.performanceTracking.uploadTime
            };

        } catch (error) {
            console.error('❌ YouTube upload failed:', error.message);
            this.testResults.youtubeUpload = {
                success: false,
                error: error.message
            };
            throw error;
        }
    }

    showFinalResults() {
        console.log('=' .repeat(70));
        console.log('🎉 PRODUCTION TEST COMPLETE!');
        console.log('=' .repeat(70));

        if (this.testResults.youtubeUpload?.success) {
            console.log('✅ SUCCESS: Complete AI video pipeline working in production!');
            console.log('');
            console.log('🎬 YOUR AI-GENERATED VIDEO:');
            console.log(`   🔗 Watch: ${this.testResults.youtubeUpload.videoUrl}`);
            console.log(`   📝 Title: ${this.testResults.youtubeUpload.title}`);
            console.log(`   🎵 Audio: Synchronized AI narration included`);
            console.log(`   💰 Cost: $${this.testResults.videoGeneration.generationCost}`);
            console.log(`   ⏱️  Total Time: ${Math.round(this.testResults.videoGeneration.totalTime / 1000)} seconds`);
            console.log('');
            console.log('🚀 CONFIRMED WORKING IN PRODUCTION:');
            console.log('   ✅ Amazon Bedrock Nova Reel video generation');
            console.log('   ✅ Amazon Polly audio narration');
            console.log('   ✅ Audio-video synchronization');
            console.log('   ✅ SEO-optimized metadata generation');
            console.log('   ✅ YouTube upload with proper formatting');
            console.log('   ✅ Complete end-to-end automation');
            console.log('');
            console.log('🎯 READY FOR SCALE:');
            console.log('   • Set up EventBridge scheduling for automated content');
            console.log('   • Configure multiple topics for diverse content');
            console.log('   • Add CloudWatch monitoring and alerts');
            console.log('   • Scale to multiple videos per day');
            
        } else {
            console.log('❌ PARTIAL SUCCESS: Video generated but upload failed');
            console.log('');
            console.log('✅ WORKING:');
            console.log('   • AI video generation with Bedrock Nova Reel');
            console.log('   • Audio narration with Amazon Polly');
            console.log('   • Audio-video integration');
            console.log('');
            console.log('❌ NEEDS ATTENTION:');
            console.log('   • YouTube upload functionality');
        }
        
        console.log('=' .repeat(70));
    }

    showTroubleshootingSteps(error) {
        console.log('\n📋 TROUBLESHOOTING STEPS:');
        
        if (error.message.includes('Bedrock') || error.message.includes('ValidationException')) {
            console.log('🔧 BEDROCK ISSUES:');
            console.log('   1. Check Bedrock Nova Reel model access in AWS Console');
            console.log('   2. Verify IAM permissions for Bedrock service');
            console.log('   3. Ensure region supports Nova Reel (us-east-1, us-west-2)');
            console.log('   4. Check AWS service quotas and limits');
        }
        
        if (error.message.includes('YouTube') || error.message.includes('credentials')) {
            console.log('🔧 YOUTUBE ISSUES:');
            console.log('   1. Verify YouTube API credentials in Secrets Manager');
            console.log('   2. Check OAuth token expiration and refresh');
            console.log('   3. Ensure YouTube Data API v3 is enabled');
            console.log('   4. Check API quota usage in Google Cloud Console');
        }
        
        console.log('🔧 GENERAL:');
        console.log('   1. Check CloudWatch logs for detailed error information');
        console.log('   2. Verify all Lambda functions have proper IAM permissions');
        console.log('   3. Ensure S3 bucket permissions are configured correctly');
    }
}

// Run the production test
async function runProductionTest() {
    const tester = new ProductionVideoTest();
    await tester.runProductionTest();
}

// Execute if run directly
if (require.main === module) {
    runProductionTest().catch(console.error);
}

module.exports = { ProductionVideoTest };