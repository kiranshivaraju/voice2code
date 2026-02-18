import { STTAdapter } from './stt-adapter';
import { TranscriptionOptions, TranscriptionResult, STTError, NetworkError } from '../types';
import axios from 'axios';
import FormData from 'form-data';

/**
 * OpenAI Whisper API Adapter
 *
 * Implements STTAdapter for OpenAI Whisper API and vLLM-compatible endpoints.
 * Supports both OpenAI cloud API and local vLLM deployments.
 */
export class OpenAIWhisperAdapter implements STTAdapter {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_MODEL = 'whisper-1';

  constructor(
    private endpointUrl: string,
    private apiKey?: string
  ) {}

  /**
   * Transcribe audio to text using OpenAI Whisper API
   *
   * @param audio - Audio data as Buffer
   * @param options - Transcription options (language, temperature, etc.)
   * @returns Transcription result with text
   * @throws STTError for API errors (401, 429)
   * @throws NetworkError for connection/timeout errors
   */
  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      // Create multipart/form-data
      const formData = new FormData();
      formData.append('file', audio, {
        filename: 'audio.mp3',
        contentType: 'audio/mpeg',
      });
      formData.append('model', options.model || this.DEFAULT_MODEL);

      // Add optional parameters
      if (options.language) {
        formData.append('language', options.language);
      }

      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }

      // Prepare headers
      const headers: Record<string, string> = {
        ...formData.getHeaders(),
      };

      // Add Authorization header if API key is provided
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      // Make request to OpenAI Whisper API
      const response = await axios.post(this.endpointUrl, formData, {
        headers,
        timeout: this.DEFAULT_TIMEOUT,
      });

      // Validate response structure
      if (!response.data || typeof response.data.text !== 'string') {
        throw new STTError('Invalid response format from OpenAI Whisper server');
      }

      // Extract transcription
      const transcriptionResult: TranscriptionResult = {
        text: response.data.text,
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
          case 401:
            throw new STTError('Invalid API key', err.message || 'Unauthorized');
          case 429:
            throw new STTError('Rate limit exceeded', err.message || 'Too many requests');
          default:
            throw new STTError(`OpenAI Whisper API error: ${err.response.status}`, err.message);
        }
      }

      // Network errors by code
      if (err.code === 'ECONNREFUSED') {
        throw new NetworkError(
          'Failed to connect to OpenAI Whisper server',
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
   * Test connection to OpenAI Whisper server
   *
   * @returns true if server is reachable, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      // Extract base URL (remove /v1/audio/transcriptions)
      const baseUrl = this.endpointUrl.replace(/\/v1\/audio\/transcriptions.*$/, '');

      const headers: Record<string, string> = {};

      // Add Authorization header if API key is provided
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      await axios.get(`${baseUrl}/v1/models`, {
        headers,
        timeout: 5000, // 5 second timeout for connection test
      });

      return true;
    } catch (error) {
      // Log error for debugging
      console.error(
        'OpenAI Whisper connection test failed:',
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * Get provider name
   *
   * @returns "openai-whisper"
   */
  getProviderName(): string {
    return 'openai-whisper';
  }
}
