import { BrowserWindow, ipcMain, clipboard } from 'electron';
import { HistoryWindow } from '../../src/history-window';

const mockIpcMain = ipcMain as unknown as { handle: jest.Mock };

function createMockHistoryStore() {
  return {
    getAll: jest.fn().mockReturnValue([
      { id: 'abc', text: 'hello world', timestamp: 1000, language: 'en' },
    ]),
    getById: jest.fn().mockImplementation((id: string) => {
      if (id === 'abc') return { id: 'abc', text: 'hello world', timestamp: 1000, language: 'en' };
      return undefined;
    }),
    clear: jest.fn(),
    count: jest.fn().mockReturnValue(1),
    add: jest.fn(),
  };
}

function getIPCHandler(channel: string): ((...args: any[]) => any) | undefined {
  const calls = mockIpcMain.handle.mock.calls;
  const match = calls.find((c: any[]) => c[0] === channel);
  return match ? match[1] : undefined;
}

describe('HistoryWindow', () => {
  let historyStore: ReturnType<typeof createMockHistoryStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    historyStore = createMockHistoryStore();
    new HistoryWindow(historyStore as any);
  });

  describe('show/close/isOpen', () => {
    it('should create a BrowserWindow on show', () => {
      const win = new HistoryWindow(historyStore as any);
      win.show();
      expect(BrowserWindow).toHaveBeenCalled();
    });

    it('should focus existing window on second show', () => {
      const win = new HistoryWindow(historyStore as any);
      win.show();
      win.show();
      // Second call should focus, not create new window
    });

    it('should report isOpen correctly', () => {
      const win = new HistoryWindow(historyStore as any);
      expect(win.isOpen()).toBe(false);
      win.show();
      expect(win.isOpen()).toBe(true);
    });
  });

  describe('history:get', () => {
    it('should return all history entries', async () => {
      const handler = getIPCHandler('history:get')!;
      const result = await handler({});
      expect(historyStore.getAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello world');
    });
  });

  describe('history:clear', () => {
    it('should clear all entries', async () => {
      const handler = getIPCHandler('history:clear')!;
      const result = await handler({});
      expect(historyStore.clear).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('history:copy', () => {
    it('should copy entry text to clipboard', async () => {
      const handler = getIPCHandler('history:copy')!;
      const result = await handler({}, { id: 'abc' });
      expect(clipboard.writeText).toHaveBeenCalledWith('hello world');
      expect(result.success).toBe(true);
    });

    it('should return error for invalid id', async () => {
      const handler = getIPCHandler('history:copy')!;
      const result = await handler({}, { id: '' });
      expect(result.success).toBe(false);
    });

    it('should return error for non-existent entry', async () => {
      const handler = getIPCHandler('history:copy')!;
      const result = await handler({}, { id: 'nonexistent' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Entry not found');
    });
  });
});
