import { Injectable } from '@angular/core';
import {
  RESOLUTION_ORDER,
  ResolutionLabel,
  Video,
} from '../models/video.model';

/** The filter value used by the UI: a concrete label, or 'all' for no filtering. */
export type ResolutionFilter = ResolutionLabel | 'all';

/**
 * All resolution logic in one place: deriving a label from pixel height, computing the set of
 * resolutions present in a result set, and the filter predicate. Pure and easily unit-tested.
 */
@Injectable({ providedIn: 'root' })
export class ResolutionService {
  /**
   * Map a video file's pixel height to a friendly label. We use height (not the unreliable
   * `quality` field) so the label is stable even when the API omits `quality`.
   * Returns null for non-positive / non-finite heights so callers can skip the source.
   */
  labelForHeight(height: number | null | undefined): ResolutionLabel | null {
    if (height == null || !Number.isFinite(height) || height <= 0) {
      return null;
    }
    if (height >= 2160) return '4K';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    return '360p';
  }

  /**
   * Distinct *max* resolutions across the videos, ordered highest→lowest.
   * We bucket by each video's best rendition (not every rendition) — otherwise nearly every
   * video would list every resolution, making the filter useless.
   */
  availableResolutions(videos: readonly Video[]): ResolutionLabel[] {
    const present = new Set<ResolutionLabel>();
    for (const video of videos) {
      if (video.maxResolution) {
        present.add(video.maxResolution);
      }
    }
    return RESOLUTION_ORDER.filter((label) => present.has(label));
  }

  /** True when the video's best resolution matches the filter (or filter is 'all'). */
  matches(video: Video, filter: ResolutionFilter): boolean {
    if (filter === 'all') {
      return true;
    }
    return video.maxResolution === filter;
  }
}
