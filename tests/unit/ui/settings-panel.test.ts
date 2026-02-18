import { SettingsPanelProvider } from '../../../src/ui/settings-panel';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    createWebviewPanel: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(),
  },
  ViewColumn: { One: 1 },
  Uri: {
    joinPath: jest.fn().mockReturnValue({ toString: () => 'mock-uri' }),
  },
}));

// Mock AdapterFactory
jest.mock('../../../src/adapters/adapter-factory', () => ({
  AdapterFactory: jest.fn().mockImplementation(() => ({
    createAdapter: jest.fn().mockReturnValue({
      testConnection: jest.fn().mockResolvedValue(true),
    }),
  })),
}));

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn().mockReturnValue('test-nonce-abc123');
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: mockRandomUUID },
});

describe('SettingsPanelProvider', () => {
  let provider: SettingsPanelProvider;
  let mockContext: vscode.ExtensionContext;
  let mockDeviceManager: { getDevices: jest.Mock };
  let mockHistoryManager: { clear: jest.Mock };
  let mockConfigManager: { getApiKey: jest.Mock; setApiKey: jest.Mock; deleteApiKey: jest.Mock };
  let mockPanel: any;
  let mockWebview: any;
  let messageHandler: (msg: any) => void;
  let mockConfig: { get: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockWebview = {
      html: '',
      onDidReceiveMessage: jest.fn((handler: (msg: any) => void) => {
        messageHandler = handler;
        return { dispose: jest.fn() };
      }),
      postMessage: jest.fn().mockResolvedValue(true),
    };

    mockPanel = {
      webview: mockWebview,
      reveal: jest.fn(),
      onDidDispose: jest.fn((handler: () => void) => {
        // Store dispose handler
        mockPanel._disposeHandler = handler;
        return { dispose: jest.fn() };
      }),
      dispose: jest.fn(),
      _disposeHandler: null as (() => void) | null,
    };

    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);

    mockContext = {
      extensionUri: { toString: () => 'mock-extension-uri' },
    } as unknown as vscode.ExtensionContext;

    mockDeviceManager = {
      getDevices: jest.fn().mockResolvedValue([
        { id: 'default', name: 'System Default', isDefault: true },
      ]),
    };

    mockHistoryManager = {
      clear: jest.fn().mockResolvedValue(undefined),
    };

    mockConfigManager = {
      getApiKey: jest.fn().mockResolvedValue('test-api-key'),
      setApiKey: jest.fn().mockResolvedValue(undefined),
      deleteApiKey: jest.fn().mockResolvedValue(undefined),
    };

    mockConfig = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const defaults: Record<string, unknown> = {
          'endpoint.url': 'http://localhost:11434/api/generate',
          'endpoint.model': 'whisper-large-v3',
          'endpoint.language': 'en',
          'endpoint.timeout': 30000,
          'audio.deviceId': 'default',
          'audio.sampleRate': 16000,
          'audio.format': 'mp3',
          'ui.showStatusBar': true,
          'ui.previewEnabled': true,
          'ui.audioFeedback': true,
          'history.enabled': false,
          'history.maxItems': 50,
        };
        return defaults[key] ?? defaultValue;
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    provider = new SettingsPanelProvider(
      mockContext,
      mockDeviceManager as any,
      mockHistoryManager as any,
      mockConfigManager as any
    );
  });

  describe('openOrReveal', () => {
    it('should call createWebviewPanel on first call', async () => {
      await provider.openOrReveal();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'voice2code.settings',
        'Voice2Code Settings',
        vscode.ViewColumn.One,
        expect.objectContaining({ enableScripts: true })
      );
    });

    it('should call panel.reveal() on subsequent calls', async () => {
      await provider.openOrReveal();
      jest.clearAllMocks();

      await provider.openOrReveal();

      expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
      expect(mockPanel.reveal).toHaveBeenCalled();
    });

    it('should create new panel after previous panel is disposed', async () => {
      await provider.openOrReveal();

      // Simulate panel dispose
      mockPanel._disposeHandler?.();
      jest.clearAllMocks();

      await provider.openOrReveal();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });
  });

  describe('buildSnapshot', () => {
    it('should return all config values', async () => {
      await provider.openOrReveal();

      // The HTML should be set, and it should contain an init message script
      // We verify through the webview html containing settings data
      const html = mockWebview.html;
      expect(html).toContain('endpoint.url');
      expect(html).toContain('endpoint.model');
      expect(html).toContain('audio.deviceId');
      expect(html).toContain('history.enabled');
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await provider.openOrReveal();
    });

    it('should update setting on updateSetting message', async () => {
      await messageHandler({ type: 'updateSetting', key: 'endpoint.url', value: 'http://new-url' });

      expect(mockConfig.update).toHaveBeenCalledWith('endpoint.url', 'http://new-url', true);
    });

    it('should test connection via adapter on testConnection message', async () => {
      await messageHandler({ type: 'testConnection' });

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'connectionResult', success: true })
      );
    });

    it('should call historyManager.clear on clearHistory message', async () => {
      await messageHandler({ type: 'clearHistory' });

      expect(mockHistoryManager.clear).toHaveBeenCalled();
    });

    it('should execute correct VS Code command on openKeyboardShortcuts message', async () => {
      await messageHandler({ type: 'openKeyboardShortcuts' });

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openGlobalKeybindings',
        'voice2code'
      );
    });
  });

  describe('CSP and security', () => {
    it('should contain nonce on script tags', async () => {
      await provider.openOrReveal();

      const html = mockWebview.html;
      expect(html).toContain('nonce="test-nonce-abc123"');
      expect(html).toMatch(/<script[^>]*nonce="test-nonce-abc123"/);
    });

    it('should NOT contain onclick attributes', async () => {
      await provider.openOrReveal();

      const html = mockWebview.html;
      expect(html).not.toMatch(/onclick\s*=/i);
    });

    it('should contain Content-Security-Policy meta tag with nonce', async () => {
      await provider.openOrReveal();

      const html = mockWebview.html;
      expect(html).toContain('Content-Security-Policy');
      expect(html).toContain("script-src 'nonce-test-nonce-abc123'");
      expect(html).toContain("style-src 'nonce-test-nonce-abc123'");
    });
  });
});
