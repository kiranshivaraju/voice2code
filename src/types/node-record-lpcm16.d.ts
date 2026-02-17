declare module 'node-record-lpcm16' {
  import { Readable } from 'stream';

  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    device?: string | null;
    audioType?: string;
    recorder?: string;
    threshold?: number;
    silence?: string;
    endOnSilence?: boolean;
    compress?: boolean;
  }

  interface Recording {
    stream(): Readable;
    stop(): void;
    pause(): void;
    resume(): void;
    isPaused(): boolean;
  }

  export function record(options?: RecordOptions): Recording;
}
