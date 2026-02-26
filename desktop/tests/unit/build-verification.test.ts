import * as path from 'path';
import * as fs from 'fs';

describe('Webpack Build Verification', () => {
  const distDir = path.resolve(__dirname, '../../dist');

  const expectedFiles = [
    'main.js',
    'preload.js',
    'settings/settings-renderer.js',
    'settings/settings.html',
    'settings/settings.css',
  ];

  const expectedAssets = [
    'assets/trayIconTemplate.png',
    'assets/trayIconTemplate@2x.png',
    'assets/tray-recording.png',
    'assets/tray-recording@2x.png',
    'assets/tray-processing.png',
    'assets/tray-processing@2x.png',
  ];

  it('should have dist directory', () => {
    expect(fs.existsSync(distDir)).toBe(true);
  });

  expectedFiles.forEach((file) => {
    it(`should contain ${file}`, () => {
      const filePath = path.join(distDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(0);
    });
  });

  expectedAssets.forEach((asset) => {
    it(`should contain asset ${asset}`, () => {
      const filePath = path.join(distDir, asset);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have source maps for JS bundles', () => {
    expect(fs.existsSync(path.join(distDir, 'main.js.map'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'preload.js.map'))).toBe(true);
  });

  it('webpack config should have four entry points', () => {
    const config = require('../../webpack.config.js');
    expect(Array.isArray(config)).toBe(true);
    expect(config).toHaveLength(4);
    expect(config[0].target).toBe('electron-main');
    expect(config[1].target).toBe('web'); // history renderer
    expect(config[2].target).toBe('electron-preload');
    expect(config[3].target).toBe('web'); // settings renderer
  });

  it('webpack config should use transpileOnly for ts-loader', () => {
    const config = require('../../webpack.config.js');
    const tsRule = config[0].module.rules.find(
      (r: any) => r.test.toString() === '/\\.ts$/'
    );
    expect(tsRule.use.options.transpileOnly).toBe(true);
  });
});
