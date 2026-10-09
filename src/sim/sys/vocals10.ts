// Rodada 10 — quem canta? Sem vocalista, uma banda só grava faixas instrumentais (a letra não conta),
// a não ser que a faixa tenha participação (feat.) de alguém que canta ou um cantor de estúdio contratado.
// Vale para o jogador e para os atos do mundo (jazz e eletrônica instrumentais seguem normais).
// Nada aqui sorteia números: as regras não mexem no Rng compartilhado.

import { l, type L } from '../../data/world';
import type { Act, GameState, Person, Song } from '../types';
import { fmtL, money, post } from '../util';
import { songQ } from '../production';
import { grantInstrument, instrumentsOf } from './instruments';

/** Nível mínimo do instrumento "voz" para alguém cantar além do papel principal. */
export const VOICE_MIN = 40;

/** A pessoa canta (papel vocal/MC/voz sintética, voz como instrumento ou voz excepcional)? */
export function sings(s: GameState, p: Person | undefined): boolean {
  if (!p || !p.alive) return false;
  if (p.role === 'vocal' || p.role === 'mc' || p.role === 'synthetic') return true;
  if (p.skills.voice >= 70) return true;
  return instrumentsOf(s, p).some((x) => x.id === 'voice' && x.lvl >= VOICE_MIN);
}

/**
 * Banda do jogador sem ninguém que canta (o personagem tomou o lugar do vocalista ou escolheu outro instrumento):
 * o integrante de melhor voz assume os vocais — quem não é o personagem vira vocalista; sozinho, o próprio
 * personagem passa a cantar além do instrumento. Não sorteia nada.
 */
export function ensureBandVocalist(s: GameState, act: Act | undefined): Person | undefined {
  if (!act || hasSinger(s, act)) return undefined;
  const ms = act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  if (!ms.length) return undefined;
  const others = ms.filter((p) => !p.isPlayer);
  const pick = (others.length ? others : ms).slice().sort((a, b) => b.skills.voice - a.skills.voice)[0];
  if (!pick.isPlayer && pick.role !== 'producer' && pick.role !== 'dj') {
    // o instrumento antigo continua na lista dele; a voz vira o papel principal
    grantInstrument(s, pick, instrumentsOf(s, pick)[0]?.id ?? 'voice', instrumentsOf(s, pick)[0]?.lvl ?? 20);
    pick.role = 'vocal';
  }
  pick.skills.voice = Math.max(pick.skills.voice, Math.round((pick.skills.instr + pick.skills.voice) / 2), 45);
  grantInstrument(s, pick, 'voice', Math.max(VOICE_MIN + 5, pick.skills.voice));
  return pick;
}

/** Integrantes que cantam. */
export function actSingers(s: GameState, act: Act): Person[] {
  return act.members.map((id) => s.persons[id]).filter((p): p is Person => sings(s, p));
}

/** O ato tem alguém que canta? */
export function hasSinger(s: GameState, act: Act | undefined): boolean {
  if (!act) return false;
  if (act.archetype === 'synthetic') return true;
  return act.members.some((id) => sings(s, s.persons[id]));
}

function featuringOf(s: GameState, songId: string): string | undefined {
  const cr = (s.x4 as unknown as { creation?: { songs: Record<string, { featuring?: string }> } }).creation;
  return cr?.songs[songId]?.featuring;
}

/** A faixa tem voz (do ato, do convidado ou de estúdio)? */
export function songHasVoice(s: GameState, song: Song): boolean {
  if (song.sessionVocal || song.aiVoice) return true;
  if (hasSinger(s, s.acts[song.actId])) return true;
  const g = featuringOf(s, song.id);
  return !!g && hasSinger(s, s.acts[g]);
}

/** Atualiza a marca de instrumental de uma faixa ainda não lançada (ao compor, gravar, feat, cantor de estúdio). */
export function settleVocals(s: GameState, song: Song): void {
  if (song.releaseId) return;
  if (songHasVoice(s, song)) delete song.instrumental;
  else song.instrumental = true;
}

/** Custo de um cantor de estúdio (cachê de sessão). */
export const sessionSingerCost = (s: GameState): number => money(s, 900);

/** Contrata um cantor de estúdio para pôr voz numa faixa ainda não lançada. */
export function hireSessionSinger(s: GameState, songId: string): L {
  const song = s.songs[songId];
  if (!song || song.releaseId) return l('A faixa já saiu.', 'The track is already out.');
  if (!song.instrumental) return l('Esta faixa já tem voz.', 'This track already has vocals.');
  const cost = sessionSingerCost(s);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `sessvox:${songId}`, -cost, 'recording', `Cantor de estúdio — ${song.title}`);
  const before = songQ(song);
  song.sessionVocal = true;
  delete song.instrumental;
  // um contratado canta a letra, mas sem a entrega de quem a escreveu
  if (song.recorded) song.performance = Math.max(5, song.performance - 4);
  song.q = Math.max(0, Math.min(100, song.q + songQ(song) - before));
  return fmtL(l('Cantor de estúdio contratado para "{t}" — a letra agora conta.', 'Session singer hired for "{t}" — the lyrics now count.'), { t: song.title });
}

/** Rótulo curto da voz da faixa. */
export function voiceLabel(song: Song): L | null {
  if (song.instrumental) return l('Instrumental', 'Instrumental');
  if (song.sessionVocal) return l('Cantor de estúdio', 'Session singer');
  return null;
}
