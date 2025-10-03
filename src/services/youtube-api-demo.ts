import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import fetch from 'node-fetch';

export interface YouTubeApiDemoConfig {
  secretName?: string;
  region?: string;
  apiKey?: string; // For direct API key usage
}

export class YouTubeApiDemo {
  private apiKey: string | null = null;
  private secretsClient: SecretsManagerClient;
  private config: YouTubeApiDemoConfig;

  constructor(config: YouTubeApiDemoConfig = {}) {
    this.config = {
      secretName: config.secretName || 'youtube-automation/credentials',
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      apiKey: config.apiKey
    };

    this.secretsClient = new SecretsManagerClient({
      region: this.config.region
    });
  }

  async initialize(): Promise<void> {
    if (this.config.apiKey) {
      this.apiKey = this.config.apiKey;
    } else {
      await this.loadApiKeyFromSecrets();
    }
  }

  private async loadApiKeyFromSecrets(): Promise<void> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: this.config.secretName
      });

      const response = await this.secretsClient.send(command);
      
      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        this.apiKey = secrets.api_key || secrets.apiKey;
        
        if (!this.apiKey) {
          throw new Error('API key not found in secrets. Expected "api_key" or "apiKey" field.');
        }
      } else {
        throw new Error('No secret string found');
      }
    } catch (error) {
      console.error('Failed to load YouTube API key from Secrets Manager:', error);
      throw new Error('YouTube API credentials not configured. Please set up API key in Secrets Manager.');
    }
  }

  async searchVideos(query: string, options: {
    maxResults?: number;
    order?: string;
    publishedAfter?: string;
    regionCode?: string;
    categoryId?: string;
  } = {}): Promise<any[]> {
    if (!this.apiKey) {
      await this.initialize();
    }

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      key: this.apiKey!,
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
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
      }

      return data.items || [];
    } catch (error) {
      console.error('YouTube search failed:', error);
      throw error;
    }
  }

  async getVideoDetails(videoIds: string[]): Promise<any[]> {
    if (!this.apiKey) {
      await this.initialize();
    }

    if (videoIds.length === 0) return [];

    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: this.apiKey!
    });

    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
      }

      return (data.items || []).map((item: any) => ({
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
    } catch (error) {
      console.error('YouTube video details failed:', error);
      throw error;
    }
  }

  async getTrendingVideos(regionCode: string = 'US', categoryId?: string, maxResults: number = 25): Promise<any[]> {
    if (!this.apiKey) {
      await this.initialize();
    }

    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      regionCode,
      maxResults: maxResults.toString(),
      key: this.apiKey!
    });

    if (categoryId) {
      params.append('videoCategoryId', categoryId);
    }

    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
      }

      return (data.items || []).map((item: any) => ({
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
    } catch (error) {
      console.error('YouTube trending videos failed:', error);
      throw error;
    }
  }
}