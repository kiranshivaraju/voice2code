# Data Models

## Overview

Sprint v3 builds an Electron desktop app. There are **no database tables** — all data is stored locally via `electron-store` (JSON file) and Electron `safeStorage` (macOS Keychain). This document defines the configuration schemas, storage formats, and state models used by the desktop app.

---

## Model 1: DesktopConfig (electron-store)

### Purpose
Persists all user-configurable settings for the desktop app. Stored as a JSON file in the Electron app's user data directory (`~/Library/Application Support/voice2code-desktop/config.json`).

### Storage Mechanism
`electron-store` — a simple key-value JSON persistence library for Electron apps.

### Schema

```typescript
interface DesktopConfig {
  endpoint: EndpointConfig;
  audio: AudioConfig;
  ui: UIConfig;
}
```

### Fields

| Field Path | Type | Default | Constraints | Description |
|------------|------|---------|-------------|-------------|
| `endpoint.url` | `string` | `'http://localhost:8000/v1/audio/transcriptions'` | Must be valid HTTP/HTTPS URL | STT API endpoint URL |
| `endpoint.model` | `string` | `'whisper-large-v3'` | Alphanumeric + `._-/`, max 100 chars | STT model identifier |
| `endpoint.timeout` | `number` | `30000` | Min 1000, max 120000 (ms) | Request timeout in milliseconds |
| `endpoint.language` | `string` | `'en'` | ISO 639-1 code, 2-5 chars | Transcription language |
| `audio.sampleRate` | `number` | `16000` | One of: 8000, 16000, 22050, 44100 | Audio sample rate in Hz |
| `audio.format` | `string` | `'mp3'` | One of: `'mp3'`, `'wav'` | Audio encoding format |
| `ui.showNotifications` | `boolean` | `true` | — | Show macOS notifications |

### Validations

**endpoint.url:**
- Must not be empty
- Must parse as valid URL via `new URL(url)`
- Protocol must be `http:` or `https:`
- If protocol is `http:` and host is NOT localhost/127.0.0.1/::1, store a warning (insecure remote endpoint)
- Use shared `validateEndpointUrl()` from `src/config/endpoint-validator.ts`

**endpoint.model:**
- Must not be empty
- Must match regex: `/^[a-zA-Z0-9._\-\/]+$/` (alphanumeric, dots, underscores, hyphens, forward slashes)
- Max length: 100 characters
- No path traversal (`..` sequences rejected)
- Use shared `validateModelName()` from `src/config/endpoint-validator.ts`

**endpoint.timeout:**
- Must be a positive integer
- Minimum: 1000 (1 second)
- Maximum: 120000 (2 minutes)
- If value is outside range, clamp to nearest boundary

**endpoint.language:**
- Must be a string of 2-5 characters
- Must match regex: `/^[a-z]{2}(-[A-Z]{2})?$/` (e.g., `en`, `fr`, `zh-CN`)
- If empty, default to `'en'`

**audio.sampleRate:**
- Must be one of: `8000`, `16000`, `22050`, `44100`
- If invalid, default to `16000`

**audio.format:**
- Must be one of: `'mp3'`, `'wav'`
- If invalid, default to `'mp3'`

### electron-store Schema Definition

```typescript
const CONFIG_SCHEMA = {
  endpoint: {
    type: 'object' as const,
    properties: {
      url: { type: 'string' as const, default: 'http://localhost:8000/v1/audio/transcriptions' },
      model: { type: 'string' as const, default: 'whisper-large-v3' },
      timeout: { type: 'number' as const, default: 30000, minimum: 1000, maximum: 120000 },
      language: { type: 'string' as const, default: 'en' },
    },
    default: {},
  },
  audio: {
    type: 'object' as const,
    properties: {
      sampleRate: { type: 'number' as const, default: 16000, enum: [8000, 16000, 22050, 44100] },
      format: { type: 'string' as const, default: 'mp3', enum: ['mp3', 'wav'] },
    },
    default: {},
  },
  ui: {
    type: 'object' as const,
    properties: {
      showNotifications: { type: 'boolean' as const, default: true },
    },
    default: {},
  },
};
```

### Mapping to Shared Types

The `ConfigStore` must expose methods that return the shared types from `src/types/index.ts`:

```typescript
// ConfigStore.getEndpointConfig() returns:
interface EndpointConfiguration {
  url: string;
  model: string;
  timeout: number;
  language: string;
  customHeaders?: Record<string, string>;
}

// ConfigStore.getAudioConfig() returns:
interface AudioConfiguration {
  deviceId: string;       // Always 'default' for desktop v1
  sampleRate: number;
  format: 'mp3' | 'wav';
}
```

Note: `AudioConfiguration.deviceId` is always `'default'` in Sprint v3 (no device selection UI). `EndpointConfiguration.customHeaders` is always `undefined` in Sprint v3.

---

## Model 2: Encrypted API Key (safeStorage)

### Purpose
Stores the user's STT provider API key encrypted via macOS Keychain. The encrypted blob is stored in electron-store as a base64 string; the actual encryption/decryption is handled by Electron's `safeStorage` API.

### Storage Mechanism
- **Encryption:** `safeStorage.encryptString(apiKey)` → `Buffer`
- **Storage:** Buffer converted to base64 string, stored in electron-store under key `_encryptedApiKey`
- **Decryption:** Read base64 from store → `Buffer.from(base64, 'base64')` → `safeStorage.decryptString(buffer)` → plain text API key

### Fields

| Field | Type | Location | Description |
|-------|------|----------|-------------|
| `_encryptedApiKey` | `string` (base64) | electron-store JSON | Encrypted API key blob as base64 |

### Validations

**API Key (before encryption):**
- Must be a non-empty string
- Must be trimmed of whitespace
- No maximum length constraint (provider-dependent)
- Never logged, never displayed in full (mask all but last 4 characters in UI)

### Business Rules

- If `safeStorage.isEncryptionAvailable()` returns `false`, throw `ConfigurationError` with message: "Secure storage is not available. Cannot store API key."
- When setting a new API key, overwrite any existing encrypted key
- When deleting, remove the `_encryptedApiKey` key from electron-store
- If `_encryptedApiKey` exists but decryption fails (corrupt data), delete the key and return `null`
- API key is optional — vLLM endpoints may not require one

### Masking for UI Display

```typescript
function maskApiKey(key: string): string {
  if (key.length <= 4) {
    return '****';
  }
  return '*'.repeat(key.length - 4) + key.slice(-4);
}
// "sk-abc123xyz" → "*******3xyz"
```

---

## Model 3: RecordingState (In-Memory)

### Purpose
Tracks the current state of the recording lifecycle in the `DesktopEngine`. This is entirely in-memory — never persisted.

### State Machine

```
     ┌──────────────────────────────────────┐
     │                                      │
     ▼                                      │
  ┌──────┐  hotkey press   ┌───────────┐    │
  │ idle │ ──────────────▶ │ recording │    │
  └──────┘                 └─────┬─────┘    │
     ▲                          │           │
     │                    hotkey press      │
     │                          │           │
     │                          ▼           │
     │                   ┌────────────┐     │
     │                   │ processing │     │
     │                   └─────┬──────┘     │
     │                         │            │
     │           success/error │            │
     └─────────────────────────┘            │
                                            │
     error during recording ────────────────┘
```

### States

| State | Tray Icon | Description |
|-------|-----------|-------------|
| `idle` | Default mic icon (Template image) | Not recording, waiting for hotkey |
| `recording` | Red dot icon | Actively capturing audio from microphone |
| `processing` | Yellow/orange icon | Audio captured, encoding + sending to STT endpoint |

### Transitions

| From | Event | To | Side Effects |
|------|-------|----|-------------|
| `idle` | Hotkey press | `recording` | Start audio capture, update tray icon |
| `recording` | Hotkey press | `processing` | Stop capture, encode, send to STT, update tray icon |
| `processing` | Transcription success | `idle` | Paste text, update tray icon, show notification (optional) |
| `processing` | Transcription error | `idle` | Show error notification, update tray icon |
| `recording` | Audio error | `idle` | Show error notification, update tray icon |

### In-Memory Properties

```typescript
interface EngineState {
  state: RecordingState;          // 'idle' | 'recording' | 'processing'
  recordingStartTime: number | null;  // Date.now() when recording started
}
```

---

## Model 4: IPC Message Types (Main ↔ Renderer)

### Purpose
Defines the message types passed between the Electron main process and the settings renderer process via `contextBridge` / `ipcRenderer` / `ipcMain`.

### IPC Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `settings:get` | Renderer → Main | None | `DesktopConfig` | Get current config |
| `settings:save` | Renderer → Main | `Partial<DesktopConfig>` | `{ success: boolean; error?: string }` | Save config changes |
| `settings:get-api-key` | Renderer → Main | None | `string \| null` | Get masked API key (last 4 chars) |
| `settings:set-api-key` | Renderer → Main | `{ apiKey: string }` | `{ success: boolean; error?: string }` | Encrypt and store API key |
| `settings:delete-api-key` | Renderer → Main | None | `{ success: boolean }` | Delete stored API key |
| `settings:test-connection` | Renderer → Main | None | `{ success: boolean; error?: string; latencyMs?: number }` | Test STT endpoint connectivity |

### Preload API (contextBridge)

```typescript
interface SettingsAPI {
  getConfig(): Promise<DesktopConfig>;
  saveConfig(config: Partial<DesktopConfig>): Promise<{ success: boolean; error?: string }>;
  getApiKeyMasked(): Promise<string | null>;
  setApiKey(apiKey: string): Promise<{ success: boolean; error?: string }>;
  deleteApiKey(): Promise<{ success: boolean }>;
  testConnection(): Promise<{ success: boolean; error?: string; latencyMs?: number }>;
}

// Exposed as window.settingsAPI in renderer
```

### Validation Rules for IPC

- **settings:save** — Validate all fields server-side (main process) before saving. Never trust renderer input.
- **settings:set-api-key** — Trim whitespace, reject empty strings.
- **settings:test-connection** — Use current saved config (not unsaved form values). If user changed URL but hasn't saved, they must save first.

---

## Model 5: Tray Context Menu Structure

### Purpose
Defines the context menu items shown when the user clicks the tray icon.

### Menu Items

| Label | Type | Enabled When | Action |
|-------|------|-------------|--------|
| `Start Recording` | Normal | state === `'idle'` | Call `engine.startRecording()` |
| `Stop Recording` | Normal | state === `'recording'` | Call `engine.stopRecording()` |
| — | Separator | Always | — |
| `Settings...` | Normal | Always | Open settings window |
| `Test Connection` | Normal | state !== `'processing'` | Run `testEndpointConnectivity()`, show notification |
| — | Separator | Always | — |
| `Quit Voice2Code` | Normal | Always | Quit app (`app.quit()`) |

### Dynamic Behavior

- When state changes, rebuild the context menu to enable/disable Start/Stop items
- Menu item `Start Recording` and `Stop Recording` are mutually exclusive (only one visible at a time based on state)

---

**Document Version:** 1.0
**Sprint:** v3
**Last Updated:** February 20, 2026
