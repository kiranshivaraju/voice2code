/**
 * SettingsWindow — Manages the BrowserWindow for settings and
 * registers IPC handlers for the settings renderer.
 */

import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ConfigStore } from './config-store';
import { SecretStore } from './secret-store';
import { testEndpointConnectivity } from '@core/config/endpoint-validator';

export class SettingsWindow {
  private window: BrowserWindow | null = null;

  constructor(
    private configStore: ConfigStore,
    private secretStore: SecretStore
  ) {
    this.registerIPCHandlers();
  }

  show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 520,
      height: 600,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: 'Voice2Code Settings',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
      show: false,
    });

    this.window.loadFile(path.join(__dirname, 'settings', 'settings.html'));

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
    ipcMain.handle('settings:get', async () => {
      return this.configStore.getAll();
    });

    ipcMain.handle('settings:save', async (_event, config: unknown) => {
      try {
        if (!config || typeof config !== 'object') {
          return { success: false, error: 'Invalid configuration data' };
        }
        this.configStore.save(config as any);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save settings',
        };
      }
    });

    ipcMain.handle('settings:get-api-key', async () => {
      return this.secretStore.getApiKeyMasked();
    });

    ipcMain.handle('settings:set-api-key', async (_event, data: { apiKey: string }) => {
      try {
        this.secretStore.setApiKey(data.apiKey);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save API key',
        };
      }
    });

    ipcMain.handle('settings:delete-api-key', async () => {
      this.secretStore.deleteApiKey();
      return { success: true };
    });

    ipcMain.handle('settings:test-connection', async () => {
      try {
        const config = this.configStore.getEndpointConfig();
        const start = Date.now();
        const success = await testEndpointConnectivity(config.url, 5000);
        const latencyMs = Date.now() - start;

        if (success) {
          return { success: true, latencyMs };
        } else {
          return { success: false, error: 'Cannot connect to endpoint. Is your STT service running?' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Connection test failed',
        };
      }
    });
  }
}
