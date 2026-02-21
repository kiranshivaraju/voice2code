# GitHub Issues Preview - Sprint v3

**Generated:** February 20, 2026
**Total Issues:** 12

---

## Issue 1: [P0][infrastructure] Set up Electron desktop project scaffold

**Labels:** P0, infrastructure
**Milestone:** Sprint v3

### Description

Create the `desktop/` project directory with all build tooling: `package.json`, `tsconfig.json`, `webpack.config.js`, `jest.config.js`, and placeholder tray icon assets. After this issue, `cd desktop && npm install && npm run build` must succeed.

### Context

Sprint: v3
Feature: Foundation for all desktop features
Phase: Phase 1 — Project Scaffold (Steps 1-5)

### Detailed Requirements

**Files to create:**

1. **`desktop/package.json`** — Electron app manifest
   - name: `voice2code-desktop`, version: `0.1.0`
   - Scripts: `build` (webpack), `start` (build + electron), `test` (jest), `lint` (eslint)
   - Dependencies: `axios`, `electron-store@^8.1.0`, `form-data`, `lamejs`, `node-record-lpcm16`, `@nut-tree/nut-js@^4.2.0`
   - DevDependencies: `electron@^28.1.0`, `@types/jest`, `@types/node`, `jest`, `ts-jest`, `ts-loader`, `typescript`, `webpack`, `webpack-cli`, `copy-webpack-plugin`

2. **`desktop/tsconfig.json`** — TypeScript config
   - Target: ES2020, module: commonjs, strict: true
   - Path alias: `@core/*` → `../src/*` (maps to shared core modules)
   - baseUrl: `.`

3. **`desktop/webpack.config.js`** — 3 entry points:
   - Main process (`src/main.ts` → `dist/main.js`, target: `electron-main`)
   - Preload script (`src/preload.ts` → `dist/preload.js`, target: `electron-preload`)
   - Settings renderer (`src/settings/settings-renderer.ts` → `dist/settings/settings-renderer.js`, target: `web`)
   - Externalize: `electron`, `node-record-lpcm16`, `@nut-tree/nut-js`, `electron-store`
   - CopyPlugin: copy `assets/`, `settings.html`, `settings.css` to dist
   - Alias: `@core` → `path.resolve(__dirname, '../src')`

4. **`desktop/jest.config.js`** — Test config
   - Preset: ts-jest, testEnvironment: node
   - moduleNameMapper: `@core/(.*)` → `<rootDir>/../src/$1`
   - Coverage threshold: 80% (branches, functions, lines, statements)

5. **`desktop/assets/`** — Tray icon placeholders
   - `trayIconTemplate.png` (16x16, black-only template for macOS light/dark)
   - `trayIconTemplate@2x.png` (32x32)
   - `tray-recording.png` (16x16, red dot)
   - `tray-recording@2x.png` (32x32)
   - `tray-processing.png` (16x16, yellow/orange)
   - `tray-processing@2x.png` (32x32)

6. **`desktop/tests/__mocks__/electron.ts`** — Electron mock for jest
   - Mock: `app`, `Tray`, `Menu`, `nativeImage`, `BrowserWindow`, `ipcMain`, `globalShortcut`, `clipboard`, `safeStorage`, `systemPreferences`, `Notification`

### Acceptance Criteria

- [ ] `cd desktop && npm install` completes without errors
- [ ] `cd desktop && npm run build` — webpack succeeds (may emit empty bundles until source files exist)
- [ ] `@core/*` path alias resolves correctly in TypeScript
- [ ] Jest can run with `cd desktop && npx jest --passWithNoTests`
- [ ] All 6 tray icon files exist in `desktop/assets/`
- [ ] Electron mock file created for tests

### Dependencies

None — this is the first issue.

### References

- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Steps 1-5)
- Product Architecture: `product/tech-docs/architecture.md`

---

## Issue 2: [P0][feature] Implement ConfigStore for desktop config persistence

**Labels:** P0, feature
**Milestone:** Sprint v3

### Description

Implement the `ConfigStore` class that wraps `electron-store` to provide typed, validated configuration persistence for the desktop app. This replaces the VS Code `ConfigurationManager` with an Electron-compatible equivalent.

### Context

Sprint: v3
Feature: Feature 2 — Model Configuration (Desktop)
Phase: Phase 2 — Config & Secrets (Step 6)

### Detailed Requirements

**File to create:** `desktop/src/config-store.ts`

**Config Schema (DesktopConfig):**

| Field Path | Type | Default | Constraints |
|------------|------|---------|-------------|
| `endpoint.url` | string | `http://localhost:8000/v1/audio/transcriptions` | Valid HTTP/HTTPS URL |
| `endpoint.model` | string | `whisper-large-v3` | Alphanumeric + `._-/`, max 100 chars, no `..` |
| `endpoint.timeout` | number | `30000` | 1000-120000 ms, clamp to range |
| `endpoint.language` | string | `en` | ISO 639-1, 2-5 chars, regex `/^[a-z]{2}(-[A-Z]{2})?$/` |
| `audio.sampleRate` | number | `16000` | Enum: 8000, 16000, 22050, 44100 |
| `audio.format` | string | `mp3` | Enum: `mp3`, `wav` |
| `ui.showNotifications` | boolean | `true` | — |

**Methods:**
- `constructor()` — creates electron-store with typed schema and defaults
- `getEndpointConfig(): EndpointConfiguration` — maps to shared type (from `@core/types`)
- `getAudioConfig(): AudioConfiguration` — maps to shared type (`deviceId` always `'default'`)
- `getUIConfig(): { showNotifications: boolean }`
- `getAll(): DesktopConfig` — complete config
- `save(partial: Partial<DesktopConfig>): void` — validate + deep-merge partial updates
- `reset(): void` — clear to defaults

**Validation (in `save()`):**
- URL: Use shared `validateEndpointUrl()` from `@core/config/endpoint-validator`
- Model: Use shared `validateModelName()` from `@core/config/endpoint-validator`
- Timeout: Clamp to [1000, 120000]
- Invalid sample rate → default 16000
- Invalid format → default `'mp3'`
- Throw `ConfigurationError` on invalid URL or model name

### Testing Requirements

**File:** `desktop/tests/unit/config-store.test.ts`

- [ ] Returns defaults on fresh store
- [ ] Saves and retrieves endpoint config
- [ ] Saves and retrieves audio config
- [ ] Validates URL (rejects non-http/https, throws ConfigurationError)
- [ ] Validates model name (rejects `..` path traversal, throws ConfigurationError)
- [ ] Clamps timeout to valid range (999 → 1000, 200000 → 120000)
- [ ] Deep-merges partial updates (doesn't overwrite unrelated fields)
- [ ] Maps to shared `EndpointConfiguration` interface correctly
- [ ] Maps to shared `AudioConfiguration` interface (deviceId always `'default'`)
- [ ] Defaults invalid audio format to `'mp3'`
- [ ] Defaults invalid sample rate to 16000
- [ ] `reset()` restores all defaults

### Acceptance Criteria

- [ ] Code implemented with TDD (tests first)
- [ ] All unit tests passing (80%+ coverage)
- [ ] Uses shared validators from `@core/config/endpoint-validator`
- [ ] No code duplication with shared core

### Dependencies

Depends on: Issue #1 (project scaffold)

### References

- Data Models: `sprints/v3/tech-docs/data-models.md` (Model 1: DesktopConfig)
- Component Design: `sprints/v3/tech-docs/component-design.md` (Component 1: ConfigStore)
- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 6)

---

## Issue 3: [P0][feature] Implement SecretStore for encrypted API key management

**Labels:** P0, feature
**Milestone:** Sprint v3

### Description

Implement the `SecretStore` class that encrypts API keys using Electron's `safeStorage` API (macOS Keychain-backed) and stores the encrypted blob as base64 in electron-store.

### Context

Sprint: v3
Feature: Feature 5 — Secure API Key Management (Desktop)
Phase: Phase 2 — Config & Secrets (Step 7)

### Detailed Requirements

**File to create:** `desktop/src/secret-store.ts`

**Storage mechanism:**
- Encrypt: `safeStorage.encryptString(apiKey)` → Buffer → `.toString('base64')` → store in electron-store under `_encryptedApiKey`
- Decrypt: Read base64 → `Buffer.from(base64, 'base64')` → `safeStorage.decryptString(buffer)`

**Methods:**
- `constructor(store: Store)` — takes electron-store instance (DI for testing)
- `setApiKey(apiKey: string): void` — trim, validate non-empty, check `safeStorage.isEncryptionAvailable()`, encrypt, store
- `getApiKey(): string | null` — retrieve base64, decrypt, return (null if none stored; delete and return null on corrupt data)
- `deleteApiKey(): void` — remove `_encryptedApiKey` from store
- `hasApiKey(): boolean` — check if key exists in store
- `getApiKeyMasked(): string | null` — decrypt then mask: `'*'.repeat(len-4) + key.slice(-4)`, keys ≤4 chars → `'****'`

**Error handling:**
- Empty/whitespace-only API key → throw `ConfigurationError('API key cannot be empty')`
- `safeStorage.isEncryptionAvailable()` returns false → throw `ConfigurationError('Secure storage is not available. Cannot store API key.')`
- Decryption failure (corrupt data) → delete key, return null (don't throw)

**Security:**
- NEVER log API key values
- NEVER include plain API key in error messages
- Encrypted blob only decryptable by same user account on same machine

### Testing Requirements

**File:** `desktop/tests/unit/secret-store.test.ts`

- [ ] Stores and retrieves API key (mock safeStorage encrypt/decrypt)
- [ ] Returns null when no key stored
- [ ] Rejects empty API key (throws ConfigurationError)
- [ ] Rejects whitespace-only API key (throws ConfigurationError)
- [ ] Trims whitespace before encrypting
- [ ] Throws ConfigurationError when safeStorage unavailable
- [ ] Deletes key successfully
- [ ] Returns null and deletes on decryption failure (corrupt data)
- [ ] Masks key correctly: `"sk-abc123xyz"` → `"*******3xyz"`
- [ ] Masks short keys: `"abcd"` → `"****"`
- [ ] `hasApiKey()` returns true/false correctly
- [ ] Overwrites existing key with new one

### Acceptance Criteria

- [ ] TDD: tests written first, then implementation
- [ ] All unit tests passing (80%+ coverage)
- [ ] No plain-text API keys in logs or config files
- [ ] Graceful handling of safeStorage unavailability

### Dependencies

Depends on: Issue #1 (scaffold), Issue #2 (ConfigStore — uses electron-store instance)

### References

- Data Models: `sprints/v3/tech-docs/data-models.md` (Model 2: Encrypted API Key)
- Component Design: `sprints/v3/tech-docs/component-design.md` (Component 2: SecretStore)
- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 7)

---

## Issue 4: [P0][feature] Implement TrayManager for menu bar icon and context menu

**Labels:** P0, feature
**Milestone:** Sprint v3

### Description

Implement the `TrayManager` class that creates and manages the macOS menu bar tray icon, builds the context menu with dynamic enable/disable based on recording state, and updates the icon to reflect idle/recording/processing states.

### Context

Sprint: v3
Feature: Feature 1 — System-Wide Voice Input (Desktop App)
Phase: Phase 3 — Desktop App Core (Step 8)

### Detailed Requirements

**File to create:** `desktop/src/tray.ts`

**Constructor:** `constructor(iconPaths: TrayIconPaths)`
```typescript
interface TrayIconPaths {
  idle: string;       // Path to macOS template icon
  recording: string;  // Path to red icon
  processing: string; // Path to yellow icon
}
```

**Methods:**
- `create(): void` — creates Tray with idle icon and initial context menu
- `setState(state: RecordingState): void` — updates icon and rebuilds menu
- `setOnStartRecording(callback)` / `setOnStopRecording(callback)` / `setOnOpenSettings(callback)` / `setOnTestConnection(callback)` / `setOnQuit(callback)` — set menu handlers
- `destroy(): void` — removes tray icon

**Context menu structure:**

| Label | Visible When | Enabled When |
|-------|-------------|-------------|
| Start Recording | state === idle | state === idle |
| Stop Recording | state === recording | state === recording |
| --- separator --- | always | — |
| Settings... | always | always |
| Test Connection | always | state !== processing |
| --- separator --- | always | — |
| Quit Voice2Code | always | always |

**Icon mapping:** idle → `trayIconTemplate.png`, recording → `tray-recording.png`, processing → `tray-processing.png`

### Testing Requirements

**File:** `desktop/tests/unit/tray.test.ts`

- [ ] Creates tray with idle icon
- [ ] Updates icon when setState('recording') called
- [ ] Updates icon when setState('processing') called
- [ ] Context menu has correct items in correct order
- [ ] Start Recording visible only when idle
- [ ] Stop Recording visible only when recording
- [ ] Test Connection disabled during processing
- [ ] Callbacks are invoked when menu items clicked
- [ ] `destroy()` removes tray icon

### Acceptance Criteria

- [ ] TDD: tests first, then implementation
- [ ] All unit tests passing
- [ ] Menu rebuilds correctly on every state change
- [ ] Uses `nativeImage.createFromPath()` for icons

### Dependencies

Depends on: Issue #1 (scaffold — tray icon assets)

### References

- Data Models: `sprints/v3/tech-docs/data-models.md` (Model 5: Tray Context Menu)
- Component Design: `sprints/v3/tech-docs/component-design.md` (Component 3: TrayManager)
- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 8)

---

## Issue 5: [P0][feature] Implement HotkeyManager for global keyboard shortcut

**Labels:** P0, feature
**Milestone:** Sprint v3

### Description

Implement the `HotkeyManager` class that registers/unregisters a global keyboard shortcut (Cmd+Shift+V) using Electron's `globalShortcut` API.

### Context

Sprint: v3
Feature: Feature 1 — System-Wide Voice Input
Phase: Phase 3 — Desktop App Core (Step 9)

### Detailed Requirements

**File to create:** `desktop/src/hotkey.ts`

**Constructor:** `constructor(accelerator: string = 'CommandOrControl+Shift+V')`

**Methods:**
- `register(callback: () => void): boolean` — register shortcut, return success. If already registered, unregister first.
- `unregister(): void` — unregister shortcut if registered
- `isRegistered(): boolean` — check registration status

**Edge cases:**
- If shortcut is already registered by another app, `register()` returns `false`
- On app quit, `unregister()` must be called (or `globalShortcut.unregisterAll()`)
- Hotkey works even when Settings window is focused (it's a global shortcut)

### Testing Requirements

**File:** `desktop/tests/unit/hotkey.test.ts`

- [ ] Registers shortcut successfully (returns true)
- [ ] Invokes callback on shortcut press
- [ ] Returns false when `globalShortcut.register()` fails
- [ ] Unregisters cleanly
- [ ] `isRegistered()` reflects current state
- [ ] Re-registration unregisters old shortcut first

### Acceptance Criteria

- [ ] TDD: tests first
- [ ] All unit tests passing
- [ ] Clean unregister on destroy

### Dependencies

Depends on: Issue #1 (scaffold)

### References

- Component Design: `sprints/v3/tech-docs/component-design.md` (Component 4: HotkeyManager)
- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 9)

---

## Issue 6: [P0][feature] Implement pasteText clipboard paste function

**Labels:** P0, feature
**Milestone:** Sprint v3

### Description

Implement the `pasteText()` function that pastes text into the currently focused application by saving the clipboard, writing text, simulating Cmd+V via `@nut-tree/nut-js`, then restoring the previous clipboard content.

### Context

Sprint: v3
Feature: Feature 1 — System-Wide Voice Input
Phase: Phase 3 — Desktop App Core (Step 10)

### Detailed Requirements

**File to create:** `desktop/src/paste.ts`

**Function:** `async function pasteText(text: string): Promise<void>`

**Algorithm:**
1. If text is empty → return (no-op)
2. Save current clipboard: `clipboard.readText()`
3. Write text to clipboard: `clipboard.writeText(text)`
4. Wait 50ms (clipboard settle)
5. Simulate Cmd+V: `keyboard.type(Key.LeftSuper, Key.V)` via `@nut-tree/nut-js`
6. Wait 500ms (paste complete)
7. Restore previous clipboard: `clipboard.writeText(previous)` (in `finally` block)

**Edge cases:**
- Empty text → no-op (skip paste entirely)
- Non-text clipboard content (image, file) → `readText()` returns `''`, restore `''`
- `@nut-tree/nut-js` throws (Accessibility not granted) → error propagates to DesktopEngine; `finally` block still restores clipboard
- Clipboard restore is in `finally` block to ensure it runs even on error

### Testing Requirements

**File:** `desktop/tests/unit/paste.test.ts`

- [ ] Pastes text via clipboard + Cmd+V simulation
- [ ] Restores previous clipboard content after paste
- [ ] Handles empty previous clipboard (restores empty string)
- [ ] Throws error when nut.js keyboard.type fails (Accessibility not granted)
- [ ] Still restores clipboard even when error is thrown
- [ ] Skips paste for empty text (no clipboard operations)

### Acceptance Criteria

- [ ] TDD: tests first
- [ ] All unit tests passing
- [ ] Clipboard always restored (even on error)
- [ ] No-op for empty text

### Dependencies

Depends on: Issue #1 (scaffold)

### References

- Component Design: `sprints/v3/tech-docs/component-design.md` (Component 5: pasteText)
- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 10)

---

## Issue 7: [P0][feature] Implement DesktopEngine recording state machine

**Labels:** P0, feature
**Milestone:** Sprint v3

### Description

Implement the `DesktopEngine` class — the core state machine that orchestrates the recording lifecycle: capture → encode → transcribe → paste. This is the desktop equivalent of `Voice2CodeEngine` from the VS Code extension.

### Context

Sprint: v3
Feature: Feature 1 — System-Wide Voice Input + Feature 8 — Error Handling
Phase: Phase 3 — Desktop App Core (Step 11)

### Detailed Requirements

**File to create:** `desktop/src/desktop-engine.ts`

**Constructor:**
```typescript
constructor(
  configStore: ConfigStore,
  secretStore: SecretStore,
  audioManager: AudioManager,      // shared from @core/audio
  audioEncoder: AudioEncoder,      // shared from @core/audio
  trayManager: TrayManager,
  notify: (title: string, body: string) => void
)
```

**State machine:**
```
idle ──(hotkey)──▶ recording ──(hotkey)──▶ processing ──(done/error)──▶ idle
```

**Methods:**
- `toggleRecording(): Promise<void>` — idle→start, recording→stop, processing→ignore
- `startRecording(): Promise<void>` — set state recording, update tray, start audio capture
- `stopRecording(): Promise<void>` — set state processing, stop capture, encode, transcribe via AdapterFactory, paste result
- `getState(): RecordingState`

**stopRecording flow:**
1. `audioManager.stopCapture()` → PCM Buffer
2. `audioEncoder.encode(pcm, format)` → encoded Buffer
3. `secretStore.getApiKey()` → API key (may be null)
4. `AdapterFactory.createAdapter(url, apiKey)` → STTAdapter
5. `adapter.transcribe(encoded, { model, language })` → TranscriptionResult
6. `pasteText(result.text)`
7. In `finally`: state = idle, tray.setState('idle')

**Error notification mapping:**

| Error Type | Title | Body |
|-----------|-------|------|
| NetworkError (ECONNREFUSED) | Connection Failed | Cannot connect to STT endpoint. Is your service running? |
| NetworkError (ETIMEDOUT) | Connection Timed Out | STT endpoint took too long. Try increasing the timeout. |
| NetworkError (401/403) | Authentication Failed | Check your API key in Settings. |
| STTError (404) | Model Not Found | Check the model name in Settings. |
| STTError (429) | Rate Limited | Too many requests. Wait a moment and try again. |
| AudioError | Recording Failed | {error.message} |
| ConfigurationError | Error | {error.message} |
| Other | Error | An unexpected error occurred. Check console for details. |

### Testing Requirements

**File:** `desktop/tests/unit/desktop-engine.test.ts`

- [ ] State transitions: idle → recording → processing → idle
- [ ] Ignores toggle during processing state
- [ ] Calls `audioManager.startCapture(audioConfig)` on start
- [ ] Calls `audioManager.stopCapture()` on stop
- [ ] Calls `audioEncoder.encode()` with correct format
- [ ] Creates adapter via `AdapterFactory.createAdapter(url, apiKey)`
- [ ] Calls `adapter.transcribe()` with correct model and language
- [ ] Calls `pasteText()` with transcription result
- [ ] Updates tray state at each transition
- [ ] Shows notification on NetworkError (ECONNREFUSED)
- [ ] Shows notification on NetworkError (ETIMEDOUT)
- [ ] Shows notification on NetworkError (401/403)
- [ ] Shows notification on STTError (404)
- [ ] Shows notification on AudioError
- [ ] Restores idle state after any error
- [ ] Passes correct config values from configStore

### Acceptance Criteria

- [ ] TDD: tests first
- [ ] All unit tests passing (80%+ coverage)
- [ ] State always returns to idle after error
- [ ] Uses shared core modules via `@core/*` imports
- [ ] No code duplication with VS Code engine

### Dependencies

Depends on: Issue #2 (ConfigStore), Issue #3 (SecretStore), Issue #4 (TrayManager), Issue #6 (pasteText)

### References

- Data Models: `sprints/v3/tech-docs/data-models.md` (Model 3: RecordingState)
- Component Design: `sprints/v3/tech-docs/component-design.md` (Component 6: DesktopEngine)
- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 11)

---

## Issue 8: [P0][feature] Implement main.ts Electron app entry point

**Labels:** P0, feature
**Milestone:** Sprint v3

### Description

Implement `desktop/src/main.ts` — the Electron app entry point that hides the dock icon, checks Accessibility permissions, wires all components together, and handles the app lifecycle.

### Context

Sprint: v3
Feature: Feature 1 — System-Wide Voice Input
Phase: Phase 3 — Desktop App Core (Step 12)

### Detailed Requirements

**File to create:** `desktop/src/main.ts`

**Startup sequence (`app.on('ready')`):**
1. `app.dock.hide()` — no dock icon (menu bar app only)
2. Check Accessibility: `systemPreferences.isTrustedAccessibilityClient(true)` — if not trusted, show notification prompting user to grant access
3. Create `ConfigStore`
4. Create `SecretStore(configStore.store)`
5. Create `DeviceManager` (from `@core/audio`)
6. Create `AudioManager(deviceManager)` (from `@core/audio`)
7. Create `AudioEncoder` (from `@core/audio`)
8. Create `TrayManager(iconPaths)` with paths to `dist/assets/` icons
9. `trayManager.create()`
10. Create `DesktopEngine(configStore, secretStore, audioManager, audioEncoder, trayManager, showNotification)`
11. Create `HotkeyManager('CommandOrControl+Shift+V')`
12. `hotkeyManager.register(() => engine.toggleRecording())`
13. Wire tray callbacks: onStartRecording, onStopRecording, onOpenSettings, onTestConnection, onQuit
14. Create `SettingsWindow(configStore, secretStore)`

**`app.on('window-all-closed')`:** Don't quit — this is a tray app.

**`app.on('before-quit')`:** `hotkeyManager.unregister()`, `trayManager.destroy()`

**Helper functions:**
- `showNotification(title, body)` — checks `configStore.getUIConfig().showNotifications` before showing
- `testAndNotify()` — uses `testEndpointConnectivity()` from `@core/config/endpoint-validator` with 5s timeout

### Testing Requirements

No unit tests for main.ts (Electron app lifecycle is tested manually). Verify via:

- [ ] `cd desktop && npm run build && npx electron dist/main.js` launches the app
- [ ] Tray icon appears in menu bar
- [ ] No dock icon visible
- [ ] Accessibility permission prompt shown on first launch
- [ ] Cmd+Shift+V shortcut registered
- [ ] App quits cleanly via tray menu → Quit

### Acceptance Criteria

- [ ] App launches as menu bar tray app (no dock icon)
- [ ] All components wired correctly
- [ ] Accessibility check on launch
- [ ] Clean shutdown (unregisters hotkey, destroys tray)

### Dependencies

Depends on: Issue #2, #3, #4, #5, #6, #7 (all components must exist)

### References

- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 12)
- Product Architecture: `product/tech-docs/architecture.md`

---

## Issue 9: [P1][feature] Implement Settings window with IPC bridge

**Labels:** P1, feature
**Milestone:** Sprint v3

### Description

Implement the `SettingsWindow` class (BrowserWindow + IPC handlers) and the `preload.ts` contextBridge script. The settings window provides a native UI for configuring endpoint, API key, and audio settings.

### Context

Sprint: v3
Feature: Feature 6 — Settings UI (Desktop)
Phase: Phase 4 — Settings UI (Steps 13-14)

### Detailed Requirements

**Files to create:**
- `desktop/src/preload.ts` — contextBridge IPC exposure
- `desktop/src/settings-window.ts` — SettingsWindow class

**Preload (contextBridge):**
```typescript
window.settingsAPI = {
  getConfig(),
  saveConfig(config),
  getApiKeyMasked(),
  setApiKey(apiKey),
  deleteApiKey(),
  testConnection(),
}
```

**SettingsWindow class:**
- `constructor(configStore, secretStore)` — registers all IPC handlers
- `show()` — create or focus existing BrowserWindow
- `close()` — close if open
- `isOpen()` — check status

**BrowserWindow options:**
- 520x600, not resizable/minimizable/maximizable
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Preload: `path.join(__dirname, 'preload.js')`
- `show: false` (show after `ready-to-show`)
- Reuse existing window (no duplicates)

**IPC Handlers (6 channels):**

| Channel | Handler |
|---------|---------|
| `settings:get` | `configStore.getAll()` |
| `settings:save` | Validate input → `configStore.save()` → `{ success, error? }` |
| `settings:get-api-key` | `secretStore.getApiKeyMasked()` |
| `settings:set-api-key` | `secretStore.setApiKey(data.apiKey)` → `{ success, error? }` |
| `settings:delete-api-key` | `secretStore.deleteApiKey()` → `{ success: true }` |
| `settings:test-connection` | `testEndpointConnectivity(url, 5000)` → `{ success, latencyMs?, error? }` |

**Validation in `settings:save`:**
- Check config is an object (reject non-objects)
- Delegate to `configStore.save()` which validates each field
- Catch errors → return `{ success: false, error: message }`

**Error messages for test-connection:**
- ECONNREFUSED: "Cannot connect to endpoint. Is your STT service running?"
- ETIMEDOUT: "Connection timed out. Check the endpoint URL."
- 401/403: "Authentication failed. Check your API key."
- 404: "Endpoint not found. Check the URL path."
- DNS failure: "Cannot resolve hostname. Check the endpoint URL."

### Testing Requirements

**File:** `desktop/tests/unit/settings-window.test.ts`

- [ ] Creates BrowserWindow with correct options (contextIsolation, sandbox, etc.)
- [ ] Shows existing window instead of creating duplicate
- [ ] `isOpen()` returns correct state
- [ ] IPC `settings:get` returns config
- [ ] IPC `settings:save` validates and saves
- [ ] IPC `settings:save` rejects invalid config
- [ ] IPC `settings:get-api-key` returns masked key
- [ ] IPC `settings:set-api-key` stores key
- [ ] IPC `settings:delete-api-key` deletes key
- [ ] IPC `settings:test-connection` returns latency on success
- [ ] IPC `settings:test-connection` returns error on failure

### Acceptance Criteria

- [ ] TDD: tests first
- [ ] All unit tests passing
- [ ] Context isolation enforced (no nodeIntegration)
- [ ] Window reused (no duplicates)
- [ ] All 6 IPC channels functional

### Dependencies

Depends on: Issue #2 (ConfigStore), Issue #3 (SecretStore)

### References

- IPC Channels: `sprints/v3/tech-docs/api-endpoints.md` (all 6 channels)
- Component Design: `sprints/v3/tech-docs/component-design.md` (Component 7: SettingsWindow)
- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Steps 13-14)

---

## Issue 10: [P1][feature] Create Settings UI (HTML/CSS/renderer)

**Labels:** P1, feature
**Milestone:** Sprint v3

### Description

Create the settings form UI: HTML markup, CSS styles, and renderer-side TypeScript that communicates with the main process via the `settingsAPI` bridge.

### Context

Sprint: v3
Feature: Feature 6 — Settings UI (Desktop)
Phase: Phase 4 — Settings UI (Steps 15-16)

### Detailed Requirements

**Files to create:**
- `desktop/src/settings/settings.html`
- `desktop/src/settings/settings.css`
- `desktop/src/settings/settings-renderer.ts`

**HTML form sections:**
1. **Endpoint:** URL input, Model input, Language input (max 5 chars), Timeout number input (1000-120000), Test Connection button + result span
2. **API Key:** Password input, status span (shows masked key), Save API Key button, Delete API Key button
3. **Audio:** Format select (MP3/WAV), Sample Rate select (8000/16000/22050/44100)
4. **Save:** Save Settings button + result span

**CSP:** `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none';`

**CSS guidelines:**
- System font: `-apple-system, BlinkMacSystemFont, 'Segoe UI'`
- 520px max width, subtle borders, native-feeling inputs
- Green for success messages, red for errors
- Disabled state styling for buttons during operations

**Renderer logic (`settings-renderer.ts`):**
- On DOMContentLoaded: load config via `settingsAPI.getConfig()`, populate form, load masked API key
- Save Settings: collect form values → `settingsAPI.saveConfig()` → show "Saved" or error
- Save API Key: read password input → `settingsAPI.setApiKey()` → show masked key → clear input
- Delete API Key: `settingsAPI.deleteApiKey()` → update status to "No API key stored"
- Test Connection: `settingsAPI.testConnection()` → show "Connected (142ms)" or error
- Disable buttons during async operations
- Auto-clear status messages after 3 seconds

### Testing Requirements

No unit tests for renderer HTML/CSS (tested manually). Verify via:
- [ ] Settings window displays all form fields
- [ ] Form populates with saved config values on open
- [ ] Save Settings persists values (close and reopen to verify)
- [ ] Test Connection shows latency or error
- [ ] API Key save/delete works
- [ ] Masked API key displays correctly
- [ ] Buttons disabled during operations

### Acceptance Criteria

- [ ] All form fields render correctly
- [ ] CSP meta tag present and correct
- [ ] Form populates from saved config
- [ ] All buttons trigger correct IPC calls
- [ ] Status messages display and auto-clear

### Dependencies

Depends on: Issue #9 (SettingsWindow — IPC handlers must exist)

### References

- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Steps 15-16)
- IPC Channels: `sprints/v3/tech-docs/api-endpoints.md`

---

## Issue 11: [P1][feature] Implement error notifications and macOS permissions

**Labels:** P1, feature
**Milestone:** Sprint v3

### Description

Implement macOS notification system for error feedback, Accessibility permission checking on app launch, and create the `entitlements.plist` for macOS permissions.

### Context

Sprint: v3
Feature: Feature 8 — Error Handling & Notifications
Phase: Phase 5 — Error Handling & Polish (Steps 17-19)

### Detailed Requirements

**Error notifications (in DesktopEngine — already implemented in Issue #7):**
This issue focuses on verifying and testing the error notification flow end-to-end:
- macOS `Notification` API used for all error feedback
- Notifications respect `ui.showNotifications` config setting
- All error types mapped to user-friendly messages (see Issue #7)

**Accessibility permission check (in main.ts):**
```typescript
const trusted = systemPreferences.isTrustedAccessibilityClient(true);
// true param shows macOS system dialog automatically
if (!trusted) {
  new Notification({
    title: 'Accessibility Permission Required',
    body: 'Voice2Code needs Accessibility access to paste text. Please grant it in System Preferences > Privacy & Security > Accessibility.',
  }).show();
}
```

**File to create:** `desktop/entitlements.plist`
```xml
<dict>
  <key>com.apple.security.device.audio-input</key><true/>
  <key>com.apple.security.automation.apple-events</key><true/>
</dict>
```

**Specific error scenarios to verify:**
- ECONNREFUSED → "Cannot connect to STT endpoint. Is your service running?"
- ETIMEDOUT → "STT endpoint took too long. Try increasing the timeout."
- 401/403 → "Check your API key in Settings."
- 404 → "Check the model name in Settings."
- 429 → "Too many requests. Wait a moment and try again."
- Microphone permission denied → macOS handles this
- Accessibility not granted → notification shown on launch

### Testing Requirements

- [ ] Verify Accessibility check runs on app launch
- [ ] Verify notification shown when Accessibility not trusted
- [ ] Verify all error notification messages match spec
- [ ] Verify tray icon always returns to idle after error
- [ ] Verify notifications not shown when `showNotifications` is false

### Acceptance Criteria

- [ ] `entitlements.plist` created
- [ ] Accessibility check on launch with notification
- [ ] All error scenarios produce correct notifications
- [ ] Tray icon never stuck in recording/processing state after error

### Dependencies

Depends on: Issue #7 (DesktopEngine), Issue #8 (main.ts)

### References

- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Steps 17-19)
- Data Models: `sprints/v3/tech-docs/data-models.md` (Model 3: RecordingState transitions)

---

## Issue 12: [P1][integration-test] Integration tests for desktop recording flow

**Labels:** P1, integration-test
**Milestone:** Sprint v3

### Description

Write integration tests that verify the complete recording flow with mocked external dependencies (audio capture, STT API, clipboard). These tests exercise the full component chain: DesktopEngine → AudioManager → AudioEncoder → AdapterFactory → STTAdapter → pasteText.

### Context

Sprint: v3
Feature: All desktop features (end-to-end verification)
Phase: Phase 5 — Error Handling & Polish (Step 20)

### Detailed Requirements

**File to create:** `desktop/tests/integration/recording-flow.test.ts`

**Test scenarios:**

1. **Happy path:** Engine idle → toggle (start recording) → toggle (stop, encode, transcribe, paste) → engine idle
   - Verify: `audioManager.startCapture()` called with correct config
   - Verify: `audioManager.stopCapture()` returns PCM buffer
   - Verify: `audioEncoder.encode()` called with PCM buffer and format
   - Verify: `adapter.transcribe()` called with encoded buffer and options
   - Verify: `pasteText()` called with transcription result text
   - Verify: tray state transitions: idle → recording → processing → idle

2. **Network error during transcription:** Recording succeeds but STT endpoint is unreachable
   - Verify: notification shown with "Connection Failed" message
   - Verify: engine returns to idle state
   - Verify: tray icon returns to idle

3. **Audio error during recording:** Microphone not available
   - Verify: notification shown with "Recording Failed" message
   - Verify: engine returns to idle immediately
   - Verify: tray icon returns to idle

4. **Double toggle during processing:** User presses hotkey while transcription is in progress
   - Verify: second toggle is ignored
   - Verify: state remains "processing"

5. **Config integration:** Engine reads correct endpoint URL, model, language, format from ConfigStore
   - Verify: adapter created with correct URL and API key
   - Verify: transcribe called with correct model and language

### Testing Requirements

- [ ] Happy path: complete recording → transcription → paste flow
- [ ] Network error: transcription fails, notification shown, idle restored
- [ ] Audio error: capture fails, notification shown, idle restored
- [ ] Processing ignore: toggle during processing is no-op
- [ ] Config values correctly passed through entire chain
- [ ] All external dependencies mocked at boundaries (not internal stubs)

### Acceptance Criteria

- [ ] All integration tests passing
- [ ] Tests mock at the correct boundary (external libs, not internal classes)
- [ ] Tests verify the full component chain, not individual units
- [ ] Existing VS Code extension tests still pass

### Dependencies

Depends on: Issue #7 (DesktopEngine), Issue #2 (ConfigStore), Issue #3 (SecretStore), Issue #4 (TrayManager), Issue #6 (pasteText)

### References

- Implementation Plan: `sprints/v3/tech-docs/implementation-plan.md` (Step 20)
- Component Design: `sprints/v3/tech-docs/component-design.md` (dependency graph)
- Sprint Plan: `sprints/v3/sprint-plan.md`
