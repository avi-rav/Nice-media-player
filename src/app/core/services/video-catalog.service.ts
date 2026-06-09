import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Video } from '../models/video.model';
import { PexelsApiService } from './pexels-api.service';
import { VideoMapperService } from './video-mapper.service';

/** A page of normalized videos plus whether more pages exist. */
export interface VideoPage {
  videos: Video[];
  hasMore: boolean;
}

/**
 * Orchestration layer between the store and the raw API. Decides popular-vs-search, applies the
 * defensive mapper, and reports whether more pages are available. The store talks only to this.
 */
@Injectable({ providedIn: 'root' })
export class VideoCatalogService {
  private readonly api = inject(PexelsApiService);
  private readonly mapper = inject(VideoMapperService);

  /** Empty/blank query → popular feed; otherwise → keyword search (server-side). */
  list(query: string, page = 1): Observable<VideoPage> {
    const trimmed = query.trim();
    const request$ = trimmed
      ? this.api.search(trimmed, page)
      : this.api.popular(page);
    return request$.pipe(
      map((response) => ({
        videos: this.mapper.mapList(response),
        hasMore: Boolean(response.next_page),
      })),
    );
  }

  /** Fetch a single normalized video by id (deep-link fallback). */
  getById(id: number): Observable<Video | null> {
    return this.api.getById(id).pipe(map((dto) => this.mapper.tryMap(dto)));
  }
}
