import { Handler, Context } from 'aws-lambda';

export interface ThumbnailGeneratorEvent {
  topic: string;
  title: string;
  keywords: string[];
  videoS3Key: string;
  trendId: string;
}

export interface ThumbnailGeneratorResponse {
  success: boolean;
  thumbnailS3Key?: string;
  thumbnailUrl?: string;
  generationCost: number;
  executionTime: number;
  error?: string;
}

export const handler: Handler<ThumbnailGeneratorEvent, ThumbnailGeneratorResponse> = async (
  event: ThumbnailGeneratorEvent,
  context: Context
): Promise<ThumbnailGeneratorResponse> => {
  const startTime = Date.now();
  
  console.log('Thumbnail Generator Lambda started', {
    requestId: context.awsRequestId,
    topic: event.topic,
    title: event.title,
    trendId: event.trendId
  });

  try {
    // Generate thumbnail using Amazon Bedrock Titan Image Generator
    const thumbnailResult = await generateThumbnail(event);
    
    const executionTime = Date.now() - startTime;
    
    console.log('Thumbnail generation completed successfully', {
      thumbnailS3Key: thumbnailResult.s3Key,
      generationCost: thumbnailResult.cost,
      executionTime
    });

    return {
      success: true,
      thumbnailS3Key: thumbnailResult.s3Key,
      thumbnailUrl: thumbnailResult.url,
      generationCost: thumbnailResult.cost,
      executionTime
    };

  } catch (error) {
    console.error('Thumbnail generation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId
    });

    return {
      success: false,
      generationCost: 0,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

async function generateThumbnail(event: ThumbnailGeneratorEvent): Promise<{
  s3Key: string;
  url: string;
  cost: number;
}> {
  console.log('Starting thumbnail generation with Bedrock Titan Image Generator');

  // Mock mode for testing
  if (process.env.MOCK_THUMBNAIL_GENERATION === 'true') {
    console.log('Mock mode: Simulating thumbnail generation');
    const s3OutputKey = `thumbnails/${event.topic}/${event.trendId}_thumbnail.jpg`;
    
    return {
      s3Key: s3OutputKey,
      url: `https://example.com/mock-thumbnail.jpg`,
      cost: 0.02
    };
  }

  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = 
      await import('@aws-sdk/client-bedrock-runtime');

    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Create topic-specific thumbnail prompt
    const thumbnailPrompt = createThumbnailPrompt(event.topic, event.title, event.keywords);
    
    const s3OutputKey = `thumbnails/${event.topic}/${event.trendId}_thumbnail.jpg`;

    // Generate thumbnail using Bedrock Titan Image Generator
    const imageGenParams = {
      modelId: 'amazon.titan-image-generator-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: thumbnailPrompt,
          negativeText: 'blurry, low quality, distorted, watermark, signature',
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          height: 720,
          width: 1280,
          cfgScale: 8.0,
          seed: Math.floor(Math.random() * 1000000)
        }
      })
    };

    console.log('Generating thumbnail with Titan Image Generator', {
      prompt: thumbnailPrompt,
      s3OutputKey
    });

    const response = await bedrock.send(new InvokeModelCommand(imageGenParams));
    
    if (!response.body) {
      throw new Error('No response body from Bedrock Titan Image Generator');
    }

    // Parse response and extract image data
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const imageData = responseBody.images[0];

    // Upload thumbnail to S3
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: process.env.AWS_REGION });

    const imageBuffer = Buffer.from(imageData, 'base64');
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.VIDEO_BUCKET,
      Key: s3OutputKey,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        topic: event.topic,
        title: event.title,
        trendId: event.trendId,
        generatedAt: new Date().toISOString()
      }
    }));

    const thumbnailUrl = `https://${process.env.VIDEO_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3OutputKey}`;

    console.log('Thumbnail uploaded to S3', {
      s3Key: s3OutputKey,
      url: thumbnailUrl,
      size: imageBuffer.length
    });

    return {
      s3Key: s3OutputKey,
      url: thumbnailUrl,
      cost: 0.02 // Estimated cost for Titan Image Generator
    };

  } catch (error) {
    console.error('Bedrock thumbnail generation failed', error);
    
    // Fallback: Create a simple text-based thumbnail
    return await createFallbackThumbnail(event);
  }
}

function createThumbnailPrompt(topic: string, title: string, keywords: string[]): string {
  const topicPrompts: Record<string, string> = {
    investing: `Create a professional financial thumbnail showing: modern trading screens with green upward charts, financial data displays, ETF and stock symbols, professional business environment. Include bold text overlay "${title}". Style: clean, trustworthy, financial news aesthetic with blue and green color scheme.`,
    
    education: `Create an educational thumbnail showing: modern classroom or study environment, books, digital learning tools, graduation cap, lightbulb icons. Include bold text overlay "${title}". Style: bright, inspiring, academic with blue and orange color scheme.`,
    
    technology: `Create a tech-focused thumbnail showing: futuristic interfaces, AI graphics, digital displays, modern gadgets, innovation symbols. Include bold text overlay "${title}". Style: sleek, modern, high-tech with blue and purple color scheme.`,
    
    tourism: `Create a travel thumbnail showing: beautiful destinations, landmarks, adventure scenes, cultural sites, travel icons. Include bold text overlay "${title}". Style: vibrant, inspiring, wanderlust with warm color scheme.`,
    
    health: `Create a health and wellness thumbnail showing: fitness activities, healthy food, medical symbols, wellness icons, active lifestyle. Include bold text overlay "${title}". Style: clean, energetic, healthy with green and blue color scheme.`
  };

  const basePrompt = topicPrompts[topic.toLowerCase()] || 
    `Create a professional thumbnail for "${title}" with relevant imagery and bold text overlay. Style: clean, engaging, high-quality.`;

  // Add keywords to enhance the prompt
  const keywordText = keywords.slice(0, 3).join(', ');
  return `${basePrompt} Keywords: ${keywordText}. High resolution, YouTube thumbnail format, eye-catching, professional quality.`;
}

async function createFallbackThumbnail(event: ThumbnailGeneratorEvent): Promise<{
  s3Key: string;
  url: string;
  cost: number;
}> {
  console.log('Creating fallback thumbnail using text-based approach');
  
  // For now, return a placeholder - in production, this could use Canvas API or similar
  const s3OutputKey = `thumbnails/${event.topic}/${event.trendId}_fallback.jpg`;
  
  return {
    s3Key: s3OutputKey,
    url: `https://via.placeholder.com/1280x720/0066cc/ffffff?text=${encodeURIComponent(event.title)}`,
    cost: 0
  };
}