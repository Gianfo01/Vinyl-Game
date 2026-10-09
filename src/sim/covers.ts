// Capas (rodada 8): ao programar um lançamento o jogador escolhe entre três propostas de capa, cada
// uma com um estilo que tem custo e consequência: retrato vende o rosto do artista, arte conceitual
// agrada a crítica, a provocativa gera barulho e pode ser censurada, a da cena local fortalece a cidade…

import { Rng, clamp, hashString } from '../core/rng';
import { familyOf, l, type L } from '../data/world';
import { registerSimHook } from './ext4';
import type { GameState, Release } from './types';
import { fmtL, money, notify, remember } from './util';

export type CoverStyle = 'portrait' | 'concept' | 'provocative' | 'minimal' | 'illustrated' | 'scene' | 'diy';

export interface CoverDef { id: CoverStyle; name: L; effect: L; cost: number; from?: number }

export const COVER_STYLES: CoverDef[] = [
  { id: 'portrait', name: l('Retrato do artista', 'Artist portrait'), effect: l('Vende o rosto: mais apelo para quem já é conhecido (e imagem comercial).', 'Sells the face: more appeal for known acts (and commercial image).'), cost: 600 },
  { id: 'concept', name: l('Arte conceitual', 'Concept art'), effect: l('A crítica gosta (+notas) e a imagem artística sobe; apelo popular um pouco menor.', 'Critics like it (+scores) and artistic image rises; slightly less mass appeal.'), cost: 1400 },
  { id: 'provocative', name: l('Provocativa', 'Provocative'), effect: l('Barulho e curiosidade (+apelo), mas pode ser censurada em mercados conservadores e virar escândalo.', 'Noise and curiosity (+appeal), but may be censored in conservative markets and become a scandal.'), cost: 900 },
  { id: 'minimal', name: l('Minimalista', 'Minimalist'), effect: l('Elegante e duradoura: catálogo envelhece melhor e a crítica respeita.', 'Elegant and lasting: catalog ages better and critics respect it.'), cost: 700, from: 1966 },
  { id: 'illustrated', name: l('Ilustrada / psicodélica', 'Illustrated / psychedelic'), effect: l('Colecionadores amam: vende mais em formato físico e combina com rock e eletrônica.', 'Collectors love it: more physical sales; fits rock and electronic.'), cost: 1100, from: 1965 },
  { id: 'scene', name: l('Foto da cena local', 'Local scene photo'), effect: l('Abraça a cidade: fortalece a cena e o público local; menos alcance fora.', 'Embraces the city: boosts the scene and local fans; less reach abroad.'), cost: 500 },
  { id: 'diy', name: l('Faça-você-mesmo', 'DIY'), effect: l('De graça e autêntica: fãs fiéis gostam, mas o grande público nota o amadorismo.', 'Free and authentic: core fans like it, the mass market notices the amateurism.'), cost: 0 },
];
export const coverById = Object.fromEntries(COVER_STYLES.map((c) => [c.id, c])) as Record<CoverStyle, CoverDef>;

export interface CoverOption { style: CoverStyle; seed: number }

/** Três propostas de capa (determinísticas por ato, semana e "rodada" de propostas). */
export function coverOptions(s: GameState, actId: string, round = 0): CoverOption[] {
  const r = Rng.fromSeed(`cover:${actId}:${s.week}:${round}`);
  const pool = COVER_STYLES.filter((c) => !c.from || s.year >= c.from);
  const picks = r.shuffle([...pool]).slice(0, 3);
  return picks.map((c) => ({ style: c.id, seed: r.int(1, 2 ** 30) }));
}

export const coverCost = (s: GameState, style?: string): number => (style && coverById[style as CoverStyle] ? money(s, coverById[style as CoverStyle].cost) : 0);

/** Ajuste nas notas da crítica (somado a cada resenha, escala 0–10). */
export function coverCriticBonus(rel: Release): number {
  switch (rel.coverChoice) {
    case 'concept': return 0.5;
    case 'minimal': return 0.3;
    case 'diy': return -0.2;
    case 'provocative': return (hashString(rel.id) % 3) - 1 > 0 ? 0.3 : -0.3;
    default: return 0;
  }
}

function applyCover(s: GameState, r: Rng, rel: Release): void {
  const act = s.acts[rel.actId];
  if (!act || !rel.coverChoice) return;
  const img = act.image;
  const fam = familyOf(act.genre);
  let mult = 1;
  switch (rel.coverChoice as CoverStyle) {
    case 'portrait':
      mult = 1.02 + Math.min(0.08, act.fame / 900);
      if (img) img.popularity = clamp(img.popularity + 2, 0, 100);
      break;
    case 'concept':
      mult = 0.97;
      if (img) img.artistic = clamp(img.artistic + 4, 0, 100);
      s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
      break;
    case 'minimal':
      mult = s.year >= 2000 ? 1.03 : 1;
      if (img) img.artistic = clamp(img.artistic + 2, 0, 100);
      break;
    case 'illustrated':
      mult = fam === 'rock' || fam === 'electronic' ? 1.07 : 1.01;
      if (rel.formats.some((f) => f === 'lp' || f === 'cd' || f === 'cassette')) mult += 0.03;
      break;
    case 'scene':
      mult = 0.98;
      s.scenes[`${act.city}:${act.genre}`] = (s.scenes[`${act.city}:${act.genre}`] ?? 0) + 2;
      act.fans.core = Math.round(act.fans.core * 1.03 + 5);
      break;
    case 'diy':
      mult = act.fame < 15 ? 1 : 0.94;
      act.fans.core = Math.round(act.fans.core * 1.02 + 3);
      break;
    case 'provocative': {
      mult = 1.12;
      act.momentum = clamp(act.momentum + 6, 0, 100);
      // quanto mais antiga a era, maior o risco de censura
      const risk = s.year < 1965 ? 0.55 : s.year < 1990 ? 0.35 : 0.2;
      if (r.chance(risk)) {
        const conservative = rel.territories.filter((m) => m === 'asia' || m === 'africa' || (s.year < 1990 && (m === 'latam' || m === 'br')));
        if (conservative.length) rel.territories = rel.territories.filter((m) => !conservative.includes(m)) as Release['territories'];
        if (!rel.territories.length) rel.territories = ['na'];
        mult *= 0.92;
        if (img) img.publicImage = clamp(img.publicImage - 6, 0, 100);
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
        const msg = fmtL(l('A capa de "{t}" foi censurada{m} e virou escândalo — mas todo mundo está falando do disco.', 'The cover of "{t}" was censored{m} and became a scandal — but everyone is talking about the record.'), { t: rel.title, m: conservative.length ? ` (${conservative.join(', ').toUpperCase()})` : '' });
        if (rel.owner === 'player' || act.playerBand) notify(s, msg, 'bad');
        remember(s, 'cover_scandal', msg, { actId: act.id, important: rel.owner === 'player' });
      }
      break;
    }
  }
  rel.appeal *= mult;
  if (rel.autopsy && mult !== 1) rel.autopsy.push({ key: 'cover', label: fmtL(l('Capa: {c}', 'Cover: {c}'), { c: coverById[rel.coverChoice as CoverStyle]?.name ?? l('?') }), value: mult, confidence: 'medium' });
}

registerSimHook('launch', 'covers', (s, r, a) => { if (a.release) applyCover(s, r, a.release); });
