import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../../core/models/history.model';
import { HistoryStore } from './history.store';

const STORAGE_KEY = 'nmp.history.v1';

function entry(partial: Partial<HistoryEntry>): HistoryEntry {
  return {
    entryId: 'e1',
    videoId: 1,
    title: 'Clip',
    posterUrl: null,
    positionSec: 10,
    durationSec: 100,
    status: 'stopped',
    watchedAt: 1000,
    ...partial,
  };
}

describe('HistoryStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts empty when nothing is persisted', () => {
    const store = TestBed.inject(HistoryStore);
    expect(store.entries()).toEqual([]);
    expect(store.count()).toBe(0);
  });

  it('loads persisted entries from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry({ entryId: 'x' })]));
    const store = TestBed.inject(HistoryStore);
    expect(store.count()).toBe(1);
    expect(store.entries()[0].entryId).toBe('x');
  });

  it('upsertSession inserts a new entry, then replaces one with the same id', () => {
    const store = TestBed.inject(HistoryStore);
    store.upsertSession(entry({ entryId: 'a', positionSec: 5 }));
    store.upsertSession(entry({ entryId: 'b', positionSec: 7 }));
    expect(store.count()).toBe(2);

    store.upsertSession(entry({ entryId: 'a', positionSec: 42, status: 'finished' }));
    expect(store.count()).toBe(2); // replaced, not added
    const a = store.entries().find((e) => e.entryId === 'a');
    expect(a?.positionSec).toBe(42);
    expect(a?.status).toBe('finished');
  });

  it('remove deletes by entryId', () => {
    const store = TestBed.inject(HistoryStore);
    store.upsertSession(entry({ entryId: 'a' }));
    store.upsertSession(entry({ entryId: 'b' }));
    store.remove('a');
    expect(store.entries().map((e) => e.entryId)).toEqual(['b']);
  });

  it('recent is ordered most-recently-watched first', () => {
    const store = TestBed.inject(HistoryStore);
    store.upsertSession(entry({ entryId: 'old', watchedAt: 100 }));
    store.upsertSession(entry({ entryId: 'new', watchedAt: 999 }));
    expect(store.recent().map((e) => e.entryId)).toEqual(['new', 'old']);
  });

  it('clear empties the history', () => {
    const store = TestBed.inject(HistoryStore);
    store.upsertSession(entry({ entryId: 'a' }));
    store.clear();
    expect(store.entries()).toEqual([]);
  });
});
