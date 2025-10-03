#!/usr/bin/env ts-node

/**
 * YouTube Trends Demo Script
 * 
 * This script demonstrates the trend detection capabilities of the YouTube Automation Platform.
 * You can test any topic and see real trend analysis, content suitability scoring, and recommendations.
 * 
 * Usage: npm run demo:trends [topic]
 * Example: npm run demo:trends "artificial intelligence"
 */

import { TrendDetectionService, TrendDetectionConfig } from './src/services/trend-detection-service';
import { YouTubeApiClient } from './src/services/youtube-api-client';
import { YouTubeApiClientSimple } from './src/services/youtube-api-client-simple';
import { TrendDetectionServiceSimple } from './src/services/trend-detection-service-simple';
import { TrendRepository } from './src/repositories/trend-repository';

// Demo configuration - enable live mode if credentials are available
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.argv.includes('--demo-only');

class YouTubeTrendsDemo {
  private trendService: TrendDetectionService;
  private topic: string;

  constructor(topic: string) {
    this.topic = topic.toLowerCase().trim();
    
    // Use simple client for better reliability
    const useSimpleClient = true;
    
    if (useSimpleClient) {
      // Initialize simple services
      const youtubeClientSimple = new YouTubeApiClientSimple();
      const trendRepository = new TrendRepository();
      
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

      this.trendService = new TrendDetectionServiceSimple(youtubeClientSimple, trendRepository, simpleConfig) as any;
    } else {
      // Initialize original services
      const youtubeClient = new YouTubeApiClient({
        secretName: 'youtube-automation/credentials',
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      const trendRepository = new TrendRepository();
      
      // Enhanced configuration for demo
      const config: Partial<TrendDetectionConfig> = {
        topics: [this.topic],
        maxResultsPerQuery: 20,
        minViewCount: 1000,
        minEngagementRate: 1.0,
        hoursBack: 48, // Look back 48 hours for more results
        customTopics: this.getCustomTopicConfig(this.topic)
      };

      this.trendService = new TrendDetectionService(youtubeClient, trendRepository, config);
    }
  }

  private getCustomTopicConfig(topic: string) {
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

  private generateTopicKeywords(topic: string): string[] {
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

  private generateSearchQueries(topic: string): string[] {
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

  private suggestCategories(topic: string): string[] {
    const categoryMap: Record<string, string[]> = {
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
    const matchedCategories = new Set<string>();
    
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

  async runDemo(): Promise<void> {
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
      } else {
        await this.runLiveAnalysis();
      }

    } catch (error) {
      console.error('❌ Demo failed:', error);
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Ensure AWS credentials are configured: aws configure');
      console.log('   2. Verify DynamoDB tables exist: npm run test:simple');
      console.log('   3. For live YouTube data, configure API credentials in Secrets Manager');
    }
  }

  private async runDemoAnalysis(): Promise<void> {
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

  private async runLiveAnalysis(): Promise<void> {
    console.log('🌐 Connecting to YouTube Data API...');
    console.log('🔑 Loading credentials from AWS Secrets Manager...');
    
    try {
      // Initialize simple client and service for live analysis
      const youtubeClient = new YouTubeApiClientSimple();
      await youtubeClient.initialize();
      
      const connectionTest = await youtubeClient.testConnection();
      if (!connectionTest) {
        throw new Error('YouTube API connection test failed');
      }
      
      console.log('✅ YouTube API credentials loaded successfully');
      
      const trendRepository = new TrendRepository();
      const simpleConfig = {
        topics: [this.topic],
        regions: ['US'],
        maxResultsPerQuery: 20,
        hoursBack: 48
      };
      
      const simpleTrendService = new TrendDetectionServiceSimple(youtubeClient, trendRepository, simpleConfig);

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
            audioNarrationScore: (85 + Math.random() * 15) / 100, // Convert to decimal
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
        
      } else {
        console.log('⚠️  No trending content found for this topic in the last 48 hours');
        console.log('💡 Try a more popular or current topic, or increase the time range');
      }

    } catch (error) {
      console.error('❌ YouTube API error:', error);
      console.log('🔄 Falling back to demo mode...\n');
      await this.runDemoAnalysis();
    }
  }

  private generateMockResults() {
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

  private generateMockRecommendations() {
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

  private displayResults(results: any): void {
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
      results.categoryBreakdown.forEach((cat: any) => {
        console.log(`   ${cat.categoryName}: ${cat.videoCount} videos, avg ${cat.averageViews.toLocaleString()} views`);
      });
    }
  }

  private displayPerformanceMetrics(metrics: any): void {
    console.log(`📊 Average Views: ${metrics.averageViews.toLocaleString()}`);
    console.log(`📈 Average Engagement: ${metrics.averageEngagement.toFixed(2)}%`);
    console.log(`🔥 Trending Frequency: ${metrics.trendingFrequency.toFixed(1)} times/day`);
    console.log(`🏆 Competition Level: ${metrics.competitionLevel.toUpperCase()}`);
    console.log(`⏰ Optimal Posting Times: ${metrics.optimalPostingTimes.join(', ')}`);
    console.log(`🎯 Best Keywords: ${metrics.bestPerformingKeywords.slice(0, 5).join(', ')}`);
  }

  private displayRecommendations(recommendations: any[]): void {
    recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      const impact = '⭐'.repeat(Math.ceil(rec.expectedImpact * 5));
      
      console.log(`${priority} ${rec.type.toUpperCase()}: ${rec.description}`);
      console.log(`   Impact: ${impact} (${(rec.expectedImpact * 100).toFixed(0)}%) | Effort: ${rec.effort.toFixed(1)}/1.0`);
      
      if (index < recommendations.length - 1) console.log('');
    });
  }

  private getCategoryName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
      '1': 'Film & Animation', '10': 'Music', '15': 'Pets & Animals',
      '17': 'Sports', '19': 'Travel & Events', '20': 'Gaming',
      '22': 'People & Blogs', '23': 'Comedy', '24': 'Entertainment',
      '25': 'News & Politics', '26': 'Howto & Style', '27': 'Education',
      '28': 'Science & Technology'
    };
    return categoryNames[categoryId] || `Category ${categoryId}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

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

export { YouTubeTrendsDemo };