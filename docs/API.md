# YouTube Automation Platform - API Documentation

**Version**: 1.3.0  
**Last Updated**: October 6, 2025  
**Status**: Production Ready with Audio Integration

## 🔌 **API Overview**

The YouTube Automation Platform provides a comprehensive set of APIs for automated video content generation, processing, and publishing. All APIs are built on AWS Lambda functions with REST and event-driven interfaces.

### **Key Features**
- **AI Video Generation**: Luma AI Ray v2 and Amazon Bedrock Nova Reel integration
- **Audio Synchronization**: Amazon Polly Neural voices with SSML timing
- **YouTube Publishing**: Automated upload with SEO optimization
- **Cost Optimization**: Pay-per-use serverless architecture
- **Error Handling**: Comprehensive retry logic and failover mechanisms
- **Performance Tracking**: Real-time metrics and analytics

### **Authentication**
All APIs use AWS IAM authentication with role-based access control. API keys are managed through AWS Secrets Manager for enhanced security.

## 🏗️ **API Architecture**

```mermaid
graph TB
    subgraph "Client Applications"
        WEB[Web Interface]
        CLI[Command Line Tools]
        SDK[SDK Integrations]
        WEBHOOK[Webhook Clients]
    end
    
    subgraph "API Gateway Layer"
        APIGW[API Gateway]
        AUTH[Authentication]
        RATE[Rate Limiting]
        VALID[Request Validation]
    end
    
    subgraph "Core APIs"
        TREND_API[Trend Discovery API]
        CONTENT_API[Content Generation API]
        VIDEO_API[Video Generation API]
        AUDIO_API[Audio Generation API]
        THUMB_API[Thumbnail API]
        UPLOAD_API[YouTube Upload API]
        ANALYTICS_API[Analytics API]
        CONFIG_API[Configuration API]
    end
    
    subgraph "Event-Driven APIs"
        EVENT_API[Event Processing API]
        WEBHOOK_API[Webhook API]
        SCHEDULE_API[Scheduler API]
        MONITOR_API[Monitoring API]
    end
    
    subgraph "Data APIs"
        STORAGE_API[Storage Management API]
        METADATA_API[Metadata API]
        SEARCH_API[Search API]
        EXPORT_API[Export API]
    end
    
    WEB --> APIGW
    CLI --> APIGW
    SDK --> APIGW
    WEBHOOK --> APIGW
    
    APIGW --> AUTH
    AUTH --> RATE
    RATE --> VALID
    
    VALID --> TREND_API
    VALID --> CONTENT_API
    VALID --> VIDEO_API
    VALID --> AUDIO_API
    VALID --> UPLOAD_API
    
    VIDEO_API --> EVENT_API
    AUDIO_API --> EVENT_API
    UPLOAD_API --> ANALYTICS_API
```

## 📋 **Core APIs**

### **1. Video Generation API**

#### **Generate Video**
**Endpoint**: `POST /api/v1/video/generate`  
**Lambda Function**: `youtube-automation-video-generator`  
**Description**: Generates AI video content with optional audio synchronization

**Request Body**:
```json
{
  "topic": "Technology-Trends-2025",
  "trendId": "tech-1234567890",
  "scriptPrompt": "Create a video about AI innovations in 2025",
  "videoConfig": {
    "durationSeconds": 8,
    "includeAudio": true,
    "quality": "high",
    "fps": 24,
    "dimension": "1280x720"
  },
  "audioConfig": {
    "voice": "Amy",
    "speed": "medium",
    "language": "en-US"
  }
}
```

**Response**:
```json
{
  "success": true,
  "videoS3Key": "videos/Technology-Trends-2025/tech-1234567890_1698765432.mp4",
  "audioS3Key": "audio/Technology-Trends-2025/tech-1234567890_1698765432.mp3",
  "processedVideoS3Key": "videos/Technology-Trends-2025/processed_tech-1234567890.mp4",
  "metadata": {
    "duration": 8,
    "hasAudio": true,
    "fileSize": 3291433,
    "format": "mp4",
    "resolution": "1280x720"
  },
  "generationCost": 0.11,
  "executionTime": 122000
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": "Invalid duration: must be between 1 and 300 seconds",
  "errorCode": "INVALID_DURATION",
  "requestId": "req-123456789"
}
```

### **2. YouTube Upload API**

#### **Upload Video**
**Endpoint**: `POST /api/v1/youtube/upload`  
**Lambda Function**: `youtube-automation-youtube-uploader`  
**Description**: Uploads processed video to YouTube with SEO optimization

**Request Body**:
```json
{
  "topic": "Technology-Trends-2025",
  "processedVideoS3Key": "videos/Technology-Trends-2025/processed_video.mp4",
  "keywords": ["AI", "technology", "innovation", "2025", "trends"],
  "scriptPrompt": "AI innovations transforming industries in 2025",
  "videoMetadata": {
    "duration": 8,
    "fileSize": 3291433,
    "hasAudio": true,
    "format": "mp4"
  },
  "uploadConfig": {
    "privacyStatus": "public",
    "title": "AI Innovation 2025: Revolutionary Technologies",
    "description": "Discover the latest AI innovations...",
    "tags": ["AI", "Innovation", "Technology"],
    "categoryId": "28"
  }
}
```

**Response**:
```json
{
  "success": true,
  "youtubeVideoId": "dQw4w9WgXcQ",
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "uploadedMetadata": {
    "title": "AI Innovation 2025: Revolutionary Technologies",
    "description": "Discover the latest AI innovations...",
    "tags": ["AI", "Innovation", "Technology", "2025"],
    "categoryId": "28",
    "privacyStatus": "public",
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  },
  "performanceTracking": {
    "uploadTime": 15000,
    "initialViews": 0,
    "estimatedReach": 120
  },
  "executionTime": 18500
}
```

### **3. Trend Detection API**

#### **Detect Trends**
**Endpoint**: `GET /api/v1/trends/detect`  
**Lambda Function**: `youtube-automation-trend-detector`  
**Description**: Discovers trending topics from multiple sources

**Query Parameters**:
- `category` (optional): Content category (technology, finance, travel)
- `limit` (optional): Number of trends to return (default: 10)
- `region` (optional): Geographic region (default: US)

**Response**:
```json
{
  "success": true,
  "trends": [
    {
      "keyword": "AI technology trends 2025",
      "searchVolume": 85000,
      "category": "technology",
      "relevanceScore": 0.95,
      "relatedTerms": ["artificial intelligence", "machine learning", "automation"],
      "context": {
        "newsArticles": [
          "AI technology continues to transform industries in 2025"
        ],
        "socialMentions": [
          "AI is revolutionizing how we work and live"
        ]
      }
    }
  ],
  "totalTrends": 1,
  "executionTime": 3200
}
```

### **4. Content Analysis API**

#### **Analyze Content**
**Endpoint**: `POST /api/v1/content/analyze`  
**Lambda Function**: `youtube-automation-content-analyzer`  
**Description**: Enhances content using Claude 3.5 Sonnet AI

**Request Body**:
```json
{
  "topic": "Technology-Trends-2025",
  "rawContent": "AI is changing everything",
  "targetAudience": "tech enthusiasts",
  "contentType": "video_script",
  "optimizationGoals": ["engagement", "seo", "clarity"]
}
```

**Response**:
```json
{
  "success": true,
  "enhancedContent": {
    "script": "Revolutionary AI technologies are transforming industries...",
    "title": "AI Innovation 2025: Revolutionary Technologies Transforming Our Future",
    "description": "Discover the most exciting AI innovations of 2025...",
    "keywords": ["AI", "Innovation", "Technology", "2025", "Future"],
    "tags": ["AI", "Innovation", "Technology", "2025", "Artificial Intelligence"]
  },
  "qualityScore": 0.92,
  "seoScore": 0.88,
  "executionTime": 2100
}
```

## 🔄 **Event-Driven APIs**

### **Webhook Events**

The platform supports webhook notifications for key events:

#### **Video Generation Complete**
```json
{
  "eventType": "video.generation.complete",
  "timestamp": "2025-10-06T10:30:00Z",
  "data": {
    "trendId": "tech-1234567890",
    "topic": "Technology-Trends-2025",
    "videoS3Key": "videos/Technology-Trends-2025/video.mp4",
    "audioS3Key": "audio/Technology-Trends-2025/audio.mp3",
    "processedVideoS3Key": "videos/Technology-Trends-2025/processed.mp4",
    "generationCost": 0.11,
    "executionTime": 122000
  }
}
```

#### **YouTube Upload Complete**
```json
{
  "eventType": "youtube.upload.complete",
  "timestamp": "2025-10-06T10:35:00Z",
  "data": {
    "youtubeVideoId": "dQw4w9WgXcQ",
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "AI Innovation 2025: Revolutionary Technologies",
    "privacyStatus": "public",
    "uploadTime": 15000
  }
}
```

## 📊 **Analytics APIs**

### **Performance Metrics**
**Endpoint**: `GET /api/v1/analytics/performance`  
**Description**: Retrieves performance metrics and cost analysis

**Response**:
```json
{
  "success": true,
  "metrics": {
    "totalVideos": 25,
    "successRate": 1.0,
    "averageGenerationTime": 125000,
    "averageCost": 0.11,
    "totalCost": 2.75,
    "audioIntegrationRate": 1.0
  },
  "breakdown": {
    "videoGeneration": {
      "lumaRayUsage": 0.8,
      "novaReelUsage": 0.2,
      "averageTime": 122000
    },
    "audioGeneration": {
      "pollyUsage": 1.0,
      "averageTime": 15000
    },
    "youtubeUpload": {
      "successRate": 0.96,
      "quotaLimitHits": 1,
      "averageTime": 18000
    }
  }
}
```

## 🔧 **Configuration APIs**

### **Update Configuration**
**Endpoint**: `PUT /api/v1/config/update`  
**Description**: Updates system configuration settings

**Request Body**:
```json
{
  "videoDefaults": {
    "durationSeconds": 8,
    "quality": "high",
    "includeAudio": true
  },
  "audioDefaults": {
    "voice": "Amy",
    "speed": "medium"
  },
  "uploadDefaults": {
    "privacyStatus": "public",
    "categoryId": "28"
  }
}
```

## 🚨 **Error Handling**

### **Standard Error Response**
```json
{
  "success": false,
  "error": "Detailed error message",
  "errorCode": "ERROR_CODE",
  "requestId": "req-123456789",
  "timestamp": "2025-10-06T10:30:00Z",
  "details": {
    "field": "Additional error context"
  }
}
```

### **Common Error Codes**
- `INVALID_DURATION`: Video duration outside allowed range (1-300 seconds)
- `QUOTA_EXCEEDED`: YouTube API quota limit reached
- `AUTHENTICATION_FAILED`: Invalid or expired credentials
- `VIDEO_GENERATION_FAILED`: AI model generation error
- `AUDIO_SYNC_FAILED`: Audio-video synchronization error
- `S3_ACCESS_DENIED`: Insufficient S3 permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests

## 📈 **Rate Limits**

| API Endpoint | Rate Limit | Burst Limit |
|--------------|------------|-------------|
| Video Generation | 10/hour | 3/minute |
| YouTube Upload | 50/day | 5/hour |
| Trend Detection | 100/hour | 10/minute |
| Content Analysis | 200/hour | 20/minute |

## 🔐 **Security**

### **Authentication**
- AWS IAM roles and policies
- API keys stored in AWS Secrets Manager
- Request signing using AWS Signature Version 4

### **Authorization**
- Role-based access control (RBAC)
- Resource-level permissions
- Cross-account access controls

### **Data Protection**
- Encryption at rest (S3, DynamoDB)
- Encryption in transit (TLS 1.2+)
- Secure credential management

## 📚 **SDK Examples**

### **Node.js SDK**
```javascript
const { YouTubeAutomationClient } = require('@youtube-automation/sdk');

const client = new YouTubeAutomationClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key'
  }
});

// Generate video with audio
const result = await client.generateVideo({
  topic: 'Technology-Trends-2025',
  scriptPrompt: 'AI innovations in 2025',
  videoConfig: {
    durationSeconds: 8,
    includeAudio: true
  },
  audioConfig: {
    voice: 'Amy'
  }
});

console.log('Video generated:', result.videoUrl);
```

### **Python SDK**
```python
from youtube_automation import YouTubeAutomationClient

client = YouTubeAutomationClient(
    region='us-east-1',
    access_key_id='your-access-key',
    secret_access_key='your-secret-key'
)

# Generate and upload video
result = client.generate_and_upload_video(
    topic='Technology-Trends-2025',
    script_prompt='AI innovations in 2025',
    video_config={
        'duration_seconds': 8,
        'include_audio': True
    },
    audio_config={
        'voice': 'Amy'
    },
    upload_config={
        'privacy_status': 'public'
    }
)

print(f'Video uploaded: {result.youtube_url}')
```

## 🧪 **Testing**

### **API Testing Tools**
- **Postman Collection**: Available in `tools/testing/postman/`
- **Integration Tests**: Run with `npm run test:integration`
- **Load Testing**: Use `tools/testing/load-test.js`

### **Test Environment**
- **Base URL**: `https://api-test.youtube-automation.com`
- **Authentication**: Test credentials in AWS Secrets Manager
- **Rate Limits**: Relaxed for testing (10x normal limits)

---

## 📞 **Support**

- **API Issues**: [GitHub Issues](https://github.com/yourusername/youtube-automation-platform/issues)
- **Documentation**: [API Docs](https://docs.youtube-automation.com)
- **Status Page**: [System Status](https://status.youtube-automation.com)

**Last Updated**: October 6, 2025  
**API Version**: 1.3.0
    CLI --> APIGW
    SDK --> APIGW
    WEBHOOK --> APIGW
    
    APIGW --> AUTH
    AUTH --> RATE
    RATE --> VALID
    
    VALID --> TREND_API
    VALID --> CONTENT_API
    VALID --> VIDEO_API
    VALID --> AUDIO_API
    VALID --> THUMB_API
    VALID --> UPLOAD_API
    VALID --> ANALYTICS_API
    VALID --> CONFIG_API
    
    VALID --> EVENT_API
    VALID --> WEBHOOK_API
    VALID --> SCHEDULE_API
    VALID --> MONITOR_API
    
    VALID --> STORAGE_API
    VALID --> METADATA_API
    VALID --> SEARCH_API
    VALID --> EXPORT_API
```

## 🎯 **Core APIs**

### **1. Trend Discovery API**

#### **Discover Trends**
```http
POST /api/v1/trends/discover
Content-Type: application/json
Authorization: Bearer {token}

{
  "categories": ["technology", "finance"],
  "sources": ["google-trends", "news-api", "social-media"],
  "timeframe": "24h",
  "confidenceThreshold": 0.7,
  "maxResults": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "id": "trend_123",
        "keyword": "artificial intelligence",
        "category": "technology",
        "confidence": 0.85,
        "searchVolume": 150000,
        "growth": "+25%",
        "relatedTerms": ["AI", "machine learning", "automation"],
        "context": {
          "newsArticles": 45,
          "socialMentions": 1200,
          "marketData": {...}
        },
        "timestamp": "2025-01-03T10:00:00Z"
      }
    ],
    "totalResults": 8,
    "processingTime": "2.3s"
  }
}
```

#### **Get Trend Details**
```http
GET /api/v1/trends/{trendId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trend": {
      "id": "trend_123",
      "keyword": "artificial intelligence",
      "category": "technology",
      "confidence": 0.85,
      "detailedAnalysis": {
        "searchTrends": {...},
        "competitorAnalysis": {...},
        "contentOpportunities": {...}
      },
      "generatedContent": {
        "suggestedTitles": [...],
        "keyPoints": [...],
        "targetAudience": "..."
      }
    }
  }
}
```

### **2. Content Generation API**

#### **Generate Enhanced Content**
```http
POST /api/v1/content/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "trendId": "trend_123",
  "category": "technology",
  "contentType": "educational",
  "duration": 60,
  "style": "professional",
  "targetAudience": "general",
  "customPrompts": {
    "focus": "practical applications",
    "tone": "informative"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": "content_456",
    "enhancedContent": {
      "title": "Top 5 AI Tools Transforming Business in 2025",
      "description": "Discover the most impactful AI tools...",
      "script": "In today's rapidly evolving business landscape...",
      "keyPoints": [
        "AI automation tools",
        "Machine learning platforms",
        "Business intelligence AI"
      ],
      "callToAction": "Subscribe for more AI insights",
      "estimatedDuration": 58,
      "seoMetadata": {
        "tags": ["AI", "business", "technology", "2025"],
        "category": "Science & Technology",
        "keywords": ["artificial intelligence", "business tools"]
      }
    },
    "confidence": 0.92,
    "processingTime": "3.1s"
  }
}
```

### **3. Video Generation API**

#### **Generate Video**
```http
POST /api/v1/video/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "contentId": "content_456",
  "videoConfig": {
    "duration": 60,
    "resolution": "1280x720",
    "style": "professional",
    "visualTheme": "technology"
  },
  "customPrompt": "Create a professional video about AI tools with modern graphics"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_789",
    "status": "generating",
    "estimatedCompletion": "2025-01-03T10:05:00Z",
    "jobId": "bedrock_job_123",
    "webhookUrl": "https://api.example.com/webhooks/video-complete"
  }
}
```

#### **Get Video Status**
```http
GET /api/v1/video/{videoId}/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_789",
    "status": "completed",
    "progress": 100,
    "result": {
      "s3Location": "s3://bucket/videos/video_789.mp4",
      "duration": 58.5,
      "resolution": "1280x720",
      "fileSize": "15.2MB",
      "quality": "high"
    },
    "metadata": {
      "generationTime": "2m 45s",
      "cost": "$0.07",
      "bedrockJobId": "bedrock_job_123"
    },
    "completedAt": "2025-01-03T10:04:32Z"
  }
}
```

### **4. Audio Generation API**

#### **Generate Audio Narration**
```http
POST /api/v1/audio/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "contentId": "content_456",
  "audioConfig": {
    "voice": "Matthew",
    "speed": "medium",
    "style": "professional",
    "ssmlEnabled": true
  },
  "script": "In today's rapidly evolving business landscape..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "audioId": "audio_101",
    "status": "generating",
    "estimatedCompletion": "2025-01-03T10:02:00Z",
    "pollyJobId": "polly_job_456"
  }
}
```

#### **Get Audio Status**
```http
GET /api/v1/audio/{audioId}/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "audioId": "audio_101",
    "status": "completed",
    "result": {
      "s3Location": "s3://bucket/audio/audio_101.mp3",
      "duration": 58.2,
      "format": "mp3",
      "quality": "high",
      "timingMarks": [
        {"time": 0, "type": "sentence", "value": "In today's rapidly evolving..."},
        {"time": 3.2, "type": "sentence", "value": "The first tool we'll explore..."}
      ]
    },
    "metadata": {
      "voice": "Matthew",
      "generationTime": "15s",
      "cost": "$0.004"
    }
  }
}
```

### **5. Thumbnail Generation API**

#### **Generate Thumbnail**
```http
POST /api/v1/thumbnail/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "contentId": "content_456",
  "thumbnailConfig": {
    "style": "technology",
    "template": "professional",
    "textOverlay": true,
    "colorScheme": "blue-purple-gradient"
  },
  "customElements": {
    "title": "Top 5 AI Tools",
    "subtitle": "2025 Edition",
    "branding": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "thumbnailId": "thumb_202",
    "status": "generating",
    "estimatedCompletion": "2025-01-03T10:01:30Z",
    "titanJobId": "titan_job_789"
  }
}
```

### **6. YouTube Upload API**

#### **Upload Video to YouTube**
```http
POST /api/v1/youtube/upload
Content-Type: application/json
Authorization: Bearer {token}

{
  "videoId": "video_789",
  "audioId": "audio_101",
  "thumbnailId": "thumb_202",
  "metadata": {
    "title": "Top 5 AI Tools Transforming Business in 2025",
    "description": "Discover the most impactful AI tools...",
    "tags": ["AI", "business", "technology", "2025"],
    "category": "Science & Technology",
    "privacy": "public"
  },
  "scheduling": {
    "publishAt": "immediate"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload_303",
    "status": "uploading",
    "progress": 0,
    "estimatedCompletion": "2025-01-03T10:08:00Z",
    "youtubeJobId": "yt_job_456"
  }
}
```

#### **Get Upload Status**
```http
GET /api/v1/youtube/upload/{uploadId}/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload_303",
    "status": "completed",
    "progress": 100,
    "result": {
      "youtubeUrl": "https://www.youtube.com/watch?v=ABC123DEF456",
      "videoId": "ABC123DEF456",
      "thumbnailUploaded": true,
      "subtitlesUploaded": true
    },
    "metadata": {
      "uploadTime": "45s",
      "fileSize": "15.2MB",
      "processingStatus": "succeeded"
    },
    "completedAt": "2025-01-03T10:07:23Z"
  }
}
```

## 📊 **Analytics APIs**

### **7. Analytics API**

#### **Get Performance Metrics**
```http
GET /api/v1/analytics/performance
Authorization: Bearer {token}
Query Parameters:
  - startDate: 2025-01-01
  - endDate: 2025-01-03
  - category: technology
  - metrics: views,engagement,cost
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalVideos": 4,
      "totalViews": 1250,
      "totalCost": "$0.32",
      "averageCostPerVideo": "$0.08",
      "successRate": "100%"
    },
    "metrics": {
      "videoGeneration": {
        "successRate": 1.0,
        "averageTime": "3.2 minutes",
        "totalGenerated": 4
      },
      "costAnalysis": {
        "totalCost": 0.32,
        "breakdown": {
          "bedrockNovaReel": 0.28,
          "amazonPolly": 0.016,
          "bedrockClaude": 0.012,
          "other": 0.012
        }
      },
      "performance": {
        "categories": {
          "technology": {"videos": 2, "avgViews": 625},
          "finance": {"videos": 2, "avgViews": 625}
        }
      }
    },
    "trends": {
      "viewGrowth": "+15%",
      "engagementRate": "4.2%",
      "costEfficiency": "99% vs traditional"
    }
  }
}
```

#### **Generate Analytics Report**
```http
POST /api/v1/analytics/reports/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "reportType": "comprehensive",
  "dateRange": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  },
  "filters": {
    "categories": ["technology", "finance"],
    "metrics": ["cost", "performance", "trends"]
  },
  "format": "json"
}
```

## 🔧 **Configuration APIs**

### **8. Configuration API**

#### **Get System Configuration**
```http
GET /api/v1/config/system
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": {
      "technology": {
        "defaultDuration": 30,
        "voiceStyle": "Matthew",
        "visualStyle": "modern-tech",
        "thumbnailStyle": "modern"
      },
      "finance": {
        "defaultDuration": 60,
        "voiceStyle": "Joanna",
        "visualStyle": "professional-finance",
        "thumbnailStyle": "professional"
      }
    },
    "scheduler": {
      "frequency": "rate(12 hours)",
      "maxVideosPerDay": 2,
      "enabled": true
    },
    "storage": {
      "hotDataRetention": 7,
      "warmDataRetention": 30,
      "coldDataRetention": 365
    }
  }
}
```

#### **Update Configuration**
```http
PUT /api/v1/config/category/{category}
Content-Type: application/json
Authorization: Bearer {token}

{
  "defaultDuration": 45,
  "voiceStyle": "Joanna",
  "visualStyle": "educational-clean",
  "contentStyle": "educational",
  "thumbnailStyle": "engaging"
}
```

## 🔄 **Event-Driven APIs**

### **9. Webhook API**

#### **Register Webhook**
```http
POST /api/v1/webhooks/register
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "https://your-app.com/webhooks/youtube-automation",
  "events": [
    "video.generation.completed",
    "audio.generation.completed",
    "youtube.upload.completed",
    "pipeline.completed"
  ],
  "secret": "your-webhook-secret"
}
```

#### **Webhook Event Payload Example**
```json
{
  "event": "pipeline.completed",
  "timestamp": "2025-01-03T10:08:00Z",
  "data": {
    "pipelineId": "pipeline_123",
    "contentId": "content_456",
    "videoId": "video_789",
    "audioId": "audio_101",
    "thumbnailId": "thumb_202",
    "uploadId": "upload_303",
    "youtubeUrl": "https://www.youtube.com/watch?v=ABC123DEF456",
    "totalCost": "$0.08",
    "processingTime": "4m 32s",
    "status": "success"
  }
}
```

## 🚀 **Batch Processing APIs**

### **10. Batch API**

#### **Create Batch Job**
```http
POST /api/v1/batch/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "jobType": "multi-video-generation",
  "config": {
    "count": 5,
    "categories": ["technology", "finance"],
    "schedule": "immediate"
  },
  "trends": [
    {"keyword": "AI trends", "category": "technology"},
    {"keyword": "Investment strategies", "category": "finance"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchJobId": "batch_404",
    "status": "queued",
    "estimatedCompletion": "2025-01-03T10:25:00Z",
    "totalJobs": 5,
    "estimatedCost": "$0.40"
  }
}
```

## 📋 **API Response Codes**

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request accepted for processing |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

## 🔐 **Authentication**

### **API Key Authentication**
```http
Authorization: Bearer your-api-key
```

### **OAuth2 Authentication**
```http
Authorization: Bearer your-oauth-token
```

## 📊 **Rate Limits**

| Endpoint | Rate Limit | Burst Limit |
|----------|------------|-------------|
| Trend Discovery | 100/hour | 10/minute |
| Content Generation | 50/hour | 5/minute |
| Video Generation | 20/hour | 2/minute |
| Audio Generation | 100/hour | 10/minute |
| YouTube Upload | 10/hour | 1/minute |
| Analytics | 1000/hour | 100/minute |

## 🛠️ **SDK Examples**

### **Node.js SDK**
```javascript
const YouTubeAutomation = require('@youtube-automation/sdk');

const client = new YouTubeAutomation({
  apiKey: 'your-api-key',
  region: 'us-east-1'
});

// Generate complete video pipeline
const result = await client.generateVideo({
  trend: 'artificial intelligence',
  category: 'technology',
  duration: 60
});

console.log(`Video created: ${result.youtubeUrl}`);
```

### **Python SDK**
```python
from youtube_automation import YouTubeAutomationClient

client = YouTubeAutomationClient(
    api_key='your-api-key',
    region='us-east-1'
)

# Generate complete video pipeline
result = client.generate_video(
    trend='artificial intelligence',
    category='technology',
    duration=60
)

print(f"Video created: {result.youtube_url}")
```

This API documentation covers all the core functionality of the YouTube Automation Platform, providing comprehensive endpoints for content generation, processing, and analytics.