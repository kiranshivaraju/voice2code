# System Architecture

## Overview

Voice2Code is a privacy-focused speech-to-text IDE extension built as a TypeScript-based VS Code extension. The architecture follows a client-side only model with no cloud dependencies, where all audio processing and transcription happens through user-configured OpenAPI-compatible STT endpoints (local or remote).

The extension operates entirely within the IDE environment, capturing audio from the user's microphone, sending it to the configured STT model endpoint, and inserting the transcribed text directly into the editor.

## Tech Stack

### Extension Core
- **Language:** TypeScript 5.x
- **Platform:** VS Code Extension API (compatible with Cursor)
- **Runtime:** Node.js (bundled with VS Code)
- **Build Tool:** Webpack 5.x
- **Package Manager:** npm or pnpm

### Key Dependencies
- **Audio Capture:** Native Node.js audio libraries (e.g., `node-record-lpcm16`, `sox-audio`)
- **HTTP Client:** Axios (for STT endpoint communication)
- **Audio Encoding:** FFmpeg bindings or similar for MP3 encoding
- **Testing:** Jest + VS Code Extension Test Runner
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript strict mode

### Infrastructure
- **Distribution:** VS Code Marketplace, Open VSX Registry
- **Packaging:** `.vsix` extension bundle (<50MB)
- **CI/CD:** GitHub Actions
- **No Backend:** Client-side only, no servers to deploy

### Future Platform Support
- **Visual Studio:** Separate C# implementation (Phase 3)
- **Shared Config:** JSON-based configuration format compatible across platforms

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         VS Code IDE                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Voice2Code Extension                      │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │   UI Layer   │  │ Core Engine │  │ Config Manager  │  │  │
│  │  │              │  │             │  │                 │  │  │
│  │  │ - Commands   │  │ - Recording │  │ - Settings      │  │  │
│  │  │ - Status Bar │  │ - STT API   │  │ - Validation    │  │  │
│  │  │ - Preview    │  │ - Insertion │  │ - Persistence   │  │  │
│  │  └──────┬───────┘  └──────┬──────┘  └────────┬────────┘  │  │
│  │         │                 │                   │           │  │
│  │         └─────────────────┼───────────────────┘           │  │
│  │                           │                               │  │
│  │                  ┌────────▼────────┐                      │  │
│  │                  │  Audio Manager  │                      │  │
│  │                  │                 │                      │  │
│  │                  │ - Device Select │                      │  │
│  │                  │ - Capture       │                      │  │
│  │                  │ - Encoding      │                      │  │
│  │                  └────────┬────────┘                      │  │
│  └───────────────────────────┼──────────────────────────────┘  │
└────────────────────────────────┼───────────────────────────────┘
                                 │
                                 │ Audio (MP3/WAV)
                                 │ HTTP Request
                                 ▼
                    ┌─────────────────────────┐
                    │  STT Model Endpoint     │
                    │  (User Configured)      │
                    │                         │
                    │  - Ollama (local)       │
                    │  - vLLM (local/remote)  │
                    │  - OpenAI Whisper API   │
                    │  - Any OpenAPI STT      │
                    └─────────────────────────┘
                                 │
                                 │ JSON Response
                                 │ { "text": "..." }
                                 ▼
                    ┌─────────────────────────┐
                    │    Editor Insertion     │
                    │  Text appears at cursor │
                    └─────────────────────────┘
```

## Component Responsibilities

### UI Layer
**Purpose:** Handle all user interactions and visual feedback

**Responsibilities:**
- Register VS Code commands (start/stop recording, open settings)
- Display status bar indicators (recording state, model info)
- Show preview tooltip/panel for transcription review
- Handle keyboard shortcuts and command palette integration
- Display error notifications and status messages

**Key Classes:**
- `ExtensionUI`: Main UI coordinator
- `StatusBarController`: Manage status bar items
- `PreviewPanel`: Transcription preview interface

### Core Engine
**Purpose:** Orchestrate the speech-to-text workflow

**Responsibilities:**
- Coordinate recording start/stop lifecycle
- Send audio to configured STT endpoint via HTTP
- Receive and parse transcription results
- Insert text into active editor at cursor position(s)
- Handle errors and retries
- Manage recording state transitions

**Key Classes:**
- `Voice2CodeEngine`: Main orchestrator
- `TranscriptionService`: Handle STT API communication
- `EditorService`: Manage text insertion and cursor handling

### Config Manager
**Purpose:** Manage user configuration and settings

**Responsibilities:**
- Read/write VS Code workspace and user settings
- Validate endpoint URLs and model names
- Test endpoint connectivity
- Store multiple endpoint profiles
- Handle default model selection
- Persist user preferences (keyboard shortcuts, audio feedback, etc.)

**Key Classes:**
- `ConfigurationManager`: Settings CRUD operations
- `EndpointValidator`: Test endpoint connectivity
- `SettingsSchema`: TypeScript interfaces for settings

### Audio Manager
**Purpose:** Handle all audio capture and processing

**Responsibilities:**
- Enumerate available audio input devices
- Capture audio from selected microphone
- Encode audio to required format (MP3/WAV)
- Buffer audio data during recording
- Handle device connection/disconnection
- Manage audio quality settings

**Key Classes:**
- `AudioCapture`: Microphone recording
- `AudioEncoder`: Format conversion (WAV → MP3)
- `DeviceManager`: Input device enumeration and selection

## Component Interactions

### Recording Workflow
1. User triggers command (keyboard shortcut or command palette)
2. `ExtensionUI` → `Voice2CodeEngine.startRecording()`
3. `Voice2CodeEngine` → `AudioManager.startCapture()`
4. Audio captured and buffered by `AudioManager`
5. User triggers stop command
6. `Voice2CodeEngine` → `AudioManager.stopCapture()` → returns audio buffer
7. `AudioEncoder` converts to MP3
8. `TranscriptionService` sends to STT endpoint via Axios
9. Response received and parsed
10. `EditorService` inserts text at cursor
11. `StatusBarController` updates UI state

### Configuration Workflow
1. User opens settings (command palette)
2. `ExtensionUI` shows VS Code settings page
3. User modifies endpoint URL or model name
4. VS Code triggers `onDidChangeConfiguration` event
5. `ConfigurationManager` validates new settings
6. `EndpointValidator` tests connectivity
7. Success/error notification shown to user

## Design Decisions

### Why TypeScript?
- **Type Safety:** Catch errors at compile time, especially important for complex state management
- **VS Code Native:** Best support for VS Code Extension API
- **Developer Experience:** Excellent IDE support, refactoring, and documentation
- **Community:** Large ecosystem of typed libraries and tools

### Why VS Code Extension API?
- **Cursor Compatibility:** Cursor is VS Code-based, so extensions work seamlessly
- **Rich API:** Built-in support for commands, status bars, settings, webviews
- **No Backend Needed:** Everything runs in the IDE process
- **Marketplace Distribution:** Easy distribution and auto-updates

### Why Native Node.js Audio Libraries?
- **Performance:** Direct hardware access, lower latency than browser APIs
- **Quality:** Better control over sample rates, bit depths, and formats
- **Reliability:** More stable than MediaRecorder in webviews
- **Cross-platform:** Works on Windows, macOS, Linux via Node.js

### Why Axios?
- **Rich Feature Set:** Automatic retries, timeouts, request cancellation
- **Better Errors:** More detailed error messages than fetch
- **Interceptors:** Easy to add logging, authentication headers
- **Familiar:** Widely used in Node.js ecosystem

### Why Webpack?
- **VS Code Standard:** Recommended by VS Code extension documentation
- **Bundle Optimization:** Tree-shaking, minification, code splitting
- **Extension Size:** Helps keep extension under 50MB limit
- **Mature Tooling:** Well-tested, extensive plugin ecosystem

### Why MP3 Encoding?
- **Compression:** Significantly smaller than WAV (important for remote endpoints)
- **Compatibility:** Universally supported by STT models
- **Speed:** Faster uploads, lower latency
- **Configurable Quality:** Can balance size vs. quality based on use case

## Scalability Considerations

### Extension Performance
- **Lazy Loading:** Load heavy dependencies (audio encoders) only when needed
- **Streaming:** Consider streaming audio in chunks for long recordings (future enhancement)
- **Memory Management:** Clear audio buffers immediately after transcription
- **Debouncing:** Prevent rapid start/stop cycles that could overwhelm system

### Multi-User Scenarios (Enterprise)
- **Shared Endpoints:** Support team-wide STT endpoint configurations
- **Configuration Sync:** Leverage VS Code Settings Sync for shared settings
- **Resource Limits:** Respect system resources (don't monopolize microphone)

### Future Scalability
- **Plugin Architecture:** Extensible design for custom STT adapters
- **Model Registry:** Support for model marketplace/catalog (future)
- **Batch Processing:** Process multiple recordings in queue (future)

## Security Architecture

### Privacy-First Design
- **No Telemetry:** Zero data collection by default
- **Local Processing:** Audio never touches Voice2Code servers (we have none)
- **User Control:** All data sent only to user-specified endpoints
- **No Persistence:** Audio buffers cleared immediately after use

### Endpoint Security
- **HTTPS Validation:** Warn users when using HTTP (unencrypted) endpoints
- **Certificate Validation:** Validate SSL certificates for remote endpoints
- **Credential Storage:** Use VS Code's SecretStorage API for API keys
- **Input Sanitization:** Validate all user inputs (URLs, model names)

### Code Security
- **Dependency Scanning:** Regular `npm audit` and Dependabot checks
- **Minimal Dependencies:** Keep dependency tree small to reduce attack surface
- **Sandboxing:** Extension runs in VS Code's extension host (isolated from editor)
- **Marketplace Review:** Subject to VS Code marketplace security review

### Data Flow Security
```
┌─────────────┐  Encrypted   ┌──────────────┐  User-controlled  ┌──────────┐
│ Microphone  │────HTTPS─────▶│  Extension   │────HTTPS/HTTP────▶│ STT      │
│ (Hardware)  │              │  (Local)     │                   │ Endpoint │
└─────────────┘              └──────────────┘                   └──────────┘
     ▲                              │                                  │
     │                              │ No logging                       │
     └──────────────────────────────┘                                  │
                                                                       │
                                    ┌──────────────────────────────────┘
                                    ▼
                           Transcription Result
                           (Text only, no audio stored)
```

## Error Handling Strategy

### Error Categories
1. **Configuration Errors:** Invalid URLs, missing model names
2. **Network Errors:** Endpoint unreachable, timeout, DNS failure
3. **Audio Errors:** Microphone unavailable, permission denied
4. **Transcription Errors:** Model not found, API rate limit, invalid response

### Error Handling Approach
- **User-Friendly Messages:** Plain English, actionable guidance
- **Progressive Disclosure:** Basic error message + "Show Details" option
- **Logging:** Console logging for debugging (visible in VS Code Developer Tools)
- **Graceful Degradation:** Don't crash extension on single failure
- **Retry Logic:** Automatic retry for transient network errors (with backoff)

### Error Response Format
```typescript
interface Voice2CodeError {
  code: 'NETWORK_ERROR' | 'AUDIO_ERROR' | 'CONFIG_ERROR' | 'STT_ERROR';
  message: string;  // User-facing message
  details?: string; // Technical details
  action?: string;  // Suggested action ("Check your endpoint URL")
}
```

## Performance Requirements

### Latency Targets
- **Recording Start:** <200ms from command to visual feedback
- **Recording Stop → Transcription:** <500ms end-to-end (local model)
- **Text Insertion:** <50ms from transcription received to text in editor
- **Settings Validation:** <1000ms for endpoint connectivity test

### Resource Constraints
- **Memory:** <100MB RAM during recording
- **CPU:** <10% CPU usage during recording (background)
- **Disk:** <50MB extension bundle size
- **Network:** Bandwidth depends on audio quality (e.g., 128kbps MP3 = ~1MB/min)

### Optimization Strategies
- **Lazy Loading:** Load audio encoder only when first needed
- **Caching:** Cache model info from endpoints (avoid repeated queries)
- **Async Operations:** All I/O operations (network, disk) are async/non-blocking
- **Efficient Encoding:** Use streaming encoders to avoid large memory buffers

## Deployment Architecture

### Distribution
- **Primary:** VS Code Marketplace (official)
- **Secondary:** Open VSX Registry (for VSCodium, Eclipse Theia)
- **Manual:** `.vsix` file for offline/air-gapped installations

### Versioning
- **Semantic Versioning:** MAJOR.MINOR.PATCH (e.g., 1.2.3)
- **Breaking Changes:** Major version bump
- **New Features:** Minor version bump
- **Bug Fixes:** Patch version bump

### Update Strategy
- **Automatic:** VS Code auto-updates extensions by default
- **Manual:** Users can disable auto-update if desired
- **Changelog:** Detailed changelog in marketplace listing

### Platform Support
- **Windows:** Windows 10, 11 (x64, ARM64)
- **macOS:** macOS 11+ (Intel, Apple Silicon)
- **Linux:** Ubuntu, Debian, Fedora, Arch (x64, ARM64)

## Testing Architecture

### Test Levels
1. **Unit Tests:** Individual functions and classes (80% coverage minimum)
2. **Integration Tests:** Component interactions (audio → STT → editor)
3. **End-to-End Tests:** Full user workflows in VS Code environment

### Test Structure
```
tests/
├── unit/
│   ├── config-manager.test.ts
│   ├── audio-encoder.test.ts
│   ├── transcription-service.test.ts
│   └── editor-service.test.ts
├── integration/
│   ├── recording-workflow.test.ts
│   ├── endpoint-validation.test.ts
│   └── text-insertion.test.ts
└── e2e/
    ├── basic-dictation.test.ts
    └── model-switching.test.ts
```

### Test Strategy
- **Mock STT Endpoints:** Use mock HTTP server for consistent test results
- **Mock Audio Input:** Simulate microphone with pre-recorded samples
- **VS Code Test Environment:** Run integration tests in real VS Code instance
- **CI/CD:** All tests run on GitHub Actions (Windows, macOS, Linux)

## Future Architecture Considerations

### Phase 2 Enhancements
- **Streaming Transcription:** Real-time transcription for long recordings
- **Audio Preprocessing:** Noise reduction, normalization before sending to STT
- **Offline Caching:** Cache frequent phrases for faster insertion

### Phase 3 Platform Expansion
- **Visual Studio Extension:** C# implementation with shared config format
- **JetBrains IDEs:** Kotlin/Java plugin (community contribution opportunity)

### Phase 4 Advanced Features
- **Plugin System:** Allow third-party STT adapters
- **Voice Macros:** Custom voice commands that expand to text snippets
- **Code Context Awareness:** Understanding programming syntax for better accuracy
- **Multi-Model Ensemble:** Combine results from multiple STT models for accuracy

## Monitoring and Observability

### Telemetry (Opt-in)
- **Usage Metrics:** How often features are used (if user consents)
- **Error Reports:** Anonymous error reports for debugging (if user consents)
- **Performance Metrics:** Latency, success rates (if user consents)

### Default Privacy
- **No Telemetry by Default:** User must explicitly opt-in
- **Anonymous Only:** No personally identifiable information ever collected
- **Local Logs Only:** All logging stays on user's machine by default

### Debugging Support
- **Output Channel:** VS Code Output panel for extension logs
- **Log Levels:** ERROR, WARN, INFO, DEBUG (configurable)
- **Diagnostic Command:** Built-in command to generate diagnostic report

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Status:** Active - Product-Level Architecture
