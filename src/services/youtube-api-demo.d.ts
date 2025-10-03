export interface YouTubeApiDemoConfig {
    secretName?: string;
    region?: string;
    apiKey?: string;
}
export declare class YouTubeApiDemo {
    private apiKey;
    private secretsClient;
    private config;
    constructor(config?: YouTubeApiDemoConfig);
    initialize(): Promise<void>;
    private loadApiKeyFromSecrets;
    searchVideos(query: string, options?: {
        maxResults?: number;
        order?: string;
        publishedAfter?: string;
        regionCode?: string;
        categoryId?: string;
    }): Promise<any[]>;
    getVideoDetails(videoIds: string[]): Promise<any[]>;
    getTrendingVideos(regionCode?: string, categoryId?: string, maxResults?: number): Promise<any[]>;
}
