export interface YouTubeCredentials {
    client_id: string;
    client_secret: string;
    refresh_token: string;
    project_id: string;
    api_key?: string;
}
export interface YouTubeSearchResult {
    videoId: string;
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: {
        default?: {
            url: string;
        };
        medium?: {
            url: string;
        };
        high?: {
            url: string;
        };
    };
    categoryId?: string;
}
export interface YouTubeVideoDetails {
    id: string;
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    categoryId: string;
    duration: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    thumbnails: {
        default?: {
            url: string;
        };
        medium?: {
            url: string;
        };
        high?: {
            url: string;
        };
    };
}
export declare class YouTubeApiClientSimple {
    private credentials;
    private secretsClient;
    private quotaUsed;
    constructor(region?: string);
    initialize(): Promise<void>;
    private loadCredentials;
    private makeRequest;
    searchVideos(query: string, maxResults?: number): Promise<YouTubeSearchResult[]>;
    getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]>;
    getTrendingVideos(categoryId?: string, regionCode?: string): Promise<YouTubeVideoDetails[]>;
    getVideoCategories(): Promise<Array<{
        id: string;
        title: string;
    }>>;
    testConnection(): Promise<boolean>;
    getQuotaUsage(): {
        used: number;
        limit: number;
        remaining: number;
    };
}
