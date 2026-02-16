import { STTAdapter } from './stt-adapter';
import { TranscriptionOptions, TranscriptionResult, STTError, NetworkError } from '../types';
import axios from 'axios';

/**
 * Ollama STT Adapter
 *
 * Implements STTAdapter for Ollama-based speech-to-text models.
 * Supports local Ollama deployments with Whisper models.
 */
export class OllamaAdapter implements STTAdapter {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_MODEL = 'whisper-large-v3';

  constructor(private endpointUrl: string) {}

  /**
   * Transcribe audio to text using Ollama API
   *
   * @param audio - Audio data as Buffer
   * @param options - Transcription options (language, temperature, etc.)
   * @returns Transcription result with text
   * @throws STTError for API errors (404, 500)
   * @throws NetworkError for connection/timeout errors
   */
  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      // Convert audio buffer to base64
      const audioBase64 = audio.toString('base64');

      // Prepare request body
      const requestBody = {
        model: this.DEFAULT_MODEL,
        prompt: audioBase64,
        stream: false,
        ...(options.temperature !== undefined && { temperature: options.temperature }),
      };

      // Make request to Ollama API
      const response = await axios.post(`${this.endpointUrl}/api/generate`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.DEFAULT_TIMEOUT,
      });

      // Validate response structure
      if (!response.data || typeof response.data.response !== 'string') {
        throw new STTError('Invalid response format from Ollama server');
      }

      // Extract transcription
      const transcriptionResult: TranscriptionResult = {
        text: response.data.response,
      };

      // Include language if provided by server
      if (response.data.language) {
        transcriptionResult.language = response.data.language;
      }

      return transcriptionResult;
    } catch (error) {
      // Re-throw STTError and NetworkError
      if (error instanceof STTError || error instanceof NetworkError) {
        throw error;
      }

      // Handle axios errors and error-like objects
      const err = error as any;

      // HTTP status code errors
      if (err.response?.status) {
        switch (err.response.status) {
          case 404:
            throw new STTError(
              'Model not found on Ollama server',
              err.message || 'Model not found'
            );
          case 500:
            throw new STTError('Ollama server error', err.message || 'Server error');
          default:
            throw new STTError(`Ollama API error: ${err.response.status}`, err.message);
        }
      }

      // Network errors by code
      if (err.code === 'ECONNREFUSED') {
        throw new NetworkError(
          'Failed to connect to Ollama server',
          `${this.endpointUrl} is not reachable`
        );
      }

      if (err.code === 'ECONNABORTED') {
        throw new NetworkError('Request timeout', `Timeout after ${this.DEFAULT_TIMEOUT}ms`);
      }

      // Axios errors
      if (axios.isAxiosError(err)) {
        throw new NetworkError('Network error', err.message);
      }

      // Unknown errors
      throw new STTError(
        'Transcription failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test connection to Ollama server
   *
   * @returns true if server is reachable, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.endpointUrl}/api/tags`, {
        timeout: 5000, // 5 second timeout for connection test
      });
      return true;
    } catch (error) {
      // Log error for debugging
      console.error(
        'Ollama connection test failed:',
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * Get provider name
   *
   * @returns "ollama"
   */
  getProviderName(): string {
    return 'ollama';
  }
}
