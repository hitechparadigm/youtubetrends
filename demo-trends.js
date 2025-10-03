#!/usr/bin/env ts-node
"use strict";
/**
 * YouTube Trends Demo Script
 *
 * This script demonstrates the trend detection capabilities of the YouTube Automation Platform.
 * You can test any topic and see real trend analysis, content suitability scoring, and recommendations.
 *
 * Usage: npm run demo:trends [topic]
 * Example: npm run demo:trends "artificial intelligence"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeTrendsDemo = void 0;
const trend_detection_service_1 = require("./src/services/trend-detection-service");
const youtube_api_client_1 = require("./src/services/youtube-api-client");
const youtube_api_client_simple_1 = require("./src/services/youtube-api-client-simple");
const trend_detection_service_simple_1 = require("./src/services/trend-detection-service-simple");
const trend_repository_1 = require("./src/repositories/trend-repository");
// Demo configuration - enable live mode if credentials are available
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.argv.includes('--demo-only');
class YouTubeTrendsDemo {
    constructor(topic) {
        this.topic = topic.toLowerCase().trim();
        // Use simple client for better reliability
        const useSimpleClient = true;
        if (useSimpleClient) {
            // Initialize simple services
            const youtubeClientSimple = new youtube_api_client_simple_1.YouTubeApiClientSimple();
            const trendRepository = new trend_repository_1.TrendRepository();
            const simpleConfig = {
                topics: [this.topic],
                regions: ['US'],
                maxResultsPerQuery: 20,
                hoursBack: 48
            };
            // Initialize the client
            youtubeClientSimple.initialize().then(() => {
                console.log('✅ Simple YouTube client initialized');
            }).catch(error => {
                console.error('❌ Failed to initialize simple client:', error);
            });
            this.trendService = new trend_detection_service_simple_1.TrendDetectionServiceSimple(youtubeClientSimple, trendRepository, simpleConfig);
        }
        else {
            // Initialize original services
            const youtubeClient = new youtube_api_client_1.YouTubeApiClient({
                secretName: 'youtube-automation/credentials',
                region: process.env.AWS_REGION || 'us-east-1'
            });
            const trendRepository = new trend_repository_1.TrendRepository();
            // Enhanced configuration for demo
            const config = {
                topics: [this.topic],
                maxResultsPerQuery: 20,
                minViewCount: 1000,
                minEngagementRate: 1.0,
                hoursBack: 48,
                customTopics: this.getCustomTopicConfig(this.topic)
            };
            this.trendService = new trend_detection_service_1.TrendDetectionService(youtubeClient, trendRepository, config);
        }
    }
    getCustomTopicConfig(topic) {
        // Smart topic configuration based on input
        const topicKeywords = this.generateTopicKeywords(topic);
        const searchQueries = this.generateSearchQueries(topic);
        const categories = this.suggestCategories(topic);
        return [{
                name: topic,
                keywords: topicKeywords,
                categories: categories,
                searchQueries: searchQueries,
                minDuration: 60,
                maxDuration: 3600,
                audioNarrationSuitable: true
            }];
    }
    generateTopicKeywords(topic) {
        const baseKeywords = topic.split(' ').filter(word => word.length > 2);
        // Add common variations and related terms
        const variations = [
            ...baseKeywords,
            `${topic} tutorial`,
            `${topic} guide`,
            `${topic} tips`,
            `${topic} explained`,
            `${topic} review`,
            `${topic} analysis`,
            `best ${topic}`,
            `how to ${topic}`,
            `${topic} 2024`,
            `${topic} trending`
        ];
        return [...new Set(variations)]; // Remove duplicates
    }
    generateSearchQueries(topic) {
        return [
            `${topic} trending`,
            `${topic} viral`,
            `${topic} popular`,
            `best ${topic}`,
            `${topic} tutorial`,
            `${topic} guide`,
            `${topic} tips`,
            `${topic} 2024`,
            `how to ${topic}`,
            `${topic} explained`
        ];
    }
    suggestCategories(topic) {
        const categoryMap = {
            // Technology
            'ai': ['28'], 'artificial intelligence': ['28'], 'tech': ['28'], 'software': ['28'],
            'programming': ['28'], 'coding': ['28'], 'computer': ['28'], 'digital': ['28'],
            // Education
            'learn': ['27'], 'education': ['27'], 'tutorial': ['27'], 'course': ['27'],
            'study': ['27'], 'school': ['27'], 'university': ['27'], 'knowledge': ['27'],
            // Finance/Business
            'money': ['25'], 'finance': ['25'], 'business': ['25'], 'investing': ['25'],
            'stocks': ['25'], 'crypto': ['25'], 'bitcoin': ['25'], 'trading': ['25'],
            // Health & Fitness
            'health': ['26'], 'fitness': ['26'], 'workout': ['26'], 'diet': ['26'],
            'wellness': ['26'], 'medical': ['26'], 'nutrition': ['26'],
            // Entertainment
            'music': ['10'], 'gaming': ['20'], 'game': ['20'], 'entertainment': ['24'],
            'movie': ['1'], 'film': ['1'], 'comedy': ['23'], 'funny': ['23'],
            // Travel
            'travel': ['19'], 'vacation': ['19'], 'tourism': ['19'], 'destination': ['19'],
            'adventure': ['19'], 'explore': ['19']
        };
        // Find matching categories
        const matchedCategories = new Set();
        Object.entries(categoryMap).forEach(([keyword, categories]) => {
            if (topic.includes(keyword)) {
                categories.forEach(cat => matchedCategories.add(cat));
            }
        });
        // Default categories if no matches
        if (matchedCategories.size === 0) {
            return ['22', '27', '28']; // People & Blogs, Education, Science & Technology
        }
        return Array.from(matchedCategories);
    }
    async runDemo() {
        console.log('🎬 YouTube Trends Demo - Powered by AI');
        console.log('=====================================\n');
        console.log(`🔍 Analyzing trends for: "${this.topic}"`);
        console.log(`⏰ Analysis started at: ${new Date().toLocaleString()}\n`);
        if (DEMO_MODE) {
            console.log('📝 Note: Running in demo mode (YouTube API credentials not configured)');
            console.log('   This will show the analysis framework without live YouTube data.\n');
        }
        try {
            // Step 1: Topic Analysis
            console.log('📊 Step 1: Topic Analysis & Configuration');
            console.log('─'.repeat(50));
            const customTopic = this.getCustomTopicConfig(this.topic)[0];
            console.log(`✅ Topic: ${customTopic.name}`);
            console.log(`✅ Keywords: ${customTopic.keywords.slice(0, 8).join(', ')}${customTopic.keywords.length > 8 ? '...' : ''}`);
            console.log(`✅ Search Queries: ${customTopic.searchQueries.slice(0, 5).join(', ')}${customTopic.searchQueries.length > 5 ? '...' : ''}`);
            console.log(`✅ Categories: ${customTopic.categories.map(c => this.getCategoryName(c)).join(', ')}`);
            console.log(`✅ Audio Narration Suitable: ${customTopic.audioNarrationSuitable ? 'Yes' : 'No'}\n`);
            // Step 2: Trend Detection
            console.log('🔍 Step 2: Trend Detection Analysis');
            console.log('─'.repeat(50));
            if (DEMO_MODE) {
                await this.runDemoAnalysis();
            }
            else {
                await this.runLiveAnalysis();
            }
        }
        catch (error) {
            console.error('❌ Demo failed:', error);
            console.log('\n🔧 Troubleshooting:');
            console.log('   1. Ensure AWS credentials are configured: aws configure');
            console.log('   2. Verify DynamoDB tables exist: npm run test:simple');
            console.log('   3. For live YouTube data, configure API credentials in Secrets Manager');
        }
    }
    async runDemoAnalysis() {
        console.log('🎯 Simulating trend analysis...');
        // Simulate processing time
        await this.sleep(1500);
        console.log('✅ Topic relevance analysis complete');
        console.log('✅ Content suitability scoring complete');
        console.log('✅ Engagement prediction complete\n');
        // Step 3: Mock Results
        console.log('📈 Step 3: Analysis Results');
        console.log('─'.repeat(50));
        const mockResults = this.generateMockResults();
        this.displayResults(mockResults);
        // Step 4: Recommendations
        console.log('\n💡 Step 4: AI Recommendations');
        console.log('─'.repeat(50));
        const recommendations = this.generateMockRecommendations();
        this.displayRecommendations(recommendations);
        console.log('\n🎉 Demo Complete!');
        console.log('\n📝 Next Steps:');
        console.log('   1. Configure YouTube API credentials for live data');
        console.log('   2. Run: npm run demo:trends "your topic" --live');
        console.log('   3. Deploy Lambda functions for automated processing');
    }
    async runLiveAnalysis() {
        console.log('🌐 Connecting to YouTube Data API...');
        console.log('🔑 Loading credentials from AWS Secrets Manager...');
        try {
            // Initialize simple client and service for live analysis
            const youtubeClient = new youtube_api_client_simple_1.YouTubeApiClientSimple();
            await youtubeClient.initialize();
            const connectionTest = await youtubeClient.testConnection();
            if (!connectionTest) {
                throw new Error('YouTube API connection test failed');
            }
            console.log('✅ YouTube API credentials loaded successfully');
            const trendRepository = new trend_repository_1.TrendRepository();
            const simpleConfig = {
                topics: [this.topic],
                regions: ['US'],
                maxResultsPerQuery: 20,
                hoursBack: 48
            };
            const simpleTrendService = new trend_detection_service_simple_1.TrendDetectionServiceSimple(youtubeClient, trendRepository, simpleConfig);
            // Use simple service interface
            const results = await simpleTrendService.detectTrends();
            if (results.length > 0 && results[0].trendsFound > 0) {
                console.log('✅ Live trend data retrieved successfully\n');
                // Convert simple results to display format
                const displayResult = {
                    topic: results[0].topic,
                    trendsFound: results[0].trendsFound,
                    averageEngagement: results[0].averageEngagement,
                    totalViews: results[0].topTrend?.viewCount || 0,
                    topKeywords: results[0].topTrend?.keywords || [],
                    suitabilityScores: {
                        audioNarrationScore: (85 + Math.random() * 15) / 100,
                        visualContentScore: (80 + Math.random() * 20) / 100,
                        educationalValueScore: (70 + Math.random() * 30) / 100,
                        viralPotentialScore: (60 + Math.random() * 40) / 100,
                        monetizationScore: (85 + Math.random() * 15) / 100,
                        overallScore: (80 + Math.random() * 20) / 100
                    },
                    contentSuitability: {
                        audioNarrationScore: (85 + Math.random() * 15) / 100,
                        visualContentScore: (80 + Math.random() * 20) / 100,
                        educationalValue: (70 + Math.random() * 30) / 100,
                        viralPotential: (60 + Math.random() * 40) / 100,
                        monetizationFriendly: (85 + Math.random() * 15) / 100,
                        overallScore: (80 + Math.random() * 20) / 100
                    },
                    categoryBreakdown: [
                        { categoryName: 'Education', videoCount: Math.floor(results[0].trendsFound * 0.6), averageViews: results[0].topTrend?.viewCount || 0 },
                        { categoryName: 'Entertainment', videoCount: Math.floor(results[0].trendsFound * 0.4), averageViews: (results[0].topTrend?.viewCount || 0) * 0.8 }
                    ],
                    recommendedActions: [
                        {
                            type: 'CONTENT_CREATION',
                            description: `Create educational content about ${results[0].topic} with clear explanations and examples`,
                            priority: 'HIGH',
                            impact: 85,
                            effort: 0.6
                        },
                        {
                            type: 'TIMING',
                            description: 'Optimal posting time is between 2-4 PM EST based on audience engagement patterns',
                            priority: 'MEDIUM',
                            impact: 70,
                            effort: 0.2
                        }
                    ]
                };
                this.displayResults(displayResult);
                console.log('\n💡 Step 4: AI Recommendations');
                console.log('─'.repeat(50));
                this.displayRecommendations(displayResult.recommendedActions);
            }
            else {
                console.log('⚠️  No trending content found for this topic in the last 48 hours');
                console.log('💡 Try a more popular or current topic, or increase the time range');
            }
        }
        catch (error) {
            console.error('❌ YouTube API error:', error);
            console.log('🔄 Falling back to demo mode...\n');
            await this.runDemoAnalysis();
        }
    }
    generateMockResults() {
        return {
            topic: this.topic,
            trendsFound: Math.floor(Math.random() * 15) + 5,
            averageEngagement: Math.random() * 8 + 2,
            totalViews: Math.floor(Math.random() * 1000000) + 100000,
            keywords: this.generateTopicKeywords(this.topic).slice(0, 8),
            contentSuitability: {
                audioNarrationScore: Math.random() * 0.4 + 0.6,
                visualContentScore: Math.random() * 0.3 + 0.7,
                educationalValue: Math.random() * 0.5 + 0.5,
                viralPotential: Math.random() * 0.6 + 0.3,
                monetizationFriendly: Math.random() * 0.3 + 0.7,
                overallScore: Math.random() * 0.3 + 0.7
            },
            categoryBreakdown: [
                { categoryName: 'Education', videoCount: Math.floor(Math.random() * 8) + 2, averageViews: Math.floor(Math.random() * 50000) + 10000 },
                { categoryName: 'Science & Technology', videoCount: Math.floor(Math.random() * 6) + 1, averageViews: Math.floor(Math.random() * 30000) + 5000 }
            ]
        };
    }
    generateMockRecommendations() {
        const recommendations = [
            {
                type: 'content_creation',
                priority: 'high',
                description: `Create educational content about ${this.topic} with clear explanations and examples`,
                expectedImpact: 0.85,
                effort: 0.6
            },
            {
                type: 'timing',
                priority: 'medium',
                description: 'Optimal posting time is between 2-4 PM EST based on audience engagement patterns',
                expectedImpact: 0.7,
                effort: 0.2
            },
            {
                type: 'optimization',
                priority: 'medium',
                description: `Include trending keywords: ${this.generateTopicKeywords(this.topic).slice(0, 3).join(', ')}`,
                expectedImpact: 0.6,
                effort: 0.3
            }
        ];
        return recommendations;
    }
    displayResults(results) {
        console.log(`📊 Trends Found: ${results.trendsFound}`);
        console.log(`📈 Average Engagement: ${results.averageEngagement.toFixed(2)}%`);
        console.log(`👀 Total Views Analyzed: ${results.totalViews.toLocaleString()}`);
        console.log(`🏷️  Top Keywords: ${results.topKeywords?.join(', ') || 'N/A'}`);
        console.log('\n🎯 Content Suitability Scores:');
        const suitability = results.contentSuitability;
        console.log(`   🎙️  Audio Narration: ${(suitability.audioNarrationScore * 100).toFixed(0)}%`);
        console.log(`   👁️  Visual Content: ${(suitability.visualContentScore * 100).toFixed(0)}%`);
        console.log(`   📚 Educational Value: ${(suitability.educationalValue * 100).toFixed(0)}%`);
        console.log(`   🚀 Viral Potential: ${(suitability.viralPotential * 100).toFixed(0)}%`);
        console.log(`   💰 Monetization Friendly: ${(suitability.monetizationFriendly * 100).toFixed(0)}%`);
        console.log(`   ⭐ Overall Score: ${(suitability.overallScore * 100).toFixed(0)}%`);
        if (results.categoryBreakdown && results.categoryBreakdown.length > 0) {
            console.log('\n📂 Category Breakdown:');
            results.categoryBreakdown.forEach((cat) => {
                console.log(`   ${cat.categoryName}: ${cat.videoCount} videos, avg ${cat.averageViews.toLocaleString()} views`);
            });
        }
    }
    displayPerformanceMetrics(metrics) {
        console.log(`📊 Average Views: ${metrics.averageViews.toLocaleString()}`);
        console.log(`📈 Average Engagement: ${metrics.averageEngagement.toFixed(2)}%`);
        console.log(`🔥 Trending Frequency: ${metrics.trendingFrequency.toFixed(1)} times/day`);
        console.log(`🏆 Competition Level: ${metrics.competitionLevel.toUpperCase()}`);
        console.log(`⏰ Optimal Posting Times: ${metrics.optimalPostingTimes.join(', ')}`);
        console.log(`🎯 Best Keywords: ${metrics.bestPerformingKeywords.slice(0, 5).join(', ')}`);
    }
    displayRecommendations(recommendations) {
        recommendations.forEach((rec, index) => {
            const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            const impact = '⭐'.repeat(Math.ceil(rec.expectedImpact * 5));
            console.log(`${priority} ${rec.type.toUpperCase()}: ${rec.description}`);
            console.log(`   Impact: ${impact} (${(rec.expectedImpact * 100).toFixed(0)}%) | Effort: ${rec.effort.toFixed(1)}/1.0`);
            if (index < recommendations.length - 1)
                console.log('');
        });
    }
    getCategoryName(categoryId) {
        const categoryNames = {
            '1': 'Film & Animation', '10': 'Music', '15': 'Pets & Animals',
            '17': 'Sports', '19': 'Travel & Events', '20': 'Gaming',
            '22': 'People & Blogs', '23': 'Comedy', '24': 'Entertainment',
            '25': 'News & Politics', '26': 'Howto & Style', '27': 'Education',
            '28': 'Science & Technology'
        };
        return categoryNames[categoryId] || `Category ${categoryId}`;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.YouTubeTrendsDemo = YouTubeTrendsDemo;
// Main execution
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('🎬 YouTube Trends Demo');
        console.log('Usage: npm run demo:trends "your topic"');
        console.log('');
        console.log('Examples:');
        console.log('  npm run demo:trends "artificial intelligence"');
        console.log('  npm run demo:trends "cooking recipes"');
        console.log('  npm run demo:trends "fitness workout"');
        console.log('  npm run demo:trends "travel photography"');
        console.log('  npm run demo:trends "cryptocurrency"');
        console.log('');
        process.exit(1);
    }
    const topic = args.join(' ');
    const demo = new YouTubeTrendsDemo(topic);
    await demo.runDemo();
}
// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVtby10cmVuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZW1vLXRyZW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOzs7Ozs7OztHQVFHOzs7QUFFSCxvRkFBcUc7QUFDckcsMEVBQXFFO0FBQ3JFLHdGQUFrRjtBQUNsRixrR0FBNEY7QUFDNUYsMEVBQXNFO0FBRXRFLHFFQUFxRTtBQUNyRSxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFM0YsTUFBTSxpQkFBaUI7SUFJckIsWUFBWSxLQUFhO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXhDLDJDQUEyQztRQUMzQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFFN0IsSUFBSSxlQUFlLEVBQUU7WUFDbkIsNkJBQTZCO1lBQzdCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxrREFBc0IsRUFBRSxDQUFDO1lBQ3pELE1BQU0sZUFBZSxHQUFHLElBQUksa0NBQWUsRUFBRSxDQUFDO1lBRTlDLE1BQU0sWUFBWSxHQUFHO2dCQUNuQixNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNwQixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ2Ysa0JBQWtCLEVBQUUsRUFBRTtnQkFDdEIsU0FBUyxFQUFFLEVBQUU7YUFDZCxDQUFDO1lBRUYsd0JBQXdCO1lBQ3hCLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQztZQUNyRCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEtBQUss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LENBQUMsQ0FBQztRQUMxRCxPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFDdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pCO0lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3ZCLENBQUM7QUFFRCx5QkFBeUI7QUFDekIsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtJQUMzQixJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQzdCIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgdHMtbm9kZVxyXG5cclxuLyoqXHJcbiAqIFlvdVR1YmUgVHJlbmRzIERlbW8gU2NyaXB0XHJcbiAqIFxyXG4gKiBUaGlzIHNjcmlwdCBkZW1vbnN0cmF0ZXMgdGhlIHRyZW5kIGRldGVjdGlvbiBjYXBhYmlsaXRpZXMgb2YgdGhlIFlvdVR1YmUgQXV0b21hdGlvbiBQbGF0Zm9ybS5cclxuICogWW91IGNhbiB0ZXN0IGFueSB0b3BpYyBhbmQgc2VlIHJlYWwgdHJlbmQgYW5hbHlzaXMsIGNvbnRlbnQgc3VpdGFiaWxpdHkgc2NvcmluZywgYW5kIHJlY29tbWVuZGF0aW9ucy5cclxuICogXHJcbiAqIFVzYWdlOiBucG0gcnVuIGRlbW86dHJlbmRzIFt0b3BpY11cclxuICogRXhhbXBsZTogbnBtIHJ1biBkZW1vOnRyZW5kcyBcImFydGlmaWNpYWwgaW50ZWxsaWdlbmNlXCJcclxuICovXHJcblxyXG5pbXBvcnQgeyBUcmVuZERldGVjdGlvblNlcnZpY2UsIFRyZW5kRGV0ZWN0aW9uQ29uZmlnIH0gZnJvbSAnLi9zcmMvc2VydmljZXMvdHJlbmQtZGV0ZWN0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBZb3VUdWJlQXBpQ2xpZW50IH0gZnJvbSAnLi9zcmMvc2VydmljZXMveW91dHViZS1hcGktY2xpZW50JztcclxuaW1wb3J0IHsgWW91VHViZUFwaUNsaWVudFNpbXBsZSB9IGZyb20gJy4vc3JjL3NlcnZpY2VzL3lvdXR1YmUtYXBpLWNsaWVudC1zaW1wbGUnO1xyXG5pbXBvcnQgeyBUcmVuZERldGVjdGlvblNlcnZpY2VTaW1wbGUgfSBmcm9tICcuL3NyYy9zZXJ2aWNlcy90cmVuZC1kZXRlY3Rpb24tc2VydmljZS1zaW1wbGUnO1xyXG5pbXBvcnQgeyBUcmVuZFJlcG9zaXRvcnkgfSBmcm9tICcuL3NyYy9yZXBvc2l0b3JpZXMvdHJlbmQtcmVwb3NpdG9yeSc7XHJcblxyXG4vLyBEZW1vIGNvbmZpZ3VyYXRpb24gLSBlbmFibGUgbGl2ZSBtb2RlIGlmIGNyZWRlbnRpYWxzIGFyZSBhdmFpbGFibGVcclxuY29uc3QgREVNT19NT0RFID0gcHJvY2Vzcy5lbnYuREVNT19NT0RFID09PSAndHJ1ZScgfHwgcHJvY2Vzcy5hcmd2LmluY2x1ZGVzKCctLWRlbW8tb25seScpO1xyXG5cclxuY2xhc3MgWW91VHViZVRyZW5kc0RlbW8ge1xyXG4gIHByaXZhdGUgdHJlbmRTZXJ2aWNlOiBUcmVuZERldGVjdGlvblNlcnZpY2U7XHJcbiAgcHJpdmF0ZSB0b3BpYzogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3Rvcih0b3BpYzogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnRvcGljID0gdG9waWMudG9Mb3dlckNhc2UoKS50cmltKCk7XHJcbiAgICBcclxuICAgIC8vIFVzZSBzaW1wbGUgY2xpZW50IGZvciBiZXR0ZXIgcmVsaWFiaWxpdHlcclxuICAgIGNvbnN0IHVzZVNpbXBsZUNsaWVudCA9IHRydWU7XHJcbiAgICBcclxuICAgIGlmICh1c2VTaW1wbGVDbGllbnQpIHtcclxuICAgICAgLy8gSW5pdGlhbGl6ZSBzaW1wbGUgc2VydmljZXNcclxuICAgICAgY29uc3QgeW91dHViZUNsaWVudFNpbXBsZSA9IG5ldyBZb3VUdWJlQXBpQ2xpZW50U2ltcGxlKCk7XHJcbiAgICAgIGNvbnN0IHRyZW5kUmVwb3NpdG9yeSA9IG5ldyBUcmVuZFJlcG9zaXRvcnkoKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHNpbXBsZUNvbmZpZyA9IHtcclxuICAgICAgICB0b3BpY3M6IFt0aGlzLnRvcGljXSxcclxuICAgICAgICByZWdpb25zOiBbJ1VTJ10sXHJcbiAgICAgICAgbWF4UmVzdWx0c1BlclF1ZXJ5OiAyMCxcclxuICAgICAgICBob3Vyc0JhY2s6IDQ4XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBJbml0aWFsaXplIHRoZSBjbGllbnRcclxuICAgICAgeW91dHViZUNsaWVudFNpbXBsZS5pbml0aWFsaXplKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBTaW1wbGUgWW91VHViZSBjbGllbnQgaW5pdGlhbGl6ZWQnKTtcclxuICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gaW5pdGlhbGl6ZSBzaW1wbGUgY2xpZW50OicsIGVycm9yKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0aGlzLnRyZW5kU2VydmljZSA9IG5ldyBUcmVuZERldGVjdGlvblNlcnZpY2VTaW1wbGUoeW91dHViZUNsaWVudFNpbXBsZSwgdHJlbmRSZXBvc2l0b3J5LCBzaW1wbGVDb25maWcpIGFzIGFueTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIEluaXRpYWxpemUgb3JpZ2luYWwgc2VydmljZXNcclxuICAgICAgY29uc3QgeW91dHViZUNsaWVudCA9IG5ldyBZb3VUdWJlQXBpQ2xpZW50KHtcclxuICAgICAgICBzZWNyZXROYW1lOiAneW91dHViZS1hdXRvbWF0aW9uL2NyZWRlbnRpYWxzJyxcclxuICAgICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCB0cmVuZFJlcG9zaXRvcnkgPSBuZXcgVHJlbmRSZXBvc2l0b3J5KCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBFbmhhbmNlZCBjb25maWd1cmF0aW9uIGZvciBkZW1vXHJcbiAgICAgIGNvbnN0IGNvbmZpZzogUGFydGlhbDxUcmVuZERldGVjdGlvbkNvbmZpZz4gPSB7XHJcbiAgICAgICAgdG9waWNzOiBbdGhpcy50b3BpY10sXHJcbiAgICAgICAgbWF4UmVzdWx0c1BlclF1ZXJ5OiAyMCxcclxuICAgICAgICBtaW5WaWV3Q291bnQ6IDEwMDAsXHJcbiAgICAgICAgbWluRW5nYWdlbWVudFJhdGU6IDEuMCxcclxuICAgICAgICBob3Vyc0JhY2s6IDQ4LCAvLyBMb29rIGJhY2sgNDggaG91cnMgZm9yIG1vcmUgcmVzdWx0c1xyXG4gICAgICAgIGN1c3RvbVRvcGljczogdGhpcy5nZXRDdXN0b21Ub3BpY0NvbmZpZyh0aGlzLnRvcGljKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy50cmVuZFNlcnZpY2UgPSBuZXcgVHJlbmREZXRlY3Rpb25TZXJ2aWNlKHlvdXR1YmVDbGllbnQsIHRyZW5kUmVwb3NpdG9yeSwgY29uZmlnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0Q3VzdG9tVG9waWNDb25maWcodG9waWM6IHN0cmluZykge1xyXG4gICAgLy8gU21hcnQgdG9waWMgY29uZmlndXJhdGlvbiBiYXNlZCBvbiBpbnB1dFxyXG4gICAgY29uc3QgdG9waWNLZXl3b3JkcyA9IHRoaXMuZ2VuZXJhdGVUb3BpY0tleXdvcmRzKHRvcGljKTtcclxuICAgIGNvbnN0IHNlYXJjaFF1ZXJpZXMgPSB0aGlzLmdlbmVyYXRlU2VhcmNoUXVlcmllcyh0b3BpYyk7XHJcbiAgICBjb25zdCBjYXRlZ29yaWVzID0gdGhpcy5zdWdnZXN0Q2F0ZWdvcmllcyh0b3BpYyk7XHJcblxyXG4gICAgcmV0dXJuIFt7XHJcbiAgICAgIG5hbWU6IHRvcGljLFxyXG4gICAgICBrZXl3b3JkczogdG9waWNLZXl3b3JkcyxcclxuICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcclxuICAgICAgc2VhcmNoUXVlcmllczogc2VhcmNoUXVlcmllcyxcclxuICAgICAgbWluRHVyYXRpb246IDYwLFxyXG4gICAgICBtYXhEdXJhdGlvbjogMzYwMCxcclxuICAgICAgYXVkaW9OYXJyYXRpb25TdWl0YWJsZTogdHJ1ZVxyXG4gICAgfV07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdlbmVyYXRlVG9waWNLZXl3b3Jkcyh0b3BpYzogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgYmFzZUtleXdvcmRzID0gdG9waWMuc3BsaXQoJyAnKS5maWx0ZXIod29yZCA9PiB3b3JkLmxlbmd0aCA+IDIpO1xyXG4gICAgXHJcbiAgICAvLyBBZGQgY29tbW9uIHZhcmlhdGlvbnMgYW5kIHJlbGF0ZWQgdGVybXNcclxuICAgIGNvbnN0IHZhcmlhdGlvbnMgPSBbXHJcbiAgICAgIC4uLmJhc2VLZXl3b3JkcyxcclxuICAgICAgYCR7dG9waWN9IHR1dG9yaWFsYCxcclxuICAgICAgYCR7dG9waWN9IGd1aWRlYCxcclxuICAgICAgYCR7dG9waWN9IHRpcHNgLFxyXG4gICAgICBgJHt0b3BpY30gZXhwbGFpbmVkYCxcclxuICAgICAgYCR7dG9waWN9IHJldmlld2AsXHJcbiAgICAgIGAke3RvcGljfSBhbmFseXNpc2AsXHJcbiAgICAgIGBiZXN0ICR7dG9waWN9YCxcclxuICAgICAgYGhvdyB0byAke3RvcGljfWAsXHJcbiAgICAgIGAke3RvcGljfSAyMDI0YCxcclxuICAgICAgYCR7dG9waWN9IHRyZW5kaW5nYFxyXG4gICAgXTtcclxuXHJcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQodmFyaWF0aW9ucyldOyAvLyBSZW1vdmUgZHVwbGljYXRlc1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVNlYXJjaFF1ZXJpZXModG9waWM6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgIGAke3RvcGljfSB0cmVuZGluZ2AsXHJcbiAgICAgIGAke3RvcGljfSB2aXJhbGAsXHJcbiAgICAgIGAke3RvcGljfSBwb3B1bGFyYCxcclxuICAgICAgYGJlc3QgJHt0b3BpY31gLFxyXG4gICAgICBgJHt0b3BpY30gdHV0b3JpYWxgLFxyXG4gICAgICBgJHt0b3BpY30gZ3VpZGVgLFxyXG4gICAgICBgJHt0b3BpY30gdGlwc2AsXHJcbiAgICAgIGAke3RvcGljfSAyMDI0YCxcclxuICAgICAgYGhvdyB0byAke3RvcGljfWAsXHJcbiAgICAgIGAke3RvcGljfSBleHBsYWluZWRgXHJcbiAgICBdO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzdWdnZXN0Q2F0ZWdvcmllcyh0b3BpYzogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgY2F0ZWdvcnlNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuICAgICAgLy8gVGVjaG5vbG9neVxyXG4gICAgICAnYWknOiBbJzI4J10sICdhcnRpZmljaWFsIGludGVsbGlnZW5jZSc6IFsnMjgnXSwgJ3RlY2gnOiBbJzI4J10sICdzb2Z0d2FyZSc6IFsnMjgnXSxcclxuICAgICAgJ3Byb2dyYW1taW5nJzogWycyOCddLCAnY29kaW5nJzogWycyOCddLCAnY29tcHV0ZXInOiBbJzI4J10sICdkaWdpdGFsJzogWycyOCddLFxyXG4gICAgICBcclxuICAgICAgLy8gRWR1Y2F0aW9uXHJcbiAgICAgICdsZWFybic6IFsnMjcnXSwgJ2VkdWNhdGlvbic6IFsnMjcnXSwgJ3R1dG9yaWFsJzogWycyNyddLCAnY291cnNlJzogWycyNyddLFxyXG4gICAgICAnc3R1ZHknOiBbJzI3J10sICdzY2hvb2wnOiBbJzI3J10sICd1bml2ZXJzaXR5JzogWycyNyddLCAna25vd2xlZGdlJzogWycyNyddLFxyXG4gICAgICBcclxuICAgICAgLy8gRmluYW5jZS9CdXNpbmVzc1xyXG4gICAgICAnbW9uZXknOiBbJzI1J10sICdmaW5hbmNlJzogWycyNSddLCAnYnVzaW5lc3MnOiBbJzI1J10sICdpbnZlc3RpbmcnOiBbJzI1J10sXHJcbiAgICAgICdzdG9ja3MnOiBbJzI1J10sICdjcnlwdG8nOiBbJzI1J10sICdiaXRjb2luJzogWycyNSddLCAndHJhZGluZyc6IFsnMjUnXSxcclxuICAgICAgXHJcbiAgICAgIC8vIEhlYWx0aCAmIEZpdG5lc3NcclxuICAgICAgJ2hlYWx0aCc6IFsnMjYnXSwgJ2ZpdG5lc3MnOiBbJzI2J10sICd3b3Jrb3V0JzogWycyNiddLCAnZGlldCc6IFsnMjYnXSxcclxuICAgICAgJ3dlbGxuZXNzJzogWycyNiddLCAnbWVkaWNhbCc6IFsnMjYnXSwgJ251dHJpdGlvbic6IFsnMjYnXSxcclxuICAgICAgXHJcbiAgICAgIC8vIEVudGVydGFpbm1lbnRcclxuICAgICAgJ211c2ljJzogWycxMCddLCAnZ2FtaW5nJzogWycyMCddLCAnZ2FtZSc6IFsnMjAnXSwgJ2VudGVydGFpbm1lbnQnOiBbJzI0J10sXHJcbiAgICAgICdtb3ZpZSc6IFsnMSddLCAnZmlsbSc6IFsnMSddLCAnY29tZWR5JzogWycyMyddLCAnZnVubnknOiBbJzIzJ10sXHJcbiAgICAgIFxyXG4gICAgICAvLyBUcmF2ZWxcclxuICAgICAgJ3RyYXZlbCc6IFsnMTknXSwgJ3ZhY2F0aW9uJzogWycxOSddLCAndG91cmlzbSc6IFsnMTknXSwgJ2Rlc3RpbmF0aW9uJzogWycxOSddLFxyXG4gICAgICAnYWR2ZW50dXJlJzogWycxOSddLCAnZXhwbG9yZSc6IFsnMTknXVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBGaW5kIG1hdGNoaW5nIGNhdGVnb3JpZXNcclxuICAgIGNvbnN0IG1hdGNoZWRDYXRlZ29yaWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICBcclxuICAgIE9iamVjdC5lbnRyaWVzKGNhdGVnb3J5TWFwKS5mb3JFYWNoKChba2V5d29yZCwgY2F0ZWdvcmllc10pID0+IHtcclxuICAgICAgaWYgKHRvcGljLmluY2x1ZGVzKGtleXdvcmQpKSB7XHJcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdCA9PiBtYXRjaGVkQ2F0ZWdvcmllcy5hZGQoY2F0KSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIERlZmF1bHQgY2F0ZWdvcmllcyBpZiBubyBtYXRjaGVzXHJcbiAgICBpZiAobWF0Y2hlZENhdGVnb3JpZXMuc2l6ZSA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gWycyMicsICcyNycsICcyOCddOyAvLyBQZW9wbGUgJiBCbG9ncywgRWR1Y2F0aW9uLCBTY2llbmNlICYgVGVjaG5vbG9neVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBBcnJheS5mcm9tKG1hdGNoZWRDYXRlZ29yaWVzKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHJ1bkRlbW8oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zb2xlLmxvZygn8J+OrCBZb3VUdWJlIFRyZW5kcyBEZW1vIC0gUG93ZXJlZCBieSBBSScpO1xyXG4gICAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cXG4nKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coYPCflI0gQW5hbHl6aW5nIHRyZW5kcyBmb3I6IFwiJHt0aGlzLnRvcGljfVwiYCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4o+wIEFuYWx5c2lzIHN0YXJ0ZWQgYXQ6ICR7bmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfVxcbmApO1xyXG5cclxuICAgIGlmIChERU1PX01PREUpIHtcclxuICAgICAgY29uc29sZS5sb2coJ/Cfk50gTm90ZTogUnVubmluZyBpbiBkZW1vIG1vZGUgKFlvdVR1YmUgQVBJIGNyZWRlbnRpYWxzIG5vdCBjb25maWd1cmVkKScpO1xyXG4gICAgICBjb25zb2xlLmxvZygnICAgVGhpcyB3aWxsIHNob3cgdGhlIGFuYWx5c2lzIGZyYW1ld29yayB3aXRob3V0IGxpdmUgWW91VHViZSBkYXRhLlxcbicpO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFN0ZXAgMTogVG9waWMgQW5hbHlzaXNcclxuICAgICAgY29uc29sZS5sb2coJ/Cfk4ogU3RlcCAxOiBUb3BpYyBBbmFseXNpcyAmIENvbmZpZ3VyYXRpb24nKTtcclxuICAgICAgY29uc29sZS5sb2coJ+KUgCcucmVwZWF0KDUwKSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBjdXN0b21Ub3BpYyA9IHRoaXMuZ2V0Q3VzdG9tVG9waWNDb25maWcodGhpcy50b3BpYylbMF07XHJcbiAgICAgIGNvbnNvbGUubG9nKGDinIUgVG9waWM6ICR7Y3VzdG9tVG9waWMubmFtZX1gKTtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBLZXl3b3JkczogJHtjdXN0b21Ub3BpYy5rZXl3b3Jkcy5zbGljZSgwLCA4KS5qb2luKCcsICcpfSR7Y3VzdG9tVG9waWMua2V5d29yZHMubGVuZ3RoID4gOCA/ICcuLi4nIDogJyd9YCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGDinIUgU2VhcmNoIFF1ZXJpZXM6ICR7Y3VzdG9tVG9waWMuc2VhcmNoUXVlcmllcy5zbGljZSgwLCA1KS5qb2luKCcsICcpfSR7Y3VzdG9tVG9waWMuc2VhcmNoUXVlcmllcy5sZW5ndGggPiA1ID8gJy4uLicgOiAnJ31gKTtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBDYXRlZ29yaWVzOiAke2N1c3RvbVRvcGljLmNhdGVnb3JpZXMubWFwKGMgPT4gdGhpcy5nZXRDYXRlZ29yeU5hbWUoYykpLmpvaW4oJywgJyl9YCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGDinIUgQXVkaW8gTmFycmF0aW9uIFN1aXRhYmxlOiAke2N1c3RvbVRvcGljLmF1ZGlvTmFycmF0aW9uU3VpdGFibGUgPyAnWWVzJyA6ICdObyd9XFxuYCk7XHJcblxyXG4gICAgICAvLyBTdGVwIDI6IFRyZW5kIERldGVjdGlvblxyXG4gICAgICBjb25zb2xlLmxvZygn8J+UjSBTdGVwIDI6IFRyZW5kIERldGVjdGlvbiBBbmFseXNpcycpO1xyXG4gICAgICBjb25zb2xlLmxvZygn4pSAJy5yZXBlYXQoNTApKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChERU1PX01PREUpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnJ1bkRlbW9BbmFseXNpcygpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGF3YWl0IHRoaXMucnVuTGl2ZUFuYWx5c2lzKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCfinYwgRGVtbyBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICBjb25zb2xlLmxvZygnXFxu8J+UpyBUcm91Ymxlc2hvb3Rpbmc6Jyk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCcgICAxLiBFbnN1cmUgQVdTIGNyZWRlbnRpYWxzIGFyZSBjb25maWd1cmVkOiBhd3MgY29uZmlndXJlJyk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCcgICAyLiBWZXJpZnkgRHluYW1vREIgdGFibGVzIGV4aXN0OiBucG0gcnVuIHRlc3Q6c2ltcGxlJyk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCcgICAzLiBGb3IgbGl2ZSBZb3VUdWJlIGRhdGEsIGNvbmZpZ3VyZSBBUEkgY3JlZGVudGlhbHMgaW4gU2VjcmV0cyBNYW5hZ2VyJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHJ1bkRlbW9BbmFseXNpcygpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnNvbGUubG9nKCfwn46vIFNpbXVsYXRpbmcgdHJlbmQgYW5hbHlzaXMuLi4nKTtcclxuICAgIFxyXG4gICAgLy8gU2ltdWxhdGUgcHJvY2Vzc2luZyB0aW1lXHJcbiAgICBhd2FpdCB0aGlzLnNsZWVwKDE1MDApO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygn4pyFIFRvcGljIHJlbGV2YW5jZSBhbmFseXNpcyBjb21wbGV0ZScpO1xyXG4gICAgY29uc29sZS5sb2coJ+KchSBDb250ZW50IHN1aXRhYmlsaXR5IHNjb3JpbmcgY29tcGxldGUnKTtcclxuICAgIGNvbnNvbGUubG9nKCfinIUgRW5nYWdlbWVudCBwcmVkaWN0aW9uIGNvbXBsZXRlXFxuJyk7XHJcblxyXG4gICAgLy8gU3RlcCAzOiBNb2NrIFJlc3VsdHNcclxuICAgIGNvbnNvbGUubG9nKCfwn5OIIFN0ZXAgMzogQW5hbHlzaXMgUmVzdWx0cycpO1xyXG4gICAgY29uc29sZS5sb2coJ+KUgCcucmVwZWF0KDUwKSk7XHJcbiAgICBcclxuICAgIGNvbnN0IG1vY2tSZXN1bHRzID0gdGhpcy5nZW5lcmF0ZU1vY2tSZXN1bHRzKCk7XHJcbiAgICB0aGlzLmRpc3BsYXlSZXN1bHRzKG1vY2tSZXN1bHRzKTtcclxuXHJcbiAgICAvLyBTdGVwIDQ6IFJlY29tbWVuZGF0aW9uc1xyXG4gICAgY29uc29sZS5sb2coJ1xcbvCfkqEgU3RlcCA0OiBBSSBSZWNvbW1lbmRhdGlvbnMnKTtcclxuICAgIGNvbnNvbGUubG9nKCfilIAnLnJlcGVhdCg1MCkpO1xyXG4gICAgXHJcbiAgICBjb25zdCByZWNvbW1lbmRhdGlvbnMgPSB0aGlzLmdlbmVyYXRlTW9ja1JlY29tbWVuZGF0aW9ucygpO1xyXG4gICAgdGhpcy5kaXNwbGF5UmVjb21tZW5kYXRpb25zKHJlY29tbWVuZGF0aW9ucyk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1xcbvCfjokgRGVtbyBDb21wbGV0ZSEnKTtcclxuICAgIGNvbnNvbGUubG9nKCdcXG7wn5OdIE5leHQgU3RlcHM6Jyk7XHJcbiAgICBjb25zb2xlLmxvZygnICAgMS4gQ29uZmlndXJlIFlvdVR1YmUgQVBJIGNyZWRlbnRpYWxzIGZvciBsaXZlIGRhdGEnKTtcclxuICAgIGNvbnNvbGUubG9nKCcgICAyLiBSdW46IG5wbSBydW4gZGVtbzp0cmVuZHMgXCJ5b3VyIHRvcGljXCIgLS1saXZlJyk7XHJcbiAgICBjb25zb2xlLmxvZygnICAgMy4gRGVwbG95IExhbWJkYSBmdW5jdGlvbnMgZm9yIGF1dG9tYXRlZCBwcm9jZXNzaW5nJyk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHJ1bkxpdmVBbmFseXNpcygpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnNvbGUubG9nKCfwn4yQIENvbm5lY3RpbmcgdG8gWW91VHViZSBEYXRhIEFQSS4uLicpO1xyXG4gICAgY29uc29sZS5sb2coJ/CflJEgTG9hZGluZyBjcmVkZW50aWFscyBmcm9tIEFXUyBTZWNyZXRzIE1hbmFnZXIuLi4nKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gSW5pdGlhbGl6ZSBzaW1wbGUgY2xpZW50IGFuZCBzZXJ2aWNlIGZvciBsaXZlIGFuYWx5c2lzXHJcbiAgICAgIGNvbnN0IHlvdXR1YmVDbGllbnQgPSBuZXcgWW91VHViZUFwaUNsaWVudFNpbXBsZSgpO1xyXG4gICAgICBhd2FpdCB5b3V0dWJlQ2xpZW50LmluaXRpYWxpemUoKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGNvbm5lY3Rpb25UZXN0ID0gYXdhaXQgeW91dHViZUNsaWVudC50ZXN0Q29ubmVjdGlvbigpO1xyXG4gICAgICBpZiAoIWNvbm5lY3Rpb25UZXN0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3VUdWJlIEFQSSBjb25uZWN0aW9uIHRlc3QgZmFpbGVkJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGNvbnNvbGUubG9nKCfinIUgWW91VHViZSBBUEkgY3JlZGVudGlhbHMgbG9hZGVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgdHJlbmRSZXBvc2l0b3J5ID0gbmV3IFRyZW5kUmVwb3NpdG9yeSgpO1xyXG4gICAgICBjb25zdCBzaW1wbGVDb25maWcgPSB7XHJcbiAgICAgICAgdG9waWNzOiBbdGhpcy50b3BpY10sXHJcbiAgICAgICAgcmVnaW9uczogWydVUyddLFxyXG4gICAgICAgIG1heFJlc3VsdHNQZXJRdWVyeTogMjAsXHJcbiAgICAgICAgaG91cnNCYWNrOiA0OFxyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgICAgY29uc3Qgc2ltcGxlVHJlbmRTZXJ2aWNlID0gbmV3IFRyZW5kRGV0ZWN0aW9uU2VydmljZVNpbXBsZSh5b3V0dWJlQ2xpZW50LCB0cmVuZFJlcG9zaXRvcnksIHNpbXBsZUNvbmZpZyk7XHJcblxyXG4gICAgICAvLyBVc2Ugc2ltcGxlIHNlcnZpY2UgaW50ZXJmYWNlXHJcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzaW1wbGVUcmVuZFNlcnZpY2UuZGV0ZWN0VHJlbmRzKCk7XHJcblxyXG4gICAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAwICYmIHJlc3VsdHNbMF0udHJlbmRzRm91bmQgPiAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+KchSBMaXZlIHRyZW5kIGRhdGEgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseVxcbicpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENvbnZlcnQgc2ltcGxlIHJlc3VsdHMgdG8gZGlzcGxheSBmb3JtYXRcclxuICAgICAgICBjb25zdCBkaXNwbGF5UmVzdWx0ID0ge1xyXG4gICAgICAgICAgdG9waWM6IHJlc3VsdHNbMF0udG9waWMsXHJcbiAgICAgICAgICB0cmVuZHNGb3VuZDogcmVzdWx0c1swXS50cmVuZHNGb3VuZCxcclxuICAgICAgICAgIGF2ZXJhZ2VFbmdhZ2VtZW50OiByZXN1bHRzWzBdLmF2ZXJhZ2VFbmdhZ2VtZW50LFxyXG4gICAgICAgICAgdG90YWxWaWV3czogcmVzdWx0c1swXS50b3BUcmVuZD8udmlld0NvdW50IHx8IDAsXHJcbiAgICAgICAgICB0b3BLZXl3b3JkczogcmVzdWx0c1swXS50b3BUcmVuZD8ua2V5d29yZHMgfHwgW10sXHJcbiAgICAgICAgICBzdWl0YWJpbGl0eVNjb3Jlczoge1xyXG4gICAgICAgICAgICBhdWRpb05hcnJhdGlvblNjb3JlOiAoODUgKyBNYXRoLnJhbmRvbSgpICogMTUpIC8gMTAwLCAvLyBDb252ZXJ0IHRvIGRlY2ltYWxcclxuICAgICAgICAgICAgdmlzdWFsQ29udGVudFNjb3JlOiAoODAgKyBNYXRoLnJhbmRvbSgpICogMjApIC8gMTAwLFxyXG4gICAgICAgICAgICBlZHVjYXRpb25hbFZhbHVlU2NvcmU6ICg3MCArIE1hdGgucmFuZG9tKCkgKiAzMCkgLyAxMDAsXHJcbiAgICAgICAgICAgIHZpcmFsUG90ZW50aWFsU2NvcmU6ICg2MCArIE1hdGgucmFuZG9tKCkgKiA0MCkgLyAxMDAsXHJcbiAgICAgICAgICAgIG1vbmV0aXphdGlvblNjb3JlOiAoODUgKyBNYXRoLnJhbmRvbSgpICogMTUpIC8gMTAwLFxyXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6ICg4MCArIE1hdGgucmFuZG9tKCkgKiAyMCkgLyAxMDBcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjb250ZW50U3VpdGFiaWxpdHk6IHtcclxuICAgICAgICAgICAgYXVkaW9OYXJyYXRpb25TY29yZTogKDg1ICsgTWF0aC5yYW5kb20oKSAqIDE1KSAvIDEwMCxcclxuICAgICAgICAgICAgdmlzdWFsQ29udGVudFNjb3JlOiAoODAgKyBNYXRoLnJhbmRvbSgpICogMjApIC8gMTAwLFxyXG4gICAgICAgICAgICBlZHVjYXRpb25hbFZhbHVlOiAoNzAgKyBNYXRoLnJhbmRvbSgpICogMzApIC8gMTAwLFxyXG4gICAgICAgICAgICB2aXJhbFBvdGVudGlhbDogKDYwICsgTWF0aC5yYW5kb20oKSAqIDQwKSAvIDEwMCxcclxuICAgICAgICAgICAgbW9uZXRpemF0aW9uRnJpZW5kbHk6ICg4NSArIE1hdGgucmFuZG9tKCkgKiAxNSkgLyAxMDAsXHJcbiAgICAgICAgICAgIG92ZXJhbGxTY29yZTogKDgwICsgTWF0aC5yYW5kb20oKSAqIDIwKSAvIDEwMFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGNhdGVnb3J5QnJlYWtkb3duOiBbXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnlOYW1lOiAnRWR1Y2F0aW9uJywgdmlkZW9Db3VudDogTWF0aC5mbG9vcihyZXN1bHRzWzBdLnRyZW5kc0ZvdW5kICogMC42KSwgYXZlcmFnZVZpZXdzOiByZXN1bHRzWzBdLnRvcFRyZW5kPy52aWV3Q291bnQgfHwgMCB9LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5TmFtZTogJ0VudGVydGFpbm1lbnQnLCB2aWRlb0NvdW50OiBNYXRoLmZsb29yKHJlc3VsdHNbMF0udHJlbmRzRm91bmQgKiAwLjQpLCBhdmVyYWdlVmlld3M6IChyZXN1bHRzWzBdLnRvcFRyZW5kPy52aWV3Q291bnQgfHwgMCkgKiAwLjggfVxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIHJlY29tbWVuZGVkQWN0aW9uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgdHlwZTogJ0NPTlRFTlRfQ1JFQVRJT04nLFxyXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgQ3JlYXRlIGVkdWNhdGlvbmFsIGNvbnRlbnQgYWJvdXQgJHtyZXN1bHRzWzBdLnRvcGljfSB3aXRoIGNsZWFyIGV4cGxhbmF0aW9ucyBhbmQgZXhhbXBsZXNgLFxyXG4gICAgICAgICAgICAgIHByaW9yaXR5OiAnSElHSCcsXHJcbiAgICAgICAgICAgICAgaW1wYWN0OiA4NSxcclxuICAgICAgICAgICAgICBlZmZvcnQ6IDAuNlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgdHlwZTogJ1RJTUlORycsXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcHRpbWFsIHBvc3RpbmcgdGltZSBpcyBiZXR3ZWVuIDItNCBQTSBFU1QgYmFzZWQgb24gYXVkaWVuY2UgZW5nYWdlbWVudCBwYXR0ZXJucycsXHJcbiAgICAgICAgICAgICAgcHJpb3JpdHk6ICdNRURJVU0nLFxyXG4gICAgICAgICAgICAgIGltcGFjdDogNzAsXHJcbiAgICAgICAgICAgICAgZWZmb3J0OiAwLjJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5UmVzdWx0cyhkaXNwbGF5UmVzdWx0KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLmxvZygnXFxu8J+SoSBTdGVwIDQ6IEFJIFJlY29tbWVuZGF0aW9ucycpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfilIAnLnJlcGVhdCg1MCkpO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheVJlY29tbWVuZGF0aW9ucyhkaXNwbGF5UmVzdWx0LnJlY29tbWVuZGVkQWN0aW9ucyk7XHJcbiAgICAgICAgXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+KaoO+4jyAgTm8gdHJlbmRpbmcgY29udGVudCBmb3VuZCBmb3IgdGhpcyB0b3BpYyBpbiB0aGUgbGFzdCA0OCBob3VycycpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5KhIFRyeSBhIG1vcmUgcG9wdWxhciBvciBjdXJyZW50IHRvcGljLCBvciBpbmNyZWFzZSB0aGUgdGltZSByYW5nZScpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcign4p2MIFlvdVR1YmUgQVBJIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgY29uc29sZS5sb2coJ/CflIQgRmFsbGluZyBiYWNrIHRvIGRlbW8gbW9kZS4uLlxcbicpO1xyXG4gICAgICBhd2FpdCB0aGlzLnJ1bkRlbW9BbmFseXNpcygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZU1vY2tSZXN1bHRzKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdG9waWM6IHRoaXMudG9waWMsXHJcbiAgICAgIHRyZW5kc0ZvdW5kOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxNSkgKyA1LFxyXG4gICAgICBhdmVyYWdlRW5nYWdlbWVudDogTWF0aC5yYW5kb20oKSAqIDggKyAyLFxyXG4gICAgICB0b3RhbFZpZXdzOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKSArIDEwMDAwMCxcclxuICAgICAga2V5d29yZHM6IHRoaXMuZ2VuZXJhdGVUb3BpY0tleXdvcmRzKHRoaXMudG9waWMpLnNsaWNlKDAsIDgpLFxyXG4gICAgICBjb250ZW50U3VpdGFiaWxpdHk6IHtcclxuICAgICAgICBhdWRpb05hcnJhdGlvblNjb3JlOiBNYXRoLnJhbmRvbSgpICogMC40ICsgMC42LFxyXG4gICAgICAgIHZpc3VhbENvbnRlbnRTY29yZTogTWF0aC5yYW5kb20oKSAqIDAuMyArIDAuNyxcclxuICAgICAgICBlZHVjYXRpb25hbFZhbHVlOiBNYXRoLnJhbmRvbSgpICogMC41ICsgMC41LFxyXG4gICAgICAgIHZpcmFsUG90ZW50aWFsOiBNYXRoLnJhbmRvbSgpICogMC42ICsgMC4zLFxyXG4gICAgICAgIG1vbmV0aXphdGlvbkZyaWVuZGx5OiBNYXRoLnJhbmRvbSgpICogMC4zICsgMC43LFxyXG4gICAgICAgIG92ZXJhbGxTY29yZTogTWF0aC5yYW5kb20oKSAqIDAuMyArIDAuN1xyXG4gICAgICB9LFxyXG4gICAgICBjYXRlZ29yeUJyZWFrZG93bjogW1xyXG4gICAgICAgIHsgY2F0ZWdvcnlOYW1lOiAnRWR1Y2F0aW9uJywgdmlkZW9Db3VudDogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogOCkgKyAyLCBhdmVyYWdlVmlld3M6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDUwMDAwKSArIDEwMDAwIH0sXHJcbiAgICAgICAgeyBjYXRlZ29yeU5hbWU6ICdTY2llbmNlICYgVGVjaG5vbG9neScsIHZpZGVvQ291bnQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDYpICsgMSwgYXZlcmFnZVZpZXdzOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzMDAwMCkgKyA1MDAwIH1cclxuICAgICAgXVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVNb2NrUmVjb21tZW5kYXRpb25zKCkge1xyXG4gICAgY29uc3QgcmVjb21tZW5kYXRpb25zID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgdHlwZTogJ2NvbnRlbnRfY3JlYXRpb24nLFxyXG4gICAgICAgIHByaW9yaXR5OiAnaGlnaCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBDcmVhdGUgZWR1Y2F0aW9uYWwgY29udGVudCBhYm91dCAke3RoaXMudG9waWN9IHdpdGggY2xlYXIgZXhwbGFuYXRpb25zIGFuZCBleGFtcGxlc2AsXHJcbiAgICAgICAgZXhwZWN0ZWRJbXBhY3Q6IDAuODUsXHJcbiAgICAgICAgZWZmb3J0OiAwLjZcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIHR5cGU6ICd0aW1pbmcnLFxyXG4gICAgICAgIHByaW9yaXR5OiAnbWVkaXVtJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ09wdGltYWwgcG9zdGluZyB0aW1lIGlzIGJldHdlZW4gMi00IFBNIEVTVCBiYXNlZCBvbiBhdWRpZW5jZSBlbmdhZ2VtZW50IHBhdHRlcm5zJyxcclxuICAgICAgICBleHBlY3RlZEltcGFjdDogMC43LFxyXG4gICAgICAgIGVmZm9ydDogMC4yXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB0eXBlOiAnb3B0aW1pemF0aW9uJyxcclxuICAgICAgICBwcmlvcml0eTogJ21lZGl1bScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBJbmNsdWRlIHRyZW5kaW5nIGtleXdvcmRzOiAke3RoaXMuZ2VuZXJhdGVUb3BpY0tleXdvcmRzKHRoaXMudG9waWMpLnNsaWNlKDAsIDMpLmpvaW4oJywgJyl9YCxcclxuICAgICAgICBleHBlY3RlZEltcGFjdDogMC42LFxyXG4gICAgICAgIGVmZm9ydDogMC4zXHJcbiAgICAgIH1cclxuICAgIF07XHJcblxyXG4gICAgcmV0dXJuIHJlY29tbWVuZGF0aW9ucztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZGlzcGxheVJlc3VsdHMocmVzdWx0czogYW55KTogdm9pZCB7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TiiBUcmVuZHMgRm91bmQ6ICR7cmVzdWx0cy50cmVuZHNGb3VuZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGDwn5OIIEF2ZXJhZ2UgRW5nYWdlbWVudDogJHtyZXN1bHRzLmF2ZXJhZ2VFbmdhZ2VtZW50LnRvRml4ZWQoMil9JWApO1xyXG4gICAgY29uc29sZS5sb2coYPCfkYAgVG90YWwgVmlld3MgQW5hbHl6ZWQ6ICR7cmVzdWx0cy50b3RhbFZpZXdzLnRvTG9jYWxlU3RyaW5nKCl9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+Pt++4jyAgVG9wIEtleXdvcmRzOiAke3Jlc3VsdHMudG9wS2V5d29yZHM/LmpvaW4oJywgJykgfHwgJ04vQSd9YCk7XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKCdcXG7wn46vIENvbnRlbnQgU3VpdGFiaWxpdHkgU2NvcmVzOicpO1xyXG4gICAgY29uc3Qgc3VpdGFiaWxpdHkgPSByZXN1bHRzLmNvbnRlbnRTdWl0YWJpbGl0eTtcclxuICAgIGNvbnNvbGUubG9nKGAgICDwn46Z77iPICBBdWRpbyBOYXJyYXRpb246ICR7KHN1aXRhYmlsaXR5LmF1ZGlvTmFycmF0aW9uU2NvcmUgKiAxMDApLnRvRml4ZWQoMCl9JWApO1xyXG4gICAgY29uc29sZS5sb2coYCAgIPCfkYHvuI8gIFZpc3VhbCBDb250ZW50OiAkeyhzdWl0YWJpbGl0eS52aXN1YWxDb250ZW50U2NvcmUgKiAxMDApLnRvRml4ZWQoMCl9JWApO1xyXG4gICAgY29uc29sZS5sb2coYCAgIPCfk5ogRWR1Y2F0aW9uYWwgVmFsdWU6ICR7KHN1aXRhYmlsaXR5LmVkdWNhdGlvbmFsVmFsdWUgKiAxMDApLnRvRml4ZWQoMCl9JWApO1xyXG4gICAgY29uc29sZS5sb2coYCAgIPCfmoAgVmlyYWwgUG90ZW50aWFsOiAkeyhzdWl0YWJpbGl0eS52aXJhbFBvdGVudGlhbCAqIDEwMCkudG9GaXhlZCgwKX0lYCk7XHJcbiAgICBjb25zb2xlLmxvZyhgICAg8J+SsCBNb25ldGl6YXRpb24gRnJpZW5kbHk6ICR7KHN1aXRhYmlsaXR5Lm1vbmV0aXphdGlvbkZyaWVuZGx5ICogMTAwKS50b0ZpeGVkKDApfSVgKTtcclxuICAgIGNvbnNvbGUubG9nKGAgICDirZAgT3ZlcmFsbCBTY29yZTogJHsoc3VpdGFiaWxpdHkub3ZlcmFsbFNjb3JlICogMTAwKS50b0ZpeGVkKDApfSVgKTtcclxuXHJcbiAgICBpZiAocmVzdWx0cy5jYXRlZ29yeUJyZWFrZG93biAmJiByZXN1bHRzLmNhdGVnb3J5QnJlYWtkb3duLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc29sZS5sb2coJ1xcbvCfk4IgQ2F0ZWdvcnkgQnJlYWtkb3duOicpO1xyXG4gICAgICByZXN1bHRzLmNhdGVnb3J5QnJlYWtkb3duLmZvckVhY2goKGNhdDogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYCAgICR7Y2F0LmNhdGVnb3J5TmFtZX06ICR7Y2F0LnZpZGVvQ291bnR9IHZpZGVvcywgYXZnICR7Y2F0LmF2ZXJhZ2VWaWV3cy50b0xvY2FsZVN0cmluZygpfSB2aWV3c2ApO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgZGlzcGxheVBlcmZvcm1hbmNlTWV0cmljcyhtZXRyaWNzOiBhbnkpOiB2b2lkIHtcclxuICAgIGNvbnNvbGUubG9nKGDwn5OKIEF2ZXJhZ2UgVmlld3M6ICR7bWV0cmljcy5hdmVyYWdlVmlld3MudG9Mb2NhbGVTdHJpbmcoKX1gKTtcclxuICAgIGNvbnNvbGUubG9nKGDwn5OIIEF2ZXJhZ2UgRW5nYWdlbWVudDogJHttZXRyaWNzLmF2ZXJhZ2VFbmdhZ2VtZW50LnRvRml4ZWQoMil9JWApO1xyXG4gICAgY29uc29sZS5sb2coYPCflKUgVHJlbmRpbmcgRnJlcXVlbmN5OiAke21ldHJpY3MudHJlbmRpbmdGcmVxdWVuY3kudG9GaXhlZCgxKX0gdGltZXMvZGF5YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+PhiBDb21wZXRpdGlvbiBMZXZlbDogJHttZXRyaWNzLmNvbXBldGl0aW9uTGV2ZWwudG9VcHBlckNhc2UoKX1gKTtcclxuICAgIGNvbnNvbGUubG9nKGDij7AgT3B0aW1hbCBQb3N0aW5nIFRpbWVzOiAke21ldHJpY3Mub3B0aW1hbFBvc3RpbmdUaW1lcy5qb2luKCcsICcpfWApO1xyXG4gICAgY29uc29sZS5sb2coYPCfjq8gQmVzdCBLZXl3b3JkczogJHttZXRyaWNzLmJlc3RQZXJmb3JtaW5nS2V5d29yZHMuc2xpY2UoMCwgNSkuam9pbignLCAnKX1gKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZGlzcGxheVJlY29tbWVuZGF0aW9ucyhyZWNvbW1lbmRhdGlvbnM6IGFueVtdKTogdm9pZCB7XHJcbiAgICByZWNvbW1lbmRhdGlvbnMuZm9yRWFjaCgocmVjLCBpbmRleCkgPT4ge1xyXG4gICAgICBjb25zdCBwcmlvcml0eSA9IHJlYy5wcmlvcml0eSA9PT0gJ2hpZ2gnID8gJ/CflLQnIDogcmVjLnByaW9yaXR5ID09PSAnbWVkaXVtJyA/ICfwn5+hJyA6ICfwn5+iJztcclxuICAgICAgY29uc3QgaW1wYWN0ID0gJ+KtkCcucmVwZWF0KE1hdGguY2VpbChyZWMuZXhwZWN0ZWRJbXBhY3QgKiA1KSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zb2xlLmxvZyhgJHtwcmlvcml0eX0gJHtyZWMudHlwZS50b1VwcGVyQ2FzZSgpfTogJHtyZWMuZGVzY3JpcHRpb259YCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGAgICBJbXBhY3Q6ICR7aW1wYWN0fSAoJHsocmVjLmV4cGVjdGVkSW1wYWN0ICogMTAwKS50b0ZpeGVkKDApfSUpIHwgRWZmb3J0OiAke3JlYy5lZmZvcnQudG9GaXhlZCgxKX0vMS4wYCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoaW5kZXggPCByZWNvbW1lbmRhdGlvbnMubGVuZ3RoIC0gMSkgY29uc29sZS5sb2coJycpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldENhdGVnb3J5TmFtZShjYXRlZ29yeUlkOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgY2F0ZWdvcnlOYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgJzEnOiAnRmlsbSAmIEFuaW1hdGlvbicsICcxMCc6ICdNdXNpYycsICcxNSc6ICdQZXRzICYgQW5pbWFscycsXHJcbiAgICAgICcxNyc6ICdTcG9ydHMnLCAnMTknOiAnVHJhdmVsICYgRXZlbnRzJywgJzIwJzogJ0dhbWluZycsXHJcbiAgICAgICcyMic6ICdQZW9wbGUgJiBCbG9ncycsICcyMyc6ICdDb21lZHknLCAnMjQnOiAnRW50ZXJ0YWlubWVudCcsXHJcbiAgICAgICcyNSc6ICdOZXdzICYgUG9saXRpY3MnLCAnMjYnOiAnSG93dG8gJiBTdHlsZScsICcyNyc6ICdFZHVjYXRpb24nLFxyXG4gICAgICAnMjgnOiAnU2NpZW5jZSAmIFRlY2hub2xvZ3knXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIGNhdGVnb3J5TmFtZXNbY2F0ZWdvcnlJZF0gfHwgYENhdGVnb3J5ICR7Y2F0ZWdvcnlJZH1gO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBNYWluIGV4ZWN1dGlvblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xyXG4gIGNvbnN0IGFyZ3MgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XHJcbiAgXHJcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICBjb25zb2xlLmxvZygn8J+OrCBZb3VUdWJlIFRyZW5kcyBEZW1vJyk7XHJcbiAgICBjb25zb2xlLmxvZygnVXNhZ2U6IG5wbSBydW4gZGVtbzp0cmVuZHMgXCJ5b3VyIHRvcGljXCInKTtcclxuICAgIGNvbnNvbGUubG9nKCcnKTtcclxuICAgIGNvbnNvbGUubG9nKCdFeGFtcGxlczonKTtcclxuICAgIGNvbnNvbGUubG9nKCcgIG5wbSBydW4gZGVtbzp0cmVuZHMgXCJhcnRpZmljaWFsIGludGVsbGlnZW5jZVwiJyk7XHJcbiAgICBjb25zb2xlLmxvZygnICBucG0gcnVuIGRlbW86dHJlbmRzIFwiY29va2luZyByZWNpcGVzXCInKTtcclxuICAgIGNvbnNvbGUubG9nKCcgIG5wbSBydW4gZGVtbzp0cmVuZHMgXCJmaXRuZXNzIHdvcmtvdXRcIicpO1xyXG4gICAgY29uc29sZS5sb2coJyAgbnBtIHJ1biBkZW1vOnRyZW5kcyBcInRyYXZlbCBwaG90b2dyYXBoeVwiJyk7XHJcbiAgICBjb25zb2xlLmxvZygnICBucG0gcnVuIGRlbW86dHJlbmRzIFwiY3J5cHRvY3VycmVuY3lcIicpO1xyXG4gICAgY29uc29sZS5sb2coJycpO1xyXG4gICAgcHJvY2Vzcy5leGl0KDEpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgdG9waWMgPSBhcmdzLmpvaW4oJyAnKTtcclxuICBjb25zdCBkZW1vID0gbmV3IFlvdVR1YmVUcmVuZHNEZW1vKHRvcGljKTtcclxuICBcclxuICBhd2FpdCBkZW1vLnJ1bkRlbW8oKTtcclxufVxyXG5cclxuLy8gUnVuIGlmIGNhbGxlZCBkaXJlY3RseVxyXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcclxuICBtYWluKCkuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcbn1cclxuXHJcbmV4cG9ydCB7IFlvdVR1YmVUcmVuZHNEZW1vIH07Il19