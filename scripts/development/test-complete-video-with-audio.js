#!/usr/bin/env node

/**
 * Test complete video generation with audio based on comprehensive trend analysis
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function testCompleteVideoWithAudio() {
    console.log('🎬 COMPLETE VIDEO + AUDIO GENERATION TEST');
    console.log('=========================================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    // Comprehensive prompt based on trend analysis (like what would come from trend analyzer)
    const testEvent = {
        scriptPrompt: `Create a professional educational video about "The Future of ETF Investing in 2025". 
        
        Show dynamic financial charts and graphs displaying ETF performance data, market trends, and portfolio diversification benefits. Include visualizations of:
        - Global ETF market growth statistics
        - Comparison charts between ETFs vs individual stocks
        - Pie charts showing sector diversification
        - Line graphs of historical performance
        - Modern trading interfaces and mobile apps
        
        The video should have a professional, modern aesthetic with clean animations, financial data overlays, and a sophisticated color scheme using blues, greens, and whites. Include text overlays highlighting key statistics and benefits.`,
        
        topic: 'ETF Investing Future 2025',
        trendId: `complete-test-${Date.now()}`,
        keywords: ['ETF', 'investing', '2025', 'future', 'portfolio', 'diversification', 'financial', 'market trends'],
        
        videoConfig: {
            durationSeconds: 10, // Longer for more content
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: true, // ENABLE AUDIO
            format: 'standard'
        },
        
        audioConfig: {
            voice: 'Matthew', // Professional male voice
            speed: 'medium',
            language: 'en-US',
            ssmlEnabled: true,
            timingMarks: true
        }
    };
    
    try {
        console.log('🎯 Generating complete video with professional audio...');
        console.log('📝 Topic:', testEvent.topic);
        console.log('⏱️ Duration:', testEvent.videoConfig.durationSeconds, 'seconds');
        console.log('🎤 Voice:', testEvent.audioConfig.voice);
        console.log('🔊 Audio Enabled:', testEvent.videoConfig.includeAudio ? 'YES ✅' : 'NO ❌');
        
        const startTime = Date.now();
        
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(testEvent)
        }));
        
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        const executionTime = Date.now() - startTime;
        
        if (result.errorMessage) {
            console.log('❌ Generation failed:', result.errorMessage);
            
            if (result.errorMessage.includes('Too many requests')) {
                console.log('⏳ Rate limited - need to wait between requests');
                console.log('💡 Luma Ray has strict rate limits, try again in 10-15 minutes');
            } else if (result.errorMessage.includes('Invalid Output Config')) {
                console.log('⚠️ Falling back to Nova Reel (AWS service issue)');
            }
        } else if (result.success) {
            console.log('✅ SUCCESS! Complete video with audio generated!');
            console.log('\n📊 GENERATION RESULTS:');
            console.log('🎬 Video S3 Key:', result.videoS3Key);
            console.log('🎵 Audio S3 Key:', result.audioS3Key || 'Not generated');
            console.log('🎞️ Processed Video:', result.processedVideoS3Key || 'Same as original');
            console.log('🔊 Has Audio:', result.metadata.hasAudio ? 'YES ✅' : 'NO ❌');
            console.log('⏱️ Duration:', result.metadata.duration, 'seconds');
            console.log('📦 File Size:', Math.round(result.metadata.fileSize / 1024), 'KB');
            console.log('💰 Cost:', `$${result.generationCost}`);
            console.log('⏰ Total Time:', Math.round(executionTime / 1000), 'seconds');
            
            if (result.bedrockJobId) {
                if (result.bedrockJobId.includes('us-west-2')) {
                    console.log('🎯 Model Used: Luma AI Ray v2 ✅');
                } else {
                    console.log('🎯 Model Used: Nova Reel (fallback)');
                }
            }
            
            // If successful, prepare for YouTube upload
            if (result.success && result.processedVideoS3Key) {
                console.log('\n🚀 READY FOR YOUTUBE UPLOAD:');
                console.log('📄 Video File:', result.processedVideoS3Key);
                console.log('🎵 Audio Integrated:', result.metadata.hasAudio ? 'YES' : 'NO');
                
                return {
                    success: true,
                    videoKey: result.processedVideoS3Key,
                    hasAudio: result.metadata.hasAudio,
                    metadata: result.metadata,
                    topic: testEvent.topic,
                    keywords: testEvent.keywords
                };
            }
        } else {
            console.log('⚠️ Unclear result:', result);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
    
    return null;
}

// Export for use in other scripts
module.exports = { testCompleteVideoWithAudio };

// Run if called directly
if (require.main === module) {
    testCompleteVideoWithAudio().catch(console.error);
}