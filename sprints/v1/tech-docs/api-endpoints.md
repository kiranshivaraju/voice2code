# API Endpoints - Sprint v1

## Overview

Voice2Code is a **client-side VS Code extension** that **CONSUMES** external STT APIs. This document defines:
1. **External STT APIs** we integrate with (Ollama, vLLM, OpenAI Whisper)
2. **VS Code Extension Commands** (internal API exposed to users)
3. **STT API Integration Patterns**

---

## Part 1: External STT API Integration

Voice2Code supports any **OpenAPI-compatible** STT endpoint. We provide adapters for common providers.

### STT Provider 1: Ollama API

**Base URL:** `http://localhost:11434` (default local deployment)

**Endpoint:** `POST /api/generate`

**Description:** Ollama's text generation API (can be used for STT with appropriate models)

**Authentication:** None required for local deployment

**Request Format:**

```json
{
  "model": "whisper-large-v3",
  "prompt": "<base64-encoded-audio>",
  "stream": false
}
```

**Success Response (200 OK):**

```json
{
  "model": "whisper-large-v3",
  "created_at": "2026-02-11T10:30:00Z",
  "response": "This is the transcribed text.",
  "done": true
}
```

**Error Handling:** Network errors, 404 model not found, 500 server errors

---

### STT Provider 2: vLLM (OpenAI-Compatible API)

**Base URL:** `http://localhost:8000`

**Endpoint:** `POST /v1/audio/transcriptions`

**Description:** vLLM's OpenAI-compatible Whisper API

**Authentication:** Optional Bearer token

**Request Format:** multipart/form-data with audio file

**Success Response (200 OK):**

```json
{
  "text": "This is the transcribed text.",
  "language": "en",
  "duration": 5.2
}
```

---

## Part 2: VS Code Extension Commands

### Command 1: Toggle Recording

**Command ID:** `voice2code.toggleRecording`

**Keyboard Shortcut:** Ctrl+Shift+V

**Flow:** Start if idle, stop if recording

### Command 2: Start Recording

**Command ID:** `voice2code.startRecording`

### Command 3: Stop Recording

**Command ID:** `voice2code.stopRecording`

### Command 4: Test Connection

**Command ID:** `voice2code.testConnection`

### Command 5: Open Settings

**Command ID:** `voice2code.openSettings`

**Total Commands:** 5

---

For complete API details, see full version of this document.
