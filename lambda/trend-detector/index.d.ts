import { Handler } from 'aws-lambda';
export interface TrendDetectorEvent {
    topics?: string[];
    region?: string;
    maxResults?: number;
    hoursBack?: number;
}
export interface TrendDetectorResponse {
    success: boolean;
    trendsDetected: number;
    topicsAnalyzed: string[];
    results: Array<{
        topic: string;
        trendsFound: number;
        topTrend: any;
        averageEngagement: number;
    }>;
    executionTime: number;
    quotaUsed: number;
    error?: string;
}
export declare const handler: Handler<TrendDetectorEvent, TrendDetectorResponse>;
