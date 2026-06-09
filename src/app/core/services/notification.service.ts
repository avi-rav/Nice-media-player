import { Injectable, signal } from '@angular/core';

export type NotificationLevel = 'info' | 'error' | 'success';

export interface AppNotification {
  id: number;
  message: string;
  level: NotificationLevel;
}

/**
 * Signal-based notification queue. Components read `notifications()`; the `ToastComponent`
 * renders them in an aria-live region. Auto-dismiss is owned by the consumer's timers in tests,
 * but here we keep it simple and time-based.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<readonly AppNotification[]>([]);
  /** Read-only view for consumers. */
  readonly notifications = this._notifications.asReadonly();

  private nextId = 1;
  /** Default auto-dismiss delay (ms); overridable for testing. */
  autoDismissMs = 6000;

  notify(message: string, level: NotificationLevel = 'info'): number {
    const id = this.nextId++;
    this._notifications.update((list) => [...list, { id, message, level }]);
    if (this.autoDismissMs > 0) {
      setTimeout(() => this.dismiss(id), this.autoDismissMs);
    }
    return id;
  }

  error(message: string): number {
    return this.notify(message, 'error');
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  clear(): void {
    this._notifications.set([]);
  }
}
