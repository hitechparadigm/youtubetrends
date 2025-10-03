import { VideoRepository } from '../../src/repositories/video-repository';
import { VideoMetadata, VideoMetadataModel, VideoStatus } from '../../src/models/video-metadata';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('VideoRepository', () => {
  let repository: VideoRepository;
  let mockClient: any;

  beforeEach(() => {
    // Mock DynamoDB client
    mockClient = {
      send: jest.fn()
    };

    // Mock the DynamoDBDocumentClient.from method
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockClient);

    repository = new VideoRepository({ region: 'us-east-1' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveVideo', () => {
    it('should save a video to DynamoDB', async () => {
      const video = VideoMetadataModel.create(
        'Test Video',
        'Test Description',
        ['tag1', 'tag2'],
        ['tourism'],
        's3://bucket/video.mp4'
      );

      mockClient.send.mockResolvedValue({});

      await repository.saveVideo(video);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVideo', () => {
    it('should retrieve a video by ID', async () => {
      const mockItem = {
        videoId: 'test123',
        title: 'Test Video',
        description: 'Test Description',
        tags: ['tag1'],
        sourceTrends: ['tourism'],
        s3Key: 's3://bucket/video.mp4',
        status: VideoStatus.PUBLISHED,
        uploadDate: '2024-01-01',
        categoryId: '22',
        privacyStatus: 'public',
        viewCount: 1000,
        likeCount: 50,
        commentCount: 10,
        revenue: 0,
        generationCost: 0,
        processingCost: 0,
        performanceMetrics: {},
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockClient.send.mockResolvedValue({ Item: mockItem });

      const result = await repository.getVideo('test123');

      expect(result).not.toBeNull();
      expect(result?.videoId).toBe('test123');
      expect(result?.title).toBe('Test Video');
    });

    it('should return null for non-existent video', async () => {
      mockClient.send.mockResolvedValue({});

      const result = await repository.getVideo('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateVideoStatus', () => {
    it('should update video status', async () => {
      const updatedItem = {
        videoId: 'test123',
        status: VideoStatus.PUBLISHED,
        updatedAt: '2024-01-01T01:00:00.000Z',
        title: 'Test Video',
        description: 'Test Description',
        tags: ['tag1'],
        sourceTrends: ['tourism'],
        s3Key: 's3://bucket/video.mp4',
        uploadDate: '2024-01-01',
        categoryId: '22',
        privacyStatus: 'public',
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        revenue: 0,
        generationCost: 0,
        processingCost: 0,
        performanceMetrics: {},
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockClient.send.mockResolvedValue({ Attributes: updatedItem });

      const result = await repository.updateVideoStatus('test123', VideoStatus.PUBLISHED);

      expect(result.status).toBe(VideoStatus.PUBLISHED);
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVideosByStatus', () => {
    it('should retrieve videos by status', async () => {
      const mockItems = [
        {
          videoId: 'test1',
          status: VideoStatus.GENERATING,
          title: 'Video 1',
          description: 'Description 1',
          tags: ['tag1'],
          sourceTrends: ['tourism'],
          s3Key: 's3://bucket/video1.mp4',
          uploadDate: '2024-01-01',
          categoryId: '22',
          privacyStatus: 'public',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          revenue: 0,
          generationCost: 0,
          processingCost: 0,
          performanceMetrics: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.getVideosByStatus(VideoStatus.GENERATING);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(VideoStatus.GENERATING);
    });
  });

  describe('getVideoAnalytics', () => {
    it('should calculate correct analytics', async () => {
      const mockItems = [
        {
          videoId: 'test1',
          status: VideoStatus.PUBLISHED,
          viewCount: 1000,
          revenue: 10,
          generationCost: 2,
          processingCost: 1,
          uploadDate: '2024-01-01',
          title: 'Video 1',
          description: 'Description 1',
          tags: ['tag1'],
          sourceTrends: ['tourism'],
          s3Key: 's3://bucket/video1.mp4',
          categoryId: '22',
          privacyStatus: 'public',
          likeCount: 50,
          commentCount: 10,
          performanceMetrics: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          videoId: 'test2',
          status: VideoStatus.GENERATING,
          viewCount: 0,
          revenue: 0,
          generationCost: 2,
          processingCost: 1,
          uploadDate: '2024-01-01',
          title: 'Video 2',
          description: 'Description 2',
          tags: ['tag2'],
          sourceTrends: ['travel'],
          s3Key: 's3://bucket/video2.mp4',
          categoryId: '22',
          privacyStatus: 'public',
          likeCount: 0,
          commentCount: 0,
          performanceMetrics: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockClient.send.mockResolvedValue({ Items: mockItems });

      const result = await repository.getVideoAnalytics(30);

      expect(result.totalVideos).toBe(2);
      expect(result.publishedVideos).toBe(1);
      expect(result.totalViews).toBe(1000);
      expect(result.totalRevenue).toBe(10);
      expect(result.totalCosts).toBe(6); // (2+1) + (2+1)
      expect(result.statusBreakdown[VideoStatus.PUBLISHED]).toBe(1);
      expect(result.statusBreakdown[VideoStatus.GENERATING]).toBe(1);
    });
  });

  describe('updatePerformanceMetrics', () => {
    it('should update performance metrics', async () => {
      const existingVideo = VideoMetadataModel.create(
        'Test Video',
        'Test Description',
        ['tag1'],
        ['tourism'],
        's3://bucket/video.mp4'
      );

      // Mock getVideo call
      mockClient.send
        .mockResolvedValueOnce({ Item: VideoMetadataModel.toDynamoDbItem(existingVideo) })
        .mockResolvedValueOnce({ 
          Attributes: {
            ...VideoMetadataModel.toDynamoDbItem(existingVideo),
            performanceMetrics: { impressions: 5000, clickThroughRate: 0.05 }
          }
        });

      const result = await repository.updatePerformanceMetrics(existingVideo.videoId, {
        impressions: 5000,
        clickThroughRate: 0.05
      });

      expect(result.performanceMetrics.impressions).toBe(5000);
      expect(result.performanceMetrics.clickThroughRate).toBe(0.05);
    });
  });
});