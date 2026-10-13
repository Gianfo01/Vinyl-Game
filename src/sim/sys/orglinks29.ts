// Rodada 29 (Submundo) — FONTE CANÔNICA das ligações pessoa ↔ organização criminosa. Pedido do autor: "acho que as
// ligações dos crimes com personagens não refletem: em uma menciona Frank Sinatra, mas em membros ele não aparece".
//
// Causa raiz: cada vista lia um pedaço diferente.
//  - card da organização: os laços documentados (ORGS17.ties) eram TEXTO por nome ("Frank Sinatra (1960): …"), sem
//    ligar à pessoa do mundo; "Membros conhecidos" lia só crimemem23; "Andam com eles" só crime17.ties (atos);
//  - ficha da pessoa (Conexões › Submundo): só crime17.ties do ato e o registro de crimes — nenhum laço documentado,
//    nenhuma filiação (crimemem23), nenhuma dívida/favor (holds17);
//  - menu de ações e busca: nada.
// Agora as vistas leem daqui (orgLinks29 / linksOfKey29), então o que aparece no card de uma organização aparece na
// ficha da pessoa — por construção — com o rótulo do tipo: ligação documentada · membro · associado · deve favor ·
// a família deve a ele(a) · inimizade · sócio. Só leitura: sem RNG e sem escrever no estado (cache por semana).
//
// Regra de história (a mesma da crônica DOC17): no modo "Vida real exata" valem todos os laços documentados até o ano
// atual; nos modos livres, só os documentados ANTES do início da partida — depois disso a história é simulada
// (filiações do crimemem23, laços de rua do crimenpc17, dívidas e favores do holds17 e do mob29).

import { REAL_MGRS } from '../../data/managers14';
import { REAL_PRODS } from '../../data/producers15';
import { ORGS17 } from '../../data/orgs17';
import { l, type L } from '../../data/world';
import { allHolds, holds17, type Hold } from '../holds17';
import { histMode } from '../history15';
import type { GameState } from '../types';
import { crime17, orgById, type Mem23 } from './crime17';
import { leaders } from './leaders10';
import { mgrKey } from './managers14';
import { canon16, keys16 } from './people16';
import { prodKey } from './producers15';
import { canonKey } from './realworld';

export type OrgLinkKind29 = 'doc' | 'member' | 'assoc' | 'owes' | 'owed' | 'enemy' | 'partner';
export interface OrgLink29 {
  /** id da organização (sem 'o:') */
  o: string;
  /** quem: 'p:<pessoa>', 'l:'/'e:'/'pd:'/'s:' (indústria), id de ato, id de selo ou 'player' */
  key: string;
  kind: OrgLinkKind29;
  /** o porquê (texto do laço, motivo da filiação, texto da obrigação) */
  text: L;
  /** ano (laço documentado) */
  y?: number;
  /** filiação: 0 segredo · 1 boato · 2 confirmado */
  k?: 0 | 1 | 2;
  /** de onde veio: 'doc' (ORGS17.ties), 'mem23', 'tie17', 'holds17', 'mob29' */
  src: string;
  /** ligação herdada de um ato (pessoa da formação atual) */
  via?: string;
  /** obrigação de origem */
  hold?: string;
}

export const LINK29: Record<OrgLinkKind29, L> = {
  doc: l('ligação documentada', 'documented tie'),
  member: l('membro', 'member'),
  assoc: l('associado', 'associate'),
  owes: l('deve favor', 'owes a favor'),
  owed: l('a família deve a ele(a)', 'the family owes them'),
  enemy: l('inimizade', 'bad blood'),
  partner: l('sócio(a)', 'partner'),
};

// ---------------------------------------------------------------- quem é quem (nome → chave)

const NAMES = new WeakMap<GameState, { k: string; m: Map<string, string> }>();
/** Chave da pessoa do mundo com esse nome (artista 'p:', empresário 'e:', produtor 'pd:', líder 'l:'); null se não há. */
export function resolveWho29(s: GameState, name: string): string | null {
  const nk = canonKey(name);
  const ck = `${s.year}|${Object.keys(s.persons).length}`;
  let c = NAMES.get(s);
  if (!c || c.k !== ck) {
    const m = new Map<string, string>();
    // pessoas do banco: prefere quem está num ato do catálogo (a pessoa real), depois a mais antiga
    for (const p of Object.values(s.persons)) { const k = canonKey(p.name); if (!m.has(k)) m.set(k, `p:${p.id}`); }
    for (const a of Object.values(s.acts)) if (a.catalogNo) for (const id of a.members) { const p = s.persons[id]; if (p) m.set(canonKey(p.name), `p:${p.id}`); }
    c = { k: ck, m };
    NAMES.set(s, c);
  }
  const hit = c.m.get(nk);
  if (hit) return hit;
  const mg = REAL_MGRS.find((x) => canonKey(x.name) === nk);
  if (mg) return canonOf(s, mgrKey(mg.id));
  const pr = REAL_PRODS.find((x) => canonKey(x.name) === nk);
  if (pr) return canonOf(s, prodKey(pr.id));
  const L0 = Object.values(leaders(s)?.L ?? {}).find((x) => canonKey(x.name) === nk);
  if (L0) return canonOf(s, `l:${L0.id}`);
  return null;
}
const canonOf = (s: GameState, key: string): string => { try { return canon16(s, key); } catch { return key; } };

/** Laços documentados que valem agora (regra de história acima). */
export function docTies29(s: GameState): { o: string; who: string; y: number; text: L }[] {
  const strict = histMode(s) === 'strict';
  const out: { o: string; who: string; y: number; text: L }[] = [];
  for (const o of ORGS17) for (const t of o.ties ?? []) if (t.y <= s.year && (strict || t.y < s.config.startYear)) out.push({ o: o.id, who: t.who, y: t.y, text: t.text });
  return out;
}

// ---------------------------------------------------------------- índice

/** Chave de vista: pessoa do banco vira 'p:'; o resto fica como está. */
export function viewKey29(s: GameState, id: string): string {
  if (!id || id === 'player') return id;
  if (id.startsWith('p:') || /^(e|pd|l|s|c|o):/.test(id)) return id;
  if (s.persons[id]) return `p:${id}`;
  return id; // ato, selo ou chave livre
}
const holdKind = (h: Hold): OrgLinkKind29 | null => (h.kind === 'grievance' ? 'enemy' : h.kind === 'favor' || h.kind === 'debt' || h.kind === 'secret' || h.kind === 'blackmail' ? 'owes' : null);

interface Ix29 { k: string; all: OrgLink29[]; byO: Map<string, OrgLink29[]>; byK: Map<string, OrgLink29[]>; unresolved: { o: string; who: string }[] }
const IX = new WeakMap<GameState, Ix29>();

function index29(s: GameState): Ix29 {
  const st = crime17(s);
  const mem = st.mem23 ?? {};
  const mob = (s.x4 as unknown as { mob29?: { seq?: number; o?: Record<string, { partner?: 1 }> } }).mob29;
  const k = `${s.week}|${s.year}|${holds17(s).seq}|${holds17(s).h.length}|${Object.keys(mem).length}|${Object.values(mem).reduce((t, m) => t + m.k, 0)}|${Object.keys(st.ties).length}|${mob?.seq ?? 0}`;
  const c = IX.get(s);
  if (c && c.k === k) return c;
  const all: OrgLink29[] = [];
  const unresolved: { o: string; who: string }[] = [];
  // 1) laços documentados (o caso Frank Sinatra × Chicago Outfit)
  for (const t of docTies29(s)) {
    const key = resolveWho29(s, t.who);
    if (!key) { unresolved.push({ o: t.o, who: t.who }); continue; }
    all.push({ o: t.o, key, kind: 'doc', text: t.text, y: t.y, src: 'doc' });
  }
  // 2) filiações (crimemem23): membro, com o nível do que se sabe
  for (const [key, m] of Object.entries(mem) as [string, Mem23][]) all.push({ o: m.o, key, kind: 'member', text: m.why[0] ?? l('membro', 'member'), k: m.k, src: 'mem23' });
  // 3) atos que andam com a gangue (crimenpc17): associados
  for (const [aid, oid] of Object.entries(st.ties)) if (s.acts[aid]) all.push({ o: oid, key: aid, kind: 'assoc', text: l('anda com eles (proteção e credibilidade de rua)', 'runs with them (protection and street cred)'), src: 'tie17' });
  // 4) obrigações (holds17): quem deve favor/dívida à família, quem ela guarda segredo, mágoas; e o que ela deve
  for (const h of allHolds(s)) {
    if (h.holder.startsWith('o:') && orgById(s, h.holder)) {
      const kind = holdKind(h);
      if (kind) all.push({ o: h.holder.slice(2), key: viewKey29(s, h.target), kind, text: h.text, src: h.src === 'mob29' ? 'mob29' : 'holds17', hold: h.id });
    } else if (h.target.startsWith('o:') && orgById(s, h.target) && (h.kind === 'favor' || h.kind === 'debt' || h.kind === 'loyalty')) {
      all.push({ o: h.target.slice(2), key: viewKey29(s, h.holder), kind: 'owed', text: h.text, src: h.src === 'mob29' ? 'mob29' : 'holds17', hold: h.id });
    }
  }
  // 5) sociedade com o jogador (mob29)
  for (const [oid, x] of Object.entries(mob?.o ?? {})) if (x.partner) all.push({ o: oid, key: 'player', kind: 'partner', text: l('sócio(a) nos negócios da família', 'partner in the family business'), src: 'mob29' });
  const byO = new Map<string, OrgLink29[]>(), byK = new Map<string, OrgLink29[]>();
  for (const x of all) {
    (byO.get(x.o) ?? byO.set(x.o, []).get(x.o)!).push(x);
    (byK.get(x.key) ?? byK.set(x.key, []).get(x.key)!).push(x);
  }
  const out = { k, all, byO, byK, unresolved };
  IX.set(s, out);
  return out;
}

/** O que a vista pode mostrar: filiação secreta (k = 0) só aparece para quem já sabe (o jogador ainda não). */
const shown = (x: OrgLink29, all: boolean) => all || x.kind !== 'member' || (x.k ?? 0) >= 1;
const ORDER: Record<OrgLinkKind29, number> = { partner: 0, doc: 1, member: 2, assoc: 3, owes: 4, owed: 5, enemy: 6 };
const sort = (xs: OrgLink29[]) => xs.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (b.k ?? 0) - (a.k ?? 0) || (a.y ?? 0) - (b.y ?? 0));

/** Ligações de uma organização (card do Submundo). `all` inclui filiações secretas (auditoria/testes). */
export function orgLinks29(s: GameState, oid: string, all = false): OrgLink29[] {
  const id = oid.replace(/^o:/, '');
  return sort((index29(s).byO.get(id) ?? []).filter((x) => shown(x, all)));
}

/**
 * Ligações de alguém (ficha da pessoa, página do ato/selo, menu de ações). Pessoa: as dela em todos os papéis (artista,
 * empresário, produtor, líder — people16.keys16) e as dos atos em que está agora (marcadas `via`).
 */
export function linksOfKey29(s: GameState, id: string, all = false): OrgLink29[] {
  const key = viewKey29(s, id);
  const ix = index29(s);
  const keys = new Set([key]);
  try { for (const k of keys16(s, key)) keys.add(k); } catch { /* sem índice de identidade */ }
  const out: OrgLink29[] = [];
  for (const k of keys) out.push(...(ix.byK.get(k) ?? []));
  if (key.startsWith('p:')) {
    const pid = key.slice(2);
    for (const a of Object.values(s.acts)) if (a.members.includes(pid) && a.status !== 'retired' && a.status !== 'split') for (const x of ix.byK.get(a.id) ?? []) out.push({ ...x, key, via: a.id });
  }
  return sort(out.filter((x) => shown(x, all)));
}

/** Laços documentados cujo nome não achou ninguém no mundo (a pessoa ainda não existe / não nasceu): informativo. */
export const unresolved29 = (s: GameState): { o: string; who: string }[] => index29(s).unresolved;

/** Pares (organização, chave, tipo) — para a auditoria comparar os dois lados. */
export const linkId29 = (x: Pick<OrgLink29, 'o' | 'key' | 'kind' | 'hold'>): string => `${x.o}|${x.key}|${x.kind}|${x.hold ?? ''}`;
export const allLinks29 = (s: GameState): OrgLink29[] => index29(s).all;
