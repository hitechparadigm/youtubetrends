# Contributing to YouTube Automation Platform

Thank you for your interest in contributing to the YouTube Automation Platform! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## 🤝 Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 8.0.0
- **AWS CLI**: Configured with appropriate permissions
- **Git**: Latest version

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/youtube-automation-platform.git
   cd youtube-automation-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Start Development**
   ```bash
   npm run dev:generate
   ```

## 📁 Project Structure

```
src/                    # Source code
├── lambda/            # Lambda functions
├── config/            # Configuration files
tools/                 # Development tools
├── development/       # Development scripts
├── deploy/           # Deployment scripts
├── management/       # Management utilities
deployment/           # Infrastructure & deployment
├── iam-policies/     # IAM policy templates
├── infrastructure/   # Infrastructure as Code
├── stepfunctions/    # Step Functions workflows
tests/                # Test suite
├── unit/            # Unit tests
├── integration/     # Integration tests
├── e2e/             # End-to-end tests
docs/                 # Documentation
```

## 🎯 Coding Standards

### TypeScript/JavaScript

- **Language**: TypeScript preferred, JavaScript acceptable
- **Style**: Prettier configuration (`.prettierrc`)
- **Linting**: ESLint configuration (`.eslintrc.js`)
- **Target**: ES2022, Node.js 20+

### Code Style

```typescript
// ✅ Good
export interface VideoConfig {
  durationSeconds: number;
  quality: 'high' | 'medium' | 'low';
  includeAudio: boolean;
}

export const generateVideo = async (config: VideoConfig): Promise<VideoResult> => {
  try {
    // Implementation
    return result;
  } catch (error) {
    logger.error('Video generation failed', { error, config });
    throw error;
  }
};

// ❌ Avoid
function generateVideo(config) {
  // No types, no error handling
  return result;
}
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `video-generator.ts`)
- **Functions**: `camelCase` (e.g., `generateVideo`)
- **Classes**: `PascalCase` (e.g., `VideoProcessor`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_DURATION`)
- **Interfaces**: `PascalCase` with descriptive names (e.g., `VideoConfig`)

### Error Handling

```typescript
// ✅ Proper error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { 
    error: error.message, 
    stack: error.stack,
    context: { /* relevant context */ }
  });
  
  // Re-throw with context or handle appropriately
  throw new Error(`Operation failed: ${error.message}`);
}
```

## 🧪 Testing Guidelines

### Test Structure

```typescript
// tests/unit/video-generator.test.ts
import { generateVideo } from '../../src/lambda/video-generator';

describe('VideoGenerator', () => {
  describe('generateVideo', () => {
    it('should generate video with valid config', async () => {
      // Arrange
      const config = { durationSeconds: 8, quality: 'high', includeAudio: true };
      
      // Act
      const result = await generateVideo(config);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.videoS3Key).toBeDefined();
    });

    it('should handle invalid config gracefully', async () => {
      // Arrange
      const config = { durationSeconds: -1 };
      
      // Act & Assert
      await expect(generateVideo(config)).rejects.toThrow('Invalid duration');
    });
  });
});
```

### Test Categories

1. **Unit Tests** (`tests/unit/`)
   - Test individual functions/classes
   - Mock external dependencies
   - Fast execution (< 1s per test)

2. **Integration Tests** (`tests/integration/`)
   - Test component interactions
   - Use real AWS services (test environment)
   - Moderate execution time (< 30s per test)

3. **End-to-End Tests** (`tests/e2e/`)
   - Test complete workflows
   - Use production-like environment
   - Longer execution time (< 5min per test)

### Running Tests

```bash
# All tests
npm test

# Specific test type
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```bash
# Feature
feat(video-generator): add support for 1-minute videos

Implement extended duration video generation with:
- Enhanced script generation for longer content
- Improved audio synchronization
- Updated cost calculations

Closes #123

# Bug fix
fix(audio-processor): resolve timing synchronization issue

Fixed audio-video sync problem where audio was 0.5s longer
than video, causing upload failures.

Fixes #456

# Documentation
docs(readme): update installation instructions

Added Node.js 20 requirement and updated AWS CLI setup steps.
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Run Quality Checks**
   ```bash
   npm run lint
   npm run format:check
   npm test
   npm run build
   ```

3. **Update Documentation**
   - Update relevant docs in `docs/`
   - Update README if needed
   - Add/update tests

### PR Requirements

- [ ] **Tests**: All tests pass
- [ ] **Linting**: No linting errors
- [ ] **Documentation**: Updated as needed
- [ ] **Changelog**: Entry added to `docs/CHANGELOG.md`
- [ ] **Breaking Changes**: Documented in PR description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)
```

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update Version**
   ```bash
   npm version patch|minor|major
   ```

2. **Update Changelog**
   - Add release notes to `docs/CHANGELOG.md`
   - Include all changes since last release

3. **Create Release PR**
   - Title: `Release v1.x.x`
   - Include changelog updates

4. **Tag Release**
   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

## 🛠️ Development Tools

### Available Scripts

```bash
# Development
npm run dev:generate          # Test video generation
npm run dev:test-complete     # Test complete workflow
npm run dev:test-upload       # Test YouTube upload

# Code Quality
npm run lint                  # Run ESLint
npm run lint:fix             # Fix ESLint issues
npm run format               # Format code with Prettier
npm run format:check         # Check formatting

# Testing
npm test                     # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report

# Build & Deploy
npm run build               # Build TypeScript
npm run deploy              # Deploy to AWS
npm run clean               # Clean build artifacts
```

### IDE Setup

#### VS Code Extensions

- **TypeScript**: Built-in
- **ESLint**: `dbaeumer.vscode-eslint`
- **Prettier**: `esbenp.prettier-vscode`
- **Jest**: `Orta.vscode-jest`
- **AWS Toolkit**: `AmazonWebServices.aws-toolkit-vscode`

#### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/yourusername/youtube-automation-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/youtube-automation-platform/discussions)
- **Documentation**: [docs/](docs/) directory

## 🏆 Recognition

Contributors will be recognized in:
- `README.md` contributors section
- Release notes for significant contributions
- Annual contributor acknowledgments

Thank you for contributing to the YouTube Automation Platform! 🎉