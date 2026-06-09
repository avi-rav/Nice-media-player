import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

/**
 * Translates low-level HTTP/JS errors into a single, user-friendly message.
 * Keeps message wording out of the store and components.
 */
@Injectable({ providedIn: 'root' })
export class ErrorMapperService {
  toMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return 'Network error — please check your connection and try again.';
        case 401:
        case 403:
          return 'Authorization failed — the API key is missing or invalid.';
        case 404:
          return 'We couldn’t find that video.';
        case 429:
          return 'Too many requests — you’ve hit the rate limit. Try again shortly.';
        default:
          if (error.status >= 500) {
            return 'Pexels is having trouble right now. Please try again.';
          }
          return 'Something went wrong while loading videos.';
      }
    }
    return 'Something went wrong while loading videos.';
  }
}
