const STORAGE_KEY = 'admin_recent_commands';
const MAX_ITEMS = 5;

export function saveRecentCommand(command) {
  try {
    const recent = getRecentCommands();
    const filtered = recent.filter((c) => c.id !== command.id);
    filtered.unshift({ id: command.id, title: command.title, url: command.url, icon: command.icon });
    const trimmed = filtered.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function getRecentCommands() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
