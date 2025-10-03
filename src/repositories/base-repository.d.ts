import { DynamoDBDocumentClient, GetCommandInput, PutCommandInput, UpdateCommandInput, DeleteCommandInput, QueryCommandInput, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
export interface RepositoryConfig {
    region?: string;
    endpoint?: string;
    maxRetries?: number;
}
export declare class BaseRepository {
    protected client: DynamoDBDocumentClient;
    protected tableName: string;
    constructor(tableName: string, config?: RepositoryConfig);
    protected executeWithRetry<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
    private isNonRetryableError;
    private sleep;
    protected get(input: Omit<GetCommandInput, 'TableName'>): Promise<any>;
    protected put(input: Omit<PutCommandInput, 'TableName'>): Promise<void>;
    protected update(input: Omit<UpdateCommandInput, 'TableName'>): Promise<any>;
    protected delete(input: Omit<DeleteCommandInput, 'TableName'>): Promise<any>;
    protected query(input: Omit<QueryCommandInput, 'TableName'>): Promise<any[]>;
    protected scan(input?: Omit<ScanCommandInput, 'TableName'>): Promise<any[]>;
    protected queryWithPagination(input: Omit<QueryCommandInput, 'TableName'>, limit?: number): Promise<{
        items: any[];
        lastEvaluatedKey?: any;
    }>;
}
