// Rodada 12: agente x promotor e dono de estúdio x produtor.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { foundVenture, signBooking, ventures } from '../src/sim/sys/ventures9';
import { bookRoute, defaultStop, shows12, openPromoter, predict, validate } from '../src/sim/sys/tour12';
import { deliver, prod, startProducer, stepBand, stepConflict, stepIntent, stepTake, studioOf, studios, takeJob } from '../src/sim/sys/studio12';
import { rng19 } from '../src/sim/rng19';

const mk = (seed: string) => { const s = createGame(defaultConfig(seed, { startYear: 1990 })); s.player.cash = 5_000_000_00; return s; };

describe('agente x promotor', () => {
  it('promotor marca, prevê e liquida um show; força local e cansaço se movem', () => {
    const s = mk('r12-tour');
    // r27: atos reais podem ter fim de carreira roteirizado (separação nos meses seguintes cancela o show): usa um ato sem dados reais
    const act = Object.values(s.acts).filter((a) => a.members.length && a.status !== 'retired' && !a.catalogNo).sort((a, b) => b.fame - a.fame)[0]
      ?? Object.values(s.acts).filter((a) => a.members.length && a.status !== 'retired').sort((a, b) => b.fame - a.fame)[0];
    expect(openPromoter(s)).toBeNull();
    const st = defaultStop(s, act, act.city, s.week + 3);
    const v = validate(s, 'promoter', act.id, [st]);
    expect(v.preds[0].att[0]).toBeLessThanOrEqual(v.preds[0].att[2]);
    expect(predict(s, 'promoter', act, st, 0).cap).toBeGreaterThan(0);
    st.ask = 1.2; st.fee = v.preds[0].ask * 1.2;
    const r = bookRoute(s, rng19(s, 'act'), 'promoter', act.id, [st]);
    if (!r.ok) return; // data/casa ocupada: o validador explicou
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const sh = shows12(s).find((x) => x.actId === act.id); // UNI-4: o show avulso é uma turnê de 1 data em s.tours
    expect(sh?.status).toBe('done');
    expect(sh?.res?.why.length).toBeGreaterThan(0);
  });
  it('agente exige agência e cliente', () => {
    const s = mk('r12-agent');
    const act = Object.values(s.acts)[0];
    expect(bookRoute(s, rng19(s, 'act'), 'agent', act.id, [defaultStop(s, act, act.city, s.week + 3)]).ok).toBe(false);
    expect(foundVenture(s, 'booking', 'label')).toBeNull();
    void signBooking; void ventures;
  });
});

describe('estúdio e produtor', () => {
  it('estúdio recebe propostas e o produtor conclui um projeto com o take imperfeito', () => {
    const s = mk('r12-studio');
    expect(foundVenture(s, 'studio', 'label')).toBeNull();
    const v = studios(s)[0];
    expect(studioOf(s, v).rooms.length).toBe(1);
    for (let i = 0; i < 12; i++) advanceMonth(s);
    startProducer(s);
    const P = prod(s);
    const a = Object.values(s.acts).find((x) => x.members.length && x.status !== 'retired')!;
    P.offers.push({ id: 'pj1', actId: a.id, own: false, fee: 100000, pts: 0.03, months: 3, exp: 99999 });
    expect(takeJob(s, 'pj1', 'flat')).toBeNull();
    stepIntent(s, 'faithful', P.sig); stepBand(s, 'band', 'hybrid', 'rent'); stepConflict(s, 'both');
    const r = rng19(s, 'act'); stepTake(s, r, 'keep'); deliver(s, r);
    expect(P.proj?.done?.q).toBeGreaterThan(0);
    expect(P.credits.length).toBe(1);
  });
});
