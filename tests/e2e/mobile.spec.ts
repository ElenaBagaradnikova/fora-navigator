import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("landing page works without horizontal overflow on mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Маршрут для семьи/ })).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  await expect(page.getByRole("button", { name: /Подросток, 16 лет/ })).toBeVisible();
});
