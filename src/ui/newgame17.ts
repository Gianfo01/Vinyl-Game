// Rodada 17 — Novo Jogo em passos claros (Mundo → Você → Empresa e carreira → Rivais → Regras → Resumo):
// predefinições, um só seletor de Mundo (junta modo/nomes reais/mortes reais/modo de história), ponto de partida +
// cenário histórico no próprio Novo Jogo, dificuldade detalhada, prazo, avisos de combinações, código de partida e
// a ficha COMPLETA do personagem ao vivo (simula o começo do jogo com as escolhas e mostra tudo o que você ganha).

import { formatMoney } from '../core/money';
import { SKILLS } from '../data/people';
import { l, type L } from '../data/world';
import { locale, t } from '../i18n/strings';
import { playerViews, polById, relById } from '../sim/beliefs';
import { perkEntries } from '../sim/perks';
import { DIFF17, PRESETS17, RUN_YEARS17, WORLDS17, applyPreset17, applyWorld17, notes17, rank17, readSetupCode17, setupCode17, worldOf17 } from '../sim/start17';
import { ATTR13, ATTR13_IDS, facetName, per13 } from '../sim/sys/persona13';
import { persona, skills as skillState } from '../sim/sys/persona';
import { lifestyleById, skillById } from '../sim/sys/persona/skills';
import { playerTraitById } from '../sim/sys/persona/data';
import { ownerOf } from '../sim/sys/people/owner';
import { playerPerson } from '../sim/sys/life';
import { scenarioById, SCENARIOS } from '../sim/sys/live';
import { scenario17 } from '../sim/sys/scenarios17';
import { runDone17, runEnd17 } from '../sim/sys/start17';
import { challengeScore } from '../sim/sys/live';
import type { GameState, RunConfig } from '../sim/types';
import { createGame } from '../sim/worldgen';
import { cityName, toast } from './common';
import { h, select } from './dom';
import { helpTip } from './newgame13';
import { registerCutscene } from './registry';
import { fxText } from './sys/persona';
import { copyText } from './store';
import { historyCard } from './history15';
import './start17.css';

// o cartão antigo "História dos artistas reais" virou parte do seletor Mundo
(historyCard as { hidden17?: boolean }).hidden17 = true;

const R = (k: string, v: L) => ({ [k]: v });
/** Ajudas "(?)" novas (mesmo formato do HELP da rodada 13). */
export const HELP17: Record<string, L> = {
  ...R('world17', l('Um seletor só para "quanto o mundo é real": junta os antigos Modo, Nomes reais, Mortes reais e Modo de história, que se sobrepunham. Cada opção mostra exatamente o que liga e desliga.', 'One selector for "how real the world is": merges the old Mode, Real names, Real deaths and History mode, which overlapped. Each option shows exactly what it turns on and off.')),
  ...R('start17', l('Do zero: pouco caixa, nenhum artista. Emergente: um artista contratado e caixa médio. Estabelecida: elenco, catálogo, equipe e custos maiores. Um cenário histórico define ano, cidade, elenco, meta com medalhas e regras especiais.', 'From zero: little cash, no acts. Emerging: one signed act and mid cash. Established: roster, catalog, staff and higher costs. A historical scenario sets year, city, roster, a medal goal and special rules.')),
  ...R('diff17', l('Ajuste fino por eixo, além da dificuldade geral. Cada passo mostra o efeito exato; ele aparece também nos detalhamentos "por quê" do jogo.', 'Fine-tune per axis, on top of the overall difficulty. Each step shows the exact effect, which also appears in the game\'s "why" breakdowns.')),
  ...R('run17', l('Sem fim: jogue quanto quiser. Com prazo: em dezembro do último ano o jogo soma legado, sucessos, certificações e festivais numa pontuação com patente (comparável entre prazos). Você pode continuar depois.', 'No end: play as long as you like. With a deadline: in December of the last year the game adds up legacy, hits, certifications and festivals into a score with a rank (comparable across lengths). You can keep playing after.')),
  ...R('preview17', l('O jogo simula o começo da partida com as suas escolhas (sem gravar nada) e mostra a ficha que você vai ter: atributos, personalidade, habilidades musicais, estilo de vida, dinheiro, reputação, crenças e TODOS os bônus ativos. ▲▼ marcam o que mudou na última escolha.', 'The game simulates the start of the run with your choices (saving nothing) and shows the sheet you will get: attributes, personality, music skills, lifestyle, money, reputation, beliefs and ALL active bonuses. ▲▼ mark what changed with your last choice.')),
  ...R('code17', l('Copie o código para um amigo jogar exatamente o mesmo começo (semente, mundo, regras e personagem), ou cole um código recebido.', 'Copy the code so a friend can play exactly the same start (seed, world, rules and character), or paste a code you received.')),
};

// ---------------------------------------------------------------- predefinições + código

export function presetBar17(cfg: RunConfig, rebuild: () => void): HTMLElement {
  return h('section', { class: 'card wide ng17-presets' },
    h('h3', null, t(l('Comece rápido', 'Quick start')), ' ', helpTip(l('Predefinições ajustam várias opções de uma vez (mundo, dificuldade, regras). Depois você pode mudar qualquer coisa nos passos abaixo.', 'Presets set many options at once (world, difficulty, rules). You can change anything afterwards in the steps below.'))),
    h('div', { class: 'ng17-preset-grid' }, ...PRESETS17.map((p) => h('button', { type: 'button', class: `pick ${cfg.preset17 === p.id ? 'on' : ''}`, 'aria-pressed': String(cfg.preset17 === p.id),
      onclick: () => { applyPreset17(cfg, p.id); rebuild(); toast(t(l('Predefinição "{n}" aplicada.', 'Preset "{n}" applied.'), { n: p.name }), 'good'); } },
      h('b', null, t(p.name)), h('small', null, t(p.desc))))),
    h('div', { class: 'row wrap ng17-code' },
      h('button', { type: 'button', class: 'btn small ghost', onclick: async () => { const c = setupCode17(cfg); const ok = await copyText(c); if (!ok) window.prompt(t(l('Copie o código:', 'Copy the code:')), c); else toast(t(l('Código da partida copiado.', 'Run code copied.')), 'good'); } }, '⎘ ', t(l('Copiar código desta partida', 'Copy this run\'s code'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => {
        const tx = window.prompt(t(l('Cole o código (MST17:...)', 'Paste the code (MST17:...)')));
        if (!tx) return;
        const c = readSetupCode17(tx);
        if (!c) return toast(t(l('Código inválido.', 'Invalid code.')), 'bad');
        for (const k of Object.keys(cfg)) delete (cfg as unknown as Record<string, unknown>)[k];
        Object.assign(cfg, c);
        rebuild();
        toast(t(l('Partida carregada do código.', 'Run loaded from the code.')), 'good');
      } }, '⇥ ', t(l('Colar código', 'Paste code'))),
      helpTip(HELP17.code17)),
  );
}

// ---------------------------------------------------------------- mundo

export function worldCard17(cfg: RunConfig, onChange: () => void): HTMLElement {
  if (!cfg.world17) cfg.world17 = worldOf17(cfg);
  const info = h('div', { class: 'ng17-world-info' });
  const adv = h('div', { class: 'ng17-adv' });
  const draw = () => {
    const w = WORLDS17.find((x) => x.id === worldOf17(cfg))!;
    info.replaceChildren(h('p', { class: 'small' }, t(w.desc)), h('p', { class: 'small good' }, t(w.fx)));
    adv.replaceChildren(
      h('label', null, t(l('Linha do tempo da tecnologia', 'Technology timeline')), ' ', helpTip('mode'), select(cfg.mode, [
        { value: 'historic', label: t(l('Datas reais fixas', 'Fixed real dates')) }, { value: 'free', label: t(l('Perto das datas reais (janela de anos)', 'Near the real dates (year window)')) }, { value: 'chaos', label: t(l('Sorteada (caos)', 'Rolled (chaos)')) },
      ] as { value: RunConfig['mode']; label: string }[], (v) => { cfg.mode = v; draw(); onChange(); })),
      ...(cfg.realNames && cfg.history !== 'free' ? [h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!cfg.realFates, onchange: (e: Event) => { cfg.realFates = (e.target as HTMLInputElement).checked; if (cfg.realFates) cfg.mode = 'historic'; draw(); onChange(); } }),
        t(l('Mortes nos anos reais (liga as datas fixas)', 'Deaths in their real years (turns on fixed dates)')), ' ', helpTip('realFates'))] : []),
    );
  };
  const sel = select(worldOf17(cfg), WORLDS17.map((w) => ({ value: w.id, label: `${t(w.name)}${w.isNew ? ` ★ ${t(l('novo', 'new'))}` : ''}` })), (v) => { applyWorld17(cfg, v); draw(); onChange(); });
  draw();
  return h('section', { class: 'card wide ng17-world' },
    h('h3', null, t(l('Quanto o mundo é real', 'How real the world is')), ' ', helpTip(HELP17.world17)),
    h('label', null, t(l('Mundo', 'World')), sel),
    info,
    h('details', null, h('summary', { class: 'small' }, t(l('Avançado', 'Advanced'))), adv));
}

// ---------------------------------------------------------------- ponto de partida + cenário histórico

const STARTS: { id: RunConfig['scenario']; name: L; fx: L }[] = [
  { id: 'from_zero', name: l('Do zero', 'From zero'), fx: l('Caixa pequeno, nenhum artista: você monta tudo. Mais difícil e mais seu.', 'Small cash, no acts: you build everything. Harder and more yours.') },
  { id: 'emerging', name: l('Selo emergente', 'Emerging label'), fx: l('Um artista contratado e caixa médio: começa com algo para lançar.', 'One signed act and mid cash: you start with something to release.') },
  { id: 'established', name: l('Empresa estabelecida', 'Established company'), fx: l('Três artistas, catálogo, equipe e custos fixos maiores: mais a perder.', 'Three acts, a catalog, staff and higher fixed costs: more to lose.') },
];

export function startCard17(cfg: RunConfig, rebuild: () => void, custom: HTMLElement): HTMLElement {
  const sc = cfg.scenario17 ? scenarioById[cfg.scenario17] : undefined;
  const x17 = scenario17(cfg.scenario17);
  const pick = select(cfg.scenario17 ?? '', [{ value: '', label: t(l('Nenhum — partida livre', 'None — free play')) },
    ...[...SCENARIOS].sort((a, b) => a.startYear - b.startYear).map((d) => ({ value: d.id, label: `${d.startYear}–${d.endYear} · ${t(d.name)}${scenario17(d.id) ? ' ★' : ''}` }))], (v) => {
    if (!v) delete cfg.scenario17;
    else { const d = scenarioById[v]; cfg.scenario17 = v; cfg.startYear = d.startYear; cfg.homeCity = d.homeCity; cfg.scenario = d.scenario; if (d.role) cfg.role = d.role; delete cfg.takeover; }
    rebuild();
  });
  return h('section', { class: 'card wide ng17-start' },
    h('h3', null, t(l('Ponto de partida', 'Starting point')), ' ', helpTip(HELP17.start17)),
    h('div', { class: 'ng17-start-grid' }, ...STARTS.map((s0) => h('label', { class: `radio pick ${cfg.scenario === s0.id ? 'on' : ''}` },
      h('input', { type: 'radio', name: 'st17', checked: cfg.scenario === s0.id, disabled: !!sc, onchange: () => { cfg.scenario = s0.id; rebuild(); } }),
      h('span', null, h('b', null, t(s0.name)), h('small', null, t(s0.fx)))))),
    h('label', null, t(l('Cenário histórico (opcional)', 'Historical scenario (optional)')), pick),
    sc ? h('div', { class: 'ng17-scen' },
      h('p', { class: 'small' }, h('b', null, `${sc.startYear} → ${sc.endYear} · ${cityName(sc.homeCity)}. `), t(sc.desc)),
      h('p', { class: 'small' }, h('b', null, t(l('Meta: ', 'Goal: '))), t(sc.goal), ` — 🥉 ${sc.tiers[0]} · 🥈 ${sc.tiers[1]} · 🥇 ${sc.tiers[2]} ${t(sc.unit)}`),
      x17 ? h('ul', { class: 'small' }, ...x17.rules17.map((r) => h('li', null, t(r)))) : null,
      h('p', { class: 'muted small' }, t(l('O cenário define ano, cidade e ponto de partida; o resto (você, mundo, regras) continua à sua escolha.', 'The scenario sets year, city and starting point; the rest (you, world, rules) is still up to you.')))) : null,
    h('details', { class: 'ng17-custom' }, h('summary', { class: 'small' }, t(l('Ajuste fino do começo (caixa, sede, elenco, equipe…)', 'Fine-tune the start (cash, HQ, roster, staff…)'))), custom),
  );
}

// ---------------------------------------------------------------- regras: dificuldade detalhada e prazo

export function diffCard17(cfg: RunConfig): HTMLElement {
  const d = (cfg.diff17 ??= {});
  return h('section', { class: 'card ng17-diff' },
    h('h3', null, t(l('Dificuldade detalhada', 'Detailed difficulty')), ' ', helpTip(HELP17.diff17)),
    ...DIFF17.map((ax) => {
      const out = h('small', { class: 'muted' }, t(ax.step(d[ax.id] ?? 0)));
      return h('label', { class: 'ng17-slider' }, h('span', null, t(ax.name), ' ', helpTip(ax.help)),
        h('input', { type: 'range', min: -2, max: 2, step: 1, value: d[ax.id] ?? 0, 'aria-label': t(ax.name), oninput: (e: Event) => { d[ax.id] = Number((e.target as HTMLInputElement).value); out.textContent = t(ax.step(d[ax.id]!)); } }),
        out);
    }),
    h('small', { class: 'muted' }, t(l('−2 = mais difícil · 0 = neutro · +2 = mais fácil.', '−2 = harder · 0 = neutral · +2 = easier.'))));
}

export function runCard17(cfg: RunConfig): HTMLElement {
  const note = h('small', { class: 'muted' });
  const draw = () => { const n = cfg.runYears17 ?? 0; note.textContent = n ? t(l('Termina em dezembro de {y}: pontuação, patente e cartão da partida. Dá para continuar jogando depois.', 'Ends in December {y}: score, rank and run card. You can keep playing afterwards.'), { y: cfg.startYear + n - 1 }) : t(l('Sem prazo: o jogo segue enquanto você (e seus herdeiros) quiserem.', 'No deadline: the game goes on as long as you (and your heirs) want.')); };
  draw();
  return h('section', { class: 'card ng17-run' },
    h('h3', null, t(l('Duração da partida', 'Run length')), ' ', helpTip(HELP17.run17)),
    h('label', null, t(l('Prazo', 'Deadline')), select(cfg.runYears17 ?? 0, RUN_YEARS17.map((n) => ({ value: n, label: n ? t(l('{n} anos, com pontuação', '{n} years, scored'), { n }) : t(l('Sem fim (sandbox)', 'Endless (sandbox)')) })), (v) => { cfg.runYears17 = v; draw(); })),
    note);
}

// ---------------------------------------------------------------- resumo: avisos e o que esperar

export function summaryExtra17(cfg: RunConfig): HTMLElement {
  const ns = notes17(cfg);
  const w = WORLDS17.find((x) => x.id === worldOf17(cfg))!;
  return h('div', { class: 'ng17-sum' },
    h('p', { class: 'small' }, h('b', null, t(l('Mundo: ', 'World: '))), t(w.name), ' — ', h('span', { class: 'muted' }, t(w.fx))),
    cfg.scenario17 && scenarioById[cfg.scenario17] ? h('p', { class: 'small' }, h('b', null, '🏅 '), t(scenarioById[cfg.scenario17].name), ': ', t(scenarioById[cfg.scenario17].goal)) : null,
    cfg.runYears17 ? h('p', { class: 'small' }, '⏱ ', t(l('Prazo: {n} anos (até {y}).', 'Deadline: {n} years (to {y}).'), { n: cfg.runYears17, y: cfg.startYear + cfg.runYears17 - 1 })) : null,
    ...ns.map((n) => h('p', { class: `small ${n.level === 'warn' ? 'warn' : 'muted'}` }, n.level === 'warn' ? '⚠ ' : 'ℹ ', t(n.text))),
  );
}

// ---------------------------------------------------------------- ficha completa ao vivo

type Sheet = Record<string, number | string>;
let lastSheet: Sheet | null = null;

function dryRun(cfg: RunConfig): GameState {
  const c = JSON.parse(JSON.stringify(cfg)) as RunConfig & { prehist?: number; world9?: unknown };
  c.dbSize = 'small';
  c.prehist = 0;
  delete c.world9;
  return createGame(c);
}

/** Painel "Tudo o que você ganha": recalcula (com atraso) quando algo muda dentro de `watch`. */
export function charPreview17(cfg: RunConfig, watch: HTMLElement): HTMLElement {
  const body = h('div', { class: 'ng17-prev-body' }, h('p', { class: 'muted small' }, t(l('Calculando…', 'Calculating…'))));
  const el = h('section', { class: 'card wide ng17-prev', 'aria-live': 'polite' },
    h('h3', null, t(l('Tudo o que você ganha com estas escolhas', 'Everything you gain from these choices')), ' ', helpTip(HELP17.preview17)), body);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    timer = null;
    if (!el.isConnected || (el.closest('[hidden]') && lastSheet)) return;
    try { body.replaceChildren(...renderSheet(dryRun(cfg))); } catch (e) { body.replaceChildren(h('p', { class: 'muted small' }, t(l('Prévia indisponível agora.', 'Preview unavailable right now.')))); console.warn(e); }
  };
  const soon = () => { if (timer) clearTimeout(timer); timer = setTimeout(run, 450); };
  for (const ev of ['input', 'change', 'click']) watch.addEventListener(ev, soon);
  setTimeout(run, 60);
  // ao voltar para a aba (mudanças feitas em outras abas também mudam a ficha)
  if (typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (!watch.hidden) soon(); }).observe(watch, { attributes: true, attributeFilter: ['hidden'] });
  (el as HTMLElement & { refresh17?: () => void }).refresh17 = soon;
  return el;
}

function renderSheet(g: GameState): HTMLElement[] {
  const o = ownerOf(g);
  const pp = playerPerson(g);
  const pe = persona(g);
  const sk = skillState(g);
  const p13 = per13(g, 'player');
  const v = playerViews(g);
  const sheet: Sheet = {};
  const prev = lastSheet;
  const mark = (k: string, val: number) => { sheet[k] = val; const p = prev?.[k]; return typeof p === 'number' && p !== val ? h('span', { class: val > p ? 'good' : 'bad' }, val > p ? ' ▲' : ' ▼') : null; };
  const row = (k: string, name: string, val: number, max = 100, title?: string) => h('div', { class: 'ng17-bar', title },
    h('span', null, name), h('span', { class: 'meter-bar' }, h('span', { style: `width:${Math.max(0, Math.min(100, (val / max) * 100))}%` })), h('b', null, String(Math.round(val))), mark(k, Math.round(val)));
  const money = (k: string, name: string, cents: number) => h('div', { class: 'ng17-kv' }, h('span', null, name), h('b', null, formatMoney(cents, locale())), mark(k, Math.round(cents / 100)));
  const perks = perkEntries(g).filter((e) => Object.values(e.values).some((x) => x));
  const music = pp ? SKILLS.filter((x) => (pp.skills as Record<string, number>)[x.id] !== undefined) : [];
  const out: HTMLElement[] = [
    h('div', { class: 'ng17-cols' },
      h('div', null, h('h4', null, t(l('Atributos', 'Attributes'))),
        ...(p13 ? ATTR13_IDS.map((k) => row(`a:${k}`, t(ATTR13[k][0]), p13.attrs[k], 100, t(ATTR13[k][1]))) : (['ear', 'negotiation', 'charisma', 'management'] as const).map((k) => row(`a:${k}`, k, o.attrs[k])))),
      h('div', null, h('h4', null, t(l('Habilidades musicais', 'Music skills'))),
        ...music.map((x) => row(`m:${x.id}`, t(x.name), (pp!.skills as Record<string, number>)[x.id]))),
      h('div', null, h('h4', null, t(l('Dinheiro e posição', 'Money and standing'))),
        money('cash', t(l('Caixa da empresa', 'Company cash')), g.player.cash),
        money('wealth', t(l('Patrimônio pessoal', 'Personal wealth')), o.wealth),
        g.player.loans.length ? money('debt', t(l('Dívidas', 'Debts')), -g.player.loans.reduce((s0, x) => s0 + x.balance, 0)) : null,
        row('rep:i', t(l('Reputação institucional', 'Institutional reputation')), g.player.reputation.institutional),
        row('rep:a', t(l('Reputação com artistas', 'Reputation with artists')), g.player.reputation.artists),
        h('div', { class: 'ng17-kv' }, h('span', null, t(l('Idade', 'Age'))), h('b', null, String(g.year - o.born)), mark('age', g.year - o.born)),
        h('div', { class: 'ng17-kv' }, h('span', null, t(l('Elenco no começo', 'Roster at start'))), h('b', null, String(Object.values(g.acts).filter((a) => a.owner === 'player').length)))),
    ),
    h('div', { class: 'ng17-cols' },
      h('div', null, h('h4', null, t(l('Personalidade', 'Personality'))),
        h('p', { class: 'small' }, ...(pe.traits.length ? pe.traits.map((x) => h('span', { class: 'tag' }, t(playerTraitById[x]?.name))) : [h('span', { class: 'muted' }, '—')])),
        p13?.traits.length ? h('p', { class: 'small' }, t(l('Temperamento: ', 'Temperament: ')), p13.traits.map((x) => t(facetName(x.k, x.hi))).join(', ')) : null,
        h('p', { class: 'small' }, t(l('Crenças: ', 'Beliefs: ')), `${t(polById[v.pol]?.name)} · ${t(relById[v.rel]?.name)}`)),
      h('div', null, h('h4', null, t(l('Habilidades e estilo de vida', 'Abilities and lifestyle'))),
        h('p', { class: 'small' }, (sk.owned ?? []).map((id) => t(skillById[id]?.name)).join(', ') || '—'),
        h('p', { class: 'small' }, t(l('Estilo de vida: ', 'Lifestyle: ')), h('b', null, sk.lifestyle ? t(lifestyleById[sk.lifestyle].name) : '—'), sk.lifestyle ? h('span', { class: 'muted' }, ` — ${t(lifestyleById[sk.lifestyle].desc)}`) : null),
        h('p', { class: 'small muted' }, t(l('Pontos de habilidade guardados: {n}', 'Saved ability points: {n}'), { n: sk.points })), mark('pts', sk.points)),
    ),
    h('div', null, h('h4', null, t(l('Bônus ativos no começo ({n})', 'Active bonuses at the start ({n})'), { n: perks.length })),
      perks.length ? h('ul', { class: 'small ng17-perks' }, ...perks.map((e) => h('li', null, h('b', null, t(e.label)), ': ', fxText(e.values) || '—', e.act ? h('span', { class: 'muted' }, ` (${t(l('só alguns atos', 'some acts only'))})`) : null)))
        : h('p', { class: 'muted small' }, '—')),
  ];
  lastSheet = sheet;
  return out;
}

// ---------------------------------------------------------------- resultado do prazo (cena) e cartão da partida

registerCutscene('run17Result', (s, cs, close) => {
  const d = cs.data as { score: number; years: number };
  return h('div', { class: 'lv-result' },
    h('div', { class: 'lv-medal gold', 'aria-hidden': 'true' }, '🏁'),
    h('h3', null, t(rank17(d.score, d.years))),
    runCard17body(s),
    h('p', { class: 'small' }, t(l('Você pode continuar jogando livremente.', 'You can keep playing freely.'))),
    h('button', { class: 'btn primary', onclick: close }, t(l('Continuar', 'Continue'))));
});

/** Cartão da partida (resumo compartilhável): também abre pelo menu de configurações. */
export function runCard17body(s: GameState): HTMLElement {
  const done = runDone17(s);
  const score = done?.score ?? challengeScore(s);
  const years = done?.years ?? Math.max(1, s.year - s.config.startYear + 1);
  const p = s.player;
  const o = ownerOf(s);
  const end = runEnd17(s);
  const lines = [
    `${s.config.companyName} — ${o.name}`,
    `${s.config.startYear}–${s.year} · ${cityName(s.config.homeCity)}`,
    `${t(l('Pontos', 'Points'))}: ${score} · ${t(rank17(score, years))}`,
    `#1: ${p.stats.number1s} · Top 10: ${p.stats.top10s} · ${t(l('Ouro/platina', 'Gold/platinum'))}: ${p.stats.gold}/${p.stats.platinum}`,
    `${t(l('Caixa', 'Cash'))}: ${formatMoney(p.cash, locale())}`,
  ];
  const text = `🎛 Masters\n${lines.join('\n')}\n${t(l('Semente', 'Seed'))}: ${s.config.seed}`;
  return h('div', { class: 'ng17-runcard' },
    h('pre', { class: 'small' }, text),
    end && !done ? h('p', { class: 'small muted' }, t(l('Prazo: dezembro de {y}.', 'Deadline: December {y}.'), { y: end })) : null,
    h('button', { class: 'btn small', onclick: async () => { const ok = await copyText(text); toast(ok ? t(l('Cartão copiado.', 'Card copied.')) : t(l('Não deu para copiar.', 'Could not copy.')), ok ? 'good' : 'bad'); } }, t(l('Copiar cartão', 'Copy card'))));
}
