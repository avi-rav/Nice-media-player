import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { HistoryStore } from '../state/history.store';

@Component({
  selector: 'app-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DurationPipe, DatePipe],
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss',
})
export class HistoryPage {
  protected readonly store = inject(HistoryStore);
}
