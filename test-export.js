const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ acceptDownloads: true });

  console.log('Navigating to http://localhost:8081/today');
  await page.goto('http://localhost:8081/today', { waitUntil: 'domcontentloaded' });

  console.log('Clicking the Export Excel button...');
  await page.waitForTimeout(2000);
  
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('text="Excel"'),
  ]);

  const filename = download.suggestedFilename();
  console.log('Downloaded file:', filename);
  
  await browser.close();
})();
