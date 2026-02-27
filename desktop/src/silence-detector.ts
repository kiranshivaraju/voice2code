/**
 * SilenceDetector — Monitors raw 16-bit PCM audio chunks and emits
 * a 'silence' event when consecutive silence exceeds a duration threshold.
 */

import { EventEmitter } from 'events';

export interface SilenceDetectorOptions {
  /** RMS threshold below which audio is considered silent (0-1 range). Default: 0.005 */
  silenceThreshold?: number;
  /** Duration of continuous silence (ms) before emitting 'silence'. Default: 3000 */
  silenceDuration?: number;
}

export class SilenceDetector extends EventEmitter {
  private readonly threshold: number;
  private readonly duration: number;
  private silenceStart: number | null = null;
  private emitted = false;
  private hasSpeech = false;

  constructor(options: SilenceDetectorOptions = {}) {
    super();
    this.threshold = options.silenceThreshold ?? 0.005;
    this.duration = options.silenceDuration ?? 3000;
  }

  /** Feed a raw 16-bit PCM buffer (mono, little-endian). */
  processChunk(chunk: Buffer): void {
    const rms = this.calculateRMS(chunk);
    const now = Date.now();

    if (rms < this.threshold) {
      // Silent chunk — only start tracking after speech has been detected
      if (this.hasSpeech && this.silenceStart === null) {
        this.silenceStart = now;
      }
      if (!this.emitted && this.hasSpeech && this.silenceStart !== null && now - this.silenceStart >= this.duration) {
        this.emitted = true;
        this.emit('silence');
      }
    } else {
      // Loud chunk — mark speech detected, reset silence timer
      this.hasSpeech = true;
      this.silenceStart = null;
      this.emitted = false;
    }
  }

  /** Reset all internal state. */
  reset(): void {
    this.silenceStart = null;
    this.emitted = false;
    this.hasSpeech = false;
  }

  private calculateRMS(buf: Buffer): number {
    const samples = buf.length / 2;
    if (samples === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < samples; i++) {
      const sample = buf.readInt16LE(i * 2) / 32768; // normalize to -1..1
      sumSquares += sample * sample;
    }
    return Math.sqrt(sumSquares / samples);
  }
}
