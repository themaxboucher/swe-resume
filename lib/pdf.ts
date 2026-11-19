import "server-only";
import type { Browser } from "puppeteer-core";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function launchBrowser(): Promise<Browser> {
  if (isServerless) {
    const [{ default: chromium }, puppeteer] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  // Local development: full puppeteer ships its own Chrome for Testing.
  const puppeteer = await import("puppeteer");
  return (await puppeteer.launch({ headless: true })) as unknown as Browser;
}

const globalForBrowser = globalThis as unknown as { pdfBrowser?: Promise<Browser> };

/** Reuses one browser per server instance; relaunches if it crashed. */
async function getBrowser(): Promise<Browser> {
  if (globalForBrowser.pdfBrowser) {
    const browser = await globalForBrowser.pdfBrowser.catch(() => null);
    if (browser?.connected) return browser;
  }
  globalForBrowser.pdfBrowser = launchBrowser();
  return globalForBrowser.pdfBrowser;
}

export async function renderPdf(url: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) await page.setExtraHTTPHeaders({ "x-vercel-protection-bypass": bypass });
    await page.emulateMediaType("print");
    const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
    if (!response?.ok()) throw new Error(`Print page responded ${response?.status()}`);
    // Set by the print view once fonts are loaded and pagination is final.
    await page.waitForSelector('html[data-doc-ready="true"]', { timeout: 20_000 });
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await page.close().catch(() => {});
  }
}
