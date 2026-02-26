/**
 * Final Integration Verification — Sprint v4
 * Verifies all components are properly wired and working together.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Sprint v4 Final Integration Verification', () => {
  const desktopSrc = path.resolve(__dirname, '../../src');
  const desktopDist = path.resolve(__dirname, '../../dist');

  describe('source files exist', () => {
    const requiredFiles = [
      'main.ts',
      'desktop-engine.ts',
      'tray.ts',
      'config-store.ts',
      'secret-store.ts',
      'settings-window.ts',
      'history-store.ts',
      'history-window.ts',
      'command-parser.ts',
      'command-executor.ts',
      'preload.ts',
      'hotkey.ts',
      'paste.ts',
      'notification.ts',
      'accessibility.ts',
    ];

    requiredFiles.forEach((file) => {
      it(`should have ${file}`, () => {
        expect(fs.existsSync(path.join(desktopSrc, file))).toBe(true);
      });
    });
  });

  describe('UI files exist', () => {
    const uiFiles = [
      'settings/settings.html',
      'settings/settings.css',
      'settings/settings-renderer.ts',
      'history/history.html',
      'history/history.css',
      'history/history-renderer.ts',
    ];

    uiFiles.forEach((file) => {
      it(`should have ${file}`, () => {
        expect(fs.existsSync(path.join(desktopSrc, file))).toBe(true);
      });
    });
  });

  describe('build output', () => {
    it('should have all dist output files', () => {
      const requiredDist = [
        'main.js',
        'preload.js',
        'settings/settings-renderer.js',
        'settings/settings.html',
        'settings/settings.css',
        'history/history-renderer.js',
        'history/history.html',
        'history/history.css',
      ];

      requiredDist.forEach((file) => {
        const filePath = path.join(desktopDist, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    it('should have tray icon assets', () => {
      const assets = [
        'assets/trayIconTemplate.png',
        'assets/trayIconTemplate@2x.png',
        'assets/tray-recording.png',
        'assets/tray-recording@2x.png',
        'assets/tray-processing.png',
        'assets/tray-processing@2x.png',
      ];

      assets.forEach((file) => {
        expect(fs.existsSync(path.join(desktopDist, file))).toBe(true);
      });
    });
  });

  describe('module exports', () => {
    it('CommandParser should export BUILT_IN_COMMANDS with 13 commands', () => {
      const { BUILT_IN_COMMANDS } = require('../../src/command-parser');
      expect(Object.keys(BUILT_IN_COMMANDS)).toHaveLength(13);
    });

    it('CommandParser should parse text with commands', () => {
      const { CommandParser } = require('../../src/command-parser');
      const parser = new CommandParser();
      const result = parser.parse('hello new line world');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', value: 'hello ' });
      expect(result[1]).toEqual({ type: 'command', value: 'newline' });
      expect(result[2]).toEqual({ type: 'text', value: ' world' });
    });
  });

  describe('package.json configuration', () => {
    it('should have electron-builder config', () => {
      const pkg = require('../../package.json');
      expect(pkg.build).toBeDefined();
      expect(pkg.build.appId).toBe('com.voice2code.desktop');
      expect(pkg.build.productName).toBe('Voice2Code');
      expect(pkg.build.mac.target).toContain('dmg');
      expect(pkg.build.mac.extendInfo.LSUIElement).toBe(true);
    });

    it('should have dist script', () => {
      const pkg = require('../../package.json');
      expect(pkg.scripts.dist).toBe('electron-builder');
    });

    it('should not contain @nut-tree/nut-js', () => {
      const pkg = require('../../package.json');
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      expect(allDeps['@nut-tree/nut-js']).toBeUndefined();
    });
  });

  describe('entitlements', () => {
    it('should have entitlements.plist for macOS permissions', () => {
      const plistPath = path.resolve(__dirname, '../../entitlements.plist');
      expect(fs.existsSync(plistPath)).toBe(true);
      const content = fs.readFileSync(plistPath, 'utf-8');
      expect(content).toContain('com.apple.security.device.audio-input');
      expect(content).toContain('com.apple.security.automation.apple-events');
    });
  });
});
