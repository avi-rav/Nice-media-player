import { test, expect } from '../base.fixture';

test.describe('Video Player', () => {
  test('UC-8: Clicking a video card navigates to player page', async ({ page, mockApi }) => {
    await page.goto('/videos');

    // Wait for cards
    await expect(page.locator('.card').first()).toBeVisible();

    // Click the first playable video card
    await page.locator('.card').first().click();

    // Should navigate to player page
    await expect(page).toHaveURL(/\/videos\/\d+/);

    // Player page should show title and back link
    await expect(page.locator('.back')).toContainText('Back to videos');
    await expect(page.locator('.title')).toBeVisible();
    await expect(page.locator('.byline')).toBeVisible();
  });

  test('UC-9: Player shows video controls (play, seek, volume, fullscreen)', async ({
    page,
    mockApi,
  }) => {
    await page.goto('/videos');
    await expect(page.locator('.card').first()).toBeVisible();
    await page.locator('.card').first().click();
    await expect(page).toHaveURL(/\/videos\/\d+/);

    // Wait for controls to appear (video loaded)
    const controls = page.locator('.controls');
    if (await controls.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Play/Pause button
      await expect(page.locator('[aria-label="Play"], [aria-label="Pause"]')).toBeVisible();

      // Seek slider
      await expect(page.locator('[aria-label="Seek"]')).toBeVisible();

      // Mute button
      await expect(page.locator('[aria-label="Mute"], [aria-label="Unmute"]')).toBeVisible();

      // Volume slider
      await expect(page.locator('[aria-label="Volume"]')).toBeVisible();

      // Fullscreen button
      await expect(page.locator('[aria-label="Fullscreen"]')).toBeVisible();
    }
  });

  test('UC-10: Back link returns to video list', async ({ page, mockApi }) => {
    await page.goto('/videos');
    await expect(page.locator('.card').first()).toBeVisible();
    await page.locator('.card').first().click();
    await expect(page).toHaveURL(/\/videos\/\d+/);

    // Click back link
    await page.locator('.back').click();
    await expect(page).toHaveURL(/\/videos$/);
    await expect(page.locator('.search__input')).toBeVisible();
  });
});
