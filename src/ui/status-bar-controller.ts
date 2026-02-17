import * as vscode from 'vscode';
import { RecordingState } from '../types';

/**
 * StatusBarController
 *
 * Manages the VS Code status bar item to display recording state.
 *
 * Features:
 * - Shows current recording state with appropriate icon
 * - Color-coded states (red for recording, yellow for processing)
 * - Uses VS Code Codicons for visual feedback
 * - Automatic cleanup through context subscriptions
 *
 * State Indicators:
 * - Idle: $(mic) {text} (white/default)
 * - Recording: $(record) {text} (red)
 * - Processing: $(sync~spin) {text} (yellow)
 */

export class StatusBarController {
  private statusBarItem: vscode.StatusBarItem;

  /**
   * Create status bar controller
   *
   * Initializes a status bar item on the right side with priority 100.
   * Adds to context subscriptions for automatic disposal.
   *
   * @param context - VS Code extension context
   */
  constructor(context: vscode.ExtensionContext) {
    // Create status bar item (right-aligned, priority 100)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    // Add to subscriptions for automatic cleanup
    context.subscriptions.push(this.statusBarItem);

    // Initialize with idle state
    this.updateStatus('Voice2Code', 'idle');
  }

  /**
   * Update status bar text and state
   *
   * Sets the text and icon based on recording state.
   * Automatically shows the status bar after update.
   *
   * State mapping:
   * - idle: $(mic) icon, default color
   * - recording: $(record) icon, red color (#ff0000)
   * - processing: $(sync~spin) icon, yellow color (#ffcc00)
   *
   * @param text - Text to display (icon will be prepended)
   * @param state - Recording state
   */
  updateStatus(text: string, state: RecordingState): void {
    // Map state to icon and color
    const { icon, color } = this.getStateAppearance(state);

    // Set status bar text with icon
    this.statusBarItem.text = `${icon} ${text}`;

    // Set color (undefined for default/white)
    this.statusBarItem.color = color;

    // Show status bar
    this.statusBarItem.show();
  }

  /**
   * Set warning state on status bar
   *
   * Shows warning icon with yellow/orange color.
   * Used when endpoint is unreachable before recording.
   * Resets to idle on next successful recording start.
   */
  setWarning(): void {
    this.statusBarItem.text = '$(warning) Voice2Code';
    this.statusBarItem.color = '#ffcc00';
    this.statusBarItem.show();
  }

  /**
   * Show status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose status bar item
   *
   * Cleanup method called when extension deactivates.
   * Also called automatically through context subscriptions.
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }

  /**
   * Get icon and color for recording state
   *
   * @param state - Recording state
   * @returns Icon (codicon string) and color (hex or undefined)
   */
  private getStateAppearance(state: RecordingState): {
    icon: string;
    color: string | undefined;
  } {
    switch (state) {
      case 'recording':
        return {
          icon: '$(record)',
          color: '#ff0000', // Red
        };

      case 'processing':
        return {
          icon: '$(sync~spin)',
          color: '#ffcc00', // Yellow
        };

      case 'idle':
      default:
        return {
          icon: '$(mic)',
          color: undefined, // Default/white
        };
    }
  }
}
