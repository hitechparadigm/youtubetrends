"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendDetectionService = void 0;
const trend_data_1 = require("../models/trend-data");
class TrendDetectionService {
    constructor(youtubeClient, trendRepository, config = {}) {
        this.youtubeClient = youtubeClient;
        this.trendRepository = trendRepository;
        this.config = {
            topics: config.topics || ['education', 'investing', 'tourism', 'technology', 'health', 'finance'],
            regions: config.regions || ['US', 'GB', 'CA', 'AU'],
            categories: config.categories || ['19', '22', '23', '27', '28'],
            maxResultsPerQuery: config.maxResultsPerQuery || 25,
            minViewCount: config.minViewCount || 1000,
            minEngagementRate: config.minEngagementRate || 1.0,
            hoursBack: config.hoursBack || 24,
            customTopics: config.customTopics || this.getDefaultCustomTopics(),
            engagementWeights: config.engagementWeights || this.getDefaultEngagementWeights(),
            contentFilters: config.contentFilters || this.getDefaultContentFilters()
        };
    }
    async detectTrends(topic, options = {}) {
        const results = [];
        const topicsToAnalyze = topic ? [topic] : this.config.topics;
        for (const currentTopic of topicsToAnalyze) {
            console.log(`Detecting trends for topic: ${currentTopic}`);
            try {
                const trendResult = await this.analyzeTopic(currentTopic, options);
                results.push(trendResult);
                // Small delay between topics to respect rate limits
                await this.sleep(1000);
            }
            catch (error) {
                console.error(`Failed to analyze topic ${currentTopic}:`, error);
                // Add empty result for failed topic
                results.push({
                    topic: currentTopic,
                    trendsFound: 0,
                    topTrend: null,
                    averageEngagement: 0,
                    totalViews: 0,
                    keywords: [],
                    categoryBreakdown: [],
                    engagementTrends: [],
                    contentSuitability: {
                        audioNarrationScore: 0,
                        visualContentScore: 0,
                        educationalValue: 0,
                        viralPotential: 0,
                        monetizationFriendly: 0,
                        overallScore: 0
                    },
                    recommendedActions: []
                });
            }
        }
        return results;
    }
    async analyzeTopic(topic, options) {
        const trends = [];
        let totalViews = 0;
        let totalEngagement = 0;
        const allKeywords = [];
        const categoryStats = new Map();
        // Get custom topic configuration
        const customTopic = this.config.customTopics?.find(ct => ct.name === topic);
        const searchStrategies = customTopic?.searchQueries || [
            `${topic} trending`,
            `${topic} viral`,
            `${topic} 2024`,
            `best ${topic}`,
            `${topic} tips`
        ];
        // Use topic-specific categories if available
        const relevantCategories = customTopic?.categories || this.config.categories;
        console.log(`Analyzing topic: ${topic} with ${searchStrategies.length} search strategies and ${relevantCategories.length} categories`);
        // Search for trending content using topic-specific strategies
        for (const query of searchStrategies) {
            try {
                const searchResults = await this.youtubeClient.searchVideos(query, {
                    maxResults: Math.floor(this.config.maxResultsPerQuery / searchStrategies.length),
                    order: 'viewCount',
                    publishedAfter: this.getPublishedAfterDate(),
                    regionCode: 'US' // Primary region, can be made configurable
                });
                if (searchResults.length > 0) {
                    // Get detailed video information
                    const videoIds = searchResults.map(result => result.videoId);
                    const videoDetails = await this.youtubeClient.getVideoDetails(videoIds);
                    // Convert to trend data and filter
                    const validTrends = videoDetails
                        .filter(video => this.isValidTrend(video, customTopic))
                        .map(video => this.convertToTrendData(video, topic));
                    trends.push(...validTrends);
                }
                // Rate limiting delay
                await this.sleep(500);
            }
            catch (error) {
                console.error(`Search failed for query "${query}":`, error);
            }
        }
        // Check trending videos in relevant categories
        for (const categoryId of relevantCategories) {
            try {
                const trendingVideos = await this.youtubeClient.getTrendingVideos('US', categoryId, 20);
                const relevantTrending = trendingVideos
                    .filter(video => this.isRelevantToTopic(video, topic, customTopic))
                    .filter(video => this.isValidTrend(video, customTopic))
                    .map(video => this.convertToTrendData(video, topic));
                trends.push(...relevantTrending);
                // Update category statistics
                this.updateCategoryStats(categoryStats, categoryId, relevantTrending);
                await this.sleep(500);
            }
            catch (error) {
                console.error(`Failed to get trending videos for category ${categoryId}:`, error);
            }
        }
        // Remove duplicates and calculate enhanced engagement scores
        const uniqueTrends = this.removeDuplicateTrends(trends);
        const enhancedTrends = uniqueTrends.map(trend => ({
            ...trend,
            engagementScore: this.calculateEnhancedEngagementScore(trend)
        }));
        const sortedTrends = enhancedTrends.sort((a, b) => b.engagementScore - a.engagementScore);
        // Save trends to database
        if (sortedTrends.length > 0) {
            try {
                await this.trendRepository.saveTrends(sortedTrends);
            }
            catch (error) {
                console.error('Failed to save trends to database:', error);
            }
        }
        // Calculate analytics
        totalViews = sortedTrends.reduce((sum, trend) => sum + trend.viewCount, 0);
        totalEngagement = sortedTrends.reduce((sum, trend) => sum + trend.engagementRate, 0);
        // Extract keywords
        sortedTrends.forEach(trend => {
            allKeywords.push(...trend.keywords);
        });
        const topKeywords = this.getTopKeywords(allKeywords, 10);
        // Generate category breakdown
        const categoryBreakdown = Array.from(categoryStats.values());
        // Analyze engagement trends
        const engagementTrends = await this.analyzeEngagementTrends(topic, sortedTrends);
        // Calculate content suitability
        const contentSuitability = this.calculateContentSuitability(sortedTrends, customTopic);
        // Generate recommended actions
        const recommendedActions = this.generateRecommendedActions(sortedTrends, contentSuitability, customTopic);
        return {
            topic,
            trendsFound: sortedTrends.length,
            topTrend: sortedTrends[0] || null,
            averageEngagement: sortedTrends.length > 0 ? totalEngagement / sortedTrends.length : 0,
            totalViews,
            keywords: topKeywords,
            categoryBreakdown,
            engagementTrends,
            contentSuitability,
            recommendedActions
        };
    }
    isValidTrend(video, customTopic) {
        const basicValidation = (video.viewCount >= this.config.minViewCount &&
            this.calculateEngagementRate(video) >= this.config.minEngagementRate &&
            this.isRecentEnough(video.publishedAt));
        if (!basicValidation)
            return false;
        // Apply content filters
        if (this.config.contentFilters) {
            const filters = this.config.contentFilters;
            // Check excluded keywords
            const contentText = `${video.title} ${video.description}`.toLowerCase();
            if (filters.excludeKeywords.some(keyword => contentText.includes(keyword.toLowerCase()))) {
                return false;
            }
            // Check required keywords
            if (filters.requiredKeywords.length > 0) {
                if (!filters.requiredKeywords.some(keyword => contentText.includes(keyword.toLowerCase()))) {
                    return false;
                }
            }
            // Check duration constraints
            const durationSeconds = this.parseDurationToSeconds(video.duration);
            if (durationSeconds < filters.minDurationSeconds || durationSeconds > filters.maxDurationSeconds) {
                return false;
            }
        }
        // Apply custom topic constraints
        if (customTopic) {
            const durationSeconds = this.parseDurationToSeconds(video.duration);
            if (customTopic.minDuration && durationSeconds < customTopic.minDuration) {
                return false;
            }
            if (customTopic.maxDuration && durationSeconds > customTopic.maxDuration) {
                return false;
            }
        }
        return true;
    }
    isRelevantToTopic(video, topic, customTopic) {
        const searchText = `${video.title} ${video.description}`.toLowerCase();
        // Use custom topic keywords if available
        const topicKeywords = customTopic?.keywords || this.getTopicKeywords(topic);
        // Calculate relevance score
        let relevanceScore = 0;
        let keywordMatches = 0;
        topicKeywords.forEach(keyword => {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                keywordMatches++;
                // Give higher score for title matches
                if (video.title.toLowerCase().includes(keywordLower)) {
                    relevanceScore += 2;
                }
                else {
                    relevanceScore += 1;
                }
            }
        });
        // Require at least 1 keyword match and minimum relevance score
        return keywordMatches > 0 && relevanceScore >= 1;
    }
    getTopicKeywords(topic) {
        const keywordMap = {
            tourism: ['travel', 'vacation', 'holiday', 'destination', 'tourist', 'sightseeing', 'trip'],
            travel: ['journey', 'adventure', 'explore', 'wanderlust', 'backpack', 'road trip'],
            food: ['recipe', 'cooking', 'cuisine', 'restaurant', 'chef', 'delicious', 'taste'],
            technology: ['tech', 'gadget', 'innovation', 'digital', 'software', 'app', 'device'],
            fitness: ['workout', 'exercise', 'health', 'gym', 'training', 'nutrition', 'wellness']
        };
        return keywordMap[topic.toLowerCase()] || [topic];
    }
    calculateEngagementRate(video) {
        if (video.viewCount === 0)
            return 0;
        return ((video.likeCount + video.commentCount) / video.viewCount) * 100;
    }
    isRecentEnough(publishedAt) {
        const publishedDate = new Date(publishedAt);
        const cutoffDate = new Date(Date.now() - this.config.hoursBack * 60 * 60 * 1000);
        return publishedDate >= cutoffDate;
    }
    getPublishedAfterDate() {
        const date = new Date(Date.now() - this.config.hoursBack * 60 * 60 * 1000);
        return date.toISOString();
    }
    convertToTrendData(video, topic) {
        return trend_data_1.TrendDataModel.fromYouTubeApiResponse({
            id: video.id,
            snippet: {
                title: video.title,
                channelTitle: video.channelTitle,
                channelId: video.channelId,
                publishedAt: video.publishedAt,
                categoryId: video.categoryId,
                thumbnails: video.thumbnails
            },
            statistics: {
                viewCount: video.viewCount.toString(),
                likeCount: video.likeCount.toString(),
                commentCount: video.commentCount.toString()
            },
            contentDetails: {
                duration: video.duration
            }
        }, topic);
    }
    removeDuplicateTrends(trends) {
        const seen = new Set();
        return trends.filter(trend => {
            if (seen.has(trend.videoId)) {
                return false;
            }
            seen.add(trend.videoId);
            return true;
        });
    }
    getTopKeywords(keywords, limit) {
        const keywordCounts = {};
        keywords.forEach(keyword => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
        return Object.entries(keywordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([keyword]) => keyword);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getDefaultCustomTopics() {
        return [
            {
                name: 'education',
                keywords: ['learn', 'tutorial', 'course', 'lesson', 'study', 'knowledge', 'skill'],
                categories: ['27'],
                searchQueries: ['how to learn', 'educational content', 'online course', 'study tips'],
                minDuration: 300,
                maxDuration: 1800,
                audioNarrationSuitable: true
            },
            {
                name: 'investing',
                keywords: ['stocks', 'investment', 'portfolio', 'ETF', 'trading', 'finance', 'market'],
                categories: ['25'],
                searchQueries: ['stock market analysis', 'investment tips', 'portfolio management', 'ETF review'],
                minDuration: 600,
                maxDuration: 2400,
                audioNarrationSuitable: true
            },
            {
                name: 'tourism',
                keywords: ['travel', 'vacation', 'destination', 'tourist', 'adventure', 'explore'],
                categories: ['19'],
                searchQueries: ['travel guide', 'vacation destination', 'travel tips', 'adventure travel'],
                minDuration: 300,
                maxDuration: 1200,
                audioNarrationSuitable: true
            },
            {
                name: 'technology',
                keywords: ['tech', 'gadget', 'software', 'app', 'innovation', 'digital', 'AI'],
                categories: ['28'],
                searchQueries: ['tech review', 'new technology', 'gadget unboxing', 'software tutorial'],
                minDuration: 300,
                maxDuration: 1800,
                audioNarrationSuitable: true
            },
            {
                name: 'health',
                keywords: ['health', 'fitness', 'wellness', 'nutrition', 'exercise', 'medical'],
                categories: ['26'],
                searchQueries: ['health tips', 'fitness routine', 'nutrition advice', 'wellness guide'],
                minDuration: 300,
                maxDuration: 1500,
                audioNarrationSuitable: true
            },
            {
                name: 'finance',
                keywords: ['money', 'budget', 'savings', 'debt', 'credit', 'financial planning'],
                categories: ['25'],
                searchQueries: ['personal finance', 'budgeting tips', 'financial advice', 'money management'],
                minDuration: 600,
                maxDuration: 2100,
                audioNarrationSuitable: true
            }
        ];
    }
    getDefaultEngagementWeights() {
        return {
            viewCount: 0.3,
            likeCount: 0.25,
            commentCount: 0.25,
            shareCount: 0.1,
            subscriberGrowth: 0.05,
            watchTime: 0.05
        };
    }
    getDefaultContentFilters() {
        return {
            excludeKeywords: ['explicit', 'adult', 'nsfw', 'controversial'],
            requiredKeywords: [],
            minDurationSeconds: 60,
            maxDurationSeconds: 3600,
            languageCode: 'en',
            contentRating: ['none', 'mild']
        };
    }
    async getTopTrendingTopics(days = 7, limit = 10) {
        const results = [];
        for (const topic of this.config.topics) {
            try {
                const stats = await this.trendRepository.getTopicStats(topic, days);
                results.push({
                    topic,
                    trendCount: stats.totalTrends,
                    averageEngagement: stats.averageEngagement,
                    topVideo: stats.topVideo
                });
            }
            catch (error) {
                console.error(`Failed to get stats for topic ${topic}:`, error);
            }
        }
        return results
            .sort((a, b) => b.averageEngagement - a.averageEngagement)
            .slice(0, limit);
    }
    async predictTrendPotential(videoData) {
        const factors = {};
        const recommendations = [];
        // Analyze title effectiveness
        const titleScore = this.analyzeTitleEffectiveness(videoData.title);
        factors.titleEffectiveness = titleScore;
        if (titleScore < 0.6) {
            recommendations.push('Consider making the title more engaging with numbers or emotional words');
        }
        // Check keyword relevance
        const keywordScore = await this.analyzeKeywordRelevance(videoData.keywords);
        factors.keywordRelevance = keywordScore;
        if (keywordScore < 0.5) {
            recommendations.push('Include more trending keywords related to your topic');
        }
        // Analyze description quality
        const descriptionScore = this.analyzeDescriptionQuality(videoData.description);
        factors.descriptionQuality = descriptionScore;
        if (descriptionScore < 0.7) {
            recommendations.push('Improve description with more relevant keywords and clear structure');
        }
        // Calculate overall score
        const overallScore = (titleScore * 0.4 + keywordScore * 0.4 + descriptionScore * 0.2);
        return {
            score: Math.round(overallScore * 100) / 100,
            factors,
            recommendations
        };
    }
    analyzeTitleEffectiveness(title) {
        let score = 0.5; // Base score
        // Check for engaging elements
        if (/\d+/.test(title))
            score += 0.1; // Contains numbers
        if (/[!?]/.test(title))
            score += 0.1; // Contains exclamation or question marks
        if (title.length >= 40 && title.length <= 70)
            score += 0.1; // Optimal length
        if (/\b(best|top|amazing|incredible|ultimate|secret)\b/i.test(title))
            score += 0.1; // Power words
        if (/\b(how to|tutorial|guide|tips)\b/i.test(title))
            score += 0.1; // Educational keywords
        return Math.min(score, 1.0);
    }
    async analyzeKeywordRelevance(keywords) {
        if (keywords.length === 0)
            return 0;
        let relevantCount = 0;
        // Check against recent trending keywords
        for (const topic of this.config.topics) {
            try {
                const recentTrends = await this.trendRepository.getRecentTrends(24, 50);
                const trendingKeywords = recentTrends.flatMap(trend => trend.keywords);
                relevantCount += keywords.filter(keyword => trendingKeywords.some(trending => trending.toLowerCase().includes(keyword.toLowerCase()))).length;
            }
            catch (error) {
                console.error('Failed to analyze keyword relevance:', error);
            }
        }
        return Math.min(relevantCount / keywords.length, 1.0);
    }
    analyzeDescriptionQuality(description) {
        let score = 0.3; // Base score
        if (description.length >= 100)
            score += 0.2; // Adequate length
        if (description.length >= 200)
            score += 0.1; // Good length
        if (/https?:\/\//.test(description))
            score += 0.1; // Contains links
        if (/#\w+/.test(description))
            score += 0.1; // Contains hashtags
        if (/\b(subscribe|like|comment|share)\b/i.test(description))
            score += 0.1; // Call to action
        if (description.split('\n').length >= 3)
            score += 0.1; // Well structured
        return Math.min(score, 1.0);
    }
    calculateEnhancedEngagementScore(trend) {
        const weights = this.config.engagementWeights;
        // Normalize metrics to 0-1 scale based on typical ranges
        const normalizedViews = Math.min(trend.viewCount / 1000000, 1); // Cap at 1M views
        const normalizedLikes = Math.min(trend.likeCount / 50000, 1); // Cap at 50K likes
        const normalizedComments = Math.min(trend.commentCount / 5000, 1); // Cap at 5K comments
        // Calculate engagement rate
        const engagementRate = trend.viewCount > 0 ?
            (trend.likeCount + trend.commentCount) / trend.viewCount : 0;
        // Calculate recency boost (newer content gets higher score)
        const hoursOld = (Date.now() - new Date(trend.publishedAt).getTime()) / (1000 * 60 * 60);
        const recencyBoost = Math.max(0, 1 - (hoursOld / (this.config.hoursBack * 2)));
        // Calculate weighted score
        const baseScore = (normalizedViews * weights.viewCount +
            normalizedLikes * weights.likeCount +
            normalizedComments * weights.commentCount +
            engagementRate * 100 * 0.3 // Engagement rate contribution
        );
        // Apply recency boost
        return baseScore * (1 + recencyBoost * 0.2);
    }
    updateCategoryStats(categoryStats, categoryId, trends) {
        if (trends.length === 0)
            return;
        const existing = categoryStats.get(categoryId);
        const totalViews = trends.reduce((sum, trend) => sum + trend.viewCount, 0);
        const totalEngagement = trends.reduce((sum, trend) => sum + trend.engagementRate, 0);
        const topVideo = trends.sort((a, b) => b.engagementScore - a.engagementScore)[0];
        const categoryBreakdown = {
            categoryId,
            categoryName: this.getCategoryName(categoryId),
            videoCount: (existing?.videoCount || 0) + trends.length,
            averageViews: existing ?
                ((existing.averageViews * existing.videoCount) + totalViews) / (existing.videoCount + trends.length) :
                totalViews / trends.length,
            averageEngagement: existing ?
                ((existing.averageEngagement * existing.videoCount) + totalEngagement) / (existing.videoCount + trends.length) :
                totalEngagement / trends.length,
            topVideo: !existing || topVideo.engagementScore > (existing.topVideo?.engagementScore || 0) ?
                topVideo : existing.topVideo
        };
        categoryStats.set(categoryId, categoryBreakdown);
    }
    getCategoryName(categoryId) {
        const categoryNames = {
            '1': 'Film & Animation',
            '2': 'Autos & Vehicles',
            '10': 'Music',
            '15': 'Pets & Animals',
            '17': 'Sports',
            '19': 'Travel & Events',
            '20': 'Gaming',
            '22': 'People & Blogs',
            '23': 'Comedy',
            '24': 'Entertainment',
            '25': 'News & Politics',
            '26': 'Howto & Style',
            '27': 'Education',
            '28': 'Science & Technology'
        };
        return categoryNames[categoryId] || `Category ${categoryId}`;
    }
    async analyzeEngagementTrends(topic, currentTrends) {
        const trends = [];
        try {
            // Get historical data for comparison
            const historicalTrends = await this.trendRepository.getRecentTrends(168, 100); // Last 7 days
            const topicHistorical = historicalTrends.filter(trend => trend.topic === topic);
            if (topicHistorical.length > 0) {
                // Calculate 24-hour trend
                const last24h = topicHistorical.filter(trend => new Date(trend.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000);
                const current24hAvg = currentTrends.reduce((sum, trend) => sum + trend.engagementRate, 0) / currentTrends.length;
                const historical24hAvg = last24h.reduce((sum, trend) => sum + trend.engagementRate, 0) / Math.max(last24h.length, 1);
                trends.push({
                    timeframe: '24h',
                    averageEngagement: current24hAvg,
                    trendDirection: current24hAvg > historical24hAvg * 1.1 ? 'up' :
                        current24hAvg < historical24hAvg * 0.9 ? 'down' : 'stable',
                    confidence: Math.min(currentTrends.length / 10, 1) // Higher confidence with more data points
                });
                // Calculate 7-day trend
                const historical7dAvg = topicHistorical.reduce((sum, trend) => sum + trend.engagementRate, 0) / topicHistorical.length;
                trends.push({
                    timeframe: '7d',
                    averageEngagement: historical7dAvg,
                    trendDirection: current24hAvg > historical7dAvg * 1.2 ? 'up' :
                        current24hAvg < historical7dAvg * 0.8 ? 'down' : 'stable',
                    confidence: Math.min(topicHistorical.length / 50, 1)
                });
            }
        }
        catch (error) {
            console.error('Failed to analyze engagement trends:', error);
        }
        return trends;
    }
    calculateContentSuitability(trends, customTopic) {
        if (trends.length === 0) {
            return {
                audioNarrationScore: 0,
                visualContentScore: 0,
                educationalValue: 0,
                viralPotential: 0,
                monetizationFriendly: 0,
                overallScore: 0
            };
        }
        // Audio narration suitability
        let audioNarrationScore = customTopic?.audioNarrationSuitable ? 0.8 : 0.5;
        // Check for educational/informational content indicators
        const educationalKeywords = ['how to', 'tutorial', 'guide', 'learn', 'explain', 'tips', 'advice'];
        const hasEducationalContent = trends.some(trend => educationalKeywords.some(keyword => trend.title.toLowerCase().includes(keyword) ||
            (trend.description && trend.description.toLowerCase().includes(keyword))));
        if (hasEducationalContent) {
            audioNarrationScore += 0.2;
        }
        // Visual content score based on category and content type
        const visualCategories = ['19', '1', '20', '17']; // Travel, Film, Gaming, Sports
        const hasVisualContent = trends.some(trend => visualCategories.includes(trend.categoryId) ||
            ['visual', 'video', 'watch', 'see', 'look'].some(keyword => trend.title.toLowerCase().includes(keyword)));
        const visualContentScore = hasVisualContent ? 0.8 : 0.6;
        // Educational value
        const educationalCategories = ['27', '28', '26']; // Education, Science & Tech, Howto & Style
        const educationalValue = trends.some(trend => educationalCategories.includes(trend.categoryId)) ? 0.9 : hasEducationalContent ? 0.7 : 0.4;
        // Viral potential based on engagement metrics
        const avgEngagement = trends.reduce((sum, trend) => sum + trend.engagementRate, 0) / trends.length;
        const viralPotential = Math.min(avgEngagement / 5, 1); // Normalize to 0-1
        // Monetization friendliness
        const monetizationFriendlyCategories = ['27', '28', '26', '22', '25']; // Education, Tech, Howto, Blogs, News
        const monetizationFriendly = trends.some(trend => monetizationFriendlyCategories.includes(trend.categoryId)) ? 0.8 : 0.6;
        const overallScore = (audioNarrationScore * 0.25 +
            visualContentScore * 0.2 +
            educationalValue * 0.2 +
            viralPotential * 0.2 +
            monetizationFriendly * 0.15);
        return {
            audioNarrationScore: Math.min(audioNarrationScore, 1),
            visualContentScore,
            educationalValue,
            viralPotential,
            monetizationFriendly,
            overallScore
        };
    }
    generateRecommendedActions(trends, suitability, customTopic) {
        const actions = [];
        // Content creation recommendations
        if (suitability.audioNarrationScore > 0.7) {
            actions.push({
                type: 'content_creation',
                priority: 'high',
                description: 'Create content with high-quality audio narration - this topic is well-suited for voice-over content',
                expectedImpact: 0.8,
                effort: 0.6
            });
        }
        if (suitability.educationalValue > 0.7) {
            actions.push({
                type: 'content_creation',
                priority: 'high',
                description: 'Focus on educational content format with clear explanations and structured information',
                expectedImpact: 0.9,
                effort: 0.7
            });
        }
        // Timing recommendations
        if (trends.length > 0) {
            const avgHoursOld = trends.reduce((sum, trend) => {
                const hoursOld = (Date.now() - new Date(trend.publishedAt).getTime()) / (1000 * 60 * 60);
                return sum + hoursOld;
            }, 0) / trends.length;
            if (avgHoursOld < 12) {
                actions.push({
                    type: 'timing',
                    priority: 'high',
                    description: 'Act quickly - trending content in this topic is very recent, create content within 24 hours',
                    expectedImpact: 0.9,
                    effort: 0.8
                });
            }
        }
        // Optimization recommendations
        if (suitability.viralPotential > 0.6) {
            actions.push({
                type: 'optimization',
                priority: 'medium',
                description: 'Optimize for viral potential with engaging thumbnails and compelling titles',
                expectedImpact: 0.7,
                effort: 0.4
            });
        }
        // Targeting recommendations
        if (customTopic && trends.length > 5) {
            const topKeywords = this.getTopKeywords(trends.flatMap(trend => trend.keywords), 5);
            actions.push({
                type: 'targeting',
                priority: 'medium',
                description: `Target these trending keywords: ${topKeywords.join(', ')}`,
                expectedImpact: 0.6,
                effort: 0.3
            });
        }
        return actions.sort((a, b) => {
            // Sort by priority first, then by impact/effort ratio
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority];
            const bPriority = priorityOrder[b.priority];
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            const aRatio = a.expectedImpact / a.effort;
            const bRatio = b.expectedImpact / b.effort;
            return bRatio - aRatio;
        });
    }
    parseDurationToSeconds(duration) {
        // Parse ISO 8601 duration format (PT#M#S)
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match)
            return 0;
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
    }
    async detectTrendsWithCategoryFiltering(topics, categoryFilters = [], options = {}) {
        const results = [];
        // Temporarily override categories if filters provided
        const originalCategories = this.config.categories;
        if (categoryFilters.length > 0) {
            this.config.categories = categoryFilters;
        }
        try {
            for (const topic of topics) {
                console.log(`Detecting trends for topic: ${topic} with category filters: ${categoryFilters.join(', ')}`);
                const result = await this.analyzeTopic(topic, options);
                results.push(result);
                // Rate limiting between topics
                await this.sleep(1000);
            }
        }
        finally {
            // Restore original categories
            this.config.categories = originalCategories;
        }
        return results;
    }
    async getTopicPerformanceMetrics(topic, days = 30) {
        try {
            const historicalTrends = await this.trendRepository.getRecentTrends(days * 24, 1000);
            const topicTrends = historicalTrends.filter(trend => trend.topic === topic);
            if (topicTrends.length === 0) {
                return {
                    averageViews: 0,
                    averageEngagement: 0,
                    trendingFrequency: 0,
                    bestPerformingKeywords: [],
                    optimalPostingTimes: [],
                    competitionLevel: 'low'
                };
            }
            const averageViews = topicTrends.reduce((sum, trend) => sum + trend.viewCount, 0) / topicTrends.length;
            const averageEngagement = topicTrends.reduce((sum, trend) => sum + trend.engagementRate, 0) / topicTrends.length;
            const trendingFrequency = topicTrends.length / days;
            // Analyze keywords
            const allKeywords = topicTrends.flatMap(trend => trend.keywords);
            const bestPerformingKeywords = this.getTopKeywords(allKeywords, 10);
            // Analyze posting times (simplified - would need more sophisticated analysis in production)
            const postingHours = topicTrends.map(trend => new Date(trend.publishedAt).getHours());
            const hourCounts = {};
            postingHours.forEach(hour => {
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });
            const optimalPostingTimes = Object.entries(hourCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([hour]) => `${hour}:00`);
            // Determine competition level
            const competitionLevel = trendingFrequency > 5 ? 'high' :
                trendingFrequency > 2 ? 'medium' : 'low';
            return {
                averageViews,
                averageEngagement,
                trendingFrequency,
                bestPerformingKeywords,
                optimalPostingTimes,
                competitionLevel
            };
        }
        catch (error) {
            console.error(`Failed to get performance metrics for topic ${topic}:`, error);
            throw error;
        }
    }
}
exports.TrendDetectionService = TrendDetectionService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cmVuZC1kZXRlY3Rpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxxREFBaUU7QUErRmpFLE1BQWEscUJBQXFCO0lBS2hDLFlBQ0UsYUFBK0IsRUFDL0IsZUFBZ0MsRUFDaEMsU0FBd0MsRUFBRTtRQUUxQyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNuQyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsTUFBTSxHQUFHO1lBQ1osTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztZQUNqRyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztZQUNuRCxVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7WUFDL0Qsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixJQUFJLEVBQUU7WUFDbkQsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLElBQUksSUFBSTtZQUN6QyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsaUJBQWlCLElBQUksR0FBRztZQUNsRCxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsSUFBSSxFQUFFO1lBQ2pDLFlBQVksRUFBRSxNQUFNLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtZQUNsRSxpQkFBaUIsRUFBRSxNQUFNLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLDJCQUEyQixFQUFFO1lBQ2pGLGNBQWMsRUFBRSxNQUFNLENBQUMsY0FB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N0IsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ1gsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDO1lBRWpDLDhCQUE4QjtZQUM5QixNQUFNLGdCQUFnQixHQUNwQixpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNoQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRTNDLE9BQU87Z0JBQ0wsWUFBWTtnQkFDWixpQkFBaUI7Z0JBQ2pCLGlCQUFpQjtnQkFDakIsc0JBQXNCO2dCQUN0QixtQkFBbUI7Z0JBQ25CLGdCQUFnQjthQUNqQixDQUFDO1NBQ0g7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0NBQStDLEtBQUssR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzlFLE1BQU0sS0FBSyxDQUFDO1NBQ2I7SUFDSCxDQUFDO0NBQUM7QUF0N0JKLHNEQXM3QkkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBZb3VUdWJlQXBpQ2xpZW50LCBZb3VUdWJlVmlkZW9EZXRhaWxzIH0gZnJvbSAnLi95b3V0dWJlLWFwaS1jbGllbnQnO1xyXG5pbXBvcnQgeyBUcmVuZFJlcG9zaXRvcnkgfSBmcm9tICcuLi9yZXBvc2l0b3JpZXMvdHJlbmQtcmVwb3NpdG9yeSc7XHJcbmltcG9ydCB7IFRyZW5kRGF0YSwgVHJlbmREYXRhTW9kZWwgfSBmcm9tICcuLi9tb2RlbHMvdHJlbmQtZGF0YSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRyZW5kRGV0ZWN0aW9uQ29uZmlnIHtcclxuICB0b3BpY3M6IHN0cmluZ1tdO1xyXG4gIHJlZ2lvbnM6IHN0cmluZ1tdO1xyXG4gIGNhdGVnb3JpZXM6IHN0cmluZ1tdO1xyXG4gIG1heFJlc3VsdHNQZXJRdWVyeTogbnVtYmVyO1xyXG4gIG1pblZpZXdDb3VudDogbnVtYmVyO1xyXG4gIG1pbkVuZ2FnZW1lbnRSYXRlOiBudW1iZXI7XHJcbiAgaG91cnNCYWNrOiBudW1iZXI7XHJcbiAgY3VzdG9tVG9waWNzPzogQ3VzdG9tVG9waWNDb25maWdbXTtcclxuICBlbmdhZ2VtZW50V2VpZ2h0cz86IEVuZ2FnZW1lbnRXZWlnaHRzO1xyXG4gIGNvbnRlbnRGaWx0ZXJzPzogQ29udGVudEZpbHRlcnM7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tVG9waWNDb25maWcge1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBrZXl3b3Jkczogc3RyaW5nW107XHJcbiAgY2F0ZWdvcmllczogc3RyaW5nW107XHJcbiAgc2VhcmNoUXVlcmllczogc3RyaW5nW107XHJcbiAgbWluRHVyYXRpb24/OiBudW1iZXI7XHJcbiAgbWF4RHVyYXRpb24/OiBudW1iZXI7XHJcbiAgYXVkaW9OYXJyYXRpb25TdWl0YWJsZT86IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW5nYWdlbWVudFdlaWdodHMge1xyXG4gIHZpZXdDb3VudDogbnVtYmVyO1xyXG4gIGxpa2VDb3VudDogbnVtYmVyO1xyXG4gIGNvbW1lbnRDb3VudDogbnVtYmVyO1xyXG4gIHNoYXJlQ291bnQ6IG51bWJlcjtcclxuICBzdWJzY3JpYmVyR3Jvd3RoOiBudW1iZXI7XHJcbiAgd2F0Y2hUaW1lOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGVudEZpbHRlcnMge1xyXG4gIGV4Y2x1ZGVLZXl3b3Jkczogc3RyaW5nW107XHJcbiAgcmVxdWlyZWRLZXl3b3Jkczogc3RyaW5nW107XHJcbiAgbWluRHVyYXRpb25TZWNvbmRzOiBudW1iZXI7XHJcbiAgbWF4RHVyYXRpb25TZWNvbmRzOiBudW1iZXI7XHJcbiAgbGFuZ3VhZ2VDb2RlOiBzdHJpbmc7XHJcbiAgY29udGVudFJhdGluZzogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVHJlbmREZXRlY3Rpb25SZXN1bHQge1xyXG4gIHRvcGljOiBzdHJpbmc7XHJcbiAgdHJlbmRzRm91bmQ6IG51bWJlcjtcclxuICB0b3BUcmVuZDogVHJlbmREYXRhIHwgbnVsbDtcclxuICBhdmVyYWdlRW5nYWdlbWVudDogbnVtYmVyO1xyXG4gIHRvdGFsVmlld3M6IG51bWJlcjtcclxuICBrZXl3b3Jkczogc3RyaW5nW107XHJcbiAgY2F0ZWdvcnlCcmVha2Rvd246IENhdGVnb3J5QnJlYWtkb3duW107XHJcbiAgZW5nYWdlbWVudFRyZW5kczogRW5nYWdlbWVudFRyZW5kW107XHJcbiAgY29udGVudFN1aXRhYmlsaXR5OiBDb250ZW50U3VpdGFiaWxpdHlTY29yZTtcclxuICByZWNvbW1lbmRlZEFjdGlvbnM6IFJlY29tbWVuZGVkQWN0aW9uW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2F0ZWdvcnlCcmVha2Rvd24ge1xyXG4gIGNhdGVnb3J5SWQ6IHN0cmluZztcclxuICBjYXRlZ29yeU5hbWU6IHN0cmluZztcclxuICB2aWRlb0NvdW50OiBudW1iZXI7XHJcbiAgYXZlcmFnZVZpZXdzOiBudW1iZXI7XHJcbiAgYXZlcmFnZUVuZ2FnZW1lbnQ6IG51bWJlcjtcclxuICB0b3BWaWRlbzogVHJlbmREYXRhIHwgbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbmdhZ2VtZW50VHJlbmQge1xyXG4gIHRpbWVmcmFtZTogc3RyaW5nO1xyXG4gIGF2ZXJhZ2VFbmdhZ2VtZW50OiBudW1iZXI7XHJcbiAgdHJlbmREaXJlY3Rpb246ICd1cCcgfCAnZG93bicgfCAnc3RhYmxlJztcclxuICBjb25maWRlbmNlOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGVudFN1aXRhYmlsaXR5U2NvcmUge1xyXG4gIGF1ZGlvTmFycmF0aW9uU2NvcmU6IG51bWJlcjtcclxuICB2aXN1YWxDb250ZW50U2NvcmU6IG51bWJlcjtcclxuICBlZHVjYXRpb25hbFZhbHVlOiBudW1iZXI7XHJcbiAgdmlyYWxQb3RlbnRpYWw6IG51bWJlcjtcclxuICBtb25ldGl6YXRpb25GcmllbmRseTogbnVtYmVyO1xyXG4gIG92ZXJhbGxTY29yZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlY29tbWVuZGVkQWN0aW9uIHtcclxuICB0eXBlOiAnY29udGVudF9jcmVhdGlvbicgfCAndGltaW5nJyB8ICdvcHRpbWl6YXRpb24nIHwgJ3RhcmdldGluZyc7XHJcbiAgcHJpb3JpdHk6ICdoaWdoJyB8ICdtZWRpdW0nIHwgJ2xvdyc7XHJcbiAgZGVzY3JpcHRpb246IHN0cmluZztcclxuICBleHBlY3RlZEltcGFjdDogbnVtYmVyO1xyXG4gIGVmZm9ydDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRyZW5kQW5hbHlzaXNPcHRpb25zIHtcclxuICBpbmNsdWRlS2V5d29yZEFuYWx5c2lzPzogYm9vbGVhbjtcclxuICBpbmNsdWRlQ29tcGV0aXRvckFuYWx5c2lzPzogYm9vbGVhbjtcclxuICBpbmNsdWRlUGVyZm9ybWFuY2VQcmVkaWN0aW9uPzogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRyZW5kRGV0ZWN0aW9uU2VydmljZSB7XHJcbiAgcHJpdmF0ZSB5b3V0dWJlQ2xpZW50OiBZb3VUdWJlQXBpQ2xpZW50O1xyXG4gIHByaXZhdGUgdHJlbmRSZXBvc2l0b3J5OiBUcmVuZFJlcG9zaXRvcnk7XHJcbiAgcHJpdmF0ZSBjb25maWc6IFRyZW5kRGV0ZWN0aW9uQ29uZmlnO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHlvdXR1YmVDbGllbnQ6IFlvdVR1YmVBcGlDbGllbnQsXHJcbiAgICB0cmVuZFJlcG9zaXRvcnk6IFRyZW5kUmVwb3NpdG9yeSxcclxuICAgIGNvbmZpZzogUGFydGlhbDxUcmVuZERldGVjdGlvbkNvbmZpZz4gPSB7fVxyXG4gICkge1xyXG4gICAgdGhpcy55b3V0dWJlQ2xpZW50ID0geW91dHViZUNsaWVudDtcclxuICAgIHRoaXMudHJlbmRSZXBvc2l0b3J5ID0gdHJlbmRSZXBvc2l0b3J5O1xyXG4gICAgdGhpcy5jb25maWcgPSB7XHJcbiAgICAgIHRvcGljczogY29uZmlnLnRvcGljcyB8fCBbJ2VkdWNhdGlvbicsICdpbnZlc3RpbmcnLCAndG91cmlzbScsICd0ZWNobm9sb2d5JywgJ2hlYWx0aCcsICdmaW5hbmNlJ10sXHJcbiAgICAgIHJlZ2lvbnM6IGNvbmZpZy5yZWdpb25zIHx8IFsnVVMnLCAnR0InLCAnQ0EnLCAnQVUnXSxcclxuICAgICAgY2F0ZWdvcmllczogY29uZmlnLmNhdGVnb3JpZXMgfHwgWycxOScsICcyMicsICcyMycsICcyNycsICcyOCddLCAvLyBUcmF2ZWwgJiBFdmVudHMsIFBlb3BsZSAmIEJsb2dzLCBDb21lZHksIEVkdWNhdGlvbiwgU2NpZW5jZSAmIFRlY2hub2xvZ3lcclxuICAgICAgbWF4UmVzdWx0c1BlclF1ZXJ5OiBjb25maWcubWF4UmVzdWx0c1BlclF1ZXJ5IHx8IDI1LFxyXG4gICAgICBtaW5WaWV3Q291bnQ6IGNvbmZpZy5taW5WaWV3Q291bnQgfHwgMTAwMCxcclxuICAgICAgbWluRW5nYWdlbWVudFJhdGU6IGNvbmZpZy5taW5FbmdhZ2VtZW50UmF0ZSB8fCAxLjAsXHJcbiAgICAgIGhvdXJzQmFjazogY29uZmlnLmhvdXJzQmFjayB8fCAyNCxcclxuICAgICAgY3VzdG9tVG9waWNzOiBjb25maWcuY3VzdG9tVG9waWNzIHx8IHRoaXMuZ2V0RGVmYXVsdEN1c3RvbVRvcGljcygpLFxyXG4gICAgICBlbmdhZ2VtZW50V2VpZ2h0czogY29uZmlnLmVuZ2FnZW1lbnRXZWlnaHRzIHx8IHRoaXMuZ2V0RGVmYXVsdEVuZ2FnZW1lbnRXZWlnaHRzKCksXHJcbiAgICAgIGNvbnRlbnRGaWx0ZXJzOiBjb25maWcuY29udGVudEZpbHRlcnMgfHwgdGhpcy5nZXREZWZhdWx0Q29udGVudEZpbHRlcnMoKVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGRldGVjdFRyZW5kcyhcclxuICAgIHRvcGljPzogc3RyaW5nLFxyXG4gICAgb3B0aW9uczogVHJlbmRBbmFseXNpc09wdGlvbnMgPSB7fVxyXG4gICk6IFByb21pc2U8VHJlbmREZXRlY3Rpb25SZXN1bHRbXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogVHJlbmREZXRlY3Rpb25SZXN1bHRbXSA9IFtdO1xyXG4gICAgY29uc3QgdG9waWNzVG9BbmFseXplID0gdG9waWMgPyBbdG9waWNdIDogdGhpcy5jb25maWcudG9waWNzO1xyXG5cclxuICAgIGZvciAoY29uc3QgY3VycmVudFRvcGljIG9mIHRvcGljc1RvQW5hbHl6ZSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgRGV0ZWN0aW5nIHRyZW5kcyBmb3IgdG9waWM6ICR7Y3VycmVudFRvcGljfWApO1xyXG4gICAgICBcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB0cmVuZFJlc3VsdCA9IGF3YWl0IHRoaXMuYW5hbHl6ZVRvcGljKGN1cnJlbnRUb3BpYywgb3B0aW9ucyk7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKHRyZW5kUmVzdWx0KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBTbWFsbCBkZWxheSBiZXR3ZWVuIHRvcGljcyB0byByZXNwZWN0IHJhdGUgbGltaXRzXHJcbiAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCgxMDAwKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gYW5hbHl6ZSB0b3BpYyAke2N1cnJlbnRUb3BpY306YCwgZXJyb3IpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFkZCBlbXB0eSByZXN1bHQgZm9yIGZhaWxlZCB0b3BpY1xyXG4gICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICB0b3BpYzogY3VycmVudFRvcGljLFxyXG4gICAgICAgICAgdHJlbmRzRm91bmQ6IDAsXHJcbiAgICAgICAgICB0b3BUcmVuZDogbnVsbCxcclxuICAgICAgICAgIGF2ZXJhZ2VFbmdhZ2VtZW50OiAwLFxyXG4gICAgICAgICAgdG90YWxWaWV3czogMCxcclxuICAgICAgICAgIGtleXdvcmRzOiBbXSxcclxuICAgICAgICAgIGNhdGVnb3J5QnJlYWtkb3duOiBbXSxcclxuICAgICAgICAgIGVuZ2FnZW1lbnRUcmVuZHM6IFtdLFxyXG4gICAgICAgICAgY29udGVudFN1aXRhYmlsaXR5OiB7XHJcbiAgICAgICAgICAgIGF1ZGlvTmFycmF0aW9uU2NvcmU6IDAsXHJcbiAgICAgICAgICAgIHZpc3VhbENvbnRlbnRTY29yZTogMCxcclxuICAgICAgICAgICAgZWR1Y2F0aW9uYWxWYWx1ZTogMCxcclxuICAgICAgICAgICAgdmlyYWxQb3RlbnRpYWw6IDAsXHJcbiAgICAgICAgICAgIG1vbmV0aXphdGlvbkZyaWVuZGx5OiAwLFxyXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6IDBcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICByZWNvbW1lbmRlZEFjdGlvbnM6IFtdXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgYW5hbHl6ZVRvcGljKFxyXG4gICAgdG9waWM6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IFRyZW5kQW5hbHlzaXNPcHRpb25zXHJcbiAgKTogUHJvbWlzZTxUcmVuZERldGVjdGlvblJlc3VsdD4ge1xyXG4gICAgY29uc3QgdHJlbmRzOiBUcmVuZERhdGFbXSA9IFtdO1xyXG4gICAgbGV0IHRvdGFsVmlld3MgPSAwO1xyXG4gICAgbGV0IHRvdGFsRW5nYWdlbWVudCA9IDA7XHJcbiAgICBjb25zdCBhbGxLZXl3b3Jkczogc3RyaW5nW10gPSBbXTtcclxuICAgIGNvbnN0IGNhdGVnb3J5U3RhdHM6IE1hcDxzdHJpbmcsIENhdGVnb3J5QnJlYWtkb3duPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAvLyBHZXQgY3VzdG9tIHRvcGljIGNvbmZpZ3VyYXRpb25cclxuICAgIGNvbnN0IGN1c3RvbVRvcGljID0gdGhpcy5jb25maWcuY3VzdG9tVG9waWNzPy5maW5kKGN0ID0+IGN0Lm5hbWUgPT09IHRvcGljKTtcclxuICAgIGNvbnN0IHNlYXJjaFN0cmF0ZWdpZXMgPSBjdXN0b21Ub3BpYz8uc2VhcmNoUXVlcmllcyB8fCBbXHJcbiAgICAgIGAke3RvcGljfSB0cmVuZGluZ2AsXHJcbiAgICAgIGAke3RvcGljfSB2aXJhbGAsXHJcbiAgICAgIGAke3RvcGljfSAyMDI0YCxcclxuICAgICAgYGJlc3QgJHt0b3BpY31gLFxyXG4gICAgICBgJHt0b3BpY30gdGlwc2BcclxuICAgIF07XHJcblxyXG4gICAgLy8gVXNlIHRvcGljLXNwZWNpZmljIGNhdGVnb3JpZXMgaWYgYXZhaWxhYmxlXHJcbiAgICBjb25zdCByZWxldmFudENhdGVnb3JpZXMgPSBjdXN0b21Ub3BpYz8uY2F0ZWdvcmllcyB8fCB0aGlzLmNvbmZpZy5jYXRlZ29yaWVzO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBBbmFseXppbmcgdG9waWM6ICR7dG9waWN9IHdpdGggJHtzZWFyY2hTdHJhdGVnaWVzLmxlbmd0aH0gc2VhcmNoIHN0cmF0ZWdpZXMgYW5kICR7cmVsZXZhbnRDYXRlZ29yaWVzLmxlbmd0aH0gY2F0ZWdvcmllc2ApO1xyXG5cclxuICAgIC8vIFNlYXJjaCBmb3IgdHJlbmRpbmcgY29udGVudCB1c2luZyB0b3BpYy1zcGVjaWZpYyBzdHJhdGVnaWVzXHJcbiAgICBmb3IgKGNvbnN0IHF1ZXJ5IG9mIHNlYXJjaFN0cmF0ZWdpZXMpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBzZWFyY2hSZXN1bHRzID0gYXdhaXQgdGhpcy55b3V0dWJlQ2xpZW50LnNlYXJjaFZpZGVvcyhxdWVyeSwge1xyXG4gICAgICAgICAgbWF4UmVzdWx0czogTWF0aC5mbG9vcih0aGlzLmNvbmZpZy5tYXhSZXN1bHRzUGVyUXVlcnkgLyBzZWFyY2hTdHJhdGVnaWVzLmxlbmd0aCksXHJcbiAgICAgICAgICBvcmRlcjogJ3ZpZXdDb3VudCcsXHJcbiAgICAgICAgICBwdWJsaXNoZWRBZnRlcjogdGhpcy5nZXRQdWJsaXNoZWRBZnRlckRhdGUoKSxcclxuICAgICAgICAgIHJlZ2lvbkNvZGU6ICdVUycgLy8gUHJpbWFyeSByZWdpb24sIGNhbiBiZSBtYWRlIGNvbmZpZ3VyYWJsZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoc2VhcmNoUmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAvLyBHZXQgZGV0YWlsZWQgdmlkZW8gaW5mb3JtYXRpb25cclxuICAgICAgICAgIGNvbnN0IHZpZGVvSWRzID0gc2VhcmNoUmVzdWx0cy5tYXAocmVzdWx0ID0+IHJlc3VsdC52aWRlb0lkKTtcclxuICAgICAgICAgIGNvbnN0IHZpZGVvRGV0YWlscyA9IGF3YWl0IHRoaXMueW91dHViZUNsaWVudC5nZXRWaWRlb0RldGFpbHModmlkZW9JZHMpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBDb252ZXJ0IHRvIHRyZW5kIGRhdGEgYW5kIGZpbHRlclxyXG4gICAgICAgICAgY29uc3QgdmFsaWRUcmVuZHMgPSB2aWRlb0RldGFpbHNcclxuICAgICAgICAgICAgLmZpbHRlcih2aWRlbyA9PiB0aGlzLmlzVmFsaWRUcmVuZCh2aWRlbywgY3VzdG9tVG9waWMpKVxyXG4gICAgICAgICAgICAubWFwKHZpZGVvID0+IHRoaXMuY29udmVydFRvVHJlbmREYXRhKHZpZGVvLCB0b3BpYykpO1xyXG5cclxuICAgICAgICAgIHRyZW5kcy5wdXNoKC4uLnZhbGlkVHJlbmRzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJhdGUgbGltaXRpbmcgZGVsYXlcclxuICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKDUwMCk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgU2VhcmNoIGZhaWxlZCBmb3IgcXVlcnkgXCIke3F1ZXJ5fVwiOmAsIGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIHRyZW5kaW5nIHZpZGVvcyBpbiByZWxldmFudCBjYXRlZ29yaWVzXHJcbiAgICBmb3IgKGNvbnN0IGNhdGVnb3J5SWQgb2YgcmVsZXZhbnRDYXRlZ29yaWVzKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgdHJlbmRpbmdWaWRlb3MgPSBhd2FpdCB0aGlzLnlvdXR1YmVDbGllbnQuZ2V0VHJlbmRpbmdWaWRlb3MoJ1VTJywgY2F0ZWdvcnlJZCwgMjApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHJlbGV2YW50VHJlbmRpbmcgPSB0cmVuZGluZ1ZpZGVvc1xyXG4gICAgICAgICAgLmZpbHRlcih2aWRlbyA9PiB0aGlzLmlzUmVsZXZhbnRUb1RvcGljKHZpZGVvLCB0b3BpYywgY3VzdG9tVG9waWMpKVxyXG4gICAgICAgICAgLmZpbHRlcih2aWRlbyA9PiB0aGlzLmlzVmFsaWRUcmVuZCh2aWRlbywgY3VzdG9tVG9waWMpKVxyXG4gICAgICAgICAgLm1hcCh2aWRlbyA9PiB0aGlzLmNvbnZlcnRUb1RyZW5kRGF0YSh2aWRlbywgdG9waWMpKTtcclxuXHJcbiAgICAgICAgdHJlbmRzLnB1c2goLi4ucmVsZXZhbnRUcmVuZGluZyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVXBkYXRlIGNhdGVnb3J5IHN0YXRpc3RpY3NcclxuICAgICAgICB0aGlzLnVwZGF0ZUNhdGVnb3J5U3RhdHMoY2F0ZWdvcnlTdGF0cywgY2F0ZWdvcnlJZCwgcmVsZXZhbnRUcmVuZGluZyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCg1MDApO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBnZXQgdHJlbmRpbmcgdmlkZW9zIGZvciBjYXRlZ29yeSAke2NhdGVnb3J5SWR9OmAsIGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGFuZCBjYWxjdWxhdGUgZW5oYW5jZWQgZW5nYWdlbWVudCBzY29yZXNcclxuICAgIGNvbnN0IHVuaXF1ZVRyZW5kcyA9IHRoaXMucmVtb3ZlRHVwbGljYXRlVHJlbmRzKHRyZW5kcyk7XHJcbiAgICBjb25zdCBlbmhhbmNlZFRyZW5kcyA9IHVuaXF1ZVRyZW5kcy5tYXAodHJlbmQgPT4gKHtcclxuICAgICAgLi4udHJlbmQsXHJcbiAgICAgIGVuZ2FnZW1lbnRTY29yZTogdGhpcy5jYWxjdWxhdGVFbmhhbmNlZEVuZ2FnZW1lbnRTY29yZSh0cmVuZClcclxuICAgIH0pKTtcclxuICAgIFxyXG4gICAgY29uc3Qgc29ydGVkVHJlbmRzID0gZW5oYW5jZWRUcmVuZHMuc29ydCgoYSwgYikgPT4gYi5lbmdhZ2VtZW50U2NvcmUgLSBhLmVuZ2FnZW1lbnRTY29yZSk7XHJcblxyXG4gICAgLy8gU2F2ZSB0cmVuZHMgdG8gZGF0YWJhc2VcclxuICAgIGlmIChzb3J0ZWRUcmVuZHMubGVuZ3RoID4gMCkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMudHJlbmRSZXBvc2l0b3J5LnNhdmVUcmVuZHMoc29ydGVkVHJlbmRzKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSB0cmVuZHMgdG8gZGF0YWJhc2U6JywgZXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGFuYWx5dGljc1xyXG4gICAgdG90YWxWaWV3cyA9IHNvcnRlZFRyZW5kcy5yZWR1Y2UoKHN1bSwgdHJlbmQpID0+IHN1bSArIHRyZW5kLnZpZXdDb3VudCwgMCk7XHJcbiAgICB0b3RhbEVuZ2FnZW1lbnQgPSBzb3J0ZWRUcmVuZHMucmVkdWNlKChzdW0sIHRyZW5kKSA9PiBzdW0gKyB0cmVuZC5lbmdhZ2VtZW50UmF0ZSwgMCk7XHJcbiAgICBcclxuICAgIC8vIEV4dHJhY3Qga2V5d29yZHNcclxuICAgIHNvcnRlZFRyZW5kcy5mb3JFYWNoKHRyZW5kID0+IHtcclxuICAgICAgYWxsS2V5d29yZHMucHVzaCguLi50cmVuZC5rZXl3b3Jkcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB0b3BLZXl3b3JkcyA9IHRoaXMuZ2V0VG9wS2V5d29yZHMoYWxsS2V5d29yZHMsIDEwKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBjYXRlZ29yeSBicmVha2Rvd25cclxuICAgIGNvbnN0IGNhdGVnb3J5QnJlYWtkb3duID0gQXJyYXkuZnJvbShjYXRlZ29yeVN0YXRzLnZhbHVlcygpKTtcclxuXHJcbiAgICAvLyBBbmFseXplIGVuZ2FnZW1lbnQgdHJlbmRzXHJcbiAgICBjb25zdCBlbmdhZ2VtZW50VHJlbmRzID0gYXdhaXQgdGhpcy5hbmFseXplRW5nYWdlbWVudFRyZW5kcyh0b3BpYywgc29ydGVkVHJlbmRzKTtcclxuXHJcbiAgICAvLyBDYWxjdWxhdGUgY29udGVudCBzdWl0YWJpbGl0eVxyXG4gICAgY29uc3QgY29udGVudFN1aXRhYmlsaXR5ID0gdGhpcy5jYWxjdWxhdGVDb250ZW50U3VpdGFiaWxpdHkoc29ydGVkVHJlbmRzLCBjdXN0b21Ub3BpYyk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgcmVjb21tZW5kZWQgYWN0aW9uc1xyXG4gICAgY29uc3QgcmVjb21tZW5kZWRBY3Rpb25zID0gdGhpcy5nZW5lcmF0ZVJlY29tbWVuZGVkQWN0aW9ucyhzb3J0ZWRUcmVuZHMsIGNvbnRlbnRTdWl0YWJpbGl0eSwgY3VzdG9tVG9waWMpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRvcGljLFxyXG4gICAgICB0cmVuZHNGb3VuZDogc29ydGVkVHJlbmRzLmxlbmd0aCxcclxuICAgICAgdG9wVHJlbmQ6IHNvcnRlZFRyZW5kc1swXSB8fCBudWxsLFxyXG4gICAgICBhdmVyYWdlRW5nYWdlbWVudDogc29ydGVkVHJlbmRzLmxlbmd0aCA+IDAgPyB0b3RhbEVuZ2FnZW1lbnQgLyBzb3J0ZWRUcmVuZHMubGVuZ3RoIDogMCxcclxuICAgICAgdG90YWxWaWV3cyxcclxuICAgICAga2V5d29yZHM6IHRvcEtleXdvcmRzLFxyXG4gICAgICBjYXRlZ29yeUJyZWFrZG93bixcclxuICAgICAgZW5nYWdlbWVudFRyZW5kcyxcclxuICAgICAgY29udGVudFN1aXRhYmlsaXR5LFxyXG4gICAgICByZWNvbW1lbmRlZEFjdGlvbnNcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGlzVmFsaWRUcmVuZCh2aWRlbzogWW91VHViZVZpZGVvRGV0YWlscywgY3VzdG9tVG9waWM/OiBDdXN0b21Ub3BpY0NvbmZpZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgYmFzaWNWYWxpZGF0aW9uID0gKFxyXG4gICAgICB2aWRlby52aWV3Q291bnQgPj0gdGhpcy5jb25maWcubWluVmlld0NvdW50ICYmXHJcbiAgICAgIHRoaXMuY2FsY3VsYXRlRW5nYWdlbWVudFJhdGUodmlkZW8pID49IHRoaXMuY29uZmlnLm1pbkVuZ2FnZW1lbnRSYXRlICYmXHJcbiAgICAgIHRoaXMuaXNSZWNlbnRFbm91Z2godmlkZW8ucHVibGlzaGVkQXQpXHJcbiAgICApO1xyXG5cclxuICAgIGlmICghYmFzaWNWYWxpZGF0aW9uKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgLy8gQXBwbHkgY29udGVudCBmaWx0ZXJzXHJcbiAgICBpZiAodGhpcy5jb25maWcuY29udGVudEZpbHRlcnMpIHtcclxuICAgICAgY29uc3QgZmlsdGVycyA9IHRoaXMuY29uZmlnLmNvbnRlbnRGaWx0ZXJzO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZXhjbHVkZWQga2V5d29yZHNcclxuICAgICAgY29uc3QgY29udGVudFRleHQgPSBgJHt2aWRlby50aXRsZX0gJHt2aWRlby5kZXNjcmlwdGlvbn1gLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGlmIChmaWx0ZXJzLmV4Y2x1ZGVLZXl3b3Jkcy5zb21lKGtleXdvcmQgPT4gY29udGVudFRleHQuaW5jbHVkZXMoa2V5d29yZC50b0xvd2VyQ2FzZSgpKSkpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIHJlcXVpcmVkIGtleXdvcmRzXHJcbiAgICAgIGlmIChmaWx0ZXJzLnJlcXVpcmVkS2V5d29yZHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGlmICghZmlsdGVycy5yZXF1aXJlZEtleXdvcmRzLnNvbWUoa2V5d29yZCA9PiBjb250ZW50VGV4dC5pbmNsdWRlcyhrZXl3b3JkLnRvTG93ZXJDYXNlKCkpKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgZHVyYXRpb24gY29uc3RyYWludHNcclxuICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gdGhpcy5wYXJzZUR1cmF0aW9uVG9TZWNvbmRzKHZpZGVvLmR1cmF0aW9uKTtcclxuICAgICAgaWYgKGR1cmF0aW9uU2Vjb25kcyA8IGZpbHRlcnMubWluRHVyYXRpb25TZWNvbmRzIHx8IGR1cmF0aW9uU2Vjb25kcyA+IGZpbHRlcnMubWF4RHVyYXRpb25TZWNvbmRzKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQXBwbHkgY3VzdG9tIHRvcGljIGNvbnN0cmFpbnRzXHJcbiAgICBpZiAoY3VzdG9tVG9waWMpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb25TZWNvbmRzID0gdGhpcy5wYXJzZUR1cmF0aW9uVG9TZWNvbmRzKHZpZGVvLmR1cmF0aW9uKTtcclxuICAgICAgaWYgKGN1c3RvbVRvcGljLm1pbkR1cmF0aW9uICYmIGR1cmF0aW9uU2Vjb25kcyA8IGN1c3RvbVRvcGljLm1pbkR1cmF0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChjdXN0b21Ub3BpYy5tYXhEdXJhdGlvbiAmJiBkdXJhdGlvblNlY29uZHMgPiBjdXN0b21Ub3BpYy5tYXhEdXJhdGlvbikge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc1JlbGV2YW50VG9Ub3BpYyh2aWRlbzogWW91VHViZVZpZGVvRGV0YWlscywgdG9waWM6IHN0cmluZywgY3VzdG9tVG9waWM/OiBDdXN0b21Ub3BpY0NvbmZpZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3Qgc2VhcmNoVGV4dCA9IGAke3ZpZGVvLnRpdGxlfSAke3ZpZGVvLmRlc2NyaXB0aW9ufWAudG9Mb3dlckNhc2UoKTtcclxuICAgIFxyXG4gICAgLy8gVXNlIGN1c3RvbSB0b3BpYyBrZXl3b3JkcyBpZiBhdmFpbGFibGVcclxuICAgIGNvbnN0IHRvcGljS2V5d29yZHMgPSBjdXN0b21Ub3BpYz8ua2V5d29yZHMgfHwgdGhpcy5nZXRUb3BpY0tleXdvcmRzKHRvcGljKTtcclxuICAgIFxyXG4gICAgLy8gQ2FsY3VsYXRlIHJlbGV2YW5jZSBzY29yZVxyXG4gICAgbGV0IHJlbGV2YW5jZVNjb3JlID0gMDtcclxuICAgIGxldCBrZXl3b3JkTWF0Y2hlcyA9IDA7XHJcblxyXG4gICAgdG9waWNLZXl3b3Jkcy5mb3JFYWNoKGtleXdvcmQgPT4ge1xyXG4gICAgICBjb25zdCBrZXl3b3JkTG93ZXIgPSBrZXl3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGlmIChzZWFyY2hUZXh0LmluY2x1ZGVzKGtleXdvcmRMb3dlcikpIHtcclxuICAgICAgICBrZXl3b3JkTWF0Y2hlcysrO1xyXG4gICAgICAgIC8vIEdpdmUgaGlnaGVyIHNjb3JlIGZvciB0aXRsZSBtYXRjaGVzXHJcbiAgICAgICAgaWYgKHZpZGVvLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoa2V5d29yZExvd2VyKSkge1xyXG4gICAgICAgICAgcmVsZXZhbmNlU2NvcmUgKz0gMjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmVsZXZhbmNlU2NvcmUgKz0gMTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlcXVpcmUgYXQgbGVhc3QgMSBrZXl3b3JkIG1hdGNoIGFuZCBtaW5pbXVtIHJlbGV2YW5jZSBzY29yZVxyXG4gICAgcmV0dXJuIGtleXdvcmRNYXRjaGVzID4gMCAmJiByZWxldmFuY2VTY29yZSA+PSAxO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZXRUb3BpY0tleXdvcmRzKHRvcGljOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICBjb25zdCBrZXl3b3JkTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XHJcbiAgICAgIHRvdXJpc206IFsndHJhdmVsJywgJ3ZhY2F0aW9uJywgJ2hvbGlkYXknLCAnZGVzdGluYXRpb24nLCAndG91cmlzdCcsICdzaWdodHNlZWluZycsICd0cmlwJ10sXHJcbiAgICAgIHRyYXZlbDogWydqb3VybmV5JywgJ2FkdmVudHVyZScsICdleHBsb3JlJywgJ3dhbmRlcmx1c3QnLCAnYmFja3BhY2snLCAncm9hZCB0cmlwJ10sXHJcbiAgICAgIGZvb2Q6IFsncmVjaXBlJywgJ2Nvb2tpbmcnLCAnY3Vpc2luZScsICdyZXN0YXVyYW50JywgJ2NoZWYnLCAnZGVsaWNpb3VzJywgJ3Rhc3RlJ10sXHJcbiAgICAgIHRlY2hub2xvZ3k6IFsndGVjaCcsICdnYWRnZXQnLCAnaW5ub3ZhdGlvbicsICdkaWdpdGFsJywgJ3NvZnR3YXJlJywgJ2FwcCcsICdkZXZpY2UnXSxcclxuICAgICAgZml0bmVzczogWyd3b3Jrb3V0JywgJ2V4ZXJjaXNlJywgJ2hlYWx0aCcsICdneW0nLCAndHJhaW5pbmcnLCAnbnV0cml0aW9uJywgJ3dlbGxuZXNzJ11cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIGtleXdvcmRNYXBbdG9waWMudG9Mb3dlckNhc2UoKV0gfHwgW3RvcGljXTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2FsY3VsYXRlRW5nYWdlbWVudFJhdGUodmlkZW86IFlvdVR1YmVWaWRlb0RldGFpbHMpOiBudW1iZXIge1xyXG4gICAgaWYgKHZpZGVvLnZpZXdDb3VudCA9PT0gMCkgcmV0dXJuIDA7XHJcbiAgICByZXR1cm4gKCh2aWRlby5saWtlQ291bnQgKyB2aWRlby5jb21tZW50Q291bnQpIC8gdmlkZW8udmlld0NvdW50KSAqIDEwMDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaXNSZWNlbnRFbm91Z2gocHVibGlzaGVkQXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgcHVibGlzaGVkRGF0ZSA9IG5ldyBEYXRlKHB1Ymxpc2hlZEF0KTtcclxuICAgIGNvbnN0IGN1dG9mZkRhdGUgPSBuZXcgRGF0ZShEYXRlLm5vdygpIC0gdGhpcy5jb25maWcuaG91cnNCYWNrICogNjAgKiA2MCAqIDEwMDApO1xyXG4gICAgcmV0dXJuIHB1Ymxpc2hlZERhdGUgPj0gY3V0b2ZmRGF0ZTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0UHVibGlzaGVkQWZ0ZXJEYXRlKCk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoRGF0ZS5ub3coKSAtIHRoaXMuY29uZmlnLmhvdXJzQmFjayAqIDYwICogNjAgKiAxMDAwKTtcclxuICAgIHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbnZlcnRUb1RyZW5kRGF0YSh2aWRlbzogWW91VHViZVZpZGVvRGV0YWlscywgdG9waWM6IHN0cmluZyk6IFRyZW5kRGF0YSB7XHJcbiAgICByZXR1cm4gVHJlbmREYXRhTW9kZWwuZnJvbVlvdVR1YmVBcGlSZXNwb25zZSh7XHJcbiAgICAgIGlkOiB2aWRlby5pZCxcclxuICAgICAgc25pcHBldDoge1xyXG4gICAgICAgIHRpdGxlOiB2aWRlby50aXRsZSxcclxuICAgICAgICBjaGFubmVsVGl0bGU6IHZpZGVvLmNoYW5uZWxUaXRsZSxcclxuICAgICAgICBjaGFubmVsSWQ6IHZpZGVvLmNoYW5uZWxJZCxcclxuICAgICAgICBwdWJsaXNoZWRBdDogdmlkZW8ucHVibGlzaGVkQXQsXHJcbiAgICAgICAgY2F0ZWdvcnlJZDogdmlkZW8uY2F0ZWdvcnlJZCxcclxuICAgICAgICB0aHVtYm5haWxzOiB2aWRlby50aHVtYm5haWxzXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YXRpc3RpY3M6IHtcclxuICAgICAgICB2aWV3Q291bnQ6IHZpZGVvLnZpZXdDb3VudC50b1N0cmluZygpLFxyXG4gICAgICAgIGxpa2VDb3VudDogdmlkZW8ubGlrZUNvdW50LnRvU3RyaW5nKCksXHJcbiAgICAgICAgY29tbWVudENvdW50OiB2aWRlby5jb21tZW50Q291bnQudG9TdHJpbmcoKVxyXG4gICAgICB9LFxyXG4gICAgICBjb250ZW50RGV0YWlsczoge1xyXG4gICAgICAgIGR1cmF0aW9uOiB2aWRlby5kdXJhdGlvblxyXG4gICAgICB9XHJcbiAgICB9LCB0b3BpYyk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbW92ZUR1cGxpY2F0ZVRyZW5kcyh0cmVuZHM6IFRyZW5kRGF0YVtdKTogVHJlbmREYXRhW10ge1xyXG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgcmV0dXJuIHRyZW5kcy5maWx0ZXIodHJlbmQgPT4ge1xyXG4gICAgICBpZiAoc2Vlbi5oYXModHJlbmQudmlkZW9JZCkpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgc2Vlbi5hZGQodHJlbmQudmlkZW9JZCk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldFRvcEtleXdvcmRzKGtleXdvcmRzOiBzdHJpbmdbXSwgbGltaXQ6IG51bWJlcik6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IGtleXdvcmRDb3VudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICAgIFxyXG4gICAga2V5d29yZHMuZm9yRWFjaChrZXl3b3JkID0+IHtcclxuICAgICAga2V5d29yZENvdW50c1trZXl3b3JkXSA9IChrZXl3b3JkQ291bnRzW2tleXdvcmRdIHx8IDApICsgMTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBPYmplY3QuZW50cmllcyhrZXl3b3JkQ291bnRzKVxyXG4gICAgICAuc29ydCgoWywgYV0sIFssIGJdKSA9PiBiIC0gYSlcclxuICAgICAgLnNsaWNlKDAsIGxpbWl0KVxyXG4gICAgICAubWFwKChba2V5d29yZF0pID0+IGtleXdvcmQpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldERlZmF1bHRDdXN0b21Ub3BpY3MoKTogQ3VzdG9tVG9waWNDb25maWdbXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICB7XHJcbiAgICAgICAgbmFtZTogJ2VkdWNhdGlvbicsXHJcbiAgICAgICAga2V5d29yZHM6IFsnbGVhcm4nLCAndHV0b3JpYWwnLCAnY291cnNlJywgJ2xlc3NvbicsICdzdHVkeScsICdrbm93bGVkZ2UnLCAnc2tpbGwnXSxcclxuICAgICAgICBjYXRlZ29yaWVzOiBbJzI3J10sIC8vIEVkdWNhdGlvblxyXG4gICAgICAgIHNlYXJjaFF1ZXJpZXM6IFsnaG93IHRvIGxlYXJuJywgJ2VkdWNhdGlvbmFsIGNvbnRlbnQnLCAnb25saW5lIGNvdXJzZScsICdzdHVkeSB0aXBzJ10sXHJcbiAgICAgICAgbWluRHVyYXRpb246IDMwMCwgLy8gNSBtaW51dGVzXHJcbiAgICAgICAgbWF4RHVyYXRpb246IDE4MDAsIC8vIDMwIG1pbnV0ZXNcclxuICAgICAgICBhdWRpb05hcnJhdGlvblN1aXRhYmxlOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiAnaW52ZXN0aW5nJyxcclxuICAgICAgICBrZXl3b3JkczogWydzdG9ja3MnLCAnaW52ZXN0bWVudCcsICdwb3J0Zm9saW8nLCAnRVRGJywgJ3RyYWRpbmcnLCAnZmluYW5jZScsICdtYXJrZXQnXSxcclxuICAgICAgICBjYXRlZ29yaWVzOiBbJzI1J10sIC8vIE5ld3MgJiBQb2xpdGljcyAoY2xvc2VzdCB0byBmaW5hbmNlKVxyXG4gICAgICAgIHNlYXJjaFF1ZXJpZXM6IFsnc3RvY2sgbWFya2V0IGFuYWx5c2lzJywgJ2ludmVzdG1lbnQgdGlwcycsICdwb3J0Zm9saW8gbWFuYWdlbWVudCcsICdFVEYgcmV2aWV3J10sXHJcbiAgICAgICAgbWluRHVyYXRpb246IDYwMCwgLy8gMTAgbWludXRlc1xyXG4gICAgICAgIG1heER1cmF0aW9uOiAyNDAwLCAvLyA0MCBtaW51dGVzXHJcbiAgICAgICAgYXVkaW9OYXJyYXRpb25TdWl0YWJsZTogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgbmFtZTogJ3RvdXJpc20nLFxyXG4gICAgICAgIGtleXdvcmRzOiBbJ3RyYXZlbCcsICd2YWNhdGlvbicsICdkZXN0aW5hdGlvbicsICd0b3VyaXN0JywgJ2FkdmVudHVyZScsICdleHBsb3JlJ10sXHJcbiAgICAgICAgY2F0ZWdvcmllczogWycxOSddLCAvLyBUcmF2ZWwgJiBFdmVudHNcclxuICAgICAgICBzZWFyY2hRdWVyaWVzOiBbJ3RyYXZlbCBndWlkZScsICd2YWNhdGlvbiBkZXN0aW5hdGlvbicsICd0cmF2ZWwgdGlwcycsICdhZHZlbnR1cmUgdHJhdmVsJ10sXHJcbiAgICAgICAgbWluRHVyYXRpb246IDMwMCwgLy8gNSBtaW51dGVzXHJcbiAgICAgICAgbWF4RHVyYXRpb246IDEyMDAsIC8vIDIwIG1pbnV0ZXNcclxuICAgICAgICBhdWRpb05hcnJhdGlvblN1aXRhYmxlOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiAndGVjaG5vbG9neScsXHJcbiAgICAgICAga2V5d29yZHM6IFsndGVjaCcsICdnYWRnZXQnLCAnc29mdHdhcmUnLCAnYXBwJywgJ2lubm92YXRpb24nLCAnZGlnaXRhbCcsICdBSSddLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IFsnMjgnXSwgLy8gU2NpZW5jZSAmIFRlY2hub2xvZ3lcclxuICAgICAgICBzZWFyY2hRdWVyaWVzOiBbJ3RlY2ggcmV2aWV3JywgJ25ldyB0ZWNobm9sb2d5JywgJ2dhZGdldCB1bmJveGluZycsICdzb2Z0d2FyZSB0dXRvcmlhbCddLFxyXG4gICAgICAgIG1pbkR1cmF0aW9uOiAzMDAsIC8vIDUgbWludXRlc1xyXG4gICAgICAgIG1heER1cmF0aW9uOiAxODAwLCAvLyAzMCBtaW51dGVzXHJcbiAgICAgICAgYXVkaW9OYXJyYXRpb25TdWl0YWJsZTogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgbmFtZTogJ2hlYWx0aCcsXHJcbiAgICAgICAga2V5d29yZHM6IFsnaGVhbHRoJywgJ2ZpdG5lc3MnLCAnd2VsbG5lc3MnLCAnbnV0cml0aW9uJywgJ2V4ZXJjaXNlJywgJ21lZGljYWwnXSxcclxuICAgICAgICBjYXRlZ29yaWVzOiBbJzI2J10sIC8vIEhvd3RvICYgU3R5bGUgKGNsb3Nlc3QgdG8gaGVhbHRoKVxyXG4gICAgICAgIHNlYXJjaFF1ZXJpZXM6IFsnaGVhbHRoIHRpcHMnLCAnZml0bmVzcyByb3V0aW5lJywgJ251dHJpdGlvbiBhZHZpY2UnLCAnd2VsbG5lc3MgZ3VpZGUnXSxcclxuICAgICAgICBtaW5EdXJhdGlvbjogMzAwLCAvLyA1IG1pbnV0ZXNcclxuICAgICAgICBtYXhEdXJhdGlvbjogMTUwMCwgLy8gMjUgbWludXRlc1xyXG4gICAgICAgIGF1ZGlvTmFycmF0aW9uU3VpdGFibGU6IHRydWVcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIG5hbWU6ICdmaW5hbmNlJyxcclxuICAgICAgICBrZXl3b3JkczogWydtb25leScsICdidWRnZXQnLCAnc2F2aW5ncycsICdkZWJ0JywgJ2NyZWRpdCcsICdmaW5hbmNpYWwgcGxhbm5pbmcnXSxcclxuICAgICAgICBjYXRlZ29yaWVzOiBbJzI1J10sIC8vIE5ld3MgJiBQb2xpdGljc1xyXG4gICAgICAgIHNlYXJjaFF1ZXJpZXM6IFsncGVyc29uYWwgZmluYW5jZScsICdidWRnZXRpbmcgdGlwcycsICdmaW5hbmNpYWwgYWR2aWNlJywgJ21vbmV5IG1hbmFnZW1lbnQnXSxcclxuICAgICAgICBtaW5EdXJhdGlvbjogNjAwLCAvLyAxMCBtaW51dGVzXHJcbiAgICAgICAgbWF4RHVyYXRpb246IDIxMDAsIC8vIDM1IG1pbnV0ZXNcclxuICAgICAgICBhdWRpb05hcnJhdGlvblN1aXRhYmxlOiB0cnVlXHJcbiAgICAgIH1cclxuICAgIF07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldERlZmF1bHRFbmdhZ2VtZW50V2VpZ2h0cygpOiBFbmdhZ2VtZW50V2VpZ2h0cyB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2aWV3Q291bnQ6IDAuMyxcclxuICAgICAgbGlrZUNvdW50OiAwLjI1LFxyXG4gICAgICBjb21tZW50Q291bnQ6IDAuMjUsXHJcbiAgICAgIHNoYXJlQ291bnQ6IDAuMSxcclxuICAgICAgc3Vic2NyaWJlckdyb3d0aDogMC4wNSxcclxuICAgICAgd2F0Y2hUaW1lOiAwLjA1XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZXREZWZhdWx0Q29udGVudEZpbHRlcnMoKTogQ29udGVudEZpbHRlcnMge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZXhjbHVkZUtleXdvcmRzOiBbJ2V4cGxpY2l0JywgJ2FkdWx0JywgJ25zZncnLCAnY29udHJvdmVyc2lhbCddLFxyXG4gICAgICByZXF1aXJlZEtleXdvcmRzOiBbXSxcclxuICAgICAgbWluRHVyYXRpb25TZWNvbmRzOiA2MCwgLy8gMSBtaW51dGUgbWluaW11bVxyXG4gICAgICBtYXhEdXJhdGlvblNlY29uZHM6IDM2MDAsIC8vIDEgaG91ciBtYXhpbXVtXHJcbiAgICAgIGxhbmd1YWdlQ29kZTogJ2VuJyxcclxuICAgICAgY29udGVudFJhdGluZzogWydub25lJywgJ21pbGQnXVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFRvcFRyZW5kaW5nVG9waWNzKGRheXM6IG51bWJlciA9IDcsIGxpbWl0OiBudW1iZXIgPSAxMCk6IFByb21pc2U8QXJyYXk8e1xyXG4gICAgdG9waWM6IHN0cmluZztcclxuICAgIHRyZW5kQ291bnQ6IG51bWJlcjtcclxuICAgIGF2ZXJhZ2VFbmdhZ2VtZW50OiBudW1iZXI7XHJcbiAgICB0b3BWaWRlbzogVHJlbmREYXRhIHwgbnVsbDtcclxuICB9Pj4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogQXJyYXk8e1xyXG4gICAgICB0b3BpYzogc3RyaW5nO1xyXG4gICAgICB0cmVuZENvdW50OiBudW1iZXI7XHJcbiAgICAgIGF2ZXJhZ2VFbmdhZ2VtZW50OiBudW1iZXI7XHJcbiAgICAgIHRvcFZpZGVvOiBUcmVuZERhdGEgfCBudWxsO1xyXG4gICAgfT4gPSBbXTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHRvcGljIG9mIHRoaXMuY29uZmlnLnRvcGljcykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgdGhpcy50cmVuZFJlcG9zaXRvcnkuZ2V0VG9waWNTdGF0cyh0b3BpYywgZGF5cyk7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgIHRvcGljLFxyXG4gICAgICAgICAgdHJlbmRDb3VudDogc3RhdHMudG90YWxUcmVuZHMsXHJcbiAgICAgICAgICBhdmVyYWdlRW5nYWdlbWVudDogc3RhdHMuYXZlcmFnZUVuZ2FnZW1lbnQsXHJcbiAgICAgICAgICB0b3BWaWRlbzogc3RhdHMudG9wVmlkZW9cclxuICAgICAgICB9KTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZ2V0IHN0YXRzIGZvciB0b3BpYyAke3RvcGljfTpgLCBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0c1xyXG4gICAgICAuc29ydCgoYSwgYikgPT4gYi5hdmVyYWdlRW5nYWdlbWVudCAtIGEuYXZlcmFnZUVuZ2FnZW1lbnQpXHJcbiAgICAgIC5zbGljZSgwLCBsaW1pdCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBwcmVkaWN0VHJlbmRQb3RlbnRpYWwodmlkZW9EYXRhOiB7XHJcbiAgICB0aXRsZTogc3RyaW5nO1xyXG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgIGtleXdvcmRzOiBzdHJpbmdbXTtcclxuICAgIGNhdGVnb3J5SWQ6IHN0cmluZztcclxuICB9KTogUHJvbWlzZTx7XHJcbiAgICBzY29yZTogbnVtYmVyO1xyXG4gICAgZmFjdG9yczogUmVjb3JkPHN0cmluZywgbnVtYmVyPjtcclxuICAgIHJlY29tbWVuZGF0aW9uczogc3RyaW5nW107XHJcbiAgfT4ge1xyXG4gICAgY29uc3QgZmFjdG9yczogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xyXG4gICAgY29uc3QgcmVjb21tZW5kYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgIC8vIEFuYWx5emUgdGl0bGUgZWZmZWN0aXZlbmVzc1xyXG4gICAgY29uc3QgdGl0bGVTY29yZSA9IHRoaXMuYW5hbHl6ZVRpdGxlRWZmZWN0aXZlbmVzcyh2aWRlb0RhdGEudGl0bGUpO1xyXG4gICAgZmFjdG9ycy50aXRsZUVmZmVjdGl2ZW5lc3MgPSB0aXRsZVNjb3JlO1xyXG5cclxuICAgIGlmICh0aXRsZVNjb3JlIDwgMC42KSB7XHJcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKCdDb25zaWRlciBtYWtpbmcgdGhlIHRpdGxlIG1vcmUgZW5nYWdpbmcgd2l0aCBudW1iZXJzIG9yIGVtb3Rpb25hbCB3b3JkcycpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGtleXdvcmQgcmVsZXZhbmNlXHJcbiAgICBjb25zdCBrZXl3b3JkU2NvcmUgPSBhd2FpdCB0aGlzLmFuYWx5emVLZXl3b3JkUmVsZXZhbmNlKHZpZGVvRGF0YS5rZXl3b3Jkcyk7XHJcbiAgICBmYWN0b3JzLmtleXdvcmRSZWxldmFuY2UgPSBrZXl3b3JkU2NvcmU7XHJcblxyXG4gICAgaWYgKGtleXdvcmRTY29yZSA8IDAuNSkge1xyXG4gICAgICByZWNvbW1lbmRhdGlvbnMucHVzaCgnSW5jbHVkZSBtb3JlIHRyZW5kaW5nIGtleXdvcmRzIHJlbGF0ZWQgdG8geW91ciB0b3BpYycpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFuYWx5emUgZGVzY3JpcHRpb24gcXVhbGl0eVxyXG4gICAgY29uc3QgZGVzY3JpcHRpb25TY29yZSA9IHRoaXMuYW5hbHl6ZURlc2NyaXB0aW9uUXVhbGl0eSh2aWRlb0RhdGEuZGVzY3JpcHRpb24pO1xyXG4gICAgZmFjdG9ycy5kZXNjcmlwdGlvblF1YWxpdHkgPSBkZXNjcmlwdGlvblNjb3JlO1xyXG5cclxuICAgIGlmIChkZXNjcmlwdGlvblNjb3JlIDwgMC43KSB7XHJcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKCdJbXByb3ZlIGRlc2NyaXB0aW9uIHdpdGggbW9yZSByZWxldmFudCBrZXl3b3JkcyBhbmQgY2xlYXIgc3RydWN0dXJlJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIG92ZXJhbGwgc2NvcmVcclxuICAgIGNvbnN0IG92ZXJhbGxTY29yZSA9ICh0aXRsZVNjb3JlICogMC40ICsga2V5d29yZFNjb3JlICogMC40ICsgZGVzY3JpcHRpb25TY29yZSAqIDAuMik7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2NvcmU6IE1hdGgucm91bmQob3ZlcmFsbFNjb3JlICogMTAwKSAvIDEwMCxcclxuICAgICAgZmFjdG9ycyxcclxuICAgICAgcmVjb21tZW5kYXRpb25zXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhbmFseXplVGl0bGVFZmZlY3RpdmVuZXNzKHRpdGxlOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgbGV0IHNjb3JlID0gMC41OyAvLyBCYXNlIHNjb3JlXHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIGVuZ2FnaW5nIGVsZW1lbnRzXHJcbiAgICBpZiAoL1xcZCsvLnRlc3QodGl0bGUpKSBzY29yZSArPSAwLjE7IC8vIENvbnRhaW5zIG51bWJlcnNcclxuICAgIGlmICgvWyE/XS8udGVzdCh0aXRsZSkpIHNjb3JlICs9IDAuMTsgLy8gQ29udGFpbnMgZXhjbGFtYXRpb24gb3IgcXVlc3Rpb24gbWFya3NcclxuICAgIGlmICh0aXRsZS5sZW5ndGggPj0gNDAgJiYgdGl0bGUubGVuZ3RoIDw9IDcwKSBzY29yZSArPSAwLjE7IC8vIE9wdGltYWwgbGVuZ3RoXHJcbiAgICBpZiAoL1xcYihiZXN0fHRvcHxhbWF6aW5nfGluY3JlZGlibGV8dWx0aW1hdGV8c2VjcmV0KVxcYi9pLnRlc3QodGl0bGUpKSBzY29yZSArPSAwLjE7IC8vIFBvd2VyIHdvcmRzXHJcbiAgICBpZiAoL1xcYihob3cgdG98dHV0b3JpYWx8Z3VpZGV8dGlwcylcXGIvaS50ZXN0KHRpdGxlKSkgc2NvcmUgKz0gMC4xOyAvLyBFZHVjYXRpb25hbCBrZXl3b3Jkc1xyXG5cclxuICAgIHJldHVybiBNYXRoLm1pbihzY29yZSwgMS4wKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgYW5hbHl6ZUtleXdvcmRSZWxldmFuY2Uoa2V5d29yZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgIGlmIChrZXl3b3Jkcy5sZW5ndGggPT09IDApIHJldHVybiAwO1xyXG5cclxuICAgIGxldCByZWxldmFudENvdW50ID0gMDtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgYWdhaW5zdCByZWNlbnQgdHJlbmRpbmcga2V5d29yZHNcclxuICAgIGZvciAoY29uc3QgdG9waWMgb2YgdGhpcy5jb25maWcudG9waWNzKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVjZW50VHJlbmRzID0gYXdhaXQgdGhpcy50cmVuZFJlcG9zaXRvcnkuZ2V0UmVjZW50VHJlbmRzKDI0LCA1MCk7XHJcbiAgICAgICAgY29uc3QgdHJlbmRpbmdLZXl3b3JkcyA9IHJlY2VudFRyZW5kcy5mbGF0TWFwKHRyZW5kID0+IHRyZW5kLmtleXdvcmRzKTtcclxuICAgICAgICBcclxuICAgICAgICByZWxldmFudENvdW50ICs9IGtleXdvcmRzLmZpbHRlcihrZXl3b3JkID0+IFxyXG4gICAgICAgICAgdHJlbmRpbmdLZXl3b3Jkcy5zb21lKHRyZW5kaW5nID0+IFxyXG4gICAgICAgICAgICB0cmVuZGluZy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGtleXdvcmQudG9Mb3dlckNhc2UoKSlcclxuICAgICAgICAgIClcclxuICAgICAgICApLmxlbmd0aDtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gYW5hbHl6ZSBrZXl3b3JkIHJlbGV2YW5jZTonLCBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gTWF0aC5taW4ocmVsZXZhbnRDb3VudCAvIGtleXdvcmRzLmxlbmd0aCwgMS4wKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYW5hbHl6ZURlc2NyaXB0aW9uUXVhbGl0eShkZXNjcmlwdGlvbjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGxldCBzY29yZSA9IDAuMzsgLy8gQmFzZSBzY29yZVxyXG5cclxuICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGggPj0gMTAwKSBzY29yZSArPSAwLjI7IC8vIEFkZXF1YXRlIGxlbmd0aFxyXG4gICAgaWYgKGRlc2NyaXB0aW9uLmxlbmd0aCA+PSAyMDApIHNjb3JlICs9IDAuMTsgLy8gR29vZCBsZW5ndGhcclxuICAgIGlmICgvaHR0cHM/OlxcL1xcLy8udGVzdChkZXNjcmlwdGlvbikpIHNjb3JlICs9IDAuMTsgLy8gQ29udGFpbnMgbGlua3NcclxuICAgIGlmICgvI1xcdysvLnRlc3QoZGVzY3JpcHRpb24pKSBzY29yZSArPSAwLjE7IC8vIENvbnRhaW5zIGhhc2h0YWdzXHJcbiAgICBpZiAoL1xcYihzdWJzY3JpYmV8bGlrZXxjb21tZW50fHNoYXJlKVxcYi9pLnRlc3QoZGVzY3JpcHRpb24pKSBzY29yZSArPSAwLjE7IC8vIENhbGwgdG8gYWN0aW9uXHJcbiAgICBpZiAoZGVzY3JpcHRpb24uc3BsaXQoJ1xcbicpLmxlbmd0aCA+PSAzKSBzY29yZSArPSAwLjE7IC8vIFdlbGwgc3RydWN0dXJlZFxyXG5cclxuICAgIHJldHVybiBNYXRoLm1pbihzY29yZSwgMS4wKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2FsY3VsYXRlRW5oYW5jZWRFbmdhZ2VtZW50U2NvcmUodHJlbmQ6IFRyZW5kRGF0YSk6IG51bWJlciB7XHJcbiAgICBjb25zdCB3ZWlnaHRzID0gdGhpcy5jb25maWcuZW5nYWdlbWVudFdlaWdodHMhO1xyXG4gICAgXHJcbiAgICAvLyBOb3JtYWxpemUgbWV0cmljcyB0byAwLTEgc2NhbGUgYmFzZWQgb24gdHlwaWNhbCByYW5nZXNcclxuICAgIGNvbnN0IG5vcm1hbGl6ZWRWaWV3cyA9IE1hdGgubWluKHRyZW5kLnZpZXdDb3VudCAvIDEwMDAwMDAsIDEpOyAvLyBDYXAgYXQgMU0gdmlld3NcclxuICAgIGNvbnN0IG5vcm1hbGl6ZWRMaWtlcyA9IE1hdGgubWluKHRyZW5kLmxpa2VDb3VudCAvIDUwMDAwLCAxKTsgLy8gQ2FwIGF0IDUwSyBsaWtlc1xyXG4gICAgY29uc3Qgbm9ybWFsaXplZENvbW1lbnRzID0gTWF0aC5taW4odHJlbmQuY29tbWVudENvdW50IC8gNTAwMCwgMSk7IC8vIENhcCBhdCA1SyBjb21tZW50c1xyXG4gICAgXHJcbiAgICAvLyBDYWxjdWxhdGUgZW5nYWdlbWVudCByYXRlXHJcbiAgICBjb25zdCBlbmdhZ2VtZW50UmF0ZSA9IHRyZW5kLnZpZXdDb3VudCA+IDAgPyBcclxuICAgICAgKHRyZW5kLmxpa2VDb3VudCArIHRyZW5kLmNvbW1lbnRDb3VudCkgLyB0cmVuZC52aWV3Q291bnQgOiAwO1xyXG4gICAgXHJcbiAgICAvLyBDYWxjdWxhdGUgcmVjZW5jeSBib29zdCAobmV3ZXIgY29udGVudCBnZXRzIGhpZ2hlciBzY29yZSlcclxuICAgIGNvbnN0IGhvdXJzT2xkID0gKERhdGUubm93KCkgLSBuZXcgRGF0ZSh0cmVuZC5wdWJsaXNoZWRBdCkuZ2V0VGltZSgpKSAvICgxMDAwICogNjAgKiA2MCk7XHJcbiAgICBjb25zdCByZWNlbmN5Qm9vc3QgPSBNYXRoLm1heCgwLCAxIC0gKGhvdXJzT2xkIC8gKHRoaXMuY29uZmlnLmhvdXJzQmFjayAqIDIpKSk7XHJcbiAgICBcclxuICAgIC8vIENhbGN1bGF0ZSB3ZWlnaHRlZCBzY29yZVxyXG4gICAgY29uc3QgYmFzZVNjb3JlID0gKFxyXG4gICAgICBub3JtYWxpemVkVmlld3MgKiB3ZWlnaHRzLnZpZXdDb3VudCArXHJcbiAgICAgIG5vcm1hbGl6ZWRMaWtlcyAqIHdlaWdodHMubGlrZUNvdW50ICtcclxuICAgICAgbm9ybWFsaXplZENvbW1lbnRzICogd2VpZ2h0cy5jb21tZW50Q291bnQgK1xyXG4gICAgICBlbmdhZ2VtZW50UmF0ZSAqIDEwMCAqIDAuMyAvLyBFbmdhZ2VtZW50IHJhdGUgY29udHJpYnV0aW9uXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICAvLyBBcHBseSByZWNlbmN5IGJvb3N0XHJcbiAgICByZXR1cm4gYmFzZVNjb3JlICogKDEgKyByZWNlbmN5Qm9vc3QgKiAwLjIpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB1cGRhdGVDYXRlZ29yeVN0YXRzKFxyXG4gICAgY2F0ZWdvcnlTdGF0czogTWFwPHN0cmluZywgQ2F0ZWdvcnlCcmVha2Rvd24+LFxyXG4gICAgY2F0ZWdvcnlJZDogc3RyaW5nLFxyXG4gICAgdHJlbmRzOiBUcmVuZERhdGFbXVxyXG4gICk6IHZvaWQge1xyXG4gICAgaWYgKHRyZW5kcy5sZW5ndGggPT09IDApIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBleGlzdGluZyA9IGNhdGVnb3J5U3RhdHMuZ2V0KGNhdGVnb3J5SWQpO1xyXG4gICAgY29uc3QgdG90YWxWaWV3cyA9IHRyZW5kcy5yZWR1Y2UoKHN1bSwgdHJlbmQpID0+IHN1bSArIHRyZW5kLnZpZXdDb3VudCwgMCk7XHJcbiAgICBjb25zdCB0b3RhbEVuZ2FnZW1lbnQgPSB0cmVuZHMucmVkdWNlKChzdW0sIHRyZW5kKSA9PiBzdW0gKyB0cmVuZC5lbmdhZ2VtZW50UmF0ZSwgMCk7XHJcbiAgICBjb25zdCB0b3BWaWRlbyA9IHRyZW5kcy5zb3J0KChhLCBiKSA9PiBiLmVuZ2FnZW1lbnRTY29yZSAtIGEuZW5nYWdlbWVudFNjb3JlKVswXTtcclxuXHJcbiAgICBjb25zdCBjYXRlZ29yeUJyZWFrZG93bjogQ2F0ZWdvcnlCcmVha2Rvd24gPSB7XHJcbiAgICAgIGNhdGVnb3J5SWQsXHJcbiAgICAgIGNhdGVnb3J5TmFtZTogdGhpcy5nZXRDYXRlZ29yeU5hbWUoY2F0ZWdvcnlJZCksXHJcbiAgICAgIHZpZGVvQ291bnQ6IChleGlzdGluZz8udmlkZW9Db3VudCB8fCAwKSArIHRyZW5kcy5sZW5ndGgsXHJcbiAgICAgIGF2ZXJhZ2VWaWV3czogZXhpc3RpbmcgPyBcclxuICAgICAgICAoKGV4aXN0aW5nLmF2ZXJhZ2VWaWV3cyAqIGV4aXN0aW5nLnZpZGVvQ291bnQpICsgdG90YWxWaWV3cykgLyAoZXhpc3RpbmcudmlkZW9Db3VudCArIHRyZW5kcy5sZW5ndGgpIDpcclxuICAgICAgICB0b3RhbFZpZXdzIC8gdHJlbmRzLmxlbmd0aCxcclxuICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IGV4aXN0aW5nID9cclxuICAgICAgICAoKGV4aXN0aW5nLmF2ZXJhZ2VFbmdhZ2VtZW50ICogZXhpc3RpbmcudmlkZW9Db3VudCkgKyB0b3RhbEVuZ2FnZW1lbnQpIC8gKGV4aXN0aW5nLnZpZGVvQ291bnQgKyB0cmVuZHMubGVuZ3RoKSA6XHJcbiAgICAgICAgdG90YWxFbmdhZ2VtZW50IC8gdHJlbmRzLmxlbmd0aCxcclxuICAgICAgdG9wVmlkZW86ICFleGlzdGluZyB8fCB0b3BWaWRlby5lbmdhZ2VtZW50U2NvcmUgPiAoZXhpc3RpbmcudG9wVmlkZW8/LmVuZ2FnZW1lbnRTY29yZSB8fCAwKSA/IFxyXG4gICAgICAgIHRvcFZpZGVvIDogZXhpc3RpbmcudG9wVmlkZW9cclxuICAgIH07XHJcblxyXG4gICAgY2F0ZWdvcnlTdGF0cy5zZXQoY2F0ZWdvcnlJZCwgY2F0ZWdvcnlCcmVha2Rvd24pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZXRDYXRlZ29yeU5hbWUoY2F0ZWdvcnlJZDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGNhdGVnb3J5TmFtZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICcxJzogJ0ZpbG0gJiBBbmltYXRpb24nLFxyXG4gICAgICAnMic6ICdBdXRvcyAmIFZlaGljbGVzJyxcclxuICAgICAgJzEwJzogJ011c2ljJyxcclxuICAgICAgJzE1JzogJ1BldHMgJiBBbmltYWxzJyxcclxuICAgICAgJzE3JzogJ1Nwb3J0cycsXHJcbiAgICAgICcxOSc6ICdUcmF2ZWwgJiBFdmVudHMnLFxyXG4gICAgICAnMjAnOiAnR2FtaW5nJyxcclxuICAgICAgJzIyJzogJ1Blb3BsZSAmIEJsb2dzJyxcclxuICAgICAgJzIzJzogJ0NvbWVkeScsXHJcbiAgICAgICcyNCc6ICdFbnRlcnRhaW5tZW50JyxcclxuICAgICAgJzI1JzogJ05ld3MgJiBQb2xpdGljcycsXHJcbiAgICAgICcyNic6ICdIb3d0byAmIFN0eWxlJyxcclxuICAgICAgJzI3JzogJ0VkdWNhdGlvbicsXHJcbiAgICAgICcyOCc6ICdTY2llbmNlICYgVGVjaG5vbG9neSdcclxuICAgIH07XHJcbiAgICBcclxuICAgIHJldHVybiBjYXRlZ29yeU5hbWVzW2NhdGVnb3J5SWRdIHx8IGBDYXRlZ29yeSAke2NhdGVnb3J5SWR9YDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgYW5hbHl6ZUVuZ2FnZW1lbnRUcmVuZHModG9waWM6IHN0cmluZywgY3VycmVudFRyZW5kczogVHJlbmREYXRhW10pOiBQcm9taXNlPEVuZ2FnZW1lbnRUcmVuZFtdPiB7XHJcbiAgICBjb25zdCB0cmVuZHM6IEVuZ2FnZW1lbnRUcmVuZFtdID0gW107XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCBoaXN0b3JpY2FsIGRhdGEgZm9yIGNvbXBhcmlzb25cclxuICAgICAgY29uc3QgaGlzdG9yaWNhbFRyZW5kcyA9IGF3YWl0IHRoaXMudHJlbmRSZXBvc2l0b3J5LmdldFJlY2VudFRyZW5kcygxNjgsIDEwMCk7IC8vIExhc3QgNyBkYXlzXHJcbiAgICAgIGNvbnN0IHRvcGljSGlzdG9yaWNhbCA9IGhpc3RvcmljYWxUcmVuZHMuZmlsdGVyKHRyZW5kID0+IHRyZW5kLnRvcGljID09PSB0b3BpYyk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAodG9waWNIaXN0b3JpY2FsLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAvLyBDYWxjdWxhdGUgMjQtaG91ciB0cmVuZFxyXG4gICAgICAgIGNvbnN0IGxhc3QyNGggPSB0b3BpY0hpc3RvcmljYWwuZmlsdGVyKHRyZW5kID0+IFxyXG4gICAgICAgICAgbmV3IERhdGUodHJlbmQudGltZXN0YW1wKS5nZXRUaW1lKCkgPiBEYXRlLm5vdygpIC0gMjQgKiA2MCAqIDYwICogMTAwMFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgY3VycmVudDI0aEF2ZyA9IGN1cnJlbnRUcmVuZHMucmVkdWNlKChzdW0sIHRyZW5kKSA9PiBzdW0gKyB0cmVuZC5lbmdhZ2VtZW50UmF0ZSwgMCkgLyBjdXJyZW50VHJlbmRzLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBoaXN0b3JpY2FsMjRoQXZnID0gbGFzdDI0aC5yZWR1Y2UoKHN1bSwgdHJlbmQpID0+IHN1bSArIHRyZW5kLmVuZ2FnZW1lbnRSYXRlLCAwKSAvIE1hdGgubWF4KGxhc3QyNGgubGVuZ3RoLCAxKTtcclxuICAgICAgICBcclxuICAgICAgICB0cmVuZHMucHVzaCh7XHJcbiAgICAgICAgICB0aW1lZnJhbWU6ICcyNGgnLFxyXG4gICAgICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IGN1cnJlbnQyNGhBdmcsXHJcbiAgICAgICAgICB0cmVuZERpcmVjdGlvbjogY3VycmVudDI0aEF2ZyA+IGhpc3RvcmljYWwyNGhBdmcgKiAxLjEgPyAndXAnIDogXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50MjRoQXZnIDwgaGlzdG9yaWNhbDI0aEF2ZyAqIDAuOSA/ICdkb3duJyA6ICdzdGFibGUnLFxyXG4gICAgICAgICAgY29uZmlkZW5jZTogTWF0aC5taW4oY3VycmVudFRyZW5kcy5sZW5ndGggLyAxMCwgMSkgLy8gSGlnaGVyIGNvbmZpZGVuY2Ugd2l0aCBtb3JlIGRhdGEgcG9pbnRzXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSA3LWRheSB0cmVuZFxyXG4gICAgICAgIGNvbnN0IGhpc3RvcmljYWw3ZEF2ZyA9IHRvcGljSGlzdG9yaWNhbC5yZWR1Y2UoKHN1bSwgdHJlbmQpID0+IHN1bSArIHRyZW5kLmVuZ2FnZW1lbnRSYXRlLCAwKSAvIHRvcGljSGlzdG9yaWNhbC5sZW5ndGg7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdHJlbmRzLnB1c2goe1xyXG4gICAgICAgICAgdGltZWZyYW1lOiAnN2QnLFxyXG4gICAgICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IGhpc3RvcmljYWw3ZEF2ZyxcclxuICAgICAgICAgIHRyZW5kRGlyZWN0aW9uOiBjdXJyZW50MjRoQXZnID4gaGlzdG9yaWNhbDdkQXZnICogMS4yID8gJ3VwJyA6IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudDI0aEF2ZyA8IGhpc3RvcmljYWw3ZEF2ZyAqIDAuOCA/ICdkb3duJyA6ICdzdGFibGUnLFxyXG4gICAgICAgICAgY29uZmlkZW5jZTogTWF0aC5taW4odG9waWNIaXN0b3JpY2FsLmxlbmd0aCAvIDUwLCAxKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gYW5hbHl6ZSBlbmdhZ2VtZW50IHRyZW5kczonLCBlcnJvcik7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB0cmVuZHM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNhbGN1bGF0ZUNvbnRlbnRTdWl0YWJpbGl0eSh0cmVuZHM6IFRyZW5kRGF0YVtdLCBjdXN0b21Ub3BpYz86IEN1c3RvbVRvcGljQ29uZmlnKTogQ29udGVudFN1aXRhYmlsaXR5U2NvcmUge1xyXG4gICAgaWYgKHRyZW5kcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBhdWRpb05hcnJhdGlvblNjb3JlOiAwLFxyXG4gICAgICAgIHZpc3VhbENvbnRlbnRTY29yZTogMCxcclxuICAgICAgICBlZHVjYXRpb25hbFZhbHVlOiAwLFxyXG4gICAgICAgIHZpcmFsUG90ZW50aWFsOiAwLFxyXG4gICAgICAgIG1vbmV0aXphdGlvbkZyaWVuZGx5OiAwLFxyXG4gICAgICAgIG92ZXJhbGxTY29yZTogMFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEF1ZGlvIG5hcnJhdGlvbiBzdWl0YWJpbGl0eVxyXG4gICAgbGV0IGF1ZGlvTmFycmF0aW9uU2NvcmUgPSBjdXN0b21Ub3BpYz8uYXVkaW9OYXJyYXRpb25TdWl0YWJsZSA/IDAuOCA6IDAuNTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgZm9yIGVkdWNhdGlvbmFsL2luZm9ybWF0aW9uYWwgY29udGVudCBpbmRpY2F0b3JzXHJcbiAgICBjb25zdCBlZHVjYXRpb25hbEtleXdvcmRzID0gWydob3cgdG8nLCAndHV0b3JpYWwnLCAnZ3VpZGUnLCAnbGVhcm4nLCAnZXhwbGFpbicsICd0aXBzJywgJ2FkdmljZSddO1xyXG4gICAgY29uc3QgaGFzRWR1Y2F0aW9uYWxDb250ZW50ID0gdHJlbmRzLnNvbWUodHJlbmQgPT4gXHJcbiAgICAgIGVkdWNhdGlvbmFsS2V5d29yZHMuc29tZShrZXl3b3JkID0+IFxyXG4gICAgICAgIHRyZW5kLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoa2V5d29yZCkgfHwgXHJcbiAgICAgICAgKHRyZW5kLmRlc2NyaXB0aW9uICYmIHRyZW5kLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoa2V5d29yZCkpXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgICBcclxuICAgIGlmIChoYXNFZHVjYXRpb25hbENvbnRlbnQpIHtcclxuICAgICAgYXVkaW9OYXJyYXRpb25TY29yZSArPSAwLjI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmlzdWFsIGNvbnRlbnQgc2NvcmUgYmFzZWQgb24gY2F0ZWdvcnkgYW5kIGNvbnRlbnQgdHlwZVxyXG4gICAgY29uc3QgdmlzdWFsQ2F0ZWdvcmllcyA9IFsnMTknLCAnMScsICcyMCcsICcxNyddOyAvLyBUcmF2ZWwsIEZpbG0sIEdhbWluZywgU3BvcnRzXHJcbiAgICBjb25zdCBoYXNWaXN1YWxDb250ZW50ID0gdHJlbmRzLnNvbWUodHJlbmQgPT4gXHJcbiAgICAgIHZpc3VhbENhdGVnb3JpZXMuaW5jbHVkZXModHJlbmQuY2F0ZWdvcnlJZCkgfHxcclxuICAgICAgWyd2aXN1YWwnLCAndmlkZW8nLCAnd2F0Y2gnLCAnc2VlJywgJ2xvb2snXS5zb21lKGtleXdvcmQgPT5cclxuICAgICAgICB0cmVuZC50aXRsZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGtleXdvcmQpXHJcbiAgICAgIClcclxuICAgICk7XHJcbiAgICBcclxuICAgIGNvbnN0IHZpc3VhbENvbnRlbnRTY29yZSA9IGhhc1Zpc3VhbENvbnRlbnQgPyAwLjggOiAwLjY7XHJcblxyXG4gICAgLy8gRWR1Y2F0aW9uYWwgdmFsdWVcclxuICAgIGNvbnN0IGVkdWNhdGlvbmFsQ2F0ZWdvcmllcyA9IFsnMjcnLCAnMjgnLCAnMjYnXTsgLy8gRWR1Y2F0aW9uLCBTY2llbmNlICYgVGVjaCwgSG93dG8gJiBTdHlsZVxyXG4gICAgY29uc3QgZWR1Y2F0aW9uYWxWYWx1ZSA9IHRyZW5kcy5zb21lKHRyZW5kID0+IFxyXG4gICAgICBlZHVjYXRpb25hbENhdGVnb3JpZXMuaW5jbHVkZXModHJlbmQuY2F0ZWdvcnlJZClcclxuICAgICkgPyAwLjkgOiBoYXNFZHVjYXRpb25hbENvbnRlbnQgPyAwLjcgOiAwLjQ7XHJcblxyXG4gICAgLy8gVmlyYWwgcG90ZW50aWFsIGJhc2VkIG9uIGVuZ2FnZW1lbnQgbWV0cmljc1xyXG4gICAgY29uc3QgYXZnRW5nYWdlbWVudCA9IHRyZW5kcy5yZWR1Y2UoKHN1bSwgdHJlbmQpID0+IHN1bSArIHRyZW5kLmVuZ2FnZW1lbnRSYXRlLCAwKSAvIHRyZW5kcy5sZW5ndGg7XHJcbiAgICBjb25zdCB2aXJhbFBvdGVudGlhbCA9IE1hdGgubWluKGF2Z0VuZ2FnZW1lbnQgLyA1LCAxKTsgLy8gTm9ybWFsaXplIHRvIDAtMVxyXG5cclxuICAgIC8vIE1vbmV0aXphdGlvbiBmcmllbmRsaW5lc3NcclxuICAgIGNvbnN0IG1vbmV0aXphdGlvbkZyaWVuZGx5Q2F0ZWdvcmllcyA9IFsnMjcnLCAnMjgnLCAnMjYnLCAnMjInLCAnMjUnXTsgLy8gRWR1Y2F0aW9uLCBUZWNoLCBIb3d0bywgQmxvZ3MsIE5ld3NcclxuICAgIGNvbnN0IG1vbmV0aXphdGlvbkZyaWVuZGx5ID0gdHJlbmRzLnNvbWUodHJlbmQgPT4gXHJcbiAgICAgIG1vbmV0aXphdGlvbkZyaWVuZGx5Q2F0ZWdvcmllcy5pbmNsdWRlcyh0cmVuZC5jYXRlZ29yeUlkKVxyXG4gICAgKSA/IDAuOCA6IDAuNjtcclxuXHJcbiAgICBjb25zdCBvdmVyYWxsU2NvcmUgPSAoXHJcbiAgICAgIGF1ZGlvTmFycmF0aW9uU2NvcmUgKiAwLjI1ICtcclxuICAgICAgdmlzdWFsQ29udGVudFNjb3JlICogMC4yICtcclxuICAgICAgZWR1Y2F0aW9uYWxWYWx1ZSAqIDAuMiArXHJcbiAgICAgIHZpcmFsUG90ZW50aWFsICogMC4yICtcclxuICAgICAgbW9uZXRpemF0aW9uRnJpZW5kbHkgKiAwLjE1XHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGF1ZGlvTmFycmF0aW9uU2NvcmU6IE1hdGgubWluKGF1ZGlvTmFycmF0aW9uU2NvcmUsIDEpLFxyXG4gICAgICB2aXN1YWxDb250ZW50U2NvcmUsXHJcbiAgICAgIGVkdWNhdGlvbmFsVmFsdWUsXHJcbiAgICAgIHZpcmFsUG90ZW50aWFsLFxyXG4gICAgICBtb25ldGl6YXRpb25GcmllbmRseSxcclxuICAgICAgb3ZlcmFsbFNjb3JlXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVJlY29tbWVuZGVkQWN0aW9ucyhcclxuICAgIHRyZW5kczogVHJlbmREYXRhW10sIFxyXG4gICAgc3VpdGFiaWxpdHk6IENvbnRlbnRTdWl0YWJpbGl0eVNjb3JlLCBcclxuICAgIGN1c3RvbVRvcGljPzogQ3VzdG9tVG9waWNDb25maWdcclxuICApOiBSZWNvbW1lbmRlZEFjdGlvbltdIHtcclxuICAgIGNvbnN0IGFjdGlvbnM6IFJlY29tbWVuZGVkQWN0aW9uW10gPSBbXTtcclxuXHJcbiAgICAvLyBDb250ZW50IGNyZWF0aW9uIHJlY29tbWVuZGF0aW9uc1xyXG4gICAgaWYgKHN1aXRhYmlsaXR5LmF1ZGlvTmFycmF0aW9uU2NvcmUgPiAwLjcpIHtcclxuICAgICAgYWN0aW9ucy5wdXNoKHtcclxuICAgICAgICB0eXBlOiAnY29udGVudF9jcmVhdGlvbicsXHJcbiAgICAgICAgcHJpb3JpdHk6ICdoaWdoJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBjb250ZW50IHdpdGggaGlnaC1xdWFsaXR5IGF1ZGlvIG5hcnJhdGlvbiAtIHRoaXMgdG9waWMgaXMgd2VsbC1zdWl0ZWQgZm9yIHZvaWNlLW92ZXIgY29udGVudCcsXHJcbiAgICAgICAgZXhwZWN0ZWRJbXBhY3Q6IDAuOCxcclxuICAgICAgICBlZmZvcnQ6IDAuNlxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc3VpdGFiaWxpdHkuZWR1Y2F0aW9uYWxWYWx1ZSA+IDAuNykge1xyXG4gICAgICBhY3Rpb25zLnB1c2goe1xyXG4gICAgICAgIHR5cGU6ICdjb250ZW50X2NyZWF0aW9uJyxcclxuICAgICAgICBwcmlvcml0eTogJ2hpZ2gnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRm9jdXMgb24gZWR1Y2F0aW9uYWwgY29udGVudCBmb3JtYXQgd2l0aCBjbGVhciBleHBsYW5hdGlvbnMgYW5kIHN0cnVjdHVyZWQgaW5mb3JtYXRpb24nLFxyXG4gICAgICAgIGV4cGVjdGVkSW1wYWN0OiAwLjksXHJcbiAgICAgICAgZWZmb3J0OiAwLjdcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVGltaW5nIHJlY29tbWVuZGF0aW9uc1xyXG4gICAgaWYgKHRyZW5kcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IGF2Z0hvdXJzT2xkID0gdHJlbmRzLnJlZHVjZSgoc3VtLCB0cmVuZCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGhvdXJzT2xkID0gKERhdGUubm93KCkgLSBuZXcgRGF0ZSh0cmVuZC5wdWJsaXNoZWRBdCkuZ2V0VGltZSgpKSAvICgxMDAwICogNjAgKiA2MCk7XHJcbiAgICAgICAgcmV0dXJuIHN1bSArIGhvdXJzT2xkO1xyXG4gICAgICB9LCAwKSAvIHRyZW5kcy5sZW5ndGg7XHJcblxyXG4gICAgICBpZiAoYXZnSG91cnNPbGQgPCAxMikge1xyXG4gICAgICAgIGFjdGlvbnMucHVzaCh7XHJcbiAgICAgICAgICB0eXBlOiAndGltaW5nJyxcclxuICAgICAgICAgIHByaW9yaXR5OiAnaGlnaCcsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdCBxdWlja2x5IC0gdHJlbmRpbmcgY29udGVudCBpbiB0aGlzIHRvcGljIGlzIHZlcnkgcmVjZW50LCBjcmVhdGUgY29udGVudCB3aXRoaW4gMjQgaG91cnMnLFxyXG4gICAgICAgICAgZXhwZWN0ZWRJbXBhY3Q6IDAuOSxcclxuICAgICAgICAgIGVmZm9ydDogMC44XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBPcHRpbWl6YXRpb24gcmVjb21tZW5kYXRpb25zXHJcbiAgICBpZiAoc3VpdGFiaWxpdHkudmlyYWxQb3RlbnRpYWwgPiAwLjYpIHtcclxuICAgICAgYWN0aW9ucy5wdXNoKHtcclxuICAgICAgICB0eXBlOiAnb3B0aW1pemF0aW9uJyxcclxuICAgICAgICBwcmlvcml0eTogJ21lZGl1bScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdPcHRpbWl6ZSBmb3IgdmlyYWwgcG90ZW50aWFsIHdpdGggZW5nYWdpbmcgdGh1bWJuYWlscyBhbmQgY29tcGVsbGluZyB0aXRsZXMnLFxyXG4gICAgICAgIGV4cGVjdGVkSW1wYWN0OiAwLjcsXHJcbiAgICAgICAgZWZmb3J0OiAwLjRcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVGFyZ2V0aW5nIHJlY29tbWVuZGF0aW9uc1xyXG4gICAgaWYgKGN1c3RvbVRvcGljICYmIHRyZW5kcy5sZW5ndGggPiA1KSB7XHJcbiAgICAgIGNvbnN0IHRvcEtleXdvcmRzID0gdGhpcy5nZXRUb3BLZXl3b3JkcyhcclxuICAgICAgICB0cmVuZHMuZmxhdE1hcCh0cmVuZCA9PiB0cmVuZC5rZXl3b3JkcyksIFxyXG4gICAgICAgIDVcclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIGFjdGlvbnMucHVzaCh7XHJcbiAgICAgICAgdHlwZTogJ3RhcmdldGluZycsXHJcbiAgICAgICAgcHJpb3JpdHk6ICdtZWRpdW0nLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgVGFyZ2V0IHRoZXNlIHRyZW5kaW5nIGtleXdvcmRzOiAke3RvcEtleXdvcmRzLmpvaW4oJywgJyl9YCxcclxuICAgICAgICBleHBlY3RlZEltcGFjdDogMC42LFxyXG4gICAgICAgIGVmZm9ydDogMC4zXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhY3Rpb25zLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgLy8gU29ydCBieSBwcmlvcml0eSBmaXJzdCwgdGhlbiBieSBpbXBhY3QvZWZmb3J0IHJhdGlvXHJcbiAgICAgIGNvbnN0IHByaW9yaXR5T3JkZXIgPSB7IGhpZ2g6IDMsIG1lZGl1bTogMiwgbG93OiAxIH07XHJcbiAgICAgIGNvbnN0IGFQcmlvcml0eSA9IHByaW9yaXR5T3JkZXJbYS5wcmlvcml0eV07XHJcbiAgICAgIGNvbnN0IGJQcmlvcml0eSA9IHByaW9yaXR5T3JkZXJbYi5wcmlvcml0eV07XHJcbiAgICAgIFxyXG4gICAgICBpZiAoYVByaW9yaXR5ICE9PSBiUHJpb3JpdHkpIHtcclxuICAgICAgICByZXR1cm4gYlByaW9yaXR5IC0gYVByaW9yaXR5O1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBhUmF0aW8gPSBhLmV4cGVjdGVkSW1wYWN0IC8gYS5lZmZvcnQ7XHJcbiAgICAgIGNvbnN0IGJSYXRpbyA9IGIuZXhwZWN0ZWRJbXBhY3QgLyBiLmVmZm9ydDtcclxuICAgICAgcmV0dXJuIGJSYXRpbyAtIGFSYXRpbztcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBwYXJzZUR1cmF0aW9uVG9TZWNvbmRzKGR1cmF0aW9uOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgLy8gUGFyc2UgSVNPIDg2MDEgZHVyYXRpb24gZm9ybWF0IChQVCNNI1MpXHJcbiAgICBjb25zdCBtYXRjaCA9IGR1cmF0aW9uLm1hdGNoKC9QVCg/OihcXGQrKUgpPyg/OihcXGQrKU0pPyg/OihcXGQrKVMpPy8pO1xyXG4gICAgaWYgKCFtYXRjaCkgcmV0dXJuIDA7XHJcbiAgICBcclxuICAgIGNvbnN0IGhvdXJzID0gcGFyc2VJbnQobWF0Y2hbMV0gfHwgJzAnKTtcclxuICAgIGNvbnN0IG1pbnV0ZXMgPSBwYXJzZUludChtYXRjaFsyXSB8fCAnMCcpO1xyXG4gICAgY29uc3Qgc2Vjb25kcyA9IHBhcnNlSW50KG1hdGNoWzNdIHx8ICcwJyk7XHJcbiAgICBcclxuICAgIHJldHVybiBob3VycyAqIDM2MDAgKyBtaW51dGVzICogNjAgKyBzZWNvbmRzO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZGV0ZWN0VHJlbmRzV2l0aENhdGVnb3J5RmlsdGVyaW5nKFxyXG4gICAgdG9waWNzOiBzdHJpbmdbXSxcclxuICAgIGNhdGVnb3J5RmlsdGVyczogc3RyaW5nW10gPSBbXSxcclxuICAgIG9wdGlvbnM6IFRyZW5kQW5hbHlzaXNPcHRpb25zID0ge31cclxuICApOiBQcm9taXNlPFRyZW5kRGV0ZWN0aW9uUmVzdWx0W10+IHtcclxuICAgIGNvbnN0IHJlc3VsdHM6IFRyZW5kRGV0ZWN0aW9uUmVzdWx0W10gPSBbXTtcclxuICAgIFxyXG4gICAgLy8gVGVtcG9yYXJpbHkgb3ZlcnJpZGUgY2F0ZWdvcmllcyBpZiBmaWx0ZXJzIHByb3ZpZGVkXHJcbiAgICBjb25zdCBvcmlnaW5hbENhdGVnb3JpZXMgPSB0aGlzLmNvbmZpZy5jYXRlZ29yaWVzO1xyXG4gICAgaWYgKGNhdGVnb3J5RmlsdGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHRoaXMuY29uZmlnLmNhdGVnb3JpZXMgPSBjYXRlZ29yeUZpbHRlcnM7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgZm9yIChjb25zdCB0b3BpYyBvZiB0b3BpY3MpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgRGV0ZWN0aW5nIHRyZW5kcyBmb3IgdG9waWM6ICR7dG9waWN9IHdpdGggY2F0ZWdvcnkgZmlsdGVyczogJHtjYXRlZ29yeUZpbHRlcnMuam9pbignLCAnKX1gKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmFuYWx5emVUb3BpYyh0b3BpYywgb3B0aW9ucyk7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUmF0ZSBsaW1pdGluZyBiZXR3ZWVuIHRvcGljc1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2xlZXAoMTAwMCk7XHJcbiAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgY2F0ZWdvcmllc1xyXG4gICAgICB0aGlzLmNvbmZpZy5jYXRlZ29yaWVzID0gb3JpZ2luYWxDYXRlZ29yaWVzO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHRzO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VG9waWNQZXJmb3JtYW5jZU1ldHJpY3ModG9waWM6IHN0cmluZywgZGF5czogbnVtYmVyID0gMzApOiBQcm9taXNlPHtcclxuICAgIGF2ZXJhZ2VWaWV3czogbnVtYmVyO1xyXG4gICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IG51bWJlcjtcclxuICAgIHRyZW5kaW5nRnJlcXVlbmN5OiBudW1iZXI7XHJcbiAgICBiZXN0UGVyZm9ybWluZ0tleXdvcmRzOiBzdHJpbmdbXTtcclxuICAgIG9wdGltYWxQb3N0aW5nVGltZXM6IHN0cmluZ1tdO1xyXG4gICAgY29tcGV0aXRpb25MZXZlbDogJ2xvdycgfCAnbWVkaXVtJyB8ICdoaWdoJztcclxuICB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBoaXN0b3JpY2FsVHJlbmRzID0gYXdhaXQgdGhpcy50cmVuZFJlcG9zaXRvcnkuZ2V0UmVjZW50VHJlbmRzKGRheXMgKiAyNCwgMTAwMCk7XHJcbiAgICAgIGNvbnN0IHRvcGljVHJlbmRzID0gaGlzdG9yaWNhbFRyZW5kcy5maWx0ZXIodHJlbmQgPT4gdHJlbmQudG9waWMgPT09IHRvcGljKTtcclxuICAgICAgXHJcbiAgICAgIGlmICh0b3BpY1RyZW5kcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgYXZlcmFnZVZpZXdzOiAwLFxyXG4gICAgICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IDAsXHJcbiAgICAgICAgICB0cmVuZGluZ0ZyZXF1ZW5jeTogMCxcclxuICAgICAgICAgIGJlc3RQZXJmb3JtaW5nS2V5d29yZHM6IFtdLFxyXG4gICAgICAgICAgb3B0aW1hbFBvc3RpbmdUaW1lczogW10sXHJcbiAgICAgICAgICBjb21wZXRpdGlvbkxldmVsOiAnbG93J1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGF2ZXJhZ2VWaWV3cyA9IHRvcGljVHJlbmRzLnJlZHVjZSgoc3VtLCB0cmVuZCkgPT4gc3VtICsgdHJlbmQudmlld0NvdW50LCAwKSAvIHRvcGljVHJlbmRzLmxlbmd0aDtcclxuICAgICAgY29uc3QgYXZlcmFnZUVuZ2FnZW1lbnQgPSB0b3BpY1RyZW5kcy5yZWR1Y2UoKHN1bSwgdHJlbmQpID0+IHN1bSArIHRyZW5kLmVuZ2FnZW1lbnRSYXRlLCAwKSAvIHRvcGljVHJlbmRzLmxlbmd0aDtcclxuICAgICAgY29uc3QgdHJlbmRpbmdGcmVxdWVuY3kgPSB0b3BpY1RyZW5kcy5sZW5ndGggLyBkYXlzO1xyXG5cclxuICAgICAgLy8gQW5hbHl6ZSBrZXl3b3Jkc1xyXG4gICAgICBjb25zdCBhbGxLZXl3b3JkcyA9IHRvcGljVHJlbmRzLmZsYXRNYXAodHJlbmQgPT4gdHJlbmQua2V5d29yZHMpO1xyXG4gICAgICBjb25zdCBiZXN0UGVyZm9ybWluZ0tleXdvcmRzID0gdGhpcy5nZXRUb3BLZXl3b3JkcyhhbGxLZXl3b3JkcywgMTApO1xyXG5cclxuICAgICAgLy8gQW5hbHl6ZSBwb3N0aW5nIHRpbWVzIChzaW1wbGlmaWVkIC0gd291bGQgbmVlZCBtb3JlIHNvcGhpc3RpY2F0ZWQgYW5hbHlzaXMgaW4gcHJvZHVjdGlvbilcclxuICAgICAgY29uc3QgcG9zdGluZ0hvdXJzID0gdG9waWNUcmVuZHMubWFwKHRyZW5kID0+IG5ldyBEYXRlKHRyZW5kLnB1Ymxpc2hlZEF0KS5nZXRIb3VycygpKTtcclxuICAgICAgY29uc3QgaG91ckNvdW50czogUmVjb3JkPG51bWJlciwgbnVtYmVyPiA9IHt9O1xyXG4gICAgICBwb3N0aW5nSG91cnMuZm9yRWFjaChob3VyID0+IHtcclxuICAgICAgICBob3VyQ291bnRzW2hvdXJdID0gKGhvdXJDb3VudHNbaG91cl0gfHwgMCkgKyAxO1xyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IG9wdGltYWxQb3N0aW5nVGltZXMgPSBPYmplY3QuZW50cmllcyhob3VyQ291bnRzKVxyXG4gICAgICAgIC5zb3J0KChbLCBhXSwgWywgYl0pID0+IGIgLSBhKVxyXG4gICAgICAgIC5zbGljZSgwLCAzKVxyXG4gICAgICAgIC5tYXAoKFtob3VyXSkgPT4gYCR7aG91cn06MDBgKTtcclxuXHJcbiAgICAgIC8vIERldGVybWluZSBjb21wZXRpdGlvbiBsZXZlbFxyXG4gICAgICBjb25zdCBjb21wZXRpdGlvbkxldmVsOiAnbG93JyB8ICdtZWRpdW0nIHwgJ2hpZ2gnID0gXHJcbiAgICAgICAgdHJlbmRpbmdGcmVxdWVuY3kgPiA1ID8gJ2hpZ2gnIDpcclxuICAgICAgICB0cmVuZGluZ0ZyZXF1ZW5jeSA+IDIgPyAnbWVkaXVtJyA6ICdsb3cnO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBhdmVyYWdlVmlld3MsXHJcbiAgICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQsXHJcbiAgICAgICAgdHJlbmRpbmdGcmVxdWVuY3ksXHJcbiAgICAgICAgYmVzdFBlcmZvcm1pbmdLZXl3b3JkcyxcclxuICAgICAgICBvcHRpbWFsUG9zdGluZ1RpbWVzLFxyXG4gICAgICAgIGNvbXBldGl0aW9uTGV2ZWxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBnZXQgcGVyZm9ybWFuY2UgbWV0cmljcyBmb3IgdG9waWMgJHt0b3BpY306YCwgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9fVxyXG4iXX0=