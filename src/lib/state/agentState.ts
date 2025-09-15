// src/lib/state/agentState.ts

/**
 * Defines the internal, stable representation of a tool call action.
 * This decouples our core logic from the specific types of the Vercel AI SDK.
 */
export type AgentAction = {
    toolName: string;
    args: unknown; // Arguments can be any JSON-like object
};

/**
 * Defines the structure for a single step in the agent's execution history.
 * Each step represents one complete "Think-Act-Observe" cycle.
 */
export type AgentStep = {
    /**
     * The LLM's reasoning or "thought" process that led to the action.
     */
    thought: string;

    /**
     * The tool call action chosen by the LLM, translated into our stable internal format.
     */
    action: AgentAction;

    /**
     * The string result (observation) returned from executing the action.
     */
    observation: string;
};

/**
 * Manages the state for a single, ephemeral run of an agent.
 * It serves as the agent's short-term memory or "scratchpad."
 */
export class AgentState {
    private readonly goal: string;
    private readonly steps: AgentStep[];

    constructor(goal: string) {
        this.goal = goal;
        this.steps = [];
    }

    public getGoal(): string {
        return this.goal;
    }

    public getSteps(): readonly AgentStep[] {
        return this.steps;
    }

    public addStep(step: AgentStep): void {
        this.steps.push(step);
    }
}