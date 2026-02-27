# GitHub Issues Preview - Sprint v4

**Generated:** 2026-02-26
**Total Issues:** 17

---

## Issue 1: [P0][feature] Wire SettingsWindow into main.ts

**Labels:** P0, feature
**Milestone:** Sprint v4

### Description

Replace the placeholder comment in `main.ts` `setOnOpenSettings` callback with actual SettingsWindow integration.

### Context

Sprint: v4
Feature: Polish & Package
Phase: Phase 1 — Polish & Tech Debt (Step 1)

### Detailed Requirements

**Component:** main.ts

**Changes Required:**
1. Import `SettingsWindow` from `./settings-window`
2. In `app.on('ready')`, after creating `configStore` and `secretStore`, create `SettingsWindow` instance
3. Call `settingsWindow.registerIPCHandlers()` to register all IPC handlers
4. Wire tray callback: `trayManager.setOnOpenSettings(() => settingsWindow.show())`

**Implementation:**

```typescript
// In main.ts, add import:
import { SettingsWindow } from './settings-window';

// In app.on('ready'), after creating configStore and secretStore:
const settingsWindow = new SettingsWindow(configStore, secretStore);
settingsWindow.registerIPCHandlers();

// Wire tray callback:
trayManager.setOnOpenSettings(() => settingsWindow.show());
```

### Testing Requirements

- [ ] No new unit tests required (Electron lifecycle)
- [ ] Existing 147 tests must still pass

### Acceptance Criteria

- [ ] Settings window opens from tray menu
- [ ] Settings window loads and displays correctly
- [ ] All existing tests pass

### Dependencies

None

### References

- Sprint Plan: `sprints/v4/sprint-plan.md`
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 1)
- Component Design: `sprints/v4/tech-docs/component-design.md`

---

## Issue 2: [P0][infrastructure] Create tray icon assets

**Labels:** P0, infrastructure
**Milestone:** Sprint v4

### Description

Create 22x22px PNG icons for the menu bar tray in idle, recording, and processing states.

### Context

Sprint: v4
Feature: Polish & Package
Phase: Phase 1 — Polish & Tech Debt (Step 2)

### Detailed Requirements

**Files to create:**
- `desktop/assets/trayIconTemplate.png` — 22x22 mic icon (idle). **Must** use "Template" suffix for macOS dark/light mode
- `desktop/assets/trayIconTemplate@2x.png` — 44x44 Retina version
- `desktop/assets/tray-recording.png` — 22x22 red dot (recording state, #FF3B30)
- `desktop/assets/tray-recording@2x.png` — 44x44 Retina version
- `desktop/assets/tray-processing.png` — 22x22 yellow dot (processing state, #FFCC00)
- `desktop/assets/tray-processing@2x.png` — 44x44 Retina version

**Icon Design Notes:**
- Template images (idle) must be black/transparent only — macOS auto-adjusts for dark/light mode
- Recording: solid red circle (#FF3B30)
- Processing: solid yellow circle (#FFCC00)
- Generate programmatically or create minimal colored PNGs

### Testing Requirements

- [ ] No automated tests for image assets — visual verification only

### Acceptance Criteria

- [ ] All 6 PNG files created in `desktop/assets/`
- [ ] Template icons are black/transparent only
- [ ] Tray icon renders correctly in macOS menu bar

### Dependencies

None

### References

- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 2)

---

## Issue 3: [P0][infrastructure] Clean up package.json and add electron-builder

**Labels:** P0, infrastructure
**Milestone:** Sprint v4

### Description

Remove `@nut-tree/nut-js` if present, add `electron-builder` config for macOS packaging.

### Context

Sprint: v4
Feature: Polish & Package
Phase: Phase 1 — Polish & Tech Debt (Step 3)

### Detailed Requirements

**Files to modify:** `desktop/package.json`

**Changes:**
1. Remove any reference to `@nut-tree/nut-js` from dependencies
2. Add `electron-builder` to devDependencies
3. Add build script: `"dist": "electron-builder"`
4. Add `"build"` config section:

```json
{
  "build": {
    "appId": "com.voice2code.desktop",
    "productName": "Voice2Code",
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg"],
      "icon": "assets/icon.icns",
      "entitlements": "entitlements.plist",
      "entitlementsInherit": "entitlements.plist",
      "extendInfo": {
        "LSUIElement": true
      }
    },
    "dmg": {
      "title": "Voice2Code",
      "contents": [
        { "x": 130, "y": 220 },
        { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
      ]
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "!node_modules/**/test/**",
      "!node_modules/**/*.map"
    ],
    "extraResources": [
      { "from": "assets", "to": "assets" }
    ]
  }
}
```

### Testing Requirements

- [ ] `npm run build` must compile
- [ ] `npm run dist` should attempt to build (may fail on code signing — OK for now)

### Acceptance Criteria

- [ ] `@nut-tree/nut-js` removed from deps (if present)
- [ ] `electron-builder` added to devDependencies
- [ ] Build config section added to package.json
- [ ] `npm run build` succeeds

### Dependencies

None

### References

- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 3)

---

## Issue 4: [P0][infrastructure] Webpack build verification

**Labels:** P0, infrastructure
**Milestone:** Sprint v4

### Description

Verify `npm run build` successfully compiles all 3 webpack entry points (main, preload, renderer) and all output files exist.

### Context

Sprint: v4
Feature: Polish & Package
Phase: Phase 1 — Polish & Tech Debt (Step 4)

### Detailed Requirements

**Verification steps:**
1. `cd desktop && npm run build`
2. Verify `dist/main.js` exists
3. Verify `dist/preload.js` exists
4. Verify `dist/settings/settings-renderer.js` exists
5. Verify `dist/settings/settings.html` and `dist/settings/settings.css` copied
6. Verify `dist/assets/` copied

**If build fails:** Fix webpack config issues (likely path alias or externals issues).

### Testing Requirements

- [ ] Build completes without errors
- [ ] All output files exist

### Acceptance Criteria

- [ ] `npm run build` succeeds
- [ ] All 3 entry points compiled
- [ ] All assets and HTML/CSS files copied

### Dependencies

Depends on: Issue 1, Issue 2, Issue 3

### References

- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 4)

---

## Issue 5: [P1][feature] Extend ConfigStore schema with device and voice command fields

**Labels:** P1, feature
**Milestone:** Sprint v4

### Description

Add `audio.deviceId`, `ui.voiceCommandsEnabled`, and `ui.customCommands` to the DesktopConfig schema.

### Context

Sprint: v4
Feature: Audio Device Selection + Voice Commands foundation
Phase: Phase 2 — Audio Device Selection (Step 5)

### Detailed Requirements

**Component:** ConfigStore (`desktop/src/config-store.ts`)

**Interface Changes:**

```typescript
export interface DesktopConfig {
  endpoint: { url: string; model: string; timeout: number; language: string; };
  audio: {
    sampleRate: number;
    format: 'mp3' | 'wav';
    deviceId: string;          // NEW
  };
  ui: {
    showNotifications: boolean;
    voiceCommandsEnabled: boolean;  // NEW
    customCommands: Record<string, string>;  // NEW
  };
}
```

**Updated DEFAULT_CONFIG:**

```typescript
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
```

**Method Changes:**
1. `getAudioConfig()` — read `audio.deviceId` from store instead of hardcoding `'default'`
2. `getUIConfig()` — include `voiceCommandsEnabled` and `customCommands` in return value
3. `getAll()` — include new fields
4. `save()` — add `deviceId` handling in audio save (validate non-empty string, fallback to `"default"`)
5. `save()` — add `voiceCommandsEnabled` and `customCommands` handling in UI save

**Validation Rules:**
- `audio.deviceId`: Non-empty string after trimming. If empty/undefined, fall back to `"default"`
- `ui.voiceCommandsEnabled`: Boolean, default `true`
- `ui.customCommands`: Object with string keys (lowercase, trimmed, non-empty) and string values (non-empty)

### Testing Requirements (TDD)

- [ ] `getAudioConfig()` returns `deviceId` from store
- [ ] `getAudioConfig()` returns default `"default"` when not set
- [ ] `save({ audio: { deviceId: 'mic-2' } })` persists device ID
- [ ] `save({ audio: { deviceId: '' } })` falls back to `"default"`
- [ ] `getUIConfig()` returns `voiceCommandsEnabled`
- [ ] `getUIConfig()` returns `customCommands`
- [ ] `save({ ui: { voiceCommandsEnabled: false } })` persists setting
- [ ] `save({ ui: { customCommands: { "clear": "keystroke..." } } })` persists commands

### Acceptance Criteria

- [ ] All new fields added to DesktopConfig interface
- [ ] DEFAULT_CONFIG updated with new defaults
- [ ] `getAudioConfig()` reads deviceId from store
- [ ] `getUIConfig()` returns new fields
- [ ] All new unit tests written and passing
- [ ] All existing tests still pass

### Dependencies

None

### References

- Data Models: `sprints/v4/tech-docs/data-models.md` (Model 1: DesktopConfig)
- Component Design: `sprints/v4/tech-docs/component-design.md` (Modified: ConfigStore)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 5)

---

## Issue 6: [P1][feature] Add audio device dropdown to Settings UI

**Labels:** P1, feature
**Milestone:** Sprint v4

### Description

Add microphone dropdown to the Settings window with device enumeration via DeviceManager.

### Context

Sprint: v4
Feature: Audio Device Selection
Phase: Phase 2 — Audio Device Selection (Step 6)

### Detailed Requirements

**Files to modify:**
- `desktop/src/settings-window.ts` — Add DeviceManager to constructor, register `settings:get-devices` handler
- `desktop/src/preload.ts` — Expose `getDevices()` via `settingsAPI`
- `desktop/src/settings/settings.html` — Add device dropdown with refresh button
- `desktop/src/settings/settings-renderer.ts` — Populate dropdown on load, save selected device

**IPC Handler (`settings:get-devices`):**

```typescript
ipcMain.handle('settings:get-devices', async () => {
  try {
    return await this.deviceManager.getDevices();
  } catch {
    return [{ id: 'default', name: 'System Default', isDefault: true }];
  }
});
```

**Preload Addition:**

```typescript
settingsAPI: {
  // ... existing ...
  getDevices: () => ipcRenderer.invoke('settings:get-devices'),  // NEW
}
```

**Settings HTML (inside Audio section, before Format):**

```html
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

**Renderer Logic:**
- `loadDevices()`: Fetch devices from API, populate select element
- Refresh button: Call `loadDevices()` again
- On save: Include selected `audio.deviceId`
- On load: Select the currently configured device

### Testing Requirements

- [ ] SettingsWindow: `settings:get-devices` handler returns devices from DeviceManager
- [ ] SettingsWindow: handler returns fallback `[{ id: 'default', name: 'System Default', isDefault: true }]` on error
- [ ] Each device has `id`, `name`, `isDefault` fields

### Acceptance Criteria

- [ ] Microphone dropdown appears in Settings window
- [ ] Dropdown populated with available audio devices
- [ ] Refresh button re-enumerates devices
- [ ] Selected device saved to config
- [ ] Fallback to "System Default" on error
- [ ] All tests passing

### Dependencies

Depends on: Issue 5

### References

- API Endpoints: `sprints/v4/tech-docs/api-endpoints.md` (Channel 1: `settings:get-devices`)
- Component Design: `sprints/v4/tech-docs/component-design.md` (Modified: SettingsWindow, Preload)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 6)

---

## Issue 7: [P1][feature] Implement CommandParser

**Labels:** P1, feature
**Milestone:** Sprint v4

### Description

Create the command parsing module that splits transcribed text into text and command segments with word-boundary matching.

### Context

Sprint: v4
Feature: Voice Commands
Phase: Phase 3 — Voice Commands (Step 7)

### Detailed Requirements

**Component:** CommandParser (`desktop/src/command-parser.ts`)

**Types:**

```typescript
export type ParsedSegment =
  | { type: 'text'; value: string }
  | { type: 'command'; value: string };
```

**Built-in Command Vocabulary (13 commands):**

| Phrase | Keystroke (osascript) |
|---|---|
| `new line` | `key code 36` |
| `enter` | `key code 36` |
| `tab` | `key code 48` |
| `space` | `key code 49` |
| `backspace` | `key code 51` |
| `delete` | `key code 51` |
| `select all` | `keystroke "a" using command down` |
| `undo` | `keystroke "z" using command down` |
| `redo` | `keystroke "z" using {command down, shift down}` |
| `copy that` | `keystroke "c" using command down` |
| `paste that` | `keystroke "v" using command down` |
| `cut that` | `keystroke "x" using command down` |
| `escape` | `key code 53` |

**Constructor:** Accepts `customCommands: Record<string, string>` — custom commands override built-in.

**Algorithm:**
1. Convert input to lowercase for matching
2. Sort command phrases by length descending (longest match first)
3. Scan left-to-right, at each position try to match the longest command
4. Commands only match at word boundaries (space, start/end of string, punctuation)
5. Non-command text collected into text segments

**Word Boundary Definition:**
- Start/end of string
- Space (` `)
- Punctuation (`.`, `,`, `!`, `?`, `;`, `:`)

**Edge Cases:**

| Input | Expected Output | Why |
|---|---|---|
| `""` (empty) | `[]` | Empty produces empty |
| `"hello"` | `[text: 'hello']` | No commands |
| `"new line"` | `[command: 'key code 36']` | Pure command |
| `"new line new line"` | `[command, command]` | Multiple commands |
| `"hello new line world"` | `[text, command, text]` | Mixed |
| `"  hello  "` | `[text: '  hello  ']` | Preserve whitespace |
| `"UNDO"` | `[command]` | Case insensitive |
| `"undoing"` | `[text: 'undoing']` | Word boundary — no partial match |
| `"tabletop"` | `[text: 'tabletop']` | Word boundary — no partial match |

### Testing Requirements (TDD — write tests BEFORE implementation)

- [ ] Empty string returns empty array
- [ ] Text with no commands returns single text segment
- [ ] Single command returns single command segment
- [ ] Mixed text and command returns correct segments
- [ ] Multiple commands in sequence
- [ ] Case-insensitive matching
- [ ] Word-boundary matching (no partial word matches: "undoing" != "undo", "tabletop" != "tab")
- [ ] Custom commands override built-in commands
- [ ] Longest match wins for overlapping phrases
- [ ] Whitespace preserved in text segments
- [ ] Adjacent text segments are merged
- [ ] All 13 built-in commands recognized correctly

### Acceptance Criteria

- [ ] `CommandParser` class implemented with word-boundary matching
- [ ] `ParsedSegment` type exported
- [ ] `BUILT_IN_COMMANDS` constant exported
- [ ] All 12 unit tests written and passing
- [ ] No Electron dependencies (pure logic)
- [ ] Test coverage >= 80%

### Dependencies

None (pure logic, no Electron)

### References

- Data Models: `sprints/v4/tech-docs/data-models.md` (Models 3 & 4: VoiceCommand, ParsedSegment)
- Component Design: `sprints/v4/tech-docs/component-design.md` (New Component 1: CommandParser)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 7)

---

## Issue 8: [P1][feature] Implement CommandExecutor

**Labels:** P1, feature
**Milestone:** Sprint v4

### Description

Create the command execution module that processes parsed segments by pasting text and simulating keystrokes via osascript.

### Context

Sprint: v4
Feature: Voice Commands
Phase: Phase 3 — Voice Commands (Step 8)

### Detailed Requirements

**Component:** CommandExecutor (`desktop/src/command-executor.ts`)

**Class Definition:**

```typescript
export class CommandExecutor {
  async execute(segments: ParsedSegment[], delayMs = 50): Promise<void> {
    if (segments.length === 0) return;

    const previousClipboard = clipboard.readText();

    try {
      for (const segment of segments) {
        if (segment.type === 'text') {
          const text = segment.value;
          if (!text.trim()) continue; // skip whitespace-only
          clipboard.writeText(text);
          await delay(delayMs);
          execSync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
          await delay(delayMs);
        } else {
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

**Key osascript patterns:**
- Keystroke: `osascript -e 'tell application "System Events" to keystroke "a" using command down'`
- Key code: `osascript -e 'tell application "System Events" to key code 36'`

**Security:** Command values come from hardcoded `BUILT_IN_COMMANDS` or user `customCommands` — never from untrusted input.

### Testing Requirements (TDD — write tests BEFORE implementation)

- [ ] Empty segments array does nothing
- [ ] Single text segment: writes to clipboard, simulates Cmd+V, restores clipboard
- [ ] Single command segment: executes osascript with correct keystroke
- [ ] Mixed text + command segments: executed in order
- [ ] Clipboard restored after execution (in finally block)
- [ ] Clipboard restored even on error
- [ ] Whitespace-only text segments skipped

**Mocking Strategy:**
- Mock `electron.clipboard` (read/write)
- Mock `child_process.execSync` — verify osascript commands
- Pass `delayMs=1` in tests

### Acceptance Criteria

- [ ] `CommandExecutor` class implemented
- [ ] Text segments pasted via clipboard + Cmd+V
- [ ] Command segments executed via osascript
- [ ] Clipboard always restored (even on error)
- [ ] All 7 unit tests written and passing
- [ ] Test coverage >= 80%

### Dependencies

Depends on: Issue 7 (uses `ParsedSegment` type)

### References

- Component Design: `sprints/v4/tech-docs/component-design.md` (New Component 2: CommandExecutor)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 8)

---

## Issue 9: [P1][feature] Integrate voice commands into DesktopEngine

**Labels:** P1, feature
**Milestone:** Sprint v4

### Description

After transcription, route through CommandParser + CommandExecutor when voice commands are enabled; otherwise use direct `pasteText()`.

### Context

Sprint: v4
Feature: Voice Commands
Phase: Phase 3 — Voice Commands (Step 9)

### Detailed Requirements

**Component:** DesktopEngine (`desktop/src/desktop-engine.ts`)

**Changes to `stopRecording()`:**

```typescript
// After: const result = await adapter.transcribe(...)
// Replace: await pasteText(result.text);
// With:
const uiConfig = this.configStore.getUIConfig();
if (uiConfig.voiceCommandsEnabled) {
  const parser = new CommandParser(uiConfig.customCommands);
  const segments = parser.parse(result.text);
  await this.commandExecutor.execute(segments);
} else {
  await pasteText(result.text);
}
```

**Constructor change:** Add optional `commandExecutor` parameter with DI interface:

```typescript
interface CommandExecutorLike {
  execute(segments: ParsedSegment[], delayMs?: number): Promise<void>;
}
```

### Testing Requirements

- [ ] When `voiceCommandsEnabled: true`, transcription text is parsed and executed via CommandExecutor
- [ ] When `voiceCommandsEnabled: false`, transcription text is passed to `pasteText()` directly
- [ ] CommandParser receives `customCommands` from config

### Acceptance Criteria

- [ ] Voice commands processed when enabled
- [ ] Direct paste used when disabled
- [ ] Custom commands loaded from config
- [ ] All new tests passing
- [ ] All existing tests still pass

### Dependencies

Depends on: Issue 7, Issue 8

### References

- Component Design: `sprints/v4/tech-docs/component-design.md` (Modified: DesktopEngine)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 9)

---

## Issue 10: [P2][feature] Implement HistoryStore

**Labels:** P2, feature
**Milestone:** Sprint v4

### Description

Create the history storage module with FIFO eviction at 50 entries, backed by `electron-store`.

### Context

Sprint: v4
Feature: Transcription History
Phase: Phase 4 — Transcription History (Step 10)

### Detailed Requirements

**Component:** HistoryStore (`desktop/src/history-store.ts`)

**Interface:**

```typescript
export interface TranscriptionHistoryEntry {
  id: string;       // UUID v4 via crypto.randomUUID()
  text: string;     // max 10,000 chars
  timestamp: number; // Unix epoch ms
  language: string;  // e.g., "en"
}
```

**Storage:** Separate `electron-store` file `history.json` in app data directory.

**Constants:**
- `MAX_ENTRIES = 50`
- `MAX_TEXT_LENGTH = 10000`

**Methods:**
- `add(text, language)` — Create entry, FIFO evict if >50, truncate text if >10000 chars, trim whitespace, throw on empty
- `getAll()` — Return entries sorted by timestamp desc (most recent first)
- `getById(id)` — Return entry or undefined
- `clear()` — Remove all entries
- `count()` — Return entry count

**Business Rules:**
- Maximum 50 entries (FIFO — oldest removed when limit exceeded)
- Text truncated to 10,000 characters (don't reject, truncate)
- Entries ordered most recent first
- `id` generated via `crypto.randomUUID()`
- History survives app restarts (persisted)
- `add()` throws on empty/whitespace-only text
- `add()` defaults language to `"en"` when empty

### Testing Requirements (TDD — write tests BEFORE implementation)

- [ ] Starts with empty history
- [ ] `add()` creates entry with correct fields (id, text, timestamp, language)
- [ ] `add()` returns the created entry
- [ ] `getAll()` returns entries in reverse chronological order
- [ ] `add()` truncates text to 10,000 characters
- [ ] `add()` trims whitespace from text
- [ ] `add()` throws on empty/whitespace-only text
- [ ] `add()` defaults language to `"en"` when empty
- [ ] FIFO eviction: adding 51st entry removes the oldest
- [ ] `getById()` returns correct entry
- [ ] `getById()` returns undefined for non-existent ID
- [ ] `clear()` removes all entries
- [ ] `clear()` on empty store is no-op
- [ ] `count()` returns correct number
- [ ] Data survives store reconstruction (persistence)

**Mocking:** Same as ConfigStore — mock `electron-store` with a `Map<string, unknown>`.

### Acceptance Criteria

- [ ] `HistoryStore` class implemented
- [ ] `TranscriptionHistoryEntry` interface exported
- [ ] FIFO eviction at 50 entries
- [ ] All 15 unit tests written and passing
- [ ] Test coverage >= 80%

### Dependencies

None

### References

- Data Models: `sprints/v4/tech-docs/data-models.md` (Model 2: TranscriptionHistoryEntry)
- Component Design: `sprints/v4/tech-docs/component-design.md` (New Component 3: HistoryStore)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 10)

---

## Issue 11: [P2][feature] Implement HistoryWindow with IPC handlers

**Labels:** P2, feature
**Milestone:** Sprint v4

### Description

Create the history BrowserWindow with IPC handlers for `history:get`, `history:clear`, and `history:copy`.

### Context

Sprint: v4
Feature: Transcription History
Phase: Phase 4 — Transcription History (Step 11)

### Detailed Requirements

**Component:** HistoryWindow (`desktop/src/history-window.ts`)

**Window Properties:**
- Width: 520px, Height: 500px
- Resizable: true, minimizable: false, maximizable: false
- Title: "Voice2Code History"
- Context isolation: true, nodeIntegration: false, sandbox: true
- Preload: `preload.js`
- Reuse pattern: focus existing window instead of creating duplicate

**Methods:**
- `show()` — Create or focus window, load `history/history.html`
- `close()` — Close and nullify window
- `isOpen()` — Return true/false
- `registerIPCHandlers()` — Register 3 IPC handlers

**IPC Handlers:**

```typescript
// history:get — returns all entries sorted by most recent first
ipcMain.handle('history:get', () => {
  return this.historyStore.getAll();
});

// history:clear — deletes all entries
ipcMain.handle('history:clear', () => {
  this.historyStore.clear();
  return { success: true };
});

// history:copy — copies entry text to clipboard
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
```

### Testing Requirements (TDD — write tests BEFORE implementation)

- [ ] `show()` creates BrowserWindow with correct options
- [ ] `show()` focuses existing window instead of creating duplicate
- [ ] `close()` closes and nullifies the window
- [ ] `isOpen()` returns true/false correctly
- [ ] IPC `history:get` returns all entries from store
- [ ] IPC `history:clear` clears store and returns `{ success: true }`
- [ ] IPC `history:copy` copies entry text to clipboard
- [ ] IPC `history:copy` returns error for non-existent ID
- [ ] IPC `history:copy` returns error for empty/invalid ID

**Mocking:** Same as SettingsWindow — mock `electron` (BrowserWindow, ipcMain, clipboard).

### Acceptance Criteria

- [ ] `HistoryWindow` class implemented
- [ ] All 3 IPC handlers registered
- [ ] Window reuse pattern works (no duplicates)
- [ ] All 9 unit tests written and passing
- [ ] Test coverage >= 80%

### Dependencies

Depends on: Issue 10

### References

- API Endpoints: `sprints/v4/tech-docs/api-endpoints.md` (Channels 2-4)
- Component Design: `sprints/v4/tech-docs/component-design.md` (New Component 4: HistoryWindow)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 11)

---

## Issue 12: [P2][feature] Create History UI (HTML/CSS/renderer)

**Labels:** P2, feature
**Milestone:** Sprint v4

### Description

Create the HTML, CSS, and renderer script for the history window with search, copy, and clear functionality.

### Context

Sprint: v4
Feature: Transcription History
Phase: Phase 4 — Transcription History (Step 12)

### Detailed Requirements

**Files to create:**
- `desktop/src/history/history.html`
- `desktop/src/history/history.css`
- `desktop/src/history/history-renderer.ts`

**HTML Structure:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none';">
  <title>Voice2Code History</title>
  <link rel="stylesheet" href="history.css">
</head>
<body>
  <div class="container">
    <h1>Transcription History</h1>
    <div class="toolbar">
      <input type="text" id="search-input" placeholder="Search transcriptions...">
      <button id="btn-clear-history" type="button" class="btn-danger">Clear All</button>
    </div>
    <div id="history-list" class="history-list"></div>
    <div id="empty-state" class="empty-state" style="display: none;">
      No transcriptions yet.
    </div>
  </div>
  <script src="history-renderer.js"></script>
</body>
</html>
```

**Renderer Features:**
- `loadHistory()` — Fetch entries via `window.historyAPI.getHistory()` and render
- `renderEntries()` — Render entries with text, relative time, and copy button
- Search filter — Client-side filtering by text content
- Copy button — Click delegation, calls `window.historyAPI.copyEntry(id)`, shows "Copied!" feedback
- Clear all — Calls `window.historyAPI.clearHistory()`, refreshes list
- `formatTime()` — Relative time display ("Just now", "5m ago", "2h ago", "3d ago")
- `escapeHtml()` — XSS prevention via DOM textContent

**CSS:** Reuse design language from `settings.css` — same fonts, colors, border-radius, input styles.

### Testing Requirements

- [ ] No unit tests for UI code

### Acceptance Criteria

- [ ] History list renders with transcription entries
- [ ] Search filters entries in real-time
- [ ] Copy button copies text and shows feedback
- [ ] Clear All removes all entries
- [ ] Empty state shown when no entries
- [ ] Relative time display works
- [ ] XSS prevention via HTML escaping
- [ ] Consistent design with Settings window

### Dependencies

Depends on: Issue 11

### References

- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 12)
- Component Design: `sprints/v4/tech-docs/component-design.md` (UI Components section)

---

## Issue 13: [P2][feature] Wire History into TrayManager and main.ts

**Labels:** P2, feature
**Milestone:** Sprint v4

### Description

Add "History" menu item to tray context menu. Wire HistoryStore and HistoryWindow in main.ts. Expose `historyAPI` in preload. Update webpack config.

### Context

Sprint: v4
Feature: Transcription History
Phase: Phase 4 — Transcription History (Step 13)

### Detailed Requirements

**Files to modify:**
- `desktop/src/tray.ts` — Add `onOpenHistory` callback and "History" menu item
- `desktop/src/main.ts` — Create HistoryStore, HistoryWindow, wire to tray + engine
- `desktop/src/preload.ts` — Expose `historyAPI`
- `desktop/webpack.config.js` — Add history HTML/CSS to CopyPlugin patterns

**TrayManager Changes:**
- Add `onOpenHistory?: () => void` to `TrayCallbacks` interface
- Add `setOnOpenHistory(callback)` method
- Add "History" menu item between separator and "Settings..."

**Updated Menu Template:**

```typescript
const template = [
  { label: 'Start Recording', ... },
  { label: 'Stop Recording', ... },
  { type: 'separator' },
  { label: 'History', click: () => this.callbacks.onOpenHistory?.() },  // NEW
  { label: 'Settings...', ... },
  { label: 'Test Connection', ... },
  { type: 'separator' },
  { label: 'Quit Voice2Code', ... },
];
```

**main.ts Wiring:**

```typescript
const historyStore = new HistoryStore();
const historyWindow = new HistoryWindow(historyStore);
historyWindow.registerIPCHandlers();
trayManager.setOnOpenHistory(() => historyWindow.show());
```

**Preload Addition:**

```typescript
contextBridge.exposeInMainWorld('historyAPI', {
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  copyEntry: (id: string) => ipcRenderer.invoke('history:copy', { id }),
});
```

**Webpack Addition:**

```javascript
{ from: 'src/history/history.html', to: 'history/history.html' },
{ from: 'src/history/history.css', to: 'history/history.css' },
```

### Testing Requirements

- [ ] TrayManager: "History" menu item exists and calls callback
- [ ] Existing tray tests still pass

### Acceptance Criteria

- [ ] "History" menu item appears in tray context menu
- [ ] Clicking "History" opens HistoryWindow
- [ ] `historyAPI` exposed in preload
- [ ] Webpack copies history HTML/CSS to dist
- [ ] All tests passing

### Dependencies

Depends on: Issue 10, Issue 11, Issue 12

### References

- Data Models: `sprints/v4/tech-docs/data-models.md` (Tray Context Menu section)
- API Endpoints: `sprints/v4/tech-docs/api-endpoints.md` (Updated Preload Script)
- Component Design: `sprints/v4/tech-docs/component-design.md` (Modified: TrayManager, Preload)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 13)

---

## Issue 14: [P2][feature] Integrate History into DesktopEngine

**Labels:** P2, feature
**Milestone:** Sprint v4

### Description

After successful transcription + paste/execute, add the transcription to HistoryStore.

### Context

Sprint: v4
Feature: Transcription History
Phase: Phase 4 — Transcription History (Step 14)

### Detailed Requirements

**Component:** DesktopEngine (`desktop/src/desktop-engine.ts`)

**Constructor Change:** Add optional `historyStore` parameter:

```typescript
constructor(
  // ... existing params ...
  private historyStore?: HistoryStoreLike,  // NEW — optional for backward compat
)
```

**Interface:**

```typescript
interface HistoryStoreLike {
  add(text: string, language: string): unknown;
}
```

**Change in `stopRecording()`:**

```typescript
// After paste/execute succeeds:
this.historyStore?.add(result.text, endpointConfig.language);
```

### Testing Requirements

- [ ] `historyStore.add()` called with correct text and language after successful transcription
- [ ] `historyStore.add()` NOT called when transcription fails
- [ ] Engine works correctly when historyStore is undefined (backward compat)

### Acceptance Criteria

- [ ] Transcriptions saved to history after successful paste
- [ ] History not updated on errors
- [ ] Backward compatible (works without historyStore)
- [ ] All new tests passing
- [ ] All existing tests still pass

### Dependencies

Depends on: Issue 10, Issue 13

### References

- Component Design: `sprints/v4/tech-docs/component-design.md` (Modified: DesktopEngine)
- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 14)

---

## Issue 15: [P2][documentation] Update README with desktop app documentation

**Labels:** P2, documentation
**Milestone:** Sprint v4

### Description

Add desktop app sections to the root README with installation, build, usage, and voice commands documentation.

### Context

Sprint: v4
Feature: Polish & Package
Phase: Phase 5 — Packaging & Final Merge (Step 15)

### Detailed Requirements

**Sections to add:**
- Desktop App installation (prerequisites: macOS, sox)
- Building from source: `cd desktop && npm install && npm run build`
- Running: `npx electron dist/main.js`
- First-time setup (Accessibility permissions, endpoint config)
- Usage (Cmd+Shift+V hotkey, voice commands)
- Voice command reference table (all 13 built-in commands)
- Packaging: `npm run dist`

### Testing Requirements

- [ ] No automated tests

### Acceptance Criteria

- [ ] README updated with desktop app documentation
- [ ] Installation steps are clear and accurate
- [ ] Voice command table included

### Dependencies

Depends on: All previous issues

### References

- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 15)

---

## Issue 16: [P2][infrastructure] Merge feature/desktop-app to main

**Labels:** P2, infrastructure
**Milestone:** Sprint v4

### Description

Merge the complete desktop app from `feature/desktop-app` branch into `main`.

### Context

Sprint: v4
Feature: Polish & Package
Phase: Phase 5 — Packaging & Final Merge (Step 16)

### Detailed Requirements

**Steps:**
1. Ensure all tests pass: `cd desktop && npm test`
2. Ensure webpack builds: `cd desktop && npm run build`
3. Create PR: `feature/desktop-app` → `main`
4. Merge PR
5. Verify tests still pass on main

### Testing Requirements

- [ ] All tests pass on feature branch before merge
- [ ] All tests pass on main after merge

### Acceptance Criteria

- [ ] PR created from `feature/desktop-app` → `main`
- [ ] All tests passing
- [ ] Build succeeds
- [ ] PR merged

### Dependencies

Depends on: All previous issues

### References

- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 16)

---

## Issue 17: [P2][integration-test] Final integration testing

**Labels:** P2, integration-test
**Milestone:** Sprint v4

### Description

Run all tests and verify the complete app works end-to-end.

### Context

Sprint: v4
Feature: Final Verification
Phase: Phase 5 — Packaging & Final Merge (Step 17)

### Detailed Requirements

**Verification checklist:**
- [ ] `cd desktop && npm test` — all tests pass
- [ ] `cd desktop && npm run build` — webpack compiles
- [ ] `npx electron dist/main.js` — app appears in menu bar
- [ ] Tray icon changes: idle → recording → processing → idle
- [ ] Settings window opens from tray
- [ ] Audio device dropdown populated
- [ ] Voice commands: "hello new line world" → types "hello\nworld"
- [ ] History window shows recent transcriptions
- [ ] History search filters correctly
- [ ] History copy button works
- [ ] Error notifications appear for connection failures
- [ ] App quits cleanly from tray menu

### Testing Requirements

- [ ] All automated tests pass
- [ ] Manual verification of all checklist items

### Acceptance Criteria

- [ ] All automated tests pass
- [ ] All manual verification items confirmed
- [ ] App is fully functional end-to-end

### Dependencies

Depends on: All previous issues

### References

- Implementation Plan: `sprints/v4/tech-docs/implementation-plan.md` (Step 17)
