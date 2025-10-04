# 🔧 Audio Integration Fix - Critical Implementation Guide

## 🚨 PROBLEM: Videos Have No Audio

### Current Broken Flow
```
1. Bedrock Nova Reel → Generates video.mp4 (NO AUDIO)
2. Amazon Polly → Generates audio.mp3 (SEPARATE FILE)
3. YouTube Upload → Uploads video.mp4 (SILENT VIDEO!)
```

### Required Fixed Flow
```
1. Bedrock Nova Reel → Generates video.mp4 (no audio)
2. Amazon Polly → Generates audio.mp3 (separate)
3. FFmpeg Processor → Merges video + audio → final.mp4 (WITH AUDIO)
4. YouTube Upload → Uploads final.mp4 (AUDIO INCLUDED!)
```

## 🔧 Technical Implementation

### 1. Update Video Processor Lambda

**File**: `lambda/video-processor/index.ts`

**Current State**: Exists but doesn't merge audio
**Required**: Add FFmpeg audio-video merging

```typescript
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

export const handler = async (event: VideoProcessorEvent): Promise<VideoProcessorResponse> => {
  const { videoS3Key, audioS3Key, processingConfig } = event;
  
  try {
    // 1. Download video and audio from S3
    const videoBuffer = await downloadFromS3(videoS3Key);
    const audioBuffer = await downloadFromS3(audioS3Key);
    
    // 2. Save to temporary files
    const videoPath = '/tmp/input-video.mp4';
    const audioPath = '/tmp/input-audio.mp3';
    const outputPath = '/tmp/output-merged.mp4';
    
    await fs.writeFile(videoPath, videoBuffer);
    await fs.writeFile(audioPath, audioBuffer);
    
    // 3. Merge audio and video using FFmpeg
    await mergeAudioVideo(videoPath, audioPath, outputPath);
    
    // 4. Upload merged video back to S3
    const mergedBuffer = await fs.readFile(outputPath);
    const mergedS3Key = `processed/${Date.now()}-merged.mp4`;
    await uploadToS3(mergedS3Key, mergedBuffer);
    
    return {
      success: true,
      processedVideoS3Key: mergedS3Key,
      hasAudio: true,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Audio-video merging failed:', error);
    throw error;
  }
};

async function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,           // Input video
      '-i', audioPath,           // Input audio
      '-c:v', 'copy',           // Copy video codec (no re-encoding)
      '-c:a', 'aac',            // Encode audio as AAC
      '-map', '0:v:0',          // Map video from first input
      '-map', '1:a:0',          // Map audio from second input
      '-shortest',              // End when shortest stream ends
      '-y',                     // Overwrite output file
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
}
```

### 2. Add FFmpeg Layer to Lambda

**Option A: Use AWS Lambda Layer**
```bash
# Create FFmpeg layer
aws lambda publish-layer-version \
  --layer-name ffmpeg-layer \
  --description "FFmpeg for video processing" \
  --content S3Bucket=your-bucket,S3Key=ffmpeg-layer.zip \
  --compatible-runtimes nodejs18.x
```

**Option B: Include FFmpeg in Deployment Package**
```bash
# Download FFmpeg static binary
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
cp ffmpeg-*-amd64-static/ffmpeg lambda/video-processor/
```

### 3. Update Lambda Function Configuration

```typescript
// Add to lambda deployment
const videoProcessorFunction = new lambda.Function(this, 'VideoProcessorFunction', {
  functionName: 'youtube-automation-video-processor',
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/video-processor'),
  timeout: cdk.Duration.minutes(15), // Increase timeout for video processing
  memorySize: 3008, // Increase memory for FFmpeg
  environment: {
    FFMPEG_PATH: '/opt/bin/ffmpeg', // If using layer
    VIDEO_BUCKET: videoBucket.bucketName
  },
  layers: [ffmpegLayer] // Add FFmpeg layer
});
```

### 4. Update Video Generation Pipeline

**File**: `lambda/optimized-video-generator/index.ts`

```typescript
export const handler = async (event: OptimizedVideoRequest): Promise<OptimizedVideoResponse> => {
  try {
    // 1. Generate video with Bedrock Nova Reel
    const videoResult = await generateVideoWithBedrock(event);
    
    // 2. Generate audio with Amazon Polly
    const audioResult = await generateAudioWithPolly(event);
    
    // 3. Call video processor to merge audio and video
    const processingResult = await lambda.invoke({
      FunctionName: 'youtube-automation-video-processor',
      Payload: JSON.stringify({
        videoS3Key: videoResult.s3Key,
        audioS3Key: audioResult.s3Key,
        processingConfig: {
          embedSubtitles: true,
          mergeAudio: true,
          outputFormat: 'mp4',
          quality: 'high'
        }
      })
    }).promise();
    
    const processedResult = JSON.parse(processingResult.Payload as string);
    
    return {
      success: true,
      videoS3Key: processedResult.processedVideoS3Key, // This now has audio!
      audioS3Key: audioResult.s3Key,
      hasAudio: true, // Important flag
      content: {
        videoPrompt: videoResult.prompt,
        audioScript: audioResult.script
      }
    };
    
  } catch (error) {
    console.error('Video generation with audio failed:', error);
    throw error;
  }
};
```

## 🧪 Testing the Audio Integration

### Test Script: `test-audio-integration.js`

```javascript
const AWS = require('aws-sdk');

async function testAudioIntegration() {
  console.log('🧪 Testing Audio Integration...');
  
  // 1. Generate video with audio
  const result = await generateVideoWithAudio({
    topic: 'ETF investing test',
    category: 'finance',
    duration: 6
  });
  
  // 2. Download and verify the video has audio
  const videoBuffer = await downloadFromS3(result.videoS3Key);
  
  // 3. Use ffprobe to check if audio stream exists
  const hasAudio = await checkVideoHasAudio(videoBuffer);
  
  console.log(`✅ Video has audio: ${hasAudio}`);
  
  if (!hasAudio) {
    throw new Error('❌ CRITICAL: Video still has no audio!');
  }
  
  // 4. Test YouTube upload
  const uploadResult = await uploadToYouTube(result.videoS3Key);
  console.log(`✅ YouTube upload successful: ${uploadResult.videoUrl}`);
  
  return {
    success: true,
    videoHasAudio: hasAudio,
    youtubeUrl: uploadResult.videoUrl
  };
}

async function checkVideoHasAudio(videoBuffer) {
  // Use ffprobe to check audio streams
  const ffprobe = spawn('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-'
  ]);
  
  ffprobe.stdin.write(videoBuffer);
  ffprobe.stdin.end();
  
  return new Promise((resolve) => {
    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffprobe.on('close', () => {
      const info = JSON.parse(output);
      const hasAudioStream = info.streams.some(stream => stream.codec_type === 'audio');
      resolve(hasAudioStream);
    });
  });
}
```

## 🔍 Debugging Audio Issues

### Common Problems and Solutions

#### Problem 1: FFmpeg Not Found
```bash
Error: spawn ffmpeg ENOENT
```
**Solution**: Install FFmpeg layer or include binary in deployment package

#### Problem 2: Audio/Video Length Mismatch
```bash
Error: Audio duration (6.2s) doesn't match video duration (6.0s)
```
**Solution**: Use `-shortest` flag in FFmpeg command to match shortest stream

#### Problem 3: Lambda Timeout
```bash
Error: Task timed out after 300.00 seconds
```
**Solution**: Increase Lambda timeout to 15 minutes and memory to 3008 MB

#### Problem 4: Audio Quality Issues
```bash
Warning: Audio quality degraded during merge
```
**Solution**: Use `-c:a aac -b:a 128k` for better audio quality

### Verification Commands

```bash
# Check if video has audio streams
ffprobe -v quiet -print_format json -show_streams video.mp4 | grep audio

# Test audio playback
ffplay video.mp4

# Extract audio from video to verify
ffmpeg -i video.mp4 -vn -acodec copy audio_extracted.aac
```

## 📋 Implementation Checklist

### Phase 1: Setup FFmpeg
- [ ] Add FFmpeg to Lambda environment (layer or binary)
- [ ] Update Lambda configuration (timeout, memory)
- [ ] Test FFmpeg availability in Lambda

### Phase 2: Implement Audio Merging
- [ ] Update `video-processor/index.ts` with merge logic
- [ ] Add error handling for FFmpeg operations
- [ ] Implement S3 upload/download for processed videos

### Phase 3: Update Pipeline
- [ ] Modify video generator to call processor
- [ ] Update response format to include audio status
- [ ] Ensure YouTube uploader uses processed video

### Phase 4: Testing
- [ ] Create audio integration test script
- [ ] Verify video has audio using ffprobe
- [ ] Test YouTube upload with audio
- [ ] Validate end-to-end pipeline

### Phase 5: Validation
- [ ] Generate test video and confirm audio present
- [ ] Upload to YouTube and verify audio plays
- [ ] Test with different video durations
- [ ] Validate audio synchronization quality

## 🎯 Success Criteria

### Definition of "Fixed"
1. **Video Files Have Audio**: ffprobe shows audio stream in generated videos
2. **YouTube Uploads Work**: Videos uploaded to YouTube play with audio
3. **Audio Synchronization**: Audio timing matches video content
4. **Pipeline Integration**: Complete flow from generation to upload works
5. **Error Handling**: Graceful failure when audio merge fails

### Test Commands
```bash
# Generate video with audio
node generate-first-video.js

# Check if output has audio
ffprobe -v quiet -show_streams s3://bucket/video.mp4 | grep audio

# Test YouTube upload
node test-youtube-upload.js
```

---

**Priority**: 🚨 CRITICAL - Must fix before any other features  
**Timeline**: 1-2 days maximum  
**Success Metric**: YouTube videos play with synchronized audio