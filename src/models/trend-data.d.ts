export interface TrendData {
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
    thumbnails?: any;
}
export interface TrendAnalysisResult {
    trends: TrendData[];
    analysisTimestamp: string;
    totalTrends: number;
    topEngagementScore: number;
    averageEngagementRate: number;
}
export declare class TrendDataModel {
    static calculateEngagementScore(viewCount: number, likeCount: number, commentCount: number): number;
    static calculateEngagementRate(likeCount: number, commentCount: number, viewCount: number): number;
    static fromYouTubeApiResponse(item: any, topic: string): TrendData;
    private static extractKeywords;
    static toDynamoDbItem(trend: TrendData): Record<string, any>;
    static fromDynamoDbItem(item: Record<string, any>): TrendData;
}
