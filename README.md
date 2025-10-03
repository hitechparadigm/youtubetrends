# YouTube Automation Platform

An AWS-based serverless solution for automated YouTube content creation, trend detection, and video uploading using AI-powered video generation.

## Architecture Overview

This platform uses AWS CDK to deploy a serverless architecture including:

- **AWS Step Functions** - Orchestrates the entire pipeline
- **AWS Lambda** - Serverless compute for business logic
- **Amazon DynamoDB** - Stores trend data, video metadata, and configuration settings
- **Amazon S3** - Video and audio storage with lifecycle policies
- **Amazon Bedrock Nova Reel** - AI-powered video generation with custom prompts
- **Amazon Polly** - High-quality text-to-speech for audio narration
- **AWS Elemental MediaConvert** - Video processing, audio mixing, and optimization
- **Amazon EventBridge** - Scheduling and event-driven triggers
- **AWS Secrets Manager** - Secure credential storage
- **AWS Systems Manager Parameter Store** - Configuration management

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- GitHub repository with Actions enabled

## Local Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/hitechparadigm/youtubetrends.git
   cd youtubetrends
   npm install
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure
   # or use AWS SSO, environment variables, or IAM roles
   ```

3. **Bootstrap CDK (first time only):**
   ```bash
   npx cdk bootstrap
   ```

4. **Build and test:**
   ```bash
   npm run build
   npm test
   ```

5. **Deploy to AWS:**
   ```bash
   npm run deploy
   ```

## GitHub Actions Setup

### Required Secrets

Configure these secrets in your GitHub repository settings:

- `AWS_ACCESS_KEY_ID` - AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for deployment  
- `AWS_ACCOUNT_ID` - Your AWS account ID

### Environments

Set up GitHub environments for:
- `staging` - For pull request deployments
- `production` - For main branch deployments

### Workflow Features

- **Automated Testing** - Runs TypeScript compilation, unit tests, and CDK synth
- **Staging Deployments** - Deploys to staging environment on pull requests
- **Production Deployments** - Deploys to production on main branch merges
- **Cleanup** - Automatically destroys staging environments when PRs are closed

## Project Structure

```
├── bin/                          # CDK app entry point
├── lib/                          # CDK stack definitions
├── test/                         # Unit tests
├── .github/workflows/            # GitHub Actions workflows
├── lambda/                       # Lambda function code (to be added)
├── step-functions/               # Step Functions definitions (to be added)
└── docs/                         # Documentation (to be added)
```

## Infrastructure Components

### Core Resources

- **S3 Bucket**: `youtube-automation-videos-{account}-{region}`
- **DynamoDB Tables**: 
  - `TrendAnalytics` - Stores trending topic data
  - `VideoMetadata` - Stores video information and performance metrics
- **Secrets Manager**: `youtube-automation/credentials` - YouTube API credentials
- **VPC**: Dedicated VPC with NAT Gateway for Lambda internet access

### IAM Roles

- **Lambda Execution Role**: Permissions for DynamoDB, S3, Secrets Manager, Bedrock, MediaConvert
- **Step Functions Role**: Permissions to invoke Lambda functions and publish SNS notifications

### Monitoring

- **CloudWatch Dashboard**: `YouTube-Automation-Platform`
- **SNS Topic**: `youtube-automation-notifications`
- **CloudWatch Logs**: Automatic log groups for all Lambda functions

## Cost Optimization Features

- **On-demand DynamoDB billing** - Pay only for what you use
- **S3 lifecycle policies** - Automatic transition to cheaper storage classes
- **Serverless architecture** - No idle compute costs
- **VPC with single NAT Gateway** - Minimize networking costs

## Security Features

- **VPC isolation** - Lambda functions run in private subnets
- **Encryption at rest** - S3 and DynamoDB use AWS managed encryption
- **Secrets Manager** - Secure credential storage with automatic rotation support
- **IAM least privilege** - Minimal required permissions for each component

## Key Features

### 🎯 **Configurable Content Topics**
- Support for multiple niches: education, investing, tourism, technology, health, finance
- Custom topic creation and management
- Topic-specific trend analysis and content generation

### 🎬 **Advanced Video Generation**
- Configurable video length (5-10 minutes default, 1-20 minutes range)
- Custom prompts and templates for different content types
- High-quality audio narration with topic-specific vocabulary
- Professional video-audio synchronization

### 🗣️ **Intelligent Audio Narration**
- Amazon Polly integration for natural-sounding speech
- Topic-specific content (e.g., discussing ETFs, stocks for investing videos)
- Configurable voice characteristics and pacing
- Multi-language support

### ⚙️ **Easy Configuration Management**
- Intuitive configuration interface for non-technical users
- Real-time cost impact estimation
- Validation and default value management
- API-driven configuration updates

## Next Steps

After deploying the infrastructure:

1. **Configure YouTube API credentials** in Secrets Manager
2. **Set up your content topics and preferences** via configuration interface
3. **Customize video generation prompts** for your niches
4. **Configure audio and video parameters** (length, quality, voice settings)
5. **Implement Lambda functions** for each pipeline stage
6. **Create Step Functions workflow** definition
7. **Set up EventBridge schedules** for automated execution
8. **Configure monitoring and alerting**

## Development Workflow

1. Create feature branch from `main`
2. Make changes and commit
3. Push branch - triggers staging deployment via GitHub Actions
4. Create pull request - runs tests and deploys to staging
5. Merge to `main` - deploys to production
6. PR closure automatically cleans up staging environment

## Testing

Run the test suite:
```bash
npm test                    # Run all tests
npm test -- --coverage     # Run with coverage report
npm test -- --watch        # Run in watch mode
```

## Useful Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run test` - Perform the jest unit tests
- `npm run cdk deploy` - Deploy this stack to your default AWS account/region
- `npm run cdk diff` - Compare deployed stack with current state
- `npm run cdk synth` - Emits the synthesized CloudFormation template

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**: Run `npx cdk bootstrap` if you get bootstrap errors
2. **AWS Permissions**: Ensure your AWS credentials have sufficient permissions
3. **Region Mismatch**: Verify AWS_REGION matches your CDK_DEFAULT_REGION
4. **Node Version**: Use Node.js 18+ for compatibility

### Logs and Monitoring

- Check CloudWatch Logs for Lambda function execution details
- Use CloudWatch Dashboard for system-wide monitoring
- SNS notifications will alert on critical failures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.