import { BrowserWindow, ipcMain } from 'electron';
import { WelcomeWindow } from '../../src/welcome-window';

const mockIpcMain = ipcMain as unknown as { handle: jest.Mock };

function getIPCHandler(channel: string): ((...args: any[]) => any) | undefined {
  const calls = mockIpcMain.handle.mock.calls;
  const match = calls.find((c: any[]) => c[0] === channel);
  return match ? match[1] : undefined;
}

describe('WelcomeWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a BrowserWindow on show', () => {
    const win = new WelcomeWindow();
    win.show();
    expect(BrowserWindow).toHaveBeenCalled();
  });

  it('should focus existing window on second show', () => {
    const win = new WelcomeWindow();
    win.show();
    const created = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;
    win.show();
    expect(created.focus).toHaveBeenCalled();
  });

  it('should report isOpen correctly', () => {
    const win = new WelcomeWindow();
    expect(win.isOpen()).toBe(false);
    win.show();
    expect(win.isOpen()).toBe(true);
  });

  it('should register welcome:close IPC handler', () => {
    new WelcomeWindow();
    const handler = getIPCHandler('welcome:close');
    expect(handler).toBeDefined();
  });
});
