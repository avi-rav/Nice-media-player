import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  PexelsVideoDto,
  PexelsVideoListResponseDto,
} from '../../../core/models/pexels-api.dto';
import { NotificationService } from '../../../core/services/notification.service';
import { VideosStore } from './videos.store';

function makeDto(id: number, height = 1080): PexelsVideoDto {
  const width = Math.round(height * (16 / 9));
  return {
    id,
    width,
    height,
    duration: 20,
    url: `https://www.pexels.com/video/clip-${id}/`,
    image: 'https://x/poster.jpg',
    user: { id: 1, name: 'Author', url: 'https://x' },
    video_files: [
      {
        id: id * 10,
        quality: 'hd',
        file_type: 'video/mp4',
        width,
        height,
        fps: 25,
        link: `https://x/${id}.mp4`,
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
    ...(hasMore ? { next_page: 'https://api.pexels.com/...page=2' } : {}),
  };
}

const POPULAR = '/api/videos/popular';
const SEARCH = '/api/videos/search';

describe('VideosStore', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(NotificationService).autoDismissMs = 0;
  });

  /** Inject the store and resolve its initial (debounced) popular load. */
  function bootstrap(
    initial: PexelsVideoDto[] = [makeDto(1)],
    hasMore = false,
  ): InstanceType<typeof VideosStore> {
    const store = TestBed.inject(VideosStore);
    tick(300);
    httpMock
      .expectOne((r) => r.url === POPULAR)
      .flush(listResponse(initial, hasMore));
    return store;
  }

  it('loads the popular feed on init', fakeAsync(() => {
    const store = bootstrap([makeDto(1), makeDto(2)]);
    expect(store.status()).toBe('success');
    expect(store.videos().length).toBe(2);
    httpMock.verify();
  }));

  it('searches via the API, debounced, only for the final query', fakeAsync(() => {
    const store = bootstrap();

    store.setQuery('o');
    store.setQuery('oc');
    store.setQuery('ocean');
    tick(300);

    const reqs = httpMock.match((r) => r.url === SEARCH);
    expect(reqs.length).toBe(1);
    expect(reqs[0].request.params.get('query')).toBe('ocean');
    expect(reqs[0].request.params.get('page')).toBe('1');
    reqs[0].flush(listResponse([makeDto(9)]));

    expect(store.status()).toBe('success');
    expect(store.videos().map((v) => v.id)).toEqual([9]);
    httpMock.verify();
  }));

  it('sets the empty state when a search returns nothing', fakeAsync(() => {
    const store = bootstrap();
    store.setQuery('zzz');
    tick(300);
    httpMock.expectOne((r) => r.url === SEARCH).flush(listResponse([]));
    expect(store.status()).toBe('empty');
    httpMock.verify();
  }));

  it('loadMore fetches the next page and appends', fakeAsync(() => {
    const store = bootstrap([makeDto(1), makeDto(2)], true);
    expect(store.hasMore()).toBeTrue();

    store.loadMore();
    const req = httpMock.expectOne((r) => r.url === POPULAR);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(listResponse([makeDto(3)], false));

    expect(store.videos().map((v) => v.id)).toEqual([1, 2, 3]);
    expect(store.page()).toBe(2);
    expect(store.hasMore()).toBeFalse();
    httpMock.verify();
  }));

  it('de-duplicates videos that overlap between pages', fakeAsync(() => {
    const store = bootstrap([makeDto(1), makeDto(2)], true);

    store.loadMore();
    // Page 2 overlaps (id 2 again) and adds id 3.
    httpMock
      .expectOne((r) => r.url === POPULAR)
      .flush(listResponse([makeDto(2), makeDto(3)], false));

    expect(store.videos().map((v) => v.id)).toEqual([1, 2, 3]);
    httpMock.verify();
  }));

  it('does not load more when there are no further pages', fakeAsync(() => {
    const store = bootstrap([makeDto(1)], false);
    store.loadMore();
    httpMock.expectNone((r) => r.url === POPULAR);
    httpMock.verify();
  }));

  it('filters by resolution client-side without a new request', fakeAsync(() => {
    const store = bootstrap([makeDto(1, 1080), makeDto(2, 720)]);
    expect(store.availableResolutions()).toEqual(['1080p', '720p']);

    store.setResolutionFilter('720p');
    expect(store.filteredVideos().map((v) => v.id)).toEqual([2]);

    httpMock.expectNone((r) => r.url === POPULAR);
    httpMock.expectNone((r) => r.url === SEARCH);
    httpMock.verify();
  }));

  it('sets the error state and notifies on a failed load', fakeAsync(() => {
    const store = TestBed.inject(VideosStore);
    const notifications = TestBed.inject(NotificationService);
    tick(300);
    httpMock
      .expectOne((r) => r.url === POPULAR)
      .flush('err', { status: 500, statusText: 'Server Error' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBeTruthy();
    expect(notifications.notifications().length).toBe(1);
    httpMock.verify();
  }));

  it('exposes the selected video', fakeAsync(() => {
    const store = bootstrap([makeDto(1), makeDto(2)]);
    store.select(2);
    expect(store.selectedVideo()?.id).toBe(2);
    httpMock.verify();
  }));
});
