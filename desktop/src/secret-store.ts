/**
 * SecretStore — Encrypts and manages API keys using Electron's safeStorage API.
 * Encrypted blobs are stored as base64 strings in electron-store.
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';
import { ConfigurationError } from '@core/types';

const ENCRYPTED_KEY = '_encryptedApiKey';

export class SecretStore {
  constructor(private store: Store) {}

  setApiKey(apiKey: string): void {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new ConfigurationError('API key cannot be empty');
    }
    if (!safeStorage.isEncryptionAvailable()) {
      throw new ConfigurationError(
        'Secure storage is not available. Cannot store API key.'
      );
    }
    const encrypted = safeStorage.encryptString(trimmed);
    this.store.set(ENCRYPTED_KEY, encrypted.toString('base64'));
  }

  getApiKey(): string | null {
    const base64 = this.store.get(ENCRYPTED_KEY) as string | undefined;
    if (!base64) {
      return null;
    }
    try {
      const buffer = Buffer.from(base64, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      this.store.delete(ENCRYPTED_KEY);
      return null;
    }
  }

  deleteApiKey(): void {
    this.store.delete(ENCRYPTED_KEY);
  }

  hasApiKey(): boolean {
    return this.store.has(ENCRYPTED_KEY);
  }

  getApiKeyMasked(): string | null {
    const key = this.getApiKey();
    if (!key) {
      return null;
    }
    if (key.length <= 4) {
      return '****';
    }
    return '*'.repeat(key.length - 4) + key.slice(-4);
  }
}
