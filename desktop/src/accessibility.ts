/**
 * Accessibility permission check — verifies macOS Accessibility access
 * is granted, which is required for paste simulation via osascript.
 */

import { systemPreferences } from 'electron';

/**
 * Checks if the app has Accessibility permissions.
 * Shows a macOS system dialog (prompt=true) and notifies the user if not trusted.
 * Returns true if accessibility is granted, false otherwise.
 */
export function checkAccessibility(notify: (title: string, body: string) => void): boolean {
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);
  if (!trusted) {
    notify(
      'Accessibility Required',
      'Voice2Code needs Accessibility access for paste simulation. Please grant access in System Settings.'
    );
  }
  return trusted;
}
