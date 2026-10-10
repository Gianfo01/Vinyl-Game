// Rodada 17 (onda 1, B) — "Mundo vivo": o diretor criativo (narrador) da partida, as situações que ele jogou em todo
// mundo e cada jogada dos NPCs com o PORQUÊ (rompimentos, selos novos, carreiras, estratégias de selo). Também
// aparece como aba "Trajetória no mundo" na página da pessoa, do ato e do selo.

import { STORYTELLERS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { FREEDOM17, dir17, freedomOf } from '../../sim/director17';
import { SITS, sit17 } from '../../sim/sys/situations17';
import { ROLE17, careerOf, founderOf, movesAbout, npc17, wars17, type Move17, type MoveK } from '../../sim/sys/npc17';
import type { GameState, Person } from '../../sim/types';
import { actLink, labelLink, monthName, pill, rerender, section } from '../common';
import { h } from '../dom';
import { PERSON_TABS } from '../pages';
import { registerArea, registerPageTab } from '../registry';
import { PAGE16_TABS, personLink16 } from './people16';

const K17: Record<MoveK, [L, string]> = {
  mgr_exit: [l('rompeu c/ empresário', 'left manager'), 'bad'], mgr_hire: [l('novo empresário', 'new manager'), ''], label_exit: [l('trocou de selo', 'changed label'), 'warn'],
  indie: [l('independente', 'independent'), 'warn'], signed: [l('assinou', 'signed'), ''], founded: [l('selo novo', 'new label'), 'good'], imprint: [l('imprint', 'imprint'), 'good'],
  career: [l('nova carreira', 'new career'), 'good'], delay: [l('adiou lançamento', 'delayed release'), ''], holiday: [l('disco de Natal', 'holiday release'), ''],
  surprise: [l('lançamento-surpresa', 'surprise drop'), 'good'], merch: [l('merch', 'merch'), ''], war: [l('guerra de preços', 'price war'), 'bad'], war_end: [l('fim da guerra', 'war over'), ''],
  poach: [l('aliciamento', 'poaching'), 'bad'], loyal: [l('lealdade', 'loyalty'), 'good'], beef: [l('rixa', 'beef'), 'warn'], merger: [l('fusão', 'merger'), 'warn'],
  bidding: [l('leilão', 'bidding war'), ''], strike: [l('greve', 'strike'), 'bad'], strike_end: [l('fim da greve', 'strike over'), ''], rerecord: [l('regravação', 're-recording'), 'warn'],
  follow: [l('seguiu o executivo', 'followed exec'), ''], solo: [l('carreira solo', 'solo career'), 'warn'],
};
const GROUP17: Record<string, { name: L; ks: MoveK[] }> = {
  all: { name: l('Tudo', 'All'), ks: [] },
  breaks: { name: l('Rompimentos', 'Break-ups'), ks: ['mgr_exit', 'label_exit', 'indie', 'strike', 'strike_end', 'rerecord', 'solo', 'loyal'] },
  labels: { name: l('Selos', 'Labels'), ks: ['founded', 'imprint', 'merger', 'war', 'war_end', 'poach', 'bidding', 'follow', 'merch'] },
  strategy: { name: l('Estratégia', 'Strategy'), ks: ['delay', 'holiday', 'surprise', 'beef'] },
  careers: { name: l('Carreiras', 'Careers'), ks: ['career', 'mgr_hire', 'founded', 'imprint', 'solo'] },
};
let filter17 = 'all';

function moveRow(s: GameState, m: Move17): HTMLElement {
  const [name, cls] = K17[m.k] ?? [l(m.k), ''];
  return h('li', null, h('span', { class: 'muted' }, `${monthName(m.m)} ${m.y} `), pill(t(name), cls), ' ', t(m.t), ' ',
    m.a && s.acts[m.a] ? actLink(s, m.a) : null, m.lb && s.labels[m.lb] ? h('span', null, ' · ', labelLink(s, m.lb)) : null);
}

/** O diretor criativo desta partida (narrador + liberdade). */
export function directorCard17(s: GameState): HTMLElement {
  const st = STORYTELLERS.find((x) => x.id === s.config.storyteller) ?? STORYTELLERS[0];
  const D = dir17(s);
  const fr = FREEDOM17[freedomOf(s)];
  return section(t(l('Diretor criativo', 'Creative director')),
    h('p', null, h('b', null, t(st.name)), ` — ${t(st.desc)}`),
    h('p', { class: 'small' }, t(D.how)),
    h('div', { class: 'row wrap' },
      pill(`${t(l('Drama', 'Drama'))} ×${D.drama.toFixed(2)}`), pill(`${t(l('Situações entre NPCs/mês', 'NPC situations/mo'))} ≤${D.npc}`),
      pill(`${t(l('Liberdade', 'Freedom'))}: ${t(fr.name)} (×${D.world.toFixed(2)})`, D.world > 1.2 ? 'warn' : ''),
      pill(`${t(l('Tom', 'Tone'))} ${D.tone > 0.1 ? t(l('luminoso', 'bright')) : D.tone < -0.1 ? t(l('sombrio', 'dark')) : t(l('neutro', 'neutral'))}`, D.tone < -0.1 ? 'bad' : D.tone > 0.1 ? 'good' : '')),
    h('p', { class: 'small muted' }, t(l(
      `O narrador escolhido no Novo Jogo é o diretor criativo: ele dá o ritmo dos eventos, joga situações (${SITS.length} tipos) em você e em todos os NPCs — que respondem pelos próprios traços — e decide quanta liberdade o mundo tem (artistas rompem, abrem selos, mudam de carreira; selos adiam lançamentos, guerreiam por preço, aliciam e se fundem). No modo "Vida real exata", artistas reais intocados seguem a história.`,
      `The storyteller picked at New Game is the creative director: it sets the pace of events, throws situations (${SITS.length} kinds) at you and every NPC — who answer by their own traits — and decides how much freedom the world has (acts break up, open labels, change careers; labels delay releases, wage price wars, poach and merge). In "Exact real life" mode, untouched real artists follow history.`))));
}

function worldArea(s: GameState): HTMLElement {
  const st = npc17(s);
  const g = GROUP17[filter17] ?? GROUP17.all;
  const list = st.log.filter((m) => !g.ks.length || g.ks.includes(m.k)).slice(0, 60);
  const sits = sit17(s).log.slice(0, 15);
  const wars = wars17(s);
  const fd = Object.entries(st.fd).filter(([id]) => s.labels[id]).slice(-12).reverse();
  return h('div', { class: 'page' },
    h('h2', null, t(l('Mundo vivo', 'Living world'))),
    directorCard17(s),
    wars.length ? section(t(l('Guerras de preço em curso', 'Ongoing price wars')), h('ul', { class: 'small' }, ...wars.map((w) => h('li', null, labelLink(s, w.a), ' × ', labelLink(s, w.b),
      ` — ${w.fam} · ${t(l('até', 'until'))} ${s.year + Math.round((w.until - s.week) / 52)} · ${t(l('discos deles +8%, resto do gênero −4% nesse mercado', 'their records +8%, rest of the genre −4% in that market'))}`)))) : null,
    section(t(l('Situações do diretor (todos os personagens)', 'Director situations (every character)')),
      sits.length ? h('ul', { class: 'small' }, ...sits.map(([y, m, , tx]) => h('li', null, h('span', { class: 'muted' }, `${monthName(m)} ${y} `), t(tx)))) : h('p', { class: 'muted small' }, t(l('Nenhuma ainda.', 'None yet.')))),
    section(t(l('Jogadas dos NPCs — e por quê', 'NPC moves — and why')),
      h('div', { class: 'row wrap' }, ...Object.entries(GROUP17).map(([id, x]) => h('button', { class: `btn small ${filter17 === id ? '' : 'ghost'}`, onclick: () => { filter17 = id; rerender(); } }, t(x.name)))),
      list.length ? h('ul', { class: 'small' }, ...list.map((m) => moveRow(s, m))) : h('p', { class: 'muted small' }, t(l('O mundo ainda está quieto.', 'The world is quiet so far.')))),
    fd.length ? section(t(l('Selos abertos por NPCs', 'Labels opened by NPCs')), h('ul', { class: 'small' }, ...fd.map(([id, f]) => h('li', null, labelLink(s, id), ` — ${f.name} (${t(ROLE17[f.k === 'imprint' ? 'imprint' : f.k === 'exec' ? 'exec' : f.k === 'manager' ? 'manager' : 'artist'])}, ${f.y}): ${t(f.why)}${s.labels[id].active ? '' : ` · ${t(l('fechado', 'closed'))}`}`)))) : null,
  );
}

registerArea({ id: 'world17', label: l('Mundo vivo', 'Living world'), icon: 'globe', key: '', render: worldArea });

/** Trajetória no mundo de uma pessoa (chave persona13), ato ou selo. */
export function trail17(s: GameState, id: string): HTMLElement {
  const car = careerOf(s, id);
  const mv = movesAbout(s, id, 20);
  const fd = s.labels[id] ? founderOf(s, id) : undefined;
  const war = s.labels[id] ? wars17(s).find((w) => w.a === id || w.b === id) : undefined;
  return h('div', null,
    fd ? section(t(l('Fundação', 'Founding')), h('p', { class: 'small' }, `${fd.name} (${t(ROLE17[fd.k === 'imprint' ? 'imprint' : fd.k === 'exec' ? 'exec' : fd.k === 'manager' ? 'manager' : 'artist'])}), ${fd.y}: ${t(fd.why)}`, ' ', fd.by.includes(':') ? personLink16(s, fd.by, t(l('ver pessoa', 'see person'))) : null)) : null,
    war ? section(t(l('Guerra de preços', 'Price war')), h('p', { class: 'small' }, labelLink(s, war.a), ' × ', labelLink(s, war.b), ` (${war.fam})`)) : null,
    car.length ? section(t(l('Mudanças de carreira', 'Career changes')), h('ul', { class: 'small' }, ...car.map(([y, a, b, w]) => h('li', null, `${y}: ${t(ROLE17[a] ?? l(a))} → ${t(ROLE17[b] ?? l(b))} — ${t(w)}`)))) : null,
    section(t(l('Jogadas e porquês', 'Moves and whys')), mv.length ? h('ul', { class: 'small' }, ...mv.map((m) => moveRow(s, m))) : h('p', { class: 'muted small' }, t(l('Nenhuma jogada registrada.', 'No moves on record.')))),
  );
}

const TAB = l('Trajetória no mundo', 'World trail');
const has = (s: GameState, id: string) => careerOf(s, id).length > 0 || movesAbout(s, id, 1).length > 0 || (!!s.labels[id] && !!founderOf(s, id));
PERSON_TABS.push((s, p: Person) => (has(s, `p:${p.id}`) ? { id: 'world17', label: TAB, icon: 'globe', render: () => trail17(s, `p:${p.id}`) } : null));
PAGE16_TABS.push((s, key) => (has(s, key) ? { id: 'world17', label: TAB, icon: 'globe', render: () => trail17(s, key) } : null));
registerPageTab('act', { id: 'world17', label: TAB, icon: 'globe', order: 86, when: has, render: (s, id) => trail17(s, id) });
registerPageTab('label', { id: 'world17', label: TAB, icon: 'globe', order: 86, when: has, render: (s, id) => trail17(s, id) });
