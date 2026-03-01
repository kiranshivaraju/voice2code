# Sprint v2 Plan

**Sprint Number:** 2

**Duration:** 2 weeks (14 days)

**Sprint Goal:** Make Voice2Code fully functional end-to-end. Replace all mocked audio subsystems with real microphone capture, add transcription preview for AI terminal workflows, offline detection, session history, language selection, and a settings panel. After this sprint, a user can install Voice2Code, say a prompt, and have it appear in their Claude Code / Cursor / Codex terminal input — no mocks, no workarounds.

---

## Context: Primary Use Case

Voice2Code is built for **dictating into AI coding terminals**:
- Claude Code (this terminal)
- Cursor terminal/chat
- Codex terminal

The user speaks a natural-language prompt → it appears in the AI input field → user presses Enter.

Sprint v1 built the complete architecture but left audio capture mocked. Sprint v2 finishes the product.

---

## What Was Mocked in v0.1.0 (Must Be Fixed)

| Component | Mock | Real Implementation Needed |
|---|---|---|
| `DeviceManager.enumerateDevices()` | 3 hardcoded fake devices | Real system mic list via platform APIs |
| `AudioManager` recording | Silence buffer at intervals | `node-record-lpcm16` live capture |
| `AudioEncoder` MP3 | Fake header + zero bytes | `lamejs` pure-JS MP3 encoder |
| `AudioEncoder` WAV | ✅ Already real | — |

---

## Features in This Sprint

### Feature A: Real Audio Pipeline [P0 — Critical — Must Ship First]

- **Priority:** P0 — the product does not work without this
- **Description:** Replace all mock audio implementations with real microphone capture, real device enumeration, and real MP3 encoding
- **User Story:** As a user, I want Voice2Code to actually record my voice so that my words get transcribed and inserted into Claude Code

**Success Criteria:**
- [ ] `DeviceManager` returns real system microphones on macOS, Windows, and Linux
- [ ] `AudioManager` captures live audio from the user's microphone using `node-record-lpcm16`
- [ ] `AudioEncoder` produces real MP3 using `lamejs` (pure JS, no ffmpeg system dependency)
- [ ] WAV encoding (already working) verified in the real pipeline
- [ ] Device fallback: if selected device unavailable, fall back to system default with notification
- [ ] Full flow works: speak → encode → send to Ollama → transcription → insert in Claude Code input
- [ ] Unit tests mock `node-record-lpcm16` and `lamejs` at the boundary (not the internal stubs)
- [ ] `npm run compile` succeeds; `npm test` passes (no regressions)

**Implementation notes:**
- Use `lamejs` (MIT, pure JS) for MP3 — avoids requiring `ffmpeg` on the user's system
- For device enumeration on macOS: `system_profiler SPAudioDataType` or `node-audiodevices` npm package
- For Linux: parse `arecord -l` output or use `node-audiodevices`
- For Windows: use `wmic path Win32_SoundDevice` or `node-audiodevices`
- `node-record-lpcm16` requires `sox` (Linux/macOS) or `SoX for Windows` — document clearly

**Files to change:**
- `src/audio/audio-encoder.ts` — replace MP3 mock with `lamejs`
- `src/audio/audio-manager.ts` — replace `createMockRecordingStream()` with real `node-record-lpcm16`
- `src/audio/device-manager.ts` — replace all `getMockDevices()` calls with real platform enumeration
- `package.json` — add `lamejs` dependency; optionally `node-audiodevices`
- `tests/unit/audio/` — update mocks to target real library boundaries

---

### Feature B: Transcription Preview & Confirmation [P1 — High]

- **Priority:** P1
- **Description:** After transcription, show the text in a VS Code InputBox so the user can review and edit before it's inserted into the AI terminal input
- **User Story:** As a user dictating a prompt to Claude Code, I want to see the transcription before it's sent so I can fix any errors before pressing Enter

**Why this matters for AI terminals:** A wrong prompt to an AI can waste time or cause unexpected actions. Preview lets you catch "create a migration for users table" being transcribed as "create a migration for user stable" before it's sent.

**Success Criteria:**
- [ ] After transcription completes, `vscode.window.showInputBox()` opens with transcribed text pre-filled
- [ ] User can edit the text directly in the input box
- [ ] Press **Enter** to confirm → text inserted at cursor (in the AI terminal input)
- [ ] Press **Escape** to cancel → show info notification "Transcription cancelled — nothing inserted"
- [ ] If `voice2code.ui.previewEnabled` is `false`, skip preview and insert directly (for power users who want speed)
- [ ] Preview input box title: `"Voice2Code — Review transcription before inserting"`
- [ ] Preview input box placeholder: `"Edit transcription or press Enter to confirm"`

**Files to change:**
- `src/core/engine.ts` — after `transcriptionService.transcribe()`, call preview flow
- `src/core/editor-service.ts` — add `showPreviewAndInsert(text)` method wrapping `showInputBox`
- `tests/unit/core/editor-service.test.ts` — add preview flow tests

---

### Feature C: Offline Mode & Endpoint Health Detection [P1 — High]

- **Priority:** P1
- **Description:** Before starting a transcription, proactively check if the STT endpoint is reachable. Give a clear, actionable error if it's not — don't make the user wait for a 30-second timeout.
- **User Story:** As a user who just opened VS Code, I want to know immediately if Ollama isn't running so I can fix it before trying to dictate

**Success Criteria:**
- [ ] `NetworkMonitor` class with `isEndpointReachable(url, timeoutMs = 3000)` — HEAD request or lightweight GET
- [ ] `Voice2CodeEngine.startRecording()` calls network check before starting capture
- [ ] If unreachable and `localhost`: notification with message `"Cannot reach STT endpoint. Is Ollama running? Start with: ollama serve"` + "Test Connection" action button
- [ ] If unreachable and remote URL: notification `"Cannot reach STT endpoint at {url}. Check network connection."` + "Test Connection" action button
- [ ] Status bar shows `$(warning) Voice2Code` when last check failed (resets on success)
- [ ] Network check does NOT cache — retried fresh on next recording attempt
- [ ] Check timeout: 3 seconds max (don't delay the user)

**Files to create/change:**
- `src/network/network-monitor.ts` — `NetworkMonitor` class (new file)
- `src/core/engine.ts` — inject `NetworkMonitor`, call before `startRecording`
- `src/ui/status-bar-controller.ts` — add `warning` state
- `tests/unit/network/network-monitor.test.ts` — unit tests

---

### Feature D: Language Support [P1 — High]

- **Priority:** P1 — infrastructure already exists, just needs the setting wired through
- **Description:** Let users set a preferred transcription language so non-English speakers can dictate in their native language
- **User Story:** As a French developer dictating to Claude Code, I want to speak French and have it transcribed correctly

**Success Criteria:**
- [ ] Add `voice2code.endpoint.language` setting in `package.json` (string, default: `"en"`, description: "ISO 639-1 language code, e.g. en, fr, de, ja, zh")
- [ ] `ConfigurationManager.getEndpointConfig()` returns `language` field
- [ ] `TranscriptionOptions.language` set from config in `Voice2CodeEngine`
- [ ] `OllamaAdapter` passes `language` in request body (field already accepted in TranscriptionOptions)
- [ ] `OpenAIWhisperAdapter` passes `language` as form field (Whisper API standard)
- [ ] Unit tests verify language is passed through both adapters

**Files to change:**
- `package.json` — add `voice2code.endpoint.language` configuration property
- `src/config/configuration-manager.ts` — read language setting
- `src/adapters/ollama-adapter.ts` — verify language is passed in body
- `src/adapters/openai-whisper-adapter.ts` — verify language is passed as form field
- Tests for both adapters

---

### Feature E: Session History [P2 — Medium]

- **Priority:** P2
- **Description:** Store the last 50 transcriptions locally so users can re-insert previous prompts into the AI terminal
- **User Story:** As a user, I want to re-use a prompt I dictated 10 minutes ago without saying it again

**This is especially useful for AI terminals:** you often send similar prompts repeatedly ("run the tests", "fix the lint errors", "explain this function"). History lets you quickly re-send them.

**Success Criteria:**
- [ ] `HistoryManager` stores transcriptions in `context.globalState` with schema: `{ text, timestamp, language, durationMs }`
- [ ] Max 50 entries — oldest removed when limit reached (FIFO)
- [ ] Every successful transcription saved automatically (when `voice2code.history.enabled` is `true`)
- [ ] `Voice2Code: Show History` command — opens `vscode.window.showQuickPick()` with recent transcriptions
- [ ] Selecting a history item inserts it at cursor position (re-runs insert flow, with preview if enabled)
- [ ] `Voice2Code: Clear History` command — prompts confirmation then clears `globalState`
- [ ] History panel label format: `"[HH:MM] First 60 chars of text..."`
- [ ] Setting `voice2code.history.enabled` defaults to `false` (opt-in for privacy)

**Files to create/change:**
- `src/core/history-manager.ts` — `HistoryManager` class (new file)
- `src/core/engine.ts` — inject `HistoryManager`, call `add()` after successful insert
- `src/extension.ts` — register `voice2code.showHistory` and `voice2code.clearHistory` commands
- `package.json` — register new commands; history settings already defined
- `tests/unit/core/history-manager.test.ts`

---

### Feature F: Settings Panel (Webview) [P2 — Medium]

- **Priority:** P2
- **Description:** A dedicated VS Code Webview panel for all Voice2Code settings — no more digging through VS Code settings search
- **User Story:** As a new user, I want a single settings screen where I can configure my endpoint, test the connection, and be ready to dictate — all in one place

**Success Criteria:**
- [ ] `Voice2Code: Open Settings` command opens a Webview panel (overrides current behavior of opening raw settings)
- [ ] Panel sections: **Endpoint** (URL, model, language, timeout, Test Connection button), **Audio** (device, sample rate, format), **UI** (status bar, preview, audio feedback), **History** (enabled toggle, max items, Clear History button)
- [ ] "Test Connection" button in the panel calls `testConnection` and shows inline result
- [ ] All changes save immediately to VS Code settings (no "Save" button needed — live update via `config.update()`)
- [ ] "Customize Shortcut" link opens Keyboard Shortcuts filtered to `voice2code`
- [ ] Panel follows VS Code Content Security Policy (nonce-based scripts, no inline event handlers)
- [ ] Accessible: ARIA labels, keyboard navigable

**Files to create/change:**
- `src/ui/settings-panel.ts` — `SettingsPanelProvider` with Webview API (new file)
- `src/extension.ts` — update `openSettings` command to open panel instead of raw settings
- `tests/unit/ui/settings-panel.test.ts`

---

## Build Order (Dependencies)

```
Feature A (Real Audio)    ← must be first — B, C, E all depend on it
    ↓
Feature B (Preview)       ← after A; needs real transcription to preview
Feature C (Offline)       ← after A; checks endpoint before real recording
Feature E (History)       ← after A; needs real transcriptions to store

Feature D (Language)      ← independent; can be built in parallel with A
Feature F (Settings UI)   ← independent; can be built in parallel with A
```

**Recommended implementation order:**
1. Feature A (unblocks everything)
2. Feature D + F in parallel (independent)
3. Feature B + C + E in parallel (after A)

---

## Out of Scope for Sprint v2

- Visual Studio (non-VS Code) extension — Phase 3
- Custom vocabulary / voice macros — Phase 4
- Noise cancellation / audio preprocessing — Phase 4
- Code-aware dictation (understands syntax context) — Phase 4
- Team/enterprise shared configurations — Phase 4

---

## Definition of Done

A feature is done when:
- [ ] Production code has NO mocks (mocks only in test files)
- [ ] Unit tests written and passing (80%+ coverage on new code)
- [ ] All 307 existing tests still pass (no regressions)
- [ ] `npm run compile` succeeds
- [ ] `npm run lint` passes
- [ ] JSDoc on all public methods
- [ ] PR created and linked to GitHub issue

Sprint v2 is complete when:
- [ ] User can install, speak a prompt, and have it appear in Claude Code / Cursor — end-to-end, no mocks
- [ ] All 6 features merged to main
- [ ] Total tests ≥ 420
- [ ] Coverage remains ≥ 80%
- [ ] `CHANGELOG.md` updated with v0.2.0
- [ ] Packaged as `voice2code-0.2.0.vsix`

---

## Risks

| Risk | Mitigation |
|---|---|
| `node-record-lpcm16` breaks on macOS Sonoma / Node v20 | Test early; have `sox`-based fallback or switch to `node-microphone` |
| Real device enumeration complex on all 3 platforms | Ship macOS + Linux first; document Windows "beta" |
| Webview CSP restrictions cause JS issues | Use message passing (postMessage) pattern — no inline scripts |
| `lamejs` output quality issues | Validate MP3 output against Whisper API acceptance criteria early |

---

## Estimated Effort

| Feature | Complexity | Days |
|---|---|---|
| A: Real Audio Pipeline | High | 4–5 |
| B: Transcription Preview | Low | 1 |
| C: Offline Detection | Medium | 1–2 |
| D: Language Support | Low | 0.5 |
| E: Session History | Medium | 1.5 |
| F: Settings UI | High | 3–4 |

**Total: 11–14 days (fits 2-week sprint)**
