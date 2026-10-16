// R31 · onda 2 · K + L — salas da sede em cena: os modelos (sem DOM) batem com o estado, abrir não muda nada e a arte
// escolhida por época e tamanho é determinística.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { hqCaps } from '../src/sim/branches';
import { roleLoads } from '../src/sim/sys/capacity14';
import { relics } from '../src/sim/sys/relics9';
import { playerPerson } from '../src/sim/sys/life';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import { hqModel25 } from '../src/ui/ps/hq25model';
import { CAREERS31, KEY_ROLES31, ROOMS31, SALAS31, artOf31, auditSala31, catalogNums31, relicTier31, salaModel31, youAt31, type SalaId31 } from '../src/ui/r31/salas31model';
import { layout31, paintSala31 } from '../src/ui/r31/salas31px';

const game = (seed: string, year = 1975, scenario = 'established'): GameState => createGame(defaultConfig(seed, { scenario, startYear: year, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
const hot = (s: GameState, id: SalaId31, h: string) => salaModel31(s, id).hots.find((x) => x.id === h);
const hash = (d: Uint32Array): number => { let x = 2166136261; for (let i = 0; i < d.length; i++) x = Math.imul(x ^ d[i], 16777619) >>> 0; return x; };
const tour = (actId: string, cityId: string, status: 'running' | 'planned', day: number) => ({ id: `t-${actId}`, actId, name: 'Turnê K', stops: [{ cityId, day, tier: 1, price: 0, capacity: 100, sold: 0, merch: 0, status: 'played' as const, travelDays: 0 }], setlist: [], minutes: 45 as const, production: 0, role: 'headline' as const, crew: 1, pay: 'door' as const, costReserved: 0, revenue: 0, costs: 0, status, log: [], accidents: 0 });

describe('r31 K: todas as cenas montam e todo ponto leva a algum lugar', () => {
  it('6 salas da sede + 12 cenas de carreira, cada uma com pontos, rótulo, dica e destino', () => {
    expect(SALAS31.length).toBe(ROOMS31.length + CAREERS31.length);
    expect(CAREERS31.length).toBe(12);
    for (const year of [1925, 1975, 2012]) {
      const s = game(`k-all-${year}`, year);
      for (const id of SALAS31) {
        const m = salaModel31(s, id);
        expect(auditSala31(m)).toEqual([]);
        expect(m.hots.length).toBeGreaterThanOrEqual(2);
        expect(m.title.pt && m.title.en).toBeTruthy();
        expect(m.details).toBeTruthy();
        // nada só por cor: todo selo tem símbolo e texto; nenhum texto cru
        for (const h of m.hots) {
          if (h.chip) { expect(h.chip.sym).toBeTruthy(); expect(h.chip.text.pt).toBeTruthy(); }
          for (const txt of [h.label.pt, h.tip.pt, h.chip?.text.pt ?? '']) expect(txt).not.toMatch(/NaN|undefined|\[object/);
        }
      }
    }
  });
});

describe('r31 K: abrir não muda o mundo', () => {
  it('montar todas as cenas, a sede e o layout/pintura deixa o estado idêntico', () => {
    const s = game('k-pure', 1975);
    const id = playerActs(s)[0];
    s.sessions.push({ id: 'ssk', actId: id, songIds: [], approach: 'balanced', tier: 0, startDay: s.day, days: 6, dayDone: 2, takes: {}, costPaid: 0, log: [] });
    hqModel25(s); // a sede já é aberta antes (o estado-base é o de quem chega à cena)
    const before = JSON.stringify(s);
    for (const sid of SALAS31) { const m = salaModel31(s, sid); paintSala31(m, layout31(m)); }
    hqModel25(s);
    youAt31(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('r31 K: os modelos batem com o estado', () => {
  it('Estúdio: fita = dias feitos/total, mesa = qualidade do melhor take, luz, músicos com humor, porta com semanas', () => {
    const s = game('k-studio', 1975);
    const id = playerActs(s)[0];
    const act = s.acts[id];
    const song = act.songs[0] ?? 'song-k';
    s.sessions.push({ id: 'ssk', actId: id, songIds: [song], approach: 'balanced', tier: 0, startDay: s.day, days: 9, dayDone: 3, takes: { [song]: [{ n: 1, quality: 61, note: { pt: 'ok', en: 'ok' } }, { n: 2, quality: 74, note: { pt: 'ok', en: 'ok' } }] }, costPaid: 0, log: [] });
    const m = salaModel31(s, 'studio');
    expect(hot(s, 'studio', 'reel')!.chip!.text.pt).toBe('3/9');
    const desk = m.hots.find((x) => x.id === 'desk')!;
    const rec = s.songs[song] as unknown as { recorded?: boolean; q?: number } | undefined;
    if (!rec?.recorded) expect(desk.chip!.text.pt).toBe('74');
    expect(m.hots.find((x) => x.id === 'light')!.chip!.sym).toBe('●');
    expect(m.hots.find((x) => x.id === 'door')!.chip!.text.pt).toBe('1 sem');
    const alive = act.members.filter((p) => s.persons[p]?.alive).slice(0, 4);
    expect(m.hots.filter((x) => x.id.startsWith('m:')).map((x) => x.personId)).toEqual(alive);
    // estresse alto vira raio; a decisão de take vira ação de 1 clique
    s.persons[alive[0]].stress = 90;
    s.sessions[s.sessions.length - 1].decision = { songId: song, options: ['keep', 'another'] };
    const m2 = salaModel31(s, 'studio');
    expect(m2.hots.find((x) => x.id === `m:${alive[0]}`)!.fig!.bubble).toBe('bolt');
    expect(m2.alerts.length).toBe(1);
    expect(m2.hots.find((x) => x.id === 'desk')!.acts!.filter((b) => b.do.k === 'take').map((b) => (b.do as { choice: string }).choice)).toEqual(['keep', 'another']);
    expect(m2.hots.find((x) => x.id === 'light')!.chip!.sym).toBe('○');
    // estúdio alugado (sessão fora da sede)
    s.sessions[s.sessions.length - 1].tier = 2;
    expect(salaModel31(s, 'studio').art.rented).toBe(true);
  });

  it('Elenco: só quem está na sala; quem está fora vai para o quadro com o lugar; vaga = capacidade − elenco', () => {
    const s = game('k-roster', 1975);
    const ids = playerActs(s);
    const out = ids[0];
    s.tours.push(tour(out, s.config.homeCity, 'running', s.day));
    const m = salaModel31(s, 'roster');
    expect(m.hots.some((x) => x.actId === out)).toBe(false);
    expect(m.away!.some((x) => x.id === out && x.d.pt.startsWith('em turnê'))).toBe(true);
    for (const id of ids.slice(1)) if (s.acts[id].status !== 'hiatus') expect(m.list.some((x) => x.id === id) || m.away!.some((x) => x.id === id)).toBe(true);
    const free = Math.max(0, hqCaps(s).careers - ids.length);
    const v = m.hots.find((x) => x.id === 'vacancy')!;
    expect(v.do).toEqual(free ? { k: 'sala', id: 'talent' } : { k: 'go', area: 'hq' });
    // contrato: anos sobre a cabeça
    const inRoom = m.hots.find((x) => x.actId && x.kind === 'person');
    if (inRoom) { const c = s.contracts[s.acts[inRoom.actId!].contractId ?? '']; if (c && c.party === 'player') expect(inRoom.chip!.text.pt).toBe(`${Math.max(0, Math.round((c.endWeek - s.week) / 52))}a`); }
  });

  it('Equipe: uma mesa por função com a carga do motor; função-chave sem ninguém vira mesa vazia (contratar)', () => {
    const s = game('k-team', 1998);
    s.player.staff = [{ id: 'stk1', name: 'Ana', role: 'anr', skill: 50, salary: 0, hiredWeek: 0 }];
    const m = salaModel31(s, 'team');
    const lo = roleLoads(s).find((x) => x.role === 'anr');
    const desk = m.hots.find((x) => x.id === 'role:anr')!;
    expect(desk.chip!.text.pt).toBe(`${lo?.load ?? 0}%`);
    for (const r of KEY_ROLES31.filter((x) => x !== 'anr')) expect(m.hots.find((x) => x.id === `vaga:${r}`)?.kind).toBe('empty');
    expect(m.alerts.some((a) => a.text.pt.includes('funções-chave'))).toBe(true);
    // sede grande: andares de cima esmaecidos com a visão agregada
    s.player.hq = 4;
    const big = salaModel31(s, 'team');
    expect(big.art.upper).toBeGreaterThan(0);
    expect(big.hots.find((x) => x.id === 'upper')!.do).toEqual({ k: 'agg' });
  });

  it('Catálogo: três armários com números próprios (masters, editora, imagem), nada somado', () => {
    const s = game('k-cat', 1975);
    const n = catalogNums31(s);
    const owned = Object.values(s.releases).filter((r) => r.owner === 'player' && !s.acts[r.actId]?.playerBand).length;
    expect(n.masters).toBe(owned);
    const m = salaModel31(s, 'catalog');
    const chips = ['masters', 'works', 'image'].map((id) => m.hots.find((x) => x.id === id)!.chip!.text.pt);
    expect(chips[0]).toContain(String(n.masters));
    expect(chips[1]).toContain(String(n.works));
    expect(chips[2]).toContain(String(n.image));
    expect(m.hots.some((x) => x.chip?.text.pt.includes(String(n.masters + n.works + n.image)) && n.works + n.image > 0 && x.id !== 'masters')).toBe(false);
    // garagem sem arquivo: caixas num canto
    s.player.hq = 0;
    expect(salaModel31(s, 'catalog').art.boxes).toBe(true);
  });

  it('Talentos: banda no palco mostra só o que se sabe; olheiro, demos e caderno com contagens do estado', () => {
    const s = game('k-talent', 1975);
    const m = salaModel31(s, 'talent');
    const demos = (s.demos ?? []).filter((d) => !d.heard && d.expires >= s.week).length;
    expect(m.hots.find((x) => x.id === 'demos')!.chip!.text.pt).toBe(String(demos));
    for (const h of m.hots.filter((x) => x.id.startsWith('b:'))) expect(h.tip.pt).toMatch(/potencial (\?|~ \d+–\d+|✓ \d+)/);
  });

  it('Troféus e relíquias: cada peça no pedestal do seu nível; vazio leva a Lendas', () => {
    const s = game('k-trophy', 1975);
    const rl = { id: 'rlk', k: 'guitar' as const, n: { pt: 'Guitarra K', en: 'Guitar K' }, y: 1970, own: [] as [string, number, string][], st: 'player' as const, v: 85000 };
    relics(s).list.push(rl);
    const m = salaModel31(s, 'trophy');
    const lvl = relicTier31(s, rl); // R31 G: nível real (valor + história), não mais a faixa de valor
    expect(lvl).toBe(2);
    expect(m.hots.find((x) => x.id === `tier:${lvl}`)!.do).toEqual({ k: 'relic', id: 'rlk' });
    expect(m.hots.find((x) => x.id === 'tier:5')!.do).toEqual({ k: 'go', area: 'lendas' });
  });
});

describe('r31 K: você na sede e nas cenas', () => {
  it('fica na sua sala por padrão; em turnê com a sua banda, a cena diz onde você está', () => {
    const s = game('k-you', 1975);
    const me = playerPerson(s);
    expect(youAt31(s).room).toBe(me ? 'office' : 'office');
    if (!me) return;
    expect(hqModel25(s).rooms.find((r) => r.id === 'office')!.sprites.some((x) => x.kind === 'you')).toBe(true);
    const band = playerActs(s)[0];
    s.acts[band].members.push(me.id);
    s.tours.push(tour(band, s.config.homeCity, 'running', s.day));
    const y = youAt31(s);
    expect(y.here).toBe(false);
    expect(y.where.pt).toContain('turnê');
    expect(salaModel31(s, 'studio').you.here).toBe(false);
    expect(hqModel25(s).away.some((x) => x.kind === 'you')).toBe(true);
  });
});

describe('r31 L: arte por época e tamanho, determinística', () => {
  it('mesmo pedido, mesma arte; a época troca o equipamento e a mídia; o tamanho troca a casca', () => {
    expect(artOf31('studio', 1975, 2)).toEqual(artOf31('studio', 1975, 2));
    expect(artOf31('studio', 1950, 2).gear).toBe('shellac');
    expect(artOf31('studio', 1975, 2).gear).toBe('console');
    expect(artOf31('studio', 2015, 2).gear).toBe('laptop');
    expect(artOf31('catalog', 1985, 2).media).toBe('tapes');
    expect(artOf31('catalog', 2000, 2).media).toBe('cds');
    expect(artOf31('roster', 1975, 0).shell).toBe('garage');
    expect(artOf31('roster', 1975, 4).shell).toBe('tower');
    expect(artOf31('roster', 1975, 0).size).toBe('small');
    expect(artOf31('roster', 1975, 5).size).toBe('big');
    expect(artOf31('team', 1998, 4).upper).toBeGreaterThan(0);
    expect(artOf31('team', 1998, 0).upper).toBe(0);
  });
  it('a pintura é pura: mesma sala e estado → mesmos pixels; outra época → outros pixels', () => {
    for (const id of ['studio', 'roster', 'team', 'catalog', 'talent', 'trophy', 'sig:media'] as SalaId31[]) {
      const a = game('k-px', 1975), b = game('k-px', 1975), c = game('k-px', 2010);
      const ma = salaModel31(a, id), mb = salaModel31(b, id), mc = salaModel31(c, id);
      const pa = paintSala31(ma, layout31(ma)), pb = paintSala31(mb, layout31(mb)), pc = paintSala31(mc, layout31(mc));
      expect(hash(pa.d)).toBe(hash(pb.d));
      expect(hash(pa.d)).not.toBe(hash(pc.d));
    }
  });
  it('pontos clicáveis dentro do desenho', () => {
    const s = game('k-hit', 1990);
    for (const id of SALAS31) {
      const m = salaModel31(s, id);
      const L = layout31(m);
      for (const h of m.hots) {
        const r = L.hits[h.id];
        expect(r.w).toBeGreaterThanOrEqual(14);
        expect(r.x + r.w).toBeGreaterThan(0);
        expect(r.x).toBeLessThan(L.W);
        expect(r.y).toBeLessThan(L.H);
      }
    }
  });
});
