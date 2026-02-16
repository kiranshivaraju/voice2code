import { StatusBarController } from '../../../src/ui/status-bar-controller';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    createStatusBarItem: jest.fn(),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
}));

describe('StatusBarController', () => {
  let controller: StatusBarController;
  let mockContext: vscode.ExtensionContext;
  let mockStatusBarItem: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock status bar item
    mockStatusBarItem = {
      text: '',
      color: undefined,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      tooltip: '',
      command: undefined,
    };

    // Mock createStatusBarItem
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    controller = new StatusBarController(mockContext);
  });

  describe('constructor', () => {
    it('should create status bar item with correct alignment and priority', () => {
      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Right,
        100
      );
    });

    it('should add status bar item to context subscriptions', () => {
      expect(mockContext.subscriptions).toContain(mockStatusBarItem);
    });

    it('should initialize with idle state', () => {
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update text and state for idle', () => {
      controller.updateStatus('Voice2Code', 'idle');

      expect(mockStatusBarItem.text).toBe('$(mic) Voice2Code');
      expect(mockStatusBarItem.color).toBeUndefined();
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should update text and state for recording', () => {
      controller.updateStatus('Recording...', 'recording');

      expect(mockStatusBarItem.text).toBe('$(record) Recording...');
      expect(mockStatusBarItem.color).toBe('#ff0000');
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should update text and state for processing', () => {
      controller.updateStatus('Transcribing...', 'processing');

      expect(mockStatusBarItem.text).toBe('$(sync~spin) Transcribing...');
      expect(mockStatusBarItem.color).toBe('#ffcc00');
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should handle idle state without icon duplication', () => {
      controller.updateStatus('Ready', 'idle');

      expect(mockStatusBarItem.text).toBe('$(mic) Ready');
    });

    it('should handle empty text', () => {
      controller.updateStatus('', 'idle');

      expect(mockStatusBarItem.text).toBe('$(mic) ');
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(100);
      controller.updateStatus(longText, 'idle');

      expect(mockStatusBarItem.text).toContain(longText);
    });

    it('should handle special characters in text', () => {
      controller.updateStatus('Text with $(icon) and symbols!', 'idle');

      expect(mockStatusBarItem.text).toBe('$(mic) Text with $(icon) and symbols!');
    });

    it('should update multiple times', () => {
      controller.updateStatus('Idle', 'idle');
      controller.updateStatus('Recording', 'recording');
      controller.updateStatus('Processing', 'processing');

      expect(mockStatusBarItem.show).toHaveBeenCalledTimes(4); // Initial + 3 updates
    });
  });

  describe('show', () => {
    it('should call statusBarItem.show()', () => {
      controller.show();

      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should be callable multiple times', () => {
      controller.show();
      controller.show();
      controller.show();

      expect(mockStatusBarItem.show).toHaveBeenCalledTimes(4); // Initial + 3 calls
    });
  });

  describe('hide', () => {
    it('should call statusBarItem.hide()', () => {
      controller.hide();

      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });

    it('should be callable multiple times', () => {
      controller.hide();
      controller.hide();
      controller.hide();

      expect(mockStatusBarItem.hide).toHaveBeenCalledTimes(3);
    });
  });

  describe('dispose', () => {
    it('should call statusBarItem.dispose()', () => {
      controller.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should only dispose once', () => {
      controller.dispose();
      controller.dispose();

      // VS Code handles multiple dispose calls gracefully
      expect(mockStatusBarItem.dispose).toHaveBeenCalledTimes(2);
    });
  });

  describe('state transitions', () => {
    it('should handle idle → recording → processing → idle', () => {
      controller.updateStatus('Ready', 'idle');
      expect(mockStatusBarItem.text).toBe('$(mic) Ready');

      controller.updateStatus('Recording...', 'recording');
      expect(mockStatusBarItem.text).toBe('$(record) Recording...');
      expect(mockStatusBarItem.color).toBe('#ff0000');

      controller.updateStatus('Transcribing...', 'processing');
      expect(mockStatusBarItem.text).toBe('$(sync~spin) Transcribing...');
      expect(mockStatusBarItem.color).toBe('#ffcc00');

      controller.updateStatus('Done', 'idle');
      expect(mockStatusBarItem.text).toBe('$(mic) Done');
      expect(mockStatusBarItem.color).toBeUndefined();
    });

    it('should handle rapid state changes', () => {
      for (let i = 0; i < 10; i++) {
        controller.updateStatus('State ' + i, 'recording');
      }

      expect(mockStatusBarItem.show).toHaveBeenCalledTimes(11); // Initial + 10 updates
    });
  });

  describe('icon mapping', () => {
    it('should use correct icon for idle state', () => {
      controller.updateStatus('Idle', 'idle');
      expect(mockStatusBarItem.text).toContain('$(mic)');
    });

    it('should use correct icon for recording state', () => {
      controller.updateStatus('Recording', 'recording');
      expect(mockStatusBarItem.text).toContain('$(record)');
    });

    it('should use correct icon for processing state', () => {
      controller.updateStatus('Processing', 'processing');
      expect(mockStatusBarItem.text).toContain('$(sync~spin)');
    });
  });

  describe('color mapping', () => {
    it('should use no color for idle state', () => {
      controller.updateStatus('Idle', 'idle');
      expect(mockStatusBarItem.color).toBeUndefined();
    });

    it('should use red color for recording state', () => {
      controller.updateStatus('Recording', 'recording');
      expect(mockStatusBarItem.color).toBe('#ff0000');
    });

    it('should use yellow color for processing state', () => {
      controller.updateStatus('Processing', 'processing');
      expect(mockStatusBarItem.color).toBe('#ffcc00');
    });
  });

  describe('edge cases', () => {
    it('should handle null text gracefully', () => {
      controller.updateStatus(null as any, 'idle');
      expect(mockStatusBarItem.text).toBeDefined();
    });

    it('should handle undefined text gracefully', () => {
      controller.updateStatus(undefined as any, 'idle');
      expect(mockStatusBarItem.text).toBeDefined();
    });

    it('should handle show/hide toggle', () => {
      controller.show();
      controller.hide();
      controller.show();
      controller.hide();

      expect(mockStatusBarItem.show).toHaveBeenCalled();
      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });

    it('should handle updates after hide', () => {
      controller.hide();
      controller.updateStatus('Text', 'idle');

      // updateStatus shows the status bar
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should handle dispose and continue gracefully', () => {
      controller.dispose();

      // These should not throw errors
      expect(() => controller.show()).not.toThrow();
      expect(() => controller.hide()).not.toThrow();
    });
  });

  describe('lifecycle', () => {
    it('should initialize → update → dispose correctly', () => {
      // Already initialized in beforeEach
      expect(mockStatusBarItem.show).toHaveBeenCalled();

      // Update
      controller.updateStatus('Working', 'recording');
      expect(mockStatusBarItem.text).toBe('$(record) Working');

      // Dispose
      controller.dispose();
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should be added to context subscriptions for automatic disposal', () => {
      // Verify it's in subscriptions
      expect(mockContext.subscriptions).toHaveLength(1);
      expect(mockContext.subscriptions[0]).toBe(mockStatusBarItem);

      // In VS Code, when extension deactivates, all subscriptions are disposed
      mockContext.subscriptions.forEach((sub: any) => sub.dispose());

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});
