# Security Standards

## Security Philosophy

Voice2Code is designed with **privacy-first and security-by-default** principles:

1. **Zero Trust Architecture:** Don't trust any external inputs or endpoints
2. **Minimal Attack Surface:** No backend servers, minimal dependencies, local-first
3. **User Control:** Users control where their data goes (their configured endpoints only)
4. **Defense in Depth:** Multiple layers of security validation
5. **Transparency:** Open source code, no hidden telemetry

## Threat Model

### Assets to Protect
1. **User's Audio:** Sensitive voice recordings (potentially containing secrets, PII)
2. **Source Code:** Code being written in the IDE
3. **Credentials:** API keys, endpoint authentication tokens
4. **User Privacy:** Usage patterns, transcription history

### Potential Threats
1. **Eavesdropping:** Attacker intercepts audio or transcriptions in transit
2. **Credential Theft:** API keys leaked through logs or error messages
3. **Malicious Endpoints:** User configured to send audio to attacker-controlled server
4. **Dependency Vulnerabilities:** Security flaws in npm packages
5. **Code Injection:** Malicious transcriptions attempt code execution
6. **Side Channels:** Audio data leaked through caching or temp files

### Out of Scope
- **Malicious User:** We assume the user is not intentionally compromising their own system
- **Physical Access:** Attacks requiring physical access to user's machine
- **IDE Compromise:** If VS Code itself is compromised, extension security is moot

## Authentication & Authorization

### No Built-in Authentication
Voice2Code does NOT provide authentication itself. It delegates all authentication to the configured STT endpoint.

### Endpoint Authentication Patterns

#### Pattern 1: No Authentication (Local Models)
```typescript
// Simple HTTP request to localhost
const response = await axios.post('http://localhost:11434/api/transcribe', audio);
```
**Security:** Acceptable for local-only endpoints on trusted networks.

#### Pattern 2: API Key Authentication
```typescript
const response = await axios.post(endpoint, audio, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'audio/mpeg',
  },
});
```
**Storage:** API keys stored in VS Code's `SecretStorage` (encrypted at rest).

#### Pattern 3: Custom Headers
```typescript
// Support custom authentication headers configured by user
const response = await axios.post(endpoint, audio, {
  headers: {
    ...config.customHeaders,
    'Content-Type': 'audio/mpeg',
  },
});
```

### Credential Storage

#### VS Code SecretStorage API (Extension)
```typescript
await context.secrets.store('voice2code.apiKey', apiKey);
const apiKey = await context.secrets.get('voice2code.apiKey');
await context.secrets.delete('voice2code.apiKey');
```

#### Electron safeStorage API (Desktop App)
```typescript
import { safeStorage } from 'electron';

// Encrypt and store
const encrypted = safeStorage.encryptString(apiKey);
store.set('encryptedApiKey', encrypted.toString('base64'));

// Retrieve and decrypt
const encrypted = Buffer.from(store.get('encryptedApiKey'), 'base64');
const apiKey = safeStorage.decryptString(encrypted);
```

**Security Properties (both):**
- Encrypted at rest (macOS Keychain-backed)
- Not included in Settings Sync
- Never logged or displayed in UI

#### Never Store Credentials in Plain Text
```typescript
// WRONG - never do this
const config = {
  endpoint: 'https://api.example.com',
  apiKey: 'sk-abc123xyz',  // Stored in settings.json (INSECURE!)
};

// CORRECT - use SecretStorage
const apiKey = await context.secrets.get('voice2code.apiKey');
const config = {
  endpoint: 'https://api.example.com',
  // apiKey retrieved separately from secure storage
};
```

## Data Protection

### Audio Data Lifecycle

1. **Capture:** Audio captured from microphone
2. **Buffer:** Stored temporarily in memory (Buffer object)
3. **Encode:** Converted to MP3 format
4. **Transmit:** Sent to STT endpoint via HTTPS
5. **Destroy:** Buffer cleared immediately after transcription
6. **Never Persist:** Audio NEVER written to disk

```typescript
class AudioManager {
  private audioBuffer: Buffer | null = null;

  async stopCapture(): Promise<Buffer> {
    const audio = this.audioBuffer!;

    // Clear reference immediately
    this.audioBuffer = null;

    return audio;
  }

  async cleanup(): void {
    // Ensure no lingering audio data
    if (this.audioBuffer) {
      this.audioBuffer = null;  // Let GC collect
    }
  }
}
```

### Transcription Data Handling

#### Transcription Text
- **Short-term Storage:** Kept in memory during preview/confirmation
- **Optional History:** If user enables history feature, last 50 transcriptions stored
- **User Control:** History feature disabled by default, user can clear anytime

```typescript
interface TranscriptionHistory {
  text: string;
  timestamp: number;
  // NO audio, NO model response details
}
```

#### What We DON'T Store
- Audio buffers
- Full API responses (only extract text)
- Endpoint credentials in history
- User's voice characteristics

### Secure Deletion

```typescript
function secureDeleteHistory(): void {
  // Overwrite before deletion (defense against memory forensics)
  for (let i = 0; i < history.length; i++) {
    history[i] = {
      text: '',
      timestamp: 0,
    };
  }
  history.length = 0;
}
```

## Network Security

### HTTPS Enforcement

#### Warn on HTTP Endpoints
```typescript
function validateEndpoint(url: string): ValidationResult {
  const parsed = new URL(url);

  if (parsed.protocol === 'http:' && !isLocalhost(parsed.hostname)) {
    return {
      valid: true,
      warning: 'Using unencrypted HTTP for remote endpoint. Audio will be sent in plain text.',
    };
  }

  return { valid: true };
}

function isLocalhost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}
```

#### Exception for Localhost
Allow HTTP for `localhost`, `127.0.0.1`, `::1` (local development).

### TLS Certificate Validation

```typescript
const httpsAgent = new https.Agent({
  rejectUnauthorized: true,  // ALWAYS validate certificates
});

const response = await axios.post(endpoint, audio, {
  httpsAgent,
  timeout: 30000,
});
```

**Never Allow:**
- `rejectUnauthorized: false` (disables certificate validation)
- Self-signed certificates without explicit user override

### Request Timeout

```typescript
const response = await axios.post(endpoint, audio, {
  timeout: 30000,  // 30 second timeout
  // Prevents hanging connections, resource exhaustion
});
```

### Network Isolation

- **No Cross-Origin Requests:** Extension only talks to user-configured endpoint
- **No Third-Party Analytics:** No network calls to analytics services
- **No Update Checks:** Rely on VS Code marketplace for updates

## Input Validation

### Endpoint URL Validation

```typescript
function validateEndpointUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow HTTP(S)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // No file:// or other dangerous protocols
    if (parsed.protocol === 'file:') {
      return false;
    }

    // Validate hostname is not empty
    if (!parsed.hostname) {
      return false;
    }

    return true;
  } catch {
    return false;  // Invalid URL
  }
}
```

### Model Name Validation

```typescript
function validateModelName(name: string): boolean {
  // Prevent path traversal, code injection
  const SAFE_MODEL_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
  return SAFE_MODEL_NAME_REGEX.test(name) && name.length <= 100;
}
```

### Sanitize Error Messages

```typescript
function sanitizeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // DON'T leak full response body (may contain sensitive data)
    return `Network error: ${error.message}`;
  }

  // DON'T leak stack traces to user
  return 'An unexpected error occurred';
}
```

### Prevent Code Injection via Transcription

```typescript
function insertTextSafely(text: string): void {
  // VS Code's TextEditor.edit API is safe by default
  // Text is inserted as literal string, not evaluated as code
  editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, text);
  });

  // NEVER use eval() or Function() constructor on transcription
  // NEVER execute transcribed text as commands
}
```

## Dependency Security

### Dependency Management Strategy

#### Minimal Dependencies
Only include essential dependencies:
- `axios` - HTTP client
- `node-record-lpcm16` - Audio capture
- Audio encoding library (e.g., `fluent-ffmpeg` or `lame`)

#### Avoid Dependencies With:
- Known vulnerabilities (run `npm audit`)
- Large dependency trees (more attack surface)
- Unmaintained packages (last update >2 years ago)
- Suspicious authors or packages

### Regular Security Audits

```bash
# Run before every release
npm audit --production

# Fix vulnerabilities automatically
npm audit fix

# For breaking changes, update manually
npm audit fix --force  # Review changes carefully!
```

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
```

### Lock Dependencies

```json
// package.json - use exact versions
{
  "dependencies": {
    "axios": "1.6.5",  // NOT ^1.6.5 or ~1.6.5
  }
}
```

Commit `package-lock.json` to ensure reproducible builds.

### Subresource Integrity (for CDN resources)

If loading any resources from CDN in webviews:
```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

## Secrets Management

### Never Hardcode Secrets

```typescript
// WRONG - hardcoded API key
const API_KEY = 'sk-abc123xyz';

// CORRECT - load from SecretStorage
const API_KEY = await context.secrets.get('voice2code.apiKey');
```

### Environment Variables (Development Only)

```typescript
// For local development/testing only
const DEV_ENDPOINT = process.env.VOICE2CODE_DEV_ENDPOINT;

// NEVER ship with hardcoded production keys
```

### Logging Security

```typescript
// WRONG - logs sensitive data
logger.debug('Request headers', { headers: { Authorization: apiKey } });

// CORRECT - redact sensitive fields
logger.debug('Request headers', {
  headers: { Authorization: '[REDACTED]' }
});
```

## Desktop App Security (Electron)

### macOS Permissions

The desktop app requires explicit user consent for:

1. **Microphone Access:** Standard macOS prompt on first use
2. **Accessibility:** Required for `@nut-tree/nut-js` keyboard simulation (paste into any app)
   ```typescript
   // Prompt user to grant Accessibility permission
   systemPreferences.isTrustedAccessibilityClient(true);
   ```

### Electron Security Best Practices

- **Context isolation enabled:** `contextIsolation: true` in BrowserWindow
- **Node integration disabled:** `nodeIntegration: false` in renderer
- **Preload scripts:** All IPC via `contextBridge.exposeInMainWorld()`
- **No remote module:** Deprecated and disabled
- **LSUIElement:** App hidden from Dock (menu bar only)

### Clipboard Security

The paste simulation saves and restores the user's clipboard:
```typescript
const previous = clipboard.readText();
clipboard.writeText(transcribedText);
await simulatePaste();  // Cmd+V
setTimeout(() => clipboard.writeText(previous), 500);
```

### electron-store Security

- Config file stored at `~/Library/Application Support/voice2code-desktop/`
- Settings are plain JSON — DO NOT store secrets here
- API keys always go through `safeStorage` encryption

## Extension Security

### VS Code Extension Permissions

#### Minimal Permissions in `package.json`
```json
{
  "activationEvents": [
    "onCommand:voice2code.startRecording"
  ],
  "contributes": {
    "commands": [...],
    "configuration": [...]
  }
  // Don't request unnecessary permissions
}
```

#### No Elevated Permissions Required
Extension should NEVER require:
- Administrator/root privileges
- Access to system-wide resources
- Permissions beyond VS Code's sandbox

### Sandboxing

VS Code extension host provides isolation:
- Extensions run in separate process from editor
- Limited access to file system (must use VS Code API)
- Cannot directly access other extensions' data

### Content Security Policy (Webviews)

```typescript
const panel = vscode.window.createWebviewPanel(
  'voice2code.preview',
  'Transcription Preview',
  vscode.ViewColumn.One,
  {
    enableScripts: true,  // Required for interaction
    localResourceRoots: [
      vscode.Uri.file(path.join(context.extensionPath, 'media'))
    ],
  }
);

// Set strict CSP
panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${panel.webview.cspSource} 'unsafe-inline';
                 script-src ${panel.webview.cspSource};">
</head>
<body>...</body>
</html>
`;
```

## Privacy Standards

### Zero Telemetry by Default

```typescript
const TELEMETRY_ENABLED = false;  // Hardcoded false by default

async function sendTelemetry(event: string, data: unknown): Promise<void> {
  const enabled = await config.get('telemetry.enabled', TELEMETRY_ENABLED);

  if (!enabled) {
    return;  // No-op if user hasn't explicitly opted in
  }

  // Even if enabled, never send:
  // - Audio data
  // - Transcription text
  // - Endpoint URLs
  // - API keys
  // Only send: anonymous usage metrics (e.g., "feature X used")
}
```

### Data Minimization

Only collect what's absolutely necessary:
- **Don't Need:** User's name, email, location, IP address
- **Might Need (with consent):** Anonymous usage stats, error counts
- **Always Need:** Nothing - extension works fully offline

### GDPR Compliance

- **No Personal Data:** Don't collect PII
- **Right to Deletion:** User can clear history anytime
- **Transparency:** Open source code, clear privacy policy
- **Consent:** Opt-in for any data collection

## Incident Response

### Vulnerability Disclosure

#### Security Policy (`SECURITY.md`)
```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email security@voice2code.example.com.

**Please do not open a public GitHub issue.**

We will respond within 48 hours and provide a timeline for a fix.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |
```

### Response Timeline
1. **Day 0:** Vulnerability reported
2. **Day 1-2:** Acknowledge receipt, begin investigation
3. **Day 3-7:** Develop and test fix
4. **Day 7-14:** Release patched version
5. **Day 14+:** Public disclosure (after users have had time to update)

### Security Patching Process
1. Create private branch for fix
2. Test fix thoroughly
3. Release as patch version (e.g., 1.2.3 → 1.2.4)
4. Update CHANGELOG with security notice
5. Notify users via marketplace announcement

## Security Checklist (Pre-Release)

Before releasing any version:

- [ ] `npm audit` shows zero vulnerabilities
- [ ] All secrets removed from code and config files
- [ ] No console.log statements with sensitive data
- [ ] HTTPS enforced for remote endpoints (with warning for HTTP)
- [ ] Input validation for all user-provided data
- [ ] Error messages don't leak sensitive information
- [ ] No hardcoded credentials or API keys
- [ ] Dependencies locked to exact versions
- [ ] Code reviewed by at least one other developer
- [ ] Security-sensitive code has 100% test coverage
- [ ] Privacy policy up to date
- [ ] SECURITY.md up to date

## Secure Development Practices

### Code Review Focus Areas
1. **Input Validation:** All user inputs sanitized?
2. **Error Handling:** No sensitive data in error messages?
3. **Logging:** No secrets logged?
4. **Dependencies:** New dependencies audited?
5. **Authentication:** Credentials stored securely?

### Testing Security Scenarios

```typescript
// Test: Validate that API keys are never logged
test('should not log API keys', async () => {
  const logSpy = jest.spyOn(logger, 'debug');

  await transcriptionService.transcribe(audioBuffer);

  for (const call of logSpy.mock.calls) {
    expect(JSON.stringify(call)).not.toContain('sk-');  // API key prefix
  }
});

// Test: Validate URL sanitization
test('should reject file:// URLs', () => {
  expect(() => validateEndpointUrl('file:///etc/passwd')).toThrow();
});

// Test: Validate audio buffer cleanup
test('should clear audio buffer after transcription', async () => {
  await audioManager.startCapture();
  const buffer = await audioManager.stopCapture();

  // Verify buffer is cleared
  expect((audioManager as any).audioBuffer).toBeNull();
});
```

## Compliance Standards

### OWASP Top 10 Mitigation

1. **Injection:** Input validation prevents code injection
2. **Broken Authentication:** No authentication in extension (delegated to endpoint)
3. **Sensitive Data Exposure:** No data persistence, HTTPS enforced
4. **XML External Entities:** Not applicable (no XML parsing)
5. **Broken Access Control:** VS Code sandbox provides isolation
6. **Security Misconfiguration:** Secure defaults (no telemetry, HTTPS warnings)
7. **XSS:** CSP in webviews prevents XSS
8. **Insecure Deserialization:** JSON parsing only, no untrusted deserialization
9. **Using Components with Known Vulnerabilities:** npm audit, Dependabot
10. **Insufficient Logging & Monitoring:** Comprehensive error logging (no sensitive data)

### Industry Standards
- **NIST Cybersecurity Framework:** Align with Identify, Protect, Detect, Respond, Recover
- **ISO 27001:** Information security management best practices
- **SOC 2 Type II (future):** If offering enterprise version

---

**Document Version:** 2.0
**Last Updated:** February 20, 2026
**Status:** Active - Security is Everyone's Responsibility
