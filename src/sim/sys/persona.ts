// Persona do jogador (rodada 6; rodada 9: árvore de habilidades e estilo de vida derivado): traços escolhidos,
// gênero favorito, cidade natal, visual, pronome e apelido. Os atributos do dono derivam de origem +
// traços + estilo + visual + pontos livres. Tudo vira perks (src/sim/perks.ts) que mexem na simulação.
// Também: válvulas de escape quando o estresse estoura (CK3 Stress) e herança do ouvido absoluto.

import { clamp, type Rng } from '../../core/rng';
import { cityById, familyOf, genreById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { bumpPerks, perkEntries, registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import type { CharacterSpec, GameState } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { backgroundById, life, playerPerson, type BackgroundId } from './life';
import { ownerOf } from './people/owner';
import { PLAYER_TRAITS, STYLES, playerTraitById, styleById, visualById, type OwnerAttrId, type StyleId } from './persona/data';
import { BRANCHES, BRANCH_OF_STYLE, START_SKILL_POINTS, YEARLY_SKILL_POINTS, autoSkills, canBuySkill, lifestyleById, lifestyleOf, skillById, validStartSkills, type LifestyleId } from './persona/skills';
import { ORIGIN_OF_BACKGROUND, originById, type OriginId } from './identity/data';

export * from './persona/data';
export * from './persona/skills';

export type CopingId = 'drink' | 'overwork' | 'recluse' | 'meditation' | 'shopping';
export const COPING: Record<CopingId, { name: L; desc: L }> = {
  drink: { name: l('Bebida', 'Drinking'), desc: l('−12 de estresse por mês, −1 de saúde por mês. Pode virar escândalo.', '−12 stress a month, −1 health a month. May become a scandal.') },
  overwork: { name: l('Trabalho compulsivo', 'Overwork'), desc: l('+1 tempo livre, −6 de estresse; o(a) parceiro(a) se afasta.', '+1 free time, −6 stress; your partner drifts away.') },
  recluse: { name: l('Recluso', 'Recluse'), desc: l('−10 de estresse, −1 tempo livre, menos carisma com o tempo.', '−10 stress, −1 free time, charisma fades over time.') },
  meditation: { name: l('Meditação', 'Meditation'), desc: l('−8 de estresse por mês, sem efeitos colaterais (custa $80/mês).', '−8 stress a month, no side effects ($80/month).') },
  shopping: { name: l('Compras e luxo', 'Shopping and luxury'), desc: l('−10 de estresse, mas $400/mês saem do seu bolso.', '−10 stress, but $400/month from your pocket.') },
};

export interface PersonaState {
  traits: string[];
  style: StyleId;
  xp: number;
  unlocked: Partial<Record<StyleId, number>>;
  favGenre?: string;
  hometown?: string;
  visual: string;
  nickname?: string;
  pronoun: 'he' | 'she' | 'they';
  motto?: string;
  coping: CopingId[];
  copingPrompt: boolean;
  /** últimos perks desbloqueados (para o diário) */
  history: { week: number; text: L }[];
  /** rodada 9 */
  sex?: 'm' | 'f' | 'x';
  sk?: SkillState;
}

export interface SkillState {
  owned: string[];
  points: number;
  /** total já ganho (criação + anos + marcos + reembolso) */
  earned: number;
  milestones: string[];
  lastYear: number;
  lifestyle: LifestyleId | null;
}

declare module '../ext4' {
  interface Ext4 {
    persona: PersonaState;
  }
}

const fresh = (): PersonaState => ({ traits: [], style: 'mentor', xp: 0, unlocked: {}, visual: 'casual', pronoun: 'they', coping: [], copingPrompt: false, history: [] });
registerExt4('persona', fresh);

export function persona(s: GameState): PersonaState {
  const x = s.x4 as unknown as { persona?: PersonaState };
  x.persona ??= fresh();
  return x.persona;
}

// ---------------------------------------------------------------- atributos derivados

/** Atributos de dono que a ficha de criação gera (usado na prévia e no começo do jogo). */
export function deriveAttrs(spec: CharacterSpec): Record<OwnerAttrId, number> {
  const a: Record<OwnerAttrId, number> = { ear: 40, negotiation: 40, charisma: 40, management: 40 };
  const add = (o?: Partial<Record<OwnerAttrId, number>>) => { for (const [k, v] of Object.entries(o ?? {})) a[k as OwnerAttrId] += v ?? 0; };
  add(backgroundById[spec.background as BackgroundId]?.owner);
  for (const t of spec.traits ?? []) add(playerTraitById[t]?.attrs);
  add(originById[careerOfSpec(spec)]?.attrs);
  for (const id of validStartSkills(spec.skills ?? [])) add(skillById[id]?.attrs);
  add(visualById[spec.visual ?? '']?.attrs);
  add(spec.points);
  for (const k of Object.keys(a) as OwnerAttrId[]) a[k] = clamp(Math.round(a[k]), 10, 95);
  return a;
}

/** Trajetória da ficha: escolhida ou deduzida da base. */
export function careerOfSpec(spec: CharacterSpec): OriginId {
  return spec.career && originById[spec.career as OriginId] ? (spec.career as OriginId) : ORIGIN_OF_BACKGROUND[spec.background as BackgroundId] ?? 'recordStore';
}

export function pointsUsed(spec: CharacterSpec): number {
  return Object.values(spec.points ?? {}).reduce((t, v) => t + Math.max(0, v ?? 0), 0);
}

export function canAddTrait(spec: CharacterSpec, id: string): boolean {
  const cur = spec.traits ?? [];
  if (cur.includes(id)) return true;
  if (cur.length >= 3) return false;
  const d = playerTraitById[id];
  return !cur.some((x) => x === d?.opposite || playerTraitById[x]?.opposite === id);
}

// ---------------------------------------------------------------- começo do jogo

function applyPersona(s: GameState, r: Rng): void {
  const spec = s.config.character;
  const P0 = persona(s);
  const o = ownerOf(s, r);
  if (spec) {
    P0.traits = (spec.traits ?? []).filter((x) => playerTraitById[x]).slice(0, 3);
    P0.style = (styleById[spec.style as StyleId] ? spec.style : 'mentor') as StyleId;
    P0.sex = spec.sex;
    P0.favGenre = spec.favGenre && genreById[spec.favGenre] ? spec.favGenre : undefined;
    P0.hometown = spec.hometown && cityById[spec.hometown] ? spec.hometown : s.config.homeCity;
    P0.visual = visualById[spec.visual ?? ''] ? spec.visual! : 'casual';
    P0.pronoun = spec.pronoun ?? 'they';
    P0.nickname = spec.nickname?.trim().slice(0, 24) || undefined;
    P0.motto = spec.motto?.trim().slice(0, 120) || undefined;
    const attrs = deriveAttrs({ ...spec, background: life(s).background });
    o.attrs = { ...attrs };
    const picked = validStartSkills(spec.skills ?? []);
    const owned = picked.length || spec.skills ? picked : autoSkills(BRANCH_OF_STYLE[P0.style] ?? 'net', START_SKILL_POINTS);
    if (owned !== picked) for (const id of owned) addAttrs(s, skillById[id].attrs);
    initSkills(s, owned, START_SKILL_POINTS - owned.reduce((t, id) => t + skillById[id].cost, 0));
    const car = originById[careerOfSpec({ ...spec, background: life(s).background })];
    if (car?.rep) s.player.reputation.institutional = clamp(s.player.reputation.institutional + car.rep, 0, 100);
  } else {
    // jogos sem ficha (bots, testes, cenários): personalidade sorteada
    const pool = PLAYER_TRAITS.filter((x) => !x.congenital && !x.earned);
    while (P0.traits.length < 2) {
      const t = r.pick(pool);
      if (!P0.traits.includes(t.id) && !P0.traits.some((x) => playerTraitById[x]?.opposite === t.id)) P0.traits.push(t.id);
    }
    const br = r.pick(BRANCHES).id;
    P0.style = (Object.keys(BRANCH_OF_STYLE).find((k) => BRANCH_OF_STYLE[k] === br) ?? 'mentor') as StyleId;
    P0.hometown = s.config.homeCity;
    const owned = autoSkills(br, START_SKILL_POINTS);
    for (const id of owned) addAttrs(s, skillById[id].attrs);
    initSkills(s, owned, START_SKILL_POINTS - owned.reduce((t, id) => t + skillById[id].cost, 0));
  }
  // traços viram traços da pessoa (o temperamento puxa o gênero da própria banda)
  const p = playerPerson(s);
  if (p) {
    const extra = P0.traits.map((t) => playerTraitById[t]?.personTrait).filter((x): x is string => !!x);
    if (extra.length) p.traits = [...new Set([...extra, ...p.traits])].slice(0, 4);
    const car = spec ? originById[careerOfSpec({ ...spec, background: life(s).background })] : undefined;
    for (const sks of [...P0.traits.map((t) => playerTraitById[t]?.skills), car?.skills]) for (const [k, v] of Object.entries(sks ?? {})) {
      const key = k as keyof typeof p.skills;
      p.skills[key] = clamp(p.skills[key] + (v ?? 0), 3, 99);
    }
  }
  // origem mexe no caixa inicial da empresa
  const bg = backgroundById[life(s).background];
  if (bg?.startCash) post(s, 'bg:start', money(s, bg.startCash), bg.startCash > 0 ? 'investment' : 'misc', bg.startCash > 0 ? 'Aporte da família' : 'Começo modesto');
  bumpPerks();
}

registerSimHook('newgame', 'persona', (s, r) => applyPersona(s, r));

// ---------------------------------------------------------------- perks

const famFilter = (ids: string[]) => (_s: GameState, a: { genre: string }) => ids.includes(familyOf(a.genre));

registerPerkSource('persona', (s) => {
  const out: PerkEntry[] = [];
  const P0 = persona(s);
  const L0 = life(s);
  const bg = backgroundById[L0.background];
  if (bg) {
    if (bg.perks) out.push({ label: fmtL(l('Origem: {b}', 'Background: {b}'), { b: bg.name }), values: bg.perks });
    if (bg.families) out.push({ label: fmtL(l('Origem: {b}', 'Background: {b}'), { b: bg.name }), values: bg.families.perks, act: famFilter(bg.families.ids) });
  }
  for (const id of P0.traits) {
    const d = playerTraitById[id];
    if (!d) continue;
    if (d.perks) out.push({ label: fmtL(l('Traço: {t}', 'Trait: {t}'), { t: d.name }), values: d.perks });
    if (d.families) out.push({ label: fmtL(l('Traço: {t}', 'Trait: {t}'), { t: d.name }), values: d.families.perks, act: famFilter(d.families.ids) });
  }
  const S0 = skills(s);
  for (const id of S0.owned) { const d = skillById[id]; if (d && Object.keys(d.values).length) out.push({ label: fmtL(l('Habilidade: {p}', 'Ability: {p}'), { p: d.name }), values: d.values }); }
  const ls = S0.lifestyle ? lifestyleById[S0.lifestyle] : undefined;
  if (ls) out.push({ label: fmtL(l('Estilo de vida: {s}', 'Lifestyle: {s}'), { s: ls.name }), values: ls.values, act: ls.act });
  // trajetórias novas (rodada 9): efeitos declarativos; as antigas seguem em identity.ts
  const org = originById[((s.x4 as unknown as { ident?: { origin?: OriginId } }).ident?.origin ?? '') as OriginId];
  if (org?.perks) out.push({ label: fmtL(l('Trajetória: {o}', 'Background: {o}'), { o: org.name }), values: org.perks });
  if (org?.families) out.push({ label: fmtL(l('Trajetória: {o}', 'Background: {o}'), { o: org.name }), values: org.families.perks, act: famFilter(org.families.ids) });
  if (P0.favGenre && genreById[P0.favGenre]) {
    const fam = familyOf(P0.favGenre);
    out.push({ label: fmtL(l('Gênero do coração: {g}', 'Favourite genre: {g}'), { g: genreById[P0.favGenre].name }), values: { appeal: 0.05, offer: 0.04, songQ: 0.5 }, act: (_s, a) => familyOf(a.genre) === fam });
  }
  if (P0.hometown) {
    const city = P0.hometown;
    out.push({ label: l('Conterrâneo(a)', 'Hometown act'), values: { offer: 0.05, trust: 4 }, act: (_s, a) => a.city === city });
  }
  const vis = visualById[P0.visual];
  if (vis?.families) out.push({ label: fmtL(l('Visual: {v}', 'Look: {v}'), { v: vis.name }), values: { appeal: 0.03, offer: 0.02 }, act: famFilter(vis.families) });
  for (const c of P0.coping) {
    const v: PerkValues = c === 'overwork' ? { energy: 1 } : c === 'recluse' ? { energy: -1 } : {};
    if (Object.keys(v).length) out.push({ label: fmtL(l('Válvula: {c}', 'Coping: {c}'), { c: COPING[c].name }), values: v });
  }
  return out;
});

// ---------------------------------------------------------------- árvore de habilidades (rodada 9)

/** Marcos que valem +1 ponto de habilidade (uma vez cada). */
export const SKILL_MILESTONES: { id: string; name: L; test: (s: GameState) => boolean }[] = [
  { id: 'top10', name: l('Primeiro top 10', 'First top 10'), test: (s) => s.player.stats.top10s >= 1 },
  { id: 'no1', name: l('Primeiro nº 1', 'First number 1'), test: (s) => s.player.stats.number1s >= 1 },
  { id: 'gold', name: l('Primeiro disco de ouro', 'First gold record'), test: (s) => s.player.stats.gold >= 1 },
  { id: 'platinum', name: l('Primeiro disco de platina', 'First platinum record'), test: (s) => s.player.stats.platinum >= 1 },
  { id: 'award', name: l('Primeiro prêmio', 'First award'), test: (s) => s.player.stats.awards >= 1 },
  { id: 'festival', name: l('Primeiro festival', 'First festival'), test: (s) => s.player.stats.festivals >= 1 },
  { id: 'releases10', name: l('10 lançamentos', '10 releases'), test: (s) => s.player.stats.releases >= 10 },
  { id: 'signed5', name: l('5 contratações', '5 signings'), test: (s) => s.player.stats.signed >= 5 },
  { id: 'markets3', name: l('Presença em 3 mercados', 'Present in 3 markets'), test: (s) => s.player.stats.marketsPresent >= 3 },
  { id: 'headline', name: l('Primeira manchete', 'First headline'), test: (s) => s.player.stats.headlines >= 1 },
];

/** Pontos de reembolso por perk antigo (índice 0..5 da árvore de estilo). */
const REFUND = [1, 1, 2, 2, 2, 3];

function initSkills(s: GameState, owned: string[], points: number): SkillState {
  const P0 = persona(s);
  P0.sk = { owned, points, earned: START_SKILL_POINTS, milestones: SKILL_MILESTONES.filter((m) => m.test(s)).map((m) => m.id), lastYear: s.year - 1, lifestyle: lifestyleOf(owned) };
  return P0.sk;
}

/** Estado da árvore; saves antigos convertem os perks de estilo em pontos devolvidos. */
export function skills(s: GameState): SkillState {
  const P0 = persona(s);
  if (P0.sk) return P0.sk;
  const refund = STYLES.reduce((t, st) => t + REFUND.slice(0, P0.unlocked[st.id] ?? 0).reduce((a, b) => a + b, 0), 0);
  P0.unlocked = {};
  P0.xp = 0;
  const st = initSkills(s, [], refund + START_SKILL_POINTS);
  st.earned = refund + START_SKILL_POINTS;
  bumpPerks();
  return st;
}

function addAttrs(s: GameState, a?: Partial<Record<OwnerAttrId, number>>): void {
  if (!a) return;
  const o = ownerOf(s);
  for (const [k, v] of Object.entries(a)) o.attrs[k as OwnerAttrId] = clamp(o.attrs[k as OwnerAttrId] + (v ?? 0), 5, 99);
}

/** Compra uma habilidade. Devolve erro ou null. */
export function buySkill(s: GameState, id: string): L | null {
  const S0 = skills(s);
  const d = skillById[id];
  if (!d) return l('Habilidade desconhecida.', 'Unknown ability.');
  if (S0.owned.includes(id)) return l('Você já tem essa habilidade.', 'You already have that ability.');
  if (!d.req.every((x) => S0.owned.includes(x))) return l('Falta um pré-requisito.', 'A prerequisite is missing.');
  if (!canBuySkill(S0.owned, S0.points, id)) return l('Pontos insuficientes.', 'Not enough points.');
  S0.owned.push(id);
  S0.points -= d.cost;
  addAttrs(s, d.attrs);
  const before = S0.lifestyle;
  S0.lifestyle = lifestyleOf(S0.owned);
  if (S0.lifestyle && S0.lifestyle !== before) {
    const text = fmtL(l('Seu estilo de vida agora é {s}.', 'Your lifestyle is now {s}.'), { s: lifestyleById[S0.lifestyle].name });
    persona(s).history.unshift({ week: s.week, text });
    notify(s, text, 'good');
    remember(s, 'life', fmtL(l('{o} virou {s}.', '{o} became {s}.'), { o: ownerOf(s).name, s: lifestyleById[S0.lifestyle].name }));
  }
  bumpPerks();
  return null;
}

function skillsMonth(s: GameState): void {
  const S0 = skills(s);
  for (const m of SKILL_MILESTONES) {
    if (S0.milestones.includes(m.id) || !m.test(s)) continue;
    S0.milestones.push(m.id);
    S0.points += 1;
    S0.earned += 1;
    notify(s, fmtL(l('Marco: {m}. +1 ponto de habilidade (Você → Habilidades).', 'Milestone: {m}. +1 ability point (You → Abilities).'), { m: m.name }), 'good');
  }
  let hp = S0.lifestyle ? lifestyleById[S0.lifestyle].health ?? 0 : 0;
  for (const id of S0.owned) hp += skillById[id]?.health ?? 0;
  if (hp) { const o = ownerOf(s); o.health = clamp(o.health + hp, 0, 100); }
}

registerSimHook('year', 'persona:skills', (s) => {
  const S0 = skills(s);
  if (S0.lastYear >= s.year) return;
  S0.lastYear = s.year;
  S0.points += YEARLY_SKILL_POINTS;
  S0.earned += YEARLY_SKILL_POINTS;
  notify(s, fmtL(l('+{n} pontos de habilidade com mais um ano de estrada (Você → Habilidades).', '+{n} ability points for another year on the road (You → Abilities).'), { n: YEARLY_SKILL_POINTS }), 'good');
});

registerSimHook('month', 'persona', (s, r) => {
  const P0 = persona(s);
  const o = ownerOf(s);
  skillsMonth(s);
  // renda pessoal (fundo da família, dividendos, frugalidade)
  const w = perkSum(s, 'wealth');
  if (w) o.wealth += money(s, w);
  // moral do elenco
  const m = perkSum(s, 'morale');
  if (m) for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) { const p = s.persons[pid]; if (p?.alive && !p.isPlayer) p.morale = clamp(p.morale + m, 0, 100); }
  // válvulas de escape (CK3): o estresse no limite pede uma saída
  if (o.stress >= 85 && !P0.copingPrompt && P0.coping.length < 3) {
    P0.copingPrompt = true;
    notify(s, l('Seu estresse estourou. Escolha uma válvula de escape na área Você → Personalidade.', 'Your stress boiled over. Choose a coping mechanism in You → Personality.'), 'bad');
  }
  for (const c of P0.coping) {
    if (c === 'drink') { o.stress = clamp(o.stress - 12, 0, 100); o.health = clamp(o.health - 1, 0, 100); if (r.chance(0.02)) { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100); notify(s, l('Fotos suas bêbado(a) numa festa saíram nos jornais.', 'Photos of you drunk at a party made the papers.'), 'bad'); } }
    if (c === 'overwork') { o.stress = clamp(o.stress - 6, 0, 100); const pt = life(s).partner; if (pt) pt.affinity = clamp(pt.affinity - 2, 0, 100); }
    if (c === 'recluse') { o.stress = clamp(o.stress - 10, 0, 100); if (r.chance(0.08)) o.attrs.charisma = Math.max(10, o.attrs.charisma - 1); }
    if (c === 'meditation') { const cost = money(s, 80); if (o.wealth >= cost) { o.wealth -= cost; o.stress = clamp(o.stress - 8, 0, 100); } }
    if (c === 'shopping') { o.wealth -= money(s, 400); o.stress = clamp(o.stress - 10, 0, 100); }
  }
});

registerSimHook('year', 'persona', (s) => {
  const rep = perkSum(s, 'reputation');
  if (rep) s.player.reputation.institutional = clamp(s.player.reputation.institutional + rep, 0, 100);
});

function perkSum(s: GameState, key: 'wealth' | 'morale' | 'reputation'): number {
  // sem ato: só entradas gerais
  let v = 0;
  for (const src of perkEntries(s)) if (!src.act) v += src.values[key] ?? 0;
  return v;
}


export function chooseCoping(s: GameState, id: CopingId): L | null {
  const P0 = persona(s);
  if (!P0.copingPrompt) return l('Nada a escolher agora.', 'Nothing to choose now.');
  if (P0.coping.includes(id)) return l('Você já usa essa válvula.', 'You already use that one.');
  P0.coping.push(id);
  P0.copingPrompt = false;
  const o = ownerOf(s);
  o.stress = clamp(o.stress - 25, 0, 100);
  remember(s, 'life', fmtL(l('{o} passou a lidar com a pressão: {c}.', '{o} started coping with pressure: {c}.'), { o: o.name, c: COPING[id].name }));
  bumpPerks();
  return null;
}

/** Larga uma válvula (custa tempo livre e estresse). */
export function dropCoping(s: GameState, id: CopingId): L | null {
  const P0 = persona(s);
  if (!P0.coping.includes(id)) return null;
  const o = ownerOf(s);
  if (life(s).used >= 3) return l('Largar um hábito pede tempo livre (3).', 'Quitting a habit needs free time (3).');
  life(s).used += 3;
  P0.coping = P0.coping.filter((x) => x !== id);
  o.stress = clamp(o.stress + 15, 0, 100);
  bumpPerks();
  return null;
}

/** Nome de exibição: apelido entre aspas, se houver. */
export function displayName(s: GameState): string {
  const o = ownerOf(s);
  const n = persona(s).nickname;
  return n ? `${o.name} "${n}"` : o.name;
}
