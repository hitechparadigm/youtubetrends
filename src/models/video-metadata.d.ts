export interface VideoMetadata {
    videoId: string;
    youtubeId?: string;
    uploadDate: string;
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    revenue: number;
    sourceTrends: string[];
    generationCost: number;
    processingCost: number;
    s3Key: string;
    bedrockJobId?: string;
    mediaConvertJobId?: string;
    status: VideoStatus;
    performanceMetrics: PerformanceMetrics;
    createdAt: string;
    updatedAt: string;
}
export declare enum VideoStatus {
    GENERATING = "GENERATING",
    PROCESSING = "PROCESSING",
    UPLOADING = "UPLOADING",
    PUBLISHED = "PUBLISHED",
    FAILED = "FAILED"
}
export interface PerformanceMetrics {
    impressions?: number;
    clickThroughRate?: number;
    averageViewDuration?: number;
    subscribersGained?: number;
    estimatedRevenue?: number;
    engagementRate?: number;
    retentionRate?: number;
    trafficSources?: Record<string, number>;
    demographics?: {
        ageGroups?: Record<string, number>;
        genders?: Record<string, number>;
        countries?: Record<string, number>;
    };
}
export interface VideoGenerationRequest {
    scriptContent: string;
    targetKeywords: string[];
    sourceTrends: string[];
    videoConfig: {
        duration: number;
        quality: string;
        format: string;
    };
}
export declare class VideoMetadataModel {
    static create(title: string, description: string, tags: string[], sourceTrends: string[], s3Key: string): VideoMetadata;
    private static generateVideoId;
    static updateStatus(video: VideoMetadata, status: VideoStatus): VideoMetadata;
    static updateYouTubeData(video: VideoMetadata, youtubeId: string, viewCount?: number, likeCount?: number, commentCount?: number): VideoMetadata;
    static updatePerformanceMetrics(video: VideoMetadata, metrics: Partial<PerformanceMetrics>): VideoMetadata;
    static calculateROI(video: VideoMetadata): number;
    static toDynamoDbItem(video: VideoMetadata): Record<string, any>;
    static fromDynamoDbItem(item: Record<string, any>): VideoMetadata;
}
