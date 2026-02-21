const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const commonConfig = {
  mode: 'development',
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@core': path.resolve(__dirname, '../src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    electron: 'commonjs electron',
    'node-record-lpcm16': 'commonjs node-record-lpcm16',
    'electron-store': 'commonjs electron-store',
  },
};

module.exports = [
  // Main process
  {
    ...commonConfig,
    target: 'electron-main',
    entry: './src/main.ts',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'assets', to: 'assets' },
          { from: 'src/settings/settings.html', to: 'settings/settings.html' },
          { from: 'src/settings/settings.css', to: 'settings/settings.css' },
        ],
      }),
    ],
  },
  // Preload script
  {
    ...commonConfig,
    target: 'electron-preload',
    entry: './src/preload.ts',
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist'),
    },
  },
  // Settings renderer
  {
    ...commonConfig,
    target: 'web',
    entry: './src/settings/settings-renderer.ts',
    output: {
      filename: 'settings/settings-renderer.js',
      path: path.resolve(__dirname, 'dist'),
    },
    externals: {},
  },
];
