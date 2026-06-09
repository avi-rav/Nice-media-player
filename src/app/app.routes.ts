import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'videos' },
  {
    path: 'videos',
    title: 'Videos · Nice Media Player',
    loadComponent: () =>
      import('./features/videos/pages/video-list/video-list.page').then(
        (m) => m.VideoListPage,
      ),
  },
  {
    path: 'videos/:id',
    title: 'Player · Nice Media Player',
    loadComponent: () =>
      import('./features/videos/pages/video-player/video-player.page').then(
        (m) => m.VideoPlayerPage,
      ),
  },
  {
    path: 'history',
    title: 'History · Nice Media Player',
    loadComponent: () =>
      import('./features/history/pages/history.page').then(
        (m) => m.HistoryPage,
      ),
  },
  { path: '**', redirectTo: 'videos' },
];
