import { test as base, Page } from '@playwright/test';
import {
  MOCK_VIDEOS_RESPONSE,
  MOCK_SEARCH_RESPONSE,
  MOCK_EMPTY_RESPONSE,
  MOCK_PAGE2_RESPONSE,
} from './fixtures/mock-data';

/**
 * Custom fixture that intercepts the Pexels API calls via the /api proxy
 * and returns deterministic mock data.
 */
export const test = base.extend<{ mockApi: Page }>({
  mockApi: async ({ page }, use) => {
    // Intercept popular/default video listing
    await page.route('**/api/videos/popular*', (route, request) => {
      const url = new URL(request.url());
      const pageNum = Number(url.searchParams.get('page') ?? '1');
      if (pageNum > 1) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PAGE2_RESPONSE),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VIDEOS_RESPONSE),
      });
    });

    // Intercept search calls
    await page.route('**/api/videos/search*', (route, request) => {
      const url = new URL(request.url());
      const query = url.searchParams.get('query') ?? '';
      if (query.toLowerCase().includes('xyznonexistent')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EMPTY_RESPONSE),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SEARCH_RESPONSE),
      });
    });

    // Intercept individual video fetch (for player page)
    await page.route('**/api/videos/videos/*', (route) => {
      const videoId = route.request().url().split('/').pop();
      const video = MOCK_VIDEOS_RESPONSE.videos.find((v) => v.id === Number(videoId));
      if (video) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(video),
        });
      }
      return route.fulfill({ status: 404, body: 'Not found' });
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';
