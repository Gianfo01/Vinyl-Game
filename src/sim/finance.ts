// Economia expandida (GDD §20, §42.8): royalties pagos a cada autor, inventário de ativos com
// depreciação (visão contábil separada do caixa), credores com paciência e retomada de ativos.

import type { Rng } from '../core/rng';
import { l, type L } from '../data/world';
import type { GameState, Release } from './types';
import type { Asset, Creditor } from './xtypes';
import { fmtL, money, nextId, notify, post, remember } from './util';
import { monthIndex } from './capacity';

// ---------- Royalties por autor ----------

/** Divide o valor autoral entre os autores da faixa principal pelas participações (somam 100%). */
export function payAuthors(s: GameState, rel: Release, amount: number): void {
  if (amount <= 0) return;
  const act = s.acts[rel.actId];
  if (rel.owner !== 'player' && !act?.playerBand && act?.owner !== 'player') return; // terceiros: agregado
  const songs = rel.songs.map((id) => s.songs[id]).filter(Boolean);
  if (!songs.length) return;
  const per = amount / songs.length;
  for (const song of songs) {
    const splits = song.splits?.length ? song.splits : song.writers.map((w) => ({ personId: w, share: 1 / Math.max(1, song.writers.length) }));
    // sample/interpolação cede parte da edição ao autor original
    const sampled = s.samples.find((x) => x.songId === song.id && x.status === 'cleared');
    let pool = per;
    if (sampled) {
      const orig = s.songs[sampled.sourceSongId];
      const cut = pool * sampled.share;
      pool -= cut;
      for (const w of orig?.writers ?? []) s.personalCash[w] = (s.personalCash[w] ?? 0) + Math.round(cut / Math.max(1, orig!.writers.length));
    }
    for (const sp of splits) s.personalCash[sp.personId] = (s.personalCash[sp.personId] ?? 0) + Math.round(pool * sp.share);
  }
}

export function setSplits(s: GameState, songId: string, splits: { personId: string; share: number }[]): L | null {
  const song = s.songs[songId];
  if (!song) return l('Faixa inexistente.', 'Unknown track.');
  const total = splits.reduce((t, x) => t + x.share, 0);
  if (Math.abs(total - 1) > 0.001) return l('As participações precisam somar 100%.', 'Shares must add up to 100%.');
  if (song.releaseId) return l('Faixa já lançada: créditos fechados.', 'Track already released: credits are locked.');
  // quem perde participação guarda ressentimento; quem ganha, gratidão
  const before = new Map((song.splits ?? song.writers.map((w) => ({ personId: w, share: 1 / song.writers.length }))).map((x) => [x.personId, x.share]));
  for (const sp of splits) {
    const p = s.persons[sp.personId];
    if (!p) continue;
    const d = sp.share - (before.get(sp.personId) ?? 0);
    p.resentment = Math.max(0, Math.min(100, p.resentment - d * 40));
    p.morale = Math.max(0, Math.min(100, p.morale + d * 20));
  }
  song.splits = splits;
  song.writers = splits.filter((x) => x.share > 0).map((x) => x.personId);
  return null;
}

// ---------- Ativos ----------

export function addAsset(s: GameState, a: Omit<Asset, 'id' | 'bookValue' | 'boughtMonth'> & { bookValue?: number }): Asset {
  const asset: Asset = { ...a, id: nextId(s, 'as'), bookValue: a.bookValue ?? a.cost, boughtMonth: monthIndex(s) };
  s.assets.push(asset);
  return asset;
}

export function removeAsset(s: GameState, id: string): void {
  s.assets = s.assets.filter((a) => a.id !== id);
}

export function depreciationMonth(s: GameState): number {
  let total = 0;
  for (const a of s.assets) {
    if (a.lifeMonths <= 0) continue;
    const d = Math.min(a.bookValue, Math.round(a.cost / a.lifeMonths));
    a.bookValue -= d;
    total += d;
  }
  s.flags.depreciationLast = total;
  return total;
}

export function totalDebt(s: GameState): number {
  return s.player.loans.reduce((t, x) => t + x.balance, 0) + s.creditors.reduce((t, c) => t + c.owed, 0);
}

export interface BalanceSheet {
  cash: number;
  assets: number;
  receivables: number;
  debt: number;
  equity: number;
  depreciationMonth: number;
  byKind: Record<string, number>;
}

export function balanceSheet(s: GameState): BalanceSheet {
  const byKind: Record<string, number> = {};
  for (const a of s.assets) byKind[a.kind] = (byKind[a.kind] ?? 0) + a.bookValue;
  const assets = Object.values(byKind).reduce((t, x) => t + x, 0);
  const receivables = Math.round(s.flags.receivables ?? 0);
  const debt = totalDebt(s);
  return { cash: s.player.cash, assets, receivables, debt, equity: s.player.cash + assets + receivables - debt, depreciationMonth: s.flags.depreciationLast ?? 0, byKind };
}

// ---------- Credores ----------

export function creditorFor(s: GameState, kind: Creditor['kind'], name: string): Creditor {
  let c = s.creditors.find((x) => x.kind === kind && x.name === name);
  if (!c) {
    c = { id: nextId(s, 'cr'), name, kind, patience: kind === 'tax' ? 40 : kind === 'bank' ? 60 : 75, owed: 0 };
    s.creditors.push(c);
  }
  return c;
}

/** Dívida vencida e não paga vira credor; credor sem paciência retoma ativos. */
export function creditorsMonth(s: GameState, r: Rng): void {
  // caixa negativo além do limite: parte vira dívida com fornecedores/banco
  if (s.player.cash < 0) {
    const bank = creditorFor(s, 'bank', s.player.loans[0] ? l('Banco Meridional', 'Meridian Bank').pt : 'Banco Meridional');
    bank.patience -= 12;
    if (s.player.cash < -money(s, 30000)) {
      const sup = creditorFor(s, 'supplier', 'Prensa & Cia.');
      sup.patience -= 8;
      sup.owed = Math.max(sup.owed, -s.player.cash - money(s, 30000));
    }
  } else {
    for (const c of s.creditors) c.patience = Math.min(100, c.patience + 4);
  }
  for (const c of s.creditors) {
    // pagar o que der quando houver caixa
    if (c.owed > 0 && s.player.cash > money(s, 5000)) {
      const pay = Math.min(c.owed, Math.round(s.player.cash * 0.25));
      post(s, `creditor:${c.id}`, -pay, 'loans', `Pagamento a ${c.name}`);
      c.owed -= pay;
    }
    if (c.patience <= 0) {
      seize(s, r, c);
      c.patience = 35;
    }
  }
  s.creditors = s.creditors.filter((c) => c.owed > 0 || c.patience < 100);
}

function seize(s: GameState, _r: Rng, c: Creditor): void {
  const asset = [...s.assets].sort((a, b) => b.bookValue - a.bookValue)[0];
  if (!asset) {
    notify(s, fmtL(l('{c} ameaça pedir sua falência.', '{c} threatens to file for your bankruptcy.'), { c: c.name }), 'bad');
    return;
  }
  const value = Math.round(asset.bookValue * 0.6);
  removeAsset(s, asset.id);
  if (asset.kind === 'equipment' && asset.refId) s.player.equipment = s.player.equipment.filter((x) => x !== asset.refId);
  post(s, `seize:${asset.id}`, value, 'asset_sales', `Retomada por ${c.name}`);
  c.owed = Math.max(0, c.owed - value);
  const name = typeof asset.name === 'string' ? l(asset.name) : asset.name;
  remember(s, 'seizure', fmtL(l('{c} retoma {a} para cobrir dívidas.', '{c} seizes {a} to cover debts.'), { c: c.name, a: name }), { important: true });
  notify(s, fmtL(l('Credor {c} retomou {a}.', 'Creditor {c} seized {a}.'), { c: c.name, a: name }), 'bad');
}

export function financeMonth(s: GameState, r: Rng): void {
  depreciationMonth(s);
  creditorsMonth(s, r);
  // royalties autorais liquidados no mês seguinte (registro; não é caixa da empresa)
  s.flags.receivables = Math.round((s.monthLedger.sales ?? 0) * 0.2);
}
