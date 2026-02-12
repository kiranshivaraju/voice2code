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

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  sampleRate?: number;
  channels?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export class Voice2CodeBaseError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'Voice2CodeBaseError';
    Object.setPrototypeOf(this, Voice2CodeBaseError.prototype);
  }
}

export class AudioError extends Voice2CodeBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUDIO_ERROR', details);
    this.name = 'AudioError';
    Object.setPrototypeOf(this, AudioError.prototype);
  }
}

export class ConfigurationError extends Voice2CodeBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class NetworkError extends Voice2CodeBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class STTError extends Voice2CodeBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'STT_ERROR', details);
    this.name = 'STTError';
    Object.setPrototypeOf(this, STTError.prototype);
  }
}

export class ValidationError extends Voice2CodeBaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
