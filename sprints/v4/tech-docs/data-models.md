# Data Models — Sprint v4

## Overview

Sprint v4 extends the existing desktop config schema with new fields and introduces two new data stores: command vocabulary and transcription history. All data is stored locally via `electron-store` (JSON files in app data directory). No traditional database.

---

## Model 1: DesktopConfig (Extended)

### Purpose
Extended configuration schema adding `audio.deviceId`, `ui.voiceCommandsEnabled`, and custom command vocabulary.

### Storage
`electron-store` — file: `config.json` in `app.getPath('userData')`

### Schema Changes (additions to existing Sprint v3 schema)

| Field Path | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `audio.deviceId` | string | `"default"` | Non-empty string | Selected audio input device ID |
| `ui.voiceCommandsEnabled` | boolean | `true` | - | Whether voice commands are active |
| `ui.customCommands` | `Record<string, string>` | `{}` | Keys: lowercase words/phrases; Values: valid osascript keystroke strings | User-defined command vocabulary |

### Updated DesktopConfig Interface

```typescript
export interface DesktopConfig {
  endpoint: {
    url: string;
    model: string;
    timeout: number;
    language: string;
  };
  audio: {
    sampleRate: number;
    format: 'mp3' | 'wav';
    deviceId: string;          // NEW — Sprint v4
  };
  ui: {
    showNotifications: boolean;
    voiceCommandsEnabled: boolean;  // NEW — Sprint v4
    customCommands: Record<string, string>;  // NEW — Sprint v4
  };
}
```

### Updated DEFAULT_CONFIG

```typescript
export const DEFAULT_CONFIG: DesktopConfig = {
  endpoint: {
    url: 'http://localhost:8000/v1/audio/transcriptions',
    model: 'whisper-large-v3',
    timeout: 30000,
    language: 'en',
  },
  audio: {
    sampleRate: 16000,
    format: 'mp3',
    deviceId: 'default',          // NEW
  },
  ui: {
    showNotifications: true,
    voiceCommandsEnabled: true,    // NEW
    customCommands: {},            // NEW
  },
};
```

### Validation Rules

**`audio.deviceId`:**
- Non-empty string after trimming
- If empty or undefined, fall back to `"default"`
- No format validation (device IDs are opaque strings from the OS)

**`ui.voiceCommandsEnabled`:**
- Boolean, no validation needed
- Default: `true`

**`ui.customCommands`:**
- Object with string keys and string values
- Keys must be lowercase, trimmed, non-empty
- Values must be non-empty strings
- Keys are case-insensitive command phrases (e.g., `"clear screen"`)
- Values are osascript keystroke descriptions (e.g., `"keystroke \"k\" using command down"`)

### Migration
No migration needed — `electron-store` returns defaults for missing keys.

---

## Model 2: TranscriptionHistoryEntry

### Purpose
Represents a single transcription stored in the history log.

### Storage
`electron-store` — separate store file `history.json` in app data directory

### Fields

| Field Name | Type | Constraints | Description |
|---|---|---|---|
| id | string | UUID v4, NOT NULL | Unique identifier for the entry |
| text | string | NOT NULL, max 10,000 chars | Transcribed text content |
| timestamp | number | NOT NULL, Unix epoch ms | When the transcription occurred |
| language | string | NOT NULL | Language code used (e.g., `"en"`) |

### Interface Definition

```typescript
export interface TranscriptionHistoryEntry {
  id: string;
  text: string;
  timestamp: number;
  language: string;
}
```

**Note:** This is a desktop-specific interface. The shared `HistoryEntry` from `src/types/index.ts` includes `durationMs` which we don't track in the desktop app. We use our own simplified interface.

### Storage Schema

```typescript
interface HistoryData {
  entries: TranscriptionHistoryEntry[];
}
```

### Business Rules

- Maximum 50 entries (FIFO — oldest entries removed when limit exceeded)
- Text truncated to 10,000 characters if longer
- Entries ordered by timestamp descending (most recent first)
- `id` generated via `crypto.randomUUID()` (Electron supports this)
- History survives app restarts (persisted in electron-store)
- "Clear History" removes all entries

### Validation Rules

**`text`:**
- Must be non-empty after trimming
- Truncated to 10,000 chars if longer (don't reject, just truncate)

**`timestamp`:**
- Must be a valid Unix epoch timestamp in milliseconds
- Default: `Date.now()` at insertion time

**`language`:**
- Non-empty string, defaults to config's language setting

---

## Model 3: VoiceCommand

### Purpose
Maps a spoken phrase to a keyboard action for the CommandParser.

### Storage
Built-in commands are hardcoded constants. Custom commands are stored in `DesktopConfig.ui.customCommands`.

### Fields

| Field Name | Type | Description |
|---|---|---|
| phrase | string | The spoken phrase to detect (case-insensitive) |
| keystroke | string | osascript keystroke to execute |

### Built-in Command Vocabulary

| Phrase | Keystroke (osascript) | Description |
|---|---|---|
| `new line` | `key code 36` | Press Enter/Return |
| `enter` | `key code 36` | Press Enter/Return |
| `tab` | `key code 48` | Press Tab |
| `space` | `key code 49` | Press Space |
| `backspace` | `key code 51` | Press Delete/Backspace |
| `delete` | `key code 51` | Press Delete/Backspace |
| `select all` | `keystroke "a" using command down` | Cmd+A |
| `undo` | `keystroke "z" using command down` | Cmd+Z |
| `redo` | `keystroke "z" using {command down, shift down}` | Cmd+Shift+Z |
| `copy that` | `keystroke "c" using command down` | Cmd+C |
| `paste that` | `keystroke "v" using command down` | Cmd+V |
| `cut that` | `keystroke "x" using command down` | Cmd+X |
| `escape` | `key code 53` | Press Escape |

### Command Resolution Rules

1. **Case-insensitive matching**: "New Line" matches "new line"
2. **Custom commands take priority** over built-in commands (user can override)
3. **Longest match wins**: If text contains "new line break", and both "new line" and "new line break" are commands, the longer phrase matches
4. **Word-boundary matching**: Commands only match at word boundaries — "undoing" does NOT match "undo"
5. **Commands are greedy**: Scan left-to-right, match the longest command at each position

### Interface Definition

```typescript
interface VoiceCommand {
  phrase: string;
  keystroke: string;
}
```

---

## Model 4: ParsedSegment

### Purpose
Represents a segment of parsed transcription output — either plain text or a command.

### Fields

| Field Name | Type | Description |
|---|---|---|
| type | `'text' \| 'command'` | Whether this is text to type or a command to execute |
| value | string | For `text`: the text to paste. For `command`: the osascript keystroke |

### Interface Definition

```typescript
export type ParsedSegment =
  | { type: 'text'; value: string }
  | { type: 'command'; value: string };
```

### Example

Input: `"hello new line world"`

Parsed output:
```json
[
  { "type": "text", "value": "hello " },
  { "type": "command", "value": "key code 36" },
  { "type": "text", "value": "world" }
]
```

---

## Model 5: IPC Message Types (New Channels)

### Purpose
New IPC channels for Sprint v4 features.

### New Channels

| Channel | Direction | Request Payload | Success Response |
|---|---|---|---|
| `settings:get-devices` | renderer → main | _(none)_ | `AudioDevice[]` |
| `history:get` | renderer → main | _(none)_ | `TranscriptionHistoryEntry[]` |
| `history:clear` | renderer → main | _(none)_ | `{ success: boolean }` |
| `history:copy` | renderer → main | `{ id: string }` | `{ success: boolean; error?: string }` |

### `settings:get-devices` Response

```typescript
// Returns shared AudioDevice[] from @core/types
[
  { id: "macbook-pro-microphone", name: "MacBook Pro Microphone", isDefault: true },
  { id: "usb-headset", name: "USB Headset", isDefault: false }
]
```

### `history:get` Response

```typescript
// Returns most recent first
[
  { id: "uuid-1", text: "hello world", timestamp: 1709000000000, language: "en" },
  { id: "uuid-2", text: "git commit", timestamp: 1708999000000, language: "en" }
]
```

### `history:copy` Request

```typescript
{ id: "uuid-1" }
```

Copies the text of the matching entry to the clipboard.

---

## Tray Context Menu (Updated)

### Structure

```
Start Recording      (visible when idle)
Stop Recording       (visible when recording)
─────────────────
History              ← NEW (Sprint v4)
Settings...
Test Connection
─────────────────
Quit Voice2Code
```

The "History" item opens the HistoryWindow. It is always enabled regardless of recording state.
