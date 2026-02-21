/**
 * DesktopEngine — State machine that orchestrates the recording lifecycle:
 * capture → encode → transcribe → paste.
 */

import { RecordingState, Voice2CodeError, NetworkError, AudioError, STTError } from '@core/types';
import { ConfigStore } from './config-store';
import { SecretStore } from './secret-store';
import { TrayManager } from './tray';
import { pasteText } from './paste';

type NotifyFn = (title: string, body: string) => void;

interface AudioManagerLike {
  startCapture(config: { deviceId: string; sampleRate: number; format: string }): Promise<void>;
  stopCapture(): Promise<Buffer>;
}

interface AudioEncoderLike {
  encode(audio: Buffer, format: string): Promise<Buffer>;
}

interface AdapterFactoryLike {
  createAdapter(endpointUrl: string, apiKey?: string): {
    transcribe(audio: Buffer, options: { model: string; language: string }): Promise<{ text: string }>;
  };
}

export class DesktopEngine {
  private state: RecordingState = 'idle';

  constructor(
    private configStore: ConfigStore,
    private secretStore: SecretStore,
    private audioManager: AudioManagerLike,
    private audioEncoder: AudioEncoderLike,
    private trayManager: TrayManager,
    private notify: NotifyFn,
    private adapterFactory: AdapterFactoryLike
  ) {}

  async toggleRecording(): Promise<void> {
    switch (this.state) {
      case 'idle':
        await this.startRecording();
        break;
      case 'recording':
        await this.stopRecording();
        break;
      case 'processing':
        break;
    }
  }

  async startRecording(): Promise<void> {
    if (this.state !== 'idle') return;

    this.state = 'recording';
    this.trayManager.setState('recording');

    try {
      const audioConfig = this.configStore.getAudioConfig();
      await this.audioManager.startCapture(audioConfig);
    } catch (error) {
      this.state = 'idle';
      this.trayManager.setState('idle');
      this.notifyError(error);
    }
  }

  async stopRecording(): Promise<void> {
    if (this.state !== 'recording') return;

    this.state = 'processing';
    this.trayManager.setState('processing');

    try {
      const pcmBuffer = await this.audioManager.stopCapture();
      const audioConfig = this.configStore.getAudioConfig();
      const encodedBuffer = await this.audioEncoder.encode(pcmBuffer, audioConfig.format);

      const endpointConfig = this.configStore.getEndpointConfig();
      const apiKey = this.secretStore.getApiKey();
      const adapter = this.adapterFactory.createAdapter(endpointConfig.url, apiKey ?? undefined);
      const result = await adapter.transcribe(encodedBuffer, {
        model: endpointConfig.model,
        language: endpointConfig.language,
      });

      await pasteText(result.text);
    } catch (error) {
      this.notifyError(error);
    } finally {
      this.state = 'idle';
      this.trayManager.setState('idle');
    }
  }

  getState(): RecordingState {
    return this.state;
  }

  private notifyError(error: unknown): void {
    if (error instanceof NetworkError) {
      const message = error.message;
      if (message.includes('ECONNREFUSED') || message.includes('Cannot connect')) {
        this.notify('Connection Failed', 'Cannot connect to STT endpoint. Is your service running?');
      } else if (message.includes('ETIMEDOUT') || message.includes('timed out')) {
        this.notify('Connection Timed Out', 'STT endpoint took too long. Try increasing the timeout.');
      } else if (message.includes('Authentication') || message.includes('401') || message.includes('403')) {
        this.notify('Authentication Failed', 'Check your API key in Settings.');
      } else {
        this.notify('Network Error', message);
      }
    } else if (error instanceof STTError) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        this.notify('Model Not Found', 'Check the model name in Settings.');
      } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
        this.notify('Rate Limited', 'Too many requests. Wait a moment and try again.');
      } else {
        this.notify('Transcription Error', error.message);
      }
    } else if (error instanceof AudioError) {
      this.notify('Recording Failed', error.message);
    } else if (error instanceof Voice2CodeError) {
      this.notify('Error', error.message);
    } else {
      this.notify('Error', 'An unexpected error occurred. Check console for details.');
      console.error('Unexpected error:', error);
    }
  }
}
