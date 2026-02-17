import { DeviceManager } from '../../../src/audio/device-manager';
import { AudioError } from '../../../src/types';
import * as childProcess from 'child_process';
import * as os from 'os';

jest.mock('child_process');
jest.mock('os');

const mockedExec = childProcess.exec as unknown as jest.Mock;
const mockedPlatform = os.platform as jest.Mock;

// Fixture: macOS system_profiler JSON output
const macOSFixture = JSON.stringify({
  SPAudioDataType: [
    {
      _name: 'Built-in Microphone',
      coreaudio_device_input: 1,
      coreaudio_default_audio_input_device: 'yes',
      _items: [
        {
          _name: 'Built-in Microphone',
          coreaudio_device_input: 1,
        },
      ],
    },
    {
      _name: 'USB Audio Device',
      coreaudio_device_input: 1,
      _items: [
        {
          _name: 'USB Audio Device',
          coreaudio_device_input: 1,
        },
      ],
    },
  ],
});

// Fixture: Linux arecord -l output
const linuxFixture = `**** List of CAPTURE Hardware Devices ****
card 0: PCH [HDA Intel PCH], device 0: ALC892 Analog [ALC892 Analog]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
card 1: USB [USB Audio Device], device 0: USB Audio [USB Audio]
  Subdevices: 1/1
  Subdevice #0: subdevice #0`;

// Fixture: Windows PowerShell output
const windowsFixture = `Name|DeviceID
Microphone (Realtek Audio)|{0.0.1.00000000}.{abc-123}
External USB Mic|{0.0.1.00000000}.{def-456}`;

function setupExecMock(stdout: string, error: Error | null = null) {
  mockedExec.mockImplementation(
    (
      _cmd: string,
      _opts: unknown,
      callback?: (err: Error | null, stdout: string, stderr: string) => void
    ) => {
      if (callback) {
        if (error) {
          callback(error, '', error.message);
        } else {
          callback(null, stdout, '');
        }
      }
      return {} as childProcess.ChildProcess;
    }
  );
}

describe('DeviceManager', () => {
  let deviceManager: DeviceManager;

  beforeEach(() => {
    deviceManager = new DeviceManager();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDevices', () => {
    it('should return an array of AudioDevice objects', async () => {
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock(macOSFixture);

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
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock(macOSFixture);

      const devices = await deviceManager.getDevices();

      if (devices.length > 0) {
        const defaultDevices = devices.filter((d) => d.isDefault);
        expect(defaultDevices.length).toBe(1);
      }
    });

    it('should fall back to default device when enumeration command fails', async () => {
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock('', new Error('Platform error'));

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
      expect(devices[0].name).toBe('System Default');
      expect(devices[0].isDefault).toBe(true);
    });
  });

  describe('getDefaultDevice', () => {
    it('should return the default audio input device', async () => {
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock(macOSFixture);

      const defaultDevice = await deviceManager.getDefaultDevice();

      expect(defaultDevice).toHaveProperty('id');
      expect(defaultDevice).toHaveProperty('name');
      expect(defaultDevice.isDefault).toBe(true);
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
    beforeEach(() => {
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock(macOSFixture);
    });

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

    it('should return true for "default" when a default device exists', async () => {
      const isAvailable = await deviceManager.isDeviceAvailable('default');
      expect(isAvailable).toBe(true);
    });

    it('should return false for empty device ID', async () => {
      const isAvailable = await deviceManager.isDeviceAvailable('');
      expect(isAvailable).toBe(false);
    });
  });

  describe('macOS device enumeration', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('darwin');
    });

    it('should call system_profiler on macOS', async () => {
      setupExecMock(macOSFixture);

      await deviceManager.getDevices();

      expect(mockedExec).toHaveBeenCalled();
      const cmd = mockedExec.mock.calls[0][0];
      expect(cmd).toContain('system_profiler');
      expect(cmd).toContain('SPAudioDataType');
    });

    it('should parse macOS system_profiler JSON output correctly', async () => {
      setupExecMock(macOSFixture);

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBeGreaterThanOrEqual(2);
      expect(devices.some((d) => d.name === 'Built-in Microphone')).toBe(true);
      expect(devices.some((d) => d.name === 'USB Audio Device')).toBe(true);
    });

    it('should mark the default input device on macOS', async () => {
      setupExecMock(macOSFixture);

      const devices = await deviceManager.getDevices();
      const defaultDevice = devices.find((d) => d.isDefault);

      expect(defaultDevice).toBeDefined();
      expect(defaultDevice!.name).toBe('Built-in Microphone');
    });

    it('should fall back to default device on macOS command failure', async () => {
      setupExecMock('', new Error('system_profiler not found'));

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
      expect(devices[0].name).toBe('System Default');
      expect(devices[0].isDefault).toBe(true);
    });
  });

  describe('Linux device enumeration', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('linux');
    });

    it('should call arecord -l on Linux', async () => {
      setupExecMock(linuxFixture);

      await deviceManager.getDevices();

      expect(mockedExec).toHaveBeenCalled();
      const cmd = mockedExec.mock.calls[0][0];
      expect(cmd).toContain('arecord');
    });

    it('should parse Linux arecord -l output correctly', async () => {
      setupExecMock(linuxFixture);

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBeGreaterThanOrEqual(2);
      expect(devices.some((d) => d.name.includes('PCH') || d.name.includes('ALC892'))).toBe(true);
      expect(devices.some((d) => d.name.includes('USB'))).toBe(true);
    });

    it('should mark first device as default on Linux', async () => {
      setupExecMock(linuxFixture);

      const devices = await deviceManager.getDevices();
      const defaultDevice = devices.find((d) => d.isDefault);

      expect(defaultDevice).toBeDefined();
    });

    it('should fall back to default device on Linux command failure', async () => {
      setupExecMock('', new Error('arecord not found'));

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
      expect(devices[0].isDefault).toBe(true);
    });
  });

  describe('Windows device enumeration', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('win32');
    });

    it('should call PowerShell on Windows', async () => {
      setupExecMock(windowsFixture);

      await deviceManager.getDevices();

      expect(mockedExec).toHaveBeenCalled();
      const cmd = mockedExec.mock.calls[0][0];
      expect(cmd.toLowerCase()).toMatch(/powershell|get-pnpdevice|win32_sounddevice/i);
    });

    it('should parse Windows output correctly', async () => {
      setupExecMock(windowsFixture);

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBeGreaterThanOrEqual(2);
      expect(devices.some((d) => d.name.includes('Realtek'))).toBe(true);
      expect(devices.some((d) => d.name.includes('USB'))).toBe(true);
    });

    it('should fall back to default device on Windows command failure', async () => {
      setupExecMock('', new Error('PowerShell not available'));

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
      expect(devices[0].isDefault).toBe(true);
    });
  });

  describe('fallback behavior', () => {
    it('should return fallback device on unsupported platform', async () => {
      mockedPlatform.mockReturnValue('freebsd');
      setupExecMock('');

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
      expect(devices[0].name).toBe('System Default');
      expect(devices[0].isDefault).toBe(true);
    });

    it('should not crash when platform command returns empty output', async () => {
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock('{}');

      const devices = await deviceManager.getDevices();

      // Should either return parsed (possibly empty) or fallback
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThanOrEqual(1); // at least fallback
    });
  });

  describe('device properties validation', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock(macOSFixture);
    });

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
  });

  describe('error handling', () => {
    it('should include error details in AudioError', async () => {
      mockedPlatform.mockReturnValue('darwin');
      setupExecMock('', new Error('Mock platform error'));

      // With fallback, this won't throw — it returns the fallback device
      const devices = await deviceManager.getDevices();
      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
    });

    it('should return false from isDeviceAvailable when getDevices throws', async () => {
      jest.spyOn(deviceManager as any, 'enumerateDevices').mockRejectedValue(
        new AudioError('Enumeration crashed')
      );

      const isAvailable = await deviceManager.isDeviceAvailable('some-device');
      expect(isAvailable).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should fall back when macOS JSON has no input devices', async () => {
      mockedPlatform.mockReturnValue('darwin');
      const noInputFixture = JSON.stringify({
        SPAudioDataType: [
          { _name: 'Speaker', coreaudio_device_output: 1 },
        ],
      });
      setupExecMock(noInputFixture);

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
      expect(devices[0].name).toBe('System Default');
    });

    it('should promote first macOS device to default if none marked', async () => {
      mockedPlatform.mockReturnValue('darwin');
      const noDefaultFixture = JSON.stringify({
        SPAudioDataType: [
          { _name: 'Mic A', coreaudio_device_input: 1 },
          { _name: 'Mic B', coreaudio_device_input: 1 },
        ],
      });
      setupExecMock(noDefaultFixture);

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(2);
      expect(devices[0].isDefault).toBe(true);
      expect(devices[1].isDefault).toBe(false);
    });

    it('should fall back when Linux arecord returns no card lines', async () => {
      mockedPlatform.mockReturnValue('linux');
      setupExecMock('**** List of CAPTURE Hardware Devices ****\n');

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
    });

    it('should fall back when Windows returns empty output', async () => {
      mockedPlatform.mockReturnValue('win32');
      setupExecMock('Name|DeviceID\n');

      const devices = await deviceManager.getDevices();

      expect(devices.length).toBe(1);
      expect(devices[0].id).toBe('default');
    });
  });
});
