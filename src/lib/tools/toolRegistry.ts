// src/lib/tools/toolRegistry.ts

import { Tool } from './tool';
import { fileSystemTools } from './definitions/fileSystem.tool';
import { shellTools } from './definitions/shell.tool';

/**
 * A central repository for managing and providing access to all available agent tools.
 * It enforces tool name uniqueness at initialization to prevent runtime conflicts.
 */
export class ToolRegistry {
    private readonly tools: Map<string, Tool<any>>;

    /**
     * Initializes the ToolRegistry with a given list of tools.
     * @param allTools An array of tool objects to be registered.
     * @throws {Error} If a duplicate tool name is detected during registration.
     */
    constructor(allTools: Tool<any>[]) {
        this.tools = new Map();
        for (const tool of allTools) {
            if (this.tools.has(tool.name)) {
                throw new Error(`Duplicate tool name detected: '${tool.name}'. Tool names must be unique.`);
            }
            this.tools.set(tool.name, tool);
        }
    }

    /**
     * Retrieves a single tool by its unique name.
     * @param name The name of the tool to retrieve.
     * @returns The tool object if found, otherwise undefined.
     */
    getTool(name: string): Tool<any> | undefined {
        return this.tools.get(name);
    }

    /**
     * Returns a list of all registered tools.
     * @returns A new array containing all tool objects.
     */
    getTools(): Tool<any>[] {
        return Array.from(this.tools.values());
    }
}

// --- Default Registry Instance ---

// Combine all tool definitions from across the system into a single list.
const allTools = [
    ...fileSystemTools,
    ...shellTools,
    // ...add other tool arrays here as they are created
];

/**
 * A default, pre-populated instance of the ToolRegistry.
 * This singleton is used throughout the agent core to ensure consistent access to all tools.
 */
export const toolRegistry = new ToolRegistry(allTools);