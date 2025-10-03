#!/usr/bin/env ts-node
/**
 * Simple test script to validate deployed infrastructure
 * Tests: DynamoDB connection, data access layer, and basic trend detection
 */
declare function runSimpleTest(): Promise<void>;
export { runSimpleTest };
