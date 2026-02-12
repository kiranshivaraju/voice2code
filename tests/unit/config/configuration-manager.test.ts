/**
 * Unit tests for ConfigurationManager
 */

import { ConfigurationManager } from '../../../src/config/configuration-manager';
import {
  EndpointConfiguration,
  ConfigurationError,
} from '../../../src/types';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

describe('ConfigurationManager', () => {
  let mockContext: vscode.ExtensionContext;
  let mockWorkspaceConfig: any;
  let mockSecrets: any;
  let configManager: ConfigurationManager;

  beforeEach(() => {
    // Setup mock secrets
    mockSecrets = {
      get: jest.fn(),
      store: jest.fn(),
      delete: jest.fn(),
    };

    // Setup mock context
    mockContext = {
      secrets: mockSecrets,
    } as any;

    // Setup mock workspace configuration
    mockWorkspaceConfig = {
      get: jest.fn(),
    };

    // Mock vscode.workspace.getConfiguration
    (vscode.workspace.getConfiguration as jest.Mock) = jest.fn(() => mockWorkspaceConfig);

    configManager = new ConfigurationManager(mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEndpointConfig', () => {
    it('should return default configuration when no settings exist', () => {
      mockWorkspaceConfig.get.mockImplementation((_key: string, defaultValue: any) => defaultValue);

      const config = configManager.getEndpointConfig();

      expect(config).toEqual({
        url: 'http://localhost:11434/api/generate',
        model: 'whisper-large-v3',
        timeout: 30000,
        customHeaders: undefined,
      });
    });

    it('should return user configuration when settings exist', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string) => {
        if (key === 'endpoint.url') return 'http://localhost:8000/transcribe';
        if (key === 'endpoint.model') return 'custom-model';
        if (key === 'endpoint.timeout') return 60000;
        if (key === 'endpoint.customHeaders') return { 'X-Custom': 'value' };
        return undefined;
      });

      const config = configManager.getEndpointConfig();

      expect(config).toEqual({
        url: 'http://localhost:8000/transcribe',
        model: 'custom-model',
        timeout: 60000,
        customHeaders: { 'X-Custom': 'value' },
      });
    });

    it('should merge user settings with defaults', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'endpoint.url') return 'http://custom.com/api';
        return defaultValue;
      });

      const config = configManager.getEndpointConfig();

      expect(config.url).toBe('http://custom.com/api');
      expect(config.model).toBe('whisper-large-v3'); // default
      expect(config.timeout).toBe(30000); // default
    });
  });

  describe('getAudioConfig', () => {
    it('should return default audio configuration', () => {
      mockWorkspaceConfig.get.mockImplementation((_key: string, defaultValue: any) => defaultValue);

      const config = configManager.getAudioConfig();

      expect(config).toEqual({
        deviceId: 'default',
        sampleRate: 16000,
        format: 'mp3',
      });
    });

    it('should return user audio configuration', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string) => {
        if (key === 'audio.deviceId') return 'custom-device';
        if (key === 'audio.sampleRate') return 48000;
        if (key === 'audio.format') return 'wav';
        return undefined;
      });

      const config = configManager.getAudioConfig();

      expect(config).toEqual({
        deviceId: 'custom-device',
        sampleRate: 48000,
        format: 'wav',
      });
    });
  });

  describe('getUIConfig', () => {
    it('should return default UI configuration', () => {
      mockWorkspaceConfig.get.mockImplementation((_key: string, defaultValue: any) => defaultValue);

      const config = configManager.getUIConfig();

      expect(config).toEqual({
        showStatusBar: true,
        showNotifications: true,
        playBeep: false,
      });
    });

    it('should return user UI configuration', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string) => {
        if (key === 'ui.showStatusBar') return false;
        if (key === 'ui.showNotifications') return false;
        if (key === 'ui.playBeep') return true;
        return undefined;
      });

      const config = configManager.getUIConfig();

      expect(config).toEqual({
        showStatusBar: false,
        showNotifications: false,
        playBeep: true,
      });
    });
  });

  describe('SecretStorage integration', () => {
    describe('getApiKey', () => {
      it('should retrieve API key from SecretStorage', async () => {
        mockSecrets.get.mockResolvedValue('test-api-key-123');

        const apiKey = await configManager.getApiKey();

        expect(apiKey).toBe('test-api-key-123');
        expect(mockSecrets.get).toHaveBeenCalledWith('voice2code.apiKey');
      });

      it('should return undefined when no API key exists', async () => {
        mockSecrets.get.mockResolvedValue(undefined);

        const apiKey = await configManager.getApiKey();

        expect(apiKey).toBeUndefined();
      });

      it('should return undefined on SecretStorage error', async () => {
        mockSecrets.get.mockRejectedValue(new Error('Storage error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const apiKey = await configManager.getApiKey();

        expect(apiKey).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('setApiKey', () => {
      it('should store API key in SecretStorage', async () => {
        mockSecrets.store.mockResolvedValue(undefined);

        await configManager.setApiKey('new-api-key');

        expect(mockSecrets.store).toHaveBeenCalledWith('voice2code.apiKey', 'new-api-key');
      });

      it('should throw error for empty API key', async () => {
        await expect(configManager.setApiKey('')).rejects.toThrow(ConfigurationError);
        await expect(configManager.setApiKey('   ')).rejects.toThrow('API key cannot be empty');
      });

      it('should throw ConfigurationError when storage fails', async () => {
        mockSecrets.store.mockRejectedValue(new Error('Storage error'));

        await expect(configManager.setApiKey('test-key')).rejects.toThrow(ConfigurationError);
        await expect(configManager.setApiKey('test-key')).rejects.toThrow(
          'Failed to store API key in SecretStorage'
        );
      });
    });

    describe('deleteApiKey', () => {
      it('should delete API key from SecretStorage', async () => {
        mockSecrets.delete.mockResolvedValue(undefined);

        await configManager.deleteApiKey();

        expect(mockSecrets.delete).toHaveBeenCalledWith('voice2code.apiKey');
      });

      it('should throw ConfigurationError when deletion fails', async () => {
        mockSecrets.delete.mockRejectedValue(new Error('Deletion error'));

        await expect(configManager.deleteApiKey()).rejects.toThrow(ConfigurationError);
        await expect(configManager.deleteApiKey()).rejects.toThrow(
          'Failed to delete API key from SecretStorage'
        );
      });
    });
  });

  describe('validateEndpointConfig', () => {
    it('should pass validation for valid HTTPS URL', () => {
      const config: EndpointConfiguration = {
        url: 'https://api.openai.com/v1/audio/transcriptions',
        model: 'whisper-1',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for valid HTTP localhost URL', () => {
      const config: EndpointConfiguration = {
        url: 'http://localhost:11434/api/generate',
        model: 'whisper-large-v3',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn for HTTP remote URL', () => {
      const config: EndpointConfiguration = {
        url: 'http://example.com/api',
        model: 'test-model',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('HTTP (non-HTTPS)');
    });

    it('should fail validation for empty URL', () => {
      const config: EndpointConfiguration = {
        url: '',
        model: 'test-model',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Endpoint URL cannot be empty');
    });

    it('should fail validation for invalid URL format', () => {
      const config: EndpointConfiguration = {
        url: 'not-a-valid-url',
        model: 'test-model',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid endpoint URL format');
    });

    it('should fail validation for empty model name', () => {
      const config: EndpointConfiguration = {
        url: 'http://localhost:11434/api',
        model: '',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name cannot be empty');
    });

    it('should fail validation for invalid model name with path traversal', () => {
      const config: EndpointConfiguration = {
        url: 'http://localhost:11434/api',
        model: '../malicious',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid model name format');
    });

    it('should fail validation for model name with spaces', () => {
      const config: EndpointConfiguration = {
        url: 'http://localhost:11434/api',
        model: 'model name',
        timeout: 30000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should pass validation for valid model names', () => {
      const validNames = ['whisper-large-v3', 'openai_whisper', 'model.v2'];

      validNames.forEach((model) => {
        const config: EndpointConfiguration = {
          url: 'http://localhost:11434/api',
          model,
          timeout: 30000,
        };

        const result = configManager.validateEndpointConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it('should fail validation for timeout below minimum', () => {
      const config: EndpointConfiguration = {
        url: 'http://localhost:11434/api',
        model: 'test-model',
        timeout: 500,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timeout must be at least 1000ms');
    });

    it('should fail validation for timeout above maximum', () => {
      const config: EndpointConfiguration = {
        url: 'http://localhost:11434/api',
        model: 'test-model',
        timeout: 400000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timeout must be at most 300000ms');
    });

    it('should pass validation for timeout within valid range', () => {
      const config: EndpointConfiguration = {
        url: 'http://localhost:11434/api',
        model: 'test-model',
        timeout: 60000,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should handle multiple validation errors', () => {
      const config: EndpointConfiguration = {
        url: 'invalid-url',
        model: '',
        timeout: 100,
      };

      const result = configManager.validateEndpointConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
