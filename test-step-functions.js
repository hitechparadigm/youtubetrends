"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_sfn_1 = require("@aws-sdk/client-sfn");
async function testStepFunctionsWorkflow() {
    console.log('🔄 Testing YouTube Automation Step Functions Workflow...');
    try {
        const sfnClient = new client_sfn_1.SFNClient({ region: 'us-east-1' });
        // Test input for the workflow
        const testInput = {
            topics: ['technology', 'investing'],
            region: 'US',
            maxResults: 10,
            hoursBack: 24
        };
        console.log('🚀 Starting Step Functions execution...');
        console.log('Input:', JSON.stringify(testInput, null, 2));
        const startResponse = await sfnClient.send(new client_sfn_1.StartExecutionCommand({
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
            const describeResponse = await sfnClient.send(new client_sfn_1.DescribeExecutionCommand({
                executionArn: startResponse.executionArn
            }));
            status = describeResponse.status || 'UNKNOWN';
            console.log(`⏳ Status check ${attempts}/${maxAttempts}: ${status}`);
            if (status === 'SUCCEEDED') {
                console.log('🎉 Workflow completed successfully!');
                console.log('📊 Output:', describeResponse.output);
                break;
            }
            else if (status === 'FAILED') {
                console.log('❌ Workflow failed!');
                console.log('💥 Error:', describeResponse.error);
                break;
            }
            else if (status === 'TIMED_OUT') {
                console.log('⏰ Workflow timed out!');
                break;
            }
        }
        if (attempts >= maxAttempts && status === 'RUNNING') {
            console.log('⏰ Monitoring timeout reached. Workflow may still be running.');
            console.log('🔍 Check AWS Console for execution status.');
        }
    }
    catch (error) {
        console.error('🚨 Test execution failed:', error);
    }
}
// Run the test
testStepFunctionsWorkflow();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1zdGVwLWZ1bmN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3Qtc3RlcC1mdW5jdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvREFBaUc7QUFFakcsS0FBSyxVQUFVLHlCQUF5QjtJQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7SUFFeEUsSUFBSTtRQUNGLE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRXpELDhCQUE4QjtRQUM5QixNQUFNLFNBQVMsR0FBRztZQUNoQixNQUFNLEVBQUUsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDO1lBQ25DLE1BQU0sRUFBRSxJQUFJO1lBQ1osVUFBVSxFQUFFLEVBQUU7WUFDZCxTQUFTLEVBQUUsRUFBRTtTQUNkLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksa0NBQXFCLENBQUM7WUFDbkUsZUFBZSxFQUFFLGdGQUFnRjtZQUNqRyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDaEMsSUFBSSxFQUFFLGtCQUFrQixJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7U0FDckMsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFL0QsMkJBQTJCO1FBQzNCLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUN2QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUMsK0JBQStCO1FBRXZELE9BQU8sTUFBTSxLQUFLLFNBQVMsSUFBSSxRQUFRLEdBQUcsV0FBVyxFQUFFO1lBQ3JELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0I7WUFDNUUsUUFBUSxFQUFFLENBQUM7WUFFWCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLHFDQUF3QixDQUFDO2dCQUN6RSxZQUFZLEVBQUUsYUFBYSxDQUFDLFlBQVk7YUFDekMsQ0FBQyxDQUFDLENBQUM7WUFFSixNQUFNLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQztZQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixRQUFRLElBQUksV0FBVyxLQUFLLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFcEUsSUFBSSxNQUFNLEtBQUssV0FBVyxFQUFFO2dCQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7Z0JBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNuRCxNQUFNO2FBQ1A7aUJBQU0sSUFBSSxNQUFNLEtBQUssUUFBUSxFQUFFO2dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNqRCxNQUFNO2FBQ1A7aUJBQU0sSUFBSSxNQUFNLEtBQUssV0FBVyxFQUFFO2dCQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3JDLE1BQU07YUFDUDtTQUNGO1FBRUQsSUFBSSxRQUFRLElBQUksV0FBVyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7WUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1lBQzVFLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztTQUMzRDtLQUVGO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ25EO0FBQ0gsQ0FBQztBQUVELGVBQWU7QUFDZix5QkFBeUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU0ZOQ2xpZW50LCBTdGFydEV4ZWN1dGlvbkNvbW1hbmQsIERlc2NyaWJlRXhlY3V0aW9uQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZm4nO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gdGVzdFN0ZXBGdW5jdGlvbnNXb3JrZmxvdygpIHtcclxuICBjb25zb2xlLmxvZygn8J+UhCBUZXN0aW5nIFlvdVR1YmUgQXV0b21hdGlvbiBTdGVwIEZ1bmN0aW9ucyBXb3JrZmxvdy4uLicpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzZm5DbGllbnQgPSBuZXcgU0ZOQ2xpZW50KHsgcmVnaW9uOiAndXMtZWFzdC0xJyB9KTtcclxuICAgIFxyXG4gICAgLy8gVGVzdCBpbnB1dCBmb3IgdGhlIHdvcmtmbG93XHJcbiAgICBjb25zdCB0ZXN0SW5wdXQgPSB7XHJcbiAgICAgIHRvcGljczogWyd0ZWNobm9sb2d5JywgJ2ludmVzdGluZyddLCAvLyBUZXN0IHdpdGggMiB0b3BpY3NcclxuICAgICAgcmVnaW9uOiAnVVMnLFxyXG4gICAgICBtYXhSZXN1bHRzOiAxMCxcclxuICAgICAgaG91cnNCYWNrOiAyNFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygn8J+agCBTdGFydGluZyBTdGVwIEZ1bmN0aW9ucyBleGVjdXRpb24uLi4nKTtcclxuICAgIGNvbnNvbGUubG9nKCdJbnB1dDonLCBKU09OLnN0cmluZ2lmeSh0ZXN0SW5wdXQsIG51bGwsIDIpKTtcclxuICAgIFxyXG4gICAgY29uc3Qgc3RhcnRSZXNwb25zZSA9IGF3YWl0IHNmbkNsaWVudC5zZW5kKG5ldyBTdGFydEV4ZWN1dGlvbkNvbW1hbmQoe1xyXG4gICAgICBzdGF0ZU1hY2hpbmVBcm46ICdhcm46YXdzOnN0YXRlczp1cy1lYXN0LTE6Nzg2NjczMzIzMTU5OnN0YXRlTWFjaGluZTp5b3V0dWJlLWF1dG9tYXRpb24td29ya2Zsb3cnLFxyXG4gICAgICBpbnB1dDogSlNPTi5zdHJpbmdpZnkodGVzdElucHV0KSxcclxuICAgICAgbmFtZTogYHRlc3QtZXhlY3V0aW9uLSR7RGF0ZS5ub3coKX1gXHJcbiAgICB9KSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ+KchSBFeGVjdXRpb24gc3RhcnRlZCBzdWNjZXNzZnVsbHkhJyk7XHJcbiAgICBjb25zb2xlLmxvZyhg8J+TiyBFeGVjdXRpb24gQVJOOiAke3N0YXJ0UmVzcG9uc2UuZXhlY3V0aW9uQXJufWApO1xyXG4gICAgXHJcbiAgICAvLyBNb25pdG9yIGV4ZWN1dGlvbiBzdGF0dXNcclxuICAgIGxldCBzdGF0dXMgPSAnUlVOTklORyc7XHJcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xyXG4gICAgY29uc3QgbWF4QXR0ZW1wdHMgPSAyMDsgLy8gTW9uaXRvciBmb3IgdXAgdG8gMTAgbWludXRlc1xyXG4gICAgXHJcbiAgICB3aGlsZSAoc3RhdHVzID09PSAnUlVOTklORycgJiYgYXR0ZW1wdHMgPCBtYXhBdHRlbXB0cykge1xyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMDApKTsgLy8gV2FpdCAzMCBzZWNvbmRzXHJcbiAgICAgIGF0dGVtcHRzKys7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBkZXNjcmliZVJlc3BvbnNlID0gYXdhaXQgc2ZuQ2xpZW50LnNlbmQobmV3IERlc2NyaWJlRXhlY3V0aW9uQ29tbWFuZCh7XHJcbiAgICAgICAgZXhlY3V0aW9uQXJuOiBzdGFydFJlc3BvbnNlLmV4ZWN1dGlvbkFyblxyXG4gICAgICB9KSk7XHJcbiAgICAgIFxyXG4gICAgICBzdGF0dXMgPSBkZXNjcmliZVJlc3BvbnNlLnN0YXR1cyB8fCAnVU5LTk9XTic7XHJcbiAgICAgIGNvbnNvbGUubG9nKGDij7MgU3RhdHVzIGNoZWNrICR7YXR0ZW1wdHN9LyR7bWF4QXR0ZW1wdHN9OiAke3N0YXR1c31gKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChzdGF0dXMgPT09ICdTVUNDRUVERUQnKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ/CfjokgV29ya2Zsb3cgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+TiiBPdXRwdXQ6JywgZGVzY3JpYmVSZXNwb25zZS5vdXRwdXQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PT0gJ0ZBSUxFRCcpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygn4p2MIFdvcmtmbG93IGZhaWxlZCEnKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+SpSBFcnJvcjonLCBkZXNjcmliZVJlc3BvbnNlLmVycm9yKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09ICdUSU1FRF9PVVQnKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+KPsCBXb3JrZmxvdyB0aW1lZCBvdXQhJyk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKGF0dGVtcHRzID49IG1heEF0dGVtcHRzICYmIHN0YXR1cyA9PT0gJ1JVTk5JTkcnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCfij7AgTW9uaXRvcmluZyB0aW1lb3V0IHJlYWNoZWQuIFdvcmtmbG93IG1heSBzdGlsbCBiZSBydW5uaW5nLicpO1xyXG4gICAgICBjb25zb2xlLmxvZygn8J+UjSBDaGVjayBBV1MgQ29uc29sZSBmb3IgZXhlY3V0aW9uIHN0YXR1cy4nKTtcclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ/CfmqggVGVzdCBleGVjdXRpb24gZmFpbGVkOicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1biB0aGUgdGVzdFxyXG50ZXN0U3RlcEZ1bmN0aW9uc1dvcmtmbG93KCk7Il19