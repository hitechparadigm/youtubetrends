import { Handler } from 'aws-lambda';
export interface FallbackTrendProviderEvent {
    topics: string[];
    fallbackStrategy: 'CACHED_TRENDS' | 'POPULAR_KEYWORDS' | 'TEMPLATE_BASED';
    workflowContext: {
        workflowId: string;
        retryCount: number;
        failureCount: number;
    };
}
export interface FallbackTrendProviderResponse {
    success: boolean;
    trendsDetected: number;
    topicsAnalyzed: number;
    results: Array<{
        topic: string;
        trends: any[];
        topTrend: any;
        trendsFound: number;
        averageEngagement: number;
        source: 'CACHED' | 'FALLBACK_KEYWORDS' | 'TEMPLATE';
    }>;
    executionTime: number;
    error?: string;
}
export declare const handler: Handler<FallbackTrendProviderEvent, FallbackTrendProviderResponse>;
