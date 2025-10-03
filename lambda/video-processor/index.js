"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event, context) => {
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
        const outputMetadata = await getProcessedVideoMetadata(mediaConvertResult.outputS3Key, event.processingConfig);
        // Calculate processing cost
        const processingCost = calculateProcessingCost(event.metadata.duration, outputMetadata.resolution);
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
    }
    catch (error) {
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
exports.handler = handler;
async function processVideoForYouTube(event) {
    console.log('Starting MediaConvert job for YouTube optimization');
    try {
        const { MediaConvertClient, CreateJobCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-mediaconvert'));
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
        const jobSettings = createYouTubeOptimizedJobSettings(inputS3Uri, outputS3Uri, event.audioS3Key ? `s3://${process.env.VIDEO_BUCKET}/${event.audioS3Key}` : undefined, processingConfig, event.metadata);
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
    }
    catch (error) {
        console.error('MediaConvert job creation failed', error);
        throw error;
    }
}
function createYouTubeOptimizedJobSettings(inputS3Uri, outputS3Uri, audioS3Uri, processingConfig, metadata) {
    const inputs = [
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
                                    Bitrate: parseInt(processingConfig.bitrate) * 1000,
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
async function waitForJobCompletion(jobId) {
    console.log('Waiting for MediaConvert job completion', { jobId });
    try {
        const { MediaConvertClient, GetJobCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-mediaconvert'));
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
            }
            else if (status === 'ERROR' || status === 'CANCELED') {
                throw new Error(`MediaConvert job failed with status: ${status}`);
            }
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        throw new Error('MediaConvert job timed out');
    }
    catch (error) {
        console.error('Error waiting for MediaConvert job', error);
        throw error;
    }
}
async function getProcessedVideoMetadata(s3Key, processingConfig) {
    try {
        const { S3Client, HeadObjectCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-s3'));
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
    }
    catch (error) {
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
function calculateProcessingCost(durationSeconds, resolution) {
    // MediaConvert pricing (approximate)
    const durationMinutes = durationSeconds / 60;
    // Pricing varies by resolution
    const pricePerMinute = resolution.includes('1080') ? 0.0075 : 0.0045; // HD vs SD
    const processingCost = durationMinutes * pricePerMinute;
    return Math.round(processingCost * 100) / 100; // Round to 2 decimal places
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFzQ08sTUFBTSxPQUFPLEdBQXlELEtBQUssRUFDaEYsS0FBMEIsRUFDMUIsT0FBZ0IsRUFDaUIsRUFBRTtJQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRTtRQUM1QyxTQUFTLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDL0IsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1FBQzVCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtRQUM1QixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7UUFDbEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUTtLQUNsQyxDQUFDLENBQUM7SUFFSCxJQUFJO1FBQ0YsbURBQW1EO1FBQ25ELE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUvRCwwQkFBMEI7UUFDMUIsTUFBTSxZQUFZLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUxRSwyQkFBMkI7UUFDM0IsTUFBTSxjQUFjLEdBQUcsTUFBTSx5QkFBeUIsQ0FDcEQsa0JBQWtCLENBQUMsV0FBVyxFQUM5QixLQUFLLENBQUMsZ0JBQWdCLENBQ3ZCLENBQUM7UUFFRiw0QkFBNEI7UUFDNUIsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLENBQzVDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUN2QixjQUFjLENBQUMsVUFBVSxDQUMxQixDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsRUFBRTtZQUNyRCxLQUFLLEVBQUUsa0JBQWtCLENBQUMsS0FBSztZQUMvQixXQUFXLEVBQUUsa0JBQWtCLENBQUMsV0FBVztZQUMzQyxRQUFRLEVB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Y0FBYyxDQUFDO0lBRXhELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsNEJBQTRCO0FBQzdFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBIYW5kbGVyLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZpZGVvUHJvY2Vzc29yRXZlbnQge1xyXG4gIHZpZGVvUzNLZXk6IHN0cmluZztcclxuICBhdWRpb1MzS2V5Pzogc3RyaW5nO1xyXG4gIHRvcGljOiBzdHJpbmc7XHJcbiAgdHJlbmRJZDogc3RyaW5nO1xyXG4gIG1ldGFkYXRhOiB7XHJcbiAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgZm9ybWF0OiBzdHJpbmc7XHJcbiAgICBoYXNBdWRpbzogYm9vbGVhbjtcclxuICB9O1xyXG4gIHByb2Nlc3NpbmdDb25maWc/OiB7XHJcbiAgICBvdXRwdXRGb3JtYXQ6IHN0cmluZztcclxuICAgIHF1YWxpdHk6IHN0cmluZztcclxuICAgIHJlc29sdXRpb246IHN0cmluZztcclxuICAgIGJpdHJhdGU6IHN0cmluZztcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZpZGVvUHJvY2Vzc29yUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgcHJvY2Vzc2VkVmlkZW9TM0tleT86IHN0cmluZztcclxuICBtZWRpYUNvbnZlcnRKb2JJZD86IHN0cmluZztcclxuICBvdXRwdXRNZXRhZGF0YToge1xyXG4gICAgZHVyYXRpb246IG51bWJlcjtcclxuICAgIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgICBmb3JtYXQ6IHN0cmluZztcclxuICAgIHJlc29sdXRpb246IHN0cmluZztcclxuICAgIGJpdHJhdGU6IHN0cmluZztcclxuICAgIGF1ZGlvQ2hhbm5lbHM6IG51bWJlcjtcclxuICAgIGlzWW91VHViZU9wdGltaXplZDogYm9vbGVhbjtcclxuICB9O1xyXG4gIHByb2Nlc3NpbmdDb3N0OiBudW1iZXI7XHJcbiAgZXhlY3V0aW9uVGltZTogbnVtYmVyO1xyXG4gIGVycm9yPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogSGFuZGxlcjxWaWRlb1Byb2Nlc3NvckV2ZW50LCBWaWRlb1Byb2Nlc3NvclJlc3BvbnNlPiA9IGFzeW5jIChcclxuICBldmVudDogVmlkZW9Qcm9jZXNzb3JFdmVudCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8VmlkZW9Qcm9jZXNzb3JSZXNwb25zZT4gPT4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ1ZpZGVvIFByb2Nlc3NvciBMYW1iZGEgc3RhcnRlZCcsIHtcclxuICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICB2aWRlb1MzS2V5OiBldmVudC52aWRlb1MzS2V5LFxyXG4gICAgYXVkaW9TM0tleTogZXZlbnQuYXVkaW9TM0tleSxcclxuICAgIHRvcGljOiBldmVudC50b3BpYyxcclxuICAgIGR1cmF0aW9uOiBldmVudC5tZXRhZGF0YS5kdXJhdGlvblxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gQ3JlYXRlIE1lZGlhQ29udmVydCBqb2IgZm9yIFlvdVR1YmUgb3B0aW1pemF0aW9uXHJcbiAgICBjb25zdCBtZWRpYUNvbnZlcnRSZXN1bHQgPSBhd2FpdCBwcm9jZXNzVmlkZW9Gb3JZb3VUdWJlKGV2ZW50KTtcclxuICAgIFxyXG4gICAgLy8gV2FpdCBmb3Igam9iIGNvbXBsZXRpb25cclxuICAgIGNvbnN0IGNvbXBsZXRlZEpvYiA9IGF3YWl0IHdhaXRGb3JKb2JDb21wbGV0aW9uKG1lZGlhQ29udmVydFJlc3VsdC5qb2JJZCk7XHJcbiAgICBcclxuICAgIC8vIEdldCBvdXRwdXQgZmlsZSBtZXRhZGF0YVxyXG4gICAgY29uc3Qgb3V0cHV0TWV0YWRhdGEgPSBhd2FpdCBnZXRQcm9jZXNzZWRWaWRlb01ldGFkYXRhKFxyXG4gICAgICBtZWRpYUNvbnZlcnRSZXN1bHQub3V0cHV0UzNLZXksXHJcbiAgICAgIGV2ZW50LnByb2Nlc3NpbmdDb25maWdcclxuICAgICk7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIHByb2Nlc3NpbmcgY29zdFxyXG4gICAgY29uc3QgcHJvY2Vzc2luZ0Nvc3QgPSBjYWxjdWxhdGVQcm9jZXNzaW5nQ29zdChcclxuICAgICAgZXZlbnQubWV0YWRhdGEuZHVyYXRpb24sXHJcbiAgICAgIG91dHB1dE1ldGFkYXRhLnJlc29sdXRpb25cclxuICAgICk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1ZpZGVvIHByb2Nlc3NpbmcgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgam9iSWQ6IG1lZGlhQ29udmVydFJlc3VsdC5qb2JJZCxcclxuICAgICAgb3V0cHV0UzNLZXk6IG1lZGlhQ29udmVydFJlc3VsdC5vdXRwdXRTM0tleSxcclxuICAgICAgZHVyYXRpb246IG91dHB1dE1ldGFkYXRhLmR1cmF0aW9uLFxyXG4gICAgICBmaWxlU2l6ZTogb3V0cHV0TWV0YWRhdGEuZmlsZVNpemUsXHJcbiAgICAgIGNvc3Q6IHByb2Nlc3NpbmdDb3N0LFxyXG4gICAgICBleGVjdXRpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBwcm9jZXNzZWRWaWRlb1MzS2V5OiBtZWRpYUNvbnZlcnRSZXN1bHQub3V0cHV0UzNLZXksXHJcbiAgICAgIG1lZGlhQ29udmVydEpvYklkOiBtZWRpYUNvbnZlcnRSZXN1bHQuam9iSWQsXHJcbiAgICAgIG91dHB1dE1ldGFkYXRhLFxyXG4gICAgICBwcm9jZXNzaW5nQ29zdCxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1ZpZGVvIHByb2Nlc3NpbmcgZmFpbGVkJywge1xyXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICBzdGFjazogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrIDogdW5kZWZpbmVkLFxyXG4gICAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgb3V0cHV0TWV0YWRhdGE6IHtcclxuICAgICAgICBkdXJhdGlvbjogMCxcclxuICAgICAgICBmaWxlU2l6ZTogMCxcclxuICAgICAgICBmb3JtYXQ6ICcnLFxyXG4gICAgICAgIHJlc29sdXRpb246ICcnLFxyXG4gICAgICAgIGJpdHJhdGU6ICcnLFxyXG4gICAgICAgIGF1ZGlvQ2hhbm5lbHM6IDAsXHJcbiAgICAgICAgaXNZb3VUdWJlT3B0aW1pemVkOiBmYWxzZVxyXG4gICAgICB9LFxyXG4gICAgICBwcm9jZXNzaW5nQ29zdDogMCxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzVmlkZW9Gb3JZb3VUdWJlKGV2ZW50OiBWaWRlb1Byb2Nlc3NvckV2ZW50KTogUHJvbWlzZTx7XHJcbiAgam9iSWQ6IHN0cmluZztcclxuICBvdXRwdXRTM0tleTogc3RyaW5nO1xyXG59PiB7XHJcbiAgY29uc29sZS5sb2coJ1N0YXJ0aW5nIE1lZGlhQ29udmVydCBqb2IgZm9yIFlvdVR1YmUgb3B0aW1pemF0aW9uJyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IE1lZGlhQ29udmVydENsaWVudCwgQ3JlYXRlSm9iQ29tbWFuZCB9ID0gXHJcbiAgICAgIGF3YWl0IGltcG9ydCgnQGF3cy1zZGsvY2xpZW50LW1lZGlhY29udmVydCcpO1xyXG5cclxuICAgIC8vIEdldCBNZWRpYUNvbnZlcnQgZW5kcG9pbnRcclxuICAgIGNvbnN0IG1lZGlhQ29udmVydCA9IG5ldyBNZWRpYUNvbnZlcnRDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHByb2Nlc3NpbmdDb25maWcgPSBldmVudC5wcm9jZXNzaW5nQ29uZmlnIHx8IHtcclxuICAgICAgb3V0cHV0Rm9ybWF0OiAnbXA0JyxcclxuICAgICAgcXVhbGl0eTogJ2hpZ2gnLFxyXG4gICAgICByZXNvbHV0aW9uOiAnMTkyMHgxMDgwJyxcclxuICAgICAgYml0cmF0ZTogJzgwMDAnXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IG91dHB1dFMzS2V5ID0gYHByb2Nlc3NlZC8ke2V2ZW50LnRvcGljfS8ke2V2ZW50LnRyZW5kSWR9X3lvdXR1YmVfJHtEYXRlLm5vdygpfS5tcDRgO1xyXG4gICAgY29uc3QgaW5wdXRTM1VyaSA9IGBzMzovLyR7cHJvY2Vzcy5lbnYuVklERU9fQlVDS0VUfS8ke2V2ZW50LnZpZGVvUzNLZXl9YDtcclxuICAgIGNvbnN0IG91dHB1dFMzVXJpID0gYHMzOi8vJHtwcm9jZXNzLmVudi5WSURFT19CVUNLRVR9LyR7b3V0cHV0UzNLZXl9YDtcclxuXHJcbiAgICAvLyBDcmVhdGUgam9iIHNldHRpbmdzIG9wdGltaXplZCBmb3IgWW91VHViZVxyXG4gICAgY29uc3Qgam9iU2V0dGluZ3MgPSBjcmVhdGVZb3VUdWJlT3B0aW1pemVkSm9iU2V0dGluZ3MoXHJcbiAgICAgIGlucHV0UzNVcmksXHJcbiAgICAgIG91dHB1dFMzVXJpLFxyXG4gICAgICBldmVudC5hdWRpb1MzS2V5ID8gYHMzOi8vJHtwcm9jZXNzLmVudi5WSURFT19CVUNLRVR9LyR7ZXZlbnQuYXVkaW9TM0tleX1gIDogdW5kZWZpbmVkLFxyXG4gICAgICBwcm9jZXNzaW5nQ29uZmlnLFxyXG4gICAgICBldmVudC5tZXRhZGF0YVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IG1lZGlhQ29udmVydC5zZW5kKG5ldyBDcmVhdGVKb2JDb21tYW5kKHtcclxuICAgICAgUm9sZTogcHJvY2Vzcy5lbnYuTUVESUFDT05WRVJUX1JPTEVfQVJOLFxyXG4gICAgICBTZXR0aW5nczogam9iU2V0dGluZ3MsXHJcbiAgICAgIFF1ZXVlOiBwcm9jZXNzLmVudi5NRURJQUNPTlZFUlRfUVVFVUVfQVJOLFxyXG4gICAgICBVc2VyTWV0YWRhdGE6IHtcclxuICAgICAgICB0b3BpYzogZXZlbnQudG9waWMsXHJcbiAgICAgICAgdHJlbmRJZDogZXZlbnQudHJlbmRJZCxcclxuICAgICAgICBvcmlnaW5hbER1cmF0aW9uOiBldmVudC5tZXRhZGF0YS5kdXJhdGlvbi50b1N0cmluZygpXHJcbiAgICAgIH1cclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnTWVkaWFDb252ZXJ0IGpvYiBjcmVhdGVkJywgeyBcclxuICAgICAgam9iSWQ6IHJlc3BvbnNlLkpvYj8uSWQsXHJcbiAgICAgIG91dHB1dFMzS2V5IFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgam9iSWQ6IHJlc3BvbnNlLkpvYj8uSWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICBvdXRwdXRTM0tleVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ01lZGlhQ29udmVydCBqb2IgY3JlYXRpb24gZmFpbGVkJywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVZb3VUdWJlT3B0aW1pemVkSm9iU2V0dGluZ3MoXHJcbiAgaW5wdXRTM1VyaTogc3RyaW5nLFxyXG4gIG91dHB1dFMzVXJpOiBzdHJpbmcsXHJcbiAgYXVkaW9TM1VyaTogc3RyaW5nIHwgdW5kZWZpbmVkLFxyXG4gIHByb2Nlc3NpbmdDb25maWc6IGFueSxcclxuICBtZXRhZGF0YTogYW55XHJcbik6IGFueSB7XHJcbiAgY29uc3QgaW5wdXRzOiBhbnlbXSA9IFtcclxuICAgIHtcclxuICAgICAgRmlsZUlucHV0OiBpbnB1dFMzVXJpLFxyXG4gICAgICBWaWRlb1NlbGVjdG9yOiB7XHJcbiAgICAgICAgQ29sb3JTcGFjZTogJ1JFQ183MDknLFxyXG4gICAgICAgIENvbG9yU3BhY2VVc2FnZTogJ0ZPUkNFJ1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgXTtcclxuXHJcbiAgLy8gQWRkIGF1ZGlvIGlucHV0IGlmIGF2YWlsYWJsZVxyXG4gIGlmIChhdWRpb1MzVXJpKSB7XHJcbiAgICBpbnB1dHMucHVzaCh7XHJcbiAgICAgIEZpbGVJbnB1dDogYXVkaW9TM1VyaSxcclxuICAgICAgQXVkaW9TZWxlY3RvcnM6IHtcclxuICAgICAgICAnQXVkaW8gU2VsZWN0b3IgMSc6IHtcclxuICAgICAgICAgIERlZmF1bHRTZWxlY3Rpb246ICdERUZBVUxUJ1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgSW5wdXRzOiBpbnB1dHMsXHJcbiAgICBPdXRwdXRHcm91cHM6IFtcclxuICAgICAge1xyXG4gICAgICAgIE5hbWU6ICdZb3VUdWJlIE9wdGltaXplZCcsXHJcbiAgICAgICAgT3V0cHV0R3JvdXBTZXR0aW5nczoge1xyXG4gICAgICAgICAgVHlwZTogJ0ZJTEVfR1JPVVBfU0VUVElOR1MnLFxyXG4gICAgICAgICAgRmlsZUdyb3VwU2V0dGluZ3M6IHtcclxuICAgICAgICAgICAgRGVzdGluYXRpb246IG91dHB1dFMzVXJpLnJlcGxhY2UoL1xcL1teXFwvXSokLywgJy8nKSxcclxuICAgICAgICAgICAgRGVzdGluYXRpb25TZXR0aW5nczoge1xyXG4gICAgICAgICAgICAgIFMzU2V0dGluZ3M6IHtcclxuICAgICAgICAgICAgICAgIFN0b3JhZ2VDbGFzczogJ1NUQU5EQVJEJ1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgT3V0cHV0czogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBOYW1lTW9kaWZpZXI6ICdfeW91dHViZV9vcHRpbWl6ZWQnLFxyXG4gICAgICAgICAgICBWaWRlb0Rlc2NyaXB0aW9uOiB7XHJcbiAgICAgICAgICAgICAgQ29kZWNTZXR0aW5nczoge1xyXG4gICAgICAgICAgICAgICAgQ29kZWM6ICdIXzI2NCcsXHJcbiAgICAgICAgICAgICAgICBIMjY0U2V0dGluZ3M6IHtcclxuICAgICAgICAgICAgICAgICAgUmF0ZUNvbnRyb2xNb2RlOiAnQ0JSJyxcclxuICAgICAgICAgICAgICAgICAgQml0cmF0ZTogcGFyc2VJbnQocHJvY2Vzc2luZ0NvbmZpZy5iaXRyYXRlKSAqIDEwMDAsIC8vIENvbnZlcnQgdG8gYnBzXHJcbiAgICAgICAgICAgICAgICAgIE1heEJpdHJhdGU6IHBhcnNlSW50KHByb2Nlc3NpbmdDb25maWcuYml0cmF0ZSkgKiAxMjAwLFxyXG4gICAgICAgICAgICAgICAgICBQcm9maWxlOiAnSElHSCcsXHJcbiAgICAgICAgICAgICAgICAgIExldmVsOiAnTEVWRUxfNF8xJyxcclxuICAgICAgICAgICAgICAgICAgR29wU2l6ZTogMzAsXHJcbiAgICAgICAgICAgICAgICAgIEdvcFNpemVVbml0czogJ0ZSQU1FUycsXHJcbiAgICAgICAgICAgICAgICAgIEZyYW1lcmF0ZUNvbnRyb2w6ICdTUEVDSUZJRUQnLFxyXG4gICAgICAgICAgICAgICAgICBGcmFtZXJhdGVOdW1lcmF0b3I6IDMwLFxyXG4gICAgICAgICAgICAgICAgICBGcmFtZXJhdGVEZW5vbWluYXRvcjogMSxcclxuICAgICAgICAgICAgICAgICAgQ29sb3JNZXRhZGF0YTogJ0lOU0VSVCcsXHJcbiAgICAgICAgICAgICAgICAgIFRpbWVjb2RlSW5zZXJ0aW9uOiAnRElTQUJMRUQnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBXaWR0aDogcGFyc2VJbnQocHJvY2Vzc2luZ0NvbmZpZy5yZXNvbHV0aW9uLnNwbGl0KCd4JylbMF0pLFxyXG4gICAgICAgICAgICAgIEhlaWdodDogcGFyc2VJbnQocHJvY2Vzc2luZ0NvbmZpZy5yZXNvbHV0aW9uLnNwbGl0KCd4JylbMV0pLFxyXG4gICAgICAgICAgICAgIFJlc3BvbmRUb0FmZDogJ05PTkUnLFxyXG4gICAgICAgICAgICAgIFNjYWxpbmdCZWhhdmlvcjogJ0RFRkFVTFQnLFxyXG4gICAgICAgICAgICAgIFRpbWVjb2RlSW5zZXJ0aW9uOiAnRElTQUJMRUQnLFxyXG4gICAgICAgICAgICAgIEFudGlBbGlhczogJ0VOQUJMRUQnLFxyXG4gICAgICAgICAgICAgIFNoYXJwbmVzczogNTAsXHJcbiAgICAgICAgICAgICAgQWZkU2lnbmFsaW5nOiAnTk9ORScsXHJcbiAgICAgICAgICAgICAgRHJvcEZyYW1lVGltZWNvZGU6ICdFTkFCTEVEJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBBdWRpb0Rlc2NyaXB0aW9uczogYXVkaW9TM1VyaSA/IFtcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBBdWRpb1R5cGVDb250cm9sOiAnRk9MTE9XX0lOUFVUJyxcclxuICAgICAgICAgICAgICAgIEF1ZGlvU291cmNlTmFtZTogJ0F1ZGlvIFNlbGVjdG9yIDEnLFxyXG4gICAgICAgICAgICAgICAgQ29kZWNTZXR0aW5nczoge1xyXG4gICAgICAgICAgICAgICAgICBDb2RlYzogJ0FBQycsXHJcbiAgICAgICAgICAgICAgICAgIEFhY1NldHRpbmdzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgQXVkaW9EZXNjcmlwdGlvbkJyb2FkY2FzdGVyTWl4OiAnTk9STUFMJyxcclxuICAgICAgICAgICAgICAgICAgICBCaXRyYXRlOiAxMjgwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgUmF0ZUNvbnRyb2xNb2RlOiAnQ0JSJyxcclxuICAgICAgICAgICAgICAgICAgICBDb2RlY1Byb2ZpbGU6ICdMQycsXHJcbiAgICAgICAgICAgICAgICAgICAgQ29kaW5nTW9kZTogJ0NPRElOR19NT0RFXzJfMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgUmF3Rm9ybWF0OiAnTk9ORScsXHJcbiAgICAgICAgICAgICAgICAgICAgU2FtcGxlUmF0ZTogNDgwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgU3BlY2lmaWNhdGlvbjogJ01QRUc0J1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgTGFuZ3VhZ2VDb2RlQ29udHJvbDogJ0ZPTExPV19JTlBVVCdcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0gOiBbXSxcclxuICAgICAgICAgICAgQ29udGFpbmVyU2V0dGluZ3M6IHtcclxuICAgICAgICAgICAgICBDb250YWluZXI6ICdNUDQnLFxyXG4gICAgICAgICAgICAgIE1wNFNldHRpbmdzOiB7XHJcbiAgICAgICAgICAgICAgICBDc2xnQXRvbTogJ0lOQ0xVREUnLFxyXG4gICAgICAgICAgICAgICAgRnJlZVNwYWNlQm94OiAnRVhDTFVERScsXHJcbiAgICAgICAgICAgICAgICBNb292UGxhY2VtZW50OiAnUFJPR1JFU1NJVkVfRE9XTkxPQUQnXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9XHJcbiAgICBdLFxyXG4gICAgVGltZWNvZGVDb25maWc6IHtcclxuICAgICAgU291cmNlOiAnWkVST0JBU0VEJ1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JKb2JDb21wbGV0aW9uKGpvYklkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xyXG4gIGNvbnNvbGUubG9nKCdXYWl0aW5nIGZvciBNZWRpYUNvbnZlcnQgam9iIGNvbXBsZXRpb24nLCB7IGpvYklkIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBNZWRpYUNvbnZlcnRDbGllbnQsIEdldEpvYkNvbW1hbmQgfSA9IFxyXG4gICAgICBhd2FpdCBpbXBvcnQoJ0Bhd3Mtc2RrL2NsaWVudC1tZWRpYWNvbnZlcnQnKTtcclxuXHJcbiAgICBjb25zdCBtZWRpYUNvbnZlcnQgPSBuZXcgTWVkaWFDb252ZXJ0Q2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBtYXhXYWl0VGltZSA9IDIwICogNjAgKiAxMDAwOyAvLyAyMCBtaW51dGVzXHJcbiAgICBjb25zdCBwb2xsSW50ZXJ2YWwgPSAzMCAqIDEwMDA7IC8vIDMwIHNlY29uZHNcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCBtYXhXYWl0VGltZSkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IG1lZGlhQ29udmVydC5zZW5kKG5ldyBHZXRKb2JDb21tYW5kKHtcclxuICAgICAgICBJZDogam9iSWRcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3Qgc3RhdHVzID0gcmVzcG9uc2UuSm9iPy5TdGF0dXM7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdNZWRpYUNvbnZlcnQgam9iIHN0YXR1cycsIHsgam9iSWQsIHN0YXR1cyB9KTtcclxuXHJcbiAgICAgIGlmIChzdGF0dXMgPT09ICdDT01QTEVURScpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnTWVkaWFDb252ZXJ0IGpvYiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLkpvYjtcclxuICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09ICdFUlJPUicgfHwgc3RhdHVzID09PSAnQ0FOQ0VMRUQnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNZWRpYUNvbnZlcnQgam9iIGZhaWxlZCB3aXRoIHN0YXR1czogJHtzdGF0dXN9YCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFdhaXQgYmVmb3JlIG5leHQgcG9sbFxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgcG9sbEludGVydmFsKSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZWRpYUNvbnZlcnQgam9iIHRpbWVkIG91dCcpO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igd2FpdGluZyBmb3IgTWVkaWFDb252ZXJ0IGpvYicsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0UHJvY2Vzc2VkVmlkZW9NZXRhZGF0YShcclxuICBzM0tleTogc3RyaW5nLFxyXG4gIHByb2Nlc3NpbmdDb25maWc6IGFueVxyXG4pOiBQcm9taXNlPHtcclxuICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgZm9ybWF0OiBzdHJpbmc7XHJcbiAgcmVzb2x1dGlvbjogc3RyaW5nO1xyXG4gIGJpdHJhdGU6IHN0cmluZztcclxuICBhdWRpb0NoYW5uZWxzOiBudW1iZXI7XHJcbiAgaXNZb3VUdWJlT3B0aW1pemVkOiBib29sZWFuO1xyXG59PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgUzNDbGllbnQsIEhlYWRPYmplY3RDb21tYW5kIH0gPSBhd2FpdCBpbXBvcnQoJ0Bhd3Mtc2RrL2NsaWVudC1zMycpO1xyXG4gICAgXHJcbiAgICBjb25zdCBzMyA9IG5ldyBTM0NsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB9KTtcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzMy5zZW5kKG5ldyBIZWFkT2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgIEJ1Y2tldDogcHJvY2Vzcy5lbnYuVklERU9fQlVDS0VULFxyXG4gICAgICBLZXk6IHMzS2V5XHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gRXh0cmFjdCBtZXRhZGF0YSBmcm9tIFMzIG9iamVjdFxyXG4gICAgY29uc3QgZmlsZVNpemUgPSByZXNwb25zZS5Db250ZW50TGVuZ3RoIHx8IDA7XHJcbiAgICBjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLkNvbnRlbnRUeXBlIHx8ICd2aWRlby9tcDQnO1xyXG5cclxuICAgIC8vIENhbGN1bGF0ZSBkdXJhdGlvbiBmcm9tIGZpbGUgc2l6ZSBhbmQgYml0cmF0ZSAoYXBwcm94aW1hdGUpXHJcbiAgICBjb25zdCBiaXRyYXRlS2JwcyA9IHBhcnNlSW50KHByb2Nlc3NpbmdDb25maWc/LmJpdHJhdGUgfHwgJzgwMDAnKTtcclxuICAgIGNvbnN0IGVzdGltYXRlZER1cmF0aW9uID0gTWF0aC5yb3VuZCgoZmlsZVNpemUgKiA4KSAvIChiaXRyYXRlS2JwcyAqIDEwMDApKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkdXJhdGlvbjogZXN0aW1hdGVkRHVyYXRpb24sXHJcbiAgICAgIGZpbGVTaXplLFxyXG4gICAgICBmb3JtYXQ6ICdtcDQnLFxyXG4gICAgICByZXNvbHV0aW9uOiBwcm9jZXNzaW5nQ29uZmlnPy5yZXNvbHV0aW9uIHx8ICcxOTIweDEwODAnLFxyXG4gICAgICBiaXRyYXRlOiBgJHtiaXRyYXRlS2Jwc31rYCxcclxuICAgICAgYXVkaW9DaGFubmVsczogMixcclxuICAgICAgaXNZb3VUdWJlT3B0aW1pemVkOiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCBwcm9jZXNzZWQgdmlkZW8gbWV0YWRhdGEnLCBlcnJvcik7XHJcbiAgICBcclxuICAgIC8vIFJldHVybiBkZWZhdWx0IG1ldGFkYXRhIGlmIFMzIGNhbGwgZmFpbHNcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGR1cmF0aW9uOiAwLFxyXG4gICAgICBmaWxlU2l6ZTogMCxcclxuICAgICAgZm9ybWF0OiAnbXA0JyxcclxuICAgICAgcmVzb2x1dGlvbjogcHJvY2Vzc2luZ0NvbmZpZz8ucmVzb2x1dGlvbiB8fCAnMTkyMHgxMDgwJyxcclxuICAgICAgYml0cmF0ZTogcHJvY2Vzc2luZ0NvbmZpZz8uYml0cmF0ZSB8fCAnODAwMGsnLFxyXG4gICAgICBhdWRpb0NoYW5uZWxzOiAyLFxyXG4gICAgICBpc1lvdVR1YmVPcHRpbWl6ZWQ6IHRydWVcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjdWxhdGVQcm9jZXNzaW5nQ29zdChkdXJhdGlvblNlY29uZHM6IG51bWJlciwgcmVzb2x1dGlvbjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAvLyBNZWRpYUNvbnZlcnQgcHJpY2luZyAoYXBwcm94aW1hdGUpXHJcbiAgY29uc3QgZHVyYXRpb25NaW51dGVzID0gZHVyYXRpb25TZWNvbmRzIC8gNjA7XHJcbiAgXHJcbiAgLy8gUHJpY2luZyB2YXJpZXMgYnkgcmVzb2x1dGlvblxyXG4gIGNvbnN0IHByaWNlUGVyTWludXRlID0gcmVzb2x1dGlvbi5pbmNsdWRlcygnMTA4MCcpID8gMC4wMDc1IDogMC4wMDQ1OyAvLyBIRCB2cyBTRFxyXG4gIFxyXG4gIGNvbnN0IHByb2Nlc3NpbmdDb3N0ID0gZHVyYXRpb25NaW51dGVzICogcHJpY2VQZXJNaW51dGU7XHJcbiAgXHJcbiAgcmV0dXJuIE1hdGgucm91bmQocHJvY2Vzc2luZ0Nvc3QgKiAxMDApIC8gMTAwOyAvLyBSb3VuZCB0byAyIGRlY2ltYWwgcGxhY2VzXHJcbn0iXX0=