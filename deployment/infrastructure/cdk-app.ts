#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { YouTubeAutomationStack } from './lib/youtube-automation-stack';

const app = new cdk.App();

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Create the main stack
new YouTubeAutomationStack(app, 'YouTubeAutomationStack', {
  env,
  description: 'YouTube Automation Platform - Serverless video generation and upload system',
  tags: {
    Project: 'YouTubeAutomation',
    Environment: process.env.ENVIRONMENT || 'dev',
    Owner: 'ContentCreator'
  }
});