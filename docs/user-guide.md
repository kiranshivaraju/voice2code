# Voice2Code — User Guide

> Voice2Code is a speech-to-text tool for developers, available as a macOS menu bar desktop app and a VS Code/Cursor extension.

---

## Table of Contents

1. [Desktop App](#1-desktop-app)
2. [VS Code Extension](#2-vs-code-extension)
3. [Setting Up an STT Provider](#3-setting-up-an-stt-provider)
4. [Extension Settings Reference](#4-extension-settings-reference)
5. [FAQ](#5-faq)

---

## 1. Desktop App

### Installation

Prerequisites:
- macOS
- Node.js v20.18.1 or later
- sox: `brew install sox`

```bash
git clone https://github.com/kiranshivaraju/voice2code.git
cd voice2code/desktop
npm install
npm run build
npx electron dist/main.js
```

### Quick Start

1. A **welcome window** appears on launch explaining all features
2. Open **Settings** from the tray menu and configure your STT endpoint + API key
3. Click **Test Connection** to verify
4. Press **`Ctrl+Shift+Space`** to start recording
5. Speak naturally — recording **auto-stops after 3 seconds of silence**
6. Transcribed text is pasted into the focused app

### Hotkey

| Action | Shortcut |
|---|---|
| Start / Stop Recording | `Ctrl+Shift+Space` |

You can also use the tray menu to start/stop recording.

### Tray Menu

Click the mic icon in the menu bar:

- **Start / Stop Recording** — toggle with hotkey shown
- **History** — view past transcriptions with timestamps
- **Settings** — configure endpoint, API key, audio device
- **Test Connection** — verify STT endpoint connectivity
- **Quit Voice2Code** — exit the app

### Settings

Open Settings from the tray menu to configure:

- **Endpoint**: URL, model, language, timeout
- **API Key**: stored encrypted locally
- **Audio**: microphone device, format (MP3/WAV), sample rate

Settings are auto-saved before testing the connection.

### Voice Commands

When enabled (default), these phrases trigger keystrokes instead of text:

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

Custom commands can be defined in Settings.

### Silence Detection

Recording auto-stops after **3 seconds of continuous silence**. You don't need to press the hotkey to stop — just stop talking and wait. You can also press `Ctrl+Shift+Space` again to stop manually at any time.

---

## 2. VS Code Extension

### Installation

```bash
git clone https://github.com/kiranshivaraju/voice2code.git
cd voice2code
npm install
npm run compile
npm run package
code --install-extension voice2code-*.vsix
```

For Cursor: `cursor --install-extension voice2code-*.vsix`

### Usage

1. **Start recording**: Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (macOS)
2. **Speak** your code or text
3. **Stop recording**: Press the same shortcut again
4. **Text is inserted** at your cursor position

### Status Bar

| Icon | State |
|---|---|
| `$(mic) Voice2Code` | Idle — ready to record |
| `$(record) Voice2Code` | Recording (red) |
| `$(sync~spin) Voice2Code` | Processing (yellow) |

### Commands (Command Palette)

- **Voice2Code: Toggle Recording** — start or stop
- **Voice2Code: Test Connection** — verify endpoint
- **Voice2Code: Open Settings** — open settings
- **Voice2Code: Set API Key** — store API key securely
- **Voice2Code: Delete API Key** — remove stored key
- **Voice2Code: Show History** — view transcription history

---

## 3. Setting Up an STT Provider

Voice2Code works with any OpenAI-compatible STT endpoint.

### vLLM (Local, Free)

Run Whisper models locally. No data leaves your machine.

```bash
pip install -U "vllm[audio]"
vllm serve openai/whisper-large-v3
```

| Setting | Value |
|---|---|
| Endpoint URL | `http://localhost:8000/v1/audio/transcriptions` |
| Model | `openai/whisper-large-v3` |
| API Key | Not required |

### Groq (Cloud, Free Tier)

1. Get a free API key at [console.groq.com](https://console.groq.com)

| Setting | Value |
|---|---|
| Endpoint URL | `https://api.groq.com/openai/v1/audio/transcriptions` |
| Model | `whisper-large-v3` |
| API Key | Your Groq key (`gsk_...`) |

### OpenAI (Cloud, Paid)

1. Get an API key at [platform.openai.com](https://platform.openai.com)

| Setting | Value |
|---|---|
| Endpoint URL | `https://api.openai.com/v1/audio/transcriptions` |
| Model | `whisper-1` |
| API Key | Your OpenAI key (`sk-...`) |

---

## 4. Extension Settings Reference

All VS Code settings are under the `voice2code` namespace.

| Setting | Default | Description |
|---|---|---|
| `voice2code.endpoint.url` | `http://localhost:8000/v1/audio/transcriptions` | STT endpoint URL |
| `voice2code.endpoint.model` | `whisper-large-v3` | Model name |
| `voice2code.endpoint.timeout` | `30000` | Request timeout (ms) |
| `voice2code.audio.deviceId` | `default` | Audio input device |
| `voice2code.audio.sampleRate` | `16000` | Sample rate (Hz) |
| `voice2code.audio.format` | `mp3` | Audio format (`mp3` or `wav`) |

---

## 5. FAQ

**Q: Does Voice2Code send audio to the cloud?**
A: Only if you configure a cloud provider (Groq, OpenAI). With vLLM, all processing is local.

**Q: Why does recording fail immediately?**
A: Check that your microphone is connected, OS permission is granted, and `sox` is installed (`brew install sox`).

**Q: What audio format should I use?**
A: `mp3` (default) works with all providers. Use `wav` if your provider requires uncompressed audio.

**Q: What languages does Voice2Code support?**
A: Whatever your STT model supports. Whisper supports 99+ languages.

**Q: How do I report a bug?**
A: Open an issue at [github.com/kiranshivaraju/voice2code/issues](https://github.com/kiranshivaraju/voice2code/issues).

---

*See also: [README](../README.md)*
