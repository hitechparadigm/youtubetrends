/**
 * Test script for PromptTemplateManager
 * 
 * This script tests the core functionality of the PromptTemplateManager
 * including template loading, rendering, variable substitution, and caching.
 */

const PromptTemplateManager = require('./PromptTemplateManager');
const ConfigurationManager = require('./ConfigurationManager');

async function testPromptTemplateManager() {
    console.log('🧪 Testing PromptTemplateManager...\n');

    try {
        // Initialize managers
        const configManager = new ConfigurationManager({
            environment: 'test',
            region: 'us-east-1'
        });

        const templateManager = new PromptTemplateManager({
            environment: 'test',
            region: 'us-east-1',
            bucket: 'youtube-automation-prompts-test',
            configManager
        });

        // Test 1: Template rendering with variable substitution
        console.log('📝 Test 1: Template rendering with variable substitution');
        
        const scriptVariables = {
            duration: 8,
            topic: 'ETF investing strategies',
            investment_type: 'ETF',
            audience: 'beginners',
            key_concepts: ['diversification', 'expense ratios', 'long-term growth'],
            advice_type: 'practical',
            risk_warning: 'investment risks',
            call_to_action: 'start your investment journey'
        };

        const renderedScript = await templateManager.renderTemplate(
            'script',
            'investing',
            scriptVariables,
            { userId: 'test-user-123' }
        );

        console.log('✅ Rendered script template:');
        console.log(renderedScript);
        console.log();

        // Test 2: Title template rendering
        console.log('📝 Test 2: Title template rendering');
        
        const titleVariables = {
            number: 5,
            investment_type: 'ETF',
            audience: 'Beginner',
            year: 2025
        };

        const renderedTitle = await templateManager.renderTemplate(
            'title',
            'investing',
            titleVariables,
            { userId: 'test-user-123' }
        );

        console.log('✅ Rendered title template:');
        console.log(renderedTitle);
        console.log();

        // Test 3: Description template rendering
        console.log('📝 Test 3: Description template rendering');
        
        const descriptionVariables = {
            investment_type: 'ETF',
            audience: 'beginners',
            goals: 'build wealth',
            topics: ['portfolio diversification', 'expense ratios', 'long-term strategies'],
            outcomes: 'make informed investment decisions',
            disclaimer: 'Remember: all investments carry risk.'
        };

        const renderedDescription = await templateManager.renderTemplate(
            'description',
            'investing',
            descriptionVariables,
            { userId: 'test-user-123' }
        );

        console.log('✅ Rendered description template:');
        console.log(renderedDescription);
        console.log();

        // Test 4: Video prompt template rendering
        console.log('📝 Test 4: Video prompt template rendering');
        
        const videoPromptVariables = {
            duration: 8,
            visual_elements: ['charts', 'graphs', 'financial symbols'],
            color_scheme: 'blue and green',
            graphics: 'professional financial graphics',
            tone: 'trustworthy and authoritative'
        };

        const renderedVideoPrompt = await templateManager.renderTemplate(
            'video_prompt',
            'investing',
            videoPromptVariables,
            { userId: 'test-user-123' }
        );

        console.log('✅ Rendered video prompt template:');
        console.log(renderedVideoPrompt);
        console.log();

        // Test 5: Different topic (education)
        console.log('📝 Test 5: Education topic template rendering');
        
        const educationVariables = {
            duration: 8,
            topic: 'machine learning fundamentals',
            concepts: ['supervised learning', 'neural networks'],
            audience: 'students',
            examples: 'real-world AI applications',
            learning_outcomes: 'practical ML skills',
            tone: 'friendly',
            engaging_elements: 'interactive demonstrations'
        };

        const renderedEducation = await templateManager.renderTemplate(
            'script',
            'education',
            educationVariables,
            { userId: 'test-user-456' }
        );

        console.log('✅ Rendered education script template:');
        console.log(renderedEducation);
        console.log();

        // Test 6: Template with conditional blocks
        console.log('📝 Test 6: Template with conditional blocks');
        
        // Create a template with conditionals for testing
        const conditionalTemplate = {
            template: 'Create a video about {topic}. {if:includeWarning}⚠️ Important: {warning}{/if} {if:hasExamples}Examples: {for:examples}{item}, {/for}{/if}',
            variables: {}
        };

        const conditionalVariables = {
            topic: 'cryptocurrency investing',
            includeWarning: true,
            warning: 'High volatility investment',
            hasExamples: true,
            examples: ['Bitcoin', 'Ethereum', 'Cardano']
        };

        const renderedConditional = templateManager.substituteVariables(
            conditionalTemplate.template,
            conditionalVariables
        );

        console.log('✅ Rendered conditional template:');
        console.log(renderedConditional);
        console.log();

        // Test 7: Template performance tracking
        console.log('📝 Test 7: Template performance tracking');
        
        await templateManager.trackTemplateUsage(
            'script',
            'investing',
            'control',
            'test-user-123'
        );

        console.log('✅ Template usage tracked successfully');
        console.log();

        // Test 8: Cache functionality
        console.log('📝 Test 8: Cache functionality test');
        
        const startTime = Date.now();
        await templateManager.renderTemplate('script', 'investing', scriptVariables);
        const firstCallTime = Date.now() - startTime;

        const startTime2 = Date.now();
        await templateManager.renderTemplate('script', 'investing', scriptVariables);
        const secondCallTime = Date.now() - startTime2;

        console.log(`✅ First call: ${firstCallTime}ms, Second call (cached): ${secondCallTime}ms`);
        console.log();

        // Test 9: Default template fallback
        console.log('📝 Test 9: Default template fallback');
        
        const defaultTemplate = await templateManager.getDefaultTemplate('script', 'unknown_topic');
        console.log('✅ Default template fallback:');
        console.log(JSON.stringify(defaultTemplate, null, 2));
        console.log();

        console.log('🎉 All PromptTemplateManager tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testPromptTemplateManager();
}

module.exports = { testPromptTemplateManager };