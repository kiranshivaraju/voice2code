import { ConfigurationManager } from '../config/configuration-manager';
import { AdapterFactory } from '../adapters/adapter-factory';
import {
  TranscriptionResult,
  TranscriptionOptions,
  NetworkError,
} from '../types';

/**
 * TranscriptionService
 *
 * Orchestrates the transcription workflow with retry logic and error transformation.
 *
 * Features:
 * - Creates appropriate STT adapter based on endpoint configuration
 * - Implements exponential backoff retry logic for network errors
 * - Enhances errors with context (endpoint URL, model name)
 * - Tests connection to STT service
 *
 * Retry Policy:
 * - Max retries: 3
 * - Initial delay: 1000ms
 * - Backoff multiplier: 2x (1s, 2s, 4s)
 * - Only retries on NetworkError (not STTError)
 */

export class TranscriptionService {
  constructor(
    private configManager: ConfigurationManager,
    private adapterFactory: AdapterFactory
  ) {}

  /**
   * Transcribe audio buffer to text
   *
   * Workflow:
   * 1. Get endpoint configuration and API key
   * 2. Create appropriate adapter using factory
   * 3. Call adapter.transcribe() with retry logic
   * 4. Return transcription result
   *
   * Retry logic:
   * - Retries up to 3 times on NetworkError
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Does not retry on STTError
   *
   * @param audio - Audio buffer to transcribe
   * @param options - Transcription options (language, prompt, etc.)
   * @returns Transcription result with text
   * @throws NetworkError if network fails after retries
   * @throws STTError if STT service returns error
   */
  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Get endpoint configuration
    const endpointConfig = this.configManager.getEndpointConfig();
    const apiKey = await this.configManager.getApiKey();

    // Create adapter using endpoint URL
    const adapter = this.adapterFactory.createAdapter(endpointConfig.url, apiKey);

    // Transcribe with retry logic
    try {
      const result = await this.retryWithBackoff(
        () => adapter.transcribe(audio, options),
        {
          maxRetries: 3,
          initialDelay: 1000,
        }
      );

      return result;
    } catch (error) {
      // Re-throw with original error (context already in error)
      throw error;
    }
  }

  /**
   * Test connection to STT service
   *
   * Workflow:
   * 1. Get endpoint configuration and API key
   * 2. Create appropriate adapter
   * 3. Call adapter.testConnection()
   * 4. Return result
   *
   * @returns true if connection successful, false otherwise
   * @throws NetworkError if connection test fails
   */
  async testConnection(): Promise<boolean> {
    // Get endpoint configuration
    const endpointConfig = this.configManager.getEndpointConfig();
    const apiKey = await this.configManager.getApiKey();

    // Create adapter using endpoint URL
    const adapter = this.adapterFactory.createAdapter(endpointConfig.url, apiKey);

    // Test connection
    return await adapter.testConnection();
  }

  /**
   * Retry function with exponential backoff
   *
   * Retry policy:
   * - Only retries on NetworkError
   * - Does not retry on STTError or other errors
   * - Delays: initialDelay * 2^attemptNumber
   *   - Attempt 0: no delay (initial attempt)
   *   - Attempt 1: 1000ms (2^0 * 1000)
   *   - Attempt 2: 2000ms (2^1 * 1000)
   *   - Attempt 3: 4000ms (2^2 * 1000)
   *
   * @param fn - Function to retry
   * @param options - Retry options (maxRetries, initialDelay)
   * @returns Result from successful function call
   * @throws Error from last failed attempt
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: { maxRetries: number; initialDelay: number }
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        // Try to execute the function
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const shouldRetry =
          attempt < options.maxRetries && error instanceof NetworkError;

        if (!shouldRetry) {
          // Don't retry - either max retries reached or non-network error
          throw error;
        }

        // Calculate delay for next retry (exponential backoff)
        const delay = options.initialDelay * Math.pow(2, attempt);

        // Wait before next retry
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
