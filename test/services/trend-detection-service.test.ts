import { TrendDetectionService } from '../../src/services/trend-detection-service';
import { YouTubeApiClient } from '../../src/services/youtube-api-client';
import { TrendRepository } from '../../src/repositories/trend-repository';

// Mock dependencies
jest.mock('../../src/services/youtube-api-client');
jest.mock('../../src/repositories/trend-repository');

describe('TrendDetectionService', () => {
  let service: TrendDetectionService;
  let mockYouTubeClient: jest.Mocked<YouTubeApiClient>;
  let mockTrendRepository: jest.Mocked<TrendRepository>;

  beforeEach(() => {
    mockYouTubeClient = {
      searchVideos: jest.fn(),
      getVideoDetails: jest.fn(),
      getTrendingVideos: jest.fn(),
      initialize: jest.fn(),
      uploadVideo: jest.fn(),
      getVideoCategories: jest.fn(),
      getQuotaUsage: jest.fn(),
      testConnection: jest.fn()
    } as any;

    mockTrendRepository = {
      saveTrends: jest.fn(),
      getTrendsByTopic: jest.fn(),
      getTopicStats: jest.fn(),
      getRecentTrends: jest.fn(),
      saveTrend: jest.fn(),
      getTopTrendsByEngagement: jest.fn(),
      getTrendAnalysis: jest.fn(),
      deleteTrendsByTopic: jest.fn(),
      getVideosBySourceTrend: jest.fn()
    } as any;

    service = new TrendDetectionService(
      mockYouTubeClient,
      mockTrendRepository,
      {
        topics: ['tourism', 'travel'],
        maxResultsPerQuery: 10,
        minViewCount: 1000,
        minEngagementRate: 1.0
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectTrends', () => {
    it('should detect trends for a specific topic', async () => {
      const mockSearchResults = [
        {
          videoId: 'test123',
          title: 'Amazing Tourism Destination',
          description: 'Best travel spots',
          channelTitle: 'Travel Channel',
          channelId: 'channel123',
          publishedAt: new Date().toISOString(),
          thumbnails: {}
        }
      ];

      const mockVideoDetails = [
        {
          id: 'test123',
          title: 'Amazing Tourism Destination',
          description: 'Best travel spots',
          channelTitle: 'Travel Channel',
          channelId: 'channel123',
          publishedAt: new Date().toISOString(),
          categoryId: '19',
          duration: 'PT5M30S',
          viewCount: 5000,
          likeCount: 250,
          commentCount: 50,
          thumbnails: {}
        }
      ];

      const mockTrendingVideos = [
        {
          id: 'trending456',
          title: 'Top Tourism Trends 2024',
          description: 'Latest tourism trends',
          channelTitle: 'Tourism Today',
          channelId: 'tourism-channel',
          publishedAt: new Date().toISOString(),
          categoryId: '19',
          duration: 'PT8M15S',
          viewCount: 15000,
          likeCount: 750,
          commentCount: 150,
          thumbnails: {}
        }
      ];

      mockYouTubeClient.searchVideos.mockResolvedValue(mockSearchResults);
      mockYouTubeClient.getVideoDetails.mockResolvedValue(mockVideoDetails);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue(mockTrendingVideos);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('tourism');

      expect(results).toHaveLength(1);
      expect(results[0].topic).toBe('tourism');
      expect(results[0].trendsFound).toBeGreaterThan(0);
      expect(mockYouTubeClient.searchVideos).toHaveBeenCalled();
      expect(mockYouTubeClient.getVideoDetails).toHaveBeenCalled();
      expect(mockYouTubeClient.getTrendingVideos).toHaveBeenCalled();
      expect(mockTrendRepository.saveTrends).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockYouTubeClient.searchVideos.mockRejectedValue(new Error('API Error'));
      mockYouTubeClient.getTrendingVideos.mockRejectedValue(new Error('API Error'));

      const results = await service.detectTrends('tourism');

      expect(results).toHaveLength(1);
      expect(results[0].topic).toBe('tourism');
      expect(results[0].trendsFound).toBe(0);
      expect(results[0].topTrend).toBeNull();
    });

    it('should detect trends for all configured topics when no specific topic provided', async () => {
      mockYouTubeClient.searchVideos.mockResolvedValue([]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);

      const results = await service.detectTrends();

      expect(results).toHaveLength(2); // tourism and travel
      expect(results.map(r => r.topic)).toEqual(['tourism', 'travel']);
    });
  });

  describe('getTopTrendingTopics', () => {
    it('should return top trending topics with stats', async () => {
      const mockStats = {
        totalTrends: 25,
        averageEngagement: 5.2,
        topVideo: {
          topic: 'tourism',
          timestamp: new Date().toISOString(),
          videoId: 'top123',
          title: 'Top Tourism Video',
          viewCount: 10000,
          likeCount: 500,
          commentCount: 100,
          engagementRate: 6.0,
          engagementScore: 0.06,
          keywords: ['tourism', 'travel'],
          categoryId: '19',
          publishedAt: new Date().toISOString(),
          channelTitle: 'Top Channel',
          channelId: 'top-channel'
        },
        trendingKeywords: ['tourism', 'travel', 'vacation']
      };

      mockTrendRepository.getTopicStats.mockResolvedValue(mockStats);

      const results = await service.getTopTrendingTopics(7, 5);

      expect(results).toHaveLength(2);
      expect(results[0].topic).toBeDefined();
      expect(results[0].trendCount).toBe(25);
      expect(results[0].averageEngagement).toBe(5.2);
      expect(mockTrendRepository.getTopicStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('predictTrendPotential', () => {
    it('should analyze video potential and provide recommendations', async () => {
      const videoData = {
        title: 'Top 10 Amazing Tourism Destinations You Must Visit!',
        description: 'Discover the most incredible tourism destinations around the world. From exotic beaches to mountain adventures, this comprehensive guide covers everything you need to know. Subscribe for more travel content!',
        keywords: ['tourism', 'travel', 'destinations', 'vacation'],
        categoryId: '19'
      };

      mockTrendRepository.getRecentTrends.mockResolvedValue([
        {
          topic: 'tourism',
          timestamp: new Date().toISOString(),
          videoId: 'recent123',
          title: 'Recent Tourism Video',
          viewCount: 5000,
          likeCount: 250,
          commentCount: 50,
          engagementRate: 6.0,
          engagementScore: 0.06,
          keywords: ['tourism', 'travel', 'destinations'],
          categoryId: '19',
          publishedAt: new Date().toISOString(),
          channelTitle: 'Recent Channel',
          channelId: 'recent-channel'
        }
      ]);

      const result = await service.predictTrendPotential(videoData);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors).toHaveProperty('titleEffectiveness');
      expect(result.factors).toHaveProperty('keywordRelevance');
      expect(result.factors).toHaveProperty('descriptionQuality');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide recommendations for poor content', async () => {
      const poorVideoData = {
        title: 'video',
        description: 'short',
        keywords: [],
        categoryId: '19'
      };

      mockTrendRepository.getRecentTrends.mockResolvedValue([]);

      const result = await service.predictTrendPotential(poorVideoData);

      expect(result.score).toBeLessThan(0.5);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => 
        rec.includes('title') || rec.includes('keywords') || rec.includes('description')
      )).toBe(true);
    });
  });

  describe('private methods via public interface', () => {
    it('should filter videos based on minimum requirements', async () => {
      const lowEngagementVideo = {
        videoId: 'low123',
        title: 'Low Engagement Video',
        description: 'Not popular',
        channelTitle: 'Small Channel',
        channelId: 'small123',
        publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days old
        thumbnails: {}
      };

      const goodVideo = {
        videoId: 'good123',
        title: 'High Engagement Tourism Video',
        description: 'Very popular tourism content',
        channelTitle: 'Popular Channel',
        channelId: 'popular123',
        publishedAt: new Date().toISOString(),
        thumbnails: {}
      };

      const lowEngagementDetails = {
        id: 'low123',
        title: 'Low Engagement Video',
        description: 'Not popular',
        channelTitle: 'Small Channel',
        channelId: 'small123',
        publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        categoryId: '19',
        duration: 'PT3M00S',
        viewCount: 500, // Below minimum
        likeCount: 5,
        commentCount: 1,
        thumbnails: {}
      };

      const goodDetails = {
        id: 'good123',
        title: 'High Engagement Tourism Video',
        description: 'Very popular tourism content',
        channelTitle: 'Popular Channel',
        channelId: 'popular123',
        publishedAt: new Date().toISOString(),
        categoryId: '19',
        duration: 'PT5M30S',
        viewCount: 5000, // Above minimum
        likeCount: 250,
        commentCount: 50,
        thumbnails: {}
      };

      mockYouTubeClient.searchVideos.mockResolvedValue([lowEngagementVideo, goodVideo]);
      mockYouTubeClient.getVideoDetails.mockResolvedValue([lowEngagementDetails, goodDetails]);
      mockYouTubeClient.getTrendingVideos.mockResolvedValue([]);
      mockTrendRepository.saveTrends.mockResolvedValue();

      const results = await service.detectTrends('tourism');

      expect(results[0].trendsFound).toBe(1); // Only the good video should pass filters
      expect(mockTrendRepository.saveTrends).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            videoId: 'good123'
          })
        ])
      );
    });
  });
});