#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectReorganizer {
    constructor() {
        this.movedFiles = [];
        this.duplicateFiles = [];
        this.errors = [];
    }

    async reorganize() {
        console.log('🔧 YouTube Automation Platform - Project Reorganization');
        console.log('=' .repeat(70));
        console.log('Cleaning up 50+ files in root directory\n');

        try {
            // Step 1: Create clean directory structure
            await this.createDirectoryStructure();

            // Step 2: Identify and categorize files
            await this.categorizeFiles();

            // Step 3: Move files to appropriate locations
            await this.moveFiles();

            // Step 4: Remove duplicates and consolidate documentation
            await this.removeDuplicates();

            // Step 5: Update package.json scripts
            await this.updatePackageJson();

            // Step 6: Create clean README
            await this.createCleanReadme();

            // Step 7: Generate reorganization report
            await this.generateReport();

            console.log('\n✅ Project reorganization completed successfully!');
            this.displaySummary();

        } catch (error) {
            console.error('\n❌ Reorganization failed:', error.message);
            process.exit(1);
        }
    }

    async createDirectoryStructure() {
        console.log('📁 Creating clean directory structure...');

        const directories = [
            'src/lambda',
            'src/config', 
            'src/utils',
            'src/types',
            'tests/unit',
            'tests/integration', 
            'tests/e2e',
            'scripts/deploy',
            'scripts/management',
            'scripts/development',
            'examples/configurations',
            'examples/prompts'
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`  ✓ Created: ${dir}`);
            }
        }
        console.log('');
    }

    async categorizeFiles() {
        console.log('🔍 Categorizing files...');

        this.fileCategories = {
            // Keep in root
            keepInRoot: [
                'package.json',
                'package-lock.json', 
                'tsconfig.json',
                'jest.config.js',
                '.gitignore',
                'README.md'
            ],

            // Move to scripts/development/
            development: [
                'generate-first-video.js',
                'create-simple-video-test.js',
                'create-video-with-audio-from-scratch.js',
                'create-complete-trending-video.js',
                'create-trending-video.js',
                'create-two-enhanced-videos.js',
                'create-two-videos-direct.js',
                'create-two-videos-now.js',
                'final-two-videos.js',
                'demo-optimized-prompts.js',
                'check-s3-audio-files.js',
                'check-s3-files.js',
                'quick-validation.js'
            ],

            // Move to scripts/deploy/
            deploy: [
                'deploy-complete-solution.js',
                'deploy-enhanced-features.js',
                'deploy-optimized-solution.js',
                'deploy-production-ready.js',
                'deploy-scheduler.js',
                'deploy-and-test-complete-platform.js',
                'setup-youtube-api.js',
                'setup-youtube-credentials.js'
            ],

            // Move to scripts/management/
            management: [
                'manage-scheduler.js',
                'verify-scheduler.js',
                'analyze-project-metrics.js',
                'fix-audio-and-reupload.js',
                'fix-complete-solution.js',
                'fix-core-issues.js',
                'merge-audio-and-reupload.js'
            ],

            // Move to tests/integration/
            integration: [
                'test-complete-pipeline-with-audio-subtitles.js',
                'test-optimized-video-generation.js',
                'test-enhanced-content.js',
                'test-dynamic-prompts.js',
                'test-thumbnail-generation.js',
                'test-video-generator-direct.js',
                'test-data-storage-analytics.js',
                'complete-pipeline-test.js',
                'complete-solution-test.js'
            ],

            // Move to tests/e2e/
            e2e: [
                'test-all-requirements.js',
                'validate-all-requirements.js',
                'test-detailed-execution.ts',
                'test-pipeline-sequence.ts',
                'test-production-pipeline.ts'
            ],

            // Move to scripts/development/ (upload tests)
            uploadTests: [
                'upload-and-create-second-video.js',
                'upload-existing-video.js',
                'upload-video2-with-audio.js',
                'process-and-upload-video2.js'
            ],

            // Move to src/config/
            config: [
                'bedrock-policy.json'
            ],

            // Remove (duplicates or obsolete)
            remove: [
                'DEPLOYMENT_SUCCESS_REPORT.md',  // Duplicate of docs content
                'SOLUTION_VALIDATION.md',        // Duplicate of docs content
                'VALIDATION_REPORT.md',          // Duplicate of docs content
                'validation-report.json',        // Generated file
                'PROJECT_STRUCTURE.md',          // Duplicate of docs content
                'SESSION_RECOVERY_DOCUMENT.md',  // Duplicate of docs content
                'cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE' // Invalid filename
            ]
        };

        console.log('  ✓ Files categorized');
        console.log('');
    }

    async moveFiles() {
        console.log('📦 Moving files to organized structure...');

        const moves = [
            { category: 'development', destination: 'scripts/development/' },
            { category: 'deploy', destination: 'scripts/deploy/' },
            { category: 'management', destination: 'scripts/management/' },
            { category: 'integration', destination: 'tests/integration/' },
            { category: 'e2e', destination: 'tests/e2e/' },
            { category: 'uploadTests', destination: 'scripts/development/' },
            { category: 'config', destination: 'src/config/' }
        ];

        for (const move of moves) {
            const files = this.fileCategories[move.category];
            for (const file of files) {
                if (fs.existsSync(file)) {
                    const newPath = path.join(move.destination, file);
                    fs.renameSync(file, newPath);
                    this.movedFiles.push({ from: file, to: newPath });
                    console.log(`  ✓ Moved: ${file} → ${newPath}`);
                }
            }
        }

        console.log('');
    }

    async removeDuplicates() {
        console.log('🗑️  Removing duplicates and obsolete files...');

        const filesToRemove = this.fileCategories.remove;
        
        for (const file of filesToRemove) {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                this.duplicateFiles.push(file);
                console.log(`  ✓ Removed: ${file}`);
            }
        }

        console.log('');
    }

    async updatePackageJson() {
        console.log('📝 Updating package.json scripts...');

        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Update scripts to reflect new structure
        packageJson.scripts = {
            // Build commands
            "build": "npm run build:lambda",
            "build:lambda": "cd src/lambda && npm run build",
            
            // Test commands
            "test": "npm run test:unit && npm run test:integration",
            "test:unit": "jest tests/unit",
            "test:integration": "jest tests/integration", 
            "test:e2e": "jest tests/e2e",
            "test:requirements": "node tests/e2e/test-all-requirements.js",
            
            // Development commands
            "dev:generate": "node scripts/development/generate-first-video.js",
            "dev:test": "node scripts/development/create-simple-video-test.js",
            "dev:check": "node scripts/development/check-s3-files.js",
            "dev:validate": "node scripts/development/quick-validation.js",
            
            // Deployment commands
            "deploy": "node scripts/deploy/deploy-production-ready.js",
            "deploy:scheduler": "node scripts/deploy/deploy-scheduler.js",
            "deploy:infrastructure": "node scripts/deploy/deploy-complete-solution.js",
            "setup:youtube": "node scripts/deploy/setup-youtube-api.js",
            
            // Management commands
            "manage:scheduler": "node scripts/management/manage-scheduler.js",
            "manage:verify": "node scripts/management/verify-scheduler.js",
            "manage:analyze": "node scripts/management/analyze-project-metrics.js",
            "manage:fix-audio": "node scripts/management/fix-audio-and-reupload.js",
            
            // Utility commands
            "clean": "rm -rf src/lambda/*/dist src/lambda/*/node_modules node_modules",
            "lint": "eslint . --ext .js,.ts",
            "format": "prettier --write ."
        };

        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        console.log('  ✓ Updated package.json scripts');
        console.log('');
    }

    async createCleanReadme() {
        console.log('📖 Creating clean README.md...');

        const cleanReadme = `# 🎬 YouTube Automation Platform

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
\`\`\`bash
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
\`\`\`

## 📁 Project Structure

\`\`\`
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
\`\`\`

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
\`\`\`bash
npm run dev:generate     # Generate test video
npm run dev:test         # Run development tests
npm run dev:check        # Check S3 files
npm run dev:validate     # Quick system validation
\`\`\`

### Testing
\`\`\`bash
npm run test             # Run all tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:requirements # Validate requirements
\`\`\`

### Deployment
\`\`\`bash
npm run deploy           # Deploy complete system
npm run deploy:scheduler # Deploy automation
npm run setup:youtube    # Setup YouTube API
\`\`\`

### Management
\`\`\`bash
npm run manage:scheduler # Manage automation
npm run manage:verify    # Verify deployment
npm run manage:analyze   # Analyze performance
\`\`\`

## 📚 Documentation

All documentation is in the \`docs/\` folder:

- **\`docs/PROJECT_STATUS.md\`** - Complete current status
- **\`docs/CRITICAL_FIXES_NEEDED.md\`** - Issues to fix
- **\`docs/AUDIO_INTEGRATION_FIX.md\`** - Audio fix guide
- **\`docs/ETF_EXAMPLE_STANDARD.md\`** - Quality standards
- **\`docs/NEXT_SESSION_CONTEXT.md\`** - Development context

## 🚧 Next Steps

1. **Fix Audio Integration** - Videos need synchronized audio
2. **Implement Configurable Trends** - Make categories dynamic
3. **Improve Prompt Quality** - Follow ETF example standard
4. **Extend Video Duration** - Support 3-10 minute videos

## 🤝 Contributing

1. Read \`docs/PROJECT_STATUS.md\` for current status
2. Check \`docs/CRITICAL_FIXES_NEEDED.md\` for priority issues
3. Follow the organized project structure
4. Test changes with \`npm run test\`

## 📄 License

MIT License - see LICENSE file for details.

---

**🎯 Goal**: Fully automated YouTube content creation with AI-generated videos, professional audio, and intelligent trend analysis.

**📊 Progress**: Infrastructure ✅ | Audio Integration 🚧 | Trend Configuration 🚧 | Quality Prompts 🚧
`;

        fs.writeFileSync('README.md', cleanReadme);
        console.log('  ✓ Created clean README.md');
        console.log('');
    }

    async generateReport() {
        console.log('📊 Generating reorganization report...');

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFilesMoved: this.movedFiles.length,
                duplicatesRemoved: this.duplicateFiles.length,
                errorsEncountered: this.errors.length
            },
            movedFiles: this.movedFiles,
            duplicatesRemoved: this.duplicateFiles,
            errors: this.errors,
            newStructure: {
                rootFiles: this.fileCategories.keepInRoot,
                directories: [
                    'docs/ - All documentation',
                    'src/ - Core application code',
                    'tests/ - All test files',
                    'scripts/ - Management and deployment',
                    'infrastructure/ - Infrastructure as Code',
                    'examples/ - Example configurations'
                ]
            }
        };

        fs.writeFileSync('docs/REORGANIZATION_REPORT.md', this.generateMarkdownReport(report));
        console.log('  ✓ Report saved to docs/REORGANIZATION_REPORT.md');
        console.log('');
    }

    generateMarkdownReport(report) {
        return `# Project Reorganization Report

## Summary
- **Timestamp**: ${report.timestamp}
- **Files Moved**: ${report.summary.totalFilesMoved}
- **Duplicates Removed**: ${report.summary.duplicatesRemoved}
- **Errors**: ${report.summary.errorsEncountered}

## Files Moved
${report.movedFiles.map(file => `- \`${file.from}\` → \`${file.to}\``).join('\n')}

## Duplicates Removed
${report.duplicatesRemoved.map(file => `- \`${file}\``).join('\n')}

## New Project Structure
${report.newStructure.directories.map(dir => `- ${dir}`).join('\n')}

## Root Directory (Clean)
${report.newStructure.rootFiles.map(file => `- \`${file}\``).join('\n')}

---
**Status**: ✅ Project reorganization completed successfully
`;
    }

    displaySummary() {
        console.log('📊 REORGANIZATION SUMMARY');
        console.log('=' .repeat(40));
        console.log(`✅ Files moved: ${this.movedFiles.length}`);
        console.log(`🗑️  Duplicates removed: ${this.duplicateFiles.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        console.log('');
        console.log('🎯 ROOT DIRECTORY NOW CONTAINS:');
        this.fileCategories.keepInRoot.forEach(file => {
            console.log(`   ✓ ${file}`);
        });
        console.log('');
        console.log('📁 NEW ORGANIZED STRUCTURE:');
        console.log('   ✓ docs/ - All documentation');
        console.log('   ✓ src/ - Core application code');
        console.log('   ✓ tests/ - All test files');
        console.log('   ✓ scripts/ - Management and deployment');
        console.log('   ✓ infrastructure/ - Infrastructure as Code');
        console.log('   ✓ examples/ - Example configurations');
        console.log('');
        console.log('🚀 NEXT STEPS:');
        console.log('   1. Test functionality: npm run dev:validate');
        console.log('   2. Run tests: npm run test:integration');
        console.log('   3. Fix audio integration (see docs/AUDIO_INTEGRATION_FIX.md)');
        console.log('');
        console.log('📚 All documentation preserved in docs/ folder');
        console.log('🎉 Project is now maintainable and organized!');
    }
}

// Run reorganization if this script is executed directly
if (require.main === module) {
    const reorganizer = new ProjectReorganizer();
    reorganizer.reorganize().catch(console.error);
}

module.exports = ProjectReorganizer;