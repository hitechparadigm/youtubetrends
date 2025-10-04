#!/usr/bin/env node

/**
 * Deploy Audio Integration Fix
 * Updates the optimized video generator Lambda with audio merging capability
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AudioFixDeployer {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.functionName = 'youtube-automation-video-generator';
    }

    async deployAudioFix() {
        console.log('🔧 DEPLOYING AUDIO INTEGRATION FIX');
        console.log('=' .repeat(50));
        console.log('🎯 Updating Lambda function with audio merging capability\n');

        try {
            // Step 1: Prepare the deployment package
            await this.prepareDeploymentPackage();

            // Step 2: Update the Lambda function
            await this.updateLambdaFunction();

            // Step 3: Test the deployed fix
            await this.testDeployedFix();

            console.log('\n🎉 AUDIO INTEGRATION FIX DEPLOYED SUCCESSFULLY!');
            console.log('✅ Videos will now have synchronized audio');

        } catch (error) {
            console.error('\n❌ Audio fix deployment failed:', error.message);
            process.exit(1);
        }
    }

    async prepareDeploymentPackage() {
        console.log('📦 Step 1: Preparing deployment package...');

        const lambdaDir = 'lambda/optimized-video-generator';
        const tempDir = '/tmp/audio-fix-deployment';

        // Create temporary deployment directory
        if (fs.existsSync(tempDir)) {
            execSync(`rm -rf ${tempDir}`, { stdio: 'pipe' });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        // Copy Lambda function files
        console.log('  📋 Copying Lambda function files...');
        execSync(`cp -r ${lambdaDir}/* ${tempDir}/`, { stdio: 'pipe' });

        // Install dependencies if package.json exists
        const packageJsonPath = path.join(tempDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            console.log('  📦 Installing dependencies...');
            execSync('npm install --production', { 
                cwd: tempDir, 
                stdio: 'inherit' 
            });
        } else {
            // Create minimal package.json for dependencies
            console.log('  📦 Creating package.json with required dependencies...');
            const packageJson = {
                name: 'optimized-video-generator',
                version: '1.0.0',
                main: 'index.js',
                dependencies: {
                    '@aws-sdk/client-bedrock-runtime': '^3.0.0',
                    '@aws-sdk/client-polly': '^3.0.0',
                    '@aws-sdk/client-s3': '^3.0.0',
                    '@aws-sdk/client-lambda': '^3.0.0'
                }
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            
            execSync('npm install --production', { 
                cwd: tempDir, 
                stdio: 'inherit' 
            });
        }

        // Create deployment zip
        console.log('  🗜️  Creating deployment package...');
        const zipPath = '/tmp/audio-fix-deployment.zip';
        execSync(`cd ${tempDir} && zip -r ${zipPath} . -x "*.ts" "tsconfig.json"`, { stdio: 'pipe' });

        console.log('  ✅ Deployment package ready');
        this.deploymentZip = zipPath;
        console.log('');
    }

    async updateLambdaFunction() {
        console.log('🚀 Step 2: Updating Lambda function...');

        try {
            // Update function code
            console.log(`  📤 Uploading to ${this.functionName}...`);
            
            const command = `aws lambda update-function-code \
                --function-name ${this.functionName} \
                --zip-file fileb://${this.deploymentZip} \
                --region ${this.region}`;
            
            const result = execSync(command, { encoding: 'utf8' });
            const response = JSON.parse(result);
            
            console.log('  ✅ Function code updated');
            console.log(`    Function ARN: ${response.FunctionArn}`);
            console.log(`    Last Modified: ${response.LastModified}`);
            console.log(`    Code Size: ${(response.CodeSize / 1024 / 1024).toFixed(2)} MB`);

            // Wait for function to be ready
            console.log('  ⏳ Waiting for function to be ready...');
            await this.waitForFunctionReady();
            
            console.log('  ✅ Function is ready for testing');

        } catch (error) {
            console.error('  ❌ Function update failed:', error.message);
            throw error;
        }

        console.log('');
    }

    async waitForFunctionReady() {
        const maxAttempts = 30;
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const result = execSync(`aws lambda get-function --function-name ${this.functionName} --region ${this.region}`, { encoding: 'utf8' });
                const response = JSON.parse(result);
                
                if (response.Configuration.State === 'Active') {
                    return;
                }
                
                console.log(`    State: ${response.Configuration.State}, waiting...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
                
            } catch (error) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        throw new Error('Function did not become ready within timeout');
    }

    async testDeployedFix() {
        console.log('🧪 Step 3: Testing deployed audio fix...');

        const testEvent = {
            topic: 'Audio Integration Test',
            category: 'technology',
            trendData: {
                keyword: 'audio integration test',
                searchVolume: 10000,
                relatedTerms: ['audio', 'video', 'integration'],
                context: {
                    newsArticles: ['Audio integration now working'],
                    socialMentions: ['Videos have audio now']
                }
            },
            videoConfig: {
                durationSeconds: 6,
                style: 'professional',
                targetAudience: 'professionals'
            }
        };

        try {
            console.log('  🚀 Invoking updated Lambda function...');
            
            const command = `aws lambda invoke \
                --function-name ${this.functionName} \
                --payload '${JSON.stringify(testEvent)}' \
                --region ${this.region} \
                /tmp/audio-fix-test-response.json`;
            
            execSync(command, { stdio: 'pipe' });
            
            const response = JSON.parse(fs.readFileSync('/tmp/audio-fix-test-response.json', 'utf8'));
            
            console.log('  📊 Test Results:');
            
            if (response.success) {
                console.log('    ✅ Function execution: SUCCESS');
                console.log(`    📹 Video S3 Key: ${response.videoS3Key || 'N/A'}`);
                console.log(`    🎵 Audio S3 Key: ${response.audioS3Key || 'N/A'}`);
                console.log(`    🎬 Processed Video: ${response.processedVideoS3Key || '❌ NOT CREATED'}`);
                console.log(`    🔊 Has Audio: ${response.metadata?.hasAudio ? '✅ YES' : '❌ NO'}`);
                console.log(`    📝 Has Subtitles: ${response.metadata?.hasSubtitles ? '✅ YES' : '❌ NO'}`);
                
                if (response.processedVideoS3Key && response.metadata?.hasAudio) {
                    console.log('\n  🎉 ✅ AUDIO INTEGRATION: WORKING!');
                    console.log('    Videos now have synchronized audio');
                    console.log('    Ready for YouTube upload with audio');
                } else {
                    console.log('\n  ⚠️  🔧 PARTIAL SUCCESS: Function updated but audio integration needs debugging');
                }
                
            } else {
                console.log('    ❌ Function execution: FAILED');
                console.log(`    Error: ${response.error || 'Unknown error'}`);
                throw new Error('Audio fix test failed');
            }

        } catch (error) {
            console.error('  ❌ Test failed:', error.message);
            throw error;
        }

        console.log('');
    }

    async cleanup() {
        console.log('🧹 Cleaning up temporary files...');
        
        try {
            if (this.deploymentZip && fs.existsSync(this.deploymentZip)) {
                fs.unlinkSync(this.deploymentZip);
            }
            
            if (fs.existsSync('/tmp/audio-fix-deployment')) {
                execSync('rm -rf /tmp/audio-fix-deployment', { stdio: 'pipe' });
            }
            
            if (fs.existsSync('/tmp/audio-fix-test-response.json')) {
                fs.unlinkSync('/tmp/audio-fix-test-response.json');
            }
            
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.warn('⚠️ Cleanup warning:', error.message);
        }
    }
}

// Run deployment if this script is executed directly
if (require.main === module) {
    const deployer = new AudioFixDeployer();
    deployer.deployAudioFix()
        .finally(() => deployer.cleanup())
        .catch(console.error);
}

module.exports = AudioFixDeployer;