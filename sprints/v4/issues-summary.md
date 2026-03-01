# GitHub Issues for Sprint v4

**Created:** 2026-02-26

**Total Issues:** 17

## Issue Breakdown

### P0 (Critical): 4 issues
- #95: [feature] Wire SettingsWindow into main.ts
- #96: [infrastructure] Create tray icon assets
- #97: [infrastructure] Clean up package.json and add electron-builder
- #98: [infrastructure] Webpack build verification

### P1 (High): 5 issues
- #99: [feature] Extend ConfigStore schema with device and voice command fields
- #100: [feature] Add audio device dropdown to Settings UI
- #101: [feature] Implement CommandParser
- #102: [feature] Implement CommandExecutor
- #103: [feature] Integrate voice commands into DesktopEngine

### P2 (Medium): 8 issues
- #104: [feature] Implement HistoryStore
- #105: [feature] Implement HistoryWindow with IPC handlers
- #106: [feature] Create History UI (HTML/CSS/renderer)
- #107: [feature] Wire History into TrayManager and main.ts
- #108: [feature] Integrate History into DesktopEngine
- #109: [documentation] Update README with desktop app documentation
- #110: [infrastructure] Merge feature/desktop-app to main
- #111: [integration-test] Final integration testing

## Implementation Order

Based on dependencies:

1. Foundation (#95, #96, #97) — Wire Settings, icons, package.json
2. Build Verify (#98) — Ensure webpack compiles
3. Config Schema (#99) — Extend DesktopConfig
4. Device UI (#100) — Audio device dropdown
5. CommandParser (#101) — Voice command parsing
6. CommandExecutor (#102) — Keystroke execution
7. Engine + Voice (#103) — Integrate voice commands
8. HistoryStore (#104) — History persistence
9. HistoryWindow (#105) — History IPC handlers
10. History UI (#106) — HTML/CSS/renderer
11. Wire History (#107) — Tray, main.ts, preload, webpack
12. Engine + History (#108) — Save transcriptions to history
13. README (#109) — Documentation
14. Merge (#110) — feature/desktop-app → main
15. Final Testing (#111) — End-to-end verification

## GitHub Milestone

All issues assigned to: **Sprint v4** (Milestone #4)

View issues: https://github.com/kiranshivaraju/voice2code/milestone/4
