import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import fetch, { RequestInit } from 'node-fetch';

export interface YouTubeCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  project_id: string;
}

export interface YouTubeApiConfig {
  secretName?: string;
  region?: string;
  quotaLimit?: number;
  requestsPerSecond?: number;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
  categoryId?: string;
}

export interface YouTubeVideoDetails {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  categoryId: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
}

export interface YouTubeUploadRequest {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: 'private' | 'public' | 'unlisted';
  videoFilePath?: string;
  videoBuffer?: Buffer;
}

export interface YouTubeUploadResponse {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  status: string;
}

export class YouTubeApiClient {
  private credentials: YouTubeCredentials | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private secretsClient: SecretsManagerClient;
  private config: YouTubeApiConfig;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private quotaUsed = 0;
  private quotaResetTime = 0;

  constructor(config: YouTubeApiConfig = {}) {
    this.config = {
      secretName: config.secretName || 'youtube-automation/credentials',
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      quotaLimit: config.quotaLimit || 10000, // YouTube API daily quota
      requestsPerSecond: config.requestsPerSecond || 1
    };

    this.secretsClient = new SecretsManagerClient({
      region: this.config.region
    });
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    await this.refreshAccessToken();
  }

  private async loadCredentials(): Promise<void> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: this.config.secretName
      });

      const response = await this.secretsClient.send(command);
      
      if (!response.SecretString) {
        throw new Error('No secret string found');
      }

      this.credentials = JSON.parse(response.SecretString) as YouTubeCredentials;
    } catch (error) {
      throw new Error(`Failed to load YouTube credentials: ${error}`);
    }
  }

  private async refreshAccessToken(): Promise<void> {
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
      const response = await fetch(tokenUrl, {
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
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken();
    }
  }

  private async makeApiRequest<T>(
    url: string, 
    options: RequestInit = {},
    quotaCost: number = 1
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.checkQuota(quotaCost);
          await this.ensureValidToken();

          const response = await fetch(url, {
            ...options,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
              ...(options.headers as Record<string, string> || {})
            }
          });

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
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
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

  private async checkQuota(cost: number): Promise<void> {
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchVideos(
    query: string,
    options: {
      maxResults?: number;
      order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
      publishedAfter?: string;
      publishedBefore?: string;
      regionCode?: string;
      videoCategoryId?: string;
    } = {}
  ): Promise<YouTubeSearchResult[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: (options.maxResults || 25).toString(),
      order: options.order || 'relevance',
      key: this.credentials?.client_id || ''
    });

    if (options.publishedAfter) params.append('publishedAfter', options.publishedAfter);
    if (options.publishedBefore) params.append('publishedBefore', options.publishedBefore);
    if (options.regionCode) params.append('regionCode', options.regionCode);
    if (options.videoCategoryId) params.append('videoCategoryId', options.videoCategoryId);

    const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
    
    const response = await this.makeApiRequest<any>(url, {}, 100); // Search costs 100 quota units

    return response.items?.map((item: any) => ({
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

  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: this.credentials?.client_id || ''
    });

    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    
    const response = await this.makeApiRequest<any>(url, {}, 1); // Videos.list costs 1 quota unit per video

    return response.items?.map((item: any) => ({
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

  async getTrendingVideos(
    regionCode: string = 'US',
    categoryId?: string,
    maxResults: number = 50
  ): Promise<YouTubeVideoDetails[]> {
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
    
    const response = await this.makeApiRequest<any>(url, {}, 1);

    return response.items?.map((item: any) => ({
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

  async uploadVideo(request: YouTubeUploadRequest): Promise<YouTubeUploadResponse> {
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
    const response = await this.makeApiRequest<any>(url, {
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

  async getVideoCategories(regionCode: string = 'US'): Promise<Array<{id: string, title: string}>> {
    const params = new URLSearchParams({
      part: 'snippet',
      regionCode,
      key: this.credentials?.client_id || ''
    });

    const url = `https://www.googleapis.com/youtube/v3/videoCategories?${params}`;
    
    const response = await this.makeApiRequest<any>(url, {}, 1);

    return response.items?.map((item: any) => ({
      id: item.id,
      title: item.snippet.title
    })) || [];
  }

  getQuotaUsage(): { used: number; limit: number; remaining: number } {
    return {
      used: this.quotaUsed,
      limit: this.config.quotaLimit || 10000,
      remaining: (this.config.quotaLimit || 10000) - this.quotaUsed
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      // Simple test request
      await this.getVideoCategories();
      return true;
    } catch (error) {
      console.error('YouTube API connection test failed:', error);
      return false;
    }
  }
}