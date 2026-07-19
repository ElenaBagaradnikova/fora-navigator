import { expect, test } from "@playwright/test";

test("main demo reaches plan, documents and Spanish draft", async ({ page }) => {
  let navigationApiCalls = 0;
  let consultationPosts = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/navigate") navigationApiCalls += 1;
    if (new URL(request.url()).pathname === "/api/consultation" && request.method() === "POST") consultationPosts += 1;
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Подросток, 16 лет/ }).click();

  for (let index = 0; index < 10; index += 1) {
    await page.getByRole("button", { name: "Дальше" }).click();
  }
  await page.getByRole("button", { name: "Проверить ответы" }).click();

  await expect(page.getByRole("heading", { name: "Проверьте, правильно ли мы поняли" })).toBeVisible();
  await page.getByRole("button", { name: /Создать мой маршрут/ }).click();
  await expect(page).toHaveURL(/\/plan$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Ваш навигационный план" })).toBeVisible();
  expect(navigationApiCalls).toBe(0);

  await page.getByRole("button", { name: /Документы/ }).click();
  await expect(page.getByRole("heading", { name: "Документы без лишней работы" })).toBeVisible();

  await page.getByRole("button", { name: /Письма/ }).click();
  await expect(page.getByText("Consulta sobre acceso a la asistencia sanitaria")).toBeVisible();

  await page.getByRole("button", { name: /Консультация/ }).click();
  await expect(page.getByRole("heading", { name: "Посоветоваться с живым человеком" })).toBeVisible();
  await expect(page.getByText("Безопасная демонстрация")).toBeVisible();
  await page.getByLabel("Контакт для ответа").fill("demo.user@example.test");
  await page.getByLabel(/Я подтверждаю, что использую только вымышленные данные/).check();
  await page.getByRole("button", { name: "Проверить демо-запрос" }).click();
  await expect(page.getByText("Тест завершён. Ничего не отправлено")).toBeVisible();
  await expect(page.getByText(/FORA-\d{8}-[A-F0-9]{8}/)).toBeVisible();
  expect(consultationPosts).toBe(1);
});

test("answers can be edited and plan regenerated", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Подросток, 16 лет/ }).click();
  for (let index = 0; index < 10; index += 1) await page.getByRole("button", { name: "Дальше" }).click();
  await page.getByRole("button", { name: "Проверить ответы" }).click();
  await page.getByRole("link", { name: /Изменить/ }).first().click();
  await expect(page).toHaveURL(/\/intake\?step=0/);
});

test("GPT-5.6 mode requires explicit consent and falls back visibly when live AI is off", async ({ page }) => {
  let navigationApiCalls = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/navigate") navigationApiCalls += 1;
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Подросток, 16 лет/ }).click();
  for (let index = 0; index < 10; index += 1) await page.getByRole("button", { name: "Дальше" }).click();
  await page.getByRole("button", { name: "Проверить ответы" }).click();

  const aiButton = page.getByRole("button", { name: /Создать с GPT-5.6 Terra/ });
  await expect(aiButton).toBeDisabled();
  await page.getByText("Что важно о данных").click();
  await expect(page.getByText(/могут храниться до 30 дней/)).toBeVisible();
  expect(navigationApiCalls).toBe(0);

  await page.getByRole("checkbox", { name: /разрешаю один раз отправить/ }).check();
  await expect(aiButton).toBeEnabled();
  await aiButton.click();

  await expect(page).toHaveURL(/\/plan$/, { timeout: 30_000 });
  await expect(page.getByText("Безопасный демо-режим")).toBeVisible();
  expect(navigationApiCalls).toBe(1);
});

test("direct live URL without fresh consent never calls the API", async ({ page }) => {
  let navigationApiCalls = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/navigate") navigationApiCalls += 1;
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Подросток, 16 лет/ }).click();
  for (let index = 0; index < 10; index += 1) await page.getByRole("button", { name: "Дальше" }).click();
  await page.getByRole("button", { name: "Проверить ответы" }).click();
  await page.goto("/generating?mode=live");

  await expect(page).toHaveURL(/\/review$/, { timeout: 10_000 });
  expect(navigationApiCalls).toBe(0);
});

test("custom demo requires an explicit fictitious-data confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Что происходит в вымышленном примере?").fill(
    "Вымышленная семья переехала в Овьедо и хочет понять порядок обращения в школу и поликлинику.",
  );
  const start = page.getByRole("button", { name: /Собрать демо-маршрут/ });
  await expect(start).toBeDisabled();
  await page.getByRole("checkbox", { name: /Это вымышленный пример/ }).check();
  await expect(start).toBeEnabled();
});

test("emergency description opens 112 flow", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Что происходит в вымышленном примере?").fill("Ребёнок не дышит и потерял сознание. Нужна помощь прямо сейчас.");
  await page.getByRole("button", { name: /Открыть срочную помощь/ }).click();
  await expect(page).toHaveURL(/\/emergency$/);
  await expect(page.getByRole("link", { name: "Позвонить бесплатно" })).toBeVisible();
});

test("language selector provides coherent English and Ukrainian entry points", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A pathway for the family, not another list of links" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Teenager, age 16/ })).toBeVisible();

  await page.getByRole("button", { name: "УКР", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Маршрут для сім'ї, а не ще один список посилань" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Підліток, 16 років/ })).toBeVisible();
});
