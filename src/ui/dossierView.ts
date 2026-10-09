// Dossiê de descoberta (rodada 8, §3.4): sinais separados por fonte enviesada, decisões de A&R
// (pesquisar mais, financiar demo, residência, contratar cedo ou deixar o rival arriscar) e o
// histórico das apostas do jogador.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import {
  CALL_NAME, DIMS, SOURCES8, SRC_IDS, anrRecord, commercialHints, dos, passOnAct, playerRead, readsFor, research, researchBlock, researchCost, synthesis, type Src,
} from '../sim/sys/dossier8';
import { DEGREES } from '../sim/scouting';
import type { GameState } from '../sim/types';
import { $, actLink, cityName, genreName, logo, modal, pill, rerender, section, toast } from './common';
import { h, rangeBar } from './dom';
import { openOffer } from './ficha';
import { store } from './store';
import { actNegLine } from './sys/persona13';

const CONSULT: Src[] = ['producer', 'promoter', 'critic', 'local'];

function dossierBody(s: GameState, actId: string, refresh: () => void, close: () => void): HTMLElement {
  const a = s.acts[actId];
  const d = dos(s).d[actId];
  const k = s.knowledge[actId];
  const hints = commercialHints(s, a);
  const rows = DIMS.map((dim) => {
    const reads = readsFor(s, actId, dim.id);
    const syn = synthesis(s, actId, dim.id);
    return h('tr', null,
      h('td', { title: t(dim.desc) }, t(dim.name), dim.id === 'comm' ? h('div', { class: 'muted small' }, `${t(l('mercados receptivos', 'receptive markets'))}: ${hints.markets.join(', ').toUpperCase()} · ${t(l('era de', 'era of'))} ${t(hints.format)}`) : null),
      h('td', null, reads.length ? h('div', { class: 'chips' }, reads.map((x) => pill(`${t(SOURCES8[x.src].name)} ${Math.max(0, x.mid - x.w)}–${Math.min(100, x.mid + x.w)}`))) : h('span', { class: 'muted small' }, t(l('sem leitura', 'no read')))),
      h('td', null, syn ? h('span', { class: 'range-cell' }, `${Math.max(0, syn.mid - syn.w)}–${Math.min(100, syn.mid + syn.w)} `, rangeBar(Math.max(0, syn.mid - syn.w), Math.min(100, syn.mid + syn.w), dim.id === 'risk' || dim.id === 'rival' ? '' : 'pot'), syn.spread > 10 ? pill(t(l('fontes discordam', 'sources disagree')), 'warn') : null) : '?'),
    );
  });
  const act = (src: Src) => {
    const err = researchBlock(s, actId, src);
    return h('button', { class: 'btn small', disabled: !!err, title: `${t(SOURCES8[src].sees)}${err ? ' — ' + t(err) : ''}`, onclick: () => { const e = research(s, actId, src); if (e) toast(t(e), 'bad'); refresh(); } },
      `${t(SOURCES8[src].name)} (${$(researchCost(s, src))}${SOURCES8[src].weeks ? ` · ${SOURCES8[src].weeks} ${t(l('sem.', 'wk'))}` : ''})`);
  };
  const pr = playerRead(s, actId);
  return h('div', { class: 'r8-dossier' },
    h('div', { class: 'row' }, logo(a, 40), h('div', null, actLink(s, a.id), h('div', { class: 'muted small' }, `${genreName(a.genre)} · ${cityName(a.city)} · ${k ? t(DEGREES[Math.max(0, k.degree - 1)]) : t(l('fora do radar', 'off the radar'))}`))),
    h('p', { class: 'muted small' }, t(l('Nenhuma fonte revela o valor verdadeiro. O produtor enxerga técnica, o promotor enxerga palco, o crítico enxerga novidade e o agente local enxerga relacionamento — cada um com seu viés. Repetir a mesma fonte estreita o intervalo, mas não tira o viés: cruze fontes.', 'No source reveals the true value. The producer sees technique, the promoter sees stage power, the critic sees novelty and the local agent sees relationships — each with a bias. Repeating a source narrows the range but keeps its bias: cross-check sources.'))),
    actNegLine(s, a),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Sinal', 'Signal'))), h('th', null, t(l('Leituras por fonte', 'Reads by source'))), h('th', null, t(l('Sua síntese', 'Your synthesis'))))),
      h('tbody', null, rows)),
    h('p', { class: 'small' }, t(l('Sua convicção: {r}/100 com {n} fonte(s) ouvida(s). Gasto em pesquisa: {v}.', 'Your conviction: {r}/100 from {n} source(s). Spent on research: {v}.'), { r: pr.read, n: pr.info, v: $(d?.spent ?? 0) })),
    d?.pending?.length ? h('p', { class: 'small' }, d.pending.map((p) => pill(`${t(SOURCES8[p.src].name)}: ${Math.max(0, p.ready - s.week)} ${t(l('sem.', 'wk'))}`, 'warn'))) : null,
    h('h4', null, t(l('Pagar por mais pesquisa (1 ação de scouting)', 'Pay for more research (1 scouting action)'))),
    h('div', { class: 'row wrap' }, CONSULT.map(act)),
    a.owner ? null : h('div', null,
      h('h4', null, t(l('Apostar mais alto', 'Raise the stakes'))),
      h('div', { class: 'row wrap' }, act('demo'), act('residency')),
      h('p', { class: 'muted small' }, t(l('A demo agrada o artista e mostra o material; a residência mostra o palco e o público — e chama a atenção dos rivais.', 'The demo pleases the act and shows the material; the residency shows stage and crowd — and draws rivals\' attention.'))),
      h('h4', null, t(l('Decidir', 'Decide'))),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small primary', onclick: () => { close(); openOffer(actId); } }, t(l('Contratar agora (com o que você sabe)', 'Sign now (with what you know)'))),
        h('button', { class: 'btn small ghost', onclick: () => { passOnAct(s, actId); toast(t(l('Você deixou o risco para os rivais. O mercado dirá se acertou.', 'You left the risk to rivals. The market will tell.')), 'info'); close(); rerender(); } }, t(l('Deixar o rival arriscar', 'Let a rival take the risk')))),
    ),
  );
}

export function openDossier(actId: string): void {
  const s = store.game!;
  const a = s.acts[actId];
  if (!a) return;
  const wrap = h('div');
  let close = () => {};
  const refresh = () => { wrap.replaceChildren(dossierBody(s, actId, refresh, () => close())); rerender(); };
  wrap.appendChild(dossierBody(s, actId, refresh, () => close()));
  close = modal(`${t(l('Dossiê', 'Dossier'))}: ${a.name}`, wrap, { wide: true });
}

const pctOf = (x: number) => `${Math.round(x * 100)}%`;

/** Aba do mercado: dossiês abertos e o histórico de faro do jogador. */
export function dossierTab(s: GameState): HTMLElement {
  const st = dos(s);
  const rec = anrRecord(s);
  const ids = Object.keys(st.d).filter((id) => s.acts[id] && s.acts[id].owner !== 'player');
  const verdict = (c: (typeof st.calls)[number]): L => c.judged ? CALL_NAME[c.judged] : l('aguardando o mercado', 'awaiting the market');
  return h('div', null,
    section(t(l('Seu faro de A&R', 'Your A&R instinct')),
      h('p', { class: 'small' }, t(l('{n} aposta(s) · {j} julgada(s) · {r} acerto(s), {e} antes do mercado · {w} aposta(s) ruim(ns) · {m} deixada(s) passar · {d} boa(s) recusa(s).', '{n} call(s) · {j} judged · {r} hit(s), {e} before the market · {w} bad bet(s) · {m} let slip · {d} good pass(es).'), { n: rec.calls, j: rec.judged, r: rec.right, e: rec.early, w: rec.wrong, m: rec.missed, d: rec.dodged })),
      rec.bold ? h('p', { class: rec.overconf > 0.5 ? 'bad small' : 'small' }, t(l('Quando você estava convicto (leitura ≥ 65), errou {p} das vezes.', 'When you were convinced (read ≥ 65), you were wrong {p} of the time.'), { p: pctOf(rec.overconf) })) : null,
      st.calls.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Ato', 'Act'))), h('th', null, t(l('Decisão', 'Decision'))), h('th', null, t(l('Sua leitura', 'Your read'))), h('th', null, t(l('Fontes', 'Sources'))), h('th', null, t(l('Veredito', 'Verdict'))))),
        h('tbody', null, st.calls.slice().reverse().slice(0, 25).map((c) => h('tr', null,
          h('td', null, actLink(s, c.actId)),
          h('td', null, c.kind === 'sign' ? t(l('contratou', 'signed')) : t(l('passou', 'passed'))),
          h('td', null, String(c.read)), h('td', null, String(c.info)),
          h('td', { class: c.judged === 'early' || c.judged === 'right' || c.judged === 'dodged' ? 'good' : c.judged ? 'bad' : 'muted' }, t(verdict(c))))))) : h('p', { class: 'muted small' }, t(l('Contratações e recusas ficam registradas e são julgadas pelo mercado dois anos depois.', 'Signings and passes are logged and judged by the market two years later.'))),
    ),
    section(t(l('Dossiês abertos', 'Open dossiers')),
      ids.length ? h('div', { class: 'row wrap' }, ids.map((id) => h('button', { class: 'btn small ghost', onclick: () => openDossier(id) }, s.acts[id].name, dos(s).d[id].pending?.length ? ' ⏳' : ''))) : h('p', { class: 'muted small' }, t(l('Abra o dossiê de qualquer nome do radar (botão "Dossiê").', 'Open the dossier of any name on the radar ("Dossier" button).'))),
      h('p', { class: 'muted small' }, SRC_IDS.map((x) => `${t(SOURCES8[x].name)}: ${t(SOURCES8[x].sees)}`).join(' · ')),
    ),
  );
}
