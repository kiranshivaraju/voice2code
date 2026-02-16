import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

/**
 * Test Index - E2E Test Runner
 *
 * Discovers and runs all e2e tests using Mocha.
 * This file is called by VS Code's test runner.
 */
export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd', // Using TDD interface (suite/test)
    color: true,
    timeout: 10000, // 10 second timeout for e2e tests
  });

  const testsRoot = path.resolve(__dirname, '.');

  return new Promise((resolve, reject) => {
    // Find all test files
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files) => {
        // Add files to the test suite
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          // Run the mocha test
          mocha.run((failures) => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed.`));
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error(err);
          reject(err);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}
