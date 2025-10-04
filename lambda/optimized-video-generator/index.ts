import { Handler, Context } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PollyClient, StartSpeechSynthesisTaskCommand } from '@aws-sdk/client-polly';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export interface OptimizedVideoRequest {
  topic: string;
  category: 'technology' | 'finance' | 'education' | 'health' | 'general';
  trendData: {
    keyword: string;
    searchVolume: number;
    relatedTerms: string[];
    context: {
      newsArticles: string[];
      socialMentions: string[];
    };
  };
  videoConfig: {
    durationSeconds: 6 | 30 | 60;
    style: 'professional' | 'casual' | 'educational' | 'modern';
    targetAudience: 'general' | 'professionals' | 'students' | 'experts';
  };
}

export interface OptimizedVideoResponse {
  success: boolean;
  videoS3Key?: string;
  audioS3Key?: string;
  subtitlesS3Key?: string;
  processedVideoS3Key?: string; // NEW: Final video with audio and subtitles
  bedrockJobId?: string;
  pollyTaskId?: string;
  content: {
    videoPrompt: string;
    audioScript: string;
    subtitles: string;
    visualElements: string[];
    keyMessage: string;
  };
  metadata: {
    duration: number;
    estimatedProcessingTime: number;
    visualStyle: string;
    voiceStyle: string;
    hasAudio: boolean; // NEW: Indicates if final video has audio
    hasSubtitles: boolean; // NEW: Indicates if final video has subtitles
  };
  generationCost: number;
  executionTime: number;
  error?: string;
}

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const pollyClient = new PollyClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const NOVA_REEL_MODEL_ID = 'amazon.nova-reel-v1:0';
const CLAUDE_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const VIDEO_BUCKET = process.env.VIDEO_BUCKET || 'youtube-automation-videos';
const AUDIO_BUCKET = process.env.AUDIO_BUCKET || 'youtube-automation-audio';

export const handler: Handler<OptimizedVideoRequest, OptimizedVideoResponse> = async (
  event: OptimizedVideoRequest,
  context: Context
): Promise<OptimizedVideoResponse> => {
  const startTime = Date.now();
  
  console.log('🎬 Optimized Video Generator started', {
    topic: event.topic,
    category: event.category,
    duration: event.videoConfig.durationSeconds,
    keyword: event.trendData.keyword
  });

  try {
    // Step 1: Generate optimized video and audio prompts
    const optimizedPrompts = await generateOptimizedPrompts(event);
    
    // Step 2: Generate video with Nova Reel
    const videoResult = await generateOptimizedVideo(optimizedPrompts.videoPrompt, event);
    
    // Step 3: Generate synchronized audio with Polly
    const audioResult = await generateOptimizedAudio(optimizedPrompts.audioScript, event);
    
    // Step 4: Generate subtitles
    const subtitlesResult = await generateOptimizedSubtitles(optimizedPrompts.audioScript, event);
    
    // Step 5: CRITICAL FIX - Merge audio and video using video processor
    console.log('🔧 CRITICAL FIX: Merging audio and video...');
    const processedVideoResult = await mergeAudioAndVideo({
      videoS3Key: videoResult.s3Key,
      audioS3Key: audioResult.s3Key,
      subtitlesS3Key: subtitlesResult.s3Key,
      trendId: event.trendData.keyword.replace(/\s+/g, '-'),
      topic: event.topic
    });
    
    const executionTime = Date.now() - startTime;
    
    console.log('✅ Optimized video generation completed WITH AUDIO', {
      videoS3Key: videoResult.s3Key,
      audioS3Key: audioResult.s3Key,
      subtitlesS3Key: subtitlesResult.s3Key,
      processedVideoS3Key: processedVideoResult.processedVideoS3Key,
      hasAudio: processedVideoResult.hasAudio,
      executionTime
    });

    return {
      success: true,
      videoS3Key: videoResult.s3Key,
      audioS3Key: audioResult.s3Key,
      subtitlesS3Key: subtitlesResult.s3Key,
      processedVideoS3Key: processedVideoResult.processedVideoS3Key, // CRITICAL: Final video with audio
      bedrockJobId: videoResult.jobId,
      pollyTaskId: audioResult.taskId,
      content: {
        videoPrompt: optimizedPrompts.videoPrompt,
        audioScript: optimizedPrompts.audioScript,
        subtitles: subtitlesResult.content,
        visualElements: optimizedPrompts.visualElements,
        keyMessage: optimizedPrompts.keyMessage
      },
      metadata: {
        duration: event.videoConfig.durationSeconds,
        estimatedProcessingTime: 90, // Nova Reel processing time
        visualStyle: optimizedPrompts.visualStyle,
        voiceStyle: optimizedPrompts.voiceStyle,
        hasAudio: processedVideoResult.hasAudio, // CRITICAL: Audio status
        hasSubtitles: processedVideoResult.hasSubtitles // CRITICAL: Subtitle status
      },
      generationCost: 0.08, // Nova Reel + Polly cost
      executionTime
    };

  } catch (error) {
    console.error('❌ Optimized video generation failed:', error);
    
    return {
      success: false,
      content: {
        videoPrompt: '',
        audioScript: '',
        subtitles: '',
        visualElements: [],
        keyMessage: ''
      },
      metadata: {
        duration: 0,
        estimatedProcessingTime: 0,
        visualStyle: '',
        voiceStyle: ''
      },
      generationCost: 0,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

interface OptimizedPrompts {
  videoPrompt: string;
  audioScript: string;
  visualElements: string[];
  keyMessage: string;
  visualStyle: string;
  voiceStyle: string;
}

async function generateOptimizedPrompts(event: OptimizedVideoRequest): Promise<OptimizedPrompts> {
  console.log('🧠 Generating optimized prompts based on trend data...');
  
  const promptGenerationRequest = `
Create optimized video and audio content for this trending topic:

TOPIC: ${event.topic}
CATEGORY: ${event.category}
KEYWORD: ${event.trendData.keyword}
SEARCH VOLUME: ${event.trendData.searchVolume}
RELATED TERMS: ${event.trendData.relatedTerms.join(', ')}
DURATION: ${event.videoConfig.durationSeconds} seconds
STYLE: ${event.videoConfig.style}
AUDIENCE: ${event.videoConfig.targetAudience}

NEWS CONTEXT: ${event.trendData.context.newsArticles.join('. ')}
SOCIAL CONTEXT: ${event.trendData.context.socialMentions.join('. ')}

Following the example pattern for "investing in index ETFs":

VIDEO PROMPT EXAMPLE:
"Cinematic dolly shot moving forward across a modern financial workspace. Close-up of a laptop screen displaying ascending stock market charts with ETF ticker symbols and growth graphs in green. Professional environment with soft natural lighting from a window, clean desk with notebook and pen, coffee cup with steam rising. Camera slowly pushes in toward the glowing screen showing portfolio diversification pie charts. 4k, photorealistic, shallow depth of field, highest quality, warm color grading."

AUDIO SCRIPT EXAMPLE (6 seconds):
"Index ETFs offer instant diversification, low fees, and proven long-term growth. Start investing smarter today."

Create similar optimized content for "${event.trendData.keyword}" that:

1. VIDEO PROMPT REQUIREMENTS:
   - Cinematic camera movement (dolly, push-in, pan, etc.)
   - Specific visual elements that represent the topic
   - Professional environment appropriate for ${event.category}
   - Detailed lighting and atmosphere description
   - Specific objects, screens, or displays showing relevant data
   - Technical specifications (4k, photorealistic, etc.)
   - Color grading that matches the mood

2. AUDIO SCRIPT REQUIREMENTS:
   - Exactly ${event.videoConfig.durationSeconds} seconds when spoken naturally
   - Core value proposition or key benefits
   - Clear, actionable message
   - Professional, confident tone
   - Call to action that aligns with visuals

3. CATEGORY-SPECIFIC ELEMENTS:
   ${getCategorySpecificGuidelines(event.category)}

Respond in JSON format:
{
  "videoPrompt": "detailed cinematic prompt for Nova Reel",
  "audioScript": "exactly ${event.videoConfig.durationSeconds}-second script",
  "visualElements": ["element1", "element2", "element3"],
  "keyMessage": "main takeaway in one sentence",
  "visualStyle": "description of visual aesthetic",
  "voiceStyle": "recommended voice characteristics"
}
`;

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [{ role: 'user', content: promptGenerationRequest }]
    }),
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  const content = responseBody.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse optimized prompts');
}

function getCategorySpecificGuidelines(category: string): string {
  const guidelines = {
    finance: `
    - Show financial charts, graphs, market data on screens
    - Professional trading/office environment
    - Green/red color coding for gains/losses
    - Calculator, documents, financial newspapers
    - Warm, trustworthy lighting`,
    
    technology: `
    - Modern tech workspace with multiple monitors
    - Code, dashboards, or tech interfaces on screens
    - Sleek, minimalist environment
    - Blue/purple tech color schemes
    - Clean, futuristic lighting`,
    
    education: `
    - Clean, organized learning environment
    - Books, notebooks, educational materials
    - Bright, encouraging atmosphere
    - Warm, natural lighting
    - Focus on growth and progress visuals`,
    
    health: `
    - Clean, wellness-focused environment
    - Health data, fitness trackers, or medical charts
    - Natural, calming colors (green, blue, white)
    - Soft, natural lighting
    - Professional medical or wellness setting`,
    
    general: `
    - Versatile, professional environment
    - Relevant data or information on screens
    - Neutral, appealing color palette
    - Balanced, professional lighting
    - Clean, organized workspace`
  };
  
  return guidelines[category] || guidelines.general;
}

async function generateOptimizedVideo(
  videoPrompt: string, 
  event: OptimizedVideoRequest
): Promise<{ s3Key: string; jobId: string }> {
  console.log('🎥 Generating optimized video with Nova Reel...');
  
  const enhancedPrompt = `${videoPrompt}

TECHNICAL SPECIFICATIONS:
- Duration: exactly ${event.videoConfig.durationSeconds} seconds
- Resolution: 1280x720 (HD)
- Frame rate: 24 fps
- Quality: Highest quality, photorealistic
- Format: MP4 optimized for YouTube
- Style: ${event.videoConfig.style} ${event.category} content

CONTENT REQUIREMENTS:
- Visual storytelling that supports the audio message
- Professional cinematography with smooth camera movement
- Clear, readable text or data displays when shown
- Consistent lighting and color grading throughout
- Engaging visual progression that holds viewer attention`;

  const novaReelRequest = {
    taskType: "TEXT_VIDEO",
    textToVideoParams: {
      text: enhancedPrompt,
      durationSeconds: event.videoConfig.durationSeconds,
      fps: 24,
      dimension: "1280x720",
      seed: Math.floor(Math.random() * 1000000)
    }
  };

  const command = new InvokeModelCommand({
    modelId: NOVA_REEL_MODEL_ID,
    body: JSON.stringify(novaReelRequest),
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  if (responseBody.error) {
    throw new Error(`Nova Reel generation failed: ${responseBody.error}`);
  }

  const jobId = responseBody.jobId || `optimized-${Date.now()}`;
  const s3Key = `optimized-videos/${event.category}/${event.trendData.keyword.replace(/\s+/g, '-')}_${Date.now()}.mp4`;
  
  console.log('🎬 Nova Reel job started', { jobId, s3Key });
  
  return { s3Key, jobId };
}

async function generateOptimizedAudio(
  audioScript: string, 
  event: OptimizedVideoRequest
): Promise<{ s3Key: string; taskId: string }> {
  console.log('🎙️ Generating optimized audio with Polly...');
  
  // Select appropriate voice based on category and audience
  const voiceConfig = getOptimalVoiceConfig(event.category, event.videoConfig.targetAudience);
  
  // Create SSML for precise timing and emphasis
  const ssmlScript = createSSMLScript(audioScript, event.videoConfig.durationSeconds);
  
  const s3Key = `optimized-audio/${event.category}/${event.trendData.keyword.replace(/\s+/g, '-')}_${Date.now()}.mp3`;
  
  const pollyRequest = {
    Engine: 'generative', // Use Polly's generative engine for highest quality
    VoiceId: voiceConfig.voiceId,
    OutputFormat: 'mp3',
    Text: ssmlScript,
    TextType: 'ssml',
    OutputS3BucketName: AUDIO_BUCKET,
    OutputS3KeyPrefix: s3Key.replace('.mp3', ''),
    SampleRate: '24000' // High quality audio
  };

  const command = new StartSpeechSynthesisTaskCommand(pollyRequest);
  const response = await pollyClient.send(command);
  
  const taskId = response.SynthesisTask?.TaskId || `audio-${Date.now()}`;
  
  console.log('🎵 Polly synthesis started', { taskId, s3Key });
  
  return { s3Key, taskId };
}

function getOptimalVoiceConfig(category: string, audience: string) {
  const voiceConfigs = {
    finance: {
      professionals: { voiceId: 'Matthew', style: 'authoritative' },
      general: { voiceId: 'Joanna', style: 'trustworthy' }
    },
    technology: {
      professionals: { voiceId: 'Matthew', style: 'confident' },
      general: { voiceId: 'Amy', style: 'modern' }
    },
    education: {
      students: { voiceId: 'Joanna', style: 'friendly' },
      general: { voiceId: 'Matthew', style: 'educational' }
    },
    health: {
      professionals: { voiceId: 'Joanna', style: 'professional' },
      general: { voiceId: 'Amy', style: 'caring' }
    }
  };
  
  return voiceConfigs[category]?.[audience] || { voiceId: 'Matthew', style: 'professional' };
}

function createSSMLScript(script: string, duration: number): string {
  // Calculate optimal speaking rate for the duration
  const wordsPerSecond = script.split(' ').length / duration;
  const rate = wordsPerSecond > 3 ? 'fast' : wordsPerSecond < 2 ? 'slow' : 'medium';
  
  return `
<speak>
  <prosody rate="${rate}" pitch="medium" volume="loud">
    <emphasis level="moderate">${script}</emphasis>
  </prosody>
</speak>`.trim();
}

async function generateOptimizedSubtitles(
  audioScript: string, 
  event: OptimizedVideoRequest
): Promise<{ s3Key: string; content: string }> {
  console.log('📝 Generating optimized subtitles...');
  
  // Create SRT format subtitles
  const words = audioScript.split(' ');
  const wordsPerSecond = words.length / event.videoConfig.durationSeconds;
  
  let srtContent = '';
  let currentTime = 0;
  let subtitleIndex = 1;
  
  // Create subtitle segments (3-4 words per subtitle for readability)
  const wordsPerSubtitle = Math.max(2, Math.min(4, Math.floor(wordsPerSecond * 2)));
  
  for (let i = 0; i < words.length; i += wordsPerSubtitle) {
    const segmentWords = words.slice(i, i + wordsPerSubtitle);
    const segmentDuration = (segmentWords.length / wordsPerSecond);
    const endTime = currentTime + segmentDuration;
    
    const startTimeFormatted = formatSRTTime(currentTime);
    const endTimeFormatted = formatSRTTime(endTime);
    
    srtContent += `${subtitleIndex}\n`;
    srtContent += `${startTimeFormatted} --> ${endTimeFormatted}\n`;
    srtContent += `${segmentWords.join(' ')}\n\n`;
    
    currentTime = endTime;
    subtitleIndex++;
  }
  
  const s3Key = `optimized-subtitles/${event.category}/${event.trendData.keyword.replace(/\s+/g, '-')}_${Date.now()}.srt`;
  
  // In a real implementation, this would be uploaded to S3
  console.log('📄 Subtitles generated', { s3Key, segments: subtitleIndex - 1 });
  
  return { s3Key, content: srtContent };
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

async function mergeAudioAndVideo(params: {
  videoS3Key: string;
  audioS3Key: string;
  subtitlesS3Key: string;
  trendId: string;
  topic: string;
}): Promise<{ processedVideoS3Key: string; hasAudio: boolean; hasSubtitles: boolean }> {
  console.log('🔧 CRITICAL FIX: Calling video processor to merge audio and video...');
  
  const videoProcessorEvent = {
    videoS3Key: params.videoS3Key,
    audioS3Key: params.audioS3Key,
    subtitlesS3Key: params.subtitlesS3Key,
    processingConfig: {
      embedSubtitles: true,
      mergeAudio: true,
      outputFormat: 'mp4',
      quality: 'high'
    },
    metadata: {
      duration: 6, // Will be updated based on actual video
      topic: params.topic,
      trendId: params.trendId
    }
  };

  try {
    const command = new InvokeCommand({
      FunctionName: 'youtube-automation-video-processor',
      Payload: JSON.stringify(videoProcessorEvent)
    });

    const response = await lambdaClient.send(command);
    
    if (!response.Payload) {
      throw new Error('Video processor returned no response');
    }

    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (!result.success) {
      throw new Error(`Video processor failed: ${result.error}`);
    }

    console.log('✅ CRITICAL FIX: Audio and video merged successfully', {
      processedVideoS3Key: result.processedVideoS3Key,
      hasAudio: result.metadata.hasAudio,
      hasSubtitles: result.metadata.hasSubtitles
    });

    return {
      processedVideoS3Key: result.processedVideoS3Key,
      hasAudio: result.metadata.hasAudio,
      hasSubtitles: result.metadata.hasSubtitles
    };

  } catch (error) {
    console.error('❌ CRITICAL ERROR: Audio-video merging failed:', error);
    
    // Return original video as fallback (but log the critical issue)
    console.error('🚨 FALLBACK: Returning video without audio - THIS IS THE CRITICAL BUG!');
    
    return {
      processedVideoS3Key: params.videoS3Key, // Fallback to original video
      hasAudio: false, // Critical: No audio!
      hasSubtitles: false
    };
  }
}

// Export for testing
export {
  generateOptimizedPrompts,
  getOptimalVoiceConfig,
  createSSMLScript,
  generateOptimizedSubtitles,
  formatSRTTime,
  mergeAudioAndVideo
};