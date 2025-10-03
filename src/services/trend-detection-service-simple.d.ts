import { YouTubeApiClientSimple } from './youtube-api-client-simple';
import { TrendRepository } from '../repositories/trend-repository';
export interface TrendDetectionConfig {
    topics: string[];
    regions: string[];
    maxResultsPerQuery: number;
    hoursBack: number;
}
export declare class TrendDetectionServiceSimple {
    private youtubeClient;
    private trendRepository;
    private config;
    constructor(youtubeClient: YouTubeApiClientSimple, trendRepository: TrendRepository, config: TrendDetectionConfig);
    detectTrends(): Promise<Array<{
        topic: string;
        trendsFound: number;
        topTrend: any;
        averageEngagement: number;
    }>>;
    private calculateEngagementRate;
    private calculateTrendScore;
    private getRecencyScore;
    private extractKeywords;
}
