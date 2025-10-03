import { Handler } from 'aws-lambda';
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
export declare const handler: Handler<FallbackContentGeneratorEvent, FallbackContentGeneratorResponse>;
