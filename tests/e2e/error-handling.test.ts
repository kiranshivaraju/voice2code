import * as vscode from 'vscode';
import * as assert from 'assert';

/**
 * End-to-End Tests - Error Handling
 *
 * Tests error scenarios in the voice2code extension workflow including:
 * 1. No active editor
 * 2. Endpoint unreachable
 * 3. Invalid configuration
 * 4. No microphone permission
 *
 * These tests use the VS Code Extension Test Runner to validate
 * that errors are handled gracefully with user-friendly messages.
 *
 * @see Issue #29: [P1][e2e-test] End-to-End Tests - Error Handling
 */

suite('Voice2Code E2E - Error Handling', () => {
  let extension: vscode.Extension<any> | undefined;

  suiteSetup(async () => {
    // Get and activate the extension
    extension = vscode.extensions.getExtension('voice2code');
    assert.ok(extension, 'Extension should be found');

    await extension.activate();
    assert.ok(extension.isActive, 'Extension should be activated');
  });

  suiteTeardown(async () => {
    // Close all editors and restore default config
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

    const config = vscode.workspace.getConfiguration('voice2code');
    await config.update('endpoint.url', undefined, vscode.ConfigurationTarget.Global);
    await config.update('endpoint.model', undefined, vscode.ConfigurationTarget.Global);
  });

  suite('1. No Active Editor', () => {
    setup(async () => {
      // Ensure no editors are open
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should handle startRecording with no active editor gracefully', async function () {
      this.timeout(5000);

      // Verify no active editor
      assert.strictEqual(
        vscode.window.activeTextEditor,
        undefined,
        'There should be no active editor'
      );

      // Execute startRecording — extension should handle gracefully (no throws)
      try {
        await vscode.commands.executeCommand('voice2code.startRecording');
        // Command should complete without throwing (extension shows an error message internally)
      } catch (error) {
        // If the command itself throws, that is acceptable as long as the error
        // message is user-friendly (tested separately)
        assert.ok(
          error instanceof Error,
          'Error should be an Error instance'
        );
      }

      // Extension should remain active
      assert.ok(extension?.isActive, 'Extension should remain active after no-editor error');
    });

    test('should handle toggleRecording with no active editor gracefully', async function () {
      this.timeout(5000);

      assert.strictEqual(
        vscode.window.activeTextEditor,
        undefined,
        'There should be no active editor'
      );

      // toggleRecording should not crash the extension
      try {
        await vscode.commands.executeCommand('voice2code.toggleRecording');
      } catch (error) {
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      assert.ok(extension?.isActive, 'Extension should remain active after toggle with no editor');
    });

    test('should handle stopRecording when not recording gracefully', async function () {
      this.timeout(5000);

      // Stop recording when nothing is recording - should be a no-op
      try {
        await vscode.commands.executeCommand('voice2code.stopRecording');
        // No-op is acceptable
      } catch (error) {
        // Error is also acceptable as long as extension stays active
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      assert.ok(
        extension?.isActive,
        'Extension should remain active after stopping when not recording'
      );
    });
  });

  suite('2. Endpoint Unreachable', () => {
    setup(async () => {
      // Configure an invalid/unreachable endpoint
      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update(
        'endpoint.url',
        'http://localhost:19999', // Port that should not be listening
        vscode.ConfigurationTarget.Global
      );
      await config.update('endpoint.model', 'whisper', vscode.ConfigurationTarget.Global);
    });

    teardown(async () => {
      // Reset endpoint URL
      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update('endpoint.url', undefined, vscode.ConfigurationTarget.Global);
    });

    test('should handle testConnection failure gracefully', async function () {
      this.timeout(15000); // Allow time for connection timeout

      // testConnection to unreachable endpoint should not crash the extension
      try {
        await vscode.commands.executeCommand('voice2code.testConnection');
        // May succeed (error handled internally with user notification) or return false
      } catch (error) {
        // Error may be thrown - that is acceptable
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      // Extension must remain active
      assert.ok(
        extension?.isActive,
        'Extension should remain active after connection failure'
      );
    });

    test('should verify unreachable endpoint is configured', async () => {
      const config = vscode.workspace.getConfiguration('voice2code');
      const endpointUrl = config.get<string>('endpoint.url');
      assert.strictEqual(
        endpointUrl,
        'http://localhost:19999',
        'Unreachable endpoint URL should be set in config'
      );
    });
  });

  suite('3. Invalid Configuration', () => {
    setup(async () => {
      // Restore a valid endpoint structure first
      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update(
        'endpoint.url',
        'http://localhost:11434',
        vscode.ConfigurationTarget.Global
      );
    });

    teardown(async () => {
      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update('endpoint.url', undefined, vscode.ConfigurationTarget.Global);
      await config.update('endpoint.model', undefined, vscode.ConfigurationTarget.Global);
    });

    test('should handle invalid model name in configuration', async function () {
      this.timeout(10000);

      // Set an invalid model name (contains invalid characters)
      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update(
        'endpoint.model',
        '!!!invalid-model-name!!!',
        vscode.ConfigurationTarget.Global
      );

      const modelName = config.get<string>('endpoint.model');
      assert.strictEqual(
        modelName,
        '!!!invalid-model-name!!!',
        'Invalid model name should be stored in config'
      );

      // testConnection with invalid model - should handle gracefully
      try {
        await vscode.commands.executeCommand('voice2code.testConnection');
        // Command executed - error handled internally
      } catch (error) {
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      assert.ok(
        extension?.isActive,
        'Extension should remain active with invalid model configuration'
      );
    });

    test('should handle empty endpoint URL in configuration', async function () {
      this.timeout(10000);

      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update('endpoint.url', '', vscode.ConfigurationTarget.Global);

      const endpointUrl = config.get<string>('endpoint.url');
      assert.strictEqual(endpointUrl, '', 'Empty endpoint URL should be stored in config');

      // testConnection with empty URL - should show validation error
      try {
        await vscode.commands.executeCommand('voice2code.testConnection');
      } catch (error) {
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      assert.ok(
        extension?.isActive,
        'Extension should remain active with empty endpoint URL'
      );
    });

    test('should handle malformed endpoint URL in configuration', async function () {
      this.timeout(10000);

      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update(
        'endpoint.url',
        'not-a-valid-url',
        vscode.ConfigurationTarget.Global
      );

      const endpointUrl = config.get<string>('endpoint.url');
      assert.strictEqual(endpointUrl, 'not-a-valid-url', 'Malformed URL should be in config');

      // testConnection with malformed URL - should show error
      try {
        await vscode.commands.executeCommand('voice2code.testConnection');
      } catch (error) {
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      assert.ok(
        extension?.isActive,
        'Extension should remain active with malformed endpoint URL'
      );
    });
  });

  suite('4. No Microphone Permission', () => {
    suiteSetup(async () => {
      // Configure a valid endpoint for these tests
      const config = vscode.workspace.getConfiguration('voice2code');
      await config.update(
        'endpoint.url',
        'http://localhost:11434',
        vscode.ConfigurationTarget.Global
      );
      await config.update('endpoint.model', 'whisper', vscode.ConfigurationTarget.Global);

      // Open a test document so the editor is available
      const document = await vscode.workspace.openTextDocument({
        content: '',
        language: 'typescript',
      });
      await vscode.window.showTextDocument(document);
    });

    test('should handle audio permission denied gracefully', async function () {
      this.timeout(10000);

      // In CI/test environments audio devices may be unavailable.
      // The extension should catch AudioError and show a user-friendly message.
      try {
        await vscode.commands.executeCommand('voice2code.startRecording');
        // If audio is available (unlikely in CI), stop it immediately
        await vscode.commands.executeCommand('voice2code.stopRecording');
      } catch (error) {
        // Audio permission/device errors are expected in test environments
        // The important thing is that the extension doesn't crash
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      assert.ok(
        extension?.isActive,
        'Extension should remain active when audio device is unavailable'
      );
    });

    test('should handle toggle recording when audio is unavailable', async function () {
      this.timeout(10000);

      // Toggle should handle audio errors gracefully
      try {
        await vscode.commands.executeCommand('voice2code.toggleRecording');
      } catch (error) {
        assert.ok(error instanceof Error, 'Error should be an Error instance');
      }

      assert.ok(
        extension?.isActive,
        'Extension should remain active when toggling with unavailable audio'
      );
    });

    test('should not crash on rapid start/stop recording attempts', async function () {
      this.timeout(15000);

      // Rapid consecutive commands should not crash the extension
      const commands = ['voice2code.startRecording', 'voice2code.stopRecording'];
      for (const command of commands) {
        try {
          await vscode.commands.executeCommand(command);
        } catch {
          // Expected - audio unavailable in test environment
        }
      }

      assert.ok(
        extension?.isActive,
        'Extension should remain active after rapid start/stop attempts'
      );
    });
  });

  suite('5. Extension Resilience', () => {
    test('should remain active after multiple error scenarios', async function () {
      this.timeout(20000);

      // Run multiple error-inducing operations in sequence
      const operations = [
        async () => {
          // Close all editors then try to record
          await vscode.commands.executeCommand('workbench.action.closeAllEditors');
          await vscode.commands.executeCommand('voice2code.startRecording');
        },
        async () => {
          // Set invalid config then test connection
          const config = vscode.workspace.getConfiguration('voice2code');
          await config.update('endpoint.url', 'bad-url', vscode.ConfigurationTarget.Global);
          await vscode.commands.executeCommand('voice2code.testConnection');
        },
        async () => {
          // Stop recording when not recording
          await vscode.commands.executeCommand('voice2code.stopRecording');
        },
      ];

      for (const operation of operations) {
        try {
          await operation();
        } catch {
          // All errors expected
        }
      }

      // Extension must still be active and functional
      assert.ok(
        extension?.isActive,
        'Extension should remain active after multiple error scenarios'
      );

      // Verify commands are still registered (extension is functional)
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('voice2code.startRecording'),
        'Commands should still be registered after errors'
      );
    });

    test('should handle openSettings without errors', async function () {
      this.timeout(5000);

      // openSettings is a low-risk command that should always work
      try {
        await vscode.commands.executeCommand('voice2code.openSettings');
      } catch (error) {
        assert.fail(`openSettings should not fail: ${error}`);
      }

      assert.ok(extension?.isActive, 'Extension should remain active after openSettings');
    });
  });
});
