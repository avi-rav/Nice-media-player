import { test, expect } from '../base.fixture';

test.describe('History', () => {
  test('UC-11: History page shows empty state when no videos have been watched', async ({
    page,
    mockApi,
  }) => {
    await page.goto('/history');

    // Empty state
    await expect(page.locator('.state--empty')).toBeVisible();
    await expect(page.locator('.state--empty h2')).toContainText('No history yet');
    await expect(page.locator('.state--empty p')).toContainText(
      'Videos you watch will appear here',
    );

    // "Browse videos" CTA link
    const browseLink = page.locator('.state--empty .btn', { hasText: 'Browse videos' });
    await expect(browseLink).toBeVisible();
    await browseLink.click();
    await expect(page).toHaveURL(/\/videos$/);
  });
});
