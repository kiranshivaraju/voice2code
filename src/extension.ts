import * as vscode from 'vscode';

/**
 * Extension activation entry point
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Voice2Code extension is now active');

  // Register commands
  const startRecordingCommand = vscode.commands.registerCommand(
    'voice2code.startRecording',
    () => {
      vscode.window.showInformationMessage('Voice2Code: Start Recording');
      // TODO: Implement recording logic
    }
  );

  const stopRecordingCommand = vscode.commands.registerCommand(
    'voice2code.stopRecording',
    () => {
      vscode.window.showInformationMessage('Voice2Code: Stop Recording');
      // TODO: Implement stop recording logic
    }
  );

  const toggleRecordingCommand = vscode.commands.registerCommand(
    'voice2code.toggleRecording',
    () => {
      vscode.window.showInformationMessage('Voice2Code: Toggle Recording');
      // TODO: Implement toggle logic
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'voice2code.openSettings',
    () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'voice2code');
    }
  );

  const testConnectionCommand = vscode.commands.registerCommand(
    'voice2code.testConnection',
    () => {
      vscode.window.showInformationMessage('Voice2Code: Testing Connection');
      // TODO: Implement connection test
    }
  );

  // Add commands to subscriptions
  context.subscriptions.push(
    startRecordingCommand,
    stopRecordingCommand,
    toggleRecordingCommand,
    openSettingsCommand,
    testConnectionCommand
  );
}

/**
 * Extension deactivation entry point
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  console.log('Voice2Code extension is now deactivated');
  // TODO: Cleanup resources
}
