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
import { VideoCatalogService } from '../../../core/services/video-catalog.service';
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
}

const initialState: VideosState = {
  query: '',
  resolutionFilter: 'all',
  status: 'idle',
  videos: [],
  error: null,
  selectedId: null,
};

/** Debounce window for keyword search (ms). */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Feature store (NgRx SignalStore). Holds state ONLY; all logic lives in injected services.
 * The search pipeline debounces, de-dupes, and uses switchMap so a new query cancels the
 * in-flight request. On failure it surfaces an inline error state AND a toast.
 */
export const VideosStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store, resolution = inject(ResolutionService)) => ({
    /** Resolutions present in the current result set (drives the filter UI). */
    availableResolutions: computed(() =>
      resolution.availableResolutions(store.videos()),
    ),
    /** Client-side filtered list — memoized, never triggers a network request. */
    filteredVideos: computed(() => {
      const filter = store.resolutionFilter();
      return store
        .videos()
        .filter((video) => resolution.matches(video, filter));
    }),
    /** The currently selected video, if loaded. */
    selectedVideo: computed(() => {
      const id = store.selectedId();
      return id == null
        ? null
        : (store.videos().find((v) => v.id === id) ?? null);
    }),
  })),

  withMethods(
    (
      store,
      catalog = inject(VideoCatalogService),
      errorMapper = inject(ErrorMapperService),
      notifications = inject(NotificationService),
    ) => {
      const applyResult = (videos: Video[]): void =>
        patchState(store, {
          videos,
          status: videos.length > 0 ? 'success' : 'empty',
          error: null,
        });

      const applyError = (error: unknown): void => {
        const message = errorMapper.toMessage(error);
        patchState(store, { videos: [], status: 'error', error: message });
        notifications.error(message);
      };

      // Typing path: debounced + de-duped + cancellable.
      const search = rxMethod<string>(
        pipe(
          debounceTime(SEARCH_DEBOUNCE_MS),
          distinctUntilChanged(),
          tap(() => patchState(store, { status: 'loading', error: null })),
          switchMap((query) =>
            catalog
              .list(query)
              .pipe(tapResponse({ next: applyResult, error: applyError })),
          ),
        ),
      );

      // Retry path: no debounce/distinct so re-running the same query actually fires.
      const reload = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { status: 'loading', error: null })),
          switchMap((query) =>
            catalog
              .list(query)
              .pipe(tapResponse({ next: applyResult, error: applyError })),
          ),
        ),
      );

      // Deep-link fallback: fetch a single video when it's not already in the store.
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
        /** Used by the player route: select if present, otherwise fetch by id. */
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
      // Initial load = popular feed (empty query).
      store.search('');
    },
  }),
);
