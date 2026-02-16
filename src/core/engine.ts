import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/configuration-manager';
import { RecordingState, TranscriptionOptions } from '../types';

/**
 * Voice2CodeEngine
 *
 * Main orchestrator that coordinates all components for speech-to-text workflow.
 * Manages the complete recording, transcription, and text insertion lifecycle.
 *
 * Workflow:
 * 1. User starts recording → AudioManager captures audio
 * 2. User stops recording → Audio encoded to MP3
 * 3. Audio sent to TranscriptionService → Text returned
 * 4. Text inserted via EditorService
 * 5. Status bar and notifications updated throughout
 */

// Temporary interface definitions for dependencies not yet implemented
// These will be replaced when the actual components are implemented
interface AudioManager {
  startCapture(config: any): void;
  stopCapture(): Promise<Buffer>;
  isCapturing(): boolean;
}

interface TranscriptionService {
  transcribe(audio: Buffer, options: TranscriptionOptions): Promise<{ text: string }>;
  testConnection(): Promise<boolean>;
}

interface EditorService {
  insertText(text: string): Promise<boolean>;
  getActiveEditor(): any;
}

interface StatusBarController {
  updateStatus(text: string, state: RecordingState): void;
  show(): void;
  hide(): void;
}

export class Voice2CodeEngine {
  private _recordingState: RecordingState = 'idle';

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigurationManager,
    private audioManager: AudioManager,
    private transcriptionService: TranscriptionService,
    private editorService: EditorService,
    private statusBar: StatusBarController
  ) {
    // Store context for future use (command registration, etc.)
    console.log('Voice2CodeEngine initialized with context:', this.context.extensionPath);
  }

  /**
   * Start audio recording
   *
   * Workflow:
   * 1. Check state is not already recording/processing
   * 2. Get audio config from ConfigurationManager
   * 3. Update status bar to "Recording..." (red)
   * 4. Start audio capture via AudioManager
   * 5. Set state to 'recording'
   * 6. Show notification
   */
  async startRecording(): Promise<void> {
    // Check state - don't start if already recording or processing
    if (this._recordingState !== 'idle') {
      return;
    }

    // Get audio configuration
    const audioConfig = this.configManager.getAudioConfig();

    // Update status bar
    this.statusBar.updateStatus('Recording...', 'recording');

    // Start audio capture
    this.audioManager.startCapture(audioConfig);

    // Update state
    this._recordingState = 'recording';

    // Show notification
    vscode.window.showInformationMessage('Recording started');
  }

  /**
   * Stop recording and transcribe
   *
   * Workflow:
   * 1. Check state is 'recording'
   * 2. Update status bar to "Transcribing..." (yellow)
   * 3. Stop audio capture, get buffer
   * 4. Set state to 'processing'
   * 5. Call TranscriptionService.transcribe()
   * 6. Insert text via EditorService
   * 7. Update status bar to "Inserted" (green)
   * 8. Set state to 'idle'
   * 9. Show notification
   *
   * Error handling:
   * - Catch all errors
   * - Update status bar to "Error" (red)
   * - Set state to 'idle'
   * - Show error notification
   */
  async stopRecording(): Promise<void> {
    // Check state - only stop if recording
    if (this._recordingState !== 'recording') {
      return;
    }

    try {
      // Update status bar
      this.statusBar.updateStatus('Transcribing...', 'processing');

      // Stop audio capture and get buffer
      const audioBuffer = await this.audioManager.stopCapture();

      // Set state to processing
      this._recordingState = 'processing';

      // Check if buffer is valid
      if (!audioBuffer) {
        throw new Error('No audio data captured');
      }

      // Transcribe audio
      const result = await this.transcriptionService.transcribe(audioBuffer, {});

      // Insert text into editor
      await this.editorService.insertText(result.text);

      // Update status bar
      this.statusBar.updateStatus('Inserted', 'idle');

      // Set state to idle
      this._recordingState = 'idle';

      // Show notification
      vscode.window.showInformationMessage('Text inserted');
    } catch (error) {
      // Update status bar to error
      this.statusBar.updateStatus('Error', 'idle');

      // Reset state to idle
      this._recordingState = 'idle';

      // Show error notification
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Transcription failed: ${errorMessage}`);
    }
  }

  /**
   * Toggle recording on/off
   *
   * Logic:
   * - If idle → start recording
   * - If recording → stop recording
   * - If processing → show warning
   */
  async toggleRecording(): Promise<void> {
    if (this._recordingState === 'idle') {
      await this.startRecording();
    } else if (this._recordingState === 'recording') {
      await this.stopRecording();
    } else if (this._recordingState === 'processing') {
      vscode.window.showWarningMessage('Already processing');
    }
  }

  /**
   * Test connection to STT service
   *
   * @returns true if connection successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.transcriptionService.testConnection();

      if (result) {
        vscode.window.showInformationMessage('Connection test successful');
      } else {
        vscode.window.showErrorMessage('Connection test failed');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Connection test failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Open VS Code settings for Voice2Code extension
   */
  openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'voice2code');
  }

  /**
   * Get current recording state
   *
   * @returns true if currently recording, false otherwise
   */
  get isRecording(): boolean {
    return this._recordingState === 'recording';
  }
}
