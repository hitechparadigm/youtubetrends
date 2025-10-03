import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

interface TrendDiscovery {
  trendId: string;
  keyword: string;
  searchVolume: number;
  category: string;
  relatedTerms: string[];
  context: {
    newsArticles?: string[];
    socialMentions?: string[];
    marketData?: any;
    timeframe: string;
    geography: string;
  };
  metadata: {
    discoveredAt: string;
    confidence: number;
    urgency: 'low' | 'medium' | 'high';
  };
}

interface DynamicPromptRequest {
  trendDiscovery: TrendDiscovery;
  targetCategory: 'technology' | 'finance' | 'education' | 'health' | 'general';
  contentType: 'video' | 'thumbnail' | 'seo';
  duration?: number;
  audience?: string;
}

interface GeneratedPrompt {
  videoPrompt: string;
  thumbnailPrompt: string;
  seoPrompts: {
    title: string;
    description: string;
    tags: string[];
  };
  contentStructure: {
    hook: string;
    mainPoints: string[];
    callToAction: string;
  };
  confidence: number;
  reasoning: string;
}

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const CLAUDE_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const PROMPTS_TABLE = process.env.PROMPTS_TABLE || 'youtube-automation-dynamic-prompts';

export const handler = async (event: DynamicPromptRequest): Promise<GeneratedPrompt> => {
  console.log('🧠 Generating dynamic prompts for trend:', event.trendDiscovery.keyword);

  try {
    // Step 1: Analyze the trend discovery for context
    const trendAnalysis = await analyzeTrendContext(event.trendDiscovery);
    
    // Step 2: Generate category-specific prompts
    const prompts = await generateCategoryPrompts(event, trendAnalysis);
    
    // Step 3: Cache the generated prompts for reuse
    await cacheGeneratedPrompts(event.trendDiscovery.trendId, prompts);
    
    console.log(`✅ Dynamic prompts generated with ${prompts.confidence}% confidence`);
    return prompts;

  } catch (error) {
    console.error('❌ Dynamic prompt generation failed:', error);
    throw error;
  }
};

async function analyzeTrendContext(trend: TrendDiscovery): Promise<any> {
  const analysisPrompt = `
Analyze this trending topic for content creation:

TREND DATA:
- Keyword: "${trend.keyword}"
- Search Volume: ${trend.searchVolume}
- Category: ${trend.category}
- Related Terms: ${trend.relatedTerms.join(', ')}
- Context: ${JSON.stringify(trend.context, null, 2)}
- Urgency: ${trend.metadata.urgency}

ANALYSIS REQUIRED:
1. What makes this trend significant RIGHT NOW?
2. What specific angle would provide the most value to viewers?
3. What are the key facts, data points, or insights people need to know?
4. What questions are people asking about this trend?
5. What actionable information can we provide?
6. How can we make this content unique and valuable (not just generic trend coverage)?

Provide a detailed analysis focusing on SPECIFIC, ACTIONABLE content opportunities.
`;

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: analysisPrompt
        }
      ]
    }),
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return {
    analysis: responseBody.content[0].text,
    timestamp: new Date().toISOString()
  };
}

async function generateCategoryPrompts(
  request: DynamicPromptRequest, 
  analysis: any
): Promise<GeneratedPrompt> {
  
  const { trendDiscovery, targetCategory, duration = 30 } = request;
  
  const promptGenerationRequest = `
Based on this trend analysis, generate specific, actionable content prompts:

TREND: ${trendDiscovery.keyword}
CATEGORY: ${targetCategory}
DURATION: ${duration} seconds
ANALYSIS: ${analysis.analysis}

CURRENT CONTEXT:
- Search Volume: ${trendDiscovery.searchVolume}
- Related Terms: ${trendDiscovery.relatedTerms.join(', ')}
- News Context: ${trendDiscovery.context.newsArticles?.slice(0, 3).join('; ') || 'No recent news'}
- Geographic Focus: ${trendDiscovery.context.geography}
- Time Sensitivity: ${trendDiscovery.metadata.urgency}

GENERATE SPECIFIC PROMPTS FOR:

1. VIDEO GENERATION PROMPT:
Create a detailed, specific prompt for AI video generation that will produce relevant visuals for "${trendDiscovery.keyword}". 
Include:
- Specific visual elements related to the current trend context
- Style appropriate for ${targetCategory} content
- Visual storytelling that matches the ${duration}-second duration
- Current, relevant imagery (not generic stock footage concepts)

2. THUMBNAIL GENERATION PROMPT:
Create a specific prompt for thumbnail generation that:
- Captures the current significance of this trend
- Uses visual elements that reflect the actual trend context
- Appeals to ${targetCategory} audience
- Stands out in YouTube search results for "${trendDiscovery.keyword}"

3. SEO OPTIMIZATION:
Based on current search patterns and trend context:
- Title that captures the specific angle/value proposition
- Description that addresses what people are actually searching for
- Tags that reflect current related searches and context

4. CONTENT STRUCTURE:
- Hook: What specific current development/insight will grab attention immediately?
- Main Points: 3-5 specific, actionable points based on the trend analysis
- Call to Action: Relevant to the current trend momentum

REQUIREMENTS:
- All prompts must be SPECIFIC to the current trend context, not generic templates
- Include actual data points, recent developments, or specific insights where available
- Avoid generic phrases like "latest trends" - be specific about what makes this trend significant NOW
- Ensure content provides genuine value, not just trend coverage

Respond in JSON format with the structure matching the GeneratedPrompt interface.
`;

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: promptGenerationRequest
        }
      ]
    }),
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  try {
    // Extract JSON from Claude's response
    const content = responseBody.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const generatedPrompts = JSON.parse(jsonMatch[0]);
    
    // Add confidence score based on trend data quality
    const confidence = calculateConfidence(trendDiscovery, analysis);
    
    return {
      ...generatedPrompts,
      confidence,
      reasoning: `Generated based on ${trendDiscovery.searchVolume} search volume, ${trendDiscovery.relatedTerms.length} related terms, and ${trendDiscovery.metadata.urgency} urgency trend data.`
    };
    
  } catch (parseError) {
    console.error('Failed to parse Claude response:', parseError);
    
    // Fallback: create structured prompts from the raw analysis
    return createFallbackPrompts(request, analysis);
  }
}

function calculateConfidence(trend: TrendDiscovery, analysis: any): number {
  let confidence = 50; // Base confidence
  
  // Increase confidence based on data quality
  if (trend.searchVolume > 10000) confidence += 20;
  if (trend.relatedTerms.length > 5) confidence += 10;
  if (trend.context.newsArticles && trend.context.newsArticles.length > 0) confidence += 15;
  if (trend.metadata.urgency === 'high') confidence += 10;
  if (trend.metadata.confidence > 0.8) confidence += 15;
  
  return Math.min(confidence, 95); // Cap at 95%
}

function createFallbackPrompts(request: DynamicPromptRequest, analysis: any): GeneratedPrompt {
  const { trendDiscovery, targetCategory } = request;
  
  return {
    videoPrompt: `Create a ${targetCategory} video about "${trendDiscovery.keyword}" focusing on current developments and practical implications. Show relevant visuals that reflect the current context and significance of this trend. Style: professional ${targetCategory} content with current, specific imagery.`,
    
    thumbnailPrompt: `Create a ${targetCategory} thumbnail for "${trendDiscovery.keyword}" that captures the current significance and appeals to people actively searching for this trend. Use visual elements that reflect the specific context and current relevance.`,
    
    seoPrompts: {
      title: `${trendDiscovery.keyword} - What You Need to Know in 2025`,
      description: `Discover the latest developments in ${trendDiscovery.keyword}. Get specific insights, current data, and actionable information about this trending topic.`,
      tags: [trendDiscovery.keyword, ...trendDiscovery.relatedTerms.slice(0, 8), targetCategory, '2025']
    },
    
    contentStructure: {
      hook: `Here's what's happening with ${trendDiscovery.keyword} right now...`,
      mainPoints: [
        `Current significance of ${trendDiscovery.keyword}`,
        `Key developments and data points`,
        `What this means for you`,
        `Actionable next steps`
      ],
      callToAction: `Stay updated on ${trendDiscovery.keyword} trends - subscribe for more insights!`
    },
    
    confidence: 60,
    reasoning: 'Fallback prompts generated due to parsing issues with AI response'
  };
}

async function cacheGeneratedPrompts(trendId: string, prompts: GeneratedPrompt): Promise<void> {
  try {
    const command = new PutItemCommand({
      TableName: PROMPTS_TABLE,
      Item: {
        trendId: { S: trendId },
        prompts: { S: JSON.stringify(prompts) },
        generatedAt: { S: new Date().toISOString() },
        ttl: { N: Math.floor(Date.now() / 1000) + (24 * 60 * 60) } // 24 hour TTL
      }
    });
    
    await dynamoClient.send(command);
    console.log(`📝 Cached dynamic prompts for trend: ${trendId}`);
    
  } catch (error) {
    console.error('Failed to cache prompts:', error);
    // Non-critical error, continue without caching
  }
}

// Enhanced trend discovery integration
export async function generatePromptsFromTrendData(
  keyword: string,
  searchVolume: number,
  relatedTerms: string[],
  category: string,
  newsContext?: string[],
  marketData?: any
): Promise<GeneratedPrompt> {
  
  const trendDiscovery: TrendDiscovery = {
    trendId: `trend-${Date.now()}-${keyword.replace(/\s+/g, '-')}`,
    keyword,
    searchVolume,
    category,
    relatedTerms,
    context: {
      newsArticles: newsContext || [],
      timeframe: 'current',
      geography: 'global'
    },
    metadata: {
      discoveredAt: new Date().toISOString(),
      confidence: searchVolume > 10000 ? 0.9 : 0.7,
      urgency: searchVolume > 50000 ? 'high' : searchVolume > 10000 ? 'medium' : 'low'
    }
  };

  const request: DynamicPromptRequest = {
    trendDiscovery,
    targetCategory: category as any,
    contentType: 'video',
    duration: 30
  };

  return await handler(request);
}

// Real-time trend integration
export async function generatePromptsFromLiveTrends(): Promise<GeneratedPrompt[]> {
  console.log('🔍 Fetching live trends for dynamic prompt generation...');
  
  // This would integrate with Google Trends API, Twitter API, etc.
  // For now, simulate with current trending topics
  
  const liveTrends = [
    {
      keyword: 'AI regulation 2025',
      searchVolume: 45000,
      category: 'technology',
      relatedTerms: ['AI safety', 'government regulation', 'tech policy', 'artificial intelligence laws'],
      newsContext: ['New AI safety regulations proposed', 'Tech companies respond to AI oversight']
    },
    {
      keyword: 'cryptocurrency ETF approval',
      searchVolume: 67000,
      category: 'finance',
      relatedTerms: ['Bitcoin ETF', 'SEC approval', 'crypto investment', 'institutional adoption'],
      newsContext: ['Major crypto ETF gets regulatory approval', 'Institutional investors enter crypto market']
    }
  ];

  const prompts: GeneratedPrompt[] = [];
  
  for (const trend of liveTrends) {
    try {
      const generatedPrompt = await generatePromptsFromTrendData(
        trend.keyword,
        trend.searchVolume,
        trend.relatedTerms,
        trend.category,
        trend.newsContext
      );
      
      prompts.push(generatedPrompt);
      
    } catch (error) {
      console.error(`Failed to generate prompts for ${trend.keyword}:`, error);
    }
  }
  
  return prompts;
}

export { TrendDiscovery, DynamicPromptRequest, GeneratedPrompt };