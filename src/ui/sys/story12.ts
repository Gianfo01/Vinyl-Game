// Rodada 12: "História do selo" — aba no Catálogo e cena no fim da partida. Gráficos de receita/lucro e
// de reputação/fama do elenco, linha do tempo por década (lançamentos, picos, crises, decisões, vida
// pessoal), arcos dos artistas e pessoas-chave. Lê tudo de labelStory (sim/sys/story12).

import './story12.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { labelStory, type LabelStory, type Tone } from '../../sim/sys/story12';
import type { GameState } from '../../sim/types';
import { $, actLink, pill, rerender, section } from '../common';
import { openRelease } from '../ficha';
import { h } from '../dom';
import { openScene, registerTab } from '../registry';
import { chips, stat } from '../vis';

const TONE: Record<Tone, [L, string, string]> = {
  peak: [l('Picos', 'Peaks'), '▲', 'good'], crisis: [l('Crises', 'Crises'), '▼', 'bad'], release: [l('Lançamentos', 'Releases'), '●', ''],
  decision: [l('Decisões e arcos', 'Decisions and arcs'), '◆', ''], people: [l('Pessoas', 'People'), '♪', ''], life: [l('Vida pessoal', 'Personal life'), '♥', 'warn'],
};
let off: Partial<Record<Tone, 1>> = {};
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (w: number, hg: number, inner: string): HTMLElement => {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hg}`);
  svg.setAttribute('class', 'chart');
  svg.setAttribute('role', 'img');
  svg.innerHTML = inner;
  return svg as unknown as HTMLElement;
};

function revenueChart(st: LabelStory): HTMLElement | null {
  const rs = st.revenue;
  if (rs.length < 2) return null;
  const W = 600; const H = 160; const pad = 22;
  const max = Math.max(1, ...rs.map((x) => Math.max(x.v, x.p)));
  const min = Math.min(0, ...rs.map((x) => x.p));
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad - 8);
  const bw = (W - 30) / rs.length;
  let s = `<line x1="28" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>`;
  rs.forEach((x, i) => {
    const X = 30 + i * bw;
    const col = st.peak?.y === x.y ? 'var(--good)' : st.crisis?.y === x.y ? 'var(--bad)' : 'currentColor';
    s += `<rect x="${X + 1}" y="${Math.min(y(x.v), y(0))}" width="${Math.max(1, bw - 2)}" height="${Math.abs(y(0) - y(x.v))}" fill="${col}" opacity="0.75"><title>${x.y}: ${$(x.v)} / ${$(x.p)}</title></rect>`;
    if (i % Math.max(1, Math.ceil(rs.length / 10)) === 0) s += `<text x="${X}" y="${H - 6}">${x.y}</text>`;
  });
  s += `<polyline fill="none" stroke="var(--warn)" stroke-width="2" points="${rs.map((x, i) => `${30 + i * bw + bw / 2},${y(x.p)}`).join(' ')}"/>`;
  return h('div', null, svgEl(W, H, s), h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:var(--accent)' }), t(l('Receita', 'Revenue'))), h('span', null, h('i', { style: 'background:var(--warn)' }), t(l('Lucro', 'Profit'))),
    st.peak ? h('span', null, h('i', { style: 'background:var(--good)' }), t(l('Melhor ano: {y}', 'Best year: {y}'), { y: st.peak.y })) : null, st.crisis ? h('span', null, h('i', { style: 'background:var(--bad)' }), t(l('Pior ano: {y}', 'Worst year: {y}'), { y: st.crisis.y })) : null));
}

function repChart(st: LabelStory): HTMLElement | null {
  const sn = st.snaps;
  if (sn.length < 2) return h('p', { class: 'muted small' }, t(l('A curva de reputação e fama começa a ser desenhada no fim de cada ano.', 'The reputation and fame curve is drawn at the end of each year.')));
  const W = 600; const H = 140; const pad = 18;
  const x = (i: number) => 30 + (i / (sn.length - 1)) * (W - 40);
  const y = (v: number) => H - pad - (v / 100) * (H - pad - 6);
  const cols = ['var(--accent)', 'var(--good)', 'var(--warn)', 'var(--muted)', 'var(--bad)'];
  const series: [L, (i: number) => number][] = [[l('Artística', 'Artistic'), (i) => sn[i].rep[0]], [l('Comercial', 'Commercial'), (i) => sn[i].rep[1]], [l('Entre artistas', 'Among artists'), (i) => sn[i].rep[2]], [l('Institucional', 'Institutional'), (i) => sn[i].rep[3]], [l('Fama do elenco', 'Roster fame'), (i) => sn[i].fame]];
  let s = `<line x1="28" x2="${W}" y1="${y(50)}" y2="${y(50)}" stroke="var(--line)" stroke-dasharray="3 3"/>`;
  series.forEach(([, f], k) => { s += `<polyline fill="none" stroke="${cols[k]}" stroke-width="${k === 4 ? 2.5 : 1.5}" points="${sn.map((_, i) => `${x(i)},${y(f(i))}`).join(' ')}"/>`; });
  sn.forEach((p, i) => { if (i % Math.max(1, Math.ceil(sn.length / 10)) === 0) s += `<text x="${x(i) - 8}" y="${H - 4}">${p.y}</text>`; });
  return h('div', null, svgEl(W, H, s), h('div', { class: 'legend' }, series.map(([n], k) => h('span', null, h('i', { style: `background:${cols[k]}` }), t(n)))));
}

export function storyView(s: GameState, refresh: () => void = rerender): HTMLElement {
  const st = labelStory(s);
  const all = st.chapters.reduce((a, c) => a + c.items.length, 0);
  return h('div', { class: 'panel st12' },
    section(t(l('A história de {c}, {a}–{b}', 'The story of {c}, {a}–{b}'), { c: s.config.companyName, a: st.years[0], b: st.years[1] }),
      chips(stat('chart-up', st.counts.peak, l('Picos', 'Peaks')), stat('fire', st.counts.crisis, l('Crises', 'Crises')), stat('disc', st.counts.release, l('Lançamentos-marco', 'Landmark releases')),
        stat('flag', st.counts.decision, l('Decisões e arcos', 'Decisions and arcs')), stat('heart', st.counts.life, l('Vida pessoal', 'Personal life'))),
      h('h4', null, t(l('Receita e lucro por ano', 'Revenue and profit per year'))), revenueChart(st) ?? h('p', { class: 'muted small' }, t(l('O gráfico aparece depois do primeiro ano completo.', 'The chart appears after the first full year.'))),
      h('h4', null, t(l('Reputação e fama do elenco', 'Reputation and roster fame'))), repChart(st)),
    st.people.length ? section(t(l('Pessoas-chave', 'Key people')), h('div', { class: 'people' }, st.people.map((p) => h('div', { class: 'person' },
      p.id ? actLink(s, p.id) : h('b', null, p.name), h('small', null, t(p.role)), p.note ? h('small', { class: 'muted' }, t(p.note)) : null,
      p.w !== undefined && Math.abs(p.w) > 0.05 ? pill(t(p.w > 0 ? l('gratidão', 'gratitude') : l('mágoa', 'grudge')), p.w > 0 ? 'good' : 'bad') : null)))) : null,
    st.arcs.length ? section(t(l('Arcos dos artistas', 'Artist arcs')), h('ul', { class: 'small' }, st.arcs.map((a) => h('li', null, actLink(s, a.act), ' — ', h('i', null, t(a.title)), ` · ${a.n} ${t(l('capítulos', 'chapters'))} `,
      Math.abs(a.w) > 0.05 ? pill(`${a.w > 0 ? '+' : ''}${Math.round(a.w * 100)}`, a.w > 0 ? 'good' : 'bad') : null)))) : null,
    section(t(l('Linha do tempo', 'Timeline')),
      h('div', { class: 'filters' }, (Object.keys(TONE) as Tone[]).map((k) => h('button', { class: `btn small ${off[k] ? 'ghost' : ''}`, 'aria-pressed': off[k] ? 'false' : 'true', onclick: () => { if (off[k]) delete off[k]; else off[k] = 1; refresh(); } }, `${TONE[k][1]} ${t(TONE[k][0])} (${st.counts[k]})`))),
      all ? null : h('p', { class: 'muted' }, t(l('A história começa com o primeiro disco, a primeira decisão difícil, o primeiro artista que fica — ou vai embora.', 'The story begins with the first record, the first hard decision, the first act who stays — or leaves.'))),
      ...st.chapters.slice().reverse().map((c) => {
        const its = c.items.filter((x) => !off[x.tone]);
        if (!its.length) return null;
        return h('div', { class: 'chapter' }, h('h4', null, t(c.name), ' ', h('small', { class: 'muted' }, `${$(c.rev)}`)),
          h('ol', null, its.slice().reverse().slice(0, 60).map((x) => h('li', { class: `it ${x.tone}` }, h('b', null, String(x.y)),
            h('span', null, `${TONE[x.tone][1]} `, t(x.t), x.act && s.acts[x.act] ? h('span', null, ' · ', actLink(s, x.act)) : null),
            x.rel && s.releases[x.rel] ? h('a', { href: '#', onclick: (e: Event) => { e.preventDefault(); openRelease(x.rel!); } }, '↗') : h('span')))));
      })),
  );
}

/** Abre a história em tela cheia (botão do fim de jogo). */
export function openLabelStory(s: GameState): void {
  openScene(l('História do selo', 'Label story'), () => { const box = h('div'); const draw = (): void => { box.replaceChildren(storyView(s, draw)); }; draw(); return box; });
}

registerTab('catalogHub', { id: 'story12', label: l('História do selo', 'Label story'), icon: 'book', order: 54, render: (s) => storyView(s) });
