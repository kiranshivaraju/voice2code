/**
 * ConfigurationManager
 * Handles VS Code settings and SecretStorage integration
 */

import * as vscode from 'vscode';
import {
  EndpointConfiguration,
  AudioConfiguration,
  UIConfiguration,
  ValidationResult,
  ConfigurationError,
} from '../types';
import { isLocalhost } from '../utils/url';

/**
 * Manages all configuration settings for Voice2Code extension
 */
export class ConfigurationManager {
  private static readonly CONFIG_SECTION = 'voice2code';
  private static readonly SECRET_KEY_API = 'voice2code.apiKey';

  // Default configuration values
  private static readonly DEFAULTS = {
    endpoint: {
      url: 'http://localhost:11434/api/generate',
      model: 'whisper-large-v3',
      timeout: 30000,
    },
    audio: {
      deviceId: 'default',
      sampleRate: 16000,
      format: 'mp3' as const,
    },
    ui: {
      showStatusBar: true,
      showNotifications: true,
      playBeep: false,
    },
  };

  // Validation regex patterns
  private static readonly URL_REGEX = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]{1,5})?(\/.*)?$/;
  private static readonly MODEL_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
  private static readonly TIMEOUT_MIN = 1000;
  private static readonly TIMEOUT_MAX = 300000;

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get STT endpoint configuration from VS Code settings
   */
  getEndpointConfig(): EndpointConfiguration {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);

    return {
      url: config.get<string>('endpoint.url', ConfigurationManager.DEFAULTS.endpoint.url),
      model: config.get<string>('endpoint.model', ConfigurationManager.DEFAULTS.endpoint.model),
      timeout: config.get<number>(
        'endpoint.timeout',
        ConfigurationManager.DEFAULTS.endpoint.timeout
      ),
      customHeaders: config.get<Record<string, string>>('endpoint.customHeaders'),
    };
  }

  /**
   * Get audio configuration from VS Code settings
   */
  getAudioConfig(): AudioConfiguration {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);

    return {
      deviceId: config.get<string>('audio.deviceId', ConfigurationManager.DEFAULTS.audio.deviceId),
      sampleRate: config.get<number>(
        'audio.sampleRate',
        ConfigurationManager.DEFAULTS.audio.sampleRate
      ),
      format: config.get<'mp3' | 'wav'>('audio.format', ConfigurationManager.DEFAULTS.audio.format),
    };
  }

  /**
   * Get UI configuration from VS Code settings
   */
  getUIConfig(): UIConfiguration {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);

    return {
      showStatusBar: config.get<boolean>(
        'ui.showStatusBar',
        ConfigurationManager.DEFAULTS.ui.showStatusBar
      ),
      showNotifications: config.get<boolean>(
        'ui.showNotifications',
        ConfigurationManager.DEFAULTS.ui.showNotifications
      ),
      playBeep: config.get<boolean>('ui.playBeep', ConfigurationManager.DEFAULTS.ui.playBeep),
    };
  }

  /**
   * Get API key from SecretStorage
   */
  async getApiKey(): Promise<string | undefined> {
    try {
      return await this.context.secrets.get(ConfigurationManager.SECRET_KEY_API);
    } catch (error) {
      console.error('Failed to retrieve API key from SecretStorage:', error);
      return undefined;
    }
  }

  /**
   * Store API key in SecretStorage
   */
  async setApiKey(key: string): Promise<void> {
    if (!key || key.trim().length === 0) {
      throw new ConfigurationError('API key cannot be empty');
    }

    try {
      await this.context.secrets.store(ConfigurationManager.SECRET_KEY_API, key);
    } catch (error) {
      throw new ConfigurationError('Failed to store API key in SecretStorage', error);
    }
  }

  /**
   * Delete API key from SecretStorage
   */
  async deleteApiKey(): Promise<void> {
    try {
      await this.context.secrets.delete(ConfigurationManager.SECRET_KEY_API);
    } catch (error) {
      throw new ConfigurationError('Failed to delete API key from SecretStorage', error);
    }
  }

  /**
   * Validate endpoint configuration
   */
  validateEndpointConfig(config: EndpointConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate URL
    if (!config.url || config.url.trim().length === 0) {
      errors.push('Endpoint URL cannot be empty');
    } else if (!ConfigurationManager.URL_REGEX.test(config.url)) {
      errors.push('Invalid endpoint URL format');
    } else if (config.url.startsWith('http://') && !isLocalhost(config.url)) {
      warnings.push('Using HTTP (non-HTTPS) for remote endpoint is not recommended');
    }

    // Validate model name
    if (!config.model || config.model.trim().length === 0) {
      errors.push('Model name cannot be empty');
    } else if (!ConfigurationManager.MODEL_NAME_REGEX.test(config.model)) {
      errors.push(
        'Invalid model name format (use only letters, numbers, dots, underscores, and hyphens)'
      );
    }

    // Validate timeout
    if (config.timeout < ConfigurationManager.TIMEOUT_MIN) {
      errors.push(`Timeout must be at least ${ConfigurationManager.TIMEOUT_MIN}ms`);
    } else if (config.timeout > ConfigurationManager.TIMEOUT_MAX) {
      errors.push(`Timeout must be at most ${ConfigurationManager.TIMEOUT_MAX}ms`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

}
