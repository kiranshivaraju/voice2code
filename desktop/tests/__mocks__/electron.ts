export const app = {
  on: jest.fn(),
  quit: jest.fn(),
  dock: { hide: jest.fn() },
  getPath: jest.fn().mockReturnValue('/tmp/test-app'),
  whenReady: jest.fn().mockResolvedValue(undefined),
};

export const Tray = jest.fn().mockImplementation(() => ({
  setImage: jest.fn(),
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  destroy: jest.fn(),
}));

export const Menu = {
  buildFromTemplate: jest.fn().mockReturnValue({}),
};

export const nativeImage = {
  createFromPath: jest.fn().mockReturnValue({}),
};

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
  close: jest.fn(),
  isDestroyed: jest.fn().mockReturnValue(false),
  on: jest.fn(),
  once: jest.fn(),
  webContents: {
    send: jest.fn(),
  },
}));

export const ipcMain = {
  handle: jest.fn(),
  removeHandler: jest.fn(),
};

export const ipcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
};

export const contextBridge = {
  exposeInMainWorld: jest.fn(),
};

export const globalShortcut = {
  register: jest.fn().mockReturnValue(true),
  unregister: jest.fn(),
  unregisterAll: jest.fn(),
  isRegistered: jest.fn().mockReturnValue(false),
};

export const clipboard = {
  readText: jest.fn().mockReturnValue(''),
  writeText: jest.fn(),
  readImage: jest.fn(),
  writeImage: jest.fn(),
};

export const safeStorage = {
  isEncryptionAvailable: jest.fn().mockReturnValue(true),
  encryptString: jest.fn().mockImplementation((str: string) =>
    Buffer.from(`encrypted:${str}`)
  ),
  decryptString: jest.fn().mockImplementation((buf: Buffer) =>
    buf.toString().replace('encrypted:', '')
  ),
};

export const systemPreferences = {
  isTrustedAccessibilityClient: jest.fn().mockReturnValue(true),
};

export const Notification = jest.fn().mockImplementation(() => ({
  show: jest.fn(),
  on: jest.fn(),
}));
