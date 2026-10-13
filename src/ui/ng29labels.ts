// Rodada 29 — cartão "Gravadoras no início" da Nova run completa (etapa 4, Gravadoras e rivais). O mesmo atalho da rápida
// (poucas / algumas / muitas / mercado lotado / padrão) e "até mais": número exato, reais × inventadas, porte, região,
// frequência de selos novos durante a run, fechamentos/fusões, incluir/excluir gravadoras reais e concorrentes da
// carreira. Tudo grava em cfg.labels29 pelo MESMO setter da rápida (setLabels29); "padrão" em tudo = campo ausente.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { realFounded } from '../data/realnames';
import { FREQS29, NAME_DEFAULT29, NS29, SIZES29, SPREADS29, VNS29, count29, eraCap29, setLabels29, statusAll29, ven29, venKind29, type Labels29 } from '../sim/labels29data';
import { careerOf29 } from '../sim/start29data';
import type { RunConfig } from '../sim/types';
import { labelPool } from '../sim/worldgen';
import { cityName } from './common';
import { h } from './dom';
import { helpTip } from './newgame13';
import { seg22, toggle22 } from './pick22';

const D = '';
export function labelsCard29(cfg: RunConfig, onChange: () => void, rebuild: () => void): HTMLElement {
  const x = (): Labels29 => cfg.labels29 ?? {};
  const set = (p: Partial<Labels29>, structural = false) => { setLabels29(cfg, p); drawTop(); onChange(); if (structural) rebuild(); };
  const top = h('p', { class: 'small' });
  const drawTop = () => {
    const n = count29(cfg);
    top.replaceChildren(h('b', null, t(statusAll29(cfg))), n === undefined ? '' : h('span', { class: 'muted' }, ` — ${t(l('{n} rivais no começo (a época comporta até {c} pelos atalhos).', '{n} rivals at the start (the era allows up to {c} via the shortcuts).'), { n, c: eraCap29(cfg.startYear) })}`));
  };
  drawTop();
  const exact = x().count !== undefined;
  // atalho + número exato
  const presets = seg22<string>(t(l('Gravadoras no início', 'Labels at the start')), [
    { value: D, name: t(l('Padrão', 'Default')), desc: t(NAME_DEFAULT29) },
    ...NS29.map((d) => ({ value: d.id as string, name: t(d.name) })),
    { value: 'exact', name: t(l('Número exato', 'Exact number')) },
  ], () => (exact ? 'exact' : x().n ?? D), (v) => {
    if (v === 'exact') set({ count: count29(cfg) ?? 12, n: undefined }, true);
    else set({ n: (v || undefined) as Labels29['n'], count: undefined }, true);
  });
  const out = h('b', { class: 'ng22-count' }, String(x().count ?? ''));
  const slider = exact ? h('div', { class: 'ng22-range' }, h('span', null, t(l('Gravadoras rivais no começo', 'Rival labels at the start'))),
    h('input', { type: 'range', min: 1, max: 60, step: 1, value: x().count, 'aria-label': t(l('Número exato de gravadoras', 'Exact number of labels')), id: 'ng29-count',
      oninput: (e: Event) => { out.textContent = (e.target as HTMLInputElement).value; },
      onchange: (e: Event) => set({ count: Number((e.target as HTMLInputElement).value) }) }), out) : null;
  // reais × inventadas
  const realOut = h('b', { class: 'ng22-count' }, `${x().real ?? 100}%`);
  const real = h('div', { class: 'ng22-range' }, h('span', null, t(l('Gravadoras reais', 'Real labels')), ' ', helpTip(l('As reais que existiam na data entram primeiro, pelo porte; se faltar gente (ou a % for menor), o resto é inventado com nomes e praças da época.', 'Real labels that existed at the date come first, by size; if there are not enough (or the % is lower), the rest is invented with era-style names and places.'))),
    h('input', { type: 'range', min: 0, max: 100, step: 10, value: x().real ?? 100, 'aria-label': t(l('Porcentagem de gravadoras reais', 'Share of real labels')), id: 'ng29-real',
      oninput: (e: Event) => { realOut.textContent = `${(e.target as HTMLInputElement).value}%`; },
      onchange: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); set({ real: v === 100 ? undefined : v }); } }), realOut);
  const fld = (name: L, el: HTMLElement) => h('div', { class: 'ng22-field' }, h('b', null, t(name)), el);
  const size = seg22<string>(t(l('Porte', 'Size')), SIZES29.map((d) => ({ value: d.id, name: t(d.name) })), () => x().size ?? 'mixed', (v) => set({ size: v === 'mixed' ? undefined : v as Labels29['size'] }));
  const spread = seg22<string>(t(l('Região', 'Region')), SPREADS29.map((d) => ({ value: d.id, name: t(d.name) })), () => x().spread ?? 'world', (v) => set({ spread: v === 'world' ? undefined : v as Labels29['spread'] }));
  const freq = seg22<string>(t(l('Selos novos durante a run', 'New labels during the run')), [
    { value: D, name: t(l('Como sempre', 'As usual')), desc: t(l('O ritmo de sempre (sem sorteio por ano).', 'The usual pace (no yearly roll).')) },
    ...FREQS29.map((d) => ({ value: d.id as string, name: t(d.name), desc: t(d.fx) }))], () => x().freq ?? D, (v) => set({ freq: (v || undefined) as Labels29['freq'] }));
  const life = toggle22(t(l('Gravadoras podem fechar e se fundir', 'Labels can close and merge')), t(l('Desligado: falência vira socorro e não há fusões entre rivais.', 'Off: bankruptcy becomes a bailout and rivals do not merge.')),
    () => x().life !== 'off', (v) => set({ life: v ? undefined : 'off' }));
  // incluir / excluir reais (busca, lista curta)
  const fy = (id: string, f: number) => (cfg.realNames ? realFounded(id, f) : f);
  const pool = labelPool().filter((d) => fy(d.id, d.founded) <= cfg.startYear);
  const nameOf = (d: (typeof pool)[number]) => (cfg.realNames && d.real ? d.real : d.name);
  let q = '';
  const list = h('div', { class: 'ng22-labels ng29-incl' });
  const drawList = () => {
    const inc = new Set(x().inc ?? []), exc = new Set(x().exc ?? []);
    const shown = pool.filter((d) => (q ? nameOf(d).toLowerCase().includes(q) || cityName(d.city).toLowerCase().includes(q) : inc.has(d.id) || exc.has(d.id))).slice(0, 12);
    const btn = (d: (typeof pool)[number], k: 'inc' | 'exc', lab: L) => {
      const on = (k === 'inc' ? inc : exc).has(d.id);
      return h('button', { type: 'button', class: `chip-btn ${on ? 'on' : ''}`, 'aria-pressed': String(on), 'data-l29': `${k}:${d.id}`, onclick: () => {
        const a = new Set(x().inc ?? []), b = new Set(x().exc ?? []);
        (k === 'inc' ? b : a).delete(d.id);
        const mine = k === 'inc' ? a : b;
        if (mine.has(d.id)) mine.delete(d.id); else mine.add(d.id);
        set({ inc: [...a], exc: [...b] }); drawList();
      } }, t(lab));
    };
    list.replaceChildren(...(shown.length ? shown.map((d) => h('div', { class: 'ng29-lrow' }, h('span', null, h('b', null, nameOf(d)), h('small', { class: 'muted' }, ` ${cityName(d.city)} · ${fy(d.id, d.founded)}`)),
      btn(d, 'inc', l('Incluir', 'Include')), btn(d, 'exc', l('Excluir', 'Exclude'))))
      : [h('p', { class: 'muted small' }, t(q ? l('Nada com essa busca.', 'Nothing for that search.') : l('Busque uma gravadora real para incluir ou excluir (até 12 resultados).', 'Search a real label to include or exclude (up to 12 results).')))]));
  };
  drawList();
  const search = h('input', { type: 'search', id: 'ng29-search', placeholder: t(l('Buscar gravadora real…', 'Search a real label…')), 'aria-label': t(l('Buscar gravadora real', 'Search a real label')),
    oninput: (e: Event) => { q = (e.target as HTMLInputElement).value.trim().toLowerCase(); drawList(); } });
  // concorrentes da carreira
  const vk = venKind29(careerOf29(cfg), cfg.startYear);
  const venOut = h('b', { class: 'ng22-count' }, String(ven29(cfg) ?? '—'));
  const ven = vk ? h('div', { class: 'ng22-field' }, h('b', null, t(l(`Concorrentes no início (${vk.pt[1]})`, `Competitors at the start (${vk.en[1]})`))),
    seg22<string>(t(l('Concorrentes no início', 'Competitors at the start')), [{ value: D, name: t(l('Padrão', 'Default')) }, ...VNS29.map((d) => ({ value: d.id as string, name: t(d.name) }))],
      () => (x().ven !== undefined ? D : x().vn ?? D), (v) => { set({ vn: (v || undefined) as Labels29['vn'], ven: undefined }); venOut.textContent = String(ven29(cfg) ?? '—'); }),
    h('div', { class: 'ng22-range' }, h('span', null, t(l('Número exato', 'Exact number'))),
      h('input', { type: 'range', min: 0, max: 12, step: 1, value: ven29(cfg) ?? 0, 'aria-label': t(l('Número exato de concorrentes', 'Exact number of competitors')),
        oninput: (e: Event) => { venOut.textContent = (e.target as HTMLInputElement).value; }, onchange: (e: Event) => set({ ven: Number((e.target as HTMLInputElement).value), vn: undefined }, true) }), venOut)) : null;
  const ignored = cfg.scenario17 ? h('p', { class: 'small muted' }, 'ⓘ ', t(l('Cenário histórico: as gravadoras são as do cenário (estas escolhas não valem).', 'Historical scenario: labels are the scenario\'s own (these choices do not apply).'))) : null;
  return h('section', { class: 'card wide ng29-labels' },
    h('h3', null, t(l('Gravadoras no início', 'Labels at the start')), ' ', helpTip(l('Quantas gravadoras rivais existem no começo, quais (reais primeiro, inventadas no estilo da época se faltar), de que porte e onde — e quantos selos novos aparecem durante a run (sorteado por ano, com ondas da época). Com isto ligado, a lista "Quantas e quais" abaixo é substituída.', 'How many rival labels exist at the start, which ones (real first, era-style invented ones if needed), what size and where — and how many new labels appear during the run (rolled per year, with era waves). With this on, the "How many and which" list below is replaced.'))),
    top, ignored, presets, slider, real,
    fld(l('Porte', 'Size'), size), fld(l('Região', 'Region'), spread), fld(l('Selos novos durante a run', 'New labels during the run'), freq), life,
    h('details', { class: 'ng29-incl-d' }, h('summary', { class: 'small' }, t(l('Incluir ou excluir gravadoras reais', 'Include or exclude real labels'))), search, list),
    ven);
}
