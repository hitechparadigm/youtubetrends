import { Handler, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Local interfaces to avoid import issues
interface TrendData {
  topic: string;
  timestamp: string;
  videoId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementRate: number;
  engagementScore: number;
  keywords: string[];
  categoryId: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  description?: string;
  duration?: string;
  thumbnailUrl?: string;
}

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
  topic: string;
  seoMetadata: {
    description: string;
    tags: string[];
    category: string;
  };
}>> {
  const prompts = [];

  for (const trend of trends) {
    const topicPrompts = getTopicPrompts(topic);
    const enhancedKeywords = await enhanceKeywords(trend.keywords, topic, trend.title);
    const seoKeywords = generateSEOKeywords(enhancedKeywords, topic);
    
    const prompt = topicPrompts.scriptTemplate
      .replace('{topic}', topic)
      .replace('{title}', trend.title)
      .replace('{keywords}', enhancedKeywords.join(', '))
      .replace('{viewCount}', trend.viewCount.toLocaleString())
      .replace('{engagement}', (trend.engagementRate * 100).toFixed(1))
      .replace('{channelTitle}', trend.channelTitle);

    const estimatedLength = calculateEstimatedLength(topic, trend);
    const videoTitle = generateVideoTitle(topic, trend, enhancedKeywords);
    const seoMetadata = generateSEOMetadata(videoTitle, enhancedKeywords, topic, trend);

    prompts.push({
      trendId: trend.videoId,
      title: videoTitle,
      prompt,
      keywords: seoKeywords,
      estimatedLength,
      topic: topic,
      seoMetadata
    });
  }

  return prompts;
}

function getTopicPrompts(topic: string): { scriptTemplate: string; titleTemplate: string } {
  const topicPrompts: Record<string, { scriptTemplate: string; titleTemplate: string }> = {
    investing: {
      scriptTemplate: `Create a comprehensive educational video about {topic} inspired by the trending content "{title}" from {channelTitle}. 
        This video should explain key investment concepts including {keywords} in clear, beginner-friendly language while providing actionable insights.
        
        Structure the video to cover:
        1. Introduction to the trending topic and why it matters for investors
        2. Detailed explanation of {keywords} with real-world examples
        3. Practical investment strategies and portfolio considerations
        4. Risk management and diversification principles
        5. Actionable steps viewers can take immediately
        
        The original content has {viewCount} views with {engagement}% engagement, indicating strong audience interest. 
        Make this educational, trustworthy, and engaging while avoiding financial advice disclaimers. 
        Focus on education and general principles rather than specific investment recommendations.`,
      titleTemplate: 'Essential {topic} Guide: {keywords} Explained for Beginners'
    },
    education: {
      scriptTemplate: `Create an engaging educational video about {topic} based on the trending content "{title}" from {channelTitle}. 
        Focus on learning strategies and study techniques related to {keywords}.
        
        Structure the video to include:
        1. Hook: Why this {topic} knowledge is crucial for success
        2. Core concepts: Detailed explanation of {keywords} with examples
        3. Practical application: Step-by-step implementation strategies
        4. Common mistakes and how to avoid them
        5. Advanced tips for accelerated learning
        6. Call to action for continued learning
        
        The source content has {viewCount} views and {engagement}% engagement. Make it actionable, 
        inspiring, and packed with value that viewers can immediately apply to their learning journey.`,
      titleTemplate: 'Master {topic}: Proven {keywords} Strategies That Work'
    },
    tourism: {
      scriptTemplate: `Create an inspiring travel video about {topic} featuring content inspired by "{title}" from {channelTitle}. 
        Showcase amazing destinations and experiences related to {keywords}.
        
        Structure the video to include:
        1. Captivating introduction to the destination/experience
        2. Visual tour highlighting {keywords} and unique features
        3. Practical travel tips: best times to visit, costs, logistics
        4. Cultural insights and local experiences
        5. Budget-friendly alternatives and money-saving tips
        6. Call to action encouraging viewers to plan their trip
        
        The original content has {viewCount} views with {engagement}% engagement, showing strong travel interest. 
        Make it visually stunning, informative, and inspiring while providing practical value for travelers.`,
      titleTemplate: 'Amazing {topic} Destinations: {keywords} You Must Experience'
    },
    technology: {
      scriptTemplate: `Create a comprehensive technology video about {topic} covering concepts from "{title}" by {channelTitle}. 
        Explain technological innovations related to {keywords} in accessible terms.
        
        Structure the video to cover:
        1. Introduction: What is this technology and why it matters
        2. Technical explanation: How {keywords} work in simple terms
        3. Real-world applications and current use cases
        4. Future implications and emerging trends
        5. How this affects everyday users
        6. What to expect in the coming years
        
        The source has {viewCount} views with {engagement}% engagement. Make complex technology 
        understandable for general audiences while maintaining technical accuracy and providing practical insights.`,
      titleTemplate: 'Latest {topic} Breakthrough: {keywords} Explained Simply'
    },
    health: {
      scriptTemplate: `Create a health and wellness video about {topic} based on "{title}" from {channelTitle}. 
        Provide evidence-based information about {keywords} with practical health advice.
        
        Structure the video to include:
        1. Introduction: The importance of this health topic
        2. Science-backed explanation of {keywords} and their health impacts
        3. Practical implementation: Daily habits and lifestyle changes
        4. Common myths and misconceptions debunked
        5. Step-by-step action plan for viewers
        6. Long-term benefits and motivation for consistency
        
        The original content has {viewCount} views and {engagement}% engagement. Focus on evidence-based 
        information, practical advice, and motivation while encouraging viewers to consult healthcare professionals.`,
      titleTemplate: 'Complete {topic} Guide: {keywords} for Better Health'
    },
    finance: {
      scriptTemplate: `Create a comprehensive finance video about {topic} inspired by "{title}" from {channelTitle}. 
        Cover financial concepts related to {keywords} with practical money management advice.
        
        Structure the video to include:
        1. Financial literacy foundation related to the topic
        2. Detailed explanation of {keywords} and their financial impact
        3. Practical budgeting and money management strategies
        4. Common financial mistakes and how to avoid them
        5. Tools and resources for financial success
        6. Action steps for immediate financial improvement
        
        The source content has {viewCount} views with {engagement}% engagement. Make financial concepts 
        accessible, provide actionable advice, and focus on building financial literacy and confidence.`,
      titleTemplate: 'Master {topic}: Essential {keywords} for Financial Success'
    }
  };

  return topicPrompts[topic.toLowerCase()] || topicPrompts.education;
}

function generateVideoTitle(topic: string, trend: TrendData, keywords: string[]): string {
  const topKeywords = keywords.slice(0, 3);
  const isHighEngagement = trend.engagementScore > 0.05;
  const isHighViews = trend.viewCount > 100000;
  
  const templates = {
    investing: [
      `${topKeywords[0]} Investing Guide: ${topKeywords.slice(1, 3).join(' & ')} Explained`,
      `How to Invest in ${topKeywords[0]}: Complete ${topic} Strategy`,
      `${topKeywords[0]} vs ${topKeywords[1]}: Best ${topic} Choice for 2024`,
      `${isHighViews ? 'Proven' : 'Essential'} ${topic} Strategy: ${topKeywords[0]} Success`,
      `${topKeywords[0]} Investment Guide: ${topic} Tips That Actually Work`
    ],
    education: [
      `Master ${topKeywords[0]}: Complete ${topic} Study Guide`,
      `${topKeywords[0]} Learning Strategy: ${topic} Success in 2024`,
      `How to Learn ${topKeywords[0]}: ${topic} Tips for Fast Results`,
      `${topKeywords[0]} & ${topKeywords[1]}: Ultimate ${topic} Tutorial`,
      `${isHighEngagement ? 'Proven' : 'Essential'} ${topic} Methods: ${topKeywords[0]} Mastery`
    ],
    tourism: [
      `${topKeywords[0]} Travel Guide: Best ${topic} Destinations 2024`,
      `Amazing ${topKeywords[0]} Adventures: ${topic} You Must Experience`,
      `${topKeywords[0]} vs ${topKeywords[1]}: Ultimate ${topic} Comparison`,
      `Hidden ${topKeywords[0]} Gems: ${topic} Secrets Revealed`,
      `${isHighViews ? 'Viral' : 'Trending'} ${topic}: ${topKeywords[0]} Destinations`
    ],
    technology: [
      `${topKeywords[0]} Explained: ${topic} Breakthrough in 2024`,
      `How ${topKeywords[0]} Works: ${topic} Guide for Beginners`,
      `${topKeywords[0]} vs ${topKeywords[1]}: ${topic} Comparison`,
      `Future of ${topKeywords[0]}: ${topic} Trends and Predictions`,
      `${isHighEngagement ? 'Revolutionary' : 'Latest'} ${topic}: ${topKeywords[0]} Impact`
    ],
    health: [
      `${topKeywords[0]} Health Benefits: Complete ${topic} Guide`,
      `How ${topKeywords[0]} Improves ${topic}: Science-Based Facts`,
      `${topKeywords[0]} & ${topKeywords[1]}: ${topic} Combination Guide`,
      `${topKeywords[0]} for Better Health: ${topic} Tips That Work`,
      `${isHighViews ? 'Proven' : 'Essential'} ${topic}: ${topKeywords[0]} Benefits`
    ],
    finance: [
      `${topKeywords[0]} Money Guide: ${topic} Tips for 2024`,
      `How to Save with ${topKeywords[0]}: ${topic} Strategies`,
      `${topKeywords[0]} vs ${topKeywords[1]}: Best ${topic} Choice`,
      `${topKeywords[0]} Budget Guide: ${topic} Success Plan`,
      `${isHighEngagement ? 'Proven' : 'Smart'} ${topic}: ${topKeywords[0]} Tips`
    ]
  };
  
  const topicTemplates = templates[topic.toLowerCase() as keyof typeof templates] || templates.education;
  const selectedTemplate = topicTemplates[Math.floor(Math.random() * topicTemplates.length)];
  
  // Ensure title is under 60 characters for SEO
  return selectedTemplate.length > 60 ? selectedTemplate.substring(0, 57) + '...' : selectedTemplate;
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

async function enhanceKeywords(
  originalKeywords: string[],
  topic: string,
  title: string
): Promise<string[]> {
  // Extract additional keywords from title using better NLP
  const titleKeywords = extractKeywordsFromText(title);
  
  // Combine and deduplicate keywords
  const allKeywords = [...new Set([...originalKeywords, ...titleKeywords])];
  
  // Filter and rank keywords by relevance to topic
  const relevantKeywords = allKeywords
    .filter(keyword => keyword.length > 2)
    .filter(keyword => !isStopWord(keyword))
    .slice(0, 12); // Limit to top 12 keywords

  return relevantKeywords;
}

function extractKeywordsFromText(text: string): string[] {
  // Enhanced keyword extraction with better patterns
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !isStopWord(word))
    .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
    .slice(0, 8);
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'this', 'that', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'
  ]);
  return stopWords.has(word.toLowerCase());
}

function generateSEOKeywords(keywords: string[], topic: string): string[] {
  // Generate SEO-optimized keywords by combining topic with trending keywords
  const seoKeywords = [];
  
  // Add topic-specific keywords
  seoKeywords.push(topic);
  seoKeywords.push(`${topic} guide`);
  seoKeywords.push(`${topic} tips`);
  
  // Add combined keywords
  keywords.slice(0, 5).forEach(keyword => {
    seoKeywords.push(`${keyword} ${topic}`);
    seoKeywords.push(`${topic} ${keyword}`);
  });
  
  // Add original keywords
  seoKeywords.push(...keywords.slice(0, 8));
  
  // Remove duplicates and return top 15
  return [...new Set(seoKeywords)].slice(0, 15);
}

function generateSEOMetadata(
  title: string,
  keywords: string[],
  topic: string,
  trend: TrendData
): {
  description: string;
  tags: string[];
  category: string;
} {
  const description = generateSEODescription(title, keywords, topic, trend);
  const tags = generateSEOTags(keywords, topic);
  const category = mapTopicToYouTubeCategory(topic);
  
  return { description, tags, category };
}

function generateSEODescription(
  title: string,
  keywords: string[],
  topic: string,
  trend: TrendData
): string {
  const templates = {
    investing: `Learn about ${keywords.slice(0, 3).join(', ')} in this comprehensive ${topic} guide. Discover proven strategies and expert insights to improve your investment knowledge. Perfect for beginners and experienced investors alike.`,
    education: `Master ${keywords.slice(0, 3).join(', ')} with this detailed ${topic} tutorial. Get practical tips, study strategies, and actionable advice to accelerate your learning journey.`,
    tourism: `Explore amazing ${keywords.slice(0, 3).join(', ')} destinations in this ${topic} guide. Discover hidden gems, travel tips, and cultural insights for your next adventure.`,
    technology: `Understand ${keywords.slice(0, 3).join(', ')} in this ${topic} explanation. Learn about the latest innovations, practical applications, and future trends in technology.`,
    health: `Improve your health with this ${topic} guide covering ${keywords.slice(0, 3).join(', ')}. Get evidence-based tips, wellness strategies, and practical advice for better living.`,
    finance: `Master ${keywords.slice(0, 3).join(', ')} with this comprehensive ${topic} guide. Learn practical strategies for financial success and wealth building.`
  };
  
  const template = templates[topic.toLowerCase() as keyof typeof templates] || templates.education;
  return template.substring(0, 155); // YouTube description limit
}

function generateSEOTags(keywords: string[], topic: string): string[] {
  const baseTags = [topic, `${topic}guide`, `${topic}tips`, `${topic}tutorial`];
  const keywordTags = keywords.slice(0, 8);
  const combinedTags = keywords.slice(0, 4).map(k => `${k}${topic}`);
  
  return [...baseTags, ...keywordTags, ...combinedTags].slice(0, 15);
}

function mapTopicToYouTubeCategory(topic: string): string {
  const categoryMap: Record<string, string> = {
    investing: '25', // News & Politics (closest for financial content)
    education: '27', // Education
    tourism: '19', // Travel & Events
    technology: '28', // Science & Technology
    health: '26', // Howto & Style (closest for health/wellness)
    finance: '25', // News & Politics
    entertainment: '24' // Entertainment
  };
  
  return categoryMap[topic.toLowerCase()] || '27'; // Default to Education
}

async function storeAnalysisResults(
  topic: string,
  trends: TrendData[],
  prompts: any[]
): Promise<void> {
  // Skip DynamoDB storage if in test mode (table name is 'mock-table')
  if (process.env.CONTENT_ANALYSIS_TABLE === 'mock-table') {
    console.log('Skipping DynamoDB storage in test mode');
    return;
  }

  try {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(client);

    const analysisResult = {
      analysisId: `${topic}_${Date.now()}`,
      topic,
      timestamp: new Date().toISOString(),
      selectedTrends: trends.map(t => t.videoId),
      scriptPrompts: prompts,
      status: 'ready_for_generation',
      analysisMetrics: {
        totalTrendsAnalyzed: trends.length,
        averageEngagementScore: trends.reduce((sum, t) => sum + t.engagementScore, 0) / trends.length,
        topEngagementScore: Math.max(...trends.map(t => t.engagementScore)),
        keywordDiversity: calculateKeywordDiversity(trends)
      }
    };

    await docClient.send(new PutCommand({
      TableName: process.env.CONTENT_ANALYSIS_TABLE || 'ContentAnalysis',
      Item: analysisResult
    }));

    console.log('Analysis results stored successfully', {
      analysisId: analysisResult.analysisId,
      trendsCount: trends.length,
      promptsCount: prompts.length
    });
  } catch (error) {
    console.error('Failed to store analysis results', error);
    // Don't throw - storage failure shouldn't fail the main function
  }
}

function calculateKeywordDiversity(trends: TrendData[]): number {
  const allKeywords = trends.flatMap(t => t.keywords);
  const uniqueKeywords = new Set(allKeywords);
  return allKeywords.length > 0 ? uniqueKeywords.size / allKeywords.length : 0;
}