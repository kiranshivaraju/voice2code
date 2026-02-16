# End-to-End Tests - Voice2Code Extension

This directory contains end-to-end tests for the Voice2Code VS Code extension.

## Overview

The e2e tests validate the complete extension functionality in a real VS Code instance, including:

1. **Happy Path Test** - Full workflow from extension activation to text insertion
2. **Settings Configuration Test** - Configuration management and persistence
3. **Multi-cursor Test** - Text insertion at multiple cursor positions
4. **Extension Lifecycle** - Activation, command registration, and deactivation
5. **Error Handling** - Graceful handling of edge cases and errors

## Test Structure

```
tests/e2e/
├── README.md                    # This file
├── basic-workflow.test.ts       # Main e2e test suite
├── index.ts                     # Test runner index
└── runTest.ts                   # VS Code test launcher
```

## Prerequisites

Before running e2e tests, ensure you have:

1. **Mocha** - Test framework
   ```bash
   npm install --save-dev mocha @types/mocha
   ```

2. **Glob** - File pattern matching
   ```bash
   npm install --save-dev glob
   ```

3. **VS Code Test Electron** - Already installed
   ```bash
   npm install --save-dev @vscode/test-electron
   ```

## Running E2E Tests

### Option 1: Using npm script (recommended)

```bash
npm run test:e2e
```

### Option 2: Direct execution

```bash
npx ts-node tests/e2e/runTest.ts
```

### Option 3: VS Code Test UI

1. Open the Testing view (beaker icon in sidebar)
2. Click "Run Tests" for the e2e suite
3. View results in the Test Results panel

## Test Configuration

The e2e tests use the following configuration:

- **Test Framework**: Mocha with TDD interface
- **Timeout**: 10 seconds (configurable per test)
- **VS Code Version**: Latest stable
- **Launch Args**:
  - `--disable-extensions` - Isolate extension under test
  - `--disable-workspace-trust` - Skip trust dialogs

## Test Scenarios

### 1. Happy Path Test

Tests the complete recording workflow:
- Extension activation
- Command registration
- Configuration setup
- Connection testing
- Recording start/stop
- Status bar updates

### 2. Settings Configuration Test

Validates configuration management:
- Endpoint URL modification
- Model selection
- Timeout configuration
- Audio format settings
- Settings UI access
- Default value restoration

### 3. Multi-cursor Test

Verifies multi-cursor support:
- Multiple cursor positioning
- Simultaneous text insertion
- Single cursor handling
- Empty document handling
- Cursor position preservation

### 4. Extension Lifecycle

Tests extension lifecycle:
- Activation on startup
- Command registration
- Graceful deactivation

### 5. Error Handling

Validates error scenarios:
- Missing configuration
- Invalid endpoint URL
- No active editor
- Audio device unavailable

## Mocking Strategy

### Audio Recording

Since real audio recording is not feasible in CI/CD:
- Commands are executed to verify they don't crash
- Error messages are logged but don't fail tests
- Audio device unavailability is expected

### STT Service

The tests can work with:
- **Local Ollama** - If running on localhost:11434
- **Mock Service** - Simulated responses (future enhancement)
- **No Service** - Tests verify graceful error handling

## CI/CD Integration

The e2e tests are designed for CI/CD compatibility:

```yaml
# .github/workflows/test.yml
- name: Run E2E Tests
  run: |
    xvfb-run -a npm run test:e2e
  env:
    DISPLAY: ':99.0'
```

### Linux/CI Requirements

On headless systems, use Xvfb:

```bash
sudo apt-get install -y xvfb
xvfb-run -a npm run test:e2e
```

## Troubleshooting

### Test Timeout

If tests timeout, increase the timeout in `index.ts`:

```typescript
const mocha = new Mocha({
  timeout: 20000, // Increase to 20 seconds
});
```

### VS Code Download Fails

The test runner downloads VS Code automatically. If it fails:

1. Check internet connection
2. Clear VS Code test cache: `rm -rf .vscode-test`
3. Try again

### Extension Not Activating

Ensure `package.json` has correct activation events:

```json
"activationEvents": [
  "onCommand:voice2code.startRecording",
  "onCommand:voice2code.toggleRecording"
]
```

## Best Practices

1. **Keep Tests Independent** - Each test should be self-contained
2. **Use Proper Timeouts** - E2E tests may need longer timeouts
3. **Clean Up Resources** - Close editors, reset config after tests
4. **Handle Async Properly** - Always await VS Code APIs
5. **Test Real Scenarios** - Focus on user workflows, not implementation

## Future Enhancements

- [ ] Audio fixture support for real transcription testing
- [ ] Mock STT service for predictable responses
- [ ] Performance benchmarking
- [ ] Visual regression testing
- [ ] Cross-platform test matrix (Windows, macOS, Linux)

## Resources

- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Documentation](https://mochajs.org/)
- [@vscode/test-electron](https://github.com/microsoft/vscode-test)
