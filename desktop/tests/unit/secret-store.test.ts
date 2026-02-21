/**
 * SecretStore unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

// Mock electron-store before importing SecretStore
const mockStore = new Map<string, unknown>();

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key: string) => mockStore.get(key),
    set: (key: string, value: unknown) => {
      mockStore.set(key, value);
    },
    has: (key: string) => mockStore.has(key),
    delete: (key: string) => mockStore.delete(key),
    clear: () => mockStore.clear(),
  }));
});

import Store from 'electron-store';
import { safeStorage } from 'electron';
import { SecretStore } from '../../src/secret-store';
import { ConfigurationError } from '@core/types';

describe('SecretStore', () => {
  let secretStore: SecretStore;
  let store: Store;

  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
    (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(true);
    store = new Store();
    secretStore = new SecretStore(store);
  });

  describe('setApiKey + getApiKey', () => {
    it('should store and retrieve an API key', () => {
      secretStore.setApiKey('sk-test-abc123');
      const result = secretStore.getApiKey();
      expect(result).toBe('sk-test-abc123');
    });

    it('should trim whitespace before encrypting', () => {
      secretStore.setApiKey('  sk-trimmed  ');
      const result = secretStore.getApiKey();
      expect(result).toBe('sk-trimmed');
    });

    it('should overwrite existing key with new one', () => {
      secretStore.setApiKey('old-key');
      secretStore.setApiKey('new-key');
      expect(secretStore.getApiKey()).toBe('new-key');
    });
  });

  describe('getApiKey', () => {
    it('should return null when no key stored', () => {
      expect(secretStore.getApiKey()).toBeNull();
    });

    it('should return null and delete on decryption failure', () => {
      // Store corrupt data directly
      mockStore.set('_encryptedApiKey', 'corrupt-not-real-base64');
      (safeStorage.decryptString as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      const result = secretStore.getApiKey();
      expect(result).toBeNull();
      expect(mockStore.has('_encryptedApiKey')).toBe(false);
    });
  });

  describe('setApiKey - validation', () => {
    it('should reject empty API key', () => {
      expect(() => secretStore.setApiKey('')).toThrow(ConfigurationError);
      expect(() => secretStore.setApiKey('')).toThrow('API key cannot be empty');
    });

    it('should reject whitespace-only API key', () => {
      expect(() => secretStore.setApiKey('   ')).toThrow(ConfigurationError);
      expect(() => secretStore.setApiKey('   ')).toThrow('API key cannot be empty');
    });

    it('should throw when safeStorage is unavailable', () => {
      (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(false);
      expect(() => secretStore.setApiKey('sk-valid')).toThrow(ConfigurationError);
      expect(() => secretStore.setApiKey('sk-valid')).toThrow(
        'Secure storage is not available. Cannot store API key.'
      );
    });
  });

  describe('deleteApiKey', () => {
    it('should delete stored key', () => {
      secretStore.setApiKey('sk-to-delete');
      expect(secretStore.hasApiKey()).toBe(true);
      secretStore.deleteApiKey();
      expect(secretStore.hasApiKey()).toBe(false);
      expect(secretStore.getApiKey()).toBeNull();
    });

    it('should not throw when deleting non-existent key', () => {
      expect(() => secretStore.deleteApiKey()).not.toThrow();
    });
  });

  describe('hasApiKey', () => {
    it('should return false when no key stored', () => {
      expect(secretStore.hasApiKey()).toBe(false);
    });

    it('should return true when key is stored', () => {
      secretStore.setApiKey('sk-exists');
      expect(secretStore.hasApiKey()).toBe(true);
    });
  });

  describe('getApiKeyMasked', () => {
    it('should return null when no key stored', () => {
      expect(secretStore.getApiKeyMasked()).toBeNull();
    });

    it('should mask long key showing last 4 chars', () => {
      secretStore.setApiKey('sk-abc123xyz');
      const masked = secretStore.getApiKeyMasked();
      expect(masked).toBe('********3xyz');
    });

    it('should mask short key (4 chars or less) as ****', () => {
      secretStore.setApiKey('abcd');
      expect(secretStore.getApiKeyMasked()).toBe('****');
    });

    it('should mask 5-char key showing last 4', () => {
      secretStore.setApiKey('abcde');
      expect(secretStore.getApiKeyMasked()).toBe('*bcde');
    });
  });
});
