#!/usr/bin/env node

/**
 * YouTube API Credentials Setup Script
 * 
 * This script helps you configure YouTube Data API credentials
 * for the YouTube Automation Platform.
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🎬 YouTube Automation Platform - Credentials Setup');
  console.log('==================================================\n');

  console.log('📋 Project Information:');
  console.log('   Project ID: youtubepoc-473723');
  console.log('   Required API: YouTube Data API v3\n');

  const setupType = await question('Choose setup type:\n1. API Key only (recommended for demo)\n2. Full OAuth2 (for upload capabilities)\n\nEnter choice (1 or 2): ');

  if (setupType === '1') {
    await setupApiKey();
  } else if (setupType === '2') {
    await setupOAuth2();
  } else {
    console.log('❌ Invalid choice. Please run the script again.');
    process.exit(1);
  }

  rl.close();
}

async function setupApiKey() {
  console.log('\n🔑 API Key Setup');
  console.log('================\n');

  console.log('📝 Steps to get your API key:');
  console.log('1. Go to: https://console.cloud.google.com/');
  console.log('2. Select project: youtubepoc-473723');
  console.log('3. Enable "YouTube Data API v3" (if not already enabled)');
  console.log('4. Go to "APIs & Services" > "Credentials"');
  console.log('5. Click "Create Credentials" > "API Key"');
  console.log('6. Copy the API key\n');

  const apiKey = await question('Enter your YouTube Data API key: ');

  if (!apiKey || apiKey.trim().length < 10) {
    console.log('❌ Invalid API key. Please try again.');
    return;
  }

  const credentials = {
    api_key: apiKey.trim(),
    project_id: 'youtubepoc-473723',
    client_id: '',
    client_secret: '',
    refresh_token: ''
  };

  await storeCredentials(credentials);
}

async function setupOAuth2() {
  console.log('\n🔐 OAuth2 Setup');
  console.log('================\n');

  console.log('📝 Steps to get OAuth2 credentials:');
  console.log('1. Go to: https://console.cloud.google.com/');
  console.log('2. Select project: youtubepoc-473723');
  console.log('3. Go to "APIs & Services" > "Credentials"');
  console.log('4. Click "Create Credentials" > "OAuth 2.0 Client ID"');
  console.log('5. Application type: "Desktop application"');
  console.log('6. Download the JSON file or copy the credentials\n');

  const apiKey = await question('Enter your YouTube Data API key: ');
  const clientId = await question('Enter your OAuth2 Client ID: ');
  const clientSecret = await question('Enter your OAuth2 Client Secret: ');
  const refreshToken = await question('Enter your Refresh Token (leave empty if you don\'t have one yet): ');

  const credentials = {
    api_key: apiKey.trim(),
    project_id: 'youtubepoc-473723',
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    refresh_token: refreshToken.trim()
  };

  await storeCredentials(credentials);
}

async function storeCredentials(credentials) {
  console.log('\n💾 Storing credentials in AWS Secrets Manager...');

  try {
    const credentialsJson = JSON.stringify(credentials, null, 2);
    
    // Check if AWS CLI is available
    try {
      execSync('aws --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('❌ AWS CLI not found. Please install AWS CLI and configure your credentials.');
      console.log('   Installation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html');
      return;
    }

    // Store in Secrets Manager
    const command = `aws secretsmanager put-secret-value --secret-id youtube-automation/credentials --secret-string '${credentialsJson}'`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ Credentials stored successfully!');
    console.log('\n🧪 Testing the setup...');
    
    // Test the demo
    try {
      execSync('npm run demo:trends "artificial intelligence"', { stdio: 'inherit' });
      console.log('\n🎉 Setup complete! Your demo is now using live YouTube data!');
    } catch (error) {
      console.log('\n⚠️  Credentials stored, but demo test failed. You may need to:');
      console.log('   1. Wait a few minutes for credentials to propagate');
      console.log('   2. Check your API key permissions');
      console.log('   3. Ensure YouTube Data API v3 is enabled');
    }

  } catch (error) {
    console.log('❌ Failed to store credentials:', error.message);
    console.log('\n📋 Manual setup command:');
    console.log(`aws secretsmanager put-secret-value \\`);
    console.log(`  --secret-id youtube-automation/credentials \\`);
    console.log(`  --secret-string '${JSON.stringify(credentials)}'`);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled.');
  process.exit(0);
});

main().catch(console.error);