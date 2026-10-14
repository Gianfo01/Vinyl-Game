// Rodada 29 (WIKI, bíblia) — HISTÓRIA REAL ampliada dos artistas e pessoas reais, toda das tabelas do jogo:
// visual famoso por fase (looks15), família (KIN15/KIN27/KINR27/KIN25), obras com autores (WORKS27), covers e samples
// (COVERS17), sucesso mundial (GLOBAL17), década que ajudou a definir (ERAS17), relíquias (RELICS17/18) e mês de entrada e
// saída documentado (MONTHS27).

import { realLook15 } from '../../data/looks15';
import { KIN15, type KinRow } from '../../data/kin15';
import { KIN25 } from '../../data/kin25';
import { KIN27 } from '../../data/kin27';
import { KINR27 } from '../../data/research27';
import { WORKS27 } from '../../data/model27';
import { COVERS17, ERAS17 } from '../../data/heritage17';
import { GLOBAL17 } from '../../data/relevance17';
import { MONTHS27 } from '../../data/lineup27';
import { l } from '../../data/world';
import { canonKey, lineupPick29 } from '../../sim/sys/realworld';
import { H, P, T, ln29, slug29, tx, type RArt29, type RPer29 } from './wiki29core';
import { relics29 } from './wiki29world';
import type { Block29, Inline29 } from './wiki29types';

const same = (a: string, b: string) => canonKey(a) === canonKey(b);

/** Fases do visual famoso (o ano em que cada visual começa), lidas de realLook15 ano a ano. */
export function lookPhases29(name: string): { from: number; look: NonNullable<ReturnType<typeof realLook15>> }[] {
  const out: { from: number; look: NonNullable<ReturnType<typeof realLook15>> }[] = [];
  let last = '';
  for (let y = 1880; y <= 2040; y++) {
    const lk = realLook15(name, y);
    if (!lk) return [];
    const tag = String(lk.rl);
    if (tag !== last) { out.push({ from: y, look: lk }); last = tag; }
  }
  return out;
}

const KREL: Record<string, [string, string]> = { S: ['irmão(ã)', 'sibling'], P: ['pai/mãe ou filho(a)', 'parent or child'], M: ['cônjuge', 'spouse'], X: ['ex-cônjuge', 'ex-spouse'], U: ['tio(a) ou sobrinho(a)', 'uncle/aunt or nephew/niece'], C: ['primo(a)', 'cousin'] };
/** Parentes reais documentados de uma pessoa (todas as tabelas de parentesco do jogo). */
export function realKin29(name: string): { who: string; rel: string; span?: string }[] {
  const out: { who: string; rel: string; span?: string }[] = [];
  const rows: KinRow[] = [...KIN15, ...KIN27, ...KINR27];
  for (const r of rows) {
    const t = r[0];
    const meta = typeof r[r.length - 1] === 'object' ? (r[r.length - 1] as { from?: number; to?: number }) : undefined;
    const names = r.slice(1).filter((x): x is string => typeof x === 'string');
    const i = names.findIndex((n) => same(n, name));
    if (i < 0) continue;
    const span = meta && (meta.from || meta.to) ? `${meta.from ?? '?'}–${meta.to ?? ''}` : undefined;
    if (t === 'P' || t === 'U') {
      // o primeiro é pai/mãe (tio/tia); os demais, filhos (sobrinhos)
      if (i === 0) for (const n of names.slice(1)) out.push({ who: n, rel: t === 'P' ? T('filho(a)', 'child') : T('sobrinho(a)', 'nephew/niece'), span });
      else out.push({ who: names[0], rel: t === 'P' ? T('pai/mãe', 'parent') : T('tio(a)', 'uncle/aunt'), span });
    } else for (const n of names) if (n !== names[i]) out.push({ who: n, rel: T(KREL[t][0], KREL[t][1]), span });
  }
  for (const r of KIN25) {
    const [a, rel, b] = r;
    const meta = r[3] as { from?: number; to?: number } | undefined;
    const span = meta && (meta.from || meta.to) ? `${meta.from ?? '?'}–${meta.to ?? ''}` : undefined;
    const REL25: Record<string, [string, string]> = { parent: ['pai/mãe', 'parent'], child: ['filho(a)', 'child'], sibling: ['irmão(ã)', 'sibling'], spouse: ['cônjuge', 'spouse'], ex: ['ex-cônjuge', 'ex-spouse'], cousin: ['primo(a)', 'cousin'], uncle: ['tio(a)', 'uncle/aunt'], nephew: ['sobrinho(a)', 'nephew/niece'], grandparent: ['avô/avó', 'grandparent'], grandchild: ['neto(a)', 'grandchild'] };
    const INV: Record<string, string> = { parent: 'child', child: 'parent', uncle: 'nephew', nephew: 'uncle', grandparent: 'grandchild', grandchild: 'grandparent' };
    // a linha diz "a é <rel> de b"
    if (same(a, name)) out.push({ who: b, rel: T(REL25[INV[rel] ?? rel][0], REL25[INV[rel] ?? rel][1]), span });
    else if (same(b, name)) out.push({ who: a, rel: T(REL25[rel][0], REL25[rel][1]), span });
  }
  const seen = new Set<string>();
  return out.filter((x) => { const k = `${canonKey(x.who)}|${x.rel}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Link para a pessoa real se ela existe no catálogo; senão, só o nome. */
function who(name: string, has: (slug: string) => boolean): Inline29 {
  const sl = slug29(name);
  return has(sl) ? ln29(`rp:${sl}`, name) : name;
}

/** História real ampliada de uma PESSOA real. */
export function personLore29(rp: RPer29, has: (slug: string) => boolean): Block29[] {
  const out: Block29[] = [];
  const ph = lookPhases29(rp.n);
  if (ph.length) out.push(H(T('Visual famoso por fase', 'Famous look by phase')), { k: 'arts', items: ph.map((x, i) => ({ art: { k: 'portrait' as const, id: `r:${rp.slug}:${i}`, look: x.look, born: rp.b, year: Math.max(x.from, (rp.b ?? 1900) + 18) }, cap: i === 0 ? T('primeira fase', 'first phase') : `${T('desde', 'since')} ${x.from}` })) });
  const kin = realKin29(rp.n);
  if (kin.length) out.push(H(T('Família (documentada)', 'Family (documented)')), { k: 'ul', items: kin.map((k) => [who(k.who, has), ` — ${k.rel}${k.span ? ` (${k.span})` : ''}`]) });
  const works = WORKS27.filter((w) => w.w.some((n) => same(n, rp.n)));
  if (works.length) out.push(H(T('Obras que compôs (autoria documentada)', 'Works written (documented authorship)')), { k: 'ul', items: works.slice(0, 60).map((w) => [`"${w.t}"${w.oy ? ` (${w.oy})` : ''}${w.by ? ` — ${w.by}` : ''}`, w.w.length > 1 ? ` · ${T('com', 'with')} ${w.w.filter((n) => !same(n, rp.n)).join(', ')}` : '']) });
  return out;
}

/** História real ampliada de um ARTISTA/BANDA real. */
export function actLore29(a: RArt29): Block29[] {
  const out: Block29[] = [];
  // formação inicial nas partidas com nomes reais (fora do modo exato): "mais famosa" (padrão) × "original" (da estreia)
  if (a.m && a.m.length > 1) {
    try {
      const fam = lineupPick29(a.m, a.d, 'famous', a.n), ori = lineupPick29(a.m, a.d, 'original', a.n);
      const names = (ix: Set<number>) => [...ix].map((i) => a.m![i]?.[0]).filter(Boolean).join(', ');
      out.push(H(T('Formação inicial numa partida', 'Starting lineup in a run')), { k: 'kv', rows: [
        [T('Mais famosa (padrão)', 'Most famous (default)'), [names(fam)]], [T('Original (da estreia)', 'Original (at debut)'), [names(ori)]],
      ] }, P(T('Vale nas partidas com nomes reais fora da "Vida real exata". Depois do início nenhuma troca real é agendada: trocas, separações e voltas são simuladas. Quem fica fora da formação escolhida existe como pessoa sem banda (não é ex-integrante).', 'Applies to runs with real names outside "Exact real life". After the start no real lineup change is scheduled: changes, splits and reunions are simulated. Whoever is left out of the chosen lineup exists as a band-less person (not a former member).')));
    } catch { /* sem formação */ }
  }
  const g = GLOBAL17.filter((x) => same(x[0], a.n));
  if (g.length) out.push(H(T('Sucesso mundial', 'Worldwide success')), { k: 'ul', items: g.map((x) => [`${x[1]}–${x[2]} · ${tx(l(x[4], x[5]))} (${T('peso global', 'global weight')} ${x[3]})`]) });
  const eras = ERAS17.filter((e) => e[1].some((n) => same(n, a.n)));
  if (eras.length) out.push(H(T('Ajudou a definir a década', 'Helped define the decade')), { k: 'ul', items: eras.map((e) => [`${e[0]}s — ${tx(l(e[2], e[3]))}`]) });
  const cov = COVERS17.filter((c) => same(c[4], a.n) || same(c[5], a.n));
  if (cov.length) out.push(H(T('Covers e samples famosos', 'Famous covers and samples')), { k: 'ul', items: cov.map((c) => [`${c[0]} · "${c[3]}" (${c[2]}) — ${tx(l(c[7], c[8]))}`]) });
  const works = WORKS27.filter((w) => w.by && same(w.by, a.n));
  if (works.length) out.push(H(T('Obras e autores', 'Works and writers')), { k: 'ul', items: works.slice(0, 60).map((w) => [`"${w.t}"${w.oy ? ` (${w.oy})` : ''} — ${w.w.join(', ')}`]) });
  const rl = relics29().filter((d) => same(d.owner, a.n));
  if (rl.length) out.push(H(T('Relíquias', 'Relics')), { k: 'arts', items: rl.map((d) => ({ art: { k: 'relic' as const, kind: d.kind, name: tx(d.name), year: d.year, seed: d.id }, cap: `${tx(d.name)} (${d.year})`, link: `relic:${d.id}` })) });
  const mo = MONTHS27[a.n];
  if (mo) {
    const M = T('jan fev mar abr mai jun jul ago set out nov dez', 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec').split(' ');
    out.push(H(T('Mês documentado de entradas e saídas', 'Documented month of joins and exits')), { k: 'ul', items: Object.entries(mo).map(([n, [j, s0]]) => [`${n}: ${j ? `${T('entra em', 'joins in')} ${M[j - 1]}` : ''}${j && s0 ? ' · ' : ''}${s0 ? `${T('sai em', 'leaves in')} ${M[s0 - 1]}` : ''}`]) });
  }
  return out;
}

export { P };
