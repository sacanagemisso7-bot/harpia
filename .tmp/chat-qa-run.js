const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

async function run() {
  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3050";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill("founder@hireflow.ai");
    await page.getByLabel("Senha").fill("ChangeMe123!");

    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30000 }),
      page.getByRole("button", { name: "Entrar" }).click()
    ]);

    await page.goto(`${baseUrl}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('textarea[name="message"]', { timeout: 30000 });

    const prompts = page.getByTestId("company-chat-prompt");
    const messages = page.getByTestId("company-chat-message");

    const promptCount = await prompts.count();
    const beforeCount = await messages.count();
    const promptText = promptCount > 0 ? (await prompts.first().innerText()).trim() : null;

    if (!promptCount) {
      throw new Error("Nenhum atalho clicável foi encontrado no Company Chat.");
    }

    await prompts.first().click();

    await page.waitForFunction(
      (previousCount) => {
        return document.querySelectorAll('[data-testid="company-chat-message"]').length > previousCount;
      },
      beforeCount,
      { timeout: 45000 }
    );

    await page.waitForTimeout(1500);

    const afterCount = await messages.count();
    const lastMessageText = await messages.last().innerText();
    const scrollInfo = await page.getByTestId("company-chat-scroll-area").evaluate((node) => ({
      scrollTop: node.scrollTop,
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      atBottom: node.scrollTop + node.clientHeight >= node.scrollHeight - 28
    }));

    const screenshotPath = path.join(process.cwd(), ".tmp", "chat-qa.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const result = {
      ok: true,
      loginUrl: "/dashboard",
      chatUrl: page.url(),
      promptText,
      beforeCount,
      afterCount,
      scrollInfo,
      lastMessageText: lastMessageText.slice(0, 400),
      screenshotPath
    };

    fs.writeFileSync(path.join(process.cwd(), ".tmp", "chat-qa-result.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  const result = {
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  };

  fs.writeFileSync(path.join(process.cwd(), ".tmp", "chat-qa-result.json"), JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
});
