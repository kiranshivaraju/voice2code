import * as vscode from 'vscode';
import { activate, deactivate } from '../../src/extension';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    createStatusBarItem: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({ get: jest.fn() }),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
}));

// Mock all service modules
jest.mock('../../src/config/configuration-manager');
jest.mock('../../src/audio/device-manager');
jest.mock('../../src/audio/audio-manager');
jest.mock('../../src/audio/audio-encoder');
jest.mock('../../src/adapters/adapter-factory');
jest.mock('../../src/core/engine');
jest.mock('../../src/core/history-manager');

import { ConfigurationManager } from '../../src/config/configuration-manager';
import { DeviceManager } from '../../src/audio/device-manager';
import { AudioManager } from '../../src/audio/audio-manager';
import { AdapterFactory } from '../../src/adapters/adapter-factory';
import { Voice2CodeEngine } from '../../src/core/engine';

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockStatusBarItem: any;
  let mockEngine: any;
  let mockDisposable: vscode.Disposable;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock disposable
    mockDisposable = {
      dispose: jest.fn(),
    };

    // Mock status bar item
    mockStatusBarItem = {
      text: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    };

    // Mock engine instance
    mockEngine = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue(undefined),
      toggleRecording: jest.fn().mockResolvedValue(undefined),
      testConnection: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    };

    // Mock vscode.window.createStatusBarItem
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);

    // Mock vscode.commands.registerCommand
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue(mockDisposable);

    // Mock vscode.commands.executeCommand
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

    // Mock Voice2CodeEngine constructor
    (Voice2CodeEngine as jest.Mock).mockImplementation(() => mockEngine);

    // Mock all service constructors
    (ConfigurationManager as unknown as jest.Mock).mockImplementation(() => ({
      getAudioConfig: jest.fn(),
      getEndpointConfig: jest.fn().mockReturnValue({ url: 'http://localhost:11434' }),
    }));
    (DeviceManager as unknown as jest.Mock).mockImplementation(() => ({}));
    (AudioManager as unknown as jest.Mock).mockImplementation(() => ({}));
    (AdapterFactory as unknown as jest.Mock).mockImplementation(() => ({
      createAdapter: jest.fn().mockReturnValue({
        transcribe: jest.fn(),
        testConnection: jest.fn(),
      }),
    }));

    // Create mock context
    mockContext = {
      subscriptions: [],
      extensionPath: '/mock/path',
      globalState: {} as any,
      workspaceState: {} as any,
      extensionUri: {} as any,
      environmentVariableCollection: {} as any,
      extensionMode: 1,
      storageUri: {} as any,
      globalStorageUri: {} as any,
      logUri: {} as any,
      asAbsolutePath: jest.fn(),
      storagePath: '/mock/storage',
      globalStoragePath: '/mock/global-storage',
      logPath: '/mock/log',
      secrets: {} as any,
      extension: {} as any,
      languageModelAccessInformation: {} as any,
    };
  });

  describe('activate', () => {
    it('should instantiate all required services', () => {
      activate(mockContext);

      expect(ConfigurationManager).toHaveBeenCalledWith(mockContext);
      expect(DeviceManager).toHaveBeenCalled();
      expect(AudioManager).toHaveBeenCalled();
      expect(AdapterFactory).toHaveBeenCalled();
    });

    it('should create Voice2CodeEngine with all dependencies', () => {
      activate(mockContext);

      expect(Voice2CodeEngine).toHaveBeenCalledWith(
        mockContext,         // context
        expect.any(Object), // configManager
        expect.any(Object), // audioManager
        expect.any(Object), // transcriptionService
        expect.any(Object), // editorService
        expect.any(Object)  // statusBar
      );
    });

    it('should register voice2code.startRecording command', () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'voice2code.startRecording',
        expect.any(Function)
      );
    });

    it('should register voice2code.stopRecording command', () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'voice2code.stopRecording',
        expect.any(Function)
      );
    });

    it('should register voice2code.toggleRecording command', () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'voice2code.toggleRecording',
        expect.any(Function)
      );
    });

    it('should register voice2code.testConnection command', () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'voice2code.testConnection',
        expect.any(Function)
      );
    });

    it('should register voice2code.openSettings command', () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'voice2code.openSettings',
        expect.any(Function)
      );
    });

    it('should register exactly 7 commands', () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(7);
    });

    it('should add all command disposables to context.subscriptions', () => {
      activate(mockContext);

      // 5 commands should be added to subscriptions
      // (StatusBarController is added internally via its own subscriptions)
      expect(mockContext.subscriptions.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle startRecording command execution', async () => {
      activate(mockContext);

      // Find the startRecording command handler
      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const startRecordingCall = registerCalls.find(call => call[0] === 'voice2code.startRecording');
      const handler = startRecordingCall[1];

      // Execute the handler
      await handler();

      expect(mockEngine.startRecording).toHaveBeenCalled();
    });

    it('should handle stopRecording command execution', async () => {
      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const stopRecordingCall = registerCalls.find(call => call[0] === 'voice2code.stopRecording');
      const handler = stopRecordingCall[1];

      await handler();

      expect(mockEngine.stopRecording).toHaveBeenCalled();
    });

    it('should handle toggleRecording command execution', async () => {
      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const toggleRecordingCall = registerCalls.find(call => call[0] === 'voice2code.toggleRecording');
      const handler = toggleRecordingCall[1];

      await handler();

      expect(mockEngine.toggleRecording).toHaveBeenCalled();
    });

    it('should handle testConnection command execution', async () => {
      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const testConnectionCall = registerCalls.find(call => call[0] === 'voice2code.testConnection');
      const handler = testConnectionCall[1];

      await handler();

      expect(mockEngine.testConnection).toHaveBeenCalled();
    });

    it('should handle openSettings command execution', async () => {
      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const openSettingsCall = registerCalls.find(call => call[0] === 'voice2code.openSettings');
      const handler = openSettingsCall[1];

      await handler();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openSettings',
        'voice2code'
      );
    });

    it('should handle startRecording command errors', async () => {
      const error = new Error('Recording failed');
      mockEngine.startRecording.mockRejectedValue(error);

      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const startRecordingCall = registerCalls.find(call => call[0] === 'voice2code.startRecording');
      const handler = startRecordingCall[1];

      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Recording failed')
      );
    });

    it('should handle stopRecording command errors', async () => {
      const error = new Error('Stop failed');
      mockEngine.stopRecording.mockRejectedValue(error);

      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const stopRecordingCall = registerCalls.find(call => call[0] === 'voice2code.stopRecording');
      const handler = stopRecordingCall[1];

      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Stop failed')
      );
    });

    it('should handle toggleRecording command errors', async () => {
      const error = new Error('Toggle failed');
      mockEngine.toggleRecording.mockRejectedValue(error);

      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const toggleRecordingCall = registerCalls.find(call => call[0] === 'voice2code.toggleRecording');
      const handler = toggleRecordingCall[1];

      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Toggle failed')
      );
    });

    it('should handle testConnection command errors', async () => {
      const error = new Error('Connection test failed');
      mockEngine.testConnection.mockRejectedValue(error);

      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const testConnectionCall = registerCalls.find(call => call[0] === 'voice2code.testConnection');
      const handler = testConnectionCall[1];

      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Connection test failed')
      );
    });

    it('should handle openSettings command errors', async () => {
      const error = new Error('Settings open failed');
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(error);

      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const openSettingsCall = registerCalls.find(call => call[0] === 'voice2code.openSettings');
      const handler = openSettingsCall[1];

      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Settings open failed')
      );
    });
  });

  describe('deactivate', () => {
    it('should be defined', () => {
      expect(deactivate).toBeDefined();
      expect(typeof deactivate).toBe('function');
    });

    it('should execute without errors', () => {
      expect(() => deactivate()).not.toThrow();
    });

    it('should dispose engine if it exists', () => {
      // Activate first to create engine
      activate(mockContext);

      // Now deactivate
      deactivate();

      // Engine dispose should be called
      expect(mockEngine.dispose).toHaveBeenCalled();
    });
  });

  describe('command handlers', () => {
    it('should call engine methods with correct context', async () => {
      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;

      // Test startRecording
      const startHandler = registerCalls.find(call => call[0] === 'voice2code.startRecording')[1];
      await startHandler();
      expect(mockEngine.startRecording).toHaveBeenCalledTimes(1);

      // Test stopRecording
      const stopHandler = registerCalls.find(call => call[0] === 'voice2code.stopRecording')[1];
      await stopHandler();
      expect(mockEngine.stopRecording).toHaveBeenCalledTimes(1);

      // Test toggleRecording
      const toggleHandler = registerCalls.find(call => call[0] === 'voice2code.toggleRecording')[1];
      await toggleHandler();
      expect(mockEngine.toggleRecording).toHaveBeenCalledTimes(1);

      // Test testConnection
      const testHandler = registerCalls.find(call => call[0] === 'voice2code.testConnection')[1];
      await testHandler();
      expect(mockEngine.testConnection).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple command executions', async () => {
      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const startHandler = registerCalls.find(call => call[0] === 'voice2code.startRecording')[1];

      // Execute multiple times
      await startHandler();
      await startHandler();
      await startHandler();

      expect(mockEngine.startRecording).toHaveBeenCalledTimes(3);
    });

    it('should show error message with original error message', async () => {
      const customError = new Error('Custom error message');
      mockEngine.startRecording.mockRejectedValue(customError);

      activate(mockContext);

      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const startHandler = registerCalls.find(call => call[0] === 'voice2code.startRecording')[1];

      await startHandler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Custom error message')
      );
    });
  });

  describe('resource cleanup', () => {
    it('should add status bar to subscriptions via context', () => {
      activate(mockContext);

      // Status bar adds itself to subscriptions in its constructor (internal implementation)
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('should ensure all disposables can be disposed', () => {
      activate(mockContext);

      // Dispose all subscriptions
      mockContext.subscriptions.forEach((disposable: vscode.Disposable) => {
        expect(() => disposable.dispose()).not.toThrow();
      });
    });
  });

  describe('integration', () => {
    it('should create a fully functional extension', () => {
      activate(mockContext);

      // Verify all components are created
      expect(ConfigurationManager).toHaveBeenCalled();
      expect(DeviceManager).toHaveBeenCalled();
      expect(AudioManager).toHaveBeenCalled();
      expect(AdapterFactory).toHaveBeenCalled();
      expect(Voice2CodeEngine).toHaveBeenCalled();

      // Verify all commands are registered
      expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(7);

      // Verify subscriptions are populated
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('should maintain proper lifecycle (activate -> use -> deactivate)', async () => {
      // Activate
      activate(mockContext);
      expect(Voice2CodeEngine).toHaveBeenCalled();

      // Use - execute a command
      const registerCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
      const startHandler = registerCalls.find(call => call[0] === 'voice2code.startRecording')[1];
      await startHandler();
      expect(mockEngine.startRecording).toHaveBeenCalled();

      // Deactivate
      deactivate();
      expect(mockEngine.dispose).toHaveBeenCalled();
    });
  });
});
