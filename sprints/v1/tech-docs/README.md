# Sprint v1 Technical Documentation

## Overview

This directory contains detailed technical specifications for all features in Sprint v1.

**Sprint Goal:** Build a working speech-to-text VS Code extension that can record audio, transcribe using local STT models, and insert text into the editor.

---

## Documentation Files

### 1. data-models.md
**Complete**: ✓  
**Purpose:** TypeScript interfaces, configuration models, runtime state models

**Contains:**
- 11 data models (EndpointConfiguration, AudioConfiguration, etc.)
- VS Code Settings schema
- SecretStorage patterns
- Error class hierarchy
- Validation rules for all fields

**Key Sections:**
- Configuration Models (VS Code Settings)
- Secret Storage Models
- Runtime State Models (in-memory)
- Response Models (TranscriptionResult)
- Error Models (Voice2CodeError hierarchy)

---

### 2. api-endpoints.md
**Summary Version**: ✓  
**Purpose:** External STT API integration patterns and VS Code commands

**Contains:**
- Ollama API integration
- vLLM/OpenAI Whisper API integration
- 5 VS Code extension commands
- Request/response formats
- Error handling patterns

**Key Sections:**
- External STT API Integration (Ollama, vLLM, OpenAI)
- VS Code Extension Commands (internal API)
- STT Adapter Interface

---

### 3. component-design.md
**Summary Version**: ✓  
**Purpose:** Detailed class designs and module responsibilities

**Contains:**
- 10 component designs
- Class signatures with method details
- Implementation patterns
- Dependency graph

**Components:**
1. Voice2CodeEngine (orchestrator)
2. ConfigurationManager
3. TranscriptionService
4. AudioManager
5. AudioEncoder
6. StatusBarController
7. EditorService
8. OllamaAdapter
9. OpenAIWhisperAdapter
10. EndpointValidator

---

### 4. implementation-plan.md
**Complete**: ✓  
**Purpose:** Step-by-step implementation guide (14 days)

**Contains:**
- 6 phases of development
- Day-by-day breakdown
- File creation checklist
- TDD workflow
- Testing strategy
- Dependencies and build order

**Timeline:**
- Days 1-3: Foundation (config, validation)
- Days 3-6: Audio capture
- Days 7-9: STT integration
- Days 10-11: UI & editor
- Day 12: Extension packaging
- Days 13-14: Testing & polish

---

### 5. .env.example
**Complete**: ✓  
**Purpose:** Development environment variables template

**Contains:**
- Test endpoint configuration
- Development flags
- Mock server settings
- Testing paths

**Note:** Production users configure via VS Code settings, not env vars

---

## Quick Reference

### Features in Sprint v1

1. **Feature 1**: Model Configuration
2. **Feature 2**: Voice Input with Toggle Activation
3. **Feature 3**: Text Insertion at Cursor
4. **Feature 5**: VS Code/Cursor Support
5. **Feature 6**: Audio Input Device Selection
6. **Feature 7**: Model Specification Configuration
7. **Feature 8**: Error Handling & Status Feedback

### Tech Stack

- **Language:** TypeScript 5.x (strict mode)
- **Platform:** VS Code Extension API
- **Build:** Webpack 5.x
- **Testing:** Jest + VS Code Extension Test Runner
- **HTTP:** Axios
- **Audio:** node-record-lpcm16 or similar

### Key TypeScript Interfaces

```typescript
interface EndpointConfiguration {
  url: string;
  model: string;
  timeout: number;
}

interface AudioConfiguration {
  deviceId: string;
  sampleRate: number;
  format: 'mp3' | 'wav';
}

interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}
```

### Main Components

```
Voice2CodeEngine
  ├── ConfigurationManager
  ├── AudioManager → AudioEncoder
  ├── TranscriptionService → STTAdapters
  ├── EditorService
  └── StatusBarController
```

---

## How to Use These Docs

### For Implementation (`/prodkit.dev`)

1. Start with **implementation-plan.md** to understand build order
2. Reference **data-models.md** for type definitions
3. Use **component-design.md** for class structure
4. Check **api-endpoints.md** for API integration details

### For Testing

1. **data-models.md** → validation test cases
2. **component-design.md** → unit test specifications
3. **api-endpoints.md** → contract test cases
4. **implementation-plan.md** → integration test scenarios

### For Code Review

1. Verify implementation matches **component-design.md**
2. Check data models match **data-models.md**
3. Ensure error handling follows **api-endpoints.md** patterns

---

## Next Steps

1. **Create GitHub Issues**: Run `/prodkit.create-issues` to generate issues from these specs
2. **Start Development**: Run `/prodkit.dev <issue-number>` to implement features using TDD
3. **Reference Docs**: Keep these docs open while coding - they answer most questions

---

## Document Status

- **Sprint:** v1
- **Created:** February 11, 2026
- **Status:** Complete ✓
- **Total Pages:** ~50 pages of detailed specifications
- **Ready for:** Issue creation and development

**All specifications are ready for implementation!**
