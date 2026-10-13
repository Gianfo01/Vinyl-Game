// Rodada 29 (WIKI) — Personagens: pessoas, artistas e selos (da partida carregada ou do catálogo real), produtores,
// empresários, executivos e críticos. Fonte canônica pessoa ↔ ato: src/sim/sys/connect29.ts (a mesma da ficha), então a
// wiki e a ficha da pessoa dizem a mesma coisa por construção.
// Segredo: nunca mostra talento, potencial, atributos ocultos, fim de carreira previsto (careerEnd) nem romances; dados
// reais depois do ano da partida só com "Revelar história real".

import { realLook15 } from '../../data/looks15';
import { ROLES27, type RoleSpec27 } from '../../data/lineup27';
import { MGR_STYLE, REAL_MGRS, type RealMgr } from '../../data/managers14';
import { MGRS18, PRODS18 } from '../../data/people18';
import { REAL_PRODS, type RealProd } from '../../data/producers15';
import { CRITICS17, OUTLETS17 } from '../../data/media17';
import { REGIONAL_CRITICS } from '../../data/critics8';
import { REAL_EXECS } from '../../data/labels10';
import { cityById, genreById, l, marketById } from '../../data/world';
import { visibleAct } from '../../sim/future';
import { careerActs29, exMembers29, segs29 } from '../../sim/sys/connect29';
import { biography29 } from '../../sim/sys/connect29';
import { kinLabel15, kinOf15 } from '../../sim/sys/kin15';
import { relics } from '../../sim/sys/relics9';
import { realDataOf, rw } from '../../sim/sys/realworld';
import type { Act, GameState, Person } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { H, P, T, hidden29, safeP29, join29, ln29, realCat29, roleName29, slug29, span29, staticLabels29, tx, year29, type RArt29, type RPer29, type W29 } from './wiki29core';
import type { Block29, Inline29, Page29 } from './wiki29types';
import { actLore29, personLore29 } from './wiki29lore';
import { ATTR13, ATTR13_IDS } from '../../sim/sys/persona13';

const hash = (x: string): number => { let h = 2166136261; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const hashName29 = hash;

const STATUS_L = {
  emerging: l('em ascensão', 'emerging'), active: l('na ativa', 'active'), hiatus: l('em hiato', 'on hiatus'), retired: l('aposentado', 'retired'), split: l('separado', 'split up'),
};
const REASON_L = { left: l('saiu', 'left'), died: l('morreu', 'died'), retired: l('aposentou-se', 'retired'), fired: l('foi demitido(a)', 'was fired') };
const TYPE_L: Record<string, ReturnType<typeof l>> = { single: l('single', 'single'), album: l('álbum', 'album'), ep: l('EP', 'EP'), lp: l('álbum', 'album'), compilation: l('coletânea', 'compilation'), live: l('ao vivo', 'live') };

// ---------------------------------------------------------------- visibilidade (partida carregada)

const VIS = new WeakMap<GameState, { k: string; acts: Act[]; pids: Set<string> }>();
/** Atos e pessoas que o jogador já pode ver (atos que estrearam ou que ele conhece; quem passou por eles; nascidos). */
export function visible29(s: GameState): { acts: Act[]; pids: Set<string> } {
  const k = `${s.week}|${Object.keys(s.acts).length}|${Object.keys(s.persons).length}`;
  const c = VIS.get(s);
  if (c && c.k === k) return c;
  const acts = Object.values(s.acts).filter((a) => visibleAct(s, a));
  const pids = new Set<string>();
  const former = rw(s).former;
  for (const a of acts) {
    for (const m of a.members) pids.add(m);
    for (const f of former[a.id] ?? []) pids.add(f.personId);
  }
  for (const p of Object.values(s.persons)) if (p.isPlayer) pids.add(p.id);
  for (const id of [...pids]) { const p = s.persons[id]; if (!p || p.born > s.year) pids.delete(id); }
  const out = { k, acts, pids };
  VIS.set(s, out);
  return out;
}

// ---------------------------------------------------------------- títulos

export function personTitle29(c: W29, id: string): string | undefined {
  const s = c.s;
  if (!s) return undefined;
  return s.persons[id]?.name;
}

/** Funções da pessoa (principal + ROLES27, com o ano a partir do qual valem). */
export function roles29(p: { name: string; role: string; roles27?: RoleSpec27[] | (string | [string, number])[] }, year: number): string[] {
  const extra = (p.roles27 ?? ROLES27[p.name] ?? []) as (string | [string, number])[];
  const xs = [p.role, ...extra.filter((r) => typeof r === 'string' || r[1] <= year).map((r) => (typeof r === 'string' ? r : r[0]))];
  return [...new Set(xs)].map(roleName29);
}

// ---------------------------------------------------------------- "história real" (com spoiler)

/** Bloco de história real de um artista (discografia, fim, voltas, integrantes) com os fatos futuros escondidos. */
function realActFacts29(c: W29, a: RArt29 | { n: string; d?: number; e?: number; m?: RArt29['m']; al?: RArt29['al']; rj?: RArt29['rj']; exact?: false }, title?: string): Block29[] {
  const out: Block29[] = [];
  let hid = 0;
  const rows: [string, Inline29[]][] = [];
  if (a.d !== undefined) { if (hidden29(c, a.d)) hid++; else rows.push([T('Estreia', 'Debut'), [String(a.d)]]); }
  if (a.e !== undefined) { if (hidden29(c, a.e)) hid++; else rows.push([T('Parou em', 'Stopped in'), [String(a.e)]]); }
  for (const [x, y] of a.rj ?? []) { if (hidden29(c, x)) hid++; else rows.push([T('Volta', 'Reunion'), [span29(x, y)]]); }
  if (a.exact === false) rows.push([T('Procedência', 'Source'), [T('dado ainda não conferido (some no modo "Vida real exata")', 'unverified data (hidden in "Exact real life" mode)')]]);
  const mem: Inline29[][] = [];
  for (const m of a.m ?? []) {
    const per = m[6]?.length ? m[6] : [[m[4], m[5]] as [number | undefined, number?]];
    const st0 = (x: number | undefined) => x ?? (a as RArt29).f ?? (a.d !== undefined ? a.d - 1 : undefined);
    const vis = per.filter(([x]) => !hidden29(c, st0(x)));
    if (!vis.length) { hid++; continue; }
    const txt = vis.map(([x, y]) => span29(st0(x), hidden29(c, y) ? undefined : y)).join(', ');
    if (vis.some(([, y]) => hidden29(c, y))) hid++;
    mem.push([ln29(`rp:${slug29(m[0])}`, m[0]), ` — ${roleName29(m[1])}${txt ? ` (${txt})` : ''}`]);
  }
  const disc: Inline29[][] = [];
  for (const r of a.al ?? []) { if (hidden29(c, r[1])) { hid++; continue; } disc.push([`${r[0]} (${r[1]}${r[2] && r[2] !== 'lp' ? `, ${tx(TYPE_L[r[2]] ?? l(r[2]))}` : ''})`]); }
  if (rows.length || mem.length || disc.length || hid) out.push(H(title ?? T('Na história real', 'In real history')));
  if (rows.length) out.push({ k: 'kv', rows });
  if (mem.length) { out.push(P(T('Formação real (todas as passagens):', 'Real lineup (every stint):'))); out.push({ k: 'ul', items: mem }); }
  if (disc.length) { out.push(P(T('Discos e singles marcantes:', 'Landmark records and singles:'))); out.push({ k: 'ul', items: disc }); }
  if (hid) out.push({ k: 'spoiler', n: hid });
  return out;
}

function realPersonFacts29(c: W29, rp: RPer29, title?: string): Block29[] {
  const out: Block29[] = [];
  let hid = 0;
  const cat = realCat29();
  const rows: [string, Inline29[]][] = [];
  if (rp.b !== undefined) rows.push([T('Nascimento', 'Born'), [String(rp.b)]]);
  if (rp.x !== undefined) { if (hidden29(c, rp.x)) hid++; else rows.push([T('Morte', 'Died'), [String(rp.x)]]); }
  const acts: Inline29[][] = [];
  for (const x of rp.acts) {
    const a = cat.artBy.get(x.slug);
    if (!a) continue;
    const vis = x.per.filter(([y]) => !hidden29(c, y));
    if (!vis.length) { hid++; continue; }
    if (vis.some(([, y]) => hidden29(c, y))) hid++;
    acts.push([ln29(`ract:${a.slug}`, a.n), ` — ${x.solo ? T('carreira solo', 'solo career') : roleName29(x.role)} (${vis.map(([y, z]) => span29(y, hidden29(c, z) ? undefined : z)).join(', ')})`]);
  }
  out.push(H(title ?? T('Na história real', 'In real history')));
  if (rows.length) out.push({ k: 'kv', rows });
  if (acts.length) { out.push(P(T('Bandas e carreira (com períodos):', 'Bands and career (with periods):'))); out.push({ k: 'ul', items: acts }); }
  if (hid) out.push({ k: 'spoiler', n: hid });
  return out;
}

// ---------------------------------------------------------------- pessoa (partida)

export function pagePerson29(c: W29, pid: string): Page29 | null {
  const s = c.s;
  const p = s?.persons[pid];
  if (!s || !p) return null;
  const vis = visible29(s);
  if (!vis.pids.has(pid) && !c.reveal) return futurePage29(`person:${pid}`, p.name, T('pessoa', 'person'));
  const y = s.year;
  const blocks: Block29[] = [];
  const kv: [string, Inline29[]][] = [];
  kv.push([T('Nascimento', 'Born'), [String(p.born)]]);
  if (!p.alive && p.died !== undefined) kv.push([T('Morte', 'Died'), [String(p.died)]]);
  else kv.push([T('Idade', 'Age'), [String(Math.max(0, y - p.born))]]);
  kv.push([T('Funções', 'Roles'), [roles29(p, y).join(' · ')]]);
  if (p.isPlayer) kv.push([T('Quem é', 'Who'), [T('Você (o personagem do jogador)', 'You (the player character)')]]);
  blocks.push({ k: 'kv', rows: kv });
  // bandas (fonte canônica connect29)
  const ca = careerActs29(s, pid).filter((x) => vis.acts.includes(x.act) || c.reveal);
  if (ca.length) {
    blocks.push(H(T('Bandas e carreira', 'Bands and career')));
    blocks.push({ k: 'ul', items: ca.map((x) => [ln29(`act:${x.act.id}`, x.act.name), ` — ${segs29(x)}`, x.current ? T(' · atual', ' · current') : T(' · ex', ' · former'), x.solo ? T(' · solo', ' · solo') : '']) });
  }
  // parentes
  const kin = kinOf15(s, pid).filter((k) => vis.pids.has(k.id) || c.reveal);
  if (kin.length) {
    blocks.push(H(T('Família e laços', 'Family and ties')));
    blocks.push({ k: 'ul', items: kin.map((k) => [ln29(`person:${k.id}`, k.p.name), ` — ${tx(kinLabel15(k))}`]) });
  }
  // prêmios e relíquias (da pessoa e dos atos da carreira)
  const ids = new Set(ca.map((x) => x.act.id));
  const aw = (s.awards ?? []).filter((a) => a.actId && ids.has(a.actId));
  if (aw.length) {
    blocks.push(H(T('Prêmios', 'Awards')));
    blocks.push({ k: 'ul', items: aw.slice(-20).reverse().map((a) => [`${a.year} · ${a.name}${a.category ? ` (${a.category})` : ''} — `, ln29(`act:${a.actId}`, s.acts[a.actId!]?.name ?? '')]) });
  }
  const rl = relics(s).list.filter((r) => r.p === pid || (r.a && ids.has(r.a)));
  if (rl.length) {
    blocks.push(H(T('Relíquias', 'Relics')));
    blocks.push({ k: 'arts', items: rl.slice(0, 16).map((r) => ({ art: { k: 'relic', kind: r.k, name: tx(r.n), year: r.y, seed: r.id }, cap: `${tx(r.n)} (${r.y})`, link: r.rr ? `relic:${r.rr}` : undefined })) });
  }
  // crônica (o que já aconteceu)
  const bio = biography29(s, pid).filter((e) => e.y <= y).slice(-12);
  if (bio.length) {
    blocks.push(H(T('Crônica', 'Chronicle')));
    blocks.push({ k: 'ul', items: bio.map((e) => [`${e.y} · ${tx(e.t)}`]) });
  }
  // na sua partida
  const live: [string, Inline29[]][] = [];
  const cur = ca.filter((x) => x.current);
  live.push([T('Banda agora', 'Band now'), cur.length ? join29(cur.map((x) => ln29(`act:${x.act.id}`, x.act.name))) : [T('nenhuma', 'none')]]);
  if (!p.isPlayer) {
    const rel = Math.round(p.rel.player ?? 0);
    live.push([T('Relação com você', 'Relationship with you'), [`${rel > 0 ? '+' : ''}${rel} (${rel >= 40 ? T('próxima', 'close') : rel >= 10 ? T('boa', 'good') : rel > -10 ? T('neutra', 'neutral') : rel > -40 ? T('fria', 'cold') : T('hostil', 'hostile')})`]]);
  }
  const mine = new Set(playerActs(s));
  if (cur.some((x) => mine.has(x.act.id))) live.push([T('No seu elenco', 'On your roster'), [T('sim', 'yes')]]);
  live.push([T('Situação', 'Status'), [p.alive ? T('viva', 'alive') : T('falecida', 'deceased')]]);
  blocks.unshift({ k: 'live', rows: live });
  // história real (modo nomes reais)
  if (s.config.realNames) {
    const rp = realCat29().perBy.get(slug29(p.name));
    if (rp) blocks.push(...realPersonFacts29(c, rp));
  }
  return { id: `person:${pid}`, title: p.name, kind: p.isPlayer ? T('você', 'you') : T('pessoa', 'person'), art: { k: 'portrait', id: p.id, look: p.look, born: p.born, role: p.role, year: y },
    crumbs: crumbs29('pessoas', 'persons'), blocks };
}

// ---------------------------------------------------------------- ato (partida)

export function pageAct29(c: W29, id: string): Page29 | null {
  const s = c.s;
  const a = s?.acts[id];
  if (!s || !a) return null;
  if (!visibleAct(s, a) && !c.reveal) return futurePage29(`act:${id}`, a.name, T('artista', 'artist'));
  const y = s.year;
  const g = genreById[a.genre];
  const blocks: Block29[] = [];
  const kv: [string, Inline29[]][] = [
    [T('Gênero', 'Genre'), g ? [ln29(`genre:${g.id}`, tx(g.name))] : [a.genre]],
    [T('Cidade', 'City'), cityById[a.city] ? [ln29(`city:${a.city}`, tx(cityById[a.city].name))] : [a.city]],
    [T('Formação', 'Formed'), [String(a.formed)]],
    [T('Estreia', 'Debut'), [a.debutYear <= y ? String(a.debutYear) : T('ainda não estreou', 'not debuted yet')]],
    [T('Situação', 'Status'), [tx(STATUS_L[a.status])]],
    [T('Contrato', 'Signed to'), a.owner === 'player' ? [T('você', 'you')] : a.owner && s.labels[a.owner] ? [ln29(`label:${a.owner}`, s.labels[a.owner].name)] : [T('independente', 'independent')]],
  ];
  blocks.push({ k: 'kv', rows: kv });
  const mem = a.members.map((m) => s.persons[m]).filter((p): p is Person => !!p);
  if (mem.length) {
    blocks.push(H(T('Integrantes', 'Members')));
    blocks.push({ k: 'ul', items: mem.map((p) => [ln29(`person:${p.id}`, p.name), ` — ${roles29(p, y).join(' · ')}${p.alive ? '' : ' †'}`]) });
  }
  const ex = exMembers29(s, a);
  if (ex.length) {
    blocks.push(H(T('Ex-integrantes', 'Former members')));
    blocks.push({ k: 'ul', items: ex.map((x) => [ln29(`person:${x.pid}`, s.persons[x.pid]?.name ?? x.pid), ` — ${tx(REASON_L[x.reason])} ${x.year}`]) });
  }
  const rels = a.releases.map((r) => s.releases[r]).filter((r) => r && r.year <= y).slice(-24).reverse();
  if (rels.length) {
    blocks.push(H(T('Lançamentos', 'Releases')));
    blocks.push({ k: 'ul', items: rels.map((r) => [`${r.year} · ${r.title} (${tx(TYPE_L[r.type] ?? l(r.type))})${r.peak && r.peak < 999 ? ` · ${T('pico', 'peak')} #${r.peak}` : ''}`]) });
  }
  const aw = (s.awards ?? []).filter((x) => x.actId === id);
  if (aw.length) { blocks.push(H(T('Prêmios', 'Awards'))); blocks.push({ k: 'ul', items: aw.slice(-16).reverse().map((x) => [`${x.year} · ${x.name}${x.category ? ` (${x.category})` : ''}`]) }); }
  const rl = relics(s).list.filter((r) => r.a === id);
  if (rl.length) blocks.push(H(T('Relíquias', 'Relics')), { k: 'arts', items: rl.slice(0, 16).map((r) => ({ art: { k: 'relic', kind: r.k, name: tx(r.n), year: r.y, seed: r.id }, cap: `${tx(r.n)} (${r.y})`, link: r.rr ? `relic:${r.rr}` : undefined })) });
  // na sua partida
  const mine = playerActs(s).includes(id);
  const live: [string, Inline29[]][] = [
    [T('Fama (alcance)', 'Fame (reach)'), [`${Math.round(a.fame)}/100`]],
    [T('Fãs', 'Fans'), [Math.round(a.fans.casual + a.fans.active + a.fans.core).toLocaleString()]],
    [T('Sucessos', 'Hits'), [`${a.hits} top 10 · ${a.number1s} nº 1`]],
  ];
  if (mine) live.push([T('Confiança em você', 'Trust in you'), [`${Math.round(a.trust)}/100`]]);
  live.unshift([T('É seu?', 'Yours?'), [mine ? T('sim, no seu elenco', 'yes, on your roster') : T('não', 'no')]]);
  blocks.unshift({ k: 'live', rows: live });
  const rd = realDataOf(a);
  if (rd && s.config.realNames) blocks.push(...realActFacts29(c, rd as RArt29));
  return { id: `act:${id}`, title: a.name, kind: mem.length > 1 ? T('banda', 'band') : T('artista', 'artist'), art: { k: 'logo', seed: a.logoSeed, name: a.name, genre: a.genre, year: a.formed },
    crumbs: crumbs29('pessoas', 'acts'), blocks };
}

// ---------------------------------------------------------------- selo

export function pageLabel29(c: W29, id: string): Page29 | null {
  const s = c.s;
  if (s) {
    const lb = s.labels[id];
    if (!lb) return null;
    const vis = new Set(visible29(s).acts.map((a) => a.id));
    const roster = lb.roster.filter((r) => vis.has(r)).map((r) => s.acts[r]).filter(Boolean);
    const blocks: Block29[] = [
      { k: 'live', rows: [[T('Rivalidade com você', 'Rivalry with you'), [`${Math.round(s.rivalries[id] ?? 0)}/100`]], [T('Elenco', 'Roster'), [String(lb.roster.length)]], [T('Situação', 'Status'), [lb.active ? T('ativo', 'active') : `${T('fechou', 'closed')} ${lb.closedYear ?? ''}`]]] },
      { k: 'kv', rows: [[T('Cidade', 'City'), cityById[lb.city] ? [ln29(`city:${lb.city}`, tx(cityById[lb.city].name))] : [lb.city]], [T('Fundação', 'Founded'), [String(lb.founded)]],
        [T('Foco', 'Focus'), [lb.focus.length ? lb.focus.join(', ') : T('todos os gêneros', 'every genre')]], [T('Territórios', 'Territories'), [lb.territories.map((m) => tx(marketById[m]?.name ?? l(m))).join(', ')]]] },
    ];
    if (roster.length) blocks.push(H(T('Elenco visível', 'Visible roster')), { k: 'ul', items: roster.slice(0, 40).map((a) => [ln29(`act:${a.id}`, a.name)]) });
    blocks.push(P(T('A estratégia e as intenções do selo rival não aparecem aqui: você as descobre pelo que ele faz (veja ', 'The rival label\'s strategy and intentions are not shown here: you learn them from what it does (see '), ln29('mech:contracts', T('Contratos e rivais', 'Contracts and rivals')), ').'));
    return { id: `label:${id}`, title: lb.name, kind: T('gravadora', 'label'), art: { k: 'logo', seed: hash(lb.id), name: lb.name, genre: lb.focus[0] ?? 'pop', year: lb.founded }, crumbs: crumbs29('pessoas', 'labels'), blocks };
  }
  const x = staticLabels29().find((y) => y.id === id);
  if (!x) return null;
  return { id: `label:${id}`, title: x.real ?? x.name, kind: T('gravadora', 'label'), art: { k: 'logo', seed: hash(x.id), name: x.name, genre: x.focus[0] ?? 'pop', year: x.founded }, crumbs: crumbs29('pessoas', 'labels'),
    blocks: [{ k: 'kv', rows: [[T('Nome fictício', 'Fictional name'), [x.name]], ...(x.real ? [[T('Nome real', 'Real name'), [x.real]] as [string, Inline29[]]] : []), [T('Cidade', 'City'), cityById[x.city] ? [ln29(`city:${x.city}`, tx(cityById[x.city].name))] : [x.city]],
      [T('Fundação', 'Founded'), [String(x.founded)]], [T('Perfil', 'Profile'), [tx(x.arch)]]] },
    P(T('Numa partida, o selo ganha líder, caixa, elenco e memória da rivalidade com você — veja ', 'In a run, the label gets a head, cash, roster and a memory of its rivalry with you — see '), ln29('mech:contracts', T('Contratos e rivais', 'Contracts and rivals')), '.')] };
}

// ---------------------------------------------------------------- catálogo real (sem partida)

export function pageRealAct29(c: W29, slug: string): Page29 | null {
  const a = realCat29().artBy.get(slug);
  if (!a) return null;
  if (hidden29(c, a.d)) return futurePage29(`ract:${slug}`, a.n, T('artista real', 'real artist'));
  const g = genreById[a.g];
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('Gênero', 'Genre'), g ? [ln29(`genre:${g.id}`, tx(g.name))] : [a.g]],
    [T('Cidade', 'City'), cityById[a.c] ? [ln29(`city:${a.c}`, tx(cityById[a.c].name))] : [a.c]],
    ...(a.cn ? [[T('País', 'Country'), [ln29(`country:${a.cn}`, a.cn)]] as [string, Inline29[]]] : []),
    [T('Porte', 'Stature'), [a.t === 1 ? T('estrela global', 'global star') : a.t === 2 ? T('grande nome', 'big name') : T('nome regional/cult', 'regional/cult name')]],
    ...(a.z ? [[T('Base de dados', 'Database'), [a.z === 1 ? T('entra a partir da base média', 'from the medium database up') : a.z === 2 ? T('entra a partir da base grande', 'from the large database up') : T('só na base enorme', 'only in the huge database')]] as [string, Inline29[]]] : []),
  ] }];
  if (!a.m?.length && a.b) blocks.push(P(ln29(`rp:${slug29(a.n)}`, T('Ver a pessoa', 'See the person')), ` — ${roleName29(a.r ?? 'vocal')}`));
  blocks.push(...realActFacts29(c, a, T('Biografia', 'Biography')));
  if (!c.s) blocks.push(...actLore29(a), H(T('Ficha de jogo', 'Game sheet')), { k: 'ref', who: 'act', name: a.n, year: a.d });
  blocks.push(P(T('Numa partida com nomes reais, este artista surge no ano da estreia e segue a história real (modo exato) ou diverge dela (história alternativa) — veja ', 'In a run with real names, this act appears in its debut year and follows real history (exact mode) or diverges from it (alternate history) — see '), ln29('mech:modes', T('Modos', 'Modes')), '.'));
  const look = !a.m?.length ? realLook15(a.n, a.d + 2) ?? undefined : undefined;
  return { id: `ract:${slug}`, title: a.n, kind: a.m?.length ? T('banda real', 'real band') : T('artista real', 'real artist'),
    art: look ? { k: 'portrait', id: `r:${slug}`, look, born: a.b, year: a.d + 2 } : { k: 'logo', seed: hash(a.n), name: a.n, genre: a.g, year: a.f ?? a.d },
    crumbs: crumbs29('pessoas', 'acts'), blocks };
}

export function pageRealPerson29(c: W29, slug: string): Page29 | null {
  const rp = realCat29().perBy.get(slug);
  if (!rp) return null;
  const first = rp.acts[0]?.per[0]?.[0];
  if (hidden29(c, first)) return futurePage29(`rp:${slug}`, rp.n, T('pessoa real', 'real person'));
  const yr = Math.min(year29(c), (first ?? 1960) + 3);
  const look = realLook15(rp.n, yr) ?? undefined;
  const extra = roles29({ name: rp.n, role: rp.role }, year29(c));
  const blocks: Block29[] = [{ k: 'kv', rows: [[T('Funções', 'Roles'), [extra.join(' · ')]]] }, ...realPersonFacts29(c, rp, T('Biografia', 'Biography'))];
  blocks.push(P(T('O visual é o "visual famoso" da época, desenhado na arte procedural do jogo (sem foto).', 'The look is the era\'s "famous look", drawn in the game\'s procedural art (no photo).')));
  if (!c.s) {
    const cat = realCat29();
    blocks.push(...personLore29(rp, (sl) => cat.perBy.has(sl)));
    // ficha de jogo: partida de referência no ano da primeira estreia (é quando a pessoa entra no mundo)
    const deb = Math.min(...rp.acts.map((x) => cat.artBy.get(x.slug)?.d ?? 9999));
    blocks.push(H(T('Ficha de jogo: atributos, talento inicial e potencial', 'Game sheet: attributes, starting talent and potential')), { k: 'ref', who: 'person', name: rp.n, year: deb < 9999 ? deb : first ?? 1960 });
  }
  return { id: `rp:${slug}`, title: rp.n, kind: T('pessoa real', 'real person'), art: { k: 'portrait', id: `r:${slug}`, look, born: rp.b, role: rp.role, year: yr }, crumbs: crumbs29('pessoas', 'persons'), blocks };
}

// ---------------------------------------------------------------- profissionais (base real)

export const PRODS29 = (): RealProd[] => [...REAL_PRODS, ...PRODS18.filter((p) => !REAL_PRODS.some((q) => q.id === p.id))];
export const MGRS29 = (): RealMgr[] => [...REAL_MGRS, ...MGRS18.filter((p) => !REAL_MGRS.some((q) => q.id === p.id))];
export interface Crit29 { slug: string; name: string; outlet: string; from: number; to: number; favors: string[]; dislikes: string[]; mainstream: number; harsh: number; prestige: number; note?: string; region: string; real: boolean }
let CRITS: Crit29[] | null = null;
export function critics29(): Crit29[] {
  if (CRITS) return CRITS;
  const out: Crit29[] = [];
  const seen = new Set<string>();
  for (const k of CRITICS17) { const sl = slug29(k.name); if (seen.has(sl)) continue; seen.add(sl); out.push({ slug: sl, name: k.name, outlet: k.outlet, from: k.from, to: k.to, favors: k.favors, dislikes: k.dislikes, mainstream: k.mainstream, harsh: k.harsh, prestige: k.prestige, note: tx(k.note), region: k.region, real: !!k.real }); }
  for (const k of REGIONAL_CRITICS) { const sl = slug29(k.name); if (seen.has(sl)) continue; seen.add(sl); out.push({ slug: sl, name: k.name, outlet: k.outlet, from: k.from, to: k.to, favors: k.favors, dislikes: k.dislikes, mainstream: k.mainstream, harsh: k.harsh, prestige: k.prestige, region: k.region, real: !!k.realRef }); }
  return (CRITS = out.sort((x, y) => x.name.localeCompare(y.name)));
}

function works(c: W29, xs: [string, string, number][]): { items: Inline29[][]; hid: number } {
  let hid = 0;
  const items: Inline29[][] = [];
  for (const [w, a, y] of xs) { if (hidden29(c, y)) { hid++; continue; } items.push([`${w} — ${a} (${y})`]); }
  return { items, hid };
}

export function pageProd29(c: W29, id: string): Page29 | null {
  const p = PRODS29().find((x) => x.id === id);
  if (!p) return null;
  if (hidden29(c, p.from)) return futurePage29(`prod:${id}`, p.name, T('produtor(a)', 'producer'));
  const w = works(c, p.w);
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('Atividade', 'Active'), [span29(p.from, hidden29(c, p.to) ? undefined : p.to)]], [T('Base', 'Base'), [p.studio, ' · ', cityById[p.city] ? ln29(`city:${p.city}`, tx(cityById[p.city].name)) : p.city]],
    ...(p.born ? [[T('Nascimento', 'Born'), [String(p.born)]] as [string, Inline29[]]] : []), ...(p.died && !hidden29(c, p.died) ? [[T('Morte', 'Died'), [String(p.died)]] as [string, Inline29[]]] : []),
    [T('Som', 'Sound'), [tx(p.snd)]], [T('Faixa de cachê', 'Fee tier'), [`${p.tier}/5`]],
    [T('Habilidade de produção', 'Production skill'), [`${p.skill}/100`]], [T('Ego', 'Ego'), [`${p.ego}/100`]],
    [T('Efeito do som (produção · performance · originalidade)', 'Sound effect (production · performance · originality)'), [p.fx.map((x) => (x > 0 ? `+${x}` : String(x))).join(' · ')]],
    [T('Famílias de gênero', 'Genre families'), [p.fam.join(', ')]], [T('Assinatura (catálogo antigo)', 'Signature (old catalog)'), [p.sig]],
    ...ATTR13_IDS.map((k, i) => [tx(ATTR13[k][0]), [`${p.a[i]}/100`]] as [string, Inline29[]]),
  ] }, ...safeP29(c, tx(p.bio))];
  if (w.items.length) blocks.push(H(T('Obras', 'Works')), { k: 'ul', items: w.items });
  if (w.hid) blocks.push({ k: 'spoiler', n: w.hid });
  blocks.push(P(T('Contrate pelo estúdio; o jantar no estúdio melhora a relação — veja ', 'Hire through the studio; a studio dinner improves the relationship — see '), ln29('mech:music', T('Projetos e estúdio', 'Projects and studio')), '.'));
  return { id: `prod:${id}`, title: p.name, kind: T('produtor(a)', 'producer'), art: { k: 'staff', id: `pd:${p.id}`, role: 'producer', year: Math.min(year29(c), p.from + 5), born: p.born }, crumbs: crumbs29('pessoas', 'prods'), blocks };
}

export function pageMgr29(c: W29, id: string): Page29 | null {
  const m = MGRS29().find((x) => x.id === id);
  if (!m) return null;
  if (hidden29(c, m.from)) return futurePage29(`mgr:${id}`, m.name, T('empresário(a)', 'manager'));
  let clh = 0;
  const cl = { items: [] as Inline29[][], hid: 0 };
  for (const [a, f, t0] of m.cl) { if (hidden29(c, f)) { clh++; continue; } if (hidden29(c, t0)) clh++; cl.items.push([`${a} (${span29(f, hidden29(c, t0) ? undefined : t0)})`]); }
  cl.hid = clh;
  const blocks: Block29[] = [{ k: 'kv', rows: [
    [T('Atividade', 'Active'), [span29(m.from, hidden29(c, m.to) ? undefined : m.to)]], [T('Cidade', 'City'), cityById[m.city] ? [ln29(`city:${m.city}`, tx(cityById[m.city].name))] : [m.city]],
    [T('Estilo', 'Style'), [`${tx(MGR_STYLE[m.style][0])} — ${tx(MGR_STYLE[m.style][1])}`]], [T('Comissão típica', 'Typical commission'), [`${Math.round(m.rate * 100)}%`]],
    [T('Famílias de gênero', 'Genre families'), [m.fam.join(', ')]],
    ...ATTR13_IDS.map((k, i) => [tx(ATTR13[k][0]), [`${m.a[i]}/100`]] as [string, Inline29[]]),
    ...Object.entries(m.f ?? {}).map(([k, v]) => [k, [`${v}/100`]] as [string, Inline29[]]),
  ] }, ...safeP29(c, tx(m.bio))];
  if (cl.items.length) blocks.push(H(T('Clientes', 'Clients')), { k: 'ul', items: cl.items });
  if (cl.hid) blocks.push({ k: 'spoiler', n: cl.hid });
  blocks.push(P(T('O empresário senta à mesa quando você negocia com o cliente dele — veja ', 'The manager sits at the table when you negotiate with their client — see '), ln29('mech:contracts', T('Contratos', 'Contracts')), '.'));
  return { id: `mgr:${id}`, title: m.name, kind: T('empresário(a)', 'manager'), art: { k: 'staff', id: `e:${m.id}`, role: 'manager', year: Math.min(year29(c), m.from + 5), born: m.born }, crumbs: crumbs29('pessoas', 'mgrs'), blocks };
}

export function pageExec29(c: W29, rid: string): Page29 | null {
  const e = REAL_EXECS.find((x) => x.rid === rid);
  if (!e) return null;
  if (hidden29(c, e.y)) return futurePage29(`exec:${rid}`, e.name, T('executivo(a)', 'executive'));
  const lb = staticLabels29().find((x) => x.id === e.label);
  return { id: `exec:${rid}`, title: e.name, kind: T('executivo(a) de gravadora', 'label executive'), art: { k: 'staff', id: `l:${e.rid}`, role: 'exec', year: Math.min(year29(c), e.y + 3), born: e.born }, crumbs: crumbs29('pessoas', 'execs'),
    blocks: [{ k: 'kv', rows: [[T('Selo', 'Label'), lb ? [ln29(`label:${lb.id}`, lb.real ?? lb.name)] : [e.label]], [T('No comando desde', 'In charge since'), [String(e.y)]], [T('Nascimento', 'Born'), [String(e.born)]], [T('Formação', 'Background'), [e.bg]], [T('Estilo de gestão', 'Management style'), [e.style]],
      ...(e.died && !hidden29(c, e.died) ? [[T('Morte', 'Died'), [String(e.died)]] as [string, Inline29[]]] : [])] }, ...safeP29(c, tx(l(e.pt, e.en)))] };
}

export function pageCritic29(c: W29, slug: string): Page29 | null {
  const k = critics29().find((x) => x.slug === slug);
  if (!k) return null;
  if (hidden29(c, k.from)) return futurePage29(`critic:${slug}`, k.name, T('crítico(a)', 'critic'));
  const out = OUTLETS17.find((o) => o.real === k.outlet || o.name === k.outlet);
  return { id: `critic:${slug}`, title: k.name, kind: T('crítico(a)', 'critic'), art: { k: 'staff', id: `c:${slug}`, role: 'critic', year: Math.min(year29(c), k.from + 5) }, crumbs: crumbs29('pessoas', 'critics'),
    blocks: [{ k: 'kv', rows: [[T('Veículo', 'Outlet'), out ? [ln29(`outlet:${out.id}`, k.outlet)] : [k.outlet]], [T('Atividade', 'Active'), [span29(k.from, hidden29(c, k.to) ? undefined : k.to)]],
      [T('Prefere', 'Favors'), [k.favors.join(', ') || '—']], [T('Não gosta de', 'Dislikes'), [k.dislikes.join(', ') || '—']],
      [T('Gosto (−1 alternativo … +1 popular)', 'Taste (−1 alternative … +1 mainstream)'), [String(k.mainstream)]], [T('Rigor (0 generoso … 1 duro)', 'Harshness (0 kind … 1 harsh)'), [String(k.harsh)]], [T('Prestígio', 'Prestige'), [`${k.prestige}/100`]],
      [T('Região', 'Region'), [k.region]], [T('Origem', 'Source'), [k.real ? T('pessoa real', 'real person') : T('personagem do jogo', 'game character')]]] },
    ...(k.note ? safeP29(c, k.note) : []), P(T('Críticos dão notas que mexem nas vendas das primeiras semanas — veja ', 'Critics give scores that move first-weeks sales — see '), ln29('mech:press', T('Imprensa e críticos', 'Press and critics')), '.')] };
}

// ---------------------------------------------------------------- comuns

/** Página "ainda não chegou na sua partida" (spoiler): mostra só o nome e o botão de revelar. */
export function futurePage29(id: string, title: string, kind: string): Page29 {
  return { id, title, kind, crumbs: [{ id: 'home', label: T('Início', 'Home') }], blocks: [
    { k: 'note', hue: 'warn', t: T('Ainda não chegou na sua partida', 'Not in your run yet'), x: [T('Isto pertence a um ano depois da data da partida. A wiki esconde o futuro para não estragar surpresas.', 'This belongs to a year after the run\'s date. The wiki hides the future so it doesn\'t spoil surprises.')] },
    { k: 'spoiler', n: 1 },
  ] };
}

const LIST_L: Record<string, [string, string]> = {
  persons: ['Pessoas', 'People'], acts: ['Artistas e bandas', 'Artists and bands'], labels: ['Gravadoras', 'Labels'], prods: ['Produtores', 'Producers'], mgrs: ['Empresários', 'Managers'],
  execs: ['Executivos', 'Executives'], critics: ['Críticos', 'Critics'], outlets: ['Veículos de imprensa', 'Media outlets'], cities: ['Cidades', 'Cities'], countries: ['Países', 'Countries'],
  genres: ['Gêneros', 'Genres'], movements: ['Movimentos', 'Movements'], eras: ['Eras', 'Eras'], techs: ['Tecnologias', 'Technologies'], venues: ['Casas de shows', 'Venues'], orgs: ['Organizações do submundo', 'Underworld organizations'],
  decades: ['Linha do tempo', 'Timeline'], cats: ['Regras e dados', 'Rules and data'], catitems: ['Itens de regras e dados', 'Rules and data items'], events: ['Marcos da linha do tempo', 'Timeline milestones'],
  relics: ['Relíquias', 'Relics'], gear: ['Equipamento', 'Gear'], merch: ['Merch', 'Merch'], vehicles: ['Veículos de turnê', 'Tour vehicles'], mech: ['Mecânicas', 'Mechanics'], glossario: ['Glossário', 'Glossary'], faq: ['Perguntas frequentes', 'FAQ'],
};
export const listLabel29 = (k: string): string => (LIST_L[k] ? T(LIST_L[k][0], LIST_L[k][1]) : k);
const SEC_L: Record<string, [string, string]> = { tempo: ['Linha do tempo', 'Timeline'], dados: ['Regras e dados', 'Rules and data'], pessoas: ['Personagens', 'Characters'], mech: ['Mecânicas', 'Mechanics'], mundo: ['Mundo', 'World'], objetos: ['Objetos', 'Objects'], glossario: ['Glossário', 'Glossary'], faq: ['Perguntas frequentes', 'FAQ'] };
/** Migalhas: Início › Seção › Lista */
export function crumbs29(sec: string, list?: string): { id: string; label: string }[] {
  const out = [{ id: 'home', label: T('Início', 'Home') }];
  if (SEC_L[sec]) out.push({ id: `idx:${sec}`, label: T(SEC_L[sec][0], SEC_L[sec][1]) });
  if (list && list !== sec) out.push({ id: `idx:${list}`, label: listLabel29(list) });
  return out;
}
