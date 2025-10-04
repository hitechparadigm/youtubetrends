const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: 'us-east-1' });

async function testVideoGeneratorDirect() {
  console.log('🧪 Testing Video Generator Lambda Directly...\n');

  const testRequest = {
    scriptPrompt: 'Create engaging content about AI regulation changes in 2025, focusing on how new government policies will impact tech companies, developers, and AI innovation.',
    topic: 'AI Regulation 2025 - What Tech Companies Must Know',
    trendId: `trend-test-${Date.now()}`,
    videoConfig: {
      durationSeconds: 6,
      fps: 24,
      dimension: '1280x720',
      quality: 'high',
      includeAudio: true
    },
    audioConfig: {
      voice: 'Matthew',
      speed: 'medium',
      language: 'en-US'
    }
  };

  console.log('📋 Test Request:');
  console.log(JSON.stringify(testRequest, null, 2));
  console.log('\n🚀 Invoking Lambda...');

  try {
    const command = new InvokeCommand({
      FunctionName: 'youtube-automation-video-generator',
      Payload: JSON.stringify(testRequest)
    });

    const response = await lambda.send(command);
    
    console.log(`📊 Status Code: ${response.StatusCode}`);
    console.log(`📦 Payload Size: ${response.Payload?.length || 0} bytes`);
    
    if (response.Payload) {
      const result = JSON.parse(new TextDecoder().decode(response.Payload));
      
      console.log('\n📋 Lambda Response:');
      console.log(JSON.stringify(result, null, 2));
      
      // Analyze the response
      if (result.success) {
        console.log('\n✅ SUCCESS ANALYSIS:');
        console.log(`   Video S3 Key: ${result.videoS3Key || 'Not provided'}`);
        console.log(`   Audio S3 Key: ${result.audioS3Key || 'Not provided'}`);
        console.log(`   Bedrock Job ID: ${result.bedrockJobId || 'Not provided'}`);
        console.log(`   Polly Job ID: ${result.pollyJobId || 'Not provided'}`);
        console.log(`   Generation Cost: $${result.generationCost || 0}`);
        console.log(`   Execution Time: ${result.executionTime || 0}ms`);
      } else {
        console.log('\n❌ FAILURE ANALYSIS:');
        console.log(`   Error: ${result.error || 'No error message'}`);
        console.log(`   Error Message: ${result.errorMessage || 'No error message'}`);
      }
      
      return result;
    } else {
      console.log('❌ No payload returned from Lambda');
      return null;
    }

  } catch (error) {
    console.error('❌ Lambda invocation failed:', error);
    return null;
  }
}

async function testYouTubeUploaderDirect() {
  console.log('\n🧪 Testing YouTube Uploader Lambda Directly...\n');

  const testRequest = {
    videoS3Key: 'test-video-key.mp4',
    audioS3Key: 'test-audio-key.mp3',
    metadata: {
      title: 'Test Video - AI Regulation 2025',
      description: 'Test video for YouTube automation platform',
      tags: ['test', 'AI', 'regulation', 'technology'],
      categoryId: '28',
      privacyStatus: 'private' // Use private for testing
    }
  };

  console.log('📋 Test Request:');
  console.log(JSON.stringify(testRequest, null, 2));
  console.log('\n🚀 Invoking Lambda...');

  try {
    const command = new InvokeCommand({
      FunctionName: 'youtube-automation-youtube-uploader',
      Payload: JSON.stringify(testRequest)
    });

    const response = await lambda.send(command);
    
    console.log(`📊 Status Code: ${response.StatusCode}`);
    
    if (response.Payload) {
      const result = JSON.parse(new TextDecoder().decode(response.Payload));
      
      console.log('\n📋 Lambda Response:');
      console.log(JSON.stringify(result, null, 2));
      
      return result;
    } else {
      console.log('❌ No payload returned from Lambda');
      return null;
    }

  } catch (error) {
    console.error('❌ Lambda invocation failed:', error);
    return null;
  }
}

async function main() {
  console.log('🔍 LAMBDA FUNCTION DIRECT TESTING');
  console.log('==================================\n');

  // Test 1: Video Generator
  const videoResult = await testVideoGeneratorDirect();
  
  // Test 2: YouTube Uploader (only if we have credentials)
  // const youtubeResult = await testYouTubeUploaderDirect();

  console.log('\n🎊 TESTING SUMMARY');
  console.log('==================');
  
  if (videoResult) {
    if (videoResult.success) {
      console.log('✅ Video Generator: Working');
      if (videoResult.videoS3Key) {
        console.log(`   📁 Video created: ${videoResult.videoS3Key}`);
      }
    } else {
      console.log('❌ Video Generator: Failed');
      console.log(`   Error: ${videoResult.error || videoResult.errorMessage}`);
    }
  } else {
    console.log('❌ Video Generator: No response');
  }

  console.log('\n🔧 TROUBLESHOOTING TIPS:');
  console.log('1. Check AWS credentials are configured');
  console.log('2. Verify Bedrock access and model permissions');
  console.log('3. Check S3 bucket permissions');
  console.log('4. Review Lambda function logs in CloudWatch');
  console.log('5. Ensure all required environment variables are set');
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Direct testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testVideoGeneratorDirect,
  testYouTubeUploaderDirect,
  main
};