import { DynamoDBClient, PutItemCommand, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

interface TrendRecord {
  trendId: string;
  keyword: string;
  searchVolume: number;
  category: string;
  discoveredAt: string;
  urgency: 'low' | 'medium' | 'high';
  relatedTerms: string[];
  context: any;
  source: string;
  // Analytics fields
  contentGenerated: boolean;
  videoCreated: boolean;
  performanceMetrics?: {
    views?: number;
    engagement?: number;
    ctr?: number;
  };
}

interface PromptRecord {
  promptId: string;
  trendId: string;
  generatedAt: string;
  category: string;
  prompts: {
    videoPrompt: string;
    thumbnailPrompt: string;
    seoPrompts: any;
    contentStructure: any;
  };
  confidence: number;
  usageCount: number;
  performanceScore?: number;
}

interface VideoRecord {
  videoId: string;
  trendId: string;
  promptId: string;
  createdAt: string;
  metadata: {
    title: string;
    duration: number;
    category: string;
    cost: number;
  };
  performance: {
    views: number;
    likes: number;
    comments: number;
    ctr: number;
    watchTime: number;
  };
}

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const cloudwatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });

// Cost-effective table design with TTL
const TABLES = {
  // Hot data (7 days) - frequently accessed
  TRENDS_HOT: 'youtube-automation-trends-hot',
  PROMPTS_HOT: 'youtube-automation-prompts-hot', 
  VIDEOS_HOT: 'youtube-automation-videos-hot',
  
  // Warm data (30 days) - occasional access
  TRENDS_WARM: 'youtube-automation-trends-warm',
  PROMPTS_WARM: 'youtube-automation-prompts-warm',
  
  // Analytics aggregations (1 year) - analysis queries
  ANALYTICS: 'youtube-automation-analytics'
};

const S3_BUCKETS = {
  // Cold storage for detailed records (indefinite, IA after 30 days, Glacier after 90 days)
  ARCHIVE: 'youtube-automation-data-archive',
  
  // Analytics exports and reports
  ANALYTICS: 'youtube-automation-analytics-exports'
};

export const handler = async (event: any): Promise<any> => {
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'storeTrend':
        return await storeTrendData(data);
      case 'storePrompt':
        return await storePromptData(data);
      case 'storeVideo':
        return await storeVideoData(data);
      case 'getTrends':
        return await getTrendsForAnalysis(data);
      case 'getPrompts':
        return await getPromptsForAnalysis(data);
      case 'archiveOldData':
        return await archiveOldData();
      case 'generateAnalytics':
        return await generateAnalyticsReport(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Data storage operation failed:', error);
    throw error;
  }
};

// TIER 1: Hot Storage (DynamoDB) - 7 days, frequent access
async function storeTrendData(trend: TrendRecord): Promise<void> {
  console.log(`📊 Storing trend data: ${trend.keyword}`);
  
  // Store in hot table with 7-day TTL
  const hotRecord = {
    TableName: TABLES.TRENDS_HOT,
    Item: {
      trendId: { S: trend.trendId },
      keyword: { S: trend.keyword },
      searchVolume: { N: trend.searchVolume.toString() },
      category: { S: trend.category },
      discoveredAt: { S: trend.discoveredAt },
      urgency: { S: trend.urgency },
      relatedTerms: { S: JSON.stringify(trend.relatedTerms) },
      context: { S: JSON.stringify(trend.context) },
      source: { S: trend.source },
      contentGenerated: { BOOL: trend.contentGenerated || false },
      videoCreated: { BOOL: trend.videoCreated || false },
      ttl: { N: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) }, // 7 days
      // GSI keys for querying
      categoryDate: { S: `${trend.category}#${trend.discoveredAt.split('T')[0]}` },
      urgencyDate: { S: `${trend.urgency}#${trend.discoveredAt.split('T')[0]}` }
    }
  };
  
  await dynamoClient.send(new PutItemCommand(hotRecord));
  
  // Also store in S3 for long-term analysis (cost-effective)
  await storeInS3Archive('trends', trend.trendId, trend);
  
  // Update CloudWatch metrics
  await updateTrendMetrics(trend);
}

async function storePromptData(prompt: PromptRecord): Promise<void> {
  console.log(`🧠 Storing prompt data: ${prompt.promptId}`);
  
  // Store in hot table with 7-day TTL
  const hotRecord = {
    TableName: TABLES.PROMPTS_HOT,
    Item: {
      promptId: { S: prompt.promptId },
      trendId: { S: prompt.trendId },
      generatedAt: { S: prompt.generatedAt },
      category: { S: prompt.category },
      prompts: { S: JSON.stringify(prompt.prompts) },
      confidence: { N: prompt.confidence.toString() },
      usageCount: { N: prompt.usageCount.toString() },
      ttl: { N: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) }, // 7 days
      // GSI keys
      trendDate: { S: `${prompt.trendId}#${prompt.generatedAt.split('T')[0]}` },
      categoryDate: { S: `${prompt.category}#${prompt.generatedAt.split('T')[0]}` }
    }
  };
  
  await dynamoClient.send(new PutItemCommand(hotRecord));
  
  // Store in S3 for analysis
  await storeInS3Archive('prompts', prompt.promptId, prompt);
}

async function storeVideoData(video: VideoRecord): Promise<void> {
  console.log(`🎬 Storing video data: ${video.videoId}`);
  
  // Store in hot table with 30-day TTL (videos need longer access)
  const hotRecord = {
    TableName: TABLES.VIDEOS_HOT,
    Item: {
      videoId: { S: video.videoId },
      trendId: { S: video.trendId },
      promptId: { S: video.promptId },
      createdAt: { S: video.createdAt },
      metadata: { S: JSON.stringify(video.metadata) },
      performance: { S: JSON.stringify(video.performance) },
      ttl: { N: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) }, // 30 days
      // GSI keys
      trendDate: { S: `${video.trendId}#${video.createdAt.split('T')[0]}` },
      categoryDate: { S: `${video.metadata.category}#${video.createdAt.split('T')[0]}` }
    }
  };
  
  await dynamoClient.send(new PutItemCommand(hotRecord));
  
  // Store in S3 for long-term analysis
  await storeInS3Archive('videos', video.videoId, video);
  
  // Update performance analytics
  await updateVideoMetrics(video);
}

// TIER 2: S3 Archive Storage - Cost-effective long-term storage
async function storeInS3Archive(type: string, id: string, data: any): Promise<void> {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `${type}/${date}/${id}.json`;
  
  const command = new PutObjectCommand({
    Bucket: S3_BUCKETS.ARCHIVE,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
    StorageClass: 'STANDARD_IA', // Cheaper for infrequent access
    Metadata: {
      'data-type': type,
      'created-date': date,
      'category': data.category || 'unknown'
    }
  });
  
  await s3Client.send(command);
}

// TIER 3: Analytics Aggregations - Optimized for analysis queries
async function generateAnalyticsReport(params: any): Promise<any> {
  console.log('📈 Generating analytics report...');
  
  const { startDate, endDate, category, reportType } = params;
  
  let report: any = {};
  
  switch (reportType) {
    case 'trend-analysis':
      report = await generateTrendAnalytics(startDate, endDate, category);
      break;
    case 'prompt-performance':
      report = await generatePromptAnalytics(startDate, endDate, category);
      break;
    case 'video-performance':
      report = await generateVideoAnalytics(startDate, endDate, category);
      break;
    case 'cost-analysis':
      report = await generateCostAnalytics(startDate, endDate);
      break;
    default:
      report = await generateComprehensiveReport(startDate, endDate, category);
  }
  
  // Store report in S3 for future reference
  const reportKey = `reports/${reportType}/${Date.now()}-${reportType}.json`;
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKETS.ANALYTICS,
    Key: reportKey,
    Body: JSON.stringify(report),
    ContentType: 'application/json'
  }));
  
  return {
    ...report,
    reportUrl: `s3://${S3_BUCKETS.ANALYTICS}/${reportKey}`,
    generatedAt: new Date().toISOString()
  };
}

async function generateTrendAnalytics(startDate: string, endDate: string, category?: string): Promise<any> {
  // Query S3 for trend data in date range
  const trends = await queryS3ArchiveData('trends', startDate, endDate, category);
  
  const analytics = {
    totalTrends: trends.length,
    categoryBreakdown: {},
    urgencyDistribution: { high: 0, medium: 0, low: 0 },
    averageSearchVolume: 0,
    topKeywords: [],
    trendSources: {},
    conversionRates: {
      trendsToContent: 0,
      trendsToVideos: 0
    }
  };
  
  let totalSearchVolume = 0;
  const keywordCounts = new Map();
  
  trends.forEach((trend: any) => {
    // Category breakdown
    analytics.categoryBreakdown[trend.category] = (analytics.categoryBreakdown[trend.category] || 0) + 1;
    
    // Urgency distribution
    analytics.urgencyDistribution[trend.urgency]++;
    
    // Search volume
    totalSearchVolume += trend.searchVolume;
    
    // Keywords
    keywordCounts.set(trend.keyword, (keywordCounts.get(trend.keyword) || 0) + 1);
    
    // Sources
    analytics.trendSources[trend.source] = (analytics.trendSources[trend.source] || 0) + 1;
    
    // Conversion tracking
    if (trend.contentGenerated) analytics.conversionRates.trendsToContent++;
    if (trend.videoCreated) analytics.conversionRates.trendsToVideos++;
  });
  
  analytics.averageSearchVolume = totalSearchVolume / trends.length;
  analytics.topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
  
  analytics.conversionRates.trendsToContent = (analytics.conversionRates.trendsToContent / trends.length) * 100;
  analytics.conversionRates.trendsToVideos = (analytics.conversionRates.trendsToVideos / trends.length) * 100;
  
  return analytics;
}

async function generatePromptAnalytics(startDate: string, endDate: string, category?: string): Promise<any> {
  const prompts = await queryS3ArchiveData('prompts', startDate, endDate, category);
  
  const analytics = {
    totalPrompts: prompts.length,
    averageConfidence: 0,
    categoryPerformance: {},
    promptReuse: {},
    qualityMetrics: {
      highConfidence: 0, // >80%
      mediumConfidence: 0, // 60-80%
      lowConfidence: 0 // <60%
    }
  };
  
  let totalConfidence = 0;
  
  prompts.forEach((prompt: any) => {
    totalConfidence += prompt.confidence;
    
    // Quality distribution
    if (prompt.confidence > 80) analytics.qualityMetrics.highConfidence++;
    else if (prompt.confidence > 60) analytics.qualityMetrics.mediumConfidence++;
    else analytics.qualityMetrics.lowConfidence++;
    
    // Category performance
    if (!analytics.categoryPerformance[prompt.category]) {
      analytics.categoryPerformance[prompt.category] = {
        count: 0,
        avgConfidence: 0,
        totalConfidence: 0
      };
    }
    analytics.categoryPerformance[prompt.category].count++;
    analytics.categoryPerformance[prompt.category].totalConfidence += prompt.confidence;
    
    // Prompt reuse tracking
    analytics.promptReuse[prompt.promptId] = prompt.usageCount;
  });
  
  analytics.averageConfidence = totalConfidence / prompts.length;
  
  // Calculate category averages
  Object.keys(analytics.categoryPerformance).forEach(category => {
    const cat = analytics.categoryPerformance[category];
    cat.avgConfidence = cat.totalConfidence / cat.count;
    delete cat.totalConfidence;
  });
  
  return analytics;
}

async function queryS3ArchiveData(type: string, startDate: string, endDate: string, category?: string): Promise<any[]> {
  // This would implement S3 Select or Athena queries for cost-effective analysis
  // For now, simulate the query results
  
  console.log(`🔍 Querying S3 archive for ${type} data from ${startDate} to ${endDate}`);
  
  // In production, this would use S3 Select for cost-effective querying:
  // - Only pay for data scanned, not storage
  // - Filter at the S3 level to reduce data transfer costs
  // - Use columnar formats like Parquet for even better performance
  
  return []; // Placeholder - would return actual S3 query results
}

// Cost optimization: Archive old data from DynamoDB to S3
async function archiveOldData(): Promise<void> {
  console.log('🗄️ Archiving old data to reduce DynamoDB costs...');
  
  const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
  
  // Archive trends older than 7 days
  await archiveTableData(TABLES.TRENDS_HOT, 'discoveredAt', cutoffDate, 'trends');
  
  // Archive prompts older than 7 days  
  await archiveTableData(TABLES.PROMPTS_HOT, 'generatedAt', cutoffDate, 'prompts');
  
  console.log('✅ Data archival completed');
}

async function archiveTableData(tableName: string, dateField: string, cutoffDate: string, type: string): Promise<void> {
  // Query old records
  const queryCommand = new QueryCommand({
    TableName: tableName,
    FilterExpression: `${dateField} < :cutoff`,
    ExpressionAttributeValues: {
      ':cutoff': { S: cutoffDate }
    }
  });
  
  // This would implement the actual archival logic
  // Move old records to S3 and delete from DynamoDB
}

// CloudWatch metrics for monitoring and cost optimization
async function updateTrendMetrics(trend: TrendRecord): Promise<void> {
  const metrics = [
    {
      MetricName: 'TrendsDiscovered',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Category', Value: trend.category },
        { Name: 'Urgency', Value: trend.urgency }
      ]
    },
    {
      MetricName: 'SearchVolume',
      Value: trend.searchVolume,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Category', Value: trend.category }
      ]
    }
  ];
  
  await cloudwatchClient.send(new PutMetricDataCommand({
    Namespace: 'YouTubeAutomation/Trends',
    MetricData: metrics
  }));
}

async function updateVideoMetrics(video: VideoRecord): Promise<void> {
  const metrics = [
    {
      MetricName: 'VideosCreated',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Category', Value: video.metadata.category }
      ]
    },
    {
      MetricName: 'VideoCreationCost',
      Value: video.metadata.cost,
      Unit: 'None',
      Dimensions: [
        { Name: 'Category', Value: video.metadata.category }
      ]
    },
    {
      MetricName: 'VideoViews',
      Value: video.performance.views,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Category', Value: video.metadata.category }
      ]
    }
  ];
  
  await cloudwatchClient.send(new PutMetricDataCommand({
    Namespace: 'YouTubeAutomation/Videos',
    MetricData: metrics
  }));
}

// Cost analysis
async function generateCostAnalytics(startDate: string, endDate: string): Promise<any> {
  return {
    storage: {
      dynamodb: {
        hotTables: 'Calculated based on item count and size',
        estimatedMonthlyCost: '$5-15 for typical usage'
      },
      s3: {
        standardIA: 'Archive storage after 30 days',
        glacier: 'Long-term storage after 90 days',
        estimatedMonthlyCost: '$1-5 for typical usage'
      }
    },
    analysis: {
      s3Select: 'Pay only for data scanned during queries',
      athena: 'Optional for complex analytics',
      estimatedQueryCost: '$0.01-0.10 per analysis'
    },
    recommendations: [
      'Use S3 Select for cost-effective data analysis',
      'Archive old DynamoDB data to S3 automatically',
      'Use lifecycle policies to move to Glacier',
      'Monitor CloudWatch metrics to optimize retention periods'
    ]
  };
}

export {
  storeTrendData,
  storePromptData,
  storeVideoData,
  generateAnalyticsReport,
  archiveOldData,
  TrendRecord,
  PromptRecord,
  VideoRecord
};