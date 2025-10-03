import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
export declare class YoutubeAutomationPlatformStack extends cdk.Stack {
    readonly videoBucket: s3.Bucket;
    readonly trendAnalyticsTable: dynamodb.Table;
    readonly videoMetadataTable: dynamodb.Table;
    readonly youtubeCredentialsSecret: secretsmanager.Secret;
    readonly vpc: ec2.Vpc;
    readonly notificationTopic: sns.Topic;
    readonly trendDetectorFunction: nodejs.NodejsFunction;
    readonly contentAnalyzerFunction: nodejs.NodejsFunction;
    readonly videoGeneratorFunction: nodejs.NodejsFunction;
    readonly videoProcessorFunction: nodejs.NodejsFunction;
    readonly youtubeUploaderFunction: nodejs.NodejsFunction;
    readonly automationStateMachine: stepfunctions.StateMachine;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
