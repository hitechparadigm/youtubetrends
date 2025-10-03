# Testing the YouTube Automation Platform

## Simple Infrastructure Test

This test validates that your deployed AWS infrastructure is working correctly.

### Prerequisites

1. **AWS Credentials**: Ensure your AWS credentials are configured
   ```bash
   aws configure
   # OR set environment variables:
   # export AWS_ACCESS_KEY_ID=your_key
   # export AWS_SECRET_ACCESS_KEY=your_secret
   # export AWS_REGION=us-east-1
   ```

2. **DynamoDB Tables**: Make sure the CDK stack has been deployed
   ```bash
   npm run deploy
   ```

3. **Dependencies**: Install required packages
   ```bash
   npm install
   ```

### Running the Test

```bash
npm run test:simple
```

### What the Test Does

The simple test validates:

1. **DynamoDB Connection** - Connects to your deployed DynamoDB tables
2. **Data Access Layer** - Tests TrendRepository and VideoRepository CRUD operations
3. **Data Integrity** - Verifies data can be saved and retrieved correctly
4. **Query Methods** - Tests repository query functionality

### Expected Output

```
🚀 Starting simple infrastructure test...

1️⃣ Testing DynamoDB connection...
   📝 Saving test trend to DynamoDB...
   ✅ Successfully saved trend to DynamoDB
   📖 Retrieving trends from DynamoDB...
   ✅ Retrieved X trends from DynamoDB

2️⃣ Testing Video Metadata repository...
   📝 Saving test video metadata...
   ✅ Successfully saved video metadata
   📖 Retrieving video metadata...
   ✅ Successfully retrieved video metadata

3️⃣ Testing data validation...
   ✅ Data integrity validated - saved and retrieved data match

4️⃣ Testing repository query methods...
   📊 Topic stats - Total trends: X, Avg engagement: X.XX
   📹 Found X recent videos
   ✅ Repository query methods working correctly

🎉 All tests passed! Infrastructure is working correctly.

📋 Summary:
   ✅ DynamoDB connection established
   ✅ TrendRepository CRUD operations working
   ✅ VideoRepository CRUD operations working
   ✅ Data integrity validated
   ✅ Query methods functioning
```

### Troubleshooting

If the test fails, check:

1. **AWS Credentials**: Run `aws sts get-caller-identity` to verify credentials
2. **DynamoDB Tables**: Check AWS Console to ensure tables exist:
   - `TrendAnalytics`
   - `VideoMetadata`
3. **IAM Permissions**: Ensure your AWS user/role has DynamoDB permissions
4. **Region**: Verify you're using the correct AWS region (default: us-east-1)

### What This Validates

✅ **Infrastructure Deployed**: Your AWS CDK stack is working  
✅ **Database Layer**: DynamoDB tables are accessible  
✅ **Data Access**: Repository pattern is functioning  
✅ **Core Models**: TrendData and VideoMetadata models work  
✅ **AWS SDK**: AWS SDK integration is properly configured  

### Next Steps

Once this test passes, you can:
1. Test YouTube API integration (requires API credentials)
2. Deploy and test Lambda functions
3. Test the complete trend detection pipeline

## Advanced Testing

For more comprehensive testing:

```bash
# Run unit tests
npm test

# Run specific test suites
npm test -- --testPathPattern=trend-detection
npm test -- --testPathPattern=repository
```