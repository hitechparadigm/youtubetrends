# Test Suite

## 🧪 **Testing Structure**

This directory contains the comprehensive test suite for the YouTube Automation Platform.

### **Test Categories**

#### **Unit Tests** (`unit/`)
- Individual component testing
- Lambda function unit tests
- Utility function tests

#### **Integration Tests** (`integration/`)
- Service integration tests
- API integration tests
- Workflow integration tests

#### **End-to-End Tests** (`e2e/`)
- Complete pipeline tests
- Production scenario tests
- User journey tests

#### **Performance Tests** (`performance/`)
- Load testing
- Stress testing
- Scalability tests

### **Running Tests**

```bash
# Run all tests
npm test

# Run specific test category
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run with coverage
npm run test:coverage
```

### **Test Configuration**

Tests are configured using Jest with the following setup:
- TypeScript support
- AWS SDK mocking
- Environment variable management
- Coverage reporting

### **Key Test Files**

- `jest.config.js` - Jest configuration
- `setup.js` - Test environment setup
- `fixtures/` - Test data and mock responses
- `helpers/` - Test utility functions