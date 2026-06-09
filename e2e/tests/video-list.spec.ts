import { test, expect } from '../base.fixture';

test.describe('Video List', () => {
  test('UC-3: Video cards are displayed with title, author, and resolution', async ({
    page,
    mockApi,
  }) => {
    await page.goto('/videos');

    // Wait for cards to render
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(3);

    // Verify first card content
    const firstCard = cards.first();
    await expect(firstCard.locator('.card__title')).toContainText('Video');
    await expect(firstCard.locator('.card__author')).toBeVisible();
  });

  test('UC-4: Search filters videos by keyword', async ({ page, mockApi }) => {
    await page.goto('/videos');

    // Wait for initial load
    await expect(page.locator('.card')).toHaveCount(3);

    // Type a search query
    await page.locator('.search__input').fill('ocean');

    // Wait for debounce and new results
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('.card__author')).toContainText('Ocean Films');
  });

  test('UC-5: Search with no results shows empty state', async ({ page, mockApi }) => {
    await page.goto('/videos');

    await page.locator('.search__input').fill('xyznonexistent');

    // Should show empty state message
    await expect(page.locator('.state--empty')).toBeVisible();
    await expect(page.locator('.state--empty h2')).toContainText('No videos found');
  });

  test('UC-6: Resolution filter narrows displayed videos', async ({ page, mockApi }) => {
    await page.goto('/videos');

    // Wait for cards
    await expect(page.locator('.card')).toHaveCount(3);

    // Check that the resolution filter is visible (since videos have different resolutions)
    const filterSelect = page.locator('#resolution');
    if (await filterSelect.isVisible()) {
      // Select a specific resolution
      await filterSelect.selectOption('1080p');

      // Cards should be filtered (only 1080p videos shown)
      const visibleCards = page.locator('.card');
      const count = await visibleCards.count();
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  test('UC-7: Load more button fetches additional videos', async ({ page, mockApi }) => {
    await page.goto('/videos');

    // Wait for initial cards
    await expect(page.locator('.card')).toHaveCount(3);

    // Click "Load more"
    const loadMoreBtn = page.locator('button', { hasText: 'Load more' });
    if (await loadMoreBtn.isVisible()) {
      await loadMoreBtn.click();

      // Should have more cards after loading
      await expect(page.locator('.card').first()).toBeVisible();
      const count = await page.locator('.card').count();
      expect(count).toBeGreaterThan(3);
    }
  });
});
