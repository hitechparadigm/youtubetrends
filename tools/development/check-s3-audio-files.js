#!/usr/bin/env node

/**
 * Check what audio files actually exist in S3
 */

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: 'us-east-1' });

async function listS3Objects(bucket, prefix = '') {
  console.log(`🔍 Listing objects in s3://${bucket}/${prefix}`);
  
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 100
    });
    
    const response = await s3Client.send(command);
    
    if (response.Contents && response.Contents.length > 0) {
      console.log(`📁 Found ${response.Contents.length} objects:`);
      
      response.Contents.forEach(obj => {
        const size = (obj.Size / 1024 / 1024).toFixed(2);
        const date = obj.LastModified.toISOString().split('T')[0];
        console.log(`   ${obj.Key} (${size} MB, ${date})`);
      });
      
      return response.Contents;
    } else {
      console.log('📭 No objects found');
      return [];
    }
    
  } catch (error) {
    console.error(`❌ Failed to list objects: ${error.message}`);
    return [];
  }
}

async function checkAudioBuckets() {
  console.log('🔍 CHECKING S3 BUCKETS FOR AUDIO FILES');
  console.log('======================================\n');
  
  const buckets = [
    'youtube-automation-videos-786673323159-us-east-1',
    'youtube-automation-audio-786673323159-us-east-1'
  ];
  
  for (const bucket of buckets) {
    console.log(`\n📦 Checking bucket: ${bucket}`);
    console.log('='.repeat(50));
    
    // Check root level
    await listS3Objects(bucket, '');
    
    // Check audio folder specifically
    console.log(`\n🎵 Checking audio folder:`);
    await listS3Objects(bucket, 'audio/');
    
    // Check videos folder
    console.log(`\n📹 Checking videos folder:`);
    await listS3Objects(bucket, 'videos/');
    
    // Check subtitles folder
    console.log(`\n📄 Checking subtitles folder:`);
    await listS3Objects(bucket, 'subtitles/');
  }
}

async function findAudioFiles() {
  console.log('\n🎵 SEARCHING FOR AUDIO FILES');
  console.log('============================');
  
  const bucket = 'youtube-automation-videos-786673323159-us-east-1';
  
  // Search for all MP3 files
  console.log('\n🔍 Searching for MP3 files...');
  const allObjects = await listS3Objects(bucket);
  
  const audioFiles = allObjects.filter(obj => 
    obj.Key.toLowerCase().includes('.mp3') || 
    obj.Key.toLowerCase().includes('audio')
  );
  
  if (audioFiles.length > 0) {
    console.log(`\n🎵 Found ${audioFiles.length} audio-related files:`);
    audioFiles.forEach(file => {
      const size = (file.Size / 1024).toFixed(2);
      console.log(`   📄 ${file.Key} (${size} KB)`);
    });
    
    return audioFiles;
  } else {
    console.log('\n❌ No audio files found in the bucket');
    return [];
  }
}

async function analyzeVideoGeneration() {
  console.log('\n🔍 ANALYZING VIDEO GENERATION PROCESS');
  console.log('====================================');
  
  console.log('💡 Based on the logs, here\'s what happened:');
  console.log('');
  console.log('📹 Video Generation:');
  console.log('   ✅ Bedrock Nova Reel created video files successfully');
  console.log('   ✅ Videos stored in S3 with keys like "videos/xyz/output.mp4"');
  console.log('');
  console.log('🎵 Audio Generation:');
  console.log('   ✅ Amazon Polly started audio synthesis tasks');
  console.log('   ✅ Audio generation appeared to complete successfully');
  console.log('   ❓ But audio files may not be in expected locations');
  console.log('');
  console.log('🔍 Possible Issues:');
  console.log('   1. Audio files stored in different S3 paths than expected');
  console.log('   2. Audio generation failed silently after task start');
  console.log('   3. Audio files stored in different bucket');
  console.log('   4. Audio files have different naming convention');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Check actual S3 contents to find audio files');
  console.log('   2. Verify Polly task completion status');
  console.log('   3. Update audio file paths in merge script');
  console.log('   4. Test audio merge with correct file paths');
}

async function main() {
  console.log('🔍 S3 AUDIO FILES INVESTIGATION');
  console.log('===============================\n');
  
  // Step 1: Check S3 buckets
  await checkAudioBuckets();
  
  // Step 2: Find audio files
  const audioFiles = await findAudioFiles();
  
  // Step 3: Analyze the situation
  await analyzeVideoGeneration();
  
  // Step 4: Provide recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');
  
  if (audioFiles.length > 0) {
    console.log('✅ Audio files found! Update the merge script with correct paths:');
    audioFiles.forEach((file, index) => {
      console.log(`   Video ${index + 1} Audio: ${file.Key}`);
    });
  } else {
    console.log('❌ No audio files found. Possible solutions:');
    console.log('   1. Check if Polly tasks actually completed');
    console.log('   2. Regenerate videos with audio');
    console.log('   3. Check different S3 bucket for audio files');
    console.log('   4. Verify Polly permissions and configuration');
  }
  
  console.log('\n🔧 IMMEDIATE ACTION:');
  console.log('   Run this script to identify actual audio file locations');
  console.log('   Then update the merge script with correct S3 paths');
  
  return {
    audioFilesFound: audioFiles.length,
    audioFiles: audioFiles.map(f => f.Key)
  };
}

main()
  .then(results => {
    console.log(`\n✅ Investigation completed! Found ${results.audioFilesFound} audio files.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Investigation failed:', error);
    process.exit(1);
  });