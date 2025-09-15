// src/lib/tools/secureToolExecutor.ts

import * as path from 'path';
import { z } from 'zod';
import { Tool } from './tool';
import { ToolRegistry } from './toolRegistry';

// A regex to detect potentially dangerous shell commands and metacharacters.
// This is a DENYLIST approach. A more secure, long-term solution would be an ALLOWLIST.
// Blocks: rm, sudo, mv, cp (as whole words), and command chaining characters.
const DANGEROUS_COMMAND_REGEX = /\b(rm|sudo|mv|cp)\b|(&&|\|\||;|`|\$\(|\<)/;

/**
 * The secure gateway for executing any tool.
 * This function enforces a series of security checks before delegating to the tool's
 * actual implementation. It is the single most critical security component in the agent core.
 *
 * @param toolName The name of the tool to execute.
 * @param rawInput The raw, untrusted input from the LLM.
 * @param toolRegistry An instance of the ToolRegistry to look up the tool.
 * @param workDir The absolute path to the agent's designated working directory. All file
 *                system operations must be confined within this directory.
 * @returns A promise that resolves to a string observation for the agent.
 */
export const secureExecuteTool = async (
    toolName: string,
    rawInput: unknown,
    toolRegistry: ToolRegistry,
    workDir: string,
): Promise<string> => {
    // 1. Tool Lookup Gate
    const tool = toolRegistry.getTool(toolName);
    if (!tool) {
        return `Error: Tool '${toolName}' not found.`;
    }

    // 2. Input Validation Gate
    const validationResult = tool.inputSchema.safeParse(rawInput);
    if (!validationResult.success) {
        const errorIssues = validationResult.error.issues
            .map((issue: { path: any[]; message: any; }) => `  - [${issue.path.join('.')}]: ${issue.message}`)
            .join('\n');
        return `Error: Invalid input for tool '${toolName}'.\nIssues:\n${errorIssues}`;
    }
    const validatedInput = validationResult.data;

    // 3. Pre-Execution Security Gates
    // These checks run on the *validated* input before the tool's logic is executed.

    // 3a. Path Sandboxing Gate (applies to any tool with a 'path' argument)
    if ('path' in validatedInput && typeof validatedInput.path === 'string') {
        const intendedPath = path.resolve(workDir, validatedInput.path);
        const workDirAbs = path.resolve(workDir);

        if (!intendedPath.startsWith(workDirAbs)) {
            return `Error: Path traversal attempt detected. Access to '${validatedInput.path}' is outside the allowed working directory.`;
        }
    }

    // 3b. Shell Command Security Gate (applies only to 'runShellCommand')
    if (tool.name === 'runShellCommand') {
        if (DANGEROUS_COMMAND_REGEX.test(validatedInput.command)) {
            return `Error: The command '${validatedInput.command}' is disallowed for security reasons.`;
        }
    }

    // 4. Execution Gate with Final Error Boundary
    try {
        return await tool.execute(validatedInput);
    } catch (error: any) {
        console.error(`[SecureExecutor] Uncaught error during execution of tool '${tool.name}':`, error);
        return `Error: An unexpected error occurred while executing the tool '${tool.name}'. Details: ${error.message}`;
    }
};