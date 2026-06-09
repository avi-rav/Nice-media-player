import { Injectable, inject } from '@angular/core';
import {
  PexelsVideoDto,
  PexelsVideoFileDto,
  PexelsVideoListResponseDto,
} from '../models/pexels-api.dto';
import { Video, VideoSource } from '../models/video.model';
import { ResolutionService } from './resolution.service';

/**
 * Defensive normalization from raw Pexels DTOs to the domain `Video` model.
 *
 * The Pexels payload is treated as untrusted: fields may be missing, null, mistyped, or
 * unsorted. Every accessor below degrades gracefully and a single malformed record can never
 * throw the whole list (see `mapList`). This is the one place wire-format quirks are absorbed.
 */
@Injectable({ providedIn: 'root' })
export class VideoMapperService {
  private readonly resolution = inject(ResolutionService);

  /** Map a list response, skipping any individual record that fails to normalize. */
  mapList(response: PexelsVideoListResponseDto | null | undefined): Video[] {
    const raw = response?.videos;
    if (!Array.isArray(raw)) {
      return [];
    }
    const videos: Video[] = [];
    for (const dto of raw) {
      const mapped = this.tryMap(dto);
      if (mapped) {
        videos.push(mapped);
      }
    }
    return videos;
  }

  /** Map a single video; returns null if the record is too broken to use (e.g. no id). */
  tryMap(dto: PexelsVideoDto | null | undefined): Video | null {
    try {
      if (!dto || typeof dto.id !== 'number') {
        return null;
      }
      return this.map(dto);
    } catch {
      // One bad record must not break the page.
      return null;
    }
  }

  private map(dto: PexelsVideoDto): Video {
    const sources = this.mapSources(dto);
    const authorName = dto.user?.name?.trim() || 'Unknown';
    const durationSec =
      typeof dto.duration === 'number' &&
      Number.isFinite(dto.duration) &&
      dto.duration > 0
        ? Math.round(dto.duration)
        : null;
    const posterUrl =
      dto.image?.trim() || dto.video_pictures?.[0]?.picture?.trim() || null;

    return {
      id: dto.id,
      title: this.titleFromUrl(dto.url) ?? `Video ${dto.id}`,
      pageUrl: dto.url ?? '',
      posterUrl,
      authorName,
      authorUrl: dto.user?.url?.trim() || null,
      durationSec,
      sources,
      maxResolution: sources[0]?.label ?? null,
      playable: sources.length > 0,
    };
  }

  /**
   * Build the playable source list:
   *  - keep only entries with a usable link and a `video/*` file type (prefer mp4)
   *  - derive the label from the file height, falling back to the parent video's height
   *  - sort highest→lowest by pixel height (handles unsorted input)
   *  - dedupe by label (one rendition per bucket)
   */
  private mapSources(dto: PexelsVideoDto): VideoSource[] {
    const files = Array.isArray(dto.video_files) ? dto.video_files : [];

    const mapped = files
      .filter((file): file is PexelsVideoFileDto => this.isPlayable(file))
      .map((file) => this.toSource(file, dto))
      .filter((source): source is VideoSource => source !== null)
      .sort((a, b) => b.height - a.height);

    const seen = new Set<string>();
    const deduped: VideoSource[] = [];
    for (const source of mapped) {
      if (!seen.has(source.label)) {
        seen.add(source.label);
        deduped.push(source);
      }
    }
    return deduped;
  }

  private isPlayable(file: PexelsVideoFileDto | null | undefined): boolean {
    if (!file || typeof file.link !== 'string' || file.link.trim() === '') {
      return false;
    }
    const type = (file.file_type ?? '').toLowerCase();
    // Accept any video/* (Pexels is overwhelmingly mp4); reject images / empty types.
    return type.startsWith('video/');
  }

  private toSource(
    file: PexelsVideoFileDto,
    parent: PexelsVideoDto,
  ): VideoSource | null {
    const height = this.firstFinite(file.height, parent.height);
    const width = this.firstFinite(file.width, parent.width);
    const label = this.resolution.labelForHeight(height);
    if (!label || height === null || width === null) {
      return null;
    }
    return {
      id: file.id,
      label,
      width,
      height,
      fileType: file.file_type,
      link: file.link,
    };
  }

  private firstFinite(...values: Array<number | null | undefined>): number | null {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return null;
  }

  /** Derive a readable title from the Pexels page URL slug, e.g. ".../blue-ocean-1234/". */
  private titleFromUrl(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }
    const match = /\/video\/([^/]+?)(?:-\d+)?\/?$/.exec(url);
    if (!match) {
      return null;
    }
    const words = match[1]
      .split('-')
      .filter((w) => w && !/^\d+$/.test(w))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    return words.length ? words.join(' ') : null;
  }
}
