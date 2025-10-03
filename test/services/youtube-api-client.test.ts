import { YouTubeApiClient } from '../../src/services/youtube-api-client';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');
jest.mock('node-fetch');

describe('YouTubeApiClient', () => {
  let client: YouTubeApiClient;
  let mockSecretsClient: any;

  beforeEach(() => {
    const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
    mockSecretsClient = {
      send: jest.fn()
    };
    SecretsManagerClient.mockImplementation(() => mockSecretsClient);

    client = new YouTubeApiClient({
      secretName: 'test-secret',
      region: 'us-east-1'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create client with default config', () => {
      expect(client).toBeInstanceOf(YouTubeApiClient);
    });

    it('should handle quota tracking', () => {
      const quota = client.getQuotaUsage();
      expect(quota.used).toBe(0);
      expect(quota.limit).toBe(10000);
      expect(quota.remaining).toBe(10000);
    });
  });

  describe('credential management', () => {
    it('should handle missing credentials gracefully', async () => {
      mockSecretsClient.send.mockRejectedValue(new Error('Secret not found'));
      
      await expect(client.initialize()).rejects.toThrow('Failed to load YouTube credentials');
    });

    it('should handle invalid secret format', async () => {
      mockSecretsClient.send.mockResolvedValue({
        SecretString: null
      });
      
      await expect(client.initialize()).rejects.toThrow('Failed to load YouTube credentials');
    });
  });

  describe('API methods', () => {
    it('should have all required API methods', () => {
      expect(typeof client.searchVideos).toBe('function');
      expect(typeof client.getVideoDetails).toBe('function');
      expect(typeof client.getTrendingVideos).toBe('function');
      expect(typeof client.uploadVideo).toBe('function');
      expect(typeof client.getVideoCategories).toBe('function');
      expect(typeof client.testConnection).toBe('function');
    });
  });
});