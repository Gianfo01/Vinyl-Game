// R31 · onda 3 (Z) — FAMÍLIA FOSSATI E BASE NOVA (motor). Dados em src/data/fossati31.ts (família), relics31.ts
// (relíquias reais novas), base31acts.ts (artistas, ligados em realworld) e cur31.ts (curadoria).
//
// Família (ficção declarada; contrato "Pessoas permanentes"):
//  - uma pessoa, vários papéis por época: os papéis moram no registro único de papéis (r31/role.ts, chave 'fam:<id>');
//    `syncFam31` abre e fecha pela tabela FAM_ERAS31 no início da partida e em toda virada de ano (com o histórico das
//    épocas anteriores, já fechado). Aposentadoria (só a Sonia, em SONIA_RETIRE31) muda o papel, não a identidade.
//  - presentes em qualquer ano de início, sem chegada; idade fixa (identidade é dado constante: nunca envelhecem nem
//    morrem — não estão em `s.persons`, onde o envelhecimento e as mortes acontecem).
//  - o violino do Efro: mora na frente G (r31/relic31.ts, id fixo `rl_efro_violin`, `meta.fix = 'efro'`): Mítico em toda
//    partida, nunca à venda nem para rival, roubado volta no mesmo mês. Aqui só o lemos (ficha da família).
//  - efeitos pequenos, opcionais e medidos, atrás do interruptor 'fam31' (ações do jogador; nada acontece sozinho):
//    almoço da Lucia (estresse −6, moral +3 dos seus artistas, a cada 13 semanas), lasanha (opinião +4), promoção com a
//    Sonia (impulso +4, fama +1), imprensa/teatro com a Antonella até 1996 (fama +1, impulso +2) e escola de idiomas
//    depois (demanda de turnê +4% nas cidades daquela língua), Metalmac (defeito de prensagem −0,6 ponto), voo panorâmico
//    do Efro (uma vez por partida: inspiração +10) e clube de tênis (reputação institucional +1 por ano).
//  - conquista "Famiglia" ao conhecer os quatro.
// Base nova: relíquias de relics31 entram no catálogo real (RELICS17, editável no editor de base), com id próprio no
// relics9; correções de texto nas peças antigas; peças de museu nacional fora do comércio.

import { formatMoney } from '../../core/money';
import { clamp } from '../../core/rng';
import { FAMILY31, FAM_CITY31, FAM_ERAS31, SONIA_RETIRE31, famErasAt31, famKey31, type FamEra31, type FamId31, type FamMember31 } from '../../data/fossati31';
import { RELICS31, RELIC_FIX31, RELIC_NOSALE31, RELIC_TIER31 } from '../../data/relics31';
import { cityById, CITIES, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { opine } from '../opinion';
import { RELICS17, RELIC_OWNID17 } from '../relics17';
import { registerBaseSection31, type BaseData31 } from '../r31/base31';
import { registerEditable, registerRunnable } from '../r31/editor';
import { addRole, endRole, retire, rolesOf, type Role } from '../r31/role';
import { registerSwitch, sw } from '../r31/switches';
import type { GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { pressDefect31 } from './industry/supply';
import { relicFixed9, relics, type Relic } from './relics9';
import { EFRO_VIOLIN_ID, ensureEfroViolin31 } from '../r31/relic31';

// ---------------------------------------------------------------- base nova: relíquias

for (const d of RELICS31) {
  if (!RELICS17.some((x) => x.id === d.id)) RELICS17.push(d);
  RELIC_OWNID17.add(d.id);
}
for (const [id, fx] of Object.entries(RELIC_FIX31)) {
  const d = RELICS17.find((x) => x.id === id);
  if (d) Object.assign(d, fx);
}
for (const id of RELIC_NOSALE31) relicFixed9.add(id);

/** Nível de uma relíquia (onda 3: só as novas e o violino têm; o resto fica sem nível até o G/onda 4). */
export const relicTier31 = (id: string) => RELIC_TIER31[id];

// ---------------------------------------------------------------- interruptor e estado

registerSwitch({
  id: 'fam31', def: true, scope: 'game',
  desc: l('Família Fossati: efeitos pequenos e opcionais (almoço, promoção, imprensa, escola de idiomas, Metalmac, voo, tênis). Desligado, a família continua no mundo, sem efeito.',
    'Fossati family: small, optional effects (lunch, promotion, press, language school, Metalmac, flight, tennis). Off, the family stays in the world with no effect.'),
});

export interface Fam31St {
  /** semana em que cada ação volta a ficar disponível */
  cd: Record<string, number>;
  /** voo panorâmico já feito (semana) */
  flight?: number;
  /** contrato com a Metalmac até a semana */
  mm?: number;
  /** línguas aprendidas na escola da Antonella, por ato */
  langs: Record<string, string[]>;
  /** membros da família que você já conheceu (por uma ação com eles) */
  met: FamId31[];
  /** conquista "Famiglia" (semana) */
  famiglia?: number;
}
declare module '../ext4' { interface Ext4 { fam31: Fam31St } }
const fresh = (): Fam31St => ({ cd: {}, langs: {}, met: [] });
registerExt4('fam31', fresh);
export function fam31(s: GameState): Fam31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.fam31 ??= fresh()) as Fam31St;
  st.cd ??= {}; st.langs ??= {}; st.met ??= [];
  return st;
}

// ---------------------------------------------------------------- pessoas permanentes e papéis

export const HOMAGE31: FamId31[] = ['efro', 'lucia', 'sonia', 'antonella'];
export const famAge31 = (id: FamId31): number => FAMILY31.find((m) => m.id === id)!.age;
export const famCity31 = (): string => FAM_CITY31.id;

const sameRole = (r: Role, e: FamEra31) => r.kind === e.kind && (r.org ?? '') === e.org && r.from === e.from;

/** Abre/fecha os papéis da família pela tabela de épocas até o ano atual (idempotente). */
export function syncFam31(s: GameState): void {
  const y = s.year;
  for (const m of FAMILY31) {
    const key = famKey31(m.id);
    for (const e of [...FAM_ERAS31[m.id]].sort((a, b) => a.from - b.from)) {
      if (e.from > y) continue;
      if (m.id === 'sonia' && e.from >= SONIA_RETIRE31) continue;
      let r = rolesOf(s, key).find((x) => sameRole(x, e));
      if (!r) {
        endRole(s, key, e.kind, e.from - 1, e.org); // a época anterior do mesmo papel (ex.: Metalmac de LP → de CD)
        r = addRole(s, key, e.kind, { org: e.org, from: e.from });
      }
      if (e.to !== undefined && e.to < y && r.to === undefined) endRole(s, key, e.kind, e.to, e.org);
    }
    if (m.id === 'sonia' && y >= SONIA_RETIRE31 && !rolesOf(s, key).some((r) => r.kind === 'retired')) retire(s, key, SONIA_RETIRE31);
  }
}

export interface FamNow31 { m: FamMember31; key: string; age: number; city: string; roles: Role[]; eras: FamEra31[]; retired: boolean }
/** A família neste ano: sempre os cinco, com a idade fixa e os papéis ativos. */
export function famNow31(s: GameState): FamNow31[] {
  return FAMILY31.map((m) => {
    const key = famKey31(m.id);
    const roles = rolesOf(s, key, s.year);
    const eras = famErasAt31(m.id, s.year).filter((e) => !(m.id === 'sonia' && s.year >= SONIA_RETIRE31 && e.kind !== 'family'));
    return { m, key, age: m.age, city: famCity31(), roles, eras, retired: roles.some((r) => r.kind === 'retired') };
  });
}
/** Rótulo do papel de trabalho atual (o que a ficha mostra), com a marca real só quando o interruptor deixa. */
export function famRoleLabel31(s: GameState, id: FamId31): L {
  const n = famNow31(s).find((x) => x.m.id === id)!;
  if (n.retired) return l('Aposentada', 'Retired');
  const work = n.eras.filter((e) => e.kind !== 'family');
  const e = work[work.length - 1] ?? n.eras[0];
  if (!e) return l('Família Fossati', 'Fossati family');
  if (e.brand && !s.config.realNames) {
    const generic: Record<string, L> = {
      'cur:radio_89fm': l('Diretora de promoções e eventos de uma FM de rock', 'Promotions and events director at a rock FM'),
      'cur:radio_virgin': l('Diretora de promoções e eventos de uma FM pop', 'Promotions and events director at a pop FM'),
      'cur:radio_gazeta': l('Diretora de promoções e eventos de uma FM adulta', 'Promotions and events director at an adult FM'),
      'cur:milton_guedes': l('Empresária de artistas', 'Artist manager'),
    };
    return generic[e.brand] ?? e.label;
  }
  return e.label;
}

// ---------------------------------------------------------------- o violino do Efro (dono: frente G, r31/relic31.ts)

export const violin31 = (s: GameState): Relic | undefined => relics(s).list.find((x) => x.id === EFRO_VIOLIN_ID);

// ---------------------------------------------------------------- ações do jogador (efeitos pequenos e opcionais)

export type FamRes31 = { ok: boolean; text: L };
const no = (pt: string, en: string): FamRes31 => ({ ok: false, text: l(pt, en) });
const off = (s: GameState): FamRes31 | null => (sw<boolean>(s, 'fam31') ? null : no('A família está no mundo, mas os efeitos dela estão desligados nesta partida.', 'The family is in the world, but its effects are switched off in this game.'));
const cdLeft = (s: GameState, k: string): number => Math.max(0, (fam31(s).cd[k] ?? 0) - s.week);
const busy = (s: GameState, k: string): FamRes31 | null => {
  const w = cdLeft(s, k);
  return w > 0 ? { ok: false, text: fmtL(l('Ainda não: dá de novo em {w} semanas.', 'Not yet: available again in {w} weeks.'), { w }) } : null;
};
const meet = (s: GameState, id: FamId31): void => {
  const st = fam31(s);
  if (!st.met.includes(id)) st.met.push(id);
  if (st.famiglia === undefined && HOMAGE31.every((x) => st.met.includes(x))) {
    st.famiglia = s.week;
    emitFact(s, { kind: 'memory', actors: ['player', ...HOMAGE31.map(famKey31)], place: famCity31(), severity: 25, visibility: 'public', tags: ['family', 'good', 'achievement'], src: 'fam31',
      text: l('Conquista "Famiglia": você conheceu Efro, Lucia, Sonia e Antonella Fossati.', 'Achievement "Famiglia": you met Efro, Lucia, Sonia and Antonella Fossati.'), notify: 'info' });
  }
};
const yourPeople = (s: GameState): string[] => [...new Set(playerActs(s).flatMap((id) => s.acts[id]?.members ?? []))].filter((p) => s.persons[p]?.alive);
const yourAct = (s: GameState, actId: string) => (playerActs(s).includes(actId) ? s.acts[actId] : undefined);
const moneyL = (c: number): L => ({ pt: formatMoney(c, 'pt-BR'), en: formatMoney(c, 'en-US') });

export const LUNCH_CD31 = 13;
/** Almoço de domingo na casa da Lucia: alivia o estresse e levanta a moral dos seus artistas. */
export function luciaLunch31(s: GameState): FamRes31 {
  const e = off(s) ?? busy(s, 'lunch');
  if (e) return e;
  const ppl = yourPeople(s);
  if (!ppl.length) return no('Você ainda não tem artistas para levar ao almoço.', 'You have no artists to bring to lunch yet.');
  for (const id of ppl) { const p = s.persons[id]; p.stress = clamp(p.stress - 6, 0, 100); p.morale = clamp(p.morale + 3, 0, 100); }
  fam31(s).cd.lunch = s.week + LUNCH_CD31;
  meet(s, 'lucia');
  emitFact(s, { kind: 'memory', actors: ['player', famKey31('lucia')], place: famCity31(), severity: 10, visibility: 'public', tags: ['family', 'good'], src: 'fam31',
    text: l('Almoço de domingo na casa da Lucia Fossati: macarrão, conversa e ninguém fala de trabalho.', 'Sunday lunch at Lucia Fossati\'s: pasta, conversation and no talk of work.'), diary: true });
  return { ok: true, text: fmtL(l('{n} pessoas saíram do almoço mais leves (estresse −6, moral +3).', '{n} people left lunch lighter (stress −6, morale +3).'), { n: ppl.length }) };
}

/** "A lasanha da Lucia": presente que agrada qualquer pessoa (opinião sobre você +4). */
export function lasagna31(s: GameState, key: string): FamRes31 {
  const e = off(s) ?? busy(s, 'lasagna');
  if (e) return e;
  opine(s, key, 4, l('ganhou uma lasanha da Lucia Fossati.', 'got a lasagna from Lucia Fossati.'));
  fam31(s).cd.lasagna = s.week + 26;
  meet(s, 'lucia');
  return { ok: true, text: l('A lasanha da Lucia agradou (opinião sobre você +4).', 'Lucia\'s lasagna went down well (opinion of you +4).') };
}

/** Evento promocional com a Sonia (no veículo da época; como empresária, depois de 2020). */
export function soniaPromo31(s: GameState, actId: string): FamRes31 {
  const e = off(s) ?? busy(s, 'promo');
  if (e) return e;
  if (s.year >= SONIA_RETIRE31) return no('A Sonia se aposentou; ela manda um abraço.', 'Sonia has retired; she sends her love.');
  const a = yourAct(s, actId);
  if (!a) return no('Escolha um artista seu.', 'Pick one of your artists.');
  const cost = money(s, 800);
  if (s.player.cash < cost) return { ok: false, text: fmtL(l('Falta caixa: o evento custa {v}.', 'Not enough cash: the event costs {v}.'), { v: moneyL(cost) }) };
  post(s, `fam31promo:${actId}`, -cost, 'marketing', 'Evento promocional com Sonia Fossati');
  a.momentum = clamp(a.momentum + 4, 0, 100);
  a.fame = clamp(a.fame + 1, 0, 100);
  fam31(s).cd.promo = s.week + 26;
  meet(s, 'sonia');
  emitFact(s, { kind: 'show', actors: [a.id, famKey31('sonia')], place: famCity31(), severity: 15, visibility: 'public', tags: ['promo', 'family'], src: 'fam31',
    text: fmtL(l('{a} faz um evento promocional organizado por Sonia Fossati ({r}).', '{a} plays a promotional event organised by Sonia Fossati ({r}).'), { a: a.name, r: famRoleLabel31(s, 'sonia') }) });
  return { ok: true, text: fmtL(l('Evento feito por {v}: impulso +4 e fama +1 para {a}.', 'Event done for {v}: momentum +4 and fame +1 for {a}.'), { v: moneyL(cost), a: a.name }) };
}

export const ANTONELLA_SCHOOL31 = 1997;
/** Antonella até 1996: entrevista no jornal / temporada de teatro (fama +1, impulso +2). */
export function antonellaPress31(s: GameState, actId: string): FamRes31 {
  const e = off(s) ?? busy(s, 'press');
  if (e) return e;
  if (s.year >= ANTONELLA_SCHOOL31) return no('A Antonella agora cuida da escola de idiomas.', 'Antonella now runs the language school.');
  const a = yourAct(s, actId);
  if (!a) return no('Escolha um artista seu.', 'Pick one of your artists.');
  a.fame = clamp(a.fame + 1, 0, 100);
  a.momentum = clamp(a.momentum + 2, 0, 100);
  fam31(s).cd.press = s.week + 26;
  meet(s, 'antonella');
  emitFact(s, { kind: 'statement', actors: [a.id, famKey31('antonella')], place: famCity31(), severity: 12, visibility: 'public', tags: ['press', 'family'], src: 'fam31',
    text: fmtL(l('Antonella Fossati entrevista {a} e abre espaço numa temporada de teatro.', 'Antonella Fossati interviews {a} and books a theatre season.'), { a: a.name }) });
  return { ok: true, text: fmtL(l('Entrevista publicada: fama +1 e impulso +2 para {a}.', 'Interview published: fame +1 and momentum +2 for {a}.'), { a: a.name }) };
}

/** Línguas que a escola ensina (as dos grupos de nome do jogo). */
export const SCHOOL_LANGS31: { id: string; name: L }[] = [
  { id: 'en', name: l('Inglês', 'English') }, { id: 'es', name: l('Espanhol', 'Spanish') }, { id: 'it', name: l('Italiano', 'Italian') },
  { id: 'fr', name: l('Francês', 'French') }, { id: 'de', name: l('Alemão', 'German') }, { id: 'pt', name: l('Português', 'Portuguese') },
  { id: 'ja', name: l('Japonês', 'Japanese') }, { id: 'ko', name: l('Coreano', 'Korean') },
];
export const actLangs31 = (s: GameState, actId: string): string[] => fam31(s).langs[actId] ?? [];
/** Escola de idiomas da Antonella (a partir de 1997): o artista aprende a língua e a barreira cai (turnê +4% de demanda
 *  nas cidades dessa língua; as paradas por país podem ler `actLangs31`). */
export function langSchool31(s: GameState, actId: string, lang: string): FamRes31 {
  const e = off(s);
  if (e) return e;
  if (s.year < ANTONELLA_SCHOOL31) return no('A escola de idiomas da Antonella ainda não existe.', 'Antonella\'s language school does not exist yet.');
  const a = yourAct(s, actId);
  if (!a) return no('Escolha um artista seu.', 'Pick one of your artists.');
  const L0 = SCHOOL_LANGS31.find((x) => x.id === lang);
  if (!L0) return no('Língua que a escola não ensina.', 'The school does not teach that language.');
  const st = fam31(s);
  if ((st.langs[actId] ?? []).includes(lang)) return no('Já aprendeu essa língua.', 'Already learned that language.');
  const cost = money(s, 1500);
  if (s.player.cash < cost) return { ok: false, text: fmtL(l('Falta caixa: o curso custa {v}.', 'Not enough cash: the course costs {v}.'), { v: moneyL(cost) }) };
  post(s, `fam31lang:${actId}:${lang}`, -cost, 'other', 'Escola de idiomas de Antonella Fossati');
  (st.langs[actId] ??= []).push(lang);
  meet(s, 'antonella');
  return { ok: true, text: fmtL(l('{a} aprendeu {g} na escola da Antonella ({v}).', '{a} learned {g} at Antonella\'s school ({v}).'), { a: a.name, g: L0.name, v: moneyL(cost) }) };
}
registerMod('cityDemand', 'fam31:lang', (s, v, ctx) => {
  if (!ctx.act || !ctx.cityId || !sw<boolean>(s, 'fam31')) return null;
  const langs = fam31(s).langs[ctx.act.id];
  const cl = cityById[ctx.cityId]?.lang;
  if (!langs?.length || !cl || !langs.includes(cl) || cityById[ctx.act.city]?.lang === cl) return null;
  return { value: v * 1.04, label: l('Aprendeu a língua (escola da Antonella)', 'Learned the language (Antonella\'s school)') };
});

export const METALMAC_W31 = 52;
export const METALMAC_DEFECT31 = 0.006;
/** Contrato de um ano com a Metalmac (prensas da época): defeitos de prensagem −0,6 ponto percentual. */
export function metalmac31(s: GameState): FamRes31 {
  const e = off(s);
  if (e) return e;
  const st = fam31(s);
  if ((st.mm ?? 0) > s.week) return { ok: false, text: fmtL(l('O contrato com a Metalmac ainda vale por {w} semanas.', 'The Metalmac contract still runs for {w} weeks.'), { w: st.mm! - s.week }) };
  const cost = money(s, 2500);
  if (s.player.cash < cost) return { ok: false, text: fmtL(l('Falta caixa: o contrato custa {v}.', 'Not enough cash: the contract costs {v}.'), { v: moneyL(cost) }) };
  post(s, 'fam31:metalmac', -cost, 'production', 'Contrato com a Metalmac');
  st.mm = s.week + METALMAC_W31;
  meet(s, 'efro');
  return { ok: true, text: fmtL(l('Contrato de um ano com a Metalmac ({v}): menos cópias defeituosas.', 'One-year Metalmac contract ({v}): fewer defective copies.'), { v: moneyL(cost) }) };
}
pressDefect31.f = (s) => (sw<boolean>(s, 'fam31') && (fam31(s).mm ?? 0) > s.week ? METALMAC_DEFECT31 : 0);

export const FLIGHT_FROM31 = 1911;
/** Voo panorâmico no avião do Efro (aeroclube): uma vez por partida, inspiração +10 para o artista. */
export function efroFlight31(s: GameState, actId: string): FamRes31 {
  const e = off(s);
  if (e) return e;
  if (s.year < FLIGHT_FROM31) return no('Ainda não há aeroclube na cidade.', 'There is no aeroclub in town yet.');
  const st = fam31(s);
  if (st.flight !== undefined) return no('O voo panorâmico do Efro já aconteceu nesta partida.', 'Efro\'s scenic flight already happened this game.');
  const a = yourAct(s, actId);
  if (!a) return no('Escolha um artista seu.', 'Pick one of your artists.');
  for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.inspiration = clamp(p.inspiration + 10, 0, 100); }
  st.flight = s.week;
  meet(s, 'efro');
  emitFact(s, { kind: 'memory', actors: [a.id, famKey31('efro')], place: famCity31(), severity: 15, visibility: 'public', tags: ['family', 'good'], src: 'fam31',
    text: fmtL(l('Efro Fossati leva {a} num voo panorâmico sobre a cidade.', 'Efro Fossati takes {a} on a scenic flight over the city.'), { a: a.name }), diary: true });
  return { ok: true, text: fmtL(l('Voo inesquecível: inspiração +10 para {a}.', 'Unforgettable flight: inspiration +10 for {a}.'), { a: a.name }) };
}

/** Clube de tênis do Efro: lugar para conhecer gente importante (reputação institucional +1, uma vez por ano). */
export function tennisClub31(s: GameState): FamRes31 {
  const e = off(s) ?? busy(s, 'tennis');
  if (e) return e;
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100);
  fam31(s).cd.tennis = s.week + 52;
  meet(s, 'efro');
  return { ok: true, text: l('Uma partida de tênis com o Efro e um aperto de mão com quem decide (reputação institucional +1).', 'A tennis match with Efro and a handshake with the people who decide (institutional reputation +1).') };
}

// ---------------------------------------------------------------- ganchos

registerSimHook('newgame', 'fam31', (s) => { syncFam31(s); ensureEfroViolin31(s); });
registerSimHook('year', 'fam31', (s) => { syncFam31(s); });

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({
  id: 'fam31.metalmac', area: 'items', kind: 'number', min: 0, max: 520, step: 1,
  label: l('Família Fossati: semanas restantes do contrato com a Metalmac', 'Fossati family: weeks left on the Metalmac contract'),
  get: (s) => Math.max(0, (fam31(s).mm ?? 0) - s.week),
  set: (s, v) => { const n = Math.max(0, Math.round(Number(v))); fam31(s).mm = n ? s.week + n : undefined; },
  raw: true,
});
registerRunnable({
  id: 'fam31.sync', area: 'people', label: l('Família Fossati: refazer os papéis pela época', 'Fossati family: redo the roles for the era'),
  run: (s) => { syncFam31(s); return l('Papéis da família conferidos.', 'Family roles checked.'); },
});
registerRunnable({
  id: 'fam31.cooldowns', area: 'people', label: l('Família Fossati: liberar as ações já usadas', 'Fossati family: reset the used actions'),
  run: (s) => { const st = fam31(s); st.cd = {}; st.flight = undefined; return l('Ações da família liberadas.', 'Family actions reset.'); },
  raw: true,
});

// editor de base: a cidade onde a família vive
type FamBase31 = { city?: string };
const famBase = (b: BaseData31 | undefined): FamBase31 | undefined => (b as (BaseData31 & { ext?: Record<string, unknown> }) | undefined)?.ext?.fam31 as FamBase31 | undefined;
registerBaseSection31({
  id: 'fam31', label: l('Família Fossati', 'Fossati family'),
  validate: (b) => { const c = famBase(b)?.city; return c !== undefined && !CITIES.some((x) => x.id === c) ? [fmtL(l('Família Fossati: cidade "{c}" não existe.', 'Fossati family: city "{c}" does not exist.'), { c: String(c) })] : []; },
  apply: (b) => { const c = famBase(b)?.city; FAM_CITY31.id = c && CITIES.some((x) => x.id === c) ? c : 'sao_paulo'; },
});

/** Para a interface: membros que você já conheceu e se a conquista saiu. */
export const famMet31 = (s: GameState): { met: FamId31[]; famiglia: boolean } => ({ met: [...fam31(s).met], famiglia: fam31(s).famiglia !== undefined });
