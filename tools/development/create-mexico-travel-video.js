#!/usr/bin/env node

/**
 * Create a travel video about Mexico with audio and upload to YouTube
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

async function createMexicoTravelVideo() {
    console.log('🇲🇽 CREATING MEXICO TRAVEL VIDEO');
    console.log('=================================');
    
    const lambdaClient = new LambdaClient({ region: 'us-east-1' });
    
    // Step 1: Generate video with audio
    console.log('\n📹 STEP 1: GENERATING MEXICO TRAVEL VIDEO...');
    console.log('============================================');
    
    const videoEvent = {
        scriptPrompt: `Create a stunning travel video about "Discover Mexico 2025 - Ultimate Travel Guide". 
        
        Show breathtaking Mexican landscapes and destinations including:
        - Beautiful beaches of Cancun and Playa del Carmen with turquoise waters
        - Ancient Mayan pyramids and archaeological sites like Chichen Itza
        - Colorful colonial architecture in cities like Guanajuato and San Miguel de Allende
        - Vibrant markets with traditional Mexican crafts and food
        - Stunning cenotes (natural swimming holes) with crystal clear water
        - Modern Mexico City skyline and cultural landmarks
        - Traditional Mexican festivals and celebrations with colorful decorations
        
        The video should have a warm, inviting aesthetic with bright colors showcasing Mexico's natural beauty, rich culture, and modern attractions. Include text overlays highlighting key destinations and travel tips.`,
        
        topic: 'Mexico-Travel-2025',
        trendId: `mexico-travel-${Date.now()}`,
        keywords: ['Mexico', 'travel', '2025', 'vacation', 'beaches', 'Mayan', 'culture', 'destinations', 'tourism', 'Cancun'],
        
        videoConfig: {
            durationSeconds: 8, // Good length for travel content
            fps: 24,
            dimension: '1280x720',
            quality: 'high',
            includeAudio: true, // Enable audio with simplified settings
            format: 'standard'
        },
        
        audioConfig: {
            voice: 'Amy', // Good for travel content
            speed: 'medium',
            language: 'en-US',
            ssmlEnabled: true,
            timingMarks: true
        }
    };
    
    try {
        console.log('🎯 Generating Mexico travel video with Luma Ray...');
        console.log('📝 Topic:', videoEvent.topic);
        console.log('⏱️ Duration:', videoEvent.videoConfig.durationSeconds, 'seconds');
        console.log('🎤 Voice:', videoEvent.audioConfig.voice);
        console.log('🔊 Audio Enabled:', videoEvent.videoConfig.includeAudio ? 'YES ✅' : 'NO ❌');
        
        const videoStartTime = Date.now();
        
        const videoResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'youtube-automation-video-generator',
            Payload: JSON.stringify(videoEvent)
        }));
        
        const videoResult = JSON.parse(new TextDecoder().decode(videoResponse.Payload));
        const videoTime = Date.now() - videoStartTime;
        
        if (!videoResult.success) {
            console.log('❌ Video generation failed:', videoResult.error);
            
            if (videoResult.error.includes('Too many requests')) {
                console.log('⏳ Rate limited - need to wait for Luma Ray cooldown');
                console.log('💡 Try again in 10-15 minutes');
            }
            return null;
        }
        
        console.log('✅ Video generation successful!');
        console.log('🎬 Video S3 Key:', videoResult.videoS3Key);
        console.log('🎵 Audio S3 Key:', videoResult.audioS3Key || 'Not generated');
        console.log('📦 File Size:', Math.round(videoResult.metadata.fileSize / 1024), 'KB');
        console.log('💰 Video Cost:', `$${videoResult.generationCost}`);
        console.log('⏰ Video Time:', Math.round(videoTime / 1000), 'seconds');
        
        if (!videoResult.audioS3Key) {
            console.log('⚠️ No audio generated - uploading video only');
            return {
                success: true,
                videoOnly: true,
                videoResult: videoResult
            };
        }
        
        // Step 2: Copy video to main bucket for processing
        console.log('\n📋 STEP 2: PREPARING VIDEO FOR PROCESSING...');
        console.log('============================================');
        
        // We'll need to copy the video from Luma bucket to main bucket
        // For now, let's continue with the workflow and handle this in the next step
        
        return {
            success: true,
            videoResult: videoResult,
            needsProcessing: true
        };
        
    } catch (error) {
        console.log('❌ Video creation failed:', error.message);
        return null;
    }
}

// Export for use in other scripts
module.exports = { createMexicoTravelVideo };

// Run if called directly
if (require.main === module) {
    createMexicoTravelVideo().catch(console.error);
}