import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { HistoryPage } from './history.page';
import { HistoryStore } from '../state/history.store';
import { HistoryEntry } from '../../../core/models/history.model';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    entryId: 'session-1',
    videoId: 42,
    title: 'Test Video',
    posterUrl: 'https://example.com/poster.jpg',
    positionSec: 30,
    durationSec: 120,
    status: 'stopped',
    watchedAt: Date.now(),
    ...overrides,
  };
}

describe('HistoryPage', () => {
  let fixture: ComponentFixture<HistoryPage>;
  let component: HistoryPage;
  let store: InstanceType<typeof HistoryStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideRouter([])],
    }).compileComponents();

    store = TestBed.inject(HistoryStore);
    store.clear();
    fixture = TestBed.createComponent(HistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the heading', () => {
    const heading = fixture.debugElement.query(By.css('h1'));
    expect(heading.nativeElement.textContent).toContain('Watch history');
  });

  it('should show empty state when no history entries exist', () => {
    const emptyState = fixture.debugElement.query(By.css('.state--empty'));
    expect(emptyState).toBeTruthy();
    expect(emptyState.nativeElement.textContent).toContain('No history yet');
  });

  it('should not show Clear all button when history is empty', () => {
    const clearBtn = fixture.debugElement.query(By.css('.link-btn'));
    expect(clearBtn).toBeNull();
  });

  it('should display history entries', () => {
    store.upsertSession(makeEntry());
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.item'));
    expect(items.length).toBe(1);
  });

  it('should show Clear all button when entries exist', () => {
    store.upsertSession(makeEntry());
    fixture.detectChanges();

    const clearBtn = fixture.debugElement.query(By.css('.link-btn'));
    expect(clearBtn).toBeTruthy();
    expect(clearBtn.nativeElement.textContent).toContain('Clear all');
  });

  it('should display the entry title', () => {
    store.upsertSession(makeEntry({ title: 'My Cool Video' }));
    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('.item__title'));
    expect(title.nativeElement.textContent).toContain('My Cool Video');
  });

  it('should show "Finished" badge for completed entries', () => {
    store.upsertSession(makeEntry({ status: 'finished' }));
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.badge--done'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent).toContain('Finished');
  });

  it('should show "Stopped at" badge for stopped entries', () => {
    store.upsertSession(makeEntry({ status: 'stopped', positionSec: 45 }));
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.badge--stop'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent).toContain('Stopped at');
  });

  it('should render the poster image when posterUrl is available', () => {
    store.upsertSession(makeEntry({ posterUrl: 'https://example.com/img.jpg' }));
    fixture.detectChanges();

    const img = fixture.debugElement.query(By.css('.item__thumb img'));
    expect(img).toBeTruthy();
    expect(img.nativeElement.src).toContain('https://example.com/img.jpg');
  });

  it('should render fallback when posterUrl is null', () => {
    store.upsertSession(makeEntry({ posterUrl: null }));
    fixture.detectChanges();

    const fallback = fixture.debugElement.query(By.css('.item__thumb-fallback'));
    expect(fallback).toBeTruthy();
  });

  it('should remove entry when Delete button is clicked', () => {
    store.upsertSession(makeEntry({ entryId: 'to-remove' }));
    fixture.detectChanges();

    const deleteBtn = fixture.debugElement.query(By.css('.btn--danger'));
    deleteBtn.nativeElement.click();
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.item'));
    expect(items.length).toBe(0);
  });

  it('should clear all entries when Clear all button is clicked', () => {
    store.upsertSession(makeEntry({ entryId: 'a' }));
    store.upsertSession(makeEntry({ entryId: 'b' }));
    fixture.detectChanges();

    const clearBtn = fixture.debugElement.query(By.css('.link-btn'));
    clearBtn.nativeElement.click();
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.item'));
    expect(items.length).toBe(0);
  });

  it('should have a "Browse videos" link in empty state', () => {
    const link = fixture.debugElement.query(By.css('.state--empty .btn'));
    expect(link).toBeTruthy();
    expect(link.nativeElement.textContent).toContain('Browse videos');
  });
});
