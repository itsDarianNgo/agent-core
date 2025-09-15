// src/lib/tools/definitions/fileSystem.tool.ts

import {z} from 'zod';
import {promises as fs} from 'fs';
import * as path from 'path';
import {Tool} from '../tool';

const readFileSchema = z.object({
    path: z.string().describe('The relative path to the file to be read.'),
});

export const readFileTool: Tool<typeof readFileSchema> = {
    name: 'readFile',
    description: 'Reads the entire content of a file at the specified path and returns it as a string. The path should be relative to the current working directory.',
    inputSchema: readFileSchema,
    execute: async ({ path: filePath }) => {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `Error: File not found at '${filePath}'.`;
            }
            return `Error reading file: ${error.message}`;
        }
    },
};

const writeFileSchema = z.object({
    path: z.string().describe('The relative path for the file to be written. The path should be relative to the current working directory.'),
    content: z.string().describe('The content to be written to the file.'),
});

export const writeFileTool: Tool<typeof writeFileSchema> = {
    name: 'writeFile',
    description: 'Writes content to a file at a specified path. If the file exists, it will be overwritten. If the parent directories do not exist, they will be created.',
    inputSchema: writeFileSchema,
    execute: async ({ path: filePath, content }) => {
        try {
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');
            return `Successfully wrote ${content.length} bytes to '${filePath}'.`;
        } catch (error: any) {
            return `Error writing file: ${error.message}`;
        }
    },
};

const listFilesSchema = z.object({
    path: z.string().describe("The path to the directory whose contents are to be listed. Use '.' for the current directory."),
});

export const listFilesTool: Tool<typeof listFilesSchema> = {
    name: 'listFiles',
    description: "Lists all files and subdirectories within a specified directory. Returns a newline-separated list of names.",
    inputSchema: listFilesSchema,
    execute: async ({ path: dirPath }) => {
        try {
            const entries = await fs.readdir(dirPath);
            if (entries.length === 0) {
                return `Directory '${dirPath}' is empty.`;
            }
            return entries.join('\n');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `Error: Directory not found at '${dirPath}'.`;
            }
            return `Error listing files: ${error.message}`;
        }
    },
};

// Export all file system tools as a single array for easy registration
export const fileSystemTools = [readFileTool, writeFileTool, listFilesTool];