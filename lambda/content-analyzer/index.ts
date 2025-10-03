import { Handler, Context } from 'aws-lambda';
import { TrendRepository } from '../../src/repositories/trend-repository';
import { TrendData } from '../../src/models/trend-data';

export interface ContentAnalyzerEvent {
  topic: string;
  trendsData: TrendData[];
  maxVideos?: number;
  minEngagementScore?: number;
}

export interface ContentAnalyzerResponse {
  success: boolean;
  topic: string;
  selectedTrends: TrendData[];
  scriptPrompts: Array<{
    trendId: string;
    title: string;
    prompt: string;
    keywords: string[];
    estimatedLength: number;
  }>;
  executionTime: number;
  error?: string;
}

export const handler: Handler<ContentAnalyzerEvent, ContentAnalyzerResponse> = async (
  event: ContentAnalyzerEvent,
  context: Context
): Promise<ContentAnalyzerResponse> => {
  const startTime = Date.now();
  
  console.log('Content Analyzer Lambda started', {
    requestId: context.awsRequestId,
    topic: event.topic,
    trendsCount: event.trendsData?.length || 0
  });

  try {
    const trendRepository = new TrendRepository({
      region: process.env.AWS_REGION
    });

    // Analyze and filter trends
    const selectedTrends = await analyzeTrends(
      event.trendsData,
      event.minEngagementScore || 0.02,
      event.maxVideos || 3
    );

    console.log(`Selected ${selectedTrends.length} trends for content generation`);

    // Generate script prompts for each selected trend
    const scriptPrompts = await generateScriptPrompts(event.topic, selectedTrends);

    // Store analysis results
    await storeAnalysisResults(event.topic, selectedTrends, scriptPrompts);

    console.log('Content analysis completed successfully', {
      topic: event.topic,
      selectedTrends: selectedTrends.length,
      scriptPrompts: scriptPrompts.length,
      executionTime: Date.now() - startTime
    });

    return {
      success: true,
      topic: event.topic,
      selectedTrends,
      scriptPrompts,
      executionTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Content analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId
    });

    return {
      success: false,
      topic: event.topic,
      selectedTrends: [],
      scriptPrompts: [],
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function analyzeTrends(
  trends: TrendData[],
  minEngagementScore: number,
  maxVideos: number
): Promise<TrendData[]> {
  // Filter trends based on engagement score and recency
  const filteredTrends = trends.filter(trend => {
    const isRecentEnough = isWithinHours(trend.timestamp, 48); // Within 48 hours
    const hasGoodEngagement = trend.engagementScore >= minEngagementScore;
    const hasMinimumViews = trend.viewCount >= 1000;
    
    return isRecentEnough && hasGoodEngagement && hasMinimumViews;
  });

  // Sort by engagement score and recency
  const sortedTrends = filteredTrends.sort((a, b) => {
    const scoreA = calculateTrendScore(a);
    const scoreB = calculateTrendScore(b);
    return scoreB - scoreA;
  });

  // Return top trends up to maxVideos limit
  return sortedTrends.slice(0, maxVideos);
}

function calculateTrendScore(trend: TrendData): number {
  const recencyScore = getRecencyScore(trend.timestamp);
  const engagementScore = trend.engagementScore * 100;
  const viewScore = Math.log10(trend.viewCount) / 10;
  
  return (engagementScore * 0.5) + (recencyScore * 0.3) + (viewScore * 0.2);
}

function getRecencyScore(timestamp: string): number {
  const trendTime = new Date(timestamp).getTime();
  const now = Date.now();
  const hoursAgo = (now - trendTime) / (1000 * 60 * 60);
  
  // Score decreases as content gets older
  if (hoursAgo <= 6) return 1.0;
  if (hoursAgo <= 12) return 0.8;
  if (hoursAgo <= 24) return 0.6;
  if (hoursAgo <= 48) return 0.4;
  return 0.2;
}

function isWithinHours(timestamp: string, hours: number): boolean {
  const trendTime = new Date(timestamp).getTime();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  return trendTime >= cutoff;
}

async function generateScriptPrompts(
  topic: string,
  trends: TrendData[]
): Promise<Array<{
  trendId: string;
  title: string;
  prompt: string;
  keywords: string[];
  estimatedLength: number;
}>> {
  const prompts = [];

  for (const trend of trends) {
    const topicPrompts = getTopicPrompts(topic);
    const keywords = [...trend.keywords].slice(0, 8); // Limit keywords
    
    const prompt = topicPrompts.scriptTemplate
      .replace('{topic}', topic)
      .replace('{title}', trend.title)
      .replace('{keywords}', keywords.join(', '))
      .replace('{viewCount}', trend.viewCount.toLocaleString())
      .replace('{engagement}', (trend.engagementRate * 100).toFixed(1));

    const estimatedLength = calculateEstimatedLength(topic, trend);

    prompts.push({
      trendId: trend.videoId,
      title: generateVideoTitle(topic, trend, keywords),
      prompt,
      keywords,
      estimatedLength
    });
  }

  return prompts;
}

function getTopicPrompts(topic: string): { scriptTemplate: string; titleTemplate: string } {
  const topicPrompts: Record<string, { scriptTemplate: string; titleTemplate: string }> = {
    investing: {
      scriptTemplate: `Create an educational video about {topic} focusing on "{title}". 
        Explain key investment concepts including {keywords} in simple, beginner-friendly terms. 
        Include practical examples and actionable advice. Discuss specific investment vehicles like ETFs, 
        stocks, bonds, and portfolio diversification strategies. This video has {viewCount} views and 
        {engagement}% engagement, showing strong interest in this topic. Make it informative yet engaging.`,
      titleTemplate: 'Essential {topic} Guide: {keywords} Explained for Beginners'
    },
    education: {
      scriptTemplate: `Create an engaging educational video about {topic} based on "{title}". 
        Cover learning strategies and study techniques related to {keywords}. Include practical tips 
        for academic success, productivity methods, and skill development. This trending topic has 
        {viewCount} views with {engagement}% engagement. Make it actionable and inspiring for learners.`,
      titleTemplate: 'Master {topic}: Proven {keywords} Strategies That Work'
    },
    tourism: {
      scriptTemplate: `Create an inspiring travel video about {topic} featuring "{title}". 
        Showcase amazing destinations and experiences related to {keywords}. Include practical travel 
        tips, cultural insights, and budget-friendly advice. This popular content has {viewCount} views 
        and {engagement}% engagement. Make it visually engaging and informative for travelers.`,
      titleTemplate: 'Amazing {topic} Destinations: {keywords} You Must Experience'
    },
    technology: {
      scriptTemplate: `Create a tech-focused video about {topic} covering "{title}". 
        Explain technological concepts and innovations related to {keywords} in accessible terms. 
        Include practical applications, future trends, and how this technology impacts daily life. 
        This trending tech topic has {viewCount} views with {engagement}% engagement.`,
      titleTemplate: 'Latest {topic} Breakthrough: {keywords} Explained Simply'
    },
    health: {
      scriptTemplate: `Create a health and wellness video about {topic} based on "{title}". 
        Provide evidence-based information about {keywords} with practical health tips and lifestyle advice. 
        Include actionable steps for better health and wellness. This health topic has {viewCount} views 
        and {engagement}% engagement, showing strong interest in wellness content.`,
      titleTemplate: 'Complete {topic} Guide: {keywords} for Better Health'
    }
  };

  return topicPrompts[topic.toLowerCase()] || topicPrompts.education;
}

function generateVideoTitle(topic: string, trend: TrendData, keywords: string[]): string {
  const templates = [
    `${keywords.slice(0, 2).join(' & ')} in ${topic}: What You Need to Know`,
    `The Ultimate ${topic} Guide: ${keywords[0]} Explained`,
    `${trend.viewCount > 100000 ? 'Viral' : 'Trending'} ${topic}: ${keywords.slice(0, 3).join(', ')}`,
    `${topic} Secrets: ${keywords[0]} Tips That Actually Work`,
    `Why Everyone's Talking About ${keywords[0]} in ${topic}`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function calculateEstimatedLength(topic: string, trend: TrendData): number {
  // Base length in seconds
  let baseLength = 480; // 8 minutes default

  // Adjust based on topic complexity
  const topicMultipliers: Record<string, number> = {
    investing: 1.2, // More complex, longer videos
    education: 1.1,
    technology: 1.0,
    tourism: 0.9, // More visual, can be shorter
    health: 1.0
  };

  const multiplier = topicMultipliers[topic.toLowerCase()] || 1.0;
  
  // Adjust based on engagement (higher engagement = longer content works)
  const engagementMultiplier = Math.min(1.3, 0.8 + (trend.engagementScore * 10));
  
  return Math.round(baseLength * multiplier * engagementMultiplier);
}

async function storeAnalysisResults(
  topic: string,
  trends: TrendData[],
  prompts: any[]
): Promise<void> {
  try {
    // Store analysis results in DynamoDB for later use
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(client);

    const analysisResult = {
      analysisId: `${topic}_${Date.now()}`,
      topic,
      timestamp: new Date().toISOString(),
      selectedTrends: trends.map(t => t.videoId),
      scriptPrompts: prompts,
      status: 'ready_for_generation'
    };

    await docClient.send(new PutCommand({
      TableName: process.env.CONTENT_ANALYSIS_TABLE || 'ContentAnalysis',
      Item: analysisResult
    }));

    console.log('Analysis results stored successfully');
  } catch (error) {
    console.error('Failed to store analysis results', error);
    // Don't throw - storage failure shouldn't fail the main function
  }
}