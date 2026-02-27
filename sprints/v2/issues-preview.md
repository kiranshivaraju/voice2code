# GitHub Issues Preview — Sprint v2

**Generated:** 2026-02-17
**Total Issues:** 9

---

## Issue 1: [P0][feature] Implement real MP3 encoding via lamejs in AudioEncoder

**Labels:** P0, feature
**Milestone:** Sprint v2

### Description

Replace the mock MP3 encoder in `AudioEncoder` with a real implementation using `lamejs` (pure-JS, no ffmpeg dependency). Currently `encodeMP3()` returns a fake header + zero bytes — after this issue it must return valid MP3 data accepted by Whisper STT APIs.

### Context

Sprint: v2
Feature: A — Real Audio Pipeline
Phase: Phase 1 (must be done first — unblocks B, C, E)

### Detailed Requirements

**File:** `src/audio/audio-encoder.ts`

**Component:** `AudioEncoder`

**Method signature:**
```typescript
encodeMP3(pcmBuffer: Buffer, sampleRate: number): Promise<EncodedAudio>
```

**Implementation:**
```typescript
import * as lamejs from 'lamejs';

encodeMP3(pcmBuffer: Buffer, sampleRate: number): Promise<EncodedAudio> {
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);  // mono, 128kbps
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
  const blockSize = 1152;  // must match MP3 frame size
  const mp3Data: Uint8Array[] = [];

  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const encoded = mp3encoder.encodeBuffer(chunk);
    if (encoded.length > 0) mp3Data.push(encoded);
  }

  const flushed = mp3encoder.flush();
  if (flushed.length > 0) mp3Data.push(flushed);

  const totalLength = mp3Data.reduce((sum, d) => sum + d.length, 0);
  const result = Buffer.allocUnsafe(totalLength);
  let offset = 0;
  for (const chunk of mp3Data) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return Promise.resolve({
    data: result,
    format: 'mp3',
    durationMs: Math.round((samples.length / sampleRate) * 1000),
    sampleRate,
  });
}
```

**Return type — `EncodedAudio`:**
```typescript
interface EncodedAudio {
  data: Buffer;       // MP3 bytes
  format: 'mp3';
  durationMs: number; // calculated from sample count / sampleRate
  sampleRate: number;
}
```

**Dependencies to install:**
```bash
npm install lamejs
```

**Design notes:**
- Block size of 1152 samples is required — matches MP3 frame size; other sizes cause encoding artifacts
- Mono only (1 channel) — matches Whisper API requirement
- 128 kbps sufficient for speech; accepted by all providers (Ollama, OpenAI Whisper, vLLM)
- Pure JS — no system binary dependency (ffmpeg not required)
- WAV encoding (`encodeWAV`) is already real — do not modify it

### Implementation Notes

- Mock implementation to replace: look for `encodeMP3` returning fake header bytes
- `lamejs` is MIT licensed
- Test with a real Whisper endpoint early to validate MP3 output quality

### Testing Requirements

**File:** `tests/unit/audio/audio-encoder.test.ts`

Unit Tests Required:
- [ ] `encodeMP3` calls `lamejs.Mp3Encoder` with channels=1, correct sampleRate, bitrate=128
- [ ] Encoded chunks and flush are concatenated into a single Buffer
- [ ] `durationMs` is correctly calculated as `Math.round((samples.length / sampleRate) * 1000)`
- [ ] Output `format` field is `'mp3'`
- [ ] Empty input buffer returns empty MP3 (no crash)
- [ ] WAV encoding (`encodeWAV`) still passes — no regression

**Mocking strategy:** Mock `lamejs` at the module boundary using Jest's `jest.mock('lamejs')`. Do not mock internal class methods.

### Acceptance Criteria

- [ ] Production code contains no mock MP3 bytes
- [ ] `encodeMP3` uses `lamejs.Mp3Encoder` — verified in tests
- [ ] All unit tests written and passing
- [ ] No regression on `encodeWAV` tests
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes (all 307+ tests)
- [ ] JSDoc on `encodeMP3` public method

### Dependencies

None — can be implemented first.

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature A)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`EncodedAudio` interface)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (`AudioEncoder` section)
- Component Design: `sprints/v2/tech-docs/component-design.md` (`AudioEncoder` section)

---

## Issue 2: [P0][feature] Implement real audio device enumeration in DeviceManager

**Labels:** P0, feature
**Milestone:** Sprint v2

### Description

Replace `getMockDevices()` in `DeviceManager` with real platform-specific device enumeration. Currently returns 3 hardcoded fake devices on all platforms. After this issue, users see their actual system microphones in the settings.

### Context

Sprint: v2
Feature: A — Real Audio Pipeline
Phase: Phase 1

### Detailed Requirements

**File:** `src/audio/device-manager.ts`

**Component:** `DeviceManager`

**Methods:**
```typescript
async enumerateDevices(): Promise<AudioDevice[]>
async getDefaultDevice(): Promise<AudioDevice>
async isDeviceAvailable(deviceId: string): Promise<boolean>
```

**Return type — `AudioDevice`:**
```typescript
interface AudioDevice {
  id: string;           // Platform-specific device ID
  name: string;         // Human-readable name (e.g. "MacBook Pro Microphone")
  isDefault: boolean;
  platform: 'darwin' | 'win32' | 'linux';
}
```

**Platform implementations:**

macOS (`darwin`):
```typescript
private async enumerateMacOS(): Promise<AudioDevice[]> {
  // Run: system_profiler SPAudioDataType -json
  // Parse JSON: look for items with coreaudio_input_source field
}
```

Linux:
```typescript
private async enumerateLinux(): Promise<AudioDevice[]> {
  // Run: arecord -l
  // Parse: "card N: Name [Label], device M: DeviceName"
}
```

Windows:
```typescript
private async enumerateWindows(): Promise<AudioDevice[]> {
  // Run: wmic path Win32_SoundDevice get Name,DeviceID /format:csv
  // Parse CSV output
}
```

**Fallback strategy (REQUIRED):**
If the platform command fails (e.g., `arecord` not installed on Linux), catch the error, log a warning, and return:
```typescript
[{ id: 'default', name: 'System Default', isDefault: true, platform }]
```
This prevents the extension from crashing if system tools are missing.

**`isDeviceAvailable(deviceId)`:**
- If `deviceId === 'default'` → return `true` always
- Otherwise: call `enumerateDevices()` and check if the ID is in the list

### Implementation Notes

- Optional: use `node-audiodevices` npm package for cross-platform enumeration if prebuilts are available
- Device list is NOT cached — call fresh on every `enumerateDevices()` (USB mic may be plugged in)
- `getDefaultDevice()` returns the first device with `isDefault: true`, or `entries[0]` if none flagged

### Testing Requirements

**File:** `tests/unit/audio/device-manager.test.ts`

Unit Tests Required:
- [ ] macOS: parses `system_profiler` JSON output correctly (mock exec)
- [ ] Linux: parses `arecord -l` tabular output correctly (mock exec)
- [ ] Windows: parses `wmic` CSV output correctly (mock exec)
- [ ] Any platform: falls back to `[{id:'default'}]` on command failure
- [ ] `isDeviceAvailable` returns `true` for `'default'`
- [ ] `isDeviceAvailable` returns `true` for a known device ID
- [ ] `isDeviceAvailable` returns `false` for an unknown device ID
- [ ] `getDefaultDevice` returns device with `isDefault: true`

**Mocking strategy:** Mock `child_process.exec` (or `execSync`) at the boundary. Provide fixture strings matching real command outputs for each platform.

### Acceptance Criteria

- [ ] `getMockDevices()` removed from production code
- [ ] Real platform commands used on macOS, Linux, Windows
- [ ] Graceful fallback on command failure — extension does not crash
- [ ] All unit tests written and passing
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes
- [ ] JSDoc on all public methods

### Dependencies

None — can be implemented in parallel with Issue 1.

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature A)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`AudioDevice` interface)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (`DeviceManager` section)
- Component Design: `sprints/v2/tech-docs/component-design.md` (`DeviceManager` section)

---

## Issue 3: [P0][feature] Implement real microphone capture in AudioManager via node-record-lpcm16

**Labels:** P0, feature
**Milestone:** Sprint v2

### Description

Replace `createMockRecordingStream()` in `AudioManager` with real microphone capture using `node-record-lpcm16`. After this issue, Voice2Code will actually record from the user's microphone and return raw PCM audio for encoding.

### Context

Sprint: v2
Feature: A — Real Audio Pipeline
Phase: Phase 1

### Detailed Requirements

**File:** `src/audio/audio-manager.ts`

**Component:** `AudioManager`

**Methods:**
```typescript
async startRecording(options: RecordingOptions): Promise<void>
async stopRecording(): Promise<Buffer>
isRecording(): boolean
dispose(): void
```

**Input type — `RecordingOptions`:**
```typescript
interface RecordingOptions {
  deviceId: string;     // "default" or platform device ID
  sampleRate: number;   // 16000 for Whisper
  channels: number;     // Always 1 (mono)
  format: 'mp3' | 'wav';
}
```

**Implementation:**
```typescript
import * as record from 'node-record-lpcm16';

async startRecording(options: RecordingOptions): Promise<void> {
  // 1. Check device availability via DeviceManager.isDeviceAvailable()
  // 2. If unavailable: emit 'deviceFallback' event, proceed with 'default'
  // 3. Start recorder:
  this.recording = record.record({
    sampleRate: options.sampleRate,
    channels: 1,
    device: options.deviceId === 'default' ? null : options.deviceId,
    audioType: 'raw',  // raw PCM — AudioEncoder handles format conversion
  });
  // 4. Accumulate stream data into internal Buffer
  // 5. Listen for stream 'error' → emit on self
  this.active = true;
}

async stopRecording(): Promise<Buffer> {
  this.recording.stop();
  this.active = false;
  return this.accumulatedBuffer;
}

isRecording(): boolean {
  return this.active;
}
```

**Events emitted (EventEmitter):**
| Event | Payload | When |
|---|---|---|
| `deviceFallback` | `{ originalId: string, fallbackName: string }` | Requested device not found, using default |
| `error` | `Error` | Fatal recording error from node-record-lpcm16 |

**Platform requirement:** `node-record-lpcm16` requires `sox` to be installed:
- macOS: `brew install sox`
- Linux: `sudo apt-get install sox`
- Windows: SoX for Windows

Document this requirement — do NOT bundle sox.

**Dependencies to install:**
```bash
npm install node-record-lpcm16
npm install --save-dev @types/node-record-lpcm16
```

### Implementation Notes

- `audioType: 'raw'` returns raw 16-bit PCM — encoder handles MP3/WAV conversion
- On `MicrophonePermissionError` (permission denied by OS), throw a typed error so `Voice2CodeEngine` can show the correct notification
- `dispose()` should call `this.recording?.stop()` and clear the accumulated buffer

### Testing Requirements

**File:** `tests/unit/audio/audio-manager.test.ts`

Unit Tests Required:
- [ ] `startRecording` calls `record.record()` with `sampleRate` from options
- [ ] `startRecording` calls `record.record()` with `channels: 1`
- [ ] `startRecording` calls `record.record()` with `device: null` when deviceId is `'default'`
- [ ] `deviceFallback` event emitted when `DeviceManager.isDeviceAvailable()` returns false
- [ ] `stopRecording` calls `recording.stop()` and returns accumulated buffer
- [ ] `isRecording()` returns `true` during recording, `false` after stop
- [ ] Error event from recorder stream propagates to AudioManager `error` event

**Mocking strategy:** Mock `node-record-lpcm16` at the module boundary using `jest.mock('node-record-lpcm16')`. Return a mock Readable stream. Do NOT use the previous internal mock stream.

### Acceptance Criteria

- [ ] `createMockRecordingStream()` removed from production code
- [ ] Real `node-record-lpcm16` used for audio capture
- [ ] Device fallback works when selected device is unavailable
- [ ] All unit tests written and passing
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes (all 307+ tests, no regressions)
- [ ] sox dependency documented in README
- [ ] JSDoc on all public methods

### Dependencies

- Depends on: Issue 2 (DeviceManager — needed for `isDeviceAvailable()`)

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature A)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`RecordingOptions`, `EncodedAudio`)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (`AudioManager` section)
- Component Design: `sprints/v2/tech-docs/component-design.md` (`AudioManager` section)

---

## Issue 4: [P1][feature] Add language support setting through ConfigurationManager and both STT adapters

**Labels:** P1, feature
**Milestone:** Sprint v2

### Description

Wire the `voice2code.endpoint.language` setting through the entire transcription stack: VS Code settings → ConfigurationManager → TranscriptionOptions → OllamaAdapter request body → OpenAIWhisperAdapter FormData. This allows non-English speakers to dictate in their native language.

### Context

Sprint: v2
Feature: D — Language Support
Phase: Phase 2 (independent — can be built in parallel with Feature F)

### Detailed Requirements

**Files to change:**
1. `package.json` — add configuration property
2. `src/config/configuration-manager.ts` — read and return language
3. `src/adapters/ollama-adapter.ts` — pass language in request body
4. `src/adapters/openai-whisper-adapter.ts` — pass language as FormData field

**Step D1 — `package.json`:**
Add to `contributes.configuration.properties`:
```json
"voice2code.endpoint.language": {
  "type": "string",
  "default": "en",
  "description": "ISO 639-1 language code for transcription (e.g. en, fr, de, ja, zh)"
}
```

**Step D2 — `ConfigurationManager.getEndpointConfig()`:**
`EndpointConfig` interface gets a new field:
```typescript
interface EndpointConfig {
  url: string;
  model: string;
  timeout: number;
  language: string;    // NEW — ISO 639-1 code, default "en"
  apiKey?: string;
}
```
Reading from config:
```typescript
language: config.get<string>('endpoint.language', 'en'),
```

**Step D3 — `OllamaAdapter`:**
Add `language` to JSON body:
```typescript
body: JSON.stringify({ model, audio: base64Audio, language: options.language }),
```
Where `options` is `TranscriptionOptions` (which already has a `language` field per the existing types).

**Step D4 — `OpenAIWhisperAdapter`:**
Append to FormData before the POST:
```typescript
formData.append('language', options.language);  // e.g. "fr"
```
This matches the Whisper API standard field name.

**`TranscriptionOptions` interface** (verify/add `language` field):
```typescript
interface TranscriptionOptions {
  model: string;
  language: string;   // ISO 639-1 — verify this field exists; add if missing
  timeout: number;
}
```

### Implementation Notes

- If `TranscriptionOptions.language` already exists in the codebase, just ensure it is being populated from `EndpointConfig.language` in `Voice2CodeEngine`
- Default `"en"` covers the majority of users and is safe to send to all providers
- ISO 639-1 format: 2-letter codes (`en`, `fr`, `de`, `ja`, `zh`, `es`, `pt`, `ko`, etc.)

### Testing Requirements

Unit Tests Required:
- [ ] `ConfigurationManager.getEndpointConfig()` includes `language` field
- [ ] `ConfigurationManager.getEndpointConfig()` defaults to `"en"` when setting not configured
- [ ] `ConfigurationManager.getEndpointConfig()` returns user-configured language (e.g. `"fr"`)
- [ ] `OllamaAdapter.transcribe()` includes `language` in request JSON body
- [ ] `OpenAIWhisperAdapter.transcribe()` appends `language` to FormData

### Acceptance Criteria

- [ ] `voice2code.endpoint.language` setting visible in VS Code Settings UI
- [ ] Language flows: settings → `EndpointConfig.language` → `TranscriptionOptions.language` → both adapters
- [ ] All unit tests written and passing
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes
- [ ] JSDoc updated where modified

### Dependencies

- Independent of A, B, C, E — can be built in parallel with Issue 5 (Feature F)

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature D)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`EndpointConfig`, `TranscriptionOptions`)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (Feature D section)

---

## Issue 5: [P2][feature] Implement Settings Panel Webview (SettingsPanelProvider)

**Labels:** P2, feature
**Milestone:** Sprint v2

### Description

Create a dedicated VS Code Webview settings panel for Voice2Code. Opens via the `Voice2Code: Open Settings` command (replacing the current raw VS Code settings redirect). Users get a single screen to configure endpoint, audio device, UI preferences, and history — with inline Test Connection.

### Context

Sprint: v2
Feature: F — Settings Panel (Webview)
Phase: Phase 2 (independent — can be built in parallel with Feature D)

### Detailed Requirements

**File to create:** `src/ui/settings-panel.ts`
**File to modify:** `src/extension.ts` (update `openSettings` command handler)

**Component:** `SettingsPanelProvider`

**Constructor:**
```typescript
class SettingsPanelProvider {
  constructor(
    context: vscode.ExtensionContext,
    deviceManager: DeviceManager,
    networkMonitor: NetworkMonitor,
    historyManager: HistoryManager,
  )
}
```

**Key methods:**
```typescript
openOrReveal(): void   // Creates or reveals the panel
dispose(): void
```

**Panel configuration:**
- Title: `"Voice2Code Settings"`
- View type: `"voice2code.settings"`
- Column: `vscode.ViewColumn.One`
- `enableScripts: true` (no other Webview options)

**Panel sections (HTML):**
1. **Endpoint** — URL input, model input, language select, timeout number input, "Test Connection" button
2. **Audio** — device select (populated from `availableDevices`), sampleRate input, format radio (mp3/wav)
3. **UI** — showStatusBar checkbox, previewEnabled checkbox, audioFeedback checkbox
4. **History** — enabled checkbox, maxItems input, "Clear History" button (shows current entry count)

**Message protocol (`postMessage`):**

Extension → Webview:
```typescript
type ExtensionToWebviewMessage =
  | { type: 'init'; settings: SettingsSnapshot }
  | { type: 'connectionResult'; success: boolean; latencyMs?: number; error?: string }
  | { type: 'settingUpdated'; key: string; value: unknown };
```

Webview → Extension:
```typescript
type WebviewToExtensionMessage =
  | { type: 'updateSetting'; key: string; value: unknown }
  | { type: 'testConnection' }
  | { type: 'clearHistory' }
  | { type: 'openKeyboardShortcuts' };
```

**`SettingsSnapshot` shape:**
```typescript
interface SettingsSnapshot {
  endpoint: { url, model, timeout, language };
  audio: { deviceId, sampleRate, format, availableDevices: AudioDevice[] };
  ui: { showStatusBar, previewEnabled, audioFeedback };
  history: { enabled, maxItems, entryCount };
}
```

**Content Security Policy (REQUIRED):**
Every panel open generates a fresh nonce via `crypto.randomUUID()`.
CSP header in HTML:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'nonce-{nonce}'; style-src 'nonce-{nonce}'">
```
All `<script>` and `<style>` tags must carry `nonce="{nonce}"`.
No inline event handlers (no `onclick=`). All event listeners added via `addEventListener` in script.

**`openSettings` command update (`extension.ts`):**
```typescript
// Before:
vscode.commands.executeCommand('workbench.action.openSettings', 'voice2code');
// After:
settingsPanelProvider.openOrReveal();
```

**Live settings update (no Save button):**
On `updateSetting` message from Webview:
```typescript
await vscode.workspace.getConfiguration('voice2code').update(key, value, true);
```

### Testing Requirements

**File:** `tests/unit/ui/settings-panel.test.ts`

Unit Tests Required:
- [ ] `openOrReveal()` calls `createWebviewPanel` on first call
- [ ] `openOrReveal()` calls `panel.reveal()` on subsequent calls (no duplicate panels)
- [ ] `buildSnapshot()` returns all config values from `ConfigurationManager`
- [ ] `handleWebviewMessage` routes `updateSetting` → `config.update(key, value, true)`
- [ ] `handleWebviewMessage` routes `testConnection` → `networkMonitor.isEndpointReachable()`
- [ ] `handleWebviewMessage` routes `clearHistory` → `historyManager.clear()`
- [ ] `handleWebviewMessage` routes `openKeyboardShortcuts` → correct VS Code command
- [ ] Generated HTML contains `nonce` attribute on `<script>` tags
- [ ] Generated HTML does NOT contain `onclick=` or other inline event handlers

**Mocking:** Mock `vscode.window.createWebviewPanel`. Mock `DeviceManager`, `NetworkMonitor`, `HistoryManager`.

### Acceptance Criteria

- [ ] `SettingsPanelProvider` implemented in `src/ui/settings-panel.ts`
- [ ] `openSettings` command opens Webview panel (not raw settings)
- [ ] All four sections render correctly
- [ ] Settings update live (no Save button)
- [ ] Test Connection shows inline result
- [ ] CSP enforced — no inline scripts
- [ ] All unit tests written and passing
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes
- [ ] ARIA labels on all interactive elements
- [ ] JSDoc on public methods

### Dependencies

- Depends on: Issue 3 (AudioManager — DeviceManager instance needed for `availableDevices`)
- Depends on: Issue 6 (NetworkMonitor) and Issue 8 (HistoryManager) — shared instances

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature F)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`SettingsSnapshot`, `SettingsPanelMessage`)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (`SettingsPanelProvider` section)
- Component Design: `sprints/v2/tech-docs/component-design.md` (`SettingsPanelProvider` section)

---

## Issue 6: [P1][feature] Implement NetworkMonitor for endpoint health detection before recording

**Labels:** P1, feature
**Milestone:** Sprint v2

### Description

Create `NetworkMonitor` — a new class that checks if the STT endpoint is reachable before each recording attempt. Gives users an immediate, actionable error instead of a 30-second timeout when Ollama isn't running. This is critical for the AI terminal dictation workflow: users need to know immediately if their setup is broken.

### Context

Sprint: v2
Feature: C — Offline Mode & Endpoint Health Detection
Phase: Phase 3 (after Feature A)

### Detailed Requirements

**File to create:** `src/network/network-monitor.ts`

**Component:** `NetworkMonitor`

**Methods:**
```typescript
async isEndpointReachable(url: string, timeoutMs?: number): Promise<EndpointHealth>
async checkAndNotify(url: string): Promise<boolean>
```

**Return type — `EndpointHealth`:**
```typescript
interface EndpointHealth {
  reachable: boolean;
  url: string;
  latencyMs: number | null;   // null if unreachable
  checkedAt: Date;
  isLocalhost: boolean;       // true for localhost / 127.0.0.1
}
```

**`isEndpointReachable` implementation:**
```typescript
async isEndpointReachable(url: string, timeoutMs = 3000): Promise<EndpointHealth> {
  const start = Date.now();
  const isLocal = isLocalhost(url);  // check hostname
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return { reachable: true, url, latencyMs: Date.now() - start, checkedAt: new Date(), isLocalhost: isLocal };
  } catch {
    return { reachable: false, url, latencyMs: null, checkedAt: new Date(), isLocalhost: isLocal };
  }
}
```

**`checkAndNotify` — notification messages:**
- If localhost and unreachable:
  `"Cannot reach STT endpoint. Is Ollama running? Start with: ollama serve"`
  + action button: `"Test Connection"`
- If remote URL and unreachable:
  `"Cannot reach STT endpoint at {host}. Check network connection."`
  + action button: `"Test Connection"`
- Returns `true` if reachable (no notification), `false` if unreachable (notification shown)

**No caching:** Every call performs a fresh network check. Stale "healthy" state must not mask a newly-downed Ollama instance.

**`Voice2CodeEngine` integration (`src/core/engine.ts`):**
```typescript
async startRecording(): Promise<void> {
  const reachable = await this.networkMonitor.checkAndNotify(endpointUrl);
  if (!reachable) {
    this.statusBar.setWarning();
    return;
  }
  // ... existing recording logic
}
```

**`StatusBarController` — new warning state (`src/ui/status-bar-controller.ts`):**
```typescript
setWarning(): void
// Icon: $(warning)  Color: warning (yellow/orange)  Text: "Voice2Code"
// Resets to idle on next successful recording start
```

### Testing Requirements

**File:** `tests/unit/network/network-monitor.test.ts`

Unit Tests Required:
- [ ] Reachable endpoint → `EndpointHealth.reachable = true`, `latencyMs` is a number
- [ ] Unreachable endpoint (connection refused) → `EndpointHealth.reachable = false`, `latencyMs = null`
- [ ] Timeout exceeded → `EndpointHealth.reachable = false`, `latencyMs = null`
- [ ] `isLocalhost = true` for `http://localhost:*` URLs
- [ ] `isLocalhost = true` for `http://127.0.0.1:*` URLs
- [ ] `isLocalhost = false` for remote URLs
- [ ] `checkAndNotify` shows Ollama message for localhost when unreachable
- [ ] `checkAndNotify` shows generic remote message for non-localhost when unreachable
- [ ] `checkAndNotify` returns `true` and shows no notification when reachable
- [ ] `checkAndNotify` returns `false` when unreachable

**Mocking:** Mock `fetch` at the module boundary. Mock `vscode.window.showErrorMessage`.

### Acceptance Criteria

- [ ] `src/network/network-monitor.ts` created
- [ ] `NetworkMonitor` injected into `Voice2CodeEngine` constructor
- [ ] `checkAndNotify()` called at top of `startRecording()` — before audio capture
- [ ] `StatusBarController.setWarning()` implemented and called on failure
- [ ] 3-second timeout enforced via `AbortController`
- [ ] All unit tests written and passing
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes
- [ ] JSDoc on public methods

### Dependencies

- Depends on: Issues 1–3 (Feature A must be complete — real recording pipeline)

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature C)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`EndpointHealth`)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (`NetworkMonitor` section)
- Component Design: `sprints/v2/tech-docs/component-design.md` (`NetworkMonitor` section)

---

## Issue 7: [P1][feature] Implement transcription preview InputBox in EditorService

**Labels:** P1, feature
**Milestone:** Sprint v2

### Description

Add `showPreviewAndInsert()` to `EditorService`. After transcription completes, open a VS Code InputBox pre-filled with the transcribed text so the user can review and edit before it's inserted into the AI terminal input. This prevents badly-transcribed prompts from being sent to Claude Code or Cursor.

### Context

Sprint: v2
Feature: B — Transcription Preview & Confirmation
Phase: Phase 3 (after Feature A)

### Detailed Requirements

**File:** `src/core/editor-service.ts`

**New method:**
```typescript
async showPreviewAndInsert(originalText: string): Promise<PreviewResult>
```

**Return type — `PreviewResult`:**
```typescript
interface PreviewResult {
  confirmed: boolean;   // true = Enter pressed; false = Escape pressed
  text: string | null;  // Final (possibly edited) text; null if cancelled
}
```

**Implementation:**
```typescript
async showPreviewAndInsert(originalText: string): Promise<PreviewResult> {
  const previewEnabled = this.config.get<boolean>('ui.previewEnabled', true);
  if (!previewEnabled) {
    await this.insertText(originalText);
    return { confirmed: true, text: originalText };
  }

  const result = await vscode.window.showInputBox({
    title: 'Voice2Code — Review transcription before inserting',
    value: originalText,
    placeHolder: 'Edit transcription or press Enter to confirm',
  });

  if (result === undefined) {
    // User pressed Escape
    vscode.window.showInformationMessage('Transcription cancelled — nothing inserted.');
    return { confirmed: false, text: null };
  }

  await this.insertText(result);  // Existing method — unchanged
  return { confirmed: true, text: result };
}
```

**`Voice2CodeEngine` integration (`src/core/engine.ts`):**
Replace:
```typescript
await this.editorService.insertText(transcribedText);
```
With:
```typescript
const preview = await this.editorService.showPreviewAndInsert(transcribedText);
// Only add to history if confirmed
if (preview.confirmed) {
  await this.historyManager.add({ text: preview.text!, ... });
}
```

**InputBox UX requirements:**
- Title: `"Voice2Code — Review transcription before inserting"` (exact)
- Pre-filled value: the raw transcription text
- Placeholder: `"Edit transcription or press Enter to confirm"` (exact)
- Cancel message: `"Transcription cancelled — nothing inserted."` (exact)
- When `previewEnabled = false`: skip InputBox entirely, insert directly

### Testing Requirements

**File:** `tests/unit/core/editor-service.test.ts`

Unit Tests Required:
- [ ] `showInputBox` called with correct `title`, `value`, `placeHolder`
- [ ] User confirms without editing → original text inserted via `insertText`
- [ ] User edits text then confirms → edited text inserted
- [ ] User presses Escape (`result === undefined`) → info notification shown, nothing inserted
- [ ] `previewEnabled = false` → `showInputBox` NOT called, `insertText` called directly
- [ ] Returns `{ confirmed: true, text }` on confirmation
- [ ] Returns `{ confirmed: false, text: null }` on cancellation

**Mocking:** Mock `vscode.window.showInputBox`. Mock `vscode.window.showInformationMessage`.

### Acceptance Criteria

- [ ] `showPreviewAndInsert()` implemented in `EditorService`
- [ ] `Voice2CodeEngine` calls `showPreviewAndInsert` instead of `insertText`
- [ ] Preview respects `voice2code.ui.previewEnabled` setting
- [ ] Escape cancels cleanly — no text inserted, info message shown
- [ ] All unit tests written and passing
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes
- [ ] JSDoc on `showPreviewAndInsert`

### Dependencies

- Depends on: Issues 1–3 (Feature A — real transcription flowing through the pipeline)

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature B)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`PreviewResult`)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (`EditorService` section)
- Component Design: `sprints/v2/tech-docs/component-design.md` (state machine diagram)

---

## Issue 8: [P1][feature] Implement HistoryManager for session transcription history

**Labels:** P1, feature
**Milestone:** Sprint v2

### Description

Create `HistoryManager` — stores the last N transcriptions in VS Code `globalState` so users can re-insert previous prompts into the AI terminal without re-dictating. Especially useful for repetitive prompts like "run the tests" or "fix the lint errors".

### Context

Sprint: v2
Feature: E — Session History
Phase: Phase 3 (after Feature A)

### Detailed Requirements

**File to create:** `src/core/history-manager.ts`

**Component:** `HistoryManager`

**Constructor:**
```typescript
constructor(context: vscode.ExtensionContext, config: ConfigurationManager)
```

**Methods:**
```typescript
async add(entry: Omit<HistoryEntry, 'id'>): Promise<void>
getAll(): HistoryEntry[]
async clear(): Promise<void>
async showHistory(): Promise<void>
```

**Data types:**
```typescript
interface HistoryEntry {
  id: string;         // crypto.randomUUID()
  text: string;       // Full transcription text
  timestamp: number;  // Date.now()
  language: string;   // ISO 639-1 code
  durationMs: number; // Recording duration
}

interface HistoryStore {
  version: number;          // Schema version (start at 1)
  entries: HistoryEntry[];  // Most-recent-first; capped at maxItems
}
```

**Storage:** `context.globalState.update('voice2code.history', store)`
- Uses `globalState` (not `workspaceState`) — history belongs to the user, not the workspace
- Lazy-load on first `add()` or `getAll()` call

**`add()` logic:**
1. If `voice2code.history.enabled = false` → no-op
2. Load existing store from `globalState`
3. Generate `id: crypto.randomUUID()`
4. Prepend new entry to front of `entries`
5. Trim `entries` to `maxItems` (FIFO — remove from end)
6. Save updated store to `globalState`

**`showHistory()` — QuickPick:**
- Placeholder: `"Select a transcription to re-insert"`
- Item format:
  - `label`: `"[HH:MM] First 60 chars of text..."` (truncate with `...` if longer)
  - `description`: `"{language} · {durationMs/1000}s"` (e.g. `"en · 4.2s"`)
- Selecting an item calls `editorService.showPreviewAndInsert(entry.text)` (respects `previewEnabled`)

**`Voice2CodeEngine` integration (`src/core/engine.ts`):**
After successful `showPreviewAndInsert` (confirmed = true):
```typescript
if (this.config.history.enabled) {
  await this.historyManager.add({
    text: preview.text!,
    timestamp: Date.now(),
    language: endpointConfig.language,
    durationMs: recordingDurationMs,
  });
}
```

**`extension.ts` — new commands:**
```typescript
// voice2code.showHistory
context.subscriptions.push(
  vscode.commands.registerCommand('voice2code.showHistory', () => historyManager.showHistory())
);

// voice2code.clearHistory
context.subscriptions.push(
  vscode.commands.registerCommand('voice2code.clearHistory', async () => {
    const choice = await vscode.window.showWarningMessage(
      'Clear all transcription history?', 'Clear', 'Cancel'
    );
    if (choice === 'Clear') await historyManager.clear();
  })
);
```

**`package.json` — commands already registered** — verify `voice2code.showHistory` and `voice2code.clearHistory` exist; add if missing.

### Testing Requirements

**File:** `tests/unit/core/history-manager.test.ts`

Unit Tests Required:
- [ ] `add()` prepends new entry to front of entries array
- [ ] `add()` generates a UUID for `id`
- [ ] `add()` trims to `maxItems` when over limit (removes from end)
- [ ] `add()` is a no-op when `voice2code.history.enabled = false`
- [ ] `add()` persists to `globalState`
- [ ] `getAll()` returns entries most-recent-first
- [ ] `clear()` empties the store in `globalState`
- [ ] `showHistory()` opens `vscode.window.showQuickPick` with formatted labels
- [ ] `showHistory()` calls `editorService.showPreviewAndInsert(entry.text)` on selection
- [ ] `showHistory()` shows QuickPick placeholder `"Select a transcription to re-insert"`

**Mocking:** Mock `vscode.ExtensionContext.globalState` (provide `get`/`update` stubs). Mock `vscode.window.showQuickPick`.

### Acceptance Criteria

- [ ] `src/core/history-manager.ts` created
- [ ] `HistoryManager` injected into `Voice2CodeEngine`
- [ ] `add()` called after confirmed insertion (not on cancel)
- [ ] `voice2code.showHistory` and `voice2code.clearHistory` commands registered
- [ ] History opt-in by default (`voice2code.history.enabled = false`)
- [ ] History persists across VS Code restart (globalState)
- [ ] All unit tests written and passing
- [ ] `npm run compile` succeeds
- [ ] `npm test` passes
- [ ] JSDoc on all public methods

### Dependencies

- Depends on: Issues 1–3 (Feature A — real transcription to store)
- Depends on: Issue 7 (Feature B — `showPreviewAndInsert` for re-insertion)

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature E)
- Data Models: `sprints/v2/tech-docs/data-models.md` (`HistoryEntry`, `HistoryStore`, `QuickPickHistoryItem`)
- API Endpoints: `sprints/v2/tech-docs/api-endpoints.md` (`HistoryManager` section)
- Component Design: `sprints/v2/tech-docs/component-design.md` (`HistoryManager` section)

---

## Issue 9: [P0][unit-test] Verify full audio pipeline integration — compile and test after Feature A

**Labels:** P0, unit-test
**Milestone:** Sprint v2

### Description

Integration smoke test step: after completing Issues 1–3 (AudioEncoder, DeviceManager, AudioManager), run the full build and test suite to confirm no regressions and the real audio pipeline compiles cleanly.

### Context

Sprint: v2
Feature: A — Real Audio Pipeline (integration verification)
Phase: Phase 1 (Step A4)

### Detailed Requirements

This is a verification/gating issue. No new production code. Tasks:

1. Run `npm install lamejs node-record-lpcm16` — verify packages installed
2. Run `npm run compile` — verify zero TypeScript errors
3. Run `npm test` — verify all 307+ tests pass, no regressions
4. Manually test with a real microphone (if available): speak → observe audio captured → (with mocked STT) no crashes
5. Verify MP3 output is valid (run through a media player or upload to Whisper API endpoint)

**Specific regressions to check:**
- WAV encoding still works (AudioEncoder.encodeWAV unchanged)
- All existing unit tests in `tests/unit/audio/` still pass
- E2E tests (`tests/e2e/`) not broken

### Testing Requirements

- [ ] `npm run compile` exits with code 0
- [ ] `npm test` exits with code 0
- [ ] Test count ≥ 307 (no tests deleted)
- [ ] Coverage remains ≥ 80%
- [ ] No TypeScript errors

### Acceptance Criteria

- [ ] All build and test commands pass
- [ ] Manual microphone test completed (or documented as skipped with reason)
- [ ] Any regressions from Issues 1–3 discovered and fixed before closing this issue

### Dependencies

- Depends on: Issues 1, 2, 3 (all Feature A implementation issues)

### References

- Sprint Plan: `sprints/v2/sprint-plan.md` (Feature A, Step A4)
- Implementation Plan: `sprints/v2/tech-docs/implementation-plan.md` (Step A4)
