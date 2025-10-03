"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const trend_detection_service_1 = require("../../src/services/trend-detection-service");
// Mock dependencies
jest.mock('../../src/services/youtube-api-client');
jest.mock('../../src/repositories/trend-repository');
describe('TrendDetectionService', () => {
    let service;
    let mockYouTubeClient;
    let mockTrendRepository;
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
        };
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
        };
        service = new trend_detection_service_1.TrendDetectionService(mockYouTubeClient, mockTrendRepository, {
            topics: ['tourism', 'travel'],
            maxResultsPerQuery: 10,
            minViewCount: 1000,
            minEngagementRate: 1.0
        });
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
            expect(result.recommendations.some(rec => rec.includes('title') || rec.includes('keywords') || rec.includes('description'))).toBe(true);
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
                publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
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
                viewCount: 500,
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
                viewCount: 5000,
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
            expect(mockTrendRepository.saveTrends).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    videoId: 'good123'
                })
            ]));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyZW5kLWRldGVjdGlvbi1zZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3RkFBbUY7QUFJbkYsb0JBQW9CO0FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQztBQUNuRCxJQUFJLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7QUFFckQsUUFBUSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxJQUFJLE9BQThCLENBQUM7SUFDbkMsSUFBSSxpQkFBZ0QsQ0FBQztJQUNyRCxJQUFJLG1CQUFpRCxDQUFDO0lBRXRELFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxpQkFBaUIsR0FBRztZQUNsQixZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUN2QixlQUFlLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUMxQixpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQzVCLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ3JCLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ3RCLGtCQUFrQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDN0IsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDeEIsY0FBYyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7U0FDbkIsQ0FBQztRQUVULG1CQUFtQixHQUFHO1lBQ3BCLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ3JCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDM0IsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDeEIsZUFBZSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDMUIsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLEVB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QyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUcmVuZERldGVjdGlvblNlcnZpY2UgfSBmcm9tICcuLi8uLi9zcmMvc2VydmljZXMvdHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBZb3VUdWJlQXBpQ2xpZW50IH0gZnJvbSAnLi4vLi4vc3JjL3NlcnZpY2VzL3lvdXR1YmUtYXBpLWNsaWVudCc7XHJcbmltcG9ydCB7IFRyZW5kUmVwb3NpdG9yeSB9IGZyb20gJy4uLy4uL3NyYy9yZXBvc2l0b3JpZXMvdHJlbmQtcmVwb3NpdG9yeSc7XHJcblxyXG4vLyBNb2NrIGRlcGVuZGVuY2llc1xyXG5qZXN0Lm1vY2soJy4uLy4uL3NyYy9zZXJ2aWNlcy95b3V0dWJlLWFwaS1jbGllbnQnKTtcclxuamVzdC5tb2NrKCcuLi8uLi9zcmMvcmVwb3NpdG9yaWVzL3RyZW5kLXJlcG9zaXRvcnknKTtcclxuXHJcbmRlc2NyaWJlKCdUcmVuZERldGVjdGlvblNlcnZpY2UnLCAoKSA9PiB7XHJcbiAgbGV0IHNlcnZpY2U6IFRyZW5kRGV0ZWN0aW9uU2VydmljZTtcclxuICBsZXQgbW9ja1lvdVR1YmVDbGllbnQ6IGplc3QuTW9ja2VkPFlvdVR1YmVBcGlDbGllbnQ+O1xyXG4gIGxldCBtb2NrVHJlbmRSZXBvc2l0b3J5OiBqZXN0Lk1vY2tlZDxUcmVuZFJlcG9zaXRvcnk+O1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIG1vY2tZb3VUdWJlQ2xpZW50ID0ge1xyXG4gICAgICBzZWFyY2hWaWRlb3M6IGplc3QuZm4oKSxcclxuICAgICAgZ2V0VmlkZW9EZXRhaWxzOiBqZXN0LmZuKCksXHJcbiAgICAgIGdldFRyZW5kaW5nVmlkZW9zOiBqZXN0LmZuKCksXHJcbiAgICAgIGluaXRpYWxpemU6IGplc3QuZm4oKSxcclxuICAgICAgdXBsb2FkVmlkZW86IGplc3QuZm4oKSxcclxuICAgICAgZ2V0VmlkZW9DYXRlZ29yaWVzOiBqZXN0LmZuKCksXHJcbiAgICAgIGdldFF1b3RhVXNhZ2U6IGplc3QuZm4oKSxcclxuICAgICAgdGVzdENvbm5lY3Rpb246IGplc3QuZm4oKVxyXG4gICAgfSBhcyBhbnk7XHJcblxyXG4gICAgbW9ja1RyZW5kUmVwb3NpdG9yeSA9IHtcclxuICAgICAgc2F2ZVRyZW5kczogamVzdC5mbigpLFxyXG4gICAgICBnZXRUcmVuZHNCeVRvcGljOiBqZXN0LmZuKCksXHJcbiAgICAgIGdldFRvcGljU3RhdHM6IGplc3QuZm4oKSxcclxuICAgICAgZ2V0UmVjZW50VHJlbmRzOiBqZXN0LmZuKCksXHJcbiAgICAgIHNhdmVUcmVuZDogamVzdC5mbigpLFxyXG4gICAgICBnZXRUb3BUcmVuZHNCeUVuZ2FnZW1lbnQ6IGplc3QuZm4oKSxcclxuICAgICAgZ2V0VHJlbmRBbmFseXNpczogamVzdC5mbigpLFxyXG4gICAgICBkZWxldGVUcmVuZHNCeVRvcGljOiBqZXN0LmZuKCksXHJcbiAgICAgIGdldFZpZGVvc0J5U291cmNlVHJlbmQ6IGplc3QuZm4oKVxyXG4gICAgfSBhcyBhbnk7XHJcblxyXG4gICAgc2VydmljZSA9IG5ldyBUcmVuZERldGVjdGlvblNlcnZpY2UoXHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LFxyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LFxyXG4gICAgICB7XHJcbiAgICAgICAgdG9waWNzOiBbJ3RvdXJpc20nLCAndHJhdmVsJ10sXHJcbiAgICAgICAgbWF4UmVzdWx0c1BlclF1ZXJ5OiAxMCxcclxuICAgICAgICBtaW5WaWV3Q291bnQ6IDEwMDAsXHJcbiAgICAgICAgbWluRW5nYWdlbWVudFJhdGU6IDEuMFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH0pO1xyXG5cclxuICBhZnRlckVhY2goKCkgPT4ge1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdkZXRlY3RUcmVuZHMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGRldGVjdCB0cmVuZHMgZm9yIGEgc3BlY2lmaWMgdG9waWMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tTZWFyY2hSZXN1bHRzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHZpZGVvSWQ6ICd0ZXN0MTIzJyxcclxuICAgICAgICAgIHRpdGxlOiAnQW1hemluZyBUb3VyaXNtIERlc3RpbmF0aW9uJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmVzdCB0cmF2ZWwgc3BvdHMnLFxyXG4gICAgICAgICAgY2hhbm5lbFRpdGxlOiAnVHJhdmVsIENoYW5uZWwnLFxyXG4gICAgICAgICAgY2hhbm5lbElkOiAnY2hhbm5lbDEyMycsXHJcbiAgICAgICAgICBwdWJsaXNoZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgdGh1bWJuYWlsczoge31cclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBjb25zdCBtb2NrVmlkZW9EZXRhaWxzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAndGVzdDEyMycsXHJcbiAgICAgICAgICB0aXRsZTogJ0FtYXppbmcgVG91cmlzbSBEZXN0aW5hdGlvbicsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Jlc3QgdHJhdmVsIHNwb3RzJyxcclxuICAgICAgICAgIGNoYW5uZWxUaXRsZTogJ1RyYXZlbCBDaGFubmVsJyxcclxuICAgICAgICAgIGNoYW5uZWxJZDogJ2NoYW5uZWwxMjMnLFxyXG4gICAgICAgICAgcHVibGlzaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIGNhdGVnb3J5SWQ6ICcxOScsXHJcbiAgICAgICAgICBkdXJhdGlvbjogJ1BUNU0zMFMnLFxyXG4gICAgICAgICAgdmlld0NvdW50OiA1MDAwLFxyXG4gICAgICAgICAgbGlrZUNvdW50OiAyNTAsXHJcbiAgICAgICAgICBjb21tZW50Q291bnQ6IDUwLFxyXG4gICAgICAgICAgdGh1bWJuYWlsczoge31cclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBjb25zdCBtb2NrVHJlbmRpbmdWaWRlb3MgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICd0cmVuZGluZzQ1NicsXHJcbiAgICAgICAgICB0aXRsZTogJ1RvcCBUb3VyaXNtIFRyZW5kcyAyMDI0JyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGF0ZXN0IHRvdXJpc20gdHJlbmRzJyxcclxuICAgICAgICAgIGNoYW5uZWxUaXRsZTogJ1RvdXJpc20gVG9kYXknLFxyXG4gICAgICAgICAgY2hhbm5lbElkOiAndG91cmlzbS1jaGFubmVsJyxcclxuICAgICAgICAgIHB1Ymxpc2hlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICBjYXRlZ29yeUlkOiAnMTknLFxyXG4gICAgICAgICAgZHVyYXRpb246ICdQVDhNMTVTJyxcclxuICAgICAgICAgIHZpZXdDb3VudDogMTUwMDAsXHJcbiAgICAgICAgICBsaWtlQ291bnQ6IDc1MCxcclxuICAgICAgICAgIGNvbW1lbnRDb3VudDogMTUwLFxyXG4gICAgICAgICAgdGh1bWJuYWlsczoge31cclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5zZWFyY2hWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUobW9ja1NlYXJjaFJlc3VsdHMpO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRWaWRlb0RldGFpbHMubW9ja1Jlc29sdmVkVmFsdWUobW9ja1ZpZGVvRGV0YWlscyk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFRyZW5kaW5nVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tUcmVuZGluZ1ZpZGVvcyk7XHJcbiAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnkuc2F2ZVRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZSgpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlcnZpY2UuZGV0ZWN0VHJlbmRzKCd0b3VyaXNtJyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0cykudG9IYXZlTGVuZ3RoKDEpO1xyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS50b3BpYykudG9CZSgndG91cmlzbScpO1xyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS50cmVuZHNGb3VuZCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG4gICAgICBleHBlY3QobW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICAgIGV4cGVjdChtb2NrWW91VHViZUNsaWVudC5nZXRWaWRlb0RldGFpbHMpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuICAgICAgZXhwZWN0KG1vY2tZb3VUdWJlQ2xpZW50LmdldFRyZW5kaW5nVmlkZW9zKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICAgIGV4cGVjdChtb2NrVHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIEFQSSBlcnJvcnMgZ3JhY2VmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcignQVBJIEVycm9yJykpO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRUcmVuZGluZ1ZpZGVvcy5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ0FQSSBFcnJvcicpKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZXJ2aWNlLmRldGVjdFRyZW5kcygndG91cmlzbScpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0udG9waWMpLnRvQmUoJ3RvdXJpc20nKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0udHJlbmRzRm91bmQpLnRvQmUoMCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLnRvcFRyZW5kKS50b0JlTnVsbCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBkZXRlY3QgdHJlbmRzIGZvciBhbGwgY29uZmlndXJlZCB0b3BpY3Mgd2hlbiBubyBzcGVjaWZpYyB0b3BpYyBwcm92aWRlZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlcnZpY2UuZGV0ZWN0VHJlbmRzKCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0cykudG9IYXZlTGVuZ3RoKDIpOyAvLyB0b3VyaXNtIGFuZCB0cmF2ZWxcclxuICAgICAgZXhwZWN0KHJlc3VsdHMubWFwKHIgPT4gci50b3BpYykpLnRvRXF1YWwoWyd0b3VyaXNtJywgJ3RyYXZlbCddKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0VG9wVHJlbmRpbmdUb3BpY3MnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiB0b3AgdHJlbmRpbmcgdG9waWNzIHdpdGggc3RhdHMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tTdGF0cyA9IHtcclxuICAgICAgICB0b3RhbFRyZW5kczogMjUsXHJcbiAgICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IDUuMixcclxuICAgICAgICB0b3BWaWRlbzoge1xyXG4gICAgICAgICAgdG9waWM6ICd0b3VyaXNtJyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgdmlkZW9JZDogJ3RvcDEyMycsXHJcbiAgICAgICAgICB0aXRsZTogJ1RvcCBUb3VyaXNtIFZpZGVvJyxcclxuICAgICAgICAgIHZpZXdDb3VudDogMTAwMDAsXHJcbiAgICAgICAgICBsaWtlQ291bnQ6IDUwMCxcclxuICAgICAgICAgIGNvbW1lbnRDb3VudDogMTAwLFxyXG4gICAgICAgICAgZW5nYWdlbWVudFJhdGU6IDYuMCxcclxuICAgICAgICAgIGVuZ2FnZW1lbnRTY29yZTogMC4wNixcclxuICAgICAgICAgIGtleXdvcmRzOiBbJ3RvdXJpc20nLCAndHJhdmVsJ10sXHJcbiAgICAgICAgICBjYXRlZ29yeUlkOiAnMTknLFxyXG4gICAgICAgICAgcHVibGlzaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIGNoYW5uZWxUaXRsZTogJ1RvcCBDaGFubmVsJyxcclxuICAgICAgICAgIGNoYW5uZWxJZDogJ3RvcC1jaGFubmVsJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdHJlbmRpbmdLZXl3b3JkczogWyd0b3VyaXNtJywgJ3RyYXZlbCcsICd2YWNhdGlvbiddXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LmdldFRvcGljU3RhdHMubW9ja1Jlc29sdmVkVmFsdWUobW9ja1N0YXRzKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZXJ2aWNlLmdldFRvcFRyZW5kaW5nVG9waWNzKDcsIDUpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdHMpLnRvSGF2ZUxlbmd0aCgyKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0udG9waWMpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLnRyZW5kQ291bnQpLnRvQmUoMjUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS5hdmVyYWdlRW5nYWdlbWVudCkudG9CZSg1LjIpO1xyXG4gICAgICBleHBlY3QobW9ja1RyZW5kUmVwb3NpdG9yeS5nZXRUb3BpY1N0YXRzKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMik7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ3ByZWRpY3RUcmVuZFBvdGVudGlhbCcsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgYW5hbHl6ZSB2aWRlbyBwb3RlbnRpYWwgYW5kIHByb3ZpZGUgcmVjb21tZW5kYXRpb25zJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB2aWRlb0RhdGEgPSB7XHJcbiAgICAgICAgdGl0bGU6ICdUb3AgMTAgQW1hemluZyBUb3VyaXNtIERlc3RpbmF0aW9ucyBZb3UgTXVzdCBWaXNpdCEnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGlzY292ZXIgdGhlIG1vc3QgaW5jcmVkaWJsZSB0b3VyaXNtIGRlc3RpbmF0aW9ucyBhcm91bmQgdGhlIHdvcmxkLiBGcm9tIGV4b3RpYyBiZWFjaGVzIHRvIG1vdW50YWluIGFkdmVudHVyZXMsIHRoaXMgY29tcHJlaGVuc2l2ZSBndWlkZSBjb3ZlcnMgZXZlcnl0aGluZyB5b3UgbmVlZCB0byBrbm93LiBTdWJzY3JpYmUgZm9yIG1vcmUgdHJhdmVsIGNvbnRlbnQhJyxcclxuICAgICAgICBrZXl3b3JkczogWyd0b3VyaXNtJywgJ3RyYXZlbCcsICdkZXN0aW5hdGlvbnMnLCAndmFjYXRpb24nXSxcclxuICAgICAgICBjYXRlZ29yeUlkOiAnMTknXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LmdldFJlY2VudFRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdG9waWM6ICd0b3VyaXNtJyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgdmlkZW9JZDogJ3JlY2VudDEyMycsXHJcbiAgICAgICAgICB0aXRsZTogJ1JlY2VudCBUb3VyaXNtIFZpZGVvJyxcclxuICAgICAgICAgIHZpZXdDb3VudDogNTAwMCxcclxuICAgICAgICAgIGxpa2VDb3VudDogMjUwLFxyXG4gICAgICAgICAgY29tbWVudENvdW50OiA1MCxcclxuICAgICAgICAgIGVuZ2FnZW1lbnRSYXRlOiA2LjAsXHJcbiAgICAgICAgICBlbmdhZ2VtZW50U2NvcmU6IDAuMDYsXHJcbiAgICAgICAgICBrZXl3b3JkczogWyd0b3VyaXNtJywgJ3RyYXZlbCcsICdkZXN0aW5hdGlvbnMnXSxcclxuICAgICAgICAgIGNhdGVnb3J5SWQ6ICcxOScsXHJcbiAgICAgICAgICBwdWJsaXNoZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgY2hhbm5lbFRpdGxlOiAnUmVjZW50IENoYW5uZWwnLFxyXG4gICAgICAgICAgY2hhbm5lbElkOiAncmVjZW50LWNoYW5uZWwnXHJcbiAgICAgICAgfVxyXG4gICAgICBdKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucHJlZGljdFRyZW5kUG90ZW50aWFsKHZpZGVvRGF0YSk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZmFjdG9ycykudG9IYXZlUHJvcGVydHkoJ3RpdGxlRWZmZWN0aXZlbmVzcycpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmZhY3RvcnMpLnRvSGF2ZVByb3BlcnR5KCdrZXl3b3JkUmVsZXZhbmNlJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZmFjdG9ycykudG9IYXZlUHJvcGVydHkoJ2Rlc2NyaXB0aW9uUXVhbGl0eScpO1xyXG4gICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShyZXN1bHQucmVjb21tZW5kYXRpb25zKSkudG9CZSh0cnVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcHJvdmlkZSByZWNvbW1lbmRhdGlvbnMgZm9yIHBvb3IgY29udGVudCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcG9vclZpZGVvRGF0YSA9IHtcclxuICAgICAgICB0aXRsZTogJ3ZpZGVvJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ3Nob3J0JyxcclxuICAgICAgICBrZXl3b3JkczogW10sXHJcbiAgICAgICAgY2F0ZWdvcnlJZDogJzE5J1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja1RyZW5kUmVwb3NpdG9yeS5nZXRSZWNlbnRUcmVuZHMubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5wcmVkaWN0VHJlbmRQb3RlbnRpYWwocG9vclZpZGVvRGF0YSk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlTGVzc1RoYW4oMC41KTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5yZWNvbW1lbmRhdGlvbnMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQucmVjb21tZW5kYXRpb25zLnNvbWUocmVjID0+IFxyXG4gICAgICAgIHJlYy5pbmNsdWRlcygndGl0bGUnKSB8fCByZWMuaW5jbHVkZXMoJ2tleXdvcmRzJykgfHwgcmVjLmluY2x1ZGVzKCdkZXNjcmlwdGlvbicpXHJcbiAgICAgICkpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ3ByaXZhdGUgbWV0aG9kcyB2aWEgcHVibGljIGludGVyZmFjZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgZmlsdGVyIHZpZGVvcyBiYXNlZCBvbiBtaW5pbXVtIHJlcXVpcmVtZW50cycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbG93RW5nYWdlbWVudFZpZGVvID0ge1xyXG4gICAgICAgIHZpZGVvSWQ6ICdsb3cxMjMnLFxyXG4gICAgICAgIHRpdGxlOiAnTG93IEVuZ2FnZW1lbnQgVmlkZW8nLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTm90IHBvcHVsYXInLFxyXG4gICAgICAgIGNoYW5uZWxUaXRsZTogJ1NtYWxsIENoYW5uZWwnLFxyXG4gICAgICAgIGNoYW5uZWxJZDogJ3NtYWxsMTIzJyxcclxuICAgICAgICBwdWJsaXNoZWRBdDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIDQ4ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCksIC8vIDIgZGF5cyBvbGRcclxuICAgICAgICB0aHVtYm5haWxzOiB7fVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgZ29vZFZpZGVvID0ge1xyXG4gICAgICAgIHZpZGVvSWQ6ICdnb29kMTIzJyxcclxuICAgICAgICB0aXRsZTogJ0hpZ2ggRW5nYWdlbWVudCBUb3VyaXNtIFZpZGVvJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1ZlcnkgcG9wdWxhciB0b3VyaXNtIGNvbnRlbnQnLFxyXG4gICAgICAgIGNoYW5uZWxUaXRsZTogJ1BvcHVsYXIgQ2hhbm5lbCcsXHJcbiAgICAgICAgY2hhbm5lbElkOiAncG9wdWxhcjEyMycsXHJcbiAgICAgICAgcHVibGlzaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB0aHVtYm5haWxzOiB7fVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgbG93RW5nYWdlbWVudERldGFpbHMgPSB7XHJcbiAgICAgICAgaWQ6ICdsb3cxMjMnLFxyXG4gICAgICAgIHRpdGxlOiAnTG93IEVuZ2FnZW1lbnQgVmlkZW8nLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTm90IHBvcHVsYXInLFxyXG4gICAgICAgIGNoYW5uZWxUaXRsZTogJ1NtYWxsIENoYW5uZWwnLFxyXG4gICAgICAgIGNoYW5uZWxJZDogJ3NtYWxsMTIzJyxcclxuICAgICAgICBwdWJsaXNoZWRBdDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIDQ4ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgY2F0ZWdvcnlJZDogJzE5JyxcclxuICAgICAgICBkdXJhdGlvbjogJ1BUM00wMFMnLFxyXG4gICAgICAgIHZpZXdDb3VudDogNTAwLCAvLyBCZWxvdyBtaW5pbXVtXHJcbiAgICAgICAgbGlrZUNvdW50OiA1LFxyXG4gICAgICAgIGNvbW1lbnRDb3VudDogMSxcclxuICAgICAgICB0aHVtYm5haWxzOiB7fVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgZ29vZERldGFpbHMgPSB7XHJcbiAgICAgICAgaWQ6ICdnb29kMTIzJyxcclxuICAgICAgICB0aXRsZTogJ0hpZ2ggRW5nYWdlbWVudCBUb3VyaXNtIFZpZGVvJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1ZlcnkgcG9wdWxhciB0b3VyaXNtIGNvbnRlbnQnLFxyXG4gICAgICAgIGNoYW5uZWxUaXRsZTogJ1BvcHVsYXIgQ2hhbm5lbCcsXHJcbiAgICAgICAgY2hhbm5lbElkOiAncG9wdWxhcjEyMycsXHJcbiAgICAgICAgcHVibGlzaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBjYXRlZ29yeUlkOiAnMTknLFxyXG4gICAgICAgIGR1cmF0aW9uOiAnUFQ1TTMwUycsXHJcbiAgICAgICAgdmlld0NvdW50OiA1MDAwLCAvLyBBYm92ZSBtaW5pbXVtXHJcbiAgICAgICAgbGlrZUNvdW50OiAyNTAsXHJcbiAgICAgICAgY29tbWVudENvdW50OiA1MCxcclxuICAgICAgICB0aHVtYm5haWxzOiB7fVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtsb3dFbmdhZ2VtZW50VmlkZW8sIGdvb2RWaWRlb10pO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRWaWRlb0RldGFpbHMubW9ja1Jlc29sdmVkVmFsdWUoW2xvd0VuZ2FnZW1lbnREZXRhaWxzLCBnb29kRGV0YWlsc10pO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRUcmVuZGluZ1ZpZGVvcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXSk7XHJcbiAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnkuc2F2ZVRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZSgpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlcnZpY2UuZGV0ZWN0VHJlbmRzKCd0b3VyaXNtJyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS50cmVuZHNGb3VuZCkudG9CZSgxKTsgLy8gT25seSB0aGUgZ29vZCB2aWRlbyBzaG91bGQgcGFzcyBmaWx0ZXJzXHJcbiAgICAgIGV4cGVjdChtb2NrVHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoW1xyXG4gICAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICB2aWRlb0lkOiAnZ29vZDEyMydcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgXSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=