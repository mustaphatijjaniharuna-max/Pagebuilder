export default async function run(page) {
  // Walk down the page so every IntersectionObserver reveal has fired.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.5;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '_qa/templates-new.png', fullPage: true });
  return await page.evaluate(() => ({
    total: document.querySelectorAll('#gallery .tpl-card').length,
    hidden: Array.from(document.querySelectorAll('#gallery .tpl-card'))
      .filter(c => parseFloat(getComputedStyle(c).opacity) < 0.9)
      .map(c => c.querySelector('h3').textContent)
  }));
}