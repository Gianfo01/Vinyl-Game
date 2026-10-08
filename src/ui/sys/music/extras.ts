// Jam da banda, audição às cegas, rádio do jogo e o atalho do take no tempo na Central.

import { nowPlaying, onPlayChange, play, stopAll } from '../../../audio/engine';
import { buildActDemoSpec, buildSongSpec } from '../../../audio/spec';
import { l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  ERA_NAMES, JAM_NAMES, autoJam, blindBet, blindCandidates, blindReady, broadcastSound, jamCards, jamChemistry, ms, playJam, scoreJam, type JamCard,
} from '../../../sim/sys/music';
import type { GameState, Song } from '../../../sim/types';
import { rngOf } from '../../../sim/util';
import { actLink, genreName, logo, pill, rerender, section, toast } from '../../common';
import { h } from '../../dom';
import { chips, ic, portrait, stat } from '../../vis';
import { gauge, isErr, openGame, playBtn, redrawGame, type GameFrame } from './common';
import { openTake } from './studio';

// ------------------------------------------------------------------ jam

export function openJam(s: GameState, actId: string): void {
  const act = s.acts[actId];
  if (!act) return;
  const cards = jamCards(s, act);
  const st = { table: [] as string[] };
  const picked = (): JamCard[] => st.table.map((id) => cards.find((c) => c.id === id)!).filter(Boolean);
  const f: GameFrame = {
    title: l('Jam da banda', 'Band jam'),
    intro: l('Coloque até 4 cartas na mesa. Riff + levada e letra + melodia formam combos; dois solos com um ego grande viram briga. O resultado vira ideias no caderno.', 'Put up to 4 cards on the table. Riff + groove and lyric + melody make combos; two solos with a big ego become a fight. The result becomes notebook ideas.'),
    meters: () => {
      const sc = scoreJam(s, act, picked());
      return h('div', { class: 'mu-gauges' }, gauge(l('Química', 'Chemistry'), (jamChemistry(s, act) + 100) / 2), gauge(l('Nota', 'Score'), picked().length >= 2 ? sc.score : 0),
        sc.combos.map((c) => pill(t(c), 'good')), sc.fight ? pill(t(l('Briga de egos!', 'Ego clash!')), 'bad') : null);
    },
    board: () => h('div', null,
      h('div', { class: 'mu-table', 'aria-label': t(l('Mesa', 'Table')) }, picked().length ? picked().map((c) => cardEl(s, c, true, () => { st.table = st.table.filter((x) => x !== c.id); redrawGame(f); })) : h('p', { class: 'muted small' }, t(l('Mesa vazia.', 'Empty table.')))),
      h('div', { class: 'mu-hand' }, cards.filter((c) => !st.table.includes(c.id)).map((c) => cardEl(s, c, false, () => { if (st.table.length < 4) st.table.push(c.id); redrawGame(f); }))),
    ),
    auto: () => wrapJam(autoJam(s, rngOf(s), actId)),
    confirm: () => wrapJam(playJam(s, rngOf(s), actId, st.table)),
    done: (res) => {
      const r = res as { ideas?: { theme: { pt: string; en: string } }[]; fight?: boolean };
      if (r?.ideas?.length) toast(`${t(l('Novas ideias no caderno', 'New notebook ideas'))}: ${r.ideas.map((i) => t(i.theme)).join(', ')}`, 'good');
      if (r?.fight) toast(t(l('A jam terminou em discussão.', 'The jam ended in an argument.')), 'bad');
    },
  };
  openGame(f);
}

function cardEl(s: GameState, c: JamCard, onTable: boolean, onclick: () => void): HTMLElement {
  const p = s.persons[c.personId];
  return h('button', { class: `mu-card jam k-${c.kind} ${onTable ? 'on' : ''}`, onclick, 'aria-label': `${p?.name ?? ''}: ${t(JAM_NAMES[c.kind])} ${c.power}` },
    portrait(p, 28), h('b', null, t(JAM_NAMES[c.kind])), h('small', null, `${p?.name.split(' ')[0] ?? ''} · ${c.power}`), p?.traits.includes('big_ego') ? h('small', { class: 'bad' }, 'ego') : null);
}

function wrapJam(res: ReturnType<typeof playJam>) {
  if (isErr(res)) return res;
  return { score: res.score, deltas: {}, ideas: res.ideas, fight: res.fight };
}

// ------------------------------------------------------------------ audição às cegas

export function blindTab(s: GameState): HTMLElement {
  const m = ms(s);
  const cands = blindCandidates(s);
  const ready = blindReady(s);
  return h('div', null, section(t(l('Audição às cegas', 'Blind audition')),
    h('p', { class: 'muted small' }, t(l('Três demos, sem nomes nem números. Ouça e aposte na que tem mais futuro. Acertar treina o seu ouvido: as notas percebidas das demos ficam mais precisas para sempre.', 'Three demos, no names or numbers. Listen and bet on the one with the most future. Hitting trains your ear: perceived demo scores become permanently more accurate.'))),
    chips(stat('fans', `${m.ear}/10`, l('Ouvido do selo', 'Label ear')), stat('trophy', `${m.earHits}/${m.earTries}`, l('Acertos', 'Hits'))),
    !ready ? h('p', { class: 'muted' }, t(cands.length < 3 ? l('Faltam artistas disponíveis para uma audição.', 'Not enough available artists for an audition.') : l('A próxima audição fica para daqui a algumas semanas.', 'The next audition is a few weeks away.')))
      : h('div', { class: 'mu-blind' }, cands.map((c, i) => h('article', { class: 'tile' },
        h('div', { class: 'tile-ic' }, h('span', { class: 'mu-demo-n' }, String.fromCharCode(65 + i))),
        h('div', { class: 'tile-body' }, h('b', null, `${t(l('Demo', 'Demo'))} ${String.fromCharCode(65 + i)}`), h('small', { class: 'muted' }, genreName(s.acts[c.actId].genre)),
          h('div', { class: 'row' }, playBtn(() => buildActDemoSpec(s, s.acts[c.actId])),
            h('button', { class: 'btn small primary', onclick: () => {
              stopAll();
              const res = blindBet(s, rngOf(s), c.actId);
              if (isErr(res)) { toast(t(res), 'bad'); return; }
              toast(res.correct ? t(l('Acertou! A demo {x} era a de maior potencial. Ouvido {e}/10.', 'Right! Demo {x} had the most potential. Ear {e}/10.'), { x: String.fromCharCode(65 + i), e: res.ear }) : t(l('Errou: a melhor era de {a}. O artista que você escolheu entrou no radar.', 'Missed: the best one was {a}. The artist you picked is now on your radar.'), { a: s.acts[res.bestId]?.name ?? '' }), res.correct ? 'good' : 'info');
              rerender();
            } }, t(l('Apostar nesta', 'Bet on this one')))))))),
    m.earTries ? h('p', { class: 'small muted' }, t(l('Depois da aposta, os nomes aparecem no radar de descoberta.', 'After the bet, the names show up in the discovery radar.'))) : null,
  ));
}

// ------------------------------------------------------------------ rádio do jogo

const radio = { idx: 0, on: false };

function playlist(s: GameState): { song: Song; pos: number; mine: boolean }[] {
  const out: { song: Song; pos: number; mine: boolean }[] = [];
  for (const e of s.charts.singles.slice(0, 12)) {
    const rel = s.releases[e.releaseId];
    const so = rel ? s.songs[rel.songs[0]] : undefined;
    if (so) out.push({ song: so, pos: e.pos, mine: rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand });
  }
  if (!out.length) for (const e of s.charts.albums.slice(0, 8)) {
    const rel = s.releases[e.releaseId];
    const so = rel ? s.songs[rel.songs[0]] : undefined;
    if (so) out.push({ song: so, pos: e.pos, mine: rel.owner === 'player' });
  }
  return out;
}

function radioPlay(s: GameState): void {
  const list = playlist(s);
  if (!list.length) { radio.on = false; return; }
  radio.idx = ((radio.idx % list.length) + list.length) % list.length;
  const it = list[radio.idx];
  const spec = buildSongSpec(s, it.song, { era: broadcastSound(s), seconds: 15, chorusFirst: true });
  radio.on = true;
  const hd = play(spec, { onEnd: () => { if (!radio.on) return; radio.idx += 1; radioPlay(s); } });
  if (!hd) { radio.on = false; toast(t(l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.')), 'bad'); }
}

export function radioSection(s: GameState): HTMLElement | null {
  const list = playlist(s);
  if (!list.length) return null;
  const era = broadcastSound(s);
  const now = h('div', { class: 'mu-radio-now', 'aria-live': 'polite' });
  const paint = () => {
    const np = nowPlaying();
    const cur = radio.on && np ? list.find((x) => x.song.id === np.spec.seed) : undefined;
    now.replaceChildren(cur ? h('span', null, ic('radio'), ` #${cur.pos} `, h('b', null, cur.song.title), ' — ', actLink(s, cur.song.actId), cur.mine ? pill(t(l('seu selo', 'your label')), 'good') : null) : h('span', { class: 'muted' }, t(l('Rádio desligada.', 'Radio off.'))));
  };
  const off = onPlayChange(() => { if (!now.isConnected) { off(); return; } paint(); });
  paint();
  return section(t(l('Rádio do jogo', 'In-game radio')),
    h('p', { class: 'muted small' }, t(l('Toca em sequência o topo das paradas (suas e dos rivais), com o som do meio de transmissão da época: {e}.', 'Plays the top of the charts in sequence (yours and rivals\'), with the era\'s broadcast sound: {e}.'), { e: t(ERA_NAMES[era]) })),
    h('div', { class: 'mu-radio' },
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', 'aria-label': t(l('Anterior', 'Previous')), onclick: () => { radio.idx -= 1; radioPlay(s); } }, '⏮'),
        h('button', { class: 'btn small primary', onclick: () => { if (radio.on && nowPlaying()) { radio.on = false; stopAll(); } else radioPlay(s); paint(); } }, radio.on && nowPlaying() ? '■ ' : '▶ ', t(radio.on && nowPlaying() ? l('Desligar', 'Turn off') : l('Ligar a rádio', 'Turn the radio on'))),
        h('button', { class: 'btn small', 'aria-label': t(l('Próxima', 'Next')), onclick: () => { radio.idx += 1; radioPlay(s); } }, '⏭')),
      now,
      h('ol', { class: 'mu-playlist' }, list.map((x, i) => h('li', { class: x.mine ? 'mine' : '' }, h('button', { class: 'link', onclick: () => { radio.idx = i; radioPlay(s); } }, `#${x.pos} ${x.song.title}`), h('small', { class: 'muted' }, ` ${s.acts[x.song.actId]?.name ?? ''}`)))),
    ));
}

// ------------------------------------------------------------------ Central: take no tempo

export function takeSection(s: GameState): HTMLElement | null {
  const pend = s.sessions.filter((x) => !x.done && x.decision && s.acts[x.actId]);
  if (!pend.length) return null;
  return section(t(l('Estúdio: jogar o take no tempo', 'Studio: play the timing take')),
    h('p', { class: 'muted small' }, t(l('Antes de decidir manter, repetir ou montar, toque o take no tempo: acertos melhoram o último take.', 'Before choosing keep, retry or comp, play the take in time: hits improve the last take.'))),
    pend.map((ss) => {
      const so = s.songs[ss.decision!.songId];
      if (!so) return null;
      const used = ms(s).songs[so.id]?.take?.used;
      return h('div', { class: 'row wrap' }, logo(s.acts[ss.actId], 24), h('b', null, so.title),
        used ? pill(t(l('take já jogado', 'take already played')), 'good') : h('button', { class: 'btn small primary', onclick: () => openTake(s, so) }, ic('mic'), ' ', t(l('Jogar o take no tempo', 'Play the timing take'))));
    }));
}
