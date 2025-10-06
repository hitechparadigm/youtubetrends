import { Handler, Context } from 'aws-lambda';
import { YouTubeApiClientSimple } from '../../src/services/youtube-api-client-simple';
import { TrendDetectionServiceSimple } from '../../src/services/trend-detection-service-simple';
import { TrendRepository } from '../../src/repositories/trend-repository';

export interface TrendDetectorEvent {
  topics?: string[];
  region?: string;
  maxResults?: number;
  hoursBack?: number;
}

export interface TrendDetectorResponse {
  success: boolean;
  trendsDetected: number;
  topicsAnalyzed: string[];
  results: Array<{
    topic: string;
    trendsFound: number;
    topTrend: any;
    averageEngagement: number;
  }>;
  executionTime: number;
  quotaUsed: number;
  error?: string;
}

export const handler: Handler<TrendDetectorEvent, TrendDetectorResponse> = async (
  event: TrendDetectorEvent,
  context: Context
): Promise<TrendDetectorResponse> => {
  const startTime = Date.now();
  
  console.log('Trend Detector Lambda started', {
    requestId: context.awsRequestId,
    event: JSON.stringify(event, null, 2)
  });

  try {
    // Initialize services using the simple, working approach
    const youtubeClient = new YouTubeApiClientSimple();
    const trendRepository = new TrendRepository({
      region: process.env.AWS_REGION
    });
    
    const config = {
      topics: event.topics || ['technology', 'investing'],
      regions: [event.region || 'US'],
      maxResultsPerQuery: event.maxResults || 20,
      hoursBack: event.hoursBack || 24
    };
    
    const trendDetectionService = new TrendDetectionServiceSimple(
      youtubeClient,
      trendRepository,
      config
    );
    
    // Initialize and test connection
    await youtubeClient.initialize();
    const connectionTest = await youtubeClient.testConnection();
    if (!connectionTest) {
      throw new Error('YouTube API connection failed');
    }

    console.log('YouTube API connection established successfully');

    // Detect trends using the working service
    const results = await trendDetectionService.detectTrends();
    
    // Get detailed trends data for each topic
    const enhancedResults = [];
    for (const result of results) {
      if (result.trendsFound > 0) {
        // Get the actual trends data by searching again
        const searchResults = await youtubeClient.searchVideos(
          `${result.topic} trending`,
          Math.min(result.trendsFound, 5) // Limit to top 5 trends
        );
        
        const videoIds = searchResults.map(r => r.videoId);
        const videoDetails = await youtubeClient.getVideoDetails(videoIds);
        
        enhancedResults.push({
          ...result,
          trends: videoDetails.map(video => ({
            videoId: video.id,
            title: video.title,
            description: video.description,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            publishedAt: video.publishedAt,
            channelTitle: video.channelTitle,
            categoryId: video.categoryId,
            keywords: video.title.toLowerCase().split(' ').slice(0, 10),
            engagementScore: (video.likeCount + video.commentCount) / Math.max(video.viewCount, 1),
            topic: result.topic,
            timestamp: new Date().toISOString()
          }))
        });
      } else {
        enhancedResults.push({
          ...result,
          trends: []
        });
      }
    }
    
    const totalTrends = enhancedResults.reduce((sum, result) => sum + result.trendsFound, 0);
    const topicsAnalyzed = enhancedResults.map(result => result.topic);

    // Get quota usage (simple client doesn't track this, so we'll estimate)
    const quotaUsage = { used: config.topics.length * 10 }; // Estimate 10 quota units per topic

    console.log('Trend detection completed', {
      totalTrends,
      topicsAnalyzed,
      quotaUsed: quotaUsage.used,
      executionTime: Date.now() - startTime
    });

    // Publish CloudWatch metrics
    await publishMetrics({
      trendsDetected: totalTrends,
      topicsAnalyzed: topicsAnalyzed.length,
      quotaUsed: quotaUsage.used,
      executionTime: Date.now() - startTime
    });

    return {
      success: true,
      trendsDetected: totalTrends,
      topicsAnalyzed,
      results: enhancedResults.map(result => ({
        topic: result.topic,
        trendsFound: result.trendsFound,
        topTrend: result.topTrend,
        averageEngagement: result.averageEngagement,
        trends: result.trends // Include the actual trends data
      })),
      executionTime: Date.now() - startTime,
      quotaUsed: quotaUsage.used
    };

  } catch (error) {
    console.error('Trend detection failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId
    });

    // Publish error metrics
    await publishErrorMetrics(error instanceof Error ? error.message : String(error));

    return {
      success: false,
      trendsDetected: 0,
      topicsAnalyzed: [],
      results: [],
      executionTime: Date.now() - startTime,
      quotaUsed: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function publishMetrics(metrics: {
  trendsDetected: number;
  topicsAnalyzed: number;
  quotaUsed: number;
  executionTime: number;
}): Promise<void> {
  try {
    const { CloudWatchClient, PutMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');
    
    const cloudwatch = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const metricData = [
      {
        MetricName: 'TrendsDetected',
        Value: metrics.trendsDetected,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'TopicsAnalyzed',
        Value: metrics.topicsAnalyzed,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'YouTubeQuotaUsed',
        Value: metrics.quotaUsed,
        Unit: 'Count' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'ExecutionTime',
        Value: metrics.executionTime,
        Unit: 'Milliseconds' as const,
        Timestamp: new Date()
      }
    ];

    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'YouTubeAutomation/TrendDetector',
      MetricData: metricData
    }));

    console.log('Metrics published successfully');
  } catch (error) {
    console.error('Failed to publish metrics', error);
    // Don't throw - metrics failure shouldn't fail the main function
  }
}

async function publishErrorMetrics(errorMessage: string): Promise<void> {
  try {
    const { CloudWatchClient, PutMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');
    
    const cloudwatch = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'YouTubeAutomation/TrendDetector',
      MetricData: [
        {
          MetricName: 'Errors',
          Value: 1,
          Unit: 'Count' as const,
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'ErrorType',
              Value: errorMessage.substring(0, 50) // Truncate for dimension value
            }
          ]
        }
      ]
    }));
  } catch (error) {
    console.error('Failed to publish error metrics', error);
  }
}