# YouTube API Setup Guide

## 🎯 Overview
Configure YouTube Data API v3 credentials for automated video uploads.

## 📋 Prerequisites
- Google Cloud Console account
- YouTube channel for uploads
- AWS Secrets Manager access

## 🚀 Step-by-Step Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **YouTube Data API v3**

### 2. Create OAuth 2.0 Credentials
1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Desktop Application** as application type
4. Download the credentials JSON file

### 3. Get Refresh Token
Run this one-time setup to get your refresh token:

```javascript
// youtube-auth-setup.js
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'urn:ietf:wg:oauth:2.0:oob'
);

const scopes = ['https://www.googleapis.com/auth/youtube.upload'];
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh token:', token.refresh_token);
  });
});
```

### 4. Store Credentials in AWS Secrets Manager

Create a secret named `youtube-automation/credentials` with this structure:

```json
{
  "client_id": "your-google-client-id",
  "client_secret": "your-google-client-secret",
  "refresh_token": "your-refresh-token",
  "redirect_uri": "urn:ietf:wg:oauth:2.0:oob"
}
```

### 5. AWS CLI Command
```bash
aws secretsmanager create-secret \
  --name "youtube-automation/credentials" \
  --description "YouTube API credentials for automation" \
  --secret-string '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET", 
    "refresh_token": "YOUR_REFRESH_TOKEN",
    "redirect_uri": "urn:ietf:wg:oauth:2.0:oob"
  }'
```

## 🔧 Environment Variables
Ensure these are set in your Lambda environment:

```bash
YOUTUBE_CREDENTIALS_SECRET=youtube-automation/credentials
AWS_REGION=us-east-1
VIDEO_BUCKET=youtube-automation-videos-786673323159-us-east-1
```

## ✅ Test Configuration
Once configured, test with:

```bash
node test-youtube-upload.js
```

## 🎯 Expected Results
- ✅ OAuth authentication successful
- ✅ Video uploaded to YouTube
- ✅ SEO metadata applied
- ✅ Video URL returned

## 🔒 Security Notes
- Keep client secret secure
- Refresh tokens don't expire unless revoked
- Use least-privilege IAM roles
- Monitor API quota usage

## 📊 API Quotas
YouTube Data API v3 quotas:
- **Default**: 10,000 units/day
- **Upload**: ~1,600 units per video
- **Daily capacity**: ~6 videos/day

## 🚀 Production Scaling
For higher volume:
1. Request quota increase from Google
2. Implement upload queuing
3. Add retry mechanisms
4. Monitor quota usage

## 🎬 Ready to Upload!
Once configured, your system can automatically:
- Generate AI videos with Bedrock Nova Reel
- Create professional audio with Polly
- Upload to YouTube with SEO optimization
- Track performance and analytics

**Your YouTube automation pipeline will be complete!** 🎊