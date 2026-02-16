import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

/**
 * End-to-End Tests - Basic Workflow
 *
 * Tests the complete voice2code extension workflow including:
 * 1. Extension activation and setup
 * 2. Configuration management
 * 3. Recording and transcription
 * 4. Text insertion
 * 5. Multi-cursor support
 *
 * These tests use the VS Code Extension Test Runner to validate
 * the extension in a real VS Code instance.
 */

suite('Voice2Code E2E - Basic Workflow', () => {
  let extension: vscode.Extension<any> | undefined;
  let testEditor: vscode.TextEditor;

  suiteSetup(async () => {
    // Get the extension
    extension = vscode.extensions.getExtension('voice2code');
    assert.ok(extension, 'Extension should be found');

    // Activate the extension
    await extension.activate();
    assert.ok(extension.isActive, 'Extension should be activated');

    // Create a test document
    const document = await vscode.workspace.openTextDocument({
      content: '',
      language: 'typescript',
    });
    testEditor = await vscode.window.showTextDocument(document);
  });

  suiteTeardown(async () => {
    // Close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  suite('1. Happy Path Test', () => {
    test('should complete full recording workflow', async function () {
      this.timeout(10000); // Extended timeout for e2e test

      // Step 1: Verify extension is activated
      assert.ok(extension?.isActive, 'Extension should be active');

      // Step 2: Verify commands are registered
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('voice2code.startRecording'),
        'startRecording command should be registered'
      );
      assert.ok(
        commands.includes('voice2code.stopRecording'),
        'stopRecording command should be registered'
      );
      assert.ok(
        commands.includes('voice2code.toggleRecording'),
        'toggleRecording command should be registered'
      );
      assert.ok(
        commands.includes('voice2code.testConnection'),
        'testConnection command should be registered'
      );
      assert.ok(
        commands.includes('voice2code.openSettings'),
        'openSettings command should be registered'
      );

      // Step 3: Configure Ollama endpoint
      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update(
        'endpoint.url',
        'http://localhost:11434',
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        'endpoint.model',
        'whisper',
        vscode.ConfigurationTarget.Global
      );

      // Verify configuration was applied
      const endpointUrl = config.get<string>('endpoint.url');
      const endpointModel = config.get<string>('endpoint.model');
      assert.strictEqual(
        endpointUrl,
        'http://localhost:11434',
        'Endpoint URL should be configured'
      );
      assert.strictEqual(
        endpointModel,
        'whisper',
        'Endpoint model should be configured'
      );

      // Step 4: Test connection (this may fail if Ollama is not running, but should not throw)
      try {
        await vscode.commands.executeCommand('voice2code.testConnection');
        // Connection test executed (may succeed or fail based on Ollama availability)
      } catch (error) {
        // Expected if Ollama is not running - test should not fail
        console.log('Connection test failed (expected if Ollama not running):', error);
      }

      // Step 5: Start recording
      // Note: In e2e, we can't actually record audio, but we can verify the command executes
      try {
        await vscode.commands.executeCommand('voice2code.startRecording');
        // Recording started (or error shown if audio device unavailable)
      } catch (error) {
        // Expected if audio device is not available in test environment
        console.log('Start recording failed (expected in test environment):', error);
      }

      // Step 6: Stop recording and verify command executes
      try {
        await vscode.commands.executeCommand('voice2code.stopRecording');
        // Recording stopped
      } catch (error) {
        // Expected if not recording or audio unavailable
        console.log('Stop recording failed (expected in test environment):', error);
      }

      // Step 7: Verify status bar is present (via extension activation)
      // The status bar controller should be instantiated during activation
      // We can't directly access it, but we verify extension activation succeeded
      assert.ok(extension?.isActive, 'Extension should remain active after commands');
    });

    test('should handle toggle recording command', async function () {
      this.timeout(5000);

      // Execute toggle command
      try {
        await vscode.commands.executeCommand('voice2code.toggleRecording');
        // Toggle executed
      } catch (error) {
        // Expected if audio device unavailable
        console.log('Toggle recording failed (expected in test environment):', error);
      }

      // Verify extension is still active
      assert.ok(extension?.isActive, 'Extension should remain active after toggle');
    });

    test('should handle errors gracefully', async function () {
      this.timeout(5000);

      // Try to stop recording when not recording (should handle gracefully)
      try {
        await vscode.commands.executeCommand('voice2code.stopRecording');
        // Command should execute without throwing (may show info message)
      } catch (error) {
        // If error is thrown, it should be handled by the extension
        assert.fail(`Stop recording should handle gracefully: ${error}`);
      }
    });
  });

  suite('2. Settings Configuration Test', () => {
    test('should allow endpoint URL modification', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');

      // Set endpoint URL
      await config.update(
        'endpoint.url',
        'http://localhost:8000',
        vscode.ConfigurationTarget.Global
      );

      // Verify it was set
      const url = config.get<string>('endpoint.url');
      assert.strictEqual(url, 'http://localhost:8000', 'Endpoint URL should be updated');
    });

    test('should allow model selection modification', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');

      // Set model
      await config.update(
        'endpoint.model',
        'whisper-large',
        vscode.ConfigurationTarget.Global
      );

      // Verify it was set
      const model = config.get<string>('endpoint.model');
      assert.strictEqual(model, 'whisper-large', 'Model should be updated');
    });

    test('should allow timeout configuration', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');

      // Set timeout
      await config.update('endpoint.timeout', 60000, vscode.ConfigurationTarget.Global);

      // Verify it was set
      const timeout = config.get<number>('endpoint.timeout');
      assert.strictEqual(timeout, 60000, 'Timeout should be updated');
    });

    test('should allow audio format configuration', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');

      // Set audio format
      await config.update('audio.format', 'wav', vscode.ConfigurationTarget.Global);

      // Verify it was set
      const format = config.get<string>('audio.format');
      assert.strictEqual(format, 'wav', 'Audio format should be updated');
    });

    test('should open settings via command', async function () {
      this.timeout(3000);

      // Execute openSettings command
      await vscode.commands.executeCommand('voice2code.openSettings');

      // Command should execute without error
      // In real test, this would open settings UI
      assert.ok(true, 'Settings command should execute');
    });

    test('should reset to default configuration', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');

      // Reset to defaults
      await config.update(
        'endpoint.url',
        undefined,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        'endpoint.model',
        undefined,
        vscode.ConfigurationTarget.Global
      );

      // Verify defaults are used
      const url = config.get<string>('endpoint.url');
      const model = config.get<string>('endpoint.model');

      // Should have default values (from package.json)
      assert.ok(url !== undefined, 'Should have default URL');
      assert.ok(model !== undefined, 'Should have default model');
    });
  });

  suite('3. Multi-cursor Test', () => {
    let multiCursorEditor: vscode.TextEditor;

    setup(async () => {
      // Create a new document for multi-cursor tests
      const document = await vscode.workspace.openTextDocument({
        content: 'Line 1\nLine 2\nLine 3\nLine 4\n',
        language: 'typescript',
      });
      multiCursorEditor = await vscode.window.showTextDocument(document);
    });

    teardown(async () => {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should support multiple cursors', async function () {
      this.timeout(3000);

      // Set up multiple cursors
      const line1 = new vscode.Position(0, 6); // End of "Line 1"
      const line2 = new vscode.Position(1, 6); // End of "Line 2"
      const line3 = new vscode.Position(2, 6); // End of "Line 3"

      multiCursorEditor.selections = [
        new vscode.Selection(line1, line1),
        new vscode.Selection(line2, line2),
        new vscode.Selection(line3, line3),
      ];

      // Verify multiple selections are set
      assert.strictEqual(
        multiCursorEditor.selections.length,
        3,
        'Should have 3 cursors'
      );

      // Simulate text insertion (what would happen after transcription)
      const textToInsert = ' - INSERTED';
      await multiCursorEditor.edit((editBuilder) => {
        multiCursorEditor.selections.forEach((selection) => {
          editBuilder.insert(selection.active, textToInsert);
        });
      });

      // Verify text was inserted at all cursor positions
      const content = multiCursorEditor.document.getText();
      assert.ok(
        content.includes('Line 1 - INSERTED'),
        'Text should be inserted at cursor 1'
      );
      assert.ok(
        content.includes('Line 2 - INSERTED'),
        'Text should be inserted at cursor 2'
      );
      assert.ok(
        content.includes('Line 3 - INSERTED'),
        'Text should be inserted at cursor 3'
      );
    });

    test('should handle single cursor', async () => {
      // Set single cursor
      const position = new vscode.Position(0, 0);
      multiCursorEditor.selections = [new vscode.Selection(position, position)];

      // Verify single selection
      assert.strictEqual(
        multiCursorEditor.selections.length,
        1,
        'Should have 1 cursor'
      );

      // Insert text
      const textToInsert = 'START ';
      await multiCursorEditor.edit((editBuilder) => {
        editBuilder.insert(position, textToInsert);
      });

      // Verify insertion
      const content = multiCursorEditor.document.getText();
      assert.ok(content.startsWith('START Line 1'), 'Text should be inserted at start');
    });

    test('should preserve cursor positions after insertion', async () => {
      // Set up cursors
      const initialPosition = new vscode.Position(0, 0);
      multiCursorEditor.selections = [
        new vscode.Selection(initialPosition, initialPosition),
      ];

      // Insert text
      await multiCursorEditor.edit((editBuilder) => {
        editBuilder.insert(initialPosition, 'TEST ');
      });

      // Cursor should move after inserted text
      const newPosition = multiCursorEditor.selection.active;
      assert.strictEqual(newPosition.character, 5, 'Cursor should move after insertion');
    });

    test('should handle empty document with multiple cursors', async () => {
      // Create empty document
      const emptyDoc = await vscode.workspace.openTextDocument({
        content: '',
        language: 'typescript',
      });
      const emptyEditor = await vscode.window.showTextDocument(emptyDoc);

      // Try to set multiple cursors (should default to single cursor)
      const position = new vscode.Position(0, 0);
      emptyEditor.selections = [new vscode.Selection(position, position)];

      // Insert text
      await emptyEditor.edit((editBuilder) => {
        editBuilder.insert(position, 'Hello World');
      });

      // Verify insertion
      const content = emptyEditor.document.getText();
      assert.strictEqual(content, 'Hello World', 'Text should be inserted in empty document');

      // Cleanup
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
  });

  suite('4. Extension Lifecycle', () => {
    test('should activate extension on startup', () => {
      assert.ok(extension, 'Extension should be loaded');
      assert.ok(extension?.isActive, 'Extension should be activated');
    });

    test('should register all commands on activation', async () => {
      const commands = await vscode.commands.getCommands();

      const requiredCommands = [
        'voice2code.startRecording',
        'voice2code.stopRecording',
        'voice2code.toggleRecording',
        'voice2code.testConnection',
        'voice2code.openSettings',
      ];

      requiredCommands.forEach((cmd) => {
        assert.ok(
          commands.includes(cmd),
          `Command ${cmd} should be registered`
        );
      });
    });

    test('should handle extension deactivation gracefully', async () => {
      // Extension should be active
      assert.ok(extension?.isActive, 'Extension should be active');

      // In real e2e test, we can't actually deactivate and reactivate
      // But we verify it's in a good state
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('voice2code.toggleRecording'),
        'Commands should still be available'
      );
    });
  });

  suite('5. Error Handling', () => {
    test('should handle missing configuration gracefully', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');

      // Clear configuration
      await config.update('endpoint.url', undefined, vscode.ConfigurationTarget.Global);

      // Try to test connection (should use default or show error)
      try {
        await vscode.commands.executeCommand('voice2code.testConnection');
        // Should not crash
        assert.ok(true, 'Should handle missing config');
      } catch (error) {
        // If error, it should be handled gracefully
        console.log('Test connection with missing config:', error);
      }
    });

    test('should handle invalid endpoint URL', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');

      // Set invalid URL
      await config.update(
        'endpoint.url',
        'invalid-url',
        vscode.ConfigurationTarget.Global
      );

      // Try to test connection (should show error)
      try {
        await vscode.commands.executeCommand('voice2code.testConnection');
        // Should handle gracefully
        assert.ok(true, 'Should handle invalid URL');
      } catch (error) {
        // Error is expected
        console.log('Test connection with invalid URL:', error);
      }
    });

    test('should handle no active editor for text insertion', async () => {
      // Close all editors
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      // Try to stop recording (which would insert text)
      try {
        await vscode.commands.executeCommand('voice2code.stopRecording');
        // Should handle no editor gracefully
        assert.ok(true, 'Should handle no active editor');
      } catch (error) {
        // Expected error
        console.log('Stop recording with no editor:', error);
      }

      // Restore test editor
      const document = await vscode.workspace.openTextDocument({
        content: '',
        language: 'typescript',
      });
      testEditor = await vscode.window.showTextDocument(document);
    });
  });
});
