// HTML モックを Playwright(Chromium) で開いてスクリーンショットを撮る。
// 使い方: node <this> <input.html> <output.png> [width] [height]
//   width 省略時 1440(デスクトップ)、height 省略時 900。fullPage で全体を撮る。
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const [, , htmlArg, outArg, widthArg, heightArg] = process.argv;

if (!htmlArg || !outArg) {
  console.error("usage: node screenshot.mjs <input.html> <output.png> [width] [height]");
  process.exit(1);
}

const width = Number(widthArg) || 1440;
const height = Number(heightArg) || 900;
const htmlPath = path.resolve(htmlArg);
const outPath = path.resolve(outArg);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 2,
});
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`screenshot saved: ${outPath} (${width}x${height})`);
