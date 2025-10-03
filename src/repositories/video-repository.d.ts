import { BaseRepository, RepositoryConfig } from './base-repository';
import { VideoMetadata, VideoStatus, PerformanceMetrics } from '../models/video-metadata';
export interface VideoQueryOptions {
    limit?: number;
    status?: VideoStatus;
    startDate?: string;
    endDate?: string;
}
export declare class VideoRepository extends BaseRepository {
    constructor(config?: RepositoryConfig);
    saveVideo(video: VideoMetadata): Promise<void>;
    getVideo(videoId: string): Promise<VideoMetadata | null>;
    updateVideo(video: VideoMetadata): Promise<VideoMetadata>;
    updateVideoStatus(videoId: string, status: VideoStatus): Promise<VideoMetadata>;
    updateYouTubeData(videoId: string, youtubeId: string, viewCount?: number, likeCount?: number, commentCount?: number): Promise<VideoMetadata>;
    updatePerformanceMetrics(videoId: string, metrics: Partial<PerformanceMetrics>): Promise<VideoMetadata>;
    getVideosByStatus(status: VideoStatus, limit?: number): Promise<VideoMetadata[]>;
    getVideosByDateRange(startDate: string, endDate: string, options?: VideoQueryOptions): Promise<VideoMetadata[]>;
    getRecentVideos(days?: number, limit?: number): Promise<VideoMetadata[]>;
    getTopPerformingVideos(days?: number, limit?: number): Promise<VideoMetadata[]>;
    getVideoAnalytics(days?: number): Promise<{
        totalVideos: number;
        publishedVideos: number;
        totalViews: number;
        totalRevenue: number;
        averageROI: number;
        totalCosts: number;
        statusBreakdown: Record<VideoStatus, number>;
    }>;
    deleteVideo(videoId: string): Promise<void>;
    getVideosBySourceTrend(trendTopic: string, limit?: number): Promise<VideoMetadata[]>;
    updateCosts(videoId: string, generationCost?: number, processingCost?: number): Promise<VideoMetadata>;
}
