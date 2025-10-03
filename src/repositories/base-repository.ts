import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput
} from '@aws-sdk/lib-dynamodb';

export interface RepositoryConfig {
  region?: string;
  endpoint?: string;
  maxRetries?: number;
}

export class BaseRepository {
  protected client: DynamoDBDocumentClient;
  protected tableName: string;

  constructor(tableName: string, config: RepositoryConfig = {}) {
    const dynamoClient = new DynamoDBClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      endpoint: config.endpoint,
      maxAttempts: config.maxRetries || 3
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false
      },
      unmarshallOptions: {
        wrapNumbers: false
      }
    });

    this.tableName = tableName;
  }

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 100
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isNonRetryableError(error: any): boolean {
    const nonRetryableErrors = [
      'ValidationException',
      'ConditionalCheckFailedException',
      'ItemCollectionSizeLimitExceededException',
      'ResourceNotFoundException'
    ];

    return nonRetryableErrors.includes(error.name);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async get(input: Omit<GetCommandInput, 'TableName'>): Promise<any> {
    return this.executeWithRetry(async () => {
      const command = new GetCommand({
        TableName: this.tableName,
        ...input
      });
      
      const result = await this.client.send(command);
      return result.Item;
    });
  }

  protected async put(input: Omit<PutCommandInput, 'TableName'>): Promise<void> {
    return this.executeWithRetry(async () => {
      const command = new PutCommand({
        TableName: this.tableName,
        ...input
      });
      
      await this.client.send(command);
    });
  }

  protected async update(input: Omit<UpdateCommandInput, 'TableName'>): Promise<any> {
    return this.executeWithRetry(async () => {
      const command = new UpdateCommand({
        TableName: this.tableName,
        ...input
      });
      
      const result = await this.client.send(command);
      return result.Attributes;
    });
  }

  protected async delete(input: Omit<DeleteCommandInput, 'TableName'>): Promise<any> {
    return this.executeWithRetry(async () => {
      const command = new DeleteCommand({
        TableName: this.tableName,
        ...input
      });
      
      const result = await this.client.send(command);
      return result.Attributes;
    });
  }

  protected async query(input: Omit<QueryCommandInput, 'TableName'>): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const command = new QueryCommand({
        TableName: this.tableName,
        ...input
      });
      
      const result = await this.client.send(command);
      return result.Items || [];
    });
  }

  protected async scan(input: Omit<ScanCommandInput, 'TableName'> = {}): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const command = new ScanCommand({
        TableName: this.tableName,
        ...input
      });
      
      const result = await this.client.send(command);
      return result.Items || [];
    });
  }

  protected async queryWithPagination(
    input: Omit<QueryCommandInput, 'TableName'>,
    limit?: number
  ): Promise<{ items: any[]; lastEvaluatedKey?: any }> {
    const items: any[] = [];
    let lastEvaluatedKey: any = undefined;
    let totalItems = 0;

    do {
      const command = new QueryCommand({
        TableName: this.tableName,
        ...input,
        ExclusiveStartKey: lastEvaluatedKey
      });

      const result = await this.client.send(command);
      
      if (result.Items) {
        items.push(...result.Items);
        totalItems += result.Items.length;
      }

      lastEvaluatedKey = result.LastEvaluatedKey;

      // Break if we've reached the limit
      if (limit && totalItems >= limit) {
        break;
      }
    } while (lastEvaluatedKey);

    return {
      items: limit ? items.slice(0, limit) : items,
      lastEvaluatedKey
    };
  }
}