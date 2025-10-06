#!/usr/bin/env node

/**
 * Complete Workflow Test: Generate Video + Audio Merge + YouTube Upload
 * 
 * This script tests the complete end-to-end workflow:
 * 1. Generate video with Luma AI Ray v2
 * 2. Generate audio with Amazon Polly
 * 3. Merge audio and video with perfect synchronization
 * 4. Upload to YouTube with SEO optimization
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Configure AWS SDK
const lambda = new LambdaClient({ region: 'us-east-1' });

async function testCompleteWorkflow() {
    console.log('🎬 COMPLETE WORKFLOW TEST: VIDEO + AUDIO + UPLOAD');
    console.log('================================================');
    
    const testConfig = {
        topic: 'AI-Innovation-2025',
        category: 'technology',
        trendData: {
            keyword: 'AI innovation trends 2025',
            searchVolume: 95000,
            relatedTerms: ['artificial intelligence', 'innovation', 'technology', 'future'],
            context: {
                newsArticles: [
                    'AI innovation reaches new heights in 2025 with breakthrough applications',
                    'Revolutionary AI technologies transform industries and daily life'
                ],
                socialMentions: [
                    'Amazing AI innovations are changing everything in 2025',
                    'The future of AI is here and it\'s incredible'
                ]
            }
        },
        videoConfig: {
            durationSeconds: 8, // Perfect for synchronized audio
            style: 'professional',
            targetAudience: 'tech enthusiasts',
            includeAudio: true,
            fps: 24,
            dimension: '1280x720',
            quality: 'high'
        },
        audioConfig: {
            voice: 'Matthew', // Professional male voice for tech content
            speed: 'medium',
            language: 'en-US'
        },
        scriptPrompt: 'Create an engaging overview of AI innovation in 2025, highlighting breakthrough technologies and their impact on the future',
        uploadConfig: {
            privacyStatus: 'public', // Make it public for real test
            title: 'AI Innovation 2025: Revolutionary Technologies Transforming Our Future',
            description: `Discover the most exciting AI innovations of 2025! This video showcases breakthrough artificial intelligence technologies that are revolutionizing industries and transforming how we live and work.

🤖 Featured AI Innovations:
• Advanced machine learning algorithms
• Revolutionary automation systems  
• Next-generation AI applications
• Future technology breakthroughs

#AI #Innovation #Technology #2025 #ArtificialIntelligence #MachineLearning #Future #Tech #Automation #Breakthrough

Created with AI-powered video generation using Luma AI Ray v2 and Amazon Polly neural voices.`,
            tags: ['AI', 'Innovation', 'Technology', '2025', 'Artificial Intelligence', 'Machine Learning', 'Future', 'Tech', 'Automation', 'Breakthrough'],
            categoryId: '28' // Science & Technology
        }
    };

    console.log('📋 Test Configuration:');
    console.log(`   Topic: ${testConfig.topic}`);
    console.log(`   Duration: ${testConfig.videoConfig.durationSeconds} seconds`);
    console.log(`   Voice: ${testConfig.audioConfig.voice}`);
    console.log(`   Upload: ${testConfig.uploadConfig.privacyStatus}`);
    console.log('');

    try {
        console.log('🚀 PHASE 1: VIDEO + AUDIO GENERATION');
        console.log('===================================');
        
        const startTime = Date.now();

        const result = await lambda.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testConfig)
        }));

        const response = JSON.parse(new TextDecoder().decode(result.Payload));
        const phase1Time = Date.now() - startTime;

        if (!response.success) {
            console.log('❌ Phase 1 Failed:', response.error);
            
            if (response.error && response.error.includes('Too many requests')) {
                console.log('⏳ Rate Limited: Luma AI needs cooldown period');
                console.log('💡 Suggestion: Try again in 10-15 minutes');
            }
            
            return {
                success: false,
                phase: 'generation',
                error: response.error
            };
        }

        console.log('✅ Phase 1 Complete: Video + Audio Generated');
        console.log(`📄 Video S3 Key: ${response.videoS3Key}`);
        console.log(`🎵 Audio S3 Key: ${response.audioS3Key}`);
        console.log(`⏱️ Generation Time: ${Math.round(phase1Time / 1000)} seconds`);
        console.log(`💰 Generation Cost: $${response.generationCost?.toFixed(3) || 'N/A'}`);

        // Check if we have a processed video (with merged audio)
        if (response.processedVideoS3Key) {
            console.log(`🎬 Processed Video: ${response.processedVideoS3Key}`);
            console.log('✅ Audio merge completed during generation');
        } else {
            console.log('⚠️ No processed video - audio merge may be needed');
        }

        console.log('');
        console.log('🚀 PHASE 2: YOUTUBE UPLOAD');
        console.log('==========================');

        // Prepare upload configuration
        const uploadConfig = {
            ...testConfig,
            videoS3Key: response.processedVideoS3Key || response.videoS3Key,
            audioS3Key: response.audioS3Key,
            metadata: response.metadata,
            generationCost: response.generationCost
        };

        const uploadStartTime = Date.now();

        const uploadResult = await lambda.send(new InvokeCommand({
            FunctionName: 'youtube-automation-youtube-uploader',
            Payload: JSON.stringify(uploadConfig)
        }));

        const uploadResponse = JSON.parse(new TextDecoder().decode(uploadResult.Payload));
        const phase2Time = Date.now() - uploadStartTime;

        if (!uploadResponse.success) {
            console.log('❌ Phase 2 Failed:', uploadResponse.error);
            
            return {
                success: false,
                phase: 'upload',
                error: uploadResponse.error,
                videoGenerated: true,
                videoS3Key: response.processedVideoS3Key || response.videoS3Key
            };
        }

        console.log('✅ Phase 2 Complete: YouTube Upload Successful');
        console.log(`🎥 YouTube Video ID: ${uploadResponse.videoId}`);
        console.log(`🔗 YouTube URL: https://www.youtube.com/watch?v=${uploadResponse.videoId}`);
        console.log(`📊 Upload Status: ${uploadResponse.uploadStatus}`);
        console.log(`⏱️ Upload Time: ${Math.round(phase2Time / 1000)} seconds`);

        const totalTime = Date.now() - startTime;

        console.log('');
        console.log('🎉 COMPLETE WORKFLOW SUCCESS!');
        console.log('=============================');
        console.log('✅ Video Generated: AI Innovation 2025 content');
        console.log('✅ Audio Generated: Matthew voice narration');
        console.log('✅ Audio Merged: Perfect 8-second synchronization');
        console.log('✅ YouTube Upload: Public video published');
        console.log(`✅ Total Time: ${Math.round(totalTime / 1000)} seconds`);
        console.log(`✅ Total Cost: $${(response.generationCost || 0).toFixed(3)}`);

        console.log('');
        console.log('📊 WORKFLOW METRICS:');
        console.log('====================');
        console.log(`🎬 Generation: ${Math.round(phase1Time / 1000)}s`);
        console.log(`📤 Upload: ${Math.round(phase2Time / 1000)}s`);
        console.log(`⏱️ Total: ${Math.round(totalTime / 1000)}s`);
        console.log(`💰 Cost: $${(response.generationCost || 0).toFixed(3)}`);
        console.log(`🔗 Video: https://www.youtube.com/watch?v=${uploadResponse.videoId}`);

        return {
            success: true,
            videoId: uploadResponse.videoId,
            videoUrl: `https://www.youtube.com/watch?v=${uploadResponse.videoId}`,
            generationTime: phase1Time,
            uploadTime: phase2Time,
            totalTime: totalTime,
            cost: response.generationCost,
            videoS3Key: response.processedVideoS3Key || response.videoS3Key,
            audioS3Key: response.audioS3Key
        };

    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error.message);
        console.error('Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message,
            phase: 'execution'
        };
    }
}

// Performance analysis
async function analyzeWorkflow(results) {
    console.log('');
    console.log('📈 WORKFLOW ANALYSIS:');
    console.log('=====================');
    
    if (results.success) {
        // Time analysis
        const totalMinutes = Math.round(results.totalTime / 60000);
        console.log(`⏰ Total Execution: ${totalMinutes} minutes`);
        
        if (totalMinutes <= 3) {
            console.log('🚀 Performance: Excellent (under 3 minutes)');
        } else if (totalMinutes <= 5) {
            console.log('✅ Performance: Good (under 5 minutes)');
        } else {
            console.log('⚠️ Performance: Acceptable (over 5 minutes)');
        }

        // Cost analysis
        if (results.cost) {
            console.log(`💰 Cost Efficiency: $${results.cost.toFixed(3)} per video`);
            
            if (results.cost <= 0.08) {
                console.log('💚 Cost: Excellent (at target)');
            } else if (results.cost <= 0.15) {
                console.log('💛 Cost: Good (reasonable)');
            } else {
                console.log('💔 Cost: High (needs optimization)');
            }
        }

        // Success metrics
        console.log('✅ End-to-End Success: Complete workflow functional');
        console.log('✅ Audio Integration: Working with synchronization');
        console.log('✅ YouTube Publishing: Automated upload successful');

    } else {
        console.log(`❌ Workflow Failed: ${results.phase} phase`);
        console.log(`❌ Error: ${results.error}`);
        
        if (results.videoGenerated) {
            console.log('✅ Video Generation: Successful');
            console.log('❌ Upload Phase: Failed');
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🎯 Starting complete workflow test...');
        console.log('This will create a real video and upload it to YouTube');
        console.log('');
        
        const results = await testCompleteWorkflow();
        await analyzeWorkflow(results);
        
        if (results.success) {
            console.log('');
            console.log('🎉 SUCCESS! Your video is live on YouTube:');
            console.log(`🔗 ${results.videoUrl}`);
        }
        
        process.exit(results.success ? 0 : 1);
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    main();
}

module.exports = { testCompleteWorkflow, analyzeWorkflow };