import {
  provideHttpClient,
} from '@angular/common/http';
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
  return {
    id,
    width: height * (16 / 9),
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
        width: height * (16 / 9),
        height,
        fps: 25,
        link: `https://x/${id}.mp4`,
      },
    ],
    video_pictures: [],
  };
}

function listResponse(videos: PexelsVideoDto[]): PexelsVideoListResponseDto {
  return {
    page: 1,
    per_page: 15,
    total_results: videos.length,
    url: '',
    videos,
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
    // Avoid stray auto-dismiss timers in fakeAsync.
    TestBed.inject(NotificationService).autoDismissMs = 0;
  });

  /** Inject the store and resolve its initial (onInit) popular load. */
  function bootstrap(initial: PexelsVideoDto[] = [makeDto(1)]): InstanceType<
    typeof VideosStore
  > {
    const store = TestBed.inject(VideosStore);
    tick(300); // debounce window for the initial empty query
    httpMock.expectOne((r) => r.url === POPULAR).flush(listResponse(initial));
    return store;
  }

  it('loads the popular feed on init', fakeAsync(() => {
    const store = bootstrap([makeDto(1), makeDto(2)]);
    expect(store.status()).toBe('success');
    expect(store.videos().length).toBe(2);
    httpMock.verify();
  }));

  it('debounces keystrokes and only searches the final query', fakeAsync(() => {
    const store = bootstrap();

    store.setQuery('o');
    store.setQuery('oc');
    store.setQuery('oce');
    tick(300);

    const reqs = httpMock.match((r) => r.url === SEARCH);
    expect(reqs.length).toBe(1);
    expect(reqs[0].request.params.get('query')).toBe('oce');
    reqs[0].flush(listResponse([makeDto(3)]));

    expect(store.status()).toBe('success');
    httpMock.verify();
  }));

  it('sets the empty state when a query returns no videos', fakeAsync(() => {
    const store = bootstrap();
    store.setQuery('nothing-here');
    tick(300);
    httpMock.expectOne((r) => r.url === SEARCH).flush(listResponse([]));
    expect(store.status()).toBe('empty');
    httpMock.verify();
  }));

  it('sets the error state and notifies on HTTP failure', fakeAsync(() => {
    const store = bootstrap();
    const notifications = TestBed.inject(NotificationService);

    store.setQuery('boom');
    tick(300);
    httpMock
      .expectOne((r) => r.url === SEARCH)
      .flush('err', { status: 500, statusText: 'Server Error' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBeTruthy();
    expect(notifications.notifications().length).toBe(1);
    httpMock.verify();
  }));

  it('filters client-side without issuing a new request', fakeAsync(() => {
    const store = bootstrap([makeDto(1, 1080), makeDto(2, 720)]);

    expect(store.availableResolutions()).toEqual(['1080p', '720p']);

    store.setResolutionFilter('720p');
    tick(300);

    expect(store.filteredVideos().map((v) => v.id)).toEqual([2]);
    httpMock.expectNone((r) => r.url === SEARCH);
    httpMock.expectNone((r) => r.url === POPULAR);
    httpMock.verify();
  }));

  it('exposes the selected video', fakeAsync(() => {
    const store = bootstrap([makeDto(1), makeDto(2)]);
    store.select(2);
    expect(store.selectedVideo()?.id).toBe(2);
    httpMock.verify();
  }));
});
