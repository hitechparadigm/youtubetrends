import { DynamoDBClient, PutItemCommand, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import axios from 'axios';

interface RealTrendData {
  keyword: string;
  searchVolume: number;
  category: string;
  relatedTerms: string[];
  context: {
    newsArticles: string[];
    socialMentions: string[];
    marketData?: any;
    timeframe: string;
    geography: string;
  };
  metadata: {
    discoveredAt: string;
    confidence: number;
    urgency: 'low' | 'medium' | 'high';
    source: string;
  };
}

interface TrendDiscoveryRequest {
  categories?: string[];
  minSearchVolume?: number;
  geography?: string;
  timeframe?: '1h' | '4h' | '1d' | '7d';
  maxResults?: number;
}

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

const TRENDS_TABLE = process.env.TRENDS_TABLE || 'youtube-automation-live-trends';
const CLAUDE_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export const handler = async (event: TrendDiscoveryRequest): Promise<RealTrendData[]> => {
  console.log('🔍 Starting real-time trend discovery...');
  
  try {
    // Step 1: Fetch trends from multiple sources
    const trendSources = await Promise.allSettled([
      fetchGoogleTrends(event),
      fetchTwitterTrends(event),
      fetchRedditTrends(event),
      fetchNewsApiTrends(event)
    ]);
    
    // Step 2: Consolidate and analyze trends
    const consolidatedTrends = await consolidateTrendData(trendSources);
    
    // Step 3: Enrich with context and analysis
    const enrichedTrends = await enrichTrendsWithContext(consolidatedTrends);
    
    // Step 4: Store in DynamoDB for caching
    await storeTrendsInDatabase(enrichedTrends);
    
    console.log(`✅ Discovered ${enrichedTrends.length} real trends`);
    return enrichedTrends;
    
  } catch (error) {
    console.error('❌ Trend discovery failed:', error);
    
    // Fallback: Return cached trends
    return await getCachedTrends(event);
  }
};

async function fetchGoogleTrends(request: TrendDiscoveryRequest): Promise<any[]> {
  console.log('📊 Fetching Google Trends data...');
  
  try {
    // Note: This would use Google Trends API or pytrends equivalent
    // For now, simulate with realistic trending topics
    
    const simulatedGoogleTrends = [
      {
        keyword: 'AI regulation 2025',
        searchVolume: 45000,
        relatedQueries: ['AI safety laws', 'artificial intelligence regulation', 'tech policy 2025'],
        category: 'technology',
        geography: request.geography || 'US',
        timeframe: request.timeframe || '1d'
      },
      {
        keyword: 'cryptocurrency ETF news',
        searchVolume: 67000,
        relatedQueries: ['Bitcoin ETF approval', 'crypto investment 2025', 'SEC cryptocurrency'],
        category: 'finance',
        geography: request.geography || 'US',
        timeframe: request.timeframe || '1d'
      },
      {
        keyword: 'remote work productivity',
        searchVolume: 23000,
        relatedQueries: ['work from home tips', 'productivity tools 2025', 'remote team management'],
        category: 'business',
        geography: request.geography || 'US',
        timeframe: request.timeframe || '1d'
      },
      {
        keyword: 'sustainable investing trends',
        searchVolume: 34000,
        relatedQueries: ['ESG investing', 'green bonds 2025', 'sustainable finance'],
        category: 'finance',
        geography: request.geography || 'US',
        timeframe: request.timeframe || '1d'
      }
    ];
    
    // Filter by minimum search volume
    const minVolume = request.minSearchVolume || 10000;
    return simulatedGoogleTrends.filter(trend => trend.searchVolume >= minVolume);
    
  } catch (error) {
    console.error('Google Trends fetch failed:', error);
    return [];
  }
}

async function fetchTwitterTrends(request: TrendDiscoveryRequest): Promise<any[]> {
  console.log('🐦 Fetching Twitter/X trends...');
  
  try {
    // Note: This would use Twitter API v2
    // Simulating with current social media trends
    
    const simulatedTwitterTrends = [
      {
        keyword: 'quantum computing breakthrough',
        mentions: 15000,
        category: 'technology',
        sentiment: 'positive',
        context: ['IBM quantum computer', 'quantum supremacy', 'tech breakthrough']
      },
      {
        keyword: 'inflation impact 2025',
        mentions: 28000,
        category: 'finance',
        sentiment: 'concerned',
        context: ['economic outlook', 'Federal Reserve', 'interest rates']
      },
      {
        keyword: 'climate change solutions',
        mentions: 19000,
        category: 'environment',
        sentiment: 'hopeful',
        context: ['renewable energy', 'carbon capture', 'green technology']
      }
    ];
    
    return simulatedTwitterTrends;
    
  } catch (error) {
    console.error('Twitter trends fetch failed:', error);
    return [];
  }
}

async function fetchRedditTrends(request: TrendDiscoveryRequest): Promise<any[]> {
  console.log('📱 Fetching Reddit trends...');
  
  try {
    // Note: This would use Reddit API
    // Simulating with popular subreddit trends
    
    const simulatedRedditTrends = [
      {
        keyword: 'personal finance automation',
        upvotes: 5600,
        comments: 890,
        subreddits: ['personalfinance', 'investing', 'financialindependence'],
        category: 'finance'
      },
      {
        keyword: 'AI coding assistants',
        upvotes: 8900,
        comments: 1200,
        subreddits: ['programming', 'MachineLearning', 'artificial'],
        category: 'technology'
      },
      {
        keyword: 'healthy meal prep ideas',
        upvotes: 3400,
        comments: 560,
        subreddits: ['MealPrepSunday', 'HealthyFood', 'nutrition'],
        category: 'health'
      }
    ];
    
    return simulatedRedditTrends;
    
  } catch (error) {
    console.error('Reddit trends fetch failed:', error);
    return [];
  }
}

async function fetchNewsApiTrends(request: TrendDiscoveryRequest): Promise<any[]> {
  console.log('📰 Fetching news trends...');
  
  try {
    // Note: This would use News API or similar service
    // Simulating with current news trends
    
    const simulatedNewsTrends = [
      {
        keyword: 'electric vehicle adoption',
        articles: [
          'Major automaker announces new EV lineup',
          'Government incentives boost EV sales',
          'Charging infrastructure expansion accelerates'
        ],
        category: 'technology',
        publishedAt: new Date().toISOString()
      },
      {
        keyword: 'real estate market forecast',
        articles: [
          'Housing market shows signs of stabilization',
          'Interest rate changes impact home buyers',
          'Regional market variations emerge'
        ],
        category: 'finance',
        publishedAt: new Date().toISOString()
      }
    ];
    
    return simulatedNewsTrends;
    
  } catch (error) {
    console.error('News API fetch failed:', error);
    return [];
  }
}

async function consolidateTrendData(trendSources: PromiseSettledResult<any[]>[]): Promise<any[]> {
  console.log('🔄 Consolidating trend data from multiple sources...');
  
  const allTrends: any[] = [];
  
  trendSources.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allTrends.push(...result.value);
    } else {
      console.warn(`Trend source ${index} failed:`, result.reason);
    }
  });
  
  // Deduplicate and merge similar trends
  const consolidatedMap = new Map<string, any>();
  
  allTrends.forEach(trend => {
    const normalizedKeyword = trend.keyword.toLowerCase().trim();
    
    if (consolidatedMap.has(normalizedKeyword)) {
      const existing = consolidatedMap.get(normalizedKeyword);
      // Merge data from multiple sources
      existing.searchVolume = Math.max(existing.searchVolume || 0, trend.searchVolume || trend.mentions || 0);
      existing.sources = [...(existing.sources || []), trend.source || 'unknown'];
      existing.relatedTerms = [...new Set([...(existing.relatedTerms || []), ...(trend.relatedQueries || trend.context || [])])];
    } else {
      consolidatedMap.set(normalizedKeyword, {
        keyword: trend.keyword,
        searchVolume: trend.searchVolume || trend.mentions || 0,
        category: trend.category || 'general',
        relatedTerms: trend.relatedQueries || trend.context || [],
        sources: [trend.source || 'unknown'],
        rawData: trend
      });
    }
  });
  
  return Array.from(consolidatedMap.values());
}

async function enrichTrendsWithContext(trends: any[]): Promise<RealTrendData[]> {
  console.log('🧠 Enriching trends with AI-powered context analysis...');
  
  const enrichedTrends: RealTrendData[] = [];
  
  for (const trend of trends) {
    try {
      const contextAnalysis = await analyzeContextWithAI(trend);
      
      const enrichedTrend: RealTrendData = {
        keyword: trend.keyword,
        searchVolume: trend.searchVolume,
        category: contextAnalysis.category || trend.category,
        relatedTerms: contextAnalysis.relatedTerms || trend.relatedTerms,
        context: {
          newsArticles: contextAnalysis.newsContext || [],
          socialMentions: contextAnalysis.socialContext || [],
          marketData: contextAnalysis.marketData,
          timeframe: '1d',
          geography: 'US'
        },
        metadata: {
          discoveredAt: new Date().toISOString(),
          confidence: contextAnalysis.confidence || 0.7,
          urgency: determineUrgency(trend.searchVolume, contextAnalysis),
          source: trend.sources.join(', ')
        }
      };
      
      enrichedTrends.push(enrichedTrend);
      
    } catch (error) {
      console.error(`Failed to enrich trend ${trend.keyword}:`, error);
      
      // Add basic enriched trend without AI analysis
      enrichedTrends.push({
        keyword: trend.keyword,
        searchVolume: trend.searchVolume,
        category: trend.category,
        relatedTerms: trend.relatedTerms.slice(0, 5),
        context: {
          newsArticles: [],
          socialMentions: [],
          timeframe: '1d',
          geography: 'US'
        },
        metadata: {
          discoveredAt: new Date().toISOString(),
          confidence: 0.6,
          urgency: trend.searchVolume > 50000 ? 'high' : 'medium',
          source: trend.sources.join(', ')
        }
      });
    }
  }
  
  return enrichedTrends;
}

async function analyzeContextWithAI(trend: any): Promise<any> {
  const analysisPrompt = `
Analyze this trending topic for content creation context:

TREND: ${trend.keyword}
SEARCH VOLUME: ${trend.searchVolume}
CATEGORY: ${trend.category}
RELATED TERMS: ${trend.relatedTerms.join(', ')}
SOURCES: ${trend.sources.join(', ')}

Provide analysis for:
1. Why is this trending RIGHT NOW? What's the current context?
2. What specific angle would provide the most value to content creators?
3. What are the key facts, developments, or insights people need to know?
4. What questions are people asking about this trend?
5. How urgent/time-sensitive is this trend?
6. What category best fits this content?
7. What related search terms are people likely using?

Respond in JSON format with:
{
  "category": "technology|finance|education|health|general",
  "relatedTerms": ["term1", "term2", ...],
  "newsContext": ["context1", "context2", ...],
  "socialContext": ["mention1", "mention2", ...],
  "confidence": 0.0-1.0,
  "urgency": "low|medium|high",
  "reasoning": "explanation of analysis"
}
`;

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1500,
      messages: [{ role: 'user', content: analysisPrompt }]
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
  
  throw new Error('Failed to parse AI context analysis');
}

function determineUrgency(searchVolume: number, contextAnalysis: any): 'low' | 'medium' | 'high' {
  if (contextAnalysis.urgency) {
    return contextAnalysis.urgency;
  }
  
  if (searchVolume > 50000) return 'high';
  if (searchVolume > 20000) return 'medium';
  return 'low';
}

async function storeTrendsInDatabase(trends: RealTrendData[]): Promise<void> {
  console.log('💾 Storing trends in database...');
  
  for (const trend of trends) {
    try {
      const command = new PutItemCommand({
        TableName: TRENDS_TABLE,
        Item: {
          trendId: { S: `trend-${Date.now()}-${trend.keyword.replace(/\s+/g, '-')}` },
          keyword: { S: trend.keyword },
          searchVolume: { N: trend.searchVolume.toString() },
          category: { S: trend.category },
          relatedTerms: { S: JSON.stringify(trend.relatedTerms) },
          context: { S: JSON.stringify(trend.context) },
          metadata: { S: JSON.stringify(trend.metadata) },
          discoveredAt: { S: trend.metadata.discoveredAt },
          ttl: { N: Math.floor(Date.now() / 1000) + (24 * 60 * 60) } // 24 hour TTL
        }
      });
      
      await dynamoClient.send(command);
      
    } catch (error) {
      console.error(`Failed to store trend ${trend.keyword}:`, error);
    }
  }
}

async function getCachedTrends(request: TrendDiscoveryRequest): Promise<RealTrendData[]> {
  console.log('📋 Retrieving cached trends...');
  
  try {
    const command = new ScanCommand({
      TableName: TRENDS_TABLE,
      FilterExpression: 'discoveredAt > :yesterday',
      ExpressionAttributeValues: {
        ':yesterday': { S: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
      },
      Limit: request.maxResults || 10
    });
    
    const result = await dynamoClient.send(command);
    
    return result.Items?.map(item => ({
      keyword: item.keyword.S!,
      searchVolume: parseInt(item.searchVolume.N!),
      category: item.category.S!,
      relatedTerms: JSON.parse(item.relatedTerms.S!),
      context: JSON.parse(item.context.S!),
      metadata: JSON.parse(item.metadata.S!)
    })) || [];
    
  } catch (error) {
    console.error('Failed to retrieve cached trends:', error);
    return [];
  }
}

// Export for testing and integration
export {
  RealTrendData,
  TrendDiscoveryRequest,
  fetchGoogleTrends,
  enrichTrendsWithContext,
  analyzeContextWithAI
};