/**
 * Type definitions for Voice2Code extension
 */

export interface EndpointConfiguration {
  url: string;
  model: string;
  timeout: number;
  customHeaders?: Record<string, string>;
}

export interface AudioConfiguration {
  deviceId: string;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  format: 'mp3' | 'wav';
}

export interface UIConfiguration {
  previewEnabled: boolean;
  showStatusBar: boolean;
  audioFeedback: boolean;
  notifyOnError: boolean;
}

export interface HistoryConfiguration {
  enabled: boolean;
  maxItems: number;
}

export interface TranscriptionOptions {
  model: string;
  language?: string;
  prompt?: string;
  temperature?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
}

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUDIO_ERROR'
  | 'CONFIG_ERROR'
  | 'STT_ERROR'
  | 'VALIDATION_ERROR';

export interface Voice2CodeError {
  code: ErrorCode;
  message: string;
  details?: string;
  timestamp: number;
  context?: Record<string, unknown>;
}
