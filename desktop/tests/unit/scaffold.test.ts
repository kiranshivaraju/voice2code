/**
 * Scaffold smoke tests — verify build tooling and path aliases work.
 */
import { ValidationResult } from '@core/types';

describe('Desktop Scaffold', () => {
  it('should resolve @core/* path alias to shared types', () => {
    const result: ValidationResult = { valid: true, errors: [] };
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should have electron mock available', () => {
    const { app } = require('electron');
    expect(app.quit).toBeDefined();
    expect(app.dock.hide).toBeDefined();
  });

  it('should have all tray icon assets', () => {
    const fs = require('fs');
    const path = require('path');
    const assetsDir = path.resolve(__dirname, '../../assets');

    const expectedIcons = [
      'trayIconTemplate.png',
      'trayIconTemplate@2x.png',
      'tray-recording.png',
      'tray-recording@2x.png',
      'tray-processing.png',
      'tray-processing@2x.png',
    ];

    for (const icon of expectedIcons) {
      const iconPath = path.join(assetsDir, icon);
      expect(fs.existsSync(iconPath)).toBe(true);
    }
  });
});
