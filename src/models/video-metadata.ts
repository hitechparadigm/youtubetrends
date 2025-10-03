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

export enum VideoStatus {
  GENERATING = 'GENERATING',
  PROCESSING = 'PROCESSING',
  UPLOADING = 'UPLOADING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED'
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

export class VideoMetadataModel {
  static create(
    title: string,
    description: string,
    tags: string[],
    sourceTrends: string[],
    s3Key: string
  ): VideoMetadata {
    const videoId = this.generateVideoId();
    const now = new Date().toISOString();
    
    return {
      videoId,
      uploadDate: now.split('T')[0], // YYYY-MM-DD format for GSI
      title,
      description,
      tags,
      categoryId: '22', // People & Blogs - can be made configurable
      privacyStatus: 'public',
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      revenue: 0,
      sourceTrends,
      generationCost: 0,
      processingCost: 0,
      s3Key,
      status: VideoStatus.GENERATING,
      performanceMetrics: {},
      createdAt: now,
      updatedAt: now
    };
  }

  private static generateVideoId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static updateStatus(video: VideoMetadata, status: VideoStatus): VideoMetadata {
    return {
      ...video,
      status,
      updatedAt: new Date().toISOString()
    };
  }

  static updateYouTubeData(
    video: VideoMetadata,
    youtubeId: string,
    viewCount: number = 0,
    likeCount: number = 0,
    commentCount: number = 0
  ): VideoMetadata {
    return {
      ...video,
      youtubeId,
      viewCount,
      likeCount,
      commentCount,
      status: VideoStatus.PUBLISHED,
      updatedAt: new Date().toISOString()
    };
  }

  static updatePerformanceMetrics(
    video: VideoMetadata,
    metrics: Partial<PerformanceMetrics>
  ): VideoMetadata {
    return {
      ...video,
      performanceMetrics: {
        ...video.performanceMetrics,
        ...metrics
      },
      updatedAt: new Date().toISOString()
    };
  }

  static calculateROI(video: VideoMetadata): number {
    const totalCost = video.generationCost + video.processingCost;
    if (totalCost === 0) return 0;
    return (video.revenue - totalCost) / totalCost;
  }

  static toDynamoDbItem(video: VideoMetadata): Record<string, any> {
    return {
      videoId: video.videoId,
      youtubeId: video.youtubeId,
      uploadDate: video.uploadDate,
      title: video.title,
      description: video.description,
      tags: video.tags,
      categoryId: video.categoryId,
      privacyStatus: video.privacyStatus,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      revenue: video.revenue,
      sourceTrends: video.sourceTrends,
      generationCost: video.generationCost,
      processingCost: video.processingCost,
      s3Key: video.s3Key,
      bedrockJobId: video.bedrockJobId,
      mediaConvertJobId: video.mediaConvertJobId,
      status: video.status,
      performanceMetrics: video.performanceMetrics,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    };
  }

  static fromDynamoDbItem(item: Record<string, any>): VideoMetadata {
    return {
      videoId: item.videoId,
      youtubeId: item.youtubeId,
      uploadDate: item.uploadDate,
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      categoryId: item.categoryId,
      privacyStatus: item.privacyStatus || 'public',
      viewCount: item.viewCount || 0,
      likeCount: item.likeCount || 0,
      commentCount: item.commentCount || 0,
      revenue: item.revenue || 0,
      sourceTrends: item.sourceTrends || [],
      generationCost: item.generationCost || 0,
      processingCost: item.processingCost || 0,
      s3Key: item.s3Key,
      bedrockJobId: item.bedrockJobId,
      mediaConvertJobId: item.mediaConvertJobId,
      status: item.status || VideoStatus.GENERATING,
      performanceMetrics: item.performanceMetrics || {},
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}