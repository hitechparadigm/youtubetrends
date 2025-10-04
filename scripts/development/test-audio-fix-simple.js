#!/usr/bin/env node

/**
 * Simple Audio Fix Test
 * Tests the optimized video generator with audio integration
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testAudioFix() {
    console.log('🧪 TESTING AUDIO INTEGRATION FIX');
    console.log('=' .repeat(50));
    console.log('🎯 Testing optimized video generator with audio merging\n');

    const lambda = new LambdaClient({ region: 'us-east-1' });

    const testEvent = {
        topic: 'ETF investing benefits',
        category: 'finance',
        trendData: {
            keyword: 'index ETF investing',
            searchVolume: 50000,
            relatedTerms: ['ETF', 'index funds', 'diversification', 'low fees'],
            context: {
                newsArticles: [
                    'Index ETFs continue to attract investors with low fees',
                    'ETF market reaches new highs as investors seek diversification'
                ],
                socialMentions: [
                    'ETFs are perfect for beginners',
                    'Low-cost investing with index ETFs'
                ]
            }
        },
        videoConfig: {
            durationSeconds: 6,
            style: 'professional',
            targetAudience: 'professionals'
        }
    };

    console.log('📋 Test Configuration:');
    console.log(`   Topic: ${testEvent.topic}`);
    console.log(`   Category: ${testEvent.category}`);
    console.log(`   Keyword: ${testEvent.trendData.keyword}`);
    console.log(`   Duration: ${testEvent.videoConfig.durationSeconds} seconds`);
    console.log('');

    try {
        console.log('🚀 Calling optimized video generator Lambda...');
        
        const command = new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator', // This should use optimized generator
            Payload: JSON.stringify(testEvent)
        });
        
        const result = await lambda.send(command);

        const response = JSON.parse(new TextDecoder().decode(result.Payload));

        console.log('📊 RESULTS:');
        console.log('=' .repeat(30));

        if (response.success) {
            console.log('✅ Video Generation: SUCCESS');
            console.log(`   Original Video: ${response.videoS3Key || 'N/A'}`);
            console.log(`   Audio File: ${response.audioS3Key || 'N/A'}`);
            console.log(`   Processed Video: ${response.processedVideoS3Key || '❌ NOT CREATED'}`);
            console.log(`   Has Audio: ${response.metadata?.hasAudio ? '✅ YES' : '❌ NO'}`);
            console.log(`   Has Subtitles: ${response.metadata?.hasSubtitles ? '✅ YES' : '❌ NO'}`);
            console.log(`   Generation Cost: $${response.generationCost || 'N/A'}`);
            console.log(`   Execution Time: ${response.executionTime || 'N/A'}ms`);

            console.log('\n🎯 AUDIO INTEGRATION STATUS:');
            
            if (response.processedVideoS3Key && response.metadata?.hasAudio) {
                console.log('🎉 ✅ AUDIO INTEGRATION: WORKING!');
                console.log('   Videos now have synchronized audio');
                console.log('   Ready for YouTube upload with audio');
            } else if (response.processedVideoS3Key) {
                console.log('⚠️  🔧 PARTIAL FIX: Processed video created but no audio confirmed');
                console.log('   Video processor called but audio status unclear');
            } else {
                console.log('❌ 🚨 AUDIO INTEGRATION: STILL BROKEN');
                console.log('   No processed video created - audio merging failed');
                console.log('   Videos will upload to YouTube WITHOUT AUDIO');
            }

        } else {
            console.log('❌ Video Generation: FAILED');
            console.log(`   Error: ${response.error || 'Unknown error'}`);
            console.log('\n🚨 CRITICAL: Video generation completely failed');
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.log('\n🚨 CRITICAL: Could not test audio integration');
    }

    console.log('\n📋 NEXT STEPS:');
    if (testEvent.success && testEvent.processedVideoS3Key) {
        console.log('1. ✅ Audio integration appears to be working');
        console.log('2. 🧪 Run full end-to-end test with YouTube upload');
        console.log('3. 🎬 Test with longer video durations');
    } else {
        console.log('1. 🔧 Fix video processor Lambda function');
        console.log('2. 🔧 Ensure FFmpeg is available in Lambda environment');
        console.log('3. 🔧 Debug audio-video merging process');
    }
}

// Run test
testAudioFix().catch(console.error);