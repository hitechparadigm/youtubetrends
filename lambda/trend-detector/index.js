"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const youtube_api_client_simple_1 = require("../../src/services/youtube-api-client-simple");
const trend_detection_service_simple_1 = require("../../src/services/trend-detection-service-simple");
const trend_repository_1 = require("../../src/repositories/trend-repository");
const handler = async (event, context) => {
    const startTime = Date.now();
    console.log('Trend Detector Lambda started', {
        requestId: context.awsRequestId,
        event: JSON.stringify(event, null, 2)
    });
    try {
        // Initialize services using the simple, working approach
        const youtubeClient = new youtube_api_client_simple_1.YouTubeApiClientSimple();
        const trendRepository = new trend_repository_1.TrendRepository({
            region: process.env.AWS_REGION
        });
        const config = {
            topics: event.topics || ['technology', 'investing'],
            regions: [event.region || 'US'],
            maxResultsPerQuery: event.maxResults || 20,
            hoursBack: event.hoursBack || 24
        };
        const trendDetectionService = new trend_detection_service_simple_1.TrendDetectionServiceSimple(youtubeClient, trendRepository, config);
        // Initialize and test connection
        await youtubeClient.initialize();
        const connectionTest = await youtubeClient.testConnection();
        if (!connectionTest) {
            throw new Error('YouTube API connection failed');
        }
        console.log('YouTube API connection established successfully');
        // Detect trends using the working service
        const results = await trendDetectionService.detectTrends();
        // Get detailed trends data for each topic
        const enhancedResults = [];
        for (const result of results) {
            if (result.trendsFound > 0) {
                // Get the actual trends data by searching again
                const searchResults = await youtubeClient.searchVideos(`${result.topic} trending`, Math.min(result.trendsFound, 5) // Limit to top 5 trends
                );
                const videoIds = searchResults.map(r => r.videoId);
                const videoDetails = await youtubeClient.getVideoDetails(videoIds);
                enhancedResults.push({
                    ...result,
                    trends: videoDetails.map(video => ({
                        videoId: video.id,
                        title: video.title,
                        description: video.description,
                        viewCount: video.viewCount,
                        likeCount: video.likeCount,
                        commentCount: video.commentCount,
                        publishedAt: video.publishedAt,
                        channelTitle: video.channelTitle,
                        categoryId: video.categoryId,
                        keywords: video.title.toLowerCase().split(' ').slice(0, 10),
                        engagementScore: (video.likeCount + video.commentCount) / Math.max(video.viewCount, 1),
                        topic: result.topic,
                        timestamp: new Date().toISOString()
                    }))
                });
            }
            else {
                enhancedResults.push({
                    ...result,
                    trends: []
                });
            }
        }
        const totalTrends = enhancedResults.reduce((sum, result) => sum + result.trendsFound, 0);
        const topicsAnalyzed = enhancedResults.map(result => result.topic);
        // Get quota usage (simple client doesn't track this, so we'll estimate)
        const quotaUsage = { used: config.topics.length * 10 }; // Estimate 10 quota units per topic
        console.log('Trend detection completed', {
            totalTrends,
            topicsAnalyzed,
            quotaUsed: quotaUsage.used,
            executionTime: Date.now() - startTime
        });
        // Publish CloudWatch metrics
        await publishMetrics({
            trendsDetected: totalTrends,
            topicsAnalyzed: topicsAnalyzed.length,
            quotaUsed: quotaUsage.used,
            executionTime: Date.now() - startTime
        });
        return {
            success: true,
            trendsDetected: totalTrends,
            topicsAnalyzed,
            results: enhancedResults.map(result => ({
                topic: result.topic,
                trendsFound: result.trendsFound,
                topTrend: result.topTrend,
                averageEngagement: result.averageEngagement,
                trends: result.trends // Include the actual trends data
            })),
            executionTime: Date.now() - startTime,
            quotaUsed: quotaUsage.used
        };
    }
    catch (error) {
        console.error('Trend detection failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            requestId: context.awsRequestId
        });
        // Publish error metrics
        await publishErrorMetrics(error instanceof Error ? error.message : String(error));
        return {
            success: false,
            trendsDetected: 0,
            topicsAnalyzed: [],
            results: [],
            executionTime: Date.now() - startTime,
            quotaUsed: 0,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};
exports.handler = handler;
async function publishMetrics(metrics) {
    try {
        const { CloudWatchClient, PutMetricDataCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-cloudwatch'));
        const cloudwatch = new CloudWatchClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        const metricData = [
            {
                MetricName: 'TrendsDetected',
                Value: metrics.trendsDetected,
                Unit: 'Count',
                Timestamp: new Date()
            },
            {
                MetricName: 'TopicsAnalyzed',
                Value: metrics.topicsAnalyzed,
                Unit: 'Count',
                Timestamp: new Date()
            },
            {
                MetricName: 'YouTubeQuotaUsed',
                Value: metrics.quotaUsed,
                Unit: 'Count',
                Timestamp: new Date()
            },
            {
                MetricName: 'ExecutionTime',
                Value: metrics.executionTime,
                Unit: 'Milliseconds',
                Timestamp: new Date()
            }
        ];
        await cloudwatch.send(new PutMetricDataCommand({
            Namespace: 'YouTubeAutomation/TrendDetector',
            MetricData: metricData
        }));
        console.log('Metrics published successfully');
    }
    catch (error) {
        console.error('Failed to publish metrics', error);
        // Don't throw - metrics failure shouldn't fail the main function
    }
}
async function publishErrorMetrics(errorMessage) {
    try {
        const { CloudWatchClient, PutMetricDataCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-cloudwatch'));
        const cloudwatch = new CloudWatchClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        await cloudwatch.send(new PutMetricDataCommand({
            Namespace: 'YouTubeAutomation/TrendDetector',
            MetricData: [
                {
                    MetricName: 'Errors',
                    Value: 1,
                    Unit: 'Count',
                    Timestamp: new Date(),
                    Dimensions: [
                        {
                            Name: 'ErrorType',
                            Value: errorMessage.substring(0, 50) // Truncate for dimension value
                        }
                    ]
                }
            ]
        }));
    }
    catch (error) {
        console.error('Failed to publish error metrics', error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0RkFBc0Y7QUFDdEYsc0dBQWdHO0FBQ2hHLDhFQUEwRTtBQXdCbkUsTUFBTSxPQUFPLEdBQXVELEtBQUssRUFDOUUsS0FBeUIsRUFDekIsT0FBZ0IsRUFDZ0IsRUFBRTtJQUNsQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsRUFBRTtRQUMzQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDL0IsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7S0FDdEMsQ0FBQyxDQUFDO0lBRUgsSUFBSTtRQUNGLHlEQUF5RDtRQUN6RCxNQUFNLGFBQWEsR0FBRyxJQUFJLGtEQUFzQixFQUFFLENBQUM7UUFDbkQsTUFBTSxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDO1lBQzFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVU7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUc7WUFDYixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUM7WUFDbkQsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7WUFDL0Isa0JBQWtCLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxFQUFFO1lBQzFDLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxJQUFJLEVBQUU7U0FDakMsQ0FBQztRQUVGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSw0REFBMkIsQ0FDM0QsYUFBYSxFQUNiLGVBQWUsRUFDZixNQUFNLENBQ1AsQ0FBQztRQUVGLGlDQUFpQztRQUNqQyxNQUFNLGFBQWEsQ0FBQyxVQUFVLEVBQUUsQ0FB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b0JBQW9CLENBQUM7WUFDN0MsU0FBUyxFQUFFLGlDQUFpQztZQUM1QyxVQUFVLEVBQUU7Z0JBQ1Y7b0JBQ0UsVUFBVSxFQUFFLFFBQVE7b0JBQ3BCLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxPQUFnQjtvQkFDdEIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO29CQUNyQixVQUFVLEVBQUU7d0JBQ1Y7NEJBQ0UsSUFBSSxFQUFFLFdBQVc7NEJBQ2pCLEtBQUssRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQywrQkFBK0I7eUJBQ3JFO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUMsQ0FBQztLQUNMO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3pEO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEhhbmRsZXIsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgWW91VHViZUFwaUNsaWVudFNpbXBsZSB9IGZyb20gJy4uLy4uL3NyYy9zZXJ2aWNlcy95b3V0dWJlLWFwaS1jbGllbnQtc2ltcGxlJztcclxuaW1wb3J0IHsgVHJlbmREZXRlY3Rpb25TZXJ2aWNlU2ltcGxlIH0gZnJvbSAnLi4vLi4vc3JjL3NlcnZpY2VzL3RyZW5kLWRldGVjdGlvbi1zZXJ2aWNlLXNpbXBsZSc7XHJcbmltcG9ydCB7IFRyZW5kUmVwb3NpdG9yeSB9IGZyb20gJy4uLy4uL3NyYy9yZXBvc2l0b3JpZXMvdHJlbmQtcmVwb3NpdG9yeSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRyZW5kRGV0ZWN0b3JFdmVudCB7XHJcbiAgdG9waWNzPzogc3RyaW5nW107XHJcbiAgcmVnaW9uPzogc3RyaW5nO1xyXG4gIG1heFJlc3VsdHM/OiBudW1iZXI7XHJcbiAgaG91cnNCYWNrPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRyZW5kRGV0ZWN0b3JSZXNwb25zZSB7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxuICB0cmVuZHNEZXRlY3RlZDogbnVtYmVyO1xyXG4gIHRvcGljc0FuYWx5emVkOiBzdHJpbmdbXTtcclxuICByZXN1bHRzOiBBcnJheTx7XHJcbiAgICB0b3BpYzogc3RyaW5nO1xyXG4gICAgdHJlbmRzRm91bmQ6IG51bWJlcjtcclxuICAgIHRvcFRyZW5kOiBhbnk7XHJcbiAgICBhdmVyYWdlRW5nYWdlbWVudDogbnVtYmVyO1xyXG4gIH0+O1xyXG4gIGV4ZWN1dGlvblRpbWU6IG51bWJlcjtcclxuICBxdW90YVVzZWQ6IG51bWJlcjtcclxuICBlcnJvcj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IEhhbmRsZXI8VHJlbmREZXRlY3RvckV2ZW50LCBUcmVuZERldGVjdG9yUmVzcG9uc2U+ID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBUcmVuZERldGVjdG9yRXZlbnQsXHJcbiAgY29udGV4dDogQ29udGV4dFxyXG4pOiBQcm9taXNlPFRyZW5kRGV0ZWN0b3JSZXNwb25zZT4gPT4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ1RyZW5kIERldGVjdG9yIExhbWJkYSBzdGFydGVkJywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIGV2ZW50OiBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMilcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEluaXRpYWxpemUgc2VydmljZXMgdXNpbmcgdGhlIHNpbXBsZSwgd29ya2luZyBhcHByb2FjaFxyXG4gICAgY29uc3QgeW91dHViZUNsaWVudCA9IG5ldyBZb3VUdWJlQXBpQ2xpZW50U2ltcGxlKCk7XHJcbiAgICBjb25zdCB0cmVuZFJlcG9zaXRvcnkgPSBuZXcgVHJlbmRSZXBvc2l0b3J5KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgY29uc3QgY29uZmlnID0ge1xyXG4gICAgICB0b3BpY3M6IGV2ZW50LnRvcGljcyB8fCBbJ3RlY2hub2xvZ3knLCAnaW52ZXN0aW5nJ10sXHJcbiAgICAgIHJlZ2lvbnM6IFtldmVudC5yZWdpb24gfHwgJ1VTJ10sXHJcbiAgICAgIG1heFJlc3VsdHNQZXJRdWVyeTogZXZlbnQubWF4UmVzdWx0cyB8fCAyMCxcclxuICAgICAgaG91cnNCYWNrOiBldmVudC5ob3Vyc0JhY2sgfHwgMjRcclxuICAgIH07XHJcbiAgICBcclxuICAgIGNvbnN0IHRyZW5kRGV0ZWN0aW9uU2VydmljZSA9IG5ldyBUcmVuZERldGVjdGlvblNlcnZpY2VTaW1wbGUoXHJcbiAgICAgIHlvdXR1YmVDbGllbnQsXHJcbiAgICAgIHRyZW5kUmVwb3NpdG9yeSxcclxuICAgICAgY29uZmlnXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICAvLyBJbml0aWFsaXplIGFuZCB0ZXN0IGNvbm5lY3Rpb25cclxuICAgIGF3YWl0IHlvdXR1YmVDbGllbnQuaW5pdGlhbGl6ZSgpO1xyXG4gICAgY29uc3QgY29ubmVjdGlvblRlc3QgPSBhd2FpdCB5b3V0dWJlQ2xpZW50LnRlc3RDb25uZWN0aW9uKCk7XHJcbiAgICBpZiAoIWNvbm5lY3Rpb25UZXN0KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91VHViZSBBUEkgY29ubmVjdGlvbiBmYWlsZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnWW91VHViZSBBUEkgY29ubmVjdGlvbiBlc3RhYmxpc2hlZCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAvLyBEZXRlY3QgdHJlbmRzIHVzaW5nIHRoZSB3b3JraW5nIHNlcnZpY2VcclxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0cmVuZERldGVjdGlvblNlcnZpY2UuZGV0ZWN0VHJlbmRzKCk7XHJcbiAgICBcclxuICAgIC8vIEdldCBkZXRhaWxlZCB0cmVuZHMgZGF0YSBmb3IgZWFjaCB0b3BpY1xyXG4gICAgY29uc3QgZW5oYW5jZWRSZXN1bHRzID0gW107XHJcbiAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiByZXN1bHRzKSB7XHJcbiAgICAgIGlmIChyZXN1bHQudHJlbmRzRm91bmQgPiAwKSB7XHJcbiAgICAgICAgLy8gR2V0IHRoZSBhY3R1YWwgdHJlbmRzIGRhdGEgYnkgc2VhcmNoaW5nIGFnYWluXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoUmVzdWx0cyA9IGF3YWl0IHlvdXR1YmVDbGllbnQuc2VhcmNoVmlkZW9zKFxyXG4gICAgICAgICAgYCR7cmVzdWx0LnRvcGljfSB0cmVuZGluZ2AsXHJcbiAgICAgICAgICBNYXRoLm1pbihyZXN1bHQudHJlbmRzRm91bmQsIDUpIC8vIExpbWl0IHRvIHRvcCA1IHRyZW5kc1xyXG4gICAgICAgICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgdmlkZW9JZHMgPSBzZWFyY2hSZXN1bHRzLm1hcChyID0+IHIudmlkZW9JZCk7XHJcbiAgICAgICAgY29uc3QgdmlkZW9EZXRhaWxzID0gYXdhaXQgeW91dHViZUNsaWVudC5nZXRWaWRlb0RldGFpbHModmlkZW9JZHMpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVuaGFuY2VkUmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgIC4uLnJlc3VsdCxcclxuICAgICAgICAgIHRyZW5kczogdmlkZW9EZXRhaWxzLm1hcCh2aWRlbyA9PiAoe1xyXG4gICAgICAgICAgICB2aWRlb0lkOiB2aWRlby5pZCxcclxuICAgICAgICAgICAgdGl0bGU6IHZpZGVvLnRpdGxlLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogdmlkZW8uZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICAgIHZpZXdDb3VudDogdmlkZW8udmlld0NvdW50LFxyXG4gICAgICAgICAgICBsaWtlQ291bnQ6IHZpZGVvLmxpa2VDb3VudCxcclxuICAgICAgICAgICAgY29tbWVudENvdW50OiB2aWRlby5jb21tZW50Q291bnQsXHJcbiAgICAgICAgICAgIHB1Ymxpc2hlZEF0OiB2aWRlby5wdWJsaXNoZWRBdCxcclxuICAgICAgICAgICAgY2hhbm5lbFRpdGxlOiB2aWRlby5jaGFubmVsVGl0bGUsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5SWQ6IHZpZGVvLmNhdGVnb3J5SWQsXHJcbiAgICAgICAgICAgIGtleXdvcmRzOiB2aWRlby50aXRsZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCcgJykuc2xpY2UoMCwgMTApLFxyXG4gICAgICAgICAgICBlbmdhZ2VtZW50U2NvcmU6ICh2aWRlby5saWtlQ291bnQgKyB2aWRlby5jb21tZW50Q291bnQpIC8gTWF0aC5tYXgodmlkZW8udmlld0NvdW50LCAxKSxcclxuICAgICAgICAgICAgdG9waWM6IHJlc3VsdC50b3BpYyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH0pKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGVuaGFuY2VkUmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgIC4uLnJlc3VsdCxcclxuICAgICAgICAgIHRyZW5kczogW11cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCB0b3RhbFRyZW5kcyA9IGVuaGFuY2VkUmVzdWx0cy5yZWR1Y2UoKHN1bSwgcmVzdWx0KSA9PiBzdW0gKyByZXN1bHQudHJlbmRzRm91bmQsIDApO1xyXG4gICAgY29uc3QgdG9waWNzQW5hbHl6ZWQgPSBlbmhhbmNlZFJlc3VsdHMubWFwKHJlc3VsdCA9PiByZXN1bHQudG9waWMpO1xyXG5cclxuICAgIC8vIEdldCBxdW90YSB1c2FnZSAoc2ltcGxlIGNsaWVudCBkb2Vzbid0IHRyYWNrIHRoaXMsIHNvIHdlJ2xsIGVzdGltYXRlKVxyXG4gICAgY29uc3QgcXVvdGFVc2FnZSA9IHsgdXNlZDogY29uZmlnLnRvcGljcy5sZW5ndGggKiAxMCB9OyAvLyBFc3RpbWF0ZSAxMCBxdW90YSB1bml0cyBwZXIgdG9waWNcclxuXHJcbiAgICBjb25zb2xlLmxvZygnVHJlbmQgZGV0ZWN0aW9uIGNvbXBsZXRlZCcsIHtcclxuICAgICAgdG90YWxUcmVuZHMsXHJcbiAgICAgIHRvcGljc0FuYWx5emVkLFxyXG4gICAgICBxdW90YVVzZWQ6IHF1b3RhVXNhZ2UudXNlZCxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHVibGlzaCBDbG91ZFdhdGNoIG1ldHJpY3NcclxuICAgIGF3YWl0IHB1Ymxpc2hNZXRyaWNzKHtcclxuICAgICAgdHJlbmRzRGV0ZWN0ZWQ6IHRvdGFsVHJlbmRzLFxyXG4gICAgICB0b3BpY3NBbmFseXplZDogdG9waWNzQW5hbHl6ZWQubGVuZ3RoLFxyXG4gICAgICBxdW90YVVzZWQ6IHF1b3RhVXNhZ2UudXNlZCxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgdHJlbmRzRGV0ZWN0ZWQ6IHRvdGFsVHJlbmRzLFxyXG4gICAgICB0b3BpY3NBbmFseXplZCxcclxuICAgICAgcmVzdWx0czogZW5oYW5jZWRSZXN1bHRzLm1hcChyZXN1bHQgPT4gKHtcclxuICAgICAgICB0b3BpYzogcmVzdWx0LnRvcGljLFxyXG4gICAgICAgIHRyZW5kc0ZvdW5kOiByZXN1bHQudHJlbmRzRm91bmQsXHJcbiAgICAgICAgdG9wVHJlbmQ6IHJlc3VsdC50b3BUcmVuZCxcclxuICAgICAgICBhdmVyYWdlRW5nYWdlbWVudDogcmVzdWx0LmF2ZXJhZ2VFbmdhZ2VtZW50LFxyXG4gICAgICAgIHRyZW5kczogcmVzdWx0LnRyZW5kcyAvLyBJbmNsdWRlIHRoZSBhY3R1YWwgdHJlbmRzIGRhdGFcclxuICAgICAgfSkpLFxyXG4gICAgICBleGVjdXRpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBxdW90YVVzZWQ6IHF1b3RhVXNhZ2UudXNlZFxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1RyZW5kIGRldGVjdGlvbiBmYWlsZWQnLCB7XHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgIHN0YWNrOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiB1bmRlZmluZWQsXHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFB1Ymxpc2ggZXJyb3IgbWV0cmljc1xyXG4gICAgYXdhaXQgcHVibGlzaEVycm9yTWV0cmljcyhlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICB0cmVuZHNEZXRlY3RlZDogMCxcclxuICAgICAgdG9waWNzQW5hbHl6ZWQ6IFtdLFxyXG4gICAgICByZXN1bHRzOiBbXSxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgcXVvdGFVc2VkOiAwLFxyXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hNZXRyaWNzKG1ldHJpY3M6IHtcclxuICB0cmVuZHNEZXRlY3RlZDogbnVtYmVyO1xyXG4gIHRvcGljc0FuYWx5emVkOiBudW1iZXI7XHJcbiAgcXVvdGFVc2VkOiBudW1iZXI7XHJcbiAgZXhlY3V0aW9uVGltZTogbnVtYmVyO1xyXG59KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgQ2xvdWRXYXRjaENsaWVudCwgUHV0TWV0cmljRGF0YUNvbW1hbmQgfSA9IGF3YWl0IGltcG9ydCgnQGF3cy1zZGsvY2xpZW50LWNsb3Vkd2F0Y2gnKTtcclxuICAgIFxyXG4gICAgY29uc3QgY2xvdWR3YXRjaCA9IG5ldyBDbG91ZFdhdGNoQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBtZXRyaWNEYXRhID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RyZW5kc0RldGVjdGVkJyxcclxuICAgICAgICBWYWx1ZTogbWV0cmljcy50cmVuZHNEZXRlY3RlZCxcclxuICAgICAgICBVbml0OiAnQ291bnQnIGFzIGNvbnN0LFxyXG4gICAgICAgIFRpbWVzdGFtcDogbmV3IERhdGUoKVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RvcGljc0FuYWx5emVkJyxcclxuICAgICAgICBWYWx1ZTogbWV0cmljcy50b3BpY3NBbmFseXplZCxcclxuICAgICAgICBVbml0OiAnQ291bnQnIGFzIGNvbnN0LFxyXG4gICAgICAgIFRpbWVzdGFtcDogbmV3IERhdGUoKVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1lvdVR1YmVRdW90YVVzZWQnLFxyXG4gICAgICAgIFZhbHVlOiBtZXRyaWNzLnF1b3RhVXNlZCxcclxuICAgICAgICBVbml0OiAnQ291bnQnIGFzIGNvbnN0LFxyXG4gICAgICAgIFRpbWVzdGFtcDogbmV3IERhdGUoKVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0V4ZWN1dGlvblRpbWUnLFxyXG4gICAgICAgIFZhbHVlOiBtZXRyaWNzLmV4ZWN1dGlvblRpbWUsXHJcbiAgICAgICAgVW5pdDogJ01pbGxpc2Vjb25kcycgYXMgY29uc3QsXHJcbiAgICAgICAgVGltZXN0YW1wOiBuZXcgRGF0ZSgpXHJcbiAgICAgIH1cclxuICAgIF07XHJcblxyXG4gICAgYXdhaXQgY2xvdWR3YXRjaC5zZW5kKG5ldyBQdXRNZXRyaWNEYXRhQ29tbWFuZCh7XHJcbiAgICAgIE5hbWVzcGFjZTogJ1lvdVR1YmVBdXRvbWF0aW9uL1RyZW5kRGV0ZWN0b3InLFxyXG4gICAgICBNZXRyaWNEYXRhOiBtZXRyaWNEYXRhXHJcbiAgICB9KSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ01ldHJpY3MgcHVibGlzaGVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcHVibGlzaCBtZXRyaWNzJywgZXJyb3IpO1xyXG4gICAgLy8gRG9uJ3QgdGhyb3cgLSBtZXRyaWNzIGZhaWx1cmUgc2hvdWxkbid0IGZhaWwgdGhlIG1haW4gZnVuY3Rpb25cclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hFcnJvck1ldHJpY3MoZXJyb3JNZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBDbG91ZFdhdGNoQ2xpZW50LCBQdXRNZXRyaWNEYXRhQ29tbWFuZCB9ID0gYXdhaXQgaW1wb3J0KCdAYXdzLXNkay9jbGllbnQtY2xvdWR3YXRjaCcpO1xyXG4gICAgXHJcbiAgICBjb25zdCBjbG91ZHdhdGNoID0gbmV3IENsb3VkV2F0Y2hDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGNsb3Vkd2F0Y2guc2VuZChuZXcgUHV0TWV0cmljRGF0YUNvbW1hbmQoe1xyXG4gICAgICBOYW1lc3BhY2U6ICdZb3VUdWJlQXV0b21hdGlvbi9UcmVuZERldGVjdG9yJyxcclxuICAgICAgTWV0cmljRGF0YTogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIE1ldHJpY05hbWU6ICdFcnJvcnMnLFxyXG4gICAgICAgICAgVmFsdWU6IDEsXHJcbiAgICAgICAgICBVbml0OiAnQ291bnQnIGFzIGNvbnN0LFxyXG4gICAgICAgICAgVGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgTmFtZTogJ0Vycm9yVHlwZScsXHJcbiAgICAgICAgICAgICAgVmFsdWU6IGVycm9yTWVzc2FnZS5zdWJzdHJpbmcoMCwgNTApIC8vIFRydW5jYXRlIGZvciBkaW1lbnNpb24gdmFsdWVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSkpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcHVibGlzaCBlcnJvciBtZXRyaWNzJywgZXJyb3IpO1xyXG4gIH1cclxufSJdfQ==