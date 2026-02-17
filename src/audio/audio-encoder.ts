import { Mp3Encoder } from 'lamejs';
import { AudioError } from '../types';

/**
 * AudioEncoder converts raw PCM audio to MP3 or WAV format
 *
 * Features:
 * - MP3 encoding via lamejs (pure-JS LAME encoder, ~1s per minute of audio)
 * - WAV encoding with standard PCM format
 * - Cross-platform support (no native dependencies)
 *
 * Audio Input Format:
 * - Sample rate: 16000 Hz
 * - Channels: Mono (1 channel)
 * - Bit depth: 16-bit PCM
 *
 * Output Formats:
 * - MP3: 128kbps mono via lamejs
 * - WAV: Standard PCM with 44-byte header
 */

type AudioFormat = 'mp3' | 'wav';

export class AudioEncoder {
  /**
   * Encode PCM audio buffer to specified format
   *
   * @param audio - Raw PCM audio buffer (16-bit, mono, 16kHz)
   * @param format - Target format ('mp3' or 'wav')
   * @returns Encoded audio buffer
   * @throws AudioError if encoding fails or invalid parameters
   */
  async encode(audio: Buffer, format: AudioFormat): Promise<Buffer> {
    // Validate input
    if (!audio || !(audio instanceof Buffer)) {
      throw new AudioError('Invalid audio buffer');
    }

    // Validate format
    if (format !== 'mp3' && format !== 'wav') {
      throw new AudioError(`Unsupported format: ${format}`);
    }

    try {
      if (format === 'mp3') {
        return await this.encodeToMP3(audio);
      } else {
        return this.encodeToWAV(audio);
      }
    } catch (error) {
      if (error instanceof AudioError) {
        throw error;
      }
      throw new AudioError(
        'Encoding failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Encode PCM audio to MP3 format using lamejs
   *
   * Uses the lamejs pure-JavaScript LAME encoder — no native binaries
   * or ffmpeg required. Encodes mono 16-bit PCM at 128kbps.
   *
   * @param pcmBuffer - Raw 16-bit PCM audio (mono, 16kHz)
   * @returns MP3-encoded buffer
   */
  private async encodeToMP3(pcmBuffer: Buffer): Promise<Buffer> {
    const sampleRate = 16000;
    const mp3encoder = new Mp3Encoder(1, sampleRate, 128);
    const blockSize = 1152;
    const mp3Chunks: Int8Array[] = [];

    // Convert Buffer to Int16Array (handle odd byte lengths by truncating)
    const byteLength = pcmBuffer.length - (pcmBuffer.length % 2);
    const samples = new Int16Array(
      pcmBuffer.buffer,
      pcmBuffer.byteOffset,
      byteLength / 2
    );

    // Encode in blocks of 1152 samples (MP3 frame size)
    for (let i = 0; i < samples.length; i += blockSize) {
      const chunk = samples.subarray(i, Math.min(i + blockSize, samples.length));
      const encoded = mp3encoder.encodeBuffer(chunk);
      if (encoded.length > 0) {
        mp3Chunks.push(encoded);
      }
    }

    const flushed = mp3encoder.flush();
    if (flushed.length > 0) {
      mp3Chunks.push(flushed);
    }

    // Concatenate all MP3 chunks into a single Buffer
    const totalLength = mp3Chunks.reduce((sum, c) => sum + c.length, 0);
    const result = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (const chunk of mp3Chunks) {
      result.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Encode PCM audio to WAV format
   *
   * WAV format structure:
   * - RIFF header (12 bytes)
   * - fmt chunk (24 bytes)
   * - data chunk header (8 bytes)
   * - PCM audio data
   *
   * Total header size: 44 bytes
   *
   * @param pcmBuffer - Raw PCM audio
   * @returns WAV-encoded buffer with header
   */
  private encodeToWAV(pcmBuffer: Buffer): Promise<Buffer> {
    const headerSize = 44;
    const dataSize = pcmBuffer.length;
    const fileSize = headerSize + dataSize - 8;

    const wavBuffer = Buffer.alloc(headerSize + dataSize);

    // RIFF header
    wavBuffer.write('RIFF', 0, 4, 'ascii');
    wavBuffer.writeUInt32LE(fileSize, 4);
    wavBuffer.write('WAVE', 8, 4, 'ascii');

    // fmt chunk
    wavBuffer.write('fmt ', 12, 4, 'ascii');
    wavBuffer.writeUInt32LE(16, 16); // fmt chunk size
    wavBuffer.writeUInt16LE(1, 20); // PCM format
    wavBuffer.writeUInt16LE(1, 22); // Mono (1 channel)
    wavBuffer.writeUInt32LE(16000, 24); // Sample rate (16kHz)
    wavBuffer.writeUInt32LE(32000, 28); // Byte rate (16000 * 1 * 16/8)
    wavBuffer.writeUInt16LE(2, 32); // Block align (1 channel * 16 bits / 8)
    wavBuffer.writeUInt16LE(16, 34); // Bits per sample

    // data chunk
    wavBuffer.write('data', 36, 4, 'ascii');
    wavBuffer.writeUInt32LE(dataSize, 40);

    // Copy PCM data
    pcmBuffer.copy(wavBuffer, 44);

    return Promise.resolve(wavBuffer);
  }
}
