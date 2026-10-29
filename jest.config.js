// ============================================================
// Bitrix24 ↔ Listok Integration — Jest Configuration
// ============================================================

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/db/client.js',
    '!src/utils/logger.js',
    '!src/utils/metrics.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleFileExtensions: ['js', 'json'],
  transform: {},
  setupFilesAfterSetup: [],
};
