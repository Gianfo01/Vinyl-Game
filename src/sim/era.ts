// Novidades de época (rodada 9): registro genérico de recursos que surgem numa data histórica e precisam
// ser DESBLOQUEADOS (comprados) antes do uso. Os anos acompanham s.techDates (modos livre/caos deslocam datas).

import { l, type L } from '../data/world';
import { registerExt4, registerSimHook } from './ext4';
import type { GameState } from './types';
import { fmtL, money, notify, post } from './util';

export interface EraFeature { id: string; year: number; cost: number; label: L; tech?: string; blurb?: L }
interface EraState { unlocked: Record<string, number>; seeded: boolean; announced: Record<string, boolean> }

declare module './ext4' { interface Ext4 { era9: EraState } }
registerExt4('era9', () => ({ unlocked: {}, seeded: false, announced: {} }));

const FEATURES: EraFeature[] = [];
/** Registra uma novidade: id, ano histórico, custo de desbloqueio (dólares reais) e nome. `tech` liga ao ano real do mundo. */
export function eraFeature(id: string, year: number, unlockCost: number, label: L, tech?: string, blurb?: L): EraFeature {
  const f: EraFeature = { id, year, cost: unlockCost, label, tech, blurb };
  const i = FEATURES.findIndex((x) => x.id === id);
  if (i >= 0) FEATURES[i] = f; else FEATURES.push(f);
  return f;
}
export const eraFeatures = (): readonly EraFeature[] => FEATURES;

const st = (s: GameState): EraState => {
  const x = s.x4 as unknown as { era9?: EraState };
  x.era9 ??= { unlocked: {}, seeded: false, announced: {} };
  x.era9.unlocked ??= {};
  x.era9.announced ??= {};
  return x.era9;
};

export const featureYear = (s: GameState, f: EraFeature): number => (f.tech ? s.techDates[f.tech] ?? f.year : f.year);

/** Na primeira consulta, o que já existia na época (ou num save antigo) vem desbloqueado. */
function seed(s: GameState): void {
  const e = st(s);
  if (e.seeded) return;
  e.seeded = true;
  for (const f of FEATURES) if (featureYear(s, f) <= s.year) { e.unlocked[f.id] = s.year; e.announced[f.id] = true; }
}

export function isUnlocked(s: GameState, id: string): boolean {
  seed(s);
  const f = FEATURES.find((x) => x.id === id);
  if (!f) return true;
  return featureYear(s, f) <= s.year && st(s).unlocked[id] !== undefined;
}

export const unlockCost = (s: GameState, f: EraFeature): number => money(s, f.cost);

/** Novidades que já existem no mundo mas ainda não foram compradas. */
export function pendingFeatures(s: GameState): EraFeature[] {
  seed(s);
  return FEATURES.filter((f) => featureYear(s, f) <= s.year && st(s).unlocked[f.id] === undefined);
}

export function unlockFeature(s: GameState, id: string): L | null {
  seed(s);
  const f = FEATURES.find((x) => x.id === id);
  if (!f) return l('Novidade desconhecida.', 'Unknown novelty.');
  if (featureYear(s, f) > s.year) return l('Ainda não existe.', 'Does not exist yet.');
  if (st(s).unlocked[id] !== undefined) return l('Já desbloqueado.', 'Already unlocked.');
  const c = unlockCost(s, f);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `era:${id}`, -c, 'misc', f.label.pt);
  st(s).unlocked[id] = s.year;
  return null;
}

registerSimHook('month', 'era9', (s) => {
  seed(s);
  const e = st(s);
  for (const f of FEATURES) {
    if (featureYear(s, f) <= s.year && !e.announced[f.id]) {
      e.announced[f.id] = true;
      notify(s, fmtL(l('Novidade disponível: {f}. Desbloqueie em Mídia.', 'New: {f} is available. Unlock it under Media.'), { f: f.label }), 'event');
    }
  }
});

eraFeature('music_video', 1981, 25000, l('Clipes (equipe de vídeo)', 'Music videos (video crew)'), 'clipnet', l('Equipamento e equipe para produzir clipes.', 'Gear and crew to produce music videos.'));
eraFeature('web_forums', 1995, 3000, l('Sites e fóruns (presença online)', 'Websites and forums (online presence)'), 'internet');
eraFeature('playlists', 2008, 8000, l('Playlists (relacionamento com curadores)', 'Playlists (curator relations)'), 'streaming');
eraFeature('social', 2008, 6000, l('Redes sociais (equipe de conteúdo)', 'Social media (content team)'), 'streaming');
eraFeature('short_clips', 2018, 8000, l('Vídeos curtos e creators', 'Short video and creators'), 'short_video');
eraFeature('neural_feed', 2030, 20000, l('Feeds personalizados', 'Personalized feeds'), 'synthetic_voice');
