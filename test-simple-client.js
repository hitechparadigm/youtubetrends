"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const youtube_api_client_simple_1 = require("./src/services/youtube-api-client-simple");
async function testSimpleClient() {
    console.log('🧪 Testing Simple YouTube Client...');
    try {
        // Initialize the simple client
        const youtubeClient = new youtube_api_client_simple_1.YouTubeApiClientSimple();
        await youtubeClient.initialize();
        // Test connection
        const connectionTest = await youtubeClient.testConnection();
        if (!connectionTest) {
            throw new Error('Connection test failed');
        }
        console.log('✅ Connection test passed');
        // Test search
        console.log('🔍 Testing search...');
        const searchResults = await youtubeClient.searchVideos('cooking', 5);
        console.log(`✅ Found ${searchResults.length} videos`);
        if (searchResults.length > 0) {
            console.log('First video:', searchResults[0].title);
            // Test video details
            console.log('📊 Testing video details...');
            const videoDetails = await youtubeClient.getVideoDetails([searchResults[0].videoId]);
            console.log(`✅ Got details for ${videoDetails.length} videos`);
            console.log('View count:', videoDetails[0].viewCount.toLocaleString());
        }
        // Test trending videos
        console.log('📈 Testing trending videos...');
        const trendingVideos = await youtubeClient.getTrendingVideos();
        console.log(`✅ Found ${trendingVideos.length} trending videos`);
        // Test quota usage
        const quota = youtubeClient.getQuotaUsage();
        console.log(`📊 Quota used: ${quota.used}/${quota.limit}`);
        console.log('\n🎉 All tests passed! Simple client is working perfectly.');
        return true;
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}
testSimpleClient();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1zaW1wbGUtY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdC1zaW1wbGUtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsd0ZBQWtGO0FBSWxGLEtBQUssVUFBVSxnQkFBZ0I7SUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0lBRW5ELElBQUk7UUFDRiwrQkFBK0I7UUFDL0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxrREFBc0IsRUFBRSxDQUFDO1FBQ25ELE1BQU0sYUFBYSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRWpDLGtCQUFrQjtRQUNsQixNQUFNLGNBQWMsR0FBRyxNQUFNLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUM1RCxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztTQUMzQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUV4QyxjQUFjO1FBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sYUFBYSxHQUFHLE1BQU0sYUFBYSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLGFBQWEsQ0FBQyxNQUFNLFNBQVMsQ0FBQyxDQUFDO1FBRXRELElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXBELHFCQUFxQjtZQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDM0MsTUFBTSxZQUFZLEdBQUcsTUFBTSxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDckYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsWUFBWSxDQUFDLE1BQU0sU0FBUyxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1NBQ3hFO1FBRUQsdUJBQXVCO1FBQ3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUM3QyxNQUFNLGNBQWMsR0FBRyxNQUFNLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQy9ELE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxjQUFjLENBQUMsTUFBTSxrQkFBa0IsQ0FBQyxDQUFDO1FBRWhFLG1CQUFtQjtRQUNuQixNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUUzRCxPQUFPLENBQUMsR0FBRyxDQUFDLDREQUE0RCxDQUFDLENBQUM7UUFDMUUsT0FBTyxJQUFJLENBQUM7S0FFYjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2QyxPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQztBQUVELGdCQUFnQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBZb3VUdWJlQXBpQ2xpZW50U2ltcGxlIH0gZnJvbSAnLi9zcmMvc2VydmljZXMveW91dHViZS1hcGktY2xpZW50LXNpbXBsZSc7XHJcbmltcG9ydCB7IFRyZW5kRGV0ZWN0aW9uU2VydmljZVNpbXBsZSB9IGZyb20gJy4vc3JjL3NlcnZpY2VzL3RyZW5kLWRldGVjdGlvbi1zZXJ2aWNlLXNpbXBsZSc7XHJcbmltcG9ydCB7IFRyZW5kUmVwb3NpdG9yeSB9IGZyb20gJy4vc3JjL3JlcG9zaXRvcmllcy90cmVuZC1yZXBvc2l0b3J5JztcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRlc3RTaW1wbGVDbGllbnQoKSB7XHJcbiAgY29uc29sZS5sb2coJ/Cfp6ogVGVzdGluZyBTaW1wbGUgWW91VHViZSBDbGllbnQuLi4nKTtcclxuICBcclxuICB0cnkge1xyXG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgc2ltcGxlIGNsaWVudFxyXG4gICAgY29uc3QgeW91dHViZUNsaWVudCA9IG5ldyBZb3VUdWJlQXBpQ2xpZW50U2ltcGxlKCk7XHJcbiAgICBhd2FpdCB5b3V0dWJlQ2xpZW50LmluaXRpYWxpemUoKTtcclxuICAgIFxyXG4gICAgLy8gVGVzdCBjb25uZWN0aW9uXHJcbiAgICBjb25zdCBjb25uZWN0aW9uVGVzdCA9IGF3YWl0IHlvdXR1YmVDbGllbnQudGVzdENvbm5lY3Rpb24oKTtcclxuICAgIGlmICghY29ubmVjdGlvblRlc3QpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25uZWN0aW9uIHRlc3QgZmFpbGVkJyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKCfinIUgQ29ubmVjdGlvbiB0ZXN0IHBhc3NlZCcpO1xyXG4gICAgXHJcbiAgICAvLyBUZXN0IHNlYXJjaFxyXG4gICAgY29uc29sZS5sb2coJ/CflI0gVGVzdGluZyBzZWFyY2guLi4nKTtcclxuICAgIGNvbnN0IHNlYXJjaFJlc3VsdHMgPSBhd2FpdCB5b3V0dWJlQ2xpZW50LnNlYXJjaFZpZGVvcygnY29va2luZycsIDUpO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBGb3VuZCAke3NlYXJjaFJlc3VsdHMubGVuZ3RofSB2aWRlb3NgKTtcclxuICAgIFxyXG4gICAgaWYgKHNlYXJjaFJlc3VsdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zb2xlLmxvZygnRmlyc3QgdmlkZW86Jywgc2VhcmNoUmVzdWx0c1swXS50aXRsZSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBUZXN0IHZpZGVvIGRldGFpbHNcclxuICAgICAgY29uc29sZS5sb2coJ/Cfk4ogVGVzdGluZyB2aWRlbyBkZXRhaWxzLi4uJyk7XHJcbiAgICAgIGNvbnN0IHZpZGVvRGV0YWlscyA9IGF3YWl0IHlvdXR1YmVDbGllbnQuZ2V0VmlkZW9EZXRhaWxzKFtzZWFyY2hSZXN1bHRzWzBdLnZpZGVvSWRdKTtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBHb3QgZGV0YWlscyBmb3IgJHt2aWRlb0RldGFpbHMubGVuZ3RofSB2aWRlb3NgKTtcclxuICAgICAgY29uc29sZS5sb2coJ1ZpZXcgY291bnQ6JywgdmlkZW9EZXRhaWxzWzBdLnZpZXdDb3VudC50b0xvY2FsZVN0cmluZygpKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gVGVzdCB0cmVuZGluZyB2aWRlb3NcclxuICAgIGNvbnNvbGUubG9nKCfwn5OIIFRlc3RpbmcgdHJlbmRpbmcgdmlkZW9zLi4uJyk7XHJcbiAgICBjb25zdCB0cmVuZGluZ1ZpZGVvcyA9IGF3YWl0IHlvdXR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3MoKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgRm91bmQgJHt0cmVuZGluZ1ZpZGVvcy5sZW5ndGh9IHRyZW5kaW5nIHZpZGVvc2ApO1xyXG4gICAgXHJcbiAgICAvLyBUZXN0IHF1b3RhIHVzYWdlXHJcbiAgICBjb25zdCBxdW90YSA9IHlvdXR1YmVDbGllbnQuZ2V0UXVvdGFVc2FnZSgpO1xyXG4gICAgY29uc29sZS5sb2coYPCfk4ogUXVvdGEgdXNlZDogJHtxdW90YS51c2VkfS8ke3F1b3RhLmxpbWl0fWApO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnXFxu8J+OiSBBbGwgdGVzdHMgcGFzc2VkISBTaW1wbGUgY2xpZW50IGlzIHdvcmtpbmcgcGVyZmVjdGx5LicpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgICBcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcign4p2MIFRlc3QgZmFpbGVkOicsIGVycm9yKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbnRlc3RTaW1wbGVDbGllbnQoKTsiXX0=