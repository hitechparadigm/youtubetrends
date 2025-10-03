import { Handler, Context } from 'aws-lambda';

export interface FallbackContentGeneratorEvent {
  topic: string;
  trendsData: any[];
  fallbackStrategy: 'TEMPLATE_BASED' | 'KEYWORD_BASED' | 'GENERIC';
}

export interface FallbackContentGeneratorResponse {
  success: boolean;
  selectedTrends: any[];
  scriptPrompts: Array<{
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
    fallbackSource: string;
  }>;
  executionTime: number;
  error?: string;
}

export const handler: Handler<FallbackContentGeneratorEvent, FallbackContentGeneratorResponse> = async (
  event: FallbackContentGeneratorEvent,
  context: Context
): Promise<FallbackContentGeneratorResponse> => {
  const startTime = Date.now();
  
  console.log('Fallback Content Generator started', {
    requestId: context.awsRequestId,
    topic: event.topic,
    strategy: event.fallbackStrategy,
    trendsCount: event.trendsData?.length || 0
  });

  try {
    let scriptPrompts: any[] = [];

    switch (event.fallbackStrategy) {
      case 'TEMPLATE_BASED':
        scriptPrompts = await generateTemplateBasedContent(event.topic, event.trendsData);
        break;
      case 'KEYWORD_BASED':
        scriptPrompts = await generateKeywordBasedContent(event.topic, event.trendsData);
        break;
      case 'GENERIC':
        scriptPrompts = await generateGenericContent(event.topic);
        break;
      default:
        throw new Error(`Unknown fallback strategy: ${event.fallbackStrategy}`);
    }

    console.log('Fallback content generation completed successfully', {
      topic: event.topic,
      strategy: event.fallbackStrategy,
      promptsGenerated: scriptPrompts.length,
      executionTime: Date.now() - startTime
    });

    return {
      success: true,
      selectedTrends: event.trendsData || [],
      scriptPrompts,
      executionTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Fallback content generation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId
    });

    return {
      success: false,
      selectedTrends: [],
      scriptPrompts: [],
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function generateTemplateBasedContent(topic: string, trendsData: any[]): Promise<any[]> {
  console.log('Generating template-based content');
  
  const templates = getTopicTemplates(topic);
  const scriptPrompts = [];
  
  // Use trends data if available, otherwise create generic content
  const dataToUse = trendsData.length > 0 ? trendsData.slice(0, 2) : [createGenericTrend(topic)];
  
  for (let i = 0; i < Math.min(dataToUse.length, templates.length); i++) {
    const trend = dataToUse[i];
    const template = templates[i];
    
    const prompt = template.scriptTemplate
      .replace('{topic}', topic)
      .replace('{title}', trend.title || `${topic} Guide`)
      .replace('{keywords}', (trend.keywords || [topic, 'guide', 'tips']).join(', '))
      .replace('{viewCount}', (trend.viewCount || 10000).toLocaleString())
      .replace('{engagement}', ((trend.engagementRate || 3.0) * 100).toFixed(1));

    const keywords = generateFallbackKeywords(topic, trend.keywords || []);
    const seoMetadata = generateFallbackSEOMetadata(topic, keywords, template.title);

    scriptPrompts.push({
      trendId: trend.videoId || `fallback_${topic}_${Date.now()}_${i}`,
      title: template.title.replace('{topic}', topic.charAt(0).toUpperCase() + topic.slice(1)),
      prompt,
      keywords,
      estimatedLength: 420, // 7 minutes default
      topic,
      seoMetadata,
      fallbackSource: 'TEMPLATE_BASED'
    });
  }
  
  return scriptPrompts;
}

async function generateKeywordBasedContent(topic: string, trendsData: any[]): Promise<any[]> {
  console.log('Generating keyword-based content');
  
  const topicKeywords = getTopicKeywords(topic);
  const scriptPrompts = [];
  
  // Extract keywords from trends data
  const allKeywords = new Set<string>();
  trendsData.forEach(trend => {
    if (trend.keywords) {
      trend.keywords.forEach((keyword: string) => allKeywords.add(keyword));
    }
  });
  
  // Combine with topic-specific keywords
  const combinedKeywords = [...allKeywords, ...topicKeywords].slice(0, 8);
  
  const basePrompt = getKeywordBasedPrompt(topic, combinedKeywords);
  const title = generateKeywordBasedTitle(topic, combinedKeywords);
  const seoMetadata = generateFallbackSEOMetadata(topic, combinedKeywords, title);
  
  scriptPrompts.push({
    trendId: `keyword_fallback_${topic}_${Date.now()}`,
    title,
    prompt: basePrompt,
    keywords: combinedKeywords,
    estimatedLength: 480, // 8 minutes
    topic,
    seoMetadata,
    fallbackSource: 'KEYWORD_BASED'
  });
  
  return scriptPrompts;
}

async function generateGenericContent(topic: string): Promise<any[]> {
  console.log('Generating generic content');
  
  const genericPrompt = getGenericPrompt(topic);
  const keywords = getTopicKeywords(topic);
  const title = `Complete ${topic.charAt(0).toUpperCase() + topic.slice(1)} Guide for Beginners`;
  const seoMetadata = generateFallbackSEOMetadata(topic, keywords, title);
  
  return [{
    trendId: `generic_fallback_${topic}_${Date.now()}`,
    title,
    prompt: genericPrompt,
    keywords,
    estimatedLength: 360, // 6 minutes
    topic,
    seoMetadata,
    fallbackSource: 'GENERIC'
  }];
}

function getTopicTemplates(topic: string): Array<{ scriptTemplate: string; title: string }> {
  const templates: Record<string, Array<{ scriptTemplate: string; title: string }>> = {
    investing: [
      {
        scriptTemplate: `Create an educational video about {topic} covering essential investment concepts. 
          Explain key principles including {keywords} in beginner-friendly terms. 
          Cover portfolio diversification, risk management, and long-term investment strategies. 
          Include practical examples and actionable advice for new investors. 
          Make it informative and trustworthy while encouraging financial literacy.`,
        title: 'Essential {topic} Guide for Beginners'
      },
      {
        scriptTemplate: `Create a comprehensive {topic} tutorial focusing on common mistakes and how to avoid them. 
          Discuss {keywords} and their importance in building wealth. 
          Cover market fundamentals, investment vehicles, and risk assessment. 
          Provide step-by-step guidance for getting started with investing.`,
        title: '{topic} Mistakes to Avoid in 2024'
      }
    ],
    education: [
      {
        scriptTemplate: `Create an engaging educational video about effective {topic} strategies. 
          Cover learning techniques related to {keywords} with practical applications. 
          Include study methods, productivity tips, and skill development approaches. 
          Make it actionable and inspiring for learners at all levels.`,
        title: 'Master {topic}: Proven Learning Strategies'
      },
      {
        scriptTemplate: `Create a comprehensive {topic} guide covering essential skills and knowledge. 
          Focus on {keywords} and their practical applications. 
          Include step-by-step tutorials and real-world examples. 
          Make it accessible and valuable for continuous learning.`,
        title: 'Complete {topic} Tutorial: Step by Step'
      }
    ],
    tourism: [
      {
        scriptTemplate: `Create an inspiring travel video about {topic} destinations and experiences. 
          Showcase amazing places and activities related to {keywords}. 
          Include practical travel tips, cultural insights, and budget advice. 
          Make it visually engaging and informative for travelers.`,
        title: 'Amazing {topic} Destinations You Must Visit'
      },
      {
        scriptTemplate: `Create a comprehensive {topic} travel guide covering planning and experiences. 
          Focus on {keywords} and practical travel advice. 
          Include destination highlights, cultural tips, and budget planning. 
          Make it inspiring and helpful for trip planning.`,
        title: 'Ultimate {topic} Travel Guide'
      }
    ],
    technology: [
      {
        scriptTemplate: `Create a technology-focused video about {topic} innovations and trends. 
          Explain concepts related to {keywords} in accessible terms. 
          Cover practical applications, future implications, and current developments. 
          Make complex technology understandable for general audiences.`,
        title: 'Latest {topic} Trends and Innovations'
      },
      {
        scriptTemplate: `Create a comprehensive {topic} guide covering essential technology concepts. 
          Focus on {keywords} and their real-world applications. 
          Include tutorials, tips, and future predictions. 
          Make it informative and engaging for tech enthusiasts.`,
        title: '{topic} Explained: Complete Guide'
      }
    ],
    health: [
      {
        scriptTemplate: `Create a health and wellness video about {topic} with evidence-based information. 
          Cover concepts related to {keywords} with practical health advice. 
          Include lifestyle tips, wellness strategies, and actionable steps. 
          Make it informative and motivating for better health.`,
        title: 'Complete {topic} Guide for Better Health'
      },
      {
        scriptTemplate: `Create a comprehensive {topic} wellness guide covering healthy lifestyle choices. 
          Focus on {keywords} and their health benefits. 
          Include practical tips, scientific insights, and daily habits. 
          Make it encouraging and actionable for wellness improvement.`,
        title: '{topic} Wellness: Tips That Actually Work'
      }
    ]
  };
  
  return templates[topic.toLowerCase()] || templates.education;
}

function getTopicKeywords(topic: string): string[] {
  const keywords: Record<string, string[]> = {
    investing: ['portfolio', 'stocks', 'ETF', 'dividends', 'risk', 'returns', 'diversification', 'compound'],
    education: ['learning', 'study', 'skills', 'knowledge', 'tutorial', 'tips', 'methods', 'success'],
    tourism: ['travel', 'destinations', 'culture', 'adventure', 'budget', 'planning', 'experiences', 'guide'],
    technology: ['innovation', 'digital', 'software', 'future', 'trends', 'development', 'solutions', 'tech'],
    health: ['wellness', 'fitness', 'nutrition', 'lifestyle', 'exercise', 'mental', 'habits', 'healthy'],
    finance: ['money', 'budget', 'savings', 'planning', 'wealth', 'financial', 'management', 'goals']
  };
  
  return keywords[topic.toLowerCase()] || ['guide', 'tips', 'tutorial', 'beginners', 'essential', 'complete'];
}

function getKeywordBasedPrompt(topic: string, keywords: string[]): string {
  return `Create a comprehensive educational video about ${topic} focusing on ${keywords.slice(0, 5).join(', ')}. 
    Provide valuable insights and practical advice that viewers can immediately apply. 
    Structure the content to be engaging, informative, and accessible to beginners while offering value to more experienced audiences. 
    Include real-world examples and actionable steps throughout the presentation.`;
}

function getGenericPrompt(topic: string): string {
  return `Create an educational video about ${topic} that covers the fundamental concepts and practical applications. 
    Provide a comprehensive overview that is accessible to beginners while offering valuable insights. 
    Include practical tips, common misconceptions, and actionable advice that viewers can implement. 
    Make the content engaging and informative with clear explanations and real-world examples.`;
}

function generateKeywordBasedTitle(topic: string, keywords: string[]): string {
  const topKeywords = keywords.slice(0, 2);
  const templates = [
    `${topKeywords.join(' & ')} in ${topic}: Complete Guide`,
    `Master ${topic}: ${topKeywords[0]} Tips That Work`,
    `${topic} Success: ${topKeywords.join(' and ')} Explained`,
    `Essential ${topic}: ${topKeywords[0]} Strategies`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)]
    .replace(topic, topic.charAt(0).toUpperCase() + topic.slice(1));
}

function generateFallbackKeywords(topic: string, existingKeywords: string[]): string[] {
  const baseKeywords = [topic, 'guide', 'tips', 'tutorial', 'beginners'];
  const topicSpecific = getTopicKeywords(topic);
  
  return [...new Set([...baseKeywords, ...existingKeywords, ...topicSpecific])].slice(0, 12);
}

function generateFallbackSEOMetadata(topic: string, keywords: string[], title: string): {
  description: string;
  tags: string[];
  category: string;
} {
  const description = `Learn about ${keywords.slice(0, 3).join(', ')} in this comprehensive ${topic} guide. 
    Get practical tips and expert insights to improve your ${topic} knowledge and skills.`.substring(0, 155);
  
  const tags = [...new Set([topic, `${topic}guide`, `${topic}tips`, ...keywords.slice(0, 8)])].slice(0, 12);
  
  const categoryMap: Record<string, string> = {
    investing: '25', // News & Politics
    education: '27', // Education
    tourism: '19', // Travel & Events
    technology: '28', // Science & Technology
    health: '26', // Howto & Style
    finance: '25' // News & Politics
  };
  
  return {
    description,
    tags,
    category: categoryMap[topic.toLowerCase()] || '27'
  };
}

function createGenericTrend(topic: string): any {
  return {
    videoId: `generic_${topic}_${Date.now()}`,
    title: `Essential ${topic.charAt(0).toUpperCase() + topic.slice(1)} Guide`,
    viewCount: 25000,
    likeCount: 1250,
    commentCount: 180,
    engagementRate: 5.72,
    engagementScore: 0.057,
    keywords: getTopicKeywords(topic),
    categoryId: '27',
    publishedAt: new Date().toISOString(),
    channelTitle: `${topic} Academy`,
    channelId: `generic_${topic}`
  };
}