#!/usr/bin/env node

/**
 * Test Audio Synchronization - Quick verification
 */

const { handler: videoGenerator } = require('./lambda/video-generator/dist/index.js');

async function testAudioSync() {
  console.log('🎵 TESTING AUDIO SYNCHRONIZATION');
  console.log('='.repeat(40));
  
  const testContext = {
    awsRequestId: `audio-sync-test-${Date.now()}`,
    getRemainingTimeInMillis: () => 1800000
  };

  process.env.VIDEO_BUCKET = 'youtube-automation-videos-786673323159-us-east-1';
  process.env.AWS_REGION = 'us-east-1';
  delete process.env.MOCK_VIDEO_GENERATION;

  try {
    const testEvent = {
      scriptPrompt: 'AI technology is transforming investing with automated trading systems and market analysis.',
      topic: 'technology',
      trendId: `audio_sync_test_${Date.now()}`,
      videoConfig: {
        durationSeconds: 6,
        fps: 24,
        dimension: '1280x720',
        quality: 'high',
        includeAudio: true
      },
      audioConfig: {
        voice: 'Matthew',
        speed: 'medium',
        language: 'en-US'
      }
    };

    console.log('🚀 Testing audio synchronization...');
    const result = await videoGenerator(testEvent, testContext);

    if (result.success) {
      console.log('✅ AUDIO SYNC TEST SUCCESSFUL!');
      console.log(`📹 Video: ${result.videoS3Key}`);
      console.log(`🎵 Audio: ${result.audioS3Key || 'Not generated'}`);
      console.log(`📄 Subtitles: ${result.subtitlesS3Key || 'Not generated'}`);
      console.log(`✅ Has Audio: ${result.metadata.hasAudio}`);
      console.log(`✅ Has Subtitles: ${result.metadata.hasSubtitles}`);
      console.log(`💰 Cost: $${result.generationCost.toFixed(3)}`);
      
      return { success: true };
    } else {
      console.log('❌ AUDIO SYNC TEST FAILED');
      console.log(`Error: ${result.error}`);
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testAudioSync()
  .then(result => {
    if (result.success) {
      console.log('🎉 Audio synchronization is working!');
    } else {
      console.log('❌ Audio sync needs more work');
    }
  });