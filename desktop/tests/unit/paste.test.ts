/**
 * pasteText unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

import { clipboard } from 'electron';
import { execSync } from 'child_process';
import { pasteText } from '../../src/paste';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockClipboard = clipboard as unknown as {
  readText: jest.Mock;
  writeText: jest.Mock;
};

const mockExecSync = execSync as unknown as jest.Mock;

describe('pasteText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClipboard.readText.mockReturnValue('previous clipboard');
  });

  it('should write text to clipboard and simulate Cmd+V', async () => {
    await pasteText('hello world', 1);

    expect(mockClipboard.writeText).toHaveBeenCalledWith('hello world');
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('keystroke "v" using command down')
    );
  });

  it('should restore previous clipboard content after paste', async () => {
    mockClipboard.readText.mockReturnValue('old content');

    await pasteText('new text', 1);

    const calls = mockClipboard.writeText.mock.calls;
    expect(calls[calls.length - 1][0]).toBe('old content');
  });

  it('should handle empty previous clipboard', async () => {
    mockClipboard.readText.mockReturnValue('');

    await pasteText('some text', 1);

    const calls = mockClipboard.writeText.mock.calls;
    expect(calls[calls.length - 1][0]).toBe('');
  });

  it('should skip paste for empty text', async () => {
    await pasteText('');

    expect(mockClipboard.readText).not.toHaveBeenCalled();
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('should still restore clipboard when osascript throws', async () => {
    mockClipboard.readText.mockReturnValue('saved');
    mockExecSync.mockImplementation(() => {
      throw new Error('Accessibility not granted');
    });

    await expect(pasteText('test', 1)).rejects.toThrow('Accessibility not granted');

    const calls = mockClipboard.writeText.mock.calls;
    expect(calls[calls.length - 1][0]).toBe('saved');
  });

  it('should skip paste for whitespace-only text', async () => {
    await pasteText('   ');

    expect(mockClipboard.readText).not.toHaveBeenCalled();
    expect(mockExecSync).not.toHaveBeenCalled();
  });
});
