import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { VideoListPage } from './video-list.page';
import { VideosStore } from '../../state/videos.store';
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
    duration: 20,
    url: `https://www.pexels.com/video/clip-${id}/`,
    image: 'https://example.com/poster.jpg',
    user: { id: 1, name: 'Author', url: 'https://x' },
    video_files: [
      {
        id: id * 10,
        quality: 'hd',
        file_type: 'video/mp4',
        width,
        height,
        fps: 25,
        link: `https://example.com/${id}.mp4`,
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

describe('VideoListPage', () => {
  let fixture: ComponentFixture<VideoListPage>;
  let component: VideoListPage;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoListPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(NotificationService).autoDismissMs = 0;
  });

  function createAndBootstrap(
    videos: PexelsVideoDto[] = [makeDto(1), makeDto(2)],
  ): void {
    fixture = TestBed.createComponent(VideoListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Flush the debounced initial load.
    tick(300);
    const req = httpMock.expectOne((r) => r.url === POPULAR);
    req.flush(listResponse(videos));
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', fakeAsync(() => {
    createAndBootstrap();
    expect(component).toBeTruthy();
  }));

  it('should render search input', fakeAsync(() => {
    createAndBootstrap();
    const input = fixture.debugElement.query(By.css('.search__input'));
    expect(input).toBeTruthy();
    expect(input.nativeElement.getAttribute('role')).toBe('searchbox');
  }));

  it('should display video cards after loading', fakeAsync(() => {
    createAndBootstrap([makeDto(1), makeDto(2), makeDto(3)]);
    const cards = fixture.debugElement.queryAll(By.css('.card'));
    expect(cards.length).toBe(3);
  }));

  it('should show loading skeletons initially', fakeAsync(() => {
    fixture = TestBed.createComponent(VideoListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Before the request resolves — store is still in loading state.
    tick(300);
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('.card--skeleton'));
    // The request is pending; flush it now.
    const req = httpMock.expectOne((r) => r.url === POPULAR);
    req.flush(listResponse([makeDto(1)]));
    fixture.detectChanges();
    // After flush, skeletons are gone.
    const afterSkeletons = fixture.debugElement.queryAll(
      By.css('.card--skeleton'),
    );
    expect(afterSkeletons.length).toBe(0);
  }));

  it('should update store query when search input changes', fakeAsync(() => {
    createAndBootstrap();
    const store = TestBed.inject(VideosStore);

    const input = fixture.debugElement.query(By.css('.search__input'));
    input.nativeElement.value = 'ocean';
    input.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(store.query()).toBe('ocean');

    // Flush the debounced search request.
    tick(300);
    const req = httpMock.expectOne((r) => r.url.includes('/api/videos/search'));
    req.flush(listResponse([makeDto(10)]));
    fixture.detectChanges();
  }));

  it('should update store resolution filter when dropdown changes', fakeAsync(() => {
    createAndBootstrap([makeDto(1, 1080), makeDto(2, 720)]);
    const store = TestBed.inject(VideosStore);

    const select = fixture.debugElement.query(By.css('.filter__select'));
    if (select) {
      select.nativeElement.value = '720p';
      select.nativeElement.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(store.resolutionFilter()).toBe('720p');
    }
  }));

  it('should show empty state when no videos found', fakeAsync(() => {
    fixture = TestBed.createComponent(VideoListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);

    const req = httpMock.expectOne((r) => r.url === POPULAR);
    req.flush(listResponse([]));
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.state--empty'));
    expect(emptyState).toBeTruthy();
  }));

  it('should show error state on API failure', fakeAsync(() => {
    fixture = TestBed.createComponent(VideoListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);

    const req = httpMock.expectOne((r) => r.url === POPULAR);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.debugElement.query(By.css('.state--error'));
    expect(errorState).toBeTruthy();
  }));

  it('should have a search label for accessibility', fakeAsync(() => {
    createAndBootstrap();
    const label = fixture.debugElement.query(By.css('.search__label'));
    expect(label).toBeTruthy();
    expect(label.nativeElement.textContent).toContain('Search videos');
  }));
});
