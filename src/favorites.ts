const KEY = "public-cameras:favorites";

const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(ids));
  listeners.forEach((fn) => fn());
}

export function listFavorites(): string[] {
  return read();
}

export function isFavorite(id: string): boolean {
  return read().includes(id);
}

export function toggleFavorite(id: string): boolean {
  const current = read();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  write(next);
  return next.includes(id);
}

export function onFavoritesChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
