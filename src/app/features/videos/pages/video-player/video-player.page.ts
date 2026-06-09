import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { VideosStore } from '../../state/videos.store';

@Component({
  selector: 'app-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DurationPipe],
  templateUrl: './video-player.page.html',
  styleUrl: './video-player.page.scss',
})
export class VideoPlayerPage implements OnInit {
  protected readonly store = inject(VideosStore);
  private readonly route = inject(ActivatedRoute);

  private readonly videoEl =
    viewChild<ElementRef<HTMLVideoElement>>('player');
  private readonly containerEl =
    viewChild<ElementRef<HTMLDivElement>>('stage');

  protected readonly video = this.store.selectedVideo;
  protected readonly status = this.store.status;

  protected readonly isPlaying = signal(false);
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);
  protected readonly volume = signal(1);
  protected readonly muted = signal(false);
  private readonly sourceIndex = signal(0);

  protected readonly currentSource = computed(() => {
    const v = this.video();
    if (!v || v.sources.length === 0) {
      return null;
    }
    const idx = Math.min(this.sourceIndex(), v.sources.length - 1);
    return v.sources[idx];
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(id) && id > 0) {
      this.store.ensureSelected(id);
    }
  }

  private get el(): HTMLVideoElement | undefined {
    return this.videoEl()?.nativeElement;
  }

  protected togglePlay(): void {
    const el = this.el;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  protected onLoadedMetadata(): void {
    const el = this.el;
    if (el) this.duration.set(el.duration || 0);
  }

  protected onTimeUpdate(): void {
    const el = this.el;
    if (el) this.currentTime.set(el.currentTime);
  }

  protected onSeek(event: Event): void {
    const el = this.el;
    const value = Number((event.target as HTMLInputElement).value);
    if (el && Number.isFinite(value)) {
      el.currentTime = value;
      this.currentTime.set(value);
    }
  }

  protected onVolume(event: Event): void {
    const el = this.el;
    const value = Number((event.target as HTMLInputElement).value);
    if (el) {
      el.volume = value;
      el.muted = value === 0;
    }
  }

  protected toggleMute(): void {
    const el = this.el;
    if (!el) return;
    el.muted = !el.muted;
  }

  protected onVolumeChange(): void {
    const el = this.el;
    if (!el) return;
    this.volume.set(el.volume);
    this.muted.set(el.muted);
  }

  protected toggleFullscreen(): void {
    const container = this.containerEl()?.nativeElement;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen?.();
    }
  }

  /** Switch resolution while preserving position and play state. */
  protected selectQuality(index: number): void {
    const el = this.el;
    const time = el?.currentTime ?? 0;
    const wasPlaying = el ? !el.paused : false;
    this.sourceIndex.set(index);
    // Restore after the new source loads.
    queueMicrotask(() => {
      const next = this.el;
      if (!next) return;
      const restore = () => {
        next.currentTime = time;
        if (wasPlaying) void next.play();
        next.removeEventListener('loadedmetadata', restore);
      };
      next.addEventListener('loadedmetadata', restore);
    });
  }

  protected isCurrentQuality(index: number): boolean {
    return this.sourceIndex() === index;
  }

  /** Keyboard shortcuts on the player stage: space, arrows, m, f. */
  protected onKeydown(event: KeyboardEvent): void {
    const el = this.el;
    if (!el) return;
    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowRight':
        event.preventDefault();
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        el.currentTime = Math.max(0, el.currentTime - 5);
        break;
      case 'ArrowUp':
        event.preventDefault();
        el.volume = Math.min(1, el.volume + 0.1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        el.volume = Math.max(0, el.volume - 0.1);
        break;
      case 'm':
        this.toggleMute();
        break;
      case 'f':
        this.toggleFullscreen();
        break;
    }
  }
}
