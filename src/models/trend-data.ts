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

export class TrendDataModel {
  static calculateEngagementScore(viewCount: number, likeCount: number, commentCount: number): number {
    if (viewCount === 0) return 0;
    return (likeCount * 0.4 + commentCount * 0.6) / viewCount;
  }

  static calculateEngagementRate(likeCount: number, commentCount: number, viewCount: number): number {
    if (viewCount === 0) return 0;
    return ((likeCount + commentCount) / viewCount) * 100;
  }

  static fromYouTubeApiResponse(item: any, topic: string): TrendData {
    const statistics = item.statistics || {};
    const snippet = item.snippet || {};
    
    const viewCount = parseInt(statistics.viewCount || '0');
    const likeCount = parseInt(statistics.likeCount || '0');
    const commentCount = parseInt(statistics.commentCount || '0');
    
    return {
      topic,
      timestamp: new Date().toISOString(),
      videoId: item.id?.videoId || item.id,
      title: snippet.title || '',
      viewCount,
      likeCount,
      commentCount,
      engagementRate: this.calculateEngagementRate(likeCount, commentCount, viewCount),
      engagementScore: this.calculateEngagementScore(viewCount, likeCount, commentCount),
      keywords: this.extractKeywords(snippet.title || ''),
      categoryId: snippet.categoryId || '',
      publishedAt: snippet.publishedAt || new Date().toISOString(),
      channelTitle: snippet.channelTitle || '',
      channelId: snippet.channelId || '',
      description: snippet.description || '',
      duration: item.contentDetails?.duration,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      thumbnails: snippet.thumbnails
    };
  }

  private static extractKeywords(title: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10); // Limit to 10 keywords
  }

  static toDynamoDbItem(trend: TrendData): Record<string, any> {
    return {
      topic: trend.topic,
      timestamp: trend.timestamp,
      videoId: trend.videoId,
      title: trend.title,
      viewCount: trend.viewCount,
      likeCount: trend.likeCount,
      commentCount: trend.commentCount,
      engagementRate: trend.engagementRate,
      engagementScore: trend.engagementScore,
      keywords: trend.keywords,
      categoryId: trend.categoryId,
      publishedAt: trend.publishedAt,
      channelTitle: trend.channelTitle,
      channelId: trend.channelId,
      description: trend.description,
      duration: trend.duration,
      thumbnailUrl: trend.thumbnailUrl,
      thumbnails: trend.thumbnails
    };
  }

  static fromDynamoDbItem(item: Record<string, any>): TrendData {
    return {
      topic: item.topic,
      timestamp: item.timestamp,
      videoId: item.videoId,
      title: item.title,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      engagementRate: item.engagementRate,
      engagementScore: item.engagementScore,
      keywords: item.keywords || [],
      categoryId: item.categoryId,
      publishedAt: item.publishedAt,
      channelTitle: item.channelTitle,
      channelId: item.channelId,
      description: item.description,
      duration: item.duration,
      thumbnailUrl: item.thumbnailUrl,
      thumbnails: item.thumbnails
    };
  }
}