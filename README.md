# Voice2Code

Privacy-focused speech-to-text extension for IDEs with configurable local and remote model support.

[![CI](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml/badge.svg)](https://github.com/kiranshivaraju/voice2code/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/kiranshivaraju/voice2code/branch/main/graph/badge.svg)](https://codecov.io/gh/kiranshivaraju/voice2code)

## Overview

Voice2Code enables developers to dictate code and documentation directly into their IDE using local or self-hosted speech-to-text models. Built with privacy as a core principle, all audio processing happens on user-configured endpoints—no cloud dependencies, no data collection.

### Key Features

- **Privacy First**: Audio never leaves your control
- **Model Agnostic**: Works with any OpenAPI-compatible STT endpoint
- **Local & Remote**: Support for Ollama, vLLM, OpenAI Whisper API
- **IDE Native**: Seamless VS Code and Cursor integration
- **Offline Capable**: Full functionality with local models
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

#### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Voice2Code"
4. Click Install

#### From Source

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

# Install the .vsix file in VS Code
code --install-extension voice2code-*.vsix
```

### Configuration

1. Open VS Code Settings (Ctrl+, / Cmd+,)
2. Search for "Voice2Code"
3. Configure your STT endpoint:

```json
{
  "voice2code.endpoint.url": "http://localhost:11434/api/transcribe",
  "voice2code.endpoint.model": "whisper-large-v3",
  "voice2code.endpoint.timeout": 30000,
  "voice2code.audio.format": "mp3",
  "voice2code.ui.previewEnabled": true
}
```

### Setting Up Local STT Model

#### Option 1: Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Whisper model
ollama pull whisper

# Configure Voice2Code to use Ollama
# Set endpoint.url to: http://localhost:11434/api/generate
# Set endpoint.model to: whisper
```

#### Option 2: vLLM

```bash
# Install vLLM
pip install vllm

# Start vLLM server with Whisper
python -m vllm.entrypoints.openai.api_server \
  --model openai/whisper-large-v3

# Configure Voice2Code
# Set endpoint.url to: http://localhost:8000/v1/audio/transcriptions
# Set endpoint.model to: whisper-large-v3
```

## Usage

### Quick Start

1. Install Ollama and pull the Whisper model (see [docs/user-guide.md](docs/user-guide.md))
2. Install Voice2Code from the marketplace or `.vsix`
3. Run `Voice2Code: Test Connection` to verify setup
4. Place cursor in your editor and press `Ctrl+Shift+V` / `Cmd+Shift+V`
5. Speak — press the shortcut again to stop and insert

### Basic Dictation

1. Position your cursor where you want to insert text
2. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) to start recording
3. Speak your content
4. Press the same shortcut again to stop
5. The transcription is inserted at the cursor position

### Commands

| Command | Keyboard Shortcut | Description |
|---|---|---|
| `Voice2Code: Start Recording` | — | Begin audio capture |
| `Voice2Code: Stop Recording` | — | End recording and transcribe |
| `Voice2Code: Toggle Recording` | `Ctrl+Shift+V` / `Cmd+Shift+V` | Start/stop with single command |
| `Voice2Code: Open Settings` | — | Configure extension |
| `Voice2Code: Test Connection` | — | Verify endpoint connectivity |

### Supported STT Providers

| Provider | Endpoint Pattern | Auth Method |
|---|---|---|
| **Ollama** (local) | `http://localhost:11434/api/transcribe` | None |
| **vLLM** (self-hosted) | `http://host:port/v1/audio/transcriptions` | API key (SecretStorage) |
| **OpenAI Whisper** | `https://api.openai.com/v1/audio/transcriptions` | API key (SecretStorage) |

### Troubleshooting

**Extension does not activate**
- Trigger a Voice2Code command from the Command Palette to force activation
- Check VS Code version is ≥ 1.85.0

**Audio device not found**
- Ensure a microphone is connected and accessible
- On Linux: install `sox` (`sudo apt-get install sox`) — required by `node-record-lpcm16`
- On macOS: grant microphone permission when prompted by the OS
- Check `voice2code.audio.deviceId` setting (default: `default`)

**Connection test fails**
- Verify your STT endpoint is running: `curl http://localhost:11434` (Ollama)
- Check `voice2code.endpoint.url` is correct in settings
- Ensure no firewall blocks the port

**Node.js version error during build**
- Upgrade to Node.js v20.18.1+ — v18 is incompatible with the `undici` dependency bundled by VS Code

**`Cmd+Shift+V` conflict on macOS**
- Reassign via `Code → Preferences → Keyboard Shortcuts`, search for `voice2code.toggleRecording`

See [docs/user-guide.md](docs/user-guide.md) for detailed setup instructions.

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
