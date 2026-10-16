// R31 · onda 2 (J) — cenas da Mesa do chefe, da Turnê e do Projeto musical (modelos sem DOM):
//   · o que cada objeto da cena mostra bate com o estado (e com o Hoje / a tabela / o projeto);
//   · abrir (montar o modelo) não muda o estado nem consome sorteio;
//   · toda área clicável leva a algum lugar e cabe no desenho;
//   · as ações da cena são as MESMAS do formulário (mesmo estado depois).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { Rng } from '../src/core/rng';
import { EVENTS, emitEvent, resolveDecision } from '../src/sim/events';
import { pendingList } from '../src/sim/r31/pending';
import { rngSnapshot19 } from '../src/sim/rng19';
import { cancelTour, planTour } from '../src/sim/tours';
import { createProject, openProjects, planWriting, projectStage, recordNow, type MusicProject } from '../src/sim/sys/project8';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { editableById, runnableById } from '../src/sim/r31/editor';
import { hoje31 } from '../src/ui/ps/hoje31model';
import { DESK_ACTS31, PIN31, desk31 } from '../src/ui/r31/desk31model';
import { TOUR_ACTS31, dotR31, tour31 } from '../src/ui/r31/tour31model';
import { PROJ_ACTS31, digital31, proj31 } from '../src/ui/r31/proj31model';
import { spotOk31 } from '../src/ui/r31/scene31model';

const game = (seed = 'r31j', y = 1975): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const snap = (s: GameState): string => JSON.stringify(s);
const clone = (s: GameState): GameState => structuredClone(s);
/** Fixa os caches determinísticos que o Hoje já preenche na primeira leitura (visão de mundo do jogador, derivada só da
 *  semente — x4.beliefs10): não é mudança do mundo, mas sai no JSON. Depois disso, abrir as cenas não muda nada. */
const warm = (s: GameState): void => { hoje31(s); };

/** Põe ao menos uma decisão na mesa (evento real do motor, sorte pura por chave). */
function withDecision(s: GameState): boolean {
  for (const ev of EVENTS) {
    if (s.decisions.length) return true;
    const r = Rng.fromSeed(`${s.config.seed}|j31|${ev.id}`);
    let ctx: ReturnType<NonNullable<typeof ev.find>> | Record<string, never> | null = {};
    try { ctx = ev.find ? ev.find(s, r) : {}; } catch { ctx = null; }
    if (!ctx) continue;
    try { emitEvent(s, r, ev.id, ctx); } catch { /* evento sem cabimento */ }
  }
  return s.decisions.length > 0;
}

function bookTour(s: GameState): string {
  const actId = playerActs(s)[0];
  const cities = ['rio', 'sao_paulo', 'salvador', 'recife', 'bh', 'lisbon', 'london', 'paris', 'new_york'].filter((c) => c !== s.config.homeCity).slice(0, 3);
  const r = planTour(s, { actId, cities, startInDays: 10, priceMult: 1, minutes: 45, setlist: [], production: 0, role: 'headline', crew: 2, pay: 'door' });
  if ('pt' in r) throw new Error(r.pt);
  return r.id;
}

describe('R31 J · Mesa do chefe', () => {
  it('telefone = pendências únicas do Hoje; cartas, mural e jornal batem com o estado', () => {
    const s = game();
    withDecision(s);
    const m = desk31(s);
    expect(m.calls.length).toBe(pendingList(s).length);
    expect(m.calls.length).toBe(hoje31(s).decide.length);
    const phone = m.spots.find((x) => x.id === 'phone')!;
    if (m.calls.length) {
      expect(phone.badge?.text).toBe(String(m.calls.length));
      expect(m.callsLine.pt).toMatch(/decis/); // texto + assunto, não só número
    } else expect(phone.badge).toBeUndefined();
    expect(m.news.length).toBe(hoje31(s).changed.length);
    // mural: um alfinete por projeto aberto do jogador, com estado escrito (símbolo + nome)
    const pid = playerActs(s)[0];
    const p = createProject(s, pid, { type: 'single' }) as MusicProject;
    const m2 = desk31(s);
    const pin = m2.pins.find((x) => x.pid === p.id)!;
    expect(pin).toBeTruthy();
    expect(Object.keys(PIN31)).toContain(pin.status);
    expect(m2.spots.some((x) => x.id === `pin:${p.id}` && x.badge?.sym === PIN31[pin.status].sym)).toBe(true);
  });

  it('toda área tem destino e cabe na cena; "você" aparece', () => {
    const s = game();
    const m = desk31(s);
    for (const sp of m.spots) expect(spotOk31(sp, m.W, m.H), sp.id).toBe(true);
    for (const id of ['phone', 'tray', 'calendar', 'board', 'news', 'window', 'me']) expect(m.spots.some((x) => x.id === id), id).toBe(true);
  });

  it('abrir a mesa não muda o estado nem o sorteio', () => {
    const s = game();
    withDecision(s);
    warm(s);
    const a = snap(s), r = rngSnapshot19(s);
    desk31(s); desk31(s);
    expect(snap(s)).toBe(a);
    expect(rngSnapshot19(s)).toBe(r);
  });

  it('responder no telefone = responder na Mesa do mês (mesma função, mesmo estado)', () => {
    const s = game();
    if (!withDecision(s)) return; // nenhum evento cabe nesta semente: nada a comparar
    const d = s.decisions[0];
    const opt = d.defaultOption;
    const a = clone(s), b = clone(s);
    DESK_ACTS31.decide(a, d.id, opt);
    resolveDecision(b, d.id, opt);
    expect(snap(a)).toBe(snap(b));
    expect(a.decisions.some((x) => x.id === d.id)).toBe(false);
  });
});

describe('R31 J · Turnê (mapa + calendário)', () => {
  it('pontos = datas da turnê; porte pela lotação; estado escrito; ônibus e você', () => {
    const s = game();
    const id = bookTour(s);
    const tr = s.tours.find((x) => x.id === id)!;
    const m = tour31(s);
    expect(m.tour?.id).toBe(id);
    expect(m.dots.map((d) => d.cityId)).toEqual(tr.stops.map((x) => x.cityId));
    for (const [i, d] of m.dots.entries()) {
      expect(d.r).toBe(dotR31(tr.stops[i].capacity));
      expect(d.status).toBe(tr.stops[i].status === 'played' ? 'played' : tr.stops[i].status === 'cancelled' ? 'cancelled' : 'todo');
    }
    expect(m.bus).toBeTruthy();
    expect(m.spots.some((x) => x.id === 'me')).toBe(true);
    for (const sp of m.spots) expect(spotOk31(sp, m.W, m.H), sp.id).toBe(true);
  });

  it('calendário: show no dia certo, viagem antes, "+" nos dias livres, conflito com estúdio em vermelho', () => {
    const s = game();
    const id = bookTour(s);
    const tr = s.tours.find((x) => x.id === id)!;
    const st = tr.stops[0];
    const m0 = tour31(s);
    const month = m0.month;
    const inMonth = (day: number) => day >= month.first && day < month.first + month.n;
    // pede o mês da primeira data
    const ref = (() => { const dd = new Date(Date.UTC(s.config.startYear, 0, 1) + st.day * 86400000); return { year: dd.getUTCFullYear(), month: dd.getUTCMonth() }; })();
    const m = tour31(s, { month: ref });
    const day = m.days.find((x) => x.day === st.day)!;
    expect(day.kind).toBe('show');
    expect(day.cityId).toBe(st.cityId);
    expect(m.days.filter((x) => x.kind === 'free').every((x) => x.plus)).toBe(true);
    void inMonth;
    // sessão de estúdio do mesmo artista no dia do show → conflito
    s.sessions.push({ id: 'ses-j31', actId: tr.actId, songIds: [], approach: 'balanced', tier: 0, startDay: st.day, days: 2, dayDone: 0, takes: {}, costPaid: 0, log: [] });
    const mc = tour31(s, { month: ref });
    const dc = mc.days.find((x) => x.day === st.day)!;
    expect(dc.kind).toBe('conflict');
    expect(dc.why?.pt).toMatch(/estúdio/);
    expect(mc.conflicts).toBeGreaterThan(0);
    expect(mc.spots.find((x) => x.id === `day:${dc.dom}`)?.badge?.level).toBe('crit');
  });

  it('abrir a turnê não muda o estado; cancelar na cena = cancelar na tabela', () => {
    const s = game();
    const id = bookTour(s);
    const a0 = snap(s), r0 = rngSnapshot19(s);
    tour31(s); tour31(s, { draft: ['rio'] });
    expect(snap(s)).toBe(a0);
    expect(rngSnapshot19(s)).toBe(r0);
    const a = clone(s), b = clone(s);
    TOUR_ACTS31.cancel(a, id);
    cancelTour(b, id);
    expect(snap(a)).toBe(snap(b));
  });
});

describe('R31 J · Projeto musical (rua do lançamento)', () => {
  it('etapas pelo plano real: atual = estágio do motor; fábrica só com formato físico; van na etapa atual', () => {
    const s = game();
    const p = createProject(s, playerActs(s)[0], { type: 'lp' }) as MusicProject;
    const m = proj31(s, p);
    const ps = projectStage(s, p);
    const now = m.stages.filter((x) => x.state === 'now');
    expect(now.length).toBe(ps === 'followup' ? 0 : 1);
    const want = ps === 'concept' || ps === 'writing' ? 'compose' : ps === 'recording' ? 'studio' : ps === 'finishing' ? (m.digital ? 'radio' : 'factory') : ps === 'scheduled' ? 'radio' : 'store';
    if (now[0]) expect(now[0].id).toBe(want);
    expect(m.van.stage).toBe(want);
    expect(m.stages.some((x) => x.id === 'factory')).toBe(!digital31(s, p));
    // feitas antes da atual, futuras depois
    const i = m.stages.findIndex((x) => x.state === 'now');
    m.stages.forEach((x, k) => { if (i >= 0) expect(x.state).toBe(k < i ? 'done' : k === i ? 'now' : 'next'); });
    // marcos de divulgação: um por tipo de canal com verba
    if (p.marketing.some((x) => x.budget > 0)) expect(m.flags.length).toBeGreaterThan(0);
    for (const sp of m.spots) expect(spotOk31(sp, m.W, m.H), sp.id).toBe(true);
  });

  it('abrir a rua não muda o estado nem o sorteio', () => {
    const s = game();
    const p = createProject(s, playerActs(s)[0], { type: 'single' }) as MusicProject;
    const a = snap(s), r = rngSnapshot19(s);
    proj31(s, p); proj31(s, p);
    expect(snap(s)).toBe(a);
    expect(rngSnapshot19(s)).toBe(r);
  });

  it('ações da rua = botões do projeto (mesmas funções, mesmo estado)', () => {
    expect(PROJ_ACTS31.write.run).toBe(planWriting);
    expect(PROJ_ACTS31.recordNow.run).toBe(recordNow);
    const s = game();
    const p = createProject(s, playerActs(s)[0], { type: 'single' }) as MusicProject;
    const a = clone(s), b = clone(s);
    const pa = openProjects(a).find((x) => x.id === p.id)!, pb = openProjects(b).find((x) => x.id === p.id)!;
    const ea = PROJ_ACTS31.write.run(a, pa), eb = planWriting(b, pb);
    expect(ea).toEqual(eb);
    expect(snap(a)).toBe(snap(b));
    const c = clone(s), d = clone(s);
    const pc = openProjects(c).find((x) => x.id === p.id)!, pd = openProjects(d).find((x) => x.id === p.id)!;
    expect(PROJ_ACTS31.recordNow.run(c, pc)).toEqual(recordNow(d, pd));
    expect(snap(c)).toBe(snap(d));
  });
});

describe('R31 J · editor (regra 10)', () => {
  it('as cenas registram o que dá para editar e rodar', () => {
    expect(editableById('j31.proj.weeks')).toBeTruthy();
    expect(editableById('j31.tour.sold')?.raw).toBe(true);
    expect(runnableById('j31.proj.record')).toBeTruthy();
  });
});
