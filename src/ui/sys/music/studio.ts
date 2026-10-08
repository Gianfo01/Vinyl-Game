// Mini-jogos de estúdio: take no tempo (ritmo), mesa de mixagem, masterização (guerra do volume),
// sequenciador de 16 passos e garimpo de discos.

import { audioTime, drumHit, play, stopAll } from '../../../audio/engine';
import { buildSongSpec } from '../../../audio/spec';
import { l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  DRUM_ROWS, EQ_BANDS, MIX_CHANNELS, applyBeat, applyMaster, applyMix, applyTake, autoBeat, autoDig, autoMix, autoTake, beatReady, breakScore, crateRecords,
  digRecord, ms, mixTarget, pendingTake, samplerReady, scoreBeat, scoreMaster, scoreMix, takeScore, useSignatureBeat,
} from '../../../sim/sys/music';
import type { GameState, Song } from '../../../sim/types';
import { rngOf } from '../../../sim/util';
import { N, genreName, pill, toast } from '../../common';
import { h } from '../../dom';
import { gauge, isErr, openGame, playBtn, redrawGame, type GameFrame } from './common';

// ------------------------------------------------------------------ take no tempo

export function openTake(s: GameState, song: Song): void {
  const spec = buildSongSpec(s, song, { seconds: 20 });
  const beat = 60 / spec.bpm;
  const st = { beats: [] as number[], hit: new Set<number>(), perfect: new Set<number>(), extra: 0, running: false, done: false, tension: 0, last: '' };
  let raf = 0;
  let cursor: HTMLElement | null = null;
  const total = () => st.beats.length || Math.floor(20 / beat);
  const press = () => {
    if (!st.running) return;
    const now = audioTime();
    let best = -1;
    let bd = 9;
    st.beats.forEach((b, i) => { if (!st.hit.has(i) && Math.abs(now - b) < bd) { bd = Math.abs(now - b); best = i; } });
    if (best >= 0 && bd < 0.14) {
      st.hit.add(best);
      if (bd < 0.05) st.perfect.add(best);
      st.last = bd < 0.05 ? t(l('Perfeito!', 'Perfect!')) : t(l('Boa!', 'Good!'));
      st.tension = Math.max(0, st.tension - 4);
    } else {
      st.extra += 1;
      st.tension = Math.min(100, st.tension + 10);
      st.last = t(l('Fora do tempo', 'Off beat'));
    }
    redrawGame(f);
  };
  const onKey = (e: KeyboardEvent) => { if (!cursor?.isConnected) { document.removeEventListener('keydown', onKey); return; } if (st.running && (e.code === 'Space' || e.key === 'Enter' || e.key === 'j')) { e.preventDefault(); press(); } };
  const start = () => {
    const hd = play(spec, { onEnd: () => { st.running = false; st.done = true; cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); redrawGame(f); } });
    if (!hd) { toast(t(l('Áudio indisponível: use o resolver automático.', 'Audio unavailable: use auto-resolve.')), 'bad'); return; }
    st.beats = [];
    for (let i = 4; i * beat < hd.seconds - 0.3; i++) st.beats.push(hd.start + i * beat); // um compasso de contagem
    st.hit.clear(); st.perfect.clear(); st.extra = 0; st.tension = 0; st.running = true; st.done = false;
    document.addEventListener('keydown', onKey);
    const tick = () => {
      if (!st.running) return;
      const now = audioTime();
      const missed = st.beats.filter((b, i) => !st.hit.has(i) && now - b > 0.14).length;
      st.tension = Math.min(100, missed * 6 + st.extra * 6);
      if (cursor) {
        const ph = ((now - hd.start) / beat) % 1;
        cursor.style.setProperty('--ph', String(ph));
        cursor.classList.toggle('flash', ph < 0.12 || ph > 0.92);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    redrawGame(f);
  };
  const hits = () => Math.max(0, st.hit.size - Math.floor(st.extra / 3));
  const pend = pendingTake(s, song.id);
  const f: GameFrame = {
    title: l('Take no tempo', 'Timing take'),
    intro: pend ? l('Toque no tempo (Espaço, Enter ou o botão) a cada batida. Depois de um compasso de contagem, o take começa. Acertos melhoram o último take; errar demais cansa a banda.', 'Tap on the beat (Space, Enter or the pad) on every beat. After a count-in bar the take begins. Hits improve the last take; too many misses tire the band.')
      : l('Ensaio no tempo antes da sessão: a pontuação vira bônus de performance quando a faixa for gravada.', 'Timing rehearsal before the session: the score becomes a performance bonus when the track is recorded.'),
    meters: () => h('div', { class: 'mu-gauges' },
      gauge(l('Acertos', 'Hits'), (st.hit.size / Math.max(1, total())) * 100),
      gauge(l('Tensão do músico', 'Musician tension'), st.tension),
      gauge(l('Nota', 'Score'), takeScore(hits(), st.perfect.size, total())),
      st.last ? pill(st.last, st.last.includes('!') ? 'good' : 'bad') : null),
    board: () => {
      cursor = h('div', { class: 'mu-metro', 'aria-hidden': 'true' }, h('i'));
      return h('div', { class: 'mu-take' },
        cursor,
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn', disabled: st.running, onclick: start }, st.done ? '↻ ' : '● ', t(st.done ? l('Gravar de novo', 'Record again') : l('Começar o take', 'Start the take'))),
          h('button', { class: 'mu-pad', 'aria-label': t(l('Tocar no tempo', 'Tap on the beat')), onpointerdown: (e: PointerEvent) => { e.preventDefault(); press(); } }, t(l('TOCAR', 'TAP')))),
        st.done ? h('p', { class: 'small' }, t(l('{h} de {n} batidas, {p} perfeitas.', '{h} of {n} beats, {p} perfect.'), { h: st.hit.size, n: total(), p: st.perfect.size })) : null);
    },
    auto: () => { stopAll(); return wrapTake(autoTake(s, rngOf(s), song.id)); },
    confirm: () => {
      if (!st.done && !st.hit.size) return l('Toque o take primeiro (ou resolva automático).', 'Play the take first (or auto-resolve).');
      st.running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      return wrapTake(applyTake(s, song.id, hits(), st.perfect.size, total()));
    },
  };
  openGame(f);
}

function wrapTake(res: ReturnType<typeof applyTake>) {
  if (isErr(res)) return res;
  return { score: res.score, deltas: { performance: res.boost }, tired: res.tired };
}

// ------------------------------------------------------------------ mesa de mixagem

export function openMix(s: GameState, song: Song): void {
  const rec = ms(s).songs[song.id];
  const tg = mixTarget(s, song);
  const st = { faders: rec?.mix?.faders ? [...rec.mix.faders] : [70, 70, 60, 60, 50, 40], eq: rec?.mix?.eq ? [...rec.mix.eq] : [0, 0, 0] };
  const f: GameFrame = {
    title: l('Mesa de mixagem', 'Mixing desk'),
    intro: l(`Alvo da época: ${tg.name.pt}. Ajuste faders e equalização até as barras baterem com as sombras.`, `Era target: ${tg.name.en}. Move faders and EQ until the bars match the shadows.`),
    meters: () => {
      const res = scoreMix(s, song, st.faders, st.eq);
      return h('div', null, h('div', { class: 'mu-gauges' }, gauge(l('Perto do alvo', 'Close to target'), res.score)),
        h('div', { class: 'mu-spectrum', 'aria-hidden': 'true' }, st.faders.map((v, i) => h('span', { class: 'mu-sbar' }, h('i', { class: 'ghost', style: `height:${tg.faders[i]}%` }), h('i', { style: `height:${v}%` })))));
    },
    board: () => h('div', { class: 'mu-desk' },
      st.faders.map((v, i) => h('label', { class: 'mu-fader' }, h('input', { type: 'range', min: 0, max: 100, value: v, 'aria-label': t(MIX_CHANNELS[i]), oninput: (e: Event) => { st.faders[i] = Number((e.target as HTMLInputElement).value); redrawMeters(f); } }), h('small', null, t(MIX_CHANNELS[i])))),
      h('div', { class: 'mu-eq' }, st.eq.map((v, i) => h('label', null, h('small', null, `${t(EQ_BANDS[i])} `), h('input', { type: 'range', min: -6, max: 6, step: 1, value: v, 'aria-label': t(EQ_BANDS[i]), oninput: (e: Event) => { st.eq[i] = Number((e.target as HTMLInputElement).value); redrawMeters(f); } })))),
    ),
    listen: () => buildSongSpec(s, song, { faders: st.faders, eq: st.eq, seconds: 14, chorusFirst: true }),
    auto: () => { const a = autoMix(s, rngOf(s), song); return applyMix(s, song.id, a.faders, a.eq); },
    confirm: () => applyMix(s, song.id, st.faders, st.eq),
  };
  openGame(f);
}

/** Atualiza só os medidores (sem recriar os sliders que o jogador está arrastando). */
function redrawMeters(f: GameFrame): void {
  const box = document.querySelector('.scene-overlay .mu-meters');
  if (box) box.replaceChildren(f.meters());
}

// ------------------------------------------------------------------ masterização

export function openMaster(s: GameState, song: Song): void {
  const st = { loud: ms(s).songs[song.id]?.master?.loud ?? 50 };
  const f: GameFrame = {
    title: l('Masterização: a guerra do volume', 'Mastering: the loudness war'),
    intro: l('Um controle: volume contra dinâmica. Até a normalização das plataformas (por volta de 2014), mais volume ajuda no rádio e cansa a crítica. Depois, volume extra não ajuda mais.', 'One control: loudness versus dynamics. Until platform normalization (around 2014), more loudness helps on radio and tires critics. After that, extra loudness no longer helps.'),
    meters: () => {
      const m = scoreMaster(s, st.loud);
      return h('div', null, h('div', { class: 'mu-gauges' },
        gauge(l('Dinâmica', 'Dynamics'), m.dynamics), gauge(l('Nota', 'Score'), m.score),
        pill(m.normalized ? t(l('Volume normalizado: sem ganho no rádio', 'Normalized loudness: no radio gain')) : `${t(l('Rádio', 'Radio'))} +${m.radio}%`, m.normalized ? '' : 'good'),
        m.critics ? pill(`${t(l('Crítica', 'Critics'))} −${m.critics}`, 'bad') : null),
      h('div', { class: 'mu-wave', 'aria-hidden': 'true' }, Array.from({ length: 48 }, (_, i) => {
        const raw = 30 + 60 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23));
        const ceil = 100 - Math.max(0, st.loud - 40) * 0.9;
        const v = Math.min(ceil, raw * (0.6 + st.loud / 120));
        return h('i', { class: v >= ceil - 1 ? 'clip' : '', style: `height:${Math.max(4, v)}%` });
      })));
    },
    board: () => h('label', { class: 'mu-loud' }, t(l('Volume', 'Loudness')), ' ', h('input', { type: 'range', min: 0, max: 100, value: st.loud, 'aria-label': t(l('Volume', 'Loudness')), oninput: (e: Event) => { st.loud = Number((e.target as HTMLInputElement).value); redrawMeters(f); } })),
    listen: () => buildSongSpec(s, song, { loud: st.loud, seconds: 12, chorusFirst: true }),
    auto: () => { const m = scoreMaster(s, 0); const target = m.normalized ? 45 : 65; return applyMaster(s, song.id, target + Math.round(rngOf(s).normal(0, 8))); },
    confirm: () => applyMaster(s, song.id, st.loud),
  };
  openGame(f);
}

// ------------------------------------------------------------------ sequenciador de 16 passos

export function openBeat(s: GameState, song: Song): void {
  if (!beatReady(s)) { toast(t(l('A bateria eletrônica chega por volta de 1980.', 'Drum machines arrive around 1980.')), 'bad'); return; }
  const rec = ms(s).songs[song.id];
  const st = { grid: rec?.beat?.grid ? [...rec.beat.grid] : [0, 0, 0, 0, 0, 0], name: '' };
  const smp = samplerReady(s);
  const f: GameFrame = {
    title: l('Sequenciador de 16 passos', '16-step sequencer'),
    intro: l(`Programe a batida para ${genreName(song.genre)}. Groove perto do estilo e uma assinatura própria. Dê um nome para guardar como assinatura do produtor.${smp ? '' : ' (O sampler chega por volta de 1986.)'}`, `Program the beat for ${genreName(song.genre)}. A groove close to the style, plus your own twist. Name it to keep it as the producer's signature.${smp ? '' : ' (The sampler arrives around 1986.)'}`),
    meters: () => {
      const res = scoreBeat(s, song, st.grid);
      return h('div', { class: 'mu-gauges' }, gauge(l('Groove do estilo', 'Style groove'), res.groove), gauge(l('Assinatura', 'Signature'), res.variety), gauge(l('Nota', 'Score'), res.score));
    },
    board: () => h('div', null,
      h('div', { class: 'mu-seq', role: 'grid' }, DRUM_ROWS.map((row, ri) => h('div', { class: 'mu-seq-row', role: 'row' },
        h('button', { class: 'mu-seq-name', disabled: !!row.sampler && !smp, onclick: () => drumHit(ri) }, t(row.name)),
        Array.from({ length: 16 }, (_, ci) => {
          const on = ((st.grid[ri] ?? 0) >> ci) & 1;
          return h('button', { class: `mu-step ${on ? 'on' : ''} ${ci % 4 === 0 ? 'down' : ''}`, role: 'gridcell', disabled: !!row.sampler && !smp, 'aria-pressed': on ? 'true' : 'false', 'aria-label': `${t(row.name)} ${ci + 1}`, onclick: () => { st.grid[ri] = (st.grid[ri] ?? 0) ^ (1 << ci); if (!on) drumHit(ri); redrawGame(f); } });
        })))),
      h('div', { class: 'row wrap' },
        h('input', { placeholder: t(l('Nome da assinatura (opcional)', 'Signature name (optional)')), value: st.name, maxlength: 24, oninput: (e: Event) => { st.name = (e.target as HTMLInputElement).value; } }),
        ms(s).beats.length ? h('span', { class: 'row wrap' }, h('small', { class: 'muted' }, t(l('Assinaturas:', 'Signatures:'))), ms(s).beats.map((b) => h('button', { class: 'btn small ghost', title: `${b.score}/100 · ${b.uses}×`, onclick: () => { st.grid = [...b.grid]; redrawGame(f); } }, b.name))) : null),
    ),
    listen: () => buildSongSpec(s, song, { beat: st.grid, seconds: 12, lanes: ['dm', 'bass', 'synth'], chorusFirst: true }),
    auto: () => applyBeat(s, song.id, autoBeat(s, rngOf(s), song)),
    confirm: () => {
      const sig = ms(s).beats.find((b) => b.grid.join() === st.grid.join());
      if (sig && !st.name) { const e = useSignatureBeat(s, song.id, sig.id); return e ?? { score: sig.score, deltas: {} }; }
      return applyBeat(s, song.id, st.grid, st.name);
    },
  };
  openGame(f);
}

// ------------------------------------------------------------------ garimpo de discos

export function openDig(s: GameState, song: Song): void {
  const crate = crateRecords(s, song.id);
  if (!crate.length) { toast(t(l('A loja está sem discos interessantes agora.', 'The shop has no interesting records right now.')), 'info'); return; }
  const st = { pick: '' };
  const f: GameFrame = {
    title: l('Garimpo de discos', 'Crate digging'),
    intro: l('Folheie a caixa e ouça os trechos. Procure um "break" (bateria e groove abertos). Discos obscuros custam pouco para liberar; clássicos impressionam mais e custam caro.', 'Flip through the crate and listen. Look for a "break" (open drums and groove). Obscure records are cheap to clear; classics impress more and cost a lot.'),
    meters: () => h('div', { class: 'mu-gauges' }, st.pick ? pill(`${t(l('Escolhido', 'Picked'))}: ${s.songs[st.pick]?.title ?? ''}`, 'good') : pill(t(l('Nenhum disco escolhido', 'No record picked')))),
    board: () => h('div', { class: 'mu-crate' }, crate.map((so) => {
      const rel = so.releaseId ? s.releases[so.releaseId] : undefined;
      const act = s.acts[so.actId];
      const obscure = (rel?.totalUnits ?? 0) < 20000;
      return h('article', { class: `mu-record ${st.pick === so.id ? 'on' : ''}`, style: `--hue:${(so.id.charCodeAt(so.id.length - 1) * 47) % 360}` },
        h('div', { class: 'mu-sleeve', 'aria-hidden': 'true' }),
        h('b', null, so.title), h('small', null, `${act?.name ?? ''} · ${rel?.year ?? ''}`), h('small', { class: 'muted' }, `${genreName(so.genre)} · ${N(rel?.totalUnits ?? 0)}`),
        pill(obscure ? t(l('obscuro', 'obscure')) : t(l('clássico', 'classic')), obscure ? '' : 'warn'),
        h('div', { class: 'row' }, playBtn(() => buildSongSpec(s, so, { seconds: 8, chorusFirst: true })),
          h('button', { class: `btn small ${st.pick === so.id ? 'primary' : ''}`, 'aria-pressed': st.pick === so.id ? 'true' : 'false', onclick: () => { st.pick = so.id; redrawGame(f); } }, t(l('Escolher', 'Pick')))));
    })),
    auto: () => wrapDig(autoDig(s, rngOf(s), song.id)),
    confirm: () => (st.pick ? wrapDig(digRecord(s, rngOf(s), song.id, st.pick)) : l('Escolha um disco.', 'Pick a record.')),
    done: (res) => {
      const r = res as { status?: string };
      if (r?.status === 'denied') toast(t(l('O detentor NEGOU o sample. Usar mesmo assim pode dar processo.', 'The holder DENIED the sample. Using it anyway may lead to a lawsuit.')), 'bad');
      else if (r?.status === 'uncleared') toast(t(l('Sem caixa para liberar: sample não liberado (risco jurídico).', 'No cash to clear it: sample uncleared (legal risk).')), 'bad');
    },
  };
  openGame(f);
}

function wrapDig(res: ReturnType<typeof digRecord>) {
  if (isErr(res)) return res;
  return { score: res.brk, status: res.status, deltas: {} };
}

void breakScore;
