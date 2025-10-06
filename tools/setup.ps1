# YouTube Automation Platform Setup Script

Write-Host "🎬 YouTube Automation Platform Setup" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check Node.js version
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
    
    # Check if version is 18 or higher
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "⚠️  Warning: Node.js 18+ recommended (current: $nodeVersion)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check AWS CLI
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI" -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check CDK CLI
try {
    $cdkVersion = npx cdk --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ AWS CDK: $cdkVersion" -ForegroundColor Green
    } else {
        Write-Host "📦 Installing AWS CDK globally..." -ForegroundColor Yellow
        npm install -g aws-cdk
        $cdkVersion = cdk --version
        Write-Host "✅ AWS CDK installed: $cdkVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "📦 Installing AWS CDK globally..." -ForegroundColor Yellow
    npm install -g aws-cdk
}

# Install project dependencies
Write-Host "📦 Installing project dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure AWS credentials: aws configure"
Write-Host "2. Bootstrap CDK (first time): npx cdk bootstrap"
Write-Host "3. Deploy infrastructure: .\scripts\deploy.ps1"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  npm run build     - Build TypeScript"
Write-Host "  npm test          - Run tests"
Write-Host "  npm run synth     - Generate CloudFormation"
Write-Host "  npm run deploy    - Deploy to AWS"
Write-Host "  npm run diff      - Show changes"