import { AudioManager } from '../../../src/audio/audio-manager';
import { DeviceManager } from '../../../src/audio/device-manager';
import { AudioConfiguration, AudioError } from '../../../src/types';
import { Readable } from 'stream';

// Mock DeviceManager
jest.mock('../../../src/audio/device-manager');

// Mock node-record-lpcm16
jest.mock('node-record-lpcm16');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const record = require('node-record-lpcm16');

function createMockRecording(): {
  recording: { stream: jest.Mock; stop: jest.Mock };
  mockStream: Readable;
} {
  const mockStream = new Readable({ read() {} });

  const recording = {
    stream: jest.fn().mockReturnValue(mockStream),
    stop: jest.fn(),
  };
  return { recording, mockStream };
}

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockDeviceManager: jest.Mocked<DeviceManager>;

  beforeEach(() => {
    // Create mock device manager
    mockDeviceManager = new DeviceManager() as jest.Mocked<DeviceManager>;
    mockDeviceManager.isDeviceAvailable = jest.fn().mockResolvedValue(true);

    // Create audio manager instance
    audioManager = new AudioManager(mockDeviceManager);

    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with idle state', () => {
      expect(audioManager.isCapturing()).toBe(false);
    });
  });

  describe('isCapturing', () => {
    it('should return false when idle', () => {
      expect(audioManager.isCapturing()).toBe(false);
    });

    it('should return true when capturing', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture({
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      });
      expect(audioManager.isCapturing()).toBe(true);
    });
  });

  describe('startCapture', () => {
    const config: AudioConfiguration = {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3',
    };

    it('should start audio capture successfully', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      expect(mockDeviceManager.isDeviceAvailable).toHaveBeenCalledWith('default');
      expect(audioManager.isCapturing()).toBe(true);
    });

    it('should call record.record() with correct sampleRate', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      expect(record.record).toHaveBeenCalledWith(
        expect.objectContaining({ sampleRate: 16000 })
      );
    });

    it('should call record.record() with channels: 1', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      expect(record.record).toHaveBeenCalledWith(
        expect.objectContaining({ channels: 1 })
      );
    });

    it('should call record.record() with device: null when deviceId is default', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      expect(record.record).toHaveBeenCalledWith(
        expect.objectContaining({ device: null })
      );
    });

    it('should pass actual deviceId when not default', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture({
        deviceId: 'hw:1,0',
        sampleRate: 16000,
        format: 'mp3',
      });

      expect(record.record).toHaveBeenCalledWith(
        expect.objectContaining({ device: 'hw:1,0' })
      );
    });

    it('should call record.record() with audioType raw', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      expect(record.record).toHaveBeenCalledWith(
        expect.objectContaining({ audioType: 'raw' })
      );
    });

    it('should verify device availability before starting', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      expect(mockDeviceManager.isDeviceAvailable).toHaveBeenCalledWith('default');
    });

    it('should throw AudioError if already capturing', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      await expect(audioManager.startCapture(config)).rejects.toThrow(AudioError);
      await expect(audioManager.startCapture(config)).rejects.toThrow('Already capturing audio');
    });

    it('should throw AudioError if device not available', async () => {
      mockDeviceManager.isDeviceAvailable.mockResolvedValue(false);

      await expect(audioManager.startCapture(config)).rejects.toThrow(AudioError);
      await expect(audioManager.startCapture(config)).rejects.toThrow('Device not available');
    });

    it('should support different sample rates', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture({
        deviceId: 'default',
        sampleRate: 44100,
        format: 'mp3',
      });

      expect(record.record).toHaveBeenCalledWith(
        expect.objectContaining({ sampleRate: 44100 })
      );
      expect(audioManager.isCapturing()).toBe(true);
    });

    it('should emit deviceFallback event when device unavailable', async () => {
      mockDeviceManager.isDeviceAvailable
        .mockResolvedValueOnce(false)  // first call: custom device unavailable
        .mockResolvedValueOnce(true);  // second call: default is available

      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      const fallbackHandler = jest.fn();
      audioManager.on('deviceFallback', fallbackHandler);

      await audioManager.startCapture({
        deviceId: 'custom-broken-device',
        sampleRate: 16000,
        format: 'mp3',
      });

      expect(fallbackHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          originalId: 'custom-broken-device',
        })
      );
      expect(audioManager.isCapturing()).toBe(true);
    });
  });

  describe('stopCapture', () => {
    const config: AudioConfiguration = {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3',
    };

    it('should call recording.stop() and return accumulated buffer', async () => {
      const { recording, mockStream } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);

      // Push some data and let the event loop deliver it
      mockStream.push(Buffer.from([0x01, 0x02, 0x03]));
      mockStream.push(Buffer.from([0x04, 0x05]));
      await new Promise(resolve => setImmediate(resolve));

      const buffer = await audioManager.stopCapture();

      expect(recording.stop).toHaveBeenCalled();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(5);
      expect(buffer).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]));
    });

    it('should return empty buffer when no data received', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      const buffer = await audioManager.stopCapture();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(0);
    });

    it('should reset state to idle after stopping', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      await audioManager.stopCapture();

      expect(audioManager.isCapturing()).toBe(false);
    });

    it('should throw AudioError if not capturing', async () => {
      await expect(audioManager.stopCapture()).rejects.toThrow(AudioError);
      await expect(audioManager.stopCapture()).rejects.toThrow('Not currently capturing audio');
    });

    it('should allow starting again after stopping', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      await audioManager.stopCapture();

      const { recording: recording2 } = createMockRecording();
      record.record.mockReturnValue(recording2);

      await audioManager.startCapture(config);
      expect(audioManager.isCapturing()).toBe(true);
    });

    it('should clear audio chunks after stopping', async () => {
      const { recording, mockStream } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      mockStream.push(Buffer.from([0x01, 0x02, 0x03]));
      await new Promise(resolve => setImmediate(resolve));
      const buffer1 = await audioManager.stopCapture();

      // Start and stop again — should not contain previous data
      const { recording: recording2 } = createMockRecording();
      record.record.mockReturnValue(recording2);

      await audioManager.startCapture(config);
      const buffer2 = await audioManager.stopCapture();

      expect(buffer1.length).toBe(3);
      expect(buffer2.length).toBe(0);
    });
  });

  describe('error handling', () => {
    const config: AudioConfiguration = {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3',
    };

    it('should propagate recorder stream error to AudioManager error event', async () => {
      const { recording, mockStream } = createMockRecording();
      record.record.mockReturnValue(recording);

      const errorHandler = jest.fn();
      audioManager.on('error', errorHandler);

      await audioManager.startCapture(config);

      // Simulate stream error
      const testError = new Error('Microphone disconnected');
      mockStream.destroy(testError);

      // Give event loop a tick
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(errorHandler).toHaveBeenCalledWith(testError);
    });

    it('should handle device disconnection during capture', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      mockDeviceManager.isDeviceAvailable.mockResolvedValue(false);

      const buffer = await audioManager.stopCapture();
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should cleanup resources on stop error', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      await audioManager.stopCapture();
      expect(audioManager.isCapturing()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty device ID', async () => {
      mockDeviceManager.isDeviceAvailable.mockResolvedValue(false);

      await expect(
        audioManager.startCapture({
          deviceId: '',
          sampleRate: 16000,
          format: 'mp3',
        })
      ).rejects.toThrow(AudioError);
    });

    it('should handle rapid start-stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const { recording } = createMockRecording();
        record.record.mockReturnValue(recording);

        await audioManager.startCapture({
          deviceId: 'default',
          sampleRate: 16000,
          format: 'mp3',
        });
        expect(audioManager.isCapturing()).toBe(true);

        await audioManager.stopCapture();
        expect(audioManager.isCapturing()).toBe(false);
      }
    });

    it('should handle very short recordings', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture({
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      });

      const buffer = await audioManager.stopCapture();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(audioManager.isCapturing()).toBe(false);
    });
  });

  describe('state management', () => {
    const config: AudioConfiguration = {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3',
    };

    it('should maintain correct state through lifecycle', async () => {
      expect(audioManager.isCapturing()).toBe(false);

      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      expect(audioManager.isCapturing()).toBe(true);

      await audioManager.stopCapture();
      expect(audioManager.isCapturing()).toBe(false);
    });

    it('should prevent multiple simultaneous captures', async () => {
      const { recording } = createMockRecording();
      record.record.mockReturnValue(recording);

      await audioManager.startCapture(config);
      await expect(audioManager.startCapture(config)).rejects.toThrow(AudioError);
      expect(audioManager.isCapturing()).toBe(true);

      await audioManager.stopCapture();
      expect(audioManager.isCapturing()).toBe(false);
    });
  });
});
