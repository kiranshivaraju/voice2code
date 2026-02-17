import * as vscode from 'vscode';
import { EndpointHealth } from '../types';
import { isLocalhost } from '../utils/url';

/**
 * NetworkMonitor
 *
 * Checks if the STT endpoint is reachable before each recording attempt.
 * Provides immediate actionable error messages instead of waiting for
 * a 30-second timeout when the endpoint is down.
 *
 * No caching — fresh check on every call.
 */
export class NetworkMonitor {
  private static readonly DEFAULT_TIMEOUT = 3000;

  /**
   * Check if an endpoint is reachable
   *
   * Performs a HEAD request with a short timeout to determine if
   * the STT endpoint is accessible.
   *
   * @param url - The endpoint URL to check
   * @param timeoutMs - Timeout in milliseconds (default: 3000)
   * @returns EndpointHealth with reachability status and latency
   */
  async isEndpointReachable(url: string, timeoutMs = NetworkMonitor.DEFAULT_TIMEOUT): Promise<EndpointHealth> {
    const start = Date.now();
    const isLocal = isLocalhost(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await fetch(url, { method: 'HEAD', signal: controller.signal });

      return {
        reachable: true,
        url,
        latencyMs: Date.now() - start,
        checkedAt: new Date(),
        isLocalhost: isLocal,
      };
    } catch {
      return {
        reachable: false,
        url,
        latencyMs: null,
        checkedAt: new Date(),
        isLocalhost: isLocal,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Check endpoint and show VS Code notification if unreachable
   *
   * Shows contextual error messages:
   * - Localhost: suggests starting Ollama
   * - Remote: suggests checking network connection
   *
   * @param url - The endpoint URL to check
   * @returns true if reachable, false if not (notification shown)
   */
  async checkAndNotify(url: string): Promise<boolean> {
    const health = await this.isEndpointReachable(url);

    if (health.reachable) {
      return true;
    }

    if (health.isLocalhost) {
      vscode.window.showErrorMessage(
        'Cannot reach STT endpoint. Is Ollama running? Start with: ollama serve',
        'Test Connection'
      );
    } else {
      const host = this.extractHost(url);
      vscode.window.showErrorMessage(
        `Cannot reach STT endpoint at ${host}. Check network connection.`,
        'Test Connection'
      );
    }

    return false;
  }

  /**
   * Extract hostname from URL for display in error messages
   */
  private extractHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }
}
