// R33 · GENTE33 parte B — AS PESSOAS DO MUNDO EM CAMADAS (pedido do dono, 2026-10-17). Cada regra atrás do seu
// interruptor, DESLIGADO por padrão (mexe em todo mundo e nos goldens: o QA33 liga e mede):
//
//   • `exp33.camadas` — TRÊS CAMADAS DE DETALHE, que seguem a pessoa (não o emprego):
//       completa — artistas em atividade, quem trabalha para você, família, romances (o registro inteiro vale);
//       leve     — quem trabalha na cidade, ex-artistas, quem já trabalhou para você: nome, rosto, idade, profissão,
//                  2–3 traços e opinião sobre você, sem custo mensal (`lightCard33`);
//       multidão — sem identidade (os passantes da cena; não existem como pessoa).
//     Promoção e rebaixamento na hora, sempre a MESMA pessoa (mesmo id). Ao descer para a leve, guarda um resumo do
//     passado (atos, auge, papéis) e só as relações fortes (|v| ≥ 40); ao subir, o resumo fica e ela volta inteira.
//   • `exp33.talento` — TALENTO ESCONDIDO de quem trabalha na cidade: alguns têm dom (semente + pessoa) que só aparece
//     pelos canais de sempre (A&R, canais de descoberta da época, ouvir no lugar). Achado, vira artista solo fazendo bico
//     (o ciclo bartender ↔ artista do gente31 segue: assina → larga o emprego). Rivais também acham.
//     Gancho: o(a) bartender que você ouviu e não contratou vira estrela num rival → aviso e fato.
//   • `exp33.volta` — VOLTA POR CIMA de ex-artistas: catálogo que volta às paradas, olheiro do seu selo ou vídeo viral
//     (2006+) trazem a banda de volta (ou o(a) integrante em carreira solo), sem contrato, no seu radar.
//   • `exp33.romance33` — ROMANCE COM QUEM VIRA ARTISTA DO SEU SELO: o par (ou o caso) entra no seu elenco → decisão na
//     Caixa (segredo, assumir, terminar), com risco de vazar.
//
// Sorteios com Rng.fromSeed (chave 'gente33b'); estado em `s.x4.gente33b` só nasce com um interruptor ligado.
// Família Fossati nunca entra; ato real travado pela história (`histLocked`) não volta nem muda.

import { Rng, clamp } from '../../core/rng';
import { traitById } from '../../data/people';
import { cityById, l, type L } from '../../data/world';
import { signWithRival } from '../contracts';
import { registerSimHook } from '../ext4';
import { emitFact, recentFacts } from '../facts17';
import { histLocked } from '../history15';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { opinionOf } from '../opinion';
import { makeAct } from '../people';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { affairKey31, endWith31, partnerKey31 } from '../sys/amor31';
import { chNow18 } from '../sys/discover18';
import { gente31, jobOf31, parseSlot31, peekGente31 } from '../sys/gente31';
import { ownerOf } from '../sys/people/owner';
import type { Act, GameState, Person } from '../types';
import { fmtL, staffSkill } from '../util';
import { addSignal } from '../worldgen';
import { actsTouched17 } from '../actidx17';
import { peek33 } from './gente33';

// ---------------------------------------------------------------- interruptores

export const SWB33 = { camadas: 'exp33.camadas', talento: 'exp33.talento', volta: 'exp33.volta', romance: 'exp33.romance33' } as const;
const SWB_DESC: Record<keyof typeof SWB33, [L, L]> = {
  camadas: [l('Versão 33 · três camadas de pessoas: quem sai de cena desce para a camada leve (resumo do passado e só as relações fortes) e volta inteira quando ganha papel. Desligado: todo mundo guardado igual.', 'Version 33 · three layers of people: whoever leaves the stage drops to the light layer (past summary and strong ties only) and comes back whole when given a role. Off: everyone stored the same.'),
    l('V33 · três camadas de pessoas', 'V33 · three layers of people')],
  talento: [l('Versão 33 · talento escondido: gente que trabalha na cidade pode ter dom, achado pelos canais de descoberta (e por rivais). Desligado: ninguém escondido.', 'Version 33 · hidden talent: people working in town may have a gift, found through discovery channels (and by rivals). Off: nobody hidden.'),
    l('V33 · talento escondido na cidade', 'V33 · hidden talent in town')],
  volta: [l('Versão 33 · volta por cima: catálogo, olheiro ou vídeo viral trazem ex-artistas de volta. Desligado: aposentado fica aposentado.', 'Version 33 · comeback: catalogue, scouts or a viral video bring former artists back. Off: retired stays retired.'),
    l('V33 · volta por cima de ex-artistas', 'V33 · comebacks of former artists')],
  romance: [l('Versão 33 · romance com quem vira artista do seu selo: decisão na Caixa (segredo, assumir, terminar). Desligado: nada acontece.', 'Version 33 · romance with someone who joins your roster: a decision in the inbox (secret, go public, end it). Off: nothing happens.'),
    l('V33 · romance com artista do selo', 'V33 · romance with a roster artist')],
};
for (const k of Object.keys(SWB33) as (keyof typeof SWB33)[]) {
  registerSwitch({ id: SWB33[k], def: true, scope: 'game', desc: SWB_DESC[k][0] });
  registerEditable({ id: `sw.${SWB33[k]}`, area: 'tools', kind: 'bool', label: SWB_DESC[k][1], get: (s) => !!sw<boolean>(s, SWB33[k]), set: (s, v) => { setSw(s, SWB33[k], !!v); } });
}
const on = (s: GameState, k: keyof typeof SWB33): boolean => !!sw<boolean>(s, SWB33[k]);
const anyOn = (s: GameState): boolean => (Object.keys(SWB33) as (keyof typeof SWB33)[]).some((k) => on(s, k));

/** Números da regra (editáveis nos testes). */
export const GB33 = {
  /** fração de quem trabalha na cidade com dom escondido */
  hidden: 0.12,
  /** relação mínima (módulo) que a camada leve guarda */
  strong: 40,
  /** multiplica as chances de descoberta e de volta por cima (testes) */
  k: 1,
};

// ---------------------------------------------------------------- estado

/** Resumo do passado de quem desceu para a camada leve. */
export interface Sum33 { y: number; acts: string[]; peak: number; roles: string[] }
export interface GB33St {
  /** quem está na camada leve agora (id → ano em que desceu) */
  t: Record<string, number>;
  sum: Record<string, Sum33>;
  /** talento: achados (pessoa → [semana, ato, 'player' | id do selo]) e quem já foi ouvido sem dom */
  rev: Record<string, [number, string, string]>;
  chk: Record<string, 1>;
  /** avisos já dados ("virou estrela num rival"), voltas por cima (ato → ano) e romances tratados (pessoa → semana) */
  told: Record<string, 1>;
  back: Record<string, number>;
  rom: Record<string, [number, 'secret' | 'public' | 'ask']>;
}
declare module '../ext4' { interface Ext4 { gente33b: GB33St } }
function gb(s: GameState): GB33St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const g = (x.gente33b ??= { t: {}, sum: {}, rev: {}, chk: {}, told: {}, back: {}, rom: {} }) as GB33St;
  g.t ??= {}; g.sum ??= {}; g.rev ??= {}; g.chk ??= {}; g.told ??= {}; g.back ??= {}; g.rom ??= {};
  return g;
}
export const peekB33 = (s: GameState): GB33St | undefined => (s.x4 as unknown as { gente33b?: GB33St } | undefined)?.gente33b;
const rr = (s: GameState, tag: string): Rng => Rng.fromSeed(`${s.config.seed}|gente33b|${tag}|${s.week}`);
const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x / 4294967296; };
const live = (a: Act | undefined): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased;
const isFam = (id: string): boolean => id.startsWith('fam:');

// ================================================================ 1. TRÊS CAMADAS

export type Tier33 = 'full' | 'light' | 'crowd';
/** Índice pessoa → atos (vivos e antigos), montado uma vez por chamada. */
function actIndex(s: GameState): Map<string, Act[]> {
  const m = new Map<string, Act[]>();
  for (const a of Object.values(s.acts)) for (const p of a.members) { const xs = m.get(p); if (xs) xs.push(a); else m.set(p, [a]); }
  return m;
}
/** Quem precisa do registro inteiro agora. */
function fullSet(s: GameState): Set<string> {
  const out = new Set<string>();
  for (const a of Object.values(s.acts)) if (live(a)) for (const p of a.members) out.add(p);
  for (const p of Object.values(s.persons)) if (p.isPlayer || isFam(p.id)) out.add(p.id);
  const o = ownerOf(s);
  if (o.personId) out.add(o.personId);
  for (const k of [partnerKey31(s), affairKey31(s)]) if (k?.startsWith('p:')) out.add(k.slice(2));
  const g = peek33(s);
  if (g) for (const h of [...Object.values(g.br), ...(g.ceo ? [g.ceo] : []), ...Object.values(g.crew), ...Object.values(g.fix)]) if (h?.k.startsWith('p:')) out.add(h.k.slice(2));
  return out;
}
/** Camada da pessoa (multidão = não existe como pessoa). */
export function tier33(s: GameState, pid: string): Tier33 {
  const p = s.persons[pid];
  if (!p) return 'crowd';
  if (!on(s, 'camadas')) return 'full';
  return peekB33(s)?.t[pid] !== undefined ? 'light' : 'full';
}
function summarize(s: GameState, p: Person, acts: Act[]): Sum33 {
  const job = jobOf31(s, p.id);
  return { y: s.year, acts: acts.map((a) => a.name).slice(-4), peak: Math.round(Math.max(0, ...acts.map((a) => a.fame))), roles: job ? [job.role.pt] : [] };
}
/** Desce para a camada leve: guarda o resumo e só as relações fortes. */
export function demote33(s: GameState, pid: string, idx = actIndex(s)): boolean {
  const p = s.persons[pid];
  if (!p || !p.alive || p.isPlayer || isFam(pid)) return false;
  const g = gb(s);
  if (g.t[pid] !== undefined) return false;
  g.t[pid] = s.year;
  g.sum[pid] = summarize(s, p, idx.get(pid) ?? []);
  for (const [k, v] of Object.entries(p.rel)) if (Math.abs(v) < GB33.strong) delete p.rel[k];
  return true;
}
/** Sobe para a camada completa (a mesma pessoa; o resumo do passado fica). */
export function promote33(s: GameState, pid: string): boolean {
  const g = peekB33(s);
  if (!g || g.t[pid] === undefined) return false;
  delete g.t[pid];
  return true;
}
/** O mês das camadas: quem perdeu o papel desce, quem ganhou sobe. */
export function tiersMonth33(s: GameState): { down: number; up: number } {
  const out = { down: 0, up: 0 };
  if (!on(s, 'camadas')) return out;
  const full = fullSet(s), idx = actIndex(s), g = gb(s);
  for (const pid of Object.keys(g.t)) if (full.has(pid) || !s.persons[pid]?.alive) { if (promote33(s, pid)) out.up++; if (!s.persons[pid]?.alive) delete g.sum[pid]; }
  for (const p of Object.values(s.persons)) if (p.alive && !full.has(p.id) && g.t[p.id] === undefined && demote33(s, p.id, idx)) out.down++;
  return out;
}

const LIGHT_TRAITS: L[] = [
  l('falante', 'chatty'), l('reservado(a)', 'reserved'), l('disciplinado(a)', 'disciplined'), l('sonhador(a)', 'dreamer'), l('desconfiado(a)', 'wary'),
  l('bem-humorado(a)', 'good-humoured'), l('curioso(a)', 'curious'), l('teimoso(a)', 'stubborn'), l('generoso(a)', 'generous'), l('fofoqueiro(a)', 'gossipy'),
];
/** Ficha leve: nome, idade, profissão, 2–3 traços e opinião sobre você. */
export interface LightCard33 { pid: string; n: string; age: number; prof: L; traits: L[]; op: number; past?: Sum33 }
export function lightCard33(s: GameState, pid: string): LightCard33 | null {
  const p = s.persons[pid];
  if (!p) return null;
  const job = jobOf31(s, pid);
  const sm = peekB33(s)?.sum[pid];
  const prof = job ? job.line : sm?.acts.length ? fmtL(l('Ex-integrante de {a}', 'Former member of {a}'), { a: sm.acts[sm.acts.length - 1] }) : l('Sem ocupação fixa', 'No steady job');
  const traits = p.traits.slice(0, 3).map((t) => traitById[t]?.name ?? l(t, t));
  // sem traços de base (gente nova da cidade): 2 do jeito da pessoa, fixos pelo id
  for (let i = 0; traits.length < 2 && i < 4; i++) {
    const t = LIGHT_TRAITS[Math.floor(hs(`${pid}|lt${i}`) * LIGHT_TRAITS.length)];
    if (!traits.some((x) => x.pt === t.pt)) traits.push(t);
  }
  return { pid, n: p.name, age: s.year - p.born, prof, traits: traits.slice(0, 3), op: Math.round(opinionOf(s, `p:${pid}`)), past: sm };
}

// ================================================================ 2. TALENTO ESCONDIDO

/** Dom escondido de quem trabalha na cidade (0 = nenhum). Fixo pela semente e pela pessoa. */
export function hidden33(s: GameState, pid: string): number {
  if (!on(s, 'talento')) return 0;
  const p = s.persons[pid];
  if (!p?.alive || isFam(pid) || p.isPlayer || p.real27) return 0;
  const h = hs(`${s.config.seed}|hid33|${pid}`);
  return h < GB33.hidden ? Math.round(55 + (h / GB33.hidden) * 40) : 0;
}
/** Quem trabalha na cidade e ainda não está em ato nenhum vivo (o bico já é músico). */
function townWorkers(s: GameState): { pid: string; k: string; role: L }[] {
  const st = peekGente31(s);
  if (!st) return [];
  const inAct = new Set<string>();
  for (const a of Object.values(s.acts)) if (live(a)) for (const p of a.members) inAct.add(p);
  return Object.entries(st.j).filter(([, j]) => !j.bico && !inAct.has(j.p)).map(([sl, j]) => ({ pid: j.p, k: parseSlot31(sl).k, role: jobOf31(s, j.p)?.role ?? l('Trabalha na cidade', 'Works in town') }));
}
const MUSIC_PLACES = new Set(['venue', 'bar', 'studio', 'records', 'radio', 'instruments', 'rehearsal']);
function homeGenre(s: GameState): string {
  const c: Record<string, number> = {};
  for (const a of Object.values(s.acts)) if (a.city === s.config.homeCity && live(a)) c[a.genre] = (c[a.genre] ?? 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? Object.values(s.acts)[0]?.genre ?? 'rock';
}
/** O dom aparece: a pessoa vira artista solo (fazendo bico no mesmo emprego) e entra no radar de quem achou. */
export function reveal33(s: GameState, pid: string, by: 'player' | string): Act | null {
  const p = s.persons[pid], pot = hidden33(s, pid), g = gb(s);
  if (!p || !pot || g.rev[pid]) return null;
  const r = rr(s, `rev:${pid}`);
  const a = makeAct(s, r, { name: p.name, genre: homeGenre(s), city: s.config.homeCity, members: 1, potential: pot, formed: s.year, debutYear: s.year, fame: 2 });
  delete s.persons[a.members[0]];
  a.members = [pid]; a.leaderId = pid; a.status = 'emerging'; a.owner = null;
  p.potential = Math.max(p.potential, pot);
  for (const k of ['comp', 'lyr', 'voice', 'instr', 'stage'] as const) p.skills[k] = Math.max(p.skills[k] ?? 0, Math.round(pot * 0.5));
  // o emprego vira bico: assinar com alguém faz largar a vaga (ciclo do gente31)
  const sl = Object.entries(gente31(s).j).find(([, j]) => j.p === pid)?.[0];
  if (sl) gente31(s).j[sl].bico = 1;
  promote33(s, pid);
  actsTouched17(s);
  g.rev[pid] = [s.week, a.id, by];
  const job = jobOf31(s, pid);
  if (by === 'player') addSignal(s, r, a.id, 'hidden33', { city: s.config.homeCity });
  else signWithRival(s, a, by, r, true);
  const t = by === 'player'
    ? fmtL(l('{n} ({j}) tem dom de verdade: entrou no seu radar.', '{n} ({j}) has real talent: now on your radar.'), { n: p.name, j: job?.role ?? l('gente da cidade', 'townsperson') })
    : fmtL(l('{l} descobre {n} ({j}) e assina na hora.', '{l} discovers {n} ({j}) and signs on the spot.'), { l: s.labels[by]?.name ?? '?', n: p.name, j: job?.role ?? l('gente da cidade', 'townsperson') });
  emitFact(s, { kind: 'talent33', actors: [pid, a.id, by], place: s.config.homeCity, severity: 20, visibility: by === 'player' ? 'secret' : 'public', tags: ['gente33b', 'hidden'], text: t, src: 'gente33b', diary: by === 'player' ? true : undefined, notify: by === 'player' ? 'good' : undefined });
  return a;
}
/** Ação do jogador: ouvir quem trabalha num lugar (sem dom, fica anotado para não repetir). */
export function listen33(s: GameState, pid: string): L | null {
  if (!on(s, 'talento')) return l('Talento escondido está desligado.', 'Hidden talent is switched off.');
  const p = s.persons[pid];
  if (!p) return l('Pessoa desconhecida.', 'Unknown person.');
  const g = gb(s);
  if (g.rev[pid] || g.chk[pid]) return l('Você já ouviu essa pessoa.', 'You already heard this person.');
  if (!hidden33(s, pid)) { g.chk[pid] = 1; return null; }
  reveal33(s, pid, 'player');
  return null;
}
/** Quem ainda não foi ouvido num tipo de lugar (para o cartão). */
export function toHear33(s: GameState, kind?: string): string | undefined {
  const g = peekB33(s);
  return townWorkers(s).find((w) => (!kind || w.k === kind) && !g?.rev[w.pid] && !g?.chk[w.pid])?.pid;
}
/** Ouve o próximo de um tipo de lugar (ação do cartão). */
export function listenHere33(s: GameState, kind = 'bar'): L | null {
  const pid = toHear33(s, kind);
  return pid ? listen33(s, pid) : l('Já ouviu todo mundo que trabalha aqui.', 'You have already heard everyone working here.');
}

export function talentMonth33(s: GameState): void {
  if (!on(s, 'talento')) return;
  const g = gb(s), r = rr(s, 'tal');
  const anr = staffSkill(s, 'anr'), ch = chNow18(s).length;
  const rivals = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash || (a.id < b.id ? -1 : 1));
  for (const w of townWorkers(s)) {
    if (g.rev[w.pid] || !hidden33(s, w.pid)) continue;
    const music = MUSIC_PLACES.has(w.k) ? 0.01 : 0;
    if (r.chance(clamp((0.01 + anr / 3000 + ch * 0.003 + music) * GB33.k, 0, 0.9))) { reveal33(s, w.pid, 'player'); continue; }
    if (rivals[0] && r.chance(clamp((0.004 + music / 2) * GB33.k, 0, 0.9))) reveal33(s, w.pid, rivals[r.int(0, Math.min(2, rivals.length - 1))].id);
  }
  // quem você achou e deixou sem contrato: depois de meio ano, um rival leva
  for (const [pid, [w, actId, by]] of Object.entries(g.rev)) {
    const a = s.acts[actId];
    if (by !== 'player' || !live(a) || a.owner !== null || s.week - w < 26 || !rivals[0]) continue;
    if (r.chance(clamp(0.08 * GB33.k, 0, 0.9))) signWithRival(s, a, rivals[r.int(0, Math.min(2, rivals.length - 1))].id, r, true);
    void pid;
  }
  starAtRival(s);
}
/** Gancho: gente da cidade que você conheceu (ouviu ou tinha no radar) virou estrela num rival. */
function starAtRival(s: GameState): void {
  const g = gb(s), st = peekGente31(s);
  const worked = new Set<string>(Object.keys(g.rev));
  for (const e of st?.log ?? []) worked.add(e[2]);
  for (const a of Object.values(s.acts)) {
    if (!live(a) || !a.owner || a.owner === 'player' || a.fame < 45 || g.told[a.id]) continue;
    if (!s.knowledge[a.id] && !Object.values(g.rev).some((x) => x[1] === a.id)) continue;
    const pid = a.members.find((m) => worked.has(m));
    if (!pid) continue;
    g.told[a.id] = 1;
    const lb = s.labels[a.owner];
    const was = jobOf31(s, pid)?.role ?? l('gente da cidade', 'townsperson');
    const t = fmtL(l('{n}, que trabalhava como {j} e passou pelo seu radar, virou estrela na {l}.', '{n}, who worked as {j} and crossed your radar, became a star at {l}.'), { n: s.persons[pid]?.name ?? a.name, j: was, l: lb?.name ?? '?' });
    emitFact(s, { kind: 'missed33', actors: [pid, a.id, a.owner, 'player'], severity: 40, visibility: 'public', tags: ['gente33b', 'hidden', 'missed'], text: t, src: 'gente33b', diary: { important: true } });
    pushInbox18(s, 'g33_missed', { from: lb?.name ?? '', tone: 'bad', subject: l('A que escapou', 'The one that got away'), body: t, ref: { act: a.id } });
  }
}
registerInboxKind('g33_missed', { label: l('A que escapou', 'The one that got away'), cat: 'world', icon: 'star', prio: 1, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null) });

// ================================================================ 3. VOLTA POR CIMA

export type Why33 = 'catalog' | 'scout' | 'viral';
export const WHY33: Record<Why33, L> = {
  catalog: l('o catálogo voltou às paradas', 'the catalogue is back in the charts'),
  scout: l('um olheiro do seu selo foi atrás', 'a scout from your label went after them'),
  viral: l('um vídeo antigo viralizou', 'an old video went viral'),
};
/** Ex-artista que pode voltar (ato aposentado ou separado com gente viva, sem trava da história). */
function backOk(s: GameState, a: Act): boolean {
  if ((a.status !== 'retired' && a.status !== 'split') || a.deceased || histLocked(s, a) || a.playerBand) return false;
  if (a.members.some(isFam)) return false;
  if ((peekB33(s)?.back[a.id] ?? -99) > s.year - 10) return false;
  return a.members.some((m) => s.persons[m]?.alive && s.year - s.persons[m].born < 70) && (a.hits > 0 || a.fame >= 15 || a.peakChart <= 40);
}
/** A volta: a banda se reúne (aposentada, com metade viva) ou o(a) melhor integrante segue solo. */
export function comeback33(s: GameState, actId: string, why: Why33): Act | null {
  const a = s.acts[actId];
  if (!a || !backOk(s, a)) return null;
  const r = rr(s, `back:${actId}`), g = gb(s);
  const alive = a.members.filter((m) => s.persons[m]?.alive);
  let back: Act;
  if (a.status === 'retired' && alive.length * 2 >= a.members.length) {
    a.status = 'active'; a.hiatusUntil = undefined; a.careerEnd = s.year + 6; a.owner = null; a.contractId = undefined;
    a.momentum = clamp(a.momentum + 20, 0, 100); a.fame = Math.max(a.fame, 15);
    back = a;
  } else {
    const best = alive.map((m) => s.persons[m]).sort((x, y) => y.potential - x.potential || (x.id < y.id ? -1 : 1))[0];
    back = makeAct(s, r, { name: best.name, genre: a.genre, city: a.city, members: 1, potential: best.potential, formed: s.year, debutYear: s.year, fame: Math.max(10, a.fame * 0.6) });
    delete s.persons[back.members[0]];
    back.members = [best.id]; back.leaderId = best.id; back.status = 'active'; back.owner = null;
  }
  for (const m of back.members) promote33(s, m);
  g.back[a.id] = s.year;
  actsTouched17(s);
  if (why !== 'viral' || s.knowledge[a.id]) addSignal(s, r, back.id, 'comeback33', { city: back.city });
  const t = fmtL(l('{a} está de volta: {w}.', '{a} is back: {w}.'), { a: back.name, w: WHY33[why] });
  emitFact(s, { kind: 'comeback33', actors: [back.id, ...back.members], place: back.city, severity: 30 + Math.min(30, a.fame / 3), visibility: 'public', tags: ['gente33b', 'comeback', why], text: t, src: 'gente33b', diary: true, notify: s.knowledge[back.id] ? 'good' : undefined });
  return back;
}
export function backMonth33(s: GameState): void {
  if (!on(s, 'volta')) return;
  const r = rr(s, 'back');
  const anr = staffSkill(s, 'anr');
  let n = 0;
  for (const a of Object.values(s.acts).sort((x, y) => (x.id < y.id ? -1 : 1))) {
    if (n >= 2 || !backOk(s, a)) continue;
    const chart = recentFacts(s, { kind: 'chart', actor: a.id, months: 3 }).length > 0;
    const pc = chart ? 0.08 : 0, ps = anr / 4000, pv = s.year >= 2006 ? 0.004 : 0;
    if (!r.chance(clamp((0.001 + pc + ps + pv) * GB33.k, 0, 0.9))) continue;
    const why: Why33 = chart ? 'catalog' : r.chance(ps / Math.max(1e-9, ps + pv + 0.001)) ? 'scout' : 'viral';
    if (comeback33(s, a.id, why)) n++;
  }
}

// ================================================================ 4. ROMANCE COM QUEM VIRA ARTISTA DO SELO

function rosterAct(s: GameState, pid: string): Act | undefined {
  return Object.values(s.acts).find((a) => live(a) && a.owner === 'player' && !a.playerBand && a.members.includes(pid));
}
export function romanceMonth33(s: GameState): void {
  if (!on(s, 'romance')) return;
  const g = gb(s), r = rr(s, 'rom');
  for (const [which, k] of [['partner', partnerKey31(s)], ['affair', affairKey31(s)]] as const) {
    if (!k?.startsWith('p:')) continue;
    const pid = k.slice(2), a = rosterAct(s, pid);
    if (!a || isFam(pid)) continue;
    const st = g.rom[pid];
    if (!st) {
      g.rom[pid] = [s.week, 'ask'];
      const n = s.persons[pid]?.name ?? a.name;
      pushInbox18(s, 'g33_rom', { from: n, tone: 'info', weeks: 6, ref: { pid, act: a.id, w: which },
        subject: fmtL(l('{n} agora é artista do seu selo', '{n} is now on your roster'), { n }),
        body: fmtL(l('{n} ({a}) é {r} e agora também contratado(a) do selo. O elenco e a imprensa vão reparar.', '{n} ({a}) is your {r} and now also signed to the label. The roster and the press will notice.'),
          { n, a: a.name, r: which === 'partner' ? l('seu par', 'partner') : l('seu caso', 'affair') }),
        actions: [{ id: 'secret', label: l('Manter em segredo', 'Keep it secret') }, { id: 'public', label: l('Assumir publicamente', 'Go public') }, { id: 'end', label: l('Terminar a relação', 'End the relationship') }] });
      continue;
    }
    // segredo pode vazar
    if (st[1] === 'secret' && r.chance(0.05 * GB33.k)) {
      st[1] = 'public';
      a.trust = clamp(a.trust - 10, 0, 100);
      s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
      emitFact(s, { kind: 'scandal', actors: ['player', pid, a.id], severity: 45, visibility: 'public', tags: ['gente33b', 'romance', 'leak'], src: 'gente33b', notify: 'bad', diary: true,
        text: fmtL(l('Vaza o romance do dono do selo com {n}, de {a}.', 'The label owner\'s romance with {n}, of {a}, leaks.'), { n: s.persons[pid]?.name ?? '', a: a.name }) });
    }
  }
}
registerInboxKind('g33_rom', { label: l('Romance no elenco', 'Romance on the roster'), cat: 'life', icon: 'heart', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, act) => {
    const pid = String(m.ref?.pid ?? ''), a = s.acts[String(m.ref?.act ?? '')], g = gb(s);
    if (!a) return l('O artista já não está no selo.', 'The act is no longer on the label.');
    if (act === 'end') { g.rom[pid] = [s.week, 'public']; const res = endWith31(s, m.ref?.w === 'affair' ? 'affair' : 'partner'); a.trust = clamp(a.trust - 15, 0, 100); return res.text; }
    if (act === 'public') {
      g.rom[pid] = [s.week, 'public'];
      s.player.reputation.artists = clamp(s.player.reputation.artists - 1, 0, 100);
      emitFact(s, { kind: 'romance', actors: ['player', pid, a.id], severity: 30, visibility: 'public', tags: ['gente33b', 'romance'], src: 'gente33b', diary: true,
        text: fmtL(l('O dono do selo assume o romance com {n}, de {a}.', 'The label owner goes public with {n}, of {a}.'), { n: s.persons[pid]?.name ?? '', a: a.name }) });
      return l('Assumido. O elenco comenta, mas a fofoca perde a graça.', 'Out in the open. The roster talks, but the gossip loses its bite.');
    }
    g.rom[pid] = [s.week, 'secret'];
    return l('Segredo guardado — por enquanto.', 'Secret kept — for now.');
  } });

// ================================================================ mês

export function gente33bMonth(s: GameState): void {
  if (!anyOn(s)) return;
  talentMonth33(s);
  backMonth33(s);
  romanceMonth33(s);
  tiersMonth33(s); // por último: quem ganhou papel neste mês já sobe
}
registerSimHook('month', 'gente33b', (s) => gente33bMonth(s));

/** Nome da cidade (para os textos da tela). */
export const homeName33 = (s: GameState): L => cityById[s.config.homeCity]?.name ?? l(s.config.homeCity, s.config.homeCity);
