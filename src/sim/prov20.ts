// r20 (novarun §9.2): "Referência real" × "Nesta partida" e procedência dos lançamentos.
// - provOf20: 'doc' (disco real posto pelo roteiro documentado nos modos exato/legado) ou 'sim' (gerado nesta partida).
//   Saves antigos sem `prov` caem em 'sim', salvo quando é claramente do caminho real: nomes reais ligados, ato real,
//   título idêntico a um disco documentado do ato e ano próximo do real (deslocamento dos modos livre/caos).
// - realRef20: identidade documentada (só artistas reais com nomes reais e só fatos até o ano corrente — nada do futuro).
// - thisRun20: o que aconteceu nesta partida (catálogo, gravadora, contrato, trajetória).
// Leitura pura: não altera estado nem consome RNG.

import type { Act, GameState, Release } from './types';
import { realDataOf } from './sys/realworld';
import { simStart20 } from './worldpolicy20';

export type Prov20 = 'doc' | 'sim';

const normT = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Procedência de um lançamento (com derivação segura para saves antigos). */
export function provOf20(s: GameState, rel: Release): Prov20 {
  if (rel.prov) return rel.prov;
  if (!s.config.realNames || rel.reissueOf || rel.kind && rel.kind !== 'standard') return 'sim';
  const act = s.acts[rel.actId];
  const d = act ? realDataOf(act) : undefined;
  if (!d?.al?.length) return 'sim';
  const k = normT(rel.title);
  return d.al.some(([title, year]) => normT(title) === k && Math.abs(year - rel.year) <= 6) ? 'doc' : 'sim';
}

export interface RealRef20 {
  name: string;
  city?: string;
  country?: string;
  born?: number;
  died?: number;
  debut?: number;
  ended?: number;
  members: { name: string; born?: number; died?: number; joined?: number; left?: number }[];
  hits: { title: string; year: number; type: 'lp' | 'ep' | 'single' }[];
  /** mundo aleatório v2: nada da cronologia real anterior ao início virou fato — painel só informativo */
  infoOnly: boolean;
}

/** Referência real documentada do ato (null se não for real ou se os nomes reais estiverem desligados). */
export function realRef20(s: GameState, act: Act): RealRef20 | null {
  if (!s.config.realNames || !act.catalogNo) return null;
  const d = realDataOf(act);
  if (!d) return null;
  const y = s.year;
  const upTo = (v: number | undefined) => (v !== undefined && v <= y ? v : undefined);
  const full = 'cn' in d ? d : undefined;
  return {
    name: d.n,
    city: full?.c,
    country: full?.cn,
    born: upTo(d.b),
    died: upTo(d.x),
    debut: upTo(d.d),
    ended: upTo(d.e),
    members: (d.m ?? []).filter((m) => m[4] === undefined || m[4] <= y).map(([name, , born, died, joined, left]) => ({ name, born, died: upTo(died), joined, left: upTo(left) })),
    hits: (d.al ?? []).filter((x) => x[1] <= y).map(([title, year, type]) => ({ title, year, type: type ?? 'lp' })),
    infoOnly: simStart20(s),
  };
}

export interface ThisRun20 {
  doc: number;
  sim: number;
  label: string;
  contract?: { party: string; endWeek: number; royalty: number };
  debut: number;
  status: Act['status'];
  hits: number;
  number1s: number;
  peak: number;
  fame: number;
  careerEnd?: number;
  latest: Release[];
}

/** O que existe nesta partida (catálogo simulado + documentado posto pela partida, gravadora, contrato, trajetória). */
export function thisRun20(s: GameState, act: Act): ThisRun20 {
  const rels = act.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r);
  let doc = 0;
  for (const r of rels) if (provOf20(s, r) === 'doc') doc++;
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const label = !act.owner ? '' : act.owner === 'player' ? s.config.companyName : s.labels[act.owner]?.name ?? act.owner;
  return {
    doc, sim: rels.length - doc, label,
    contract: c ? { party: c.party, endWeek: c.endWeek, royalty: c.royalty } : undefined,
    debut: act.debutYear, status: act.status, hits: act.hits, number1s: act.number1s, peak: act.peakChart, fame: act.fame,
    careerEnd: act.careerEnd && act.careerEnd <= s.year ? act.careerEnd : undefined,
    latest: rels.sort((a, b) => b.week - a.week).slice(0, 5),
  };
}
