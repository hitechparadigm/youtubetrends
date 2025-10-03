# YouTube Automation Platform - Project Structure

## 📁 **Complete Project Organization**

This document provides a comprehensive overview of the project structure, explaining the purpose and contents of each directory and file.

```
youtube-automation-platform/
├── 📁 .kiro/                              # Kiro IDE configuration and specs
│   ├── 📁 specs/                          # Feature specifications
│   │   └── 📁 youtube-automation-platform/
│   │       ├── 📄 requirements.md         # Feature requirements and user stories
│   │       ├── 📄 design.md              # System design and architecture
│   │       └── 📄 tasks.md               # Implementation tasks and progress
│   └── 📁 steering/                       # Development guidelines and standards
│
├── 📁 docs/                               # Comprehensive documentation
│   ├── 📄 README.md                      # Documentation index and overview
│   ├── 📄 GETTING_STARTED.md             # Quick start guide (30 minutes)
│   ├── 📄 ARCHITECTURE.md                # Detailed system architecture
│   ├── 📄 API.md                         # Complete API documentation
│   ├── 📄 DEPLOYMENT.md                  # Production deployment guide
│   ├── 📁 diagrams/                      # Architecture diagrams and visuals
│   ├── 📁 examples/                      # Code examples and tutorials
│   └── 📁 troubleshooting/               # Common issues and solutions
│
├── 📁 lambda/                             # AWS Lambda functions
│   ├── 📁 video-generator/               # Bedrock Nova Reel integration
│   │   ├── 📄 index.ts                   # Main video generation logic
│   │   ├── 📄 package.json               # Dependencies and configuration
│   │   └── 📁 lib/                       # Utility functions and helpers
│   │
│   ├── 📁 enhanced-content-generator/     # Claude AI content enhancement
│   │   ├── 📄 index.ts                   # Content transformation logic
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 templates/                 # Content templates by category
│   │
│   ├── 📁 thumbnail-generator/            # Bedrock Titan Image integration
│   │   ├── 📄 index.ts                   # Thumbnail generation logic
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 templates/                 # Thumbnail templates by style
│   │
│   ├── 📁 dynamic-prompt-generator/       # Real-time prompt creation
│   │   ├── 📄 index.ts                   # Dynamic prompt generation
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 prompts/                   # Base prompt templates
│   │
│   ├── 📁 trend-discovery-service/        # Multi-source trend analysis
│   │   ├── 📄 index.ts                   # Trend discovery and analysis
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 sources/                   # Trend source integrations
│   │
│   ├── 📁 topic-config-manager/           # Category configuration
│   │   ├── 📄 index.ts                   # Topic configuration management
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 configs/                   # Category-specific configurations
│   │
│   ├── 📁 youtube-uploader/               # YouTube API integration
│   │   ├── 📄 index.ts                   # Video upload and metadata
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 auth/                      # OAuth and authentication
│   │
│   ├── 📁 data-storage-manager/           # Multi-tier storage management
│   │   ├── 📄 index.ts                   # Storage lifecycle management
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 policies/                  # Lifecycle policies
│   │
│   ├── 📁 analytics-engine/               # Performance analytics
│   │   ├── 📄 index.ts                   # Analytics processing
│   │   ├── 📄 package.json               # Dependencies
│   │   └── 📁 reports/                   # Report templates
│   │
│   └── 📁 content-analyzer/               # Content analysis (legacy)
│       ├── 📄 index.ts                   # Basic content analysis
│       └── 📄 package.json               # Dependencies
│
├── 📁 infrastructure/                     # Infrastructure as Code
│   ├── 📄 main.yaml                      # Main CloudFormation template
│   ├── 📄 data-storage-infrastructure.json # Multi-tier storage setup
│   ├── 📄 eventbridge-scheduler-fixed.json # Automation scheduler
│   ├── 📄 core-infrastructure.yaml       # Core AWS services
│   ├── 📄 iam-roles.yaml                 # IAM roles and policies
│   ├── 📄 monitoring.yaml                # CloudWatch monitoring
│   ├── 📄 security.yaml                  # Security configurations
│   └── 📁 templates/                     # Reusable CloudFormation templates
│
├── 📁 scripts/                           # Automation and utility scripts
│   ├── 📄 deploy-all.js                  # Complete deployment script
│   ├── 📄 setup-youtube-oauth.js         # YouTube OAuth setup
│   ├── 📄 manage-scheduler.js            # Scheduler management
│   ├── 📄 verify-deployment.js           # Deployment verification
│   ├── 📄 cost-analysis.js               # Cost analysis and reporting
│   ├── 📄 health-check.js                # System health monitoring
│   └── 📁 utilities/                     # Helper scripts and tools
│
├── 📁 tests/                             # Comprehensive test suite
│   ├── 📁 unit/                          # Unit tests for individual components
│   ├── 📁 integration/                   # Integration tests for workflows
│   ├── 📁 e2e/                          # End-to-end pipeline tests
│   ├── 📁 performance/                   # Performance and load tests
│   ├── 📁 fixtures/                      # Test data and mock responses
│   └── 📄 jest.config.js                 # Jest testing configuration
│
├── 📁 config/                            # Configuration files
│   ├── 📄 categories.js                  # Content category configurations
│   ├── 📄 aws-config.js                  # AWS service configurations
│   ├── 📄 youtube-config.js              # YouTube API configurations
│   ├── 📄 storage-config.js              # Storage tier configurations
│   └── 📁 environments/                  # Environment-specific configs
│
├── 📁 monitoring/                        # Monitoring and alerting
│   ├── 📁 dashboards/                    # CloudWatch dashboard definitions
│   ├── 📁 alarms/                        # CloudWatch alarm configurations
│   ├── 📁 logs/                          # Log analysis and aggregation
│   └── 📄 metrics.js                     # Custom metrics definitions
│
├── 📁 examples/                          # Working examples and tutorials
│   ├── 📄 basic-video-generation.js      # Simple video generation example
│   ├── 📄 batch-processing.js            # Batch video creation example
│   ├── 📄 custom-content.js              # Custom content creation
│   ├── 📄 analytics-reporting.js         # Analytics and reporting example
│   └── 📁 tutorials/                     # Step-by-step tutorials
│
├── 📁 tools/                             # Development and debugging tools
│   ├── 📄 debug-pipeline.js              # Pipeline debugging utility
│   ├── 📄 cost-calculator.js             # Cost estimation tool
│   ├── 📄 performance-profiler.js        # Performance analysis tool
│   └── 📄 log-analyzer.js                # Log analysis utility
│
├── 📄 README.md                          # Main project documentation
├── 📄 CHANGELOG.md                       # Version history and changes
├── 📄 PROJECT_STRUCTURE.md               # This file - project organization
├── 📄 CONTRIBUTING.md                    # Contribution guidelines
├── 📄 LICENSE                            # MIT license
├── 📄 package.json                       # Node.js dependencies and scripts
├── 📄 package-lock.json                  # Locked dependency versions
├── 📄 .env.example                       # Environment variables template
├── 📄 .gitignore                         # Git ignore patterns
├── 📄 .eslintrc.js                       # ESLint configuration
├── 📄 .prettierrc                        # Prettier code formatting
├── 📄 tsconfig.json                      # TypeScript configuration
└── 📄 jest.config.js                     # Jest testing configuration

# Production Test Files (Root Level)
├── 📄 generate-first-video.js            # First video generation script
├── 📄 create-video-with-audio-from-scratch.js # Complete video creation
├── 📄 test-video-generator-direct.js     # Direct video generation test
├── 📄 test-enhanced-content.js           # Enhanced content testing
├── 📄 test-data-storage-analytics.js     # Storage and analytics test
├── 📄 deploy-scheduler.js                # Scheduler deployment
├── 📄 verify-scheduler.js                # Scheduler verification
├── 📄 manage-scheduler.js                # Scheduler management
├── 📄 create-two-videos-now.js           # Batch video creation
├── 📄 final-two-videos.js                # Final production test
└── 📄 test-pipeline-sequence.ts          # Pipeline sequence testing
```

## 📋 **Directory Descriptions**

### **📁 Core Directories**

#### **`.kiro/` - Kiro IDE Configuration**
- **Purpose**: Kiro IDE specifications and development guidelines
- **Key Files**: 
  - `specs/youtube-automation-platform/` - Complete feature specification
  - `requirements.md` - User stories and acceptance criteria
  - `design.md` - System architecture and design decisions
  - `tasks.md` - Implementation tasks and completion status

#### **`docs/` - Documentation Suite**
- **Purpose**: Comprehensive project documentation
- **Key Files**:
  - `README.md` - Documentation index and navigation
  - `GETTING_STARTED.md` - 30-minute setup guide
  - `ARCHITECTURE.md` - Detailed system architecture
  - `API.md` - Complete API reference
  - `DEPLOYMENT.md` - Production deployment guide

#### **`lambda/` - AWS Lambda Functions**
- **Purpose**: Serverless compute functions for all operations
- **Key Components**:
  - `video-generator/` - Bedrock Nova Reel integration
  - `enhanced-content-generator/` - Claude AI content enhancement
  - `thumbnail-generator/` - Bedrock Titan Image integration
  - `youtube-uploader/` - YouTube API integration
  - `analytics-engine/` - Performance analytics processing

#### **`infrastructure/` - Infrastructure as Code**
- **Purpose**: AWS CloudFormation templates for deployment
- **Key Files**:
  - `main.yaml` - Main infrastructure template
  - `data-storage-infrastructure.json` - Multi-tier storage
  - `eventbridge-scheduler-fixed.json` - Automation scheduler
  - `monitoring.yaml` - CloudWatch monitoring setup

### **📁 Supporting Directories**

#### **`scripts/` - Automation Scripts**
- **Purpose**: Deployment, management, and utility scripts
- **Key Scripts**:
  - `deploy-all.js` - Complete system deployment
  - `setup-youtube-oauth.js` - YouTube API authentication
  - `manage-scheduler.js` - Scheduler control and monitoring
  - `cost-analysis.js` - Cost analysis and optimization

#### **`tests/` - Test Suite**
- **Purpose**: Comprehensive testing framework
- **Test Types**:
  - `unit/` - Individual component tests
  - `integration/` - Workflow integration tests
  - `e2e/` - End-to-end pipeline tests
  - `performance/` - Load and performance tests

#### **`config/` - Configuration Management**
- **Purpose**: System and environment configurations
- **Key Configs**:
  - `categories.js` - Content category settings
  - `aws-config.js` - AWS service configurations
  - `youtube-config.js` - YouTube API settings
  - `storage-config.js` - Storage tier policies

#### **`monitoring/` - Observability**
- **Purpose**: Monitoring, alerting, and observability
- **Components**:
  - `dashboards/` - CloudWatch dashboard definitions
  - `alarms/` - Alert configurations
  - `logs/` - Log analysis and aggregation
  - `metrics.js` - Custom metrics definitions

## 🔧 **Key File Descriptions**

### **📄 Core Configuration Files**

#### **`package.json` - Project Dependencies**
```json
{
  "name": "youtube-automation-platform",
  "version": "1.2.0",
  "description": "AI-powered YouTube content automation",
  "scripts": {
    "deploy:all": "node scripts/deploy-all.js",
    "test": "jest",
    "start": "node generate-first-video.js"
  },
  "dependencies": {
    "@aws-sdk/client-bedrock": "^3.x.x",
    "@aws-sdk/client-s3": "^3.x.x",
    "@aws-sdk/client-dynamodb": "^3.x.x",
    "googleapis": "^118.x.x"
  }
}
```

#### **`.env.example` - Environment Template**
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# YouTube API
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token

# Bedrock Models
BEDROCK_VIDEO_MODEL=amazon.nova-reel-v1:0
BEDROCK_TEXT_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_IMAGE_MODEL=amazon.titan-image-generator-v1
```

### **📄 Production Test Files**

#### **Root Level Test Scripts**
- **`generate-first-video.js`** - Complete first video generation
- **`create-video-with-audio-from-scratch.js`** - Full pipeline test
- **`test-video-generator-direct.js`** - Direct video generation
- **`deploy-scheduler.js`** - Automation deployment
- **`verify-scheduler.js`** - Scheduler verification

## 🏗️ **Architecture Mapping**

### **Service to Directory Mapping**

| AWS Service | Directory | Purpose |
|-------------|-----------|---------|
| **AWS Bedrock** | `lambda/video-generator/` | Video generation with Nova Reel |
| **AWS Bedrock** | `lambda/enhanced-content-generator/` | Content enhancement with Claude |
| **AWS Bedrock** | `lambda/thumbnail-generator/` | Thumbnail creation with Titan Image |
| **Amazon Polly** | `lambda/audio-generator/` | Voice synthesis and narration |
| **YouTube API** | `lambda/youtube-uploader/` | Video publishing and metadata |
| **Amazon S3** | `lambda/data-storage-manager/` | Multi-tier storage management |
| **DynamoDB** | `lambda/analytics-engine/` | Analytics and metadata storage |
| **EventBridge** | `infrastructure/eventbridge-scheduler-fixed.json` | Automation scheduling |
| **CloudWatch** | `monitoring/` | Monitoring and alerting |

### **Data Flow Through Directories**

```
1. Trend Discovery (lambda/trend-discovery-service/)
   ↓
2. Content Enhancement (lambda/enhanced-content-generator/)
   ↓
3. Video Generation (lambda/video-generator/)
   ↓
4. Audio Generation (lambda/audio-generator/)
   ↓
5. Thumbnail Generation (lambda/thumbnail-generator/)
   ↓
6. Storage Management (lambda/data-storage-manager/)
   ↓
7. YouTube Upload (lambda/youtube-uploader/)
   ↓
8. Analytics Processing (lambda/analytics-engine/)
```

## 📊 **File Size and Complexity**

### **Large Files (>1000 lines)**
- `docs/ARCHITECTURE.md` - Comprehensive architecture documentation
- `docs/API.md` - Complete API reference
- `docs/DEPLOYMENT.md` - Detailed deployment guide
- `lambda/enhanced-content-generator/index.ts` - Complex content logic
- `infrastructure/main.yaml` - Complete infrastructure template

### **Medium Files (500-1000 lines)**
- `README.md` - Main project documentation
- `lambda/video-generator/index.ts` - Video generation logic
- `lambda/youtube-uploader/index.ts` - YouTube integration
- `CHANGELOG.md` - Version history
- `docs/GETTING_STARTED.md` - Setup guide

### **Small Files (<500 lines)**
- Configuration files in `config/`
- Individual test files in `tests/`
- Utility scripts in `scripts/`
- Template files in various directories

## 🔄 **Development Workflow**

### **Adding New Features**
1. **Specification**: Update `.kiro/specs/youtube-automation-platform/`
2. **Implementation**: Create/modify files in `lambda/`
3. **Infrastructure**: Update `infrastructure/` templates
4. **Testing**: Add tests in `tests/`
5. **Documentation**: Update `docs/`
6. **Configuration**: Update `config/` if needed

### **Deployment Process**
1. **Development**: Test locally with files in root
2. **Infrastructure**: Deploy with `infrastructure/` templates
3. **Functions**: Deploy Lambda functions from `lambda/`
4. **Verification**: Run scripts from `scripts/`
5. **Monitoring**: Configure with `monitoring/` definitions

## 🎯 **Navigation Guide**

### **For New Developers**
1. Start with `README.md`
2. Follow `docs/GETTING_STARTED.md`
3. Review `docs/ARCHITECTURE.md`
4. Explore `examples/` directory
5. Check `.kiro/specs/` for requirements

### **For DevOps Engineers**
1. Review `infrastructure/` directory
2. Study `docs/DEPLOYMENT.md`
3. Check `monitoring/` configurations
4. Review `scripts/` for automation
5. Understand `config/` settings

### **For API Developers**
1. Study `docs/API.md`
2. Explore `lambda/` functions
3. Check `examples/` for usage
4. Review `tests/integration/`
5. Understand data flow in `lambda/data-storage-manager/`

This project structure supports a production-ready, scalable YouTube automation platform with comprehensive documentation, testing, and monitoring capabilities.