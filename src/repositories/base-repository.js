"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class BaseRepository {
    constructor(tableName, config = {}) {
        const dynamoClient = new client_dynamodb_1.DynamoDBClient({
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            endpoint: config.endpoint,
            maxAttempts: config.maxRetries || 3
        });
        this.client = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient, {
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
    async executeWithRetry(operation, maxRetries = 3, baseDelay = 100) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
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
        throw lastError;
    }
    isNonRetryableError(error) {
        const nonRetryableErrors = [
            'ValidationException',
            'ConditionalCheckFailedException',
            'ItemCollectionSizeLimitExceededException',
            'ResourceNotFoundException'
        ];
        return nonRetryableErrors.includes(error.name);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async get(input) {
        return this.executeWithRetry(async () => {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                ...input
            });
            const result = await this.client.send(command);
            return result.Item;
        });
    }
    async put(input) {
        return this.executeWithRetry(async () => {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                ...input
            });
            await this.client.send(command);
        });
    }
    async update(input) {
        return this.executeWithRetry(async () => {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                ...input
            });
            const result = await this.client.send(command);
            return result.Attributes;
        });
    }
    async delete(input) {
        return this.executeWithRetry(async () => {
            const command = new lib_dynamodb_1.DeleteCommand({
                TableName: this.tableName,
                ...input
            });
            const result = await this.client.send(command);
            return result.Attributes;
        });
    }
    async query(input) {
        return this.executeWithRetry(async () => {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                ...input
            });
            const result = await this.client.send(command);
            return result.Items || [];
        });
    }
    async scan(input = {}) {
        return this.executeWithRetry(async () => {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                ...input
            });
            const result = await this.client.send(command);
            return result.Items || [];
        });
    }
    async queryWithPagination(input, limit) {
        const items = [];
        let lastEvaluatedKey = undefined;
        let totalItems = 0;
        do {
            const command = new lib_dynamodb_1.QueryCommand({
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
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1yZXBvc2l0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmFzZS1yZXBvc2l0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUEwRDtBQUMxRCx3REFjK0I7QUFRL0IsTUFBYSxjQUFjO0lBSXpCLFlBQVksU0FBaUIsRUFBRSxTQUEyQixFQUFFO1FBQzFELE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQztZQUN0QyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1lBQzlELFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtZQUN6QixXQUFXLEVBQUUsTUFBTSxDQUFDLFVBQVUsSUFBSSxDQUFDO1NBQ3BDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN0RCxlQUFlLEVBQUU7Z0JBQ2Ysa0JBQWtCLEVBQUUsS0FBSztnQkFDekIscUJBQXFCLEVBQUUsSUFBSTtnQkFDM0IseUJBQXlCLEVBQUUsS0FBSzthQUNqQztZQUNELGlCQUFpQixFQUFFO2dCQUNqQixXQUFXLEVBQUUsS0FBSzthQUNuQjtTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzdCLENBQUM7SUFFUyxLQUFLLENBQUMsZ0JBQWdCLENBQzlCLFNBQTJCLEVBQzNCLGFBQXFCLENBQUMsRUFDdEIsWUFBb0IsR0FBRztRQUV2QixJQUFJLFNBQWdCLENBQUM7UUFFckIsS0FBSyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxJQUFJLFVBQVUsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUN0RCxJQUFJO2dCQUNGLE9BQU8sTUFBTSxTQUFTLEVBQUUsQ0FBQzthQUMxQjtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNkLFNBQVMsR0FBRyxLQUFjLENBQUM7Z0JB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QUksQ0FBQyxTQUFTO2dCQUN6QixHQUFHLEtBQUs7Z0JBQ1IsaUJBQWlCLEVBQUUsZ0JBQWdCO2FBQ3BDLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0MsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUNoQixLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM1QixVQUFVLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7YUFDbkM7WUFFRCxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7WUFFM0MsbUNBQW1DO1lBQ25DLElBQUksS0FBSyxJQUFJLFVBQVUsSUFBSSxLQUFLLEVBQUU7Z0JBQ2hDLE1BQU07YUFDUDtTQUNGLFFBQVEsZ0JBQWdCLEVBQUU7UUFFM0IsT0FBTztZQUNMLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQzVDLGdCQUFnQjtTQUNqQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBakxELHdDQWlMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgXHJcbiAgRHluYW1vREJEb2N1bWVudENsaWVudCwgXHJcbiAgR2V0Q29tbWFuZCwgXHJcbiAgUHV0Q29tbWFuZCwgXHJcbiAgVXBkYXRlQ29tbWFuZCwgXHJcbiAgRGVsZXRlQ29tbWFuZCwgXHJcbiAgUXVlcnlDb21tYW5kLCBcclxuICBTY2FuQ29tbWFuZCxcclxuICBHZXRDb21tYW5kSW5wdXQsXHJcbiAgUHV0Q29tbWFuZElucHV0LFxyXG4gIFVwZGF0ZUNvbW1hbmRJbnB1dCxcclxuICBEZWxldGVDb21tYW5kSW5wdXQsXHJcbiAgUXVlcnlDb21tYW5kSW5wdXQsXHJcbiAgU2NhbkNvbW1hbmRJbnB1dFxyXG59IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlcG9zaXRvcnlDb25maWcge1xyXG4gIHJlZ2lvbj86IHN0cmluZztcclxuICBlbmRwb2ludD86IHN0cmluZztcclxuICBtYXhSZXRyaWVzPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQmFzZVJlcG9zaXRvcnkge1xyXG4gIHByb3RlY3RlZCBjbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XHJcbiAgcHJvdGVjdGVkIHRhYmxlTmFtZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3Rvcih0YWJsZU5hbWU6IHN0cmluZywgY29uZmlnOiBSZXBvc2l0b3J5Q29uZmlnID0ge30pIHtcclxuICAgIGNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogY29uZmlnLnJlZ2lvbiB8fCBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgICBlbmRwb2ludDogY29uZmlnLmVuZHBvaW50LFxyXG4gICAgICBtYXhBdHRlbXB0czogY29uZmlnLm1heFJldHJpZXMgfHwgM1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vQ2xpZW50LCB7XHJcbiAgICAgIG1hcnNoYWxsT3B0aW9uczoge1xyXG4gICAgICAgIGNvbnZlcnRFbXB0eVZhbHVlczogZmFsc2UsXHJcbiAgICAgICAgcmVtb3ZlVW5kZWZpbmVkVmFsdWVzOiB0cnVlLFxyXG4gICAgICAgIGNvbnZlcnRDbGFzc0luc3RhbmNlVG9NYXA6IGZhbHNlXHJcbiAgICAgIH0sXHJcbiAgICAgIHVubWFyc2hhbGxPcHRpb25zOiB7XHJcbiAgICAgICAgd3JhcE51bWJlcnM6IGZhbHNlXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMudGFibGVOYW1lID0gdGFibGVOYW1lO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGFzeW5jIGV4ZWN1dGVXaXRoUmV0cnk8VD4oXHJcbiAgICBvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBtYXhSZXRyaWVzOiBudW1iZXIgPSAzLFxyXG4gICAgYmFzZURlbGF5OiBudW1iZXIgPSAxMDBcclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIGxldCBsYXN0RXJyb3I6IEVycm9yO1xyXG5cclxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IG1heFJldHJpZXM7IGF0dGVtcHQrKykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCBvcGVyYXRpb24oKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBsYXN0RXJyb3IgPSBlcnJvciBhcyBFcnJvcjtcclxuICAgICAgICBcclxuICAgICAgICAvLyBEb24ndCByZXRyeSBvbiBjZXJ0YWluIGVycm9yc1xyXG4gICAgICAgIGlmICh0aGlzLmlzTm9uUmV0cnlhYmxlRXJyb3IoZXJyb3IpKSB7XHJcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhdHRlbXB0ID09PSBtYXhSZXRyaWVzKSB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4cG9uZW50aWFsIGJhY2tvZmYgd2l0aCBqaXR0ZXJcclxuICAgICAgICBjb25zdCBkZWxheSA9IGJhc2VEZWxheSAqIE1hdGgucG93KDIsIGF0dGVtcHQpICsgTWF0aC5yYW5kb20oKSAqIDEwMDtcclxuICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKGRlbGF5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRocm93IGxhc3RFcnJvciE7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGlzTm9uUmV0cnlhYmxlRXJyb3IoZXJyb3I6IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3Qgbm9uUmV0cnlhYmxlRXJyb3JzID0gW1xyXG4gICAgICAnVmFsaWRhdGlvbkV4Y2VwdGlvbicsXHJcbiAgICAgICdDb25kaXRpb25hbENoZWNrRmFpbGVkRXhjZXB0aW9uJyxcclxuICAgICAgJ0l0ZW1Db2xsZWN0aW9uU2l6ZUxpbWl0RXhjZWVkZWRFeGNlcHRpb24nLFxyXG4gICAgICAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbidcclxuICAgIF07XHJcblxyXG4gICAgcmV0dXJuIG5vblJldHJ5YWJsZUVycm9ycy5pbmNsdWRlcyhlcnJvci5uYW1lKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGFzeW5jIGdldChpbnB1dDogT21pdDxHZXRDb21tYW5kSW5wdXQsICdUYWJsZU5hbWUnPik6IFByb21pc2U8YW55PiB7XHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIC4uLmlucHV0XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgYXN5bmMgcHV0KGlucHV0OiBPbWl0PFB1dENvbW1hbmRJbnB1dCwgJ1RhYmxlTmFtZSc+KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIC4uLmlucHV0XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgYXdhaXQgdGhpcy5jbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGFzeW5jIHVwZGF0ZShpbnB1dDogT21pdDxVcGRhdGVDb21tYW5kSW5wdXQsICdUYWJsZU5hbWUnPik6IFByb21pc2U8YW55PiB7XHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIC4uLmlucHV0XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5BdHRyaWJ1dGVzO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgYXN5bmMgZGVsZXRlKGlucHV0OiBPbWl0PERlbGV0ZUNvbW1hbmRJbnB1dCwgJ1RhYmxlTmFtZSc+KTogUHJvbWlzZTxhbnk+IHtcclxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IERlbGV0ZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgLi4uaW5wdXRcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICByZXR1cm4gcmVzdWx0LkF0dHJpYnV0ZXM7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBhc3luYyBxdWVyeShpbnB1dDogT21pdDxRdWVyeUNvbW1hbmRJbnB1dCwgJ1RhYmxlTmFtZSc+KTogUHJvbWlzZTxhbnlbXT4ge1xyXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVdpdGhSZXRyeShhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIC4uLmlucHV0XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtcyB8fCBbXTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGFzeW5jIHNjYW4oaW5wdXQ6IE9taXQ8U2NhbkNvbW1hbmRJbnB1dCwgJ1RhYmxlTmFtZSc+ID0ge30pOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICAuLi5pbnB1dFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbXMgfHwgW107XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBhc3luYyBxdWVyeVdpdGhQYWdpbmF0aW9uKFxyXG4gICAgaW5wdXQ6IE9taXQ8UXVlcnlDb21tYW5kSW5wdXQsICdUYWJsZU5hbWUnPixcclxuICAgIGxpbWl0PzogbnVtYmVyXHJcbiAgKTogUHJvbWlzZTx7IGl0ZW1zOiBhbnlbXTsgbGFzdEV2YWx1YXRlZEtleT86IGFueSB9PiB7XHJcbiAgICBjb25zdCBpdGVtczogYW55W10gPSBbXTtcclxuICAgIGxldCBsYXN0RXZhbHVhdGVkS2V5OiBhbnkgPSB1bmRlZmluZWQ7XHJcbiAgICBsZXQgdG90YWxJdGVtcyA9IDA7XHJcblxyXG4gICAgZG8ge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICAuLi5pbnB1dCxcclxuICAgICAgICBFeGNsdXNpdmVTdGFydEtleTogbGFzdEV2YWx1YXRlZEtleVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAocmVzdWx0Lkl0ZW1zKSB7XHJcbiAgICAgICAgaXRlbXMucHVzaCguLi5yZXN1bHQuSXRlbXMpO1xyXG4gICAgICAgIHRvdGFsSXRlbXMgKz0gcmVzdWx0Lkl0ZW1zLmxlbmd0aDtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGFzdEV2YWx1YXRlZEtleSA9IHJlc3VsdC5MYXN0RXZhbHVhdGVkS2V5O1xyXG5cclxuICAgICAgLy8gQnJlYWsgaWYgd2UndmUgcmVhY2hlZCB0aGUgbGltaXRcclxuICAgICAgaWYgKGxpbWl0ICYmIHRvdGFsSXRlbXMgPj0gbGltaXQpIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfSB3aGlsZSAobGFzdEV2YWx1YXRlZEtleSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaXRlbXM6IGxpbWl0ID8gaXRlbXMuc2xpY2UoMCwgbGltaXQpIDogaXRlbXMsXHJcbiAgICAgIGxhc3RFdmFsdWF0ZWRLZXlcclxuICAgIH07XHJcbiAgfVxyXG59Il19