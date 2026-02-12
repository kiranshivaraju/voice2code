/**
 * Unit tests for EndpointValidator
 */

import axios from 'axios';
import {
  validateEndpointUrl,
  validateModelName,
  testEndpointConnectivity,
} from '../../../src/config/endpoint-validator';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EndpointValidator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEndpointUrl', () => {
    it('should pass validation for valid HTTPS URL', () => {
      const result = validateEndpointUrl('https://api.openai.com/v1/audio/transcriptions');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toBeUndefined();
    });

    it('should pass validation for valid HTTP localhost URL', () => {
      const result = validateEndpointUrl('http://localhost:11434/api/generate');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for localhost with port', () => {
      const result = validateEndpointUrl('http://localhost:8000/transcribe');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for 127.0.0.1', () => {
      const result = validateEndpointUrl('http://127.0.0.1:11434/api');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn for HTTP remote URL', () => {
      const result = validateEndpointUrl('http://192.168.1.100:8000/transcribe');

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('HTTP (non-HTTPS)');
    });

    it('should warn for HTTP domain', () => {
      const result = validateEndpointUrl('http://example.com/api');

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('not recommended');
    });

    it('should fail validation for empty URL', () => {
      const result = validateEndpointUrl('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Endpoint URL cannot be empty');
    });

    it('should fail validation for whitespace-only URL', () => {
      const result = validateEndpointUrl('   ');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Endpoint URL cannot be empty');
    });

    it('should fail validation for invalid protocol (ftp)', () => {
      const result = validateEndpointUrl('ftp://example.com');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid endpoint URL format');
    });

    it('should fail validation for incomplete URL', () => {
      const result = validateEndpointUrl('http://');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid endpoint URL format');
    });

    it('should fail validation for plain text (not a URL)', () => {
      const result = validateEndpointUrl('not-a-url');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid endpoint URL format');
    });

    it('should pass for URL without path', () => {
      const result = validateEndpointUrl('https://api.example.com');

      expect(result.valid).toBe(true);
    });

    it('should pass for URL with complex path', () => {
      const result = validateEndpointUrl('https://api.example.com/v1/models/transcribe');

      expect(result.valid).toBe(true);
    });

    it('should fail for URL with invalid port', () => {
      const result = validateEndpointUrl('http://localhost:999999/api');

      expect(result.valid).toBe(false);
    });
  });

  describe('validateModelName', () => {
    it('should pass validation for model name with hyphens', () => {
      const result = validateModelName('whisper-large-v3');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for model name with underscores', () => {
      const result = validateModelName('openai_whisper');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for model name with dots', () => {
      const result = validateModelName('model.v2');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for alphanumeric model name', () => {
      const result = validateModelName('whisper123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for complex valid model name', () => {
      const result = validateModelName('whisper-large-v3_2024.01');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for path traversal attempt', () => {
      const result = validateModelName('../etc/passwd');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid model name format');
    });

    it('should fail validation for path traversal with malicious name', () => {
      const result = validateModelName('../malicious');

      expect(result.valid).toBe(false);
    });

    it('should fail validation for model name with slashes', () => {
      const result = validateModelName('model/path');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid model name format');
    });

    it('should fail validation for model name with spaces', () => {
      const result = validateModelName('model name');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid model name format');
    });

    it('should fail validation for empty model name', () => {
      const result = validateModelName('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name cannot be empty');
    });

    it('should fail validation for whitespace-only model name', () => {
      const result = validateModelName('   ');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name cannot be empty');
    });

    it('should fail validation for model name with special characters', () => {
      const result = validateModelName('model@name');

      expect(result.valid).toBe(false);
    });

    it('should fail validation for model name with parentheses', () => {
      const result = validateModelName('model(v1)');

      expect(result.valid).toBe(false);
    });
  });

  describe('testEndpointConnectivity', () => {
    it('should return true for successful HEAD request', async () => {
      mockedAxios.head.mockResolvedValue({ status: 200, data: {} } as any);

      const result = await testEndpointConnectivity('http://localhost:11434/api', 5000);

      expect(result).toBe(true);
      expect(mockedAxios.head).toHaveBeenCalledWith('http://localhost:11434/api', {
        timeout: 5000,
        validateStatus: expect.any(Function),
      });
    });

    it('should return true for 4xx responses (endpoint exists)', async () => {
      mockedAxios.head.mockResolvedValue({ status: 404, data: {} } as any);

      const result = await testEndpointConnectivity('http://localhost:11434/api', 5000);

      expect(result).toBe(true);
    });

    it('should fallback to GET if HEAD fails', async () => {
      mockedAxios.head.mockRejectedValue(new Error('HEAD not supported'));
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} } as any);

      const result = await testEndpointConnectivity('http://localhost:11434/api', 5000);

      expect(result).toBe(true);
      expect(mockedAxios.head).toHaveBeenCalled();
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:11434/api', {
        timeout: 5000,
        validateStatus: expect.any(Function),
      });
    });

    it('should return false for connection refused', async () => {
      const error = new Error('connect ECONNREFUSED');
      mockedAxios.head.mockRejectedValue(error);
      mockedAxios.get.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testEndpointConnectivity('http://localhost:11434/api', 5000);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return false for timeout', async () => {
      const error = new Error('timeout of 5000ms exceeded');
      mockedAxios.head.mockRejectedValue(error);
      mockedAxios.get.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testEndpointConnectivity('http://localhost:11434/api', 5000);

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should return false for SSL/TLS errors', async () => {
      const error = new Error('self signed certificate');
      mockedAxios.head.mockRejectedValue(error);
      mockedAxios.get.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testEndpointConnectivity('https://example.com/api', 5000);

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should use specified timeout', async () => {
      mockedAxios.head.mockResolvedValue({ status: 200, data: {} } as any);

      await testEndpointConnectivity('http://localhost:11434/api', 10000);

      expect(mockedAxios.head).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 10000 })
      );
    });
  });
});
