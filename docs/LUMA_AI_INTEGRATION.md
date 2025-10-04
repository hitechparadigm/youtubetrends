# Luma AI Ray v2 Integration Guide

## Overview

Luma AI Ray v2 has been integrated as the primary video generation model, providing a reliable alternative to Nova Reel when AWS service issues occur.

## Model Details

- **Model ID**: `luma.ray-v2:0`
- **Provider**: Luma AI
- **Region**: us-west-2
- **Status**: Active and working
- **Capabilities**: Text-to-video generation

## Configuration

### S3 Bucket Setup
```bash
# Create dedicated bucket for Luma Ray (us-west-2)
aws s3 mb s3://youtube-automation-luma-786673323159 --region us-west-2

# Apply bucket policy for Bedrock access
aws s3api put-bucket-policy --bucket youtube-automation-luma-786673323159 --policy file://scripts/setup/luma-s3-bucket-policy.json --region us-west-2
```

### IAM Permissions
```json
{
    "Action": [
        "bedrock:GetAsyncInvoke",
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:StartAsyncInvoke"
    ],
    "Resource": [
        "arn:aws:bedrock:us-west-2::foundation-model/luma.ray-v2:0",
        "arn:aws:bedrock:*:*:async-invoke/*"
    ],
    "Effect": "Allow"
}
```

### S3 Permissions
```json
{
    "Action": [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:PutObject"
    ],
    "Resource": [
        "arn:aws:s3:::youtube-automation-luma-786673323159",
        "arn:aws:s3:::youtube-automation-luma-786673323159/*"
    ],
    "Effect": "Allow"
}
```

## API Usage

### Direct API Call (Working)
```javascript
const { BedrockRuntimeClient, StartAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ 
    region: 'us-west-2'
});

const command = new StartAsyncInvokeCommand({
    modelId: 'luma.ray-v2:0',
    modelInput: {
        prompt: 'Create a professional video about ETF investing benefits'
    },
    outputDataConfig: {
        s3OutputDataConfig: {
            s3Uri: 's3://youtube-automation-luma-786673323159/video.mp4'
        }
    }
});

const response = await client.send(command);
console.log('Job ID:', response.invocationArn);
```

### Lambda Integration (In Progress)
```javascript
// Try Luma AI Ray v2 first
try {
    console.log('Attempting video generation with Luma AI Ray v2...');
    
    const lumaClient = new BedrockRuntimeClient({ region: 'us-west-2' });
    
    const startResponse = await lumaClient.send(new StartAsyncInvokeCommand({
        modelId: 'luma.ray-v2:0',
        modelInput: {
            prompt: enhancedPrompt
        },
        outputDataConfig: {
            s3OutputDataConfig: {
                s3Uri: `s3://youtube-automation-luma-786673323159/${s3OutputKey}`
            }
        }
    }));
    
    console.log('✅ Luma AI Ray v2 job started successfully');
    
} catch (lumaError) {
    console.log('❌ Luma AI Ray v2 failed, trying Nova Reel fallback...');
    // Fallback to Nova Reel
}
```

## Testing

### Test Direct API Access
```bash
node scripts/development/test-luma-ray-v2.js
```

**Expected Output:**
```
🧪 LUMA AI RAY V2 TEST
=====================
Testing Luma AI Ray v2 for video generation...
✅ SUCCESS! Luma AI Ray v2 is working!
Job ID: arn:aws:bedrock:us-west-2:786673323159:async-invoke/x70kmulph3pq
```

### Test Lambda Integration
```bash
node scripts/development/test-video-generator-direct.js
```

**Current Status:** Failing - needs debugging

## Comparison: Luma Ray vs Nova Reel

| Feature | Luma AI Ray v2 | Nova Reel |
|---------|----------------|-----------|
| **Status** | ✅ Working | ❌ Service Issue |
| **Region** | us-west-2 | us-east-1 |
| **Model ID** | `luma.ray-v2:0` | `amazon.nova-reel-v1:0` |
| **Provider** | Luma AI | Amazon |
| **API Format** | Simple prompt | Complex taskType structure |
| **S3 Bucket** | `youtube-automation-luma-786673323159` | `youtube-automation-videos-*` |

## Advantages of Luma Ray

1. **Reliability**: Currently working when Nova Reel has service issues
2. **Simplicity**: Simpler API with just a prompt parameter
3. **Quality**: Advanced AI video generation capabilities
4. **Redundancy**: Provides backup when primary service fails

## Current Issues

### Lambda Integration Problem
- **Symptom**: Works in direct API calls, fails in Lambda
- **Possible Causes**:
  - IAM permission propagation delay
  - BedrockRuntimeClient import/region issues
  - Lambda environment differences

### Debugging Steps
1. **Wait for IAM Propagation**: 10-15 minutes after permission changes
2. **Check Lambda Logs**: Look for specific error messages
3. **Verify Region Configuration**: Ensure us-west-2 is correctly specified
4. **Test Import Statements**: Verify BedrockRuntimeClient imports work in Lambda

## Next Steps

1. **Debug Lambda Integration**
   - Add detailed logging to Lambda function
   - Test IAM permissions after propagation delay
   - Verify BedrockRuntimeClient configuration

2. **Complete Fallback Logic**
   - Ensure smooth fallback to Nova Reel when available
   - Add retry logic for transient failures
   - Implement proper error handling

3. **Performance Testing**
   - Compare video generation times
   - Test video quality differences
   - Measure cost implications

4. **Documentation Updates**
   - Update deployment guides
   - Add monitoring recommendations
   - Create troubleshooting procedures

## Monitoring

### Success Metrics
- Luma Ray job completion rate
- Video generation time
- S3 upload success rate
- Fallback activation frequency

### CloudWatch Logs
```bash
# Monitor Luma Ray usage
aws logs filter-log-events --log-group-name "/aws/lambda/youtube-automation-video-generator" --filter-pattern "Luma AI Ray" --region us-east-1
```

### S3 Monitoring
```bash
# Check generated videos
aws s3 ls s3://youtube-automation-luma-786673323159/ --region us-west-2 --recursive
```

## Cost Analysis

### Luma AI Ray v2 Pricing
- **Model Usage**: Pay per video generation
- **S3 Storage**: us-west-2 rates
- **Data Transfer**: Cross-region considerations

### Optimization Opportunities
- Use regional S3 buckets to minimize transfer costs
- Implement video compression if needed
- Monitor usage patterns for cost optimization

---
*Last Updated: October 4, 2025*
*Status: Direct API working, Lambda integration in progress*