"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event, context) => {
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
        const generationCost = calculateGenerationCost(event.videoConfig.durationSeconds, event.videoConfig.includeAudio);
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
    }
    catch (error) {
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
exports.handler = handler;
async function generateVideo(event) {
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
            fileSize: event.videoConfig.durationSeconds * 1024 * 100,
            format: 'mp4'
        };
    }
    try {
        const { BedrockRuntimeClient, StartAsyncInvokeCommand, GetAsyncInvokeCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-bedrock-runtime'));
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
                    s3Uri: `s3://${process.env.VIDEO_BUCKET}/${s3OutputKey}`
                }
            }
        }));
        const jobId = startResponse.invocationArn;
        console.log('Bedrock job started', { jobId, s3OutputKey });
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
                // Get file metadata from S3
                const metadata = await getS3FileMetadata(s3OutputKey);
                return {
                    s3Key: s3OutputKey,
                    jobId,
                    duration: event.videoConfig.durationSeconds,
                    fileSize: metadata.size,
                    format: 'mp4'
                };
            }
            else if (statusResponse.status === 'Failed') {
                throw new Error(`Video generation failed: ${statusResponse.failureMessage || 'Unknown error'}`);
            }
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        throw new Error('Video generation timed out after 30 minutes');
    }
    catch (error) {
        console.error('Bedrock video generation failed', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('ValidationException')) {
                throw new Error('Invalid video generation parameters or AWS configuration');
            }
            else if (error.message.includes('AccessDeniedException')) {
                throw new Error('Insufficient permissions for Bedrock Nova Reel access');
            }
            else if (error.message.includes('ThrottlingException')) {
                throw new Error('Rate limit exceeded for Bedrock Nova Reel');
            }
        }
        throw error;
    }
}
async function generateAudio(event) {
    console.log('Starting audio generation with Amazon Polly');
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
        const { PollyClient, StartSpeechSynthesisTaskCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-polly'));
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
        // Generate SSML for better audio control
        const ssmlText = generateSSML(event.scriptPrompt, voiceSettings);
        // Validate required environment variables
        if (!process.env.VIDEO_BUCKET) {
            throw new Error('VIDEO_BUCKET environment variable is required');
        }
        const response = await polly.send(new StartSpeechSynthesisTaskCommand({
            Text: ssmlText,
            TextType: 'ssml',
            VoiceId: voiceSettings.voiceId,
            OutputFormat: 'mp3',
            Engine: 'neural',
            OutputS3BucketName: process.env.VIDEO_BUCKET,
            OutputS3KeyPrefix: `audio/${event.topic}/`,
            SampleRate: '24000'
        }));
        console.log('Polly job started', {
            taskId: response.SynthesisTask?.TaskId,
            s3OutputKey,
            voiceId: voiceSettings.voiceId
        });
        return {
            s3Key: s3OutputKey,
            jobId: response.SynthesisTask?.TaskId || 'unknown'
        };
    }
    catch (error) {
        console.error('Polly audio generation failed', error);
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('InvalidParameterValue')) {
                throw new Error('Invalid audio generation parameters');
            }
            else if (error.message.includes('AccessDeniedException')) {
                throw new Error('Insufficient permissions for Amazon Polly access');
            }
            else if (error.message.includes('ThrottlingException')) {
                throw new Error('Rate limit exceeded for Amazon Polly');
            }
        }
        throw error;
    }
}
function enhancePromptForTopic(basePrompt, topic) {
    const topicEnhancements = {
        investing: `${basePrompt} Focus on creating visually engaging content about financial markets, 
      stock charts, investment portfolios, and economic indicators. Include graphics showing 
      ETF performance, dividend yields, and market trends. Make it professional yet accessible.`,
        education: `${basePrompt} Create educational visuals with clear diagrams, study materials, 
      learning environments, and academic success imagery. Include books, digital learning tools, 
      and inspiring educational settings.`,
        tourism: `${basePrompt} Showcase beautiful travel destinations, cultural landmarks, 
      local experiences, and adventure activities. Include stunning landscapes, city views, 
      cultural sites, and travel-related imagery.`,
        technology: `${basePrompt} Feature cutting-edge technology, digital interfaces, 
      innovation labs, and futuristic concepts. Include gadgets, software interfaces, 
      and tech environments.`,
        health: `${basePrompt} Show healthy lifestyle imagery, medical concepts, wellness activities, 
      and health-focused environments. Include fitness, nutrition, and medical imagery.`
    };
    return topicEnhancements[topic.toLowerCase()] || basePrompt;
}
function getTopicVoiceSettings(topic, audioConfig) {
    const topicVoices = {
        investing: { voiceId: 'Matthew', rate: 'medium', pitch: 'medium' },
        education: { voiceId: 'Joanna', rate: 'medium', pitch: 'medium' },
        tourism: { voiceId: 'Amy', rate: 'medium', pitch: '+2%' },
        technology: { voiceId: 'Brian', rate: 'medium', pitch: 'medium' },
        health: { voiceId: 'Kimberly', rate: 'slow', pitch: 'medium' } // Calm, reassuring voice
    };
    return topicVoices[topic.toLowerCase()] || topicVoices.education;
}
function generateSSML(text, voiceSettings) {
    return `
    <speak>
      <prosody rate="${voiceSettings.rate}" pitch="${voiceSettings.pitch}">
        <break time="1s"/>
        ${text}
        <break time="2s"/>
      </prosody>
    </speak>
  `.trim();
}
async function getS3FileMetadata(s3Key) {
    // Mock mode for testing
    if (process.env.MOCK_VIDEO_GENERATION === 'true') {
        // Estimate file size based on duration (rough approximation)
        const estimatedSize = 1024 * 1024 * 5; // 5MB default
        return { size: estimatedSize };
    }
    try {
        const { S3Client, HeadObjectCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-s3'));
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
    }
    catch (error) {
        console.error('Failed to get S3 metadata', { key: s3Key, error });
        // Return estimated size if metadata retrieval fails
        return { size: 1024 * 1024 * 5 }; // 5MB estimate
    }
}
function calculateGenerationCost(durationSeconds, includeAudio) {
    // Bedrock Nova Reel pricing (approximate)
    const videoCostPerSecond = 0.80 / 60; // $0.80 per minute
    const videoCost = (durationSeconds / 60) * 0.80;
    // Polly pricing (approximate)
    const audioCost = includeAudio ? (durationSeconds * 0.000004) : 0; // $4 per 1M characters
    return Math.round((videoCost + audioCost) * 100) / 100; // Round to 2 decimal places
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFxQ08sTUFBTSxPQUFPLEdBQXlELEtBQUssRUFDaEYsS0FBMEIsRUFDMUIsT0FBZ0IsRUFDaUIsRUFBRTtJQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRTtRQUM1QyxTQUFTLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDL0IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1FBQ2xCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztRQUN0QixRQUFRLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxlQUFlO0tBQzVDLENBQUMsQ0FBQztJQUVILElBQUk7UUFDRixnREFBZ0Q7UUFDaEQsTUFBTSxXQUFXLEdBQUcsTUFBTSxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFL0Msd0NBQXdDO1FBQ3hDLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFO1lBQ2xDLFdBQVcsR0FBRyxNQUFNLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMxQztRQUVELGtCQUFrQjtRQUNsQixNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FDNUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQ2pDLEtBQUssQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUMvQixDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsRUFBRTtZQUNyRCxVQUFVLEVBQUUsV0FBVyxDQUFDLEtBQUs7WUFDN0IsVUFBVSxFQUFFLFdBQVcsRUFBRSxLQUFLO1lBQzlCLFFBQVEsRUFBRSxXQUFXLENBQUMsUUFBUTtZQUM5QixJQUFJLEVBQUUsY0FBYztZQUNwQixhQUFhLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFB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QVEsQ0FBQyxhQUFhO1lBQzVCLFlBQVksRUFBRSxRQUFRLENBQUMsWUFBWTtTQUNwQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLElBQUksQ0FBQztTQUNsQyxDQUFDO0tBQ0g7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFbEUsb0RBQW9EO1FBQ3BELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWU7S0FDbEQ7QUFDSCxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxlQUF1QixFQUFFLFlBQXFCO0lBQzdFLDBDQUEwQztJQUMxQyxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxtQkFBbUI7SUFDekQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRWhELDhCQUE4QjtJQUM5QixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBdUI7SUFFMUYsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLDRCQUE0QjtBQUN0RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSGFuZGxlciwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWaWRlb0dlbmVyYXRvckV2ZW50IHtcclxuICBzY3JpcHRQcm9tcHQ6IHN0cmluZztcclxuICB0b3BpYzogc3RyaW5nO1xyXG4gIHRyZW5kSWQ6IHN0cmluZztcclxuICB2aWRlb0NvbmZpZzoge1xyXG4gICAgZHVyYXRpb25TZWNvbmRzOiBudW1iZXI7XHJcbiAgICBmcHM6IG51bWJlcjtcclxuICAgIGRpbWVuc2lvbjogc3RyaW5nO1xyXG4gICAgcXVhbGl0eTogc3RyaW5nO1xyXG4gICAgaW5jbHVkZUF1ZGlvOiBib29sZWFuO1xyXG4gIH07XHJcbiAgYXVkaW9Db25maWc/OiB7XHJcbiAgICB2b2ljZTogc3RyaW5nO1xyXG4gICAgc3BlZWQ6IHN0cmluZztcclxuICAgIGxhbmd1YWdlOiBzdHJpbmc7XHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWaWRlb0dlbmVyYXRvclJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIHZpZGVvUzNLZXk/OiBzdHJpbmc7XHJcbiAgYXVkaW9TM0tleT86IHN0cmluZztcclxuICBiZWRyb2NrSm9iSWQ/OiBzdHJpbmc7XHJcbiAgcG9sbHlKb2JJZD86IHN0cmluZztcclxuICBtZXRhZGF0YToge1xyXG4gICAgZHVyYXRpb246IG51bWJlcjtcclxuICAgIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgICBmb3JtYXQ6IHN0cmluZztcclxuICAgIGhhc0F1ZGlvOiBib29sZWFuO1xyXG4gIH07XHJcbiAgZ2VuZXJhdGlvbkNvc3Q6IG51bWJlcjtcclxuICBleGVjdXRpb25UaW1lOiBudW1iZXI7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBIYW5kbGVyPFZpZGVvR2VuZXJhdG9yRXZlbnQsIFZpZGVvR2VuZXJhdG9yUmVzcG9uc2U+ID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBWaWRlb0dlbmVyYXRvckV2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTxWaWRlb0dlbmVyYXRvclJlc3BvbnNlPiA9PiB7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBcclxuICBjb25zb2xlLmxvZygnVmlkZW8gR2VuZXJhdG9yIExhbWJkYSBzdGFydGVkJywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIHRvcGljOiBldmVudC50b3BpYyxcclxuICAgIHRyZW5kSWQ6IGV2ZW50LnRyZW5kSWQsXHJcbiAgICBkdXJhdGlvbjogZXZlbnQudmlkZW9Db25maWcuZHVyYXRpb25TZWNvbmRzXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBHZW5lcmF0ZSB2aWRlbyB1c2luZyBBbWF6b24gQmVkcm9jayBOb3ZhIFJlZWxcclxuICAgIGNvbnN0IHZpZGVvUmVzdWx0ID0gYXdhaXQgZ2VuZXJhdGVWaWRlbyhldmVudCk7XHJcbiAgICBcclxuICAgIC8vIEdlbmVyYXRlIGF1ZGlvIG5hcnJhdGlvbiBpZiByZXF1ZXN0ZWRcclxuICAgIGxldCBhdWRpb1Jlc3VsdCA9IG51bGw7XHJcbiAgICBpZiAoZXZlbnQudmlkZW9Db25maWcuaW5jbHVkZUF1ZGlvKSB7XHJcbiAgICAgIGF1ZGlvUmVzdWx0ID0gYXdhaXQgZ2VuZXJhdGVBdWRpbyhldmVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGNvc3RzXHJcbiAgICBjb25zdCBnZW5lcmF0aW9uQ29zdCA9IGNhbGN1bGF0ZUdlbmVyYXRpb25Db3N0KFxyXG4gICAgICBldmVudC52aWRlb0NvbmZpZy5kdXJhdGlvblNlY29uZHMsXHJcbiAgICAgIGV2ZW50LnZpZGVvQ29uZmlnLmluY2x1ZGVBdWRpb1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnVmlkZW8gZ2VuZXJhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICB2aWRlb1MzS2V5OiB2aWRlb1Jlc3VsdC5zM0tleSxcclxuICAgICAgYXVkaW9TM0tleTogYXVkaW9SZXN1bHQ/LnMzS2V5LFxyXG4gICAgICBkdXJhdGlvbjogdmlkZW9SZXN1bHQuZHVyYXRpb24sXHJcbiAgICAgIGNvc3Q6IGdlbmVyYXRpb25Db3N0LFxyXG4gICAgICBleGVjdXRpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICB2aWRlb1MzS2V5OiB2aWRlb1Jlc3VsdC5zM0tleSxcclxuICAgICAgYXVkaW9TM0tleTogYXVkaW9SZXN1bHQ/LnMzS2V5LFxyXG4gICAgICBiZWRyb2NrSm9iSWQ6IHZpZGVvUmVzdWx0LmpvYklkLFxyXG4gICAgICBwb2xseUpvYklkOiBhdWRpb1Jlc3VsdD8uam9iSWQsXHJcbiAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgZHVyYXRpb246IHZpZGVvUmVzdWx0LmR1cmF0aW9uLFxyXG4gICAgICAgIGZpbGVTaXplOiB2aWRlb1Jlc3VsdC5maWxlU2l6ZSxcclxuICAgICAgICBmb3JtYXQ6IHZpZGVvUmVzdWx0LmZvcm1hdCxcclxuICAgICAgICBoYXNBdWRpbzogISFhdWRpb1Jlc3VsdFxyXG4gICAgICB9LFxyXG4gICAgICBnZW5lcmF0aW9uQ29zdCxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1ZpZGVvIGdlbmVyYXRpb24gZmFpbGVkJywge1xyXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICBzdGFjazogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrIDogdW5kZWZpbmVkLFxyXG4gICAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICBkdXJhdGlvbjogMCxcclxuICAgICAgICBmaWxlU2l6ZTogMCxcclxuICAgICAgICBmb3JtYXQ6ICcnLFxyXG4gICAgICAgIGhhc0F1ZGlvOiBmYWxzZVxyXG4gICAgICB9LFxyXG4gICAgICBnZW5lcmF0aW9uQ29zdDogMCxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVZpZGVvKGV2ZW50OiBWaWRlb0dlbmVyYXRvckV2ZW50KTogUHJvbWlzZTx7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICBqb2JJZDogc3RyaW5nO1xyXG4gIGR1cmF0aW9uOiBudW1iZXI7XHJcbiAgZmlsZVNpemU6IG51bWJlcjtcclxuICBmb3JtYXQ6IHN0cmluZztcclxufT4ge1xyXG4gIGNvbnNvbGUubG9nKCdTdGFydGluZyB2aWRlbyBnZW5lcmF0aW9uIHdpdGggQmVkcm9jayBOb3ZhIFJlZWwnKTtcclxuXHJcbiAgLy8gRW5oYW5jZWQgc2NyaXB0IHByb21wdCB3aXRoIHRvcGljLXNwZWNpZmljIGluc3RydWN0aW9uc1xyXG4gIGNvbnN0IGVuaGFuY2VkUHJvbXB0ID0gZW5oYW5jZVByb21wdEZvclRvcGljKGV2ZW50LnNjcmlwdFByb21wdCwgZXZlbnQudG9waWMpO1xyXG5cclxuICAvLyBNb2NrIG1vZGUgZm9yIHRlc3RpbmdcclxuICBpZiAocHJvY2Vzcy5lbnYuTU9DS19WSURFT19HRU5FUkFUSU9OID09PSAndHJ1ZScpIHtcclxuICAgIGNvbnNvbGUubG9nKCdNb2NrIG1vZGU6IFNpbXVsYXRpbmcgdmlkZW8gZ2VuZXJhdGlvbicpO1xyXG4gICAgY29uc3QgczNPdXRwdXRLZXkgPSBgdmlkZW9zLyR7ZXZlbnQudG9waWN9LyR7ZXZlbnQudHJlbmRJZH1fJHtEYXRlLm5vdygpfS5tcDRgO1xyXG4gICAgXHJcbiAgICAvLyBTaW11bGF0ZSBwcm9jZXNzaW5nIHRpbWVcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDAwKSk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHMzS2V5OiBzM091dHB1dEtleSxcclxuICAgICAgam9iSWQ6IGBtb2NrLWpvYi0ke0RhdGUubm93KCl9YCxcclxuICAgICAgZHVyYXRpb246IGV2ZW50LnZpZGVvQ29uZmlnLmR1cmF0aW9uU2Vjb25kcyxcclxuICAgICAgZmlsZVNpemU6IGV2ZW50LnZpZGVvQ29uZmlnLmR1cmF0aW9uU2Vjb25kcyAqIDEwMjQgKiAxMDAsIC8vIEVzdGltYXRlIH4xMDBLQiBwZXIgc2Vjb25kXHJcbiAgICAgIGZvcm1hdDogJ21wNCdcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBCZWRyb2NrUnVudGltZUNsaWVudCwgU3RhcnRBc3luY0ludm9rZUNvbW1hbmQsIEdldEFzeW5jSW52b2tlQ29tbWFuZCB9ID0gXHJcbiAgICAgIGF3YWl0IGltcG9ydCgnQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZScpO1xyXG5cclxuICAgIGNvbnN0IGJlZHJvY2sgPSBuZXcgQmVkcm9ja1J1bnRpbWVDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHMzT3V0cHV0S2V5ID0gYHZpZGVvcy8ke2V2ZW50LnRvcGljfS8ke2V2ZW50LnRyZW5kSWR9XyR7RGF0ZS5ub3coKX0ubXA0YDtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgIGlmICghcHJvY2Vzcy5lbnYuVklERU9fQlVDS0VUKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignVklERU9fQlVDS0VUIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RhcnQgYXN5bmMgdmlkZW8gZ2VuZXJhdGlvbiB3aXRoIGltcHJvdmVkIGVycm9yIGhhbmRsaW5nXHJcbiAgICBjb25zdCBzdGFydFJlc3BvbnNlID0gYXdhaXQgYmVkcm9jay5zZW5kKG5ldyBTdGFydEFzeW5jSW52b2tlQ29tbWFuZCh7XHJcbiAgICAgIG1vZGVsSWQ6ICdhbWF6b24ubm92YS1yZWVsLXYxOjAnLFxyXG4gICAgICBtb2RlbElucHV0OiB7XHJcbiAgICAgICAgdGFza1R5cGU6ICdURVhUX1ZJREVPJyxcclxuICAgICAgICB0ZXh0VG9WaWRlb1BhcmFtczoge1xyXG4gICAgICAgICAgdGV4dDogZW5oYW5jZWRQcm9tcHRcclxuICAgICAgICB9LFxyXG4gICAgICAgIHZpZGVvR2VuZXJhdGlvbkNvbmZpZzoge1xyXG4gICAgICAgICAgZnBzOiBldmVudC52aWRlb0NvbmZpZy5mcHMsXHJcbiAgICAgICAgICBkdXJhdGlvblNlY29uZHM6IGV2ZW50LnZpZGVvQ29uZmlnLmR1cmF0aW9uU2Vjb25kcyxcclxuICAgICAgICAgIGRpbWVuc2lvbjogZXZlbnQudmlkZW9Db25maWcuZGltZW5zaW9uLFxyXG4gICAgICAgICAgc2VlZDogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMCkgLy8gUmFuZG9tIHNlZWQgZm9yIHZhcmlldHlcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIG91dHB1dERhdGFDb25maWc6IHtcclxuICAgICAgICBzM091dHB1dERhdGFDb25maWc6IHtcclxuICAgICAgICAgIHMzVXJpOiBgczM6Ly8ke3Byb2Nlc3MuZW52LlZJREVPX0JVQ0tFVH0vJHtzM091dHB1dEtleX1gXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KSk7XHJcblxyXG4gICAgY29uc3Qgam9iSWQgPSBzdGFydFJlc3BvbnNlLmludm9jYXRpb25Bcm4hO1xyXG4gICAgY29uc29sZS5sb2coJ0JlZHJvY2sgam9iIHN0YXJ0ZWQnLCB7IGpvYklkLCBzM091dHB1dEtleSB9KTtcclxuXHJcbiAgICAvLyBQb2xsIGZvciBjb21wbGV0aW9uICh3aXRoIHRpbWVvdXQpXHJcbiAgICBjb25zdCBtYXhXYWl0VGltZSA9IDMwICogNjAgKiAxMDAwOyAvLyAzMCBtaW51dGVzXHJcbiAgICBjb25zdCBwb2xsSW50ZXJ2YWwgPSAzMCAqIDEwMDA7IC8vIDMwIHNlY29uZHNcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCBtYXhXYWl0VGltZSkge1xyXG4gICAgICBjb25zdCBzdGF0dXNSZXNwb25zZSA9IGF3YWl0IGJlZHJvY2suc2VuZChuZXcgR2V0QXN5bmNJbnZva2VDb21tYW5kKHtcclxuICAgICAgICBpbnZvY2F0aW9uQXJuOiBqb2JJZFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnSm9iIHN0YXR1czonLCBzdGF0dXNSZXNwb25zZS5zdGF0dXMpO1xyXG5cclxuICAgICAgaWYgKHN0YXR1c1Jlc3BvbnNlLnN0YXR1cyA9PT0gJ0NvbXBsZXRlZCcpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnVmlkZW8gZ2VuZXJhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gR2V0IGZpbGUgbWV0YWRhdGEgZnJvbSBTM1xyXG4gICAgICAgIGNvbnN0IG1ldGFkYXRhID0gYXdhaXQgZ2V0UzNGaWxlTWV0YWRhdGEoczNPdXRwdXRLZXkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzM0tleTogczNPdXRwdXRLZXksXHJcbiAgICAgICAgICBqb2JJZCxcclxuICAgICAgICAgIGR1cmF0aW9uOiBldmVudC52aWRlb0NvbmZpZy5kdXJhdGlvblNlY29uZHMsXHJcbiAgICAgICAgICBmaWxlU2l6ZTogbWV0YWRhdGEuc2l6ZSxcclxuICAgICAgICAgIGZvcm1hdDogJ21wNCdcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2UgaWYgKHN0YXR1c1Jlc3BvbnNlLnN0YXR1cyA9PT0gJ0ZhaWxlZCcpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZpZGVvIGdlbmVyYXRpb24gZmFpbGVkOiAke3N0YXR1c1Jlc3BvbnNlLmZhaWx1cmVNZXNzYWdlIHx8ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gV2FpdCBiZWZvcmUgbmV4dCBwb2xsXHJcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBwb2xsSW50ZXJ2YWwpKTtcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZGVvIGdlbmVyYXRpb24gdGltZWQgb3V0IGFmdGVyIDMwIG1pbnV0ZXMnKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0JlZHJvY2sgdmlkZW8gZ2VuZXJhdGlvbiBmYWlsZWQnLCBlcnJvcik7XHJcbiAgICBcclxuICAgIC8vIFByb3ZpZGUgbW9yZSBzcGVjaWZpYyBlcnJvciBtZXNzYWdlc1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ1ZhbGlkYXRpb25FeGNlcHRpb24nKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2aWRlbyBnZW5lcmF0aW9uIHBhcmFtZXRlcnMgb3IgQVdTIGNvbmZpZ3VyYXRpb24nKTtcclxuICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdBY2Nlc3NEZW5pZWRFeGNlcHRpb24nKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW5zdWZmaWNpZW50IHBlcm1pc3Npb25zIGZvciBCZWRyb2NrIE5vdmEgUmVlbCBhY2Nlc3MnKTtcclxuICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdUaHJvdHRsaW5nRXhjZXB0aW9uJykpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JhdGUgbGltaXQgZXhjZWVkZWQgZm9yIEJlZHJvY2sgTm92YSBSZWVsJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUF1ZGlvKGV2ZW50OiBWaWRlb0dlbmVyYXRvckV2ZW50KTogUHJvbWlzZTx7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICBqb2JJZDogc3RyaW5nO1xyXG59PiB7XHJcbiAgY29uc29sZS5sb2coJ1N0YXJ0aW5nIGF1ZGlvIGdlbmVyYXRpb24gd2l0aCBBbWF6b24gUG9sbHknKTtcclxuXHJcbiAgLy8gTW9jayBtb2RlIGZvciB0ZXN0aW5nXHJcbiAgaWYgKHByb2Nlc3MuZW52Lk1PQ0tfVklERU9fR0VORVJBVElPTiA9PT0gJ3RydWUnKSB7XHJcbiAgICBjb25zb2xlLmxvZygnTW9jayBtb2RlOiBTaW11bGF0aW5nIGF1ZGlvIGdlbmVyYXRpb24nKTtcclxuICAgIGNvbnN0IHMzT3V0cHV0S2V5ID0gYGF1ZGlvLyR7ZXZlbnQudG9waWN9LyR7ZXZlbnQudHJlbmRJZH1fJHtEYXRlLm5vdygpfS5tcDNgO1xyXG4gICAgXHJcbiAgICAvLyBTaW11bGF0ZSBwcm9jZXNzaW5nIHRpbWVcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHMzS2V5OiBzM091dHB1dEtleSxcclxuICAgICAgam9iSWQ6IGBtb2NrLWF1ZGlvLWpvYi0ke0RhdGUubm93KCl9YFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IFBvbGx5Q2xpZW50LCBTdGFydFNwZWVjaFN5bnRoZXNpc1Rhc2tDb21tYW5kIH0gPSBcclxuICAgICAgYXdhaXQgaW1wb3J0KCdAYXdzLXNkay9jbGllbnQtcG9sbHknKTtcclxuXHJcbiAgICBjb25zdCBwb2xseSA9IG5ldyBQb2xseUNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYXVkaW9Db25maWcgPSBldmVudC5hdWRpb0NvbmZpZyB8fCB7XHJcbiAgICAgIHZvaWNlOiAnTWF0dGhldycsXHJcbiAgICAgIHNwZWVkOiAnbWVkaXVtJyxcclxuICAgICAgbGFuZ3VhZ2U6ICdlbi1VUydcclxuICAgIH07XHJcblxyXG4gICAgLy8gR2V0IHRvcGljLXNwZWNpZmljIHZvaWNlIHNldHRpbmdzXHJcbiAgICBjb25zdCB2b2ljZVNldHRpbmdzID0gZ2V0VG9waWNWb2ljZVNldHRpbmdzKGV2ZW50LnRvcGljLCBhdWRpb0NvbmZpZyk7XHJcbiAgICBcclxuICAgIGNvbnN0IHMzT3V0cHV0S2V5ID0gYGF1ZGlvLyR7ZXZlbnQudG9waWN9LyR7ZXZlbnQudHJlbmRJZH1fJHtEYXRlLm5vdygpfS5tcDNgO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIFNTTUwgZm9yIGJldHRlciBhdWRpbyBjb250cm9sXHJcbiAgICBjb25zdCBzc21sVGV4dCA9IGdlbmVyYXRlU1NNTChldmVudC5zY3JpcHRQcm9tcHQsIHZvaWNlU2V0dGluZ3MpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlc1xyXG4gICAgaWYgKCFwcm9jZXNzLmVudi5WSURFT19CVUNLRVQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdWSURFT19CVUNLRVQgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBvbGx5LnNlbmQobmV3IFN0YXJ0U3BlZWNoU3ludGhlc2lzVGFza0NvbW1hbmQoe1xyXG4gICAgICBUZXh0OiBzc21sVGV4dCxcclxuICAgICAgVGV4dFR5cGU6ICdzc21sJyxcclxuICAgICAgVm9pY2VJZDogdm9pY2VTZXR0aW5ncy52b2ljZUlkIGFzIGFueSxcclxuICAgICAgT3V0cHV0Rm9ybWF0OiAnbXAzJyxcclxuICAgICAgRW5naW5lOiAnbmV1cmFsJyxcclxuICAgICAgT3V0cHV0UzNCdWNrZXROYW1lOiBwcm9jZXNzLmVudi5WSURFT19CVUNLRVQsXHJcbiAgICAgIE91dHB1dFMzS2V5UHJlZml4OiBgYXVkaW8vJHtldmVudC50b3BpY30vYCxcclxuICAgICAgU2FtcGxlUmF0ZTogJzI0MDAwJ1xyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdQb2xseSBqb2Igc3RhcnRlZCcsIHsgXHJcbiAgICAgIHRhc2tJZDogcmVzcG9uc2UuU3ludGhlc2lzVGFzaz8uVGFza0lkLFxyXG4gICAgICBzM091dHB1dEtleSxcclxuICAgICAgdm9pY2VJZDogdm9pY2VTZXR0aW5ncy52b2ljZUlkXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzM0tleTogczNPdXRwdXRLZXksXHJcbiAgICAgIGpvYklkOiByZXNwb25zZS5TeW50aGVzaXNUYXNrPy5UYXNrSWQgfHwgJ3Vua25vd24nXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignUG9sbHkgYXVkaW8gZ2VuZXJhdGlvbiBmYWlsZWQnLCBlcnJvcik7XHJcbiAgICBcclxuICAgIC8vIFByb3ZpZGUgbW9yZSBzcGVjaWZpYyBlcnJvciBtZXNzYWdlc1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ0ludmFsaWRQYXJhbWV0ZXJWYWx1ZScpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGF1ZGlvIGdlbmVyYXRpb24gcGFyYW1ldGVycycpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ0FjY2Vzc0RlbmllZEV4Y2VwdGlvbicpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnN1ZmZpY2llbnQgcGVybWlzc2lvbnMgZm9yIEFtYXpvbiBQb2xseSBhY2Nlc3MnKTtcclxuICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdUaHJvdHRsaW5nRXhjZXB0aW9uJykpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JhdGUgbGltaXQgZXhjZWVkZWQgZm9yIEFtYXpvbiBQb2xseScpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZW5oYW5jZVByb21wdEZvclRvcGljKGJhc2VQcm9tcHQ6IHN0cmluZywgdG9waWM6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgdG9waWNFbmhhbmNlbWVudHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICBpbnZlc3Rpbmc6IGAke2Jhc2VQcm9tcHR9IEZvY3VzIG9uIGNyZWF0aW5nIHZpc3VhbGx5IGVuZ2FnaW5nIGNvbnRlbnQgYWJvdXQgZmluYW5jaWFsIG1hcmtldHMsIFxyXG4gICAgICBzdG9jayBjaGFydHMsIGludmVzdG1lbnQgcG9ydGZvbGlvcywgYW5kIGVjb25vbWljIGluZGljYXRvcnMuIEluY2x1ZGUgZ3JhcGhpY3Mgc2hvd2luZyBcclxuICAgICAgRVRGIHBlcmZvcm1hbmNlLCBkaXZpZGVuZCB5aWVsZHMsIGFuZCBtYXJrZXQgdHJlbmRzLiBNYWtlIGl0IHByb2Zlc3Npb25hbCB5ZXQgYWNjZXNzaWJsZS5gLFxyXG4gICAgXHJcbiAgICBlZHVjYXRpb246IGAke2Jhc2VQcm9tcHR9IENyZWF0ZSBlZHVjYXRpb25hbCB2aXN1YWxzIHdpdGggY2xlYXIgZGlhZ3JhbXMsIHN0dWR5IG1hdGVyaWFscywgXHJcbiAgICAgIGxlYXJuaW5nIGVudmlyb25tZW50cywgYW5kIGFjYWRlbWljIHN1Y2Nlc3MgaW1hZ2VyeS4gSW5jbHVkZSBib29rcywgZGlnaXRhbCBsZWFybmluZyB0b29scywgXHJcbiAgICAgIGFuZCBpbnNwaXJpbmcgZWR1Y2F0aW9uYWwgc2V0dGluZ3MuYCxcclxuICAgIFxyXG4gICAgdG91cmlzbTogYCR7YmFzZVByb21wdH0gU2hvd2Nhc2UgYmVhdXRpZnVsIHRyYXZlbCBkZXN0aW5hdGlvbnMsIGN1bHR1cmFsIGxhbmRtYXJrcywgXHJcbiAgICAgIGxvY2FsIGV4cGVyaWVuY2VzLCBhbmQgYWR2ZW50dXJlIGFjdGl2aXRpZXMuIEluY2x1ZGUgc3R1bm5pbmcgbGFuZHNjYXBlcywgY2l0eSB2aWV3cywgXHJcbiAgICAgIGN1bHR1cmFsIHNpdGVzLCBhbmQgdHJhdmVsLXJlbGF0ZWQgaW1hZ2VyeS5gLFxyXG4gICAgXHJcbiAgICB0ZWNobm9sb2d5OiBgJHtiYXNlUHJvbXB0fSBGZWF0dXJlIGN1dHRpbmctZWRnZSB0ZWNobm9sb2d5LCBkaWdpdGFsIGludGVyZmFjZXMsIFxyXG4gICAgICBpbm5vdmF0aW9uIGxhYnMsIGFuZCBmdXR1cmlzdGljIGNvbmNlcHRzLiBJbmNsdWRlIGdhZGdldHMsIHNvZnR3YXJlIGludGVyZmFjZXMsIFxyXG4gICAgICBhbmQgdGVjaCBlbnZpcm9ubWVudHMuYCxcclxuICAgIFxyXG4gICAgaGVhbHRoOiBgJHtiYXNlUHJvbXB0fSBTaG93IGhlYWx0aHkgbGlmZXN0eWxlIGltYWdlcnksIG1lZGljYWwgY29uY2VwdHMsIHdlbGxuZXNzIGFjdGl2aXRpZXMsIFxyXG4gICAgICBhbmQgaGVhbHRoLWZvY3VzZWQgZW52aXJvbm1lbnRzLiBJbmNsdWRlIGZpdG5lc3MsIG51dHJpdGlvbiwgYW5kIG1lZGljYWwgaW1hZ2VyeS5gXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHRvcGljRW5oYW5jZW1lbnRzW3RvcGljLnRvTG93ZXJDYXNlKCldIHx8IGJhc2VQcm9tcHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFRvcGljVm9pY2VTZXR0aW5ncyh0b3BpYzogc3RyaW5nLCBhdWRpb0NvbmZpZzogYW55KToge1xyXG4gIHZvaWNlSWQ6IHN0cmluZztcclxuICByYXRlOiBzdHJpbmc7XHJcbiAgcGl0Y2g6IHN0cmluZztcclxufSB7XHJcbiAgY29uc3QgdG9waWNWb2ljZXM6IFJlY29yZDxzdHJpbmcsIHsgdm9pY2VJZDogc3RyaW5nOyByYXRlOiBzdHJpbmc7IHBpdGNoOiBzdHJpbmcgfT4gPSB7XHJcbiAgICBpbnZlc3Rpbmc6IHsgdm9pY2VJZDogJ01hdHRoZXcnLCByYXRlOiAnbWVkaXVtJywgcGl0Y2g6ICdtZWRpdW0nIH0sIC8vIFByb2Zlc3Npb25hbCBtYWxlIHZvaWNlXHJcbiAgICBlZHVjYXRpb246IHsgdm9pY2VJZDogJ0pvYW5uYScsIHJhdGU6ICdtZWRpdW0nLCBwaXRjaDogJ21lZGl1bScgfSwgLy8gQ2xlYXIgZmVtYWxlIHZvaWNlXHJcbiAgICB0b3VyaXNtOiB7IHZvaWNlSWQ6ICdBbXknLCByYXRlOiAnbWVkaXVtJywgcGl0Y2g6ICcrMiUnIH0sIC8vIEVudGh1c2lhc3RpYyBCcml0aXNoIHZvaWNlXHJcbiAgICB0ZWNobm9sb2d5OiB7IHZvaWNlSWQ6ICdCcmlhbicsIHJhdGU6ICdtZWRpdW0nLCBwaXRjaDogJ21lZGl1bScgfSwgLy8gVGVjaC1mb2N1c2VkIG1hbGUgdm9pY2VcclxuICAgIGhlYWx0aDogeyB2b2ljZUlkOiAnS2ltYmVybHknLCByYXRlOiAnc2xvdycsIHBpdGNoOiAnbWVkaXVtJyB9IC8vIENhbG0sIHJlYXNzdXJpbmcgdm9pY2VcclxuICB9O1xyXG5cclxuICByZXR1cm4gdG9waWNWb2ljZXNbdG9waWMudG9Mb3dlckNhc2UoKV0gfHwgdG9waWNWb2ljZXMuZWR1Y2F0aW9uO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVNTTUwodGV4dDogc3RyaW5nLCB2b2ljZVNldHRpbmdzOiBhbnkpOiBzdHJpbmcge1xyXG4gIHJldHVybiBgXHJcbiAgICA8c3BlYWs+XHJcbiAgICAgIDxwcm9zb2R5IHJhdGU9XCIke3ZvaWNlU2V0dGluZ3MucmF0ZX1cIiBwaXRjaD1cIiR7dm9pY2VTZXR0aW5ncy5waXRjaH1cIj5cclxuICAgICAgICA8YnJlYWsgdGltZT1cIjFzXCIvPlxyXG4gICAgICAgICR7dGV4dH1cclxuICAgICAgICA8YnJlYWsgdGltZT1cIjJzXCIvPlxyXG4gICAgICA8L3Byb3NvZHk+XHJcbiAgICA8L3NwZWFrPlxyXG4gIGAudHJpbSgpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRTM0ZpbGVNZXRhZGF0YShzM0tleTogc3RyaW5nKTogUHJvbWlzZTx7IHNpemU6IG51bWJlciB9PiB7XHJcbiAgLy8gTW9jayBtb2RlIGZvciB0ZXN0aW5nXHJcbiAgaWYgKHByb2Nlc3MuZW52Lk1PQ0tfVklERU9fR0VORVJBVElPTiA9PT0gJ3RydWUnKSB7XHJcbiAgICAvLyBFc3RpbWF0ZSBmaWxlIHNpemUgYmFzZWQgb24gZHVyYXRpb24gKHJvdWdoIGFwcHJveGltYXRpb24pXHJcbiAgICBjb25zdCBlc3RpbWF0ZWRTaXplID0gMTAyNCAqIDEwMjQgKiA1OyAvLyA1TUIgZGVmYXVsdFxyXG4gICAgcmV0dXJuIHsgc2l6ZTogZXN0aW1hdGVkU2l6ZSB9O1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgUzNDbGllbnQsIEhlYWRPYmplY3RDb21tYW5kIH0gPSBhd2FpdCBpbXBvcnQoJ0Bhd3Mtc2RrL2NsaWVudC1zMycpO1xyXG4gICAgXHJcbiAgICBjb25zdCBzMyA9IG5ldyBTM0NsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB9KTtcclxuICAgIFxyXG4gICAgaWYgKCFwcm9jZXNzLmVudi5WSURFT19CVUNLRVQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdWSURFT19CVUNLRVQgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzMy5zZW5kKG5ldyBIZWFkT2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgIEJ1Y2tldDogcHJvY2Vzcy5lbnYuVklERU9fQlVDS0VULFxyXG4gICAgICBLZXk6IHMzS2V5XHJcbiAgICB9KSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1MzIG1ldGFkYXRhIHJldHJpZXZlZCcsIHsgXHJcbiAgICAgIGtleTogczNLZXksIFxyXG4gICAgICBzaXplOiByZXNwb25zZS5Db250ZW50TGVuZ3RoLFxyXG4gICAgICBsYXN0TW9kaWZpZWQ6IHJlc3BvbnNlLkxhc3RNb2RpZmllZFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2l6ZTogcmVzcG9uc2UuQ29udGVudExlbmd0aCB8fCAwXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IFMzIG1ldGFkYXRhJywgeyBrZXk6IHMzS2V5LCBlcnJvciB9KTtcclxuICAgIFxyXG4gICAgLy8gUmV0dXJuIGVzdGltYXRlZCBzaXplIGlmIG1ldGFkYXRhIHJldHJpZXZhbCBmYWlsc1xyXG4gICAgcmV0dXJuIHsgc2l6ZTogMTAyNCAqIDEwMjQgKiA1IH07IC8vIDVNQiBlc3RpbWF0ZVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY3VsYXRlR2VuZXJhdGlvbkNvc3QoZHVyYXRpb25TZWNvbmRzOiBudW1iZXIsIGluY2x1ZGVBdWRpbzogYm9vbGVhbik6IG51bWJlciB7XHJcbiAgLy8gQmVkcm9jayBOb3ZhIFJlZWwgcHJpY2luZyAoYXBwcm94aW1hdGUpXHJcbiAgY29uc3QgdmlkZW9Db3N0UGVyU2Vjb25kID0gMC44MCAvIDYwOyAvLyAkMC44MCBwZXIgbWludXRlXHJcbiAgY29uc3QgdmlkZW9Db3N0ID0gKGR1cmF0aW9uU2Vjb25kcyAvIDYwKSAqIDAuODA7XHJcbiAgXHJcbiAgLy8gUG9sbHkgcHJpY2luZyAoYXBwcm94aW1hdGUpXHJcbiAgY29uc3QgYXVkaW9Db3N0ID0gaW5jbHVkZUF1ZGlvID8gKGR1cmF0aW9uU2Vjb25kcyAqIDAuMDAwMDA0KSA6IDA7IC8vICQ0IHBlciAxTSBjaGFyYWN0ZXJzXHJcbiAgXHJcbiAgcmV0dXJuIE1hdGgucm91bmQoKHZpZGVvQ29zdCArIGF1ZGlvQ29zdCkgKiAxMDApIC8gMTAwOyAvLyBSb3VuZCB0byAyIGRlY2ltYWwgcGxhY2VzXHJcbn0iXX0=