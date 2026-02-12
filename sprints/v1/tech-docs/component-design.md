# Component Design - Sprint v1

## Overview

Detailed design of all classes and modules for Sprint v1 features.

---

## Layer 1: Core Components

### Component 1: Voice2CodeEngine

**Purpose:** Main orchestrator for all extension operations

**Location:** `src/core/engine.ts`

**Class Signature:**

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
- `_recordingState: RecordingState`
- `_transcriptionState: TranscriptionState`

**Key Methods:**

**startRecording():**
1. Check not already recording
2. Get audio config
3. Start audio capture
4. Update UI (status bar red)
5. Play beep if enabled

**stopRecording():**
1. Check is recording
2. Stop audio capture, get buffer
3. Update UI (status bar yellow)
4. Encode audio to MP3
5. Call transcription service
6. Insert text into editor
7. Cleanup buffer
8. Update UI (status bar green)

---

### Component 2: ConfigurationManager

**Purpose:** Manage VS Code settings and secrets

**Location:** `src/config/configuration-manager.ts`

**Class Signature:**

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

```typescript
getEndpointConfig(): EndpointConfiguration {
  const config = vscode.workspace.getConfiguration('voice2code');
  return {
    url: config.get('endpoint.url', 'http://localhost:11434/api/transcribe'),
    model: config.get('endpoint.model', 'whisper-large-v3'),
    timeout: config.get('endpoint.timeout', 30000),
  };
}

async getApiKey(): Promise<string | undefined> {
  return await this.context.secrets.get('voice2code.apiKey');
}
```

---

### Component 3: TranscriptionService

**Purpose:** Handle STT API communication

**Location:** `src/core/transcription-service.ts`

**Class Signature:**

```typescript
export class TranscriptionService {
  constructor(
    private configManager: ConfigurationManager,
    private adapterFactory: STTAdapterFactory
  );

  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult>;
  
  async testConnection(): Promise<boolean>;
}
```

**Implementation:**

```typescript
async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
  const config = this.configManager.getEndpointConfig();
  const adapter = this.adapterFactory.createAdapter(config.url);
  
  try {
    return await retryWithBackoff(
      () => adapter.transcribe(audio, options),
      { maxRetries: 3, initialDelay: 1000 }
    );
  } catch (error) {
    throw this.handleError(error);
  }
}
```

---

## Layer 2: Audio Components

### Component 4: AudioManager

**Purpose:** Capture audio from microphone

**Location:** `src/audio/audio-manager.ts`

**Class Signature:**

```typescript
export class AudioManager {
  async startCapture(deviceId: string): Promise<void>;
  async stopCapture(): Promise<Buffer>;
  getDevices(): Promise<AudioDevice[]>;
}
```

**Implementation Strategy:**
- Use `node-record-lpcm16` or similar for audio capture
- Store chunks in memory array
- Concatenate on stop

---

### Component 5: AudioEncoder

**Purpose:** Encode audio to MP3/WAV

**Location:** `src/audio/audio-encoder.ts`

**Class Signature:**

```typescript
export class AudioEncoder {
  async encode(audio: Buffer, format: AudioFormat): Promise<Buffer>;
}
```

---

## Layer 3: UI Components

### Component 6: StatusBarController

**Purpose:** Manage status bar indicator

**Location:** `src/ui/status-bar-controller.ts`

**Class Signature:**

```typescript
export class StatusBarController {
  constructor(context: vscode.ExtensionContext);
  
  update(text: string, color?: string): void;
  show(): void;
  hide(): void;
}
```

---

### Component 7: EditorService

**Purpose:** Insert text into VS Code editor

**Location:** `src/core/editor-service.ts`

**Class Signature:**

```typescript
export class EditorService {
  async insertText(text: string): Promise<void>;
  getActiveEditor(): vscode.TextEditor | undefined;
}
```

**Implementation:**

```typescript
async insertText(text: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new ValidationError('No active editor found');
  }

  await editor.edit((editBuilder) => {
    editor.selections.forEach((selection) => {
      editBuilder.insert(selection.active, text);
    });
  });
}
```

---

## Layer 4: STT Adapters

### Component 8: OllamaAdapter

**Purpose:** Ollama API integration

**Location:** `src/adapters/ollama-adapter.ts`

**Implements:** `STTAdapter` interface

---

### Component 9: OpenAIWhisperAdapter

**Purpose:** OpenAI Whisper API integration

**Location:** `src/adapters/openai-whisper-adapter.ts`

**Implements:** `STTAdapter` interface

---

## Utility Components

### Component 10: EndpointValidator

**Purpose:** Validate and test endpoints

**Location:** `src/config/endpoint-validator.ts`

**Functions:**

```typescript
export function validateEndpointUrl(url: string): ValidationResult;
export function validateModelName(name: string): ValidationResult;
export async function testEndpointConnectivity(url: string, timeout: number): Promise<boolean>;
```

---

## Total Components: 10

**Dependency Graph:**

```
Voice2CodeEngine
  ├── ConfigurationManager
  ├── AudioManager → AudioEncoder
  ├── TranscriptionService → STTAdapterFactory → [OllamaAdapter, OpenAIWhisperAdapter]
  ├── EditorService
  └── StatusBarController
```

---

For complete implementation details including all methods, error handling, and test specifications, see the full design documentation.
