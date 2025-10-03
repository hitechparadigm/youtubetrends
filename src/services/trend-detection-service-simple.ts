import { YouTubeApiClientSimple, YouTubeVideoDetails } from './youtube-api-client-simple';
import { TrendRepository } from '../repositories/trend-repository';
import { TrendData } from '../models/trend-data';

export interface TrendDetectionConfig {
  topics: string[];
  regions: string[];
  maxResultsPerQuery: number;
  hoursBack: number;
}

export class TrendDetectionServiceSimple {
  private youtubeClient: YouTubeApiClientSimple;
  private trendRepository: TrendRepository;
  private config: TrendDetectionConfig;

  constructor(
    youtubeClient: YouTubeApiClientSimple,
    trendRepository: TrendRepository,
    config: TrendDetectionConfig
  ) {
    this.youtubeClient = youtubeClient;
    this.trendRepository = trendRepository;
    this.config = config;
  }

  async detectTrends(): Promise<Array<{
    topic: string;
    trendsFound: number;
    topTrend: any;
    averageEngagement: number;
  }>> {
    const results = [];

    for (const topic of this.config.topics) {
      console.log(`🔍 Detecting trends for topic: ${topic}`);
      
      try {
        // Search for videos related to the topic
        const searchResults = await this.youtubeClient.searchVideos(
          `${topic} trending`,
          this.config.maxResultsPerQuery
        );

        if (searchResults.length === 0) {
          console.log(`No videos found for topic: ${topic}`);
          results.push({
            topic,
            trendsFound: 0,
            topTrend: null,
            averageEngagement: 0
          });
          continue;
        }

        // Get detailed video information
        const videoIds = searchResults.map(result => result.videoId);
        const videoDetails = await this.youtubeClient.getVideoDetails(videoIds);

        // Convert to TrendData and save
        const trends: TrendData[] = [];
        let totalEngagement = 0;

        for (const video of videoDetails) {
          const engagementRate = this.calculateEngagementRate(video);
          totalEngagement += engagementRate;

          const trendScore = this.calculateTrendScore(video, engagementRate);
          
          const trendData: TrendData = {
            videoId: video.id,
            title: video.title,
            description: video.description,
            channelTitle: video.channelTitle,
            channelId: video.channelId,
            publishedAt: video.publishedAt,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            categoryId: video.categoryId,
            duration: video.duration,
            thumbnails: video.thumbnails,
            topic: topic,
            timestamp: new Date().toISOString(),
            engagementRate: engagementRate,
            engagementScore: trendScore, // Use trendScore as engagementScore
            keywords: this.extractKeywords(video.title, video.description)
          };

          trends.push(trendData);

          // Save to repository
          try {
            await this.trendRepository.saveTrend(trendData);
          } catch (error) {
            console.error(`Failed to save trend for video ${video.id}:`, error);
          }
        }

        const averageEngagement = trends.length > 0 ? totalEngagement / trends.length : 0;
        const topTrend = trends.sort((a, b) => b.engagementScore - a.engagementScore)[0];

        console.log(`✅ Found ${trends.length} trends for topic: ${topic}`);

        results.push({
          topic,
          trendsFound: trends.length,
          topTrend,
          averageEngagement
        });

      } catch (error) {
        console.error(`Error detecting trends for topic ${topic}:`, error);
        results.push({
          topic,
          trendsFound: 0,
          topTrend: null,
          averageEngagement: 0
        });
      }
    }

    return results;
  }

  private calculateEngagementRate(video: YouTubeVideoDetails): number {
    if (video.viewCount === 0) return 0;
    
    const engagementActions = video.likeCount + video.commentCount;
    return engagementActions / video.viewCount;
  }

  private calculateTrendScore(video: YouTubeVideoDetails, engagementRate: number): number {
    const viewScore = Math.log10(video.viewCount + 1) / 10;
    const engagementScore = engagementRate * 100;
    const recencyScore = this.getRecencyScore(video.publishedAt);
    
    return (viewScore * 0.4) + (engagementScore * 0.4) + (recencyScore * 0.2);
  }

  private getRecencyScore(publishedAt: string): number {
    const publishedTime = new Date(publishedAt).getTime();
    const now = Date.now();
    const hoursAgo = (now - publishedTime) / (1000 * 60 * 60);
    
    if (hoursAgo <= 24) return 1.0;
    if (hoursAgo <= 48) return 0.8;
    if (hoursAgo <= 168) return 0.6; // 1 week
    return 0.4;
  }

  private extractKeywords(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    
    // Remove common words and get unique keywords
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'use', 'her', 'now', 'oil', 'sit', 'set'];
    
    const keywords = [...new Set(words)]
      .filter(word => !commonWords.includes(word))
      .slice(0, 10);
    
    return keywords;
  }
}