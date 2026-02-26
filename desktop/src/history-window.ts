/**
 * HistoryWindow — Manages the BrowserWindow for transcription history
 * and registers IPC handlers for the history renderer.
 */

import { BrowserWindow, ipcMain, clipboard } from 'electron';
import path from 'path';
import { HistoryStore } from './history-store';

export class HistoryWindow {
  private window: BrowserWindow | null = null;

  constructor(private historyStore: HistoryStore) {
    this.registerIPCHandlers();
  }

  show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 520,
      height: 500,
      resizable: true,
      title: 'Transcription History',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
      show: false,
    });

    this.window.loadFile(path.join(__dirname, 'history', 'history.html'));

    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  isOpen(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  private registerIPCHandlers(): void {
    ipcMain.handle('history:get', async () => {
      return this.historyStore.getAll();
    });

    ipcMain.handle('history:clear', async () => {
      this.historyStore.clear();
      return { success: true };
    });

    ipcMain.handle('history:copy', async (_event, data: { id: string }) => {
      if (!data || !data.id) {
        return { success: false, error: 'Invalid entry ID' };
      }
      const entry = this.historyStore.getById(data.id);
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      clipboard.writeText(entry.text);
      return { success: true };
    });
  }
}
