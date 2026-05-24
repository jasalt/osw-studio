import { describe, it, expect } from 'vitest';
import {
  detectMalformedToolCalls,
  extractToolCallsFromText,
  getToolCallSignature,
  detectRepeatingPattern,
} from '../core/agent-loop';

describe('detectMalformedToolCalls', () => {
  it('returns false for empty/null content', () => {
    expect(detectMalformedToolCalls('')).toBe(false);
  });

  it('detects shell code blocks', () => {
    expect(detectMalformedToolCalls('```bash\nls -la\n```')).toBe(true);
    expect(detectMalformedToolCalls('```sh\necho hello\n```')).toBe(true);
    expect(detectMalformedToolCalls('```shell\ncat file.txt\n```')).toBe(true);
  });

  it('detects shell JSON invocation as text', () => {
    expect(detectMalformedToolCalls('shell {"cmd": "ls"}')).toBe(true);
    expect(detectMalformedToolCalls('shell ["ls -la"]')).toBe(true);
  });

  it('does not flag normal prose', () => {
    expect(detectMalformedToolCalls('I will list the files for you.')).toBe(false);
    expect(detectMalformedToolCalls('Here is the result of the operation.')).toBe(false);
  });

  it('does not flag long content without trailing tool pattern', () => {
    const longText = 'A'.repeat(300) + '\n```bash\nls\n```\n' + 'B'.repeat(300);
    expect(detectMalformedToolCalls(longText)).toBe(false);
  });

  it('flags long content that ends with tool pattern', () => {
    const longText = 'A'.repeat(300) + '\n```bash\nls -la\n```';
    expect(detectMalformedToolCalls(longText)).toBe(true);
  });
});

describe('extractToolCallsFromText', () => {
  it('returns undefined for empty content', () => {
    expect(extractToolCallsFromText('')).toBeUndefined();
  });

  it('extracts commands from bash code blocks', () => {
    const content = '```bash\nls -la\n```';
    const result = extractToolCallsFromText(content)!;
    expect(result).toHaveLength(1);
    expect(result[0].function.name).toBe('shell');
    expect(JSON.parse(result[0].function.arguments).cmd).toBe('ls -la');
  });

  it('extracts multiple code blocks', () => {
    const content = '```bash\nls\n```\nSome text\n```shell\ncat file.txt\n```';
    const result = extractToolCallsFromText(content)!;
    expect(result).toHaveLength(2);
    expect(JSON.parse(result[0].function.arguments).cmd).toBe('ls');
    expect(JSON.parse(result[1].function.arguments).cmd).toBe('cat file.txt');
  });

  it('extracts shell JSON format', () => {
    const content = 'shell{"cmd": "echo hello"}';
    const result = extractToolCallsFromText(content)!;
    expect(result).toHaveLength(1);
    expect(JSON.parse(result[0].function.arguments).cmd).toBe('echo hello');
  });

  it('extracts tool_code blocks (Gemini-style)', () => {
    const content = '```tool_code\nshell.run_command("grep -r pattern src")\n```';
    const result = extractToolCallsFromText(content)!;
    expect(result).toHaveLength(1);
    expect(JSON.parse(result[0].function.arguments).cmd).toBe('grep -r pattern src');
  });

  it('returns undefined when no commands found', () => {
    expect(extractToolCallsFromText('Just some regular text.')).toBeUndefined();
  });
});

describe('getToolCallSignature', () => {
  it('normalizes shell commands', () => {
    const tc = { id: 'tc1', type: 'function' as const, function: { name: 'shell', arguments: '{"cmd":"ls -la"}' } };
    expect(getToolCallSignature(tc)).toBe('shell:ls -la');
  });

  it('handles array cmd format', () => {
    const tc = { id: 'tc1', type: 'function' as const, function: { name: 'shell', arguments: '{"cmd":["echo","hello"]}' } };
    expect(getToolCallSignature(tc)).toBe('shell:echo hello');
  });

  it('returns raw args for non-shell tools', () => {
    const tc = { id: 'tc1', type: 'function' as const, function: { name: 'other', arguments: '{"key":"val"}' } };
    expect(getToolCallSignature(tc)).toBe('other:{"key":"val"}');
  });

  it('handles invalid JSON gracefully', () => {
    const tc = { id: 'tc1', type: 'function' as const, function: { name: 'shell', arguments: 'broken' } };
    expect(getToolCallSignature(tc)).toBe('shell:broken');
  });
});

describe('detectRepeatingPattern', () => {
  it('returns null for short signature lists', () => {
    expect(detectRepeatingPattern(['a', 'b'], 3)).toBeNull();
  });

  it('detects cycle of length 2', () => {
    const sigs = ['a', 'b', 'a', 'b'];
    expect(detectRepeatingPattern(sigs, 2)).toBe(2);
  });

  it('detects cycle of length 3', () => {
    const sigs = ['a', 'b', 'c', 'a', 'b', 'c'];
    expect(detectRepeatingPattern(sigs, 2)).toBe(3);
  });

  it('returns null when no cycle exists', () => {
    const sigs = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(detectRepeatingPattern(sigs, 2)).toBeNull();
  });

  it('only checks the tail of the array', () => {
    const sigs = ['x', 'y', 'z', 'a', 'b', 'a', 'b'];
    expect(detectRepeatingPattern(sigs, 2)).toBe(2);
  });
});
