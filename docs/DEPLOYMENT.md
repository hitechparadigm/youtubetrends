# YouTube Automation Platform - Deployment Guide

## 🚀 **Deployment Overview**

This guide provides comprehensive instructions for deploying the YouTube Automation Platform to AWS. The platform uses serverless architecture with Infrastructure as Code (IaC) for reliable, scalable deployments.

## 📋 **Prerequisites**

### **Required Tools**
- **AWS CLI** v2.0+ configured with appropriate permissions
- **Node.js** 18.x or later
- **npm** or **yarn** package manager
- **Git** for version control
- **AWS CDK** v2.0+ (optional, for advanced deployments)

### **AWS Account Requirements**
- **AWS Account** with administrative access
- **AWS Bedrock** access enabled (Nova Reel, Claude, Titan Image)
- **YouTube API** credentials and OAuth setup
- **Estimated Monthly Cost**: $5-10 for development, $50-100 for production

### **Required AWS Services**
- AWS Lambda
- Amazon S3
- Amazon DynamoDB
- AWS Bedrock (Nova Reel, Claude, Titan Image)
- Amazon Polly
- Amazon EventBridge
- AWS CloudFormation
- Amazon CloudWatch
- AWS Secrets Manager

## 🔧 **Pre-Deployment Setup**

### **1. Clone Repository**
```bash
git clone https://github.com/yourusername/youtube-automation-platform.git
cd youtube-automation-platform
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Configure AWS CLI**
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region, and Output format
```

### **4. Verify AWS Permissions**
```bash
# Test AWS access
aws sts get-caller-identity

# Verify Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

### **5. Set Up YouTube API Credentials**

#### **Create YouTube API Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Download credentials JSON file

#### **Configure OAuth Flow**
```bash
# Run OAuth setup script
node scripts/setup-youtube-oauth.js

# Follow prompts to complete OAuth flow
# This will generate refresh token for automated uploads
```

### **6. Configure Environment Variables**
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

**Environment Configuration:**
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# YouTube API Configuration
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token

# Bedrock Configuration
BEDROCK_VIDEO_MODEL=amazon.nova-reel-v1:0
BEDROCK_TEXT_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_IMAGE_MODEL=amazon.titan-image-generator-v1

# Storage Configuration
VIDEO_BUCKET_PREFIX=youtube-automation-videos
AUDIO_BUCKET_PREFIX=youtube-automation-audio
THUMBNAIL_BUCKET_PREFIX=youtube-automation-thumbnails

# Deployment Configuration
DEPLOYMENT_STAGE=dev
STACK_NAME_PREFIX=youtube-automation
```

## 🏗️ **Infrastructure Deployment**

### **Option 1: Quick Deployment (Recommended)**

#### **Deploy All Infrastructure**
```bash
# Deploy complete infrastructure stack
npm run deploy:all

# This will deploy:
# - Core infrastructure (S3, DynamoDB, IAM roles)
# - Lambda functions
# - EventBridge scheduler
# - CloudWatch monitoring
```

#### **Verify Deployment**
```bash
# Verify all stacks deployed successfully
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Test core functionality
npm run test:deployment
```

### **Option 2: Step-by-Step Deployment**

#### **Step 1: Deploy Core Infrastructure**
```bash
# Deploy S3 buckets and DynamoDB tables
aws cloudformation deploy \
  --template-file infrastructure/core-infrastructure.yaml \
  --stack-name youtube-automation-core \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment=dev \
    ProjectName=youtube-automation
```

#### **Step 2: Deploy Data Storage Infrastructure**
```bash
# Deploy multi-tier storage system
aws cloudformation deploy \
  --template-file infrastructure/data-storage-infrastructure.json \
  --stack-name youtube-automation-storage \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment=dev \
    HotDataRetentionDays=7 \
    WarmDataRetentionDays=30 \
    ColdDataRetentionDays=365
```

#### **Step 3: Deploy Lambda Functions**
```bash
# Package and deploy all Lambda functions
npm run package:lambdas
npm run deploy:lambdas

# Individual Lambda deployment (if needed)
npm run deploy:lambda -- --function video-generator
npm run deploy:lambda -- --function enhanced-content-generator
npm run deploy:lambda -- --function youtube-uploader
```

#### **Step 4: Deploy EventBridge Scheduler**
```bash
# Deploy automation scheduler
aws cloudformation deploy \
  --template-file infrastructure/eventbridge-scheduler-fixed.json \
  --stack-name youtube-automation-scheduler \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ScheduleFrequency="rate(12 hours)" \
    MaxVideosPerDay=2 \
    Environment=dev
```

#### **Step 5: Deploy Monitoring and Alerts**
```bash
# Deploy CloudWatch dashboards and alarms
aws cloudformation deploy \
  --template-file infrastructure/monitoring.yaml \
  --stack-name youtube-automation-monitoring \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    NotificationEmail=your-email@example.com \
    CostThreshold=10
```

## 🔐 **Security Configuration**

### **1. Store Secrets in AWS Secrets Manager**
```bash
# Store YouTube API credentials
aws secretsmanager create-secret \
  --name "youtube-automation/youtube-api" \
  --description "YouTube API credentials" \
  --secret-string '{
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "refresh_token": "your_refresh_token"
  }'

# Store additional API keys
aws secretsmanager create-secret \
  --name "youtube-automation/external-apis" \
  --description "External API keys" \
  --secret-string '{
    "google_trends_api_key": "your_key",
    "news_api_key": "your_key"
  }'
```

### **2. Configure IAM Roles and Policies**
```bash
# Deploy IAM configuration
aws cloudformation deploy \
  --template-file infrastructure/iam-roles.yaml \
  --stack-name youtube-automation-iam \
  --capabilities CAPABILITY_NAMED_IAM
```

### **3. Enable CloudTrail Logging**
```bash
# Enable audit logging
aws cloudformation deploy \
  --template-file infrastructure/cloudtrail.yaml \
  --stack-name youtube-automation-audit \
  --capabilities CAPABILITY_IAM
```

## 🧪 **Post-Deployment Testing**

### **1. Test Core Functionality**
```bash
# Test video generation pipeline
node test-video-generator-direct.js

# Test enhanced content generation
node test-enhanced-content.js

# Test complete pipeline
node create-video-with-audio-from-scratch.js
```

### **2. Test YouTube Integration**
```bash
# Test YouTube API connection
node test-youtube-connection.js

# Test video upload
node test-youtube-upload.js

# Verify quota usage
node check-youtube-quotas.js
```

### **3. Test Analytics and Storage**
```bash
# Test analytics engine
node test-data-storage-analytics.js

# Test storage lifecycle
node test-storage-lifecycle.js

# Generate test reports
node generate-test-reports.js
```

### **4. Test Automation**
```bash
# Test scheduler deployment
node verify-scheduler.js

# Test event-driven processing
node test-event-processing.js

# Test error handling
node test-error-scenarios.js
```

## 📊 **Monitoring Setup**

### **1. CloudWatch Dashboards**
```bash
# Import pre-built dashboards
aws cloudwatch put-dashboard \
  --dashboard-name "YouTube-Automation-Overview" \
  --dashboard-body file://monitoring/dashboards/overview.json

aws cloudwatch put-dashboard \
  --dashboard-name "YouTube-Automation-Costs" \
  --dashboard-body file://monitoring/dashboards/costs.json
```

### **2. Set Up Alarms**
```bash
# Deploy cost monitoring alarms
aws cloudformation deploy \
  --template-file monitoring/cost-alarms.yaml \
  --stack-name youtube-automation-cost-alarms \
  --parameter-overrides \
    DailyCostThreshold=1.00 \
    MonthlyCostThreshold=30.00 \
    NotificationEmail=your-email@example.com
```

### **3. Configure Log Aggregation**
```bash
# Set up log groups and retention
aws logs create-log-group --log-group-name /aws/lambda/youtube-automation
aws logs put-retention-policy --log-group-name /aws/lambda/youtube-automation --retention-in-days 30
```

## 🔄 **Automation Configuration**

### **1. Enable Daily Automation**
```bash
# Start the scheduler
node manage-scheduler.js --action start

# Verify scheduler status
node verify-scheduler.js

# Configure schedule parameters
node configure-scheduler.js --frequency "rate(12 hours)" --max-videos 2
```

### **2. Set Up Batch Processing**
```bash
# Configure batch job processing
aws batch create-job-queue \
  --job-queue-name youtube-automation-batch \
  --state ENABLED \
  --priority 1 \
  --compute-environment-order order=1,computeEnvironment=youtube-automation-compute
```

## 🌍 **Multi-Region Deployment**

### **1. Deploy to Additional Regions**
```bash
# Deploy to eu-west-1
export AWS_REGION=eu-west-1
npm run deploy:all -- --region eu-west-1

# Deploy to ap-southeast-1
export AWS_REGION=ap-southeast-1
npm run deploy:all -- --region ap-southeast-1
```

### **2. Configure Cross-Region Replication**
```bash
# Set up S3 cross-region replication
aws cloudformation deploy \
  --template-file infrastructure/cross-region-replication.yaml \
  --stack-name youtube-automation-replication \
  --capabilities CAPABILITY_IAM
```

## 🔧 **Environment-Specific Deployments**

### **Development Environment**
```bash
# Deploy development environment
export DEPLOYMENT_STAGE=dev
npm run deploy:dev

# Configure development settings
node configure-environment.js --env dev --cost-limit 5 --video-limit 1
```

### **Staging Environment**
```bash
# Deploy staging environment
export DEPLOYMENT_STAGE=staging
npm run deploy:staging

# Run staging tests
npm run test:staging
```

### **Production Environment**
```bash
# Deploy production environment
export DEPLOYMENT_STAGE=prod
npm run deploy:prod

# Enable production monitoring
npm run enable:prod-monitoring

# Configure production scaling
node configure-production.js --max-concurrent 10 --cost-limit 100
```

## 📈 **Scaling Configuration**

### **1. Configure Lambda Scaling**
```bash
# Set Lambda concurrency limits
aws lambda put-provisioned-concurrency-config \
  --function-name youtube-automation-video-generator \
  --qualifier $LATEST \
  --provisioned-concurrency-config ProvisionedConcurrencyUnits=5

# Configure auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace lambda \
  --resource-id function:youtube-automation-video-generator:provisioned \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 1 \
  --max-capacity 10
```

### **2. Configure DynamoDB Scaling**
```bash
# Enable DynamoDB auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/youtube-automation-trends-hot \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100
```

## 🛠️ **Troubleshooting Deployment Issues**

### **Common Issues and Solutions**

#### **1. Bedrock Access Issues**
```bash
# Check Bedrock model access
aws bedrock list-foundation-models --region us-east-1

# Request model access if needed
# Go to AWS Console > Bedrock > Model access
```

#### **2. YouTube API Quota Issues**
```bash
# Check current quota usage
node check-youtube-quotas.js

# Request quota increase if needed
# Go to Google Cloud Console > APIs & Services > Quotas
```

#### **3. Lambda Timeout Issues**
```bash
# Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name youtube-automation-video-generator \
  --timeout 900

# Increase memory allocation
aws lambda update-function-configuration \
  --function-name youtube-automation-video-generator \
  --memory-size 2048
```

#### **4. S3 Permission Issues**
```bash
# Check S3 bucket policies
aws s3api get-bucket-policy --bucket youtube-automation-videos-{account-id}-{region}

# Update bucket policy if needed
aws s3api put-bucket-policy \
  --bucket youtube-automation-videos-{account-id}-{region} \
  --policy file://policies/s3-bucket-policy.json
```

## 🔄 **Deployment Rollback**

### **Rollback Procedures**
```bash
# Rollback CloudFormation stack
aws cloudformation cancel-update-stack --stack-name youtube-automation-core

# Rollback to previous Lambda version
aws lambda update-function-code \
  --function-name youtube-automation-video-generator \
  --s3-bucket deployment-artifacts \
  --s3-key lambda-functions/video-generator-v1.0.0.zip

# Disable scheduler during rollback
node manage-scheduler.js --action stop
```

## 📊 **Cost Optimization**

### **1. Enable Cost Monitoring**
```bash
# Set up cost budgets
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budgets/monthly-budget.json

# Enable cost anomaly detection
aws ce create-anomaly-detector \
  --anomaly-detector file://cost-monitoring/anomaly-detector.json
```

### **2. Configure Resource Cleanup**
```bash
# Set up automated cleanup
aws events put-rule \
  --name youtube-automation-cleanup \
  --schedule-expression "rate(1 day)" \
  --state ENABLED

# Configure S3 lifecycle policies
aws s3api put-bucket-lifecycle-configuration \
  --bucket youtube-automation-videos-{account-id}-{region} \
  --lifecycle-configuration file://s3-lifecycle-policy.json
```

## ✅ **Deployment Checklist**

### **Pre-Deployment**
- [ ] AWS CLI configured and tested
- [ ] YouTube API credentials obtained and tested
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Bedrock model access verified

### **Deployment**
- [ ] Core infrastructure deployed
- [ ] Lambda functions deployed and tested
- [ ] EventBridge scheduler configured
- [ ] Monitoring and alerts set up
- [ ] Security configurations applied

### **Post-Deployment**
- [ ] End-to-end pipeline tested
- [ ] YouTube integration verified
- [ ] Analytics and reporting working
- [ ] Cost monitoring enabled
- [ ] Documentation updated

### **Production Readiness**
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Backup and recovery tested
- [ ] Monitoring dashboards configured
- [ ] Runbooks and procedures documented

## 🎯 **Success Metrics**

After successful deployment, you should achieve:

- **Video Generation**: 100% success rate
- **Cost per Video**: $0.08 or less
- **Generation Time**: Under 5 minutes
- **Upload Success**: 95%+ success rate
- **System Availability**: 99.9%+
- **Cost Efficiency**: 99%+ savings vs traditional production

## 📞 **Support and Maintenance**

### **Regular Maintenance Tasks**
```bash
# Weekly health check
npm run health-check

# Monthly cost analysis
npm run cost-analysis

# Quarterly security audit
npm run security-audit

# Update dependencies
npm update && npm audit fix
```

### **Monitoring and Alerts**
- Monitor CloudWatch dashboards daily
- Review cost reports weekly
- Update security patches monthly
- Performance optimization quarterly

This deployment guide ensures a successful, secure, and scalable deployment of the YouTube Automation Platform.