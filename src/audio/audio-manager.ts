import { DeviceManager } from './device-manager';
import { AudioConfiguration, AudioError } from '../types';

/**
 * AudioManager handles audio capture with start/stop lifecycle and buffer management
 *
 * Features:
 * - Audio capture from specified device
 * - Configurable sample rate and format
 * - In-memory buffering of audio chunks
 * - State management (idle/capturing)
 * - Resource cleanup
 *
 * Audio Format:
 * - Sample rate: configurable (default 16000 Hz)
 * - Channels: Mono (1 channel)
 * - Bit depth: 16-bit PCM
 * - Format: WAV (raw PCM) before encoding
 */

type RecordingState = 'idle' | 'capturing';

export class AudioManager {
  private _state: RecordingState = 'idle';
  private _audioChunks: Buffer[] = [];
  private _recordingStream: any = null;
  private _currentConfig: AudioConfiguration | null = null;

  constructor(private deviceManager: DeviceManager) {}

  /**
   * Start audio capture from specified device
   *
   * Workflow:
   * 1. Check not already capturing
   * 2. Verify device is available
   * 3. Start recording stream
   * 4. Begin buffering audio chunks
   *
   * @param config - Audio configuration (device, sample rate, format)
   * @throws AudioError if already capturing
   * @throws AudioError if device not available
   */
  async startCapture(config: AudioConfiguration): Promise<void> {
    // Check state
    if (this._state === 'capturing') {
      throw new AudioError('Already capturing audio');
    }

    // Verify device availability
    const deviceAvailable = await this.deviceManager.isDeviceAvailable(config.deviceId);
    if (!deviceAvailable) {
      throw new AudioError(`Device not available: ${config.deviceId}`);
    }

    // Store configuration for reference
    this._currentConfig = config;
    console.log(`Starting audio capture with sample rate: ${this._currentConfig.sampleRate}Hz`);

    // Initialize audio chunks array
    this._audioChunks = [];

    // Start mock recording stream
    // In a real implementation, this would use node-record-lpcm16 or similar
    // For now, we create a mock stream that simulates audio capture
    this._recordingStream = this.createMockRecordingStream(config);

    // Update state
    this._state = 'capturing';
  }

  /**
   * Stop audio capture and return recorded buffer
   *
   * Workflow:
   * 1. Check currently capturing
   * 2. Stop recording stream
   * 3. Concatenate all audio chunks
   * 4. Clear chunks array
   * 5. Return final buffer
   *
   * @returns Buffer containing all recorded audio data
   * @throws AudioError if not currently capturing
   */
  async stopCapture(): Promise<Buffer> {
    // Check state
    if (this._state !== 'capturing') {
      throw new AudioError('Not currently capturing audio');
    }

    try {
      // Stop recording stream
      if (this._recordingStream) {
        this._recordingStream.stop();
        this._recordingStream = null;
      }

      // Concatenate all audio chunks into single buffer
      const finalBuffer = this._audioChunks.length > 0
        ? Buffer.concat(this._audioChunks)
        : Buffer.alloc(0);

      // Clear chunks
      this._audioChunks = [];

      // Reset state
      this._state = 'idle';
      this._currentConfig = null;

      return finalBuffer;
    } catch (error) {
      // Ensure state is reset even on error
      this._state = 'idle';
      this._audioChunks = [];
      this._recordingStream = null;
      this._currentConfig = null;

      throw error;
    }
  }

  /**
   * Check if currently capturing audio
   *
   * @returns true if capturing, false otherwise
   */
  isCapturing(): boolean {
    return this._state === 'capturing';
  }

  /**
   * Create a mock recording stream for testing
   *
   * In a real implementation, this would use a library like:
   * - node-record-lpcm16
   * - node-mic
   * - sox-audio
   *
   * The mock stream simulates audio data by:
   * 1. Creating small audio chunks at regular intervals
   * 2. Pushing them to the chunks array
   * 3. Providing a stop() method
   *
   * @param config - Audio configuration
   * @returns Mock recording stream object
   */
  private createMockRecordingStream(config: AudioConfiguration): any {
    // Calculate chunk size for mock data
    // At 16kHz, 16-bit, mono: 16000 samples/sec * 2 bytes = 32000 bytes/sec
    // Generate chunk every 100ms = 3200 bytes per chunk
    const bytesPerSample = 2; // 16-bit
    const chunkDurationMs = 100;
    const chunkSize = Math.floor(
      (config.sampleRate * bytesPerSample * chunkDurationMs) / 1000
    );

    let interval: NodeJS.Timeout | null = null;

    // Start generating mock audio chunks
    interval = setInterval(() => {
      // Generate mock audio data (silence = zeros)
      const chunk = Buffer.alloc(chunkSize);
      this._audioChunks.push(chunk);
    }, chunkDurationMs);

    // Return mock stream object with stop method
    return {
      stop: () => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      },
    };
  }
}
