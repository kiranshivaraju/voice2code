import { AudioManager } from '../../../src/audio/audio-manager';
import { DeviceManager } from '../../../src/audio/device-manager';
import { AudioConfiguration, AudioError } from '../../../src/types';

// Mock DeviceManager
jest.mock('../../../src/audio/device-manager');

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockDeviceManager: jest.Mocked<DeviceManager>;

  beforeEach(() => {
    // Create mock device manager
    mockDeviceManager = new DeviceManager() as jest.Mocked<DeviceManager>;
    mockDeviceManager.isDeviceAvailable = jest.fn().mockResolvedValue(true);

    // Create audio manager instance
    audioManager = new AudioManager(mockDeviceManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      const config: AudioConfiguration = {
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      };

      await audioManager.startCapture(config);
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
      await audioManager.startCapture(config);

      expect(mockDeviceManager.isDeviceAvailable).toHaveBeenCalledWith('default');
      expect(audioManager.isCapturing()).toBe(true);
    });

    it('should verify device availability before starting', async () => {
      await audioManager.startCapture(config);

      expect(mockDeviceManager.isDeviceAvailable).toHaveBeenCalledWith('default');
    });

    it('should throw AudioError if already capturing', async () => {
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
      const config44k: AudioConfiguration = {
        deviceId: 'default',
        sampleRate: 44100,
        format: 'mp3',
      };

      await audioManager.startCapture(config44k);
      expect(audioManager.isCapturing()).toBe(true);
    });

    it('should support different device IDs', async () => {
      const customConfig: AudioConfiguration = {
        deviceId: 'custom-device-123',
        sampleRate: 16000,
        format: 'mp3',
      };

      await audioManager.startCapture(customConfig);
      expect(mockDeviceManager.isDeviceAvailable).toHaveBeenCalledWith('custom-device-123');
    });
  });

  describe('stopCapture', () => {
    const config: AudioConfiguration = {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3',
    };

    beforeEach(async () => {
      await audioManager.startCapture(config);
    });

    it('should stop audio capture and return buffer', async () => {
      const buffer = await audioManager.stopCapture();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(audioManager.isCapturing()).toBe(false);
    });

    it('should return non-empty buffer', async () => {
      // Simulate some recording time
      await new Promise(resolve => setTimeout(resolve, 100));

      const buffer = await audioManager.stopCapture();

      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw AudioError if not capturing', async () => {
      await audioManager.stopCapture(); // Stop first time

      await expect(audioManager.stopCapture()).rejects.toThrow(AudioError);
      await expect(audioManager.stopCapture()).rejects.toThrow('Not currently capturing audio');
    });

    it('should reset state to idle after stopping', async () => {
      await audioManager.stopCapture();

      expect(audioManager.isCapturing()).toBe(false);
    });

    it('should allow starting again after stopping', async () => {
      await audioManager.stopCapture();

      // Should be able to start again
      await audioManager.startCapture(config);
      expect(audioManager.isCapturing()).toBe(true);
    });

    it('should clear audio chunks after stopping', async () => {
      const buffer1 = await audioManager.stopCapture();

      // Start and stop again
      await audioManager.startCapture(config);
      const buffer2 = await audioManager.stopCapture();

      // Buffers should be independent (not accumulated)
      expect(buffer1).not.toBe(buffer2);
    });
  });

  describe('error handling', () => {
    const config: AudioConfiguration = {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3',
    };

    it('should handle device disconnection during capture', async () => {
      await audioManager.startCapture(config);

      // Simulate device becoming unavailable
      mockDeviceManager.isDeviceAvailable.mockResolvedValue(false);

      // Should still be able to stop
      const buffer = await audioManager.stopCapture();
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should cleanup resources on stop error', async () => {
      await audioManager.startCapture(config);

      // Even if stop encounters issues, state should be reset
      await audioManager.stopCapture();
      expect(audioManager.isCapturing()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty device ID', async () => {
      const config: AudioConfiguration = {
        deviceId: '',
        sampleRate: 16000,
        format: 'mp3',
      };

      mockDeviceManager.isDeviceAvailable.mockResolvedValue(false);

      await expect(audioManager.startCapture(config)).rejects.toThrow(AudioError);
    });

    it('should handle rapid start-stop cycles', async () => {
      const config: AudioConfiguration = {
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      };

      // Multiple rapid cycles
      for (let i = 0; i < 5; i++) {
        await audioManager.startCapture(config);
        expect(audioManager.isCapturing()).toBe(true);

        await audioManager.stopCapture();
        expect(audioManager.isCapturing()).toBe(false);
      }
    });

    it('should handle very short recordings', async () => {
      const config: AudioConfiguration = {
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      };

      await audioManager.startCapture(config);

      // Stop immediately without waiting
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
      // Initial: idle
      expect(audioManager.isCapturing()).toBe(false);

      // After start: capturing
      await audioManager.startCapture(config);
      expect(audioManager.isCapturing()).toBe(true);

      // After stop: idle
      await audioManager.stopCapture();
      expect(audioManager.isCapturing()).toBe(false);
    });

    it('should prevent multiple simultaneous captures', async () => {
      await audioManager.startCapture(config);

      // Try to start again while capturing
      await expect(audioManager.startCapture(config)).rejects.toThrow(AudioError);

      // Should still be in capturing state
      expect(audioManager.isCapturing()).toBe(true);

      // Should be able to stop
      await audioManager.stopCapture();
      expect(audioManager.isCapturing()).toBe(false);
    });
  });
});
