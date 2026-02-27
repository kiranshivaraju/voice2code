/**
 * Notification helper unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

jest.mock('electron', () => ({
  Notification: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
  })),
}));

import { Notification } from 'electron';
import { createNotifier } from '../../src/notification';

const MockNotification = Notification as unknown as jest.Mock;

describe('createNotifier', () => {
  let mockGetUIConfig: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUIConfig = jest.fn().mockReturnValue({ showNotifications: true });
  });

  it('should show notification when showNotifications is true', () => {
    const notify = createNotifier(mockGetUIConfig);
    notify('Test Title', 'Test body message');

    expect(MockNotification).toHaveBeenCalledWith({
      title: 'Test Title',
      body: 'Test body message',
    });
    const instance = MockNotification.mock.results[0].value;
    expect(instance.show).toHaveBeenCalled();
  });

  it('should NOT show notification when showNotifications is false', () => {
    mockGetUIConfig.mockReturnValue({ showNotifications: false });
    const notify = createNotifier(mockGetUIConfig);
    notify('Title', 'Body');

    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('should check config on every call (not cached)', () => {
    const notify = createNotifier(mockGetUIConfig);

    // First call: enabled
    notify('Title1', 'Body1');
    expect(MockNotification).toHaveBeenCalledTimes(1);

    // Disable notifications
    mockGetUIConfig.mockReturnValue({ showNotifications: false });
    notify('Title2', 'Body2');
    expect(MockNotification).toHaveBeenCalledTimes(1); // no new call

    // Re-enable notifications
    mockGetUIConfig.mockReturnValue({ showNotifications: true });
    notify('Title3', 'Body3');
    expect(MockNotification).toHaveBeenCalledTimes(2);
  });

  it('should call getUIConfig each time notify is called', () => {
    const notify = createNotifier(mockGetUIConfig);
    notify('A', 'B');
    notify('C', 'D');
    expect(mockGetUIConfig).toHaveBeenCalledTimes(2);
  });

  it('should always show error notifications even when showNotifications is false', () => {
    mockGetUIConfig.mockReturnValue({ showNotifications: false });
    const notify = createNotifier(mockGetUIConfig);

    notify('Connection Failed', 'Cannot connect');
    expect(MockNotification).toHaveBeenCalledTimes(1);

    notify('Authentication Failed', 'Check API key');
    expect(MockNotification).toHaveBeenCalledTimes(2);

    notify('Network Error', 'Some issue');
    expect(MockNotification).toHaveBeenCalledTimes(3);

    notify('Model Not Found', 'Check model');
    expect(MockNotification).toHaveBeenCalledTimes(4);

    notify('Rate Limited', 'Too many requests');
    expect(MockNotification).toHaveBeenCalledTimes(5);

    notify('Connection Timed Out', 'Took too long');
    expect(MockNotification).toHaveBeenCalledTimes(6);
  });

  it('should still suppress non-error notifications when showNotifications is false', () => {
    mockGetUIConfig.mockReturnValue({ showNotifications: false });
    const notify = createNotifier(mockGetUIConfig);

    notify('Connection OK', 'Connected successfully');
    expect(MockNotification).not.toHaveBeenCalled();
  });
});
