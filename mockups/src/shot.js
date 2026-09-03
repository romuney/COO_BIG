/* Скриншоты собранных макетов (Playwright + Chromium).
   Запуск: NODE_PATH=$(npm root -g) node mockups/src/shot.js [file.html] [width]
   Выход: mockups/screenshots/<file>_<page-id>.png (по одной картинке на страницу) + консольные ошибки. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const file = process.argv[2] || 'mockups/dist/exec_board_2026-08.html';
  const width = parseInt(process.argv[3] || '1400', 10);
  const outDir = path.resolve('mockups/screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(file), { waitUntil: 'load' });
  await page.addStyleTag({ content: '.topbar{position:static !important}' });
  await page.waitForTimeout(1200); // шрифты
  const base = path.basename(file, '.html');
  const ids = await page.$$eval('section.page', els => els.map(e => e.id));
  for (const id of ids) {
    const el = await page.$('#' + id);
    const box = await el.boundingBox();
    await el.screenshot({ path: path.join(outDir, `${base}_${id}.png`) });
    console.log(`${id}: ${Math.round(box.width)}x${Math.round(box.height)}`);
  }
  // проверка горизонтального переполнения
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('horizontal overflow px:', overflow);
  if (errors.length) { console.log('ERRORS:'); errors.forEach(e => console.log('  ' + e)); } else console.log('no JS errors');
  await browser.close();
})();
