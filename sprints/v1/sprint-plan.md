# Sprint v1 Plan

**Sprint Number:** 1

**Duration:** 2 weeks (14 days)

**Sprint Goal:** Build a working speech-to-text VS Code extension that can record audio from configured microphones, transcribe using local STT models (Ollama/vLLM), and insert transcribed text into the editor with proper error handling.

---

## Features in This Sprint

### Feature 1: Model Configuration
- **From PRD:** Section "Features" - Feature 1
- **Priority:** Critical (P0)
- **Description:** Users can configure and switch between multiple STT model endpoints (local or remote)
- **User Story:** As a developer, I want to configure my preferred STT model endpoint so that I can use local models for privacy or cloud models for better accuracy
- **Success Criteria:**
  - [ ] Support OpenAPI-compatible endpoints (Ollama, vLLM, OpenAI Whisper API)
  - [ ] Read endpoint configuration from VS Code settings
  - [ ] Save endpoint URL and timeout settings
  - [ ] Validate endpoint connectivity with test connection
  - [ ] Store API keys securely using VS Code SecretStorage
  - [ ] Configuration persists across VS Code sessions

**Technical Components:**
- `ConfigurationManager` class for reading VS Code settings
- `EndpointValidator` for validating URLs and testing connectivity
- VS Code settings schema in `package.json`

---

### Feature 2: Voice Input with Toggle Activation
- **From PRD:** Section "Features" - Feature 2
- **Priority:** Critical (P0)
- **Description:** Users can toggle voice recording on/off to dictate text into the IDE
- **User Story:** As a user, I want to press a button to start/stop voice recording so that I can control exactly when I'm dictating
- **Success Criteria:**
  - [ ] Keyboard shortcut (Ctrl+Shift+V / Cmd+Shift+V) toggles recording
  - [ ] Visual indicator in status bar shows recording state (red icon when recording)
  - [ ] Command palette commands: "Start Recording", "Stop Recording", "Toggle Recording"
  - [ ] Audio captured from selected microphone device
  - [ ] Audio buffer stored in memory during recording
  - [ ] Optional audio feedback (beep) when starting/stopping

**Technical Components:**
- `AudioManager` class for audio capture
- `Voice2CodeEngine` orchestrator for recording lifecycle
- Status bar UI controller
- VS Code command registration

---

### Feature 3: Text Insertion at Cursor
- **From PRD:** Section "Features" - Feature 3
- **Priority:** Critical (P0)
- **Description:** Transcribed text is inserted directly at the current cursor position in the active editor
- **User Story:** As a developer, I want transcribed text to appear where my cursor is so that I can seamlessly integrate voice input into my coding workflow
- **Success Criteria:**
  - [ ] Insert text at current cursor position in active editor
  - [ ] Maintain cursor position after insertion (cursor moves to end of inserted text)
  - [ ] Support multi-cursor editing (insert at all cursor positions)
  - [ ] Preserve editor undo/redo stack (insertion can be undone)
  - [ ] Handle case when no editor is active (show error message)
  - [ ] Work with all file types (code, markdown, plain text)

**Technical Components:**
- `EditorService` class for text insertion
- VS Code TextEditor API integration
- Multi-cursor support logic

**Dependencies:** Feature 2 (need transcribed text to insert)

---

### Feature 5: Multi-IDE Support (VS Code/Cursor)
- **From PRD:** Section "Features" - Feature 5 (partial - VS Code only for v1)
- **Priority:** Critical (P0)
- **Description:** Extension works in VS Code and Cursor (both use VS Code Extension API)
- **User Story:** As a developer who uses VS Code or Cursor, I want the same voice input experience in both tools
- **Success Criteria:**
  - [ ] Extension runs in VS Code 1.85.0+
  - [ ] Extension runs in Cursor (VS Code compatible)
  - [ ] Packaged as `.vsix` extension file
  - [ ] Listed in VS Code Marketplace
  - [ ] Activation events configured correctly
  - [ ] Compatible with Windows, macOS, and Linux

**Technical Components:**
- VS Code Extension API usage
- Proper `package.json` manifest
- Webpack bundling for cross-platform support

**Dependencies:** All features (this is the platform)

**Note:** Visual Studio support is deferred to Phase 3 (Sprint v5-v6)

---

### Feature 6: Audio Input Device Selection
- **From PRD:** Section "Features" - Feature 6
- **Priority:** High (P1)
- **Description:** Users can select which microphone/audio input device to use
- **User Story:** As a user with multiple microphones, I want to choose which one to use so that I can optimize for quality or convenience
- **Success Criteria:**
  - [ ] List all available audio input devices on system
  - [ ] Allow user to select preferred device in settings
  - [ ] Remember device selection across sessions
  - [ ] Handle device connection/disconnection gracefully (fall back to default)
  - [ ] Show clear error if selected device is unavailable
  - [ ] Display device info (name, ID) in settings

**Technical Components:**
- `DeviceManager` class for enumerating audio devices
- Audio device enumeration using Node.js audio libraries
- Device selection persistence in VS Code settings

**Dependencies:** Feature 2 (audio capture needs device selection)

---

### Feature 7: Model Specification Configuration
- **From PRD:** Section "Features" - Feature 7
- **Priority:** High (P1)
- **Description:** Users can specify the exact STT model name/identifier when configuring endpoints
- **User Story:** As a power user, I want to specify which specific model to use on my endpoint (e.g., "whisper-large-v3") so that I have full control over the STT engine
- **Success Criteria:**
  - [ ] Model name field in VS Code settings (e.g., "whisper-large-v3")
  - [ ] Model name passed to STT endpoint in API request
  - [ ] Validate model name format (alphanumeric, hyphens, underscores only)
  - [ ] Test endpoint with specified model (validate model exists)
  - [ ] Display model information if available from endpoint
  - [ ] Default model name if not specified

**Technical Components:**
- Model name configuration in `ConfigurationManager`
- Model validation in `EndpointValidator`
- Model parameter in STT API request

**Dependencies:** Feature 1 (extends endpoint configuration)

---

### Feature 8: Error Handling & Status Feedback
- **From PRD:** Section "Features" - Feature 8
- **Priority:** High (P1)
- **Description:** Clear error messages and status updates for all operations
- **User Story:** As a user, I want to know when something goes wrong so that I can troubleshoot and fix issues
- **Success Criteria:**
  - [ ] Display connection errors with actionable messages
  - [ ] Show transcription failures with error details
  - [ ] Status bar shows current extension state (idle, recording, transcribing, error)
  - [ ] Log errors to VS Code Output panel for debugging
  - [ ] User-friendly error notifications (not technical stack traces)
  - [ ] Specific error types: NetworkError, AudioError, ConfigurationError, TranscriptionError

**Technical Components:**
- Custom error classes extending `Voice2CodeError`
- Error handling in all service layers
- Status bar integration
- VS Code notification API usage
- Output channel for logging

**Dependencies:** All features (error handling applies to everything)

---

## Feature Dependencies & Build Order

**Phase 1: Foundation (Build First)**
1. Feature 5: VS Code Extension Setup
2. Feature 1: Model Configuration
3. Feature 7: Model Specification Configuration (extends Feature 1)

**Phase 2: Core Functionality**
4. Feature 6: Audio Input Device Selection
5. Feature 2: Voice Input with Toggle Activation (needs Feature 6)
6. Feature 3: Text Insertion at Cursor (needs Feature 2)

**Phase 3: Polish**
7. Feature 8: Error Handling & Status Feedback (applies to all)

---

## Out of Scope for This Sprint

The following features are **NOT** being built in Sprint v1:

- **Feature 4: Transcription Preview & Confirmation** - Deferred to Sprint v2 (UX enhancement)
- **Feature 9: Offline Mode Support** - Deferred to Sprint v2 (detection logic)
- **Feature 10: Settings & Preferences** - Deferred to Sprint v2 (comprehensive UI)
- **Feature 11: Language Support** - Deferred to Sprint v3 (multi-language)
- **Feature 12: Session History** - Deferred to Sprint v3 (history feature)
- **Visual Studio Extension** - Deferred to Phase 3 (Sprint v5-v6)
- **Code-aware dictation** - Future enhancement (Phase 4)
- **Custom vocabularies** - Future enhancement (Phase 4)

---

## Risks & Concerns

- [ ] **Audio Library Compatibility:** Native Node.js audio libraries may have different behavior on Windows/macOS/Linux. Mitigation: Test on all platforms early.
- [ ] **STT Model Availability:** Users need to set up Ollama or vLLM locally. Mitigation: Provide clear setup instructions in README.
- [ ] **Audio Quality:** MP3 encoding quality may affect transcription accuracy. Mitigation: Make format configurable (MP3 vs WAV).
- [ ] **Latency:** Transcription latency depends on model and hardware. Mitigation: Set clear expectations, show progress indicators.
- [ ] **VS Code API Changes:** Extension API may have breaking changes. Mitigation: Lock to specific VS Code version range.

---

## Definition of Done

A feature is considered "done" when:

- [ ] **Code implemented and working** in development environment
- [ ] **Unit tests written and passing** (80%+ coverage for the feature)
- [ ] **Contract tests written** (for API/adapter interactions)
- [ ] **Integration tests written** (for end-to-end workflows)
- [ ] **Code reviewed and approved** by at least one reviewer
- [ ] **Linting passes** (ESLint with no errors)
- [ ] **Type checking passes** (TypeScript strict mode with no errors)
- [ ] **Documentation updated** (JSDoc comments for public APIs)
- [ ] **README updated** (if user-facing changes)
- [ ] **Manual testing completed** on at least 2 platforms (macOS + Windows or Linux)

---

## Estimated Effort

**Feature Complexity Breakdown:**

| Feature | Complexity | Estimated Days | Notes |
|---------|-----------|----------------|-------|
| Feature 1: Model Configuration | Medium | 2 days | Settings API, validation logic |
| Feature 2: Voice Input Toggle | High | 3 days | Audio capture, state management |
| Feature 3: Text Insertion | Low | 1 day | VS Code Editor API |
| Feature 5: VS Code Support | Low | 1 day | Extension setup (already done) |
| Feature 6: Audio Device Selection | Medium | 2 days | Device enumeration, selection logic |
| Feature 7: Model Specification | Low | 1 day | Extends Feature 1 |
| Feature 8: Error Handling | Medium | 2 days | Error classes, logging, UI feedback |
| **Testing & Integration** | - | 2 days | E2E testing, cross-platform validation |

**Total Estimated Effort:** 14 days (2 weeks)

**Buffer:** Built-in (some features may take less time)

---

## Sprint Ceremonies

**Daily Standups:** (If working in a team)
- What did you complete yesterday?
- What are you working on today?
- Any blockers?

**Mid-Sprint Review:** Day 7
- Review progress against sprint plan
- Adjust priorities if needed
- Identify any blockers or risks

**Sprint Review:** End of Week 2
- Demo working features to stakeholders
- Get feedback for Sprint v2

**Sprint Retrospective:** After Sprint Review
- What went well?
- What could be improved?
- Action items for Sprint v2

---

## Testing Strategy for This Sprint

### Unit Tests (80% coverage minimum)
- `ConfigurationManager` - settings read/write, validation
- `EndpointValidator` - URL validation, connectivity tests
- `AudioManager` - audio capture start/stop, buffer management
- `DeviceManager` - device enumeration, selection logic
- `EditorService` - text insertion, cursor handling
- `Voice2CodeEngine` - state management, workflow orchestration

### Contract Tests
- OpenAI Whisper API adapter - request/response format
- Ollama API adapter - request/response format
- Generic adapter - response parsing

### Integration Tests
- End-to-end recording workflow (record → transcribe → insert)
- Configuration workflow (configure → validate → save)
- Error handling workflow (trigger error → display → log)

### Manual Testing Checklist
- [ ] Install extension in VS Code
- [ ] Configure Ollama endpoint
- [ ] Select microphone device
- [ ] Start recording with keyboard shortcut
- [ ] Stop recording and verify transcription
- [ ] Verify text insertion at cursor
- [ ] Test with multiple cursors
- [ ] Test error cases (invalid endpoint, no microphone)
- [ ] Test on Windows and macOS
- [ ] Test in Cursor IDE

---

## Technical Debt & Future Improvements

Items to address in future sprints:
- Streaming transcription for long recordings (Phase 2)
- Audio preprocessing (noise reduction) (Phase 4)
- Custom STT adapter plugin system (Phase 4)
- Performance optimization for large audio buffers (As needed)

---

## Notes

- **Privacy First:** No telemetry, no cloud dependencies, all processing user-controlled
- **DRY Principle:** Avoid code duplication at all costs
- **TDD Workflow:** Write tests before implementation using Speckit
- **Architecture:** Follow layered architecture (UI → Core → Infrastructure)
- **Security:** All secrets stored in VS Code SecretStorage, input validation for all user inputs

---

**Sprint Status:** Planning Complete ✓

**Next Steps:**
1. Run `/prodkit.sprint-tech` to create detailed technical specifications
2. Run `/prodkit.create-issues` to generate GitHub issues for each feature
3. Run `/prodkit.dev` to start implementing features using TDD workflow
