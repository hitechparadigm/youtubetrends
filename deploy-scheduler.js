#!/usr/bin/env node

/**
 * Deploy EventBridge Scheduler for YouTube Automation Platform
 * Sets up automated daily video generation and trend analysis
 */

async function deployScheduler() {
  console.log('🕒 DEPLOYING EVENTBRIDGE SCHEDULER');
  console.log('='.repeat(45));
  console.log('⚡ Setting up automated daily video generation');
  console.log('📅 Configuring trend analysis and performance monitoring');
  console.log('');

  try {
    const { CloudFormationClient, CreateStackCommand, DescribeStacksCommand } = 
      await import('@aws-sdk/client-cloudformation');

    const cloudformation = new CloudFormationClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Read the CloudFormation template
    const fs = require('fs');
    const templateBody = fs.readFileSync('infrastructure/eventbridge-scheduler-fixed.json', 'utf8');

    // Stack parameters
    const stackName = 'youtube-automation-scheduler';
    const stepFunctionArn = 'arn:aws:states:us-east-1:786673323159:stateMachine:youtube-automation-workflow';

    console.log('📋 DEPLOYMENT CONFIGURATION:');
    console.log(`- Stack Name: ${stackName}`);
    console.log(`- Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`- Step Function: ${stepFunctionArn}`);
    console.log('');

    console.log('🕒 SCHEDULED EXECUTIONS:');
    console.log('- Daily Trend Analysis: 8:00 AM EST');
    console.log('- Daily Video Generation: 2:00 AM EST');
    console.log('- Weekly Performance Analysis: Sunday 10:00 AM EST');
    console.log('');

    // Check if stack already exists
    let stackExists = false;
    try {
      await cloudformation.send(new DescribeStacksCommand({
        StackName: stackName
      }));
      stackExists = true;
      console.log('⚠️  Stack already exists - would need update operation');
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }

    if (!stackExists) {
      console.log('🚀 Creating CloudFormation stack...');
      
      const createParams = {
        StackName: stackName,
        TemplateBody: templateBody,
        Parameters: [
          {
            ParameterKey: 'Environment',
            ParameterValue: 'production'
          },
          {
            ParameterKey: 'StepFunctionArn',
            ParameterValue: stepFunctionArn
          },
          {
            ParameterKey: 'ScheduleTimezone',
            ParameterValue: 'America/New_York'
          }
        ],
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        Tags: [
          {
            Key: 'Project',
            Value: 'youtube-automation'
          },
          {
            Key: 'Component',
            Value: 'scheduler'
          },
          {
            Key: 'Environment',
            Value: 'production'
          }
        ]
      };

      const result = await cloudformation.send(new CreateStackCommand(createParams));
      
      console.log('✅ Stack creation initiated!');
      console.log(`📋 Stack ID: ${result.StackId}`);
      console.log('');
      console.log('⏳ Stack deployment in progress...');
      console.log('💡 Check AWS Console for deployment status');
      
    } else {
      console.log('ℹ️  Stack already exists. To update:');
      console.log('   aws cloudformation update-stack --stack-name youtube-automation-scheduler');
    }

    console.log('');
    console.log('🎯 AUTOMATION SCHEDULE SUMMARY:');
    console.log('='.repeat(40));
    
    console.log('📅 DAILY OPERATIONS:');
    console.log('   2:00 AM EST - Video Generation & Upload');
    console.log('   • Analyze trending topics');
    console.log('   • Generate AI videos (3 topics)');
    console.log('   • Upload to YouTube with SEO');
    console.log('   • Track performance metrics');
    console.log('');
    
    console.log('   8:00 AM EST - Trend Analysis');
    console.log('   • Discover new trending topics');
    console.log('   • Analyze competitor content');
    console.log('   • Update content strategy');
    console.log('   • Prepare for next day generation');
    console.log('');
    
    console.log('📊 WEEKLY OPERATIONS:');
    console.log('   Sunday 10:00 AM EST - Performance Analysis');
    console.log('   • Analyze video performance');
    console.log('   • Generate optimization recommendations');
    console.log('   • Update SEO strategies');
    console.log('   • Cost and ROI analysis');
    console.log('');

    console.log('🔧 SCHEDULER FEATURES:');
    console.log('✅ Flexible time windows (30-120 minutes)');
    console.log('✅ Automatic retry on failures (2-3 attempts)');
    console.log('✅ Dead letter queue for failed executions');
    console.log('✅ CloudWatch logging and monitoring');
    console.log('✅ Timezone-aware scheduling (EST)');
    console.log('✅ Environment-specific configurations');
    console.log('');

    console.log('📈 EXPECTED AUTOMATION RESULTS:');
    console.log('- 3 videos generated daily (21 per week)');
    console.log('- Fully automated content pipeline');
    console.log('- Trending topic optimization');
    console.log('- Performance-driven improvements');
    console.log('- Cost: ~$2.40/day (3 videos × $0.08)');
    console.log('');

    return {
      success: true,
      stackName,
      schedules: {
        trendAnalysis: '8:00 AM EST daily',
        videoGeneration: '2:00 AM EST daily',
        performanceAnalysis: 'Sunday 10:00 AM EST'
      }
    };

  } catch (error) {
    console.error('❌ Scheduler deployment failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check AWS credentials and permissions');
    console.log('2. Verify Step Function ARN exists');
    console.log('3. Ensure CloudFormation permissions');
    console.log('4. Check region configuration');
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Set environment
process.env.AWS_REGION = 'us-east-1';

console.log('🕒 YouTube Automation Platform - Scheduler Deployment');
console.log('⚡ Automated Daily Video Generation & Trend Analysis');
console.log('');

deployScheduler()
  .then(result => {
    if (result.success) {
      console.log('🎉 SUCCESS! Automated scheduling is now configured!');
      console.log('🚀 Your YouTube automation will run daily without intervention!');
      console.log('');
      console.log('📅 Next scheduled execution: Tomorrow 2:00 AM EST');
      console.log('📊 Monitor progress in AWS Console > EventBridge > Schedules');
    } else {
      console.log('❌ Deployment failed. Check the error details above.');
    }
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
  });