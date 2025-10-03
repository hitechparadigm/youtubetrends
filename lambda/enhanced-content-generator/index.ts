import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

interface TrendDiscovery {
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

export interface EnhancedContentGeneratorEvent {
  topic: string;
  trendData: TrendDiscovery;
  targetCategory: 'technology' | 'finance' | 'education' | 'health' | 'general';
  duration?: number;
  targetAudience?: string;
  contentStyle?: 'educational' | 'news' | 'analysis' | 'tutorial' | 'entertainment';
}

export interface EnhancedContentGeneratorResponse {
  success: boolean;
  content: {
    title: string;
    script: string;
    visualPrompt: string;
    thumbnailPrompt: string;
    seoOptimization: {
      title: string;
      description: string;
      tags: string[];
      keywords: string[];
    };
    contentStructure: {
      hook: string;
      mainPoints: string[];
      callToAction: string;
    };
  };
  metadata: {
    confidence: number;
    reasoning: string;
    trendRelevance: number;
    generatedAt: string;
  };
  executionTime: number;
  error?: string;
}

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const CLAUDE_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export const handler = async (
  event: APIGatewayProxyEvent | EnhancedContentGeneratorEvent
): Promise<APIGatewayProxyResult | EnhancedContentGeneratorResponse> => {
  const startTime = Date.now();
  
  try {
    // Handle both API Gateway and direct Lambda invocation
    let requestData: EnhancedContentGeneratorEvent;
    
    if ('body' in event) {
      // API Gateway event
      requestData = JSON.parse(event.body || '{}');
    } else {
      // Direct Lambda invocation
      requestData = event as EnhancedContentGeneratorEvent;
    }

    console.log('🚀 Enhanced Content Generator started with dynamic trend data:', {
      topic: requestData.topic,
      trendKeyword: requestData.trendData.keyword,
      searchVolume: requestData.trendData.searchVolume,
      category: requestData.targetCategory,
      urgency: requestData.trendData.metadata.urgency
    });

    // Step 1: Generate dynamic prompts based on real trend data
    const dynamicPrompts = await generateDynamicPrompts(requestData);
    
    // Step 2: Create enhanced content using the dynamic prompts
    const enhancedContent = await createEnhancedContent(requestData, dynamicPrompts);
    
    // Step 3: Validate content quality and relevance
    const qualityScore = await validateContentQuality(enhancedContent, requestData.trendData);
    
    const executionTime = Date.now() - startTime;
    
    const response: EnhancedContentGeneratorResponse = {
      success: true,
      content: enhancedContent,
      metadata: {
        confidence: qualityScore.confidence,
        reasoning: qualityScore.reasoning,
        trendRelevance: qualityScore.trendRelevance,
        generatedAt: new Date().toISOString()
      },
      executionTime
    };

    console.log(`✅ Enhanced content generated successfully in ${executionTime}ms with ${qualityScore.confidence}% confidence`);

    // Return appropriate response format
    if ('body' in event) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(response)
      };
    } else {
      return response;
    }

  } catch (error) {
    console.error('❌ Enhanced content generation failed:', error);
    
    const errorResponse = {
      success: false,
      content: null as any,
      metadata: {
        confidence: 0,
        reasoning: 'Content generation failed',
        trendRelevance: 0,
        generatedAt: new Date().toISOString()
      },
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    if ('body' in event) {
      return {
        statusCode: 500,
        body: JSON.stringify(errorResponse)
      };
    } else {
      return errorResponse;
    }
  }
};

async function generateDynamicPrompts(request: EnhancedContentGeneratorEvent): Promise<any> {
  console.log('🧠 Generating dynamic prompts based on trend discovery...');
  
  try {
    // Invoke the dynamic prompt generator
    const promptRequest = {
      trendDiscovery: {
        trendId: `trend-${Date.now()}`,
        ...request.trendData
      },
      targetCategory: request.targetCategory,
      contentType: 'video',
      duration: request.duration || 30,
      audience: request.targetAudience
    };

    const invokeCommand = new InvokeCommand({
      FunctionName: 'youtube-automation-dynamic-prompt-generator',
      Payload: JSON.stringify(promptRequest)
    });

    const response = await lambdaClient.send(invokeCommand);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.errorMessage) {
      throw new Error(`Dynamic prompt generation failed: ${result.errorMessage}`);
    }
    
    console.log('✅ Dynamic prompts generated successfully');
    return result;
    
  } catch (error) {
    console.error('⚠️ Dynamic prompt generation failed, using fallback approach:', error);
    
    // Fallback: Generate prompts directly using Claude
    return await generateFallbackPrompts(request);
  }
}

async function generateFallbackPrompts(request: EnhancedContentGeneratorEvent): Promise<any> {
  const { trendData, targetCategory, duration = 30 } = request;
  
  const fallbackPrompt = `
Generate specific, actionable content prompts for this REAL trending topic:

TREND DATA:
- Keyword: "${trendData.keyword}"
- Search Volume: ${trendData.searchVolume}
- Category: ${targetCategory}
- Related Terms: ${trendData.relatedTerms.join(', ')}
- Urgency: ${trendData.metadata.urgency}
- Context: ${JSON.stringify(trendData.context)}

REQUIREMENTS:
1. Create content that addresses what people are ACTUALLY searching for about "${trendData.keyword}"
2. Include specific, current information - not generic trend coverage
3. Focus on actionable insights and real value
4. Duration: ${duration} seconds

Generate:
1. Video prompt for AI generation (specific visuals for this trend)
2. Thumbnail prompt (eye-catching, trend-specific)
3. SEO-optimized title and description
4. Content structure with hook, main points, CTA

Respond in JSON format with videoPrompt, thumbnailPrompt, seoPrompts, and contentStructure.
`;

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [{ role: 'user', content: fallbackPrompt }]
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
  
  throw new Error('Failed to generate fallback prompts');
}

async function createEnhancedContent(
  request: EnhancedContentGeneratorEvent, 
  dynamicPrompts: any
): Promise<any> {
  
  const { trendData, targetCategory, duration = 30 } = request;
  
  const contentGenerationPrompt = `
Create comprehensive video content for this trending topic using the dynamic prompts:

TREND: ${trendData.keyword}
SEARCH VOLUME: ${trendData.searchVolume}
CATEGORY: ${targetCategory}
DURATION: ${duration} seconds
URGENCY: ${trendData.metadata.urgency}

DYNAMIC PROMPTS:
${JSON.stringify(dynamicPrompts, null, 2)}

CURRENT CONTEXT:
- Related searches: ${trendData.relatedTerms.join(', ')}
- News context: ${trendData.context.newsArticles?.join('; ') || 'No recent news'}
- Market data: ${JSON.stringify(trendData.context.marketData || {})}

CREATE SPECIFIC CONTENT:

1. TITLE: Create a compelling, SEO-optimized title that captures the current significance of this trend

2. SCRIPT: Write a ${duration}-second video script that:
   - Opens with a hook about the current development/significance
   - Provides specific, actionable information (not generic trend coverage)
   - Includes real data points or insights where available
   - Ends with a relevant call-to-action
   - Uses natural, conversational language suitable for AI voice synthesis

3. VISUAL PROMPT: Detailed prompt for AI video generation that will create relevant, current visuals

4. THUMBNAIL PROMPT: Specific prompt for thumbnail generation that reflects the trend's current context

5. SEO OPTIMIZATION:
   - Meta description that addresses current search intent
   - Tags that reflect actual related searches
   - Keywords based on current search patterns

6. CONTENT STRUCTURE:
   - Hook that captures immediate attention with current relevance
   - 3-5 main points with specific, actionable information
   - Call-to-action relevant to the trend momentum

REQUIREMENTS:
- All content must be SPECIFIC to the current trend context
- Include actual insights, not just trend acknowledgment
- Ensure the script flows naturally for AI voice synthesis
- Make content genuinely valuable to someone searching for this trend
- Avoid generic phrases - be specific about current developments

Respond in JSON format matching the expected content structure.
`;

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 3000,
      messages: [{ role: 'user', content: contentGenerationPrompt }]
    }),
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  const content = responseBody.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse enhanced content from Claude response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function validateContentQuality(content: any, trendData: TrendDiscovery): Promise<any> {
  // Calculate quality metrics
  let confidence = 70; // Base confidence
  let trendRelevance = 50; // Base relevance
  
  // Check for trend keyword presence
  const keywordPresent = content.script?.toLowerCase().includes(trendData.keyword.toLowerCase());
  if (keywordPresent) {
    confidence += 15;
    trendRelevance += 20;
  }
  
  // Check for related terms
  const relatedTermsCount = trendData.relatedTerms.filter(term => 
    content.script?.toLowerCase().includes(term.toLowerCase())
  ).length;
  
  confidence += Math.min(relatedTermsCount * 5, 15);
  trendRelevance += Math.min(relatedTermsCount * 10, 30);
  
  // Check content length appropriateness
  if (content.script && content.script.length > 100 && content.script.length < 1000) {
    confidence += 10;
  }
  
  // Check for specific information (not generic)
  const hasSpecificInfo = content.script && (
    content.script.includes('2025') || 
    content.script.includes('recent') || 
    content.script.includes('new') ||
    /\d+/.test(content.script) // Contains numbers/data
  );
  
  if (hasSpecificInfo) {
    confidence += 10;
    trendRelevance += 15;
  }
  
  return {
    confidence: Math.min(confidence, 95),
    trendRelevance: Math.min(trendRelevance, 95),
    reasoning: `Content validated with ${keywordPresent ? 'keyword match' : 'no keyword match'}, ${relatedTermsCount} related terms, ${hasSpecificInfo ? 'specific information' : 'generic content'}`
  };
}

// Export for testing and integration
export {
  generateDynamicPrompts,
  createEnhancedContent,
  validateContentQuality,
  TrendDiscovery
};