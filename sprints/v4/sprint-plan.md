**STATUS: ✅ COMPLETED** - Reviewed on February 26, 2026

# Sprint v4 Plan

**Sprint Number:** 4

**Duration:** 2 weeks (14 days)

**Sprint Goal:** Make Voice2Code Desktop production-ready by resolving all Sprint v3 tech debt (tray icons, SettingsWindow wiring, webpack build verification), adding audio device selection, voice commands, and transcription history, then packaging as a distributable `.dmg` with electron-builder and merging `feature/desktop-app` into `main`.

---

## Context

Sprints v1-v2 delivered the VS Code extension. Sprint v3 built the complete Electron desktop app architecture — all modules are implemented and tested (147 tests, 98.5% coverage). Sprint v4 is the "ship it" sprint: resolve remaining tech debt, add the final user-facing features, package for distribution, and merge to main.

**Branch:** `feature/desktop-app`

---

## Features in This Sprint

### Feature 1: Polish & Package (Tech Debt Resolution)
- **From PRD:** Phase 2 completion (Sprint v3-v4)
- **Priority:** Critical (P0)
- **Description:** Wire remaining components, create tray icon assets, verify webpack builds, package with electron-builder, and merge to main
- **User Story:** As a developer, I want to download a `.dmg`, install the app, and start dictating — no build steps required
- **Success Criteria:**
  - [ ] Wire SettingsWindow into `main.ts` tray callback (replace placeholder comment)
  - [ ] Create tray icon PNG assets: `trayIconTemplate.png` (idle), `tray-recording.png` (red), `tray-processing.png` (yellow) — 22x22px with @2x variants
  - [ ] Remove `@nut-tree/nut-js` from `package.json` if still listed (replaced by osascript)
  - [ ] `npm run build` succeeds (webpack compiles all 3 entry points)
  - [ ] `npx electron dist/main.js` launches the app in menu bar
  - [ ] Add `electron-builder` config to `package.json` with `.dmg` target
  - [ ] `npm run dist` produces a working `.dmg` installer
  - [ ] Merge `feature/desktop-app` into `main` branch
  - [ ] Update root README with desktop app install/usage instructions

**New/Modified Files:**
- `desktop/assets/trayIconTemplate.png` + `@2x` — Idle mic icon (Template image for dark/light menu bar)
- `desktop/assets/tray-recording.png` + `@2x` — Red recording indicator
- `desktop/assets/tray-processing.png` + `@2x` — Yellow processing indicator
- `desktop/src/main.ts` — Wire SettingsWindow import and tray callback
- `desktop/package.json` — electron-builder config, remove unused deps
- `README.md` — Desktop app documentation

**Dependencies:** None (foundational)

---

### Feature 7: Audio Device Selection
- **From PRD:** Feature 7
- **Priority:** High (P1)
- **Description:** Users can select which microphone to use from a dropdown in the Settings UI
- **User Story:** As a user with multiple microphones (built-in, USB headset, external mic), I want to choose which one to use for better audio quality
- **Success Criteria:**
  - [ ] Settings UI shows a dropdown of available audio input devices
  - [ ] Dropdown populated by querying `DeviceManager.getDevices()` from shared core
  - [ ] Selected device ID persisted in ConfigStore (`audio.deviceId`)
  - [ ] DesktopEngine passes selected device to AudioManager on capture start
  - [ ] Default value: `"default"` (system default mic)
  - [ ] IPC channel: `settings:get-devices` added to preload and SettingsWindow
  - [ ] Refresh button to re-enumerate devices

**New/Modified Files:**
- `desktop/src/settings-window.ts` — Add `settings:get-devices` IPC handler
- `desktop/src/preload.ts` — Expose `getDevices()` via contextBridge
- `desktop/src/settings/settings.html` — Add device dropdown to Audio section
- `desktop/src/settings/settings-renderer.ts` — Populate device dropdown, handle selection
- `desktop/src/config-store.ts` — Add `audio.deviceId` to schema (default: `"default"`)

**Dependencies:** Feature 1 (build must work)

---

### Feature 9: Voice Commands
- **From PRD:** Feature 9
- **Priority:** High (P1)
- **Description:** Recognize spoken commands in transcribed text and map them to OS/app actions
- **User Story:** As a power user, I want to say "new line", "select all", or "undo" and have the app execute those actions so I can work hands-free
- **Success Criteria:**
  - [ ] `CommandParser` class detects command keywords in transcribed text
  - [ ] Built-in commands: `new line` → Enter, `tab` → Tab, `select all` → Cmd+A, `undo` → Cmd+Z, `redo` → Cmd+Shift+Z, `copy` → Cmd+C, `paste` → Cmd+V, `cut` → Cmd+X, `delete` → Delete/Backspace
  - [ ] Commands executed via osascript (same pattern as paste)
  - [ ] Command text stripped from output (e.g., "hello new line world" → types "hello", presses Enter, types "world")
  - [ ] Commands can be disabled in Settings (`ui.voiceCommandsEnabled`)
  - [ ] Configurable command vocabulary (extensible in config)
  - [ ] Mixed mode: text and commands in the same utterance

**New Files:**
- `desktop/src/command-parser.ts` — `CommandParser` class with `parse(text)` → `{ segments: (TextSegment | CommandSegment)[] }`
- `desktop/src/command-executor.ts` — `CommandExecutor` class that executes parsed commands via osascript
- `desktop/tests/unit/command-parser.test.ts` — Command parsing tests
- `desktop/tests/unit/command-executor.test.ts` — Command execution tests

**Modified Files:**
- `desktop/src/desktop-engine.ts` — After transcription, run through CommandParser + CommandExecutor instead of plain pasteText
- `desktop/src/config-store.ts` — Add `ui.voiceCommandsEnabled` to schema

**Dependencies:** Feature 1 (build must work)

---

### Feature 10: Transcription History
- **From PRD:** Feature 10
- **Priority:** Medium (P2)
- **Description:** Store recent transcriptions and provide a searchable history panel accessible from the tray menu
- **User Story:** As a user, I want to see my recent transcriptions so I can re-paste a previous dictation without re-recording
- **Success Criteria:**
  - [ ] `HistoryStore` class stores last 50 transcriptions with timestamp
  - [ ] History persisted in electron-store (survives restart)
  - [ ] Tray menu item "History" opens a history BrowserWindow
  - [ ] History window shows list of transcriptions (most recent first)
  - [ ] Click a transcription to copy it to clipboard
  - [ ] Search/filter transcriptions by text content
  - [ ] "Clear History" button
  - [ ] IPC channels: `history:get`, `history:clear`, `history:copy`

**New Files:**
- `desktop/src/history-store.ts` — `HistoryStore` class (wraps electron-store, max 50 entries, FIFO)
- `desktop/src/history-window.ts` — `HistoryWindow` class (BrowserWindow + IPC handlers)
- `desktop/src/history/history.html` — History list UI
- `desktop/src/history/history.css` — History styles
- `desktop/src/history/history-renderer.ts` — History frontend logic
- `desktop/tests/unit/history-store.test.ts` — History storage tests

**Modified Files:**
- `desktop/src/desktop-engine.ts` — After successful paste, add transcription to HistoryStore
- `desktop/src/preload.ts` — Expose history IPC channels
- `desktop/src/tray.ts` — Add "History" menu item
- `desktop/src/main.ts` — Wire HistoryStore and HistoryWindow
- `desktop/webpack.config.js` — Add history HTML/CSS to CopyPlugin

**Dependencies:** Feature 1 (build must work)

---

## Shared Modules Reused (Zero Changes Expected)

| Module | Path | Purpose |
|---|---|---|
| Device Manager | `src/audio/device-manager.ts` | Device enumeration for audio device selection |
| Audio Manager | `src/audio/audio-manager.ts` | Mic capture with device ID |
| All other shared modules | `src/adapters/`, `src/audio/`, `src/types/` | Same as Sprint v3 |

---

## Build Order (Dependencies)

```
Feature 1 (Polish & Package)   ← foundation, resolves all tech debt
    ↓
Feature 7 (Audio Device)       ← needs working build + settings
Feature 9 (Voice Commands)     ← needs working engine pipeline
Feature 10 (Transcription History) ← needs working engine + tray
    ↓
Final: Merge feature/desktop-app → main
```

**Recommended implementation order:**
1. Feature 1: Polish & Package (resolve tech debt, verify build, add electron-builder)
2. Feature 7: Audio Device Selection (settings extension)
3. Feature 9: Voice Commands (new component + engine integration)
4. Feature 10: Transcription History (new window + store)
5. Final merge to main + README update

---

## Out of Scope for Sprint v4

- **Multi-Language Support** (Feature 11) — language is already configurable; full multi-language UX is Phase 3+
- **Linux Desktop App** — macOS only per PRD
- **App Store Distribution** — GitHub releases only
- **Auto-update** — Future enhancement (Squirrel/autoUpdater)
- **Custom Model Training** — Out of scope per PRD
- **Code-Aware Dictation** — Phase 4+

---

## Risks & Concerns

- [ ] **Tray icon asset quality:** Need proper 22x22 Template images for macOS dark/light menu bar — may need designer input or use SF Symbols
- [ ] **electron-builder configuration:** First time packaging — may have issues with code signing, entitlements, or native module bundling
- [ ] **Voice command accuracy:** STT models may not reliably recognize short commands like "tab" or "undo" — may need fuzzy matching or confirmation
- [ ] **Command parsing edge cases:** Distinguishing command words from regular dictation (e.g., "I want to undo the last change" vs "undo") requires careful design
- [ ] **History window memory:** Storing 50 transcriptions with potentially long text — need to consider storage limits
- [ ] **Merge conflicts:** `feature/desktop-app` has diverged significantly from `main` — merge may require careful conflict resolution

---

## Definition of Done

A feature is considered "done" when:

- [ ] Code implemented and working on macOS
- [ ] Unit tests written and passing (80%+ coverage for new code)
- [ ] All existing tests still pass (no regressions)
- [ ] TypeScript strict mode — no type errors
- [ ] No secrets logged or exposed in config files
- [ ] Input validation for all user-configurable values

Sprint v4 is complete when:

- [ ] `cd desktop && npm run build` compiles successfully
- [ ] `npx electron dist/main.js` launches the app with tray icons
- [ ] Settings window opens with audio device selection
- [ ] Voice commands work: say "hello new line world" → types "hello\nworld"
- [ ] History window shows recent transcriptions
- [ ] `npm run dist` produces a working `.dmg`
- [ ] `feature/desktop-app` merged into `main`
- [ ] All tests pass: `cd desktop && npm test`
- [ ] README has desktop app documentation

---

## Estimated Effort

| Feature | Complexity | Estimated Days | Notes |
|---------|-----------|----------------|-------|
| Feature 1: Polish & Package | Medium | 2-3 days | Icon assets, SettingsWindow wiring, electron-builder, README |
| Feature 7: Audio Device Selection | Low | 1-2 days | Settings dropdown, IPC, config schema update |
| Feature 9: Voice Commands | High | 3-4 days | CommandParser, CommandExecutor, engine integration, edge cases |
| Feature 10: Transcription History | Medium | 2-3 days | HistoryStore, HistoryWindow, history UI, tray integration |
| **Testing & Integration** | - | 2 days | End-to-end testing, build verification |

**Total:** 10-14 days (fits 2-week sprint)

---

## Notes

- **Branch strategy:** Continue using `feature/desktop-app` as integration branch. Individual features branch off it and merge back. Final merge to `main` at sprint end.
- **Shared Core Unchanged:** No modifications to `src/` modules expected — desktop app imports them via `@core/*` path alias
- **TDD Workflow:** Write tests before implementation using Speckit
- **DRY Principle:** Avoid duplication — reuse osascript pattern for voice commands, reuse SettingsWindow pattern for HistoryWindow
- **Supported Providers:** vLLM (local), Groq (cloud), OpenAI (cloud) — NO Ollama
- **osascript for paste + commands:** All keyboard simulation via osascript (no @nut-tree/nut-js)

---

**Sprint Status:** Planning Complete

**Next Steps:**
1. Run `/prodkit.sprint-tech` to create detailed technical specifications
2. Run `/prodkit.create-issues` to generate GitHub issues for each feature
3. Run `/prodkit.dev` to start implementing features using TDD workflow
