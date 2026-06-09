import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

import { VideoListPage } from '../features/videos/pages/video-list/video-list.page';
import { VideosStore } from '../features/videos/state/videos.store';
import { NotificationService } from '../core/services/notification.service';
import {
  PexelsVideoDto,
  PexelsVideoListResponseDto,
} from '../core/models/pexels-api.dto';

/**
 * Integration tests: API → VideoCatalogService → VideosStore → VideoListPage
 *
 * These tests verify the full data-flow from HTTP response through the service/store layers
 * into the rendered component. Unlike unit tests, they exercise the real service and store
 * implementations with only the HTTP layer mocked.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeDto(id: number, height = 1080, duration = 30): PexelsVideoDto {
  const width = Math.round(height * (16 / 9));
  return {
    id,
    width,
    height,
    duration,
    url: `https://www.pexels.com/video/clip-${id}/`,
    image: `https://example.com/poster-${id}.jpg`,
    user: { id: id, name: `Author ${id}`, url: `https://pexels.com/@author-${id}` },
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
    video_pictures: [{ id: id * 100, picture: `https://example.com/pic-${id}.jpg`, nr: 0 }],
  };
}

function makeDtoMultiRes(id: number, heights: number[]): PexelsVideoDto {
  const dto = makeDto(id, Math.max(...heights));
  dto.video_files = heights.map((h, i) => ({
    id: id * 10 + i,
    quality: h >= 720 ? ('hd' as const) : ('sd' as const),
    file_type: 'video/mp4',
    width: Math.round(h * (16 / 9)),
    height: h,
    fps: 30,
    link: `https://example.com/video-${id}-${h}p.mp4`,
  }));
  return dto;
}

function listResponse(
  videos: PexelsVideoDto[],
  page = 1,
  hasMore = false,
): PexelsVideoListResponseDto {
  return {
    page,
    per_page: 24,
    total_results: videos.length + (hasMore ? 24 : 0),
    url: '',
    videos,
    ...(hasMore ? { next_page: `https://api.pexels.com/videos/popular?page=${page + 1}` } : {}),
  };
}

const POPULAR_URL = '/api/videos/popular';
const SEARCH_URL = '/api/videos/search';

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Integration: Video Catalog Flow (API → Service → Store → UI)', () => {
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

  /** Lazily access the store within fakeAsync zones. */
  function getStore(): InstanceType<typeof VideosStore> {
    return TestBed.inject(VideosStore);
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(VideoListPage);
    fixture.detectChanges();
  }

  function flushInitialLoad(videos: PexelsVideoDto[] = [makeDto(1)], hasMore = false): void {
    tick(300);
    const req = httpMock.expectOne((r) => r.url === POPULAR_URL);
    req.flush(listResponse(videos, 1, hasMore));
    fixture.detectChanges();
  }

  // ─── Full data pipeline ─────────────────────────────────────────────────────

  describe('full data pipeline: popular feed', () => {
    it('should load popular videos and render them as cards through the full pipeline', fakeAsync(() => {
      const dtos = [makeDto(1), makeDto(2), makeDto(3)];
      createComponent();
      flushInitialLoad(dtos);

      // Verify store state was hydrated
      expect(getStore().status()).toBe('success');
      expect(getStore().videos().length).toBe(3);

      // Verify component renders the correct number of cards
      const cards = fixture.debugElement.queryAll(By.css('.card'));
      expect(cards.length).toBe(3);

      // Verify authors appear in the DOM
      const authors = cards.map((c) =>
        c.query(By.css('.card__author'))?.nativeElement.textContent.trim(),
      );
      expect(authors).toEqual(['Author 1', 'Author 2', 'Author 3']);
    }));

    it('should correctly map video duration through all layers', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1, 1080, 125)]);

      const durationEl = fixture.debugElement.query(By.css('.card__duration'));
      expect(durationEl).toBeTruthy();
      // 125 seconds = 2:05
      expect(durationEl.nativeElement.textContent.trim()).toBe('2:05');
    }));

    it('should map resolution labels through the pipeline and display badges', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1, 2160), makeDto(2, 720)]);

      const badges = fixture.debugElement.queryAll(By.css('.card__res'));
      expect(badges.length).toBe(2);
      expect(badges[0].nativeElement.textContent.trim()).toBe('4K');
      expect(badges[1].nativeElement.textContent.trim()).toBe('720p');
    }));
  });

  // ─── Search → API → UI flow ────────────────────────────────────────────────

  describe('search flow end-to-end', () => {
    it('should debounce input, send search request, and update the grid', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1)]);

      // Simulate typing in the search box
      const input = fixture.debugElement.query(By.css('.search__input'));
      input.nativeElement.value = 'nature';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // Before debounce fires, no new request
      tick(100);
      httpMock.expectNone((r) => r.url === SEARCH_URL);

      // After debounce, search request fires
      tick(200);
      const searchReq = httpMock.expectOne((r) => r.url === SEARCH_URL);
      expect(searchReq.request.params.get('query')).toBe('nature');
      expect(searchReq.request.params.get('page')).toBe('1');

      // Respond with search results
      searchReq.flush(listResponse([makeDto(10), makeDto(11)]));
      fixture.detectChanges();

      // Verify UI updated
      const cards = fixture.debugElement.queryAll(By.css('.card'));
      expect(cards.length).toBe(2);
      expect(getStore().videos().map((v) => v.id)).toEqual([10, 11]);
    }));

    it('should cancel in-flight search when query changes (switchMap behavior)', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1)]);

      const input = fixture.debugElement.query(By.css('.search__input'));

      // First search
      input.nativeElement.value = 'ocean';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick(300);

      const firstReq = httpMock.expectOne(
        (r) => r.url === SEARCH_URL && r.params.get('query') === 'ocean',
      );

      // Change query before first resolves — second search
      input.nativeElement.value = 'forest';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick(300);

      // First request was cancelled (switchMap); the new one fires
      expect(firstReq.cancelled).toBeTrue();
      const secondReq = httpMock.expectOne(
        (r) => r.url === SEARCH_URL && r.params.get('query') === 'forest',
      );
      secondReq.flush(listResponse([makeDto(20)]));
      fixture.detectChanges();

      expect(getStore().videos().map((v) => v.id)).toEqual([20]);
    }));

    it('should return to popular feed when search query is cleared', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1)]);

      // Search for something
      const input = fixture.debugElement.query(By.css('.search__input'));
      input.nativeElement.value = 'test';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick(300);
      httpMock.expectOne((r) => r.url === SEARCH_URL).flush(listResponse([makeDto(5)]));
      fixture.detectChanges();

      // Clear the search
      input.nativeElement.value = '';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick(300);

      const popularReq = httpMock.expectOne((r) => r.url === POPULAR_URL);
      popularReq.flush(listResponse([makeDto(1), makeDto(2)]));
      fixture.detectChanges();

      expect(getStore().videos().length).toBe(2);
      const cards = fixture.debugElement.queryAll(By.css('.card'));
      expect(cards.length).toBe(2);
    }));

    it('should show empty state when search returns no results', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1)]);

      const input = fixture.debugElement.query(By.css('.search__input'));
      input.nativeElement.value = 'zzzzz_no_results';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick(300);

      httpMock.expectOne((r) => r.url === SEARCH_URL).flush(listResponse([]));
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.state--empty'));
      expect(emptyState).toBeTruthy();
      expect(emptyState.nativeElement.textContent).toContain('No videos found');
    }));
  });

  // ─── Resolution filter (client-side) integration ────────────────────────────

  describe('resolution filter integration', () => {
    it('should filter videos client-side without hitting the API', fakeAsync(() => {
      createComponent();
      flushInitialLoad([
        makeDto(1, 1080),
        makeDto(2, 720),
        makeDto(3, 2160),
      ]);

      // All loaded — 3 cards
      expect(fixture.debugElement.queryAll(By.css('.card')).length).toBe(3);

      // Filter to 720p only
      getStore().setResolutionFilter('720p');
      fixture.detectChanges();

      const filteredCards = fixture.debugElement.queryAll(By.css('.card'));
      expect(filteredCards.length).toBe(1);

      // No additional HTTP requests made
      httpMock.expectNone(() => true);
    }));

    it('should populate the resolution dropdown from loaded videos', fakeAsync(() => {
      createComponent();
      flushInitialLoad([
        makeDto(1, 2160),
        makeDto(2, 1080),
        makeDto(3, 720),
      ]);

      const options = fixture.debugElement.queryAll(By.css('.filter__select option'));
      // "All resolutions" + each distinct resolution
      expect(options.length).toBeGreaterThanOrEqual(4);
      const optionTexts = options.map((o) => o.nativeElement.textContent.trim());
      expect(optionTexts).toContain('All resolutions');
      expect(optionTexts).toContain('4K');
      expect(optionTexts).toContain('1080p');
      expect(optionTexts).toContain('720p');
    }));

    it('should show "No matches" when filter hides all loaded videos', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1, 1080), makeDto(2, 1080)]);

      getStore().setResolutionFilter('4K');
      fixture.detectChanges();

      const noMatch = fixture.debugElement.query(By.css('.state--empty'));
      expect(noMatch).toBeTruthy();
      expect(noMatch.nativeElement.textContent).toContain('No matches');
    }));
  });

  // ─── Pagination (load more) ─────────────────────────────────────────────────

  describe('pagination: load more', () => {
    it('should append next page results without removing existing videos', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1), makeDto(2)], true);

      expect(getStore().hasMore()).toBeTrue();

      // Click "Load more"
      const loadMoreBtn = fixture.debugElement.query(By.css('.load-more .btn'));
      expect(loadMoreBtn).toBeTruthy();
      loadMoreBtn.nativeElement.click();
      fixture.detectChanges();

      // Respond with page 2
      const page2Req = httpMock.expectOne(
        (r) => r.url === POPULAR_URL && r.params.get('page') === '2',
      );
      page2Req.flush(listResponse([makeDto(3), makeDto(4)], 2, false));
      fixture.detectChanges();

      // All 4 videos rendered
      expect(getStore().videos().length).toBe(4);
      const cards = fixture.debugElement.queryAll(By.css('.card'));
      expect(cards.length).toBe(4);
      expect(getStore().hasMore()).toBeFalse();
    }));

    it('should de-duplicate videos across pages', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1), makeDto(2)], true);

      getStore().loadMore();
      tick();

      const req = httpMock.expectOne((r) => r.url === POPULAR_URL);
      // Page 2 overlaps with id 2
      req.flush(listResponse([makeDto(2), makeDto(3)], 2, false));
      fixture.detectChanges();

      expect(getStore().videos().map((v) => v.id)).toEqual([1, 2, 3]);
    }));

    it('should not show load more button when no more pages', fakeAsync(() => {
      createComponent();
      flushInitialLoad([makeDto(1)], false);

      const loadMoreBtn = fixture.debugElement.query(By.css('.load-more .btn'));
      expect(loadMoreBtn).toBeNull();
    }));
  });

  // ─── Error handling integration ─────────────────────────────────────────────

  describe('error handling across layers', () => {
    it('should map 500 errors through ErrorMapper → Store → UI error state', fakeAsync(() => {
      createComponent();
      tick(300);

      httpMock
        .expectOne((r) => r.url === POPULAR_URL)
        .flush('Internal Server Error', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(getStore().status()).toBe('error');
      const errorDiv = fixture.debugElement.query(By.css('.state--error'));
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.nativeElement.textContent).toContain('Something went wrong');
      expect(errorDiv.nativeElement.textContent).toContain('Pexels is having trouble');
    }));

    it('should show a notification toast on API failure', fakeAsync(() => {
      const notifications = TestBed.inject(NotificationService);
      createComponent();
      tick(300);

      httpMock
        .expectOne((r) => r.url === POPULAR_URL)
        .flush('', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(notifications.notifications().length).toBe(1);
      expect(notifications.notifications()[0].level).toBe('error');
    }));

    it('should recover via retry button after an error', fakeAsync(() => {
      createComponent();
      tick(300);
      httpMock
        .expectOne((r) => r.url === POPULAR_URL)
        .flush('', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(getStore().status()).toBe('error');

      // Click Retry
      const retryBtn = fixture.debugElement.query(By.css('.state--error .btn'));
      expect(retryBtn).toBeTruthy();
      retryBtn.nativeElement.click();
      fixture.detectChanges();

      // New request fires
      const retryReq = httpMock.expectOne((r) => r.url === POPULAR_URL);
      retryReq.flush(listResponse([makeDto(1), makeDto(2)]));
      fixture.detectChanges();

      expect(getStore().status()).toBe('success');
      expect(fixture.debugElement.queryAll(By.css('.card')).length).toBe(2);
    }));

    it('should map 429 rate-limit error to user-friendly message', fakeAsync(() => {
      createComponent();
      tick(300);

      httpMock
        .expectOne((r) => r.url === POPULAR_URL)
        .flush('', { status: 429, statusText: 'Too Many Requests' });
      fixture.detectChanges();

      expect(getStore().error()).toContain('rate limit');
    }));

    it('should map network error (status 0) to connectivity message', fakeAsync(() => {
      createComponent();
      tick(300);

      httpMock
        .expectOne((r) => r.url === POPULAR_URL)
        .error(new ProgressEvent('error'), { status: 0 });
      fixture.detectChanges();

      expect(getStore().error()).toContain('Network error');
    }));
  });

  // ─── Defensive mapping integration ─────────────────────────────────────────

  describe('defensive mapping: malformed API responses', () => {
    it('should skip videos with missing id and render valid ones', fakeAsync(() => {
      createComponent();
      tick(300);

      const brokenDto = { ...makeDto(1) } as any;
      delete brokenDto.id;

      const response = listResponse([brokenDto, makeDto(2)]);
      httpMock.expectOne((r) => r.url === POPULAR_URL).flush(response);
      fixture.detectChanges();

      // Only the valid one renders
      expect(getStore().videos().length).toBe(1);
      expect(getStore().videos()[0].id).toBe(2);
      const cards = fixture.debugElement.queryAll(By.css('.card'));
      expect(cards.length).toBe(1);
    }));

    it('should mark videos with no usable sources as unavailable', fakeAsync(() => {
      const dtoNoFiles = makeDto(5);
      dtoNoFiles.video_files = [];

      createComponent();
      flushInitialLoad([dtoNoFiles]);

      const card = fixture.debugElement.query(By.css('.card'));
      expect(card.classes['card--disabled']).toBeTrue();
      const unavailBadge = fixture.debugElement.query(By.css('.card__unavailable'));
      expect(unavailBadge).toBeTruthy();
    }));
  });
});
