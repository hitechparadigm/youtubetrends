# Deployment Guide

This guide walks you through deploying the YouTube Automation Platform to AWS.

## Prerequisites

### Required Software
- **Node.js 18+** and npm
- **AWS CLI** configured with appropriate permissions
- **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
- **Git** for version control

### AWS Requirements
- **AWS Account** with administrative access
- **AWS CLI configured** with credentials that have:
  - CloudFormation full access
  - IAM role creation permissions
  - DynamoDB, S3, Lambda, Step Functions permissions
  - VPC and networking permissions

### Verify Prerequisites
```bash
# Check Node.js version (should be 18+)
node --version

# Check AWS CLI configuration
aws sts get-caller-identity

# Check CDK CLI
cdk --version
```

## Step-by-Step Deployment

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/hitechparadigm/youtubetrends.git
cd youtubetrends

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. CDK Bootstrap (First Time Only)
```bash
# Bootstrap CDK in your AWS account/region
npx cdk bootstrap

# Verify bootstrap was successful
aws cloudformation describe-stacks --stack-name CDKToolkit
```

### 3. Review and Deploy
```bash
# Review what will be deployed
npm run cdk diff

# Deploy the infrastructure
npm run deploy

# Or deploy with approval prompts
npx cdk deploy --require-approval=broadening
```

### 4. Validate Deployment
```bash
# Run the simple infrastructure test
npm run test:simple
```

Expected output:
```
🎉 All tests passed! Infrastructure is working correctly.

📋 Summary:
   ✅ DynamoDB connection established
   ✅ TrendRepository CRUD operations working
   ✅ VideoRepository CRUD operations working
   ✅ Data integrity validated
   ✅ Query methods functioning
```

## Deployment Outputs

After successful deployment, you'll have:

### AWS Resources Created
- **DynamoDB Tables**: `TrendAnalytics`, `VideoMetadata`
- **S3 Bucket**: `youtube-automation-videos-{account}-{region}`
- **Lambda Functions**: Three serverless functions with 15-minute timeout limits
- **IAM Roles**: Lambda execution roles with appropriate permissions
- **Secrets Manager**: Secret placeholder for YouTube API credentials
- **CloudWatch**: Log groups and monitoring infrastructure

### Resource Naming Convention
All resources are prefixed with `youtube-automation-` for easy identification.

## Post-Deployment Configuration

### 1. YouTube API Credentials (Optional)
If you want to test YouTube integration:

```bash
# Create YouTube Data API v3 credentials in Google Cloud Console
# Then store them in Secrets Manager:
aws secretsmanager put-secret-value \
  --secret-id youtube-automation/credentials \
  --secret-string '{
    "client_id": "your-client-id",
    "client_secret": "your-client-secret", 
    "refresh_token": "your-refresh-token",
    "project_id": "your-project-id"
  }'
```

### 2. Verify Resource Access
```bash
# Check DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `youtube-automation`)]'

# Check S3 bucket
aws s3 ls | grep youtube-automation

# Check Secrets Manager
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `youtube-automation`)]'
```

## Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Required
**Error**: `This stack uses assets, so the toolkit stack must be deployed`
**Solution**: 
```bash
npx cdk bootstrap
```

#### 2. Insufficient Permissions
**Error**: `User is not authorized to perform: iam:CreateRole`
**Solution**: Ensure your AWS credentials have administrative permissions or the specific permissions listed in the prerequisites.

#### 3. Region Mismatch
**Error**: Resources created in wrong region
**Solution**: 
```bash
# Set default region
export AWS_DEFAULT_REGION=us-east-1
# Or specify in CDK command
npx cdk deploy --region us-east-1
```

#### 4. Resource Limits
**Error**: `LimitExceeded` for VPCs or other resources
**Solution**: Check AWS service limits in your account and request increases if needed.

#### 5. Lambda Timeout Validation Error
**Error**: `Value '2700' at 'timeout' failed to satisfy constraint: Member must have value less than or equal to 900`
**Solution**: AWS Lambda has a maximum timeout of 15 minutes (900 seconds). This has been fixed in the current version.

#### 6. VPC Network Interface Creation Error
**Error**: `The provided execution role does not have permissions to call CreateNetworkInterface on EC2`
**Solution**: Lambda functions now run without VPC configuration for simplified deployment and reduced costs.

### Validation Commands

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name YoutubeAutomationPlatformStack

# Verify DynamoDB tables
aws dynamodb describe-table --table-name TrendAnalytics
aws dynamodb describe-table --table-name VideoMetadata

# Check S3 bucket
aws s3api head-bucket --bucket youtube-automation-videos-$(aws sts get-caller-identity --query Account --output text)-$(aws configure get region)

# Test DynamoDB access
npm run test:simple
```

## Cost Estimation

### Initial Deployment Costs
- **DynamoDB**: $0 (on-demand, pay per request)
- **S3**: ~$0.02/month (minimal storage)
- **Lambda**: $0 (pay per execution, no idle costs)
- **CloudWatch**: ~$3/month (logs and metrics)
- **Secrets Manager**: ~$0.40/month (1 secret)

**Total**: ~$3-5/month for idle infrastructure

### Operational Costs (Estimated)
- **Lambda executions**: ~$1-5/month (depends on frequency)
- **DynamoDB requests**: ~$1-10/month (depends on data volume)
- **S3 storage**: ~$1-20/month (depends on video storage)
- **Bedrock Nova Reel**: ~$0.05-0.10 per video generated
- **MediaConvert**: ~$0.015 per minute of video processed

## Cleanup

To remove all resources:

```bash
# Destroy the CDK stack
npm run destroy

# Confirm deletion
npx cdk destroy --force

# Manually delete S3 bucket contents if needed
aws s3 rm s3://youtube-automation-videos-{account}-{region} --recursive
```

**Note**: Some resources like DynamoDB tables have deletion protection enabled. You may need to disable protection before deletion.

## Next Steps

After successful deployment:

1. **Run Tests**: `npm test` to validate all components
2. **Configure Topics**: Set up your content topics and preferences
3. **Implement Lambda Functions**: Begin Phase 1 of the implementation roadmap
4. **Set Up Monitoring**: Configure CloudWatch dashboards and alerts
5. **Production Readiness**: Follow security and performance best practices

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review AWS CloudFormation events in the AWS Console
3. Check CloudWatch logs for detailed error messages
4. Ensure all prerequisites are met
5. Verify AWS service limits and quotas