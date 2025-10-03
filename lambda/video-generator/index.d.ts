import { Handler } from 'aws-lambda';
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
export declare const handler: Handler<VideoGeneratorEvent, VideoGeneratorResponse>;
