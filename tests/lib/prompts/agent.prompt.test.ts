// tests/lib/prompts/agent.prompt.test.ts

import { describe, it, expect } from 'vitest';
import { AgentState, AgentStep, AgentAction } from '../../../src/lib/state/agentState';
import { generateAgentPrompt } from '../../../src/lib/prompts/agent.prompt';

describe('generateAgentPrompt', () => {
    describe('when agent state has no history', () => {
        it('should generate a correct initial prompt', () => {
            // The prompt generator no longer needs tool definitions.
            const state = new AgentState('Find the weather in London');
            const prompt = generateAgentPrompt(state);

            expect(prompt).toContain('You are an expert software development assistant.');
            expect(prompt).toContain("User's Goal: Find the weather in London");
            expect(prompt).not.toContain('--- History ---');
        });
    });

    describe('when agent state has history', () => {
        it('should generate a prompt including the formatted scratchpad', () => {
            const state = new AgentState('Find the weather in Paris');
            const mockAction: AgentAction = { toolName: 'getWeather', args: { city: 'Paris' } };
            const mockStep: AgentStep = {
                thought: 'I should use the getWeather tool.',
                action: mockAction,
                observation: 'The weather in Paris is sunny.',
            };
            state.addStep(mockStep);

            const prompt = generateAgentPrompt(state);

            expect(prompt).toContain('--- History ---');
            expect(prompt).toContain('<thought>I should use the getWeather tool.</thought>');
            const expectedActionString = `<action tool="getWeather" args='${JSON.stringify({ city: "Paris" })}'></action>`;
            expect(prompt).toContain(expectedActionString);
            expect(prompt).toContain('<observation>The weather in Paris is sunny.</observation>');
        });
    });
});