# Implementation Plan — Sprint v4

## Overview

Sprint v4 has 5 phases across 10-14 days. Each phase builds on the previous one. All work targets the `feature/desktop-app` branch with individual feature branches merged into it.

---

## Phase 1: Polish & Tech Debt (Days 1-3)

### Step 1: Wire SettingsWindow into main.ts

**What:** Replace the placeholder comment in `main.ts` `setOnOpenSettings` callback with actual SettingsWindow integration.

**Files to modify:**
- `desktop/src/main.ts` — Import `SettingsWindow`, create instance, wire to tray callback

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

**Testing:** No new unit tests (Electron lifecycle). Existing 147 tests must still pass.

---

### Step 2: Create Tray Icon Assets

**What:** Create 22x22px PNG icons for the menu bar tray.

**Files to create:**
- `desktop/assets/trayIconTemplate.png` — 22x22 mic icon (idle state). **Must** be named with "Template" suffix for macOS dark/light mode support
- `desktop/assets/trayIconTemplate@2x.png` — 44x44 Retina version
- `desktop/assets/tray-recording.png` — 22x22 red dot (recording state)
- `desktop/assets/tray-recording@2x.png` — 44x44 Retina version
- `desktop/assets/tray-processing.png` — 22x22 yellow dot (processing state)
- `desktop/assets/tray-processing@2x.png` — 44x44 Retina version

**Icon Design Notes:**
- Template images (idle) must be black/transparent only — macOS automatically adjusts for dark/light mode
- Recording icon: solid red circle (#FF3B30)
- Processing icon: solid yellow circle (#FFCC00)
- Use programmatic PNG generation via Node.js script, or create minimal 1-color PNGs

**Approach:** Generate minimal PNG files programmatically using a build script, or create simple colored circles using a canvas library. For MVP, even 1x1 pixel PNGs will work (Electron will render them).

**Testing:** No automated tests for image assets. Visual verification only.

---

### Step 3: Clean Up package.json

**What:** Remove `@nut-tree/nut-js` if listed, add `electron-builder` config.

**Files to modify:**
- `desktop/package.json`

**Changes:**
1. Remove any reference to `@nut-tree/nut-js` from dependencies
2. Add `electron-builder` to devDependencies
3. Add build scripts: `"dist": "electron-builder"`
4. Add `"build"` config section for electron-builder

**electron-builder config:**

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

**Testing:** `npm run build` must compile. `npm run dist` should attempt to build (may fail on code signing — that's OK for now).

---

### Step 4: Webpack Build Verification

**What:** Verify that `npm run build` successfully compiles all 3 webpack entry points (main, preload, renderer).

**Files to verify:** No changes expected — just run the build.

**Verification steps:**
1. `cd desktop && npm run build`
2. Verify `dist/main.js` exists
3. Verify `dist/preload.js` exists
4. Verify `dist/settings/settings-renderer.js` exists
5. Verify `dist/settings/settings.html` and `dist/settings/settings.css` copied
6. Verify `dist/assets/` copied

**If build fails:** Fix webpack config issues (likely path alias or externals issues).

---

## Phase 2: Audio Device Selection (Days 3-4)

### Step 5: Extend ConfigStore Schema

**What:** Add `audio.deviceId`, `ui.voiceCommandsEnabled`, and `ui.customCommands` to the config schema.

**Files to modify:**
- `desktop/src/config-store.ts`

**Changes:**
1. Add `deviceId: string` to `DesktopConfig.audio` interface
2. Add `voiceCommandsEnabled: boolean` to `DesktopConfig.ui` interface
3. Add `customCommands: Record<string, string>` to `DesktopConfig.ui` interface
4. Update `DEFAULT_CONFIG` with new defaults: `{ deviceId: 'default', voiceCommandsEnabled: true, customCommands: {} }`
5. Update `getAudioConfig()` — read `audio.deviceId` from store instead of hardcoding `'default'`
6. Update `getUIConfig()` — include `voiceCommandsEnabled` and `customCommands` in return value
7. Update `getAll()` — include new fields
8. Add `deviceId` handling in `saveAudio()` — validate non-empty string
9. Add `voiceCommandsEnabled` and `customCommands` handling in `saveUI()`

**Testing (TDD):** Write tests BEFORE implementation.

New tests to add to `config-store.test.ts`:
- `getAudioConfig()` returns `deviceId` from store
- `getAudioConfig()` returns default `"default"` when not set
- `save({ audio: { deviceId: 'mic-2' } })` persists device ID
- `save({ audio: { deviceId: '' } })` falls back to `"default"`
- `getUIConfig()` returns `voiceCommandsEnabled`
- `getUIConfig()` returns `customCommands`
- `save({ ui: { voiceCommandsEnabled: false } })` persists setting
- `save({ ui: { customCommands: { "clear": "keystroke..." } } })` persists commands

---

### Step 6: Add Device Dropdown to Settings UI

**What:** Add audio device dropdown to the Settings window.

**Files to modify:**
- `desktop/src/settings-window.ts` — Add `DeviceManager` to constructor, register `settings:get-devices` handler
- `desktop/src/preload.ts` — Expose `getDevices()` via `settingsAPI`
- `desktop/src/settings/settings.html` — Add device dropdown with refresh button
- `desktop/src/settings/settings-renderer.ts` — Populate dropdown on load, save selected device

**Settings HTML addition** (inside Audio section, before Format):

```html
<div class="field">
  <label for="audio-device">Microphone</label>
  <div class="field-row" style="margin-bottom: 0;">
    <select id="audio-device" style="flex: 1;">
      <option value="default">System Default</option>
    </select>
    <button id="btn-refresh-devices" type="button" title="Refresh devices" style="width: auto; padding: 8px 12px;">↻</button>
  </div>
</div>
```

**Renderer changes:**

```typescript
async function loadDevices() {
  const devices = await window.settingsAPI.getDevices();
  const select = $('audio-device') as HTMLSelectElement;
  const currentValue = select.value;

  // Clear existing options
  select.innerHTML = '';

  for (const device of devices) {
    const option = document.createElement('option');
    option.value = device.id;
    option.textContent = device.name + (device.isDefault ? ' (Default)' : '');
    select.appendChild(option);
  }

  // Restore selection
  if (currentValue) {
    select.value = currentValue;
  }
}
```

**Testing:**
- SettingsWindow test: `settings:get-devices` handler returns devices from DeviceManager
- SettingsWindow test: handler returns fallback device on error
- No unit tests for HTML/renderer (UI code)

---

## Phase 3: Voice Commands (Days 4-7)

### Step 7: Implement CommandParser

**What:** Create the command parsing module that splits transcribed text into text and command segments.

**Files to create:**
- `desktop/src/command-parser.ts`
- `desktop/tests/unit/command-parser.test.ts`

**Algorithm:**

```
function parse(text):
  if text is empty, return []

  lowercase = text.toLowerCase()
  phrases = sorted command phrases by length (longest first)
  segments = []
  currentTextStart = 0
  i = 0

  while i < lowercase.length:
    matched = false
    for phrase in phrases:
      if lowercase starting at i matches phrase:
        if i is at word boundary (start of string or preceded by space/punctuation):
          endPos = i + phrase.length
          if endPos is at word boundary (end of string or followed by space/punctuation):
            // Found a command match
            if i > currentTextStart:
              segments.push({ type: 'text', value: text.substring(currentTextStart, i) })
            segments.push({ type: 'command', value: commands[phrase] })
            i = endPos
            currentTextStart = i
            matched = true
            break
    if not matched:
      i++

  // Remaining text
  if currentTextStart < text.length:
    segments.push({ type: 'text', value: text.substring(currentTextStart) })

  return segments
```

**Word boundary definition:**
- Start of string
- End of string
- Space character (` `)
- Punctuation (`.`, `,`, `!`, `?`, `;`, `:`)

**Testing (TDD):** Write all tests BEFORE implementation. See component-design.md for the 12 required test cases.

---

### Step 8: Implement CommandExecutor

**What:** Create the command execution module that processes parsed segments.

**Files to create:**
- `desktop/src/command-executor.ts`
- `desktop/tests/unit/command-executor.test.ts`

**Implementation:** See component-design.md for the full class.

**Key osascript patterns:**

```bash
# Keystroke (typing a key with modifiers)
osascript -e 'tell application "System Events" to keystroke "a" using command down'

# Key code (pressing a specific key)
osascript -e 'tell application "System Events" to key code 36'

# Key code with modifiers
osascript -e 'tell application "System Events" to key code 36 using {command down, shift down}'
```

**Testing (TDD):** Write all tests BEFORE implementation. See component-design.md for the 7 required test cases. Mock `child_process.execSync` and `electron.clipboard`.

---

### Step 9: Integrate Voice Commands into DesktopEngine

**What:** After transcription, route through CommandParser + CommandExecutor when voice commands are enabled.

**Files to modify:**
- `desktop/src/desktop-engine.ts`

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

**Constructor change:** Add optional `commandExecutor` parameter (with DI for testability):

```typescript
interface CommandExecutorLike {
  execute(segments: ParsedSegment[], delayMs?: number): Promise<void>;
}
```

**Testing:** Add tests to `desktop-engine.test.ts`:
- When `voiceCommandsEnabled: true`, transcription text is parsed and executed via CommandExecutor
- When `voiceCommandsEnabled: false`, transcription text is passed to `pasteText()` directly
- CommandParser receives customCommands from config

---

## Phase 4: Transcription History (Days 7-10)

### Step 10: Implement HistoryStore

**What:** Create the history storage module with FIFO eviction.

**Files to create:**
- `desktop/src/history-store.ts`
- `desktop/tests/unit/history-store.test.ts`

**Implementation:** See component-design.md for the full class.

**Testing (TDD):** Write all 15 tests BEFORE implementation.

---

### Step 11: Implement HistoryWindow

**What:** Create the history BrowserWindow with IPC handlers.

**Files to create:**
- `desktop/src/history-window.ts`
- `desktop/tests/unit/history-window.test.ts`

**Implementation:** See component-design.md for the full class. Follow the same pattern as SettingsWindow.

**Testing (TDD):** Write all 9 tests BEFORE implementation.

---

### Step 12: Create History UI

**What:** Create the HTML/CSS/renderer for the history window.

**Files to create:**
- `desktop/src/history/history.html`
- `desktop/src/history/history.css`
- `desktop/src/history/history-renderer.ts`

**History HTML structure:**

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

**Renderer logic:**

```typescript
// Load history on DOMContentLoaded
async function loadHistory() {
  const entries = await window.historyAPI.getHistory();
  renderEntries(entries);
}

// Render entries to the list
function renderEntries(entries: TranscriptionHistoryEntry[]) {
  const list = $('history-list');
  const empty = $('empty-state');

  if (entries.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  list.style.display = 'block';
  empty.style.display = 'none';
  list.innerHTML = '';

  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-text">${escapeHtml(entry.text)}</div>
      <div class="history-meta">
        <span class="history-time">${formatTime(entry.timestamp)}</span>
        <button class="btn-copy" data-id="${entry.id}">Copy</button>
      </div>
    `;
    list.appendChild(item);
  }
}

// Search/filter
$('search-input').addEventListener('input', async () => {
  const query = ($('search-input') as HTMLInputElement).value.toLowerCase();
  const entries = await window.historyAPI.getHistory();
  const filtered = query
    ? entries.filter(e => e.text.toLowerCase().includes(query))
    : entries;
  renderEntries(filtered);
});

// Copy button click delegation
$('history-list').addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest('.btn-copy') as HTMLButtonElement;
  if (!btn) return;
  const id = btn.dataset.id!;
  const result = await window.historyAPI.copyEntry(id);
  if (result.success) {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  }
});

// Clear all
$('btn-clear-history').addEventListener('click', async () => {
  await window.historyAPI.clearHistory();
  loadHistory();
});

// Relative time formatting
function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// HTML escaping to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**CSS:** Reuse the same design language as `settings.css` — same fonts, colors, border-radius, input styles.

**Testing:** No unit tests for UI code.

---

### Step 13: Wire History into TrayManager and main.ts

**What:** Add "History" menu item to tray, wire HistoryStore and HistoryWindow in main.ts.

**Files to modify:**
- `desktop/src/tray.ts` — Add `onOpenHistory` callback and "History" menu item
- `desktop/src/main.ts` — Create HistoryStore, HistoryWindow, wire to tray + engine
- `desktop/src/preload.ts` — Expose `historyAPI`
- `desktop/webpack.config.js` — Add history HTML/CSS to CopyPlugin patterns

**main.ts wiring:**

```typescript
// Create history
const historyStore = new HistoryStore();
const historyWindow = new HistoryWindow(historyStore);
historyWindow.registerIPCHandlers();

// Pass historyStore to engine
const engine = new DesktopEngine(
  configStore, secretStore, audioManager, audioEncoder,
  trayManager, showNotification, adapterFactory, historyStore
);

// Wire tray
trayManager.setOnOpenHistory(() => historyWindow.show());
```

**webpack.config.js addition:**

```javascript
// In CopyPlugin patterns:
{ from: 'src/history/history.html', to: 'history/history.html' },
{ from: 'src/history/history.css', to: 'history/history.css' },
```

**Testing:**
- TrayManager test: "History" menu item exists and calls callback
- DesktopEngine test: historyStore.add() called after successful transcription

---

### Step 14: Integrate History into DesktopEngine

**What:** After successful transcription + paste, add the transcription to history.

**Files to modify:**
- `desktop/src/desktop-engine.ts`

**Change in `stopRecording()`:**

```typescript
// After paste/execute succeeds:
this.historyStore?.add(result.text, endpointConfig.language);
```

**Testing:** Add to `desktop-engine.test.ts`:
- `historyStore.add()` called with correct text and language after successful transcription
- `historyStore.add()` NOT called when transcription fails
- Engine works correctly when historyStore is undefined (backward compat)

---

## Phase 5: Packaging & Final Merge (Days 10-13)

### Step 15: Update README

**What:** Add desktop app documentation to the root README.

**Files to modify:**
- `README.md` (root)

**Sections to add:**
- Desktop App installation (prerequisites: macOS, sox)
- Building from source: `cd desktop && npm install && npm run build`
- Running: `npx electron dist/main.js`
- First-time setup (Accessibility permissions, endpoint config)
- Usage (Cmd+Shift+V hotkey, voice commands)
- Packaging: `npm run dist`

---

### Step 16: Merge feature/desktop-app → main

**What:** Merge the complete desktop app into the main branch.

**Steps:**
1. Ensure all tests pass: `cd desktop && npm test`
2. Ensure webpack builds: `cd desktop && npm run build`
3. Create PR: `feature/desktop-app` → `main`
4. Merge PR
5. Verify tests still pass on main

---

### Step 17: Final Integration Testing

**What:** Run all tests, verify the complete app works end-to-end.

**Verification checklist:**
- [ ] `cd desktop && npm test` — all tests pass
- [ ] `cd desktop && npm run build` — webpack compiles successfully
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

---

## Dependencies Summary

```
Step 1 (Wire Settings)      → No deps
Step 2 (Tray Icons)         → No deps
Step 3 (package.json)       → No deps
Step 4 (Build Verify)       → Steps 1-3
Step 5 (Config Schema)      → No deps
Step 6 (Device Dropdown)    → Step 5
Step 7 (CommandParser)      → No deps
Step 8 (CommandExecutor)    → Step 7
Step 9 (Engine Integration) → Steps 7, 8
Step 10 (HistoryStore)      → No deps
Step 11 (HistoryWindow)     → Step 10
Step 12 (History UI)        → Step 11
Step 13 (Wire History)      → Steps 10-12
Step 14 (Engine + History)  → Steps 10, 13
Step 15 (README)            → All steps
Step 16 (Merge to main)     → All steps
Step 17 (Final Testing)     → All steps
```

---

## Estimated Timeline

| Phase | Steps | Days | Key Deliverables |
|-------|-------|------|-----------------|
| Phase 1 | 1-4 | 2-3 | SettingsWindow wired, icons, build works |
| Phase 2 | 5-6 | 1-2 | Audio device selection in Settings |
| Phase 3 | 7-9 | 3-4 | Voice commands working end-to-end |
| Phase 4 | 10-14 | 2-3 | Transcription history with UI |
| Phase 5 | 15-17 | 1-2 | README, merge, final testing |

**Total: 10-14 days**
