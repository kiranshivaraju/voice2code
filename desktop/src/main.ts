/**
 * main.ts — Electron app entry point for Voice2Code Desktop.
 * Hides dock icon, wires all components, and manages app lifecycle.
 */

import { app, systemPreferences, Notification } from 'electron';
import path from 'path';

import { DeviceManager } from '@core/audio/device-manager';
import { AudioManager } from '@core/audio/audio-manager';
import { AudioEncoder } from '@core/audio/audio-encoder';
import { AdapterFactory } from '@core/adapters/adapter-factory';
import { testEndpointConnectivity } from '@core/config/endpoint-validator';

import { ConfigStore } from './config-store';
import { SecretStore } from './secret-store';
import { TrayManager, TrayIconPaths } from './tray';
import { HotkeyManager } from './hotkey';
import { DesktopEngine } from './desktop-engine';

let trayManager: TrayManager;
let hotkeyManager: HotkeyManager;
let configStore: ConfigStore;

function showNotification(title: string, body: string): void {
  if (!configStore.getUIConfig().showNotifications) return;
  const notification = new Notification({ title, body });
  notification.show();
}

async function testAndNotify(): Promise<void> {
  const config = configStore.getEndpointConfig();
  try {
    const connected = await testEndpointConnectivity(config.url, 5000);
    if (connected) {
      showNotification('Connection OK', `Connected to ${config.url}`);
    } else {
      showNotification('Connection Failed', `Cannot reach ${config.url}`);
    }
  } catch {
    showNotification('Connection Failed', `Cannot reach ${config.url}`);
  }
}

app.on('ready', () => {
  app.dock?.hide();

  // Check Accessibility permissions
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);
  if (!trusted) {
    showNotification(
      'Accessibility Required',
      'Voice2Code needs Accessibility access for paste simulation. Please grant access in System Settings.'
    );
  }

  // Create stores
  configStore = new ConfigStore();
  const secretStore = new SecretStore(configStore['store']);

  // Create audio pipeline
  const deviceManager = new DeviceManager();
  const audioManager = new AudioManager(deviceManager);
  const audioEncoder = new AudioEncoder();
  const adapterFactory = new AdapterFactory();

  // Create tray
  const assetsDir = path.join(__dirname, 'assets');
  const iconPaths: TrayIconPaths = {
    idle: path.join(assetsDir, 'trayIconTemplate.png'),
    recording: path.join(assetsDir, 'tray-recording.png'),
    processing: path.join(assetsDir, 'tray-processing.png'),
  };
  trayManager = new TrayManager(iconPaths);
  trayManager.create();

  // Create engine
  const engine = new DesktopEngine(
    configStore,
    secretStore,
    audioManager,
    audioEncoder,
    trayManager,
    showNotification,
    adapterFactory
  );

  // Register hotkey
  hotkeyManager = new HotkeyManager('CommandOrControl+Shift+V');
  const registered = hotkeyManager.register(() => engine.toggleRecording());
  if (!registered) {
    showNotification(
      'Shortcut Unavailable',
      'Cmd+Shift+V is already in use by another app. Change the shortcut in Settings.'
    );
  }

  // Wire tray callbacks
  trayManager.setOnStartRecording(() => engine.toggleRecording());
  trayManager.setOnStopRecording(() => engine.toggleRecording());
  trayManager.setOnOpenSettings(() => {
    // Settings window will be implemented in a separate issue
  });
  trayManager.setOnTestConnection(() => testAndNotify());
  trayManager.setOnQuit(() => app.quit());
});

app.on('window-all-closed', () => {
  // Don't quit — this is a tray app
});

app.on('before-quit', () => {
  hotkeyManager?.unregister();
  trayManager?.destroy();
});
