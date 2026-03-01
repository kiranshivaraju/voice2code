# Component Design — Sprint v4

## Overview

Sprint v4 introduces 4 new components and modifies 6 existing ones. This document provides detailed class/module design for each.

---

## New Component 1: CommandParser

### Purpose
Parses transcribed text to identify voice commands mixed with regular text. Produces an array of segments that can be either text-to-paste or commands-to-execute.

### Location
`desktop/src/command-parser.ts`

### Class Definition

```typescript
import { ConfigStore } from './config-store';

export type ParsedSegment =
  | { type: 'text'; value: string }
  | { type: 'command'; value: string };

export const BUILT_IN_COMMANDS: Record<string, string> = {
  'new line': 'key code 36',
  'enter': 'key code 36',
  'tab': 'key code 48',
  'space': 'key code 49',
  'backspace': 'key code 51',
  'delete': 'key code 51',
  'select all': 'keystroke "a" using command down',
  'undo': 'keystroke "z" using command down',
  'redo': 'keystroke "z" using {command down, shift down}',
  'copy that': 'keystroke "c" using command down',
  'paste that': 'keystroke "v" using command down',
  'cut that': 'keystroke "x" using command down',
  'escape': 'key code 53',
};

export class CommandParser {
  private commands: Map<string, string>;

  constructor(customCommands: Record<string, string> = {}) {
    // Merge built-in + custom commands. Custom commands override built-in.
    this.commands = new Map<string, string>();
    for (const [phrase, keystroke] of Object.entries(BUILT_IN_COMMANDS)) {
      this.commands.set(phrase.toLowerCase(), keystroke);
    }
    for (const [phrase, keystroke] of Object.entries(customCommands)) {
      this.commands.set(phrase.toLowerCase().trim(), keystroke);
    }
  }

  /**
   * Parse transcribed text into segments of text and commands.
   *
   * Algorithm:
   * 1. Convert input to lowercase for matching
   * 2. Sort command phrases by length descending (longest match first)
   * 3. Scan left-to-right, at each position try to match the longest command
   * 4. Commands only match at word boundaries
   * 5. Non-command text is collected into text segments
   *
   * @param text - Raw transcribed text
   * @returns Array of ParsedSegment objects
   *
   * @example
   * parse("hello new line world")
   * // Returns:
   * // [
   * //   { type: 'text', value: 'hello ' },
   * //   { type: 'command', value: 'key code 36' },
   * //   { type: 'text', value: 'world' }
   * // ]
   */
  parse(text: string): ParsedSegment[] {
    // Implementation details in implementation-plan.md
  }

  /**
   * Get all registered commands (built-in + custom).
   */
  getCommands(): Map<string, string> {
    return new Map(this.commands);
  }
}
```

### Algorithm Detail: Word-Boundary Matching

The parser must ONLY match commands at word boundaries to avoid false positives:

- `"undoing something"` → `[{ type: 'text', value: 'undoing something' }]` (NOT "undo" + "ing something")
- `"please undo that"` → `[{ type: 'text', value: 'please ' }, { type: 'command', value: '...' }, { type: 'text', value: 'that' }]`
- `"tabletop"` → `[{ type: 'text', value: 'tabletop' }]` (NOT "tab" + "letop")

Word boundary check: the character before the match must be a space, start-of-string, or punctuation. The character after the match must be a space, end-of-string, or punctuation.

### Edge Cases

| Input | Expected Output | Why |
|---|---|---|
| `""` (empty) | `[]` | Empty input produces empty output |
| `"hello"` | `[{ type: 'text', value: 'hello' }]` | No commands |
| `"new line"` | `[{ type: 'command', value: 'key code 36' }]` | Pure command |
| `"new line new line"` | `[{ type: 'command', ... }, { type: 'command', ... }]` | Multiple commands |
| `"hello new line world"` | `[text, command, text]` | Mixed |
| `"  hello  "` | `[{ type: 'text', value: '  hello  ' }]` | Preserve whitespace |
| `"UNDO"` | `[{ type: 'command', value: '...' }]` | Case insensitive |
| `"undoing"` | `[{ type: 'text', value: 'undoing' }]` | Word boundary |

### Dependencies
None (pure logic, no Electron dependencies)

### Test File
`desktop/tests/unit/command-parser.test.ts`

### Required Tests

1. Empty string returns empty array
2. Text with no commands returns single text segment
3. Single command returns single command segment
4. Mixed text and command returns correct segments
5. Multiple commands in sequence
6. Case-insensitive matching
7. Word-boundary matching (no partial word matches)
8. Custom commands override built-in commands
9. Longest match wins for overlapping phrases
10. Whitespace preserved in text segments
11. Adjacent text segments are merged
12. All 13 built-in commands recognized correctly

---

## New Component 2: CommandExecutor

### Purpose
Executes an array of `ParsedSegment` objects by pasting text segments and simulating keystrokes for command segments.

### Location
`desktop/src/command-executor.ts`

### Class Definition

```typescript
import { clipboard } from 'electron';
import { execSync } from 'child_process';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CommandExecutor {
  /**
   * Execute parsed segments sequentially.
   *
   * For each segment:
   * - text: save clipboard → write text → Cmd+V → restore clipboard
   * - command: execute osascript keystroke
   *
   * @param segments - Array of ParsedSegment from CommandParser
   * @param delayMs - Delay between operations (default 50ms, tests pass 1)
   */
  async execute(segments: ParsedSegment[], delayMs = 50): Promise<void> {
    if (segments.length === 0) return;

    const previousClipboard = clipboard.readText();

    try {
      for (const segment of segments) {
        if (segment.type === 'text') {
          const text = segment.value;
          if (!text.trim()) continue; // skip whitespace-only segments
          clipboard.writeText(text);
          await delay(delayMs);
          execSync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
          await delay(delayMs);
        } else {
          // command segment
          await delay(delayMs);
          execSync(`osascript -e 'tell application "System Events" to ${segment.value}'`);
          await delay(delayMs);
        }
      }
    } finally {
      clipboard.writeText(previousClipboard);
    }
  }
}
```

### Security Note
Command segment values come from the hardcoded `BUILT_IN_COMMANDS` map or from user-configured `customCommands` in their config. They are never derived from untrusted input. The osascript command is constructed from these trusted values only.

### Dependencies
- `electron` (`clipboard`)
- `child_process` (`execSync`)

### Test File
`desktop/tests/unit/command-executor.test.ts`

### Required Tests

1. Empty segments array does nothing
2. Single text segment: writes to clipboard, simulates Cmd+V, restores clipboard
3. Single command segment: executes osascript with correct keystroke
4. Mixed text + command segments: executed in order
5. Clipboard restored after execution (in finally block)
6. Clipboard restored even on error
7. Whitespace-only text segments skipped

### Mocking Strategy
- Mock `electron.clipboard` (read/write)
- Mock `child_process.execSync` — verify osascript commands
- Pass `delayMs=1` in tests

---

## New Component 3: HistoryStore

### Purpose
Persists transcription history with FIFO eviction at 50 entries.

### Location
`desktop/src/history-store.ts`

### Class Definition

```typescript
import Store from 'electron-store';
import { randomUUID } from 'crypto';

export interface TranscriptionHistoryEntry {
  id: string;
  text: string;
  timestamp: number;
  language: string;
}

interface HistoryData {
  entries: TranscriptionHistoryEntry[];
}

const MAX_ENTRIES = 50;
const MAX_TEXT_LENGTH = 10000;

export class HistoryStore {
  private store: Store<HistoryData>;

  constructor() {
    this.store = new Store<HistoryData>({
      name: 'history',
      defaults: { entries: [] },
    });
  }

  /**
   * Add a transcription to history.
   * If at max capacity, removes the oldest entry (FIFO).
   * Text is truncated to MAX_TEXT_LENGTH if longer.
   */
  add(text: string, language: string): TranscriptionHistoryEntry {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Cannot add empty transcription to history');
    }

    const entry: TranscriptionHistoryEntry = {
      id: randomUUID(),
      text: trimmed.substring(0, MAX_TEXT_LENGTH),
      timestamp: Date.now(),
      language: language || 'en',
    };

    const entries = this.store.get('entries') ?? [];
    entries.unshift(entry); // add to front (most recent first)

    // Evict oldest if over limit
    if (entries.length > MAX_ENTRIES) {
      entries.length = MAX_ENTRIES;
    }

    this.store.set('entries', entries);
    return entry;
  }

  /**
   * Get all history entries, most recent first.
   */
  getAll(): TranscriptionHistoryEntry[] {
    return this.store.get('entries') ?? [];
  }

  /**
   * Get a single entry by ID.
   */
  getById(id: string): TranscriptionHistoryEntry | undefined {
    const entries = this.store.get('entries') ?? [];
    return entries.find(e => e.id === id);
  }

  /**
   * Clear all history entries.
   */
  clear(): void {
    this.store.set('entries', []);
  }

  /**
   * Get the number of entries.
   */
  count(): number {
    return (this.store.get('entries') ?? []).length;
  }
}
```

### Dependencies
- `electron-store`
- `crypto` (for `randomUUID`)

### Test File
`desktop/tests/unit/history-store.test.ts`

### Required Tests

1. Starts with empty history
2. `add()` creates entry with correct fields (id, text, timestamp, language)
3. `add()` returns the created entry
4. `getAll()` returns entries in reverse chronological order (most recent first)
5. `add()` truncates text to 10,000 characters
6. `add()` trims whitespace from text
7. `add()` throws on empty/whitespace-only text
8. `add()` defaults language to `"en"` when empty
9. FIFO eviction: adding 51st entry removes the oldest
10. `getById()` returns correct entry
11. `getById()` returns undefined for non-existent ID
12. `clear()` removes all entries
13. `clear()` on empty store is a no-op
14. `count()` returns correct number
15. Data survives store reconstruction (persistence)

### Mocking Strategy
Same as ConfigStore — mock `electron-store` with a `Map<string, unknown>`.

---

## New Component 4: HistoryWindow

### Purpose
BrowserWindow for viewing and managing transcription history.

### Location
`desktop/src/history-window.ts`

### Class Definition

```typescript
import { BrowserWindow, ipcMain, clipboard } from 'electron';
import path from 'path';
import { HistoryStore } from './history-store';

export class HistoryWindow {
  private window: BrowserWindow | null = null;

  constructor(private historyStore: HistoryStore) {}

  show(): void {
    if (this.window) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 520,
      height: 500,
      resizable: true,
      minimizable: false,
      maximizable: false,
      title: 'Voice2Code History',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.window.loadFile(path.join(__dirname, 'history', 'history.html'));
    this.window.on('closed', () => { this.window = null; });
  }

  close(): void {
    this.window?.close();
    this.window = null;
  }

  isOpen(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  registerIPCHandlers(): void {
    ipcMain.handle('history:get', () => {
      return this.historyStore.getAll();
    });

    ipcMain.handle('history:clear', () => {
      this.historyStore.clear();
      return { success: true };
    });

    ipcMain.handle('history:copy', (_event, { id }: { id: string }) => {
      if (!id || typeof id !== 'string') {
        return { success: false, error: 'Invalid entry ID' };
      }
      const entry = this.historyStore.getById(id);
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      clipboard.writeText(entry.text);
      return { success: true };
    });
  }
}
```

### Window Properties
- **Width:** 520px (same as Settings)
- **Height:** 500px
- **Resizable:** true (list may need scrolling)
- **Reuse pattern:** If window exists, focus it instead of creating a new one

### Dependencies
- `electron` (BrowserWindow, ipcMain, clipboard)
- `HistoryStore`

### Test File
`desktop/tests/unit/history-window.test.ts`

### Required Tests

1. `show()` creates a BrowserWindow with correct options
2. `show()` focuses existing window instead of creating duplicate
3. `close()` closes and nullifies the window
4. `isOpen()` returns true/false correctly
5. IPC `history:get` returns all entries from store
6. IPC `history:clear` clears the store and returns `{ success: true }`
7. IPC `history:copy` copies entry text to clipboard
8. IPC `history:copy` returns error for non-existent ID
9. IPC `history:copy` returns error for empty/invalid ID

### Mocking Strategy
Same as SettingsWindow tests — mock `electron` module (BrowserWindow, ipcMain, clipboard).

---

## Modified Component: ConfigStore

### Changes
Add `audio.deviceId`, `ui.voiceCommandsEnabled`, `ui.customCommands` to schema.

### Modified Files
`desktop/src/config-store.ts`

### Specific Changes

1. Add `deviceId: string` to `DesktopConfig.audio`
2. Add `voiceCommandsEnabled: boolean` to `DesktopConfig.ui`
3. Add `customCommands: Record<string, string>` to `DesktopConfig.ui`
4. Update `DEFAULT_CONFIG` with new defaults
5. Update `getAudioConfig()` to read `audio.deviceId` instead of hardcoding `'default'`
6. Update `getUIConfig()` return type to include new fields
7. Update `getAll()` to include new fields
8. Add validation in `saveAudio()` for `deviceId`
9. Add validation in `saveUI()` for new fields

### getAudioConfig() Change

```typescript
// BEFORE (Sprint v3)
getAudioConfig(): AudioConfiguration {
  return {
    deviceId: 'default',  // hardcoded
    ...
  };
}

// AFTER (Sprint v4)
getAudioConfig(): AudioConfiguration {
  return {
    deviceId: this.store.get('audio.deviceId') ?? DEFAULT_CONFIG.audio.deviceId,
    ...
  };
}
```

### getUIConfig() Change

```typescript
// BEFORE (Sprint v3)
getUIConfig(): { showNotifications: boolean } {
  return {
    showNotifications: this.store.get('ui.showNotifications') ?? DEFAULT_CONFIG.ui.showNotifications,
  };
}

// AFTER (Sprint v4)
getUIConfig(): { showNotifications: boolean; voiceCommandsEnabled: boolean; customCommands: Record<string, string> } {
  return {
    showNotifications: this.store.get('ui.showNotifications') ?? DEFAULT_CONFIG.ui.showNotifications,
    voiceCommandsEnabled: this.store.get('ui.voiceCommandsEnabled') ?? DEFAULT_CONFIG.ui.voiceCommandsEnabled,
    customCommands: this.store.get('ui.customCommands') ?? DEFAULT_CONFIG.ui.customCommands,
  };
}
```

---

## Modified Component: DesktopEngine

### Changes
After transcription, route through CommandParser + CommandExecutor when voice commands are enabled. Also add transcription to HistoryStore on success.

### Modified Files
`desktop/src/desktop-engine.ts`

### Specific Changes

1. Add `HistoryStore` to constructor dependencies
2. Add `CommandParser` and `CommandExecutor` to constructor or create inline
3. In `stopRecording()`, after getting `result.text`:
   - If `voiceCommandsEnabled`: parse with CommandParser, execute with CommandExecutor
   - If not: use existing `pasteText(result.text)` path
4. After successful paste/execute, add to history: `historyStore.add(result.text, endpointConfig.language)`

### Updated Constructor

```typescript
export class DesktopEngine {
  constructor(
    private configStore: ConfigStore,
    private secretStore: SecretStore,
    private audioManager: AudioManagerLike,
    private audioEncoder: AudioEncoderLike,
    private trayManager: TrayManager,
    private notify: NotifyFn,
    private adapterFactory: AdapterFactoryLike,
    private historyStore?: HistoryStoreLike,  // NEW — optional for backward compat
  ) {}
}
```

### Updated stopRecording() Flow

```typescript
async stopRecording(): Promise<void> {
  // ... existing code until result.text ...

  const uiConfig = this.configStore.getUIConfig();
  if (uiConfig.voiceCommandsEnabled) {
    const parser = new CommandParser(uiConfig.customCommands);
    const segments = parser.parse(result.text);
    const executor = new CommandExecutor();
    await executor.execute(segments);
  } else {
    await pasteText(result.text);
  }

  // Add to history
  this.historyStore?.add(result.text, endpointConfig.language);
}
```

---

## Modified Component: TrayManager

### Changes
Add "History" menu item between the separator and "Settings...".

### Modified Files
`desktop/src/tray.ts`

### Specific Changes

1. Add `onOpenHistory` callback to `TrayCallbacks` interface
2. Add `setOnOpenHistory(callback)` method
3. Add "History" menu item to `buildMenu()` template

### Updated Menu Template

```typescript
const template: MenuItemConstructorOptions[] = [
  { label: 'Start Recording', ... },
  { label: 'Stop Recording', ... },
  { type: 'separator' },
  {
    label: 'History',               // NEW
    click: () => this.callbacks.onOpenHistory?.(),
  },
  { label: 'Settings...', ... },
  { label: 'Test Connection', ... },
  { type: 'separator' },
  { label: 'Quit Voice2Code', ... },
];
```

---

## Modified Component: SettingsWindow

### Changes
Add `settings:get-devices` IPC handler.

### Modified Files
`desktop/src/settings-window.ts`

### Specific Changes

1. Add `DeviceManager` to constructor dependencies
2. Register `settings:get-devices` handler in `registerIPCHandlers()`

### New Handler

```typescript
ipcMain.handle('settings:get-devices', async () => {
  try {
    return await this.deviceManager.getDevices();
  } catch {
    return [{ id: 'default', name: 'System Default', isDefault: true }];
  }
});
```

---

## Modified Component: Preload Script

### Changes
Add `getDevices()` to `settingsAPI` and expose new `historyAPI`.

### Modified Files
`desktop/src/preload.ts`

### Updated Code

```typescript
contextBridge.exposeInMainWorld('settingsAPI', {
  // ... existing methods ...
  getDevices: () => ipcRenderer.invoke('settings:get-devices'),  // NEW
});

contextBridge.exposeInMainWorld('historyAPI', {  // NEW
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  copyEntry: (id: string) => ipcRenderer.invoke('history:copy', { id }),
});
```

---

## UI Components

### Settings UI Changes (Audio Section)

Add device dropdown to `settings.html`:

```html
<!-- Inside Audio section, add before Format dropdown -->
<div class="field">
  <label for="audio-device">Microphone</label>
  <div class="field-row">
    <select id="audio-device" style="flex: 1;">
      <option value="default">System Default</option>
    </select>
    <button id="btn-refresh-devices" type="button" style="margin-left: 8px;">↻</button>
  </div>
</div>
```

### History UI (`history.html`)

```html
<div class="container">
  <h1>Transcription History</h1>
  <div class="toolbar">
    <input type="text" id="search-input" placeholder="Search transcriptions...">
    <button id="btn-clear-history" type="button" class="btn-danger">Clear All</button>
  </div>
  <div id="history-list" class="history-list">
    <!-- Populated by renderer -->
  </div>
  <div id="empty-state" class="empty-state">
    No transcriptions yet. Start dictating to build your history.
  </div>
</div>
```

Each history item:
```html
<div class="history-item" data-id="{id}">
  <div class="history-text">{text}</div>
  <div class="history-meta">
    <span class="history-time">{relative time}</span>
    <button class="btn-copy" data-id="{id}">Copy</button>
  </div>
</div>
```

---

## Dependency Graph

```
                    ┌──────────────┐
                    │   main.ts    │
                    └──────┬───────┘
           ┌───────┬───────┼───────┬──────────┬──────────────┐
           ▼       ▼       ▼       ▼          ▼              ▼
     ConfigStore  Secret  Tray   Hotkey   Settings      History
       Store     Store   Mgr     Mgr     Window        Window
           │       │       │              │  │              │
           │       │       │              │  ▼              ▼
           │       │       │              │ Device      History
           │       │       │              │  Mgr        Store
           ▼       ▼       ▼              ▼
         DesktopEngine ◄──────────────────┘
           │     │     │
           ▼     ▼     ▼
        Audio  Audio  Adapter    Command    Command
        Mgr    Enc    Factory    Parser     Executor
                                  │
                                  ▼
                              pasteText
```
