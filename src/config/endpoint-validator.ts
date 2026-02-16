/**
 * EndpointValidator
 * Utility functions for endpoint URL and model name validation, plus connectivity testing
 */

import axios from 'axios';
import { ValidationResult } from '../types';

// Validation regex patterns
const URL_REGEX = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]{1,5})?(\/.*)?$/;
const MODEL_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Validate endpoint URL format
 * @param url - The URL to validate
 * @returns ValidationResult with validation status and any errors/warnings
 */
export function validateEndpointUrl(url: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if URL is empty
  if (!url || url.trim().length === 0) {
    errors.push('Endpoint URL cannot be empty');
    return { valid: false, errors, warnings: warnings.length > 0 ? warnings : undefined };
  }

  // Check URL format
  if (!URL_REGEX.test(url)) {
    errors.push('Invalid endpoint URL format');
    return { valid: false, errors, warnings: warnings.length > 0 ? warnings : undefined };
  }

  // Warn for HTTP on remote endpoints
  if (url.startsWith('http://') && !isLocalhost(url)) {
    warnings.push('Using HTTP (non-HTTPS) for remote endpoint is not recommended');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate model name format
 * Prevents path traversal and ensures safe model names
 * @param name - The model name to validate
 * @returns ValidationResult with validation status and any errors
 */
export function validateModelName(name: string): ValidationResult {
  const errors: string[] = [];

  // Check if name is empty
  if (!name || name.trim().length === 0) {
    errors.push('Model name cannot be empty');
    return { valid: false, errors };
  }

  // Check model name format (prevents path traversal)
  if (!MODEL_NAME_REGEX.test(name)) {
    errors.push(
      'Invalid model name format (use only letters, numbers, dots, underscores, and hyphens)'
    );
    return { valid: false, errors };
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Test connectivity to an endpoint
 * @param url - The endpoint URL to test
 * @param timeout - Request timeout in milliseconds
 * @returns Promise<boolean> - true if endpoint is reachable, false otherwise
 */
export async function testEndpointConnectivity(url: string, timeout: number): Promise<boolean> {
  try {
    // Try HEAD request first (lighter weight)
    await axios.head(url, {
      timeout,
      validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
    });
    return true;
  } catch (headError) {
    // If HEAD fails, try GET as fallback (some servers don't support HEAD)
    try {
      await axios.get(url, {
        timeout,
        validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
      });
      return true;
    } catch (getError) {
      // Log the error for debugging
      const error = getError as Error;
      console.error('Endpoint connectivity test failed:', error.message);
      return false;
    }
  }
}

/**
 * Check if URL is localhost
 * @param url - The URL to check
 * @returns boolean - true if localhost, false otherwise
 */
function isLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}
