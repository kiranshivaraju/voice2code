# Component Design

## Overview

Detailed design of all new classes and modules for the Voice2Code desktop app. All components live in `desktop/src/`. Shared modules from `src/` are imported via the `@core/*` path alias.

---

## Component 1: ConfigStore

### Purpose
Wraps `electron-store` to provide typed, validated configuration persistence for the desktop app. Replaces `ConfigurationManager` (VS Code-specific) with an Electron-compatible equivalent.

### Location
`desktop/src/config-store.ts`

### Dependencies
- `electron-store` (npm package)
- `EndpointConfiguration`, `AudioConfiguration`, `ConfigurationError` from `@core/types`
- `validateEndpointUrl`, `validateModelName` from `@core/config/endpoint-validator`

### Class Definition

```typescript
import Store from 'electron-store';
import { EndpointConfiguration, AudioConfiguration, ConfigurationError } from '@core/types';
import { validateEndpointUrl, validateModelName } from '@core/config/endpoint-validator';

interface DesktopConfig {
  endpoint: {
    url: string;
    model: string;
    timeout: number;
    language: string;
  };
  audio: {
    sampleRate: number;
    format: 'mp3' | 'wav';
  };
  ui: {
    showNotifications: boolean;
  };
}

export class ConfigStore {
  private store: Store<DesktopConfig>;

  /**
   * Creates a new ConfigStore with default values and schema validation.
   * Config is persisted as JSON in the Electron app data directory.
   */
  constructor() {
    this.store = new Store<DesktopConfig>({
      name: 'config',
      schema: CONFIG_SCHEMA,
      defaults: DEFAULT_CONFIG,
    });
  }

  /**
   * Get endpoint configuration mapped to the shared EndpointConfiguration interface.
   * @returns EndpointConfiguration with url, model, timeout, language
   */
  getEndpointConfig(): EndpointConfiguration {
    return {
      url: this.store.get('endpoint.url'),
      model: this.store.get('endpoint.model'),
      timeout: this.store.get('endpoint.timeout'),
      language: this.store.get('endpoint.language'),
    };
  }

  /**
   * Get audio configuration mapped to the shared AudioConfiguration interface.
   * @returns AudioConfiguration with deviceId always set to 'default'
   */
  getAudioConfig(): AudioConfiguration {
    return {
      deviceId: 'default',
      sampleRate: this.store.get('audio.sampleRate'),
      format: this.store.get('audio.format') as 'mp3' | 'wav',
    };
  }

  /**
   * Get UI configuration.
   * @returns UI config with showNotifications flag
   */
  getUIConfig(): { showNotifications: boolean } {
    return {
      showNotifications: this.store.get('ui.showNotifications'),
    };
  }

  /**
   * Get all configuration values.
   * @returns Complete DesktopConfig object
   */
  getAll(): DesktopConfig {
    return this.store.store;
  }

  /**
   * Save partial configuration. Validates all provided values before saving.
   * Only provided fields are updated; others remain unchanged.
   *
   * @param partial - Partial config to merge
   * @throws ConfigurationError if validation fails
   */
  save(partial: Partial<DesktopConfig>): void {
    if (partial.endpoint) {
      if (partial.endpoint.url !== undefined) {
        const urlResult = validateEndpointUrl(partial.endpoint.url);
        if (!urlResult.valid) {
          throw new ConfigurationError(`Invalid endpoint URL: ${urlResult.errors[0]}`);
        }
        this.store.set('endpoint.url', partial.endpoint.url);
      }
      if (partial.endpoint.model !== undefined) {
        const modelResult = validateModelName(partial.endpoint.model);
        if (!modelResult.valid) {
          throw new ConfigurationError(`Invalid model name: ${modelResult.errors[0]}`);
        }
        this.store.set('endpoint.model', partial.endpoint.model);
      }
      if (partial.endpoint.timeout !== undefined) {
        const clamped = Math.max(1000, Math.min(120000, partial.endpoint.timeout));
        this.store.set('endpoint.timeout', clamped);
      }
      if (partial.endpoint.language !== undefined) {
        const lang = partial.endpoint.language || 'en';
        this.store.set('endpoint.language', lang);
      }
    }
    if (partial.audio) {
      if (partial.audio.sampleRate !== undefined) {
        const valid = [8000, 16000, 22050, 44100];
        const rate = valid.includes(partial.audio.sampleRate) ? partial.audio.sampleRate : 16000;
        this.store.set('audio.sampleRate', rate);
      }
      if (partial.audio.format !== undefined) {
        const fmt = ['mp3', 'wav'].includes(partial.audio.format) ? partial.audio.format : 'mp3';
        this.store.set('audio.format', fmt);
      }
    }
    if (partial.ui) {
      if (partial.ui.showNotifications !== undefined) {
        this.store.set('ui.showNotifications', partial.ui.showNotifications);
      }
    }
  }

  /**
   * Reset all configuration to defaults.
   */
  reset(): void {
    this.store.clear();
  }
}
```

### Constants

```typescript
const DEFAULT_CONFIG: DesktopConfig = {
  endpoint: {
    url: 'http://localhost:8000/v1/audio/transcriptions',
    model: 'whisper-large-v3',
    timeout: 30000,
    language: 'en',
  },
  audio: {
    sampleRate: 16000,
    format: 'mp3',
  },
  ui: {
    showNotifications: true,
  },
};
```

### Test File
`desktop/tests/unit/config-store.test.ts`

---

## Component 2: SecretStore

### Purpose
Encrypts and manages API keys using Electron's `safeStorage` API. Encrypted blobs are stored as base64 strings in `electron-store`.

### Location
`desktop/src/secret-store.ts`

### Dependencies
- `safeStorage` from `electron`
- `electron-store` instance (injected)
- `ConfigurationError` from `@core/types`

### Class Definition

```typescript
import { safeStorage } from 'electron';
import Store from 'electron-store';
import { ConfigurationError } from '@core/types';

const ENCRYPTED_KEY = '_encryptedApiKey';

export class SecretStore {
  /**
   * Creates a new SecretStore.
   * @param store - electron-store instance for persisting encrypted blobs
   */
  constructor(private store: Store) {}

  /**
   * Encrypt and store an API key.
   * @param apiKey - Plain text API key
   * @throws ConfigurationError if key is empty or safeStorage unavailable
   */
  setApiKey(apiKey: string): void {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new ConfigurationError('API key cannot be empty');
    }
    if (!safeStorage.isEncryptionAvailable()) {
      throw new ConfigurationError(
        'Secure storage is not available. Cannot store API key.'
      );
    }
    const encrypted = safeStorage.encryptString(trimmed);
    this.store.set(ENCRYPTED_KEY, encrypted.toString('base64'));
  }

  /**
   * Retrieve and decrypt the stored API key.
   * @returns Decrypted API key, or null if none stored
   */
  getApiKey(): string | null {
    const base64 = this.store.get(ENCRYPTED_KEY) as string | undefined;
    if (!base64) {
      return null;
    }
    try {
      const buffer = Buffer.from(base64, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      // Corrupt data — delete and return null
      this.store.delete(ENCRYPTED_KEY);
      return null;
    }
  }

  /**
   * Delete the stored API key.
   */
  deleteApiKey(): void {
    this.store.delete(ENCRYPTED_KEY);
  }

  /**
   * Check if an API key is stored.
   * @returns true if an encrypted key exists
   */
  hasApiKey(): boolean {
    return this.store.has(ENCRYPTED_KEY);
  }

  /**
   * Get a masked version of the API key for UI display.
   * @returns Masked key (e.g., "*******3xyz") or null if none stored
   */
  getApiKeyMasked(): string | null {
    const key = this.getApiKey();
    if (!key) {
      return null;
    }
    if (key.length <= 4) {
      return '****';
    }
    return '*'.repeat(key.length - 4) + key.slice(-4);
  }
}
```

### Test File
`desktop/tests/unit/secret-store.test.ts`

---

## Component 3: TrayManager

### Purpose
Manages the macOS menu bar tray icon, context menu, and state-driven icon updates.

### Location
`desktop/src/tray.ts`

### Dependencies
- `Tray`, `Menu`, `nativeImage` from `electron`
- `RecordingState` from `@core/types`

### Class Definition

```typescript
import { Tray, Menu, nativeImage, MenuItemConstructorOptions } from 'electron';
import { RecordingState } from '@core/types';

interface TrayIconPaths {
  idle: string;
  recording: string;
  processing: string;
}

interface TrayCallbacks {
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onOpenSettings?: () => void;
  onTestConnection?: () => void;
  onQuit?: () => void;
}

export class TrayManager {
  private tray: Tray | null = null;
  private state: RecordingState = 'idle';
  private callbacks: TrayCallbacks = {};

  /**
   * @param iconPaths - Paths to tray icon images for each state
   */
  constructor(private iconPaths: TrayIconPaths) {}

  /**
   * Create the tray icon and initial context menu.
   */
  create(): void {
    const icon = nativeImage.createFromPath(this.iconPaths.idle);
    this.tray = new Tray(icon);
    this.tray.setToolTip('Voice2Code');
    this.buildMenu();
  }

  /**
   * Update tray icon and menu based on recording state.
   * @param state - New recording state
   */
  setState(state: RecordingState): void {
    if (!this.tray) return;
    this.state = state;

    const iconPath = this.getIconPath(state);
    const icon = nativeImage.createFromPath(iconPath);
    this.tray.setImage(icon);
    this.buildMenu();
  }

  /**
   * Set callback for Start Recording menu item.
   */
  setOnStartRecording(callback: () => void): void {
    this.callbacks.onStartRecording = callback;
    this.buildMenu();
  }

  /**
   * Set callback for Stop Recording menu item.
   */
  setOnStopRecording(callback: () => void): void {
    this.callbacks.onStopRecording = callback;
    this.buildMenu();
  }

  /**
   * Set callback for Settings menu item.
   */
  setOnOpenSettings(callback: () => void): void {
    this.callbacks.onOpenSettings = callback;
    this.buildMenu();
  }

  /**
   * Set callback for Test Connection menu item.
   */
  setOnTestConnection(callback: () => void): void {
    this.callbacks.onTestConnection = callback;
    this.buildMenu();
  }

  /**
   * Set callback for Quit menu item.
   */
  setOnQuit(callback: () => void): void {
    this.callbacks.onQuit = callback;
    this.buildMenu();
  }

  /**
   * Remove the tray icon.
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private getIconPath(state: RecordingState): string {
    switch (state) {
      case 'recording': return this.iconPaths.recording;
      case 'processing': return this.iconPaths.processing;
      default: return this.iconPaths.idle;
    }
  }

  private buildMenu(): void {
    if (!this.tray) return;

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Start Recording',
        enabled: this.state === 'idle',
        visible: this.state === 'idle',
        click: () => this.callbacks.onStartRecording?.(),
      },
      {
        label: 'Stop Recording',
        enabled: this.state === 'recording',
        visible: this.state === 'recording',
        click: () => this.callbacks.onStopRecording?.(),
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        click: () => this.callbacks.onOpenSettings?.(),
      },
      {
        label: 'Test Connection',
        enabled: this.state !== 'processing',
        click: () => this.callbacks.onTestConnection?.(),
      },
      { type: 'separator' },
      {
        label: 'Quit Voice2Code',
        click: () => this.callbacks.onQuit?.(),
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(menu);
  }
}
```

### Test File
`desktop/tests/unit/tray.test.ts`

---

## Component 4: HotkeyManager

### Purpose
Registers and manages the global keyboard shortcut for toggling recording.

### Location
`desktop/src/hotkey.ts`

### Dependencies
- `globalShortcut` from `electron`

### Class Definition

```typescript
import { globalShortcut } from 'electron';

export class HotkeyManager {
  private registered = false;

  /**
   * @param accelerator - Electron accelerator string (default: 'CommandOrControl+Shift+V')
   */
  constructor(private accelerator: string = 'CommandOrControl+Shift+V') {}

  /**
   * Register the global shortcut.
   * @param callback - Function to call when shortcut is pressed
   * @returns true if registration succeeded, false if shortcut is taken
   */
  register(callback: () => void): boolean {
    if (this.registered) {
      this.unregister();
    }
    this.registered = globalShortcut.register(this.accelerator, callback);
    return this.registered;
  }

  /**
   * Unregister the global shortcut.
   */
  unregister(): void {
    if (this.registered) {
      globalShortcut.unregister(this.accelerator);
      this.registered = false;
    }
  }

  /**
   * Check if the shortcut is currently registered.
   */
  isRegistered(): boolean {
    return this.registered;
  }
}
```

### Test File
`desktop/tests/unit/hotkey.test.ts`

---

## Component 5: pasteText

### Purpose
Pastes text into the currently focused application by writing to the clipboard and simulating Cmd+V.

### Location
`desktop/src/paste.ts`

### Dependencies
- `clipboard` from `electron`
- `keyboard`, `Key` from `@nut-tree/nut-js`

### Function Definition

```typescript
import { clipboard } from 'electron';
import { keyboard, Key } from '@nut-tree/nut-js';

/**
 * Paste text into the currently focused application.
 *
 * Algorithm:
 * 1. Save current clipboard content
 * 2. Write text to clipboard
 * 3. Wait 50ms for clipboard to settle
 * 4. Simulate Cmd+V keystroke
 * 5. Wait 500ms for paste to complete
 * 6. Restore previous clipboard content
 *
 * @param text - Text to paste
 * @throws AudioError if Accessibility permission is not granted
 */
export async function pasteText(text: string): Promise<void> {
  if (!text) {
    return; // No-op for empty text
  }

  const previous = clipboard.readText();

  try {
    clipboard.writeText(text);
    await sleep(50);
    await keyboard.type(Key.LeftSuper, Key.V);
    await sleep(500);
  } finally {
    clipboard.writeText(previous);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Error Handling

If `keyboard.type()` throws (Accessibility not granted), the error propagates up to `DesktopEngine`, which catches it and shows a notification. The `finally` block ensures clipboard is restored even on error.

### Test File
`desktop/tests/unit/paste.test.ts`

---

## Component 6: DesktopEngine

### Purpose
State machine that orchestrates the recording lifecycle: capture → encode → transcribe → paste. This is the desktop equivalent of `Voice2CodeEngine` from the VS Code extension.

### Location
`desktop/src/desktop-engine.ts`

### Dependencies
- `ConfigStore` from `./config-store`
- `SecretStore` from `./secret-store`
- `AudioManager` from `@core/audio/audio-manager`
- `AudioEncoder` from `@core/audio/audio-encoder`
- `AdapterFactory` from `@core/adapters/adapter-factory`
- `TrayManager` from `./tray`
- `pasteText` from `./paste`
- `RecordingState`, `Voice2CodeError`, `NetworkError`, `AudioError`, `STTError` from `@core/types`

### Class Definition

```typescript
import { RecordingState, Voice2CodeError, NetworkError, AudioError, STTError } from '@core/types';
import { AudioManager } from '@core/audio/audio-manager';
import { AudioEncoder } from '@core/audio/audio-encoder';
import { AdapterFactory } from '@core/adapters/adapter-factory';
import { ConfigStore } from './config-store';
import { SecretStore } from './secret-store';
import { TrayManager } from './tray';
import { pasteText } from './paste';

type NotifyFn = (title: string, body: string) => void;

export class DesktopEngine {
  private state: RecordingState = 'idle';
  private adapterFactory: AdapterFactory;

  /**
   * @param configStore - Desktop config store
   * @param secretStore - API key secret store
   * @param audioManager - Shared audio capture manager
   * @param audioEncoder - Shared audio encoder
   * @param trayManager - Tray icon manager
   * @param notify - Function to show macOS notifications
   */
  constructor(
    private configStore: ConfigStore,
    private secretStore: SecretStore,
    private audioManager: AudioManager,
    private audioEncoder: AudioEncoder,
    private trayManager: TrayManager,
    private notify: NotifyFn
  ) {
    this.adapterFactory = new AdapterFactory();
  }

  /**
   * Toggle recording state.
   * idle → recording (start capture)
   * recording → processing → idle (stop, encode, transcribe, paste)
   * processing → no-op (ignore while transcribing)
   */
  async toggleRecording(): Promise<void> {
    switch (this.state) {
      case 'idle':
        await this.startRecording();
        break;
      case 'recording':
        await this.stopRecording();
        break;
      case 'processing':
        // Ignore — transcription in progress
        break;
    }
  }

  /**
   * Start audio capture.
   * @throws AudioError if capture fails
   */
  async startRecording(): Promise<void> {
    if (this.state !== 'idle') return;

    this.state = 'recording';
    this.trayManager.setState('recording');

    try {
      const audioConfig = this.configStore.getAudioConfig();
      await this.audioManager.startCapture(audioConfig);
    } catch (error) {
      this.state = 'idle';
      this.trayManager.setState('idle');
      this.notifyError(error);
    }
  }

  /**
   * Stop recording, encode audio, transcribe, and paste result.
   */
  async stopRecording(): Promise<void> {
    if (this.state !== 'recording') return;

    this.state = 'processing';
    this.trayManager.setState('processing');

    try {
      // Stop capture
      const pcmBuffer = await this.audioManager.stopCapture();

      // Encode
      const audioConfig = this.configStore.getAudioConfig();
      const encodedBuffer = await this.audioEncoder.encode(pcmBuffer, audioConfig.format);

      // Transcribe
      const endpointConfig = this.configStore.getEndpointConfig();
      const apiKey = this.secretStore.getApiKey();
      const adapter = this.adapterFactory.createAdapter(endpointConfig.url, apiKey ?? undefined);
      const result = await adapter.transcribe(encodedBuffer, {
        model: endpointConfig.model,
        language: endpointConfig.language,
      });

      // Paste
      await pasteText(result.text);
    } catch (error) {
      this.notifyError(error);
    } finally {
      this.state = 'idle';
      this.trayManager.setState('idle');
    }
  }

  /**
   * Get current recording state.
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * Map errors to user-friendly notification messages and show notification.
   */
  private notifyError(error: unknown): void {
    if (error instanceof NetworkError) {
      const message = error.message;
      if (message.includes('ECONNREFUSED') || message.includes('Cannot connect')) {
        this.notify('Connection Failed', 'Cannot connect to STT endpoint. Is your service running?');
      } else if (message.includes('ETIMEDOUT') || message.includes('timed out')) {
        this.notify('Connection Timed Out', 'STT endpoint took too long. Try increasing the timeout.');
      } else if (message.includes('Authentication') || message.includes('401') || message.includes('403')) {
        this.notify('Authentication Failed', 'Check your API key in Settings.');
      } else {
        this.notify('Network Error', message);
      }
    } else if (error instanceof STTError) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        this.notify('Model Not Found', 'Check the model name in Settings.');
      } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
        this.notify('Rate Limited', 'Too many requests. Wait a moment and try again.');
      } else {
        this.notify('Transcription Error', error.message);
      }
    } else if (error instanceof AudioError) {
      this.notify('Recording Failed', error.message);
    } else if (error instanceof Voice2CodeError) {
      this.notify('Error', error.message);
    } else {
      this.notify('Error', 'An unexpected error occurred. Check console for details.');
      console.error('Unexpected error:', error);
    }
  }
}
```

### Test File
`desktop/tests/unit/desktop-engine.test.ts`

---

## Component 7: SettingsWindow

### Purpose
Manages the BrowserWindow for settings and registers IPC handlers for the settings renderer.

### Location
`desktop/src/settings-window.ts`

### Dependencies
- `BrowserWindow`, `ipcMain` from `electron`
- `ConfigStore` from `./config-store`
- `SecretStore` from `./secret-store`
- `testEndpointConnectivity` from `@core/config/endpoint-validator`

### Class Definition

```typescript
import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ConfigStore } from './config-store';
import { SecretStore } from './secret-store';
import { testEndpointConnectivity } from '@core/config/endpoint-validator';

export class SettingsWindow {
  private window: BrowserWindow | null = null;

  /**
   * @param configStore - Desktop config store
   * @param secretStore - API key secret store
   */
  constructor(
    private configStore: ConfigStore,
    private secretStore: SecretStore
  ) {
    this.registerIPCHandlers();
  }

  /**
   * Show the settings window. Creates a new window if none exists,
   * otherwise focuses the existing one.
   */
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

  /**
   * Close the settings window if open.
   */
  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  /**
   * Check if the settings window is currently open.
   */
  isOpen(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  /**
   * Register all IPC handlers for settings communication.
   * Called once in constructor.
   */
  private registerIPCHandlers(): void {
    ipcMain.handle('settings:get', async () => {
      return this.configStore.getAll();
    });

    ipcMain.handle('settings:save', async (_event, config: unknown) => {
      try {
        // Validate that config is an object
        if (!config || typeof config !== 'object') {
          return { success: false, error: 'Invalid configuration data' };
        }
        this.configStore.save(config as Partial<any>);
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
```

### Test File
`desktop/tests/unit/settings-window.test.ts`

---

## Component Dependency Graph

```
                    ┌──────────────────┐
                    │    main.ts       │
                    │  (entry point)   │
                    └───────┬──────────┘
                            │ creates
           ┌────────────────┼────────────────────────┐
           │                │                        │
           ▼                ▼                        ▼
  ┌────────────────┐ ┌──────────────┐  ┌─────────────────────┐
  │  ConfigStore   │ │ SecretStore  │  │    TrayManager      │
  │                │ │              │  │                     │
  │ electron-store │ │ safeStorage  │  │ Tray + Menu         │
  └───────┬────────┘ └──────┬───────┘  └──────────┬──────────┘
          │                 │                     │
          └────────┬────────┘                     │
                   │                              │
                   ▼                              │
          ┌────────────────┐                      │
          │ DesktopEngine  │◄─────────────────────┘
          │                │
          │ State machine  │
          └───────┬────────┘
                  │ uses
       ┌──────────┼──────────────┐
       │          │              │
       ▼          ▼              ▼
  ┌─────────┐ ┌──────────┐ ┌──────────┐
  │AudioMgr │ │AudioEnc  │ │pasteText │
  │ (shared)│ │ (shared) │ │          │
  └─────────┘ └──────────┘ └──────────┘

  ┌─────────────────────┐
  │  HotkeyManager      │  ← wired in main.ts
  │  globalShortcut     │     calls engine.toggleRecording()
  └─────────────────────┘

  ┌─────────────────────┐
  │  SettingsWindow     │  ← uses ConfigStore + SecretStore
  │  BrowserWindow+IPC  │     via IPC handlers
  └─────────────────────┘
```

---

## Test Directory Structure

```
desktop/tests/
├── unit/
│   ├── config-store.test.ts
│   ├── secret-store.test.ts
│   ├── tray.test.ts
│   ├── hotkey.test.ts
│   ├── paste.test.ts
│   ├── desktop-engine.test.ts
│   └── settings-window.test.ts
└── integration/
    └── recording-flow.test.ts
```

### Mocking Strategy

| External Dependency | Mock Approach |
|---|---|
| `electron` (Tray, Menu, BrowserWindow, etc.) | Jest manual mock at `__mocks__/electron.ts` |
| `electron` (safeStorage) | Mock `isEncryptionAvailable`, `encryptString`, `decryptString` |
| `electron` (globalShortcut) | Mock `register`, `unregister` |
| `electron` (clipboard) | Mock `readText`, `writeText` |
| `electron-store` | Mock constructor and get/set/delete/has methods |
| `@nut-tree/nut-js` | Mock `keyboard.type` |
| `@core/audio/audio-manager` | Mock `startCapture`, `stopCapture` |
| `@core/audio/audio-encoder` | Mock `encode` |
| `@core/adapters/adapter-factory` | Mock `createAdapter` returning mock adapter |
| `@core/config/endpoint-validator` | Mock `testEndpointConnectivity`, use real `validateEndpointUrl`/`validateModelName` |

### Electron Mock Template

```typescript
// desktop/tests/__mocks__/electron.ts
export const app = {
  on: jest.fn(),
  quit: jest.fn(),
  dock: { hide: jest.fn() },
  getPath: jest.fn().mockReturnValue('/tmp/test-app'),
};

export const Tray = jest.fn().mockImplementation(() => ({
  setImage: jest.fn(),
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  destroy: jest.fn(),
}));

export const Menu = {
  buildFromTemplate: jest.fn().mockReturnValue({}),
};

export const nativeImage = {
  createFromPath: jest.fn().mockReturnValue({}),
};

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
  close: jest.fn(),
  isDestroyed: jest.fn().mockReturnValue(false),
  on: jest.fn(),
  once: jest.fn(),
}));

export const ipcMain = {
  handle: jest.fn(),
};

export const globalShortcut = {
  register: jest.fn().mockReturnValue(true),
  unregister: jest.fn(),
  unregisterAll: jest.fn(),
};

export const clipboard = {
  readText: jest.fn().mockReturnValue(''),
  writeText: jest.fn(),
};

export const safeStorage = {
  isEncryptionAvailable: jest.fn().mockReturnValue(true),
  encryptString: jest.fn().mockImplementation((str: string) =>
    Buffer.from(`encrypted:${str}`)
  ),
  decryptString: jest.fn().mockImplementation((buf: Buffer) =>
    buf.toString().replace('encrypted:', '')
  ),
};

export const systemPreferences = {
  isTrustedAccessibilityClient: jest.fn().mockReturnValue(true),
};

export const Notification = jest.fn().mockImplementation(() => ({
  show: jest.fn(),
}));
```

---

**Document Version:** 1.0
**Sprint:** v3
**Last Updated:** February 20, 2026
