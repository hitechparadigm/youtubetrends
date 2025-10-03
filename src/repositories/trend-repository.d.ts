import { BaseRepository, RepositoryConfig } from './base-repository';
import { TrendData, TrendAnalysisResult } from '../models/trend-data';
export interface TrendQueryOptions {
    limit?: number;
    startTime?: string;
    endTime?: string;
    minEngagementScore?: number;
}
export declare class TrendRepository extends BaseRepository {
    constructor(config?: RepositoryConfig);
    saveTrend(trend: TrendData): Promise<void>;
    saveTrends(trends: TrendData[]): Promise<void>;
    getTrendsByTopic(topic: string, options?: TrendQueryOptions): Promise<TrendData[]>;
    getTopTrendsByEngagement(limit?: number, timeRange?: {
        start: string;
        end: string;
    }): Promise<TrendData[]>;
    getTrendAnalysis(topic: string, timeRange?: {
        start: string;
        end: string;
    }): Promise<TrendAnalysisResult>;
    getRecentTrends(hours?: number, limit?: number): Promise<TrendData[]>;
    deleteTrendsByTopic(topic: string, olderThanDays?: number): Promise<number>;
    getTopicStats(topic: string, days?: number): Promise<{
        totalTrends: number;
        averageEngagement: number;
        topVideo: TrendData | null;
        trendingKeywords: string[];
    }>;
    private chunkArray;
}
