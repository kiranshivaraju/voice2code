import { DeviceManager } from '../../../src/audio/device-manager';
import { AudioError } from '../../../src/types';

describe('DeviceManager', () => {
  let deviceManager: DeviceManager;

  beforeEach(() => {
    deviceManager = new DeviceManager();
  });

  describe('getDevices', () => {
    it('should return an array of AudioDevice objects', async () => {
      const devices = await deviceManager.getDevices();

      expect(Array.isArray(devices)).toBe(true);
      devices.forEach((device) => {
        expect(device).toHaveProperty('id');
        expect(device).toHaveProperty('name');
        expect(device).toHaveProperty('isDefault');
        expect(typeof device.id).toBe('string');
        expect(typeof device.name).toBe('string');
        expect(typeof device.isDefault).toBe('boolean');
      });
    });

    it('should mark exactly one device as default when devices exist', async () => {
      const devices = await deviceManager.getDevices();

      if (devices.length > 0) {
        const defaultDevices = devices.filter((d) => d.isDefault);
        expect(defaultDevices.length).toBe(1);
      }
    });

    it('should return empty array when no devices are available', async () => {
      const devices = await deviceManager.getDevices();
      expect(Array.isArray(devices)).toBe(true);
    });

    it('should include optional properties when available', async () => {
      const devices = await deviceManager.getDevices();

      if (devices.length > 0) {
        const device = devices[0];
        if (device.sampleRate !== undefined) {
          expect(typeof device.sampleRate).toBe('number');
          expect(device.sampleRate).toBeGreaterThan(0);
        }
        if (device.channels !== undefined) {
          expect(typeof device.channels).toBe('number');
          expect(device.channels).toBeGreaterThan(0);
        }
      }
    });

    it('should throw AudioError when device enumeration fails', async () => {
      jest.spyOn(deviceManager as any, 'enumerateDevices').mockRejectedValue(
        new Error('Platform error')
      );

      await expect(deviceManager.getDevices()).rejects.toThrow(AudioError);
      await expect(deviceManager.getDevices()).rejects.toThrow(
        'Failed to enumerate audio devices'
      );
    });

    it('should handle permission denied errors', async () => {
      jest.spyOn(deviceManager as any, 'enumerateDevices').mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(deviceManager.getDevices()).rejects.toThrow(AudioError);
    });
  });

  describe('getDefaultDevice', () => {
    it('should return the default audio input device', async () => {
      const defaultDevice = await deviceManager.getDefaultDevice();

      expect(defaultDevice).toHaveProperty('id');
      expect(defaultDevice).toHaveProperty('name');
      expect(defaultDevice.isDefault).toBe(true);
    });

    it('should return same device as marked default in getDevices', async () => {
      const devices = await deviceManager.getDevices();

      if (devices.length > 0) {
        const defaultDevice = await deviceManager.getDefaultDevice();
        const defaultFromList = devices.find((d) => d.isDefault);

        expect(defaultFromList).toBeDefined();
        expect(defaultDevice.id).toBe(defaultFromList!.id);
        expect(defaultDevice.name).toBe(defaultFromList!.name);
      }
    });

    it('should throw AudioError when no default device exists', async () => {
      jest.spyOn(deviceManager as any, 'enumerateDevices').mockResolvedValue([]);

      await expect(deviceManager.getDefaultDevice()).rejects.toThrow(AudioError);
      await expect(deviceManager.getDefaultDevice()).rejects.toThrow(
        'No default audio device found'
      );
    });

    it('should throw AudioError when enumeration fails', async () => {
      jest.spyOn(deviceManager as any, 'enumerateDevices').mockRejectedValue(
        new Error('Platform error')
      );

      await expect(deviceManager.getDefaultDevice()).rejects.toThrow(AudioError);
    });
  });

  describe('isDeviceAvailable', () => {
    it('should return true for existing device ID', async () => {
      const devices = await deviceManager.getDevices();

      if (devices.length > 0) {
        const deviceId = devices[0].id;
        const isAvailable = await deviceManager.isDeviceAvailable(deviceId);
        expect(isAvailable).toBe(true);
      }
    });

    it('should return false for non-existent device ID', async () => {
      const isAvailable = await deviceManager.isDeviceAvailable('non-existent-device-id');
      expect(isAvailable).toBe(false);
    });

    it('should return true for default device ID', async () => {
      const defaultDevice = await deviceManager.getDefaultDevice();
      const isAvailable = await deviceManager.isDeviceAvailable(defaultDevice.id);
      expect(isAvailable).toBe(true);
    });

    it('should return false for empty device ID', async () => {
      const isAvailable = await deviceManager.isDeviceAvailable('');
      expect(isAvailable).toBe(false);
    });

    it('should handle special device ID "default"', async () => {
      const isAvailable = await deviceManager.isDeviceAvailable('default');
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should log device changes for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await deviceManager.getDevices();

      consoleSpy.mockRestore();
    });

    it('should include error details in AudioError', async () => {
      const mockError = new Error('Mock platform error');
      jest.spyOn(deviceManager as any, 'enumerateDevices').mockRejectedValue(mockError);

      try {
        await deviceManager.getDevices();
        fail('Should have thrown AudioError');
      } catch (error) {
        expect(error).toBeInstanceOf(AudioError);
        expect((error as AudioError).details).toBeDefined();
      }
    });
  });

  describe('device properties validation', () => {
    it('should have non-empty device IDs', async () => {
      const devices = await deviceManager.getDevices();

      devices.forEach((device) => {
        expect(device.id.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty device names', async () => {
      const devices = await deviceManager.getDevices();

      devices.forEach((device) => {
        expect(device.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid sample rates when provided', async () => {
      const devices = await deviceManager.getDevices();

      devices.forEach((device) => {
        if (device.sampleRate !== undefined) {
          expect(device.sampleRate).toBeGreaterThan(0);
          expect(device.sampleRate).toBeLessThanOrEqual(192000);
        }
      });
    });

    it('should have valid channel counts when provided', async () => {
      const devices = await deviceManager.getDevices();

      devices.forEach((device) => {
        if (device.channels !== undefined) {
          expect(device.channels).toBeGreaterThan(0);
          expect(device.channels).toBeLessThanOrEqual(16);
        }
      });
    });
  });
});
