// Ficha unificada com cadeia de inspeção por IDs estáveis (GDD §24) + modal de oferta.

import { CONTRACT_MODELS, type ContractModel } from '../data/rules';
import { S, t } from '../i18n/strings';
import { acceptCounter, defaultOffer, evaluateOffer, offerNow, pressForAnswer, withdrawCounter } from '../sim/contracts';
import type { Act, GameState, Offer, Release, Song } from '../sim/types';
import { criticScore, fmtSecs, scoreClass, trackList } from '../sim/relinfo';
import { $, N, actLink, cityName, cover, genreName, inspect, kv, labelLink, logo, modal, ownerName, pill, rerender, sparkline, strategyName, toast } from './common';
import { h, select } from './dom';
import { store } from './store';
import { money, rngOf } from '../sim/util';
import { l } from '../data/world';
import { openActPage, openPersonPage } from './pages';
import { reviewCard, reviewSummary } from './reviewView';

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

/** Extras na ficha do lançamento (rodada 8: explicação do resultado, capa…). */
export const RELEASE_EXTRAS: ((s: GameState, r: Release) => HTMLElement | null)[] = [];

const TYPE_NAME: Record<string, ReturnType<typeof l>> = { single: l('Single', 'Single'), ep: l('EP', 'EP'), lp: l('Álbum (LP)', 'Album (LP)') };

export function openRelease(id: string): void {
  const s = g();
  const r = s.releases[id];
  if (!r) return;
  const mine = r.owner === 'player' || s.acts[r.actId]?.playerBand;
  const act = s.acts[r.actId];
  const tracks = trackList(s, r);
  const total = tracks.reduce((t, x) => t + x.secs, 0);
  const crit = criticScore(s, r);
  const producer = r.songs.map((x) => s.songs[x]?.producerId).find(Boolean);
  const writers = [...new Set(r.songs.flatMap((x) => s.songs[x]?.writers ?? []))].map((w) => s.persons[w]).filter(Boolean);
  const show = (v: number) => (mine ? Math.round(v) : '~' + Math.round(v / 10) * 10);
  const body = h('div', { class: 'ficha' },
    h('div', { class: 'ficha-head' }, cover(s, r, 140),
      h('div', null,
        h('h3', null, r.title, ' ', pill(t(TYPE_NAME[r.type] ?? l(r.type))), r.certified ? pill(r.certified, 'gold') : null, r.reissueOf ? pill(t(l('reedição', 'reissue'))) : null, r.hist ? pill(t(l('antes da run', 'before the run'))) : null),
        h('div', null, actLink(s, r.actId), ' · ', labelLink(s, r.owner), ` · ${r.year}`),
        h('div', { class: 'row wrap' },
          h('div', { class: `crit-badge ${scoreClass(crit.score)}`, title: crit.estimated ? t(l('Estimativa da imprensa da época (sem resenhas guardadas).', 'Period press estimate (no stored reviews).')) : t(l('Média de {n} resenhas.', 'Average of {n} reviews.'), { n: crit.n }) }, h('b', null, crit.score), h('small', null, crit.estimated ? t(l('crítica (est.)', 'critics (est.)')) : t(l('crítica', 'critics')))),
          kv(t(S.peak), r.peak < 999 ? `#${r.peak}` : '—'),
          kv(t(l('Semanas na parada', 'Weeks on chart')), r.weeksOnChart || '—'),
          kv(t(S.totalUnits), N(r.totalUnits)),
        ),
        mine ? kv(t(S.revenue), $(r.revenue)) : null,
        mine && r.pressed ? kv(t(S.stock), `${N(Math.max(0, r.stock))} / ${N(r.pressed)}`) : null,
        mine && r.shortage ? kv(t(S.shortage), N(r.shortage)) : null,
        r.weekly.length ? h('div', null, sparkline(r.weekly.slice(-40), 220, 40)) : null,
      ),
    ),
    h('div', { class: 'grid2' },
      h('div', null,
        kv(t(l('Gênero', 'Genre')), genreName(act?.genre ?? '')),
        kv(t(l('Duração', 'Length')), `${fmtSecs(total)} · ${tracks.length} ${t(l('faixas', 'tracks'))}`),
        kv(t(l('Formatos', 'Formats')), r.formats.length ? r.formats.join(', ') : '—'),
        kv(t(l('Mercados', 'Markets')), r.territories.join(', ').toUpperCase()),
      ),
      h('div', null,
        producer && s.persons[producer] ? kv(t(l('Produção', 'Producer')), s.persons[producer].name) : null,
        writers.length ? kv(t(l('Compositores', 'Writers')), writers.slice(0, 6).map((p) => p.name).join(', ')) : null,
        r.marketing.length ? kv(t(l('Divulgação', 'Promotion')), r.marketing.map((m) => m.channel).join(', ')) : null,
        r.kind && r.kind !== 'standard' ? kv(t(l('Edição', 'Edition')), r.kind) : null,
      ),
    ),
    h('h4', null, t(l('Faixas', 'Tracklist'))),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, t(S.title)), h('th', null, t(l('Duração', 'Length'))), h('th', null, 'Q'), h('th', null, t(S.melody)), h('th', null, t(S.lyrics)), h('th', null, t(S.performance)), h('th', null, t(S.production)), h('th', null, t(S.originality)))),
      h('tbody', null, tracks.map((tr) => {
        const so = tr.songId ? s.songs[tr.songId] : undefined;
        return h('tr', null, h('td', null, tr.n), h('td', null, tr.title, tr.single && r.type !== 'single' ? ' ' : '', tr.single && r.type !== 'single' ? pill(t(l('faixa de trabalho', 'lead single'))) : null, ' ', ...(so ? RELEASE_SONG_EXTRAS.map((f) => f(s, so)) : [])),
          h('td', null, fmtSecs(tr.secs)),
          so ? h('td', null, h('b', null, show(so.q))) : h('td', { class: 'muted' }, '—'),
          ...(so ? [so.melody, so.lyrics, so.performance, so.production, so.originality].map((v) => h('td', null, v > 0 ? show(v) : '—')) : [h('td', { class: 'muted', colspan: 5 }, t(l('sem ficha técnica guardada', 'no stored credits')))]));
      })),
    ),
    ...RELEASE_EXTRAS.map((f) => f(s, r)),
    s.reviews[r.id]?.length ? h('div', null, h('h4', null, t(l('Críticas', 'Reviews'))), reviewSummary(s, r), ...s.reviews[r.id].map((rv) => reviewCard(s, r, rv, { open: false }))) : null,
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
  const reply = h('div', { class: 'offer-reply' });
  const showReply = (offer: Offer | null, result: string) => {
    if (result === 'accepted') {
      toast(t(l('{a} aceitou na hora! Contrato assinado.', '{a} accepted on the spot! Contract signed.'), { a: a.name }), 'good');
      close();
      rerender();
      return;
    }
    if (result === 'invalid') { reply.replaceChildren(h('p', { class: 'bad' }, t(l('Já existe uma oferta em aberto para este artista.', 'There is already an open offer for this act.')))); return; }
    if (result === 'sniped') { reply.replaceChildren(h('p', { class: 'bad' }, t(l('Tarde demais: outro selo fechou antes.', 'Too late: another label closed first.')))); rerender(); return; }
    if (result === 'thinking' && offer) {
      reply.replaceChildren(
        h('p', null, pill(t(l('pensando', 'thinking')), 'warn'), ' ', t(l('{a} gostou, mas pediu até {n} semana(s) para pensar. A resposta chega sozinha — ou você pode pressionar agora (perde um pouco de confiança).', '{a} liked it but asked for up to {n} week(s) to think. The answer arrives on its own — or you can push now (costs a little trust).'), { a: a.name, n: Math.max(1, (offer.thinkUntil ?? s.week) - s.week) })),
        h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: () => showReply(offer, pressForAnswer(s, rngOf(s), offer.id)) }, t(l('Pressionar por uma resposta', 'Push for an answer'))),
          h('button', { class: 'btn small ghost', onclick: () => { close(); rerender(); } }, t(l('Esperar', 'Wait')))),
      );
      return;
    }
    if (result === 'counter' && offer) {
      reply.replaceChildren(
        h('p', null, pill(t(l('contraproposta', 'counter')), 'warn'), ' ', t(l('{a} topa se o adiantamento for {v}.', '{a} is in if the advance is {v}.'), { a: a.name, v: $(offer.advance) })),
        h('div', { class: 'row' },
          h('button', { class: 'btn small primary', onclick: () => { if (acceptCounter(s, offer.id)) { toast(t(l('Fechado!', 'Deal!')), 'good'); close(); rerender(); } else toast(t(l('Caixa insuficiente.', 'Not enough cash.')), 'bad'); } }, t(l('Aceitar', 'Accept'))),
          h('button', { class: 'btn small ghost', onclick: () => { withdrawCounter(s, offer.id); reply.replaceChildren(h('p', { class: 'muted small' }, t(l('Ajuste a proposta e envie de novo.', 'Adjust the offer and send it again.')))); } }, t(l('Ajustar e reenviar', 'Adjust and resend')))),
      );
      return;
    }
    reply.replaceChildren(h('p', { class: 'bad' }, t(l('{a} recusou: {r}', '{a} declined: {r}'), { a: a.name, r: offer?.note ?? '' })), h('small', { class: 'muted' }, t(l('Melhore a proposta para tentar de novo (cada recusa custa um pouco de confiança).', 'Improve the offer to try again (each refusal costs a little trust).'))));
    if (offer) s.offers = s.offers.filter((x) => x.id !== offer.id);
  };
  const actions = h('div', { class: 'actions' },
    h('button', { class: 'btn primary', onclick: () => {
      if (s.player.cash < o.advance) return toast(t(l('Caixa insuficiente para o adiantamento.', 'Not enough cash for the advance.')), 'bad');
      const { offer, result } = offerNow(s, rngOf(s), { ...o, promises: [...o.promises] });
      showReply(offer, result);
    } }, t(l('Propor e ouvir a resposta', 'Propose and hear the answer'))),
    reply,
  );
  close = modal(`${t(S.offerTitle)}: ${a.name}`, h('div', null, form, actions));
}

export function actRow(s: GameState, a: Act): HTMLElement {
  return h('div', { class: 'act-row' }, logo(a, 28), actLink(s, a.id), h('span', { class: 'muted small' }, ` ${genreName(a.genre)} · ${ownerName(s, a.owner)}`));
}

