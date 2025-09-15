// tests/lib/tools/definitions/shell.tool.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as util from 'util';
import { runShellCommandTool } from '../../../../src/lib/tools/definitions/shell.tool';

// --- The definitive mocking strategy ---
// 1. Create a single, reusable mock function that will stand in for `execAsync`.
const mockExecAsync = vi.fn();

// 2. Spy on `util.promisify`. When the production code calls it to create `execAsync`,
//    we intercept that call and return OUR mock function instead of the real one.
vi.spyOn(util, 'promisify').mockImplementation(() => mockExecAsync);


describe('runShellCommandTool', () => {
    beforeEach(() => {
        // Before each test, reset the history and behavior of our mock function.
        mockExecAsync.mockReset();
    });

    afterEach(() => {
        // After all tests in this file, restore the original `util.promisify`.
        vi.restoreAllMocks();
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
        error.code = 1; // SIGTERM often results in a non-zero exit code
        error.stdout = 'Still running...';
        error.stderr = '';
        mockExecAsync.mockRejectedValue(error);

        const result = await runShellCommandTool.execute({ command: 'npm run dev' });

        expect(result).toContain('Error: Command timed out after 30 seconds.');
        expect(result).toContain('STDOUT:\nStill running...');
    });
});