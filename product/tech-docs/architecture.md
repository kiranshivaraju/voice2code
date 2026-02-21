# System Architecture

## Overview

Voice2Code is an open-source speech-to-text tool for macOS developers, available as both a **VS Code/Cursor extension** and a standalone **Electron menu bar app**. Both share a common core of reusable TypeScript modules for audio capture, encoding, and STT adapter communication.

The architecture follows a **shared-core, platform-specific shell** model: platform-independent modules (adapters, audio, types) live in `src/` and are consumed by both the VS Code extension (`src/extension.ts`) and the Electron desktop app (`desktop/src/main.ts`).

## Tech Stack

### Shared Core
- **Language:** TypeScript 5.x (strict mode)
- **Audio Capture:** `node-record-lpcm16` (wraps sox)
- **Audio Encoding:** `lamejs` (MP3), custom WAV encoder
- **HTTP Client:** Axios
- **Form Data:** `form-data` (multipart/form-data for OpenAI-compatible APIs)

### VS Code Extension
- **Platform:** VS Code Extension API (compatible with Cursor)
- **Runtime:** Node.js (bundled with VS Code)
- **Build Tool:** Webpack 5.x
- **Config Storage:** VS Code Settings API
- **Secret Storage:** VS Code SecretStorage API
- **Distribution:** `.vsix` file from GitHub

### Desktop App (macOS)
- **Framework:** Electron
- **Tray/Menu:** Electron Tray API (no dock icon, `LSUIElement: true`)
- **Global Hotkey:** Electron `globalShortcut`
- **Paste Simulation:** `@nut-tree/nut-js` (clipboard + Cmd+V)
- **Config Storage:** `electron-store` (JSON file)
- **Secret Storage:** Electron `safeStorage` (macOS Keychain-backed encryption)
- **Build Tool:** Webpack 5.x
- **Packaging:** `electron-builder` (`.dmg` / `.app`)

### Infrastructure
- **CI/CD:** GitHub Actions
- **Testing:** Jest
- **No Backend:** Both targets are client-side only

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                    Shared Core (src/)                              │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Adapters   │  │    Audio     │  │        Types            │ │
│  │              │  │              │  │                         │ │
│  │ - Factory    │  │ - Manager    │  │ - Interfaces            │ │
│  │ - OpenAI     │  │ - Encoder   │  │ - Error classes         │ │
│  │              │  │ - Devices   │  │ - Config types          │ │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘ │
│  ┌──────────────────────────────┐                                 │
│  │   Config / Validation       │                                  │
│  │ - EndpointValidator         │                                  │
│  └──────────────────────────────┘                                 │
└────────────────────┬──────────────────────┬───────────────────────┘
                     │                      │
        ┌────────────▼──────────┐  ┌────────▼────────────────┐
        │  VS Code Extension   │  │  Electron Desktop App   │
        │                      │  │                          │
        │ - extension.ts       │  │ - main.ts                │
        │ - ConfigManager      │  │ - ConfigStore            │
        │   (vscode settings)  │  │   (electron-store)       │
        │ - Engine             │  │ - DesktopEngine          │
        │ - EditorService      │  │ - Paste (clipboard+V)    │
        │ - StatusBar          │  │ - Tray icon              │
        │ - Settings Panel     │  │ - Settings window        │
        │ - SecretStorage      │  │ - SecretStore            │
        │   (vscode secrets)   │  │   (safeStorage)          │
        └──────────┬───────────┘  └──────────┬───────────────┘
                   │                          │
                   └────────────┬─────────────┘
                                │
                                │ Audio (MP3/WAV)
                                │ HTTP Request
                                ▼
                   ┌─────────────────────────┐
                   │  STT Model Endpoint     │
                   │  (User Configured)      │
                   │                         │
                   │  - vLLM (local)         │
                   │  - Groq (cloud, free)   │
                   │  - OpenAI (cloud, paid) │
                   └─────────────────────────┘
```

## Project Structure

```
voice2code/
├── src/                          # Shared core (no VS Code deps)
│   ├── adapters/
│   │   ├── stt-adapter.ts        # STT adapter interface
│   │   ├── adapter-factory.ts    # URL-based provider detection
│   │   └── openai-whisper-adapter.ts  # OpenAI/Groq/vLLM
│   ├── audio/
│   │   ├── audio-manager.ts      # Mic capture via sox
│   │   ├── audio-encoder.ts      # PCM → MP3/WAV
│   │   └── device-manager.ts     # Device enumeration
│   ├── config/
│   │   ├── configuration-manager.ts  # VS Code-specific config
│   │   └── endpoint-validator.ts     # URL/model validation (shared)
│   ├── core/
│   │   ├── engine.ts             # VS Code recording orchestrator
│   │   ├── transcription-service.ts
│   │   └── editor-service.ts     # Text insertion (editor/terminal/clipboard)
│   ├── ui/
│   │   ├── status-bar-controller.ts
│   │   └── settings-panel.ts     # Webview settings
│   ├── network/
│   │   └── network-monitor.ts
│   └── types/
│       └── index.ts              # All shared interfaces
├── desktop/                      # Electron menu bar app
│   ├── package.json
│   ├── tsconfig.json
│   ├── webpack.config.js
│   ├── entitlements.plist
│   ├── assets/                   # Tray icons
│   └── src/
│       ├── main.ts               # Electron entry point
│       ├── config-store.ts       # electron-store config
│       ├── secret-store.ts       # safeStorage encryption
│       ├── tray.ts               # Tray icon + context menu
│       ├── hotkey.ts             # globalShortcut
│       ├── paste.ts              # Clipboard + Cmd+V
│       ├── desktop-engine.ts     # Recording state machine
│       ├── preload.ts            # IPC bridge
│       ├── settings-window.ts    # BrowserWindow
│       └── settings/
│           ├── settings.html
│           ├── settings.css
│           └── settings-renderer.ts
├── tests/                        # Extension tests
├── package.json                  # VS Code extension
├── webpack.config.js
└── README.md
```

## Component Responsibilities

### Shared Core (src/)

**Adapters** — Communicate with STT providers via HTTP.
- `AdapterFactory` creates the appropriate adapter based on endpoint URL
- `OpenAIWhisperAdapter` handles multipart/form-data for OpenAI, Groq, and vLLM

**Audio** — Capture and encode microphone input.
- `AudioManager` wraps `node-record-lpcm16` (spawns `rec`/`sox`)
- `AudioEncoder` converts raw PCM to MP3 (lamejs) or WAV
- `DeviceManager` enumerates audio devices per platform

**Types** — All shared TypeScript interfaces and error classes.

**Endpoint Validator** — URL format and model name validation.

### VS Code Extension (src/extension.ts)

- Registers commands (toggle recording, set API key, open settings, test connection)
- `ConfigurationManager` reads/writes VS Code settings and SecretStorage
- `Voice2CodeEngine` orchestrates: capture → encode → transcribe → insert
- `EditorService` inserts text at editor cursor → terminal → clipboard fallback
- `StatusBarController` shows recording state in VS Code status bar
- `SettingsPanelProvider` renders webview settings UI

### Desktop App (desktop/)

- `main.ts` wires all components, hides dock icon, checks accessibility permissions
- `ConfigStore` wraps `electron-store` with same interface as `ConfigurationManager`
- `SecretStore` encrypts API keys via `safeStorage` (macOS Keychain)
- `TrayManager` manages tray icon (idle/recording/processing) and context menu
- `HotkeyManager` registers global `Cmd+Shift+V` via `globalShortcut`
- `DesktopEngine` mirrors VS Code engine: capture → encode → transcribe → paste
- `pasteText()` saves clipboard → writes text → simulates Cmd+V → restores clipboard
- `SettingsWindow` shows BrowserWindow with config form

## Design Decisions

### Why Shared Core + Platform Shells?
- **DRY:** Audio capture, encoding, and STT communication are identical across both targets
- **Single source of truth:** Bug fixes in adapters/audio apply to both
- **Independent deployment:** Each target has its own build, packaging, and dependencies

### Why Electron for Desktop?
- **TypeScript/Node.js reuse:** All shared modules work directly, no porting needed
- **Built-in APIs:** `globalShortcut`, `clipboard`, `safeStorage`, `Tray`, `Notification`
- **Mature ecosystem:** `menubar`, `electron-store`, `electron-builder`
- **Trade-off:** Larger bundle (~200MB) and higher memory (~250MB) vs Tauri

### Why nut.js for Paste?
- `@nut-tree/nut-js` provides reliable keyboard simulation on macOS
- Required for pasting into any focused app (Ghostty, browser, etc.)
- Requires macOS Accessibility permission (prompted on first launch)

### Why electron-store + safeStorage?
- `electron-store` persists settings as JSON (simple, debuggable)
- `safeStorage` encrypts API keys via macOS Keychain (same security as VS Code SecretStorage)
- Clean separation: config in plain JSON, secrets encrypted

## Recording Flow

### VS Code Extension
```
Cmd+Shift+V → Engine.toggleRecording()
  → AudioManager.startCapture() → status bar: "Recording..."
Cmd+Shift+V → Engine.stopRecording()
  → AudioManager.stopCapture() → PCM buffer
  → AudioEncoder.encode(buffer, 'mp3') → MP3 buffer
  → AdapterFactory.createAdapter(url, apiKey) → adapter
  → adapter.transcribe(mp3, {model, language}) → {text}
  → EditorService.insertText(text) → editor / terminal / clipboard
```

### Desktop App
```
Cmd+Shift+V → globalShortcut → engine.toggleRecording()
  → AudioManager.startCapture() → tray icon: red
Cmd+Shift+V → globalShortcut → engine.toggleRecording()
  → AudioManager.stopCapture() → PCM buffer → tray icon: yellow
  → AudioEncoder.encode(buffer, 'mp3') → MP3 buffer
  → AdapterFactory.createAdapter(url, apiKey) → adapter
  → adapter.transcribe(mp3, {model, language}) → {text}
  → pasteText(text) → clipboard + Cmd+V into focused app
  → tray icon: idle
```

## Security Architecture

### Privacy-First Design
- No telemetry, no data collection
- Audio never written to disk, cleared from memory after use
- All processing on user-specified endpoints only

### Credential Security
- **VS Code:** SecretStorage API (OS keychain)
- **Desktop:** Electron safeStorage (macOS Keychain)
- Never logged, never in plain-text config files

### macOS Permissions (Desktop)
- **Microphone:** Standard OS prompt
- **Accessibility:** Required for nut.js keyboard simulation (prompted via `isTrustedAccessibilityClient`)
- **No network permissions:** Electron apps have unrestricted network by default

### Input Validation
- URL validation (only http/https protocols)
- Model name validation (alphanumeric + `/._-`, no path traversal `..`)
- API key redacted from all logs

## Performance Requirements

| Metric | Target |
|---|---|
| Recording start → visual feedback | <200ms |
| End-to-end latency (local model) | <2s |
| Text insertion | <50ms |
| Extension memory | <100MB |
| Desktop app memory (idle) | <250MB |
| Desktop app bundle | <300MB |

---

**Document Version:** 2.0
**Last Updated:** February 20, 2026
**Status:** Active - Updated for Desktop App
