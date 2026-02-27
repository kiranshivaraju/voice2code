/**
 * WelcomeWindow — Shows a quick-start guide on every app launch.
 */

import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';

export class WelcomeWindow {
  private window: BrowserWindow | null = null;

  constructor() {
    ipcMain.handle('welcome:close', () => {
      this.close();
    });
  }

  show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 480,
      height: 520,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: 'Welcome to Voice2Code',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
      show: false,
    });

    this.window.loadFile(path.join(__dirname, 'welcome', 'welcome.html'));

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
}
