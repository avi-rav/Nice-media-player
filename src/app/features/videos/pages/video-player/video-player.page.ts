import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HistoryEntry, HistoryStatus } from '../../../../core/models/history.model';
import { HistoryStore } from '../../../history/state/history.store';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { VideosStore } from '../../state/videos.store';

/** Persist the watch position at most this often while playing (ms). */
const HISTORY_THROTTLE_MS = 5000;

@Component({
  selector: 'app-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DurationPipe],
  templateUrl: './video-player.page.html',
  styleUrl: './video-player.page.scss',
})
export class VideoPlayerPage implements OnInit, OnDestroy {
  protected readonly store = inject(VideosStore);
  private readonly history = inject(HistoryStore);
  private readonly route = inject(ActivatedRoute);

  // Watch-session tracking.
  private sessionId: string | null = null;
  private endedReached = false;
  private lastWriteMs = 0;
  private resumeTo = 0;
  private resumed = false;

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
    // Resume position passed by "Play again" from the history page.
    const t = Number(this.route.snapshot.queryParamMap.get('t'));
    this.resumeTo = Number.isFinite(t) && t > 0 ? t : 0;
  }

  ngOnDestroy(): void {
    // Finalize the session when leaving the player.
    this.recordSession(this.endedReached ? 'finished' : 'stopped');
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
    if (!el) return;
    this.duration.set(el.duration || 0);
    // Seek once to the resume position (from history "Play again").
    if (!this.resumed && this.resumeTo > 0) {
      el.currentTime = Math.min(this.resumeTo, el.duration || this.resumeTo);
      this.resumed = true;
    }
  }

  protected onPlay(): void {
    this.isPlaying.set(true);
    if (!this.sessionId) {
      // Start a new watch session on first play.
      this.sessionId = `${this.video()?.id ?? 'x'}-${Date.now()}`;
      this.endedReached = false;
    }
  }

  protected onEnded(): void {
    this.isPlaying.set(false);
    this.endedReached = true;
    this.recordSession('finished');
  }

  protected onTimeUpdate(): void {
    const el = this.el;
    if (!el) return;
    this.currentTime.set(el.currentTime);
    // Persist progress live, throttled, so a hard close keeps a recent snapshot.
    const now = Date.now();
    if (now - this.lastWriteMs >= HISTORY_THROTTLE_MS) {
      this.lastWriteMs = now;
      this.recordSession('stopped');
    }
  }

  /** Write (or update) this watch session into history. */
  private recordSession(status: HistoryStatus): void {
    const video = this.video();
    const position = this.currentTime();
    // Skip empty sessions (opened but never played).
    if (!video || (!this.endedReached && position <= 0)) {
      return;
    }
    if (!this.sessionId) {
      this.sessionId = `${video.id}-${Date.now()}`;
    }
    const entry: HistoryEntry = {
      entryId: this.sessionId,
      videoId: video.id,
      title: video.title,
      posterUrl: video.posterUrl,
      positionSec: Math.floor(position),
      durationSec: this.duration() || video.durationSec,
      status,
      watchedAt: Date.now(),
    };
    this.history.upsertSession(entry);
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
