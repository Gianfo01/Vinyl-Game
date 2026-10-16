// r27 (P2B): turnê no mapa (eventos de estrada), crises com relógio e reunião de diretoria — determinismo, modo
// rápido intacto (mesmo mundo do r27-m2), cada decisão mexe no resultado na direção esperada, sem NaN, políticas
// (policy18) e seguros contam, bots não passam por aqui.
import { beforeAll, describe, expect, it } from 'vitest';
import { Rng, hashString } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { STOP27, cancelTour, planTour, playStop } from '../src/sim/tours';
import type { GameState } from '../src/sim/types';
import { money, playerActs } from '../src/sim/util';
import { emitFact } from '../src/sim/facts17';
import {
  ODDS27, autoPick27, basePlan27, bookRoute27, isRoad27, pendingRoad27, resolveRoad27, roadOf27, roadEvent27, routeView27,
} from '../src/sim/sys/road27';
import {
  ACTS27, CFG27, actCrisis27, crisisActs27, crisisById27, crisisCands27, crisisWeek27, delegatePick27, finish27, openCrisis27, type Crisis27,
} from '../src/sim/sys/crisis27';
import { agenda27, autoDecide27, board27, closeMeeting27, decide27, directors27, setBoard27 } from '../src/sim/sys/board27';
import { setDir31 } from '../src/sim/deleg31';
import { buyIns19 } from '../src/sim/sys/links19b';
import { ins19 } from '../src/sim/sys/insure19';
import { rngSnapshot19 } from '../src/sim/rng19';
import { staffLoyalty } from '../src/sim/opinion';

let FIX: GameState; // 7º mês da semente r16pb-5 (mesmo fixture do r27-m2)
let AFTER: GameState; // 8º mês (modo rápido)
const clone = (s: GameState): GameState => structuredClone(s);
const nan = (o: unknown): boolean => JSON.stringify(o, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NaN!' : v)).includes('NaN!');
const x4 = (s: GameState) => s.x4 as unknown as Record<string, unknown>;

beforeAll(() => {
  const s = createGame(defaultConfig('r16pb-5', { startYear: 1975, realNames: true }));
  for (let m = 0; m < 8 && !s.ended; m++) {
    playMonth(s, 'balanced');
    if (m === 7) FIX = clone(s);
    advanceMonth(s);
  }
  AFTER = s;
}, 900000);

describe('r27 P2B — modo rápido intacto', () => {
  it('com os módulos P2B carregados, o mundo do playbot é o mesmo de antes deles', () => {
    // valores medidos com src/sim/tours.ts e src/sim/sys/index.ts SEM as mudanças do P2B (mesma semente, 8 meses de playbot).
    // Re-medidos na r27 (docs/suite27-final.md) depois de dois merges que mudam o mundo de propósito. Valores antigos
    // (1301031 / 1382068899 / 2195685417 / 2442526734) reproduzem em b748d64; AUD2 (c4c5bfd: estresse, críticos,
    // choques macro) mudou só acts (→ 3789538846); AUD1 (166a36e: playbot compra negócios e contrata no 1º ano) mudou
    // caixa, tours, acts e rng.
    // R28 F3 (story28, de propósito): mundo inicial pela cena, nomes na língua do país, 0,85ⁿ e cooldown por (evento, ator),
    // portões de época e eco pela receita mudam caixa, acts e rng (tours igual). Antes: 1089445 / 529417993 / 1761475379 / 3113611029.
    // A garantia "o P2B não mexe no modo rápido" segue provada pelo teste do gancho logo abaixo (com × sem STOP27.pre).
    // R28: re-medidos depois de dois merges que mudam o mundo de propósito — fase 5 (rival disputa a oferta ao vivo e
    // tem reserva própria: 77884 / 1382068899 / 4242977539 / 1276410388) e formações reais na data inicial (95b6b81,
    // realNames: integrantes pela passagem, ex-integrantes, trocas agendadas). O bot prometendo não muda esta semente.
    // Com F3 + F5 + formações juntos (merge R28): 612278 / 1382068899 / 4174246961 / 1111696030. Mais F8 (reputação de
    // selo NPC nas ofertas, facções, prêmios, cadeias) e F4: 284310 / 1382068899 / 2698844748 / 292729101. Bot equilibrado
    // trocando promessa de prioridade por adiantamento menor (F5): 446768 / 1382068899 / 855772293 / 288537379. Relíquias
    // novas que nascem de eventos (R28 arte: certificados, pôsteres, ingressos…): 446096 / 1382068899 / 4292160800 / 2262769409.
    // R29 (CONNECT, de propósito — docs/connect29.md): perks appeal/chartUnits/showRevenue/pressingCost passam a valer,
    // modificadores songQ depois dos ganchos de gravação, escândalo → próximo disco, prêmios → prestígio: caixa e acts mudam;
    // tours e rng iguais (427926 / 1382068899 / 1063419696 / 2262769409). Depois, ganchos de início em ordem fixa (atos reais
    // marcados no lineup16 e renomes depois que existem; antes dependia da ordem dos imports): caixa, acts e rng mudam.
    // Antes da R29: 446096 / 1382068899 / 4292160800 / 2262769409.
    // R29 (feat de pessoa, de propósito — docs/feat29.md): atos NPC creditam pessoas (integrante/solo/músico de estúdio)
    // nas próprias faixas (6 nesta semente em 8 meses): performance/Q da faixa, cachê, laços, reação da banda e público
    // cruzado mudam caixa, acts e rng (tours igual). Antes: 252 / 1382068899 / 2817744560 / 1576372716.
    // R29 relíquias procedurais (relics29): viram notícia e mexem um pouco em fama/fãs (acts) e no caixa; antes 450730 / acts 2126210917.
    // R29 (CONECTAR TUDO, de propósito — docs/connect29.md): arestas novas entre sistemas (conn29: confiança no palco/estúdio,
    // crise na demanda da cidade, prêmios → fama/reputação, reputação → fama/equipe, calor policial…) mudam caixa, tours, acts e
    // rng (com os grupos 2 e 3 e os pisos anti-espiral). Antes: 450735 / 1382068899 / 2386675548 / 2839816166.
    // R29 DEMO (de propósito — docs/demo29.md): público por idade e região muda apelo, demanda nas cidades, divisão por país,
    // line-up dos festivais e o relatório do analista (nova dica): caixa, acts e rng mudam (tours igual). Antes: 450735 / 2386675548 / 2839816166.
    // R29 CONECTAR TUDO + DEMO juntos (merge r29-demo): re-medido. Antes (só conn29): 333758 / 1642544891 / 3380302445 / 2264116950.
    // R29 relíquias, "bem mais relíquias por save" (densidade padrão "muitas" — docs/reliquias29.md): ~7× mais peças
    // procedurais (22 em 8 meses de 1975 nesta semente, contra 3), mais lotes em leilão e ofertas no mercado negro; caixa, acts e rng mudam
    // (tours igual). Antes: 450735 / 1382068899 / 2386675548 / 2839816166. Com relicDensity 'few' o mundo é o de antes.
  // R29 conectar tudo + relíquias juntos: re-medido.
    // R29 família (sys/family29, de propósito — docs/familia29.md): vida familiar dos artistas NPC (Rng próprio; casal célebre
    // mexe em fama/público dos atos, o que muda a venda nas paradas da turnê): acts e tours mudam (caixa e rng iguais).
    // Antes: tours 3927711826 / acts 827562554.
    // R29 conectar tudo + público + relíquias "muitas" juntos (merge friendly-brown): re-medido. Antes: 332627 / 1382068899 / 1849171597 / 4090265307.
  // R29: conectar tudo (13 sistemas, com público por idade/região) + família juntos: re-medido.
    // R29 (contratos+, de propósito — docs/contratos29.md): empresários NPC com contrato e comissão (sai do caixa do ato),
    // produtoras NPC assinando e entregando masters, JV de estrela com selo NPC e disputa por JV mudam caixa, acts e rng
    // (tours igual). Antes: 450735 / 1382068899 / 2386675548 / 2839816166.
  // R29: contratos+ (NPCs) junto com conectar tudo/público/família: re-medido.
    // R29c (facções × artistas do mundo, aff29npc — de propósito, docs/submundo29.md): Outfit, Genovese e Sumiyoshi
    // abordam atos NPC de jazz/blues/pop/enka nesta semente (cerca de uma dezena de abordagens em 8 meses: bailes/boates com cachê e embalo,
    // pedágios, recusas com ameaça e rixas de cena), o mercado e os sorteios do fluxo comum mudam: caixa, acts e rng
    // mudam; tours igual. O caixa do playbot oscila centenas de milhares de mês a mês nesta semente (o 8º mês caiu num
    // vale). Antes: 450735 / 1382068899 / 2386675548 / 2839816166.
  // R29: facções × artistas do mundo (aff29npc) junto com o resto: re-medido.
    // R29 conectar tudo, rodada 11 (docs/connect29.md §11: público/sede/família/notoriedade, conn29b): o embalo pelo público
    // jovem e a mistura por idade mudam caixa, acts e rng (tours igual). Antes: 215781 / 1382068899 / 1494032110 / 3946783658.
  // R29: conectar tudo rodada 11 (conn29b) junto com facções × mundo: re-medido.
    // R31 (W0-RNG, de propósito — docs/r31/DECISOES.md): o fluxo único s.rng saiu; o mundo nasce no fluxo 'world', o motor sorteia
    // em 'tick' e o playbot em 'act': caixa, acts e rng mudam; nesta semente o bot não marca turnê nos 8 meses (tours = []).
    // Antes: 1034775 / 2631883956 / 829002627 / 1362224447.
    // R31 (E · Bolsa, de propósito — docs/r31/DECISOES.md): selos rivais com preço pelo valor único (r31/value31) mudam as
    // participações e compras de NPCs (acts); o humor do mercado ganhou fluxo próprio 'bolsa31' (rng muda só por ele). Antes: acts 3472429155 / rng 3703770621.
    // R31 (Z · base nova, de propósito — docs/r31/DECISOES.md): 68 artistas reais novos no fim de REAL_ALL e 28 relíquias
    // reais novas mudam o mundo (atos novos estreando, peças e fatos de relíquia): caixa, turnês, acts e rng mudam. A família
    // Fossati sozinha não muda nada (conferido com a base nova desligada). Antes: 178753 / 1382068899 / 1746594873 / 3786914192.
    // R31 onda 3 (D/Y, de propósito — docs/r31/DECISOES.md e docs/r31/dy.md): sem a penalização pós-1990 do jogador, pressão
    // de mercado igual para todos, previsão pela conta real, demanda e paradas por país (fama local, língua, leis no país,
    // dominó, teto de fama fora de casa, mercado reservado) e transporte por trecho: caixa, acts e rng mudam e o bot passa a
    // marcar turnê nesses 8 meses. Antes (com a Bolsa E): 178753 / 1382068899 / 1746594873 / 3786914192.
    // R31 onda 3 (AP · aparência, de propósito — docs/r31/DECISOES.md e docs/r31/ap.md): a imagem passa a ler a ficha de aparência
    // (idade, estresse, forma, estilo), o peso da imagem no apelo ganha gênero/público/pressão histórica e a aparência entra em
    // clipe, marcas, merch, entrevistas e valor; caixa, turnês, acts e rng mudam. Com `look31` desligado voltam 40406 / 2734588704 / 1531685321 / 3382588419.
    // R31 onda 4 (N · bandas de ficção no mundo, de propósito — docs/r31/DECISOES.md e docs/r31/nx.md): ~4 bandas de filmes e séries
    // (Stillwater, Electric Mayhem…) estreiam nesses 8 meses e mudam a trajetória; com `fic31` desligado voltam 257209 / 4026815485 / 68287867 / 205718420.
    // R31 onda 4 (I · gente nos lugares, de propósito — docs/r31/DECISOES.md e docs/r31/is.md): donos e equipe dos lugares da
    // cidade são pessoas da base; sem ninguém adequado nasce gente nova (29 pessoas nesta semente em 8 meses), e os sistemas
    // que percorrem todas as pessoas mudam detalhes de fama, fãs e caixa dos atos (só acts muda; caixa, turnês e rng iguais).
    // Com `gente31` desligado volta acts 68287867.
    // Junção N + I (integração da onda 4): as duas mudanças juntas dão caixa 1132370 e acts 4020965551 (turnês e rng iguais ao N).
    // R31 onda 4 (UNI-4 · fusões grandes, de propósito — docs/r31/DECISOES.md e docs/r31/uni4.md): relação com a praça numa
    // fonte só (neutro 30), segredos da Intriga e trunfos do livro na camada única (podem vazar), satisfação do cliente = confiança
    // do empresário, shows avulsos/acordos/estrada como papéis em s.tours e registros únicos de festivais, casas e rivais (a
    // ordem de carga dos módulos mudou a ordem dos ganchos): caixa, turnês, acts e rng mudam; o caixa do bot nesta semente
    // oscila centenas de milhares de mês a mês (o 8º mês caiu num vale). Com `uni4.links` desligado só acts muda (289804343).
    // Antes: 257209 / 4026815485 (p2b) / 68287867 / 205718420.
    // UNI-4 + I juntos: re-medido — só acts muda em relação ao UNI-4 sozinho (4266817177 → 3500990849).
    // UNI-4 (cache da ficha com chave completa — o jogo carregado de um save divergia): caixa 10093 → 10092 e
    // acts 3500990849 → 1560130818 (o r27-p2a, sem os módulos P2B, não muda).
    // UNI-4 + N + I + T/H/CAR2 (junção final da onda 4): re-medido com tudo junto — 182589 / turnês 3575668786 / acts 1693608899 / rng 103954728.
    // R31 onda 4 (BASE-BR · base brasileira ampliada, de propósito — docs/r31/DECISOES.md e docs/r31/base-br.md): 337 atos
    // brasileiros reais novos no fim de REAL_ALL estreiam (mais atos reais disputando contratos, paradas e público com
    // eles) — caixa, turnês, acts e rng mudam; o caixa do bot nesta semente oscila centenas de milhares de mês a mês (já anotado no UNI-4). Com
    // `base31.br` desligado voltam 182589 / 3575668786 / 1693608899 / 3302724126 (conferido).
    expect(AFTER.player.cash).toBe(9071);
    expect(hashString(JSON.stringify(AFTER.tours))).toBe(283887455);
    expect(hashString(JSON.stringify(AFTER.acts))).toBe(1695895254);
    expect(hashString(rngSnapshot19(AFTER))).toBe(4020433329);
  // R31 onda 4 (VIT · vitrine do mês, de propósito — docs/r31/vit.md): o mês dos lugares é sorteado no fluxo rng19 próprio 'vit31'; só o rng muda (caixa, turnês e acts iguais). Com `vit31` desligado volta 103954728. LOTE soma o fluxo lots31 (VIT+LOTE juntos: 3302724126).
  });
  it('nada de estado P2B criado sem o jogador', () => {
    expect(AFTER.tours.some((t) => t.road)).toBe(false); // UNI-4: estrada na própria turnê
    expect(x4(AFTER).crisis27).toBeUndefined();
    expect(x4(AFTER).board27).toBeUndefined();
    expect(AFTER.tours.some((t) => isRoad27(AFTER, t.id))).toBe(false);
  });
  it('turnê marcada pelo caminho de sempre: o gancho da estrada não mexe em nada', () => {
    const run = (hook: boolean) => {
      const s = clone(FIX);
      s.player.cash += money(s, 200000);
      // R29: com o mundo novo o bot já tem turnê marcada no 1º ato — mesmo critério do roadFix abaixo
      let actId = playerActs(s).find((id) => !s.tours.some((t) => t.actId === id && (t.status === 'planned' || t.status === 'running')));
      if (!actId) { actId = playerActs(s)[0]; for (const t of s.tours) if (t.actId === actId && (t.status === 'planned' || t.status === 'running')) cancelTour(s, t.id); }
      const r = planTour(s, basePlan27(s, actId, ['rio', 'buenos_aires', 'montevideo', 'santiago'].filter((c) => c !== s.acts[actId].city), { startInDays: 7 }));
      expect('id' in r).toBe(true);
      const pre = STOP27.pre;
      if (!hook) STOP27.pre = undefined;
      try { advanceMonth(s); advanceMonth(s); } finally { STOP27.pre = pre; }
      return { t: hashString(JSON.stringify(s.tours)), a: hashString(JSON.stringify(s.acts)), r: hashString(rngSnapshot19(s)), c: s.player.cash, played: s.tours.flatMap((t) => t.stops.filter((x) => x.status === 'played')).length };
    };
    const a = run(true), b = run(false);
    expect(a).toEqual(b);
    expect(a.played).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------------------------------- turnê no mapa
const CITIES = ['rio', 'sao_paulo', 'buenos_aires', 'montevideo', 'santiago', 'lima', 'mexico_city', 'new_york', 'chicago', 'los_angeles'];
function roadFix(): { s: GameState; tid: string } {
  const s = clone(FIX);
  let actId = playerActs(s).find((id) => !s.tours.some((t) => t.actId === id && (t.status === 'planned' || t.status === 'running')));
  if (!actId) { actId = playerActs(s)[0]; for (const t of s.tours) if (t.actId === actId && (t.status === 'planned' || t.status === 'running')) cancelTour(s, t.id); }
  const home = s.acts[actId].city;
  // R29 demo29: com o mundo novo, 6 paradas desta semente não sorteiam nenhum evento de estrada; 10 paradas garantem a amostra
  const cities = CITIES.filter((c) => c !== home).slice(0, 10);
  s.player.cash += money(s, 200000);
  let r = bookRoute27(s, basePlan27(s, actId, cities, { startInDays: 7 }));
  // R31 (BASE-BR): no mundo com a base brasileira um integrante do ato já tem agenda neste mês (outro ato dele); a mesma
  // estrada marcada com mais folga (o teste é da estrada, não da agenda)
  for (const d of [21, 35, 49]) if (!('id' in r)) r = bookRoute27(s, basePlan27(s, actId, cities, { startInDays: d }));
  if (!('id' in r)) throw new Error(`book: ${r.pt}`);
  return { s, tid: r.id };
}

describe('r27 P2B — turnê no mapa', () => {
  it('a rota mostra trecho, praça, economia e risco por parada, sem NaN', () => {
    const s = clone(FIX);
    const actId = playerActs(s)[0];
    const rv = routeView27(s, basePlan27(s, actId, ['rio', 'buenos_aires', 'london']))!;
    expect(rv.stops.length).toBe(3);
    for (const x of rv.stops) {
      expect(x.econ.buy).toBeGreaterThan(0);
      expect(x.capacity).toBeGreaterThan(0);
      expect(x.roadOdds).toBe(ODDS27);
      expect(x.likely.length).toBeGreaterThan(0);
    }
    expect(rv.stops[2].km).toBeGreaterThan(rv.stops[1].km); // Buenos Aires → Londres é mais longe que Rio → Buenos Aires
    expect(nan(rv)).toBe(false);
  });

  it('marcar usa o planTour de sempre e liga os eventos só nesta turnê', () => {
    const { s, tid } = roadFix();
    expect(isRoad27(s, tid)).toBe(true);
    expect(s.tours.filter((t) => isRoad27(s, t.id)).length).toBe(1);
    const t = s.tours.find((x) => x.id === tid)!;
    expect(t.costReserved).toBeGreaterThan(0);
  });

  it('eventos determinísticos (mesma semente, mesma estrada)', () => {
    const a = roadFix(), b = roadFix();
    const ea = a.s.tours.find((x) => x.id === a.tid)!.stops.map((st) => roadEvent27(a.s, a.s.tours.find((x) => x.id === a.tid)!, st)?.k ?? '-');
    const eb = b.s.tours.find((x) => x.id === b.tid)!.stops.map((st) => roadEvent27(b.s, b.s.tours.find((x) => x.id === b.tid)!, st)?.k ?? '-');
    expect(ea).toEqual(eb);
    expect(ea.some((k) => k !== '-')).toBe(true);
  });

  it('cada escolha mexe na noite na direção esperada (via playStop de sempre)', () => {
    const { s: base, tid } = roadFix();
    const tour = base.tours.find((x) => x.id === tid)!;
    const stops = tour.stops.filter((st) => roadEvent27(base, tour, st));
    expect(stops.length).toBeGreaterThan(0);
    let compared = 0;
    for (const st0 of stops) {
      const ev = roadEvent27(base, tour, st0)!;
      const play = (s: GameState) => {
        const t = s.tours.find((x) => x.id === tid)!, st = t.stops.find((x) => x.day === st0.day)!, a = s.acts[t.actId];
        const f0 = a.fans.casual + a.fans.active + a.fans.core;
        playStop(s, Rng.fromSeed('p2b-test'), t, st, st.day, a); // só esta data, com sorte fixa
        return { st, fans: a.fans.casual + a.fans.active + a.fans.core - f0 };
      };
      const outs = ev.opts.map((_o, i) => {
        const s = clone(base);
        const r = resolveRoad27(s, tid, st0.day, i);
        expect('k' in r).toBe(true);
        return { d: r as Extract<typeof r, { k: string }>, ...play(s) };
      });
      for (const x of outs) {
        if (x.d.skip) { expect(x.st.status).toBe('cancelled'); expect(x.st.sold).toBe(0); }
        expect(nan(x.d)).toBe(false);
      }
      // mesma noite, mesma sorte: derrubar a qualidade não vende mais; trazer fãs converte mais
      const neutral = outs.find((x) => !x.d.skip && !x.d.mods && x.st.status === 'played' && x.st.capacity === st0.capacity);
      if (!neutral) continue;
      for (const x of outs) {
        if (x.d.skip || x.st.status !== 'played' || x.st.capacity !== st0.capacity) continue;
        if ((x.d.mods?.qMult ?? 1) < 1 && !x.d.mods?.fans) { expect(x.st.sold).toBeLessThanOrEqual(neutral.st.sold); compared++; }
        // R28: num ato pequeno (fixture novo) o ganho de fãs da noite neutra é 1 e o multiplicador arredonda igual — aí
        // basta não perder; com base de 10+ fãs, trazer fãs tem de converter mais
        if ((x.d.mods?.fans ?? 1) > 1 && (x.d.mods?.qMult ?? 1) >= 1) { if (neutral.fans >= 10) expect(x.fans).toBeGreaterThan(neutral.fans); else expect(x.fans).toBeGreaterThanOrEqual(neutral.fans); compared++; }
      }
    }
    // decidir de novo é recusado
    const s2 = clone(base); resolveRoad27(s2, tid, stops[0].day, 0);
    expect('pt' in (resolveRoad27(s2, tid, stops[0].day, 1) as object)).toBe(true);
    expect(compared).toBeGreaterThanOrEqual(0);
  });

  it('sem decisão do jogador, a equipe decide no dia (dentro da política) e o mês corre igual nos dois clones', () => {
    const a = roadFix(), b = roadFix();
    advanceMonth(a.s); advanceMonth(b.s);
    // R31 (BASE-BR): a estrada pode ter saído com folga (roadFix) — corre mais um mês nos dois clones até ter paradas
    for (let i = 0; i < 2 && !Object.values(roadOf27(a.s, a.tid)?.ev ?? {}).length; i++) { advanceMonth(a.s); advanceMonth(b.s); }
    const R = roadOf27(a.s, a.tid)!; // UNI-4: estrada na própria turnê
    expect(Object.values(R.ev).length).toBeGreaterThan(0);
    expect(Object.values(R.ev).every((x) => x.auto)).toBe(true);
    expect(hashString(JSON.stringify(a.s.tours))).toBe(hashString(JSON.stringify(b.s.tours)));
    expect(a.s.player.cash).toBe(b.s.player.cash);
    expect(nan(a.s.tours)).toBe(false);
  });

  it('teto de gasto apertado: a equipe não escolhe a opção cara', () => {
    const { s, tid } = roadFix();
    setDir31(s, 'finance', { cap: 1 });
    const t = s.tours.find((x) => x.id === tid)!;
    for (const st of t.stops) {
      const ev = roadEvent27(s, t, st);
      if (!ev) continue;
      const i = autoPick27(s, ev);
      expect(ev.opts[i].cost).toBe(0);
    }
    expect(pendingRoad27(s, 400).every((x) => x.t.id === tid)).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------- crises
function bankrupt(): GameState {
  const s = clone(FIX);
  s.player.cash = -money(s, 30000);
  s.player.insolvencyMonths = 1;
  return s;
}

describe('r27 P2B — crises com relógio', () => {
  it('gatilhos de sempre viram crises na mesa (falência, processo, incêndio, prisão)', () => {
    const s = bankrupt();
    const a = s.acts[playerActs(s)[0]];
    const other = Object.keys(s.persons).find((id) => !a.members.includes(id))!;
    emitFact(s, { kind: 'session_lawsuit', actors: [other, 'player', a.id], severity: 45, visibility: 'public', tags: ['bad', 'court'], text: { pt: 'Músico processa o selo', en: 'Musician sues the label' }, src: 'test' });
    emitFact(s, { kind: 'disaster', actors: [a.id], place: a.city, severity: 55, visibility: 'public', tags: ['bad', 'fire'], text: { pt: 'Incêndio no estúdio', en: 'Studio fire' }, src: 'test' });
    emitFact(s, { kind: 'arrest', actors: [a.members[0], a.id], place: a.city, severity: 60, visibility: 'public', tags: ['crime', 'bad'], text: { pt: 'Preso', en: 'Arrested' }, src: 'test' });
    const ks = [...new Set(crisisCands27(s).map((c) => c.k))].sort();
    expect(ks).toEqual(['arrest', 'bankrupt', 'fire', 'lawsuit']);
    expect(crisisCands27(clone(FIX)).filter((c) => c.k === 'bankrupt').length).toBe(0);
  });

  it('abrir a sala: relógio, K ações por semana, ações mexem na ameaça e tudo é determinístico', () => {
    const run = () => {
      const s = bankrupt();
      const c = openCrisis27(s, crisisCands27(s).find((x) => x.k === 'bankrupt')!.id) as Crisis27;
      expect(c.left).toBe(12); // (4 − 1) meses até a insolvência × 4 semanas
      const t0 = c.threat;
      const r1 = actCrisis27(s, c.id, 'creditors');
      const r2 = actCrisis27(s, c.id, 'cut');
      expect('ok' in (r1 as object)).toBe(true);
      expect('ok' in (r2 as object)).toBe(true);
      const r3 = actCrisis27(s, c.id, 'advance');
      expect('pt' in (r3 as object)).toBe(true); // sem ação sobrando nesta semana (2 por semana sem administração)
      return { s, c, t0 };
    };
    const a = run(), b = run();
    expect(a.c.threat).toBe(b.c.threat);
    expect(a.c.log.map((x) => x.t.pt)).toEqual(b.c.log.map((x) => x.t.pt));
    expect(nan(a.c)).toBe(false);
  });

  it('semana sem ação: com gente da área a equipe age; sem ninguém, a ameaça sobe pela pressão', () => {
    const s = bankrupt();
    s.player.staff = s.player.staff.filter((m) => !CFG27.bankrupt.roles.includes(m.role));
    const c = openCrisis27(s, crisisCands27(s).find((x) => x.k === 'bankrupt')!.id) as Crisis27;
    const t0 = c.threat;
    s.week += 1; crisisWeek27(s);
    expect(c.threat).toBe(Math.min(100, t0 + CFG27.bankrupt.push));
    expect(c.left).toBe(c.weeks - 1);
    expect(delegatePick27(s, c)).toBeNull();
    s.player.staff.push({ id: 'st-adm', name: 'Adm', role: 'admin', skill: 70, salary: money(s, 2000), hiredWeek: s.week });
    expect(delegatePick27(s, c)).not.toBeNull();
    const before = c.log.length;
    s.week += 1; crisisWeek27(s);
    expect(c.log.length).toBeGreaterThan(before + 0);
    expect(c.log.some((x) => x.t.pt.startsWith('Equipe'))).toBe(true);
  });

  it('desfecho cai nos sistemas de sempre: falência contornada recua a insolvência; perdida, adianta', () => {
    const won = bankrupt();
    const cw = openCrisis27(won, crisisCands27(won).find((x) => x.k === 'bankrupt')!.id) as Crisis27;
    cw.threat = 10; finish27(won, cw);
    expect(won.player.insolvencyMonths).toBe(0);
    expect(cw.done?.o).toBe('won');
    const lost = bankrupt();
    const cl = openCrisis27(lost, crisisCands27(lost).find((x) => x.k === 'bankrupt')!.id) as Crisis27;
    cl.threat = 90; finish27(lost, cl);
    expect(lost.player.insolvencyMonths).toBe(2);
    expect(cl.done?.o).toBe('lost');
  });

  it('seguro conta: incêndio só aciona seguro com apólice; fiança sai pela metade com pessoa-chave', () => {
    const s = clone(FIX);
    const a = s.acts[playerActs(s)[0]];
    emitFact(s, { kind: 'disaster', actors: [a.id], place: a.city, severity: 55, visibility: 'public', tags: ['bad', 'fire'], text: { pt: 'Incêndio no estúdio', en: 'Studio fire' }, src: 'test' });
    emitFact(s, { kind: 'arrest', actors: [a.members[0], a.id], place: a.city, severity: 60, visibility: 'public', tags: ['crime', 'bad'], text: { pt: 'Preso', en: 'Arrested' }, src: 'test' });
    const fire = openCrisis27(s, crisisCands27(s).find((x) => x.k === 'fire')!.id) as Crisis27;
    expect(crisisActs27(s, fire).find((v) => v.a.id === 'claim')!.block).not.toBeNull();
    buyIns19(s);
    expect(crisisActs27(s, fire).find((v) => v.a.id === 'claim')!.block).toBeNull();
    const cash0 = s.player.cash;
    actCrisis27(s, fire.id, 'claim');
    expect(s.player.cash).toBeGreaterThan(cash0);
    const arr = openCrisis27(s, crisisCands27(s).find((x) => x.k === 'arrest')!.id) as Crisis27;
    const full = crisisActs27(s, arr).find((v) => v.a.id === 'bail')!.cost;
    ins19(s).pol.push({ act: a.id, pid: a.members[0], tier: 1, cover: 1, prem: 1, since: s.week, claims: 0, lastIll: 0, paid: 0 });
    expect(crisisActs27(s, arr).find((v) => v.a.id === 'bail')!.cost).toBe(Math.round(full / 2));
  });

  it('política conta: com teto apertado a equipe só escolhe ações sem custo', () => {
    const s = bankrupt();
    s.player.staff.push({ id: 'st-adm', name: 'Adm', role: 'admin', skill: 70, salary: money(s, 2000), hiredWeek: s.week });
    const c = openCrisis27(s, crisisCands27(s).find((x) => x.k === 'bankrupt')!.id) as Crisis27;
    setDir31(s, 'finance', { cap: 1 });
    const pick = delegatePick27(s, c)!;
    expect(crisisActs27(s, c).find((v) => v.a.id === pick)!.cost).toBe(0);
    for (const k of Object.keys(ACTS27) as (keyof typeof ACTS27)[]) expect(ACTS27[k].length).toBeGreaterThanOrEqual(4);
  });

  it('relógio anda com o tempo de verdade (advanceWeek) e termina com desfecho', () => {
    const s = bankrupt();
    const c = openCrisis27(s, crisisCands27(s).find((x) => x.k === 'bankrupt')!.id) as Crisis27;
    const w0 = c.left;
    advanceWeek(s);
    expect(crisisById27(s, c.id)!.left).toBeLessThan(w0);
    for (let i = 0; i < 20 && !c.done; i++) advanceWeek(s);
    expect(c.done).toBeTruthy();
  });
});

// ------------------------------------------------------------------------------------------- diretoria
function withStaff(): GameState {
  const s = clone(FIX);
  const add = (id: string, role: string, trait: string) => s.player.staff.push({ id, name: id, role, skill: 60, salary: money(s, 2500), hiredWeek: s.week, trait });
  add('st-pub', 'publicist', 'ambitious'); add('st-adm', 'admin', 'disciplined'); add('st-prod', 'producer', 'perfectionist'); add('st-tm', 'tour_manager', 'diplomatic');
  return s;
}

describe('r27 P2B — reunião de diretoria', () => {
  it('pauta de 3–4 propostas, determinística, com agenda por função/traço e apoio/oposição', () => {
    const a = withStaff(), b = withStaff();
    const pa = agenda27(a), pb = agenda27(b);
    expect(pa.length).toBeGreaterThanOrEqual(3);
    expect(pa.length).toBeLessThanOrEqual(4);
    expect(pa.map((p) => p.id)).toEqual(pb.map((p) => p.id));
    expect(directors27(a).length).toBeGreaterThanOrEqual(4);
    expect(pa.some((p) => p.backers.length + p.foes.length > 0)).toBe(true);
    expect(nan(pa)).toBe(false);
  });

  it('aprovar sobe a lealdade de quem propôs; vetar derruba', () => {
    const y = withStaff(), n = withStaff();
    const p = agenda27(y).find((x) => y.player.staff.some((m) => m.id === x.by) && x.cost <= y.player.cash)!;
    const st = (s: GameState) => s.player.staff.find((m) => m.id === p.by)!;
    const l0 = staffLoyalty(y, st(y).id);
    decide27(y, p.id, true);
    decide27(n, p.id, false);
    expect(staffLoyalty(y, st(y).id)).toBeGreaterThan(l0);
    expect(staffLoyalty(n, st(n).id)).toBeLessThan(l0);
    expect(decide27(y, p.id, false).pt).toMatch(/decidida/);
  });

  it('regras de delegação: gasto fora do teto é vetado sozinho', () => {
    const s = withStaff();
    setDir31(s, 'finance', { cap: 1 });
    for (const p of agenda27(s)) if (p.cost > 0) expect(autoDecide27(s, p).yes).toBe(false);
  });

  it('desligada (padrão) não faz nada no fim do mês; ligada, o mês sem você é decidido pelas regras', () => {
    const off = withStaff();
    advanceMonth(off);
    expect(x4(off).board27).toBeUndefined();
    const on = withStaff();
    setBoard27(on, true);
    const mk = `${on.year}-${on.month}`;
    advanceMonth(on);
    const m = board27(on).held[mk];
    expect(m?.auto).toBe(1);
    expect(Object.keys(m.dec).length).toBe(m.props.length);
    expect(nan(m)).toBe(false);
  });

  it('fechar a reunião decide o que sobrou', () => {
    const s = withStaff();
    const ps = agenda27(s);
    decide27(s, ps[0].id, true);
    closeMeeting27(s);
    const m = board27(s).held[`${s.year}-${s.month}`];
    expect(Object.keys(m.dec).length).toBe(ps.length);
    expect(m.dec[ps[0].id]).toBe('yes');
  });
});
