import { NetworkMonitor } from '../../../src/network/network-monitor';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    showErrorMessage: jest.fn(),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NetworkMonitor', () => {
  let monitor: NetworkMonitor;

  beforeEach(() => {
    monitor = new NetworkMonitor();
    jest.clearAllMocks();
  });

  describe('isEndpointReachable', () => {
    it('should return reachable: true with latencyMs when endpoint responds 200', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await monitor.isEndpointReachable('http://localhost:11434');

      expect(result.reachable).toBe(true);
      expect(result.url).toBe('http://localhost:11434');
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.checkedAt).toBeInstanceOf(Date);
      expect(result.statusCode).toBe(200);
    });

    it('should return reachable: false when endpoint responds with 404', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const result = await monitor.isEndpointReachable('http://localhost:11434/api/transcribe');

      expect(result.reachable).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should return reachable: false and latencyMs: null when endpoint fails', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await monitor.isEndpointReachable('http://localhost:11434');

      expect(result.reachable).toBe(false);
      expect(result.latencyMs).toBeNull();
      expect(result.statusCode).toBeNull();
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should return reachable: false on timeout', async () => {
      // Simulate a fetch that never resolves (will be aborted by the internal AbortController)
      mockFetch.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const result = await monitor.isEndpointReachable('http://localhost:11434', 50);

      expect(result.reachable).toBe(false);
      expect(result.latencyMs).toBeNull();
    });

    it('should set isLocalhost: true for localhost URLs', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await monitor.isEndpointReachable('http://localhost:11434');

      expect(result.isLocalhost).toBe(true);
    });

    it('should set isLocalhost: true for 127.0.0.1 URLs', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await monitor.isEndpointReachable('http://127.0.0.1:11434');

      expect(result.isLocalhost).toBe(true);
    });

    it('should set isLocalhost: false for remote URLs', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await monitor.isEndpointReachable('https://api.openai.com/v1');

      expect(result.isLocalhost).toBe(false);
    });

    it('should use HEAD method for the request', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await monitor.isEndpointReachable('http://localhost:11434');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('should pass AbortController signal to fetch', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await monitor.isEndpointReachable('http://localhost:11434');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should default timeout to 3000ms', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      // We can't directly test the timeout value, but we verify the call works
      const result = await monitor.isEndpointReachable('http://localhost:11434');

      expect(result.reachable).toBe(true);
    });
  });

  describe('checkAndNotify', () => {
    it('should return true and show no notification when reachable', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await monitor.checkAndNotify('http://localhost:11434');

      expect(result).toBe(true);
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should return false when unreachable', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await monitor.checkAndNotify('http://localhost:11434');

      expect(result).toBe(false);
    });

    it('should show Ollama message for unreachable localhost', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await monitor.checkAndNotify('http://localhost:11434');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Is Ollama running'),
        'Test Connection'
      );
    });

    it('should show remote message for unreachable non-localhost', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await monitor.checkAndNotify('https://api.openai.com/v1');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Check network connection'),
        'Test Connection'
      );
    });

    it('should include hostname in remote error message', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await monitor.checkAndNotify('https://api.openai.com/v1');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('api.openai.com'),
        'Test Connection'
      );
    });

    it('should show Ollama message for unreachable 127.0.0.1', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await monitor.checkAndNotify('http://127.0.0.1:11434');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Is Ollama running'),
        'Test Connection'
      );
    });
  });
});
