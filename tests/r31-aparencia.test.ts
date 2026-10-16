// R31 · onda 3 (AP · Aparência e sex appeal): fonte única na ficha (base fixa, forma, estilo, marcas, segredos), imagem
// da persona13 lendo daí, sex appeal calculado por era/gênero/público, cuidados com as três formas de pagar, recusa e
// insistência, piora (idade, estresse), segredo → boato → fato público, pressão estética, acontecimentos e avatar.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { eventById, resolveDecision } from '../src/sim/events';
import { factsAbout } from '../src/sim/facts17';
import { see } from '../src/sim/know';
import {
  EVENTS31, LOOK_EVENTS31, actK31, ageDelta31, avatarTweak31, base31, doLook31, exposeSecret31, imgDelta31, look31, lookLock31,
  monthLook31, rec31, seenLook31, setPressure31, sexAppeal31, style31, styleDef31, svcCost31, view31,
} from '../src/sim/look31';
import { opinionOf, setOpinion } from '../src/sim/opinion';
import { setSw } from '../src/sim/r31/switches';
import { purse31 } from '../src/sim/r31/purse31';
import { ownerOf } from '../src/sim/sys/people/owner';
import { per13 } from '../src/sim/sys/persona13';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState, Person } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { FAMILY31 } from '../src/data/fossati31';
import '../src/sim/sys';

const mk = (seed: string, y = 1990) => createGame(defaultConfig(seed, { startYear: y, realNames: false }));
const rich = (s: GameState) => { ownerOf(s).wealth = 1e12; s.player.cash = 1e12; };
/** um ato do mundo vira seu (com integrantes vivos) */
function mine(s: GameState, genre?: string): { a: Act; p: Person } {
  const a = Object.values(s.acts).find((x) => x.status !== 'retired' && x.status !== 'split' && x.members.length && x.members.every((m) => s.persons[m]?.alive && !s.persons[m].isPlayer))!;
  a.owner = 'player';
  if (genre) a.genre = genre;
  a.cash = 1e9;
  const p = s.persons[a.members[0]];
  p.born = s.year - 26;
  p.stress = 20; p.fatigue = 20; p.health = 'ok';
  setOpinion(s, `p:${p.id}`, 0, l('teste', 'test'));
  return { a, p };
}

describe('r31 aparência — fonte única e cálculo', () => {
  it('base física fixa pela semente; quem não passou por nada não é guardado', () => {
    const a = mk('ap-base'), b = mk('ap-base');
    const pa = Object.values(a.persons).find((p) => !p.isPlayer)!;
    expect(base31(a, pa.id)).toBe(base31(b, pa.id));
    expect(Object.keys(look31(a).p)).toEqual([]);
    view31(a, pa); sexAppeal31(a, pa.id); per13(a, `p:${pa.id}`); // ler não guarda nada
    expect(Object.keys(look31(a).p)).toEqual([]);
  });

  it('a imagem da persona13 lê da ficha de aparência; desligado volta à conta antiga', () => {
    const s = mk('ap-img');
    rich(s);
    const { p } = mine(s);
    const before = per13(s, `p:${p.id}`)!.attrs.img;
    expect(Math.abs(imgDelta31(s, p))).toBeLessThan(3); // jovem e sem nada: quase a conta de sempre
    const r = doLook31(s, p.id, 'consult', 'co', { insist: true });
    expect(r.ok).toBe(true);
    const after = per13(s, `p:${p.id}`)!.attrs.img;
    expect(after).toBeGreaterThan(before);
    setSw(s, 'look31', false);
    expect(imgDelta31(s, p)).not.toBe(0); // a conta existe…
    expect(per13(s, `p:${p.id}`)!.attrs.img).toBeLessThanOrEqual(before + 1); // …mas a ficha volta à regra antiga
  });

  it('sex appeal calculado: pop pesa mais que jazz; era MTV mais que rádio', () => {
    const s = mk('ap-sa', 1990);
    const { a, p } = mine(s, 'pop');
    const pop = sexAppeal31(s, p.id, a)!;
    a.genre = 'nola_jazz';
    const jazz = sexAppeal31(s, p.id, a)!;
    expect(pop.w).toBeGreaterThan(jazz.w);
    expect(pop.v).toBe(jazz.v); // o valor é da pessoa; o peso é da era/gênero/público
    const old = mk('ap-sa40', 1940);
    const o = mine(old, 'pop');
    expect(sexAppeal31(old, o.p.id, o.a)!.w).toBeLessThan(pop.w);
  });

  it('estilo sobe rápido e volta ao padrão sem manutenção', () => {
    const s = mk('ap-style');
    rich(s);
    const { p } = mine(s);
    const D = styleDef31(s, p);
    doLook31(s, p.id, 'style', 'co', { insist: true });
    const up = style31(s, p);
    expect(up).toBeGreaterThan(D + 5);
    for (let i = 0; i < 8; i++) advanceMonth(s);
    expect(Math.abs(style31(s, p) - D)).toBeLessThan(Math.abs(up - D));
  }, 120000);

  it('idade: curva a partir dos 35, quem envelhece bem cai menos; Fossati fora do envelhecimento', () => {
    const s = mk('ap-age');
    const ps = Object.values(s.persons).filter((p) => !p.isPlayer).slice(0, 80);
    for (const p of ps) p.born = s.year - 30;
    expect(ps.every((p) => ageDelta31(s, p) === 0)).toBe(true);
    for (const p of ps) p.born = s.year - 60;
    const ds = ps.map((p) => ageDelta31(s, p));
    expect(Math.max(...ds)).toBeLessThan(0);
    expect(new Set(ds.map((x) => Math.round(x))).size).toBeGreaterThan(1); // alguns envelhecem bem
    for (const f of FAMILY31) expect(s.persons[f.id]).toBeUndefined(); // não moram em s.persons: nunca envelhecem
  });

  it('pressão estética desligada neutraliza a aparência física (estilo continua)', () => {
    const s = mk('ap-press');
    const { p } = mine(s);
    p.born = s.year - 62;
    const v1 = view31(s, p);
    expect(v1.Aeff).toBeLessThan(v1.base);
    setPressure31(s, 'off');
    expect(view31(s, p).Aeff).toBe(50);
    setPressure31(s, 'soft');
    const v2 = view31(s, p);
    expect(v2.Aeff).toBeGreaterThan(v1.Aeff);
  });
});

describe('r31 aparência — cuidados, pagamento, recusa', () => {
  it('três formas de pagar: bolso da pessoa, empresa e presente (opinião sobe)', () => {
    const s = mk('ap-pay');
    rich(s);
    const { a, p } = mine(s);
    const c = svcCost31(s, 'derm');
    const cash0 = a.cash;
    expect(doLook31(s, p.id, 'derm', 'me').ok).toBe(true);
    expect(a.cash).toBe(cash0 - c);
    const co0 = s.player.cash;
    doLook31(s, p.id, 'derm', 'co', { insist: true });
    expect(s.player.cash).toBeLessThan(co0);
    const w0 = ownerOf(s).wealth;
    const op0 = opinionOf(s, `p:${p.id}`);
    doLook31(s, p.id, 'derm', 'gift', { insist: true });
    expect(ownerOf(s).wealth).toBe(w0 - c);
    expect(opinionOf(s, `p:${p.id}`)).toBeGreaterThanOrEqual(op0);
    expect(purse31(s).last.some((x) => x.src === 'look31:derm' && x.ben === `p:${p.id}`)).toBe(true);
  });

  it('o próprio jogador: bolso pessoal ou retirada da empresa; presente não', () => {
    const s = mk('ap-me');
    rich(s);
    const me = Object.values(s.persons).find((x) => x.isPlayer)!;
    expect(lookLock31(s, me.id, 'gym', 'gift')).not.toBeNull();
    expect(doLook31(s, me.id, 'gym', 'me').ok).toBe(true);
    expect(doLook31(s, me.id, 'gym', 'co').ok).toBe(true);
    expect(rec31(s, me.id)!.f).toBeGreaterThan(0);
  });

  it('época: botox só a partir de 2002, harmonização 2018', () => {
    const s = mk('ap-era', 1995);
    rich(s);
    const { p } = mine(s);
    expect(lookLock31(s, p.id, 'botox', 'co')).not.toBeNull();
    expect(lookLock31(s, p.id, 'surgery', 'co')).toBeNull();
    const s2 = mk('ap-era2', 2019);
    rich(s2);
    const q = mine(s2).p;
    expect(lookLock31(s2, q.id, 'filler', 'co')).toBeNull();
  });

  it('recusa e insistência: insistir pesa na opinião', () => {
    let refused = false;
    for (let i = 0; i < 30 && !refused; i++) {
      const s = mk(`ap-ref-${i}`);
      rich(s);
      const { p } = mine(s, 'nola_jazz');
      const r = doLook31(s, p.id, 'surgery', 'co');
      if (!r.refused) continue;
      refused = true;
      expect(r.text.pt).toMatch(/recusa/);
      const op = opinionOf(s, `p:${p.id}`);
      let forced = false;
      for (let k = 0; k < 6 && !forced; k++) { s.week++; const x = doLook31(s, p.id, 'surgery', 'co', { insist: true }); forced = x.ok; }
      expect(forced).toBe(true);
      expect(opinionOf(s, `p:${p.id}`)).toBeLessThan(op);
    }
    expect(refused).toBe(true);
  });

  it('procedimento escondido: segredo → boato → fato público; o conhecimento passa a mostrar', () => {
    const s = mk('ap-sec', 2005);
    rich(s);
    const { a, p } = mine(s, 'pop');
    a.fame = 60;
    p.look = { ...(p.look ?? { body: 1, face: 0, skin: 0, hair: 1, hairColor: 0, outfit: 0, outfitColor: 0, glasses: false, hat: false, beard: false }) };
    let ok = false;
    for (let k = 0; k < 8 && !ok; k++) { s.week++; ok = doLook31(s, p.id, 'botox', 'me', { secret: true }).ok; }
    expect(ok).toBe(true);
    const sec = rec31(s, p.id)!.sec![0];
    expect(sec[2]).toBe(0);
    expect(seenLook31(s, p.id, 'market')!.secrets.length).toBe(0);
    exposeSecret31(s, p.id, sec);
    expect(sec[2]).toBe(2);
    expect(factsAbout(s, p.id, { limit: 20 }).some((f) => f.kind === 'secret_exposed' && f.visibility === 'public')).toBe(true);
    expect(see(s, p.id, 'lookSecret', 'market')).not.toBe('hidden');
    expect(seenLook31(s, p.id, 'market')!.secrets.length).toBe(1);
  });
});

describe('r31 aparência — mês, acontecimentos, onde pesa, avatar', () => {
  it('o mês só guarda quem mudou e é determinístico', () => {
    const run = () => {
      const s = mk('ap-month', 1985);
      const { a, p } = mine(s, 'pop_rock');
      p.role = 'vocal';
      a.status = 'hiatus'; p.morale = 10;
      for (let i = 0; i < 6; i++) monthLook31(s);
      return JSON.stringify(look31(s).p[p.id]);
    };
    const x = run();
    expect(x).toBe(run());
    expect(JSON.parse(x).wt).toBeGreaterThan(0); // pausa e tristeza pesam na forma
  });

  it('12 acontecimentos com escolha (2+ opções), todos aplicáveis sem erro', () => {
    expect(LOOK_EVENTS31.length).toBe(12);
    expect(EVENTS31.length).toBe(12);
    for (const e of EVENTS31) {
      expect(eventById[e.id]).toBeDefined();
      expect(e.options.length).toBeGreaterThanOrEqual(2);
      for (const o of e.options) {
        const s = mk(`ap-ev-${e.id}-${o.id}`);
        rich(s);
        const { a, p } = mine(s);
        s.decisions.push({ id: 'dx', eventId: e.id, cat: e.cat, title: e.title, text: e.text, options: e.options.map((x) => ({ id: x.id, label: x.label })), ctx: { act: a.id, person: p.id, by: 'label', proc: 'surgery' }, week: s.week, defaultOption: e.options[e.options.length - 1].id, tags: e.tags } as never);
        expect(resolveDecision(s, 'dx', o.id)).toBe(true);
      }
    }
  }, 240000);

  it('onde pesa: fator de clipe maior que o de valor; desligado = sem efeito', () => {
    const s = mk('ap-use', 1990);
    rich(s);
    const { a, p } = mine(s, 'pop');
    for (let i = 0; i < 3; i++) { s.week += 1; doLook31(s, p.id, 'consult', 'co', { insist: true }); doLook31(s, p.id, 'style', 'co', { insist: true }); }
    const v = actK31(s, a, 'video'), val = actK31(s, a, 'value');
    expect(v).not.toBeNull();
    expect(Math.abs(v!.k - 1)).toBeGreaterThanOrEqual(Math.abs((val?.k ?? 1) - 1));
    setSw(s, 'look31', false);
    expect(actK31(s, a, 'video')).toBeNull();
  });

  it('avatar: forma, peso, cabelo raspado e estilo mudam o boneco', () => {
    const s = mk('ap-av');
    rich(s);
    const { p } = mine(s);
    expect(avatarTweak31(s, p.id)).toBeNull();
    for (let i = 0; i < 3; i++) { s.week++; doLook31(s, p.id, 'gym', 'co', { insist: true }); }
    expect(avatarTweak31(s, p.id)?.body).toBe(0);
    const r = doLook31(s, p.id, 'style', 'co', { insist: true });
    expect(r.ok, r.text.pt).toBe(true);
    expect(avatarTweak31(s, p.id)?.outfitShift, JSON.stringify(rec31(s, p.id))).toBeGreaterThan(0);
  });

  it('roda um ano com elenco sem quebrar e sem marcas vencidas guardadas', () => {
    const s = mk('ap-year', 1995);
    mine(s, 'pop');
    for (let i = 0; i < 12; i++) advanceMonth(s);
    for (const r of Object.values(look31(s).p)) for (const m of r.mk ?? []) expect(m[1]).toBeGreaterThanOrEqual(s.week - 5);
  }, 240000);
});
