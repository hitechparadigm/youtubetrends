import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { YoutubeAutomationPlatformStack } from '../lib/youtube-automation-platform-stack';

describe('YoutubeAutomationPlatformStack', () => {
  let app: cdk.App;
  let stack: YoutubeAutomationPlatformStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new YoutubeAutomationPlatformStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('creates S3 bucket with lifecycle policies', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled'
      },
      LifecycleConfiguration: {
        Rules: [
          {
            Id: 'DeleteOldVersions',
            Status: 'Enabled',
            NoncurrentVersionExpiration: {
              NoncurrentDays: 30
            }
          },
          {
            Id: 'TransitionToIA',
            Status: 'Enabled',
            Transitions: [
              {
                StorageClass: 'STANDARD_IA',
                TransitionInDays: 30
              },
              {
                StorageClass: 'GLACIER',
                TransitionInDays: 90
              }
            ]
          }
        ]
      }
    });
  });

  test('creates DynamoDB tables with correct configuration', () => {
    // Test TrendAnalytics table
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'TrendAnalytics',
      KeySchema: [
        {
          AttributeName: 'topic',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'timestamp',
          KeyType: 'RANGE'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true
      }
    });

    // Test VideoMetadata table
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'VideoMetadata',
      KeySchema: [
        {
          AttributeName: 'videoId',
          KeyType: 'HASH'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    });
  });

  test('creates Secrets Manager secret for YouTube credentials', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'youtube-automation/credentials',
      Description: 'YouTube Data API v3 credentials and OAuth tokens'
    });
  });

  test('creates VPC with correct configuration', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true
    });

    // Check that NAT Gateway is not created (cost optimization)
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
  });

  test('creates IAM roles with correct permissions', () => {
    // Test Lambda execution role exists
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'YoutubeAutomationLambdaRole'
    });

    // Test Step Functions role exists
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'YoutubeAutomationStepFunctionsRole'
    });
  });

  test('creates SNS topic for notifications', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'youtube-automation-notifications',
      DisplayName: 'YouTube Automation Platform Notifications'
    });
  });

  test('creates CloudWatch dashboard', () => {
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'YouTube-Automation-Platform'
    });
  });

  test('has correct number of outputs', () => {
    const outputs = template.findOutputs('*');
    expect(Object.keys(outputs)).toHaveLength(8);
  });

  test('IAM policies include required permissions', () => {
    // Check that roles have inline policies with required permissions
    const roles = template.findResources('AWS::IAM::Role');
    const lambdaRole = Object.values(roles).find((role: any) => 
      role.Properties?.RoleName === 'YoutubeAutomationLambdaRole'
    ) as any;
    
    expect(lambdaRole).toBeDefined();
    expect(lambdaRole?.Properties?.Policies).toBeDefined();
    expect(lambdaRole?.Properties?.Policies?.length).toBeGreaterThan(0);
  });
});