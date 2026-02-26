# Testing Strategy

## Testing Philosophy

Voice2Code follows a **Test-Driven Development (TDD)** approach with comprehensive test coverage:

1. **Write Tests First:** Tests define expected behavior before implementation
2. **Red-Green-Refactor:** Write failing test → Make it pass → Improve code
3. **80% Minimum Coverage:** All modules must have at least 80% code coverage
4. **Fast Feedback:** Unit tests run in <5 seconds, full suite in <2 minutes
5. **Test Pyramid:** Many unit tests, fewer integration tests, minimal E2E tests

## Test Pyramid

```
              ┌───────────┐
             /             \      E2E Tests (5%)
            /               \     - Full workflows in VS Code
           /─────────────────\    - Slow, brittle, expensive
          /                   \
         /                     \
        /    Integration (15%)  \  - Component interactions
       /                         \ - Mock external services
      /───────────────────────────\- Medium speed
     /                             \
    /                               \
   /        Unit Tests (80%)         \ - Individual functions/classes
  /                                   \- Fast, reliable, cheap
 /─────────────────────────────────────\
```

## Test Levels

### 1. Unit Tests (80% of tests)

**Purpose:** Test individual functions and classes in isolation

**Characteristics:**
- Fast (<1ms per test)
- No external dependencies (mock everything)
- High coverage (90%+ for critical modules)
- Run on every file save (watch mode)

**What to Test:**
- Business logic
- Data transformations
- Validation functions
- Error handling
- Edge cases

**What NOT to Test:**
- Third-party libraries (assume they work)
- Trivial getters/setters
- VS Code API itself

**Example:**
```typescript
// tests/unit/config/endpoint-validator.test.ts
import { EndpointValidator } from '../../../src/config/endpoint-validator';

describe('EndpointValidator', () => {
  let validator: EndpointValidator;

  beforeEach(() => {
    validator = new EndpointValidator();
  });

  describe('validateUrl', () => {
    test('should accept valid HTTPS URLs', () => {
      const result = validator.validateUrl('https://api.example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept localhost HTTP URLs', () => {
      const result = validator.validateUrl('http://localhost:11434');
      expect(result.valid).toBe(true);
    });

    test('should warn on non-localhost HTTP URLs', () => {
      const result = validator.validateUrl('http://api.example.com');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('unencrypted');
    });

    test('should reject file:// URLs', () => {
      const result = validator.validateUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    test('should reject invalid URLs', () => {
      const result = validator.validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateModelName', () => {
    test('should accept alphanumeric with hyphens', () => {
      expect(validator.validateModelName('whisper-large-v3')).toBe(true);
    });

    test('should reject path traversal attempts', () => {
      expect(validator.validateModelName('../etc/passwd')).toBe(false);
    });

    test('should reject names with special characters', () => {
      expect(validator.validateModelName('model;rm -rf /')).toBe(false);
    });
  });
});
```

### 2. Contract Tests (15% of tests)

**Purpose:** Test API contracts and data formats

**Characteristics:**
- Validate request/response formats
- Ensure compatibility with external APIs
- Mock HTTP requests/responses
- Medium speed (~10ms per test)

**What to Test:**
- STT API request formatting
- Response parsing for different STT providers
- Error response handling
- Header and authentication formatting

**Example:**
```typescript
// tests/contract/stt-adapters.test.ts
import { OpenAIWhisperAdapter } from '../../src/adapters/openai-whisper-adapter';
import axios from 'axios';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('OpenAIWhisperAdapter Contract', () => {
  let adapter: OpenAIWhisperAdapter;

  beforeEach(() => {
    adapter = new OpenAIWhisperAdapter('https://api.openai.com', 'sk-test');
  });

  test('should send multipart/form-data request with correct fields', async () => {
    mockAxios.post.mockResolvedValue({
      data: { text: 'test transcription' },
    });

    const audio = Buffer.from('fake audio data');
    await adapter.transcribe(audio, { model: 'whisper-1', language: 'en' });

    // Verify request format
    const call = mockAxios.post.mock.calls[0];
    expect(call[0]).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(call[1]).toBeInstanceOf(FormData);
    expect(call[2]?.headers).toHaveProperty('Authorization', 'Bearer sk-test');
  });

  test('should parse OpenAI response format', async () => {
    mockAxios.post.mockResolvedValue({
      data: {
        text: 'Hello world',
        language: 'en',
        duration: 2.5,
      },
    });

    const result = await adapter.transcribe(Buffer.from('audio'), {
      model: 'whisper-1',
    });

    expect(result).toEqual({
      text: 'Hello world',
      language: 'en',
      duration: 2.5,
    });
  });

  test('should handle 401 authentication errors', async () => {
    mockAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { error: 'Invalid API key' } },
    });

    await expect(
      adapter.transcribe(Buffer.from('audio'), { model: 'whisper-1' })
    ).rejects.toThrow('Authentication failed');
  });

  test('should handle 404 model not found errors', async () => {
    mockAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    await expect(
      adapter.transcribe(Buffer.from('audio'), { model: 'whisper-99' })
    ).rejects.toThrow('Model not found');
  });
});
```

### 3. Integration Tests (15% of tests)

**Purpose:** Test component interactions and workflows

**Characteristics:**
- Test multiple components together
- Use test fixtures and mock data
- Test VS Code API integration
- Slower (~100ms per test)

**What to Test:**
- End-to-end recording workflow
- Configuration → Audio → STT → Editor pipeline
- State management across components
- VS Code extension lifecycle

**Example:**
```typescript
// tests/integration/recording-workflow.test.ts
import * as vscode from 'vscode';
import { Voice2CodeEngine } from '../../src/core/engine';

describe('Recording Workflow Integration', () => {
  let engine: Voice2CodeEngine;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = createMockContext();
    engine = new Voice2CodeEngine(mockContext);
  });

  test('should complete full recording and insertion workflow', async () => {
    // Configure mock STT endpoint
    await vscode.workspace
      .getConfiguration('voice2code')
      .update('endpoint.url', 'http://localhost:8080', true);

    // Mock STT server response
    mockSTTServer.onPost('/api/transcribe').reply(200, {
      text: 'hello world',
    });

    // Open test editor
    const document = await vscode.workspace.openTextDocument({
      content: '',
      language: 'plaintext',
    });
    const editor = await vscode.window.showTextDocument(document);

    // Start recording
    await engine.startRecording();
    expect(engine.isRecording).toBe(true);

    // Simulate audio capture
    await sleep(100);

    // Stop recording
    const result = await engine.stopRecording();
    expect(result).toBe('hello world');

    // Verify text inserted into editor
    expect(editor.document.getText()).toBe('hello world');
  });

  test('should handle endpoint connection failure gracefully', async () => {
    await vscode.workspace
      .getConfiguration('voice2code')
      .update('endpoint.url', 'http://localhost:9999', true);

    await engine.startRecording();
    await sleep(50);

    await expect(engine.stopRecording()).rejects.toThrow('Cannot connect');

    // Verify no text inserted
    const editor = vscode.window.activeTextEditor;
    expect(editor?.document.getText()).toBe('');
  });
});
```

### 4. End-to-End Tests (5% of tests)

**Purpose:** Test complete user workflows in real VS Code environment

**Characteristics:**
- Slowest (seconds per test)
- Most brittle (UI changes break tests)
- Run in CI only (not on every save)
- Test real extension in real VS Code

**What to Test:**
- Critical user journeys
- Extension activation and commands
- UI interactions (status bar, preview panel)
- Real audio capture (with test audio files)

**Example:**
```typescript
// tests/e2e/user-workflows.test.ts
import { runTests } from '@vscode/test-electron';
import * as path from 'path';

describe('E2E User Workflows', () => {
  test('User can configure endpoint and record', async () => {
    // Launch VS Code with extension
    const extensionPath = path.resolve(__dirname, '../..');
    const testWorkspace = path.resolve(__dirname, '../fixtures/workspace');

    await runTests({
      extensionDevelopmentPath: extensionPath,
      extensionTestsPath: path.resolve(__dirname, './suite'),
      launchArgs: [testWorkspace, '--disable-extensions'],
    });
  });
});

// tests/e2e/suite/basic-workflow.test.ts
import * as vscode from 'vscode';

suite('Basic Recording Workflow', () => {
  test('should start and stop recording via command palette', async () => {
    // Open command palette
    await vscode.commands.executeCommand(
      'workbench.action.showCommands'
    );

    // Execute start recording command
    await vscode.commands.executeCommand('voice2code.startRecording');

    // Wait for recording to start
    await sleep(500);

    // Execute stop recording command
    await vscode.commands.executeCommand('voice2code.stopRecording');

    // Verify transcription appeared in editor
    const editor = vscode.window.activeTextEditor;
    expect(editor?.document.getText()).not.toBe('');
  });
});
```

## Test Organization

### Directory Structure

```
tests/                            # VS Code extension tests
├── unit/
│   ├── adapters/                 # Shared adapter tests
│   ├── audio/                    # Shared audio tests
│   ├── config/
│   ├── core/
│   ├── network/
│   └── ui/
├── fixtures/
└── __mocks__/
    └── vscode.ts                 # VS Code API mock

desktop/tests/                    # Desktop app tests
├── unit/
│   ├── config-store.test.ts
│   ├── secret-store.test.ts
│   ├── hotkey.test.ts
│   ├── paste.test.ts
│   ├── tray.test.ts
│   └── desktop-engine.test.ts
└── __mocks__/
    └── electron.ts               # Electron API mock
```

### Two Test Suites

| Suite | Command | Scope |
|---|---|---|
| Extension | `npx jest` (root) | Shared core + VS Code-specific code |
| Desktop | `cd desktop && npx jest` | Desktop-specific code |

Shared modules (adapters, audio, types) are tested once in the extension test suite. Desktop tests only cover desktop-specific code (config-store, tray, hotkey, paste, engine).

## Testing Tools & Frameworks

### Test Framework: Jest

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "npm run compile && node ./out/tests/e2e/runner.js"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### VS Code Extension Test Runner

```typescript
// tests/e2e/runner.ts
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions'],
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
```

## Mocking Strategies

### Mock VS Code API

```typescript
// tests/helpers/mock-vscode.ts
export function createMockContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    workspaceState: createMockMemento(),
    globalState: createMockMemento(),
    secrets: createMockSecretStorage(),
    extensionUri: vscode.Uri.file('/mock/path'),
    extensionPath: '/mock/path',
    // ... other properties
  };
}

function createMockMemento(): vscode.Memento {
  const storage = new Map<string, any>();

  return {
    get: (key: string, defaultValue?: any) => storage.get(key) ?? defaultValue,
    update: async (key: string, value: any) => {
      storage.set(key, value);
    },
    keys: () => Array.from(storage.keys()),
  };
}
```

### Mock HTTP Client (Axios)

```typescript
// tests/unit/core/transcription-service.test.ts
import axios from 'axios';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  mockAxios.post.mockClear();
});

test('should send audio to endpoint', async () => {
  mockAxios.post.mockResolvedValue({
    data: { text: 'test' },
  });

  const service = new TranscriptionService(config);
  await service.transcribe(Buffer.from('audio'));

  expect(mockAxios.post).toHaveBeenCalledWith(
    'http://localhost:11434/api/transcribe',
    expect.any(Buffer),
    expect.any(Object)
  );
});
```

### Mock Audio Capture

```typescript
// tests/helpers/mock-audio.ts
export class MockAudioManager implements IAudioService {
  private recording = false;
  private mockAudioData = Buffer.from('mock audio data');

  async startCapture(deviceId: string): Promise<void> {
    this.recording = true;
  }

  async stopCapture(): Promise<Buffer> {
    this.recording = false;
    return this.mockAudioData;
  }

  async getDevices(): Promise<AudioDevice[]> {
    return [
      { id: 'default', name: 'Default Microphone' },
      { id: 'device1', name: 'USB Microphone' },
    ];
  }

  async encode(audio: Buffer, format: AudioFormat): Promise<Buffer> {
    return audio;  // Pass through
  }
}
```

### Mock STT Server

```typescript
// tests/helpers/mock-stt-server.ts
import express from 'express';
import { Server } from 'http';

export class MockSTTServer {
  private app = express();
  private server: Server | null = null;
  public url = '';

  async start(port: number = 0): Promise<void> {
    this.app.post('/api/transcribe', (req, res) => {
      res.json({ text: 'mocked transcription' });
    });

    this.server = this.app.listen(port);
    const address = this.server.address();
    const actualPort = typeof address === 'object' ? address?.port : port;
    this.url = `http://localhost:${actualPort}`;
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }

  onPost(path: string) {
    return {
      reply: (status: number, body: any) => {
        this.app.post(path, (req, res) => {
          res.status(status).json(body);
        });
      },
    };
  }
}
```

## Test Data & Fixtures

### Audio Test Fixtures

```typescript
// tests/fixtures/audio-samples.ts
import * as fs from 'fs';
import * as path from 'path';

export function loadTestAudio(filename: string): Buffer {
  const filepath = path.join(__dirname, 'audio-samples', filename);
  return fs.readFileSync(filepath);
}

export const TEST_AUDIO_SAMPLES = {
  SHORT_PHRASE: 'sample-short.mp3',    // 2 seconds
  LONG_SPEECH: 'sample-long.mp3',      // 30 seconds
  SILENT: 'sample-silent.mp3',         // No speech
  NOISY: 'sample-noisy.mp3',           // Background noise
};
```

### Mock API Responses

```json
// tests/fixtures/mock-responses/openai-success.json
{
  "text": "This is a test transcription.",
  "language": "en",
  "duration": 2.5
}
```

```json
// tests/fixtures/mock-responses/openai-error-401.json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## Coverage Requirements

### Minimum Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/core/': {
    branches: 90,    // Critical core logic
    functions: 90,
    lines: 90,
    statements: 90,
  },
  './src/config/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
}
```

### Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# Open report in browser
open coverage/lcov-report/index.html
```

## CI/CD Testing Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run E2E tests
        if: matrix.os == 'ubuntu-latest'
        run: xvfb-run -a npm run test:e2e
```

## Test-Driven Development Workflow

### TDD Cycle

```
1. Write failing test (RED)
   ├─ Define expected behavior
   ├─ Write test that fails
   └─ Run test suite → FAIL

2. Write minimal code to pass (GREEN)
   ├─ Implement feature
   ├─ Run test suite → PASS
   └─ Commit

3. Refactor (REFACTOR)
   ├─ Improve code quality
   ├─ Eliminate duplication (DRY)
   ├─ Run test suite → PASS
   └─ Commit
```

### Example TDD Session

```typescript
// Step 1: RED - Write failing test
test('should validate endpoint URL', () => {
  const validator = new EndpointValidator();
  expect(validator.validateUrl('https://api.example.com')).toBe(true);
});
// → Test fails (EndpointValidator doesn't exist)

// Step 2: GREEN - Implement minimal code
class EndpointValidator {
  validateUrl(url: string): boolean {
    return true;  // Simplest code to pass
  }
}
// → Test passes

// Step 3: REFACTOR - Add more test cases and improve
test('should reject invalid URLs', () => {
  const validator = new EndpointValidator();
  expect(validator.validateUrl('not-a-url')).toBe(false);
});
// → Test fails, improve implementation

class EndpointValidator {
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
// → All tests pass, code is better
```

## Performance Testing

### Latency Benchmarks

```typescript
// tests/performance/latency.test.ts
describe('Performance Benchmarks', () => {
  test('should start recording in <200ms', async () => {
    const start = Date.now();
    await engine.startRecording();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
  });

  test('should encode audio in <1000ms', async () => {
    const audio = loadTestAudio('sample-short.mp3');
    const start = Date.now();
    await encoder.encode(audio, 'mp3');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
```

## Security Testing

```typescript
// tests/security/input-validation.test.ts
describe('Security: Input Validation', () => {
  test('should prevent path traversal in model names', () => {
    const validator = new EndpointValidator();
    expect(validator.validateModelName('../../../etc/passwd')).toBe(false);
  });

  test('should not log API keys', async () => {
    const logSpy = jest.spyOn(logger, 'debug');

    await transcriptionService.transcribe(audio);

    for (const call of logSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('sk-');
    }
  });

  test('should reject file:// URLs', () => {
    expect(() => validateEndpointUrl('file:///etc/passwd')).toThrow();
  });
});
```

---

**Document Version:** 2.0
**Last Updated:** February 20, 2026
**Status:** Active - Test First, Code Second
