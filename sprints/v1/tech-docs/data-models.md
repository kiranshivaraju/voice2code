# Data Models - Sprint v1

## Overview

Voice2Code is a client-side VS Code extension with NO traditional database. All data is either:
1. **Configuration data** - Stored in VS Code Settings API
2. **Secret data** - Stored in VS Code SecretStorage API (encrypted)
3. **Runtime state** - Stored in memory (TypeScript classes)
4. **Optional history** - Stored in VS Code Memento API (key-value store)

This document defines TypeScript interfaces and data structures for Sprint v1.

---

## Configuration Models

### Model 1: EndpointConfiguration

**Purpose:** Stores STT model endpoint settings (URL, model name, timeout)

**Storage:** VS Code Settings API (`settings.json`)

**TypeScript Interface:**

```typescript
interface EndpointConfiguration {
  url: string;                    // STT endpoint URL
  model: string;                  // Model name (e.g., "whisper-large-v3")
  timeout: number;                // Request timeout in milliseconds
  customHeaders?: Record<string, string>;  // Optional custom HTTP headers
}
```

**Fields:**

| Field | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| url | string | Yes | `http://localhost:11434/api/transcribe` | Must be valid HTTP/HTTPS URL, max 2048 chars | STT endpoint URL |
| model | string | Yes | `whisper-large-v3` | Alphanumeric, hyphens, underscores only. Max 100 chars | Model identifier |
| timeout | number | Yes | `30000` | Min: 1000, Max: 300000 (5 minutes) | Request timeout in ms |
| customHeaders | Record<string, string> | No | `undefined` | Keys and values max 255 chars each | Optional HTTP headers |

**Validation Rules:**

**url:**
- Must match regex: `^https?://[a-zA-Z0-9.-]+(:[0-9]{1,5})?(/.*)?$`
- Protocol must be `http://` or `https://`
- For remote endpoints (not localhost), warn if HTTP (unencrypted)
- Localhost patterns: `localhost`, `127.0.0.1`, `::1`

**model:**
- Must match regex: `^[a-zA-Z0-9._-]+$`
- Cannot contain path traversal patterns (`..`, `/`, `\`)
- Cannot be empty string
- Trim whitespace before validation

**timeout:**
- Must be integer
- Minimum: 1000ms (1 second)
- Maximum: 300000ms (5 minutes)
- Default: 30000ms (30 seconds)

**customHeaders:**
- Each key must match regex: `^[a-zA-Z0-9-]+$`
- Values can be any string (trimmed)
- Cannot include sensitive headers: `Authorization` (use SecretStorage instead)

**VS Code Settings Schema (in package.json):**

```json
{
  "voice2code.endpoint.url": {
    "type": "string",
    "default": "http://localhost:11434/api/transcribe",
    "description": "STT model endpoint URL"
  },
  "voice2code.endpoint.model": {
    "type": "string",
    "default": "whisper-large-v3",
    "description": "STT model name"
  },
  "voice2code.endpoint.timeout": {
    "type": "number",
    "default": 30000,
    "minimum": 1000,
    "maximum": 300000,
    "description": "Request timeout in milliseconds"
  }
}
```

**Example Configuration:**

```json
{
  "voice2code.endpoint.url": "http://localhost:11434/api/generate",
  "voice2code.endpoint.model": "whisper-large-v3",
  "voice2code.endpoint.timeout": 30000
}
```

---

### Model 2: AudioConfiguration

**Purpose:** Stores audio capture settings (device, sample rate, format)

**Storage:** VS Code Settings API

**TypeScript Interface:**

```typescript
interface AudioConfiguration {
  deviceId: string;               // Audio input device ID
  sampleRate: number;             // Sample rate in Hz
  bitDepth: number;               // Bit depth (16, 24, 32)
  channels: number;               // Audio channels (1=mono, 2=stereo)
  format: AudioFormat;            // Encoding format
}

type AudioFormat = 'mp3' | 'wav';
```

**Fields:**

| Field | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| deviceId | string | Yes | `"default"` | Max 255 chars | Audio input device identifier |
| sampleRate | number | Yes | `16000` | One of: 8000, 16000, 22050, 44100, 48000 | Sample rate in Hz |
| bitDepth | number | Yes | `16` | One of: 16, 24, 32 | Bit depth |
| channels | number | Yes | `1` | 1 (mono) or 2 (stereo) | Number of audio channels |
| format | AudioFormat | Yes | `"mp3"` | Enum: "mp3" or "wav" | Audio encoding format |

**Validation Rules:**

**deviceId:**
- Use "default" for system default microphone
- Device IDs come from system enumeration (platform-specific)
- If specified device unavailable, fall back to "default"

**sampleRate:**
- Must be one of supported rates: [8000, 16000, 22050, 44100, 48000]
- Recommended: 16000 Hz (optimal for speech recognition)
- Higher rates = better quality, larger files

**bitDepth:**
- Must be one of: [16, 24, 32]
- Recommended: 16 (sufficient for speech)

**channels:**
- 1 = Mono (recommended for speech, smaller files)
- 2 = Stereo (higher quality, larger files)

**format:**
- "mp3" = Compressed, smaller file size (recommended for remote endpoints)
- "wav" = Uncompressed, larger file size (best quality)

**VS Code Settings Schema:**

```json
{
  "voice2code.audio.deviceId": {
    "type": "string",
    "default": "default",
    "description": "Audio input device ID"
  },
  "voice2code.audio.sampleRate": {
    "type": "number",
    "default": 16000,
    "enum": [8000, 16000, 22050, 44100, 48000],
    "description": "Audio sample rate in Hz"
  },
  "voice2code.audio.format": {
    "type": "string",
    "default": "mp3",
    "enum": ["mp3", "wav"],
    "description": "Audio encoding format"
  }
}
```

---

### Model 3: UIConfiguration

**Purpose:** UI/UX preferences

**Storage:** VS Code Settings API

**TypeScript Interface:**

```typescript
interface UIConfiguration {
  previewEnabled: boolean;        // Show transcription preview
  showStatusBar: boolean;         // Show status bar indicator
  audioFeedback: boolean;         // Play beep on start/stop
  notifyOnError: boolean;         // Show error notifications
}
```

**Fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| previewEnabled | boolean | Yes | `true` | Show preview before inserting text |
| showStatusBar | boolean | Yes | `true` | Display status bar item |
| audioFeedback | boolean | Yes | `true` | Play audio beep on recording start/stop |
| notifyOnError | boolean | Yes | `true` | Show VS Code notifications for errors |

**Note:** Preview functionality is deferred to Sprint v2, but setting is included now for forward compatibility.

---

## Secret Storage Models

### Model 4: API Credentials

**Purpose:** Store sensitive API keys for remote STT endpoints

**Storage:** VS Code SecretStorage API (encrypted, OS keychain)

**Keys:**

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| `voice2code.apiKey` | string | API key for STT endpoint | `sk-abc123xyz` |
| `voice2code.customHeaders` | JSON string | Serialized custom auth headers | `{"X-API-Key": "..."}` |

**Access Pattern:**

```typescript
// Store API key
await context.secrets.store('voice2code.apiKey', apiKey);

// Retrieve API key
const apiKey = await context.secrets.get('voice2code.apiKey');

// Delete API key
await context.secrets.delete('voice2code.apiKey');
```

**Security Rules:**
- NEVER store in VS Code settings (plain text)
- NEVER log API keys
- NEVER include in error messages
- API keys stored encrypted at rest
- Not synced across devices (SecretStorage is local)

---

## Runtime State Models

### Model 5: RecordingState

**Purpose:** Track current recording state in memory

**Storage:** In-memory (class property)

**TypeScript Interface:**

```typescript
interface RecordingState {
  isRecording: boolean;           // Currently recording
  startTime: number | null;       // Recording start timestamp (ms)
  deviceId: string | null;        // Active device ID
  audioBuffer: Buffer | null;     // Captured audio data
}
```

**Fields:**

| Field | Type | Initial Value | Description |
|-------|------|---------------|-------------|
| isRecording | boolean | `false` | True when recording in progress |
| startTime | number \| null | `null` | Unix timestamp (ms) when recording started |
| deviceId | string \| null | `null` | Device ID being used for recording |
| audioBuffer | Buffer \| null | `null` | In-memory audio buffer (cleared after transcription) |

**State Transitions:**

```
Idle (isRecording=false, audioBuffer=null)
  ↓ startRecording()
Recording (isRecording=true, audioBuffer=Buffer)
  ↓ stopRecording()
Transcribing (isRecording=false, audioBuffer=Buffer)
  ↓ transcription complete
Idle (isRecording=false, audioBuffer=null)
```

**Lifecycle:**
1. **Idle:** Default state
2. **Start Recording:** Set isRecording=true, startTime=now, create audioBuffer
3. **Recording:** Continuously append audio chunks to audioBuffer
4. **Stop Recording:** Set isRecording=false, keep audioBuffer
5. **Transcribe:** Send audioBuffer to STT endpoint
6. **Cleanup:** Set audioBuffer=null (garbage collection)

---

### Model 6: TranscriptionState

**Purpose:** Track transcription API request state

**Storage:** In-memory

**TypeScript Interface:**

```typescript
interface TranscriptionState {
  inProgress: boolean;            // Request in flight
  startTime: number | null;       // Request start time
  endpoint: string | null;        // Endpoint URL
  model: string | null;           // Model name
}
```

**Fields:**

| Field | Type | Initial Value | Description |
|-------|------|---------------|-------------|
| inProgress | boolean | `false` | True when transcription request in flight |
| startTime | number \| null | `null` | Request start timestamp (ms) |
| endpoint | string \| null | `null` | Endpoint URL being used |
| model | string \| null | `null` | Model name being used |

---

### Model 7: UIState

**Purpose:** Track UI element states

**Storage:** In-memory

**TypeScript Interface:**

```typescript
interface UIState {
  statusBarText: string;          // Status bar display text
  statusBarColor: string | undefined; // Status bar color
  recordingIndicatorVisible: boolean; // Show recording icon
  previewPanelVisible: boolean;   // Preview panel shown (Sprint v2)
}
```

**Fields:**

| Field | Type | Initial Value | Description |
|-------|------|---------------|-------------|
| statusBarText | string | `"Voice2Code: Ready"` | Text shown in status bar |
| statusBarColor | string \| undefined | `undefined` | Status bar background color (red when recording) |
| recordingIndicatorVisible | boolean | `false` | Show recording icon |
| previewPanelVisible | boolean | `false` | Preview panel visible (Sprint v2 feature) |

**Status Bar States:**

| State | Text | Color | Icon |
|-------|------|-------|------|
| Idle | "Voice2Code: Ready" | Default | $(mic) |
| Recording | "Voice2Code: Recording..." | Red | $(circle-filled) |
| Transcribing | "Voice2Code: Transcribing..." | Yellow | $(loading~spin) |
| Error | "Voice2Code: Error" | Red | $(error) |

---

## Response Models

### Model 8: TranscriptionResult

**Purpose:** Standardized transcription response from STT endpoint

**TypeScript Interface:**

```typescript
interface TranscriptionResult {
  text: string;                   // Transcribed text (REQUIRED)
  confidence?: number;            // Confidence score (0-1)
  language?: string;              // Detected language code
  duration?: number;              // Audio duration in seconds
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | Yes | The transcribed text content |
| confidence | number | No | Confidence score from 0.0 to 1.0 |
| language | string | No | ISO 639-1 language code (e.g., "en", "es") |
| duration | number | No | Audio duration in seconds |

**Validation:**
- `text` must be non-null string (can be empty string)
- `confidence` must be between 0.0 and 1.0 if provided
- `language` must be valid ISO 639-1 code if provided
- `duration` must be positive number if provided

**Response Parsing Priority:**
Different STT providers use different response formats. Parse in this order:

1. Try `response.data.text` (OpenAI Whisper API format)
2. Try `response.data.response` (Ollama format)
3. Try `response.data.transcription` (Generic format)
4. Try `response.data.data.text` (Nested format)
5. If none found, throw `TranscriptionError`

---

## Error Models

### Model 9: Voice2CodeError

**Purpose:** Base error class for all extension errors

**TypeScript Class:**

```typescript
abstract class Voice2CodeError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
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

type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUDIO_ERROR'
  | 'CONFIG_ERROR'
  | 'STT_ERROR'
  | 'VALIDATION_ERROR';
```

**Specific Error Classes:**

```typescript
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

class ValidationError extends Voice2CodeError {
  constructor(message: string, details?: string) {
    super(message, 'VALIDATION_ERROR', details);
  }
}
```

---

## Audio Device Model

### Model 10: AudioDevice

**Purpose:** Represent an available audio input device

**TypeScript Interface:**

```typescript
interface AudioDevice {
  id: string;                     // Device identifier
  name: string;                   // Human-readable name
  isDefault: boolean;             // Is system default device
  channels: number;               // Number of input channels
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Platform-specific device identifier |
| name | string | User-friendly device name (e.g., "Built-in Microphone") |
| isDefault | boolean | True if this is the system default input device |
| channels | number | Number of input channels available |

**Example:**

```typescript
{
  id: "default",
  name: "System Default",
  isDefault: true,
  channels: 1
}

{
  id: "hw:0,0",
  name: "USB Microphone",
  isDefault: false,
  channels: 2
}
```

---

## Validation Helper Models

### Model 11: ValidationResult

**Purpose:** Standardized validation result format

**TypeScript Interface:**

```typescript
interface ValidationResult {
  valid: boolean;                 // Is input valid
  errors?: string[];              // Validation error messages
  warnings?: string[];            // Non-fatal warnings
}
```

**Example Usage:**

```typescript
function validateEndpointUrl(url: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    errors.push('URL is required');
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push('Protocol must be HTTP or HTTPS');
    }
    if (parsed.protocol === 'http:' && !isLocalhost(parsed.hostname)) {
      warnings.push('Using unencrypted HTTP for remote endpoint');
    }
  } catch (e) {
    errors.push('Invalid URL format');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
```

---

## Summary

**Configuration Models (VS Code Settings):**
1. EndpointConfiguration - STT endpoint settings
2. AudioConfiguration - Audio capture settings
3. UIConfiguration - UI preferences

**Secret Models (SecretStorage):**
4. API Credentials - Encrypted API keys

**Runtime State Models (In-Memory):**
5. RecordingState - Recording status
6. TranscriptionState - Transcription status
7. UIState - UI element states

**Response Models:**
8. TranscriptionResult - STT API response
9. Voice2CodeError - Error hierarchy

**Helper Models:**
10. AudioDevice - Audio device info
11. ValidationResult - Validation results

**Total Models:** 11

**No Database Required:** All data is either configuration (VS Code Settings), secrets (SecretStorage), or ephemeral runtime state (memory).
