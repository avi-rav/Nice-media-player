import { test, expect } from '../base.fixture';

test.describe('Navigation', () => {
  test('UC-1: App loads and redirects to /videos', async ({ page, mockApi }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/videos$/);
    await expect(page.locator('.app-header__brand')).toContainText('Nice Media Player');
  });

  test('UC-2: Navigate between Browse and History tabs', async ({ page, mockApi }) => {
    await page.goto('/videos');

    // Click History nav link
    await page.locator('.app-header__nav a', { hasText: 'History' }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.locator('h1')).toContainText('Watch history');

    // Click Browse nav link
    await page.locator('.app-header__nav a', { hasText: 'Browse' }).click();
    await expect(page).toHaveURL(/\/videos$/);
    await expect(page.locator('.search__input')).toBeVisible();
  });
});
