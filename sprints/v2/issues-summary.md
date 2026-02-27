# GitHub Issues for Sprint v2

**Created:** 2026-02-17
**Total Issues:** 9
**Milestone:** Sprint v2 (#2)

---

## Issue Breakdown

### P0 (Critical): 4 issues

- #53: [feature] Implement real MP3 encoding via lamejs in AudioEncoder
- #54: [feature] Implement real audio device enumeration in DeviceManager
- #55: [feature] Implement real microphone capture in AudioManager via node-record-lpcm16
- #56: [unit-test] Verify full audio pipeline integration after Feature A

### P1 (High): 4 issues

- #57: [feature] Add language support through ConfigurationManager and STT adapters
- #59: [feature] Implement NetworkMonitor for endpoint health detection before recording
- #60: [feature] Implement transcription preview InputBox in EditorService
- #61: [feature] Implement HistoryManager for session transcription history

### P2 (Medium): 1 issue

- #58: [feature] Implement Settings Panel Webview (SettingsPanelProvider)

---

## Implementation Order

Based on dependencies (implement in this order):

**Phase 1 — Feature A (unblocks everything):**
1. #53 (AudioEncoder MP3) — no dependencies, implement first
2. #54 (DeviceManager real enumeration) — no dependencies, parallel with #53
3. #55 (AudioManager recording) — depends on #54
4. #56 (Integration smoke test) — depends on #53, #54, #55

**Phase 2 — Independent (parallel):**
5. #57 (Language support) — independent, parallel with #58
6. #58 (Settings Panel Webview) — independent, parallel with #57

**Phase 3 — After Feature A:**
7. #59 (NetworkMonitor) — depends on Feature A (#56)
8. #60 (Transcription Preview) — depends on Feature A (#56)
9. #61 (HistoryManager) — depends on Feature A (#56) and Feature B (#60)

---

## GitHub Milestone

All issues assigned to: **Sprint v2** (milestone #2)

View all issues:
https://github.com/kiranshivaraju/voice2code/milestone/2

View open issues:
https://github.com/kiranshivaraju/voice2code/issues?milestone=2&state=open

---

## Feature → Issue Mapping

| Feature | Issue(s) |
|---|---|
| A: Real Audio Pipeline (P0) | #53, #54, #55, #56 |
| B: Transcription Preview (P1) | #60 |
| C: Offline Detection (P1) | #59 |
| D: Language Support (P1) | #57 |
| E: Session History (P1) | #61 |
| F: Settings Panel (P2) | #58 |

---

## Next Step

Run `/prodkit.dev` with any issue number to start implementing:

```
/prodkit.dev issue 53   # Start with AudioEncoder MP3 (no dependencies)
/prodkit.dev issue 54   # Or DeviceManager (also no dependencies — parallel)
```

Recommended starting point: **#53** and **#54** simultaneously (both P0, no dependencies).
