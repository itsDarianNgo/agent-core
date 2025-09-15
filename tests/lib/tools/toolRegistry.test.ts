// tests/lib/tools/toolRegistry.test.ts

import { describe, it, expect } from 'vitest';
import { ToolRegistry, toolRegistry as defaultRegistry } from '../../../src/lib/tools/toolRegistry';
import { Tool } from '../../../src/lib/tools/tool';
import { z } from 'zod';

const mockTool1: Tool<any> = {
    name: 'toolOne',
    description: 'First tool',
    inputSchema: z.object({}),
    execute: async () => 'one',
};

const mockTool2: Tool<any> = {
    name: 'toolTwo',
    description: 'Second tool',
    inputSchema: z.object({}),
    execute: async () => 'two',
};

describe('ToolRegistry', () => {
    it('should register tools and allow retrieval', () => {
        const registry = new ToolRegistry([mockTool1, mockTool2]);
        expect(registry.getTool('toolOne')).toBe(mockTool1);
        expect(registry.getTool('toolTwo')).toBe(mockTool2);
        expect(registry.getTool('nonexistent')).toBeUndefined();
    });

    it('should return a list of all tools', () => {
        const registry = new ToolRegistry([mockTool1, mockTool2]);
        const allTools = registry.getTools();
        expect(allTools).toHaveLength(2);
        expect(allTools).toContain(mockTool1);
        expect(allTools).toContain(mockTool2);
    });

    it('should throw an error if a duplicate tool name is registered', () => {
        const duplicateTool: Tool<any> = { ...mockTool2, name: 'toolOne' };
        const action = () => new ToolRegistry([mockTool1, duplicateTool]);
        expect(action).toThrow("Duplicate tool name detected: 'toolOne'. Tool names must be unique.");
    });

    it('should instantiate the default registry with all real tools', () => {
        expect(defaultRegistry.getTool('readFile')).toBeDefined();
        expect(defaultRegistry.getTool('writeFile')).toBeDefined();
        expect(defaultRegistry.getTool('listFiles')).toBeDefined();
        expect(defaultRegistry.getTool('runShellCommand')).toBeDefined();
        expect(defaultRegistry.getTools().length).toBeGreaterThanOrEqual(4);
    });
});