import { AdapterFactory } from '../../../src/adapters/adapter-factory';
import { ConfigurationError } from '../../../src/types';

describe('AdapterFactory', () => {
  let factory: AdapterFactory;

  beforeEach(() => {
    factory = new AdapterFactory();
  });

  describe('createAdapter', () => {
    it('should create OllamaAdapter for localhost:11434 URL', () => {
      const adapter = factory.createAdapter('http://localhost:11434/api/generate');

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('ollama');
    });

    it('should create OllamaAdapter for URL containing "ollama"', () => {
      const adapter = factory.createAdapter('http://my-server.com:11434/ollama/api/generate');

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('ollama');
    });

    it('should create OpenAIWhisperAdapter for /v1/audio/transcriptions URL', () => {
      const apiKey = 'sk-test123';
      const adapter = factory.createAdapter(
        'https://api.openai.com/v1/audio/transcriptions',
        apiKey
      );

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('openai-whisper');
    });

    it('should create OpenAIWhisperAdapter for vLLM URL with /v1/audio/transcriptions', () => {
      const adapter = factory.createAdapter('http://localhost:8000/v1/audio/transcriptions');

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('openai-whisper');
    });

    it('should throw ConfigurationError for unsupported provider URL', () => {
      expect(() => {
        factory.createAdapter('http://unknown-provider.com/api/stt');
      }).toThrow(ConfigurationError);

      expect(() => {
        factory.createAdapter('http://unknown-provider.com/api/stt');
      }).toThrow('Unsupported STT provider URL');
    });

    it('should throw ConfigurationError for empty URL', () => {
      expect(() => {
        factory.createAdapter('');
      }).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid URL format', () => {
      expect(() => {
        factory.createAdapter('not-a-url');
      }).toThrow(ConfigurationError);
    });

    it('should handle API key for OpenAI adapter', () => {
      const apiKey = 'sk-test-key';
      const adapter = factory.createAdapter(
        'https://api.openai.com/v1/audio/transcriptions',
        apiKey
      );

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('openai-whisper');
    });

    it('should work without API key for Ollama (local)', () => {
      const adapter = factory.createAdapter('http://localhost:11434/api/generate');

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('ollama');
    });

    it('should detect Ollama on custom port', () => {
      const adapter = factory.createAdapter('http://localhost:8080/ollama');

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('ollama');
    });

    it('should detect OpenAI-compatible endpoint on custom domain', () => {
      const adapter = factory.createAdapter('https://custom-ai.example.com/v1/audio/transcriptions');

      expect(adapter).toBeDefined();
      expect(adapter.getProviderName()).toBe('openai-whisper');
    });
  });

  describe('adapter interface compliance', () => {
    it('should return adapter with transcribe method', () => {
      const adapter = factory.createAdapter('http://localhost:11434/api/generate');

      expect(typeof adapter.transcribe).toBe('function');
    });

    it('should return adapter with testConnection method', () => {
      const adapter = factory.createAdapter('http://localhost:11434/api/generate');

      expect(typeof adapter.testConnection).toBe('function');
    });

    it('should return adapter with getProviderName method', () => {
      const adapter = factory.createAdapter('http://localhost:11434/api/generate');

      expect(typeof adapter.getProviderName).toBe('function');
    });
  });

  describe('URL validation', () => {
    it('should accept HTTP URLs', () => {
      const adapter = factory.createAdapter('http://localhost:11434/ollama');
      expect(adapter).toBeDefined();
    });

    it('should accept HTTPS URLs', () => {
      const adapter = factory.createAdapter('https://api.openai.com/v1/audio/transcriptions');
      expect(adapter).toBeDefined();
    });

    it('should throw for URLs without protocol', () => {
      expect(() => {
        factory.createAdapter('localhost:11434/api/generate');
      }).toThrow(ConfigurationError);
    });
  });
});
