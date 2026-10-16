import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 1040 } });
for (const n of [1,2,3,4,5]) {
  await p.goto('file://' + process.cwd() + '/trans.html#' + n); await p.reload();
  await p.waitForFunction(() => document.title === 'ok', null, { timeout: 60000 });
  await p.screenshot({ path: `onda5-mock-transicao-${n}.png` });
}
await b.close(); console.log('ok');
