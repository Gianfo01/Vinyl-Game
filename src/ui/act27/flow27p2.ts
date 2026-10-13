// r27 (FLOW2) — telas das atividades da fase 2 no caminho único (registro puro em flow27p2model.ts; docs/act27.md).
// Aqui ficam: as telas ligadas ao registro (setPlayer27) e os pontos de entrada naturais que as telas de sempre chamam
// no lugar dos antigos botões "▶ Jogar" (almoço/jantar/presente → conversa de favor; programar → quadro da campanha;
// "Confirmar turnê" → turnê no mapa; "Renegociar" → a mesa). Cada ação tem uma entrada só.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { respondDemand, rst } from '../../sim/rights';
import { autoNegotiate, negBlocked } from '../../sim/sys/people/negotiation';
import { campOf27, liveCamps27, targets27, type Camp27, type Target27 } from '../../sim/sys/camp27';
import { opps27, type Opp27 } from '../../sim/sys/press27';
import type { GameState } from '../../sim/types';
import { rngOf } from '../../sim/util';
import { rerender, toast } from '../common';
import { h } from '../dom';
import { openNegotiation } from '../sys/people/negotiation';
import { openBoard27 } from './board27';
import { openCampaign27 } from './campaign27';
import { openCrisisRoom27 } from './crisis27';
import { occMark27, screen27, screenOn27 } from './flow27';
import { setPlayer27 } from './flow27model';
import { campKey27, campReady27, decline27, ivKey27, type FavorGesture27 } from './flow27p2model';
import { openFavors27 } from './favors27';
import { openInterview27 } from './interview27';
import { openRoad27, openRoute27 } from './road27';

const tgOf = (c: Camp27): Target27 => ({ actId: c.actId, ...(c.prId ? { prId: c.prId } : {}), ...(c.relId ? { relId: c.relId } : {}), title: c.title, launchW: c.launchW, type: c.type });
const fn = (x: unknown): (() => void) | undefined => (typeof x === 'function' ? (x as () => void) : undefined);

// ---------------------------------------------------------------- telas ligadas ao registro

setPlayer27('campaign', (s, o, done) => {
  const tg = targets27(s).find((x) => x.prId === o.data?.prId);
  if (!tg) { done({ played: false }); return; }
  openCampaign27(tg, { onDone: (played) => done({ played }), quick: () => { decline27(s, campKey27(tg.prId!)); fn(o.data?.classic)?.(); } });
});
setPlayer27('campEvent', (s, o, done) => {
  const c = liveCamps27(s).find((x) => x.id === o.data?.campId);
  if (!c) { done({ played: false }); return; }
  openCampaign27(tgOf(c), { onDone: (played) => done({ played }) });
});
setPlayer27('interview', (_s, o, done) => openInterview27(o.data!.opp as Opp27, (played) => done({ played })));
setPlayer27('favors', (_s, o, done) => { openFavors27(String(o.data?.key), { gesture: o.data?.gesture as FavorGesture27 | undefined, classic: fn(o.data?.classic) }); done({ played: true }); });
setPlayer27('crisis', (_s, o, done) => openCrisisRoom27(String(o.data?.cand ?? o.data?.crisis), (played) => done({ played })));
setPlayer27('board', (_s, _o, done) => openBoard27((played) => done({ played })));
setPlayer27('road', (_s, o, done) => openRoad27(String(o.data?.tourId), (played) => done({ played })));
setPlayer27('route', (_s, o, done) => { openRoute27(o.actId, (o.data?.cities as string[]) ?? [], { classic: fn(o.data?.classic), start: Number(o.data?.start) || undefined }); done({ played: true }); });
setPlayer27('renew', (s, o, done) => { openNegotiation(s, o.actId!, 'renew', true); done({ played: true }); });

// ---------------------------------------------------------------- entradas naturais (as telas de sempre chamam)

/** Almoço, jantar, presente, pedir favor: a própria ação abre a conversa de favor (o rápido = a ação de sempre). */
export function favorAct27(s: GameState, key: string, gesture: FavorGesture27, classic: () => void): void {
  if (!screen27('favors', s, { key: `fv:${key}:${gesture}`, data: { key, gesture } }, classic)) classic();
}

/** Lançamento acabou de ser programado: se a estreia está perto, o quadro da campanha abre como a tela de marketing
 *  dele (com "Resolver rápido: só o marketing do plano"); mais longe, ele vem como cartão no Avançar. */
export function afterSchedule27(s: GameState, prId: string): void {
  const p = s.pendingReleases.find((x) => x.id === prId);
  if (!p || !campReady27(s, prId)) return;
  screen27('campaign', s, { actId: p.actId, key: campKey27(prId), data: { prId, title: p.title } }, () => {});
}

/** Na linha do lançamento programado: o quadro da campanha em andamento ou o marcador "🎮 jogável" do próximo avanço. */
export function campRow27(s: GameState, prId: string): HTMLElement | null {
  const c = campOf27(s, { prId });
  if (c) return h('button', { class: 'btn small ghost', title: t(l('A campanha anda com as semanas: ajuste a verba e responda aos imprevistos.', 'The campaign runs with the weeks: adjust the budget and answer surprises.')), onclick: () => openCampaign27(tgOf(c)) },
    '📋 ', t(l('Quadro da campanha · sem. {a}/{b}', 'Campaign board · wk {a}/{b}'), { a: Math.min(c.wEnd - c.w0, s.week - c.w0) + 1, b: c.wEnd - c.w0 + 1 }));
  const p = s.pendingReleases.find((x) => x.id === prId);
  if (!p || !campReady27(s, prId)) return null;
  return occMark27(s, { src: 'release', key: campKey27(prId), actId: p.actId, data: { prId, title: p.title } });
}

/** Marcador "🎮 jogável" de um microfone (matéria, escândalo) — a coletiva chega como cartão no próximo avanço. */
export function ivMark27(s: GameState, f: (o: Opp27) => boolean): HTMLElement | null {
  const o = opps27(s).find(f);
  return o ? occMark27(s, { src: 'press', key: ivKey27(s, o), actId: o.actId, data: { opp: o } }) : null;
}

/** "Confirmar turnê": o planejador no mapa É a tela de marcar (o rápido = marcar como no formulário). */
export function bookTour27(s: GameState, actId: string, cities: string[], start: number, classic: () => void): void {
  if (!screen27('route', s, { actId, key: `route:${actId}`, data: { cities, start } }, classic)) classic();
}

/** "Renegociar": pedido do artista → a mesa de renegociação (negotiate27); senão a mesa de renovação.
 *  O rápido fica dentro de cada uma (aceitar o pedido / resolver automático). */
export function renewBtn27(s: GameState, actId: string, label: string): HTMLElement {
  const blocked = negBlocked(s, actId, 'renew');
  const quick = () => { toast(t(autoNegotiate(s, actId, 'renew')), s.acts[actId]?.owner === 'player' ? 'good' : 'info'); rerender(); };
  const go = () => {
    const d = rst(s).demands.find((x) => x.actId === actId);
    if (d && screenOn27('reneg', s, { actId, data: { demandId: d.id } })) {
      screen27('reneg', s, { actId, data: { demandId: d.id } }, () => { const r = respondDemand(s, rngOf(s), d.id, 'accept'); toast(t(r ?? l('Renegociado.', 'Renegotiated.')), r ? 'bad' : 'good'); rerender(); });
      return;
    }
    if (!screen27('renew', s, { actId }, quick)) quick();
  };
  return h('button', { class: 'btn small', disabled: !!blocked, title: blocked ? t(blocked) : t(l('Abre a mesa de renovação (ou resolve no rápido, conforme Opções → Atividades).', 'Opens the renewal table (or resolves quickly, per Settings → Activities).')), onclick: go }, '🤝 ', label);
}
