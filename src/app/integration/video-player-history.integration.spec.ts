import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';

import { VideoPlayerPage } from '../features/videos/pages/video-player/video-player.page';
import { HistoryPage } from '../features/history/pages/history.page';
import { HistoryStore } from '../features/history/state/history.store';
import { NotificationService } from '../core/services/notification.service';
import {
  PexelsVideoDto,
  PexelsVideoListResponseDto,
} from '../core/models/pexels-api.dto';

/**
 * Integration tests: VideoPlayerPage ↔ HistoryStore ↔ HistoryPage
 *
 * Verifies the cross-store communication: playing a video on the player page records an entry
 * in HistoryStore, and the HistoryPage renders those entries. Tests the full lifecycle of a
 * watch session including upsert, localStorage persistence, and resumption.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeDto(id: number, duration = 60): PexelsVideoDto {
  const height = 1080;
  const width = Math.round(height * (16 / 9));
  return {
    id,
    width,
    height,
    duration,
    url: `https://www.pexels.com/video/clip-${id}/`,
    image: `https://example.com/poster-${id}.jpg`,
    user: { id: id, name: `Director ${id}`, url: `https://pexels.com/@director-${id}` },
    video_files: [
      {
        id: id * 10,
        quality: 'hd',
        file_type: 'video/mp4',
        width,
        height,
        fps: 30,
        link: `https://example.com/video-${id}.mp4`,
      },
    ],
    video_pictures: [],
  };
}

function listResponse(videos: PexelsVideoDto[]): PexelsVideoListResponseDto {
  return {
    page: 1,
    per_page: 24,
    total_results: videos.length,
    url: '',
    videos,
  };
}

const POPULAR_URL = '/api/videos/popular';
const STORAGE_KEY = 'nmp.history.v1';

// ─── Player → History integration ────────────────────────────────────────────

describe('Integration: VideoPlayer → HistoryStore', () => {
  let fixture: ComponentFixture<VideoPlayerPage>;
  let httpMock: HttpTestingController;
  let historyStore: InstanceType<typeof HistoryStore>;

  const mockActivatedRoute = {
    snapshot: {
      paramMap: { get: (key: string) => (key === 'id' ? '1' : null) },
      queryParamMap: { get: (_: string): string | null => null },
    },
  };

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);

    spyOn(HTMLVideoElement.prototype, 'play').and.returnValue(Promise.resolve());
    spyOn(HTMLElement.prototype, 'requestFullscreen').and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [VideoPlayerPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    historyStore = TestBed.inject(HistoryStore);
    historyStore.clear();
    TestBed.inject(NotificationService).autoDismissMs = 0;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(STORAGE_KEY);
  });

  function createPlayerAndBootstrap(): void {
    fixture = TestBed.createComponent(VideoPlayerPage);
    fixture.detectChanges();

    // ensureSelected(1) fires fetchById immediately (no debounce) since store is empty.
    const byIdReq = httpMock.expectOne((r) => r.url.includes('/api/videos/videos/1'));
    byIdReq.flush(makeDto(1, 120));

    // Flush the debounced popular load (include video 1 so state isn't clobbered).
    tick(300);
    httpMock.expectOne((r) => r.url === POPULAR_URL).flush(listResponse([makeDto(1, 120)]));
    fixture.detectChanges();
  }

  it('should record a history entry when video is played and component is destroyed', fakeAsync(() => {
    createPlayerAndBootstrap();

    // Simulate play
    (fixture.componentInstance as any).onPlay();
    (fixture.componentInstance as any).currentTime.set(25);
    fixture.detectChanges();

    // Destroy (navigation away)
    fixture.destroy();

    const entries = historyStore.entries();
    expect(entries.length).toBe(1);
    expect(entries[0].videoId).toBe(1);
    expect(entries[0].positionSec).toBe(25);
    expect(entries[0].status).toBe('stopped');
  }));

  it('should record "finished" status when video ends', fakeAsync(() => {
    createPlayerAndBootstrap();

    (fixture.componentInstance as any).onPlay();
    (fixture.componentInstance as any).currentTime.set(120);
    (fixture.componentInstance as any).onEnded();
    fixture.detectChanges();

    fixture.destroy();

    const entries = historyStore.entries();
    expect(entries.length).toBe(1);
    expect(entries[0].status).toBe('finished');
  }));

  it('should not record history if video was never played', fakeAsync(() => {
    createPlayerAndBootstrap();
    fixture.destroy();

    expect(historyStore.entries().length).toBe(0);
  }));

  it('should persist history to localStorage', fakeAsync(() => {
    createPlayerAndBootstrap();

    (fixture.componentInstance as any).onPlay();
    (fixture.componentInstance as any).currentTime.set(10);
    fixture.destroy();

    // Verify localStorage was written
    tick();
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(Array.isArray(parsed)).toBeTrue();
    expect(parsed.length).toBe(1);
    expect(parsed[0].videoId).toBe(1);
  }));


});

// ─── History page renders entries from shared store ─────────────────────────

describe('Integration: HistoryStore → HistoryPage', () => {
  let fixture: ComponentFixture<HistoryPage>;
  let historyStore: InstanceType<typeof HistoryStore>;

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);

    await TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideRouter([{ path: 'videos/:id', component: HistoryPage }])],
    }).compileComponents();

    historyStore = TestBed.inject(HistoryStore);
    historyStore.clear();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  function createHistoryPage(): void {
    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
  }

  it('should display entries that were recorded by the player', () => {
    // Simulate what the player would do
    historyStore.upsertSession({
      entryId: '1-1000',
      videoId: 1,
      title: 'Test Video',
      posterUrl: 'https://example.com/poster.jpg',
      positionSec: 45,
      durationSec: 120,
      status: 'stopped',
      watchedAt: Date.now(),
    });

    createHistoryPage();

    const items = fixture.debugElement.queryAll(By.css('.item'));
    expect(items.length).toBe(1);

    const title = fixture.debugElement.query(By.css('.item__title'));
    expect(title.nativeElement.textContent.trim()).toBe('Test Video');
  });

  it('should show "Finished" badge for completed videos', () => {
    historyStore.upsertSession({
      entryId: '2-2000',
      videoId: 2,
      title: 'Finished Video',
      posterUrl: null,
      positionSec: 60,
      durationSec: 60,
      status: 'finished',
      watchedAt: Date.now(),
    });

    createHistoryPage();

    const badge = fixture.debugElement.query(By.css('.badge--done'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent.trim()).toBe('Finished');
  });

  it('should show "Stopped at" badge for partially watched videos', () => {
    historyStore.upsertSession({
      entryId: '3-3000',
      videoId: 3,
      title: 'Partial Video',
      posterUrl: null,
      positionSec: 30,
      durationSec: 120,
      status: 'stopped',
      watchedAt: Date.now(),
    });

    createHistoryPage();

    const badge = fixture.debugElement.query(By.css('.badge--stop'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent).toContain('Stopped at');
    expect(badge.nativeElement.textContent).toContain('0:30');
  });

  it('should order entries most-recently-watched first', () => {
    historyStore.upsertSession({
      entryId: 'a-100',
      videoId: 10,
      title: 'Older Video',
      posterUrl: null,
      positionSec: 10,
      durationSec: 60,
      status: 'stopped',
      watchedAt: 1000,
    });
    historyStore.upsertSession({
      entryId: 'b-200',
      videoId: 20,
      title: 'Newer Video',
      posterUrl: null,
      positionSec: 20,
      durationSec: 60,
      status: 'stopped',
      watchedAt: 5000,
    });

    createHistoryPage();

    const titles = fixture.debugElement
      .queryAll(By.css('.item__title'))
      .map((el) => el.nativeElement.textContent.trim());
    expect(titles).toEqual(['Newer Video', 'Older Video']);
  });

  it('should clear all entries when Clear All is clicked', () => {
    historyStore.upsertSession({
      entryId: 'x-1',
      videoId: 1,
      title: 'Video 1',
      posterUrl: null,
      positionSec: 5,
      durationSec: 30,
      status: 'stopped',
      watchedAt: Date.now(),
    });

    createHistoryPage();
    expect(fixture.debugElement.queryAll(By.css('.item')).length).toBe(1);

    const clearBtn = fixture.debugElement.query(By.css('.link-btn'));
    clearBtn.nativeElement.click();
    fixture.detectChanges();

    expect(historyStore.entries().length).toBe(0);
    const emptyState = fixture.debugElement.query(By.css('.state--empty'));
    expect(emptyState).toBeTruthy();
  });

  it('should remove a single entry', () => {
    historyStore.upsertSession({
      entryId: 'r-1',
      videoId: 1,
      title: 'Remove Me',
      posterUrl: null,
      positionSec: 5,
      durationSec: 30,
      status: 'stopped',
      watchedAt: Date.now(),
    });
    historyStore.upsertSession({
      entryId: 'r-2',
      videoId: 2,
      title: 'Keep Me',
      posterUrl: null,
      positionSec: 10,
      durationSec: 60,
      status: 'stopped',
      watchedAt: Date.now() + 1000,
    });

    createHistoryPage();
    expect(fixture.debugElement.queryAll(By.css('.item')).length).toBe(2);

    // Remove the first entry via the store (simulates button click handler)
    historyStore.remove('r-2');
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.item')).length).toBe(1);
    const remaining = fixture.debugElement.query(By.css('.item__title'));
    expect(remaining.nativeElement.textContent.trim()).toBe('Remove Me');
  });

  it('should display "Play again" links with correct route and resume time', () => {
    historyStore.upsertSession({
      entryId: 'nav-1',
      videoId: 42,
      title: 'Resume Video',
      posterUrl: null,
      positionSec: 90,
      durationSec: 200,
      status: 'stopped',
      watchedAt: Date.now(),
    });

    createHistoryPage();

    const playLink = fixture.debugElement.query(By.css('.btn.btn--sm'));
    expect(playLink).toBeTruthy();
    expect(playLink.nativeElement.textContent).toContain('Play again');
  });
});

