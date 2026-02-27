# Sprint v2 — API Contracts & Internal Interfaces

> Voice2Code v0.2.0 · Sprint v2 · Technical Documentation

Internal TypeScript interfaces (public method signatures) for all new and modified classes. No external HTTP API is added in Sprint v2 — these are the contracts between extension components.

---

## Feature A — Real Audio Pipeline

### `DeviceManager` (modified)

**File:** `src/audio/device-manager.ts`

```typescript
class DeviceManager {
  /**
   * Returns all available audio input devices for the current platform.
   * macOS: parses `system_profiler SPAudioDataType` or `node-audiodevices`
   * Linux:  parses `arecord -l` output or `node-audiodevices`
   * Windows: parses `wmic path Win32_SoundDevice` or `node-audiodevices`
   * @throws DeviceEnumerationError if platform command fails
   */
  async enumerateDevices(): Promise<AudioDevice[]>;

  /**
   * Returns the default input device for the current platform.
   * Falls back to the first available device if no default is found.
   */
  async getDefaultDevice(): Promise<AudioDevice>;

  /**
   * Validates that a device ID is still present on the system.
   * Used by AudioManager before starting a recording session.
   */
  async isDeviceAvailable(deviceId: string): Promise<boolean>;
}
```

---

### `AudioManager` (modified)

**File:** `src/audio/audio-manager.ts`

```typescript
class AudioManager {
  /**
   * Begins capturing audio from the specified device using node-record-lpcm16.
   * If deviceId is "default" or not available, falls back to system default
   * and emits a 'deviceFallback' event with the fallback device name.
   * @emits 'deviceFallback' { originalId: string, fallbackName: string }
   * @throws MicrophonePermissionError on permission denied
   * @throws DeviceNotFoundError if device unavailable and no fallback exists
   */
  async startRecording(options: RecordingOptions): Promise<void>;

  /**
   * Stops the current recording and returns the captured audio buffer.
   * Resolves immediately — does not wait for encoding.
   */
  async stopRecording(): Promise<Buffer>;

  /**
   * True if a recording session is currently active.
   */
  isRecording(): boolean;

  /**
   * Releases the node-record-lpcm16 process and all stream resources.
   */
  dispose(): void;
}
```

**Events emitted on `AudioManager` (EventEmitter):**
| Event | Payload | Description |
|---|---|---|
| `deviceFallback` | `{ originalId, fallbackName }` | Device not found, fell back to default |
| `error` | `Error` | Fatal recording error |

---

### `AudioEncoder` (modified — MP3 only)

**File:** `src/audio/audio-encoder.ts`

```typescript
class AudioEncoder {
  /**
   * Encodes a PCM audio buffer to MP3 using lamejs.
   * Input: raw 16-bit PCM, mono, sampleRate Hz
   * Output: MP3 bytes conforming to Whisper API acceptance criteria
   * @param pcmBuffer Raw PCM data from AudioManager
   * @param sampleRate Hz (must match recording options)
   */
  encodeMP3(pcmBuffer: Buffer, sampleRate: number): Promise<EncodedAudio>;

  /**
   * Encodes a PCM buffer to WAV format. Already implemented in v0.1.0.
   * Unchanged — included for completeness.
   */
  encodeWAV(pcmBuffer: Buffer, sampleRate: number): EncodedAudio;
}
```

---

## Feature B — Transcription Preview

### `EditorService` (modified)

**File:** `src/core/editor-service.ts`

```typescript
class EditorService {
  /**
   * Inserts text at the current cursor position in the active editor.
   * Existing method — unchanged.
   */
  async insertText(text: string): Promise<void>;

  /**
   * NEW: Opens a VS Code InputBox pre-filled with the transcribed text.
   * If voice2code.ui.previewEnabled is false, skips the box and calls insertText directly.
   *
   * InputBox configuration:
   *   title:       "Voice2Code — Review transcription before inserting"
   *   value:       originalText (pre-filled)
   *   placeHolder: "Edit transcription or press Enter to confirm"
   *
   * @returns PreviewResult — confirmed=false if user pressed Escape
   */
  async showPreviewAndInsert(originalText: string): Promise<PreviewResult>;
}
```

---

## Feature C — Offline Mode Detection

### `NetworkMonitor` (new)

**File:** `src/network/network-monitor.ts`

```typescript
class NetworkMonitor {
  /**
   * Performs a lightweight reachability check on the STT endpoint.
   * Strategy: HTTP HEAD request with 3-second timeout.
   * Does NOT cache results — always performs a fresh check.
   *
   * @param url Full endpoint URL (e.g. "http://localhost:11434/api/transcribe")
   * @param timeoutMs Maximum wait time; defaults to 3000
   */
  async isEndpointReachable(url: string, timeoutMs?: number): Promise<EndpointHealth>;

  /**
   * Convenience method that checks reachability and shows the appropriate
   * VS Code error notification if unreachable.
   *
   * Notification messages:
   *   localhost: "Cannot reach STT endpoint. Is Ollama running? Start with: ollama serve"
   *              + action button: "Test Connection"
   *   remote:    "Cannot reach STT endpoint at {host}. Check network connection."
   *              + action button: "Test Connection"
   *
   * @returns true if reachable (caller may proceed), false if not (notification shown)
   */
  async checkAndNotify(url: string): Promise<boolean>;
}
```

---

### `Voice2CodeEngine` (modified — Feature C integration)

**File:** `src/core/engine.ts`

```typescript
// Existing method — new pre-check added at the top
async startRecording(): Promise<void> {
  // NEW: network check before doing anything
  const reachable = await this.networkMonitor.checkAndNotify(endpointUrl);
  if (!reachable) return;

  // ... existing recording logic
}
```

---

### `StatusBarController` (modified — Feature C warning state)

**File:** `src/ui/status-bar-controller.ts`

```typescript
class StatusBarController {
  setIdle(): void;
  setRecording(): void;
  setProcessing(): void;

  /**
   * NEW: Shows a warning state when the last endpoint check failed.
   * Icon: $(warning)  Text: "Voice2Code"  Color: warning (yellow/orange)
   * Resets to idle on next successful recording.
   */
  setWarning(): void;
}
```

---

## Feature D — Language Support

### `ConfigurationManager` (modified)

**File:** `src/config/configuration-manager.ts`

```typescript
class ConfigurationManager {
  /**
   * Returns endpoint configuration including the new language field.
   * Reads voice2code.endpoint.language from VS Code settings.
   * Defaults to "en" if not set.
   */
  getEndpointConfig(): EndpointConfig;  // EndpointConfig now includes language: string
}
```

---

### `OllamaAdapter` (modified)

**File:** `src/adapters/ollama-adapter.ts`

```typescript
// Request body shape sent to Ollama /api/generate
interface OllamaRequestBody {
  model: string;
  audio: string;     // base64-encoded audio
  language: string;  // NEW — ISO 639-1, passed from TranscriptionOptions
}
```

---

### `OpenAIWhisperAdapter` (modified)

**File:** `src/adapters/openai-whisper-adapter.ts`

```typescript
// FormData fields sent to /v1/audio/transcriptions
// NEW field: language (appended to FormData)
formData.append('language', options.language);  // e.g. "fr"
```

---

## Feature E — Session History

### `HistoryManager` (new)

**File:** `src/core/history-manager.ts`

```typescript
class HistoryManager {
  constructor(context: vscode.ExtensionContext);

  /**
   * Adds a transcription to the history store.
   * Prepends to the front (most-recent-first).
   * Trims oldest entries when count exceeds maxItems.
   * No-op if voice2code.history.enabled is false.
   */
  async add(entry: Omit<HistoryEntry, 'id'>): Promise<void>;

  /**
   * Returns all history entries, most-recent-first.
   */
  getAll(): HistoryEntry[];

  /**
   * Clears all history from globalState.
   */
  async clear(): Promise<void>;

  /**
   * Opens vscode.window.showQuickPick() with history entries.
   * Item label format: "[HH:MM] First 60 chars of text..."
   * Item description format: "{language} · {durationMs/1000}s"
   * Selecting an item calls EditorService.showPreviewAndInsert(entry.text)
   * (respects voice2code.ui.previewEnabled)
   */
  async showHistory(): Promise<void>;
}
```

---

### `Voice2CodeEngine` (modified — Feature E integration)

**File:** `src/core/engine.ts`

```typescript
// After successful transcription and insertion:
if (this.config.history.enabled) {
  await this.historyManager.add({
    text: transcribedText,
    timestamp: Date.now(),
    language: endpointConfig.language,
    durationMs: recordingDurationMs,
  });
}
```

---

## Feature F — Settings Panel

### `SettingsPanelProvider` (new)

**File:** `src/ui/settings-panel.ts`

```typescript
class SettingsPanelProvider {
  constructor(
    context: vscode.ExtensionContext,
    deviceManager: DeviceManager,
    networkMonitor: NetworkMonitor,
    historyManager: HistoryManager,
  );

  /**
   * Creates or reveals the Settings Webview panel.
   * Panel title: "Voice2Code Settings"
   * View type:   "voice2code.settings"
   * Column:      vscode.ViewColumn.One
   */
  openOrReveal(): void;

  /**
   * Builds the SettingsSnapshot from current VS Code configuration + live data.
   * Called on panel open and whenever a setting is updated.
   */
  private async buildSnapshot(): Promise<SettingsSnapshot>;

  /**
   * Handles messages from the Webview (WebviewToExtensionMessage).
   * Routes to updateSetting, testConnection, clearHistory, openKeyboardShortcuts.
   */
  private handleWebviewMessage(message: WebviewToExtensionMessage): void;

  /**
   * Generates the Webview HTML with:
   * - Content Security Policy: script-src 'nonce-{nonce}'; style-src 'nonce-{nonce}'
   * - No inline event handlers — all via addEventListener in JS
   * - ARIA labels on all interactive elements
   */
  private getWebviewContent(webview: vscode.Webview, nonce: string): string;

  dispose(): void;
}
```

---

## Extension Command Registration (`extension.ts`)

New commands registered in Sprint v2:

| Command ID | Handler | Feature |
|---|---|---|
| `voice2code.showHistory` | `historyManager.showHistory()` | E |
| `voice2code.clearHistory` | confirm → `historyManager.clear()` | E |
| `voice2code.openSettings` | `settingsPanelProvider.openOrReveal()` | F (replaces raw settings) |

The `openSettings` command already exists — its handler is updated to open the Webview panel instead of `vscode.commands.executeCommand('workbench.action.openSettings', 'voice2code')`.
