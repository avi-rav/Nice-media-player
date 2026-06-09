/**
 * Raw Pexels Videos API response shapes ("DTOs").
 *
 * These mirror the wire format and are intentionally permissive where the API is unreliable
 * (nullable quality/width/height/fps). They are NEVER used directly by the UI — the
 * `VideoMapperService` normalizes them into the domain `Video` model. Keeping the two layers
 * separate means a wire-format quirk can't leak into components.
 *
 * Docs: https://www.pexels.com/api/documentation/#videos
 */

export interface PexelsUserDto {
  id: number;
  name: string;
  url: string;
}

export type PexelsQuality = 'hd' | 'sd' | 'uhd';

export interface PexelsVideoFileDto {
  id: number;
  /** Pexels sometimes omits/null this; do not rely on it for resolution. */
  quality: PexelsQuality | null;
  file_type: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  link: string;
}

export interface PexelsVideoPictureDto {
  id: number;
  picture: string;
  nr: number;
}

export interface PexelsVideoDto {
  id: number;
  width: number;
  height: number;
  /** Duration in seconds. */
  duration: number;
  url: string;
  /** Poster image. */
  image: string;
  user: PexelsUserDto;
  video_files: PexelsVideoFileDto[];
  video_pictures: PexelsVideoPictureDto[];
}

/** Shape returned by /videos/popular and /videos/search. */
export interface PexelsVideoListResponseDto {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideoDto[];
  next_page?: string;
  prev_page?: string;
}
