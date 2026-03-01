/**
 * Integration tests for the desktop recording flow.
 * Tests the full component chain: DesktopEngine → AudioManager → AudioEncoder
 * → AdapterFactory → STTAdapter → pasteText.
 *
 * External dependencies are mocked at the boundary (audio capture, STT API, clipboard).
 * Internal component wiring is exercised for real.
 */

jest.mock('../../src/paste', () => ({
  pasteText: jest.fn().mockResolvedValue(undefined),
}));

import { DesktopEngine } from '../../src/desktop-engine';
import { pasteText } from '../../src/paste';
import { NetworkError, AudioError, STTError } from '@core/types';

const mockPasteText = pasteText as unknown as jest.Mock;

function createIntegrationMocks() {
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
    getApiKey: jest.fn().mockReturnValue('sk-test-key-123'),
  };

  const audioManager = {
    startCapture: jest.fn().mockResolvedValue(undefined),
    stopCapture: jest.fn().mockResolvedValue(Buffer.from('raw-pcm-audio-data')),
    on: jest.fn().mockReturnThis(),
    removeAllListeners: jest.fn().mockReturnThis(),
  };

  const audioEncoder = {
    encode: jest.fn().mockResolvedValue(Buffer.from('encoded-mp3-data')),
  };

  const mockAdapter = {
    transcribe: jest.fn().mockResolvedValue({ text: 'hello world from speech' }),
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

describe('Recording Flow Integration', () => {
  let engine: DesktopEngine;
  let mocks: ReturnType<typeof createIntegrationMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createIntegrationMocks();
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

  describe('happy path: complete recording → transcription → paste', () => {
    it('should execute the full pipeline from idle through recording to paste', async () => {
      // Step 1: Start recording (idle → recording)
      await engine.toggleRecording();
      expect(engine.getState()).toBe('recording');

      // Step 2: Stop recording (recording → processing → idle)
      await engine.toggleRecording();
      expect(engine.getState()).toBe('idle');

      // Verify full chain was exercised:
      // 1. audioManager.startCapture called with config
      expect(mocks.audioManager.startCapture).toHaveBeenCalledWith({
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      });

      // 2. audioManager.stopCapture returned PCM buffer
      expect(mocks.audioManager.stopCapture).toHaveBeenCalled();

      // 3. audioEncoder.encode called with PCM buffer and format
      expect(mocks.audioEncoder.encode).toHaveBeenCalledWith(
        Buffer.from('raw-pcm-audio-data'),
        'mp3'
      );

      // 4. adapter created with correct URL and API key
      expect(mocks.adapterFactory.createAdapter).toHaveBeenCalledWith(
        'http://localhost:8000/v1/audio/transcriptions',
        'sk-test-key-123'
      );

      // 5. adapter.transcribe called with encoded buffer and options
      expect(mocks.mockAdapter.transcribe).toHaveBeenCalledWith(
        Buffer.from('encoded-mp3-data'),
        { model: 'whisper-large-v3', language: 'en' }
      );

      // 6. pasteText called with transcription result
      expect(mockPasteText).toHaveBeenCalledWith('hello world from speech');
    });

    it('should transition tray states: idle → recording → processing → idle', async () => {
      await engine.toggleRecording(); // idle → recording
      await engine.toggleRecording(); // recording → processing → idle

      const trayStates = mocks.trayManager.setState.mock.calls.map((c: any) => c[0]);
      expect(trayStates).toEqual(['recording', 'processing', 'idle']);
    });

    it('should not show any notifications on success', async () => {
      await engine.toggleRecording();
      await engine.toggleRecording();
      expect(mocks.notify).not.toHaveBeenCalled();
    });
  });

  describe('network error during transcription', () => {
    it('should notify and return to idle when STT endpoint is unreachable', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new NetworkError('ECONNREFUSED: connect failed')
      );

      await engine.toggleRecording(); // idle → recording
      await engine.toggleRecording(); // recording → processing (fails) → idle

      // Engine returns to idle
      expect(engine.getState()).toBe('idle');

      // Notification shown
      expect(mocks.notify).toHaveBeenCalledWith(
        'Connection Failed',
        'Cannot connect to STT endpoint. Is your service running?'
      );

      // Tray returns to idle
      const trayStates = mocks.trayManager.setState.mock.calls.map((c: any) => c[0]);
      expect(trayStates[trayStates.length - 1]).toBe('idle');

      // pasteText NOT called
      expect(mockPasteText).not.toHaveBeenCalled();
    });

    it('should notify on timeout error', async () => {
      mocks.mockAdapter.transcribe.mockRejectedValue(
        new NetworkError('Connection timed out after 30000ms')
      );

      await engine.toggleRecording();
      await engine.toggleRecording();

      expect(engine.getState()).toBe('idle');
      expect(mocks.notify).toHaveBeenCalledWith(
        'Connection Timed Out',
        'STT endpoint took too long. Try increasing the timeout.'
      );
    });
  });

  describe('audio error during recording', () => {
    it('should notify and return to idle when microphone fails on start', async () => {
      mocks.audioManager.startCapture.mockRejectedValue(
        new AudioError('Microphone access denied')
      );

      await engine.toggleRecording(); // idle → recording (fails) → idle

      // Engine returns to idle immediately
      expect(engine.getState()).toBe('idle');

      // Notification shown
      expect(mocks.notify).toHaveBeenCalledWith(
        'Recording Failed',
        'Microphone access denied'
      );

      // Tray returns to idle
      const trayStates = mocks.trayManager.setState.mock.calls.map((c: any) => c[0]);
      expect(trayStates).toEqual(['recording', 'idle']);
    });

    it('should notify and return to idle when stopCapture fails', async () => {
      mocks.audioManager.stopCapture.mockRejectedValue(
        new AudioError('Audio device disconnected')
      );

      await engine.toggleRecording(); // start recording
      await engine.toggleRecording(); // stop recording (fails)

      expect(engine.getState()).toBe('idle');
      expect(mocks.notify).toHaveBeenCalledWith(
        'Recording Failed',
        'Audio device disconnected'
      );
    });
  });

  describe('double toggle during processing', () => {
    it('should ignore toggle while transcription is in progress', async () => {
      // Make transcription hang
      mocks.mockAdapter.transcribe.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      await engine.toggleRecording(); // idle → recording
      engine.toggleRecording(); // recording → processing (hangs)

      // Wait a tick for state to transition to processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(engine.getState()).toBe('processing');

      // Second toggle should be ignored
      await engine.toggleRecording();
      expect(engine.getState()).toBe('processing');

      // No extra audio operations
      expect(mocks.audioManager.startCapture).toHaveBeenCalledTimes(1);
      expect(mocks.audioManager.stopCapture).toHaveBeenCalledTimes(1);
    });
  });

  describe('config integration', () => {
    it('should read and pass correct endpoint config through the chain', async () => {
      mocks.configStore.getEndpointConfig.mockReturnValue({
        url: 'https://api.groq.com/openai/v1/audio/transcriptions',
        model: 'distil-whisper-large-v3-en',
        timeout: 15000,
        language: 'es',
      });

      await engine.toggleRecording();
      await engine.toggleRecording();

      expect(mocks.adapterFactory.createAdapter).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        'sk-test-key-123'
      );
      expect(mocks.mockAdapter.transcribe).toHaveBeenCalledWith(
        expect.any(Buffer),
        { model: 'distil-whisper-large-v3-en', language: 'es' }
      );
    });

    it('should read and pass correct audio config through the chain', async () => {
      mocks.configStore.getAudioConfig.mockReturnValue({
        deviceId: 'mic-2',
        sampleRate: 44100,
        format: 'wav',
      });

      await engine.toggleRecording();
      await engine.toggleRecording();

      expect(mocks.audioManager.startCapture).toHaveBeenCalledWith({
        deviceId: 'mic-2',
        sampleRate: 44100,
        format: 'wav',
      });
      expect(mocks.audioEncoder.encode).toHaveBeenCalledWith(
        expect.any(Buffer),
        'wav'
      );
    });

    it('should pass undefined apiKey when no key stored', async () => {
      mocks.secretStore.getApiKey.mockReturnValue(null);

      await engine.toggleRecording();
      await engine.toggleRecording();

      expect(mocks.adapterFactory.createAdapter).toHaveBeenCalledWith(
        'http://localhost:8000/v1/audio/transcriptions',
        undefined
      );
    });
  });

  describe('error recovery', () => {
    it('should allow a new recording after a failed one', async () => {
      // First attempt fails
      mocks.audioManager.startCapture.mockRejectedValueOnce(
        new AudioError('Temporary mic failure')
      );

      await engine.toggleRecording(); // fails, back to idle
      expect(engine.getState()).toBe('idle');

      // Second attempt succeeds
      mocks.audioManager.startCapture.mockResolvedValueOnce(undefined);

      await engine.toggleRecording(); // idle → recording
      expect(engine.getState()).toBe('recording');

      await engine.toggleRecording(); // recording → processing → idle
      expect(engine.getState()).toBe('idle');

      // Second attempt completed the full pipeline
      expect(mockPasteText).toHaveBeenCalledWith('hello world from speech');
    });
  });
});
