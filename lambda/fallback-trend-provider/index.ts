import { Handler, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

export interface FallbackTrendProviderEvent {
  topics: string[];
  fallbackStrategy: 'CACHED_TRENDS' | 'POPULAR_KEYWORDS' | 'TEMPLATE_BASED';
  workflowContext: {
    workflowId: string;
    retryCount: number;
    failureCount: number;
  };
}

export interface FallbackTrendProviderResponse {
  success: boolean;
  trendsDetected: number;
  topicsAnalyzed: number;
  results: Array<{
    topic: string;
    trends: any[];
    topTrend: any;
    trendsFound: number;
    averageEngagement: number;
    source: 'CACHED' | 'FALLBACK_KEYWORDS' | 'TEMPLATE';
  }>;
  executionTime: number;
  error?: string;
}

export const handler: Handler<FallbackTrendProviderEvent, FallbackTrendProviderResponse> = async (
  event: FallbackTrendProviderEvent,
  context: Context
): Promise<FallbackTrendProviderResponse> => {
  const startTime = Date.now();
  
  console.log('Fallback Trend Provider started', {
    requestId: context.awsRequestId,
    topics: event.topics,
    strategy: event.fallbackStrategy,
    workflowId: event.workflowContext.workflowId
  });

  try {
    let results: any[] = [];

    switch (event.fallbackStrategy) {
      case 'CACHED_TRENDS':
        results = await getCachedTrends(event.topics);
        break;
      case 'POPULAR_KEYWORDS':
        results = await generateFromPopularKeywords(event.topics);
        break;
      case 'TEMPLATE_BASED':
        results = await generateFromTemplates(event.topics);
        break;
      default:
        throw new Error(`Unknown fallback strategy: ${event.fallbackStrategy}`);
    }

    const totalTrends = results.reduce((sum, result) => sum + result.trendsFound, 0);

    console.log('Fallback trend provider completed successfully', {
      strategy: event.fallbackStrategy,
      topicsProcessed: results.length,
      totalTrends,
      executionTime: Date.now() - startTime
    });

    return {
      success: true,
      trendsDetected: totalTrends,
      topicsAnalyzed: results.length,
      results,
      executionTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Fallback trend provider failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId
    });

    return {
      success: false,
      trendsDetected: 0,
      topicsAnalyzed: 0,
      results: [],
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function getCachedTrends(topics: string[]): Promise<any[]> {
  console.log('Retrieving cached trends from DynamoDB');
  
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(client);
  
  const results = [];
  
  for (const topic of topics) {
    try {
      // Get trends from last 24 hours
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const response = await docClient.send(new QueryCommand({
        TableName: process.env.TREND_ANALYTICS_TABLE_NAME || 'TrendAnalytics',
        KeyConditionExpression: '#topic = :topic AND #timestamp >= :cutoffTime',
        ExpressionAttributeNames: {
          '#topic': 'topic',
          '#timestamp': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':topic': topic,
          ':cutoffTime': cutoffTime
        },
        Limit: 20,
        ScanIndexForward: false // Most recent first
      }));

      const trends = response.Items || [];
      
      if (trends.length > 0) {
        const topTrend = trends[0];
        const averageEngagement = trends.reduce((sum, trend) => sum + (trend.engagementScore || 0), 0) / trends.length;
        
        results.push({
          topic,
          trends,
          topTrend,
          trendsFound: trends.length,
          averageEngagement,
          source: 'CACHED'
        });
        
        console.log(`Found ${trends.length} cached trends for topic: ${topic}`);
      } else {
        // No cached trends, create fallback
        const fallbackTrend = createFallbackTrend(topic);
        results.push({
          topic,
          trends: [fallbackTrend],
          topTrend: fallbackTrend,
          trendsFound: 1,
          averageEngagement: 0.03,
          source: 'CACHED'
        });
        
        console.log(`No cached trends found for topic: ${topic}, using fallback`);
      }
    } catch (error) {
      console.error(`Failed to get cached trends for topic: ${topic}`, error);
      
      // Create minimal fallback
      const fallbackTrend = createFallbackTrend(topic);
      results.push({
        topic,
        trends: [fallbackTrend],
        topTrend: fallbackTrend,
        trendsFound: 1,
        averageEngagement: 0.02,
        source: 'CACHED'
      });
    }
  }
  
  return results;
}

async function generateFromPopularKeywords(topics: string[]): Promise<any[]> {
  console.log('Generating trends from popular keywords');
  
  const popularKeywordsByTopic: Record<string, string[]> = {
    investing: ['ETF', 'stocks', 'portfolio', 'dividends', 'crypto', 'retirement', 'savings', 'market'],
    education: ['study', 'learning', 'skills', 'courses', 'tutorial', 'tips', 'productivity', 'success'],
    tourism: ['travel', 'destinations', 'vacation', 'adventure', 'culture', 'food', 'budget', 'guide'],
    technology: ['AI', 'software', 'gadgets', 'innovation', 'coding', 'apps', 'future', 'trends'],
    health: ['fitness', 'nutrition', 'wellness', 'exercise', 'diet', 'mental', 'lifestyle', 'tips'],
    finance: ['money', 'budget', 'savings', 'debt', 'credit', 'loans', 'planning', 'wealth']
  };
  
  const results = [];
  
  for (const topic of topics) {
    const keywords = popularKeywordsByTopic[topic.toLowerCase()] || ['tips', 'guide', 'tutorial', 'best'];
    const trends = [];
    
    // Generate synthetic trends based on popular keywords
    for (let i = 0; i < Math.min(5, keywords.length); i++) {
      const keyword = keywords[i];
      const trend = {
        topic,
        timestamp: new Date().toISOString(),
        videoId: `fallback_${topic}_${keyword}_${Date.now()}_${i}`,
        title: `${keyword} ${topic} Guide: Essential Tips for Beginners`,
        viewCount: Math.floor(Math.random() * 50000) + 10000,
        likeCount: Math.floor(Math.random() * 2000) + 500,
        commentCount: Math.floor(Math.random() * 300) + 50,
        engagementRate: Math.random() * 3 + 2, // 2-5%
        engagementScore: Math.random() * 0.03 + 0.02, // 0.02-0.05
        keywords: [keyword, topic, 'guide', 'tips', 'tutorial'],
        categoryId: '27',
        publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        channelTitle: `${topic} Expert`,
        channelId: `fallback_channel_${topic}`,
        description: `Learn about ${keyword} in ${topic} with this comprehensive guide`
      };
      
      trends.push(trend);
    }
    
    const topTrend = trends[0];
    const averageEngagement = trends.reduce((sum, trend) => sum + trend.engagementScore, 0) / trends.length;
    
    results.push({
      topic,
      trends,
      topTrend,
      trendsFound: trends.length,
      averageEngagement,
      source: 'FALLBACK_KEYWORDS'
    });
    
    console.log(`Generated ${trends.length} fallback trends for topic: ${topic}`);
  }
  
  return results;
}

async function generateFromTemplates(topics: string[]): Promise<any[]> {
  console.log('Generating trends from templates');
  
  const templates = [
    'Ultimate {topic} Guide for Beginners',
    'Top 10 {topic} Tips Everyone Should Know',
    '{topic} Mistakes to Avoid in 2024',
    'Complete {topic} Tutorial: Step by Step',
    'Best {topic} Strategies That Actually Work'
  ];
  
  const results = [];
  
  for (const topic of topics) {
    const trends = [];
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const title = template.replace('{topic}', topic.charAt(0).toUpperCase() + topic.slice(1));
      
      const trend = {
        topic,
        timestamp: new Date().toISOString(),
        videoId: `template_${topic}_${Date.now()}_${i}`,
        title,
        viewCount: Math.floor(Math.random() * 30000) + 5000,
        likeCount: Math.floor(Math.random() * 1500) + 300,
        commentCount: Math.floor(Math.random() * 200) + 30,
        engagementRate: Math.random() * 2.5 + 1.5, // 1.5-4%
        engagementScore: Math.random() * 0.025 + 0.015, // 0.015-0.04
        keywords: [topic, 'guide', 'tips', 'tutorial', 'beginners'],
        categoryId: '27',
        publishedAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
        channelTitle: `${topic} Academy`,
        channelId: `template_channel_${topic}`,
        description: `Comprehensive ${topic} content for learners of all levels`
      };
      
      trends.push(trend);
    }
    
    const topTrend = trends[0];
    const averageEngagement = trends.reduce((sum, trend) => sum + trend.engagementScore, 0) / trends.length;
    
    results.push({
      topic,
      trends,
      topTrend,
      trendsFound: trends.length,
      averageEngagement,
      source: 'TEMPLATE'
    });
    
    console.log(`Generated ${trends.length} template-based trends for topic: ${topic}`);
  }
  
  return results;
}

function createFallbackTrend(topic: string): any {
  return {
    topic,
    timestamp: new Date().toISOString(),
    videoId: `fallback_${topic}_${Date.now()}`,
    title: `Essential ${topic.charAt(0).toUpperCase() + topic.slice(1)} Guide`,
    viewCount: 15000,
    likeCount: 750,
    commentCount: 100,
    engagementRate: 5.67,
    engagementScore: 0.057,
    keywords: [topic, 'guide', 'essential', 'tips'],
    categoryId: '27',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    channelTitle: `${topic} Basics`,
    channelId: `fallback_${topic}`,
    description: `Basic ${topic} information and guidance`
  };
}