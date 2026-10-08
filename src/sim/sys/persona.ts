// Persona do jogador (rodada 6): traços escolhidos, estilo de vida com árvore de perks (Crusader Kings),
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
import { PLAYER_TRAITS, STYLES, perkCost, playerTraitById, styleById, visualById, type OwnerAttrId, type StyleId } from './persona/data';

export * from './persona/data';

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
  add(styleById[spec.style as StyleId]?.attrs);
  add(visualById[spec.visual ?? '']?.attrs);
  add(spec.points);
  for (const k of Object.keys(a) as OwnerAttrId[]) a[k] = clamp(Math.round(a[k]), 10, 95);
  return a;
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
    P0.favGenre = spec.favGenre && genreById[spec.favGenre] ? spec.favGenre : undefined;
    P0.hometown = spec.hometown && cityById[spec.hometown] ? spec.hometown : s.config.homeCity;
    P0.visual = visualById[spec.visual ?? ''] ? spec.visual! : 'casual';
    P0.pronoun = spec.pronoun ?? 'they';
    P0.nickname = spec.nickname?.trim().slice(0, 24) || undefined;
    P0.motto = spec.motto?.trim().slice(0, 120) || undefined;
    const attrs = deriveAttrs({ ...spec, background: life(s).background });
    o.attrs = { ...attrs };
  } else {
    // jogos sem ficha (bots, testes, cenários): personalidade sorteada
    const pool = PLAYER_TRAITS.filter((x) => !x.congenital && !x.earned);
    while (P0.traits.length < 2) {
      const t = r.pick(pool);
      if (!P0.traits.includes(t.id) && !P0.traits.some((x) => playerTraitById[x]?.opposite === t.id)) P0.traits.push(t.id);
    }
    P0.style = r.pick(STYLES).id;
    P0.hometown = s.config.homeCity;
  }
  // traços viram traços da pessoa (o temperamento puxa o gênero da própria banda)
  const p = playerPerson(s);
  if (p) {
    const extra = P0.traits.map((t) => playerTraitById[t]?.personTrait).filter((x): x is string => !!x);
    if (extra.length) p.traits = [...new Set([...extra, ...p.traits])].slice(0, 4);
    for (const t of P0.traits) for (const [k, v] of Object.entries(playerTraitById[t]?.skills ?? {})) {
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
  for (const st of STYLES) {
    const n = P0.unlocked[st.id] ?? 0;
    for (let i = 0; i < n; i++) out.push({ label: fmtL(l('{s}: {p}', '{s}: {p}'), { s: st.name, p: st.perks[i].name }), values: st.perks[i].values });
  }
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

// ---------------------------------------------------------------- estilo de vida

export function styleProgress(s: GameState): { style: StyleId; n: number; xp: number; cost: number; done: boolean } {
  const P0 = persona(s);
  const n = P0.unlocked[P0.style] ?? 0;
  const done = n >= styleById[P0.style].perks.length;
  return { style: P0.style, n, xp: P0.xp, cost: done ? 0 : perkCost(n), done };
}

/** Troca o foco do estilo de vida: perks já ganhos ficam; o progresso do próximo zera. */
export function setFocus(s: GameState, style: StyleId): L | null {
  const P0 = persona(s);
  if (!styleById[style]) return l('Estilo desconhecido.', 'Unknown style.');
  if (P0.style === style) return null;
  P0.style = style;
  P0.xp = 0;
  bumpPerks();
  return null;
}

function styleXpBonus(s: GameState): number {
  const P0 = persona(s);
  const L0 = life(s);
  switch (P0.style) {
    case 'mentor': return playerActs(s).length * 6;
    case 'mogul': return s.player.cash > 0 ? Math.min(40, Math.log10(Math.max(10, s.player.cash / 100)) * 6) : 0;
    case 'hitmaker': return Math.min(60, s.player.stats.top10s * 4 + Object.values(s.releases).filter((r) => r.owner === 'player' && s.week - r.week < 5).length * 20);
    case 'curator': return Object.keys(s.knowledge).length;
    case 'showman': return L0.stats.gigs > 0 ? 10 : 0;
    case 'schemer': return 10;
  }
}

registerSimHook('month', 'persona', (s, r) => {
  const P0 = persona(s);
  const o = ownerOf(s);
  // estilo de vida: XP mensal + bônus do que você fez
  const prog = styleProgress(s);
  if (!prog.done) {
    P0.xp += 100 + styleXpBonus(s) + (o.attrs.management - 50) / 2;
    if (P0.xp >= prog.cost) {
      P0.xp -= prog.cost;
      P0.unlocked[P0.style] = prog.n + 1;
      const pk = styleById[P0.style].perks[prog.n];
      const text = fmtL(l('Novo perk de {s}: {p} — {d}', 'New {s} perk: {p} — {d}'), { s: styleById[P0.style].name, p: pk.name, d: pk.desc });
      P0.history.unshift({ week: s.week, text });
      if (P0.history.length > 20) P0.history.length = 20;
      notify(s, text, 'good');
      if (prog.n + 1 === styleById[P0.style].perks.length) remember(s, 'life', fmtL(l('{o} dominou o estilo {s}.', '{o} mastered the {s} style.'), { o: o.name, s: styleById[P0.style].name }), { important: true });
      bumpPerks();
    }
  }
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
