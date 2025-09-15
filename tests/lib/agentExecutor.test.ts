// tests/lib/agentExecutor.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamText, StreamTextResult } from 'ai';
import { runAgent, AgentEvent } from '../../src/lib/agentExecutor';
import { secureExecuteTool } from '../../src/lib/tools/secureToolExecutor';
import { AgentAction } from '../../src/lib/state/agentState';

// Mock the dependencies
vi.mock('ai');
vi.mock('../../src/lib/tools/secureToolExecutor', () => ({
    secureExecuteTool: vi.fn(),
}));

// Helper to create a mock StreamTextResult
const mockStreamTextResponse = (content: string): StreamTextResult<any, any> => {
    const textStream = (async function* () {
        yield content;
    })();
    return {
        textStream,
        text: Promise.resolve(content),
    } as any;
};

// Helper to collect all non-delta events from the async generator
async function collectEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
    const events: AgentEvent[] = [];
    for await (const event of generator) {
        if (event.type !== 'text-delta') {
            events.push(event);
        }
    }
    return events;
}

describe('agentExecutor', () => {
    const mockOptions = {
        goal: 'Test goal',
        workDir: '/test/workdir',
        model: {} as any,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should run a two-step "happy path" successfully', async () => {
        const firstLLMResponse = `<thought>I need to read a file.</thought><action tool="readFile" args='{"path":"./file.txt"}'></action>`;
        const secondLLMResponse = `<thought>I have read the file. The task is complete.</thought><finish>File content is: Hello</finish>`;

        vi.mocked(streamText)
            .mockReturnValueOnce(mockStreamTextResponse(firstLLMResponse))
            .mockReturnValueOnce(mockStreamTextResponse(secondLLMResponse));

        vi.mocked(secureExecuteTool).mockResolvedValueOnce("File content is: Hello");

        const events = await collectEvents(runAgent(mockOptions));

        expect(events).toHaveLength(5);
        expect(events[0]).toEqual({ type: 'thought', thought: 'I need to read a file.' });
        expect(events[1]).toEqual({ type: 'tool-call', action: { toolName: 'readFile', args: { path: './file.txt' } } });
        expect(events[2]).toEqual({ type: 'tool-output', observation: 'File content is: Hello' });
        expect(events[3]).toEqual({ type: 'thought', thought: 'I have read the file. The task is complete.' });
        expect(events[4]).toEqual({ type: 'finish', result: 'File content is: Hello' });

        expect(secureExecuteTool).toHaveBeenCalledOnce();
        expect(secureExecuteTool).toHaveBeenCalledWith('readFile', { path: './file.txt' }, expect.anything(), '/test/workdir');
    });

    it('should handle a tool execution error and continue the loop', async () => {
        const firstLLMResponse = `<thought>I will try a failing command.</thought><action tool="runShellCommand" args='{"command":"exit 1"}'></action>`;
        const secondLLMResponse = `<thought>The command failed. I will finish.</thought><finish>Finished after error.</finish>`;

        vi.mocked(streamText)
            .mockReturnValueOnce(mockStreamTextResponse(firstLLMResponse))
            .mockReturnValueOnce(mockStreamTextResponse(secondLLMResponse));

        vi.mocked(secureExecuteTool).mockResolvedValueOnce("Error: Command failed with exit code 1.");

        const events = await collectEvents(runAgent(mockOptions));

        expect(events).toHaveLength(5);
        expect(events[2]).toEqual({ type: 'tool-output', observation: 'Error: Command failed with exit code 1.' });
        expect(events[4]).toEqual({ type: 'finish', result: 'Finished after error.' });
    });

    it('should terminate after reaching maxSteps', async () => {
        const loopingLLMResponse = `<thought>I am in a loop.</thought><action tool="readFile" args='{"path":"./loop.txt"}'></action>`;

        vi.mocked(streamText).mockReturnValue(mockStreamTextResponse(loopingLLMResponse));
        vi.mocked(secureExecuteTool).mockResolvedValue("Looping...");

        const events = await collectEvents(runAgent({ ...mockOptions, maxSteps: 2 }));

        expect(events).toHaveLength(7);
        const finalEvent = events[6];

        // --- THIS IS THE DEFINITIVE FIX ---
        // This `expect` call confirms the event type.
        expect(finalEvent.type).toBe('error');

        // This `if` block acts as a "type guard", telling TypeScript that inside this block,
        // finalEvent is guaranteed to be of type ErrorEvent, making it safe to access .message.
        if (finalEvent.type === 'error') {
            expect(finalEvent.message).toBe('Agent stopped after reaching the maximum of 2 steps.');
        }
    });
});