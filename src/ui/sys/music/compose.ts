// Mini-jogos de composição: escada de acordes, contorno da melodia, ímãs de geladeira (letra) e
// linha do tempo do arranjo. Todos em tela cheia, com "Resolver automático".

import { blip } from '../../../audio/engine';
import { buildSongSpec, chordHz, degreeHz } from '../../../audio/spec';
import { familyOf, l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  BLOCKS, CHORDS, MELODY_ROWS, MELODY_STEPS, SCALES, TRACK_LABEL, applyArrange, applyChords, applyLyrics, applyMelody, autoArrange, autoChords,
  autoLyrics, autoMelody, availableInstruments, chordHand, eraLimits, magnetsFor, ms, scoreArrange, scoreChords, scoreLyrics, scoreMelody, songScale, trackLimit,
  type BlockId,
} from '../../../sim/sys/music';
import type { GameState, Song } from '../../../sim/types';
import { rngOf } from '../../../sim/util';
import { pill } from '../../common';
import { h, select } from '../../dom';
import { store } from '../../store';
import { gauge, openGame, redrawGame, type GameFrame } from './common';

const langOf = (): 'pt' | 'en' => (store.prefs.lang === 'en' ? 'en' : 'pt');

// ------------------------------------------------------------------ escada de acordes

export function openChords(s: GameState, song: Song): void {
  const rec = ms(s).songs[song.id];
  const st = { verse: [...(rec?.chords?.verse ?? [])], chorus: [...(rec?.chords?.chorus ?? [])], row: 'verse' as 'verse' | 'chorus' };
  const hand = chordHand(familyOf(song.genre), s.year);
  const tonic = () => buildSongSpec(s, song);
  const f: GameFrame = {
    title: l('Escada de acordes', 'Chord ladder'),
    intro: l('Monte de 4 a 8 acordes para o verso e para o refrão. Familiaridade vende; surpresa dá originalidade. Progressões clássicas do gênero dão bônus.', 'Build 4 to 8 chords for the verse and chorus. Familiarity sells; surprise gives originality. Classic progressions for the genre give a bonus.'),
    meters: () => {
      const res = scoreChords(s, song, st.verse, st.chorus);
      return h('div', { class: 'mu-gauges' },
        gauge(l('Familiaridade', 'Familiarity'), res.fam, l('Transições comuns: o público reconhece', 'Common moves: listeners recognise them')),
        gauge(l('Surpresa', 'Surprise'), res.sur, l('Acordes raros e verso diferente do refrão', 'Rare chords and a verse unlike the chorus')),
        gauge(l('Nota', 'Score'), res.score),
        res.classic ? pill(`★ ${t(res.classic.name)}`, 'good') : pill(t(l('sem progressão clássica', 'no classic progression'))));
    },
    board: () => {
      const row = (key: 'verse' | 'chorus', name: string) => h('div', { class: `mu-row ${st.row === key ? 'on' : ''}` },
        h('button', { class: `chip-btn ${st.row === key ? 'on' : ''}`, 'aria-pressed': st.row === key ? 'true' : 'false', onclick: () => { st.row = key; redrawGame(f); } }, name),
        h('div', { class: 'mu-slots' }, Array.from({ length: 8 }, (_, i) => {
          const c = st[key][i];
          return h('button', { class: `mu-slot ${c ? 'full' : ''}`, 'aria-label': c ? `${c} — ${t(l('remover', 'remove'))}` : t(l('vazio', 'empty')), disabled: !c, onclick: () => { st[key].splice(i, 1); redrawGame(f); } }, c ?? '·');
        })));
      return h('div', null,
        row('verse', t(l('Verso', 'Verse'))), row('chorus', t(l('Refrão', 'Chorus'))),
        h('div', { class: 'mu-hand', role: 'group', 'aria-label': t(l('Cartas de acordes', 'Chord cards')) }, hand.map((c) => h('button', {
          class: `mu-card ${(CHORDS[c]?.common ?? 0) < 0.5 ? 'rare' : ''}`,
          onclick: () => { if (st[st.row].length < 8) st[st.row].push(c); blip(chordHz(tonic(), c, 1), 0.6); redrawGame(f); },
        }, h('b', null, c), h('small', null, (CHORDS[c]?.common ?? 0) < 0.5 ? t(l('raro', 'rare')) : '')))),
      );
    },
    listen: () => buildSongSpec(s, song, { verse: st.verse.length ? st.verse : undefined, chorus: st.chorus.length ? st.chorus : undefined, seconds: 16 }),
    auto: () => { const a = autoChords(s, rngOf(s), song); return applyChords(s, song.id, a.verse, a.chorus); },
    confirm: () => applyChords(s, song.id, st.verse, st.chorus),
  };
  openGame(f);
}

// ------------------------------------------------------------------ contorno da melodia

export function openMelody(s: GameState, song: Song): void {
  const rec = ms(s).songs[song.id];
  const notes = rec?.melody?.notes ? [...rec.melody.notes] : Array.from({ length: MELODY_STEPS }, () => -1);
  let drawing = false;
  const spec = () => buildSongSpec(s, song);
  const setNote = (i: number, v: number, toggle = false) => {
    notes[i] = toggle && notes[i] === v ? -1 : v;
    if (notes[i] >= 0) blip([degreeHz(spec(), notes[i], 2)], 0.25, 'square', 0.08);
  };
  const f: GameFrame = {
    title: l('Contorno da melodia', 'Melody contour'),
    intro: fmtScale(song),
    meters: () => {
      const res = scoreMelody(song, notes);
      return h('div', { class: 'mu-gauges' }, gauge(l('Gancho', 'Hook'), res.hook, l('Motivo que volta e nota mais alta no refrão', 'A motif that returns and the highest note in the chorus')), gauge(l('Fluidez', 'Flow'), res.flow, l('Mais passos que saltos', 'More steps than leaps')), gauge(l('Extensão', 'Range'), res.range), gauge(l('Nota', 'Score'), res.score));
    },
    board: () => h('div', {
      class: 'mu-grid', role: 'grid', 'aria-label': t(l('Grade da escala: colunas são tempos, linhas são notas', 'Scale grid: columns are beats, rows are notes')),
      onpointerup: () => { drawing = false; redrawGame(f); }, onpointerleave: () => { drawing = false; },
    }, Array.from({ length: MELODY_ROWS }, (_, ri) => {
      const v = MELODY_ROWS - 1 - ri;
      return h('div', { class: 'mu-grid-row', role: 'row' }, Array.from({ length: MELODY_STEPS }, (_, ci) => h('button', {
        class: `mu-cell ${notes[ci] === v ? 'on' : ''} ${ci >= 8 ? 'ch' : ''} ${v % (SCALES[songScale(song)]?.steps.length ?? 7) === 0 ? 'tonic' : ''}`,
        role: 'gridcell', 'aria-label': `${t(l('Tempo', 'Beat'))} ${ci + 1}, ${t(l('nota', 'note'))} ${v + 1}`, 'aria-pressed': notes[ci] === v ? 'true' : 'false',
        onpointerdown: (e: PointerEvent) => { e.preventDefault(); (e.currentTarget as Element).releasePointerCapture?.(e.pointerId); drawing = true; setNote(ci, v, true); (e.currentTarget as HTMLElement).classList.toggle('on', notes[ci] === v); },
        onpointerenter: (e: PointerEvent) => { if (!drawing) return; setNote(ci, v); const col = (e.currentTarget as HTMLElement).parentElement?.parentElement; col?.querySelectorAll(`.mu-cell[data-c="${ci}"]`).forEach((x) => x.classList.remove('on')); (e.currentTarget as HTMLElement).classList.add('on'); },
        onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNote(ci, v, true); redrawGame(f); } },
        'data-c': String(ci),
      })));
    })),
    listen: () => buildSongSpec(s, song, { melody: notes, seconds: 14 }),
    auto: () => applyMelody(s, song.id, autoMelody(s, rngOf(s), song)),
    confirm: () => applyMelody(s, song.id, notes),
  };
  openGame(f);
}

function fmtScale(song: Song) {
  const sc = SCALES[songScale(song)];
  return l(`Desenhe a curva (clique e arraste) sobre a escala ${sc.name.pt.toLowerCase()}. A metade direita é o refrão: repita o motivo e guarde a nota mais alta para ele. Termine na tônica (linhas marcadas).`,
    `Draw the curve (click and drag) over the ${sc.name.en.toLowerCase()} scale. The right half is the chorus: repeat the motif and save the highest note for it. End on the tonic (marked rows).`);
}

// ------------------------------------------------------------------ ímãs de geladeira

export function openLyrics(s: GameState, song: Song): void {
  const rec = ms(s).songs[song.id];
  const pool = magnetsFor(s, song);
  const st = { lines: rec?.lyrics?.lines.map((x) => [...x]) ?? [[], [], [], []] as string[][], active: 0, scheme: (rec?.lyrics?.scheme ?? 'AABB') as 'AABB' | 'ABAB' | 'free', useTitle: false };
  const word = (k: string) => pool.find((m) => m.key === k);
  const f: GameFrame = {
    title: l('Ímãs de geladeira', 'Fridge magnets'),
    intro: l('Monte os versos com as palavras do tema (destacadas) e das ideias do caderno. Escolha o esquema de rima. Palavras políticas ou ousadas podem esbarrar na censura da época.', 'Build lines with the theme words (highlighted) and notebook ideas. Pick a rhyme scheme. Political or racy words may run into the era\'s censors.'),
    meters: () => {
      const res = scoreLyrics(s, song, st.lines, st.scheme);
      return h('div', { class: 'mu-gauges' },
        gauge(l('Coerência com o tema', 'Theme coherence'), res.coherence), gauge(l('Rima', 'Rhyme'), res.rhyme), gauge(l('Risco de censura', 'Censorship risk'), res.risk * 100, res.riskRule), gauge(l('Nota', 'Score'), res.score),
        res.title ? pill(`“${res.title}”`) : null);
    },
    board: () => h('div', null,
      h('div', { class: 'row wrap' },
        select(st.scheme, [{ value: 'AABB' as const, label: 'AABB' }, { value: 'ABAB' as const, label: 'ABAB' }, { value: 'free' as const, label: t(l('Verso livre', 'Free verse')) }], (v) => { st.scheme = v; redrawGame(f); }, { 'aria-label': t(l('Esquema de rima', 'Rhyme scheme')) }),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.useTitle, onchange: (e: Event) => { st.useTitle = (e.target as HTMLInputElement).checked; } }), t(l('Usar o título gerado', 'Use the generated title'))),
        st.lines.length < 8 ? h('button', { class: 'btn small ghost', onclick: () => { st.lines.push([]); st.active = st.lines.length - 1; redrawGame(f); } }, '+ ', t(l('verso', 'line'))) : null),
      h('div', { class: 'mu-fridge' }, st.lines.map((ln, i) => h('div', { class: `mu-line ${st.active === i ? 'on' : ''}` },
        h('button', { class: 'chip-btn', 'aria-pressed': st.active === i ? 'true' : 'false', onclick: () => { st.active = i; redrawGame(f); } }, String.fromCharCode(65 + (st.scheme === 'ABAB' ? i % 2 : Math.floor(i / 2) % 2)), ` ${i + 1}`),
        ln.map((k, j) => h('button', { class: `mu-magnet ${word(k)?.theme ? 'theme' : ''}`, 'aria-label': `${word(k)?.[langOf()] ?? k} — ${t(l('remover', 'remove'))}`, onclick: () => { ln.splice(j, 1); redrawGame(f); } }, word(k)?.[langOf()] ?? '?')),
      ))),
      h('div', { class: 'mu-magnets', role: 'group', 'aria-label': t(l('Ímãs', 'Magnets')) }, pool.map((m) => h('button', {
        class: `mu-magnet ${m.theme ? 'theme' : ''} ${m.tag ?? ''}`, title: m.tag === 'political' ? t(l('política', 'political')) : m.tag === 'explicit' ? t(l('ousada', 'racy')) : m.tag === 'rare' ? t(l('rara', 'rare')) : undefined,
        onclick: () => { const ln = st.lines[st.active]; if (ln && ln.length < 6) ln.push(m.key); redrawGame(f); },
      }, m[langOf()]))),
    ),
    auto: () => { const a = autoLyrics(s, rngOf(s), song); return applyLyrics(s, song.id, a.lines, a.scheme, false); },
    confirm: () => applyLyrics(s, song.id, st.lines, st.scheme, st.useTitle),
  };
  openGame(f);
}

// ------------------------------------------------------------------ linha do tempo do arranjo

export function openArrange(s: GameState, song: Song): void {
  const rec = ms(s).songs[song.id];
  const tracks = trackLimit(s);
  const lim = eraLimits(s);
  const insts = availableInstruments(s);
  const st = { blocks: [...((rec?.arrange?.blocks as BlockId[] | undefined) ?? ['intro', 'verse', 'chorus'])], lanes: [...(rec?.arrange?.lanes ?? ['vox', 'drums', 'bass'].filter((x) => insts.some((i) => i.id === x)))] };
  const f: GameFrame = {
    title: l('Linha do tempo do arranjo', 'Arrangement timeline'),
    intro: l(`Arraste (clique) blocos para a linha do tempo e escolha os instrumentos. Estúdio desta era: ${TRACK_LABEL(tracks)} pista(s). ${lim.note.pt}`, `Place blocks on the timeline and choose instruments. This era's studio: ${TRACK_LABEL(tracks)} track(s). ${lim.note.en}`),
    meters: () => {
      const res = scoreArrange(s, song, st.blocks, st.lanes);
      const mm = Math.floor(res.seconds / 60);
      return h('div', null, h('div', { class: 'mu-gauges' },
        gauge(l('Nota', 'Score'), res.score),
        pill(`⏱ ${mm}:${String(res.seconds % 60).padStart(2, '0')} / ${Math.floor(lim.maxSeconds / 60)}:${String(lim.maxSeconds % 60).padStart(2, '0')}`, res.seconds > lim.maxSeconds ? 'bad' : ''),
        pill(`${t(l('1º refrão', '1st chorus'))} ${res.firstChorus}s`, lim.shortIntro && res.firstChorus > 35 ? 'bad' : ''),
        pill(`${st.lanes.length}/${TRACK_LABEL(tracks)} ${t(l('pistas', 'tracks'))}`, st.lanes.length > tracks ? 'bad' : '')),
      h('div', { class: 'mu-energy', 'aria-label': t(l('Energia por seção', 'Energy by section')) }, res.energy.map((e) => h('i', { style: `height:${e}%` }))),
      res.warnings.map((w) => h('p', { class: 'small bad' }, t(w))));
    },
    board: () => h('div', null,
      h('div', { class: 'mu-timeline', role: 'list', 'aria-label': t(l('Linha do tempo', 'Timeline')) }, st.blocks.map((b, i) => h('div', { class: `mu-block b-${b}`, role: 'listitem' },
        h('b', null, t(BLOCKS[b].name)),
        h('span', { class: 'row' },
          h('button', { class: 'icon', 'aria-label': t(l('mover para a esquerda', 'move left')), disabled: i === 0, onclick: () => { [st.blocks[i - 1], st.blocks[i]] = [st.blocks[i], st.blocks[i - 1]]; redrawGame(f); } }, '◀'),
          h('button', { class: 'icon', 'aria-label': t(l('remover', 'remove')), onclick: () => { st.blocks.splice(i, 1); redrawGame(f); } }, '✕'),
          h('button', { class: 'icon', 'aria-label': t(l('mover para a direita', 'move right')), disabled: i === st.blocks.length - 1, onclick: () => { [st.blocks[i + 1], st.blocks[i]] = [st.blocks[i], st.blocks[i + 1]]; redrawGame(f); } }, '▶'))))),
      h('div', { class: 'row wrap' }, (Object.keys(BLOCKS) as BlockId[]).map((b) => h('button', { class: `btn small mu-addblock b-${b}`, disabled: st.blocks.length >= 14, onclick: () => { st.blocks.push(b); redrawGame(f); } }, '+ ', t(BLOCKS[b].name)))),
      h('h4', null, t(l('Instrumentos (um por pista)', 'Instruments (one per track)'))),
      h('div', { class: 'row wrap' }, insts.map((ins) => {
        const on = st.lanes.includes(ins.id);
        return h('label', { class: `chip-btn ${on ? 'on' : ''}` }, h('input', { type: 'checkbox', checked: on, disabled: !on && st.lanes.length >= tracks, onchange: () => { if (on) st.lanes = st.lanes.filter((x) => x !== ins.id); else st.lanes.push(ins.id); redrawGame(f); } }), ' ', t(ins.name));
      })),
    ),
    listen: () => buildSongSpec(s, song, { blocks: st.blocks, lanes: st.lanes, seconds: 24 }),
    auto: () => { const a = autoArrange(s, rngOf(s), song); return applyArrange(s, song.id, a.blocks, a.lanes); },
    confirm: () => applyArrange(s, song.id, st.blocks, st.lanes),
  };
  openGame(f);
}
