// src/lib/tools/tool.ts

import { z } from 'zod';

/**
 * Defines the core interface for any tool that an agent can use.
 * This interface establishes a strict contract to ensure that all tools are secure,
 * well-documented, and predictable.
 *
 * @template T - A ZodObject schema that defines the input validation for the tool.
 */
export interface Tool<T extends z.ZodObject<any>> {
    /**
     * A unique, machine-readable name for the tool.
     * This is the identifier the LLM will use to call the tool.
     *
     * It should be in camelCase and contain no spaces or special characters.
     * @example "readFile"
     * @example "runShellCommand"
     */
    name: string;

    /**
     * A detailed, human-readable description of what the tool does, its parameters,
     * and what it returns. This is the primary source of information for the LLM
     * to decide when and how to use the tool.
     *
     * It should be written as if you are documenting an API endpoint for a human developer.
     * Be explicit about the purpose, the expected inputs, and the format of the output string.
     *
     * @example "Reads the entire content of a file at the specified path and returns it as a string."
     */
    description: string;

    /**
     * A Zod schema that defines the structure, types, and validation rules for the tool's input.
     * The agent's secure executor will use this schema to parse and validate the arguments
     * provided by the LLM before calling the `execute` function.
     * This is a critical security boundary.
     *
     * @example
     * z.object({
     *   path: z.string().describe("The relative path to the file to be read."),
     * })
     */
    inputSchema: T;

    /**
     * The actual implementation of the tool's logic.
     * This async function is called only after the input has been successfully validated
     * against the `inputSchema`.
     *
     * It must handle all potential errors gracefully by wrapping its logic in a try...catch
     * block. It should never throw an unhandled exception.
     *
     * @param input - The validated and type-safe input object, inferred from `inputSchema`.
     * @returns A promise that resolves to a string representing the "observation" for the agent.
     *          This could be the direct result of the tool's operation (e.g., file content)
     *          or a formatted error message (e.g., "Error: File not found at 'path/to/file'").
     */
    execute: (input: z.infer<T>) => Promise<string>;
}