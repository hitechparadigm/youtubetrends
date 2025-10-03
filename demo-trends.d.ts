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
declare class YouTubeTrendsDemo {
    private trendService;
    private topic;
    constructor(topic: string);
    private getCustomTopicConfig;
    private generateTopicKeywords;
    private generateSearchQueries;
    private suggestCategories;
    runDemo(): Promise<void>;
    private runDemoAnalysis;
    private runLiveAnalysis;
    private generateMockResults;
    private generateMockRecommendations;
    private displayResults;
    private displayPerformanceMetrics;
    private displayRecommendations;
    private getCategoryName;
    private sleep;
}
export { YouTubeTrendsDemo };
