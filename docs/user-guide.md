# Voice2Code — User Guide

> Version 0.1.0 · Sprint v1

Voice2Code is a privacy-focused speech-to-text VS Code extension that lets you dictate code and documentation directly into your editor using local or self-hosted AI models.

---

## Table of Contents

1. [Installation](#1-installation)
2. [Setting Up a Local STT Backend](#2-setting-up-a-local-stt-backend)
3. [Configuring Voice2Code](#3-configuring-voice2code)
4. [Using the Extension](#4-using-the-extension)
5. [Keyboard Shortcuts](#5-keyboard-shortcuts)
6. [Settings Reference](#6-settings-reference)
7. [API Key Configuration (SecretStorage)](#7-api-key-configuration-secretstorage)
8. [FAQ](#8-faq)

---

## 1. Installation

### From a VSIX File

If you have a `.vsix` package (e.g., downloaded from a release or built locally):

```bash
code --install-extension voice2code-0.1.0.vsix
```

Or from inside VS Code:
1. Open the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Click the `···` menu (top-right of the panel)
3. Select **Install from VSIX...**
4. Choose the `.vsix` file

### Building from Source

Prerequisites:
- Node.js **v20.18.1 or later** (v18 is not supported)
- npm

```bash
git clone https://github.com/kiranshivaraju/voice2code.git
cd voice2code

npm install
npm run compile
npm run package        # creates voice2code-0.1.0.vsix

code --install-extension voice2code-0.1.0.vsix
```

### Cursor IDE

1. Open Extensions (`Ctrl+Shift+X`)
2. Click `···` → **Install from VSIX...**
3. Select the `.vsix` file

All features work identically in Cursor.

---

## 2. Setting Up a Local STT Backend

Voice2Code is model-agnostic. You can use any STT provider that exposes an HTTP API.

### Option A: Ollama (Recommended for Privacy)

Ollama runs Whisper models locally. No data leaves your machine.

```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull the Whisper model
ollama pull whisper

# 3. Start Ollama (runs automatically after install)
ollama serve
```

Verify it's running:
```bash
curl http://localhost:11434
# Expected: {"status":"Ollama is running"}
```

Configure Voice2Code:
- **Endpoint URL:** `http://localhost:11434/api/transcribe`
- **Model:** `whisper`

### Option B: vLLM (GPU-accelerated, Self-hosted)

vLLM provides an OpenAI-compatible API with GPU acceleration.

```bash
# 1. Install vLLM
pip install vllm

# 2. Start the server with Whisper
python -m vllm.entrypoints.openai.api_server \
  --model openai/whisper-large-v3 \
  --port 8000
```

Verify it's running:
```bash
curl http://localhost:8000/health
```

Configure Voice2Code:
- **Endpoint URL:** `http://localhost:8000/v1/audio/transcriptions`
- **Model:** `whisper-large-v3`
- **API Key:** Set your vLLM API key in SecretStorage (see [Section 7](#7-api-key-configuration-secretstorage))

### Option C: OpenAI Whisper API (Cloud)

For convenience, Voice2Code supports OpenAI's hosted Whisper API.

> Note: This sends audio to OpenAI servers. Use only if privacy is not a concern.

Configure Voice2Code:
- **Endpoint URL:** `https://api.openai.com/v1/audio/transcriptions`
- **Model:** `whisper-1`
- **API Key:** Set your OpenAI API key in SecretStorage (see [Section 7](#7-api-key-configuration-secretstorage))

---

## 3. Configuring Voice2Code

### Via VS Code Settings UI

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for `voice2code`
3. All settings appear under **Voice2Code**

### Via settings.json

Add to your VS Code `settings.json` (`Ctrl+Shift+P` → "Open User Settings (JSON)"):

```json
{
  "voice2code.endpoint.url": "http://localhost:11434/api/transcribe",
  "voice2code.endpoint.model": "whisper",
  "voice2code.endpoint.timeout": 30000,
  "voice2code.audio.deviceId": "default",
  "voice2code.audio.sampleRate": 16000,
  "voice2code.audio.format": "mp3",
  "voice2code.ui.showStatusBar": true
}
```

### Testing Your Setup

After configuring, run:

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type `Voice2Code: Test Connection`
3. Press Enter

You'll see a success or failure notification. If it fails, check that your STT backend is running and the endpoint URL is correct.

---

## 4. Using the Extension

### Basic Dictation Workflow

1. **Open a file** in the editor (any language)
2. **Position your cursor** where you want text inserted
3. **Start recording**: Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (macOS)
   - The status bar shows `$(record) Voice2Code` (red icon)
4. **Speak** your code or text clearly
5. **Stop recording**: Press the same shortcut again
   - The status bar shows `$(sync~spin) Voice2Code` while processing
6. **Text is inserted** at the cursor position

### Status Bar Indicator

The status bar (bottom-right) shows the current state:

| Icon | State | Meaning |
|---|---|---|
| `$(mic) Voice2Code` | Idle | Ready to record |
| `$(record) Voice2Code` | Recording | Capturing audio (red) |
| `$(sync~spin) Voice2Code` | Processing | Transcribing audio (yellow) |

### Recording Tips

- Speak at a normal pace — pausing briefly between phrases improves accuracy
- Dictate punctuation explicitly: "function foo open paren close paren"
- For code symbols: "equals equals equals", "greater than", "less than or equal to"
- Background noise reduces accuracy — use a headset for best results

### Commands Available via Command Palette

Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type `Voice2Code`:

- **Voice2Code: Start Recording** — Begin audio capture
- **Voice2Code: Stop Recording** — End recording and transcribe
- **Voice2Code: Toggle Recording** — Start or stop (same command)
- **Voice2Code: Test Connection** — Test your STT endpoint
- **Voice2Code: Open Settings** — Jump to Voice2Code settings

---

## 5. Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|---|---|---|
| Toggle Recording | `Ctrl+Shift+V` | `Cmd+Shift+V` |

### Customising the Shortcut

1. Open Keyboard Shortcuts (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S`)
2. Search for `voice2code.toggleRecording`
3. Click the pencil icon to edit
4. Press your desired key combination

---

## 6. Settings Reference

All settings are under the `voice2code` namespace.

### Endpoint Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `voice2code.endpoint.url` | string | `http://localhost:11434/api/transcribe` | STT endpoint URL |
| `voice2code.endpoint.model` | string | `whisper-large-v3` | Model name sent in requests |
| `voice2code.endpoint.timeout` | number | `30000` | Request timeout in milliseconds (1000–300000) |

### Audio Settings

| Setting | Type | Default | Options | Description |
|---|---|---|---|---|
| `voice2code.audio.deviceId` | string | `default` | — | Audio input device ID |
| `voice2code.audio.sampleRate` | number | `16000` | — | Sample rate in Hz |
| `voice2code.audio.format` | string | `mp3` | `mp3`, `wav` | Audio encoding format |

### UI Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `voice2code.ui.showStatusBar` | boolean | `true` | Show status bar indicator |
| `voice2code.ui.previewEnabled` | boolean | `true` | Show transcription preview before insertion |
| `voice2code.ui.audioFeedback` | boolean | `true` | Play audio feedback on start/stop |

### History Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `voice2code.history.enabled` | boolean | `false` | Enable transcription history |
| `voice2code.history.maxItems` | number | `50` | Maximum history items to store |

---

## 7. API Key Configuration (SecretStorage)

For providers that require authentication (vLLM with auth, OpenAI), Voice2Code uses VS Code's SecretStorage to store API keys securely. Keys are encrypted at rest and never written to settings files.

> In v0.1.0, API key entry is handled automatically when a request requires authentication. The key is stored under `voice2code.apiKey` in VS Code SecretStorage.

To clear a stored key:
1. Open Command Palette
2. Run `Developer: Clear All Storage` (this clears all extension secret storage)

Or manage via the VS Code SecretStorage API directly if you are a developer.

---

## 8. FAQ

**Q: Does Voice2Code send audio to the cloud?**

A: Only if you configure it to. When using Ollama or a local vLLM instance, all audio is processed on your machine. For OpenAI Whisper API, audio is sent to OpenAI servers.

**Q: Why does recording fail immediately?**

A: The extension may not be able to access your microphone. Check:
- Microphone is connected and not muted
- OS-level microphone permission is granted (especially macOS)
- On Linux: `sox` is installed (`sudo apt-get install sox`)

**Q: What audio format should I use?**

A: `mp3` (default) works with all supported providers. Use `wav` if your provider requires uncompressed audio.

**Q: The status bar doesn't show Voice2Code — where is it?**

A: Ensure `voice2code.ui.showStatusBar` is `true`. If the status bar is crowded, right-click the status bar to manage which items are shown.

**Q: Can I use Voice2Code with multiple projects (different endpoints per project)?**

A: Yes — configure `voice2code.endpoint.url` at **Workspace** scope (not Global) in your project's `.vscode/settings.json`. This lets each project use a different STT backend.

**Q: What languages does Voice2Code support?**

A: Voice2Code transcribes to whatever language your STT model supports. Whisper supports 99+ languages. The extension itself inserts text and is language-agnostic.

**Q: How do I report a bug?**

A: Open an issue at [https://github.com/kiranshivaraju/voice2code/issues](https://github.com/kiranshivaraju/voice2code/issues) with:
- VS Code version
- Node.js version
- STT provider and model
- Steps to reproduce
- Error output from VS Code Developer Tools (`Help → Toggle Developer Tools`)

---

*See also: [Cross-Platform Testing Results](platform-testing.md) | [README](../README.md)*
