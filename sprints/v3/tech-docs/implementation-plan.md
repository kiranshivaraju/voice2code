# Implementation Plan

## Overview

Step-by-step plan for implementing the Voice2Code macOS desktop app in Sprint v3. The plan is organized into 5 phases following the dependency order from the sprint plan.

**Branch:** `feature/desktop-app`

**Total estimated effort:** 11-14 days

---

## Phase 1: Project Scaffold (Days 1-2)

### Step 1: Create desktop/package.json

Create the Electron app's package manifest with all required dependencies.

**File to create:** `desktop/package.json`

```json
{
  "name": "voice2code-desktop",
  "version": "0.1.0",
  "description": "Voice2Code — System-wide speech-to-text for macOS",
  "main": "dist/main.js",
  "author": "Voice2Code Contributors",
  "license": "MIT",
  "private": true,
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "build:watch": "webpack --config webpack.config.js --watch",
    "start": "npm run build && electron dist/main.js",
    "test": "jest --config jest.config.js",
    "test:watch": "jest --config jest.config.js --watch",
    "lint": "eslint src/ --ext .ts"
  },
  "dependencies": {
    "axios": "^1.6.5",
    "electron-store": "^8.1.0",
    "form-data": "^4.0.0",
    "lamejs": "^1.2.0",
    "node-record-lpcm16": "^1.0.1",
    "@nut-tree/nut-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "@types/node": "^20.10.6",
    "electron": "^28.1.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "ts-loader": "^9.5.1",
    "typescript": "^5.3.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "copy-webpack-plugin": "^12.0.0"
  }
}
```

**Testing:** `cd desktop && npm install` completes without errors.

---

### Step 2: Create desktop/tsconfig.json

TypeScript configuration with path alias to shared core modules.

**File to create:** `desktop/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@core/*": ["../src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Key decision:** `@core/*` alias maps to `../src/*` so desktop code imports shared modules as `import { AudioManager } from '@core/audio/audio-manager'`.

---

### Step 3: Create desktop/webpack.config.js

Webpack configuration with 3 entry points: main process, preload script, and settings renderer.

**File to create:** `desktop/webpack.config.js`

```javascript
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const commonConfig = {
  mode: 'development',
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@core': path.resolve(__dirname, '../src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    electron: 'commonjs electron',
    'node-record-lpcm16': 'commonjs node-record-lpcm16',
    '@nut-tree/nut-js': 'commonjs @nut-tree/nut-js',
    'electron-store': 'commonjs electron-store',
  },
};

module.exports = [
  // Main process
  {
    ...commonConfig,
    target: 'electron-main',
    entry: './src/main.ts',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'assets', to: 'assets' },
          { from: 'src/settings/settings.html', to: 'settings/settings.html' },
          { from: 'src/settings/settings.css', to: 'settings/settings.css' },
        ],
      }),
    ],
  },
  // Preload script
  {
    ...commonConfig,
    target: 'electron-preload',
    entry: './src/preload.ts',
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist'),
    },
  },
  // Settings renderer
  {
    ...commonConfig,
    target: 'web',
    entry: './src/settings/settings-renderer.ts',
    output: {
      filename: 'settings/settings-renderer.js',
      path: path.resolve(__dirname, 'dist'),
    },
    externals: {},  // Renderer has no Node.js externals
  },
];
```

**Key decisions:**
- Externalize `electron`, `node-record-lpcm16`, `@nut-tree/nut-js`, `electron-store` — these must be resolved at runtime, not bundled
- Renderer target is `web` (no Node.js APIs in renderer)
- Copy static assets (icons, HTML, CSS) to dist

**Testing:** `cd desktop && npm run build` completes without errors.

---

### Step 4: Create jest.config.js

**File to create:** `desktop/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/../src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/settings/**',  // Renderer code tested separately
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

### Step 5: Create tray icon assets

**Files to create:**
- `desktop/assets/trayIconTemplate.png` — Idle state (16x16 and 32x32 @2x, macOS template image)
- `desktop/assets/trayIconTemplate@2x.png` — Idle state @2x
- `desktop/assets/tray-recording.png` — Recording state (red)
- `desktop/assets/tray-recording@2x.png` — Recording state @2x
- `desktop/assets/tray-processing.png` — Processing state (yellow/orange)
- `desktop/assets/tray-processing@2x.png` — Processing state @2x

**Note:** For Sprint v3, use simple colored circles or placeholder icons. Template images (idle) must be black-only PNGs with transparency — macOS will automatically adapt them for light/dark mode. Recording and processing icons are non-template (colored).

**Testing:** Icons display correctly in menu bar on macOS.

---

## Phase 2: Config & Secrets (Days 2-3)

### Step 6: Implement ConfigStore

**File to create:** `desktop/src/config-store.ts`

**TDD approach:**
1. Write tests first: `desktop/tests/unit/config-store.test.ts`
2. Implement `ConfigStore` class

**Class responsibilities:**
- Wraps `electron-store` with typed schema
- Validates all values before saving
- Returns shared types (`EndpointConfiguration`, `AudioConfiguration`)
- Deep-merges partial updates

**Methods:**
- `constructor()` — creates electron-store with schema and defaults
- `getEndpointConfig(): EndpointConfiguration` — returns endpoint config mapped to shared type
- `getAudioConfig(): AudioConfiguration` — returns audio config mapped to shared type (deviceId always `'default'`)
- `getUIConfig(): { showNotifications: boolean }` — returns UI config
- `getAll(): DesktopConfig` — returns complete config
- `save(partial: Partial<DesktopConfig>): void` — validates and saves partial config
- `reset(): void` — resets to defaults

**Test cases:**
- Returns defaults on fresh store
- Saves and retrieves endpoint config
- Saves and retrieves audio config
- Validates URL (rejects non-http/https)
- Validates model name (rejects path traversal)
- Clamps timeout to valid range
- Deep-merges partial updates (doesn't overwrite unrelated fields)
- Maps to shared `EndpointConfiguration` interface correctly
- Maps to shared `AudioConfiguration` interface correctly

---

### Step 7: Implement SecretStore

**File to create:** `desktop/src/secret-store.ts`

**TDD approach:**
1. Write tests first: `desktop/tests/unit/secret-store.test.ts`
2. Implement `SecretStore` class

**Class responsibilities:**
- Encrypts API keys via `safeStorage`
- Stores encrypted blob as base64 in electron-store
- Provides get/set/delete operations
- Handles encryption unavailability gracefully

**Methods:**
- `constructor(store: ElectronStore)` — takes electron-store instance (dependency injection for testing)
- `setApiKey(apiKey: string): void` — validate, encrypt, store
- `getApiKey(): string | null` — retrieve, decrypt, return (null if none stored)
- `deleteApiKey(): void` — remove from store
- `hasApiKey(): boolean` — check if key exists
- `getApiKeyMasked(): string | null` — get masked version for UI display

**Test cases (mock safeStorage and electron-store):**
- Stores and retrieves API key
- Returns null when no key stored
- Rejects empty API key
- Rejects whitespace-only API key
- Trims whitespace before encrypting
- Throws ConfigurationError when safeStorage unavailable
- Deletes key successfully
- Returns null and deletes on decryption failure (corrupt data)
- Masks key correctly: `"sk-abc123xyz"` → `"*******3xyz"`
- Masks short keys: `"abcd"` → `"****"`
- `hasApiKey()` returns true when key exists, false otherwise

---

## Phase 3: Desktop App Core (Days 3-7)

### Step 8: Implement TrayManager

**File to create:** `desktop/src/tray.ts`

**TDD approach:**
1. Write tests first: `desktop/tests/unit/tray.test.ts`
2. Implement `TrayManager` class

**Class responsibilities:**
- Creates and manages the macOS tray icon
- Builds context menu with dynamic enable/disable
- Updates icon based on recording state

**Constructor:** `constructor(iconPaths: TrayIconPaths)`

```typescript
interface TrayIconPaths {
  idle: string;      // Path to template icon
  recording: string; // Path to red icon
  processing: string; // Path to yellow icon
}
```

**Methods:**
- `create(): void` — creates Tray instance with idle icon and context menu
- `setState(state: RecordingState): void` — updates icon and rebuilds menu
- `setOnStartRecording(callback: () => void): void` — set handler
- `setOnStopRecording(callback: () => void): void` — set handler
- `setOnOpenSettings(callback: () => void): void` — set handler
- `setOnTestConnection(callback: () => void): void` — set handler
- `setOnQuit(callback: () => void): void` — set handler
- `destroy(): void` — removes tray icon

**Test cases (mock Electron Tray and Menu):**
- Creates tray with idle icon
- Updates icon on state change
- Context menu has correct items
- Start Recording enabled only when idle
- Stop Recording enabled only when recording
- Callbacks are invoked correctly

---

### Step 9: Implement HotkeyManager

**File to create:** `desktop/src/hotkey.ts`

**TDD approach:**
1. Write tests first: `desktop/tests/unit/hotkey.test.ts`
2. Implement `HotkeyManager` class

**Class responsibilities:**
- Registers/unregisters global keyboard shortcut
- Invokes callback on hotkey press

**Methods:**
- `constructor(accelerator: string)` — default `'CommandOrControl+Shift+V'`
- `register(callback: () => void): boolean` — registers shortcut, returns success
- `unregister(): void` — unregisters shortcut
- `isRegistered(): boolean` — check registration status

**Edge cases:**
- If shortcut is already registered by another app, `register()` returns `false`
- On app quit, `unregister()` must be called (or `globalShortcut.unregisterAll()`)
- If user is in Settings window and presses hotkey, it should still work (global shortcut)

**Test cases (mock Electron globalShortcut):**
- Registers shortcut successfully
- Invokes callback on shortcut press
- Returns false when registration fails
- Unregisters cleanly
- `isRegistered()` reflects current state

---

### Step 10: Implement pasteText function

**File to create:** `desktop/src/paste.ts`

**TDD approach:**
1. Write tests first: `desktop/tests/unit/paste.test.ts`
2. Implement `pasteText()` function

**Function signature:**
```typescript
async function pasteText(text: string): Promise<void>
```

**Algorithm:**
1. Save current clipboard content: `const previous = clipboard.readText()`
2. Write transcribed text to clipboard: `clipboard.writeText(text)`
3. Wait 50ms for clipboard to settle
4. Simulate Cmd+V: use `@nut-tree/nut-js` `keyboard.type(Key.LeftSuper, Key.V)`
5. Wait 500ms for paste to complete
6. Restore previous clipboard: `clipboard.writeText(previous)`

**Edge cases:**
- If clipboard contains non-text content (image, file), `readText()` returns empty string — that's fine, we restore empty string
- If nut.js throws (Accessibility not granted), catch and throw `AudioError` with message: "Accessibility permission required. Open System Preferences > Privacy & Security > Accessibility and add Voice2Code."
- If text is empty string, skip paste entirely (no-op)

**Test cases (mock clipboard and nut.js):**
- Pastes text via clipboard + Cmd+V
- Restores previous clipboard content
- Handles empty previous clipboard
- Throws on Accessibility permission failure
- Skips paste for empty text

---

### Step 11: Implement DesktopEngine

**File to create:** `desktop/src/desktop-engine.ts`

**TDD approach:**
1. Write tests first: `desktop/tests/unit/desktop-engine.test.ts`
2. Implement `DesktopEngine` class

**Class responsibilities:**
- State machine: idle → recording → processing → idle
- Orchestrates: capture → encode → transcribe → paste
- Error handling with notifications
- Bridges shared core modules with desktop-specific paste

**Constructor:**
```typescript
constructor(
  configStore: ConfigStore,
  secretStore: SecretStore,
  audioManager: AudioManager,
  audioEncoder: AudioEncoder,
  trayManager: TrayManager,
  notifier: (title: string, body: string) => void
)
```

**Methods:**
- `async toggleRecording(): Promise<void>` — if idle → start, if recording → stop, if processing → ignore
- `async startRecording(): Promise<void>` — start audio capture, update tray
- `async stopRecording(): Promise<void>` — stop capture, encode, transcribe, paste, update tray
- `getState(): RecordingState` — current state

**toggleRecording() flow:**
```
if state === 'idle':
  state = 'recording'
  tray.setState('recording')
  config = configStore.getEndpointConfig()
  audioConfig = configStore.getAudioConfig()
  try:
    audioManager.startCapture(audioConfig)
  catch AudioError:
    state = 'idle'
    tray.setState('idle')
    notifier('Recording Failed', error.message)

if state === 'recording':
  state = 'processing'
  tray.setState('processing')
  try:
    pcmBuffer = await audioManager.stopCapture()
    audioConfig = configStore.getAudioConfig()
    encodedBuffer = await audioEncoder.encode(pcmBuffer, audioConfig.format)
    apiKey = secretStore.getApiKey()  // may be null
    endpointConfig = configStore.getEndpointConfig()
    adapter = AdapterFactory.createAdapter(endpointConfig.url, apiKey)
    result = await adapter.transcribe(encodedBuffer, {
      model: endpointConfig.model,
      language: endpointConfig.language,
    })
    await pasteText(result.text)
  catch error:
    notifier('Transcription Failed', mapErrorToMessage(error))
  finally:
    state = 'idle'
    tray.setState('idle')

if state === 'processing':
  // Ignore — don't interrupt ongoing transcription
```

**Error message mapping:**

| Error Type | Notification Title | Notification Body |
|------------|-------------------|-------------------|
| `NetworkError` (ECONNREFUSED) | `Connection Failed` | `Cannot connect to STT endpoint. Is your service running?` |
| `NetworkError` (ETIMEDOUT) | `Connection Timed Out` | `STT endpoint took too long. Try increasing the timeout.` |
| `NetworkError` (401/403) | `Authentication Failed` | `Check your API key in Settings.` |
| `STTError` (404) | `Model Not Found` | `Model "{model}" not found on endpoint.` |
| `STTError` (429) | `Rate Limited` | `Too many requests. Wait a moment and try again.` |
| `AudioError` | `Recording Failed` | `{error.message}` |
| `ConfigurationError` | `Configuration Error` | `{error.message}` |
| Other | `Error` | `An unexpected error occurred. Check console for details.` |

**Test cases (mock all dependencies):**
- State transitions: idle → recording → processing → idle
- Ignores toggle during processing state
- Calls audioManager.startCapture on start
- Calls audioManager.stopCapture, audioEncoder.encode, adapter.transcribe, pasteText on stop
- Updates tray state at each transition
- Shows notification on network error
- Shows notification on audio error
- Shows notification on STT error
- Restores idle state after error
- Passes correct config to adapter factory and transcribe

---

### Step 12: Implement main.ts

**File to create:** `desktop/src/main.ts`

**Responsibilities:**
- Electron app entry point
- Hides dock icon (`app.dock.hide()`)
- Checks Accessibility permissions on launch
- Wires all components together
- Handles app lifecycle (ready, quit, window-all-closed)

**Startup sequence:**
```
1. app.on('ready'):
   a. app.dock.hide()  // No dock icon
   b. Check Accessibility: systemPreferences.isTrustedAccessibilityClient(true)
      - If not trusted, show Notification: "Voice2Code needs Accessibility permission to paste text. Please grant it in System Preferences."
   c. Create ConfigStore
   d. Create SecretStore(configStore.store)
   e. Create DeviceManager
   f. Create AudioManager(deviceManager)
   g. Create AudioEncoder
   h. Create TrayManager(iconPaths)
   i. Create DesktopEngine(configStore, secretStore, audioManager, audioEncoder, trayManager, showNotification)
   j. Create HotkeyManager('CommandOrControl+Shift+V')
   k. hotkeyManager.register(() => engine.toggleRecording())
   l. Wire tray callbacks:
      - onStartRecording → engine.startRecording()
      - onStopRecording → engine.stopRecording()
      - onOpenSettings → settingsWindow.show()
      - onTestConnection → testAndNotify()
      - onQuit → app.quit()
   m. Create SettingsWindow(configStore, secretStore)

2. app.on('window-all-closed'):
   // Don't quit — this is a tray app
   // On macOS, e.preventDefault() or just don't call app.quit()

3. app.on('before-quit'):
   a. hotkeyManager.unregister()
   b. trayManager.destroy()
```

**showNotification helper:**
```typescript
function showNotification(title: string, body: string): void {
  if (configStore.getUIConfig().showNotifications) {
    new Notification({ title, body }).show();
  }
}
```

**testAndNotify helper:**
```typescript
async function testAndNotify(): Promise<void> {
  const config = configStore.getEndpointConfig();
  const success = await testEndpointConnectivity(config.url, 5000);
  if (success) {
    showNotification('Connection Successful', `Connected to ${config.url}`);
  } else {
    showNotification('Connection Failed', `Cannot reach ${config.url}`);
  }
}
```

**Testing:** `cd desktop && npm run build && npx electron dist/main.js` launches app in menu bar.

---

## Phase 4: Settings UI (Days 7-9)

### Step 13: Implement preload.ts

**File to create:** `desktop/src/preload.ts`

**Implementation:**
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('settings:get'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('settings:save', config),
  getApiKeyMasked: () => ipcRenderer.invoke('settings:get-api-key'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('settings:set-api-key', { apiKey }),
  deleteApiKey: () => ipcRenderer.invoke('settings:delete-api-key'),
  testConnection: () => ipcRenderer.invoke('settings:test-connection'),
});
```

No tests needed — this is a thin bridge with no logic.

---

### Step 14: Implement SettingsWindow

**File to create:** `desktop/src/settings-window.ts`

**TDD approach:**
1. Write tests first: `desktop/tests/unit/settings-window.test.ts`
2. Implement `SettingsWindow` class

**Class responsibilities:**
- Creates/manages BrowserWindow for settings
- Registers IPC handlers for all `settings:*` channels
- Reuses existing window (no duplicates)

**Constructor:**
```typescript
constructor(
  configStore: ConfigStore,
  secretStore: SecretStore
)
```

**Methods:**
- `show(): void` — show existing window or create new one
- `close(): void` — close window if open
- `isOpen(): boolean` — check if window is open
- `registerIPCHandlers(): void` — register all `settings:*` handlers on `ipcMain`

**BrowserWindow options:**
```typescript
{
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
  show: false,  // Show after 'ready-to-show'
}
```

**IPC handlers (registered once in constructor):**
- `settings:get` → calls `configStore.getAll()`
- `settings:save` → validates input, calls `configStore.save()`
- `settings:get-api-key` → calls `secretStore.getApiKeyMasked()`
- `settings:set-api-key` → calls `secretStore.setApiKey()`
- `settings:delete-api-key` → calls `secretStore.deleteApiKey()`
- `settings:test-connection` → uses `testEndpointConnectivity()` with current config

**Test cases (mock BrowserWindow and ipcMain):**
- Creates window with correct options
- Shows existing window instead of creating duplicate
- IPC handlers return correct data
- IPC save validates input and rejects invalid config
- IPC test-connection uses saved config

---

### Step 15: Create Settings HTML/CSS

**File to create:** `desktop/src/settings/settings.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none';">
  <title>Voice2Code Settings</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
  <div class="container">
    <h1>Voice2Code Settings</h1>

    <section class="section">
      <h2>Endpoint</h2>
      <div class="field">
        <label for="endpoint-url">Endpoint URL</label>
        <input type="url" id="endpoint-url" placeholder="http://localhost:8000/v1/audio/transcriptions">
      </div>
      <div class="field">
        <label for="model-name">Model</label>
        <input type="text" id="model-name" placeholder="whisper-large-v3">
      </div>
      <div class="field">
        <label for="language">Language</label>
        <input type="text" id="language" placeholder="en" maxlength="5">
      </div>
      <div class="field">
        <label for="timeout">Timeout (ms)</label>
        <input type="number" id="timeout" min="1000" max="120000" step="1000">
      </div>
      <div class="field">
        <button id="test-connection" class="btn-secondary">Test Connection</button>
        <span id="test-result" class="test-result"></span>
      </div>
    </section>

    <section class="section">
      <h2>API Key</h2>
      <div class="field">
        <label for="api-key">API Key</label>
        <input type="password" id="api-key" placeholder="Enter API key (optional for local models)">
        <span id="api-key-status" class="api-key-status"></span>
      </div>
      <div class="field field-row">
        <button id="save-api-key" class="btn-secondary">Save API Key</button>
        <button id="delete-api-key" class="btn-danger">Delete API Key</button>
      </div>
    </section>

    <section class="section">
      <h2>Audio</h2>
      <div class="field">
        <label for="audio-format">Format</label>
        <select id="audio-format">
          <option value="mp3">MP3</option>
          <option value="wav">WAV</option>
        </select>
      </div>
      <div class="field">
        <label for="sample-rate">Sample Rate</label>
        <select id="sample-rate">
          <option value="8000">8000 Hz</option>
          <option value="16000">16000 Hz (Recommended)</option>
          <option value="22050">22050 Hz</option>
          <option value="44100">44100 Hz</option>
        </select>
      </div>
    </section>

    <section class="section">
      <div class="field">
        <button id="save-settings" class="btn-primary">Save Settings</button>
        <span id="save-result" class="save-result"></span>
      </div>
    </section>
  </div>

  <script src="settings-renderer.js"></script>
</body>
</html>
```

**File to create:** `desktop/src/settings/settings.css`

Keep styling minimal and native-looking:
- System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`)
- 520px max width
- Subtle borders and padding
- Native-feeling form inputs
- Green for success, red for errors
- Disabled state styling for buttons during operations

---

### Step 16: Implement settings-renderer.ts

**File to create:** `desktop/src/settings/settings-renderer.ts`

**Responsibilities:**
- Load current config on page load
- Populate form fields with saved values
- Handle Save Settings button → call `settingsAPI.saveConfig()`
- Handle Save/Delete API Key buttons → call `settingsAPI.setApiKey()` / `settingsAPI.deleteApiKey()`
- Handle Test Connection button → call `settingsAPI.testConnection()`
- Show inline status messages (success/error)

**On page load:**
```typescript
document.addEventListener('DOMContentLoaded', async () => {
  // Load config
  const config = await window.settingsAPI.getConfig();
  populateForm(config);

  // Load API key status
  const maskedKey = await window.settingsAPI.getApiKeyMasked();
  updateApiKeyStatus(maskedKey);
});
```

**Button handlers:**
- **Save Settings:** Collect form values → `saveConfig()` → show "Saved" or error
- **Save API Key:** Read API key input → `setApiKey()` → show masked key → clear input
- **Delete API Key:** `deleteApiKey()` → update status
- **Test Connection:** `testConnection()` → show "Connected (142ms)" or error message

**UI feedback:**
- Disable buttons during async operations
- Show spinner or "Testing..." text during connection test
- Show green "Saved" text on success, red error message on failure
- Auto-clear status messages after 3 seconds

---

## Phase 5: Error Handling & Polish (Days 9-11)

### Step 17: Implement error notifications in DesktopEngine

Already covered in Step 11. This phase focuses on:
- Testing all error scenarios end-to-end
- Verifying macOS notifications display correctly
- Ensuring tray icon always returns to idle after errors

### Step 18: Implement Accessibility permission check

In `main.ts`, on app ready:
```typescript
const trusted = systemPreferences.isTrustedAccessibilityClient(true);
if (!trusted) {
  new Notification({
    title: 'Accessibility Permission Required',
    body: 'Voice2Code needs Accessibility access to paste text. Please grant it in System Preferences > Privacy & Security > Accessibility.',
  }).show();
}
```

The `true` parameter causes macOS to show the system permission dialog automatically.

### Step 19: Create entitlements.plist

**File to create:** `desktop/entitlements.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
</dict>
</plist>
```

### Step 20: Write integration tests

**File to create:** `desktop/tests/integration/recording-flow.test.ts`

Test the complete flow with mocked external dependencies:
1. Engine starts in idle state
2. Toggle → starts recording (audio capture called)
3. Toggle → stops recording, encodes, transcribes, pastes
4. Engine returns to idle
5. Error during transcription → notification shown, idle restored

---

## Phase Summary

| Phase | Days | Features | Key Deliverable |
|-------|------|----------|----------------|
| 1: Scaffold | 1-2 | — | Project builds, icons ready |
| 2: Config | 2-3 | F2, F5 | Config and secret stores |
| 3: Core | 3-7 | F1 | Tray, hotkey, paste, engine, main.ts |
| 4: Settings | 7-9 | F6 | Settings window with IPC |
| 5: Polish | 9-11 | F8 | Error notifications, permissions, integration tests |

---

## Verification Checklist

After all phases complete:

- [ ] `cd desktop && npm install` — no errors
- [ ] `cd desktop && npm run build` — webpack succeeds
- [ ] `cd desktop && npx electron dist/main.js` — app appears in menu bar
- [ ] No dock icon visible
- [ ] Tray context menu works (Start/Stop/Settings/Test/Quit)
- [ ] Settings window opens, saves config, persists after restart
- [ ] API key encrypts/decrypts via safeStorage
- [ ] Test Connection works from tray and settings window
- [ ] Cmd+Shift+V toggles recording from any app
- [ ] Transcribed text pastes into Ghostty, browser, Notes, VS Code
- [ ] Tray icon changes: idle → red → yellow → idle
- [ ] Error notifications display on connection failure
- [ ] `cd desktop && npm test` — all tests pass with 80%+ coverage
- [ ] Existing VS Code extension tests still pass (`cd .. && npm test`)

---

**Document Version:** 1.0
**Sprint:** v3
**Last Updated:** February 20, 2026
