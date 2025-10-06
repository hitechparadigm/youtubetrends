// Video Generator Lambda with Audio Integration Fix
const { BedrockRuntimeClient, StartAsyncInvokeCommand, GetAsyncInvokeCommand } = require('@aws-sdk/client-bedrock-runtime');
const { PollyClient, StartSpeechSynthesisTaskCommand } = require('@aws-sdk/client-polly');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const pollyClient = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event, context) => {
    const startTime = Date.now();

    console.log('Video Generator Lambda started', {
        requestId: context.awsRequestId,
        topic: event.topic,
        trendId: event.trendId,
        duration: event.videoConfig?.durationSeconds
    });

    try {
        // Generate video using Amazon Bedrock Nova Reel
        const videoResult = await generateVideo(event);

        // Generate audio narration if requested
        let audioResult = null;
        if (event.videoConfig?.includeAudio) {
            audioResult = await generateAudio(event);
        }

        // Calculate costs
        const generationCost = calculateGenerationCost(
            event.videoConfig?.durationSeconds || 6,
            event.videoConfig?.includeAudio || false
        );

        console.log('Video generation completed successfully', {
            videoS3Key: videoResult.s3Key,
            audioS3Key: audioResult?.s3Key,
            duration: videoResult.duration,
            cost: generationCost,
            executionTime: Date.now() - startTime
        });

        // CRITICAL AUDIO FIX: Merge audio and video if both exist
        let processedVideoS3Key = videoResult.s3Key; // Default to original video
        let hasAudio = false;

        if (audioResult && audioResult.s3Key) {
            console.log('🔧 CRITICAL FIX: Merging audio and video...');

            try {
                // Call video processor to merge audio and video
                const videoProcessorEvent = {
                    videoS3Key: videoResult.s3Key,
                    audioS3Key: audioResult.s3Key,
                    processingConfig: {
                        embedSubtitles: false, // Keep simple for now
                        mergeAudio: true,
                        outputFormat: 'mp4',
                        quality: 'high'
                    },
                    metadata: {
                        duration: videoResult.duration,
                        topic: event.topic || 'unknown',
                        trendId: event.trendId || 'unknown'
                    }
                };

                const processorResult = await lambdaClient.send(new InvokeCommand({
                    FunctionName: 'youtube-automation-video-processor',
                    Payload: JSON.stringify(videoProcessorEvent)
                }));

                const processorResponse = JSON.parse(new TextDecoder().decode(processorResult.Payload));

                if (processorResponse.success && processorResponse.processedVideoS3Key) {
                    processedVideoS3Key = processorResponse.processedVideoS3Key;
                    hasAudio = processorResponse.metadata?.hasAudio || true;
                    console.log('✅ AUDIO INTEGRATION SUCCESS: Video merged with audio', {
                        originalVideo: videoResult.s3Key,
                        processedVideo: processedVideoS3Key,
                        hasAudio: hasAudio
                    });
                } else {
                    console.error('⚠️ Audio merging failed, using original video:', processorResponse.error);
                }

            } catch (mergeError) {
                console.error('⚠️ Audio merging error, using original video:', mergeError.message);
            }
        }

        return {
            success: true,
            videoS3Key: videoResult.s3Key, // Original video
            audioS3Key: audioResult?.s3Key, // Separate audio
            processedVideoS3Key: processedVideoS3Key, // CRITICAL: Final video with audio
            bedrockJobId: videoResult.jobId,
            pollyJobId: audioResult?.jobId,
            metadata: {
                duration: videoResult.duration,
                fileSize: videoResult.fileSize,
                format: videoResult.format,
                hasAudio: hasAudio // CRITICAL: True if audio was merged
            },
            generationCost,
            executionTime: Date.now() - startTime
        };

    } catch (error) {
        console.error('Video generation failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            requestId: context.awsRequestId
        });

        return {
            success: false,
            metadata: {
                duration: 0,
                fileSize: 0,
                format: '',
                hasAudio: false
            },
            generationCost: 0,
            executionTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

async function generateVideo(event) {
    console.log('Starting video generation with Luma AI Ray v2');

    // Validate video duration (8 seconds to 5 minutes)
    const durationSeconds = event.videoConfig?.durationSeconds || 8;
    validateDuration(durationSeconds);

    // Enhanced script prompt with topic-specific instructions and duration
    const enhancedPrompt = enhancePromptForTopic(
        event.scriptPrompt || 'Create a professional video', 
        event.topic, 
        durationSeconds
    );

    // Mock mode for testing
    if (process.env.MOCK_VIDEO_GENERATION === 'true') {
        console.log('Mock mode: Simulating video generation');
        const s3OutputKey = `videos/${event.topic}/${event.trendId}_${Date.now()}.mp4`;

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            s3Key: s3OutputKey,
            jobId: `mock-job-${Date.now()}`,
            duration: event.videoConfig?.durationSeconds || 6,
            fileSize: (event.videoConfig?.durationSeconds || 6) * 1024 * 100,
            format: 'mp4'
        };
    }

    try {
        const s3OutputKey = `videos/${event.topic}/${event.trendId}_${Date.now()}.mp4`;

        // Validate required environment variables
        if (!process.env.VIDEO_BUCKET) {
            throw new Error('VIDEO_BUCKET environment variable is required');
        }

        // Try Luma AI Ray v2 first (working alternative)
        let startResponse;
        let jobId;
        let usedModel = 'luma.ray-v2:0';

        try {
            console.log('Attempting video generation with Luma AI Ray v2...');

            // Use Luma Ray v2 client (us-west-2)
            const lumaClient = new BedrockRuntimeClient({ region: 'us-west-2' });

            startResponse = await lumaClient.send(new StartAsyncInvokeCommand({
                modelId: 'luma.ray-v2:0',
                modelInput: {
                    prompt: enhancedPrompt
                },
                outputDataConfig: {
                    s3OutputDataConfig: {
                        s3Uri: `s3://youtube-automation-luma-786673323159/${s3OutputKey}`
                    }
                }
            }));

            jobId = startResponse.invocationArn;
            console.log('✅ Luma AI Ray v2 job started successfully', { jobId, s3OutputKey });

        } catch (lumaError) {
            console.log('❌ Luma AI Ray v2 failed:', lumaError.message);

            // Check if it's a rate limit error
            if (lumaError.message.includes('Too many requests')) {
                console.log('⏳ Luma Ray rate limited - waiting before retry...');
                // Wait 30 seconds and retry once
                await new Promise(resolve => setTimeout(resolve, 30000));

                try {
                    console.log('🔄 Retrying Luma Ray after rate limit wait...');
                    const lumaClient = new BedrockRuntimeClient({ region: 'us-west-2' });
                    
                    startResponse = await lumaClient.send(new StartAsyncInvokeCommand({
                        modelId: 'luma.ray-v2:0',
                        modelInput: {
                            prompt: enhancedPrompt
                        },
                        outputDataConfig: {
                            s3OutputDataConfig: {
                                s3Uri: `s3://youtube-automation-luma-786673323159/${s3OutputKey}`
                            }
                        }
                    }));

                    jobId = startResponse.invocationArn;
                    console.log('✅ Luma AI Ray v2 retry successful', { jobId, s3OutputKey });

                } catch (retryError) {
                    console.log('❌ Luma Ray retry failed:', retryError.message);
                    throw new Error(`Luma Ray failed after retry: ${retryError.message}`);
                }
            } else {
                console.log('❌ Luma Ray failed with error:', lumaError.message);
                throw new Error(`Luma Ray failed: ${lumaError.message}`);
            }
        }

        // Poll for completion (with timeout)
        const maxWaitTime = 30 * 60 * 1000; // 30 minutes
        const pollInterval = 30 * 1000; // 30 seconds
        const startTime = Date.now();

        // Use Luma Ray client for polling (us-west-2)
        const pollClient = new BedrockRuntimeClient({ region: 'us-west-2' });

        while (Date.now() - startTime < maxWaitTime) {
            const statusResponse = await pollClient.send(new GetAsyncInvokeCommand({
                invocationArn: jobId
            }));

            console.log('Job status:', statusResponse.status);

            if (statusResponse.status === 'Completed') {
                console.log('Video generation completed successfully');

                // Get file metadata from S3 (always Luma bucket)
                const bucketName = 'youtube-automation-luma-786673323159';
                const metadata = await getS3FileMetadata(s3OutputKey, bucketName);

                return {
                    s3Key: s3OutputKey,
                    jobId,
                    duration: event.videoConfig?.durationSeconds || 6,
                    fileSize: metadata.size,
                    format: 'mp4',
                    model: usedModel,
                    bucket: bucketName
                };
            } else if (statusResponse.status === 'Failed') {
                throw new Error(`Video generation failed: ${statusResponse.failureMessage || 'Unknown error'}`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Video generation timed out after 30 minutes');

    } catch (error) {
        console.error('Bedrock video generation failed', error);

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('ValidationException')) {
                throw new Error('Invalid Output Config/Credentials');
            } else if (error.message.includes('AccessDeniedException')) {
                throw new Error('Insufficient permissions for Bedrock Nova Reel access');
            } else if (error.message.includes('ThrottlingException')) {
                throw new Error('Rate limit exceeded for Bedrock Nova Reel');
            }
        }

        throw error;
    }
}

async function generateAudio(event) {
    console.log('Starting audio generation with Amazon Polly');

    // Mock mode for testing
    if (process.env.MOCK_VIDEO_GENERATION === 'true') {
        console.log('Mock mode: Simulating audio generation');
        const s3OutputKey = `audio/${event.topic}/${event.trendId}_${Date.now()}.mp3`;

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            s3Key: s3OutputKey,
            jobId: `mock-audio-job-${Date.now()}`
        };
    }

    try {
        const audioConfig = event.audioConfig || {
            voice: 'Matthew',
            speed: 'medium',
            language: 'en-US'
        };

        // Get topic-specific voice settings
        const voiceSettings = getTopicVoiceSettings(event.topic, audioConfig);

        const s3OutputKey = `audio/${event.topic}/${event.trendId}_${Date.now()}.mp3`;

        // Generate proper narration script for the topic
        const narrationScript = generateNarrationScript(event.topic, event.videoConfig?.durationSeconds || 6);
        
        // Generate SSML for better audio control with duration-aware timing
        const ssmlText = generateSSML(narrationScript, voiceSettings, event.videoConfig?.durationSeconds || 8);

        // Validate required environment variables
        if (!process.env.VIDEO_BUCKET) {
            throw new Error('VIDEO_BUCKET environment variable is required');
        }

        const response = await pollyClient.send(new StartSpeechSynthesisTaskCommand({
            Text: ssmlText,
            TextType: 'ssml',
            VoiceId: voiceSettings.voiceId,
            OutputFormat: 'mp3',
            Engine: 'standard', // Use reliable standard engine
            OutputS3BucketName: process.env.VIDEO_BUCKET,
            OutputS3KeyPrefix: `audio/${event.topic}/`,
            SampleRate: '24000' // Use high quality sample rate
        }));

        console.log('Polly job started', {
            taskId: response.SynthesisTask?.TaskId,
            s3OutputKey,
            voiceId: voiceSettings.voiceId
        });

        return {
            s3Key: s3OutputKey,
            jobId: response.SynthesisTask?.TaskId || 'unknown'
        };

    } catch (error) {
        console.error('Polly audio generation failed', error);

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('InvalidParameterValue')) {
                throw new Error('Invalid audio generation parameters');
            } else if (error.message.includes('AccessDeniedException')) {
                throw new Error('Insufficient permissions for Amazon Polly access');
            } else if (error.message.includes('ThrottlingException')) {
                throw new Error('Rate limit exceeded for Amazon Polly');
            }
        }

        throw error;
    }
}

function enhancePromptForTopic(basePrompt, topic, durationSeconds = 8) {
    // Duration-specific enhancements
    const durationContext = getDurationContext(durationSeconds);
    
    const topicEnhancements = {
        investing: `${basePrompt} ${durationContext} Focus on creating visually engaging content about financial markets, 
      stock charts, investment portfolios, and economic indicators. Include graphics showing 
      ETF performance, dividend yields, and market trends. Make it professional yet accessible.`,

        education: `${basePrompt} ${durationContext} Create educational visuals with clear diagrams, study materials, 
      learning environments, and academic success imagery. Include books, digital learning tools, 
      and inspiring educational settings.`,

        tourism: `${basePrompt} ${durationContext} Showcase beautiful travel destinations, cultural landmarks, 
      local experiences, and adventure activities. Include stunning landscapes, city views, 
      cultural sites, and travel-related imagery.`,

        technology: `${basePrompt} ${durationContext} Feature cutting-edge technology, digital interfaces, 
      innovation labs, and futuristic concepts. Include gadgets, software interfaces, 
      and tech environments.`,

        health: `${basePrompt} ${durationContext} Show healthy lifestyle imagery, medical concepts, wellness activities, 
      and health-focused environments. Include fitness, nutrition, and medical imagery.`
    };

    return topicEnhancements[topic?.toLowerCase()] || `${basePrompt} ${durationContext}`;
}

function getDurationContext(durationSeconds) {
    if (durationSeconds <= 15) {
        return "Create a concise, impactful video with clear focus and strong visual elements.";
    } else if (durationSeconds <= 60) {
        return "Create a medium-length video with multiple scenes, smooth transitions, and comprehensive coverage of the topic.";
    } else if (durationSeconds <= 180) {
        return "Create an extended video with detailed storytelling, multiple perspectives, and in-depth exploration of the subject matter.";
    } else {
        return "Create a comprehensive long-form video with rich narrative structure, multiple segments, detailed explanations, and engaging visual variety throughout.";
    }
}

function getTopicVoiceSettings(topic, audioConfig) {
    const topicVoices = {
        'etf-investing-2025': { 
            voiceId: 'Matthew',
            rate: 'medium',
            pitch: 'medium',
            volume: 'medium',
            emphasis: 'moderate'
        },
        'mexico-travel-2025': { 
            voiceId: 'Amy',
            rate: 'medium',
            pitch: '+2%',
            volume: 'medium',
            emphasis: 'moderate'
        },
        investing: { 
            voiceId: 'Matthew', 
            rate: '100%', 
            pitch: 'medium',
            volume: 'loud',
            emphasis: 'strong'
        },
        education: { 
            voiceId: 'Joanna', 
            rate: 'medium', 
            pitch: '+3%',
            volume: 'loud',
            emphasis: 'moderate'
        },
        tourism: { 
            voiceId: 'Amy', 
            rate: '105%', 
            pitch: '+8%',
            volume: 'loud',
            emphasis: 'strong'
        },
        technology: { 
            voiceId: 'Brian', 
            rate: 'medium', 
            pitch: '+2%',
            volume: 'loud',
            emphasis: 'moderate'
        },
        health: { 
            voiceId: 'Kimberly', 
            rate: '90%', 
            pitch: 'medium',
            volume: 'medium',
            emphasis: 'moderate'
        }
    };

    return topicVoices[topic?.toLowerCase()] || topicVoices.education;
}

function generateNarrationScript(topic, durationSeconds) {
    // Enhanced script generation for extended durations (8 seconds to 5 minutes)
    const targetWordCount = calculateWordCount(durationSeconds);
    
    // Create topic-specific content templates
    const contentTemplates = {
        'ETF-Investing-2025': {
            introduction: "ETF investing offers diversified portfolios with low fees and global market access.",
            mainPoints: [
                "Exchange-traded funds provide instant diversification across hundreds or thousands of stocks.",
                "Low expense ratios mean more of your money stays invested and compounds over time.",
                "ETFs trade like stocks, offering flexibility to buy and sell during market hours.",
                "Popular options include VTI for total stock market and VOO for S&P 500 exposure.",
                "Dollar-cost averaging into broad market ETFs is a proven long-term strategy."
            ],
            conclusion: "Start your ETF journey today with broad market diversification and low fees."
        },
        'Mexico-Travel-2025': {
            introduction: "Discover Mexico's incredible diversity, from ancient ruins to pristine beaches.",
            mainPoints: [
                "Explore the ancient Mayan pyramids of Chichen Itza and Tulum's coastal ruins.",
                "Relax on the white sand beaches of Cancun, Playa del Carmen, and Cozumel.",
                "Experience vibrant culture in Mexico City's museums, markets, and neighborhoods.",
                "Taste authentic cuisine from street tacos to fine dining in Guadalajara.",
                "Adventure awaits in cenotes, coral reefs, and colonial mountain towns."
            ],
            conclusion: "Your Mexican adventure awaits - book your trip and create unforgettable memories."
        },
        'Technology-Trends-2025': {
            introduction: "Technology continues to reshape our world with groundbreaking innovations.",
            mainPoints: [
                "Artificial intelligence is transforming industries from healthcare to finance.",
                "Quantum computing promises to solve complex problems beyond classical computers.",
                "Sustainable technology focuses on clean energy and environmental solutions.",
                "Augmented reality is changing how we interact with digital information.",
                "Blockchain technology enables new forms of digital ownership and transactions."
            ],
            conclusion: "Stay ahead of the curve by embracing these transformative technologies."
        },
        'test': {
            introduction: "This comprehensive test demonstrates our advanced AI video generation system.",
            mainPoints: [
                "Our platform uses cutting-edge AI models for professional video creation.",
                "Automated script generation adapts to any duration from seconds to minutes.",
                "High-quality visuals are paired with natural-sounding voice narration.",
                "The system handles everything from content creation to YouTube upload.",
                "Cost-effective production enables scalable content creation for any business."
            ],
            conclusion: "Experience the future of automated video content creation today."
        }
    };

    const template = contentTemplates[topic] || contentTemplates['test'];
    
    // Generate script based on duration and target word count
    return generateStructuredScript(template, targetWordCount, durationSeconds);
}

function calculateWordCount(durationSeconds) {
    // Calculate target word count based on duration
    // Using 2.5 words per second as optimal pacing (150 words per minute)
    const wordsPerSecond = 2.5;
    const baseWordCount = Math.floor(durationSeconds * wordsPerSecond);
    
    // Ensure minimum and maximum bounds
    const minWords = Math.max(8, Math.floor(durationSeconds * 2)); // Minimum 2 words/second
    const maxWords = Math.floor(durationSeconds * 3.5); // Maximum 3.5 words/second
    
    return Math.min(maxWords, Math.max(minWords, baseWordCount));
}

function generateStructuredScript(template, targetWordCount, durationSeconds) {
    let script = "";
    let currentWordCount = 0;
    
    // Always include introduction
    script += template.introduction;
    currentWordCount += countWords(template.introduction);
    
    // Calculate remaining words for main content
    const conclusionWords = countWords(template.conclusion);
    const remainingWords = targetWordCount - currentWordCount - conclusionWords;
    
    // Add main points based on available word budget
    if (remainingWords > 20) { // Only add main points if we have sufficient words
        let mainContent = "";
        let mainContentWords = 0;
        
        for (const point of template.mainPoints) {
            const pointWords = countWords(point);
            if (mainContentWords + pointWords <= remainingWords) {
                if (mainContent) mainContent += " ";
                mainContent += point;
                mainContentWords += pointWords;
            } else {
                break; // Stop adding points if we exceed word limit
            }
        }
        
        if (mainContent) {
            script += " " + mainContent;
            currentWordCount += mainContentWords;
        }
    }
    
    // Add conclusion for longer videos
    if (durationSeconds > 15) {
        script += " " + template.conclusion;
        currentWordCount += conclusionWords;
    }
    
    // Trim script if it exceeds target (shouldn't happen with proper calculation)
    if (currentWordCount > targetWordCount) {
        const words = script.split(' ');
        script = words.slice(0, targetWordCount).join(' ');
    }
    
    console.log(`Generated script: ${countWords(script)} words for ${durationSeconds} seconds (target: ${targetWordCount})`);
    return script;
}

function countWords(text) {
    return text.trim().split(/\s+/).length;
}

function validateDuration(durationSeconds) {
    // Validate duration is within supported range
    if (typeof durationSeconds !== 'number' || durationSeconds < 8 || durationSeconds > 300) {
        throw new Error(`Invalid duration: ${durationSeconds}. Duration must be between 8 seconds and 5 minutes (300 seconds).`);
    }
    
    console.log(`Validated duration: ${durationSeconds} seconds (${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')})`);
    return true;
}

function generateSSML(text, voiceSettings, durationSeconds = 8) {
    // Enhanced SSML generation for extended durations with strategic pacing
    const words = text.split(' ');
    const wordCount = words.length;
    
    // Calculate optimal speaking rate based on duration and word count
    const wordsPerSecond = wordCount / durationSeconds;
    let rate = 'medium';
    
    if (wordsPerSecond > 3) {
        rate = 'fast';
    } else if (wordsPerSecond < 2) {
        rate = 'slow';
    }
    
    // For extended videos, add strategic pauses and emphasis
    if (durationSeconds <= 15) {
        // Short videos: Simple structure with opening and closing pauses
        return `<speak>
            <prosody rate="${rate}" pitch="${voiceSettings.pitch}">
                <break time="0.5s"/>
                ${text}
                <break time="1s"/>
            </prosody>
        </speak>`;
    } else if (durationSeconds <= 60) {
        // Medium videos: Add mid-content pauses for better pacing
        const midPoint = Math.floor(words.length / 2);
        const firstHalf = words.slice(0, midPoint).join(' ');
        const secondHalf = words.slice(midPoint).join(' ');
        
        return `<speak>
            <prosody rate="${rate}" pitch="${voiceSettings.pitch}">
                <break time="0.5s"/>
                ${firstHalf}
                <break time="1s"/>
                ${secondHalf}
                <break time="1.5s"/>
            </prosody>
        </speak>`;
    } else {
        // Long videos: Structure with introduction, main content, and conclusion
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let structuredSSML = `<speak><prosody rate="${rate}" pitch="${voiceSettings.pitch}"><break time="0.5s"/>`;
        
        sentences.forEach((sentence, index) => {
            const trimmedSentence = sentence.trim();
            if (trimmedSentence) {
                // Add emphasis to first and last sentences
                if (index === 0 || index === sentences.length - 1) {
                    structuredSSML += `<emphasis level="moderate">${trimmedSentence}.</emphasis>`;
                } else {
                    structuredSSML += `${trimmedSentence}.`;
                }
                
                // Add strategic pauses between sentences
                if (index < sentences.length - 1) {
                    if (index === 0) {
                        structuredSSML += `<break time="1s"/>`;
                    } else {
                        structuredSSML += `<break time="0.7s"/>`;
                    }
                }
            }
        });
        
        structuredSSML += `<break time="2s"/></prosody></speak>`;
        return structuredSSML;
    }
}

async function getS3FileMetadata(s3Key, bucketName = null) {
    // Mock mode for testing
    if (process.env.MOCK_VIDEO_GENERATION === 'true') {
        // Estimate file size based on duration (rough approximation)
        const estimatedSize = 1024 * 1024 * 5; // 5MB default
        return { size: estimatedSize };
    }

    try {
        const bucket = bucketName || process.env.VIDEO_BUCKET;
        if (!bucket) {
            throw new Error('VIDEO_BUCKET environment variable is required');
        }

        const response = await s3Client.send(new HeadObjectCommand({
            Bucket: bucket,
            Key: s3Key
        }));

        console.log('S3 metadata retrieved', {
            key: s3Key,
            size: response.ContentLength,
            lastModified: response.LastModified
        });

        return {
            size: response.ContentLength || 0
        };
    } catch (error) {
        console.error('Failed to get S3 metadata', { key: s3Key, error });

        // Return estimated size if metadata retrieval fails
        return { size: 1024 * 1024 * 5 }; // 5MB estimate
    }
}

function calculateGenerationCost(durationSeconds, includeAudio) {
    // Bedrock Nova Reel pricing (approximate)
    const videoCostPerSecond = 0.80 / 60; // $0.80 per minute
    const videoCost = (durationSeconds / 60) * 0.80;

    // Polly pricing (approximate)
    const audioCost = includeAudio ? (durationSeconds * 0.000004) : 0; // $4 per 1M characters

    return Math.round((videoCost + audioCost) * 100) / 100; // Round to 2 decimal places
}