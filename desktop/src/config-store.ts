/**
 * ConfigStore — Typed, validated configuration persistence for the desktop app.
 * Wraps electron-store with schema validation and maps to shared core types.
 */

import Store from 'electron-store';
import {
  EndpointConfiguration,
  AudioConfiguration,
  ConfigurationError,
} from '@core/types';
import { validateEndpointUrl, validateModelName } from '@core/config/endpoint-validator';

export interface DesktopConfig {
  endpoint: {
    url: string;
    model: string;
    timeout: number;
    language: string;
  };
  audio: {
    sampleRate: number;
    format: 'mp3' | 'wav';
  };
  ui: {
    showNotifications: boolean;
  };
}

type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };

export const DEFAULT_CONFIG: DesktopConfig = {
  endpoint: {
    url: 'http://localhost:8000/v1/audio/transcriptions',
    model: 'whisper-large-v3',
    timeout: 30000,
    language: 'en',
  },
  audio: {
    sampleRate: 16000,
    format: 'mp3',
  },
  ui: {
    showNotifications: true,
  },
};

const VALID_SAMPLE_RATES = [8000, 16000, 22050, 44100];
const VALID_FORMATS: ReadonlyArray<string> = ['mp3', 'wav'];

export class ConfigStore {
  private store: Store<DesktopConfig>;

  constructor() {
    this.store = new Store<DesktopConfig>({
      name: 'config',
      defaults: DEFAULT_CONFIG,
    });
  }

  getEndpointConfig(): EndpointConfiguration {
    return {
      url: this.store.get('endpoint.url') ?? DEFAULT_CONFIG.endpoint.url,
      model: this.store.get('endpoint.model') ?? DEFAULT_CONFIG.endpoint.model,
      timeout: this.store.get('endpoint.timeout') ?? DEFAULT_CONFIG.endpoint.timeout,
      language: this.store.get('endpoint.language') ?? DEFAULT_CONFIG.endpoint.language,
    };
  }

  getAudioConfig(): AudioConfiguration {
    return {
      deviceId: 'default',
      sampleRate: this.store.get('audio.sampleRate') ?? DEFAULT_CONFIG.audio.sampleRate,
      format: (this.store.get('audio.format') ?? DEFAULT_CONFIG.audio.format) as 'mp3' | 'wav',
    };
  }

  getUIConfig(): { showNotifications: boolean } {
    return {
      showNotifications: this.store.get('ui.showNotifications') ?? DEFAULT_CONFIG.ui.showNotifications,
    };
  }

  getAll(): DesktopConfig {
    return {
      endpoint: {
        url: this.store.get('endpoint.url') ?? DEFAULT_CONFIG.endpoint.url,
        model: this.store.get('endpoint.model') ?? DEFAULT_CONFIG.endpoint.model,
        timeout: this.store.get('endpoint.timeout') ?? DEFAULT_CONFIG.endpoint.timeout,
        language: this.store.get('endpoint.language') ?? DEFAULT_CONFIG.endpoint.language,
      },
      audio: {
        sampleRate: this.store.get('audio.sampleRate') ?? DEFAULT_CONFIG.audio.sampleRate,
        format: (this.store.get('audio.format') ?? DEFAULT_CONFIG.audio.format) as 'mp3' | 'wav',
      },
      ui: {
        showNotifications: this.store.get('ui.showNotifications') ?? DEFAULT_CONFIG.ui.showNotifications,
      },
    };
  }

  save(partial: DeepPartial<DesktopConfig>): void {
    if (partial.endpoint) {
      this.saveEndpoint(partial.endpoint);
    }
    if (partial.audio) {
      this.saveAudio(partial.audio);
    }
    if (partial.ui) {
      this.saveUI(partial.ui);
    }
  }

  reset(): void {
    this.store.clear();
  }

  private saveEndpoint(endpoint: Partial<DesktopConfig['endpoint']>): void {
    if (endpoint.url !== undefined) {
      const result = validateEndpointUrl(endpoint.url);
      if (!result.valid) {
        throw new ConfigurationError(`Invalid endpoint URL: ${result.errors[0]}`);
      }
      this.store.set('endpoint.url', endpoint.url);
    }

    if (endpoint.model !== undefined) {
      const result = validateModelName(endpoint.model);
      if (!result.valid) {
        throw new ConfigurationError(`Invalid model name: ${result.errors[0]}`);
      }
      this.store.set('endpoint.model', endpoint.model);
    }

    if (endpoint.timeout !== undefined) {
      const clamped = Math.max(1000, Math.min(120000, endpoint.timeout));
      this.store.set('endpoint.timeout', clamped);
    }

    if (endpoint.language !== undefined) {
      this.store.set('endpoint.language', endpoint.language || 'en');
    }
  }

  private saveAudio(audio: Partial<DesktopConfig['audio']>): void {
    if (audio.sampleRate !== undefined) {
      const rate = VALID_SAMPLE_RATES.includes(audio.sampleRate) ? audio.sampleRate : 16000;
      this.store.set('audio.sampleRate', rate);
    }

    if (audio.format !== undefined) {
      const fmt = VALID_FORMATS.includes(audio.format) ? audio.format : 'mp3';
      this.store.set('audio.format', fmt);
    }
  }

  private saveUI(ui: Partial<DesktopConfig['ui']>): void {
    if (ui.showNotifications !== undefined) {
      this.store.set('ui.showNotifications', ui.showNotifications);
    }
  }
}
