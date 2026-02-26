# API Endpoints — IPC Channels

## Overview

The Voice2Code desktop app has **no REST API endpoints**. It is a client-side Electron app. Instead, communication between the main process and the settings renderer window uses Electron IPC (Inter-Process Communication).

This document defines all IPC channels, their contracts, and behavior — the equivalent of API endpoints for the desktop app.

Base: Electron `ipcMain.handle()` / `ipcRenderer.invoke()`

---

## Channel 1: `settings:get`

### Direction
Renderer → Main

### Description
Retrieves the current configuration from `ConfigStore`.

### Request Payload
None

### Success Response
```typescript
{
  endpoint: {
    url: "http://localhost:8000/v1/audio/transcriptions",
    model: "whisper-large-v3",
    timeout: 30000,
    language: "en"
  },
  audio: {
    sampleRate: 16000,
    format: "mp3"
  },
  ui: {
    showNotifications: true
  }
}
```

### Error Response
This channel should never fail. If `electron-store` is corrupted, return defaults.

### Implementation Notes
1. Call `configStore.getAll()` or read individual sections
2. Always return complete config object (fill missing values with defaults)
3. Do NOT include the encrypted API key in this response

### Test Cases
- Returns default config on fresh install
- Returns saved config after `settings:save`
- Returns defaults for any missing/corrupted fields

---

## Channel 2: `settings:save`

### Direction
Renderer → Main

### Description
Saves configuration changes to `ConfigStore`. Accepts partial config — only provided fields are updated.

### Request Payload
```typescript
// Partial — only changed fields
{
  endpoint?: {
    url?: string;
    model?: string;
    timeout?: number;
    language?: string;
  };
  audio?: {
    sampleRate?: number;
    format?: string;
  };
  ui?: {
    showNotifications?: boolean;
  };
}
```

### Success Response
```typescript
{ success: true }
```

### Error Response
```typescript
{
  success: false,
  error: "Invalid endpoint URL: must be http or https"
}
```

### Validation (Main Process Side)

**endpoint.url** (if provided):
1. Must not be empty string
2. Must parse as valid URL via `new URL(url)`
3. Protocol must be `http:` or `https:`
4. If validation fails, return `{ success: false, error: "Invalid endpoint URL: {specific reason}" }`

**endpoint.model** (if provided):
1. Must not be empty string
2. Must match `/^[a-zA-Z0-9._\-\/]+$/`
3. Max 100 characters
4. Must not contain `..` (path traversal)
5. If validation fails, return `{ success: false, error: "Invalid model name: {specific reason}" }`

**endpoint.timeout** (if provided):
1. Must be a number
2. Must be >= 1000 and <= 120000
3. If out of range, clamp to nearest boundary (don't reject)

**endpoint.language** (if provided):
1. Must be a string, 2-5 characters
2. Must match `/^[a-z]{2}(-[A-Z]{2})?$/`
3. If invalid, default to `'en'`

**audio.sampleRate** (if provided):
1. Must be one of: 8000, 16000, 22050, 44100
2. If invalid, default to 16000

**audio.format** (if provided):
1. Must be one of: `'mp3'`, `'wav'`
2. If invalid, default to `'mp3'`

### Implementation Notes
1. Validate ALL fields in main process (never trust renderer)
2. Merge partial config with existing config using deep merge
3. Write to electron-store
4. If the engine is running, it should pick up config changes on next recording cycle (not mid-recording)

### Test Cases
- Save valid partial config (only endpoint.url changed)
- Save full config
- Reject invalid URL (not http/https)
- Reject invalid model name (contains `..`)
- Clamp timeout to valid range
- Default invalid audio format to 'mp3'

---

## Channel 3: `settings:get-api-key`

### Direction
Renderer → Main

### Description
Returns the masked API key for display in the settings UI. Returns `null` if no API key is stored.

### Request Payload
None

### Success Response
```typescript
// API key exists
"*******3xyz"

// No API key stored
null
```

### Error Response
This channel should never fail. If decryption fails, delete the corrupt key and return `null`.

### Implementation Notes
1. Call `secretStore.getApiKey()`
2. If key exists, mask it: `'*'.repeat(key.length - 4) + key.slice(-4)`
3. If key is 4 chars or fewer, return `'****'`
4. If decryption throws, call `secretStore.deleteApiKey()` and return `null`

### Test Cases
- Returns masked key when API key exists
- Returns null when no API key stored
- Returns null and deletes corrupt key on decryption failure

---

## Channel 4: `settings:set-api-key`

### Direction
Renderer → Main

### Description
Encrypts and stores the API key using `safeStorage`.

### Request Payload
```typescript
{ apiKey: "sk-abc123xyz..." }
```

### Success Response
```typescript
{ success: true }
```

### Error Response
```typescript
{
  success: false,
  error: "Secure storage is not available. Cannot store API key."
}
```

### Validation

**apiKey:**
1. Must be a string
2. Trim whitespace
3. After trimming, must not be empty
4. If empty, return `{ success: false, error: "API key cannot be empty" }`

### Implementation Notes
1. Trim the API key
2. Check `safeStorage.isEncryptionAvailable()`
3. If not available, return error
4. Call `safeStorage.encryptString(apiKey)` → Buffer
5. Convert Buffer to base64: `buffer.toString('base64')`
6. Store base64 string in electron-store under `_encryptedApiKey`
7. Return success

### Security
- NEVER log the API key value
- NEVER include the plain API key in error messages
- The encrypted blob is stored in the electron-store JSON file, but it can only be decrypted by the same user account on the same machine (macOS Keychain)

### Test Cases
- Successfully stores API key
- Rejects empty string
- Rejects whitespace-only string
- Returns error when safeStorage unavailable
- Overwrites existing key with new one

---

## Channel 5: `settings:delete-api-key`

### Direction
Renderer → Main

### Description
Deletes the stored API key.

### Request Payload
None

### Success Response
```typescript
{ success: true }
```

### Error Response
This channel should never fail. If no key exists, still return success.

### Implementation Notes
1. Delete `_encryptedApiKey` from electron-store
2. Return `{ success: true }` regardless of whether a key existed

### Test Cases
- Deletes existing API key
- Returns success even when no key exists

---

## Channel 6: `settings:test-connection`

### Direction
Renderer → Main

### Description
Tests connectivity to the configured STT endpoint. Uses the **currently saved** config (not unsaved form values).

### Request Payload
None

### Success Response
```typescript
{
  success: true,
  latencyMs: 142
}
```

### Error Response
```typescript
{
  success: false,
  error: "Cannot connect to endpoint. Is your STT service running?"
}
```

### Implementation Notes
1. Read current endpoint URL from `configStore`
2. Read API key from `secretStore` (may be null)
3. Use shared `testEndpointConnectivity()` from `src/config/endpoint-validator.ts`
4. Measure latency: `Date.now()` before and after the request
5. Timeout: 5000ms for connectivity test (shorter than transcription timeout)

### Error Messages by Cause

| Cause | Error Message |
|-------|--------------|
| ECONNREFUSED | `"Cannot connect to endpoint. Is your STT service running?"` |
| ETIMEDOUT | `"Connection timed out. Check the endpoint URL."` |
| 401/403 | `"Authentication failed. Check your API key."` |
| 404 | `"Endpoint not found. Check the URL path."` |
| DNS failure | `"Cannot resolve hostname. Check the endpoint URL."` |
| Other | `"Connection test failed: {error.message}"` |

### Test Cases
- Successful connection returns latency
- ECONNREFUSED returns appropriate error
- Timeout returns appropriate error
- Auth failure returns appropriate error

---

## IPC Security Requirements

### Context Isolation
- Settings window MUST use `contextIsolation: true`
- Settings window MUST use `nodeIntegration: false`
- All IPC exposed via `contextBridge.exposeInMainWorld()`

### Input Validation
- ALL validation happens in the main process
- Renderer is treated as untrusted
- Validate types, ranges, and formats for every field

### Channel Registration Pattern

```typescript
// Main process (settings-window.ts or main.ts)
ipcMain.handle('settings:get', async () => {
  return configStore.getAll();
});

ipcMain.handle('settings:save', async (_event, config: unknown) => {
  // Validate config shape and values here
  // ...
  return { success: true };
});
```

```typescript
// Preload (preload.ts)
contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('settings:get'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('settings:save', config),
  getApiKeyMasked: () => ipcRenderer.invoke('settings:get-api-key'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('settings:set-api-key', { apiKey }),
  deleteApiKey: () => ipcRenderer.invoke('settings:delete-api-key'),
  testConnection: () => ipcRenderer.invoke('settings:test-connection'),
});
```

```typescript
// Renderer (settings-renderer.ts)
declare global {
  interface Window {
    settingsAPI: SettingsAPI;
  }
}

// Usage:
const config = await window.settingsAPI.getConfig();
```

---

**Document Version:** 1.0
**Sprint:** v3
**Last Updated:** February 20, 2026
