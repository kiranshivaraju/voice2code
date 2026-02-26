const mockHistoryStore = new Map<string, unknown>();

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key: string) => mockHistoryStore.get(key),
    set: (key: string, value: unknown) => {
      mockHistoryStore.set(key, value);
    },
    clear: () => {
      mockHistoryStore.clear();
    },
  }));
});

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
}));

import { HistoryStore, TranscriptionHistoryEntry } from '../../src/history-store';

describe('HistoryStore', () => {
  let store: HistoryStore;

  beforeEach(() => {
    mockHistoryStore.clear();
    store = new HistoryStore();
  });

  describe('add', () => {
    it('should add a transcription entry', () => {
      const entry = store.add('hello world');
      expect(entry.text).toBe('hello world');
      expect(entry.language).toBe('en');
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });

    it('should default language to "en"', () => {
      const entry = store.add('test');
      expect(entry.language).toBe('en');
    });

    it('should accept a custom language', () => {
      const entry = store.add('bonjour', 'fr');
      expect(entry.language).toBe('fr');
    });

    it('should trim whitespace', () => {
      const entry = store.add('  hello  ');
      expect(entry.text).toBe('hello');
    });

    it('should throw on empty text', () => {
      expect(() => store.add('')).toThrow('Transcription text cannot be empty');
    });

    it('should throw on whitespace-only text', () => {
      expect(() => store.add('   ')).toThrow('Transcription text cannot be empty');
    });

    it('should truncate text at 10000 chars', () => {
      const longText = 'a'.repeat(15000);
      const entry = store.add(longText);
      expect(entry.text.length).toBe(10000);
    });

    it('should evict oldest entry when exceeding 50', () => {
      for (let i = 0; i < 50; i++) {
        store.add(`entry ${i}`);
      }
      expect(store.count()).toBe(50);

      store.add('entry 50');
      expect(store.count()).toBe(50);

      const all = store.getAll();
      // Most recent first, so first item should be "entry 50"
      expect(all[0].text).toBe('entry 50');
      // Oldest "entry 0" should be gone
      expect(all.find(e => e.text === 'entry 0')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no entries', () => {
      expect(store.getAll()).toEqual([]);
    });

    it('should return entries in reverse order (most recent first)', () => {
      store.add('first');
      store.add('second');
      store.add('third');
      const all = store.getAll();
      expect(all[0].text).toBe('third');
      expect(all[2].text).toBe('first');
    });
  });

  describe('getById', () => {
    it('should find an entry by id', () => {
      const entry = store.add('test entry');
      const found = store.getById(entry.id);
      expect(found).toBeDefined();
      expect(found!.text).toBe('test entry');
    });

    it('should return undefined for non-existent id', () => {
      expect(store.getById('non-existent')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      store.add('one');
      store.add('two');
      expect(store.count()).toBe(2);
      store.clear();
      expect(store.count()).toBe(0);
      expect(store.getAll()).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return 0 when empty', () => {
      expect(store.count()).toBe(0);
    });

    it('should return correct count', () => {
      store.add('one');
      store.add('two');
      store.add('three');
      expect(store.count()).toBe(3);
    });
  });
});
