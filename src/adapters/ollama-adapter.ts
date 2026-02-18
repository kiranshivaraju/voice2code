import { STTAdapter } from './stt-adapter';
import { TranscriptionOptions, TranscriptionResult, STTError, NetworkError } from '../types';
import axios from 'axios';

/**
 * Ollama STT Adapter
 *
 * Implements STTAdapter for Ollama with audio support (audio-support fork).
 * Uses /api/chat with audio field for audio transcription.
 *
 * API format:
 *   POST /api/chat
 *   { model, messages: [{ role: "user", content: "Transcribe this audio.", audio: [base64_wav] }] }
 *
 * Audio must be WAV format (base64 encoded).
 */
export class OllamaAdapter implements STTAdapter {
  private readonly DEFAULT_TIMEOUT = 120000; // 120 seconds (audio models are slow)
  private readonly DEFAULT_MODEL = 'qwen2-audio';

  constructor(private endpointUrl: string) {}

  /**
   * Encode raw PCM buffer to WAV format in-memory
   *
   * @param pcmBuffer - Raw 16-bit PCM audio (mono, 16kHz)
   * @returns WAV-encoded buffer with 44-byte header
   */
  private encodeToWAV(pcmBuffer: Buffer): Buffer {
    const headerSize = 44;
    const dataSize = pcmBuffer.length;
    const fileSize = headerSize + dataSize - 8;

    const wavBuffer = Buffer.alloc(headerSize + dataSize);

    wavBuffer.write('RIFF', 0, 4, 'ascii');
    wavBuffer.writeUInt32LE(fileSize, 4);
    wavBuffer.write('WAVE', 8, 4, 'ascii');
    wavBuffer.write('fmt ', 12, 4, 'ascii');
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20);    // PCM format
    wavBuffer.writeUInt16LE(1, 22);    // Mono
    wavBuffer.writeUInt32LE(16000, 24); // Sample rate
    wavBuffer.writeUInt32LE(32000, 28); // Byte rate
    wavBuffer.writeUInt16LE(2, 32);    // Block align
    wavBuffer.writeUInt16LE(16, 34);   // Bits per sample
    wavBuffer.write('data', 36, 4, 'ascii');
    wavBuffer.writeUInt32LE(dataSize, 40);

    pcmBuffer.copy(wavBuffer, 44);
    return wavBuffer;
  }

  /**
   * Transcribe audio to text using Ollama /api/chat with audio support
   *
   * @param audio - Raw PCM audio data as Buffer (16-bit, mono, 16kHz)
   * @param options - Transcription options (model, language, temperature)
   * @returns Transcription result with text
   * @throws STTError for API errors (404, 500)
   * @throws NetworkError for connection/timeout errors
   */
  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      // Encode raw PCM to WAV and convert to base64
      const wavBuffer = this.encodeToWAV(audio);
      const audioBase64 = wavBuffer.toString('base64');

      // Build transcription prompt
      let prompt = 'Transcribe this audio.';
      if (options.language) {
        prompt = `Transcribe this audio in ${options.language}.`;
      }

      // Prepare chat request body (Ollama audio-support fork format)
      const requestBody = {
        model: options.model || this.DEFAULT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
            audio: [audioBase64],
          },
        ],
        stream: false,
        ...(options.temperature !== undefined && {
          options: { temperature: options.temperature },
        }),
      };

      // Make request to Ollama /api/chat
      const response = await axios.post(`${this.endpointUrl}/api/chat`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.DEFAULT_TIMEOUT,
      });

      // Validate chat response structure
      if (!response.data?.message || typeof response.data.message.content !== 'string') {
        throw new STTError('Invalid response format from Ollama server');
      }

      // Extract transcription from chat response
      const transcriptionResult: TranscriptionResult = {
        text: response.data.message.content,
      };

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
