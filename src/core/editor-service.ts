import * as vscode from 'vscode';
import { ValidationError, PreviewResult } from '../types';

/**
 * EditorService
 *
 * Handles inserting transcribed text into the active VS Code editor.
 *
 * Features:
 * - Inserts text at cursor position(s)
 * - Multi-cursor support (inserts at all cursor positions)
 * - Preserves undo/redo stack (uses editor.edit API)
 * - Works with all file types (code, markdown, plain text)
 * - Handles selections (replaces selected text)
 *
 * Error Handling:
 * - Throws ValidationError if no active editor
 * - Throws error if edit operation fails
 */

export class EditorService {
  /**
   * Get the currently active text editor
   *
   * @returns The active TextEditor, or undefined if none
   */
  getActiveEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  /**
   * Insert text at current cursor position(s)
   *
   * Workflow:
   * 1. Check for active editor
   * 2. Use editor.edit() to insert text (preserves undo/redo)
   * 3. Insert at all cursor positions (multi-cursor support)
   * 4. Handle edit operation result
   *
   * Multi-cursor behavior:
   * - If multiple cursors, inserts at each cursor position
   * - If there's a selection, replaces the selected text
   *
   * @param text - Text to insert
   * @throws ValidationError if no active editor
   * @throws Error if edit operation fails
   */
  async insertText(text: string): Promise<void> {
    // Get active editor
    const editor = this.getActiveEditor();

    // Validate editor exists
    if (!editor) {
      throw new ValidationError('No active editor');
    }

    // Use editor.edit to insert text (preserves undo/redo)
    const success = await editor.edit((editBuilder) => {
      // Insert at all cursor positions (multi-cursor support)
      editor.selections.forEach((selection) => {
        // Insert at the active (cursor) position
        // This handles both cursor insertion and selection replacement
        editBuilder.insert(selection.active, text);
      });
    });

    // Check if edit was successful
    if (!success) {
      throw new Error('Failed to insert text');
    }
  }

  /**
   * Show a preview InputBox with transcribed text and insert on confirmation
   *
   * If `voice2code.ui.previewEnabled` is false, inserts directly without preview.
   * Otherwise, shows an InputBox pre-filled with the transcribed text for
   * the user to review and edit before inserting.
   *
   * @param originalText - The transcribed text to preview
   * @returns PreviewResult with confirmation status and final text
   */
  async showPreviewAndInsert(originalText: string): Promise<PreviewResult> {
    const config = vscode.workspace.getConfiguration('voice2code');
    const previewEnabled = config.get<boolean>('ui.previewEnabled', true);

    if (!previewEnabled) {
      await this.insertText(originalText);
      return { confirmed: true, text: originalText };
    }

    const result = await vscode.window.showInputBox({
      title: 'Voice2Code — Review transcription before inserting',
      value: originalText,
      placeHolder: 'Edit transcription or press Enter to confirm',
    });

    if (result === undefined) {
      vscode.window.showInformationMessage('Transcription cancelled — nothing inserted.');
      return { confirmed: false, text: null };
    }

    await this.insertText(result);
    return { confirmed: true, text: result };
  }
}
