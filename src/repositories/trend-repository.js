"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendRepository = void 0;
const base_repository_1 = require("./base-repository");
const trend_data_1 = require("../models/trend-data");
class TrendRepository extends base_repository_1.BaseRepository {
    constructor(config = {}) {
        super(process.env.TREND_ANALYTICS_TABLE_NAME || 'TrendAnalytics', config);
    }
    async saveTrend(trend) {
        const item = trend_data_1.TrendDataModel.toDynamoDbItem(trend);
        await this.put({
            Item: item,
            ConditionExpression: 'attribute_not_exists(#topic) AND attribute_not_exists(#timestamp)',
            ExpressionAttributeNames: {
                '#topic': 'topic',
                '#timestamp': 'timestamp'
            }
        });
    }
    async saveTrends(trends) {
        // DynamoDB batch write - process in chunks of 25 (DynamoDB limit)
        const chunks = this.chunkArray(trends, 25);
        for (const chunk of chunks) {
            const promises = chunk.map(trend => this.saveTrend(trend));
            await Promise.all(promises);
        }
    }
    async getTrendsByTopic(topic, options = {}) {
        let keyConditionExpression = '#topic = :topic';
        const expressionAttributeNames = {
            '#topic': 'topic'
        };
        const expressionAttributeValues = {
            ':topic': topic
        };
        // Add time range filter if provided
        if (options.startTime && options.endTime) {
            keyConditionExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
            expressionAttributeNames['#timestamp'] = 'timestamp';
            expressionAttributeValues[':startTime'] = options.startTime;
            expressionAttributeValues[':endTime'] = options.endTime;
        }
        else if (options.startTime) {
            keyConditionExpression += ' AND #timestamp >= :startTime';
            expressionAttributeNames['#timestamp'] = 'timestamp';
            expressionAttributeValues[':startTime'] = options.startTime;
        }
        let filterExpression;
        if (options.minEngagementScore) {
            filterExpression = 'engagementScore >= :minEngagementScore';
            expressionAttributeValues[':minEngagementScore'] = options.minEngagementScore;
        }
        const items = await this.query({
            KeyConditionExpression: keyConditionExpression,
            FilterExpression: filterExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            Limit: options.limit,
            ScanIndexForward: false // Most recent first
        });
        return items.map(item => trend_data_1.TrendDataModel.fromDynamoDbItem(item));
    }
    async getTopTrendsByEngagement(limit = 10, timeRange) {
        let filterExpression;
        const expressionAttributeValues = {};
        if (timeRange) {
            filterExpression = '#timestamp BETWEEN :startTime AND :endTime';
            expressionAttributeValues[':startTime'] = timeRange.start;
            expressionAttributeValues[':endTime'] = timeRange.end;
        }
        const items = await this.query({
            IndexName: 'EngagementIndex',
            KeyConditionExpression: 'engagementScore > :minScore',
            FilterExpression: filterExpression,
            ExpressionAttributeNames: timeRange ? { '#timestamp': 'timestamp' } : undefined,
            ExpressionAttributeValues: {
                ':minScore': 0,
                ...expressionAttributeValues
            },
            Limit: limit,
            ScanIndexForward: false // Highest engagement first
        });
        return items.map(item => trend_data_1.TrendDataModel.fromDynamoDbItem(item));
    }
    async getTrendAnalysis(topic, timeRange) {
        const trends = await this.getTrendsByTopic(topic, {
            startTime: timeRange?.start,
            endTime: timeRange?.end
        });
        if (trends.length === 0) {
            return {
                trends: [],
                analysisTimestamp: new Date().toISOString(),
                totalTrends: 0,
                topEngagementScore: 0,
                averageEngagementRate: 0
            };
        }
        const totalEngagementRate = trends.reduce((sum, trend) => sum + trend.engagementRate, 0);
        const topEngagementScore = Math.max(...trends.map(trend => trend.engagementScore));
        return {
            trends: trends.slice(0, 50),
            analysisTimestamp: new Date().toISOString(),
            totalTrends: trends.length,
            topEngagementScore,
            averageEngagementRate: totalEngagementRate / trends.length
        };
    }
    async getRecentTrends(hours = 24, limit = 100) {
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const items = await this.scan({
            FilterExpression: '#timestamp >= :startTime',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':startTime': startTime
            },
            Limit: limit
        });
        return items
            .map(item => trend_data_1.TrendDataModel.fromDynamoDbItem(item))
            .sort((a, b) => b.engagementScore - a.engagementScore);
    }
    async deleteTrendsByTopic(topic, olderThanDays = 30) {
        const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
        const items = await this.query({
            KeyConditionExpression: '#topic = :topic AND #timestamp < :cutoffDate',
            ExpressionAttributeNames: {
                '#topic': 'topic',
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':topic': topic,
                ':cutoffDate': cutoffDate
            },
            ProjectionExpression: '#topic, #timestamp'
        });
        let deletedCount = 0;
        for (const item of items) {
            await this.delete({
                Key: {
                    topic: item.topic,
                    timestamp: item.timestamp
                }
            });
            deletedCount++;
        }
        return deletedCount;
    }
    async getTopicStats(topic, days = 7) {
        const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const trends = await this.getTrendsByTopic(topic, { startTime });
        if (trends.length === 0) {
            return {
                totalTrends: 0,
                averageEngagement: 0,
                topVideo: null,
                trendingKeywords: []
            };
        }
        const totalEngagement = trends.reduce((sum, trend) => sum + trend.engagementScore, 0);
        const topVideo = trends.reduce((top, current) => current.engagementScore > top.engagementScore ? current : top);
        // Extract trending keywords
        const keywordCounts = {};
        trends.forEach(trend => {
            trend.keywords.forEach(keyword => {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            });
        });
        const trendingKeywords = Object.entries(keywordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([keyword]) => keyword);
        return {
            totalTrends: trends.length,
            averageEngagement: totalEngagement / trends.length,
            topVideo,
            trendingKeywords
        };
    }
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}
exports.TrendRepository = TrendRepository;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlbmQtcmVwb3NpdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyZW5kLXJlcG9zaXRvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsdURBQXFFO0FBQ3JFLHFEQUFzRjtBQVN0RixNQUFhLGVBQWdCLFNBQVEsZ0NBQWM7SUFDakQsWUFBWSxTQUEyQixFQUFFO1FBQ3ZDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixJQUFJLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQWdCO1FBQzlCLE1BQU0sSUFBSSxHQUFHLDJCQUFjLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRWxELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNiLElBQUksRUFBRSxJQUFJO1lBQ1YsbUJBQW1CLEVBQUUsbUVBQW1FO1lBQ3hGLHdCQUF3QixFQUFFO2dCQUN4QixRQUFRLEVBQUUsT0FBTztnQkFDakIsWUFBWSxFQUFFLFdBQVc7YUFDMUI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFtQjtRQUNsQyxrRUFBa0U7UUFDbEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFM0MsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUMzRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDN0I7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQixDQUNwQixLQUFhLEVBQ2IsVUFBNkIsRUFBRTtRQUUvQixJ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LENBQUMsQ0FBQztTQUM1QztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQXRPRCwwQ0FzT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlUmVwb3NpdG9yeSwgUmVwb3NpdG9yeUNvbmZpZyB9IGZyb20gJy4vYmFzZS1yZXBvc2l0b3J5JztcclxuaW1wb3J0IHsgVHJlbmREYXRhLCBUcmVuZERhdGFNb2RlbCwgVHJlbmRBbmFseXNpc1Jlc3VsdCB9IGZyb20gJy4uL21vZGVscy90cmVuZC1kYXRhJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVHJlbmRRdWVyeU9wdGlvbnMge1xyXG4gIGxpbWl0PzogbnVtYmVyO1xyXG4gIHN0YXJ0VGltZT86IHN0cmluZztcclxuICBlbmRUaW1lPzogc3RyaW5nO1xyXG4gIG1pbkVuZ2FnZW1lbnRTY29yZT86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRyZW5kUmVwb3NpdG9yeSBleHRlbmRzIEJhc2VSZXBvc2l0b3J5IHtcclxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFJlcG9zaXRvcnlDb25maWcgPSB7fSkge1xyXG4gICAgc3VwZXIocHJvY2Vzcy5lbnYuVFJFTkRfQU5BTFlUSUNTX1RBQkxFX05BTUUgfHwgJ1RyZW5kQW5hbHl0aWNzJywgY29uZmlnKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHNhdmVUcmVuZCh0cmVuZDogVHJlbmREYXRhKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBpdGVtID0gVHJlbmREYXRhTW9kZWwudG9EeW5hbW9EYkl0ZW0odHJlbmQpO1xyXG4gICAgXHJcbiAgICBhd2FpdCB0aGlzLnB1dCh7XHJcbiAgICAgIEl0ZW06IGl0ZW0sXHJcbiAgICAgIENvbmRpdGlvbkV4cHJlc3Npb246ICdhdHRyaWJ1dGVfbm90X2V4aXN0cygjdG9waWMpIEFORCBhdHRyaWJ1dGVfbm90X2V4aXN0cygjdGltZXN0YW1wKScsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICcjdG9waWMnOiAndG9waWMnLFxyXG4gICAgICAgICcjdGltZXN0YW1wJzogJ3RpbWVzdGFtcCdcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBzYXZlVHJlbmRzKHRyZW5kczogVHJlbmREYXRhW10pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIC8vIER5bmFtb0RCIGJhdGNoIHdyaXRlIC0gcHJvY2VzcyBpbiBjaHVua3Mgb2YgMjUgKER5bmFtb0RCIGxpbWl0KVxyXG4gICAgY29uc3QgY2h1bmtzID0gdGhpcy5jaHVua0FycmF5KHRyZW5kcywgMjUpO1xyXG4gICAgXHJcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xyXG4gICAgICBjb25zdCBwcm9taXNlcyA9IGNodW5rLm1hcCh0cmVuZCA9PiB0aGlzLnNhdmVUcmVuZCh0cmVuZCkpO1xyXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRUcmVuZHNCeVRvcGljKFxyXG4gICAgdG9waWM6IHN0cmluZywgXHJcbiAgICBvcHRpb25zOiBUcmVuZFF1ZXJ5T3B0aW9ucyA9IHt9XHJcbiAgKTogUHJvbWlzZTxUcmVuZERhdGFbXT4ge1xyXG4gICAgbGV0IGtleUNvbmRpdGlvbkV4cHJlc3Npb24gPSAnI3RvcGljID0gOnRvcGljJztcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgJyN0b3BpYyc6ICd0b3BpYydcclxuICAgIH07XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAnOnRvcGljJzogdG9waWNcclxuICAgIH07XHJcblxyXG4gICAgLy8gQWRkIHRpbWUgcmFuZ2UgZmlsdGVyIGlmIHByb3ZpZGVkXHJcbiAgICBpZiAob3B0aW9ucy5zdGFydFRpbWUgJiYgb3B0aW9ucy5lbmRUaW1lKSB7XHJcbiAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgI3RpbWVzdGFtcCBCRVRXRUVOIDpzdGFydFRpbWUgQU5EIDplbmRUaW1lJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdGltZXN0YW1wJ10gPSAndGltZXN0YW1wJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0VGltZSddID0gb3B0aW9ucy5zdGFydFRpbWU7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplbmRUaW1lJ10gPSBvcHRpb25zLmVuZFRpbWU7XHJcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuc3RhcnRUaW1lKSB7XHJcbiAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgI3RpbWVzdGFtcCA+PSA6c3RhcnRUaW1lJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdGltZXN0YW1wJ10gPSAndGltZXN0YW1wJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0VGltZSddID0gb3B0aW9ucy5zdGFydFRpbWU7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGZpbHRlckV4cHJlc3Npb246IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuICAgIGlmIChvcHRpb25zLm1pbkVuZ2FnZW1lbnRTY29yZSkge1xyXG4gICAgICBmaWx0ZXJFeHByZXNzaW9uID0gJ2VuZ2FnZW1lbnRTY29yZSA+PSA6bWluRW5nYWdlbWVudFNjb3JlJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOm1pbkVuZ2FnZW1lbnRTY29yZSddID0gb3B0aW9ucy5taW5FbmdhZ2VtZW50U2NvcmU7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgaXRlbXMgPSBhd2FpdCB0aGlzLnF1ZXJ5KHtcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjoga2V5Q29uZGl0aW9uRXhwcmVzc2lvbixcclxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogZmlsdGVyRXhwcmVzc2lvbixcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBleHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgIExpbWl0OiBvcHRpb25zLmxpbWl0LFxyXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSAvLyBNb3N0IHJlY2VudCBmaXJzdFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGl0ZW1zLm1hcChpdGVtID0+IFRyZW5kRGF0YU1vZGVsLmZyb21EeW5hbW9EYkl0ZW0oaXRlbSkpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VG9wVHJlbmRzQnlFbmdhZ2VtZW50KFxyXG4gICAgbGltaXQ6IG51bWJlciA9IDEwLFxyXG4gICAgdGltZVJhbmdlPzogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZyB9XHJcbiAgKTogUHJvbWlzZTxUcmVuZERhdGFbXT4ge1xyXG4gICAgbGV0IGZpbHRlckV4cHJlc3Npb246IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcbiAgICBpZiAodGltZVJhbmdlKSB7XHJcbiAgICAgIGZpbHRlckV4cHJlc3Npb24gPSAnI3RpbWVzdGFtcCBCRVRXRUVOIDpzdGFydFRpbWUgQU5EIDplbmRUaW1lJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0VGltZSddID0gdGltZVJhbmdlLnN0YXJ0O1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW5kVGltZSddID0gdGltZVJhbmdlLmVuZDtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHRoaXMucXVlcnkoe1xyXG4gICAgICBJbmRleE5hbWU6ICdFbmdhZ2VtZW50SW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZW5nYWdlbWVudFNjb3JlID4gOm1pblNjb3JlJyxcclxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogZmlsdGVyRXhwcmVzc2lvbixcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB0aW1lUmFuZ2UgPyB7ICcjdGltZXN0YW1wJzogJ3RpbWVzdGFtcCcgfSA6IHVuZGVmaW5lZCxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICc6bWluU2NvcmUnOiAwLFxyXG4gICAgICAgIC4uLmV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNcclxuICAgICAgfSxcclxuICAgICAgTGltaXQ6IGxpbWl0LFxyXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSAvLyBIaWdoZXN0IGVuZ2FnZW1lbnQgZmlyc3RcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBpdGVtcy5tYXAoaXRlbSA9PiBUcmVuZERhdGFNb2RlbC5mcm9tRHluYW1vRGJJdGVtKGl0ZW0pKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFRyZW5kQW5hbHlzaXMoXHJcbiAgICB0b3BpYzogc3RyaW5nLFxyXG4gICAgdGltZVJhbmdlPzogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZyB9XHJcbiAgKTogUHJvbWlzZTxUcmVuZEFuYWx5c2lzUmVzdWx0PiB7XHJcbiAgICBjb25zdCB0cmVuZHMgPSBhd2FpdCB0aGlzLmdldFRyZW5kc0J5VG9waWModG9waWMsIHtcclxuICAgICAgc3RhcnRUaW1lOiB0aW1lUmFuZ2U/LnN0YXJ0LFxyXG4gICAgICBlbmRUaW1lOiB0aW1lUmFuZ2U/LmVuZFxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKHRyZW5kcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0cmVuZHM6IFtdLFxyXG4gICAgICAgIGFuYWx5c2lzVGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgdG90YWxUcmVuZHM6IDAsXHJcbiAgICAgICAgdG9wRW5nYWdlbWVudFNjb3JlOiAwLFxyXG4gICAgICAgIGF2ZXJhZ2VFbmdhZ2VtZW50UmF0ZTogMFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRvdGFsRW5nYWdlbWVudFJhdGUgPSB0cmVuZHMucmVkdWNlKChzdW0sIHRyZW5kKSA9PiBzdW0gKyB0cmVuZC5lbmdhZ2VtZW50UmF0ZSwgMCk7XHJcbiAgICBjb25zdCB0b3BFbmdhZ2VtZW50U2NvcmUgPSBNYXRoLm1heCguLi50cmVuZHMubWFwKHRyZW5kID0+IHRyZW5kLmVuZ2FnZW1lbnRTY29yZSkpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRyZW5kczogdHJlbmRzLnNsaWNlKDAsIDUwKSwgLy8gTGltaXQgdG8gdG9wIDUwIGZvciBhbmFseXNpc1xyXG4gICAgICBhbmFseXNpc1RpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB0b3RhbFRyZW5kczogdHJlbmRzLmxlbmd0aCxcclxuICAgICAgdG9wRW5nYWdlbWVudFNjb3JlLFxyXG4gICAgICBhdmVyYWdlRW5nYWdlbWVudFJhdGU6IHRvdGFsRW5nYWdlbWVudFJhdGUgLyB0cmVuZHMubGVuZ3RoXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0UmVjZW50VHJlbmRzKGhvdXJzOiBudW1iZXIgPSAyNCwgbGltaXQ6IG51bWJlciA9IDEwMCk6IFByb21pc2U8VHJlbmREYXRhW10+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKERhdGUubm93KCkgLSBob3VycyAqIDYwICogNjAgKiAxMDAwKS50b0lTT1N0cmluZygpO1xyXG4gICAgXHJcbiAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHRoaXMuc2Nhbih7XHJcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjdGltZXN0YW1wID49IDpzdGFydFRpbWUnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI3RpbWVzdGFtcCc6ICd0aW1lc3RhbXAnXHJcbiAgICAgIH0sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnN0YXJ0VGltZSc6IHN0YXJ0VGltZVxyXG4gICAgICB9LFxyXG4gICAgICBMaW1pdDogbGltaXRcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBpdGVtc1xyXG4gICAgICAubWFwKGl0ZW0gPT4gVHJlbmREYXRhTW9kZWwuZnJvbUR5bmFtb0RiSXRlbShpdGVtKSlcclxuICAgICAgLnNvcnQoKGEsIGIpID0+IGIuZW5nYWdlbWVudFNjb3JlIC0gYS5lbmdhZ2VtZW50U2NvcmUpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZGVsZXRlVHJlbmRzQnlUb3BpYyh0b3BpYzogc3RyaW5nLCBvbGRlclRoYW5EYXlzOiBudW1iZXIgPSAzMCk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICBjb25zdCBjdXRvZmZEYXRlID0gbmV3IERhdGUoRGF0ZS5ub3coKSAtIG9sZGVyVGhhbkRheXMgKiAyNCAqIDYwICogNjAgKiAxMDAwKS50b0lTT1N0cmluZygpO1xyXG4gICAgXHJcbiAgICBjb25zdCBpdGVtcyA9IGF3YWl0IHRoaXMucXVlcnkoe1xyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnI3RvcGljID0gOnRvcGljIEFORCAjdGltZXN0YW1wIDwgOmN1dG9mZkRhdGUnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI3RvcGljJzogJ3RvcGljJyxcclxuICAgICAgICAnI3RpbWVzdGFtcCc6ICd0aW1lc3RhbXAnXHJcbiAgICAgIH0sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnRvcGljJzogdG9waWMsXHJcbiAgICAgICAgJzpjdXRvZmZEYXRlJzogY3V0b2ZmRGF0ZVxyXG4gICAgICB9LFxyXG4gICAgICBQcm9qZWN0aW9uRXhwcmVzc2lvbjogJyN0b3BpYywgI3RpbWVzdGFtcCdcclxuICAgIH0pO1xyXG5cclxuICAgIGxldCBkZWxldGVkQ291bnQgPSAwO1xyXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuZGVsZXRlKHtcclxuICAgICAgICBLZXk6IHtcclxuICAgICAgICAgIHRvcGljOiBpdGVtLnRvcGljLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBpdGVtLnRpbWVzdGFtcFxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIGRlbGV0ZWRDb3VudCsrO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkZWxldGVkQ291bnQ7XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRUb3BpY1N0YXRzKHRvcGljOiBzdHJpbmcsIGRheXM6IG51bWJlciA9IDcpOiBQcm9taXNlPHtcclxuICAgIHRvdGFsVHJlbmRzOiBudW1iZXI7XHJcbiAgICBhdmVyYWdlRW5nYWdlbWVudDogbnVtYmVyO1xyXG4gICAgdG9wVmlkZW86IFRyZW5kRGF0YSB8IG51bGw7XHJcbiAgICB0cmVuZGluZ0tleXdvcmRzOiBzdHJpbmdbXTtcclxuICB9PiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZShEYXRlLm5vdygpIC0gZGF5cyAqIDI0ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCB0cmVuZHMgPSBhd2FpdCB0aGlzLmdldFRyZW5kc0J5VG9waWModG9waWMsIHsgc3RhcnRUaW1lIH0pO1xyXG5cclxuICAgIGlmICh0cmVuZHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdG90YWxUcmVuZHM6IDAsXHJcbiAgICAgICAgYXZlcmFnZUVuZ2FnZW1lbnQ6IDAsXHJcbiAgICAgICAgdG9wVmlkZW86IG51bGwsXHJcbiAgICAgICAgdHJlbmRpbmdLZXl3b3JkczogW11cclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0b3RhbEVuZ2FnZW1lbnQgPSB0cmVuZHMucmVkdWNlKChzdW0sIHRyZW5kKSA9PiBzdW0gKyB0cmVuZC5lbmdhZ2VtZW50U2NvcmUsIDApO1xyXG4gICAgY29uc3QgdG9wVmlkZW8gPSB0cmVuZHMucmVkdWNlKCh0b3AsIGN1cnJlbnQpID0+IFxyXG4gICAgICBjdXJyZW50LmVuZ2FnZW1lbnRTY29yZSA+IHRvcC5lbmdhZ2VtZW50U2NvcmUgPyBjdXJyZW50IDogdG9wXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgdHJlbmRpbmcga2V5d29yZHNcclxuICAgIGNvbnN0IGtleXdvcmRDb3VudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICAgIHRyZW5kcy5mb3JFYWNoKHRyZW5kID0+IHtcclxuICAgICAgdHJlbmQua2V5d29yZHMuZm9yRWFjaChrZXl3b3JkID0+IHtcclxuICAgICAgICBrZXl3b3JkQ291bnRzW2tleXdvcmRdID0gKGtleXdvcmRDb3VudHNba2V5d29yZF0gfHwgMCkgKyAxO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHRyZW5kaW5nS2V5d29yZHMgPSBPYmplY3QuZW50cmllcyhrZXl3b3JkQ291bnRzKVxyXG4gICAgICAuc29ydCgoWywgYV0sIFssIGJdKSA9PiBiIC0gYSlcclxuICAgICAgLnNsaWNlKDAsIDEwKVxyXG4gICAgICAubWFwKChba2V5d29yZF0pID0+IGtleXdvcmQpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRvdGFsVHJlbmRzOiB0cmVuZHMubGVuZ3RoLFxyXG4gICAgICBhdmVyYWdlRW5nYWdlbWVudDogdG90YWxFbmdhZ2VtZW50IC8gdHJlbmRzLmxlbmd0aCxcclxuICAgICAgdG9wVmlkZW8sXHJcbiAgICAgIHRyZW5kaW5nS2V5d29yZHNcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNodW5rQXJyYXk8VD4oYXJyYXk6IFRbXSwgY2h1bmtTaXplOiBudW1iZXIpOiBUW11bXSB7XHJcbiAgICBjb25zdCBjaHVua3M6IFRbXVtdID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSArPSBjaHVua1NpemUpIHtcclxuICAgICAgY2h1bmtzLnB1c2goYXJyYXkuc2xpY2UoaSwgaSArIGNodW5rU2l6ZSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNodW5rcztcclxuICB9XHJcbn0iXX0=