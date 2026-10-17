// R31 · onda 5 (POL5) — TESTE de navegador do bolso (pedido do dono: "o fixar não está funcionando"):
//  (a) "+ fixar" sem papel aberto abre a gaveta com os objetos do lugar e fixa o escolhido;
//  (b) com papel aberto (de qualquer frente: PAPEL, ELENCO, CASA) o papel vai para SH5 e "fixar no bolso" do cabeçalho fixa;
//  (c) o item aparece no bolso na hora, abre pela tecla, "×" tira, sobrevive a salvar/carregar e o 9º dá aviso claro.
// Sai com código 1 se algo falhar. Uso: node scripts/r31/check-pol5-bolso.mjs [porta] [pasta-capturas]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5891', out = process.argv[3];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(2500); p.setDefaultTimeout(120000);
await p.evaluate(async () => {
  const wg = await import('/src/sim/worldgen.ts'); const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts'); const sw = await import('/src/sim/r31/switches.ts'); const c = await import('/src/ui/common.ts'); const off = await import('/src/ui/tutoff19.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const g = wg.createGame(botc.defaultConfig('bolso', { startYear: 1962, scenario: 'established' }));
  off.setTutorials19(st.store.prefs, false); g.tutorial = { step: 99, done: true, seen: [] }; sw.setSw(g, 'exp5.nav', true);
  Object.assign(sh.SH5, { region: 'sede', paper: null, pause: false, help: false });
  st.store.game = g; c.rerender(); document.querySelectorAll('.overlay').forEach((e) => e.remove());
});
const ids = () => p.evaluate(async () => { const ex = await import('/src/sim/r31/exp5.ts'); const st = await import('/src/ui/store.ts'); return ex.pocketIds5(st.store.game); });
const shown = () => p.evaluate(() => [...document.querySelectorAll('.b5-pb')].map((x) => x.dataset.pocket));
const shot = async (n) => { await p.waitForTimeout(500); if (out) await p.screenshot({ path: `${out}/bolso-${n}.png` }); };
let ok = true; const check = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) ok = false; };
// (a) sem papel: a gaveta
await p.locator('.b5-pin').click(); await p.waitForTimeout(400); await shot('a-gaveta');
check(await p.locator('.b5-drawer:not([hidden]) [data-pin5]').count() > 3, 'sem papel aberto, "+ fixar" abre a gaveta com os objetos da sede');
const first = await p.locator('.b5-drawer [data-pin5]').first().getAttribute('data-pin5');
await p.locator(`.b5-drawer [data-pin5="${first}"]`).click(); await p.waitForTimeout(600);
check((await ids()).includes(first) && (await shown()).includes(first), `escolher na gaveta fixa (${first}) e aparece no bolso na hora`);
// (b) papéis de cada frente: PAPEL (livro-caixa, Z), ELENCO (mural, 4), CASA (espelho, V); o cabeçalho fixa
for (const [k, id] of [['z', 'livrocaixa'], ['4', 'mural'], ['v', 'espelho']]) {
  await p.keyboard.press(k); await p.waitForTimeout(900);
  const open = await p.evaluate(async () => (await import('/src/ui/r31/shell5.ts')).SH5.paper?.obj);
  check(open === id, `tecla ${k} abre o papel ${id} na casca (SH5.paper)`);
  await p.locator('.p5-pin').click(); await p.waitForTimeout(500);
  check((await ids()).includes(id) && (await p.locator('.p5-pin.on').count()) === 1, `"fixar no bolso" do cabeçalho fixa ${id}`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
}
await shot('b-bolso');
// (c) abre pelo bolso, × tira, salvar/carregar, limite de 8
await p.locator('.b5-pb[data-pocket="mural"]').click(); await p.waitForTimeout(900);
check(await p.evaluate(async () => (await import('/src/ui/r31/shell5.ts')).SH5.paper?.obj) === 'mural', 'clicar no item do bolso abre o papel');
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
await p.locator('.b5-pi:has([data-pocket="mural"]) .b5-px').click(); await p.waitForTimeout(500);
check(!(await ids()).includes('mural') && !(await shown()).includes('mural'), '"×" tira do bolso');
const kept = await p.evaluate(async () => {
  const sv = await import('/src/core/save20.ts'); const st = await import('/src/ui/store.ts'); const ex = await import('/src/sim/r31/exp5.ts');
  const g2 = sv.decodeSave20(sv.encodeSave20(st.store.game), (g) => g);
  return JSON.stringify(ex.pocketIds5(g2)) === JSON.stringify(ex.pocketIds5(st.store.game));
});
check(kept, 'o bolso sobrevive a salvar e carregar');
for (const k of ['e', 'g', 'a', 'c', 'u', '3', '5', 'f', 'd']) { await p.keyboard.press(k); await p.waitForTimeout(500); if (await p.locator('.p5-pin:not(.on)').count()) await p.locator('.p5-pin').click(); await p.waitForTimeout(250); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
const n = (await ids()).length;
await p.locator('.b5-pin').click(); await p.waitForTimeout(400);
const warn = await p.evaluate(() => [...document.querySelectorAll('.toast, [role="status"], .toasts *')].map((x) => x.textContent).join(' '));
await shot('c-cheio');
check(n === 8 && /cheio/i.test(warn), `o bolso para em 8 (${n}) e o "+ fixar" avisa que está cheio`);
await b.close();
console.log(ok ? 'bolso ok' : 'bolso com falha'); process.exit(ok ? 0 : 1);
