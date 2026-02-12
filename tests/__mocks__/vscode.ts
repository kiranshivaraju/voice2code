/**
 * Mock for vscode module in tests
 */

export const workspace = {
  getConfiguration: jest.fn(),
};

export interface ExtensionContext {
  secrets: {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}
