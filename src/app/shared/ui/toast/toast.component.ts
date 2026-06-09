import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Renders the NotificationService queue in a polite aria-live region so screen readers
 * announce errors/info without stealing focus. Each toast is dismissible.
 */
@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="toast-region"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (note of notifications.notifications(); track note.id) {
        <div class="toast" [class]="'toast--' + note.level">
          <span class="toast__message">{{ note.message }}</span>
          <button
            type="button"
            class="toast__close"
            [attr.aria-label]="'Dismiss notification: ' + note.message"
            (click)="notifications.dismiss(note.id)"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  protected readonly notifications = inject(NotificationService);
}
