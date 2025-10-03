"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const trend_detection_service_1 = require("../trend-detection-service");
const youtube_api_client_1 = require("../youtube-api-client");
const trend_repository_1 = require("../../repositories/trend-repository");
// Mock dependencies
jest.mock('../youtube-api-client');
jest.mock('../../repositories/trend-repository');
describe('TrendDetectionService - Enhanced Features', () => {
    let service;
    let mockYouTubeClient;
    let mockTrendRepository;
    const createMockSearchResult = (videoId, title, channelTitle = 'Test Channel') => ({
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
        categoryId: '27',
        duration: 'PT10M30S',
        thumbnails: {}
    };
    const mockTrendData = {
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
        mockYouTubeClient = new youtube_api_client_1.YouTubeApiClient({ secretName: 'test-secret' });
        mockTrendRepository = new trend_repository_1.TrendRepository();
        const config = {
            topics: ['investing', 'education', 'technology'],
            categories: ['27', '28'],
            maxResultsPerQuery: 10,
            minViewCount: 1000,
            minEngagementRate: 1.0,
            hoursBack: 24
        };
        service = new trend_detection_service_1.TrendDetectionService(mockYouTubeClient, mockTrendRepository, config);
    });
    describe('Custom Topic Configuration', () => {
        it('should use custom topic keywords for relevance filtering', async () => {
            const customTopics = [{
                    name: 'investing',
                    keywords: ['stocks', 'ETF', 'portfolio', 'trading', 'investment'],
                    categories: ['27'],
                    searchQueries: ['stock market analysis', 'investment tips'],
                    audioNarrationSuitable: true
                }];
            const serviceWithCustomTopics = new trend_detection_service_1.TrendDetectionService(mockYouTubeClient, mockTrendRepository, { customTopics });
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
            const customTopics = [{
                    name: 'investing',
                    keywords: ['stocks', 'investment'],
                    categories: ['27'],
                    searchQueries: ['investment tips'],
                    minDuration: 300,
                    maxDuration: 1800,
                    audioNarrationSuitable: true
                }];
            const serviceWithCustomTopics = new trend_detection_service_1.TrendDetectionService(mockYouTubeClient, mockTrendRepository, { customTopics });
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
            const results = await service.detectTrendsWithCategoryFiltering(['investing'], categoryFilters);
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
            const serviceWithFilters = new trend_detection_service_1.TrendDetectionService(mockYouTubeClient, mockTrendRepository, {
                contentFilters: {
                    excludeKeywords: ['controversial', 'explicit'],
                    requiredKeywords: [],
                    minDurationSeconds: 60,
                    maxDurationSeconds: 3600,
                    languageCode: 'en',
                    contentRating: ['none']
                }
            });
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
            const serviceWithFilters = new trend_detection_service_1.TrendDetectionService(mockYouTubeClient, mockTrendRepository, {
                contentFilters: {
                    excludeKeywords: [],
                    requiredKeywords: ['tutorial', 'guide'],
                    minDurationSeconds: 60,
                    maxDurationSeconds: 3600,
                    languageCode: 'en',
                    contentRating: ['none']
                }
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2UtZW5oYW5jZWQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyZW5kLWRldGVjdGlvbi1zZXJ2aWNlLWVuaGFuY2VkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3RUFBNEc7QUFDNUcsOERBQXlEO0FBQ3pELDBFQUFzRTtBQUd0RSxvQkFBb0I7QUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsQ0FBQztBQUVqRCxRQUFRLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO0lBQ3pELElBQUksT0FBOEIsQ0FBQztJQUNuQyxJQUFJLGlCQUFnRCxDQUFDO0lBQ3JELElBQUksbUJBQWlELENBQUM7SUFFdEQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLE9BQWUsRUFBRSxLQUFhLEVBQUUsZUFBdUIsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pHLE9BQU87UUFDUCxLQUFLO1FBQ0wsWUFBWTtRQUNaLFdBQVcsRUFBRSxtQkFBbUIsS0FBSyxFQUFFO1FBQ3ZDLFNBQVMsRUFBRSxZQUFZO1FBQ3ZCLFdBQVcsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtRQUNyQyxVQUFVLEVBQUUsRUFBRTtLQUNmLENBQUMsQ0FBQztJQUVILE1BQU0sZ0JBQWdCLEdBQUc7UUFDdkIsRUFBRSxFQUFFLFNBQVM7UUFDYixLQUFLLEVBQUUsd0NBQXdDO1FBQy9DLFdBQVcsRUFBRSxvREFBb0Q7UUFDakUsWUFBWSxFQUFFLGlCQUFpQjtRQUMvQixTQUFTLEVBQUUsWUFBWTtRQUN2QixXQUFXLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7UUFDckMsU0FBUyxFQUFFLEtBQUs7UUFDaEIsU0FBUyxFQUFFLElBQUk7UUFDZixZQUFZLEVBQUUsR0FBRztRQUNqQixVQUFVLEVB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QixDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDdkYsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUQsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFFbkQsTUFBTSxPQUFPLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFbkUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0M7UUFDNUUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVHJlbmREZXRlY3Rpb25TZXJ2aWNlLCBUcmVuZERldGVjdGlvbkNvbmZpZywgQ3VzdG9tVG9waWNDb25maWcgfSBmcm9tICcuLi90cmVuZC1kZXRlY3Rpb24tc2VydmljZSc7XHJcbmltcG9ydCB7IFlvdVR1YmVBcGlDbGllbnQgfSBmcm9tICcuLi95b3V0dWJlLWFwaS1jbGllbnQnO1xyXG5pbXBvcnQgeyBUcmVuZFJlcG9zaXRvcnkgfSBmcm9tICcuLi8uLi9yZXBvc2l0b3JpZXMvdHJlbmQtcmVwb3NpdG9yeSc7XHJcbmltcG9ydCB7IFRyZW5kRGF0YSB9IGZyb20gJy4uLy4uL21vZGVscy90cmVuZC1kYXRhJztcclxuXHJcbi8vIE1vY2sgZGVwZW5kZW5jaWVzXHJcbmplc3QubW9jaygnLi4veW91dHViZS1hcGktY2xpZW50Jyk7XHJcbmplc3QubW9jaygnLi4vLi4vcmVwb3NpdG9yaWVzL3RyZW5kLXJlcG9zaXRvcnknKTtcclxuXHJcbmRlc2NyaWJlKCdUcmVuZERldGVjdGlvblNlcnZpY2UgLSBFbmhhbmNlZCBGZWF0dXJlcycsICgpID0+IHtcclxuICBsZXQgc2VydmljZTogVHJlbmREZXRlY3Rpb25TZXJ2aWNlO1xyXG4gIGxldCBtb2NrWW91VHViZUNsaWVudDogamVzdC5Nb2NrZWQ8WW91VHViZUFwaUNsaWVudD47XHJcbiAgbGV0IG1vY2tUcmVuZFJlcG9zaXRvcnk6IGplc3QuTW9ja2VkPFRyZW5kUmVwb3NpdG9yeT47XHJcblxyXG4gIGNvbnN0IGNyZWF0ZU1vY2tTZWFyY2hSZXN1bHQgPSAodmlkZW9JZDogc3RyaW5nLCB0aXRsZTogc3RyaW5nLCBjaGFubmVsVGl0bGU6IHN0cmluZyA9ICdUZXN0IENoYW5uZWwnKSA9PiAoe1xyXG4gICAgdmlkZW9JZCxcclxuICAgIHRpdGxlLFxyXG4gICAgY2hhbm5lbFRpdGxlLFxyXG4gICAgZGVzY3JpcHRpb246IGBEZXNjcmlwdGlvbiBmb3IgJHt0aXRsZX1gLFxyXG4gICAgY2hhbm5lbElkOiAnY2hhbm5lbDEyMycsXHJcbiAgICBwdWJsaXNoZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgdGh1bWJuYWlsczoge31cclxuICB9KTtcclxuXHJcbiAgY29uc3QgbW9ja1ZpZGVvRGV0YWlscyA9IHtcclxuICAgIGlkOiAndGVzdDEyMycsXHJcbiAgICB0aXRsZTogJ0hvdyB0byBMZWFybiBJbnZlc3Rpbmc6IENvbXBsZXRlIEd1aWRlJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnTGVhcm4gYWJvdXQgc3RvY2tzLCBFVEZzLCBhbmQgcG9ydGZvbGlvIG1hbmFnZW1lbnQnLFxyXG4gICAgY2hhbm5lbFRpdGxlOiAnRmluYW5jZSBDaGFubmVsJyxcclxuICAgIGNoYW5uZWxJZDogJ2NoYW5uZWwxMjMnLFxyXG4gICAgcHVibGlzaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIHZpZXdDb3VudDogNTAwMDAsXHJcbiAgICBsaWtlQ291bnQ6IDI1MDAsXHJcbiAgICBjb21tZW50Q291bnQ6IDE1MCxcclxuICAgIGNhdGVnb3J5SWQ6ICcyNycsIC8vIEVkdWNhdGlvblxyXG4gICAgZHVyYXRpb246ICdQVDEwTTMwUycsXHJcbiAgICB0aHVtYm5haWxzOiB7fVxyXG4gIH07XHJcblxyXG4gIGNvbnN0IG1vY2tUcmVuZERhdGE6IFRyZW5kRGF0YSA9IHtcclxuICAgIHRvcGljOiAnaW52ZXN0aW5nJyxcclxuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgdmlkZW9JZDogJ3Rlc3QxMjMnLFxyXG4gICAgdGl0bGU6ICdIb3cgdG8gTGVhcm4gSW52ZXN0aW5nOiBDb21wbGV0ZSBHdWlkZScsXHJcbiAgICB2aWV3Q291bnQ6IDUwMDAwLFxyXG4gICAgbGlrZUNvdW50OiAyNTAwLFxyXG4gICAgY29tbWVudENvdW50OiAxNTAsXHJcbiAgICBlbmdhZ2VtZW50UmF0ZTogNS4zLFxyXG4gICAgZW5nYWdlbWVudFNjb3JlOiAwLjg1LFxyXG4gICAga2V5d29yZHM6IFsnaW52ZXN0aW5nJywgJ3N0b2NrcycsICdFVEYnLCAncG9ydGZvbGlvJ10sXHJcbiAgICBjYXRlZ29yeUlkOiAnMjcnLFxyXG4gICAgcHVibGlzaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIGNoYW5uZWxUaXRsZTogJ0ZpbmFuY2UgQ2hhbm5lbCcsXHJcbiAgICBjaGFubmVsSWQ6ICdjaGFubmVsMTIzJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnTGVhcm4gYWJvdXQgc3RvY2tzLCBFVEZzLCBhbmQgcG9ydGZvbGlvIG1hbmFnZW1lbnQnLFxyXG4gICAgZHVyYXRpb246ICdQVDEwTTMwUycsXHJcbiAgICB0aHVtYm5haWxzOiB7fVxyXG4gIH07XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgbW9ja1lvdVR1YmVDbGllbnQgPSBuZXcgWW91VHViZUFwaUNsaWVudCh7IHNlY3JldE5hbWU6ICd0ZXN0LXNlY3JldCcgfSkgYXMgamVzdC5Nb2NrZWQ8WW91VHViZUFwaUNsaWVudD47XHJcbiAgICBtb2NrVHJlbmRSZXBvc2l0b3J5ID0gbmV3IFRyZW5kUmVwb3NpdG9yeSgpIGFzIGplc3QuTW9ja2VkPFRyZW5kUmVwb3NpdG9yeT47XHJcbiAgICBcclxuICAgIGNvbnN0IGNvbmZpZzogUGFydGlhbDxUcmVuZERldGVjdGlvbkNvbmZpZz4gPSB7XHJcbiAgICAgIHRvcGljczogWydpbnZlc3RpbmcnLCAnZWR1Y2F0aW9uJywgJ3RlY2hub2xvZ3knXSxcclxuICAgICAgY2F0ZWdvcmllczogWycyNycsICcyOCddLCAvLyBFZHVjYXRpb24sIFNjaWVuY2UgJiBUZWNobm9sb2d5XHJcbiAgICAgIG1heFJlc3VsdHNQZXJRdWVyeTogMTAsXHJcbiAgICAgIG1pblZpZXdDb3VudDogMTAwMCxcclxuICAgICAgbWluRW5nYWdlbWVudFJhdGU6IDEuMCxcclxuICAgICAgaG91cnNCYWNrOiAyNFxyXG4gICAgfTtcclxuXHJcbiAgICBzZXJ2aWNlID0gbmV3IFRyZW5kRGV0ZWN0aW9uU2VydmljZShtb2NrWW91VHViZUNsaWVudCwgbW9ja1RyZW5kUmVwb3NpdG9yeSwgY29uZmlnKTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0N1c3RvbSBUb3BpYyBDb25maWd1cmF0aW9uJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCB1c2UgY3VzdG9tIHRvcGljIGtleXdvcmRzIGZvciByZWxldmFuY2UgZmlsdGVyaW5nJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjdXN0b21Ub3BpY3M6IEN1c3RvbVRvcGljQ29uZmlnW10gPSBbe1xyXG4gICAgICAgIG5hbWU6ICdpbnZlc3RpbmcnLFxyXG4gICAgICAgIGtleXdvcmRzOiBbJ3N0b2NrcycsICdFVEYnLCAncG9ydGZvbGlvJywgJ3RyYWRpbmcnLCAnaW52ZXN0bWVudCddLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IFsnMjcnXSxcclxuICAgICAgICBzZWFyY2hRdWVyaWVzOiBbJ3N0b2NrIG1hcmtldCBhbmFseXNpcycsICdpbnZlc3RtZW50IHRpcHMnXSxcclxuICAgICAgICBhdWRpb05hcnJhdGlvblN1aXRhYmxlOiB0cnVlXHJcbiAgICAgIH1dO1xyXG5cclxuICAgICAgY29uc3Qgc2VydmljZVdpdGhDdXN0b21Ub3BpY3MgPSBuZXcgVHJlbmREZXRlY3Rpb25TZXJ2aWNlKFxyXG4gICAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LFxyXG4gICAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnksXHJcbiAgICAgICAgeyBjdXN0b21Ub3BpY3MgfVxyXG4gICAgICApO1xyXG5cclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtcclxuICAgICAgICBjcmVhdGVNb2NrU2VhcmNoUmVzdWx0KCd0ZXN0MTIzJywgJ1N0b2NrIE1hcmtldCBBbmFseXNpcycsICdGaW5hbmNlIENoYW5uZWwnKVxyXG4gICAgICBdKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VmlkZW9EZXRhaWxzLm1vY2tSZXNvbHZlZFZhbHVlKFttb2NrVmlkZW9EZXRhaWxzXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFRyZW5kaW5nVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFttb2NrVmlkZW9EZXRhaWxzXSk7XHJcbiAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnkuc2F2ZVRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZSgpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlcnZpY2VXaXRoQ3VzdG9tVG9waWNzLmRldGVjdFRyZW5kcygnaW52ZXN0aW5nJyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0cykudG9IYXZlTGVuZ3RoKDEpO1xyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS50b3BpYykudG9CZSgnaW52ZXN0aW5nJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLnRyZW5kc0ZvdW5kKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGZpbHRlciB2aWRlb3MgYnkgY3VzdG9tIHRvcGljIGR1cmF0aW9uIGNvbnN0cmFpbnRzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjdXN0b21Ub3BpY3M6IEN1c3RvbVRvcGljQ29uZmlnW10gPSBbe1xyXG4gICAgICAgIG5hbWU6ICdpbnZlc3RpbmcnLFxyXG4gICAgICAgIGtleXdvcmRzOiBbJ3N0b2NrcycsICdpbnZlc3RtZW50J10sXHJcbiAgICAgICAgY2F0ZWdvcmllczogWycyNyddLFxyXG4gICAgICAgIHNlYXJjaFF1ZXJpZXM6IFsnaW52ZXN0bWVudCB0aXBzJ10sXHJcbiAgICAgICAgbWluRHVyYXRpb246IDMwMCwgLy8gNSBtaW51dGVzXHJcbiAgICAgICAgbWF4RHVyYXRpb246IDE4MDAsIC8vIDMwIG1pbnV0ZXNcclxuICAgICAgICBhdWRpb05hcnJhdGlvblN1aXRhYmxlOiB0cnVlXHJcbiAgICAgIH1dO1xyXG5cclxuICAgICAgY29uc3Qgc2VydmljZVdpdGhDdXN0b21Ub3BpY3MgPSBuZXcgVHJlbmREZXRlY3Rpb25TZXJ2aWNlKFxyXG4gICAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LFxyXG4gICAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnksXHJcbiAgICAgICAgeyBjdXN0b21Ub3BpY3MgfVxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gTW9jayBzaG9ydCB2aWRlbyAoc2hvdWxkIGJlIGZpbHRlcmVkIG91dClcclxuICAgICAgY29uc3Qgc2hvcnRWaWRlbyA9IHsgLi4ubW9ja1ZpZGVvRGV0YWlscywgZHVyYXRpb246ICdQVDJNMzBTJyB9O1xyXG4gICAgICAvLyBNb2NrIGxvbmcgdmlkZW8gKHNob3VsZCBiZSBmaWx0ZXJlZCBvdXQpICBcclxuICAgICAgY29uc3QgbG9uZ1ZpZGVvID0geyAuLi5tb2NrVmlkZW9EZXRhaWxzLCBkdXJhdGlvbjogJ1BUNDVNMDBTJyB9O1xyXG4gICAgICAvLyBNb2NrIGdvb2QgdmlkZW8gKHNob3VsZCBwYXNzKVxyXG4gICAgICBjb25zdCBnb29kVmlkZW8gPSB7IC4uLm1vY2tWaWRlb0RldGFpbHMsIGR1cmF0aW9uOiAnUFQxME0zMFMnIH07XHJcblxyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5zZWFyY2hWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUoW1xyXG4gICAgICAgIGNyZWF0ZU1vY2tTZWFyY2hSZXN1bHQoJ3Nob3J0JywgJ1Nob3J0IFZpZGVvJyksXHJcbiAgICAgICAgY3JlYXRlTW9ja1NlYXJjaFJlc3VsdCgnbG9uZycsICdMb25nIFZpZGVvJyksXHJcbiAgICAgICAgY3JlYXRlTW9ja1NlYXJjaFJlc3VsdCgnZ29vZCcsICdHb29kIFZpZGVvJylcclxuICAgICAgXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFZpZGVvRGV0YWlscy5tb2NrUmVzb2x2ZWRWYWx1ZShbc2hvcnRWaWRlbywgbG9uZ1ZpZGVvLCBnb29kVmlkZW9dKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMubW9ja1Jlc29sdmVkVmFsdWUoKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZXJ2aWNlV2l0aEN1c3RvbVRvcGljcy5kZXRlY3RUcmVuZHMoJ2ludmVzdGluZycpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0udHJlbmRzRm91bmQpLnRvQmUoMSk7IC8vIE9ubHkgdGhlIGdvb2QgdmlkZW8gc2hvdWxkIHBhc3NcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnRW5oYW5jZWQgRW5nYWdlbWVudCBDYWxjdWxhdGlvbicsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIGVuaGFuY2VkIGVuZ2FnZW1lbnQgc2NvcmVzIHdpdGggd2VpZ2h0ZWQgbWV0cmljcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtcclxuICAgICAgICBjcmVhdGVNb2NrU2VhcmNoUmVzdWx0KCd0ZXN0MTIzJywgJ1Rlc3QgVmlkZW8nKVxyXG4gICAgICBdKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VmlkZW9EZXRhaWxzLm1vY2tSZXNvbHZlZFZhbHVlKFttb2NrVmlkZW9EZXRhaWxzXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFRyZW5kaW5nVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcclxuICAgICAgbW9ja1RyZW5kUmVwb3NpdG9yeS5zYXZlVHJlbmRzLm1vY2tSZXNvbHZlZFZhbHVlKCk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgc2VydmljZS5kZXRlY3RUcmVuZHMoJ2ludmVzdGluZycpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0udG9wVHJlbmQ/LmVuZ2FnZW1lbnRTY29yZSkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS5hdmVyYWdlRW5nYWdlbWVudCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBhcHBseSByZWNlbmN5IGJvb3N0IHRvIG5ld2VyIGNvbnRlbnQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHJlY2VudFZpZGVvID0geyBcclxuICAgICAgICAuLi5tb2NrVmlkZW9EZXRhaWxzLCBcclxuICAgICAgICBwdWJsaXNoZWRBdDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIDIgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSAvLyAyIGhvdXJzIGFnb1xyXG4gICAgICB9O1xyXG4gICAgICBjb25zdCBvbGRWaWRlbyA9IHsgXHJcbiAgICAgICAgLi4ubW9ja1ZpZGVvRGV0YWlscywgXHJcbiAgICAgICAgaWQ6ICdvbGQxMjMnLFxyXG4gICAgICAgIHB1Ymxpc2hlZEF0OiBuZXcgRGF0ZShEYXRlLm5vdygpIC0gMjAgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSAvLyAyMCBob3VycyBhZ29cclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LnNlYXJjaFZpZGVvcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXHJcbiAgICAgICAgY3JlYXRlTW9ja1NlYXJjaFJlc3VsdCgncmVjZW50JywgJ1JlY2VudCBWaWRlbycpLFxyXG4gICAgICAgIGNyZWF0ZU1vY2tTZWFyY2hSZXN1bHQoJ29sZDEyMycsICdPbGQgVmlkZW8nKVxyXG4gICAgICBdKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VmlkZW9EZXRhaWxzLm1vY2tSZXNvbHZlZFZhbHVlKFtyZWNlbnRWaWRlbywgb2xkVmlkZW9dKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMubW9ja1Jlc29sdmVkVmFsdWUoKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZXJ2aWNlLmRldGVjdFRyZW5kcygnaW52ZXN0aW5nJyk7XHJcblxyXG4gICAgICAvLyBSZWNlbnQgdmlkZW8gc2hvdWxkIGhhdmUgaGlnaGVyIGVuZ2FnZW1lbnQgc2NvcmUgZHVlIHRvIHJlY2VuY3kgYm9vc3RcclxuICAgICAgY29uc3QgdHJlbmRzID0gcmVzdWx0c1swXTtcclxuICAgICAgZXhwZWN0KHRyZW5kcy50cmVuZHNGb3VuZCkudG9CZSgyKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnQ2F0ZWdvcnkgRmlsdGVyaW5nIGFuZCBBbmFseXNpcycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcHJvdmlkZSBjYXRlZ29yeSBicmVha2Rvd24gaW4gcmVzdWx0cycsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3NcclxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKFttb2NrVmlkZW9EZXRhaWxzXSkgLy8gQ2F0ZWdvcnkgMjdcclxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKFt7IC4uLm1vY2tWaWRlb0RldGFpbHMsIGNhdGVnb3J5SWQ6ICcyOCcgfV0pOyAvLyBDYXRlZ29yeSAyOFxyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMubW9ja1Jlc29sdmVkVmFsdWUoKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZXJ2aWNlLmRldGVjdFRyZW5kcygnaW52ZXN0aW5nJyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS5jYXRlZ29yeUJyZWFrZG93bikudG9CZURlZmluZWQoKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uY2F0ZWdvcnlCcmVha2Rvd24ubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLmNhdGVnb3J5QnJlYWtkb3duWzBdKS50b0hhdmVQcm9wZXJ0eSgnY2F0ZWdvcnlOYW1lJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLmNhdGVnb3J5QnJlYWtkb3duWzBdKS50b0hhdmVQcm9wZXJ0eSgndmlkZW9Db3VudCcpO1xyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS5jYXRlZ29yeUJyZWFrZG93blswXSkudG9IYXZlUHJvcGVydHkoJ2F2ZXJhZ2VWaWV3cycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBmaWx0ZXIgdHJlbmRzIGJ5IHNwZWNpZmljIGNhdGVnb3JpZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNhdGVnb3J5RmlsdGVycyA9IFsnMjcnXTsgLy8gT25seSBFZHVjYXRpb24gY2F0ZWdvcnlcclxuXHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LnNlYXJjaFZpZGVvcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFRyZW5kaW5nVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFttb2NrVmlkZW9EZXRhaWxzXSk7XHJcbiAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnkuc2F2ZVRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZSgpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlcnZpY2UuZGV0ZWN0VHJlbmRzV2l0aENhdGVnb3J5RmlsdGVyaW5nKFxyXG4gICAgICAgIFsnaW52ZXN0aW5nJ10sIFxyXG4gICAgICAgIGNhdGVnb3J5RmlsdGVyc1xyXG4gICAgICApO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0udG9waWMpLnRvQmUoJ2ludmVzdGluZycpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdDb250ZW50IFN1aXRhYmlsaXR5IEFuYWx5c2lzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgY29udGVudCBzdWl0YWJpbGl0eSBzY29yZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LnNlYXJjaFZpZGVvcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXHJcbiAgICAgICAgY3JlYXRlTW9ja1NlYXJjaFJlc3VsdCgndGVzdDEyMycsICdIb3cgdG8gTGVhcm4gSW52ZXN0aW5nJylcclxuICAgICAgXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFZpZGVvRGV0YWlscy5tb2NrUmVzb2x2ZWRWYWx1ZShbbW9ja1ZpZGVvRGV0YWlsc10pO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRUcmVuZGluZ1ZpZGVvcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXSk7XHJcbiAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnkuc2F2ZVRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZSgpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlcnZpY2UuZGV0ZWN0VHJlbmRzKCdpbnZlc3RpbmcnKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLmNvbnRlbnRTdWl0YWJpbGl0eSkudG9CZURlZmluZWQoKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uY29udGVudFN1aXRhYmlsaXR5LmF1ZGlvTmFycmF0aW9uU2NvcmUpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uY29udGVudFN1aXRhYmlsaXR5LmVkdWNhdGlvbmFsVmFsdWUpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uY29udGVudFN1aXRhYmlsaXR5Lm92ZXJhbGxTY29yZSkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBnaXZlIGhpZ2hlciBhdWRpbyBuYXJyYXRpb24gc2NvcmVzIGZvciBlZHVjYXRpb25hbCBjb250ZW50JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlZHVjYXRpb25hbFZpZGVvID0ge1xyXG4gICAgICAgIC4uLm1vY2tWaWRlb0RldGFpbHMsXHJcbiAgICAgICAgdGl0bGU6ICdIb3cgdG8gTGVhcm4gU3RvY2sgVHJhZGluZyBUdXRvcmlhbCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdDb21wbGV0ZSBndWlkZSB0byBsZWFybmluZyBzdG9jayB0cmFkaW5nJyxcclxuICAgICAgICBjYXRlZ29yeUlkOiAnMjcnIC8vIEVkdWNhdGlvblxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtcclxuICAgICAgICBjcmVhdGVNb2NrU2VhcmNoUmVzdWx0KCd0ZXN0MTIzJywgJ0hvdyB0byBMZWFybiBTdG9jayBUcmFkaW5nIFR1dG9yaWFsJylcclxuICAgICAgXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFZpZGVvRGV0YWlscy5tb2NrUmVzb2x2ZWRWYWx1ZShbZWR1Y2F0aW9uYWxWaWRlb10pO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRUcmVuZGluZ1ZpZGVvcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXSk7XHJcbiAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnkuc2F2ZVRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZSgpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlcnZpY2UuZGV0ZWN0VHJlbmRzKCdpbnZlc3RpbmcnKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLmNvbnRlbnRTdWl0YWJpbGl0eS5hdWRpb05hcnJhdGlvblNjb3JlKS50b0JlR3JlYXRlclRoYW4oMC43KTtcclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uY29udGVudFN1aXRhYmlsaXR5LmVkdWNhdGlvbmFsVmFsdWUpLnRvQmVHcmVhdGVyVGhhbigwLjcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdSZWNvbW1lbmRlZCBBY3Rpb25zJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBnZW5lcmF0ZSBhY3Rpb25hYmxlIHJlY29tbWVuZGF0aW9ucycsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtcclxuICAgICAgICBjcmVhdGVNb2NrU2VhcmNoUmVzdWx0KCd0ZXN0MTIzJywgJ0hvdyB0byBMZWFybiBJbnZlc3RpbmcnKVxyXG4gICAgICBdKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VmlkZW9EZXRhaWxzLm1vY2tSZXNvbHZlZFZhbHVlKFttb2NrVmlkZW9EZXRhaWxzXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFRyZW5kaW5nVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcclxuICAgICAgbW9ja1RyZW5kUmVwb3NpdG9yeS5zYXZlVHJlbmRzLm1vY2tSZXNvbHZlZFZhbHVlKCk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgc2VydmljZS5kZXRlY3RUcmVuZHMoJ2ludmVzdGluZycpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0ucmVjb21tZW5kZWRBY3Rpb25zKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS5yZWNvbW1lbmRlZEFjdGlvbnMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBhY3Rpb24gPSByZXN1bHRzWzBdLnJlY29tbWVuZGVkQWN0aW9uc1swXTtcclxuICAgICAgZXhwZWN0KGFjdGlvbikudG9IYXZlUHJvcGVydHkoJ3R5cGUnKTtcclxuICAgICAgZXhwZWN0KGFjdGlvbikudG9IYXZlUHJvcGVydHkoJ3ByaW9yaXR5Jyk7XHJcbiAgICAgIGV4cGVjdChhY3Rpb24pLnRvSGF2ZVByb3BlcnR5KCdkZXNjcmlwdGlvbicpO1xyXG4gICAgICBleHBlY3QoYWN0aW9uKS50b0hhdmVQcm9wZXJ0eSgnZXhwZWN0ZWRJbXBhY3QnKTtcclxuICAgICAgZXhwZWN0KGFjdGlvbikudG9IYXZlUHJvcGVydHkoJ2VmZm9ydCcpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBwcmlvcml0aXplIGhpZ2gtaW1wYWN0LCBsb3ctZWZmb3J0IHJlY29tbWVuZGF0aW9ucycsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuc2VhcmNoVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtcclxuICAgICAgICBjcmVhdGVNb2NrU2VhcmNoUmVzdWx0KCd0ZXN0MTIzJywgJ1RyZW5kaW5nIEludmVzdG1lbnQgVGlwcycpXHJcbiAgICAgIF0pO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRWaWRlb0RldGFpbHMubW9ja1Jlc29sdmVkVmFsdWUoW3tcclxuICAgICAgICAuLi5tb2NrVmlkZW9EZXRhaWxzLFxyXG4gICAgICAgIHB1Ymxpc2hlZEF0OiBuZXcgRGF0ZShEYXRlLm5vdygpIC0gMiAqIDYwICogNjAgKiAxMDAwKS50b0lTT1N0cmluZygpIC8vIFZlcnkgcmVjZW50XHJcbiAgICAgIH1dKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMubW9ja1Jlc29sdmVkVmFsdWUoKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZXJ2aWNlLmRldGVjdFRyZW5kcygnaW52ZXN0aW5nJyk7XHJcblxyXG4gICAgICBjb25zdCBhY3Rpb25zID0gcmVzdWx0c1swXS5yZWNvbW1lbmRlZEFjdGlvbnM7XHJcbiAgICAgIGV4cGVjdChhY3Rpb25zLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG4gICAgICBcclxuICAgICAgLy8gRmlyc3QgYWN0aW9uIHNob3VsZCBiZSBoaWdoIHByaW9yaXR5XHJcbiAgICAgIGV4cGVjdChhY3Rpb25zWzBdLnByaW9yaXR5KS50b0JlKCdoaWdoJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1BlcmZvcm1hbmNlIE1ldHJpY3MnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSB0b3BpYyBwZXJmb3JtYW5jZSBtZXRyaWNzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBoaXN0b3JpY2FsVHJlbmRzID0gW1xyXG4gICAgICAgIHsgLi4ubW9ja1RyZW5kRGF0YSwgdGltZXN0YW1wOiBuZXcgRGF0ZShEYXRlLm5vdygpIC0gMjQgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSB9LFxyXG4gICAgICAgIHsgLi4ubW9ja1RyZW5kRGF0YSwgdGltZXN0YW1wOiBuZXcgRGF0ZShEYXRlLm5vdygpIC0gNDggKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LmdldFJlY2VudFRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZShoaXN0b3JpY2FsVHJlbmRzKTtcclxuXHJcbiAgICAgIGNvbnN0IG1ldHJpY3MgPSBhd2FpdCBzZXJ2aWNlLmdldFRvcGljUGVyZm9ybWFuY2VNZXRyaWNzKCdpbnZlc3RpbmcnLCA3KTtcclxuXHJcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0hhdmVQcm9wZXJ0eSgnYXZlcmFnZVZpZXdzJyk7XHJcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0hhdmVQcm9wZXJ0eSgnYXZlcmFnZUVuZ2FnZW1lbnQnKTtcclxuICAgICAgZXhwZWN0KG1ldHJpY3MpLnRvSGF2ZVByb3BlcnR5KCd0cmVuZGluZ0ZyZXF1ZW5jeScpO1xyXG4gICAgICBleHBlY3QobWV0cmljcykudG9IYXZlUHJvcGVydHkoJ2Jlc3RQZXJmb3JtaW5nS2V5d29yZHMnKTtcclxuICAgICAgZXhwZWN0KG1ldHJpY3MpLnRvSGF2ZVByb3BlcnR5KCdvcHRpbWFsUG9zdGluZ1RpbWVzJyk7XHJcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0hhdmVQcm9wZXJ0eSgnY29tcGV0aXRpb25MZXZlbCcpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KG1ldHJpY3MuYXZlcmFnZVZpZXdzKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgIGV4cGVjdChtZXRyaWNzLmJlc3RQZXJmb3JtaW5nS2V5d29yZHMpLnRvQ29udGFpbignaW52ZXN0aW5nJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGRldGVybWluZSBjb21wZXRpdGlvbiBsZXZlbCBiYXNlZCBvbiB0cmVuZGluZyBmcmVxdWVuY3knLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIEhpZ2ggZnJlcXVlbmN5IHRyZW5kcyAoaGlnaCBjb21wZXRpdGlvbilcclxuICAgICAgY29uc3QgaGlnaEZyZXF1ZW5jeVRyZW5kcyA9IEFycmF5KDUwKS5maWxsKG51bGwpLm1hcCgoXywgaSkgPT4gKHtcclxuICAgICAgICAuLi5tb2NrVHJlbmREYXRhLFxyXG4gICAgICAgIHZpZGVvSWQ6IGB2aWRlbyR7aX1gLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIGkgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LmdldFJlY2VudFRyZW5kcy5tb2NrUmVzb2x2ZWRWYWx1ZShoaWdoRnJlcXVlbmN5VHJlbmRzKTtcclxuXHJcbiAgICAgIGNvbnN0IG1ldHJpY3MgPSBhd2FpdCBzZXJ2aWNlLmdldFRvcGljUGVyZm9ybWFuY2VNZXRyaWNzKCdpbnZlc3RpbmcnLCA3KTtcclxuXHJcbiAgICAgIGV4cGVjdChtZXRyaWNzLmNvbXBldGl0aW9uTGV2ZWwpLnRvQmUoJ2hpZ2gnKTtcclxuICAgICAgZXhwZWN0KG1ldHJpY3MudHJlbmRpbmdGcmVxdWVuY3kpLnRvQmVHcmVhdGVyVGhhbig1KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnQ29udGVudCBGaWx0ZXJpbmcnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGV4Y2x1ZGUgdmlkZW9zIHdpdGggYmxhY2tsaXN0ZWQga2V5d29yZHMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHNlcnZpY2VXaXRoRmlsdGVycyA9IG5ldyBUcmVuZERldGVjdGlvblNlcnZpY2UoXHJcbiAgICAgICAgbW9ja1lvdVR1YmVDbGllbnQsXHJcbiAgICAgICAgbW9ja1RyZW5kUmVwb3NpdG9yeSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjb250ZW50RmlsdGVyczoge1xyXG4gICAgICAgICAgICBleGNsdWRlS2V5d29yZHM6IFsnY29udHJvdmVyc2lhbCcsICdleHBsaWNpdCddLFxyXG4gICAgICAgICAgICByZXF1aXJlZEtleXdvcmRzOiBbXSxcclxuICAgICAgICAgICAgbWluRHVyYXRpb25TZWNvbmRzOiA2MCxcclxuICAgICAgICAgICAgbWF4RHVyYXRpb25TZWNvbmRzOiAzNjAwLFxyXG4gICAgICAgICAgICBsYW5ndWFnZUNvZGU6ICdlbicsXHJcbiAgICAgICAgICAgIGNvbnRlbnRSYXRpbmc6IFsnbm9uZSddXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG5cclxuICAgICAgY29uc3QgY29udHJvdmVyc2lhbFZpZGVvID0ge1xyXG4gICAgICAgIC4uLm1vY2tWaWRlb0RldGFpbHMsXHJcbiAgICAgICAgdGl0bGU6ICdDb250cm92ZXJzaWFsIEludmVzdG1lbnQgU3RyYXRlZ3knLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGhpcyBpcyBjb250cm92ZXJzaWFsIGNvbnRlbnQnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5zZWFyY2hWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUoW1xyXG4gICAgICAgIGNyZWF0ZU1vY2tTZWFyY2hSZXN1bHQoJ3Rlc3QxMjMnLCAnQ29udHJvdmVyc2lhbCBJbnZlc3RtZW50IFN0cmF0ZWd5JylcclxuICAgICAgXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFZpZGVvRGV0YWlscy5tb2NrUmVzb2x2ZWRWYWx1ZShbY29udHJvdmVyc2lhbFZpZGVvXSk7XHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LmdldFRyZW5kaW5nVmlkZW9zLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcclxuICAgICAgbW9ja1RyZW5kUmVwb3NpdG9yeS5zYXZlVHJlbmRzLm1vY2tSZXNvbHZlZFZhbHVlKCk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgc2VydmljZVdpdGhGaWx0ZXJzLmRldGVjdFRyZW5kcygnaW52ZXN0aW5nJyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0c1swXS50cmVuZHNGb3VuZCkudG9CZSgwKTsgLy8gU2hvdWxkIGJlIGZpbHRlcmVkIG91dFxyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXF1aXJlIHZpZGVvcyB0byBoYXZlIHJlcXVpcmVkIGtleXdvcmRzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzZXJ2aWNlV2l0aEZpbHRlcnMgPSBuZXcgVHJlbmREZXRlY3Rpb25TZXJ2aWNlKFxyXG4gICAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LFxyXG4gICAgICAgIG1vY2tUcmVuZFJlcG9zaXRvcnksXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY29udGVudEZpbHRlcnM6IHtcclxuICAgICAgICAgICAgZXhjbHVkZUtleXdvcmRzOiBbXSxcclxuICAgICAgICAgICAgcmVxdWlyZWRLZXl3b3JkczogWyd0dXRvcmlhbCcsICdndWlkZSddLFxyXG4gICAgICAgICAgICBtaW5EdXJhdGlvblNlY29uZHM6IDYwLFxyXG4gICAgICAgICAgICBtYXhEdXJhdGlvblNlY29uZHM6IDM2MDAsXHJcbiAgICAgICAgICAgIGxhbmd1YWdlQ29kZTogJ2VuJyxcclxuICAgICAgICAgICAgY29udGVudFJhdGluZzogWydub25lJ11cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCB0dXRvcmlhbFZpZGVvID0ge1xyXG4gICAgICAgIC4uLm1vY2tWaWRlb0RldGFpbHMsXHJcbiAgICAgICAgdGl0bGU6ICdJbnZlc3RtZW50IFR1dG9yaWFsIGZvciBCZWdpbm5lcnMnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcGxldGUgZ3VpZGUgdG8gaW52ZXN0aW5nJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3Qgbm9uVHV0b3JpYWxWaWRlbyA9IHtcclxuICAgICAgICAuLi5tb2NrVmlkZW9EZXRhaWxzLFxyXG4gICAgICAgIGlkOiAnb3RoZXIxMjMnLFxyXG4gICAgICAgIHRpdGxlOiAnUmFuZG9tIEludmVzdG1lbnQgVmlkZW8nLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSnVzdCBzb21lIGludmVzdG1lbnQgY29udGVudCdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tZb3VUdWJlQ2xpZW50LnNlYXJjaFZpZGVvcy5tb2NrUmVzb2x2ZWRWYWx1ZShbXHJcbiAgICAgICAgY3JlYXRlTW9ja1NlYXJjaFJlc3VsdCgndGVzdDEyMycsICdJbnZlc3RtZW50IFR1dG9yaWFsIGZvciBCZWdpbm5lcnMnKSxcclxuICAgICAgICBjcmVhdGVNb2NrU2VhcmNoUmVzdWx0KCdvdGhlcjEyMycsICdSYW5kb20gSW52ZXN0bWVudCBWaWRlbycpXHJcbiAgICAgIF0pO1xyXG4gICAgICBtb2NrWW91VHViZUNsaWVudC5nZXRWaWRlb0RldGFpbHMubW9ja1Jlc29sdmVkVmFsdWUoW3R1dG9yaWFsVmlkZW8sIG5vblR1dG9yaWFsVmlkZW9dKTtcclxuICAgICAgbW9ja1lvdVR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3MubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xyXG4gICAgICBtb2NrVHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMubW9ja1Jlc29sdmVkVmFsdWUoKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZXJ2aWNlV2l0aEZpbHRlcnMuZGV0ZWN0VHJlbmRzKCdpbnZlc3RpbmcnKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLnRyZW5kc0ZvdW5kKS50b0JlKDEpOyAvLyBPbmx5IHR1dG9yaWFsIHZpZGVvIHNob3VsZCBwYXNzXHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7Il19