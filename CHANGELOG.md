# Changelog

All notable changes to Voice2Code are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-02-17

**Sprint v1 — Initial Release**

This is the first release of Voice2Code. It establishes the full extension architecture, all core services, STT provider adapters, and a comprehensive test suite.

### Added

#### Core Extension
- **Extension entry point** (`src/extension.ts`) — activates on `startRecording`, `stopRecording`, and `toggleRecording` commands; wires all services via dependency injection
- **5 VS Code commands** registered with error handling:
  - `voice2code.startRecording`
  - `voice2code.stopRecording`
  - `voice2code.toggleRecording`
  - `voice2code.testConnection`
  - `voice2code.openSettings`
- **Keyboard shortcut**: `Ctrl+Shift+V` (Windows/Linux), `Cmd+Shift+V` (macOS)

#### Voice2Code Engine (`src/core/engine.ts`)
- Central orchestrator managing recording state machine (`idle` → `recording` → `processing`)
- Coordinates AudioManager, TranscriptionService, EditorService, and StatusBarController
- Handles `startRecording`, `stopRecording`, `toggleRecording`, and `testConnection` flows
- Proper resource cleanup via `dispose()`

#### Audio Subsystem
- **AudioManager** (`src/audio/audio-manager.ts`) — manages recording lifecycle using `node-record-lpcm16`
- **DeviceManager** (`src/audio/device-manager.ts`) — cross-platform audio device enumeration:
  - Windows: DirectSound/WASAPI
  - macOS: CoreAudio
  - Linux: ALSA/PulseAudio
- **AudioEncoder** (`src/audio/audio-encoder.ts`) — encodes raw PCM to MP3/WAV using ffmpeg

#### STT Provider Adapters
- **AdapterFactory** (`src/adapters/adapter-factory.ts`) — creates the correct adapter from endpoint URL
- **OllamaAdapter** (`src/adapters/ollama-adapter.ts`) — Ollama API integration (local, private)
- **OpenAIWhisperAdapter** (`src/adapters/openai-whisper-adapter.ts`) — OpenAI and vLLM-compatible OpenAI API integration

#### Configuration
- **ConfigurationManager** (`src/config/configuration-manager.ts`) — reads/writes VS Code settings; stores API keys in SecretStorage
- **EndpointValidator** (`src/config/endpoint-validator.ts`) — validates endpoint URLs and model names
- **10 configurable settings** across endpoint, audio, UI, and history categories

#### Services
- **TranscriptionService** (`src/core/transcription-service.ts`) — routes audio to the correct STT adapter; handles retries and error mapping
- **EditorService** (`src/core/editor-service.ts`) — inserts transcribed text at active cursor; supports multi-cursor

#### UI
- **StatusBarController** (`src/ui/status-bar-controller.ts`) — shows idle/recording/processing states with color-coded icons
- Status bar item appears in the right panel with `$(mic)`, `$(record)`, and `$(sync~spin)` icons

#### Testing
- **307 unit tests** across 13 test suites (100% pass rate)
- **91.26% overall test coverage** (above 80% threshold)
- **E2E test suite** (Mocha + VS Code Extension Host):
  - `tests/e2e/basic-workflow.test.ts` — happy path, settings, multi-cursor, state management
  - `tests/e2e/error-handling.test.ts` — no active editor, unreachable endpoint, invalid config, no audio permission, extension resilience
- Unit tests for all major components with full mocking

#### Documentation
- `README.md` — project overview, installation, configuration, usage, architecture
- `docs/user-guide.md` — detailed setup for Ollama/vLLM/OpenAI, settings reference, FAQ
- `docs/platform-testing.md` — cross-platform compatibility matrix and known limitations
- `TEST_REPORT.md` — Sprint v1 test coverage report

#### Infrastructure
- **Webpack 5** build system producing a single bundled `out/extension.js`
- **TypeScript** strict mode configuration
- **ESLint + Prettier** code quality tooling
- **Jest** test runner (unit/integration) with coverage reporting
- `.vscode/launch.json` and `.vscode/tasks.json` for Extension Development Host debugging

### Known Limitations

- **Audio capture is mocked in v0.1.0** — `DeviceManager` returns 3 hardcoded mock devices; real microphone recording is wired but requires `ffmpeg` on `PATH` and a running STT backend
- **ffmpeg required** — audio encoding depends on `ffmpeg` being installed system-wide; not bundled
- **sox/arecord required on Linux** — `node-record-lpcm16` requires system audio tools
- **Node.js v20+ required** — v18 is incompatible with the `undici` dependency

---

## [Unreleased]

Changes planned for future releases:

### Planned for v0.2.0
- Real audio device enumeration (WASAPI/CoreAudio/ALSA)
- Transcription preview panel before insertion
- Session history with replay
- Improved error messages with actionable suggestions
- Settings UI panel

---

*See [GitHub releases](https://github.com/kiranshivaraju/voice2code/releases) for release notes.*
