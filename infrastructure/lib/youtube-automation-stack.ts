import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class YouTubeAutomationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for video storage
    const videoBucket = new s3.Bucket(this, 'VideoBucket', {
      bucketName: `youtube-automation-videos-${this.account}`,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          expiration: cdk.Duration.days(90),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        }
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        }
      ]
    });

    // DynamoDB Tables
    const trendAnalyticsTable = new dynamodb.Table(this, 'TrendAnalyticsTable', {
      tableName: 'TrendAnalytics',
      partitionKey: { name: 'topic', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    trendAnalyticsTable.addGlobalSecondaryIndex({
      indexName: 'EngagementIndex',
      partitionKey: { name: 'engagementScore', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    const videoMetadataTable = new dynamodb.Table(this, 'VideoMetadataTable', {
      tableName: 'VideoMetadata',
      partitionKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    videoMetadataTable.addGlobalSecondaryIndex({
      indexName: 'UploadDateIndex',
      partitionKey: { name: 'uploadDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    const configurationTable = new dynamodb.Table(this, 'ConfigurationTable', {
      tableName: 'Configuration',
      partitionKey: { name: 'configKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Secrets Manager for API credentials
    const youtubeCredentials = new secretsmanager.Secret(this, 'YouTubeCredentials', {
      secretName: 'youtube-automation/credentials',
      description: 'YouTube API credentials and OAuth tokens',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          clientId: 'PLACEHOLDER',
          clientSecret: 'PLACEHOLDER'
        }),
        generateStringKey: 'refreshToken',
        excludeCharacters: '"@/\\'
      }
    });

    // SNS Topic for notifications
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: 'youtube-automation-notifications',
      displayName: 'YouTube Automation Notifications'
    });

    // IAM Role for Lambda functions
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        YouTubeAutomationPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [
                trendAnalyticsTable.tableArn,
                videoMetadataTable.tableArn,
                configurationTable.tableArn,
                `${trendAnalyticsTable.tableArn}/index/*`,
                `${videoMetadataTable.tableArn}/index/*`
              ]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject'
              ],
              resources: [`${videoBucket.bucketArn}/*`]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue'
              ],
              resources: [youtubeCredentials.secretArn]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'polly:SynthesizeSpeech'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'mediaconvert:CreateJob',
                'mediaconvert:GetJob',
                'mediaconvert:ListJobs'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sns:Publish'
              ],
              resources: [notificationTopic.topicArn]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Lambda Functions
    const trendDetectorFunction = new lambda.Function(this, 'TrendDetectorFunction', {
      functionName: 'youtube-trend-detector',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/trend-detector'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      role: lambdaExecutionRole,
      environment: {
        TREND_ANALYTICS_TABLE: trendAnalyticsTable.tableName,
        YOUTUBE_CREDENTIALS_SECRET: youtubeCredentials.secretName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    const contentAnalyzerFunction = new lambda.Function(this, 'ContentAnalyzerFunction', {
      functionName: 'youtube-content-analyzer',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/content-analyzer'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      role: lambdaExecutionRole,
      environment: {
        TREND_ANALYTICS_TABLE: trendAnalyticsTable.tableName,
        CONFIGURATION_TABLE: configurationTable.tableName
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    const videoGeneratorFunction = new lambda.Function(this, 'VideoGeneratorFunction', {
      functionName: 'youtube-video-generator',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/optimized-video-generator'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048,
      role: lambdaExecutionRole,
      environment: {
        VIDEO_BUCKET: videoBucket.bucketName,
        VIDEO_METADATA_TABLE: videoMetadataTable.tableName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    const videoProcessorFunction = new lambda.Function(this, 'VideoProcessorFunction', {
      functionName: 'youtube-video-processor',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/video-processor'),
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      role: lambdaExecutionRole,
      environment: {
        VIDEO_BUCKET: videoBucket.bucketName,
        VIDEO_METADATA_TABLE: videoMetadataTable.tableName
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    const youtubeUploaderFunction = new lambda.Function(this, 'YouTubeUploaderFunction', {
      functionName: 'youtube-uploader',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/youtube-uploader'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      role: lambdaExecutionRole,
      environment: {
        VIDEO_BUCKET: videoBucket.bucketName,
        VIDEO_METADATA_TABLE: videoMetadataTable.tableName,
        YOUTUBE_CREDENTIALS_SECRET: youtubeCredentials.secretName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    // Step Functions State Machine
    const trendDetectionTask = new sfnTasks.LambdaInvoke(this, 'TrendDetectionTask', {
      lambdaFunction: trendDetectorFunction,
      outputPath: '$.Payload'
    });

    const contentAnalysisTask = new sfnTasks.LambdaInvoke(this, 'ContentAnalysisTask', {
      lambdaFunction: contentAnalyzerFunction,
      outputPath: '$.Payload'
    });

    const videoGenerationTask = new sfnTasks.LambdaInvoke(this, 'VideoGenerationTask', {
      lambdaFunction: videoGeneratorFunction,
      outputPath: '$.Payload'
    });

    const videoProcessingTask = new sfnTasks.LambdaInvoke(this, 'VideoProcessingTask', {
      lambdaFunction: videoProcessorFunction,
      outputPath: '$.Payload'
    });

    const youtubeUploadTask = new sfnTasks.LambdaInvoke(this, 'YouTubeUploadTask', {
      lambdaFunction: youtubeUploaderFunction,
      outputPath: '$.Payload'
    });

    // Define the workflow
    const definition = trendDetectionTask
      .next(contentAnalysisTask)
      .next(videoGenerationTask)
      .next(videoProcessingTask)
      .next(youtubeUploadTask);

    const stateMachine = new stepfunctions.StateMachine(this, 'YouTubeAutomationWorkflow', {
      stateMachineName: 'youtube-automation-workflow',
      definition,
      timeout: cdk.Duration.hours(2),
      logs: {
        destination: new logs.LogGroup(this, 'StateMachineLogGroup', {
          logGroupName: '/aws/stepfunctions/youtube-automation',
          retention: logs.RetentionDays.ONE_WEEK
        }),
        level: stepfunctions.LogLevel.ALL
      }
    });

    // EventBridge Rules for scheduling
    const trendAnalysisRule = new events.Rule(this, 'TrendAnalysisSchedule', {
      ruleName: 'youtube-trend-analysis-schedule',
      description: 'Daily trend analysis at 8 AM EST',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '13', // 8 AM EST = 13 UTC
        day: '*',
        month: '*',
        year: '*'
      })
    });

    trendAnalysisRule.addTarget(new targets.SfnStateMachine(stateMachine, {
      input: events.RuleTargetInput.fromObject({
        category: 'general',
        region: 'US',
        maxResults: 50
      })
    }));

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'YouTubeAutomationDashboard', {
      dashboardName: 'YouTube-Automation-Platform'
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Function Invocations',
        left: [
          trendDetectorFunction.metricInvocations(),
          contentAnalyzerFunction.metricInvocations(),
          videoGeneratorFunction.metricInvocations(),
          videoProcessorFunction.metricInvocations(),
          youtubeUploaderFunction.metricInvocations()
        ]
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Function Errors',
        left: [
          trendDetectorFunction.metricErrors(),
          contentAnalyzerFunction.metricErrors(),
          videoGeneratorFunction.metricErrors(),
          videoProcessorFunction.metricErrors(),
          youtubeUploaderFunction.metricErrors()
        ]
      }),
      new cloudwatch.GraphWidget({
        title: 'Step Functions Executions',
        left: [
          stateMachine.metricStarted(),
          stateMachine.metricSucceeded(),
          stateMachine.metricFailed()
        ]
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'VideoBucketName', {
      value: videoBucket.bucketName,
      description: 'S3 bucket for video storage'
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN'
    });

    new cdk.CfnOutput(this, 'YouTubeCredentialsSecret', {
      value: youtubeCredentials.secretName,
      description: 'Secrets Manager secret for YouTube credentials'
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'SNS topic for notifications'
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL'
    });
  }
}