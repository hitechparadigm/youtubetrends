"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const trend_detection_service_simple_1 = require("./src/services/trend-detection-service-simple");
async function testSimpleTrendDetection() {
    console.log('🔍 Testing Simple Trend Detection (Direct API)...');
    try {
        const trendService = new trend_detection_service_simple_1.TrendDetectionServiceSimple();
        console.log('🌐 Testing API connection...');
        const connectionTest = await trendService.testConnection();
        if (!connectionTest) {
            console.log('❌ API connection failed');
            return;
        }
        console.log('✅ API connection successful!');
        console.log('\n🔍 Analyzing trends for technology...');
        const trends = await trendService.analyzeTrends('technology');
        console.log(`📊 Found ${trends.length} trends`);
        if (trends.length > 0) {
            console.log('\n🏆 Top 3 Trends:');
            for (let i = 0; i < Math.min(3, trends.length); i++) {
                const trend = trends[i];
                console.log(`\n${i + 1}. ${trend.title}`);
                console.log(`   👀 Views: ${trend.viewCount.toLocaleString()}`);
                console.log(`   📊 Engagement: ${(trend.engagementScore * 100).toFixed(2)}%`);
                console.log(`   🏷️ Keywords: ${trend.keywords.slice(0, 3).join(', ')}`);
            }
            console.log('\n✅ Trend detection is working correctly!');
            console.log('💡 The issue is likely in the Lambda function\'s YouTube API client initialization.');
        }
        else {
            console.log('📭 No trends found, but API is working.');
        }
    }
    catch (error) {
        console.error('🚨 Test failed:', error);
    }
}
// Run the test
testSimpleTrendDetection();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1zaW1wbGUtdHJlbmQtZGV0ZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdC1zaW1wbGUtdHJlbmQtZGV0ZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0dBQTRGO0FBRTVGLEtBQUssVUFBVSx3QkFBd0I7SUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0lBRWpFLElBQUk7UUFDRixNQUFNLFlBQVksR0FBRyxJQUFJLDREQUEyQixFQUFFLENBQUM7UUFFdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sY0FBYyxHQUFHLE1BQU0sWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRTNELElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU87U0FDUjtRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUU1QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxZQUFZLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRTlELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxNQUFNLENBQUMsTUFBTSxTQUFTLENBQUMsQ0FBQztRQUVoRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzlFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzFFO1lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMscUZBQXFGLENBQUMsQ0FBQztTQUNwRzthQUFNO1lBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1NBQ3hEO0tBRUY7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDekM7QUFDSCxDQUFDO0FBRUQsZUFBZTtBQUNmLHdCQUF3QixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUcmVuZERldGVjdGlvblNlcnZpY2VTaW1wbGUgfSBmcm9tICcuL3NyYy9zZXJ2aWNlcy90cmVuZC1kZXRlY3Rpb24tc2VydmljZS1zaW1wbGUnO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gdGVzdFNpbXBsZVRyZW5kRGV0ZWN0aW9uKCkge1xyXG4gIGNvbnNvbGUubG9nKCfwn5SNIFRlc3RpbmcgU2ltcGxlIFRyZW5kIERldGVjdGlvbiAoRGlyZWN0IEFQSSkuLi4nKTtcclxuICBcclxuICB0cnkge1xyXG4gICAgY29uc3QgdHJlbmRTZXJ2aWNlID0gbmV3IFRyZW5kRGV0ZWN0aW9uU2VydmljZVNpbXBsZSgpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygn8J+MkCBUZXN0aW5nIEFQSSBjb25uZWN0aW9uLi4uJyk7XHJcbiAgICBjb25zdCBjb25uZWN0aW9uVGVzdCA9IGF3YWl0IHRyZW5kU2VydmljZS50ZXN0Q29ubmVjdGlvbigpO1xyXG4gICAgXHJcbiAgICBpZiAoIWNvbm5lY3Rpb25UZXN0KSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCfinYwgQVBJIGNvbm5lY3Rpb24gZmFpbGVkJyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coJ+KchSBBUEkgY29ubmVjdGlvbiBzdWNjZXNzZnVsIScpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnXFxu8J+UjSBBbmFseXppbmcgdHJlbmRzIGZvciB0ZWNobm9sb2d5Li4uJyk7XHJcbiAgICBjb25zdCB0cmVuZHMgPSBhd2FpdCB0cmVuZFNlcnZpY2UuYW5hbHl6ZVRyZW5kcygndGVjaG5vbG9neScpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZyhg8J+TiiBGb3VuZCAke3RyZW5kcy5sZW5ndGh9IHRyZW5kc2ApO1xyXG4gICAgXHJcbiAgICBpZiAodHJlbmRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc29sZS5sb2coJ1xcbvCfj4YgVG9wIDMgVHJlbmRzOicpO1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKDMsIHRyZW5kcy5sZW5ndGgpOyBpKyspIHtcclxuICAgICAgICBjb25zdCB0cmVuZCA9IHRyZW5kc1tpXTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgXFxuJHtpICsgMX0uICR7dHJlbmQudGl0bGV9YCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYCAgIPCfkYAgVmlld3M6ICR7dHJlbmQudmlld0NvdW50LnRvTG9jYWxlU3RyaW5nKCl9YCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYCAgIPCfk4ogRW5nYWdlbWVudDogJHsodHJlbmQuZW5nYWdlbWVudFNjb3JlICogMTAwKS50b0ZpeGVkKDIpfSVgKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgICAg8J+Pt++4jyBLZXl3b3JkczogJHt0cmVuZC5rZXl3b3Jkcy5zbGljZSgwLCAzKS5qb2luKCcsICcpfWApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBjb25zb2xlLmxvZygnXFxu4pyFIFRyZW5kIGRldGVjdGlvbiBpcyB3b3JraW5nIGNvcnJlY3RseSEnKTtcclxuICAgICAgY29uc29sZS5sb2coJ/CfkqEgVGhlIGlzc3VlIGlzIGxpa2VseSBpbiB0aGUgTGFtYmRhIGZ1bmN0aW9uXFwncyBZb3VUdWJlIEFQSSBjbGllbnQgaW5pdGlhbGl6YXRpb24uJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZygn8J+TrSBObyB0cmVuZHMgZm91bmQsIGJ1dCBBUEkgaXMgd29ya2luZy4nKTtcclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ/CfmqggVGVzdCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVuIHRoZSB0ZXN0XHJcbnRlc3RTaW1wbGVUcmVuZERldGVjdGlvbigpOyJdfQ==