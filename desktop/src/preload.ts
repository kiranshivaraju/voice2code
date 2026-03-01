/**
 * Preload script — contextBridge IPC exposure for Settings window.
 * Runs in a sandboxed renderer with contextIsolation enabled.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('settings:get'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('settings:save', config),
  getApiKeyMasked: () => ipcRenderer.invoke('settings:get-api-key'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('settings:set-api-key', { apiKey }),
  deleteApiKey: () => ipcRenderer.invoke('settings:delete-api-key'),
  testConnection: () => ipcRenderer.invoke('settings:test-connection'),
  getDevices: () => ipcRenderer.invoke('settings:get-devices'),
});

contextBridge.exposeInMainWorld('historyAPI', {
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  copyEntry: (id: string) => ipcRenderer.invoke('history:copy', { id }),
});

contextBridge.exposeInMainWorld('welcomeAPI', {
  close: () => ipcRenderer.invoke('welcome:close'),
});
