import { Video } from '../models/video.model';
import { ResolutionService } from './resolution.service';

function videoWith(labels: Array<Video['sources'][number]['label']>): Video {
  return {
    id: 1,
    title: 't',
    pageUrl: '',
    posterUrl: null,
    authorName: 'a',
    authorUrl: null,
    durationSec: null,
    sources: labels.map((label, i) => ({
      id: i,
      label,
      width: 0,
      height: 0,
      fileType: 'video/mp4',
      link: 'x',
    })),
    maxResolution: labels[0] ?? null,
    playable: labels.length > 0,
  };
}

describe('ResolutionService', () => {
  let service: ResolutionService;

  beforeEach(() => {
    service = new ResolutionService();
  });

  describe('labelForHeight', () => {
    it('maps heights to labels at the right boundaries', () => {
      expect(service.labelForHeight(2160)).toBe('4K');
      expect(service.labelForHeight(2159)).toBe('1440p');
      expect(service.labelForHeight(1440)).toBe('1440p');
      expect(service.labelForHeight(1080)).toBe('1080p');
      expect(service.labelForHeight(720)).toBe('720p');
      expect(service.labelForHeight(480)).toBe('480p');
      expect(service.labelForHeight(360)).toBe('360p');
      expect(service.labelForHeight(120)).toBe('360p');
    });

    it('returns null for invalid heights', () => {
      expect(service.labelForHeight(0)).toBeNull();
      expect(service.labelForHeight(-10)).toBeNull();
      expect(service.labelForHeight(null)).toBeNull();
      expect(service.labelForHeight(undefined)).toBeNull();
      expect(service.labelForHeight(Number.NaN)).toBeNull();
    });
  });

  describe('availableResolutions', () => {
    it('returns the distinct union ordered highest→lowest', () => {
      const videos = [videoWith(['720p', '360p']), videoWith(['1080p', '720p'])];
      expect(service.availableResolutions(videos)).toEqual([
        '1080p',
        '720p',
        '360p',
      ]);
    });

    it('returns empty for no sources', () => {
      expect(service.availableResolutions([videoWith([])])).toEqual([]);
    });
  });

  describe('matches', () => {
    const video = videoWith(['1080p', '480p']);

    it('matches everything for "all"', () => {
      expect(service.matches(video, 'all')).toBeTrue();
    });

    it('matches only when a source has the label', () => {
      expect(service.matches(video, '1080p')).toBeTrue();
      expect(service.matches(video, '480p')).toBeTrue();
      expect(service.matches(video, '720p')).toBeFalse();
    });
  });
});
