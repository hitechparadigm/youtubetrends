import { Handler, Context } from 'aws-lambda';

export interface VideoGeneratorEvent {
  scriptPrompt: string;
  topic: string;
  trendId: string;
  videoConfig: {
    durationSeconds: number;
    fps: number;
    dimension: string;
    quality: string;
    includeAudio: boolean;
  };
  audioConfig?: {
    voice: string;
    speed: string;
    language: string;
  };
}

export interface VideoGeneratorResponse {
  success: boolean;
  videoS3Key?: string;
  audioS3Key?: string;
  bedrockJobId?: string;
  pollyJobId?: string;
  metadata: {
    duration: number;
    fileSize: number;
    format: string;
    hasAudio: boolean;
  };
  generationCost: number;
  executionTime: number;
  error?: string;
}

export const handler: Handler<VideoGeneratorEvent, VideoGeneratorResponse> = async (
  event: VideoGeneratorEvent,
  context: Context
): Promise<VideoGeneratorResponse> => {
  const startTime = Date.now();
  
  console.log('Video Generator Lambda started', {
    requestId: context.awsRequestId,
    topic: event.topic,
    trendId: event.trendId,
    duration: event.videoConfig.durationSeconds
  });

  try {
    // Generate video using Amazon Bedrock Nova Reel
    const videoResult = await generateVideo(event);
    
    // Generate audio narration if requested
    let audioResult = null;
    if (event.videoConfig.includeAudio) {
      audioResult = await generateAudio(event);
    }

    // Calculate costs
    const generationCost = calculateGenerationCost(
      event.videoConfig.durationSeconds,
      event.videoConfig.includeAudio
    );

    console.log('Video generation completed successfully', {
      videoS3Key: videoResult.s3Key,
      audioS3Key: audioResult?.s3Key,
      duration: videoResult.duration,
      cost: generationCost,
      executionTime: Date.now() - startTime
    });

    return {
      success: true,
      videoS3Key: videoResult.s3Key,
      audioS3Key: audioResult?.s3Key,
      bedrockJobId: videoResult.jobId,
      pollyJobId: audioResult?.jobId,
      metadata: {
        duration: videoResult.duration,
        fileSize: videoResult.fileSize,
        format: videoResult.format,
        hasAudio: !!audioResult
      },
      generationCost,
      executionTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Video generation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId
    });

    return {
      success: false,
      metadata: {
        duration: 0,
        fileSize: 0,
        format: '',
        hasAudio: false
      },
      generationCost: 0,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function generateVideo(event: VideoGeneratorEvent): Promise<{
  s3Key: string;
  jobId: string;
  duration: number;
  fileSize: number;
  format: string;
}> {
  console.log('Starting video generation with Bedrock Nova Reel');

  // Enhanced script prompt with topic-specific instructions
  const enhancedPrompt = enhancePromptForTopic(event.scriptPrompt, event.topic);

  // Mock mode for testing
  if (process.env.MOCK_VIDEO_GENERATION === 'true') {
    console.log('Mock mode: Simulating video generation');
    const s3OutputKey = `videos/${event.topic}/${event.trendId}_${Date.now()}.mp4`;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      s3Key: s3OutputKey,
      jobId: `mock-job-${Date.now()}`,
      duration: event.videoConfig.durationSeconds,
      fileSize: event.videoConfig.durationSeconds * 1024 * 100, // Estimate ~100KB per second
      format: 'mp4'
    };
  }

  try {
    const { BedrockRuntimeClient, StartAsyncInvokeCommand, GetAsyncInvokeCommand } = 
      await import('@aws-sdk/client-bedrock-runtime');

    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const s3OutputKey = `videos/${event.topic}/${event.trendId}_${Date.now()}.mp4`;

    // Validate required environment variables
    if (!process.env.VIDEO_BUCKET) {
      throw new Error('VIDEO_BUCKET environment variable is required');
    }

    // Start async video generation with improved error handling
    const startResponse = await bedrock.send(new StartAsyncInvokeCommand({
      modelId: 'amazon.nova-reel-v1:0',
      modelInput: {
        taskType: 'TEXT_VIDEO',
        textToVideoParams: {
          text: enhancedPrompt
        },
        videoGenerationConfig: {
          fps: event.videoConfig.fps,
          durationSeconds: event.videoConfig.durationSeconds,
          dimension: event.videoConfig.dimension,
          seed: Math.floor(Math.random() * 1000000) // Random seed for variety
        }
      },
      outputDataConfig: {
        s3OutputDataConfig: {
          s3Uri: `s3://${process.env.VIDEO_BUCKET}/videos/`
        }
      }
    }));

    const jobId = startResponse.invocationArn!;
    console.log('Bedrock job started', { jobId, s3OutputKey });

    // Extract job ID from ARN for actual S3 path
    const jobIdFromArn = jobId.split('/').pop() || 'unknown';
    const actualS3Key = `videos/${jobIdFromArn}/output.mp4`;

    // Poll for completion (with timeout)
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const pollInterval = 30 * 1000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await bedrock.send(new GetAsyncInvokeCommand({
        invocationArn: jobId
      }));

      console.log('Job status:', statusResponse.status);

      if (statusResponse.status === 'Completed') {
        console.log('Video generation completed successfully');
        
        // Get file metadata from S3 using actual path
        const metadata = await getS3FileMetadata(actualS3Key);
        
        return {
          s3Key: actualS3Key, // Use the actual S3 path where Bedrock stores the file
          jobId,
          duration: event.videoConfig.durationSeconds,
          fileSize: metadata.size,
          format: 'mp4'
        };
      } else if (statusResponse.status === 'Failed') {
        throw new Error(`Video generation failed: ${statusResponse.failureMessage || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video generation timed out after 30 minutes');

  } catch (error) {
    console.error('Bedrock video generation failed', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ValidationException')) {
        throw new Error('Invalid video generation parameters or AWS configuration');
      } else if (error.message.includes('AccessDeniedException')) {
        throw new Error('Insufficient permissions for Bedrock Nova Reel access');
      } else if (error.message.includes('ThrottlingException')) {
        throw new Error('Rate limit exceeded for Bedrock Nova Reel');
      }
    }
    
    throw error;
  }
}

async function generateAudio(event: VideoGeneratorEvent): Promise<{
  s3Key: string;
  jobId: string;
}> {
  console.log('Starting audio generation with Amazon Polly');
  
  // Use narration script if provided, otherwise use the visual prompt
  const audioScript = (event as any).narrationScript || event.scriptPrompt;

  // Mock mode for testing
  if (process.env.MOCK_VIDEO_GENERATION === 'true') {
    console.log('Mock mode: Simulating audio generation');
    const s3OutputKey = `audio/${event.topic}/${event.trendId}_${Date.now()}.mp3`;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      s3Key: s3OutputKey,
      jobId: `mock-audio-job-${Date.now()}`
    };
  }

  try {
    const { PollyClient, StartSpeechSynthesisTaskCommand } = 
      await import('@aws-sdk/client-polly');

    const polly = new PollyClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const audioConfig = event.audioConfig || {
      voice: 'Matthew',
      speed: 'medium',
      language: 'en-US'
    };

    // Get topic-specific voice settings
    const voiceSettings = getTopicVoiceSettings(event.topic, audioConfig);
    
    const s3OutputKey = `audio/${event.topic}/${event.trendId}_${Date.now()}.mp3`;

    // Generate SSML for better audio control using the audio script
    const ssmlText = generateSSML(audioScript, voiceSettings);

    // Validate required environment variables
    if (!process.env.VIDEO_BUCKET) {
      throw new Error('VIDEO_BUCKET environment variable is required');
    }

    // Try neural engine first, fallback to standard if needed
    let response;
    try {
      response = await polly.send(new StartSpeechSynthesisTaskCommand({
        Text: ssmlText,
        TextType: 'ssml',
        VoiceId: voiceSettings.voiceId as any,
        OutputFormat: 'mp3',
        Engine: 'neural',
        OutputS3BucketName: process.env.VIDEO_BUCKET,
        OutputS3KeyPrefix: `audio/${event.topic}/`,
        SampleRate: '24000'
      }));
    } catch (neuralError) {
      console.log('Neural engine failed, trying standard engine', neuralError);
      // Fallback to standard engine with plain text
      response = await polly.send(new StartSpeechSynthesisTaskCommand({
        Text: audioScript, // Use audio script instead of visual prompt
        TextType: 'text',
        VoiceId: voiceSettings.voiceId as any,
        OutputFormat: 'mp3',
        Engine: 'standard',
        OutputS3BucketName: process.env.VIDEO_BUCKET,
        OutputS3KeyPrefix: `audio/${event.topic}/`,
        SampleRate: '22050'
      }));
    }

    console.log('Polly job started', { 
      taskId: response.SynthesisTask?.TaskId,
      s3OutputKey,
      voiceId: voiceSettings.voiceId
    });

    return {
      s3Key: s3OutputKey,
      jobId: response.SynthesisTask?.TaskId || 'unknown'
    };

  } catch (error) {
    console.error('Polly audio generation failed', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('InvalidParameterValue')) {
        throw new Error('Invalid audio generation parameters');
      } else if (error.message.includes('AccessDeniedException')) {
        throw new Error('Insufficient permissions for Amazon Polly access');
      } else if (error.message.includes('ThrottlingException')) {
        throw new Error('Rate limit exceeded for Amazon Polly');
      }
    }
    
    throw error;
  }
}

function enhancePromptForTopic(basePrompt: string, topic: string): string {
  // Keep prompts under 512 characters for Bedrock Nova Reel
  const topicEnhancements: Record<string, string> = {
    investing: `${basePrompt} Show financial markets, stock charts, trading floors, and investment graphics.`,
    education: `${basePrompt} Show classrooms, books, digital learning, and educational technology.`,
    tourism: `${basePrompt} Show travel destinations, landmarks, landscapes, and cultural sites.`,
    technology: `${basePrompt} Show futuristic tech, AI interfaces, robots, and innovation labs.`,
    health: `${basePrompt} Show fitness activities, medical technology, and wellness environments.`
  };

  const enhanced = topicEnhancements[topic.toLowerCase()] || basePrompt;
  
  // Ensure we stay under 512 character limit
  return enhanced.length > 512 ? enhanced.substring(0, 509) + '...' : enhanced;
}

function getTopicVoiceSettings(topic: string, audioConfig: any): {
  voiceId: string;
  rate: string;
  pitch: string;
} {
  const topicVoices: Record<string, { voiceId: string; rate: string; pitch: string }> = {
    investing: { voiceId: 'Matthew', rate: 'medium', pitch: 'medium' }, // Professional male voice
    education: { voiceId: 'Joanna', rate: 'medium', pitch: 'medium' }, // Clear female voice
    tourism: { voiceId: 'Amy', rate: 'medium', pitch: 'medium' }, // Enthusiastic British voice
    technology: { voiceId: 'Matthew', rate: 'medium', pitch: 'medium' }, // Professional male voice for tech
    health: { voiceId: 'Joanna', rate: 'slow', pitch: 'medium' } // Calm, reassuring voice
  };

  return topicVoices[topic.toLowerCase()] || topicVoices.education;
}

function generateSSML(text: string, voiceSettings: any): string {
  // Simplified SSML compatible with neural voices
  return `
    <speak>
      <break time="0.5s"/>
      ${text}
      <break time="1s"/>
    </speak>
  `.trim();
}

async function getS3FileMetadata(s3Key: string): Promise<{ size: number }> {
  // Mock mode for testing
  if (process.env.MOCK_VIDEO_GENERATION === 'true') {
    // Estimate file size based on duration (rough approximation)
    const estimatedSize = 1024 * 1024 * 5; // 5MB default
    return { size: estimatedSize };
  }

  try {
    const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    
    if (!process.env.VIDEO_BUCKET) {
      throw new Error('VIDEO_BUCKET environment variable is required');
    }
    
    const response = await s3.send(new HeadObjectCommand({
      Bucket: process.env.VIDEO_BUCKET,
      Key: s3Key
    }));

    console.log('S3 metadata retrieved', { 
      key: s3Key, 
      size: response.ContentLength,
      lastModified: response.LastModified
    });

    return {
      size: response.ContentLength || 0
    };
  } catch (error) {
    console.error('Failed to get S3 metadata', { key: s3Key, error });
    
    // Return estimated size if metadata retrieval fails
    return { size: 1024 * 1024 * 5 }; // 5MB estimate
  }
}

function calculateGenerationCost(durationSeconds: number, includeAudio: boolean): number {
  // Bedrock Nova Reel pricing (approximate)
  const videoCostPerSecond = 0.80 / 60; // $0.80 per minute
  const videoCost = (durationSeconds / 60) * 0.80;
  
  // Polly pricing (approximate)
  const audioCost = includeAudio ? (durationSeconds * 0.000004) : 0; // $4 per 1M characters
  
  return Math.round((videoCost + audioCost) * 100) / 100; // Round to 2 decimal places
}