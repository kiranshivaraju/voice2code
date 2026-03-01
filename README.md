# Voice2Code

Open-source speech-to-text for developers. Run models locally with vLLM or use cloud providers like Groq and OpenAI.

[![CI](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml/badge.svg)](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/kiranshivaraju/voice2code/branch/main/graph/badge.svg)](https://codecov.io/gh/kiranshivaraju/voice2code)

## Overview

Voice2Code enables developers to dictate code and documentation using speech-to-text models. Run Whisper locally with vLLM for full privacy, or connect to cloud providers like Groq (free) and OpenAI for a quick setup.

Available as a **macOS menu bar app** (system-wide) and a **VS Code/Cursor extension**.

### Key Features

- **Open Source**: Run your own STT models locally with vLLM
- **Cloud Support**: Also works with Groq (free tier) and OpenAI
- **Desktop App**: System-wide macOS menu bar app with auto-stop on silence
- **IDE Extension**: Seamless VS Code and Cursor integration
- **Voice Commands**: Built-in commands like "new line", "undo", "select all"
- **Transcription History**: Searchable history with copy support
- **Model Agnostic**: Works with any OpenAI-compatible STT endpoint

---

## Desktop App (macOS Menu Bar)

Voice2Code runs as a standalone macOS menu bar app, working system-wide across any application.

### Prerequisites

- **macOS** (Apple Silicon or Intel)
- **Node.js 20.x** or later — [Download](https://nodejs.org/)
- **sox** — audio capture backend

```bash
brew install sox
```

> If you don't have Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

### Desktop Installation

```bash
# Clone the repository
git clone https://github.com/kiranshivaraju/voice2code.git
cd voice2code/desktop

# Install dependencies
npm install

# Build the app
npm run build

# Run the app
npx electron dist/main.js
```

### Running the App

```bash
cd desktop
npm run build && npx electron dist/main.js
```

If already built, just run:

```bash
cd desktop
npx electron dist/main.js
```

### First Launch

1. A **welcome window** appears explaining how to use Voice2Code
2. A **mic icon** appears in your menu bar
3. Click it → **Settings** to configure your STT provider (see [Supported Providers](#supported-providers) below)
4. Click **Test Connection** to verify everything works
5. Close Settings and start dictating

### How It Works

1. **Press `Ctrl+Shift+Space`** to start recording (works in any app)
2. **Speak naturally** — recording auto-stops after 3 seconds of silence
3. **Text is pasted** into whichever app is focused

You can also press the hotkey again to stop recording manually.

> **Note:** On first use, macOS will ask for **Microphone** and **Accessibility** permissions. Grant both — microphone for audio capture, accessibility for pasting text into other apps.

### Tray Menu

Click the mic icon in the menu bar to access:

| Menu Item | Description |
|---|---|
| **Start / Stop Recording** | Toggle recording (shows `Ctrl+Shift+Space` hotkey) |
| **History** | View past transcriptions with timestamps |
| **Settings** | Configure endpoint, API key, audio device, language |
| **Test Connection** | Verify your STT endpoint is reachable |
| **Quit Voice2Code** | Exit the app |

### Settings Window

Configure via the Settings window (accessible from the tray menu):

- **Endpoint**: URL, model, language, timeout
- **API Key**: Stored securely via electron-store encryption
- **Audio**: Microphone device, format (MP3/WAV), sample rate
- Save & Test Connection buttons (auto-saves before testing)

### Voice Commands

When voice commands are enabled (default), these phrases are recognized:

| Voice Phrase | Action |
|---|---|
| "new line" | Insert line break |
| "tab" | Insert tab |
| "enter" | Press Enter |
| "backspace" / "delete" | Delete character |
| "select all" | Select all text |
| "undo" / "redo" | Undo/redo |
| "copy that" / "paste that" / "cut that" | Clipboard operations |
| "escape" | Press Escape |
| "space" | Insert space |

Custom commands can be added in Settings.

### Silence Detection

Recording auto-stops after 3 seconds of continuous silence. The SilenceDetector monitors raw 16-bit PCM audio chunks, calculates RMS amplitude, and emits a stop signal when silence is detected. The detector waits until it hears speech before starting the silence timer — so ambient quiet won't trigger a premature stop. Just stop talking and wait 3 seconds, or press the hotkey again to stop manually.

### Packaging for Distribution

```bash
cd desktop
npm run dist    # Creates .dmg for macOS
```

The app hides from the Dock (LSUIElement) and runs purely from the menu bar.

### Desktop Architecture

```
desktop/
├── src/
│   ├── main.ts              # Electron entry point, app lifecycle
│   ├── desktop-engine.ts    # Recording state machine (idle → recording → processing)
│   ├── tray.ts              # Menu bar tray icon and context menu
│   ├── silence-detector.ts  # RMS-based silence detection, auto-stop
│   ├── config-store.ts      # Persistent config via electron-store
│   ├── secret-store.ts      # Encrypted API key storage
│   ├── command-parser.ts    # Voice command detection
│   ├── command-executor.ts  # Keystroke execution via osascript
│   ├── paste.ts             # Clipboard paste via osascript
│   ├── hotkey.ts            # Global hotkey registration
│   ├── history-store.ts     # Transcription history persistence
│   ├── history-window.ts    # History BrowserWindow
│   ├── settings-window.ts   # Settings BrowserWindow with IPC handlers
│   ├── welcome-window.ts    # Welcome/onboarding BrowserWindow
│   ├── notification.ts      # macOS native notifications
│   ├── accessibility.ts     # Accessibility permission check
│   ├── preload.ts           # Context bridge for IPC
│   ├── settings/            # Settings UI (HTML/CSS/renderer)
│   ├── history/             # History UI (HTML/CSS/renderer)
│   └── welcome/             # Welcome UI (HTML/CSS/renderer)
├── tests/
│   ├── unit/                # Unit tests (TDD)
│   └── integration/         # Integration tests
├── assets/                  # Tray icons (template, recording, processing)
└── webpack.config.js        # 5 entry points (main, preload, 3 renderers)
```

Audio capture uses `node-record-lpcm16` wrapping `sox`/`rec` for raw 16-bit PCM at 16kHz mono. Text insertion uses `osascript` to simulate `Cmd+V` paste (macOS only).

### Error Handling

Errors during recording or transcription are shown as **macOS native notifications**, even if notifications are disabled in Settings. Common errors:

| Notification | Cause |
|---|---|
| **Authentication Failed** | API key is invalid, expired, or revoked |
| **Connection Failed** | STT endpoint is unreachable |
| **Connection Timed Out** | Endpoint took too long to respond |
| **Model Not Found** | Incorrect model name in Settings |
| **Rate Limited** | Too many requests (wait and retry) |
| **Recording Failed** | Microphone error or access denied |

---

## VS Code Extension

### Prerequisites

- macOS (or Linux with sox)
- Node.js 20.x or later
- VS Code 1.85.0 or later (or Cursor IDE)
- sox for audio capture: `brew install sox`

### Installation

```bash
# Clone the repository
git clone https://github.com/kiranshivaraju/voice2code.git
cd voice2code

# Install dependencies
npm install

# Build and package the extension
npm run compile
npm run package

# Install the .vsix file
code --install-extension voice2code-*.vsix
```

For Cursor, use `cursor --install-extension voice2code-*.vsix`, or open Extensions (Cmd+Shift+X) → click `...` → **Install from VSIX...** → select the `.vsix` file.

### Extension Configuration

1. Open Command Palette (Cmd+Shift+P) → "Voice2Code: Open Settings"
2. Set your endpoint URL and model
3. If using a cloud provider, set your API key: Cmd+Shift+P → "Voice2Code: Set API Key"
4. Click "Test Connection" to verify

### Extension Commands

| Command | Keyboard Shortcut | Description |
|---|---|---|
| `Voice2Code: Toggle Recording` | `Ctrl+Shift+V` / `Cmd+Shift+V` | Start/stop recording |
| `Voice2Code: Open Settings` | — | Open settings panel |
| `Voice2Code: Test Connection` | — | Verify endpoint connectivity |
| `Voice2Code: Set API Key` | — | Store API key securely |
| `Voice2Code: Delete API Key` | — | Remove stored API key |
| `Voice2Code: Show History` | — | View transcription history |

### Text Insertion (Extension)

Transcribed text is inserted wherever your cursor is:

- **Text editor** → inserted at cursor position
- **Terminal** → sent to active terminal
- **Extension panels** (Claude Code, search boxes, etc.) → pasted via clipboard

---

## Supported Providers

### 1. vLLM (Local, Free, Open Source)

Run Whisper models locally on your machine. No API key needed, full privacy.

```bash
pip install -U "vllm[audio]"
vllm serve openai/whisper-large-v3
```

| Setting | Value |
|---|---|
| **Endpoint URL** | `http://localhost:8000/v1/audio/transcriptions` |
| **Model** | `openai/whisper-large-v3` |
| **API Key** | Not required |

Available models: `openai/whisper-small`, `openai/whisper-large-v3`, `openai/whisper-large-v3-turbo`

> **Note:** vLLM has a 30-second audio limit per request. For normal voice dictation this is fine.

### 2. Groq (Cloud, Free Tier)

Fast cloud API with a free tier. No local setup needed.

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Configure:

| Setting | Value |
|---|---|
| **Endpoint URL** | `https://api.groq.com/openai/v1/audio/transcriptions` |
| **Model** | `whisper-large-v3` |
| **API Key** | Your Groq key (`gsk_...`) |

### 3. OpenAI (Cloud, Paid)

Uses OpenAI's Whisper API directly.

1. Get an API key at [platform.openai.com](https://platform.openai.com)
2. Configure:

| Setting | Value |
|---|---|
| **Endpoint URL** | `https://api.openai.com/v1/audio/transcriptions` |
| **Model** | `whisper-1` |
| **API Key** | Your OpenAI key (`sk-...`) |

### Provider Comparison

| Provider | Local | Free | Speed | Accuracy | Setup |
|---|---|---|---|---|---|
| **vLLM** | Yes | Yes | Medium | High | 10 min |
| **Groq** | No | Yes (free tier) | Very fast | High | 2 min |
| **OpenAI** | No | No ($0.006/min) | Fast | High | 2 min |

---

## Troubleshooting

**"No such recorder found: rec/sox"**
- Install sox: `brew install sox`

**Connection test fails**
- Verify your endpoint is running
- Check that your API key is set
- Ensure the endpoint URL is correct in settings

**Audio device not found**
- Ensure a microphone is connected
- On macOS: grant microphone permission when prompted

**`Ctrl+Shift+Space` conflict (Desktop)**
- Currently not configurable via UI; requires code change in `desktop/src/main.ts`

**Clipboard paste inserts wrong content**
- The app saves and restores your clipboard. A 200ms delay ensures macOS finishes pasting before restoration.

---

## Development

This project uses **ProdKit** for development workflow and **Speckit** for TDD.

### Tech Stack

#### Shared Core (`src/`)
- **Language**: TypeScript 5.x (strict mode)
- **Audio**: node-record-lpcm16 (wraps sox/rec)
- **HTTP**: Axios
- **Testing**: Jest

#### Desktop App (`desktop/`)
- **Framework**: Electron
- **Config**: electron-store
- **Build**: Webpack 5.x
- **Packaging**: electron-builder

#### Extension
- **Platform**: VS Code Extension API
- **Build**: Webpack 5.x

### Running Tests

```bash
# Extension tests
npm test

# Desktop tests
cd desktop && npm test

# Desktop tests in watch mode
cd desktop && npx jest --watch
```

### Building

```bash
# Desktop app
cd desktop && npm run build && npx electron dist/main.js

# VS Code extension
npm run compile && npm run package
```

### Project Structure

```
.
├── src/                      # Shared core (used by both extension and desktop)
│   ├── audio/                # Audio capture, encoding, device management
│   ├── config/               # Configuration and endpoint validation
│   ├── adapters/             # STT provider adapters (OpenAI-compatible)
│   └── types/                # TypeScript type definitions
├── desktop/                  # Electron desktop app (see Desktop Architecture above)
├── tests/                    # VS Code extension tests
├── product/                  # Product-level documentation
├── sprints/                  # Sprint-level documentation
└── .prodkit/                 # ProdKit framework
```

## ProdKit Workflow

This project uses ProdKit commands for structured development:

- `/prodkit.prd` - Create/update Product Requirements Document
- `/prodkit.product-arch` - Define technical architecture
- `/prodkit.plan-sprint` - Plan sprint features
- `/prodkit.sprint-tech` - Create technical specifications
- `/prodkit.create-issues` - Generate GitHub issues
- `/prodkit.dev` - Implement features using Speckit (TDD)
- `/prodkit.review` - Generate sprint retrospective

Sprint documentation lives in `sprints/v{N}/`.

## Security

- **Zero Telemetry**: No data collection
- **Privacy First**: Audio and transcriptions stay local (with vLLM)
- **HTTPS Enforced**: Warnings for unencrypted remote endpoints
- **Credential Storage**: API keys stored encrypted via electron-store (desktop) or VS Code SecretStorage (extension)
- **Input Validation**: All user inputs sanitized
- **CSP**: Content Security Policy on all renderer windows

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Support

- **Issues**: https://github.com/kiranshivaraju/voice2code/issues
- **Discussions**: https://github.com/kiranshivaraju/voice2code/discussions

## Acknowledgments

Built with:
- [Electron](https://www.electronjs.org)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [vLLM](https://docs.vllm.ai)
- [Groq](https://groq.com)
- [ProdKit](https://github.com/kiranshivaraju/prodkit)

---

**Generated with ProdKit** - Privacy-focused development for accessibility
