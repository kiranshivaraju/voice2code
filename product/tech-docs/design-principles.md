# Design Principles & Coding Standards

## Core Design Principles

### 1. Privacy First
- Never collect data without explicit user consent
- No audio or transcription leaves user's control
- No third-party analytics or tracking by default
- Users choose where their data goes (their configured endpoint only)

### 2. DRY (Don't Repeat Yourself)
**CRITICAL:** Avoid duplication at all costs. This is a fundamental design decision.
- Extract common logic into reusable functions
- Use inheritance or composition for shared behavior
- Create utility modules for repeated patterns
- Share constants, types, and configurations
- If you write the same code twice, refactor it into a function

### 3. Simplicity Over Complexity
- Choose the simplest solution that works
- Avoid over-engineering for hypothetical future needs
- Prefer composition over complex inheritance hierarchies
- Write code that is easy to understand and maintain

### 4. User Experience First
- Minimize latency and maximize responsiveness
- Provide clear, actionable error messages
- Never leave users wondering what's happening (show status)
- Graceful degradation when things go wrong

### 5. Security by Default
- Validate all inputs
- Use HTTPS for remote endpoints (warn on HTTP)
- Store credentials securely (VS Code SecretStorage)
- Fail safely - don't expose sensitive data in errors

## Code Organization

### Project Structure
```
voice2code/
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── core/
│   │   ├── engine.ts              # Main orchestration
│   │   ├── transcription-service.ts
│   │   └── editor-service.ts
│   ├── audio/
│   │   ├── audio-manager.ts
│   │   ├── audio-encoder.ts
│   │   └── device-manager.ts
│   ├── config/
│   │   ├── configuration-manager.ts
│   │   ├── endpoint-validator.ts
│   │   └── settings-schema.ts
│   ├── ui/
│   │   ├── extension-ui.ts
│   │   ├── status-bar-controller.ts
│   │   └── preview-panel.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── error-handler.ts
│   │   └── validation.ts
│   └── types/
│       └── index.ts               # Shared TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

### Module Guidelines
- **One Class Per File:** Each class gets its own file (except tiny helper classes)
- **Barrel Exports:** Use `index.ts` to re-export from folders
- **Dependency Direction:** Core → Utils, UI → Core, never Core → UI
- **Circular Dependencies:** Forbidden - refactor if you create one

## Coding Standards

### TypeScript Standards

#### Type Safety
- **Always Use Type Annotations:** For function parameters and return types
```typescript
// Good
function transcribe(audio: Buffer, modelName: string): Promise<string> {
  // ...
}

// Bad
function transcribe(audio, modelName) {
  // ...
}
```

- **Enable Strict Mode:** Always use `"strict": true` in `tsconfig.json`
- **No `any` Type:** Use `unknown` or proper types instead
```typescript
// Good
function parseResponse(response: unknown): TranscriptionResult {
  // Type guard here
}

// Bad
function parseResponse(response: any): TranscriptionResult {
  // Loses type safety
}
```

- **Use Type Guards:** For runtime type checking
```typescript
function isTranscriptionResponse(data: unknown): data is TranscriptionResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'text' in data
  );
}
```

#### Naming Conventions
- **Files:** `kebab-case` (e.g., `audio-manager.ts`)
- **Classes:** `PascalCase` (e.g., `AudioManager`)
- **Interfaces:** `PascalCase` with descriptive names (e.g., `TranscriptionResult`)
- **Functions:** `camelCase` (e.g., `startRecording`)
- **Variables:** `camelCase` (e.g., `audioBuffer`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RECORDING_DURATION`)
- **Private Members:** `_leadingUnderscore` (e.g., `_audioStream`)
- **Booleans:** Prefix with `is`, `has`, `should` (e.g., `isRecording`, `hasError`)

#### Code Formatting
- **Indentation:** 2 spaces (no tabs)
- **Line Length:** 100 characters maximum
- **Semicolons:** Always use them
- **Quotes:** Single quotes `'` for strings, double `"` for JSON
- **Trailing Commas:** Use them in multi-line objects/arrays
```typescript
const config = {
  endpoint: 'http://localhost:11434',
  model: 'whisper-large-v3',
  timeout: 30000,  // Trailing comma
};
```

#### Documentation
- **JSDoc Comments:** For all public functions and classes
```typescript
/**
 * Transcribes audio using the configured STT model endpoint.
 *
 * @param audioBuffer - The audio data to transcribe (MP3 format)
 * @param options - Transcription options (model, language, etc.)
 * @returns Promise resolving to transcribed text
 * @throws {NetworkError} If endpoint is unreachable
 * @throws {TranscriptionError} If model fails to transcribe
 */
async function transcribe(
  audioBuffer: Buffer,
  options: TranscriptionOptions
): Promise<string> {
  // Implementation
}
```

- **Inline Comments:** For complex logic only (prefer self-documenting code)
```typescript
// Good - comment explains WHY, not WHAT
// Use exponential backoff to avoid overwhelming the endpoint
await this.retryWithBackoff(request);

// Bad - comment just repeats code
// Retry the request
await this.retryWithBackoff(request);
```

### Error Handling

#### Exception Hierarchy
```typescript
// Base error class
class Voice2CodeError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: string
  ) {
    super(message);
    this.name = 'Voice2CodeError';
  }
}

// Specific error types
class NetworkError extends Voice2CodeError {
  constructor(message: string, details?: string) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

class AudioError extends Voice2CodeError {
  constructor(message: string, details?: string) {
    super(message, 'AUDIO_ERROR', details);
    this.name = 'AudioError';
  }
}
```

#### Error Handling Patterns
- **Always Catch Specific Errors:** Don't use generic `catch (error)`
- **Provide Context:** Include helpful details in error messages
- **Log Before Throwing:** Log errors for debugging before re-throwing
- **User-Friendly Messages:** Technical details in logs, simple messages in UI

```typescript
async function transcribe(audio: Buffer): Promise<string> {
  try {
    const response = await axios.post(this.endpoint, audio);
    return response.data.text;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        logger.error(`Endpoint unreachable: ${this.endpoint}`, error);
        throw new NetworkError(
          'Cannot reach transcription endpoint',
          'Check that your STT service is running'
        );
      }
    }
    logger.error('Unexpected error during transcription', error);
    throw new TranscriptionError('Failed to transcribe audio');
  }
}
```

### Async/Await Patterns
- **Prefer Async/Await:** Over `.then()` chains
- **No Floating Promises:** Always `await` or handle promises
- **Promise.all for Parallel:** When operations can run concurrently
```typescript
// Good - parallel execution
const [devices, config] = await Promise.all([
  this.getAudioDevices(),
  this.loadConfiguration(),
]);

// Bad - sequential when parallel is possible
const devices = await this.getAudioDevices();
const config = await this.loadConfiguration();
```

## Architectural Patterns

### Dependency Injection
Use constructor injection for testability:
```typescript
class TranscriptionService {
  constructor(
    private configManager: ConfigurationManager,
    private httpClient: AxiosInstance,
    private logger: Logger
  ) {}
}
```

### Single Responsibility Principle
Each class should have one clear purpose:
- `AudioManager` - handles audio capture (NOT transcription)
- `TranscriptionService` - handles STT API calls (NOT audio capture)
- `EditorService` - handles text insertion (NOT transcription)

### Interface Segregation
Define focused interfaces, not monolithic ones:
```typescript
// Good - focused interfaces
interface AudioCapture {
  startCapture(): void;
  stopCapture(): Promise<Buffer>;
}

interface AudioEncoder {
  encode(audioData: Buffer, format: AudioFormat): Promise<Buffer>;
}

// Bad - too many responsibilities
interface AudioManager {
  startCapture(): void;
  stopCapture(): Promise<Buffer>;
  encode(format: AudioFormat): Promise<Buffer>;
  getDevices(): Promise<AudioDevice[]>;
  validateDevice(id: string): boolean;
}
```

### Factory Pattern for Configuration
```typescript
class EndpointFactory {
  static createFromSettings(settings: EndpointSettings): STTEndpoint {
    // Validation and construction logic
  }
}
```

## Testing Standards

### Test Structure
- **Arrange, Act, Assert:** Clear test structure
```typescript
test('should insert text at cursor position', async () => {
  // Arrange
  const editor = await openTestEditor();
  editor.selection = new vscode.Selection(0, 5, 0, 5);

  // Act
  await editorService.insertText('hello world');

  // Assert
  expect(editor.document.getText()).toBe('hello world');
});
```

### Test Naming
- **Descriptive Names:** Use `should` pattern
```typescript
// Good
test('should throw NetworkError when endpoint is unreachable', async () => {});

// Bad
test('error handling', async () => {});
```

### Test Coverage
- **Minimum 80% Coverage:** For all modules
- **Critical Paths:** 100% coverage for security and data-handling code
- **No Testing Private Methods:** Test through public interface

### Mocking Strategy
- **Mock External Dependencies:** HTTP calls, file system, audio devices
- **Don't Mock What You Don't Own:** Use real VS Code API in integration tests
```typescript
// Good - mock HTTP client
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

// Bad - mocking internal implementation details
jest.mock('../core/engine.ts');
```

## Code Review Standards

### Pull Request Requirements
- All code must pass linting (ESLint + Prettier)
- All tests must pass
- Test coverage must not decrease
- At least 1 approval required
- No unresolved comments

### Review Checklist
- Is the code DRY (no duplication)?
- Are all inputs validated?
- Are errors handled appropriately?
- Is the code well-documented?
- Are there tests for new functionality?
- Does it follow naming conventions?
- Is it consistent with existing code style?

## Performance Standards

### Resource Usage
- **Memory:** Functions should not leak memory
- **CPU:** Avoid blocking the main thread
- **Network:** Batch requests when possible

### Optimization Guidelines
- **Profile First:** Don't optimize without measuring
- **Lazy Loading:** Load heavy dependencies only when needed
```typescript
// Good - lazy load encoder
private encoder: AudioEncoder | null = null;

async encode(audio: Buffer): Promise<Buffer> {
  if (!this.encoder) {
    this.encoder = await import('./audio-encoder').then(m => new m.AudioEncoder());
  }
  return this.encoder.encode(audio);
}
```

## Security Standards

### Input Validation
- **Validate All User Inputs:** URLs, file paths, model names
```typescript
function validateEndpointUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### Secure Data Handling
- **No Sensitive Data in Logs:** Redact API keys, tokens
- **Use SecretStorage:** For credentials
```typescript
const secretStorage = context.secrets;
await secretStorage.store('voice2code.apiKey', apiKey);
```

### Dependency Management
- **Regular Audits:** Run `npm audit` weekly
- **Minimal Dependencies:** Only add what's truly needed
- **Pin Versions:** Use exact versions in `package-lock.json`

## Logging Standards

### Log Levels
- **ERROR:** Failures that require attention
- **WARN:** Potential issues, degraded functionality
- **INFO:** Important state changes (recording started/stopped)
- **DEBUG:** Detailed diagnostic information

### Log Format
```typescript
logger.info('Recording started', {
  deviceId: device.id,
  sampleRate: device.sampleRate,
});

logger.error('Transcription failed', {
  endpoint: config.endpoint,
  error: error.message,
});
```

### No Sensitive Data in Logs
```typescript
// Good
logger.debug('Sending request to endpoint', { endpoint: this.endpoint });

// Bad - leaks audio data
logger.debug('Audio data', { audioBuffer: buffer.toString('base64') });
```

## Accessibility Standards

### Keyboard Shortcuts
- **Configurable:** All shortcuts must be user-configurable
- **Standard Patterns:** Follow VS Code conventions
- **No Conflicts:** Check for conflicts with common extensions

### Screen Readers
- **ARIA Labels:** For webview UI elements
- **Status Announcements:** Important state changes announced
- **Keyboard Navigation:** All UI accessible via keyboard

## Documentation Standards

### README.md
- Clear installation instructions
- Quick start guide
- Configuration examples
- Troubleshooting section

### CHANGELOG.md
- All user-facing changes documented
- Semantic versioning
- Migration guides for breaking changes

### Code Documentation
- All public APIs documented with JSDoc
- Complex algorithms explained with comments
- Architecture decisions recorded in ADR format

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Status:** Active - Applies to All Sprints
