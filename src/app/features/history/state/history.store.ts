import { computed, effect } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { HistoryEntry } from '../../../core/models/history.model';

const STORAGE_KEY = 'nmp.history.v1';

interface HistoryState {
  entries: HistoryEntry[];
}

/** Load persisted history; degrade to [] if storage is unavailable or corrupt. */
function loadFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(entries: readonly HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Private mode / quota — keep working in-memory.
  }
}

/**
 * Watch history. Holds entries in state and mirrors them to localStorage so they survive
 * refresh/close. One entry per watch session; `upsertSession` updates the live session in place.
 */
export const HistoryStore = signalStore(
  { providedIn: 'root' },
  withState<HistoryState>(() => ({ entries: loadFromStorage() })),

  withComputed((store) => ({
    /** Most-recently watched first. */
    recent: computed(() =>
      [...store.entries()].sort((a, b) => b.watchedAt - a.watchedAt),
    ),
    count: computed(() => store.entries().length),
  })),

  withMethods((store) => ({
    /** Insert a new session, or replace the existing one with the same entryId. */
    upsertSession(entry: HistoryEntry): void {
      const existing = store.entries();
      const idx = existing.findIndex((e) => e.entryId === entry.entryId);
      if (idx === -1) {
        patchState(store, { entries: [entry, ...existing] });
      } else {
        const next = [...existing];
        next[idx] = entry;
        patchState(store, { entries: next });
      }
    },
    remove(entryId: string): void {
      patchState(store, {
        entries: store.entries().filter((e) => e.entryId !== entryId),
      });
    },
    clear(): void {
      patchState(store, { entries: [] });
    },
  })),

  withHooks({
    onInit(store): void {
      // Persist on every change.
      effect(() => writeToStorage(store.entries()));
    },
  }),
);
