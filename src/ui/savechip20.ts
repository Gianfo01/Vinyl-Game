// Rodada 20 (G1 / B1, uiux §4.4 item 6) — indicador persistente de saúde do save no topo: local confirmado,
// nuvem confirmada/atrasada/indisponível/desligada, pendente/falhou e o último checkpoint confirmado.
// Clique: detalhes (motivo, tentativas, custo da última gravação) e "Tentar de novo". Falha avisa uma vez (toast)
// e o chip fica vermelho até uma gravação confirmar.

import { l } from '../data/world';
import { locale, t } from '../i18n/strings';
import { modal } from './common';
import { h } from './dom';
import { health20, onHealth20, retry20, type Ack20, type Chan20 } from './savehealth20';
import { runId17, store } from './store';

const ID = 'sh20';
const mon = (m: number) => new Date(2000, m, 1).toLocaleString(locale(), { month: 'short' });
const when = (ts: number) => new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
/** Checkpoint só conta se for desta partida (outro jogo carregado não herda o "salvo"). */
const mine = (a?: Ack20): Ack20 | undefined => (a && store.game && a.run === runId17(store.game) ? a : undefined);

function stTxt(c: Chan20, cloud: boolean): string {
  switch (c.st) {
    case 'ok': return t(l('confirmado', 'confirmed'));
    case 'pending': return t(l('gravando…', 'saving…'));
    case 'failed': return t(l('FALHOU', 'FAILED'));
    case 'unavailable': return t(l('indisponível', 'unavailable'));
    case 'stale': return t(l('atrasada (envia a cada 5 min)', 'behind (sends every 5 min)'));
    case 'off': return cloud ? t(l('envio automático desligado', 'auto-send off')) : '—';
    default: return t(l('ainda não gravou nesta sessão', 'not saved yet this session'));
  }
}

function label(): { text: string; cls: string; title: string } {
  const L0 = health20.local, C = health20.cloud, a = mine(L0.lastOk);
  const ck = a ? `${mon(a.month)} ${a.year}` : '—';
  const cloud = C.st === 'ok' ? ' ☁' : C.st === 'failed' ? ' ☁⚠' : C.st === 'stale' ? ' ☁…' : '';
  const turn = health20.turnErr ? ' ↺' : '';
  const title = `${t(l('Save local', 'Local save'))}: ${stTxt(L0, false)} · ${t(l('Nuvem', 'Cloud'))}: ${stTxt(C, true)} · ${t(l('Último checkpoint confirmado', 'Last confirmed checkpoint'))}: ${ck}`;
  if (L0.st === 'failed' || L0.st === 'unavailable') return { text: `⚠ ${t(l('Save falhou', 'Save failed'))}${cloud}`, cls: 'bad', title };
  if (L0.st === 'pending') return { text: `💾 …${cloud}${turn}`, cls: 'muted', title };
  return { text: `💾 ${ck}${cloud}${turn}`, cls: C.st === 'failed' || health20.turnErr ? 'warn' : 'muted', title };
}

/** Botão do topo (recriado a cada render; o assinante único atualiza por id). */
export function saveChip20(): HTMLElement {
  const x = label();
  return h('button', { id: ID, type: 'button', class: `btn ghost small sh20 ${x.cls}`, title: x.title, 'aria-label': x.title, onclick: details20 }, x.text);
}

let lastFails = 0;
onHealth20(() => {
  const el = typeof document !== 'undefined' ? document.getElementById(ID) : null;
  if (el) { const x = label(); el.textContent = x.text; el.className = `btn ghost small sh20 ${x.cls}`; el.title = x.title; el.setAttribute('aria-label', x.title); }
  const f = health20.local.fails;
  if (f > 0 && lastFails === 0) store.toast(t(l('⚠ O save automático FALHOU ({e}). O último checkpoint confirmado não avançou — veja 💾 no topo.', '⚠ Autosave FAILED ({e}). The last confirmed checkpoint did not advance — see 💾 at the top.'), { e: health20.local.err ?? '?' }), 'bad');
  lastFails = f;
});

function chanBlock(name: string, c: Chan20, cloud: boolean, retry: (() => Promise<unknown>) | null, close: () => void): HTMLElement {
  const a = mine(c.lastOk);
  return h('section', { class: 'card sh20-box' },
    h('h4', null, name, ': ', h('span', { class: c.st === 'failed' ? 'bad' : c.st === 'ok' ? 'good' : 'muted' }, stTxt(c, cloud))),
    h('p', { class: 'small' }, t(l('Último checkpoint confirmado', 'Last confirmed checkpoint')), ': ',
      a ? h('b', null, `${mon(a.month)} ${a.year} · ${t(l('semana', 'week'))} ${a.week} · ${when(a.ts)}`) : h('span', { class: 'muted' }, t(l('nenhum nesta sessão', 'none this session')))),
    c.err ? h('p', { class: 'bad small' }, t(l('Motivo', 'Reason')), `: ${c.err}`, c.fails > 1 ? ` (×${c.fails})` : '', c.errAt ? ` · ${when(c.errAt)}` : '') : null,
    retry && (c.st === 'failed' || c.st === 'stale' || c.st === 'unavailable') ? h('button', { type: 'button', class: 'btn small primary', onclick: async () => { await retry().catch(() => undefined); close(); } }, t(l('Tentar de novo agora', 'Try again now'))) : null,
  );
}

export function details20(): void {
  const C = health20.cost;
  let close = () => {};
  const box = h('div', { class: 'sh20-detail' },
    chanBlock(t(l('Neste navegador', 'This browser')), health20.local, false, retry20.local, () => close()),
    chanBlock(t(l('Nuvem', 'Cloud')), health20.cloud, true, retry20.cloud, () => close()),
    health20.turnErr ? h('p', { class: 'warn small', role: 'status' }, '↺ ', t(l('Um avanço falhou às {h} por erro interno e foi revertido inteiro: o jogo voltou ao estado de antes e o checkpoint gravado não mudou. ({m})', 'An advance failed at {h} due to an internal error and was fully rolled back: the game returned to its prior state and the saved checkpoint did not change. ({m})'), { h: when(health20.turnErr.ts), m: health20.turnErr.msg.slice(0, 120) })) : null,
    C ? h('p', { class: 'muted small tnum' }, t(l('Última gravação: serializar {a} ms · compactar {b} ms · gravar {c} ms · {kb} KB → {kz} KB', 'Last save: serialize {a} ms · compress {b} ms · write {c} ms · {kb} KB → {kz} KB'),
      { a: Math.round(C.stringifyMs), b: Math.round(C.packMs), c: Math.round(C.writeMs), kb: Math.round(C.bytes / 1024), kz: Math.round(C.packed / 1024) })) : null,
    h('p', { class: 'muted small' }, t(l('O checkpoint só avança quando o navegador (ou a nuvem) confirma a gravação. Se falhar: libere espaço (apague saves antigos em Saves) ou exporte o save como texto/arquivo.', 'The checkpoint only advances when the browser (or the cloud) confirms the write. If it fails: free space (delete old saves in Saves) or export the save as text/file.'))),
  );
  close = modal(t(l('Saúde do save', 'Save health')), box);
}
