/**
 * CommandParser — Parses transcribed text into text and command segments.
 * Pure logic module with no Electron dependencies.
 */

export interface TextSegment {
  type: 'text';
  value: string;
}

export interface CommandSegment {
  type: 'command';
  value: string;
}

export type ParsedSegment = TextSegment | CommandSegment;

export const BUILT_IN_COMMANDS: Record<string, string> = {
  'new line': 'newline',
  'enter': 'return',
  'tab': 'tab',
  'space': 'space',
  'backspace': 'backspace',
  'delete': 'delete',
  'select all': 'selectAll',
  'undo': 'undo',
  'redo': 'redo',
  'copy that': 'copy',
  'paste that': 'paste',
  'cut that': 'cut',
  'escape': 'escape',
};

export class CommandParser {
  private commands: Record<string, string>;
  private sortedPhrases: string[];

  constructor(customCommands?: Record<string, string>) {
    this.commands = { ...BUILT_IN_COMMANDS, ...customCommands };
    this.sortedPhrases = Object.keys(this.commands).sort(
      (a, b) => b.length - a.length
    );
  }

  parse(text: string): ParsedSegment[] {
    if (!text || !text.trim()) return [];

    const lower = text.toLowerCase();
    const segments: ParsedSegment[] = [];
    let i = 0;
    let textBuffer = '';

    while (i < lower.length) {
      let matched = false;

      for (const phrase of this.sortedPhrases) {
        if (i + phrase.length > lower.length) continue;

        const candidate = lower.substring(i, i + phrase.length);
        if (candidate !== phrase) continue;

        // Check word boundary before
        if (i > 0 && /\w/.test(lower[i - 1])) continue;

        // Check word boundary after
        const afterIdx = i + phrase.length;
        if (afterIdx < lower.length && /\w/.test(lower[afterIdx])) continue;

        // Flush text buffer
        if (textBuffer) {
          segments.push({ type: 'text', value: textBuffer });
          textBuffer = '';
        }

        segments.push({ type: 'command', value: this.commands[phrase] });
        i += phrase.length;
        matched = true;
        break;
      }

      if (!matched) {
        textBuffer += text[i];
        i++;
      }
    }

    if (textBuffer) {
      segments.push({ type: 'text', value: textBuffer });
    }

    return segments;
  }
}
