/**
 * History renderer — communicates with main process via historyAPI bridge.
 */

declare global {
  interface Window {
    historyAPI: {
      getHistory(): Promise<Array<{ id: string; text: string; timestamp: number; language: string }>>;
      clearHistory(): Promise<{ success: boolean }>;
      copyEntry(id: string): Promise<{ success: boolean; error?: string }>;
    };
  }
}

const $ = (id: string) => document.getElementById(id)!;

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

let allEntries: Array<{ id: string; text: string; timestamp: number; language: string }> = [];

function renderEntries(entries: typeof allEntries) {
  const list = $('history-list');
  const emptyState = $('empty-state');

  if (entries.length === 0) {
    list.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  list.innerHTML = entries
    .map(
      (entry) => `
    <div class="history-entry" data-id="${escapeHtml(entry.id)}">
      <div class="entry-text">${escapeHtml(entry.text)}</div>
      <div class="entry-footer">
        <span class="entry-time">${relativeTime(entry.timestamp)}</span>
        <button class="btn-copy" data-id="${escapeHtml(entry.id)}">Copy</button>
      </div>
    </div>`
    )
    .join('');

  // Attach copy handlers
  list.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-id')!;
      const result = await window.historyAPI.copyEntry(id);
      if (result.success) {
        const el = e.target as HTMLElement;
        el.textContent = 'Copied!';
        el.classList.add('copied');
        setTimeout(() => {
          el.textContent = 'Copy';
          el.classList.remove('copied');
        }, 1500);
      }
    });
  });
}

async function loadHistory() {
  allEntries = await window.historyAPI.getHistory();
  renderEntries(allEntries);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadHistory();

  // Search filter
  $('search-input').addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    if (!query) {
      renderEntries(allEntries);
    } else {
      renderEntries(allEntries.filter((entry) => entry.text.toLowerCase().includes(query)));
    }
  });

  // Clear all
  $('btn-clear-all').addEventListener('click', async () => {
    await window.historyAPI.clearHistory();
    allEntries = [];
    renderEntries([]);
  });
});
