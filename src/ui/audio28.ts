// Rodada 28 (F4) — som OPT-IN (decisão do autor: desligado por padrão, liga nas Opções).
//  · a chave "Som" nas Opções liga o motor (src/audio/engine.ts: setAudioOptIn28) — sem ela nada toca, nem prévia;
//  · prévia no "Ouvir" (menu de contexto das músicas/lançamentos e demo na descoberta de talentos);
//  · vinhetas de 0,5–1 s nos marcos (cenas de nº 1, prêmio, primeiro hit, fim de capítulo, fim de partida), com o filtro
//    da era do ano do jogo (gramofone, AM, FM, digital, neural). Nada disso mexe na simulação.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { audioAvailable, nowPlaying, play, setAudioOptIn28 } from '../audio/engine';
import { buildActDemoSpec } from '../audio/spec';
import { stingForScene28, stingerSpec28, type StingKind28 } from '../audio/stinger28';
import { familyOf } from '../data/world';
import type { GameState } from '../sim/types';
import { h } from './dom';
import { ON_SCENE_SHOW28 } from './registry';
import { savePrefs, store } from './store';

export const audioOn28 = (): boolean => !!store.prefs.audio28;

/** Sincroniza o motor com a preferência (chamado ao carregar e ao mudar a chave). */
export function syncAudio28(): void { setAudioOptIn28(audioOn28()); }
syncAudio28();

/** Linha da chave para o painel de Opções. */
export function settingsAudio28(): HTMLElement {
  const ok = audioAvailable();
  return h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: audioOn28(), disabled: !ok, onchange: (e: Event) => { store.prefs.audio28 = (e.target as HTMLInputElement).checked; savePrefs(); syncAudio28(); } }),
    ' ', t(l('Som (prévias no "Ouvir" e vinhetas curtas nos marcos)', 'Sound (previews on "Listen" and short stingers on milestones)')),
    ok ? null : h('small', { class: 'muted' }, ' — ', t(l('indisponível neste navegador', 'unavailable in this browser'))));
}

/** Vinheta de um marco (não interrompe uma prévia que esteja tocando). */
export function sting28(kind: StingKind28, s: GameState, seed = ''): boolean {
  if (!audioOn28() || nowPlaying()) return false;
  const act = Object.values(s.acts).find((a) => a.owner === 'player' || (a as { playerBand?: boolean }).playerBand);
  return !!play(stingerSpec28(kind, s.year, act ? familyOf(act.genre) : 'pop', seed || s.signature), { volume: 0.55 });
}

/** Prévia da demo de um artista (botão "Ouvir" da descoberta), só com o som ligado. */
export function listenDemo28(s: GameState, actId: string): boolean {
  if (!audioOn28()) return false;
  const a = s.acts[actId];
  return !!(a && play(buildActDemoSpec(s, a), { volume: 0.7 }));
}

ON_SCENE_SHOW28.push((s, cs) => {
  if (!audioOn28()) return;
  const key = (cs.data as { d?: { key?: string } }).d?.key;
  const k = stingForScene28(cs.kind, key);
  if (k) sting28(k, s, cs.id);
});
