# Voice2Code

Open-source speech-to-text extension for IDEs. Run models locally with vLLM or use cloud providers like Groq and OpenAI.

[![CI](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml/badge.svg)](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/kiranshivaraju/voice2code/branch/main/graph/badge.svg)](https://codecov.io/gh/kiranshivaraju/voice2code)

## Overview

Voice2Code enables developers to dictate code and documentation directly into their IDE using speech-to-text models. Run Whisper locally with vLLM for full privacy, or connect to cloud providers like Groq (free) and OpenAI for a quick setup.

### Key Features

- **Open Source**: Run your own STT models locally with vLLM
- **Cloud Support**: Also works with Groq (free tier) and OpenAI
- **IDE Native**: Seamless VS Code and Cursor integration
- **Model Agnostic**: Works with any OpenAI-compatible STT endpoint
- **Accessible**: Built for developers with accessibility needs

## Tech Stack

### Extension Core
- **Language:** TypeScript 5.x
- **Platform:** VS Code Extension API (compatible with Cursor)
- **Runtime:** Node.js (bundled with VS Code)
- **Build Tool:** Webpack 5.x
- **Package Manager:** npm

### Key Dependencies
- **HTTP Client:** Axios (for STT endpoint communication)
- **Testing:** Jest + VS Code Extension Test Runner
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript strict mode

## Getting Started

### Prerequisites

- Node.js 20.x or later (**v20.18.1+ required** — v18 incompatible with undici dependency)
- VS Code 1.85.0 or later (or Cursor IDE)
- An STT model endpoint (local or remote)

### Installation

```bash
# Clone the repository
git clone https://github.com/kiranshivaraju/voice2code.git
cd voice2code

# Install dependencies
npm install

# Build the extension
npm run compile

# Package the extension
npm run package

# Install the .vsix file in VS Code / Cursor
code --install-extension voice2code-*.vsix
# Or for Cursor: cursor --install-extension voice2code-*.vsix
```

Alternatively, open VS Code/Cursor → Extensions (Cmd+Shift+X) → click `...` → **Install from VSIX...** → select the built `.vsix` file.

### Configuration

1. Open Command Palette (Cmd+Shift+P) → "Voice2Code: Open Settings"
2. Set your endpoint URL and model
3. If using a cloud provider, set your API key: Cmd+Shift+P → "Voice2Code: Set API Key"
4. Click "Test Connection" to verify

### System Dependency

Voice2Code requires **sox** for audio capture:

```bash
# macOS
brew install sox

# Linux (Debian/Ubuntu)
sudo apt-get install sox

# Linux (Fedora)
sudo dnf install sox
```

---

## Supported Providers

### 1. vLLM (Local, Free, Open Source)

Run Whisper models locally on your machine. No API key needed, full privacy.

**Setup:**

```bash
# Install vLLM with audio support
pip install -U "vllm[audio]"

# Serve a Whisper model
vllm serve openai/whisper-large-v3
```

| Setting | Value |
|---|---|
| **Endpoint URL** | `http://localhost:8000/v1/audio/transcriptions` |
| **Model** | `openai/whisper-large-v3` |
| **API Key** | Not required |

```json
{
  "voice2code.endpoint.url": "http://localhost:8000/v1/audio/transcriptions",
  "voice2code.endpoint.model": "openai/whisper-large-v3"
}
```

Available models: `openai/whisper-small`, `openai/whisper-large-v3`, `openai/whisper-large-v3-turbo`

> **Note:** vLLM has a 30-second audio limit per request. For normal voice dictation this is fine.

---

### 2. Groq (Cloud, Free Tier)

If you don't want to run models locally, Groq offers a free cloud API with fast response times.

**Setup:**
1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Configure Voice2Code:

| Setting | Value |
|---|---|
| **Endpoint URL** | `https://api.groq.com/openai/v1/audio/transcriptions` |
| **Model** | `whisper-large-v3` |
| **API Key** | Your Groq key (`gsk_...`) |

```json
{
  "voice2code.endpoint.url": "https://api.groq.com/openai/v1/audio/transcriptions",
  "voice2code.endpoint.model": "whisper-large-v3"
}
```
Then set your API key: Cmd+Shift+P → "Voice2Code: Set API Key"

---

### 3. OpenAI (Cloud, Paid)

Uses OpenAI's Whisper API directly. Reliable and accurate.

**Setup:**
1. Get an API key at [platform.openai.com](https://platform.openai.com)
2. Configure Voice2Code:

| Setting | Value |
|---|---|
| **Endpoint URL** | `https://api.openai.com/v1/audio/transcriptions` |
| **Model** | `whisper-1` |
| **API Key** | Your OpenAI key (`sk-...`) |

```json
{
  "voice2code.endpoint.url": "https://api.openai.com/v1/audio/transcriptions",
  "voice2code.endpoint.model": "whisper-1"
}
```

---

### Provider Comparison

| Provider | Local | Free | Speed | Accuracy | Setup |
|---|---|---|---|---|---|
| **vLLM** | Yes | Yes | Medium | High | 10 min |
| **Groq** | No | Yes (free tier) | Very fast | High | 2 min |
| **OpenAI** | No | No ($0.006/min) | Fast | High | 2 min |

## Usage

### Quick Start

1. Install Voice2Code from the `.vsix` (see [Installation](#installation))
2. Install sox: `brew install sox` (macOS) or `sudo apt-get install sox` (Linux)
3. Set up a provider (see [Supported Providers](#supported-providers) above)
4. Set your API key if needed: Cmd+Shift+P → "Voice2Code: Set API Key"
5. Run "Voice2Code: Test Connection" to verify setup
6. Press `Cmd+Shift+V` to record, speak, press again to stop and insert

### Text Insertion

Transcribed text is inserted wherever your cursor is:

- **Text editor** → inserted at cursor position
- **Terminal** → sent to active terminal
- **Extension panels** (Claude Code, search boxes, etc.) → pasted via clipboard

### Commands

| Command | Keyboard Shortcut | Description |
|---|---|---|
| `Voice2Code: Toggle Recording` | `Ctrl+Shift+V` / `Cmd+Shift+V` | Start/stop recording |
| `Voice2Code: Start Recording` | — | Begin audio capture |
| `Voice2Code: Stop Recording` | — | End recording and transcribe |
| `Voice2Code: Open Settings` | — | Open settings panel |
| `Voice2Code: Test Connection` | — | Verify endpoint connectivity |
| `Voice2Code: Set API Key` | — | Store API key securely |
| `Voice2Code: Delete API Key` | — | Remove stored API key |
| `Voice2Code: Show History` | — | View transcription history |
| `Voice2Code: Clear History` | — | Delete all history |

### Troubleshooting

**"No such recorder found: rec/sox"**
- Install sox: `brew install sox` (macOS) or `sudo apt-get install sox` (Linux)

**Connection test fails**
- Verify your endpoint is running (e.g. `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`)
- Check that your API key is set: Cmd+Shift+P → "Voice2Code: Set API Key"
- Ensure the endpoint URL is correct in settings

**"No active editor or terminal"**
- Click inside a file, terminal, or extension panel before stopping the recording

**Audio device not found**
- Ensure a microphone is connected
- On macOS: grant microphone permission when prompted by the OS
- On Linux: check `sox` is installed and working (`rec test.wav`)

**`Cmd+Shift+V` conflict on macOS**
- Reassign via Preferences → Keyboard Shortcuts, search for `voice2code.toggleRecording`

## Development

This project uses **ProdKit** for development workflow and **Speckit** for TDD.

### Project Structure

```
.
├── src/                      # Source code
│   ├── core/                 # Core engine and services
│   ├── audio/                # Audio capture and encoding
│   ├── config/               # Configuration management
│   ├── ui/                   # UI components
│   ├── adapters/             # STT provider adapters
│   ├── utils/                # Utility functions
│   └── types/                # TypeScript type definitions
├── tests/
│   ├── unit/                 # Unit tests
│   ├── contract/             # Contract tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   ├── fixtures/             # Test fixtures
│   └── helpers/              # Test helpers
├── product/                  # Product-level documentation
│   ├── prd.md                # Product Requirements Document
│   └── tech-docs/            # Technical architecture docs
├── sprints/                  # Sprint-level documentation
└── .prodkit/                 # ProdKit framework
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test type
npm test -- tests/unit
npm test -- tests/integration
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npx tsc --noEmit
```

### Building

```bash
# Development build with watch
npm run watch

# Production build
npm run compile

# Package extension
npm run package
```

### Contributing

All code changes require:

1. **Tests**: Unit + integration tests (80% coverage minimum)
2. **Linting**: Code must pass ESLint
3. **Type Safety**: No `any` types, strict TypeScript
4. **Documentation**: JSDoc comments for public APIs
5. **Code Review**: At least 1 approval required
6. **CI/CD**: All checks must pass

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

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

## Architecture

Voice2Code follows a layered architecture:

```
┌─────────────────────────────────────────┐
│          UI Layer                       │  Commands, Status Bar, Panels
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│          Core Layer                     │  Engine, Services
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│          Infrastructure Layer           │  Audio, Config, HTTP
└─────────────────────────────────────────┘
```

See `product/tech-docs/architecture.md` for detailed documentation.

## Security

- **Zero Telemetry**: No data collection by default
- **Privacy First**: Audio and transcriptions stay local
- **HTTPS Enforced**: Warnings for unencrypted remote endpoints
- **Credential Storage**: API keys stored in VS Code SecretStorage
- **Input Validation**: All user inputs sanitized

See `product/tech-docs/security.md` for security standards.

## Roadmap

### Phase 1: MVP (v1-v2) - Months 1-2
- VS Code extension with basic functionality
- Local model support (Ollama, vLLM)
- Core features: recording, transcription, insertion

### Phase 2: Enhanced UX (v3-v4) - Months 3-4
- Transcription preview and confirmation
- Enhanced error handling
- Settings and preferences UI

### Phase 3: Platform Expansion (v5-v6) - Months 5-6
- Visual Studio extension
- Multi-language support
- Session history

See `product/prd.md` for complete roadmap.

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Support

- **Issues**: https://github.com/kiranshivaraju/voice2code/issues
- **Discussions**: https://github.com/kiranshivaraju/voice2code/discussions

## Acknowledgments

Built with:
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Ollama](https://ollama.com)
- [vLLM](https://docs.vllm.ai)
- [ProdKit](https://github.com/kiranshivaraju/prodkit)

---

**Generated with ProdKit** - Privacy-focused development for accessibility
