// r27 (P2A): campanha de lançamento, entrevistas/coletivas e rede de favores jogáveis — determinismo, modo rápido
// intacto, cada decisão mexe no resultado na direção esperada, sem NaN.
import { beforeAll, describe, expect, it } from 'vitest';
import { hashString } from '../src/core/rng';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { emitFact, facts17 } from '../src/sim/facts17';
import { allHolds } from '../src/sim/holds17';
import { playMonth } from '../src/sim/playbot16';
import { availableFormats, composeSongs, recordSongs, scheduleRelease } from '../src/sim/production';
import { scandal } from '../src/sim/scandal17';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import type { Act, GameState } from '../src/sim/types';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import {
  campMeter27, camps27, choose27, doMove27, makeEv27, moves27, setPayola27, setPlan27, startCamp27, targets27, tickCamps27, type Camp27,
} from '../src/sim/sys/camp27';
import { hy, hypeOf, useLever } from '../src/sim/sys/hype12';
import { m17, outlets17 } from '../src/sim/sys/media17';
import { answer27, curQ27, land27, opps27, startIv27, type Iv27, type Stance27 } from '../src/sim/sys/press27';
import { askNow27, burn27, call27, contacts27, give27, repay27, talkFit27, type Contact27 } from '../src/sim/sys/favors27';
import { opinionOf, sendGift } from '../src/sim/sys/persona13';
import { w4 } from '../src/sim/sys/world4/state';
import { rng19, rngSnapshot19 } from '../src/sim/rng19';

const clone = (s: GameState): GameState => structuredClone(s);
const nan = (o: unknown): boolean => JSON.stringify(o, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NaN!' : v)).includes('NaN!');

/** Ato contratado com um single programado para daqui a `ahead` semanas (ano `year`). */
function withRelease(seed: string, year = 1975, ahead = 4): { s: GameState; act: Act } {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  const r = rng19(s, 'act');
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  const songs = composeSongs(s, r, act, 2);
  recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
  const fmt = availableFormats(s);
  const res = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'Teste', formats: fmt.slice(0, 1), press: 2000, marketing: [], territories: [...s.player.territories], weeksAhead: ahead });
  if (!('id' in res)) throw new Error('schedule failed');
  act.fame = Math.max(act.fame, 30);
  return { s, act };
}
const camp = (s: GameState): Camp27 => { const t = targets27(s)[0]; const c = startCamp27(s, t); if (!('id' in c)) throw new Error('camp'); return c; };
const weeks = (s: GameState, n: number) => { for (let i = 0; i < n; i++) advanceWeek(s); };

let FIX: GameState; // 8º mês da semente r16pb-5 (playbot), para entrevistas e favores
beforeAll(() => {
  const s = createGame(defaultConfig('r16pb-5', { startYear: 1975, realNames: true }));
  for (let m = 0; m < 8 && !s.ended; m++) {
    playMonth(s, 'balanced');
    if (m === 7) FIX = clone(s);
    advanceMonth(s);
  }
  // modo rápido intacto: valores medidos nesta base SEM o módulo camp27 (gancho semanal) carregado.
  // Re-medidos na r27 (docs/suite27-final.md), mesmos do r27-p2b: os antigos (1301031 / 2195685417 / 2442526734)
  // reproduzem em b748d64; AUD2 (c4c5bfd) mudou acts e AUD1 (166a36e: playbot compra negócios e contrata no 1º ano)
  // mudou caixa, acts e rng. "Sem campanha nada muda" segue provado no 1º teste da campanha (a × b).
  // R28: re-medidos (mesmos do r27-p2b): fase 5 (rivais) e formações reais na data inicial mudam o mundo de propósito; depois F3, F4 e F8 (r27-p2b explica cada um).
  // R29 (CONNECT, de propósito): perks de apelo/vendas/bilheteria/prensagem passam a valer, modificadores songQ sobrevivem
  // aos ganchos de gravação, escândalo pesa no próximo disco e prêmios dão prestígio: 427926 / 1063419696 (rng igual).
  // Depois, ganchos de início em ordem fixa (atos reais marcados no lineup16 e renomes depois que existem — antes dependia
  // da ordem dos imports e os atos reais ganhavam fama herdada no 1º mês): caixa, acts e rng mudam.
  // Antes da R29: 446096 / 4292160800 / 2262769409.
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
  // R29 família (sys/family29, de propósito — docs/familia29.md): artistas NPC namoram, casam, se separam e têm filhos
  // (Rng próprio; famílias semeadas no 1º mês; nesta semente em 8 meses: 1 casamento de casal célebre, 1 filho, 1 divórcio):
  // só acts muda (caixa e rng iguais). Antes: acts 827562554.
  // R29 conectar tudo + público + relíquias "muitas" juntos (merge friendly-brown): re-medido. Antes: 332627 / 1382068899 / 1849171597 / 4090265307.
  // R29: conectar tudo (13 sistemas, com público por idade/região) + família juntos: re-medido.
  // R29 (contratos+, de propósito — docs/contratos29.md): empresários NPC com contrato e comissão, produtoras NPC
  // assinando e entregando masters, JV de estrela com selo NPC e disputa por JV mudam caixa, acts e rng. Antes: 450735 /
  // 2386675548 / 2839816166.
  // R29: contratos+ (NPCs) junto com conectar tudo/público/família: re-medido.
  // R29c (facções × artistas do mundo, aff29npc — de propósito; mesmos do r27-p2b, que explica): as facções das cenas
  // abordam atos NPC (cachê, embalo, pedágio, ameaça, rixa) e caixa, acts e rng mudam. Antes: 450735 / 2386675548 / 2839816166.
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
  // R31 onda 3 (integração D/Y + Z): as duas mudanças juntas re-medidas. Antes (só D/Y): 581243 / 4153284673 / 754530152.
  // R31 onda 3 (AP · aparência, de propósito — docs/r31/DECISOES.md e docs/r31/ap.md): a imagem passa a ler a ficha de aparência
  // (idade, estresse, forma, estilo), o peso da imagem no apelo ganha gênero/público/pressão histórica e a aparência entra em
  // clipe, marcas, merch, entrevistas e valor; caixa, turnês, acts e rng mudam. Com `look31` desligado voltam 40406 / 2734588704 / 1531685321 / 3382588419.
  expect(s.player.cash).toBe(257209);
  expect(hashString(JSON.stringify(s.acts))).toBe(68287867);
  expect(hashString(rngSnapshot19(s))).toBe(205718420);
  expect((s.x4 as unknown as { camp27?: unknown; press27?: unknown }).camp27).toBeUndefined();
}, 600000);

// ---------------------------------------------------------------- campanha

describe('r27 P2A — campanha de lançamento', () => {
  it('sem campanha nada muda (gancho semanal inerte) e consultas não mexem no estado', () => {
    const { s } = withRelease('p2a-q');
    const a = clone(s), b = clone(s);
    weeks(a, 3);
    tickCamps27(b); targets27(b); weeks(b, 3);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect((a.x4 as unknown as { camp27?: unknown }).camp27).toBeUndefined();
  });

  it('determinística e sem NaN', () => {
    const { s } = withRelease('p2a-det');
    const run = () => { const x = clone(s); const c = camp(x); setPlan27(x, c, 'radio_plug', 2); setPlan27(x, c, 'press', 1); weeks(x, 6); return x; };
    const a = run(), b = run();
    expect(JSON.stringify(camps27(a))).toBe(JSON.stringify(camps27(b)));
    expect(a.player.cash).toBe(b.player.cash);
    expect(nan(camps27(a))).toBe(false);
    for (const r of Object.values(a.releases)) if (r.actId === camps27(a).c.cp1.actId) expect(nan([r.marketing, r.marketingE, r.weekly, r.q, r.appeal])).toBe(false);
  });

  it('verba nos canais vira marketing normal (E maior) e mais expectativa na estreia', () => {
    const { s, act } = withRelease('p2a-spend');
    const none = clone(s), spend = clone(s);
    camp(none);
    const c = camp(spend);
    setPlan27(spend, c, 'radio_plug', 3); setPlan27(spend, c, 'press', 2); setPlan27(spend, c, 'tv_show', 1);
    weeks(none, 8); weeks(spend, 8);
    const rel = (x: GameState) => Object.values(x.releases).find((r) => r.actId === act.id && r.title === 'Teste')!;
    expect(rel(spend).marketingE).toBeGreaterThan(rel(none).marketingE + 0.05);
    expect(hy(spend).rel[rel(spend).id]?.exp ?? 0).toBeGreaterThan(hy(none).rel[rel(none).id]?.exp ?? 0);
    expect(spend.player.cash).toBeLessThan(none.player.cash);
    const cs = camps27(spend).c[c.id];
    expect(cs.relId).toBe(rel(spend).id);
    expect(cs.status).toBe('done');
    expect(cs.sum?.length).toBeGreaterThan(1);
  });

  it('jabá rende mais alcance, mas acumula exposição e calor', () => {
    const { s } = withRelease('p2a-payola');
    const clean = clone(s), dirty = clone(s);
    const c1 = camp(clean), c2 = camp(dirty);
    setPlan27(clean, c1, 'radio_plug', 2); setPlan27(dirty, c2, 'radio_plug', 2); setPayola27(dirty, c2, true);
    const h0 = w4(dirty).payola.heat;
    weeks(clean, 2); weeks(dirty, 2);
    const pm = (x: GameState) => x.pendingReleases[0].marketing.reduce((t, m) => t + m.budget, 0);
    expect(pm(dirty)).toBeGreaterThan(pm(clean));
    expect(camps27(dirty).c[c2.id].exp).toBeGreaterThan(0);
    expect(camps27(clean).c[c1.id].exp).toBe(0);
    expect(w4(dirty).payola.heat).toBeGreaterThan(h0);
    expect(dirty.ledger.some((e) => e.cat === 'w4_payola')).toBe(true);
  });

  it('cada resposta a um imprevisto mexe na direção esperada', () => {
    const { s, act } = withRelease('p2a-ev');
    const base = clone(s);
    const c0 = camp(base);
    const pick = (k: Parameters<typeof makeEv27>[2], opt: string) => {
      const x = clone(base);
      const c = camps27(x).c[c0.id];
      const e = makeEv27(x, c, k)!;
      expect(e).not.toBeNull();
      const h0 = hypeOf(x, `n:${act.id}`).v;
      choose27(x, c, e.w, opt);
      return { x, c, d: hypeOf(x, `n:${act.id}`).v - h0 };
    };
    expect(pick('review', 'ignore').d).toBeLessThan(0);
    const rb = pick('review', 'rebut');
    expect(rb.d).toBeGreaterThan(0);
    const critic = rb.c.ev[rb.c.ev.length - 1].ref!;
    expect(opinionOf(rb.x, `c:${critic}`)).toBeLessThan(opinionOf(base, `c:${critic}`));
    expect(pick('viral', 'organic').d).toBeGreaterThan(0);
    const inst0 = base.player.reputation.institutional;
    const fight = pick('ban', 'fight');
    expect(fight.d).toBeGreaterThan(0);
    expect(fight.x.player.reputation.institutional).toBeLessThan(inst0);
    expect(pick('ban', 'edit').d).toBeLessThan(0);
    const rush = pick('leak', 'rush');
    expect(rush.x.pendingReleases[0].week).toBe(rush.x.week + 1);
    const em = pick('leak', 'embrace');
    expect(hy(em.x).pend[act.id]?.leak).toBe(1);
    // investigação de jabá: assumir zera a exposição e vira escândalo (pequeno)
    const x = clone(base); const c = camps27(x).c[c0.id]; c.exp = 40;
    const e = makeEv27(x, c, 'probe')!;
    const sc0 = x.acts[act.id].scandals;
    choose27(x, c, e.w, 'confess');
    expect(c.exp).toBe(0);
    expect(x.acts[act.id].scandals).toBe(sc0 + 1);
  });

  it('sem resposta, vale a opção prudente na semana seguinte', () => {
    const { s } = withRelease('p2a-auto');
    const c = camp(s);
    const e = makeEv27(s, c, 'review')!;
    weeks(s, 1);
    const cc = camps27(s).c[c.id];
    expect(cc.ev.find((x) => x.w === e.w)?.pick).toBe(e.opts[0].id);
  });

  it('jogadas da campanha chamam a ação rápida de sempre (mesmo resultado)', () => {
    const { s, act } = withRelease('p2a-move');
    const a = clone(s), b = clone(s);
    useLever(a, act.id, 'teaser');
    const c = camp(b);
    const m = moves27(b, c).find((x) => x.id === 'lever:teaser')!;
    expect(m.ok).toBe(true);
    doMove27(b, c, 'lever:teaser');
    expect(b.player.cash).toBe(a.player.cash);
    expect(hypeOf(b, `n:${act.id}`).v).toBe(hypeOf(a, `n:${act.id}`).v);
    expect(camps27(b).c[c.id].log.some((x) => x.t.pt.startsWith('Jogada'))).toBe(true);
  });

  it('pós-estreia: rádio pelo promotor independente (jabá) é jogada arriscada', () => {
    const { s } = withRelease('p2a-post', 1978, 1);
    weeks(s, 2);
    const t = targets27(s).find((x) => x.relId);
    expect(t).toBeTruthy();
    const c = startCamp27(s, t!) as Camp27;
    const indie = moves27(s, c).find((x) => x.id.startsWith('radio:') && x.id.endsWith(':indie'));
    expect(indie?.risk).toBe(true);
    doMove27(s, c, indie!.id);
    expect(c.exp).toBeGreaterThan(0);
    expect(campMeter27(s, c).q).not.toBeNull();
  });
});

// ---------------------------------------------------------------- entrevistas

describe('r27 P2A — entrevistas e coletivas', () => {
  const mineAct = (s: GameState) => opps27(s).find((o) => o.ctx === 'press' && o.who === 'act')!;
  const play = (s: GameState, sts: Stance27[], seqOff = 0): Iv27 => {
    (s.x4 as unknown as { press27?: { seq: number; done: Record<string, number> } }).press27 = { seq: seqOff, done: {} };
    const iv = startIv27(s, mineAct(s)) as Iv27;
    let i = 0;
    while (iv.status === 'open') answer27(s, iv, sts[Math.min(i++, sts.length - 1)]);
    return iv;
  };

  it('oportunidades não mexem no estado; há entrevista de ato e do dono', () => {
    const s = clone(FIX);
    const h = hashString(JSON.stringify(s));
    const os = opps27(s);
    expect(hashString(JSON.stringify(s))).toBe(h);
    expect(os.some((o) => o.ctx === 'press' && o.who === 'act')).toBe(true);
    expect(os.some((o) => o.who === 'player')).toBe(true);
  });

  it('determinística e sem NaN', () => {
    const a = play(clone(FIX), ['charming', 'controversial', 'mysterious', 'deflect']);
    const b = play(clone(FIX), ['charming', 'controversial', 'mysterious', 'deflect']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(nan(a)).toBe(false);
    expect(a.res).toBeTruthy();
  });

  it('polêmica rende mais hype e mais calor; charme, mais imagem e menos calor (média de 10 entrevistas)', () => {
    let hC = 0, hM = 0, heatC = 0, heatM = 0, imgC = 0, imgM = 0;
    for (let k = 0; k < 10; k++) {
      const c = play(clone(FIX), ['controversial'], k * 7).res!;
      const m = play(clone(FIX), ['charming'], k * 7).res!;
      hC += c.hype; hM += m.hype; heatC += c.heat; heatM += m.heat; imgC += c.img; imgM += m.img;
    }
    expect(hC).toBeGreaterThan(hM);
    expect(heatC).toBeGreaterThan(heatM);
    expect(imgM).toBeGreaterThan(imgC);
  });

  it('esquivar irrita o repórter e traz a pergunta quente (o segredo)', () => {
    const s = clone(FIX);
    const o = mineAct(s);
    const act = s.acts[o.actId!];
    emitFact(s, { kind: 'affair', actors: [act.members[0]], severity: 50, visibility: 'secret', tags: ['love'], text: l('Caso secreto.', 'Secret affair.') });
    const iv = startIv27(s, o) as Iv27;
    answer27(s, iv, 'deflect');
    answer27(s, iv, 'deflect');
    expect(iv.mood).toBeLessThan(35);
    expect(curQ27(iv)?.topic).toBe('private');
    // polêmica na pergunta íntima: o segredo vira notícia pública
    answer27(s, iv, 'controversial');
    while (iv.status === 'open') answer27(s, iv, 'charming');
    const f = facts17(s).f.find((x) => x.kind === 'affair' && x.actors.includes(act.members[0]))!;
    expect(f.visibility).toBe('public');
    expect(iv.res!.reveal).toBe(true);
  });

  it('mistério que cola planta um boato; repetir reduz a chance', () => {
    const s = clone(FIX);
    const iv = startIv27(s, mineAct(s)) as Iv27;
    const p0 = land27(iv, 'mysterious');
    let rumor = false;
    while (iv.status === 'open') { answer27(s, iv, 'mysterious'); }
    rumor = !!iv.res?.rumor;
    expect(land27({ ...iv, status: 'open', ans: iv.ans }, 'mysterious')).toBeLessThan(p0);
    if (iv.ans.some((a) => a.land)) expect(rumor).toBe(true);
    if (rumor) expect(facts17(s).f.some((f) => f.tags.includes('press27') && f.visibility === 'rumor')).toBe(true);
  });

  it('coletiva sobre matéria vira a resposta oficial (media17) e escândalo abre coletiva de crise', () => {
    const s = clone(FIX);
    const actId = mineAct(s).actId!;
    const out = outlets17(s)[0];
    m17(s).st.push({ id: 'stP2A', y: s.year, m: s.month, w: s.week, t: l('Boato teste', 'Test rumor'), tpl: 'x', a: actId, out: out.id, src: 'insider', truth: 0, st: 'open', cred: 50, sev: 30, tone: -1, reach: [], due: s.week + 8 });
    const o = opps27(s).find((x) => x.ctx === 'story' && x.storyId === 'stP2A')!;
    expect(o).toBeTruthy();
    const iv = startIv27(s, o) as Iv27;
    expect(curQ27(iv)?.topic).toBe('rumor');
    while (iv.status === 'open') answer27(s, iv, 'controversial');
    expect(m17(s).st.find((x) => x.id === 'stP2A')?.resp).toBe('deny');
    scandal(s, actId, 'conduct', 30);
    expect(opps27(s).some((x) => x.ctx === 'scandal' && x.actId === actId)).toBe(true);
  });
});

// ---------------------------------------------------------------- favores

describe('r27 P2A — rede de favores', () => {
  const giftable = (s: GameState): Contact27 => contacts27(s).find((c) => c.gestures.includes('gift') && c.generosity !== undefined)!;

  it('quadro determinístico, sem NaN e sem mexer no estado', () => {
    const s = clone(FIX);
    const h = hashString(JSON.stringify(s));
    const a = contacts27(s), b = contacts27(clone(FIX));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(hashString(JSON.stringify(s))).toBe(h);
    expect(a.length).toBeGreaterThan(3);
    expect(nan(a)).toBe(false);
  });

  it('dar = a gentileza de sempre + um favor no livro; a conversa certa rende mais opinião', () => {
    const base = clone(FIX);
    const c = giftable(base);
    const q = clone(base); sendGift(q, c.key);
    const g = clone(base);
    const r = give27(g, c.key, 'gift', 'help');
    expect(r.ok).toBe(true);
    expect(g.player.cash).toBe(q.player.cash); // mesmo custo do presente de sempre
    expect(allHolds(g).some((h) => h.holder === 'player' && h.target === c.hid && h.kind === 'favor')).toBe(true);
    const talks = (['flatter', 'business', 'help'] as const).map((t) => ({ t, fit: talkFit27(c, t) })).sort((x, y) => y.fit - x.fit);
    const best = clone(base), worst = clone(base);
    give27(best, c.key, 'gift', talks[0].t); give27(worst, c.key, 'gift', talks[2].t);
    if (talks[0].fit - talks[2].fit > 0.3) expect(opinionOf(best, c.key)).toBeGreaterThan(opinionOf(worst, c.key));
  });

  it('pedir sem crédito cria dívida; retribuir quita; cobrar gasta o favor', () => {
    const s = clone(FIX);
    const c = contacts27(s).find((x) => x.op >= 15 && x.gestures.includes('gift'));
    if (c) {
      const r = askNow27(s, c.key);
      expect(r.ok).toBe(true);
      const debt = allHolds(s).find((h) => h.holder === c.hid && h.target === 'player' && h.kind === 'debt')!;
      expect(debt).toBeTruthy();
      expect(repay27(s, debt.id).ok).toBe(true);
      expect(allHolds(s).some((h) => h.id === debt.id)).toBe(false);
    }
    const x = clone(FIX);
    const d = giftable(x);
    give27(x, d.key, 'gift', 'help');
    const fav = allHolds(x).find((h) => h.holder === 'player' && h.target === d.hid && h.kind === 'favor')!;
    const R0 = { ...x.player.reputation };
    const res = call27(x, fav.id, 'word');
    expect(res.ok).toBe(true);
    const R1 = x.player.reputation;
    expect(R1.artistic + R1.institutional + R1.artists).toBeGreaterThan(R0.artistic + R0.institutional + R0.artists);
    expect(allHolds(x).some((h) => h.id === fav.id)).toBe(false); // fraco: uso único
  });

  it('queimar um contato: ganho dobrado agora, mágoa, opinião no chão e boato', () => {
    const s = clone(FIX);
    const d = giftable(s);
    give27(s, d.key, 'gift', 'help');
    const op0 = opinionOf(s, d.key);
    const nf = facts17(s).f.length;
    const b = burn27(s, d.key, 'word');
    expect(b.ok).toBe(true);
    expect(b.gains.length).toBe(1);
    expect(opinionOf(s, d.key)).toBeLessThan(op0 - 15);
    expect(allHolds(s).some((h) => h.holder === d.hid && h.target === 'player' && h.kind === 'grievance')).toBe(true);
    expect(facts17(s).f.length).toBeGreaterThan(nf);
    expect(nan(contacts27(s))).toBe(false);
  });
});
