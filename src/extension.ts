import * as vscode from 'vscode';
import { ConfigurationManager } from './config/configuration-manager';
import { DeviceManager } from './audio/device-manager';
import { AudioManager } from './audio/audio-manager';
import { AdapterFactory } from './adapters/adapter-factory';
import { Voice2CodeEngine } from './core/engine';
import { HistoryManager } from './core/history-manager';
import { SettingsPanelProvider } from './ui/settings-panel';
import { RecordingState, TranscriptionOptions } from './types';

/**
 * Global engine instance
 * Stored globally to allow cleanup in deactivate()
 */
let engine: Voice2CodeEngine | undefined;

// Temporary service implementations
// These will be replaced when the actual services are implemented

class TranscriptionService {
  constructor(
    private adapterFactory: AdapterFactory,
    private configManager: ConfigurationManager
  ) {}

  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<{ text: string }> {
    const config = this.configManager.getEndpointConfig();
    const apiKey = await this.configManager.getApiKey();
    const adapter = this.adapterFactory.createAdapter(config.url, apiKey);
    return adapter.transcribe(audio, options);
  }

  async testConnection(): Promise<boolean> {
    const config = this.configManager.getEndpointConfig();
    const apiKey = await this.configManager.getApiKey();
    const adapter = this.adapterFactory.createAdapter(config.url, apiKey);
    return adapter.testConnection();
  }
}

class EditorService {
  getActiveEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  async insertText(text: string): Promise<boolean> {
    // Try text editor first
    const editor = this.getActiveEditor();
    if (editor) {
      return await editor.edit((editBuilder) => {
        editor.selections.forEach((selection) => {
          editBuilder.insert(selection.active, text);
        });
      });
    }

    // Fall back to active terminal
    const terminal = vscode.window.activeTerminal;
    if (terminal) {
      terminal.sendText(text, false); // false = don't append newline
      return true;
    }

    // Universal fallback: copy to clipboard and paste into whatever has focus
    // Works with extension webviews (Claude Code, etc.), search boxes, etc.
    await vscode.env.clipboard.writeText(text);
    await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    return true;
  }
}

class StatusBarController {
  private statusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    context.subscriptions.push(this.statusBarItem);
    this.updateStatus('Voice2Code', 'idle');
  }

  updateStatus(text: string, state: RecordingState): void {
    const { icon, color } = this.getStateAppearance(state);
    this.statusBarItem.text = `${icon} ${text}`;
    this.statusBarItem.color = color;
    this.statusBarItem.show();
  }

  show(): void {
    this.statusBarItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

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

/**
 * Extension activation entry point
 *
 * Initializes all services and registers commands.
 * This is called when the extension is activated.
 *
 * Architecture:
 * - Instantiates all service dependencies
 * - Creates Voice2CodeEngine with dependency injection
 * - Registers 5 VS Code commands with error handling
 * - Adds all disposables to context.subscriptions for cleanup
 *
 * @param context - VS Code extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Voice2Code extension is now active');

  // Instantiate all service dependencies
  const configManager = new ConfigurationManager(context);
  const deviceManager = new DeviceManager();
  const audioManager = new AudioManager(deviceManager);
  const adapterFactory = new AdapterFactory();
  const transcriptionService = new TranscriptionService(adapterFactory, configManager);
  const editorService = new EditorService();
  const statusBar = new StatusBarController(context);
  const historyManager = new HistoryManager(context, editorService as any);
  const settingsPanel = new SettingsPanelProvider(context, deviceManager, historyManager, configManager);

  // Create Voice2CodeEngine with all dependencies
  engine = new Voice2CodeEngine(
    context,
    configManager,
    audioManager,
    transcriptionService,
    editorService,
    statusBar
  );

  // Register voice2code.startRecording command
  const startRecordingCommand = vscode.commands.registerCommand(
    'voice2code.startRecording',
    async () => {
      try {
        await engine!.startRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Voice2Code: Failed to start recording - ${message}`);
      }
    }
  );

  // Register voice2code.stopRecording command
  const stopRecordingCommand = vscode.commands.registerCommand(
    'voice2code.stopRecording',
    async () => {
      try {
        await engine!.stopRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Voice2Code: Failed to stop recording - ${message}`);
      }
    }
  );

  // Register voice2code.toggleRecording command
  const toggleRecordingCommand = vscode.commands.registerCommand(
    'voice2code.toggleRecording',
    async () => {
      try {
        await engine!.toggleRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Voice2Code: Failed to toggle recording - ${message}`);
      }
    }
  );

  // Register voice2code.testConnection command
  const testConnectionCommand = vscode.commands.registerCommand(
    'voice2code.testConnection',
    async () => {
      try {
        await engine!.testConnection();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Voice2Code: Connection test failed - ${message}`);
      }
    }
  );

  // Register voice2code.openSettings command (opens Webview panel)
  const openSettingsCommand = vscode.commands.registerCommand(
    'voice2code.openSettings',
    async () => {
      try {
        await settingsPanel.openOrReveal();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Voice2Code: Failed to open settings - ${message}`);
      }
    }
  );

  // Register voice2code.showHistory command
  const showHistoryCommand = vscode.commands.registerCommand(
    'voice2code.showHistory',
    () => historyManager.showHistory()
  );

  // Register voice2code.clearHistory command
  const clearHistoryCommand = vscode.commands.registerCommand(
    'voice2code.clearHistory',
    async () => {
      const choice = await vscode.window.showWarningMessage(
        'Clear all transcription history?', 'Clear', 'Cancel'
      );
      if (choice === 'Clear') {
        await historyManager.clear();
      }
    }
  );

  // Register voice2code.setApiKey command
  const setApiKeyCommand = vscode.commands.registerCommand(
    'voice2code.setApiKey',
    async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your STT API key (e.g. Groq, OpenAI)',
        password: true,
        placeHolder: 'gsk_... or sk-...',
        ignoreFocusOut: true,
      });
      if (key) {
        await configManager.setApiKey(key);
        vscode.window.showInformationMessage('API key saved securely');
      }
    }
  );

  // Register voice2code.deleteApiKey command
  const deleteApiKeyCommand = vscode.commands.registerCommand(
    'voice2code.deleteApiKey',
    async () => {
      await configManager.deleteApiKey();
      vscode.window.showInformationMessage('API key deleted');
    }
  );

  // Add all command disposables to context subscriptions for cleanup
  context.subscriptions.push(
    startRecordingCommand,
    stopRecordingCommand,
    toggleRecordingCommand,
    testConnectionCommand,
    openSettingsCommand,
    showHistoryCommand,
    clearHistoryCommand,
    setApiKeyCommand,
    deleteApiKeyCommand
  );
}

/**
 * Extension deactivation entry point
 *
 * Cleans up resources when the extension is deactivated.
 * Disposes the engine and all registered services.
 *
 * Note: context.subscriptions are automatically disposed by VS Code,
 * but we explicitly dispose the engine for proper cleanup.
 */
export function deactivate(): void {
  console.log('Voice2Code extension is now deactivated');

  // Dispose engine if it exists
  if (engine) {
    engine.dispose();
    engine = undefined;
  }
}
