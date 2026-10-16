// R31 (W0-BASE) — medição de referência da INTERFACE (Playwright + Chromium), para comparar as próximas ondas.
// Mede, numa partida criada pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA) e depois de 12 meses jogados pelo
// robô (playbot16, dentro da página, como scripts/shots29demo.mjs):
//   1. tempo de abrir cada seção e cada página do menu lateral (1ª abertura e mediana de mais 2), com o nº de elementos
//      desenhados — no jogo novo e no jogo com 12 meses;
//   2. tempo de virar uma semana e um mês pelos botões do topo (clique → tela pintada; o autosave roda depois);
//   3. tempo de salvar (store.saveGame, o mesmo do botão: serializa, comprime e grava no IndexedDB), com a divisão;
//   4. uma lista fixa de tarefas comuns, cada uma com o percurso atual definido aqui — conta os cliques e o tempo, e
//      confere se chegou (sem isso a tarefa sai como "não chegou").
// Tempos são de relógio no navegador (performance.now, até dois quadros depois do clique) e variam com a máquina.
//
// Uso:  node scripts/r31/measure-ui.mjs [porta=5331] [saída=docs/r31/base30] [--months 12]
//   Se não houver servidor na porta, sobe `npx vite --port <porta>` sozinho e o derruba no fim. Grava <saída>-ui.json e
//   anexa/atualiza a seção da interface em <saída>.md (entre os marcadores <!-- measure-ui:início/fim -->).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pos = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] ?? '').startsWith('--'));
const flag = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const port = pos[0] ?? '5331';
const outBase = resolve(ROOT, pos[1] ?? 'docs/r31/base30');
const MONTHS = Number(flag('months', '12'));
const URL0 = `http://localhost:${port}/`;
const MARK_A = '<!-- measure-ui:início -->', MARK_B = '<!-- measure-ui:fim -->';

// ---------------------------------------------------------------- servidor (só se ninguém estiver servindo)
const up = async () => { try { const r = await fetch(URL0); return r.ok; } catch { return false; } };
let vite = null;
if (!(await up())) {
  vite = spawn('npx', ['vite', '--port', port, '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await up())) { stopVite(); throw new Error(`vite não subiu na porta ${port}`); }
  console.log(`vite iniciado na porta ${port} (pid ${vite.pid})`);
}
function stopVite() { if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { /* já saiu */ } vite = null; } }
process.on('exit', stopVite);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { stopVite(); process.exit(130); });

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errors = [];
try {
  const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
  p.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  p.on('dialog', (d) => void d.accept()); // "Salvar como novo…" pede o nome numa janela do navegador (aceitar = 1 clique)
  p.setDefaultTimeout(30000);

  // ------------------------------------------------------------ abrir o jogo e criar a partida pela tela inicial
  const tBoot = Date.now();
  await p.goto(URL0);
  await p.getByText('NOVA RUN', { exact: false }).first().waitFor();
  const bootMs = Date.now() - tBoot;
  await p.getByText('NOVA RUN', { exact: false }).first().click();
  await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().waitFor();
  const tNew = Date.now();
  await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click();
  for (let i = 0; i < 120 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game && !!document.querySelector('nav .nav-head'))); i++) await p.waitForTimeout(250);
  const newGameMs = Date.now() - tNew;
  await p.evaluate(async () => {
    const st = await import('/src/ui/store.ts');
    const off = await import('/src/ui/tutoff19.ts');
    const c = await import('/src/ui/common.ts');
    st.store.game.tutorial = { step: 99, done: true, seen: [] };
    off.setTutorials19(st.store.prefs, false);
    document.querySelectorAll('.overlay').forEach((e) => e.remove());
    c.rerender();
    // utilidades de medição (só leitura + clique; nada muda o jogo além do que o clique faria)
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const vis = (e) => !!e && !!e.offsetParent;
    window.__m31 = {
      frames, vis,
      clear: () => document.querySelectorAll('.overlay').forEach((e) => e.remove()),
      async click(el) { const t0 = performance.now(); el.click(); await frames(); return performance.now() - t0; },
      nodes: () => document.querySelectorAll('main *, .overlay *').length,
      date: () => { const g = st.store.game; return `${g.year}-${g.month}-${g.week}-${g.day ?? ''}`; },
    };
  });
  const info0 = await p.evaluate(async () => { const st = await import('/src/ui/store.ts'); const g = st.store.game; return { year: g.year, month: g.month, role: g.config.role, seed: g.config.seed, view: localStorage.getItem('vtn.view27') }; });
  console.log('partida', JSON.stringify(info0), `abrir ${bootMs} ms, criar ${newGameMs} ms`);

  // ------------------------------------------------------------ menu: seções e páginas
  const heads = await p.evaluate(() => [...document.querySelectorAll('nav .tree27-sec[data-sec25]')].map((s) => ({ sec: s.getAttribute('data-sec25'), label: s.querySelector('.nav-head .lbl')?.textContent.trim() ?? '' })));
  async function listPages() {
    const pages = [];
    for (const h of heads) {
      await p.evaluate((sec) => { window.__m31.clear(); document.querySelector(`nav .tree27-sec[data-sec25="${sec}"] .nav-head`)?.click(); }, h.sec);
      await p.waitForTimeout(300);
      const items = await p.evaluate((sec) => [...document.querySelectorAll(`nav .tree27-sec[data-sec25="${sec}"] li.tree27-page[data-area]`)]
        .map((li) => ({ id: li.getAttribute('data-area'), label: li.querySelector(':scope > .tree27-row button.tree27-pg .lbl')?.textContent.trim() ?? '' })), h.sec);
      for (const it of items) if (it.label && !pages.some((x) => x.id === it.id)) pages.push({ sec: h.label, ...it });
    }
    return pages;
  }
  /** abre a seção (cabeçalho) ou a página (item do menu) e devolve ms até a tela pintada */
  const openOnce = (kind, key, sec) => p.evaluate(async ([kind, key, sec]) => {
    const M = window.__m31;
    M.clear();
    const head = () => document.querySelector(`nav .tree27-sec[data-sec25="${sec}"] .nav-head`);
    if (kind === 'sec') { await M.frames(); const ms = await M.click(head()); return { ms, nodes: M.nodes(), hash: location.hash }; }
    let btn = document.querySelector(`nav li.tree27-page[data-area="${key}"] > .tree27-row button.tree27-pg`);
    if (!M.vis(btn)) { head()?.click(); await M.frames(); btn = document.querySelector(`nav li.tree27-page[data-area="${key}"] > .tree27-row button.tree27-pg`); }
    if (!M.vis(btn)) { // dentro de um hub fechado: abre o hub
      const hub = [...document.querySelectorAll(`nav .tree27-sec[data-sec25="${sec}"] li.tree27-hub`)].find((x) => x.querySelector(`li.tree27-page[data-area="${key}"]`));
      hub?.querySelector('button')?.click(); await M.frames();
      btn = document.querySelector(`nav li.tree27-page[data-area="${key}"] > .tree27-row button.tree27-pg`);
    }
    if (!btn) return { ms: -1, nodes: 0, hash: location.hash };
    // sai da página antes (clicar na página já aberta não redesenha nada): volta ao Cockpit sem cronometrar
    if (btn.classList.contains('on')) { document.querySelector('nav .tree27-sec[data-sec25] .nav-head')?.click(); await M.frames(); btn = document.querySelector(`nav li.tree27-page[data-area="${key}"] > .tree27-row button.tree27-pg`); if (!M.vis(btn)) { head()?.click(); await M.frames(); btn = document.querySelector(`nav li.tree27-page[data-area="${key}"] > .tree27-row button.tree27-pg`); } }
    const ms = await M.click(btn);
    return { ms, nodes: M.nodes(), hash: location.hash };
  }, [kind, key, sec]);
  const med = (xs) => { const a = xs.filter((x) => x >= 0).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : -1; };
  async function measureMenu(tag) {
    const pages = await listPages();
    const secRows = [];
    for (const h of heads) {
      const r = [];
      for (let k = 0; k < 3; k++) { r.push(await openOnce('sec', h.sec, h.sec)); await p.evaluate(() => document.querySelector('nav .tree27-sec[data-sec25] .nav-head')?.click()); await p.waitForTimeout(60); }
      secRows.push({ sec: h.label, first: Math.round(r[0].ms), warm: Math.round(med([r[1].ms, r[2].ms])), nodes: r[0].nodes, hash: r[0].hash });
    }
    const secOf = (label) => heads.find((h) => h.label === label)?.sec;
    const pageRows = [];
    for (const pg of pages) {
      const r = [];
      for (let k = 0; k < 3; k++) r.push(await openOnce('page', pg.id, secOf(pg.sec)));
      pageRows.push({ sec: pg.sec, page: pg.label, id: pg.id, first: Math.round(r[0].ms), warm: Math.round(med([r[1].ms, r[2].ms])), nodes: r[0].nodes, hash: r[0].hash });
      process.stdout.write(`  [${tag}] ${pg.sec} › ${pg.label}: ${Math.round(r[0].ms)} ms\n`);
    }
    return { sections: secRows, pages: pageRows };
  }

  const menuNew = await measureMenu('novo');

  // ------------------------------------------------------------ 12 meses de robô (dentro da página)
  const tBot = Date.now();
  const info12 = await p.evaluate(async (months) => {
    const st = await import('/src/ui/store.ts');
    const tick = await import('/src/sim/tick.ts');
    const bot = await import('/src/sim/playbot16.ts');
    const util = await import('/src/sim/util.ts');
    const c = await import('/src/ui/common.ts');
    const g = st.store.game;
    for (let i = 0; i < months; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
    window.__m31.clear(); c.rerender();
    return { year: g.year, month: g.month, acts: util.playerActs(g).length };
  }, MONTHS);
  console.log(`robô ${MONTHS} meses em ${Date.now() - tBot} ms →`, JSON.stringify(info12));
  await p.waitForTimeout(500);
  const menu12 = await measureMenu(`${MONTHS}m`);

  // ------------------------------------------------------------ virar semana e mês pelos botões do topo
  async function advance(kind) {
    return p.evaluate(async (kind) => {
      const M = window.__m31;
      M.clear();
      // volta ao Cockpit (tela de onde o jogador costuma virar)
      document.querySelector('nav .tree27-sec[data-sec25] .nav-head')?.click(); await M.frames();
      const re = kind === 'week' ? /Semana/ : /Avançar mês|AVANÇAR/i;
      const btn = [...document.querySelectorAll('header button, .topbar button, button')].find((b) => M.vis(b) && re.test(b.textContent) && (kind !== 'week' || /fechamento semanal/.test(b.title)) && (kind !== 'month' || b.classList.contains('m23-adv')));
      if (!btn) return { ms: -1, note: 'botão não achado' };
      const d0 = M.date();
      const t0 = performance.now();
      btn.click(); await M.frames();
      let clicks = 1, note = '';
      // porta antes de avançar (atividades da janela / cartões): resolve pelo caminho mais curto e conta o clique
      for (let k = 0; k < 3 && M.date() === d0; k++) {
        const ov = [...document.querySelectorAll('.overlay')].pop();
        if (!ov) break;
        const go = [...ov.querySelectorAll('button')].find((x) => /Resolver rápido|Avançar|Continuar|Seguir|Pular|Ok/i.test(x.textContent) && !/✕/.test(x.textContent));
        note = (ov.textContent || '').trim().slice(0, 80);
        if (!go) break;
        go.click(); clicks++; await M.frames();
      }
      const ms = performance.now() - t0;
      return { ms, clicks, moved: M.date() !== d0, from: d0, to: M.date(), note };
    }, kind);
  }
  const weeks = [], months = [];
  for (let i = 0; i < 4; i++) { weeks.push(await advance('week')); await p.waitForTimeout(400); }
  for (let i = 0; i < 3; i++) { months.push(await advance('month')); await p.waitForTimeout(800); }
  console.log('semana', weeks.map((w) => Math.round(w.ms)).join(' '), '· mês', months.map((w) => Math.round(w.ms)).join(' '));

  // ------------------------------------------------------------ salvar (mesma função do botão / autosave)
  const saves = [];
  for (let i = 0; i < 3; i++) {
    await p.waitForTimeout(600); // deixa o autosave pendente terminar
    saves.push(await p.evaluate(async (i) => {
      const st = await import('/src/ui/store.ts');
      const hh = await import('/src/ui/savehealth20.ts');
      const t0 = performance.now();
      const ok = await st.saveGame(`r31-measure-${i}`, 'medição r31');
      return { ms: performance.now() - t0, ok, ...(hh.health20?.cost ?? {}) };
    }, i));
  }
  console.log('salvar', saves.map((s) => Math.round(s.ms)).join(' '));

  // ------------------------------------------------------------ tarefas comuns: percurso atual e cliques
  // Cada tarefa começa no Cockpit (Painel), sem janelas abertas. Passos: cabeçalho de seção do menu ('sec'), página do
  // menu ('page', pelo nome visível), aba ('tab'), botão visível na tela ('btn') ou o 1º cartão de artista seu ('myact').
  // Um passo é pulado se a tela já está no destino (ex.: a seção abre direto na página). Chegou = `done` verdadeiro.
  const TASKS = [
    { id: 'artista', pt: 'Abrir a ficha de um artista seu', steps: [['sec', 'Pessoas'], ['page', 'Artistas'], ['myact'], ['btn', /Abrir ficha completa/]], done: 'overlay:Formação|Carreira|Contrato' },
    { id: 'paradas', pt: 'Abrir as paradas', steps: [['sec', 'Mundo'], ['page', 'Paradas']], done: 'hash:charts' },
    { id: 'datas', pt: 'Marcar datas de shows (4 datas avulsas)', steps: [['sec', 'Ao vivo'], ['page', 'Shows'], ['tab', /^Agenda$/], ['btn', /Agendar 4 datas/]], done: 'toast:Shows adicionados' },
    { id: 'turne', pt: 'Abrir o planejador de turnê (1ª etapa)', steps: [['sec', 'Ao vivo'], ['page', 'Shows'], ['tab', /^Turnês$/]], done: 'hash:tours' },
    { id: 'estudio', pt: 'Abrir o estúdio', steps: [['sec', 'Projetos'], ['page', 'Estúdio']], done: 'hash:studio' },
    { id: 'disco', pt: 'Abrir o projeto musical (fazer um disco)', steps: [['sec', 'Projetos'], ['page', 'Projeto musical']], done: 'hash:project' },
    { id: 'financas', pt: 'Ver as finanças', steps: [['sec', 'Gestão'], ['page', 'Finanças']], done: 'hash:finance' },
    { id: 'caixa', pt: 'Abrir a caixa de entrada', steps: [['sec', 'Cockpit'], ['tab', /^Caixa de entrada/]], done: 'hash:inbox' },
    { id: 'mundo', pt: 'Ver o mundo (mapa)', steps: [['sec', 'Mundo'], ['page', 'Mundo']], done: 'hash:world' },
    { id: 'talentos', pt: 'Procurar talentos', steps: [['sec', 'Pessoas'], ['page', 'Talentos']], done: 'hash:market' },
    { id: 'calendario', pt: 'Ver o calendário', steps: [['sec', 'Gestão'], ['page', 'Calendário']], done: 'hash:calendar' },
    { id: 'noticias', pt: 'Ler notícias e boatos', steps: [['sec', 'Mundo'], ['page', 'Notícias e boatos']], done: 'hash:news|rumor|know' },
    { id: 'salvar', pt: 'Salvar o jogo com nome (Arquivo)', steps: [['btn', /Arquivo/], ['btn', /Salvar como novo/], ['dialog']], done: 'toast:Salvo' },
  ];
  const tasks = [];
  for (const tk of TASKS) {
    await p.evaluate(async () => { const M = window.__m31; M.clear(); document.querySelectorAll('.toast').forEach((e) => e.remove()); document.querySelector('nav .tree27-sec[data-sec25] .nav-head')?.click(); await M.frames(); const tb = [...document.querySelectorAll('[role=tab]')].find((x) => /^Painel/.test(x.textContent.trim()) && M.vis(x)); tb?.click(); await M.frames(); });
    await p.waitForTimeout(300);
    const t0 = Date.now();
    let clicks = 0, fail = '';
    const isDone = () => p.evaluate((done) => {
      const [k, re] = [done.slice(0, done.indexOf(':')), new RegExp(done.slice(done.indexOf(':') + 1), 'i')];
      if (k === 'hash') return re.test(decodeURIComponent(location.hash));
      if (k === 'toast') return [...document.querySelectorAll('.toast, [class*=toast]')].some((e) => re.test(e.textContent));
      if (k === 'overlay') return [...document.querySelectorAll('.overlay')].some((e) => re.test(e.textContent));
      return false;
    }, tk.done);
    const path = [];
    for (const [kind, arg] of tk.steps) {
      if (kind !== 'dialog' && kind !== 'btn' && kind !== 'myact' && clicks > 0 && await isDone()) break;
      if (kind === 'dialog') { clicks++; path.push('OK na janela do nome'); continue; } // aceito pelo p.on('dialog')
      // passo já satisfeito (a seção abriu direto nesta página/aba): não conta clique
      const r = await p.evaluate(async ([kind, src, flags]) => {
        const M = window.__m31;
        const re = src ? new RegExp(src, flags) : null;
        let el = null;
        const lbl = (x) => (x.querySelector('.lbl')?.textContent ?? x.textContent ?? '').trim().replace(/\s*\d+$/, '').slice(0, 40); // sem o contador do selo
        if (kind === 'sec') {
          el = [...document.querySelectorAll('nav .tree27-sec[data-sec25] .nav-head')].find((x) => x.querySelector('.lbl')?.textContent.trim() === src);
          if (el?.classList.contains('on')) return { skip: true }; // já está nesta seção (ex.: Cockpit)
        }
        else if (kind === 'page') {
          const all = [...document.querySelectorAll('nav li.tree27-page > .tree27-row button.tree27-pg')].filter((x) => x.querySelector('.lbl')?.textContent.trim() === src);
          el = all.find(M.vis) ?? null;
          if (!el && all.length) { // escondida num hub fechado: o clique no hub conta
            const hub = all[0].closest('li.tree27-hub');
            const hb = hub?.querySelector('button');
            if (hb && M.vis(hb)) { hb.click(); await M.frames(); el = [...document.querySelectorAll('nav li.tree27-page > .tree27-row button.tree27-pg')].find((x) => x.querySelector('.lbl')?.textContent.trim() === src && M.vis(x)); if (el) { if (el.classList.contains('on')) return { skip: true, extra: 1, label: `${lbl(hb)} (hub)` }; el.click(); await M.frames(); return { ok: true, extra: 1, label: `${lbl(hb)} (hub) › ${src}` }; } }
          }
          if (el?.classList.contains('on')) return { skip: true };
        } else if (kind === 'tab') {
          el = [...document.querySelectorAll('main [role=tab], [role=tab]')].find((x) => M.vis(x) && re.test(x.textContent.trim()));
          if (el && el.getAttribute('aria-selected') === 'true') return { skip: true };
        } else if (kind === 'btn') el = [...document.querySelectorAll('button, a')].find((x) => M.vis(x) && re.test(x.textContent.trim()));
        else if (kind === 'myact') {
          const util = await import('/src/sim/util.ts');
          const st = await import('/src/ui/store.ts');
          const names = util.playerActs(st.store.game).map((id) => st.store.game.acts[id]?.name).filter(Boolean);
          el = [...document.querySelectorAll('main *')].find((x) => M.vis(x) && x.children.length === 0 && names.includes(x.textContent.trim()));
        }
        if (!el) return { ok: false };
        const label = lbl(el);
        el.click(); await M.frames();
        return { ok: true, label };
      }, [kind, arg instanceof RegExp ? arg.source : arg, arg instanceof RegExp ? arg.flags : '']);
      if (r.skip) { path.push(`(${arg instanceof RegExp ? arg.source.replace(/[\^$]/g, '') : arg ?? kind}: já aberto)`); clicks += r.extra ?? 0; continue; }
      if (!r.ok) { fail = `passo não achado: ${kind} ${arg ?? ''}`; break; }
      clicks += 1 + (r.extra ?? 0);
      path.push(r.label);
      await p.waitForTimeout(250);
    }
    let ok = false;
    for (let i = 0; i < 20 && !ok && !fail; i++) { ok = await isDone(); if (!ok) await p.waitForTimeout(150); }
    tasks.push({ id: tk.id, task: tk.pt, clicks, ok, ms: Date.now() - t0, path: path.join(' → '), fail });
    console.log(`  tarefa ${tk.id}: ${ok ? 'ok' : 'NÃO CHEGOU'} ${clicks} cliques · ${path.join(' → ')}${fail ? ' · ' + fail : ''}`);
  }

  const result = {
    meta: { generatedBy: 'scripts/r31/measure-ui.mjs', when: new Date().toISOString(), viewport: '1360×900', browser: 'Chromium (Playwright)', months: MONTHS, game: info0, after: info12, bootMs, newGameMs },
    menuNew, menu12, weeks, months, saves, tasks, errors,
  };
  writeFileSync(`${outBase}-ui.json`, JSON.stringify(result, null, 1) + '\n');
  writeMd(result);
  console.log(`gravado ${outBase}-ui.json e seção da interface em ${outBase}.md`);
} finally {
  await b.close();
  stopVite();
}

function writeMd(r) {
  const L = [];
  const n = (x) => (x < 0 ? '—' : Math.round(x).toLocaleString('pt-BR'));
  const mean = (xs) => xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : -1;
  L.push(MARK_A, '', '## Interface (Playwright)', '');
  L.push(`Gerado por \`node scripts/r31/measure-ui.mjs\` (Chromium, ${r.meta.viewport}, pt-BR). Partida criada pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA,`,
    `configuração padrão: ${r.meta.game.role}, ${r.meta.game.year}); depois ${r.meta.months} meses jogados pelo robô dentro da página (fim: ${r.meta.after.month + 1}/${r.meta.after.year}, ${r.meta.after.acts} atos).`,
    'Tempos de relógio do clique até a tela pintada (dois quadros); variam com a máquina e a carga.', '');
  L.push(`- Abrir o jogo (até a tela inicial): **${n(r.meta.bootMs)} ms**; criar a partida (clique em COMEÇAR até o menu): **${n(r.meta.newGameMs)} ms**.`);
  const wk = r.weeks.filter((x) => x.ms >= 0), mo = r.months.filter((x) => x.ms >= 0);
  L.push(`- Virar uma semana (botão ▷ Semana): média **${n(mean(wk.map((x) => x.ms)))} ms** (${wk.map((x) => n(x.ms)).join(' / ')}; cliques ${wk.map((x) => x.clicks).join('/')}${wk.some((x) => !x.moved) ? '; alguma não avançou: ' + wk.filter((x) => !x.moved).map((x) => x.note).join('; ') : ''}).`);
  L.push(`- Virar um mês (botão ▶ Avançar mês): média **${n(mean(mo.map((x) => x.ms)))} ms** (${mo.map((x) => n(x.ms)).join(' / ')}; cliques ${mo.map((x) => x.clicks).join('/')}${mo.some((x) => !x.moved) ? '; algum não avançou: ' + mo.filter((x) => !x.moved).map((x) => x.note).join('; ') : ''}).`);
  const sv = r.saves.filter((x) => x.ok);
  L.push(`- Salvar (store.saveGame: serializar + gzip + IndexedDB): média **${n(mean(sv.map((x) => x.ms)))} ms** (${r.saves.map((x) => n(x.ms)).join(' / ')}); última divisão: serializar ${n(sv.at(-1)?.stringifyMs ?? -1)} ms, comprimir ${n(sv.at(-1)?.packMs ?? -1)} ms, gravar ${n(sv.at(-1)?.writeMs ?? -1)} ms; JSON ${((sv.at(-1)?.bytes ?? 0) / 1e6).toFixed(2).replace('.', ',')} MB → ${((sv.at(-1)?.packed ?? 0) / 1e6).toFixed(2).replace('.', ',')} MB.`);
  if (r.errors.length) L.push(`- Erros na página durante a medição: ${r.errors.length} (${[...new Set(r.errors)].slice(0, 3).join(' | ')}).`);
  L.push('', '### Tarefas comuns: cliques no percurso atual', '', 'Cada tarefa começa no Cockpit (Painel), sem janelas abertas. O percurso é o definido em `TASKS` no script.', '');
  L.push('| Tarefa | Cliques | Chegou | Tempo (ms) | Percurso |', '|---|---:|---|---:|---|');
  for (const t of r.tasks) L.push(`| ${t.task} | ${t.clicks} | ${t.ok ? 'sim' : 'não'} | ${n(t.ms)} | ${t.path.replace(/\|/g, '/')}${t.fail ? ` (${t.fail})` : ''} |`);
  const okT = r.tasks.filter((t) => t.ok);
  L.push('', `Total: ${okT.reduce((a, t) => a + t.clicks, 0)} cliques em ${okT.length} tarefas concluídas (média ${(okT.reduce((a, t) => a + t.clicks, 0) / Math.max(1, okT.length)).toFixed(1).replace('.', ',')}).`);
  L.push('', '### Seções do menu', '', `| Seção | 1ª abertura, jogo novo (ms) | 1ª abertura, ${r.meta.months} meses (ms) | Seguintes, ${r.meta.months} meses (ms) | Elementos na tela |`, '|---|---:|---:|---:|---:|');
  for (const s of r.menu12.sections) { const s0 = r.menuNew.sections.find((x) => x.sec === s.sec); L.push(`| ${s.sec} | ${n(s0?.first ?? -1)} | ${n(s.first)} | ${n(s.warm)} | ${n(s.nodes)} |`); }
  L.push('', '### Páginas do menu', '', `| Seção › Página | 1ª abertura, jogo novo (ms) | 1ª abertura, ${r.meta.months} meses (ms) | Seguintes, ${r.meta.months} meses (ms) | Elementos na tela |`, '|---|---:|---:|---:|---:|');
  const pages = [...r.menu12.pages, ...r.menuNew.pages.filter((x) => !r.menu12.pages.some((y) => y.id === x.id))];
  for (const pg of pages) { const p0 = r.menuNew.pages.find((x) => x.id === pg.id), p1 = r.menu12.pages.find((x) => x.id === pg.id); L.push(`| ${pg.sec} › ${pg.page} | ${n(p0?.first ?? -1)} | ${n(p1?.first ?? -1)} | ${n(p1?.warm ?? -1)} | ${n(p1?.nodes ?? p0?.nodes ?? -1)} |`); }
  const all = r.menu12.pages.filter((x) => x.first >= 0);
  const slow = [...all].sort((a, c) => c.first - a.first).slice(0, 5);
  L.push('', `Média da 1ª abertura de página (${r.meta.months} meses): **${n(mean(all.map((x) => x.first)))} ms** em ${all.length} páginas; mais lentas: ${slow.map((x) => `${x.page} (${n(x.first)} ms)`).join(', ')}.`, '', MARK_B);
  const md = `${outBase}.md`;
  let txt = existsSync(md) ? readFileSync(md, 'utf8') : '';
  const a = txt.indexOf(MARK_A), z = txt.indexOf(MARK_B);
  txt = a >= 0 && z > a ? txt.slice(0, a) + L.join('\n') + txt.slice(z + MARK_B.length) : `${txt.trimEnd()}\n\n${L.join('\n')}\n`;
  writeFileSync(md, txt);
}
