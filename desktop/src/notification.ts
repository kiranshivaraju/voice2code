/**
 * Notification helper — creates a notify function that respects the
 * showNotifications UI config setting.
 */

import { Notification } from 'electron';

type GetUIConfig = () => { showNotifications: boolean };

/**
 * Creates a notification function that checks the UI config on every call.
 * Returns a function matching the NotifyFn type used by DesktopEngine.
 */
export function createNotifier(getUIConfig: GetUIConfig): (title: string, body: string) => void {
  return (title: string, body: string): void => {
    if (!getUIConfig().showNotifications) return;
    const notification = new Notification({ title, body });
    notification.show();
  };
}
