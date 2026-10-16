// R31 onda 4 (M · Estilos por época) — capturas de cada estilo em 3 telas (Hoje, Mercado, Opções) e verificação de
// largura: nada estoura em 1360px nem no celular (390px). Começa pela tela inicial como o jogador e fixa cada estilo
// pelas preferências (só apresentação). Uso: npx vite --host 127.0.0.1 --port 5877 &   node scripts/r31/shotsM.mjs [pasta] [porta] [estilos]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5877';
const only = (process.argv[4] ?? '').split(',').filter(Boolean);
// tema nativo de cada estilo (o dos mocks aprovados); a captura "outro-tema" mostra a variante do outro tema
const NATIVE = { gazeta: 'light', deco: 'dark', jukebox: 'light', hifi: 'dark', fosforo: 'dark', janelas: 'light', portal: 'light', plano: 'light', vidro: 'dark', estudio: 'dark' };
const SKINS = Object.keys(NATIVE).filter((s) => !only.length || only.includes(s));
const MOBILE = process.env.MOBILE !== '0';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function boot(viewport) {
  const p = await b.newPage({ viewport, locale: 'pt-BR' });
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
  p.setDefaultTimeout(30000);
  await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
  await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
  for (let i = 0; i < 90 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
  await p.evaluate(async () => {
    const st = await import('/src/ui/store.ts');
    const off = await import('/src/ui/tutoff19.ts');
    const g = st.store.game;
    g.tutorial = { step: 99, done: true, seen: [] };
    off.setTutorials19(st.store.prefs, false);
    window.__g = g;
  });
  return p;
}
const setSkin = (p, id, theme) => p.evaluate(async ([id, theme]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  st.store.prefs.skin31 = id; st.store.prefs.theme = theme; st.savePrefs(); c.rerender();
}, [id, theme]);
const area = (p, a, tabs) => p.evaluate(async ([a, tabs]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = a;
  for (const [k, v] of tabs ?? []) vis.setTab(k, v);
  c.rerender();
  document.querySelector('main')?.scrollTo(0, 0); window.scrollTo(0, 0);
}, [a, tabs]);
const options = async (p) => {
  await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
  await p.getByRole('button', { name: /Opções/ }).first().click({ timeout: 8000 }).catch(() => console.error('sem botão Opções'));
  await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('.skin31')?.scrollIntoView({ block: 'start' }));
};
/** Elementos visíveis que passam da largura da janela (estouro horizontal). */
const overflow = (p) => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = [];
  if (document.documentElement.scrollWidth > W + 1) bad.push(`página ${document.documentElement.scrollWidth}>${W}`);
  for (const e of document.querySelectorAll('.topbar *, .nav *, main *, .overlay *')) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    let q = e.parentElement, clipped = false;
    while (q && q !== document.body) { const cs = getComputedStyle(q); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) { clipped = true; break; } q = q.parentElement; }
    if (!clipped && r.right > W + 1) bad.push(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')} → ${Math.round(r.right)}`);
  }
  return bad.slice(0, 6);
});

/** Estados: hover, foco, desabilitado e bloqueado com motivo — cores reais calculadas pelo navegador. */
const states = (p) => p.evaluate(async () => {
  const lk = await import('/src/ui/r31/lock31.ts');
  const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (e) => { for (let q = e; q; q = q.parentElement) { const c = rgb(getComputedStyle(q).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c.slice(0, 3); } return rgb(getComputedStyle(document.body).backgroundColor).slice(0, 3); };
  const host = document.querySelector('main .card, main .c27, main') ?? document.body;
  const box = document.createElement('div'); box.className = 'row'; host.prepend(box);
  const on = document.createElement('button'); on.className = 'btn small'; on.textContent = 'Ativo';
  const off = document.createElement('button'); off.className = 'btn small'; off.textContent = 'Desabilitado'; off.disabled = true;
  const locked = lk.lockBtn31('Contratar', { pt: 'Falta dinheiro', en: 'Not enough cash' }, () => {});
  box.append(on, off, locked);
  const why = locked.querySelector('.lk31-why');
  const out = [];
  const c1 = cr(rgb(getComputedStyle(off).color), bgOf(off)); if (c1 < 3) out.push(`desabilitado ${c1.toFixed(2)}`);
  const c2 = cr(rgb(getComputedStyle(why).color), bgOf(why)); if (c2 < 4.5) out.push(`motivo do bloqueio ${c2.toFixed(2)}`);
  const c3 = cr(rgb(getComputedStyle(on).color), bgOf(on)); if (c3 < 4.5) out.push(`botão ${c3.toFixed(2)}`);
  on.focus();
  const fs = getComputedStyle(on); if (fs.outlineStyle === 'none' || parseFloat(fs.outlineWidth) < 2) out.push('sem anel de foco');
  else { const c4 = cr(rgb(fs.outlineColor), bgOf(on)); if (c4 < 3) out.push(`anel de foco ${c4.toFixed(2)}`); }
  box.remove();
  return out;
});
const report = {};
const p = await boot({ width: 1360, height: 900 });
console.log('ano', await p.evaluate(() => window.__g.year));
for (const s of SKINS) {
  await setSkin(p, s, NATIVE[s]);
  const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/onda4-m-${s}-${name}.png` }); };
  await area(p, 'cockpit'); report[`${s}/hoje`] = await overflow(p);
  await p.keyboard.press('Tab'); report[`${s}/estados`] = await states(p); await area(p, 'cockpit'); await shot('hoje');
  await area(p, 'market'); report[`${s}/mercado`] = await overflow(p); await shot('mercado');
  await options(p); report[`${s}/opcoes`] = await overflow(p); await shot('opcoes');
  await setSkin(p, s, NATIVE[s] === 'dark' ? 'light' : 'dark');
  await area(p, 'cockpit'); report[`${s}/outro-tema`] = await overflow(p); await p.keyboard.press('Tab'); report[`${s}/estados-outro-tema`] = await states(p); await shot('outro-tema');
}
// aviso na virada da época (automático): 1979 → 1980 troca Hi-Fi por Fósforo; o aviso traz voltar / fixar / Opções
if (!only.length) {
  const notice = await p.evaluate(async () => {
    const st = await import('/src/ui/store.ts');
    const c = await import('/src/ui/common.ts');
    st.store.prefs.skin31 = 'auto'; st.store.prefs.theme = 'dark'; st.savePrefs();
    const g = window.__g, y0 = g.year;
    g.year = 1979; c.rerender(); g.year = 1980; c.rerender();
    await new Promise((r) => setTimeout(r, 400));
    const el = document.querySelector('.skin31-notice');
    const res = { skin: document.documentElement.dataset.eraSkin, text: el?.textContent ?? null, buttons: [...(el?.querySelectorAll('button') ?? [])].map((b) => b.textContent) };
    window.__y0 = y0;
    return res;
  });
  console.log('aviso', JSON.stringify(notice));
  if (notice.skin !== 'fosforo' || !notice.text || notice.buttons.length < 3) { console.error('AVISO DE VIRADA NÃO APARECEU'); process.exitCode = 1; }
  await area(p, 'cockpit'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/onda4-m-aviso-virada.png` });
  // "Voltar ao Hi-Fi" fixa o estilo anterior
  await p.locator('.skin31-notice button').first().click();
  await p.waitForTimeout(500);
  const after = await p.evaluate(async () => { const st = await import('/src/ui/store.ts'); return [st.store.prefs.skin31, document.documentElement.dataset.eraSkin]; });
  console.log('depois de voltar', JSON.stringify(after));
  if (after[0] !== 'hifi' || after[1] !== 'hifi') { console.error('VOLTAR AO ANTERIOR FALHOU'); process.exitCode = 1; }
  await p.evaluate(() => { window.__g.year = window.__y0; });
}
await p.close();
if (MOBILE) {
  const m = await boot({ width: 390, height: 844 });
  for (const s of SKINS) {
    await setSkin(m, s, NATIVE[s]);
    await area(m, 'cockpit'); report[`${s}/celular-hoje`] = await overflow(m);
    await area(m, 'market'); report[`${s}/celular-mercado`] = await overflow(m);
    if (process.env.MOBSHOT) await m.screenshot({ path: `${out}/onda4-m-${s}-celular.png` });
  }
  await m.close();
}
await b.close();
const bad = Object.entries(report).filter(([, v]) => v.length);
console.log(bad.length ? JSON.stringify(Object.fromEntries(bad), null, 1) : 'largura e estados: nada estoura, estados com contraste e foco');
if (bad.length) process.exitCode = 1;
console.log('ok:', out);
