import { BaseRepository, RepositoryConfig } from './base-repository';
import { VideoMetadata, VideoMetadataModel, VideoStatus, PerformanceMetrics } from '../models/video-metadata';

export interface VideoQueryOptions {
  limit?: number;
  status?: VideoStatus;
  startDate?: string;
  endDate?: string;
}

export class VideoRepository extends BaseRepository {
  constructor(config: RepositoryConfig = {}) {
    super(process.env.VIDEO_METADATA_TABLE_NAME || 'VideoMetadata', config);
  }

  async saveVideo(video: VideoMetadata): Promise<void> {
    const item = VideoMetadataModel.toDynamoDbItem(video);
    
    await this.put({
      Item: item,
      ConditionExpression: 'attribute_not_exists(videoId)'
    });
  }

  async getVideo(videoId: string): Promise<VideoMetadata | null> {
    const item = await this.get({
      Key: { videoId }
    });

    return item ? VideoMetadataModel.fromDynamoDbItem(item) : null;
  }

  async updateVideo(video: VideoMetadata): Promise<VideoMetadata> {
    const item = VideoMetadataModel.toDynamoDbItem(video);
    
    const updatedItem = await this.update({
      Key: { videoId: video.videoId },
      UpdateExpression: `
        SET title = :title,
            description = :description,
            tags = :tags,
            categoryId = :categoryId,
            privacyStatus = :privacyStatus,
            viewCount = :viewCount,
            likeCount = :likeCount,
            commentCount = :commentCount,
            revenue = :revenue,
            sourceTrends = :sourceTrends,
            generationCost = :generationCost,
            processingCost = :processingCost,
            s3Key = :s3Key,
            bedrockJobId = :bedrockJobId,
            mediaConvertJobId = :mediaConvertJobId,
            #status = :status,
            performanceMetrics = :performanceMetrics,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':title': item.title,
        ':description': item.description,
        ':tags': item.tags,
        ':categoryId': item.categoryId,
        ':privacyStatus': item.privacyStatus,
        ':viewCount': item.viewCount,
        ':likeCount': item.likeCount,
        ':commentCount': item.commentCount,
        ':revenue': item.revenue,
        ':sourceTrends': item.sourceTrends,
        ':generationCost': item.generationCost,
        ':processingCost': item.processingCost,
        ':s3Key': item.s3Key,
        ':bedrockJobId': item.bedrockJobId,
        ':mediaConvertJobId': item.mediaConvertJobId,
        ':status': item.status,
        ':performanceMetrics': item.performanceMetrics,
        ':updatedAt': item.updatedAt
      },
      ReturnValues: 'ALL_NEW'
    });

    return VideoMetadataModel.fromDynamoDbItem(updatedItem);
  }

  async updateVideoStatus(videoId: string, status: VideoStatus): Promise<VideoMetadata> {
    const updatedItem = await this.update({
      Key: { videoId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    });

    return VideoMetadataModel.fromDynamoDbItem(updatedItem);
  }

  async updateYouTubeData(
    videoId: string,
    youtubeId: string,
    viewCount: number = 0,
    likeCount: number = 0,
    commentCount: number = 0
  ): Promise<VideoMetadata> {
    const updatedItem = await this.update({
      Key: { videoId },
      UpdateExpression: `
        SET youtubeId = :youtubeId,
            viewCount = :viewCount,
            likeCount = :likeCount,
            commentCount = :commentCount,
            #status = :status,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':youtubeId': youtubeId,
        ':viewCount': viewCount,
        ':likeCount': likeCount,
        ':commentCount': commentCount,
        ':status': VideoStatus.PUBLISHED,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    });

    return VideoMetadataModel.fromDynamoDbItem(updatedItem);
  }

  async updatePerformanceMetrics(
    videoId: string,
    metrics: Partial<PerformanceMetrics>
  ): Promise<VideoMetadata> {
    const existingVideo = await this.getVideo(videoId);
    if (!existingVideo) {
      throw new Error(`Video with ID ${videoId} not found`);
    }

    const updatedMetrics = {
      ...existingVideo.performanceMetrics,
      ...metrics
    };

    const updatedItem = await this.update({
      Key: { videoId },
      UpdateExpression: 'SET performanceMetrics = :metrics, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':metrics': updatedMetrics,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    });

    return VideoMetadataModel.fromDynamoDbItem(updatedItem);
  }

  async getVideosByStatus(status: VideoStatus, limit: number = 50): Promise<VideoMetadata[]> {
    const items = await this.scan({
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      },
      Limit: limit
    });

    return items.map(item => VideoMetadataModel.fromDynamoDbItem(item));
  }

  async getVideosByDateRange(
    startDate: string,
    endDate: string,
    options: VideoQueryOptions = {}
  ): Promise<VideoMetadata[]> {
    let filterExpression = 'uploadDate BETWEEN :startDate AND :endDate';
    const expressionAttributeValues: Record<string, any> = {
      ':startDate': startDate,
      ':endDate': endDate
    };

    if (options.status) {
      filterExpression += ' AND #status = :status';
      expressionAttributeValues[':status'] = options.status;
    }

    // Use scan instead of query since we need to filter by date range
    // and the GSI only has uploadDate as partition key
    const items = await this.scan({
      FilterExpression: filterExpression,
      ExpressionAttributeNames: options.status ? { '#status': 'status' } : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: options.limit
    });

    // Sort by upload date descending (most recent first)
    const sortedItems = items.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );

    return sortedItems.map(item => VideoMetadataModel.fromDynamoDbItem(item));
  }

  async getRecentVideos(days: number = 7, limit: number = 50): Promise<VideoMetadata[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    return this.getVideosByDateRange(startDate, endDate, { limit });
  }

  async getTopPerformingVideos(
    days: number = 30,
    limit: number = 10
  ): Promise<VideoMetadata[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const videos = await this.getVideosByDateRange(startDate, endDate);
    
    return videos
      .filter(video => video.status === VideoStatus.PUBLISHED)
      .sort((a, b) => {
        // Sort by engagement rate, then by view count
        const aEngagement = (a.likeCount + a.commentCount) / Math.max(a.viewCount, 1);
        const bEngagement = (b.likeCount + b.commentCount) / Math.max(b.viewCount, 1);
        
        if (aEngagement !== bEngagement) {
          return bEngagement - aEngagement;
        }
        
        return b.viewCount - a.viewCount;
      })
      .slice(0, limit);
  }

  async getVideoAnalytics(days: number = 30): Promise<{
    totalVideos: number;
    publishedVideos: number;
    totalViews: number;
    totalRevenue: number;
    averageROI: number;
    totalCosts: number;
    statusBreakdown: Record<VideoStatus, number>;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const videos = await this.getVideosByDateRange(startDate, endDate);

    const statusBreakdown = Object.values(VideoStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<VideoStatus, number>);

    let totalViews = 0;
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalROI = 0;
    let publishedVideos = 0;

    videos.forEach(video => {
      statusBreakdown[video.status]++;
      
      if (video.status === VideoStatus.PUBLISHED) {
        publishedVideos++;
        totalViews += video.viewCount;
        totalRevenue += video.revenue;
      }
      
      totalCosts += video.generationCost + video.processingCost;
      totalROI += VideoMetadataModel.calculateROI(video);
    });

    return {
      totalVideos: videos.length,
      publishedVideos,
      totalViews,
      totalRevenue,
      averageROI: videos.length > 0 ? totalROI / videos.length : 0,
      totalCosts,
      statusBreakdown
    };
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.delete({
      Key: { videoId }
    });
  }

  async getVideosBySourceTrend(trendTopic: string, limit: number = 20): Promise<VideoMetadata[]> {
    const items = await this.scan({
      FilterExpression: 'contains(sourceTrends, :trendTopic)',
      ExpressionAttributeValues: {
        ':trendTopic': trendTopic
      },
      Limit: limit
    });

    return items.map(item => VideoMetadataModel.fromDynamoDbItem(item));
  }

  async updateCosts(
    videoId: string,
    generationCost?: number,
    processingCost?: number
  ): Promise<VideoMetadata> {
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': new Date().toISOString()
    };

    if (generationCost !== undefined) {
      updateExpressions.push('generationCost = :generationCost');
      expressionAttributeValues[':generationCost'] = generationCost;
    }

    if (processingCost !== undefined) {
      updateExpressions.push('processingCost = :processingCost');
      expressionAttributeValues[':processingCost'] = processingCost;
    }

    updateExpressions.push('updatedAt = :updatedAt');

    const updatedItem = await this.update({
      Key: { videoId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    return VideoMetadataModel.fromDynamoDbItem(updatedItem);
  }
}