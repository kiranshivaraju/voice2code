/**
 * TrayManager unit tests
 * TDD: These tests are written BEFORE the implementation.
 */

import { Tray, Menu, nativeImage } from 'electron';
import { TrayManager } from '../../src/tray';

describe('TrayManager', () => {
  const iconPaths = {
    idle: '/assets/trayIconTemplate.png',
    recording: '/assets/tray-recording.png',
    processing: '/assets/tray-processing.png',
  };

  let trayManager: TrayManager;

  beforeEach(() => {
    jest.clearAllMocks();
    trayManager = new TrayManager(iconPaths);
  });

  afterEach(() => {
    trayManager.destroy();
  });

  describe('create', () => {
    it('should create tray with idle icon', () => {
      trayManager.create();

      expect(nativeImage.createFromPath).toHaveBeenCalledWith(iconPaths.idle);
      expect(Tray).toHaveBeenCalled();
    });

    it('should set tooltip to Voice2Code', () => {
      trayManager.create();

      const trayInstance = (Tray as unknown as jest.Mock).mock.results[0].value;
      expect(trayInstance.setToolTip).toHaveBeenCalledWith('Voice2Code');
    });

    it('should build context menu on create', () => {
      trayManager.create();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      const trayInstance = (Tray as unknown as jest.Mock).mock.results[0].value;
      expect(trayInstance.setContextMenu).toHaveBeenCalled();
    });
  });

  describe('setState', () => {
    it('should update icon when setState("recording") called', () => {
      trayManager.create();
      jest.clearAllMocks();

      trayManager.setState('recording');

      expect(nativeImage.createFromPath).toHaveBeenCalledWith(iconPaths.recording);
      const trayInstance = (Tray as unknown as jest.Mock).mock.results[0]?.value;
      // Access the actual tray instance created during create()
      // Since we cleared mocks, we need to check the setImage was called
    });

    it('should update icon when setState("processing") called', () => {
      trayManager.create();
      const trayInstance = (Tray as unknown as jest.Mock).mock.results[0].value;
      jest.clearAllMocks();

      trayManager.setState('processing');

      expect(nativeImage.createFromPath).toHaveBeenCalledWith(iconPaths.processing);
    });

    it('should update icon back to idle', () => {
      trayManager.create();
      trayManager.setState('recording');
      jest.clearAllMocks();

      trayManager.setState('idle');

      expect(nativeImage.createFromPath).toHaveBeenCalledWith(iconPaths.idle);
    });

    it('should do nothing if tray not created', () => {
      // Should not throw
      expect(() => trayManager.setState('recording')).not.toThrow();
    });

    it('should rebuild context menu on state change', () => {
      trayManager.create();
      (Menu.buildFromTemplate as unknown as jest.Mock).mockClear();

      trayManager.setState('recording');

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });
  });

  describe('context menu structure', () => {
    it('should have correct menu items in idle state', () => {
      trayManager.create();

      const template = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls[0][0];

      // Find relevant items
      const startItem = template.find((i: any) => i.label === 'Start Recording');
      const stopItem = template.find((i: any) => i.label === 'Stop Recording');
      const settingsItem = template.find((i: any) => i.label === 'Settings...');
      const testItem = template.find((i: any) => i.label === 'Test Connection');
      const quitItem = template.find((i: any) => i.label === 'Quit Voice2Code');

      expect(startItem).toBeDefined();
      expect(startItem.visible).toBe(true);
      expect(startItem.enabled).toBe(true);

      expect(stopItem).toBeDefined();
      expect(stopItem.visible).toBe(false);

      expect(settingsItem).toBeDefined();
      expect(testItem).toBeDefined();
      expect(testItem.enabled).toBe(true);
      expect(quitItem).toBeDefined();
    });

    it('should show Stop Recording and hide Start Recording when recording', () => {
      trayManager.create();
      trayManager.setState('recording');

      const lastCall = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
      const template = lastCall[lastCall.length - 1][0];

      const startItem = template.find((i: any) => i.label === 'Start Recording');
      const stopItem = template.find((i: any) => i.label === 'Stop Recording');

      expect(startItem.visible).toBe(false);
      expect(stopItem.visible).toBe(true);
      expect(stopItem.enabled).toBe(true);
    });

    it('should disable Test Connection during processing', () => {
      trayManager.create();
      trayManager.setState('processing');

      const lastCall = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
      const template = lastCall[lastCall.length - 1][0];

      const testItem = template.find((i: any) => i.label === 'Test Connection');
      expect(testItem.enabled).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should invoke onStartRecording callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnStartRecording(callback);

      const lastCall = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
      const template = lastCall[lastCall.length - 1][0];
      const startItem = template.find((i: any) => i.label === 'Start Recording');
      startItem.click();

      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onStopRecording callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setState('recording');
      trayManager.setOnStopRecording(callback);

      const lastCall = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
      const template = lastCall[lastCall.length - 1][0];
      const stopItem = template.find((i: any) => i.label === 'Stop Recording');
      stopItem.click();

      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onOpenSettings callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnOpenSettings(callback);

      const lastCall = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
      const template = lastCall[lastCall.length - 1][0];
      const item = template.find((i: any) => i.label === 'Settings...');
      item.click();

      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onTestConnection callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnTestConnection(callback);

      const lastCall = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
      const template = lastCall[lastCall.length - 1][0];
      const item = template.find((i: any) => i.label === 'Test Connection');
      item.click();

      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onQuit callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnQuit(callback);

      const lastCall = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
      const template = lastCall[lastCall.length - 1][0];
      const item = template.find((i: any) => i.label === 'Quit Voice2Code');
      item.click();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should destroy tray icon', () => {
      trayManager.create();
      const trayInstance = (Tray as unknown as jest.Mock).mock.results[0].value;

      trayManager.destroy();

      expect(trayInstance.destroy).toHaveBeenCalled();
    });

    it('should not throw when destroying without create', () => {
      expect(() => trayManager.destroy()).not.toThrow();
    });
  });
});
