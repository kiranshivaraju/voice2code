/**
 * Check if a URL points to localhost (localhost, 127.0.0.1, or ::1)
 */
export function isLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    );
  } catch {
    return false;
  }
}
