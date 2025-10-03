"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const youtube_api_client_simple_1 = require("./src/services/youtube-api-client-simple");
const trend_detection_service_simple_1 = require("./src/services/trend-detection-service-simple");
const trend_repository_1 = require("./src/repositories/trend-repository");
async function testDemoSimple() {
    console.log('🧪 Testing Demo with Simple Client...');
    try {
        // Initialize simple client
        const youtubeClient = new youtube_api_client_simple_1.YouTubeApiClientSimple();
        await youtubeClient.initialize();
        // Test connection
        const connectionTest = await youtubeClient.testConnection();
        if (!connectionTest) {
            throw new Error('Connection test failed');
        }
        console.log('✅ Simple client initialized and connected');
        // Initialize trend detection service
        const trendRepository = new trend_repository_1.TrendRepository();
        const config = {
            topics: ['cooking'],
            regions: ['US'],
            maxResultsPerQuery: 5,
            hoursBack: 48
        };
        const trendService = new trend_detection_service_simple_1.TrendDetectionServiceSimple(youtubeClient, trendRepository, config);
        // Test trend detection
        console.log('🔍 Testing trend detection...');
        const results = await trendService.detectTrends();
        console.log('✅ Trend detection results:');
        for (const result of results) {
            console.log(`  Topic: ${result.topic}`);
            console.log(`  Trends found: ${result.trendsFound}`);
            console.log(`  Average engagement: ${(result.averageEngagement * 100).toFixed(2)}%`);
            if (result.topTrend) {
                console.log(`  Top trend: ${result.topTrend.title}`);
                console.log(`  Views: ${result.topTrend.viewCount.toLocaleString()}`);
            }
        }
        console.log('\n🎉 Demo simple client test passed!');
        return true;
    }
    catch (error) {
        console.error('❌ Demo test failed:', error);
        return false;
    }
}
testDemoSimple();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1kZW1vLXNpbXBsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtZGVtby1zaW1wbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3RkFBa0Y7QUFDbEYsa0dBQTRGO0FBQzVGLDBFQUFzRTtBQUV0RSxLQUFLLFVBQVUsY0FBYztJQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7SUFFckQsSUFBSTtRQUNGLDJCQUEyQjtRQUMzQixNQUFNLGFBQWEsR0FBRyxJQUFJLGtEQUFzQixFQUFFLENBQUM7UUFDbkQsTUFBTSxhQUFhLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFakMsa0JBQWtCO1FBQ2xCLE1BQU0sY0FBYyxHQUFHLE1BQU0sYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzVELElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzNDO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBRXpELHFDQUFxQztRQUNyQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGtDQUFlLEVBQUUsQ0FBQztRQUM5QyxNQUFNLE1BQU0sR0FBRztZQUNiLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQztZQUNuQixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUM7WUFDZixrQkFBa0IsRUFBRSxDQUFDO1lBQ3JCLFNBQVMsRUFBRSxFQUFFO1NBQ2QsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksNERBQTJCLENBQUMsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU3Rix1QkFBdUI7UUFDdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sT0FBTyxHQUFHLE1BQU0sWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRWxELE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtZQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyRixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUU7Z0JBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN2RTtTQUNGO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sSUFBSSxDQUFDO0tBRWI7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUMsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFFRCxjQUFjLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFlvdVR1YmVBcGlDbGllbnRTaW1wbGUgfSBmcm9tICcuL3NyYy9zZXJ2aWNlcy95b3V0dWJlLWFwaS1jbGllbnQtc2ltcGxlJztcclxuaW1wb3J0IHsgVHJlbmREZXRlY3Rpb25TZXJ2aWNlU2ltcGxlIH0gZnJvbSAnLi9zcmMvc2VydmljZXMvdHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2Utc2ltcGxlJztcclxuaW1wb3J0IHsgVHJlbmRSZXBvc2l0b3J5IH0gZnJvbSAnLi9zcmMvcmVwb3NpdG9yaWVzL3RyZW5kLXJlcG9zaXRvcnknO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gdGVzdERlbW9TaW1wbGUoKSB7XHJcbiAgY29uc29sZS5sb2coJ/Cfp6ogVGVzdGluZyBEZW1vIHdpdGggU2ltcGxlIENsaWVudC4uLicpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBJbml0aWFsaXplIHNpbXBsZSBjbGllbnRcclxuICAgIGNvbnN0IHlvdXR1YmVDbGllbnQgPSBuZXcgWW91VHViZUFwaUNsaWVudFNpbXBsZSgpO1xyXG4gICAgYXdhaXQgeW91dHViZUNsaWVudC5pbml0aWFsaXplKCk7XHJcbiAgICBcclxuICAgIC8vIFRlc3QgY29ubmVjdGlvblxyXG4gICAgY29uc3QgY29ubmVjdGlvblRlc3QgPSBhd2FpdCB5b3V0dWJlQ2xpZW50LnRlc3RDb25uZWN0aW9uKCk7XHJcbiAgICBpZiAoIWNvbm5lY3Rpb25UZXN0KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ29ubmVjdGlvbiB0ZXN0IGZhaWxlZCcpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygn4pyFIFNpbXBsZSBjbGllbnQgaW5pdGlhbGl6ZWQgYW5kIGNvbm5lY3RlZCcpO1xyXG4gICAgXHJcbiAgICAvLyBJbml0aWFsaXplIHRyZW5kIGRldGVjdGlvbiBzZXJ2aWNlXHJcbiAgICBjb25zdCB0cmVuZFJlcG9zaXRvcnkgPSBuZXcgVHJlbmRSZXBvc2l0b3J5KCk7XHJcbiAgICBjb25zdCBjb25maWcgPSB7XHJcbiAgICAgIHRvcGljczogWydjb29raW5nJ10sXHJcbiAgICAgIHJlZ2lvbnM6IFsnVVMnXSxcclxuICAgICAgbWF4UmVzdWx0c1BlclF1ZXJ5OiA1LFxyXG4gICAgICBob3Vyc0JhY2s6IDQ4XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBjb25zdCB0cmVuZFNlcnZpY2UgPSBuZXcgVHJlbmREZXRlY3Rpb25TZXJ2aWNlU2ltcGxlKHlvdXR1YmVDbGllbnQsIHRyZW5kUmVwb3NpdG9yeSwgY29uZmlnKTtcclxuICAgIFxyXG4gICAgLy8gVGVzdCB0cmVuZCBkZXRlY3Rpb25cclxuICAgIGNvbnNvbGUubG9nKCfwn5SNIFRlc3RpbmcgdHJlbmQgZGV0ZWN0aW9uLi4uJyk7XHJcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgdHJlbmRTZXJ2aWNlLmRldGVjdFRyZW5kcygpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygn4pyFIFRyZW5kIGRldGVjdGlvbiByZXN1bHRzOicpO1xyXG4gICAgZm9yIChjb25zdCByZXN1bHQgb2YgcmVzdWx0cykge1xyXG4gICAgICBjb25zb2xlLmxvZyhgICBUb3BpYzogJHtyZXN1bHQudG9waWN9YCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGAgIFRyZW5kcyBmb3VuZDogJHtyZXN1bHQudHJlbmRzRm91bmR9YCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGAgIEF2ZXJhZ2UgZW5nYWdlbWVudDogJHsocmVzdWx0LmF2ZXJhZ2VFbmdhZ2VtZW50ICogMTAwKS50b0ZpeGVkKDIpfSVgKTtcclxuICAgICAgaWYgKHJlc3VsdC50b3BUcmVuZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGAgIFRvcCB0cmVuZDogJHtyZXN1bHQudG9wVHJlbmQudGl0bGV9YCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYCAgVmlld3M6ICR7cmVzdWx0LnRvcFRyZW5kLnZpZXdDb3VudC50b0xvY2FsZVN0cmluZygpfWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKCdcXG7wn46JIERlbW8gc2ltcGxlIGNsaWVudCB0ZXN0IHBhc3NlZCEnKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gICAgXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBEZW1vIHRlc3QgZmFpbGVkOicsIGVycm9yKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbnRlc3REZW1vU2ltcGxlKCk7Il19