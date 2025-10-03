import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface TopicConfiguration {
  topicId: string;
  category: 'technology' | 'finance' | 'education' | 'health' | 'general';
  name: string;
  description: string;
  videoConfig: {
    defaultDuration: number;
    preferredFormat: 'short' | 'standard' | 'long';
    voiceStyle: string;
    visualStyle: string;
  };
  contentConfig: {
    promptTemplate: string;
    keywordFocus: string[];
    targetAudience: string;
    contentStyle: 'educational' | 'entertaining' | 'professional' | 'casual';
  };
  seoConfig: {
    titleTemplate: string;
    descriptionTemplate: string;
    defaultTags: string[];
    categoryId: string;
  };
  thumbnailConfig: {
    style: 'professional' | 'engaging' | 'educational' | 'modern';
    colorScheme: string;
    textStyle: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const TOPICS_TABLE = process.env.TOPICS_TABLE || 'youtube-automation-topics';

// Pre-configured topic templates
const DEFAULT_TOPICS: TopicConfiguration[] = [
  {
    topicId: 'technology-trends',
    category: 'technology',
    name: 'Technology Trends',
    description: 'Latest technology trends, AI developments, and tech news',
    videoConfig: {
      defaultDuration: 30,
      preferredFormat: 'standard',
      voiceStyle: 'professional',
      visualStyle: 'modern-tech'
    },
    contentConfig: {
      promptTemplate: 'Create engaging content about {topic} focusing on practical applications and future implications. Include specific examples and actionable insights.',
      keywordFocus: ['technology', 'AI', 'innovation', 'future', 'tech trends'],
      targetAudience: 'tech enthusiasts and professionals',
      contentStyle: 'professional'
    },
    seoConfig: {
      titleTemplate: '{topic} - Latest Tech Trends 2025',
      descriptionTemplate: 'Discover the latest in {topic}. Learn about cutting-edge technology trends, innovations, and what they mean for the future.',
      defaultTags: ['technology', 'tech trends', 'innovation', 'AI', 'future tech'],
      categoryId: '28' // Science & Technology
    },
    thumbnailConfig: {
      style: 'modern',
      colorScheme: 'blue-purple-gradient',
      textStyle: 'bold-futuristic'
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    topicId: 'finance-investing',
    category: 'finance',
    name: 'Finance & Investing',
    description: 'Investment strategies, market analysis, and financial education',
    videoConfig: {
      defaultDuration: 60,
      preferredFormat: 'long',
      voiceStyle: 'authoritative',
      visualStyle: 'professional-finance'
    },
    contentConfig: {
      promptTemplate: 'Provide comprehensive analysis of {topic} with specific data, investment implications, and actionable advice. Include current market context and expert insights.',
      keywordFocus: ['investing', 'finance', 'stocks', 'market analysis', 'wealth building'],
      targetAudience: 'investors and finance enthusiasts',
      contentStyle: 'educational'
    },
    seoConfig: {
      titleTemplate: '{topic} Analysis - Smart Investing 2025',
      descriptionTemplate: 'Complete guide to {topic}. Get expert analysis, investment strategies, and market insights to make informed financial decisions.',
      defaultTags: ['investing', 'finance', 'stocks', 'market analysis', 'wealth building'],
      categoryId: '25' // News & Politics (closest for finance)
    },
    thumbnailConfig: {
      style: 'professional',
      colorScheme: 'gold-blue-gradient',
      textStyle: 'bold-professional'
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    topicId: 'education-learning',
    category: 'education',
    name: 'Educational Content',
    description: 'Learning resources, tutorials, and educational insights',
    videoConfig: {
      defaultDuration: 45,
      preferredFormat: 'standard',
      voiceStyle: 'friendly-teacher',
      visualStyle: 'educational-clean'
    },
    contentConfig: {
      promptTemplate: 'Create clear, educational content about {topic} with step-by-step explanations, examples, and practical applications. Make it accessible for learners.',
      keywordFocus: ['education', 'learning', 'tutorial', 'guide', 'how to'],
      targetAudience: 'students and lifelong learners',
      contentStyle: 'educational'
    },
    seoConfig: {
      titleTemplate: 'Learn {topic} - Complete Guide 2025',
      descriptionTemplate: 'Master {topic} with this comprehensive guide. Clear explanations, practical examples, and actionable steps for effective learning.',
      defaultTags: ['education', 'learning', 'tutorial', 'guide', 'how to'],
      categoryId: '27' // Education
    },
    thumbnailConfig: {
      style: 'educational',
      colorScheme: 'warm-blue-gradient',
      textStyle: 'clear-readable'
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    topicId: 'health-wellness',
    category: 'health',
    name: 'Health & Wellness',
    description: 'Health tips, wellness strategies, and lifestyle content',
    videoConfig: {
      defaultDuration: 40,
      preferredFormat: 'standard',
      voiceStyle: 'caring-professional',
      visualStyle: 'natural-wellness'
    },
    contentConfig: {
      promptTemplate: 'Share valuable insights about {topic} focusing on practical health tips, scientific backing, and actionable wellness strategies.',
      keywordFocus: ['health', 'wellness', 'fitness', 'nutrition', 'lifestyle'],
      targetAudience: 'health-conscious individuals',
      contentStyle: 'professional'
    },
    seoConfig: {
      titleTemplate: '{topic} - Health & Wellness Tips 2025',
      descriptionTemplate: 'Discover effective {topic} strategies. Science-backed health tips and wellness advice for a better lifestyle.',
      defaultTags: ['health', 'wellness', 'fitness', 'nutrition', 'lifestyle'],
      categoryId: '26' // Howto & Style (closest for health/wellness)
    },
    thumbnailConfig: {
      style: 'engaging',
      colorScheme: 'green-natural-gradient',
      textStyle: 'friendly-bold'
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const method = event.httpMethod;
    const path = event.path;

    switch (method) {
      case 'GET':
        if (path.includes('/topics/')) {
          const topicId = path.split('/').pop();
          return await getTopicConfiguration(topicId!);
        } else {
          return await getAllTopicConfigurations();
        }
      
      case 'POST':
        return await createTopicConfiguration(JSON.parse(event.body || '{}'));
      
      case 'PUT':
        const topicId = path.split('/').pop();
        return await updateTopicConfiguration(topicId!, JSON.parse(event.body || '{}'));
      
      case 'DELETE':
        const deleteTopicId = path.split('/').pop();
        return await deleteTopicConfiguration(deleteTopicId!);
      
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Topic configuration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function getAllTopicConfigurations(): Promise<APIGatewayProxyResult> {
  const command = new ScanCommand({
    TableName: TOPICS_TABLE,
    FilterExpression: 'isActive = :active',
    ExpressionAttributeValues: {
      ':active': { BOOL: true }
    }
  });

  const result = await dynamoClient.send(command);
  const topics = result.Items?.map(item => unmarshallTopicConfiguration(item)) || [];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ topics })
  };
}

async function getTopicConfiguration(topicId: string): Promise<APIGatewayProxyResult> {
  const command = new GetItemCommand({
    TableName: TOPICS_TABLE,
    Key: {
      topicId: { S: topicId }
    }
  });

  const result = await dynamoClient.send(command);
  
  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Topic configuration not found' })
    };
  }

  const topic = unmarshallTopicConfiguration(result.Item);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ topic })
  };
}

async function createTopicConfiguration(topicConfig: Partial<TopicConfiguration>): Promise<APIGatewayProxyResult> {
  const topic: TopicConfiguration = {
    topicId: topicConfig.topicId || `topic-${Date.now()}`,
    category: topicConfig.category || 'general',
    name: topicConfig.name || 'Untitled Topic',
    description: topicConfig.description || '',
    videoConfig: topicConfig.videoConfig || DEFAULT_TOPICS[0].videoConfig,
    contentConfig: topicConfig.contentConfig || DEFAULT_TOPICS[0].contentConfig,
    seoConfig: topicConfig.seoConfig || DEFAULT_TOPICS[0].seoConfig,
    thumbnailConfig: topicConfig.thumbnailConfig || DEFAULT_TOPICS[0].thumbnailConfig,
    isActive: topicConfig.isActive !== undefined ? topicConfig.isActive : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const command = new PutItemCommand({
    TableName: TOPICS_TABLE,
    Item: marshallTopicConfiguration(topic)
  });

  await dynamoClient.send(command);

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ topic })
  };
}

async function updateTopicConfiguration(topicId: string, updates: Partial<TopicConfiguration>): Promise<APIGatewayProxyResult> {
  // Get existing configuration
  const getCommand = new GetItemCommand({
    TableName: TOPICS_TABLE,
    Key: { topicId: { S: topicId } }
  });

  const existing = await dynamoClient.send(getCommand);
  
  if (!existing.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Topic configuration not found' })
    };
  }

  const currentTopic = unmarshallTopicConfiguration(existing.Item);
  const updatedTopic: TopicConfiguration = {
    ...currentTopic,
    ...updates,
    topicId, // Ensure ID doesn't change
    updatedAt: new Date().toISOString()
  };

  const putCommand = new PutItemCommand({
    TableName: TOPICS_TABLE,
    Item: marshallTopicConfiguration(updatedTopic)
  });

  await dynamoClient.send(putCommand);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ topic: updatedTopic })
  };
}

async function deleteTopicConfiguration(topicId: string): Promise<APIGatewayProxyResult> {
  // Soft delete by setting isActive to false
  return await updateTopicConfiguration(topicId, { isActive: false });
}

// Initialize default topics if they don't exist
export async function initializeDefaultTopics(): Promise<void> {
  console.log('Initializing default topic configurations...');
  
  for (const topic of DEFAULT_TOPICS) {
    try {
      const command = new PutItemCommand({
        TableName: TOPICS_TABLE,
        Item: marshallTopicConfiguration(topic),
        ConditionExpression: 'attribute_not_exists(topicId)'
      });
      
      await dynamoClient.send(command);
      console.log(`Created default topic: ${topic.topicId}`);
    } catch (error) {
      // Topic already exists, skip
      console.log(`Topic ${topic.topicId} already exists, skipping`);
    }
  }
}

// Helper functions for DynamoDB marshalling/unmarshalling
function marshallTopicConfiguration(topic: TopicConfiguration): any {
  return {
    topicId: { S: topic.topicId },
    category: { S: topic.category },
    name: { S: topic.name },
    description: { S: topic.description },
    videoConfig: { S: JSON.stringify(topic.videoConfig) },
    contentConfig: { S: JSON.stringify(topic.contentConfig) },
    seoConfig: { S: JSON.stringify(topic.seoConfig) },
    thumbnailConfig: { S: JSON.stringify(topic.thumbnailConfig) },
    isActive: { BOOL: topic.isActive },
    createdAt: { S: topic.createdAt },
    updatedAt: { S: topic.updatedAt }
  };
}

function unmarshallTopicConfiguration(item: any): TopicConfiguration {
  return {
    topicId: item.topicId.S,
    category: item.category.S,
    name: item.name.S,
    description: item.description.S,
    videoConfig: JSON.parse(item.videoConfig.S),
    contentConfig: JSON.parse(item.contentConfig.S),
    seoConfig: JSON.parse(item.seoConfig.S),
    thumbnailConfig: JSON.parse(item.thumbnailConfig.S),
    isActive: item.isActive.BOOL,
    createdAt: item.createdAt.S,
    updatedAt: item.updatedAt.S
  };
}

// Export topic configurations for use by other services
export { DEFAULT_TOPICS, TopicConfiguration };