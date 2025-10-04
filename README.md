# 🎬 YouTube Automation Platform

**Complete AI-Powered Video Generation & Publishing System**

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)](https://github.com/yourusername/youtube-automation)
[![AWS](https://img.shields.io/badge/AWS-Bedrock%20%7C%20Lambda%20%7C%20S3-orange)](https://aws.amazon.com/)
[![YouTube](https://img.shields.io/badge/YouTube-Data%20API%20v3-red)](https://developers.google.com/youtube/v3)

> **🚧 IMPORTANT**: This system is currently under development. Critical fixes are needed before production use.

## 🚀 Quick Start

### Prerequisites
- AWS Account with Bedrock access
- YouTube Data API v3 credentials
- Node.js 18+ and npm
- AWS CLI configured

### Installation
```bash
# Clone and install
git clone <repository-url>
cd youtube-automation-platform
npm install

# Deploy infrastructure
npm run deploy

# Setup YouTube credentials
npm run setup:youtube

# Test the system
npm run dev:test
```

## 📁 Project Structure

```
youtube-automation-platform/
├── README.md                    # This file
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Test configuration
│
├── docs/                       # 📚 Complete documentation
│   ├── PROJECT_STATUS.md       # Current status and issues
│   ├── CRITICAL_FIXES_NEEDED.md # Issues that need fixing
│   ├── AUDIO_INTEGRATION_FIX.md # Audio fix implementation
│   ├── ETF_EXAMPLE_STANDARD.md # Quality standards
│   └── NEXT_SESSION_CONTEXT.md # Context for development
│
├── src/                        # 🏗️ Core application code
│   ├── lambda/                 # AWS Lambda functions
│   ├── config/                 # Configuration files
│   ├── utils/                  # Shared utilities
│   └── types/                  # TypeScript definitions
│
├── infrastructure/             # ☁️ Infrastructure as Code
├── tests/                      # 🧪 All tests
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
│
├── scripts/                    # 🔧 Management scripts
│   ├── deploy/                 # Deployment scripts
│   ├── development/            # Development tools
│   └── management/             # System management
│
└── examples/                   # 📋 Example configurations
    ├── configurations/         # Topic configurations
    └── prompts/               # Video prompt examples
```

## 🎯 Current Status

### ✅ Working Components
- AWS Infrastructure (S3, Lambda, DynamoDB, EventBridge)
- Basic video generation (6 seconds)
- YouTube upload capability
- Automated scheduling

### 🚨 Critical Issues (Need Fixing)
1. **Audio Integration**: Videos upload without audio
2. **Configurable Trends**: Trends are hardcoded
3. **Prompt Quality**: Need cinematic prompts
4. **Video Duration**: Currently 6s, need 3-10 minutes
5. **Project Structure**: ✅ FIXED - Now organized!

## 🔧 Available Commands

### Development
```bash
npm run dev:generate     # Generate test video
npm run dev:test         # Run development tests
npm run dev:check        # Check S3 files
npm run dev:validate     # Quick system validation
```

### Testing
```bash
npm run test             # Run all tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:requirements # Validate requirements
```

### Deployment
```bash
npm run deploy           # Deploy complete system
npm run deploy:scheduler # Deploy automation
npm run setup:youtube    # Setup YouTube API
```

### Management
```bash
npm run manage:scheduler # Manage automation
npm run manage:verify    # Verify deployment
npm run manage:analyze   # Analyze performance
```

## 📚 Documentation

All documentation is in the `docs/` folder:

- **`docs/PROJECT_STATUS.md`** - Complete current status
- **`docs/CRITICAL_FIXES_NEEDED.md`** - Issues to fix
- **`docs/AUDIO_INTEGRATION_FIX.md`** - Audio fix guide
- **`docs/ETF_EXAMPLE_STANDARD.md`** - Quality standards
- **`docs/NEXT_SESSION_CONTEXT.md`** - Development context

## 🚧 Next Steps

1. **Fix Audio Integration** - Videos need synchronized audio
2. **Implement Configurable Trends** - Make categories dynamic
3. **Improve Prompt Quality** - Follow ETF example standard
4. **Extend Video Duration** - Support 3-10 minute videos

## 🤝 Contributing

1. Read `docs/PROJECT_STATUS.md` for current status
2. Check `docs/CRITICAL_FIXES_NEEDED.md` for priority issues
3. Follow the organized project structure
4. Test changes with `npm run test`

## 📄 License

MIT License - see LICENSE file for details.

---

**🎯 Goal**: Fully automated YouTube content creation with AI-generated videos, professional audio, and intelligent trend analysis.

**📊 Progress**: Infrastructure ✅ | Audio Integration 🚧 | Trend Configuration 🚧 | Quality Prompts 🚧
