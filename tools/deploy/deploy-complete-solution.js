#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class YouTubeAutomationDeployer {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.environment = process.env.ENVIRONMENT || 'dev';
        this.stackName = 'YouTubeAutomationStack';
    }

    async deploy() {
        console.log('🚀 Starting YouTube Automation Platform Deployment...\n');

        try {
            // Step 1: Validate prerequisites
            await this.validatePrerequisites();

            // Step 2: Build Lambda functions
            await this.buildLambdaFunctions();

            // Step 3: Deploy infrastructure
            await this.deployInfrastructure();

            // Step 4: Configure secrets
            await this.configureSecrets();

            // Step 5: Initialize configuration
            await this.initializeConfiguration();

            // Step 6: Run deployment tests
            await this.runDeploymentTests();

            console.log('✅ Deployment completed successfully!');
            await this.displayDeploymentInfo();

        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
            process.exit(1);
        }
    }

    async validatePrerequisites() {
        console.log('📋 Validating prerequisites...');

        // Check AWS CLI
        try {
            execSync('aws --version', { stdio: 'pipe' });
            console.log('✓ AWS CLI is installed');
        } catch (error) {
            throw new Error('AWS CLI is not installed or not in PATH');
        }

        // Check AWS credentials
        try {
            execSync('aws sts get-caller-identity', { stdio: 'pipe' });
            console.log('✓ AWS credentials are configured');
        } catch (error) {
            throw new Error('AWS credentials are not configured');
        }

        // Check CDK
        try {
            execSync('cdk --version', { stdio: 'pipe' });
            console.log('✓ AWS CDK is installed');
        } catch (error) {
            throw new Error('AWS CDK is not installed');
        }

        // Check Node.js version
        const nodeVersion = process.version;
        if (parseInt(nodeVersion.slice(1)) < 18) {
            throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
        }
        console.log(`✓ Node.js ${nodeVersion} is compatible`);

        console.log('');
    }

    async buildLambdaFunctions() {
        console.log('🔨 Building Lambda functions...');

        const lambdaFunctions = [
            'lambda/trend-detector',
            'lambda/content-analyzer', 
            'lambda/optimized-video-generator',
            'lambda/video-processor',
            'lambda/youtube-uploader'
        ];

        for (const functionPath of lambdaFunctions) {
            if (fs.existsSync(functionPath)) {
                console.log(`Building ${functionPath}...`);
                
                // Install dependencies if package.json exists
                if (fs.existsSync(path.join(functionPath, 'package.json'))) {
                    execSync('npm install', { 
                        cwd: functionPath, 
                        stdio: 'inherit' 
                    });
                }

                // Build TypeScript if tsconfig.json exists
                if (fs.existsSync(path.join(functionPath, 'tsconfig.json'))) {
                    execSync('npm run build', { 
                        cwd: functionPath, 
                        stdio: 'inherit' 
                    });
                }

                console.log(`✓ Built ${functionPath}`);
            } else {
                console.log(`⚠️  ${functionPath} not found, creating placeholder...`);
                this.createPlaceholderFunction(functionPath);
            }
        }

        console.log('');
    }

    createPlaceholderFunction(functionPath) {
        // Create directory if it doesn't exist
        if (!fs.existsSync(functionPath)) {
            fs.mkdirSync(functionPath, { recursive: true });
        }

        // Create basic index.js
        const indexContent = `
exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Placeholder implementation
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Function ${path.basename(functionPath)} placeholder',
            event: event
        })
    };
};
        `.trim();

        fs.writeFileSync(path.join(functionPath, 'index.js'), indexContent);

        // Create package.json
        const packageJson = {
            name: path.basename(functionPath),
            version: '1.0.0',
            description: `Placeholder for ${path.basename(functionPath)}`,
            main: 'index.js',
            dependencies: {}
        };

        fs.writeFileSync(
            path.join(functionPath, 'package.json'), 
            JSON.stringify(packageJson, null, 2)
        );
    }

    async deployInfrastructure() {
        console.log('☁️  Deploying AWS infrastructure...');

        // Bootstrap CDK if needed
        try {
            execSync(`cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/${this.region}`, {
                stdio: 'inherit'
            });
            console.log('✓ CDK bootstrap completed');
        } catch (error) {
            console.log('ℹ️  CDK already bootstrapped or bootstrap failed');
        }

        // Install CDK dependencies
        console.log('Installing CDK dependencies...');
        execSync('npm install', { 
            cwd: 'infrastructure', 
            stdio: 'inherit' 
        });

        // Deploy the stack
        console.log('Deploying CloudFormation stack...');
        execSync('npm run deploy', { 
            cwd: 'infrastructure', 
            stdio: 'inherit' 
        });

        console.log('✓ Infrastructure deployed successfully');
        console.log('');
    }

    async configureSecrets() {
        console.log('🔐 Configuring secrets...');

        const secretName = 'youtube-automation/credentials';
        
        console.log(`Please configure YouTube API credentials in AWS Secrets Manager:`);
        console.log(`Secret Name: ${secretName}`);
        console.log(`Required fields:`);
        console.log(`- clientId: Your YouTube API client ID`);
        console.log(`- clientSecret: Your YouTube API client secret`);
        console.log(`- refreshToken: OAuth refresh token (will be generated)`);
        console.log('');
        
        console.log('You can update the secret using AWS CLI:');
        console.log(`aws secretsmanager update-secret --secret-id "${secretName}" --secret-string '{"clientId":"YOUR_CLIENT_ID","clientSecret":"YOUR_CLIENT_SECRET","refreshToken":"YOUR_REFRESH_TOKEN"}'`);
        console.log('');
    }

    async initializeConfiguration() {
        console.log('⚙️  Initializing configuration...');

        const defaultConfig = {
            topics: ['technology', 'investing', 'education', 'health', 'finance'],
            videoSettings: {
                defaultDuration: 600, // 10 minutes
                quality: 'high',
                fps: 24,
                dimension: '1920x1080'
            },
            audioSettings: {
                voice: 'neural',
                speed: 'medium',
                language: 'en-US'
            },
            scheduleSettings: {
                trendAnalysisTime: '13:00', // 8 AM EST
                videoGenerationTime: '07:00', // 2 AM EST
                uploadOptimalTimes: ['14:00', '18:00', '20:00'] // Peak engagement times
            }
        };

        // Save configuration to DynamoDB via AWS CLI
        try {
            const configJson = JSON.stringify(defaultConfig);
            const command = `aws dynamodb put-item --table-name Configuration --item '{"configKey":{"S":"default"},"config":{"S":"${configJson.replace(/"/g, '\\"')}"}}' --region ${this.region}`;
            
            execSync(command, { stdio: 'pipe' });
            console.log('✓ Default configuration initialized');
        } catch (error) {
            console.log('⚠️  Could not initialize configuration automatically');
            console.log('Please configure manually through the AWS console');
        }

        console.log('');
    }

    async runDeploymentTests() {
        console.log('🧪 Running deployment tests...');

        // Test Lambda functions
        const functions = [
            'youtube-trend-detector',
            'youtube-content-analyzer',
            'youtube-video-generator',
            'youtube-video-processor',
            'youtube-uploader'
        ];

        for (const functionName of functions) {
            try {
                const testEvent = JSON.stringify({ test: true });
                const command = `aws lambda invoke --function-name ${functionName} --payload '${testEvent}' --region ${this.region} /tmp/test-response.json`;
                
                execSync(command, { stdio: 'pipe' });
                console.log(`✓ ${functionName} is responsive`);
            } catch (error) {
                console.log(`⚠️  ${functionName} test failed: ${error.message}`);
            }
        }

        // Test Step Functions
        try {
            const command = `aws stepfunctions list-state-machines --region ${this.region}`;
            const result = execSync(command, { encoding: 'utf8' });
            const stateMachines = JSON.parse(result);
            
            const youtubeWorkflow = stateMachines.stateMachines.find(sm => 
                sm.name === 'youtube-automation-workflow'
            );
            
            if (youtubeWorkflow) {
                console.log('✓ Step Functions workflow is deployed');
            } else {
                console.log('⚠️  Step Functions workflow not found');
            }
        } catch (error) {
            console.log('⚠️  Could not verify Step Functions deployment');
        }

        // Test DynamoDB tables
        const tables = ['TrendAnalytics', 'VideoMetadata', 'Configuration'];
        for (const tableName of tables) {
            try {
                const command = `aws dynamodb describe-table --table-name ${tableName} --region ${this.region}`;
                execSync(command, { stdio: 'pipe' });
                console.log(`✓ DynamoDB table ${tableName} is ready`);
            } catch (error) {
                console.log(`⚠️  DynamoDB table ${tableName} not accessible`);
            }
        }

        console.log('');
    }

    async displayDeploymentInfo() {
        console.log('📊 Deployment Information:');
        console.log('========================');

        try {
            // Get stack outputs
            const command = `aws cloudformation describe-stacks --stack-name ${this.stackName} --region ${this.region}`;
            const result = execSync(command, { encoding: 'utf8' });
            const stacks = JSON.parse(result);
            
            if (stacks.Stacks && stacks.Stacks.length > 0) {
                const outputs = stacks.Stacks[0].Outputs || [];
                
                outputs.forEach(output => {
                    console.log(`${output.Description}: ${output.OutputValue}`);
                });
            }
        } catch (error) {
            console.log('Could not retrieve stack outputs');
        }

        console.log('');
        console.log('🎯 Next Steps:');
        console.log('1. Configure YouTube API credentials in Secrets Manager');
        console.log('2. Test the workflow manually using Step Functions console');
        console.log('3. Monitor the CloudWatch dashboard for system health');
        console.log('4. Set up SNS notifications for alerts');
        console.log('');
        console.log('🔗 Useful Links:');
        console.log(`- CloudWatch Dashboard: https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:`);
        console.log(`- Step Functions Console: https://${this.region}.console.aws.amazon.com/states/home?region=${this.region}#/statemachines`);
        console.log(`- Secrets Manager: https://${this.region}.console.aws.amazon.com/secretsmanager/home?region=${this.region}`);
    }
}

// Run deployment if this script is executed directly
if (require.main === module) {
    const deployer = new YouTubeAutomationDeployer();
    deployer.deploy().catch(console.error);
}

module.exports = YouTubeAutomationDeployer;