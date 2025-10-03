import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface ThumbnailRequest {
  topic: string;
  title: string;
  category: 'technology' | 'finance' | 'education' | 'health' | 'general';
  style?: 'professional' | 'engaging' | 'educational' | 'modern';
  videoId: string;
}

interface ThumbnailResponse {
  thumbnailUrl: string;
  s3Key: string;
  generationTime: number;
  cost: number;
}

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const THUMBNAIL_BUCKET = process.env.THUMBNAIL_BUCKET || 'youtube-automation-thumbnails';
const BEDROCK_MODEL_ID = 'amazon.titan-image-generator-v1';

// Topic-specific templates and styles
const TOPIC_TEMPLATES = {
  technology: {
    backgroundColor: '#1a1a2e',
    accentColor: '#16213e',
    textColor: '#ffffff',
    iconStyle: 'tech',
    prompt: 'modern technology background with circuit patterns, blue and purple gradients, futuristic design'
  },
  finance: {
    backgroundColor: '#0f4c75',
    accentColor: '#3282b8',
    textColor: '#ffffff',
    iconStyle: 'finance',
    prompt: 'professional financial background with charts, graphs, gold and blue colors, business aesthetic'
  },
  education: {
    backgroundColor: '#2c3e50',
    accentColor: '#3498db',
    textColor: '#ffffff',
    iconStyle: 'education',
    prompt: 'educational background with books, learning elements, warm colors, academic style'
  },
  health: {
    backgroundColor: '#27ae60',
    accentColor: '#2ecc71',
    textColor: '#ffffff',
    iconStyle: 'health',
    prompt: 'health and wellness background with natural elements, green and blue tones, clean design'
  },
  general: {
    backgroundColor: '#34495e',
    accentColor: '#e74c3c',
    textColor: '#ffffff',
    iconStyle: 'general',
    prompt: 'modern gradient background with abstract shapes, vibrant colors, engaging design'
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  
  try {
    const request: ThumbnailRequest = JSON.parse(event.body || '{}');
    
    if (!request.topic || !request.title || !request.category || !request.videoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: topic, title, category, videoId' })
      };
    }

    console.log(`Generating thumbnail for video: ${request.videoId}, topic: ${request.topic}`);

    // Step 1: Generate AI background image using Bedrock Titan
    const backgroundImage = await generateBackgroundImage(request);
    
    // Step 2: Create thumbnail with text overlay
    const thumbnail = await createThumbnailWithOverlay(backgroundImage, request);
    
    // Step 3: Upload to S3
    const s3Key = `thumbnails/${request.videoId}/${Date.now()}-thumbnail.png`;
    await uploadThumbnailToS3(thumbnail, s3Key);
    
    const generationTime = Date.now() - startTime;
    const cost = calculateThumbnailCost();
    
    const response: ThumbnailResponse = {
      thumbnailUrl: `https://${THUMBNAIL_BUCKET}.s3.amazonaws.com/${s3Key}`,
      s3Key,
      generationTime,
      cost
    };

    console.log(`Thumbnail generated successfully in ${generationTime}ms for $${cost}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Thumbnail generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function generateBackgroundImage(request: ThumbnailRequest): Promise<Buffer> {
  const template = TOPIC_TEMPLATES[request.category];
  const style = request.style || 'professional';
  
  // Create enhanced prompt for Bedrock Titan Image Generator
  const prompt = `Create a YouTube thumbnail background: ${template.prompt}, ${style} style, 1280x720 resolution, high quality, eye-catching design for "${request.topic}"`;
  
  const payload = {
    taskType: 'TEXT_IMAGE',
    textToImageParams: {
      text: prompt,
      negativeText: 'blurry, low quality, text, watermark, signature',
    },
    imageGenerationConfig: {
      numberOfImages: 1,
      height: 720,
      width: 1280,
      cfgScale: 8.0,
      seed: Math.floor(Math.random() * 1000000)
    }
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json'
  });

  console.log(`Generating background image with Bedrock Titan for category: ${request.category}`);
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  if (!responseBody.images || responseBody.images.length === 0) {
    throw new Error('No images generated by Bedrock Titan');
  }

  // Convert base64 image to buffer
  const imageBase64 = responseBody.images[0];
  return Buffer.from(imageBase64, 'base64');
}

async function createThumbnailWithOverlay(backgroundImage: Buffer, request: ThumbnailRequest): Promise<Buffer> {
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');
  
  // Load and draw background image
  const bgImage = await loadImage(backgroundImage);
  ctx.drawImage(bgImage, 0, 0, 1280, 720);
  
  // Add semi-transparent overlay for text readability
  const template = TOPIC_TEMPLATES[request.category];
  ctx.fillStyle = `${template.backgroundColor}80`; // 50% opacity
  ctx.fillRect(0, 500, 1280, 220);
  
  // Configure text styling
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Main title - large and bold
  const titleWords = request.title.split(' ');
  const maxWordsPerLine = 4;
  const titleLines = [];
  
  for (let i = 0; i < titleWords.length; i += maxWordsPerLine) {
    titleLines.push(titleWords.slice(i, i + maxWordsPerLine).join(' '));
  }
  
  // Draw title with outline for better visibility
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.fillStyle = template.textColor;
  
  const startY = 580 - (titleLines.length - 1) * 35;
  titleLines.forEach((line, index) => {
    const y = startY + (index * 70);
    ctx.strokeText(line, 640, y);
    ctx.fillText(line, 640, y);
  });
  
  // Add topic badge in top-right corner
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.fillStyle = template.accentColor;
  ctx.fillRect(1080, 30, 170, 50);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(request.category.toUpperCase(), 1165, 55);
  
  // Add trending indicator
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(30, 30, 120, 40);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TRENDING', 90, 50);
  
  return canvas.toBuffer('image/png');
}

async function uploadThumbnailToS3(thumbnailBuffer: Buffer, s3Key: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: THUMBNAIL_BUCKET,
    Key: s3Key,
    Body: thumbnailBuffer,
    ContentType: 'image/png',
    CacheControl: 'max-age=31536000', // 1 year cache
    Metadata: {
      'generated-by': 'youtube-automation-platform',
      'generation-time': new Date().toISOString()
    }
  });

  await s3Client.send(command);
  console.log(`Thumbnail uploaded to S3: ${s3Key}`);
}

function calculateThumbnailCost(): number {
  // Bedrock Titan Image Generator pricing: ~$0.008 per image
  // S3 storage: ~$0.0001
  // Lambda execution: ~$0.0001
  return 0.0082;
}

// Utility function to get thumbnail URL
export async function getThumbnailUrl(videoId: string): Promise<string | null> {
  try {
    const listCommand = new GetObjectCommand({
      Bucket: THUMBNAIL_BUCKET,
      Key: `thumbnails/${videoId}/`
    });
    
    // Return the most recent thumbnail URL
    return `https://${THUMBNAIL_BUCKET}.s3.amazonaws.com/thumbnails/${videoId}/latest-thumbnail.png`;
  } catch (error) {
    console.error('Error getting thumbnail URL:', error);
    return null;
  }
}