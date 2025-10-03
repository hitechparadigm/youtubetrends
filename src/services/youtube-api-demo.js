"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeApiDemo = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const node_fetch_1 = require("node-fetch");
class YouTubeApiDemo {
    constructor(config = {}) {
        this.apiKey = null;
        this.config = {
            secretName: config.secretName || 'youtube-automation/credentials',
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            apiKey: config.apiKey
        };
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({
            region: this.config.region
        });
    }
    async initialize() {
        if (this.config.apiKey) {
            this.apiKey = this.config.apiKey;
        }
        else {
            await this.loadApiKeyFromSecrets();
        }
    }
    async loadApiKeyFromSecrets() {
        try {
            const command = new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: this.config.secretName
            });
            const response = await this.secretsClient.send(command);
            if (response.SecretString) {
                const secrets = JSON.parse(response.SecretString);
                this.apiKey = secrets.api_key || secrets.apiKey;
                if (!this.apiKey) {
                    throw new Error('API key not found in secrets. Expected "api_key" or "apiKey" field.');
                }
            }
            else {
                throw new Error('No secret string found');
            }
        }
        catch (error) {
            console.error('Failed to load YouTube API key from Secrets Manager:', error);
            throw new Error('YouTube API credentials not configured. Please set up API key in Secrets Manager.');
        }
    }
    async searchVideos(query, options = {}) {
        if (!this.apiKey) {
            await this.initialize();
        }
        const params = new URLSearchParams({
            part: 'snippet',
            q: query,
            type: 'video',
            key: this.apiKey,
            maxResults: (options.maxResults || 25).toString(),
            order: options.order || 'relevance',
            regionCode: options.regionCode || 'US'
        });
        if (options.publishedAfter) {
            params.append('publishedAfter', options.publishedAfter);
        }
        if (options.categoryId) {
            params.append('videoCategoryId', options.categoryId);
        }
        const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
        try {
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
            }
            return data.items || [];
        }
        catch (error) {
            console.error('YouTube search failed:', error);
            throw error;
        }
    }
    async getVideoDetails(videoIds) {
        if (!this.apiKey) {
            await this.initialize();
        }
        if (videoIds.length === 0)
            return [];
        const params = new URLSearchParams({
            part: 'snippet,statistics,contentDetails',
            id: videoIds.join(','),
            key: this.apiKey
        });
        const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
        try {
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
            }
            return (data.items || []).map((item) => ({
                id: item.id,
                title: item.snippet?.title || '',
                description: item.snippet?.description || '',
                channelTitle: item.snippet?.channelTitle || '',
                channelId: item.snippet?.channelId || '',
                publishedAt: item.snippet?.publishedAt || '',
                categoryId: item.snippet?.categoryId || '',
                duration: item.contentDetails?.duration || '',
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                likeCount: parseInt(item.statistics?.likeCount || '0'),
                commentCount: parseInt(item.statistics?.commentCount || '0'),
                thumbnails: item.snippet?.thumbnails || {}
            }));
        }
        catch (error) {
            console.error('YouTube video details failed:', error);
            throw error;
        }
    }
    async getTrendingVideos(regionCode = 'US', categoryId, maxResults = 25) {
        if (!this.apiKey) {
            await this.initialize();
        }
        const params = new URLSearchParams({
            part: 'snippet,statistics,contentDetails',
            chart: 'mostPopular',
            regionCode,
            maxResults: maxResults.toString(),
            key: this.apiKey
        });
        if (categoryId) {
            params.append('videoCategoryId', categoryId);
        }
        const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
        try {
            const response = await (0, node_fetch_1.default)(url);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
            }
            return (data.items || []).map((item) => ({
                id: item.id,
                title: item.snippet?.title || '',
                description: item.snippet?.description || '',
                channelTitle: item.snippet?.channelTitle || '',
                channelId: item.snippet?.channelId || '',
                publishedAt: item.snippet?.publishedAt || '',
                categoryId: item.snippet?.categoryId || '',
                duration: item.contentDetails?.duration || '',
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                likeCount: parseInt(item.statistics?.likeCount || '0'),
                commentCount: parseInt(item.statistics?.commentCount || '0'),
                thumbnails: item.snippet?.thumbnails || {}
            }));
        }
        catch (error) {
            console.error('YouTube trending videos failed:', error);
            throw error;
        }
    }
}
exports.YouTubeApiDemo = YouTubeApiDemo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1hcGktZGVtby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInlvdXR1YmUtYXBpLWRlbW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEVBQThGO0FBQzlGLDJDQUErQjtBQVEvQixNQUFhLGNBQWM7SUFLekIsWUFBWSxTQUErQixFQUFFO1FBSnJDLFdBQU0sR0FBa0IsSUFBSSxDQUFDO1FBS25DLElBQUksQ0FBQyxNQUFNLEdBQUc7WUFDWixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVUsSUFBSSxnQ0FBZ0M7WUFDakUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztZQUM5RCxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07U0FDdEIsQ0FBQztRQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQztZQUM1QyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNO1NBQzNCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVTtRQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztTQUNsQzthQUFNO1lBQ0wsTUFBTSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztTQUNwQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCO1FBQ2pDLElBQUk7WUFDRixNQUFNLE9BQU8sR0FBRyxJQUFJLDhDQUFxQixDQUFDO2dCQUN4QyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVO2FBQ2pDLENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFeEQsSUFBSSxRQUFRLENBQUMsWUFB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LE1BQU0sS0FBSyxDQUFDO1NBQ2I7SUFDSCxDQUFDO0NBQ0Y7QUF4TEQsd0NBd0xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIEdldFNlY3JldFZhbHVlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xyXG5pbXBvcnQgZmV0Y2ggZnJvbSAnbm9kZS1mZXRjaCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVBcGlEZW1vQ29uZmlnIHtcclxuICBzZWNyZXROYW1lPzogc3RyaW5nO1xyXG4gIHJlZ2lvbj86IHN0cmluZztcclxuICBhcGlLZXk/OiBzdHJpbmc7IC8vIEZvciBkaXJlY3QgQVBJIGtleSB1c2FnZVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgWW91VHViZUFwaURlbW8ge1xyXG4gIHByaXZhdGUgYXBpS2V5OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIHNlY3JldHNDbGllbnQ6IFNlY3JldHNNYW5hZ2VyQ2xpZW50O1xyXG4gIHByaXZhdGUgY29uZmlnOiBZb3VUdWJlQXBpRGVtb0NvbmZpZztcclxuXHJcbiAgY29uc3RydWN0b3IoY29uZmlnOiBZb3VUdWJlQXBpRGVtb0NvbmZpZyA9IHt9KSB7XHJcbiAgICB0aGlzLmNvbmZpZyA9IHtcclxuICAgICAgc2VjcmV0TmFtZTogY29uZmlnLnNlY3JldE5hbWUgfHwgJ3lvdXR1YmUtYXV0b21hdGlvbi9jcmVkZW50aWFscycsXHJcbiAgICAgIHJlZ2lvbjogY29uZmlnLnJlZ2lvbiB8fCBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgICBhcGlLZXk6IGNvbmZpZy5hcGlLZXlcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5zZWNyZXRzQ2xpZW50ID0gbmV3IFNlY3JldHNNYW5hZ2VyQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiB0aGlzLmNvbmZpZy5yZWdpb25cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgaW5pdGlhbGl6ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICh0aGlzLmNvbmZpZy5hcGlLZXkpIHtcclxuICAgICAgdGhpcy5hcGlLZXkgPSB0aGlzLmNvbmZpZy5hcGlLZXk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhd2FpdCB0aGlzLmxvYWRBcGlLZXlGcm9tU2VjcmV0cygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBsb2FkQXBpS2V5RnJvbVNlY3JldHMoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgU2VjcmV0SWQ6IHRoaXMuY29uZmlnLnNlY3JldE5hbWVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBcclxuICAgICAgaWYgKHJlc3BvbnNlLlNlY3JldFN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IHNlY3JldHMgPSBKU09OLnBhcnNlKHJlc3BvbnNlLlNlY3JldFN0cmluZyk7XHJcbiAgICAgICAgdGhpcy5hcGlLZXkgPSBzZWNyZXRzLmFwaV9rZXkgfHwgc2VjcmV0cy5hcGlLZXk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCF0aGlzLmFwaUtleSkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBUEkga2V5IG5vdCBmb3VuZCBpbiBzZWNyZXRzLiBFeHBlY3RlZCBcImFwaV9rZXlcIiBvciBcImFwaUtleVwiIGZpZWxkLicpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHNlY3JldCBzdHJpbmcgZm91bmQnKTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgWW91VHViZSBBUEkga2V5IGZyb20gU2VjcmV0cyBNYW5hZ2VyOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3VUdWJlIEFQSSBjcmVkZW50aWFscyBub3QgY29uZmlndXJlZC4gUGxlYXNlIHNldCB1cCBBUEkga2V5IGluIFNlY3JldHMgTWFuYWdlci4nKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHNlYXJjaFZpZGVvcyhxdWVyeTogc3RyaW5nLCBvcHRpb25zOiB7XHJcbiAgICBtYXhSZXN1bHRzPzogbnVtYmVyO1xyXG4gICAgb3JkZXI/OiBzdHJpbmc7XHJcbiAgICBwdWJsaXNoZWRBZnRlcj86IHN0cmluZztcclxuICAgIHJlZ2lvbkNvZGU/OiBzdHJpbmc7XHJcbiAgICBjYXRlZ29yeUlkPzogc3RyaW5nO1xyXG4gIH0gPSB7fSk6IFByb21pc2U8YW55W10+IHtcclxuICAgIGlmICghdGhpcy5hcGlLZXkpIHtcclxuICAgICAgYXdhaXQgdGhpcy5pbml0aWFsaXplKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh7XHJcbiAgICAgIHBhcnQ6ICdzbmlwcGV0JyxcclxuICAgICAgcTogcXVlcnksXHJcbiAgICAgIHR5cGU6ICd2aWRlbycsXHJcbiAgICAgIGtleTogdGhpcy5hcGlLZXkhLFxyXG4gICAgICBtYXhSZXN1bHRzOiAob3B0aW9ucy5tYXhSZXN1bHRzIHx8IDI1KS50b1N0cmluZygpLFxyXG4gICAgICBvcmRlcjogb3B0aW9ucy5vcmRlciB8fCAncmVsZXZhbmNlJyxcclxuICAgICAgcmVnaW9uQ29kZTogb3B0aW9ucy5yZWdpb25Db2RlIHx8ICdVUydcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChvcHRpb25zLnB1Ymxpc2hlZEFmdGVyKSB7XHJcbiAgICAgIHBhcmFtcy5hcHBlbmQoJ3B1Ymxpc2hlZEFmdGVyJywgb3B0aW9ucy5wdWJsaXNoZWRBZnRlcik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG9wdGlvbnMuY2F0ZWdvcnlJZCkge1xyXG4gICAgICBwYXJhbXMuYXBwZW5kKCd2aWRlb0NhdGVnb3J5SWQnLCBvcHRpb25zLmNhdGVnb3J5SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVybCA9IGBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD8ke3BhcmFtc31gO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCk7XHJcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcblxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBZb3VUdWJlIEFQSSBlcnJvcjogJHtkYXRhLmVycm9yPy5tZXNzYWdlIHx8IHJlc3BvbnNlLnN0YXR1c1RleHR9YCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBkYXRhLml0ZW1zIHx8IFtdO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignWW91VHViZSBzZWFyY2ggZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRWaWRlb0RldGFpbHModmlkZW9JZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxhbnlbXT4ge1xyXG4gICAgaWYgKCF0aGlzLmFwaUtleSkge1xyXG4gICAgICBhd2FpdCB0aGlzLmluaXRpYWxpemUoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodmlkZW9JZHMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XHJcblxyXG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh7XHJcbiAgICAgIHBhcnQ6ICdzbmlwcGV0LHN0YXRpc3RpY3MsY29udGVudERldGFpbHMnLFxyXG4gICAgICBpZDogdmlkZW9JZHMuam9pbignLCcpLFxyXG4gICAgICBrZXk6IHRoaXMuYXBpS2V5IVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXJsID0gYGh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvdmlkZW9zPyR7cGFyYW1zfWA7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsKTtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFlvdVR1YmUgQVBJIGVycm9yOiAke2RhdGEuZXJyb3I/Lm1lc3NhZ2UgfHwgcmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIChkYXRhLml0ZW1zIHx8IFtdKS5tYXAoKGl0ZW06IGFueSkgPT4gKHtcclxuICAgICAgICBpZDogaXRlbS5pZCxcclxuICAgICAgICB0aXRsZTogaXRlbS5zbmlwcGV0Py50aXRsZSB8fCAnJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogaXRlbS5zbmlwcGV0Py5kZXNjcmlwdGlvbiB8fCAnJyxcclxuICAgICAgICBjaGFubmVsVGl0bGU6IGl0ZW0uc25pcHBldD8uY2hhbm5lbFRpdGxlIHx8ICcnLFxyXG4gICAgICAgIGNoYW5uZWxJZDogaXRlbS5zbmlwcGV0Py5jaGFubmVsSWQgfHwgJycsXHJcbiAgICAgICAgcHVibGlzaGVkQXQ6IGl0ZW0uc25pcHBldD8ucHVibGlzaGVkQXQgfHwgJycsXHJcbiAgICAgICAgY2F0ZWdvcnlJZDogaXRlbS5zbmlwcGV0Py5jYXRlZ29yeUlkIHx8ICcnLFxyXG4gICAgICAgIGR1cmF0aW9uOiBpdGVtLmNvbnRlbnREZXRhaWxzPy5kdXJhdGlvbiB8fCAnJyxcclxuICAgICAgICB2aWV3Q291bnQ6IHBhcnNlSW50KGl0ZW0uc3RhdGlzdGljcz8udmlld0NvdW50IHx8ICcwJyksXHJcbiAgICAgICAgbGlrZUNvdW50OiBwYXJzZUludChpdGVtLnN0YXRpc3RpY3M/Lmxpa2VDb3VudCB8fCAnMCcpLFxyXG4gICAgICAgIGNvbW1lbnRDb3VudDogcGFyc2VJbnQoaXRlbS5zdGF0aXN0aWNzPy5jb21tZW50Q291bnQgfHwgJzAnKSxcclxuICAgICAgICB0aHVtYm5haWxzOiBpdGVtLnNuaXBwZXQ/LnRodW1ibmFpbHMgfHwge31cclxuICAgICAgfSkpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignWW91VHViZSB2aWRlbyBkZXRhaWxzIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VHJlbmRpbmdWaWRlb3MocmVnaW9uQ29kZTogc3RyaW5nID0gJ1VTJywgY2F0ZWdvcnlJZD86IHN0cmluZywgbWF4UmVzdWx0czogbnVtYmVyID0gMjUpOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgICBpZiAoIXRoaXMuYXBpS2V5KSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICBwYXJ0OiAnc25pcHBldCxzdGF0aXN0aWNzLGNvbnRlbnREZXRhaWxzJyxcclxuICAgICAgY2hhcnQ6ICdtb3N0UG9wdWxhcicsXHJcbiAgICAgIHJlZ2lvbkNvZGUsXHJcbiAgICAgIG1heFJlc3VsdHM6IG1heFJlc3VsdHMudG9TdHJpbmcoKSxcclxuICAgICAga2V5OiB0aGlzLmFwaUtleSFcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChjYXRlZ29yeUlkKSB7XHJcbiAgICAgIHBhcmFtcy5hcHBlbmQoJ3ZpZGVvQ2F0ZWdvcnlJZCcsIGNhdGVnb3J5SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVybCA9IGBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3ZpZGVvcz8ke3BhcmFtc31gO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCk7XHJcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcblxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBZb3VUdWJlIEFQSSBlcnJvcjogJHtkYXRhLmVycm9yPy5tZXNzYWdlIHx8IHJlc3BvbnNlLnN0YXR1c1RleHR9YCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiAoZGF0YS5pdGVtcyB8fCBbXSkubWFwKChpdGVtOiBhbnkpID0+ICh7XHJcbiAgICAgICAgaWQ6IGl0ZW0uaWQsXHJcbiAgICAgICAgdGl0bGU6IGl0ZW0uc25pcHBldD8udGl0bGUgfHwgJycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGl0ZW0uc25pcHBldD8uZGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgICAgY2hhbm5lbFRpdGxlOiBpdGVtLnNuaXBwZXQ/LmNoYW5uZWxUaXRsZSB8fCAnJyxcclxuICAgICAgICBjaGFubmVsSWQ6IGl0ZW0uc25pcHBldD8uY2hhbm5lbElkIHx8ICcnLFxyXG4gICAgICAgIHB1Ymxpc2hlZEF0OiBpdGVtLnNuaXBwZXQ/LnB1Ymxpc2hlZEF0IHx8ICcnLFxyXG4gICAgICAgIGNhdGVnb3J5SWQ6IGl0ZW0uc25pcHBldD8uY2F0ZWdvcnlJZCB8fCAnJyxcclxuICAgICAgICBkdXJhdGlvbjogaXRlbS5jb250ZW50RGV0YWlscz8uZHVyYXRpb24gfHwgJycsXHJcbiAgICAgICAgdmlld0NvdW50OiBwYXJzZUludChpdGVtLnN0YXRpc3RpY3M/LnZpZXdDb3VudCB8fCAnMCcpLFxyXG4gICAgICAgIGxpa2VDb3VudDogcGFyc2VJbnQoaXRlbS5zdGF0aXN0aWNzPy5saWtlQ291bnQgfHwgJzAnKSxcclxuICAgICAgICBjb21tZW50Q291bnQ6IHBhcnNlSW50KGl0ZW0uc3RhdGlzdGljcz8uY29tbWVudENvdW50IHx8ICcwJyksXHJcbiAgICAgICAgdGh1bWJuYWlsczogaXRlbS5zbmlwcGV0Py50aHVtYm5haWxzIHx8IHt9XHJcbiAgICAgIH0pKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1lvdVR1YmUgdHJlbmRpbmcgdmlkZW9zIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==