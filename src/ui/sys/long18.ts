// Rodada 18 (long18) — interface: três perguntas no Cockpit, área "Rumo do selo" (caminhos de vitória, doutrinas e
// decisões do selo, políticas de delegação, post-mortems, ano em revista, biografia, Casa/dinastia, dificuldade
// adaptativa) e a cena de dezembro "Ano em revista".

import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { GOAL18, pol18, burn18, type Goal18 } from '../../sim/sys/policy18';
import { rv18 } from '../../sim/sys/review18';
import {
  DOCTRINES18, LABEL_DECS18, PATHS18, adoptDoc18, allScores18, bigDecisions18, bigTaken18, choosePath18, docBlock18, hasDoc18, labelDecBlock18, legacy18,
  mainPath18, pa18, pathDef18, pathEnding18, pathScore18, pinPath18, revokeDoc18, takeLabelDec18, tierOf, type PathId,
} from '../../sim/sys/paths18';
import { decisionBlocker, takeDecision } from '../../sim/sys/intrigue';
import { MANDATES18, adaptRead18, bio18, cockpit18, setAdapt18, sg18, yearCard18, type Q18, type Year18 } from '../../sim/sys/saga18';
import { rngOf } from '../../sim/util';
import { rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerArea, registerCutscene, registerSection } from '../registry';
import { ic, tabs } from '../vis';
import { go18 } from './inbox18';
import './long18.css';

const usd = (s: GameState, c: number) => `$${Math.round(toReal(c, s.year)).toLocaleString('en-US')}`;
const fmtK = (v: number, f: string) => (f === 'usd' ? `$${Math.round(v).toLocaleString('en-US')}` : f === 'pct' ? `${Math.round(v)}%` : f === 'mo' ? `${v.toFixed(1)} m` : `${Math.round(v * 10) / 10}`);
const bar = (v: number) => h('span', { class: 'lg18-bar' }, h('i', { style: `width:${Math.max(0, Math.min(100, v))}%` }));
const msg = (x: L | null, ok: L) => { toast(t(x ?? ok), x ? 'bad' : 'good'); rerender(); };

// ---------------------------------------------------------------- Cockpit: três perguntas

function qList(title: L, icon: string, qs: Q18[]): HTMLElement {
  return h('div', { class: 'lg18-q' }, h('h4', null, ic(icon), ' ', t(title)),
    h('ul', null, qs.slice(0, 5).map((q) => h('li', { class: `lg18-${q.tone}` }, t(q.t), q.goto ? h('button', { class: 'btn small ghost', onclick: () => go18(q.goto!) }, '›') : null))));
}
registerSection('desk', { id: 'long18-3q', order: 1, render: (s) => {
  const c = cockpit18(s);
  return h('section', { class: 'card lg18-3q' },
    qList(l('O que precisa da minha decisão agora?', 'What needs my decision now?'), 'calendar', c.now),
    qList(l('O que está funcionando ou falhando?', 'What is working or failing?'), 'chart-up', c.works),
    qList(l('O que ameaça os próximos meses?', 'What threatens the coming months?'), 'skull', c.threats));
} });

// ---------------------------------------------------------------- abas

function pathsTab(s: GameState): HTMLElement {
  const P = pa18(s), m = mainPath18(s), L18 = legacy18(s);
  return h('div', null,
    h('p', { class: 'muted' }, t(l('Há várias formas de vencer. Escolha um caminho (ou deixe o jogo detectar o mais forte) e fixe até 3 como metas ativas: marcos de metas ativas valem 50% a mais de legado.', 'There are many ways to win. Pick a path (or let the game detect the strongest) and pin up to 3 as active goals: active-goal milestones are worth 50% more legacy.'))),
    h('p', null, h('b', null, t(l('Legado por caminhos: ', 'Path legacy: '))), String(L18.total), ' · ', t(l('Principal: ', 'Main: ')), m ? t(pathDef18(m)!.name) : '—', P.chosen ? '' : t(l(' (detectado)', ' (detected)'))),
    h('div', { class: 'lg18-grid' }, allScores18(s).map(({ id, score }) => {
      const d = pathDef18(id)!, sc = pathScore18(s, id), tier = tierOf(score);
      return h('div', { class: `card lg18-path ${id === m ? 'main' : ''}` },
        h('h4', null, ic(d.icon), ' ', t(d.name), ' ', h('small', null, `${score}/100`)), bar(score),
        h('p', { class: 'small muted' }, t(d.desc)),
        h('ul', { class: 'lg18-kpi' }, sc.kpis.map((k) => h('li', { title: t(k.why) }, t(k.label), ': ', h('b', null, fmtK(k.v, k.fmt)), h('small', { class: 'muted' }, ` / ${fmtK(k.target, k.fmt)}`)))),
        h('p', { class: 'small' }, d.tiers.map((x, i) => h('span', { class: `lg18-tier ${i < tier ? 'on' : ''}` }, i < tier ? '✓ ' : '', t(x)))),
        h('p', { class: 'small' }, h('i', null, t(pathEnding18(s, id)))),
        h('div', null,
          h('button', { class: `btn small ${P.chosen === id ? 'primary' : ''}`, onclick: () => { choosePath18(s, P.chosen === id ? null : id); rerender(); } }, t(P.chosen === id ? l('Caminho escolhido', 'Chosen path') : l('Escolher', 'Choose'))),
          h('button', { class: `btn small ${P.pins.includes(id) ? '' : 'ghost'}`, onclick: () => { pinPath18(s, id); rerender(); } }, t(P.pins.includes(id) ? l('Meta ativa ✓', 'Active goal ✓') : l('Fixar meta', 'Pin goal')))));
    })),
    P.ach.length ? section(t(l('Conquistas narrativas', 'Narrative achievements')), h('ul', null, P.ach.map((a) => h('li', null, t(a.t))))) : null);
}

function lawsTab(s: GameState): HTMLElement {
  const br: Record<string, L> = { artists: l('Artistas', 'Artists'), money: l('Dinheiro', 'Money'), art: l('Arte', 'Art'), ethics: l('Ética', 'Ethics'), catalog: l('Catálogo', 'Catalog') };
  return h('div', null,
    section(t(l('Doutrinas (uma lei por semestre)', 'Doctrines (one law per semester)')),
      h('p', { class: 'muted small' }, t(l('Cada ramo tem duas leis opostas: dão e tiram, travam ações e destravam decisões. Revogar só depois de um ano, com custo de credibilidade.', 'Each branch has two opposed laws: they give and take, lock actions and unlock decisions. Revoking only after a year, at a credibility cost.'))),
      h('div', { class: 'lg18-grid' }, Object.keys(br).map((b) => h('div', { class: 'card' }, h('h4', null, t(br[b])),
        DOCTRINES18.filter((d) => d.branch === b).map((d) => {
          const on = hasDoc18(s, d.id), blk = on ? null : docBlock18(s, d);
          return h('div', { class: `lg18-doc ${on ? 'on' : ''}` }, h('b', null, t(d.name)), h('p', { class: 'small' }, t(d.desc)),
            h('p', { class: 'small muted' }, Object.entries(d.perks).map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`).join(' · ')), h('p', { class: 'small bad' }, '🔒 ', t(d.locks)),
            on ? h('button', { class: 'btn small ghost', onclick: () => msg(revokeDoc18(s, d.id), l('Revogada.', 'Revoked.')) }, t(l('Revogar', 'Revoke')))
              : h('button', { class: 'btn small', disabled: !!blk, title: blk ? t(blk) : '', onclick: () => msg(adoptDoc18(s, d.id), l('Doutrina em vigor.', 'Doctrine in force.')) }, t(l('Adotar', 'Adopt')), ` (${usd(s, Math.round(d.cost * 100))})`), blk && !on ? h('small', { class: 'muted' }, ' ', t(blk)) : null);
        }))))),
    section(t(l('Decisões do selo', 'Label decisions')),
      h('div', { class: 'lg18-grid' }, LABEL_DECS18.map((d) => { const b = labelDecBlock18(s, d); return h('div', { class: `card lg18-dec ${b ? 'off' : ''}` }, h('b', null, t(d.name)), h('p', { class: 'small' }, t(d.desc)), h('p', { class: 'small muted' }, t(l('Custo: ', 'Cost: ')), usd(s, d.cost(s))), b ? h('p', { class: 'small bad' }, t(b)) : h('button', { class: 'btn small primary', onclick: () => { toast(t(takeLabelDec18(s, d.id)), 'good'); rerender(); } }, t(l('Decidir', 'Decide')))); }),
        bigDecisions18().map((d) => { const b = decisionBlocker(s, d); return h('div', { class: `card lg18-dec ${b ? 'off' : ''}` }, h('b', null, t(d.name)), bigTaken18(s, d.id) ? h('small', { class: 'good' }, ' ✓') : null, h('p', { class: 'small' }, t(d.desc)), b ? h('p', { class: 'small bad' }, t(b)) : h('button', { class: 'btn small', onclick: () => msg(takeDecision(s, rngOf(s), d.id), l('Feito.', 'Done.')) }, t(l('Decidir', 'Decide'))) ); }))));
}

function num(v: number, set: (x: number) => void, step = 1, min = 0, max = 1e9): HTMLElement {
  return h('input', { type: 'number', value: String(v), step: String(step), min: String(min), max: String(max), class: 'lg18-num', onchange: (e: Event) => { set(Math.max(min, Math.min(max, Number((e.target as HTMLInputElement).value) || 0))); rerender(); } });
}
function policyTab(s: GameState): HTMLElement {
  const P = pol18(s);
  const row = (label: L, help: L, el: HTMLElement) => h('div', { class: 'lg18-pol' }, h('label', null, h('b', null, t(label)), ' ', el), h('small', { class: 'muted' }, t(help)));
  return h('div', null,
    h('p', { class: 'muted' }, t(l('A equipe delegada (agentes de shows, promotores e quem negocia contratos) segue estas regras sozinha. Você só vê as exceções, na Caixa e aqui.', 'Delegated staff (booking agents, promoters and whoever negotiates deals) follows these rules on its own. You only see the exceptions, in the inbox and here.'))),
    row(l('Teto por gasto (US$ de hoje)', 'Spending cap (today\'s US$)'), l('0 = sem teto. Acima disso a ordem para e pede autorização.', '0 = no cap. Above it the order stops and asks for approval.'), num(P.cap, (x) => (P.cap = x), 500)),
    row(l('Reserva mínima (meses de custo fixo)', 'Minimum reserve (months of fixed costs)'), { pt: `${t(l('Hoje: ', 'Now: '))}${usd(s, Math.round(P.reserve * burn18(s)))}${hasDoc18(s, 'prudence') ? ' · doutrina "Reserva sagrada": mínimo 4' : ''}`, en: `Now: ${usd(s, Math.round(P.reserve * burn18(s)))}${hasDoc18(s, 'prudence') ? ' · "Sacred reserve" doctrine: min 4' : ''}` }, num(P.reserve, (x) => (P.reserve = hasDoc18(s, 'prudence') ? Math.max(4, x) : x), 1, 0, 24)),
    row(l('Descanso obrigatório (estresse/cansaço)', 'Mandatory rest (stress/fatigue)'), l('0 = desligado. A turnê delegada para quando alguém da banda passa desse nível.', '0 = off. Delegated touring stops when a band member passes this level.'), num(P.rest, (x) => (P.rest = x), 5, 0, 100)),
    row(l('Máximo de shows por trimestre', 'Max shows per quarter'), l('0 = sem limite.', '0 = no limit.'), num(P.maxShows, (x) => (P.maxShows = x), 1, 0, 60)),
    row(l('Renovação delegada', 'Delegated renewals'), l('Jurídico, empresário ou A&R renovam contratos que vencem em 9 semanas, dentro das condições abaixo.', 'Legal, manager or A&R renew deals ending within 9 weeks, within the terms below.'), h('input', { type: 'checkbox', checked: P.renew, onchange: () => { P.renew = !P.renew; rerender(); } })),
    row(l('Bônus máximo (× adiantamento esperado)', 'Max bonus (× expected advance)'), l('Ex.: 0,3 = até 30% do que o artista espera de adiantamento.', 'E.g. 0.3 = up to 30% of the advance the act expects.'), num(P.renewMax, (x) => (P.renewMax = x), 0.05, 0, 2)),
    row(l('Prazo da renovação (meses)', 'Renewal term (months)'), l('', ''), num(P.renewMonths, (x) => (P.renewMonths = x), 6, 6, 60)),
    row(l('Confiança mínima', 'Minimum trust'), l('Abaixo disso a renovação volta para você.', 'Below this, renewal comes back to you.'), num(P.minTrust, (x) => (P.minTrust = x), 5, 0, 100)),
    section(t(l('Objetivo por artista', 'Goal per act')),
      h('ul', null, playerActs(s).map((id) => s.acts[id]).filter((a) => a && !a.playerBand).map((a) => h('li', null, h('b', null, a.name), ' ',
        select<Goal18>(P.goals[a.id] ?? 'grow', (Object.keys(GOAL18) as Goal18[]).map((g) => ({ value: g, label: t(GOAL18[g].name) })), (g) => { P.goals[a.id] = g; rerender(); }),
        ' ', h('small', { class: 'muted' }, t(GOAL18[P.goals[a.id] ?? 'grow'].desc)))))),
    section(t(l('Exceções recentes', 'Recent exceptions')), P.exc.length ? h('ul', null, P.exc.slice(0, 12).map((e) => h('li', { class: 'small' }, t(e.t)))) : h('p', { class: 'muted' }, t(l('Nenhuma. A equipe está dentro das regras.', 'None. Staff is within the rules.')))),
    h('p', { class: 'small muted' }, t(l('Ordens travadas até hoje: ', 'Orders blocked so far: ')), String(P.n.blocked), ' · ', t(l('renovações feitas pela equipe: ', 'renewals done by staff: ')), String(P.n.renewed)));
}

function pmTab(s: GameState): HTMLElement {
  const pm = rv18(s).pm;
  if (!pm.length) return h('p', { class: 'muted' }, t(l('O primeiro post-mortem chega 12 semanas depois do seu próximo lançamento.', 'The first post-mortem arrives 12 weeks after your next release.')));
  return h('div', null, pm.slice(0, 20).map((p) => h('div', { class: `card lg18-pm lg18-${p.tone}` },
    h('h4', null, `"${p.title}" `, h('small', { class: 'muted' }, `${s.acts[p.actId]?.name ?? '—'} · ${p.type.toUpperCase()} · ${p.y}`)),
    h('p', null, h('b', { class: 'why18', 'data-why': 'review18.reach', 'data-why-ctx': JSON.stringify({ rel: p.id }), tabindex: '0' }, t(p.text))),
    h('ul', { class: 'small' }, p.factors.map((f) => h('li', { class: `lg18-${f.tone}` }, t(f.t)))))));
}

function yearView(s: GameState, Y: Year18): HTMLElement {
  const lang = getLang();
  return h('div', { class: 'lg18-year' },
    h('div', { class: 'lg18-stats' },
      h('div', null, h('small', null, t(l('Caixa', 'Cash'))), h('b', null, `${usd(s, Y.cash0)} → ${usd(s, Y.cash1)}`)),
      h('div', null, h('small', null, t(l('Receita operacional', 'Operating revenue'))), h('b', null, usd(s, Y.rev))),
      h('div', null, h('small', null, t(l('Resultado operacional', 'Operating result'))), h('b', { class: Y.prof >= 0 ? 'good' : 'bad' }, usd(s, Y.prof))),
      h('div', null, h('small', null, t(l('Lançamentos / nº 1', 'Releases / #1s'))), h('b', null, `${Y.rels} / ${Y.n1}`))),
    Y.best ? h('p', null, t(l('Destaque: ', 'Highlight: ')), Y.best) : null,
    Y.path ? h('p', null, t(l('Caminho: ', 'Path: ')), t(pathDef18(Y.path)!.name), ` — ${Y.pathScore}/100`) : null,
    h('p', { class: 'small muted' }, t(l('Post-mortems: ', 'Post-mortems: ')), `${Y.pm.good} ✓ · ${Y.pm.bad} ✗ · `, t(l('tensão do Mestre no ano: ', 'DM tension this year: ')), `${Y.tension[0]}–${Y.tension[1]}`),
    Y.facts.length ? h('ul', null, Y.facts.map((f) => h('li', null, t(f)))) : null,
    Y.gone.length ? h('div', null, h('b', null, t(l('Perdas', 'Losses'))), h('ul', null, Y.gone.map((f) => h('li', null, t(f))))) : null,
    h('button', { class: 'btn small', onclick: () => { void navigator.clipboard?.writeText(yearCard18(s, Y, lang)).then(() => toast(t(l('Cartão copiado.', 'Card copied.')), 'good'), () => undefined); } }, ic('share'), ' ', t(l('Copiar cartão', 'Copy card'))));
}
function yearsTab(s: GameState): HTMLElement {
  const ys = sg18(s).years.slice().reverse();
  if (!ys.length) return h('p', { class: 'muted' }, t(l('O primeiro "Ano em revista" sai em dezembro.', 'The first "Year in review" comes in December.')));
  return h('div', null, ys.map((Y) => section(String(Y.y), yearView(s, Y))));
}

function bioTab(s: GameState): HTMLElement {
  const who = (bioWho.v && (bioWho.v === 'player' || s.acts[bioWho.v])) ? bioWho.v : 'player';
  const opts = [{ value: 'player', label: s.config.companyName }, ...playerActs(s).map((id) => ({ value: id, label: s.acts[id]?.name ?? id }))];
  const paras = bio18(s, who);
  const lang = getLang();
  return h('div', null, select(who, opts, (v) => { bioWho.v = v; rerender(); }),
    h('div', { class: 'lg18-bio' }, paras.map((p) => h('p', null, t(p)))),
    h('button', { class: 'btn small', onclick: () => { void navigator.clipboard?.writeText(paras.map((p) => p[lang]).join('\n\n')).then(() => toast(t(l('Biografia copiada.', 'Biography copied.')), 'good'), () => undefined); } }, t(l('Copiar para o Livro da partida', 'Copy to the run\'s Book'))));
}
const bioWho = { v: 'player' };

function houseTab(s: GameState): HTMLElement {
  const H = sg18(s).house, L18 = legacy18(s);
  return h('div', null,
    h('h4', null, ic('crown'), ' ', H.name, h('small', { class: 'muted' }, ` · ${t(l('prestígio', 'prestige'))} ${H.prestige}`)),
    h('p', { class: 'muted small' }, t(l('Cada geração recebe um mandato. Ao passar o selo (aposentadoria, saúde ou morte), a geração é pontuada pelo legado e pelo mandato; o prestígio acumulado ajuda o herdeiro (propostas e reputação).', 'Each generation gets a mandate. When the label passes on (retirement, health or death), the generation is scored on legacy and mandate; accumulated prestige helps the heir (offers and reputation).'))),
    h('ol', { class: 'lg18-gens' }, H.gens.map((g, i) => h('li', null, h('span', { class: 'lg18-face' }, g.name.split(' ').map((x) => x[0]).slice(0, 2).join('')),
      h('b', null, g.name), ` (${g.from}–${g.to ?? t(l('hoje', 'now'))}) · `, t(MANDATES18[g.mandate]?.name ?? l('—', '—')), g.to ? (g.done ? ' ✓' : ' ✗') : '',
      g.score !== undefined ? h('small', { class: 'muted' }, ` · ${t(l('legado', 'legacy'))} ${g.score}${g.path ? ` · ${t(pathDef18(g.path)!.name)}` : ''}`) : i === H.gens.length - 1 ? h('small', { class: 'muted' }, ` · ${t(l('legado atual', 'current legacy'))} ${L18.total}`) : null,
      g.deeds.length ? h('ul', { class: 'small' }, g.deeds.map((d) => h('li', null, t(d)))) : null))),
    section(t(l('A saga até aqui', 'The saga so far')), h('div', { class: 'lg18-bio' }, bio18(s, 'player').map((p) => h('p', null, t(p))))));
}

function diffTab(s: GameState): HTMLElement {
  const A = sg18(s).adapt, r = adaptRead18(s);
  return h('div', null,
    h('p', null, t(l('Opcional. Quando ligada, o jogo lê sua situação todo mês e ajusta de leve o apelo do público e os custos (aliviando quem está afundando, apertando quem está folgado). Fica sempre visível aqui e no Cockpit, com o porquê.', 'Optional. When on, the game reads your situation every month and gently adjusts audience appeal and costs (easing whoever is sinking, tightening whoever is comfortable). Always visible here and in the Cockpit, with the why.'))),
    h('label', null, h('input', { type: 'checkbox', checked: A.on, onchange: () => { setAdapt18(s, !A.on); rerender(); } }), ' ', t(l('Dificuldade adaptativa', 'Adaptive difficulty'))),
    h('p', null, t(l('Nível atual: ', 'Current level: ')), h('b', null, A.on ? (A.lvl < 0 ? `${A.lvl.toFixed(2)} (${t(l('aliviando', 'easing'))})` : A.lvl > 0 ? `+${A.lvl.toFixed(2)} (${t(l('apertando', 'tightening'))})` : '0') : t(l('desligada', 'off'))),
      ' · ', t(l('leitura agora: ', 'reading now: ')), `${r.target >= 0 ? '+' : ''}${r.target}`, r.why.length ? ` (${r.why.map((x) => t(x)).join(', ')})` : ''),
    h('p', { class: 'small muted' }, t(l('Efeito: nível −2 = apelo +10% e salários −10%; nível +2 = apelo −8% e propostas −4 pts. A curva do Mestre (Diário do Mestre) continua mandando no drama.', 'Effect: level −2 = appeal +10% and salaries −10%; level +2 = appeal −8% and offers −4 pts. The DM curve (DM Diary) still drives the drama.'))));
}

registerArea({ id: 'long18', label: l('Rumo do selo', 'Label course'), icon: 'flag', key: '',
  badge: (s) => pol18(s).exc.filter((e) => e.w > s.week - 5).length || undefined,
  render: (s) => h('div', { class: 'panel lg18' }, tabs('long18', [
    { id: 'paths', label: t(l('Caminhos', 'Paths')), icon: 'flag', render: () => pathsTab(s) },
    { id: 'laws', label: t(l('Doutrinas e decisões', 'Doctrines & decisions')), icon: 'pen', render: () => lawsTab(s) },
    { id: 'policy', label: t(l('Políticas', 'Policies')), icon: 'handshake', render: () => policyTab(s) },
    { id: 'pm', label: t(l('Post-mortems', 'Post-mortems')), icon: 'chart-up', render: () => pmTab(s) },
    { id: 'year', label: t(l('Ano em revista', 'Year in review')), icon: 'calendar', render: () => yearsTab(s) },
    { id: 'bio', label: t(l('Biografia', 'Biography')), icon: 'book', render: () => bioTab(s) },
    { id: 'house', label: t(l('Casa e dinastia', 'House & dynasty')), icon: 'crown', render: () => houseTab(s) },
    { id: 'diff', label: t(l('Dificuldade', 'Difficulty')), icon: 'gamepad', render: () => diffTab(s) },
  ], () => rerender())) });

registerCutscene('long18year', (s, cs, close) => {
  const y = Number((cs.data as { y?: number }).y);
  const Y = sg18(s).years.find((x) => x.y === y);
  return h('div', { class: 'lg18-cut' }, h('h3', null, t(l('Ano em revista', 'Year in review')), ` ${y}`), Y ? yearView(s, Y) : null,
    h('button', { class: 'btn primary', onclick: close }, t(l('Seguir para o novo ano', 'On to the new year'))));
});
void (null as unknown as PathId);
void PATHS18;
