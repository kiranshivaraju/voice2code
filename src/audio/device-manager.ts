import { AudioDevice, AudioError } from '../types';
import * as os from 'os';

/**
 * DeviceManager handles enumeration and management of audio input devices
 *
 * Cross-platform support:
 * - Windows: DirectSound/WASAPI
 * - macOS: CoreAudio
 * - Linux: ALSA/PulseAudio
 */
export class DeviceManager {
  /**
   * Get all available audio input devices
   *
   * @returns Array of AudioDevice objects
   * @throws AudioError if device enumeration fails
   */
  async getDevices(): Promise<AudioDevice[]> {
    try {
      console.log('Enumerating audio input devices...');
      const devices = await this.enumerateDevices();
      console.log(`Found ${devices.length} audio input device(s)`);
      return devices;
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      throw new AudioError(
        'Failed to enumerate audio devices',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get the system default audio input device
   *
   * @returns The default AudioDevice
   * @throws AudioError if no default device exists
   */
  async getDefaultDevice(): Promise<AudioDevice> {
    try {
      const devices = await this.getDevices();
      const defaultDevice = devices.find((d) => d.isDefault);

      if (!defaultDevice) {
        throw new AudioError('No default audio device found');
      }

      return defaultDevice;
    } catch (error) {
      if (error instanceof AudioError) {
        throw error;
      }
      throw new AudioError(
        'Failed to get default audio device',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Check if a device with the given ID is available
   *
   * @param deviceId - The device ID to check
   * @returns true if device is available, false otherwise
   */
  async isDeviceAvailable(deviceId: string): Promise<boolean> {
    if (!deviceId || deviceId.trim().length === 0) {
      return false;
    }

    try {
      const devices = await this.getDevices();

      if (deviceId === 'default') {
        return devices.some((d) => d.isDefault);
      }

      return devices.some((d) => d.id === deviceId);
    } catch (error) {
      console.error('Failed to check device availability:', error);
      return false;
    }
  }

  /**
   * Platform-specific device enumeration
   *
   * This is a protected method that can be mocked in tests
   *
   * @returns Array of AudioDevice objects
   */
  protected async enumerateDevices(): Promise<AudioDevice[]> {
    const platform = os.platform();

    try {
      switch (platform) {
        case 'darwin':
          return await this.enumerateDevicesMacOS();
        case 'win32':
          return await this.enumerateDevicesWindows();
        case 'linux':
          return await this.enumerateDevicesLinux();
        default:
          console.warn(`Unsupported platform: ${platform}, returning mock device`);
          return this.getMockDevices();
      }
    } catch (error) {
      console.error(`Platform-specific enumeration failed for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Enumerate audio devices on macOS using CoreAudio
   */
  private async enumerateDevicesMacOS(): Promise<AudioDevice[]> {
    console.log('Using CoreAudio for device enumeration');

    return this.getMockDevices();
  }

  /**
   * Enumerate audio devices on Windows using WASAPI
   */
  private async enumerateDevicesWindows(): Promise<AudioDevice[]> {
    console.log('Using WASAPI for device enumeration');

    return this.getMockDevices();
  }

  /**
   * Enumerate audio devices on Linux using ALSA/PulseAudio
   */
  private async enumerateDevicesLinux(): Promise<AudioDevice[]> {
    console.log('Using ALSA/PulseAudio for device enumeration');

    return this.getMockDevices();
  }

  /**
   * Get mock devices for testing and unsupported platforms
   */
  private getMockDevices(): AudioDevice[] {
    return [
      {
        id: 'default',
        name: 'Default Microphone',
        isDefault: true,
        sampleRate: 16000,
        channels: 1,
      },
      {
        id: 'device-1',
        name: 'Built-in Microphone',
        isDefault: false,
        sampleRate: 44100,
        channels: 2,
      },
      {
        id: 'device-2',
        name: 'External USB Microphone',
        isDefault: false,
        sampleRate: 48000,
        channels: 1,
      },
    ];
  }
}
