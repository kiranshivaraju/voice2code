# GitHub Issues Template - Sprint v1

This document contains all GitHub issues for Sprint v1 implementation. Each issue can be copied and pasted into GitHub to create the actual issue.

---

## Phase 1: Foundation (Days 1-3)

### Issue #1: [P0][infrastructure] Define TypeScript Types & Interfaces

**Labels:** `infrastructure`, `p0-critical`, `sprint-v1`

**Description:**
Create all TypeScript type definitions and interfaces needed for Sprint v1 features.

**Files to create:**
- `src/types/index.ts`

**Requirements:**
Define the following TypeScript interfaces with strict typing (no `any` types):

1. **EndpointConfiguration**
   ```typescript
   interface EndpointConfiguration {
     url: string;
     model: string;
     timeout: number;
     customHeaders?: Record<string, string>;
   }
   ```

2. **AudioConfiguration**
   ```typescript
   interface AudioConfiguration {
     deviceId: string;
     sampleRate: number;
     format: 'mp3' | 'wav';
   }
   ```

3. **TranscriptionOptions**
   ```typescript
   interface TranscriptionOptions {
     language?: string;
     temperature?: number;
   }
   ```

4. **TranscriptionResult**
   ```typescript
   interface TranscriptionResult {
     text: string;
     confidence?: number;
     language?: string;
   }
   ```

5. **AudioDevice**
   ```typescript
   interface AudioDevice {
     id: string;
     name: string;
     isDefault: boolean;
   }
   ```

6. **ValidationResult**
   ```typescript
   interface ValidationResult {
     valid: boolean;
     errors: string[];
     warnings?: string[];
   }
   ```

7. **Error Type Hierarchy**
   ```typescript
   type ErrorCode = 'NETWORK_ERROR' | 'AUDIO_ERROR' | 'CONFIG_ERROR' | 'STT_ERROR' | 'VALIDATION_ERROR';

   class Voice2CodeError extends Error {
     constructor(message: string, public code: ErrorCode, public details?: unknown);
   }

   class NetworkError extends Voice2CodeError {
     constructor(message: string, details?: unknown) {
       super(message, 'NETWORK_ERROR', details);
     }
   }

   class AudioError extends Voice2CodeError {
     constructor(message: string, details?: unknown) {
       super(message, 'AUDIO_ERROR', details);
     }
   }

   class ConfigurationError extends Voice2CodeError {
     constructor(message: string, details?: unknown) {
       super(message, 'CONFIG_ERROR', details);
     }
   }

   class STTError extends Voice2CodeError {
     constructor(message: string, details?: unknown) {
       super(message, 'STT_ERROR', details);
     }
   }

   class ValidationError extends Voice2CodeError {
     constructor(message: string, details?: unknown) {
       super(message, 'VALIDATION_ERROR', details);
     }
   }
   ```

8. **State Types**
   ```typescript
   type RecordingState = 'idle' | 'recording' | 'processing';
   type TranscriptionState = 'pending' | 'in_progress' | 'completed' | 'failed';
   ```

**Testing:**
- Verify TypeScript compilation with `npx tsc --noEmit`
- Ensure no `any` types are used
- Verify all error classes extend Voice2CodeError correctly

**Definition of Done:**
- [ ] All interfaces defined in `src/types/index.ts`
- [ ] TypeScript strict mode passes with no errors
- [ ] Error hierarchy fully implemented
- [ ] All types exported properly

**Reference:**
See `sprints/v1/tech-docs/data-models.md` for complete specifications.

---

### Issue #2: [P0][feature] Implement ConfigurationManager

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Implement the ConfigurationManager class to handle VS Code settings and SecretStorage integration.

**Files to create:**
- `src/config/configuration-manager.ts`

**Dependencies:**
- Issue #1 (TypeScript types)

**Requirements:**

Implement the ConfigurationManager class with the following signature:

```typescript
export class ConfigurationManager {
  constructor(private context: vscode.ExtensionContext);

  getEndpointConfig(): EndpointConfiguration;
  getAudioConfig(): AudioConfiguration;
  getUIConfig(): UIConfiguration;

  async getApiKey(): Promise<string | undefined>;
  async setApiKey(key: string): Promise<void>;
  async deleteApiKey(): Promise<void>;

  validateEndpointConfig(config: EndpointConfiguration): ValidationResult;
}
```

**Implementation Details:**

1. **getEndpointConfig()**
   - Read from `vscode.workspace.getConfiguration('voice2code')`
   - Return EndpointConfiguration with defaults:
     - url: `http://localhost:11434/api/generate`
     - model: `whisper-large-v3`
     - timeout: `30000`

2. **getAudioConfig()**
   - Read from VS Code settings
   - Return AudioConfiguration with defaults:
     - deviceId: `default`
     - sampleRate: `16000`
     - format: `mp3`

3. **getUIConfig()**
   - Read UI preferences from settings
   - Return UIConfiguration with defaults

4. **getApiKey() / setApiKey() / deleteApiKey()**
   - Use `context.secrets` (SecretStorage API)
   - Key name: `voice2code.apiKey`
   - Handle errors gracefully

5. **validateEndpointConfig()**
   - Validate URL format (regex: `^https?://[a-zA-Z0-9.-]+(:[0-9]{1,5})?(/.*)?$`)
   - Validate model name (regex: `^[a-zA-Z0-9._-]+$`)
   - Validate timeout (min: 1000ms, max: 300000ms)
   - Return ValidationResult

**VS Code Settings Schema:**
Settings should already be defined in `package.json` from repository initialization.

**Error Handling:**
- Throw ConfigurationError for invalid settings
- Log warnings for deprecated configurations

**Definition of Done:**
- [ ] ConfigurationManager class implemented
- [ ] All methods return correct types
- [ ] VS Code Settings integration working
- [ ] SecretStorage integration working
- [ ] Validation logic implemented
- [ ] No `any` types used

**Reference:**
- `sprints/v1/tech-docs/data-models.md` - Configuration Models section
- `sprints/v1/tech-docs/component-design.md` - Component 2

---

### Issue #3: [P0][unit-test] Unit tests for ConfigurationManager

**Labels:** `test`, `p0-critical`, `sprint-v1`

**Description:**
Write comprehensive unit tests for ConfigurationManager using Jest and TDD approach.

**Files to create:**
- `tests/unit/config/configuration-manager.test.ts`

**Dependencies:**
- Issue #2 (ConfigurationManager implementation)

**Test Cases:**

1. **getEndpointConfig() tests**
   - Should return default configuration when no settings exist
   - Should return user configuration when settings exist
   - Should merge user settings with defaults

2. **getAudioConfig() tests**
   - Should return default audio configuration
   - Should respect user audio device selection
   - Should validate sample rate values

3. **SecretStorage tests**
   - Should store API key in SecretStorage
   - Should retrieve API key from SecretStorage
   - Should delete API key from SecretStorage
   - Should return undefined when no API key exists

4. **Validation tests**
   - Valid HTTPS URL should pass
   - Valid HTTP localhost URL should pass
   - HTTP remote URL should return warning
   - Invalid URL should fail validation
   - Model name with path traversal should fail
   - Valid model name should pass
   - Timeout below 1000ms should fail
   - Timeout above 300000ms should fail

**Mocking Strategy:**
- Mock `vscode.workspace.getConfiguration()`
- Mock `vscode.SecretStorage`
- Use Jest mocks for all VS Code APIs

**Coverage Requirements:**
- Minimum 90% code coverage for ConfigurationManager
- All methods must have test coverage
- All error paths must be tested

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Tests pass with `npm test`
- [ ] Code coverage ≥90% for ConfigurationManager
- [ ] Mocks properly implemented
- [ ] Tests follow TDD approach (written before implementation)

**Reference:**
- `sprints/v1/tech-docs/data-models.md` - Validation rules
- `.speckit/constitution.md` - Testing standards

---

### Issue #4: [P0][feature] Implement EndpointValidator

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Implement utility functions for endpoint URL and model name validation, plus connectivity testing.

**Files to create:**
- `src/config/endpoint-validator.ts`

**Dependencies:**
- Issue #1 (TypeScript types)

**Requirements:**

Implement the following functions:

```typescript
export function validateEndpointUrl(url: string): ValidationResult;
export function validateModelName(name: string): ValidationResult;
export async function testEndpointConnectivity(url: string, timeout: number): Promise<boolean>;
```

**Implementation Details:**

1. **validateEndpointUrl(url: string)**
   - Check URL format using regex: `^https?://[a-zA-Z0-9.-]+(:[0-9]{1,5})?(/.*)?$`
   - Valid cases:
     - `https://api.openai.com/v1/audio/transcriptions` → valid
     - `http://localhost:11434/api/generate` → valid
     - `http://192.168.1.100:8000/transcribe` → valid with warning
   - Invalid cases:
     - `ftp://example.com` → invalid (wrong protocol)
     - `http://` → invalid (incomplete)
     - `not-a-url` → invalid
   - Add warning for HTTP (non-HTTPS) remote URLs
   - Return ValidationResult with appropriate errors/warnings

2. **validateModelName(name: string)**
   - Check model name using regex: `^[a-zA-Z0-9._-]+$`
   - Prevent path traversal: `../malicious` → invalid
   - Valid examples:
     - `whisper-large-v3` → valid
     - `openai_whisper` → valid
     - `model.v2` → valid
   - Invalid examples:
     - `../etc/passwd` → invalid
     - `model/path` → invalid
     - `model name` → invalid (spaces)
   - Return ValidationResult

3. **testEndpointConnectivity(url: string, timeout: number)**
   - Make HTTP HEAD or GET request to URL
   - Use axios with timeout
   - Return true if endpoint responds (2xx, 4xx acceptable)
   - Return false on network errors (ECONNREFUSED, timeout)
   - Handle SSL/TLS errors gracefully

**Error Handling:**
- Return ValidationResult with detailed error messages
- Log connectivity errors for debugging

**Definition of Done:**
- [ ] All three functions implemented
- [ ] URL validation with regex working
- [ ] Model name validation working
- [ ] Connectivity testing implemented
- [ ] Error handling for all cases
- [ ] No hardcoded values

**Reference:**
- `sprints/v1/tech-docs/data-models.md` - Validation rules section
- `sprints/v1/tech-docs/component-design.md` - Component 10

---

### Issue #5: [P0][unit-test] Unit tests for EndpointValidator

**Labels:** `test`, `p0-critical`, `sprint-v1`

**Description:**
Write comprehensive unit tests for all EndpointValidator functions.

**Files to create:**
- `tests/unit/config/endpoint-validator.test.ts`

**Dependencies:**
- Issue #4 (EndpointValidator implementation)

**Test Cases:**

1. **validateEndpointUrl() tests**
   - Valid HTTPS URL → pass
   - Valid HTTP localhost URL → pass
   - HTTP remote URL → pass with warning
   - Invalid protocol → fail
   - Malformed URL → fail
   - Empty string → fail
   - URL with invalid port → fail

2. **validateModelName() tests**
   - Valid model name with hyphens → pass
   - Valid model name with underscores → pass
   - Valid model name with dots → pass
   - Path traversal attempt → fail
   - Model name with spaces → fail
   - Model name with slashes → fail
   - Empty string → fail

3. **testEndpointConnectivity() tests**
   - Mock successful connection → return true
   - Mock connection refused → return false
   - Mock timeout → return false
   - Mock SSL error → return false
   - Mock 404 response → return true (endpoint exists but route not found)

**Mocking Strategy:**
- Mock axios for HTTP requests
- Use `jest.mock('axios')` for all connectivity tests
- Mock successful and failed responses

**Coverage Requirements:**
- Minimum 95% code coverage for EndpointValidator
- All validation branches tested
- All error cases tested

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Tests pass with `npm test`
- [ ] Code coverage ≥95%
- [ ] Axios mocks working correctly
- [ ] All regex patterns tested with valid and invalid inputs

**Reference:**
- `sprints/v1/tech-docs/data-models.md` - Validation rules

---

## Phase 2: Audio Capture (Days 3-6)

### Issue #6: [P0][feature] Implement Audio Device Manager

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Implement device enumeration and management for audio input devices.

**Files to create:**
- `src/audio/device-manager.ts`

**Dependencies:**
- Issue #1 (TypeScript types)

**Requirements:**

Implement functions to enumerate and manage audio devices:

```typescript
export class DeviceManager {
  async getDevices(): Promise<AudioDevice[]>;
  async getDefaultDevice(): Promise<AudioDevice>;
  async isDeviceAvailable(deviceId: string): Promise<boolean>;
}
```

**Implementation Details:**

1. **getDevices()**
   - Use Node.js audio library to enumerate input devices
   - Research options: `node-record-lpcm16`, `node-microphone`, or platform-specific APIs
   - Return array of AudioDevice objects
   - Mark default device with `isDefault: true`
   - Handle cases where no devices are available

2. **getDefaultDevice()**
   - Return the system default audio input device
   - Throw AudioError if no default device exists

3. **isDeviceAvailable(deviceId: string)**
   - Check if device ID is in current device list
   - Return boolean

**Platform Support:**
- Windows: DirectSound/WASAPI
- macOS: CoreAudio
- Linux: ALSA/PulseAudio

**Error Handling:**
- Throw AudioError when device enumeration fails
- Handle permission errors (microphone access denied)
- Log device changes for debugging

**Definition of Done:**
- [ ] DeviceManager class implemented
- [ ] Device enumeration working on at least one platform
- [ ] Default device detection working
- [ ] Error handling for permission denied
- [ ] Cross-platform compatibility considered

**Reference:**
- `sprints/v1/tech-docs/data-models.md` - AudioDevice interface
- `sprints/v1/tech-docs/component-design.md` - Audio components

---

### Issue #7: [P0][unit-test] Unit tests for Device Manager

**Labels:** `test`, `p0-critical`, `sprint-v1`

**Description:**
Write unit tests for DeviceManager with mocked audio library.

**Files to create:**
- `tests/unit/audio/device-manager.test.ts`

**Dependencies:**
- Issue #6 (DeviceManager implementation)

**Test Cases:**

1. **getDevices() tests**
   - Should return list of devices
   - Should mark default device correctly
   - Should return empty array when no devices
   - Should handle enumeration errors

2. **getDefaultDevice() tests**
   - Should return default device
   - Should throw AudioError when no default device

3. **isDeviceAvailable() tests**
   - Should return true for available device
   - Should return false for unavailable device

**Mocking Strategy:**
- Mock audio library device enumeration
- Mock permission errors
- Mock device connection/disconnection

**Coverage Requirements:**
- Minimum 90% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Tests pass
- [ ] Code coverage ≥90%
- [ ] Audio library properly mocked

---

### Issue #8: [P1][feature] Implement AudioManager

**Labels:** `feature`, `p1-high`, `sprint-v1`

**Description:**
Implement audio capture functionality with start/stop lifecycle and buffer management.

**Files to create:**
- `src/audio/audio-manager.ts`

**Dependencies:**
- Issue #1 (TypeScript types)
- Issue #6 (DeviceManager)

**Requirements:**

Implement the AudioManager class:

```typescript
export class AudioManager {
  constructor(private deviceManager: DeviceManager);

  async startCapture(deviceId: string): Promise<void>;
  async stopCapture(): Promise<Buffer>;
  isCapturing(): boolean;
}
```

**Implementation Details:**

1. **Audio Library Selection**
   - Install `node-record-lpcm16` or similar library
   - Configure for 16kHz sample rate (configurable)
   - Support WAV and MP3 formats

2. **startCapture(deviceId: string)**
   - Verify device is available using DeviceManager
   - Start audio recording stream
   - Buffer audio chunks in memory array
   - Throw AudioError if already capturing
   - Throw AudioError if device not available

3. **stopCapture()**
   - Stop recording stream
   - Concatenate all audio chunks into single Buffer
   - Clear chunk array
   - Return concatenated audio buffer
   - Throw AudioError if not currently capturing

4. **State Management**
   - Track recording state (`idle` | `recording`)
   - Prevent multiple simultaneous recordings
   - Clean up resources on stop

**Audio Format:**
- Sample rate: 16000 Hz (default, configurable)
- Channels: Mono (1 channel)
- Bit depth: 16-bit PCM
- Format: WAV (raw) before encoding

**Memory Management:**
- Implement maximum recording duration (e.g., 5 minutes)
- Estimate buffer size: 16kHz * 2 bytes * 60 seconds = ~1.92MB per minute
- Throw AudioError if recording exceeds maximum duration

**Error Handling:**
- Handle microphone permission errors
- Handle device disconnection during recording
- Clean up resources on errors

**Definition of Done:**
- [ ] AudioManager class implemented
- [ ] startCapture() working
- [ ] stopCapture() returns valid audio buffer
- [ ] State management prevents multiple captures
- [ ] Error handling for all edge cases
- [ ] Memory cleanup on stop

**Reference:**
- `sprints/v1/tech-docs/component-design.md` - Component 4
- `sprints/v1/tech-docs/data-models.md` - AudioConfiguration

---

### Issue #9: [P1][unit-test] Unit tests for AudioManager

**Labels:** `test`, `p1-high`, `sprint-v1`

**Description:**
Write comprehensive unit tests for AudioManager.

**Files to create:**
- `tests/unit/audio/audio-manager.test.ts`

**Dependencies:**
- Issue #8 (AudioManager implementation)

**Test Cases:**

1. **startCapture() tests**
   - Should start recording successfully
   - Should throw error if already recording
   - Should throw error if device unavailable
   - Should verify device via DeviceManager

2. **stopCapture() tests**
   - Should return audio buffer
   - Should throw error if not recording
   - Should concatenate chunks correctly
   - Should clear internal buffer after stop

3. **State management tests**
   - isCapturing() should return false initially
   - isCapturing() should return true after start
   - isCapturing() should return false after stop

4. **Buffer management tests**
   - Should accumulate audio chunks
   - Should handle empty recording
   - Should enforce maximum duration

**Mocking Strategy:**
- Mock audio library (node-record-lpcm16)
- Mock DeviceManager
- Mock audio stream events

**Coverage Requirements:**
- Minimum 85% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Tests pass
- [ ] Code coverage ≥85%
- [ ] Audio library mocked properly

---

### Issue #10: [P1][feature] Implement AudioEncoder

**Labels:** `feature`, `p1-high`, `sprint-v1`

**Description:**
Implement audio encoding to convert raw PCM audio to MP3 or WAV format.

**Files to create:**
- `src/audio/audio-encoder.ts`

**Dependencies:**
- Issue #1 (TypeScript types)

**Requirements:**

Implement the AudioEncoder class:

```typescript
export class AudioEncoder {
  async encode(audio: Buffer, format: AudioFormat): Promise<Buffer>;
}
```

**Implementation Details:**

1. **Encoder Library**
   - Research options: `lame` (MP3), `ffmpeg.js`, or call FFmpeg binary
   - Prefer native Node.js library for cross-platform support
   - Fallback to FFmpeg binary if needed

2. **encode(audio: Buffer, format: AudioFormat)**
   - Input: Raw PCM audio buffer (16kHz, mono, 16-bit)
   - Output: Encoded audio (MP3 or WAV)
   - For MP3: Use LAME encoder with quality settings
   - For WAV: Add WAV header to PCM data
   - Return encoded buffer

3. **Encoding Settings**
   - MP3 bitrate: 64kbps (voice optimized)
   - MP3 quality: 5 (good quality/size balance)
   - WAV: Standard PCM format

**Performance:**
- Encoding should complete in <500ms for 1-minute audio
- Profile and optimize if needed

**Error Handling:**
- Throw AudioError if encoding fails
- Handle invalid input buffers
- Log encoding errors with details

**Definition of Done:**
- [ ] AudioEncoder class implemented
- [ ] MP3 encoding working
- [ ] WAV encoding working
- [ ] Performance acceptable (<500ms per minute)
- [ ] Error handling implemented

**Reference:**
- `sprints/v1/tech-docs/data-models.md` - AudioConfiguration
- `sprints/v1/tech-docs/component-design.md` - Component 5

---

### Issue #11: [P1][unit-test] Unit tests for AudioEncoder

**Labels:** `test`, `p1-high`, `sprint-v1`

**Description:**
Write unit tests for AudioEncoder with mocked encoding library.

**Files to create:**
- `tests/unit/audio/audio-encoder.test.ts`

**Dependencies:**
- Issue #10 (AudioEncoder implementation)

**Test Cases:**

1. **encode() tests**
   - Should encode to MP3 format
   - Should encode to WAV format
   - Should handle empty buffer
   - Should throw error for invalid format
   - Should preserve audio quality

2. **Performance tests**
   - Should complete encoding in reasonable time
   - Should handle large buffers

**Mocking Strategy:**
- Mock encoding library (lame or ffmpeg)
- Mock buffer operations
- Test with sample audio data

**Coverage Requirements:**
- Minimum 85% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Tests pass
- [ ] Code coverage ≥85%
- [ ] Performance verified

---

## Phase 3: STT Integration (Days 7-9)

### Issue #12: [P0][infrastructure] Define STT Adapter Interface and Factory

**Labels:** `infrastructure`, `p0-critical`, `sprint-v1`

**Description:**
Create the STTAdapter interface and AdapterFactory for provider abstraction.

**Files to create:**
- `src/adapters/stt-adapter.ts` (interface)
- `src/adapters/adapter-factory.ts`

**Dependencies:**
- Issue #1 (TypeScript types)

**Requirements:**

1. **STTAdapter Interface**
   ```typescript
   export interface STTAdapter {
     transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;
     testConnection(): Promise<boolean>;
     getProviderName(): string;
   }
   ```

2. **AdapterFactory**
   ```typescript
   export class AdapterFactory {
     createAdapter(endpointUrl: string, apiKey?: string): STTAdapter;
   }
   ```

**Implementation Details:**

1. **STTAdapter Interface**
   - `transcribe()`: Send audio to STT endpoint, return transcription
   - `testConnection()`: Verify endpoint is reachable
   - `getProviderName()`: Return provider identifier (e.g., "ollama", "openai")

2. **AdapterFactory.createAdapter()**
   - Detect provider from URL:
     - `localhost:11434` → OllamaAdapter
     - `/v1/audio/transcriptions` → OpenAIWhisperAdapter
     - Otherwise → GenericAdapter (future)
   - Pass API key if provided
   - Return appropriate adapter instance

**Provider Detection Logic:**
```typescript
if (url.includes('localhost:11434') || url.includes('ollama')) {
  return new OllamaAdapter(url);
} else if (url.includes('/v1/audio/transcriptions')) {
  return new OpenAIWhisperAdapter(url, apiKey);
} else {
  throw new ConfigurationError('Unsupported STT provider URL');
}
```

**Definition of Done:**
- [ ] STTAdapter interface defined
- [ ] AdapterFactory implemented
- [ ] Provider detection logic working
- [ ] Factory returns correct adapter types

**Reference:**
- `sprints/v1/tech-docs/api-endpoints.md` - STT Adapter Interface section
- `sprints/v1/tech-docs/component-design.md` - Layer 4

---

### Issue #13: [P0][unit-test] Unit tests for AdapterFactory

**Labels:** `test`, `p0-critical`, `sprint-v1`

**Description:**
Write unit tests for AdapterFactory provider detection.

**Files to create:**
- `tests/unit/adapters/adapter-factory.test.ts`

**Dependencies:**
- Issue #12 (AdapterFactory implementation)

**Test Cases:**

1. **createAdapter() tests**
   - Ollama URL → returns OllamaAdapter
   - OpenAI URL → returns OpenAIWhisperAdapter
   - Unknown URL → throws ConfigurationError
   - URL with API key → passes key to adapter

**Coverage Requirements:**
- Minimum 95% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Tests pass
- [ ] Code coverage ≥95%

---

### Issue #14: [P0][feature] Implement OllamaAdapter

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Implement STT adapter for Ollama API integration.

**Files to create:**
- `src/adapters/ollama-adapter.ts`

**Dependencies:**
- Issue #12 (STTAdapter interface)

**Requirements:**

Implement OllamaAdapter class that implements STTAdapter:

```typescript
export class OllamaAdapter implements STTAdapter {
  constructor(private endpointUrl: string);

  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;
  async testConnection(): Promise<boolean>;
  getProviderName(): string;
}
```

**Implementation Details:**

1. **transcribe() method**
   - Endpoint: `POST /api/generate`
   - Request format:
     ```json
     {
       "model": "whisper-large-v3",
       "prompt": "<base64-encoded-audio>",
       "stream": false
     }
     ```
   - Convert audio Buffer to base64
   - Set `Content-Type: application/json`
   - Parse response:
     ```json
     {
       "response": "transcribed text here",
       "done": true
     }
     ```
   - Extract `response.data.response` as transcription text
   - Return TranscriptionResult with text

2. **testConnection() method**
   - Endpoint: `GET /api/tags`
   - Return true if 200 OK
   - Return false on network errors

3. **Error Handling**
   - 404 Model not found → throw STTError with message
   - ECONNREFUSED → throw NetworkError
   - Timeout → throw NetworkError
   - 500 Server error → throw STTError

**HTTP Client:**
- Use axios for all requests
- Set timeout from configuration
- Add retry logic (handled by TranscriptionService)

**Definition of Done:**
- [ ] OllamaAdapter class implemented
- [ ] transcribe() working with Ollama API format
- [ ] testConnection() implemented
- [ ] Error handling for all error codes
- [ ] Base64 encoding working correctly

**Reference:**
- `sprints/v1/tech-docs/api-endpoints.md` - Ollama API section
- `sprints/v1/tech-docs/component-design.md` - Component 8

---

### Issue #15: [P0][contract-test] Contract tests for OllamaAdapter

**Labels:** `test`, `contract-test`, `p0-critical`, `sprint-v1`

**Description:**
Write contract tests for OllamaAdapter to verify API integration.

**Files to create:**
- `tests/contract/ollama-adapter.test.ts`

**Dependencies:**
- Issue #14 (OllamaAdapter implementation)

**Test Cases:**

1. **transcribe() contract tests**
   - Mock successful Ollama response → verify text extraction
   - Mock 404 model not found → verify STTError thrown
   - Mock ECONNREFUSED → verify NetworkError thrown
   - Mock timeout → verify NetworkError thrown
   - Verify request format (JSON, base64 audio)

2. **testConnection() contract tests**
   - Mock successful /api/tags response → return true
   - Mock connection error → return false

**Mocking Strategy:**
- Use `jest.mock('axios')` to mock HTTP requests
- Verify request format matches Ollama API spec
- Verify response parsing logic

**Coverage Requirements:**
- Minimum 90% code coverage for OllamaAdapter

**Definition of Done:**
- [ ] All contract test cases implemented
- [ ] Tests pass
- [ ] Code coverage ≥90%
- [ ] Request/response formats verified against Ollama API docs

**Reference:**
- `sprints/v1/tech-docs/api-endpoints.md` - Ollama API format

---

### Issue #16: [P0][feature] Implement OpenAIWhisperAdapter

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Implement STT adapter for OpenAI Whisper API (and vLLM-compatible endpoints).

**Files to create:**
- `src/adapters/openai-whisper-adapter.ts`

**Dependencies:**
- Issue #12 (STTAdapter interface)

**Requirements:**

Implement OpenAIWhisperAdapter class:

```typescript
export class OpenAIWhisperAdapter implements STTAdapter {
  constructor(private endpointUrl: string, private apiKey?: string);

  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;
  async testConnection(): Promise<boolean>;
  getProviderName(): string;
}
```

**Implementation Details:**

1. **transcribe() method**
   - Endpoint: `POST /v1/audio/transcriptions`
   - Request format: `multipart/form-data`
   - Form fields:
     - `file`: audio file (Buffer with filename `audio.mp3`)
     - `model`: model name from config
     - `language`: from TranscriptionOptions (optional)
     - `temperature`: from TranscriptionOptions (optional)
   - Headers:
     - `Content-Type: multipart/form-data`
     - `Authorization: Bearer {apiKey}` (if apiKey provided)
   - Response format:
     ```json
     {
       "text": "Transcribed text here.",
       "language": "en",
       "duration": 5.2
     }
     ```
   - Extract `response.data.text`
   - Return TranscriptionResult

2. **testConnection() method**
   - Endpoint: `GET /v1/models`
   - Include Authorization header if apiKey present
   - Return true if 200 OK
   - Return false on errors

3. **Error Handling**
   - 401 Unauthorized → throw STTError("Invalid API key")
   - 429 Rate limit → throw STTError("Rate limit exceeded")
   - ECONNREFUSED → throw NetworkError
   - Timeout → throw NetworkError

**FormData Usage:**
- Use `form-data` package for multipart/form-data
- Attach audio buffer with correct MIME type

**Definition of Done:**
- [ ] OpenAIWhisperAdapter implemented
- [ ] multipart/form-data request working
- [ ] Authorization header added when apiKey present
- [ ] Response parsing working
- [ ] Error handling for 401, 429, network errors

**Reference:**
- `sprints/v1/tech-docs/api-endpoints.md` - vLLM/OpenAI Whisper section
- `sprints/v1/tech-docs/component-design.md` - Component 9

---

### Issue #17: [P0][contract-test] Contract tests for OpenAIWhisperAdapter

**Labels:** `test`, `contract-test`, `p0-critical`, `sprint-v1`

**Description:**
Write contract tests for OpenAIWhisperAdapter.

**Files to create:**
- `tests/contract/openai-whisper-adapter.test.ts`

**Dependencies:**
- Issue #16 (OpenAIWhisperAdapter implementation)

**Test Cases:**

1. **transcribe() contract tests**
   - Mock successful response → verify text extraction
   - Mock 401 Unauthorized → verify STTError
   - Mock 429 Rate limit → verify STTError
   - Mock network error → verify NetworkError
   - Verify FormData format
   - Verify Authorization header when apiKey present

2. **testConnection() contract tests**
   - Mock successful /v1/models → return true
   - Mock 401 → return false
   - Mock network error → return false

**Mocking Strategy:**
- Mock axios POST/GET requests
- Verify multipart/form-data structure
- Verify headers (Authorization, Content-Type)

**Coverage Requirements:**
- Minimum 90% code coverage

**Definition of Done:**
- [ ] All contract tests implemented
- [ ] Tests pass
- [ ] Code coverage ≥90%
- [ ] FormData structure verified

---

### Issue #18: [P1][feature] Implement TranscriptionService

**Labels:** `feature`, `p1-high`, `sprint-v1`

**Description:**
Implement the TranscriptionService orchestrator with retry logic and error transformation.

**Files to create:**
- `src/core/transcription-service.ts`

**Dependencies:**
- Issue #2 (ConfigurationManager)
- Issue #12 (AdapterFactory)
- Issue #14 (OllamaAdapter)
- Issue #16 (OpenAIWhisperAdapter)

**Requirements:**

Implement TranscriptionService class:

```typescript
export class TranscriptionService {
  constructor(
    private configManager: ConfigurationManager,
    private adapterFactory: AdapterFactory
  );

  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;
  async testConnection(): Promise<boolean>;
}
```

**Implementation Details:**

1. **transcribe() method**
   - Get endpoint config from ConfigurationManager
   - Get API key from ConfigurationManager (if needed)
   - Use AdapterFactory to create appropriate adapter
   - Call adapter.transcribe() with retry logic
   - Return TranscriptionResult

2. **Retry Logic**
   - Implement exponential backoff
   - Max retries: 3
   - Initial delay: 1000ms
   - Backoff multiplier: 2x
   - Only retry on NetworkError (not on STTError)
   - Log each retry attempt

3. **testConnection() method**
   - Get endpoint config
   - Create adapter
   - Call adapter.testConnection()
   - Return result

4. **Error Transformation**
   - Catch adapter errors
   - Add context (endpoint URL, model name)
   - Re-throw with enhanced error message

**Retry Implementation:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; initialDelay: number }
): Promise<T> {
  let lastError: Error;
  for (let i = 0; i <= options.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < options.maxRetries && error instanceof NetworkError) {
        const delay = options.initialDelay * Math.pow(2, i);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError!;
}
```

**Definition of Done:**
- [ ] TranscriptionService implemented
- [ ] Retry logic with exponential backoff working
- [ ] Error transformation implemented
- [ ] testConnection() working
- [ ] Integration with AdapterFactory working

**Reference:**
- `sprints/v1/tech-docs/component-design.md` - Component 3

---

### Issue #19: [P1][unit-test] Unit tests for TranscriptionService

**Labels:** `test`, `p1-high`, `sprint-v1`

**Description:**
Write unit tests for TranscriptionService including retry logic.

**Files to create:**
- `tests/unit/core/transcription-service.test.ts`

**Dependencies:**
- Issue #18 (TranscriptionService implementation)

**Test Cases:**

1. **transcribe() tests**
   - Successful transcription → return result
   - Network error with retry → succeed on retry
   - Network error max retries → throw NetworkError
   - STT error → no retry, throw immediately
   - Verify retry delays (1s, 2s, 4s)

2. **testConnection() tests**
   - Successful connection test → return true
   - Failed connection test → return false

**Mocking Strategy:**
- Mock ConfigurationManager
- Mock AdapterFactory
- Mock STTAdapter instances
- Spy on adapter.transcribe() to verify retries

**Coverage Requirements:**
- Minimum 90% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Retry logic tested thoroughly
- [ ] Tests pass
- [ ] Code coverage ≥90%

---

## Phase 4: UI & Editor Integration (Days 10-11)

### Issue #20: [P1][feature] Implement EditorService

**Labels:** `feature`, `p1-high`, `sprint-v1`

**Description:**
Implement EditorService for inserting transcribed text into VS Code editor.

**Files to create:**
- `src/core/editor-service.ts`

**Dependencies:**
- Issue #1 (TypeScript types)

**Requirements:**

Implement EditorService class:

```typescript
export class EditorService {
  async insertText(text: string): Promise<void>;
  getActiveEditor(): vscode.TextEditor | undefined;
}
```

**Implementation Details:**

1. **insertText(text: string)**
   - Get active text editor: `vscode.window.activeTextEditor`
   - Throw ValidationError if no active editor
   - Use `editor.edit()` to insert text
   - Insert at all cursor positions (multi-cursor support)
   - Preserve undo/redo stack
   - Handle selections (replace selected text)

2. **Multi-cursor Support**
   ```typescript
   await editor.edit((editBuilder) => {
     editor.selections.forEach((selection) => {
       editBuilder.insert(selection.active, text);
     });
   });
   ```

3. **getActiveEditor()**
   - Return `vscode.window.activeTextEditor`
   - Return undefined if no editor

**Error Handling:**
- Throw ValidationError("No active editor") if editor is undefined
- Handle edit operation failures

**Definition of Done:**
- [ ] EditorService implemented
- [ ] insertText() working with single cursor
- [ ] insertText() working with multiple cursors
- [ ] Undo/redo preserved
- [ ] Error handling for no active editor

**Reference:**
- `sprints/v1/tech-docs/component-design.md` - Component 7

---

### Issue #21: [P1][unit-test] Unit tests for EditorService

**Labels:** `test`, `p1-high`, `sprint-v1`

**Description:**
Write unit tests for EditorService with mocked VS Code API.

**Files to create:**
- `tests/unit/core/editor-service.test.ts`

**Dependencies:**
- Issue #20 (EditorService implementation)

**Test Cases:**

1. **insertText() tests**
   - Single cursor → text inserted at cursor
   - Multiple cursors → text inserted at all positions
   - Selected text → text replaces selection
   - No active editor → throws ValidationError

2. **getActiveEditor() tests**
   - Active editor exists → return editor
   - No active editor → return undefined

**Mocking Strategy:**
- Mock `vscode.window.activeTextEditor`
- Mock `editor.edit()` method
- Mock selections array

**Coverage Requirements:**
- Minimum 90% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Multi-cursor scenarios tested
- [ ] Tests pass
- [ ] Code coverage ≥90%

---

### Issue #22: [P1][feature] Implement StatusBarController

**Labels:** `feature`, `p1-high`, `sprint-v1`

**Description:**
Implement status bar UI controller for recording state indication.

**Files to create:**
- `src/ui/status-bar-controller.ts`

**Dependencies:**
- Issue #1 (TypeScript types)

**Requirements:**

Implement StatusBarController class:

```typescript
export class StatusBarController {
  constructor(context: vscode.ExtensionContext);

  update(text: string, color?: string): void;
  show(): void;
  hide(): void;
  dispose(): void;
}
```

**Implementation Details:**

1. **Constructor**
   - Create status bar item: `vscode.window.createStatusBarItem()`
   - Alignment: `vscode.StatusBarAlignment.Right`
   - Priority: 100
   - Add to context.subscriptions for cleanup

2. **update(text: string, color?: string)**
   - Set `statusBarItem.text = text`
   - Set `statusBarItem.color = color` (if provided)
   - Show status bar

3. **State-specific updates**
   - Idle: `$(mic) Voice2Code` (white)
   - Recording: `$(record) Recording...` (red)
   - Processing: `$(sync~spin) Transcribing...` (yellow)
   - Success: `$(check) Inserted` (green)
   - Error: `$(error) Error` (red)

4. **Icons**
   - Use VS Code Codicons: `$(icon-name)`
   - Recording: `$(record)`
   - Microphone: `$(mic)`
   - Processing: `$(sync~spin)`
   - Success: `$(check)`
   - Error: `$(error)`

5. **show() / hide()**
   - Call `statusBarItem.show()` or `statusBarItem.hide()`

6. **dispose()**
   - Clean up status bar item

**Definition of Done:**
- [ ] StatusBarController implemented
- [ ] update() sets text and color
- [ ] Codicons working
- [ ] show/hide working
- [ ] Proper disposal in cleanup

**Reference:**
- `sprints/v1/tech-docs/component-design.md` - Component 6
- VS Code Codicons: https://code.visualstudio.com/api/references/icons-in-labels

---

### Issue #23: [P1][unit-test] Unit tests for StatusBarController

**Labels:** `test`, `p1-high`, `sprint-v1`

**Description:**
Write unit tests for StatusBarController.

**Files to create:**
- `tests/unit/ui/status-bar-controller.test.ts`

**Dependencies:**
- Issue #22 (StatusBarController implementation)

**Test Cases:**

1. **update() tests**
   - Should update text
   - Should update color
   - Should show status bar after update

2. **show/hide tests**
   - Should show status bar
   - Should hide status bar

3. **dispose() tests**
   - Should dispose status bar item

**Mocking Strategy:**
- Mock `vscode.window.createStatusBarItem()`
- Mock StatusBarItem methods

**Coverage Requirements:**
- Minimum 90% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Tests pass
- [ ] Code coverage ≥90%

---

### Issue #24: [P0][feature] Implement Voice2CodeEngine

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Implement the main orchestrator that wires all components together.

**Files to create:**
- `src/core/engine.ts`

**Dependencies:**
- Issue #2 (ConfigurationManager)
- Issue #8 (AudioManager)
- Issue #18 (TranscriptionService)
- Issue #20 (EditorService)
- Issue #22 (StatusBarController)

**Requirements:**

Implement Voice2CodeEngine class:

```typescript
export class Voice2CodeEngine {
  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigurationManager,
    private audioManager: AudioManager,
    private transcriptionService: TranscriptionService,
    private editorService: EditorService,
    private statusBar: StatusBarController
  );

  async startRecording(): Promise<void>;
  async stopRecording(): Promise<void>;
  async toggleRecording(): Promise<void>;
  async testConnection(): Promise<boolean>;
  openSettings(): void;

  get isRecording(): boolean;
}
```

**State:**
```typescript
private _recordingState: RecordingState = 'idle';
```

**Implementation Details:**

1. **startRecording()**
   - Check `_recordingState !== 'recording'`
   - Get audio config from ConfigurationManager
   - Update status bar: "Recording..." (red)
   - Start audio capture via AudioManager
   - Set `_recordingState = 'recording'`
   - Show notification: "Recording started"

2. **stopRecording()**
   - Check `_recordingState === 'recording'`
   - Update status bar: "Transcribing..." (yellow)
   - Stop audio capture, get buffer
   - Set `_recordingState = 'processing'`
   - Encode audio to MP3 via AudioEncoder
   - Call TranscriptionService.transcribe()
   - Insert text via EditorService
   - Update status bar: "Inserted" (green)
   - Set `_recordingState = 'idle'`
   - Cleanup audio buffer
   - Show notification: "Text inserted"

3. **Error Handling in stopRecording()**
   - Catch all errors
   - Update status bar: "Error" (red)
   - Set `_recordingState = 'idle'`
   - Show error notification with error message
   - Log error details

4. **toggleRecording()**
   - If `_recordingState === 'idle'` → call startRecording()
   - If `_recordingState === 'recording'` → call stopRecording()
   - If `_recordingState === 'processing'` → show warning "Already processing"

5. **testConnection()**
   - Call TranscriptionService.testConnection()
   - Return result
   - Show notification with result

6. **openSettings()**
   - Execute: `vscode.commands.executeCommand('workbench.action.openSettings', 'voice2code')`

**Workflow Diagram:**
```
User presses Ctrl+Shift+V (toggle)
  → startRecording()
    → Status bar: "Recording..."
    → AudioManager.startCapture()

User presses Ctrl+Shift+V again
  → stopRecording()
    → Status bar: "Transcribing..."
    → AudioManager.stopCapture() → Buffer
    → AudioEncoder.encode() → MP3
    → TranscriptionService.transcribe() → Text
    → EditorService.insertText()
    → Status bar: "Inserted"
```

**Definition of Done:**
- [ ] Voice2CodeEngine implemented
- [ ] startRecording() workflow working
- [ ] stopRecording() workflow working
- [ ] toggleRecording() working
- [ ] Error handling comprehensive
- [ ] Status bar updates at each step
- [ ] All components integrated

**Reference:**
- `sprints/v1/tech-docs/component-design.md` - Component 1
- `sprints/v1/tech-docs/implementation-plan.md` - Phase 4

---

### Issue #25: [P0][unit-test] Unit tests for Voice2CodeEngine

**Labels:** `test`, `p0-critical`, `sprint-v1`

**Description:**
Write comprehensive integration tests for Voice2CodeEngine.

**Files to create:**
- `tests/unit/core/engine.test.ts`

**Dependencies:**
- Issue #24 (Voice2CodeEngine implementation)

**Test Cases:**

1. **startRecording() tests**
   - Should start recording successfully
   - Should update status bar
   - Should change state to 'recording'
   - Should throw error if already recording

2. **stopRecording() tests**
   - Should complete full workflow
   - Should update status bar at each step
   - Should insert text into editor
   - Should return to 'idle' state
   - Should handle errors gracefully

3. **toggleRecording() tests**
   - Should start when idle
   - Should stop when recording
   - Should warn when processing

4. **testConnection() tests**
   - Should return true on success
   - Should return false on failure

5. **Full workflow integration test**
   - Start → Stop → Verify text inserted
   - Mock all dependencies
   - Verify correct call sequence

**Mocking Strategy:**
- Mock all dependencies (ConfigManager, AudioManager, etc.)
- Mock successful and failed scenarios
- Verify method call order

**Coverage Requirements:**
- Minimum 85% code coverage

**Definition of Done:**
- [ ] All test cases implemented
- [ ] Integration workflow tested
- [ ] Tests pass
- [ ] Code coverage ≥85%

---

## Phase 5: Extension Entry Point & Commands (Day 12)

### Issue #26: [P0][feature] Update Extension Entry Point

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Update `extension.ts` to instantiate all services and register VS Code commands.

**Files to modify:**
- `src/extension.ts`

**Dependencies:**
- All previous issues (complete system)

**Requirements:**

Update the `activate()` function to:

1. **Instantiate Services**
   ```typescript
   const configManager = new ConfigurationManager(context);
   const deviceManager = new DeviceManager();
   const audioManager = new AudioManager(deviceManager);
   const audioEncoder = new AudioEncoder();
   const adapterFactory = new AdapterFactory();
   const transcriptionService = new TranscriptionService(configManager, adapterFactory);
   const editorService = new EditorService();
   const statusBar = new StatusBarController(context);

   const engine = new Voice2CodeEngine(
     context,
     configManager,
     audioManager,
     transcriptionService,
     editorService,
     statusBar
   );
   ```

2. **Register Commands**
   - `voice2code.startRecording` → engine.startRecording()
   - `voice2code.stopRecording` → engine.stopRecording()
   - `voice2code.toggleRecording` → engine.toggleRecording()
   - `voice2code.testConnection` → engine.testConnection()
   - `voice2code.openSettings` → engine.openSettings()

3. **Add to Subscriptions**
   - Add all commands to `context.subscriptions`
   - Add statusBar to subscriptions

4. **Error Handling**
   - Wrap command handlers in try-catch
   - Show error notifications on failures
   - Log errors for debugging

**Implementation:**
```typescript
export function activate(context: vscode.ExtensionContext): void {
  // Instantiate services
  const configManager = new ConfigurationManager(context);
  // ... other services

  const engine = new Voice2CodeEngine(...);

  // Register commands
  const toggleCmd = vscode.commands.registerCommand(
    'voice2code.toggleRecording',
    async () => {
      try {
        await engine.toggleRecording();
      } catch (error) {
        vscode.window.showErrorMessage(`Voice2Code: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(toggleCmd, ...);
}

export function deactivate(): void {
  // Cleanup if needed
}
```

**Definition of Done:**
- [ ] All services instantiated in activate()
- [ ] All 5 commands registered
- [ ] Commands added to subscriptions
- [ ] Error handling for all commands
- [ ] deactivate() implemented (if needed)

**Reference:**
- `sprints/v1/tech-docs/implementation-plan.md` - Phase 5

---

### Issue #27: [P0][feature] Update package.json Configuration

**Labels:** `feature`, `p0-critical`, `sprint-v1`

**Description:**
Verify and update `package.json` with all command contributions, settings, and dependencies.

**Files to modify:**
- `package.json`

**Dependencies:**
- Repository initialization (already done)

**Requirements:**

1. **Verify Commands**
   - All 5 commands defined in `contributes.commands`
   - Titles match command IDs

2. **Verify Keybindings**
   - `Ctrl+Shift+V` (Windows/Linux) → voice2code.toggleRecording
   - `Cmd+Shift+V` (macOS) → voice2code.toggleRecording

3. **Verify Configuration Schema**
   - `voice2code.endpoint.url`
   - `voice2code.endpoint.model`
   - `voice2code.endpoint.timeout`
   - `voice2code.audio.deviceId`
   - `voice2code.audio.sampleRate`
   - `voice2code.audio.format`
   - All with correct types and defaults

4. **Verify Dependencies**
   - `axios` - HTTP client
   - `form-data` - Multipart form data
   - Audio library (e.g., `node-record-lpcm16`)
   - Audio encoder (e.g., `lame`)

5. **Verify Dev Dependencies**
   - `@types/vscode`
   - `typescript`
   - `jest`, `@types/jest`
   - `eslint`, `prettier`
   - `webpack`, `ts-loader`

6. **Scripts**
   - `compile`: TypeScript compilation
   - `watch`: Watch mode
   - `test`: Jest tests
   - `lint`: ESLint
   - `package`: VSIX packaging

**Definition of Done:**
- [ ] All commands present in package.json
- [ ] Keybindings configured
- [ ] Settings schema complete
- [ ] All dependencies added
- [ ] Scripts working

**Reference:**
- `sprints/v1/tech-docs/api-endpoints.md` - Command list
- `sprints/v1/tech-docs/data-models.md` - Configuration models

---

## Phase 6: Integration Testing & Polish (Days 13-14)

### Issue #28: [P1][e2e-test] End-to-End Tests - Basic Workflow

**Labels:** `test`, `e2e-test`, `p1-high`, `sprint-v1`

**Description:**
Write E2E tests for the complete user workflow.

**Files to create:**
- `tests/e2e/basic-workflow.test.ts`

**Dependencies:**
- Complete system (all previous issues)

**Test Scenarios:**

1. **Happy Path Test**
   - Install extension
   - Configure Ollama endpoint in settings
   - Open text editor
   - Execute `voice2code.toggleRecording` (start)
   - Wait 2 seconds
   - Execute `voice2code.toggleRecording` (stop)
   - Verify text inserted in editor
   - Verify status bar shows success

2. **Settings Configuration Test**
   - Open settings via command
   - Change endpoint URL
   - Change model name
   - Verify configuration updated

3. **Multi-cursor Test**
   - Create multiple cursors in editor
   - Record and transcribe
   - Verify text inserted at all cursor positions

**Testing Strategy:**
- Use VS Code Extension Test Runner
- Mock STT endpoint or use local Ollama instance
- Use test fixtures for audio samples

**Definition of Done:**
- [ ] E2E test suite implemented
- [ ] Happy path test passing
- [ ] Settings test passing
- [ ] Multi-cursor test passing
- [ ] Test can run in CI/CD

**Reference:**
- `sprints/v1/tech-docs/implementation-plan.md` - Phase 6

---

### Issue #29: [P1][e2e-test] End-to-End Tests - Error Handling

**Labels:** `test`, `e2e-test`, `p1-high`, `sprint-v1`

**Description:**
Write E2E tests for error scenarios.

**Files to create:**
- `tests/e2e/error-handling.test.ts`

**Dependencies:**
- Issue #28 (E2E test infrastructure)

**Test Scenarios:**

1. **No Active Editor**
   - Close all editors
   - Execute toggleRecording and record audio
   - Verify error notification shown

2. **Endpoint Unreachable**
   - Configure invalid endpoint URL
   - Record audio
   - Verify network error shown
   - Verify retry attempts logged

3. **Invalid Configuration**
   - Set invalid model name
   - Test connection
   - Verify validation error shown

4. **No Microphone Permission**
   - Mock permission denied error
   - Attempt to start recording
   - Verify audio error shown

**Definition of Done:**
- [ ] Error scenario tests implemented
- [ ] All error cases covered
- [ ] Tests passing
- [ ] Error messages user-friendly

---

### Issue #30: [P2][documentation] Cross-Platform Testing

**Labels:** `documentation`, `testing`, `p2-medium`, `sprint-v1`

**Description:**
Manually test the extension on all supported platforms and document results.

**Dependencies:**
- Complete system

**Testing Checklist:**

**Windows:**
- [ ] Extension installs successfully
- [ ] Audio capture works
- [ ] Microphone device enumeration works
- [ ] Ollama integration works
- [ ] Keyboard shortcut works (Ctrl+Shift+V)
- [ ] Status bar updates correctly

**macOS:**
- [ ] Extension installs successfully
- [ ] Audio capture works (CoreAudio)
- [ ] Microphone permissions prompt shown
- [ ] Ollama integration works
- [ ] Keyboard shortcut works (Cmd+Shift+V)
- [ ] Status bar updates correctly

**Linux:**
- [ ] Extension installs successfully
- [ ] Audio capture works (ALSA/PulseAudio)
- [ ] Microphone device enumeration works
- [ ] Ollama integration works
- [ ] Keyboard shortcut works (Ctrl+Shift+V)
- [ ] Status bar updates correctly

**Cursor IDE:**
- [ ] Extension installs in Cursor
- [ ] All features work identically to VS Code

**Definition of Done:**
- [ ] Tested on Windows, macOS, Linux
- [ ] Tested in Cursor IDE
- [ ] All issues documented
- [ ] Platform-specific fixes implemented if needed
- [ ] Results documented in `docs/platform-testing.md`

---

### Issue #31: [P2][documentation] Update Documentation

**Labels:** `documentation`, `p2-medium`, `sprint-v1`

**Description:**
Update README and create user documentation.

**Files to update/create:**
- `README.md`
- `docs/user-guide.md`
- `CHANGELOG.md`

**Documentation Requirements:**

1. **README.md**
   - Project description
   - Features list
   - Installation instructions
   - Quick start guide
   - Configuration guide
   - Supported STT providers (Ollama, vLLM, OpenAI)
   - Troubleshooting
   - Contributing guide

2. **docs/user-guide.md**
   - Detailed setup instructions
   - Setting up Ollama locally
   - Setting up vLLM
   - Configuring API keys (SecretStorage)
   - Using the extension (step-by-step)
   - Keyboard shortcuts
   - Settings reference
   - FAQ

3. **CHANGELOG.md**
   - Version 1.0.0 (Sprint v1)
   - List all features
   - Known issues

**Screenshots:**
- Extension in action (recording)
- Settings panel
- Status bar states

**Definition of Done:**
- [ ] README.md updated
- [ ] User guide created
- [ ] CHANGELOG.md created
- [ ] Screenshots added
- [ ] All links working
- [ ] Documentation reviewed

---

### Issue #32: [P1][infrastructure] Final Testing & Coverage Check

**Labels:** `infrastructure`, `testing`, `p1-high`, `sprint-v1`

**Description:**
Run full test suite, verify coverage, and ensure all quality gates pass.

**Dependencies:**
- All previous issues

**Testing Checklist:**

1. **Unit Tests**
   - [ ] Run `npm test`
   - [ ] All unit tests pass
   - [ ] Coverage ≥80% overall
   - [ ] No failing tests

2. **Integration Tests**
   - [ ] All integration tests pass
   - [ ] Component interactions verified

3. **E2E Tests**
   - [ ] All E2E tests pass
   - [ ] Happy path verified
   - [ ] Error cases verified

4. **Linting & Formatting**
   - [ ] Run `npm run lint`
   - [ ] No ESLint errors
   - [ ] Code formatted with Prettier

5. **Build**
   - [ ] Run `npm run compile`
   - [ ] TypeScript compilation succeeds
   - [ ] No type errors
   - [ ] Bundle size acceptable

6. **CI/CD**
   - [ ] GitHub Actions workflow passes
   - [ ] All checks green

**Coverage Requirements:**
- Overall: ≥80%
- Core components: ≥90%
- Adapters: ≥90%
- UI components: ≥85%

**Definition of Done:**
- [ ] All tests passing
- [ ] Coverage requirements met
- [ ] Linting passing
- [ ] Build succeeds
- [ ] CI/CD passing
- [ ] Ready for release

---

## Summary

**Total Issues: 32**

**Breakdown by Type:**
- Infrastructure: 3 issues (#1, #12, #32)
- Features: 16 issues (#2, #4, #6, #8, #10, #14, #16, #18, #20, #22, #24, #26, #27)
- Unit Tests: 10 issues (#3, #5, #7, #9, #11, #13, #19, #21, #23, #25)
- Contract Tests: 2 issues (#15, #17)
- E2E Tests: 2 issues (#28, #29)
- Documentation: 2 issues (#30, #31)

**Priority Breakdown:**
- P0 (Critical): 17 issues
- P1 (High): 13 issues
- P2 (Medium): 2 issues

**Phases:**
- Phase 1 (Foundation): Issues #1-5
- Phase 2 (Audio): Issues #6-11
- Phase 3 (STT): Issues #12-19
- Phase 4 (UI/Editor): Issues #20-25
- Phase 5 (Extension): Issues #26-27
- Phase 6 (Testing/Polish): Issues #28-32

**Estimated Timeline: 14 days**

---

## How to Create These Issues

1. Copy each issue section above
2. Create new GitHub issue via web UI or API
3. Set appropriate labels (feature, test, p0-critical, etc.)
4. Set milestone: "Sprint v1"
5. Assign to project board if using one
6. Link dependent issues in description

**GitHub CLI Example:**
```bash
gh issue create \
  --title "[P0][infrastructure] Define TypeScript Types & Interfaces" \
  --body "<paste issue body>" \
  --label "infrastructure,p0-critical,sprint-v1" \
  --milestone "Sprint v1"
```
