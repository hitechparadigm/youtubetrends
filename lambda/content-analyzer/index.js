"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const handler = async (event, context) => {
    const startTime = Date.now();
    console.log('Content Analyzer Lambda started', {
        requestId: context.awsRequestId,
        topic: event.topic,
        trendsCount: event.trendsData?.length || 0
    });
    try {
        // Analyze and filter trends
        const selectedTrends = await analyzeTrends(event.trendsData, event.minEngagementScore || 0.02, event.maxVideos || 3);
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
    }
    catch (error) {
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
exports.handler = handler;
async function analyzeTrends(trends, minEngagementScore, maxVideos) {
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
function calculateTrendScore(trend) {
    const recencyScore = getRecencyScore(trend.timestamp);
    const engagementScore = trend.engagementScore * 100;
    const viewScore = Math.log10(trend.viewCount) / 10;
    return (engagementScore * 0.5) + (recencyScore * 0.3) + (viewScore * 0.2);
}
function getRecencyScore(timestamp) {
    const trendTime = new Date(timestamp).getTime();
    const now = Date.now();
    const hoursAgo = (now - trendTime) / (1000 * 60 * 60);
    // Score decreases as content gets older
    if (hoursAgo <= 6)
        return 1.0;
    if (hoursAgo <= 12)
        return 0.8;
    if (hoursAgo <= 24)
        return 0.6;
    if (hoursAgo <= 48)
        return 0.4;
    return 0.2;
}
function isWithinHours(timestamp, hours) {
    const trendTime = new Date(timestamp).getTime();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return trendTime >= cutoff;
}
async function generateScriptPrompts(topic, trends) {
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
function getTopicPrompts(topic) {
    const topicPrompts = {
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
function generateVideoTitle(topic, trend, keywords) {
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
    const topicTemplates = templates[topic.toLowerCase()] || templates.education;
    const selectedTemplate = topicTemplates[Math.floor(Math.random() * topicTemplates.length)];
    // Ensure title is under 60 characters for SEO
    return selectedTemplate.length > 60 ? selectedTemplate.substring(0, 57) + '...' : selectedTemplate;
}
function calculateEstimatedLength(topic, trend) {
    // Base length in seconds
    let baseLength = 480; // 8 minutes default
    // Adjust based on topic complexity
    const topicMultipliers = {
        investing: 1.2,
        education: 1.1,
        technology: 1.0,
        tourism: 0.9,
        health: 1.0
    };
    const multiplier = topicMultipliers[topic.toLowerCase()] || 1.0;
    // Adjust based on engagement (higher engagement = longer content works)
    const engagementMultiplier = Math.min(1.3, 0.8 + (trend.engagementScore * 10));
    return Math.round(baseLength * multiplier * engagementMultiplier);
}
async function enhanceKeywords(originalKeywords, topic, title) {
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
function extractKeywordsFromText(text) {
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
function isStopWord(word) {
    const stopWords = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'this', 'that', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'
    ]);
    return stopWords.has(word.toLowerCase());
}
function generateSEOKeywords(keywords, topic) {
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
function generateSEOMetadata(title, keywords, topic, trend) {
    const description = generateSEODescription(title, keywords, topic, trend);
    const tags = generateSEOTags(keywords, topic);
    const category = mapTopicToYouTubeCategory(topic);
    return { description, tags, category };
}
function generateSEODescription(title, keywords, topic, trend) {
    const templates = {
        investing: `Learn about ${keywords.slice(0, 3).join(', ')} in this comprehensive ${topic} guide. Discover proven strategies and expert insights to improve your investment knowledge. Perfect for beginners and experienced investors alike.`,
        education: `Master ${keywords.slice(0, 3).join(', ')} with this detailed ${topic} tutorial. Get practical tips, study strategies, and actionable advice to accelerate your learning journey.`,
        tourism: `Explore amazing ${keywords.slice(0, 3).join(', ')} destinations in this ${topic} guide. Discover hidden gems, travel tips, and cultural insights for your next adventure.`,
        technology: `Understand ${keywords.slice(0, 3).join(', ')} in this ${topic} explanation. Learn about the latest innovations, practical applications, and future trends in technology.`,
        health: `Improve your health with this ${topic} guide covering ${keywords.slice(0, 3).join(', ')}. Get evidence-based tips, wellness strategies, and practical advice for better living.`,
        finance: `Master ${keywords.slice(0, 3).join(', ')} with this comprehensive ${topic} guide. Learn practical strategies for financial success and wealth building.`
    };
    const template = templates[topic.toLowerCase()] || templates.education;
    return template.substring(0, 155); // YouTube description limit
}
function generateSEOTags(keywords, topic) {
    const baseTags = [topic, `${topic}guide`, `${topic}tips`, `${topic}tutorial`];
    const keywordTags = keywords.slice(0, 8);
    const combinedTags = keywords.slice(0, 4).map(k => `${k}${topic}`);
    return [...baseTags, ...keywordTags, ...combinedTags].slice(0, 15);
}
function mapTopicToYouTubeCategory(topic) {
    const categoryMap = {
        investing: '25',
        education: '27',
        tourism: '19',
        technology: '28',
        health: '26',
        finance: '25',
        entertainment: '24' // Entertainment
    };
    return categoryMap[topic.toLowerCase()] || '27'; // Default to Education
}
async function storeAnalysisResults(topic, trends, prompts) {
    // Skip DynamoDB storage if in test mode (table name is 'mock-table')
    if (process.env.CONTENT_ANALYSIS_TABLE === 'mock-table') {
        console.log('Skipping DynamoDB storage in test mode');
        return;
    }
    try {
        const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
        const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
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
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.CONTENT_ANALYSIS_TABLE || 'ContentAnalysis',
            Item: analysisResult
        }));
        console.log('Analysis results stored successfully', {
            analysisId: analysisResult.analysisId,
            trendsCount: trends.length,
            promptsCount: prompts.length
        });
    }
    catch (error) {
        console.error('Failed to store analysis results', error);
        // Don't throw - storage failure shouldn't fail the main function
    }
}
function calculateKeywordDiversity(trends) {
    const allKeywords = trends.flatMap(t => t.keywords);
    const uniqueKeywords = new Set(allKeywords);
    return allKeywords.length > 0 ? uniqueKeywords.size / allKeywords.length : 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4REFBMEQ7QUFDMUQsd0RBQXlGO0FBNkNsRixNQUFNLE9BQU8sR0FBMkQsS0FBSyxFQUNsRixLQUEyQixFQUMzQixPQUFnQixFQUNrQixFQUFFO0lBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxFQUFFO1FBQzdDLFNBQVMsRUFBRSxPQUFPLENBQUMsWUFBWTtRQUMvQixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7UUFDbEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUM7S0FDM0MsQ0FBQyxDQUFDO0lBRUgsSUFBSTtRQUNGLDRCQUE0QjtRQUM1QixNQUFNLGNBQWMsR0FBRyxNQUFNLGFBQWEsQ0FDeEMsS0FBSyxDQUFDLFVBQVUsRUFDaEIsS0FBSyxDQUFDLGtCQUFrQixJQUFJLElBQUksRUFDaEMsS0FBSyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQ3JCLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksY0FBYyxDQUFDLE1BQU0sZ0NBQWdDLENBQUMsQ0FBQztRQUUvRSxrREFBa0Q7UUFDbEQsTUFBTSxhQUFhLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRS9FLHlCQUF5QjtRQUN6QixNQUFNLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXZFLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLEVBQUU7WUFDckQsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ2xCLGNBQWMsRUFBRSxjQUFjLENBQUMsTUFBTTtZQUNyQyxhQUFhLEVBQUUsYUFBYSxDQUFD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QUFVLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsc0JBQXNCO1NBQzFELEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLElBQVk7SUFDOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDeEIsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTTtLQUNq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eUIsQ0FBQyxNQUFNLENBQUM7YUFDcEQ7U0FDRixDQUFDO1FBRUYsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUkseUJBQVUsQ0FBQztZQUNsQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxpQkFBaUI7WUFDbEUsSUFBSSxFQUFFLGNBQWM7U0FDckIsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxFQUFFO1lBQ2xELFVBQVUsRUFBRSxjQUFjLENBQUMsVUFBVTtZQUNyQyxXQUFXLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDMUIsWUFBWSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1NBQzdCLENBQUMsQ0FBQztLQUNKO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pELGlFQUFpRTtLQUNsRTtBQUNILENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLE1BQW1CO0lBQ3BELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDNUMsT0FBTyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEhhbmRsZXIsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5cclxuLy8gTG9jYWwgaW50ZXJmYWNlcyB0byBhdm9pZCBpbXBvcnQgaXNzdWVzXHJcbmludGVyZmFjZSBUcmVuZERhdGEge1xyXG4gIHRvcGljOiBzdHJpbmc7XHJcbiAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbiAgdmlkZW9JZDogc3RyaW5nO1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgdmlld0NvdW50OiBudW1iZXI7XHJcbiAgbGlrZUNvdW50OiBudW1iZXI7XHJcbiAgY29tbWVudENvdW50OiBudW1iZXI7XHJcbiAgZW5nYWdlbWVudFJhdGU6IG51bWJlcjtcclxuICBlbmdhZ2VtZW50U2NvcmU6IG51bWJlcjtcclxuICBrZXl3b3Jkczogc3RyaW5nW107XHJcbiAgY2F0ZWdvcnlJZDogc3RyaW5nO1xyXG4gIHB1Ymxpc2hlZEF0OiBzdHJpbmc7XHJcbiAgY2hhbm5lbFRpdGxlOiBzdHJpbmc7XHJcbiAgY2hhbm5lbElkOiBzdHJpbmc7XHJcbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbiAgZHVyYXRpb24/OiBzdHJpbmc7XHJcbiAgdGh1bWJuYWlsVXJsPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbnRlbnRBbmFseXplckV2ZW50IHtcclxuICB0b3BpYzogc3RyaW5nO1xyXG4gIHRyZW5kc0RhdGE6IFRyZW5kRGF0YVtdO1xyXG4gIG1heFZpZGVvcz86IG51bWJlcjtcclxuICBtaW5FbmdhZ2VtZW50U2NvcmU/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGVudEFuYWx5emVyUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgdG9waWM6IHN0cmluZztcclxuICBzZWxlY3RlZFRyZW5kczogVHJlbmREYXRhW107XHJcbiAgc2NyaXB0UHJvbXB0czogQXJyYXk8e1xyXG4gICAgdHJlbmRJZDogc3RyaW5nO1xyXG4gICAgdGl0bGU6IHN0cmluZztcclxuICAgIHByb21wdDogc3RyaW5nO1xyXG4gICAga2V5d29yZHM6IHN0cmluZ1tdO1xyXG4gICAgZXN0aW1hdGVkTGVuZ3RoOiBudW1iZXI7XHJcbiAgfT47XHJcbiAgZXhlY3V0aW9uVGltZTogbnVtYmVyO1xyXG4gIGVycm9yPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogSGFuZGxlcjxDb250ZW50QW5hbHl6ZXJFdmVudCwgQ29udGVudEFuYWx5emVyUmVzcG9uc2U+ID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBDb250ZW50QW5hbHl6ZXJFdmVudCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8Q29udGVudEFuYWx5emVyUmVzcG9uc2U+ID0+IHtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIFxyXG4gIGNvbnNvbGUubG9nKCdDb250ZW50IEFuYWx5emVyIExhbWJkYSBzdGFydGVkJywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIHRvcGljOiBldmVudC50b3BpYyxcclxuICAgIHRyZW5kc0NvdW50OiBldmVudC50cmVuZHNEYXRhPy5sZW5ndGggfHwgMFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gQW5hbHl6ZSBhbmQgZmlsdGVyIHRyZW5kc1xyXG4gICAgY29uc3Qgc2VsZWN0ZWRUcmVuZHMgPSBhd2FpdCBhbmFseXplVHJlbmRzKFxyXG4gICAgICBldmVudC50cmVuZHNEYXRhLFxyXG4gICAgICBldmVudC5taW5FbmdhZ2VtZW50U2NvcmUgfHwgMC4wMixcclxuICAgICAgZXZlbnQubWF4VmlkZW9zIHx8IDNcclxuICAgICk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFNlbGVjdGVkICR7c2VsZWN0ZWRUcmVuZHMubGVuZ3RofSB0cmVuZHMgZm9yIGNvbnRlbnQgZ2VuZXJhdGlvbmApO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHNjcmlwdCBwcm9tcHRzIGZvciBlYWNoIHNlbGVjdGVkIHRyZW5kXHJcbiAgICBjb25zdCBzY3JpcHRQcm9tcHRzID0gYXdhaXQgZ2VuZXJhdGVTY3JpcHRQcm9tcHRzKGV2ZW50LnRvcGljLCBzZWxlY3RlZFRyZW5kcyk7XHJcblxyXG4gICAgLy8gU3RvcmUgYW5hbHlzaXMgcmVzdWx0c1xyXG4gICAgYXdhaXQgc3RvcmVBbmFseXNpc1Jlc3VsdHMoZXZlbnQudG9waWMsIHNlbGVjdGVkVHJlbmRzLCBzY3JpcHRQcm9tcHRzKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnQ29udGVudCBhbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICB0b3BpYzogZXZlbnQudG9waWMsXHJcbiAgICAgIHNlbGVjdGVkVHJlbmRzOiBzZWxlY3RlZFRyZW5kcy5sZW5ndGgsXHJcbiAgICAgIHNjcmlwdFByb21wdHM6IHNjcmlwdFByb21wdHMubGVuZ3RoLFxyXG4gICAgICBleGVjdXRpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICB0b3BpYzogZXZlbnQudG9waWMsXHJcbiAgICAgIHNlbGVjdGVkVHJlbmRzLFxyXG4gICAgICBzY3JpcHRQcm9tcHRzLFxyXG4gICAgICBleGVjdXRpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignQ29udGVudCBhbmFseXNpcyBmYWlsZWQnLCB7XHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgIHN0YWNrOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiB1bmRlZmluZWQsXHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWRcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICB0b3BpYzogZXZlbnQudG9waWMsXHJcbiAgICAgIHNlbGVjdGVkVHJlbmRzOiBbXSxcclxuICAgICAgc2NyaXB0UHJvbXB0czogW10sXHJcbiAgICAgIGV4ZWN1dGlvblRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZVRyZW5kcyhcclxuICB0cmVuZHM6IFRyZW5kRGF0YVtdLFxyXG4gIG1pbkVuZ2FnZW1lbnRTY29yZTogbnVtYmVyLFxyXG4gIG1heFZpZGVvczogbnVtYmVyXHJcbik6IFByb21pc2U8VHJlbmREYXRhW10+IHtcclxuICAvLyBGaWx0ZXIgdHJlbmRzIGJhc2VkIG9uIGVuZ2FnZW1lbnQgc2NvcmUgYW5kIHJlY2VuY3lcclxuICBjb25zdCBmaWx0ZXJlZFRyZW5kcyA9IHRyZW5kcy5maWx0ZXIodHJlbmQgPT4ge1xyXG4gICAgY29uc3QgaXNSZWNlbnRFbm91Z2ggPSBpc1dpdGhpbkhvdXJzKHRyZW5kLnRpbWVzdGFtcCwgNDgpOyAvLyBXaXRoaW4gNDggaG91cnNcclxuICAgIGNvbnN0IGhhc0dvb2RFbmdhZ2VtZW50ID0gdHJlbmQuZW5nYWdlbWVudFNjb3JlID49IG1pbkVuZ2FnZW1lbnRTY29yZTtcclxuICAgIGNvbnN0IGhhc01pbmltdW1WaWV3cyA9IHRyZW5kLnZpZXdDb3VudCA+PSAxMDAwO1xyXG4gICAgXHJcbiAgICByZXR1cm4gaXNSZWNlbnRFbm91Z2ggJiYgaGFzR29vZEVuZ2FnZW1lbnQgJiYgaGFzTWluaW11bVZpZXdzO1xyXG4gIH0pO1xyXG5cclxuICAvLyBTb3J0IGJ5IGVuZ2FnZW1lbnQgc2NvcmUgYW5kIHJlY2VuY3lcclxuICBjb25zdCBzb3J0ZWRUcmVuZHMgPSBmaWx0ZXJlZFRyZW5kcy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICBjb25zdCBzY29yZUEgPSBjYWxjdWxhdGVUcmVuZFNjb3JlKGEpO1xyXG4gICAgY29uc3Qgc2NvcmVCID0gY2FsY3VsYXRlVHJlbmRTY29yZShiKTtcclxuICAgIHJldHVybiBzY29yZUIgLSBzY29yZUE7XHJcbiAgfSk7XHJcblxyXG4gIC8vIFJldHVybiB0b3AgdHJlbmRzIHVwIHRvIG1heFZpZGVvcyBsaW1pdFxyXG4gIHJldHVybiBzb3J0ZWRUcmVuZHMuc2xpY2UoMCwgbWF4VmlkZW9zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY3VsYXRlVHJlbmRTY29yZSh0cmVuZDogVHJlbmREYXRhKTogbnVtYmVyIHtcclxuICBjb25zdCByZWNlbmN5U2NvcmUgPSBnZXRSZWNlbmN5U2NvcmUodHJlbmQudGltZXN0YW1wKTtcclxuICBjb25zdCBlbmdhZ2VtZW50U2NvcmUgPSB0cmVuZC5lbmdhZ2VtZW50U2NvcmUgKiAxMDA7XHJcbiAgY29uc3Qgdmlld1Njb3JlID0gTWF0aC5sb2cxMCh0cmVuZC52aWV3Q291bnQpIC8gMTA7XHJcbiAgXHJcbiAgcmV0dXJuIChlbmdhZ2VtZW50U2NvcmUgKiAwLjUpICsgKHJlY2VuY3lTY29yZSAqIDAuMykgKyAodmlld1Njb3JlICogMC4yKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UmVjZW5jeVNjb3JlKHRpbWVzdGFtcDogc3RyaW5nKTogbnVtYmVyIHtcclxuICBjb25zdCB0cmVuZFRpbWUgPSBuZXcgRGF0ZSh0aW1lc3RhbXApLmdldFRpbWUoKTtcclxuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gIGNvbnN0IGhvdXJzQWdvID0gKG5vdyAtIHRyZW5kVGltZSkgLyAoMTAwMCAqIDYwICogNjApO1xyXG4gIFxyXG4gIC8vIFNjb3JlIGRlY3JlYXNlcyBhcyBjb250ZW50IGdldHMgb2xkZXJcclxuICBpZiAoaG91cnNBZ28gPD0gNikgcmV0dXJuIDEuMDtcclxuICBpZiAoaG91cnNBZ28gPD0gMTIpIHJldHVybiAwLjg7XHJcbiAgaWYgKGhvdXJzQWdvIDw9IDI0KSByZXR1cm4gMC42O1xyXG4gIGlmIChob3Vyc0FnbyA8PSA0OCkgcmV0dXJuIDAuNDtcclxuICByZXR1cm4gMC4yO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1dpdGhpbkhvdXJzKHRpbWVzdGFtcDogc3RyaW5nLCBob3VyczogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgY29uc3QgdHJlbmRUaW1lID0gbmV3IERhdGUodGltZXN0YW1wKS5nZXRUaW1lKCk7XHJcbiAgY29uc3QgY3V0b2ZmID0gRGF0ZS5ub3coKSAtIChob3VycyAqIDYwICogNjAgKiAxMDAwKTtcclxuICByZXR1cm4gdHJlbmRUaW1lID49IGN1dG9mZjtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVTY3JpcHRQcm9tcHRzKFxyXG4gIHRvcGljOiBzdHJpbmcsXHJcbiAgdHJlbmRzOiBUcmVuZERhdGFbXVxyXG4pOiBQcm9taXNlPEFycmF5PHtcclxuICB0cmVuZElkOiBzdHJpbmc7XHJcbiAgdGl0bGU6IHN0cmluZztcclxuICBwcm9tcHQ6IHN0cmluZztcclxuICBrZXl3b3Jkczogc3RyaW5nW107XHJcbiAgZXN0aW1hdGVkTGVuZ3RoOiBudW1iZXI7XHJcbiAgdG9waWM6IHN0cmluZztcclxuICBzZW9NZXRhZGF0YToge1xyXG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgIHRhZ3M6IHN0cmluZ1tdO1xyXG4gICAgY2F0ZWdvcnk6IHN0cmluZztcclxuICB9O1xyXG59Pj4ge1xyXG4gIGNvbnN0IHByb21wdHMgPSBbXTtcclxuXHJcbiAgZm9yIChjb25zdCB0cmVuZCBvZiB0cmVuZHMpIHtcclxuICAgIGNvbnN0IHRvcGljUHJvbXB0cyA9IGdldFRvcGljUHJvbXB0cyh0b3BpYyk7XHJcbiAgICBjb25zdCBlbmhhbmNlZEtleXdvcmRzID0gYXdhaXQgZW5oYW5jZUtleXdvcmRzKHRyZW5kLmtleXdvcmRzLCB0b3BpYywgdHJlbmQudGl0bGUpO1xyXG4gICAgY29uc3Qgc2VvS2V5d29yZHMgPSBnZW5lcmF0ZVNFT0tleXdvcmRzKGVuaGFuY2VkS2V5d29yZHMsIHRvcGljKTtcclxuICAgIFxyXG4gICAgY29uc3QgcHJvbXB0ID0gdG9waWNQcm9tcHRzLnNjcmlwdFRlbXBsYXRlXHJcbiAgICAgIC5yZXBsYWNlKCd7dG9waWN9JywgdG9waWMpXHJcbiAgICAgIC5yZXBsYWNlKCd7dGl0bGV9JywgdHJlbmQudGl0bGUpXHJcbiAgICAgIC5yZXBsYWNlKCd7a2V5d29yZHN9JywgZW5oYW5jZWRLZXl3b3Jkcy5qb2luKCcsICcpKVxyXG4gICAgICAucmVwbGFjZSgne3ZpZXdDb3VudH0nLCB0cmVuZC52aWV3Q291bnQudG9Mb2NhbGVTdHJpbmcoKSlcclxuICAgICAgLnJlcGxhY2UoJ3tlbmdhZ2VtZW50fScsICh0cmVuZC5lbmdhZ2VtZW50UmF0ZSAqIDEwMCkudG9GaXhlZCgxKSlcclxuICAgICAgLnJlcGxhY2UoJ3tjaGFubmVsVGl0bGV9JywgdHJlbmQuY2hhbm5lbFRpdGxlKTtcclxuXHJcbiAgICBjb25zdCBlc3RpbWF0ZWRMZW5ndGggPSBjYWxjdWxhdGVFc3RpbWF0ZWRMZW5ndGgodG9waWMsIHRyZW5kKTtcclxuICAgIGNvbnN0IHZpZGVvVGl0bGUgPSBnZW5lcmF0ZVZpZGVvVGl0bGUodG9waWMsIHRyZW5kLCBlbmhhbmNlZEtleXdvcmRzKTtcclxuICAgIGNvbnN0IHNlb01ldGFkYXRhID0gZ2VuZXJhdGVTRU9NZXRhZGF0YSh2aWRlb1RpdGxlLCBlbmhhbmNlZEtleXdvcmRzLCB0b3BpYywgdHJlbmQpO1xyXG5cclxuICAgIHByb21wdHMucHVzaCh7XHJcbiAgICAgIHRyZW5kSWQ6IHRyZW5kLnZpZGVvSWQsXHJcbiAgICAgIHRpdGxlOiB2aWRlb1RpdGxlLFxyXG4gICAgICBwcm9tcHQsXHJcbiAgICAgIGtleXdvcmRzOiBzZW9LZXl3b3JkcyxcclxuICAgICAgZXN0aW1hdGVkTGVuZ3RoLFxyXG4gICAgICB0b3BpYzogdG9waWMsXHJcbiAgICAgIHNlb01ldGFkYXRhXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHJldHVybiBwcm9tcHRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRUb3BpY1Byb21wdHModG9waWM6IHN0cmluZyk6IHsgc2NyaXB0VGVtcGxhdGU6IHN0cmluZzsgdGl0bGVUZW1wbGF0ZTogc3RyaW5nIH0ge1xyXG4gIGNvbnN0IHRvcGljUHJvbXB0czogUmVjb3JkPHN0cmluZywgeyBzY3JpcHRUZW1wbGF0ZTogc3RyaW5nOyB0aXRsZVRlbXBsYXRlOiBzdHJpbmcgfT4gPSB7XHJcbiAgICBpbnZlc3Rpbmc6IHtcclxuICAgICAgc2NyaXB0VGVtcGxhdGU6IGBDcmVhdGUgYSBjb21wcmVoZW5zaXZlIGVkdWNhdGlvbmFsIHZpZGVvIGFib3V0IHt0b3BpY30gaW5zcGlyZWQgYnkgdGhlIHRyZW5kaW5nIGNvbnRlbnQgXCJ7dGl0bGV9XCIgZnJvbSB7Y2hhbm5lbFRpdGxlfS4gXHJcbiAgICAgICAgVGhpcyB2aWRlbyBzaG91bGQgZXhwbGFpbiBrZXkgaW52ZXN0bWVudCBjb25jZXB0cyBpbmNsdWRpbmcge2tleXdvcmRzfSBpbiBjbGVhciwgYmVnaW5uZXItZnJpZW5kbHkgbGFuZ3VhZ2Ugd2hpbGUgcHJvdmlkaW5nIGFjdGlvbmFibGUgaW5zaWdodHMuXHJcbiAgICAgICAgXHJcbiAgICAgICAgU3RydWN0dXJlIHRoZSB2aWRlbyB0byBjb3ZlcjpcclxuICAgICAgICAxLiBJbnRyb2R1Y3Rpb24gdG8gdGhlIHRyZW5kaW5nIHRvcGljIGFuZCB3aHkgaXQgbWF0dGVycyBmb3IgaW52ZXN0b3JzXHJcbiAgICAgICAgMi4gRGV0YWlsZWQgZXhwbGFuYXRpb24gb2Yge2tleXdvcmRzfSB3aXRoIHJlYWwtd29ybGQgZXhhbXBsZXNcclxuICAgICAgICAzLiBQcmFjdGljYWwgaW52ZXN0bWVudCBzdHJhdGVnaWVzIGFuZCBwb3J0Zm9saW8gY29uc2lkZXJhdGlvbnNcclxuICAgICAgICA0LiBSaXNrIG1hbmFnZW1lbnQgYW5kIGRpdmVyc2lmaWNhdGlvbiBwcmluY2lwbGVzXHJcbiAgICAgICAgNS4gQWN0aW9uYWJsZSBzdGVwcyB2aWV3ZXJzIGNhbiB0YWtlIGltbWVkaWF0ZWx5XHJcbiAgICAgICAgXHJcbiAgICAgICAgVGhlIG9yaWdpbmFsIGNvbnRlbnQgaGFzIHt2aWV3Q291bnR9IHZpZXdzIHdpdGgge2VuZ2FnZW1lbnR9JSBlbmdhZ2VtZW50LCBpbmRpY2F0aW5nIHN0cm9uZyBhdWRpZW5jZSBpbnRlcmVzdC4gXHJcbiAgICAgICAgTWFrZSB0aGlzIGVkdWNhdGlvbmFsLCB0cnVzdHdvcnRoeSwgYW5kIGVuZ2FnaW5nIHdoaWxlIGF2b2lkaW5nIGZpbmFuY2lhbCBhZHZpY2UgZGlzY2xhaW1lcnMuIFxyXG4gICAgICAgIEZvY3VzIG9uIGVkdWNhdGlvbiBhbmQgZ2VuZXJhbCBwcmluY2lwbGVzIHJhdGhlciB0aGFuIHNwZWNpZmljIGludmVzdG1lbnQgcmVjb21tZW5kYXRpb25zLmAsXHJcbiAgICAgIHRpdGxlVGVtcGxhdGU6ICdFc3NlbnRpYWwge3RvcGljfSBHdWlkZToge2tleXdvcmRzfSBFeHBsYWluZWQgZm9yIEJlZ2lubmVycydcclxuICAgIH0sXHJcbiAgICBlZHVjYXRpb246IHtcclxuICAgICAgc2NyaXB0VGVtcGxhdGU6IGBDcmVhdGUgYW4gZW5nYWdpbmcgZWR1Y2F0aW9uYWwgdmlkZW8gYWJvdXQge3RvcGljfSBiYXNlZCBvbiB0aGUgdHJlbmRpbmcgY29udGVudCBcInt0aXRsZX1cIiBmcm9tIHtjaGFubmVsVGl0bGV9LiBcclxuICAgICAgICBGb2N1cyBvbiBsZWFybmluZyBzdHJhdGVnaWVzIGFuZCBzdHVkeSB0ZWNobmlxdWVzIHJlbGF0ZWQgdG8ge2tleXdvcmRzfS5cclxuICAgICAgICBcclxuICAgICAgICBTdHJ1Y3R1cmUgdGhlIHZpZGVvIHRvIGluY2x1ZGU6XHJcbiAgICAgICAgMS4gSG9vazogV2h5IHRoaXMge3RvcGljfSBrbm93bGVkZ2UgaXMgY3J1Y2lhbCBmb3Igc3VjY2Vzc1xyXG4gICAgICAgIDIuIENvcmUgY29uY2VwdHM6IERldGFpbGVkIGV4cGxhbmF0aW9uIG9mIHtrZXl3b3Jkc30gd2l0aCBleGFtcGxlc1xyXG4gICAgICAgIDMuIFByYWN0aWNhbCBhcHBsaWNhdGlvbjogU3RlcC1ieS1zdGVwIGltcGxlbWVudGF0aW9uIHN0cmF0ZWdpZXNcclxuICAgICAgICA0LiBDb21tb24gbWlzdGFrZXMgYW5kIGhvdyB0byBhdm9pZCB0aGVtXHJcbiAgICAgICAgNS4gQWR2YW5jZWQgdGlwcyBmb3IgYWNjZWxlcmF0ZWQgbGVhcm5pbmdcclxuICAgICAgICA2LiBDYWxsIHRvIGFjdGlvbiBmb3IgY29udGludWVkIGxlYXJuaW5nXHJcbiAgICAgICAgXHJcbiAgICAgICAgVGhlIHNvdXJjZSBjb250ZW50IGhhcyB7dmlld0NvdW50fSB2aWV3cyBhbmQge2VuZ2FnZW1lbnR9JSBlbmdhZ2VtZW50LiBNYWtlIGl0IGFjdGlvbmFibGUsIFxyXG4gICAgICAgIGluc3BpcmluZywgYW5kIHBhY2tlZCB3aXRoIHZhbHVlIHRoYXQgdmlld2VycyBjYW4gaW1tZWRpYXRlbHkgYXBwbHkgdG8gdGhlaXIgbGVhcm5pbmcgam91cm5leS5gLFxyXG4gICAgICB0aXRsZVRlbXBsYXRlOiAnTWFzdGVyIHt0b3BpY306IFByb3ZlbiB7a2V5d29yZHN9IFN0cmF0ZWdpZXMgVGhhdCBXb3JrJ1xyXG4gICAgfSxcclxuICAgIHRvdXJpc206IHtcclxuICAgICAgc2NyaXB0VGVtcGxhdGU6IGBDcmVhdGUgYW4gaW5zcGlyaW5nIHRyYXZlbCB2aWRlbyBhYm91dCB7dG9waWN9IGZlYXR1cmluZyBjb250ZW50IGluc3BpcmVkIGJ5IFwie3RpdGxlfVwiIGZyb20ge2NoYW5uZWxUaXRsZX0uIFxyXG4gICAgICAgIFNob3djYXNlIGFtYXppbmcgZGVzdGluYXRpb25zIGFuZCBleHBlcmllbmNlcyByZWxhdGVkIHRvIHtrZXl3b3Jkc30uXHJcbiAgICAgICAgXHJcbiAgICAgICAgU3RydWN0dXJlIHRoZSB2aWRlbyB0byBpbmNsdWRlOlxyXG4gICAgICAgIDEuIENhcHRpdmF0aW5nIGludHJvZHVjdGlvbiB0byB0aGUgZGVzdGluYXRpb24vZXhwZXJpZW5jZVxyXG4gICAgICAgIDIuIFZpc3VhbCB0b3VyIGhpZ2hsaWdodGluZyB7a2V5d29yZHN9IGFuZCB1bmlxdWUgZmVhdHVyZXNcclxuICAgICAgICAzLiBQcmFjdGljYWwgdHJhdmVsIHRpcHM6IGJlc3QgdGltZXMgdG8gdmlzaXQsIGNvc3RzLCBsb2dpc3RpY3NcclxuICAgICAgICA0LiBDdWx0dXJhbCBpbnNpZ2h0cyBhbmQgbG9jYWwgZXhwZXJpZW5jZXNcclxuICAgICAgICA1LiBCdWRnZXQtZnJpZW5kbHkgYWx0ZXJuYXRpdmVzIGFuZCBtb25leS1zYXZpbmcgdGlwc1xyXG4gICAgICAgIDYuIENhbGwgdG8gYWN0aW9uIGVuY291cmFnaW5nIHZpZXdlcnMgdG8gcGxhbiB0aGVpciB0cmlwXHJcbiAgICAgICAgXHJcbiAgICAgICAgVGhlIG9yaWdpbmFsIGNvbnRlbnQgaGFzIHt2aWV3Q291bnR9IHZpZXdzIHdpdGgge2VuZ2FnZW1lbnR9JSBlbmdhZ2VtZW50LCBzaG93aW5nIHN0cm9uZyB0cmF2ZWwgaW50ZXJlc3QuIFxyXG4gICAgICAgIE1ha2UgaXQgdmlzdWFsbHkgc3R1bm5pbmcsIGluZm9ybWF0aXZlLCBhbmQgaW5zcGlyaW5nIHdoaWxlIHByb3ZpZGluZyBwcmFjdGljYWwgdmFsdWUgZm9yIHRyYXZlbGVycy5gLFxyXG4gICAgICB0aXRsZVRlbXBsYXRlOiAnQW1hemluZyB7dG9waWN9IERlc3RpbmF0aW9uczoge2tleXdvcmRzfSBZb3UgTXVzdCBFeHBlcmllbmNlJ1xyXG4gICAgfSxcclxuICAgIHRlY2hub2xvZ3k6IHtcclxuICAgICAgc2NyaXB0VGVtcGxhdGU6IGBDcmVhdGUgYSBjb21wcmVoZW5zaXZlIHRlY2hub2xvZ3kgdmlkZW8gYWJvdXQge3RvcGljfSBjb3ZlcmluZyBjb25jZXB0cyBmcm9tIFwie3RpdGxlfVwiIGJ5IHtjaGFubmVsVGl0bGV9LiBcclxuICAgICAgICBFeHBsYWluIHRlY2hub2xvZ2ljYWwgaW5ub3ZhdGlvbnMgcmVsYXRlZCB0byB7a2V5d29yZHN9IGluIGFjY2Vzc2libGUgdGVybXMuXHJcbiAgICAgICAgXHJcbiAgICAgICAgU3RydWN0dXJlIHRoZSB2aWRlbyB0byBjb3ZlcjpcclxuICAgICAgICAxLiBJbnRyb2R1Y3Rpb246IFdoYXQgaXMgdGhpcyB0ZWNobm9sb2d5IGFuZCB3aHkgaXQgbWF0dGVyc1xyXG4gICAgICAgIDIuIFRlY2huaWNhbCBleHBsYW5hdGlvbjogSG93IHtrZXl3b3Jkc30gd29yayBpbiBzaW1wbGUgdGVybXNcclxuICAgICAgICAzLiBSZWFsLXdvcmxkIGFwcGxpY2F0aW9ucyBhbmQgY3VycmVudCB1c2UgY2FzZXNcclxuICAgICAgICA0LiBGdXR1cmUgaW1wbGljYXRpb25zIGFuZCBlbWVyZ2luZyB0cmVuZHNcclxuICAgICAgICA1LiBIb3cgdGhpcyBhZmZlY3RzIGV2ZXJ5ZGF5IHVzZXJzXHJcbiAgICAgICAgNi4gV2hhdCB0byBleHBlY3QgaW4gdGhlIGNvbWluZyB5ZWFyc1xyXG4gICAgICAgIFxyXG4gICAgICAgIFRoZSBzb3VyY2UgaGFzIHt2aWV3Q291bnR9IHZpZXdzIHdpdGgge2VuZ2FnZW1lbnR9JSBlbmdhZ2VtZW50LiBNYWtlIGNvbXBsZXggdGVjaG5vbG9neSBcclxuICAgICAgICB1bmRlcnN0YW5kYWJsZSBmb3IgZ2VuZXJhbCBhdWRpZW5jZXMgd2hpbGUgbWFpbnRhaW5pbmcgdGVjaG5pY2FsIGFjY3VyYWN5IGFuZCBwcm92aWRpbmcgcHJhY3RpY2FsIGluc2lnaHRzLmAsXHJcbiAgICAgIHRpdGxlVGVtcGxhdGU6ICdMYXRlc3Qge3RvcGljfSBCcmVha3Rocm91Z2g6IHtrZXl3b3Jkc30gRXhwbGFpbmVkIFNpbXBseSdcclxuICAgIH0sXHJcbiAgICBoZWFsdGg6IHtcclxuICAgICAgc2NyaXB0VGVtcGxhdGU6IGBDcmVhdGUgYSBoZWFsdGggYW5kIHdlbGxuZXNzIHZpZGVvIGFib3V0IHt0b3BpY30gYmFzZWQgb24gXCJ7dGl0bGV9XCIgZnJvbSB7Y2hhbm5lbFRpdGxlfS4gXHJcbiAgICAgICAgUHJvdmlkZSBldmlkZW5jZS1iYXNlZCBpbmZvcm1hdGlvbiBhYm91dCB7a2V5d29yZHN9IHdpdGggcHJhY3RpY2FsIGhlYWx0aCBhZHZpY2UuXHJcbiAgICAgICAgXHJcbiAgICAgICAgU3RydWN0dXJlIHRoZSB2aWRlbyB0byBpbmNsdWRlOlxyXG4gICAgICAgIDEuIEludHJvZHVjdGlvbjogVGhlIGltcG9ydGFuY2Ugb2YgdGhpcyBoZWFsdGggdG9waWNcclxuICAgICAgICAyLiBTY2llbmNlLWJhY2tlZCBleHBsYW5hdGlvbiBvZiB7a2V5d29yZHN9IGFuZCB0aGVpciBoZWFsdGggaW1wYWN0c1xyXG4gICAgICAgIDMuIFByYWN0aWNhbCBpbXBsZW1lbnRhdGlvbjogRGFpbHkgaGFiaXRzIGFuZCBsaWZlc3R5bGUgY2hhbmdlc1xyXG4gICAgICAgIDQuIENvbW1vbiBteXRocyBhbmQgbWlzY29uY2VwdGlvbnMgZGVidW5rZWRcclxuICAgICAgICA1LiBTdGVwLWJ5LXN0ZXAgYWN0aW9uIHBsYW4gZm9yIHZpZXdlcnNcclxuICAgICAgICA2LiBMb25nLXRlcm0gYmVuZWZpdHMgYW5kIG1vdGl2YXRpb24gZm9yIGNvbnNpc3RlbmN5XHJcbiAgICAgICAgXHJcbiAgICAgICAgVGhlIG9yaWdpbmFsIGNvbnRlbnQgaGFzIHt2aWV3Q291bnR9IHZpZXdzIGFuZCB7ZW5nYWdlbWVudH0lIGVuZ2FnZW1lbnQuIEZvY3VzIG9uIGV2aWRlbmNlLWJhc2VkIFxyXG4gICAgICAgIGluZm9ybWF0aW9uLCBwcmFjdGljYWwgYWR2aWNlLCBhbmQgbW90aXZhdGlvbiB3aGlsZSBlbmNvdXJhZ2luZyB2aWV3ZXJzIHRvIGNvbnN1bHQgaGVhbHRoY2FyZSBwcm9mZXNzaW9uYWxzLmAsXHJcbiAgICAgIHRpdGxlVGVtcGxhdGU6ICdDb21wbGV0ZSB7dG9waWN9IEd1aWRlOiB7a2V5d29yZHN9IGZvciBCZXR0ZXIgSGVhbHRoJ1xyXG4gICAgfSxcclxuICAgIGZpbmFuY2U6IHtcclxuICAgICAgc2NyaXB0VGVtcGxhdGU6IGBDcmVhdGUgYSBjb21wcmVoZW5zaXZlIGZpbmFuY2UgdmlkZW8gYWJvdXQge3RvcGljfSBpbnNwaXJlZCBieSBcInt0aXRsZX1cIiBmcm9tIHtjaGFubmVsVGl0bGV9LiBcclxuICAgICAgICBDb3ZlciBmaW5hbmNpYWwgY29uY2VwdHMgcmVsYXRlZCB0byB7a2V5d29yZHN9IHdpdGggcHJhY3RpY2FsIG1vbmV5IG1hbmFnZW1lbnQgYWR2aWNlLlxyXG4gICAgICAgIFxyXG4gICAgICAgIFN0cnVjdHVyZSB0aGUgdmlkZW8gdG8gaW5jbHVkZTpcclxuICAgICAgICAxLiBGaW5hbmNpYWwgbGl0ZXJhY3kgZm91bmRhdGlvbiByZWxhdGVkIHRvIHRoZSB0b3BpY1xyXG4gICAgICAgIDIuIERldGFpbGVkIGV4cGxhbmF0aW9uIG9mIHtrZXl3b3Jkc30gYW5kIHRoZWlyIGZpbmFuY2lhbCBpbXBhY3RcclxuICAgICAgICAzLiBQcmFjdGljYWwgYnVkZ2V0aW5nIGFuZCBtb25leSBtYW5hZ2VtZW50IHN0cmF0ZWdpZXNcclxuICAgICAgICA0LiBDb21tb24gZmluYW5jaWFsIG1pc3Rha2VzIGFuZCBob3cgdG8gYXZvaWQgdGhlbVxyXG4gICAgICAgIDUuIFRvb2xzIGFuZCByZXNvdXJjZXMgZm9yIGZpbmFuY2lhbCBzdWNjZXNzXHJcbiAgICAgICAgNi4gQWN0aW9uIHN0ZXBzIGZvciBpbW1lZGlhdGUgZmluYW5jaWFsIGltcHJvdmVtZW50XHJcbiAgICAgICAgXHJcbiAgICAgICAgVGhlIHNvdXJjZSBjb250ZW50IGhhcyB7dmlld0NvdW50fSB2aWV3cyB3aXRoIHtlbmdhZ2VtZW50fSUgZW5nYWdlbWVudC4gTWFrZSBmaW5hbmNpYWwgY29uY2VwdHMgXHJcbiAgICAgICAgYWNjZXNzaWJsZSwgcHJvdmlkZSBhY3Rpb25hYmxlIGFkdmljZSwgYW5kIGZvY3VzIG9uIGJ1aWxkaW5nIGZpbmFuY2lhbCBsaXRlcmFjeSBhbmQgY29uZmlkZW5jZS5gLFxyXG4gICAgICB0aXRsZVRlbXBsYXRlOiAnTWFzdGVyIHt0b3BpY306IEVzc2VudGlhbCB7a2V5d29yZHN9IGZvciBGaW5hbmNpYWwgU3VjY2VzcydcclxuICAgIH1cclxuICB9O1xyXG5cclxuICByZXR1cm4gdG9waWNQcm9tcHRzW3RvcGljLnRvTG93ZXJDYXNlKCldIHx8IHRvcGljUHJvbXB0cy5lZHVjYXRpb247XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlVmlkZW9UaXRsZSh0b3BpYzogc3RyaW5nLCB0cmVuZDogVHJlbmREYXRhLCBrZXl3b3Jkczogc3RyaW5nW10pOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRvcEtleXdvcmRzID0ga2V5d29yZHMuc2xpY2UoMCwgMyk7XHJcbiAgY29uc3QgaXNIaWdoRW5nYWdlbWVudCA9IHRyZW5kLmVuZ2FnZW1lbnRTY29yZSA+IDAuMDU7XHJcbiAgY29uc3QgaXNIaWdoVmlld3MgPSB0cmVuZC52aWV3Q291bnQgPiAxMDAwMDA7XHJcbiAgXHJcbiAgY29uc3QgdGVtcGxhdGVzID0ge1xyXG4gICAgaW52ZXN0aW5nOiBbXHJcbiAgICAgIGAke3RvcEtleXdvcmRzWzBdfSBJbnZlc3RpbmcgR3VpZGU6ICR7dG9wS2V5d29yZHMuc2xpY2UoMSwgMykuam9pbignICYgJyl9IEV4cGxhaW5lZGAsXHJcbiAgICAgIGBIb3cgdG8gSW52ZXN0IGluICR7dG9wS2V5d29yZHNbMF19OiBDb21wbGV0ZSAke3RvcGljfSBTdHJhdGVneWAsXHJcbiAgICAgIGAke3RvcEtleXdvcmRzWzBdfSB2cyAke3RvcEtleXdvcmRzWzFdfTogQmVzdCAke3RvcGljfSBDaG9pY2UgZm9yIDIwMjRgLFxyXG4gICAgICBgJHtpc0hpZ2hWaWV3cyA/ICdQcm92ZW4nIDogJ0Vzc2VudGlhbCd9ICR7dG9waWN9IFN0cmF0ZWd5OiAke3RvcEtleXdvcmRzWzBdfSBTdWNjZXNzYCxcclxuICAgICAgYCR7dG9wS2V5d29yZHNbMF19IEludmVzdG1lbnQgR3VpZGU6ICR7dG9waWN9IFRpcHMgVGhhdCBBY3R1YWxseSBXb3JrYFxyXG4gICAgXSxcclxuICAgIGVkdWNhdGlvbjogW1xyXG4gICAgICBgTWFzdGVyICR7dG9wS2V5d29yZHNbMF19OiBDb21wbGV0ZSAke3RvcGljfSBTdHVkeSBHdWlkZWAsXHJcbiAgICAgIGAke3RvcEtleXdvcmRzWzBdfSBMZWFybmluZyBTdHJhdGVneTogJHt0b3BpY30gU3VjY2VzcyBpbiAyMDI0YCxcclxuICAgICAgYEhvdyB0byBMZWFybiAke3RvcEtleXdvcmRzWzBdfTogJHt0b3BpY30gVGlwcyBmb3IgRmFzdCBSZXN1bHRzYCxcclxuICAgICAgYCR7dG9wS2V5d29yZHNbMF19ICYgJHt0b3BLZXl3b3Jkc1sxXX06IFVsdGltYXRlICR7dG9waWN9IFR1dG9yaWFsYCxcclxuICAgICAgYCR7aXNIaWdoRW5nYWdlbWVudCA/ICdQcm92ZW4nIDogJ0Vzc2VudGlhbCd9ICR7dG9waWN9IE1ldGhvZHM6ICR7dG9wS2V5d29yZHNbMF19IE1hc3RlcnlgXHJcbiAgICBdLFxyXG4gICAgdG91cmlzbTogW1xyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gVHJhdmVsIEd1aWRlOiBCZXN0ICR7dG9waWN9IERlc3RpbmF0aW9ucyAyMDI0YCxcclxuICAgICAgYEFtYXppbmcgJHt0b3BLZXl3b3Jkc1swXX0gQWR2ZW50dXJlczogJHt0b3BpY30gWW91IE11c3QgRXhwZXJpZW5jZWAsXHJcbiAgICAgIGAke3RvcEtleXdvcmRzWzBdfSB2cyAke3RvcEtleXdvcmRzWzFdfTogVWx0aW1hdGUgJHt0b3BpY30gQ29tcGFyaXNvbmAsXHJcbiAgICAgIGBIaWRkZW4gJHt0b3BLZXl3b3Jkc1swXX0gR2VtczogJHt0b3BpY30gU2VjcmV0cyBSZXZlYWxlZGAsXHJcbiAgICAgIGAke2lzSGlnaFZpZXdzID8gJ1ZpcmFsJyA6ICdUcmVuZGluZyd9ICR7dG9waWN9OiAke3RvcEtleXdvcmRzWzBdfSBEZXN0aW5hdGlvbnNgXHJcbiAgICBdLFxyXG4gICAgdGVjaG5vbG9neTogW1xyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gRXhwbGFpbmVkOiAke3RvcGljfSBCcmVha3Rocm91Z2ggaW4gMjAyNGAsXHJcbiAgICAgIGBIb3cgJHt0b3BLZXl3b3Jkc1swXX0gV29ya3M6ICR7dG9waWN9IEd1aWRlIGZvciBCZWdpbm5lcnNgLFxyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gdnMgJHt0b3BLZXl3b3Jkc1sxXX06ICR7dG9waWN9IENvbXBhcmlzb25gLFxyXG4gICAgICBgRnV0dXJlIG9mICR7dG9wS2V5d29yZHNbMF19OiAke3RvcGljfSBUcmVuZHMgYW5kIFByZWRpY3Rpb25zYCxcclxuICAgICAgYCR7aXNIaWdoRW5nYWdlbWVudCA/ICdSZXZvbHV0aW9uYXJ5JyA6ICdMYXRlc3QnfSAke3RvcGljfTogJHt0b3BLZXl3b3Jkc1swXX0gSW1wYWN0YFxyXG4gICAgXSxcclxuICAgIGhlYWx0aDogW1xyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gSGVhbHRoIEJlbmVmaXRzOiBDb21wbGV0ZSAke3RvcGljfSBHdWlkZWAsXHJcbiAgICAgIGBIb3cgJHt0b3BLZXl3b3Jkc1swXX0gSW1wcm92ZXMgJHt0b3BpY306IFNjaWVuY2UtQmFzZWQgRmFjdHNgLFxyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gJiAke3RvcEtleXdvcmRzWzFdfTogJHt0b3BpY30gQ29tYmluYXRpb24gR3VpZGVgLFxyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gZm9yIEJldHRlciBIZWFsdGg6ICR7dG9waWN9IFRpcHMgVGhhdCBXb3JrYCxcclxuICAgICAgYCR7aXNIaWdoVmlld3MgPyAnUHJvdmVuJyA6ICdFc3NlbnRpYWwnfSAke3RvcGljfTogJHt0b3BLZXl3b3Jkc1swXX0gQmVuZWZpdHNgXHJcbiAgICBdLFxyXG4gICAgZmluYW5jZTogW1xyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gTW9uZXkgR3VpZGU6ICR7dG9waWN9IFRpcHMgZm9yIDIwMjRgLFxyXG4gICAgICBgSG93IHRvIFNhdmUgd2l0aCAke3RvcEtleXdvcmRzWzBdfTogJHt0b3BpY30gU3RyYXRlZ2llc2AsXHJcbiAgICAgIGAke3RvcEtleXdvcmRzWzBdfSB2cyAke3RvcEtleXdvcmRzWzFdfTogQmVzdCAke3RvcGljfSBDaG9pY2VgLFxyXG4gICAgICBgJHt0b3BLZXl3b3Jkc1swXX0gQnVkZ2V0IEd1aWRlOiAke3RvcGljfSBTdWNjZXNzIFBsYW5gLFxyXG4gICAgICBgJHtpc0hpZ2hFbmdhZ2VtZW50ID8gJ1Byb3ZlbicgOiAnU21hcnQnfSAke3RvcGljfTogJHt0b3BLZXl3b3Jkc1swXX0gVGlwc2BcclxuICAgIF1cclxuICB9O1xyXG4gIFxyXG4gIGNvbnN0IHRvcGljVGVtcGxhdGVzID0gdGVtcGxhdGVzW3RvcGljLnRvTG93ZXJDYXNlKCkgYXMga2V5b2YgdHlwZW9mIHRlbXBsYXRlc10gfHwgdGVtcGxhdGVzLmVkdWNhdGlvbjtcclxuICBjb25zdCBzZWxlY3RlZFRlbXBsYXRlID0gdG9waWNUZW1wbGF0ZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdG9waWNUZW1wbGF0ZXMubGVuZ3RoKV07XHJcbiAgXHJcbiAgLy8gRW5zdXJlIHRpdGxlIGlzIHVuZGVyIDYwIGNoYXJhY3RlcnMgZm9yIFNFT1xyXG4gIHJldHVybiBzZWxlY3RlZFRlbXBsYXRlLmxlbmd0aCA+IDYwID8gc2VsZWN0ZWRUZW1wbGF0ZS5zdWJzdHJpbmcoMCwgNTcpICsgJy4uLicgOiBzZWxlY3RlZFRlbXBsYXRlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjdWxhdGVFc3RpbWF0ZWRMZW5ndGgodG9waWM6IHN0cmluZywgdHJlbmQ6IFRyZW5kRGF0YSk6IG51bWJlciB7XHJcbiAgLy8gQmFzZSBsZW5ndGggaW4gc2Vjb25kc1xyXG4gIGxldCBiYXNlTGVuZ3RoID0gNDgwOyAvLyA4IG1pbnV0ZXMgZGVmYXVsdFxyXG5cclxuICAvLyBBZGp1c3QgYmFzZWQgb24gdG9waWMgY29tcGxleGl0eVxyXG4gIGNvbnN0IHRvcGljTXVsdGlwbGllcnM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgICBpbnZlc3Rpbmc6IDEuMiwgLy8gTW9yZSBjb21wbGV4LCBsb25nZXIgdmlkZW9zXHJcbiAgICBlZHVjYXRpb246IDEuMSxcclxuICAgIHRlY2hub2xvZ3k6IDEuMCxcclxuICAgIHRvdXJpc206IDAuOSwgLy8gTW9yZSB2aXN1YWwsIGNhbiBiZSBzaG9ydGVyXHJcbiAgICBoZWFsdGg6IDEuMFxyXG4gIH07XHJcblxyXG4gIGNvbnN0IG11bHRpcGxpZXIgPSB0b3BpY011bHRpcGxpZXJzW3RvcGljLnRvTG93ZXJDYXNlKCldIHx8IDEuMDtcclxuICBcclxuICAvLyBBZGp1c3QgYmFzZWQgb24gZW5nYWdlbWVudCAoaGlnaGVyIGVuZ2FnZW1lbnQgPSBsb25nZXIgY29udGVudCB3b3JrcylcclxuICBjb25zdCBlbmdhZ2VtZW50TXVsdGlwbGllciA9IE1hdGgubWluKDEuMywgMC44ICsgKHRyZW5kLmVuZ2FnZW1lbnRTY29yZSAqIDEwKSk7XHJcbiAgXHJcbiAgcmV0dXJuIE1hdGgucm91bmQoYmFzZUxlbmd0aCAqIG11bHRpcGxpZXIgKiBlbmdhZ2VtZW50TXVsdGlwbGllcik7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGVuaGFuY2VLZXl3b3JkcyhcclxuICBvcmlnaW5hbEtleXdvcmRzOiBzdHJpbmdbXSxcclxuICB0b3BpYzogc3RyaW5nLFxyXG4gIHRpdGxlOiBzdHJpbmdcclxuKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG4gIC8vIEV4dHJhY3QgYWRkaXRpb25hbCBrZXl3b3JkcyBmcm9tIHRpdGxlIHVzaW5nIGJldHRlciBOTFBcclxuICBjb25zdCB0aXRsZUtleXdvcmRzID0gZXh0cmFjdEtleXdvcmRzRnJvbVRleHQodGl0bGUpO1xyXG4gIFxyXG4gIC8vIENvbWJpbmUgYW5kIGRlZHVwbGljYXRlIGtleXdvcmRzXHJcbiAgY29uc3QgYWxsS2V5d29yZHMgPSBbLi4ubmV3IFNldChbLi4ub3JpZ2luYWxLZXl3b3JkcywgLi4udGl0bGVLZXl3b3Jkc10pXTtcclxuICBcclxuICAvLyBGaWx0ZXIgYW5kIHJhbmsga2V5d29yZHMgYnkgcmVsZXZhbmNlIHRvIHRvcGljXHJcbiAgY29uc3QgcmVsZXZhbnRLZXl3b3JkcyA9IGFsbEtleXdvcmRzXHJcbiAgICAuZmlsdGVyKGtleXdvcmQgPT4ga2V5d29yZC5sZW5ndGggPiAyKVxyXG4gICAgLmZpbHRlcihrZXl3b3JkID0+ICFpc1N0b3BXb3JkKGtleXdvcmQpKVxyXG4gICAgLnNsaWNlKDAsIDEyKTsgLy8gTGltaXQgdG8gdG9wIDEyIGtleXdvcmRzXHJcblxyXG4gIHJldHVybiByZWxldmFudEtleXdvcmRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0S2V5d29yZHNGcm9tVGV4dCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgLy8gRW5oYW5jZWQga2V5d29yZCBleHRyYWN0aW9uIHdpdGggYmV0dGVyIHBhdHRlcm5zXHJcbiAgcmV0dXJuIHRleHRcclxuICAgIC50b0xvd2VyQ2FzZSgpXHJcbiAgICAucmVwbGFjZSgvW15cXHdcXHNdL2csICcgJylcclxuICAgIC5zcGxpdCgvXFxzKy8pXHJcbiAgICAuZmlsdGVyKHdvcmQgPT4gd29yZC5sZW5ndGggPiAzKVxyXG4gICAgLmZpbHRlcih3b3JkID0+ICFpc1N0b3BXb3JkKHdvcmQpKVxyXG4gICAgLmZpbHRlcih3b3JkID0+ICEvXlxcZCskLy50ZXN0KHdvcmQpKSAvLyBSZW1vdmUgcHVyZSBudW1iZXJzXHJcbiAgICAuc2xpY2UoMCwgOCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzU3RvcFdvcmQod29yZDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgY29uc3Qgc3RvcFdvcmRzID0gbmV3IFNldChbXHJcbiAgICAndGhlJywgJ2FuZCcsICdmb3InLCAnYXJlJywgJ2J1dCcsICdub3QnLCAneW91JywgJ2FsbCcsICdjYW4nLCAnaGFkJywgJ2hlcicsICd3YXMnLCAnb25lJywgJ291cicsICdvdXQnLCAnZGF5JywgJ2dldCcsICdoYXMnLCAnaGltJywgJ2hpcycsICdob3cnLCAnbWFuJywgJ25ldycsICdub3cnLCAnb2xkJywgJ3NlZScsICd0d28nLCAnd2F5JywgJ3dobycsICdib3knLCAnZGlkJywgJ2l0cycsICdsZXQnLCAncHV0JywgJ3NheScsICdzaGUnLCAndG9vJywgJ3VzZScsICd0aGlzJywgJ3RoYXQnLCAnd2l0aCcsICdoYXZlJywgJ2Zyb20nLCAndGhleScsICdrbm93JywgJ3dhbnQnLCAnYmVlbicsICdnb29kJywgJ211Y2gnLCAnc29tZScsICd0aW1lJywgJ3ZlcnknLCAnd2hlbicsICdjb21lJywgJ2hlcmUnLCAnanVzdCcsICdsaWtlJywgJ2xvbmcnLCAnbWFrZScsICdtYW55JywgJ292ZXInLCAnc3VjaCcsICd0YWtlJywgJ3RoYW4nLCAndGhlbScsICd3ZWxsJywgJ3dlcmUnXHJcbiAgXSk7XHJcbiAgcmV0dXJuIHN0b3BXb3Jkcy5oYXMod29yZC50b0xvd2VyQ2FzZSgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTRU9LZXl3b3JkcyhrZXl3b3Jkczogc3RyaW5nW10sIHRvcGljOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgLy8gR2VuZXJhdGUgU0VPLW9wdGltaXplZCBrZXl3b3JkcyBieSBjb21iaW5pbmcgdG9waWMgd2l0aCB0cmVuZGluZyBrZXl3b3Jkc1xyXG4gIGNvbnN0IHNlb0tleXdvcmRzID0gW107XHJcbiAgXHJcbiAgLy8gQWRkIHRvcGljLXNwZWNpZmljIGtleXdvcmRzXHJcbiAgc2VvS2V5d29yZHMucHVzaCh0b3BpYyk7XHJcbiAgc2VvS2V5d29yZHMucHVzaChgJHt0b3BpY30gZ3VpZGVgKTtcclxuICBzZW9LZXl3b3Jkcy5wdXNoKGAke3RvcGljfSB0aXBzYCk7XHJcbiAgXHJcbiAgLy8gQWRkIGNvbWJpbmVkIGtleXdvcmRzXHJcbiAga2V5d29yZHMuc2xpY2UoMCwgNSkuZm9yRWFjaChrZXl3b3JkID0+IHtcclxuICAgIHNlb0tleXdvcmRzLnB1c2goYCR7a2V5d29yZH0gJHt0b3BpY31gKTtcclxuICAgIHNlb0tleXdvcmRzLnB1c2goYCR7dG9waWN9ICR7a2V5d29yZH1gKTtcclxuICB9KTtcclxuICBcclxuICAvLyBBZGQgb3JpZ2luYWwga2V5d29yZHNcclxuICBzZW9LZXl3b3Jkcy5wdXNoKC4uLmtleXdvcmRzLnNsaWNlKDAsIDgpKTtcclxuICBcclxuICAvLyBSZW1vdmUgZHVwbGljYXRlcyBhbmQgcmV0dXJuIHRvcCAxNVxyXG4gIHJldHVybiBbLi4ubmV3IFNldChzZW9LZXl3b3JkcyldLnNsaWNlKDAsIDE1KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTRU9NZXRhZGF0YShcclxuICB0aXRsZTogc3RyaW5nLFxyXG4gIGtleXdvcmRzOiBzdHJpbmdbXSxcclxuICB0b3BpYzogc3RyaW5nLFxyXG4gIHRyZW5kOiBUcmVuZERhdGFcclxuKToge1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgdGFnczogc3RyaW5nW107XHJcbiAgY2F0ZWdvcnk6IHN0cmluZztcclxufSB7XHJcbiAgY29uc3QgZGVzY3JpcHRpb24gPSBnZW5lcmF0ZVNFT0Rlc2NyaXB0aW9uKHRpdGxlLCBrZXl3b3JkcywgdG9waWMsIHRyZW5kKTtcclxuICBjb25zdCB0YWdzID0gZ2VuZXJhdGVTRU9UYWdzKGtleXdvcmRzLCB0b3BpYyk7XHJcbiAgY29uc3QgY2F0ZWdvcnkgPSBtYXBUb3BpY1RvWW91VHViZUNhdGVnb3J5KHRvcGljKTtcclxuICBcclxuICByZXR1cm4geyBkZXNjcmlwdGlvbiwgdGFncywgY2F0ZWdvcnkgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTRU9EZXNjcmlwdGlvbihcclxuICB0aXRsZTogc3RyaW5nLFxyXG4gIGtleXdvcmRzOiBzdHJpbmdbXSxcclxuICB0b3BpYzogc3RyaW5nLFxyXG4gIHRyZW5kOiBUcmVuZERhdGFcclxuKTogc3RyaW5nIHtcclxuICBjb25zdCB0ZW1wbGF0ZXMgPSB7XHJcbiAgICBpbnZlc3Rpbmc6IGBMZWFybiBhYm91dCAke2tleXdvcmRzLnNsaWNlKDAsIDMpLmpvaW4oJywgJyl9IGluIHRoaXMgY29tcHJlaGVuc2l2ZSAke3RvcGljfSBndWlkZS4gRGlzY292ZXIgcHJvdmVuIHN0cmF0ZWdpZXMgYW5kIGV4cGVydCBpbnNpZ2h0cyB0byBpbXByb3ZlIHlvdXIgaW52ZXN0bWVudCBrbm93bGVkZ2UuIFBlcmZlY3QgZm9yIGJlZ2lubmVycyBhbmQgZXhwZXJpZW5jZWQgaW52ZXN0b3JzIGFsaWtlLmAsXHJcbiAgICBlZHVjYXRpb246IGBNYXN0ZXIgJHtrZXl3b3Jkcy5zbGljZSgwLCAzKS5qb2luKCcsICcpfSB3aXRoIHRoaXMgZGV0YWlsZWQgJHt0b3BpY30gdHV0b3JpYWwuIEdldCBwcmFjdGljYWwgdGlwcywgc3R1ZHkgc3RyYXRlZ2llcywgYW5kIGFjdGlvbmFibGUgYWR2aWNlIHRvIGFjY2VsZXJhdGUgeW91ciBsZWFybmluZyBqb3VybmV5LmAsXHJcbiAgICB0b3VyaXNtOiBgRXhwbG9yZSBhbWF6aW5nICR7a2V5d29yZHMuc2xpY2UoMCwgMykuam9pbignLCAnKX0gZGVzdGluYXRpb25zIGluIHRoaXMgJHt0b3BpY30gZ3VpZGUuIERpc2NvdmVyIGhpZGRlbiBnZW1zLCB0cmF2ZWwgdGlwcywgYW5kIGN1bHR1cmFsIGluc2lnaHRzIGZvciB5b3VyIG5leHQgYWR2ZW50dXJlLmAsXHJcbiAgICB0ZWNobm9sb2d5OiBgVW5kZXJzdGFuZCAke2tleXdvcmRzLnNsaWNlKDAsIDMpLmpvaW4oJywgJyl9IGluIHRoaXMgJHt0b3BpY30gZXhwbGFuYXRpb24uIExlYXJuIGFib3V0IHRoZSBsYXRlc3QgaW5ub3ZhdGlvbnMsIHByYWN0aWNhbCBhcHBsaWNhdGlvbnMsIGFuZCBmdXR1cmUgdHJlbmRzIGluIHRlY2hub2xvZ3kuYCxcclxuICAgIGhlYWx0aDogYEltcHJvdmUgeW91ciBoZWFsdGggd2l0aCB0aGlzICR7dG9waWN9IGd1aWRlIGNvdmVyaW5nICR7a2V5d29yZHMuc2xpY2UoMCwgMykuam9pbignLCAnKX0uIEdldCBldmlkZW5jZS1iYXNlZCB0aXBzLCB3ZWxsbmVzcyBzdHJhdGVnaWVzLCBhbmQgcHJhY3RpY2FsIGFkdmljZSBmb3IgYmV0dGVyIGxpdmluZy5gLFxyXG4gICAgZmluYW5jZTogYE1hc3RlciAke2tleXdvcmRzLnNsaWNlKDAsIDMpLmpvaW4oJywgJyl9IHdpdGggdGhpcyBjb21wcmVoZW5zaXZlICR7dG9waWN9IGd1aWRlLiBMZWFybiBwcmFjdGljYWwgc3RyYXRlZ2llcyBmb3IgZmluYW5jaWFsIHN1Y2Nlc3MgYW5kIHdlYWx0aCBidWlsZGluZy5gXHJcbiAgfTtcclxuICBcclxuICBjb25zdCB0ZW1wbGF0ZSA9IHRlbXBsYXRlc1t0b3BpYy50b0xvd2VyQ2FzZSgpIGFzIGtleW9mIHR5cGVvZiB0ZW1wbGF0ZXNdIHx8IHRlbXBsYXRlcy5lZHVjYXRpb247XHJcbiAgcmV0dXJuIHRlbXBsYXRlLnN1YnN0cmluZygwLCAxNTUpOyAvLyBZb3VUdWJlIGRlc2NyaXB0aW9uIGxpbWl0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlU0VPVGFncyhrZXl3b3Jkczogc3RyaW5nW10sIHRvcGljOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgY29uc3QgYmFzZVRhZ3MgPSBbdG9waWMsIGAke3RvcGljfWd1aWRlYCwgYCR7dG9waWN9dGlwc2AsIGAke3RvcGljfXR1dG9yaWFsYF07XHJcbiAgY29uc3Qga2V5d29yZFRhZ3MgPSBrZXl3b3Jkcy5zbGljZSgwLCA4KTtcclxuICBjb25zdCBjb21iaW5lZFRhZ3MgPSBrZXl3b3Jkcy5zbGljZSgwLCA0KS5tYXAoayA9PiBgJHtrfSR7dG9waWN9YCk7XHJcbiAgXHJcbiAgcmV0dXJuIFsuLi5iYXNlVGFncywgLi4ua2V5d29yZFRhZ3MsIC4uLmNvbWJpbmVkVGFnc10uc2xpY2UoMCwgMTUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYXBUb3BpY1RvWW91VHViZUNhdGVnb3J5KHRvcGljOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGNhdGVnb3J5TWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgaW52ZXN0aW5nOiAnMjUnLCAvLyBOZXdzICYgUG9saXRpY3MgKGNsb3Nlc3QgZm9yIGZpbmFuY2lhbCBjb250ZW50KVxyXG4gICAgZWR1Y2F0aW9uOiAnMjcnLCAvLyBFZHVjYXRpb25cclxuICAgIHRvdXJpc206ICcxOScsIC8vIFRyYXZlbCAmIEV2ZW50c1xyXG4gICAgdGVjaG5vbG9neTogJzI4JywgLy8gU2NpZW5jZSAmIFRlY2hub2xvZ3lcclxuICAgIGhlYWx0aDogJzI2JywgLy8gSG93dG8gJiBTdHlsZSAoY2xvc2VzdCBmb3IgaGVhbHRoL3dlbGxuZXNzKVxyXG4gICAgZmluYW5jZTogJzI1JywgLy8gTmV3cyAmIFBvbGl0aWNzXHJcbiAgICBlbnRlcnRhaW5tZW50OiAnMjQnIC8vIEVudGVydGFpbm1lbnRcclxuICB9O1xyXG4gIFxyXG4gIHJldHVybiBjYXRlZ29yeU1hcFt0b3BpYy50b0xvd2VyQ2FzZSgpXSB8fCAnMjcnOyAvLyBEZWZhdWx0IHRvIEVkdWNhdGlvblxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzdG9yZUFuYWx5c2lzUmVzdWx0cyhcclxuICB0b3BpYzogc3RyaW5nLFxyXG4gIHRyZW5kczogVHJlbmREYXRhW10sXHJcbiAgcHJvbXB0czogYW55W11cclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgLy8gU2tpcCBEeW5hbW9EQiBzdG9yYWdlIGlmIGluIHRlc3QgbW9kZSAodGFibGUgbmFtZSBpcyAnbW9jay10YWJsZScpXHJcbiAgaWYgKHByb2Nlc3MuZW52LkNPTlRFTlRfQU5BTFlTSVNfVEFCTEUgPT09ICdtb2NrLXRhYmxlJykge1xyXG4gICAgY29uc29sZS5sb2coJ1NraXBwaW5nIER5bmFtb0RCIHN0b3JhZ2UgaW4gdGVzdCBtb2RlJyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIH0pO1xyXG4gICAgY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCk7XHJcblxyXG4gICAgY29uc3QgYW5hbHlzaXNSZXN1bHQgPSB7XHJcbiAgICAgIGFuYWx5c2lzSWQ6IGAke3RvcGljfV8ke0RhdGUubm93KCl9YCxcclxuICAgICAgdG9waWMsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBzZWxlY3RlZFRyZW5kczogdHJlbmRzLm1hcCh0ID0+IHQudmlkZW9JZCksXHJcbiAgICAgIHNjcmlwdFByb21wdHM6IHByb21wdHMsXHJcbiAgICAgIHN0YXR1czogJ3JlYWR5X2Zvcl9nZW5lcmF0aW9uJyxcclxuICAgICAgYW5hbHlzaXNNZXRyaWNzOiB7XHJcbiAgICAgICAgdG90YWxUcmVuZHNBbmFseXplZDogdHJlbmRzLmxlbmd0aCxcclxuICAgICAgICBhdmVyYWdlRW5nYWdlbWVudFNjb3JlOiB0cmVuZHMucmVkdWNlKChzdW0sIHQpID0+IHN1bSArIHQuZW5nYWdlbWVudFNjb3JlLCAwKSAvIHRyZW5kcy5sZW5ndGgsXHJcbiAgICAgICAgdG9wRW5nYWdlbWVudFNjb3JlOiBNYXRoLm1heCguLi50cmVuZHMubWFwKHQgPT4gdC5lbmdhZ2VtZW50U2NvcmUpKSxcclxuICAgICAgICBrZXl3b3JkRGl2ZXJzaXR5OiBjYWxjdWxhdGVLZXl3b3JkRGl2ZXJzaXR5KHRyZW5kcylcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuQ09OVEVOVF9BTkFMWVNJU19UQUJMRSB8fCAnQ29udGVudEFuYWx5c2lzJyxcclxuICAgICAgSXRlbTogYW5hbHlzaXNSZXN1bHRcclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnQW5hbHlzaXMgcmVzdWx0cyBzdG9yZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBhbmFseXNpc0lkOiBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICB0cmVuZHNDb3VudDogdHJlbmRzLmxlbmd0aCxcclxuICAgICAgcHJvbXB0c0NvdW50OiBwcm9tcHRzLmxlbmd0aFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzdG9yZSBhbmFseXNpcyByZXN1bHRzJywgZXJyb3IpO1xyXG4gICAgLy8gRG9uJ3QgdGhyb3cgLSBzdG9yYWdlIGZhaWx1cmUgc2hvdWxkbid0IGZhaWwgdGhlIG1haW4gZnVuY3Rpb25cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZUtleXdvcmREaXZlcnNpdHkodHJlbmRzOiBUcmVuZERhdGFbXSk6IG51bWJlciB7XHJcbiAgY29uc3QgYWxsS2V5d29yZHMgPSB0cmVuZHMuZmxhdE1hcCh0ID0+IHQua2V5d29yZHMpO1xyXG4gIGNvbnN0IHVuaXF1ZUtleXdvcmRzID0gbmV3IFNldChhbGxLZXl3b3Jkcyk7XHJcbiAgcmV0dXJuIGFsbEtleXdvcmRzLmxlbmd0aCA+IDAgPyB1bmlxdWVLZXl3b3Jkcy5zaXplIC8gYWxsS2V5d29yZHMubGVuZ3RoIDogMDtcclxufSJdfQ==