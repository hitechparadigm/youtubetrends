# Project Structure

**YouTube Automation Platform** - Clean, production-ready codebase structure.

**Last Updated**: October 6, 2025  
**Version**: 1.3.0  
**Status**: Production Ready with Audio Integration

## 📁 **Root Directory Structure**

```
youtube-automation-platform/
├── README.md                    # Main project documentation
├── package.json                 # Node.js dependencies and scripts (v1.3.0)
├── package-lock.json           # Dependency lock file
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest testing configuration
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
│
├── src/                        # 📦 Source Code
│   ├── lambda/                 # Lambda Functions (5 active)
│   │   ├── video-generator/    # Primary video generation
│   │   ├── video-processor/    # Audio-video merging
│   │   ├── youtube-uploader/   # YouTube publishing
│   │   ├── trend-detector/     # Trend analysis
│   │   ├── content-analyzer/   # Content enhancement
│   │   └── tsconfig.json      # Lambda TypeScript config
│   └── config/                 # Configuration files
│       ├── environments.json   # Environment settings
│       └── content-configuration-example.json
│
├── deployment/                 # 🚀 Deployment & Infrastructure
│   ├── iam-policies/          # IAM policy templates
│   │   ├── iam-policy-bedrock-access.json
│   │   ├── iam-policy-comprehensive-access.json
│   │   └── iam-policy-s3-luma-access.json
│   ├── infrastructure/        # Infrastructure as Code
│   │   ├── eventbridge-scheduler-fixed.json
│   │   ├── data-storage-infrastructure.json
│   │   ├── package.json       # CDK dependencies
│   │   └── lib/               # CDK constructs
│   └── stepfunctions/         # Workflow Definitions
│       └── youtube-automation-workflow.json
│
├── tools/                      # 🛠️ Development & Management Tools
│   ├── development/            # Development and testing scripts
│   ├── deploy/                 # Deployment automation
│   ├── management/             # System management
│   ├── setup/                  # Initial setup
│   ├── deploy.sh              # Unix deployment script
│   └── deploy.ps1             # Windows deployment script
│
├── tests/                      # 🧪 Test Suite
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   ├── fixtures/              # Test data
│   └── README.md              # Testing guide
│
├── docs/                       # 📚 Documentation
│   ├── STATUS.md               # Current system status
│   ├── AUDIO_INTEGRATION.md    # Audio implementation guide
│   ├── CHANGELOG.md            # Version history
│   ├── DEPLOYMENT.md           # Deployment procedures
│   ├── TROUBLESHOOTING.md      # Issue resolution
│   ├── ARCHITECTURE.md         # System design
│   ├── API.md                  # API documentation
│   └── PROJECT_STRUCTURE.md    # This file
│
└── .kiro/                      # 🤖 Kiro AI Specifications
    └── specs/                  # Feature specifications
        ├── extended-video-duration/
        └── project-cleanup/
```

## 🎯 **Core Components**

### **Lambda Functions** (5 Active)
All functions running Node.js 20.x in production with comprehensive documentation:

#### 1. **`youtube-automation-video-generator`** 
**File**: `src/lambda/video-generator/index.js`
- **Purpose**: Orchestrates AI video generation with synchronized audio
- **AI Models**: Luma AI Ray v2 (primary), Amazon Bedrock Nova Reel (fallback)
- **Features**: 
  - Dual-model approach with automatic failover
  - Cross-region operations (us-west-2 ↔ us-east-1)
  - Audio generation with Amazon Polly Neural voices
  - SSML timing control for perfect synchronization
  - Cost calculation and performance tracking
- **Runtime**: Node.js 20.x, 3GB RAM, 15min timeout
- **Key Functions**: `generateVideo()`, `generateAudio()`, `calculateGenerationCost()`

#### 2. **`youtube-automation-video-processor`**
**File**: `src/lambda/video-processor/index.js`
- **Purpose**: Merges audio and video using FFmpeg processing
- **Features**:
  - FFmpeg-based audio-video synchronization
  - Quality optimization and format conversion
  - Millisecond-precision timing alignment
  - Error handling for processing failures
- **Runtime**: Node.js 20.x, 2GB RAM, 10min timeout
- **Key Functions**: `mergeAudioVideo()`, `optimizeQuality()`

#### 3. **`youtube-automation-youtube-uploader`**
**File**: `src/lambda/youtube-uploader/index.js`
- **Purpose**: Uploads processed videos to YouTube with SEO optimization
- **Features**:
  - YouTube Data API v3 integration
  - SEO-optimized metadata generation
  - Automatic title, description, and tag creation
  - Quota management and error handling
  - Performance tracking initialization
- **Runtime**: Node.js 20.x, 1GB RAM, 5min timeout
- **Key Functions**: `uploadVideoToYouTube()`, `generateSEOMetadata()`, `storeVideoMetadata()`

#### 4. **`youtube-automation-trend-detector`**
**File**: `src/lambda/trend-detector/index.js`
- **Purpose**: Discovers and analyzes trending topics from multiple sources
- **Features**:
  - Multi-source trend aggregation (Google Trends, News APIs)
  - Topic ranking and relevance scoring
  - Content category classification
  - Trend validation and filtering
- **Runtime**: Node.js 20.x, 1GB RAM, 5min timeout
- **Key Functions**: `detectTrends()`, `rankTopics()`, `validateTrends()`

#### 5. **`youtube-automation-content-analyzer`**
**File**: `src/lambda/content-analyzer/index.js`
- **Purpose**: Enhances content using Claude 3.5 Sonnet AI
- **Features**:
  - Script generation and enhancement
  - SEO keyword optimization
  - Content quality analysis
  - Topic-specific prompt generation
- **Runtime**: Node.js 20.x, 1GB RAM, 3min timeout
- **Key Functions**: `analyzeContent()`, `generateScript()`, `optimizeKeywords()`

### **Development Scripts** (Active)
Located in `tools/development/`:

#### **Testing Scripts**
- **`test-video-generation-only.js`** - Isolated video generation testing
  - Tests Luma AI Ray v2 and Nova Reel integration
  - Validates audio generation and synchronization
  - Measures performance and cost metrics
  
- **`test-complete-workflow.js`** - End-to-end pipeline testing
  - Full workflow from generation to YouTube upload
  - Tests all Lambda function integrations
  - Validates error handling and failover mechanisms
  
- **`test-youtube-upload.js`** - YouTube API integration testing
  - Tests video upload with metadata
  - Validates SEO optimization features
  - Handles quota limit scenarios
  
- **`test-results-summary.js`** - Comprehensive test analysis
  - Aggregates test results and metrics
  - Provides performance benchmarking
  - Generates detailed success/failure reports

#### **Audio Integration Scripts**
- **`test-audio-timing.js`** - Audio synchronization validation
  - Tests SSML timing accuracy
  - Validates audio-video duration matching
  - Measures synchronization precision

### **Management Scripts** (Active)
Located in `scripts/management/`:

- **`manage-scheduler.js`** - EventBridge schedule management
- **`verify-scheduler.js`** - System status verification
- **`analyze-project-metrics.js`** - Performance analysis

### **Deployment Scripts** (Active)
Located in `scripts/deploy/`:

- **`deploy-production-ready.js`** - Complete system deployment
- **`deploy-scheduler.js`** - EventBridge scheduler setup
- **`setup-youtube-api.js`** - YouTube API configuration

## 📊 **File Statistics**

### **Code Distribution**
- **Lambda Functions**: 5 directories, ~2,000 lines
- **Scripts**: 15 active files, ~3,500 lines
- **Documentation**: 9 files, ~5,000 lines
- **Infrastructure**: 4 files, ~1,200 lines
- **Tests**: 8 files, ~1,500 lines

### **Total Project Size**
- **Active Code**: ~9,200 lines
- **Documentation**: ~5,000 lines
- **Configuration**: ~500 lines
- **Total**: ~14,700 lines

## 🧹 **Cleanup Completed**

### **Removed Unused Components**
- **13 unused Lambda functions** (kept only 5 active)
- **Empty example directories**
- **Unused source directories**
- **Test video files**
- **Deprecated scripts**

### **Organized Structure**
- **Consolidated documentation** in `docs/`
- **Active scripts only** in `scripts/`
- **Production Lambda functions** in `lambda/`
- **Clean test structure** in `tests/`

## 🔧 **Key Configuration Files**

### **package.json** (v1.3.0)
- **Version**: 1.3.0 (Audio Integration Complete)
- **Node.js**: >=20.0.0 (production requirement)
- **Scripts**: Updated with current test commands
- **Dependencies**: AWS SDK v3, Google APIs

### **tsconfig.json**
- **Target**: ES2022
- **Module**: CommonJS
- **Strict**: true (type safety)

### **jest.config.js**
- **Test Environment**: Node.js
- **Coverage**: Enabled
- **Test Patterns**: `tests/**/*.test.js`

## 📚 **Documentation Structure**

### **Primary Documentation**
- **README.md**: Complete project overview and setup
- **STATUS.md**: Current system status and metrics
- **AUDIO_INTEGRATION.md**: Audio implementation details
- **CHANGELOG.md**: Version history and changes

### **Technical Documentation**
- **DEPLOYMENT.md**: Step-by-step deployment guide
- **TROUBLESHOOTING.md**: Common issues and solutions
- **ARCHITECTURE.md**: System design and components
- **API.md**: API reference and examples

## 🎯 **Usage Patterns**

### **Development Workflow**
```bash
# Test video generation
npm run dev:generate

# Test complete workflow
npm run dev:test-complete

# Test YouTube upload
npm run dev:test-upload

# Verify system status
npm run manage:verify
```

### **Deployment Workflow**
```bash
# Deploy complete system
npm run deploy

# Setup YouTube API
npm run setup:youtube

# Deploy scheduler
npm run deploy:scheduler
```

### **Management Workflow**
```bash
# Manage schedules
npm run manage:scheduler

# Analyze metrics
npm run manage:analyze

# Verify deployment
npm run manage:verify
```

## 🔒 **Security & Best Practices**

### **Code Organization**
- **Separation of Concerns**: Each Lambda has single responsibility
- **Configuration Management**: Environment variables for secrets
- **Error Handling**: Comprehensive try-catch and logging
- **Type Safety**: TypeScript for critical components

### **AWS Security**
- **IAM Roles**: Least privilege access
- **Secrets Manager**: API keys and credentials
- **VPC**: Network isolation where needed
- **Encryption**: At-rest and in-transit

## 📈 **Maintenance**

### **Regular Tasks**
- **Dependency Updates**: Monthly security updates
- **Log Monitoring**: CloudWatch log analysis
- **Cost Optimization**: Monthly cost review
- **Performance Tuning**: Quarterly performance analysis

### **Version Control**
- **Git**: Clean commit history
- **Branching**: Feature branches for development
- **Releases**: Tagged versions with changelogs
- **Documentation**: Updated with each release

---

## 🎉 **Summary**

The YouTube Automation Platform now has a **clean, production-ready structure** with:

✅ **5 active Lambda functions** (removed 13 unused)  
✅ **Organized documentation** (9 comprehensive files)  
✅ **Clean script structure** (15 active development/management scripts)  
✅ **Updated dependencies** (Node.js 20, AWS SDK v3)  
✅ **Comprehensive testing** (unit, integration, e2e)  
✅ **Production deployment** (Infrastructure as Code)  

**Total Project**: 14,700 lines of clean, documented, production-ready code.

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: October 6, 2025  
**Version**: 1.3.0 - Audio Integration Complete