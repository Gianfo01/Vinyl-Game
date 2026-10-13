// R29 (CONNECT): auditoria de consistência pessoa ↔ ato ↔ biografia ↔ formação. Só LÊ o estado (sem RNG, sem
// gancho): usada por scripts/audit29connect.ts (antes/depois, várias sementes × anos × mundos) e por
// tests/r29-connect.test.ts. Cada achado tem um código curto; a contagem por código é o número do relatório.
//
// Códigos:
//  R1  pessoa real dentro (ou ex) de um ato real que nunca a teve, sem troca simulada que explique (o caso
//      "Roger Waters ex-Led Zeppelin")
//  R1s idem, mas explicado por uma troca da simulação (história alternativa) — só informativo fora do modo exato
//  R2  ex-integrante listado no ato que não aparece nos atos de carreira da pessoa (ficha → Carreira/Trajetória/Alma)
//  R3  ato de carreira da pessoa que não a lista como integrante nem ex-integrante
//  R4  datas: formação depois da estreia, passagem que termina antes de começar, entrada antes de nascer
//  R5  parentesco assimétrico (A é parente de B, B não é de A) ou romance com pessoa inexistente
//  R6  falecido(a) mostrado(a) como integrante atual de ato ativo; morte antes do nascimento; vivo com ano de morte
//  R7  autoria: compositor(a) inexistente, ou música do lançamento de outro ato
//  R7m crédito para ex-integrante que já tinha saído antes da música (formação provisória da criação do mundo)
//  R8  identidade partida: a mesma pessoa real (nome canônico) em duas Pessoas diferentes
//  R9  índice nome → pessoa (rw.pid) apontando para alguém com outro nome (a causa raiz do caso Roger Waters)
//  R10 organização ↔ pessoa assimétrica: ligação (documentada, membro, associado, favor/dívida, inimizade, sócio) que
//      aparece num lado (card da organização) e não no outro (ficha da pessoa/ato), ou laço documentado de alguém que
//      existe no mundo e não foi ligado à pessoa (o caso "Frank Sinatra citado na Outfit, ausente dos membros")
import { HOMONYMS27, workOf27 } from '../data/model27';
import { REAL_CLASSIC } from '../data/realacts_classic';
import { REAL_ACTS } from '../data/realnames';
import { periodsOf } from '../data/realtypes';
import { histAltered, histMode } from './history15';
import { chronState } from './sys/chron9';
import { kinOf15 } from './sys/kin15';
import { careerActs29, exMembers29 } from './sys/connect29';
import { allLinks29, docTies29, linkId29, linksOfKey29, orgLinks29, unresolved29 } from './sys/orglinks29';
import { l16, stints16 } from './sys/lineup16';
import { P } from './sys/people/state';
import { canonKey, REAL_ALL, realDataOf, rw } from './sys/realworld';
import type { Act, GameState } from './types';

/** Atos que cada vista da ficha da pessoa mostra (c = Carreira → Atos, a = Alma → Bandas, t = Trajetória).
 *  Antes da R29 eram três fontes (só formação atual; chron9.mem; path16) — agora as três leem careerActs29. */
export function views29(s: GameState, pid: string): Record<string, Set<string>> {
  const ids = new Set(careerActs29(s, pid).map((x) => x.act.id));
  return { c: ids, a: ids, t: ids };
}

export interface Finding29 { code: string; msg: string }

let REALN: Set<string> | null = null;
/** Todos os nomes reais canônicos (integrantes e solos) da base. */
export function realNames29(): Set<string> {
  if (REALN) return REALN;
  const m = new Set<string>();
  for (const a of REAL_ALL) { if (!a.m?.length) m.add(canonKey(a.n)); for (const x of a.m ?? []) m.add(canonKey(x[0])); }
  for (const [no, ex] of Object.entries(REAL_CLASSIC)) { const n = REAL_ACTS[+no]?.name; if (n && !ex.m?.length) m.add(canonKey(n)); for (const x of ex.m ?? []) m.add(canonKey(x[0])); }
  return (REALN = m);
}

/** Nomes canônicos que o ato real teve (integrantes documentados; o próprio nome se for solo). */
function actRealNames(a: Act): Set<string> | undefined {
  const d = realDataOf(a);
  if (!d) return undefined;
  const out = new Set<string>();
  if (d.m?.length) for (const m of d.m) out.add(canonKey(m[0]));
  else out.add(canonKey(d.n));
  return out;
}

const live = (a: Act) => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';

export function audit29(s: GameState): Finding29[] {
  const out: Finding29[] = [];
  const add = (code: string, msg: string) => out.push({ code, msg });
  const st = rw(s), ev = l16(s).ev;
  const acts = Object.values(s.acts);
  const real = !!s.config.realNames;
  const strict = histMode(s) === 'strict';
  const RN = realNames29();
  const nm = (id: string) => s.persons[id]?.name ?? id;

  // R1 / R1s — pessoas reais em atos reais que não as tiveram
  if (real) {
    for (const a of acts) {
      const names = actRealNames(a);
      if (!names) continue;
      const ids = new Set([...a.members, ...(st.former[a.id] ?? []).map((f) => f.personId)]);
      for (const id of ids) {
        const p = s.persons[id];
        if (!p) continue;
        const k = canonKey(p.name);
        if (names.has(k) || !RN.has(k)) continue;
        const sim = ev.some((e) => e[1] === a.id && e[2] === id && e[3] === 'j');
        if (sim && !(strict && !histAltered(s, a))) add('R1s', `${p.name} em ${a.name} (troca simulada)`);
        else add('R1', `${p.name} (${id}) em ${a.name} (${a.id}) sem registro real nem troca simulada`);
      }
    }
  }

  // R2 — ex-integrante do ato que a ficha da pessoa não mostra
  for (const a of acts) {
    for (const f of st.former[a.id] ?? []) {
      if (!s.persons[f.personId] || a.members.includes(f.personId)) continue;
      for (const [v, ids] of Object.entries(views29(s, f.personId))) if (!ids.has(a.id)) add(`R2${v}`, `${nm(f.personId)} ex-${a.name} fora de ${v}`);
    }
  }

  // R3 — ato de carreira da pessoa cuja página não a lista (integrantes + ex-integrantes)
  const c = chronState(s);
  const onPage = (a: Act, pid: string) => a.members.includes(pid) || exMembers29(s, a).some((x) => x.pid === pid);
  for (const pid of Object.keys(s.persons)) for (const x of careerActs29(s, pid)) if (x.act.id !== s.persons[pid].parentId && !onPage(x.act, pid)) add('R3', `${nm(pid)} tem ${x.act.name} na carreira, mas a página do ato não o(a) lista`);
  // R3l — informativo: passagem só na crônica (o log de formação não pegou a troca; ex.: 1º mês depois de carregar)
  const isIn = (a: Act, pid: string) => a.members.includes(pid) || (st.former[a.id] ?? []).some((f) => f.personId === pid) || ev.some((e) => e[1] === a.id && e[2] === pid);
  for (const [pid, list] of Object.entries(c.mem)) {
    if (!s.persons[pid]) continue;
    for (const x of list) { const a = s.acts[x.split(':')[0]]; if (a && !isIn(a, pid)) add('R3l', `${nm(pid)} tem ${a.name} só na crônica`); }
  }

  // R4 — datas
  for (const a of acts) {
    if (a.formed > a.debutYear) add('R4', `${a.name}: formação ${a.formed} depois da estreia ${a.debutYear}`);
    for (const x of stints16(s, a)) {
      const p = s.persons[x.pid];
      for (const g of x.segs) {
        if (g.to !== undefined && g.to < g.from) add('R4', `${p?.name} em ${a.name}: ${g.from}–${g.to}`);
        if (p && g.from < p.born && !p.real27?.bornEst) add('R4', `${p.name} entra em ${a.name} em ${g.from}, antes de nascer (${p.born})`);
      }
    }
  }
  // dados reais: passagem invertida na base
  if (real) for (const a of acts) for (const m of realDataOf(a)?.m ?? []) for (const [x, y] of periodsOf(m)) if (x !== undefined && y !== undefined && y < x) add('R4', `base: ${m[0]} em ${a.name} ${x}–${y}`);

  // R5 — parentesco e romances
  const kinCache = new Map<string, Set<string>>();
  const kinSet = (pid: string) => { let k = kinCache.get(pid); if (!k) { k = new Set(kinOf15(s, pid).map((x) => x.id)); kinCache.set(pid, k); } return k; };
  for (const pid of Object.keys(s.persons)) for (const k of kinSet(pid)) if (!kinSet(k).has(pid)) add('R5', `${nm(pid)} → ${nm(k)} sem volta`);
  for (const r of P(s).romances ?? []) if (!s.persons[r.a] || !s.persons[r.b]) add('R5', `romance ${r.a}×${r.b} com pessoa inexistente`);

  // R6 — mortos
  for (const p of Object.values(s.persons)) {
    if (!p.alive && p.died !== undefined && p.died < p.born) add('R6', `${p.name}: morte ${p.died} antes do nascimento ${p.born}`);
    if (p.alive && p.died !== undefined) add('R6', `${p.name}: vivo(a) com ano de morte ${p.died}`);
  }
  for (const pid of Object.keys(s.persons)) {
    const p = s.persons[pid];
    if (p.alive) continue;
    for (const x of careerActs29(s, pid)) if (x.current && live(x.act)) add('R6', `${p.name} (†${p.died}) aparece como integrante atual de ${x.act.name}`);
  }

  // R7 — autoria e intérpretes
  for (const rel of Object.values(s.releases)) {
    for (const sid of rel.songs) {
      const so = s.songs[sid];
      if (!so) continue;
      if (so.actId !== rel.actId && !(rel as { comp?: unknown }).comp && rel.type !== 'compilation' as string) add('R7', `${rel.title}: música de outro ato (${so.actId}≠${rel.actId})`);
      for (const w of so.writers) if (!s.persons[w]) add('R7', `${so.title}: compositor(a) inexistente ${w}`);
    }
  }

  // R7m — crédito de composição para quem já tinha saído do ato antes da música (formação provisória)
  for (const rel of Object.values(s.releases)) {
    const a = s.acts[rel.actId];
    if (!a) continue;
    for (const sid of rel.songs) for (const w of s.songs[sid]?.writers ?? []) {
      const f = (st.former[a.id] ?? []).filter((x) => x.personId === w);
      const made = s.config.startYear + Math.floor((s.songs[sid].createdWeek ?? 0) / 52.18); // composta antes de sair = legítimo
      const doc = real && (workOf27(s.songs[sid].title, realDataOf(a)?.n)?.w ?? []).some((n) => canonKey(n) === canonKey(s.persons[w]?.name ?? '')); // obra real: autor documentado
      if (!doc && f.length && !a.members.includes(w) && !s.persons[w]?.real27?.writer && Math.max(...f.map((x) => x.year)) < Math.min(rel.year, made) - 1) add('R7m', `${s.songs[sid].title} (${rel.year}, ${a.name}) creditada a ${nm(w)}, que saiu em ${Math.max(...f.map((x) => x.year))}`);
    }
  }

  // R8 — identidade partida (nomes reais de 2+ palavras, fora homônimos)
  if (real) {
    const by = new Map<string, string[]>();
    for (const a of acts) {
      if (!a.catalogNo) continue;
      for (const id of new Set([...a.members, ...(st.former[a.id] ?? []).map((f) => f.personId)])) {
        const p = s.persons[id];
        if (!p) continue;
        const k = canonKey(p.name);
        if (!k.includes(' ') || HOMONYMS27.has(k) || !RN.has(k) || !p.real27) continue; // gerado com nome igual = homônimo, não identidade partida
        const xs = by.get(k) ?? [];
        if (!xs.includes(id)) xs.push(id);
        by.set(k, xs);
      }
    }
    for (const [k, xs] of by) if (xs.length > 1) add('R8', `${k}: ${xs.length} pessoas (${xs.join(', ')})`);
  }
  // R10 — organização ↔ pessoa: os dois lados leem a mesma fonte (orglinks29); a auditoria confere as duas vistas
  r10(s, add);
  // R9 — índice velho
  for (const [k, id] of Object.entries(st.pid ?? {})) { const p = s.persons[id]; if (p && canonKey(p.name) !== k) add('R9', `índice "${k}" → ${p.name}`); }
  return out;
}

/** R10: ligação organização ↔ pessoa que só aparece de um lado, ou laço documentado de alguém do mundo sem ligação. */
export function r10(s: GameState, add: (code: string, msg: string) => void): void {
  const links = allLinks29(s);
  const byOrg = new Map<string, Set<string>>();
  const orgSide = (o: string) => byOrg.get(o) ?? byOrg.set(o, new Set(orgLinks29(s, o, true).map(linkId29))).get(o)!;
  const byKey = new Map<string, Set<string>>();
  const keySide = (k: string) => byKey.get(k) ?? byKey.set(k, new Set(linksOfKey29(s, k, true).filter((x) => !x.via).map(linkId29))).get(k)!;
  for (const x of links) {
    const id = linkId29(x);
    if (!orgSide(x.o).has(id)) add('R10', `${x.o}: ${x.key} (${x.kind}) fora do card da organização`);
    if (!keySide(x.key).has(id)) add('R10', `${x.key}: ${x.o} (${x.kind}) fora da ficha`);
  }
  // o inverso: o que a ficha mostra precisa estar no card
  for (const k of new Set(links.map((x) => x.key))) for (const x of linksOfKey29(s, k, true)) if (!x.via && !orgSide(x.o).has(linkId29(x))) add('R10', `${k}: ${x.o} (${x.kind}) só na ficha`);
  // laço documentado de quem existe no mundo, mas não ligado
  const names = new Set(Object.values(s.persons).map((p) => p.name));
  for (const u of unresolved29(s)) if (names.has(u.who)) add('R10', `${u.o}: laço documentado de ${u.who} sem pessoa ligada`);
  void docTies29;
}

/** Contagem por código. */
export function count29(fs: Finding29[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const f of fs) c[f.code] = (c[f.code] ?? 0) + 1;
  return c;
}
