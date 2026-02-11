# Data Architecture

## Overview

Voice2Code is a **data-minimalist** extension with no traditional database. All data is ephemeral or stored using VS Code's built-in APIs for configuration and secrets.

**Core Principle:** Collect and retain as little data as possible. Privacy first.

## Data Storage Strategy

### No Traditional Database

Voice2Code does NOT use:
- SQL databases (PostgreSQL, MySQL, SQLite)
- NoSQL databases (MongoDB, Redis)
- Local file-based databases
- Cloud storage services

**Rationale:**
- No persistent data needed for core functionality
- Reduces complexity and attack surface
- Aligns with privacy-first philosophy

## Storage Mechanisms

### 1. VS Code Settings (Configuration)

**Purpose:** Store user preferences and endpoint configurations

**Location:**
- User Settings: `~/.config/Code/User/settings.json` (or platform equivalent)
- Workspace Settings: `.vscode/settings.json`

**What We Store:**
```json
{
  "voice2code.endpoint.url": "http://localhost:11434/api/transcribe",
  "voice2code.endpoint.model": "whisper-large-v3",
  "voice2code.endpoint.timeout": 30000,
  "voice2code.audio.deviceId": "default",
  "voice2code.audio.sampleRate": 16000,
  "voice2code.audio.format": "mp3",
  "voice2code.ui.previewEnabled": true,
  "voice2code.ui.showStatusBar": true,
  "voice2code.ui.audioFeedback": true,
  "voice2code.shortcuts.toggleRecording": "ctrl+shift+v",
  "voice2code.history.enabled": false,
  "voice2code.history.maxItems": 50
}
```

**Access Pattern:**
```typescript
class ConfigurationManager {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('voice2code');
  }

  get<T>(key: string, defaultValue: T): T {
    return this.config.get(key, defaultValue);
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.config.update(key, value, vscode.ConfigurationTarget.Global);
  }
}
```

**Security:** Settings are stored in plain text. DO NOT store secrets here.

### 2. VS Code SecretStorage (Credentials)

**Purpose:** Store sensitive data (API keys, tokens)

**What We Store:**
```typescript
interface StoredSecrets {
  'voice2code.apiKey': string;           // STT endpoint API key
  'voice2code.customHeaders': string;    // JSON-serialized custom headers
}
```

**Access Pattern:**
```typescript
class SecretsManager {
  constructor(private secrets: vscode.SecretStorage) {}

  async storeApiKey(key: string): Promise<void> {
    await this.secrets.store('voice2code.apiKey', key);
  }

  async getApiKey(): Promise<string | undefined> {
    return await this.secrets.get('voice2code.apiKey');
  }

  async deleteApiKey(): Promise<void> {
    await this.secrets.delete('voice2code.apiKey');
  }
}
```

**Security:**
- Encrypted at rest (OS keychain)
- Not synced across devices
- Not accessible to other extensions

### 3. In-Memory State (Runtime Only)

**Purpose:** Track extension state during execution

**What We Store:**
```typescript
class ExtensionState {
  isRecording: boolean = false;
  audioBuffer: Buffer | null = null;
  currentDeviceId: string | null = null;
  lastTranscription: string | null = null;
  recordingStartTime: number | null = null;
}
```

**Lifecycle:**
- Created on extension activation
- Destroyed on extension deactivation
- Never persisted to disk

### 4. VS Code Memento (Optional Persistent State)

**Purpose:** Store optional features like transcription history

**Types:**
- **Global Memento:** Persists across workspaces
- **Workspace Memento:** Specific to current workspace

**What We Store:**
```typescript
interface TranscriptionHistoryEntry {
  text: string;
  timestamp: number;
  modelUsed: string;
}

class HistoryManager {
  constructor(private memento: vscode.Memento) {}

  async addEntry(entry: TranscriptionHistoryEntry): Promise<void> {
    const history = await this.getHistory();
    history.unshift(entry);

    // Keep only last 50 entries
    if (history.length > 50) {
      history.length = 50;
    }

    await this.memento.update('voice2code.history', history);
  }

  async getHistory(): Promise<TranscriptionHistoryEntry[]> {
    return this.memento.get('voice2code.history', []);
  }

  async clearHistory(): Promise<void> {
    await this.memento.update('voice2code.history', []);
  }
}
```

**Security:**
- Disabled by default
- User must explicitly enable
- No audio stored, only text
- User can clear anytime

## Data Models

### Configuration Model

```typescript
interface EndpointConfiguration {
  url: string;                    // e.g., "http://localhost:11434/api/transcribe"
  model: string;                  // e.g., "whisper-large-v3"
  timeout: number;                // milliseconds (default: 30000)
  customHeaders?: Record<string, string>;  // Optional auth headers
}

interface AudioConfiguration {
  deviceId: string;               // Audio input device ID (default: "default")
  sampleRate: number;             // Hz (default: 16000)
  bitDepth: number;               // bits (default: 16)
  channels: number;               // 1 = mono, 2 = stereo (default: 1)
  format: 'mp3' | 'wav';          // Encoding format (default: "mp3")
}

interface UIConfiguration {
  previewEnabled: boolean;        // Show transcription preview (default: true)
  showStatusBar: boolean;         // Show status bar item (default: true)
  audioFeedback: boolean;         // Play beep on start/stop (default: true)
  notifyOnError: boolean;         // Show error notifications (default: true)
}

interface ShortcutConfiguration {
  toggleRecording: string;        // Keybinding (default: "ctrl+shift+v")
}

interface HistoryConfiguration {
  enabled: boolean;               // Enable history feature (default: false)
  maxItems: number;               // Max history entries (default: 50)
}
```

### Runtime State Model

```typescript
interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  deviceId: string | null;
  audioBuffer: Buffer | null;
}

interface TranscriptionState {
  inProgress: boolean;
  startTime: number | null;
  endpoint: string | null;
  model: string | null;
}

interface UIState {
  statusBarText: string;
  recordingIndicatorVisible: boolean;
  previewPanelVisible: boolean;
}
```

### Transcription Result Model

```typescript
interface TranscriptionResult {
  text: string;                   // The transcribed text
  confidence?: number;            // Optional confidence score (0-1)
  language?: string;              // Detected language (e.g., "en")
  duration?: number;              // Audio duration in seconds
}
```

### Error Model

```typescript
type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUDIO_ERROR'
  | 'CONFIG_ERROR'
  | 'STT_ERROR'
  | 'VALIDATION_ERROR';

interface Voice2CodeError {
  code: ErrorCode;
  message: string;                // User-facing message
  details?: string;               // Technical details
  timestamp: number;
  context?: Record<string, unknown>;  // Additional context
}
```

## Data Flow

### Recording → Transcription → Insertion Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User triggers recording                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Load configuration from VS Code Settings                 │
│    - Endpoint URL                                            │
│    - Model name                                              │
│    - Audio settings                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Start audio capture (in-memory buffer)                   │
│    State: { isRecording: true, audioBuffer: Buffer }        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User stops recording                                      │
│    State: { isRecording: false }                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Encode audio to MP3 (in-memory transformation)           │
│    audioBuffer: Buffer → mp3Buffer: Buffer                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Send to STT endpoint via HTTPS                           │
│    POST {endpoint} + Bearer {apiKey from SecretStorage}     │
│    Body: mp3Buffer                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Receive transcription result                             │
│    Response: { text: "hello world" }                        │
│    Clear audioBuffer: null                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Show preview (if enabled)                                │
│    UIState: { previewPanelVisible: true }                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. User confirms insertion                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Insert text into editor at cursor position              │
│     editor.edit(builder => builder.insert(position, text))  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. (Optional) Save to history (if enabled)                 │
│     Memento: { text, timestamp, model }                     │
└─────────────────────────────────────────────────────────────┘
```

## Data Lifecycle

### Audio Data Lifecycle

```typescript
// Stage 1: Capture (in-memory only)
const audioBuffer: Buffer = await audioManager.capture();

// Stage 2: Encode (temporary transformation)
const mp3Buffer: Buffer = await audioEncoder.encode(audioBuffer);

// Stage 3: Transmit (network I/O)
const result = await transcriptionService.send(mp3Buffer);

// Stage 4: Destroy (immediate cleanup)
audioBuffer = null;  // Eligible for garbage collection
mp3Buffer = null;    // Eligible for garbage collection

// Audio data lifetime: < 1 minute (typically seconds)
// Audio never touches disk
```

### Configuration Data Lifecycle

```typescript
// Created: During first run or settings change
await config.set('voice2code.endpoint.url', 'http://localhost:11434');

// Read: On every transcription request
const endpointUrl = config.get('voice2code.endpoint.url');

// Updated: When user changes settings
await config.set('voice2code.endpoint.model', 'whisper-v2');

// Deleted: Manual user action only
// Configuration persists across sessions
```

### Secret Data Lifecycle

```typescript
// Created: User enters API key in settings UI
await secrets.store('voice2code.apiKey', 'sk-abc123');

// Read: On every authenticated request
const apiKey = await secrets.get('voice2code.apiKey');

// Updated: User changes API key
await secrets.store('voice2code.apiKey', 'sk-xyz789');

// Deleted: User removes endpoint or resets settings
await secrets.delete('voice2code.apiKey');

// Secrets persist until explicitly deleted
```

## Data Retention

### Immediate Deletion (Ephemeral)
- Audio buffers
- Network request/response objects
- Temporary transcription results (before insertion)

### Session-Based Retention (Until Extension Deactivation)
- Runtime state (isRecording, currentDevice, etc.)
- UI state (status bar text, panel visibility)
- Cache (if any, e.g., device list)

### Persistent Retention (Until User Deletes)
- Configuration settings
- API keys / credentials
- Transcription history (if enabled)

### No Retention (Never Stored)
- Raw audio files
- Full API responses (only extract text field)
- User's voice characteristics
- Biometric data

## Data Migration

### Configuration Schema Versioning

```typescript
interface ConfigMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (oldConfig: unknown) => unknown;
}

const migrations: ConfigMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (old: any) => ({
      ...old,
      // Example: Rename setting
      'endpoint.url': old['endpointUrl'],
    }),
  },
];

async function migrateConfiguration(): Promise<void> {
  const version = config.get('voice2code.configVersion', 1);

  for (const migration of migrations) {
    if (version === migration.fromVersion) {
      const oldConfig = await getAllSettings();
      const newConfig = migration.migrate(oldConfig);
      await applySettings(newConfig);
      await config.set('voice2code.configVersion', migration.toVersion);
    }
  }
}
```

### Backward Compatibility

- Maintain support for N-1 version's configuration
- Provide migration path for breaking changes
- Never silently delete user data

## Backup & Recovery

### User-Initiated Backup

```typescript
async function exportConfiguration(): Promise<string> {
  const config = {
    endpoints: getAllEndpoints(),
    settings: getAllSettings(),
    // Exclude secrets for security
  };

  return JSON.stringify(config, null, 2);
}

async function importConfiguration(json: string): Promise<void> {
  const config = JSON.parse(json);

  // Validate schema
  validateConfigSchema(config);

  // Apply settings
  for (const [key, value] of Object.entries(config.settings)) {
    await vscode.workspace.getConfiguration('voice2code').update(key, value);
  }
}
```

**Export Format:**
```json
{
  "version": 1,
  "exportDate": "2026-02-11T10:30:00Z",
  "endpoints": [
    {
      "name": "Local Ollama",
      "url": "http://localhost:11434/api/transcribe",
      "model": "whisper-large-v3"
    }
  ],
  "settings": {
    "audio.sampleRate": 16000,
    "ui.previewEnabled": true
  }
}
```

### VS Code Settings Sync

Voice2Code settings automatically sync across devices via VS Code Settings Sync (if enabled by user).

**Excluded from Sync:**
- Secrets (API keys)
- Device-specific settings (audio device ID)
- Workspace-specific settings

## Data Privacy Compliance

### GDPR Compliance

- **Right to Access:** User can export all their data (settings)
- **Right to Deletion:** User can clear history, delete API keys, uninstall extension
- **Right to Portability:** Export/import configuration as JSON
- **Data Minimization:** Only collect what's necessary
- **No Profiling:** No behavioral tracking or analytics

### CCPA Compliance

- **No Sale of Data:** Extension does not sell user data (we don't collect any)
- **Opt-In:** Telemetry (if any) is opt-in only
- **Transparency:** Open source code, clear data practices

## Performance Considerations

### Memory Management

```typescript
// Avoid memory leaks
class AudioManager {
  private cleanup(): void {
    // Clear references to large buffers
    this.audioBuffer = null;

    // Remove event listeners
    this.stream?.removeAllListeners();

    // Close resources
    this.stream?.destroy();
  }
}
```

### Storage Limits

- **Settings:** No practical limit (JSON configuration)
- **Secrets:** Limited by OS keychain capacity (typically sufficient)
- **Memento:** Limited to ~1MB per extension (more than enough for history)
- **In-Memory:** Limited by available RAM (aim for <100MB)

### Caching Strategy

```typescript
// Cache audio devices list (avoid repeated enumeration)
class DeviceManager {
  private cachedDevices: AudioDevice[] | null = null;
  private cacheTimestamp: number = 0;
  private CACHE_TTL = 60000;  // 1 minute

  async getDevices(): Promise<AudioDevice[]> {
    const now = Date.now();

    if (this.cachedDevices && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedDevices;
    }

    this.cachedDevices = await this.enumerateDevices();
    this.cacheTimestamp = now;

    return this.cachedDevices;
  }
}
```

## Testing Data Scenarios

```typescript
// Test: Configuration persistence
test('should persist configuration across reloads', async () => {
  await config.set('voice2code.endpoint.url', 'http://test.com');

  // Simulate extension reload
  const newConfig = vscode.workspace.getConfiguration('voice2code');
  expect(newConfig.get('endpoint.url')).toBe('http://test.com');
});

// Test: Audio buffer cleanup
test('should clear audio buffer after transcription', async () => {
  await audioManager.startCapture();
  const buffer = await audioManager.stopCapture();

  expect(buffer).not.toBeNull();
  expect((audioManager as any).audioBuffer).toBeNull();  // Cleared
});

// Test: History size limit
test('should limit history to max items', async () => {
  for (let i = 0; i < 100; i++) {
    await historyManager.addEntry({ text: `test${i}`, timestamp: i });
  }

  const history = await historyManager.getHistory();
  expect(history.length).toBe(50);  // Limited to 50
});
```

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Status:** Active - Data Minimalism is Key
