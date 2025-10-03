# 🚀 Quick Deployment Guide - YouTube Automation Platform

## 📋 **Prerequisites**
- AWS Account with appropriate permissions
- YouTube Data API v3 credentials
- Node.js 18+ and AWS CDK CLI installed
- Git repository access

---

## ⚡ **5-Minute Deployment**

### **Step 1: Clone and Setup (1 minute)**
```bash
git clone https://github.com/hitechparadigm/youtubetrends.git
cd youtubetrends
npm install
```

### **Step 2: Configure AWS (1 minute)**
```bash
# Configure AWS credentials
aws configure

# Install CDK if not already installed
npm install -g aws-cdk
```

### **Step 3: Deploy Infrastructure (2 minutes)**
```bash
# Build the project
npm run build

# Deploy AWS infrastructure
cdk deploy --all
```

### **Step 4: Configure YouTube API (1 minute)**
```bash
# Store YouTube credentials in AWS Secrets Manager
aws secretsmanager create-secret \
  --name youtube-automation/credentials \
  --description "YouTube API credentials for automation platform"

aws secretsmanager put-secret-value \
  --secret-id youtube-automation/credentials \
  --secret-string '{
    "api_key": "YOUR_YOUTUBE_API_KEY",
    "client_id": "YOUR_OAUTH_CLIENT_ID",
    "client_secret": "YOUR_OAUTH_CLIENT_SECRET",
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 🎬 **Create First Test Video**

### **Option 1: Manual Execution**
```bash
# Start Step Functions workflow
aws stepfunctions start-execution \
  --state-machine-arn $(aws stepfunctions list-state-machines \
    --query 'stateMachines[?name==`YouTubeAutomationWorkflow`].stateMachineArn' \
    --output text) \
  --input '{
    "topics": ["technology"],
    "region": "US",
    "maxResults": 5,
    "hoursBack": 24
  }'
```

### **Option 2: Test Script**
```bash
# Run end-to-end test with real AWS services
npx ts-node test-production-pipeline.ts
```

### **Option 3: AWS Console**
1. Go to AWS Step Functions console
2. Find "YouTubeAutomationWorkflow" state machine
3. Click "Start execution"
4. Use this input:
```json
{
  "topics": ["technology"],
  "region": "US", 
  "maxResults": 5,
  "hoursBack": 24
}
```

---

## 📊 **Monitor Execution**

### **Check Status**
```bash
# Get execution ARN from previous command output
EXECUTION_ARN="arn:aws:states:region:account:execution:YouTubeAutomationWorkflow:execution-name"

# Monitor progress
aws stepfunctions describe-execution --execution-arn $EXECUTION_ARN

# Get detailed history
aws stepfunctions get-execution-history --execution-arn $EXECUTION_ARN
```

### **CloudWatch Logs**
- Navigate to CloudWatch Logs in AWS Console
- Look for log groups:
  - `/aws/lambda/trend-detector`
  - `/aws/lambda/content-analyzer`
  - `/aws/lambda/video-generator`
  - `/aws/lambda/video-processor`
  - `/aws/lambda/youtube-uploader`

---

## 🎯 **Expected Results**

### **Timeline (Production)**
1. **Trend Detection**: 2-3 seconds
2. **Content Analysis**: 1-2 seconds
3. **Video Generation**: 15-30 minutes (Bedrock processing)
4. **Video Processing**: 5-10 minutes (MediaConvert)
5. **YouTube Upload**: 2-5 minutes
6. **Total**: 22-47 minutes

### **Output**
- **YouTube Video**: Automatically uploaded and published
- **Video Quality**: 1920x1080, professional audio narration
- **SEO Optimization**: Algorithm-friendly title, description, tags
- **Cost**: ~$8.25 per video

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. YouTube API Quota Exceeded**
```bash
# Check quota usage
aws logs filter-log-events \
  --log-group-name /aws/lambda/trend-detector \
  --filter-pattern "quota"
```
**Solution**: Wait for quota reset or request increase

#### **2. Bedrock Access Denied**
```bash
# Check IAM permissions
aws iam get-role-policy \
  --role-name YouTubeAutomationRole \
  --policy-name BedrockAccess
```
**Solution**: Ensure Bedrock permissions in IAM role

#### **3. MediaConvert Job Failed**
```bash
# Check MediaConvert jobs
aws mediaconvert list-jobs --status COMPLETE
```
**Solution**: Verify IAM role has MediaConvert permissions

### **Debug Commands**
```bash
# Test individual components
npx ts-node test-trend-detector-direct.ts
npx ts-node test-content-analyzer.ts
npx ts-node test-video-generator.ts

# Check AWS resources
aws dynamodb list-tables
aws s3 ls
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `youtube`)]'
```

---

## 📈 **Scaling & Optimization**

### **Increase Throughput**
```bash
# Modify Step Functions for parallel processing
# Edit stepfunctions/youtube-automation-workflow.json
# Increase MaxConcurrency values
```

### **Cost Optimization**
```bash
# Set up budget alerts
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "YouTubeAutomation",
    "BudgetLimit": {"Amount": "100", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

### **Performance Monitoring**
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name YouTubeAutomationMetrics \
  --dashboard-body file://cloudwatch-dashboard.json
```

---

## 🎉 **Success Validation**

### **Check Video Upload**
1. Go to your YouTube channel
2. Look for newly uploaded video
3. Verify title, description, and tags are optimized
4. Check video quality (should be 1080p)

### **Verify Metrics**
```bash
# Check DynamoDB for stored data
aws dynamodb scan --table-name TrendAnalytics --max-items 5

# Check S3 for generated videos
aws s3 ls s3://youtube-automation-videos/ --recursive
```

### **Performance Validation**
- **Execution Time**: Should be 22-47 minutes
- **Cost**: Should be ~$8.25 per video
- **Quality**: 1080p video with professional audio
- **SEO Score**: Should be 80+ out of 100

---

## 🚀 **Production Deployment Complete!**

**✅ Infrastructure deployed**
**✅ YouTube API configured**
**✅ First video creation ready**
**✅ Monitoring and alerting active**

**🎬 Ready to create automated YouTube content!**