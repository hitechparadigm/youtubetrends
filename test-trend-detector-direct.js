"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_lambda_1 = require("@aws-sdk/client-lambda");
async function testTrendDetectorDirect() {
    console.log('🔍 Testing Trend Detector Lambda Directly...');
    try {
        const lambdaClient = new client_lambda_1.LambdaClient({ region: 'us-east-1' });
        // Test event for trend detector
        const testEvent = {
            topics: ['technology', 'investing'],
            region: 'US',
            maxResults: 10,
            hoursBack: 24
        };
        console.log('📤 Invoking Trend Detector Lambda...');
        console.log('Input:', JSON.stringify(testEvent, null, 2));
        const response = await lambdaClient.send(new client_lambda_1.InvokeCommand({
            FunctionName: 'youtube-automation-trend-detector',
            Payload: JSON.stringify(testEvent)
        }));
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        console.log('\n📊 Trend Detection Results:');
        console.log(`✅ Success: ${result.success}`);
        console.log(`📈 Trends Detected: ${result.trendsDetected}`);
        console.log(`🏷️ Topics Analyzed: ${result.topicsAnalyzed?.join(', ')}`);
        console.log(`⏱️ Execution Time: ${result.executionTime}ms`);
        console.log(`📊 Quota Used: ${result.quotaUsed}`);
        if (result.results && result.results.length > 0) {
            console.log('\n🎯 Detailed Results:');
            for (const topicResult of result.results) {
                console.log(`\n📂 Topic: ${topicResult.topic}`);
                console.log(`   📈 Trends Found: ${topicResult.trendsFound}`);
                console.log(`   📊 Average Engagement: ${(topicResult.averageEngagement * 100).toFixed(2)}%`);
                if (topicResult.topTrend) {
                    console.log(`   🏆 Top Trend: ${topicResult.topTrend.title}`);
                    console.log(`   👀 Views: ${topicResult.topTrend.viewCount?.toLocaleString()}`);
                    console.log(`   💬 Engagement: ${(topicResult.topTrend.engagementScore * 100).toFixed(2)}%`);
                }
            }
        }
        if (result.error) {
            console.log(`❌ Error: ${result.error}`);
        }
    }
    catch (error) {
        console.error('🚨 Test execution failed:', error);
    }
}
// Run the test
testTrendDetectorDirect();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC10cmVuZC1kZXRlY3Rvci1kaXJlY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LXRyZW5kLWRldGVjdG9yLWRpcmVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDBEQUFxRTtBQUVyRSxLQUFLLFVBQVUsdUJBQXVCO0lBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOENBQThDLENBQUMsQ0FBQztJQUU1RCxJQUFJO1FBQ0YsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFL0QsZ0NBQWdDO1FBQ2hDLE1BQU0sU0FBUyxHQUFHO1lBQ2hCLE1BQU0sRUFBRSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUM7WUFDbkMsTUFBTSxFQUFFLElBQUk7WUFDWixVQUFVLEVBQUUsRUFBRTtZQUNkLFNBQVMsRUFBRSxFQUFFO1NBQ2QsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLENBQUMsQ0FBQztRQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUxRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSw2QkFBYSxDQUFDO1lBQ3pELFlBQVksRUFBRSxtQ0FBbUM7WUFDakQsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1NBQ25DLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUV0RSxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6RSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixNQUFNLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQztRQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUVsRCxJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN0QyxLQUFLLE1BQU0sV0FBVyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsV0FBVyxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRTlGLElBQUksV0FBVyxDQUFDLFFBQVEsRUFBRTtvQkFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO29CQUM5RCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2hGLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDOUY7YUFDRjtTQUNGO1FBRUQsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztTQUN6QztLQUVGO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ25EO0FBQ0gsQ0FBQztBQUVELGVBQWU7QUFDZix1QkFBdUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGFtYmRhQ2xpZW50LCBJbnZva2VDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWxhbWJkYSc7XHJcblxyXG5hc3luYyBmdW5jdGlvbiB0ZXN0VHJlbmREZXRlY3RvckRpcmVjdCgpIHtcclxuICBjb25zb2xlLmxvZygn8J+UjSBUZXN0aW5nIFRyZW5kIERldGVjdG9yIExhbWJkYSBEaXJlY3RseS4uLicpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBsYW1iZGFDbGllbnQgPSBuZXcgTGFtYmRhQ2xpZW50KHsgcmVnaW9uOiAndXMtZWFzdC0xJyB9KTtcclxuICAgIFxyXG4gICAgLy8gVGVzdCBldmVudCBmb3IgdHJlbmQgZGV0ZWN0b3JcclxuICAgIGNvbnN0IHRlc3RFdmVudCA9IHtcclxuICAgICAgdG9waWNzOiBbJ3RlY2hub2xvZ3knLCAnaW52ZXN0aW5nJ10sXHJcbiAgICAgIHJlZ2lvbjogJ1VTJyxcclxuICAgICAgbWF4UmVzdWx0czogMTAsXHJcbiAgICAgIGhvdXJzQmFjazogMjRcclxuICAgIH07XHJcblxyXG4gICAgY29uc29sZS5sb2coJ/Cfk6QgSW52b2tpbmcgVHJlbmQgRGV0ZWN0b3IgTGFtYmRhLi4uJyk7XHJcbiAgICBjb25zb2xlLmxvZygnSW5wdXQ6JywgSlNPTi5zdHJpbmdpZnkodGVzdEV2ZW50LCBudWxsLCAyKSk7XHJcbiAgICBcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbGFtYmRhQ2xpZW50LnNlbmQobmV3IEludm9rZUNvbW1hbmQoe1xyXG4gICAgICBGdW5jdGlvbk5hbWU6ICd5b3V0dWJlLWF1dG9tYXRpb24tdHJlbmQtZGV0ZWN0b3InLFxyXG4gICAgICBQYXlsb2FkOiBKU09OLnN0cmluZ2lmeSh0ZXN0RXZlbnQpXHJcbiAgICB9KSk7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gSlNPTi5wYXJzZShuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUocmVzcG9uc2UuUGF5bG9hZCkpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnXFxu8J+TiiBUcmVuZCBEZXRlY3Rpb24gUmVzdWx0czonKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgU3VjY2VzczogJHtyZXN1bHQuc3VjY2Vzc31gKTtcclxuICAgIGNvbnNvbGUubG9nKGDwn5OIIFRyZW5kcyBEZXRlY3RlZDogJHtyZXN1bHQudHJlbmRzRGV0ZWN0ZWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+Pt++4jyBUb3BpY3MgQW5hbHl6ZWQ6ICR7cmVzdWx0LnRvcGljc0FuYWx5emVkPy5qb2luKCcsICcpfWApO1xyXG4gICAgY29uc29sZS5sb2coYOKPse+4jyBFeGVjdXRpb24gVGltZTogJHtyZXN1bHQuZXhlY3V0aW9uVGltZX1tc2ApO1xyXG4gICAgY29uc29sZS5sb2coYPCfk4ogUXVvdGEgVXNlZDogJHtyZXN1bHQucXVvdGFVc2VkfWApO1xyXG4gICAgXHJcbiAgICBpZiAocmVzdWx0LnJlc3VsdHMgJiYgcmVzdWx0LnJlc3VsdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zb2xlLmxvZygnXFxu8J+OryBEZXRhaWxlZCBSZXN1bHRzOicpO1xyXG4gICAgICBmb3IgKGNvbnN0IHRvcGljUmVzdWx0IG9mIHJlc3VsdC5yZXN1bHRzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFxcbvCfk4IgVG9waWM6ICR7dG9waWNSZXN1bHQudG9waWN9YCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYCAgIPCfk4ggVHJlbmRzIEZvdW5kOiAke3RvcGljUmVzdWx0LnRyZW5kc0ZvdW5kfWApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGAgICDwn5OKIEF2ZXJhZ2UgRW5nYWdlbWVudDogJHsodG9waWNSZXN1bHQuYXZlcmFnZUVuZ2FnZW1lbnQgKiAxMDApLnRvRml4ZWQoMil9JWApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0b3BpY1Jlc3VsdC50b3BUcmVuZCkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coYCAgIPCfj4YgVG9wIFRyZW5kOiAke3RvcGljUmVzdWx0LnRvcFRyZW5kLnRpdGxlfWApO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coYCAgIPCfkYAgVmlld3M6ICR7dG9waWNSZXN1bHQudG9wVHJlbmQudmlld0NvdW50Py50b0xvY2FsZVN0cmluZygpfWApO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coYCAgIPCfkqwgRW5nYWdlbWVudDogJHsodG9waWNSZXN1bHQudG9wVHJlbmQuZW5nYWdlbWVudFNjb3JlICogMTAwKS50b0ZpeGVkKDIpfSVgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKHJlc3VsdC5lcnJvcikge1xyXG4gICAgICBjb25zb2xlLmxvZyhg4p2MIEVycm9yOiAke3Jlc3VsdC5lcnJvcn1gKTtcclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ/CfmqggVGVzdCBleGVjdXRpb24gZmFpbGVkOicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1biB0aGUgdGVzdFxyXG50ZXN0VHJlbmREZXRlY3RvckRpcmVjdCgpOyJdfQ==