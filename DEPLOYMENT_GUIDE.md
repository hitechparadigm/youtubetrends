# 🚀 Deployment Guide

Complete guide for deploying the YouTube Automation Platform to production.

## 📋 Prerequisites

### Required Accounts & Services
- ✅ **AWS Account** with Bedrock access
- ✅ **Google Cloud Console** account
- ✅ **YouTube Channel** for publishing
- ✅ **Node.js 18+** and npm installed

### Required Permissions
- AWS Bedrock Nova Reel access (request if needed)
- YouTube Data API v3 enabled
- AWS Lambda, S3, DynamoDB, Step Functions permissions

## 🏗️ Infrastructure Setup

### 1. AWS Infrastructure

#### S3 Buckets
```bash
# Create video storage bucket
aws s3 mb s3://youtube-automation-videos-$(aws sts get-caller-identity --query Account --output text)-us-east-1

# Create audio storage bucket  
aws s3 mb s3://youtube-automation-audio-$(aws sts get-caller-identity --query Account --output text)-us-east-1

# Configure bucket policies (see infrastructure/s3-policies.json)
```

#### DynamoDB Tables
```bash
# Create trends table
aws dynamodb create-table \
  --table-name youtube-automation-trends \
  --attribute-definitions AttributeName=trendId,AttributeType=S \
  --key-schema AttributeName=trendId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create videos table
aws dynamodb create-table \
  --table-name youtube-automation-videos \
  --attribute-definitions AttributeName=videoId,AttributeType=S \
  --key-schema AttributeName=videoId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create analytics table
aws dynamodb create-table \
  --table-name youtube-automation-analytics \
  --attribute-definitions AttributeName=videoId,AttributeType=S \
  --key-schema AttributeName=videoId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

#### IAM Roles
```bash
# Create execution role for Lambda functions
aws iam create-role \
  --role-name youtube-automation-lambda-role \
  --assume-role-policy-document file://infrastructure/lambda-trust-policy.json

# Attach required policies
aws iam attach-role-policy \
  --role-name youtube-automation-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom policy for Bedrock, S3, DynamoDB access
aws iam create-policy \
  --policy-name youtube-automation-policy \
  --policy-document file://infrastructure/custom-policy.json

aws iam attach-role-policy \
  --role-name youtube-automation-lambda-role \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/youtube-automation-policy
```

### 2. YouTube API Setup

#### Google Cloud Console
1. Create new project or select existing
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials (Desktop Application)
4. Download credentials JSON

#### Get Refresh Token
```bash
# Run the setup script
node setup-youtube-api.js

# Follow the prompts to authorize and get refresh token
```

#### Store in AWS Secrets Manager
```bash
aws secretsmanager create-secret \
  --name "youtube-automation/credentials" \
  --description "YouTube API credentials for automation" \
  --secret-string '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET", 
    "refresh_token": "YOUR_REFRESH_TOKEN",
    "redirect_uri": "urn:ietf:wg:oauth:2.0:oob"
  }'
```

## 📦 Lambda Deployment

### 1. Build All Functions
```bash
# Install dependencies and build
npm run setup
npm run build
```

### 2. Deploy Lambda Functions

#### Video Generator
```bash
cd lambda/video-generator
zip -r video-generator.zip dist/ node_modules/ package.json

aws lambda create-function \
  --function-name youtube-automation-video-generator \
  --runtime nodejs18.x \
  --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/youtube-automation-lambda-role \
  --handler dist/index.handler \
  --zip-file fileb://video-generator.zip \
  --timeout 900 \
  --memory-size 1024 \
  --environment Variables='{
    "VIDEO_BUCKET":"youtube-automation-videos-$(aws sts get-caller-identity --query Account --output text)-us-east-1",
    "AWS_REGION":"us-east-1"
  }'
```

#### YouTube Uploader
```bash
cd lambda/youtube-uploader
zip -r youtube-uploader.zip dist/ node_modules/ package.json

aws lambda create-function \
  --function-name youtube-automation-youtube-uploader \
  --runtime nodejs18.x \
  --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/youtube-automation-lambda-role \
  --handler index.handler \
  --zip-file fileb://youtube-uploader.zip \
  --timeout 900 \
  --memory-size 512 \
  --environment Variables='{
    "VIDEO_BUCKET":"youtube-automation-videos-$(aws sts get-caller-identity --query Account --output text)-us-east-1",
    "YOUTUBE_CREDENTIALS_SECRET":"youtube-automation/credentials",
    "AWS_REGION":"us-east-1"
  }'
```

#### Content Analyzer
```bash
cd lambda/content-analyzer
zip -r content-analyzer.zip dist/ node_modules/ package.json

aws lambda create-function \
  --function-name youtube-automation-content-analyzer \
  --runtime nodejs18.x \
  --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/youtube-automation-lambda-role \
  --handler dist/index.handler \
  --zip-file fileb://content-analyzer.zip \
  --timeout 300 \
  --memory-size 512
```

### 3. Step Functions Workflow
```bash
# Create state machine
aws stepfunctions create-state-machine \
  --name youtube-automation-workflow \
  --definition file://stepfunctions/youtube-automation-workflow-enhanced.json \
  --role-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/youtube-automation-stepfunctions-role
```

## 🔧 Configuration

### Environment Variables
Set these in your Lambda functions:

```bash
# Core Configuration
AWS_REGION=us-east-1
VIDEO_BUCKET=youtube-automation-videos-{account}-us-east-1
AUDIO_BUCKET=youtube-automation-audio-{account}-us-east-1

# Database Tables
TRENDS_TABLE=youtube-automation-trends
VIDEOS_TABLE=youtube-automation-videos
ANALYTICS_TABLE=youtube-automation-analytics

# API Credentials
YOUTUBE_CREDENTIALS_SECRET=youtube-automation/credentials
GOOGLE_TRENDS_API_KEY=your-trends-api-key
```

### CloudWatch Monitoring
```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name youtube-automation-dashboard \
  --dashboard-body file://infrastructure/cloudwatch-dashboard.json
```

## ✅ Testing Deployment

### 1. Test Video Generation
```bash
# Test individual components
node generate-first-video.js
```

### 2. Test YouTube Upload
```bash
# Test upload functionality
node test-youtube-upload.js
```

### 3. Test Complete Pipeline
```bash
# End-to-end test
node complete-pipeline-test.js
```

### 4. Verify S3 Storage
```bash
# Check file structure
node check-s3-files.js
```

## 🔄 Automation Setup

### Daily Scheduling
```bash
# Create EventBridge rule for daily execution
aws events put-rule \
  --name youtube-automation-daily \
  --schedule-expression "cron(0 10 * * ? *)" \
  --description "Daily YouTube video generation"

# Add Step Functions as target
aws events put-targets \
  --rule youtube-automation-daily \
  --targets "Id"="1","Arn"="arn:aws:states:us-east-1:$(aws sts get-caller-identity --query Account --output text):stateMachine:youtube-automation-workflow"
```

### Monitoring Alerts
```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name youtube-automation-errors \
  --alarm-description "YouTube automation error rate" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1
```

## 🔒 Security Checklist

- [ ] IAM roles follow least-privilege principle
- [ ] S3 buckets have proper access policies
- [ ] Secrets stored in AWS Secrets Manager
- [ ] CloudTrail logging enabled
- [ ] VPC endpoints configured (optional)
- [ ] API keys rotated regularly

## 📊 Cost Optimization

### Expected Monthly Costs
```
Bedrock Nova Reel: $1.80 (30 videos × $0.06)
Amazon Polly: $0.60 (30 videos × $0.02)
Lambda Execution: $0.50
S3 Storage: $1.00
DynamoDB: $0.50
CloudWatch: $0.30
------------------------
Total Monthly: ~$4.70
```

### Cost Monitoring
```bash
# Set up billing alerts
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://infrastructure/cost-budget.json
```

## 🚨 Troubleshooting

### Common Issues

#### Bedrock Access Denied
```bash
# Request Bedrock model access
aws bedrock get-foundation-model --model-identifier amazon.nova-reel-v1:0
```

#### YouTube API Quota Exceeded
- Check Google Cloud Console quotas
- Request quota increase if needed
- Implement rate limiting

#### S3 Permission Errors
- Verify bucket policies
- Check IAM role permissions
- Ensure cross-region access if needed

### Monitoring Commands
```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/youtube-automation

# Monitor Step Functions
aws stepfunctions list-executions --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:youtube-automation-workflow

# Check S3 usage
aws s3 ls s3://youtube-automation-videos-ACCOUNT-us-east-1 --recursive --human-readable --summarize
```

## 🎯 Production Checklist

- [ ] All AWS resources deployed
- [ ] YouTube API credentials configured
- [ ] Lambda functions tested individually
- [ ] End-to-end pipeline tested
- [ ] Monitoring and alerts configured
- [ ] Cost budgets set up
- [ ] Security policies reviewed
- [ ] Backup and recovery plan documented
- [ ] Performance benchmarks established
- [ ] Documentation updated

## 🚀 Go Live!

Once all checks pass:

1. **Enable daily scheduling**
2. **Monitor first automated runs**
3. **Verify video quality and SEO**
4. **Track costs and performance**
5. **Scale based on results**

**Your YouTube automation platform is now live and ready to create amazing content automatically!** 🎉