"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeAutomationPlatformStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const iam = require("aws-cdk-lib/aws-iam");
const ec2 = require("aws-cdk-lib/aws-ec2");
const sns = require("aws-cdk-lib/aws-sns");
const lambda = require("aws-cdk-lib/aws-lambda");
const nodejs = require("aws-cdk-lib/aws-lambda-nodejs");
const stepfunctions = require("aws-cdk-lib/aws-stepfunctions");
const logs = require("aws-cdk-lib/aws-logs");
const fs = require("fs");
class YoutubeAutomationPlatformStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // VPC for Lambda functions with public subnets (cost-optimized)
        this.vpc = new ec2.Vpc(this, 'YoutubeAutomationVpc', {
            maxAzs: 2,
            natGateways: 0,
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
            timeout: cdk.Duration.minutes(15),
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
            timeout: cdk.Duration.minutes(15),
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
            timeout: cdk.Duration.minutes(15),
            memorySize: 1024,
            environment: {
                VIDEO_BUCKET: this.videoBucket.bucketName,
                TREND_ANALYTICS_TABLE_NAME: this.trendAnalyticsTable.tableName,
                VIDEO_METADATA_TABLE_NAME: this.videoMetadataTable.tableName,
                YOUTUBE_CREDENTIALS_SECRET: this.youtubeCredentialsSecret.secretName
            },
            role: lambdaExecutionRole
        });
        // Step Functions State Machine for YouTube Automation Workflow
        const workflowDefinition = fs.readFileSync('stepfunctions/youtube-automation-workflow.json', 'utf8')
            .replace(/\$\{TrendDetectorFunctionArn\}/g, this.trendDetectorFunction.functionArn)
            .replace(/\$\{ContentAnalyzerFunctionArn\}/g, this.contentAnalyzerFunction.functionArn)
            .replace(/\$\{VideoGeneratorFunctionArn\}/g, this.videoGeneratorFunction.functionArn)
            .replace(/\$\{VideoProcessorFunctionArn\}/g, this.videoProcessorFunction.functionArn)
            .replace(/\$\{YouTubeUploaderFunctionArn\}/g, this.youtubeUploaderFunction.functionArn)
            .replace(/\$\{NotificationTopicArn\}/g, this.notificationTopic.topicArn);
        this.automationStateMachine = new stepfunctions.StateMachine(this, 'YouTubeAutomationStateMachine', {
            stateMachineName: 'youtube-automation-workflow',
            definitionBody: stepfunctions.DefinitionBody.fromString(workflowDefinition),
            role: stepFunctionsRole,
            timeout: cdk.Duration.hours(2),
            logs: {
                destination: new logs.LogGroup(this, 'StateMachineLogGroup', {
                    logGroupName: '/aws/stepfunctions/youtube-automation-workflow'
                }),
                level: stepfunctions.LogLevel.ALL,
                includeExecutionData: true
            }
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
        new cdk.CfnOutput(this, 'AutomationStateMachineArn', {
            value: this.automationStateMachine.stateMachineArn,
            description: 'ARN of the YouTube automation Step Functions state machine',
        });
    }
}
exports.YoutubeAutomationPlatformStack = YoutubeAutomationPlatformStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1hdXRvbWF0aW9uLXBsYXRmb3JtLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieW91dHViZS1hdXRvbWF0aW9uLXBsYXRmb3JtLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5Q0FBeUM7QUFDekMscURBQXFEO0FBQ3JELGlFQUFpRTtBQUNqRSwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUUzQyxpREFBaUQ7QUFDakQsd0RBQXdEO0FBQ3hELCtEQUErRDtBQUMvRCw2Q0FBNkM7QUFDN0MseUJBQXlCO0FBR3pCLE1BQWEsOEJBQStCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFjM0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixnRUFBZ0U7UUFDaEUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ25ELE1BQU0sRUFBRSxDQUFDO1lBQ1QsV0FBVyxFQUFFLENBQUM7WUFDZCxtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtpQkFDbEM7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3BELFVBQVUsRUFBRSw2QkFBNkIsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3RFLFNBQVMsRUFBRSxJQUFJO1lBQ2YsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixPQUFPLEVBQUUsSUFBSTtvQkFDYiwyQkFBMkIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7aUJBQ25EO2dCQUNEO29CQUNFLEVBQUUsRUFBRSxnQkFBZ0I7b0JBQ3BCLE9BQU8sRUFBRSxJQUFJO29CQUNiLFdBQVcsRUFBRTt3QkFDWDs0QkFDRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUI7NEJBQy9DLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7eUJBQ3ZDO3dCQUNEOzRCQUNFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU87NEJBQ3JDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7eUJBQ3ZDO3FCQUNGO2lCQUNGO2FBQ0Y7WUFDRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO1NBQ3hDLENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUN6RSxTQUFTLEVBQUUsZ0JBQWdCO1lBQzNCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsT0FBTztnQkFDYixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxXQUFXO2dCQUNqQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELG1CQUFtQixFQUFFLElBQUk7WUFDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtTQUN4QyxDQUFDLENBQUM7UUFFSCxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLHVCQUF1QixDQUFDO1lBQy9DLFNBQVMsRUFBRSxpQkFBaUI7WUFDNUIsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7U0FDRixDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDdkUsU0FBUyxFQUFFLGVBQWU7WUFDMUIsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO1NBQ3hDLENBQUMsQ0FBQztRQUVILGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUM7WUFDOUMsU0FBUyxFQUFFLGlCQUFpQjtZQUM1QixZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7U0FDRixDQUFDLENBQUM7UUFFSCw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDcEYsVUFBVSxFQUFFLGdDQUFnQztZQUM1QyxXQUFXLEVBQUUsa0RBQWtEO1lBQy9ELG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQyxTQUFTLEVBQUUsRUFBRTtvQkFDYixhQUFhLEVBQUUsRUFBRTtvQkFDakIsVUFBVSxFQUFFLEVBQUU7aUJBQ2YsQ0FBQztnQkFDRixpQkFBaUIsRUFBRSxxQkFBcUI7Z0JBQ3hDLGlCQUFpQixFQUFFLE9BQU87YUFDM0I7U0FDRixDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDaEUsU0FBUyxFQUFFLGtDQUFrQztZQUM3QyxXQUFXLEVBQUUsMkNBQTJDO1NBQ3pELENBQUMsQ0FBQztRQUVILGdDQUFnQztRQUNoQyxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDcEUsUUFBUSxFQUFFLDZCQUE2QjtZQUN2QyxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUM7WUFDM0QsZUFBZSxFQUFFO2dCQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMENBQTBDLENBQUM7YUFDdkY7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsdUJBQXVCLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDO29CQUM5QyxVQUFVLEVBQUU7d0JBQ1YsdUJBQXVCO3dCQUN2QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7NEJBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7NEJBQ3hCLE9BQU8sRUFBRTtnQ0FDUCxrQkFBa0I7Z0NBQ2xCLGtCQUFrQjtnQ0FDbEIscUJBQXFCO2dDQUNyQixxQkFBcUI7Z0NBQ3JCLGdCQUFnQjtnQ0FDaEIsZUFBZTs2QkFDaEI7NEJBQ0QsU0FBUyxFQUFFO2dDQUNULElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRO2dDQUNqQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUTtnQ0FDaEMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxVQUFVO2dDQUM5QyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLFVBQVU7NkJBQzlDO3lCQUNGLENBQUM7d0JBQ0YsaUJBQWlCO3dCQUNqQixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7NEJBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7NEJBQ3hCLE9BQU8sRUFBRTtnQ0FDUCxjQUFjO2dDQUNkLGNBQWM7Z0NBQ2QsaUJBQWlCO2dDQUNqQixlQUFlOzZCQUNoQjs0QkFDRCxTQUFTLEVBQUU7Z0NBQ1QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO2dDQUMxQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxJQUFJOzZCQUNsQzt5QkFDRixDQUFDO3dCQUNGLDhCQUE4Qjt3QkFDOUIsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUU7Z0NBQ1AsK0JBQStCO2dDQUMvQiw2QkFBNkI7NkJBQzlCOzRCQUNELFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUM7eUJBQ3JELENBQUM7d0JBQ0Ysc0JBQXNCO3dCQUN0QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7NEJBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7NEJBQ3hCLE9BQU8sRUFBRTtnQ0FDUCxxQkFBcUI7Z0NBQ3JCLHVDQUF1QztnQ0FDdkMsMEJBQTBCO2dDQUMxQix3QkFBd0I7NkJBQ3pCOzRCQUNELFNBQVMsRUFBRSxDQUFDLDJEQUEyRCxDQUFDO3lCQUN6RSxDQUFDO3dCQUNGLHlDQUF5Qzt3QkFDekMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUU7Z0NBQ1AsZ0NBQWdDO2dDQUNoQyw4QkFBOEI7Z0NBQzlCLGdDQUFnQztnQ0FDaEMsd0JBQXdCOzZCQUN6Qjs0QkFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7eUJBQ2pCLENBQUM7d0JBQ0YsMkJBQTJCO3dCQUMzQixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7NEJBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7NEJBQ3hCLE9BQU8sRUFBRTtnQ0FDUCx3QkFBd0I7Z0NBQ3hCLHFCQUFxQjtnQ0FDckIsdUJBQXVCO2dDQUN2QixnQ0FBZ0M7NkJBQ2pDOzRCQUNELFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQzt5QkFDakIsQ0FBQzt3QkFDRixrQkFBa0I7d0JBQ2xCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQzs0QkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSzs0QkFDeEIsT0FBTyxFQUFFLENBQUMsYUFBYSxDQUFDOzRCQUN4QixTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDO3lCQUM3QyxDQUFDO3dCQUNGLHlCQUF5Qjt3QkFDekIsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUU7Z0NBQ1AsMEJBQTBCO2dDQUMxQixxQkFBcUI7Z0NBQ3JCLHNCQUFzQjtnQ0FDdEIsbUJBQW1COzZCQUNwQjs0QkFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7eUJBQ2pCLENBQUM7cUJBQ0g7aUJBQ0YsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNoRSxRQUFRLEVBQUUsb0NBQW9DO1lBQzlDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxjQUFjLEVBQUU7Z0JBQ2QsbUJBQW1CLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDO29CQUMxQyxVQUFVLEVBQUU7d0JBQ1YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQzs0QkFDbEMsU0FBUyxFQUFFLENBQUMsa0JBQWtCLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sZ0NBQWdDLENBQUM7eUJBQzNGLENBQUM7d0JBQ0YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUUsQ0FBQyxhQUFhLENBQUM7NEJBQ3hCLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7eUJBQzdDLENBQUM7cUJBQ0g7aUJBQ0YsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUM5RCxRQUFRLEVBQUUsbUNBQW1DO1lBQzdDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyw0QkFBNEIsQ0FBQztZQUNqRSxjQUFjLEVBQUU7Z0JBQ2Qsa0JBQWtCLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDO29CQUN6QyxVQUFVLEVBQUU7d0JBQ1YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUU7Z0NBQ1AsY0FBYztnQ0FDZCxjQUFjO2dDQUNkLGVBQWU7NkJBQ2hCOzRCQUNELFNBQVMsRUFBRTtnQ0FDVCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVM7Z0NBQzFCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLElBQUk7NkJBQ2xDO3lCQUNGLENBQUM7d0JBQ0YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUU7Z0NBQ1AscUJBQXFCO2dDQUNyQixzQkFBc0I7Z0NBQ3RCLG1CQUFtQjs2QkFDcEI7NEJBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO3lCQUNqQixDQUFDO3FCQUNIO2lCQUNGLENBQUM7YUFDSDtTQUNGLENBQUMsQ0FBQztRQUVILG1CQUFtQjtRQUVuQiwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDcEYsWUFBWSxFQUFFLG1DQUFtQztZQUNqRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLEtBQUssRUFBRSxnQ0FBZ0M7WUFDdkMsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixXQUFXLEVBQUU7Z0JBQ1gsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVM7Z0JBQzlELHlCQUF5QixFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTO2dCQUM1RCxZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVO2dCQUN6QywwQkFBMEIsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVTthQUNyRTtZQUNELElBQUksRUFBRSxtQkFBbUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ3hGLFlBQVksRUFBRSxxQ0FBcUM7WUFDbkQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxLQUFLLEVBQUUsa0NBQWtDO1lBQ3pDLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUU7Z0JBQ1gsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVM7Z0JBQzlELHNCQUFzQixFQUFFLGlCQUFpQjthQUMxQztZQUNELElBQUksRUFBRSxtQkFBbUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ3RGLFlBQVksRUFBRSxvQ0FBb0M7WUFDbEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxLQUFLLEVBQUUsaUNBQWlDO1lBQ3hDLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLElBQUk7WUFDaEIsV0FBVyxFQUFFO2dCQUNYLFlBQVksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVU7YUFDMUM7WUFDRCxJQUFJLEVBQUUsbUJBQW1CO1NBQzFCLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUN0RixZQUFZLEVBQUUsb0NBQW9DO1lBQ2xELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLGlDQUFpQztZQUN4QyxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFdBQVcsRUFBRTtnQkFDWCxZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVO2dCQUN6QyxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO2dCQUMvQyxzQkFBc0IsRUFBRSx3QkFBd0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxpQkFBaUI7YUFDN0Y7WUFDRCxJQUFJLEVBQUUsbUJBQW1CO1NBQzFCLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUN4RixZQUFZLEVBQUUscUNBQXFDO1lBQ25ELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLGtDQUFrQztZQUN6QyxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFdBQVcsRUFBRTtnQkFDWCxZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVO2dCQUN6QywwQkFBMEIsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUztnQkFDOUQseUJBQXlCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVM7Z0JBQzVELDBCQUEwQixFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVO2FBQ3JFO1lBQ0QsSUFBSSxFQUFFLG1CQUFtQjtTQUMxQixDQUFDLENBQUM7UUFFSCwrREFBK0Q7UUFDL0QsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGdEQUFnRCxFQUFFLE1BQU0sQ0FBQzthQUNqRyxPQUFPLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQzthQUNsRixPQUFPLENBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQzthQUN0RixPQUFPLENBQUMsa0NBQWtDLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQzthQUNwRixPQUFPLENBQUMsa0NBQWtDLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQzthQUNwRixPQUFPLENBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQzthQUN0RixPQUFPLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTNFLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLCtCQUErQixFQUFFO1lBQ2xHLGdCQUFnQixFQUFFLDZCQUE2QjtZQUMvQyxjQUFjLEVBQUUsYUFBYSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUM7WUFDM0UsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzlCLElBQUksRUFBRTtnQkFDSixXQUFXLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtvQkFDM0QsWUFBWSxFQUFFLGdEQUFnRDtpQkFDL0QsQ0FBQztnQkFDRixLQUFLLEVBQUUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHO2dCQUNqQyxvQkFBb0IsRUFBRSxJQUFJO2FBQzNCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOEVBQThFO1FBQzlFLG1GQUFtRjtRQUNuRixrREFBa0Q7UUFDbEQsTUFBTTtRQUVOLDJDQUEyQztRQUMzQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVU7WUFDbEMsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUztZQUN6QyxXQUFXLEVBQUUsb0NBQW9DO1NBQ2xELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTO1lBQ3hDLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSw2QkFBNkIsRUFBRTtZQUNyRCxLQUFLLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVM7WUFDOUMsV0FBVyxFQUFFLGdEQUFnRDtTQUM5RCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUTtZQUN0QyxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLG1CQUFtQixDQUFDLE9BQU87WUFDbEMsV0FBVyxFQUFFLCtCQUErQjtTQUM3QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxPQUFPO1lBQ2hDLFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDL0IsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSztZQUNyQixXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEQsS0FBSyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXO1lBQzdDLFdBQVcsRUFBRSwyQ0FBMkM7U0FDekQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUNwRCxLQUFLLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVc7WUFDL0MsV0FBVyxFQUFFLDZDQUE2QztTQUMzRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ25ELEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVztZQUM5QyxXQUFXLEVBQUUsNENBQTRDO1NBQzFELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDbkQsS0FBSyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXO1lBQzlDLFdBQVcsRUFBRSw0Q0FBNEM7U0FDMUQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUNwRCxLQUFLLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVc7WUFDL0MsV0FBVyxFQUFFLDZDQUE2QztTQUMzRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ25ELEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsZUFBZTtZQUNsRCxXQUFXLEVBQUUsNERBQTREO1NBQzFFLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTFkRCx3RUEwZEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBub2RlanMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xyXG5pbXBvcnQgKiBhcyBzdGVwZnVuY3Rpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgY2xhc3MgWW91dHViZUF1dG9tYXRpb25QbGF0Zm9ybVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdmlkZW9CdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICBwdWJsaWMgcmVhZG9ubHkgdHJlbmRBbmFseXRpY3NUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgcHVibGljIHJlYWRvbmx5IHZpZGVvTWV0YWRhdGFUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgcHVibGljIHJlYWRvbmx5IHlvdXR1YmVDcmVkZW50aWFsc1NlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xyXG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGVjMi5WcGM7XHJcbiAgcHVibGljIHJlYWRvbmx5IG5vdGlmaWNhdGlvblRvcGljOiBzbnMuVG9waWM7XHJcbiAgcHVibGljIHJlYWRvbmx5IHRyZW5kRGV0ZWN0b3JGdW5jdGlvbjogbm9kZWpzLk5vZGVqc0Z1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBjb250ZW50QW5hbHl6ZXJGdW5jdGlvbjogbm9kZWpzLk5vZGVqc0Z1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSB2aWRlb0dlbmVyYXRvckZ1bmN0aW9uOiBub2RlanMuTm9kZWpzRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHZpZGVvUHJvY2Vzc29yRnVuY3Rpb246IG5vZGVqcy5Ob2RlanNGdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgeW91dHViZVVwbG9hZGVyRnVuY3Rpb246IG5vZGVqcy5Ob2RlanNGdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgYXV0b21hdGlvblN0YXRlTWFjaGluZTogc3RlcGZ1bmN0aW9ucy5TdGF0ZU1hY2hpbmU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIFZQQyBmb3IgTGFtYmRhIGZ1bmN0aW9ucyB3aXRoIHB1YmxpYyBzdWJuZXRzIChjb3N0LW9wdGltaXplZClcclxuICAgIHRoaXMudnBjID0gbmV3IGVjMi5WcGModGhpcywgJ1lvdXR1YmVBdXRvbWF0aW9uVnBjJywge1xyXG4gICAgICBtYXhBenM6IDIsXHJcbiAgICAgIG5hdEdhdGV3YXlzOiAwLCAvLyBSZW1vdmUgTkFUIEdhdGV3YXkgdG8gc2F2ZSBjb3N0c1xyXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxyXG4gICAgICAgICAgbmFtZTogJ1B1YmxpYycsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFMzIGJ1Y2tldCBmb3IgdmlkZW8gc3RvcmFnZSB3aXRoIGxpZmVjeWNsZSBwb2xpY2llc1xyXG4gICAgdGhpcy52aWRlb0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1ZpZGVvQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgeW91dHViZS1hdXRvbWF0aW9uLXZpZGVvcy0ke3RoaXMuYWNjb3VudH0tJHt0aGlzLnJlZ2lvbn1gLFxyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAnVHJhbnNpdGlvblRvSUEnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcclxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsXHJcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIER5bmFtb0RCIHRhYmxlIGZvciB0cmVuZCBhbmFseXRpY3NcclxuICAgIHRoaXMudHJlbmRBbmFseXRpY3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVHJlbmRBbmFseXRpY3NUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnVHJlbmRBbmFseXRpY3MnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAndG9waWMnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2xvYmFsIFNlY29uZGFyeSBJbmRleCBmb3IgZW5nYWdlbWVudC1iYXNlZCBxdWVyaWVzXHJcbiAgICB0aGlzLnRyZW5kQW5hbHl0aWNzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdFbmdhZ2VtZW50SW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnZW5nYWdlbWVudFNjb3JlJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUixcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICd0aW1lc3RhbXAnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRHluYW1vREIgdGFibGUgZm9yIHZpZGVvIG1ldGFkYXRhXHJcbiAgICB0aGlzLnZpZGVvTWV0YWRhdGFUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVmlkZW9NZXRhZGF0YVRhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdWaWRlb01ldGFkYXRhJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3ZpZGVvSWQnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdsb2JhbCBTZWNvbmRhcnkgSW5kZXggZm9yIHVwbG9hZCBkYXRlIHF1ZXJpZXNcclxuICAgIHRoaXMudmlkZW9NZXRhZGF0YVRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnVXBsb2FkRGF0ZUluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3VwbG9hZERhdGUnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2VjcmV0cyBNYW5hZ2VyIGZvciBZb3VUdWJlIEFQSSBjcmVkZW50aWFsc1xyXG4gICAgdGhpcy55b3V0dWJlQ3JlZGVudGlhbHNTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdZb3V0dWJlQ3JlZGVudGlhbHMnLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6ICd5b3V0dWJlLWF1dG9tYXRpb24vY3JlZGVudGlhbHMnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1lvdVR1YmUgRGF0YSBBUEkgdjMgY3JlZGVudGlhbHMgYW5kIE9BdXRoIHRva2VucycsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XHJcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGNsaWVudF9pZDogJycsXHJcbiAgICAgICAgICBjbGllbnRfc2VjcmV0OiAnJyxcclxuICAgICAgICAgIHByb2plY3RfaWQ6ICcnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAnb2F1dGhfcmVmcmVzaF90b2tlbicsXHJcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTTlMgdG9waWMgZm9yIG5vdGlmaWNhdGlvbnNcclxuICAgIHRoaXMubm90aWZpY2F0aW9uVG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdOb3RpZmljYXRpb25Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiAneW91dHViZS1hdXRvbWF0aW9uLW5vdGlmaWNhdGlvbnMnLFxyXG4gICAgICBkaXNwbGF5TmFtZTogJ1lvdVR1YmUgQXV0b21hdGlvbiBQbGF0Zm9ybSBOb3RpZmljYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIElBTSByb2xlIGZvciBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBsYW1iZGFFeGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogJ1lvdXR1YmVBdXRvbWF0aW9uTGFtYmRhUm9sZScsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcclxuICAgICAgXSxcclxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcclxuICAgICAgICBZb3V0dWJlQXV0b21hdGlvblBvbGljeTogbmV3IGlhbS5Qb2xpY3lEb2N1bWVudCh7XHJcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXHJcbiAgICAgICAgICAgIC8vIER5bmFtb0RCIHBlcm1pc3Npb25zXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxyXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpTY2FuJyxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmVuZEFuYWx5dGljc1RhYmxlLnRhYmxlQXJuLFxyXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb01ldGFkYXRhVGFibGUudGFibGVBcm4sXHJcbiAgICAgICAgICAgICAgICBgJHt0aGlzLnRyZW5kQW5hbHl0aWNzVGFibGUudGFibGVBcm59L2luZGV4LypgLFxyXG4gICAgICAgICAgICAgICAgYCR7dGhpcy52aWRlb01ldGFkYXRhVGFibGUudGFibGVBcm59L2luZGV4LypgLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAvLyBTMyBwZXJtaXNzaW9uc1xyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICdzMzpMaXN0QnVja2V0JyxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb0J1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgICAgICAgICAgICBgJHt0aGlzLnZpZGVvQnVja2V0LmJ1Y2tldEFybn0vKmAsXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIC8vIFNlY3JldHMgTWFuYWdlciBwZXJtaXNzaW9uc1xyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXHJcbiAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6VXBkYXRlU2VjcmV0JyxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgIHJlc291cmNlczogW3RoaXMueW91dHViZUNyZWRlbnRpYWxzU2VjcmV0LnNlY3JldEFybl0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAvLyBCZWRyb2NrIHBlcm1pc3Npb25zXHJcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxyXG4gICAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICAgICAgICAgICAgJ2JlZHJvY2s6U3RhcnRBc3luY0ludm9rZScsXHJcbiAgICAgICAgICAgICAgICAnYmVkcm9jazpHZXRBc3luY0ludm9rZScsXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnYXJuOmF3czpiZWRyb2NrOio6OmZvdW5kYXRpb24tbW9kZWwvYW1hem9uLm5vdmEtcmVlbC12MTowJ10sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAvLyBQb2xseSBwZXJtaXNzaW9ucyBmb3IgYXVkaW8gZ2VuZXJhdGlvblxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdwb2xseTpTdGFydFNwZWVjaFN5bnRoZXNpc1Rhc2snLFxyXG4gICAgICAgICAgICAgICAgJ3BvbGx5OkdldFNwZWVjaFN5bnRoZXNpc1Rhc2snLFxyXG4gICAgICAgICAgICAgICAgJ3BvbGx5Okxpc3RTcGVlY2hTeW50aGVzaXNUYXNrcycsXHJcbiAgICAgICAgICAgICAgICAncG9sbHk6U3ludGhlc2l6ZVNwZWVjaCdcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAvLyBNZWRpYUNvbnZlcnQgcGVybWlzc2lvbnNcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnbWVkaWFjb252ZXJ0OkNyZWF0ZUpvYicsXHJcbiAgICAgICAgICAgICAgICAnbWVkaWFjb252ZXJ0OkdldEpvYicsXHJcbiAgICAgICAgICAgICAgICAnbWVkaWFjb252ZXJ0Okxpc3RKb2JzJyxcclxuICAgICAgICAgICAgICAgICdtZWRpYWNvbnZlcnQ6RGVzY3JpYmVFbmRwb2ludHMnLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIC8vIFNOUyBwZXJtaXNzaW9uc1xyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFsnc25zOlB1Ymxpc2gnXSxcclxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFt0aGlzLm5vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuXSxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIC8vIENsb3VkV2F0Y2ggcGVybWlzc2lvbnNcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnY2xvdWR3YXRjaDpQdXRNZXRyaWNEYXRhJyxcclxuICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXHJcbiAgICAgICAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSUFNIHJvbGUgZm9yIFN0ZXAgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBzdGVwRnVuY3Rpb25zUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnU3RlcEZ1bmN0aW9uc1JvbGUnLCB7XHJcbiAgICAgIHJvbGVOYW1lOiAnWW91dHViZUF1dG9tYXRpb25TdGVwRnVuY3Rpb25zUm9sZScsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdzdGF0ZXMuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xyXG4gICAgICAgIFN0ZXBGdW5jdGlvbnNQb2xpY3k6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xyXG4gICAgICAgICAgc3RhdGVtZW50czogW1xyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFsnbGFtYmRhOkludm9rZUZ1bmN0aW9uJ10sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6bGFtYmRhOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpmdW5jdGlvbjp5b3V0dWJlLWF1dG9tYXRpb24tKmBdLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3NuczpQdWJsaXNoJ10sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5ub3RpZmljYXRpb25Ub3BpYy50b3BpY0Fybl0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIElBTSByb2xlIGZvciBNZWRpYUNvbnZlcnRcclxuICAgIGNvbnN0IG1lZGlhQ29udmVydFJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ01lZGlhQ29udmVydFJvbGUnLCB7XHJcbiAgICAgIHJvbGVOYW1lOiAnWW91dHViZUF1dG9tYXRpb25NZWRpYUNvbnZlcnRSb2xlJyxcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ21lZGlhY29udmVydC5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XHJcbiAgICAgICAgTWVkaWFDb252ZXJ0UG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcclxuICAgICAgICAgIHN0YXRlbWVudHM6IFtcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICB0aGlzLnZpZGVvQnVja2V0LmJ1Y2tldEFybixcclxuICAgICAgICAgICAgICAgIGAke3RoaXMudmlkZW9CdWNrZXQuYnVja2V0QXJufS8qYCxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxyXG4gICAgICAgICAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIFxyXG4gICAgLy8gVHJlbmQgRGV0ZWN0b3IgRnVuY3Rpb25cclxuICAgIHRoaXMudHJlbmREZXRlY3RvckZ1bmN0aW9uID0gbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnVHJlbmREZXRlY3RvckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICd5b3V0dWJlLWF1dG9tYXRpb24tdHJlbmQtZGV0ZWN0b3InLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgZW50cnk6ICdsYW1iZGEvdHJlbmQtZGV0ZWN0b3IvaW5kZXgudHMnLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBUUkVORF9BTkFMWVRJQ1NfVEFCTEVfTkFNRTogdGhpcy50cmVuZEFuYWx5dGljc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBWSURFT19NRVRBREFUQV9UQUJMRV9OQU1FOiB0aGlzLnZpZGVvTWV0YWRhdGFUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVklERU9fQlVDS0VUOiB0aGlzLnZpZGVvQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgWU9VVFVCRV9DUkVERU5USUFMU19TRUNSRVQ6IHRoaXMueW91dHViZUNyZWRlbnRpYWxzU2VjcmV0LnNlY3JldE5hbWVcclxuICAgICAgfSxcclxuICAgICAgcm9sZTogbGFtYmRhRXhlY3V0aW9uUm9sZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29udGVudCBBbmFseXplciBGdW5jdGlvblxyXG4gICAgdGhpcy5jb250ZW50QW5hbHl6ZXJGdW5jdGlvbiA9IG5ldyBub2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0NvbnRlbnRBbmFseXplckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICd5b3V0dWJlLWF1dG9tYXRpb24tY29udGVudC1hbmFseXplcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBlbnRyeTogJ2xhbWJkYS9jb250ZW50LWFuYWx5emVyL2luZGV4LnRzJyxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBUUkVORF9BTkFMWVRJQ1NfVEFCTEVfTkFNRTogdGhpcy50cmVuZEFuYWx5dGljc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBDT05URU5UX0FOQUxZU0lTX1RBQkxFOiAnQ29udGVudEFuYWx5c2lzJ1xyXG4gICAgICB9LFxyXG4gICAgICByb2xlOiBsYW1iZGFFeGVjdXRpb25Sb2xlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBWaWRlbyBHZW5lcmF0b3IgRnVuY3Rpb25cclxuICAgIHRoaXMudmlkZW9HZW5lcmF0b3JGdW5jdGlvbiA9IG5ldyBub2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1ZpZGVvR2VuZXJhdG9yRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3lvdXR1YmUtYXV0b21hdGlvbi12aWRlby1nZW5lcmF0b3InLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgZW50cnk6ICdsYW1iZGEvdmlkZW8tZ2VuZXJhdG9yL2luZGV4LnRzJyxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksIC8vIE1heGltdW0gTGFtYmRhIHRpbWVvdXQgKDE1IG1pbnV0ZXMpXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVklERU9fQlVDS0VUOiB0aGlzLnZpZGVvQnVja2V0LmJ1Y2tldE5hbWVcclxuICAgICAgfSxcclxuICAgICAgcm9sZTogbGFtYmRhRXhlY3V0aW9uUm9sZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVmlkZW8gUHJvY2Vzc29yIEZ1bmN0aW9uXHJcbiAgICB0aGlzLnZpZGVvUHJvY2Vzc29yRnVuY3Rpb24gPSBuZXcgbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdWaWRlb1Byb2Nlc3NvckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICd5b3V0dWJlLWF1dG9tYXRpb24tdmlkZW8tcHJvY2Vzc29yJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGVudHJ5OiAnbGFtYmRhL3ZpZGVvLXByb2Nlc3Nvci9pbmRleC50cycsXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyBNZWRpYUNvbnZlcnQgam9icyBjYW4gdGFrZSB0aW1lXHJcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVklERU9fQlVDS0VUOiB0aGlzLnZpZGVvQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgTUVESUFDT05WRVJUX1JPTEVfQVJOOiBtZWRpYUNvbnZlcnRSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgTUVESUFDT05WRVJUX1FVRVVFX0FSTjogYGFybjphd3M6bWVkaWFjb252ZXJ0OiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpxdWV1ZXMvRGVmYXVsdGBcclxuICAgICAgfSxcclxuICAgICAgcm9sZTogbGFtYmRhRXhlY3V0aW9uUm9sZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gWW91VHViZSBVcGxvYWRlciBGdW5jdGlvblxyXG4gICAgdGhpcy55b3V0dWJlVXBsb2FkZXJGdW5jdGlvbiA9IG5ldyBub2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1lvdVR1YmVVcGxvYWRlckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICd5b3V0dWJlLWF1dG9tYXRpb24teW91dHViZS11cGxvYWRlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBlbnRyeTogJ2xhbWJkYS95b3V0dWJlLXVwbG9hZGVyL2luZGV4LnRzJyxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksIC8vIFlvdVR1YmUgdXBsb2FkcyBjYW4gdGFrZSB0aW1lXHJcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVklERU9fQlVDS0VUOiB0aGlzLnZpZGVvQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgVFJFTkRfQU5BTFlUSUNTX1RBQkxFX05BTUU6IHRoaXMudHJlbmRBbmFseXRpY3NUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVklERU9fTUVUQURBVEFfVEFCTEVfTkFNRTogdGhpcy52aWRlb01ldGFkYXRhVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFlPVVRVQkVfQ1JFREVOVElBTFNfU0VDUkVUOiB0aGlzLnlvdXR1YmVDcmVkZW50aWFsc1NlY3JldC5zZWNyZXROYW1lXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvbGU6IGxhbWJkYUV4ZWN1dGlvblJvbGVcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0ZXAgRnVuY3Rpb25zIFN0YXRlIE1hY2hpbmUgZm9yIFlvdVR1YmUgQXV0b21hdGlvbiBXb3JrZmxvd1xyXG4gICAgY29uc3Qgd29ya2Zsb3dEZWZpbml0aW9uID0gZnMucmVhZEZpbGVTeW5jKCdzdGVwZnVuY3Rpb25zL3lvdXR1YmUtYXV0b21hdGlvbi13b3JrZmxvdy5qc29uJywgJ3V0ZjgnKVxyXG4gICAgICAucmVwbGFjZSgvXFwkXFx7VHJlbmREZXRlY3RvckZ1bmN0aW9uQXJuXFx9L2csIHRoaXMudHJlbmREZXRlY3RvckZ1bmN0aW9uLmZ1bmN0aW9uQXJuKVxyXG4gICAgICAucmVwbGFjZSgvXFwkXFx7Q29udGVudEFuYWx5emVyRnVuY3Rpb25Bcm5cXH0vZywgdGhpcy5jb250ZW50QW5hbHl6ZXJGdW5jdGlvbi5mdW5jdGlvbkFybilcclxuICAgICAgLnJlcGxhY2UoL1xcJFxce1ZpZGVvR2VuZXJhdG9yRnVuY3Rpb25Bcm5cXH0vZywgdGhpcy52aWRlb0dlbmVyYXRvckZ1bmN0aW9uLmZ1bmN0aW9uQXJuKVxyXG4gICAgICAucmVwbGFjZSgvXFwkXFx7VmlkZW9Qcm9jZXNzb3JGdW5jdGlvbkFyblxcfS9nLCB0aGlzLnZpZGVvUHJvY2Vzc29yRnVuY3Rpb24uZnVuY3Rpb25Bcm4pXHJcbiAgICAgIC5yZXBsYWNlKC9cXCRcXHtZb3VUdWJlVXBsb2FkZXJGdW5jdGlvbkFyblxcfS9nLCB0aGlzLnlvdXR1YmVVcGxvYWRlckZ1bmN0aW9uLmZ1bmN0aW9uQXJuKVxyXG4gICAgICAucmVwbGFjZSgvXFwkXFx7Tm90aWZpY2F0aW9uVG9waWNBcm5cXH0vZywgdGhpcy5ub3RpZmljYXRpb25Ub3BpYy50b3BpY0Fybik7XHJcblxyXG4gICAgdGhpcy5hdXRvbWF0aW9uU3RhdGVNYWNoaW5lID0gbmV3IHN0ZXBmdW5jdGlvbnMuU3RhdGVNYWNoaW5lKHRoaXMsICdZb3VUdWJlQXV0b21hdGlvblN0YXRlTWFjaGluZScsIHtcclxuICAgICAgc3RhdGVNYWNoaW5lTmFtZTogJ3lvdXR1YmUtYXV0b21hdGlvbi13b3JrZmxvdycsXHJcbiAgICAgIGRlZmluaXRpb25Cb2R5OiBzdGVwZnVuY3Rpb25zLkRlZmluaXRpb25Cb2R5LmZyb21TdHJpbmcod29ya2Zsb3dEZWZpbml0aW9uKSxcclxuICAgICAgcm9sZTogc3RlcEZ1bmN0aW9uc1JvbGUsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5ob3VycygyKSwgLy8gTWF4aW11bSB3b3JrZmxvdyBleGVjdXRpb24gdGltZVxyXG4gICAgICBsb2dzOiB7XHJcbiAgICAgICAgZGVzdGluYXRpb246IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdTdGF0ZU1hY2hpbmVMb2dHcm91cCcsIHtcclxuICAgICAgICAgIGxvZ0dyb3VwTmFtZTogJy9hd3Mvc3RlcGZ1bmN0aW9ucy95b3V0dWJlLWF1dG9tYXRpb24td29ya2Zsb3cnXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgbGV2ZWw6IHN0ZXBmdW5jdGlvbnMuTG9nTGV2ZWwuQUxMLFxyXG4gICAgICAgIGluY2x1ZGVFeGVjdXRpb25EYXRhOiB0cnVlXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggZGFzaGJvYXJkIGZvciBtb25pdG9yaW5nIChwbGFjZWhvbGRlciBmb3IgZnV0dXJlIGltcGxlbWVudGF0aW9uKVxyXG4gICAgLy8gY29uc3QgZGFzaGJvYXJkID0gbmV3IGNsb3Vkd2F0Y2guRGFzaGJvYXJkKHRoaXMsICdZb3V0dWJlQXV0b21hdGlvbkRhc2hib2FyZCcsIHtcclxuICAgIC8vICAgZGFzaGJvYXJkTmFtZTogJ1lvdVR1YmUtQXV0b21hdGlvbi1QbGF0Zm9ybScsXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgaW1wb3J0YW50IHJlc291cmNlIEFSTnMgYW5kIG5hbWVzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVmlkZW9CdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy52aWRlb0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgdmlkZW8gc3RvcmFnZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVHJlbmRBbmFseXRpY3NUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnRyZW5kQW5hbHl0aWNzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciB0cmVuZCBhbmFseXRpY3MnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ZpZGVvTWV0YWRhdGFUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnZpZGVvTWV0YWRhdGFUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgZm9yIHZpZGVvIG1ldGFkYXRhJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdZb3V0dWJlQ3JlZGVudGlhbHNTZWNyZXRBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnlvdXR1YmVDcmVkZW50aWFsc1NlY3JldC5zZWNyZXRBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjcmV0cyBNYW5hZ2VyIHNlY3JldCBmb3IgWW91VHViZSBjcmVkZW50aWFscycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLm5vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyB0b3BpYyBmb3Igbm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZUFybicsIHtcclxuICAgICAgdmFsdWU6IGxhbWJkYUV4ZWN1dGlvblJvbGUucm9sZUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgTGFtYmRhIGZ1bmN0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RlcEZ1bmN0aW9uc1JvbGVBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBzdGVwRnVuY3Rpb25zUm9sZS5yb2xlQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBTdGVwIEZ1bmN0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVnBjSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy52cGNJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdWUEMgSUQgZm9yIExhbWJkYSBmdW5jdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RyZW5kRGV0ZWN0b3JGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudHJlbmREZXRlY3RvckZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgdHJlbmQgZGV0ZWN0b3IgTGFtYmRhIGZ1bmN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb250ZW50QW5hbHl6ZXJGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuY29udGVudEFuYWx5emVyRnVuY3Rpb24uZnVuY3Rpb25Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBjb250ZW50IGFuYWx5emVyIExhbWJkYSBmdW5jdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVmlkZW9HZW5lcmF0b3JGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudmlkZW9HZW5lcmF0b3JGdW5jdGlvbi5mdW5jdGlvbkFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIHZpZGVvIGdlbmVyYXRvciBMYW1iZGEgZnVuY3Rpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ZpZGVvUHJvY2Vzc29yRnVuY3Rpb25Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnZpZGVvUHJvY2Vzc29yRnVuY3Rpb24uZnVuY3Rpb25Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSB2aWRlbyBwcm9jZXNzb3IgTGFtYmRhIGZ1bmN0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdZb3VUdWJlVXBsb2FkZXJGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMueW91dHViZVVwbG9hZGVyRnVuY3Rpb24uZnVuY3Rpb25Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBZb3VUdWJlIHVwbG9hZGVyIExhbWJkYSBmdW5jdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXV0b21hdGlvblN0YXRlTWFjaGluZUFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXV0b21hdGlvblN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBZb3VUdWJlIGF1dG9tYXRpb24gU3RlcCBGdW5jdGlvbnMgc3RhdGUgbWFjaGluZScsXHJcbiAgICB9KTtcclxuICB9XHJcbn0iXX0=