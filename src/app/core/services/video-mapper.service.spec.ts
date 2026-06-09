import { TestBed } from '@angular/core/testing';
import {
  PexelsVideoDto,
  PexelsVideoFileDto,
} from '../models/pexels-api.dto';
import { VideoMapperService } from './video-mapper.service';

function file(partial: Partial<PexelsVideoFileDto>): PexelsVideoFileDto {
  return {
    id: 1,
    quality: 'hd',
    file_type: 'video/mp4',
    width: 1920,
    height: 1080,
    fps: 25,
    link: 'https://x/file.mp4',
    ...partial,
  };
}

function dto(partial: Partial<PexelsVideoDto>): PexelsVideoDto {
  return {
    id: 100,
    width: 1920,
    height: 1080,
    duration: 30,
    url: 'https://www.pexels.com/video/blue-ocean-100/',
    image: 'https://x/poster.jpg',
    user: { id: 1, name: 'Jane Doe', url: 'https://x/jane' },
    video_files: [file({})],
    video_pictures: [],
    ...partial,
  };
}

describe('VideoMapperService', () => {
  let mapper: VideoMapperService;

  beforeEach(() => {
    mapper = TestBed.inject(VideoMapperService);
  });

  it('sorts unsorted video_files highest→lowest and dedupes by label', () => {
    const video = mapper.tryMap(
      dto({
        video_files: [
          file({ id: 1, height: 360, width: 640 }),
          file({ id: 2, height: 1080, width: 1920 }),
          file({ id: 3, height: 720, width: 1280 }),
          file({ id: 4, height: 1080, width: 1920 }), // duplicate label
        ],
      }),
    );
    expect(video).not.toBeNull();
    expect(video!.sources.map((s) => s.label)).toEqual([
      '1080p',
      '720p',
      '360p',
    ]);
    expect(video!.maxResolution).toBe('1080p');
    expect(video!.playable).toBeTrue();
  });

  it('falls back to "Unknown" author and hides invalid duration', () => {
    const video = mapper.tryMap(
      dto({ user: undefined as never, duration: 0 }),
    );
    expect(video!.authorName).toBe('Unknown');
    expect(video!.durationSec).toBeNull();
  });

  it('uses a video_picture as poster when image is missing', () => {
    const video = mapper.tryMap(
      dto({
        image: '',
        video_pictures: [{ id: 1, picture: 'https://x/pic.jpg', nr: 0 }],
      }),
    );
    expect(video!.posterUrl).toBe('https://x/pic.jpg');
  });

  it('marks a video unplayable when there are no usable sources', () => {
    const video = mapper.tryMap(dto({ video_files: [] }));
    expect(video!.playable).toBeFalse();
    expect(video!.maxResolution).toBeNull();
    expect(video!.sources).toEqual([]);
  });

  it('survives a null video_files array', () => {
    const video = mapper.tryMap(dto({ video_files: null as never }));
    expect(video!.playable).toBeFalse();
  });

  it('filters out non-video file types and entries without a link', () => {
    const video = mapper.tryMap(
      dto({
        video_files: [
          file({ id: 1, file_type: 'image/jpeg', height: 1080 }),
          file({ id: 2, link: '', height: 720 }),
          file({ id: 3, file_type: 'video/mp4', height: 480, width: 854 }),
        ],
      }),
    );
    expect(video!.sources.map((s) => s.label)).toEqual(['480p']);
  });

  it('mapList skips broken records but keeps valid ones', () => {
    const result = mapper.mapList({
      page: 1,
      per_page: 15,
      total_results: 2,
      url: '',
      videos: [
        dto({ id: 1 }),
        null as never,
        { foo: 'bar' } as never, // no id
        dto({ id: 2 }),
      ],
    });
    expect(result.map((v) => v.id)).toEqual([1, 2]);
  });

  it('returns [] for a malformed response', () => {
    expect(mapper.mapList(null)).toEqual([]);
    expect(mapper.mapList({ videos: 'nope' } as never)).toEqual([]);
  });
});
