import { Handler, Context } from 'aws-lambda';

export interface VideoProcessorEvent {
  videoS3Key: string;
  audioS3Key?: string;
  topic: string;
  trendId: string;
  metadata: {
    duration: number;
    format: string;
    hasAudio: boolean;
  };
  processingConfig?: {
    outputFormat: string;
    quality: string;
    resolution: string;
    bitrate: string;
  };
}

export interface VideoProcessorResponse {
  success: boolean;
  processedVideoS3Key?: string;
  mediaConvertJobId?: string;
  outputMetadata: {
    duration: number;
    fileSize: number;
    format: string;
    resolution: string;
    bitrate: string;
    audioChannels: number;
    isYouTubeOptimized: boolean;
  };
  processingCost: number;
  executionTime: number;
  error?: string;
}

export const handler: Handler<VideoProcessorEvent, VideoProcessorResponse> = async (
  event: VideoProcessorEvent,
  context: Context
): Promise<VideoProcessorResponse> => {
  const startTime = Date.now();
  
  console.log('Video Processor Lambda started', {
    requestId: context.awsRequestId,
    videoS3Key: event.videoS3Key,
    audioS3Key: event.audioS3Key,
    topic: event.topic,
    duration: event.metadata.duration
  });

  try {
    // Create MediaConvert job for YouTube optimization
    const mediaConvertResult = await processVideoForYouTube(event);
    
    // Wait for job completion
    const completedJob = await waitForJobCompletion(mediaConvertResult.jobId);
    
    // Get output file metadata
    const outputMetadata = await getProcessedVideoMetadata(
      mediaConvertResult.outputS3Key,
      event.processingConfig
    );

    // Calculate processing cost
    const processingCost = calculateProcessingCost(
      event.metadata.duration,
      outputMetadata.resolution
    );

    console.log('Video processing completed successfully', {
      jobId: mediaConvertResult.jobId,
      outputS3Key: mediaConvertResult.outputS3Key,
      duration: outputMetadata.duration,
      fileSize: outputMetadata.fileSize,
      cost: processingCost,
      executionTime: Date.now() - startTime
    });

    return {
      success: true,
      processedVideoS3Key: mediaConvertResult.outputS3Key,
      mediaConvertJobId: mediaConvertResult.jobId,
      outputMetadata,
      processingCost,
      executionTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Video processing failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId
    });

    return {
      success: false,
      outputMetadata: {
        duration: 0,
        fileSize: 0,
        format: '',
        resolution: '',
        bitrate: '',
        audioChannels: 0,
        isYouTubeOptimized: false
      },
      processingCost: 0,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function processVideoForYouTube(event: VideoProcessorEvent): Promise<{
  jobId: string;
  outputS3Key: string;
}> {
  console.log('Starting MediaConvert job for YouTube optimization');

  try {
    const { MediaConvertClient, CreateJobCommand } = 
      await import('@aws-sdk/client-mediaconvert');

    // Get MediaConvert endpoint
    const mediaConvert = new MediaConvertClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const processingConfig = event.processingConfig || {
      outputFormat: 'mp4',
      quality: 'high',
      resolution: '1920x1080',
      bitrate: '8000'
    };

    const outputS3Key = `processed/${event.topic}/${event.trendId}_youtube_${Date.now()}.mp4`;
    const inputS3Uri = `s3://${process.env.VIDEO_BUCKET}/${event.videoS3Key}`;
    const outputS3Uri = `s3://${process.env.VIDEO_BUCKET}/${outputS3Key}`;

    // Create job settings optimized for YouTube
    const jobSettings = createYouTubeOptimizedJobSettings(
      inputS3Uri,
      outputS3Uri,
      event.audioS3Key ? `s3://${process.env.VIDEO_BUCKET}/${event.audioS3Key}` : undefined,
      processingConfig,
      event.metadata
    );

    const response = await mediaConvert.send(new CreateJobCommand({
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      Settings: jobSettings,
      Queue: process.env.MEDIACONVERT_QUEUE_ARN,
      UserMetadata: {
        topic: event.topic,
        trendId: event.trendId,
        originalDuration: event.metadata.duration.toString()
      }
    }));

    console.log('MediaConvert job created', { 
      jobId: response.Job?.Id,
      outputS3Key 
    });

    return {
      jobId: response.Job?.Id || 'unknown',
      outputS3Key
    };

  } catch (error) {
    console.error('MediaConvert job creation failed', error);
    throw error;
  }
}

function createYouTubeOptimizedJobSettings(
  inputS3Uri: string,
  outputS3Uri: string,
  audioS3Uri: string | undefined,
  processingConfig: any,
  metadata: any
): any {
  const inputs: any[] = [
    {
      FileInput: inputS3Uri,
      VideoSelector: {
        ColorSpace: 'REC_709',
        ColorSpaceUsage: 'FORCE'
      }
    }
  ];

  // Add audio input if available
  if (audioS3Uri) {
    inputs.push({
      FileInput: audioS3Uri,
      AudioSelectors: {
        'Audio Selector 1': {
          DefaultSelection: 'DEFAULT'
        }
      }
    });
  }

  return {
    Inputs: inputs,
    OutputGroups: [
      {
        Name: 'YouTube Optimized',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: {
            Destination: outputS3Uri.replace(/\/[^\/]*$/, '/'),
            DestinationSettings: {
              S3Settings: {
                StorageClass: 'STANDARD'
              }
            }
          }
        },
        Outputs: [
          {
            NameModifier: '_youtube_optimized',
            VideoDescription: {
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'CBR',
                  Bitrate: parseInt(processingConfig.bitrate) * 1000, // Convert to bps
                  MaxBitrate: parseInt(processingConfig.bitrate) * 1200,
                  Profile: 'HIGH',
                  Level: 'LEVEL_4_1',
                  GopSize: 30,
                  GopSizeUnits: 'FRAMES',
                  FramerateControl: 'SPECIFIED',
                  FramerateNumerator: 30,
                  FramerateDenominator: 1,
                  ColorMetadata: 'INSERT',
                  TimecodeInsertion: 'DISABLED'
                }
              },
              Width: parseInt(processingConfig.resolution.split('x')[0]),
              Height: parseInt(processingConfig.resolution.split('x')[1]),
              RespondToAfd: 'NONE',
              ScalingBehavior: 'DEFAULT',
              TimecodeInsertion: 'DISABLED',
              AntiAlias: 'ENABLED',
              Sharpness: 50,
              AfdSignaling: 'NONE',
              DropFrameTimecode: 'ENABLED'
            },
            AudioDescriptions: audioS3Uri ? [
              {
                AudioTypeControl: 'FOLLOW_INPUT',
                AudioSourceName: 'Audio Selector 1',
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    AudioDescriptionBroadcasterMix: 'NORMAL',
                    Bitrate: 128000,
                    RateControlMode: 'CBR',
                    CodecProfile: 'LC',
                    CodingMode: 'CODING_MODE_2_0',
                    RawFormat: 'NONE',
                    SampleRate: 48000,
                    Specification: 'MPEG4'
                  }
                },
                LanguageCodeControl: 'FOLLOW_INPUT'
              }
            ] : [],
            ContainerSettings: {
              Container: 'MP4',
              Mp4Settings: {
                CslgAtom: 'INCLUDE',
                FreeSpaceBox: 'EXCLUDE',
                MoovPlacement: 'PROGRESSIVE_DOWNLOAD'
              }
            }
          }
        ]
      }
    ],
    TimecodeConfig: {
      Source: 'ZEROBASED'
    }
  };
}

async function waitForJobCompletion(jobId: string): Promise<any> {
  console.log('Waiting for MediaConvert job completion', { jobId });

  try {
    const { MediaConvertClient, GetJobCommand } = 
      await import('@aws-sdk/client-mediaconvert');

    const mediaConvert = new MediaConvertClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const maxWaitTime = 20 * 60 * 1000; // 20 minutes
    const pollInterval = 30 * 1000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const response = await mediaConvert.send(new GetJobCommand({
        Id: jobId
      }));

      const status = response.Job?.Status;
      console.log('MediaConvert job status', { jobId, status });

      if (status === 'COMPLETE') {
        console.log('MediaConvert job completed successfully');
        return response.Job;
      } else if (status === 'ERROR' || status === 'CANCELED') {
        throw new Error(`MediaConvert job failed with status: ${status}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('MediaConvert job timed out');

  } catch (error) {
    console.error('Error waiting for MediaConvert job', error);
    throw error;
  }
}

async function getProcessedVideoMetadata(
  s3Key: string,
  processingConfig: any
): Promise<{
  duration: number;
  fileSize: number;
  format: string;
  resolution: string;
  bitrate: string;
  audioChannels: number;
  isYouTubeOptimized: boolean;
}> {
  try {
    const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    
    const response = await s3.send(new HeadObjectCommand({
      Bucket: process.env.VIDEO_BUCKET,
      Key: s3Key
    }));

    // Extract metadata from S3 object
    const fileSize = response.ContentLength || 0;
    const contentType = response.ContentType || 'video/mp4';

    // Calculate duration from file size and bitrate (approximate)
    const bitrateKbps = parseInt(processingConfig?.bitrate || '8000');
    const estimatedDuration = Math.round((fileSize * 8) / (bitrateKbps * 1000));

    return {
      duration: estimatedDuration,
      fileSize,
      format: 'mp4',
      resolution: processingConfig?.resolution || '1920x1080',
      bitrate: `${bitrateKbps}k`,
      audioChannels: 2,
      isYouTubeOptimized: true
    };

  } catch (error) {
    console.error('Failed to get processed video metadata', error);
    
    // Return default metadata if S3 call fails
    return {
      duration: 0,
      fileSize: 0,
      format: 'mp4',
      resolution: processingConfig?.resolution || '1920x1080',
      bitrate: processingConfig?.bitrate || '8000k',
      audioChannels: 2,
      isYouTubeOptimized: true
    };
  }
}

function calculateProcessingCost(durationSeconds: number, resolution: string): number {
  // MediaConvert pricing (approximate)
  const durationMinutes = durationSeconds / 60;
  
  // Pricing varies by resolution
  const pricePerMinute = resolution.includes('1080') ? 0.0075 : 0.0045; // HD vs SD
  
  const processingCost = durationMinutes * pricePerMinute;
  
  return Math.round(processingCost * 100) / 100; // Round to 2 decimal places
}