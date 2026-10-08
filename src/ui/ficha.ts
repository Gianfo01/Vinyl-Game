// Ficha unificada com cadeia de inspeção por IDs estáveis (GDD §24) + modal de oferta.

import { CONTRACT_MODELS, type ContractModel } from '../data/rules';
import { S, t } from '../i18n/strings';
import { defaultOffer, evaluateOffer, makeOffer } from '../sim/contracts';
import type { Act, GameState, Offer, Song } from '../sim/types';
import { $, N, actLink, cityName, cover, genreName, inspect, kv, labelLink, logo, modal, ownerName, pill, rerender, sparkline, strategyName, toast } from './common';
import { h, select } from './dom';
import { store } from './store';
import { money } from '../sim/util';
import { l } from '../data/world';
import { openActPage, openPersonPage } from './pages';

function g(): GameState {
  return store.game!;
}

export function openAct(id: string): void {
  openActPage(id);
}

export function openPerson(id: string): void {
  openPersonPage(id);
}

/** Extras por faixa na ficha do lançamento (rodada 4: botão de ouvir). */
export const RELEASE_SONG_EXTRAS: ((s: GameState, so: Song) => HTMLElement | null)[] = [];

export function openRelease(id: string): void {
  const s = g();
  const r = s.releases[id];
  if (!r) return;
  const mine = r.owner === 'player' || s.acts[r.actId]?.playerBand;
  const body = h('div', { class: 'ficha' },
    h('div', { class: 'ficha-head' }, cover(s, r, 120),
      h('div', null,
        h('h3', null, r.title, ' ', pill(r.type.toUpperCase()), r.certified ? pill(r.certified, 'gold') : null, r.reissueOf ? pill(t(l('reedição', 'reissue'))) : null),
        h('div', null, actLink(s, r.actId), ' · ', labelLink(s, r.owner), ` · ${r.year}`),
        kv(t(S.peak), r.peak < 999 ? `#${r.peak}` : '—'),
        kv(t(S.totalUnits), N(r.totalUnits)),
        mine ? kv(t(S.revenue), $(r.revenue)) : null,
        mine && r.pressed ? kv(t(S.stock), `${N(Math.max(0, r.stock))} / ${N(r.pressed)}`) : null,
        mine && r.shortage ? kv(t(S.shortage), N(r.shortage)) : null,
        h('div', null, sparkline(r.weekly.slice(-40), 220, 40)),
      ),
    ),
    r.songs.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(S.title)), h('th', null, 'Q'), h('th', null, t(S.melody)), h('th', null, t(S.lyrics)), h('th', null, t(S.performance)), h('th', null, t(S.production)), h('th', null, t(S.originality)))),
      h('tbody', null, r.songs.map((sid) => {
        const so = s.songs[sid];
        if (!so) return null;
        const show = (v: number) => (mine ? Math.round(v) : '~' + Math.round(v / 10) * 10);
        return h('tr', null, h('td', null, so.title, ' ', ...RELEASE_SONG_EXTRAS.map((f) => f(s, so))), h('td', null, h('b', null, show(so.q))), h('td', null, show(so.melody)), h('td', null, show(so.lyrics)), h('td', null, show(so.performance)), h('td', null, show(so.production)), h('td', null, show(so.originality)));
      })),
    ) : null,
    mine && r.autopsy ? h('div', null,
      h('h4', null, t(S.autopsy)),
      h('p', { class: 'muted small' }, t(S.autopsyNote)),
      h('table', { class: 'tbl compact' }, h('tbody', null, r.autopsy.map((f) => h('tr', null,
        h('td', null, t(f.label)),
        h('td', { class: f.value >= 1.1 ? 'good' : f.value <= 0.9 ? 'bad' : '' }, `×${f.value.toFixed(2)}`),
        h('td', null, pill(f.confidence === 'high' ? t(l('confiança alta', 'high confidence')) : f.confidence === 'medium' ? t(l('média', 'medium')) : t(l('baixa', 'low')))),
      )))),
      r.shortage > 0 ? h('p', { class: 'bad' }, t(l('Falta de estoque custou vendas: aumente a tiragem ou reprense.', 'Stock-outs cost sales: press more or repress.'))) : null,
    ) : null,
  );
  modal(r.title, body, { wide: true });
}

export function openLabel(id: string): void {
  const s = g();
  const lb = s.labels[id];
  if (!lb) return;
  const roster = lb.roster.map((x) => s.acts[x]).filter(Boolean).sort((a, b) => b.fame - a.fame);
  const body = h('div', { class: 'ficha' },
    kv(t(l('Família', 'Family')), lb.family),
    kv(t(l('Estratégia', 'Strategy')), strategyName(lb.strategy)),
    kv(t(S.city), cityName(lb.city)),
    kv(t(l('Fundação', 'Founded')), lb.founded),
    kv(t(l('Receita do último ano (pública)', 'Last year revenue (public)')), $(lb.revenueLastYear)),
    kv(t(l('Última decisão', 'Last decision')), t(lb.lastDecision) || '—'),
    h('h4', null, `${t(S.roster)} (${roster.length})`),
    h('div', { class: 'chips' }, roster.slice(0, 40).map((a) => actLink(s, a.id))),
  );
  modal(lb.name, body);
}

export function registerInspect(): void {
  inspect.act = openAct;
  inspect.person = openPerson;
  inspect.release = openRelease;
  inspect.label = openLabel;
}

// ---------- Oferta ----------
export function openOffer(actId: string): void {
  const s = g();
  const a = s.acts[actId];
  if (!a) return;
  const o: Omit<Offer, 'id' | 'week' | 'status'> = defaultOffer(s, a);
  const evalBox = h('div', { class: 'eval' });
  const update = () => {
    const ev = evaluateOffer(s, a, o);
    evalBox.replaceChildren(
      h('div', null, t(S.chance), ': ', pill(t(S[ev.band]), ev.band)),
      h('ul', { class: 'small' }, ev.reasons.map((x) => h('li', null, t(x)))),
      h('p', { class: 'muted small' }, (s.knowledge[actId]?.degree ?? 0) < 3 ? t(l('Você ainda não conhece as ambições do ato: a leitura é grosseira.', 'You do not yet know the act\'s ambitions: this read is rough.')) : ''),
    );
  };
  const num = (value: number, step: number, set: (v: number) => void, min = 0) =>
    h('input', { type: 'number', value, step, min, oninput: (e: Event) => { set(Number((e.target as HTMLInputElement).value)); update(); } });
  const unit = money(s, 1);
  const form = h('div', { class: 'form' },
    h('label', null, t(S.model), select(o.model, CONTRACT_MODELS.map((m) => ({ value: m.id, label: t(m.name) + (m.available ? '' : ' ' + t(S.phaseLater)), disabled: !m.available })), (v: ContractModel) => { o.model = v; update(); })),
    h('p', { class: 'muted small' }, t(CONTRACT_MODELS.find((m) => m.id === o.model)?.desc)),
    h('label', null, `${t(S.advanceAmt)} ($)`, num(Math.round(o.advance / 100), Math.max(10, Math.round(unit * 100 / 100)), (v) => (o.advance = Math.round(v * 100)))),
    h('label', null, `${t(S.royalty)} (%)`, num(Math.round(o.royalty * 100), 1, (v) => (o.royalty = v / 100))),
    h('label', null, `${t(S.distFee)} (%)`, num(Math.round((o.distributionFee ?? 0.2) * 100), 1, (v) => (o.distributionFee = v / 100))),
    h('label', null, `${t(S.share360)} (%)`, num(Math.round(o.share360 * 100), 5, (v) => (o.share360 = v / 100))),
    h('label', null, t(S.term), num(o.termMonths, 6, (v) => (o.termMonths = v), 6)),
    h('label', null, t(S.releasesOwed), num(o.releasesOwed, 1, (v) => (o.releasesOwed = v), 1)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.creativeControl, onchange: (e: Event) => { o.creativeControl = (e.target as HTMLInputElement).checked; update(); } }), t(S.creativeControl)),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: o.publishing, onchange: (e: Event) => { o.publishing = (e.target as HTMLInputElement).checked; update(); } }), t(S.publishing)),
    h('fieldset', null, h('legend', null, t(S.promises)),
      (['priority', 'tour', 'freedom'] as const).map((p) => h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; o.promises = on ? [...o.promises, p] : o.promises.filter((x) => x !== p); update(); } }), t(p === 'priority' ? S.promisePriority : p === 'tour' ? S.promiseTour : S.promiseFreedom))),
    ),
    evalBox,
  );
  update();
  let close = () => {};
  const actions = h('div', { class: 'actions' },
    h('button', { class: 'btn primary', onclick: () => {
      if (s.player.cash < o.advance) return toast(t(l('Caixa insuficiente para o adiantamento.', 'Not enough cash for the advance.')), 'bad');
      const res = makeOffer(s, o);
      if (res) {
        toast(t(l('Oferta enviada. Resposta no fechamento do mês.', 'Offer sent. Answer at month close.')), 'info');
        close();
        rerender();
      } else toast(t(l('Já existe oferta pendente.', 'There is already a pending offer.')), 'bad');
    } }, t(S.send)),
  );
  close = modal(`${t(S.offerTitle)}: ${a.name}`, h('div', null, form, actions));
}

export function actRow(s: GameState, a: Act): HTMLElement {
  return h('div', { class: 'act-row' }, logo(a, 28), actLink(s, a.id), h('span', { class: 'muted small' }, ` ${genreName(a.genre)} · ${ownerName(s, a.owner)}`));
}

