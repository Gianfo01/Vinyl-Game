// Interface da direção sonora (rodada 8): painel de eixos por faixa com a direção pretendida e quem
// puxou para onde, descrição curta e específica, encaixe por canal, som do disco na ficha (com o
// arco de energia da sequência e a coerência da capa), assinatura do artista e do selo.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { coverById, type CoverStyle } from '../../sim/covers';
import { PRODUCERS } from '../../sim/studio';
import { subOf, subRules } from '../../sim/sys/sound/subgenre';
import { timbreById } from '../../sim/sys/sound/timbre';
import {
  AXES, AXIS_INFO, MOMENTS, PRESETS, actAim, actTrademarks, subsView, actSignature, arrangementPull, bestWorst, clearSoundCache, cohesion, composeControl, coverFit, describeRelease,
  describeSong, labelSignature, naturalSound, outletName, recordControl, recordPulls, releaseSound, setActAim, setSongAim, snd, soundAppeal, soundOf,
  soundTags, type Pull, type Vec,
} from '../../sim/sys/sound';
import type { Act, GameState, Release, Song } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { RELEASE_EXTRAS, RELEASE_SONG_EXTRAS } from '../ficha';
import { ACT_OVERVIEW_EXTRAS } from '../pages';
import { REP_SONG_BODY } from '../panels/repertoire';
import { registerSection, registerTab } from '../registry';
import { store } from '../store';
import { chips, ic } from '../vis';
import './sound.css';

const ui = { songAim: '' };

// ------------------------------------------------------------------ peças visuais

/** Barras dos seis eixos; marca a direção pretendida (tracejado) e um perfil de comparação (fantasma). */
export function axisBars(v: Vec, opts: { aim?: number[]; ghost?: Vec; ghostLabel?: L; compact?: boolean } = {}): HTMLElement {
  return h('div', { class: `snd-axes ${opts.compact ? 'compact' : ''}`, role: 'list' },
    ...AXES.map((k, i) => {
      const info = AXIS_INFO[k];
      const aim = opts.aim?.[i];
      const ghost = opts.ghost?.[i];
      return h('div', { class: 'snd-row', role: 'listitem', 'aria-label': `${t(info.name)}: ${v[i]}` },
        h('span', { class: 'snd-name' }, t(info.name)),
        h('small', { class: 'snd-lo muted' }, t(info.lo)),
        h('span', { class: 'snd-track' },
          h('span', { class: 'snd-fill', style: `width:${v[i]}%` }),
          ghost !== undefined ? h('span', { class: 'snd-ghost', style: `left:${ghost}%`, title: opts.ghostLabel ? `${t(opts.ghostLabel)}: ${ghost}` : String(ghost) }) : null,
          aim !== undefined && aim >= 0 ? h('span', { class: 'snd-aim', style: `left:${aim}%`, title: `${t(l('Pretendido', 'Intended'))}: ${aim}` }) : null,
          h('span', { class: 'snd-dot', style: `left:${v[i]}%` })),
        h('small', { class: 'snd-hi muted' }, t(info.hi)),
        opts.compact ? null : h('b', { class: 'snd-val' }, v[i]));
    }));
}

/** "Quem puxou para onde": cada parcela com os dois eixos mais afetados. */
function pullList(parts: Pull[]): HTMLElement {
  const items = parts.map((p) => {
    const top = p.d.map((x, i) => ({ x, i })).filter((y) => Math.abs(y.x) >= 1.5).sort((a, b) => Math.abs(b.x) - Math.abs(a.x)).slice(0, 2);
    if (!top.length) return null;
    return h('li', null, h('b', null, t(p.label)), ': ', top.map((y) => `${y.x > 0 ? '+' : '−'}${t(y.x > 0 ? AXIS_INFO[AXES[y.i]].hi : AXIS_INFO[AXES[y.i]].lo)}`).join(', '));
  }).filter(Boolean) as HTMLElement[];
  return items.length ? h('ul', { class: 'snd-pulls small' }, items) : h('p', { class: 'muted small' }, t(l('Nada puxando forte: o som segue o gênero.', 'Nothing pulling hard: the sound follows the genre.')));
}

function fitChips(s: GameState, v: Vec, n = 3): HTMLElement {
  const { all } = bestWorst(s, v);
  const shown = [...all.slice(0, n), ...(all.length > n ? [all[all.length - 1]] : [])];
  return chips(...shown.map((x) => pill(`${t(outletName(s, x.id))} ${x.fit}`, x.fit >= 70 ? 'good' : x.fit < 45 ? 'bad' : '')));
}

function momentChips(so: Song): HTMLElement | null {
  const ms = so.sound?.m ?? [];
  return ms.length ? chips(h('small', { class: 'muted' }, t(l('Momento de quem compôs:', 'Writers\' moment:'))), ...ms.filter((m) => MOMENTS[m]).map((m) => pill(t(MOMENTS[m].name), 'warn'))) : null;
}

/** Linha curta para tabelas (sem o veredito de canais). */
function shortLine(s: GameState, so: Song): string {
  const full = t(describeSong(s, so));
  return full.split(';')[0];
}

// ------------------------------------------------------------------ painel de uma faixa

function sliders(aim0: number[], onChange: (a: number[]) => void): HTMLElement {
  const aim = AXES.map((_, i) => aim0[i] ?? -1);
  return h('div', { class: 'snd-sliders' }, ...AXES.map((k, i) => {
    const free = aim[i] < 0;
    return h('div', { class: 'snd-slider' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !free, onchange: (e: Event) => { const a = [...aim]; a[i] = (e.target as HTMLInputElement).checked ? 50 : -1; onChange(a); } }), t(AXIS_INFO[k].name)),
      h('small', { class: 'muted' }, t(AXIS_INFO[k].lo)),
      h('input', { type: 'range', min: 0, max: 100, step: 5, value: free ? 50 : aim[i], disabled: free, 'aria-label': t(AXIS_INFO[k].name), onchange: (e: Event) => { const a = [...aim]; a[i] = Number((e.target as HTMLInputElement).value); onChange(a); } }),
      h('small', { class: 'muted' }, t(AXIS_INFO[k].hi)),
      h('b', null, free ? '—' : aim[i]));
  }));
}

export function songSoundPanel(s: GameState, so: Song, opts: { edit?: boolean } = {}): HTMLElement {
  const v = soundOf(s, so);
  const act = s.acts[so.actId];
  const aim = so.sound?.a;
  const parts: Pull[] = [];
  if (act && !so.sound?.f) {
    if (so.recorded) parts.push(...recordPulls(s, so));
    parts.push(...arrangementPull(s, so));
  }
  const editing = opts.edit && !so.recorded && ui.songAim === so.id;
  return h('div', { class: 'snd-song' },
    h('p', { class: 'snd-desc' }, ic('note'), ' ', h('i', null, t(describeSong(s, so)))),
    axisBars(v, { aim }),
    momentChips(so),
    fitChips(s, v),
    parts.length ? h('details', null, h('summary', { class: 'small' }, t(l('Quem puxou o som na gravação e no arranjo', 'Who pulled the sound in recording and arrangement'))), pullList(parts)) : null,
    opts.edit && !so.recorded ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small ghost', onclick: () => { ui.songAim = editing ? '' : so.id; rerender(); } }, ic('sparkle'), ' ', t(editing ? l('Fechar direção', 'Close direction') : l('Direção para a gravação', 'Direction for recording'))),
      h('small', { class: 'muted' }, t(l('Na gravação, a direção pega ~{p}% (produtor de ego alto impõe a assinatura dele; minuciosa obedece mais).', 'At recording, direction takes ~{p}% (high-ego producers impose their signature; meticulous sessions obey more).'), { p: Math.round(recordControl(s, so) * 100) }))) : null,
    editing ? sliders(aim ?? [-1, -1, -1, -1, -1, -1], (a) => { const e = setSongAim(s, so.id, a); if (e) toast(t(e), 'bad'); rerender(); }) : null,
  );
}

// ------------------------------------------------------------------ aba Direção sonora

function curAct(s: GameState): Act | undefined {
  const ids = playerActs(s);
  if (!store.selectedAct || !ids.includes(store.selectedAct)) store.selectedAct = ids[0];
  return store.selectedAct ? s.acts[store.selectedAct] : undefined;
}

function directionTab(s: GameState): HTMLElement {
  const act = curAct(s);
  if (!act) return h('p', { class: 'muted' }, t(l('Sem artistas no selo.', 'No artists on the label.')));
  clearSoundCache();
  const ids = playerActs(s);
  const aim = actAim(s, act.id) ?? [-1, -1, -1, -1, -1, -1];
  const nat = naturalSound(s, act);
  const natV = nat.v.map((x) => Math.round(Math.max(0, Math.min(100, x))));
  const songs = act.songs.map((id) => s.songs[id]).filter((so): so is Song => !!so && !so.releaseId && !so.vault).slice(-12).reverse();
  const sig = actSignature(s, act);
  return h('div', { class: 'snd-tab' },
    section(t(l('Direção sonora de {a}', '{a}\'s sound direction'), { a: act.name }),
      ids.length > 1 ? select(act.id, ids.map((id) => ({ value: id, label: s.acts[id].name })), (v) => { store.selectedAct = v; rerender(); }, { 'aria-label': t(l('Artista', 'Artist')) }) : null,
      h('p', { class: 'muted small' }, t(l('Seis eixos que se ouvem: energia, densidade, acústico↔eletrônico, foco vocal, cru↔polido e experimentação. O gênero e a era dão o ponto de partida; instrumentos de quem toca, o momento de vida de quem compõe, o produtor, o estúdio e o arranjo puxam cada eixo. O som decide onde o disco funciona (rádio, clubes, pista, playlists…), o que cada crítico acha, se a capa combina e como o ato rende no palco.', 'Six audible axes: energy, density, acoustic↔electronic, vocal focus, raw↔polished and experimentation. Genre and era set the starting point; the players\' instruments, the writers\' life moment, the producer, the studio and the arrangement pull each axis. The sound decides where the record works (radio, clubs, dancefloor, playlists…), what each critic thinks, whether the cover fits and how the act does on stage.'))),
    ),
    section(t(l('Para onde o ato vai sozinho agora', 'Where the act goes on its own right now')),
      axisBars(natV, { aim, ghost: sig?.v, ghostLabel: l('Assinatura atual', 'Current signature') }),
      h('p', { class: 'small' }, h('i', null, soundTagsText(natV)), ' · ', t(l('marcador fantasma = assinatura dos discos; tracejado = sua direção', 'ghost marker = records\' signature; dashed = your direction'))),
      pullList(nat.parts),
      nat.moments.length ? chips(h('small', { class: 'muted' }, t(l('Momento de vida de quem compõe:', 'Writers\' life moment:'))), ...nat.moments.map((m) => pill(`${t(MOMENTS[m.code].name)} ${Math.round(m.k * 100)}%`, 'warn'))) : null,
    ),
    section(t(l('Direção pretendida ao compor', 'Intended direction when writing')),
      h('p', { class: 'muted small' }, t(l('Marque só os eixos que importam. Na composição, a banda segue sua direção ~{p}% (disciplina ajuda; espírito livre, ego e controle criativo no contrato resistem). Forçar muito contra a natureza do ato tira originalidade e estressa; pedir o que eles já são ajuda a melodia.', 'Tick only the axes that matter. When writing, the act follows your direction ~{p}% (discipline helps; free spirits, egos and creative control in the contract resist). Forcing hard against the act\'s nature costs originality and adds stress; asking for what they already are helps the melody.'), { p: Math.round(composeControl(s, act) * 100) })),
      h('div', { class: 'row wrap' }, ...PRESETS.map((p) => h('button', { class: 'chip-btn', onclick: () => { setActAim(s, act.id, p.v); rerender(); } }, t(p.name))),
        h('button', { class: 'btn small ghost', onclick: () => { setActAim(s, act.id, null); rerender(); } }, t(l('Livre (sem direção)', 'Free (no direction)')))),
      sliders(aim, (a) => { setActAim(s, act.id, a); rerender(); }),
    ),
    section(t(l('Faixas inéditas', 'Unreleased tracks')),
      songs.length ? h('div', { class: 'snd-songs' }, ...songs.map((so) => h('article', { class: 'snd-card' }, h('b', null, so.title, ' ', pill(t(so.recorded ? l('gravada', 'recorded') : l('escrita', 'written')))), songSoundPanel(s, so, { edit: true }))))
        : h('p', { class: 'muted small' }, t(l('Nenhuma faixa inédita. Coloque "Compor" na agenda.', 'No unreleased tracks. Add "Write songs" to the agenda.'))),
    ),
  );
}

const soundTagsText = (v: Vec): string => soundTags(v).map((x) => t(x)).join(', ') || t(l('equilibrado', 'balanced'));

// ------------------------------------------------------------------ ficha do lançamento

function releaseSoundBlock(s: GameState, r: Release): HTMLElement | null {
  const v = releaseSound(s, r);
  if (!v) return null;
  const desc = describeRelease(s, r);
  const act = s.acts[r.actId];
  const mine = r.owner === 'player' || !!act?.playerBand;
  const tracks = r.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x);
  const coh = cohesion(s, r);
  const cf = r.coverChoice ? coverFit(r.coverChoice, v) : null;
  const ap = mine && act ? soundAppeal(s, r, act) : null;
  return h('div', { class: 'snd-release' },
    h('h4', null, ic('note'), ' ', t(l('Som do disco', 'The record\'s sound'))),
    desc ? h('p', { class: 'snd-desc' }, h('i', null, t(desc))) : null,
    axisBars(v, { compact: true }),
    tracks.length >= 3 ? h('div', null, h('small', { class: 'muted' }, t(l('Arco de energia na sequência', 'Energy arc across the running order'))),
      h('div', { class: 'snd-arc', role: 'img', 'aria-label': t(l('Energia por faixa', 'Energy per track')) }, ...tracks.map((so, i) => { const e = soundOf(s, so)[0]; return h('i', { style: `height:${Math.max(6, e)}%`, title: `${i + 1}. ${so.title}: ${e}` }); }))) : null,
    chips(
      coh !== null ? pill(t(coh < 8 ? l('faixas parecidas demais', 'tracks too alike') : coh > 20 ? l('sequência dispersa', 'scattered running order') : l('sequência bem amarrada', 'well-knit running order')), coh > 20 ? 'bad' : coh < 8 ? 'warn' : 'good') : null,
      cf !== null && r.coverChoice ? pill(`${t(l('Capa', 'Cover'))} ${t(coverById[r.coverChoice as CoverStyle]?.name ?? l('?'))}: ${t(cf > 0.3 ? l('combina com o som', 'fits the sound') : cf < -0.1 ? l('contradiz o som', 'contradicts the sound') : l('neutra', 'neutral'))}`, cf > 0.3 ? 'good' : cf < -0.1 ? 'bad' : '') : null,
    ),
    fitChips(s, v, 4),
    ap && ap.parts.length ? h('ul', { class: 'small snd-effects' }, ...ap.parts.map((p) => h('li', { class: p.m > 1.005 ? 'good' : p.m < 0.995 ? 'bad' : '' }, `${t(p.label)}: ×${p.m.toFixed(2)}`))) : null,
  );
}

RELEASE_EXTRAS.push(releaseSoundBlock);
RELEASE_SONG_EXTRAS.push((s, so) => h('small', { class: 'snd-line muted', title: t(describeSong(s, so)) }, shortLine(s, so)));

// ------------------------------------------------------------------ repertório

REP_SONG_BODY.push((s, so, open) => {
  if (!open) return h('p', { class: 'snd-desc small' }, ic('note'), ' ', h('i', null, t(describeSong(s, so))));
  return songSoundPanel(s, so, { edit: true });
});

// ------------------------------------------------------------------ assinatura do artista

ACT_OVERVIEW_EXTRAS.push((s, a, deg, mine) => {
  if (!mine && deg < 2) return null;
  const sig = actSignature(s, a);
  if (!sig) return null;
  const changed = sig.first && sig.last && sig.n >= 3 ? AXES.map((k, i) => ({ k, d: sig.last![i] - sig.first![i] })).filter((x) => Math.abs(x.d) >= 10).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 3) : [];
  const lead = a.releases.map((id) => s.releases[id]).filter(Boolean).slice(-1)[0];
  const prods = [...new Set(a.releases.flatMap((id) => s.releases[id]?.songs ?? []).map((id) => s.songs[id]?.producerId).filter(Boolean))].map((id) => PRODUCERS.find((p) => p.id === id)?.name).filter(Boolean);
  return h('div', { class: 'snd-sig' },
    h('h4', null, ic('note'), ' ', t(l('Assinatura sonora', 'Sound signature')), ' ', h('small', { class: 'muted' }, `${sig.n} ${t(l('lançamentos', 'releases'))}`)),
    h('p', null, h('b', null, soundTagsText(sig.v)), lead ? h('span', { class: 'muted small' }, ` · ${t(l('último', 'latest'))}: "${lead.title}"`) : null),
    axisBars(sig.v, { ghost: sig.n >= 3 ? sig.first : undefined, ghostLabel: l('Início da carreira', 'Early career'), compact: true }),
    changed.length ? h('p', { class: 'small' }, t(l('Desde o começo: ', 'Since the start: ')), changed.map((x) => `${t(x.d > 0 ? AXIS_INFO[x.k].hi : AXIS_INFO[x.k].lo)} (${x.d > 0 ? '+' : ''}${x.d})`).join(', ')) : sig.n >= 3 ? h('p', { class: 'small muted' }, t(l('Som estável desde o começo.', 'Sound steady since the start.'))) : null,
    prods.length ? h('p', { class: 'small muted' }, t(l('Produtores: ', 'Producers: ')), prods.slice(0, 4).join(', ')) : null,
    actTrademarks(s, a.id).length ? h('p', { class: 'small' }, t(l('Timbres de assinatura: ', 'Signature timbres: ')), actTrademarks(s, a.id).map((x) => pill(t(timbreById[x].name), 'gold'))) : null,
    (() => { const sg = subOf(subsView(s), a.id); return sg ? h('p', { class: 'small' }, t(l('Subgênero: ', 'Subgenre: ')), pill(t(sg.name)), ' ', h('span', { class: 'muted' }, t(subRules(sg)))) : null; })(),
    fitChips(s, sig.v),
  );
});

// ------------------------------------------------------------------ assinatura do selo (área Empresa)

registerSection('company', {
  id: 'sound-label',
  order: 40,
  render: (s) => {
    const lb = labelSignature(s);
    if (!lb.n) return section(t(l('Assinatura sonora do selo', 'Label sound signature')), h('p', { class: 'muted small' }, t(l('Aparece depois do primeiro lançamento.', 'Appears after the first release.'))));
    const st = snd(s);
    const hist = lb.hist.slice(-12);
    const mineActs = playerActs(s).map((id) => s.acts[id]).filter((a) => st.sig[a.id]);
    return section(t(l('Assinatura sonora do selo', 'Label sound signature')),
      h('p', null, h('b', null, soundTagsText(lb.v)), h('span', { class: 'muted small' }, ` · ${lb.n} ${t(l('lançamentos', 'releases'))}`)),
      axisBars(lb.v, { ghost: hist[0]?.v, ghostLabel: hist[0] ? l(`Selo em ${hist[0].y}`, `Label in ${hist[0].y}`) : undefined }),
      h('p', { class: 'muted small' }, t(l('Discos perto da assinatura do selo ganham um pouco de apelo (público reconhece a marca); um ato que muda de som de repente perde fãs antigos, mas a crítica pode premiar a reinvenção.', 'Records close to the label signature gain a little appeal (the audience recognizes the brand); an act that suddenly changes sound loses old fans, though critics may reward the reinvention.'))),
      hist.length >= 2 ? h('table', { class: 'tbl compact snd-hist' },
        h('thead', null, h('tr', null, h('th', null, t(l('Ano', 'Year'))), ...AXES.map((k) => h('th', { title: t(AXIS_INFO[k].name) }, t(AXIS_INFO[k].name).split(' ')[0])))),
        h('tbody', null, ...hist.map((x) => h('tr', null, h('td', null, x.y), ...x.v.map((y) => h('td', null, h('span', { class: 'snd-mini', style: `--v:${y}%` }), ` ${y}`)))))) : null,
      mineActs.length ? h('ul', { class: 'small' }, ...mineActs.map((a) => h('li', null, h('b', null, a.name), `: ${soundTagsText(st.sig[a.id].v)}`))) : null,
    );
  },
});

registerTab('creation', { id: 'cr-sound', label: l('Direção sonora', 'Sound direction'), icon: 'note', render: directionTab, order: 60 });
