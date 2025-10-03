"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event, context) => {
    const startTime = Date.now();
    console.log('Fallback Content Generator started', {
        requestId: context.awsRequestId,
        topic: event.topic,
        strategy: event.fallbackStrategy,
        trendsCount: event.trendsData?.length || 0
    });
    try {
        let scriptPrompts = [];
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
    }
    catch (error) {
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
exports.handler = handler;
async function generateTemplateBasedContent(topic, trendsData) {
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
            estimatedLength: 420,
            topic,
            seoMetadata,
            fallbackSource: 'TEMPLATE_BASED'
        });
    }
    return scriptPrompts;
}
async function generateKeywordBasedContent(topic, trendsData) {
    console.log('Generating keyword-based content');
    const topicKeywords = getTopicKeywords(topic);
    const scriptPrompts = [];
    // Extract keywords from trends data
    const allKeywords = new Set();
    trendsData.forEach(trend => {
        if (trend.keywords) {
            trend.keywords.forEach((keyword) => allKeywords.add(keyword));
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
        estimatedLength: 480,
        topic,
        seoMetadata,
        fallbackSource: 'KEYWORD_BASED'
    });
    return scriptPrompts;
}
async function generateGenericContent(topic) {
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
            estimatedLength: 360,
            topic,
            seoMetadata,
            fallbackSource: 'GENERIC'
        }];
}
function getTopicTemplates(topic) {
    const templates = {
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
function getTopicKeywords(topic) {
    const keywords = {
        investing: ['portfolio', 'stocks', 'ETF', 'dividends', 'risk', 'returns', 'diversification', 'compound'],
        education: ['learning', 'study', 'skills', 'knowledge', 'tutorial', 'tips', 'methods', 'success'],
        tourism: ['travel', 'destinations', 'culture', 'adventure', 'budget', 'planning', 'experiences', 'guide'],
        technology: ['innovation', 'digital', 'software', 'future', 'trends', 'development', 'solutions', 'tech'],
        health: ['wellness', 'fitness', 'nutrition', 'lifestyle', 'exercise', 'mental', 'habits', 'healthy'],
        finance: ['money', 'budget', 'savings', 'planning', 'wealth', 'financial', 'management', 'goals']
    };
    return keywords[topic.toLowerCase()] || ['guide', 'tips', 'tutorial', 'beginners', 'essential', 'complete'];
}
function getKeywordBasedPrompt(topic, keywords) {
    return `Create a comprehensive educational video about ${topic} focusing on ${keywords.slice(0, 5).join(', ')}. 
    Provide valuable insights and practical advice that viewers can immediately apply. 
    Structure the content to be engaging, informative, and accessible to beginners while offering value to more experienced audiences. 
    Include real-world examples and actionable steps throughout the presentation.`;
}
function getGenericPrompt(topic) {
    return `Create an educational video about ${topic} that covers the fundamental concepts and practical applications. 
    Provide a comprehensive overview that is accessible to beginners while offering valuable insights. 
    Include practical tips, common misconceptions, and actionable advice that viewers can implement. 
    Make the content engaging and informative with clear explanations and real-world examples.`;
}
function generateKeywordBasedTitle(topic, keywords) {
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
function generateFallbackKeywords(topic, existingKeywords) {
    const baseKeywords = [topic, 'guide', 'tips', 'tutorial', 'beginners'];
    const topicSpecific = getTopicKeywords(topic);
    return [...new Set([...baseKeywords, ...existingKeywords, ...topicSpecific])].slice(0, 12);
}
function generateFallbackSEOMetadata(topic, keywords, title) {
    const description = `Learn about ${keywords.slice(0, 3).join(', ')} in this comprehensive ${topic} guide. 
    Get practical tips and expert insights to improve your ${topic} knowledge and skills.`.substring(0, 155);
    const tags = [...new Set([topic, `${topic}guide`, `${topic}tips`, ...keywords.slice(0, 8)])].slice(0, 12);
    const categoryMap = {
        investing: '25',
        education: '27',
        tourism: '19',
        technology: '28',
        health: '26',
        finance: '25' // News & Politics
    };
    return {
        description,
        tags,
        category: categoryMap[topic.toLowerCase()] || '27'
    };
}
function createGenericTrend(topic) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUE2Qk8sTUFBTSxPQUFPLEdBQTZFLEtBQUssRUFDcEcsS0FBb0MsRUFDcEMsT0FBZ0IsRUFDMkIsRUFBRTtJQUM3QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRTtRQUNoRCxTQUFTLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDL0IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1FBQ2xCLFFBQVEsRUFBRSxLQUFLLENBQUMsZ0JBQWdCO1FBQ2hDLFdBQVcsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFDO0tBQzNDLENBQUMsQ0FBQztJQUVILElBQUk7UUFDRixJQUFJLGFBQWEsR0FBVSxFQUFFLENBQUM7UUFFOUIsUUFBUSxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7WUFDOUIsS0FBSyxnQkFBZ0I7Z0JBQ25CLGFBQWEsR0FBRyxNQUFNLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNsRixNQUFNO1lBQ1IsS0FBSyxlQUFlO2dCQUNsQixhQUFhLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDakYsTUFBTTtZQUNSLEtBQUssU0FBUztnQkFDWixhQUFhLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzFELE1BQU07WUFDUjtnQkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1NBQzNFO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvREFBb0QsRUFBRTtZQUNoRSxLQUFL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UUFDWixPQUFPLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtLQUNqQyxDQUFDO0lBRUYsT0FBTztRQUNMLFdBQVc7UUFDWCxJQUFJO1FBQ0osUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxJQUFJO0tBQ25ELENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxLQUFhO0lBQ3ZDLE9BQU87UUFDTCxPQUFPLEVBQUUsV0FBVyxLQUFLLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ3pDLEtBQUssRUFBRSxhQUFhLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUTtRQUMxRSxTQUFTLEVBQUUsS0FBSztRQUNoQixTQUFTLEVBQUUsSUFBSTtRQUNmLFlBQVksRUFBRSxHQUFHO1FBQ2pCLGNBQWMsRUFBRSxJQUFJO1FBQ3BCLGVBQWUsRUFBRSxLQUFLO1FBQ3RCLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7UUFDakMsVUFBVSxFQUFFLElBQUk7UUFDaEIsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1FBQ3JDLFlBQVksRUFBRSxHQUFHLEtBQUssVUFBVTtRQUNoQyxTQUFTLEVBQUUsV0FBVyxLQUFLLEVBQUU7S0FDOUIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBIYW5kbGVyLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZhbGxiYWNrQ29udGVudEdlbmVyYXRvckV2ZW50IHtcclxuICB0b3BpYzogc3RyaW5nO1xyXG4gIHRyZW5kc0RhdGE6IGFueVtdO1xyXG4gIGZhbGxiYWNrU3RyYXRlZ3k6ICdURU1QTEFURV9CQVNFRCcgfCAnS0VZV09SRF9CQVNFRCcgfCAnR0VORVJJQyc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmFsbGJhY2tDb250ZW50R2VuZXJhdG9yUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgc2VsZWN0ZWRUcmVuZHM6IGFueVtdO1xyXG4gIHNjcmlwdFByb21wdHM6IEFycmF5PHtcclxuICAgIHRyZW5kSWQ6IHN0cmluZztcclxuICAgIHRpdGxlOiBzdHJpbmc7XHJcbiAgICBwcm9tcHQ6IHN0cmluZztcclxuICAgIGtleXdvcmRzOiBzdHJpbmdbXTtcclxuICAgIGVzdGltYXRlZExlbmd0aDogbnVtYmVyO1xyXG4gICAgdG9waWM6IHN0cmluZztcclxuICAgIHNlb01ldGFkYXRhOiB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICAgIHRhZ3M6IHN0cmluZ1tdO1xyXG4gICAgICBjYXRlZ29yeTogc3RyaW5nO1xyXG4gICAgfTtcclxuICAgIGZhbGxiYWNrU291cmNlOiBzdHJpbmc7XHJcbiAgfT47XHJcbiAgZXhlY3V0aW9uVGltZTogbnVtYmVyO1xyXG4gIGVycm9yPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogSGFuZGxlcjxGYWxsYmFja0NvbnRlbnRHZW5lcmF0b3JFdmVudCwgRmFsbGJhY2tDb250ZW50R2VuZXJhdG9yUmVzcG9uc2U+ID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBGYWxsYmFja0NvbnRlbnRHZW5lcmF0b3JFdmVudCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8RmFsbGJhY2tDb250ZW50R2VuZXJhdG9yUmVzcG9uc2U+ID0+IHtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIFxyXG4gIGNvbnNvbGUubG9nKCdGYWxsYmFjayBDb250ZW50IEdlbmVyYXRvciBzdGFydGVkJywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIHRvcGljOiBldmVudC50b3BpYyxcclxuICAgIHN0cmF0ZWd5OiBldmVudC5mYWxsYmFja1N0cmF0ZWd5LFxyXG4gICAgdHJlbmRzQ291bnQ6IGV2ZW50LnRyZW5kc0RhdGE/Lmxlbmd0aCB8fCAwXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBsZXQgc2NyaXB0UHJvbXB0czogYW55W10gPSBbXTtcclxuXHJcbiAgICBzd2l0Y2ggKGV2ZW50LmZhbGxiYWNrU3RyYXRlZ3kpIHtcclxuICAgICAgY2FzZSAnVEVNUExBVEVfQkFTRUQnOlxyXG4gICAgICAgIHNjcmlwdFByb21wdHMgPSBhd2FpdCBnZW5lcmF0ZVRlbXBsYXRlQmFzZWRDb250ZW50KGV2ZW50LnRvcGljLCBldmVudC50cmVuZHNEYXRhKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnS0VZV09SRF9CQVNFRCc6XHJcbiAgICAgICAgc2NyaXB0UHJvbXB0cyA9IGF3YWl0IGdlbmVyYXRlS2V5d29yZEJhc2VkQ29udGVudChldmVudC50b3BpYywgZXZlbnQudHJlbmRzRGF0YSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ0dFTkVSSUMnOlxyXG4gICAgICAgIHNjcmlwdFByb21wdHMgPSBhd2FpdCBnZW5lcmF0ZUdlbmVyaWNDb250ZW50KGV2ZW50LnRvcGljKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gZmFsbGJhY2sgc3RyYXRlZ3k6ICR7ZXZlbnQuZmFsbGJhY2tTdHJhdGVneX1gKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnRmFsbGJhY2sgY29udGVudCBnZW5lcmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIHRvcGljOiBldmVudC50b3BpYyxcclxuICAgICAgc3RyYXRlZ3k6IGV2ZW50LmZhbGxiYWNrU3RyYXRlZ3ksXHJcbiAgICAgIHByb21wdHNHZW5lcmF0ZWQ6IHNjcmlwdFByb21wdHMubGVuZ3RoLFxyXG4gICAgICBleGVjdXRpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBzZWxlY3RlZFRyZW5kczogZXZlbnQudHJlbmRzRGF0YSB8fCBbXSxcclxuICAgICAgc2NyaXB0UHJvbXB0cyxcclxuICAgICAgZXhlY3V0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhbGxiYWNrIGNvbnRlbnQgZ2VuZXJhdGlvbiBmYWlsZWQnLCB7XHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgIHN0YWNrOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiB1bmRlZmluZWQsXHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWRcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBzZWxlY3RlZFRyZW5kczogW10sXHJcbiAgICAgIHNjcmlwdFByb21wdHM6IFtdLFxyXG4gICAgICBleGVjdXRpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlVGVtcGxhdGVCYXNlZENvbnRlbnQodG9waWM6IHN0cmluZywgdHJlbmRzRGF0YTogYW55W10pOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgY29uc29sZS5sb2coJ0dlbmVyYXRpbmcgdGVtcGxhdGUtYmFzZWQgY29udGVudCcpO1xyXG4gIFxyXG4gIGNvbnN0IHRlbXBsYXRlcyA9IGdldFRvcGljVGVtcGxhdGVzKHRvcGljKTtcclxuICBjb25zdCBzY3JpcHRQcm9tcHRzID0gW107XHJcbiAgXHJcbiAgLy8gVXNlIHRyZW5kcyBkYXRhIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIGNyZWF0ZSBnZW5lcmljIGNvbnRlbnRcclxuICBjb25zdCBkYXRhVG9Vc2UgPSB0cmVuZHNEYXRhLmxlbmd0aCA+IDAgPyB0cmVuZHNEYXRhLnNsaWNlKDAsIDIpIDogW2NyZWF0ZUdlbmVyaWNUcmVuZCh0b3BpYyldO1xyXG4gIFxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZGF0YVRvVXNlLmxlbmd0aCwgdGVtcGxhdGVzLmxlbmd0aCk7IGkrKykge1xyXG4gICAgY29uc3QgdHJlbmQgPSBkYXRhVG9Vc2VbaV07XHJcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRlbXBsYXRlc1tpXTtcclxuICAgIFxyXG4gICAgY29uc3QgcHJvbXB0ID0gdGVtcGxhdGUuc2NyaXB0VGVtcGxhdGVcclxuICAgICAgLnJlcGxhY2UoJ3t0b3BpY30nLCB0b3BpYylcclxuICAgICAgLnJlcGxhY2UoJ3t0aXRsZX0nLCB0cmVuZC50aXRsZSB8fCBgJHt0b3BpY30gR3VpZGVgKVxyXG4gICAgICAucmVwbGFjZSgne2tleXdvcmRzfScsICh0cmVuZC5rZXl3b3JkcyB8fCBbdG9waWMsICdndWlkZScsICd0aXBzJ10pLmpvaW4oJywgJykpXHJcbiAgICAgIC5yZXBsYWNlKCd7dmlld0NvdW50fScsICh0cmVuZC52aWV3Q291bnQgfHwgMTAwMDApLnRvTG9jYWxlU3RyaW5nKCkpXHJcbiAgICAgIC5yZXBsYWNlKCd7ZW5nYWdlbWVudH0nLCAoKHRyZW5kLmVuZ2FnZW1lbnRSYXRlIHx8IDMuMCkgKiAxMDApLnRvRml4ZWQoMSkpO1xyXG5cclxuICAgIGNvbnN0IGtleXdvcmRzID0gZ2VuZXJhdGVGYWxsYmFja0tleXdvcmRzKHRvcGljLCB0cmVuZC5rZXl3b3JkcyB8fCBbXSk7XHJcbiAgICBjb25zdCBzZW9NZXRhZGF0YSA9IGdlbmVyYXRlRmFsbGJhY2tTRU9NZXRhZGF0YSh0b3BpYywga2V5d29yZHMsIHRlbXBsYXRlLnRpdGxlKTtcclxuXHJcbiAgICBzY3JpcHRQcm9tcHRzLnB1c2goe1xyXG4gICAgICB0cmVuZElkOiB0cmVuZC52aWRlb0lkIHx8IGBmYWxsYmFja18ke3RvcGljfV8ke0RhdGUubm93KCl9XyR7aX1gLFxyXG4gICAgICB0aXRsZTogdGVtcGxhdGUudGl0bGUucmVwbGFjZSgne3RvcGljfScsIHRvcGljLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdG9waWMuc2xpY2UoMSkpLFxyXG4gICAgICBwcm9tcHQsXHJcbiAgICAgIGtleXdvcmRzLFxyXG4gICAgICBlc3RpbWF0ZWRMZW5ndGg6IDQyMCwgLy8gNyBtaW51dGVzIGRlZmF1bHRcclxuICAgICAgdG9waWMsXHJcbiAgICAgIHNlb01ldGFkYXRhLFxyXG4gICAgICBmYWxsYmFja1NvdXJjZTogJ1RFTVBMQVRFX0JBU0VEJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBzY3JpcHRQcm9tcHRzO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUtleXdvcmRCYXNlZENvbnRlbnQodG9waWM6IHN0cmluZywgdHJlbmRzRGF0YTogYW55W10pOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgY29uc29sZS5sb2coJ0dlbmVyYXRpbmcga2V5d29yZC1iYXNlZCBjb250ZW50Jyk7XHJcbiAgXHJcbiAgY29uc3QgdG9waWNLZXl3b3JkcyA9IGdldFRvcGljS2V5d29yZHModG9waWMpO1xyXG4gIGNvbnN0IHNjcmlwdFByb21wdHMgPSBbXTtcclxuICBcclxuICAvLyBFeHRyYWN0IGtleXdvcmRzIGZyb20gdHJlbmRzIGRhdGFcclxuICBjb25zdCBhbGxLZXl3b3JkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gIHRyZW5kc0RhdGEuZm9yRWFjaCh0cmVuZCA9PiB7XHJcbiAgICBpZiAodHJlbmQua2V5d29yZHMpIHtcclxuICAgICAgdHJlbmQua2V5d29yZHMuZm9yRWFjaCgoa2V5d29yZDogc3RyaW5nKSA9PiBhbGxLZXl3b3Jkcy5hZGQoa2V5d29yZCkpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIFxyXG4gIC8vIENvbWJpbmUgd2l0aCB0b3BpYy1zcGVjaWZpYyBrZXl3b3Jkc1xyXG4gIGNvbnN0IGNvbWJpbmVkS2V5d29yZHMgPSBbLi4uYWxsS2V5d29yZHMsIC4uLnRvcGljS2V5d29yZHNdLnNsaWNlKDAsIDgpO1xyXG4gIFxyXG4gIGNvbnN0IGJhc2VQcm9tcHQgPSBnZXRLZXl3b3JkQmFzZWRQcm9tcHQodG9waWMsIGNvbWJpbmVkS2V5d29yZHMpO1xyXG4gIGNvbnN0IHRpdGxlID0gZ2VuZXJhdGVLZXl3b3JkQmFzZWRUaXRsZSh0b3BpYywgY29tYmluZWRLZXl3b3Jkcyk7XHJcbiAgY29uc3Qgc2VvTWV0YWRhdGEgPSBnZW5lcmF0ZUZhbGxiYWNrU0VPTWV0YWRhdGEodG9waWMsIGNvbWJpbmVkS2V5d29yZHMsIHRpdGxlKTtcclxuICBcclxuICBzY3JpcHRQcm9tcHRzLnB1c2goe1xyXG4gICAgdHJlbmRJZDogYGtleXdvcmRfZmFsbGJhY2tfJHt0b3BpY31fJHtEYXRlLm5vdygpfWAsXHJcbiAgICB0aXRsZSxcclxuICAgIHByb21wdDogYmFzZVByb21wdCxcclxuICAgIGtleXdvcmRzOiBjb21iaW5lZEtleXdvcmRzLFxyXG4gICAgZXN0aW1hdGVkTGVuZ3RoOiA0ODAsIC8vIDggbWludXRlc1xyXG4gICAgdG9waWMsXHJcbiAgICBzZW9NZXRhZGF0YSxcclxuICAgIGZhbGxiYWNrU291cmNlOiAnS0VZV09SRF9CQVNFRCdcclxuICB9KTtcclxuICBcclxuICByZXR1cm4gc2NyaXB0UHJvbXB0cztcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVHZW5lcmljQ29udGVudCh0b3BpYzogc3RyaW5nKTogUHJvbWlzZTxhbnlbXT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHZW5lcmF0aW5nIGdlbmVyaWMgY29udGVudCcpO1xyXG4gIFxyXG4gIGNvbnN0IGdlbmVyaWNQcm9tcHQgPSBnZXRHZW5lcmljUHJvbXB0KHRvcGljKTtcclxuICBjb25zdCBrZXl3b3JkcyA9IGdldFRvcGljS2V5d29yZHModG9waWMpO1xyXG4gIGNvbnN0IHRpdGxlID0gYENvbXBsZXRlICR7dG9waWMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0b3BpYy5zbGljZSgxKX0gR3VpZGUgZm9yIEJlZ2lubmVyc2A7XHJcbiAgY29uc3Qgc2VvTWV0YWRhdGEgPSBnZW5lcmF0ZUZhbGxiYWNrU0VPTWV0YWRhdGEodG9waWMsIGtleXdvcmRzLCB0aXRsZSk7XHJcbiAgXHJcbiAgcmV0dXJuIFt7XHJcbiAgICB0cmVuZElkOiBgZ2VuZXJpY19mYWxsYmFja18ke3RvcGljfV8ke0RhdGUubm93KCl9YCxcclxuICAgIHRpdGxlLFxyXG4gICAgcHJvbXB0OiBnZW5lcmljUHJvbXB0LFxyXG4gICAga2V5d29yZHMsXHJcbiAgICBlc3RpbWF0ZWRMZW5ndGg6IDM2MCwgLy8gNiBtaW51dGVzXHJcbiAgICB0b3BpYyxcclxuICAgIHNlb01ldGFkYXRhLFxyXG4gICAgZmFsbGJhY2tTb3VyY2U6ICdHRU5FUklDJ1xyXG4gIH1dO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRUb3BpY1RlbXBsYXRlcyh0b3BpYzogc3RyaW5nKTogQXJyYXk8eyBzY3JpcHRUZW1wbGF0ZTogc3RyaW5nOyB0aXRsZTogc3RyaW5nIH0+IHtcclxuICBjb25zdCB0ZW1wbGF0ZXM6IFJlY29yZDxzdHJpbmcsIEFycmF5PHsgc2NyaXB0VGVtcGxhdGU6IHN0cmluZzsgdGl0bGU6IHN0cmluZyB9Pj4gPSB7XHJcbiAgICBpbnZlc3Rpbmc6IFtcclxuICAgICAge1xyXG4gICAgICAgIHNjcmlwdFRlbXBsYXRlOiBgQ3JlYXRlIGFuIGVkdWNhdGlvbmFsIHZpZGVvIGFib3V0IHt0b3BpY30gY292ZXJpbmcgZXNzZW50aWFsIGludmVzdG1lbnQgY29uY2VwdHMuIFxyXG4gICAgICAgICAgRXhwbGFpbiBrZXkgcHJpbmNpcGxlcyBpbmNsdWRpbmcge2tleXdvcmRzfSBpbiBiZWdpbm5lci1mcmllbmRseSB0ZXJtcy4gXHJcbiAgICAgICAgICBDb3ZlciBwb3J0Zm9saW8gZGl2ZXJzaWZpY2F0aW9uLCByaXNrIG1hbmFnZW1lbnQsIGFuZCBsb25nLXRlcm0gaW52ZXN0bWVudCBzdHJhdGVnaWVzLiBcclxuICAgICAgICAgIEluY2x1ZGUgcHJhY3RpY2FsIGV4YW1wbGVzIGFuZCBhY3Rpb25hYmxlIGFkdmljZSBmb3IgbmV3IGludmVzdG9ycy4gXHJcbiAgICAgICAgICBNYWtlIGl0IGluZm9ybWF0aXZlIGFuZCB0cnVzdHdvcnRoeSB3aGlsZSBlbmNvdXJhZ2luZyBmaW5hbmNpYWwgbGl0ZXJhY3kuYCxcclxuICAgICAgICB0aXRsZTogJ0Vzc2VudGlhbCB7dG9waWN9IEd1aWRlIGZvciBCZWdpbm5lcnMnXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBzY3JpcHRUZW1wbGF0ZTogYENyZWF0ZSBhIGNvbXByZWhlbnNpdmUge3RvcGljfSB0dXRvcmlhbCBmb2N1c2luZyBvbiBjb21tb24gbWlzdGFrZXMgYW5kIGhvdyB0byBhdm9pZCB0aGVtLiBcclxuICAgICAgICAgIERpc2N1c3Mge2tleXdvcmRzfSBhbmQgdGhlaXIgaW1wb3J0YW5jZSBpbiBidWlsZGluZyB3ZWFsdGguIFxyXG4gICAgICAgICAgQ292ZXIgbWFya2V0IGZ1bmRhbWVudGFscywgaW52ZXN0bWVudCB2ZWhpY2xlcywgYW5kIHJpc2sgYXNzZXNzbWVudC4gXHJcbiAgICAgICAgICBQcm92aWRlIHN0ZXAtYnktc3RlcCBndWlkYW5jZSBmb3IgZ2V0dGluZyBzdGFydGVkIHdpdGggaW52ZXN0aW5nLmAsXHJcbiAgICAgICAgdGl0bGU6ICd7dG9waWN9IE1pc3Rha2VzIHRvIEF2b2lkIGluIDIwMjQnXHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBlZHVjYXRpb246IFtcclxuICAgICAge1xyXG4gICAgICAgIHNjcmlwdFRlbXBsYXRlOiBgQ3JlYXRlIGFuIGVuZ2FnaW5nIGVkdWNhdGlvbmFsIHZpZGVvIGFib3V0IGVmZmVjdGl2ZSB7dG9waWN9IHN0cmF0ZWdpZXMuIFxyXG4gICAgICAgICAgQ292ZXIgbGVhcm5pbmcgdGVjaG5pcXVlcyByZWxhdGVkIHRvIHtrZXl3b3Jkc30gd2l0aCBwcmFjdGljYWwgYXBwbGljYXRpb25zLiBcclxuICAgICAgICAgIEluY2x1ZGUgc3R1ZHkgbWV0aG9kcywgcHJvZHVjdGl2aXR5IHRpcHMsIGFuZCBza2lsbCBkZXZlbG9wbWVudCBhcHByb2FjaGVzLiBcclxuICAgICAgICAgIE1ha2UgaXQgYWN0aW9uYWJsZSBhbmQgaW5zcGlyaW5nIGZvciBsZWFybmVycyBhdCBhbGwgbGV2ZWxzLmAsXHJcbiAgICAgICAgdGl0bGU6ICdNYXN0ZXIge3RvcGljfTogUHJvdmVuIExlYXJuaW5nIFN0cmF0ZWdpZXMnXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBzY3JpcHRUZW1wbGF0ZTogYENyZWF0ZSBhIGNvbXByZWhlbnNpdmUge3RvcGljfSBndWlkZSBjb3ZlcmluZyBlc3NlbnRpYWwgc2tpbGxzIGFuZCBrbm93bGVkZ2UuIFxyXG4gICAgICAgICAgRm9jdXMgb24ge2tleXdvcmRzfSBhbmQgdGhlaXIgcHJhY3RpY2FsIGFwcGxpY2F0aW9ucy4gXHJcbiAgICAgICAgICBJbmNsdWRlIHN0ZXAtYnktc3RlcCB0dXRvcmlhbHMgYW5kIHJlYWwtd29ybGQgZXhhbXBsZXMuIFxyXG4gICAgICAgICAgTWFrZSBpdCBhY2Nlc3NpYmxlIGFuZCB2YWx1YWJsZSBmb3IgY29udGludW91cyBsZWFybmluZy5gLFxyXG4gICAgICAgIHRpdGxlOiAnQ29tcGxldGUge3RvcGljfSBUdXRvcmlhbDogU3RlcCBieSBTdGVwJ1xyXG4gICAgICB9XHJcbiAgICBdLFxyXG4gICAgdG91cmlzbTogW1xyXG4gICAgICB7XHJcbiAgICAgICAgc2NyaXB0VGVtcGxhdGU6IGBDcmVhdGUgYW4gaW5zcGlyaW5nIHRyYXZlbCB2aWRlbyBhYm91dCB7dG9waWN9IGRlc3RpbmF0aW9ucyBhbmQgZXhwZXJpZW5jZXMuIFxyXG4gICAgICAgICAgU2hvd2Nhc2UgYW1hemluZyBwbGFjZXMgYW5kIGFjdGl2aXRpZXMgcmVsYXRlZCB0byB7a2V5d29yZHN9LiBcclxuICAgICAgICAgIEluY2x1ZGUgcHJhY3RpY2FsIHRyYXZlbCB0aXBzLCBjdWx0dXJhbCBpbnNpZ2h0cywgYW5kIGJ1ZGdldCBhZHZpY2UuIFxyXG4gICAgICAgICAgTWFrZSBpdCB2aXN1YWxseSBlbmdhZ2luZyBhbmQgaW5mb3JtYXRpdmUgZm9yIHRyYXZlbGVycy5gLFxyXG4gICAgICAgIHRpdGxlOiAnQW1hemluZyB7dG9waWN9IERlc3RpbmF0aW9ucyBZb3UgTXVzdCBWaXNpdCdcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIHNjcmlwdFRlbXBsYXRlOiBgQ3JlYXRlIGEgY29tcHJlaGVuc2l2ZSB7dG9waWN9IHRyYXZlbCBndWlkZSBjb3ZlcmluZyBwbGFubmluZyBhbmQgZXhwZXJpZW5jZXMuIFxyXG4gICAgICAgICAgRm9jdXMgb24ge2tleXdvcmRzfSBhbmQgcHJhY3RpY2FsIHRyYXZlbCBhZHZpY2UuIFxyXG4gICAgICAgICAgSW5jbHVkZSBkZXN0aW5hdGlvbiBoaWdobGlnaHRzLCBjdWx0dXJhbCB0aXBzLCBhbmQgYnVkZ2V0IHBsYW5uaW5nLiBcclxuICAgICAgICAgIE1ha2UgaXQgaW5zcGlyaW5nIGFuZCBoZWxwZnVsIGZvciB0cmlwIHBsYW5uaW5nLmAsXHJcbiAgICAgICAgdGl0bGU6ICdVbHRpbWF0ZSB7dG9waWN9IFRyYXZlbCBHdWlkZSdcclxuICAgICAgfVxyXG4gICAgXSxcclxuICAgIHRlY2hub2xvZ3k6IFtcclxuICAgICAge1xyXG4gICAgICAgIHNjcmlwdFRlbXBsYXRlOiBgQ3JlYXRlIGEgdGVjaG5vbG9neS1mb2N1c2VkIHZpZGVvIGFib3V0IHt0b3BpY30gaW5ub3ZhdGlvbnMgYW5kIHRyZW5kcy4gXHJcbiAgICAgICAgICBFeHBsYWluIGNvbmNlcHRzIHJlbGF0ZWQgdG8ge2tleXdvcmRzfSBpbiBhY2Nlc3NpYmxlIHRlcm1zLiBcclxuICAgICAgICAgIENvdmVyIHByYWN0aWNhbCBhcHBsaWNhdGlvbnMsIGZ1dHVyZSBpbXBsaWNhdGlvbnMsIGFuZCBjdXJyZW50IGRldmVsb3BtZW50cy4gXHJcbiAgICAgICAgICBNYWtlIGNvbXBsZXggdGVjaG5vbG9neSB1bmRlcnN0YW5kYWJsZSBmb3IgZ2VuZXJhbCBhdWRpZW5jZXMuYCxcclxuICAgICAgICB0aXRsZTogJ0xhdGVzdCB7dG9waWN9IFRyZW5kcyBhbmQgSW5ub3ZhdGlvbnMnXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBzY3JpcHRUZW1wbGF0ZTogYENyZWF0ZSBhIGNvbXByZWhlbnNpdmUge3RvcGljfSBndWlkZSBjb3ZlcmluZyBlc3NlbnRpYWwgdGVjaG5vbG9neSBjb25jZXB0cy4gXHJcbiAgICAgICAgICBGb2N1cyBvbiB7a2V5d29yZHN9IGFuZCB0aGVpciByZWFsLXdvcmxkIGFwcGxpY2F0aW9ucy4gXHJcbiAgICAgICAgICBJbmNsdWRlIHR1dG9yaWFscywgdGlwcywgYW5kIGZ1dHVyZSBwcmVkaWN0aW9ucy4gXHJcbiAgICAgICAgICBNYWtlIGl0IGluZm9ybWF0aXZlIGFuZCBlbmdhZ2luZyBmb3IgdGVjaCBlbnRodXNpYXN0cy5gLFxyXG4gICAgICAgIHRpdGxlOiAne3RvcGljfSBFeHBsYWluZWQ6IENvbXBsZXRlIEd1aWRlJ1xyXG4gICAgICB9XHJcbiAgICBdLFxyXG4gICAgaGVhbHRoOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBzY3JpcHRUZW1wbGF0ZTogYENyZWF0ZSBhIGhlYWx0aCBhbmQgd2VsbG5lc3MgdmlkZW8gYWJvdXQge3RvcGljfSB3aXRoIGV2aWRlbmNlLWJhc2VkIGluZm9ybWF0aW9uLiBcclxuICAgICAgICAgIENvdmVyIGNvbmNlcHRzIHJlbGF0ZWQgdG8ge2tleXdvcmRzfSB3aXRoIHByYWN0aWNhbCBoZWFsdGggYWR2aWNlLiBcclxuICAgICAgICAgIEluY2x1ZGUgbGlmZXN0eWxlIHRpcHMsIHdlbGxuZXNzIHN0cmF0ZWdpZXMsIGFuZCBhY3Rpb25hYmxlIHN0ZXBzLiBcclxuICAgICAgICAgIE1ha2UgaXQgaW5mb3JtYXRpdmUgYW5kIG1vdGl2YXRpbmcgZm9yIGJldHRlciBoZWFsdGguYCxcclxuICAgICAgICB0aXRsZTogJ0NvbXBsZXRlIHt0b3BpY30gR3VpZGUgZm9yIEJldHRlciBIZWFsdGgnXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBzY3JpcHRUZW1wbGF0ZTogYENyZWF0ZSBhIGNvbXByZWhlbnNpdmUge3RvcGljfSB3ZWxsbmVzcyBndWlkZSBjb3ZlcmluZyBoZWFsdGh5IGxpZmVzdHlsZSBjaG9pY2VzLiBcclxuICAgICAgICAgIEZvY3VzIG9uIHtrZXl3b3Jkc30gYW5kIHRoZWlyIGhlYWx0aCBiZW5lZml0cy4gXHJcbiAgICAgICAgICBJbmNsdWRlIHByYWN0aWNhbCB0aXBzLCBzY2llbnRpZmljIGluc2lnaHRzLCBhbmQgZGFpbHkgaGFiaXRzLiBcclxuICAgICAgICAgIE1ha2UgaXQgZW5jb3VyYWdpbmcgYW5kIGFjdGlvbmFibGUgZm9yIHdlbGxuZXNzIGltcHJvdmVtZW50LmAsXHJcbiAgICAgICAgdGl0bGU6ICd7dG9waWN9IFdlbGxuZXNzOiBUaXBzIFRoYXQgQWN0dWFsbHkgV29yaydcclxuICAgICAgfVxyXG4gICAgXVxyXG4gIH07XHJcbiAgXHJcbiAgcmV0dXJuIHRlbXBsYXRlc1t0b3BpYy50b0xvd2VyQ2FzZSgpXSB8fCB0ZW1wbGF0ZXMuZWR1Y2F0aW9uO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRUb3BpY0tleXdvcmRzKHRvcGljOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgY29uc3Qga2V5d29yZHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuICAgIGludmVzdGluZzogWydwb3J0Zm9saW8nLCAnc3RvY2tzJywgJ0VURicsICdkaXZpZGVuZHMnLCAncmlzaycsICdyZXR1cm5zJywgJ2RpdmVyc2lmaWNhdGlvbicsICdjb21wb3VuZCddLFxyXG4gICAgZWR1Y2F0aW9uOiBbJ2xlYXJuaW5nJywgJ3N0dWR5JywgJ3NraWxscycsICdrbm93bGVkZ2UnLCAndHV0b3JpYWwnLCAndGlwcycsICdtZXRob2RzJywgJ3N1Y2Nlc3MnXSxcclxuICAgIHRvdXJpc206IFsndHJhdmVsJywgJ2Rlc3RpbmF0aW9ucycsICdjdWx0dXJlJywgJ2FkdmVudHVyZScsICdidWRnZXQnLCAncGxhbm5pbmcnLCAnZXhwZXJpZW5jZXMnLCAnZ3VpZGUnXSxcclxuICAgIHRlY2hub2xvZ3k6IFsnaW5ub3ZhdGlvbicsICdkaWdpdGFsJywgJ3NvZnR3YXJlJywgJ2Z1dHVyZScsICd0cmVuZHMnLCAnZGV2ZWxvcG1lbnQnLCAnc29sdXRpb25zJywgJ3RlY2gnXSxcclxuICAgIGhlYWx0aDogWyd3ZWxsbmVzcycsICdmaXRuZXNzJywgJ251dHJpdGlvbicsICdsaWZlc3R5bGUnLCAnZXhlcmNpc2UnLCAnbWVudGFsJywgJ2hhYml0cycsICdoZWFsdGh5J10sXHJcbiAgICBmaW5hbmNlOiBbJ21vbmV5JywgJ2J1ZGdldCcsICdzYXZpbmdzJywgJ3BsYW5uaW5nJywgJ3dlYWx0aCcsICdmaW5hbmNpYWwnLCAnbWFuYWdlbWVudCcsICdnb2FscyddXHJcbiAgfTtcclxuICBcclxuICByZXR1cm4ga2V5d29yZHNbdG9waWMudG9Mb3dlckNhc2UoKV0gfHwgWydndWlkZScsICd0aXBzJywgJ3R1dG9yaWFsJywgJ2JlZ2lubmVycycsICdlc3NlbnRpYWwnLCAnY29tcGxldGUnXTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0S2V5d29yZEJhc2VkUHJvbXB0KHRvcGljOiBzdHJpbmcsIGtleXdvcmRzOiBzdHJpbmdbXSk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGBDcmVhdGUgYSBjb21wcmVoZW5zaXZlIGVkdWNhdGlvbmFsIHZpZGVvIGFib3V0ICR7dG9waWN9IGZvY3VzaW5nIG9uICR7a2V5d29yZHMuc2xpY2UoMCwgNSkuam9pbignLCAnKX0uIFxyXG4gICAgUHJvdmlkZSB2YWx1YWJsZSBpbnNpZ2h0cyBhbmQgcHJhY3RpY2FsIGFkdmljZSB0aGF0IHZpZXdlcnMgY2FuIGltbWVkaWF0ZWx5IGFwcGx5LiBcclxuICAgIFN0cnVjdHVyZSB0aGUgY29udGVudCB0byBiZSBlbmdhZ2luZywgaW5mb3JtYXRpdmUsIGFuZCBhY2Nlc3NpYmxlIHRvIGJlZ2lubmVycyB3aGlsZSBvZmZlcmluZyB2YWx1ZSB0byBtb3JlIGV4cGVyaWVuY2VkIGF1ZGllbmNlcy4gXHJcbiAgICBJbmNsdWRlIHJlYWwtd29ybGQgZXhhbXBsZXMgYW5kIGFjdGlvbmFibGUgc3RlcHMgdGhyb3VnaG91dCB0aGUgcHJlc2VudGF0aW9uLmA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEdlbmVyaWNQcm9tcHQodG9waWM6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGBDcmVhdGUgYW4gZWR1Y2F0aW9uYWwgdmlkZW8gYWJvdXQgJHt0b3BpY30gdGhhdCBjb3ZlcnMgdGhlIGZ1bmRhbWVudGFsIGNvbmNlcHRzIGFuZCBwcmFjdGljYWwgYXBwbGljYXRpb25zLiBcclxuICAgIFByb3ZpZGUgYSBjb21wcmVoZW5zaXZlIG92ZXJ2aWV3IHRoYXQgaXMgYWNjZXNzaWJsZSB0byBiZWdpbm5lcnMgd2hpbGUgb2ZmZXJpbmcgdmFsdWFibGUgaW5zaWdodHMuIFxyXG4gICAgSW5jbHVkZSBwcmFjdGljYWwgdGlwcywgY29tbW9uIG1pc2NvbmNlcHRpb25zLCBhbmQgYWN0aW9uYWJsZSBhZHZpY2UgdGhhdCB2aWV3ZXJzIGNhbiBpbXBsZW1lbnQuIFxyXG4gICAgTWFrZSB0aGUgY29udGVudCBlbmdhZ2luZyBhbmQgaW5mb3JtYXRpdmUgd2l0aCBjbGVhciBleHBsYW5hdGlvbnMgYW5kIHJlYWwtd29ybGQgZXhhbXBsZXMuYDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVLZXl3b3JkQmFzZWRUaXRsZSh0b3BpYzogc3RyaW5nLCBrZXl3b3Jkczogc3RyaW5nW10pOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRvcEtleXdvcmRzID0ga2V5d29yZHMuc2xpY2UoMCwgMik7XHJcbiAgY29uc3QgdGVtcGxhdGVzID0gW1xyXG4gICAgYCR7dG9wS2V5d29yZHMuam9pbignICYgJyl9IGluICR7dG9waWN9OiBDb21wbGV0ZSBHdWlkZWAsXHJcbiAgICBgTWFzdGVyICR7dG9waWN9OiAke3RvcEtleXdvcmRzWzBdfSBUaXBzIFRoYXQgV29ya2AsXHJcbiAgICBgJHt0b3BpY30gU3VjY2VzczogJHt0b3BLZXl3b3Jkcy5qb2luKCcgYW5kICcpfSBFeHBsYWluZWRgLFxyXG4gICAgYEVzc2VudGlhbCAke3RvcGljfTogJHt0b3BLZXl3b3Jkc1swXX0gU3RyYXRlZ2llc2BcclxuICBdO1xyXG4gIFxyXG4gIHJldHVybiB0ZW1wbGF0ZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGVtcGxhdGVzLmxlbmd0aCldXHJcbiAgICAucmVwbGFjZSh0b3BpYywgdG9waWMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0b3BpYy5zbGljZSgxKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlRmFsbGJhY2tLZXl3b3Jkcyh0b3BpYzogc3RyaW5nLCBleGlzdGluZ0tleXdvcmRzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBiYXNlS2V5d29yZHMgPSBbdG9waWMsICdndWlkZScsICd0aXBzJywgJ3R1dG9yaWFsJywgJ2JlZ2lubmVycyddO1xyXG4gIGNvbnN0IHRvcGljU3BlY2lmaWMgPSBnZXRUb3BpY0tleXdvcmRzKHRvcGljKTtcclxuICBcclxuICByZXR1cm4gWy4uLm5ldyBTZXQoWy4uLmJhc2VLZXl3b3JkcywgLi4uZXhpc3RpbmdLZXl3b3JkcywgLi4udG9waWNTcGVjaWZpY10pXS5zbGljZSgwLCAxMik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlRmFsbGJhY2tTRU9NZXRhZGF0YSh0b3BpYzogc3RyaW5nLCBrZXl3b3Jkczogc3RyaW5nW10sIHRpdGxlOiBzdHJpbmcpOiB7XHJcbiAgZGVzY3JpcHRpb246IHN0cmluZztcclxuICB0YWdzOiBzdHJpbmdbXTtcclxuICBjYXRlZ29yeTogc3RyaW5nO1xyXG59IHtcclxuICBjb25zdCBkZXNjcmlwdGlvbiA9IGBMZWFybiBhYm91dCAke2tleXdvcmRzLnNsaWNlKDAsIDMpLmpvaW4oJywgJyl9IGluIHRoaXMgY29tcHJlaGVuc2l2ZSAke3RvcGljfSBndWlkZS4gXHJcbiAgICBHZXQgcHJhY3RpY2FsIHRpcHMgYW5kIGV4cGVydCBpbnNpZ2h0cyB0byBpbXByb3ZlIHlvdXIgJHt0b3BpY30ga25vd2xlZGdlIGFuZCBza2lsbHMuYC5zdWJzdHJpbmcoMCwgMTU1KTtcclxuICBcclxuICBjb25zdCB0YWdzID0gWy4uLm5ldyBTZXQoW3RvcGljLCBgJHt0b3BpY31ndWlkZWAsIGAke3RvcGljfXRpcHNgLCAuLi5rZXl3b3Jkcy5zbGljZSgwLCA4KV0pXS5zbGljZSgwLCAxMik7XHJcbiAgXHJcbiAgY29uc3QgY2F0ZWdvcnlNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICBpbnZlc3Rpbmc6ICcyNScsIC8vIE5ld3MgJiBQb2xpdGljc1xyXG4gICAgZWR1Y2F0aW9uOiAnMjcnLCAvLyBFZHVjYXRpb25cclxuICAgIHRvdXJpc206ICcxOScsIC8vIFRyYXZlbCAmIEV2ZW50c1xyXG4gICAgdGVjaG5vbG9neTogJzI4JywgLy8gU2NpZW5jZSAmIFRlY2hub2xvZ3lcclxuICAgIGhlYWx0aDogJzI2JywgLy8gSG93dG8gJiBTdHlsZVxyXG4gICAgZmluYW5jZTogJzI1JyAvLyBOZXdzICYgUG9saXRpY3NcclxuICB9O1xyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICBkZXNjcmlwdGlvbixcclxuICAgIHRhZ3MsXHJcbiAgICBjYXRlZ29yeTogY2F0ZWdvcnlNYXBbdG9waWMudG9Mb3dlckNhc2UoKV0gfHwgJzI3J1xyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUdlbmVyaWNUcmVuZCh0b3BpYzogc3RyaW5nKTogYW55IHtcclxuICByZXR1cm4ge1xyXG4gICAgdmlkZW9JZDogYGdlbmVyaWNfJHt0b3BpY31fJHtEYXRlLm5vdygpfWAsXHJcbiAgICB0aXRsZTogYEVzc2VudGlhbCAke3RvcGljLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdG9waWMuc2xpY2UoMSl9IEd1aWRlYCxcclxuICAgIHZpZXdDb3VudDogMjUwMDAsXHJcbiAgICBsaWtlQ291bnQ6IDEyNTAsXHJcbiAgICBjb21tZW50Q291bnQ6IDE4MCxcclxuICAgIGVuZ2FnZW1lbnRSYXRlOiA1LjcyLFxyXG4gICAgZW5nYWdlbWVudFNjb3JlOiAwLjA1NyxcclxuICAgIGtleXdvcmRzOiBnZXRUb3BpY0tleXdvcmRzKHRvcGljKSxcclxuICAgIGNhdGVnb3J5SWQ6ICcyNycsXHJcbiAgICBwdWJsaXNoZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgY2hhbm5lbFRpdGxlOiBgJHt0b3BpY30gQWNhZGVteWAsXHJcbiAgICBjaGFubmVsSWQ6IGBnZW5lcmljXyR7dG9waWN9YFxyXG4gIH07XHJcbn0iXX0=