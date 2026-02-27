/**
 * SilenceDetector unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

import { SilenceDetector } from '../../src/silence-detector';

/** Create a buffer of 16-bit PCM silence (all zeros). */
function silentBuffer(samples: number): Buffer {
  return Buffer.alloc(samples * 2); // 2 bytes per Int16 sample
}

/** Create a buffer of 16-bit PCM with a loud tone. */
function loudBuffer(samples: number, amplitude = 16000): Buffer {
  const buf = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    buf.writeInt16LE(amplitude * (i % 2 === 0 ? 1 : -1), i * 2);
  }
  return buf;
}

describe('SilenceDetector', () => {
  let detector: SilenceDetector;

  beforeEach(() => {
    jest.useFakeTimers();
    detector = new SilenceDetector();
  });

  afterEach(() => {
    detector.reset();
    jest.useRealTimers();
  });

  it('should not emit silence before duration threshold', () => {
    const callback = jest.fn();
    detector.on('silence', callback);

    // Speech detected, then brief silence
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    detector.processChunk(silentBuffer(800)); // 50ms at 16kHz
    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not emit silence if no speech was detected', () => {
    const callback = jest.fn();
    detector.on('silence', callback);

    // Only silence, no speech — should never trigger auto-stop
    for (let i = 0; i < 50; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }

    expect(callback).not.toHaveBeenCalled();
  });

  it('should emit silence after speech followed by sufficient silence', () => {
    const callback = jest.fn();
    detector.on('silence', callback);

    // Speech first
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    // 3.5 seconds of silence (exceeds 3s threshold)
    for (let i = 0; i < 35; i++) {
      detector.processChunk(silentBuffer(1600)); // 100ms chunks
      jest.advanceTimersByTime(100);
    }

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should reset silence timer on loud chunk', () => {
    const callback = jest.fn();
    detector.on('silence', callback);

    // Initial speech
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    // 2 seconds of silence
    for (let i = 0; i < 20; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }

    // Loud chunk resets timer
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    // Another 2 seconds of silence — not enough for 3s threshold
    for (let i = 0; i < 20; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }

    expect(callback).not.toHaveBeenCalled();
  });

  it('should emit after loud chunk followed by enough silence', () => {
    const callback = jest.fn();
    detector.on('silence', callback);

    // Loud chunk
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    // 3.5 seconds of silence
    for (let i = 0; i < 35; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should respect custom silenceDuration', () => {
    detector = new SilenceDetector({ silenceDuration: 1000 });
    const callback = jest.fn();
    detector.on('silence', callback);

    // Speech first
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    // 1.2 seconds of silence at 100ms chunks
    for (let i = 0; i < 12; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should respect custom silenceThreshold', () => {
    // Very high threshold — even loud audio counts as "silent"
    // But we need speech detected first, so use a low-threshold detector
    // to mark speech, then switch scenario:
    // Actually, with threshold 1.0, nothing exceeds it, so hasSpeech stays false.
    // This means silence never fires — which is correct behavior.
    // Instead, test with a moderate threshold where some audio is above and some below.
    detector = new SilenceDetector({ silenceThreshold: 0.3, silenceDuration: 500 });
    const callback = jest.fn();
    detector.on('silence', callback);

    // Loud audio exceeds 0.3 threshold (amplitude 16000 → RMS ~0.49)
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    // Quiet audio below 0.3 threshold (amplitude 5000 → RMS ~0.15)
    for (let i = 0; i < 8; i++) {
      detector.processChunk(loudBuffer(1600, 5000));
      jest.advanceTimersByTime(100);
    }

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not emit repeatedly without new silence period', () => {
    detector = new SilenceDetector({ silenceDuration: 500 });
    const callback = jest.fn();
    detector.on('silence', callback);

    // Speech first
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);

    // Emit once after 500ms of silence
    for (let i = 0; i < 8; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }
    expect(callback).toHaveBeenCalledTimes(1);

    // More silence — should NOT emit again
    for (let i = 0; i < 10; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should emit again after reset and new silence', () => {
    detector = new SilenceDetector({ silenceDuration: 500 });
    const callback = jest.fn();
    detector.on('silence', callback);

    // Speech then silence
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);
    for (let i = 0; i < 8; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }
    expect(callback).toHaveBeenCalledTimes(1);

    detector.reset();

    // Speech then silence again
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);
    for (let i = 0; i < 8; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('reset() should clear accumulated silence time and speech flag', () => {
    const callback = jest.fn();
    detector.on('silence', callback);

    // Speech then 2 seconds of silence (under 3s threshold)
    detector.processChunk(loudBuffer(1600));
    jest.advanceTimersByTime(100);
    for (let i = 0; i < 20; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }

    detector.reset();

    // Only silence after reset — no speech detected, so no emission
    for (let i = 0; i < 40; i++) {
      detector.processChunk(silentBuffer(1600));
      jest.advanceTimersByTime(100);
    }

    expect(callback).not.toHaveBeenCalled();
  });
});
