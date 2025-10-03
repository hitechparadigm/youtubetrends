/// <reference types="node" />
export interface YouTubeCredentials {
    client_id: string;
    client_secret: string;
    refresh_token: string;
    project_id: string;
    api_key?: string;
}
export interface YouTubeApiConfig {
    secretName?: string;
    region?: string;
    quotaLimit?: number;
    requestsPerSecond?: number;
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
export interface YouTubeUploadRequest {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: 'private' | 'public' | 'unlisted';
    videoFilePath?: string;
    videoBuffer?: Buffer;
}
export interface YouTubeUploadResponse {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    status: string;
}
export declare class YouTubeApiClient {
    private credentials;
    private accessToken;
    private tokenExpiresAt;
    private secretsClient;
    private config;
    private requestQueue;
    private isProcessingQueue;
    private quotaUsed;
    private quotaResetTime;
    constructor(config?: YouTubeApiConfig);
    initialize(): Promise<void>;
    private loadCredentials;
    private refreshAccessToken;
    private ensureValidToken;
    private makeApiRequest;
    private processQueue;
    private checkQuota;
    private sleep;
    searchVideos(query: string, options?: {
        maxResults?: number;
        order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
        publishedAfter?: string;
        publishedBefore?: string;
        regionCode?: string;
        videoCategoryId?: string;
    }): Promise<YouTubeSearchResult[]>;
    getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]>;
    getTrendingVideos(regionCode?: string, categoryId?: string, maxResults?: number): Promise<YouTubeVideoDetails[]>;
    uploadVideo(request: YouTubeUploadRequest): Promise<YouTubeUploadResponse>;
    getVideoCategories(regionCode?: string): Promise<Array<{
        id: string;
        title: string;
    }>>;
    getQuotaUsage(): {
        used: number;
        limit: number;
        remaining: number;
    };
    testConnection(): Promise<boolean>;
}
