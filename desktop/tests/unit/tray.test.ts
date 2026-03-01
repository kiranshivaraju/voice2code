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

  function getLatestTemplate(): any[] {
    const calls = (Menu.buildFromTemplate as unknown as jest.Mock).mock.calls;
    return calls[calls.length - 1][0];
  }

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
    });

    it('should update icon when setState("processing") called', () => {
      trayManager.create();
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
    it('should show "Start Recording" with hotkey in idle state', () => {
      trayManager.create();
      const template = getLatestTemplate();

      const recordItem = template.find((i: any) => i.label && i.label.includes('Start Recording'));
      const settingsItem = template.find((i: any) => i.label === 'Settings...');
      const testItem = template.find((i: any) => i.label === 'Test Connection');
      const quitItem = template.find((i: any) => i.label === 'Quit Voice2Code');

      expect(recordItem).toBeDefined();
      expect(recordItem.label).toContain('\u2303');
      expect(recordItem.enabled).toBe(true);

      expect(settingsItem).toBeDefined();
      expect(testItem).toBeDefined();
      expect(testItem.enabled).toBe(true);
      expect(quitItem).toBeDefined();
    });

    it('should show "Stop Recording" with hotkey when recording', () => {
      trayManager.create();
      trayManager.setState('recording');
      const template = getLatestTemplate();

      const recordItem = template.find((i: any) => i.label && i.label.includes('Stop Recording'));
      expect(recordItem).toBeDefined();
      expect(recordItem.label).toContain('\u2303');
      expect(recordItem.enabled).toBe(true);
    });

    it('should disable recording item during processing', () => {
      trayManager.create();
      trayManager.setState('processing');
      const template = getLatestTemplate();

      const recordItem = template[0];
      expect(recordItem.enabled).toBe(false);
    });

    it('should disable Test Connection during processing', () => {
      trayManager.create();
      trayManager.setState('processing');
      const template = getLatestTemplate();

      const testItem = template.find((i: any) => i.label === 'Test Connection');
      expect(testItem.enabled).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should invoke onStartRecording callback in idle state', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnStartRecording(callback);
      const template = getLatestTemplate();

      const recordItem = template.find((i: any) => i.label && i.label.includes('Start Recording'));
      recordItem.click();

      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onStopRecording callback in recording state', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setState('recording');
      trayManager.setOnStopRecording(callback);
      const template = getLatestTemplate();

      const recordItem = template.find((i: any) => i.label && i.label.includes('Stop Recording'));
      recordItem.click();

      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onOpenHistory callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnOpenHistory(callback);
      const template = getLatestTemplate();

      template.find((i: any) => i.label === 'History').click();
      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onOpenSettings callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnOpenSettings(callback);
      const template = getLatestTemplate();

      template.find((i: any) => i.label === 'Settings...').click();
      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onTestConnection callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnTestConnection(callback);
      const template = getLatestTemplate();

      template.find((i: any) => i.label === 'Test Connection').click();
      expect(callback).toHaveBeenCalled();
    });

    it('should invoke onQuit callback', () => {
      const callback = jest.fn();
      trayManager.create();
      trayManager.setOnQuit(callback);
      const template = getLatestTemplate();

      template.find((i: any) => i.label === 'Quit Voice2Code').click();
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
