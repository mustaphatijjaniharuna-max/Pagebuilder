export default async function run(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForSelector('.tabs button');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '_qa/editor-mobile-after.png', fullPage: true });
  return await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    widest: Array.from(document.querySelectorAll('.editor-body *'))
      .map(e => ({ w: Math.round(e.getBoundingClientRect().right), cls: e.className && String(e.className).slice(0, 30) }))
      .sort((a, b) => b.w - a.w).slice(0, 5)
  }));
}
