/**
 * HistoryStore — Persists transcription history with FIFO eviction.
 * Uses a separate electron-store file named 'history'.
 */

import Store from 'electron-store';
import { randomUUID } from 'crypto';

export interface TranscriptionHistoryEntry {
  id: string;
  text: string;
  timestamp: number;
  language: string;
}

interface HistorySchema {
  entries: TranscriptionHistoryEntry[];
}

const MAX_ENTRIES = 50;
const MAX_TEXT_LENGTH = 10000;

export class HistoryStore {
  private store: Store<HistorySchema>;

  constructor() {
    this.store = new Store<HistorySchema>({
      name: 'history',
      defaults: { entries: [] },
    });
  }

  add(text: string, language: string = 'en'): TranscriptionHistoryEntry {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Transcription text cannot be empty');
    }

    const entry: TranscriptionHistoryEntry = {
      id: randomUUID(),
      text: trimmed.substring(0, MAX_TEXT_LENGTH),
      timestamp: Date.now(),
      language,
    };

    const entries = this.store.get('entries') ?? [];
    entries.push(entry);

    // FIFO eviction: remove oldest if over limit
    while (entries.length > MAX_ENTRIES) {
      entries.shift();
    }

    this.store.set('entries', entries);
    return entry;
  }

  getAll(): TranscriptionHistoryEntry[] {
    const entries = this.store.get('entries') ?? [];
    return [...entries].reverse();
  }

  getById(id: string): TranscriptionHistoryEntry | undefined {
    const entries = this.store.get('entries') ?? [];
    return entries.find((e) => e.id === id);
  }

  clear(): void {
    this.store.set('entries', []);
  }

  count(): number {
    return (this.store.get('entries') ?? []).length;
  }
}
