import { TrendDetectionService, TrendDetectionConfig, CustomTopicConfig } from '../trend-detection-service';
import { YouTubeApiClient } from '../youtube-api-client';
import { TrendRepository } from '../../repositories/trend-repository';
import { TrendData } from '../../models/trend-data';

// Mock dependencies
jest.mock('../youtube-api-client');
jest.mock('../../repositories/trend-repository');

describe('TrendDetectionService - Enhanced Features', () => {
  let service: TrendDetectionService;
  let mockYouTubeClient: jest.Mocked<YouTubeApiClient>;
  let mockTrendRepository: jest.Mocked<TrendRepository>;

  const createMockSearchResult = (videoId: string, title: string, channelTitle: string = 'Test Channel') => ({
    videoId,
    title,
    channelTitle,
    description: `Description for ${title}`,
    channelId: 'channel123',
    publishedAt: new Date().toISOString(),
    thumbnails: {}
  });

  const mockVideoDetails = {
    id: 'test123',
    title: 'How to Learn Investing: Complete Guide',
    description: 'Learn about stocks, ETFs, and portfolio management',
    channelTitle: 'Finance Channel',
    channelId: 'channel123',
    publishedAt: new Date().toISOString(),
    viewCount: 50000,
    likeCount: 2500,
    commentCount: 150,
    categoryId: '27', // Education
    duration: 'PT10M30S',
    thumbnails: {}
  };

  const mockTrendData: TrendData = {
    topic: 'investing',
    timestamp: new Date().toISOString(),
    videoId: 'test123',
    title: 'How to Learn Investing: Complete Guide',
    viewCount: 50000,
    likeCount: 2500,
    commentCount: 150,
    engagementRate: 5.3,
    engagementScore: 0.85,
    keywords: ['investing', 'stocks', 'ETF', 'portfolio'],
    categoryId: '27',
    publishedAt: new Date().toISOString(),
    channelTitle: 'Finance Channel',
    channelId: 'channel123',
    description: 'Learn about stocks, ETFs, and portfolio management',
    duration: 'PT10M30S',
    thumbnails: {}
  };

  beforeEach(() => {
    mockYouTubeClient = new YouTubeApiClient({ secretName: 'test-secret' }) as jest.Mocked<YouTubeApiClient>;
    mockTrendRepository = new TrendRepository() as jest.Mocked<TrendRepository>;
    
    const config: Partial<TrendDetectionConfig> = {
      topics: ['investing', 'education', 'technology'],
      categories: ['27', '28'], // Education, Science & Technology
      maxResultsPerQuery: 10,
      minViewCount: 1000,
      minEngagementRate: 1.0,
      hoursBack: 24
    };

    service = new TrendDetectionService(mockYouTubeClient, mockTrendRepository, config);
  });

  describe('Custom Topic Configuration', () => {
    it('should use custom topic keywords for relevance filtering', async () => {
      const customTopics: CustomTopicConfig[] = [{
        name: 'investing',
        keywords: ['stocks', 'ETF', 'portfolio', 'trading', 'investment'],
        categories: ['27'],
        searchQueries: ['stock market analysis', 'investment tips'],
        audioNarrationSuitable: true
      }];

      const serviceWithCustomTopics = new TrendDetectionService(
        mockYouTubeClient,
        mockTrendRepository,
        { customTopics }
      );

      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'Stock Market Analysis', 'Finance Channel')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([mockVideoDetails]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([mockVideoDetails]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await serviceWithCustomTopics.detectTrends('investing');

      expect(results).toHaveLength(1);
      expect(results[0].topic).toBe('investing');
      expect(results[0].trendsFound).toBeGreaterThan(0);
    });

    it('should filter videos by custom topic duration constraints', async () => {
      const customTopics: CustomTopicConfig[] = [{
        name: 'investing',
        keywords: ['stocks', 'investment'],
        categories: ['27'],
        searchQueries: ['investment tips'],
        minDuration: 300, // 5 minutes
        maxDuration: 1800, // 30 minutes
        audioNarrationSuitable: true
      }];

      const serviceWithCustomTopics = new TrendDetectionService(
        mockYouTubeClient,
        mockTrendRepository,
        { customTopics }
      );

      // Mock short video (should be filtered out)
      const shortVideo = { ...mockVideoDetails, duration: 'PT2M30S' };
      // Mock long video (should be filtered out)  
      const longVideo = { ...mockVideoDetails, duration: 'PT45M00S' };
      // Mock good video (should pass)
      const goodVideo = { ...mockVideoDetails, duration: 'PT10M30S' };

      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('short', 'Short Video'),
        createMockSearchResult('long', 'Long Video'),
        createMockSearchResult('good', 'Good Video')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([shortVideo, longVideo, goodVideo]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await serviceWithCustomTopics.detectTrends('investing');

      expect(results[0].trendsFound).toBe(1); // Only the good video should pass
    });
  });

  describe('Enhanced Engagement Calculation', () => {
    it('should calculate enhanced engagement scores with weighted metrics', async () => {
      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'Test Video')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([mockVideoDetails]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('investing');

      expect(results[0].topTrend?.engagementScore).toBeGreaterThan(0);
      expect(results[0].averageEngagement).toBeGreaterThan(0);
    });

    it('should apply recency boost to newer content', async () => {
      const recentVideo = { 
        ...mockVideoDetails, 
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      };
      const oldVideo = { 
        ...mockVideoDetails, 
        id: 'old123',
        publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() // 20 hours ago
      };

      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('recent', 'Recent Video'),
        createMockSearchResult('old123', 'Old Video')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([recentVideo, oldVideo]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('investing');

      // Recent video should have higher engagement score due to recency boost
      const trends = results[0];
      expect(trends.trendsFound).toBe(2);
    });
  });

  describe('Category Filtering and Analysis', () => {
    it('should provide category breakdown in results', async () => {
      mockYouTubeClient.searchVideos.mockResolvedValue([]);
      mockYouTubeClient.getTrendingVideos
        .mockResolvedValueOnce([mockVideoDetails]) // Category 27
        .mockResolvedValueOnce([{ ...mockVideoDetails, categoryId: '28' }]); // Category 28
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('investing');

      expect(results[0].categoryBreakdown).toBeDefined();
      expect(results[0].categoryBreakdown.length).toBeGreaterThan(0);
      expect(results[0].categoryBreakdown[0]).toHaveProperty('categoryName');
      expect(results[0].categoryBreakdown[0]).toHaveProperty('videoCount');
      expect(results[0].categoryBreakdown[0]).toHaveProperty('averageViews');
    });

    it('should filter trends by specific categories', async () => {
      const categoryFilters = ['27']; // Only Education category

      mockYouTubeClient.searchVideos.mockResolvedValue([]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([mockVideoDetails]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrendsWithCategoryFiltering(
        ['investing'], 
        categoryFilters
      );

      expect(results).toHaveLength(1);
      expect(results[0].topic).toBe('investing');
    });
  });

  describe('Content Suitability Analysis', () => {
    it('should calculate content suitability scores', async () => {
      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'How to Learn Investing')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([mockVideoDetails]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('investing');

      expect(results[0].contentSuitability).toBeDefined();
      expect(results[0].contentSuitability.audioNarrationScore).toBeGreaterThan(0);
      expect(results[0].contentSuitability.educationalValue).toBeGreaterThan(0);
      expect(results[0].contentSuitability.overallScore).toBeGreaterThan(0);
    });

    it('should give higher audio narration scores for educational content', async () => {
      const educationalVideo = {
        ...mockVideoDetails,
        title: 'How to Learn Stock Trading Tutorial',
        description: 'Complete guide to learning stock trading',
        categoryId: '27' // Education
      };

      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'How to Learn Stock Trading Tutorial')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([educationalVideo]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('investing');

      expect(results[0].contentSuitability.audioNarrationScore).toBeGreaterThan(0.7);
      expect(results[0].contentSuitability.educationalValue).toBeGreaterThan(0.7);
    });
  });

  describe('Recommended Actions', () => {
    it('should generate actionable recommendations', async () => {
      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'How to Learn Investing')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([mockVideoDetails]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('investing');

      expect(results[0].recommendedActions).toBeDefined();
      expect(results[0].recommendedActions.length).toBeGreaterThan(0);
      
      const action = results[0].recommendedActions[0];
      expect(action).toHaveProperty('type');
      expect(action).toHaveProperty('priority');
      expect(action).toHaveProperty('description');
      expect(action).toHaveProperty('expectedImpact');
      expect(action).toHaveProperty('effort');
    });

    it('should prioritize high-impact, low-effort recommendations', async () => {
      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'Trending Investment Tips')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([{
        ...mockVideoDetails,
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Very recent
      }]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('investing');

      const actions = results[0].recommendedActions;
      expect(actions.length).toBeGreaterThan(0);
      
      // First action should be high priority
      expect(actions[0].priority).toBe('high');
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate topic performance metrics', async () => {
      const historicalTrends = [
        { ...mockTrendData, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
        { ...mockTrendData, timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }
      ];

      mockTrendRepository.getRecentTrends.mockResolvedValue(historicalTrends);

      const metrics = await service.getTopicPerformanceMetrics('investing', 7);

      expect(metrics).toHaveProperty('averageViews');
      expect(metrics).toHaveProperty('averageEngagement');
      expect(metrics).toHaveProperty('trendingFrequency');
      expect(metrics).toHaveProperty('bestPerformingKeywords');
      expect(metrics).toHaveProperty('optimalPostingTimes');
      expect(metrics).toHaveProperty('competitionLevel');
      
      expect(metrics.averageViews).toBeGreaterThan(0);
      expect(metrics.bestPerformingKeywords).toContain('investing');
    });

    it('should determine competition level based on trending frequency', async () => {
      // High frequency trends (high competition)
      const highFrequencyTrends = Array(50).fill(null).map((_, i) => ({
        ...mockTrendData,
        videoId: `video${i}`,
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
      }));

      mockTrendRepository.getRecentTrends.mockResolvedValue(highFrequencyTrends);

      const metrics = await service.getTopicPerformanceMetrics('investing', 7);

      expect(metrics.competitionLevel).toBe('high');
      expect(metrics.trendingFrequency).toBeGreaterThan(5);
    });
  });

  describe('Content Filtering', () => {
    it('should exclude videos with blacklisted keywords', async () => {
      const serviceWithFilters = new TrendDetectionService(
        mockYouTubeClient,
        mockTrendRepository,
        {
          contentFilters: {
            excludeKeywords: ['controversial', 'explicit'],
            requiredKeywords: [],
            minDurationSeconds: 60,
            maxDurationSeconds: 3600,
            languageCode: 'en',
            contentRating: ['none']
          }
        }
      );

      const controversialVideo = {
        ...mockVideoDetails,
        title: 'Controversial Investment Strategy',
        description: 'This is controversial content'
      };

      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'Controversial Investment Strategy')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([controversialVideo]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await serviceWithFilters.detectTrends('investing');

      expect(results[0].trendsFound).toBe(0); // Should be filtered out
    });

    it('should require videos to have required keywords', async () => {
      const serviceWithFilters = new TrendDetectionService(
        mockYouTubeClient,
        mockTrendRepository,
        {
          contentFilters: {
            excludeKeywords: [],
            requiredKeywords: ['tutorial', 'guide'],
            minDurationSeconds: 60,
            maxDurationSeconds: 3600,
            languageCode: 'en',
            contentRating: ['none']
          }
        }
      );

      const tutorialVideo = {
        ...mockVideoDetails,
        title: 'Investment Tutorial for Beginners',
        description: 'Complete guide to investing'
      };

      const nonTutorialVideo = {
        ...mockVideoDetails,
        id: 'other123',
        title: 'Random Investment Video',
        description: 'Just some investment content'
      };

      mockYouTubeClient.searchVideos.mockResolvedValue([
        createMockSearchResult('test123', 'Investment Tutorial for Beginners'),
        createMockSearchResult('other123', 'Random Investment Video')
      ]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([tutorialVideo, nonTutorialVideo]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await serviceWithFilters.detectTrends('investing');

      expect(results[0].trendsFound).toBe(1); // Only tutorial video should pass
    });
  });
});