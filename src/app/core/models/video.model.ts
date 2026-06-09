/**
 * Domain models — the normalized, UI-facing shape produced by `VideoMapperService`.
 * Everything the templates and store touch uses these types, never the raw DTOs.
 */

/** Human-friendly resolution buckets, ordered highest→lowest by RESOLUTION_ORDER below. */
export type ResolutionLabel = '4K' | '1440p' | '1080p' | '720p' | '480p' | '360p';

/** Highest→lowest. Used for sorting and for the "max resolution" choice. */
export const RESOLUTION_ORDER: readonly ResolutionLabel[] = [
  '4K',
  '1440p',
  '1080p',
  '720p',
  '480p',
  '360p',
] as const;

/** A single playable rendition of a video. */
export interface VideoSource {
  id: number;
  label: ResolutionLabel;
  width: number;
  height: number;
  fileType: string;
  link: string;
}

/** Normalized video used throughout the app. All optional API data is made explicit here. */
export interface Video {
  id: number;
  title: string;
  pageUrl: string;
  /** null → UI shows a placeholder. */
  posterUrl: string | null;
  /** Falls back to 'Unknown' when the API omits the author. */
  authorName: string;
  authorUrl: string | null;
  /** null → duration hidden in the UI. */
  durationSec: number | null;
  /** Playable mp4 renditions, sorted highest→lowest resolution, deduped by label. */
  sources: VideoSource[];
  /** The best available resolution, or null when there are no usable sources. */
  maxResolution: ResolutionLabel | null;
  /** false when there is no usable source — card is shown as unavailable. */
  playable: boolean;
}
