// src/lib/prompts/agent.prompt.ts

import { AgentState, AgentStep } from '../state/agentState';

function formatScratchpadForPrompt(steps: readonly AgentStep[]): string {
    if (steps.length === 0) return '';
    return (
        '\n--- History ---\n' +
        steps.map((step) => {
            const actionArgsJson = JSON.stringify(step.action.args);
            return `<thought>${step.thought}</thought>
<action tool="${step.action.toolName}" args='${actionArgsJson}'></action>
<observation>${step.observation}</observation>`;
        }).join('\n') +
        '\n--- End History ---\n'
    );
}

/**
 * Generates the system prompt for the agent.
 * Tool definitions are now handled by the Vercel AI SDK directly.
 */
export function generateAgentPrompt(state: AgentState): string {
    const formattedScratchpad = formatScratchpadForPrompt(state.getSteps());

    return `You are an expert software development assistant. Your task is to accurately and efficiently resolve the user's request by thinking step-by-step and using the provided tools.

Your response must always be in the following format:

<thought>Your reasoning for the next step, considering previous actions and observations.</thought>
<action tool="toolName" args='{"arg1": "value1", "arg2": "value2"}'></action>

If you have achieved the goal or cannot make further progress, you must respond with:

<thought>Your final conclusion or explanation.</thought>
<finish>Your final answer or summary of the task.</finish>

${formattedScratchpad}

--- Current Task ---
User's Goal: ${state.getGoal()}
What is your next thought and action?`;
}