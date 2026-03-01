/**
 * Notification helper — creates a notify function that respects the
 * showNotifications UI config setting.
 *
 * Error notifications (titles containing "Failed", "Error", "Unavailable",
 * "Not Found", "Limited", "Timed Out") always show regardless of the setting.
 */

import { Notification } from 'electron';

type GetUIConfig = () => { showNotifications: boolean };

const ERROR_KEYWORDS = ['Failed', 'Error', 'Unavailable', 'Not Found', 'Limited', 'Timed Out'];

/**
 * Creates a notification function that checks the UI config on every call.
 * Error notifications always show, even if showNotifications is false.
 */
export function createNotifier(getUIConfig: GetUIConfig): (title: string, body: string) => void {
  return (title: string, body: string): void => {
    const isError = ERROR_KEYWORDS.some(keyword => title.includes(keyword));
    if (!isError && !getUIConfig().showNotifications) return;
    const notification = new Notification({ title, body });
    notification.show();
  };
}
