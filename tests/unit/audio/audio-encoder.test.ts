import { AudioEncoder } from '../../../src/audio/audio-encoder';
import { AudioError } from '../../../src/types';

describe('AudioEncoder', () => {
  let encoder: AudioEncoder;

  beforeEach(() => {
    encoder = new AudioEncoder();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(encoder).toBeInstanceOf(AudioEncoder);
    });
  });

  describe('encode - MP3 format', () => {
    it('should encode PCM audio to MP3', async () => {
      // Create mock PCM audio buffer (16kHz, mono, 16-bit)
      const sampleRate = 16000;
      const duration = 1; // 1 second
      const pcmBuffer = Buffer.alloc(sampleRate * 2 * duration); // 2 bytes per sample

      const mp3Buffer = await encoder.encode(pcmBuffer, 'mp3');

      expect(mp3Buffer).toBeInstanceOf(Buffer);
      expect(mp3Buffer.length).toBeGreaterThan(0);
      expect(mp3Buffer.length).toBeLessThan(pcmBuffer.length); // MP3 should be compressed
    });

    it('should handle empty PCM buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const mp3Buffer = await encoder.encode(emptyBuffer, 'mp3');

      expect(mp3Buffer).toBeInstanceOf(Buffer);
    });

    it('should handle very short audio', async () => {
      const shortBuffer = Buffer.alloc(100); // Very short

      const mp3Buffer = await encoder.encode(shortBuffer, 'mp3');

      expect(mp3Buffer).toBeInstanceOf(Buffer);
      expect(mp3Buffer.length).toBeGreaterThan(0);
    });

    it('should handle large audio buffers', async () => {
      // 1 minute of audio at 16kHz
      const largeBuffer = Buffer.alloc(16000 * 2 * 60);

      const mp3Buffer = await encoder.encode(largeBuffer, 'mp3');

      expect(mp3Buffer).toBeInstanceOf(Buffer);
      expect(mp3Buffer.length).toBeGreaterThan(0);
    });

    it('should complete encoding within performance threshold', async () => {
      // 1 minute of audio
      const audioBuffer = Buffer.alloc(16000 * 2 * 60);

      const startTime = Date.now();
      await encoder.encode(audioBuffer, 'mp3');
      const duration = Date.now() - startTime;

      // Should complete in less than 500ms per requirement
      expect(duration).toBeLessThan(500);
    });
  });

  describe('encode - WAV format', () => {
    it('should encode PCM audio to WAV', async () => {
      const sampleRate = 16000;
      const duration = 1;
      const pcmBuffer = Buffer.alloc(sampleRate * 2 * duration);

      const wavBuffer = await encoder.encode(pcmBuffer, 'wav');

      expect(wavBuffer).toBeInstanceOf(Buffer);
      expect(wavBuffer.length).toBeGreaterThan(pcmBuffer.length); // WAV has header
    });

    it('should add WAV header to PCM data', async () => {
      const pcmBuffer = Buffer.alloc(1000);

      const wavBuffer = await encoder.encode(pcmBuffer, 'wav');

      // Check for WAV header signature "RIFF"
      expect(wavBuffer.toString('ascii', 0, 4)).toBe('RIFF');
      // Check for WAV format "WAVE"
      expect(wavBuffer.toString('ascii', 8, 12)).toBe('WAVE');
    });

    it('should handle empty PCM buffer for WAV', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const wavBuffer = await encoder.encode(emptyBuffer, 'wav');

      expect(wavBuffer).toBeInstanceOf(Buffer);
      expect(wavBuffer.length).toBeGreaterThan(0); // Should still have header
    });

    it('should preserve audio data in WAV format', async () => {
      const pcmBuffer = Buffer.alloc(1000);
      // Fill with non-zero data
      pcmBuffer.fill(0xAA);

      const wavBuffer = await encoder.encode(pcmBuffer, 'wav');

      // WAV data starts after 44-byte header
      const wavData = wavBuffer.slice(44);
      expect(wavData.length).toBe(pcmBuffer.length);
    });
  });

  describe('error handling', () => {
    it('should throw AudioError for null buffer', async () => {
      await expect(encoder.encode(null as any, 'mp3')).rejects.toThrow(AudioError);
      await expect(encoder.encode(null as any, 'mp3')).rejects.toThrow('Invalid audio buffer');
    });

    it('should throw AudioError for undefined buffer', async () => {
      await expect(encoder.encode(undefined as any, 'mp3')).rejects.toThrow(AudioError);
      await expect(encoder.encode(undefined as any, 'mp3')).rejects.toThrow('Invalid audio buffer');
    });

    it('should throw AudioError for invalid format', async () => {
      const buffer = Buffer.alloc(1000);

      await expect(encoder.encode(buffer, 'invalid' as any)).rejects.toThrow(AudioError);
      await expect(encoder.encode(buffer, 'invalid' as any)).rejects.toThrow('Unsupported format');
    });

    it('should handle encoding errors gracefully', async () => {
      // Create a very large buffer that might cause issues
      const hugeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      // Should either succeed or throw AudioError, not crash
      try {
        await encoder.encode(hugeBuffer, 'mp3');
      } catch (error) {
        expect(error).toBeInstanceOf(AudioError);
      }
    });
  });

  describe('format validation', () => {
    it('should accept mp3 format (lowercase)', async () => {
      const buffer = Buffer.alloc(1000);

      await expect(encoder.encode(buffer, 'mp3')).resolves.toBeInstanceOf(Buffer);
    });

    it('should accept wav format (lowercase)', async () => {
      const buffer = Buffer.alloc(1000);

      await expect(encoder.encode(buffer, 'wav')).resolves.toBeInstanceOf(Buffer);
    });
  });

  describe('performance', () => {
    it('should encode multiple buffers sequentially', async () => {
      const buffer1 = Buffer.alloc(5000);
      const buffer2 = Buffer.alloc(5000);
      const buffer3 = Buffer.alloc(5000);

      const result1 = await encoder.encode(buffer1, 'mp3');
      const result2 = await encoder.encode(buffer2, 'wav');
      const result3 = await encoder.encode(buffer3, 'mp3');

      expect(result1).toBeInstanceOf(Buffer);
      expect(result2).toBeInstanceOf(Buffer);
      expect(result3).toBeInstanceOf(Buffer);
    });

    it('should handle rapid sequential encoding', async () => {
      const buffer = Buffer.alloc(1000);

      for (let i = 0; i < 10; i++) {
        const result = await encoder.encode(buffer, i % 2 === 0 ? 'mp3' : 'wav');
        expect(result).toBeInstanceOf(Buffer);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle buffers with specific sizes', async () => {
      // Test various buffer sizes
      const sizes = [1, 100, 1000, 10000, 32000];

      for (const size of sizes) {
        const buffer = Buffer.alloc(size);
        const result = await encoder.encode(buffer, 'mp3');
        expect(result).toBeInstanceOf(Buffer);
      }
    });

    it('should handle odd-sized buffers', async () => {
      // Odd number of bytes (not aligned to 16-bit samples)
      const oddBuffer = Buffer.alloc(1001);

      const result = await encoder.encode(oddBuffer, 'mp3');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should produce consistent output for same input', async () => {
      const buffer = Buffer.alloc(1000);
      buffer.fill(0x55);

      const result1 = await encoder.encode(buffer, 'wav');
      const result2 = await encoder.encode(buffer, 'wav');

      // WAV encoding should be deterministic
      expect(result1.equals(result2)).toBe(true);
    });
  });
});
