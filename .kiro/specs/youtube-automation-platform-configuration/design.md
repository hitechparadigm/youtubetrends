# YouTube Automation Platform Configuration Management Design

## Overview

This design document outlines a comprehensive configuration management architecture for the YouTube Automation Platform that eliminates all hardcoded values and enables runtime configuration of AI models, prompts, costs, features, and all system parameters. The system provides hierarchical configuration loading, A/B testing, cost optimization, and future-proofing for new AI services.

## Architecture

### System Architecture
```
YouTube Automation Platform - Configurable Architecture
├── Configuration Management Layer
│   ├── ConfigurationManager (Hierarchical Loading)
│   ├── SecretsManager (AWS Secrets Manager Integration)
│   ├── ParameterStore (AWS SSM Integration)
│   ├── S3ConfigStorage (Complex Configurations)
│   └── FeatureFlagManager (A/B Testing & Rollouts)
├── AI Model Management Layer
│   ├── AIModelManager (Multi-Service Management)
│   ├── HealthMonitor (Circuit Breakers & Failover)
│   ├── CostTracker (Simple Per-Video Cost Calculation)
│   └── PerformanceTracker (Metrics & Analytics)
├── Content Generation Services
│   ├── ContentAI (Anthropic, OpenAI, Bedrock)
│   ├── VideoAI (Nova Reel, Runway, Luma)
│   ├── AudioAI (Polly Generative/Neural/Standard)
│   └── PromptTemplateManager (Dynamic Templates)
├── Processing & Upload Services
│   ├── VideoProcessor (Configurable Pipelines)
│   ├── AudioProcessor (Configurable Effects)
│   ├── ThumbnailGenerator (Configurable Styles)
│   └── PlatformUploader (Multi-Platform Support)
└── Monitoring & Analytics
    ├── PerformanceMonitor (Real-time Metrics)
    ├── CostTracker (Multi-Service Tracking)
    ├── QualityAnalyzer (Content Quality Metrics)
    └── AlertManager (Configurable Notifications)
```

## Components and Interfaces

### 1. Configuration Management System

**ConfigurationManager Class**
```javascript
class ConfigurationManager {
    constructor(options = {}) {
        this.environment = options.environment || process.env.ENVIRONMENT || 'production';
        this.region = options.region || process.env.AWS_REGION || 'us-east-1';
        this.sources = this.initializeConfigSources();
        this.cache = new ConfigurationCache();
        this.validators = new ConfigurationValidators();
    }

    // Hierarchical configuration loading
    async get(key, defaultValue = null, options = {}) {
        // Priority: Runtime > Parameter Store > Secrets > S3 > Environment > Defaults
    }

    // Runtime configuration updates
    async setRuntimeOverride(key, value, options = {}) {
        // Validate, cache, notify listeners, optionally persist
    }

    // Configuration change notifications
    addChangeListener(key, callback) {
        // Register listeners for configuration changes
    }
}
```

**Configuration Sources Priority:**
1. **Runtime Overrides**: API-based configuration changes (highest priority)
2. **AWS Parameter Store**: Encrypted, hierarchical configuration storage
3. **AWS Secrets Manager**: API keys, tokens, and sensitive data
4. **S3 Configuration Files**: Complex configurations, templates, mappings
5. **Environment Variables**: Container/Lambda-level configuration
6. **Default Values**: Fallback values in code (lowest priority)

### 2. AI Model Management System

**AIModelManager Class**
```javascript
class AIModelManager {
    constructor(configManager) {
        this.config = configManager;
        this.healthMonitor = new HealthMonitor();
        this.performanceTracker = new PerformanceTracker();
        this.circuitBreakers = new Map();
    }

    // Intelligent model selection
    async selectModel(service, requirements = {}) {
        // service: 'content', 'video', 'audio'
        // Returns optimal model based on health, cost, performance
    }

    // Model API calls with fallback
    async callModel(service, modelConfig, parameters, options = {}) {
        // Implements retry logic, circuit breakers, performance tracking
    }

    // Health monitoring
    async isModelHealthy(service, modelConfig) {
        // Circuit breaker status, health checks, performance metrics
    }
}
```

**Supported AI Services:**
- **Content Generation**: Anthropic (Claude), OpenAI (GPT), AWS Bedrock
- **Video Generation**: AWS Bedrock (Nova Reel), Runway, Luma AI
- **Audio Generation**: AWS Polly (Generative/Neural/Standard), ElevenLabs, Azure Speech

### 3. Simple Cost Tracking System ✅ IMPLEMENTED

**Cost Calculation Function** (Already Implemented in video-generator/index.js)
```javascript
async function calculateGenerationCost(durationSeconds, includeAudio, audioEngine = 'neural') {
    // Get configurable cost rates
    const costRates = await configManager.get('cost.rates', {
        video: { 'nova-reel': 0.80 }, // per minute
        polly: { standard: 4.00, neural: 16.00, generative: 30.00 } // per 1M characters
    });
    
    // Calculate video cost
    const videoCost = (durationSeconds / 60) * costRates.video['nova-reel'];
    
    // Calculate audio cost
    let audioCost = 0;
    if (includeAudio) {
        const estimatedCharacters = Math.max(150, durationSeconds * 18.75);
        const ratePerMillion = costRates.polly[audioEngine] || 16.00;
        audioCost = (estimatedCharacters / 1000000) * ratePerMillion;
    }
    
    return Math.round((videoCost + audioCost) * 10000) / 10000;
}
```

**Cost Tracking in Response** (Already Implemented)
```javascript
{
    success: true,
    videoS3Key: "videos/topic/video.mp4",
    audioS3Key: "audio/topic/audio.mp3",
    generationCost: 0.112,  // ✅ Cost per video tracked
    executionTime: 122000,
    metadata: { duration: 8, hasAudio: true }
}
```

**Features**:
- ✅ **Simple**: Just tracks cost per video (no complex budget systems)
- ✅ **Configurable**: Rates can be updated via configuration system
- ✅ **Accurate**: Uses actual audio engine and video duration
- ✅ **Already Working**: Integrated into video generation pipeline

### 4. Prompt Template Management

**PromptTemplateManager Class**
```javascript
class PromptTemplateManager {
    constructor(configManager) {
        this.config = configManager;
        this.storage = new S3TemplateStorage();
        this.renderer = new TemplateRenderer();
        this.abTester = new ABTestManager();
    }

    // Template loading with versioning
    async loadTemplate(templateType, topic, version = 'latest') {
        // Load from S3 with version control
    }

    // Dynamic template rendering
    async renderTemplate(templateType, variables) {
        // Render with variable substitution and topic customization
    }

    // A/B testing support
    async getTemplateVariant(templateType, topic, userId) {
        // Return A/B test variant based on user assignment
    }
}
```

**Template Structure:**
```javascript
{
    script: {
        investing: {
            template: "Create a {duration}-second video about {topic}. Focus on {keywords} and provide {advice_type} advice for {audience}.",
            variables: {
                duration: 8,
                advice_type: "actionable",
                audience: "beginners"
            },
            variants: {
                control: "standard template",
                variant_a: "enhanced engagement template",
                variant_b: "expert-focused template"
            }
        }
    }
}
```

### 5. Feature Flag and A/B Testing System

**FeatureFlagManager Class**
```javascript
class FeatureFlagManager {
    constructor(configManager) {
        this.config = configManager;
        this.experiments = new ExperimentManager();
        this.analytics = new AnalyticsTracker();
    }

    // Feature flag evaluation
    isFeatureEnabled(featureName, context = {}) {
        // Context-aware feature flag evaluation
    }

    // A/B test assignment
    getExperimentVariant(experimentName, userId) {
        // Statistical user assignment to test groups
    }

    // Experiment tracking
    trackEvent(experimentName, userId, event, metrics) {
        // Track conversion events and success metrics
    }
}
```

**Feature Flag Configuration:**
```javascript
{
    enableGenerativeAI: {
        enabled: true,
        rolloutPercentage: 100,
        targeting: { environment: ["production", "staging"] }
    },
    enableAdvancedVideoEffects: {
        enabled: false,
        rolloutPercentage: 0,
        experiment: "video_effects_test"
    },
    enableMultiLanguageSupport: {
        enabled: true,
        rolloutPercentage: 25,
        targeting: { topic: ["education", "tourism"] }
    }
}
```

### 6. Voice Engine Configuration

**Generative AI Voice Mapping:**
```javascript
{
    voiceMappings: {
        investing: {
            primary: { provider: "polly", engine: "generative", voiceId: "Stephen" },
            fallback: { provider: "polly", engine: "neural", voiceId: "Matthew" }
        },
        education: {
            primary: { provider: "polly", engine: "generative", voiceId: "Aria" },
            fallback: { provider: "polly", engine: "neural", voiceId: "Joanna" }
        },
        tourism: {
            primary: { provider: "polly", engine: "generative", voiceId: "Ruth" },
            fallback: { provider: "polly", engine: "neural", voiceId: "Amy" }
        },
        technology: {
            primary: { provider: "polly", engine: "generative", voiceId: "Stephen" },
            fallback: { provider: "polly", engine: "neural", voiceId: "Brian" }
        }
    }
}
```

## Data Models

### Configuration Schema
```javascript
{
    environment: "production",
    version: "2.1.0",
    
    ai: {
        models: {
            content: {
                primary: {
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    endpoint: "https://api.anthropic.com",
                    maxTokens: 4096,
                    temperature: 0.7
                },
                fallback: {
                    provider: "openai",
                    model: "gpt-4o-mini"
                }
            },
            video: {
                primary: {
                    provider: "bedrock",
                    model: "amazon.nova-reel-v1:0",
                    region: "us-east-1"
                }
            },
            audio: {
                primary: {
                    provider: "polly",
                    engine: "generative",
                    voiceId: "Ruth"
                }
            }
        }
    },
    
    cost: {
        budgets: {
            daily: 10.00,
            monthly: 300.00,
            perVideo: 0.15
        },
        optimization: "balanced" // conservative, balanced, aggressive
    },
    
    features: {
        enableGenerativeAI: true,
        enableAdvancedVideoEffects: false,
        enableMultiLanguage: false
    },
    
    prompts: {
        storageType: "s3",
        bucket: "youtube-automation-prompts",
        version: "v2.1"
    }
}
```

## Error Handling

### Circuit Breaker Pattern
```javascript
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.timeout = options.timeout || 60000;
        this.state = 'closed'; // closed, open, half-open
    }

    async execute(operation) {
        if (this.state === 'open') {
            if (this.shouldAttemptReset()) {
                this.state = 'half-open';
            } else {
                throw new Error('Circuit breaker is open');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
}
```

### Fallback Strategies
1. **AI Model Fallback**: Primary → Secondary → Emergency models
2. **Cost Fallback**: Expensive → Moderate → Cheap service tiers
3. **Quality Fallback**: High → Medium → Basic quality settings
4. **Configuration Fallback**: Runtime → Stored → Environment → Defaults

## Testing Strategy

### Configuration Testing
- **Unit Tests**: Configuration loading, validation, caching
- **Integration Tests**: AWS service integration (SSM, Secrets Manager, S3)
- **Performance Tests**: Configuration loading under load
- **Security Tests**: Secret management and access control

### AI Model Testing
- **Health Check Tests**: Model availability and response validation
- **Fallback Tests**: Automatic failover scenarios
- **Performance Tests**: Concurrent model calls and throughput
- **Cost Tests**: Budget enforcement and optimization

### A/B Testing Framework
- **Statistical Tests**: User assignment and significance testing
- **Conversion Tests**: Event tracking and metric collection
- **Rollout Tests**: Gradual feature deployment
- **Rollback Tests**: Automatic and manual rollback scenarios

## Implementation Phases

### Phase 1: Core Configuration System ✅
- ConfigurationManager with hierarchical loading
- AWS integration (SSM, Secrets Manager, S3)
- Configuration validation and caching
- Runtime configuration updates

### Phase 2: AI Model Management ✅
- AIModelManager with multi-service support
- Health monitoring and circuit breakers
- Performance tracking and metrics
- Automatic failover and fallback

### Phase 3: Cost Management and Optimization
- Comprehensive cost tracking across all services
- Budget enforcement and automatic controls
- Cost optimization recommendations
- Predictive cost analysis

### Phase 4: Advanced Features
- Prompt template management with A/B testing
- Feature flag system with gradual rollouts
- Advanced monitoring and analytics
- Predictive performance optimization

### Phase 5: Production Deployment
- Environment-specific configurations
- Security hardening and compliance
- Comprehensive monitoring and alerting
- Documentation and training

## Security Considerations

### Secret Management
- **AWS Secrets Manager**: Encrypted storage with automatic rotation
- **IAM Roles**: Least privilege access for all services
- **Audit Logging**: Comprehensive access and change tracking
- **Secret Rotation**: Automatic credential refresh and validation

### Configuration Security
- **Encryption**: All sensitive configuration encrypted at rest
- **Access Control**: Role-based access to configuration changes
- **Validation**: Schema validation and sanitization
- **Audit Trail**: Complete history of configuration changes

### Network Security
- **VPC Endpoints**: Private communication with AWS services
- **TLS Encryption**: All API communications encrypted
- **API Authentication**: Secure authentication for all AI services
- **Rate Limiting**: Protection against abuse and cost overruns

This design provides a comprehensive, configurable, and future-proof architecture for the YouTube Automation Platform that eliminates hardcoded values while maintaining performance, security, and reliability.