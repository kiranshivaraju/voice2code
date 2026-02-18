import { OllamaAdapter } from '../../../src/adapters/ollama-adapter';
import { TranscriptionOptions, STTError, NetworkError } from '../../../src/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaAdapter', () => {
  let adapter: OllamaAdapter;
  const testEndpoint = 'http://localhost:11434';

  beforeEach(() => {
    adapter = new OllamaAdapter(testEndpoint);
    jest.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "ollama"', () => {
      expect(adapter.getProviderName()).toBe('ollama');
    });
  });

  describe('testConnection', () => {
    it('should return true when endpoint is reachable', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await adapter.testConnection();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(`${testEndpoint}/api/tags`, expect.any(Object));
    });

    it('should return false when endpoint returns error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on network timeout', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED' });

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on ECONNREFUSED', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNREFUSED' });

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('transcribe', () => {
    const audioBuffer = Buffer.from('test audio data');
    const options: TranscriptionOptions = {
      language: 'en',
      temperature: 0.0,
    };

    it('should transcribe audio via /api/chat with audio field', async () => {
      const mockResponse = {
        status: 200,
        data: {
          message: {
            role: 'assistant',
            content: 'This is the transcribed text',
          },
          done: true,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.transcribe(audioBuffer, options);

      expect(result.text).toBe('This is the transcribed text');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${testEndpoint}/api/chat`,
        expect.objectContaining({
          model: 'qwen2-audio',
          stream: false,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              audio: expect.any(Array),
            }),
          ]),
        }),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should encode audio as WAV and send base64 in audio field', async () => {
      const mockResponse = {
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, options);

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;
      const audioData = requestBody.messages[0].audio[0];

      // Decode and verify it's a WAV (starts with RIFF header)
      const decoded = Buffer.from(audioData, 'base64');
      expect(decoded.toString('ascii', 0, 4)).toBe('RIFF');
      expect(decoded.toString('ascii', 8, 12)).toBe('WAVE');
    });

    it('should include language in prompt when provided', async () => {
      const mockResponse = {
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, { language: 'fr' });

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;

      expect(requestBody.messages[0].content).toContain('fr');
    });

    it('should use default prompt when no language specified', async () => {
      const mockResponse = {
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, {});

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;

      expect(requestBody.messages[0].content).toBe('Transcribe this audio.');
    });

    it('should use model from options if provided', async () => {
      const mockResponse = {
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, { model: 'custom-audio-model' });

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;

      expect(requestBody.model).toBe('custom-audio-model');
    });

    it('should use default model when not specified', async () => {
      const mockResponse = {
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, {});

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;

      expect(requestBody.model).toBe('qwen2-audio');
    });

    it('should include temperature in options when provided', async () => {
      const mockResponse = {
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, { temperature: 0.5 });

      const callArgs = mockedAxios.post.mock.calls[0];
      const requestBody = callArgs[1] as any;

      expect(requestBody.options.temperature).toBe(0.5);
    });

    it('should throw STTError when model not found (404)', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'model not found' },
        },
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(STTError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(
        'Model not found on Ollama server'
      );
    });

    it('should throw STTError on 500 server error', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'internal server error' },
        },
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(STTError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(
        'Ollama server error'
      );
    });

    it('should throw NetworkError on ECONNREFUSED', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(NetworkError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(
        'Failed to connect to Ollama server'
      );
    });

    it('should throw NetworkError on timeout', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout exceeded',
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(NetworkError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow('Request timeout');
    });

    it('should handle empty response', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          message: { role: 'assistant', content: '' },
          done: true,
        },
      });

      const result = await adapter.transcribe(audioBuffer, options);

      expect(result.text).toBe('');
    });

    it('should handle malformed response (missing message)', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(STTError);
    });

    it('should handle malformed response (missing content)', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          message: { role: 'assistant' },
        },
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(STTError);
    });

    it('should set timeout to 120 seconds for audio processing', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      });

      await adapter.transcribe(audioBuffer, options);

      const callArgs = mockedAxios.post.mock.calls[0];
      const config = callArgs[2] as any;

      expect(config.timeout).toBe(120000);
    });
  });

  describe('edge cases', () => {
    it('should handle very large audio buffers', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          message: { role: 'assistant', content: 'test' },
          done: true,
        },
      });

      const result = await adapter.transcribe(largeBuffer, {});

      expect(result.text).toBe('test');
    });

    it('should handle empty audio buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          message: { role: 'assistant', content: '' },
          done: true,
        },
      });

      const result = await adapter.transcribe(emptyBuffer, {});

      expect(result.text).toBe('');
    });
  });
});
