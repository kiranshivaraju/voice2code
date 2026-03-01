# Sprint v2 — Implementation Plan

> Voice2Code v0.2.0 · Sprint v2 · Technical Documentation

Step-by-step implementation guide for each feature, in recommended build order. Each step specifies the exact files to change, what to do, and what tests to write.

---

## Prerequisites

```bash
# Install new dependencies before starting Feature A
npm install lamejs node-record-lpcm16
npm install --save-dev @types/node-record-lpcm16

# Optional — cross-platform device enumeration
npm install node-audiodevices
```

---

## Phase 1 — Feature A: Real Audio Pipeline (P0, Days 1–5)

**Must be done first.** Every other feature depends on real audio flowing through the pipeline.

### Step A1 — `AudioEncoder` MP3 (lamejs)

**File:** `src/audio/audio-encoder.ts`

Replace the MP3 mock with a real `lamejs` implementation:

```typescript
import * as lamejs from 'lamejs';

encodeMP3(pcmBuffer: Buffer, sampleRate: number): Promise<EncodedAudio> {
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);  // mono, kbps=128
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
  const blockSize = 1152;
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

**Tests:** `tests/unit/audio/audio-encoder.test.ts`
- Mock `lamejs` at the module boundary
- Test: `encodeMP3` calls `Mp3Encoder` with correct sampleRate and channels
- Test: buffers are concatenated and flushed correctly
- Test: `durationMs` is calculated from sample count / sampleRate
- Test: WAV encoding still passes (no regression)

---

### Step A2 — `DeviceManager` (real enumeration)

**File:** `src/audio/device-manager.ts`

Replace `getMockDevices()` with real platform commands:

```typescript
async enumerateDevices(): Promise<AudioDevice[]> {
  switch (os.platform()) {
    case 'darwin': return this.enumerateMacOS();
    case 'win32':  return this.enumerateWindows();
    default:       return this.enumerateLinux();
  }
}

private async enumerateMacOS(): Promise<AudioDevice[]> {
  // system_profiler SPAudioDataType -json
  // Parse JSON output for devices with "_items" and "coreaudio_input_source"
}

private async enumerateLinux(): Promise<AudioDevice[]> {
  // arecord -l | parse "card N: Name [Label], device M: Name"
}

private async enumerateWindows(): Promise<AudioDevice[]> {
  // wmic path Win32_SoundDevice get Name,DeviceID /format:csv
}
```

Fallback strategy: if platform command throws (e.g., `arecord` not installed), catch the error and return `[{ id: 'default', name: 'System Default', isDefault: true, platform }]` — emit a log warning.

**Tests:** `tests/unit/audio/device-manager.test.ts`
- Mock `child_process.exec` / `execSync` at the boundary
- Test: macOS parses `system_profiler` JSON correctly
- Test: Linux parses `arecord -l` tabular output
- Test: Windows parses `wmic` CSV output
- Test: fallback to `[{id: 'default'}]` on command failure
- Test: `isDeviceAvailable` returns false for unknown ID

---

### Step A3 — `AudioManager` (node-record-lpcm16)

**File:** `src/audio/audio-manager.ts`

Replace `createMockRecordingStream()` with real `node-record-lpcm16`:

```typescript
import * as record from 'node-record-lpcm16';

async startRecording(options: RecordingOptions): Promise<void> {
  // 1. Validate device is available (DeviceManager.isDeviceAvailable)
  // 2. If not, fall back to default and emit 'deviceFallback' event
  // 3. Start recording:
  this.recording = record.record({
    sampleRate: options.sampleRate,
    channels: 1,
    device: options.deviceId === 'default' ? null : options.deviceId,
    audioType: 'raw',  // raw PCM — encoder handles format conversion
  });
  // 4. Pipe stream to internal Buffer accumulator
  // 5. Listen for 'error' events → emit on self
}

async stopRecording(): Promise<Buffer> {
  this.recording.stop();
  return this.accumulatedBuffer;
}
```

**Tests:** `tests/unit/audio/audio-manager.test.ts`
- Mock `node-record-lpcm16` at the module boundary (not internal stubs)
- Test: `startRecording` calls `record.record()` with correct sampleRate and channels
- Test: `deviceFallback` event emitted when deviceId unavailable
- Test: `stopRecording` stops recording and returns accumulated buffer
- Test: `isRecording()` returns true while active, false after stop
- Test: error event from recorder propagates to AudioManager error event

---

### Step A4 — Integration Smoke Test

After A1–A3: run `npm run compile` and `npm test`. All 307 existing tests must still pass. Manual test with a real microphone if available.

---

## Phase 2 — Feature D: Language Support (P1, Day 6, parallel with F)

Independent of B/C/E — can be built in parallel with F.

### Step D1 — `package.json` configuration property

Add to `contributes.configuration.properties`:

```json
"voice2code.endpoint.language": {
  "type": "string",
  "default": "en",
  "description": "ISO 639-1 language code for transcription (e.g. en, fr, de, ja, zh)"
}
```

### Step D2 — `ConfigurationManager`

**File:** `src/config/configuration-manager.ts`

In `getEndpointConfig()`, read and return the language:
```typescript
language: config.get<string>('endpoint.language', 'en'),
```

### Step D3 — `OllamaAdapter`

**File:** `src/adapters/ollama-adapter.ts`

In the request body, add `language`:
```typescript
body: JSON.stringify({ model, audio: base64Audio, language: options.language }),
```

### Step D4 — `OpenAIWhisperAdapter`

**File:** `src/adapters/openai-whisper-adapter.ts`

Append language to FormData:
```typescript
formData.append('language', options.language);
```

### Step D5 — Tests

- `ConfigurationManager`: test that `language` defaults to `"en"` and reads from settings
- `OllamaAdapter`: test that `language` appears in request body
- `OpenAIWhisperAdapter`: test that `language` is appended to FormData

---

## Phase 2 — Feature F: Settings Panel (P2, Days 6–9, parallel with D)

### Step F1 — `src/ui/settings-panel.ts` (new file)

Implement `SettingsPanelProvider`:
1. `openOrReveal()` — create or show the panel
2. `buildSnapshot()` — fetch all settings + `deviceManager.enumerateDevices()`
3. `getWebviewContent()` — generate HTML with nonce-based CSP
4. `handleWebviewMessage()` — route incoming messages

HTML structure (four sections rendered in JS via postMessage `init`):
- **Endpoint** — URL input, model input, language select, timeout input, Test Connection button
- **Audio** — device select (populated from `availableDevices`), sampleRate input, format radio
- **UI** — showStatusBar toggle, previewEnabled toggle, audioFeedback toggle
- **History** — enabled toggle, maxItems input, Clear History button (shows entry count)

### Step F2 — `extension.ts`

Update `openSettings` handler:
```typescript
// Before:
vscode.commands.executeCommand('workbench.action.openSettings', 'voice2code');
// After:
settingsPanelProvider.openOrReveal();
```

### Step F3 — Tests

**File:** `tests/unit/ui/settings-panel.test.ts`
- Mock `vscode.window.createWebviewPanel`
- Test: `openOrReveal` creates panel on first call, reveals on second
- Test: `buildSnapshot` includes all config values
- Test: `updateSetting` message calls `config.update()` with correct key/value
- Test: `testConnection` message triggers network check
- Test: `clearHistory` message calls `historyManager.clear()`
- Test: generated HTML contains `nonce` attribute on script tags
- Test: generated HTML does NOT contain inline event handlers (`onclick=`)

---

## Phase 3 — Features B, C, E (Days 7–11, after Feature A)

### Step B1 — `EditorService.showPreviewAndInsert()`

**File:** `src/core/editor-service.ts`

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
    vscode.window.showInformationMessage('Transcription cancelled — nothing inserted.');
    return { confirmed: false, text: null };
  }

  await this.insertText(result);
  return { confirmed: true, text: result };
}
```

### Step B2 — `Voice2CodeEngine` integration

**File:** `src/core/engine.ts`

Replace `editorService.insertText(text)` with `editorService.showPreviewAndInsert(text)`.

### Step B3 — Tests

**File:** `tests/unit/core/editor-service.test.ts`
- Test: `showInputBox` called with correct title, value, placeHolder
- Test: user edits text → edited text inserted
- Test: user presses Escape → cancel notification shown, nothing inserted
- Test: `previewEnabled=false` → skips showInputBox, inserts directly

---

### Step C1 — `NetworkMonitor` (new file)

**File:** `src/network/network-monitor.ts`

```typescript
async isEndpointReachable(url: string, timeoutMs = 3000): Promise<EndpointHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return { reachable: true, url, latencyMs: Date.now() - start, checkedAt: new Date(), isLocalhost: isLocalhost(url) };
  } catch {
    return { reachable: false, url, latencyMs: null, checkedAt: new Date(), isLocalhost: isLocalhost(url) };
  }
}
```

### Step C2 — `Voice2CodeEngine` integration

Add `networkMonitor` constructor injection; call `checkAndNotify()` at the top of `startRecording()`.

### Step C3 — `StatusBarController.setWarning()`

Add warning state — `$(warning)` icon, VS Code warning color token.

Call `setWarning()` in `Voice2CodeEngine` when `checkAndNotify()` returns false.

### Step C4 — Tests

**File:** `tests/unit/network/network-monitor.test.ts`
- Mock `fetch` at the boundary
- Test: reachable endpoint → `EndpointHealth.reachable = true`, latency populated
- Test: timeout → `EndpointHealth.reachable = false`, latency null
- Test: `isLocalhost` true for `localhost` and `127.0.0.1` URLs
- Test: `checkAndNotify` shows Ollama message for localhost
- Test: `checkAndNotify` shows remote message for non-localhost
- Test: `checkAndNotify` returns true without notification when reachable

---

### Step E1 — `HistoryManager` (new file)

**File:** `src/core/history-manager.ts`

Implement full `HistoryManager` class (see api-endpoints.md).

Key implementation notes:
- Use `crypto.randomUUID()` for `HistoryEntry.id` (Node 14.17+)
- Store as `HistoryStore` JSON in `context.globalState.update('voice2code.history', store)`
- Lazy-load on first `add()` or `getAll()` call
- `showHistory()` uses `vscode.window.showQuickPick()` with `placeHolder: "Select a transcription to re-insert"`

### Step E2 — `Voice2CodeEngine` integration

Inject `HistoryManager`; call `historyManager.add()` after successful insert.

### Step E3 — `extension.ts`

Register `voice2code.showHistory` and `voice2code.clearHistory` commands.

`clearHistory`: confirm with `vscode.window.showWarningMessage('Clear all transcription history?', 'Clear', 'Cancel')`, then call `historyManager.clear()`.

### Step E4 — Tests

**File:** `tests/unit/core/history-manager.test.ts`
- Mock `vscode.ExtensionContext.globalState`
- Test: `add()` prepends new entry to front
- Test: entries capped at `maxItems` — oldest removed (FIFO)
- Test: `add()` no-ops when `history.enabled = false`
- Test: `clear()` resets store to empty
- Test: `getAll()` returns entries most-recent-first
- Test: `showHistory()` shows QuickPick with formatted labels
- Test: selecting QuickPick item calls `editorService.showPreviewAndInsert()`

---

## Definition of Done Checklist

Run after completing all features:

```bash
npm run compile      # Must succeed — zero TypeScript errors
npm test             # All tests pass; ≥ 420 total; ≥ 80% coverage
npm run lint         # Zero lint errors
```

Per-feature DoD:
- [ ] Feature A: No mocks in production code; real lamejs MP3 and node-record-lpcm16 used
- [ ] Feature B: Preview InputBox appears after transcription; Escape cancels cleanly
- [ ] Feature C: Endpoint check fires before every recording attempt; warning status bar state visible
- [ ] Feature D: Language setting flows from config → OllamaAdapter body → OpenAIWhisperAdapter FormData
- [ ] Feature E: History entries persist across VS Code restart; Show History QuickPick works
- [ ] Feature F: Settings Panel opens; all settings update live; Test Connection works inline
- [ ] All 307 existing tests still pass (no regressions)
- [ ] JSDoc on all new public methods
- [ ] PR created for each feature linked to its GitHub issue
