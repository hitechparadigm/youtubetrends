import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import fetch from 'node-fetch';

export interface YouTubeCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  project_id: string;
  api_key?: string;
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

export class YouTubeApiClientSimple {
  private credentials: YouTubeCredentials | null = null;
  private secretsClient: SecretsManagerClient;
  private quotaUsed = 0;

  constructor(region: string = 'us-east-1') {
    this.secretsClient = new SecretsManagerClient({ region });
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  private async loadCredentials(): Promise<void> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: 'youtube-automation/credentials'
      });

      const response = await this.secretsClient.send(command);
      
      if (!response.SecretString) {
        throw new Error('No secret string found');
      }

      this.credentials = JSON.parse(response.SecretString) as YouTubeCredentials;
      console.log('✅ YouTube credentials loaded successfully');
    } catch (error) {
      throw new Error(`Failed to load YouTube credentials: ${error}`);
    }
  }

  private async makeRequest<T>(url: string): Promise<T> {
    if (!this.credentials?.api_key) {
      throw new Error('API key not available');
    }

    const separator = url.includes('?') ? '&' : '?';
    const requestUrl = `${url}${separator}key=${this.credentials.api_key}`;

    console.log('🌐 Making YouTube API request...');
    
    const response = await fetch(requestUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    this.quotaUsed += 1; // Simple quota tracking
    return await response.json() as T;
  }

  async searchVideos(query: string, maxResults: number = 25): Promise<YouTubeSearchResult[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'relevance'
    });

    const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
    const response = await this.makeRequest<any>(url);

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
      part: 'snippet,statistics',
      id: videoIds.join(',')
    });

    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    const response = await this.makeRequest<any>(url);

    return response.items?.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      categoryId: item.snippet.categoryId,
      duration: item.contentDetails?.duration || 'PT0S',
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      commentCount: parseInt(item.statistics?.commentCount || '0'),
      thumbnails: item.snippet.thumbnails
    })) || [];
  }

  async getTrendingVideos(categoryId?: string, regionCode: string = 'US'): Promise<YouTubeVideoDetails[]> {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode,
      maxResults: '25'
    });

    if (categoryId) {
      params.append('videoCategoryId', categoryId);
    }

    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    const response = await this.makeRequest<any>(url);

    return response.items?.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      categoryId: item.snippet.categoryId,
      duration: item.contentDetails?.duration || 'PT0S',
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      commentCount: parseInt(item.statistics?.commentCount || '0'),
      thumbnails: item.snippet.thumbnails
    })) || [];
  }

  async getVideoCategories(): Promise<Array<{ id: string; title: string }>> {
    const params = new URLSearchParams({
      part: 'snippet',
      regionCode: 'US'
    });

    const url = `https://www.googleapis.com/youtube/v3/videoCategories?${params}`;
    const response = await this.makeRequest<any>(url);

    return response.items?.map((item: any) => ({
      id: item.id,
      title: item.snippet.title
    })) || [];
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getVideoCategories();
      console.log('✅ YouTube API connection test successful');
      return true;
    } catch (error) {
      console.error('❌ YouTube API connection test failed:', error);
      return false;
    }
  }

  getQuotaUsage(): { used: number; limit: number; remaining: number } {
    return {
      used: this.quotaUsed,
      limit: 10000,
      remaining: 10000 - this.quotaUsed
    };
  }
}