#!/usr/bin/env node

/**
 * Simple audio overlay using MediaConvert - replace video's audio track
 */

const { MediaConvertClient, CreateJobCommand } = require('@aws-sdk/client-mediaconvert');

async function simpleAudioOverlay() {
    console.log('🇲🇽 PERFECT TIMING MEXICO VIDEO SYNC');
    console.log('===================================');
    
    try {
        const mediaConvertClient = new MediaConvertClient({ region: 'us-east-1' });
        
        const videoS3Uri = 's3://youtube-automation-videos-786673323159-us-east-1/videos/Mexico-Travel-2025/mexico-final-perfect-timing.mp4';
        const audioS3Uri = 's3://youtube-automation-videos-786673323159-us-east-1/audio/Mexico-Travel-2025/.2e647db4-e34a-4970-9bd1-5a2c799a4e75.mp3';
        const outputS3Uri = 's3://youtube-automation-videos-786673323159-us-east-1/videos/Mexico-Travel-2025/mexico-synchronized-perfect.mp4';
        
        console.log('📹 Video Input:', videoS3Uri);
        console.log('🎵 Audio Input:', audioS3Uri);
        console.log('🎞️ Output:', outputS3Uri);
        
        // Much simpler job - just replace the audio track
        const jobParams = {
            Role: 'arn:aws:iam::786673323159:role/YoutubeAutomationMediaConvertRole',
            Settings: {
                Inputs: [
                    {
                        FileInput: videoS3Uri,
                        VideoSelector: {},
                        AudioSelectors: {
                            'Audio Selector 1': {
                                DefaultSelection: 'NOT_DEFAULT' // Ignore original audio
                            }
                        }
                    },
                    {
                        FileInput: audioS3Uri,
                        AudioSelectors: {
                            'Audio Selector 2': {
                                DefaultSelection: 'DEFAULT'
                            }
                        }
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
                                        AudioSourceName: 'Audio Selector 2'
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
        
        console.log('🚀 Starting simple overlay job...');
        
        const response = await mediaConvertClient.send(new CreateJobCommand(jobParams));
        
        console.log('✅ MediaConvert job started!');
        console.log('🆔 Job ID:', response.Job?.Id);
        console.log('📊 Status:', response.Job?.Status);
        
        return {
            success: true,
            jobId: response.Job?.Id,
            outputUri: outputS3Uri
        };
        
    } catch (error) {
        console.log('❌ MediaConvert job failed:', error.message);
        return null;
    }
}

simpleAudioOverlay().catch(console.error);