import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';

/** Max retry attempts for transient failures. */
export const MAX_RETRIES = 2;
/** Base backoff in ms; delay grows exponentially: 500ms, then 1000ms. */
export const BACKOFF_BASE_MS = 500;

/** Only retry transient, likely-recoverable failures: rate limiting and server errors. */
function isTransient(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.status === 429 || error.status >= 500)
  );
}

/**
 * Retries transient failures (429 / 5xx) up to MAX_RETRIES with exponential backoff.
 * 4xx (auth, bad request, not found) fail fast — retrying them is pointless.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        if (!isTransient(error)) {
          throw error; // fail fast for non-transient errors
        }
        return timer(BACKOFF_BASE_MS * 2 ** (retryCount - 1));
      },
    }),
  );
