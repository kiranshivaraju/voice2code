import { Voice2CodeEngine } from '../../../src/core/engine';
import { ConfigurationManager } from '../../../src/config/configuration-manager';
import { AudioConfiguration, EndpointConfiguration } from '../../../src/types';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    activeTextEditor: {
      edit: jest.fn(),
    },
  },
  commands: {
    executeCommand: jest.fn(),
  },
  StatusBarAlignment: {
    Left: 1,
  },
}));

// Mock dependencies
class MockConfigurationManager {
  getAudioConfig(): AudioConfiguration {
    return {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3' as const,
    };
  }

  getEndpointConfig(): EndpointConfiguration {
    return {
      url: 'http://localhost:11434',
      model: 'whisper',
      timeout: 30000,
      language: 'en',
    };
  }
}

class MockAudioManager {
  startCapture = jest.fn();
  stopCapture = jest.fn().mockResolvedValue(Buffer.from('audio data'));
  isCapturing = jest.fn().mockReturnValue(false);
}

class MockTranscriptionService {
  transcribe = jest.fn().mockResolvedValue({ text: 'transcribed text' });
  testConnection = jest.fn().mockResolvedValue(true);
}

class MockEditorService {
  insertText = jest.fn().mockResolvedValue(true);
  getActiveEditor = jest.fn().mockReturnValue({});
}

class MockStatusBarController {
  updateStatus = jest.fn();
  show = jest.fn();
  hide = jest.fn();
}

describe('Voice2CodeEngine', () => {
  let engine: Voice2CodeEngine;
  let mockContext: vscode.ExtensionContext;
  let mockConfigManager: MockConfigurationManager;
  let mockAudioManager: MockAudioManager;
  let mockTranscriptionService: MockTranscriptionService;
  let mockEditorService: MockEditorService;
  let mockStatusBar: MockStatusBarController;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock context
    mockContext = {} as vscode.ExtensionContext;

    // Create mock services
    mockConfigManager = new MockConfigurationManager();
    mockAudioManager = new MockAudioManager();
    mockTranscriptionService = new MockTranscriptionService();
    mockEditorService = new MockEditorService();
    mockStatusBar = new MockStatusBarController();

    // Create engine instance
    engine = new Voice2CodeEngine(
      mockContext,
      mockConfigManager as unknown as ConfigurationManager,
      mockAudioManager as any,
      mockTranscriptionService as any,
      mockEditorService as any,
      mockStatusBar as any
    );
  });

  describe('constructor', () => {
    it('should initialize with idle state', () => {
      expect(engine.isRecording).toBe(false);
    });
  });

  describe('isRecording getter', () => {
    it('should return false when state is idle', () => {
      expect(engine.isRecording).toBe(false);
    });
  });

  describe('startRecording', () => {
    it('should start recording when state is idle', async () => {
      await engine.startRecording();

      expect(mockStatusBar.updateStatus).toHaveBeenCalledWith('Recording...', 'recording');
      expect(mockAudioManager.startCapture).toHaveBeenCalledWith({
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      });
      expect(engine.isRecording).toBe(true);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Recording started');
    });

    it('should do nothing if already recording', async () => {
      await engine.startRecording();
      jest.clearAllMocks();

      await engine.startRecording();

      expect(mockAudioManager.startCapture).not.toHaveBeenCalled();
    });

    it('should do nothing if processing', async () => {
      await engine.startRecording();
      const stopPromise = engine.stopRecording();

      // Try to start while processing
      await engine.startRecording();

      expect(mockAudioManager.startCapture).toHaveBeenCalledTimes(1);

      await stopPromise;
    });
  });

  describe('stopRecording', () => {
    beforeEach(async () => {
      await engine.startRecording();
      jest.clearAllMocks();
    });

    it('should complete full transcription workflow', async () => {
      await engine.stopRecording();

      // Verify workflow steps
      expect(mockStatusBar.updateStatus).toHaveBeenNthCalledWith(1, 'Transcribing...', 'processing');
      expect(mockAudioManager.stopCapture).toHaveBeenCalled();
      expect(mockTranscriptionService.transcribe).toHaveBeenCalledWith(
        expect.any(Buffer),
        {}
      );
      expect(mockEditorService.insertText).toHaveBeenCalledWith('transcribed text');
      expect(mockStatusBar.updateStatus).toHaveBeenNthCalledWith(2, 'Inserted', 'idle');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Text inserted');
      expect(engine.isRecording).toBe(false);
    });

    it('should do nothing if not recording', async () => {
      // Stop again when already idle
      await engine.stopRecording();
      jest.clearAllMocks();

      await engine.stopRecording();

      expect(mockAudioManager.stopCapture).not.toHaveBeenCalled();
    });

    it('should handle transcription errors gracefully', async () => {
      const error = new Error('Transcription failed');
      mockTranscriptionService.transcribe.mockRejectedValue(error);

      await engine.stopRecording();

      expect(mockStatusBar.updateStatus).toHaveBeenCalledWith('Error', 'idle');
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Transcription failed: Transcription failed'
      );
      expect(engine.isRecording).toBe(false);
    });

    it('should handle audio capture errors gracefully', async () => {
      const error = new Error('Audio capture failed');
      mockAudioManager.stopCapture.mockRejectedValue(error);

      await engine.stopRecording();

      expect(mockStatusBar.updateStatus).toHaveBeenCalledWith('Error', 'idle');
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Transcription failed: Audio capture failed'
      );
      expect(engine.isRecording).toBe(false);
    });

    it('should handle editor insertion errors gracefully', async () => {
      const error = new Error('Insert failed');
      mockEditorService.insertText.mockRejectedValue(error);

      await engine.stopRecording();

      expect(mockStatusBar.updateStatus).toHaveBeenCalledWith('Error', 'idle');
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Transcription failed: Insert failed'
      );
      expect(engine.isRecording).toBe(false);
    });
  });

  describe('toggleRecording', () => {
    it('should start recording when idle', async () => {
      await engine.toggleRecording();

      expect(mockAudioManager.startCapture).toHaveBeenCalled();
      expect(engine.isRecording).toBe(true);
    });

    it('should stop recording when recording', async () => {
      await engine.startRecording();
      jest.clearAllMocks();

      await engine.toggleRecording();

      expect(mockAudioManager.stopCapture).toHaveBeenCalled();
      expect(engine.isRecording).toBe(false);
    });

    it('should show warning when processing', async () => {
      // Mock transcribe to take some time
      let resolveTranscribe: (value: any) => void;
      const transcribePromise = new Promise(resolve => {
        resolveTranscribe = resolve;
      });
      mockTranscriptionService.transcribe.mockReturnValue(transcribePromise);

      await engine.startRecording();
      const stopPromise = engine.stopRecording();

      // Give a moment for state to change to processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Try to toggle while processing
      await engine.toggleRecording();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Already processing');

      // Resolve the transcription
      resolveTranscribe!({ text: 'test' });
      await stopPromise;
    });
  });

  describe('testConnection', () => {
    it('should test connection and return true on success', async () => {
      const result = await engine.testConnection();

      expect(mockTranscriptionService.testConnection).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Connection test successful');
    });

    it('should test connection and return false on failure', async () => {
      mockTranscriptionService.testConnection.mockResolvedValue(false);

      const result = await engine.testConnection();

      expect(mockTranscriptionService.testConnection).toHaveBeenCalled();
      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Connection test failed');
    });

    it('should handle connection test errors', async () => {
      mockTranscriptionService.testConnection.mockRejectedValue(new Error('Network error'));

      const result = await engine.testConnection();

      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Connection test failed: Network error'
      );
    });
  });

  describe('openSettings', () => {
    it('should execute VS Code settings command', () => {
      engine.openSettings();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openSettings',
        'voice2code'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty transcription text', async () => {
      mockTranscriptionService.transcribe.mockResolvedValue({ text: '' });
      await engine.startRecording();
      jest.clearAllMocks();

      await engine.stopRecording();

      expect(mockEditorService.insertText).toHaveBeenCalledWith('');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Text inserted');
    });

    it('should handle very long transcription text', async () => {
      const longText = 'a'.repeat(10000);
      mockTranscriptionService.transcribe.mockResolvedValue({ text: longText });
      await engine.startRecording();
      jest.clearAllMocks();

      await engine.stopRecording();

      expect(mockEditorService.insertText).toHaveBeenCalledWith(longText);
    });

    it('should handle null audio buffer', async () => {
      mockAudioManager.stopCapture.mockResolvedValue(null);
      await engine.startRecording();
      jest.clearAllMocks();

      await engine.stopRecording();

      expect(mockStatusBar.updateStatus).toHaveBeenCalledWith('Error', 'idle');
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    it('should transition idle -> recording -> processing -> idle', async () => {
      expect(engine.isRecording).toBe(false);

      await engine.startRecording();
      expect(engine.isRecording).toBe(true);

      const stopPromise = engine.stopRecording();
      // During processing, isRecording should be false

      await stopPromise;
      expect(engine.isRecording).toBe(false);
    });

    it('should maintain idle state on start error', async () => {
      mockAudioManager.startCapture.mockImplementation(() => {
        throw new Error('Start failed');
      });

      await expect(engine.startRecording()).rejects.toThrow('Start failed');
      expect(engine.isRecording).toBe(false);
    });
  });
});
