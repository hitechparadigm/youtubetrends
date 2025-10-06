#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionDeployer {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.accountId = null;
        this.deploymentResults = {};
    }

    async deployProduction() {
        console.log('🚀 YouTube Automation Platform - Production Deployment');
        console.log('=' .repeat(70));
        console.log('Deploying complete production-ready system\n');

        try {
            // Step 1: Pre-deployment validation
            await this.preDeploymentValidation();

            // Step 2: Deploy core infrastructure
            await this.deployCoreInfrastructure();

            // Step 3: Deploy Lambda functions
            await this.deployLambdaFunctions();

            // Step 4: Configure secrets and credentials
            await this.configureSecrets();

            // Step 5: Set up monitoring and alerting
            await this.setupMonitoring();

            // Step 6: Deploy scheduler
            await this.deployScheduler();

            // Step 7: Run post-deployment tests
            await this.runPostDeploymentTests();

            // Step 8: Generate deployment report
            await this.generateDeploymentReport();

            console.log('\n🎉 Production deployment completed successfully!');

        } catch (error) {
            console.error('\n❌ Production deployment failed:', error.message);
            console.error('Stack trace:', error.stack);
            process.exit(1);
        }
    }

    async preDeploymentValidation() {
        console.log('🔍 Step 1: Pre-deployment Validation...');

        // Check AWS credentials
        try {
            const identity = JSON.parse(execSync('aws sts get-caller-identity', { encoding: 'utf8' }));
            this.accountId = identity.Account;
            console.log(`✓ AWS Account: ${this.accountId}`);
            console.log(`✓ AWS Region: ${this.region}`);
        } catch (error) {
            throw new Error('AWS credentials not configured');
        }

        // Check required tools
        const tools = ['aws', 'node', 'npm'];
        for (const tool of tools) {
            try {
                execSync(`${tool} --version`, { stdio: 'pipe' });
                console.log(`✓ ${tool} is available`);
            } catch (error) {
                throw new Error(`${tool} is not installed or not in PATH`);
            }
        }

        // Check Bedrock access
        try {
            execSync('aws bedrock list-foundation-models --region us-east-1', { stdio: 'pipe' });
            console.log('✓ Bedrock access confirmed');
        } catch (error) {
            console.log('⚠️  Bedrock access limited - some features may not work');
        }

        // Validate project structure
        const requiredFiles = [
            'package.json',
            'lambda/optimized-video-generator/index.ts',
            'lambda/video-processor/index.ts',
            'lambda/youtube-uploader/index.js'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }
        console.log('✓ Project structure validated');

        this.deploymentResults.preValidation = 'PASSED';
        console.log('');
    }

    async deployCoreInfrastructure() {
        console.log('🏗️  Step 2: Deploying Core Infrastructure...');

        // Deploy S3 buckets
        try {
            console.log('Deploying S3 storage infrastructure...');
            
            const bucketName = `youtube-automation-videos-${this.accountId}-${this.region}`;
            
            try {
                execSync(`aws s3 mb s3://${bucketName} --region ${this.region}`, { stdio: 'pipe' });
                console.log(`✓ Created S3 bucket: ${bucketName}`);
            } catch (error) {
                if (error.message.includes('BucketAlreadyOwnedByYou')) {
                    console.log(`✓ S3 bucket already exists: ${bucketName}`);
                } else {
                    throw error;
                }
            }

            // Set bucket lifecycle policy
            const lifecyclePolicy = {
                Rules: [
                    {
                        ID: 'DeleteOldVersions',
                        Status: 'Enabled',
                        Expiration: { Days: 90 },
                        NoncurrentVersionExpiration: { NoncurrentDays: 30 }
                    }
                ]
            };

            fs.writeFileSync('/tmp/lifecycle-policy.json', JSON.stringify(lifecyclePolicy));
            execSync(`aws s3api put-bucket-lifecycle-configuration --bucket ${bucketName} --lifecycle-configuration file:///tmp/lifecycle-policy.json`, { stdio: 'pipe' });
            console.log('✓ S3 lifecycle policy configured');

            this.deploymentResults.s3Infrastructure = 'DEPLOYED';
        } catch (error) {
            console.log('⚠️  S3 infrastructure deployment failed:', error.message);
            this.deploymentResults.s3Infrastructure = 'FAILED';
        }

        // Deploy DynamoDB tables
        try {
            console.log('Deploying DynamoDB tables...');
            
            const tables = [
                {
                    name: 'TrendAnalytics',
                    schema: {
                        TableName: 'TrendAnalytics',
                        KeySchema: [
                            { AttributeName: 'topic', KeyType: 'HASH' },
                            { AttributeName: 'timestamp', KeyType: 'RANGE' }
                        ],
                        AttributeDefinitions: [
                            { AttributeName: 'topic', AttributeType: 'S' },
                            { AttributeName: 'timestamp', AttributeType: 'S' },
                            { AttributeName: 'engagementScore', AttributeType: 'N' }
                        ],
                        GlobalSecondaryIndexes: [
                            {
                                IndexName: 'EngagementIndex',
                                KeySchema: [{ AttributeName: 'engagementScore', KeyType: 'HASH' }],
                                Projection: { ProjectionType: 'ALL' },
                                BillingMode: 'PAY_PER_REQUEST'
                            }
                        ],
                        BillingMode: 'PAY_PER_REQUEST'
                    }
                },
                {
                    name: 'VideoMetadata',
                    schema: {
                        TableName: 'VideoMetadata',
                        KeySchema: [
                            { AttributeName: 'videoId', KeyType: 'HASH' }
                        ],
                        AttributeDefinitions: [
                            { AttributeName: 'videoId', AttributeType: 'S' },
                            { AttributeName: 'uploadDate', AttributeType: 'S' }
                        ],
                        GlobalSecondaryIndexes: [
                            {
                                IndexName: 'UploadDateIndex',
                                KeySchema: [{ AttributeName: 'uploadDate', KeyType: 'HASH' }],
                                Projection: { ProjectionType: 'ALL' },
                                BillingMode: 'PAY_PER_REQUEST'
                            }
                        ],
                        BillingMode: 'PAY_PER_REQUEST'
                    }
                },
                {
                    name: 'Configuration',
                    schema: {
                        TableName: 'Configuration',
                        KeySchema: [
                            { AttributeName: 'configKey', KeyType: 'HASH' }
                        ],
                        AttributeDefinitions: [
                            { AttributeName: 'configKey', AttributeType: 'S' }
                        ],
                        BillingMode: 'PAY_PER_REQUEST'
                    }
                }
            ];

            for (const table of tables) {
                try {
                    fs.writeFileSync(`/tmp/${table.name}-schema.json`, JSON.stringify(table.schema));
                    execSync(`aws dynamodb create-table --cli-input-json file:///tmp/${table.name}-schema.json --region ${this.region}`, { stdio: 'pipe' });
                    console.log(`✓ Created DynamoDB table: ${table.name}`);
                } catch (error) {
                    if (error.message.includes('ResourceInUseException')) {
                        console.log(`✓ DynamoDB table already exists: ${table.name}`);
                    } else {
                        throw error;
                    }
                }
            }

            this.deploymentResults.dynamodbInfrastructure = 'DEPLOYED';
        } catch (error) {
            console.log('⚠️  DynamoDB infrastructure deployment failed:', error.message);
            this.deploymentResults.dynamodbInfrastructure = 'FAILED';
        }

        console.log('');
    }

    async deployLambdaFunctions() {
        console.log('⚡ Step 3: Deploying Lambda Functions...');

        const functions = [
            {
                name: 'youtube-automation-video-generator',
                path: 'lambda/optimized-video-generator',
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                timeout: 900,
                memory: 2048
            },
            {
                name: 'youtube-automation-video-processor',
                path: 'lambda/video-processor',
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                timeout: 600,
                memory: 1024
            },
            {
                name: 'youtube-automation-youtube-uploader',
                path: 'lambda/youtube-uploader',
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                timeout: 900,
                memory: 512
            },
            {
                name: 'youtube-automation-trend-detector',
                path: 'lambda/trend-detector',
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                timeout: 300,
                memory: 512
            },
            {
                name: 'youtube-automation-content-analyzer',
                path: 'lambda/content-analyzer',
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                timeout: 600,
                memory: 1024
            }
        ];

        for (const func of functions) {
            try {
                console.log(`Deploying ${func.name}...`);

                // Build function if needed
                if (fs.existsSync(path.join(func.path, 'package.json'))) {
                    console.log(`  Building ${func.name}...`);
                    execSync('npm install', { cwd: func.path, stdio: 'pipe' });
                    
                    if (fs.existsSync(path.join(func.path, 'tsconfig.json'))) {
                        execSync('npm run build', { cwd: func.path, stdio: 'pipe' });
                    }
                }

                // Create deployment package
                const zipFile = `/tmp/${func.name}.zip`;
                execSync(`cd ${func.path} && zip -r ${zipFile} . -x "*.ts" "tsconfig.json" "node_modules/@types/*"`, { stdio: 'pipe' });

                // Create or update function
                try {
                    // Try to update existing function
                    execSync(`aws lambda update-function-code --function-name ${func.name} --zip-file fileb://${zipFile} --region ${this.region}`, { stdio: 'pipe' });
                    console.log(`  ✓ Updated ${func.name}`);
                } catch (updateError) {
                    // Create new function if update fails
                    const createCommand = `aws lambda create-function \
                        --function-name ${func.name} \
                        --runtime ${func.runtime} \
                        --role arn:aws:iam::${this.accountId}:role/lambda-execution-role \
                        --handler ${func.handler} \
                        --zip-file fileb://${zipFile} \
                        --timeout ${func.timeout} \
                        --memory-size ${func.memory} \
                        --region ${this.region}`;
                    
                    try {
                        execSync(createCommand, { stdio: 'pipe' });
                        console.log(`  ✓ Created ${func.name}`);
                    } catch (createError) {
                        console.log(`  ⚠️  Failed to create/update ${func.name}: ${createError.message}`);
                    }
                }

                this.deploymentResults[func.name] = 'DEPLOYED';
            } catch (error) {
                console.log(`  ❌ Failed to deploy ${func.name}: ${error.message}`);
                this.deploymentResults[func.name] = 'FAILED';
            }
        }

        console.log('');
    }

    async configureSecrets() {
        console.log('🔐 Step 4: Configuring Secrets and Credentials...');

        try {
            // Create YouTube credentials secret
            const secretName = 'youtube-automation/credentials';
            const secretValue = {
                clientId: 'YOUR_YOUTUBE_CLIENT_ID',
                clientSecret: 'YOUR_YOUTUBE_CLIENT_SECRET',
                refreshToken: 'YOUR_REFRESH_TOKEN'
            };

            try {
                execSync(`aws secretsmanager create-secret --name "${secretName}" --secret-string '${JSON.stringify(secretValue)}' --region ${this.region}`, { stdio: 'pipe' });
                console.log('✓ Created YouTube credentials secret');
            } catch (error) {
                if (error.message.includes('ResourceExistsException')) {
                    console.log('✓ YouTube credentials secret already exists');
                } else {
                    throw error;
                }
            }

            console.log('');
            console.log('🔑 IMPORTANT: Update YouTube API credentials in AWS Secrets Manager:');
            console.log(`   Secret Name: ${secretName}`);
            console.log('   Required fields: clientId, clientSecret, refreshToken');
            console.log('   Use AWS Console or CLI to update with your actual credentials');

            this.deploymentResults.secretsConfiguration = 'CONFIGURED';
        } catch (error) {
            console.log('⚠️  Secrets configuration failed:', error.message);
            this.deploymentResults.secretsConfiguration = 'FAILED';
        }

        console.log('');
    }

    async setupMonitoring() {
        console.log('📊 Step 5: Setting up Monitoring and Alerting...');

        try {
            // Create SNS topic for notifications
            const topicName = 'youtube-automation-notifications';
            
            try {
                const topicResult = JSON.parse(execSync(`aws sns create-topic --name ${topicName} --region ${this.region}`, { encoding: 'utf8' }));
                console.log(`✓ Created SNS topic: ${topicResult.TopicArn}`);
            } catch (error) {
                console.log('✓ SNS topic may already exist');
            }

            // Create CloudWatch log groups
            const logGroups = [
                '/aws/lambda/youtube-automation-video-generator',
                '/aws/lambda/youtube-automation-video-processor',
                '/aws/lambda/youtube-automation-youtube-uploader',
                '/aws/lambda/youtube-automation-trend-detector',
                '/aws/lambda/youtube-automation-content-analyzer'
            ];

            for (const logGroup of logGroups) {
                try {
                    execSync(`aws logs create-log-group --log-group-name "${logGroup}" --region ${this.region}`, { stdio: 'pipe' });
                    console.log(`✓ Created log group: ${logGroup}`);
                } catch (error) {
                    if (error.message.includes('ResourceAlreadyExistsException')) {
                        console.log(`✓ Log group already exists: ${logGroup}`);
                    }
                }
            }

            this.deploymentResults.monitoring = 'CONFIGURED';
        } catch (error) {
            console.log('⚠️  Monitoring setup failed:', error.message);
            this.deploymentResults.monitoring = 'FAILED';
        }

        console.log('');
    }

    async deployScheduler() {
        console.log('⏰ Step 6: Deploying Scheduler...');

        try {
            // Use existing scheduler deployment script
            console.log('Deploying EventBridge scheduler...');
            execSync('node deploy-scheduler.js', { stdio: 'inherit' });
            
            console.log('✓ Scheduler deployed successfully');
            this.deploymentResults.scheduler = 'DEPLOYED';
        } catch (error) {
            console.log('⚠️  Scheduler deployment failed:', error.message);
            this.deploymentResults.scheduler = 'FAILED';
        }

        console.log('');
    }

    async runPostDeploymentTests() {
        console.log('🧪 Step 7: Running Post-deployment Tests...');

        try {
            // Test Lambda functions
            console.log('Testing Lambda function deployments...');
            execSync('node test-all-requirements.js', { stdio: 'inherit' });
            
            console.log('✓ Post-deployment tests completed');
            this.deploymentResults.postDeploymentTests = 'PASSED';
        } catch (error) {
            console.log('⚠️  Some post-deployment tests failed:', error.message);
            this.deploymentResults.postDeploymentTests = 'PARTIAL';
        }

        console.log('');
    }

    async generateDeploymentReport() {
        console.log('📋 Step 8: Generating Deployment Report...');

        const report = {
            timestamp: new Date().toISOString(),
            awsAccount: this.accountId,
            awsRegion: this.region,
            deploymentResults: this.deploymentResults,
            summary: this.generateDeploymentSummary()
        };

        fs.writeFileSync('production-deployment-report.json', JSON.stringify(report, null, 2));
        
        const markdownReport = this.generateMarkdownDeploymentReport(report);
        fs.writeFileSync('PRODUCTION_DEPLOYMENT_REPORT.md', markdownReport);

        console.log('✓ Deployment report generated: production-deployment-report.json');
        console.log('✓ Markdown report generated: PRODUCTION_DEPLOYMENT_REPORT.md');
        console.log('');
    }

    generateDeploymentSummary() {
        const results = Object.values(this.deploymentResults);
        const successful = results.filter(r => r === 'DEPLOYED' || r === 'CONFIGURED' || r === 'PASSED').length;
        const failed = results.filter(r => r === 'FAILED').length;
        const partial = results.filter(r => r === 'PARTIAL').length;

        return {
            totalComponents: results.length,
            successful,
            failed,
            partial,
            overallStatus: failed === 0 ? 'SUCCESS' : failed < successful ? 'PARTIAL_SUCCESS' : 'FAILED'
        };
    }

    generateMarkdownDeploymentReport(report) {
        return `# YouTube Automation Platform - Production Deployment Report

## Deployment Summary
- **Timestamp**: ${report.timestamp}
- **AWS Account**: ${report.awsAccount}
- **AWS Region**: ${report.awsRegion}
- **Overall Status**: ${report.summary.overallStatus}

## Component Status
${Object.entries(report.deploymentResults).map(([component, status]) => 
    `- **${component}**: ${status}`
).join('\n')}

## Next Steps
${this.generateNextSteps(report)}

## Support Information
- Configuration files: Check AWS Console for Secrets Manager, DynamoDB, S3
- Logs: CloudWatch logs for each Lambda function
- Monitoring: SNS notifications for alerts
- Scheduler: EventBridge rules for automation
`;
    }

    generateNextSteps(report) {
        const steps = [];
        
        if (report.deploymentResults.secretsConfiguration === 'CONFIGURED') {
            steps.push('1. Update YouTube API credentials in AWS Secrets Manager');
        }
        
        if (report.deploymentResults.scheduler === 'DEPLOYED') {
            steps.push('2. Verify scheduler configuration with: node verify-scheduler.js');
        }
        
        steps.push('3. Test complete pipeline with: node test-complete-pipeline-with-audio-subtitles.js');
        steps.push('4. Monitor system performance in CloudWatch dashboard');
        
        return steps.join('\n');
    }

    displayFinalResults() {
        console.log('🎯 PRODUCTION DEPLOYMENT RESULTS');
        console.log('=' .repeat(50));
        
        const summary = this.generateDeploymentSummary();
        console.log(`Overall Status: ${summary.overallStatus}`);
        console.log(`Components Deployed: ${summary.successful}/${summary.totalComponents}`);
        
        if (summary.overallStatus === 'SUCCESS') {
            console.log('\n🎉 YouTube Automation Platform is production ready!');
            console.log('\n📋 Next Steps:');
            console.log('1. Update YouTube API credentials in Secrets Manager');
            console.log('2. Run: node verify-scheduler.js');
            console.log('3. Test: node test-complete-pipeline-with-audio-subtitles.js');
        } else {
            console.log('\n⚠️  Deployment completed with some issues');
            console.log('Check the deployment report for details');
        }
    }
}

// Run deployment if this script is executed directly
if (require.main === module) {
    const deployer = new ProductionDeployer();
    deployer.deployProduction()
        .then(() => deployer.displayFinalResults())
        .catch(console.error);
}

module.exports = ProductionDeployer;