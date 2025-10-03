import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class YoutubeAutomationPlatformStack extends cdk.Stack {
  public readonly videoBucket: s3.Bucket;
  public readonly trendAnalyticsTable: dynamodb.Table;
  public readonly videoMetadataTable: dynamodb.Table;
  public readonly youtubeCredentialsSecret: secretsmanager.Secret;
  public readonly vpc: ec2.Vpc;
  public readonly notificationTopic: sns.Topic;
  public readonly trendDetectorFunction: nodejs.NodejsFunction;
  public readonly contentAnalyzerFunction: nodejs.NodejsFunction;
  public readonly videoGeneratorFunction: nodejs.NodejsFunction;
  public readonly videoProcessorFunction: nodejs.NodejsFunction;
  public readonly youtubeUploaderFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for Lambda functions with public subnets (cost-optimized)
    this.vpc = new ec2.Vpc(this, 'YoutubeAutomationVpc', {
      maxAzs: 2,
      natGateways: 0, // Remove NAT Gateway to save costs
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // S3 bucket for video storage with lifecycle policies
    this.videoBucket = new s3.Bucket(this, 'VideoBucket', {
      bucketName: `youtube-automation-videos-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // DynamoDB table for trend analytics
    this.trendAnalyticsTable = new dynamodb.Table(this, 'TrendAnalyticsTable', {
      tableName: 'TrendAnalytics',
      partitionKey: {
        name: 'topic',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Global Secondary Index for engagement-based queries
    this.trendAnalyticsTable.addGlobalSecondaryIndex({
      indexName: 'EngagementIndex',
      partitionKey: {
        name: 'engagementScore',
        type: dynamodb.AttributeType.NUMBER,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // DynamoDB table for video metadata
    this.videoMetadataTable = new dynamodb.Table(this, 'VideoMetadataTable', {
      tableName: 'VideoMetadata',
      partitionKey: {
        name: 'videoId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Global Secondary Index for upload date queries
    this.videoMetadataTable.addGlobalSecondaryIndex({
      indexName: 'UploadDateIndex',
      partitionKey: {
        name: 'uploadDate',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Secrets Manager for YouTube API credentials
    this.youtubeCredentialsSecret = new secretsmanager.Secret(this, 'YoutubeCredentials', {
      secretName: 'youtube-automation/credentials',
      description: 'YouTube Data API v3 credentials and OAuth tokens',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          client_id: '',
          client_secret: '',
          project_id: '',
        }),
        generateStringKey: 'oauth_refresh_token',
        excludeCharacters: '"@/\\',
      },
    });

    // SNS topic for notifications
    this.notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: 'youtube-automation-notifications',
      displayName: 'YouTube Automation Platform Notifications',
    });

    // IAM role for Lambda functions
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: 'YoutubeAutomationLambdaRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        YoutubeAutomationPolicy: new iam.PolicyDocument({
          statements: [
            // DynamoDB permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
              resources: [
                this.trendAnalyticsTable.tableArn,
                this.videoMetadataTable.tableArn,
                `${this.trendAnalyticsTable.tableArn}/index/*`,
                `${this.videoMetadataTable.tableArn}/index/*`,
              ],
            }),
            // S3 permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
              ],
              resources: [
                this.videoBucket.bucketArn,
                `${this.videoBucket.bucketArn}/*`,
              ],
            }),
            // Secrets Manager permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:UpdateSecret',
              ],
              resources: [this.youtubeCredentialsSecret.secretArn],
            }),
            // Bedrock permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:StartAsyncInvoke',
                'bedrock:GetAsyncInvoke',
              ],
              resources: ['arn:aws:bedrock:*::foundation-model/amazon.nova-reel-v1:0'],
            }),
            // Polly permissions for audio generation
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'polly:StartSpeechSynthesisTask',
                'polly:GetSpeechSynthesisTask',
                'polly:ListSpeechSynthesisTasks',
                'polly:SynthesizeSpeech'
              ],
              resources: ['*'],
            }),
            // MediaConvert permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'mediaconvert:CreateJob',
                'mediaconvert:GetJob',
                'mediaconvert:ListJobs',
                'mediaconvert:DescribeEndpoints',
              ],
              resources: ['*'],
            }),
            // SNS permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['sns:Publish'],
              resources: [this.notificationTopic.topicArn],
            }),
            // CloudWatch permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // IAM role for Step Functions
    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
      roleName: 'YoutubeAutomationStepFunctionsRole',
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StepFunctionsPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [`arn:aws:lambda:${this.region}:${this.account}:function:youtube-automation-*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['sns:Publish'],
              resources: [this.notificationTopic.topicArn],
            }),
          ],
        }),
      },
    });

    // IAM role for MediaConvert
    const mediaConvertRole = new iam.Role(this, 'MediaConvertRole', {
      roleName: 'YoutubeAutomationMediaConvertRole',
      assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
      inlinePolicies: {
        MediaConvertPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
              ],
              resources: [
                this.videoBucket.bucketArn,
                `${this.videoBucket.bucketArn}/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Lambda Functions
    
    // Trend Detector Function
    this.trendDetectorFunction = new nodejs.NodejsFunction(this, 'TrendDetectorFunction', {
      functionName: 'youtube-automation-trend-detector',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/trend-detector/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        TREND_ANALYTICS_TABLE_NAME: this.trendAnalyticsTable.tableName,
        VIDEO_METADATA_TABLE_NAME: this.videoMetadataTable.tableName,
        VIDEO_BUCKET: this.videoBucket.bucketName,
        YOUTUBE_CREDENTIALS_SECRET: this.youtubeCredentialsSecret.secretName
      },
      role: lambdaExecutionRole
    });

    // Content Analyzer Function
    this.contentAnalyzerFunction = new nodejs.NodejsFunction(this, 'ContentAnalyzerFunction', {
      functionName: 'youtube-automation-content-analyzer',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/content-analyzer/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(10),
      memorySize: 512,
      environment: {
        TREND_ANALYTICS_TABLE_NAME: this.trendAnalyticsTable.tableName,
        CONTENT_ANALYSIS_TABLE: 'ContentAnalysis'
      },
      role: lambdaExecutionRole
    });

    // Video Generator Function
    this.videoGeneratorFunction = new nodejs.NodejsFunction(this, 'VideoGeneratorFunction', {
      functionName: 'youtube-automation-video-generator',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/video-generator/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(15), // Maximum Lambda timeout (15 minutes)
      memorySize: 2048,
      environment: {
        VIDEO_BUCKET: this.videoBucket.bucketName
      },
      role: lambdaExecutionRole
    });

    // Video Processor Function
    this.videoProcessorFunction = new nodejs.NodejsFunction(this, 'VideoProcessorFunction', {
      functionName: 'youtube-automation-video-processor',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/video-processor/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(15), // MediaConvert jobs can take time
      memorySize: 1024,
      environment: {
        VIDEO_BUCKET: this.videoBucket.bucketName,
        MEDIACONVERT_ROLE_ARN: mediaConvertRole.roleArn,
        MEDIACONVERT_QUEUE_ARN: `arn:aws:mediaconvert:${this.region}:${this.account}:queues/Default`
      },
      role: lambdaExecutionRole
    });

    // YouTube Uploader Function
    this.youtubeUploaderFunction = new nodejs.NodejsFunction(this, 'YouTubeUploaderFunction', {
      functionName: 'youtube-automation-youtube-uploader',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'lambda/youtube-uploader/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(15), // YouTube uploads can take time
      memorySize: 1024,
      environment: {
        VIDEO_BUCKET: this.videoBucket.bucketName,
        TREND_ANALYTICS_TABLE_NAME: this.trendAnalyticsTable.tableName,
        VIDEO_METADATA_TABLE_NAME: this.videoMetadataTable.tableName,
        YOUTUBE_CREDENTIALS_SECRET: this.youtubeCredentialsSecret.secretName
      },
      role: lambdaExecutionRole
    });

    // CloudWatch dashboard for monitoring (placeholder for future implementation)
    // const dashboard = new cloudwatch.Dashboard(this, 'YoutubeAutomationDashboard', {
    //   dashboardName: 'YouTube-Automation-Platform',
    // });

    // Output important resource ARNs and names
    new cdk.CfnOutput(this, 'VideoBucketName', {
      value: this.videoBucket.bucketName,
      description: 'S3 bucket for video storage',
    });

    new cdk.CfnOutput(this, 'TrendAnalyticsTableName', {
      value: this.trendAnalyticsTable.tableName,
      description: 'DynamoDB table for trend analytics',
    });

    new cdk.CfnOutput(this, 'VideoMetadataTableName', {
      value: this.videoMetadataTable.tableName,
      description: 'DynamoDB table for video metadata',
    });

    new cdk.CfnOutput(this, 'YoutubeCredentialsSecretArn', {
      value: this.youtubeCredentialsSecret.secretArn,
      description: 'Secrets Manager secret for YouTube credentials',
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: this.notificationTopic.topicArn,
      description: 'SNS topic for notifications',
    });

    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: lambdaExecutionRole.roleArn,
      description: 'IAM role for Lambda functions',
    });

    new cdk.CfnOutput(this, 'StepFunctionsRoleArn', {
      value: stepFunctionsRole.roleArn,
      description: 'IAM role for Step Functions',
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for Lambda functions',
    });

    new cdk.CfnOutput(this, 'TrendDetectorFunctionArn', {
      value: this.trendDetectorFunction.functionArn,
      description: 'ARN of the trend detector Lambda function',
    });

    new cdk.CfnOutput(this, 'ContentAnalyzerFunctionArn', {
      value: this.contentAnalyzerFunction.functionArn,
      description: 'ARN of the content analyzer Lambda function',
    });

    new cdk.CfnOutput(this, 'VideoGeneratorFunctionArn', {
      value: this.videoGeneratorFunction.functionArn,
      description: 'ARN of the video generator Lambda function',
    });

    new cdk.CfnOutput(this, 'VideoProcessorFunctionArn', {
      value: this.videoProcessorFunction.functionArn,
      description: 'ARN of the video processor Lambda function',
    });

    new cdk.CfnOutput(this, 'YouTubeUploaderFunctionArn', {
      value: this.youtubeUploaderFunction.functionArn,
      description: 'ARN of the YouTube uploader Lambda function',
    });
  }
}