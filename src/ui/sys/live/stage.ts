// Interface de palco: notas dos shows por turnê, ingressos/cambistas, mini-jogo da curva do setlist
// e o show ao vivo (cena com público em pixel art, medidor de energia e cartas de resposta).

import { l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  INCIDENTS, applySetlistOrder, autoLiveEnergy, autoOrder, avgNotes, curveFor, dynamicPricingAvailable, finishLiveShow, idealEnergy, liveOf, resolveCard, songEnergy,
  type Incident,
} from '../../../sim/sys/live';
import type { GameState } from '../../../sim/types';
import { $, N, actLink, cityName, pill, rerender, section, toast } from '../../common';
import { h } from '../../dom';
import { C, Px } from '../../pixel/px';
import { openScene, registerCutscene, registerSection } from '../../registry';
import { store } from '../../store';
import { chips, ic, meter, stat } from '../../vis';
import { drawPerson } from './art';

void $;

// ---------------------------------------------------------------- notas dos shows

function notesSection(s: GameState): HTMLElement | null {
  const lv = liveOf(s);
  const tours = s.tours.filter((x) => (lv.notes[x.id]?.length ?? 0) > 0 || x.status === 'planned' || x.status === 'running').slice(-6).reverse();
  const mine = tours.filter((x) => s.acts[x.actId]?.owner === 'player' || s.acts[x.actId]?.playerBand);
  if (!mine.length) return null;
  return section(t(l('Notas dos shows', 'Show ratings')),
    h('p', { class: 'muted small' }, t(l('Cada show recebe empolgação (produção, setlist, lotação), intensidade (porte e produção) e cansaço (duração e fadiga). Empolgação alta vira fãs fiéis e reputação.', 'Every show gets excitement (production, setlist, sell-through), intensity (size and production) and fatigue (length and tiredness). High excitement turns into loyal fans and reputation.'))),
    mine.map((tr) => {
      const notes = lv.notes[tr.id] ?? [];
      const avg = avgNotes(notes);
      const curve = lv.curves[tr.id];
      const open = tr.status === 'planned' || tr.status === 'running';
      return h('div', { class: 'lv-tour-notes' },
        h('header', null, ic('tour-bus'), ' ', h('b', null, tr.name), ' ', actLink(s, tr.actId), ' ',
          curve ? pill(t(l('Setlist {n}/100 (+{b}%)', 'Setlist {n}/100 (+{b}%)'), { n: curve.score, b: Math.round(curve.bonus * 100) }), curve.score >= 70 ? 'good' : '') : null,
          open && tr.setlist.length >= 2 ? h('button', { class: 'btn small', onclick: () => openSetlistGame(s, tr.id) }, ic('note'), ' ', t(l('Curva do setlist', 'Setlist curve'))) : null),
        notes.length ? h('div', null,
          meter('fire', l('Empolgação média', 'Avg. excitement'), avg.ex),
          meter('sparkle', l('Intensidade média', 'Avg. intensity'), avg.int),
          meter('sleep', l('Cansaço médio', 'Avg. fatigue'), avg.fat, 100, true),
          h('table', { class: 'tbl compact' },
            h('thead', null, h('tr', null, ...[l('Cidade', 'City'), l('Público', 'Crowd'), l('Empolg.', 'Excit.'), l('Intens.', 'Inten.'), l('Cansaço', 'Fatigue'), l('Notícia', 'News')].map((x) => h('th', null, t(x))))),
            h('tbody', null, notes.slice(-10).reverse().map((n) => h('tr', null,
              h('td', null, cityName(n.cityId)), h('td', null, `${N(n.sold)}/${N(n.cap)}`),
              h('td', { class: n.ex >= 75 ? 'good' : n.ex < 35 ? 'bad' : '' }, String(n.ex)), h('td', null, String(n.int)), h('td', { class: n.fat >= 60 ? 'bad' : '' }, String(n.fat)),
              h('td', null, n.soldOutMin ? t(l('esgotou em {m} min', 'sold out in {m} min'), { m: n.soldOutMin }) : ''))))),
        ) : h('p', { class: 'small muted' }, t(l('Ainda sem shows tocados.', 'No shows played yet.'))),
      );
    }),
  );
}

function ticketsSection(s: GameState): HTMLElement {
  const lv = liveOf(s);
  const dyn = dynamicPricingAvailable(s);
  return section(t(l('Ingressos e cambistas', 'Tickets and scalpers')),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: lv.tickets.vip, onchange: (e: Event) => { lv.tickets.vip = (e.target as HTMLInputElement).checked; rerender(); } }),
      t(l('Ingresso VIP em teatros, arenas e estádios (+6% de bilheteria, fãs fiéis)', 'VIP tickets at theatres, arenas and stadiums (+6% box office, loyal fans)'))),
    dyn ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: lv.tickets.dynamic, onchange: (e: Event) => { lv.tickets.dynamic = (e.target as HTMLInputElement).checked; rerender(); } }),
      t(l('Preço dinâmico (era digital): acompanha a procura e tira o lucro dos cambistas, mas irrita os fãs', 'Dynamic pricing (digital era): follows demand and cuts out scalpers, but annoys fans')),
    ) : null,
    h('p', { class: 'small muted' }, t(l('No Brasil vale a meia-entrada: estudantes e idosos pagam metade (−15% na bilheteria média). Shows que esgotam em minutos viram notícia; sem preço dinâmico, cambistas revendem pelo triplo e a imagem do artista sofre.', 'In Brazil, half-price entry applies: students and seniors pay half (−15% average box office). Shows that sell out in minutes make the news; without dynamic pricing, scalpers resell at triple and the act\'s image suffers.'))),
  );
}

registerSection('shows', { id: 'live-notes', order: 30, render: (s) => notesSection(s) });
registerSection('shows', { id: 'live-tickets', order: 35, render: (s) => ticketsSection(s) });

// ---------------------------------------------------------------- curva do setlist

function curveSvg(energies: number[]): HTMLElement {
  const n = energies.length;
  const W = 320;
  const H = 110;
  const x = (i: number) => (n <= 1 ? W / 2 : 10 + (i / (n - 1)) * (W - 20));
  const y = (v: number) => H - 8 - (v / 100) * (H - 16);
  const ideal = Array.from({ length: n }, (_, i) => `${x(i)},${y(idealEnergy(i, n))}`).join(' ');
  const real = energies.map((e, i) => `${x(i)},${y(e)}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'lv-curve');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t(l('Curva de energia do show (linha cheia) e curva ideal (tracejada)', 'Show energy curve (solid) and ideal curve (dashed)')));
  svg.innerHTML = `<polyline points="${ideal}" fill="none" stroke="currentColor" stroke-dasharray="4 3" opacity="0.45" stroke-width="2"/>
<polyline points="${real}" fill="none" stroke="var(--accent)" stroke-width="3"/>
${energies.map((e, i) => `<circle cx="${x(i)}" cy="${y(e)}" r="3.5" fill="var(--accent)"/>`).join('')}`;
  return svg as unknown as HTMLElement;
}

export function openSetlistGame(s: GameState, tourId: string): void {
  const tr = s.tours.find((x) => x.id === tourId);
  if (!tr) return;
  let order = [...tr.setlist].filter((id) => s.songs[id]);
  openScene(l('Curva do setlist', 'Setlist curve'), (close) => {
    const root = h('div', { class: 'lv-setlist' });
    const draw = (focus?: number) => {
      const res = curveFor(s, order);
      root.replaceChildren(
        h('p', { class: 'muted small' }, t(l('Ordene as músicas para desenhar a curva: abrir forte, respiro no meio, clímax e um bis marcante. A nota vira bônus (até +10%) nos próximos shows da turnê.', 'Order the songs to draw the curve: strong opener, a breather in the middle, a climax and a memorable encore. The rating becomes a bonus (up to +10%) for the tour\'s next shows.'))),
        curveSvg(res.energies),
        chips(stat('star', `${res.score}/100`, l('Nota da curva', 'Curve rating'), res.score >= 70 ? 'good' : res.score < 45 ? 'bad' : ''), stat('chart-up', `+${Math.round(res.bonus * 100)}%`, l('Bônus nos próximos shows', 'Bonus for next shows'))),
        h('ul', { class: 'small' }, res.why.map((w) => h('li', null, t(w)))),
        h('ol', { class: 'lv-songs' }, order.map((id, i) => {
          const song = s.songs[id];
          const e = songEnergy(song);
          return h('li', null,
            h('span', { class: 'lv-energy', style: `--e:${e}%`, title: t(l('Energia {e}', 'Energy {e}'), { e }) }),
            h('b', null, song.title), h('small', { class: 'muted' }, ` · ${t(l('energia', 'energy'))} ${e}`),
            h('span', { class: 'row' },
              h('button', { class: 'btn small ghost', disabled: i === 0, 'aria-label': t(l('Subir {m}', 'Move {m} up'), { m: song.title }), 'data-f': `u${i}`, onclick: () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; draw(i - 1); } }, '▲'),
              h('button', { class: 'btn small ghost', disabled: i === order.length - 1, 'aria-label': t(l('Descer {m}', 'Move {m} down'), { m: song.title }), 'data-f': `d${i}`, onclick: () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; draw(i + 1); } }, '▼')));
        })),
        h('div', { class: 'row' },
          h('button', { class: 'btn', onclick: () => { order = autoOrder(s, order); draw(); } }, ic('bulb'), ' ', t(l('Resolver automático', 'Auto-resolve'))),
          h('button', { class: 'btn primary', onclick: () => {
            const r = applySetlistOrder(s, tourId, order);
            if ('pt' in r) return toast(t(r), 'bad');
            toast(t(l('Setlist aplicado: nota {n}.', 'Setlist applied: rating {n}.'), { n: r.score }), 'good');
            close();
          } }, ic('note'), ' ', t(l('Aplicar à turnê', 'Apply to the tour'))),
        ),
      );
      if (focus !== undefined) (root.querySelector(`[data-f="u${focus}"]`) as HTMLElement | null ?? root.querySelector(`[data-f="d${focus}"]`) as HTMLElement | null)?.focus();
    };
    if (store.prefs.minigames === 'auto') order = autoOrder(s, order);
    draw();
    return root;
  }, { onClose: () => rerender() });
}

// ---------------------------------------------------------------- show ao vivo

function crowdCanvas(energyRef: { v: number }, tier: number, year: number): HTMLCanvasElement {
  const W = 160;
  const H = 72;
  const c = h('canvas', { class: 'px lv-live', width: W, height: H, role: 'img', 'aria-label': t(l('Palco e público', 'Stage and crowd')) });
  const ctx = c.getContext('2d');
  const n = 40 + tier * 25;
  const ppl = Array.from({ length: n }, (_, i) => ({ x: (i * 37) % (W - 4), y: 34 + ((i * 13) % 34), seed: i * 31 + 7 }));
  ppl.sort((a, b) => a.y - b.y);
  let f = 0;
  const lightCols = year >= 1980 ? ['#e04848', '#4a8ae0', '#f0c040', '#a05ad0'] : ['#f0c040', '#f8f4ec'];
  const paint = () => {
    if (!ctx) return;
    const p = new Px(W, H);
    p.rect(0, 0, W, H, C('#120e18'));
    // palco
    p.rect(30, 14, 100, 14, C('#3a2a2a'));
    p.rect(30, 12, 100, 2, C('#c04848'));
    for (let i = 0; i < 4; i++) {
      const col = C(lightCols[(i + Math.floor(f / 15)) % lightCols.length], 90);
      const lx = 40 + i * 26;
      p.poly([[lx, 2], [lx - 8 - energyRef.v / 10, 28], [lx + 8 + energyRef.v / 10, 28]], col);
    }
    for (let i = 0; i < 4; i++) drawPerson(p, 50 + i * 18, 20, i * 101 + 3, f % 30 < 15);
    const jump = energyRef.v / 100;
    for (const q of ppl) {
      const up = (f + q.seed) % 24 < 12 * jump ? 1 : 0;
      drawPerson(p, q.x, q.y - up, q.seed, energyRef.v > 60 && (f + q.seed) % 30 < 15);
    }
    ctx.putImageData(new ImageData(new Uint8ClampedArray(p.d.buffer.slice(0)), W, H), 0, 0);
  };
  const loop = () => {
    if (!c.isConnected && f > 2) return;
    f += 1;
    if (f % 3 === 0) paint();
    requestAnimationFrame(loop);
  };
  paint();
  if (!store.prefs.reducedMotion) requestAnimationFrame(loop);
  return c;
}

function pickIncidents(): Incident[] {
  const pool = [...INCIDENTS];
  const out: Incident[] = [];
  for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

registerCutscene('liveShow', (s, cs, close) => {
  const d = cs.data as { key: string; actId: string; cityId: string; tier: number; sold: number; cap: number; ex: number };
  const act = s.acts[d.actId];
  const energy = { v: Math.round(20 + d.ex * 0.5) };
  const incidents = pickIncidents();
  let step = 0;
  const log: string[] = [];
  const body = h('div', { class: 'lv-live-body', 'aria-live': 'polite' });
  const meterBox = h('div');
  const done = (final: number, auto: boolean) => {
    const res = finishLiveShow(s, d.key, d.actId, d.sold, final);
    meterBox.replaceChildren(meter('fire', l('Energia do público', 'Crowd energy'), final));
    body.replaceChildren(
      h('h4', null, final >= 85 ? t(l('Noite lendária!', 'A legendary night!')) : final >= 60 ? t(l('Grande show!', 'Great show!')) : final >= 40 ? t(l('Show correto.', 'A decent show.')) : t(l('Noite difícil.', 'A rough night.'))),
      auto ? h('p', { class: 'small muted' }, t(l('Resolvido automaticamente pelos atributos da banda.', 'Resolved automatically from the band\'s attributes.'))) : '',
      h('ul', { class: 'small' }, log.map((x) => h('li', null, x))),
      res ? h('p', null, t(l('Efeito: {b}% de fãs novos sobre o público, fama e reputação.', 'Effect: {b}% new fans over the crowd, fame and reputation.'), { b: Math.round(res.bonus * 100) })) : h('p', { class: 'muted' }, t(l('Este show já foi resolvido.', 'This show was already resolved.'))),
      h('button', { class: 'btn primary', onclick: () => { rerender(); close(); } }, t(l('Fechar', 'Close'))),
    );
  };
  const draw = () => {
    meterBox.replaceChildren(meter('fire', l('Energia do público', 'Crowd energy'), energy.v));
    if (step >= incidents.length) return done(energy.v, false);
    const inc = incidents[step];
    body.replaceChildren(
      h('p', { class: 'lv-incident' }, ic('warning'), ' ', h('b', null, t(inc.text))),
      h('div', { class: 'lv-cards' }, inc.cards.map((card) => {
        const chance = resolveCard(s, d.actId, card, 0).chance;
        return h('button', { class: 'lv-card', onclick: () => {
          const r = resolveCard(s, d.actId, card, Math.random());
          energy.v = Math.max(0, Math.min(100, energy.v + r.delta));
          log.push(`${t(card.label)} → ${r.ok ? '✓' : '✗'} (${r.delta >= 0 ? '+' : ''}${r.delta})`);
          step += 1;
          draw();
          (body.querySelector('button') as HTMLElement | null)?.focus();
        } }, h('b', null, t(card.label)), h('small', null, t(card.hint)), h('small', { class: 'muted' }, t(l('Chance: {p}%', 'Chance: {p}%'), { p: Math.round(chance * 100) })));
      })),
      h('button', { class: 'btn ghost small', onclick: () => done(autoLiveEnergy(s, d.actId, d.ex), true) }, t(l('Resolver automático', 'Auto-resolve'))),
    );
  };
  const root = h('div', { class: 'lv-live-scene' },
    crowdCanvas(energy, d.tier, s.year),
    h('p', null, act ? actLink(s, act.id) : null, ' · ', cityName(d.cityId), ' · ', t(l('{n} pessoas', '{n} people'), { n: N(d.sold) })),
    meterBox,
    body,
  );
  if (store.prefs.minigames === 'auto') done(autoLiveEnergy(s, d.actId, d.ex), true);
  else draw();
  return root;
});
