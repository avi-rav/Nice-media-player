/** A single watch-history entry (one per watch session). */
export type HistoryStatus = 'finished' | 'stopped';

export interface HistoryEntry {
  /** Unique per session: `${videoId}-${startedAtMs}`. */
  entryId: string;
  videoId: number;
  title: string;
  posterUrl: string | null;
  /** Position reached in seconds. */
  positionSec: number;
  durationSec: number | null;
  /** 'finished' when the video reached its end, otherwise 'stopped'. */
  status: HistoryStatus;
  /** When this session was last recorded (epoch ms). */
  watchedAt: number;
}
