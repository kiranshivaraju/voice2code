# Sprint v2 — Data Models

> Voice2Code v0.2.0 · Sprint v2 · Technical Documentation

All data models used by the six Sprint v2 features. Follows TypeScript interface conventions already established in `src/types/`.

---

## Feature A — Real Audio Pipeline

### `AudioDevice`

```typescript
interface AudioDevice {
  id: string;           // Platform-specific device ID (e.g. "BuiltInMicrophoneDevice" on macOS)
  name: string;         // Human-readable name (e.g. "MacBook Pro Microphone")
  isDefault: boolean;   // True if this is the system default input device
  platform: 'darwin' | 'win32' | 'linux';
}
```

**Source:** `src/audio/device-manager.ts`
**Used by:** `DeviceManager.enumerateDevices()`, Settings Panel (Feature F)

---

### `RecordingOptions`

```typescript
interface RecordingOptions {
  deviceId: string;     // Device ID from AudioDevice.id, or "default"
  sampleRate: number;   // Hz — 16000 for Whisper (optimal), 44100 for WAV
  channels: number;     // Always 1 (mono) for STT
  format: 'mp3' | 'wav';
}
```

**Source:** `src/audio/audio-manager.ts`
**Used by:** `AudioManager.startRecording(options)`

---

### `EncodedAudio`

```typescript
interface EncodedAudio {
  data: Buffer;         // Encoded audio bytes (MP3 or WAV)
  format: 'mp3' | 'wav';
  durationMs: number;   // Actual recorded duration
  sampleRate: number;
}
```

**Source:** `src/audio/audio-encoder.ts`
**Used by:** `TranscriptionService.transcribe(audio)`

---

## Feature B — Transcription Preview

### `PreviewResult`

```typescript
interface PreviewResult {
  confirmed: boolean;   // true = user pressed Enter; false = user pressed Escape
  text: string | null;  // Final text (possibly edited); null if cancelled
}
```

**Source:** `src/core/editor-service.ts`
**Used by:** `EditorService.showPreviewAndInsert(originalText)`

---

## Feature C — Offline Mode Detection

### `EndpointHealth`

```typescript
interface EndpointHealth {
  reachable: boolean;
  url: string;
  latencyMs: number | null;   // null if unreachable
  checkedAt: Date;
  isLocalhost: boolean;       // Drives different error message wording
}
```

**Source:** `src/network/network-monitor.ts`
**Used by:** `NetworkMonitor.checkEndpoint()`, `Voice2CodeEngine.startRecording()`

---

## Feature D — Language Support

### `EndpointConfig` (extended)

```typescript
interface EndpointConfig {
  url: string;
  model: string;
  timeout: number;
  language: string;    // NEW — ISO 639-1 code (e.g. "en", "fr", "de", "ja", "zh")
  apiKey?: string;     // From SecretStorage
}
```

**Source:** `src/config/configuration-manager.ts`
**Change:** Adds `language` field to existing `EndpointConfig`

---

### `TranscriptionOptions` (extended)

```typescript
interface TranscriptionOptions {
  model: string;
  language: string;    // NEW — passed through from EndpointConfig
  timeout: number;
}
```

**Source:** `src/types/index.ts` (or wherever currently defined)
**Change:** `language` field already exists per sprint plan — verify it's passed through

---

## Feature E — Session History

### `HistoryEntry`

```typescript
interface HistoryEntry {
  id: string;           // UUID v4 — unique identifier for deduplication
  text: string;         // Full transcription text
  timestamp: number;    // Unix epoch ms (Date.now())
  language: string;     // ISO 639-1 code used during transcription
  durationMs: number;   // Recording duration in milliseconds
}
```

**Source:** `src/core/history-manager.ts`
**Persisted in:** `context.globalState` under key `voice2code.history`

---

### `HistoryStore`

```typescript
interface HistoryStore {
  version: number;          // Schema version for future migrations (start at 1)
  entries: HistoryEntry[];  // Most-recent-first; capped at maxItems
}
```

**Source:** `src/core/history-manager.ts`
**Storage key:** `voice2code.history`
**Notes:** The entire object is JSON-serialised into `globalState`. On load, entries beyond `maxItems` are trimmed.

---

### `QuickPickHistoryItem` (VS Code UI)

```typescript
interface QuickPickHistoryItem extends vscode.QuickPickItem {
  label: string;        // "[HH:MM] First 60 chars of text..."
  description: string;  // Language + duration (e.g. "en · 4.2s")
  entry: HistoryEntry;  // Back-reference for insertion
}
```

**Source:** `src/core/history-manager.ts`
**Used by:** `Voice2Code: Show History` command

---

## Feature F — Settings Panel (Webview)

### `SettingsPanelMessage`

Messages exchanged between the VS Code extension host and the Webview via `postMessage`.

```typescript
// Extension → Webview
type ExtensionToWebviewMessage =
  | { type: 'init'; settings: SettingsSnapshot }
  | { type: 'connectionResult'; success: boolean; latencyMs?: number; error?: string }
  | { type: 'settingUpdated'; key: string; value: unknown };

// Webview → Extension
type WebviewToExtensionMessage =
  | { type: 'updateSetting'; key: string; value: unknown }
  | { type: 'testConnection' }
  | { type: 'clearHistory' }
  | { type: 'openKeyboardShortcuts' };
```

**Source:** `src/ui/settings-panel.ts`

---

### `SettingsSnapshot`

```typescript
interface SettingsSnapshot {
  endpoint: {
    url: string;
    model: string;
    timeout: number;
    language: string;
  };
  audio: {
    deviceId: string;
    sampleRate: number;
    format: 'mp3' | 'wav';
    availableDevices: AudioDevice[];
  };
  ui: {
    showStatusBar: boolean;
    previewEnabled: boolean;
    audioFeedback: boolean;
  };
  history: {
    enabled: boolean;
    maxItems: number;
    entryCount: number;  // Current number of stored entries (for "Clear History" label)
  };
}
```

**Source:** `src/ui/settings-panel.ts`
**Used by:** `SettingsPanelProvider.getInitMessage()` → sent to Webview on panel open

---

## `globalState` Key Map

| Key | Type | Feature | Description |
|---|---|---|---|
| `voice2code.history` | `HistoryStore` (JSON) | E | Persisted transcription history |

---

## VS Code Configuration Keys

| Key | Type | Default | Feature |
|---|---|---|---|
| `voice2code.endpoint.url` | `string` | `http://localhost:11434/api/transcribe` | Existing |
| `voice2code.endpoint.model` | `string` | `whisper-large-v3` | Existing |
| `voice2code.endpoint.timeout` | `number` | `30000` | Existing |
| `voice2code.endpoint.language` | `string` | `"en"` | D (new) |
| `voice2code.audio.deviceId` | `string` | `"default"` | Existing |
| `voice2code.audio.sampleRate` | `number` | `16000` | Existing |
| `voice2code.audio.format` | `"mp3"\|"wav"` | `"mp3"` | Existing |
| `voice2code.ui.showStatusBar` | `boolean` | `true` | Existing |
| `voice2code.ui.previewEnabled` | `boolean` | `true` | Existing |
| `voice2code.ui.audioFeedback` | `boolean` | `true` | Existing |
| `voice2code.history.enabled` | `boolean` | `false` | Existing |
| `voice2code.history.maxItems` | `number` | `50` | Existing |
