"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_lambda_1 = require("@aws-sdk/client-lambda");
async function testContentAnalyzer() {
    console.log('📝 Testing Content Analyzer Lambda...');
    try {
        const lambdaClient = new client_lambda_1.LambdaClient({ region: 'us-east-1' });
        // Sample trends data (simplified structure)
        const testEvent = {
            topic: 'technology',
            trendsData: [
                {
                    videoId: 'test123',
                    title: 'Top 15 New Technology Trends That Will Decide Who Rules The World',
                    description: 'Technology trends analysis...',
                    viewCount: 3079,
                    likeCount: 130,
                    commentCount: 2,
                    publishedAt: '2025-10-02T21:32:43Z',
                    channelTitle: 'AI Uncovered',
                    categoryId: '28',
                    keywords: ['technology', 'trends', 'AI', 'future'],
                    engagementScore: 2.05,
                    topic: 'technology',
                    timestamp: new Date().toISOString()
                }
            ],
            maxVideos: 2,
            minEngagementScore: 0.02
        };
        console.log('📤 Invoking Content Analyzer Lambda...');
        console.log('Input:', JSON.stringify(testEvent, null, 2));
        const response = await lambdaClient.send(new client_lambda_1.InvokeCommand({
            FunctionName: 'youtube-automation-content-analyzer',
            Payload: JSON.stringify(testEvent)
        }));
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        console.log('\n📊 Content Analysis Results:');
        console.log(`✅ Success: ${result.success}`);
        console.log(`📂 Topic: ${result.topic}`);
        console.log(`📈 Selected Trends: ${result.selectedTrends?.length || 0}`);
        console.log(`📝 Script Prompts: ${result.scriptPrompts?.length || 0}`);
        console.log(`⏱️ Execution Time: ${result.executionTime}ms`);
        if (result.scriptPrompts && result.scriptPrompts.length > 0) {
            console.log('\n🎯 Generated Script Prompts:');
            for (let i = 0; i < result.scriptPrompts.length; i++) {
                const prompt = result.scriptPrompts[i];
                console.log(`\n${i + 1}. ${prompt.title}`);
                console.log(`   🏷️ Keywords: ${prompt.keywords?.slice(0, 3).join(', ')}`);
                console.log(`   ⏱️ Estimated Length: ${prompt.estimatedLength} seconds`);
                console.log(`   📝 Prompt: ${prompt.prompt.substring(0, 100)}...`);
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
testContentAnalyzer();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1jb250ZW50LWFuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdC1jb250ZW50LWFuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMERBQXFFO0FBRXJFLEtBQUssVUFBVSxtQkFBbUI7SUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0lBRXJELElBQUk7UUFDRixNQUFNLFlBQVksR0FBRyxJQUFJLDRCQUFZLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUUvRCw0Q0FBNEM7UUFDNUMsTUFBTSxTQUFTLEdBQUc7WUFDaEIsS0FBSyxFQUFFLFlBQVk7WUFDbkIsVUFBVSxFQUFFO2dCQUNWO29CQUNFLE9BQU8sRUFBRSxTQUFTO29CQUNsQixLQUFLLEVBQUUsbUVBQW1FO29CQUMxRSxXQUFXLEVBQUUsK0JBQStCO29CQUM1QyxTQUFTLEVBQUUsSUFBSTtvQkFDZixTQUFTLEVBQUUsR0FBRztvQkFDZCxZQUFZLEVBQUUsQ0FBQztvQkFDZixXQUFXLEVBQUUsc0JBQXNCO29CQUNuQyxZQUFZLEVBQUUsY0FBYztvQkFDNUIsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQztvQkFDbEQsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLEtBQUssRUFBRSxZQUFZO29CQUNuQixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0Y7WUFDRCxTQUFTLEVBQUUsQ0FBQztZQUNaLGtCQUFrQixFQUFFLElBQUk7U0FDekIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQztRQUN0RCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUxRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSw2QkFBYSxDQUFDO1lBQ3pELFlBQVksRUFBRSxxQ0FBcUM7WUFDbkQsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1NBQ25DLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUV0RSxPQUFPLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixNQUFNLENBQUMsY0FBYyxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLE1BQU0sQ0FBQyxhQUFhLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsTUFBTSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUM7UUFFNUQsSUFBSSxNQUFNLENBQUMsYUFBYSxJQUFJLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUMzRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7WUFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNwRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLE1BQU0sQ0FBQyxlQUFlLFVBQVUsQ0FBQyxDQUFDO2dCQUN6RSxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3BFO1NBQ0Y7UUFFRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7WUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ3pDO0tBRUY7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbkQ7QUFDSCxDQUFDO0FBRUQsZUFBZTtBQUNmLG1CQUFtQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMYW1iZGFDbGllbnQsIEludm9rZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtbGFtYmRhJztcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRlc3RDb250ZW50QW5hbHl6ZXIoKSB7XHJcbiAgY29uc29sZS5sb2coJ/Cfk50gVGVzdGluZyBDb250ZW50IEFuYWx5emVyIExhbWJkYS4uLicpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBsYW1iZGFDbGllbnQgPSBuZXcgTGFtYmRhQ2xpZW50KHsgcmVnaW9uOiAndXMtZWFzdC0xJyB9KTtcclxuICAgIFxyXG4gICAgLy8gU2FtcGxlIHRyZW5kcyBkYXRhIChzaW1wbGlmaWVkIHN0cnVjdHVyZSlcclxuICAgIGNvbnN0IHRlc3RFdmVudCA9IHtcclxuICAgICAgdG9waWM6ICd0ZWNobm9sb2d5JyxcclxuICAgICAgdHJlbmRzRGF0YTogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHZpZGVvSWQ6ICd0ZXN0MTIzJyxcclxuICAgICAgICAgIHRpdGxlOiAnVG9wIDE1IE5ldyBUZWNobm9sb2d5IFRyZW5kcyBUaGF0IFdpbGwgRGVjaWRlIFdobyBSdWxlcyBUaGUgV29ybGQnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUZWNobm9sb2d5IHRyZW5kcyBhbmFseXNpcy4uLicsXHJcbiAgICAgICAgICB2aWV3Q291bnQ6IDMwNzksXHJcbiAgICAgICAgICBsaWtlQ291bnQ6IDEzMCxcclxuICAgICAgICAgIGNvbW1lbnRDb3VudDogMixcclxuICAgICAgICAgIHB1Ymxpc2hlZEF0OiAnMjAyNS0xMC0wMlQyMTozMjo0M1onLFxyXG4gICAgICAgICAgY2hhbm5lbFRpdGxlOiAnQUkgVW5jb3ZlcmVkJyxcclxuICAgICAgICAgIGNhdGVnb3J5SWQ6ICcyOCcsXHJcbiAgICAgICAgICBrZXl3b3JkczogWyd0ZWNobm9sb2d5JywgJ3RyZW5kcycsICdBSScsICdmdXR1cmUnXSxcclxuICAgICAgICAgIGVuZ2FnZW1lbnRTY29yZTogMi4wNSxcclxuICAgICAgICAgIHRvcGljOiAndGVjaG5vbG9neScsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgbWF4VmlkZW9zOiAyLFxyXG4gICAgICBtaW5FbmdhZ2VtZW50U2NvcmU6IDAuMDJcclxuICAgIH07XHJcblxyXG4gICAgY29uc29sZS5sb2coJ/Cfk6QgSW52b2tpbmcgQ29udGVudCBBbmFseXplciBMYW1iZGEuLi4nKTtcclxuICAgIGNvbnNvbGUubG9nKCdJbnB1dDonLCBKU09OLnN0cmluZ2lmeSh0ZXN0RXZlbnQsIG51bGwsIDIpKTtcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBsYW1iZGFDbGllbnQuc2VuZChuZXcgSW52b2tlQ29tbWFuZCh7XHJcbiAgICAgIEZ1bmN0aW9uTmFtZTogJ3lvdXR1YmUtYXV0b21hdGlvbi1jb250ZW50LWFuYWx5emVyJyxcclxuICAgICAgUGF5bG9hZDogSlNPTi5zdHJpbmdpZnkodGVzdEV2ZW50KVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UobmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHJlc3BvbnNlLlBheWxvYWQpKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coJ1xcbvCfk4ogQ29udGVudCBBbmFseXNpcyBSZXN1bHRzOicpO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBTdWNjZXNzOiAke3Jlc3VsdC5zdWNjZXNzfWApO1xyXG4gICAgY29uc29sZS5sb2coYPCfk4IgVG9waWM6ICR7cmVzdWx0LnRvcGljfWApO1xyXG4gICAgY29uc29sZS5sb2coYPCfk4ggU2VsZWN0ZWQgVHJlbmRzOiAke3Jlc3VsdC5zZWxlY3RlZFRyZW5kcz8ubGVuZ3RoIHx8IDB9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TnSBTY3JpcHQgUHJvbXB0czogJHtyZXN1bHQuc2NyaXB0UHJvbXB0cz8ubGVuZ3RoIHx8IDB9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4o+x77iPIEV4ZWN1dGlvbiBUaW1lOiAke3Jlc3VsdC5leGVjdXRpb25UaW1lfW1zYCk7XHJcbiAgICBcclxuICAgIGlmIChyZXN1bHQuc2NyaXB0UHJvbXB0cyAmJiByZXN1bHQuc2NyaXB0UHJvbXB0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdcXG7wn46vIEdlbmVyYXRlZCBTY3JpcHQgUHJvbXB0czonKTtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZXN1bHQuc2NyaXB0UHJvbXB0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGNvbnN0IHByb21wdCA9IHJlc3VsdC5zY3JpcHRQcm9tcHRzW2ldO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBcXG4ke2kgKyAxfS4gJHtwcm9tcHQudGl0bGV9YCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYCAgIPCfj7fvuI8gS2V5d29yZHM6ICR7cHJvbXB0LmtleXdvcmRzPy5zbGljZSgwLCAzKS5qb2luKCcsICcpfWApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGAgICDij7HvuI8gRXN0aW1hdGVkIExlbmd0aDogJHtwcm9tcHQuZXN0aW1hdGVkTGVuZ3RofSBzZWNvbmRzYCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYCAgIPCfk50gUHJvbXB0OiAke3Byb21wdC5wcm9tcHQuc3Vic3RyaW5nKDAsIDEwMCl9Li4uYCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKHJlc3VsdC5lcnJvcikge1xyXG4gICAgICBjb25zb2xlLmxvZyhg4p2MIEVycm9yOiAke3Jlc3VsdC5lcnJvcn1gKTtcclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ/CfmqggVGVzdCBleGVjdXRpb24gZmFpbGVkOicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1biB0aGUgdGVzdFxyXG50ZXN0Q29udGVudEFuYWx5emVyKCk7Il19