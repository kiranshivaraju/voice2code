import { EventEmitter } from 'events';
import { DeviceManager } from './device-manager';
import { AudioConfiguration, AudioError } from '../types';
import * as record from 'node-record-lpcm16';

/**
 * AudioManager handles real microphone capture via node-record-lpcm16
 *
 * Features:
 * - Real audio capture from system microphone via sox
 * - Device fallback when selected device is unavailable
 * - In-memory buffering of audio chunks
 * - State management (idle/capturing)
 * - EventEmitter for deviceFallback and error events
 *
 * System dependency: requires sox installed
 * - macOS: brew install sox
 * - Linux: sudo apt-get install sox
 * - Windows: SoX for Windows
 */

type RecordingState = 'idle' | 'capturing';

export class AudioManager extends EventEmitter {
  private _state: RecordingState = 'idle';
  private _audioChunks: Buffer[] = [];
  private _recording: any = null;

  constructor(private deviceManager: DeviceManager) {
    super();
  }

  /**
   * Start audio capture from specified device
   *
   * If the requested device is unavailable, emits 'deviceFallback' and
   * falls back to the system default device.
   *
   * @param config - Audio configuration (device, sample rate, format)
   * @throws AudioError if already capturing
   * @throws AudioError if no device is available (including default)
   */
  async startCapture(config: AudioConfiguration): Promise<void> {
    if (this._state === 'capturing') {
      throw new AudioError('Already capturing audio');
    }

    let deviceId = config.deviceId;

    // Verify device availability, fall back to default if needed
    const deviceAvailable = await this.deviceManager.isDeviceAvailable(deviceId);
    if (!deviceAvailable) {
      if (deviceId !== 'default') {
        // Try falling back to default
        const defaultAvailable = await this.deviceManager.isDeviceAvailable('default');
        if (defaultAvailable) {
          this.emit('deviceFallback', {
            originalId: deviceId,
            fallbackName: 'System Default',
          });
          deviceId = 'default';
        } else {
          throw new AudioError(`Device not available: ${config.deviceId}`);
        }
      } else {
        throw new AudioError(`Device not available: ${config.deviceId}`);
      }
    }

    console.log(`Starting audio capture with sample rate: ${config.sampleRate}Hz`);

    this._audioChunks = [];

    // Ensure Homebrew/common binary paths are in PATH
    // VS Code's extension host inherits a minimal PATH that may not include them
    const extraPaths = ['/opt/homebrew/bin', '/usr/local/bin'];
    const currentPath = process.env.PATH || '';
    for (const p of extraPaths) {
      if (!currentPath.includes(p)) {
        process.env.PATH = `${p}:${currentPath}`;
      }
    }

    // Start real recording via node-record-lpcm16
    // Use 'rec' on macOS (part of sox), 'sox' elsewhere
    const recorder = process.platform === 'darwin' ? 'rec' : 'sox';
    this._recording = record.record({
      sampleRate: config.sampleRate,
      channels: 1,
      device: deviceId === 'default' ? null : deviceId,
      audioType: 'raw',
      recorder,
    });

    // Listen for data on the recording stream
    const stream = this._recording.stream();
    stream.on('data', (chunk: Buffer) => {
      this._audioChunks.push(chunk);
      this.emit('data', chunk);
    });
    stream.on('error', (err: Error) => {
      this.emit('error', err);
    });

    this._state = 'capturing';
  }

  /**
   * Stop audio capture and return recorded buffer
   *
   * @returns Buffer containing all recorded PCM audio data
   * @throws AudioError if not currently capturing
   */
  async stopCapture(): Promise<Buffer> {
    if (this._state !== 'capturing') {
      throw new AudioError('Not currently capturing audio');
    }

    try {
      if (this._recording) {
        this._recording.stop();
        this._recording = null;
      }

      const finalBuffer =
        this._audioChunks.length > 0 ? Buffer.concat(this._audioChunks) : Buffer.alloc(0);

      this._audioChunks = [];
      this._state = 'idle';

      return finalBuffer;
    } catch (error) {
      this._state = 'idle';
      this._audioChunks = [];
      this._recording = null;

      throw error;
    }
  }

  /**
   * Check if currently capturing audio
   */
  isCapturing(): boolean {
    return this._state === 'capturing';
  }
}
