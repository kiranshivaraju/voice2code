# API Endpoints — IPC Channels — Sprint v4

## Overview

Sprint v4 adds 4 new IPC channels to the existing 6 from Sprint v3. The desktop app has no REST API — all communication is client-side via Electron's IPC system between renderer and main process.

**Existing channels (Sprint v3):** `settings:get`, `settings:save`, `settings:get-api-key`, `settings:set-api-key`, `settings:delete-api-key`, `settings:test-connection`

**New channels (Sprint v4):** `settings:get-devices`, `history:get`, `history:clear`, `history:copy`

All IPC channels follow the same security pattern:
- `contextIsolation: true` — renderer cannot access Node.js
- `sandbox: true` — renderer is sandboxed
- `nodeIntegration: false` — no `require()` in renderer
- Main process validates ALL input from renderer

---

## Channel 1: `settings:get-devices`

### Route
`ipcMain.handle('settings:get-devices')`

### Description
Returns list of available audio input devices from the system.

### Direction
Renderer → Main → Renderer

### Request Payload
None

### Success Response

```typescript
AudioDevice[] // from @core/types
```

```json
[
  {
    "id": "macbook-pro-microphone",
    "name": "MacBook Pro Microphone",
    "isDefault": true
  },
  {
    "id": "usb-audio-device",
    "name": "USB Audio Device",
    "isDefault": false
  }
]
```

### Error Response

```typescript
// Never throws — returns fallback device on error
[
  {
    "id": "default",
    "name": "System Default",
    "isDefault": true
  }
]
```

### Implementation Notes

1. Call `deviceManager.getDevices()` from shared core
2. Catch any `AudioError` and return fallback `[{ id: "default", name: "System Default", isDefault: true }]`
3. This is a read-only operation — no state mutation
4. Response may take 1-2 seconds (shell command execution)

### Preload API

```typescript
settingsAPI.getDevices(): Promise<AudioDevice[]>
```

### Handler Implementation

```typescript
ipcMain.handle('settings:get-devices', async () => {
  try {
    return await deviceManager.getDevices();
  } catch {
    return [{ id: 'default', name: 'System Default', isDefault: true }];
  }
});
```

### Test Cases

- Returns array of devices from DeviceManager
- Returns fallback device when DeviceManager throws
- Each device has `id`, `name`, `isDefault` fields

---

## Channel 2: `history:get`

### Route
`ipcMain.handle('history:get')`

### Description
Returns all transcription history entries, sorted by timestamp descending (most recent first).

### Direction
Renderer → Main → Renderer

### Request Payload
None

### Success Response

```typescript
TranscriptionHistoryEntry[]
```

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "text": "git commit -m fix authentication bug",
    "timestamp": 1709000000000,
    "language": "en"
  },
  {
    "id": "f0e9d8c7-b6a5-4321-fedc-ba0987654321",
    "text": "hello world",
    "timestamp": 1708999000000,
    "language": "en"
  }
]
```

### Empty Response

```json
[]
```

### Implementation Notes

1. Call `historyStore.getAll()` — returns entries sorted by timestamp descending
2. Never throws — returns empty array if store is empty or corrupt
3. Maximum 50 entries returned

### Preload API

```typescript
historyAPI.getHistory(): Promise<TranscriptionHistoryEntry[]>
```

### Handler Implementation

```typescript
ipcMain.handle('history:get', () => {
  return historyStore.getAll();
});
```

### Test Cases

- Returns all entries sorted by most recent first
- Returns empty array when no history
- Returns max 50 entries

---

## Channel 3: `history:clear`

### Route
`ipcMain.handle('history:clear')`

### Description
Deletes all transcription history entries.

### Direction
Renderer → Main → Renderer

### Request Payload
None

### Success Response

```json
{ "success": true }
```

### Implementation Notes

1. Call `historyStore.clear()` — removes all entries
2. Always succeeds (idempotent — clearing empty store is a no-op)

### Preload API

```typescript
historyAPI.clearHistory(): Promise<{ success: boolean }>
```

### Handler Implementation

```typescript
ipcMain.handle('history:clear', () => {
  historyStore.clear();
  return { success: true };
});
```

### Test Cases

- Clears all entries from store
- Returns `{ success: true }`
- Succeeds when store is already empty

---

## Channel 4: `history:copy`

### Route
`ipcMain.handle('history:copy')`

### Description
Copies the text of a specific history entry to the system clipboard.

### Direction
Renderer → Main → Renderer

### Request Payload

```typescript
{ id: string }
```

```json
{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

### Input Validation

**`id`:**
- Required, non-empty string
- Must match an existing entry ID
- If not found, return error

### Success Response

```json
{ "success": true }
```

### Error Response

```json
{ "success": false, "error": "Entry not found" }
```

### Implementation Notes

1. Validate `id` is a non-empty string
2. Call `historyStore.getById(id)` to find the entry
3. If not found, return `{ success: false, error: "Entry not found" }`
4. Call `clipboard.writeText(entry.text)` to copy to clipboard
5. Return `{ success: true }`

### Preload API

```typescript
historyAPI.copyEntry(id: string): Promise<{ success: boolean; error?: string }>
```

### Handler Implementation

```typescript
ipcMain.handle('history:copy', (_event, { id }: { id: string }) => {
  if (!id || typeof id !== 'string') {
    return { success: false, error: 'Invalid entry ID' };
  }
  const entry = historyStore.getById(id);
  if (!entry) {
    return { success: false, error: 'Entry not found' };
  }
  clipboard.writeText(entry.text);
  return { success: true };
});
```

### Test Cases

- Copies entry text to clipboard when found
- Returns error when entry ID doesn't exist
- Returns error when ID is empty/null
- Clipboard contains the correct text after copy

---

## Updated Preload Script

### New Exposed APIs

The preload script needs to expose two API objects:

```typescript
// Existing
contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('settings:get'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('settings:save', config),
  getApiKeyMasked: () => ipcRenderer.invoke('settings:get-api-key'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('settings:set-api-key', { apiKey }),
  deleteApiKey: () => ipcRenderer.invoke('settings:delete-api-key'),
  testConnection: () => ipcRenderer.invoke('settings:test-connection'),
  getDevices: () => ipcRenderer.invoke('settings:get-devices'),  // NEW
});

// NEW — History API (exposed on history window)
contextBridge.exposeInMainWorld('historyAPI', {
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  copyEntry: (id: string) => ipcRenderer.invoke('history:copy', { id }),
});
```

### Window Type Declarations

```typescript
// Settings window
declare global {
  interface Window {
    settingsAPI: {
      getConfig(): Promise<DesktopConfig>;
      saveConfig(config: unknown): Promise<{ success: boolean; error?: string }>;
      getApiKeyMasked(): Promise<string | null>;
      setApiKey(apiKey: string): Promise<{ success: boolean; error?: string }>;
      deleteApiKey(): Promise<{ success: boolean }>;
      testConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }>;
      getDevices(): Promise<AudioDevice[]>;  // NEW
    };
  }
}

// History window
declare global {
  interface Window {
    historyAPI: {
      getHistory(): Promise<TranscriptionHistoryEntry[]>;
      clearHistory(): Promise<{ success: boolean }>;
      copyEntry(id: string): Promise<{ success: boolean; error?: string }>;
    };
  }
}
```

### Preload Architecture Decision

Since Settings and History are separate BrowserWindows, we have two options:

**Option A (Recommended): Single preload script exposing both APIs**
- Both `settingsAPI` and `historyAPI` are always exposed
- Simpler configuration — one preload file
- Unused API in each window is harmless

**Option B: Separate preload scripts per window**
- More isolation but more files to maintain
- Not worth the complexity for this project

Use **Option A** — single `preload.ts` exposing all APIs.

---

## IPC Security Requirements

All channels must follow these rules:

1. **Input validation in main process**: Never trust renderer input — validate types and values
2. **No shell injection**: Device IDs and history IDs are used as lookup keys, never interpolated into commands
3. **Clipboard access**: Only via Electron's `clipboard` API (already sandboxed)
4. **Rate limiting**: Not needed for local IPC (no network exposure)
