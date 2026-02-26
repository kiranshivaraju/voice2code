/**
 * DesktopEngine unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

jest.mock('../../src/paste', () => ({
  pasteText: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/command-executor', () => ({
  CommandExecutor: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

import { DesktopEngine } from '../../src/desktop-engine';
import { pasteText } from '../../src/paste';
import { NetworkError, AudioError, STTError, ConfigurationError } from '@core/types';

const mockPasteText = pasteText as unknown as jest.Mock;

function createMocks() {
  const configStore = {
    getEndpointConfig: jest.fn().mockReturnValue({
      url: 'http://localhost:8000/v1/audio/transcriptions',
      model: 'whisper-large-v3',
      timeout: 30000,
      language: 'en',
    }),
    getAudioConfig: jest.fn().mockReturnValue({
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3',
    }),
    getUIConfig: jest.fn().mockReturnValue({
      showNotifications: true,
      voiceCommandsEnabled: false,
      customCommands: {},
    }),
  };

  const secretStore = {
    getApiKey: jest.fn().mockReturnValue(null),
  };

  const audioManager = {
    startCapture: jest.fn().mockResolvedValue(undefined),
    stopCapture: jest.fn().mockResolvedValue(Buffer.from('pcm-data')),
  };

  const audioEncoder = {
    encode: jest.fn().mockResolvedValue(Buffer.from('encoded-data')),
  };

  const mockAdapter = {
    transcribe: jest.fn().mockResolvedValue({ text: 'hello world' }),
  };

  const adapterFactory = {
    createAdapter: jest.fn().mockReturnValue(mockAdapter),
  };

  const trayManager = {
    setState: jest.fn(),
  };

  const notify = jest.fn();

  return { configStore, secretStore, audioManager, audioEncoder, adapterFactory, mockAdapter, trayManager, notify };
}

describe('DesktopEngine', () => {
  let engine: DesktopEngine;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMocks();
    engine = new DesktopEngine(
      mocks.configStore as any,
      mocks.secretStore as any,
      mocks.audioManager as any,
      mocks.audioEncoder as any,
      mocks.trayManager as any,
      mocks.notify,
      mocks.adapterFactory as any
    );
  });

  describe('state transitions', () => {
    it('should start in idle state', () => {
      expect(engine.getState()).toBe('idle');
    });

    it('should transition idle → recording on toggleRecording', async () => {
      await engine.toggleRecording();
      expect(engine.getState()).toBe('recording');
    });

    it('should transition recording → processing → idle on toggle', async () => {
      await engine.toggleRecording(); // idle → recording
      await engine.toggleRecording(); // recording → processing → idle
      expect(engine.getState()).toBe('idle');
    });

    it('should ignore toggle during processing state', async () => {
      await engine.toggleRecording(); // idle → recording

      // Make transcription hang
      mocks.mockAdapter.transcribe.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      const stopPromise = engine.toggleRecording(); // recording → processing

      // Engine is now processing
      expect(engine.getState()).toBe('processing');

      // Toggle during processing should be a no-op
      await engine.toggleRecording();
      expect(engine.getState()).toBe('processing');
    });
  });

  describe('startRecording', () => {
    it('should call audioManager.startCapture with audio config', async () => {
      await engine.toggleRecording();

      expect(mocks.audioManager.startCapture).toHaveBeenCalledWith({
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      });
    });

    it('should update tray to recording state', async () => {
      await engine.toggleRecording();
      expect(mocks.trayManager.setState).toHaveBeenCalledWith('recording');
    });

    it('should not start if not idle', async () => {
      await engine.toggleRecording(); // now recording
      mocks.audioManager.startCapture.mockClear();

      await engine.startRecording();
      expect(mocks.audioManager.startCapture).not.toHaveBeenCalled();
    });
  });

  describe('stopRecording - full pipeline', () => {
    beforeEach(async () => {
      await engine.toggleRecording(); // idle → recording
    });

    it('should call audioManager.stopCapture', async () => {
      await engine.toggleRecording(); // recording → processing → idle
      expect(mocks.audioManager.stopCapture).toHaveBeenCalled();
    });

    it('should encode audio with correct format', async () => {
      await engine.toggleRecording();
      expect(mocks.audioEncoder.encode).toHaveBeenCalledWith(
        Buffer.from('pcm-data'),
        'mp3'
      );
    });

    it('should create adapter with url and apiKey', async () => {
      mocks.secretStore.getApiKey.mockReturnValue('sk-test');
      await engine.toggleRecording();
      expect(mocks.adapterFactory.createAdapter).toHaveBeenCalledWith(
        'http://localhost:8000/v1/audio/transcriptions',
        'sk-test'
      );
    });

    it('should pass undefined apiKey when none stored', async () => {
      mocks.secretStore.getApiKey.mockReturnValue(null);
      await engine.toggleRecording();
      expect(mocks.adapterFactory.createAdapter).toHaveBeenCalledWith(
        'http://localhost:8000/v1/audio/transcriptions',
        undefined
      );
    });

    it('should transcribe with model and language', async () => {
      await engine.toggleRecording();
      expect(mocks.mockAdapter.transcribe).toHaveBeenCalledWith(
        Buffer.from('encoded-data'),
        { model: 'whisper-large-v3', language: 'en' }
      );
    });

    it('should paste transcription result', async () => {
      await engine.toggleRecording();
      expect(mockPasteText).toHaveBeenCalledWith('hello world');
    });

    it('should update tray to processing then idle', async () => {
      mocks.trayManager.setState.mockClear();
      await engine.toggleRecording();

      const calls = mocks.trayManager.setState.mock.calls.map((c: any) => c[0]);
      expect(calls).toContain('processing');
      expect(calls[calls.length - 1]).toBe('idle');
    });

    it('should return to idle state after success', async () => {
      await engine.toggleRecording();
      expect(engine.getState()).toBe('idle');
    });
  });

  describe('error notifications', () => {
    beforeEach(async () => {
      await engine.toggleRecording(); // idle → recording
    });

    it('should notify on ECONNREFUSED', async () => {
      mocks.audioManager.stopCapture.mockRejectedValue(
        new NetworkError('ECONNREFUSED')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith(
        'Connection Failed',
        'Cannot connect to STT endpoint. Is your service running?'
      );
    });

    it('should notify on ETIMEDOUT', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new NetworkError('Connection timed out')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith(
        'Connection Timed Out',
        'STT endpoint took too long. Try increasing the timeout.'
      );
    });

    it('should notify on 401 auth failure', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new NetworkError('Authentication failed: 401')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith(
        'Authentication Failed',
        'Check your API key in Settings.'
      );
    });

    it('should notify on STTError 404', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new STTError('Model not found: 404')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith(
        'Model Not Found',
        'Check the model name in Settings.'
      );
    });

    it('should notify on STTError 429 rate limit', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new STTError('Rate limit exceeded: 429')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith(
        'Rate Limited',
        'Too many requests. Wait a moment and try again.'
      );
    });

    it('should notify on AudioError', async () => {
      mocks.audioManager.stopCapture.mockRejectedValue(
        new AudioError('Microphone not found')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith(
        'Recording Failed',
        'Microphone not found'
      );
    });

    it('should notify on ConfigurationError', async () => {
      mocks.adapterFactory.createAdapter.mockImplementation(() => {
        throw new ConfigurationError('Invalid endpoint URL');
      });
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith('Error', 'Invalid endpoint URL');
    });

    it('should notify generic message on unknown error', async () => {
      mocks.audioManager.stopCapture.mockRejectedValue(new Error('something weird'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Check console for details.'
      );
      consoleSpy.mockRestore();
    });

    it('should return to idle state after any error', async () => {
      mocks.audioManager.stopCapture.mockRejectedValue(new AudioError('fail'));
      await engine.toggleRecording();
      expect(engine.getState()).toBe('idle');
    });

    it('should notify on startRecording AudioError', async () => {
      // Reset to idle first
      mocks.audioManager.stopCapture.mockResolvedValue(Buffer.from(''));
      await engine.toggleRecording(); // stop current

      // Now try start with error
      mocks.audioManager.startCapture.mockRejectedValue(
        new AudioError('Mic unavailable')
      );
      await engine.toggleRecording(); // idle → recording (fails)

      expect(mocks.notify).toHaveBeenCalledWith('Recording Failed', 'Mic unavailable');
      expect(engine.getState()).toBe('idle');
    });

    it('should notify on generic NetworkError', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new NetworkError('Some other network issue')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith('Network Error', 'Some other network issue');
    });

    it('should notify on generic STTError', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new STTError('Internal server error')
      );
      await engine.toggleRecording();
      expect(mocks.notify).toHaveBeenCalledWith('Transcription Error', 'Internal server error');
    });
  });

  describe('voice commands integration', () => {
    it('should use pasteText when voice commands disabled', async () => {
      mocks.configStore.getUIConfig.mockReturnValue({
        showNotifications: true,
        voiceCommandsEnabled: false,
        customCommands: {},
      });
      await engine.startRecording();
      await engine.stopRecording();
      expect(mockPasteText).toHaveBeenCalledWith('hello world');
    });

    it('should use CommandParser+Executor when voice commands enabled', async () => {
      mocks.configStore.getUIConfig.mockReturnValue({
        showNotifications: true,
        voiceCommandsEnabled: true,
        customCommands: {},
      });
      const mockExecutor = { execute: jest.fn() };
      const engineWithCommands = new DesktopEngine(
        mocks.configStore as any,
        mocks.secretStore as any,
        mocks.audioManager as any,
        mocks.audioEncoder as any,
        mocks.trayManager as any,
        mocks.notify,
        mocks.adapterFactory as any,
        mockExecutor as any
      );
      await engineWithCommands.startRecording();
      await engineWithCommands.stopRecording();
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockPasteText).not.toHaveBeenCalled();
    });

    it('should pass custom commands to CommandParser when enabled', async () => {
      const customCommands = { 'fix this': 'fix' };
      mocks.configStore.getUIConfig.mockReturnValue({
        showNotifications: true,
        voiceCommandsEnabled: true,
        customCommands,
      });
      const mockExecutor = { execute: jest.fn() };
      const engineWithCommands = new DesktopEngine(
        mocks.configStore as any,
        mocks.secretStore as any,
        mocks.audioManager as any,
        mocks.audioEncoder as any,
        mocks.trayManager as any,
        mocks.notify,
        mocks.adapterFactory as any,
        mockExecutor as any
      );
      await engineWithCommands.startRecording();
      await engineWithCommands.stopRecording();
      expect(mockExecutor.execute).toHaveBeenCalled();
    });
  });
});
