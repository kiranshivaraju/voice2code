import { TranscriptionService } from '../../../src/core/transcription-service';
import { ConfigurationManager } from '../../../src/config/configuration-manager';
import { AdapterFactory } from '../../../src/adapters/adapter-factory';
import { STTAdapter } from '../../../src/adapters/stt-adapter';
import { NetworkError, STTError, TranscriptionResult, TranscriptionOptions } from '../../../src/types';

// Mock adapter
class MockSTTAdapter implements STTAdapter {
  transcribe = jest.fn();
  testConnection = jest.fn();
  getProviderName = jest.fn().mockReturnValue('mock-provider');
}

// Mock ConfigurationManager
class MockConfigurationManager {
  getEndpointConfig = jest.fn().mockReturnValue({
    url: 'http://localhost:11434',
    model: 'whisper',
    timeout: 30000,
  });

  getApiKey = jest.fn().mockResolvedValue(undefined);
}

// Mock AdapterFactory
class MockAdapterFactory {
  createAdapter = jest.fn();
}

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let mockConfigManager: MockConfigurationManager;
  let mockAdapterFactory: MockAdapterFactory;
  let mockAdapter: MockSTTAdapter;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock instances
    mockConfigManager = new MockConfigurationManager();
    mockAdapterFactory = new MockAdapterFactory();
    mockAdapter = new MockSTTAdapter();

    // Setup adapter factory to return mock adapter
    mockAdapterFactory.createAdapter.mockReturnValue(mockAdapter);

    // Create service instance
    service = new TranscriptionService(
      mockConfigManager as unknown as ConfigurationManager,
      mockAdapterFactory as unknown as AdapterFactory
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(service).toBeInstanceOf(TranscriptionService);
    });
  });

  describe('transcribe', () => {
    const mockAudioBuffer = Buffer.from('audio data');
    const mockOptions: TranscriptionOptions = {};
    const mockResult: TranscriptionResult = { text: 'transcribed text' };

    it('should transcribe audio successfully', async () => {
      mockAdapter.transcribe.mockResolvedValue(mockResult);

      const result = await service.transcribe(mockAudioBuffer, mockOptions);

      expect(mockConfigManager.getEndpointConfig).toHaveBeenCalled();
      expect(mockConfigManager.getApiKey).toHaveBeenCalled();
      expect(mockAdapterFactory.createAdapter).toHaveBeenCalledWith(
        'http://localhost:11434',
        undefined
      );
      expect(mockAdapter.transcribe).toHaveBeenCalledWith(mockAudioBuffer, mockOptions);
      expect(result).toEqual(mockResult);
    });

    it('should pass API key to adapter factory', async () => {
      mockConfigManager.getApiKey.mockResolvedValue('test-api-key');
      mockAdapter.transcribe.mockResolvedValue(mockResult);

      await service.transcribe(mockAudioBuffer, mockOptions);

      expect(mockAdapterFactory.createAdapter).toHaveBeenCalledWith(
        'http://localhost:11434',
        'test-api-key'
      );
    });

    it('should pass options to adapter', async () => {
      const options: TranscriptionOptions = {
        language: 'en',
        temperature: 0.5,
      };
      mockAdapter.transcribe.mockResolvedValue(mockResult);

      await service.transcribe(mockAudioBuffer, options);

      expect(mockAdapter.transcribe).toHaveBeenCalledWith(mockAudioBuffer, options);
    });

    it('should return empty text for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      mockAdapter.transcribe.mockResolvedValue({ text: '' });

      const result = await service.transcribe(emptyBuffer, mockOptions);

      expect(result.text).toBe('');
    });

    describe('retry logic', () => {
      it('should retry on NetworkError with exponential backoff', async () => {
        const networkError = new NetworkError('Connection failed', 'http://test.com');

        // Fail twice, succeed on third attempt
        mockAdapter.transcribe
          .mockRejectedValueOnce(networkError)
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce(mockResult);

        const promise = service.transcribe(mockAudioBuffer, mockOptions);

        // First attempt fails immediately
        await jest.advanceTimersByTimeAsync(0);

        // Wait for first retry delay (1000ms)
        await jest.advanceTimersByTimeAsync(1000);

        // Wait for second retry delay (2000ms)
        await jest.advanceTimersByTimeAsync(2000);

        const result = await promise;

        expect(mockAdapter.transcribe).toHaveBeenCalledTimes(3);
        expect(result).toEqual(mockResult);
      });

      it('should not retry on STTError', async () => {
        const sttError = new STTError('Invalid audio format', 400);
        mockAdapter.transcribe.mockRejectedValue(sttError);

        await expect(service.transcribe(mockAudioBuffer, mockOptions)).rejects.toThrow(STTError);

        expect(mockAdapter.transcribe).toHaveBeenCalledTimes(1);
      });


      it('should succeed on first retry', async () => {
        const networkError = new NetworkError('Connection failed', 'http://test.com');
        mockAdapter.transcribe
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce(mockResult);

        const promise = service.transcribe(mockAudioBuffer, mockOptions);

        await jest.advanceTimersByTimeAsync(0); // Initial attempt
        await jest.advanceTimersByTimeAsync(1000); // First retry

        const result = await promise;

        expect(mockAdapter.transcribe).toHaveBeenCalledTimes(2);
        expect(result).toEqual(mockResult);
      });
    });

    describe('error transformation', () => {
      it('should enhance STTError with context', async () => {
        const sttError = new STTError('Invalid audio', 400);
        mockAdapter.transcribe.mockRejectedValue(sttError);

        await expect(service.transcribe(mockAudioBuffer, mockOptions)).rejects.toThrow(STTError);

        try {
          await service.transcribe(mockAudioBuffer, mockOptions);
        } catch (error) {
          if (error instanceof STTError) {
            expect(error.message).toContain('Invalid audio');
            expect(error.details).toBe(400);
          }
        }
      });

      it('should handle unknown errors', async () => {
        const unknownError = new Error('Unknown error');
        mockAdapter.transcribe.mockRejectedValue(unknownError);

        await expect(service.transcribe(mockAudioBuffer, mockOptions)).rejects.toThrow('Unknown error');
      });
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockAdapter.testConnection.mockResolvedValue(true);

      const result = await service.testConnection();

      expect(mockConfigManager.getEndpointConfig).toHaveBeenCalled();
      expect(mockConfigManager.getApiKey).toHaveBeenCalled();
      expect(mockAdapterFactory.createAdapter).toHaveBeenCalled();
      expect(mockAdapter.testConnection).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockAdapter.testConnection.mockResolvedValue(false);

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should handle connection test errors', async () => {
      mockAdapter.testConnection.mockRejectedValue(new NetworkError('Connection failed', 'http://test.com'));

      await expect(service.testConnection()).rejects.toThrow(NetworkError);
    });

    it('should pass API key to adapter for connection test', async () => {
      mockConfigManager.getApiKey.mockResolvedValue('test-api-key');
      mockAdapter.testConnection.mockResolvedValue(true);

      await service.testConnection();

      expect(mockAdapterFactory.createAdapter).toHaveBeenCalledWith(
        'http://localhost:11434',
        'test-api-key'
      );
    });
  });

  describe('edge cases', () => {
    const mockAudioBuffer = Buffer.from('audio data');
    const mockOptions: TranscriptionOptions = {};

    it('should handle large audio buffers', async () => {
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      mockAdapter.transcribe.mockResolvedValue({ text: 'transcribed text' });

      const result = await service.transcribe(largeBuffer, mockOptions);

      expect(result.text).toBe('transcribed text');
    });

    it('should handle empty transcription result', async () => {
      mockAdapter.transcribe.mockResolvedValue({ text: '' });

      const result = await service.transcribe(mockAudioBuffer, mockOptions);

      expect(result.text).toBe('');
    });

    it('should handle very long transcription text', async () => {
      const longText = 'a'.repeat(100000);
      mockAdapter.transcribe.mockResolvedValue({ text: longText });

      const result = await service.transcribe(mockAudioBuffer, mockOptions);

      expect(result.text).toBe(longText);
      expect(result.text.length).toBe(100000);
    });

    it('should handle multiple concurrent transcriptions', async () => {
      mockAdapter.transcribe.mockResolvedValue({ text: 'transcribed text' });

      const promises = [
        service.transcribe(mockAudioBuffer, mockOptions),
        service.transcribe(mockAudioBuffer, mockOptions),
        service.transcribe(mockAudioBuffer, mockOptions),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.text === 'transcribed text')).toBe(true);
    });

    it('should handle null in options', async () => {
      mockAdapter.transcribe.mockResolvedValue({ text: 'transcribed text' });

      const result = await service.transcribe(mockAudioBuffer, {});

      expect(result.text).toBe('transcribed text');
    });

    it('should create new adapter for each transcription', async () => {
      mockAdapter.transcribe.mockResolvedValue({ text: 'text 1' });

      await service.transcribe(mockAudioBuffer, mockOptions);
      await service.transcribe(mockAudioBuffer, mockOptions);

      expect(mockAdapterFactory.createAdapter).toHaveBeenCalledTimes(2);
    });
  });

  describe('configuration changes', () => {
    const mockAudioBuffer = Buffer.from('audio data');
    const mockOptions: TranscriptionOptions = {};

    it('should use updated endpoint configuration', async () => {
      mockAdapter.transcribe.mockResolvedValue({ text: 'text' });

      // First transcription
      await service.transcribe(mockAudioBuffer, mockOptions);

      // Change configuration
      mockConfigManager.getEndpointConfig.mockReturnValue({
        url: 'http://new-endpoint:8000',
        model: 'whisper-large',
        timeout: 60000,
      });

      // Second transcription
      await service.transcribe(mockAudioBuffer, mockOptions);

      expect(mockAdapterFactory.createAdapter).toHaveBeenCalledTimes(2);
      expect(mockAdapterFactory.createAdapter).toHaveBeenLastCalledWith(
        'http://new-endpoint:8000',
        undefined
      );
    });

    it('should use updated API key', async () => {
      mockAdapter.transcribe.mockResolvedValue({ text: 'text' });

      // First transcription with no API key
      mockConfigManager.getApiKey.mockResolvedValue(undefined);
      await service.transcribe(mockAudioBuffer, mockOptions);

      // Second transcription with API key
      mockConfigManager.getApiKey.mockResolvedValue('new-api-key');
      await service.transcribe(mockAudioBuffer, mockOptions);

      expect(mockAdapterFactory.createAdapter).toHaveBeenLastCalledWith(
        'http://localhost:11434',
        'new-api-key'
      );
    });
  });
});
