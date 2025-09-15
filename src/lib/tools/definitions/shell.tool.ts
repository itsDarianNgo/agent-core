// src/lib/tools/definitions/shell.tool.ts

import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool } from '../tool';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

const runShellCommandSchema = z.object({
    command: z
        .string()
        .describe(
            'The shell command to execute. The command will be run in a sandboxed environment.',
        ),
});

const COMMAND_TIMEOUT = 30000; // 30 seconds

export const runShellCommandTool: Tool<typeof runShellCommandSchema> = {
    name: 'runShellCommand',
    description:
        'Executes a shell command and returns its standard output, standard error, and exit code. Use this for tasks like installing dependencies, running tests, or other command-line operations.',
    inputSchema: runShellCommandSchema,
    execute: async ({ command }) => {
        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout: COMMAND_TIMEOUT,
            });

            return `STDOUT:\n${stdout}\nSTDERR:\n${stderr}\nExit Code: 0`;
        } catch (error: any) {
            // 'error' from exec contains stdout and stderr from the failed command
            const stdout = error.stdout || 'No stdout produced.';
            const stderr = error.stderr || 'No stderr produced.';
            const exitCode = error.code || 1; // Default to 1 if no code is present

            if (error.signal === 'SIGTERM') {
                return `Error: Command timed out after ${
                    COMMAND_TIMEOUT / 1000
                } seconds.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\nExit Code: ${exitCode}`;
            }

            return `Error: Command failed with exit code ${exitCode}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`;
        }
    },
};

// Export all shell tools as a single array
export const shellTools = [runShellCommandTool];