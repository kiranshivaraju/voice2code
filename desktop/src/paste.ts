/**
 * pasteText — Pastes text into the currently focused application by writing
 * to the clipboard and simulating Cmd+V via macOS osascript.
 */

import { clipboard } from 'electron';
import { execSync } from 'child_process';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pasteText(text: string, delayMs = 50): Promise<void> {
  if (!text.trim()) return;

  const previous = clipboard.readText();
  clipboard.writeText(text);

  try {
    await delay(delayMs);
    execSync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
    await delay(200); // wait for paste to complete before restoring
  } finally {
    clipboard.writeText(previous);
  }
}
