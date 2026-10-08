// Sala de composição (aba em Criação): as músicas do ato com os mini-jogos disponíveis para cada
// uma, o foco por etapa da próxima sessão, o estúdio (pistas e equipamentos lendários) e a jam.

import { buildSongSpec } from '../../../audio/spec';
import { familyOf, l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  FOCUS_IDEAL, GEAR, STAGES, TRACK_LABEL, autoArrange, autoBeat, autoChords, autoLyrics, autoMelody, applyArrange, applyBeat, applyChords, applyLyrics, applyMelody,
  autoMix, applyMix, autoTake, beatReady, buyGear, crateRecords, eraLimits, focusFit, gearAvailable, gearById, jamReady, ms, normalizeFocus, pendingTake, setFocus, trackLimit,
  type SongComp, type Stage,
} from '../../../sim/sys/music';
import { songStatus } from '../../../sim/repertoire';
import type { GameState, Song } from '../../../sim/types';
import { money, rngOf } from '../../../sim/util';
import { $, pill, rerender, section, toast } from '../../common';
import { h } from '../../dom';
import { openScene } from '../../registry';
import { store } from '../../store';
import { chips, ic, stat } from '../../vis';
import { deltaText, isAuto, playBtn } from './common';
import { openArrange, openChords, openLyrics, openMelody } from './compose';
import { openJam } from './extras';
import { openBeat, openDig, openMaster, openMix, openTake } from './studio';

interface GameDef { id: keyof SongComp; name: L; icon: string; when: (s: GameState, so: Song) => boolean; open: (s: GameState, so: Song) => void }

const written = (s: GameState, so: Song) => !so.recorded && !so.releaseId;
const editable = (s: GameState, so: Song) => !so.releaseId;

export const GAMES: GameDef[] = [
  { id: 'chords', name: l('Escada de acordes', 'Chord ladder'), icon: 'note', when: written, open: openChords },
  { id: 'melody', name: l('Contorno da melodia', 'Melody contour'), icon: 'pen', when: written, open: openMelody },
  { id: 'lyrics', name: l('Ímãs de geladeira', 'Fridge magnets'), icon: 'bulb', when: written, open: openLyrics },
  { id: 'arrange', name: l('Arranjo', 'Arrangement'), icon: 'calendar', when: written, open: openArrange },
  { id: 'beat', name: l('Sequenciador', 'Sequencer'), icon: 'drums', when: (s, so) => editable(s, so) && beatReady(s), open: openBeat },
  { id: 'dig', name: l('Garimpo de discos', 'Crate digging'), icon: 'disc', when: (s, so) => written(s, so) && !so.sampleOf, open: openDig },
  { id: 'take', name: l('Take no tempo', 'Timing take'), icon: 'mic', when: (s, so) => (!so.recorded && !so.releaseId) || !!pendingTake(s, so.id), open: openTake },
  { id: 'mix', name: l('Mesa de mixagem', 'Mixing desk'), icon: 'radio', when: editable, open: openMix },
  { id: 'master', name: l('Masterização', 'Mastering'), icon: 'cd', when: (s, so) => so.recorded && !so.releaseId, open: openMaster },
];

function scoreOf(rec: SongComp | undefined, id: keyof SongComp): number | undefined {
  const v = rec?.[id] as { score?: number; brk?: number } | undefined;
  return v ? v.score ?? v.brk : undefined;
}

/** Resolve automaticamente todos os mini-jogos possíveis de uma música. */
export function autoAll(s: GameState, so: Song): number {
  const r = rngOf(s);
  let n = 0;
  const rec = ms(s).songs[so.id];
  if (written(s, so)) {
    if (!rec?.chords) { const a = autoChords(s, r, so); applyChords(s, so.id, a.verse, a.chorus); n++; }
    if (!rec?.melody) { applyMelody(s, so.id, autoMelody(s, r, so)); n++; }
    if (!rec?.lyrics) { const a = autoLyrics(s, r, so); applyLyrics(s, so.id, a.lines, a.scheme); n++; }
    if (!rec?.arrange) { const a = autoArrange(s, r, so); applyArrange(s, so.id, a.blocks, a.lanes); n++; }
    if (!rec?.take) { autoTake(s, r, so.id); n++; }
  }
  if (editable(s, so)) {
    if (beatReady(s) && !ms(s).songs[so.id]?.beat && ['hiphop', 'electronic', 'rnb', 'pop', 'brazil', 'caribbean', 'latin', 'africa'].includes(familyOf(so.genre))) { applyBeat(s, so.id, autoBeat(s, r, so)); n++; }
    if (!ms(s).songs[so.id]?.mix) { const a = autoMix(s, r, so); applyMix(s, so.id, a.faders, a.eq); n++; }
  }
  return n;
}

/** Painel de mini-jogos de uma música (aberto pelo Repertório ou pela Sala de composição). */
export function openSongGames(s: GameState, so: Song): void {
  openScene(l(`Compor: ${so.title}`, `Write: ${so.title}`), (close) => songGamesBody(s, so, close), { onClose: () => rerender() });
}

function songGamesBody(s: GameState, so: Song, close: () => void): HTMLElement {
  const rec = ms(s).songs[so.id];
  const list = GAMES.filter((g) => g.when(s, so));
  return h('div', { class: 'mu-games' },
    h('div', { class: 'row wrap' }, playBtn(() => buildSongSpec(s, so), { label: l('Ouvir a música', 'Listen to the song'), small: false }), songBars(so)),
    list.length ? h('div', { class: 'mu-game-list' }, list.map((g) => {
      const sc = scoreOf(rec, g.id);
      return h('button', { class: `tile mu-gtile ${sc !== undefined ? 'done' : ''}`, onclick: () => { close(); g.open(s, so); } },
        h('div', { class: 'tile-ic' }, ic(g.icon, 2)),
        h('div', { class: 'tile-body' }, h('b', null, t(g.name)), sc !== undefined ? pill(`${Math.round(sc)}/100`, sc >= 60 ? 'good' : '') : h('small', { class: 'muted' }, t(l('ainda não jogado', 'not played yet')))));
    })) : h('p', { class: 'muted' }, t(l('Nenhum mini-jogo disponível para esta música agora.', 'No mini-game available for this song right now.'))),
    rec ? h('p', { class: 'small muted' }, t(l('Bônus somados (limite ±10 por atributo): ', 'Bonuses added (limit ±10 per attribute): ')), deltaText(rec.applied)) : null,
    h('button', { class: 'btn ghost', onclick: () => { const n = autoAll(s, so); toast(t(l('{n} mini-jogo(s) resolvido(s) automaticamente.', '{n} mini-game(s) auto-resolved.'), { n }), 'good'); close(); } }, ic('sparkle'), ' ', t(l('Resolver tudo automático', 'Auto-resolve everything'))),
  );
}

function songBars(so: Song): HTMLElement {
  return chips(stat('note', Math.round(so.melody), l('Melodia', 'Melody')), stat('pen', Math.round(so.lyrics), l('Letra', 'Lyrics')), stat('sparkle', Math.round(so.originality), l('Originalidade', 'Originality')),
    so.recorded ? stat('mic', Math.round(so.performance), l('Performance', 'Performance')) : null, so.recorded ? stat('radio', Math.round(so.production), l('Produção', 'Production')) : null,
    stat('star', Math.round(so.q), l('Qualidade Q', 'Quality Q')));
}

/** Botão rápido "Compor com mini-jogos" (Repertório). */
export function composeBtn(s: GameState, so: Song): HTMLElement | null {
  if (so.releaseId || songStatus(s, so) === 'discarded') return null;
  const auto = isAuto();
  return h('button', { class: 'btn small', title: t(auto ? l('Mini-jogos em modo automático', 'Mini-games in auto mode') : l('Acordes, melodia, letra, arranjo, batida, mixagem…', 'Chords, melody, lyrics, arrangement, beat, mix…')), onclick: () => {
    if (auto) { const n = autoAll(s, so); toast(t(l('{n} mini-jogo(s) resolvido(s) automaticamente.', '{n} mini-game(s) auto-resolved.'), { n }), 'good'); rerender(); return; }
    openSongGames(s, so);
  } }, ic('note'), ' ', t(so.recorded ? l('Estúdio com mini-jogos', 'Studio mini-games') : l('Compor com mini-jogos', 'Write with mini-games')));
}

// ------------------------------------------------------------------ aba

export function roomTab(s: GameState): HTMLElement {
  const a = s.acts[store.selectedAct ?? ''];
  if (!a) return h('p', null, '—');
  const songs = a.songs.map((id) => s.songs[id]).filter((so): so is Song => !!so && !so.releaseId && songStatus(s, so) !== 'discarded' && !so.vault).sort((x, y) => y.createdWeek - x.createdWeek).slice(0, 24);
  const m = ms(s);
  return h('div', { class: 'mu-room' },
    section(t(l('Sala de composição — {a}', 'Writing room — {a}'), { a: a.name }),
      h('p', { class: 'muted small' }, t(l('Cada música soa diferente: ouça, componha com os mini-jogos e veja os atributos mudarem. Jogar bem dá bônus limitado; o automático usa os atributos da equipe.', 'Every song sounds different: listen, write with the mini-games and watch the attributes change. Playing well gives a limited bonus; auto uses the team\'s attributes.'))),
      songs.length ? h('div', { class: 'mu-songs' }, songs.map((so) => {
        const rec = m.songs[so.id];
        const done = GAMES.filter((g) => scoreOf(rec, g.id) !== undefined);
        return h('article', { class: `mu-song ${so.recorded ? 'rec' : ''}` },
          h('div', { class: 'row wrap', style: 'justify-content:space-between' },
            h('span', { class: 'row', style: 'gap:6px' }, ic(so.recorded ? 'disc' : 'note'), h('b', null, so.title), pill(so.recorded ? t(l('gravada', 'recorded')) : t(l('escrita', 'written')), so.recorded ? 'good' : '')),
            h('span', { class: 'row', style: 'gap:6px' }, playBtn(() => buildSongSpec(s, so)), composeBtn(s, so))),
          songBars(so),
          done.length ? h('div', { class: 'row wrap' }, done.map((g) => pill(`${t(g.name)} ${Math.round(scoreOf(rec, g.id)!)}`))) : null,
          pendingTake(s, so.id) ? h('p', { class: 'small' }, ic('mic'), ' ', t(l('Take aguardando decisão: ', 'Take awaiting a decision: ')), h('button', { class: 'btn small primary', onclick: () => openTake(s, so) }, t(l('Jogar o take no tempo', 'Play the timing take')))) : null,
        );
      })) : h('p', { class: 'muted small' }, t(l('Nenhuma música em andamento. Coloque "Compor" na agenda.', 'No songs in progress. Add "Write songs" to the agenda.'))),
    ),
    focusSection(s, a.id),
    studioSection(s),
    a.members.length >= 2 ? section(t(l('Jam da banda', 'Band jam')),
      h('p', { class: 'muted small' }, t(l('Cartas de cada membro na mesa: química alta destrava combos, egos grandes brigam pelo espaço. Gera ideias para o caderno (uma jam por mês).', 'Each member\'s cards on the table: high chemistry unlocks combos, big egos fight for space. Generates notebook ideas (one jam a month).'))),
      h('button', { class: 'btn', disabled: !jamReady(s, a.id), onclick: () => openJam(s, a.id) }, ic('guitar'), ' ', t(jamReady(s, a.id) ? l('Chamar a banda para uma jam', 'Call the band for a jam') : l('Jam deste mês já feita', 'This month\'s jam is done')))) : null,
  );
}

const focusDraft: Record<string, Record<Stage, number>> = {};

function focusSection(s: GameState, actId: string): HTMLElement {
  const fam = familyOf(s.acts[actId].genre);
  const cur = ms(s).focus[actId];
  const d = (focusDraft[actId] ??= cur ? { ...cur } : { comp: 25, arr: 25, rec: 25, mix: 25 });
  const learn = ms(s).focusLearn[fam];
  const keys = Object.keys(STAGES) as Stage[];
  const top = (Object.entries(FOCUS_IDEAL[fam]) as [Stage, number][]).sort((x, y) => y[1] - x[1])[0][0];
  const norm = normalizeFocus(d);
  const box = h('div', { class: 'mu-focus' }, keys.map((k) => h('label', null, h('span', null, t(STAGES[k])), h('input', { type: 'range', min: 0, max: 100, value: d[k], 'aria-label': t(STAGES[k]), oninput: (e: Event) => { d[k] = Number((e.target as HTMLInputElement).value); const n = normalizeFocus(d); box.querySelectorAll('output').forEach((o, i) => { o.textContent = `${n[keys[i]]}%`; }); } }), h('output', null, `${norm[k]}%`))));
  return section(t(l('Foco por etapa (próxima gravação)', 'Stage focus (next recording)')),
    h('p', { class: 'muted small' }, t(l('Divida o tempo do estúdio entre composição, arranjo, gravação e mixagem. Cada gênero tem uma distribuição ideal — você a descobre gravando.', 'Split studio time between songwriting, arrangement, recording and mixing. Each genre has an ideal split — you discover it by recording.'))),
    box,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small primary', onclick: () => { setFocus(s, actId, d); toast(t(l('Foco salvo para as próximas gravações.', 'Focus saved for the next recordings.')), 'good'); rerender(); } }, t(l('Salvar foco', 'Save focus'))),
      cur ? pill(`${t(l('Atual', 'Current'))}: ${keys.map((k) => `${t(STAGES[k]).slice(0, 4)} ${cur[k]}%`).join(' · ')}`) : pill(t(l('sem foco definido (neutro)', 'no focus set (neutral)'))),
      learn ? pill(`${t(l('Melhor encaixe', 'Best fit'))}: ${Math.round(learn.best * 100)}% · ${t(l('último', 'last'))} ${Math.round(learn.last * 100)}% · ${learn.tries}×`, learn.best > 0.8 ? 'good' : '') : null,
      learn && learn.tries >= 3 ? pill(`${t(l('Aprendido: o gênero pede mais', 'Learned: the genre wants more'))} ${t(STAGES[top]).toLowerCase()}`, 'good') : null,
      cur ? pill(`${t(l('Previsão', 'Forecast'))} ~${learn && learn.tries >= 2 ? Math.round(focusFit(fam, cur) * 100) + '%' : '?'}`) : null,
    ));
}

function studioSection(s: GameState): HTMLElement {
  const m = ms(s);
  const tracks = trackLimit(s);
  const lim = eraLimits(s);
  const avail = gearAvailable(s);
  return section(t(l('Estúdio: pistas e equipamentos lendários', 'Studio: tracks and legendary gear')),
    chips(stat('mic', TRACK_LABEL(tracks), l('Pistas por gravação nesta era', 'Tracks per recording in this era')), stat('clock', `${Math.floor(lim.maxSeconds / 60)}:${String(lim.maxSeconds % 60).padStart(2, '0')}`, l('Duração máxima da faixa', 'Maximum track length'))),
    h('p', { class: 'muted small' }, t(lim.note)),
    m.gear.length ? h('div', { class: 'row wrap' }, h('small', null, t(l('Seus equipamentos:', 'Your gear:'))), m.gear.map((id) => pill(t(gearById[id]?.name ?? l(id, id)), 'good'))) : null,
    m.gearOffers.length ? h('div', { class: 'mu-gear' }, m.gearOffers.map((o) => {
      const g = gearById[o.gearId];
      return h('article', { class: 'tile mu-offer' }, h('div', { class: 'tile-ic' }, ic('gavel', 2)), h('div', { class: 'tile-body' },
        h('b', null, t(g.name)), h('small', null, t(l('Massa falida de {lb}', '{lb} bankruptcy sale'), { lb: o.from })),
        h('button', { class: 'btn small primary', disabled: s.player.cash < o.price, onclick: () => { const e = buyGear(s, o.gearId, o.id); toast(t(e ?? l('Comprado no leilão!', 'Bought at auction!')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Arrematar', 'Buy'))} ${$(o.price)}`)));
    })) : null,
    avail.length ? h('div', { class: 'mu-gear' }, avail.map((g) => h('article', { class: 'tile' }, h('div', { class: 'tile-ic' }, ic('mic', 2)), h('div', { class: 'tile-body' },
      h('b', null, t(g.name)), h('small', null, t(g.desc)),
      chips(stat('radio', `+${g.prod}`, l('Produção', 'Production')), g.perf ? stat('mic', `+${g.perf}`, l('Performance', 'Performance')) : null, g.orig ? stat('sparkle', `${g.orig > 0 ? '+' : ''}${g.orig}`, l('Originalidade', 'Originality')) : null),
      h('button', { class: 'btn small', disabled: s.player.cash < money(s, g.price), onclick: () => { const e = buyGear(s, g.id); toast(t(e ?? l('Equipamento instalado no estúdio.', 'Gear installed in the studio.')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Comprar', 'Buy'))} ${$(money(s, g.price))}`))))) : h('p', { class: 'muted small' }, t(l('Nenhum equipamento lendário novo nesta época.', 'No new legendary gear in this era.'))),
    h('p', { class: 'muted small' }, t(l('Equipamentos valem inteiros no estúdio da sede e pela metade em estúdios externos; casam melhor com alguns gêneros e mudam o som do trecho.', 'Gear counts fully in your HQ studio and half in outside studios; it suits some genres better and changes the snippet\'s sound.'))),
  );
}

void GEAR; void crateRecords;
