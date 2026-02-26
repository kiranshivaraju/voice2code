# GitHub Issues for Sprint v3

**Created:** February 20, 2026

**Total Issues:** 12

## Issue Breakdown

### P0 (Critical): 8 issues
- #71: [infrastructure] Set up Electron desktop project scaffold
- #72: [feature] Implement ConfigStore for desktop config persistence
- #73: [feature] Implement SecretStore for encrypted API key management
- #74: [feature] Implement TrayManager for menu bar icon and context menu
- #75: [feature] Implement HotkeyManager for global keyboard shortcut
- #76: [feature] Implement pasteText clipboard paste function
- #77: [feature] Implement DesktopEngine recording state machine
- #78: [feature] Implement main.ts Electron app entry point

### P1 (High): 4 issues
- #79: [feature] Implement Settings window with IPC bridge
- #80: [feature] Create Settings UI (HTML/CSS/renderer)
- #81: [feature] Implement error notifications and macOS permissions
- #82: [integration-test] Integration tests for desktop recording flow

## Implementation Order

Based on dependencies:

1. **Scaffold** (#71)
2. **Config Store** (#72) — depends on #71
3. **Secret Store** (#73) — depends on #71, #72
4. **Tray Manager** (#74) — depends on #71
5. **Hotkey Manager** (#75) — depends on #71
6. **Paste Function** (#76) — depends on #71
7. **Desktop Engine** (#77) — depends on #72, #73, #74, #76
8. **Main Entry Point** (#78) — depends on #72-#77
9. **Settings Window + IPC** (#79) — depends on #72, #73
10. **Settings UI** (#80) — depends on #79
11. **Error Notifications & Permissions** (#81) — depends on #77, #78
12. **Integration Tests** (#82) — depends on #72, #73, #74, #76, #77

**Parallelizable:** Issues #74, #75, #76 can be built in parallel (all only depend on #71).

## GitHub Milestone

All issues assigned to: **Sprint v3** (milestone #3)

View on GitHub: https://github.com/kiranshivaraju/voice2code/milestone/3
