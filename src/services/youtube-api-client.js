"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeApiClient = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const node_fetch_1 = require("node-fetch");
class YouTubeApiClient {
    constructor(config = {}) {
        this.credentials = null;
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.quotaUsed = 0;
        this.quotaResetTime = 0;
        this.config = {
            secretName: config.secretName || 'youtube-automation/credentials',
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            quotaLimit: config.quotaLimit || 10000,
            requestsPerSecond: config.requestsPerSecond || 1
        };
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({
            region: this.config.region
        });
    }
    async initialize() {
        await this.loadCredentials();
        // Only try OAuth2 if we don't have an API key or if API key is empty
        if (!this.credentials?.api_key || this.credentials.api_key.trim() === '') {
            await this.refreshAccessToken();
        }
    }
    async loadCredentials() {
        try {
            const command = new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: this.config.secretName
            });
            const response = await this.secretsClient.send(command);
            if (!response.SecretString) {
                throw new Error('No secret string found');
            }
            this.credentials = JSON.parse(response.SecretString);
            console.log('Debug: Credentials loaded successfully', {
                hasApiKey: !!this.credentials.api_key,
                apiKeyLength: this.credentials.api_key?.length,
                hasClientId: !!this.credentials.client_id
            });
        }
        catch (error) {
            throw new Error(`Failed to load YouTube credentials: ${error}`);
        }
    }
    async refreshAccessToken() {
        if (!this.credentials) {
            console.log('Debug: Credentials not found, attempting to reload...');
            await this.loadCredentials();
        }
        if (!this.credentials) {
            throw new Error('Credentials not loaded');
        }
        const tokenUrl = 'https://oauth2.googleapis.com/token';
        const params = new URLSearchParams({
            client_id: this.credentials.client_id,
            client_secret: this.credentials.client_secret,
            refresh_token: this.credentials.refresh_token,
            grant_type: 'refresh_token'
        });
        try {
            const response = await (0, node_fetch_1.default)(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });
            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }
            const tokenData = await response.json();
            this.accessToken = tokenData.access_token;
            this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer
        }
        catch (error) {
            throw new Error(`Failed to refresh access token: ${error}`);
        }
    }
    async ensureValidToken() {
        // Ensure credentials are loaded first
        if (!this.credentials) {
            await this.loadCredentials();
        }
        // If we have an API key, we don't need OAuth2 tokens
        if (this.credentials?.api_key && this.credentials.api_key.trim() !== '') {
            console.log('Debug: Skipping token refresh - using API key');
            return;
        }
        if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
            await this.refreshAccessToken();
        }
    }
    async makeApiRequest(url, options = {}, quotaCost = 1) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    await this.checkQuota(quotaCost);
                    // Ensure credentials are loaded
                    if (!this.credentials) {
                        await this.loadCredentials();
                    }
                    let requestUrl = url;
                    let requestOptions = { ...options };
                    // SIMPLIFIED: Always use API key if available
                    console.log('Debug: Checking API key availability:', {
                        hasCredentials: !!this.credentials,
                        hasApiKey: !!this.credentials?.api_key,
                        apiKeyLength: this.credentials?.api_key?.length
                    });
                    // Force API key usage - we know it works
                    if (this.credentials?.api_key) {
                        console.log('Debug: Using API key for request');
                        const separator = url.includes('?') ? '&' : '?';
                        requestUrl = `${url}${separator}key=${this.credentials.api_key}`;
                        requestOptions.headers = {
                            'Content-Type': 'application/json',
                            ...(options.headers || {})
                        };
                    }
                    else {
                        console.log('Debug: No API key found, cannot proceed');
                        throw new Error('API key not available - OAuth2 flow disabled for debugging');
                    }
                    const response = await (0, node_fetch_1.default)(requestUrl, requestOptions);
                    if (!response.ok) {
                        if (response.status === 429) {
                            throw new Error('Rate limit exceeded');
                        }
                        if (response.status === 403) {
                            const errorData = await response.json();
                            if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
                                throw new Error('Daily quota exceeded');
                            }
                        }
                        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                    }
                    this.quotaUsed += quotaCost;
                    const data = await response.json();
                    resolve(data);
                }
                catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (request) {
                try {
                    await request();
                }
                catch (error) {
                    console.error('Request failed:', error);
                }
                // Rate limiting: wait between requests
                if (this.requestQueue.length > 0) {
                    await this.sleep(1000 / (this.config.requestsPerSecond || 1));
                }
            }
        }
        this.isProcessingQueue = false;
    }
    async checkQuota(cost) {
        const now = Date.now();
        // Reset quota at midnight UTC
        const todayStart = new Date().setUTCHours(0, 0, 0, 0);
        if (this.quotaResetTime < todayStart) {
            this.quotaUsed = 0;
            this.quotaResetTime = todayStart;
        }
        if (this.quotaUsed + cost > (this.config.quotaLimit || 10000)) {
            throw new Error('Daily quota limit would be exceeded');
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async searchVideos(query, options = {}) {
        const params = new URLSearchParams({
            part: 'snippet',
            type: 'video',
            q: query,
            maxResults: (options.maxResults || 25).toString(),
            order: options.order || 'relevance',
            key: this.credentials?.client_id || ''
        });
        if (options.publishedAfter)
            params.append('publishedAfter', options.publishedAfter);
        if (options.publishedBefore)
            params.append('publishedBefore', options.publishedBefore);
        if (options.regionCode)
            params.append('regionCode', options.regionCode);
        if (options.videoCategoryId)
            params.append('videoCategoryId', options.videoCategoryId);
        const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
        const response = await this.makeApiRequest(url, {}, 100); // Search costs 100 quota units
        return response.items?.map((item) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            publishedAt: item.snippet.publishedAt,
            thumbnails: item.snippet.thumbnails,
            categoryId: item.snippet.categoryId
        })) || [];
    }
    async getVideoDetails(videoIds) {
        const params = new URLSearchParams({
            part: 'snippet,statistics,contentDetails',
            id: videoIds.join(','),
            key: this.credentials?.client_id || ''
        });
        const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
        const response = await this.makeApiRequest(url, {}, 1); // Videos.list costs 1 quota unit per video
        return response.items?.map((item) => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            publishedAt: item.snippet.publishedAt,
            categoryId: item.snippet.categoryId,
            duration: item.contentDetails.duration,
            viewCount: parseInt(item.statistics.viewCount || '0'),
            likeCount: parseInt(item.statistics.likeCount || '0'),
            commentCount: parseInt(item.statistics.commentCount || '0'),
            thumbnails: item.snippet.thumbnails
        })) || [];
    }
    async getTrendingVideos(regionCode = 'US', categoryId, maxResults = 50) {
        const params = new URLSearchParams({
            part: 'snippet,statistics,contentDetails',
            chart: 'mostPopular',
            regionCode,
            maxResults: maxResults.toString(),
            key: this.credentials?.client_id || ''
        });
        if (categoryId) {
            params.append('videoCategoryId', categoryId);
        }
        const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
        const response = await this.makeApiRequest(url, {}, 1);
        return response.items?.map((item) => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            publishedAt: item.snippet.publishedAt,
            categoryId: item.snippet.categoryId,
            duration: item.contentDetails.duration,
            viewCount: parseInt(item.statistics.viewCount || '0'),
            likeCount: parseInt(item.statistics.likeCount || '0'),
            commentCount: parseInt(item.statistics.commentCount || '0'),
            thumbnails: item.snippet.thumbnails
        })) || [];
    }
    async uploadVideo(request) {
        // Note: This is a simplified implementation
        // Full video upload requires resumable upload protocol
        // For production, consider using Google's official client library
        const metadata = {
            snippet: {
                title: request.title,
                description: request.description,
                tags: request.tags,
                categoryId: request.categoryId
            },
            status: {
                privacyStatus: request.privacyStatus
            }
        };
        const url = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';
        // This is a placeholder - actual implementation would need multipart upload
        const response = await this.makeApiRequest(url, {
            method: 'POST',
            body: JSON.stringify(metadata)
        }, 1600); // Upload costs 1600 quota units
        return {
            id: response.id,
            title: response.snippet.title,
            description: response.snippet.description,
            publishedAt: response.snippet.publishedAt,
            channelId: response.snippet.channelId,
            status: response.status.uploadStatus
        };
    }
    async getVideoCategories(regionCode = 'US') {
        const params = new URLSearchParams({
            part: 'snippet',
            regionCode,
            key: this.credentials?.client_id || ''
        });
        const url = `https://www.googleapis.com/youtube/v3/videoCategories?${params}`;
        const response = await this.makeApiRequest(url, {}, 1);
        return response.items?.map((item) => ({
            id: item.id,
            title: item.snippet.title
        })) || [];
    }
    getQuotaUsage() {
        return {
            used: this.quotaUsed,
            limit: this.config.quotaLimit || 10000,
            remaining: (this.config.quotaLimit || 10000) - this.quotaUsed
        };
    }
    async testConnection() {
        try {
            // Only ensure valid token if we're not using API key
            if (!this.credentials?.api_key || this.credentials.api_key.trim() === '') {
                await this.ensureValidToken();
            }
            // Simple test request
            await this.getVideoCategories();
            return true;
        }
        catch (error) {
            console.error('YouTube API connection test failed:', error);
            return false;
        }
    }
}
exports.YouTubeApiClient = YouTubeApiClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1hcGktY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieW91dHViZS1hcGktY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRFQUE4RjtBQUM5RiwyQ0FBZ0Q7QUFzRWhELE1BQWEsZ0JBQWdCO0lBVzNCLFlBQVksU0FBMkIsRUFBRTtRQVZqQyxnQkFBVyxHQUE4QixJQUFJLENBQUM7UUFDOUMsZ0JBQVcsR0FBa0IsSUFBSSxDQUFDO1FBQ2xDLG1CQUFjLEdBQVcsQ0FBQyxDQUFDO1FBRzNCLGlCQUFZLEdBQThCLEVBQUUsQ0FBQztRQUM3QyxzQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDMUIsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLG1CQUFjLEdBQUcsQ0FBQyxDQUFDO1FBR3pCLElBQUksQ0FBQyxNQUFNLEdBQUc7WUFDWixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVUsSUFBSSxnQ0FBZ0M7WUFDakUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztZQUM5RCxVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVUsSUFBSSxLQUFLO1lBQ3RDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsSUFBSSxDQUFDO1NBQ2pELENBQUM7UUFFRixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksNkNBQW9CLENBQUM7WUFDNUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtTQUMzQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVU7UUFDZCxNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUU3QixxRUFBcUU7UUFDckUsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN4RSxN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Q0FBQyxTQUFTO1lBQ3BCLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsSUFBSSxLQUFLO1lBQ3RDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTO1NBQzlELENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWM7UUFDbEIsSUFBSTtZQUNGLHFEQUFxRDtZQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUN4RSxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2FBQy9CO1lBQ0Qsc0JBQXNCO1lBQ3RCLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1RCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztDQUNGO0FBblpELDRDQW1aQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNlY3JldHNNYW5hZ2VyQ2xpZW50LCBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcclxuaW1wb3J0IGZldGNoLCB7IFJlcXVlc3RJbml0IH0gZnJvbSAnbm9kZS1mZXRjaCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVDcmVkZW50aWFscyB7XHJcbiAgY2xpZW50X2lkOiBzdHJpbmc7XHJcbiAgY2xpZW50X3NlY3JldDogc3RyaW5nO1xyXG4gIHJlZnJlc2hfdG9rZW46IHN0cmluZztcclxuICBwcm9qZWN0X2lkOiBzdHJpbmc7XHJcbiAgYXBpX2tleT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBZb3VUdWJlQXBpQ29uZmlnIHtcclxuICBzZWNyZXROYW1lPzogc3RyaW5nO1xyXG4gIHJlZ2lvbj86IHN0cmluZztcclxuICBxdW90YUxpbWl0PzogbnVtYmVyO1xyXG4gIHJlcXVlc3RzUGVyU2Vjb25kPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVTZWFyY2hSZXN1bHQge1xyXG4gIHZpZGVvSWQ6IHN0cmluZztcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgY2hhbm5lbFRpdGxlOiBzdHJpbmc7XHJcbiAgY2hhbm5lbElkOiBzdHJpbmc7XHJcbiAgcHVibGlzaGVkQXQ6IHN0cmluZztcclxuICB0aHVtYm5haWxzOiB7XHJcbiAgICBkZWZhdWx0PzogeyB1cmw6IHN0cmluZyB9O1xyXG4gICAgbWVkaXVtPzogeyB1cmw6IHN0cmluZyB9O1xyXG4gICAgaGlnaD86IHsgdXJsOiBzdHJpbmcgfTtcclxuICB9O1xyXG4gIGNhdGVnb3J5SWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgWW91VHViZVZpZGVvRGV0YWlscyB7XHJcbiAgaWQ6IHN0cmluZztcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgY2hhbm5lbFRpdGxlOiBzdHJpbmc7XHJcbiAgY2hhbm5lbElkOiBzdHJpbmc7XHJcbiAgcHVibGlzaGVkQXQ6IHN0cmluZztcclxuICBjYXRlZ29yeUlkOiBzdHJpbmc7XHJcbiAgZHVyYXRpb246IHN0cmluZztcclxuICB2aWV3Q291bnQ6IG51bWJlcjtcclxuICBsaWtlQ291bnQ6IG51bWJlcjtcclxuICBjb21tZW50Q291bnQ6IG51bWJlcjtcclxuICB0aHVtYm5haWxzOiB7XHJcbiAgICBkZWZhdWx0PzogeyB1cmw6IHN0cmluZyB9O1xyXG4gICAgbWVkaXVtPzogeyB1cmw6IHN0cmluZyB9O1xyXG4gICAgaGlnaD86IHsgdXJsOiBzdHJpbmcgfTtcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVVcGxvYWRSZXF1ZXN0IHtcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgdGFnczogc3RyaW5nW107XHJcbiAgY2F0ZWdvcnlJZDogc3RyaW5nO1xyXG4gIHByaXZhY3lTdGF0dXM6ICdwcml2YXRlJyB8ICdwdWJsaWMnIHwgJ3VubGlzdGVkJztcclxuICB2aWRlb0ZpbGVQYXRoPzogc3RyaW5nO1xyXG4gIHZpZGVvQnVmZmVyPzogQnVmZmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVVcGxvYWRSZXNwb25zZSB7XHJcbiAgaWQ6IHN0cmluZztcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgcHVibGlzaGVkQXQ6IHN0cmluZztcclxuICBjaGFubmVsSWQ6IHN0cmluZztcclxuICBzdGF0dXM6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFlvdVR1YmVBcGlDbGllbnQge1xyXG4gIHByaXZhdGUgY3JlZGVudGlhbHM6IFlvdVR1YmVDcmVkZW50aWFscyB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgYWNjZXNzVG9rZW46IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgdG9rZW5FeHBpcmVzQXQ6IG51bWJlciA9IDA7XHJcbiAgcHJpdmF0ZSBzZWNyZXRzQ2xpZW50OiBTZWNyZXRzTWFuYWdlckNsaWVudDtcclxuICBwcml2YXRlIGNvbmZpZzogWW91VHViZUFwaUNvbmZpZztcclxuICBwcml2YXRlIHJlcXVlc3RRdWV1ZTogQXJyYXk8KCkgPT4gUHJvbWlzZTxhbnk+PiA9IFtdO1xyXG4gIHByaXZhdGUgaXNQcm9jZXNzaW5nUXVldWUgPSBmYWxzZTtcclxuICBwcml2YXRlIHF1b3RhVXNlZCA9IDA7XHJcbiAgcHJpdmF0ZSBxdW90YVJlc2V0VGltZSA9IDA7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogWW91VHViZUFwaUNvbmZpZyA9IHt9KSB7XHJcbiAgICB0aGlzLmNvbmZpZyA9IHtcclxuICAgICAgc2VjcmV0TmFtZTogY29uZmlnLnNlY3JldE5hbWUgfHwgJ3lvdXR1YmUtYXV0b21hdGlvbi9jcmVkZW50aWFscycsXHJcbiAgICAgIHJlZ2lvbjogY29uZmlnLnJlZ2lvbiB8fCBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgICBxdW90YUxpbWl0OiBjb25maWcucXVvdGFMaW1pdCB8fCAxMDAwMCwgLy8gWW91VHViZSBBUEkgZGFpbHkgcXVvdGFcclxuICAgICAgcmVxdWVzdHNQZXJTZWNvbmQ6IGNvbmZpZy5yZXF1ZXN0c1BlclNlY29uZCB8fCAxXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuc2VjcmV0c0NsaWVudCA9IG5ldyBTZWNyZXRzTWFuYWdlckNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogdGhpcy5jb25maWcucmVnaW9uXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGluaXRpYWxpemUoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmxvYWRDcmVkZW50aWFscygpO1xyXG4gICAgXHJcbiAgICAvLyBPbmx5IHRyeSBPQXV0aDIgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBBUEkga2V5IG9yIGlmIEFQSSBrZXkgaXMgZW1wdHlcclxuICAgIGlmICghdGhpcy5jcmVkZW50aWFscz8uYXBpX2tleSB8fCB0aGlzLmNyZWRlbnRpYWxzLmFwaV9rZXkudHJpbSgpID09PSAnJykge1xyXG4gICAgICBhd2FpdCB0aGlzLnJlZnJlc2hBY2Nlc3NUb2tlbigpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBsb2FkQ3JlZGVudGlhbHMoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgU2VjcmV0SWQ6IHRoaXMuY29uZmlnLnNlY3JldE5hbWVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCFyZXNwb25zZS5TZWNyZXRTdHJpbmcpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHNlY3JldCBzdHJpbmcgZm91bmQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IEpTT04ucGFyc2UocmVzcG9uc2UuU2VjcmV0U3RyaW5nKSBhcyBZb3VUdWJlQ3JlZGVudGlhbHM7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdEZWJ1ZzogQ3JlZGVudGlhbHMgbG9hZGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBoYXNBcGlLZXk6ICEhdGhpcy5jcmVkZW50aWFscy5hcGlfa2V5LFxyXG4gICAgICAgIGFwaUtleUxlbmd0aDogdGhpcy5jcmVkZW50aWFscy5hcGlfa2V5Py5sZW5ndGgsXHJcbiAgICAgICAgaGFzQ2xpZW50SWQ6ICEhdGhpcy5jcmVkZW50aWFscy5jbGllbnRfaWRcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBsb2FkIFlvdVR1YmUgY3JlZGVudGlhbHM6ICR7ZXJyb3J9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHJlZnJlc2hBY2Nlc3NUb2tlbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICghdGhpcy5jcmVkZW50aWFscykge1xyXG4gICAgICBjb25zb2xlLmxvZygnRGVidWc6IENyZWRlbnRpYWxzIG5vdCBmb3VuZCwgYXR0ZW1wdGluZyB0byByZWxvYWQuLi4nKTtcclxuICAgICAgYXdhaXQgdGhpcy5sb2FkQ3JlZGVudGlhbHMoKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKCF0aGlzLmNyZWRlbnRpYWxzKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ3JlZGVudGlhbHMgbm90IGxvYWRlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRva2VuVXJsID0gJ2h0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuJztcclxuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICBjbGllbnRfaWQ6IHRoaXMuY3JlZGVudGlhbHMuY2xpZW50X2lkLFxyXG4gICAgICBjbGllbnRfc2VjcmV0OiB0aGlzLmNyZWRlbnRpYWxzLmNsaWVudF9zZWNyZXQsXHJcbiAgICAgIHJlZnJlc2hfdG9rZW46IHRoaXMuY3JlZGVudGlhbHMucmVmcmVzaF90b2tlbixcclxuICAgICAgZ3JhbnRfdHlwZTogJ3JlZnJlc2hfdG9rZW4nXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHRva2VuVXJsLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBwYXJhbXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb2tlbiByZWZyZXNoIGZhaWxlZDogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCB0b2tlbkRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgIHRoaXMuYWNjZXNzVG9rZW4gPSB0b2tlbkRhdGEuYWNjZXNzX3Rva2VuO1xyXG4gICAgICB0aGlzLnRva2VuRXhwaXJlc0F0ID0gRGF0ZS5ub3coKSArICh0b2tlbkRhdGEuZXhwaXJlc19pbiAqIDEwMDApIC0gNjAwMDA7IC8vIDEgbWludXRlIGJ1ZmZlclxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVmcmVzaCBhY2Nlc3MgdG9rZW46ICR7ZXJyb3J9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGVuc3VyZVZhbGlkVG9rZW4oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAvLyBFbnN1cmUgY3JlZGVudGlhbHMgYXJlIGxvYWRlZCBmaXJzdFxyXG4gICAgaWYgKCF0aGlzLmNyZWRlbnRpYWxzKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMubG9hZENyZWRlbnRpYWxzKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIElmIHdlIGhhdmUgYW4gQVBJIGtleSwgd2UgZG9uJ3QgbmVlZCBPQXV0aDIgdG9rZW5zXHJcbiAgICBpZiAodGhpcy5jcmVkZW50aWFscz8uYXBpX2tleSAmJiB0aGlzLmNyZWRlbnRpYWxzLmFwaV9rZXkudHJpbSgpICE9PSAnJykge1xyXG4gICAgICBjb25zb2xlLmxvZygnRGVidWc6IFNraXBwaW5nIHRva2VuIHJlZnJlc2ggLSB1c2luZyBBUEkga2V5Jyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKCF0aGlzLmFjY2Vzc1Rva2VuIHx8IERhdGUubm93KCkgPj0gdGhpcy50b2tlbkV4cGlyZXNBdCkge1xyXG4gICAgICBhd2FpdCB0aGlzLnJlZnJlc2hBY2Nlc3NUb2tlbigpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBtYWtlQXBpUmVxdWVzdDxUPihcclxuICAgIHVybDogc3RyaW5nLCBcclxuICAgIG9wdGlvbnM6IFJlcXVlc3RJbml0ID0ge30sXHJcbiAgICBxdW90YUNvc3Q6IG51bWJlciA9IDFcclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIHRoaXMucmVxdWVzdFF1ZXVlLnB1c2goYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLmNoZWNrUXVvdGEocXVvdGFDb3N0KTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gRW5zdXJlIGNyZWRlbnRpYWxzIGFyZSBsb2FkZWRcclxuICAgICAgICAgIGlmICghdGhpcy5jcmVkZW50aWFscykge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDcmVkZW50aWFscygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBsZXQgcmVxdWVzdFVybCA9IHVybDtcclxuICAgICAgICAgIGxldCByZXF1ZXN0T3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xyXG5cclxuICAgICAgICAgIC8vIFNJTVBMSUZJRUQ6IEFsd2F5cyB1c2UgQVBJIGtleSBpZiBhdmFpbGFibGVcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdEZWJ1ZzogQ2hlY2tpbmcgQVBJIGtleSBhdmFpbGFiaWxpdHk6Jywge1xyXG4gICAgICAgICAgICBoYXNDcmVkZW50aWFsczogISF0aGlzLmNyZWRlbnRpYWxzLFxyXG4gICAgICAgICAgICBoYXNBcGlLZXk6ICEhdGhpcy5jcmVkZW50aWFscz8uYXBpX2tleSxcclxuICAgICAgICAgICAgYXBpS2V5TGVuZ3RoOiB0aGlzLmNyZWRlbnRpYWxzPy5hcGlfa2V5Py5sZW5ndGhcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBGb3JjZSBBUEkga2V5IHVzYWdlIC0gd2Uga25vdyBpdCB3b3Jrc1xyXG4gICAgICAgICAgaWYgKHRoaXMuY3JlZGVudGlhbHM/LmFwaV9rZXkpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0RlYnVnOiBVc2luZyBBUEkga2V5IGZvciByZXF1ZXN0Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlcGFyYXRvciA9IHVybC5pbmNsdWRlcygnPycpID8gJyYnIDogJz8nO1xyXG4gICAgICAgICAgICByZXF1ZXN0VXJsID0gYCR7dXJsfSR7c2VwYXJhdG9yfWtleT0ke3RoaXMuY3JlZGVudGlhbHMuYXBpX2tleX1gO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmVxdWVzdE9wdGlvbnMuaGVhZGVycyA9IHtcclxuICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAgIC4uLihvcHRpb25zLmhlYWRlcnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8fCB7fSlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEZWJ1ZzogTm8gQVBJIGtleSBmb3VuZCwgY2Fubm90IHByb2NlZWQnKTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBUEkga2V5IG5vdCBhdmFpbGFibGUgLSBPQXV0aDIgZmxvdyBkaXNhYmxlZCBmb3IgZGVidWdnaW5nJyk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChyZXF1ZXN0VXJsLCByZXF1ZXN0T3B0aW9ucyk7XHJcblxyXG4gICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MjkpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JhdGUgbGltaXQgZXhjZWVkZWQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcclxuICAgICAgICAgICAgICBjb25zdCBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgICAgaWYgKGVycm9yRGF0YS5lcnJvcj8uZXJyb3JzPy5bMF0/LnJlYXNvbiA9PT0gJ3F1b3RhRXhjZWVkZWQnKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RhaWx5IHF1b3RhIGV4Y2VlZGVkJyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQVBJIHJlcXVlc3QgZmFpbGVkOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHRoaXMucXVvdGFVc2VkICs9IHF1b3RhQ29zdDtcclxuICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0aGlzLnByb2Nlc3NRdWV1ZSgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHByb2Nlc3NRdWV1ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICh0aGlzLmlzUHJvY2Vzc2luZ1F1ZXVlIHx8IHRoaXMucmVxdWVzdFF1ZXVlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5pc1Byb2Nlc3NpbmdRdWV1ZSA9IHRydWU7XHJcblxyXG4gICAgd2hpbGUgKHRoaXMucmVxdWVzdFF1ZXVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc3QgcmVxdWVzdCA9IHRoaXMucmVxdWVzdFF1ZXVlLnNoaWZ0KCk7XHJcbiAgICAgIGlmIChyZXF1ZXN0KSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGF3YWl0IHJlcXVlc3QoKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignUmVxdWVzdCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBSYXRlIGxpbWl0aW5nOiB3YWl0IGJldHdlZW4gcmVxdWVzdHNcclxuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0UXVldWUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCgxMDAwIC8gKHRoaXMuY29uZmlnLnJlcXVlc3RzUGVyU2Vjb25kIHx8IDEpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmlzUHJvY2Vzc2luZ1F1ZXVlID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrUXVvdGEoY29zdDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICAvLyBSZXNldCBxdW90YSBhdCBtaWRuaWdodCBVVENcclxuICAgIGNvbnN0IHRvZGF5U3RhcnQgPSBuZXcgRGF0ZSgpLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xyXG4gICAgaWYgKHRoaXMucXVvdGFSZXNldFRpbWUgPCB0b2RheVN0YXJ0KSB7XHJcbiAgICAgIHRoaXMucXVvdGFVc2VkID0gMDtcclxuICAgICAgdGhpcy5xdW90YVJlc2V0VGltZSA9IHRvZGF5U3RhcnQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMucXVvdGFVc2VkICsgY29zdCA+ICh0aGlzLmNvbmZpZy5xdW90YUxpbWl0IHx8IDEwMDAwKSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RhaWx5IHF1b3RhIGxpbWl0IHdvdWxkIGJlIGV4Y2VlZGVkJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHNlYXJjaFZpZGVvcyhcclxuICAgIHF1ZXJ5OiBzdHJpbmcsXHJcbiAgICBvcHRpb25zOiB7XHJcbiAgICAgIG1heFJlc3VsdHM/OiBudW1iZXI7XHJcbiAgICAgIG9yZGVyPzogJ3JlbGV2YW5jZScgfCAnZGF0ZScgfCAncmF0aW5nJyB8ICd2aWV3Q291bnQnIHwgJ3RpdGxlJztcclxuICAgICAgcHVibGlzaGVkQWZ0ZXI/OiBzdHJpbmc7XHJcbiAgICAgIHB1Ymxpc2hlZEJlZm9yZT86IHN0cmluZztcclxuICAgICAgcmVnaW9uQ29kZT86IHN0cmluZztcclxuICAgICAgdmlkZW9DYXRlZ29yeUlkPzogc3RyaW5nO1xyXG4gICAgfSA9IHt9XHJcbiAgKTogUHJvbWlzZTxZb3VUdWJlU2VhcmNoUmVzdWx0W10+IHtcclxuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICBwYXJ0OiAnc25pcHBldCcsXHJcbiAgICAgIHR5cGU6ICd2aWRlbycsXHJcbiAgICAgIHE6IHF1ZXJ5LFxyXG4gICAgICBtYXhSZXN1bHRzOiAob3B0aW9ucy5tYXhSZXN1bHRzIHx8IDI1KS50b1N0cmluZygpLFxyXG4gICAgICBvcmRlcjogb3B0aW9ucy5vcmRlciB8fCAncmVsZXZhbmNlJyxcclxuICAgICAga2V5OiB0aGlzLmNyZWRlbnRpYWxzPy5jbGllbnRfaWQgfHwgJydcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChvcHRpb25zLnB1Ymxpc2hlZEFmdGVyKSBwYXJhbXMuYXBwZW5kKCdwdWJsaXNoZWRBZnRlcicsIG9wdGlvbnMucHVibGlzaGVkQWZ0ZXIpO1xyXG4gICAgaWYgKG9wdGlvbnMucHVibGlzaGVkQmVmb3JlKSBwYXJhbXMuYXBwZW5kKCdwdWJsaXNoZWRCZWZvcmUnLCBvcHRpb25zLnB1Ymxpc2hlZEJlZm9yZSk7XHJcbiAgICBpZiAob3B0aW9ucy5yZWdpb25Db2RlKSBwYXJhbXMuYXBwZW5kKCdyZWdpb25Db2RlJywgb3B0aW9ucy5yZWdpb25Db2RlKTtcclxuICAgIGlmIChvcHRpb25zLnZpZGVvQ2F0ZWdvcnlJZCkgcGFyYW1zLmFwcGVuZCgndmlkZW9DYXRlZ29yeUlkJywgb3B0aW9ucy52aWRlb0NhdGVnb3J5SWQpO1xyXG5cclxuICAgIGNvbnN0IHVybCA9IGBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD8ke3BhcmFtc31gO1xyXG4gICAgXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMubWFrZUFwaVJlcXVlc3Q8YW55Pih1cmwsIHt9LCAxMDApOyAvLyBTZWFyY2ggY29zdHMgMTAwIHF1b3RhIHVuaXRzXHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlLml0ZW1zPy5tYXAoKGl0ZW06IGFueSkgPT4gKHtcclxuICAgICAgdmlkZW9JZDogaXRlbS5pZC52aWRlb0lkLFxyXG4gICAgICB0aXRsZTogaXRlbS5zbmlwcGV0LnRpdGxlLFxyXG4gICAgICBkZXNjcmlwdGlvbjogaXRlbS5zbmlwcGV0LmRlc2NyaXB0aW9uLFxyXG4gICAgICBjaGFubmVsVGl0bGU6IGl0ZW0uc25pcHBldC5jaGFubmVsVGl0bGUsXHJcbiAgICAgIGNoYW5uZWxJZDogaXRlbS5zbmlwcGV0LmNoYW5uZWxJZCxcclxuICAgICAgcHVibGlzaGVkQXQ6IGl0ZW0uc25pcHBldC5wdWJsaXNoZWRBdCxcclxuICAgICAgdGh1bWJuYWlsczogaXRlbS5zbmlwcGV0LnRodW1ibmFpbHMsXHJcbiAgICAgIGNhdGVnb3J5SWQ6IGl0ZW0uc25pcHBldC5jYXRlZ29yeUlkXHJcbiAgICB9KSkgfHwgW107XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRWaWRlb0RldGFpbHModmlkZW9JZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxZb3VUdWJlVmlkZW9EZXRhaWxzW10+IHtcclxuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICBwYXJ0OiAnc25pcHBldCxzdGF0aXN0aWNzLGNvbnRlbnREZXRhaWxzJyxcclxuICAgICAgaWQ6IHZpZGVvSWRzLmpvaW4oJywnKSxcclxuICAgICAga2V5OiB0aGlzLmNyZWRlbnRpYWxzPy5jbGllbnRfaWQgfHwgJydcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVybCA9IGBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3ZpZGVvcz8ke3BhcmFtc31gO1xyXG4gICAgXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMubWFrZUFwaVJlcXVlc3Q8YW55Pih1cmwsIHt9LCAxKTsgLy8gVmlkZW9zLmxpc3QgY29zdHMgMSBxdW90YSB1bml0IHBlciB2aWRlb1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZS5pdGVtcz8ubWFwKChpdGVtOiBhbnkpID0+ICh7XHJcbiAgICAgIGlkOiBpdGVtLmlkLFxyXG4gICAgICB0aXRsZTogaXRlbS5zbmlwcGV0LnRpdGxlLFxyXG4gICAgICBkZXNjcmlwdGlvbjogaXRlbS5zbmlwcGV0LmRlc2NyaXB0aW9uLFxyXG4gICAgICBjaGFubmVsVGl0bGU6IGl0ZW0uc25pcHBldC5jaGFubmVsVGl0bGUsXHJcbiAgICAgIGNoYW5uZWxJZDogaXRlbS5zbmlwcGV0LmNoYW5uZWxJZCxcclxuICAgICAgcHVibGlzaGVkQXQ6IGl0ZW0uc25pcHBldC5wdWJsaXNoZWRBdCxcclxuICAgICAgY2F0ZWdvcnlJZDogaXRlbS5zbmlwcGV0LmNhdGVnb3J5SWQsXHJcbiAgICAgIGR1cmF0aW9uOiBpdGVtLmNvbnRlbnREZXRhaWxzLmR1cmF0aW9uLFxyXG4gICAgICB2aWV3Q291bnQ6IHBhcnNlSW50KGl0ZW0uc3RhdGlzdGljcy52aWV3Q291bnQgfHwgJzAnKSxcclxuICAgICAgbGlrZUNvdW50OiBwYXJzZUludChpdGVtLnN0YXRpc3RpY3MubGlrZUNvdW50IHx8ICcwJyksXHJcbiAgICAgIGNvbW1lbnRDb3VudDogcGFyc2VJbnQoaXRlbS5zdGF0aXN0aWNzLmNvbW1lbnRDb3VudCB8fCAnMCcpLFxyXG4gICAgICB0aHVtYm5haWxzOiBpdGVtLnNuaXBwZXQudGh1bWJuYWlsc1xyXG4gICAgfSkpIHx8IFtdO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VHJlbmRpbmdWaWRlb3MoXHJcbiAgICByZWdpb25Db2RlOiBzdHJpbmcgPSAnVVMnLFxyXG4gICAgY2F0ZWdvcnlJZD86IHN0cmluZyxcclxuICAgIG1heFJlc3VsdHM6IG51bWJlciA9IDUwXHJcbiAgKTogUHJvbWlzZTxZb3VUdWJlVmlkZW9EZXRhaWxzW10+IHtcclxuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICBwYXJ0OiAnc25pcHBldCxzdGF0aXN0aWNzLGNvbnRlbnREZXRhaWxzJyxcclxuICAgICAgY2hhcnQ6ICdtb3N0UG9wdWxhcicsXHJcbiAgICAgIHJlZ2lvbkNvZGUsXHJcbiAgICAgIG1heFJlc3VsdHM6IG1heFJlc3VsdHMudG9TdHJpbmcoKSxcclxuICAgICAga2V5OiB0aGlzLmNyZWRlbnRpYWxzPy5jbGllbnRfaWQgfHwgJydcclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChjYXRlZ29yeUlkKSB7XHJcbiAgICAgIHBhcmFtcy5hcHBlbmQoJ3ZpZGVvQ2F0ZWdvcnlJZCcsIGNhdGVnb3J5SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVybCA9IGBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3ZpZGVvcz8ke3BhcmFtc31gO1xyXG4gICAgXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMubWFrZUFwaVJlcXVlc3Q8YW55Pih1cmwsIHt9LCAxKTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UuaXRlbXM/Lm1hcCgoaXRlbTogYW55KSA9PiAoe1xyXG4gICAgICBpZDogaXRlbS5pZCxcclxuICAgICAgdGl0bGU6IGl0ZW0uc25pcHBldC50aXRsZSxcclxuICAgICAgZGVzY3JpcHRpb246IGl0ZW0uc25pcHBldC5kZXNjcmlwdGlvbixcclxuICAgICAgY2hhbm5lbFRpdGxlOiBpdGVtLnNuaXBwZXQuY2hhbm5lbFRpdGxlLFxyXG4gICAgICBjaGFubmVsSWQ6IGl0ZW0uc25pcHBldC5jaGFubmVsSWQsXHJcbiAgICAgIHB1Ymxpc2hlZEF0OiBpdGVtLnNuaXBwZXQucHVibGlzaGVkQXQsXHJcbiAgICAgIGNhdGVnb3J5SWQ6IGl0ZW0uc25pcHBldC5jYXRlZ29yeUlkLFxyXG4gICAgICBkdXJhdGlvbjogaXRlbS5jb250ZW50RGV0YWlscy5kdXJhdGlvbixcclxuICAgICAgdmlld0NvdW50OiBwYXJzZUludChpdGVtLnN0YXRpc3RpY3Mudmlld0NvdW50IHx8ICcwJyksXHJcbiAgICAgIGxpa2VDb3VudDogcGFyc2VJbnQoaXRlbS5zdGF0aXN0aWNzLmxpa2VDb3VudCB8fCAnMCcpLFxyXG4gICAgICBjb21tZW50Q291bnQ6IHBhcnNlSW50KGl0ZW0uc3RhdGlzdGljcy5jb21tZW50Q291bnQgfHwgJzAnKSxcclxuICAgICAgdGh1bWJuYWlsczogaXRlbS5zbmlwcGV0LnRodW1ibmFpbHNcclxuICAgIH0pKSB8fCBbXTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHVwbG9hZFZpZGVvKHJlcXVlc3Q6IFlvdVR1YmVVcGxvYWRSZXF1ZXN0KTogUHJvbWlzZTxZb3VUdWJlVXBsb2FkUmVzcG9uc2U+IHtcclxuICAgIC8vIE5vdGU6IFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXHJcbiAgICAvLyBGdWxsIHZpZGVvIHVwbG9hZCByZXF1aXJlcyByZXN1bWFibGUgdXBsb2FkIHByb3RvY29sXHJcbiAgICAvLyBGb3IgcHJvZHVjdGlvbiwgY29uc2lkZXIgdXNpbmcgR29vZ2xlJ3Mgb2ZmaWNpYWwgY2xpZW50IGxpYnJhcnlcclxuICAgIFxyXG4gICAgY29uc3QgbWV0YWRhdGEgPSB7XHJcbiAgICAgIHNuaXBwZXQ6IHtcclxuICAgICAgICB0aXRsZTogcmVxdWVzdC50aXRsZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogcmVxdWVzdC5kZXNjcmlwdGlvbixcclxuICAgICAgICB0YWdzOiByZXF1ZXN0LnRhZ3MsXHJcbiAgICAgICAgY2F0ZWdvcnlJZDogcmVxdWVzdC5jYXRlZ29yeUlkXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YXR1czoge1xyXG4gICAgICAgIHByaXZhY3lTdGF0dXM6IHJlcXVlc3QucHJpdmFjeVN0YXR1c1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVybCA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS91cGxvYWQveW91dHViZS92My92aWRlb3M/dXBsb2FkVHlwZT1tdWx0aXBhcnQmcGFydD1zbmlwcGV0LHN0YXR1cyc7XHJcbiAgICBcclxuICAgIC8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciAtIGFjdHVhbCBpbXBsZW1lbnRhdGlvbiB3b3VsZCBuZWVkIG11bHRpcGFydCB1cGxvYWRcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5tYWtlQXBpUmVxdWVzdDxhbnk+KHVybCwge1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkobWV0YWRhdGEpXHJcbiAgICB9LCAxNjAwKTsgLy8gVXBsb2FkIGNvc3RzIDE2MDAgcXVvdGEgdW5pdHNcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpZDogcmVzcG9uc2UuaWQsXHJcbiAgICAgIHRpdGxlOiByZXNwb25zZS5zbmlwcGV0LnRpdGxlLFxyXG4gICAgICBkZXNjcmlwdGlvbjogcmVzcG9uc2Uuc25pcHBldC5kZXNjcmlwdGlvbixcclxuICAgICAgcHVibGlzaGVkQXQ6IHJlc3BvbnNlLnNuaXBwZXQucHVibGlzaGVkQXQsXHJcbiAgICAgIGNoYW5uZWxJZDogcmVzcG9uc2Uuc25pcHBldC5jaGFubmVsSWQsXHJcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLnVwbG9hZFN0YXR1c1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFZpZGVvQ2F0ZWdvcmllcyhyZWdpb25Db2RlOiBzdHJpbmcgPSAnVVMnKTogUHJvbWlzZTxBcnJheTx7aWQ6IHN0cmluZywgdGl0bGU6IHN0cmluZ30+PiB7XHJcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHtcclxuICAgICAgcGFydDogJ3NuaXBwZXQnLFxyXG4gICAgICByZWdpb25Db2RlLFxyXG4gICAgICBrZXk6IHRoaXMuY3JlZGVudGlhbHM/LmNsaWVudF9pZCB8fCAnJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXJsID0gYGh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvdmlkZW9DYXRlZ29yaWVzPyR7cGFyYW1zfWA7XHJcbiAgICBcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5tYWtlQXBpUmVxdWVzdDxhbnk+KHVybCwge30sIDEpO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZS5pdGVtcz8ubWFwKChpdGVtOiBhbnkpID0+ICh7XHJcbiAgICAgIGlkOiBpdGVtLmlkLFxyXG4gICAgICB0aXRsZTogaXRlbS5zbmlwcGV0LnRpdGxlXHJcbiAgICB9KSkgfHwgW107XHJcbiAgfVxyXG5cclxuICBnZXRRdW90YVVzYWdlKCk6IHsgdXNlZDogbnVtYmVyOyBsaW1pdDogbnVtYmVyOyByZW1haW5pbmc6IG51bWJlciB9IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHVzZWQ6IHRoaXMucXVvdGFVc2VkLFxyXG4gICAgICBsaW1pdDogdGhpcy5jb25maWcucXVvdGFMaW1pdCB8fCAxMDAwMCxcclxuICAgICAgcmVtYWluaW5nOiAodGhpcy5jb25maWcucXVvdGFMaW1pdCB8fCAxMDAwMCkgLSB0aGlzLnF1b3RhVXNlZFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHRlc3RDb25uZWN0aW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gT25seSBlbnN1cmUgdmFsaWQgdG9rZW4gaWYgd2UncmUgbm90IHVzaW5nIEFQSSBrZXlcclxuICAgICAgaWYgKCF0aGlzLmNyZWRlbnRpYWxzPy5hcGlfa2V5IHx8IHRoaXMuY3JlZGVudGlhbHMuYXBpX2tleS50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5lbnN1cmVWYWxpZFRva2VuKCk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gU2ltcGxlIHRlc3QgcmVxdWVzdFxyXG4gICAgICBhd2FpdCB0aGlzLmdldFZpZGVvQ2F0ZWdvcmllcygpO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1lvdVR1YmUgQVBJIGNvbm5lY3Rpb24gdGVzdCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG59Il19