# 🎯 Next Session Context - YouTube Automation Platform

## 🚨 CRITICAL CONTEXT FOR NEXT SESSION

### **System Status: NOT PRODUCTION READY**
Despite successful deployment tests, the system has **CRITICAL ISSUES** that prevent proper operation.

## 🔥 TOP PRIORITY ISSUES (Fix First!)

### 1. **AUDIO INTEGRATION BROKEN** 🚨
- **Problem**: Videos upload to YouTube with NO AUDIO
- **Evidence**: `videos/8t0jfnf808h1/output.mp4` and `audio/technology/ai_tech_trends_2025_001_1759540885262.mp3` are SEPARATE files
- **Root Cause**: Bedrock Nova Reel generates video-only, Polly generates audio separately, but they're NOT MERGED
- **Fix Location**: `lambda/video-processor/index.ts` needs FFmpeg audio-video merging
- **Priority**: CRITICAL - Must fix before anything else

### 2. **TRENDS NOT CONFIGURABLE** 🔧
- **Problem**: Trend categories are hardcoded in Lambda functions
- **Current**: `const categories = ['technology', 'finance'];` // HARDCODED!
- **Required**: Dynamic configuration via DynamoDB/API
- **Fix Location**: `lambda/topic-config-manager/index.ts` and trend detection system

### 3. **POOR PROMPT QUALITY** 📝
- **Problem**: Generic prompts instead of cinematic quality
- **Standard**: ETF example format (see `docs/ETF_EXAMPLE_STANDARD.md`)
- **Current**: "Create a video about AI technology trends" (BAD)
- **Required**: "Cinematic dolly shot moving forward across a modern tech workspace..." (GOOD)

### 4. **WRONG VIDEO DURATION** ⏱️
- **Problem**: Currently 6-second videos
- **Required**: 3-10 minute videos
- **Challenge**: Bedrock Nova Reel limitations

## 📁 PROJECT STRUCTURE CHAOS
- **50+ files in root directory** - impossible to maintain
- **Mixed test/production code** - no organization
- **No clear structure** - hard to find anything

## 🎯 WORKING COMPONENTS (Don't Break These!)

### ✅ Infrastructure
- **AWS Account**: 786673323159
- **Region**: us-east-1  
- **S3 Bucket**: `youtube-automation-videos-786673323159-us-east-1`
- **Lambda Functions**: 3 core functions deployed and responsive
- **EventBridge Scheduler**: 3 schedules active

### ✅ Basic Functionality
- Video generation (6 seconds, no audio)
- S3 storage working
- YouTube upload capability
- Automated scheduling

### ✅ Test Commands That Work
```bash
node generate-first-video.js          # Shows audio problem
node verify-scheduler.js               # Checks automation
aws s3 ls s3://youtube-automation-videos-786673323159-us-east-1/  # Check files
```

## 📋 IMMEDIATE ACTION PLAN

### Day 1: Fix Audio Integration
1. **Update `lambda/video-processor/index.ts`**
   - Add FFmpeg audio-video merging
   - Implement proper error handling
   - Test merged output has audio

2. **Test Audio Fix**
   ```bash
   node generate-first-video.js
   # Verify output video has audio using ffprobe
   ffprobe -v quiet -show_streams output.mp4 | grep audio
   ```

### Day 2: Implement Configurable Trends  
1. **Create configuration management system**
2. **Update trend detection to use dynamic config**
3. **Test trend configuration changes**

### Day 3: Improve Prompt Quality
1. **Implement ETF-style prompt generation**
2. **Create category-specific templates**
3. **Test visual quality improvement**

### Day 4: Extend Video Duration
1. **Research Bedrock Nova Reel limitations**
2. **Implement longer video generation**
3. **Test 5-minute video creation**

### Day 5: Reorganize Project Structure
1. **Move files to proper directories**
2. **Update import paths**
3. **Test all functionality after reorganization**

## 🔧 KEY FILES TO FOCUS ON

### Critical Files (Fix These First)
1. **`lambda/video-processor/index.ts`** - Add FFmpeg audio merging (CRITICAL)
2. **`lambda/optimized-video-generator/index.ts`** - Improve prompts to ETF quality
3. **`lambda/topic-config-manager/index.ts`** - Implement configuration system

### Reference Files (Don't Change)
1. **`docs/ETF_EXAMPLE_STANDARD.md`** - Gold standard for prompt quality
2. **`docs/AUDIO_INTEGRATION_FIX.md`** - Detailed fix instructions
3. **`docs/CRITICAL_FIXES_NEEDED.md`** - Complete issue list

## 🧪 TESTING STRATEGY

### Audio Integration Test
```bash
# 1. Generate video
node generate-first-video.js

# 2. Check if video has audio
ffprobe -v quiet -show_streams s3://bucket/video.mp4 | grep audio

# 3. Upload to YouTube and verify audio plays
node test-youtube-upload.js
```

### Success Criteria
- ✅ Videos uploaded to YouTube have synchronized audio
- ✅ Trend categories can be changed without code deployment  
- ✅ Video prompts follow ETF example quality standards
- ✅ Videos are 3-10 minutes in duration

## 💡 TECHNICAL SOLUTIONS

### Audio Integration Fix
```typescript
// In lambda/video-processor/index.ts
async function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string) {
  const ffmpeg = spawn('ffmpeg', [
    '-i', videoPath,     // Input video
    '-i', audioPath,     // Input audio  
    '-c:v', 'copy',      // Copy video codec
    '-c:a', 'aac',       // Encode audio as AAC
    '-map', '0:v:0',     // Map video
    '-map', '1:a:0',     // Map audio
    '-shortest',         // Match shortest stream
    '-y',                // Overwrite output
    outputPath
  ]);
}
```

### ETF-Quality Prompt Template
```javascript
function generateCinematicPrompt(category, topic) {
  return `Cinematic dolly shot moving forward across a modern ${getEnvironment(category)}. 
    Close-up of ${getDevice(category)} displaying ${getVisualData(topic)} with ${getMetrics(topic)} 
    in ${getColorScheme(category)}. Professional environment with ${getLighting(category)}, 
    ${getProps(category)}. Camera slowly pushes in toward ${getFocalPoint(topic)} showing 
    ${getDataVisualization(topic)}. 4k, photorealistic, shallow depth of field, highest quality, 
    ${getColorGrading(category)} color grading.`;
}
```

## 🎯 CONTEXT PRESERVATION

### Remember These Key Points
1. **Audio is the #1 blocker** - videos are useless without audio
2. **ETF example is the gold standard** - follow that format exactly
3. **System works but has critical flaws** - don't start from scratch
4. **AWS infrastructure is deployed** - build on existing foundation
5. **Project needs reorganization** - but fix audio first

### Don't Forget
- AWS Account: 786673323159
- S3 Bucket: youtube-automation-videos-786673323159-us-east-1
- Working test: `node generate-first-video.js`
- Audio problem: separate video.mp4 and audio.mp3 files
- Target: 3-10 minute videos with synchronized audio

---

**Status**: 🚨 CRITICAL FIXES REQUIRED  
**Next Priority**: Fix audio integration (Day 1)  
**Success Metric**: YouTube videos play with synchronized audio  
**Documentation**: All details in `docs/` folder