#!/usr/bin/env npx ts-node
/**
 * Production Pipeline Test
 *
 * This script tests the complete YouTube automation pipeline
 * using real AWS services (when deployed) or mock services (for testing)
 */
interface ProductionTestConfig {
    useRealServices: boolean;
    topic: string;
    region: string;
    maxResults: number;
    hoursBack: number;
    stateMachineArn?: string;
}
declare const config: ProductionTestConfig;
declare function testProductionPipeline(): Promise<void>;
export { testProductionPipeline, config };
