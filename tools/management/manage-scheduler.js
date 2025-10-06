#!/usr/bin/env node

/**
 * Manage EventBridge Scheduler for YouTube Automation
 * Enable/disable schedules, check status, and modify timing
 */

async function manageScheduler() {
    console.log('🕒 YOUTUBE AUTOMATION SCHEDULER MANAGEMENT');
    console.log('='.repeat(50));
    console.log('⚡ Control automated video generation schedules');
    console.log('');

    const action = process.argv[2] || 'status';
    const scheduleName = process.argv[3];

    try {
        const {
            SchedulerClient,
            GetScheduleCommand,
            UpdateScheduleCommand,
            ListSchedulesCommand
        } = require('@aws-sdk/client-scheduler');

        const scheduler = new SchedulerClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });

        const scheduleNames = [
            'youtube-automation-trend-analysis-production',
            'youtube-automation-video-generation-production',
            'youtube-automation-performance-analysis-production'
        ];

        switch (action) {
            case 'status':
                await showScheduleStatus(scheduler, scheduleNames);
                break;

            case 'enable':
                await enableSchedule(scheduler, scheduleName || scheduleNames[1]);
                break;

            case 'disable':
                await disableSchedule(scheduler, scheduleName || scheduleNames[1]);
                break;

            case 'list':
                await listAllSchedules(scheduler);
                break;

            case 'test':
                await testScheduleExecution(scheduler, scheduleName || scheduleNames[1]);
                break;

            default:
                showUsage();
        }

    } catch (error) {
        console.error('❌ Scheduler management failed:', error.message);
        console.log('');
        console.log('🔧 Possible issues:');
        console.log('- AWS credentials not configured');
        console.log('- Scheduler not deployed yet');
        console.log('- Insufficient permissions');
        console.log('- Schedule name incorrect');
    }
}

async function showScheduleStatus(scheduler, scheduleNames) {
    console.log('📊 CURRENT SCHEDULE STATUS:');
    console.log('='.repeat(35));

    for (const name of scheduleNames) {
        try {
            const result = await scheduler.send(new GetScheduleCommand({
                Name: name
            }));

            const schedule = result;
            const isEnabled = schedule.State === 'ENABLED';
            const nextExecution = getNextExecution(schedule.ScheduleExpression, schedule.ScheduleExpressionTimezone);

            console.log(`📅 ${getScheduleDisplayName(name)}`);
            console.log(`   Status: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`   Schedule: ${schedule.ScheduleExpression}`);
            console.log(`   Timezone: ${schedule.ScheduleExpressionTimezone}`);
            console.log(`   Next Run: ${nextExecution}`);
            console.log(`   Description: ${schedule.Description}`);
            console.log('');

        } catch (error) {
            console.log(`❌ ${getScheduleDisplayName(name)}: Not found or error`);
            console.log(`   Error: ${error.message}`);
            console.log('');
        }
    }
}

async function enableSchedule(scheduler, scheduleName) {
    console.log(`🟢 ENABLING SCHEDULE: ${getScheduleDisplayName(scheduleName)}`);
    console.log('');

    try {
        // First get the current schedule
        const current = await scheduler.send(new GetScheduleCommand({
            Name: scheduleName
        }));

        // Update to enabled state
        await scheduler.send(new UpdateScheduleCommand({
            Name: scheduleName,
            State: 'ENABLED',
            ScheduleExpression: current.ScheduleExpression,
            ScheduleExpressionTimezone: current.ScheduleExpressionTimezone,
            Target: current.Target,
            FlexibleTimeWindow: current.FlexibleTimeWindow,
            Description: current.Description
        }));

        console.log('✅ Schedule enabled successfully!');
        console.log(`📅 Next execution: ${getNextExecution(current.ScheduleExpression, current.ScheduleExpressionTimezone)}`);

    } catch (error) {
        console.error('❌ Failed to enable schedule:', error.message);
    }
}

async function disableSchedule(scheduler, scheduleName) {
    console.log(`🔴 DISABLING SCHEDULE: ${getScheduleDisplayName(scheduleName)}`);
    console.log('');

    try {
        // First get the current schedule
        const current = await scheduler.send(new GetScheduleCommand({
            Name: scheduleName
        }));

        // Update to disabled state
        await scheduler.send(new UpdateScheduleCommand({
            Name: scheduleName,
            State: 'DISABLED',
            ScheduleExpression: current.ScheduleExpression,
            ScheduleExpressionTimezone: current.ScheduleExpressionTimezone,
            Target: current.Target,
            FlexibleTimeWindow: current.FlexibleTimeWindow,
            Description: current.Description
        }));

        console.log('✅ Schedule disabled successfully!');
        console.log('⚠️  Automated video generation is now paused');

    } catch (error) {
        console.error('❌ Failed to disable schedule:', error.message);
    }
}

async function listAllSchedules(scheduler) {
    console.log('📋 ALL YOUTUBE AUTOMATION SCHEDULES:');
    console.log('='.repeat(40));

    try {
        const result = await scheduler.send(new ListSchedulesCommand({
            NamePrefix: 'youtube-automation'
        }));

        if (result.Schedules && result.Schedules.length > 0) {
            result.Schedules.forEach(schedule => {
                console.log(`📅 ${schedule.Name}`);
                console.log(`   State: ${schedule.State === 'ENABLED' ? '✅ ENABLED' : '❌ DISABLED'}`);
                console.log(`   Schedule: ${schedule.ScheduleExpression}`);
                console.log(`   Target: ${schedule.Target?.Arn?.split(':').pop()}`);
                console.log('');
            });
        } else {
            console.log('❌ No YouTube automation schedules found');
            console.log('💡 Run deploy-scheduler.js to create schedules');
        }

    } catch (error) {
        console.error('❌ Failed to list schedules:', error.message);
    }
}

async function testScheduleExecution(scheduler, scheduleName) {
    console.log(`🧪 TESTING SCHEDULE EXECUTION: ${getScheduleDisplayName(scheduleName)}`);
    console.log('');
    console.log('⚠️  Note: This would trigger the actual Step Function workflow');
    console.log('💡 For testing, use the Step Function console to execute manually');
    console.log('');

    try {
        const schedule = await scheduler.send(new GetScheduleCommand({
            Name: scheduleName
        }));

        console.log('📋 Schedule Configuration:');
        console.log(`   Target: ${schedule.Target?.Arn}`);
        console.log(`   Input: ${schedule.Target?.Input}`);
        console.log(`   Retry Policy: ${schedule.Target?.RetryPolicy?.MaximumRetryAttempts} attempts`);
        console.log('');
        console.log('🔗 To test manually:');
        console.log('1. Go to AWS Console > Step Functions');
        console.log('2. Find: youtube-automation-workflow');
        console.log('3. Click "Start execution"');
        console.log(`4. Use input: ${schedule.Target?.Input}`);

    } catch (error) {
        console.error('❌ Failed to get schedule details:', error.message);
    }
}

function getScheduleDisplayName(scheduleName) {
    const nameMap = {
        'youtube-automation-trend-analysis-production': 'Daily Trend Analysis (8 AM EST)',
        'youtube-automation-video-generation-production': 'Daily Video Generation (2 AM EST)',
        'youtube-automation-performance-analysis-production': 'Weekly Performance Analysis (Sun 10 AM EST)'
    };

    return nameMap[scheduleName] || scheduleName;
}

function getNextExecution(cronExpression, timezone) {
    // Simple next execution calculation (would need proper cron parser for accuracy)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (cronExpression.includes('0 2 * * ? *')) {
        tomorrow.setHours(2, 0, 0, 0);
        return tomorrow.toLocaleString('en-US', { timeZone: timezone || 'America/New_York' });
    } else if (cronExpression.includes('0 8 * * ? *')) {
        tomorrow.setHours(8, 0, 0, 0);
        return tomorrow.toLocaleString('en-US', { timeZone: timezone || 'America/New_York' });
    } else if (cronExpression.includes('0 10 ? * SUN *')) {
        const nextSunday = new Date(now);
        nextSunday.setDate(now.getDate() + (7 - now.getDay()));
        nextSunday.setHours(10, 0, 0, 0);
        return nextSunday.toLocaleString('en-US', { timeZone: timezone || 'America/New_York' });
    }

    return 'Next execution time calculation needed';
}

function showUsage() {
    console.log('📖 USAGE:');
    console.log('');
    console.log('node manage-scheduler.js <action> [schedule-name]');
    console.log('');
    console.log('ACTIONS:');
    console.log('  status    - Show status of all schedules (default)');
    console.log('  enable    - Enable a schedule');
    console.log('  disable   - Disable a schedule');
    console.log('  list      - List all YouTube automation schedules');
    console.log('  test      - Show test execution details');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  node manage-scheduler.js status');
    console.log('  node manage-scheduler.js enable youtube-automation-video-generation-production');
    console.log('  node manage-scheduler.js disable');
    console.log('  node manage-scheduler.js list');
}

// Set environment
process.env.AWS_REGION = 'us-east-1';

console.log('🕒 YouTube Automation Platform - Scheduler Management');
console.log('⚡ Control your automated video generation schedules');
console.log('');

manageScheduler();