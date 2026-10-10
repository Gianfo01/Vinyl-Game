// Rodada 18 (rights18, frente A — feedback #10): DIREITOS DE VERDADE.
//  • OBRA (composição) × GRAVAÇÃO (master) × VERSÕES (cover, remix, regravação, ao vivo): a edição de toda versão paga
//    os autores da obra; a regravação tira demanda do master antigo, nunca da composição.
//  • Splits assinados no estúdio (ou não) → disputas de crédito que CONGELAM a edição da obra (caução) e bloqueiam usos.
//  • Autorizações pendentes (sample, cover fora dos EUA, sync de obra alheia) que bloqueiam usos até serem liberadas.
//  • Sociedades por mercado e época (ECAD, ASCAP/BMI/SESAC, PRS/PPL, GEMA, SACEM, JASRAC, SoundExchange…): taxa,
//    defasagem, CAIXA PRETA (receita não identificada que expira em 3 anos) e acordos recíprocos/subeditoras no exterior.
//  • Receita por território e modalidade (mecânico, execução, partitura, conexos, sync, administração) com extratos.
//  • Metadados limpos (habilidade dg_meta, equipe de direitos, política de registro) reduzem caixa preta, conflitos de
//    cadastro e atrasos — não vendem discos.
//  • Rescisão americana (35 anos, cessões de 1978+), conexos por país, prazo europeu 50→70 anos, regravações.
//  • Precedentes jurídicos em datas reais (financiáveis; fora do modo exato o veredito pode virar história alternativa).
//  • Editora como negócio: administração de catálogos de terceiros. Avaliação de catálogo para compra/venda.
import { Rng, clamp } from '../../core/rng';
import { MARKETS, cityById, l, type L } from '../../data/world';
import { NEIGH18, PRECS18, SOCS18, type Mod18, type Soc18 } from '../../data/rights18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type AdvTip18 } from '../inbox18';
import { registerExplain, type WhyPart } from '../explain18';
import { bucket18, fin18 } from '../ledger18';
import { perk } from '../perks';
import { USE_BLOCK18, annualRevenue, dealOfRelease, rightsOf, rst } from '../rights';
import type { Act, GameState, Release, Song } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember, staffSkill } from '../util';
import { mkWeights18, proDue18 } from './econ18';
import { histMode } from '../history15';
import { addStress } from '../stress17';

// ---------------------------------------------------------------- estado

export interface Disp18 { id: string; song: string; rel?: string; who: string; name: string; kind: 'credit' | 'cover'; share: number; since: number; st: 'open' | 'court' | 'done'; court?: number; odds?: number; res?: L }
export interface Clr18 { id: string; kind: 'cover' | 'sync'; song: string; src?: string; fee: number; st: 'pending' | 'ok' | 'denied'; until: number }
export interface Stm18 { due: number; mk: string; soc: string; g: number; fee: number; bb: number; esc: number; net: number; perf: number; mech: number; print: number; neigh: number }
export interface Term18 { id: string; act: string; rels: string[]; eff: number; st: 'notice' | 'contest' | 'kept' | 'done' | 'accepted'; court?: number; odds?: number }
export interface Adm18 { id: string; name: string; size: number; fee: number; until: number; sat: number; exp?: number }
export interface R18 {
  /** sociedade escolhida por mercado (onde há escolha) */
  soc: Record<string, string>;
  /** subeditora contratada no mercado até o ano */
  sub: Record<string, number>;
  /** cadastro da obra: 1 = splits em aberto, 2 = split sheet assinada no estúdio */
  reg: Record<string, number>;
  /** conflito de cadastro (semana) — a fatia da obra cai na caixa preta até corrigir */
  conf: Record<string, number>;
  pol: { split: boolean; reg: boolean };
  /** caixa preta por mercado e ano */
  bb: { mk: string; y: number; amt: number }[];
  lost: number; claimed: number; claimCd: number;
  /** caução (royalties congelados) por obra */
  esc: Record<string, number>;
  disp: Disp18[]; clr: Clr18[]; stm: Stm18[]; term: Term18[]; adm: Adm18[]; admOff: Adm18[];
  /** regravações: master antigo → multiplicador de demanda; versão nova → bônus */
  rr: Record<string, number>; rrNew: Record<string, number>;
  /** precedentes: ano em que valeu; flip = história alternativa; side = lado financiado */
  prec: Record<string, { y: number; flip?: boolean; side?: 'p' | 'd'; ann?: number }>;
  /** receita por ano: `${mod}` e `mk:${mk}` */
  inc: Record<number, Record<string, number>>;
  /** lançamentos observados (créditos) e obras já checadas */
  watch: string[]; chk: Record<string, 1>;
  /** obras com liberação de sync */
  syncOk: Record<string, 1>;
  cost: number;
  log: [number, number, L][];
}

declare module '../ext4' { interface Ext4 { rights18: R18 } }
const fresh = (): R18 => ({ soc: {}, sub: {}, reg: {}, conf: {}, pol: { split: false, reg: false }, bb: [], lost: 0, claimed: 0, claimCd: 0, esc: {}, disp: [], clr: [], stm: [], term: [], adm: [], admOff: [], rr: {}, rrNew: {}, prec: {}, inc: {}, watch: [], chk: {}, syncOk: {}, cost: 0, log: [] });
registerExt4('rights18', fresh);
export function r18(s: GameState): R18 {
  const x = s as unknown as { x4: Record<string, unknown> };
  x.x4 ??= {};
  const st = (x.x4.rights18 ??= fresh()) as R18;
  return st;
}
const seed = (s: GameState, tag: string) => Rng.fromSeed(`${s.config.seed}:r18:${tag}:${s.year}:${s.month}`);
const logIt = (st: R18, s: GameState, t: L) => { st.log.unshift([s.year, s.month, t]); if (st.log.length > 30) st.log.length = 30; };
export const homeMk18 = (s: GameState): string => cityById[s.config.homeCity]?.market ?? 'na';
const mkName = (mk: string): L => MARKETS.find((m) => m.id === mk)?.name ?? l(mk);
const mineRel = (s: GameState, rel: Release) => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
/** fora do modo exato tudo vale (história alternativa); no exato, atos reais não sofrem fatos inventados */
const altHist18 = (s: GameState): boolean => histMode(s) !== 'strict';
const shield18 = (s: GameState, actId: string): boolean => !altHist18(s) && !!s.acts[actId]?.catalogNo;
/** fatia digital aproximada nos EUA (SoundExchange só cobra digital) */
const digital18 = (y: number): number => (y < 2000 ? 0 : clamp((y - 1998) / 16, 0.1, 0.9));

// ---------------------------------------------------------------- precedentes

/** produto dos multiplicadores dos precedentes já julgados (e não virados) */
export function precMul18(s: GameState, key: string): number {
  const P = r18(s).prec;
  let m = 1;
  for (const d of PRECS18) { const p = P[d.id]; if (p && !p.flip && d.fx[key] !== undefined && !key.endsWith('Odds')) m *= d.fx[key]; }
  return m;
}
export function precAdd18(s: GameState, key: string): number {
  const P = r18(s).prec;
  let a = 0;
  for (const d of PRECS18) { const p = P[d.id]; if (p && !p.flip && d.fx[key] !== undefined) a += d.fx[key]; }
  return a;
}
const precOn = (s: GameState, id: string) => { const p = r18(s).prec[id]; return !!p && !p.flip; };
/** prazo europeu da gravação (50 anos; 70 depois da diretiva) */
export const euTerm18 = (s: GameState): number => (precOn(s, 'eu2011') ? 70 : 50);
/** rescisão de 35 anos existe (lei de 1976 em vigor) */
export const termOn18 = (s: GameState): boolean => s.year >= 1978 && (precOn(s, 'act1976') || !r18(s).prec.act1976);

export function fundPrec18(s: GameState, id: string, side: 'p' | 'd'): L | null {
  const st = r18(s), d = PRECS18.find((x) => x.id === id);
  if (!d || st.prec[id]?.y) return l('Caso já julgado.', 'Case already decided.');
  const c = money(s, 5000);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `prec18:${id}`, -c, 'legal', `Apoio jurídico: ${d.name}`);
  (st.prec[id] ??= { y: 0 }).side = side;
  if (side === 'p') for (const id2 of playerActs(s)) { const a = s.acts[id2]; if (a && !a.playerBand) a.trust = clamp(a.trust + 2, 0, 100); }
  emitFact(s, { kind: 'statement', actors: ['player'], severity: 25, tags: ['law', 'rights'], text: fmtL(l('O selo financia {w} no caso {c}.', 'The label backs {w} in {c}.'), { w: d.who[side === 'p' ? 0 : 1], c: d.name }), src: 'rights18' });
  return null;
}

export function precMonth18(s: GameState): void {
  const st = r18(s), now = s.year * 12 + s.month, r = seed(s, 'prec');
  if (!st.chk.pinit) { st.chk.pinit = 1; for (const d of PRECS18) if (d.y * 12 + d.m <= now) st.prec[d.id] = { y: d.y }; return; }
  for (const d of PRECS18) {
    const at = d.y * 12 + d.m;
    const p = st.prec[d.id];
    if (p?.y) continue;
    if (now >= at - 4 && now < at && !p?.ann) {
      (st.prec[d.id] ??= { y: 0 }).ann = s.week;
      pushInbox18(s, 'rights18', { from: l('Departamento jurídico', 'Legal department').pt, subject: fmtL(l('Em julgamento: {c}', 'On trial: {c}'), { c: d.name }), weeks: 14,
        body: fmtL(l('{p} contra {d}. O resultado pode mudar as regras do mercado. Financiar um lado custa {v}; fora do modo "Vida real exata", o apoio pesa no veredito.', '{p} vs {d}. The outcome may change the market\'s rules. Backing a side costs {v}; outside "Exact real life" mode, support sways the verdict.'), { p: d.who[0], d: d.who[1], v: { pt: `$${Math.round(money(s, 5000) / 100)}`, en: `$${Math.round(money(s, 5000) / 100)}` } }),
        ref: { prec: d.id }, actions: [{ id: 'fund_p', label: fmtL(l('Apoiar {w}', 'Back {w}'), { w: d.who[0] }) }, { id: 'fund_d', label: fmtL(l('Apoiar {w}', 'Back {w}'), { w: d.who[1] }) }, { id: 'out', label: l('Ficar de fora', 'Stay out') }] });
      continue;
    }
    if (now < at) continue;
    let flip = false;
    if (altHist18(s)) {
      const side = p?.side;
      const pf = side ? (side === d.won ? 0.04 : 0.32) : 0.15;
      flip = r.chance(pf);
    }
    st.prec[d.id] = { ...(p ?? {}), y: s.year, flip };
    const text = flip ? fmtL(l('História alternativa — {c}: o veredito sai ao contrário do que foi na vida real. Nada muda nas regras.', 'Alternate history — {c}: the verdict goes the other way from real life. The rules stay as they were.'), { c: d.name }) : d.text;
    emitFact(s, { kind: 'case_ruling', actors: ['player'], severity: 35, tags: ['law', 'rights', d.id], text, src: 'rights18' });
    remember(s, 'ruling', text, { important: true });
    logIt(st, s, text);
    pushInbox18(s, 'rights18', { from: d.name, subject: flip ? l('Veredito inesperado', 'Unexpected verdict') : l('Novo precedente jurídico', 'New legal precedent'), body: flip ? text : fmtL(l('{t} O que muda: {e}', '{t} What changes: {e}'), { t: d.text, e: d.effect }), tone: 'info', ref: { prec: d.id } });
  }
}

// ---------------------------------------------------------------- metadados, sociedades e taxas

/** qualidade dos metadados 0–0,9: identificação das obras (códigos, splits, cadastro) */
export function meta18(s: GameState): { v: number; parts: WhyPart[] } {
  const st = r18(s);
  const pk = perk(s, 'metadata');
  const staff = Math.min(0.35, staffSkill(s, 'rights') / 250);
  const pol = st.pol.reg ? 0.15 : 0;
  const era = (s.year >= 1986 ? 0.05 : 0) + (s.year >= 2002 ? 0.05 : 0) + (s.year >= 2018 ? 0.05 : 0);
  const v = clamp(0.1 + pk + staff + pol + era, 0, 0.9);
  return { v, parts: [
    { label: l('Base (fichas em papel)', 'Base (paper files)'), value: 0.1, fmt: 'pct' },
    { label: l('Metadados limpos (habilidade)', 'Clean metadata (skill)'), value: pk, fmt: 'pct', tone: pk ? 'good' : undefined },
    { label: l('Equipe de direitos', 'Rights staff'), value: staff, fmt: 'pct', tone: staff ? 'good' : undefined },
    { label: l('Política: registrar toda obra', 'Policy: register every work'), value: pol, fmt: 'pct' },
    { label: l('Códigos da época (ISRC 1986, ISWC 2002, bases públicas 2018)', 'Era codes (ISRC 1986, ISWC 2002, public databases 2018)'), value: era, fmt: 'pct' },
  ] };
}

export function socOptions18(s: GameState, mk: string, kind = 'p'): Soc18[] {
  return SOCS18.filter((x) => x.mk === mk && x.does.includes(kind) && x.from <= s.year && (!x.to || x.to >= s.year));
}
/** sociedade em uso no mercado para o direito (p/m/n); undefined = sem sociedade (editora cobra sozinha) */
export function socOf18(s: GameState, mk: string, kind = 'p'): Soc18 | undefined {
  const opts = socOptions18(s, mk, kind);
  if (!opts.length) return kind === 'm' ? socOf18(s, mk, 'p') : undefined;
  if (kind === 'm') return opts.find((x) => x.id === 'mlc') ?? opts[0];
  if (kind === 'p' && mk === 'na') {
    const w = (s.x4 as unknown as { w4?: { society?: string } }).w4?.society;
    const id = w === 'scae' ? 'ascap' : w === 'rmr' ? 'bmi' : r18(s).soc.na;
    return opts.find((x) => x.id === id) ?? opts.find((x) => !x.invite) ?? opts[0];
  }
  return opts.find((x) => x.id === r18(s).soc[mk]) ?? opts.find((x) => !x.invite) ?? opts[0];
}
export const SUB_FEE18 = 0.15;
export const hasSub18 = (s: GameState, mk: string): boolean => (r18(s).sub[mk] ?? 0) >= s.year;

export interface Rate18 { soc?: Soc18; fee: number; lag: number; bb: number; parts: WhyPart[] }
/** taxa, defasagem (meses além do calendário da sociedade) e caixa preta para uma modalidade num mercado */
export function rate18(s: GameState, mk: string, mod: Mod18): Rate18 {
  if (mod === 'print') return { fee: 0, lag: 1, bb: 0, parts: [{ label: l('Partitura: a editora vende direto', 'Sheet music: the publisher sells direct'), value: 0, fmt: 'pct' }] };
  const kind = mod === 'mech' ? 'm' : mod === 'neigh' ? 'n' : 'p';
  const soc = socOf18(s, mk, kind);
  const parts: WhyPart[] = [];
  let fee = soc?.fee ?? 0.3, lag = soc?.lag ?? 3, bb = soc?.bb ?? 0.45;
  parts.push({ label: soc ? fmtL(l('{n}: taxa de administração', '{n}: admin fee'), { n: soc.name }) : l('Sem sociedade: agentes próprios', 'No society: own agents'), value: fee, fmt: 'pct' });
  if (mk === 'br') { const f = precMul18(s, 'fee_br'); if (f !== 1) { parts.push({ label: l('Lei 12.853 (teto da taxa do ECAD)', 'Law 12,853 (ECAD fee cap)'), value: fee * (f - 1), fmt: 'pct', tone: 'good' }); fee *= f; } bb *= precMul18(s, 'bb_br'); }
  if (mk === 'na' && mod === 'mech') bb *= precMul18(s, 'bb_na');
  const sub = hasSub18(s, mk);
  if (mk !== homeMk18(s)) {
    if (sub) { fee += SUB_FEE18; bb *= 0.5; parts.push({ label: l('Subeditora local (cobra direto)', 'Local sub-publisher (collects directly)'), value: SUB_FEE18, fmt: 'pct', tone: 'bad' }); }
    else { fee += 0.05; lag += 6; bb += 0.08; parts.push({ label: l('Acordo recíproco: sua sociedade também cobra e repassa 2 trimestres depois', 'Reciprocal deal: your home society also takes a cut and pays 2 quarters later'), value: 0.05, fmt: 'pct', tone: 'bad' }); }
  }
  const m = meta18(s).v;
  parts.push({ label: l('Caixa preta antes dos metadados', 'Black box before metadata'), value: bb, fmt: 'pct' });
  bb *= 1 - m;
  parts.push({ label: l('Metadados reduzem a caixa preta para', 'Metadata cut the black box to'), value: bb, fmt: 'pct', tone: 'good', why: { key: 'rights18.meta' } });
  lag += m < 0.25 ? 1 : m >= 0.55 ? -1 : 0;
  return { soc, fee: clamp(fee, 0, 0.6), lag: Math.max(0, lag), bb: clamp(bb, 0, 0.9), parts };
}

/** divisão da edição por modalidade na época */
export function modShares18(y: number): Record<'perf' | 'mech' | 'print', number> {
  const print = y < 1930 ? 0.35 : y < 1955 ? 0.15 : y < 1980 ? 0.05 : 0.02;
  const perf = y < 1950 ? 0.3 : y < 1980 ? 0.4 : y < 2005 ? 0.45 : 0.55;
  return { perf, mech: 1 - perf - print, print };
}

// ---------------------------------------------------------------- bloqueios e caução

const pendingSample = (s: GameState, sid: string) => s.samples.some((x) => x.songId === sid && x.status !== 'cleared');
export const disputeOf18 = (s: GameState, sid: string): Disp18 | undefined => r18(s).disp.find((d) => d.song === sid && d.st !== 'done');
const clrOf = (s: GameState, sid: string, kind: Clr18['kind']) => r18(s).clr.find((c) => c.song === sid && c.kind === kind);
/** obra de terceiros (cover/sample de música que não é do seu elenco) — sync precisa da editora da obra */
export function thirdWork18(s: GameState, so: Song): Song | undefined {
  const src = s.songs[so.coverOf ?? so.sampleOf ?? ''];
  if (!src || src.actId === so.actId) return undefined;
  return s.acts[src.actId]?.owner === 'player' ? undefined : src;
}
/** congelada: disputa de crédito, sample não liberado ou cover negado/pendente */
export function frozen18(s: GameState, sid: string): L | null {
  if (disputeOf18(s, sid)) return l('Obra em disputa de crédito: royalties de edição congelados em caução', 'Work in a credit dispute: publishing royalties frozen in escrow');
  if (pendingSample(s, sid)) return l('Sample sem liberação: edição congelada', 'Uncleared sample: publishing frozen');
  const c = clrOf(s, sid, 'cover');
  if (c && c.st !== 'ok') return l('Cover sem autorização da editora: edição congelada', 'Cover without publisher authorization: publishing frozen');
  return null;
}
USE_BLOCK18.fn = (s, songIds, kind) => {
  for (const sid of songIds) {
    const f = frozen18(s, sid);
    if (f) return fmtL(l('{f} — uso bloqueado até resolver (Direitos).', '{f} — use blocked until resolved (Rights).'), { f });
    const so = s.songs[sid];
    if (kind === 'sync' && so && thirdWork18(s, so) && !r18(s).syncOk[sid]) return l('Obra de terceiros: o sync precisa de autorização da editora da composição (Direitos › Autorizações).', 'Third-party work: sync needs the composition publisher\'s approval (Rights › Clearances).');
  }
  return null;
};

// ---------------------------------------------------------------- roteamento da edição (substitui o lançamento único de market.ts)

const GROSS_UP = 1.2;
function stmAdd(st: R18, due: number, mk: string, soc: string, k: Partial<Stm18>): void {
  let x = st.stm.find((y) => y.due === due && y.mk === mk);
  if (!x) { x = { due, mk, soc, g: 0, fee: 0, bb: 0, esc: 0, net: 0, perf: 0, mech: 0, print: 0, neigh: 0 }; st.stm.push(x); if (st.stm.length > 40) { st.stm.sort((a, b) => a.due - b.due); st.stm.splice(0, st.stm.length - 40); } }
  for (const [kk, v] of Object.entries(k)) if (typeof v === 'number') (x as unknown as Record<string, number>)[kk] += v;
}
function bbAdd(st: R18, s: GameState, mk: string, amt: number): void {
  if (amt <= 0) return;
  const x = st.bb.find((b) => b.mk === mk && b.y === s.year);
  if (x) x.amt += amt; else st.bb.push({ mk, y: s.year, amt });
}
function incAdd(st: R18, s: GameState, mod: string, mk: string, v: number): void {
  const Y = (st.inc[s.year] ??= {});
  Y[mod] = (Y[mod] ?? 0) + v; Y[`mk:${mk}`] = (Y[`mk:${mk}`] ?? 0) + v;
  for (const y of Object.keys(st.inc)) if (Number(y) < s.year - 6) delete st.inc[Number(y)];
}

/** Parte do selo na edição de um lançamento: por mercado e modalidade, com taxa da sociedade, caixa preta,
 *  caução das obras em disputa e prazo de repasse de cada sociedade. */
export function pubRoute18(s: GameState, rel: Release, amount: number): void {
  if (amount <= 0) return;
  const st = r18(s), f = fin18(s), base = proDue18(s);
  const n = Math.max(1, rel.songs.length);
  const escSongs = rel.songs.filter((sid) => frozen18(s, sid));
  const fEsc = escSongs.length / n;
  const fConf = rel.songs.filter((sid) => st.conf[sid] && !escSongs.includes(sid)).length / n;
  const ms = modShares18(s.year);
  const gross = amount * GROSS_UP;
  const out: { due: number; amt: number; mk: string }[] = [];
  let net = 0, esc = 0;
  for (const [mk, w] of mkWeights18(s, rel)) {
    for (const mod of ['perf', 'mech', 'print'] as const) {
      const a = gross * w * ms[mod];
      if (a <= 0) continue;
      const e = a * fEsc, rest = a - e;
      const rt = rate18(s, mk, mod);
      const bb = rest * clamp(fConf + (1 - fConf) * rt.bb, 0, 0.95);
      const fee = (rest - bb) * rt.fee;
      const n1 = rest - bb - fee;
      bbAdd(st, s, mk, bb);
      esc += e;
      net += n1;
      out.push({ due: base + rt.lag, amt: n1, mk });
      incAdd(st, s, mod, mk, n1);
      stmAdd(st, base + rt.lag, mk, rt.soc?.name ?? '—', { g: a, fee, bb, esc: e, net: n1, [mod]: n1 });
    }
  }
  if (esc > 0) for (const sid of escSongs) st.esc[sid] = (st.esc[sid] ?? 0) + esc / escSongs.length;
  const tot = Math.round(net);
  if (tot <= 0 || !post(s, `pub:${rel.id}`, tot, 'publishing', `Edição ${rel.title}`, false)) return;
  let left = tot;
  out.forEach((o, i) => { const a = i === out.length - 1 ? left : Math.round(o.amt); left -= a; if (a) bucket18(f.ar, { due: o.due, amt: a, cat: 'publishing', who: 'pro', mk: o.mk }); });
}

// ---------------------------------------------------------------- conexos (gravação tocada em público)

export function neighRate18(s: GameState, mk: string, rel: Release): { rate: number; why?: L } {
  const n = NEIGH18[mk];
  if (!n || s.year < n.from) return { rate: 0, why: l('Sem direito conexo cobrado neste mercado/época', 'No neighbouring right collected in this market/era') };
  const age = s.year - rel.year;
  if (mk === 'eu' && age > euTerm18(s)) return { rate: 0, why: fmtL(l('Domínio público na Europa (gravação com mais de {n} anos)', 'Public domain in Europe (recording over {n} years old)'), { n: euTerm18(s) }) };
  if (mk === 'na' && rel.year < 1972 && !precOn(s, 'mma')) return { rate: 0, why: l('Gravação anterior a 1972: sem proteção federal nos EUA', 'Pre-1972 recording: no US federal protection') };
  let rate = n.rate;
  if (n.digitalOnly) rate *= digital18(s.year);
  return { rate };
}

function neighMonth(s: GameState): void {
  const st = r18(s), f = fin18(s), base = proDue18(s);
  let label = 0;
  const out: { due: number; amt: number; mk: string }[] = [];
  const perfTo: Record<string, number> = {};
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player' || !rel.weekly.length || rel.weekly[rel.weekly.length - 1] <= 0) continue;
    const monthly = annualRevenue(rel) / 12;
    if (monthly <= 0) continue;
    const band = !!s.acts[rel.actId]?.playerBand;
    const deal = band ? undefined : dealOfRelease(s, rel);
    const own = deal && rightsOf(deal).master === 'shared' ? 0.5 : 1;
    for (const [mk, w] of mkWeights18(s, rel)) {
      const nr = neighRate18(s, mk, rel).rate;
      if (!nr) continue;
      const rt = rate18(s, mk, 'neigh');
      const g = monthly * w * nr;
      const bb = g * rt.bb;
      const netAll = (g - bb) * (1 - rt.fee);
      // ECAD/PPL: metade do produtor fonográfico (gravadora), metade de intérpretes e músicos
      const lab = netAll * 0.5 * own + (band ? netAll * 0.5 : 0);
      if (!band) perfTo[rel.actId] = (perfTo[rel.actId] ?? 0) + netAll * 0.5;
      bbAdd(st, s, mk, bb);
      label += lab;
      out.push({ due: base + rt.lag, amt: lab, mk });
      incAdd(st, s, 'neigh', mk, lab);
      stmAdd(st, base + rt.lag, mk, rt.soc?.name ?? '—', { g, fee: (g - bb) * rt.fee, bb, net: lab, neigh: lab });
    }
  }
  for (const [id, v] of Object.entries(perfTo)) { const a = s.acts[id]; if (a) a.cash += Math.round(v); }
  const tot = Math.round(label);
  if (tot <= 0 || !post(s, `neigh18:${s.year}:${s.month}`, tot, 'rights', 'Direitos conexos (gravações tocadas em público)', false)) return;
  let left = tot;
  out.forEach((o, i) => { const a = i === out.length - 1 ? left : Math.round(o.amt); left -= a; if (a) bucket18(f.ar, { due: o.due, amt: a, cat: 'rights', who: 'pro', mk: o.mk }); });
}

// ---------------------------------------------------------------- caixa preta

export const BB_YEARS18 = 3;
export const bbTotal18 = (s: GameState): number => r18(s).bb.reduce((t, b) => t + b.amt, 0);
export const bbExpiring18 = (s: GameState): number => r18(s).bb.filter((b) => b.y <= s.year - BB_YEARS18).reduce((t, b) => t + b.amt, 0);
/** chance/fração recuperável ao reclamar (agente de reclamação leva 20%) */
export const claimRate18 = (s: GameState): number => clamp(0.35 + meta18(s).v * 0.6, 0, 0.85);

export function claimBB18(s: GameState): L {
  const st = r18(s);
  if (st.claimCd > s.week) return l('Os auditores ainda estão trabalhando na última reclamação.', 'Auditors are still working on the last claim.');
  const tot = bbTotal18(s);
  if (tot < money(s, 200)) return l('Nada relevante na caixa preta.', 'Nothing relevant in the black box.');
  const rec = Math.round(tot * claimRate18(s));
  const fee = Math.round(rec * 0.2);
  st.bb = [];
  st.claimCd = s.week + 26;
  st.claimed += rec - fee;
  const f = fin18(s);
  if (post(s, `bb18:${s.week}`, rec - fee, 'publishing', 'Caixa preta recuperada (auditoria de sociedades)', false)) bucket18(f.ar, { due: proDue18(s), amt: rec - fee, cat: 'publishing', who: 'pro' });
  st.lost += tot - rec;
  const t = fmtL(l('Auditoria nas sociedades: {r} identificados de {t} parados (comissão de 20% ao agente). O resto foi rateado entre as majors.', 'Society audit: {r} identified out of {t} sitting unclaimed (20% agent commission). The rest was shared out among majors.'), { r: { pt: `$${Math.round(rec / 100)}`, en: `$${Math.round(rec / 100)}` }, t: { pt: `$${Math.round(tot / 100)}`, en: `$${Math.round(tot / 100)}` } });
  logIt(st, s, t);
  emitFact(s, { kind: 'audit', actors: ['player'], severity: 20, tags: ['money', 'rights'], text: t, src: 'rights18' });
  return t;
}

function bbMonth(s: GameState): void {
  if (s.month !== 0) return;
  const st = r18(s);
  const old = st.bb.filter((b) => b.y < s.year - BB_YEARS18);
  if (!old.length) return;
  const amt = old.reduce((t, b) => t + b.amt, 0);
  st.bb = st.bb.filter((b) => b.y >= s.year - BB_YEARS18);
  st.lost += amt;
  if (amt < money(s, 500)) return;
  const t = fmtL(l('{v} de royalties não identificados prescreveram: as sociedades ratearam pela participação de mercado das grandes gravadoras.', '{v} in unidentified royalties expired: societies shared it out by the majors\' market share.'), { v: { pt: `$${Math.round(amt / 100)}`, en: `$${Math.round(amt / 100)}` } });
  logIt(st, s, t);
  pushInbox18(s, 'rights18', { from: l('Equipe de direitos', 'Rights team').pt, subject: l('Caixa preta prescrita', 'Black box expired'), body: fmtL(l('{t} Metadados melhores e reclamar a tempo evitam isso.', '{t} Better metadata and claiming in time prevent this.'), { t }), tone: 'bad' });
}

// ---------------------------------------------------------------- splits, cadastro e disputas de crédito

registerSimHook('record', 'rights18', (s, _r, { song }) => {
  const own = song && s.acts[song.actId];
  if (!own || !(own.owner === 'player' || own.playerBand)) return;
  const st = r18(s);
  if (st.reg[song.id]) return;
  st.reg[song.id] = st.pol.split ? 2 : 1;
  if (st.pol.split) st.cost += money(s, 40);
  // cover fora dos EUA: precisa de autorização prévia da editora (nos EUA a licença mecânica é compulsória desde 1909)
  const src = s.songs[song.coverOf ?? ''];
  if (src && src.actId !== song.actId && s.acts[src.actId]?.owner !== 'player' && homeMk18(s) !== 'na' && !clrOf(s, song.id, 'cover'))
    st.clr.push({ id: nextId(s, 'clr'), kind: 'cover', song: song.id, src: src.id, fee: money(s, 400), st: 'pending', until: s.week + 6 });
});

registerSimHook('launch', 'rights18', (s, _r, { release: rel }) => {
  if (!rel || !mineRel(s, rel)) return;
  const st = r18(s), r = Rng.fromSeed(`${s.config.seed}:r18:launch:${rel.id}`), m = meta18(s).v;
  if (!st.watch.includes(rel.id)) { st.watch.push(rel.id); if (st.watch.length > 40) st.watch.shift(); }
  for (const sid of rel.songs) {
    const so = s.songs[sid];
    if (!so) continue;
    st.reg[sid] ??= 1;
    const version = !!(so.coverOf || so.remixOf || so.sampleOf || so.translationOf);
    if (!st.chk[`c:${sid}`]) {
      st.chk[`c:${sid}`] = 1;
      if (r.chance((0.1 + (version ? 0.1 : 0)) * (1 - m) * (st.pol.reg ? 0.5 : 1))) st.conf[sid] = s.week;
    }
    // regravação: o próprio ato regrava obra cujo master antigo é de outro dono
    const src = s.songs[so.coverOf ?? ''];
    const old = src && src.actId === so.actId ? s.releases[src.releaseId ?? ''] : undefined;
    if (old && old.owner !== rel.owner) {
      st.rr[old.id] = 0.6; st.rrNew[rel.id] = 1.12;
      if (!st.chk[`rr:${rel.id}`]) {
        st.chk[`rr:${rel.id}`] = 1;
        const t = fmtL(l('{a} lança a própria versão de "{t}": os fãs migram para o master novo; o antigo ({o}) perde demanda, mas os autores ganham nas duas.', '{a} releases their own version of "{t}": fans move to the new master; the old one ({o}) loses demand, but the writers earn on both.'), { a: s.acts[so.actId]?.name ?? '', t: src!.title, o: s.labels[old.owner]?.name ?? old.owner });
        emitFact(s, { kind: 'deal', actors: [so.actId, 'player'], severity: 40, tags: ['rerecord', 'rights'], text: t, src: 'rights18' });
        logIt(st, s, t);
      }
    }
  }
});

registerMod('chartUnits', 'rights18', (s, v, { release }) => {
  if (!release) return null;
  const st = r18(s);
  const a = st.rr[release.id], b = st.rrNew[release.id];
  if (a) return { value: v * a, label: l('Regravado pelo artista (fãs migram)', 'Re-recorded by the artist (fans migrate)') };
  if (b) return { value: v * b, label: l('Versão do artista (fãs apoiam)', 'Artist\'s version (fans rally)') };
  return null;
});

function claimantOf(s: GameState, so: Song, r: Rng): { who: string; name: string } | null {
  const act = s.acts[so.actId];
  const pool = (act?.members ?? []).filter((id) => s.persons[id]?.alive && !so.writers.includes(id) && !s.persons[id]?.isPlayer);
  if (pool.length) { const id = r.pick(pool); return { who: `p:${id}`, name: s.persons[id].name }; }
  if (s.year >= 1950 && s.year <= 1975) return { who: '', name: r.pick([l('um DJ de rádio que "ajudou" no sucesso', 'a radio DJ who "helped" the hit').pt, l('o dono da gravadora antiga', 'the old label owner').pt, l('o empresário da época', 'the manager back then').pt]) };
  if (so.producerId && r.chance(0.5)) return { who: '', name: l('o produtor da faixa', 'the track\'s producer').pt };
  return null;
}

function creditsMonth(s: GameState): void {
  const st = r18(s), r = seed(s, 'credit');
  for (const id of st.watch) {
    const rel = s.releases[id];
    if (!rel || !(rel.peak <= 20 || rel.totalUnits >= 100000)) continue;
    for (const sid of rel.songs) {
      if (st.chk[`d:${sid}`] || st.reg[sid] !== 1) continue;
      st.chk[`d:${sid}`] = 1;
      const so = s.songs[sid];
      if (!so || disputeOf18(s, sid)) continue;
      const cut = s.year >= 1950 && s.year <= 1975 ? 1.4 : 1;
      if (!r.chance(0.2 * cut)) continue;
      const c = claimantOf(s, so, r);
      if (!c || shield18(s, so.actId)) continue;
      openDispute18(s, so, rel, c.who, c.name, 'credit', Math.round((0.2 + r.next() * 0.3) * 100) / 100);
    }
  }
}

export function openDispute18(s: GameState, so: Song, rel: Release | undefined, who: string, name: string, kind: Disp18['kind'], share: number): Disp18 {
  const st = r18(s);
  const d: Disp18 = { id: nextId(s, 'dsp'), song: so.id, rel: rel?.id, who, name, kind, share, since: s.week, st: 'open' };
  st.disp.push(d);
  const act = s.acts[so.actId];
  const t = kind === 'credit'
    ? fmtL(l('{n} diz que é coautor(a) de "{t}" e pede {p}% da obra. Até resolver, a edição fica congelada em caução e sync/licenças estão bloqueados.', '{n} claims co-authorship of "{t}" and wants {p}% of the work. Until it is settled, publishing is frozen in escrow and sync/licensing are blocked.'), { n: name, t: so.title, p: Math.round(share * 100) })
    : fmtL(l('A editora de "{t}" não autorizou a sua versão: royalties congelados e usos bloqueados.', 'The publisher of "{t}" did not authorize your version: royalties frozen and uses blocked.'), { t: so.title });
  emitFact(s, { kind: 'credit_dispute', actors: [who.startsWith('p:') ? who.slice(2) : 'player', so.actId], severity: 35, tags: ['rights', 'money'], text: t, src: 'rights18' });
  if (act) for (const pid of act.members) if (s.persons[pid]?.alive) addStress(s, pid, kind === 'credit' ? 8 : 3, l('Briga de créditos', 'Credit fight'));
  if (who.startsWith('p:') && act) act.trust = clamp(act.trust - 4, 0, 100);
  remember(s, 'credit18', t, { actId: so.actId, important: true });
  logIt(st, s, t);
  pushInbox18(s, 'rights18', { from: name, subject: fmtL(l('Disputa: "{t}"', 'Dispute: "{t}"'), { t: so.title }), body: t, tone: 'bad', weeks: 10, ref: { d: d.id, act: so.actId },
    actions: [
      { id: 'give', label: fmtL(l('Reconhecer: {p}% da obra para {n} (caução liberada)', 'Concede: {p}% of the work to {n} (escrow released)'), { p: Math.round(share * 100), n: name }) },
      { id: 'court', label: fmtL(l('Ir à Justiça ({o}% de chance; custas)', 'Go to court ({o}% chance; legal fees)'), { o: Math.round(courtOdds18(s, d) * 100) }) },
      { id: 'wait', label: l('Esperar (caução cresce; mediação em 12 meses)', 'Wait (escrow grows; mediation in 12 months)') },
    ] });
  return d;
}

export function courtOdds18(s: GameState, d: Disp18): number {
  const st = r18(s);
  return clamp((st.reg[d.song] === 2 ? 0.8 : 0.45) + staffSkill(s, 'legal') / 400 + (d.kind === 'cover' ? -0.2 : 0), 0.05, 0.92);
}

function releaseEscrow(s: GameState, d: Disp18, keep: number): number {
  const st = r18(s);
  const amt = Math.round((st.esc[d.song] ?? 0) * keep);
  delete st.esc[d.song];
  if (amt > 0 && post(s, `esc18:${d.id}`, amt, 'publishing', 'Caução liberada', false)) bucket18(fin18(s).ar, { due: proDue18(s), amt, cat: 'publishing', who: 'pro' });
  return amt;
}
function grantShare(s: GameState, d: Disp18): void {
  const so = s.songs[d.song];
  if (!so || !d.who.startsWith('p:')) return;
  const pid = d.who.slice(2);
  const base = so.splits?.length ? so.splits : so.writers.map((w) => ({ personId: w, share: 1 / Math.max(1, so.writers.length) }));
  so.splits = [...base.map((x) => ({ personId: x.personId, share: x.share * (1 - d.share) })), { personId: pid, share: d.share }];
  if (!so.writers.includes(pid)) so.writers = [...so.writers, pid];
}

export function resolveDispute18(s: GameState, id: string, how: 'give' | 'court' | 'wait'): L {
  const st = r18(s), d = st.disp.find((x) => x.id === id);
  if (!d || d.st === 'done') return l('Disputa encerrada.', 'Dispute closed.');
  const so = s.songs[d.song], act = so && s.acts[so.actId];
  if (how === 'wait') return l('Você espera. A caução segue crescendo.', 'You wait. Escrow keeps growing.');
  if (how === 'give') {
    d.st = 'done';
    grantShare(s, d);
    const amt = releaseEscrow(s, d, d.kind === 'cover' ? 0.5 : 1 - d.share);
    if (act) act.trust = clamp(act.trust + 3, 0, 100);
    d.res = fmtL(l('Acordo: crédito reconhecido; {v} liberados.', 'Settled: credit granted; {v} released.'), { v: { pt: `$${Math.round(amt / 100)}`, en: `$${Math.round(amt / 100)}` } });
    logIt(st, s, d.res);
    return d.res;
  }
  if (d.st === 'court') return l('O processo já corre.', 'The case is already running.');
  const fee = money(s, 4000);
  if (s.player.cash < fee) return l('Caixa insuficiente para as custas.', 'Not enough cash for legal fees.');
  post(s, `court18:${d.id}`, -fee, 'legal', `Processo de crédito "${so?.title ?? ''}"`);
  d.st = 'court'; d.court = s.week + 13; d.odds = courtOdds18(s, d);
  return fmtL(l('Processo aberto: veredito em ~3 meses ({o}% de chance).', 'Case filed: verdict in ~3 months ({o}% chance).'), { o: Math.round(d.odds * 100) });
}

function disputesMonth(s: GameState): void {
  const st = r18(s), r = seed(s, 'disp');
  for (const d of st.disp) {
    if (d.st === 'done') continue;
    const so = s.songs[d.song], act = so && s.acts[so.actId];
    if (d.st === 'court' && (d.court ?? 0) <= s.week) {
      d.st = 'done';
      const win = r.chance(d.odds ?? 0.5);
      if (win) { releaseEscrow(s, d, 1); if (d.who.startsWith('p:') && act) { act.trust = clamp(act.trust - 6, 0, 100); addStress(s, d.who.slice(2), 12, l('Perdeu a disputa de crédito', 'Lost the credit dispute')); } }
      else { grantShare(s, d); releaseEscrow(s, d, 0.3); post(s, `court18b:${d.id}`, -money(s, 3000), 'legal', 'Custas e honorários da parte vencedora'); }
      d.res = win ? fmtL(l('Vitória na Justiça: "{t}" segue com os créditos originais; caução liberada.', 'Court win: "{t}" keeps its original credits; escrow released.'), { t: so?.title ?? '' })
        : fmtL(l('Derrota: {n} entra nos créditos de "{t}" e leva a maior parte da caução.', 'Defeat: {n} joins the credits of "{t}" and takes most of the escrow.'), { n: d.name, t: so?.title ?? '' });
      emitFact(s, { kind: 'case_ruling', actors: ['player', so?.actId ?? ''], severity: 30, tags: ['rights', win ? 'win' : 'loss'], text: d.res, src: 'rights18' });
      notify(s, d.res, win ? 'good' : 'bad');
      logIt(st, s, d.res);
    } else if (d.st === 'open' && s.week - d.since >= 52) {
      d.st = 'done';
      grantShare(s, { ...d, share: d.share / 2 });
      releaseEscrow(s, d, 0.5);
      d.res = fmtL(l('Mediação depois de um ano: metade do pedido para {n}, metade da caução para cada lado.', 'Mediation after a year: half the claim to {n}, half the escrow each.'), { n: d.name });
      logIt(st, s, d.res);
    }
  }
  st.disp = st.disp.filter((d) => d.st !== 'done' || s.week - d.since < 156).slice(-30);
  // conflitos de cadastro: com política de registro (ou equipe), a sociedade corrige em ~6 meses
  for (const [sid, w] of Object.entries(st.conf)) if ((st.pol.reg || staffSkill(s, 'rights') > 40) && s.week - w >= 26) delete st.conf[sid];
}

export function fixConflict18(s: GameState, sid: string): L | null {
  const st = r18(s);
  if (!st.conf[sid]) return null;
  const c = money(s, 250);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `fix18:${sid}`, -c, 'publishing', 'Correção de cadastro de obra');
  delete st.conf[sid];
  return null;
}

// ---------------------------------------------------------------- autorizações (sample, cover, sync)

export function payClearance18(s: GameState, kind: 'sample' | 'replay' | 'cover' | 'sync', id: string): L {
  const st = r18(s), r = Rng.fromSeed(`${s.config.seed}:r18:clr:${id}:${s.week}`);
  if (kind === 'sample' || kind === 'replay') {
    const q = s.samples.find((x) => x.id === id);
    if (!q || q.status === 'cleared') return l('Nada a liberar.', 'Nothing to clear.');
    const fee = kind === 'replay' ? Math.round(q.fee * 0.5) : q.status === 'denied' ? q.fee * 2 : q.fee;
    if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `clr18:${id}:${s.week}`, -fee, 'rights', kind === 'replay' ? 'Interpolação (regravar o trecho)' : 'Liberação de sample');
    if (kind === 'replay') { q.kind = 'interpolation'; q.share = 0.2; q.status = 'cleared'; return l('Trecho regravado pelos músicos: só a composição precisa de licença (20% da edição ao autor original).', 'Passage replayed by session musicians: only the composition needs a license (20% of publishing to the original writer).'); }
    if (q.status === 'denied' && !r.chance(0.45)) return l('O detentor recusou de novo (o dinheiro da proposta foi gasto com advogados).', 'The owner refused again (the offer money went to lawyers).');
    q.status = 'cleared';
    return l('Sample liberado: a caução da obra volta a pagar.', 'Sample cleared: the work pays again.');
  }
  const c = st.clr.find((x) => x.id === id);
  if (kind === 'sync') {
    const so = s.songs[id];
    if (!so || st.syncOk[id]) return l('Nada a liberar.', 'Nothing to clear.');
    const fee = money(s, 800);
    if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `clrs18:${id}:${s.week}`, -fee, 'rights', `Liberação de sync "${so.title}"`);
    if (!r.chance(0.7)) return l('A editora da obra recusou o uso em publicidade/cinema.', 'The work\'s publisher refused the sync use.');
    st.syncOk[id] = 1;
    return l('Editora da obra autorizou o sync.', 'The work\'s publisher approved the sync.');
  }
  if (!c || c.st === 'ok') return l('Nada a liberar.', 'Nothing to clear.');
  const fee = c.fee * 3;
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `clrc18:${id}:${s.week}`, -fee, 'rights', 'Autorização de cover (proposta melhor)');
  if (!r.chance(0.6)) return l('A editora manteve a recusa.', 'The publisher kept refusing.');
  c.st = 'ok';
  const d = disputeOf18(s, c.song);
  if (d && d.kind === 'cover') { d.st = 'done'; releaseEscrow(s, d, 1); }
  return l('Cover autorizado: royalties liberados.', 'Cover authorized: royalties released.');
}

function clearancesMonth(s: GameState): void {
  const st = r18(s), r = seed(s, 'clr');
  for (const c of st.clr) {
    if (c.st !== 'pending' || c.until > s.week) continue;
    const src = s.songs[c.src ?? ''];
    const holder = src ? s.acts[src.actId]?.owner : undefined;
    let p = 0.85;
    if (holder && holder !== 'player') p -= (s.rivalries[holder] ?? 0) / 250;
    if (src && s.acts[src.actId]?.deceased) p -= 0.15;
    c.st = r.chance(p) ? 'ok' : 'denied';
    const so = s.songs[c.song];
    if (c.st === 'denied' && so) {
      const rel = s.releases[so.releaseId ?? ''];
      if (rel && !disputeOf18(s, so.id)) openDispute18(s, so, rel, '', l('Editora da obra original', 'Original work\'s publisher').pt, 'cover', 0.5);
      else logIt(st, s, fmtL(l('Editora negou a versão de "{t}": não lance sem autorização.', 'Publisher denied your version of "{t}": do not release without authorization.'), { t: so.title }));
    }
  }
  st.clr = st.clr.filter((c) => c.st !== 'ok' || s.songs[c.song]).slice(-40);
}

// ---------------------------------------------------------------- regravações (ação do jogador e de NPCs)

export function rerecordable18(s: GameState, actId: string): Release[] {
  return Object.values(s.releases).filter((x) => x.actId === actId && x.owner !== 'player' && x.owner !== 'indie' && s.year - x.year >= 5 && !r18(s).rr[x.id] && x.totalUnits > 0)
    .sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 6);
}
/** "Versão do artista": o ato regrava as faixas mais fortes dos masters que pertencem a outro selo. */
export function rerecord18(s: GameState, actId: string, makeCover: (s: GameState, actId: string, src: string) => Song | L): L {
  const act = s.acts[actId];
  if (!act || !playerActs(s).includes(actId)) return l('Só artistas do seu elenco.', 'Only your roster.');
  const rels = rerecordable18(s, actId);
  if (!rels.length) return l('Nenhum master antigo de outro selo com mais de 5 anos (cláusula de restrição de regravação).', 'No old master owned by another label older than 5 years (re-record restriction).');
  const done: string[] = [];
  for (const rel of rels) for (const sid of rel.songs) {
    if (done.length >= 4) break;
    const src = s.songs[sid];
    if (!src || Object.values(s.songs).some((x) => x.coverOf === sid && x.actId === actId)) continue;
    const res = makeCover(s, actId, sid);
    if ('id' in res) { res.title = `${src.title} (${l('Versão do artista', 'Artist\'s Version').pt})`; done.push(src.title); }
  }
  if (!done.length) return l('Nada novo para regravar.', 'Nothing new to re-record.');
  remember(s, 'rerecord18', fmtL(l('{a} começa a regravar o catálogo antigo: {t}.', '{a} starts re-recording the old catalog: {t}.'), { a: act.name, t: done.join(', ') }), { actId, important: true });
  return fmtL(l('{n} faixa(s) no repertório para gravar: grave e lance para tirar os fãs do master antigo.', '{n} track(s) added to the repertoire: record and release them to pull fans off the old master.'), { n: done.length });
}

function npcRerecordYear(s: GameState): void {
  const st = r18(s), r = seed(s, 'rr');
  if (s.year < 1965) return;
  const by: Record<string, Release[]> = {};
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player' || st.rr[rel.id] || s.year - rel.year < 5) continue;
    const a = s.acts[rel.actId];
    if (!a || a.playerBand || a.owner === 'player' || a.status === 'retired' || a.status === 'split' || a.fame < 30) continue;
    (by[a.id] ??= []).push(rel);
  }
  for (const [aid, rels] of Object.entries(by)) {
    const a = s.acts[aid];
    if (rels.length < 2 || shield18(s, aid) || !r.chance(a.trust < 40 ? 0.1 : 0.03)) continue;
    for (const rel of rels) st.rr[rel.id] = 0.6;
    const t = fmtL(l('{a} regrava os discos que gravou com você: {n} masters seus perdem ~40% da demanda (a composição continua pagando os autores).', '{a} re-records the albums made with you: {n} of your masters lose ~40% of demand (the songs keep paying their writers).'), { a: a.name, n: rels.length });
    emitFact(s, { kind: 'deal', actors: [aid, 'player'], severity: 50, tags: ['rerecord', 'rights', 'bad'], text: t, src: 'rights18' });
    remember(s, 'rerecord18', t, { actId: aid, important: true });
    notify(s, t, 'bad');
    logIt(st, s, t);
  }
}

// ---------------------------------------------------------------- rescisão de 35 anos (EUA, cessões de 1978+)

export const termWindow18 = (s: GameState, rel: Release): number | null => {
  const a = s.acts[rel.actId];
  if (!termOn18(s) || rel.year < 1978 || !a || a.playerBand || (cityById[a.city]?.market ?? '') !== 'na') return null;
  return rel.year + 35;
};

function termYear(s: GameState): void {
  if (!termOn18(s)) return;
  const st = r18(s), r = seed(s, 'term');
  // efetiva as rescisões vencidas
  for (const t of st.term) {
    if ((t.st === 'notice' || t.st === 'accepted') && s.year >= t.eff) {
      t.st = 'done';
      const a = s.acts[t.act];
      let n = 0;
      for (const id of t.rels) { const rel = s.releases[id]; if (rel && rel.owner === 'player') { rel.owner = 'indie'; n++; } }
      rst(s).reversions.push({ week: s.week, actId: t.act, contractId: '', n });
      const text = fmtL(l('Rescisão de 35 anos: {n} master(s) de {a} voltam ao artista (lei americana de 1976).', '35-year termination: {n} of {a}\'s master(s) return to the artist (1976 US Copyright Act).'), { n, a: a?.name ?? '' });
      emitFact(s, { kind: 'termination', actors: [t.act, 'player'], severity: 45, tags: ['rights', 'masters'], text, src: 'rights18' });
      remember(s, 'term18', text, { actId: t.act, important: true });
      notify(s, text, 'bad');
      logIt(st, s, text);
    }
    if (t.st === 'contest' && (t.court ?? 0) <= s.year) {
      const win = r.chance(t.odds ?? 0.3);
      t.st = win ? 'kept' : 'accepted';
      const text = win ? l('Justiça aceita a tese de "obra por encomenda": os masters ficam com o selo.', 'Court accepts the "work made for hire" defense: the masters stay with the label.') : l('Justiça confirma a rescisão: os masters voltam ao artista na data.', 'Court upholds the termination: the masters return to the artist on schedule.');
      emitFact(s, { kind: 'case_ruling', actors: ['player', t.act], severity: 35, tags: ['rights', win ? 'win' : 'loss'], text, src: 'rights18' });
      logIt(st, s, text);
      if (!win && s.acts[t.act]) s.acts[t.act].trust = clamp(s.acts[t.act].trust - 10, 0, 100);
    }
  }
  // novos avisos
  const by: Record<string, Release[]> = {};
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player') continue;
    const eff = termWindow18(s, rel);
    if (eff === null || s.year < eff - 10 || s.year > eff) continue;
    (by[rel.actId] ??= []).push(rel);
  }
  const mul = precMul18(s, 'term');
  for (const [aid, rels] of Object.entries(by)) {
    if (st.term.some((t) => t.act === aid && t.st !== 'done' && t.st !== 'kept')) continue;
    const a = s.acts[aid];
    if (!a || !a.members.some((id) => s.persons[id]) || shield18(s, aid)) continue;
    if (!r.chance(0.12 * mul * (a.trust < 50 ? 1.5 : 0.7))) continue;
    const eff = Math.max(s.year + 2, Math.min(...rels.map((x) => x.year)) + 35);
    const t: Term18 = { id: nextId(s, 'trm'), act: aid, rels: rels.filter((x) => x.year + 35 <= eff + 5).map((x) => x.id), eff, st: 'notice' };
    st.term.push(t);
    const rev = t.rels.reduce((sum, id) => sum + annualRevenue(s.releases[id]), 0);
    const price = Math.max(money(s, 5000), Math.round(rev * 2.5));
    const text = fmtL(l('{a} envia aviso de rescisão: {n} master(s) voltam ao artista em {y}, a menos que vocês cheguem a um acordo.', '{a} serves a termination notice: {n} master(s) return to the artist in {y} unless you reach a deal.'), { a: a.name, n: t.rels.length, y: eff });
    emitFact(s, { kind: 'statement', actors: [aid, 'player'], severity: 40, tags: ['rights', 'termination'], text, src: 'rights18' });
    logIt(st, s, text);
    pushInbox18(s, 'rights18', { from: a.name, subject: l('Aviso de rescisão (35 anos)', 'Termination notice (35 years)'), body: text, tone: 'bad', weeks: 12, ref: { term: t.id, act: aid, price },
      actions: [
        { id: 'reneg', label: fmtL(l('Renegociar: pagar {v} e o artista retira o aviso', 'Renegotiate: pay {v} and the artist withdraws'), { v: { pt: `$${Math.round(price / 100)}`, en: `$${Math.round(price / 100)}` } }) },
        { id: 'contest', label: fmtL(l('Contestar ("obra por encomenda"; {o}% de chance; custas)', 'Contest ("work for hire"; {o}% chance; legal fees)'), { o: Math.round(termOdds18(s) * 100) }) },
        { id: 'accept', label: l('Aceitar (venda o catálogo antes, se quiser)', 'Accept (sell the catalog first, if you like)') },
      ] });
  }
  st.term = st.term.filter((t) => t.st !== 'done' || s.year - t.eff < 6).slice(-20);
}
export const termOdds18 = (s: GameState): number => clamp(0.35 + staffSkill(s, 'legal') / 400 + precAdd18(s, 'termOdds'), 0.05, 0.8);

export function answerTerm18(s: GameState, id: string, how: 'reneg' | 'contest' | 'accept', price = 0): L {
  const st = r18(s), t = st.term.find((x) => x.id === id);
  if (!t || t.st !== 'notice') return l('Aviso já resolvido.', 'Notice already handled.');
  const a = s.acts[t.act];
  if (how === 'reneg') {
    const p = price || money(s, 5000);
    if (s.player.cash < p) return l('Caixa insuficiente: o aviso continua valendo.', 'Not enough cash: the notice stands.');
    post(s, `term18:${t.id}`, -p, 'acquisitions', `Renegociação de masters (${a?.name ?? ''})`);
    t.st = 'kept';
    if (a) a.trust = clamp(a.trust + 8, 0, 100);
    return l('Acordo: o artista retira o aviso e os masters seguem com o selo.', 'Deal: the artist withdraws the notice and the masters stay with the label.');
  }
  if (how === 'contest') {
    const fee = money(s, 6000);
    if (s.player.cash < fee) return l('Caixa insuficiente para as custas.', 'Not enough cash for legal fees.');
    post(s, `termc18:${t.id}`, -fee, 'legal', 'Contestação de rescisão');
    t.st = 'contest'; t.court = s.year + 1; t.odds = termOdds18(s);
    if (a) a.trust = clamp(a.trust - 8, 0, 100);
    return l('Contestação na Justiça: veredito no ano que vem.', 'Contested in court: verdict next year.');
  }
  t.st = 'accepted';
  return fmtL(l('Aceito: os masters voltam ao artista em {y}.', 'Accepted: the masters return to the artist in {y}.'), { y: t.eff });
}

// ---------------------------------------------------------------- subeditoras e sociedades

export function setSoc18(s: GameState, mk: string, id: string): L | null {
  const o = socOptions18(s, mk).find((x) => x.id === id);
  if (!o) return l('Sociedade indisponível.', 'Society unavailable.');
  if (o.invite && Object.values(s.releases).filter((x) => mineRel(s, x)).length < 15) return l('A SESAC só convida editoras com catálogo relevante (15+ lançamentos).', 'SESAC only invites publishers with a meaningful catalog (15+ releases).');
  const st = r18(s);
  if (st.soc[mk] && st.soc[mk] !== id) post(s, `soc18:${mk}:${s.week}`, -money(s, 1500), 'publishing', 'Troca de sociedade (recadastro do catálogo)');
  st.soc[mk] = id;
  if (mk === 'na') {
    const w = (s.x4 as unknown as { w4?: { society?: string } }).w4;
    if (w) w.society = id === 'ascap' ? 'scae' : id === 'bmi' ? 'rmr' : undefined;
  }
  return null;
}
export const subCost18 = (s: GameState, mk: string): number => money(s, 1500 + 6000 * (MARKETS.find((m) => m.id === mk)?.size(s.year) ?? 0.3));
export function setSub18(s: GameState, mk: string, on: boolean): L | null {
  const st = r18(s);
  if (!on) { delete st.sub[mk]; return null; }
  if (mk === homeMk18(s)) return l('No seu mercado você já cobra direto.', 'You already collect directly at home.');
  const c = subCost18(s, mk);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `sub18:${mk}:${s.week}`, -c, 'publishing', `Subedição (${mkName(mk).pt}, 3 anos)`);
  st.sub[mk] = s.year + 3;
  return null;
}

// ---------------------------------------------------------------- editora como negócio: administração de catálogos

export const canAdmin18 = (s: GameState): boolean => !!s.ownPublishing || !!(s.x4 as unknown as { ventures9?: { list: { kind: string }[] } }).ventures9?.list.some((v) => v.kind === 'publisher');
const EST = ['Espólio', 'Catálogo', 'Edições', 'Herdeiros de'];
function admMonth(s: GameState): void {
  const st = r18(s), r = seed(s, 'adm');
  const m = meta18(s).v;
  st.admOff = st.admOff.filter((o) => (o.exp ?? 0) > s.week);
  if (canAdmin18(s) && st.admOff.length < 2 && s.month % 3 === 1 && r.chance(0.35 + st.adm.length * 0.03)) {
    const ids = Object.keys(s.persons);
    let name = '';
    for (let i = 0; i < 12 && !name; i++) { const p = s.persons[ids[r.int(0, ids.length - 1)]]; if (p && !p.isPlayer && ((p.skills.comp ?? 0) >= 45 || !p.alive)) name = `${r.pick(EST)} ${p.name}`; }
    if (name) st.admOff.push({ id: nextId(s, 'adm'), name, size: money(s, r.int(3000, 30000)), fee: 0.15, until: s.year + 3, sat: 60, exp: s.week + 13 });
  }
  if (!st.adm.length) return;
  let inc = 0;
  for (const c of st.adm) {
    inc += (c.size / 12) * c.fee * (0.7 + 0.6 * m);
    c.sat = clamp(c.sat + (m - 0.35) * 2, 0, 100);
  }
  const amt = Math.round(inc), cost = Math.round(st.adm.reduce((t, c) => t + c.size, 0) / 12 * 0.02);
  const f = fin18(s);
  if (amt > 0 && post(s, `adm18:${s.year}:${s.month}`, amt, 'publishing', 'Administração de catálogos de terceiros', false)) bucket18(f.ar, { due: proDue18(s), amt, cat: 'publishing', who: 'pro' });
  if (cost > 0) post(s, `admc18:${s.year}:${s.month}`, -cost, 'publishing', 'Equipe de administração de catálogos');
  incAdd(st, s, 'adm', homeMk18(s), amt);
  if (s.month === 0) {
    for (const c of st.adm) if (c.until <= s.year) {
      if (c.sat >= 50) { c.until = s.year + 3; logIt(st, s, fmtL(l('{n} renova a administração por 3 anos.', '{n} renews administration for 3 years.'), { n: c.name })); }
      else { c.until = -1; const t = fmtL(l('{n} leva o catálogo para outra editora: royalties mal identificados (satisfação {v}).', '{n} moves the catalog to another publisher: poorly identified royalties (satisfaction {v}).'), { n: c.name, v: Math.round(c.sat) }); logIt(st, s, t); notify(s, t, 'bad'); }
    }
    st.adm = st.adm.filter((c) => c.until >= s.year);
  }
}
/** aceitar um cliente de administração com a taxa pedida (10/15/20%); taxa alta = mais chance de recusa */
export function takeAdm18(s: GameState, id: string, fee: number): L {
  const st = r18(s), o = st.admOff.find((x) => x.id === id);
  if (!o) return l('Proposta expirou.', 'Offer expired.');
  const r = Rng.fromSeed(`${s.config.seed}:r18:adm:${id}:${fee}`);
  st.admOff = st.admOff.filter((x) => x.id !== id);
  const p = fee <= 0.1 ? 0.95 : fee <= 0.15 ? 0.75 : 0.45;
  if (!r.chance(p + meta18(s).v * 0.1)) return fmtL(l('{n} achou {f}% caro e fechou com outra editora.', '{n} found {f}% too steep and went elsewhere.'), { n: o.name, f: Math.round(fee * 100) });
  st.adm.push({ ...o, fee, exp: undefined });
  return fmtL(l('{n} entrega a administração do catálogo por 3 anos ({f}% do arrecadado).', '{n} hands over catalog administration for 3 years ({f}% of collections).'), { n: o.name, f: Math.round(fee * 100) });
}

// ---------------------------------------------------------------- avaliação de catálogo (compra/venda)

export interface CatVal18 { annual: number; mult: number; value: number; parts: WhyPart[] }
export function eraMult18(y: number): number { return y < 1985 ? 5 : y < 2000 ? 7 : y < 2014 ? 9 : y < 2022 ? 15 : 12; }
export function catVal18(s: GameState, rels: Release[], own = false): CatVal18 {
  const rows = rels.map((r) => ({ r, a: annualRevenue(r) })).filter((x) => x.a > 0);
  const annual = rows.reduce((t, x) => t + x.a, 0);
  const parts: WhyPart[] = [];
  const em = eraMult18(s.year);
  parts.push({ label: fmtL(l('Múltiplo de mercado em {y}', 'Market multiple in {y}'), { y: s.year }), value: em, fmt: 'mult' });
  if (!annual) return { annual: 0, mult: em, value: 0, parts };
  let m = em;
  const byAct: Record<string, number> = {};
  for (const x of rows) byAct[x.r.actId] = (byAct[x.r.actId] ?? 0) + x.a / annual;
  const hhi = Object.values(byAct).reduce((t, v) => t + v * v, 0);
  const div = clamp(1.05 - 0.3 * (hhi - 0.2) / 0.8, 0.75, 1.05);
  parts.push({ label: fmtL(l('Diversificação ({n} artistas)', 'Diversification ({n} acts)'), { n: Object.keys(byAct).length }), value: div, fmt: 'mult', tone: div < 1 ? 'bad' : 'good' });
  const top = Math.max(...rows.map((x) => x.a)) / annual;
  const conc = top > 0.5 ? 1 - (top - 0.5) * 0.4 : 1;
  parts.push({ label: fmtL(l('Concentração: o maior sucesso é {p}% da receita', 'Concentration: the biggest hit is {p}% of revenue'), { p: Math.round(top * 100) }), value: conc, fmt: 'mult', tone: conc < 1 ? 'bad' : undefined });
  let risk = 0;
  for (const x of rows) {
    const eff = termWindow18(s, x.r);
    const deal = dealOfRelease(s, x.r);
    const rv = deal ? rightsOf(deal).reversionYears : 0;
    if ((eff !== null && eff - s.year <= 12) || (deal && rv > 0)) risk += x.a / annual;
  }
  const dur = 1 - 0.5 * risk;
  parts.push({ label: fmtL(l('Duração dos direitos: {p}% sob rescisão (35 anos, EUA) ou reversão', 'Rights duration: {p}% under termination (35 years, US) or reversion'), { p: Math.round(risk * 100) }), value: dur, fmt: 'mult', tone: risk > 0 ? 'bad' : undefined });
  let hot = 0, old = 0;
  for (const x of rows) { const g = s.acts[x.r.actId]?.genre ?? ''; if ((s.genrePop[g] ?? 1) > 1.3) hot += x.a / annual; if (s.year - x.r.year >= 10) old += x.a / annual; }
  const trend = (1 - 0.2 * hot) * (1 + 0.1 * old);
  parts.push({ label: fmtL(l('Modas: {h}% em gêneros no auge (podem esfriar); {o}% clássicos de 10+ anos', 'Trends: {h}% in peaking genres (may cool); {o}% classics 10+ years old'), { h: Math.round(hot * 100), o: Math.round(old * 100) }), value: trend, fmt: 'mult', tone: trend < 1 ? 'bad' : 'good' });
  let disp = 0;
  for (const x of rows) if (x.r.songs.some((sid) => frozen18(s, sid))) disp += x.a / annual;
  const dq = 1 - 0.6 * disp;
  if (disp) parts.push({ label: l('Obras em disputa ou sem autorização', 'Works in dispute or uncleared'), value: dq, fmt: 'mult', tone: 'bad' });
  const mq = own ? 0.95 + 0.1 * meta18(s).v : 1;
  if (own) parts.push({ label: l('Metadados (auditoria do comprador)', 'Metadata (buyer\'s due diligence)'), value: mq, fmt: 'mult', why: { key: 'rights18.meta' } });
  m *= div * conc * dur * trend * dq * mq;
  return { annual, mult: m, value: Math.round(annual * m), parts };
}

// ---------------------------------------------------------------- mês / ano

registerSimHook('month', 'rights18', (s) => {
  const st = r18(s);
  precMonth18(s);
  neighMonth(s);
  bbMonth(s);
  creditsMonth(s);
  disputesMonth(s);
  clearancesMonth(s);
  admMonth(s);
  if (st.cost > 0) { post(s, `split18:${s.year}:${s.month}`, -st.cost, 'publishing', 'Split sheets e cadastro de obras'); st.cost = 0; }
  if (st.pol.reg && playerActs(s).length) post(s, `reg18:${s.year}:${s.month}`, -money(s, 120), 'publishing', 'Serviço de registro de obras');
  if (s.month === 0) { npcRerecordYear(s); termYear(s); }
});

// ---------------------------------------------------------------- caixa de entrada, conselheiro e "por quê"

registerInboxKind('rights18', {
  label: l('Direitos', 'Rights'), cat: 'deals', icon: 'contract', prio: 2,
  goto: () => ({ area: 'rights18', label: l('Abrir Direitos', 'Open Rights') }),
  handle: (s, m, action) => {
    const ref = m.ref ?? {};
    if (ref.d) return resolveDispute18(s, String(ref.d), action as 'give' | 'court' | 'wait');
    if (ref.term) return answerTerm18(s, String(ref.term), action as 'reneg' | 'contest' | 'accept', Number(ref.price ?? 0));
    if (ref.prec && action.startsWith('fund_')) return fundPrec18(s, String(ref.prec), action === 'fund_p' ? 'p' : 'd') ?? l('Apoio registrado.', 'Support recorded.');
    return l('Ok.', 'Ok.');
  },
});

registerAdvisorTip('rights18', (s) => {
  const st = r18(s), out: AdvTip18[] = [];
  const exp = st.bb.filter((b) => b.y <= s.year - BB_YEARS18 + 1).reduce((t, b) => t + b.amt, 0);
  if (exp > money(s, 2000) && st.claimCd <= s.week) out.push({ id: 'r18-bb', level: 'warn', cat: 'cash', score: 62, text: l('Royalties não identificados vão prescrever.', 'Unidentified royalties are about to expire.'),
    why: [fmtL(l('{v} na caixa preta com mais de 2 anos.', '{v} in the black box older than 2 years.'), { v: { pt: `$${Math.round(exp / 100)}`, en: `$${Math.round(exp / 100)}` } })],
    effect: fmtL(l('Auditoria recupera ~{p}% (menos 20% de comissão).', 'An audit recovers ~{p}% (minus 20% commission).'), { p: Math.round(claimRate18(s) * 100) }), goto: { area: 'rights18' }, run: { label: l('Reclamar agora', 'Claim now'), fn: (g) => claimBB18(g) } });
  const open = st.disp.filter((d) => d.st === 'open');
  if (open.length) out.push({ id: 'r18-disp', level: 'warn', cat: 'release', score: 58, text: fmtL(l('{n} disputa(s) de direitos congelando royalties.', '{n} rights dispute(s) freezing royalties.'), { n: open.length }),
    why: open.slice(0, 3).map((d) => fmtL(l('"{t}" — {n}', '"{t}" — {n}'), { t: s.songs[d.song]?.title ?? '', n: d.name })), goto: { area: 'rights18' } });
  const Y = st.inc[s.year - 1] ?? {};
  for (const mk of Object.keys(NEIGH18)) {
    if (mk === homeMk18(s) || hasSub18(s, mk)) continue;
    if ((Y[`mk:${mk}`] ?? 0) > money(s, 15000)) { out.push({ id: `r18-sub-${mk}`, level: 'info', cat: 'cash', score: 45, text: fmtL(l('Edição em {m} passa por acordo recíproco (lento e com perdas).', 'Publishing in {m} goes through reciprocal deals (slow and leaky).'), { m: mkName(mk) }), effect: l('Subeditora local: −6 meses de atraso e metade da caixa preta, por 15% de comissão.', 'Local sub-publisher: −6 months delay and half the black box, for a 15% fee.'), goto: { area: 'rights18' } }); break; }
  }
  return out;
});

registerExplain('rights18.meta', (s) => { const m = meta18(s); return { title: l('Qualidade dos metadados', 'Metadata quality'), value: m.v, fmt: 'pct', parts: m.parts, note: l('Reduz a caixa preta, os conflitos de cadastro e os atrasos de repasse. Não vende discos.', 'Cuts the black box, registration conflicts and payment delays. It does not sell records.') }; });
registerExplain('rights18.rate', (s, c) => {
  const mk = String(c.mk ?? homeMk18(s)), mod = (c.mod ?? 'perf') as Mod18;
  const r = rate18(s, mk, mod);
  return { title: fmtL(l('{m}: o que sobra de cada $1', '{m}: what is left of each $1'), { m: mkName(mk) }), value: (1 - r.bb) * (1 - r.fee), fmt: 'pct', parts: [...r.parts, { label: l('Defasagem extra (meses)', 'Extra delay (months)'), value: r.lag, fmt: 'num' }], note: l('Taxa da sociedade, caixa preta (não identificado) e prazo depois do fechamento do período.', 'Society fee, black box (unidentified) and delay after the period closes.') };
});
registerExplain('rights18.cat', (s, c) => {
  const ids = (c.rels as string[] | undefined) ?? [];
  const rels = ids.length ? ids.map((id) => s.releases[id]).filter(Boolean) : Object.values(s.releases).filter((x) => x.owner === 'player' && !s.acts[x.actId]?.playerBand);
  const v = catVal18(s, rels, !ids.length);
  return { title: l('Valor do catálogo', 'Catalog value'), value: v.value, fmt: 'money', parts: [{ label: l('Receita anual', 'Annual revenue'), value: v.annual, fmt: 'money' }, ...v.parts], note: l('Receita anual × múltiplo da época × diversificação × concentração × duração dos direitos × modas × disputas.', 'Annual revenue × era multiple × diversification × concentration × rights duration × trends × disputes.') };
});

// ---------------------------------------------------------------- bot

export function botRights18(s: GameState, prof: 'cautious' | 'balanced' | 'aggressive'): void {
  const st = r18(s);
  st.pol.split = prof !== 'aggressive';
  st.pol.reg = prof === 'cautious' || playerActs(s).length >= 3;
  if (s.month % 6 === 3 && bbTotal18(s) > money(s, 1500)) claimBB18(s);
  for (const o of [...st.admOff]) if (prof !== 'cautious' || st.adm.length < 2) takeAdm18(s, o.id, prof === 'aggressive' ? 0.2 : 0.15);
  if (s.month === 6) {
    const Y = st.inc[s.year - 1] ?? {};
    for (const mk of Object.keys(NEIGH18)) if (mk !== homeMk18(s) && !hasSub18(s, mk) && (Y[`mk:${mk}`] ?? 0) > money(s, 20000) && s.player.cash > subCost18(s, mk) * 4) setSub18(s, mk, true);
  }
}

// util para a interface
export const relsOfAct18 = (s: GameState, act: Act): Release[] => Object.values(s.releases).filter((x) => x.actId === act.id);
