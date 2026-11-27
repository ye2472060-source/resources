const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const file = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1:');
  await page.goto(file, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  // 1. 资料库含国内新源（先查，避免搜索浮层遮挡）
  await page.click('#nav a[href="#/library"]');
  await page.waitForTimeout(400);
  const libText = (await page.textContent('#article')) || '';
  console.log('资料库 | 巨量星图:', libText.includes('巨量星图'), '| 花火:', libText.includes('花火'),
    '| CES:', libText.includes('CES'), '| 致知计划:', libText.includes('致知计划'),
    '| 蒲公英:', libText.includes('蒲公英'), '| 公众号:', libText.includes('公众号'));

  // 2. m4-9 渲染 + 截图
  await page.click('#nav a[href="#/m/m4/m4-9"]');
  await page.waitForTimeout(400);
  const t9 = ((await page.textContent('#article')) || '').trim().slice(0, 30);
  const svg9 = await page.locator('#article svg').count();
  const tbl9 = await page.locator('#article table.tb').count();
  console.log('m4-9:', t9, '| SVG', svg9, '| 表格', tbl9);
  await page.screenshot({ path: path.join(__dirname, 'test-domestic.png') });

  // 3. m4-10 渲染 + 法规引用
  await page.click('#nav a[href="#/m/m4/m4-10"]');
  await page.waitForTimeout(400);
  const refS30 = await page.locator('#article .ref[data-src="S30"]').count();
  const olCount = await page.locator('#article ol li').count();
  console.log('m4-10 | 引用S30(互联网广告管理办法):', refS30, '| 红线条目', olCount);

  // 4. 搜索国内术语（放最后，避免浮层遮挡后续点击）
  await page.fill('#sbSearchInput', '蒲公英');
  await page.waitForTimeout(400);
  console.log('搜索「蒲公英」可见:', ((await page.textContent('body')) || '').includes('蒲公英'));

  console.log('pageerror:', errors.length ? errors.join(' ; ') : '无');
  await browser.close();
})();
