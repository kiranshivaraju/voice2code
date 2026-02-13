import { TranscriptionOptions, TranscriptionResult } from '../types';

/**
 * STTAdapter interface for speech-to-text providers
 *
 * This interface abstracts different STT provider APIs (Ollama, OpenAI Whisper, etc.)
 * allowing the extension to work with multiple backends.
 */
export interface STTAdapter {
  /**
   * Transcribe audio to text
   *
   * @param audio - Audio data as Buffer
   * @param options - Transcription options (model, language, etc.)
   * @returns Transcription result with text and metadata
   */
  transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;

  /**
   * Test connection to the STT endpoint
   *
   * @returns true if endpoint is reachable, false otherwise
   */
  testConnection(): Promise<boolean>;

  /**
   * Get the provider name
   *
   * @returns Provider identifier (e.g., "ollama", "openai-whisper")
   */
  getProviderName(): string;
}
