const { test, expect } = require("playwright/test");

test("company chat supports login, shortcut prompts and bottom-anchored flow", async ({ page }) => {
  const baseUrl = "http://127.0.0.1:3050";

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill("founder@hireflow.ai");
  await page.getByLabel("Senha").fill("ChangeMe123!");

  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30000 }),
    page.getByRole("button", { name: "Entrar" }).click()
  ]);

  await page.goto(`${baseUrl}/chat`, { waitUntil: "networkidle" });
  await expect(page.locator('textarea[name="message"]')).toBeVisible();

  const prompts = page.getByTestId("company-chat-prompt");
  await expect(prompts.first()).toBeVisible();

  const messages = page.getByTestId("company-chat-message");
  const beforeCount = await messages.count();
  const promptText = (await prompts.first().innerText()).trim();

  await prompts.first().click();

  await expect
    .poll(async () => await messages.count(), {
      timeout: 45000,
      intervals: [500, 1000, 1500]
    })
    .toBeGreaterThan(beforeCount);

  await page.waitForTimeout(1500);

  const scrollInfo = await page.getByTestId("company-chat-scroll-area").evaluate((node) => ({
    scrollTop: node.scrollTop,
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    atBottom: node.scrollTop + node.clientHeight >= node.scrollHeight - 28
  }));

  const lastMessageText = await messages.last().innerText();

  expect(scrollInfo.atBottom).toBeTruthy();
  expect(lastMessageText.length).toBeGreaterThan(0);

  await page.screenshot({ path: ".tmp/chat-qa.png", fullPage: true });

  console.log(
    JSON.stringify({
      promptText,
      beforeCount,
      afterCount: await messages.count(),
      lastMessageText: lastMessageText.slice(0, 300),
      scrollInfo
    })
  );
});
