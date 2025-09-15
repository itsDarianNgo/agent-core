// tests/lib/tools/secureToolExecutor.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'; // Import beforeEach
import { z } from 'zod';
import { secureExecuteTool } from '../../../src/lib/tools/secureToolExecutor';
import { ToolRegistry } from '../../../src/lib/tools/toolRegistry';
import { Tool } from '../../../src/lib/tools/tool';

// --- Mocks Setup ---
const mockToolWithPath: Tool<any> = {
    name: 'toolWithPath',
    description: 'A tool that takes a path.',
    inputSchema: z.object({ path: z.string() }),
    execute: vi.fn(async ({ path }) => `Executed with path: ${path}`),
};

const mockShellTool: Tool<any> = {
    name: 'runShellCommand',
    description: 'A mock shell tool.',
    inputSchema: z.object({ command: z.string() }),
    execute: vi.fn(async ({ command }) => `Executed command: ${command}`),
};

const mockToolThatThrows: Tool<any> = {
    name: 'toolThatThrows',
    description: 'A tool designed to fail.',
    inputSchema: z.object({}),
    execute: vi.fn(async () => { throw new Error('Internal tool failure'); }),
};

const mockRegistry = new ToolRegistry([mockToolWithPath, mockShellTool, mockToolThatThrows]);
const WORK_DIR = '/home/agent/workspace';

describe('secureExecuteTool', () => {
    // --- THIS IS THE FIX ---
    // This hook runs before each 'it' block, resetting the state of all mocks.
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return an error if the tool is not found', async () => {
        const result = await secureExecuteTool('nonexistent', {}, mockRegistry, WORK_DIR);
        expect(result).toBe("Error: Tool 'nonexistent' not found.");
    });

    it('should return a Zod validation error for invalid input', async () => {
        const result = await secureExecuteTool('toolWithPath', { wrongParam: 'value' }, mockRegistry, WORK_DIR);
        expect(result).toContain("Error: Invalid input for tool 'toolWithPath'");
        expect(result).toContain("- [path]: Invalid input: expected string, received undefined");
    });

    describe('Path Sandboxing Gate', () => {
        it('should allow paths within the working directory', async () => {
            const input = { path: 'safe/file.txt' };
            await secureExecuteTool('toolWithPath', input, mockRegistry, WORK_DIR);
            expect(mockToolWithPath.execute).toHaveBeenCalledWith(input);
        });

        it('should block path traversal attempts (../)', async () => {
            const input = { path: '../outside.txt' };
            const result = await secureExecuteTool('toolWithPath', input, mockRegistry, WORK_DIR);
            expect(result).toContain('Error: Path traversal attempt detected.');
            expect(mockToolWithPath.execute).not.toHaveBeenCalled();
        });

        it('should block absolute paths outside the working directory', async () => {
            const input = { path: '/etc/passwd' };
            const result = await secureExecuteTool('toolWithPath', input, mockRegistry, WORK_DIR);
            expect(result).toContain('Error: Path traversal attempt detected.');
            expect(mockToolWithPath.execute).not.toHaveBeenCalled();
        });
    });

    describe('Shell Command Security Gate', () => {
        it('should allow safe shell commands', async () => {
            const input = { command: 'npm install' };
            await secureExecuteTool('runShellCommand', input, mockRegistry, WORK_DIR);
            expect(mockShellTool.execute).toHaveBeenCalledWith(input);
        });

        it('should block dangerous commands like "rm"', async () => {
            const input = { command: 'rm -rf /' };
            const result = await secureExecuteTool('runShellCommand', input, mockRegistry, WORK_DIR);
            expect(result).toContain("Error: The command 'rm -rf /' is disallowed for security reasons.");
            expect(mockShellTool.execute).not.toHaveBeenCalled();
        });

        it('should block commands with chaining characters like "&&"', async () => {
            const input = { command: 'npm install && rm -rf /' };
            const result = await secureExecuteTool('runShellCommand', input, mockRegistry, WORK_DIR);
            expect(result).toContain("is disallowed for security reasons.");
            expect(mockShellTool.execute).not.toHaveBeenCalled();
        });
    });

    describe('Execution Gate', () => {
        it('should gracefully handle unexpected errors from within a tool', async () => {
            const result = await secureExecuteTool('toolThatThrows', {}, mockRegistry, WORK_DIR);
            expect(result).toBe("Error: An unexpected error occurred while executing the tool 'toolThatThrows'. Details: Internal tool failure");
        });
    });
});