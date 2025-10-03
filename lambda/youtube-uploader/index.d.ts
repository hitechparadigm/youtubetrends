import { Handler } from 'aws-lambda';
export interface YouTubeUploaderEvent {
    processedVideoS3Key: string;
    topic: string;
    trendId: string;
    scriptPrompt: string;
    keywords: string[];
    videoMetadata: {
        duration: number;
        fileSize: number;
        format: string;
        resolution: string;
        isYouTubeOptimized: boolean;
    };
    uploadConfig?: {
        privacyStatus: 'public' | 'unlisted' | 'private';
        categoryId: string;
        publishAt?: string;
    };
}
export interface YouTubeUploaderResponse {
    success: boolean;
    youtubeVideoId?: string;
    videoUrl?: string;
    uploadedMetadata: {
        title: string;
        description: string;
        tags: string[];
        categoryId: string;
        privacyStatus: string;
        thumbnailUrl?: string;
    };
    performanceTracking: {
        uploadTime: number;
        initialViews: number;
        estimatedReach: number;
    };
    executionTime: number;
    error?: string;
}
export declare const handler: Handler<YouTubeUploaderEvent, YouTubeUploaderResponse>;
