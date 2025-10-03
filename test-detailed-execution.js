"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_sfn_1 = require("@aws-sdk/client-sfn");
async function testDetailedExecution() {
    console.log('🎬 Testing YouTube Automation Pipeline - Detailed Analysis...');
    try {
        const sfnClient = new client_sfn_1.SFNClient({ region: 'us-east-1' });
        // Test input focusing on one topic for clearer results
        const testInput = {
            topics: ['technology'],
            region: 'US',
            maxResults: 5,
            hoursBack: 24
        };
        console.log('🚀 Starting detailed execution...');
        console.log('Input:', JSON.stringify(testInput, null, 2));
        const startResponse = await sfnClient.send(new client_sfn_1.StartExecutionCommand({
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
            const describeResponse = await sfnClient.send(new client_sfn_1.DescribeExecutionCommand({
                executionArn: startResponse.executionArn
            }));
            status = describeResponse.status || 'UNKNOWN';
            console.log(`⏳ Status check ${attempts}/${maxAttempts}: ${status}`);
            // Get execution history for detailed progress
            try {
                const historyResponse = await sfnClient.send(new client_sfn_1.GetExecutionHistoryCommand({
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
            }
            catch (historyError) {
                console.log('   📝 (History details unavailable)');
            }
            if (status === 'SUCCEEDED') {
                console.log('\n🎉 Workflow completed successfully!');
                console.log('📊 Final Output:', JSON.stringify(JSON.parse(describeResponse.output || '{}'), null, 2));
                // Get full execution history for analysis
                try {
                    const fullHistoryResponse = await sfnClient.send(new client_sfn_1.GetExecutionHistoryCommand({
                        executionArn: startResponse.executionArn,
                        maxResults: 100
                    }));
                    console.log('\n📋 Execution Summary:');
                    const events = fullHistoryResponse.events || [];
                    const taskEvents = events.filter(e => e.type?.includes('Task'));
                    console.log(`   🔢 Total Events: ${events.length}`);
                    console.log(`   ⚙️ Task Events: ${taskEvents.length}`);
                    // Show key milestones
                    const milestones = events.filter(e => e.type === 'TaskStateEntered' ||
                        e.type === 'TaskSucceeded' ||
                        e.type === 'TaskFailed');
                    console.log('\n🎯 Key Milestones:');
                    for (const milestone of milestones.slice(-10)) { // Last 10 milestones
                        const stateName = milestone.stateEnteredEventDetails?.name ||
                            milestone.taskSucceededEventDetails?.resourceType ||
                            milestone.taskFailedEventDetails?.resourceType ||
                            'Unknown';
                        console.log(`   ✅ ${milestone.type}: ${stateName}`);
                    }
                }
                catch (historyError) {
                    console.log('📋 (Detailed history unavailable)');
                }
                break;
            }
            else if (status === 'FAILED') {
                console.log('\n❌ Workflow failed!');
                console.log('💥 Error:', describeResponse.error);
                console.log('📄 Cause:', describeResponse.cause);
                break;
            }
            else if (status === 'TIMED_OUT') {
                console.log('\n⏰ Workflow timed out!');
                break;
            }
        }
        if (attempts >= maxAttempts && status === 'RUNNING') {
            console.log('\n⏰ Monitoring timeout reached. Workflow may still be running.');
            console.log('🔍 Check AWS Console for execution status:');
            console.log(`   https://console.aws.amazon.com/states/home?region=us-east-1#/executions/details/${startResponse.executionArn}`);
        }
    }
    catch (error) {
        console.error('🚨 Test execution failed:', error);
    }
}
// Run the detailed test
testDetailedExecution();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1kZXRhaWxlZC1leGVjdXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LWRldGFpbGVkLWV4ZWN1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG9EQUE2SDtBQUU3SCxLQUFLLFVBQVUscUJBQXFCO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0RBQStELENBQUMsQ0FBQztJQUU3RSxJQUFJO1FBQ0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFekQsdURBQXVEO1FBQ3ZELE1BQU0sU0FBUyxHQUFHO1lBQ2hCLE1BQU0sRUFBRSxDQUFDLFlBQVksQ0FBQztZQUN0QixNQUFNLEVBQUUsSUFBSTtZQUNaLFVBQVUsRUFBRSxDQUFDO1lBQ2IsU0FBUyxFQUFFLEVBQUU7U0FDZCxDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTFELE1BQU0sYUFBYSxHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLGtDQUFxQixDQUFDO1lBQ25FLGVBQWUsRUFBRSxnRkFBZ0Y7WUFDakcsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQ2hDLElBQUksRUFBRSxpQkFBaUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO1NBQ3BDLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLGFBQWEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRS9ELHlDQUF5QztRQUN6QyxJQUFJLE1BQU0s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QUFRLElBQUksV0FBVyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7WUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1lBQzlFLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztZQUMxRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNGQUFzRixhQUFhLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztTQUNqSTtLQUVGO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ25EO0FBQ0gsQ0FBQztBQUVELHdCQUF3QjtBQUN4QixxQkFBcUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU0ZOQ2xpZW50LCBTdGFydEV4ZWN1dGlvbkNvbW1hbmQsIERlc2NyaWJlRXhlY3V0aW9uQ29tbWFuZCwgR2V0RXhlY3V0aW9uSGlzdG9yeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2ZuJztcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRlc3REZXRhaWxlZEV4ZWN1dGlvbigpIHtcclxuICBjb25zb2xlLmxvZygn8J+OrCBUZXN0aW5nIFlvdVR1YmUgQXV0b21hdGlvbiBQaXBlbGluZSAtIERldGFpbGVkIEFuYWx5c2lzLi4uJyk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHNmbkNsaWVudCA9IG5ldyBTRk5DbGllbnQoeyByZWdpb246ICd1cy1lYXN0LTEnIH0pO1xyXG4gICAgXHJcbiAgICAvLyBUZXN0IGlucHV0IGZvY3VzaW5nIG9uIG9uZSB0b3BpYyBmb3IgY2xlYXJlciByZXN1bHRzXHJcbiAgICBjb25zdCB0ZXN0SW5wdXQgPSB7XHJcbiAgICAgIHRvcGljczogWyd0ZWNobm9sb2d5J10sIC8vIEZvY3VzIG9uIG9uZSB0b3BpYyBmb3IgZGV0YWlsZWQgYW5hbHlzaXNcclxuICAgICAgcmVnaW9uOiAnVVMnLFxyXG4gICAgICBtYXhSZXN1bHRzOiA1LCAvLyBTbWFsbGVyIG51bWJlciBmb3IgZmFzdGVyIGV4ZWN1dGlvblxyXG4gICAgICBob3Vyc0JhY2s6IDI0XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCfwn5qAIFN0YXJ0aW5nIGRldGFpbGVkIGV4ZWN1dGlvbi4uLicpO1xyXG4gICAgY29uc29sZS5sb2coJ0lucHV0OicsIEpTT04uc3RyaW5naWZ5KHRlc3RJbnB1dCwgbnVsbCwgMikpO1xyXG4gICAgXHJcbiAgICBjb25zdCBzdGFydFJlc3BvbnNlID0gYXdhaXQgc2ZuQ2xpZW50LnNlbmQobmV3IFN0YXJ0RXhlY3V0aW9uQ29tbWFuZCh7XHJcbiAgICAgIHN0YXRlTWFjaGluZUFybjogJ2Fybjphd3M6c3RhdGVzOnVzLWVhc3QtMTo3ODY2NzMzMjMxNTk6c3RhdGVNYWNoaW5lOnlvdXR1YmUtYXV0b21hdGlvbi13b3JrZmxvdycsXHJcbiAgICAgIGlucHV0OiBKU09OLnN0cmluZ2lmeSh0ZXN0SW5wdXQpLFxyXG4gICAgICBuYW1lOiBgZGV0YWlsZWQtdGVzdC0ke0RhdGUubm93KCl9YFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCfinIUgRXhlY3V0aW9uIHN0YXJ0ZWQhJyk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TiyBFeGVjdXRpb24gQVJOOiAke3N0YXJ0UmVzcG9uc2UuZXhlY3V0aW9uQXJufWApO1xyXG4gICAgXHJcbiAgICAvLyBNb25pdG9yIGV4ZWN1dGlvbiB3aXRoIGRldGFpbGVkIHN0YXR1c1xyXG4gICAgbGV0IHN0YXR1cyA9ICdSVU5OSU5HJztcclxuICAgIGxldCBhdHRlbXB0cyA9IDA7XHJcbiAgICBjb25zdCBtYXhBdHRlbXB0cyA9IDMwOyAvLyBNb25pdG9yIGZvciB1cCB0byAxNSBtaW51dGVzXHJcbiAgICBcclxuICAgIHdoaWxlIChzdGF0dXMgPT09ICdSVU5OSU5HJyAmJiBhdHRlbXB0cyA8IG1heEF0dGVtcHRzKSB7XHJcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwMCkpOyAvLyBXYWl0IDMwIHNlY29uZHNcclxuICAgICAgYXR0ZW1wdHMrKztcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGRlc2NyaWJlUmVzcG9uc2UgPSBhd2FpdCBzZm5DbGllbnQuc2VuZChuZXcgRGVzY3JpYmVFeGVjdXRpb25Db21tYW5kKHtcclxuICAgICAgICBleGVjdXRpb25Bcm46IHN0YXJ0UmVzcG9uc2UuZXhlY3V0aW9uQXJuXHJcbiAgICAgIH0pKTtcclxuICAgICAgXHJcbiAgICAgIHN0YXR1cyA9IGRlc2NyaWJlUmVzcG9uc2Uuc3RhdHVzIHx8ICdVTktOT1dOJztcclxuICAgICAgY29uc29sZS5sb2coYOKPsyBTdGF0dXMgY2hlY2sgJHthdHRlbXB0c30vJHttYXhBdHRlbXB0c306ICR7c3RhdHVzfWApO1xyXG4gICAgICBcclxuICAgICAgLy8gR2V0IGV4ZWN1dGlvbiBoaXN0b3J5IGZvciBkZXRhaWxlZCBwcm9ncmVzc1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGhpc3RvcnlSZXNwb25zZSA9IGF3YWl0IHNmbkNsaWVudC5zZW5kKG5ldyBHZXRFeGVjdXRpb25IaXN0b3J5Q29tbWFuZCh7XHJcbiAgICAgICAgICBleGVjdXRpb25Bcm46IHN0YXJ0UmVzcG9uc2UuZXhlY3V0aW9uQXJuLFxyXG4gICAgICAgICAgbWF4UmVzdWx0czogMTAsXHJcbiAgICAgICAgICByZXZlcnNlT3JkZXI6IHRydWVcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgcmVjZW50RXZlbnRzID0gaGlzdG9yeVJlc3BvbnNlLmV2ZW50cz8uc2xpY2UoMCwgMykgfHwgW107XHJcbiAgICAgICAgZm9yIChjb25zdCBldmVudCBvZiByZWNlbnRFdmVudHMpIHtcclxuICAgICAgICAgIGlmIChldmVudC50eXBlICYmIGV2ZW50LnRpbWVzdGFtcCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgICAg8J+TnSAke2V2ZW50LnR5cGV9IGF0ICR7ZXZlbnQudGltZXN0YW1wLnRvSVNPU3RyaW5nKCl9YCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChoaXN0b3J5RXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnICAg8J+TnSAoSGlzdG9yeSBkZXRhaWxzIHVuYXZhaWxhYmxlKScpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoc3RhdHVzID09PSAnU1VDQ0VFREVEJykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdcXG7wn46JIFdvcmtmbG93IGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4ogRmluYWwgT3V0cHV0OicsIEpTT04uc3RyaW5naWZ5KEpTT04ucGFyc2UoZGVzY3JpYmVSZXNwb25zZS5vdXRwdXQgfHwgJ3t9JyksIG51bGwsIDIpKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBHZXQgZnVsbCBleGVjdXRpb24gaGlzdG9yeSBmb3IgYW5hbHlzaXNcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgZnVsbEhpc3RvcnlSZXNwb25zZSA9IGF3YWl0IHNmbkNsaWVudC5zZW5kKG5ldyBHZXRFeGVjdXRpb25IaXN0b3J5Q29tbWFuZCh7XHJcbiAgICAgICAgICAgIGV4ZWN1dGlvbkFybjogc3RhcnRSZXNwb25zZS5leGVjdXRpb25Bcm4sXHJcbiAgICAgICAgICAgIG1heFJlc3VsdHM6IDEwMFxyXG4gICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnXFxu8J+TiyBFeGVjdXRpb24gU3VtbWFyeTonKTtcclxuICAgICAgICAgIGNvbnN0IGV2ZW50cyA9IGZ1bGxIaXN0b3J5UmVzcG9uc2UuZXZlbnRzIHx8IFtdO1xyXG4gICAgICAgICAgY29uc3QgdGFza0V2ZW50cyA9IGV2ZW50cy5maWx0ZXIoZSA9PiBlLnR5cGU/LmluY2x1ZGVzKCdUYXNrJykpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAg8J+UoiBUb3RhbCBFdmVudHM6ICR7ZXZlbnRzLmxlbmd0aH1gKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGAgICDimpnvuI8gVGFzayBFdmVudHM6ICR7dGFza0V2ZW50cy5sZW5ndGh9YCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFNob3cga2V5IG1pbGVzdG9uZXNcclxuICAgICAgICAgIGNvbnN0IG1pbGVzdG9uZXMgPSBldmVudHMuZmlsdGVyKGUgPT4gXHJcbiAgICAgICAgICAgIGUudHlwZSA9PT0gJ1Rhc2tTdGF0ZUVudGVyZWQnIHx8IFxyXG4gICAgICAgICAgICBlLnR5cGUgPT09ICdUYXNrU3VjY2VlZGVkJyB8fCBcclxuICAgICAgICAgICAgZS50eXBlID09PSAnVGFza0ZhaWxlZCdcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG7wn46vIEtleSBNaWxlc3RvbmVzOicpO1xyXG4gICAgICAgICAgZm9yIChjb25zdCBtaWxlc3RvbmUgb2YgbWlsZXN0b25lcy5zbGljZSgtMTApKSB7IC8vIExhc3QgMTAgbWlsZXN0b25lc1xyXG4gICAgICAgICAgICBjb25zdCBzdGF0ZU5hbWUgPSBtaWxlc3RvbmUuc3RhdGVFbnRlcmVkRXZlbnREZXRhaWxzPy5uYW1lIHx8IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlsZXN0b25lLnRhc2tTdWNjZWVkZWRFdmVudERldGFpbHM/LnJlc291cmNlVHlwZSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlsZXN0b25lLnRhc2tGYWlsZWRFdmVudERldGFpbHM/LnJlc291cmNlVHlwZSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1Vua25vd24nO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgICAg4pyFICR7bWlsZXN0b25lLnR5cGV9OiAke3N0YXRlTmFtZX1gKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgIH0gY2F0Y2ggKGhpc3RvcnlFcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgKERldGFpbGVkIGhpc3RvcnkgdW5hdmFpbGFibGUpJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PT0gJ0ZBSUxFRCcpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnXFxu4p2MIFdvcmtmbG93IGZhaWxlZCEnKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+SpSBFcnJvcjonLCBkZXNjcmliZVJlc3BvbnNlLmVycm9yKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+ThCBDYXVzZTonLCBkZXNjcmliZVJlc3BvbnNlLmNhdXNlKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09ICdUSU1FRF9PVVQnKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1xcbuKPsCBXb3JrZmxvdyB0aW1lZCBvdXQhJyk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKGF0dGVtcHRzID49IG1heEF0dGVtcHRzICYmIHN0YXR1cyA9PT0gJ1JVTk5JTkcnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdcXG7ij7AgTW9uaXRvcmluZyB0aW1lb3V0IHJlYWNoZWQuIFdvcmtmbG93IG1heSBzdGlsbCBiZSBydW5uaW5nLicpO1xyXG4gICAgICBjb25zb2xlLmxvZygn8J+UjSBDaGVjayBBV1MgQ29uc29sZSBmb3IgZXhlY3V0aW9uIHN0YXR1czonKTtcclxuICAgICAgY29uc29sZS5sb2coYCAgIGh0dHBzOi8vY29uc29sZS5hd3MuYW1hem9uLmNvbS9zdGF0ZXMvaG9tZT9yZWdpb249dXMtZWFzdC0xIy9leGVjdXRpb25zL2RldGFpbHMvJHtzdGFydFJlc3BvbnNlLmV4ZWN1dGlvbkFybn1gKTtcclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ/CfmqggVGVzdCBleGVjdXRpb24gZmFpbGVkOicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1biB0aGUgZGV0YWlsZWQgdGVzdFxyXG50ZXN0RGV0YWlsZWRFeGVjdXRpb24oKTsiXX0=