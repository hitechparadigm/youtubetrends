import { TrendRepository } from '../../src/repositories/trend-repository';
import { TrendData, TrendDataModel } from '../../src/models/trend-data';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('TrendRepository', () => {
  let repository: TrendRepository;
  let mockClient: any;

  beforeEach(() => {
    // Mock DynamoDB client
    mockClient = {
      send: jest.fn()
    };

    // Mock the DynamoDBDocumentClient.from method
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockClient);

    repository = new TrendRepository({ region: 'us-east-1' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveTrend', () => {
    it('should save a trend to DynamoDB', async () => {
      const trend: TrendData = {
        topic: 'tourism',
        timestamp: '2024-01-01T00:00:00.000Z',
        videoId: 'test123',
        title: 'Test Video',
        viewCount: 1000,
        likeCount: 50,
        commentCount: 10,
        engagementRate: 6,
        engagementScore: 0.03,
        keywords: ['travel', 'vacation'],
        categoryId: '19',
        publishedAt: '2024-01-01T00:00:00.000Z',
        channelTitle: 'Test Channel',
        channelId: 'channel123'
      };

      mockClient.send.mockResolvedValue({});

      await repository.saveTrend(trend);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTrendsByTopic', () => {
    it('should retrieve trends by topic', async () => {
      const mockItems = [
        {
          topic: 'tourism',
          timestamp: '2024-01-01T00:00:00.000Z',
          videoId: 'test123',
          title: 'Test Video',
          viewCount: 1000,
          likeCount: 50,
          commentCount: 10,
          engagementRate: 6,
          engagementScore: 0.03,
          keywords: ['travel'],
          categoryId: '19',
          publishedAt: '2024-01-01T00:00:00.000Z',
          channelTitle: 'Test Channel',
          channelId: 'channel123'
        }
      ];

      mockClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.getTrendsByTopic('tourism');

      expect(result).toHaveLength(1);
      expect(result[0].topic).toBe('tourism');
      expect(result[0].videoId).toBe('test123');
    });

    it('should handle time range filters', async () => {
      mockClient.send.mockResolvedValue({ Items: [] });

      await repository.getTrendsByTopic('tourism', {
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-02T00:00:00.000Z'
      });

      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTopTrendsByEngagement', () => {
    it('should retrieve top trends by engagement score', async () => {
      const mockItems = [
        {
          topic: 'tourism',
          timestamp: '2024-01-01T00:00:00.000Z',
          videoId: 'test123',
          engagementScore: 0.05,
          title: 'High Engagement Video',
          viewCount: 1000,
          likeCount: 50,
          commentCount: 10,
          engagementRate: 6,
          keywords: ['travel'],
          categoryId: '19',
          publishedAt: '2024-01-01T00:00:00.000Z',
          channelTitle: 'Test Channel',
          channelId: 'channel123'
        }
      ];

      mockClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.getTopTrendsByEngagement(10);

      expect(result).toHaveLength(1);
      expect(result[0].engagementScore).toBe(0.05);
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTrendAnalysis', () => {
    it('should return analysis for empty trends', async () => {
      mockClient.send.mockResolvedValue({ Items: [] });

      const result = await repository.getTrendAnalysis('tourism');

      expect(result.totalTrends).toBe(0);
      expect(result.averageEngagementRate).toBe(0);
      expect(result.topEngagementScore).toBe(0);
    });

    it('should calculate correct analysis metrics', async () => {
      const mockItems = [
        {
          topic: 'tourism',
          timestamp: '2024-01-01T00:00:00.000Z',
          videoId: 'test1',
          engagementRate: 5,
          engagementScore: 0.03,
          title: 'Video 1',
          viewCount: 1000,
          likeCount: 30,
          commentCount: 20,
          keywords: ['travel'],
          categoryId: '19',
          publishedAt: '2024-01-01T00:00:00.000Z',
          channelTitle: 'Channel 1',
          channelId: 'channel1'
        },
        {
          topic: 'tourism',
          timestamp: '2024-01-01T01:00:00.000Z',
          videoId: 'test2',
          engagementRate: 7,
          engagementScore: 0.05,
          title: 'Video 2',
          viewCount: 2000,
          likeCount: 70,
          commentCount: 30,
          keywords: ['vacation'],
          categoryId: '19',
          publishedAt: '2024-01-01T00:00:00.000Z',
          channelTitle: 'Channel 2',
          channelId: 'channel2'
        }
      ];

      mockClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.getTrendAnalysis('tourism');

      expect(result.totalTrends).toBe(2);
      expect(result.averageEngagementRate).toBe(6); // (5 + 7) / 2
      expect(result.topEngagementScore).toBe(0.05);
    });
  });
});