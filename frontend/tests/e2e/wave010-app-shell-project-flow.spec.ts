import { expect, test } from '@playwright/test';

test.describe('Wave 010 app-shell project boundary', () => {
  test('starts without Google credentials and opens the app-shell project chooser without backend project API calls', async ({ page }) => {
    const staleBackendProjectRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('localhost:3000/api/projects') || url.includes('/api/projects')) {
        staleBackendProjectRequests.push(url);
      }
    });

    await page.route('**/api/projects**', (route) => {
      staleBackendProjectRequests.push(route.request().url());
      return route.abort('failed');
    });
    await page.route('http://localhost:3000/**', (route) => {
      staleBackendProjectRequests.push(route.request().url());
      return route.abort('failed');
    });

    await page.goto('/');

    await expect(page.getByText('Untitled Project')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Project' })).toBeVisible();
    await expect(page.getByText('Diedrico - Project Selection')).toHaveCount(0);

    await page.getByRole('button', { name: 'Open Project' }).click();

    await expect(page.getByText('Diedrico - Project Selection')).toBeVisible();
    await expect(page.getByText('Sign in with your Google account to access your projects')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();

    expect(staleBackendProjectRequests).toEqual([]);
  });
});
