// Revisão 21 — G (rivais, eventos e narrativa): opção padrão explícita e cautelosa (G-1), filtro aplica a opção
// neutra e avisa (G-2), `find` puro (G-3), finais e divergência neural (G-4), regra RS/filtros fora de events.ts (G-5),
// rivais só com informação pública (G-6), economia dos rivais com extrato (G-7), caixa insuficiente não consome o
// cartão (G-10).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { EVENTS, emitEvent, eventById, neutralOf, resolveDecision } from '../src/sim/events';
import '../src/sim/sys/index';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { SITS } from '../src/sim/sys/situations17';
import { allowed21 } from '../src/sim/allowed21';
import { broke21, fixedCost21, labelPost } from '../src/sim/rivalledger21';
import { dependence18, perceivedTrust21 } from '../src/sim/sys/rivalmind18';
import { cap18, startFeud18 } from '../src/sim/sys/feud18';
import { endingScores } from '../src/sim/legacy';
import { money } from '../src/sim/util';
import { grantPlayerContract } from '../src/sim/worldgen';

/** partida 'from_zero' começa sem elenco: contrata um ato livre com integrantes */
function myAct(s: GameState) {
  const a = Object.values(s.acts).find((x) => !x.owner && x.status === 'active' && x.members.length > 0)!;
  grantPlayerContract(s, a, 36);
  return a;
}

// ---------------------------------------------------------------- G-1: opção padrão nunca custa, aposta nem machuca
/** Padrões que uma opção padrão não pode conter (inspeção do fonte de `apply`). */
const HARM = [/\bpay\(/, /post\)?\(s,[^,]+,\s*-/, /-=/, /\.health = /, /resentment \+=/];
/**
 * Exceções justificadas: eventos em que TODAS as opções custam (o evento é uma conta) ou em que a opção sem custo
 * registra o próprio acontecimento (diagnóstico). Nesses casos a padrão é a de custo FIXO, sem aposta e sem dano
 * permanente. Qualquer evento novo que caia aqui precisa ser listado com o porquê.
 */
const EXCEPTIONS: Record<string, string> = {
  addiction: 'o diagnóstico é o evento; "deixar como está" só registra a dependência e a moral cai',
  recovery: 'opção única: a cura (health = ok)',
  critic_pan: 'opção única: a crítica ruim é o evento',
  genre_shift: 'manter o som é a escolha conservadora; confiança −6 é o preço de dizer não',
  stage_accident: 'todas custam; assumir os custos médicos é fixo e sem dano permanente',
  sampling_claim: 'todas custam; o acordo é fixo, o tribunal é aposta',
  royalty_audit: 'abrir os livros: cooperar; paga a diferença só se os livros estiverem errados',
  payola_exposed: 'todas custam; multa e colaboração é fixa, negar é aposta de multa dobrada',
  clone_without_consent: 'ignorar é a inação literal; a confiança cai porque o artista esperava reação',
  morality_clause: 'todas custam; devolver o patrocínio é fixo, contestar é aposta',
  sample_uncleared: 'regravar o trecho: custo pequeno e fixo, sem processo depois',
  cowriter_claim: 'todas custam; ceder 10% é fixo, o tribunal é aposta',
  band_name_dispute: 'comprar o nome: custo fixo; renomear perde 15% da fama; tribunal é aposta',
  estate_dispute: 'todas custam; o acordo é fixo e melhora a reputação com artistas',
  espionage_exposed: 'todas custam; o acordo é fixo, negar é aposta',
  neural_headache: 'todas custam; o aviso é o menor custo, negar é aposta de ação coletiva',
  r11_hotel_trash: 'a conta do hotel é o evento; pagar é fixo, cobrar da banda ou vazar machuca',
  r11_relapse: 'a recaída é o evento; "torcer pelo melhor" só a registra',
  r11_embezzler: 'o desvio já aconteceu; demitir em silêncio é o custo fixo',
  r11_office_flood: 'todas custam; remendar é o menor custo',
  r11_distributor_bust: 'o crédito já se perdeu; dar baixa é fixo',
  r11_8track_war: 'todas custam; dividir rende mais do que custa',
  dsp15_audit: 'todas custam; o acordo de 70% é fixo e sobe a confiança',
  id_noncompete: 'todas custam; o acordo é fixo, o tribunal é aposta',
  d18_van: 'todas custam; alugar é o menor custo',
  sit17_blackmail: 'pagar o silêncio é o único desfecho sem escândalo; o custo é fixo',
};

describe('r21 G-1: opção padrão explícita e cautelosa', () => {
  it('todo evento registrado tem opção padrão sem pagamento, débito, -= ou health = (fora das exceções)', () => {
    const bad: string[] = [];
    for (const e of EVENTS) {
      const o = neutralOf(e);
      expect(o, e.id).toBeDefined();
      if (e.neutral) expect(e.options.some((x) => x.id === e.neutral), `${e.id}: neutral '${e.neutral}' não existe`).toBe(true);
      const src = o.apply.toString();
      const hits = HARM.filter((h) => h.test(src));
      if (hits.length && !EXCEPTIONS[e.id]) bad.push(`${e.id} → ${o.id} (${hits.map((h) => h.source).join(' ')})`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
  it('exceções continuam sendo exceções (lista não tem lixo)', () => {
    for (const id of Object.keys(EXCEPTIONS)) {
      if (id.startsWith('sit17_')) continue;
      const e = eventById[id];
      expect(e, id).toBeDefined();
      expect(HARM.some((h) => h.test(neutralOf(e).apply.toString())), `${id}: não precisa mais estar nas exceções`).toBe(true);
    }
  });
  it('situações: a padrão é a cautelosa', () => {
    const want: Record<string, string> = { burnout: 'rest', favor_due: 'delay', blackmail: 'pay', relapse: 'confront', credit_split: 'equal', draft_notice: 'serve', streaming_stand: 'pull', paternity17: 'ack' };
    for (const [id, opt] of Object.entries(want)) {
      const d = SITS.find((x) => x.id === id)!;
      expect(d, id).toBeDefined();
      expect(d.neutral, id).toBe(opt);
      expect(d.options.some((o) => o.id === opt), id).toBe(true);
      expect(eventById[`sit17:${id}`]?.neutral, id).toBe(opt);
    }
    for (const d of SITS) {
      if (!d.neutral) continue;
      const o = d.options.find((x) => x.id === d.neutral)!;
      const src = o.apply.toString();
      if (!EXCEPTIONS[`sit17_${d.id}`]) expect(HARM.some((h) => h.test(src)), `sit17:${d.id} → ${o.id}`).toBe(false);
    }
  });
  it('os casos do relatório: burnout → pausa, voice_strain → repouso, member_leaves → sair, neural_vote → abster-se', () => {
    expect(neutralOf(eventById.burnout).id).toBe('pause');
    expect(neutralOf(eventById.voice_strain).id).toBe('rest');
    expect(neutralOf(eventById.member_leaves).id).toBe('smaller');
    expect(neutralOf(eventById.child_born).id).toBe('accept');
    expect(neutralOf(eventById.neural_vote).id).toBe('abstain');
    expect(neutralOf(eventById.royalty_audit).id).toBe('open');
    expect(neutralOf(eventById.payola_exposed).id).toBe('fine');
  });
});

// ---------------------------------------------------------------- G-2: filtro aplica a neutra e avisa
describe('r21 G-2: evento filtrado aplica a opção neutra e avisa', () => {
  it('burnout com filtro health → pausa (não "seguir a agenda"), com notificação "cartão filtrado"', () => {
    const s = createGame(defaultConfig('r21g-filter'));
    s.config.contentFilters = ['health'];
    const a = myAct(s);
    const trust = a.trust;
    const n0 = s.notifications.length;
    emitEvent(s, Rng.fromSeed('x'), 'burnout', { act: a.id });
    expect(s.decisions.some((d) => d.eventId === 'burnout')).toBe(false);
    expect(a.status).toBe('hiatus'); // opção "pausa"
    expect(a.trust).toBeGreaterThanOrEqual(trust); // "push" tiraria 10
    expect(s.notifications.slice(n0).some((x) => /filtrado/.test(x.text.pt))).toBe(true);
  });
});

// ---------------------------------------------------------------- G-3: find só lê o estado
function frozen<T extends object>(root: T, path = 'state'): T {
  const cache = new WeakMap<object, unknown>();
  const wrap = (o: object, p: string): unknown => {
    if (cache.has(o)) return cache.get(o);
    const px = new Proxy(o, {
      get(t, k, rcv) {
        const v = Reflect.get(t, k, rcv);
        return v && typeof v === 'object' ? wrap(v as object, `${p}.${String(k)}`) : v;
      },
      set(_t, k) { throw new Error(`find escreveu em ${p}.${String(k)}`); },
      deleteProperty(_t, k) { throw new Error(`find apagou ${p}.${String(k)}`); },
      defineProperty(_t, k) { throw new Error(`find definiu ${p}.${String(k)}`); },
    });
    cache.set(o, px);
    return px;
  };
  return wrap(root, path) as T;
}

describe('r21 G-3: find() é puro em 3 eras', () => {
  it.each([1925, 1975, 2015])('%i: nenhum find escreve no estado', (year) => {
    const s = createGame(defaultConfig(`r21g-find-${year}`, { startYear: year }));
    for (let i = 0; i < 3; i++) { advanceMonth(s); s.decisions.length = 0; }
    const fs = frozen(s);
    const r = Rng.fromSeed(`find-${year}`);
    const errors: string[] = [];
    for (const e of EVENTS) {
      if (!e.find) continue;
      try { e.find(fs, r); } catch (err) { errors.push(`${e.id}: ${(err as Error).message}`); }
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
  it('coverup_exposed não apaga a flag ao ser avaliado; apaga ao responder', () => {
    const s = createGame(defaultConfig('r21g-cover'));
    const a = myAct(s);
    s.flags[`coverup:${a.id}`] = 0;
    s.week = 60;
    const r = Rng.fromSeed('cover');
    let ctx: Record<string, string | number> | null = null;
    for (let i = 0; i < 40 && !ctx; i++) ctx = eventById.coverup_exposed.find!(s, r);
    expect(ctx).toBeTruthy();
    expect(s.flags[`coverup:${a.id}`]).toBe(0);
    emitEvent(s, r, 'coverup_exposed', ctx!);
    const d = s.decisions.find((x) => x.eventId === 'coverup_exposed')!;
    resolveDecision(s, d.id, 'admit');
    expect(s.flags[`coverup:${a.id}`]).toBeUndefined();
  });
  it('a quebra de 1930 só é marcada quando a recessão é aplicada', () => {
    const s = createGame(defaultConfig('r21g-crash', { startYear: 1929, mode: 'historic' }));
    s.year = 1930;
    const ctx = eventById.recession.find!(s, Rng.fromSeed('c'));
    expect(ctx?.crash).toBe(1);
    expect(s.flags.crash1930).toBeUndefined();
    emitEvent(s, Rng.fromSeed('c'), 'recession', ctx!);
    expect(s.flags.crash1930).toBe(1);
    expect(s.economy.recession).toBe(true);
  });
});

// ---------------------------------------------------------------- G-4: finais e divergência neural
describe('r21 G-4: finais', () => {
  it('eternal_archivist tem teto; famous_ghost exige uso; the_silence vale 55', () => {
    const s = createGame(defaultConfig('r21g-end'));
    s.player.reissues = 60;
    const sc = (id: string) => endingScores(s).find((x) => x.id === id)!.score;
    expect(sc('eternal_archivist')).toBeLessThanOrEqual(45 + 100 * 0.15 + 15);
    s.player.neural.ghostVoice = true;
    expect(sc('famous_ghost')).toBe(0);
    s.holograms.push({ id: 'h1', actId: 'x', personId: 'p', rights: 'owned', estateFee: 0, shows: 1, revenue: 100, untilWeek: 9 });
    expect(sc('famous_ghost')).toBe(52);
    expect(sc('the_silence')).toBe(55);
  });
  it('neural_vote é cartão forçado no mês em que a tecnologia chega e, ignorado, decide a divergência', () => {
    const s = createGame(defaultConfig('r21g-neural', { startYear: 2030 }));
    expect(eventById.neural_vote.forcedOnly).toBe(true);
    s.techDates.neural = s.year;
    advanceMonth(s);
    expect(s.decisions.some((d) => d.eventId === 'neural_vote')).toBe(true);
    advanceMonth(s); // vence sem resposta → "abster-se"
    expect(s.divergence.neural).toBeDefined();
  });
});

// ---------------------------------------------------------------- G-5: regra RS e filtros fora de events.ts
describe('r21 G-5: allowed21 em um só lugar', () => {
  it('filtro de conteúdo e regra RS', () => {
    const s = createGame(defaultConfig('r21g-allowed'));
    const a = Object.values(s.acts)[0];
    expect(allowed21(s, 'violence', a)).toBe(true);
    s.config.contentFilters = ['violence'];
    expect(allowed21(s, 'violence', a)).toBe(false);
    expect(allowed21(s, 'death', a)).toBe(true);
    s.config.contentFilters = [];
    a.rs = true;
    expect(allowed21(s, 'death', a.id)).toBe(false);
    expect(allowed21(s, 'sex', a)).toBe(false);
    expect(allowed21(s, 'money', a)).toBe(true);
  });
  it('a escada da rixa para antes da briga com filtro violence (e antes dos tiros com filtro death)', () => {
    const s = createGame(defaultConfig('r21g-feud'));
    const acts = Object.values(s.acts).filter((x) => x.status === 'active' && x.members.length > 0 && !x.owner);
    const f = startFeud18(s, acts[0].id, acts[1].id, { pt: 'teste', en: 'test' }, 30)!;
    expect(f).toBeTruthy();
    const open = cap18(s, f);
    expect(open).toBeGreaterThanOrEqual(4);
    s.config.contentFilters = ['death'];
    expect(cap18(s, f)).toBeLessThanOrEqual(4);
    s.config.contentFilters = ['violence'];
    expect(cap18(s, f)).toBeLessThanOrEqual(3);
    s.config.contentFilters = [];
    s.acts[f.a].rs = true;
    expect(cap18(s, f)).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------- G-6: só informação pública
describe('r21 G-6: rivais leem sinais públicos', () => {
  it('dependence18 ignora a receita exata: disco sem pico nem certificação não conta', () => {
    const s = createGame(defaultConfig('r21g-dep'));
    const a = myAct(s);
    const rel = Object.values(s.releases)[0];
    rel.actId = a.id; rel.owner = 'player'; rel.week = s.week; rel.revenue = 10_000_000_00; rel.peak = 999; rel.certified = undefined; rel.hist = false;
    a.releases = [rel.id];
    expect(dependence18(s).total).toBe(0);
    rel.peak = 1; rel.certified = 'gold';
    expect(dependence18(s).total).toBe(160);
    expect(dependence18(s).act?.id).toBe(a.id);
  });
  it('confiança percebida tem ruído limitado (±20) e é estável no trimestre', () => {
    const s = createGame(defaultConfig('r21g-trust'));
    const a = myAct(s);
    a.trust = 50;
    const v = perceivedTrust21(s, a, 'lb1');
    expect(Math.abs(v - 50)).toBeLessThanOrEqual(20);
    expect(perceivedTrust21(s, a, 'lb1')).toBe(v);
  });
});

// ---------------------------------------------------------------- G-7: economia dos rivais
describe('r21 G-7: labelPost e falência proporcional', () => {
  it('extrato curto, receita pública só nas categorias reais, falência em 6 meses de custo fixo', () => {
    const s = createGame(defaultConfig('r21g-ledger'));
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const cash = lb.cash, rev = lb.revenueYear;
    labelPost(s, lb, 1000, 'sales', 'disco');
    labelPost(s, lb, 500, 'sync', 'acordo');
    labelPost(s, lb, -300, 'marketing', 'anúncio');
    expect(lb.cash).toBe(cash + 1200);
    expect(lb.revenueYear).toBe(rev + 1000);
    expect(lb.ledger21).toHaveLength(3);
    for (let i = 0; i < 100; i++) labelPost(s, lb, -1, 'misc', `x${i}`);
    expect(lb.ledger21!.length).toBe(60);
    lb.cash = -fixedCost21(s, lb) * 5;
    expect(broke21(s, lb)).toBe(false);
    lb.cash = -fixedCost21(s, lb) * 7;
    expect(broke21(s, lb)).toBe(true);
    expect(fixedCost21(s, lb)).toBe(money(s, 4000 + lb.roster.length * 1800) * (lb.family === 'A' ? 2 : 1));
  });
  it('a simulação não escreve lb.cash direto nos motores de rivais (grep do fonte)', async () => {
    const fs = await import('node:fs');
    for (const f of ['src/sim/sys/rivals8.ts', 'src/sim/sys/rivals12.ts', 'src/sim/sys/intrigue.ts', 'src/sim/sys/rivalmind18.ts', 'src/sim/rivals.ts']) {
      const src = fs.readFileSync(f, 'utf8');
      expect(/\blb\.cash (\+=|-=)/.test(src), f).toBe(false);
    }
  });
});

// ---------------------------------------------------------------- G-10: caixa insuficiente não consome o cartão
describe('r21 G-10: falta de caixa avisa e mantém o cartão', () => {
  it('rival_poach → renovar com bônus sem caixa: aviso e o cartão fica; a padrão continua funcionando', () => {
    const s = createGame(defaultConfig('r21g-cash'));
    const a = myAct(s);
    const lb = Object.values(s.labels).find((x) => x.active)!;
    emitEvent(s, Rng.fromSeed('p'), 'rival_poach', { act: a.id, label: lb.id });
    const d = s.decisions.find((x) => x.eventId === 'rival_poach')!;
    expect(d).toBeDefined();
    s.player.cash = 0;
    const n0 = s.notifications.length;
    expect(resolveDecision(s, d.id, 'counter')).toBe(false);
    expect(s.decisions.some((x) => x.id === d.id)).toBe(true);
    expect(s.notifications.slice(n0).some((x) => /Caixa insuficiente/.test(x.text.pt))).toBe(true);
    expect(resolveDecision(s, d.id, d.defaultOption)).toBe(true);
    expect(s.decisions.some((x) => x.id === d.id)).toBe(false);
  });
});

void (0 as unknown as GameState);
