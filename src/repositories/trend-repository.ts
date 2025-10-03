import { BaseRepository, RepositoryConfig } from './base-repository';
import { TrendData, TrendDataModel, TrendAnalysisResult } from '../models/trend-data';

export interface TrendQueryOptions {
  limit?: number;
  startTime?: string;
  endTime?: string;
  minEngagementScore?: number;
}

export class TrendRepository extends BaseRepository {
  constructor(config: RepositoryConfig = {}) {
    super(process.env.TREND_ANALYTICS_TABLE_NAME || 'TrendAnalytics', config);
  }

  async saveTrend(trend: TrendData): Promise<void> {
    const item = TrendDataModel.toDynamoDbItem(trend);
    
    await this.put({
      Item: item,
      ConditionExpression: 'attribute_not_exists(#topic) AND attribute_not_exists(#timestamp)',
      ExpressionAttributeNames: {
        '#topic': 'topic',
        '#timestamp': 'timestamp'
      }
    });
  }

  async saveTrends(trends: TrendData[]): Promise<void> {
    // DynamoDB batch write - process in chunks of 25 (DynamoDB limit)
    const chunks = this.chunkArray(trends, 25);
    
    for (const chunk of chunks) {
      const promises = chunk.map(trend => this.saveTrend(trend));
      await Promise.all(promises);
    }
  }

  async getTrendsByTopic(
    topic: string, 
    options: TrendQueryOptions = {}
  ): Promise<TrendData[]> {
    let keyConditionExpression = '#topic = :topic';
    const expressionAttributeNames: Record<string, string> = {
      '#topic': 'topic'
    };
    const expressionAttributeValues: Record<string, any> = {
      ':topic': topic
    };

    // Add time range filter if provided
    if (options.startTime && options.endTime) {
      keyConditionExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
      expressionAttributeNames['#timestamp'] = 'timestamp';
      expressionAttributeValues[':startTime'] = options.startTime;
      expressionAttributeValues[':endTime'] = options.endTime;
    } else if (options.startTime) {
      keyConditionExpression += ' AND #timestamp >= :startTime';
      expressionAttributeNames['#timestamp'] = 'timestamp';
      expressionAttributeValues[':startTime'] = options.startTime;
    }

    let filterExpression: string | undefined;
    if (options.minEngagementScore) {
      filterExpression = 'engagementScore >= :minEngagementScore';
      expressionAttributeValues[':minEngagementScore'] = options.minEngagementScore;
    }

    const items = await this.query({
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: options.limit,
      ScanIndexForward: false // Most recent first
    });

    return items.map(item => TrendDataModel.fromDynamoDbItem(item));
  }

  async getTopTrendsByEngagement(
    limit: number = 10,
    timeRange?: { start: string; end: string }
  ): Promise<TrendData[]> {
    let filterExpression: string | undefined;
    const expressionAttributeValues: Record<string, any> = {};

    if (timeRange) {
      filterExpression = '#timestamp BETWEEN :startTime AND :endTime';
      expressionAttributeValues[':startTime'] = timeRange.start;
      expressionAttributeValues[':endTime'] = timeRange.end;
    }

    const items = await this.query({
      IndexName: 'EngagementIndex',
      KeyConditionExpression: 'engagementScore > :minScore',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: timeRange ? { '#timestamp': 'timestamp' } : undefined,
      ExpressionAttributeValues: {
        ':minScore': 0,
        ...expressionAttributeValues
      },
      Limit: limit,
      ScanIndexForward: false // Highest engagement first
    });

    return items.map(item => TrendDataModel.fromDynamoDbItem(item));
  }

  async getTrendAnalysis(
    topic: string,
    timeRange?: { start: string; end: string }
  ): Promise<TrendAnalysisResult> {
    const trends = await this.getTrendsByTopic(topic, {
      startTime: timeRange?.start,
      endTime: timeRange?.end
    });

    if (trends.length === 0) {
      return {
        trends: [],
        analysisTimestamp: new Date().toISOString(),
        totalTrends: 0,
        topEngagementScore: 0,
        averageEngagementRate: 0
      };
    }

    const totalEngagementRate = trends.reduce((sum, trend) => sum + trend.engagementRate, 0);
    const topEngagementScore = Math.max(...trends.map(trend => trend.engagementScore));

    return {
      trends: trends.slice(0, 50), // Limit to top 50 for analysis
      analysisTimestamp: new Date().toISOString(),
      totalTrends: trends.length,
      topEngagementScore,
      averageEngagementRate: totalEngagementRate / trends.length
    };
  }

  async getRecentTrends(hours: number = 24, limit: number = 100): Promise<TrendData[]> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const items = await this.scan({
      FilterExpression: '#timestamp >= :startTime',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':startTime': startTime
      },
      Limit: limit
    });

    return items
      .map(item => TrendDataModel.fromDynamoDbItem(item))
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }

  async deleteTrendsByTopic(topic: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    const items = await this.query({
      KeyConditionExpression: '#topic = :topic AND #timestamp < :cutoffDate',
      ExpressionAttributeNames: {
        '#topic': 'topic',
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':topic': topic,
        ':cutoffDate': cutoffDate
      },
      ProjectionExpression: '#topic, #timestamp'
    });

    let deletedCount = 0;
    for (const item of items) {
      await this.delete({
        Key: {
          topic: item.topic,
          timestamp: item.timestamp
        }
      });
      deletedCount++;
    }

    return deletedCount;
  }

  async getTopicStats(topic: string, days: number = 7): Promise<{
    totalTrends: number;
    averageEngagement: number;
    topVideo: TrendData | null;
    trendingKeywords: string[];
  }> {
    const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const trends = await this.getTrendsByTopic(topic, { startTime });

    if (trends.length === 0) {
      return {
        totalTrends: 0,
        averageEngagement: 0,
        topVideo: null,
        trendingKeywords: []
      };
    }

    const totalEngagement = trends.reduce((sum, trend) => sum + trend.engagementScore, 0);
    const topVideo = trends.reduce((top, current) => 
      current.engagementScore > top.engagementScore ? current : top
    );

    // Extract trending keywords
    const keywordCounts: Record<string, number> = {};
    trends.forEach(trend => {
      trend.keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });

    const trendingKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    return {
      totalTrends: trends.length,
      averageEngagement: totalEngagement / trends.length,
      topVideo,
      trendingKeywords
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}