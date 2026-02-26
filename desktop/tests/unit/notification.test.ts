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
});
