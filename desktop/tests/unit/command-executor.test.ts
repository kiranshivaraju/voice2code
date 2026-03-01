jest.mock('electron', () => ({
  clipboard: {
    readText: jest.fn(() => 'original-clipboard'),
    writeText: jest.fn(),
  },
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

import { CommandExecutor } from '../../src/command-executor';
import { ParsedSegment } from '../../src/command-parser';
import { clipboard } from 'electron';
import { execSync } from 'child_process';

describe('CommandExecutor', () => {
  let executor: CommandExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    (clipboard.readText as jest.Mock).mockReturnValue('original-clipboard');
    executor = new CommandExecutor();
  });

  it('should save and restore clipboard around execution', async () => {
    await executor.execute([{ type: 'text', value: 'hello' }]);
    expect(clipboard.readText).toHaveBeenCalled();
    // Last call should restore clipboard
    const calls = (clipboard.writeText as jest.Mock).mock.calls;
    expect(calls[calls.length - 1][0]).toBe('original-clipboard');
  });

  it('should paste text via clipboard + Cmd+V', async () => {
    await executor.execute([{ type: 'text', value: 'hello world' }]);
    expect(clipboard.writeText).toHaveBeenCalledWith('hello world');
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('keystroke "v" using command down')
    );
  });

  it('should execute command keystrokes via osascript', async () => {
    await executor.execute([{ type: 'command', value: 'newline' }]);
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('key code 36')
    );
  });

  it('should skip whitespace-only text segments', async () => {
    await executor.execute([{ type: 'text', value: '   ' }]);
    // Only clipboard restore should have been written, no paste
    expect(execSync).not.toHaveBeenCalled();
  });

  it('should handle mixed segments in order', async () => {
    const segments: ParsedSegment[] = [
      { type: 'text', value: 'hello' },
      { type: 'command', value: 'newline' },
      { type: 'text', value: 'world' },
    ];
    await executor.execute(segments);
    expect(execSync).toHaveBeenCalledTimes(3);
  });

  it('should restore clipboard even if execution throws', async () => {
    (execSync as unknown as jest.Mock).mockImplementationOnce(() => {
      throw new Error('osascript failed');
    });
    await expect(
      executor.execute([{ type: 'text', value: 'test' }])
    ).rejects.toThrow('osascript failed');
    const calls = (clipboard.writeText as jest.Mock).mock.calls;
    expect(calls[calls.length - 1][0]).toBe('original-clipboard');
  });

  it('should handle empty segments array', async () => {
    await executor.execute([]);
    expect(execSync).not.toHaveBeenCalled();
    // Should still restore clipboard
    const calls = (clipboard.writeText as jest.Mock).mock.calls;
    expect(calls[calls.length - 1][0]).toBe('original-clipboard');
  });
});
