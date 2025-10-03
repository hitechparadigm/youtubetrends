"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendDetectionServiceSimple = void 0;
class TrendDetectionServiceSimple {
    constructor(youtubeClient, trendRepository, config) {
        this.youtubeClient = youtubeClient;
        this.trendRepository = trendRepository;
        this.config = config;
    }
    async detectTrends() {
        const results = [];
        for (const topic of this.config.topics) {
            console.log(`🔍 Detecting trends for topic: ${topic}`);
            try {
                // Search for videos related to the topic
                const searchResults = await this.youtubeClient.searchVideos(`${topic} trending`, this.config.maxResultsPerQuery);
                if (searchResults.length === 0) {
                    console.log(`No videos found for topic: ${topic}`);
                    results.push({
                        topic,
                        trendsFound: 0,
                        topTrend: null,
                        averageEngagement: 0
                    });
                    continue;
                }
                // Get detailed video information
                const videoIds = searchResults.map(result => result.videoId);
                const videoDetails = await this.youtubeClient.getVideoDetails(videoIds);
                // Convert to TrendData and save
                const trends = [];
                let totalEngagement = 0;
                for (const video of videoDetails) {
                    const engagementRate = this.calculateEngagementRate(video);
                    totalEngagement += engagementRate;
                    const trendScore = this.calculateTrendScore(video, engagementRate);
                    const trendData = {
                        videoId: video.id,
                        title: video.title,
                        description: video.description,
                        channelTitle: video.channelTitle,
                        channelId: video.channelId,
                        publishedAt: video.publishedAt,
                        viewCount: video.viewCount,
                        likeCount: video.likeCount,
                        commentCount: video.commentCount,
                        categoryId: video.categoryId,
                        duration: video.duration,
                        thumbnails: video.thumbnails,
                        topic: topic,
                        timestamp: new Date().toISOString(),
                        engagementRate: engagementRate,
                        engagementScore: trendScore,
                        keywords: this.extractKeywords(video.title, video.description)
                    };
                    trends.push(trendData);
                    // Save to repository
                    try {
                        await this.trendRepository.saveTrend(trendData);
                    }
                    catch (error) {
                        console.error(`Failed to save trend for video ${video.id}:`, error);
                    }
                }
                const averageEngagement = trends.length > 0 ? totalEngagement / trends.length : 0;
                const topTrend = trends.sort((a, b) => b.engagementScore - a.engagementScore)[0];
                console.log(`✅ Found ${trends.length} trends for topic: ${topic}`);
                results.push({
                    topic,
                    trendsFound: trends.length,
                    topTrend,
                    averageEngagement
                });
            }
            catch (error) {
                console.error(`Error detecting trends for topic ${topic}:`, error);
                results.push({
                    topic,
                    trendsFound: 0,
                    topTrend: null,
                    averageEngagement: 0
                });
            }
        }
        return results;
    }
    calculateEngagementRate(video) {
        if (video.viewCount === 0)
            return 0;
        const engagementActions = video.likeCount + video.commentCount;
        return engagementActions / video.viewCount;
    }
    calculateTrendScore(video, engagementRate) {
        const viewScore = Math.log10(video.viewCount + 1) / 10;
        const engagementScore = engagementRate * 100;
        const recencyScore = this.getRecencyScore(video.publishedAt);
        return (viewScore * 0.4) + (engagementScore * 0.4) + (recencyScore * 0.2);
    }
    getRecencyScore(publishedAt) {
        const publishedTime = new Date(publishedAt).getTime();
        const now = Date.now();
        const hoursAgo = (now - publishedTime) / (1000 * 60 * 60);
        if (hoursAgo <= 24)
            return 1.0;
        if (hoursAgo <= 48)
            return 0.8;
        if (hoursAgo <= 168)
            return 0.6; // 1 week
        return 0.4;
    }
    extractKeywords(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        const words = text.match(/\b\w{3,}\b/g) || [];
        // Remove common words and get unique keywords
        const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'use', 'her', 'now', 'oil', 'sit', 'set'];
        const keywords = [...new Set(words)]
            .filter(word => !commonWords.includes(word))
            .slice(0, 10);
        return keywords;
    }
}
exports.TrendDetectionServiceSimple = TrendDetectionServiceSimple;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2Utc2ltcGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2Utc2ltcGxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQVdBLE1BQWEsMkJBQTJCO0lBS3RDLFlBQ0UsYUFBcUMsRUFDckMsZUFBZ0MsRUFDaEMsTUFBNEI7UUFFNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZO1FBTWhCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUVuQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFdkQsSUFBSTtnQkFDRix5Q0FBeUM7Z0JBQ3pDLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQ3pELEdBQUcsS0FBSyxXQUFXLEVBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQy9CLENBQUM7Z0JBRUYsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDbkQsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDWCxLQUFLO3dCQUNMLFdBQVcsRUFBRSxDQUFDO3dCQUNkLFFBQVEsRUFBRSxJQUFJO3dCQUNkLGlCQUFpQixFQUFFLENBQUM7cUJBQ3JCLENBQUMsQ0FBQztvQkFDSCxTQUFTO2lCQUNWO2dCQUVELGlDQUFpQztnQkFDakMsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFD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QUFDLENBQUM7YUFDM0MsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVoQixPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUF6SkQsa0VBeUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgWW91VHViZUFwaUNsaWVudFNpbXBsZSwgWW91VHViZVZpZGVvRGV0YWlscyB9IGZyb20gJy4veW91dHViZS1hcGktY2xpZW50LXNpbXBsZSc7XHJcbmltcG9ydCB7IFRyZW5kUmVwb3NpdG9yeSB9IGZyb20gJy4uL3JlcG9zaXRvcmllcy90cmVuZC1yZXBvc2l0b3J5JztcclxuaW1wb3J0IHsgVHJlbmREYXRhIH0gZnJvbSAnLi4vbW9kZWxzL3RyZW5kLWRhdGEnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUcmVuZERldGVjdGlvbkNvbmZpZyB7XHJcbiAgdG9waWNzOiBzdHJpbmdbXTtcclxuICByZWdpb25zOiBzdHJpbmdbXTtcclxuICBtYXhSZXN1bHRzUGVyUXVlcnk6IG51bWJlcjtcclxuICBob3Vyc0JhY2s6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRyZW5kRGV0ZWN0aW9uU2VydmljZVNpbXBsZSB7XHJcbiAgcHJpdmF0ZSB5b3V0dWJlQ2xpZW50OiBZb3VUdWJlQXBpQ2xpZW50U2ltcGxlO1xyXG4gIHByaXZhdGUgdHJlbmRSZXBvc2l0b3J5OiBUcmVuZFJlcG9zaXRvcnk7XHJcbiAgcHJpdmF0ZSBjb25maWc6IFRyZW5kRGV0ZWN0aW9uQ29uZmlnO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHlvdXR1YmVDbGllbnQ6IFlvdVR1YmVBcGlDbGllbnRTaW1wbGUsXHJcbiAgICB0cmVuZFJlcG9zaXRvcnk6IFRyZW5kUmVwb3NpdG9yeSxcclxuICAgIGNvbmZpZzogVHJlbmREZXRlY3Rpb25Db25maWdcclxuICApIHtcclxuICAgIHRoaXMueW91dHViZUNsaWVudCA9IHlvdXR1YmVDbGllbnQ7XHJcbiAgICB0aGlzLnRyZW5kUmVwb3NpdG9yeSA9IHRyZW5kUmVwb3NpdG9yeTtcclxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZGV0ZWN0VHJlbmRzKCk6IFByb21pc2U8QXJyYXk8e1xyXG4gICAgdG9waWM6IHN0cmluZztcclxuICAgIHRyZW5kc0ZvdW5kOiBudW1iZXI7XHJcbiAgICB0b3BUcmVuZDogYW55O1xyXG4gICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IG51bWJlcjtcclxuICB9Pj4ge1xyXG4gICAgY29uc3QgcmVzdWx0cyA9IFtdO1xyXG5cclxuICAgIGZvciAoY29uc3QgdG9waWMgb2YgdGhpcy5jb25maWcudG9waWNzKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGDwn5SNIERldGVjdGluZyB0cmVuZHMgZm9yIHRvcGljOiAke3RvcGljfWApO1xyXG4gICAgICBcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBTZWFyY2ggZm9yIHZpZGVvcyByZWxhdGVkIHRvIHRoZSB0b3BpY1xyXG4gICAgICAgIGNvbnN0IHNlYXJjaFJlc3VsdHMgPSBhd2FpdCB0aGlzLnlvdXR1YmVDbGllbnQuc2VhcmNoVmlkZW9zKFxyXG4gICAgICAgICAgYCR7dG9waWN9IHRyZW5kaW5nYCxcclxuICAgICAgICAgIHRoaXMuY29uZmlnLm1heFJlc3VsdHNQZXJRdWVyeVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGlmIChzZWFyY2hSZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coYE5vIHZpZGVvcyBmb3VuZCBmb3IgdG9waWM6ICR7dG9waWN9YCk7XHJcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xyXG4gICAgICAgICAgICB0b3BpYyxcclxuICAgICAgICAgICAgdHJlbmRzRm91bmQ6IDAsXHJcbiAgICAgICAgICAgIHRvcFRyZW5kOiBudWxsLFxyXG4gICAgICAgICAgICBhdmVyYWdlRW5nYWdlbWVudDogMFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEdldCBkZXRhaWxlZCB2aWRlbyBpbmZvcm1hdGlvblxyXG4gICAgICAgIGNvbnN0IHZpZGVvSWRzID0gc2VhcmNoUmVzdWx0cy5tYXAocmVzdWx0ID0+IHJlc3VsdC52aWRlb0lkKTtcclxuICAgICAgICBjb25zdCB2aWRlb0RldGFpbHMgPSBhd2FpdCB0aGlzLnlvdXR1YmVDbGllbnQuZ2V0VmlkZW9EZXRhaWxzKHZpZGVvSWRzKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB0byBUcmVuZERhdGEgYW5kIHNhdmVcclxuICAgICAgICBjb25zdCB0cmVuZHM6IFRyZW5kRGF0YVtdID0gW107XHJcbiAgICAgICAgbGV0IHRvdGFsRW5nYWdlbWVudCA9IDA7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdmlkZW8gb2YgdmlkZW9EZXRhaWxzKSB7XHJcbiAgICAgICAgICBjb25zdCBlbmdhZ2VtZW50UmF0ZSA9IHRoaXMuY2FsY3VsYXRlRW5nYWdlbWVudFJhdGUodmlkZW8pO1xyXG4gICAgICAgICAgdG90YWxFbmdhZ2VtZW50ICs9IGVuZ2FnZW1lbnRSYXRlO1xyXG5cclxuICAgICAgICAgIGNvbnN0IHRyZW5kU2NvcmUgPSB0aGlzLmNhbGN1bGF0ZVRyZW5kU2NvcmUodmlkZW8sIGVuZ2FnZW1lbnRSYXRlKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgdHJlbmREYXRhOiBUcmVuZERhdGEgPSB7XHJcbiAgICAgICAgICAgIHZpZGVvSWQ6IHZpZGVvLmlkLFxyXG4gICAgICAgICAgICB0aXRsZTogdmlkZW8udGl0bGUsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB2aWRlby5kZXNjcmlwdGlvbixcclxuICAgICAgICAgICAgY2hhbm5lbFRpdGxlOiB2aWRlby5jaGFubmVsVGl0bGUsXHJcbiAgICAgICAgICAgIGNoYW5uZWxJZDogdmlkZW8uY2hhbm5lbElkLFxyXG4gICAgICAgICAgICBwdWJsaXNoZWRBdDogdmlkZW8ucHVibGlzaGVkQXQsXHJcbiAgICAgICAgICAgIHZpZXdDb3VudDogdmlkZW8udmlld0NvdW50LFxyXG4gICAgICAgICAgICBsaWtlQ291bnQ6IHZpZGVvLmxpa2VDb3VudCxcclxuICAgICAgICAgICAgY29tbWVudENvdW50OiB2aWRlby5jb21tZW50Q291bnQsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5SWQ6IHZpZGVvLmNhdGVnb3J5SWQsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiB2aWRlby5kdXJhdGlvbixcclxuICAgICAgICAgICAgdGh1bWJuYWlsczogdmlkZW8udGh1bWJuYWlscyxcclxuICAgICAgICAgICAgdG9waWM6IHRvcGljLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICAgZW5nYWdlbWVudFJhdGU6IGVuZ2FnZW1lbnRSYXRlLFxyXG4gICAgICAgICAgICBlbmdhZ2VtZW50U2NvcmU6IHRyZW5kU2NvcmUsIC8vIFVzZSB0cmVuZFNjb3JlIGFzIGVuZ2FnZW1lbnRTY29yZVxyXG4gICAgICAgICAgICBrZXl3b3JkczogdGhpcy5leHRyYWN0S2V5d29yZHModmlkZW8udGl0bGUsIHZpZGVvLmRlc2NyaXB0aW9uKVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICB0cmVuZHMucHVzaCh0cmVuZERhdGEpO1xyXG5cclxuICAgICAgICAgIC8vIFNhdmUgdG8gcmVwb3NpdG9yeVxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmVuZFJlcG9zaXRvcnkuc2F2ZVRyZW5kKHRyZW5kRGF0YSk7XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gc2F2ZSB0cmVuZCBmb3IgdmlkZW8gJHt2aWRlby5pZH06YCwgZXJyb3IpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYXZlcmFnZUVuZ2FnZW1lbnQgPSB0cmVuZHMubGVuZ3RoID4gMCA/IHRvdGFsRW5nYWdlbWVudCAvIHRyZW5kcy5sZW5ndGggOiAwO1xyXG4gICAgICAgIGNvbnN0IHRvcFRyZW5kID0gdHJlbmRzLnNvcnQoKGEsIGIpID0+IGIuZW5nYWdlbWVudFNjb3JlIC0gYS5lbmdhZ2VtZW50U2NvcmUpWzBdO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhg4pyFIEZvdW5kICR7dHJlbmRzLmxlbmd0aH0gdHJlbmRzIGZvciB0b3BpYzogJHt0b3BpY31gKTtcclxuXHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgIHRvcGljLFxyXG4gICAgICAgICAgdHJlbmRzRm91bmQ6IHRyZW5kcy5sZW5ndGgsXHJcbiAgICAgICAgICB0b3BUcmVuZCxcclxuICAgICAgICAgIGF2ZXJhZ2VFbmdhZ2VtZW50XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGRldGVjdGluZyB0cmVuZHMgZm9yIHRvcGljICR7dG9waWN9OmAsIGVycm9yKTtcclxuICAgICAgICByZXN1bHRzLnB1c2goe1xyXG4gICAgICAgICAgdG9waWMsXHJcbiAgICAgICAgICB0cmVuZHNGb3VuZDogMCxcclxuICAgICAgICAgIHRvcFRyZW5kOiBudWxsLFxyXG4gICAgICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IDBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHRzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVFbmdhZ2VtZW50UmF0ZSh2aWRlbzogWW91VHViZVZpZGVvRGV0YWlscyk6IG51bWJlciB7XHJcbiAgICBpZiAodmlkZW8udmlld0NvdW50ID09PSAwKSByZXR1cm4gMDtcclxuICAgIFxyXG4gICAgY29uc3QgZW5nYWdlbWVudEFjdGlvbnMgPSB2aWRlby5saWtlQ291bnQgKyB2aWRlby5jb21tZW50Q291bnQ7XHJcbiAgICByZXR1cm4gZW5nYWdlbWVudEFjdGlvbnMgLyB2aWRlby52aWV3Q291bnQ7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNhbGN1bGF0ZVRyZW5kU2NvcmUodmlkZW86IFlvdVR1YmVWaWRlb0RldGFpbHMsIGVuZ2FnZW1lbnRSYXRlOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgY29uc3Qgdmlld1Njb3JlID0gTWF0aC5sb2cxMCh2aWRlby52aWV3Q291bnQgKyAxKSAvIDEwO1xyXG4gICAgY29uc3QgZW5nYWdlbWVudFNjb3JlID0gZW5nYWdlbWVudFJhdGUgKiAxMDA7XHJcbiAgICBjb25zdCByZWNlbmN5U2NvcmUgPSB0aGlzLmdldFJlY2VuY3lTY29yZSh2aWRlby5wdWJsaXNoZWRBdCk7XHJcbiAgICBcclxuICAgIHJldHVybiAodmlld1Njb3JlICogMC40KSArIChlbmdhZ2VtZW50U2NvcmUgKiAwLjQpICsgKHJlY2VuY3lTY29yZSAqIDAuMik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldFJlY2VuY3lTY29yZShwdWJsaXNoZWRBdDogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHB1Ymxpc2hlZFRpbWUgPSBuZXcgRGF0ZShwdWJsaXNoZWRBdCkuZ2V0VGltZSgpO1xyXG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGhvdXJzQWdvID0gKG5vdyAtIHB1Ymxpc2hlZFRpbWUpIC8gKDEwMDAgKiA2MCAqIDYwKTtcclxuICAgIFxyXG4gICAgaWYgKGhvdXJzQWdvIDw9IDI0KSByZXR1cm4gMS4wO1xyXG4gICAgaWYgKGhvdXJzQWdvIDw9IDQ4KSByZXR1cm4gMC44O1xyXG4gICAgaWYgKGhvdXJzQWdvIDw9IDE2OCkgcmV0dXJuIDAuNjsgLy8gMSB3ZWVrXHJcbiAgICByZXR1cm4gMC40O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBleHRyYWN0S2V5d29yZHModGl0bGU6IHN0cmluZywgZGVzY3JpcHRpb246IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IHRleHQgPSBgJHt0aXRsZX0gJHtkZXNjcmlwdGlvbn1gLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBjb25zdCB3b3JkcyA9IHRleHQubWF0Y2goL1xcYlxcd3szLH1cXGIvZykgfHwgW107XHJcbiAgICBcclxuICAgIC8vIFJlbW92ZSBjb21tb24gd29yZHMgYW5kIGdldCB1bmlxdWUga2V5d29yZHNcclxuICAgIGNvbnN0IGNvbW1vbldvcmRzID0gWyd0aGUnLCAnYW5kJywgJ2ZvcicsICdhcmUnLCAnYnV0JywgJ25vdCcsICd5b3UnLCAnYWxsJywgJ2NhbicsICdoYWQnLCAnaGVyJywgJ3dhcycsICdvbmUnLCAnb3VyJywgJ291dCcsICdkYXknLCAnZ2V0JywgJ2hhcycsICdoaW0nLCAnaGlzJywgJ2hvdycsICdpdHMnLCAnbWF5JywgJ25ldycsICdub3cnLCAnb2xkJywgJ3NlZScsICd0d28nLCAnd2hvJywgJ2JveScsICdkaWQnLCAnbWFuJywgJ3dheScsICdzaGUnLCAndXNlJywgJ2hlcicsICdub3cnLCAnb2lsJywgJ3NpdCcsICdzZXQnXTtcclxuICAgIFxyXG4gICAgY29uc3Qga2V5d29yZHMgPSBbLi4ubmV3IFNldCh3b3JkcyldXHJcbiAgICAgIC5maWx0ZXIod29yZCA9PiAhY29tbW9uV29yZHMuaW5jbHVkZXMod29yZCkpXHJcbiAgICAgIC5zbGljZSgwLCAxMCk7XHJcbiAgICBcclxuICAgIHJldHVybiBrZXl3b3JkcztcclxuICB9XHJcbn0iXX0=