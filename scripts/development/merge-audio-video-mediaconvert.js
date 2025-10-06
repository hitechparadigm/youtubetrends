#!/usr/bin/env node

/**
 * Use AWS MediaConvert to merge our video and audio files
 */

const { MediaConvertClient, CreateJobCommand } = require('@aws-sdk/client-mediaconvert');

async function mergeAudioVideoWithMediaConvert() {
    console.log('🎬 MERGING AUDIO AND VIDEO WITH MEDIACONVERT');
    console.log('============================================');
    
    try {
        // Use the latest video and audio files
        const mediaConvertClient = new MediaConvertClient({ region: 'us-east-1' });
        
        const videoS3Uri = 's3://youtube-automation-videos-786673323159-us-east-1/videos/ETF-Investing-2025/etf-improved-video.mp4';
        const audioS3Uri = 's3://youtube-automation-videos-786673323159-us-east-1/audio/ETF-Investing-2025/.ff6768d5-6a32-4456-8813-bff4f85b2ffc.mp3';
        const outputS3Uri = 's3://youtube-automation-videos-786673323159-us-east-1/videos/ETF-Investing-2025/etf-synchronized-v3.mp4';
        
        console.log('📹 Video Input:', videoS3Uri);
        console.log('🎵 Audio Input:', audioS3Uri);
        console.log('🎞️ Output:', outputS3Uri);
        
        const jobParams = {
            Role: 'arn:aws:iam::786673323159:role/YoutubeAutomationMediaConvertRole',
            Settings: {
                Inputs: [
                    {
                        FileInput: videoS3Uri,
                        VideoSelector: {},
                        AudioSelectors: {
                            'Audio Selector 1': {
                                DefaultSelection: 'NOT_DEFAULT'
                            }
                        }
                    }
                ],
                InputClippings: [
                    {
                        StartTimecode: '00:00:00:00',
                        EndTimecode: '00:00:08:00'
                    }
                ],
                OutputGroups: [
                    {
                        Name: 'File Group',
                        OutputGroupSettings: {
                            Type: 'FILE_GROUP_SETTINGS',
                            FileGroupSettings: {
                                Destination: outputS3Uri.replace('.mp4', '')
                            }
                        },
                        Outputs: [
                            {
                                VideoDescription: {
                                    CodecSettings: {
                                        Codec: 'H_264',
                                        H264Settings: {
                                            RateControlMode: 'QVBR',
                                            QvbrSettings: {
                                                QvbrQualityLevel: 8
                                            },
                                            MaxBitrate: 5000000,
                                            FramerateControl: 'SPECIFIED',
                                            FramerateNumerator: 24,
                                            FramerateDenominator: 1
                                        }
                                    },
                                    Width: 1280,
                                    Height: 720
                                },
                                AudioDescriptions: [
                                    {
                                        CodecSettings: {
                                            Codec: 'AAC',
                                            AacSettings: {
                                                Bitrate: 128000,
                                                CodingMode: 'CODING_MODE_2_0',
                                                SampleRate: 48000
                                            }
                                        },
                                        AudioSourceName: 'Audio Selector 1'
                                    }
                                ],
                                ContainerSettings: {
                                    Container: 'MP4',
                                    Mp4Settings: {}
                                }
                            }
                        ]
                    }
                ]
            }
        };
        
        console.log('🚀 Starting MediaConvert job...');
        
        const response = await mediaConvertClient.send(new CreateJobCommand(jobParams));
        
        console.log('✅ MediaConvert job started!');
        console.log('🆔 Job ID:', response.Job?.Id);
        console.log('📊 Status:', response.Job?.Status);
        
        console.log('\n⏳ Job is processing...');
        console.log('💡 Check AWS MediaConvert console for progress');
        console.log('🎯 Expected output:', outputS3Uri);
        
        return {
            success: true,
            jobId: response.Job?.Id,
            outputUri: outputS3Uri
        };
        
    } catch (error) {
        console.log('❌ MediaConvert job failed:', error.message);
        
        if (error.message.includes('Role')) {
            console.log('\n🔧 IAM ROLE ISSUE:');
            console.log('   → MediaConvert needs a service role');
            console.log('   → Check if YoutubeAutomationMediaConvertRole exists');
            console.log('   → Role needs S3 and MediaConvert permissions');
        }
        
        return null;
    }
}

mergeAudioVideoWithMediaConvert().catch(console.error);