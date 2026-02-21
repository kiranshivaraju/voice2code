module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/../src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/settings/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
