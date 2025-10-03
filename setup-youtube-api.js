#!/usr/bin/env node

/**
 * YouTube API Setup Helper
 * Interactive setup for YouTube OAuth credentials
 */

const readline = require('readline');

async function setupYouTubeAPI() {
  console.log('🎬 YOUTUBE API SETUP WIZARD');
  console.log('='.repeat(40));
  console.log('Setting up YouTube Data API v3 for automated uploads');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  try {
    console.log('📋 STEP 1: Google Cloud Console Setup');
    console.log('');
    console.log('1. Go to: https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable the YouTube Data API v3');
    console.log('4. Go to APIs & Services > Credentials');
    console.log('5. Create OAuth 2.0 Client ID (Desktop Application)');
    console.log('');

    await question('Press Enter when you have completed the Google Cloud setup...');
    console.log('');

    console.log('📋 STEP 2: OAuth Credentials');
    console.log('');
    
    const clientId = await question('Enter your Google Client ID: ');
    const clientSecret = await question('Enter your Google Client Secret: ');
    
    console.log('');
    console.log('📋 STEP 3: Get Refresh Token');
    console.log('');

    try {
      const { google } = await import('googleapis');
      
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      const scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      console.log('🔗 AUTHORIZATION REQUIRED:');
      console.log('');
      console.log('1. Open this URL in your browser:');
      console.log(`   ${authUrl}`);
      console.log('');
      console.log('2. Sign in with your YouTube channel account');
      console.log('3. Grant permissions for video uploads');
      console.log('4. Copy the authorization code');
      console.log('');

      const authCode = await question('Enter the authorization code: ');
      console.log('');
      console.log('🔄 Getting refresh token...');

      const { tokens } = await oauth2Client.getToken(authCode);
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received. Make sure to use prompt=consent in the auth URL.');
      }

      console.log('✅ Refresh token obtained successfully!');
      console.log('');

      console.log('📋 STEP 4: Store in AWS Secrets Manager');
      console.log('');

      const credentials = {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
      };

      console.log('🔧 AWS CLI Command to store credentials:');
      console.log('');
      console.log('aws secretsmanager create-secret \\');
      console.log('  --name "youtube-automation/credentials" \\');
      console.log('  --description "YouTube API credentials for automation" \\');
      console.log(`  --secret-string '${JSON.stringify(credentials, null, 2)}'`);
      console.log('');

      console.log('📋 STEP 5: Test Configuration');
      console.log('');
      console.log('After storing the credentials, test with:');
      console.log('  node complete-pipeline-test.js');
      console.log('');

      console.log('✅ SETUP COMPLETE!');
      console.log('');
      console.log('🎯 Your YouTube automation is ready for:');
      console.log('- Automated video uploads');
      console.log('- SEO optimization');
      console.log('- Performance tracking');
      console.log('- Daily content creation');
      console.log('');
      console.log('🎊 Ready to revolutionize your YouTube content creation!');

      // Save credentials to local file for backup
      const fs = await import('fs');
      fs.writeFileSync('youtube-credentials-backup.json', JSON.stringify(credentials, null, 2));
      console.log('💾 Credentials backed up to: youtube-credentials-backup.json');
      console.log('   (Keep this file secure and delete after AWS setup)');

    } catch (error) {
      console.error('❌ Error during OAuth setup:', error.message);
      console.log('');
      console.log('🔧 Common issues:');
      console.log('- Invalid client ID or secret');
      console.log('- Authorization code expired (get a new one)');
      console.log('- Network connectivity issues');
      console.log('- googleapis package not installed');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Check if googleapis is available
async function checkDependencies() {
  try {
    await import('googleapis');
    return true;
  } catch (error) {
    console.log('📦 Installing required dependencies...');
    console.log('');
    
    const { execSync } = require('child_process');
    try {
      execSync('npm install googleapis', { stdio: 'inherit' });
      console.log('✅ Dependencies installed successfully!');
      console.log('');
      return true;
    } catch (installError) {
      console.error('❌ Failed to install googleapis');
      console.log('');
      console.log('Please run manually: npm install googleapis');
      return false;
    }
  }
}

console.log('🎬 YouTube API Setup for Automation Platform');
console.log('⚡ Interactive OAuth configuration wizard');
console.log('');

checkDependencies()
  .then(ready => {
    if (ready) {
      return setupYouTubeAPI();
    } else {
      console.log('❌ Setup cancelled - install dependencies first');
    }
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
  });