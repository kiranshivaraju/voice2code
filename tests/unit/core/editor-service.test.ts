import { EditorService } from '../../../src/core/editor-service';
import { ValidationError } from '../../../src/types';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showErrorMessage: jest.fn(),
    showInputBox: jest.fn(),
    showInformationMessage: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(),
  },
  Position: class {
    constructor(public line: number, public character: number) {}
  },
  Range: class {
    constructor(public start: any, public end: any) {}
  },
  Selection: class {
    constructor(public anchor: any, public active: any) {}
  },
}));

describe('EditorService', () => {
  let service: EditorService;
  let mockEditor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EditorService();

    // Create a mock editor
    mockEditor = {
      edit: jest.fn(),
      selection: new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 0)
      ),
      selections: [
        new vscode.Selection(
          new vscode.Position(0, 0),
          new vscode.Position(0, 0)
        ),
      ],
      document: {
        uri: { fsPath: '/test/file.ts' },
        fileName: 'file.ts',
      },
    };
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(service).toBeInstanceOf(EditorService);
    });
  });

  describe('getActiveEditor', () => {
    it('should return active editor when one exists', () => {
      (vscode.window as any).activeTextEditor = mockEditor;

      const editor = service.getActiveEditor();

      expect(editor).toBe(mockEditor);
    });

    it('should return undefined when no active editor', () => {
      (vscode.window as any).activeTextEditor = undefined;

      const editor = service.getActiveEditor();

      expect(editor).toBeUndefined();
    });
  });

  describe('insertText', () => {
    beforeEach(() => {
      (vscode.window as any).activeTextEditor = mockEditor;
    });

    it('should insert text at cursor position', async () => {
      const text = 'Hello World';
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(text);

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should throw ValidationError when no active editor', async () => {
      (vscode.window as any).activeTextEditor = undefined;

      await expect(service.insertText('test')).rejects.toThrow(ValidationError);
      await expect(service.insertText('test')).rejects.toThrow('No active editor');
    });

    it('should insert text at all cursor positions for multi-cursor', async () => {
      const text = 'test';
      mockEditor.selections = [
        new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
        new vscode.Selection(new vscode.Position(1, 5), new vscode.Position(1, 5)),
        new vscode.Selection(new vscode.Position(2, 10), new vscode.Position(2, 10)),
      ];

      const insertCalls: any[] = [];
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn((position: any, insertText: string) => {
            insertCalls.push({ position, text: insertText });
          }),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(text);

      expect(insertCalls.length).toBe(3);
      expect(insertCalls[0].text).toBe(text);
      expect(insertCalls[1].text).toBe(text);
      expect(insertCalls[2].text).toBe(text);
    });

    it('should handle empty text', async () => {
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText('');

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(10000);
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(longText);

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should handle text with newlines', async () => {
      const text = 'line1\nline2\nline3';
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(text);

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should handle text with special characters', async () => {
      const text = 'Special: !@#$%^&*(){}[]<>?/\\|';
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(text);

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should handle text with unicode characters', async () => {
      const text = 'Unicode: 你好 🎉 مرحبا';
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(text);

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should handle edit operation failure', async () => {
      mockEditor.edit.mockImplementation(() => {
        return Promise.resolve(false);
      });

      await expect(service.insertText('test')).rejects.toThrow('Failed to insert text');
    });

    it('should preserve undo/redo stack', async () => {
      // The edit API automatically preserves undo/redo
      // This test verifies we're using edit() correctly
      let editBuilderUsed = false;
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        editBuilderUsed = true;
        return Promise.resolve(true);
      });

      await service.insertText('test');

      expect(editBuilderUsed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid consecutive insertions', async () => {
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText('text1');
      await service.insertText('text2');
      await service.insertText('text3');

      expect(mockEditor.edit).toHaveBeenCalledTimes(3);
    });

    it('should handle editor becoming undefined during insertion', async () => {
      (vscode.window as any).activeTextEditor = mockEditor;

      // Editor becomes undefined after check but before edit
      mockEditor.edit.mockImplementation(() => {
        (vscode.window as any).activeTextEditor = undefined;
        return Promise.resolve(true);
      });

      // Should still work because we got the editor reference before
      await service.insertText('test');

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should handle single cursor (selections array with one item)', async () => {
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.selections = [
        new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      ];

      const insertCalls: any[] = [];
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn((position: any, text: string) => {
            insertCalls.push({ position, text });
          }),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText('test');

      expect(insertCalls.length).toBe(1);
    });

    it('should handle null text gracefully', async () => {
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(null as any);

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should handle undefined text gracefully', async () => {
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = {
          insert: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn(),
        };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      await service.insertText(undefined as any);

      expect(mockEditor.edit).toHaveBeenCalled();
    });
  });

  describe('showPreviewAndInsert', () => {
    let mockConfig: any;

    beforeEach(() => {
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockImplementation((callback: any) => {
        const editBuilder = { insert: jest.fn(), replace: jest.fn(), delete: jest.fn() };
        callback(editBuilder);
        return Promise.resolve(true);
      });

      mockConfig = { get: jest.fn() };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    });

    it('should call showInputBox with correct title, value, and placeHolder', async () => {
      mockConfig.get.mockReturnValue(true);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue('hello world');

      await service.showPreviewAndInsert('hello world');

      expect(vscode.window.showInputBox).toHaveBeenCalledWith({
        title: 'Voice2Code — Review transcription before inserting',
        value: 'hello world',
        placeHolder: 'Edit transcription or press Enter to confirm',
      });
    });

    it('should insert original text when user confirms without editing', async () => {
      mockConfig.get.mockReturnValue(true);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue('original text');

      const result = await service.showPreviewAndInsert('original text');

      expect(result).toEqual({ confirmed: true, text: 'original text' });
      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should insert edited text when user modifies and confirms', async () => {
      mockConfig.get.mockReturnValue(true);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue('edited text');

      const result = await service.showPreviewAndInsert('original text');

      expect(result).toEqual({ confirmed: true, text: 'edited text' });
      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should show info notification and not insert when user presses Escape', async () => {
      mockConfig.get.mockReturnValue(true);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

      const result = await service.showPreviewAndInsert('some text');

      expect(result).toEqual({ confirmed: false, text: null });
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Transcription cancelled — nothing inserted.'
      );
      expect(mockEditor.edit).not.toHaveBeenCalled();
    });

    it('should skip InputBox and insert directly when previewEnabled is false', async () => {
      mockConfig.get.mockReturnValue(false);

      const result = await service.showPreviewAndInsert('direct text');

      expect(result).toEqual({ confirmed: true, text: 'direct text' });
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();
      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should return { confirmed: true, text } on confirmation', async () => {
      mockConfig.get.mockReturnValue(true);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue('confirmed text');

      const result = await service.showPreviewAndInsert('confirmed text');

      expect(result.confirmed).toBe(true);
      expect(result.text).toBe('confirmed text');
    });

    it('should return { confirmed: false, text: null } on cancellation', async () => {
      mockConfig.get.mockReturnValue(true);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

      const result = await service.showPreviewAndInsert('cancelled text');

      expect(result.confirmed).toBe(false);
      expect(result.text).toBeNull();
    });
  });

  describe('different file types', () => {
    it('should work with TypeScript files', async () => {
      mockEditor.document.fileName = 'test.ts';
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockResolvedValue(true);

      await service.insertText('const x = 1;');

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should work with JavaScript files', async () => {
      mockEditor.document.fileName = 'test.js';
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockResolvedValue(true);

      await service.insertText('var x = 1;');

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should work with Markdown files', async () => {
      mockEditor.document.fileName = 'README.md';
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockResolvedValue(true);

      await service.insertText('# Heading');

      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should work with plain text files', async () => {
      mockEditor.document.fileName = 'notes.txt';
      (vscode.window as any).activeTextEditor = mockEditor;
      mockEditor.edit.mockResolvedValue(true);

      await service.insertText('Some notes');

      expect(mockEditor.edit).toHaveBeenCalled();
    });
  });
});
