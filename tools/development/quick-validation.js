#!/usr/bin/env node

const { execSync } = require('child_process');

class QuickValidator {
    constructor() {
        this.results = [];
    }

    async quickCheck() {
        console.log('🚀 YouTube Automation Platform - Quick Validation\n');

        // 1. Check AWS connection (fast)
        this.checkAWS();
        
        // 2. Check existing infrastructure (fast)
        this.checkInfrastructure();
        
        // 3. Check Lambda functions (fast)
        this.checkLambdaFunctions();
        
        // 4. Check project files (instant)
        this.checkProjectFiles();
        
        // 5. Display results
        this.displayResults();
    }

    checkAWS() {
        console.log('🔍 Checking AWS connection...');
        try {
            const identity = JSON.parse(execSync('aws sts get-caller-identity', { encoding: 'utf8', timeout: 5000 }));
            console.log(`✅ AWS Account: ${identity.Account}`);
            this.results.push({ test: 'AWS Connection', status: 'PASS' });
        } catch (error) {
            console.log('❌ AWS connection failed');
            this.results.push({ test: 'AWS Connection', status: 'FAIL' });
        }
    }

    checkInfrastructure() {
        console.log('\n🏗️ Checking existing infrastructure...');
        
        // Check CloudFormation stacks
        try {
            const stacks = execSync('aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[?contains(StackName, \'youtube\')].StackName" --output text', { encoding: 'utf8', timeout: 10000 });
            if (stacks.trim()) {
                console.log(`✅ Found stacks: ${stacks.trim()}`);
                this.results.push({ test: 'CloudFormation Stacks', status: 'PASS' });
            } else {
                console.log('⚠️ No YouTube stacks found');
                this.results.push({ test: 'CloudFormation Stacks', status: 'PARTIAL' });
            }
        } catch (error) {
            console.log('❌ Stack check failed');
            this.results.push({ test: 'CloudFormation Stacks', status: 'FAIL' });
        }

        // Check S3 buckets
        try {
            const buckets = execSync('aws s3 ls | grep youtube-automation', { encoding: 'utf8', timeout: 5000 });
            if (buckets.trim()) {
                console.log(`✅ Found S3 buckets`);
                this.results.push({ test: 'S3 Buckets', status: 'PASS' });
            } else {
                console.log('⚠️ No YouTube S3 buckets found');
                this.results.push({ test: 'S3 Buckets', status: 'PARTIAL' });
            }
        } catch (error) {
            console.log('❌ S3 check failed');
            this.results.push({ test: 'S3 Buckets', status: 'FAIL' });
        }
    }

    checkLambdaFunctions() {
        console.log('\n⚡ Checking Lambda functions...');
        
        const expectedFunctions = [
            'youtube-automation-video-generator',
            'youtube-automation-trend-detector',
            'youtube-automation-youtube-uploader'
        ];

        let foundFunctions = 0;
        
        for (const func of expectedFunctions) {
            try {
                execSync(`aws lambda get-function --function-name ${func}`, { stdio: 'pipe', timeout: 3000 });
                console.log(`✅ ${func} exists`);
                foundFunctions++;
            } catch (error) {
                console.log(`❌ ${func} not found`);
            }
        }

        if (foundFunctions === expectedFunctions.length) {
            this.results.push({ test: 'Lambda Functions', status: 'PASS' });
        } else if (foundFunctions > 0) {
            this.results.push({ test: 'Lambda Functions', status: 'PARTIAL' });
        } else {
            this.results.push({ test: 'Lambda Functions', status: 'FAIL' });
        }
    }

    checkProjectFiles() {
        console.log('\n📁 Checking project files...');
        
        const fs = require('fs');
        const requiredFiles = [
            'package.json',
            'lambda/optimized-video-generator/index.ts',
            'lambda/video-processor/index.ts',
            'lambda/youtube-uploader/index.js',
            '.kiro/specs/youtube-automation-platform/requirements.md'
        ];

        let foundFiles = 0;
        
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                console.log(`✅ ${file}`);
                foundFiles++;
            } else {
                console.log(`❌ ${file} missing`);
            }
        }

        if (foundFiles === requiredFiles.length) {
            this.results.push({ test: 'Project Files', status: 'PASS' });
        } else if (foundFiles > 0) {
            this.results.push({ test: 'Project Files', status: 'PARTIAL' });
        } else {
            this.results.push({ test: 'Project Files', status: 'FAIL' });
        }
    }

    displayResults() {
        console.log('\n🎯 QUICK VALIDATION RESULTS');
        console.log('=' .repeat(40));
        
        let passed = 0;
        let partial = 0;
        let failed = 0;
        
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
            console.log(`${icon} ${result.test}: ${result.status}`);
            
            if (result.status === 'PASS') passed++;
            else if (result.status === 'PARTIAL') partial++;
            else failed++;
        });
        
        console.log('\n📊 Summary:');
        console.log(`   Passed: ${passed}`);
        console.log(`   Partial: ${partial}`);
        console.log(`   Failed: ${failed}`);
        
        if (failed === 0 && partial === 0) {
            console.log('\n🎉 System is ready for testing!');
            console.log('\n🚀 Next steps:');
            console.log('   1. Run: node test-optimized-video-generation.js');
            console.log('   2. Run: node verify-scheduler.js');
            console.log('   3. Run: node test-complete-pipeline-with-audio-subtitles.js');
        } else if (failed === 0) {
            console.log('\n⚠️ System is partially ready - some components missing');
            console.log('\n🔧 Recommended actions:');
            console.log('   1. Deploy missing infrastructure: node deploy-production-ready.js');
            console.log('   2. Test existing components: node test-optimized-video-generation.js');
        } else {
            console.log('\n❌ System needs setup');
            console.log('\n🔧 Required actions:');
            console.log('   1. Configure AWS credentials: aws configure');
            console.log('   2. Deploy infrastructure: node deploy-production-ready.js');
        }
    }
}

// Run validation
const validator = new QuickValidator();
validator.quickCheck().catch(console.error);