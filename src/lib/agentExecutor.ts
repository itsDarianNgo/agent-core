// src/lib/agentExecutor.ts

import { streamText } from 'ai';
import { AgentState } from './state/agentState';
import { generateAgentPrompt } from './prompts/agent.prompt';
import { secureExecuteTool } from './tools/secureToolExecutor';
import { toolRegistry } from './tools/toolRegistry';
import { AgentAction } from './state/agentState';
import { Tool } from './tools/tool';

// Event Types (unchanged)
export type TextDeltaEvent = { type: 'text-delta'; delta: string };
export type ThoughtEvent = { type: 'thought'; thought: string };
export type ToolCallEvent = { type: 'tool-call'; action: AgentAction };
export type ToolOutputEvent = { type: 'tool-output'; observation: string };
export type FinishEvent = { type: 'finish'; result: string };
export type ErrorEvent = { type: 'error'; message: string };
export type AgentEvent = TextDeltaEvent | ThoughtEvent | ToolCallEvent | ToolOutputEvent | FinishEvent | ErrorEvent;

// Options (unchanged)
export interface AgentExecutorOptions {
    goal: string;
    workDir: string;
    maxSteps?: number;
    model: any;
}

// Parsing Logic (unchanged)
const thoughtRegex = /<thought>(.*?)<\/thought>/s;
const actionRegex = /<action tool="([^"]+)" args='(.*?)'><\/action>/s;
const finishRegex = /<finish>(.*?)<\/finish>/s;

function parseAgentResponse(responseText: string): { thought?: string; action?: AgentAction; finish?: string; error?: string } {
    const thoughtMatch = responseText.match(thoughtRegex);
    const actionMatch = responseText.match(actionRegex);
    const finishMatch = responseText.match(finishRegex);
    const thought = thoughtMatch?.[1];

    if (finishMatch) return { thought, finish: finishMatch[1] };
    if (actionMatch) {
        try {
            return { thought, action: { toolName: actionMatch[1], args: JSON.parse(actionMatch[2]) } };
        } catch (e: any) {
            return { error: `Failed to parse action args JSON: ${e.message}` };
        }
    }
    return { error: "LLM response did not contain a valid <action> or <finish> tag." };
}

export async function* runAgent(options: AgentExecutorOptions): AsyncGenerator<AgentEvent> {
    const { goal, workDir, model, maxSteps = 10 } = options;
    const state = new AgentState(goal);
    const allTools = toolRegistry.getTools();
    const sdkTools: Record<string, Tool<any>> = Object.fromEntries(
        allTools.map(tool => [tool.name, tool])
    );

    for (let step = 0; step < maxSteps; step++) {
        const prompt = generateAgentPrompt(state);

        // --- THIS IS THE DEFINITIVE FIX ---
        // `streamText` is a SYNCHRONOUS function that returns a result object.
        // It should NOT be awaited.
        const result = streamText({
            model,
            system: prompt,
            messages: [],
            tools: sdkTools,
        });

        for await (const delta of result.textStream) {
            yield { type: 'text-delta', delta };
        }
        const fullResponse = await result.text;

        const parsed = parseAgentResponse(fullResponse);
        if (parsed.error) {
            yield { type: 'error', message: parsed.error };
            return;
        }
        const thought = parsed.thought ?? "No thought provided.";
        yield { type: 'thought', thought };

        if (parsed.finish) {
            yield { type: 'finish', result: parsed.finish };
            return;
        }

        if (parsed.action) {
            const action = parsed.action;
            yield { type: 'tool-call', action };
            const observation = await secureExecuteTool(action.toolName, action.args, toolRegistry, workDir);
            yield { type: 'tool-output', observation };
            state.addStep({ thought, action, observation });
        } else {
            yield { type: 'error', message: 'The agent did not produce a valid action or finish response.' };
            return;
        }
    }

    yield { type: 'error', message: `Agent stopped after reaching the maximum of ${maxSteps} steps.` };
}