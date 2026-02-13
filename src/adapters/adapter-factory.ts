import { STTAdapter } from './stt-adapter';
import { ConfigurationError } from '../types';

/**
 * AdapterFactory creates appropriate STTAdapter instances based on endpoint URL
 *
 * Provider Detection Logic:
 * - localhost:11434 or "ollama" in URL → OllamaAdapter
 * - /v1/audio/transcriptions in URL → OpenAIWhisperAdapter
 * - Otherwise → ConfigurationError (unsupported)
 */
export class AdapterFactory {
  /**
   * Create an STTAdapter for the given endpoint
   *
   * @param endpointUrl - The STT endpoint URL
   * @param apiKey - Optional API key (required for some providers)
   * @returns Appropriate STTAdapter instance
   * @throws ConfigurationError if URL is invalid or provider is unsupported
   */
  createAdapter(endpointUrl: string, apiKey?: string): STTAdapter {
    // Validate URL
    if (!endpointUrl || endpointUrl.trim().length === 0) {
      throw new ConfigurationError('Endpoint URL cannot be empty');
    }

    // Check for valid URL format
    if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
      throw new ConfigurationError('Endpoint URL must start with http:// or https://');
    }

    // Detect provider from URL
    const url = endpointUrl.toLowerCase();

    // Ollama detection
    if (url.includes('localhost:11434') || url.includes('ollama')) {
      return new OllamaAdapter(endpointUrl);
    }

    // OpenAI Whisper API (or vLLM compatible)
    if (url.includes('/v1/audio/transcriptions')) {
      return new OpenAIWhisperAdapter(endpointUrl, apiKey);
    }

    // Unsupported provider
    throw new ConfigurationError('Unsupported STT provider URL');
  }
}

/**
 * Ollama STT Adapter
 *
 * Adapter for Ollama-based STT models (local deployment)
 */
class OllamaAdapter implements STTAdapter {
  constructor(private endpointUrl: string) {
    // endpointUrl will be used in Issue #14 for transcription API calls
  }

  async transcribe(_audio: Buffer, _options: any): Promise<any> {
    // TODO: Implementation in Issue #14
    // Will use this.endpointUrl for API calls
    console.log(`Transcription not implemented for ${this.endpointUrl}`);
    throw new Error('Not implemented - see Issue #14');
  }

  async testConnection(): Promise<boolean> {
    // TODO: Implementation in Issue #14
    // Will use this.endpointUrl to test connection
    return true;
  }

  getProviderName(): string {
    return 'ollama';
  }
}

/**
 * OpenAI Whisper API Adapter
 *
 * Adapter for OpenAI Whisper API or compatible endpoints (vLLM, etc.)
 */
class OpenAIWhisperAdapter implements STTAdapter {
  constructor(
    private endpointUrl: string,
    private apiKey?: string
  ) {
    // endpointUrl and apiKey will be used in future sprint for API calls
  }

  async transcribe(_audio: Buffer, _options: any): Promise<any> {
    // TODO: Implementation in future issue
    // Will use this.endpointUrl and this.apiKey for API calls
    console.log(`Transcription not implemented for ${this.endpointUrl} with key: ${this.apiKey ? 'provided' : 'none'}`);
    throw new Error('Not implemented - planned for future sprint');
  }

  async testConnection(): Promise<boolean> {
    // TODO: Implementation in future issue
    // Will use this.endpointUrl to test connection
    return true;
  }

  getProviderName(): string {
    return 'openai-whisper';
  }
}
