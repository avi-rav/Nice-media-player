import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a duration in seconds as `m:ss` (or `h:mm:ss` for ≥ 1 hour).
 * Returns an empty string for null/invalid input so the UI can simply hide it.
 */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(totalSeconds: number | null | undefined): string {
    if (
      totalSeconds == null ||
      !Number.isFinite(totalSeconds) ||
      totalSeconds < 0
    ) {
      return '';
    }
    const secs = Math.floor(totalSeconds);
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    const ss = seconds.toString().padStart(2, '0');

    if (hours > 0) {
      const mm = minutes.toString().padStart(2, '0');
      return `${hours}:${mm}:${ss}`;
    }
    return `${minutes}:${ss}`;
  }
}
