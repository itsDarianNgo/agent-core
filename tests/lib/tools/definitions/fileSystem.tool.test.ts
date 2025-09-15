// tests/lib/tools/definitions/fileSystem.tool.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { readFileTool, writeFileTool, listFilesTool } from '../../../../src/lib/tools/definitions/fileSystem.tool';

// Step 1: Tell Vitest to prepare the 'fs/promises' module for mocking, but without a factory.
vi.mock('fs/promises');

describe('File System Tools', () => {
    // Step 2: Use restoreAllMocks to completely reset spies created with vi.spyOn
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('readFileTool', () => {
        it('should read and return file content successfully', async () => {
            const mockContent = 'Hello, agent!';
            // Step 3: Create a spy for this specific test case
            vi.spyOn(fs, 'readFile').mockResolvedValue(mockContent);

            const result = await readFileTool.execute({ path: 'test.txt' });

            expect(fs.readFile).toHaveBeenCalledWith('test.txt', 'utf-8');
            expect(result).toBe(mockContent);
        });

        it('should return a formatted error if the file is not found', async () => {
            const error = new Error('File not found') as any;
            error.code = 'ENOENT';
            vi.spyOn(fs, 'readFile').mockRejectedValue(error);

            const result = await readFileTool.execute({ path: 'nonexistent.txt' });

            expect(result).toBe("Error: File not found at 'nonexistent.txt'.");
        });
    });

    describe('writeFileTool', () => {
        it('should write content to a file and return a success message', async () => {
            vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);
            vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

            const content = 'This is a test.';
            const result = await writeFileTool.execute({ path: 'dir/output.txt', content });

            expect(fs.mkdir).toHaveBeenCalledWith('dir', { recursive: true });
            expect(fs.writeFile).toHaveBeenCalledWith('dir/output.txt', content, 'utf-8');
            expect(result).toBe(`Successfully wrote ${content.length} bytes to 'dir/output.txt'.`);
        });

        it('should return a formatted error if writing fails', async () => {
            const error = new Error('Permission denied');
            vi.spyOn(fs, 'writeFile').mockRejectedValue(error);

            const result = await writeFileTool.execute({ path: 'locked.txt', content: '...' });

            expect(result).toBe('Error writing file: Permission denied');
        });
    });

    describe('listFilesTool', () => {
        it('should list directory entries joined by newlines', async () => {
            const entries = ['file1.ts', 'file2.js', 'subdir'];
            vi.spyOn(fs, 'readdir').mockResolvedValue(entries as any);

            const result = await listFilesTool.execute({ path: './src' });

            expect(fs.readdir).toHaveBeenCalledWith('./src');
            expect(result).toBe('file1.ts\nfile2.js\nsubdir');
        });

        it('should return a specific message for an empty directory', async () => {
            vi.spyOn(fs, 'readdir').mockResolvedValue([]);

            const result = await listFilesTool.execute({ path: './empty' });

            expect(result).toBe("Directory './empty' is empty.");
        });

        it('should return a formatted error if the directory does not exist', async () => {
            const error = new Error('Dir not found') as any;
            error.code = 'ENOENT';
            vi.spyOn(fs, 'readdir').mockRejectedValue(error);

            const result = await listFilesTool.execute({ path: './nonexistent' });

            expect(result).toBe("Error: Directory not found at './nonexistent'.");
        });
    });
});