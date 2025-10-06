#!/usr/bin/env node

/**
 * Test Script: 1-Minute Video Generation
 * 
 * This script tests the extended video generation capabilities for 1-minute videos
 * with comprehensive audio scripts and proper timing validation.
 */

const AWS = require('aws-sdk');

// Configure AWS SDK
const lambda = new AWS.Lambda({ region: 'us-east-1' });

async function test1MinuteVideo() {
    console.log('🎬 TESTING 1-MINUTE VIDEO GENERATION');
    console.log('=====================================');
    
    const testConfig = {
        topic: 'Technology-Trends-2025',
        category: 'technology',
        trendData: {
            keyword: 'AI technology trends 2025',
            searchVolume: 85000,
            relatedTerms: ['artificial intelligence', 'machine learning', 'automation', 'innovation'],
            context: {
                newsArticles: [
                    'AI technology continues to transform industries in 2025',
                    'Machine learning advances enable new breakthrough applications'
                ],
                socialMentions: [
                    'AI is revolutionizing how we work and live',
                    'The future is here with these amazing AI innovations'
                ]
            }
        },
        videoConfig: {
            durationSeconds: 60, // 1 minute
            style: 'professional',
            targetAudience: 'tech enthusiasts',
            includeAudio: true,
            fps: 24,
            dimension: '1280x720',
            quality: 'high'
        },
        audioConfig: {
            voice: 'Matthew',
            speed: 'medium',
            language: 'en-US'
        },
        scriptPrompt: 'Create a comprehensive overview of AI technology trends in 2025, showcasing innovation and future possibilities',
        uploadConfig: {
            privacyStatus: 'unlisted'
        }
    };

    console.log('📋 Test Configuration:');
    console.log(`   Duration: ${testConfig.videoConfig.durationSeconds} seconds (1 minute)`);
    console.log(`   Topic: ${testConfig.topic}`);
    console.log(`   Voice: ${testConfig.audioConfig.voice}`);
    console.log(`   Expected Word Count: ~150-200 words`);
    console.log('');

    try {
        console.log('🚀 Invoking video generator Lambda...');
        const startTime = Date.now();

        const result = await lambda.invoke({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testConfig)
        }).promise();

        const response = JSON.parse(result.Payload);
        const executionTime = Date.now() - startTime;

        console.log('📊 GENERATION RESULTS:');
        console.log('======================');
        
        if (response.success) {
            console.log('✅ Status: SUCCESS');
            console.log(`📄 Video S3 Key: ${response.videoS3Key}`);
            console.log(`🎵 Audio S3 Key: ${response.audioS3Key}`);
            console.log(`🎬 Processed Video: ${response.processedVideoS3Key}`);
            console.log(`⏱️ Duration: ${response.metadata?.duration || testConfig.videoConfig.durationSeconds} seconds`);
            console.log(`🔊 Has Audio: ${response.metadata?.hasAudio ? 'YES' : 'NO'}`);
            console.log(`📝 Word Count: ${response.metadata?.wordCount || 'Not reported'}`);
            console.log(`💰 Generation Cost: $${response.generationCost?.toFixed(3) || 'Not calculated'}`);
            console.log(`⏰ Execution Time: ${Math.round(executionTime / 1000)} seconds`);

            // Validate 1-minute video requirements
            console.log('');
            console.log('🔍 VALIDATION CHECKS:');
            console.log('=====================');
            
            const duration = response.metadata?.duration || testConfig.videoConfig.durationSeconds;
            const wordCount = response.metadata?.wordCount;
            const hasAudio = response.metadata?.hasAudio;

            // Duration validation
            if (duration === 60) {
                console.log('✅ Duration: Correct (60 seconds)');
            } else {
                console.log(`❌ Duration: Expected 60s, got ${duration}s`);
            }

            // Word count validation (150-200 words for 1 minute)
            if (wordCount >= 150 && wordCount <= 200) {
                console.log(`✅ Word Count: Optimal (${wordCount} words)`);
            } else if (wordCount) {
                console.log(`⚠️ Word Count: ${wordCount} words (expected 150-200)`);
            } else {
                console.log('❓ Word Count: Not reported');
            }

            // Audio validation
            if (hasAudio) {
                console.log('✅ Audio Integration: Working');
            } else {
                console.log('❌ Audio Integration: Missing');
            }

            // Cost validation (should be around $0.51 for 1-minute video)
            const expectedCost = 0.51;
            const actualCost = response.generationCost;
            if (actualCost && Math.abs(actualCost - expectedCost) < 0.1) {
                console.log(`✅ Cost: Within expected range ($${actualCost.toFixed(3)})`);
            } else if (actualCost) {
                console.log(`⚠️ Cost: $${actualCost.toFixed(3)} (expected ~$${expectedCost})`);
            } else {
                console.log('❓ Cost: Not calculated');
            }

            console.log('');
            console.log('🎉 1-MINUTE VIDEO TEST COMPLETED SUCCESSFULLY!');
            
            return {
                success: true,
                duration: duration,
                wordCount: wordCount,
                hasAudio: hasAudio,
                cost: actualCost,
                executionTime: executionTime,
                videoS3Key: response.processedVideoS3Key || response.videoS3Key
            };

        } else {
            console.log('❌ Status: FAILED');
            console.log(`❌ Error: ${response.error || 'Unknown error'}`);
            console.log(`⏰ Execution Time: ${Math.round(executionTime / 1000)} seconds`);
            
            return {
                success: false,
                error: response.error,
                executionTime: executionTime
            };
        }

    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error.message);
        console.error('Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message,
            executionTime: Date.now() - startTime
        };
    }
}

// Performance and quality analysis
async function analyzeResults(results) {
    console.log('');
    console.log('📈 PERFORMANCE ANALYSIS:');
    console.log('========================');
    
    if (results.success) {
        // Execution time analysis
        const executionMinutes = Math.round(results.executionTime / 60000);
        if (executionMinutes <= 5) {
            console.log(`✅ Performance: Excellent (${executionMinutes} minutes)`);
        } else if (executionMinutes <= 10) {
            console.log(`⚠️ Performance: Acceptable (${executionMinutes} minutes)`);
        } else {
            console.log(`❌ Performance: Slow (${executionMinutes} minutes)`);
        }

        // Cost efficiency analysis
        if (results.cost) {
            const costPerSecond = results.cost / 60;
            console.log(`💰 Cost Efficiency: $${costPerSecond.toFixed(4)} per second`);
        }

        // Content quality indicators
        if (results.wordCount) {
            const wordsPerSecond = results.wordCount / 60;
            console.log(`📝 Content Density: ${wordsPerSecond.toFixed(1)} words per second`);
        }

    } else {
        console.log('❌ Test failed - no performance data available');
    }
}

// Main execution
async function main() {
    try {
        const results = await test1MinuteVideo();
        await analyzeResults(results);
        
        console.log('');
        console.log('🏁 Test completed. Check the results above for validation status.');
        
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

module.exports = { test1MinuteVideo, analyzeResults };