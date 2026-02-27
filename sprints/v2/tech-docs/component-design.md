# Sprint v2 — Component Design

> Voice2Code v0.2.0 · Sprint v2 · Technical Documentation

Architecture, dependency graph, and design decisions for all Sprint v2 components. The primary use case throughout is **dictating into AI coding terminals** (Claude Code, Cursor, Codex).

---

## System Architecture (v0.2.0)

```
VS Code Command
    │
    ▼
Voice2CodeEngine          ← orchestrates all components
    │
    ├─── NetworkMonitor        [NEW] check endpoint before recording
    │
    ├─── AudioManager          [MODIFIED] real node-record-lpcm16
    │       └─── DeviceManager [MODIFIED] real platform enumeration
    │       └─── AudioEncoder  [MODIFIED] real lamejs MP3
    │
    ├─── TranscriptionService  [unchanged]
    │       └─── AdapterFactory
    │               ├─── OllamaAdapter      [MODIFIED] passes language
    │               └─── OpenAIWhisperAdapter [MODIFIED] passes language
    │
    ├─── EditorService         [MODIFIED] adds showPreviewAndInsert()
    │
    ├─── HistoryManager        [NEW] session history in globalState
    │
    ├─── StatusBarController   [MODIFIED] adds warning state
    │
    └─── ConfigurationManager  [MODIFIED] returns language setting

SettingsPanelProvider  [NEW] standalone; opened by openSettings command
    ├─── DeviceManager  (shared instance)
    ├─── NetworkMonitor (shared instance)
    └─── HistoryManager (shared instance)
```

---

## Component Descriptions

### `NetworkMonitor` (new — `src/network/network-monitor.ts`)

**Responsibility:** Proactively check STT endpoint reachability before each recording attempt.

**Design decisions:**
- Uses native `fetch` with `AbortController` — no additional HTTP library dependency
- No caching — every call to `isEndpointReachable()` hits the network fresh. This ensures stale "healthy" state doesn't mask a newly-downed Ollama process.
- `checkAndNotify()` is the high-level method used by `Voice2CodeEngine` — it handles both the check and the user-facing notification with platform-appropriate wording (localhost vs remote)
- Timeout default of 3 seconds — fast enough to not frustrate the user, long enough for a cold Ollama startup response

**Testing strategy:** Mock `fetch` at the module boundary. Test both `isEndpointReachable` (unit, returns `EndpointHealth`) and `checkAndNotify` (integration, verifies notification wording).

---

### `AudioManager` (modified — `src/audio/audio-manager.ts`)

**Responsibility:** Manage the recording lifecycle using `node-record-lpcm16`.

**Design decisions:**
- `node-record-lpcm16` is wrapped, not extended — AudioManager owns the lifecycle and exposes a clean `startRecording/stopRecording` API
- Raw PCM is accumulated internally; the format conversion (MP3/WAV) is done by `AudioEncoder` after `stopRecording()` returns the buffer. This keeps concerns separate.
- Device fallback: if the configured device ID is unavailable, fall back to system default silently — but emit a `deviceFallback` event so `Voice2CodeEngine` can show a notification
- The `audioType: 'raw'` option is used so the PCM bytes can be passed directly to `AudioEncoder` without intermediate re-encoding

**Platform note:** `node-record-lpcm16` spawns `sox` on macOS/Linux and `SoX for Windows` on Windows. This is a hard system dependency — documented in README and user-guide.

---

### `DeviceManager` (modified — `src/audio/device-manager.ts`)

**Responsibility:** Enumerate real system audio input devices per platform.

**Design decisions:**
- Prefers `node-audiodevices` npm package if installed, falls back to platform CLI commands — this avoids requiring a native build on platforms where `node-audiodevices` prebuilts exist
- CLI fallback chain (in order):
  - macOS: `system_profiler SPAudioDataType -json`
  - Linux: `arecord -l`
  - Windows: `wmic path Win32_SoundDevice get Name,DeviceID /format:csv`
- Hardened against command failure: any `exec` error → return `[{id:'default', name:'System Default', isDefault:true}]` + log warning. This prevents the extension from crashing if `arecord` is missing.
- Result is NOT cached — device list can change (USB mic plugged in, etc.)

**Testing strategy:** Mock `child_process.exec` and verify the parsing logic for each platform's output format separately.

---

### `AudioEncoder` (modified — `src/audio/audio-encoder.ts`)

**Responsibility:** Convert raw PCM buffers to MP3 (lamejs) or WAV (unchanged).

**Design decisions:**
- `lamejs` is pure JavaScript — no native build, no `ffmpeg` system dependency. This was the key requirement from the sprint plan.
- Block size of 1152 samples matches the MP3 frame size that lamejs expects — using a different block size causes encoding artifacts
- Mono-only (1 channel) to match Whisper's expected input format and keep bitrate low
- 128 kbps is sufficient for speech and accepted by all STT providers tested

---

### `EditorService` (modified — `src/core/editor-service.ts`)

**Responsibility:** Insert text at cursor; optionally show preview InputBox first.

**Design decisions:**
- `showPreviewAndInsert()` is a decorator around `insertText()` — it checks the `previewEnabled` config flag and either goes straight to insertion or via `showInputBox()`
- The InputBox is pre-filled with the transcription text so the user can make small edits before inserting — this is the primary use case: catching "create a migration for user stable" before it goes into the Claude Code terminal
- Cancel (Escape) shows an information notification — not an error — because cancelling a transcription is a valid user action
- `PreviewResult` is returned to allow `Voice2CodeEngine` to decide whether to add the entry to history (only add on confirmed insertions)

---

### `HistoryManager` (new — `src/core/history-manager.ts`)

**Responsibility:** Persist the last N transcriptions; surface them via QuickPick for re-insertion.

**Design decisions:**
- `context.globalState` is used (not `workspaceState`) because transcription history belongs to the user, not a specific workspace — if you dictated "run all tests" in one project, you may want to reuse it in another
- FIFO cap: when `entries.length > maxItems`, `entries.pop()` (remove oldest from end). Entries are stored most-recent-first so index 0 is always the latest.
- History is opt-in (`voice2code.history.enabled = false` by default) — privacy-first. Users must explicitly enable it.
- QuickPick item format: `"[HH:MM] First 60 chars of text..."` matches VS Code's standard history picker conventions and is scannable at a glance
- Re-insertion via history respects `previewEnabled` — calls `showPreviewAndInsert()`, not `insertText()` directly

**Terminal dictation relevance:** This feature is particularly useful because AI terminal users repeat similar prompts frequently ("run the tests", "fix lint errors", "explain this"). History avoids re-dictating.

---

### `SettingsPanelProvider` (new — `src/ui/settings-panel.ts`)

**Responsibility:** Render and manage a VS Code Webview panel for all Voice2Code settings.

**Design decisions:**
- Webview uses `message passing` (postMessage / onMessage) for all host ↔ webview communication — no inline event handlers or `eval()`, complying with VS Code Content Security Policy
- Nonce-based CSP: each panel open generates a new `crypto.randomUUID()` nonce; all `<script>` and `<style>` tags carry this nonce
- Settings update live (no Save button) — `updateSetting` messages call `vscode.workspace.getConfiguration('voice2code').update(key, value, true)` immediately. This matches VS Code's native settings UI behaviour and reduces friction for new users setting up Ollama.
- The `availableDevices` list in the snapshot is fetched from `DeviceManager` at panel-open time — not real-time. User must re-open the panel to see newly connected devices (acceptable trade-off; avoids polling).
- "Test Connection" button is async: the panel sends a `testConnection` message, the extension calls `networkMonitor.isEndpointReachable()`, and sends back a `connectionResult` message. The UI shows a spinner while waiting and renders success/failure inline.

**Security:** No `allowScripts` with `enableForms` — only `enableScripts: true`. All inputs use `type=text/number/checkbox/select` — no dynamic HTML injection from user data.

---

## Dependency Injection Map (v0.2.0 `extension.ts`)

```typescript
// Instantiation order (dependencies first)
const deviceManager    = new DeviceManager();
const audioEncoder     = new AudioEncoder();
const audioManager     = new AudioManager(deviceManager, audioEncoder, config);
const networkMonitor   = new NetworkMonitor();
const historyManager   = new HistoryManager(context, config);
const editorService    = new EditorService(config);
const transcriptionSvc = new TranscriptionService(adapterFactory, config);
const statusBar        = new StatusBarController();

const engine = new Voice2CodeEngine(
  audioManager,
  transcriptionSvc,
  editorService,
  historyManager,
  networkMonitor,
  statusBar,
  config,
);

const settingsPanel = new SettingsPanelProvider(
  context,
  deviceManager,
  networkMonitor,
  historyManager,
);
```

Shared instances: `deviceManager`, `networkMonitor`, `historyManager` are shared between `engine` and `settingsPanel` — single source of truth, no duplicate state.

---

## `Voice2CodeEngine` State Machine (v0.2.0)

```
              ┌──────────────────┐
              │      idle        │◄────────────────────────────┐
              └────────┬─────────┘                             │
                       │ startRecording()                       │
                       ▼                                       │
              ┌──────────────────┐                             │
              │ network check    │──── unreachable ────────────┤ (setWarning)
              └────────┬─────────┘                             │
                       │ reachable                             │
                       ▼                                       │
              ┌──────────────────┐                             │
              │   recording      │                             │
              └────────┬─────────┘                             │
                       │ stopRecording()                       │
                       ▼                                       │
              ┌──────────────────┐                             │
              │   processing     │──── error ──────────────────┤
              └────────┬─────────┘                             │
                       │ transcribed                           │
                       ▼                                       │
              ┌──────────────────┐                             │
              │ preview/insert   │──── cancelled ─────────────►┤
              └────────┬─────────┘                             │
                       │ confirmed                             │
                       ▼                                       │
              ┌──────────────────┐                             │
              │ history.add()    │                             │
              └────────┬─────────┘                             │
                       └────────────────────────────────────►──┘
                                                            idle
```

---

## File Map — New and Modified Files

| File | Status | Feature |
|---|---|---|
| `src/network/network-monitor.ts` | NEW | C |
| `src/core/history-manager.ts` | NEW | E |
| `src/ui/settings-panel.ts` | NEW | F |
| `src/audio/audio-encoder.ts` | MODIFIED | A |
| `src/audio/audio-manager.ts` | MODIFIED | A |
| `src/audio/device-manager.ts` | MODIFIED | A |
| `src/core/engine.ts` | MODIFIED | B, C, E |
| `src/core/editor-service.ts` | MODIFIED | B |
| `src/ui/status-bar-controller.ts` | MODIFIED | C |
| `src/config/configuration-manager.ts` | MODIFIED | D |
| `src/adapters/ollama-adapter.ts` | MODIFIED | D |
| `src/adapters/openai-whisper-adapter.ts` | MODIFIED | D |
| `src/extension.ts` | MODIFIED | E, F |
| `package.json` | MODIFIED | D, E, F |
| `tests/unit/audio/audio-encoder.test.ts` | MODIFIED | A |
| `tests/unit/audio/audio-manager.test.ts` | MODIFIED | A |
| `tests/unit/audio/device-manager.test.ts` | MODIFIED | A |
| `tests/unit/network/network-monitor.test.ts` | NEW | C |
| `tests/unit/core/editor-service.test.ts` | MODIFIED | B |
| `tests/unit/core/history-manager.test.ts` | NEW | E |
| `tests/unit/ui/settings-panel.test.ts` | NEW | F |
| `tests/unit/adapters/ollama-adapter.test.ts` | MODIFIED | D |
| `tests/unit/adapters/openai-whisper-adapter.test.ts` | MODIFIED | D |
| `tests/unit/config/configuration-manager.test.ts` | MODIFIED | D |
