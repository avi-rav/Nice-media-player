import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResolutionFilter } from '../../../../core/services/resolution.service';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { VideosStore } from '../../state/videos.store';

@Component({
  selector: 'app-video-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DurationPipe],
  templateUrl: './video-list.page.html',
  styleUrl: './video-list.page.scss',
})
export class VideoListPage {
  protected readonly store = inject(VideosStore);

  protected onSearch(event: Event): void {
    this.store.setQuery((event.target as HTMLInputElement).value);
  }

  protected onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ResolutionFilter;
    this.store.setResolutionFilter(value);
  }
}
