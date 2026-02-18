import * as vscode from 'vscode';
import { AdapterFactory } from '../adapters/adapter-factory';

/**
 * Dependency interfaces for constructor injection
 */
interface DeviceManager {
  getDevices(): Promise<Array<{ id: string; name: string; isDefault: boolean }>>;
}

interface HistoryManager {
  clear(): Promise<void>;
}

interface ConfigurationManager {
  getApiKey(): Promise<string | undefined>;
  setApiKey(key: string): Promise<void>;
  deleteApiKey(): Promise<void>;
}

/**
 * Settings snapshot sent to webview on init
 */
interface SettingsSnapshot {
  [key: string]: unknown;
}

/**
 * SettingsPanelProvider
 *
 * Provides a dedicated Webview-based settings panel for Voice2Code.
 * Replaces the raw VS Code settings redirect with a structured UI
 * covering endpoint, audio, UI preferences, and history sections.
 *
 * Security: Enforces CSP with per-session nonce. No inline event handlers.
 * Settings update live (no Save button) via workspace.getConfiguration().update().
 */
export class SettingsPanelProvider {
  private static readonly VIEW_TYPE = 'voice2code.settings';
  private static readonly TITLE = 'Voice2Code Settings';
  private static readonly CONFIG_SECTION = 'voice2code';

  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private deviceManager: DeviceManager,
    private historyManager: HistoryManager,
    private configManager?: ConfigurationManager
  ) {}

  /**
   * Open the settings panel, or reveal it if already open
   */
  async openOrReveal(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      SettingsPanelProvider.VIEW_TYPE,
      SettingsPanelProvider.TITLE,
      vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [this.context.extensionUri] }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));

    const snapshot = this.buildSnapshot();
    const devices = await this.deviceManager.getDevices();
    const nonce = crypto.randomUUID();

    this.panel.webview.html = this.getHtml(nonce, snapshot, devices);
  }

  private buildSnapshot(): SettingsSnapshot {
    const config = vscode.workspace.getConfiguration(SettingsPanelProvider.CONFIG_SECTION);
    const keys = [
      'endpoint.url', 'endpoint.model', 'endpoint.language', 'endpoint.timeout',
      'audio.deviceId', 'audio.sampleRate', 'audio.format',
      'ui.showStatusBar', 'ui.previewEnabled', 'ui.audioFeedback',
      'history.enabled', 'history.maxItems',
    ];

    const snapshot: SettingsSnapshot = {};
    for (const key of keys) {
      snapshot[key] = config.get(key);
    }
    return snapshot;
  }

  private async handleMessage(msg: { type: string; key?: string; value?: unknown }): Promise<void> {
    switch (msg.type) {
      case 'updateSetting': {
        const config = vscode.workspace.getConfiguration(SettingsPanelProvider.CONFIG_SECTION);
        await config.update(msg.key!, msg.value, true);
        break;
      }
      case 'testConnection': {
        const config = vscode.workspace.getConfiguration(SettingsPanelProvider.CONFIG_SECTION);
        const url = config.get<string>('endpoint.url', '');
        try {
          const apiKey = this.configManager ? await this.configManager.getApiKey() : undefined;
          const factory = new AdapterFactory();
          const adapter = factory.createAdapter(url, apiKey);
          const success = await adapter.testConnection();
          this.panel?.webview.postMessage({
            type: 'connectionResult',
            success,
          });
        } catch {
          this.panel?.webview.postMessage({
            type: 'connectionResult',
            success: false,
          });
        }
        break;
      }
      case 'setApiKey': {
        if (this.configManager && typeof msg.value === 'string') {
          await this.configManager.setApiKey(msg.value);
        }
        break;
      }
      case 'deleteApiKey': {
        if (this.configManager) {
          await this.configManager.deleteApiKey();
        }
        break;
      }
      case 'clearHistory': {
        await this.historyManager.clear();
        break;
      }
      case 'openKeyboardShortcuts': {
        vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', 'voice2code');
        break;
      }
    }
  }

  private getHtml(
    nonce: string,
    settings: SettingsSnapshot,
    devices: Array<{ id: string; name: string; isDefault: boolean }>
  ): string {
    const deviceOptions = devices
      .map((d) => `<option value="${this.escapeHtml(d.id)}"${d.isDefault ? ' selected' : ''}>${this.escapeHtml(d.name)}</option>`)
      .join('\n            ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SettingsPanelProvider.TITLE}</title>
  <style nonce="${nonce}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 20px; }
    h1 { font-size: 1.4em; margin-bottom: 20px; }
    h2 { font-size: 1.1em; margin-top: 24px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 4px; }
    .field { margin: 12px 0; display: flex; align-items: center; gap: 12px; }
    .field label { min-width: 140px; }
    .field input, .field select { flex: 1; max-width: 400px; padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
    .field input[type="checkbox"] { flex: none; width: auto; }
    button { padding: 6px 14px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .result { margin-left: 12px; font-style: italic; }
    .result.success { color: var(--vscode-testing-iconPassed); }
    .result.error { color: var(--vscode-testing-iconFailed); }
  </style>
</head>
<body>
  <h1>Voice2Code Settings</h1>

  <h2>Endpoint</h2>
  <div class="field">
    <label for="endpoint.url">URL</label>
    <input id="endpoint.url" type="text" aria-label="Endpoint URL" value="${this.escapeHtml(String(settings['endpoint.url'] ?? ''))}" />
  </div>
  <div class="field">
    <label for="endpoint.model">Model</label>
    <input id="endpoint.model" type="text" aria-label="Model name" value="${this.escapeHtml(String(settings['endpoint.model'] ?? ''))}" />
  </div>
  <div class="field">
    <label for="endpoint.language">Language</label>
    <input id="endpoint.language" type="text" aria-label="Language code" value="${this.escapeHtml(String(settings['endpoint.language'] ?? ''))}" />
  </div>
  <div class="field">
    <label for="endpoint.timeout">Timeout (ms)</label>
    <input id="endpoint.timeout" type="number" aria-label="Timeout in milliseconds" value="${settings['endpoint.timeout'] ?? 30000}" />
  </div>
  <div class="field">
    <label for="apiKey">API Key</label>
    <input id="apiKey" type="password" aria-label="API Key" placeholder="gsk_... or sk-..." />
    <button id="btn-save-api-key" aria-label="Save API Key">Save</button>
    <button id="btn-delete-api-key" aria-label="Delete API Key">Delete</button>
  </div>
  <div class="field">
    <button id="btn-test-connection" aria-label="Test Connection">Test Connection</button>
    <span id="connection-result" class="result"></span>
  </div>

  <h2>Audio</h2>
  <div class="field">
    <label for="audio.deviceId">Device</label>
    <select id="audio.deviceId" aria-label="Audio device">
      ${deviceOptions}
    </select>
  </div>
  <div class="field">
    <label for="audio.sampleRate">Sample Rate</label>
    <input id="audio.sampleRate" type="number" aria-label="Sample rate" value="${settings['audio.sampleRate'] ?? 16000}" />
  </div>
  <div class="field">
    <label for="audio.format">Format</label>
    <select id="audio.format" aria-label="Audio format">
      <option value="mp3"${settings['audio.format'] === 'mp3' ? ' selected' : ''}>MP3</option>
      <option value="wav"${settings['audio.format'] === 'wav' ? ' selected' : ''}>WAV</option>
    </select>
  </div>

  <h2>UI</h2>
  <div class="field">
    <input id="ui.showStatusBar" type="checkbox" aria-label="Show status bar" ${settings['ui.showStatusBar'] ? 'checked' : ''} />
    <label for="ui.showStatusBar">Show Status Bar</label>
  </div>
  <div class="field">
    <input id="ui.previewEnabled" type="checkbox" aria-label="Preview before insert" ${settings['ui.previewEnabled'] ? 'checked' : ''} />
    <label for="ui.previewEnabled">Preview Before Insert</label>
  </div>
  <div class="field">
    <input id="ui.audioFeedback" type="checkbox" aria-label="Audio feedback" ${settings['ui.audioFeedback'] ? 'checked' : ''} />
    <label for="ui.audioFeedback">Audio Feedback</label>
  </div>

  <h2>History</h2>
  <div class="field">
    <input id="history.enabled" type="checkbox" aria-label="Enable history" ${settings['history.enabled'] ? 'checked' : ''} />
    <label for="history.enabled">Enable History</label>
  </div>
  <div class="field">
    <label for="history.maxItems">Max Items</label>
    <input id="history.maxItems" type="number" aria-label="Maximum history items" value="${settings['history.maxItems'] ?? 50}" />
  </div>
  <div class="field">
    <button id="btn-clear-history" aria-label="Clear History">Clear History</button>
  </div>

  <h2>Keyboard Shortcuts</h2>
  <div class="field">
    <button id="btn-keyboard-shortcuts" aria-label="Open Keyboard Shortcuts">Open Keyboard Shortcuts</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Text/number inputs: update on change
    document.querySelectorAll('input[type="text"], input[type="number"], select').forEach(el => {
      el.addEventListener('change', () => {
        const key = el.id;
        let value = el.type === 'number' ? Number(el.value) : el.value;
        vscode.postMessage({ type: 'updateSetting', key, value });
      });
    });

    // Checkbox inputs
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      el.addEventListener('change', () => {
        vscode.postMessage({ type: 'updateSetting', key: el.id, value: el.checked });
      });
    });

    // Buttons
    document.getElementById('btn-save-api-key').addEventListener('click', () => {
      const key = document.getElementById('apiKey').value;
      if (key) {
        vscode.postMessage({ type: 'setApiKey', value: key });
        document.getElementById('apiKey').value = '';
        document.getElementById('apiKey').placeholder = 'Key saved securely';
      }
    });

    document.getElementById('btn-delete-api-key').addEventListener('click', () => {
      vscode.postMessage({ type: 'deleteApiKey' });
      document.getElementById('apiKey').placeholder = 'Key deleted';
    });

    document.getElementById('btn-test-connection').addEventListener('click', () => {
      vscode.postMessage({ type: 'testConnection' });
      document.getElementById('connection-result').textContent = 'Testing...';
      document.getElementById('connection-result').className = 'result';
    });

    document.getElementById('btn-clear-history').addEventListener('click', () => {
      vscode.postMessage({ type: 'clearHistory' });
    });

    document.getElementById('btn-keyboard-shortcuts').addEventListener('click', () => {
      vscode.postMessage({ type: 'openKeyboardShortcuts' });
    });

    // Listen for messages from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'connectionResult') {
        const el = document.getElementById('connection-result');
        if (msg.success) {
          el.textContent = 'Connected';
          el.className = 'result success';
        } else {
          el.textContent = 'Failed' + (msg.error ? ': ' + msg.error : '');
          el.className = 'result error';
        }
      }
    });
  </script>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
