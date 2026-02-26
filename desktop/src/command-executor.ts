/**
 * CommandExecutor — Executes parsed text/command segments via clipboard + osascript.
 * Uses clipboard save/restore pattern for text insertion.
 */

import { clipboard } from 'electron';
import { execSync } from 'child_process';
import { ParsedSegment } from './command-parser';

const KEYSTROKE_MAP: Record<string, string> = {
  newline: 'key code 36', // Return
  return: 'key code 36',
  tab: 'key code 48',
  space: 'key code 49',
  backspace: 'key code 51',
  delete: 'key code 117',
  escape: 'key code 53',
  selectAll: 'keystroke "a" using command down',
  undo: 'keystroke "z" using command down',
  redo: 'keystroke "z" using {command down, shift down}',
  copy: 'keystroke "c" using command down',
  paste: 'keystroke "v" using command down',
  cut: 'keystroke "x" using command down',
};

export class CommandExecutor {
  execute(segments: ParsedSegment[]): void {
    const savedClipboard = clipboard.readText();
    try {
      for (const segment of segments) {
        if (segment.type === 'text') {
          if (!segment.value.trim()) continue;
          clipboard.writeText(segment.value);
          execSync(
            'osascript -e \'tell application "System Events" to keystroke "v" using command down\''
          );
        } else {
          const keystroke = KEYSTROKE_MAP[segment.value];
          if (keystroke) {
            execSync(
              `osascript -e 'tell application "System Events" to ${keystroke}'`
            );
          }
        }
      }
    } finally {
      clipboard.writeText(savedClipboard);
    }
  }
}
