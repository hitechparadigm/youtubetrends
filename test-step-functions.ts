import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

async function testStepFunctionsWorkflow() {
  console.log('🔄 Testing YouTube Automation Step Functions Workflow...');
  
  try {
    const sfnClient = new SFNClient({ region: 'us-east-1' });
    
    // Test input for the workflow
    const testInput = {
      topics: ['technology', 'investing'], // Test with 2 topics
      region: 'US',
      maxResults: 10,
      hoursBack: 24
    };

    console.log('🚀 Starting Step Functions execution...');
    console.log('Input:', JSON.stringify(testInput, null, 2));
    
    const startResponse = await sfnClient.send(new StartExecutionCommand({
      stateMachineArn: 'arn:aws:states:us-east-1:786673323159:stateMachine:youtube-automation-workflow',
      input: JSON.stringify(testInput),
      name: `test-execution-${Date.now()}`
    }));

    console.log('✅ Execution started successfully!');
    console.log(`📋 Execution ARN: ${startResponse.executionArn}`);
    
    // Monitor execution status
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 20; // Monitor for up to 10 minutes
    
    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      attempts++;
      
      const describeResponse = await sfnClient.send(new DescribeExecutionCommand({
        executionArn: startResponse.executionArn
      }));
      
      status = describeResponse.status || 'UNKNOWN';
      console.log(`⏳ Status check ${attempts}/${maxAttempts}: ${status}`);
      
      if (status === 'SUCCEEDED') {
        console.log('🎉 Workflow completed successfully!');
        console.log('📊 Output:', describeResponse.output);
        break;
      } else if (status === 'FAILED') {
        console.log('❌ Workflow failed!');
        console.log('💥 Error:', describeResponse.error);
        break;
      } else if (status === 'TIMED_OUT') {
        console.log('⏰ Workflow timed out!');
        break;
      }
    }
    
    if (attempts >= maxAttempts && status === 'RUNNING') {
      console.log('⏰ Monitoring timeout reached. Workflow may still be running.');
      console.log('🔍 Check AWS Console for execution status.');
    }

  } catch (error) {
    console.error('🚨 Test execution failed:', error);
  }
}

// Run the test
testStepFunctionsWorkflow();