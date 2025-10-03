"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendDataModel = void 0;
class TrendDataModel {
    static calculateEngagementScore(viewCount, likeCount, commentCount) {
        if (viewCount === 0)
            return 0;
        return (likeCount * 0.4 + commentCount * 0.6) / viewCount;
    }
    static calculateEngagementRate(likeCount, commentCount, viewCount) {
        if (viewCount === 0)
            return 0;
        return ((likeCount + commentCount) / viewCount) * 100;
    }
    static fromYouTubeApiResponse(item, topic) {
        const statistics = item.statistics || {};
        const snippet = item.snippet || {};
        const viewCount = parseInt(statistics.viewCount || '0');
        const likeCount = parseInt(statistics.likeCount || '0');
        const commentCount = parseInt(statistics.commentCount || '0');
        return {
            topic,
            timestamp: new Date().toISOString(),
            videoId: item.id?.videoId || item.id,
            title: snippet.title || '',
            viewCount,
            likeCount,
            commentCount,
            engagementRate: this.calculateEngagementRate(likeCount, commentCount, viewCount),
            engagementScore: this.calculateEngagementScore(viewCount, likeCount, commentCount),
            keywords: this.extractKeywords(snippet.title || ''),
            categoryId: snippet.categoryId || '',
            publishedAt: snippet.publishedAt || new Date().toISOString(),
            channelTitle: snippet.channelTitle || '',
            channelId: snippet.channelId || '',
            description: snippet.description || '',
            duration: item.contentDetails?.duration,
            thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
            thumbnails: snippet.thumbnails
        };
    }
    static extractKeywords(title) {
        // Simple keyword extraction - can be enhanced with NLP
        return title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 10); // Limit to 10 keywords
    }
    static toDynamoDbItem(trend) {
        return {
            topic: trend.topic,
            timestamp: trend.timestamp,
            videoId: trend.videoId,
            title: trend.title,
            viewCount: trend.viewCount,
            likeCount: trend.likeCount,
            commentCount: trend.commentCount,
            engagementRate: trend.engagementRate,
            engagementScore: trend.engagementScore,
            keywords: trend.keywords,
            categoryId: trend.categoryId,
            publishedAt: trend.publishedAt,
            channelTitle: trend.channelTitle,
            channelId: trend.channelId,
            description: trend.description,
            duration: trend.duration,
            thumbnailUrl: trend.thumbnailUrl,
            thumbnails: trend.thumbnails
        };
    }
    static fromDynamoDbItem(item) {
        return {
            topic: item.topic,
            timestamp: item.timestamp,
            videoId: item.videoId,
            title: item.title,
            viewCount: item.viewCount,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            engagementRate: item.engagementRate,
            engagementScore: item.engagementScore,
            keywords: item.keywords || [],
            categoryId: item.categoryId,
            publishedAt: item.publishedAt,
            channelTitle: item.channelTitle,
            channelId: item.channelId,
            description: item.description,
            duration: item.duration,
            thumbnailUrl: item.thumbnailUrl,
            thumbnails: item.thumbnails
        };
    }
}
exports.TrendDataModel = TrendDataModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlbmQtZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyZW5kLWRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBNkJBLE1BQWEsY0FBYztJQUN6QixNQUFNLENBQUMsd0JBQXdCLENBQUMsU0FBaUIsRUFBRSxTQUFpQixFQUFFLFlBQW9CO1FBQ3hGLElBQUksU0FBUyxLQUFLLENBQUM7WUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QixPQUFPLENBQUMsU0FBUyxHQUFHLEdBQUcsR0FBRyxZQUFZLEdBQUcsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDO0lBQzVELENBQUM7SUFFRCxNQUFNLENBQUMsdUJBQXVCLENBQUMsU0FBaUIsRUFBRSxZQUFvQixFQUFFLFNBQWlCO1FBQ3ZGLElBQUksU0FBUyxLQUFLLENBQUM7WUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QixPQUFPLENBQUMsQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3hELENBQUM7SUFFRCxNQUFNLENBQUMsc0JBQXNCLENBQUMsSUFBUyxFQUFFLEtBQWE7UUFDcEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUM7UUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFFbkMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLElBQUksR0FBRyxDQUFDLENBQUM7UUFDeEQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLElBQUksR0FBRyxDQUFDLENBQUM7UUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksR0FBRyxDQUFDLENBQUM7UUFFOUQsT0FBTztZQUNMLEtBQUs7WUFDTCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFD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QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbkMsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlO1lBQ3JDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUU7WUFDN0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtTQUM1QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBaEdELHdDQWdHQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBpbnRlcmZhY2UgVHJlbmREYXRhIHtcclxuICB0b3BpYzogc3RyaW5nO1xyXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xyXG4gIHZpZGVvSWQ6IHN0cmluZztcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIHZpZXdDb3VudDogbnVtYmVyO1xyXG4gIGxpa2VDb3VudDogbnVtYmVyO1xyXG4gIGNvbW1lbnRDb3VudDogbnVtYmVyO1xyXG4gIGVuZ2FnZW1lbnRSYXRlOiBudW1iZXI7XHJcbiAgZW5nYWdlbWVudFNjb3JlOiBudW1iZXI7XHJcbiAga2V5d29yZHM6IHN0cmluZ1tdO1xyXG4gIGNhdGVnb3J5SWQ6IHN0cmluZztcclxuICBwdWJsaXNoZWRBdDogc3RyaW5nO1xyXG4gIGNoYW5uZWxUaXRsZTogc3RyaW5nO1xyXG4gIGNoYW5uZWxJZDogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xyXG4gIGR1cmF0aW9uPzogc3RyaW5nO1xyXG4gIHRodW1ibmFpbFVybD86IHN0cmluZztcclxuICB0aHVtYm5haWxzPzogYW55O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRyZW5kQW5hbHlzaXNSZXN1bHQge1xyXG4gIHRyZW5kczogVHJlbmREYXRhW107XHJcbiAgYW5hbHlzaXNUaW1lc3RhbXA6IHN0cmluZztcclxuICB0b3RhbFRyZW5kczogbnVtYmVyO1xyXG4gIHRvcEVuZ2FnZW1lbnRTY29yZTogbnVtYmVyO1xyXG4gIGF2ZXJhZ2VFbmdhZ2VtZW50UmF0ZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVHJlbmREYXRhTW9kZWwge1xyXG4gIHN0YXRpYyBjYWxjdWxhdGVFbmdhZ2VtZW50U2NvcmUodmlld0NvdW50OiBudW1iZXIsIGxpa2VDb3VudDogbnVtYmVyLCBjb21tZW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBpZiAodmlld0NvdW50ID09PSAwKSByZXR1cm4gMDtcclxuICAgIHJldHVybiAobGlrZUNvdW50ICogMC40ICsgY29tbWVudENvdW50ICogMC42KSAvIHZpZXdDb3VudDtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBjYWxjdWxhdGVFbmdhZ2VtZW50UmF0ZShsaWtlQ291bnQ6IG51bWJlciwgY29tbWVudENvdW50OiBudW1iZXIsIHZpZXdDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGlmICh2aWV3Q291bnQgPT09IDApIHJldHVybiAwO1xyXG4gICAgcmV0dXJuICgobGlrZUNvdW50ICsgY29tbWVudENvdW50KSAvIHZpZXdDb3VudCkgKiAxMDA7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZnJvbVlvdVR1YmVBcGlSZXNwb25zZShpdGVtOiBhbnksIHRvcGljOiBzdHJpbmcpOiBUcmVuZERhdGEge1xyXG4gICAgY29uc3Qgc3RhdGlzdGljcyA9IGl0ZW0uc3RhdGlzdGljcyB8fCB7fTtcclxuICAgIGNvbnN0IHNuaXBwZXQgPSBpdGVtLnNuaXBwZXQgfHwge307XHJcbiAgICBcclxuICAgIGNvbnN0IHZpZXdDb3VudCA9IHBhcnNlSW50KHN0YXRpc3RpY3Mudmlld0NvdW50IHx8ICcwJyk7XHJcbiAgICBjb25zdCBsaWtlQ291bnQgPSBwYXJzZUludChzdGF0aXN0aWNzLmxpa2VDb3VudCB8fCAnMCcpO1xyXG4gICAgY29uc3QgY29tbWVudENvdW50ID0gcGFyc2VJbnQoc3RhdGlzdGljcy5jb21tZW50Q291bnQgfHwgJzAnKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdG9waWMsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB2aWRlb0lkOiBpdGVtLmlkPy52aWRlb0lkIHx8IGl0ZW0uaWQsXHJcbiAgICAgIHRpdGxlOiBzbmlwcGV0LnRpdGxlIHx8ICcnLFxyXG4gICAgICB2aWV3Q291bnQsXHJcbiAgICAgIGxpa2VDb3VudCxcclxuICAgICAgY29tbWVudENvdW50LFxyXG4gICAgICBlbmdhZ2VtZW50UmF0ZTogdGhpcy5jYWxjdWxhdGVFbmdhZ2VtZW50UmF0ZShsaWtlQ291bnQsIGNvbW1lbnRDb3VudCwgdmlld0NvdW50KSxcclxuICAgICAgZW5nYWdlbWVudFNjb3JlOiB0aGlzLmNhbGN1bGF0ZUVuZ2FnZW1lbnRTY29yZSh2aWV3Q291bnQsIGxpa2VDb3VudCwgY29tbWVudENvdW50KSxcclxuICAgICAga2V5d29yZHM6IHRoaXMuZXh0cmFjdEtleXdvcmRzKHNuaXBwZXQudGl0bGUgfHwgJycpLFxyXG4gICAgICBjYXRlZ29yeUlkOiBzbmlwcGV0LmNhdGVnb3J5SWQgfHwgJycsXHJcbiAgICAgIHB1Ymxpc2hlZEF0OiBzbmlwcGV0LnB1Ymxpc2hlZEF0IHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgY2hhbm5lbFRpdGxlOiBzbmlwcGV0LmNoYW5uZWxUaXRsZSB8fCAnJyxcclxuICAgICAgY2hhbm5lbElkOiBzbmlwcGV0LmNoYW5uZWxJZCB8fCAnJyxcclxuICAgICAgZGVzY3JpcHRpb246IHNuaXBwZXQuZGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgIGR1cmF0aW9uOiBpdGVtLmNvbnRlbnREZXRhaWxzPy5kdXJhdGlvbixcclxuICAgICAgdGh1bWJuYWlsVXJsOiBzbmlwcGV0LnRodW1ibmFpbHM/LmhpZ2g/LnVybCB8fCBzbmlwcGV0LnRodW1ibmFpbHM/LmRlZmF1bHQ/LnVybCxcclxuICAgICAgdGh1bWJuYWlsczogc25pcHBldC50aHVtYm5haWxzXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzdGF0aWMgZXh0cmFjdEtleXdvcmRzKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICAvLyBTaW1wbGUga2V5d29yZCBleHRyYWN0aW9uIC0gY2FuIGJlIGVuaGFuY2VkIHdpdGggTkxQXHJcbiAgICByZXR1cm4gdGl0bGVcclxuICAgICAgLnRvTG93ZXJDYXNlKClcclxuICAgICAgLnJlcGxhY2UoL1teXFx3XFxzXS9nLCAnJylcclxuICAgICAgLnNwbGl0KC9cXHMrLylcclxuICAgICAgLmZpbHRlcih3b3JkID0+IHdvcmQubGVuZ3RoID4gMylcclxuICAgICAgLnNsaWNlKDAsIDEwKTsgLy8gTGltaXQgdG8gMTAga2V5d29yZHNcclxuICB9XHJcblxyXG4gIHN0YXRpYyB0b0R5bmFtb0RiSXRlbSh0cmVuZDogVHJlbmREYXRhKTogUmVjb3JkPHN0cmluZywgYW55PiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0b3BpYzogdHJlbmQudG9waWMsXHJcbiAgICAgIHRpbWVzdGFtcDogdHJlbmQudGltZXN0YW1wLFxyXG4gICAgICB2aWRlb0lkOiB0cmVuZC52aWRlb0lkLFxyXG4gICAgICB0aXRsZTogdHJlbmQudGl0bGUsXHJcbiAgICAgIHZpZXdDb3VudDogdHJlbmQudmlld0NvdW50LFxyXG4gICAgICBsaWtlQ291bnQ6IHRyZW5kLmxpa2VDb3VudCxcclxuICAgICAgY29tbWVudENvdW50OiB0cmVuZC5jb21tZW50Q291bnQsXHJcbiAgICAgIGVuZ2FnZW1lbnRSYXRlOiB0cmVuZC5lbmdhZ2VtZW50UmF0ZSxcclxuICAgICAgZW5nYWdlbWVudFNjb3JlOiB0cmVuZC5lbmdhZ2VtZW50U2NvcmUsXHJcbiAgICAgIGtleXdvcmRzOiB0cmVuZC5rZXl3b3JkcyxcclxuICAgICAgY2F0ZWdvcnlJZDogdHJlbmQuY2F0ZWdvcnlJZCxcclxuICAgICAgcHVibGlzaGVkQXQ6IHRyZW5kLnB1Ymxpc2hlZEF0LFxyXG4gICAgICBjaGFubmVsVGl0bGU6IHRyZW5kLmNoYW5uZWxUaXRsZSxcclxuICAgICAgY2hhbm5lbElkOiB0cmVuZC5jaGFubmVsSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiB0cmVuZC5kZXNjcmlwdGlvbixcclxuICAgICAgZHVyYXRpb246IHRyZW5kLmR1cmF0aW9uLFxyXG4gICAgICB0aHVtYm5haWxVcmw6IHRyZW5kLnRodW1ibmFpbFVybCxcclxuICAgICAgdGh1bWJuYWlsczogdHJlbmQudGh1bWJuYWlsc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBmcm9tRHluYW1vRGJJdGVtKGl0ZW06IFJlY29yZDxzdHJpbmcsIGFueT4pOiBUcmVuZERhdGEge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdG9waWM6IGl0ZW0udG9waWMsXHJcbiAgICAgIHRpbWVzdGFtcDogaXRlbS50aW1lc3RhbXAsXHJcbiAgICAgIHZpZGVvSWQ6IGl0ZW0udmlkZW9JZCxcclxuICAgICAgdGl0bGU6IGl0ZW0udGl0bGUsXHJcbiAgICAgIHZpZXdDb3VudDogaXRlbS52aWV3Q291bnQsXHJcbiAgICAgIGxpa2VDb3VudDogaXRlbS5saWtlQ291bnQsXHJcbiAgICAgIGNvbW1lbnRDb3VudDogaXRlbS5jb21tZW50Q291bnQsXHJcbiAgICAgIGVuZ2FnZW1lbnRSYXRlOiBpdGVtLmVuZ2FnZW1lbnRSYXRlLFxyXG4gICAgICBlbmdhZ2VtZW50U2NvcmU6IGl0ZW0uZW5nYWdlbWVudFNjb3JlLFxyXG4gICAgICBrZXl3b3JkczogaXRlbS5rZXl3b3JkcyB8fCBbXSxcclxuICAgICAgY2F0ZWdvcnlJZDogaXRlbS5jYXRlZ29yeUlkLFxyXG4gICAgICBwdWJsaXNoZWRBdDogaXRlbS5wdWJsaXNoZWRBdCxcclxuICAgICAgY2hhbm5lbFRpdGxlOiBpdGVtLmNoYW5uZWxUaXRsZSxcclxuICAgICAgY2hhbm5lbElkOiBpdGVtLmNoYW5uZWxJZCxcclxuICAgICAgZGVzY3JpcHRpb246IGl0ZW0uZGVzY3JpcHRpb24sXHJcbiAgICAgIGR1cmF0aW9uOiBpdGVtLmR1cmF0aW9uLFxyXG4gICAgICB0aHVtYm5haWxVcmw6IGl0ZW0udGh1bWJuYWlsVXJsLFxyXG4gICAgICB0aHVtYm5haWxzOiBpdGVtLnRodW1ibmFpbHNcclxuICAgIH07XHJcbiAgfVxyXG59Il19