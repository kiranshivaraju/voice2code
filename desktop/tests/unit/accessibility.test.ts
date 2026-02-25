/**
 * Accessibility permission check tests
 * TDD: These tests are written BEFORE the implementation.
 */

jest.mock('electron', () => ({
  systemPreferences: {
    isTrustedAccessibilityClient: jest.fn(),
  },
}));

import { systemPreferences } from 'electron';
import { checkAccessibility } from '../../src/accessibility';

const mockIsTrusted = systemPreferences.isTrustedAccessibilityClient as jest.Mock;

describe('checkAccessibility', () => {
  let notify: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    notify = jest.fn();
  });

  it('should call isTrustedAccessibilityClient with prompt=true', () => {
    mockIsTrusted.mockReturnValue(true);
    checkAccessibility(notify);
    expect(mockIsTrusted).toHaveBeenCalledWith(true);
  });

  it('should not notify when accessibility is granted', () => {
    mockIsTrusted.mockReturnValue(true);
    checkAccessibility(notify);
    expect(notify).not.toHaveBeenCalled();
  });

  it('should notify when accessibility is NOT granted', () => {
    mockIsTrusted.mockReturnValue(false);
    checkAccessibility(notify);
    expect(notify).toHaveBeenCalledWith(
      'Accessibility Required',
      'Voice2Code needs Accessibility access for paste simulation. Please grant access in System Settings.'
    );
  });

  it('should return true when accessibility is granted', () => {
    mockIsTrusted.mockReturnValue(true);
    expect(checkAccessibility(notify)).toBe(true);
  });

  it('should return false when accessibility is not granted', () => {
    mockIsTrusted.mockReturnValue(false);
    expect(checkAccessibility(notify)).toBe(false);
  });
});
