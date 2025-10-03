import { Handler } from 'aws-lambda';
interface TrendData {
    topic: string;
    timestamp: string;
    videoId: string;
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    engagementRate: number;
    engagementScore: number;
    keywords: string[];
    categoryId: string;
    publishedAt: string;
    channelTitle: string;
    channelId: string;
    description?: string;
    duration?: string;
    thumbnailUrl?: string;
}
export interface ContentAnalyzerEvent {
    topic: string;
    trendsData: TrendData[];
    maxVideos?: number;
    minEngagementScore?: number;
}
export interface ContentAnalyzerResponse {
    success: boolean;
    topic: string;
    selectedTrends: TrendData[];
    scriptPrompts: Array<{
        trendId: string;
        title: string;
        prompt: string;
        keywords: string[];
        estimatedLength: number;
    }>;
    executionTime: number;
    error?: string;
}
export declare const handler: Handler<ContentAnalyzerEvent, ContentAnalyzerResponse>;
export {};
