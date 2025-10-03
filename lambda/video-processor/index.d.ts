import { Handler } from 'aws-lambda';
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
export declare const handler: Handler<VideoProcessorEvent, VideoProcessorResponse>;
