/**
 * Settings renderer — communicates with main process via settingsAPI bridge.
 */

declare global {
  interface Window {
    settingsAPI: {
      getConfig(): Promise<{
        endpoint: { url: string; model: string; timeout: number; language: string };
        audio: { sampleRate: number; format: string };
        ui: { showNotifications: boolean };
      }>;
      saveConfig(config: unknown): Promise<{ success: boolean; error?: string }>;
      getApiKeyMasked(): Promise<string | null>;
      setApiKey(apiKey: string): Promise<{ success: boolean; error?: string }>;
      deleteApiKey(): Promise<{ success: boolean }>;
      testConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }>;
    };
  }
}

const $ = (id: string) => document.getElementById(id)!;

function showStatus(el: HTMLElement, message: string, type: 'success' | 'error' | 'info') {
  el.textContent = message;
  el.className = `status ${type}`;
  if (type !== 'info') {
    setTimeout(() => { el.textContent = ''; el.className = 'status'; }, 3000);
  }
}

function setButtonsDisabled(disabled: boolean, ...buttons: HTMLButtonElement[]) {
  buttons.forEach(btn => btn.disabled = disabled);
}

async function loadConfig() {
  const config = await window.settingsAPI.getConfig();

  ($ ('endpoint-url') as HTMLInputElement).value = config.endpoint.url;
  ($('endpoint-model') as HTMLInputElement).value = config.endpoint.model;
  ($('endpoint-language') as HTMLInputElement).value = config.endpoint.language;
  ($('endpoint-timeout') as HTMLInputElement).value = String(config.endpoint.timeout);

  ($('audio-format') as HTMLSelectElement).value = config.audio.format;
  ($('audio-sample-rate') as HTMLSelectElement).value = String(config.audio.sampleRate);
}

async function loadApiKeyStatus() {
  const masked = await window.settingsAPI.getApiKeyMasked();
  const statusEl = $('api-key-status');
  if (masked) {
    showStatus(statusEl, `Key: ${masked}`, 'info');
  } else {
    showStatus(statusEl, 'No API key stored', 'info');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await loadApiKeyStatus();

  const btnSave = $('btn-save-settings') as HTMLButtonElement;
  const btnTest = $('btn-test-connection') as HTMLButtonElement;
  const btnSaveKey = $('btn-save-api-key') as HTMLButtonElement;
  const btnDeleteKey = $('btn-delete-api-key') as HTMLButtonElement;

  // Save Settings
  btnSave.addEventListener('click', async () => {
    setButtonsDisabled(true, btnSave);
    const config = {
      endpoint: {
        url: ($('endpoint-url') as HTMLInputElement).value,
        model: ($('endpoint-model') as HTMLInputElement).value,
        language: ($('endpoint-language') as HTMLInputElement).value,
        timeout: parseInt(($('endpoint-timeout') as HTMLInputElement).value, 10),
      },
      audio: {
        format: ($('audio-format') as HTMLSelectElement).value,
        sampleRate: parseInt(($('audio-sample-rate') as HTMLSelectElement).value, 10),
      },
    };

    const result = await window.settingsAPI.saveConfig(config);
    const statusEl = $('save-status');
    if (result.success) {
      showStatus(statusEl, 'Saved', 'success');
    } else {
      showStatus(statusEl, result.error || 'Failed to save', 'error');
    }
    setButtonsDisabled(false, btnSave);
  });

  // Test Connection
  btnTest.addEventListener('click', async () => {
    setButtonsDisabled(true, btnTest);
    const statusEl = $('test-connection-status');
    showStatus(statusEl, 'Testing...', 'info');

    const result = await window.settingsAPI.testConnection();
    if (result.success) {
      showStatus(statusEl, `Connected (${result.latencyMs}ms)`, 'success');
    } else {
      showStatus(statusEl, result.error || 'Connection failed', 'error');
    }
    setButtonsDisabled(false, btnTest);
  });

  // Save API Key
  btnSaveKey.addEventListener('click', async () => {
    const input = $('api-key-input') as HTMLInputElement;
    const apiKey = input.value;
    if (!apiKey.trim()) return;

    setButtonsDisabled(true, btnSaveKey, btnDeleteKey);
    const result = await window.settingsAPI.setApiKey(apiKey);
    const statusEl = $('api-key-status');

    if (result.success) {
      input.value = '';
      await loadApiKeyStatus();
      showStatus(statusEl, `Key saved`, 'success');
    } else {
      showStatus(statusEl, result.error || 'Failed to save key', 'error');
    }
    setButtonsDisabled(false, btnSaveKey, btnDeleteKey);
  });

  // Delete API Key
  btnDeleteKey.addEventListener('click', async () => {
    setButtonsDisabled(true, btnSaveKey, btnDeleteKey);
    await window.settingsAPI.deleteApiKey();
    const statusEl = $('api-key-status');
    showStatus(statusEl, 'No API key stored', 'info');
    setButtonsDisabled(false, btnSaveKey, btnDeleteKey);
  });
});
