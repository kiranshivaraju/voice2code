/**
 * SettingsWindow unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

jest.mock('@core/config/endpoint-validator', () => ({
  testEndpointConnectivity: jest.fn(),
}));

const mockGetDevices = jest.fn();

import { BrowserWindow, ipcMain } from 'electron';
import { SettingsWindow } from '../../src/settings-window';
import { testEndpointConnectivity } from '@core/config/endpoint-validator';
import { ConfigurationError } from '@core/types';

const mockBrowserWindow = BrowserWindow as unknown as jest.Mock;
const mockIpcMain = ipcMain as unknown as { handle: jest.Mock; removeHandler: jest.Mock };
const mockTestConnectivity = testEndpointConnectivity as unknown as jest.Mock;

function createMockStores() {
  const configStore = {
    getAll: jest.fn().mockReturnValue({
      endpoint: { url: 'http://localhost:8000/v1/audio/transcriptions', model: 'whisper-large-v3', timeout: 30000, language: 'en' },
      audio: { sampleRate: 16000, format: 'mp3' },
      ui: { showNotifications: true },
    }),
    getEndpointConfig: jest.fn().mockReturnValue({
      url: 'http://localhost:8000/v1/audio/transcriptions',
      model: 'whisper-large-v3',
      timeout: 30000,
      language: 'en',
    }),
    save: jest.fn(),
  };

  const secretStore = {
    getApiKeyMasked: jest.fn().mockReturnValue(null),
    setApiKey: jest.fn(),
    deleteApiKey: jest.fn(),
  };

  return { configStore, secretStore };
}

// Helper to get registered IPC handler by channel name
function getIPCHandler(channel: string): Function | undefined {
  const calls = mockIpcMain.handle.mock.calls;
  const found = calls.find((call: any[]) => call[0] === channel);
  return found ? found[1] : undefined;
}

describe('SettingsWindow', () => {
  let settingsWindow: SettingsWindow;
  let mocks: ReturnType<typeof createMockStores>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockStores();
    const mockDeviceManager = { getDevices: mockGetDevices };
    settingsWindow = new SettingsWindow(mocks.configStore as any, mocks.secretStore as any, mockDeviceManager as any);
  });

  describe('constructor', () => {
    it('should register all 6 IPC handlers', () => {
      const channels = mockIpcMain.handle.mock.calls.map((c: any[]) => c[0]);
      expect(channels).toContain('settings:get');
      expect(channels).toContain('settings:save');
      expect(channels).toContain('settings:get-api-key');
      expect(channels).toContain('settings:set-api-key');
      expect(channels).toContain('settings:delete-api-key');
      expect(channels).toContain('settings:test-connection');
    });
  });

  describe('show', () => {
    it('should create BrowserWindow with correct options', () => {
      settingsWindow.show();

      expect(mockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 520,
          height: 600,
          resizable: false,
          minimizable: false,
          maximizable: false,
          show: false,
          webPreferences: expect.objectContaining({
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          }),
        })
      );
    });

    it('should focus existing window instead of creating duplicate', () => {
      settingsWindow.show();
      const firstWindow = mockBrowserWindow.mock.results[0].value;
      firstWindow.isDestroyed.mockReturnValue(false);

      mockBrowserWindow.mockClear();
      settingsWindow.show();

      expect(mockBrowserWindow).not.toHaveBeenCalled();
      expect(firstWindow.focus).toHaveBeenCalled();
    });

    it('should create new window if previous was destroyed', () => {
      settingsWindow.show();
      const firstWindow = mockBrowserWindow.mock.results[0].value;
      firstWindow.isDestroyed.mockReturnValue(true);

      mockBrowserWindow.mockClear();
      settingsWindow.show();

      expect(mockBrowserWindow).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close window if open', () => {
      settingsWindow.show();
      const win = mockBrowserWindow.mock.results[0].value;
      win.isDestroyed.mockReturnValue(false);

      settingsWindow.close();
      expect(win.close).toHaveBeenCalled();
    });

    it('should not throw when no window exists', () => {
      expect(() => settingsWindow.close()).not.toThrow();
    });
  });

  describe('isOpen', () => {
    it('should return false initially', () => {
      expect(settingsWindow.isOpen()).toBe(false);
    });

    it('should return true after show', () => {
      settingsWindow.show();
      const win = mockBrowserWindow.mock.results[0].value;
      win.isDestroyed.mockReturnValue(false);
      expect(settingsWindow.isOpen()).toBe(true);
    });

    it('should return false if window destroyed', () => {
      settingsWindow.show();
      const win = mockBrowserWindow.mock.results[0].value;
      win.isDestroyed.mockReturnValue(true);
      expect(settingsWindow.isOpen()).toBe(false);
    });
  });

  describe('IPC: settings:get', () => {
    it('should return full config', async () => {
      const handler = getIPCHandler('settings:get')!;
      const result = await handler({});
      expect(result).toEqual(mocks.configStore.getAll());
    });
  });

  describe('IPC: settings:save', () => {
    it('should save valid config and return success', async () => {
      const handler = getIPCHandler('settings:save')!;
      const config = { endpoint: { url: 'http://localhost:9000/api' } };
      const result = await handler({}, config);
      expect(result).toEqual({ success: true });
      expect(mocks.configStore.save).toHaveBeenCalledWith(config);
    });

    it('should reject non-object config', async () => {
      const handler = getIPCHandler('settings:save')!;
      const result = await handler({}, 'not-an-object');
      expect(result).toEqual({ success: false, error: 'Invalid configuration data' });
    });

    it('should reject null config', async () => {
      const handler = getIPCHandler('settings:save')!;
      const result = await handler({}, null);
      expect(result).toEqual({ success: false, error: 'Invalid configuration data' });
    });

    it('should return error when configStore.save throws', async () => {
      mocks.configStore.save.mockImplementation(() => {
        throw new ConfigurationError('Invalid endpoint URL');
      });
      const handler = getIPCHandler('settings:save')!;
      const result = await handler({}, { endpoint: { url: 'ftp://bad' } });
      expect(result).toEqual({ success: false, error: 'Invalid endpoint URL' });
    });
  });

  describe('IPC: settings:get-api-key', () => {
    it('should return masked API key', async () => {
      mocks.secretStore.getApiKeyMasked.mockReturnValue('********3xyz');
      const handler = getIPCHandler('settings:get-api-key')!;
      const result = await handler({});
      expect(result).toBe('********3xyz');
    });

    it('should return null when no key stored', async () => {
      const handler = getIPCHandler('settings:get-api-key')!;
      const result = await handler({});
      expect(result).toBeNull();
    });
  });

  describe('IPC: settings:set-api-key', () => {
    it('should store API key and return success', async () => {
      const handler = getIPCHandler('settings:set-api-key')!;
      const result = await handler({}, { apiKey: 'sk-test-key' });
      expect(result).toEqual({ success: true });
      expect(mocks.secretStore.setApiKey).toHaveBeenCalledWith('sk-test-key');
    });

    it('should return error when setApiKey throws', async () => {
      mocks.secretStore.setApiKey.mockImplementation(() => {
        throw new ConfigurationError('API key cannot be empty');
      });
      const handler = getIPCHandler('settings:set-api-key')!;
      const result = await handler({}, { apiKey: '' });
      expect(result).toEqual({ success: false, error: 'API key cannot be empty' });
    });
  });

  describe('IPC: settings:delete-api-key', () => {
    it('should delete API key and return success', async () => {
      const handler = getIPCHandler('settings:delete-api-key')!;
      const result = await handler({});
      expect(result).toEqual({ success: true });
      expect(mocks.secretStore.deleteApiKey).toHaveBeenCalled();
    });
  });

  describe('IPC: settings:test-connection', () => {
    it('should return latency on successful connection', async () => {
      mockTestConnectivity.mockResolvedValue(true);
      const handler = getIPCHandler('settings:test-connection')!;
      const result = await handler({});
      expect(result.success).toBe(true);
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should return error when connection fails', async () => {
      mockTestConnectivity.mockResolvedValue(false);
      const handler = getIPCHandler('settings:test-connection')!;
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when testEndpointConnectivity throws', async () => {
      mockTestConnectivity.mockRejectedValue(new Error('ECONNREFUSED'));
      const handler = getIPCHandler('settings:test-connection')!;
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('settings:get-devices', () => {
    it('should return devices from DeviceManager', async () => {
      const devices = [
        { id: 'default', name: 'System Default', isDefault: true },
        { id: 'usb-1', name: 'USB Mic', isDefault: false },
      ];
      mockGetDevices.mockResolvedValue(devices);
      const handler = getIPCHandler('settings:get-devices')!;
      const result = await handler({});
      expect(result).toEqual(devices);
    });

    it('should return fallback on DeviceManager error', async () => {
      mockGetDevices.mockRejectedValue(new Error('No devices'));
      const handler = getIPCHandler('settings:get-devices')!;
      const result = await handler({});
      expect(result).toEqual([{ id: 'default', name: 'System Default', isDefault: true }]);
    });

    it('should register settings:get-devices handler', () => {
      expect(getIPCHandler('settings:get-devices')).toBeDefined();
    });
  });
});
