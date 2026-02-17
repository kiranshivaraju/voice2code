/**
 * Voice2Code Type Definitions
 * Sprint v1
 *
 * All TypeScript interfaces and type definitions for the Voice2Code extension.
 * Strict typing enforced - no 'any' types allowed.
 */

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Configuration for STT endpoint connection
 */
export interface EndpointConfiguration {
  url: string;
  model: string;
  timeout: number;
  customHeaders?: Record<string, string>;
}

/**
 * Audio capture and encoding configuration
 */
export interface AudioConfiguration {
  deviceId: string;
  sampleRate: number;
  format: 'mp3' | 'wav';
}

/**
 * UI preferences and settings
 */
export interface UIConfiguration {
  showStatusBar: boolean;
  showNotifications: boolean;
  playBeep: boolean;
}

// ============================================================================
// Transcription Interfaces
// ============================================================================

/**
 * Options for transcription requests
 */
export interface TranscriptionOptions {
  language?: string;
  temperature?: number;
}

/**
 * Result from transcription service
 */
export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

// ============================================================================
// Audio Interfaces
// ============================================================================

/**
 * Audio input device information
 */
export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  sampleRate?: number;
  channels?: number;
}

// ============================================================================
// Network Interfaces
// ============================================================================

/**
 * Result of an endpoint health check
 */
export interface EndpointHealth {
  reachable: boolean;
  url: string;
  latencyMs: number | null;
  checkedAt: Date;
  isLocalhost: boolean;
}

// ============================================================================
// Validation Interfaces
// ============================================================================

/**
 * Result of validation operations
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Recording state for the audio capture process
 */
export type RecordingState = 'idle' | 'recording' | 'processing';

/**
 * Transcription state for STT operations
 */
export type TranscriptionState = 'pending' | 'in_progress' | 'completed' | 'failed';

// ============================================================================
// Error Types and Classes
// ============================================================================

/**
 * Error codes for Voice2Code operations
 */
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUDIO_ERROR'
  | 'CONFIG_ERROR'
  | 'STT_ERROR'
  | 'VALIDATION_ERROR';

/**
 * Base error class for all Voice2Code errors
 */
export class Voice2CodeError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'Voice2CodeError';
    Object.setPrototypeOf(this, Voice2CodeError.prototype);
  }
}

/**
 * Network-related errors (connection failures, timeouts, etc.)
 */
export class NetworkError extends Voice2CodeError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Audio capture and encoding errors
 */
export class AudioError extends Voice2CodeError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUDIO_ERROR', details);
    this.name = 'AudioError';
    Object.setPrototypeOf(this, AudioError.prototype);
  }
}

/**
 * Configuration and settings errors
 */
export class ConfigurationError extends Voice2CodeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Speech-to-text service errors
 */
export class STTError extends Voice2CodeError {
  constructor(message: string, details?: unknown) {
    super(message, 'STT_ERROR', details);
    this.name = 'STTError';
    Object.setPrototypeOf(this, STTError.prototype);
  }
}

/**
 * Validation errors (invalid input, failed checks, etc.)
 */
export class ValidationError extends Voice2CodeError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
