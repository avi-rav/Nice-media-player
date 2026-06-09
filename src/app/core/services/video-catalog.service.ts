import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Video } from '../models/video.model';
import { PexelsApiService } from './pexels-api.service';
import { VideoMapperService } from './video-mapper.service';

/**
 * Orchestration layer between the store and the raw API. Decides popular-vs-search, applies the
 * defensive mapper, and exposes domain `Video` objects. The store talks only to this service.
 */
@Injectable({ providedIn: 'root' })
export class VideoCatalogService {
  private readonly api = inject(PexelsApiService);
  private readonly mapper = inject(VideoMapperService);

  /** Empty/blank query → popular feed; otherwise → keyword search. */
  list(query: string): Observable<Video[]> {
    const trimmed = query.trim();
    const request$ = trimmed
      ? this.api.search(trimmed)
      : this.api.popular();
    return request$.pipe(map((response) => this.mapper.mapList(response)));
  }

  /** Fetch a single normalized video by id (deep-link fallback). */
  getById(id: number): Observable<Video | null> {
    return this.api.getById(id).pipe(map((dto) => this.mapper.tryMap(dto)));
  }
}
