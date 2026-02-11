# Speckit Constitution

This document provides guidelines and defaults for AI-assisted development using Speckit. It minimizes decision-making friction by establishing clear conventions and standards.

## Project Context

**Product:** Voice2Code - Privacy-focused speech-to-text IDE extension

**Vision:** Enable developers to dictate code and documentation directly into their IDE using local or self-hosted STT models, with zero cloud dependencies and full user control.

**Target Users:** Developers with accessibility needs, productivity-focused coders, and privacy-conscious organizations.

**Core Values:**
- Privacy first (no data leaves user's control)
- User choice (configure any OpenAPI-compatible STT model)
- Simplicity (minimal dependencies, lightweight extension)
- Accessibility (remove barriers for developers with physical limitations)

## Technical Stack

### Core Technologies
- **Language:** TypeScript 5.x (strict mode)
- **Platform:** VS Code Extension API (Node.js runtime)
- **Build Tool:** Webpack 5.x
- **Package Manager:** npm
- **Testing:** Jest + VS Code Extension Test Runner

### Key Dependencies
- **HTTP Client:** Axios (for STT endpoint communication)
- **Audio Capture:** Native Node.js audio libraries (e.g., `node-record-lpcm16`)
- **Audio Encoding:** FFmpeg bindings or similar for MP3 encoding
- **Linting:** ESLint + Prettier

### Architecture
- **Style:** Layered architecture (UI → Core → Infrastructure)
- **No Database:** Uses VS Code Settings API and Memento for persistence
- **No Backend:** Client-side only, no servers

## Coding Standards

### TypeScript Guidelines

#### Always Use Type Annotations
```typescript
// GOOD
function transcribe(audio: Buffer, model: string): Promise<string> {}

// BAD
function transcribe(audio, model) {}
```

#### Never Use `any` Type
```typescript
// GOOD
function parseResponse(data: unknown): TranscriptionResult {
  // Use type guards
}

// BAD
function parseResponse(data: any): TranscriptionResult {}
```

#### Naming Conventions
- **Files:** `kebab-case` (e.g., `audio-manager.ts`)
- **Classes:** `PascalCase` (e.g., `AudioManager`)
- **Functions/Variables:** `camelCase` (e.g., `startRecording`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RECORDING_DURATION`)
- **Private Members:** `_leadingUnderscore` (e.g., `_audioStream`)
- **Booleans:** Prefix with `is`, `has`, `should` (e.g., `isRecording`)

#### Documentation
- **JSDoc for all public functions and classes**
- Include `@param`, `@returns`, `@throws`
- Explain WHY, not WHAT (code should be self-documenting)

### DRY Principle (Critical)

**NEVER repeat code.** This is a fundamental design decision.

- If you write the same code twice, extract it into a function
- Use composition to share behavior
- Create utility modules for common patterns
- Share types, constants, and configurations

```typescript
// GOOD - DRY
function validateUrl(url: string): boolean {
  return isValidHttpUrl(url) || isValidHttpsUrl(url);
}

// BAD - Repeated validation logic
function validateEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateModel(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

## Configuration Defaults

### Storage Mechanisms
- **User Settings:** VS Code Settings API (`vscode.workspace.getConfiguration`)
- **Secrets:** VS Code SecretStorage API (for API keys)
- **State:** VS Code Memento API (for history, if enabled)
- **Runtime:** In-memory only (no file system writes)

### Default Settings
```typescript
const DEFAULTS = {
  endpoint: {
    url: 'http://localhost:11434/api/transcribe',
    model: 'whisper-large-v3',
    timeout: 30000,  // 30 seconds
  },
  audio: {
    deviceId: 'default',
    sampleRate: 16000,
    bitDepth: 16,
    channels: 1,  // Mono
    format: 'mp3',
  },
  ui: {
    previewEnabled: true,
    showStatusBar: true,
    audioFeedback: true,
    notifyOnError: true,
  },
  history: {
    enabled: false,  // Privacy: disabled by default
    maxItems: 50,
  },
  shortcuts: {
    toggleRecording: 'ctrl+shift+v',
  },
};
```

## API Consumption Defaults

### STT Endpoint Communication

#### Always Support OpenAPI Standard
- Follow OpenAI Whisper API conventions as default
- Support multipart/form-data for audio upload
- Support JSON responses with `text` field

#### Request Format (Default)
```http
POST {endpoint}
Content-Type: multipart/form-data
Authorization: Bearer {apiKey}

file: [audio buffer]
model: {modelName}
language: {languageCode}
```

#### Response Parsing Priority
1. Try `response.data.text` (OpenAI standard)
2. Try `response.data.response` (Ollama style)
3. Try `response.data.transcription` (Generic)
4. Throw error if none found

#### Error Handling
- **401/403:** "Authentication failed - check your API key"
- **404:** "Model not found - check model name"
- **429:** "Rate limit exceeded - wait before retrying"
- **500+:** "STT service error - try again later"
- **ECONNREFUSED:** "Cannot connect to endpoint - check URL and service"
- **ETIMEDOUT:** "Request timed out - increase timeout setting"

## Testing Defaults

### Test-Driven Development (TDD)
**ALWAYS write tests BEFORE implementation.**

#### TDD Workflow
1. Write failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor and improve (REFACTOR)
4. Commit

#### Coverage Requirements
- **Unit Tests:** 80% minimum coverage
- **Critical Modules:** 90% coverage (core, config, security)
- **All New Code:** Must include tests

#### Test Structure: Arrange-Act-Assert
```typescript
test('should insert text at cursor position', async () => {
  // Arrange
  const editor = await openTestEditor();
  editor.selection = new vscode.Selection(0, 0, 0, 0);

  // Act
  await editorService.insertText('hello world');

  // Assert
  expect(editor.document.getText()).toBe('hello world');
});
```

#### Mocking Guidelines
- **Mock external dependencies:** HTTP, file system, audio devices
- **Don't mock internal code:** Test through public interfaces
- **Use real VS Code API in integration tests**

## Security Defaults

### Input Validation (Always)

#### Validate ALL User Inputs
```typescript
// Endpoint URLs
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Model names (prevent path traversal, code injection)
function validateModelName(name: string): boolean {
  const SAFE_REGEX = /^[a-zA-Z0-9._-]+$/;
  return SAFE_REGEX.test(name) && name.length <= 100;
}
```

#### Never Trust User Input
- Sanitize before using in file paths
- Validate before sending to external APIs
- Escape before displaying in UI

### Credential Storage

#### ALWAYS use SecretStorage for Secrets
```typescript
// GOOD
await context.secrets.store('voice2code.apiKey', apiKey);
const key = await context.secrets.get('voice2code.apiKey');

// BAD - NEVER store secrets in settings
await config.set('apiKey', apiKey);  // WRONG!
```

#### Never Log Sensitive Data
```typescript
// GOOD
logger.debug('Sending request', { endpoint: url });

// BAD
logger.debug('Request', { headers: { Authorization: apiKey } });
```

### HTTPS Enforcement
- **Require HTTPS for remote endpoints**
- **Warn users when using HTTP** (unless localhost)
- **Never disable certificate validation**

## Error Handling Defaults

### Error Hierarchy
```typescript
class Voice2CodeError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific error types
class NetworkError extends Voice2CodeError {}
class AudioError extends Voice2CodeError {}
class ConfigurationError extends Voice2CodeError {}
class TranscriptionError extends Voice2CodeError {}
```

### Error Messages
- **User-facing:** Simple, actionable (e.g., "Check your endpoint URL")
- **Technical details:** In logs only, never in UI
- **No sensitive data:** Never include API keys, audio data in errors

### Retry Strategy
- **Retry transient errors:** Network timeouts, 5xx server errors
- **Don't retry client errors:** 4xx errors (bad request, auth failure)
- **Exponential backoff:** 1s, 2s, 4s, 8s (max 3 retries)

## Decision-Making Guidelines

When faced with multiple implementation options:

### 1. Choose Simplicity Over Complexity
- Prefer simple solutions that work
- Avoid over-engineering for hypothetical future needs
- Don't introduce patterns until you need them

### 2. Choose Security Over Convenience
- Validate all inputs, even if it adds code
- Store credentials securely, even if it's more complex
- Fail safely, even if errors are less friendly

### 3. Choose Privacy Over Features
- Don't collect data unless explicitly needed
- Make telemetry opt-in, not opt-out
- Clear audio buffers immediately after use

### 4. Follow Existing Patterns
- Look at similar code in the codebase
- Use the same naming conventions
- Match the style of surrounding code

### 5. When Truly Uncertain, ASK the User
If a decision is:
- **Architectural:** Ask user (affects multiple features)
- **User-facing:** Ask user (impacts UX)
- **Security-related:** Ask user (privacy implications)
- **Implementation detail:** Make reasonable choice, document in comment

## Features to Avoid (Unless Explicitly Requested)

### DO NOT Add These Without User Permission:
- Social login / OAuth
- Email verification
- Cloud storage / sync
- Telemetry / analytics
- Automatic updates to remote servers
- Background uploads
- Third-party integrations not in requirements

### DO NOT Over-engineer:
- Custom frameworks when standard patterns work
- Abstract base classes with single implementation
- Premature optimization before profiling
- Complex state management for simple state

## What to ALWAYS Include

### Every Module Should Have:
1. **Type annotations** (no `any` types)
2. **JSDoc comments** for public APIs
3. **Input validation** for user data
4. **Error handling** with specific error types
5. **Unit tests** (80% coverage minimum)
6. **Logging** for debugging (no sensitive data)

### Every Public Function Should:
1. **Validate inputs** before processing
2. **Throw typed errors** (not generic Error)
3. **Document with JSDoc** (`@param`, `@returns`, `@throws`)
4. **Have corresponding tests** (unit + integration)

### Every API Call Should:
1. **Include timeout** (default 30 seconds)
2. **Handle all error cases** (network, auth, rate limit)
3. **Retry transient failures** (with backoff)
4. **Log requests** (redact sensitive data)

## Architecture Patterns

### Dependency Injection
Use constructor injection for testability:
```typescript
class TranscriptionService {
  constructor(
    private config: IConfigurationService,
    private http: AxiosInstance,
    private logger: ILogger
  ) {}
}
```

### Single Responsibility Principle
One class, one purpose:
- `AudioManager` captures audio (NOT transcription)
- `TranscriptionService` calls STT API (NOT audio capture)
- `EditorService` inserts text (NOT transcription)

### Interface Segregation
Small, focused interfaces:
```typescript
interface IAudioCapture {
  startCapture(): void;
  stopCapture(): Promise<Buffer>;
}

interface IAudioEncoder {
  encode(audio: Buffer, format: AudioFormat): Promise<Buffer>;
}
```

## Common Scenarios & Decisions

### Scenario: User wants to add a new STT provider
**Decision:** Create new adapter implementing `STTAdapter` interface
**Pattern:** Adapter pattern (see `api-strategy.md`)

### Scenario: Need to store user preference
**Decision:** Use VS Code Settings API (`getConfiguration`)
**Never:** Write to file system directly

### Scenario: Need to store API key
**Decision:** Use VS Code SecretStorage API
**Never:** Store in settings.json or code

### Scenario: Need temporary data during session
**Decision:** In-memory class property
**Never:** Write to temp files

### Scenario: Need to validate user input
**Decision:** Create validation function with type guard
**Always:** Validate before using in file paths, URLs, API calls

### Scenario: Need to call external API
**Decision:** Use Axios with timeout, error handling, retry logic
**Always:** Redact sensitive data from logs

### Scenario: Uncertain about implementation
**Decision:** Ask user for clarification
**Provide:** Multiple options with trade-offs

## File Organization Template

```typescript
// src/services/transcription-service.ts

/**
 * Service for transcribing audio using configured STT endpoint
 */
export class TranscriptionService implements ITranscriptionService {
  // 1. Private properties
  private adapter: STTAdapter;
  private config: EndpointConfiguration;

  // 2. Constructor (dependency injection)
  constructor(
    configManager: IConfigurationService,
    logger: ILogger
  ) {
    this.config = configManager.getEndpoint();
    this.adapter = this.createAdapter();
  }

  // 3. Public methods (interface implementation)
  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Validate inputs
    this.validateAudioBuffer(audio);
    this.validateOptions(options);

    // Main logic with error handling
    try {
      return await this.adapter.transcribe(audio, options);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 4. Private helper methods
  private createAdapter(): STTAdapter {
    // Factory logic
  }

  private validateAudioBuffer(audio: Buffer): void {
    if (!audio || audio.length === 0) {
      throw new ValidationError('Audio buffer is empty');
    }
  }

  private handleError(error: unknown): Voice2CodeError {
    // Error transformation logic
  }
}
```

## Summary: Core Principles

1. **Privacy First:** No data leaves user's control
2. **DRY Always:** Extract duplication immediately
3. **Type Safety:** Strict TypeScript, no `any`
4. **Test First:** Write tests before code (TDD)
5. **Validate Inputs:** Never trust user input
6. **Secure Secrets:** Use SecretStorage API
7. **Handle Errors:** Specific error types with helpful messages
8. **Document Code:** JSDoc for all public APIs
9. **Keep It Simple:** Solve the problem at hand, don't over-engineer
10. **Ask When Uncertain:** User feedback > assumptions

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Status:** Active - Living Document (Update as Project Evolves)
