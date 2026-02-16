import { STTAdapter } from './stt-adapter';
import { ConfigurationError } from '../types';
import { OllamaAdapter } from './ollama-adapter';
import { OpenAIWhisperAdapter } from './openai-whisper-adapter';

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


