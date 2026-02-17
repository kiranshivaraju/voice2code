import { AudioDevice, AudioError } from '../types';
import * as os from 'os';
import * as childProcess from 'child_process';

/**
 * DeviceManager handles enumeration and management of audio input devices
 *
 * Cross-platform support:
 * - macOS: system_profiler SPAudioDataType (CoreAudio)
 * - Linux: arecord -l (ALSA)
 * - Windows: PowerShell Get-WmiObject Win32_SoundDevice
 *
 * Falls back to a generic "System Default" device on error or unsupported platforms.
 */
export class DeviceManager {
  /**
   * Get all available audio input devices
   *
   * @returns Array of AudioDevice objects (always non-empty; falls back to System Default)
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
   */
  protected async enumerateDevices(): Promise<AudioDevice[]> {
    const platform = os.platform();

    switch (platform) {
      case 'darwin':
        return await this.enumerateDevicesMacOS();
      case 'win32':
        return await this.enumerateDevicesWindows();
      case 'linux':
        return await this.enumerateDevicesLinux();
      default:
        console.warn(`Unsupported platform: ${platform}, returning default device`);
        return this.getFallbackDevice();
    }
  }

  /**
   * Execute a shell command and return stdout
   */
  private execCommand(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      childProcess.exec(cmd, {}, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(String(stdout));
      });
    });
  }

  /**
   * Enumerate audio devices on macOS using system_profiler
   */
  private async enumerateDevicesMacOS(): Promise<AudioDevice[]> {
    try {
      const stdout = await this.execCommand('system_profiler SPAudioDataType -json');
      const data = JSON.parse(stdout);
      const audioItems = data.SPAudioDataType;

      if (!Array.isArray(audioItems) || audioItems.length === 0) {
        return this.getFallbackDevice();
      }

      const devices: AudioDevice[] = [];

      for (const item of audioItems) {
        // Only include input devices
        if (item.coreaudio_device_input) {
          devices.push({
            id: item._name.toLowerCase().replace(/\s+/g, '-'),
            name: item._name,
            isDefault: item.coreaudio_default_audio_input_device === 'yes',
          });
        }
      }

      if (devices.length === 0) {
        return this.getFallbackDevice();
      }

      // Ensure at least one default
      if (!devices.some((d) => d.isDefault)) {
        devices[0].isDefault = true;
      }

      return devices;
    } catch (error) {
      console.warn('macOS device enumeration failed, using fallback:', error);
      return this.getFallbackDevice();
    }
  }

  /**
   * Enumerate audio devices on Linux using arecord -l
   */
  private async enumerateDevicesLinux(): Promise<AudioDevice[]> {
    try {
      const stdout = await this.execCommand('arecord -l');
      const devices: AudioDevice[] = [];

      // Parse lines like: card 0: PCH [HDA Intel PCH], device 0: ALC892 Analog [ALC892 Analog]
      const cardRegex = /^card\s+(\d+):\s+(\w+)\s+\[([^\]]+)\],\s+device\s+(\d+):\s+(.+)\[([^\]]+)\]/gm;
      let match;

      while ((match = cardRegex.exec(stdout)) !== null) {
        const cardNum = match[1];
        const cardId = match[2];
        const cardName = match[3];
        const deviceNum = match[4];

        devices.push({
          id: `hw:${cardNum},${deviceNum}`,
          name: `${cardId} [${cardName}]`,
          isDefault: false,
        });
      }

      if (devices.length === 0) {
        return this.getFallbackDevice();
      }

      // Mark first device as default
      devices[0].isDefault = true;

      return devices;
    } catch (error) {
      console.warn('Linux device enumeration failed, using fallback:', error);
      return this.getFallbackDevice();
    }
  }

  /**
   * Enumerate audio devices on Windows using PowerShell
   */
  private async enumerateDevicesWindows(): Promise<AudioDevice[]> {
    try {
      const stdout = await this.execCommand(
        'powershell -Command "Get-WmiObject Win32_SoundDevice | Select-Object Name,DeviceID | ForEach-Object { $_.Name + \'|\' + $_.DeviceID }"'
      );
      const devices: AudioDevice[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Name|DeviceID')) {
          continue; // Skip header
        }

        const parts = trimmed.split('|');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const deviceId = parts[1].trim();

          if (name && deviceId) {
            devices.push({
              id: deviceId,
              name: name,
              isDefault: false,
            });
          }
        }
      }

      if (devices.length === 0) {
        return this.getFallbackDevice();
      }

      // Mark first device as default
      devices[0].isDefault = true;

      return devices;
    } catch (error) {
      console.warn('Windows device enumeration failed, using fallback:', error);
      return this.getFallbackDevice();
    }
  }

  /**
   * Fallback device for when enumeration fails or platform is unsupported
   */
  private getFallbackDevice(): AudioDevice[] {
    return [
      {
        id: 'default',
        name: 'System Default',
        isDefault: true,
      },
    ];
  }
}
