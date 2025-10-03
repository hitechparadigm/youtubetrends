import { YouTubeApiClient, YouTubeVideoDetails } from './youtube-api-client';
import { TrendRepository } from '../repositories/trend-repository';
import { TrendData, TrendDataModel } from '../models/trend-data';

export interface TrendDetectionConfig {
  topics: string[];
  regions: string[];
  categories: string[];
  maxResultsPerQuery: number;
  minViewCount: number;
  minEngagementRate: number;
  hoursBack: number;
}

export interface TrendDetectionResult {
  topic: string;
  trendsFound: number;
  topTrend: TrendData | null;
  averageEngagement: number;
  totalViews: number;
  keywords: string[];
}

export interface TrendAnalysisOptions {
  includeKeywordAnalysis?: boolean;
  includeCompetitorAnalysis?: boolean;
  includePerformancePrediction?: boolean;
}

export class TrendDetectionService {
  private youtubeClient: YouTubeApiClient;
  private trendRepository: TrendRepository;
  private config: TrendDetectionConfig;

  constructor(
    youtubeClient: YouTubeApiClient,
    trendRepository: TrendRepository,
    config: Partial<TrendDetectionConfig> = {}
  ) {
    this.youtubeClient = youtubeClient;
    this.trendRepository = trendRepository;
    this.config = {
      topics: config.topics || ['tourism', 'travel', 'vacation', 'adventure'],
      regions: config.regions || ['US', 'GB', 'CA', 'AU'],
      categories: config.categories || ['19', '22', '23'], // Travel & Events, People & Blogs, Comedy
      maxResultsPerQuery: config.maxResultsPerQuery || 25,
      minViewCount: config.minViewCount || 1000,
      minEngagementRate: config.minEngagementRate || 1.0,
      hoursBack: config.hoursBack || 24
    };
  }

  async detectTrends(
    topic?: string,
    options: TrendAnalysisOptions = {}
  ): Promise<TrendDetectionResult[]> {
    const results: TrendDetectionResult[] = [];
    const topicsToAnalyze = topic ? [topic] : this.config.topics;

    for (const currentTopic of topicsToAnalyze) {
      console.log(`Detecting trends for topic: ${currentTopic}`);
      
      try {
        const trendResult = await this.analyzeTopic(currentTopic, options);
        results.push(trendResult);
        
        // Small delay between topics to respect rate limits
        await this.sleep(1000);
      } catch (error) {
        console.error(`Failed to analyze topic ${currentTopic}:`, error);
        
        // Add empty result for failed topic
        results.push({
          topic: currentTopic,
          trendsFound: 0,
          topTrend: null,
          averageEngagement: 0,
          totalViews: 0,
          keywords: []
        });
      }
    }

    return results;
  }

  private async analyzeTopic(
    topic: string,
    options: TrendAnalysisOptions
  ): Promise<TrendDetectionResult> {
    const trends: TrendData[] = [];
    let totalViews = 0;
    let totalEngagement = 0;
    const allKeywords: string[] = [];

    // Search for trending content across different approaches
    const searchStrategies = [
      `${topic} trending`,
      `${topic} viral`,
      `${topic} 2024`,
      `best ${topic}`,
      `${topic} tips`
    ];

    for (const query of searchStrategies) {
      try {
        const searchResults = await this.youtubeClient.searchVideos(query, {
          maxResults: Math.floor(this.config.maxResultsPerQuery / searchStrategies.length),
          order: 'viewCount',
          publishedAfter: this.getPublishedAfterDate(),
          regionCode: 'US' // Primary region, can be made configurable
        });

        if (searchResults.length > 0) {
          // Get detailed video information
          const videoIds = searchResults.map(result => result.videoId);
          const videoDetails = await this.youtubeClient.getVideoDetails(videoIds);
          
          // Convert to trend data and filter
          const validTrends = videoDetails
            .filter(video => this.isValidTrend(video))
            .map(video => this.convertToTrendData(video, topic));

          trends.push(...validTrends);
        }

        // Rate limiting delay
        await this.sleep(500);
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error);
      }
    }

    // Also check trending videos in relevant categories
    for (const categoryId of this.config.categories) {
      try {
        const trendingVideos = await this.youtubeClient.getTrendingVideos('US', categoryId, 20);
        
        const relevantTrending = trendingVideos
          .filter(video => this.isRelevantToTopic(video, topic))
          .filter(video => this.isValidTrend(video))
          .map(video => this.convertToTrendData(video, topic));

        trends.push(...relevantTrending);
        
        await this.sleep(500);
      } catch (error) {
        console.error(`Failed to get trending videos for category ${categoryId}:`, error);
      }
    }

    // Remove duplicates and sort by engagement
    const uniqueTrends = this.removeDuplicateTrends(trends);
    const sortedTrends = uniqueTrends.sort((a, b) => b.engagementScore - a.engagementScore);

    // Save trends to database
    if (sortedTrends.length > 0) {
      try {
        await this.trendRepository.saveTrends(sortedTrends);
      } catch (error) {
        console.error('Failed to save trends to database:', error);
      }
    }

    // Calculate analytics
    totalViews = sortedTrends.reduce((sum, trend) => sum + trend.viewCount, 0);
    totalEngagement = sortedTrends.reduce((sum, trend) => sum + trend.engagementRate, 0);
    
    // Extract keywords
    sortedTrends.forEach(trend => {
      allKeywords.push(...trend.keywords);
    });

    const topKeywords = this.getTopKeywords(allKeywords, 10);

    return {
      topic,
      trendsFound: sortedTrends.length,
      topTrend: sortedTrends[0] || null,
      averageEngagement: sortedTrends.length > 0 ? totalEngagement / sortedTrends.length : 0,
      totalViews,
      keywords: topKeywords
    };
  }

  private isValidTrend(video: YouTubeVideoDetails): boolean {
    return (
      video.viewCount >= this.config.minViewCount &&
      this.calculateEngagementRate(video) >= this.config.minEngagementRate &&
      this.isRecentEnough(video.publishedAt)
    );
  }

  private isRelevantToTopic(video: YouTubeVideoDetails, topic: string): boolean {
    const searchText = `${video.title} ${video.description}`.toLowerCase();
    const topicKeywords = this.getTopicKeywords(topic);
    
    return topicKeywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  }

  private getTopicKeywords(topic: string): string[] {
    const keywordMap: Record<string, string[]> = {
      tourism: ['travel', 'vacation', 'holiday', 'destination', 'tourist', 'sightseeing', 'trip'],
      travel: ['journey', 'adventure', 'explore', 'wanderlust', 'backpack', 'road trip'],
      food: ['recipe', 'cooking', 'cuisine', 'restaurant', 'chef', 'delicious', 'taste'],
      technology: ['tech', 'gadget', 'innovation', 'digital', 'software', 'app', 'device'],
      fitness: ['workout', 'exercise', 'health', 'gym', 'training', 'nutrition', 'wellness']
    };

    return keywordMap[topic.toLowerCase()] || [topic];
  }

  private calculateEngagementRate(video: YouTubeVideoDetails): number {
    if (video.viewCount === 0) return 0;
    return ((video.likeCount + video.commentCount) / video.viewCount) * 100;
  }

  private isRecentEnough(publishedAt: string): boolean {
    const publishedDate = new Date(publishedAt);
    const cutoffDate = new Date(Date.now() - this.config.hoursBack * 60 * 60 * 1000);
    return publishedDate >= cutoffDate;
  }

  private getPublishedAfterDate(): string {
    const date = new Date(Date.now() - this.config.hoursBack * 60 * 60 * 1000);
    return date.toISOString();
  }

  private convertToTrendData(video: YouTubeVideoDetails, topic: string): TrendData {
    return TrendDataModel.fromYouTubeApiResponse({
      id: video.id,
      snippet: {
        title: video.title,
        channelTitle: video.channelTitle,
        channelId: video.channelId,
        publishedAt: video.publishedAt,
        categoryId: video.categoryId,
        thumbnails: video.thumbnails
      },
      statistics: {
        viewCount: video.viewCount.toString(),
        likeCount: video.likeCount.toString(),
        commentCount: video.commentCount.toString()
      },
      contentDetails: {
        duration: video.duration
      }
    }, topic);
  }

  private removeDuplicateTrends(trends: TrendData[]): TrendData[] {
    const seen = new Set<string>();
    return trends.filter(trend => {
      if (seen.has(trend.videoId)) {
        return false;
      }
      seen.add(trend.videoId);
      return true;
    });
  }

  private getTopKeywords(keywords: string[], limit: number): string[] {
    const keywordCounts: Record<string, number> = {};
    
    keywords.forEach(keyword => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });

    return Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([keyword]) => keyword);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getTopTrendingTopics(days: number = 7, limit: number = 10): Promise<Array<{
    topic: string;
    trendCount: number;
    averageEngagement: number;
    topVideo: TrendData | null;
  }>> {
    const results: Array<{
      topic: string;
      trendCount: number;
      averageEngagement: number;
      topVideo: TrendData | null;
    }> = [];

    for (const topic of this.config.topics) {
      try {
        const stats = await this.trendRepository.getTopicStats(topic, days);
        results.push({
          topic,
          trendCount: stats.totalTrends,
          averageEngagement: stats.averageEngagement,
          topVideo: stats.topVideo
        });
      } catch (error) {
        console.error(`Failed to get stats for topic ${topic}:`, error);
      }
    }

    return results
      .sort((a, b) => b.averageEngagement - a.averageEngagement)
      .slice(0, limit);
  }

  async predictTrendPotential(videoData: {
    title: string;
    description: string;
    keywords: string[];
    categoryId: string;
  }): Promise<{
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  }> {
    const factors: Record<string, number> = {};
    const recommendations: string[] = [];

    // Analyze title effectiveness
    const titleScore = this.analyzeTitleEffectiveness(videoData.title);
    factors.titleEffectiveness = titleScore;

    if (titleScore < 0.6) {
      recommendations.push('Consider making the title more engaging with numbers or emotional words');
    }

    // Check keyword relevance
    const keywordScore = await this.analyzeKeywordRelevance(videoData.keywords);
    factors.keywordRelevance = keywordScore;

    if (keywordScore < 0.5) {
      recommendations.push('Include more trending keywords related to your topic');
    }

    // Analyze description quality
    const descriptionScore = this.analyzeDescriptionQuality(videoData.description);
    factors.descriptionQuality = descriptionScore;

    if (descriptionScore < 0.7) {
      recommendations.push('Improve description with more relevant keywords and clear structure');
    }

    // Calculate overall score
    const overallScore = (titleScore * 0.4 + keywordScore * 0.4 + descriptionScore * 0.2);

    return {
      score: Math.round(overallScore * 100) / 100,
      factors,
      recommendations
    };
  }

  private analyzeTitleEffectiveness(title: string): number {
    let score = 0.5; // Base score

    // Check for engaging elements
    if (/\d+/.test(title)) score += 0.1; // Contains numbers
    if (/[!?]/.test(title)) score += 0.1; // Contains exclamation or question marks
    if (title.length >= 40 && title.length <= 70) score += 0.1; // Optimal length
    if (/\b(best|top|amazing|incredible|ultimate|secret)\b/i.test(title)) score += 0.1; // Power words
    if (/\b(how to|tutorial|guide|tips)\b/i.test(title)) score += 0.1; // Educational keywords

    return Math.min(score, 1.0);
  }

  private async analyzeKeywordRelevance(keywords: string[]): Promise<number> {
    if (keywords.length === 0) return 0;

    let relevantCount = 0;
    
    // Check against recent trending keywords
    for (const topic of this.config.topics) {
      try {
        const recentTrends = await this.trendRepository.getRecentTrends(24, 50);
        const trendingKeywords = recentTrends.flatMap(trend => trend.keywords);
        
        relevantCount += keywords.filter(keyword => 
          trendingKeywords.some(trending => 
            trending.toLowerCase().includes(keyword.toLowerCase())
          )
        ).length;
      } catch (error) {
        console.error('Failed to analyze keyword relevance:', error);
      }
    }

    return Math.min(relevantCount / keywords.length, 1.0);
  }

  private analyzeDescriptionQuality(description: string): number {
    let score = 0.3; // Base score

    if (description.length >= 100) score += 0.2; // Adequate length
    if (description.length >= 200) score += 0.1; // Good length
    if (/https?:\/\//.test(description)) score += 0.1; // Contains links
    if (/#\w+/.test(description)) score += 0.1; // Contains hashtags
    if (/\b(subscribe|like|comment|share)\b/i.test(description)) score += 0.1; // Call to action
    if (description.split('\n').length >= 3) score += 0.1; // Well structured

    return Math.min(score, 1.0);
  }
}