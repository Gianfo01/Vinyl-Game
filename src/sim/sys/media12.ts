// Rodada 12 — o dono de MÍDIA (rádio, revista, TV, digital): linha editorial e público, programação com
// vagas limitadas, equipe (apresentadores, críticos, curadores, repórteres), descoberta precoce, dependência
// de anunciantes, exclusivas, credibilidade e mudanças de formato por época. Estende ventures9 (mediaMonth).

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { langForCity, personName } from '../people';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, remember } from '../util';
import { standingOf } from './standing9';
import { MEDIA, funds, ventures, vpay, type MediaKind, type Venture } from './ventures9';
import { activeAct, res, seedRng, v12, venture } from './ventures12';

export type Line = 'mainstream' | 'underground' | 'prestige' | 'tabloid';
export type Aud = 'youth' | 'adult' | 'niche';
export type SlotKind = 'rotation' | 'interview' | 'review' | 'session' | 'premiere';
export type Role = 'host' | 'critic' | 'curator' | 'reporter';
export interface Slot { kind: SlotKind; actId?: string }
export interface Staff { id: string; name: string; role: Role; skill: number; integrity: number; salary: number }
export interface Dil { labelId: string; actId: string; ad: number; until: number; critic?: string }
export interface MedX {
  line: Line; aud: Aud; prog: Slot[]; staff: Staff[]; cred: number; src: Record<string, number>; pulled: Record<string, number>; soft: number;
  disc: { actId: string; y: number; f0: number }[]; adapted: number[]; dil?: Dil; newAud: number; cool: number; notes: L[]; lastFx: L[];
}

export const LINES: Record<Line, { name: L; desc: L; reach: number; ad: number; fit: (a: Act) => number }> = {
  mainstream: { name: l('Grandes sucessos', 'Mainstream hits'), desc: l('Toca o que todo mundo quer ouvir: alcance e anúncios altos, credibilidade rende pouco.', 'Plays what everyone wants: high reach and ads, credibility builds slowly.'), reach: 3, ad: 1.2, fit: (a) => (a.fame >= 50 ? 1 : a.fame < 25 ? -0.5 : 0.2) },
  underground: { name: l('Underground', 'Underground'), desc: l('Só descoberta e cena pequena: menos alcance, mas credibilidade e lealdade crescem rápido.', 'Discovery and small scenes only: less reach, but credibility and loyalty grow fast.'), reach: -3, ad: 0.8, fit: (a) => (a.fame < 30 ? 1 : a.fame >= 55 ? -0.8 : 0) },
  prestige: { name: l('Crítica de prestígio', 'Prestige criticism'), desc: l('Valoriza obra autoral, de qualquer tamanho: credibilidade e anunciantes sofisticados.', 'Values auteur work of any size: credibility and upmarket advertisers.'), reach: -1, ad: 1, fit: (a) => (a.positioning < 55 && a.fame >= 12 && a.fame < 75 ? 0.9 : a.positioning >= 80 ? -0.6 : 0) },
  tabloid: { name: l('Fofoca e escândalo', 'Gossip and scandal'), desc: l('Cliques e capas: alcance e anúncios altos, a credibilidade é frágil e cai a cada escândalo ignorado.', 'Clicks and covers: high reach and ads, fragile credibility.'), reach: 4, ad: 1.15, fit: (a) => (a.scandals > 0 ? 1 : a.fame >= 50 ? 0.4 : -0.2) },
};
export const AUDS: Record<Aud, { name: L; reach: number; ad: number }> = {
  youth: { name: l('Jovem', 'Youth'), reach: 1.1, ad: 1 }, adult: { name: l('Adulto', 'Adult'), reach: 1, ad: 1.1 }, niche: { name: l('Nicho fiel', 'Loyal niche'), reach: 0.8, ad: 1.4 },
};
export const SLOT_NAME: Record<SlotKind, L> = {
  rotation: l('Rotação', 'Rotation'), interview: l('Entrevista', 'Interview'), review: l('Resenha/crítica', 'Review'),
  session: l('Sessão ao vivo', 'Live session'), premiere: l('Estreia exclusiva', 'Exclusive premiere'),
};
export const ROLE_NAME: Record<Role, L> = { host: l('Apresentador', 'Host'), critic: l('Crítico', 'Critic'), curator: l('Curador', 'Curator'), reporter: l('Repórter', 'Reporter') };
export const slotKinds = (s: GameState): SlotKind[] => ['rotation', 'interview', 'review', ...(s.year >= 1930 ? ['session' as const] : []), ...(s.year >= 1950 ? ['premiere' as const] : [])];
export const slotCap = (v: Venture): number => ({ magazine: 3, radio: 5, tv: 3, blog: 4, playlist: 6 }[v.media!] + v.level);
export const staffCap = (v: Venture): number => 2 + v.level;

const SHIFTS: Record<MediaKind, { y: number; name: L; cost: number }[]> = {
  magazine: [{ y: 1960, name: l('Revista em cores, foco no jovem', 'Color magazine aimed at youth'), cost: 8000 }, { y: 2005, name: l('Edição digital e site', 'Digital edition and site'), cost: 20000 }],
  radio: [{ y: 1955, name: l('Programação Top 40', 'Top 40 format'), cost: 9000 }, { y: 1990, name: l('FM segmentada por público', 'Segmented FM'), cost: 15000 }, { y: 2012, name: l('Rádio on-line e podcasts', 'Online radio and podcasts'), cost: 20000 }],
  tv: [{ y: 1981, name: l('Canal de videoclipes', 'Music video channel'), cost: 60000 }, { y: 2008, name: l('Vídeo sob demanda', 'Video on demand'), cost: 90000 }],
  blog: [{ y: 2012, name: l('Redes sociais e vídeo curto', 'Social media and short video'), cost: 4000 }],
  playlist: [{ y: 2018, name: l('Playlists por humor e contexto', 'Mood and context playlists'), cost: 6000 }],
};
export const shiftsOf = (s: GameState, v: Venture, x: MedX) => SHIFTS[v.media!].filter((z) => z.y <= s.year).map((z) => ({ ...z, done: x.adapted.includes(z.y) }));
export const overdue = (s: GameState, v: Venture, x: MedX): number => shiftsOf(s, v, x).filter((z) => !z.done && s.year - z.y >= 2).reduce((t, z) => t + Math.min(6, s.year - z.y - 1), 0);
export function formatName(s: GameState, v: Venture, x: MedX): L | null {
  const d = SHIFTS[v.media!].filter((z) => z.y <= s.year && x.adapted.includes(z.y)).at(-1);
  return d?.name ?? null;
}

export const medOf = (s: GameState, vid: string): MedX => (v12(s).med[vid] ??= { line: 'mainstream', aud: 'adult', prog: [], staff: [], cred: 50, src: {}, pulled: {}, soft: 0, disc: [], adapted: [], newAud: 0, cool: 0, notes: [], lastFx: [] });
const mnote = (x: MedX, t: L) => { x.notes.unshift(t); if (x.notes.length > 8) x.notes.pop(); };
export const staffBy = (x: MedX, role: Role): Staff[] => x.staff.filter((z) => z.role === role);
const best = (x: MedX, role: Role): number => Math.max(0, ...staffBy(x, role).map((z) => z.skill));
const med = (s: GameState, vid: string) => venture(s, vid, 'media');

export function setLine(s: GameState, vid: string, line: Line, aud: Aud): void {
  const v = med(s, vid), x = v && medOf(s, vid);
  if (!v || !x) return;
  if (x.line !== line) { x.cred = clamp(x.cred - 6, 0, 100); mnote(x, l('Mudar a linha editorial custa credibilidade.', 'Changing the editorial line costs credibility.')); }
  x.line = line; x.aud = aud;
}
export function setSlot(s: GameState, vid: string, i: number, kind: SlotKind | '', actId: string): void {
  const v = med(s, vid), x = v && medOf(s, vid);
  if (!v || !x || i < 0 || i >= slotCap(v)) return;
  if (!kind) { x.prog.splice(i, 1); return; }
  x.prog[i] = { kind, actId: actId || undefined };
  for (let k = 0; k < i; k++) x.prog[k] ??= { kind: 'rotation' };
}

export function staffPool(s: GameState, vid: string): Staff[] {
  const v = med(s, vid);
  if (!v) return [];
  const r = Rng.fromSeed(`${s.config.seed}:med12pool:${vid}:${s.year}`);
  const lang = langForCity(v.city, r);
  return (['host', 'critic', 'curator', 'reporter'] as Role[]).flatMap((role) => [0, 1].map(() => {
    const skill = r.int(35, 90);
    return { id: `${vid}:${s.year}:${role}:${r.int(1, 9999)}`, name: personName(r, lang), role, skill, integrity: r.int(15, 95), salary: Math.round(money(s, 400 + skill * 12) * (MEDIA[v.media!].mult > 2 ? 1.5 : 1)) };
  }));
}
export function hireStaff(s: GameState, vid: string, st: Staff): { ok: boolean; text: L } {
  const v = med(s, vid), x = v && medOf(s, vid);
  if (!v || !x) return res(false, l('Inválido.', 'Invalid.'));
  if (x.staff.length >= staffCap(v)) return res(false, l('Redação cheia neste nível.', 'Newsroom full at this level.'));
  if (funds(s, v.owner) < st.salary * 3) return res(false, l('Sem dinheiro para a contratação.', 'Not enough money to hire.'));
  vpay(s, v.owner, -st.salary * 3, `hire:${st.id}`, `Contratação ${st.name}`, v);
  x.staff.push(st);
  return res(true, fmtL(l('{n} entra como {r} (salário {s}/mês).', '{n} joins as {r} (salary {s}/mo).'), { n: st.name, r: ROLE_NAME[st.role], s: Math.round(st.salary / 100) }));
}
export function fireStaff(s: GameState, vid: string, id: string): void { const x = v12(s).med[vid]; if (x) x.staff = x.staff.filter((z) => z.id !== id); }

/** Pede uma entrevista exclusiva: depende da relação de fonte, do apresentador e do tamanho do artista. */
export function chaseExclusive(s: GameState, r: Rng, vid: string, actId: string): { ok: boolean; text: L } {
  const v = med(s, vid), x = v && medOf(s, vid), a = s.acts[actId];
  if (!v || !x || !activeAct(a)) return res(false, l('Inválido.', 'Invalid.'));
  if (x.cool > s.week) return res(false, l('A redação ainda está fechando a última pauta.', 'The newsroom is still closing the last story.'));
  x.cool = s.week + 4;
  const src = x.src[actId] ?? 30;
  const p = clamp(0.15 + src / 200 + best(x, 'host') / 300 + best(x, 'reporter') / 400 + v.rep / 400 - a.fame / 350, 0.05, 0.9);
  if (!r.chance(p)) { x.src[actId] = src - 3; return res(false, fmtL(l('{a} recusou a exclusiva (relação de fonte {k}). Mais confiança e um bom apresentador ajudam.', '{a} declined the exclusive (source relation {k}). More trust and a good host help.'), { a: a.name, k: Math.round(src) })); }
  x.src[actId] = clamp(src + 8, 0, 100); x.cred = clamp(x.cred + 2, 0, 100);
  v.reach = clamp((v.reach ?? 0) + 2 + a.fame / 30, 0, 100);
  a.momentum = clamp(a.momentum + 3, 0, 100);
  const t = fmtL(l('Exclusiva com {a}: o alcance de {v} salta.', 'Exclusive with {a}: reach at {v} jumps.'), { a: a.name, v: v.name });
  mnote(x, t);
  return res(true, t);
}

export function adapt(s: GameState, vid: string, y: number): { ok: boolean; text: L } {
  const v = med(s, vid), x = v && medOf(s, vid), sh = v && SHIFTS[v.media!].find((z) => z.y === y && z.y <= s.year);
  if (!v || !x || !sh || x.adapted.includes(y)) return res(false, l('Inválido.', 'Invalid.'));
  const c = money(s, sh.cost) * v.level;
  if (funds(s, v.owner) < c) return res(false, l('Sem dinheiro.', 'Not enough money.'));
  vpay(s, v.owner, -c, `shift:${vid}:${y}`, `Novo formato ${v.name}`, v);
  x.adapted.push(y); x.cred = clamp(x.cred + 2, 0, 100);
  return res(true, fmtL(l('{n} adota o formato: {f}.', '{n} adopts the format: {f}.'), { n: v.name, f: sh.name }));
}

export type RevMode = 'soften' | 'publish' | 'reply';
/** Cenário: crítica negativa ao artista de um grande anunciante. */
export function resolveReview(s: GameState, r: Rng, vid: string, mode: RevMode): { ok: boolean; text: L } {
  const v = med(s, vid), x = v && medOf(s, vid), d = x?.dil, a = d && s.acts[d.actId], lb = d && s.labels[d.labelId];
  if (!v || !x || !d || !a || !lb) return res(false, l('Nada a decidir.', 'Nothing to decide.'));
  x.dil = undefined;
  const critic = x.staff.find((z) => z.id === d.critic);
  const st = standingOf(s, lb.id);
  if (mode === 'soften') {
    x.cred = clamp(x.cred - 9, 0, 100); x.soft++; a.momentum = clamp(a.momentum + 3, 0, 100);
    st.trust = clamp(st.trust + 1, 0, 100);
    let extra: L = l('', '');
    if (critic && critic.integrity > 60 && r.chance(0.4)) { fireStaff(s, vid, critic.id); extra = fmtL(l(' {c} pede demissão, indignado.', ' {c} resigns in protest.'), { c: critic.name }); }
    if (x.soft >= 3 && r.chance(0.25)) { x.cred = clamp(x.cred - 12, 0, 100); notify(s, fmtL(l('Vazam as críticas amaciadas de {v}: a imprensa questiona sua independência.', 'Softened reviews at {v} leak: the press questions your independence.'), { v: v.name }), 'bad'); }
    return res(true, fmtL(l('Você amacia o texto sobre {a} e mantém {b} como anunciante. Credibilidade −9.{x}', 'You soften the piece on {a} and keep {b} advertising. Credibility −9.{x}'), { a: a.name, b: lb.name, x: extra }));
  }
  x.soft = Math.max(0, x.soft - 1);
  const pull = r.chance(mode === 'publish' ? 0.65 : 0.3);
  x.cred = clamp(x.cred + (mode === 'publish' ? 7 : 3) + (x.line === 'prestige' || x.line === 'underground' ? 3 : 0), 0, 100);
  a.momentum = clamp(a.momentum - (mode === 'publish' ? 3 : 1.5), 0, 100); if (mode === 'publish') a.fame = clamp(a.fame - 1, 0, 100);
  x.src[a.id] = (x.src[a.id] ?? 30) - (mode === 'publish' ? 15 : 5); x.src[lb.id] = (x.src[lb.id] ?? 30) - (mode === 'publish' ? 10 : 3);
  st.trust = clamp(st.trust - 2, 0, 100);
  if (pull) { x.pulled[lb.id] = s.year * 12 + s.month + r.int(8, 14); notify(s, fmtL(l('{b} retira a publicidade de {v} em retaliação.', '{b} pulls its advertising from {v} in retaliation.'), { b: lb.name, v: v.name }), 'bad'); }
  const t = fmtL(l('{m} a crítica sobre {a}. Credibilidade +{c}.{p}', '{m} the review of {a}. Credibility +{c}.{p}'), { m: mode === 'publish' ? l('Você publica', 'You publish') : l('Você publica com direito de resposta', 'You publish with right of reply'), a: a.name, c: mode === 'publish' ? 7 : 3, p: pull ? l(` ${lb.name} corta os anúncios.`, ` ${lb.name} cuts its ads.`) : l(` ${lb.name} engole a seco e continua anunciando.`, ` ${lb.name} swallows it and keeps advertising.`) });
  mnote(x, t);
  return res(true, t);
}

/** Anunciantes: os quatro selos mais fortes; dependência = fatia do maior. */
export function advertisers(s: GameState): { id: string; name: string; w: number }[] {
  const top = Object.values(s.labels).filter((z) => z.active).sort((a, b) => b.reputation - a.reputation || a.id.localeCompare(b.id)).slice(0, 4);
  const W = [0.4, 0.27, 0.2, 0.13];
  return top.map((z, i) => ({ id: z.id, name: z.name, w: W[i] }));
}
export const adPulled = (s: GameState, x: MedX): number => advertisers(s).reduce((t, a) => t + ((x.pulled[a.id] ?? 0) > s.year * 12 + s.month ? a.w : 0), 0);

function mediaMonth12(s: GameState, r: Rng, v: Venture): void {
  const x = medOf(s, v.id), L0 = LINES[x.line], A0 = AUDS[x.aud];
  const fx: L[] = [];
  const now = s.year * 12 + s.month;
  for (const st of x.staff) vpay(s, v.owner, -st.salary, `sal:${st.id}`, `Salário ${st.name}`, v);
  const critic = best(x, 'critic');
  // programação: consistência com a linha dá credibilidade; incoerência cobra
  const key = v.scene ? `${v.city}:${v.scene}` : '';
  let cred = 0, bumped = 0;
  for (const sl of x.prog.slice(0, slotCap(v))) {
    const a = sl.actId ? s.acts[sl.actId] : undefined;
    if (!activeAct(a)) continue;
    const f = L0.fit(a);
    cred += f * 0.7;
    const w = sl.kind === 'premiere' ? 2 : sl.kind === 'interview' ? 1.3 : sl.kind === 'review' ? 0.8 : 1;
    a.momentum = clamp(a.momentum + (v.reach ?? 10) / 40 * w, 0, 100);
    if (a.fame < 35) { x.newAud += (v.reach ?? 10) / 12 * w; if (key && a.genre === v.scene && a.city === v.city) { s.scenes[key] = clamp((s.scenes[key] ?? 0) + 0.8, 0, 100); } }
    if (sl.kind === 'review' && critic) cred += critic / 200;
    if (sl.kind === 'interview') x.src[a.id] = clamp((x.src[a.id] ?? 30) + 1.2, 0, 100);
    bumped++;
    if (f < -0.3 && fx.length < 3) fx.push(fmtL(l('{a} destoa da linha "{n}" (credibilidade cai).', '{a} clashes with the "{n}" line (credibility drops).'), { a: a.name, n: L0.name }));
    else if (f > 0.6 && fx.length < 3) fx.push(fmtL(l('{a} combina com a linha "{n}" (credibilidade sobe).', '{a} fits the "{n}" line (credibility rises).'), { a: a.name, n: L0.name }));
  }
  if (!bumped) cred -= 0.4;
  if (x.line === 'tabloid') cred -= 0.5;
  cred += best(x, 'critic') / 400 + (x.soft ? -0.3 * x.soft : 0.15);
  x.cred = clamp(x.cred + cred + (50 - x.cred) * 0.01, 0, 100);
  // alcance: credibilidade e linha movem o que ventures9 já calculou; formato atrasado cobra
  const od = overdue(s, v, x);
  v.reach = clamp((v.reach ?? 10) + (x.cred - 50) * 0.03 + L0.reach * 0.1 + best(x, 'host') / 400 - od * 0.5 - 0.2 + (A0.reach - 1), 2, 100);
  if (od) fx.push(fmtL(l('Formato ultrapassado: o público migra (alcance −{o}).', 'Outdated format: the audience migrates (reach −{o}).'), { o: Math.round(od * 3.3) }));
  // publicidade extra ou perdida
  const base = money(s, MEDIA[v.media!].ad) * ((v.reach ?? 10) / 50) * (0.6 + v.level * 0.4);
  const mult = L0.ad * A0.ad * (0.7 + x.cred / 170);
  const pulled = adPulled(s, x);
  vpay(s, v.owner, base * (mult - 1) - base * pulled * mult, `ad12:${v.id}`, `Ajuste de publicidade ${v.name}`, v);
  if (pulled) fx.push(fmtL(l('Anunciantes que cortaram: {p}% da receita publicitária.', 'Advertisers that pulled out: {p}% of ad revenue.'), { p: Math.round(pulled * 100) }));
  // nova audiência
  if (x.newAud >= 100) {
    x.newAud = 0; v.reach = clamp(v.reach + 3, 0, 100); x.cred = clamp(x.cred + 2, 0, 100);
    if (key) s.scenes[key] = clamp((s.scenes[key] ?? 0) + 5, 0, 100);
    const t = fmtL(l('Apoiar artistas pequenos forma uma nova audiência fiel para {v}.', 'Backing small acts builds a loyal new audience for {v}.'), { v: v.name });
    mnote(x, t); notify(s, t, 'good');
  }
  // descoberta precoce (curadores)
  const cur = best(x, 'curator');
  if (cur && r.chance(cur / 250)) {
    const pool = Object.values(s.acts).filter((a) => activeAct(a) && a.fame <= 25 && a.potential >= 60 && !x.disc.some((z) => z.actId === a.id));
    if (pool.length) {
      const a = r.pick(pool);
      x.disc.push({ actId: a.id, y: s.year, f0: a.fame }); if (x.disc.length > 12) x.disc.shift();
      mnote(x, fmtL(l('Seu curador descobre {a}. Coloque na programação cedo para levar o crédito.', 'Your curator spots {a}. Book them early to take the credit.'), { a: a.name }));
    }
  }
  if (s.month === 0) for (const d of x.disc.slice()) {
    const a = s.acts[d.actId];
    if (!a || s.year - d.y > 6) { x.disc = x.disc.filter((z) => z !== d); continue; }
    const featured = x.prog.some((z) => z.actId === d.actId);
    if (a.fame - d.f0 >= 25 && featured) {
      x.disc = x.disc.filter((z) => z !== d); x.cred = clamp(x.cred + 6, 0, 100); v.rep = clamp(v.rep + 4, 0, 100);
      const t = fmtL(l('{v} apostou cedo em {a}, hoje uma estrela. A fama de olho clínico rende credibilidade.', '{v} backed {a} early and they are a star now. The golden-ear fame pays off.'), { v: v.name, a: a.name });
      notify(s, t, 'good'); remember(s, 'media12', t, { important: true });
    }
  }
  // fontes esfriam sem contato
  for (const k of Object.keys(x.src)) x.src[k] += x.src[k] > 30 ? -0.2 : 0.2;
  // dilema: crítica negativa ao artista de um grande anunciante
  if (x.dil && s.week > x.dil.until) {
    const lb = s.labels[x.dil.labelId];
    x.cred = clamp(x.cred - 3, 0, 100);
    notify(s, fmtL(l('Você enrolou e a crítica sobre o artista de {b} vazou por outro veículo. Credibilidade −3.', 'You stalled and the review of {b}\'s act leaked elsewhere. Credibility −3.'), { b: lb?.name ?? '?' }), 'bad');
    x.dil = undefined;
  } else if (!x.dil && x.staff.some((z) => z.role === 'critic') && r.chance(0.1)) {
    const ad = advertisers(s).find((z) => (x.pulled[z.id] ?? 0) <= now && r.chance(z.w + 0.2));
    const lb = ad && s.labels[ad.id];
    const act = lb && lb.roster.map((id) => s.acts[id]).filter(activeAct).sort((a, b) => b.fame - a.fame)[0];
    if (lb && ad && act) {
      x.dil = { labelId: lb.id, actId: act.id, ad: Math.round(base * ad.w * mult), until: s.week + 6, critic: staffBy(x, 'critic')[0].id };
      notify(s, fmtL(l('Decisão em {v}: sua crítica detonou o novo disco de {a} ({b}, {p}% da publicidade).', 'Decision at {v}: your critic panned {a}\'s new record ({b}, {p}% of ad revenue).'), { v: v.name, a: act.name, b: lb.name, p: Math.round(ad.w * 100) }), 'event');
    }
  }
  x.lastFx = fx;
}

registerSimHook('month', 'ventures12:media', (s) => {
  const r = seedRng(s, 'ventures12:media');
  for (const v of ventures(s).list) if (v.kind === 'media') mediaMonth12(s, r, v);
  for (const n of Object.values(v12(s).med)) for (const k of Object.keys(n.pulled)) if (n.pulled[k] < s.year * 12 + s.month - 24) delete n.pulled[k];
});
void nextId; void cityById;
