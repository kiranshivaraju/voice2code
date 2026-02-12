# Implementation Plan - Sprint v1

## Overview

Step-by-step implementation plan for all 7 features in Sprint v1, organized by dependency order.

**Duration:** 14 days

---

## Phase 1: Foundation (Days 1-3)

### Step 1.1: TypeScript Types & Interfaces (Day 1)

**Files to create:**
- `src/types/index.ts` - All TypeScript interfaces

**Tasks:**
- [ ] Define EndpointConfiguration interface
- [ ] Define AudioConfiguration interface
- [ ] Define TranscriptionOptions interface
- [ ] Define TranscriptionResult interface
- [ ] Define error type hierarchy (Voice2CodeError, NetworkError, etc.)
- [ ] Define AudioDevice interface
- [ ] Define ValidationResult interface

**Testing:**
- Type checking with `npx tsc --noEmit`

---

### Step 1.2: Configuration Manager (Day 1)

**Files to create:**
- `src/config/configuration-manager.ts`
- `tests/unit/config/configuration-manager.test.ts`

**Implementation order:**
1. Create ConfigurationManager class
2. Implement getEndpointConfig()
3. Implement getAudioConfig()
4. Implement getUI Config()
5. Implement secret storage methods (getApiKey, setApiKey, deleteApiKey)
6. Add validation methods

**TDD Approach:**
- Write test for getEndpointConfig() → Implement
- Write test for VS Code settings integration → Implement
- Write test for SecretStorage integration → Implement

**Testing:**
- Mock vscode.workspace.getConfiguration
- Mock vscode.SecretStorage
- Test all config getters return correct defaults
- Test validation logic

---

### Step 1.3: Endpoint Validator (Day 2)

**Files to create:**
- `src/config/endpoint-validator.ts`
- `tests/unit/config/endpoint-validator.test.ts`

**Functions to implement:**
1. validateEndpointUrl(url: string): ValidationResult
2. validateModelName(name: string): ValidationResult
3. testEndpointConnectivity(url: string): Promise<boolean>

**Test cases:**
- Valid HTTPS URL → pass
- Valid HTTP localhost URL → pass
- HTTP remote URL → warning
- Invalid URL → fail
- Model name with path traversal → fail
- Endpoint connectivity (mock axios) → success/failure

---

## Phase 2: Audio Capture (Days 3-6)

### Step 2.1: Audio Device Manager (Day 3)

**Files to create:**
- `src/audio/device-manager.ts`
- `tests/unit/audio/device-manager.test.ts`

**Implementation:**
1. Enumerate audio devices using Node.js audio library
2. Implement getDevices(): Promise<AudioDevice[]>
3. Handle device connection/disconnection

**Testing:**
- Mock device enumeration
- Test device list parsing
- Test error handling when no devices

---

### Step 2.2: Audio Manager (Days 4-5)

**Files to create:**
- `src/audio/audio-manager.ts`
- `tests/unit/audio/audio-manager.test.ts`

**Implementation:**
1. Install audio capture library (`npm install node-record-lpcm16`)
2. Implement startCapture(deviceId: string)
3. Implement stopCapture(): Promise<Buffer>
4. Buffer audio chunks in memory
5. Concatenate chunks on stop

**Testing:**
- Mock audio library
- Test start/stop lifecycle
- Test buffer accumulation
- Test cleanup after stop

---

### Step 2.3: Audio Encoder (Day 6)

**Files to create:**
- `src/audio/audio-encoder.ts`
- `tests/unit/audio/audio-encoder.test.ts`

**Implementation:**
1. Install FFmpeg bindings or lame encoder
2. Implement encode(audio: Buffer, format: AudioFormat): Promise<Buffer>
3. Support MP3 and WAV formats

**Testing:**
- Mock encoder
- Test WAV → MP3 conversion
- Test buffer input/output

---

## Phase 3: STT Integration (Days 7-9)

### Step 3.1: STT Adapter Interface & Factory (Day 7)

**Files to create:**
- `src/adapters/stt-adapter.ts` (interface)
- `src/adapters/adapter-factory.ts`
- `tests/unit/adapters/adapter-factory.test.ts`

**Implementation:**
1. Define STTAdapter interface
2. Create AdapterFactory to detect provider from URL
3. Factory returns appropriate adapter (Ollama, OpenAI, Generic)

---

### Step 3.2: Ollama Adapter (Day 7-8)

**Files to create:**
- `src/adapters/ollama-adapter.ts`
- `tests/contract/ollama-adapter.test.ts`

**Implementation:**
1. Implement STTAdapter interface
2. transcribe() - POST to /api/generate with base64 audio
3. testConnection() - GET /api/tags
4. Parse response.data.response for text

**Testing (Contract tests):**
- Mock axios
- Test request format (JSON with base64 audio)
- Test response parsing
- Test error handling (404 model not found, ECONNREFUSED)

---

### Step 3.3: OpenAI Whisper Adapter (Day 8-9)

**Files to create:**
- `src/adapters/openai-whisper-adapter.ts`
- `tests/contract/openai-whisper-adapter.test.ts`

**Implementation:**
1. Implement STTAdapter interface
2. transcribe() - POST multipart/form-data
3. Handle Bearer token authentication
4. Parse response.data.text

**Testing:**
- Test FormData request format
- Test Authorization header
- Test 401 authentication errors
- Test 429 rate limiting

---

### Step 3.4: Transcription Service (Day 9)

**Files to create:**
- `src/core/transcription-service.ts`
- `tests/unit/core/transcription-service.test.ts`

**Implementation:**
1. Use AdapterFactory to get correct adapter
2. Implement retry logic with exponential backoff
3. Error handling and transformation

---

## Phase 4: UI & Editor Integration (Days 10-11)

### Step 4.1: Editor Service (Day 10)

**Files to create:**
- `src/core/editor-service.ts`
- `tests/unit/core/editor-service.test.ts`

**Implementation:**
1. insertText(text: string): Promise<void>
2. Handle multiple cursors
3. Preserve undo/redo stack

**Testing:**
- Mock vscode.window.activeTextEditor
- Test single cursor insertion
- Test multi-cursor insertion
- Test error when no editor

---

### Step 4.2: Status Bar Controller (Day 10)

**Files to create:**
- `src/ui/status-bar-controller.ts`
- `tests/unit/ui/status-bar-controller.test.ts`

**Implementation:**
1. Create status bar item
2. update(text, color) method
3. Show/hide methods
4. Icons for different states

---

### Step 4.3: Voice2Code Engine (Day 11)

**Files to create:**
- `src/core/engine.ts`
- `tests/unit/core/engine.test.ts`

**Implementation:**
1. Wire all components together
2. startRecording() workflow
3. stopRecording() workflow
4. toggleRecording()
5. testConnection()

**Testing:**
- Integration tests with all components
- Test full recording → transcription → insertion flow

---

## Phase 5: Extension Entry Point & Commands (Day 12)

### Step 5.1: Update Extension Entry Point

**Files to modify:**
- `src/extension.ts`

**Implementation:**
1. Instantiate all services
2. Register VS Code commands
3. Create status bar
4. Setup keyboard shortcuts

**Commands to register:**
- voice2code.startRecording
- voice2code.stopRecording
- voice2code.toggleRecording
- voice2code.openSettings
- voice2code.testConnection

---

### Step 5.2: Package.json Configuration

**File to modify:**
- `package.json`

**Updates:**
- Add all command contributions
- Add keybindings (Ctrl+Shift+V)
- Add settings schema
- Update dependencies

---

## Phase 6: Integration Testing & Polish (Days 13-14)

### Step 6.1: End-to-End Tests (Day 13)

**Files to create:**
- `tests/e2e/basic-workflow.test.ts`
- `tests/e2e/error-handling.test.ts`

**Test scenarios:**
1. Install extension → configure endpoint → record → transcribe → insert
2. Test with Ollama local instance
3. Test error cases (no microphone, endpoint down)

---

### Step 6.2: Cross-Platform Testing (Day 14)

**Manual testing:**
- [ ] Test on Windows
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Test in Cursor IDE

---

### Step 6.3: Documentation & Polish

- [ ] Update README with setup instructions
- [ ] Add inline code comments
- [ ] Verify all tests pass
- [ ] Run linter and fix issues
- [ ] Check test coverage (>80%)

---

## Dependencies

**Must complete before starting:**
- Phase 1 before Phase 2 (audio needs config)
- Phase 2 before Phase 3 (STT needs audio)
- Phase 3 before Phase 4 (editor needs transcription)
- Phases 1-4 before Phase 5 (extension needs all components)
- Phase 5 before Phase 6 (testing needs working extension)

---

## Estimated Timeline Summary

| Phase | Days | Features Completed |
|-------|------|-------------------|
| Phase 1 | 1-3 | Configuration (F1, F7) |
| Phase 2 | 3-6 | Audio Capture (F6, F2 partial) |
| Phase 3 | 7-9 | STT Integration (F2 complete) |
| Phase 4 | 10-11 | Editor & UI (F3, F8) |
| Phase 5 | 12 | Extension Packaging (F5) |
| Phase 6 | 13-14 | Testing & Polish |

**Total: 14 days**

---

## Daily Checklist Template

**Each day:**
- [ ] Write tests first (TDD)
- [ ] Implement feature
- [ ] Run all tests (npm test)
- [ ] Check coverage (npm run test:coverage)
- [ ] Run linter (npm run lint)
- [ ] Commit changes
- [ ] Update sprint progress

---

## Risk Mitigation

**Audio library compatibility:**
- Test on all platforms early (Day 5)
- Have backup library ready

**STT endpoint availability:**
- Provide mock server for testing
- Document setup clearly

**Performance:**
- Profile audio encoding (Day 6)
- Optimize if latency >500ms

---

**Next Step:** Run `/prodkit.create-issues` to convert this plan into GitHub Issues
