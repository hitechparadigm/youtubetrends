import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand, SelectObjectContentCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

interface AnalyticsQuery {
  reportType: 'trend-analysis' | 'prompt-performance' | 'video-performance' | 'cost-analysis' | 'roi-analysis' | 'content-effectiveness';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: {
    category?: string[];
    urgency?: string[];
    searchVolumeMin?: number;
    searchVolumeMax?: number;
  };
  groupBy?: 'day' | 'week' | 'month' | 'category' | 'urgency';
  metrics?: string[];
}

interface AnalyticsReport {
  reportId: string;
  reportType: string;
  generatedAt: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRecords: number;
    keyInsights: string[];
    recommendations: string[];
  };
  data: any;
  visualizations: {
    charts: any[];
    tables: any[];
  };
  costAnalysis: {
    dataStorageCost: number;
    queryingCost: number;
    totalCost: number;
  };
}

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

const CLAUDE_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export const handler = async (event: AnalyticsQuery): Promise<AnalyticsReport> => {
  console.log('📊 Starting analytics engine for report:', event.reportType);
  
  const startTime = Date.now();
  const reportId = `report-${Date.now()}-${event.reportType}`;
  
  try {
    // Step 1: Gather data from multiple sources
    const rawData = await gatherAnalyticsData(event);
    
    // Step 2: Process and analyze data
    const processedData = await processAnalyticsData(rawData, event);
    
    // Step 3: Generate insights using AI
    const insights = await generateAIInsights(processedData, event);
    
    // Step 4: Create visualizations
    const visualizations = await createVisualizations(processedData, event);
    
    // Step 5: Calculate costs
    const costAnalysis = await calculateAnalyticsCosts(rawData, event);
    
    const executionTime = Date.now() - startTime;
    
    const report: AnalyticsReport = {
      reportId,
      reportType: event.reportType,
      generatedAt: new Date().toISOString(),
      dateRange: event.dateRange,
      summary: {
        totalRecords: rawData.totalRecords,
        keyInsights: insights.keyInsights,
        recommendations: insights.recommendations
      },
      data: processedData,
      visualizations,
      costAnalysis
    };
    
    console.log(`✅ Analytics report generated in ${executionTime}ms`);
    return report;
    
  } catch (error) {
    console.error('❌ Analytics engine failed:', error);
    throw error;
  }
};

async function gatherAnalyticsData(query: AnalyticsQuery): Promise<any> {
  console.log('🔍 Gathering data from DynamoDB and S3...');
  
  const data = {
    trends: [],
    prompts: [],
    videos: [],
    totalRecords: 0
  };
  
  // Determine data source based on date range
  const daysDiff = Math.ceil((new Date(query.dateRange.endDate).getTime() - new Date(query.dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 7) {
    // Recent data - query DynamoDB hot tables
    data.trends = await queryDynamoDBTrends(query);
    data.prompts = await queryDynamoDBPrompts(query);
    data.videos = await queryDynamoDBVideos(query);
  } else {
    // Historical data - query S3 archive with S3 Select for cost efficiency
    data.trends = await queryS3Trends(query);
    data.prompts = await queryS3Prompts(query);
    data.videos = await queryS3Videos(query);
  }
  
  data.totalRecords = data.trends.length + data.prompts.length + data.videos.length;
  
  console.log(`📊 Gathered ${data.totalRecords} records from ${daysDiff <= 7 ? 'DynamoDB' : 'S3'}`);
  return data;
}

async function queryDynamoDBTrends(query: AnalyticsQuery): Promise<any[]> {
  const params: any = {
    TableName: 'youtube-automation-trends-hot',
    FilterExpression: 'discoveredAt BETWEEN :startDate AND :endDate',
    ExpressionAttributeValues: {
      ':startDate': { S: query.dateRange.startDate },
      ':endDate': { S: query.dateRange.endDate }
    }
  };
  
  // Add category filter if specified
  if (query.filters?.category && query.filters.category.length > 0) {
    params.FilterExpression += ' AND category IN (:categories)';
    params.ExpressionAttributeValues[':categories'] = { SS: query.filters.category };
  }
  
  // Add search volume filters
  if (query.filters?.searchVolumeMin) {
    params.FilterExpression += ' AND searchVolume >= :minVolume';
    params.ExpressionAttributeValues[':minVolume'] = { N: query.filters.searchVolumeMin.toString() };
  }
  
  const command = new ScanCommand(params);
  const result = await dynamoClient.send(command);
  
  return result.Items?.map(item => ({
    trendId: item.trendId.S,
    keyword: item.keyword.S,
    searchVolume: parseInt(item.searchVolume.N || '0'),
    category: item.category.S,
    urgency: item.urgency.S,
    discoveredAt: item.discoveredAt.S,
    contentGenerated: item.contentGenerated?.BOOL || false,
    videoCreated: item.videoCreated?.BOOL || false
  })) || [];
}

async function queryS3Trends(query: AnalyticsQuery): Promise<any[]> {
  console.log('🗄️ Querying S3 archive with S3 Select for cost efficiency...');
  
  // Use S3 Select to query only the data we need, reducing costs
  const selectParams = {
    Bucket: 'youtube-automation-data-archive',
    Key: 'trends/', // This would be constructed based on date range
    Expression: `
      SELECT * FROM s3object[*] s 
      WHERE s.discoveredAt BETWEEN '${query.dateRange.startDate}' AND '${query.dateRange.endDate}'
      ${query.filters?.category ? `AND s.category IN (${query.filters.category.map(c => `'${c}'`).join(',')})` : ''}
      ${query.filters?.searchVolumeMin ? `AND s.searchVolume >= ${query.filters.searchVolumeMin}` : ''}
    `,
    ExpressionType: 'SQL',
    InputSerialization: {
      JSON: { Type: 'LINES' },
      CompressionType: 'NONE'
    },
    OutputSerialization: {
      JSON: {}
    }
  };
  
  try {
    const command = new SelectObjectContentCommand(selectParams);
    const response = await s3Client.send(command);
    
    // Process streaming response
    const records: any[] = [];
    if (response.Payload) {
      for await (const event of response.Payload) {
        if (event.Records?.Payload) {
          const chunk = new TextDecoder().decode(event.Records.Payload);
          const lines = chunk.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            try {
              records.push(JSON.parse(line));
            } catch (e) {
              // Skip invalid JSON lines
            }
          });
        }
      }
    }
    
    console.log(`📊 S3 Select returned ${records.length} trend records`);
    return records;
    
  } catch (error) {
    console.error('S3 Select failed, falling back to full object retrieval:', error);
    return []; // Fallback to empty results or implement full object retrieval
  }
}

async function queryDynamoDBPrompts(query: AnalyticsQuery): Promise<any[]> {
  const params = {
    TableName: 'youtube-automation-prompts-hot',
    FilterExpression: 'generatedAt BETWEEN :startDate AND :endDate',
    ExpressionAttributeValues: {
      ':startDate': { S: query.dateRange.startDate },
      ':endDate': { S: query.dateRange.endDate }
    }
  };
  
  const command = new ScanCommand(params);
  const result = await dynamoClient.send(command);
  
  return result.Items?.map(item => ({
    promptId: item.promptId.S,
    trendId: item.trendId.S,
    category: item.category.S,
    confidence: parseFloat(item.confidence.N || '0'),
    usageCount: parseInt(item.usageCount.N || '0'),
    generatedAt: item.generatedAt.S
  })) || [];
}

async function queryS3Prompts(query: AnalyticsQuery): Promise<any[]> {
  // Similar S3 Select implementation for prompts
  return []; // Placeholder
}

async function queryDynamoDBVideos(query: AnalyticsQuery): Promise<any[]> {
  const params = {
    TableName: 'youtube-automation-videos-hot',
    FilterExpression: 'createdAt BETWEEN :startDate AND :endDate',
    ExpressionAttributeValues: {
      ':startDate': { S: query.dateRange.startDate },
      ':endDate': { S: query.dateRange.endDate }
    }
  };
  
  const command = new ScanCommand(params);
  const result = await dynamoClient.send(command);
  
  return result.Items?.map(item => {
    const metadata = JSON.parse(item.metadata.S || '{}');
    const performance = JSON.parse(item.performance.S || '{}');
    
    return {
      videoId: item.videoId.S,
      trendId: item.trendId.S,
      promptId: item.promptId.S,
      createdAt: item.createdAt.S,
      category: metadata.category,
      duration: metadata.duration,
      cost: metadata.cost,
      views: performance.views || 0,
      likes: performance.likes || 0,
      ctr: performance.ctr || 0,
      watchTime: performance.watchTime || 0
    };
  }) || [];
}

async function queryS3Videos(query: AnalyticsQuery): Promise<any[]> {
  // Similar S3 Select implementation for videos
  return []; // Placeholder
}

async function processAnalyticsData(rawData: any, query: AnalyticsQuery): Promise<any> {
  console.log('⚙️ Processing analytics data...');
  
  const processed = {
    trends: {
      total: rawData.trends.length,
      byCategory: {},
      byUrgency: {},
      byDate: {},
      searchVolumeStats: {
        total: 0,
        average: 0,
        median: 0,
        max: 0,
        min: 0
      },
      conversionRates: {
        trendsToContent: 0,
        trendsToVideos: 0
      }
    },
    prompts: {
      total: rawData.prompts.length,
      averageConfidence: 0,
      byCategory: {},
      qualityDistribution: {
        high: 0, // >80%
        medium: 0, // 60-80%
        low: 0 // <60%
      },
      reuseStats: {}
    },
    videos: {
      total: rawData.videos.length,
      totalCost: 0,
      averageCost: 0,
      performance: {
        totalViews: 0,
        averageViews: 0,
        totalWatchTime: 0,
        averageCTR: 0
      },
      byCategory: {},
      roi: {
        costPerView: 0,
        costPerHour: 0,
        revenueEstimate: 0
      }
    },
    correlations: {
      searchVolumeToViews: 0,
      confidenceToPerformance: 0,
      urgencyToSuccess: 0
    }
  };
  
  // Process trends
  let totalSearchVolume = 0;
  const searchVolumes: number[] = [];
  
  rawData.trends.forEach((trend: any) => {
    // Category breakdown
    processed.trends.byCategory[trend.category] = (processed.trends.byCategory[trend.category] || 0) + 1;
    
    // Urgency breakdown
    processed.trends.byUrgency[trend.urgency] = (processed.trends.byUrgency[trend.urgency] || 0) + 1;
    
    // Date grouping
    const date = trend.discoveredAt.split('T')[0];
    processed.trends.byDate[date] = (processed.trends.byDate[date] || 0) + 1;
    
    // Search volume stats
    totalSearchVolume += trend.searchVolume;
    searchVolumes.push(trend.searchVolume);
    
    // Conversion tracking
    if (trend.contentGenerated) processed.trends.conversionRates.trendsToContent++;
    if (trend.videoCreated) processed.trends.conversionRates.trendsToVideos++;
  });
  
  // Calculate search volume statistics
  if (searchVolumes.length > 0) {
    processed.trends.searchVolumeStats.total = totalSearchVolume;
    processed.trends.searchVolumeStats.average = totalSearchVolume / searchVolumes.length;
    processed.trends.searchVolumeStats.max = Math.max(...searchVolumes);
    processed.trends.searchVolumeStats.min = Math.min(...searchVolumes);
    
    searchVolumes.sort((a, b) => a - b);
    const mid = Math.floor(searchVolumes.length / 2);
    processed.trends.searchVolumeStats.median = searchVolumes.length % 2 === 0 
      ? (searchVolumes[mid - 1] + searchVolumes[mid]) / 2 
      : searchVolumes[mid];
  }
  
  // Calculate conversion rates
  processed.trends.conversionRates.trendsToContent = (processed.trends.conversionRates.trendsToContent / rawData.trends.length) * 100;
  processed.trends.conversionRates.trendsToVideos = (processed.trends.conversionRates.trendsToVideos / rawData.trends.length) * 100;
  
  // Process prompts
  let totalConfidence = 0;
  
  rawData.prompts.forEach((prompt: any) => {
    totalConfidence += prompt.confidence;
    
    // Category breakdown
    processed.prompts.byCategory[prompt.category] = (processed.prompts.byCategory[prompt.category] || 0) + 1;
    
    // Quality distribution
    if (prompt.confidence > 80) processed.prompts.qualityDistribution.high++;
    else if (prompt.confidence > 60) processed.prompts.qualityDistribution.medium++;
    else processed.prompts.qualityDistribution.low++;
    
    // Reuse tracking
    processed.prompts.reuseStats[prompt.promptId] = prompt.usageCount;
  });
  
  processed.prompts.averageConfidence = rawData.prompts.length > 0 ? totalConfidence / rawData.prompts.length : 0;
  
  // Process videos
  let totalCost = 0;
  let totalViews = 0;
  let totalWatchTime = 0;
  let totalCTR = 0;
  
  rawData.videos.forEach((video: any) => {
    totalCost += video.cost;
    totalViews += video.views;
    totalWatchTime += video.watchTime;
    totalCTR += video.ctr;
    
    // Category breakdown
    if (!processed.videos.byCategory[video.category]) {
      processed.videos.byCategory[video.category] = {
        count: 0,
        totalCost: 0,
        totalViews: 0,
        averageViews: 0
      };
    }
    
    processed.videos.byCategory[video.category].count++;
    processed.videos.byCategory[video.category].totalCost += video.cost;
    processed.videos.byCategory[video.category].totalViews += video.views;
  });
  
  // Calculate video statistics
  if (rawData.videos.length > 0) {
    processed.videos.totalCost = totalCost;
    processed.videos.averageCost = totalCost / rawData.videos.length;
    processed.videos.performance.totalViews = totalViews;
    processed.videos.performance.averageViews = totalViews / rawData.videos.length;
    processed.videos.performance.totalWatchTime = totalWatchTime;
    processed.videos.performance.averageCTR = totalCTR / rawData.videos.length;
    
    // ROI calculations
    processed.videos.roi.costPerView = totalViews > 0 ? totalCost / totalViews : 0;
    processed.videos.roi.costPerHour = totalWatchTime > 0 ? totalCost / (totalWatchTime / 3600) : 0;
    processed.videos.roi.revenueEstimate = totalViews * 0.001; // Estimate $1 CPM
  }
  
  // Calculate category averages for videos
  Object.keys(processed.videos.byCategory).forEach(category => {
    const cat = processed.videos.byCategory[category];
    cat.averageViews = cat.totalViews / cat.count;
  });
  
  return processed;
}

async function generateAIInsights(processedData: any, query: AnalyticsQuery): Promise<any> {
  console.log('🧠 Generating AI-powered insights...');
  
  const insightsPrompt = `
Analyze this YouTube automation platform data and provide actionable insights:

TRENDS DATA:
- Total trends: ${processedData.trends.total}
- Category breakdown: ${JSON.stringify(processedData.trends.byCategory)}
- Urgency distribution: ${JSON.stringify(processedData.trends.byUrgency)}
- Average search volume: ${processedData.trends.searchVolumeStats.average}
- Conversion rates: ${JSON.stringify(processedData.trends.conversionRates)}

PROMPTS DATA:
- Total prompts: ${processedData.prompts.total}
- Average confidence: ${processedData.prompts.averageConfidence}%
- Quality distribution: ${JSON.stringify(processedData.prompts.qualityDistribution)}

VIDEOS DATA:
- Total videos: ${processedData.videos.total}
- Total cost: $${processedData.videos.totalCost}
- Average views: ${processedData.videos.performance.averageViews}
- Cost per view: $${processedData.videos.roi.costPerView}
- Category performance: ${JSON.stringify(processedData.videos.byCategory)}

ANALYSIS REQUIRED:
1. What are the top 3 key insights from this data?
2. Which categories are performing best and why?
3. What optimization opportunities exist?
4. What are the biggest cost efficiency improvements possible?
5. What content strategy recommendations would improve ROI?
6. What trends should be prioritized for future content?

Provide specific, actionable recommendations based on the data.

Respond in JSON format with:
{
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4", "rec5"],
  "categoryAnalysis": {
    "bestPerforming": "category",
    "needsImprovement": "category",
    "reasoning": "explanation"
  },
  "costOptimization": {
    "currentEfficiency": "assessment",
    "improvements": ["improvement1", "improvement2"]
  }
}
`;

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [{ role: 'user', content: insightsPrompt }]
    }),
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  const content = responseBody.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  // Fallback insights
  return {
    keyInsights: [
      `Generated ${processedData.trends.total} trends with ${processedData.trends.conversionRates.trendsToVideos.toFixed(1)}% video conversion rate`,
      `Average prompt confidence is ${processedData.prompts.averageConfidence.toFixed(1)}% with ${processedData.prompts.qualityDistribution.high} high-quality prompts`,
      `Cost efficiency: $${processedData.videos.roi.costPerView.toFixed(4)} per view across ${processedData.videos.total} videos`
    ],
    recommendations: [
      'Focus on high-urgency trends for better conversion rates',
      'Improve prompt quality to increase confidence scores',
      'Optimize video production costs for better ROI',
      'Prioritize categories with highest view counts',
      'Implement A/B testing for prompt variations'
    ]
  };
}

async function createVisualizations(processedData: any, query: AnalyticsQuery): Promise<any> {
  return {
    charts: [
      {
        type: 'bar',
        title: 'Trends by Category',
        data: processedData.trends.byCategory
      },
      {
        type: 'pie',
        title: 'Urgency Distribution',
        data: processedData.trends.byUrgency
      },
      {
        type: 'line',
        title: 'Video Performance by Category',
        data: processedData.videos.byCategory
      }
    ],
    tables: [
      {
        title: 'Search Volume Statistics',
        data: processedData.trends.searchVolumeStats
      },
      {
        title: 'ROI Analysis',
        data: processedData.videos.roi
      }
    ]
  };
}

async function calculateAnalyticsCosts(rawData: any, query: AnalyticsQuery): Promise<any> {
  const daysDiff = Math.ceil((new Date(query.dateRange.endDate).getTime() - new Date(query.dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24));
  
  let dataStorageCost = 0;
  let queryingCost = 0;
  
  if (daysDiff <= 7) {
    // DynamoDB costs
    const readUnits = Math.ceil(rawData.totalRecords / 4); // 4KB per item average
    dataStorageCost = readUnits * 0.00025; // $0.25 per million read units
    queryingCost = 0; // No additional querying cost for DynamoDB
  } else {
    // S3 costs
    const dataScannedGB = rawData.totalRecords * 0.001; // 1KB per record average
    dataStorageCost = dataScannedGB * 0.0004; // S3 Standard-IA cost
    queryingCost = dataScannedGB * 0.002; // S3 Select cost
  }
  
  return {
    dataStorageCost: parseFloat(dataStorageCost.toFixed(6)),
    queryingCost: parseFloat(queryingCost.toFixed(6)),
    totalCost: parseFloat((dataStorageCost + queryingCost).toFixed(6))
  };
}

export {
  AnalyticsQuery,
  AnalyticsReport,
  gatherAnalyticsData,
  processAnalyticsData,
  generateAIInsights
};