/**
 * HotkeyManager unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

import { globalShortcut } from 'electron';
import { HotkeyManager } from '../../src/hotkey';

const mockGlobalShortcut = globalShortcut as unknown as {
  register: jest.Mock;
  unregister: jest.Mock;
  unregisterAll: jest.Mock;
  isRegistered: jest.Mock;
};

describe('HotkeyManager', () => {
  let hotkeyManager: HotkeyManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalShortcut.register.mockReturnValue(true);
    mockGlobalShortcut.isRegistered.mockReturnValue(false);
    hotkeyManager = new HotkeyManager();
  });

  afterEach(() => {
    hotkeyManager.unregister();
  });

  describe('register', () => {
    it('should register shortcut successfully and return true', () => {
      const callback = jest.fn();
      const result = hotkeyManager.register(callback);

      expect(result).toBe(true);
      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+V',
        callback
      );
    });

    it('should return false when globalShortcut.register fails', () => {
      mockGlobalShortcut.register.mockReturnValue(false);
      const callback = jest.fn();

      const result = hotkeyManager.register(callback);

      expect(result).toBe(false);
    });

    it('should use custom accelerator when provided', () => {
      const custom = new HotkeyManager('CommandOrControl+Shift+R');
      const callback = jest.fn();
      custom.register(callback);

      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+R',
        callback
      );
      custom.unregister();
    });

    it('should unregister old shortcut before re-registering', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      hotkeyManager.register(callback1);
      hotkeyManager.register(callback2);

      expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith(
        'CommandOrControl+Shift+V'
      );
    });
  });

  describe('unregister', () => {
    it('should unregister shortcut when registered', () => {
      hotkeyManager.register(jest.fn());
      jest.clearAllMocks();

      hotkeyManager.unregister();

      expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith(
        'CommandOrControl+Shift+V'
      );
    });

    it('should not throw when unregistering without prior registration', () => {
      expect(() => hotkeyManager.unregister()).not.toThrow();
    });
  });

  describe('isRegistered', () => {
    it('should return false initially', () => {
      expect(hotkeyManager.isRegistered()).toBe(false);
    });

    it('should return true after successful registration', () => {
      hotkeyManager.register(jest.fn());
      expect(hotkeyManager.isRegistered()).toBe(true);
    });

    it('should return false after unregister', () => {
      hotkeyManager.register(jest.fn());
      hotkeyManager.unregister();
      expect(hotkeyManager.isRegistered()).toBe(false);
    });

    it('should return false when registration fails', () => {
      mockGlobalShortcut.register.mockReturnValue(false);
      hotkeyManager.register(jest.fn());
      expect(hotkeyManager.isRegistered()).toBe(false);
    });
  });
});
