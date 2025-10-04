"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Remove old imports - using direct implementation instead
// const video_repository_1 = require("../../src/repositories/video-repository");
// const video_metadata_1 = require("../../src/models/video-metadata");
const handler = async (event, context) => {
    const startTime = Date.now();
    console.log('YouTube Uploader Lambda started', {
        requestId: context.awsRequestId,
        videoS3Key: event.processedVideoS3Key,
        topic: event.topic,
        trendId: event.trendId,
        fileSize: event.videoMetadata.fileSize
    });
    try {
        // Initialize YouTube API client
        const youtubeClient = await initializeYouTubeClient();
        // Generate SEO-optimized metadata
        const optimizedMetadata = await generateSEOMetadata(event.topic, event.keywords, event.scriptPrompt, event.videoMetadata);
        // Download video from S3 for upload
        const videoBuffer = await downloadVideoFromS3(event.processedVideoS3Key);
        // Upload video to YouTube
        const uploadResult = await uploadVideoToYouTube(youtubeClient, videoBuffer, optimizedMetadata, event.uploadConfig);
        // Store video metadata in DynamoDB
        await storeVideoMetadata(event, uploadResult, optimizedMetadata);
        // Track initial performance
        const performanceTracking = await trackInitialPerformance(uploadResult.videoId, event.topic);
        console.log('YouTube upload completed successfully', {
            youtubeVideoId: uploadResult.videoId,
            videoUrl: uploadResult.videoUrl,
            title: optimizedMetadata.title,
            uploadTime: uploadResult.uploadTime,
            executionTime: Date.now() - startTime
        });
        return {
            success: true,
            youtubeVideoId: uploadResult.videoId,
            videoUrl: uploadResult.videoUrl,
            uploadedMetadata: {
                title: optimizedMetadata.title,
                description: optimizedMetadata.description,
                tags: optimizedMetadata.tags,
                categoryId: optimizedMetadata.categoryId,
                privacyStatus: uploadResult.privacyStatus,
                thumbnailUrl: uploadResult.thumbnailUrl
            },
            performanceTracking: {
                uploadTime: uploadResult.uploadTime,
                initialViews: performanceTracking.views,
                estimatedReach: performanceTracking.estimatedReach
            },
            executionTime: Date.now() - startTime
        };
    }
    catch (error) {
        console.error('YouTube upload failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            requestId: context.awsRequestId
        });
        // Publish error metrics
        await publishErrorMetrics(error instanceof Error ? error.message : String(error));
        return {
            success: false,
            uploadedMetadata: {
                title: '',
                description: '',
                tags: [],
                categoryId: '',
                privacyStatus: 'private'
            },
            performanceTracking: {
                uploadTime: 0,
                initialViews: 0,
                estimatedReach: 0
            },
            executionTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};
exports.handler = handler;
async function initializeYouTubeClient() {
    console.log('Initializing YouTube API client');
    try {
        // Load credentials from AWS Secrets Manager
        const { SecretsManagerClient, GetSecretValueCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-secrets-manager'));
        const secretsClient = new SecretsManagerClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        const response = await secretsClient.send(new GetSecretValueCommand({
            SecretId: process.env.YOUTUBE_CREDENTIALS_SECRET || 'youtube-automation/credentials'
        }));
        if (!response.SecretString) {
            throw new Error('YouTube credentials not found in Secrets Manager');
        }
        const credentials = JSON.parse(response.SecretString);
        // Initialize Google APIs client
        const { google } = await Promise.resolve().then(() => require('googleapis'));
        const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret, credentials.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob');
        // Set refresh token if available
        if (credentials.refresh_token) {
            oauth2Client.setCredentials({
                refresh_token: credentials.refresh_token
            });
        }
        else if (credentials.access_token) {
            oauth2Client.setCredentials({
                access_token: credentials.access_token
            });
        }
        else {
            throw new Error('No valid YouTube authentication tokens found');
        }
        const youtube = google.youtube({
            version: 'v3',
            auth: oauth2Client
        });
        console.log('YouTube API client initialized successfully');
        return { youtube, oauth2Client };
    }
    catch (error) {
        console.error('Failed to initialize YouTube client', error);
        throw error;
    }
}
async function generateSEOMetadata(topic, keywords, scriptPrompt, videoMetadata) {
    console.log('Generating SEO-optimized metadata');
    // Generate compelling title with keywords
    const title = generateSEOTitle(topic, keywords);
    // Generate comprehensive description
    const description = generateSEODescription(topic, keywords, scriptPrompt, videoMetadata);
    // Generate relevant tags
    const tags = generateSEOTags(topic, keywords);
    // Determine appropriate category
    const categoryId = getCategoryId(topic);
    console.log('SEO metadata generated', {
        title,
        descriptionLength: description.length,
        tagsCount: tags.length,
        categoryId
    });
    return {
        title,
        description,
        tags,
        categoryId
    };
}
function generateSEOTitle(topic, keywords) {
    const topKeywords = keywords.slice(0, 3);
    const currentYear = new Date().getFullYear();
    const titleTemplates = [
        `${topKeywords[0]} in ${topic}: Complete ${currentYear} Guide`,
        `Master ${topic}: ${topKeywords.slice(0, 2).join(' & ')} Explained`,
        `${topic} Secrets: ${topKeywords[0]} Tips That Actually Work`,
        `Ultimate ${topic} Tutorial: ${topKeywords[0]} for Beginners`,
        `${currentYear} ${topic} Guide: ${topKeywords.slice(0, 2).join(', ')} & More`,
        `Why Everyone's Talking About ${topKeywords[0]} in ${topic}`,
        `${topic} Breakthrough: ${topKeywords[0]} Changes Everything`
    ];
    const selectedTitle = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
    // Ensure title is under YouTube's 100 character limit
    return selectedTitle.length > 100 ? selectedTitle.substring(0, 97) + '...' : selectedTitle;
}
function generateSEODescription(topic, keywords, scriptPrompt, videoMetadata) {
    const currentYear = new Date().getFullYear();
    const duration = Math.round(videoMetadata.duration / 60); // Convert to minutes
    const description = `
🎯 In this comprehensive ${duration}-minute ${topic} guide, you'll discover everything you need to know about ${keywords.slice(0, 3).join(', ')}.

📚 What You'll Learn:
• Essential ${topic} concepts and strategies
• Practical tips for ${keywords[0]} success
• Real-world examples and case studies
• Step-by-step implementation guide
• Common mistakes to avoid

🔥 Key Topics Covered:
${keywords.slice(0, 6).map(keyword => `• ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`).join('\n')}

⏰ Timestamps:
0:00 Introduction to ${topic}
1:30 Understanding ${keywords[0]}
3:45 Practical applications
6:20 Advanced strategies
8:15 Common pitfalls
9:30 Next steps and resources

💡 Whether you're a beginner or looking to advance your ${topic} knowledge, this video provides actionable insights you can implement immediately.

🎯 Perfect for: Students, professionals, entrepreneurs, and anyone interested in ${topic} and ${keywords.slice(0, 2).join(', ')}.

📈 Stay updated with the latest ${topic} trends and strategies by subscribing to our channel!

#${topic.replace(/\s+/g, '')} #${keywords[0].replace(/\s+/g, '')} #${currentYear}Tutorial #Education #Learning

---
Video created with AI-powered content generation | ${currentYear}
`.trim();
    // Ensure description is under YouTube's 5000 character limit
    return description.length > 5000 ? description.substring(0, 4997) + '...' : description;
}
function generateSEOTags(topic, keywords) {
    const currentYear = new Date().getFullYear();
    const baseTags = [
        topic.toLowerCase(),
        `${topic.toLowerCase()} tutorial`,
        `${topic.toLowerCase()} guide`,
        `${topic.toLowerCase()} ${currentYear}`,
        'education',
        'learning',
        'tutorial',
        'guide',
        'tips',
        'strategies'
    ];
    const keywordTags = keywords.slice(0, 10).map(keyword => keyword.toLowerCase());
    const topicSpecificTags = getTopicSpecificTags(topic);
    const allTags = [...baseTags, ...keywordTags, ...topicSpecificTags];
    // Remove duplicates and limit to 500 characters total
    const uniqueTags = [...new Set(allTags)];
    let totalLength = 0;
    const finalTags = [];
    for (const tag of uniqueTags) {
        if (totalLength + tag.length + 1 <= 500 && finalTags.length < 15) {
            finalTags.push(tag);
            totalLength += tag.length + 1; // +1 for comma
        }
    }
    return finalTags;
}
function getTopicSpecificTags(topic) {
    const topicTags = {
        investing: ['finance', 'money', 'stocks', 'etf', 'portfolio', 'wealth', 'financial planning'],
        education: ['study tips', 'learning methods', 'academic success', 'productivity', 'skills'],
        tourism: ['travel', 'destinations', 'vacation', 'adventure', 'culture', 'explore'],
        technology: ['tech', 'innovation', 'digital', 'future', 'gadgets', 'software'],
        health: ['wellness', 'fitness', 'nutrition', 'lifestyle', 'medical', 'wellbeing']
    };
    return topicTags[topic.toLowerCase()] || ['general', 'information', 'knowledge'];
}
function getCategoryId(topic) {
    const categoryMap = {
        investing: '25',
        education: '27',
        tourism: '19',
        technology: '28',
        health: '26',
        entertainment: '24' // Entertainment
    };
    return categoryMap[topic.toLowerCase()] || '27'; // Default to Education
}
async function downloadVideoFromS3(s3Key) {
    console.log('Downloading video from S3', { s3Key });
    try {
        const { S3Client, GetObjectCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-s3'));
        const s3Client = new S3Client({ region: process.env.AWS_REGION });
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.VIDEO_BUCKET,
            Key: s3Key
        }));
        if (!response.Body) {
            throw new Error('Video file not found in S3');
        }
        // Convert stream to buffer
        const chunks = [];
        if (response.Body instanceof Buffer) {
            return response.Body;
        }
        // Handle readable stream
        const stream = response.Body;
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        console.log('Video downloaded successfully', { size: buffer.length });
        return buffer;
    }
    catch (error) {
        console.error('Failed to download video from S3', error);
        throw error;
    }
}
async function uploadVideoToYouTube(youtubeClient, videoBuffer, metadata, uploadConfig) {
    console.log('Uploading video to YouTube');
    const uploadStartTime = Date.now();
    try {
        const { youtube } = youtubeClient;
        const uploadParams = {
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title: metadata.title,
                    description: metadata.description,
                    tags: metadata.tags,
                    categoryId: metadata.categoryId,
                    defaultLanguage: 'en',
                    defaultAudioLanguage: 'en'
                },
                status: {
                    privacyStatus: uploadConfig?.privacyStatus || 'public',
                    selfDeclaredMadeForKids: false,
                    publishAt: uploadConfig?.publishAt
                }
            },
            media: {
                body: videoBuffer
            }
        };
        const response = await youtube.videos.insert(uploadParams);
        const videoId = response.data.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const uploadTime = Date.now() - uploadStartTime;
        console.log('Video uploaded successfully', {
            videoId,
            videoUrl,
            uploadTime,
            title: metadata.title
        });
        // Get thumbnail URL
        let thumbnailUrl;
        try {
            const videoDetails = await youtube.videos.list({
                part: ['snippet'],
                id: [videoId]
            });
            thumbnailUrl = videoDetails.data.items?.[0]?.snippet?.thumbnails?.high?.url;
        }
        catch (error) {
            console.warn('Failed to get thumbnail URL', error);
        }
        return {
            videoId,
            videoUrl,
            uploadTime,
            privacyStatus: uploadConfig?.privacyStatus || 'public',
            thumbnailUrl
        };
    }
    catch (error) {
        console.error('YouTube upload failed', error);
        throw error;
    }
}
async function storeVideoMetadata(event, uploadResult, metadata) {
    console.log('Storing video metadata in DynamoDB');
    try {
        // Simple DynamoDB storage without repository pattern
        const { DynamoDBClient, PutItemCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-dynamodb'));
        const { marshall } = await Promise.resolve().then(() => require('@aws-sdk/util-dynamodb'));
        
        const dynamoClient = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        
        const videoMetadata = {
            videoId: uploadResult.videoId,
            youtubeId: uploadResult.videoId,
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags,
            categoryId: metadata.categoryId,
            uploadDate: new Date().toISOString().split('T')[0],
            privacyStatus: uploadResult.privacyStatus,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            revenue: 0,
            sourceTrends: [event.trendId],
            generationCost: 0,
            processingCost: 0,
            s3Key: event.processedVideoS3Key,
            status: 'PUBLISHED',
            performanceMetrics: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await dynamoClient.send(new PutItemCommand({
            TableName: process.env.VIDEOS_TABLE || 'youtube-automation-videos-hot',
            Item: marshall(videoMetadata)
        }));
        
        console.log('Video metadata stored successfully');
    }
    catch (error) {
        console.error('Failed to store video metadata', error);
        // Don't throw - metadata storage failure shouldn't fail the upload
    }
}
async function trackInitialPerformance(videoId, topic) {
    console.log('Tracking initial video performance');
    try {
        // For newly uploaded videos, initial metrics will be 0
        // This function can be enhanced to provide estimates based on topic performance
        const topicMultipliers = {
            investing: 1.2,
            education: 1.0,
            tourism: 0.9,
            technology: 1.1,
            health: 1.0
        };
        const baseEstimate = 100; // Base estimated reach for new videos
        const topicMultiplier = topicMultipliers[topic.toLowerCase()] || 1.0;
        const estimatedReach = Math.round(baseEstimate * topicMultiplier);
        return {
            views: 0,
            estimatedReach
        };
    }
    catch (error) {
        console.error('Failed to track initial performance', error);
        return {
            views: 0,
            estimatedReach: 100
        };
    }
}
async function publishErrorMetrics(errorMessage) {
    try {
        const { CloudWatchClient, PutMetricDataCommand } = await Promise.resolve().then(() => require('@aws-sdk/client-cloudwatch'));
        const cloudwatch = new CloudWatchClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        await cloudwatch.send(new PutMetricDataCommand({
            Namespace: 'YouTubeAutomation/Uploader',
            MetricData: [
                {
                    MetricName: 'UploadErrors',
                    Value: 1,
                    Unit: 'Count',
                    Timestamp: new Date(),
                    Dimensions: [
                        {
                            Name: 'ErrorType',
                            Value: errorMessage.substring(0, 50) // Truncate for dimension value
                        }
                    ]
                }
            ]
        }));
    }
    catch (error) {
        console.error('Failed to publish error metrics', error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4RUFBMEU7QUFDMUUsb0VBQTZFO0FBMkN0RSxNQUFNLE9BQU8sR0FBMkQsS0FBSyxFQUNsRixLQUEyQixFQUMzQixPQUFnQixFQUNrQixFQUFFO0lBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxFQUFFO1FBQzdDLFNBQVMsRUFBRSxPQUFPLENBQUMsWUFBWTtRQUMvQixVQUFVLEVBQUUsS0FBSyxDQUFDLG1CQUFtQjtRQUNyQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7UUFDbEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1FBQ3RCLFFBQVEsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVE7S0FDdkMsQ0FBQyxDQUFDO0lBRUgsSUFBSTtRQUNGLGdDQUFnQztRQUNoQyxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUF1QixFQUFFLENBQUM7UUFFdEQsa0NBQWtDO1FBQ2xDLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxtQkFBbUIsQ0FDakQsS0FBSyxDQUFDLEtBQUssRUFDWCxLQUFLLENBQUMsUUFBUSxFQUNkLEtBQUssQ0FBQyxZQUFZLEVBQ2xCLEtBQUssQ0FBQyxhQUFhLENBQ3BCLENBQUM7UUFFRixvQ0FBb0M7UUFDcEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUV6RSwwQkFBMEI7UUFDMUIsTUFBTSxZQUFZLEdBQUcsTUFBTSxvQkFBb0IsQ0FDN0MsYUFBYSxFQUNiLFdBQVcsRUFDWCxpQkFBaUIsRUFDakIsS0FBSyxDQUFDLFlBQVksQ0FDbkIsQ0FBQztRQUVGLG1DQUFtQztRQUNuQyxNQUFNLGtCQUFrQixDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVqRSw0QkFBNEI7UUFDNUIsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLHVCQUF1QixDQUN2RCxZQUFZLENBQUMsT0FBTyxFQUNwQixLQUFLLENBQUMsS0FBSyxDQUNaLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxFQUFFO1lBQ25ELGNBQWMsRUFBRSxZQUFZLENBQUMsT0FBTztZQUNwQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7WUFDL0IsS0FBSyxFQUFFLGlCQUFpQixDQUFDLEtBQUs7WUFDOUIsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO1lBQ25DLGFBQWEsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUztTQUN0QyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsT0FBTyxFQUFFLElBQUk7WUFDYixjQUFjLEVBQUUsWUFBWSxDQUFDLE9BQU87WUFDcEMsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO1lBQy9CLGdCQUFnQixFQUFFO2dCQUNoQixLQUFLLEVBQUUsaUJBQWlCLENBQUMsS0FBSztnQkFDOUIsV0FBVyxFQUFFLGlCQUFpQixDQUFDLFdBQVc7Z0JBQzFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJO2dCQUM1QixVQUFVLEVBQUUsaUJBQWlCLENBQUMsVUFBVTtnQkFDeEMsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO2dCQUN6QyxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7YUFDeEM7WUFDRCxtQkFBbUIsRUFBRTtnQkFDbkIsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO2dCQUNuQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsS0FBSztnQkFDdkMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLGNBQWM7YUFDbkQ7WUFDRCxhQUFhLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVM7U0FDdEMsQ0FBQztLQUVIO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFO1lBQ3JDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQzdELEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3ZELFNBQVMsRUFBRSxPQUFPLENBQUMsWUFBWTtTQUNoQyxDQUFDLENBQUM7UUFFSCx3QkFBd0I7UUFDeEIsTUFBTSxtQkFBbUIsQ0FBQyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVsRixPQUFPO1lBQ0wsT0FBTyxFQUFFLEtBQUs7WUFDZCxnQkFBZ0IsRUFBRTtnQkFDaEIsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLEVBQUU7Z0JBQ2YsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsYUFBYSxFQUFFLFNBQVM7YUFDekI7WUFDRCxtQkFBbUIsRUFBRTtnQkFDbkIsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsWUFBWSxFQUFFLENBQUM7Z0JBQ2YsY0FBYyxFQUFFLENBQUM7YUFDbEI7WUFDRCxhQUFhLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVM7WUFDckMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7U0FDOUQsQ0FBQztLQUNIO0FBQ0gsQ0FBQyxDQUFDO0FBdEdXLFFBQUEsT0FBTyxXQXNHbEI7QUFFRixLQUFLLFVBQVUsdUJBQXVCO0lBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FBQztJQUUvQyxJQUFJO1FBQ0YsNENBQTRDO1FBQzVDLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxHQUNuRCwyQ0FBYSxpQ0FBaUMsRUFBQyxDQUFDO1FBRWxELE1BQU0sYUFBYSxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDN0MsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7U0FDOUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUM7WUFDbEUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLElBQUksZ0NBQWdDO1NBQ3JGLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUU7WUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1NBQ3JFO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFdEQsZ0NBQWdDO1FBQ2hDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRywyQ0FBYSxZQUFZLEVBQUMsQ0FBQztRQUU5QyxNQUFNLFlBQVksR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUN6QyxXQUFXLENBQUMsU0FBUyxFQUNyQixXQUFXLENBQUMsYUFBYSxFQUN6QixXQUFXLENBQUMsWUFBWSxJQUFJLDJCQUEyQixDQUN4RCxDQUFDO1FBRUYsaUNBQWlDO1FBQ2pDLElBQUksV0FBVyxDQUFDLGFBQWEsRUFBRTtZQUM3QixZQUFZLENBQUMsY0FBYyxDQUFDO2dCQUMxQixhQUFhLEVBQUUsV0FBVyxDQUFDLGFBQWE7YUFDekMsQ0FBQyxDQUFDO1NBQ0o7YUFBTSxJQUFJLFdBQVcsQ0FBQyxZQUFZLEVBQUU7WUFDbkMsWUFBWSxDQUFDLGNBQWMsQ0FBQztnQkFDMUIsWUFBWSxFQUFFLFdBQVcsQ0FBQyxZQUFZO2FBQ3ZDLENBQUMsQ0FBQztTQUNKO2FBQU07WUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7U0FDakU7UUFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQzdCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsSUFBSSxFQUFFLFlBQVk7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUM7S0FFbEM7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUQsTUFBTSxLQUFLLENBQUM7S0FDYjtBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsbUJBQW1CLENBQ2hDLEtBQWEsRUFDYixRQUFrQixFQUNsQixZQUFvQixFQUNwQixhQUFrQjtJQU9sQixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7SUFFakQsMENBQTBDO0lBQzFDLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUVoRCxxQ0FBcUM7SUFDckMsTUFBTSxXQUFXLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFFekYseUJBQXlCO0lBQ3pCLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFOUMsaUNBQWlDO0lBQ2pDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV4QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFO1FBQ3BDLEtBQUs7UUFDTCxpQkFBaUIsRUFBRSxXQUFXLENBQUMsTUFBTTtRQUNyQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU07UUFDdEIsVUFBVTtLQUNYLENBQUMsQ0FBQztJQUVILE9BQU87UUFDTCxLQUFLO1FBQ0wsV0FBVztRQUNYLElBQUk7UUFDSixVQUFVO0tBQ1gsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEtBQWEsRUFBRSxRQUFrQjtJQUN6RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6QyxNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRTdDLE1BQU0sY0FBYyxHQUFHO1FBQ3JCLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssY0FBYyxXQUFXLFFBQVE7UUFDOUQsVUFBVSxLQUFLLEtBQUssV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZO1FBQ25FLEdBQUcsS0FBSyxhQUFhLFdBQVcsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1FBQzdELFlBQVksS0FBSyxjQUFjLFdBQVcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1FBQzdELEdBQUcsV0FBVyxJQUFJLEtBQUssV0FBVyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVM7UUFDN0UsZ0NBQWdDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLEVBQUU7UUFDNUQsR0FBRyxLQUFLLGtCQUFrQixXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQjtLQUM5RCxDQUFDO0lBRUYsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRXhGLHNEQUFzRDtJQUN0RCxPQUFPLGFBQWEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztBQUM3RixDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FDN0IsS0FBYSxFQUNiLFFBQWtCLEVBQ2xCLFlBQW9CLEVBQ3BCLGFBQWtCO0lBRWxCLE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMscUJBQXFCO0lBRS9FLE1BQU0sV0FBVyxHQUFHOzJCQUNLLFFBQVEsV0FBVyxLQUFLLDZEQUE2RCxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDOzs7Y0FHakksS0FBSzt1QkFDSSxRQUFRLENBQUMsQ0FBQyxDQUFDOzs7Ozs7RUFNaEMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Ozt1QkFHcEYsS0FBSztxQkFDUCxRQUFRLENBQUMsQ0FBQyxDQUFDOzs7Ozs7MERBTTBCLEtBQUs7O21GQUVvQixLQUFLLFFBQVEsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzs7a0NBRTdGLEtBQUs7O0dBRXBDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxLQUFLLFdBQVc7OztxREFHM0IsV0FBVztDQUMvRCxDQUFDLElBQUksRUFBRSxDQUFDO0lBRVAsNkRBQTZEO0lBQzdELE9BQU8sV0FBVyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQzFGLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxLQUFhLEVBQUUsUUFBa0I7SUFDeEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUU3QyxNQUFNLFFBQVEsR0FBRztRQUNmLEtBQUssQ0FBQyxXQUFXLEVBQUU7UUFDbkIsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLFdBQVc7UUFDakMsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLFFBQVE7UUFDOUIsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksV0FBVyxFQUFFO1FBQ3ZDLFdBQVc7UUFDWCxVQUFVO1FBQ1YsVUFBVTtRQUNWLE9BQU87UUFDUCxNQUFNO1FBQ04sWUFBWTtLQUNiLENBQUM7SUFFRixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUVoRixNQUFNLGlCQUFpQixHQUFHLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXRELE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxRQUFRLEVBQUUsR0FBRyxXQUFXLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO0lBRXBFLHNEQUFzRDtJQUN0RCxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN6QyxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFDcEIsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDO0lBRXJCLEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFO1FBQzVCLElBQUksV0FBVyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRTtZQUNoRSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLFdBQVcsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLGVBQWU7U0FDL0M7S0FDRjtJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLEtBQWE7SUFDekMsTUFBTSxTQUFTLEdBQTZCO1FBQzFDLFNBQVMsRUFBRSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixDQUFDO1FBQzdGLFNBQVMsRUFBRSxDQUFDLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsUUFBUSxDQUFDO1FBQzNGLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDO1FBQ2xGLFVBQVUsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQzlFLE1BQU0sRUFBRSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDO0tBQ2xGLENBQUM7SUFFRixPQUFPLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDbkYsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQWE7SUFDbEMsTUFBTSxXQUFXLEdBQTJCO1FBQzFDLFNBQVMsRUFBRSxJQUFJO1FBQ2YsU0FBUyxFQUFFLElBQUk7UUFDZixPQUFPLEVBQUUsSUFBSTtRQUNiLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLE1BQU0sRUFBRSxJQUFJO1FBQ1osYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7S0FDckMsQ0FBQztJQUVGLE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLHVCQUF1QjtBQUMxRSxDQUFDO0FBRUQsS0FBSyxVQUFVLG1CQUFtQixDQUFDLEtBQWE7SUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFFcEQsSUFBSTtRQUNGLE1BQU0sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRywyQ0FBYSxvQkFBb0IsRUFBQyxDQUFDO1FBRTFFLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUVsRSxNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQztZQUN4RCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZO1lBQ2hDLEdBQUcsRUFBRSxLQUFLO1NBQ1gsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7U0FDL0M7UUFFRCwyQkFBMkI7UUFDM0IsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBRTVCLElBQUksUUFBUSxDQUFDLElBQUksWUFBWSxNQUFNLEVBQUU7WUFDbkMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQ3RCO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFXLENBQUM7UUFDcEMsSUFBSSxLQUFLLEVBQUUsTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDcEI7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFdEUsT0FBTyxNQUFNLENBQUM7S0FFZjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxNQUFNLEtBQUssQ0FBQztLQUNiO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxvQkFBb0IsQ0FDakMsYUFBa0IsRUFDbEIsV0FBbUIsRUFDbkIsUUFBYSxFQUNiLFlBQWlCO0lBUWpCLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUUxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFbkMsSUFBSTtRQUNGLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxhQUFhLENBQUM7UUFFbEMsTUFBTSxZQUFZLEdBQUc7WUFDbkIsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQztZQUMzQixXQUFXLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFO29CQUNQLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztvQkFDckIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXO29CQUNqQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7b0JBQ25CLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTtvQkFDL0IsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLG9CQUFvQixFQUFFLElBQUk7aUJBQzNCO2dCQUNELE1BQU0sRUFBRTtvQkFDTixhQUFhLEVBQUUsWUFBWSxFQUFFLGFBQWEsSUFBSSxRQUFRO29CQUN0RCx1QkFBdUIsRUFBRSxLQUFLO29CQUM5QixTQUFTLEVBQUUsWUFBWSxFQUFFLFNBQVM7aUJBQ25DO2FBQ0Y7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLFdBQVc7YUFDbEI7U0FDRixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUzRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNqQyxNQUFNLFFBQVEsR0FBRyxtQ0FBbUMsT0FBTyxFQUFFLENBQUM7UUFDOUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLGVBQWUsQ0FBQztRQUVoRCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixFQUFFO1lBQ3pDLE9BQU87WUFDUCxRQUFRO1lBQ1IsVUFBVTtZQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztTQUN0QixDQUFDLENBQUM7UUFFSCxvQkFBb0I7UUFDcEIsSUFBSSxZQUFZLENBQUM7UUFDakIsSUFBSTtZQUNGLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQzdDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztnQkFDakIsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDO2FBQ2QsQ0FBQyxDQUFDO1lBQ0gsWUFBWSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDO1NBQzdFO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3BEO1FBRUQsT0FBTztZQUNMLE9BQU87WUFDUCxRQUFRO1lBQ1IsVUFBVTtZQUNWLGFBQWEsRUFBRSxZQUFZLEVBQUUsYUFBYSxJQUFJLFFBQVE7WUFDdEQsWUFBWTtTQUNiLENBQUM7S0FFSDtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxNQUFNLEtBQUssQ0FBQztLQUNiO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxrQkFBa0IsQ0FDL0IsS0FBMkIsRUFDM0IsWUFBaUIsRUFDakIsUUFBYTtJQUViLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztJQUVsRCxJQUFJO1FBQ0YsTUFBTSxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDO1lBQzFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVU7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQWtCO1lBQ25DLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztZQUM3QixTQUFTLEVBQUUsWUFBWSxDQUFDLE9BQU87WUFDL0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztZQUNqQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEQsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3pDLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxFQUFFLENBQUM7WUFDWixZQUFZLEVBQUUsQ0FBQztZQUNmLE9BQU8sRUFBRSxDQUFDO1lBQ1YsWUFBWSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztZQUM3QixjQUFjLEVBQUUsQ0FBQztZQUNqQixjQUFjLEVBQUUsQ0FBQztZQUNqQixLQUFLLEVBQUUsS0FBSyxDQUFDLG1CQUFtQjtZQUNoQyxNQUFNLEVBQUUsNEJBQVcsQ0FBQyxTQUFTO1lBQzdCLGtCQUFrQixFQUFFLEVBQUU7WUFDdEIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ25DLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtTQUNwQyxDQUFDO1FBRUYsTUFBTSxlQUFlLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztLQUVuRDtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxtRUFBbUU7S0FDcEU7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLHVCQUF1QixDQUNwQyxPQUFlLEVBQ2YsS0FBYTtJQUtiLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztJQUVsRCxJQUFJO1FBQ0YsdURBQXVEO1FBQ3ZELGdGQUFnRjtRQUNoRixNQUFNLGdCQUFnQixHQUEyQjtZQUMvQyxTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxHQUFHO1lBQ2QsT0FBTyxFQUFFLEdBQUc7WUFDWixVQUFVLEVBQUUsR0FBRztZQUNmLE1BQU0sRUFBRSxHQUFHO1NBQ1osQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDLHNDQUFzQztRQUNoRSxNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDckUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsZUFBZSxDQUFDLENBQUM7UUFFbEUsT0FBTztZQUNMLEtBQUssRUFBRSxDQUFDO1lBQ1IsY0FBYztTQUNmLENBQUM7S0FFSDtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RCxPQUFPO1lBQ0wsS0FBSyxFQUFFLENBQUM7WUFDUixjQUFjLEVBQUUsR0FBRztTQUNwQixDQUFDO0tBQ0g7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLG1CQUFtQixDQUFDLFlBQW9CO0lBQ3JELElBQUk7UUFDRixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsR0FBRywyQ0FBYSw0QkFBNEIsRUFBQyxDQUFDO1FBRTlGLE1BQU0sVUFBVSxHQUFHLElBQUksZ0JBQWdCLENBQUM7WUFDdEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7U0FDOUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksb0JBQW9CLENBQUM7WUFDN0MsU0FBUyxFQUFFLDRCQUE0QjtZQUN2QyxVQUFVLEVBQUU7Z0JBQ1Y7b0JBQ0UsVUFBVSxFQUFFLGNBQWM7b0JBQzFCLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxPQUFnQjtvQkFDdEIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO29CQUNyQixVQUFVLEVBQUU7d0JBQ1Y7NEJBQ0UsSUFBSSxFQUFFLFdBQVc7NEJBQ2pCLEtBQUssRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQywrQkFBK0I7eUJBQ3JFO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUMsQ0FBQztLQUNMO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3pEO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEhhbmRsZXIsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgVmlkZW9SZXBvc2l0b3J5IH0gZnJvbSAnLi4vLi4vc3JjL3JlcG9zaXRvcmllcy92aWRlby1yZXBvc2l0b3J5JztcclxuaW1wb3J0IHsgVmlkZW9NZXRhZGF0YSwgVmlkZW9TdGF0dXMgfSBmcm9tICcuLi8uLi9zcmMvbW9kZWxzL3ZpZGVvLW1ldGFkYXRhJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgWW91VHViZVVwbG9hZGVyRXZlbnQge1xyXG4gIHByb2Nlc3NlZFZpZGVvUzNLZXk6IHN0cmluZztcclxuICB0b3BpYzogc3RyaW5nO1xyXG4gIHRyZW5kSWQ6IHN0cmluZztcclxuICBzY3JpcHRQcm9tcHQ6IHN0cmluZztcclxuICBrZXl3b3Jkczogc3RyaW5nW107XHJcbiAgdmlkZW9NZXRhZGF0YToge1xyXG4gICAgZHVyYXRpb246IG51bWJlcjtcclxuICAgIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgICBmb3JtYXQ6IHN0cmluZztcclxuICAgIHJlc29sdXRpb246IHN0cmluZztcclxuICAgIGlzWW91VHViZU9wdGltaXplZDogYm9vbGVhbjtcclxuICB9O1xyXG4gIHVwbG9hZENvbmZpZz86IHtcclxuICAgIHByaXZhY3lTdGF0dXM6ICdwdWJsaWMnIHwgJ3VubGlzdGVkJyB8ICdwcml2YXRlJztcclxuICAgIGNhdGVnb3J5SWQ6IHN0cmluZztcclxuICAgIHB1Ymxpc2hBdD86IHN0cmluZztcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVVcGxvYWRlclJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIHlvdXR1YmVWaWRlb0lkPzogc3RyaW5nO1xyXG4gIHZpZGVvVXJsPzogc3RyaW5nO1xyXG4gIHVwbG9hZGVkTWV0YWRhdGE6IHtcclxuICAgIHRpdGxlOiBzdHJpbmc7XHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gICAgdGFnczogc3RyaW5nW107XHJcbiAgICBjYXRlZ29yeUlkOiBzdHJpbmc7XHJcbiAgICBwcml2YWN5U3RhdHVzOiBzdHJpbmc7XHJcbiAgICB0aHVtYm5haWxVcmw/OiBzdHJpbmc7XHJcbiAgfTtcclxuICBwZXJmb3JtYW5jZVRyYWNraW5nOiB7XHJcbiAgICB1cGxvYWRUaW1lOiBudW1iZXI7XHJcbiAgICBpbml0aWFsVmlld3M6IG51bWJlcjtcclxuICAgIGVzdGltYXRlZFJlYWNoOiBudW1iZXI7XHJcbiAgfTtcclxuICBleGVjdXRpb25UaW1lOiBudW1iZXI7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBIYW5kbGVyPFlvdVR1YmVVcGxvYWRlckV2ZW50LCBZb3VUdWJlVXBsb2FkZXJSZXNwb25zZT4gPSBhc3luYyAoXHJcbiAgZXZlbnQ6IFlvdVR1YmVVcGxvYWRlckV2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTxZb3VUdWJlVXBsb2FkZXJSZXNwb25zZT4gPT4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ1lvdVR1YmUgVXBsb2FkZXIgTGFtYmRhIHN0YXJ0ZWQnLCB7XHJcbiAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgdmlkZW9TM0tleTogZXZlbnQucHJvY2Vzc2VkVmlkZW9TM0tleSxcclxuICAgIHRvcGljOiBldmVudC50b3BpYyxcclxuICAgIHRyZW5kSWQ6IGV2ZW50LnRyZW5kSWQsXHJcbiAgICBmaWxlU2l6ZTogZXZlbnQudmlkZW9NZXRhZGF0YS5maWxlU2l6ZVxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gSW5pdGlhbGl6ZSBZb3VUdWJlIEFQSSBjbGllbnRcclxuICAgIGNvbnN0IHlvdXR1YmVDbGllbnQgPSBhd2FpdCBpbml0aWFsaXplWW91VHViZUNsaWVudCgpO1xyXG4gICAgXHJcbiAgICAvLyBHZW5lcmF0ZSBTRU8tb3B0aW1pemVkIG1ldGFkYXRhXHJcbiAgICBjb25zdCBvcHRpbWl6ZWRNZXRhZGF0YSA9IGF3YWl0IGdlbmVyYXRlU0VPTWV0YWRhdGEoXHJcbiAgICAgIGV2ZW50LnRvcGljLFxyXG4gICAgICBldmVudC5rZXl3b3JkcyxcclxuICAgICAgZXZlbnQuc2NyaXB0UHJvbXB0LFxyXG4gICAgICBldmVudC52aWRlb01ldGFkYXRhXHJcbiAgICApO1xyXG5cclxuICAgIC8vIERvd25sb2FkIHZpZGVvIGZyb20gUzMgZm9yIHVwbG9hZFxyXG4gICAgY29uc3QgdmlkZW9CdWZmZXIgPSBhd2FpdCBkb3dubG9hZFZpZGVvRnJvbVMzKGV2ZW50LnByb2Nlc3NlZFZpZGVvUzNLZXkpO1xyXG4gICAgXHJcbiAgICAvLyBVcGxvYWQgdmlkZW8gdG8gWW91VHViZVxyXG4gICAgY29uc3QgdXBsb2FkUmVzdWx0ID0gYXdhaXQgdXBsb2FkVmlkZW9Ub1lvdVR1YmUoXHJcbiAgICAgIHlvdXR1YmVDbGllbnQsXHJcbiAgICAgIHZpZGVvQnVmZmVyLFxyXG4gICAgICBvcHRpbWl6ZWRNZXRhZGF0YSxcclxuICAgICAgZXZlbnQudXBsb2FkQ29uZmlnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFN0b3JlIHZpZGVvIG1ldGFkYXRhIGluIER5bmFtb0RCXHJcbiAgICBhd2FpdCBzdG9yZVZpZGVvTWV0YWRhdGEoZXZlbnQsIHVwbG9hZFJlc3VsdCwgb3B0aW1pemVkTWV0YWRhdGEpO1xyXG5cclxuICAgIC8vIFRyYWNrIGluaXRpYWwgcGVyZm9ybWFuY2VcclxuICAgIGNvbnN0IHBlcmZvcm1hbmNlVHJhY2tpbmcgPSBhd2FpdCB0cmFja0luaXRpYWxQZXJmb3JtYW5jZShcclxuICAgICAgdXBsb2FkUmVzdWx0LnZpZGVvSWQsXHJcbiAgICAgIGV2ZW50LnRvcGljXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdZb3VUdWJlIHVwbG9hZCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICB5b3V0dWJlVmlkZW9JZDogdXBsb2FkUmVzdWx0LnZpZGVvSWQsXHJcbiAgICAgIHZpZGVvVXJsOiB1cGxvYWRSZXN1bHQudmlkZW9VcmwsXHJcbiAgICAgIHRpdGxlOiBvcHRpbWl6ZWRNZXRhZGF0YS50aXRsZSxcclxuICAgICAgdXBsb2FkVGltZTogdXBsb2FkUmVzdWx0LnVwbG9hZFRpbWUsXHJcbiAgICAgIGV4ZWN1dGlvblRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWVcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIHlvdXR1YmVWaWRlb0lkOiB1cGxvYWRSZXN1bHQudmlkZW9JZCxcclxuICAgICAgdmlkZW9Vcmw6IHVwbG9hZFJlc3VsdC52aWRlb1VybCxcclxuICAgICAgdXBsb2FkZWRNZXRhZGF0YToge1xyXG4gICAgICAgIHRpdGxlOiBvcHRpbWl6ZWRNZXRhZGF0YS50aXRsZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogb3B0aW1pemVkTWV0YWRhdGEuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgdGFnczogb3B0aW1pemVkTWV0YWRhdGEudGFncyxcclxuICAgICAgICBjYXRlZ29yeUlkOiBvcHRpbWl6ZWRNZXRhZGF0YS5jYXRlZ29yeUlkLFxyXG4gICAgICAgIHByaXZhY3lTdGF0dXM6IHVwbG9hZFJlc3VsdC5wcml2YWN5U3RhdHVzLFxyXG4gICAgICAgIHRodW1ibmFpbFVybDogdXBsb2FkUmVzdWx0LnRodW1ibmFpbFVybFxyXG4gICAgICB9LFxyXG4gICAgICBwZXJmb3JtYW5jZVRyYWNraW5nOiB7XHJcbiAgICAgICAgdXBsb2FkVGltZTogdXBsb2FkUmVzdWx0LnVwbG9hZFRpbWUsXHJcbiAgICAgICAgaW5pdGlhbFZpZXdzOiBwZXJmb3JtYW5jZVRyYWNraW5nLnZpZXdzLFxyXG4gICAgICAgIGVzdGltYXRlZFJlYWNoOiBwZXJmb3JtYW5jZVRyYWNraW5nLmVzdGltYXRlZFJlYWNoXHJcbiAgICAgIH0sXHJcbiAgICAgIGV4ZWN1dGlvblRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWVcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdZb3VUdWJlIHVwbG9hZCBmYWlsZWQnLCB7XHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgIHN0YWNrOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiB1bmRlZmluZWQsXHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFB1Ymxpc2ggZXJyb3IgbWV0cmljc1xyXG4gICAgYXdhaXQgcHVibGlzaEVycm9yTWV0cmljcyhlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICB1cGxvYWRlZE1ldGFkYXRhOiB7XHJcbiAgICAgICAgdGl0bGU6ICcnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnJyxcclxuICAgICAgICB0YWdzOiBbXSxcclxuICAgICAgICBjYXRlZ29yeUlkOiAnJyxcclxuICAgICAgICBwcml2YWN5U3RhdHVzOiAncHJpdmF0ZSdcclxuICAgICAgfSxcclxuICAgICAgcGVyZm9ybWFuY2VUcmFja2luZzoge1xyXG4gICAgICAgIHVwbG9hZFRpbWU6IDAsXHJcbiAgICAgICAgaW5pdGlhbFZpZXdzOiAwLFxyXG4gICAgICAgIGVzdGltYXRlZFJlYWNoOiAwXHJcbiAgICAgIH0sXHJcbiAgICAgIGV4ZWN1dGlvblRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdGlhbGl6ZVlvdVR1YmVDbGllbnQoKTogUHJvbWlzZTxhbnk+IHtcclxuICBjb25zb2xlLmxvZygnSW5pdGlhbGl6aW5nIFlvdVR1YmUgQVBJIGNsaWVudCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gTG9hZCBjcmVkZW50aWFscyBmcm9tIEFXUyBTZWNyZXRzIE1hbmFnZXJcclxuICAgIGNvbnN0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIEdldFNlY3JldFZhbHVlQ29tbWFuZCB9ID0gXHJcbiAgICAgIGF3YWl0IGltcG9ydCgnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcicpO1xyXG5cclxuICAgIGNvbnN0IHNlY3JldHNDbGllbnQgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc2VjcmV0c0NsaWVudC5zZW5kKG5ldyBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQoe1xyXG4gICAgICBTZWNyZXRJZDogcHJvY2Vzcy5lbnYuWU9VVFVCRV9DUkVERU5USUFMU19TRUNSRVQgfHwgJ3lvdXR1YmUtYXV0b21hdGlvbi9jcmVkZW50aWFscydcclxuICAgIH0pKTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLlNlY3JldFN0cmluZykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdVR1YmUgY3JlZGVudGlhbHMgbm90IGZvdW5kIGluIFNlY3JldHMgTWFuYWdlcicpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gSlNPTi5wYXJzZShyZXNwb25zZS5TZWNyZXRTdHJpbmcpO1xyXG4gICAgXHJcbiAgICAvLyBJbml0aWFsaXplIEdvb2dsZSBBUElzIGNsaWVudFxyXG4gICAgY29uc3QgeyBnb29nbGUgfSA9IGF3YWl0IGltcG9ydCgnZ29vZ2xlYXBpcycpO1xyXG4gICAgXHJcbiAgICBjb25zdCBvYXV0aDJDbGllbnQgPSBuZXcgZ29vZ2xlLmF1dGguT0F1dGgyKFxyXG4gICAgICBjcmVkZW50aWFscy5jbGllbnRfaWQsXHJcbiAgICAgIGNyZWRlbnRpYWxzLmNsaWVudF9zZWNyZXQsXHJcbiAgICAgIGNyZWRlbnRpYWxzLnJlZGlyZWN0X3VyaSB8fCAndXJuOmlldGY6d2c6b2F1dGg6Mi4wOm9vYidcclxuICAgICk7XHJcblxyXG4gICAgLy8gU2V0IHJlZnJlc2ggdG9rZW4gaWYgYXZhaWxhYmxlXHJcbiAgICBpZiAoY3JlZGVudGlhbHMucmVmcmVzaF90b2tlbikge1xyXG4gICAgICBvYXV0aDJDbGllbnQuc2V0Q3JlZGVudGlhbHMoe1xyXG4gICAgICAgIHJlZnJlc2hfdG9rZW46IGNyZWRlbnRpYWxzLnJlZnJlc2hfdG9rZW5cclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2UgaWYgKGNyZWRlbnRpYWxzLmFjY2Vzc190b2tlbikge1xyXG4gICAgICBvYXV0aDJDbGllbnQuc2V0Q3JlZGVudGlhbHMoe1xyXG4gICAgICAgIGFjY2Vzc190b2tlbjogY3JlZGVudGlhbHMuYWNjZXNzX3Rva2VuXHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyB2YWxpZCBZb3VUdWJlIGF1dGhlbnRpY2F0aW9uIHRva2VucyBmb3VuZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHlvdXR1YmUgPSBnb29nbGUueW91dHViZSh7XHJcbiAgICAgIHZlcnNpb246ICd2MycsXHJcbiAgICAgIGF1dGg6IG9hdXRoMkNsaWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1lvdVR1YmUgQVBJIGNsaWVudCBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcclxuICAgIHJldHVybiB7IHlvdXR1YmUsIG9hdXRoMkNsaWVudCB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgWW91VHViZSBjbGllbnQnLCBlcnJvcik7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlU0VPTWV0YWRhdGEoXHJcbiAgdG9waWM6IHN0cmluZyxcclxuICBrZXl3b3Jkczogc3RyaW5nW10sXHJcbiAgc2NyaXB0UHJvbXB0OiBzdHJpbmcsXHJcbiAgdmlkZW9NZXRhZGF0YTogYW55XHJcbik6IFByb21pc2U8e1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgZGVzY3JpcHRpb246IHN0cmluZztcclxuICB0YWdzOiBzdHJpbmdbXTtcclxuICBjYXRlZ29yeUlkOiBzdHJpbmc7XHJcbn0+IHtcclxuICBjb25zb2xlLmxvZygnR2VuZXJhdGluZyBTRU8tb3B0aW1pemVkIG1ldGFkYXRhJyk7XHJcblxyXG4gIC8vIEdlbmVyYXRlIGNvbXBlbGxpbmcgdGl0bGUgd2l0aCBrZXl3b3Jkc1xyXG4gIGNvbnN0IHRpdGxlID0gZ2VuZXJhdGVTRU9UaXRsZSh0b3BpYywga2V5d29yZHMpO1xyXG4gIFxyXG4gIC8vIEdlbmVyYXRlIGNvbXByZWhlbnNpdmUgZGVzY3JpcHRpb25cclxuICBjb25zdCBkZXNjcmlwdGlvbiA9IGdlbmVyYXRlU0VPRGVzY3JpcHRpb24odG9waWMsIGtleXdvcmRzLCBzY3JpcHRQcm9tcHQsIHZpZGVvTWV0YWRhdGEpO1xyXG4gIFxyXG4gIC8vIEdlbmVyYXRlIHJlbGV2YW50IHRhZ3NcclxuICBjb25zdCB0YWdzID0gZ2VuZXJhdGVTRU9UYWdzKHRvcGljLCBrZXl3b3Jkcyk7XHJcbiAgXHJcbiAgLy8gRGV0ZXJtaW5lIGFwcHJvcHJpYXRlIGNhdGVnb3J5XHJcbiAgY29uc3QgY2F0ZWdvcnlJZCA9IGdldENhdGVnb3J5SWQodG9waWMpO1xyXG5cclxuICBjb25zb2xlLmxvZygnU0VPIG1ldGFkYXRhIGdlbmVyYXRlZCcsIHtcclxuICAgIHRpdGxlLFxyXG4gICAgZGVzY3JpcHRpb25MZW5ndGg6IGRlc2NyaXB0aW9uLmxlbmd0aCxcclxuICAgIHRhZ3NDb3VudDogdGFncy5sZW5ndGgsXHJcbiAgICBjYXRlZ29yeUlkXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICB0aXRsZSxcclxuICAgIGRlc2NyaXB0aW9uLFxyXG4gICAgdGFncyxcclxuICAgIGNhdGVnb3J5SWRcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVNFT1RpdGxlKHRvcGljOiBzdHJpbmcsIGtleXdvcmRzOiBzdHJpbmdbXSk6IHN0cmluZyB7XHJcbiAgY29uc3QgdG9wS2V5d29yZHMgPSBrZXl3b3Jkcy5zbGljZSgwLCAzKTtcclxuICBjb25zdCBjdXJyZW50WWVhciA9IG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKTtcclxuICBcclxuICBjb25zdCB0aXRsZVRlbXBsYXRlcyA9IFtcclxuICAgIGAke3RvcEtleXdvcmRzWzBdfSBpbiAke3RvcGljfTogQ29tcGxldGUgJHtjdXJyZW50WWVhcn0gR3VpZGVgLFxyXG4gICAgYE1hc3RlciAke3RvcGljfTogJHt0b3BLZXl3b3Jkcy5zbGljZSgwLCAyKS5qb2luKCcgJiAnKX0gRXhwbGFpbmVkYCxcclxuICAgIGAke3RvcGljfSBTZWNyZXRzOiAke3RvcEtleXdvcmRzWzBdfSBUaXBzIFRoYXQgQWN0dWFsbHkgV29ya2AsXHJcbiAgICBgVWx0aW1hdGUgJHt0b3BpY30gVHV0b3JpYWw6ICR7dG9wS2V5d29yZHNbMF19IGZvciBCZWdpbm5lcnNgLFxyXG4gICAgYCR7Y3VycmVudFllYXJ9ICR7dG9waWN9IEd1aWRlOiAke3RvcEtleXdvcmRzLnNsaWNlKDAsIDIpLmpvaW4oJywgJyl9ICYgTW9yZWAsXHJcbiAgICBgV2h5IEV2ZXJ5b25lJ3MgVGFsa2luZyBBYm91dCAke3RvcEtleXdvcmRzWzBdfSBpbiAke3RvcGljfWAsXHJcbiAgICBgJHt0b3BpY30gQnJlYWt0aHJvdWdoOiAke3RvcEtleXdvcmRzWzBdfSBDaGFuZ2VzIEV2ZXJ5dGhpbmdgXHJcbiAgXTtcclxuXHJcbiAgY29uc3Qgc2VsZWN0ZWRUaXRsZSA9IHRpdGxlVGVtcGxhdGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRpdGxlVGVtcGxhdGVzLmxlbmd0aCldO1xyXG4gIFxyXG4gIC8vIEVuc3VyZSB0aXRsZSBpcyB1bmRlciBZb3VUdWJlJ3MgMTAwIGNoYXJhY3RlciBsaW1pdFxyXG4gIHJldHVybiBzZWxlY3RlZFRpdGxlLmxlbmd0aCA+IDEwMCA/IHNlbGVjdGVkVGl0bGUuc3Vic3RyaW5nKDAsIDk3KSArICcuLi4nIDogc2VsZWN0ZWRUaXRsZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVTRU9EZXNjcmlwdGlvbihcclxuICB0b3BpYzogc3RyaW5nLFxyXG4gIGtleXdvcmRzOiBzdHJpbmdbXSxcclxuICBzY3JpcHRQcm9tcHQ6IHN0cmluZyxcclxuICB2aWRlb01ldGFkYXRhOiBhbnlcclxuKTogc3RyaW5nIHtcclxuICBjb25zdCBjdXJyZW50WWVhciA9IG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKTtcclxuICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQodmlkZW9NZXRhZGF0YS5kdXJhdGlvbiAvIDYwKTsgLy8gQ29udmVydCB0byBtaW51dGVzXHJcbiAgXHJcbiAgY29uc3QgZGVzY3JpcHRpb24gPSBgXHJcbvCfjq8gSW4gdGhpcyBjb21wcmVoZW5zaXZlICR7ZHVyYXRpb259LW1pbnV0ZSAke3RvcGljfSBndWlkZSwgeW91J2xsIGRpc2NvdmVyIGV2ZXJ5dGhpbmcgeW91IG5lZWQgdG8ga25vdyBhYm91dCAke2tleXdvcmRzLnNsaWNlKDAsIDMpLmpvaW4oJywgJyl9LlxyXG5cclxu8J+TmiBXaGF0IFlvdSdsbCBMZWFybjpcclxu4oCiIEVzc2VudGlhbCAke3RvcGljfSBjb25jZXB0cyBhbmQgc3RyYXRlZ2llc1xyXG7igKIgUHJhY3RpY2FsIHRpcHMgZm9yICR7a2V5d29yZHNbMF19IHN1Y2Nlc3Ncclxu4oCiIFJlYWwtd29ybGQgZXhhbXBsZXMgYW5kIGNhc2Ugc3R1ZGllc1xyXG7igKIgU3RlcC1ieS1zdGVwIGltcGxlbWVudGF0aW9uIGd1aWRlXHJcbuKAoiBDb21tb24gbWlzdGFrZXMgdG8gYXZvaWRcclxuXHJcbvCflKUgS2V5IFRvcGljcyBDb3ZlcmVkOlxyXG4ke2tleXdvcmRzLnNsaWNlKDAsIDYpLm1hcChrZXl3b3JkID0+IGDigKIgJHtrZXl3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsga2V5d29yZC5zbGljZSgxKX1gKS5qb2luKCdcXG4nKX1cclxuXHJcbuKPsCBUaW1lc3RhbXBzOlxyXG4wOjAwIEludHJvZHVjdGlvbiB0byAke3RvcGljfVxyXG4xOjMwIFVuZGVyc3RhbmRpbmcgJHtrZXl3b3Jkc1swXX1cclxuMzo0NSBQcmFjdGljYWwgYXBwbGljYXRpb25zXHJcbjY6MjAgQWR2YW5jZWQgc3RyYXRlZ2llc1xyXG44OjE1IENvbW1vbiBwaXRmYWxsc1xyXG45OjMwIE5leHQgc3RlcHMgYW5kIHJlc291cmNlc1xyXG5cclxu8J+SoSBXaGV0aGVyIHlvdSdyZSBhIGJlZ2lubmVyIG9yIGxvb2tpbmcgdG8gYWR2YW5jZSB5b3VyICR7dG9waWN9IGtub3dsZWRnZSwgdGhpcyB2aWRlbyBwcm92aWRlcyBhY3Rpb25hYmxlIGluc2lnaHRzIHlvdSBjYW4gaW1wbGVtZW50IGltbWVkaWF0ZWx5LlxyXG5cclxu8J+OryBQZXJmZWN0IGZvcjogU3R1ZGVudHMsIHByb2Zlc3Npb25hbHMsIGVudHJlcHJlbmV1cnMsIGFuZCBhbnlvbmUgaW50ZXJlc3RlZCBpbiAke3RvcGljfSBhbmQgJHtrZXl3b3Jkcy5zbGljZSgwLCAyKS5qb2luKCcsICcpfS5cclxuXHJcbvCfk4ggU3RheSB1cGRhdGVkIHdpdGggdGhlIGxhdGVzdCAke3RvcGljfSB0cmVuZHMgYW5kIHN0cmF0ZWdpZXMgYnkgc3Vic2NyaWJpbmcgdG8gb3VyIGNoYW5uZWwhXHJcblxyXG4jJHt0b3BpYy5yZXBsYWNlKC9cXHMrL2csICcnKX0gIyR7a2V5d29yZHNbMF0ucmVwbGFjZSgvXFxzKy9nLCAnJyl9ICMke2N1cnJlbnRZZWFyfVR1dG9yaWFsICNFZHVjYXRpb24gI0xlYXJuaW5nXHJcblxyXG4tLS1cclxuVmlkZW8gY3JlYXRlZCB3aXRoIEFJLXBvd2VyZWQgY29udGVudCBnZW5lcmF0aW9uIHwgJHtjdXJyZW50WWVhcn1cclxuYC50cmltKCk7XHJcblxyXG4gIC8vIEVuc3VyZSBkZXNjcmlwdGlvbiBpcyB1bmRlciBZb3VUdWJlJ3MgNTAwMCBjaGFyYWN0ZXIgbGltaXRcclxuICByZXR1cm4gZGVzY3JpcHRpb24ubGVuZ3RoID4gNTAwMCA/IGRlc2NyaXB0aW9uLnN1YnN0cmluZygwLCA0OTk3KSArICcuLi4nIDogZGVzY3JpcHRpb247XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlU0VPVGFncyh0b3BpYzogc3RyaW5nLCBrZXl3b3Jkczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XHJcbiAgY29uc3QgY3VycmVudFllYXIgPSBuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCk7XHJcbiAgXHJcbiAgY29uc3QgYmFzZVRhZ3MgPSBbXHJcbiAgICB0b3BpYy50b0xvd2VyQ2FzZSgpLFxyXG4gICAgYCR7dG9waWMudG9Mb3dlckNhc2UoKX0gdHV0b3JpYWxgLFxyXG4gICAgYCR7dG9waWMudG9Mb3dlckNhc2UoKX0gZ3VpZGVgLFxyXG4gICAgYCR7dG9waWMudG9Mb3dlckNhc2UoKX0gJHtjdXJyZW50WWVhcn1gLFxyXG4gICAgJ2VkdWNhdGlvbicsXHJcbiAgICAnbGVhcm5pbmcnLFxyXG4gICAgJ3R1dG9yaWFsJyxcclxuICAgICdndWlkZScsXHJcbiAgICAndGlwcycsXHJcbiAgICAnc3RyYXRlZ2llcydcclxuICBdO1xyXG5cclxuICBjb25zdCBrZXl3b3JkVGFncyA9IGtleXdvcmRzLnNsaWNlKDAsIDEwKS5tYXAoa2V5d29yZCA9PiBrZXl3b3JkLnRvTG93ZXJDYXNlKCkpO1xyXG4gIFxyXG4gIGNvbnN0IHRvcGljU3BlY2lmaWNUYWdzID0gZ2V0VG9waWNTcGVjaWZpY1RhZ3ModG9waWMpO1xyXG4gIFxyXG4gIGNvbnN0IGFsbFRhZ3MgPSBbLi4uYmFzZVRhZ3MsIC4uLmtleXdvcmRUYWdzLCAuLi50b3BpY1NwZWNpZmljVGFnc107XHJcbiAgXHJcbiAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgYW5kIGxpbWl0IHRvIDUwMCBjaGFyYWN0ZXJzIHRvdGFsXHJcbiAgY29uc3QgdW5pcXVlVGFncyA9IFsuLi5uZXcgU2V0KGFsbFRhZ3MpXTtcclxuICBsZXQgdG90YWxMZW5ndGggPSAwO1xyXG4gIGNvbnN0IGZpbmFsVGFncyA9IFtdO1xyXG4gIFxyXG4gIGZvciAoY29uc3QgdGFnIG9mIHVuaXF1ZVRhZ3MpIHtcclxuICAgIGlmICh0b3RhbExlbmd0aCArIHRhZy5sZW5ndGggKyAxIDw9IDUwMCAmJiBmaW5hbFRhZ3MubGVuZ3RoIDwgMTUpIHtcclxuICAgICAgZmluYWxUYWdzLnB1c2godGFnKTtcclxuICAgICAgdG90YWxMZW5ndGggKz0gdGFnLmxlbmd0aCArIDE7IC8vICsxIGZvciBjb21tYVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICByZXR1cm4gZmluYWxUYWdzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRUb3BpY1NwZWNpZmljVGFncyh0b3BpYzogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gIGNvbnN0IHRvcGljVGFnczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG4gICAgaW52ZXN0aW5nOiBbJ2ZpbmFuY2UnLCAnbW9uZXknLCAnc3RvY2tzJywgJ2V0ZicsICdwb3J0Zm9saW8nLCAnd2VhbHRoJywgJ2ZpbmFuY2lhbCBwbGFubmluZyddLFxyXG4gICAgZWR1Y2F0aW9uOiBbJ3N0dWR5IHRpcHMnLCAnbGVhcm5pbmcgbWV0aG9kcycsICdhY2FkZW1pYyBzdWNjZXNzJywgJ3Byb2R1Y3Rpdml0eScsICdza2lsbHMnXSxcclxuICAgIHRvdXJpc206IFsndHJhdmVsJywgJ2Rlc3RpbmF0aW9ucycsICd2YWNhdGlvbicsICdhZHZlbnR1cmUnLCAnY3VsdHVyZScsICdleHBsb3JlJ10sXHJcbiAgICB0ZWNobm9sb2d5OiBbJ3RlY2gnLCAnaW5ub3ZhdGlvbicsICdkaWdpdGFsJywgJ2Z1dHVyZScsICdnYWRnZXRzJywgJ3NvZnR3YXJlJ10sXHJcbiAgICBoZWFsdGg6IFsnd2VsbG5lc3MnLCAnZml0bmVzcycsICdudXRyaXRpb24nLCAnbGlmZXN0eWxlJywgJ21lZGljYWwnLCAnd2VsbGJlaW5nJ11cclxuICB9O1xyXG5cclxuICByZXR1cm4gdG9waWNUYWdzW3RvcGljLnRvTG93ZXJDYXNlKCldIHx8IFsnZ2VuZXJhbCcsICdpbmZvcm1hdGlvbicsICdrbm93bGVkZ2UnXTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q2F0ZWdvcnlJZCh0b3BpYzogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBjYXRlZ29yeU1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgIGludmVzdGluZzogJzI1JywgLy8gTmV3cyAmIFBvbGl0aWNzIChjbG9zZXN0IGZvciBmaW5hbmNpYWwgY29udGVudClcclxuICAgIGVkdWNhdGlvbjogJzI3JywgLy8gRWR1Y2F0aW9uXHJcbiAgICB0b3VyaXNtOiAnMTknLCAvLyBUcmF2ZWwgJiBFdmVudHNcclxuICAgIHRlY2hub2xvZ3k6ICcyOCcsIC8vIFNjaWVuY2UgJiBUZWNobm9sb2d5XHJcbiAgICBoZWFsdGg6ICcyNicsIC8vIEhvd3RvICYgU3R5bGUgKGNsb3Nlc3QgZm9yIGhlYWx0aC93ZWxsbmVzcylcclxuICAgIGVudGVydGFpbm1lbnQ6ICcyNCcgLy8gRW50ZXJ0YWlubWVudFxyXG4gIH07XHJcblxyXG4gIHJldHVybiBjYXRlZ29yeU1hcFt0b3BpYy50b0xvd2VyQ2FzZSgpXSB8fCAnMjcnOyAvLyBEZWZhdWx0IHRvIEVkdWNhdGlvblxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFZpZGVvRnJvbVMzKHMzS2V5OiBzdHJpbmcpOiBQcm9taXNlPEJ1ZmZlcj4ge1xyXG4gIGNvbnNvbGUubG9nKCdEb3dubG9hZGluZyB2aWRlbyBmcm9tIFMzJywgeyBzM0tleSB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgUzNDbGllbnQsIEdldE9iamVjdENvbW1hbmQgfSA9IGF3YWl0IGltcG9ydCgnQGF3cy1zZGsvY2xpZW50LXMzJyk7XHJcbiAgICBcclxuICAgIGNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIH0pO1xyXG4gICAgXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHMzQ2xpZW50LnNlbmQobmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICBCdWNrZXQ6IHByb2Nlc3MuZW52LlZJREVPX0JVQ0tFVCxcclxuICAgICAgS2V5OiBzM0tleVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2UuQm9keSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZGVvIGZpbGUgbm90IGZvdW5kIGluIFMzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29udmVydCBzdHJlYW0gdG8gYnVmZmVyXHJcbiAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICBcclxuICAgIGlmIChyZXNwb25zZS5Cb2R5IGluc3RhbmNlb2YgQnVmZmVyKSB7XHJcbiAgICAgIHJldHVybiByZXNwb25zZS5Cb2R5O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBIYW5kbGUgcmVhZGFibGUgc3RyZWFtXHJcbiAgICBjb25zdCBzdHJlYW0gPSByZXNwb25zZS5Cb2R5IGFzIGFueTtcclxuICAgIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2Ygc3RyZWFtKSB7XHJcbiAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7XHJcbiAgICBjb25zb2xlLmxvZygnVmlkZW8gZG93bmxvYWRlZCBzdWNjZXNzZnVsbHknLCB7IHNpemU6IGJ1ZmZlci5sZW5ndGggfSk7XHJcbiAgICBcclxuICAgIHJldHVybiBidWZmZXI7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZG93bmxvYWQgdmlkZW8gZnJvbSBTMycsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdXBsb2FkVmlkZW9Ub1lvdVR1YmUoXHJcbiAgeW91dHViZUNsaWVudDogYW55LFxyXG4gIHZpZGVvQnVmZmVyOiBCdWZmZXIsXHJcbiAgbWV0YWRhdGE6IGFueSxcclxuICB1cGxvYWRDb25maWc6IGFueVxyXG4pOiBQcm9taXNlPHtcclxuICB2aWRlb0lkOiBzdHJpbmc7XHJcbiAgdmlkZW9Vcmw6IHN0cmluZztcclxuICB1cGxvYWRUaW1lOiBudW1iZXI7XHJcbiAgcHJpdmFjeVN0YXR1czogc3RyaW5nO1xyXG4gIHRodW1ibmFpbFVybD86IHN0cmluZztcclxufT4ge1xyXG4gIGNvbnNvbGUubG9nKCdVcGxvYWRpbmcgdmlkZW8gdG8gWW91VHViZScpO1xyXG5cclxuICBjb25zdCB1cGxvYWRTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgeyB5b3V0dWJlIH0gPSB5b3V0dWJlQ2xpZW50O1xyXG4gICAgXHJcbiAgICBjb25zdCB1cGxvYWRQYXJhbXMgPSB7XHJcbiAgICAgIHBhcnQ6IFsnc25pcHBldCcsICdzdGF0dXMnXSxcclxuICAgICAgcmVxdWVzdEJvZHk6IHtcclxuICAgICAgICBzbmlwcGV0OiB7XHJcbiAgICAgICAgICB0aXRsZTogbWV0YWRhdGEudGl0bGUsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogbWV0YWRhdGEuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICB0YWdzOiBtZXRhZGF0YS50YWdzLFxyXG4gICAgICAgICAgY2F0ZWdvcnlJZDogbWV0YWRhdGEuY2F0ZWdvcnlJZCxcclxuICAgICAgICAgIGRlZmF1bHRMYW5ndWFnZTogJ2VuJyxcclxuICAgICAgICAgIGRlZmF1bHRBdWRpb0xhbmd1YWdlOiAnZW4nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0dXM6IHtcclxuICAgICAgICAgIHByaXZhY3lTdGF0dXM6IHVwbG9hZENvbmZpZz8ucHJpdmFjeVN0YXR1cyB8fCAncHVibGljJyxcclxuICAgICAgICAgIHNlbGZEZWNsYXJlZE1hZGVGb3JLaWRzOiBmYWxzZSxcclxuICAgICAgICAgIHB1Ymxpc2hBdDogdXBsb2FkQ29uZmlnPy5wdWJsaXNoQXRcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIG1lZGlhOiB7XHJcbiAgICAgICAgYm9keTogdmlkZW9CdWZmZXJcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHlvdXR1YmUudmlkZW9zLmluc2VydCh1cGxvYWRQYXJhbXMpO1xyXG4gICAgXHJcbiAgICBjb25zdCB2aWRlb0lkID0gcmVzcG9uc2UuZGF0YS5pZDtcclxuICAgIGNvbnN0IHZpZGVvVXJsID0gYGh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9JHt2aWRlb0lkfWA7XHJcbiAgICBjb25zdCB1cGxvYWRUaW1lID0gRGF0ZS5ub3coKSAtIHVwbG9hZFN0YXJ0VGltZTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnVmlkZW8gdXBsb2FkZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICB2aWRlb0lkLFxyXG4gICAgICB2aWRlb1VybCxcclxuICAgICAgdXBsb2FkVGltZSxcclxuICAgICAgdGl0bGU6IG1ldGFkYXRhLnRpdGxlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZXQgdGh1bWJuYWlsIFVSTFxyXG4gICAgbGV0IHRodW1ibmFpbFVybDtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHZpZGVvRGV0YWlscyA9IGF3YWl0IHlvdXR1YmUudmlkZW9zLmxpc3Qoe1xyXG4gICAgICAgIHBhcnQ6IFsnc25pcHBldCddLFxyXG4gICAgICAgIGlkOiBbdmlkZW9JZF1cclxuICAgICAgfSk7XHJcbiAgICAgIHRodW1ibmFpbFVybCA9IHZpZGVvRGV0YWlscy5kYXRhLml0ZW1zPy5bMF0/LnNuaXBwZXQ/LnRodW1ibmFpbHM/LmhpZ2g/LnVybDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGdldCB0aHVtYm5haWwgVVJMJywgZXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHZpZGVvSWQsXHJcbiAgICAgIHZpZGVvVXJsLFxyXG4gICAgICB1cGxvYWRUaW1lLFxyXG4gICAgICBwcml2YWN5U3RhdHVzOiB1cGxvYWRDb25maWc/LnByaXZhY3lTdGF0dXMgfHwgJ3B1YmxpYycsXHJcbiAgICAgIHRodW1ibmFpbFVybFxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1lvdVR1YmUgdXBsb2FkIGZhaWxlZCcsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc3RvcmVWaWRlb01ldGFkYXRhKFxyXG4gIGV2ZW50OiBZb3VUdWJlVXBsb2FkZXJFdmVudCxcclxuICB1cGxvYWRSZXN1bHQ6IGFueSxcclxuICBtZXRhZGF0YTogYW55XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnNvbGUubG9nKCdTdG9yaW5nIHZpZGVvIG1ldGFkYXRhIGluIER5bmFtb0RCJyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB2aWRlb1JlcG9zaXRvcnkgPSBuZXcgVmlkZW9SZXBvc2l0b3J5KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB2aWRlb01ldGFkYXRhOiBWaWRlb01ldGFkYXRhID0ge1xyXG4gICAgICB2aWRlb0lkOiB1cGxvYWRSZXN1bHQudmlkZW9JZCxcclxuICAgICAgeW91dHViZUlkOiB1cGxvYWRSZXN1bHQudmlkZW9JZCxcclxuICAgICAgdGl0bGU6IG1ldGFkYXRhLnRpdGxlLFxyXG4gICAgICBkZXNjcmlwdGlvbjogbWV0YWRhdGEuZGVzY3JpcHRpb24sXHJcbiAgICAgIHRhZ3M6IG1ldGFkYXRhLnRhZ3MsXHJcbiAgICAgIGNhdGVnb3J5SWQ6IG1ldGFkYXRhLmNhdGVnb3J5SWQsXHJcbiAgICAgIHVwbG9hZERhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdLCAvLyBZWVlZLU1NLUREIGZvcm1hdFxyXG4gICAgICBwcml2YWN5U3RhdHVzOiB1cGxvYWRSZXN1bHQucHJpdmFjeVN0YXR1cyxcclxuICAgICAgdmlld0NvdW50OiAwLFxyXG4gICAgICBsaWtlQ291bnQ6IDAsXHJcbiAgICAgIGNvbW1lbnRDb3VudDogMCxcclxuICAgICAgcmV2ZW51ZTogMCxcclxuICAgICAgc291cmNlVHJlbmRzOiBbZXZlbnQudHJlbmRJZF0sXHJcbiAgICAgIGdlbmVyYXRpb25Db3N0OiAwLFxyXG4gICAgICBwcm9jZXNzaW5nQ29zdDogMCxcclxuICAgICAgczNLZXk6IGV2ZW50LnByb2Nlc3NlZFZpZGVvUzNLZXksXHJcbiAgICAgIHN0YXR1czogVmlkZW9TdGF0dXMuUFVCTElTSEVELFxyXG4gICAgICBwZXJmb3JtYW5jZU1ldHJpY3M6IHt9LFxyXG4gICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgIH07XHJcblxyXG4gICAgYXdhaXQgdmlkZW9SZXBvc2l0b3J5LnNhdmVWaWRlbyh2aWRlb01ldGFkYXRhKTtcclxuICAgIGNvbnNvbGUubG9nKCdWaWRlbyBtZXRhZGF0YSBzdG9yZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc3RvcmUgdmlkZW8gbWV0YWRhdGEnLCBlcnJvcik7XHJcbiAgICAvLyBEb24ndCB0aHJvdyAtIG1ldGFkYXRhIHN0b3JhZ2UgZmFpbHVyZSBzaG91bGRuJ3QgZmFpbCB0aGUgdXBsb2FkXHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB0cmFja0luaXRpYWxQZXJmb3JtYW5jZShcclxuICB2aWRlb0lkOiBzdHJpbmcsXHJcbiAgdG9waWM6IHN0cmluZ1xyXG4pOiBQcm9taXNlPHtcclxuICB2aWV3czogbnVtYmVyO1xyXG4gIGVzdGltYXRlZFJlYWNoOiBudW1iZXI7XHJcbn0+IHtcclxuICBjb25zb2xlLmxvZygnVHJhY2tpbmcgaW5pdGlhbCB2aWRlbyBwZXJmb3JtYW5jZScpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRm9yIG5ld2x5IHVwbG9hZGVkIHZpZGVvcywgaW5pdGlhbCBtZXRyaWNzIHdpbGwgYmUgMFxyXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBjYW4gYmUgZW5oYW5jZWQgdG8gcHJvdmlkZSBlc3RpbWF0ZXMgYmFzZWQgb24gdG9waWMgcGVyZm9ybWFuY2VcclxuICAgIGNvbnN0IHRvcGljTXVsdGlwbGllcnM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgICAgIGludmVzdGluZzogMS4yLFxyXG4gICAgICBlZHVjYXRpb246IDEuMCxcclxuICAgICAgdG91cmlzbTogMC45LFxyXG4gICAgICB0ZWNobm9sb2d5OiAxLjEsXHJcbiAgICAgIGhlYWx0aDogMS4wXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGJhc2VFc3RpbWF0ZSA9IDEwMDsgLy8gQmFzZSBlc3RpbWF0ZWQgcmVhY2ggZm9yIG5ldyB2aWRlb3NcclxuICAgIGNvbnN0IHRvcGljTXVsdGlwbGllciA9IHRvcGljTXVsdGlwbGllcnNbdG9waWMudG9Mb3dlckNhc2UoKV0gfHwgMS4wO1xyXG4gICAgY29uc3QgZXN0aW1hdGVkUmVhY2ggPSBNYXRoLnJvdW5kKGJhc2VFc3RpbWF0ZSAqIHRvcGljTXVsdGlwbGllcik7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdmlld3M6IDAsIC8vIE5ldyB2aWRlb3Mgc3RhcnQgd2l0aCAwIHZpZXdzXHJcbiAgICAgIGVzdGltYXRlZFJlYWNoXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHRyYWNrIGluaXRpYWwgcGVyZm9ybWFuY2UnLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2aWV3czogMCxcclxuICAgICAgZXN0aW1hdGVkUmVhY2g6IDEwMFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hFcnJvck1ldHJpY3MoZXJyb3JNZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBDbG91ZFdhdGNoQ2xpZW50LCBQdXRNZXRyaWNEYXRhQ29tbWFuZCB9ID0gYXdhaXQgaW1wb3J0KCdAYXdzLXNkay9jbGllbnQtY2xvdWR3YXRjaCcpO1xyXG4gICAgXHJcbiAgICBjb25zdCBjbG91ZHdhdGNoID0gbmV3IENsb3VkV2F0Y2hDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGNsb3Vkd2F0Y2guc2VuZChuZXcgUHV0TWV0cmljRGF0YUNvbW1hbmQoe1xyXG4gICAgICBOYW1lc3BhY2U6ICdZb3VUdWJlQXV0b21hdGlvbi9VcGxvYWRlcicsXHJcbiAgICAgIE1ldHJpY0RhdGE6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBNZXRyaWNOYW1lOiAnVXBsb2FkRXJyb3JzJyxcclxuICAgICAgICAgIFZhbHVlOiAxLFxyXG4gICAgICAgICAgVW5pdDogJ0NvdW50JyBhcyBjb25zdCxcclxuICAgICAgICAgIFRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIE5hbWU6ICdFcnJvclR5cGUnLFxyXG4gICAgICAgICAgICAgIFZhbHVlOiBlcnJvck1lc3NhZ2Uuc3Vic3RyaW5nKDAsIDUwKSAvLyBUcnVuY2F0ZSBmb3IgZGltZW5zaW9uIHZhbHVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIF1cclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH0pKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHB1Ymxpc2ggZXJyb3IgbWV0cmljcycsIGVycm9yKTtcclxuICB9XHJcbn0iXX0=