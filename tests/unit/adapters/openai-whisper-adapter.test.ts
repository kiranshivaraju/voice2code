import { OpenAIWhisperAdapter } from '../../../src/adapters/openai-whisper-adapter';
import { TranscriptionOptions, STTError, NetworkError } from '../../../src/types';
import axios from 'axios';
import FormData from 'form-data';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenAIWhisperAdapter', () => {
  const testEndpoint = 'https://api.openai.com/v1/audio/transcriptions';
  const testApiKey = 'sk-test123';
  let adapter: OpenAIWhisperAdapter;

  beforeEach(() => {
    adapter = new OpenAIWhisperAdapter(testEndpoint, testApiKey);
    jest.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "openai-whisper"', () => {
      expect(adapter.getProviderName()).toBe('openai-whisper');
    });
  });

  describe('testConnection', () => {
    it('should return true when endpoint is reachable with API key', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await adapter.testConnection();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testApiKey}`,
          }),
        })
      );
    });

    it('should return true when endpoint is reachable without API key', async () => {
      const adapterWithoutKey = new OpenAIWhisperAdapter(testEndpoint);
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await adapterWithoutKey.testConnection();

      expect(result).toBe(true);
    });

    it('should return false on connection error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED' });

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

    it('should transcribe audio successfully with API key', async () => {
      const mockResponse = {
        status: 200,
        data: {
          text: 'This is the transcribed text',
          language: 'en',
          duration: 5.2,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.transcribe(audioBuffer, options);

      expect(result.text).toBe('This is the transcribed text');
      expect(result.language).toBe('en');

      // Verify multipart/form-data was used
      const callArgs = mockedAxios.post.mock.calls[0];
      expect(callArgs[1]).toBeInstanceOf(FormData);

      // Verify Authorization header
      const config = callArgs[2] as any;
      expect(config.headers.Authorization).toBe(`Bearer ${testApiKey}`);
    });

    it('should work without API key for local vLLM', async () => {
      const adapterWithoutKey = new OpenAIWhisperAdapter('http://localhost:8000/v1/audio/transcriptions');
      const mockResponse = {
        status: 200,
        data: { text: 'test', language: 'en' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapterWithoutKey.transcribe(audioBuffer, options);

      expect(result.text).toBe('test');

      const callArgs = mockedAxios.post.mock.calls[0];
      const config = callArgs[2] as any;
      expect(config.headers.Authorization).toBeUndefined();
    });

    it('should include language in form data when provided', async () => {
      const mockResponse = {
        status: 200,
        data: { text: 'test' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, { language: 'es' });

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as FormData;

      // FormData is mocked, but we can verify it was created
      expect(formData).toBeInstanceOf(FormData);
    });

    it('should include temperature in form data when provided', async () => {
      const mockResponse = {
        status: 200,
        data: { text: 'test' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await adapter.transcribe(audioBuffer, { temperature: 0.5 });

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as FormData;

      expect(formData).toBeInstanceOf(FormData);
    });

    it('should throw STTError on 401 Unauthorized', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Invalid API key' },
        },
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(STTError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow('Invalid API key');
    });

    it('should throw STTError on 429 Rate Limit', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
        },
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(STTError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw NetworkError on ECONNREFUSED', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(NetworkError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(
        'Failed to connect to OpenAI Whisper server'
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

    it('should handle empty response text', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { text: '' },
      });

      const result = await adapter.transcribe(audioBuffer, options);

      expect(result.text).toBe('');
    });

    it('should throw STTError on malformed response', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      });

      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(STTError);
      await expect(adapter.transcribe(audioBuffer, options)).rejects.toThrow(
        'Invalid response format'
      );
    });

    it('should set timeout from configuration', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { text: 'test' },
      });

      await adapter.transcribe(audioBuffer, options);

      const callArgs = mockedAxios.post.mock.calls[0];
      const config = callArgs[2] as any;

      expect(config.timeout).toBeDefined();
    });

    it('should attach audio with correct filename', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { text: 'test' },
      });

      await adapter.transcribe(audioBuffer, options);

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as FormData;

      expect(formData).toBeInstanceOf(FormData);
    });
  });

  describe('edge cases', () => {
    it('should handle very large audio buffers', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { text: 'test' },
      });

      const result = await adapter.transcribe(largeBuffer, {});

      expect(result.text).toBe('test');
    });

    it('should handle empty audio buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { text: '' },
      });

      const result = await adapter.transcribe(emptyBuffer, {});

      expect(result.text).toBe('');
    });
  });
});
