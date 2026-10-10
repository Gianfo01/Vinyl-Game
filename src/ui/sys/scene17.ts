// Rodada 17 (J) — interface das cenas interativas: cartão com o local em pixel art (por época/porte/clima), as
// variações (cidade, hora, fama), as escolhas com dica e chance, e o desfecho com o porquê. Também: escolhas nos
// cartões de momento (moments16), discurso/reação nos Gramófonos e a página "Álbum de cenas" (rever cenas,
// fotos icônicas colecionáveis, marcar encontro, estatísticas).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Cutscene } from '../../sim/ext4';
import { awardScene17, momentScene17 } from '../../sim/sys/scenedefs17';
import { DEFS17, choose17, options17, pend17, photoAct17, result17, s17, startDate17, type Res17 } from '../../sim/sys/scene17';
import type { MomentRec16 } from '../../sim/sys/moments16';
import type { GameState } from '../../sim/types';
import { $, actLink, cityName, monthName, pill, rerender, section, toast } from '../common';
import { money } from '../../sim/util';
import { life } from '../../sim/sys/life';
import { h } from '../dom';
import { lookOf, randomLook } from '../pixel/avatar';
import { PLACE_NAMES, placeView, type Actor } from '../pixel/places';
import type { PlaceKind } from '../../sim/sys/scenes/state';
import { scene14 } from '../pixel/scenes14';
import { openCutscene, openScene, registerArea, registerCutscene } from '../registry';
import { ic } from '../vis';
import './scene17.css';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));

function actors(s: GameState, actId?: string | null, seed = 'x'): Actor[] {
  const a = actId ? s.acts[actId] : undefined;
  const out: Actor[] = [];
  const spots = ['main', 'side', 'extra'];
  (a ? a.members.map((id) => s.persons[id]).filter((p) => p?.alive) : []).slice(0, 3).forEach((p, i) => out.push({ look: lookOf(p), role: p.role, spot: spots[i], mark: i === 0 }));
  out.push({ look: randomLook(`s17:${seed}`), spot: 'host', dir: 'SW' });
  return out;
}

/** Quadro do local (estúdio usa o desenho do scenes14). */
export function view17(s: GameState, place: string, year: number, actId?: string | null, seed = 'x'): HTMLElement {
  if (place === 'studio') return scene14('studio_live', { year, size: 'card', spots: false });
  const pk = (PLACE_NAMES[place as PlaceKind] ? place : 'street') as PlaceKind;
  return placeView(pk, { year, actors: actors(s, actId, seed), energy: 0.7, alt: t(PLACE_NAMES[pk]), cls: 'scene-stage' });
}

function resBox(s: GameState, r: Res17): HTMLElement {
  const ph = r.photo ? s17(s).photos.find((p) => p.id === r.photo) : undefined;
  return h('div', { class: 's17-res', role: 'status' },
    h('p', { class: 'scene-result' }, r.ok ? null : h('b', null, `${t(l('Não saiu como planejado', 'It did not go as planned'))}: `), T(r.out)),
    r.lines.length ? h('ul', { class: 's17-fx small' }, r.lines.map((x) => h('li', null, T(x)))) : null,
    ph && !ph.kept ? photoRow(s, ph.id) : null);
}

function photoRow(s: GameState, id: string): HTMLElement {
  const box = h('div', { class: 'row wrap s17-photo' });
  const act = (how: 'keep' | 'license') => { const m = photoAct17(s, id, how); if (m) toast(t(m), 'good'); rerender(); box.replaceChildren(h('small', { class: 'muted' }, m ? t(m) : '')); };
  const ph = s17(s).photos.find((p) => p.id === id)!;
  box.append(ic('camera'), h('b', null, ` "${t(ph.title)}" `),
    h('button', { class: 'btn small', onclick: () => act('keep') }, t(l('Guardar no acervo', 'Keep in the archive'))),
    h('button', { class: 'btn small ghost', onclick: () => act('license') }, `${t(l('Licenciar', 'License'))} ~${$(money(s, ph.val))}`));
  return box;
}

/** Escolhas da cena (etapas), com chance visível; vira o desfecho ao final. */
export function choices17(s: GameState, key: string): HTMLElement {
  const box = h('div', { class: 's17-choices' });
  const paint = () => {
    const done = result17(s, key);
    if (done) return box.replaceChildren(resBox(s, done));
    const o = options17(s, key);
    if (!o) return box.replaceChildren();
    const p = pend17(s, key);
    const step = p ? DEFS17[p.def].stages.length : 1;
    box.replaceChildren(
      h('h4', null, T(o.q), step > 1 ? h('small', { class: 'muted' }, ` (${(p?.ctx.picks.length ?? 0) + 1}/${step})`) : null),
      h('div', { class: 'scene-choices' }, o.opts.map((x) => h('button', {
        class: 'btn', type: 'button', title: x.odds ? x.odds.why.map((w) => t(w)).join(' · ') : '',
        onclick: () => { const r = choose17(s, key, x.id); if (r.err) toast(t(r.err), 'bad'); paint(); if (!r.next) rerender(); },
      }, h('span', null, T(x.label), x.odds ? h('b', { class: 's17-odds' }, ` ${Math.round(x.odds.p * 100)}%`) : null), h('small', { class: 'muted' }, T(x.hint))))));
  };
  paint();
  return box;
}

registerCutscene('scene17', (s, cs, close) => {
  const key = String(cs.data.key ?? cs.id);
  const p = pend17(s, key);
  const r = result17(s, key);
  const place = p?.ctx.place ?? r?.place ?? String(cs.data.place ?? 'street');
  const vary = p?.vary ?? r?.vary ?? [];
  return h('div', { class: 'scene-frame s17' },
    view17(s, place, p?.ctx.year ?? r?.y ?? s.year, (cs.data.actId as string) ?? p?.ctx.act, key),
    vary.length ? h('p', { class: 's17-vary small muted' }, vary.map((v) => t(v)).join(' ')) : null,
    cs.data.text ? h('p', { class: 'scene-text' }, T(cs.data.text as L)) : null,
    p || r ? choices17(s, key) : h('p', { class: 'muted' }, t(l('Esta cena já passou.', 'This scene is over.'))),
    h('div', { class: 'row scene-close' }, h('button', { class: 'btn ghost', onclick: close }, t(l('Fechar', 'Close')))));
});

/** Escolhas extra para o cartão de momento (moments16): a cena vira interativa quando é sua e recente. */
export function momentChoices17(s: GameState, rec: MomentRec16): HTMLElement | null {
  const key = momentScene17(s, rec);
  if (!key) return null;
  const p = pend17(s, key);
  const r = result17(s, key);
  return h('div', { class: 's17-moment' }, p ? h('p', { class: 'small muted' }, [...p.vary, p.text].map((x) => t(x)).join(' ')) : null, r || p ? choices17(s, key) : null);
}

/** Discurso (ganhou) ou reação (perdeu) na cerimônia dos Gramófonos. */
export function awardChoices17(s: GameState, cs: Cutscene): HTMLElement | null {
  const key = awardScene17(s, cs);
  if (!key) return null;
  const p = pend17(s, key);
  return h('div', { class: 's17-moment' }, p ? h('p', { class: 'small muted' }, [...p.vary, p.text].map((x) => t(x)).join(' ')) : null, choices17(s, key));
}

// ---------------------------------------------------------------- Álbum de cenas

let filt = 'all';
function replay(s: GameState, r: Res17): void {
  openScene(r.title, (close) => h('div', { class: 'scene-frame s17' },
    view17(s, r.place, r.y, r.act, r.key),
    h('p', { class: 's17-vary small muted' }, `${monthName(r.m)} ${r.y} · `, r.vary.map((v) => t(v)).join(' ')),
    resBox(s, r),
    h('div', { class: 'row scene-close' }, h('button', { class: 'btn ghost', onclick: close }, t(l('Fechar', 'Close'))))));
}

function album(s: GameState): HTMLElement {
  const st = s17(s);
  const pend = Object.entries(st.pend).filter(([, p]) => p.cs);
  const kinds = [...new Set(st.book.map((b) => b.def))];
  const list = st.book.filter((b) => filt === 'all' || b.def === filt).slice().reverse();
  const photos = st.photos.slice().reverse();
  const byYear = new Map<number, Res17[]>();
  for (const r of list) { const xs = byYear.get(r.y) ?? []; xs.push(r); byYear.set(r.y, xs); }
  return h('div', { class: 'panel s17-page' },
    section(t(l('Álbum de cenas', 'Scene album')),
      h('p', { class: 'muted small' }, t(l('Cenas interativas só aparecem em momentos certos: prêmio (ganhar ou perder), shows marcantes, festival, mídia da época, estúdio, lançamento, assinatura, prisão, tribunal, funeral, casamento, nascimento, reabilitação, coletiva após escândalo, briga no camarim, conselho e encontros. Cada escolha muda fama regional, fãs, estresse, boatos e obrigações — e o porquê fica registrado aqui.', 'Interactive scenes only appear at the right moments: awards (win or lose), landmark shows, festivals, era media, studio, launches, signings, arrests, court, funerals, weddings, births, rehab, press conferences after scandals, backstage fights, board meetings and dates. Every choice changes regional fame, fans, stress, rumors and holds — and the why is recorded here.'))),
      h('div', { class: 'row wrap' },
        !life(s).partner ? h('button', { class: 'btn small', disabled: true, title: t(l('Encontros pedem um relacionamento: conheça alguém em Você › Noite e encontros.', 'Dates need a relationship: meet someone in You › Going out.')) }, ic('heart'), ` ${t(l('Marcar um encontro (sem relacionamento)', 'Plan a date (no relationship)'))}`) :
        h('button', { class: 'btn small primary', onclick: () => { const r = startDate17(s); if (typeof r === 'string') { const cs = (s.cutscenes ?? []).find((c) => c.id === r); if (cs) openCutscene(s, cs, rerender); } else toast(t(r), 'bad'); } }, ic('heart'), ` ${t(l('Marcar um encontro', 'Plan a date'))}`),
        pend.length ? pill(`${pend.length} ${t(l('cena(s) esperando sua escolha', 'scene(s) awaiting your choice'))}`, 'warn') : null),
      pend.length ? h('ul', { class: 'small' }, pend.map(([k, p]) => h('li', null, ic(DEFS17[p.def]?.icon ?? 'star'), ' ', t(p.title), ' ',
        h('button', { class: 'link', onclick: () => { const cs = (s.cutscenes ?? []).find((c) => c.id === k); if (cs) openCutscene(s, cs, rerender); } }, t(l('decidir agora', 'decide now'))),
        h('small', { class: 'muted' }, ` — ${t(l('sem resposta em 4 semanas, vale a última opção', 'no answer in 4 weeks means the last option'))}`)))) : null),
    section(t(l('Recortes', 'Clippings')),
      kinds.length > 1 ? h('div', { class: 'row wrap' }, ['all', ...kinds].map((k) => h('button', { class: `chip-btn ${filt === k ? 'on' : ''}`, onclick: () => { filt = k; rerender(); } }, k === 'all' ? t(l('Todas', 'All')) : t(DEFS17[k]?.name ?? l(k, k)), k !== 'all' ? ` (${st.st[k] ?? 0})` : ''))) : null,
      list.length ? h('div', { class: 's17-book' }, [...byYear.entries()].map(([y, rs]) => h('div', { class: 's17-year' }, h('h4', null, String(y)),
        h('ul', null, rs.map((r) => h('li', null,
          ic(DEFS17[r.def]?.icon ?? 'star'), ' ', h('b', null, t(r.title)), ` · ${monthName(r.m)}`, r.city ? ` · ${cityName(r.city)}` : '', ' — ', T(r.out), ' ',
          r.act && s.acts[r.act] ? actLink(s, r.act) : null, r.photo ? pill(t(l('foto', 'photo')), 'good') : null, ' ',
          h('button', { class: 'link small', onclick: () => replay(s, r) }, t(l('rever cena', 'replay scene'))))))))) : h('p', { class: 'muted' }, t(l('Nenhuma cena ainda. Elas chegam com a carreira.', 'No scenes yet. They come with the career.')))),
    section(t(l('Fotos icônicas', 'Iconic photos')),
      h('p', { class: 'muted small' }, t(l('Escolhas ousadas diante de câmeras podem virar foto histórica (fotógrafo da época). Guarde: fãs fiéis agora e nostalgia nos aniversários de 10 e 25 anos (o valor sobe). Licencie: dinheiro e alcance agora, mas a foto deixa de ser sua.', 'Bold choices in front of cameras can become historic photos (by an era photographer). Keep it: core fans now and nostalgia at 10 and 25-year anniversaries (value rises). License it: money and reach now, but it is no longer yours.'))),
      photos.length ? h('div', { class: 's17-photos' }, photos.map((ph) => h('div', { class: 'card s17-ph' },
        h('b', null, `"${t(ph.title)}"`), h('small', null, `${ph.y}${ph.city ? ` · ${cityName(ph.city)}` : ''} · ${t(ph.by)}`),
        ph.act && s.acts[ph.act] ? actLink(s, ph.act) : null,
        ph.kept === 1 ? pill(`${t(l('no acervo', 'in the archive'))} · ~${$(money(s, ph.val))}`, 'good') : ph.kept === 2 ? pill(t(l('licenciada', 'licensed'))) : photoRow(s, ph.id)))) : h('p', { class: 'muted small' }, t(l('Nenhuma foto icônica ainda.', 'No iconic photos yet.')))),
  );
}

registerArea({ id: 'scenes17', label: l('Álbum de cenas', 'Scene album'), icon: 'camera', key: '', render: album,
  badge: (s) => Object.values(s17(s).pend).filter((p) => p.cs).length || undefined });
