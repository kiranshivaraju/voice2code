import * as vscode from 'vscode';
import { HistoryEntry, HistoryStore, PreviewResult } from '../types';

/**
 * EditorService interface for dependency injection
 */
interface EditorService {
  showPreviewAndInsert(text: string): Promise<PreviewResult>;
}

/**
 * HistoryManager
 *
 * Stores the last N transcriptions in VS Code globalState so users can
 * re-insert previous prompts without re-dictating. History persists
 * across VS Code restarts.
 *
 * Storage: context.globalState (user-level, not workspace-level)
 * Key: 'voice2code.history'
 */
export class HistoryManager {
  private static readonly STORAGE_KEY = 'voice2code.history';
  private static readonly CONFIG_SECTION = 'voice2code';

  constructor(
    private context: vscode.ExtensionContext,
    private editorService: EditorService
  ) {}

  /**
   * Add a transcription entry to history
   *
   * No-ops if history.enabled is false. Prepends to front,
   * trims oldest entries when exceeding maxItems.
   *
   * @param entry - Entry without id (id is auto-generated)
   */
  async add(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
    const config = vscode.workspace.getConfiguration(HistoryManager.CONFIG_SECTION);
    if (!config.get<boolean>('history.enabled', false)) {
      return;
    }

    const store = this.loadStore();
    const maxItems = config.get<number>('history.maxItems', 50);

    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      ...entry,
    };

    store.entries.unshift(newEntry);

    if (store.entries.length > maxItems) {
      store.entries = store.entries.slice(0, maxItems);
    }

    await this.context.globalState.update(HistoryManager.STORAGE_KEY, store);
  }

  /**
   * Get all history entries, most-recent-first
   *
   * @returns Array of history entries
   */
  getAll(): HistoryEntry[] {
    return this.loadStore().entries;
  }

  /**
   * Clear all history entries
   */
  async clear(): Promise<void> {
    const store: HistoryStore = { version: 1, entries: [] };
    await this.context.globalState.update(HistoryManager.STORAGE_KEY, store);
  }

  /**
   * Show QuickPick with history entries for re-insertion
   *
   * Displays formatted list of past transcriptions. On selection,
   * calls editorService.showPreviewAndInsert to respect preview settings.
   */
  async showHistory(): Promise<void> {
    const entries = this.getAll();

    const items = entries.map((entry) => {
      const date = new Date(entry.timestamp);
      const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      const truncated = entry.text.length > 60
        ? entry.text.slice(0, 60) + '...'
        : entry.text;
      const seconds = (entry.durationMs / 1000).toFixed(1);

      return {
        label: `[${time}] ${truncated}`,
        description: `${entry.language} · ${seconds}s`,
        entry,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a transcription to re-insert',
    });

    if (selected) {
      await this.editorService.showPreviewAndInsert(selected.entry.text);
    }
  }

  private loadStore(): HistoryStore {
    const stored = this.context.globalState.get<HistoryStore>(HistoryManager.STORAGE_KEY);
    if (stored) {
      return stored;
    }
    return { version: 1, entries: [] };
  }
}
