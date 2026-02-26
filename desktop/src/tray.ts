/**
 * TrayManager — Manages the macOS menu bar tray icon, context menu,
 * and state-driven icon updates.
 */

import { Tray, Menu, nativeImage, MenuItemConstructorOptions } from 'electron';
import { RecordingState } from '@core/types';

export interface TrayIconPaths {
  idle: string;
  recording: string;
  processing: string;
}

interface TrayCallbacks {
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
  onTestConnection?: () => void;
  onQuit?: () => void;
}

export class TrayManager {
  private tray: Tray | null = null;
  private state: RecordingState = 'idle';
  private callbacks: TrayCallbacks = {};

  constructor(private iconPaths: TrayIconPaths) {}

  create(): void {
    const icon = nativeImage.createFromPath(this.iconPaths.idle);
    this.tray = new Tray(icon);
    this.tray.setToolTip('Voice2Code');
    this.buildMenu();
  }

  setState(state: RecordingState): void {
    if (!this.tray) return;
    this.state = state;

    const iconPath = this.getIconPath(state);
    const icon = nativeImage.createFromPath(iconPath);
    this.tray.setImage(icon);
    this.buildMenu();
  }

  setOnStartRecording(callback: () => void): void {
    this.callbacks.onStartRecording = callback;
    this.buildMenu();
  }

  setOnStopRecording(callback: () => void): void {
    this.callbacks.onStopRecording = callback;
    this.buildMenu();
  }

  setOnOpenHistory(callback: () => void): void {
    this.callbacks.onOpenHistory = callback;
    this.buildMenu();
  }

  setOnOpenSettings(callback: () => void): void {
    this.callbacks.onOpenSettings = callback;
    this.buildMenu();
  }

  setOnTestConnection(callback: () => void): void {
    this.callbacks.onTestConnection = callback;
    this.buildMenu();
  }

  setOnQuit(callback: () => void): void {
    this.callbacks.onQuit = callback;
    this.buildMenu();
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private getIconPath(state: RecordingState): string {
    switch (state) {
      case 'recording': return this.iconPaths.recording;
      case 'processing': return this.iconPaths.processing;
      default: return this.iconPaths.idle;
    }
  }

  private buildMenu(): void {
    if (!this.tray) return;

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Start Recording',
        enabled: this.state === 'idle',
        visible: this.state === 'idle',
        click: () => this.callbacks.onStartRecording?.(),
      },
      {
        label: 'Stop Recording',
        enabled: this.state === 'recording',
        visible: this.state === 'recording',
        click: () => this.callbacks.onStopRecording?.(),
      },
      { type: 'separator' },
      {
        label: 'History',
        click: () => this.callbacks.onOpenHistory?.(),
      },
      {
        label: 'Settings...',
        click: () => this.callbacks.onOpenSettings?.(),
      },
      {
        label: 'Test Connection',
        enabled: this.state !== 'processing',
        click: () => this.callbacks.onTestConnection?.(),
      },
      { type: 'separator' },
      {
        label: 'Quit Voice2Code',
        click: () => this.callbacks.onQuit?.(),
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(menu);
  }
}
