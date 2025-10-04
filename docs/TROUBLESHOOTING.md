# Troubleshooting Guide

## Current Known Issues (October 4, 2025)

### 1. Nova Reel "Invalid Output Config/Credentials" Error

**Symptoms:**
- Nova Reel consistently fails with "Invalid Output Config/Credentials"
- Error occurs even with previously working configurations
- Both `amazon.nova-reel-v1:0` and `amazon.nova-reel-v1:1` affected

**Root Cause:**
- AWS service issue (confirmed by testing previous working GitHub versions)
- Not caused by our code changes

**Workaround:**
- Use Luma AI Ray v2 as alternative (working)
- Enable mock mode for development: `MOCK_VIDEO_GENERATION=true`

**Resolution:**
- Monitor AWS service health dashboard
- Wait for AWS to resolve service issue
- Contact AWS Support if issue persists beyond 24 hours

### 2. Luma AI Ray v2 Lambda Integration

**Symptoms:**
- Luma Ray works in direct API calls
- Fails when called from Lambda function
- Error: "Invalid Output Config/Credentials" or similar

**Potential Causes:**
1. IAM permissions not fully propagated (wait 10+ minutes)
2. BedrockRuntimeClient region configuration issue
3. Import statement problems in Lambda environment

**Debugging Steps:**
```bash
# Test direct API access (should work)
node scripts/development/test-luma-ray-v2.js

# Test Lambda integration (currently failing)
node scripts/development/test-video-generator-direct.js

# Check IAM permissions
aws iam get-role-policy --role-name YoutubeAutomationLambdaRole --policy-name YoutubeAutomationPolicy
```

**Resolution in Progress:**
- Added IAM permissions for Luma AI and us-west-2 region
- Waiting for IAM propagation
- Need to debug Lambda function imports and region configuration

### 3. YouTube Upload "The specified key does not exist"

**Symptoms:**
- Video generation succeeds (mock mode)
- YouTube upload fails with S3 key not found

**Root Cause:**
- Mock mode doesn't create actual files in S3
- YouTube uploader expects real S3 objects

**Workaround:**
- Use real video generation (when Luma Ray Lambda integration is fixed)
- Or modify YouTube uploader to handle mock mode

**Resolution:**
- Fix Luma Ray Lambda integration first
- Then test with real video files

### 4. Audio Integration Shows "Has Audio: NO"

**Symptoms:**
- Audio generation succeeds
- Video generation succeeds
- Final result shows "Has Audio: NO"

**Root Cause:**
- Mock mode audio integration simulation incomplete
- Real audio merging may work correctly

**Resolution:**
- Test with real video generation
- Debug mock mode audio simulation if needed

## General Debugging Commands

### Check Lambda Function Status
```bash
aws lambda get-function --function-name youtube-automation-video-generator --region us-east-1
```

### Check S3 Buckets
```bash
# Original bucket
aws s3 ls s3://youtube-automation-videos-786673323159-us-east-1/ --region us-east-1

# Luma bucket
aws s3 ls s3://youtube-automation-luma-786673323159/ --region us-west-2
```

### Check CloudWatch Logs
```bash
aws logs describe-log-streams --log-group-name "/aws/lambda/youtube-automation-video-generator" --order-by LastEventTime --descending --max-items 1 --region us-east-1
```

### Test Individual Components
```bash
# Test Bedrock access
node scripts/development/test-bedrock-basic-access.js

# Test Nova Reel (currently failing)
node scripts/development/test-nova-reel-minimal-working.js

# Test Luma Ray (should work)
node scripts/development/test-luma-ray-v2.js

# Test video generator Lambda
node scripts/development/test-video-generator-direct.js

# Test end-to-end (currently failing at YouTube upload)
node scripts/development/test-end-to-end-youtube-upload.js
```

## Environment Variables

### Required Lambda Environment Variables
```bash
MOCK_VIDEO_GENERATION=false  # Set to true for testing
AWS_NODEJS_CONNECTION_REUSE_ENABLED=1
VIDEO_BUCKET=youtube-automation-videos-786673323159-us-east-1
```

### Update Environment Variables
```bash
aws lambda update-function-configuration \
  --function-name youtube-automation-video-generator \
  --environment Variables='{MOCK_VIDEO_GENERATION=false,AWS_NODEJS_CONNECTION_REUSE_ENABLED=1,VIDEO_BUCKET=youtube-automation-videos-786673323159-us-east-1}' \
  --region us-east-1
```

## IAM Permissions Checklist

### Required Permissions
- ✅ Bedrock Nova Reel access (us-east-1)
- ✅ Bedrock Luma Ray access (us-west-2)
- ✅ S3 access to both buckets
- ✅ Polly access for audio generation
- ✅ Secrets Manager access for YouTube credentials
- ✅ CloudWatch Logs access

### Verify Permissions
```bash
aws iam get-role-policy --role-name YoutubeAutomationLambdaRole --policy-name YoutubeAutomationPolicy --region us-east-1
```

## Recovery Procedures

### If Everything Fails
1. **Enable Mock Mode**: Set `MOCK_VIDEO_GENERATION=true`
2. **Use Previous Working Version**: `git checkout 68304e0`
3. **Contact AWS Support**: For Nova Reel service issues
4. **Check AWS Service Health**: https://status.aws.amazon.com/

### Emergency Rollback
```bash
# Revert to previous working commit
git checkout 68304e0

# Deploy previous working version
powershell Compress-Archive -Path lambda/video-generator/index.js -DestinationPath lambda/video-generator/deployment-rollback.zip -Force
aws lambda update-function-code --function-name youtube-automation-video-generator --zip-file fileb://lambda/video-generator/deployment-rollback.zip --region us-east-1
```

## Contact Information

- **AWS Support**: For Nova Reel service issues
- **GitHub Issues**: For code-related problems
- **Documentation**: See `docs/` directory for detailed guides

---
*Last Updated: October 4, 2025*
*Next Review: When Luma Ray Lambda integration is resolved*