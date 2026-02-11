# API Design Strategy

## Overview

Voice2Code is a **client-side extension** that consumes external STT (Speech-to-Text) APIs. It does not expose its own API but interacts with user-configured OpenAPI-compatible STT endpoints.

This document defines:
1. How Voice2Code consumes external STT APIs
2. Internal TypeScript API design for extension components
3. Future extensibility patterns for custom STT adapters

## External API Consumption

### Supported STT API Patterns

Voice2Code supports any **OpenAPI-compatible** STT endpoint. This includes:

1. **OpenAI Whisper API** (or compatible)
2. **Ollama API** (local models)
3. **vLLM OpenAI-compatible server** (local/remote)
4. **Custom endpoints** following OpenAI conventions

### OpenAI Whisper API Standard

**Endpoint Pattern:**
```
POST /v1/audio/transcriptions
```

**Request:**
```http
POST https://api.openai.com/v1/audio/transcriptions
Content-Type: multipart/form-data
Authorization: Bearer sk-abc123xyz

--boundary
Content-Disposition: form-data; name="file"; filename="audio.mp3"
Content-Type: audio/mpeg

[binary audio data]
--boundary
Content-Disposition: form-data; name="model"

whisper-1
--boundary
Content-Disposition: form-data; name="language"

en
--boundary--
```

**Response:**
```json
{
  "text": "The transcribed text content goes here."
}
```

### Ollama API Pattern

**Endpoint Pattern:**
```
POST /api/generate
```

**Request:**
```http
POST http://localhost:11434/api/generate
Content-Type: application/json

{
  "model": "whisper-large-v3",
  "prompt": "[base64 audio data]",
  "stream": false
}
```

**Response:**
```json
{
  "response": "The transcribed text content goes here.",
  "done": true
}
```

### Generic OpenAPI Pattern

Voice2Code will detect and adapt to various response formats:

**Accepted Response Formats:**
```json
// Format 1: OpenAI standard
{ "text": "transcribed text" }

// Format 2: Ollama style
{ "response": "transcribed text" }

// Format 3: Generic
{ "transcription": "transcribed text" }

// Format 4: Nested
{ "data": { "text": "transcribed text" } }
```

### STT API Adapter Design

```typescript
interface STTAdapter {
  /**
   * Send audio to STT endpoint and receive transcription
   */
  transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;

  /**
   * Test endpoint connectivity
   */
  testConnection(): Promise<boolean>;

  /**
   * Get supported models from endpoint
   */
  getAvailableModels?(): Promise<string[]>;
}

interface TranscriptionOptions {
  model: string;                  // Model name (e.g., "whisper-large-v3")
  language?: string;              // Language code (e.g., "en", "es")
  prompt?: string;                // Optional prompt/context
  temperature?: number;           // Sampling temperature (0.0 - 1.0)
}

interface TranscriptionResult {
  text: string;                   // The transcribed text (REQUIRED)
  confidence?: number;            // Confidence score (0-1)
  language?: string;              // Detected language
  duration?: number;              // Audio duration in seconds
}
```

### OpenAI Whisper Adapter Implementation

```typescript
class OpenAIWhisperAdapter implements STTAdapter {
  constructor(
    private endpoint: string,
    private apiKey?: string
  ) {}

  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audio, 'audio.mp3');
    formData.append('model', options.model);

    if (options.language) {
      formData.append('language', options.language);
    }

    const response = await axios.post(
      `${this.endpoint}/v1/audio/transcriptions`,
      formData,
      {
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
          ...formData.getHeaders(),
        },
        timeout: 30000,
      }
    );

    return {
      text: response.data.text,
      language: response.data.language,
      duration: response.data.duration,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with minimal request
      await axios.get(`${this.endpoint}/v1/models`, {
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
        },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### Ollama Adapter Implementation

```typescript
class OllamaAdapter implements STTAdapter {
  constructor(private endpoint: string) {}

  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Ollama expects base64-encoded audio
    const base64Audio = audio.toString('base64');

    const response = await axios.post(
      `${this.endpoint}/api/generate`,
      {
        model: options.model,
        prompt: base64Audio,
        stream: false,
      },
      {
        timeout: 30000,
      }
    );

    return {
      text: response.data.response,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.endpoint}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const response = await axios.get(`${this.endpoint}/api/tags`);
    return response.data.models.map((m: any) => m.name);
  }
}
```

### Generic Adapter (Auto-detect)

```typescript
class GenericAdapter implements STTAdapter {
  constructor(
    private endpoint: string,
    private apiKey?: string
  ) {}

  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Try multipart/form-data first (OpenAI style)
    try {
      return await this.transcribeMultipart(audio, options);
    } catch {
      // Fall back to JSON (Ollama style)
      return await this.transcribeJson(audio, options);
    }
  }

  private async transcribeMultipart(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audio, 'audio.mp3');
    formData.append('model', options.model);

    const response = await axios.post(this.endpoint, formData, {
      headers: {
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });

    return this.parseResponse(response.data);
  }

  private async transcribeJson(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const response = await axios.post(
      this.endpoint,
      {
        audio: audio.toString('base64'),
        model: options.model,
        language: options.language,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
        },
        timeout: 30000,
      }
    );

    return this.parseResponse(response.data);
  }

  private parseResponse(data: any): TranscriptionResult {
    // Try multiple common response formats
    const text =
      data.text ||
      data.transcription ||
      data.response ||
      data.data?.text ||
      null;

    if (!text) {
      throw new Error('Unable to extract transcription from response');
    }

    return {
      text,
      confidence: data.confidence,
      language: data.language,
      duration: data.duration,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await axios.get(this.endpoint, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
```

## Internal Extension API Design

### Module Boundaries

Voice2Code follows a **layered architecture** with clear module boundaries:

```
┌─────────────────────────────────────────┐
│          UI Layer                       │  Public API for commands
│  (Commands, Status Bar, Panels)        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│          Core Layer                     │  Internal API
│  (Engine, Services)                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│          Infrastructure Layer           │  Utilities
│  (Audio, Config, HTTP)                  │
└─────────────────────────────────────────┘
```

### Public Extension API (Commands)

```typescript
// extension.ts - Entry point
export function activate(context: vscode.ExtensionContext): void {
  const engine = new Voice2CodeEngine(context);

  // Register commands (public API)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'voice2code.startRecording',
      () => engine.startRecording()
    ),
    vscode.commands.registerCommand(
      'voice2code.stopRecording',
      () => engine.stopRecording()
    ),
    vscode.commands.registerCommand(
      'voice2code.toggleRecording',
      () => engine.toggleRecording()
    ),
    vscode.commands.registerCommand(
      'voice2code.openSettings',
      () => engine.openSettings()
    ),
    vscode.commands.registerCommand(
      'voice2code.testConnection',
      () => engine.testConnection()
    )
  );
}
```

### Core Engine API

```typescript
class Voice2CodeEngine {
  /**
   * Start recording audio from configured device
   * @throws {AudioError} If microphone is unavailable
   * @throws {ConfigError} If endpoint is not configured
   */
  async startRecording(): Promise<void>;

  /**
   * Stop recording and initiate transcription
   * @returns Transcribed text
   * @throws {NetworkError} If endpoint is unreachable
   * @throws {TranscriptionError} If transcription fails
   */
  async stopRecording(): Promise<string>;

  /**
   * Toggle recording state (start if stopped, stop if started)
   */
  async toggleRecording(): Promise<void>;

  /**
   * Test connection to configured endpoint
   * @returns True if endpoint is reachable and valid
   */
  async testConnection(): Promise<boolean>;

  /**
   * Open extension settings panel
   */
  openSettings(): void;
}
```

### Service Layer APIs

#### Transcription Service

```typescript
interface ITranscriptionService {
  /**
   * Transcribe audio using configured endpoint
   */
  transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult>;

  /**
   * Test endpoint connectivity
   */
  testConnection(): Promise<boolean>;

  /**
   * Get available models from endpoint
   */
  getAvailableModels(): Promise<string[]>;
}
```

#### Audio Service

```typescript
interface IAudioService {
  /**
   * Get list of available audio input devices
   */
  getDevices(): Promise<AudioDevice[]>;

  /**
   * Start capturing audio from specified device
   */
  startCapture(deviceId: string): Promise<void>;

  /**
   * Stop capturing and return audio buffer
   */
  stopCapture(): Promise<Buffer>;

  /**
   * Encode audio to specified format
   */
  encode(audio: Buffer, format: AudioFormat): Promise<Buffer>;
}
```

#### Editor Service

```typescript
interface IEditorService {
  /**
   * Insert text at current cursor position(s)
   */
  insertText(text: string): Promise<void>;

  /**
   * Get active editor
   */
  getActiveEditor(): vscode.TextEditor | undefined;

  /**
   * Show text preview before insertion
   */
  showPreview(text: string): Promise<boolean>;  // Returns: user confirmed
}
```

#### Configuration Service

```typescript
interface IConfigurationService {
  /**
   * Get configuration value
   */
  get<T>(key: string, defaultValue: T): T;

  /**
   * Set configuration value
   */
  set(key: string, value: unknown): Promise<void>;

  /**
   * Get endpoint configuration
   */
  getEndpoint(): EndpointConfiguration;

  /**
   * Get audio configuration
   */
  getAudioConfig(): AudioConfiguration;

  /**
   * Validate endpoint configuration
   */
  validateEndpoint(config: EndpointConfiguration): Promise<ValidationResult>;
}
```

## Error Handling Strategy

### Error Types

```typescript
// Base error class
abstract class Voice2CodeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// Specific error types
class NetworkError extends Voice2CodeError {
  constructor(message: string, details?: string) {
    super(message, 'NETWORK_ERROR', details);
  }
}

class AudioError extends Voice2CodeError {
  constructor(message: string, details?: string) {
    super(message, 'AUDIO_ERROR', details);
  }
}

class ConfigurationError extends Voice2CodeError {
  constructor(message: string, details?: string) {
    super(message, 'CONFIG_ERROR', details);
  }
}

class TranscriptionError extends Voice2CodeError {
  constructor(message: string, details?: string) {
    super(message, 'STT_ERROR', details);
  }
}
```

### HTTP Error Handling

```typescript
async function handleApiError(error: unknown): Promise<never> {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNREFUSED') {
      throw new NetworkError(
        'Cannot connect to STT endpoint',
        'Check that your STT service is running and the URL is correct'
      );
    }

    if (error.response) {
      const status = error.response.status;

      if (status === 401 || status === 403) {
        throw new NetworkError(
          'Authentication failed',
          'Check your API key or credentials'
        );
      }

      if (status === 404) {
        throw new TranscriptionError(
          'Model not found',
          `Model "${error.config?.data?.model}" does not exist on this endpoint`
        );
      }

      if (status === 429) {
        throw new NetworkError(
          'Rate limit exceeded',
          'Too many requests. Please wait before trying again.'
        );
      }

      if (status >= 500) {
        throw new TranscriptionError(
          'STT service error',
          'The transcription service encountered an internal error'
        );
      }
    }

    if (error.code === 'ETIMEDOUT') {
      throw new NetworkError(
        'Request timed out',
        'The STT endpoint took too long to respond. Try increasing the timeout.'
      );
    }
  }

  throw new TranscriptionError('Transcription failed', String(error));
}
```

## Retry Strategy

```typescript
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  }
): Promise<T> {
  let lastError: unknown;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (axios.isAxiosError(error) && error.response?.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === options.maxRetries) {
        throw error;
      }

      // Wait with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }

  throw lastError;
}
```

## API Versioning (Future)

### Extension API Versioning

As Voice2Code evolves, maintain backward compatibility:

```typescript
// v1 API (current)
interface ITranscriptionServiceV1 {
  transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;
}

// v2 API (future - adds streaming)
interface ITranscriptionServiceV2 extends ITranscriptionServiceV1 {
  transcribeStream(
    audioStream: ReadableStream,
    options: TranscriptionOptions
  ): AsyncIterableIterator<TranscriptionChunk>;
}
```

### Plugin System (Future Enhancement)

```typescript
// Allow users to register custom STT adapters
interface STTPlugin {
  name: string;
  version: string;
  adapter: new (config: unknown) => STTAdapter;
}

class PluginRegistry {
  private plugins = new Map<string, STTPlugin>();

  register(plugin: STTPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  getAdapter(name: string, config: unknown): STTAdapter {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }
    return new plugin.adapter(config);
  }
}
```

## Testing Strategy for APIs

### Unit Tests for Adapters

```typescript
describe('OpenAIWhisperAdapter', () => {
  let adapter: OpenAIWhisperAdapter;
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockAxios = axios as jest.Mocked<typeof axios>;
    adapter = new OpenAIWhisperAdapter('https://api.openai.com', 'sk-test');
  });

  test('should send correct request format', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: 'test transcription' },
    });

    const audio = Buffer.from('fake audio data');
    await adapter.transcribe(audio, { model: 'whisper-1' });

    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/transcriptions',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk-test',
        }),
      })
    );
  });

  test('should handle 401 authentication errors', async () => {
    mockAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(
      adapter.transcribe(Buffer.from('audio'), { model: 'whisper-1' })
    ).rejects.toThrow(NetworkError);
  });
});
```

### Integration Tests with Mock Server

```typescript
describe('TranscriptionService Integration', () => {
  let mockServer: MockServer;

  beforeAll(async () => {
    mockServer = await createMockSTTServer();
  });

  afterAll(async () => {
    await mockServer.close();
  });

  test('should transcribe audio end-to-end', async () => {
    const service = new TranscriptionService({
      endpoint: mockServer.url,
      model: 'whisper-test',
    });

    const audio = await readTestAudio('sample.mp3');
    const result = await service.transcribe(audio);

    expect(result.text).toBe('expected transcription');
  });
});
```

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Status:** Active - Flexibility Through Standards
