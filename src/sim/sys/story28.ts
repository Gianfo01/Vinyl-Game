// Rodada 28 (F3, C5) — A HISTÓRIA DO JOGADOR EM PRIMEIRO PLANO. Um orçamento único de atenção e um Diário que
// conta a crônica do selo, não a do mundo:
//  1. Diário do jogador num ANEL PRÓPRIO, sem descarte (o Diário geral continua cortando em 1500 entradas). Entra o que é
//     do selo (atos seus, decisões, eventos do diretor, marcos da empresa) e os ecos — disparados e perdidos.
//  2. "Só marcantes" sem nº 1 alheio; fatos do mundo entram no máximo 2 por mês (o mesmo orçamento de atenção).
//  3. ORÇAMENTO DE ATENÇÃO (puro, lido pela interface): cenas que interrompem no máximo 2 por avanço e 3 por mês
//     (decisões com consequência sempre passam; o eco "você escolheu X" passa na frente); dicas de 1ª vez no máximo
//     3 por mês e nunca no avanço em que uma cena abriu. O resto vai para o álbum, como as cenas de rotina (r23).
//  4. Eventos: cooldown por (evento, ator) — o mesmo ator não volta ao mesmo evento por max(12, 2 × cooldown) meses — e
//     peso × 0,85ⁿ (n = vezes que o evento saiu nos últimos 10 anos). Portões de época: `era`/`needsTech` no EventDef
//     ou deduzidos do vocabulário (rádio, TV, LP, CD, internet, streaming, van…), com exceções revisadas à mão.
//  5. Eco forte → cena "Você escolheu X" (links19a), no máximo 1 a cada 10 semanas (~2,3 meses).
//  6. Eco perdido (fila cheia em decide18 ou quem estava nele saiu do mundo) passa a ser registrado.
// Determinismo: nada aqui sorteia. O portão e o cooldown entram DEPOIS do find (os sorteios do find não mudam); o peso
// muda a escolha do evento, então as partidas mudam (de propósito) a partir do primeiro evento repetido.

import { l, type L } from '../../data/world';
import { TECHS } from '../../data/rules';
import { EV28, eventById, type EventDef } from '../events';
import { registerExt4 } from '../ext4';
import { onFact, type Fact } from '../facts17';
import { interruptOf23 } from '../interrupt23';
import type { GameState, MemoryEntry } from '../types';
import { fmtL, money, REMEMBER28 } from '../util';
import { LOST18, type Echo18 } from './decide18';

// ---------------------------------------------------------------- regras (números do orçamento)

export const ATTN28 = {
  /** cenas que interrompem (classe 'milestone'), por avanço e por mês; 'always' (decisão) não conta */
  advance: 2, month: 3,
  /** dicas de 1ª vez por mês (e nenhuma no avanço em que uma cena abriu) */
  tipsMonth: 3,
  /** fatos do mundo em "Só marcantes", por mês */
  worldMonth: 2,
  /** semanas mínimas entre duas cenas "Você escolheu X" (~2,3 meses) */
  echoGap: 10,
  /** eventos: peso 0,85ⁿ pelas vezes nos últimos `evYears` anos; o mesmo ator espera max(12, 2 × cooldown) meses */
  decay: 0.85, evYears: 10, pairMin: 12,
};

// ---------------------------------------------------------------- estado

export interface Attn28 { w: number; nw: number; mk: number; nm: number; tm: number; tn: number }
export interface St28 {
  /** anel do jogador (sem descarte) */
  dia: MemoryEntry[];
  seq: number;
  /** ecos perdidos: contagem por motivo e as últimas 40 linhas [semana, decisão, motivo] */
  lost: { queue: number; gone: number; log: [number, L, L][] };
  /** evento → semanas dos disparos recentes */
  ev: Record<string, number[]>;
  /** `${evento}|${ator}` → semana até quando o par espera */
  pr: Record<string, number>;
  /** semana da última cena "Você escolheu X" */
  ew: number;
  at: Attn28;
}
declare module '../ext4' { interface Ext4 { st28: St28 } }
const freshAt = (): Attn28 => ({ w: -1, nw: 0, mk: -1, nm: 0, tm: -1, tn: 0 });
const fresh = (): St28 => ({ dia: [], seq: 0, lost: { queue: 0, gone: 0, log: [] }, ev: {}, pr: {}, ew: -999, at: freshAt() });
registerExt4('st28', fresh);
export function st28(s: GameState): St28 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.st28 ??= fresh()) as St28;
  st.dia ??= []; st.lost ??= { queue: 0, gone: 0, log: [] }; st.ev ??= {}; st.pr ??= {}; st.at ??= freshAt(); st.ew ??= -999; st.seq ??= 0;
  return st;
}

// ---------------------------------------------------------------- 1. Diário do jogador

/** Marcos da empresa (sem ato): são do jogador. */
const LABEL_KINDS28 = new Set(['start', 'start17', 'hq', 'territory', 'staff', 'staff_role', 'staff_promo', 'staff_leaves', 'ipo', 'sublabel', 'sub_bankrupt',
  'acquisition', 'merger', 'label_sold', 'venture', 'investor', 'achievement', 'milestone18', 'goal19', 'scenario', 'scenario_end', 'run17', 'ending', 'end',
  'succession', 'owner_family', 'owner_house', 'dynasty', 'dynasty_end', 'heir', 'heir19', 'life', 'life_band', 'plant', 'store', 'own_festival', 'fest_founded',
  'securitization', 'restructure', 'divest', 'distress', 'doctrine', 'imprint', 'jv', 'jv18', 'partner', 'publishing', 'masters_sold', 'masters_reverted',
  'masters_extended', 'decision', 'year18', 'synthetic']);
const mineAct = (s: GameState, id?: string): boolean => !!id && (s.acts[id]?.owner === 'player' || !!s.acts[id]?.playerBand);
/** A entrada conta a história do selo? (ato seu, decisão sua, evento do diretor sobre o selo, marco da empresa) */
export function playerMem28(s: GameState, e: Pick<MemoryEntry, 'kind' | 'actId'>): boolean {
  if (e.actId) return mineAct(s, e.actId);
  return e.kind.startsWith('decision:') || e.kind.startsWith('event:') || LABEL_KINDS28.has(e.kind) || e.kind.startsWith('echo');
}
REMEMBER28.f = (s, e) => { if (playerMem28(s, e)) st28(s).dia.push({ ...e }); };

function ring(s: GameState, kind: string, text: L, o: { actId?: string; important?: boolean } = {}): MemoryEntry {
  const st = st28(s);
  // id próprio (não usa s.idSeq: as sementes derivadas de ids do resto do jogo não mudam)
  const e: MemoryEntry = { id: `d28.${++st.seq}`, week: s.week, year: s.year, month: s.month, kind, text, ...(o.actId ? { actId: o.actId } : {}), ...(o.important ? { important: true } : {}) };
  st.dia.push(e);
  return e;
}

/** O anel do jogador, em ordem. */
export const diary28 = (s: GameState): MemoryEntry[] => st28(s).dia;

/** Diário inteiro (mundo + jogador), sem repetir as entradas que estão nos dois, em ordem de semana. */
export function fullDiary28(s: GameState): MemoryEntry[] {
  const ids = new Set(s.memory.map((m) => m.id));
  const extra = st28(s).dia.filter((m) => !ids.has(m.id));
  if (!extra.length) return s.memory.slice();
  return [...s.memory, ...extra].sort((a, b) => a.week - b.week || (a.id < b.id ? -1 : 1));
}

/** Tipos de "nº 1" (mundial e por país): de outro artista nunca entram em "Só marcantes". */
const NO1_KINDS28 = new Set(['number1', 'no1_country']);
/** R29 (CONNECT): entradas e saídas de integrante dos SEUS atos (antes só passavam se o ato tivesse fama > 25–30) */
const LINEUP29 = new Set(['lineup', 'member_quits', 'member_retires']);
/** "Só marcantes": tudo o que é marcante do selo (inclusive o começo) + no máximo `worldMonth` fatos do mundo por mês,
 *  nunca o nº 1 de outro artista. O mesmo tipo de fato do mesmo ato no mesmo mês vira UMA linha com "(+N)" (ex.: o
 *  disco que chega ao #1 em 25 países). */
export function landmarks28(s: GameState): MemoryEntry[] {
  const out: MemoryEntry[] = [];
  const world: Record<number, number> = {};
  const grp = new Map<string, { e: MemoryEntry; n: number }>();
  for (const m of fullDiary28(s)) {
    const mine = playerMem28(s, m);
    if (mine) {
      if (!(m.important || NO1_KINDS28.has(m.kind) || LINEUP29.has(m.kind) || m.kind === 'echo28' || m.kind === 'start' || m.kind === 'start17')) continue; // R29: troca de formação do seu ato é marco
      const k = `${m.kind}|${m.actId ?? ''}|${m.year}|${m.month}`;
      const g = grp.get(k);
      if (g && m.kind !== 'echo28' && !m.kind.startsWith('decision:')) { g.n++; continue; }
      const e = { ...m };
      grp.set(k, { e, n: 0 });
      out.push(e);
      continue;
    }
    if (!m.important || NO1_KINDS28.has(m.kind)) continue; // nº 1 alheio fica fora
    const mk = m.year * 12 + m.month;
    if ((world[mk] ?? 0) >= ATTN28.worldMonth) continue;
    world[mk] = (world[mk] ?? 0) + 1;
    out.push(m);
  }
  for (const { e, n } of grp.values()) if (n) e.text = { pt: `${e.text.pt} (+${n} do mesmo tipo no mês)`, en: `${e.text.en} (+${n} more of the same this month)` };
  return out;
}

// ---------------------------------------------------------------- 2. ecos no Diário; eco perdido registrado

onFact('echo', (s, f) => {
  const o: L = { pt: String(f.data?.o ?? ''), en: String(f.data?.oe ?? f.data?.o ?? '') };
  const act = f.actors.map((x) => (x.startsWith('p:') ? undefined : x)).find((x) => x && s.acts[x]);
  ring(s, 'echo28', fmtL(l('Você escolheu "{o}" — e voltou: {t}', 'You chose "{o}" — and it came back: {t}'), { o, t: f.text }), { actId: act, important: strongEcho28(s, f) });
}, 'story28:echo');

const WHY28: Record<'queue' | 'gone', L> = {
  queue: l('havia consequências demais pendentes (mais de 80) e a mais antiga saiu da fila', 'too many consequences were pending (over 80) and the oldest left the queue'),
  gone: l('quem estava nela já não está mais aqui', 'whoever was in it is no longer around'),
};
LOST18.f = (s, e: Echo18, why) => {
  const st = st28(s);
  st.lost[why]++;
  st.lost.log.unshift([s.week, e.t, WHY28[why]]);
  if (st.lost.log.length > 40) st.lost.log.length = 40;
  ring(s, 'echo_lost28', fmtL(l('O que "{o}" ainda podia trazer se perdeu: {w}.', 'What "{o}" could still bring was lost: {w}.'), { o: e.o, w: WHY28[why] }), { actId: e.c.act && s.acts[String(e.c.act)] ? String(e.c.act) : undefined });
};
/** Contagem dos ecos perdidos (para o Diário, a ajuda e a medição). */
export const lost28 = (s: GameState): { queue: number; gone: number } => ({ queue: st28(s).lost.queue, gone: st28(s).lost.gone });

// ---------------------------------------------------------------- 3. eco forte → cena "Você escolheu X"

/** Receita anual do selo (ano passado ou o ano corrente anualizado, o que for maior). */
export function annualRev28(s: GameState): number {
  const R = s.player.revenueByYear ?? {};
  const prev = R[s.year - 1] ?? 0, cur = R[s.year] ?? 0;
  return Math.max(prev, (cur * 12) / (s.month + 1));
}
/** Eco forte: 2+ efeitos, ou ruim, ou dinheiro ≥ 3% da receita anual (e ≥ US$ 500 da época). */
export function strongEcho28(s: GameState, f: Pick<Fact, 'tags' | 'data'>): boolean {
  const n = Number(f.data?.n ?? 0), cs = Math.abs(Number(f.data?.cs ?? 0));
  if (n >= 2 || f.tags.includes('bad')) return true;
  return cs > 0 && cs >= Math.max(annualRev28(s) * 0.03, money(s, 500));
}
/** Pode abrir outra cena de eco agora? (no máximo uma a cada `echoGap` semanas) */
export const echoSceneOk28 = (s: GameState): boolean => s.week - st28(s).ew >= ATTN28.echoGap;
export const echoSceneMark28 = (s: GameState): void => { st28(s).ew = s.week; };

// ---------------------------------------------------------------- 4. orçamento de atenção (lido pela interface)

export interface Cs28 { id: string; kind: string; data: Record<string, unknown> }
/** Cenas que passam na frente no orçamento (marcos do próprio selo). */
export const TOP_KINDS28 = new Set(['awards', 'hall', 'number1', 'ipo', 'hologram', 'long18year']);
/** Puro: das cenas que interromperiam, quais abrem (ids), dado o que já abriu neste avanço e neste mês. */
export function pickScenes28(list: Cs28[], usedAdv: number, usedMonth: number, caps = ATTN28): string[] {
  const out: string[] = [];
  // ordem: grandes marcos (prêmio, Hall, nº 1) → "você escolheu X" → o resto, na ordem em que chegaram
  const rank = (c: Cs28): number => (TOP_KINDS28.has(c.kind) ? 0 : c.data.echo28 ? 1 : 2);
  const ord = list.map((c, i) => [c, i] as const).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).map((x) => x[0]);
  let a = usedAdv, m = usedMonth;
  for (const c of ord) {
    if (interruptOf23(c) === 'always') { out.push(c.id); continue; }
    if (a >= caps.advance || m >= caps.month) continue;
    out.push(c.id); a++; m++;
  }
  return list.filter((c) => out.includes(c.id)).map((c) => c.id);
}
const roll = (s: GameState): Attn28 => {
  const at = st28(s).at, mk = s.year * 12 + s.month;
  if (at.w !== s.week) { at.w = s.week; at.nw = 0; }
  if (at.mk !== mk) { at.mk = mk; at.nm = 0; }
  if (at.tm !== mk) { at.tm = mk; at.tn = 0; }
  return at;
};
/** Com estado: decide uma vez por cena (marca `data.att28`) e gasta o orçamento do avanço e do mês. */
export function attnScenes28(s: GameState, list: Cs28[]): string[] {
  const at = roll(s);
  const fresh = list.filter((c) => c.data.att28 === undefined);
  const ok = new Set(pickScenes28(fresh, at.nw, at.nm));
  for (const c of fresh) {
    c.data.att28 = ok.has(c.id) ? 1 : 0;
    if (ok.has(c.id) && interruptOf23(c) !== 'always') { at.nw++; at.nm++; }
  }
  return list.filter((c) => c.data.att28 === 1).map((c) => c.id);
}
/** Uma dica de 1ª vez pode aparecer agora? */
export function attnTip28(s: GameState): boolean {
  const at = roll(s);
  return at.nw === 0 && at.tn < ATTN28.tipsMonth;
}
export const spendTip28 = (s: GameState): void => { roll(s).tn++; };

// ---------------------------------------------------------------- 5. eventos: época, cooldown por (evento, ator), 0,85ⁿ

const TECH_BASE: Record<string, number> = Object.fromEntries(TECHS.map((t) => [t.id, t.base]));
/** Vocabulário que denuncia a época: [regex, ano mínimo, tecnologia (segue s.techDates)]. */
export const VOCAB28: [RegExp, number, string?][] = [
  [/\br[áa]dios?\b|\bradio\b/i, 1920, 'radio'], [/\bTV\b|\btelevis/i, 1950, 'tv_music'], [/\bLPs?\b/, 1948, 'lp'], [/\bcassetes?\b|\bcassettes?\b|\bfitas? k7\b/i, 1964, 'cassette'],
  [/\bFM\b/, 1966, 'fm'], [/\bsintetizador|\bsynths?\b|\bsynthesizer/i, 1970, 'synth'], [/\bMTV\b|\bvideoclipe|\bclipes?\b|\bmusic videos?\b/i, 1981, 'clipnet'], [/\bCDs?\b/, 1983, 'cd'],
  [/\binternet\b|\bon-?line\b|\bwebsites?\b|\be-?mails?\b/i, 1995, 'internet'], [/\bdownloads?\b/i, 2003, 'download'], [/\bP2P\b|\btorrents?\b|\bNapster\b/i, 1999, 'p2p'],
  [/\bstreaming\b|\bplaylists?\b/i, 2008, 'streaming'], [/\bTikTok\b|\bReels\b/i, 2018, 'short_video'], [/\bmemes?\b|\bvira(l|lizou|lizar)\b|\bwent viral\b|\bhashtags?\b/i, 2005],
  [/\bDMs?\b/, 2008], [/\bcelular(es)?\b|\bsmartphones?\b|\bcell ?phones?\b/i, 1990], [/\bjukebox/i, 1927], [/\bvans?\b/i, 1950], [/\bBillboard 200\b/i, 1992], [/\bHot 100\b/i, 1958],
  [/\bdrones?\b/i, 2012], [/\bapps?\b|\baplicativos?\b/i, 2008], [/\bpodcasts?\b/i, 2005], [/\bsamplers?\b|\bsampling\b|\bsamples?\b/i, 1980], [/\bredes sociais\b|\bsocial media\b/i, 2004],
];
/** Exceções revisadas à mão: `null` = o vocabulário é falso alarme (o evento vale em qualquer época); faixa = portão explícito. */
export const ERA_FIX28: Record<string, [number, number] | null> = {
  // guerra fecha a turnê (1914, 1939…): a opção "rádio/streaming" já oferece as duas épocas
  tour_blocked: null,
  // o iPhone é de 2007 (o card cita "streaming" e "app", que o vocabulário põe em 2008)
  h19_iphone: [2007, 9999],
};
function textOf(d: EventDef): string {
  return [d.title.pt, d.title.en, d.text.pt, d.text.en, ...d.options.flatMap((o) => [o.label.pt, o.label.en, o.hint?.pt ?? '', o.hint?.en ?? ''])].join(' \n ');
}
const AUTO: Record<string, { y0: number; tech?: string }[]> = {};
/** Portões deduzidos do texto do evento (estático; cache por id). */
export function autoEra28(d: EventDef): { y0: number; tech?: string }[] {
  if (d.id in AUTO) return AUTO[d.id];
  const tx = textOf(d);
  return (AUTO[d.id] = VOCAB28.filter(([rx]) => rx.test(tx)).map(([, y0, tech]) => ({ y0, tech })));
}
const techYear = (s: GameState | null, tech: string, y0: number): number => s?.techDates?.[tech] ?? TECH_BASE[tech] ?? y0;
/** O evento cabe no ano `year`? (explícito no EventDef > exceção > vocabulário) */
export function eraOk28(d: EventDef, year: number, s: GameState | null): boolean {
  if (d.era && (year < d.era[0] || year > d.era[1])) return false;
  if (d.needsTech && techYear(s, d.needsTech, 9999) > year) return false;
  if (d.era || d.needsTech) return true;
  const fix = ERA_FIX28[d.id];
  if (fix === null) return true;
  if (fix) return year >= fix[0] && year <= fix[1];
  return autoEra28(d).every((g) => (g.tech ? techYear(s, g.tech, g.y0) : g.y0) <= year);
}
/** Ano a partir do qual o evento pode sair (para a ajuda e os testes). */
export function eraFrom28(d: EventDef, s: GameState | null = null): number {
  if (d.era) return d.era[0];
  if (d.needsTech) return techYear(s, d.needsTech, 9999);
  const fix = ERA_FIX28[d.id];
  if (fix === null) return 0;
  if (fix) return fix[0];
  return Math.max(0, ...autoEra28(d).map((g) => (g.tech ? techYear(s, g.tech, g.y0) : g.y0)));
}

const actorOf28 = (c: Record<string, string | number>): string => String(c.person ?? c.act ?? c.rival ?? c.label ?? c.lb ?? '');
const pairKey = (id: string, c: Record<string, string | number>): string | null => { const a = actorOf28(c); return a ? `${id}|${a}` : null; };
/** Vezes que o evento saiu nos últimos `evYears` anos. */
export function recent28(s: GameState, id: string): number {
  const ws = st28(s).ev[id];
  if (!ws) return 0;
  const from = s.week - ATTN28.evYears * 52;
  return ws.filter((w) => w > from).length;
}
EV28.skip = (s, def, ctx) => {
  if (!eraOk28(def, s.year, s)) return true;
  const k = pairKey(def.id, ctx);
  return !!k && (st28(s).pr[k] ?? -1) > s.week;
};
EV28.w = (s, def) => Math.pow(ATTN28.decay, recent28(s, def.id));
EV28.on = (s, def, ctx) => {
  const st = st28(s);
  const ws = (st.ev[def.id] ??= []);
  ws.push(s.week);
  if (ws.length > 16) ws.splice(0, ws.length - 16);
  const k = pairKey(def.id, ctx);
  if (k) {
    st.pr[k] = s.week + Math.max(ATTN28.pairMin, def.cooldown * 2) * 4;
    const ks = Object.keys(st.pr);
    if (ks.length > 400) for (const x of ks) if (st.pr[x] <= s.week) delete st.pr[x];
  }
};

/** Para a ajuda: por que um evento não sai agora. */
export function eventGate28(s: GameState, id: string): L | null {
  const d = eventById[id];
  if (!d) return null;
  if (!eraOk28(d, s.year, s)) return fmtL(l('Fora de época: só a partir de {y}.', 'Out of its time: only from {y}.'), { y: eraFrom28(d, s) });
  const n = recent28(s, id);
  return n ? fmtL(l('Saiu {n}× nos últimos 10 anos: peso × {k}.', 'Came up {n}× in the last 10 years: weight × {k}.'), { n, k: Math.pow(ATTN28.decay, n).toFixed(2) }) : null;
}
