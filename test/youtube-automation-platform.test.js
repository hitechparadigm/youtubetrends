"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("aws-cdk-lib");
const assertions_1 = require("aws-cdk-lib/assertions");
const youtube_automation_platform_stack_1 = require("../lib/youtube-automation-platform-stack");
describe('YoutubeAutomationPlatformStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new youtube_automation_platform_stack_1.YoutubeAutomationPlatformStack(app, 'TestStack');
        template = assertions_1.Template.fromStack(stack);
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
        const lambdaRole = Object.values(roles).find((role) => role.Properties?.RoleName === 'YoutubeAutomationLambdaRole');
        expect(lambdaRole).toBeDefined();
        expect(lambdaRole?.Properties?.Policies).toBeDefined();
        expect(lambdaRole?.Properties?.Policies?.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1hdXRvbWF0aW9uLXBsYXRmb3JtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ5b3V0dWJlLWF1dG9tYXRpb24tcGxhdGZvcm0udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFtQztBQUNuQyx1REFBa0Q7QUFDbEQsZ0dBQTBGO0FBRTFGLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFDOUMsSUFBSSxHQUFZLENBQUM7SUFDakIsSUFBSSxLQUFxQyxDQUFDO0lBQzFDLElBQUksUUFBa0IsQ0FBQztJQUV2QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLGtFQUE4QixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM3RCxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRTtZQUNoRCx1QkFBdUIsRUFBRTtnQkFDdkIsTUFBTSxFQUFFLFNBQVM7YUFDbEI7WUFDRCxzQkFBc0IsRUFBRTtnQkFDdEIsS0FBSyxFQUFFO29CQUNMO3dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7d0JBQ3ZCLE1BQU0sRUFBRSxTQUFTO3dCQUNqQiwyQkFBMkIsRUFBRTs0QkFDM0IsY0FBYyxFQUFFLEVBQUU7eUJBQ25CO3FCQUNGO29CQUNEO3dCQUNFLEVBQUUsRUFBRSxnQkFBZ0I7d0JBQ3BCLE1BQU0sRUFBRSxTQUFTO3dCQUNqQixXQUFXLEVBQUU7NEJBQ1g7Z0NBQ0UsWUFBWSxFQUFFLGFBQWE7Z0NBQzNCLGdCQUFnQixFQUFFLEVBQUU7NkJBQ3JCOzRCQUNEO2dDQUNFLFlBQVksRUFB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RUFBRTtRQUNyRCxrRUFBa0U7UUFDbEUsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUUsQ0FDekQsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLEtBQUssNkJBQTZCLENBQ3JELENBQUM7UUFFVCxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDakMsTUFBTSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdkQsTUFBTSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcclxuaW1wb3J0IHsgWW91dHViZUF1dG9tYXRpb25QbGF0Zm9ybVN0YWNrIH0gZnJvbSAnLi4vbGliL3lvdXR1YmUtYXV0b21hdGlvbi1wbGF0Zm9ybS1zdGFjayc7XHJcblxyXG5kZXNjcmliZSgnWW91dHViZUF1dG9tYXRpb25QbGF0Zm9ybVN0YWNrJywgKCkgPT4ge1xyXG4gIGxldCBhcHA6IGNkay5BcHA7XHJcbiAgbGV0IHN0YWNrOiBZb3V0dWJlQXV0b21hdGlvblBsYXRmb3JtU3RhY2s7XHJcbiAgbGV0IHRlbXBsYXRlOiBUZW1wbGF0ZTtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBhcHAgPSBuZXcgY2RrLkFwcCgpO1xyXG4gICAgc3RhY2sgPSBuZXcgWW91dHViZUF1dG9tYXRpb25QbGF0Zm9ybVN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycpO1xyXG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdjcmVhdGVzIFMzIGJ1Y2tldCB3aXRoIGxpZmVjeWNsZSBwb2xpY2llcycsICgpID0+IHtcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xyXG4gICAgICBWZXJzaW9uaW5nQ29uZmlndXJhdGlvbjoge1xyXG4gICAgICAgIFN0YXR1czogJ0VuYWJsZWQnXHJcbiAgICAgIH0sXHJcbiAgICAgIExpZmVjeWNsZUNvbmZpZ3VyYXRpb246IHtcclxuICAgICAgICBSdWxlczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBJZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcclxuICAgICAgICAgICAgU3RhdHVzOiAnRW5hYmxlZCcsXHJcbiAgICAgICAgICAgIE5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgIE5vbmN1cnJlbnREYXlzOiAzMFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBJZDogJ1RyYW5zaXRpb25Ub0lBJyxcclxuICAgICAgICAgICAgU3RhdHVzOiAnRW5hYmxlZCcsXHJcbiAgICAgICAgICAgIFRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgU3RvcmFnZUNsYXNzOiAnU1RBTkRBUkRfSUEnLFxyXG4gICAgICAgICAgICAgICAgVHJhbnNpdGlvbkluRGF5czogMzBcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIFN0b3JhZ2VDbGFzczogJ0dMQUNJRVInLFxyXG4gICAgICAgICAgICAgICAgVHJhbnNpdGlvbkluRGF5czogOTBcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdjcmVhdGVzIER5bmFtb0RCIHRhYmxlcyB3aXRoIGNvcnJlY3QgY29uZmlndXJhdGlvbicsICgpID0+IHtcclxuICAgIC8vIFRlc3QgVHJlbmRBbmFseXRpY3MgdGFibGVcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XHJcbiAgICAgIFRhYmxlTmFtZTogJ1RyZW5kQW5hbHl0aWNzJyxcclxuICAgICAgS2V5U2NoZW1hOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3RvcGljJyxcclxuICAgICAgICAgIEtleVR5cGU6ICdIQVNIJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgICBLZXlUeXBlOiAnUkFOR0UnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBCaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCcsXHJcbiAgICAgIFBvaW50SW5UaW1lUmVjb3ZlcnlTcGVjaWZpY2F0aW9uOiB7XHJcbiAgICAgICAgUG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IHRydWVcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVGVzdCBWaWRlb01ldGFkYXRhIHRhYmxlXHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xyXG4gICAgICBUYWJsZU5hbWU6ICdWaWRlb01ldGFkYXRhJyxcclxuICAgICAgS2V5U2NoZW1hOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3ZpZGVvSWQnLFxyXG4gICAgICAgICAgS2V5VHlwZTogJ0hBU0gnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBCaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCdcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdjcmVhdGVzIFNlY3JldHMgTWFuYWdlciBzZWNyZXQgZm9yIFlvdVR1YmUgY3JlZGVudGlhbHMnLCAoKSA9PiB7XHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U2VjcmV0c01hbmFnZXI6OlNlY3JldCcsIHtcclxuICAgICAgTmFtZTogJ3lvdXR1YmUtYXV0b21hdGlvbi9jcmVkZW50aWFscycsXHJcbiAgICAgIERlc2NyaXB0aW9uOiAnWW91VHViZSBEYXRhIEFQSSB2MyBjcmVkZW50aWFscyBhbmQgT0F1dGggdG9rZW5zJ1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ2NyZWF0ZXMgVlBDIHdpdGggY29ycmVjdCBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDMjo6VlBDJywge1xyXG4gICAgICBDaWRyQmxvY2s6ICcxMC4wLjAuMC8xNicsXHJcbiAgICAgIEVuYWJsZURuc0hvc3RuYW1lczogdHJ1ZSxcclxuICAgICAgRW5hYmxlRG5zU3VwcG9ydDogdHJ1ZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgdGhhdCBOQVQgR2F0ZXdheSBpcyBub3QgY3JlYXRlZCAoY29zdCBvcHRpbWl6YXRpb24pXHJcbiAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUMyOjpOYXRHYXRld2F5JywgMCk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ2NyZWF0ZXMgSUFNIHJvbGVzIHdpdGggY29ycmVjdCBwZXJtaXNzaW9ucycsICgpID0+IHtcclxuICAgIC8vIFRlc3QgTGFtYmRhIGV4ZWN1dGlvbiByb2xlIGV4aXN0c1xyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6Um9sZScsIHtcclxuICAgICAgUm9sZU5hbWU6ICdZb3V0dWJlQXV0b21hdGlvbkxhbWJkYVJvbGUnXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUZXN0IFN0ZXAgRnVuY3Rpb25zIHJvbGUgZXhpc3RzXHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpSb2xlJywge1xyXG4gICAgICBSb2xlTmFtZTogJ1lvdXR1YmVBdXRvbWF0aW9uU3RlcEZ1bmN0aW9uc1JvbGUnXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnY3JlYXRlcyBTTlMgdG9waWMgZm9yIG5vdGlmaWNhdGlvbnMnLCAoKSA9PiB7XHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U05TOjpUb3BpYycsIHtcclxuICAgICAgVG9waWNOYW1lOiAneW91dHViZS1hdXRvbWF0aW9uLW5vdGlmaWNhdGlvbnMnLFxyXG4gICAgICBEaXNwbGF5TmFtZTogJ1lvdVR1YmUgQXV0b21hdGlvbiBQbGF0Zm9ybSBOb3RpZmljYXRpb25zJ1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ2NyZWF0ZXMgQ2xvdWRXYXRjaCBkYXNoYm9hcmQnLCAoKSA9PiB7XHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q2xvdWRXYXRjaDo6RGFzaGJvYXJkJywge1xyXG4gICAgICBEYXNoYm9hcmROYW1lOiAnWW91VHViZS1BdXRvbWF0aW9uLVBsYXRmb3JtJ1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ2hhcyBjb3JyZWN0IG51bWJlciBvZiBvdXRwdXRzJywgKCkgPT4ge1xyXG4gICAgY29uc3Qgb3V0cHV0cyA9IHRlbXBsYXRlLmZpbmRPdXRwdXRzKCcqJyk7XHJcbiAgICBleHBlY3QoT2JqZWN0LmtleXMob3V0cHV0cykpLnRvSGF2ZUxlbmd0aCg4KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnSUFNIHBvbGljaWVzIGluY2x1ZGUgcmVxdWlyZWQgcGVybWlzc2lvbnMnLCAoKSA9PiB7XHJcbiAgICAvLyBDaGVjayB0aGF0IHJvbGVzIGhhdmUgaW5saW5lIHBvbGljaWVzIHdpdGggcmVxdWlyZWQgcGVybWlzc2lvbnNcclxuICAgIGNvbnN0IHJvbGVzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpJQU06OlJvbGUnKTtcclxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBPYmplY3QudmFsdWVzKHJvbGVzKS5maW5kKChyb2xlOiBhbnkpID0+IFxyXG4gICAgICByb2xlLlByb3BlcnRpZXM/LlJvbGVOYW1lID09PSAnWW91dHViZUF1dG9tYXRpb25MYW1iZGFSb2xlJ1xyXG4gICAgKSBhcyBhbnk7XHJcbiAgICBcclxuICAgIGV4cGVjdChsYW1iZGFSb2xlKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgZXhwZWN0KGxhbWJkYVJvbGU/LlByb3BlcnRpZXM/LlBvbGljaWVzKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgZXhwZWN0KGxhbWJkYVJvbGU/LlByb3BlcnRpZXM/LlBvbGljaWVzPy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICB9KTtcclxufSk7Il19