# YouTube API Setup Guide

## 🎯 Enable Live YouTube Data for Project `youtubepoc-473723`

Transform your demo from simulated data to **real YouTube trending analysis** in just a few minutes!

---

## 🚀 **Quick Setup (Recommended)**

### **Option 1: Automated Setup Script**
```bash
# Run the interactive setup script
npm run setup:youtube
```

The script will guide you through:
1. Choosing between API Key or OAuth2 setup
2. Getting your credentials from Google Cloud Console
3. Storing them securely in AWS Secrets Manager
4. Testing the live data connection

### **Option 2: Manual Setup**

#### **Step 1: Get YouTube Data API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Select your project**: `youtubepoc-473723`
3. **Enable API**: Search for "YouTube Data API v3" and enable it
4. **Create credentials**: 
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

#### **Step 2: Store in AWS Secrets Manager**
```bash
aws secretsmanager put-secret-value \
  --secret-id youtube-automation/credentials \
  --secret-string '{
    "api_key": "YOUR_YOUTUBE_API_KEY_HERE",
    "project_id": "youtubepoc-473723",
    "client_id": "",
    "client_secret": "",
    "refresh_token": ""
  }'
```

#### **Step 3: Test Live Data**
```bash
# This will now use REAL YouTube data!
npm run demo:trends "artificial intelligence"
```

---

## 🎬 **What Changes with Live Data**

### **Before (Simulated)**
```
📊 Trends Found: 11
📈 Average Engagement: 7.84%
👀 Total Views Analyzed: 825,263
🎯 Simulating trend analysis...
```

### **After (Live YouTube Data)**
```
📊 Trends Found: 25 (REAL VIDEOS!)
📈 Average Engagement: 12.4% (LIVE METRICS!)
👀 Total Views Analyzed: 2,847,392 (ACTUAL VIEWS!)
🌐 Connecting to YouTube Data API...
✅ Live trend data retrieved successfully
```

### **Enhanced Demo Features**
- ✅ **Real trending videos** from YouTube's trending page
- ✅ **Live engagement metrics** (actual views, likes, comments)
- ✅ **Current keywords** and hashtags that are actually trending
- ✅ **Accurate category performance** based on real data
- ✅ **Competition analysis** with real competitor metrics
- ✅ **Fresh content discovery** updated in real-time

---

## 🔧 **Advanced Setup (OAuth2 for Upload)**

If you want to eventually upload videos automatically:

### **Step 1: Create OAuth2 Credentials**
1. In Google Cloud Console for `youtubepoc-473723`
2. Go to "APIs & Services" > "Credentials"
3. Create "OAuth 2.0 Client ID"
4. Application type: "Desktop application"
5. Add authorized redirect URI: `http://localhost:8080`

### **Step 2: Get Refresh Token**
Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):
1. Go to OAuth 2.0 Playground
2. Click settings gear, check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In Step 1, add scope: `https://www.googleapis.com/auth/youtube.upload`
5. Authorize and get the refresh token

### **Step 3: Store Full Credentials**
```bash
aws secretsmanager put-secret-value \
  --secret-id youtube-automation/credentials \
  --secret-string '{
    "api_key": "YOUR_API_KEY",
    "project_id": "youtubepoc-473723",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 📊 **API Quota Management**

### **YouTube Data API v3 Quotas**
- **Daily quota**: 10,000 units per day
- **Search operation**: ~100 units per request
- **Video details**: ~1 unit per video
- **Trending videos**: ~100 units per request

### **Demo Usage**
- **Single demo run**: ~200-300 units
- **Daily demo capacity**: ~30-50 runs
- **Perfect for development and testing**

### **Quota Monitoring**
The platform automatically tracks quota usage:
```bash
# Check quota usage in demo output
npm run demo:trends "any topic"
# Look for: "📊 YouTube API Quota Used: 245/10000 (2.45%)"
```

---

## 🎯 **Perfect Demo Topics with Live Data**

### **High-Impact Topics**
```bash
# Technology & AI (always trending)
npm run demo:trends "artificial intelligence"
npm run demo:trends "chatgpt tutorial"

# Lifestyle & Education (high engagement)
npm run demo:trends "cooking pasta"
npm run demo:trends "guitar lessons"

# Finance & Business (monetization-friendly)
npm run demo:trends "stock market analysis"
npm run demo:trends "cryptocurrency news"

# Travel & Adventure (visual content)
npm run demo:trends "travel japan"
npm run demo:trends "hiking trails"
```

### **Demo Script for Live Data**
1. **"Let me show you real YouTube trending analysis"**
2. **"Pick any topic you're interested in"** - Let them choose
3. **"Watch it connect to YouTube's live API"** - Show the API connection
4. **"These are actual trending videos right now"** - Point out real metrics
5. **"Look at these real engagement numbers"** - Highlight live data
6. **"The AI is analyzing actual competitor performance"** - Show intelligence

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **API Key Not Working**
```bash
# Check if API is enabled
gcloud services list --enabled --project=youtubepoc-473723 | grep youtube

# Enable if needed
gcloud services enable youtube.googleapis.com --project=youtubepoc-473723
```

#### **Quota Exceeded**
```
Error: quotaExceeded
```
**Solution**: Wait until next day (quota resets at midnight Pacific Time) or request quota increase.

#### **Credentials Not Found**
```bash
# Verify credentials are stored
aws secretsmanager get-secret-value --secret-id youtube-automation/credentials

# Check the secret exists
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `youtube-automation`)]'
```

#### **Demo Still Shows Simulated Data**
1. **Wait 2-3 minutes** for credentials to propagate
2. **Check API key permissions** in Google Cloud Console
3. **Verify YouTube Data API v3 is enabled**
4. **Run demo again** - it should show "Connecting to YouTube Data API..."

### **Verification Commands**
```bash
# Test AWS credentials
aws sts get-caller-identity

# Test YouTube credentials
aws secretsmanager get-secret-value --secret-id youtube-automation/credentials --query SecretString --output text | jq .

# Test full demo
npm run demo:trends "test topic"
```

---

## 🎉 **Success Indicators**

### **Live Data Working When You See:**
- ✅ `🌐 Connecting to YouTube Data API...`
- ✅ `✅ YouTube API credentials loaded successfully`
- ✅ `✅ Live trend data retrieved successfully`
- ✅ Real video titles and channel names in results
- ✅ Actual view counts (not round numbers like 50,000)
- ✅ Current trending keywords and hashtags

### **Still Simulated When You See:**
- ❌ `🔄 Falling back to demo mode...`
- ❌ `🎯 Simulating trend analysis...`
- ❌ Generic video titles like "Sample Video Title"
- ❌ Round engagement numbers (exactly 50,000 views, etc.)

---

## 💡 **Pro Tips**

### **Maximize Demo Impact**
1. **Use trending topics** - Check YouTube trending page first
2. **Pick visual topics** - Travel, cooking, tech get high visual scores
3. **Try educational content** - Gets high audio narration scores
4. **Test different niches** - Show the AI's versatility

### **API Efficiency**
1. **Cache results** - Demo caches data for 1 hour to save quota
2. **Batch requests** - Multiple topics in one session share some API calls
3. **Monitor usage** - Keep track of daily quota consumption

### **Impressive Metrics to Highlight**
- **Real-time data** - "This is live from YouTube right now"
- **Engagement analysis** - "Look at these actual like-to-view ratios"
- **Competition insights** - "Here's what's actually working in this niche"
- **Trend timing** - "These videos are trending in the last 24 hours"

---

**Ready to enable live YouTube data? Run `npm run setup:youtube` to get started!** 🚀