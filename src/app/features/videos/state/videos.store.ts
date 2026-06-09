import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  debounceTime,
  distinctUntilChanged,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { ErrorMapperService } from '../../../core/services/error-mapper.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ResolutionFilter,
  ResolutionService,
} from '../../../core/services/resolution.service';
import {
  VideoCatalogService,
  VideoPage,
} from '../../../core/services/video-catalog.service';
import { Video } from '../../../core/models/video.model';

export type VideosStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error';

interface VideosState {
  query: string;
  resolutionFilter: ResolutionFilter;
  status: VideosStatus;
  videos: Video[];
  error: string | null;
  selectedId: number | null;
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
}

const initialState: VideosState = {
  query: '',
  resolutionFilter: 'all',
  status: 'idle',
  videos: [],
  error: null,
  selectedId: null,
  page: 1,
  hasMore: false,
  loadingMore: false,
};

/** Debounce window for the keyword search input (ms). */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * De-duplicate videos by id, keeping first occurrence/order. The Pexels popular feed re-orders
 * between requests, so consecutive pages can overlap — without this, appended pages show repeats
 * (and duplicate `@for` track keys would error).
 */
function dedupeById(videos: readonly Video[]): Video[] {
  const seen = new Set<number>();
  const out: Video[] = [];
  for (const video of videos) {
    if (!seen.has(video.id)) {
      seen.add(video.id);
      out.push(video);
    }
  }
  return out;
}

/**
 * Feature store (NgRx SignalStore). Holds state only; logic lives in services.
 *
 * Search is **server-side**: the query is debounced + de-duped and runs through `switchMap`, so a
 * new query cancels the in-flight request and resets to page 1. **Load more** fetches the next
 * page from the API and appends. The resolution filter is applied client-side over the loaded
 * (accumulated) videos via `filteredVideos`.
 */
export const VideosStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store, resolution = inject(ResolutionService)) => ({
    availableResolutions: computed(() =>
      resolution.availableResolutions(store.videos()),
    ),
    /** Loaded videos narrowed by the resolution filter (memoized; no network). */
    filteredVideos: computed(() => {
      const filter = store.resolutionFilter();
      return store
        .videos()
        .filter((video) => resolution.matches(video, filter));
    }),
    selectedVideo: computed(() => {
      const id = store.selectedId();
      return id == null
        ? null
        : (store.videos().find((v) => v.id === id) ?? null);
    }),
    canLoadMore: computed(
      () =>
        store.hasMore() &&
        !store.loadingMore() &&
        store.status() === 'success',
    ),
  })),

  withMethods(
    (
      store,
      catalog = inject(VideoCatalogService),
      errorMapper = inject(ErrorMapperService),
      notifications = inject(NotificationService),
    ) => {
      const applyPage = (page: VideoPage): void => {
        const videos = dedupeById(page.videos);
        patchState(store, {
          videos,
          hasMore: page.hasMore,
          page: 1,
          status: videos.length > 0 ? 'success' : 'empty',
          error: null,
        });
      };

      const applyError = (error: unknown): void => {
        const message = errorMapper.toMessage(error);
        patchState(store, { videos: [], status: 'error', error: message });
        notifications.error(message);
      };

      // First page for a query. Debounced + de-duped + cancellable (typing path).
      const search = rxMethod<string>(
        pipe(
          debounceTime(SEARCH_DEBOUNCE_MS),
          distinctUntilChanged(),
          tap(() =>
            patchState(store, { status: 'loading', error: null, page: 1 }),
          ),
          switchMap((query) =>
            catalog
              .list(query, 1)
              .pipe(tapResponse({ next: applyPage, error: applyError })),
          ),
        ),
      );

      // First page without debounce/distinct (retry path — same query must re-fire).
      const reload = rxMethod<string>(
        pipe(
          tap(() =>
            patchState(store, { status: 'loading', error: null, page: 1 }),
          ),
          switchMap((query) =>
            catalog
              .list(query, 1)
              .pipe(tapResponse({ next: applyPage, error: applyError })),
          ),
        ),
      );

      // Next page — appends to the current list.
      const loadMore = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loadingMore: true })),
          switchMap(() => {
            const nextPage = store.page() + 1;
            return catalog.list(store.query(), nextPage).pipe(
              tapResponse({
                next: (page: VideoPage) =>
                  patchState(store, {
                    videos: dedupeById([...store.videos(), ...page.videos]),
                    hasMore: page.hasMore,
                    page: nextPage,
                    loadingMore: false,
                  }),
                error: (error: unknown) => {
                  patchState(store, { loadingMore: false });
                  notifications.error(errorMapper.toMessage(error));
                },
              }),
            );
          }),
        ),
      );

      const fetchById = rxMethod<number>(
        pipe(
          tap(() => patchState(store, { status: 'loading', error: null })),
          switchMap((id) =>
            catalog.getById(id).pipe(
              tapResponse({
                next: (video) => {
                  if (video) {
                    patchState(store, {
                      videos: [video],
                      selectedId: video.id,
                      status: 'success',
                      hasMore: false,
                      error: null,
                    });
                  } else {
                    patchState(store, {
                      status: 'error',
                      error: 'We couldn’t find that video.',
                    });
                  }
                },
                error: applyError,
              }),
            ),
          ),
        ),
      );

      return {
        setQuery(query: string): void {
          patchState(store, { query });
          search(query);
        },
        setResolutionFilter(resolutionFilter: ResolutionFilter): void {
          patchState(store, { resolutionFilter });
        },
        select(selectedId: number | null): void {
          patchState(store, { selectedId });
        },
        retry(): void {
          reload(store.query());
        },
        loadMore(): void {
          if (
            store.hasMore() &&
            !store.loadingMore() &&
            store.status() === 'success'
          ) {
            loadMore();
          }
        },
        ensureSelected(id: number): void {
          const existing = store.videos().find((v) => v.id === id);
          if (existing) {
            patchState(store, { selectedId: id });
          } else {
            fetchById(id);
          }
        },
        search,
      };
    },
  ),

  withHooks({
    onInit(store): void {
      store.search('');
    },
  }),
);
