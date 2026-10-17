// R31 · onda 5 (TUT, EXP-12) — tutorial guiado (src/ui/r31/tut5*.ts, src/sim/r31/tut5.ts):
//  - o roteiro completo é jogável de ponta a ponta por um robô que só faz o que o passo pede (2 épocas);
//  - todo alvo existe (objects5, regiões, botões da casca, teclas de keys5); todo passo tem fala bilíngue;
//  - clique ou tecla fora do alvo não muda nada (nem o mundo nem o tutorial);
//  - pular capítulo e sair funcionam; o modo dica não bloqueia;
//  - sem o tutorial a partida é igual (mesma semente, mesmo estado) e nada roteirizado vaza.
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { newRunConfig20 } from '../src/sim/start17';
import { scenarioById, scenarioConfig, setNextGameSetup } from '../src/sim/sys/live';
import type { GameState, RunConfig } from '../src/sim/types';
import { TUT_ERAS5, TUT_SEED5, startTut5, tut5Of, tutScenarioId5 } from '../src/sim/r31/tut5';
import { acceptCounter, defaultOffer, offerNow } from '../src/sim/contracts';
import { rng19 } from '../src/sim/rng19';
import { monthIndex, reservePlan } from '../src/sim/capacity';
import { startSession } from '../src/sim/studio';
import { availableFormats, scheduleRelease } from '../src/sim/production';
import { planTour } from '../src/sim/tours';
import { sizedDraft16 } from '../src/sim/sys/road27';
import { travelTo } from '../src/sim/sys/mapx8';
import { restDay } from '../src/sim/sys/agenda17';
import { advanceMonth } from '../src/sim/tick';
import { CITIES, cityById } from '../src/data/world';
import { NAV5, open5, pin5, travelGo5 } from '../src/ui/r31/nav5';
import { key5 } from '../src/ui/r31/keys5';
import { objects5 } from '../src/ui/r31/objects5';
import '../src/ui/r31/tut5data';
import { CHAPTERS5, EXTRAS5 } from '../src/ui/r31/tut5data';
import { VIEW0, ack5, allows5, cur5, exit5, keyAllows5, keyOf5, script5, skipChapter5, tick5, validTarget5, type Hit5, type Step5, type View5 } from '../src/ui/r31/tut5model';

function tutConfig(year: number): RunConfig {
  const d = scenarioById[tutScenarioId5(year)];
  return { ...scenarioConfig(d, newRunConfig20({ seed: TUT_SEED5, companyName: 'Selo Agulha', kind: 'scenario' })), scenario17: d.id, tut5: { from: 'scenario' } };
}
function tutGame(year: number): GameState {
  const cfg = tutConfig(year);
  setNextGameSetup({ scenarioId: cfg.scenario17 });
  const s = createGame(cfg);
  setNextGameSetup(null);
  return s;
}

let view: View5 = { ...VIEW0 };
beforeAll(() => {
  NAV5.open = (id) => { view = { ...view, paper: id }; };
  NAV5.travel = (r) => { view = { ...view, region: r, paper: undefined }; };
  NAV5.go = () => undefined;
});

/** O robô: faz exatamente a ação que o passo pede, pelos mesmos caminhos da interface. */
function act(s: GameState, step: Step5): void {
  const d = step.do;
  const band = s.acts[tut5Of(s)!.band!];
  if ('ack' in d) { expect(ack5(s, view)).toBe(true); return; }
  if ('open' in d) { open5(d.open); return; }
  if ('travel' in d) { travelGo5(s, d.travel); return; }
  if ('shell' in d) {
    if (d.shell === 'advance') { view = { ...view, paper: undefined }; advanceMonth(s); }
    else if (d.shell === 'pin') { expect(pin5(s, view.paper!)).toBeUndefined(); }
    else if (d.shell === 'help') view = { ...view, help: true };
    else if (d.shell === 'helpbox') view = { ...view, help: false };
    return;
  }
  if ('bot' in d) {
    if (d.bot === 'close') { view = { ...view, paper: undefined }; return; }
    if (d.bot === 'sign') {
      // como o jogador: se recusarem, melhora a proposta (royalty, controle criativo) e tenta de novo
      for (let i = 0; i < 4 && band.owner !== 'player'; i++) {
        const o = defaultOffer(s, band);
        o.royalty = Math.min(0.3, o.royalty + 0.03 * i); o.creativeControl = i >= 2;
        const r = offerNow(s, rng19(s, 'act'), o);
        if (r.result === 'counter' && r.offer) acceptCounter(s, r.offer.id);
      }
      return;
    }
    if (d.bot === 'plan') { const p = reservePlan(s, band.id, 'record', monthIndex(s) + 1); expect('pt' in p).toBe(false); return; }
    if (d.bot === 'record') { const x = startSession(s, band.id, band.songs.slice(0, 2), 0, 'live'); expect('pt' in x).toBe(false); return; }
    if (d.bot === 'release') {
      const song = band.songs.find((id) => s.songs[id]?.recorded && !s.songs[id].releaseId)!;
      const x = scheduleRelease(s, rng19(s, 'act'), { actId: band.id, type: 'single', songs: [song], formats: availableFormats(s).slice(0, 1), press: 500, marketing: [{ channel: 'press', budget: 500 }], territories: [cityById[s.config.homeCity].market], weeksAhead: 2 });
      expect('pt' in x, JSON.stringify(x)).toBe(false);
      return;
    }
    if (d.bot === 'show') {
      const setlist = band.songs.filter((id) => s.songs[id]?.recorded);
      const x = planTour(s, { actId: band.id, cities: [s.config.homeCity], startInDays: 14, priceMult: 1, setlist, role: 'headline', pay: 'door', ...sizedDraft16(s, band.id) } as Parameters<typeof planTour>[1]);
      expect('pt' in x, JSON.stringify(x)).toBe(false);
      return;
    }
    if (d.bot === 'trip') {
      const home = cityById[s.config.homeCity];
      const cands = CITIES.filter((c) => c.id !== home.id && c.market === home.market);
      for (const c of cands) { const x = travelTo(s, rng19(s, 'act'), c.id); if (!('pt' in x)) return; }
      throw new Error('nenhuma viagem possível');
    }
    if (d.bot === 'rest') { expect(restDay(s).ok).toBe(true); return; }
  }
  throw new Error(`ação desconhecida ${JSON.stringify(d)}`);
}

const snap = (s: GameState): string => JSON.stringify(s);
/** Algo que o passo NÃO libera (um objeto qualquer da sede fora do alvo). */
function outside(s: GameState): Hit5 {
  const o = objects5().find((x) => x.key && !allows5(s, { obj: x.id }) && !keyAllows5(s, key5(`obj:${x.id}`)!.chord));
  return { obj: o!.id };
}

describe('tutorial guiado (EXP-12)', () => {
  it('roteiro: 12 capítulos, extras por carreira, todo alvo existe, falas bilíngues', () => {
    expect(CHAPTERS5.length).toBe(12);
    expect(Object.keys(EXTRAS5).length).toBeGreaterThanOrEqual(6);
    for (const ch of [...CHAPTERS5, ...Object.values(EXTRAS5)]) {
      expect(ch.title.pt && ch.title.en).toBeTruthy();
      for (const st of ch.steps) {
        expect(validTarget5(st.target), `${ch.id}/${st.id}`).toBe(true);
        for (const f of st.free ?? []) expect(validTarget5(f)).toBe(true);
        expect(st.say.pt.length > 10 && st.say.en.length > 10 && st.say.pt !== st.say.en, `${ch.id}/${st.id}`).toBe(true);
        expect(!!st.ack || !!st.done, `${ch.id}/${st.id} conclui fazendo ou é explicativo`).toBe(true);
        if ('obj' in st.target && !st.ack) expect(keyOf5(st.target), `${ch.id}/${st.id} tem tecla`).toBeTruthy();
      }
    }
    const mins = CHAPTERS5.reduce((a, c) => a + c.mins, 0);
    expect(mins).toBeGreaterThanOrEqual(12); expect(mins).toBeLessThanOrEqual(20);
  });

  for (const year of [1925, 1975]) {
    it(`robô joga o roteiro inteiro em ${year} (só o que cada passo pede; clique fora não muda nada)`, () => {
      view = { ...VIEW0 };
      const s = tutGame(year);
      const t = tut5Of(s)!;
      expect(t).toBeTruthy();
      expect(s.acts[t.band!].owner).toBeNull(); // a banda roteirizada está na recepção, sem gravadora
      const seen: string[] = [];
      for (let guard = 0; guard < 120 && cur5(s); guard++) {
        const c = cur5(s)!;
        seen.push(`${c.ch.id}/${c.step.id}`);
        // clique e tecla fora do alvo: bloqueados e nada muda
        const before = snap(s);
        const out = outside(s);
        expect(allows5(s, out), `${c.ch.id}/${c.step.id}`).toBe(false);
        expect(keyAllows5(s, key5(`obj:${(out as { obj: string }).obj}`)!.chord)).toBe(false);
        expect(snap(s)).toBe(before);
        expect(allows5(s, c.step.target)).toBe(true);
        act(s, c.step);
        tick5(s, view);
        const n = cur5(s);
        expect(n && n.ch.id === c.ch.id && n.step.id === c.step.id, `passo ${c.ch.id}/${c.step.id} não concluiu`).toBeFalsy();
      }
      expect(t.end).toBe('diploma');
      expect(t.phone).toBe(true);
      expect(t.done.length).toBe(script5(s).length);
      expect(seen.length).toBeGreaterThan(30);
      expect(Object.values(s.releases).some((r) => r.actId === t.band) || s.pendingReleases.some((p) => p.actId === t.band)).toBe(true);
    });
  }

  it('pular capítulo e sair do tutorial', () => {
    view = { ...VIEW0 };
    const s = tutGame(1958);
    const first = cur5(s)!.ch.id;
    expect(skipChapter5(s, view)).toBe(true);
    expect(cur5(s)!.ch.id).not.toBe(first);
    expect(tut5Of(s)!.skip).toContain(first);
    exit5(s);
    expect(cur5(s)).toBeUndefined();
    expect(tut5Of(s)!.end).toBe('exit');
    expect(allows5(s, { obj: 'mural' })).toBe(true); // fora do tutorial nada é bloqueado
  });

  it('modo dica acende sem bloquear', () => {
    const s = tutGame(1995);
    startTut5(s, 'hint');
    expect(allows5(s, { obj: 'trofeus' })).toBe(true);
    expect(keyAllows5(s, 'o')).toBe(true);
  });

  it('sem o tutorial a partida é igual e nada roteirizado vaza', () => {
    const base = newRunConfig20({ seed: 'tut5-igual', companyName: 'Selo Agulha', kind: 'free' });
    const a = createGame({ ...base });
    const b = createGame({ ...base });
    expect(snap(a)).toBe(snap(b));
    expect((a as unknown as { x4: Record<string, unknown> }).x4.tut5).toBeUndefined();
    expect(Object.values(a.acts).some((x) => (x as unknown as { tut5?: 1 }).tut5)).toBe(false);
    advanceMonth(a); advanceMonth(b);
    expect(snap(a)).toBe(snap(b));
    // com a chave da nova run: mesma partida + só a banda e o progresso do tutorial
    const c = createGame({ ...base, tut5: { from: 'quick' } });
    const a0 = createGame({ ...base });
    expect(tut5Of(c)?.band).toBeTruthy();
    expect(c.player.cash).toBe(a0.player.cash);
    expect(Object.keys(c.acts).length).toBe(Object.keys(a0.acts).length + 1);
  });

  it('semente fixa: duas partidas do Primeiro selo começam iguais', () => {
    expect(snap(tutGame(2018))).toBe(snap(tutGame(2018)));
    for (const y of TUT_ERAS5) expect(scenarioById[tutScenarioId5(y)]).toBeTruthy();
  });
});
