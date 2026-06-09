import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';

import { VideoPlayerPage } from '../features/videos/pages/video-player/video-player.page';
import { VideoListPage } from '../features/videos/pages/video-list/video-list.page';
import { HistoryPage } from '../features/history/pages/history.page';
import { VideosStore } from '../features/videos/state/videos.store';
import { HistoryStore } from '../features/history/state/history.store';
import { NotificationService } from '../core/services/notification.service';
import {
  PexelsVideoDto,
  PexelsVideoListResponseDto,
} from '../core/models/pexels-api.dto';

/**
 * Integration tests: Deep-linking & Cross-page State
 *
 * Verifies routing-related integration scenarios:
 * - Deep-linking to a player page fetches the video by ID
 * - The store's ensureSelected bridges the gap between the list and the player
 * - Video cards produce proper routerLink targets
 * - History entries link back to the correct video with resume time
 */

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeDto(id: number, height = 1080, duration = 60): PexelsVideoDto {
  const width = Math.round(height * (16 / 9));
  return {
    id,
    width,
    height,
    duration,
    url: `https://www.pexels.com/video/clip-${id}/`,
    image: `https://example.com/poster-${id}.jpg`,
    user: { id, name: `Author ${id}`, url: `https://pexels.com/@author-${id}` },
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

function listResponse(
  videos: PexelsVideoDto[],
  hasMore = false,
): PexelsVideoListResponseDto {
  return {
    page: 1,
    per_page: 24,
    total_results: videos.length,
    url: '',
    videos,
    ...(hasMore ? { next_page: 'https://api.pexels.com/videos/popular?page=2' } : {}),
  };
}

const POPULAR_URL = '/api/videos/popular';
const STORAGE_KEY = 'nmp.history.v1';

// ─── Deep-linking to VideoPlayerPage ─────────────────────────────────────────

describe('Integration: Deep-link to VideoPlayerPage', () => {
  let fixture: ComponentFixture<VideoPlayerPage>;
  let httpMock: HttpTestingController;

  const mockRoute = {
    snapshot: {
      paramMap: { get: (key: string): string | null => (key === 'id' ? '1' : null) },
      queryParamMap: { get: (_: string): string | null => null },
    },
  };

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);
    // Reset to defaults before each test
    mockRoute.snapshot.paramMap.get = (key: string) => (key === 'id' ? '1' : null);
    mockRoute.snapshot.queryParamMap.get = () => null;

    spyOn(HTMLVideoElement.prototype, 'play').and.returnValue(Promise.resolve());
    spyOn(HTMLElement.prototype, 'requestFullscreen').and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [VideoPlayerPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(HistoryStore).clear();
    TestBed.inject(NotificationService).autoDismissMs = 0;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('should fetch a video by ID when deep-linked and store is empty', fakeAsync(() => {
    mockRoute.snapshot.paramMap.get = (key: string) => (key === 'id' ? '7' : null);
    fixture = TestBed.createComponent(VideoPlayerPage);
    fixture.detectChanges();

    // fetchById fires immediately (no debounce)
    const byIdReq = httpMock.expectOne((r) => r.url.includes('/api/videos/videos/7'));
    expect(byIdReq.request.method).toBe('GET');
    byIdReq.flush(makeDto(7, 1080, 90));

    // Flush the debounced popular load (include video 7 so it's not clobbered)
    tick(300);
    httpMock.expectOne((r) => r.url === POPULAR_URL).flush(listResponse([makeDto(7, 1080, 90)]));
    fixture.detectChanges();

    const store = TestBed.inject(VideosStore);
    expect(store.selectedVideo()?.id).toBe(7);
    expect(store.status()).toBe('success');
  }));

  it('should use existing store data without extra fetch when video is loaded', fakeAsync(() => {
    mockRoute.snapshot.paramMap.get = (key: string) => (key === 'id' ? '3' : null);
    fixture = TestBed.createComponent(VideoPlayerPage);
    fixture.detectChanges();

    // Flush fetch-by-id for video 3
    httpMock.expectOne((r) => r.url.includes('/api/videos/videos/3')).flush(makeDto(3));
    tick(300);
    httpMock.expectOne((r) => r.url === POPULAR_URL).flush(listResponse([makeDto(3)]));
    fixture.detectChanges();

    const store = TestBed.inject(VideosStore);
    expect(store.videos().find((v) => v.id === 3)).toBeTruthy();

    // Select the same video again — no new request
    store.ensureSelected(3);
    fixture.detectChanges();
    httpMock.expectNone((r) => r.url.includes('/api/videos/videos'));
    expect(store.selectedVideo()?.id).toBe(3);
  }));



  it('should resume playback from query param "t"', fakeAsync(() => {
    mockRoute.snapshot.paramMap.get = (key: string) => (key === 'id' ? '5' : null);
    mockRoute.snapshot.queryParamMap.get = (key: string) => (key === 't' ? '45' : null);
    fixture = TestBed.createComponent(VideoPlayerPage);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.includes('/api/videos/videos/5')).flush(makeDto(5));
    tick(300);
    httpMock.expectOne((r) => r.url === POPULAR_URL).flush(listResponse([makeDto(5)]));
    fixture.detectChanges();

    expect((fixture.componentInstance as any).resumeTo).toBe(45);
  }));
});

// ─── VideoListPage route links ──────────────────────────────────────────────

describe('Integration: VideoListPage routing links', () => {
  let fixture: ComponentFixture<VideoListPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoListPage],
      providers: [
        provideRouter([{ path: 'videos/:id', component: VideoListPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(NotificationService).autoDismissMs = 0;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should generate correct routerLinks for playable videos', fakeAsync(() => {
    fixture = TestBed.createComponent(VideoListPage);
    fixture.detectChanges();
    tick(300);
    httpMock
      .expectOne((r) => r.url === POPULAR_URL)
      .flush(listResponse([makeDto(42), makeDto(99)]));
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('.card'));
    expect(cards.length).toBe(2);

    // Verify the routerLink href targets
    const firstHref = cards[0].nativeElement.getAttribute('href');
    const secondHref = cards[1].nativeElement.getAttribute('href');
    expect(firstHref).toBe('/videos/42');
    expect(secondHref).toBe('/videos/99');
  }));

  it('should not provide routerLink for unavailable videos', fakeAsync(() => {
    const unavailable = makeDto(10);
    unavailable.video_files = [];

    fixture = TestBed.createComponent(VideoListPage);
    fixture.detectChanges();
    tick(300);
    httpMock
      .expectOne((r) => r.url === POPULAR_URL)
      .flush(listResponse([unavailable]));
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.css('.card'));
    expect(card.nativeElement.getAttribute('href')).toBeNull();
    expect(card.nativeElement.getAttribute('aria-disabled')).toBe('true');
  }));
});

// ─── HistoryPage route links ────────────────────────────────────────────────

describe('Integration: HistoryPage navigation links', () => {
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

  it('should link "Play again" to the correct video with resume time', () => {
    historyStore.upsertSession({
      entryId: 'link-1',
      videoId: 42,
      title: 'Resumable Video',
      posterUrl: null,
      positionSec: 90,
      durationSec: 200,
      status: 'stopped',
      watchedAt: Date.now(),
    });

    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();

    const playLink = fixture.debugElement.query(By.css('.btn.btn--sm'));
    expect(playLink).toBeTruthy();
    const href = playLink.nativeElement.getAttribute('href');
    expect(href).toContain('/videos/42');
    expect(href).toContain('t=90');
  });

  it('should link "Play again" for finished videos with t=0', () => {
    historyStore.upsertSession({
      entryId: 'link-2',
      videoId: 7,
      title: 'Finished Video',
      posterUrl: null,
      positionSec: 120,
      durationSec: 120,
      status: 'finished',
      watchedAt: Date.now(),
    });

    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();

    const playLink = fixture.debugElement.query(By.css('.btn.btn--sm'));
    const href = playLink.nativeElement.getAttribute('href');
    expect(href).toContain('/videos/7');
    expect(href).toContain('t=0');
  });

  it('should link poster thumbnail to the correct video', () => {
    historyStore.upsertSession({
      entryId: 'link-3',
      videoId: 55,
      title: 'Clickable Poster',
      posterUrl: 'https://example.com/poster.jpg',
      positionSec: 30,
      durationSec: 60,
      status: 'stopped',
      watchedAt: Date.now(),
    });

    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();

    const thumbLink = fixture.debugElement.query(By.css('.item__thumb'));
    expect(thumbLink).toBeTruthy();
    const href = thumbLink.nativeElement.getAttribute('href');
    expect(href).toContain('/videos/55');
  });
});
