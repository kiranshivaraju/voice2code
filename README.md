# Voice2Code

Open-source speech-to-text for macOS. Dictate into any app from your menu bar — powered by Whisper models via Groq, OpenAI, or self-hosted vLLM.

[![CI](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml/badge.svg)](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/kiranshivaraju/voice2code/branch/main/graph/badge.svg)](https://codecov.io/gh/kiranshivaraju/voice2code)

## Overview

Voice2Code is a macOS menu bar app that lets you dictate text into any application using speech-to-text. Press a hotkey, speak, and the transcribed text is pasted wherever your cursor is. Recording auto-stops when you stop talking.

Use Groq (free) or OpenAI for instant setup, or run Whisper locally with vLLM for full privacy.

### Key Features

- **System-wide** — works in any app (editors, browsers, terminals, Slack, etc.)
- **Auto-stop on silence** — just stop talking, no need to press a button
- **Voice commands** — "new line", "undo", "select all", and more
- **Transcription history** — searchable history with timestamps
- **Model agnostic** — works with any OpenAI-compatible STT endpoint
- **Open source** — run your own models locally with vLLM for full privacy

---

## Prerequisites

- **macOS** (Apple Silicon or Intel)
- **Node.js 20.x** or later — [Download](https://nodejs.org/)
- **sox** — audio capture backend

```bash
brew install sox
```

> If you don't have Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

## Installation

```bash
git clone https://github.com/kiranshivaraju/voice2code.git
cd voice2code/desktop
npm install
npm run build
```

## Running the App

```bash
cd voice2code/desktop
npx electron dist/main.js
```

If you've made code changes, rebuild first:

```bash
npm run build && npx electron dist/main.js
```

## First Launch

1. A **welcome window** appears explaining how to use Voice2Code
2. A **mic icon** appears in your menu bar
3. macOS will ask for **Microphone** and **Accessibility** permissions — grant both
4. Click the mic icon → **Settings** to configure your STT provider (see [Supported Providers](#supported-providers))
5. Click **Test Connection** to verify
6. Close Settings and start dictating

## How It Works

1. **Press `Ctrl+Shift+Space`** to start recording (works in any app)
2. **Speak naturally** — recording auto-stops after 3 seconds of silence
3. **Text is pasted** into whichever app is focused

Press the hotkey again to stop recording manually at any time.

---

## Tray Menu

Click the mic icon in the menu bar:

| Menu Item | Description |
|---|---|
| **Start / Stop Recording** | Toggle recording (`Ctrl+Shift+Space`) |
| **History** | View past transcriptions with timestamps |
| **Settings** | Configure endpoint, API key, audio device, language |
| **Test Connection** | Verify your STT endpoint is reachable |
| **Quit Voice2Code** | Exit the app |

## Settings

Configure via the Settings window (accessible from the tray menu):

- **Endpoint**: URL, model, language, timeout
- **API Key**: Stored securely via electron-store encryption
- **Audio**: Microphone device, format (MP3/WAV), sample rate
- Save & Test Connection buttons (auto-saves before testing)

## Voice Commands

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

## Silence Detection

Recording auto-stops after 3 seconds of continuous silence. The detector waits until it hears speech before starting the silence timer — so ambient quiet won't trigger a premature stop. Just stop talking and wait 3 seconds, or press the hotkey again to stop manually.

## Error Handling

Errors are shown as **macOS native notifications**, even if notifications are disabled in Settings:

| Notification | Cause |
|---|---|
| **Authentication Failed** | API key is invalid, expired, or revoked |
| **Connection Failed** | STT endpoint is unreachable |
| **Connection Timed Out** | Endpoint took too long to respond |
| **Model Not Found** | Incorrect model name in Settings |
| **Rate Limited** | Too many requests (wait and retry) |
| **Recording Failed** | Microphone error or access denied |

---

## Supported Providers

### 1. Groq (Cloud, Free Tier) — Recommended

Fast cloud API with a free tier. No local setup needed.

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Configure in Settings:

| Setting | Value |
|---|---|
| **Endpoint URL** | `https://api.groq.com/openai/v1/audio/transcriptions` |
| **Model** | `whisper-large-v3` |
| **API Key** | Your Groq key (`gsk_...`) |

### 2. OpenAI (Cloud, Paid)

Uses OpenAI's Whisper API directly.

1. Get an API key at [platform.openai.com](https://platform.openai.com)
2. Configure in Settings:

| Setting | Value |
|---|---|
| **Endpoint URL** | `https://api.openai.com/v1/audio/transcriptions` |
| **Model** | `whisper-1` |
| **API Key** | Your OpenAI key (`sk-...`) |

### 3. vLLM (Local, Free, Open Source)

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

### Provider Comparison

| Provider | Local | Free | Speed | Accuracy | Setup |
|---|---|---|---|---|---|
| **Groq** | No | Yes (free tier) | Very fast | High | 2 min |
| **OpenAI** | No | No ($0.006/min) | Fast | High | 2 min |
| **vLLM** | Yes | Yes | Medium | High | 10 min |

---

## Troubleshooting

**"No such recorder found: rec/sox"**
- Install sox: `brew install sox`

**Connection test fails**
- Verify your endpoint is running
- Check that your API key is set correctly in Settings
- Ensure the endpoint URL is correct

**Audio device not found**
- Ensure a microphone is connected
- Grant microphone permission when macOS prompts

**`Ctrl+Shift+Space` doesn't work**
- Another app may be using the same shortcut
- Currently not configurable via UI; requires code change in `desktop/src/main.ts`

**Clipboard paste inserts wrong content**
- The app saves and restores your clipboard. A 200ms delay ensures macOS finishes pasting before restoration.

**Recording stops too quickly**
- The silence detector auto-stops after 3 seconds of quiet. If your mic picks up very low levels, speech may be misclassified as silence. Check your mic input level in System Settings > Sound.

---

## Packaging for Distribution

```bash
cd desktop
npm run dist    # Creates .dmg for macOS
```

The app hides from the Dock (LSUIElement) and runs purely from the menu bar.

---

## Development

### Tech Stack

- **Framework**: Electron
- **Language**: TypeScript 5.x (strict mode)
- **Audio**: node-record-lpcm16 (wraps sox/rec)
- **Config**: electron-store (encrypted API key storage)
- **Build**: Webpack 5.x
- **Packaging**: electron-builder
- **Testing**: Jest (TDD)
- **HTTP**: Axios

### Running Tests

```bash
cd desktop
npm test

# Watch mode
npx jest --watch
```

### Project Structure

```
voice2code/
├── desktop/                    # Electron desktop app
│   ├── src/
│   │   ├── main.ts             # App entry point, lifecycle
│   │   ├── desktop-engine.ts   # Recording state machine (idle → recording → processing)
│   │   ├── tray.ts             # Menu bar tray icon and context menu
│   │   ├── silence-detector.ts # RMS-based silence detection, auto-stop
│   │   ├── config-store.ts     # Persistent config via electron-store
│   │   ├── secret-store.ts     # Encrypted API key storage
│   │   ├── command-parser.ts   # Voice command detection
│   │   ├── command-executor.ts # Keystroke execution via osascript
│   │   ├── paste.ts            # Clipboard paste via osascript
│   │   ├── notification.ts     # macOS native notifications
│   │   ├── preload.ts          # Context bridge for IPC
│   │   ├── settings/           # Settings UI (HTML/CSS/renderer)
│   │   ├── history/            # History UI (HTML/CSS/renderer)
│   │   └── welcome/            # Welcome UI (HTML/CSS/renderer)
│   ├── tests/
│   │   ├── unit/               # Unit tests (TDD)
│   │   └── integration/        # Integration tests
│   └── assets/                 # Tray icons
├── src/                        # Shared core
│   ├── audio/                  # Audio capture, encoding, device management
│   ├── adapters/               # STT provider adapters (OpenAI-compatible)
│   ├── config/                 # Endpoint validation
│   └── types/                  # TypeScript type definitions
└── docs/                       # Documentation
```

## Security

- **Zero Telemetry**: No data collection
- **Privacy First**: Audio and transcriptions stay local (with vLLM)
- **HTTPS Enforced**: Warnings for unencrypted remote endpoints
- **Credential Storage**: API keys stored encrypted via electron-store
- **Input Validation**: All user inputs sanitized
- **CSP**: Content Security Policy on all renderer windows

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Support

- **Issues**: https://github.com/kiranshivaraju/voice2code/issues
- **Discussions**: https://github.com/kiranshivaraju/voice2code/discussions
