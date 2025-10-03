#!/bin/bash

# YouTube Automation Platform Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
REGION="us-east-1"
PROFILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -p|--profile)
      PROFILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --environment    Environment to deploy to (default: production)"
      echo "  -r, --region         AWS region (default: us-east-1)"
      echo "  -p, --profile        AWS profile to use"
      echo "  -h, --help          Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}🚀 Deploying YouTube Automation Platform${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}"

# Set AWS profile if provided
if [ ! -z "$PROFILE" ]; then
  echo -e "Profile: ${YELLOW}$PROFILE${NC}"
  export AWS_PROFILE=$PROFILE
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo -e "${RED}❌ AWS CLI not configured or credentials invalid${NC}"
  exit 1
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "Account ID: ${YELLOW}$ACCOUNT_ID${NC}"

# Install dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm ci

# Build the project
echo -e "${GREEN}🔨 Building project...${NC}"
npm run build

# Run tests
echo -e "${GREEN}🧪 Running tests...${NC}"
npm test

# Synthesize CloudFormation template
echo -e "${GREEN}📋 Synthesizing CloudFormation template...${NC}"
npm run synth

# Deploy to AWS
echo -e "${GREEN}☁️  Deploying to AWS...${NC}"
export CDK_DEFAULT_ACCOUNT=$ACCOUNT_ID
export CDK_DEFAULT_REGION=$REGION

npx cdk deploy \
  --require-approval never \
  --context environment=$ENVIRONMENT \
  --context region=$REGION

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Display outputs
echo -e "${GREEN}📊 Stack Outputs:${NC}"
aws cloudformation describe-stacks \
  --stack-name YoutubeAutomationPlatformStack \
  --region $REGION \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table

echo -e "${GREEN}🎉 YouTube Automation Platform is ready!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Configure YouTube API credentials in Secrets Manager"
echo -e "2. Implement Lambda functions for the pipeline"
echo -e "3. Create Step Functions workflow"
echo -e "4. Set up EventBridge schedules"