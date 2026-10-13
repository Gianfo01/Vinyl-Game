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
import { DIFF17, PRESETS17, RUN_YEARS17, WORLDS17, applyPreset17, applyWorld17, codeStatus20, newRunConfig20, notes17, presetDiff20, rank17, readSetupCode17, resolveWorld20, setupCode17, setupCodeError20, world17ById, worldOf17 } from '../sim/start17';
import { ATTR13, ATTR13_IDS, facetName, per13 } from '../sim/sys/persona13';
import { persona } from '../sim/sys/persona';
import { playerTraitById } from '../sim/sys/persona/data';
import { ownerOf } from '../sim/sys/people/owner';
import { playerPerson } from '../sim/sys/life';
import { scenarioById } from '../sim/sys/live';
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
  ...R('preview17', l('O jogo simula o começo da partida com as suas escolhas (sem gravar nada e com uma população simplificada) e mostra a ficha do seu personagem: atributos, personalidade, habilidades musicais, estilo de vida, dinheiro, reputação, crenças e TODOS os bônus ativos. ▲▼ marcam o que mudou na última escolha.', 'The game simulates the start of the run with your choices (saving nothing, with a simplified population) and shows your character sheet: attributes, personality, music skills, lifestyle, money, reputation, beliefs and ALL active bonuses. ▲▼ mark what changed with your last choice.')),
  ...R('code17', l('Copie o código para um amigo jogar exatamente o mesmo começo (semente, mundo, regras e personagem), ou cole um código recebido.', 'Copy the code so a friend can play exactly the same start (seed, world, rules and character), or paste a code you received.')),
};

// ---------------------------------------------------------------- predefinições + código

/** r20 (G8): último estado do rascunho antes de aplicar uma predefinição (para "Desfazer" no próprio rascunho). */
let undo20: string | null = null;
const PKEY20: Record<string, L> = {
  world17: l('mundo', 'world'), realNames: l('mundo', 'world'), history: l('mundo', 'world'), mode: l('mundo', 'world'), realFates: l('mundo', 'world'), snap17: l('mundo', 'world'),
  difficulty: l('dificuldade', 'difficulty'), diff17: l('dificuldade detalhada', 'detailed difficulty'), ironman: l('Ironman', 'Ironman'), runYears17: l('prazo', 'deadline'),
  storyteller: l('narrador', 'storyteller'), freedom17: l('liberdade do diretor', 'director freedom'), mutators: l('modificadores', 'mutators'),
  dbSize: l('tamanho da base', 'database size'), scenario: l('ponto de partida', 'starting point'), custom: l('ajuste fino do começo', 'start fine-tuning'),
};
/** Grupos (sem repetição) que uma lista de campos representa. */
export function groups20(keys: string[]): string {
  return [...new Set(keys.map((k) => PKEY20[k]).filter(Boolean).map((x) => t(x)))].join(', ');
}

export function presetBar17(cfg: RunConfig, rebuild: () => void): HTMLElement {
  const origin = cfg.preset17 ? PRESETS17.find((p) => p.id === cfg.preset17) : undefined;
  const changed = origin ? presetDiff20(cfg, origin.id) : [];
  return h('section', { class: 'card wide ng17-presets' },
    h('h3', null, t(l('Atalhos de configuração', 'Configuration shortcuts')), ' ', helpTip(l('Uma predefinição ajusta várias coisas de uma vez (mundo, dificuldade, regras). O MODO de mundo, logo abaixo, é o que define a política do mundo. Depois você pode mudar qualquer coisa; nome, semente e personagem não são apagados.', 'A preset sets many things at once (world, difficulty, rules). The world MODE, below, is what defines the world policy. You can change anything afterwards; name, seed and character are never wiped.'))),
    origin ? h('p', { class: 'small' }, changed.length
      ? h('span', null, h('span', { class: 'ng20-badge' }, t(l('Personalizado', 'Custom'))), ' ', t(l('a partir de "{p}" — mudou: {g}.', 'from "{p}" — changed: {g}.'), { p: t(origin.name), g: groups20(changed) || '—' }))
      : h('span', { class: 'muted' }, t(l('Usando a predefinição "{p}".', 'Using the "{p}" preset.'), { p: t(origin.name) }))) : null,
    h('div', { class: 'ng17-preset-grid' }, ...PRESETS17.map((p) => h('button', { type: 'button', class: `pick ${cfg.preset17 === p.id ? 'on' : ''}`, 'aria-pressed': String(cfg.preset17 === p.id), title: t(p.desc),
      onclick: () => {
        const diff = presetDiff20(cfg, p.id);
        undo20 = JSON.stringify(cfg);
        applyPreset17(cfg, p.id);
        rebuild();
        toast(diff.length ? t(l('"{n}" aplicada — substituiu: {g}. Use "Desfazer" no topo para voltar.', '"{n}" applied — replaced: {g}. Use "Undo" at the top to go back.'), { n: p.name, g: groups20(diff) || '—' }) : t(l('Predefinição "{n}" aplicada.', 'Preset "{n}" applied.'), { n: p.name }), 'good');
      } },
      h('b', null, t(p.name)), h('small', null, t(p.desc))))),
    undo20 ? h('div', { class: 'row wrap ng17-code' }, h('button', { type: 'button', class: 'btn small ghost', onclick: () => {
      if (!undo20) return;
      const prev = JSON.parse(undo20) as RunConfig;
      undo20 = null;
      for (const k of Object.keys(cfg)) delete (cfg as unknown as Record<string, unknown>)[k];
      Object.assign(cfg, prev);
      rebuild();
      toast(t(l('Predefinição desfeita: o rascunho voltou ao que era.', 'Preset undone: the draft is back to what it was.')), 'good');
    } }, '↶ ', t(l('Desfazer a última predefinição', 'Undo the last preset')))) : null,
  );
}

/** r20: copiar o código desta configuração (fica na Revisão). */
export function copyCode20(cfg: RunConfig): HTMLElement {
  return h('div', { class: 'row wrap ng17-code' },
    h('button', { type: 'button', class: 'btn small ghost', onclick: async () => { const c = setupCode17(cfg); const ok = await copyText(c); if (!ok) window.prompt(t(l('Copie o código:', 'Copy the code:')), c); else toast(t(l('Código da partida copiado.', 'Run code copied.')), 'good'); } }, '⎘ ', t(l('Copiar código desta partida', 'Copy this run\'s code'))),
    helpTip(HELP17.code17));
}

/** r20: "Restaurar padrão" explícito: volta à fábrica, mantendo nome, semente e personagem (com desfazer no rascunho). */
export function restoreDefault20(cfg: RunConfig, rebuild: () => void): HTMLElement {
  return h('button', { type: 'button', class: 'btn small ghost', onclick: () => {
    undo20 = JSON.stringify(cfg);
    const keep = { seed: cfg.seed, companyName: cfg.companyName, character: cfg.character };
    const d = newRunConfig20({ seed: keep.seed, companyName: keep.companyName });
    for (const k of Object.keys(cfg)) delete (cfg as unknown as Record<string, unknown>)[k];
    Object.assign(cfg, d, keep.character ? { character: keep.character } : {});
    rebuild();
    toast(t(l('Padrão restaurado (nome, semente e personagem mantidos). "Desfazer" no topo volta ao rascunho anterior.', 'Default restored (name, seed and character kept). "Undo" at the top brings back the previous draft.')), 'good');
  } }, '⟲ ', t(l('Restaurar padrão', 'Restore default')));
}

/** r20: "Usar código de run" — valida ANTES de tocar no rascunho; o código mantém a própria configuração (sem o padrão novo por cima). */
export function pasteCode20(cfg: RunConfig, after: () => void): void {
  const tx = window.prompt(t(l('Cole o código (MST17:...)', 'Paste the code (MST17:...)')));
  if (!tx) return;
  const c = readSetupCode17(tx);
  if (!c) return void toast(setupCodeError20(tx) === 'future' ? t(l('Código de uma versão mais nova do jogo: atualize para usá-lo. Seu rascunho não mudou.', 'Code from a newer game version: update to use it. Your draft did not change.')) : t(l('Código inválido. Seu rascunho não mudou.', 'Invalid code. Your draft did not change.')), 'bad');
  undo20 = JSON.stringify(cfg);
  for (const k of Object.keys(cfg)) delete (cfg as unknown as Record<string, unknown>)[k];
  Object.assign(cfg, c);
  after();
  toast(codeStatus20(c) === 'legacy' ? t(l('Código antigo carregado com as regras originais (configuração legada). Confira a revisão.', 'Old code loaded with its original rules (legacy configuration). Check the review.')) : t(l('Configuração carregada do código. Confira a revisão.', 'Configuration loaded from the code. Check the review.')), 'good');
}

// ---------------------------------------------------------------- mundo

/** Contrato de cada modo em 5 dimensões (Comparar modos). */
const DIM20: { k: string; name: L; v: Record<string, L> }[] = [
  { k: 'id', name: l('Nomes', 'Names'), v: { random: l('reais', 'real'), exact: l('reais', 'real'), real: l('reais', 'real'), snap: l('reais', 'real'), fiction: l('inventados', 'invented'), chaos: l('reais', 'real') } },
  { k: 'start', name: l('Começo', 'Start'), v: { random: l('simulado', 'simulated'), exact: l('histórico', 'historical'), real: l('histórico', 'historical'), snap: l('histórico', 'historical'), fiction: l('arquétipos históricos', 'historical archetypes'), chaos: l('histórico embaralhado', 'shuffled history') } },
  { k: 'after', name: l('Depois', 'After'), v: { random: l('simulado', 'simulated'), exact: l('roteiro documentado', 'documented script'), real: l('simulado', 'simulated'), snap: l('simulado', 'simulated'), fiction: l('simulado', 'simulated'), chaos: l('simulado', 'simulated') } },
  { k: 'debut', name: l('Estreias futuras', 'Future debuts'), v: { random: l('reais, perto da época', 'real, near their era'), exact: l('reais, nas datas', 'real, on their dates'), real: l('reais, perto da época', 'real, near their era'), snap: l('só artistas novos', 'new acts only'), fiction: l('inventadas', 'invented'), chaos: l('3/4 surgem, datas soltas', '3/4 appear, loose dates') } },
  { k: 'tech', name: l('Tecnologia', 'Technology'), v: { random: l('perto das datas reais', 'near real dates'), exact: l('datas reais fixas', 'fixed real dates'), real: l('perto das datas reais', 'near real dates'), snap: l('perto das datas reais', 'near real dates'), fiction: l('perto das datas reais', 'near real dates'), chaos: l('sorteada', 'rolled') } },
];

/** O que cada modo deixa real e o que simula (aparece ao escolher, sem abrir ajuda). */
const EXPLAIN20: Record<string, [L, L][]> = {
  random: [[l('Real', 'Real'), l('os nomes e as referências de identidade (origem, nascimento, época de estreia, talento).', 'names and identity references (origin, birth, debut era, talent).')],
    [l('Simulado', 'Simulated'), l('catálogo, contratos, vínculos, sucesso e trajetória — já no começo.', 'catalog, contracts, ties, success and career — already at the start.')],
    [l('Época coerente', 'Coherent era'), l('não é Caos; tecnologia e disponibilidade seguem as regras do período.', 'not Chaos; technology and availability follow the period\'s rules.')]],
  exact: [[l('Roteiro', 'Script'), l('eventos documentados seguem o roteiro. Intervenções suas podem alterar carreiras.', 'documented events follow the script. Your interventions can change careers.')],
    [l('Cobertura', 'Coverage'), l('conforme a base histórica: fatos documentados até 2025; o que é conhecido só pelo ano não é dia exato.', 'as far as the database covers: documented facts up to 2025; things known only by year are not exact days.')]],
  real: [[l('Até o começo', 'Until the start'), l('a história é real até o começo.', 'history is real until the start.')], [l('Depois', 'After'), l('a simulação assume.', 'the simulation takes over.')]],
  snap: [[l('Até o começo', 'Until the start'), l('o mundo é o real.', 'the world is the real one.')], [l('Depois', 'After'), l('nenhum artista real estreia: os próximos ídolos serão novos.', 'no real act debuts: the next idols will be new.')]],
  fiction: [[l('Nomes', 'Names'), l('artistas e empresas inventados, com a mesma profundidade.', 'invented acts and companies, with the same depth.')]],
  chaos: [[l('Escolha explícita', 'Explicit choice'), l('a história e a tecnologia podem seguir outra ordem.', 'history and technology may follow another order.')]],
};

const nn20 = (...xs: (HTMLElement | null)[]): HTMLElement[] => xs.filter((x): x is HTMLElement => !!x);

export function worldCard17(cfg: RunConfig, onChange: () => void, rebuild?: () => void): HTMLElement {
  if (!cfg.world17) cfg.world17 = worldOf17(cfg);
  const info = h('div', { class: 'ng17-world-info', 'aria-live': 'polite' });
  const adv = h('div', { class: 'ng17-adv' });
  const list = h('div', { class: 'ng20-modes' });
  const draw = () => {
    const rs = resolveWorld20(cfg);
    const w = world17ById[rs.id];
    list.replaceChildren(...WORLDS17.map((x) => h('label', { class: `ng20-mode ${x.id === rs.id ? 'on' : ''}` },
      h('input', { type: 'radio', name: 'world20', value: x.id, checked: x.id === rs.id, onchange: () => { applyWorld17(cfg, x.id); draw(); onChange(); } }),
      h('span', null, h('b', null, t(x.name), x.id === 'random' ? h('span', { class: 'ng20-badge' }, t(l('PADRÃO', 'DEFAULT'))) : null), h('small', null, t(x.short ?? x.desc))))));
    const legacy = rs.id === 'random' && codeStatus20(cfg) === 'legacy';
    info.replaceChildren(...nn20(
      rs.custom ? h('p', { class: 'small warn' }, h('span', { class: 'ng20-badge' }, t(l('Personalizado', 'Custom'))), ' ', t(l('Ajustes avançados mudaram: {d}. O motor vai rodar exatamente isto.', 'Advanced tweaks changed: {d}. The engine will run exactly this.'), { d: rs.diffL.map((x) => t(x)).join(', ') }), ' ',
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => { applyWorld17(cfg, rs.id); draw(); onChange(); } }, t(l('Restaurar o modo', 'Restore the mode')))) : null,
      legacy ? h('p', { class: 'small warn' }, t(l('Configuração legada (código/save antigo): começo pela base histórica.', 'Legacy configuration (old code/save): start from the historical base.')), ' ',
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => { applyWorld17(cfg, 'random'); draw(); onChange(); } }, t(l('Adaptar ao novo padrão', 'Adapt to the new default')))) : null,
      h('dl', { class: 'ng20-explain' }, ...(EXPLAIN20[rs.id] ?? []).flatMap(([k, v]) => [h('dt', null, t(k)), h('dd', null, t(v))])),
      h('p', { class: 'small muted' }, t(w.desc))));
    const exact = rs.id === 'exact';
    adv.replaceChildren(...nn20(
      h('label', null, t(l('Linha do tempo da tecnologia', 'Technology timeline')), ' ', helpTip('mode'), select(cfg.mode, [
        { value: 'historic', label: t(l('Datas reais fixas', 'Fixed real dates')) }, { value: 'free', label: t(l('Perto das datas reais (janela de anos)', 'Near the real dates (year window)')) }, { value: 'chaos', label: t(l('Sorteada (caos)', 'Rolled (chaos)')) },
      ] as { value: RunConfig['mode']; label: string }[], (v) => { cfg.mode = v; draw(); onChange(); }, exact ? { disabled: true } : undefined)),
      exact ? h('small', { class: 'muted' }, t(l('Bloqueado na Fidelidade histórica: o roteiro documentado exige as datas reais. Para outra linha do tempo, escolha outro modo.', 'Locked in Historical fidelity: the documented script requires the real dates. For another timeline, pick another mode.'))) : null,
      ...(cfg.realNames && cfg.history !== 'free' && !exact ? [h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!cfg.realFates, onchange: (e: Event) => { cfg.realFates = (e.target as HTMLInputElement).checked; if (cfg.realFates) cfg.mode = 'historic'; draw(); onChange(); } }),
        t(l('Mortes nos anos reais (liga as datas fixas)', 'Deaths in their real years (turns on fixed dates)')), ' ', helpTip('realFates'))] : []),
    ));
  };
  draw();
  void rebuild;
  return h('section', { class: 'card wide ng17-world' },
    h('fieldset', { class: 'ng20-fs' }, h('legend', null, h('h3', null, t(l('Qual mundo você quer?', 'Which world do you want?')), ' ', helpTip(HELP17.world17))), list),
    info,
    h('details', null, h('summary', { class: 'small' }, t(l('Comparar modos', 'Compare modes'))),
      h('div', { class: 'ng20-cmp' }, h('table', { class: 'small' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, t(l('Modo', 'Mode'))), ...DIM20.map((d) => h('th', { scope: 'col' }, t(d.name))))),
        h('tbody', null, ...WORLDS17.map((x) => h('tr', null, h('th', { scope: 'row' }, t(x.name)), ...DIM20.map((d) => h('td', null, t(d.v[x.id]))))))))),
    h('details', null, h('summary', { class: 'small' }, t(l('Avançado: tecnologia e mortes reais', 'Advanced: technology and real deaths'))), adv));
}

// ---------------------------------------------------------------- ponto de partida + cenário histórico

const STARTS: { id: RunConfig['scenario']; name: L; fx: L }[] = [
  { id: 'from_zero', name: l('Do zero', 'From zero'), fx: l('Caixa pequeno, nenhum artista: você monta tudo. Mais difícil e mais seu.', 'Small cash, no acts: you build everything. Harder and more yours.') },
  { id: 'emerging', name: l('Selo emergente', 'Emerging label'), fx: l('Um artista contratado e caixa médio: começa com algo para lançar.', 'One signed act and mid cash: you start with something to release.') },
  { id: 'established', name: l('Empresa estabelecida', 'Established company'), fx: l('Três artistas, catálogo, equipe e custos fixos maiores: mais a perder.', 'Three acts, a catalog, staff and higher fixed costs: more to lose.') },
];

/** r22: cenários são uma modalidade à parte (tela inicial); aqui só o ponto de partida da run livre. */
export function startCard17(cfg: RunConfig, rebuild: () => void, custom: HTMLElement): HTMLElement {
  return h('section', { class: 'card wide ng17-start' },
    h('h3', null, t(l('Ponto de partida', 'Starting point')), ' ', helpTip(HELP17.start17)),
    h('div', { class: 'ng17-start-grid' }, ...STARTS.map((s0) => h('label', { class: `radio pick ${cfg.scenario === s0.id ? 'on' : ''}` },
      h('input', { type: 'radio', name: 'st17', checked: cfg.scenario === s0.id, onchange: () => { cfg.scenario = s0.id; rebuild(); } }),
      h('span', null, h('b', null, t(s0.name)), h('small', null, t(s0.fx)))))),
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
    // r20: conflitos (atenção) separados das informações
    ns.some((n) => n.level === 'warn') ? h('div', { class: 'ng20-notes warn', role: 'group', 'aria-label': t(l('Atenção', 'Attention')) }, h('b', { class: 'small' }, '⚠ ', t(l('Atenção', 'Attention'))),
      ...ns.filter((n) => n.level === 'warn').map((n) => h('p', { class: 'small' }, t(n.text)))) : null,
    ns.some((n) => n.level !== 'warn') ? h('div', { class: 'ng20-notes', role: 'group', 'aria-label': t(l('Para saber', 'Good to know')) }, h('b', { class: 'small muted' }, 'ℹ ', t(l('Para saber', 'Good to know'))),
      ...ns.filter((n) => n.level !== 'warn').map((n) => h('p', { class: 'small muted' }, t(n.text)))) : null,
  );
}

/** r20: frase do contrato efetivo de realidade/aleatoriedade (resumo e barra). */
export function policyLine20(cfg: RunConfig): string {
  const rs = resolveWorld20(cfg);
  const legacy = codeStatus20(cfg) === 'legacy';
  const base = rs.id === 'random' ? (legacy ? l('Configuração legada: começo pela base histórica', 'Legacy configuration: start from the historical base') : l('Repertórios e vínculos iniciais simulados', 'Starting repertoire and ties simulated'))
    : rs.id === 'exact' ? l('Roteiro documentado (conforme a cobertura da base)', 'Documented script (as far as the database covers)')
      : rs.id === 'fiction' ? l('Nomes inventados', 'Invented names')
        : rs.id === 'chaos' ? l('História e tecnologia embaralhadas', 'History and technology shuffled')
          : rs.id === 'snap' ? l('Base real; sem estreias reais depois', 'Real base; no real debuts after') : l('Real até o início; depois simulado', 'Real until the start; simulated after');
  return t(base) + (rs.custom ? ` · ${t(l('Personalizado', 'Custom'))}` : '');
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
    h('h3', null, t(l('Prévia rápida: o que você ganha com estas escolhas', 'Quick preview: what you gain from these choices')), ' ', helpTip(HELP17.preview17)),
    h('p', { class: 'small muted' }, t(l('Prévia rápida, não o estado final: calculada com população simplificada (base pequena, sem história prévia). Sua ficha, dinheiro e bônus batem com o começo; elenco, catálogo e rivais do mundo podem ser outros.', 'Quick preview, not the final state: computed with a simplified population (small database, no prior history). Your sheet, money and bonuses match the start; the world\'s roster, catalog and rivals may differ.'))),
    body);
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
        h('p', { class: 'small' }, t(l('Crenças: ', 'Beliefs: ')), `${t(polById[v.pol]?.name)} · ${t(relById[v.rel]?.name)}`))
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
