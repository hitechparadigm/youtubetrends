import { YouTubeApiClient } from './youtube-api-client';
import { TrendRepository } from '../repositories/trend-repository';
import { TrendData } from '../models/trend-data';
export interface TrendDetectionConfig {
    topics: string[];
    regions: string[];
    categories: string[];
    maxResultsPerQuery: number;
    minViewCount: number;
    minEngagementRate: number;
    hoursBack: number;
    customTopics?: CustomTopicConfig[];
    engagementWeights?: EngagementWeights;
    contentFilters?: ContentFilters;
}
export interface CustomTopicConfig {
    name: string;
    keywords: string[];
    categories: string[];
    searchQueries: string[];
    minDuration?: number;
    maxDuration?: number;
    audioNarrationSuitable?: boolean;
}
export interface EngagementWeights {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    subscriberGrowth: number;
    watchTime: number;
}
export interface ContentFilters {
    excludeKeywords: string[];
    requiredKeywords: string[];
    minDurationSeconds: number;
    maxDurationSeconds: number;
    languageCode: string;
    contentRating: string[];
}
export interface TrendDetectionResult {
    topic: string;
    trendsFound: number;
    topTrend: TrendData | null;
    averageEngagement: number;
    totalViews: number;
    keywords: string[];
    categoryBreakdown: CategoryBreakdown[];
    engagementTrends: EngagementTrend[];
    contentSuitability: ContentSuitabilityScore;
    recommendedActions: RecommendedAction[];
}
export interface CategoryBreakdown {
    categoryId: string;
    categoryName: string;
    videoCount: number;
    averageViews: number;
    averageEngagement: number;
    topVideo: TrendData | null;
}
export interface EngagementTrend {
    timeframe: string;
    averageEngagement: number;
    trendDirection: 'up' | 'down' | 'stable';
    confidence: number;
}
export interface ContentSuitabilityScore {
    audioNarrationScore: number;
    visualContentScore: number;
    educationalValue: number;
    viralPotential: number;
    monetizationFriendly: number;
    overallScore: number;
}
export interface RecommendedAction {
    type: 'content_creation' | 'timing' | 'optimization' | 'targeting';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: number;
    effort: number;
}
export interface TrendAnalysisOptions {
    includeKeywordAnalysis?: boolean;
    includeCompetitorAnalysis?: boolean;
    includePerformancePrediction?: boolean;
}
export declare class TrendDetectionService {
    private youtubeClient;
    private trendRepository;
    private config;
    constructor(youtubeClient: YouTubeApiClient, trendRepository: TrendRepository, config?: Partial<TrendDetectionConfig>);
    detectTrends(topic?: string, options?: TrendAnalysisOptions): Promise<TrendDetectionResult[]>;
    private analyzeTopic;
    private isValidTrend;
    private isRelevantToTopic;
    private getTopicKeywords;
    private calculateEngagementRate;
    private isRecentEnough;
    private getPublishedAfterDate;
    private convertToTrendData;
    private removeDuplicateTrends;
    private getTopKeywords;
    private sleep;
    private getDefaultCustomTopics;
    private getDefaultEngagementWeights;
    private getDefaultContentFilters;
    getTopTrendingTopics(days?: number, limit?: number): Promise<Array<{
        topic: string;
        trendCount: number;
        averageEngagement: number;
        topVideo: TrendData | null;
    }>>;
    predictTrendPotential(videoData: {
        title: string;
        description: string;
        keywords: string[];
        categoryId: string;
    }): Promise<{
        score: number;
        factors: Record<string, number>;
        recommendations: string[];
    }>;
    private analyzeTitleEffectiveness;
    private analyzeKeywordRelevance;
    private analyzeDescriptionQuality;
    private calculateEnhancedEngagementScore;
    private updateCategoryStats;
    private getCategoryName;
    private analyzeEngagementTrends;
    private calculateContentSuitability;
    private generateRecommendedActions;
    private parseDurationToSeconds;
    detectTrendsWithCategoryFiltering(topics: string[], categoryFilters?: string[], options?: TrendAnalysisOptions): Promise<TrendDetectionResult[]>;
    getTopicPerformanceMetrics(topic: string, days?: number): Promise<{
        averageViews: number;
        averageEngagement: number;
        trendingFrequency: number;
        bestPerformingKeywords: string[];
        optimalPostingTimes: string[];
        competitionLevel: 'low' | 'medium' | 'high';
    }>;
}
