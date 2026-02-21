# Sprint v3 Plan

**Sprint Number:** 3

**Duration:** 2 weeks (14 days)

**Sprint Goal:** Build a system-wide macOS menu bar app that lets users dictate text into any application (Ghostty, browsers, VS Code, Notes) using a global hotkey. The desktop app reuses the shared core from the VS Code extension and adds Electron-specific config, secrets, settings UI, and paste simulation.

---

## Context

Sprints v1-v2 delivered a fully working VS Code/Cursor extension. Sprint v3 builds the **Electron desktop app** — a macOS menu bar app that provides the same speech-to-text capability system-wide.

**Key architectural decision:** The desktop app reuses all shared core modules (`src/adapters/`, `src/audio/`, `src/types/`, `src/config/endpoint-validator.ts`) with zero changes. Only platform-specific shells are new code.

**Branch:** `feature/desktop-app`

---

## Features in This Sprint

### Feature 1: System-Wide Voice Input (Desktop App)
- **From PRD:** Feature 1
- **Priority:** Critical (P0)
- **Description:** macOS menu bar app that captures speech via a global hotkey and pastes transcribed text into any focused application
- **User Story:** As a developer, I want to dictate text into any app (Ghostty, browser, VS Code) using a global hotkey so that I'm not limited to IDE extensions
- **Success Criteria:**
  - [ ] Electron app runs as menu bar tray icon (no dock icon, `LSUIElement: true`)
  - [ ] Tray icon with context menu (Start/Stop Recording, Settings, Test Connection, Quit)
  - [ ] Global hotkey (Cmd+Shift+V) toggles recording from any app
  - [ ] Recording flow: capture audio → encode MP3 → send to STT → paste result
  - [ ] Paste via clipboard: save clipboard → write text → simulate Cmd+V via `@nut-tree/nut-js` → restore clipboard after 500ms
  - [ ] Tray icon changes state: idle (mic) → recording (red) → processing (yellow) → idle
  - [ ] macOS Accessibility permission check on first launch (`isTrustedAccessibilityClient`)
  - [ ] App quits cleanly (unregisters hotkey, removes tray)

**New Files:**
- `desktop/package.json` — Electron app dependencies
- `desktop/tsconfig.json` — TypeScript config with `@core/*` path alias
- `desktop/webpack.config.js` — 3 entry points (main, preload, renderer)
- `desktop/src/main.ts` — Electron entry point, wires all components
- `desktop/src/tray.ts` — `TrayManager` class (icon + context menu)
- `desktop/src/hotkey.ts` — `HotkeyManager` class (globalShortcut)
- `desktop/src/paste.ts` — `pasteText()` function (clipboard + Cmd+V)
- `desktop/src/desktop-engine.ts` — `DesktopEngine` state machine (idle→recording→processing→idle)
- `desktop/assets/` — Tray icon assets (idle, recording, processing)
- `desktop/entitlements.plist` — macOS permissions

**Dependencies:** None (foundational)

---

### Feature 2: Model Configuration (Desktop)
- **From PRD:** Feature 2
- **Priority:** Critical (P0)
- **Description:** Persistent configuration for STT endpoint, model, audio format using `electron-store`
- **User Story:** As a developer, I want to configure my STT provider so that I can use local vLLM for privacy or cloud Groq/OpenAI for convenience
- **Success Criteria:**
  - [ ] `ConfigStore` wraps `electron-store` with typed config schema
  - [ ] Exposes `getEndpointConfig()` and `getAudioConfig()` matching shared interfaces from `src/types/index.ts`
  - [ ] Default values match constitution defaults (localhost:11434, whisper-large-v3, mp3, 30s timeout)
  - [ ] Config persists across app restarts (JSON file in app data directory)
  - [ ] Endpoint URL validated via shared `EndpointValidator`
  - [ ] Model name validated via shared `EndpointValidator`
  - [ ] Support OpenAI-compatible endpoints (vLLM, Groq, OpenAI)

**New Files:**
- `desktop/src/config-store.ts` — `ConfigStore` class

**Dependencies:** None

---

### Feature 5: Secure API Key Management (Desktop)
- **From PRD:** Feature 5
- **Priority:** Critical (P0)
- **Description:** Encrypt and store API keys using Electron's `safeStorage` API (macOS Keychain-backed)
- **User Story:** As a user of Groq/OpenAI, I want to securely store my API key so that it's encrypted and never exposed in plain text
- **Success Criteria:**
  - [ ] `SecretStore` class using `safeStorage.encryptString()` / `safeStorage.decryptString()`
  - [ ] Encrypted API key stored as base64 string in electron-store (never plain text)
  - [ ] `setApiKey(key)`, `getApiKey()`, `deleteApiKey()` methods
  - [ ] API key never logged or exposed in config files
  - [ ] Graceful fallback if safeStorage is unavailable (prompt user, don't crash)
  - [ ] Works with macOS Keychain

**New Files:**
- `desktop/src/secret-store.ts` — `SecretStore` class

**Dependencies:** Feature 2 (uses electron-store for encrypted blob storage)

---

### Feature 6: Settings UI (Desktop)
- **From PRD:** Feature 6
- **Priority:** High (P1)
- **Description:** Native settings window accessible from tray menu for configuring all options
- **User Story:** As a user, I want a settings UI so that I can configure endpoint, API key, and audio settings without editing JSON files
- **Success Criteria:**
  - [ ] "Settings" option in tray context menu opens a BrowserWindow
  - [ ] Form fields: Endpoint URL, Model Name, API Key (masked), Audio Format (MP3/WAV), Language
  - [ ] "Test Connection" button validates endpoint + model connectivity
  - [ ] "Save" button persists settings to electron-store and API key to safeStorage
  - [ ] "Delete API Key" button removes stored key
  - [ ] Settings window uses context isolation + preload script (no `nodeIntegration`)
  - [ ] IPC bridge via `contextBridge` for settings get/save/test operations
  - [ ] Window reusable (show existing instead of creating new)

**New Files:**
- `desktop/src/preload.ts` — contextBridge IPC exposure
- `desktop/src/settings-window.ts` — `SettingsWindow` class (BrowserWindow + IPC handlers)
- `desktop/src/settings/settings.html` — Settings form markup
- `desktop/src/settings/settings.css` — Settings form styles
- `desktop/src/settings/settings-renderer.ts` — Frontend logic for settings form

**Dependencies:** Feature 2, Feature 5

---

### Feature 8: Error Handling & Notifications (Desktop)
- **From PRD:** Feature 8
- **Priority:** High (P1)
- **Description:** Clear error messages via macOS notifications and tray icon state changes
- **User Story:** As a user, I want to know when something goes wrong so that I can troubleshoot
- **Success Criteria:**
  - [ ] macOS notifications for errors via Electron `Notification` API
  - [ ] Actionable error messages: "Cannot connect to endpoint. Check URL and try again."
  - [ ] Tray icon reflects error state (distinct from idle/recording/processing)
  - [ ] Specific error handling: ECONNREFUSED, ETIMEDOUT, 401/403, 404, 429, 500+
  - [ ] Notification on Accessibility permission not granted
  - [ ] Notification on microphone permission denied
  - [ ] Error details logged to console (not in notifications)
  - [ ] Uses shared error classes from `src/types/index.ts` (Voice2CodeError, NetworkError, AudioError, etc.)

**New Files:** None — integrated into `desktop-engine.ts`, `tray.ts`, `main.ts`

**Dependencies:** Feature 1 (error handling wraps the recording flow)

---

## Shared Modules Reused (Zero Changes)

| Module | Path | Purpose |
|---|---|---|
| STT Adapter Interface | `src/adapters/stt-adapter.ts` | Adapter contract |
| Adapter Factory | `src/adapters/adapter-factory.ts` | Provider detection + creation |
| OpenAI Whisper Adapter | `src/adapters/openai-whisper-adapter.ts` | OpenAI/Groq/vLLM API |
| Audio Manager | `src/audio/audio-manager.ts` | Mic capture via sox |
| Audio Encoder | `src/audio/audio-encoder.ts` | PCM → MP3/WAV |
| Device Manager | `src/audio/device-manager.ts` | Device enumeration |
| Endpoint Validator | `src/config/endpoint-validator.ts` | URL/model validation |
| Types & Errors | `src/types/index.ts` | All shared interfaces |

---

## Build Order (Dependencies)

```
Feature 2 (Config Store)     ← foundation, no deps
Feature 5 (Secret Store)     ← needs Feature 2
    ↓
Feature 1 (Desktop App Core) ← needs Feature 2, 5 for config/keys
    ↓
Feature 8 (Error Handling)   ← wraps Feature 1 recording flow
Feature 6 (Settings UI)      ← needs Feature 2, 5; enhances Feature 1
```

**Recommended implementation order:**
1. Feature 2: Config Store (foundation)
2. Feature 5: Secret Store (needs config store)
3. Feature 1: Desktop App Core (main app shell + recording flow)
4. Feature 6: Settings UI (settings window)
5. Feature 8: Error Handling & Notifications (polish)

---

## Out of Scope for Sprint v3

- **Voice Commands** (Feature 9) — Phase 3 (Sprint v5-v6)
- **Transcription History** (Feature 10) — Phase 3 (Sprint v5-v6)
- **Multi-Language Support** (Feature 11) — Phase 3 (Sprint v5-v6)
- **Audio Device Selection UI** (Feature 7) — Phase 3 (uses system default for now)
- **Windows/Linux Desktop App** — macOS only for initial release
- **App Store Distribution** — GitHub releases only
- **electron-builder packaging** — Sprint v4 (polish sprint)
- **Auto-update** — Future enhancement

---

## Risks & Concerns

- [ ] **@nut-tree/nut-js compatibility:** May have issues with macOS Sonoma/Sequoia. Mitigation: Test early; fallback to AppleScript `osascript` for Cmd+V simulation
- [ ] **Accessibility permissions:** Users must manually grant accessibility access. Mitigation: Clear first-launch prompt with instructions
- [ ] **sox dependency:** Desktop app still requires `brew install sox`. Mitigation: Document in README; check on launch and show notification if missing
- [ ] **Clipboard race condition:** Restoring clipboard after paste may fail if user copies something in the 500ms window. Mitigation: Acceptable trade-off; document behavior
- [ ] **Webpack path aliases:** `@core/*` → `../src/*` may have resolution issues. Mitigation: Test webpack build early in Phase 1

---

## Definition of Done

A feature is considered "done" when:

- [ ] Code implemented and working on macOS
- [ ] Unit tests written and passing (80%+ coverage for new code)
- [ ] All existing VS Code extension tests still pass (no regressions in shared core)
- [ ] TypeScript strict mode — no type errors
- [ ] JSDoc comments on all public methods
- [ ] No secrets logged or exposed in config files
- [ ] Input validation for all user-configurable values

Sprint v3 is complete when:

- [ ] `cd desktop && npm install && npm run build && npx electron dist/main.js` launches the app
- [ ] App appears in menu bar (no dock icon)
- [ ] Settings window opens from tray → configure endpoint + API key → Save → Test Connection succeeds
- [ ] Open Ghostty → press Cmd+Shift+V → speak → press Cmd+Shift+V → text appears in terminal
- [ ] Works in browser text fields, VS Code, Notes app — text pastes correctly everywhere
- [ ] Quit and relaunch → settings persist
- [ ] Error scenarios show macOS notifications with actionable messages
- [ ] `cd desktop && npx jest` — all unit tests pass

---

## Estimated Effort

| Feature | Complexity | Estimated Days | Notes |
|---------|-----------|----------------|-------|
| Feature 2: Config Store | Low | 1 day | Wraps electron-store with typed interface |
| Feature 5: Secret Store | Low | 0.5 days | safeStorage encrypt/decrypt |
| Feature 1: Desktop App Core | High | 4-5 days | Electron shell, tray, hotkey, paste, engine |
| Feature 6: Settings UI | Medium | 2-3 days | BrowserWindow, IPC, HTML form |
| Feature 8: Error Handling | Medium | 1-2 days | Notifications, tray states, error mapping |
| **Testing & Integration** | - | 2 days | End-to-end testing across apps |

**Total:** 11-14 days (fits 2-week sprint)

---

## macOS Permissions Required

| Permission | Purpose | When Prompted |
|---|---|---|
| Microphone | Audio capture via sox | First recording attempt |
| Accessibility | Keyboard simulation (Cmd+V paste) | App launch (via `isTrustedAccessibilityClient`) |

---

## Notes

- **Shared Core Unchanged:** No modifications to `src/` modules — desktop app imports them directly
- **Privacy First:** No telemetry, audio cleared from memory after use
- **DRY Principle:** Desktop config/secret stores implement same interfaces as VS Code equivalents
- **TDD Workflow:** Write tests before implementation using Speckit
- **Supported Providers:** vLLM (local), Groq (cloud, free tier), OpenAI (cloud, paid) — NO Ollama

---

**Sprint Status:** Planning Complete

**Next Steps:**
1. Run `/prodkit.sprint-tech` to create detailed technical specifications
2. Run `/prodkit.create-issues` to generate GitHub issues for each feature
3. Run `/prodkit.dev` to start implementing features using TDD workflow
