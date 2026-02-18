import { HistoryManager } from '../../../src/core/history-manager';
import { HistoryEntry, HistoryStore } from '../../../src/types';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    showQuickPick: jest.fn(),
    showInformationMessage: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(),
  },
}));

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn();
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: mockRandomUUID },
});

describe('HistoryManager', () => {
  let manager: HistoryManager;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: { get: jest.Mock; update: jest.Mock };
  let mockConfig: { get: jest.Mock };
  let mockEditorService: { showPreviewAndInsert: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGlobalState = {
      get: jest.fn().mockReturnValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      globalState: mockGlobalState,
    } as unknown as vscode.ExtensionContext;

    mockConfig = { get: jest.fn() };
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    // Default: history enabled, maxItems = 50
    mockConfig.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'history.enabled') return true;
      if (key === 'history.maxItems') return 50;
      return defaultValue;
    });

    mockEditorService = {
      showPreviewAndInsert: jest.fn().mockResolvedValue({ confirmed: true, text: 'test' }),
    };

    mockRandomUUID.mockReturnValue('test-uuid-1');

    manager = new HistoryManager(mockContext, mockEditorService as any);
  });

  describe('add', () => {
    it('should prepend new entry to front', async () => {
      const existingStore: HistoryStore = {
        version: 1,
        entries: [
          { id: 'old-1', text: 'old entry', timestamp: 1000, language: 'en', durationMs: 2000 },
        ],
      };
      mockGlobalState.get.mockReturnValue(existingStore);

      mockRandomUUID.mockReturnValue('new-uuid');

      await manager.add({
        text: 'new entry',
        timestamp: 2000,
        language: 'en',
        durationMs: 3000,
      });

      const savedStore = mockGlobalState.update.mock.calls[0][1] as HistoryStore;
      expect(savedStore.entries[0].text).toBe('new entry');
      expect(savedStore.entries[0].id).toBe('new-uuid');
      expect(savedStore.entries[1].text).toBe('old entry');
    });

    it('should generate UUID for id', async () => {
      mockRandomUUID.mockReturnValue('generated-uuid-123');

      await manager.add({
        text: 'test',
        timestamp: Date.now(),
        language: 'en',
        durationMs: 1000,
      });

      const savedStore = mockGlobalState.update.mock.calls[0][1] as HistoryStore;
      expect(savedStore.entries[0].id).toBe('generated-uuid-123');
    });

    it('should trim to maxItems (removes from end)', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'history.enabled') return true;
        if (key === 'history.maxItems') return 3;
        return undefined;
      });

      const existingStore: HistoryStore = {
        version: 1,
        entries: [
          { id: '1', text: 'entry 1', timestamp: 3000, language: 'en', durationMs: 1000 },
          { id: '2', text: 'entry 2', timestamp: 2000, language: 'en', durationMs: 1000 },
          { id: '3', text: 'entry 3', timestamp: 1000, language: 'en', durationMs: 1000 },
        ],
      };
      mockGlobalState.get.mockReturnValue(existingStore);

      await manager.add({
        text: 'new entry',
        timestamp: 4000,
        language: 'en',
        durationMs: 1000,
      });

      const savedStore = mockGlobalState.update.mock.calls[0][1] as HistoryStore;
      expect(savedStore.entries.length).toBe(3);
      expect(savedStore.entries[0].text).toBe('new entry');
      expect(savedStore.entries[2].text).toBe('entry 2');
      // entry 3 should be trimmed
    });

    it('should no-op when history.enabled is false', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'history.enabled') return false;
        if (key === 'history.maxItems') return 50;
        return undefined;
      });

      await manager.add({
        text: 'test',
        timestamp: Date.now(),
        language: 'en',
        durationMs: 1000,
      });

      expect(mockGlobalState.update).not.toHaveBeenCalled();
    });

    it('should persist to globalState', async () => {
      await manager.add({
        text: 'test',
        timestamp: 1234,
        language: 'fr',
        durationMs: 5000,
      });

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'voice2code.history',
        expect.objectContaining({
          version: 1,
          entries: expect.arrayContaining([
            expect.objectContaining({ text: 'test', language: 'fr', durationMs: 5000 }),
          ]),
        })
      );
    });

    it('should initialize empty store when globalState is empty', async () => {
      mockGlobalState.get.mockReturnValue(undefined);

      await manager.add({
        text: 'first entry',
        timestamp: 1000,
        language: 'en',
        durationMs: 2000,
      });

      const savedStore = mockGlobalState.update.mock.calls[0][1] as HistoryStore;
      expect(savedStore.version).toBe(1);
      expect(savedStore.entries.length).toBe(1);
      expect(savedStore.entries[0].text).toBe('first entry');
    });
  });

  describe('getAll', () => {
    it('should return entries most-recent-first', () => {
      const store: HistoryStore = {
        version: 1,
        entries: [
          { id: '1', text: 'newest', timestamp: 3000, language: 'en', durationMs: 1000 },
          { id: '2', text: 'middle', timestamp: 2000, language: 'en', durationMs: 1000 },
          { id: '3', text: 'oldest', timestamp: 1000, language: 'en', durationMs: 1000 },
        ],
      };
      mockGlobalState.get.mockReturnValue(store);

      const entries = manager.getAll();

      expect(entries[0].text).toBe('newest');
      expect(entries[2].text).toBe('oldest');
    });

    it('should return empty array when no history', () => {
      mockGlobalState.get.mockReturnValue(undefined);

      const entries = manager.getAll();

      expect(entries).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should empty the store in globalState', async () => {
      await manager.clear();

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'voice2code.history',
        expect.objectContaining({
          version: 1,
          entries: [],
        })
      );
    });
  });

  describe('showHistory', () => {
    it('should open QuickPick with formatted labels', async () => {
      const store: HistoryStore = {
        version: 1,
        entries: [
          { id: '1', text: 'Hello world from voice', timestamp: new Date('2026-01-15T14:30:00').getTime(), language: 'en', durationMs: 4200 },
        ],
      };
      mockGlobalState.get.mockReturnValue(store);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      await manager.showHistory();

      const items = (vscode.window.showQuickPick as jest.Mock).mock.calls[0][0];
      expect(items[0].label).toMatch(/^\[\d{2}:\d{2}\] Hello world from voice$/);
      expect(items[0].description).toBe('en · 4.2s');
    });

    it('should truncate labels at 60 chars with ...', async () => {
      const longText = 'a'.repeat(80);
      const store: HistoryStore = {
        version: 1,
        entries: [
          { id: '1', text: longText, timestamp: Date.now(), language: 'en', durationMs: 1000 },
        ],
      };
      mockGlobalState.get.mockReturnValue(store);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      await manager.showHistory();

      const items = (vscode.window.showQuickPick as jest.Mock).mock.calls[0][0];
      // Label should contain truncated text with ...
      expect(items[0].label).toContain('a'.repeat(60) + '...');
    });

    it('should call editorService.showPreviewAndInsert on selection', async () => {
      const entry: HistoryEntry = {
        id: '1', text: 'selected text', timestamp: Date.now(), language: 'en', durationMs: 2000,
      };
      const store: HistoryStore = { version: 1, entries: [entry] };
      mockGlobalState.get.mockReturnValue(store);

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
        label: '[14:30] selected text',
        description: 'en · 2.0s',
        entry,
      });

      await manager.showHistory();

      expect(mockEditorService.showPreviewAndInsert).toHaveBeenCalledWith('selected text');
    });

    it('should use placeholder "Select a transcription to re-insert"', async () => {
      mockGlobalState.get.mockReturnValue({ version: 1, entries: [] });
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      await manager.showHistory();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          placeHolder: 'Select a transcription to re-insert',
        })
      );
    });

    it('should not call editorService when user cancels QuickPick', async () => {
      const store: HistoryStore = {
        version: 1,
        entries: [
          { id: '1', text: 'test', timestamp: Date.now(), language: 'en', durationMs: 1000 },
        ],
      };
      mockGlobalState.get.mockReturnValue(store);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      await manager.showHistory();

      expect(mockEditorService.showPreviewAndInsert).not.toHaveBeenCalled();
    });
  });
});
