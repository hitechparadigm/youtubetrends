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
  customTopics?: CustomTopicConfig[];
  engagementWeights?: EngagementWeights;
  contentFilters?: ContentFilters;
}

export interface CustomTopicConfig {
  name: string;
  keywords: string[];
  categories: string[];
  searchQueries: string[];
  minDuration?: number;
  maxDuration?: number;
  audioNarrationSuitable?: boolean;
}

export interface EngagementWeights {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  subscriberGrowth: number;
  watchTime: number;
}

export interface ContentFilters {
  excludeKeywords: string[];
  requiredKeywords: string[];
  minDurationSeconds: number;
  maxDurationSeconds: number;
  languageCode: string;
  contentRating: string[];
}

export interface TrendDetectionResult {
  topic: string;
  trendsFound: number;
  topTrend: TrendData | null;
  averageEngagement: number;
  totalViews: number;
  keywords: string[];
  categoryBreakdown: CategoryBreakdown[];
  engagementTrends: EngagementTrend[];
  contentSuitability: ContentSuitabilityScore;
  recommendedActions: RecommendedAction[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  videoCount: number;
  averageViews: number;
  averageEngagement: number;
  topVideo: TrendData | null;
}

export interface EngagementTrend {
  timeframe: string;
  averageEngagement: number;
  trendDirection: 'up' | 'down' | 'stable';
  confidence: number;
}

export interface ContentSuitabilityScore {
  audioNarrationScore: number;
  visualContentScore: number;
  educationalValue: number;
  viralPotential: number;
  monetizationFriendly: number;
  overallScore: number;
}

export interface RecommendedAction {
  type: 'content_creation' | 'timing' | 'optimization' | 'targeting';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: number;
  effort: number;
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
      topics: config.topics || ['education', 'investing', 'tourism', 'technology', 'health', 'finance'],
      regions: config.regions || ['US', 'GB', 'CA', 'AU'],
      categories: config.categories || ['19', '22', '23', '27', '28'], // Travel & Events, People & Blogs, Comedy, Education, Science & Technology
      maxResultsPerQuery: config.maxResultsPerQuery || 25,
      minViewCount: config.minViewCount || 1000,
      minEngagementRate: config.minEngagementRate || 1.0,
      hoursBack: config.hoursBack || 24,
      customTopics: config.customTopics || this.getDefaultCustomTopics(),
      engagementWeights: config.engagementWeights || this.getDefaultEngagementWeights(),
      contentFilters: config.contentFilters || this.getDefaultContentFilters()
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
          keywords: [],
          categoryBreakdown: [],
          engagementTrends: [],
          contentSuitability: {
            audioNarrationScore: 0,
            visualContentScore: 0,
            educationalValue: 0,
            viralPotential: 0,
            monetizationFriendly: 0,
            overallScore: 0
          },
          recommendedActions: []
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
    const categoryStats: Map<string, CategoryBreakdown> = new Map();

    // Get custom topic configuration
    const customTopic = this.config.customTopics?.find(ct => ct.name === topic);
    const searchStrategies = customTopic?.searchQueries || [
      `${topic} trending`,
      `${topic} viral`,
      `${topic} 2024`,
      `best ${topic}`,
      `${topic} tips`
    ];

    // Use topic-specific categories if available
    const relevantCategories = customTopic?.categories || this.config.categories;

    console.log(`Analyzing topic: ${topic} with ${searchStrategies.length} search strategies and ${relevantCategories.length} categories`);

    // Search for trending content using topic-specific strategies
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
            .filter(video => this.isValidTrend(video, customTopic))
            .map(video => this.convertToTrendData(video, topic));

          trends.push(...validTrends);
        }

        // Rate limiting delay
        await this.sleep(500);
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error);
      }
    }

    // Check trending videos in relevant categories
    for (const categoryId of relevantCategories) {
      try {
        const trendingVideos = await this.youtubeClient.getTrendingVideos('US', categoryId, 20);
        
        const relevantTrending = trendingVideos
          .filter(video => this.isRelevantToTopic(video, topic, customTopic))
          .filter(video => this.isValidTrend(video, customTopic))
          .map(video => this.convertToTrendData(video, topic));

        trends.push(...relevantTrending);
        
        // Update category statistics
        this.updateCategoryStats(categoryStats, categoryId, relevantTrending);
        
        await this.sleep(500);
      } catch (error) {
        console.error(`Failed to get trending videos for category ${categoryId}:`, error);
      }
    }

    // Remove duplicates and calculate enhanced engagement scores
    const uniqueTrends = this.removeDuplicateTrends(trends);
    const enhancedTrends = uniqueTrends.map(trend => ({
      ...trend,
      engagementScore: this.calculateEnhancedEngagementScore(trend)
    }));
    
    const sortedTrends = enhancedTrends.sort((a, b) => b.engagementScore - a.engagementScore);

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

    // Generate category breakdown
    const categoryBreakdown = Array.from(categoryStats.values());

    // Analyze engagement trends
    const engagementTrends = await this.analyzeEngagementTrends(topic, sortedTrends);

    // Calculate content suitability
    const contentSuitability = this.calculateContentSuitability(sortedTrends, customTopic);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(sortedTrends, contentSuitability, customTopic);

    return {
      topic,
      trendsFound: sortedTrends.length,
      topTrend: sortedTrends[0] || null,
      averageEngagement: sortedTrends.length > 0 ? totalEngagement / sortedTrends.length : 0,
      totalViews,
      keywords: topKeywords,
      categoryBreakdown,
      engagementTrends,
      contentSuitability,
      recommendedActions
    };
  }

  private isValidTrend(video: YouTubeVideoDetails, customTopic?: CustomTopicConfig): boolean {
    const basicValidation = (
      video.viewCount >= this.config.minViewCount &&
      this.calculateEngagementRate(video) >= this.config.minEngagementRate &&
      this.isRecentEnough(video.publishedAt)
    );

    if (!basicValidation) return false;

    // Apply content filters
    if (this.config.contentFilters) {
      const filters = this.config.contentFilters;
      
      // Check excluded keywords
      const contentText = `${video.title} ${video.description}`.toLowerCase();
      if (filters.excludeKeywords.some(keyword => contentText.includes(keyword.toLowerCase()))) {
        return false;
      }

      // Check required keywords
      if (filters.requiredKeywords.length > 0) {
        if (!filters.requiredKeywords.some(keyword => contentText.includes(keyword.toLowerCase()))) {
          return false;
        }
      }

      // Check duration constraints
      const durationSeconds = this.parseDurationToSeconds(video.duration);
      if (durationSeconds < filters.minDurationSeconds || durationSeconds > filters.maxDurationSeconds) {
        return false;
      }
    }

    // Apply custom topic constraints
    if (customTopic) {
      const durationSeconds = this.parseDurationToSeconds(video.duration);
      if (customTopic.minDuration && durationSeconds < customTopic.minDuration) {
        return false;
      }
      if (customTopic.maxDuration && durationSeconds > customTopic.maxDuration) {
        return false;
      }
    }

    return true;
  }

  private isRelevantToTopic(video: YouTubeVideoDetails, topic: string, customTopic?: CustomTopicConfig): boolean {
    const searchText = `${video.title} ${video.description}`.toLowerCase();
    
    // Use custom topic keywords if available
    const topicKeywords = customTopic?.keywords || this.getTopicKeywords(topic);
    
    // Calculate relevance score
    let relevanceScore = 0;
    let keywordMatches = 0;

    topicKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (searchText.includes(keywordLower)) {
        keywordMatches++;
        // Give higher score for title matches
        if (video.title.toLowerCase().includes(keywordLower)) {
          relevanceScore += 2;
        } else {
          relevanceScore += 1;
        }
      }
    });

    // Require at least 1 keyword match and minimum relevance score
    return keywordMatches > 0 && relevanceScore >= 1;
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

  private getDefaultCustomTopics(): CustomTopicConfig[] {
    return [
      {
        name: 'education',
        keywords: ['learn', 'tutorial', 'course', 'lesson', 'study', 'knowledge', 'skill'],
        categories: ['27'], // Education
        searchQueries: ['how to learn', 'educational content', 'online course', 'study tips'],
        minDuration: 300, // 5 minutes
        maxDuration: 1800, // 30 minutes
        audioNarrationSuitable: true
      },
      {
        name: 'investing',
        keywords: ['stocks', 'investment', 'portfolio', 'ETF', 'trading', 'finance', 'market'],
        categories: ['25'], // News & Politics (closest to finance)
        searchQueries: ['stock market analysis', 'investment tips', 'portfolio management', 'ETF review'],
        minDuration: 600, // 10 minutes
        maxDuration: 2400, // 40 minutes
        audioNarrationSuitable: true
      },
      {
        name: 'tourism',
        keywords: ['travel', 'vacation', 'destination', 'tourist', 'adventure', 'explore'],
        categories: ['19'], // Travel & Events
        searchQueries: ['travel guide', 'vacation destination', 'travel tips', 'adventure travel'],
        minDuration: 300, // 5 minutes
        maxDuration: 1200, // 20 minutes
        audioNarrationSuitable: true
      },
      {
        name: 'technology',
        keywords: ['tech', 'gadget', 'software', 'app', 'innovation', 'digital', 'AI'],
        categories: ['28'], // Science & Technology
        searchQueries: ['tech review', 'new technology', 'gadget unboxing', 'software tutorial'],
        minDuration: 300, // 5 minutes
        maxDuration: 1800, // 30 minutes
        audioNarrationSuitable: true
      },
      {
        name: 'health',
        keywords: ['health', 'fitness', 'wellness', 'nutrition', 'exercise', 'medical'],
        categories: ['26'], // Howto & Style (closest to health)
        searchQueries: ['health tips', 'fitness routine', 'nutrition advice', 'wellness guide'],
        minDuration: 300, // 5 minutes
        maxDuration: 1500, // 25 minutes
        audioNarrationSuitable: true
      },
      {
        name: 'finance',
        keywords: ['money', 'budget', 'savings', 'debt', 'credit', 'financial planning'],
        categories: ['25'], // News & Politics
        searchQueries: ['personal finance', 'budgeting tips', 'financial advice', 'money management'],
        minDuration: 600, // 10 minutes
        maxDuration: 2100, // 35 minutes
        audioNarrationSuitable: true
      }
    ];
  }

  private getDefaultEngagementWeights(): EngagementWeights {
    return {
      viewCount: 0.3,
      likeCount: 0.25,
      commentCount: 0.25,
      shareCount: 0.1,
      subscriberGrowth: 0.05,
      watchTime: 0.05
    };
  }

  private getDefaultContentFilters(): ContentFilters {
    return {
      excludeKeywords: ['explicit', 'adult', 'nsfw', 'controversial'],
      requiredKeywords: [],
      minDurationSeconds: 60, // 1 minute minimum
      maxDurationSeconds: 3600, // 1 hour maximum
      languageCode: 'en',
      contentRating: ['none', 'mild']
    };
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

  private calculateEnhancedEngagementScore(trend: TrendData): number {
    const weights = this.config.engagementWeights!;
    
    // Normalize metrics to 0-1 scale based on typical ranges
    const normalizedViews = Math.min(trend.viewCount / 1000000, 1); // Cap at 1M views
    const normalizedLikes = Math.min(trend.likeCount / 50000, 1); // Cap at 50K likes
    const normalizedComments = Math.min(trend.commentCount / 5000, 1); // Cap at 5K comments
    
    // Calculate engagement rate
    const engagementRate = trend.viewCount > 0 ? 
      (trend.likeCount + trend.commentCount) / trend.viewCount : 0;
    
    // Calculate recency boost (newer content gets higher score)
    const hoursOld = (Date.now() - new Date(trend.publishedAt).getTime()) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 1 - (hoursOld / (this.config.hoursBack * 2)));
    
    // Calculate weighted score
    const baseScore = (
      normalizedViews * weights.viewCount +
      normalizedLikes * weights.likeCount +
      normalizedComments * weights.commentCount +
      engagementRate * 100 * 0.3 // Engagement rate contribution
    );
    
    // Apply recency boost
    return baseScore * (1 + recencyBoost * 0.2);
  }

  private updateCategoryStats(
    categoryStats: Map<string, CategoryBreakdown>,
    categoryId: string,
    trends: TrendData[]
  ): void {
    if (trends.length === 0) return;

    const existing = categoryStats.get(categoryId);
    const totalViews = trends.reduce((sum, trend) => sum + trend.viewCount, 0);
    const totalEngagement = trends.reduce((sum, trend) => sum + trend.engagementRate, 0);
    const topVideo = trends.sort((a, b) => b.engagementScore - a.engagementScore)[0];

    const categoryBreakdown: CategoryBreakdown = {
      categoryId,
      categoryName: this.getCategoryName(categoryId),
      videoCount: (existing?.videoCount || 0) + trends.length,
      averageViews: existing ? 
        ((existing.averageViews * existing.videoCount) + totalViews) / (existing.videoCount + trends.length) :
        totalViews / trends.length,
      averageEngagement: existing ?
        ((existing.averageEngagement * existing.videoCount) + totalEngagement) / (existing.videoCount + trends.length) :
        totalEngagement / trends.length,
      topVideo: !existing || topVideo.engagementScore > (existing.topVideo?.engagementScore || 0) ? 
        topVideo : existing.topVideo
    };

    categoryStats.set(categoryId, categoryBreakdown);
  }

  private getCategoryName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
      '1': 'Film & Animation',
      '2': 'Autos & Vehicles',
      '10': 'Music',
      '15': 'Pets & Animals',
      '17': 'Sports',
      '19': 'Travel & Events',
      '20': 'Gaming',
      '22': 'People & Blogs',
      '23': 'Comedy',
      '24': 'Entertainment',
      '25': 'News & Politics',
      '26': 'Howto & Style',
      '27': 'Education',
      '28': 'Science & Technology'
    };
    
    return categoryNames[categoryId] || `Category ${categoryId}`;
  }

  private async analyzeEngagementTrends(topic: string, currentTrends: TrendData[]): Promise<EngagementTrend[]> {
    const trends: EngagementTrend[] = [];
    
    try {
      // Get historical data for comparison
      const historicalTrends = await this.trendRepository.getRecentTrends(168, 100); // Last 7 days
      const topicHistorical = historicalTrends.filter(trend => trend.topic === topic);
      
      if (topicHistorical.length > 0) {
        // Calculate 24-hour trend
        const last24h = topicHistorical.filter(trend => 
          new Date(trend.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
        );
        
        const current24hAvg = currentTrends.reduce((sum, trend) => sum + trend.engagementRate, 0) / currentTrends.length;
        const historical24hAvg = last24h.reduce((sum, trend) => sum + trend.engagementRate, 0) / Math.max(last24h.length, 1);
        
        trends.push({
          timeframe: '24h',
          averageEngagement: current24hAvg,
          trendDirection: current24hAvg > historical24hAvg * 1.1 ? 'up' : 
                         current24hAvg < historical24hAvg * 0.9 ? 'down' : 'stable',
          confidence: Math.min(currentTrends.length / 10, 1) // Higher confidence with more data points
        });

        // Calculate 7-day trend
        const historical7dAvg = topicHistorical.reduce((sum, trend) => sum + trend.engagementRate, 0) / topicHistorical.length;
        
        trends.push({
          timeframe: '7d',
          averageEngagement: historical7dAvg,
          trendDirection: current24hAvg > historical7dAvg * 1.2 ? 'up' : 
                         current24hAvg < historical7dAvg * 0.8 ? 'down' : 'stable',
          confidence: Math.min(topicHistorical.length / 50, 1)
        });
      }
    } catch (error) {
      console.error('Failed to analyze engagement trends:', error);
    }
    
    return trends;
  }

  private calculateContentSuitability(trends: TrendData[], customTopic?: CustomTopicConfig): ContentSuitabilityScore {
    if (trends.length === 0) {
      return {
        audioNarrationScore: 0,
        visualContentScore: 0,
        educationalValue: 0,
        viralPotential: 0,
        monetizationFriendly: 0,
        overallScore: 0
      };
    }

    // Audio narration suitability
    let audioNarrationScore = customTopic?.audioNarrationSuitable ? 0.8 : 0.5;
    
    // Check for educational/informational content indicators
    const educationalKeywords = ['how to', 'tutorial', 'guide', 'learn', 'explain', 'tips', 'advice'];
    const hasEducationalContent = trends.some(trend => 
      educationalKeywords.some(keyword => 
        trend.title.toLowerCase().includes(keyword) || 
        (trend.description && trend.description.toLowerCase().includes(keyword))
      )
    );
    
    if (hasEducationalContent) {
      audioNarrationScore += 0.2;
    }

    // Visual content score based on category and content type
    const visualCategories = ['19', '1', '20', '17']; // Travel, Film, Gaming, Sports
    const hasVisualContent = trends.some(trend => 
      visualCategories.includes(trend.categoryId) ||
      ['visual', 'video', 'watch', 'see', 'look'].some(keyword =>
        trend.title.toLowerCase().includes(keyword)
      )
    );
    
    const visualContentScore = hasVisualContent ? 0.8 : 0.6;

    // Educational value
    const educationalCategories = ['27', '28', '26']; // Education, Science & Tech, Howto & Style
    const educationalValue = trends.some(trend => 
      educationalCategories.includes(trend.categoryId)
    ) ? 0.9 : hasEducationalContent ? 0.7 : 0.4;

    // Viral potential based on engagement metrics
    const avgEngagement = trends.reduce((sum, trend) => sum + trend.engagementRate, 0) / trends.length;
    const viralPotential = Math.min(avgEngagement / 5, 1); // Normalize to 0-1

    // Monetization friendliness
    const monetizationFriendlyCategories = ['27', '28', '26', '22', '25']; // Education, Tech, Howto, Blogs, News
    const monetizationFriendly = trends.some(trend => 
      monetizationFriendlyCategories.includes(trend.categoryId)
    ) ? 0.8 : 0.6;

    const overallScore = (
      audioNarrationScore * 0.25 +
      visualContentScore * 0.2 +
      educationalValue * 0.2 +
      viralPotential * 0.2 +
      monetizationFriendly * 0.15
    );

    return {
      audioNarrationScore: Math.min(audioNarrationScore, 1),
      visualContentScore,
      educationalValue,
      viralPotential,
      monetizationFriendly,
      overallScore
    };
  }

  private generateRecommendedActions(
    trends: TrendData[], 
    suitability: ContentSuitabilityScore, 
    customTopic?: CustomTopicConfig
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    // Content creation recommendations
    if (suitability.audioNarrationScore > 0.7) {
      actions.push({
        type: 'content_creation',
        priority: 'high',
        description: 'Create content with high-quality audio narration - this topic is well-suited for voice-over content',
        expectedImpact: 0.8,
        effort: 0.6
      });
    }

    if (suitability.educationalValue > 0.7) {
      actions.push({
        type: 'content_creation',
        priority: 'high',
        description: 'Focus on educational content format with clear explanations and structured information',
        expectedImpact: 0.9,
        effort: 0.7
      });
    }

    // Timing recommendations
    if (trends.length > 0) {
      const avgHoursOld = trends.reduce((sum, trend) => {
        const hoursOld = (Date.now() - new Date(trend.publishedAt).getTime()) / (1000 * 60 * 60);
        return sum + hoursOld;
      }, 0) / trends.length;

      if (avgHoursOld < 12) {
        actions.push({
          type: 'timing',
          priority: 'high',
          description: 'Act quickly - trending content in this topic is very recent, create content within 24 hours',
          expectedImpact: 0.9,
          effort: 0.8
        });
      }
    }

    // Optimization recommendations
    if (suitability.viralPotential > 0.6) {
      actions.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Optimize for viral potential with engaging thumbnails and compelling titles',
        expectedImpact: 0.7,
        effort: 0.4
      });
    }

    // Targeting recommendations
    if (customTopic && trends.length > 5) {
      const topKeywords = this.getTopKeywords(
        trends.flatMap(trend => trend.keywords), 
        5
      );
      
      actions.push({
        type: 'targeting',
        priority: 'medium',
        description: `Target these trending keywords: ${topKeywords.join(', ')}`,
        expectedImpact: 0.6,
        effort: 0.3
      });
    }

    return actions.sort((a, b) => {
      // Sort by priority first, then by impact/effort ratio
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      const aRatio = a.expectedImpact / a.effort;
      const bRatio = b.expectedImpact / b.effort;
      return bRatio - aRatio;
    });
  }

  private parseDurationToSeconds(duration: string): number {
    // Parse ISO 8601 duration format (PT#M#S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  async detectTrendsWithCategoryFiltering(
    topics: string[],
    categoryFilters: string[] = [],
    options: TrendAnalysisOptions = {}
  ): Promise<TrendDetectionResult[]> {
    const results: TrendDetectionResult[] = [];
    
    // Temporarily override categories if filters provided
    const originalCategories = this.config.categories;
    if (categoryFilters.length > 0) {
      this.config.categories = categoryFilters;
    }

    try {
      for (const topic of topics) {
        console.log(`Detecting trends for topic: ${topic} with category filters: ${categoryFilters.join(', ')}`);
        
        const result = await this.analyzeTopic(topic, options);
        results.push(result);
        
        // Rate limiting between topics
        await this.sleep(1000);
      }
    } finally {
      // Restore original categories
      this.config.categories = originalCategories;
    }

    return results;
  }

  async getTopicPerformanceMetrics(topic: string, days: number = 30): Promise<{
    averageViews: number;
    averageEngagement: number;
    trendingFrequency: number;
    bestPerformingKeywords: string[];
    optimalPostingTimes: string[];
    competitionLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      const historicalTrends = await this.trendRepository.getRecentTrends(days * 24, 1000);
      const topicTrends = historicalTrends.filter(trend => trend.topic === topic);
      
      if (topicTrends.length === 0) {
        return {
          averageViews: 0,
          averageEngagement: 0,
          trendingFrequency: 0,
          bestPerformingKeywords: [],
          optimalPostingTimes: [],
          competitionLevel: 'low'
        };
      }

      const averageViews = topicTrends.reduce((sum, trend) => sum + trend.viewCount, 0) / topicTrends.length;
      const averageEngagement = topicTrends.reduce((sum, trend) => sum + trend.engagementRate, 0) / topicTrends.length;
      const trendingFrequency = topicTrends.length / days;

      // Analyze keywords
      const allKeywords = topicTrends.flatMap(trend => trend.keywords);
      const bestPerformingKeywords = this.getTopKeywords(allKeywords, 10);

      // Analyze posting times (simplified - would need more sophisticated analysis in production)
      const postingHours = topicTrends.map(trend => new Date(trend.publishedAt).getHours());
      const hourCounts: Record<number, number> = {};
      postingHours.forEach(hour => {
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const optimalPostingTimes = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => `${hour}:00`);

      // Determine competition level
      const competitionLevel: 'low' | 'medium' | 'high' = 
        trendingFrequency > 5 ? 'high' :
        trendingFrequency > 2 ? 'medium' : 'low';

      return {
        averageViews,
        averageEngagement,
        trendingFrequency,
        bestPerformingKeywords,
        optimalPostingTimes,
        competitionLevel
      };
    } catch (error) {
      console.error(`Failed to get performance metrics for topic ${topic}:`, error);
      throw error;
    }
  }}
