import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PexelsVideoDto,
  PexelsVideoListResponseDto,
} from '../models/pexels-api.dto';

/**
 * Thin HTTP layer. ONLY responsibility: build the right request and return raw DTOs.
 * No mapping, no error handling UX, no state. Auth and retry are added by interceptors.
 */
@Injectable({ providedIn: 'root' })
export class PexelsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** GET /videos/popular?per_page=… */
  popular(perPage = 15): Observable<PexelsVideoListResponseDto> {
    const params = new HttpParams().set('per_page', perPage);
    return this.http.get<PexelsVideoListResponseDto>(`${this.base}/popular`, {
      params,
    });
  }

  /** GET /videos/search?query=…&per_page=… */
  search(query: string, perPage = 15): Observable<PexelsVideoListResponseDto> {
    const params = new HttpParams()
      .set('query', query)
      .set('per_page', perPage);
    return this.http.get<PexelsVideoListResponseDto>(`${this.base}/search`, {
      params,
    });
  }

  /** GET /videos/videos/:id — used for deep-link fallback when the store is empty. */
  getById(id: number): Observable<PexelsVideoDto> {
    return this.http.get<PexelsVideoDto>(`${this.base}/videos/${id}`);
  }
}
