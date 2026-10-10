// Rodada 18 (live18, feedback #7 + V4) — Fãs com motivos. Cada base de fãs mistura seis motivos (novidade, letras,
// dança, virtuosismo, identidade cultural, comunidade do show) e três medidas SEPARADAS: lealdade (fica quando o
// artista muda), poder de compra (ingresso caro, merch, edição de luxo) e mobilização (fã-clube, equipe de rua,
// votações, estreia). As consequências são graduais (derivas de meses): virada comercial traz casuais e afasta parte
// dos antigos; ingresso caro exclui quem tem menos dinheiro; edição de luxo agrada colecionadores; parceria conecta
// comunidades compatíveis (e irrita quando não combina); lançamentos demais cansam. Os motivos formam FACÇÕES
// (puristas, mainstream, colecionadores, comunidade) com humor próprio, que podem se revoltar ou se mobilizar.
// Também: equipe de rua (street team) e fornecedor de merch (barato × justo, com risco de denúncia).
import { Rng, clamp } from '../../core/rng';
import { cityById, familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { fin18, mIdx18 } from '../ledger18';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { registerExplain } from '../explain18';
import type { Act, GameState, Release } from '../types';
import { fmtL, hasTech, money, notify, playerActs, post } from '../util';
import { fandomOf } from '../fandom';
import { feats } from './feats8';
import { addHype } from './hype12';

export const MOT18 = ['novelty', 'lyrics', 'dance', 'virt', 'ident', 'scene'] as const;
export type Mot18 = (typeof MOT18)[number];
export const MOT_NAME18: Record<Mot18, L> = {
  novelty: l('Novidade', 'Novelty'), lyrics: l('Letras', 'Lyrics'), dance: l('Dança', 'Dance'),
  virt: l('Virtuosismo', 'Virtuosity'), ident: l('Identidade cultural', 'Cultural identity'), scene: l('Comunidade do show', 'Live community'),
};
export const FAC18 = ['purist', 'main', 'coll', 'comm'] as const;
export type Fac18 = (typeof FAC18)[number];
export const FAC_NAME18: Record<Fac18, { name: L; desc: L }> = {
  purist: { name: l('Puristas', 'Purists'), desc: l('Vieram pela identidade, pelo virtuosismo e pelas letras. Odeiam virada comercial.', 'Here for identity, virtuosity and lyrics. Hate a commercial turn.') },
  main: { name: l('Mainstream', 'Mainstream'), desc: l('Vieram pelo refrão e pela pista. Gostam de novidade e somem rápido.', 'Here for the hook and the dancefloor. Love novelty, leave fast.') },
  coll: { name: l('Colecionadores', 'Collectors'), desc: l('Têm dinheiro e paciência: edições de luxo, vinil colorido, caixas.', 'Have money and patience: deluxe editions, coloured vinyl, box sets.') },
  comm: { name: l('Comunidade', 'Community'), desc: l('O show é o encontro. Sentem na pele ingresso caro e cambista.', 'The show is the gathering. Feel pricey tickets and scalpers first-hand.') },
};

interface Drift18 { why: L; n: number; core: number; act: number; cas: number; loy: number }
export interface FanA18 { m: number[]; loy: number; mob: number; fat: number; pos: number; fac: number[]; team?: number; dr: Drift18[]; cd?: number }
export interface Fans18 { a: Record<string, FanA18>; sup: 'fair' | 'cheap'; log: [number, number, L][]; exp?: number }
declare module '../ext4' { interface Ext4 { fans18: Fans18 } }
const fresh = (): Fans18 => ({ a: {}, sup: 'fair', log: [] });
registerExt4('fans18', fresh);
export const fans18 = (s: GameState): Fans18 => { const x = s.x4 as unknown as { fans18?: Fans18 }; return (x.fans18 ??= fresh()); };
const logIt = (s: GameState, t: L) => { const f = fans18(s); f.log.unshift([s.year, s.month, t]); if (f.log.length > 30) f.log.length = 30; };
const mineAct = (s: GameState, a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);

const BASE: Partial<Record<FamilyId, number[]>> = {
  pop: [0.35, 0.15, 0.25, 0.05, 0.05, 0.15], rock: [0.15, 0.2, 0.05, 0.2, 0.15, 0.25], hiphop: [0.2, 0.25, 0.15, 0.05, 0.25, 0.1],
  electronic: [0.2, 0.02, 0.4, 0.1, 0.05, 0.23], rnb: [0.2, 0.2, 0.25, 0.15, 0.1, 0.1], blues_jazz: [0.05, 0.1, 0.1, 0.45, 0.1, 0.2],
  country_folk: [0.05, 0.4, 0.1, 0.1, 0.2, 0.15], sacred: [0.02, 0.35, 0.05, 0.1, 0.33, 0.15],
  caribbean: [0.15, 0.1, 0.35, 0.1, 0.2, 0.1], latin: [0.15, 0.1, 0.35, 0.1, 0.2, 0.1], brazil: [0.15, 0.12, 0.3, 0.1, 0.2, 0.13], africa: [0.15, 0.1, 0.35, 0.1, 0.2, 0.1],
};
const WEALTH: Record<string, number> = { na: 1.25, eu: 1.15, oceania: 1.15, asia: 1, br: 0.75, latam: 0.75, africa: 0.6 };
const FAM_PP: Partial<Record<FamilyId, number>> = { blues_jazz: 1.25, country_folk: 1.05, rock: 1.05, sacred: 1, electronic: 0.95, rnb: 0.95, pop: 0.85, hiphop: 0.85 };
const norm = (v: number[]): number[] => { const t = v.reduce((a, b) => a + Math.max(0, b), 0) || 1; return v.map((x) => Math.max(0, x) / t); };

/** Poder de compra da base (0,5–1,6): riqueza do mercado de origem × público do gênero × fãs que envelheceram com o artista. */
export function pp18(s: GameState, act: Act): number {
  const w = WEALTH[cityById[act.city]?.market ?? 'na'] ?? 1;
  const age = s.year - (act.debutYear ?? s.year) >= 15 ? 1.15 : 1;
  return clamp(w * (FAM_PP[familyOf(act.genre)] ?? 0.9) * age, 0.5, 1.6);
}
function baseMob(s: GameState, act: Act): number {
  const sf = s.fandoms[act.id]?.superfans ?? 0;
  return clamp(10 + sf * 0.4 + (hasTech(s, 'internet') ? 10 : 0) + (hasTech(s, 'streaming') ? 8 : 0) + (hasTech(s, 'short_video') ? 8 : 0), 0, 90);
}
const coreShare = (a: Act) => a.fans.core / Math.max(1, a.fans.core + a.fans.active + a.fans.casual * 0.2);

/** Estado de fãs do ato (cria na primeira leitura; atos de fora são calculados sem guardar). */
export function fan18(s: GameState, actId: string, store = true): FanA18 | undefined {
  const act = s.acts[actId];
  if (!act) return undefined;
  const st = fans18(s);
  const have = st.a[actId];
  if (have) return have;
  let m = [...(BASE[familyOf(act.genre)] ?? [0.25, 0.15, 0.2, 0.1, 0.15, 0.15])];
  const tilt = (act.positioning - 50) / 400; // crossover puxa novidade/dança; underground puxa identidade/comunidade
  m[0] += tilt; m[2] += tilt / 2; m[4] -= tilt; m[5] -= tilt / 2;
  m = norm(m);
  const a: FanA18 = { m, loy: Math.round(30 + 50 * coreShare(act)), mob: Math.round(baseMob(s, act)), fat: 0, pos: act.positioning, fac: [0, 0, 0, 0], dr: [] };
  if (store && mineAct(s, act)) st.a[actId] = a;
  return a;
}

/** Peso de cada facção (soma 1). */
export function factions18(s: GameState, act: Act, f = fan18(s, act.id, false)!): Record<Fac18, number> {
  const [nov, lyr, dan, vir, ide, sce] = f.m;
  const pp = pp18(s, act);
  const raw = [ide + vir + lyr * 0.5, nov + dan, 0.06 + 0.3 * clamp(pp - 0.8, 0, 0.8) * f.loy / 100, sce + lyr * 0.5];
  const n = norm(raw);
  return { purist: n[0], main: n[1], coll: n[2], comm: n[3] };
}
const facIdx = (k: Fac18) => FAC18.indexOf(k);
function mood(f: FanA18, k: Fac18, d: number): void { f.fac[facIdx(k)] = clamp(f.fac[facIdx(k)] + d, -50, 50); }
function shift(f: FanA18, k: Mot18, d: number): void { f.m[MOT18.indexOf(k)] += d; f.m = norm(f.m); }
function drift(f: FanA18, d: Drift18): void { f.dr.push(d); if (f.dr.length > 6) f.dr.shift(); }

// ------------------------------------------------------------------ lançamentos: virada, luxo, parceria, mobilização

const relWeight = (r: Release) => (r.type === 'single' ? 0.5 : 1);
/** Lançamentos do ato nos últimos 12 meses (single conta meio) e o limite que o público aguenta na época. */
export function relLoad18(s: GameState, actId: string): { n: number; th: number } {
  let n = 0;
  for (const id of s.acts[actId]?.releases ?? []) { const r = s.releases[id]; if (r && !r.hist && s.week - r.week < 52 && s.week >= r.week) n += relWeight(r); }
  return { n, th: s.year >= 2015 ? 6 : s.year >= 1995 ? 4.5 : 4 };
}

function cosine(a: number[], b: number[]): number {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < a.length; i++) { x += a[i] * b[i]; y += a[i] * a[i]; z += b[i] * b[i]; }
  return x / Math.max(1e-6, Math.sqrt(y * z));
}

export function fansLaunch18(s: GameState, rel?: Release): void {
  const act = rel && s.acts[rel.actId];
  if (!rel || !mineAct(s, act) || rel.hist) return;
  const f = fan18(s, act.id)!;
  const fac = factions18(s, act, f);
  // virada comercial (ou volta às raízes): o posicionamento mudou desde o último disco
  const dp = act.positioning - f.pos;
  if (dp >= 8) {
    const k = Math.min(2, dp / 12);
    drift(f, { why: fmtL(l('Virada comercial de "{t}"', '"{t}" commercial turn'), { t: rel.title }), n: 6, core: -0.006 * k * (fac.purist / 0.3), act: -0.002 * k, cas: 0.012 * k * (0.5 + fac.main), loy: -0.7 * k });
    mood(f, 'purist', -18 * k); mood(f, 'main', 12 * k); shift(f, 'novelty', 0.04 * k); shift(f, 'ident', -0.03 * k);
    logIt(s, fmtL(l('{a}: a virada comercial atrai casuais e afasta parte dos antigos (efeito ao longo de 6 meses).', '{a}: the commercial turn draws casuals and alienates some old fans (plays out over 6 months).'), { a: act.name }));
  } else if (dp <= -8) {
    drift(f, { why: fmtL(l('Volta às raízes em "{t}"', 'Back to roots on "{t}"'), { t: rel.title }), n: 4, core: 0.004, act: 0, cas: -0.008, loy: 0.6 });
    mood(f, 'purist', 14); mood(f, 'main', -10);
    logIt(s, fmtL(l('{a}: a volta às raízes reconquista puristas; parte dos casuais some.', '{a}: going back to roots wins purists back; some casuals drift away.'), { a: act.name }));
  }
  f.pos = act.positioning;
  // edição de luxo / limitada: colecionadores adoram; com lançamentos demais vira "caça-níquel"
  if (rel.kind === 'deluxe' || rel.kind === 'limited' || rel.kind === 'anniversary') {
    mood(f, 'coll', 15);
    if (f.fat > 30 || relLoad18(s, act.id).n > relLoad18(s, act.id).th) { mood(f, 'purist', -8); f.loy = clamp(f.loy - 2, 0, 100); logIt(s, fmtL(l('{a}: mais uma edição especial — os puristas falam em caça-níquel.', '{a}: another special edition — purists call it a cash grab.'), { a: act.name })); }
    else logIt(s, fmtL(l('{a}: colecionadores ({p}% da base) correm atrás da edição especial.', '{a}: collectors ({p}% of the base) chase the special edition.'), { a: act.name, p: Math.round(fac.coll * 100) }));
  }
  // parcerias: comunidades compatíveis trocam fãs; incompatíveis irritam os antigos
  for (const d of feats(s).deals) {
    if (d.status !== 'done' || !rel.songs.includes(d.songId)) continue;
    const oid = d.hostActId === act.id ? d.guestActId : d.hostActId;
    const o = s.acts[oid];
    if (!o) continue;
    const of = fan18(s, oid, false)!;
    const ov = cosine(f.m, of.m);
    act.fans.casual += Math.round(o.fans.active * 0.05 * ov);
    act.fans.active += Math.round(o.fans.core * 0.02 * ov);
    if (ov < 0.75) { mood(f, 'purist', -10); f.loy = clamp(f.loy - 1.5, 0, 100); logIt(s, fmtL(l('{a} × {b}: públicos pouco compatíveis ({p}%) — poucos fãs novos e antigos desconfiados.', '{a} × {b}: poorly matched audiences ({p}%) — few new fans and wary old ones.'), { a: act.name, b: o.name, p: Math.round(ov * 100) })); }
    else logIt(s, fmtL(l('{a} × {b}: comunidades compatíveis ({p}%) trocam fãs.', '{a} × {b}: compatible communities ({p}%) swap fans.'), { a: act.name, b: o.name, p: Math.round(ov * 100) }));
  }
  // mobilização: fã-clube e equipe de rua fazem barulho na estreia
  if (f.mob >= 25) addHype(s, `r:${rel.id}`, 'fans18', l('Fãs mobilizados na estreia', 'Fans mobilised for release day'), Math.round(f.mob / 10));
}
registerSimHook('launch', 'fans18', (s, _r, arg) => fansLaunch18(s, arg.release));

// cansaço de lançamentos: o público dá menos atenção a cada novo disco
registerMod('appeal', 'fans18', (s, v, c) => {
  const a = c.release && s.acts[c.release.actId];
  if (!mineAct(s, a)) return null;
  const f = fans18(s).a[a.id];
  if (!f || f.fat < 8) return null;
  return { value: v * (1 - Math.min(0.25, f.fat / 400)), label: l('Cansaço de lançamentos', 'Release fatigue') };
});
registerMod('chartUnits', 'fans18', (s, v, c) => {
  const r = c.release, a = r && s.acts[r.actId];
  if (!r || !mineAct(s, a) || !(r.kind === 'deluxe' || r.kind === 'limited' || r.kind === 'anniversary')) return null;
  const f = fans18(s).a[a.id];
  if (!f) return null;
  const k = 1 + 0.25 * factions18(s, a, f).coll * f.loy / 100 * pp18(s, a);
  return k > 1.01 ? { value: v * k, label: l('Colecionadores', 'Collectors') } : null;
});
// equipe de rua no mercado de origem e lealdade na hora de comprar ingresso
registerMod('cityDemand', 'fans18', (s, v, c) => {
  const a = c.act;
  if (!mineAct(s, a) || !c.cityId) return null;
  const f = fans18(s).a[a.id];
  if (!f) return null;
  let k = 0.96 + f.loy / 1250;
  if (f.team && cityById[c.cityId]?.market === cityById[a.city]?.market) k *= 1.08;
  return Math.abs(k - 1) > 0.005 ? { value: v * k, label: f.team ? l('Lealdade e equipe de rua', 'Loyalty and street team') : l('Lealdade dos fãs', 'Fan loyalty') } : null;
});

/** Ingresso caro numa noite: quem tem menos dinheiro fica de fora (lealdade e comunidade sentem). */
export function ticketShock18(s: GameState, act: Act, pm: number): number {
  const f = fans18(s).a[act.id];
  const pp = pp18(s, act);
  if (!f || pm <= 1.2) return 0;
  const hit = (pm - 1.2) * clamp(1.25 - pp, 0, 0.8);
  f.loy = clamp(f.loy - hit * 1.5, 0, 100);
  mood(f, 'comm', -hit * 6);
  return hit;
}

// ------------------------------------------------------------------ escândalos: cada facção reage diferente
onFact('scandal', (s, fa) => {
  for (const id of fa.actors) {
    const a = s.acts[id];
    if (!mineAct(s, a)) continue;
    const f = fans18(s).a[a.id];
    if (!f) continue;
    const sev = fa.severity / 100;
    mood(f, 'main', -12 * sev); mood(f, 'coll', -6 * sev);
    // "rebeldia" combina com a identidade de parte dos puristas do gênero
    mood(f, 'purist', (['rock', 'hiphop'].includes(familyOf(a.genre)) ? 4 : -6) * sev);
    f.loy = clamp(f.loy - 3 * sev * (1 - f.loy / 150), 0, 100);
  }
}, 'fans18:scandal');

// ------------------------------------------------------------------ equipe de rua e fornecedor de merch

export const TEAM_FROM18 = 1980;
export const teamCost18 = (s: GameState) => money(s, 250);
export function setTeam18(s: GameState, actId: string, on: boolean): L | null {
  if (s.year < TEAM_FROM18) return l('Equipes de rua organizadas só aparecem nos anos 1980.', 'Organised street teams only appear in the 1980s.');
  const f = fan18(s, actId);
  if (!f || !mineAct(s, s.acts[actId])) return l('Só para artistas do seu elenco.', 'Only for your roster.');
  if (on) f.team = s.week; else delete f.team;
  return null;
}
export function setSupplier18(s: GameState, k: Fans18['sup']): void { fans18(s).sup = k; }

// ------------------------------------------------------------------ mês

const revolt = (s: GameState, act: Act, k: Fac18) => pushInbox18(s, 'fans18', {
  from: fandomOf(s, act.id).name ?? act.name, tone: 'bad',
  subject: fmtL(l('{f} de {a} em revolta', '{a} {f} in revolt'), { f: FAC_NAME18[k].name, a: act.name }),
  body: fmtL(l('Os {f} (uma parte grande da base) estão furiosos: abaixo-assinado, comentários e ameaça de boicote. {d}', 'The {f} (a big part of the base) are furious: petitions, comments and boycott threats. {d}'), { f: FAC_NAME18[k].name, d: FAC_NAME18[k].desc }),
  ref: { act: act.id, fac: k },
  actions: [
    { id: 'speak', label: l('Carta aberta do artista (humor +20, outras facções −6)', 'Open letter from the artist (mood +20, other factions −6)') },
    { id: 'gift', label: fmtL(l('Encontro/sessão gratuita para eles ({c})', 'Free meet-up/session for them ({c})'), { c: `$${Math.round(money(s, 1500) / 100).toLocaleString('en-US')}` }) },
    { id: 'ignore', label: l('Ignorar (lealdade −4, haters +)', 'Ignore (loyalty −4, haters up)') },
  ],
});
registerInboxKind('fans18', {
  label: l('Fãs', 'Fans'), cat: 'people', icon: 'fans', prio: 2,
  goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const a = s.acts[String(m.ref?.act)], k = String(m.ref?.fac) as Fac18;
    const f = a && fans18(s).a[a.id];
    if (!a || !f || !FAC18.includes(k)) return l('Sem efeito.', 'No effect.');
    if (action === 'speak') { mood(f, k, 20); for (const o of FAC18) if (o !== k) mood(f, o, -6); return l('A carta acalmou a facção; as outras acharam demagogia.', 'The letter calmed the faction; the others found it pandering.'); }
    if (action === 'gift') { post(s, `fans18:gift:${a.id}`, -money(s, 1500), 'marketing', `Encontro de fãs: ${a.name}`); mood(f, k, 14); f.loy = clamp(f.loy + 3, 0, 100); return l('O encontro virou memória boa: humor e lealdade sobem.', 'The meet-up became a fond memory: mood and loyalty rise.'); }
    f.loy = clamp(f.loy - 4, 0, 100); fandomOf(s, a.id).haters += 5; return l('Ignorados, eles fazem barulho: lealdade cai e haters crescem.', 'Ignored, they get loud: loyalty falls and haters grow.');
  },
});

export function fansMonth18(s: GameState): void {
  const st = fans18(s);
  const r = Rng.fromSeed(`${s.config.seed}:fans18:${s.year}:${s.month}`);
  const mine = playerActs(s);
  for (const id of Object.keys(st.a)) if (!mine.includes(id)) delete st.a[id];
  for (const id of mine) {
    const act = s.acts[id];
    if (!act || act.status === 'retired' || act.status === 'split') continue;
    const f = fan18(s, id)!;
    // derivas graduais
    for (const d of f.dr) {
      act.fans.core = Math.max(0, Math.round(act.fans.core * (1 + d.core * (d.core < 0 ? 1 - f.loy / 200 : 1))));
      act.fans.active = Math.max(0, Math.round(act.fans.active * (1 + d.act)));
      act.fans.casual = Math.max(0, Math.round(act.fans.casual * (1 + d.cas)));
      f.loy = clamp(f.loy + d.loy, 0, 100);
      d.n--;
    }
    f.dr = f.dr.filter((d) => d.n > 0);
    // lealdade volta devagar para a base (núcleo de fãs e humor das facções)
    const avgMood = f.fac.reduce((t, x) => t + x, 0) / 4;
    const base = 30 + 45 * coreShare(act) + avgMood / 5;
    f.loy = clamp(f.loy + (base - f.loy) * 0.04, 0, 100);
    // mobilização: equipe de rua sobe, senão volta para o natural
    const bm = baseMob(s, act);
    if (f.team) {
      f.mob = clamp(f.mob + 2.5, 0, 85);
      post(s, `fans18:team:${id}`, -teamCost18(s), 'marketing', `Equipe de rua: ${act.name}`);
      if (r.chance(0.012)) {
        post(s, `fans18:fine:${id}`, -money(s, 400), 'legal', `Multa: cartazes da equipe de rua de ${act.name}`);
        emitFact(s, { kind: 'street_team', actors: [id], place: act.city, severity: 15, visibility: 'rumor', text: fmtL(l('A equipe de rua de {a} exagerou: cartazes em monumento e spam — multa e piadas na imprensa local.', '{a}\'s street team overdid it: posters on a monument and spam — a fine and jokes in the local press.'), { a: act.name }), src: 'fans18' });
        f.loy = clamp(f.loy - 1, 0, 100);
      }
    } else f.mob = clamp(f.mob + (bm - f.mob) * 0.1, 0, 90);
    // cansaço de lançamentos
    const { n, th } = relLoad18(s, id);
    const tgt = Math.max(0, (n - th) * 15);
    const was = f.fat;
    f.fat = Math.round(clamp(f.fat + (tgt - f.fat) * 0.3, 0, 100));
    if (was < 20 && f.fat >= 20) { mood(f, 'main', -6); logIt(s, fmtL(l('{a}: {n} lançamentos em 12 meses (o público aguenta ~{t}). A atenção cai a cada novo disco.', '{a}: {n} releases in 12 months (the public tolerates ~{t}). Attention drops with each new record.'), { a: act.name, n: Math.round(n * 2) / 2, t: th })); }
    // humor das facções volta ao neutro; revolta ou mobilização
    f.fac = f.fac.map((x) => x * 0.85);
    const fac = factions18(s, act, f);
    if ((f.cd ?? 0) <= s.week) {
      const bad = FAC18.find((k) => fac[k] >= 0.25 && f.fac[facIdx(k)] <= -25);
      const good = FAC18.find((k) => fac[k] >= 0.25 && f.fac[facIdx(k)] >= 25);
      if (bad && r.chance(0.5)) { revolt(s, act, bad); f.cd = s.week + 26; }
      else if (good) { f.mob = clamp(f.mob + 6, 0, 90); f.cd = s.week + 26; logIt(s, fmtL(l('{a}: os {f} estão empolgados e se mobilizam (+mobilização).', '{a}: the {f} are thrilled and mobilise (+mobilisation).'), { a: act.name, f: FAC_NAME18[good].name })); }
    }
  }
  // fornecedor de merch barato: margem maior, risco de denúncia de trabalho precário
  if (st.sup === 'cheap') {
    const rev = fin18(s).m[mIdx18(s) - 1]?.['rev:merch'] ?? 0;
    if (rev > 0) {
      post(s, `fans18:sup:${s.year}:${s.month}`, Math.round(rev * 0.12), 'merch', 'Merch: fornecedor barato (margem)');
      if (r.chance(s.year >= 1990 ? 0.03 : 0.015) && (st.exp ?? -99) < s.week - 52) {
        st.exp = s.week;
        s.player.reputation.artistic = clamp(s.player.reputation.artistic - 3, 0, 100);
        for (const id of mine) { const f = st.a[id]; if (f) { f.loy = clamp(f.loy - 4, 0, 100); mood(f, 'comm', -15); mood(f, 'purist', -10); } }
        const t = l('Reportagem expõe a fábrica do merch do selo: trabalho precário. Fãs pedem boicote.', 'Report exposes the label\'s merch factory: sweatshop labour. Fans call for a boycott.');
        emitFact(s, { kind: 'scandal', actors: ['player'], severity: 40, text: t, tags: ['merch', 'labour'], src: 'fans18' });
        notify(s, t, 'bad'); logIt(s, t);
      }
    }
  }
}
registerSimHook('month', 'fans18', (s) => fansMonth18(s));

// ------------------------------------------------------------------ explicações e conselheiro

registerExplain('fans18.loy', (s, c) => {
  const a = s.acts[String(c.act)];
  const f = a && fan18(s, a.id, false);
  if (!a || !f) return null;
  return { title: l('Lealdade', 'Loyalty'), value: Math.round(f.loy), parts: [
    { label: l('Núcleo de fãs na base', 'Core fans in the base'), value: `${Math.round(coreShare(a) * 100)}%`, fmt: 'text' },
    { label: l('Humor médio das facções', 'Average faction mood'), value: Math.round(f.fac.reduce((t, x) => t + x, 0) / 4), fmt: 'signed' },
    ...f.dr.map((d) => ({ label: d.why, value: `${d.n} ${l('meses', 'months').pt}`, fmt: 'text' as const, tone: (d.loy < 0 ? 'bad' : 'good') as 'bad' | 'good' })),
  ], note: l('Lealdade segura o núcleo quando o artista muda; não é o mesmo que dinheiro (poder de compra) nem barulho (mobilização).', 'Loyalty holds the core when the artist changes; it is not money (purchasing power) nor noise (mobilisation).') };
});
registerExplain('fans18.pp', (s, c) => {
  const a = s.acts[String(c.act)];
  if (!a) return null;
  return { title: l('Poder de compra', 'Purchasing power'), value: pp18(s, a), fmt: 'mult', parts: [
    { label: l('Mercado de origem', 'Home market'), value: WEALTH[cityById[a.city]?.market ?? 'na'] ?? 1, fmt: 'mult' },
    { label: l('Público do gênero', 'Genre audience'), value: FAM_PP[familyOf(a.genre)] ?? 0.9, fmt: 'mult' },
    { label: l('Fãs que envelheceram junto (15+ anos)', 'Fans who grew up with the act (15+ years)'), value: s.year - a.debutYear >= 15 ? 1.15 : 1, fmt: 'mult' },
  ], note: l('Acima de 1: aguenta ingresso caro, compra merch e edição de luxo. Abaixo: ingresso caro exclui parte do público.', 'Above 1: tolerates pricey tickets, buys merch and deluxe editions. Below: pricey tickets shut part of the crowd out.') };
});

registerAdvisorTip('fans18', (s) => {
  const out = [];
  for (const id of playerActs(s)) {
    const a = s.acts[id], f = fans18(s).a[id];
    if (!a || !f) continue;
    if (f.fat >= 25) out.push({ id: `fans18-fat-${id}`, level: 'warn' as const, cat: 'release' as const, score: 55, text: fmtL(l('{a}: o público está cansado de tantos lançamentos.', '{a}: the audience is tired of so many releases.'), { a: a.name }), why: [fmtL(l('Apelo dos próximos discos −{p}%.', 'Appeal of next records −{p}%.'), { p: Math.round(Math.min(25, f.fat / 4)) })], effect: l('Segurar 2–3 meses deixa o cansaço baixar.', 'Holding back 2–3 months lets fatigue fade.'), goto: { act: id } });
    const fac = factions18(s, a, f);
    const k = FAC18.find((x) => fac[x] >= 0.25 && f.fac[facIdx(x)] <= -18);
    if (k) out.push({ id: `fans18-fac-${id}`, level: 'warn' as const, cat: 'people' as const, score: 50, text: fmtL(l('{a}: os {f} estão insatisfeitos.', '{a}: the {f} are unhappy.'), { a: a.name, f: FAC_NAME18[k].name }), why: [FAC_NAME18[k].desc], goto: { act: id } });
  }
  return out;
});
