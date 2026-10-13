// Rodada 29 — CONCORRENTES DA CARREIRA NO INÍCIO (config.labels29.vn / .ven): estúdios, festivais, agências de shows,
// editoras, veículos e plataformas rivais (ventures9.npc) do tipo da sua carreira principal, quando o tipo existe no ano.
// Roda DEPOIS do nível dos rivais (rivals29start, que também abre alguns): aqui o número fica exatamente o escolhido.
// Donos: os selos rivais mais fortes primeiro; reputação na faixa do nível dos rivais (ou 25–60 sem nível). RNG próprio.

import { Rng } from '../../core/rng';
import { CITIES, cityById } from '../../data/world';
import { registerSimHook } from '../ext4';
import { ven29, venKind29 } from '../labels29data';
import { riv29ById, rivOf29 } from '../rivals29data';
import { careerOf29 } from '../start29data';
import type { GameState } from '../types';
import { VKINDS, ventures, type VKind } from './ventures9';

/** Ajusta os negócios rivais da carreira ao número escolhido. Devolve quantos ficaram (testes). */
export function applyVen29(s: GameState, n: number): number {
  const cfg = s.config;
  const vk = venKind29(careerOf29(cfg), s.year);
  if (!vk) return 0;
  const kind = vk.k as VKind;
  const vs = ventures(s);
  const mine = vs.npc.filter((x) => x.kind === kind);
  if (mine.length > n) { const drop = new Set(mine.slice(n)); vs.npc = vs.npc.filter((x) => !drop.has(x)); return n; }
  const r = Rng.fromSeed(`labels29:${cfg.seed}:ven`);
  const d = riv29ById(rivOf29(cfg));
  const [lo, hi] = d && d.id !== 'mix' && d.ven.rep[1] > 0 ? d.ven.rep : [25, 60];
  const owners = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash * (b.reputation + 10) - a.cash * (a.reputation + 10) || a.id.localeCompare(b.id));
  const home = cityById[cfg.homeCity]?.market;
  const near = CITIES.filter((c) => c.market === home).map((c) => c.id);
  for (let i = mine.length, k = 0; i < n && owners.length; k++) {
    const lb = owners[k % owners.length];
    if (k >= owners.length * 3) break;
    if (vs.npc.some((x) => x.labelId === lb.id && x.kind === kind) && k < owners.length) continue;
    const city = i === 0 ? cfg.homeCity : near.length && r.chance(0.6) ? r.pick(near) : cityById[lb.city] ? lb.city : cfg.homeCity;
    vs.npc.push({ kind, labelId: lb.id, name: `${lb.name} ${VKINDS[kind].name.pt}${k >= owners.length ? ` ${Math.floor(k / owners.length) + 1}` : ''}`, city, rep: r.int(lo, hi), y: s.year });
    i++;
  }
  return vs.npc.filter((x) => x.kind === kind).length;
}

registerSimHook('newgame', 'labels29:ven', (s) => {
  const cfg = s.config;
  if (cfg.scenario17) return;
  const n = ven29(cfg);
  if (n !== undefined) applyVen29(s, n);
});
