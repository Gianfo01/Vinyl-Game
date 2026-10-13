// r28 (Fase 8, B7/B8) — três CENAS ANIMADAS novas no tocador do cut27 (mesma fila, mesmas preferências, mesmas regras
// "uma vez"): o GOLPE DE NPC (agency18: alguém trama contra você — roubar artista, processo, plágio, vazamento, crítico
// comprado, virar a banda), o HOLOGRAMA (post18/afterlife19/neural: o seu artista morto volta ao palco) e a BRIGA DOS
// HERDEIROS (post18 `dispute`, afterlife19 `estate_suit` de herdeiros/relíquia/masters de um ato seu).
// Módulo PURO (sem DOM), só com `import type` do cut27model (sem ciclo em tempo de execução): o cut27model espalha
// CUT28 no catálogo e chama cutOfFact28 / onceKey28 / figs28. As escolhas mexem no jogo pelos sistemas de sempre
// (caixa pelo livro-razão `post`, reputação, confiança, momento, cansaço) e o "cara ou coroa" sai do hash da cena.

import { l, type L } from '../../data/world';
import type { Fact } from '../../sim/facts17';
import { mineOf17 } from '../../sim/sys/scene17';
import type { Act, GameState } from '../../sim/types';
import { fmtL, money, post } from '../../sim/util';
import type { ArtModel27, Fig27 } from './art27';
import type { Choice27, CutData27, CutDef27 } from './cut27model';

export type CutKey28 = 'coup' | 'holo' | 'heirs';

const cl = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const actOf = (s: GameState, d: CutData27): Act | undefined => (d.actId ? s.acts[d.actId] : undefined);
const rep = (s: GameState, k: keyof GameState['player']['reputation'], d: number) => { s.player.reputation[k] = cl(s.player.reputation[k] + d); };
const pay = (s: GameState, d: CutData27, id: string, dollars: number, cat: string, memo: string): number => { const v = money(s, dollars); post(s, `cut28:${d.ref}:${id}`, -v, cat, memo); return v; };
const $ = (v: number) => `$${Math.round(v / 100).toLocaleString('en-US')}`;
/** "Cara ou coroa" determinístico pela cena (igual ao coin27; não mexe no Rng do jogo). */
export function coin28(ref: string, p = 0.5): boolean { let h = 2166136261; for (let i = 0; i < ref.length; i++) { h ^= ref.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000 < p; }
const Ch = (id: string, label: L, hint: L, apply: Choice27['apply']): Choice27 => ({ id, label, hint, apply });

export const CUT28: Record<CutKey28, CutDef27> = {
  coup: { key: 'coup' as CutDef27['key'], tier: 'major', scene: 'press', prio: 84, ms: 9000, fx: ['flash'],
    title: l('Golpe nos bastidores', 'A backstage coup'),
    beats: [l('Um telefonema tarde da noite.', 'A late-night phone call.'), l('{t}', '{t}'), l('Alguém está jogando contra {b}. Como responder?', 'Someone is playing against {b}. How do you answer?')],
    choices: [
      Ch('lawyer', l('Chamar os advogados', 'Call the lawyers'), l('custa US$ 2.500 · +1,5 reputação institucional', 'costs US$ 2,500 · +1.5 institutional reputation'), (s, d) => {
        const v = pay(s, d, 'lawyer', 2500, 'legal', 'Resposta a golpe de NPC'); rep(s, 'institutional', 1.5);
        return fmtL(l('Notificação extrajudicial no mesmo dia ({v}). O mercado percebe que você reage.', 'A cease-and-desist the same day ({v}). The industry sees you fight back.'), { v: $(v) });
      }),
      Ch('rally', l('Fechar com os seus artistas', 'Close ranks with your artists'), l('+5 confiança do ato, +1 reputação com artistas', '+5 act trust, +1 reputation with artists'), (s, d) => {
        const a = actOf(s, d); if (a) a.trust = cl(a.trust + 5); rep(s, 'artists', 1);
        return l('Jantar com o elenco: "ninguém sai daqui por fofoca".', 'Dinner with the roster: "nobody leaves over gossip".');
      }),
      Ch('strike', l('Revidar na imprensa', 'Strike back in the press'), l('arriscado: +4 momento ou -2 reputação institucional', 'risky: +4 momentum or -2 institutional reputation'), (s, d) => {
        const a = actOf(s, d);
        if (coin28(d.ref)) { if (a) a.momentum = cl(a.momentum + 4); return l('A entrevista viraliza. O golpista fica falando sozinho.', 'The interview goes viral. The schemer is left talking to himself.'); }
        rep(s, 'institutional', -2); return l('A resposta soa mesquinha. Agora são duas manchetes ruins.', 'The reply sounds petty. Now there are two bad headlines.');
      }),
    ] },
  holo: { key: 'holo' as CutDef27['key'], tier: 'major', scene: 'shows', prio: 83, ms: 11000, fx: ['spot', 'gold'],
    title: l('O holograma sobe ao palco', 'The hologram takes the stage'),
    beats: [l('A plateia prende a respiração.', 'The crowd holds its breath.'), l('{p} volta ao palco, feito de luz.', '{p} returns to the stage, made of light.'), l('Metade chora. A outra metade filma. E você?', 'Half of them cry. The other half film it. And you?')],
    choices: [
      Ch('family', l('Dividir a noite com a família', 'Share the night with the family'), l('custa US$ 1.000 · +2 reputação institucional', 'costs US$ 1,000 · +2 institutional reputation'), (s, d) => {
        const v = pay(s, d, 'family', 1000, 'artists', 'Família no holograma'); rep(s, 'institutional', 2);
        return fmtL(l('A família sobe ao palco no fim ({v}). A crítica chama de "homenagem", não de "caça-níquel".', 'The family joins on stage at the end ({v}). Critics call it a "tribute", not a "cash grab".'), { v: $(v) });
      }),
      Ch('tour', l('Anunciar a turnê do holograma', 'Announce the hologram tour'), l('+6 momento, -1,5 reputação artística', '+6 momentum, -1.5 artistic reputation'), (s, d) => {
        const a = actOf(s, d); if (a) a.momentum = cl(a.momentum + 6); rep(s, 'artistic', -1.5);
        return l('Datas em seis países. Os puristas torcem o nariz.', 'Dates in six countries. The purists sneer.');
      }),
      Ch('one', l('Só esta noite', 'Just tonight'), l('+1 reputação artística', '+1 artistic reputation'), (s) => { rep(s, 'artistic', 1); return l('Uma noite só, sem bis. Vira lenda.', 'One night, no encore. It becomes legend.'); }),
    ] },
  heirs: { key: 'heirs' as CutDef27['key'], tier: 'major', scene: 'rights', prio: 82, ms: 10000, fx: ['rain'],
    title: l('Os herdeiros brigam', 'The heirs fight'),
    beats: [l('Uma sala de reunião fria. Advogados dos dois lados.', 'A cold meeting room. Lawyers on both sides.'), l('{t}', '{t}'), l('O catálogo de {a} fica no meio da briga.', 'The {a} catalog is caught in the middle.')],
    choices: [
      Ch('settle', l('Propor um acordo', 'Propose a settlement'), l('custa US$ 4.000 · +2 reputação institucional, +4 confiança', 'costs US$ 4,000 · +2 institutional reputation, +4 trust'), (s, d) => {
        const v = pay(s, d, 'settle', 4000, 'legal', 'Acordo com herdeiros'); rep(s, 'institutional', 2); const a = actOf(s, d); if (a) a.trust = cl(a.trust + 4);
        return fmtL(l('Todos assinam ({v}). O catálogo volta a tocar em paz.', 'Everyone signs ({v}). The catalog plays in peace again.'), { v: $(v) });
      }),
      Ch('side', l('Apoiar um dos lados', 'Back one side'), l('arriscado: +3 reputação institucional ou custa US$ 6.000', 'risky: +3 institutional reputation or costs US$ 6,000'), (s, d) => {
        if (coin28(`${d.ref}:side`, 0.55)) { rep(s, 'institutional', 3); return l('O seu lado vence. O espólio passa a confiar em você.', 'Your side wins. The estate trusts you from now on.'); }
        const v = pay(s, d, 'side', 6000, 'legal', 'Herdeiros: lado perdedor'); return fmtL(l('O juiz decide contra o seu lado. Custas e honorários ({v}).', 'The judge rules against your side. Costs and fees ({v}).'), { v: $(v) });
      }),
      Ch('out', l('Ficar de fora', 'Stay out of it'), l('-3 momento enquanto dura', '-3 momentum while it lasts'), (s, d) => { const a = actOf(s, d); if (a) a.momentum = cl(a.momentum - 3); return l('Você espera. O catálogo fica congelado por um tempo.', 'You wait. The catalog stays frozen for a while.'); }),
    ] },
};

const mineAct = (s: GameState, id?: string): boolean => { const a = id ? s.acts[id] : undefined; return !!a && (a.owner === 'player' || !!a.playerBand || a.releases.some((r) => s.releases[r]?.owner === 'player')); };
/** Golpes da agency18 em que VOCÊ (ou um ato/pessoa seu) é o alvo e o autor não é do seu lado. */
const COUP_KINDS = new Set(['poach', 'law', 'plagiarism', 'leak', 'press']);
export function isCoup28(s: GameState, f: Pick<Fact, 'kind' | 'actors' | 'tags'>): boolean {
  if (!f.tags.includes('ag18')) return false;
  if (!(COUP_KINDS.has(f.kind) || (f.kind === 'statement' && f.tags.includes('intrigue')))) return false;
  const [A, ...T] = f.actors;
  return !!mineOf17(s, T) && !mineOf17(s, [A]);
}
/** Qual cena nova um fato dispara (chamada pelo cutOfFact27 no caso padrão). */
export function cutOfFact28(s: GameState, f: Pick<Fact, 'kind' | 'actors' | 'tags' | 'severity' | 'visibility'>): CutKey28 | null {
  if (isCoup28(s, f)) return f.visibility === 'secret' ? null : 'coup';
  if (f.kind === 'hologram') return f.actors.includes('player') || mineAct(s, f.actors[0]) ? 'holo' : null;
  if (f.kind === 'dispute' && f.tags.includes('estate')) return mineAct(s, f.actors[0]) ? 'heirs' : null;
  if (f.kind === 'estate_suit') return (f.tags.includes('heirs') || f.tags.includes('relic') || f.tags.includes('masters')) && mineAct(s, f.actors[0]) ? 'heirs' : null;
  return null;
}
/** Ato da cena (o fato da agency18 traz [autor, alvo, ato?]; os outros, o ato primeiro). */
export function actOfFact28(s: GameState, key: CutKey28, f: Pick<Fact, 'actors'>): string | undefined {
  if (key === 'coup') return f.actors.slice(1).find((x) => s.acts[x]) ?? mineOf17(s, f.actors.slice(1))?.act;
  return s.acts[f.actors[0]] ? f.actors[0] : undefined;
}
/** Pessoa da cena do holograma (a do fato; senão o holograma mais novo do ato). */
export function pidOfFact28(s: GameState, key: CutKey28, f: Pick<Fact, 'actors'>, actId?: string): string | undefined {
  if (key !== 'holo') return undefined;
  const p = f.actors.find((x) => s.persons[x] && !s.persons[x].isPlayer);
  if (p) return p;
  const hs = (s as unknown as { holograms?: { actId: string; personId: string }[] }).holograms ?? [];
  return [...hs].reverse().find((x) => x.actId === actId)?.personId;
}
export function onceKey28(key: CutKey28, d: CutData27): string {
  switch (key) {
    case 'coup': return `coup:${Math.floor(d.week / 13)}`; // no máximo um golpe por trimestre vira cena
    case 'holo': return `holo:${d.actId ?? ''}:${d.pid ?? ''}`; // a primeira volta de cada pessoa
    case 'heirs': return `heirs:${d.actId ?? ''}:${d.year}`;
  }
}
export const isKey28 = (k: string): k is CutKey28 => k === 'coup' || k === 'holo' || k === 'heirs';

/** Figurantes do quadro. */
export function figs28(key: CutKey28, m: ArtModel27, mem: string[], d: CutData27): Fig27[] {
  switch (key) {
    case 'coup': return [{ fx: 0.3, pose: 'stand', dir: 'SE', pid: mem[0], seed: 'c-cp1' }, { fx: 0.72, walkTo: 0.55, pose: 'walk', dir: 'SW', seed: 'c-cp2' }];
    case 'holo': m.n.fill = 1; m.n.hop = 0; return [{ fx: 0.5, dy: -16, pose: 'play', dir: 'SE', pid: d.pid, seed: 'c-holo', holo: true }]; // r29: translúcido
    case 'heirs': return [{ fx: 0.3, pose: 'stand', dir: 'SE', seed: 'c-h1' }, { fx: 0.7, pose: 'stand', dir: 'SW', seed: 'c-h2' }, { fx: 0.5, pose: 'sit', dir: 'NE', seed: 'c-law' }];
  }
}
