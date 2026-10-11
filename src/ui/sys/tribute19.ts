// Rodada 19 (Frente 9.1/9.5) — página "Tributos e covers": tributos ao seu catálogo e ao mundo (com as decisões de cada
// carreira: selo, artista, promotor/casa, músico), sucesso tardio (calor das faixas antigas, ondas ativas e decisão) e o histórico.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { est18 } from '../../sim/sys/ability18';
import { DEC19, RK19, activeRev19, decOptions19, decide19, rv19, type Dec19 } from '../../sim/sys/revival19';
import { CIRC19, TK19, approve19, circ19, coverPay19, covers19, demand19, festCost19, festival19, gross19, license19, live19, mineAct19, promoter19, residency19, sign19, signCost19, soundalike19, sue19, suitCost19, suitOdds19, t19, type Trib19 } from '../../sim/sys/tribute19';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';
import { personLink16 } from './people16';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false, cls = 'btn small') => h('button', { class: cls, disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const card = (...k: (Node | string | null)[]) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fmtS = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const LIC: L[] = [l('sem licença', 'unlicensed'), l('licenciado', 'licensed'), l('proibido/processado', 'banned/sued')];

function member(s: GameState, pid: string, sa: boolean, sim: number): HTMLElement {
  const p = s.persons[pid];
  const e = p ? est18(s, `p:${pid}`) : null;
  return h('span', { class: 'small', style: 'margin-right:8px' }, p ? personLink16(s, `p:${pid}`, p.name) : '?',
    e ? ` (CA ${Math.round(e.ca)} · PA ${Math.round(e.paLo)}–${Math.round(e.paHi)})` : '', sa ? ` 🎤 ${fmtS(l('sósia {p}%', 'sound-alike {p}%'), { p: sim })}` : '', p && !p.alive ? ' †' : '');
}
function tribCard(s: GameState, x: Trib19): HTMLElement {
  const a = s.acts[x.act], mine = mineAct19(s, a), band = !!a?.playerBand, d = demand19(s, x);
  return card(
    row(h('b', null, x.name), pill(T(TK19[x.k].name)), pill(T(circ19(x.c)?.name ?? '?')), pill(T(LIC[x.lic]), x.lic === 1 ? 'good' : x.lic === 2 ? 'bad' : 'warn'),
      x.ok ? pill(t(l('aprovado pelo artista', 'artist-approved')), 'good') : null, x.res ? pill(t(l('residência sua', 'your residency')), 'good') : null, x.fake ? pill(t(l('despedida falsa', 'fake farewell')), 'bad') : null),
    row(T(l('Tributo a', 'Tribute to')), a ? actLink(s, a.id) : '?', ' · ', why18(s, 'trib19.demand', { t: x.id }, fmtS(l('público ×{v}', 'crowd ×{v}'), { v: d.v })), ' · ', fmtS(l('bruto {g}/mês, {e} no total', 'gross {g}/month, {e} total'), { g: $(gross19(s, x)), e: $(x.earn) })),
    x.mem.length ? row(...x.mem.map((p) => member(s, p, p === x.sa, x.sim))) : muted(l('Sem músicos: é software (voz de IA).', 'No players: it is software (AI voice).')),
    x.court ? muted(fmtS(l('Na justiça: sentença em {w} semanas.', 'In court: ruling in {w} weeks.'), { w: x.court - s.week })) : null,
    row(
      mine && !band && x.lic !== 1 ? btn(fmtS(l('Licenciar ({p}%)', 'License ({p}%)'), { p: Math.round(x.pct * 100) }), () => say(license19(s, x.id))) : null,
      mine && !band && !x.court ? why18(s, 'trib19.odds', { t: x.id }, btn(fmtS(l('Processar ({c}, {o}%)', 'Sue ({c}, {o}%)'), { c: $(suitCost19(s)), o: Math.round(suitOdds19(s, x) * 100) }), () => say(sue19(s, x.id)))) : null,
      mine && !band && !x.sign && x.mem.length ? btn(fmtS(l('Assinar álbum-tributo ({c})', 'Sign tribute album ({c})'), { c: $(signCost19(s)) }), () => say(sign19(s, x.id))) : null,
      band && !x.ok ? btn(l('Aprovar (bênção oficial)', 'Approve (official blessing)'), () => say(approve19(s, x.id))) : null,
      band && x.sa ? btn(l('Contratar o sósia', 'Hire the sound-alike'), () => say(soundalike19(s, x.id))) : null,
      promoter19(s) ? btn(x.res ? l('Encerrar residência', 'End residency') : l('Residência na sua casa (30%)', 'Residency at your venue (30%)'), () => say(residency19(s, x.id, !x.res))) : null));
}
function tribTab(s: GameState): HTMLElement {
  const xs = live19(s).sort((a, b) => Number(mineAct19(s, s.acts[b.act])) - Number(mineAct19(s, s.acts[a.act])) || demand19(s, b).v - demand19(s, a).v);
  const st = t19(s);
  return h('div', null,
    muted(l('Tributos nascem quando um artista famoso some (separação, morte, hiato) e os fãs continuam querendo ouvir. Selo: licencie, processe ou assine um álbum-tributo. Artista: aprove ou contrate o sósia vocal. Casa/festival: residência e festival de tributos. Holograma ou reunião do original esvaziam a plateia.', 'Tributes are born when a famous artist disappears (split, death, hiatus) and fans still want to hear them. Label: license, sue or sign a tribute album. Artist: approve or hire the sound-alike singer. Venue/festival: residency and tribute festival. A hologram or reunion of the original empties the room.')),
    promoter19(s) ? row(btn(fmtS(l('Festival de tributos ({c})', 'Tribute festival ({c})'), { c: $(festCost19(s)) }), () => say(festival19(s)), st.fest >= s.year), muted(l('1 por ano, com 3+ tributos em atividade; bilheteria pelo público de cada um.', 'Once a year, with 3+ active tributes; gate by each one\'s crowd.'))) : null,
    xs.length ? h('div', null, ...xs.slice(0, 30).map((x) => tribCard(s, x))) : muted(l('Nenhum tributo em atividade ainda.', 'No active tributes yet.')),
    section(t(l('Circuitos da época', 'Circuits of the era')), h('ul', { class: 'small' }, ...CIRC19.filter((c) => s.year >= c.from).map((c) => h('li', null, h('b', null, T(c.name)), ` ×${c.mul} — `, T(c.real))))),
    section(t(l('Tipos de tributo da época', 'Tribute kinds of the era')), h('ul', { class: 'small' }, ...(Object.keys(TK19) as (keyof typeof TK19)[]).filter((k) => s.year >= TK19[k].from).map((k) => h('li', null, h('b', null, T(TK19[k].name)), ' — ', T(TK19[k].desc))))));
}
function revTab(s: GameState): HTMLElement {
  const st = rv19(s), act = activeRev19(s);
  const cands = Object.entries(st.c).sort((a, b) => b[1].h - a[1].h).slice(0, 10);
  return h('div', null,
    muted(l('Faixas antigas voltam por filme, série, comercial, remix, trilha de game, documentário ou vídeo curto. Cada uso soma calor; com 60 a faixa explode de novo, traz fãs de outra geração, faz nascer tributos e pode ganhar certificação tardia.', 'Old tracks come back through films, series, ads, remixes, game soundtracks, documentaries or short videos. Each use adds heat; at 60 the track blows up again, brings fans from another generation, spawns tributes and may get a late certification.')),
    section(t(l('Ondas ativas', 'Active waves')), act.length ? h('div', null, ...act.map((x) => {
      const rel = s.releases[x.rel], mine = rel && (rel.owner === 'player' || s.acts[rel.actId]?.playerBand);
      return card(row(h('b', null, `"${rel?.title ?? '?'}" (${rel?.year ?? ''})`), actLink(s, x.act), rel?.certified ? pill(rel.certified, 'good') : null, x.dec ? pill(T(DEC19[x.dec].name)) : null),
        row(T(x.why), ' · ', why18(s, 'rev19.units', { rv: x.id }, fmtS(l('{u} unidades, {g} fãs novos', '{u} units, {g} new fans'), { u: x.u.toLocaleString('en-US'), g: x.gen.toLocaleString('en-US') }))),
        mine && !x.dec ? row(...decOptions19(s, x).map((d: Dec19) => h('span', { title: t(DEC19[d].desc) }, btn(DEC19[d].name, () => say(decide19(s, x.id, d)))))) : null);
    })) : muted(l('Nenhuma onda agora.', 'No wave right now.'))),
    section(t(l('Faixas esquentando', 'Tracks heating up')), cands.length ? h('ul', { class: 'small' }, ...cands.map(([id, c]) => {
      const rel = s.releases[id];
      return h('li', null, why18(s, 'rev19.heat', { rel: id }, `"${rel?.title ?? '?'}" (${rel?.year ?? ''}) — ${s.acts[rel?.actId ?? '']?.name ?? '?'}: ${c.h}/60`), ' ', c.st.map(([k]) => T(RK19[k].name)).join(' → '));
    })) : muted(l('Nada esquentando.', 'Nothing heating up.'))));
}
function bandTab(s: GameState): HTMLElement {
  const st = t19(s), mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a?.playerBand);
  return h('div', null,
    muted(l('Começar tocando covers paga as contas rápido (bailes, bares, formaturas), mas a crítica cola o rótulo de "banda cover": reputação artística da banda cai todo mês e, depois de um ano, o momento esfria.', 'Starting out on covers pays the bills fast (dances, bars, proms), but critics stick the "cover band" label on you: the band\'s artistic reputation drops every month and, after a year, momentum cools.')),
    mine.length ? h('div', null, ...mine.map((a) => card(row(actLink(s, a.id), st.cov[a.id] !== undefined ? pill(t(l('tocando covers', 'playing covers')), 'warn') : null,
      btn(st.cov[a.id] !== undefined ? l('Parar com os covers', 'Stop the covers') : fmtS(l('Tocar covers (+{v}/mês)', 'Play covers (+{v}/month)'), { v: $(coverPay19(s, a)) }), () => say(covers19(s, a.id, st.cov[a.id] === undefined))))))) : muted(l('Você não tem banda própria (carreira de músico).', 'You have no band of your own (musician career).')));
}
function histTab(s: GameState): HTMLElement {
  const st = t19(s), rs = rv19(s);
  const ended = st.t.filter((x) => x.end).slice(-12).reverse();
  const splits = Object.entries(st.split);
  return h('div', null,
    row(...Object.entries({ ...st.n, ...rs.n }).filter(([k]) => !k.startsWith('st_')).map(([k, v]) => pill(`${k}: ${v}`))),
    splits.length ? section(t(l('Fãs divididos', 'Split fanbases')), h('ul', { class: 'small' }, ...splits.map(([id, [y, p]]) => h('li', null, actLink(s, id), fmtS(l(' — {y}: {p}% puristas contra a voz nova', ' — {y}: {p}% purists against the new voice'), { y, p }))))) : null,
    section(t(l('Tributos', 'Tributes')), st.log.length ? h('ul', { class: 'small' }, ...st.log.slice(0, 15).map(([y, m, x]) => h('li', null, `${y}/${m + 1} — ${t(x)}`))) : muted(l('Nada ainda.', 'Nothing yet.'))),
    section(t(l('Sucesso tardio', 'Late hits')), rs.log.length ? h('ul', { class: 'small' }, ...rs.log.slice(0, 15).map(([y, m, x]) => h('li', null, `${y}/${m + 1} — ${t(x)}`))) : muted(l('Nada ainda.', 'Nothing yet.'))),
    ended.length ? section(t(l('Encerrados', 'Ended')), h('ul', { class: 'small' }, ...ended.map((x) => h('li', null, `${x.name} (${x.y}–${x.end}) — ${x.endWhy ? t(x.endWhy) : ''}`)))) : null);
}
function page(s: GameState): HTMLElement {
  const mine = live19(s).filter((x) => mineAct19(s, s.acts[x.act])).length;
  return h('div', null,
    h('h2', null, t(l('Tributos e covers', 'Tributes and covers'))),
    tabs('tribute19', [
      { id: 'trib', label: t(l('Tributos', 'Tributes')), badge: mine || undefined, render: () => tribTab(s) },
      { id: 'rev', label: t(l('Sucesso tardio', 'Late hits')), badge: activeRev19(s).length || undefined, render: () => revTab(s) },
      { id: 'band', label: t(l('Sua banda', 'Your band')), render: () => bandTab(s) },
      { id: 'hist', label: t(l('Histórico', 'History')), render: () => histTab(s) },
    ], rerender));
}
registerArea({ id: 'tribute19', label: l('Tributos e covers', 'Tributes and covers'), icon: 'disc', key: '', render: page,
  badge: (s) => activeRev19(s).filter((x) => !x.dec && (s.releases[x.rel]?.owner === 'player' || s.acts[x.act]?.playerBand)).length || undefined });
