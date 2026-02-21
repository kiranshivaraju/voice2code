/**
 * HotkeyManager — Registers and manages global keyboard shortcuts
 * using Electron's globalShortcut API.
 */

import { globalShortcut } from 'electron';

export class HotkeyManager {
  private registered = false;

  constructor(private accelerator: string = 'CommandOrControl+Shift+V') {}

  register(callback: () => void): boolean {
    if (this.registered) {
      this.unregister();
    }
    const success = globalShortcut.register(this.accelerator, callback);
    this.registered = success;
    return success;
  }

  unregister(): void {
    if (this.registered) {
      globalShortcut.unregister(this.accelerator);
      this.registered = false;
    }
  }

  isRegistered(): boolean {
    return this.registered;
  }
}
