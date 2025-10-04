import { SFNClient, StartExecutionCommand, DescribeExecutionCommand, GetExecutionHistoryCommand } from '@aws-sdk/client-sfn';

async function testDetailedExecution() {
  console.log('🎬 Testing YouTube Automation Pipeline - Detailed Analysis...');
  
  try {
    const sfnClient = new SFNClient({ region: 'us-east-1' });
    
    // Test input focusing on one topic for clearer results
    const testInput = {
      topics: ['technology'], // Focus on one topic for detailed analysis
      region: 'US',
      maxResults: 5, // Smaller number for faster execution
      hoursBack: 24
    };

    console.log('🚀 Starting detailed execution...');
    console.log('Input:', JSON.stringify(testInput, null, 2));
    
    const startResponse = await sfnClient.send(new StartExecutionCommand({
      stateMachineArn: 'arn:aws:states:us-east-1:786673323159:stateMachine:youtube-automation-workflow',
      input: JSON.stringify(testInput),
      name: `detailed-test-${Date.now()}`
    }));

    console.log('✅ Execution started!');
    console.log(`📋 Execution ARN: ${startResponse.executionArn}`);
    
    // Monitor execution with detailed status
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30; // Monitor for up to 15 minutes
    
    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      attempts++;
      
      const describeResponse = await sfnClient.send(new DescribeExecutionCommand({
        executionArn: startResponse.executionArn
      }));
      
      status = describeResponse.status || 'UNKNOWN';
      console.log(`⏳ Status check ${attempts}/${maxAttempts}: ${status}`);
      
      // Get execution history for detailed progress
      try {
        const historyResponse = await sfnClient.send(new GetExecutionHistoryCommand({
          executionArn: startResponse.executionArn,
          maxResults: 10,
          reverseOrder: true
        }));
        
        const recentEvents = historyResponse.events?.slice(0, 3) || [];
        for (const event of recentEvents) {
          if (event.type && event.timestamp) {
            console.log(`   📝 ${event.type} at ${event.timestamp.toISOString()}`);
          }
        }
      } catch (historyError) {
        console.log('   📝 (History details unavailable)');
      }
      
      if (status === 'SUCCEEDED') {
        console.log('\n🎉 Workflow completed successfully!');
        console.log('📊 Final Output:', JSON.stringify(JSON.parse(describeResponse.output || '{}'), null, 2));
        
        // Get full execution history for analysis
        try {
          const fullHistoryResponse = await sfnClient.send(new GetExecutionHistoryCommand({
            executionArn: startResponse.executionArn,
            maxResults: 100
          }));
          
          console.log('\n📋 Execution Summary:');
          const events = fullHistoryResponse.events || [];
          const taskEvents = events.filter(e => e.type?.includes('Task'));
          
          console.log(`   🔢 Total Events: ${events.length}`);
          console.log(`   ⚙️ Task Events: ${taskEvents.length}`);
          
          // Show key milestones
          const milestones = events.filter(e => 
            e.type === 'TaskStateEntered' || 
            e.type === 'TaskSucceeded' || 
            e.type === 'TaskFailed'
          );
          
          console.log('\n🎯 Key Milestones:');
          for (const milestone of milestones.slice(-10)) { // Last 10 milestones
            const stateName = milestone.stateEnteredEventDetails?.name || 
                            milestone.taskSucceededEventDetails?.resourceType ||
                            milestone.taskFailedEventDetails?.resourceType ||
                            'Unknown';
            console.log(`   ✅ ${milestone.type}: ${stateName}`);
          }
          
        } catch (historyError) {
          console.log('📋 (Detailed history unavailable)');
        }
        
        break;
      } else if (status === 'FAILED') {
        console.log('\n❌ Workflow failed!');
        console.log('💥 Error:', describeResponse.error);
        console.log('📄 Cause:', describeResponse.cause);
        break;
      } else if (status === 'TIMED_OUT') {
        console.log('\n⏰ Workflow timed out!');
        break;
      }
    }
    
    if (attempts >= maxAttempts && status === 'RUNNING') {
      console.log('\n⏰ Monitoring timeout reached. Workflow may still be running.');
      console.log('🔍 Check AWS Console for execution status:');
      console.log(`   https://console.aws.amazon.com/states/home?region=us-east-1#/executions/details/${startResponse.executionArn}`);
    }

  } catch (error) {
    console.error('🚨 Test execution failed:', error);
  }
}

// Run the detailed test
testDetailedExecution();