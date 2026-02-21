# Product Requirements Document

## Product Overview

**Product Name:** Voice2Code

**Version:** 2.0

**Date:** February 20, 2026

**Author:** Product Team

## Problem Statement

Developers and content creators face several challenges with text input:

1. **Accessibility Barriers:** Users with physical disabilities or conditions like RSI struggle with traditional keyboard input
2. **Productivity Constraints:** Typing can be slower than speaking, creating bottlenecks in workflow
3. **Fatigue and Health:** Extended typing sessions lead to hand/wrist fatigue and long-term health issues
4. **IDE Lock-in:** Existing voice-to-text developer tools only work inside specific IDEs, leaving terminals (Ghostty, iTerm2), browsers, and other apps unsupported
5. **Privacy Concerns:** Cloud-based speech-to-text solutions send sensitive code to third-party servers
6. **Limited Control:** Developers cannot customize or choose their preferred STT models

Voice2Code solves these problems in two ways:
- **VS Code/Cursor Extension:** Speech-to-text directly in the IDE
- **macOS Desktop App:** System-wide speech-to-text that works in any application — terminals, browsers, text editors, and more

## Target Users

### Primary User Segments

1. **Software Developers**
   - Professional developers who code daily
   - Need hands-free input across IDEs, terminals, and browsers
   - Value privacy and want to keep code local

2. **Terminal-First Developers**
   - Users who primarily work in terminal emulators (Ghostty, iTerm2, Kitty)
   - Need voice input that works outside IDEs
   - Cannot install IDE extensions in their workflow

3. **Users with Accessibility Needs**
   - Developers with physical disabilities, RSI, or carpal tunnel
   - Require alternative input methods across all applications
   - Need a consistent experience everywhere, not just in one IDE

4. **Content Creators & Technical Writers**
   - Documentation writers working in markdown editors, browsers, Notion, etc.
   - Need voice input that works in any text field

## Product Vision

**Short-term (3-6 months):**
Voice2Code becomes a system-wide speech-to-text tool for macOS developers. Available as both a VS Code/Cursor extension and a standalone menu bar app, it works in any application using open-source local models (vLLM) or cloud providers (Groq, OpenAI).

**Long-term (1+ year):**
Voice2Code evolves into an intelligent voice coding assistant with voice commands, custom vocabulary, and multi-platform support (macOS, Linux, Windows). It becomes the go-to open-source speech-to-text tool for the developer community.

## Value Proposition

- **Works Everywhere:** Not just IDEs — terminals, browsers, any app on macOS
- **Open Source:** Run your own STT models locally with vLLM, or use Groq/OpenAI
- **Single Hotkey:** Press Cmd+Shift+V to record, press again to transcribe and paste
- **Privacy-First:** Local models mean your audio never leaves your machine
- **Developer-Built:** Designed for developers, by developers

## Success Metrics

### Key Performance Indicators (KPIs)

1. **User Adoption**
   - 500+ GitHub stars in first 6 months
   - 100+ active monthly users by month 3

2. **Transcription Quality**
   - >95% word accuracy (model-dependent)
   - <2s end-to-end latency (speech end → text inserted)

3. **User Satisfaction**
   - 4.5+ star rating on GitHub
   - <5% uninstall rate for desktop app

4. **Community Growth**
   - 10+ community contributors by month 6
   - Active issue tracker with bug reports and feature requests

## Features

### Feature 1: System-Wide Voice Input (Desktop App)
- **Description:** macOS menu bar app that captures speech and pastes transcribed text into any focused application
- **User Story:** As a developer, I want to dictate text into any app (Ghostty, browser, VS Code) using a global hotkey so that I'm not limited to IDE extensions
- **Priority:** Critical
- **Acceptance Criteria:**
  - Menu bar tray icon (no dock icon)
  - Global hotkey (Cmd+Shift+V) works when app is not focused
  - Transcribed text pasted into whatever app is focused via clipboard + Cmd+V
  - Tray icon changes to indicate state (idle/recording/processing)
  - macOS notifications for errors
- **Dependencies:** None

### Feature 2: Model Configuration
- **Description:** Users can configure STT model endpoints (local vLLM or cloud Groq/OpenAI)
- **User Story:** As a developer, I want to configure my STT provider so that I can use local models for privacy or cloud models for convenience
- **Priority:** Critical
- **Acceptance Criteria:**
  - Support OpenAI-compatible endpoints (vLLM, Groq, OpenAI)
  - Endpoint URL, model name, and API key configuration
  - Validate endpoint connectivity with "Test Connection"
  - Settings persist across app restarts
- **Dependencies:** None

### Feature 3: Voice Input Toggle (IDE Extension)
- **Description:** Keyboard shortcut to toggle voice recording on/off inside VS Code/Cursor
- **User Story:** As a VS Code user, I want to press a shortcut to start/stop recording so that I can dictate directly into my editor
- **Priority:** Critical
- **Acceptance Criteria:**
  - Keyboard shortcut (Cmd+Shift+V) to toggle recording
  - Status bar indicator showing recording state
  - Text inserted at cursor position, terminal, or clipboard fallback
- **Dependencies:** Feature 2

### Feature 4: Text Insertion at Cursor (IDE Extension)
- **Description:** Transcribed text is inserted at the current cursor position in the active editor, terminal, or extension panel
- **User Story:** As a developer, I want transcribed text to appear where my cursor is so that voice input feels seamless
- **Priority:** Critical
- **Acceptance Criteria:**
  - Insert at active text editor cursor position
  - Fallback to active terminal (sendText)
  - Fallback to clipboard + paste (for extension panels like Claude Code)
  - Support multi-cursor editing
- **Dependencies:** Feature 3

### Feature 5: Secure API Key Management
- **Description:** Securely store API keys for cloud STT providers
- **User Story:** As a user of Groq/OpenAI, I want to securely store my API key so that I don't have to enter it every time
- **Priority:** Critical
- **Acceptance Criteria:**
  - Desktop app: encrypted storage via macOS Keychain (Electron safeStorage)
  - IDE extension: encrypted storage via VS Code SecretStorage
  - Set and delete API key commands
  - API key never logged or exposed in settings files
- **Dependencies:** Feature 2

### Feature 6: Settings UI
- **Description:** Visual settings panel for configuring all options
- **User Story:** As a user, I want a settings UI so that I can configure the extension without editing JSON files
- **Priority:** High
- **Acceptance Criteria:**
  - Desktop app: native settings window from tray menu
  - IDE extension: webview settings panel
  - Fields: endpoint URL, model, API key, audio format, language
  - Test Connection button
- **Dependencies:** Feature 2, 5

### Feature 7: Audio Device Selection
- **Description:** Users can select which microphone to use
- **User Story:** As a user with multiple microphones, I want to choose which one to use for better audio quality
- **Priority:** High
- **Dependencies:** Feature 1 or 3

### Feature 8: Error Handling & Notifications
- **Description:** Clear error messages and status feedback for all operations
- **User Story:** As a user, I want to know when something goes wrong so that I can troubleshoot
- **Priority:** High
- **Acceptance Criteria:**
  - Desktop app: macOS notifications for errors
  - IDE extension: status bar + VS Code notifications
  - Actionable error messages (e.g., "Cannot connect to endpoint. Check URL and try again.")
- **Dependencies:** All features

### Feature 9: Voice Commands
- **Description:** Recognize spoken commands beyond dictation (e.g., "select all", "undo", "new line")
- **User Story:** As a power user, I want to control my editor with voice commands so that I can work completely hands-free
- **Priority:** Medium
- **Acceptance Criteria:**
  - Detect command keywords in transcribed text
  - Map commands to IDE/OS actions
  - Configurable command vocabulary
  - Works in both desktop app and IDE extension
- **Dependencies:** Feature 1, 3

### Feature 10: Transcription History
- **Description:** Log of past transcriptions with ability to re-paste or copy
- **User Story:** As a user, I want to see my recent transcriptions so that I can re-use previous dictations
- **Priority:** Medium
- **Acceptance Criteria:**
  - Store last 50 transcriptions
  - Searchable history panel
  - Re-insert previous transcription
  - Clear history option
- **Dependencies:** Feature 1, 3

### Feature 11: Multi-Language Support
- **Description:** Switch between spoken languages based on model capabilities
- **User Story:** As a non-English developer, I want to dictate in my native language
- **Priority:** Low
- **Dependencies:** Feature 2

## User Workflows

### Workflow 1: Desktop App — Dictate into Ghostty Terminal
1. Voice2Code menu bar app is running (tray icon visible)
2. User opens Ghostty terminal
3. User presses Cmd+Shift+V — tray icon turns red (recording)
4. User speaks: "git commit -m fix authentication bug"
5. User presses Cmd+Shift+V again — tray icon turns yellow (processing)
6. Audio is sent to configured STT provider
7. Transcribed text is pasted into Ghostty via clipboard + Cmd+V
8. Tray icon returns to idle

### Workflow 2: Desktop App — Dictate into Browser
1. User is typing in a browser text field (GitHub PR description, Slack, etc.)
2. User presses Cmd+Shift+V, speaks, presses again
3. Text appears in the browser text field

### Workflow 3: IDE Extension — Dictate Code
1. User opens a code file in VS Code
2. User positions cursor where they want to insert text
3. User presses Cmd+Shift+V to start recording
4. User speaks their code or documentation
5. User presses Cmd+Shift+V to stop
6. Transcribed text is inserted at cursor position

### Workflow 4: Initial Setup (Desktop App)
1. User clones Voice2Code repo and builds the desktop app
2. User launches the .app — tray icon appears in menu bar
3. User clicks tray icon → Settings
4. User configures endpoint URL (e.g., `http://localhost:8000/v1/audio/transcriptions` for vLLM)
5. User sets model name (e.g., `openai/whisper-large-v3`)
6. User clicks "Test Connection" — success
7. User closes settings — ready to dictate

### Workflow 5: Switching Between Local and Cloud
1. User normally uses local vLLM but is on a laptop without GPU
2. User opens Settings, changes endpoint to Groq URL
3. User sets API key for Groq
4. User clicks Test Connection — success
5. Continues dictating using cloud provider

## Out of Scope

1. **Text-to-Speech (TTS)** — Voice2Code only does speech-to-text
2. **AI Code Completion/Generation** — Not competing with Copilot; only transcription
3. **Cloud Hosting of Models** — Users bring their own endpoints
4. **Custom Model Training** — Users use pre-trained models
5. **Real-time Collaboration** — No shared voice sessions
6. **Windows/Linux Desktop App** — macOS only for initial release (IDE extension works cross-platform)
7. **App Store Distribution** — Distributed via GitHub only for now

## Constraints

### Technical Constraints
- Desktop app requires macOS (Electron)
- Desktop app requires Accessibility permissions for paste simulation
- System dependency on `sox` for audio capture (`brew install sox`)
- vLLM has a 30-second audio limit per request

### Platform Constraints
- Desktop app: macOS only (initial release)
- IDE extension: VS Code and Cursor

### Privacy Constraints
- Zero telemetry by default
- No audio or transcription data collection
- All processing on user-specified endpoints

### Resource Constraints
- Small team (1-2 developers)
- Open-source community contributions welcome

## Roadmap (High-Level)

### Phase 1: MVP (Sprint v1-v2) — Completed
**Goal:** Working VS Code/Cursor extension with local and cloud STT support

**Delivered:**
- Model configuration (vLLM, Groq, OpenAI)
- Voice input toggle (Cmd+Shift+V)
- Text insertion (editor, terminal, clipboard fallback)
- API key management
- Settings panel webview
- Audio encoding pipeline (PCM → MP3)
- Error handling and status bar feedback

### Phase 2: Desktop App (Sprint v3-v4) — Current
**Goal:** System-wide macOS menu bar app

**Features:**
- Feature 1: System-wide voice input (Electron menu bar app)
- Feature 2: Model configuration (electron-store)
- Feature 5: Secure API key storage (safeStorage)
- Feature 6: Settings window
- Feature 8: macOS notifications for errors

**Success Criteria:**
- App works in Ghostty, browsers, and any macOS app
- Same STT providers as IDE extension (vLLM, Groq, OpenAI)
- Installable from GitHub

### Phase 3: Enhanced Features (Sprint v5-v6)
**Goal:** Voice commands and transcription history

**Features:**
- Feature 9: Voice commands
- Feature 10: Transcription history
- Feature 7: Audio device selection UI

### Phase 4: Community Growth (Sprint v7+)
**Goal:** Multi-platform and ecosystem growth

**Potential Features:**
- Linux desktop app
- Custom vocabulary / dictionary
- Noise cancellation
- Code-aware dictation
- Community plugin system

## Appendix

### Supported STT Providers

| Provider | Type | Free | Setup |
|---|---|---|---|
| **vLLM** | Local (open source) | Yes | `pip install -U "vllm[audio]"` then `vllm serve openai/whisper-large-v3` |
| **Groq** | Cloud | Yes (free tier) | Get API key at console.groq.com |
| **OpenAI** | Cloud | No ($0.006/min) | Get API key at platform.openai.com |

### Technology Stack

| Component | Technology |
|---|---|
| IDE Extension | VS Code Extension API, TypeScript |
| Desktop App | Electron, TypeScript |
| Audio Capture | sox via node-record-lpcm16 |
| Audio Encoding | lamejs (MP3), custom WAV encoder |
| STT Communication | axios, OpenAI-compatible API |
| Config Storage | electron-store (desktop), VS Code settings (extension) |
| Secret Storage | Electron safeStorage (desktop), VS Code SecretStorage (extension) |
| Paste Simulation | @nut-tree/nut-js (desktop) |

### User Personas

**Persona 1: Sarah — Accessibility-Focused Developer**
- Senior Software Engineer with RSI
- Needs reliable voice input across all apps, not just VS Code
- Uses Ghostty terminal + VS Code daily
- Values: accuracy, reliability, works everywhere

**Persona 2: Alex — Terminal-First Developer**
- Full-stack developer who lives in the terminal
- Uses Ghostty with tmux, rarely opens VS Code
- Wants voice input without installing an IDE extension
- Values: speed, minimal footprint, keyboard-driven

**Persona 3: Priya — Privacy-Conscious Developer**
- Works at a security company with strict data policies
- Cannot send audio to cloud services
- Runs vLLM locally on a GPU workstation
- Values: privacy, local-first, open source

---

**Document Status:** v2.0 — Updated for Desktop App
**Next Steps:** Run `/prodkit.product-arch` to define technical architecture for the desktop app
