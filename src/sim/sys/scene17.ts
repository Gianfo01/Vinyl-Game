// Rodada 17 (J) — CENAS INTERATIVAS: motor único para cenas em pixel art com escolhas que têm consequência
// (fatos, obrigações, fama regional, boatos, estresse, fãs, relações). Cada cena é uma definição (DEFS17) com
// local por época/porte, variações (época, cidade, clima, hora, fama, quem está presente) e etapas de escolha.
// Entradas: (1) gatilhos próprios (fatos do barramento: prisão, julgamento, morte, reabilitação, escândalo, namoro;
// casamento/nascimento da sua vida; sorteio mensal com Rng própria: briga no camarim, reunião do conselho, encontro);
// (2) momentos do moments16 (prêmio, show, mídia, sessão, lançamento, contrato) ganham escolhas no mesmo cartão;
// (3) cerimônia dos Gramófonos (discurso ao ganhar, reação ao perder). Tudo vai para o Álbum de cenas (rever) e
// pode render uma foto icônica (colecionável: guardar ou licenciar).

import { formatMoney } from '../../core/money';
import { Rng, clamp, hashString, seedState } from '../../core/rng';
import { countryName, countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { grantHold, type HoldKind } from '../holds17';
import { addStress } from '../stress17';
import { scandal, type ScandalKind } from '../scandal17';
import { climateAt } from '../travel';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { fameTier } from './fame15';
import { nudge16 } from './fame16';
import { life, playerAct, playerPerson } from './life';
import { queueScene, type PlaceKind } from './scenes/state';
import { ownerOf } from './people/owner';

/** Centavos → texto nos dois idiomas. */
export const usd17 = (c: number): L => l(`$${formatMoney(Math.round(c), 'pt-BR')}`, `$${formatMoney(Math.round(c), 'en-US')}`);

// ---------------------------------------------------------------- tipos

export interface Ctx17 {
  act?: string; pid?: string; city?: string; rival?: string; who?: string;
  /** porte da casa 0..4 / mídia / prêmio */
  tier?: number; medium?: string; award?: string;
  place: string; year: number; wx?: string; night?: number;
  /** degrau de fama 0..5 do protagonista */
  ft: number;
  picks: string[];
  fact?: string; mem?: string; n?: number;
}
export interface Odds17 { p: number; why: L[] }
export interface Opt17 {
  id: string; label: L | ((s: GameState, c: Ctx17) => L); hint: L | ((s: GameState, c: Ctx17) => L);
  when?: (s: GameState, c: Ctx17) => boolean;
  odds?: (s: GameState, c: Ctx17) => Odds17;
  fx: (s: GameState, c: Ctx17, ok: boolean, e: Fx17) => L;
}
export interface Stage17 { q: L | ((s: GameState, c: Ctx17) => L); opts: Opt17[] }
export interface Def17 {
  id: string; name: L; icon: string;
  /** furam o orçamento mensal */
  major?: boolean;
  /** meses de intervalo entre duas cenas do mesmo tipo */
  cool?: number;
  place: (s: GameState, c: Ctx17) => string;
  title: (s: GameState, c: Ctx17) => L;
  text: (s: GameState, c: Ctx17) => L;
  stages: Stage17[];
  /** chance (0..1) de render foto icônica quando a escolha é ousada (opção marcada em `bold`) */
  bold?: string[];
}
export interface Res17 {
  key: string; def: string; y: number; m: number; w: number; picks: string[]; ok: boolean;
  out: L; lines: L[]; title: L; place: string; city?: string; act?: string; photo?: string; vary: L[];
}
export interface Photo17 { id: string; y: number; title: L; by: L; city?: string; act?: string; val: number; kept: 0 | 1 | 2; key: string }
export interface Pend17 { def: string; ctx: Ctx17; w: number; title: L; text: L; vary: L[]; cs?: string }
export interface St17 { book: Res17[]; cool: Record<string, number>; mk: number; n: number; photos: Photo17[]; seq: number; ann: Record<string, 1>; pend: Record<string, Pend17>; st: Record<string, number> }

declare module '../ext4' { interface Ext4 { scene17: St17 } }
const fresh = (): St17 => ({ book: [], cool: {}, mk: -1, n: 0, photos: [], seq: 0, ann: {}, pend: {}, st: {} });
registerExt4('scene17', fresh);
export function s17(s: GameState): St17 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.scene17 ??= fresh()) as St17;
  st.book ??= []; st.cool ??= {}; st.photos ??= []; st.ann ??= {}; st.pend ??= {}; st.st ??= {}; st.seq ??= 0;
  return st;
}

export const DEFS17: Record<string, Def17> = {};
export function def17(d: Def17): void { DEFS17[d.id] = d; }
/** Desliga gatilhos automáticos (testes/benchmarks). */
export const OFF_S17 = { auto: false };

// ---------------------------------------------------------------- utilidades

export const rng17 = (s: GameState, tag: string): Rng => new Rng(seedState(`scene17|${s.config.seed}|${tag}`));
export const actOf17 = (s: GameState, c: Ctx17): Act | undefined => (c.act ? s.acts[c.act] : undefined);
export const lab = (o: Opt17, s: GameState, c: Ctx17): L => (typeof o.label === 'function' ? o.label(s, c) : o.label);
const mineAct = (a: Act | undefined): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
export const cityN = (id?: string): L => (id && cityById[id] ? cityById[id].name : l('a cidade', 'town'));
export const a3Of17 = (s: GameState, c: Ctx17): string => countryOfCity(c.city ?? s.config.homeCity) ?? countryOfCity(s.config.homeCity) ?? 'USA';

/** Ato do jogador ao qual a pessoa/ato pertence (lista curta: só o seu elenco). */
export function mineOf17(s: GameState, ids: string[]): { act?: string; pid?: string } | null {
  if (ids.includes('player')) return { act: playerAct(s)?.id, pid: playerPerson(s)?.id };
  for (const id of ids) if (mineAct(s.acts[id])) return { act: id, pid: s.acts[id].members[0] };
  const mine = playerActs(s);
  for (const id of ids) {
    if (!s.persons[id]) continue;
    if (s.persons[id].isPlayer) return { act: playerAct(s)?.id, pid: id };
    const a = mine.find((x) => s.acts[x]?.members.includes(id));
    if (a) return { act: a, pid: id };
  }
  return null;
}

/** Contexto base: cidade, clima, hora (noite/dia), degrau de fama. */
export function ctx17(s: GameState, o: Partial<Ctx17> & { place?: string }): Ctx17 {
  const a = o.act ? s.acts[o.act] : undefined;
  const city = o.city ?? a?.city ?? s.config.homeCity;
  const r = rng17(s, `ctx|${s.week}|${o.act ?? ''}|${o.place ?? ''}`);
  const ft = o.ft ?? fameTier(a?.fame ?? life(s).fame);
  return { place: o.place ?? 'street', year: s.year, wx: climateAt(city, s.month).kind, night: r.chance(0.65) ? 1 : 0, ft, picks: [], city, ...o };
}

const WX: Record<string, L> = {
  mild: l('tempo ameno', 'mild weather'), hot: l('calor de rachar', 'sweltering heat'), cold: l('frio cortante', 'biting cold'), snow: l('neve lá fora', 'snow outside'),
  rain: l('chuva fina', 'light rain'), monsoon: l('chuva de monção', 'monsoon rain'), storm: l('tempestade se armando', 'a storm brewing'),
};
const FT: L[] = [
  l('Ninguém sabe quem você é: só os amigos prestam atenção.', 'Nobody knows who you are: only friends pay attention.'),
  l('Uns poucos reconhecem o nome; um repórter local anota.', 'A few recognize the name; a local reporter takes notes.'),
  l('Conhecido(a) na cena: fotógrafos e fãs na porta.', 'Known on the scene: photographers and fans at the door.'),
  l('Famoso(a): tudo o que acontecer aqui sai no jornal.', 'Famous: whatever happens here makes the papers.'),
  l('Estrela: dezenas de câmeras, cada gesto vira manchete.', 'Star: dozens of cameras, every gesture becomes a headline.'),
  l('Lenda viva: o mundo inteiro está olhando.', 'Living legend: the whole world is watching.'),
];
/** Linhas de variação (época, cidade, clima, hora, fama) que aparecem no topo da cena. */
export function vary17(s: GameState, c: Ctx17): L[] {
  const out: L[] = [];
  const cn = cityN(c.city);
  const wx = WX[c.wx ?? 'mild'] ?? WX.mild;
  out.push(fmtL(l('{c}, {y} · {t}, {w}.', '{c}, {y} · {t}, {w}.'), { c: cn, y: c.year, t: c.night ? l('noite', 'night') : l('tarde', 'afternoon'), w: wx }));
  out.push(FT[clamp(c.ft, 0, 5)]);
  return out;
}

/** Fator de exposição (0.6 … 2.2): quanto mais famoso, maior o eco das escolhas. */
export const amp17 = (c: Ctx17): number => [0.6, 0.8, 1, 1.35, 1.75, 2.2][clamp(c.ft, 0, 5)];

// ---------------------------------------------------------------- efeitos (com o porquê)

const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);
export class Fx17 {
  lines: L[] = [];
  photoT: L | null = null;
  constructor(public s: GameState, public c: Ctx17, public key: string) {}
  get act(): Act | undefined { return actOf17(this.s, this.c); }
  private say(t: L, p: Parameters<typeof fmtL>[1] = {}): void { this.lines.push(fmtL(t, p)); }
  /** fama no país da cena (fame16), multiplicada pela exposição */
  fame(dv: number, a3?: string): this {
    const a = this.act; if (!a) return this;
    const c3 = a3 ?? a3Of17(this.s, this.c);
    const v = Math.round(dv * amp17(this.c) * 10) / 10;
    nudge16(this.s, a.id, c3, v);
    this.say(l('Fama em {p}: {v}', 'Fame in {p}: {v}'), { p: countryName(c3), v: sign(v) });
    return this;
  }
  fans(core: number, casual = 0): this {
    const a = this.act; if (!a) return this;
    const k = amp17(this.c);
    const dc = Math.round(core * k), dz = Math.round(casual * k);
    a.fans.core = Math.max(0, a.fans.core + dc); a.fans.casual = Math.max(0, a.fans.casual + dz);
    if (dc) this.say(l('Fãs fiéis: {v}', 'Core fans: {v}'), { v: sign(dc) });
    if (dz) this.say(l('Público casual: {v}', 'Casual audience: {v}'), { v: sign(dz) });
    return this;
  }
  mom(dv: number): this { const a = this.act; if (!a) return this; a.momentum = clamp(a.momentum + dv, 0, 100); this.say(l('Embalo do ato: {v}', 'Act momentum: {v}'), { v: sign(dv) }); return this; }
  trust(dv: number): this { const a = this.act; if (!a) return this; a.trust = clamp(a.trust + dv, 0, 100); this.say(l('Confiança no selo: {v}', 'Trust in the label: {v}'), { v: sign(dv) }); return this; }
  morale(dv: number): this {
    const a = this.act; if (!a) return this;
    for (const id of a.members) { const p = this.s.persons[id]; if (p?.alive) p.morale = clamp(p.morale + dv, 0, 100); }
    this.say(l('Moral da banda: {v}', 'Band morale: {v}'), { v: sign(dv) });
    return this;
  }
  insp(dv: number): this {
    const a = this.act; if (!a) return this;
    for (const id of a.members) { const p = this.s.persons[id]; if (p?.alive) p.inspiration = clamp(p.inspiration + dv, 0, 100); }
    this.say(l('Inspiração: {v}', 'Inspiration: {v}'), { v: sign(dv) });
    return this;
  }
  stress(dv: number, why: L, who: 'act' | 'me' | string = 'act'): this {
    const ids = who === 'act' ? (this.act?.members ?? []) : who === 'me' ? [playerPerson(this.s)?.id ?? ''] : [who];
    for (const id of ids) if (id && this.s.persons[id]?.alive) addStress(this.s, id, dv, why);
    this.say(l('Estresse: {v} ({w})', 'Stress: {v} ({w})'), { v: sign(dv), w: why });
    return this;
  }
  rep(k: 'artistic' | 'commercial' | 'artists' | 'institutional', dv: number): this {
    const r = this.s.player.reputation; r[k] = clamp(r[k] + dv, 0, 100);
    const n: Record<string, L> = { artistic: l('artística', 'artistic'), commercial: l('comercial', 'commercial'), artists: l('com artistas', 'with artists'), institutional: l('no setor', 'industry') };
    this.say(l('Reputação {k}: {v}', '{k} reputation: {v}'), { k: n[k], v: sign(dv) });
    return this;
  }
  rival(dv: number): this {
    const id = this.c.rival; if (!id || !this.s.labels[id]) return this;
    this.s.rivalries[id] = clamp((this.s.rivalries[id] ?? 0) + dv, 0, 100);
    this.say(l('Rivalidade com {r}: {v}', 'Rivalry with {r}: {v}'), { r: this.s.labels[id].name, v: sign(dv) });
    return this;
  }
  haters(n: number): this {
    const a = this.act; if (!a) return this;
    const v = Math.round(n * amp17(this.c));
    a.fans.casual = Math.max(0, a.fans.casual - Math.round(v / 2));
    this.say(l('Detratores: +{v} (casuais −{h})', 'Detractors: +{v} (casual −{h})'), { v, h: Math.round(v / 2) });
    return this;
  }
  cash(real: number, memo: string): this {
    const v = money(this.s, real);
    post(this.s, `s17:${this.key}:${memo}`, v, 'scenes17', memo);
    this.say(l('Caixa do selo: {s}{v}', 'Label cash: {s}{v}'), { s: v > 0 ? '+' : '−', v: usd17(Math.abs(v)) });
    return this;
  }
  /** dinheiro pessoal (patrimônio do dono), como nas ações da vida pessoal */
  pocket(real: number): this {
    const v = money(this.s, real);
    const o = ownerOf(this.s);
    o.wealth = Math.max(0, o.wealth + v);
    this.say(l('Bolso pessoal: {s}{v}', 'Personal wealth: {s}{v}'), { s: v > 0 ? '+' : '−', v: usd17(Math.abs(v)) });
    return this;
  }
  partner(dv: number): this {
    const pt = life(this.s).partner; if (!pt) return this;
    pt.affinity = clamp(pt.affinity + dv, 0, 100); pt.lastDate = this.s.week;
    this.say(l('Afinidade com {p}: {v}', 'Affinity with {p}: {v}'), { p: pt.name, v: sign(dv) });
    return this;
  }
  /** Fato no barramento (sev ≥ 45 com lugar vira boato que viaja pelo press9). */
  news(text: L, sev: number, tags: string[] = [], vis: 'public' | 'rumor' | 'secret' = 'public', kind = 'scene'): Fact {
    const actors = [this.c.pid, this.c.act, 'player'].filter((x): x is string => !!x);
    const sev2 = Math.round(clamp(sev * (0.7 + amp17(this.c) * 0.3), 0, 100));
    const f = emitFact(this.s, { kind, actors, place: this.c.city, severity: sev2, visibility: vis, tags: ['scene17', ...tags], text, src: 'scene17', cause: this.c.fact ? [this.c.fact] : undefined, data: { def: this.key } });
    this.say(vis === 'secret' ? l('Fica entre poucos (segredo).', 'Stays among a few (secret).') : sev2 >= 45 ? l('Vira notícia e boato que viaja pela imprensa ({c}).', 'Becomes news and a rumor that travels the press ({c}).') : l('Registrado na crônica.', 'Logged in the chronicle.'), { c: cityN(this.c.city) });
    return f;
  }
  scandal(kind: ScandalKind, sev: number, text: L): this {
    const who = this.c.act ?? 'player';
    const r = scandal(this.s, who, kind, sev, text, { person: this.c.pid, place: this.c.city, tags: ['scene17'] });
    this.say(l('Escândalo ({k}): fama local {v}', 'Scandal ({k}): local fame {v}'), { k: kind, v: sign(Math.round(r.fameDelta)) });
    return this;
  }
  hold(holder: string, target: string, kind: HoldKind, strength: number, text: L, months = 36): this {
    grantHold(this.s, { holder, target, kind, strength, text, months, src: 'scene17' });
    this.say(l('Obrigação criada: {t}', 'Hold created: {t}'), { t: text });
    return this;
  }
  /** pede uma foto icônica (só nasce se a sorte e a fama ajudarem) */
  photo(title: L): this { this.photoT = title; return this; }
  note(t: L): this { this.lines.push(t); return this; }
}

// ---------------------------------------------------------------- fila e resolução

/** Fotógrafos por época (fictícios, com a técnica da época). */
const PHOTOG: [number, L][] = [
  [1920, l('um fotógrafo de flash de magnésio do jornal', 'a newspaper photographer with a magnesium flash')],
  [1950, l('o fotógrafo da revista de variedades, de Rolleiflex', 'the variety magazine photographer, with a Rolleiflex')],
  [1965, l('um fotógrafo de rock com Nikon e filme Tri-X', 'a rock photographer with a Nikon and Tri-X film')],
  [1980, l('o fotógrafo da revista de música, de flash e cor saturada', 'the music magazine photographer, flash and saturated color')],
  [1995, l('um paparazzo de teleobjetiva', 'a paparazzo with a long lens')],
  [2008, l('um fã com celular (a foto roda o mundo em horas)', 'a fan with a phone (the photo circles the globe in hours)')],
  [2018, l('a câmera do próprio celular, ao vivo', 'your own phone camera, live')],
];
const photogOf = (y: number): L => PHOTOG.reduce((b, x) => (y >= x[0] ? x[1] : b), PHOTOG[0][1]);

/** Enfileira uma cena própria (respeita orçamento mensal: 1 menor/mês; maiores sempre; intervalo por tipo). */
export function queue17(s: GameState, defId: string, c: Ctx17, o: { force?: boolean } = {}): string | null {
  const d = DEFS17[defId];
  if (!d) return null;
  const st = s17(s);
  const mk = s.year * 12 + s.month;
  if (!o.force) {
    if (st.cool[defId] !== undefined && mk - st.cool[defId] < (d.cool ?? 6)) return null;
    if (st.mk !== mk) { st.mk = mk; st.n = 0; }
    if (!d.major && st.n >= 1) return null;
  }
  if (!d.major && !o.force) st.n += 1;
  st.cool[defId] = mk;
  c.place = d.place(s, c);
  const title = d.title(s, c), text = d.text(s, c), vary = vary17(s, c);
  const placeK = (c.place === 'studio' ? 'video_set' : c.place) as PlaceKind;
  const cs = queueScene(s, 'scene17', placeK, { title, text, actId: c.act ?? null, key: '' });
  if (!cs) return null;
  cs.data.key = cs.id;
  st.pend[cs.id] = { def: defId, ctx: c, w: s.week, title, text, vary, cs: cs.id };
  return cs.id;
}

/** Registra uma cena pendente que nasce de um cartão já existente (momento, cerimônia). */
export function open17(s: GameState, key: string, defId: string, c: Ctx17): Pend17 | null {
  const st = s17(s);
  if (st.book.some((b) => b.key === key)) return null;
  const d = DEFS17[defId];
  if (!d) return null;
  if (!st.pend[key]) { c.place = d.place(s, c); st.pend[key] = { def: defId, ctx: c, w: s.week, title: d.title(s, c), text: d.text(s, c), vary: vary17(s, c) }; }
  return st.pend[key];
}

export const result17 = (s: GameState, key: string): Res17 | undefined => s17(s).book.find((b) => b.key === key);
export const pend17 = (s: GameState, key: string): Pend17 | undefined => s17(s).pend[key];

/** Opções da etapa atual (só as disponíveis), com chance mostrada. */
export function options17(s: GameState, key: string): { q: L; opts: { id: string; label: L; hint: L; odds?: Odds17 }[] } | null {
  const p = s17(s).pend[key];
  if (!p) return null;
  const d = DEFS17[p.def];
  const stg = d.stages[Math.min(p.ctx.picks.length, d.stages.length - 1)];
  const q = typeof stg.q === 'function' ? stg.q(s, p.ctx) : stg.q;
  return { q, opts: stg.opts.filter((o) => !o.when || o.when(s, p.ctx)).map((o) => ({ id: o.id, label: lab(o, s, p.ctx), hint: typeof o.hint === 'function' ? o.hint(s, p.ctx) : o.hint, odds: o.odds?.(s, p.ctx) })) };
}

/** Escolhe; nas etapas intermediárias só avança. Na última aplica os efeitos e grava no álbum. */
export function choose17(s: GameState, key: string, optId: string): { next: boolean; res?: Res17; err?: L } {
  const st = s17(s);
  const p = st.pend[key];
  if (!p) { const r = result17(s, key); return r ? { next: false, res: r } : { next: false, err: l('Cena não encontrada.', 'Scene not found.') }; }
  const d = DEFS17[p.def];
  const i = Math.min(p.ctx.picks.length, d.stages.length - 1);
  const o = d.stages[i].opts.find((x) => x.id === optId && (!x.when || x.when(s, p.ctx)));
  if (!o) return { next: false, err: l('Escolha indisponível.', 'Choice unavailable.') };
  p.ctx.picks.push(optId);
  if (p.ctx.picks.length < d.stages.length) return { next: true };
  const r = rng17(s, `res|${key}|${p.ctx.picks.join('.')}`);
  const od = o.odds?.(s, p.ctx);
  const ok = od ? r.chance(clamp(od.p, 0.03, 0.97)) : true;
  const e = new Fx17(s, p.ctx, key);
  const out = o.fx(s, p.ctx, ok, e);
  const res: Res17 = { key, def: p.def, y: s.year, m: s.month, w: s.week, picks: p.ctx.picks.slice(), ok, out, lines: e.lines, title: p.title, place: p.ctx.place, city: p.ctx.city, act: p.ctx.act, vary: p.vary };
  // foto icônica: escolha ousada + exposição
  const bold = !!e.photoT && (d.bold ?? []).includes(optId);
  if (e.photoT && r.chance(clamp((bold ? 0.35 : 0.12) + p.ctx.ft * 0.09, 0, 0.85))) {
    const ph: Photo17 = { id: `ph${++st.seq}`, y: s.year, title: e.photoT, by: photogOf(s.year), city: p.ctx.city, act: p.ctx.act, val: Math.round(800 * (1 + p.ctx.ft * p.ctx.ft)), kept: 0, key };
    st.photos.push(ph);
    if (st.photos.length > 40) st.photos.splice(0, st.photos.length - 40);
    res.photo = ph.id;
    res.lines.push(fmtL(l('Foto icônica: "{t}" — por {b}. Guarde ou licencie no Álbum de cenas.', 'Iconic photo: "{t}" — by {b}. Keep or license it in the Scene album.'), { t: ph.title, b: ph.by }));
  }
  st.book.push(res);
  if (st.book.length > 120) st.book.splice(0, st.book.length - 120);
  delete st.pend[key];
  st.st[p.def] = (st.st[p.def] ?? 0) + 1;
  return { next: false, res };
}

/** Sem resposta em 4 semanas: vale a última opção (a mais neutra) — a vida segue. */
function autoResolve(s: GameState): void {
  const st = s17(s);
  for (const [k, p] of Object.entries(st.pend)) {
    if (s.week - p.w < 4) continue;
    if (!p.cs) { if (s.week - p.w > 26) delete st.pend[k]; continue; }
    const d = DEFS17[p.def];
    let guard = 0;
    while (st.pend[k] && guard++ < 4) {
      const ops = options17(s, k);
      const last = ops?.opts[ops.opts.length - 1];
      if (!last) { delete st.pend[k]; break; }
      choose17(s, k, last.id);
    }
    void d;
  }
}

// ---------------------------------------------------------------- fotos e aniversários (extras)

export function photoAct17(s: GameState, id: string, how: 'keep' | 'license'): L | null {
  const ph = s17(s).photos.find((x) => x.id === id);
  if (!ph || ph.kept) return l('Foto já decidida.', 'Photo already decided.');
  if (how === 'license') {
    const v = money(s, ph.val);
    post(s, `s17ph:${id}`, v, 'scenes17', 'photo license');
    ph.kept = 2;
    if (ph.act && s.acts[ph.act]) s.acts[ph.act].fans.casual += Math.round(200 + ph.val / 10);
    return fmtL(l('Licenciada para revistas e pôsteres: +{v}. Mais gente viu, mas a foto deixa de ser sua.', 'Licensed to magazines and posters: +{v}. More people saw it, but it is no longer yours.'), { v: usd17(v) });
  }
  ph.kept = 1;
  const a = ph.act ? s.acts[ph.act] : undefined;
  if (a) a.fans.core += Math.round(50 + ph.val / 40);
  return l('Guardada no acervo: vale mais com os anos e volta nos aniversários (fãs fiéis).', 'Kept in the archive: it gains value over the years and returns on anniversaries (core fans).');
}

/** Aniversário de 10/25 anos de uma cena marcante com foto guardada: nostalgia vira fato e fãs. */
function anniversaries(s: GameState): void {
  const st = s17(s);
  for (const ph of st.photos) {
    if (ph.kept !== 1) continue;
    for (const n of [10, 25]) {
      const k = `${ph.id}:${n}`;
      if (st.ann[k] || s.year - ph.y !== n || s.month !== 0) continue;
      st.ann[k] = 1;
      ph.val = Math.round(ph.val * 1.6);
      const a = ph.act ? s.acts[ph.act] : undefined;
      if (a) { a.fans.core += 300 * (n / 10); a.momentum = clamp(a.momentum + 4, 0, 100); }
      emitFact(s, { kind: 'scene', actors: [ph.act ?? 'player'], place: ph.city, severity: 35, visibility: 'public', tags: ['good', 'scene17', 'anniversary'], text: fmtL(l('{n} anos da foto "{t}": revistas republicam, fãs relembram.', '{n} years since the photo "{t}": magazines reprint it, fans remember.'), { n, t: ph.title }), src: 'scene17' });
      notify(s, fmtL(l('Aniversário: {n} anos da foto "{t}". Fãs fiéis voltam a falar disso.', 'Anniversary: {n} years since the photo "{t}". Core fans are talking about it again.'), { n, t: ph.title }), 'good');
    }
  }
}

// ---------------------------------------------------------------- gatilhos

const take = (s: GameState, f: Fact, def: string, extra: Partial<Ctx17> = {}): void => {
  if (OFF_S17.auto) return;
  const m = mineOf17(s, f.actors);
  if (!m) return;
  queue17(s, def, ctx17(s, { act: m.act, pid: m.pid, city: f.place, fact: f.id, ...extra }));
};
onFact('arrest', (s, f) => take(s, f, 'arrest17'), 'scene17:arrest');
onFact('case_ruling', (s, f) => { if (f.tags.includes('crime') || f.tags.includes('law') || f.tags.includes('rights')) take(s, f, 'court17'); }, 'scene17:court');
onFact('rehab', (s, f) => take(s, f, 'rehab17'), 'scene17:rehab');
onFact('scandal', (s, f) => { if (f.severity >= 40 && f.src !== 'scene17' && !f.tags.includes('scene17')) take(s, f, 'presser17'); }, 'scene17:presser');
onFact('feud', (s, f) => { if (f.visibility !== 'secret') take(s, f, 'presser17', { medium: 'feud' }); }, 'scene17:feud');
onFact('death', (s, f) => {
  if (OFF_S17.auto) return;
  const pid = f.actors.find((id) => s.persons[id]);
  if (!pid) return;
  const pt = life(s).partner;
  const m = mineOf17(s, [pid]) ?? (pt?.personId === pid ? { act: playerAct(s)?.id, pid } : null);
  if (!m || s.persons[pid]?.isPlayer) return;
  queue17(s, 'funeral17', ctx17(s, { act: m.act, pid, who: s.persons[pid].name, city: f.place, fact: f.id }));
}, 'scene17:death');
onFact('romance', (s, f) => {
  const pt = life(s).partner;
  if (!OFF_S17.auto && pt && s.week - pt.since <= 1) queue17(s, 'date17', ctx17(s, { act: playerAct(s)?.id, pid: playerPerson(s)?.id, who: pt.name, fact: f.id, n: 1 }));
}, 'scene17:romance');

registerSimHook('week', 'scene17', (s) => {
  if (OFF_S17.auto) return;
  // casamento/nascimento da sua vida: a cena simples vira cena com escolhas
  for (const cs of s.cutscenes ?? []) {
    if (cs.kind !== 'life' || cs.seen || cs.data.s17 || cs.week !== s.week) continue;
    const k = cs.data.kind;
    if (k !== 'wedding' && k !== 'birth') continue;
    cs.data.s17 = 1;
    const id = queue17(s, k === 'wedding' ? 'wedding17' : 'birth17', ctx17(s, { act: playerAct(s)?.id, pid: playerPerson(s)?.id, who: life(s).partner?.name, n: Number(cs.data.size ?? 0) || 0 }));
    if (id) cs.seen = true;
  }
});

registerSimHook('month', 'scene17', (s) => {
  autoResolve(s);
  anniversaries(s);
  if (OFF_S17.auto) return;
  const r = rng17(s, `m|${s.year}|${s.month}`);
  const mine = playerActs(s);
  // briga no camarim: só com mágoa real na banda
  for (const id of mine) {
    const a = s.acts[id];
    if (!a || a.members.length < 2 || a.status === 'retired') continue;
    const ps = a.members.map((x) => s.persons[x]).filter((p) => p?.alive);
    const sore = ps.reduce((m, p) => Math.max(m, p.resentment), 0);
    const feud = ps.some((p) => ps.some((q) => q !== p && (p.rel[q.id] ?? 0) < -30));
    if ((sore > 45 || feud) && r.chance(0.18)) { queue17(s, 'backstage17', ctx17(s, { act: id, pid: ps.slice().sort((x, y) => y.resentment - x.resentment)[0]?.id })); break; }
  }
  // reunião do conselho: trimestral, quando há algo para discutir
  if (s.month % 3 === 2 && mine.length >= 2 && r.chance(0.22)) {
    const star = mine.map((x) => s.acts[x]).filter(Boolean).sort((x, y) => y.fame - x.fame)[0];
    const rival = Object.values(s.labels).filter((lb) => lb.active).sort((x, y) => (s.rivalries[y.id] ?? 0) - (s.rivalries[x.id] ?? 0))[0];
    queue17(s, 'board17', ctx17(s, { act: star?.id, rival: rival?.id, city: s.config.homeCity }));
  }
  // encontro: quem namora/está casado ganha uma noite a dois de vez em quando
  const pt = life(s).partner;
  if (pt && s.week - pt.lastDate > 6 && r.chance(0.1)) queue17(s, 'date17', ctx17(s, { act: playerAct(s)?.id, pid: playerPerson(s)?.id, who: pt.name }));
});

/** Para a interface: começar um encontro agora (botão no Álbum de cenas/vida). */
export function startDate17(s: GameState): string | L {
  const pt = life(s).partner;
  if (!pt) return l('Você não está num relacionamento.', 'You are not in a relationship.');
  if (s.week - pt.lastDate < 2) return l('Vocês acabaram de sair; espere um pouco.', 'You just went out; wait a little.');
  return queue17(s, 'date17', ctx17(s, { act: playerAct(s)?.id, pid: playerPerson(s)?.id, who: pt.name }), { force: true }) ?? l('Não deu para marcar agora.', 'Could not set it up now.');
}

export const hashKey17 = (k: string): number => hashString(k);
