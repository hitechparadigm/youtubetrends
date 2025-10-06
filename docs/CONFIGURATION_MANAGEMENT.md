# Configuration Management System

## Overview

The YouTube Automation Platform uses a comprehensive configuration management system that eliminates all hardcoded values and enables runtime configuration of AI models, prompts, costs, features, and all system parameters.

## Key Features

- **🔧 Zero Hardcoded Values**: All system parameters are configurable
- **🎛️ Runtime Updates**: Change settings without code deployment
- **💰 Cost Optimization**: Automatic model selection based on budget constraints
- **🔄 A/B Testing**: Built-in experimentation framework
- **🛡️ Reliability**: Circuit breakers, health monitoring, and automatic fallbacks

## Configuration Hierarchy

Configuration is loaded with the following priority (highest to lowest):

1. **Runtime Overrides** - API-based configuration changes
2. **AWS Parameter Store** - Encrypted, hierarchical configuration storage
3. **AWS Secrets Manager** - API keys, tokens, and sensitive data
4. **S3 Configuration Files** - Complex configurations, templates, mappings
5. **Environment Variables** - Container/Lambda-level configuration
6. **Default Values** - Fallback values in code

## Configuration Categories

### AI Models

All AI models are configurable across services:

```javascript
// Content Generation Models
CONTENT_AI_PROVIDER=anthropic  // anthropic, openai, bedrock
CONTENT_AI_MODEL=claude-3-5-sonnet-20241022
CONTENT_AI_FALLBACK_MODEL=claude-3-haiku-20240307

// Video Generation Models  
VIDEO_AI_PROVIDER=bedrock  // bedrock, runway, luma
VIDEO_AI_MODEL=amazon.nova-reel-v1:0
VIDEO_AI_FALLBACK_MODEL=luma.ray-v2:0

// Audio Generation Models
AUDIO_AI_PROVIDER=polly  // polly, elevenlabs, azure
AUDIO_AI_ENGINE=generative  // generative, neural, standard
AUDIO_AI_FALLBACK_ENGINE=neural
```

### Voice Configuration

Topic-specific voice mappings:

```javascript
// Voice Mappings (configurable via Parameter Store)
VOICE_INVESTING_PRIMARY=Stephen    // Generative AI voice
VOICE_EDUCATION_PRIMARY=Aria       // Generative AI voice
VOICE_TOURISM_PRIMARY=Ruth         // Generative AI voice
VOICE_TECHNOLOGY_PRIMARY=Stephen   // Generative AI voice
```

### Cost Tracking

Simple configurable rates for cost calculation:

```javascript
// Pricing Rates (per 1M characters/tokens)
POLLY_GENERATIVE_RATE=30.00
POLLY_NEURAL_RATE=16.00
POLLY_STANDARD_RATE=4.00
VIDEO_NOVA_REEL_RATE=0.80  // per minute
```

### Feature Flags

Runtime feature control:

```javascript
// Feature Flags
ENABLE_GENERATIVE_AI=true
ENABLE_ADVANCED_VIDEO_EFFECTS=false
ENABLE_MULTI_LANGUAGE=false
ENABLE_CUSTOM_THUMBNAILS=true
ENABLE_AB_TESTING=true
```

## Usage Examples

### Basic Configuration Access

```javascript
const ConfigurationFactory = require('./src/config/ConfigurationFactory');

// Get AI model configuration
const aiConfig = await ConfigurationFactory.getAIModelConfig('content');
console.log('Content AI Model:', aiConfig.primary.model);

// Get cost configuration
const costConfig = await ConfigurationFactory.getCostConfig();
console.log('Daily Budget:', costConfig.budgets.daily);

// Get feature flags
const features = await ConfigurationFactory.getFeatureFlags();
console.log('Generative AI Enabled:', features.enableGenerativeAI);
```

### Runtime Configuration Updates

```javascript
// Update feature flag at runtime
await ConfigurationFactory.updateConfiguration(
    'features.enableGenerativeAI',
    false,
    { persist: true }
);

// Update voice mapping
await ConfigurationFactory.updateConfiguration(
    'voice.investing.primary',
    'Matthew',
    { persist: true }
);

// Update budget limit
await ConfigurationFactory.updateConfiguration(
    'cost.budgets.daily',
    15.00,
    { persist: true }
);
```

### AI Model Management

```javascript
const AIModelFactory = require('./src/ai/AIModelFactory');

// Generate content with configurable models
const content = await AIModelFactory.generateContent(
    'Create a video about ETF investing',
    { topic: 'investing', maxTokens: 200 }
);

// Generate audio with configurable voices
const audio = await AIModelFactory.generateAudio(
    'Welcome to our investing guide',
    { topic: 'investing', voice: 'Stephen' }
);

// Get cost estimate
const cost = await AIModelFactory.getCostEstimate('audio', {
    characters: 150,
    engine: 'generative'
});
```

## Configuration Files

### Parameter Store Structure

```
/youtube-automation/production/
├── ai/
│   ├── models/
│   │   ├── content/primary/provider
│   │   ├── content/primary/model
│   │   ├── video/primary/provider
│   │   └── audio/primary/engine
│   └── endpoints/
├── cost/
│   ├── budgets/daily
│   ├── budgets/monthly
│   └── rates/polly/generative
├── features/
│   ├── enableGenerativeAI
│   └── enableABTesting
└── voice/
    ├── investing/primary
    └── education/primary
```

### Secrets Manager

```
youtube-automation-anthropic-api: {
    "apiKey": "sk-ant-...",
    "endpoint": "https://api.anthropic.com"
}

youtube-automation-openai-api: {
    "apiKey": "sk-...",
    "endpoint": "https://api.openai.com/v1"
}

youtube-automation-youtube-oauth: {
    "clientId": "...",
    "clientSecret": "...",
    "refreshToken": "..."
}
```

### S3 Configuration Files

```
s3://youtube-automation-config/production/
├── prompts/
│   ├── script-templates/
│   │   ├── investing.json
│   │   └── education.json
│   └── title-templates/
└── voice-mappings/
    └── topic-voices.json
```

## Health Monitoring

The system includes comprehensive health monitoring:

- **Circuit Breakers**: Automatic failover when models are unhealthy
- **Performance Metrics**: Success rates, latency, and throughput tracking
- **Cost Monitoring**: Real-time budget tracking and alerts
- **Quality Validation**: Automatic quality checks and fallbacks

## A/B Testing

Built-in experimentation framework:

```javascript
// Create A/B test for voice engines
const experiment = {
    name: 'voice_quality_test',
    variants: {
        control: { engine: 'neural' },
        variant_a: { engine: 'generative' }
    },
    trafficSplit: { control: 50, variant_a: 50 },
    metrics: ['audio_quality', 'cost_efficiency']
};

// Get experiment variant for user
const variant = await FeatureFlagManager.getExperimentVariant(
    'voice_quality_test',
    userId
);
```

## Security

- **Encrypted Storage**: All sensitive configuration encrypted at rest
- **IAM Roles**: Least privilege access for all services
- **Audit Logging**: Complete history of configuration changes
- **Secret Rotation**: Automatic credential refresh and validation

## Deployment

Configuration is deployed independently from code:

1. **Parameter Store**: Update via AWS CLI or Console
2. **Secrets Manager**: Rotate credentials automatically
3. **S3 Templates**: Version-controlled template updates
4. **Runtime Updates**: Immediate effect without deployment

This configuration management system ensures the platform remains flexible, maintainable, and future-proof while maintaining security and reliability.