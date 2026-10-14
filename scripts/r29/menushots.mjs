// R29 (menus) — capturas para docs/shots29menus: menu de clique direito com as seções RECOLHIDAS ao abrir, o mesmo
// menu filtrando (seções com resultado abertas) e o botão "Ações com esta pessoa" DESABILITADO quando não há ação.
// Servidor: npx vite --port 5293. Uso: node scripts/r29/menushots.mjs [saída=docs/shots29menus] [porta=5293]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node22/lib/node_modules/playwright');
const [out = 'docs/shots29menus', port = '5293'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', (e) => console.log('ERR', tag, e.message));
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }
  const pick = await p.evaluate(async () => {
    const st = await import('/src/ui/store.ts');
    const pb = await import('/src/sim/playbot16.ts');
    const bot = await import('/src/sim/bot.ts');
    const { state } = pb.simulatePlayer(bot.defaultConfig('menus29', { startYear: 1975, scenario: 'established', realNames: true }), 4);
    st.store.game = state; st.store.area = 'artists'; st.store.rerender();
    // rival famoso (menu grande, com seções) e uma pessoa sem nenhuma ação possível (ex.: já morreu)
    const rival = Object.values(state.acts).filter((a) => a.owner && a.owner !== 'player' && a.status !== 'retired' && a.status !== 'split').sort((x, y) => y.fame - x.fame)[0];
    return { rival: rival?.id };
  });
  // 1) clique direito num nome: seções recolhidas
  await p.evaluate(async (id) => { const c = await import('/src/ui/common.ts'); c.inspect.act(id); }, pick.rival);
  await p.waitForTimeout(800);
  const nm = p.locator('.overlay [data-ent=person][data-id]').first();
  if (await nm.count()) {
    await nm.scrollIntoViewIfNeeded();
    await nm.click({ button: 'right' }); await p.waitForTimeout(500);
    console.log(tag, 'seções abertas ao abrir:', await p.$$eval('.cx27-shead[aria-expanded=true]', (xs) => xs.length), 'de', await p.$$eval('.cx27-shead', (xs) => xs.length));
    await p.screenshot({ path: `${out}/menu-recolhido-${tag}.png` });
    // 2) digitar filtra: as seções com resultado se abrem
    await p.keyboard.type('pres'); await p.waitForTimeout(300);
    console.log(tag, 'filtrando "pres":', await p.$$eval('.cx27-shead[aria-expanded=true]', (xs) => xs.map((x) => x.textContent?.trim())));
    await p.screenshot({ path: `${out}/menu-filtro-${tag}.png` });
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  }
  await p.evaluate(() => document.querySelectorAll('.overlay, .scene-overlay, .cx27, .cx27-scrim').forEach((x) => x.remove()));
  // 3) pessoa sem ação: "Ações com esta pessoa" desabilitado com o motivo
  // caso real: alguém que já morreu e a quem você já prestou homenagem (o funeral tem espera de 10 anos) — com quem
  // já morreu só vale a homenagem, então não sobra nenhuma ação
  const dead = await p.evaluate(async () => {
    const st = await import('/src/ui/store.ts');
    const pa = await import('/src/ui/sys/personact18.ts');
    const sim = await import('/src/sim/personact18.ts');
    const s = st.store.game;
    const cands = Object.values(s.persons).filter((x) => !x.alive && !x.isPlayer).slice(0, 40);
    for (const x of cands) {
      const k = `p:${x.id}`;
      if (sim.personActions18(s, k).some((r) => r.def.id === 'funeral' && !r.block)) sim.doPersonAction18(s, 'funeral', k);
      if (!pa.hasActions29(s, k)) { st.store.rerender(); return x.id; }
    }
    return undefined;
  });
  console.log(tag, 'pessoa sem ação:', dead ?? '(nenhuma)');
  if (dead) {
    await p.evaluate(async (id) => { const m = await import('/src/ui/sys/people16.ts'); m.openPerson16(`p:${id}`); }, dead);
    await p.waitForTimeout(800);
    const off = p.locator('.overlay [data-noacts29]').first();
    if (await off.count()) {
      await off.scrollIntoViewIfNeeded(); await off.hover();
      console.log(tag, 'botão:', await off.getAttribute('aria-label'), '| disabled:', await off.isDisabled());
      await p.screenshot({ path: `${out}/acoes-desabilitado-${tag}.png` });
    } else { console.log(tag, 'pessoa sem ação não achada na ficha', await p.evaluate(async (id) => { const st = await import('/src/ui/store.ts'); const pa = await import('/src/ui/sys/personact18.ts'); return [pa.hasActions29(st.store.game, `p:${id}`), document.querySelectorAll('.overlay').length, document.querySelectorAll('.pa18-d').length, document.querySelector('.overlay h3, .overlay h2')?.textContent]; }, dead)); await p.screenshot({ path: `/tmp/claude-0/-home-user-Vinyl-Game/c8f687c8-5e2c-55d8-895e-ad382da4cd65/scratchpad/dbg-${tag}.png` }); }
  }
  await p.close();
}
await b.close();
console.log('ok', out);
