import { Handler, Context } from 'aws-lambda';
import { VideoRepository } from '../../src/repositories/video-repository';
import { VideoMetadata, VideoStatus } from '../../src/models/video-metadata';

export interface YouTubeUploaderEvent {
  processedVideoS3Key: string;
  topic: string;
  trendId: string;
  scriptPrompt: string;
  keywords: string[];
  videoMetadata: {
    duration: number;
    fileSize: number;
    format: string;
    resolution: string;
    isYouTubeOptimized: boolean;
  };
  uploadConfig?: {
    privacyStatus: 'public' | 'unlisted' | 'private';
    categoryId: string;
    publishAt?: string;
  };
}

export interface YouTubeUploaderResponse {
  success: boolean;
  youtubeVideoId?: string;
  videoUrl?: string;
  uploadedMetadata: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: string;
    thumbnailUrl?: string;
  };
  performanceTracking: {
    uploadTime: number;
    initialViews: number;
    estimatedReach: number;
  };
  executionTime: number;
  error?: string;
}

export const handler: Handler<YouTubeUploaderEvent, YouTubeUploaderResponse> = async (
  event: YouTubeUploaderEvent,
  context: Context
): Promise<YouTubeUploaderResponse> => {
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
    const optimizedMetadata = await generateSEOMetadata(
      event.topic,
      event.keywords,
      event.scriptPrompt,
      event.videoMetadata
    );

    // Download video from S3 for upload
    const videoBuffer = await downloadVideoFromS3(event.processedVideoS3Key);
    
    // Upload video to YouTube
    const uploadResult = await uploadVideoToYouTube(
      youtubeClient,
      videoBuffer,
      optimizedMetadata,
      event.uploadConfig
    );

    // Store video metadata in DynamoDB
    await storeVideoMetadata(event, uploadResult, optimizedMetadata);

    // Track initial performance
    const performanceTracking = await trackInitialPerformance(
      uploadResult.videoId,
      event.topic
    );

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

  } catch (error) {
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

async function initializeYouTubeClient(): Promise<any> {
  console.log('Initializing YouTube API client');

  try {
    // Load credentials from AWS Secrets Manager
    const { SecretsManagerClient, GetSecretValueCommand } = 
      await import('@aws-sdk/client-secrets-manager');

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
    const { google } = await import('googleapis');
    
    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob'
    );

    // Set refresh token if available
    if (credentials.refresh_token) {
      oauth2Client.setCredentials({
        refresh_token: credentials.refresh_token
      });
    } else if (credentials.access_token) {
      oauth2Client.setCredentials({
        access_token: credentials.access_token
      });
    } else {
      throw new Error('No valid YouTube authentication tokens found');
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    console.log('YouTube API client initialized successfully');
    return { youtube, oauth2Client };

  } catch (error) {
    console.error('Failed to initialize YouTube client', error);
    throw error;
  }
}

async function generateSEOMetadata(
  topic: string,
  keywords: string[],
  scriptPrompt: string,
  videoMetadata: any
): Promise<{
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
}> {
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

function generateSEOTitle(topic: string, keywords: string[]): string {
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

function generateSEODescription(
  topic: string,
  keywords: string[],
  scriptPrompt: string,
  videoMetadata: any
): string {
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

function generateSEOTags(topic: string, keywords: string[]): string[] {
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

function getTopicSpecificTags(topic: string): string[] {
  const topicTags: Record<string, string[]> = {
    investing: ['finance', 'money', 'stocks', 'etf', 'portfolio', 'wealth', 'financial planning'],
    education: ['study tips', 'learning methods', 'academic success', 'productivity', 'skills'],
    tourism: ['travel', 'destinations', 'vacation', 'adventure', 'culture', 'explore'],
    technology: ['tech', 'innovation', 'digital', 'future', 'gadgets', 'software'],
    health: ['wellness', 'fitness', 'nutrition', 'lifestyle', 'medical', 'wellbeing']
  };

  return topicTags[topic.toLowerCase()] || ['general', 'information', 'knowledge'];
}

function getCategoryId(topic: string): string {
  const categoryMap: Record<string, string> = {
    investing: '25', // News & Politics (closest for financial content)
    education: '27', // Education
    tourism: '19', // Travel & Events
    technology: '28', // Science & Technology
    health: '26', // Howto & Style (closest for health/wellness)
    entertainment: '24' // Entertainment
  };

  return categoryMap[topic.toLowerCase()] || '27'; // Default to Education
}

async function downloadVideoFromS3(s3Key: string): Promise<Buffer> {
  console.log('Downloading video from S3', { s3Key });

  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.VIDEO_BUCKET,
      Key: s3Key
    }));

    if (!response.Body) {
      throw new Error('Video file not found in S3');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    
    if (response.Body instanceof Buffer) {
      return response.Body;
    }
    
    // Handle readable stream
    const stream = response.Body as any;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    console.log('Video downloaded successfully', { size: buffer.length });
    
    return buffer;

  } catch (error) {
    console.error('Failed to download video from S3', error);
    throw error;
  }
}

async function uploadVideoToYouTube(
  youtubeClient: any,
  videoBuffer: Buffer,
  metadata: any,
  uploadConfig: any
): Promise<{
  videoId: string;
  videoUrl: string;
  uploadTime: number;
  privacyStatus: string;
  thumbnailUrl?: string;
}> {
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
    } catch (error) {
      console.warn('Failed to get thumbnail URL', error);
    }

    return {
      videoId,
      videoUrl,
      uploadTime,
      privacyStatus: uploadConfig?.privacyStatus || 'public',
      thumbnailUrl
    };

  } catch (error) {
    console.error('YouTube upload failed', error);
    throw error;
  }
}

async function storeVideoMetadata(
  event: YouTubeUploaderEvent,
  uploadResult: any,
  metadata: any
): Promise<void> {
  console.log('Storing video metadata in DynamoDB');

  try {
    const videoRepository = new VideoRepository({
      region: process.env.AWS_REGION
    });

    const videoMetadata: VideoMetadata = {
      videoId: uploadResult.videoId,
      youtubeId: uploadResult.videoId,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      categoryId: metadata.categoryId,
      uploadDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      privacyStatus: uploadResult.privacyStatus,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      revenue: 0,
      sourceTrends: [event.trendId],
      generationCost: 0,
      processingCost: 0,
      s3Key: event.processedVideoS3Key,
      status: VideoStatus.PUBLISHED,
      performanceMetrics: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await videoRepository.saveVideo(videoMetadata);
    console.log('Video metadata stored successfully');

  } catch (error) {
    console.error('Failed to store video metadata', error);
    // Don't throw - metadata storage failure shouldn't fail the upload
  }
}

async function trackInitialPerformance(
  videoId: string,
  topic: string
): Promise<{
  views: number;
  estimatedReach: number;
}> {
  console.log('Tracking initial video performance');

  try {
    // For newly uploaded videos, initial metrics will be 0
    // This function can be enhanced to provide estimates based on topic performance
    const topicMultipliers: Record<string, number> = {
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
      views: 0, // New videos start with 0 views
      estimatedReach
    };

  } catch (error) {
    console.error('Failed to track initial performance', error);
    return {
      views: 0,
      estimatedReach: 100
    };
  }
}

async function publishErrorMetrics(errorMessage: string): Promise<void> {
  try {
    const { CloudWatchClient, PutMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');
    
    const cloudwatch = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'YouTubeAutomation/Uploader',
      MetricData: [
        {
          MetricName: 'UploadErrors',
          Value: 1,
          Unit: 'Count' as const,
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
  } catch (error) {
    console.error('Failed to publish error metrics', error);
  }
}