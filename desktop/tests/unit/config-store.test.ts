/**
 * ConfigStore unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

// Mock electron-store before importing ConfigStore
const mockStore = new Map<string, unknown>();

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key: string) => mockStore.get(key),
    set: (key: string, value: unknown) => {
      mockStore.set(key, value);
    },
    get store() {
      return Object.fromEntries(mockStore);
    },
    clear: () => {
      mockStore.clear();
    },
    has: (key: string) => mockStore.has(key),
    delete: (key: string) => mockStore.delete(key),
  }));
});

import { ConfigStore, DesktopConfig, DEFAULT_CONFIG } from '../../src/config-store';
import { EndpointConfiguration, AudioConfiguration, ConfigurationError } from '@core/types';

describe('ConfigStore', () => {
  let configStore: ConfigStore;

  beforeEach(() => {
    mockStore.clear();
    configStore = new ConfigStore();
  });

  describe('getEndpointConfig', () => {
    it('should return defaults on fresh store', () => {
      const config = configStore.getEndpointConfig();
      expect(config).toEqual<EndpointConfiguration>({
        url: 'http://localhost:8000/v1/audio/transcriptions',
        model: 'whisper-large-v3',
        timeout: 30000,
        language: 'en',
      });
    });

    it('should return saved endpoint config', () => {
      configStore.save({
        endpoint: { url: 'http://localhost:9000/v1/audio/transcriptions' },
      });
      const config = configStore.getEndpointConfig();
      expect(config.url).toBe('http://localhost:9000/v1/audio/transcriptions');
    });
  });

  describe('getAudioConfig', () => {
    it('should return defaults with deviceId always "default"', () => {
      const config = configStore.getAudioConfig();
      expect(config).toEqual<AudioConfiguration>({
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      });
    });

    it('should return saved audio config', () => {
      configStore.save({ audio: { format: 'wav' } });
      const config = configStore.getAudioConfig();
      expect(config.format).toBe('wav');
      expect(config.deviceId).toBe('default');
    });
  });

  describe('getUIConfig', () => {
    it('should return default showNotifications true', () => {
      const config = configStore.getUIConfig();
      expect(config.showNotifications).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return complete default config', () => {
      const config = configStore.getAll();
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('save - endpoint validation', () => {
    it('should save valid endpoint URL', () => {
      configStore.save({ endpoint: { url: 'https://api.groq.com/v1/audio/transcriptions' } });
      expect(configStore.getEndpointConfig().url).toBe('https://api.groq.com/v1/audio/transcriptions');
    });

    it('should reject invalid endpoint URL (not http/https)', () => {
      expect(() => {
        configStore.save({ endpoint: { url: 'ftp://server.com/api' } });
      }).toThrow(ConfigurationError);
    });

    it('should reject empty endpoint URL', () => {
      expect(() => {
        configStore.save({ endpoint: { url: '' } });
      }).toThrow(ConfigurationError);
    });

    it('should save valid model name', () => {
      configStore.save({ endpoint: { model: 'whisper-large-v3' } });
      expect(configStore.getEndpointConfig().model).toBe('whisper-large-v3');
    });

    it('should reject model name with path traversal', () => {
      expect(() => {
        configStore.save({ endpoint: { model: '../etc/passwd' } });
      }).toThrow(ConfigurationError);
    });

    it('should reject empty model name', () => {
      expect(() => {
        configStore.save({ endpoint: { model: '' } });
      }).toThrow(ConfigurationError);
    });
  });

  describe('save - timeout clamping', () => {
    it('should clamp timeout below minimum to 1000', () => {
      configStore.save({ endpoint: { timeout: 500 } });
      expect(configStore.getEndpointConfig().timeout).toBe(1000);
    });

    it('should clamp timeout above maximum to 120000', () => {
      configStore.save({ endpoint: { timeout: 200000 } });
      expect(configStore.getEndpointConfig().timeout).toBe(120000);
    });

    it('should accept valid timeout', () => {
      configStore.save({ endpoint: { timeout: 15000 } });
      expect(configStore.getEndpointConfig().timeout).toBe(15000);
    });
  });

  describe('save - audio validation', () => {
    it('should default invalid audio format to mp3', () => {
      configStore.save({ audio: { format: 'ogg' as 'mp3' | 'wav' } });
      expect(configStore.getAudioConfig().format).toBe('mp3');
    });

    it('should default invalid sample rate to 16000', () => {
      configStore.save({ audio: { sampleRate: 48000 } });
      expect(configStore.getAudioConfig().sampleRate).toBe(16000);
    });

    it('should accept valid sample rate', () => {
      configStore.save({ audio: { sampleRate: 44100 } });
      expect(configStore.getAudioConfig().sampleRate).toBe(44100);
    });

    it('should accept valid format wav', () => {
      configStore.save({ audio: { format: 'wav' } });
      expect(configStore.getAudioConfig().format).toBe('wav');
    });
  });

  describe('save - deep merge', () => {
    it('should not overwrite unrelated fields when saving partial config', () => {
      configStore.save({ endpoint: { url: 'http://localhost:9000/api' } });
      configStore.save({ audio: { format: 'wav' } });

      const config = configStore.getEndpointConfig();
      expect(config.url).toBe('http://localhost:9000/api');
      expect(configStore.getAudioConfig().format).toBe('wav');
    });

    it('should not overwrite endpoint model when saving endpoint url', () => {
      configStore.save({ endpoint: { model: 'custom-model' } });
      configStore.save({ endpoint: { url: 'http://localhost:9000/api' } });

      const config = configStore.getEndpointConfig();
      expect(config.model).toBe('custom-model');
      expect(config.url).toBe('http://localhost:9000/api');
    });
  });

  describe('save - language', () => {
    it('should save valid language code', () => {
      configStore.save({ endpoint: { language: 'fr' } });
      expect(configStore.getEndpointConfig().language).toBe('fr');
    });

    it('should default empty language to en', () => {
      configStore.save({ endpoint: { language: '' } });
      expect(configStore.getEndpointConfig().language).toBe('en');
    });
  });

  describe('reset', () => {
    it('should restore all defaults', () => {
      configStore.save({
        endpoint: { url: 'https://api.groq.com/test', model: 'custom', timeout: 5000, language: 'fr' },
        audio: { format: 'wav', sampleRate: 44100 },
        ui: { showNotifications: false },
      });

      configStore.reset();

      expect(configStore.getAll()).toEqual(DEFAULT_CONFIG);
    });
  });
});
