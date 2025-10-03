# YouTube Automation Platform Deployment Script (PowerShell)

param(
    [string]$Environment = "production",
    [string]$Region = "us-east-1",
    [string]$Profile = "",
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\scripts\deploy.ps1 [OPTIONS]"
    Write-Host "Options:"
    Write-Host "  -Environment    Environment to deploy to (default: production)"
    Write-Host "  -Region         AWS region (default: us-east-1)"
    Write-Host "  -Profile        AWS profile to use"
    Write-Host "  -Help           Show this help message"
    exit 0
}

Write-Host "🚀 Deploying YouTube Automation Platform" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# Set AWS profile if provided
if ($Profile) {
    Write-Host "Profile: $Profile" -ForegroundColor Yellow
    $env:AWS_PROFILE = $Profile
}

# Check if AWS CLI is configured
try {
    $null = aws sts get-caller-identity 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not configured"
    }
} catch {
    Write-Host "❌ AWS CLI not configured or credentials invalid" -ForegroundColor Red
    exit 1
}

# Get AWS account ID
$AccountId = aws sts get-caller-identity --query Account --output text
Write-Host "Account ID: $AccountId" -ForegroundColor Yellow

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Green
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}

# Synthesize CloudFormation template
Write-Host "📋 Synthesizing CloudFormation template..." -ForegroundColor Green
npm run synth
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CDK synth failed" -ForegroundColor Red
    exit 1
}

# Deploy to AWS
Write-Host "☁️  Deploying to AWS..." -ForegroundColor Green
$env:CDK_DEFAULT_ACCOUNT = $AccountId
$env:CDK_DEFAULT_REGION = $Region

npx cdk deploy --require-approval never --context environment=$Environment --context region=$Region
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green

# Display outputs
Write-Host "📊 Stack Outputs:" -ForegroundColor Green
aws cloudformation describe-stacks --stack-name YoutubeAutomationPlatformStack --region $Region --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' --output table

Write-Host "🎉 YouTube Automation Platform is ready!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure YouTube API credentials in Secrets Manager"
Write-Host "2. Implement Lambda functions for the pipeline"
Write-Host "3. Create Step Functions workflow"
Write-Host "4. Set up EventBridge schedules"