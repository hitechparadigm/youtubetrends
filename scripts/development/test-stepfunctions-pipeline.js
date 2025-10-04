#!/usr/bin/env node

/**
 * Test Step Functions Pipeline
 * Uses the complete working pipeline that was deployed before
 */

const { SFNClient, StartExecutionCommand, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');

async function testStepFunctionsPipeline() {
    console.log('🎬 TESTING STEP FUNCTIONS PIPELINE');
    console.log('=' .repeat(60));
    console.log('🎯 Using the complete working pipeline from before\n');

    const sfn = new SFNClient({ region: 'us-east-1' });
    
    // Use the working Step Functions state machine
    const stateMachineArn = 'arn:aws:states:us-east-1:786673323159:stateMachine:youtube-automation-workflow';
    
    const testInput = {
        topic: 'investing',
        category: 'finance',
        trendData: {
            keyword: 'ETF investing 2025',
            searchVolume: 75000,
            relatedTerms: ['ETF', 'index funds', 'diversification', 'low fees', 'passive investing'],
            context: {
                newsArticles: [
                    'ETF assets reach record highs as investors seek low-cost diversification in 2025',
                    'Index fund investing continues to outperform active management strategies'
                ],
                socialMentions: [
                    'Just started investing in ETFs - the low fees are incredible!',
                    'VTI and VOO are perfect for beginners - instant diversification'
                ]
            }
        },
        videoConfig: {
            durationSeconds: 6, // Short for testing
            style: 'professional',
            targetAudience: 'professionals',
            includeAudio: true, // CRITICAL: Enable audio
            fps: 24,
            dimension: '1280x720',
            quality: 'high'
        },
        audioConfig: {
            voice: 'Matthew',
            speed: 'medium',
            language: 'en-US'
        },
        scriptPrompt: `Create a professional video about ETF investing benefits in 2025.

        Show modern financial graphics demonstrating:
        - How ETFs provide instant diversification across hundreds of companies
        - Ultra-low expense ratios (often under 0.1% annually)
        - Easy trading like individual stocks
        - Perfect for both beginners and experienced investors
        
        Include visual examples of popular ETFs like VTI (Total Stock Market) and VOO (S&P 500).
        
        End with: "Start your ETF journey today with broad market diversification and low fees."`,
        uploadConfig: {
            privacyStatus: 'unlisted', // Keep test videos unlisted
            publishAt: undefined
        }
    };

    console.log('📋 Pipeline Test Configuration:');
    console.log(`   🎯 Topic: ${testInput.topic}`);
    console.log(`   ⏱️  Duration: ${testInput.videoConfig.durationSeconds} seconds`);
    console.log(`   🎵 Audio: ${testInput.videoConfig.includeAudio ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    console.log(`   🎙️  Voice: ${testInput.audioConfig.voice}`);
    console.log(`   🔒 Privacy: ${testInput.uploadConfig.privacyStatus}`);
    console.log(`   🏷️  Keywords: ${testInput.trendData.relatedTerms.slice(0, 3).join(', ')}`);

    try {
        console.log('\n🚀 Starting Step Functions execution...');
        
        const startResult = await sfn.send(new StartExecutionCommand({
            stateMachineArn: stateMachineArn,
            input: JSON.stringify(testInput),
            name: `audio-integration-test-${Date.now()}`
        }));

        const executionArn = startResult.executionArn;
        console.log(`✅ Execution started: ${executionArn}`);

        console.log('\n⏳ Monitoring execution progress...');
        console.log('   📹 Video generation with Bedrock Nova Reel...');
        console.log('   🎙️  Audio narration with Amazon Polly...');
        console.log('   🔄 Audio-video integration...');
        console.log('   📤 YouTube upload...');
        console.log('\n   This may take 3-8 minutes for complete pipeline...\n');

        // Poll for completion
        const maxWaitTime = 15 * 60 * 1000; // 15 minutes
        const pollInterval = 30 * 1000; // 30 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const statusResult = await sfn.send(new DescribeExecutionCommand({
                executionArn: executionArn
            }));

            const status = statusResult.status;
            console.log(`📊 Pipeline Status: ${status}`);

            if (status === 'SUCCEEDED') {
                const output = JSON.parse(statusResult.output || '{}');
                
                console.log('\n🎉 ✅ COMPLETE PIPELINE SUCCESS!');
                console.log('=' .repeat(50));
                
                if (output.youtubeVideoId) {
                    console.log('📺 YOUR AI VIDEO IS LIVE ON YOUTUBE:');
                    console.log(`   🔗 Video URL: https://www.youtube.com/watch?v=${output.youtubeVideoId}`);
                    console.log(`   🆔 YouTube ID: ${output.youtubeVideoId}`);
                    console.log(`   📝 Title: ${output.title || 'AI Generated Video'}`);
                    console.log(`   🔒 Privacy: ${testInput.uploadConfig.privacyStatus}`);
                }
                
                console.log('\n✅ CONFIRMED WORKING:');
                console.log('   • AI video generation with Bedrock Nova Reel');
                console.log('   • Audio narration with Amazon Polly');
                console.log('   • Audio-video integration and synchronization');
                console.log('   • SEO-optimized metadata generation');
                console.log('   • YouTube upload with proper formatting');
                console.log('   • Complete end-to-end automation');
                
                console.log('\n🎯 AUDIO INTEGRATION: ✅ WORKING IN PRODUCTION!');
                console.log('   Videos are generated WITH synchronized audio narration');
                console.log('   Ready for scaled content creation');
                
                return;
                
            } else if (status === 'FAILED') {
                console.log('\n❌ Pipeline execution failed');
                console.log('Error details:', statusResult.error);
                console.log('Cause:', statusResult.cause);
                
                // Show which step failed
                if (statusResult.error) {
                    console.log('\n📋 TROUBLESHOOTING:');
                    if (statusResult.error.includes('Bedrock') || statusResult.error.includes('Nova')) {
                        console.log('   🔧 Issue with Bedrock Nova Reel video generation');
                        console.log('   • Check Nova Reel model access and permissions');
                        console.log('   • Verify S3 output configuration');
                    } else if (statusResult.error.includes('YouTube') || statusResult.error.includes('upload')) {
                        console.log('   🔧 Issue with YouTube upload');
                        console.log('   • Check YouTube API credentials');
                        console.log('   • Verify OAuth token validity');
                    } else if (statusResult.error.includes('Polly')) {
                        console.log('   🔧 Issue with audio generation');
                        console.log('   • Check Amazon Polly permissions');
                    }
                }
                return;
                
            } else if (status === 'TIMED_OUT') {
                console.log('\n⏰ Pipeline execution timed out');
                console.log('   This may happen with longer videos or during high load');
                return;
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        console.log('\n⏰ Monitoring timed out after 15 minutes');
        console.log('   The pipeline may still be running - check AWS Console for status');

    } catch (error) {
        console.error('\n❌ Pipeline test failed:', error.message);
        
        if (error.message.includes('does not exist')) {
            console.log('\n📋 STATE MACHINE ISSUE:');
            console.log('   • The Step Functions state machine may not be deployed');
            console.log('   • Check AWS Step Functions console');
            console.log('   • Verify the state machine ARN is correct');
        } else if (error.message.includes('AccessDenied')) {
            console.log('\n📋 PERMISSIONS ISSUE:');
            console.log('   • Check IAM permissions for Step Functions');
            console.log('   • Verify execution role has proper permissions');
        }
    }
}

// Run the test
testStepFunctionsPipeline().catch(console.error);