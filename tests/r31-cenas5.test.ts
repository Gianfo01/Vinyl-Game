// R31 · onda 5 (CENAS5): com exp5.nav ligado, toda cena de lugar é só o cenário navegável. Confere que:
//   · a moldura nova não tem "Cena/Ver como lista", "Mostrar tudo que é clicável", "Rótulos", a caixa de ajuda nem a
//     lista de pontos (e desligado = a moldura de hoje, inteira);
//   · todo ponto que a lista mostrava é ponto da cena, alcançável por clique (tem destino) e por teclado (Tab/setas na
//     ordem de leitura chegam a todos), em 2 épocas, em todos os tipos de cena (interiores, vitrine, aeroporto, leilões,
//     beco, alfândega, envelopes, casa Fossati, praça, salas da sede);
//   · o bloqueio sai da dica e vira selo no próprio objeto (antes do clique);
//   · todo arquivo que ainda desenha a moldura antiga só faz isso com o interruptor desligado;
//   · explorar (montar todas as cenas com o interruptor ligado) não muda o estado nem os sorteios.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { setSw } from '../src/sim/r31/switches';
import { SW_NAV5, nav5On } from '../src/sim/r31/exp5';
import { rngSnapshot19 } from '../src/sim/rng19';
import { places27, type PlaceK27 } from '../src/sim/sys/place27';
import { crew31 } from '../src/sim/sys/gente31';
import type { GameState } from '../src/sim/types';
import { INTERIOR_KINDS27 } from '../src/ui/pixel/interior27';
import { insideModel31, type InsideT31 } from '../src/ui/r31/inside31model';
import { vitList31 } from '../src/ui/r31/vit31model';
import { airport31Model } from '../src/ui/r31/airport31model';
import { auction31Model } from '../src/ui/r31/auction31model';
import { bauc31Model } from '../src/ui/r31/bauc31model';
import { customs31Model } from '../src/ui/r31/customs31model';
import { sealed31Model } from '../src/ui/r31/sealed31model';
import { homeModel31, squareModel31 } from '../src/ui/r31/fos31model';
import { SALAS31, salaModel31 } from '../src/ui/r31/salas31model';
import type { Spot31 } from '../src/ui/r31/scene31model';
import { HOW5, help5Of, order5, sceneChrome5, sorted5, splitLock5, step5 } from '../src/ui/r31/cenas5model';

const game = (seed: string, year: number, city: string, nav = true): GameState => {
  const s = createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city } as Parameters<typeof defaultConfig>[1]));
  advanceWeek(s);
  setSw(s, SW_NAV5, nav);
  return s;
};
const LOTS = Array.from({ length: 14 }, (_, i) => 40 + i);
const tgt = (s: GameState, k: PlaceK27): InsideT31 => {
  const p = places27(s, LOTS).find((x) => x.k === k);
  return { id: p?.id ?? `t:${k}`, k, name: p ? p.name.pt : k, what: p?.what.pt, people: p?.people ?? crew31(s, k) ?? [{ name: 'Gerente', role: { pt: 'Gerente', en: 'Manager' } }], year: s.year, city: s.config.homeCity, seed: s.config.seed, place: p, org: p?.org };
};
const ERAS: [number, string][] = [[1965, 'london'], [2005, 'new_york']];

/** Todas as cenas de lugar que passam pelo hospedeiro comum (scene31), pelo nome do tipo. */
function scenes(s: GameState): Record<string, { spots: Spot31[]; W: number; H: number }> {
  const out: Record<string, { spots: Spot31[]; W: number; H: number }> = {};
  for (const k of INTERIOR_KINDS27) { const m = insideModel31(s, tgt(s, k)); out[`interior:${k}`] = m; }
  out['vitrine:feira'] = insideModel31(s, { ...tgt(s, 'records'), vit: 'fair', place: undefined, people: [] });
  out.aeroporto = airport31Model(s);
  out.leiloes = auction31Model(s);
  out.beco = bauc31Model(s);
  out.alfandega = customs31Model(s);
  out.envelopes = sealed31Model(s);
  out['fossati:casa'] = homeModel31(s);
  out['fossati:praca'] = squareModel31(s);
  return out;
}
/** Destino de um ponto: o clique leva a algum lugar. */
const hasGo = (sp: Spot31): boolean => !!(sp.go.panel || sp.go.quick || sp.go.hub || sp.go.tab || sp.go.area || sp.go.act || sp.quick);

/** Pontos alcançáveis só com as setas (→ a partir do primeiro). */
function walk(ids: string[]): Set<string> {
  const seen = new Set<string>();
  let cur: string | undefined;
  for (let i = 0; i < ids.length + 2; i++) { cur = step5(ids, cur, 1); if (cur) seen.add(cur); }
  return seen;
}

describe('CENAS5 · moldura: só o cenário com exp5.nav', () => {
  it('ligado: sem Cena/lista, mostrar clicáveis, rótulos, caixa de ajuda, lista de pontos, legenda ou barra "voltar"', () => {
    const c = sceneChrome5(true);
    expect(Object.values(c).every((v) => v === false)).toBe(true);
  });
  it('desligado: a moldura de hoje inteira (igual a hoje)', () => {
    const c = sceneChrome5(false);
    expect(c).toEqual({ list: true, showAll: true, labels: true, intro: true, points: true, legend: true, backBar: true });
  });
  it('todo arquivo que desenha a moldura antiga pergunta antes pelo exp5.nav (nenhuma cena escapa)', () => {
    const OLD = /Ver como lista|Mostrar tudo que é clicável|'Rótulos'|Voltar à cidade|Pontos desta cena|FIRST_TIP\)/;
    const files = ['scene31', 'mech31', 'salas31', 'inside31', 'fos31', 'vit31', 'airport31', 'auction31', 'bauc31ui', 'customs31ui', 'sealed31ui', 'tour31', 'proj31', 'desk31', 'city31ui', 'under31ui', 'amor31ui'];
    for (const f of files) {
      const src = readFileSync(`src/ui/r31/${f}.ts`, 'utf8').split('\n').filter((x) => !/^\s*(\/\/|\*|\/\*\*)/.test(x)).join('\n'); // sem comentários
      if (OLD.test(src)) expect(src.includes('nav5On('), f).toBe(true);
      // cenas pelo hospedeiro comum ganham o modo novo de graça (sceneView31 decide pelo interruptor)
      if (src.includes('sceneView31(s, {')) expect(readFileSync('src/ui/r31/scene31.ts', 'utf8')).toMatch(/if \(nav5On\(s\)\) return sceneNav5\(s, o\)/);
    }
    // a vitrine não tem mais "ver como lista" nem faixa em lista no modo novo
    const vit = readFileSync('src/ui/r31/vit31.ts', 'utf8');
    expect(vit).toMatch(/nav5On\(s\) \? null : h\('button'[^\n]*Ver como lista/);
    expect(vit).toMatch(/vitStrip31[\s\S]{0,200}if \(nav5On\(s\)\) return null/);
  });
});

describe('CENAS5 · nada fica inalcançável (2 épocas)', () => {
  for (const [y, c] of ERAS) it(`${c} ${y}: todo ponto da lista é ponto da cena, com destino, e Tab/setas chegam a todos`, () => {
    const s = game(`cenas5-${c}-${y}`, y, c);
    for (const [name, m] of Object.entries(scenes(s))) {
      expect(m.spots.length, name).toBeGreaterThan(0);
      const ids = order5(m.spots);
      // a "lista" de hoje = os mesmos pontos (o registro que desenha a cena); todos na ordem de leitura e alcançáveis
      expect(new Set(ids), name).toEqual(new Set(m.spots.map((x) => x.id)));
      expect(walk(ids), name).toEqual(new Set(ids));
      expect(sorted5(m.spots).length, name).toBe(m.spots.length); // nenhum botão some (nem os "quietos")
      for (const sp of m.spots) {
        expect(hasGo(sp), `${name} ${sp.id}`).toBe(true);
        expect(sp.label.pt.trim(), `${name} ${sp.id}`).not.toBe('');
        expect(sp.w > 0 && sp.h > 0, `${name} ${sp.id}`).toBe(true);
      }
    }
  });

  it('leilões: o que a lista mostrava (catálogo e balcão de consignação) é objeto da cena', () => {
    const s = game('cenas5-auc', 1965, 'london');
    const go = new Set(auction31Model(s).spots.map((x) => x.go.panel));
    expect(go.has('catalog')).toBe(true);
    expect(go.has('consign')).toBe(true);
  });

  it('vitrine: com itens no mês, a placa "Vitrine do mês" é ponto da cena (todos os itens a 1 clique)', () => {
    for (const [y, c] of ERAS) {
      const s = game(`cenas5-vit-${y}`, y, c);
      const x = tgt(s, 'records');
      const items = vitList31(s, x);
      const spots = insideModel31(s, x).spots;
      if (items.length) expect(spots.some((sp) => sp.go.panel === 'vitlist'), `${c} ${y}`).toBe(true);
    }
  });

  it('salas da sede: todo ponto tem destino e entra na ajuda do "?"', () => {
    const s = game('cenas5-salas', 2005, 'new_york');
    for (const id of SALAS31) {
      const m = salaModel31(s, id);
      for (const hot of m.hots) expect(!!hot.do, `${id} ${hot.id}`).toBe(true);
      const hp = help5Of(m.title, m.intro, m.hots.map((x) => ({ id: x.id, label: x.label, tip: x.tip })));
      expect(hp.rows.length, id).toBe(new Set(m.hots.filter((x) => !x.id.includes(':')).map((x) => x.id)).size);
    }
  });
});

describe('CENAS5 · bloqueio no próprio objeto e ajuda no "?"', () => {
  it('a dica "texto 🔒 motivo" vira dica + selo com o motivo (pt e en); sem cadeado, nada muda', () => {
    const x = splitLock5({ pt: 'Pedir execução 🔒 Você não tem artista ativo no elenco.', en: 'Pitch a play 🔒 You have no active act on the roster.' });
    expect(x.tip).toEqual({ pt: 'Pedir execução', en: 'Pitch a play' });
    expect(x.lock).toEqual({ pt: 'Você não tem artista ativo no elenco.', en: 'You have no active act on the roster.' });
    expect(splitLock5({ pt: 'Balcão', en: 'Desk' })).toEqual({ tip: { pt: 'Balcão', en: 'Desk' } });
  });
  it('sem artista no elenco, a cabine da rádio mostra o bloqueio antes do clique (selo), e a ajuda do lugar o repete', () => {
    const s = game('cenas5-lock', 1965, 'london');
    for (const id of Object.keys(s.acts)) if (s.acts[id].owner === 'player') s.acts[id].owner = 'npc' as never;
    const m = insideModel31(s, tgt(s, 'radio'));
    const locked = m.spots.map((sp) => ({ sp, x: splitLock5(sp.tip) })).filter((r) => r.x.lock);
    expect(locked.length).toBeGreaterThan(0);
    const hp = help5Of(m.title, { pt: 'x', en: 'x' }, m.spots);
    expect(hp.rows.some((r) => !!r.lock)).toBe(true);
    expect(HOW5.pt).toMatch(/Alt/);
    expect(HOW5.pt).toMatch(/Esc ou Backspace/);
  });
});

describe('CENAS5 · explorar não muda o estado; desligado = igual a hoje', () => {
  it('montar todas as cenas (ligado) não muda o jogo nem os sorteios', () => {
    const s = game('cenas5-snap', 1965, 'london');
    const before = JSON.stringify(s), rng = JSON.stringify(rngSnapshot19(s));
    scenes(s);
    for (const id of SALAS31) salaModel31(s, id);
    expect(JSON.stringify(s)).toBe(before);
    expect(JSON.stringify(rngSnapshot19(s))).toBe(rng);
  });
  it('o conteúdo das cenas é o mesmo com o interruptor ligado ou desligado (só a moldura muda)', () => {
    const on = game('cenas5-same', 2005, 'new_york', true);
    const off = game('cenas5-same', 2005, 'new_york', false);
    expect(nav5On(on)).toBe(true);
    expect(nav5On(off)).toBe(false);
    const a = scenes(on), b = scenes(off);
    for (const k of Object.keys(a)) expect(JSON.stringify(a[k].spots), k).toBe(JSON.stringify(b[k].spots));
  });
  it('o interruptor nasce desligado (partida nova = jogo de hoje)', () => {
    const s = createGame(defaultConfig('cenas5-def', { startYear: 1965, dbSize: 'small', homeCity: 'london' } as Parameters<typeof defaultConfig>[1]));
    expect(nav5On(s)).toBe(false);
  });
});
