// R31 onda 5 (TEC) — capturas da navegação em esqueleto (sem tela nova): com exp5.nav DESLIGADO a tecla E abre
// "Outras carreiras" como hoje; LIGADO, E abre a caixa de entrada, G a agenda, Shift+3 a cidade e "?" lista as teclas novas.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/shots31w5tec.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  st.store.game.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
});
const shot = async (name) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/onda5-tec-${name}.png` }); console.log('captura', name); };
const press = async (k) => { await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove())); await p.mouse.click(5, 450); await p.keyboard.press(k); };
const area = () => p.evaluate(async () => (await import('/src/ui/store.ts')).store.area);
const setNav = (on) => p.evaluate(async (on) => { const sw = await import('/src/sim/r31/switches.ts'); const st = await import('/src/ui/store.ts'); sw.setSw(st.store.game, 'exp5.nav', on); }, on);
await setNav(false);
await press('e'); console.log('desligado, E →', await area()); await shot('desligado-e');
await setNav(true);
await press('e'); console.log('ligado, E →', await area()); await shot('ligado-e-caixa');
await press('g'); console.log('ligado, G →', await area()); await shot('ligado-g-agenda');
await press('Shift+Digit3'); console.log('ligado, Shift+3 →', await area());
await press('?'); await shot('ligado-teclas');
await setNav(false);
await b.close();
