// tests/lib/tools/definitions/shell.tool.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- The Definitive, Hoisting-Safe, TDZ-Aware Mocking Strategy ---

// 1. Use `vi.hoisted` to create a block of code that runs BEFORE all imports and mocks.
//    This creates our spy in a way that avoids the Temporal Dead Zone error.
const { mockExecAsync } = vi.hoisted(() => {
    return {
        mockExecAsync: vi.fn(),
    };
});

// 2. Mock the 'util' module. This is hoisted by Vitest to run after `vi.hoisted`.
vi.mock('util', () => ({
    // 3. The factory can now safely access `mockExecAsync` because it was initialized in the hoisted block.
    promisify: vi.fn().mockImplementation(() => mockExecAsync),
}));

// 4. Import the module to be tested. It will receive the fully configured mock.
import { runShellCommandTool } from '../../../../src/lib/tools/definitions/shell.tool';

describe('runShellCommandTool', () => {
    beforeEach(() => {
        // 5. Before each test, reset our spy's history.
        mockExecAsync.mockReset();
    });

    it('should return formatted stdout and stderr on successful execution', async () => {
        const mockResult = { stdout: 'Done.', stderr: '' };
        mockExecAsync.mockResolvedValue(mockResult);

        const result = await runShellCommandTool.execute({ command: 'ls -l' });

        expect(mockExecAsync).toHaveBeenCalledWith('ls -l', { timeout: 30000 });
        expect(result).toBe('STDOUT:\nDone.\nSTDERR:\n\nExit Code: 0');
    });

    it('should return formatted output and a non-zero exit code on failure', async () => {
        const error: any = new Error('Command failed');
        error.code = 127;
        error.stdout = 'Partial output';
        error.stderr = 'Command not found';
        mockExecAsync.mockRejectedValue(error);

        const result = await runShellCommandTool.execute({ command: 'invalid_command' });

        expect(result).toBe('Error: Command failed with exit code 127.\nSTDOUT:\nPartial output\nSTDERR:\nCommand not found');
    });

    it('should return a specific timeout error message', async () => {
        const error: any = new Error('Timeout');
        error.signal = 'SIGTERM';
        error.code = 1;
        error.stdout = 'Still running...';
        error.stderr = '';
        mockExecAsync.mockRejectedValue(error);

        const result = await runShellCommandTool.execute({ command: 'npm run dev' });

        expect(result).toContain('Error: Command timed out after 30 seconds.');
        expect(result).toContain('STDOUT:\nStill running...');
    });
});