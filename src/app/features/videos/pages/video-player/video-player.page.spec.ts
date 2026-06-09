import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { VideoPlayerPage } from './video-player.page';
import { VideosStore } from '../../state/videos.store';
import { HistoryStore } from '../../../history/state/history.store';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PexelsVideoDto,
  PexelsVideoListResponseDto,
} from '../../../../core/models/pexels-api.dto';

function makeDto(id: number, height = 1080): PexelsVideoDto {
  const width = Math.round(height * (16 / 9));
  return {
    id,
    width,
    height,
    duration: 60,
    url: `https://www.pexels.com/video/clip-${id}/`,
    image: 'https://example.com/poster.jpg',
    user: { id: 1, name: 'Director', url: 'https://x' },
    video_files: [
      {
        id: id * 10,
        quality: 'hd',
        file_type: 'video/mp4',
        width,
        height,
        fps: 30,
        link: `https://example.com/${id}.mp4`,
      },
    ],
    video_pictures: [],
  };
}

function listResponse(
  videos: PexelsVideoDto[],
): PexelsVideoListResponseDto {
  return {
    page: 1,
    per_page: 24,
    total_results: videos.length,
    url: '',
    videos,
  };
}

const POPULAR = '/api/videos/popular';
const VIDEO_BY_ID = '/api/videos/videos/1';

describe('VideoPlayerPage', () => {
  let fixture: ComponentFixture<VideoPlayerPage>;
  let component: VideoPlayerPage;
  let httpMock: HttpTestingController;
  let historyStore: InstanceType<typeof HistoryStore>;

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string): string | null => (key === 'id' ? '1' : null),
      },
      queryParamMap: {
        get: (key: string): string | null => null,
      },
    },
  };

  beforeEach(async () => {
    // Prevent unhandled promise rejections from browser autoplay/fullscreen policies.
    spyOn(HTMLVideoElement.prototype, 'play').and.returnValue(Promise.resolve());
    spyOn(HTMLElement.prototype, 'requestFullscreen').and.returnValue(
      Promise.resolve(),
    );

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

  /**
   * Creates the component and resolves both the initial popular-feed debounce
   * and the ensureSelected(1) fetch-by-id request.
   */
  function createAndBootstrap(): void {
    fixture = TestBed.createComponent(VideoPlayerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Flush the debounced popular load triggered by the store's onInit hook.
    tick(300);
    const popularReq = httpMock.expectOne((r) => r.url === POPULAR);
    popularReq.flush(listResponse([]));

    // ensureSelected(1) fires fetchById since store is empty after popular flush.
    const byIdReq = httpMock.expectOne((r) => r.url === VIDEO_BY_ID);
    byIdReq.flush(makeDto(1));
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', fakeAsync(() => {
    createAndBootstrap();
    expect(component).toBeTruthy();
  }));

  it('should call ensureSelected on init with the route param id', fakeAsync(() => {
    const store = TestBed.inject(VideosStore);
    spyOn(store, 'ensureSelected').and.callThrough();

    fixture = TestBed.createComponent(VideoPlayerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(store.ensureSelected).toHaveBeenCalledWith(1);

    // Flush pending requests.
    tick(300);
    httpMock.expectOne((r) => r.url === POPULAR).flush(listResponse([]));
    httpMock.expectOne((r) => r.url === VIDEO_BY_ID).flush(makeDto(1));
  }));

  it('should expose the selected video from store', fakeAsync(() => {
    createAndBootstrap();
    const video = component['store'].selectedVideo();
    expect(video).toBeTruthy();
    expect(video?.id).toBe(1);
  }));

  it('should initialize isPlaying as false', fakeAsync(() => {
    createAndBootstrap();
    expect(component['isPlaying']()).toBe(false);
  }));

  it('should initialize volume at 1', fakeAsync(() => {
    createAndBootstrap();
    expect(component['volume']()).toBe(1);
  }));

  it('should initialize muted as false', fakeAsync(() => {
    createAndBootstrap();
    expect(component['muted']()).toBe(false);
  }));

  it('should not throw on keyboard shortcut "m" without video element', fakeAsync(() => {
    createAndBootstrap();
    expect(() => {
      component['onKeydown'](new KeyboardEvent('keydown', { key: 'm' }));
    }).not.toThrow();
  }));

  it('should not throw on keyboard shortcut "f" without video element', fakeAsync(() => {
    createAndBootstrap();
    expect(() => {
      component['onKeydown'](new KeyboardEvent('keydown', { key: 'f' }));
    }).not.toThrow();
  }));

  it('should not throw on keyboard shortcut space without video element', fakeAsync(() => {
    createAndBootstrap();
    expect(() => {
      component['onKeydown'](new KeyboardEvent('keydown', { key: ' ' }));
    }).not.toThrow();
  }));

  it('should not throw on keyboard shortcut "k" without video element', fakeAsync(() => {
    createAndBootstrap();
    expect(() => {
      component['onKeydown'](new KeyboardEvent('keydown', { key: 'k' }));
    }).not.toThrow();
  }));

  it('should not throw on ArrowRight without video element', fakeAsync(() => {
    createAndBootstrap();
    expect(() => {
      component['onKeydown'](new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    }).not.toThrow();
  }));

  it('should not throw on ArrowLeft without video element', fakeAsync(() => {
    createAndBootstrap();
    expect(() => {
      component['onKeydown'](new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    }).not.toThrow();
  }));

  it('should compute currentSource from selected video', fakeAsync(() => {
    createAndBootstrap();
    const source = component['currentSource']();
    expect(source).toBeTruthy();
    expect(source?.link).toContain('https://example.com/1.mp4');
  }));

  it('should track quality selection', fakeAsync(() => {
    createAndBootstrap();
    expect(component['isCurrentQuality'](0)).toBeTrue();
    expect(component['isCurrentQuality'](1)).toBeFalse();
  }));

  it('should resume from query param "t" if provided', fakeAsync(() => {
    mockActivatedRoute.snapshot.queryParamMap.get = (key: string) =>
      key === 't' ? '45' : null;

    createAndBootstrap();
    expect((component as any).resumeTo).toBe(45);

    // Reset for other tests.
    mockActivatedRoute.snapshot.queryParamMap.get = () => null;
  }));

  it('should write history on destroy if session was active', fakeAsync(() => {
    createAndBootstrap();
    // Simulate a play event to start a session.
    component['onPlay']();
    component['currentTime'].set(15);
    fixture.destroy();

    const entries = historyStore.entries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].videoId).toBe(1);
  }));

  it('should not write history on destroy if never played', fakeAsync(() => {
    createAndBootstrap();
    fixture.destroy();

    const entries = historyStore.entries();
    expect(entries.length).toBe(0);
  }));

  it('should set onEnded state correctly', fakeAsync(() => {
    createAndBootstrap();
    component['onPlay']();
    expect(component['isPlaying']()).toBe(true);

    component['onEnded']();
    expect(component['isPlaying']()).toBe(false);
  }));
});
