#!/usr/bin/env node

/**
 * Check S3 Files - Understand Bedrock Nova Reel output structure
 */

async function checkS3Files() {
  console.log('🔍 CHECKING S3 FILE STRUCTURE');
  console.log('='.repeat(40));
  console.log('📂 Analyzing Bedrock Nova Reel output locations');
  console.log('');

  try {
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    
    const bucketName = 'youtube-automation-videos-786673323159-us-east-1';
    
    console.log(`📦 Bucket: ${bucketName}`);
    console.log('');
    
    // List all objects in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 50
    });
    
    const response = await s3Client.send(listCommand);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('❌ No files found in S3 bucket');
      console.log('💡 This might mean:');
      console.log('- Bedrock Nova Reel stores files elsewhere');
      console.log('- Files are in a different bucket');
      console.log('- Files have different naming convention');
      return;
    }
    
    console.log(`✅ Found ${response.Contents.length} files:`);
    console.log('');
    
    // Group files by type and show structure
    const videoFiles = [];
    const audioFiles = [];
    const otherFiles = [];
    
    for (const obj of response.Contents) {
      const key = obj.Key || '';
      const size = obj.Size || 0;
      const modified = obj.LastModified || new Date();
      
      console.log(`📄 ${key}`);
      console.log(`   Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Modified: ${modified.toISOString()}`);
      console.log('');
      
      if (key.includes('.mp4')) {
        videoFiles.push(key);
      } else if (key.includes('.mp3')) {
        audioFiles.push(key);
      } else {
        otherFiles.push(key);
      }
    }
    
    console.log('📊 FILE ANALYSIS:');
    console.log(`🎬 Video files (.mp4): ${videoFiles.length}`);
    console.log(`🎵 Audio files (.mp3): ${audioFiles.length}`);
    console.log(`📁 Other files: ${otherFiles.length}`);
    console.log('');
    
    if (videoFiles.length > 0) {
      console.log('🎬 VIDEO FILE PATHS:');
      videoFiles.forEach(file => console.log(`   ${file}`));
      console.log('');
    }
    
    if (audioFiles.length > 0) {
      console.log('🎵 AUDIO FILE PATHS:');
      audioFiles.forEach(file => console.log(`   ${file}`));
      console.log('');
    }
    
    // Analyze path patterns
    console.log('🔍 PATH PATTERN ANALYSIS:');
    if (videoFiles.length > 0) {
      const sampleVideo = videoFiles[0];
      console.log(`📹 Sample video path: ${sampleVideo}`);
      
      // Check if it matches our expected pattern
      const expectedPattern = /^videos\/[^\/]+\/[^\/]+\.mp4$/;
      if (expectedPattern.test(sampleVideo)) {
        console.log('✅ Path matches expected pattern: videos/{topic}/{filename}.mp4');
      } else {
        console.log('❌ Path does NOT match expected pattern');
        console.log('💡 Expected: videos/{topic}/{filename}.mp4');
        console.log(`🔍 Actual: ${sampleVideo}`);
      }
    }
    
    return {
      totalFiles: response.Contents.length,
      videoFiles,
      audioFiles,
      otherFiles
    };
    
  } catch (error) {
    console.error('❌ Error checking S3 files:', error.message);
    console.log('');
    console.log('🔧 Possible issues:');
    console.log('- AWS credentials not configured');
    console.log('- S3 bucket permissions');
    console.log('- Bucket name incorrect');
    console.log('- Region mismatch');
    
    return null;
  }
}

// Set environment
process.env.AWS_REGION = 'us-east-1';

console.log('🔍 S3 File Structure Analysis');
console.log('⚡ Understanding Bedrock Nova Reel output locations');
console.log('');

checkS3Files()
  .then(result => {
    if (result) {
      console.log('✅ S3 analysis complete!');
      console.log('📋 Use this information to align video generation → upload paths');
    } else {
      console.log('❌ Could not analyze S3 structure');
    }
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
  });