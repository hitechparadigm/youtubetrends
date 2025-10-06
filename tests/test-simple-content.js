// Simple test to isolate ContentGenerationManager issue
const ContentGenerationManager = require('./ContentGenerationManager');

console.log('ContentGenerationManager type:', typeof ContentGenerationManager);
console.log('ContentGenerationManager name:', ContentGenerationManager.name);

try {
    const manager = new ContentGenerationManager({ environment: 'test' });
    console.log('✅ ContentGenerationManager created successfully');
    console.log('Instance type:', manager.constructor.name);
} catch (error) {
    console.error('❌ Failed to create ContentGenerationManager:', error);
}