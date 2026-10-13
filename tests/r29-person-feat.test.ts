// R29 (feat de pessoa): o feat negociado (feats8) aceita como convidado uma PESSOA específica — integrante, solo, avulso,
// produtor(a) que canta/toca — ou várias, e ato + pessoas. Crédito com o nome da pessoa, efeitos pela fama/habilidade dela,
// liberação do selo da banda dela, bloqueios (morta, parada), opção "Participação" do member29 pré-escolhendo a pessoa,
// determinismo (sorteio próprio, sem mexer no fluxo compartilhado). Ver docs/feat29.md.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs } from '../src/sim/production';
import type { Act, GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { rngOf } from '../src/sim/util';
import { personFeats29 } from '../src/sim/sys/connect29';
import { FEATP29_CORE, featureFee, songX } from '../src/sim/sys/creation/core';
import { personFame } from '../src/sim/sys/fame15';
import { closeFeat, crossAudience, fairFeat, featSongs, feats, hasFeat29, proposeFeat } from '../src/sim/sys/feats8';
import {
  bandReact29, clearance29, closeFeat29, crossPerson29, fairFeat29, featChance29, featPersonBlock29, featPersons29, homeAct29, proposeFeat29, searchFeatPersons29,
} from '../src/sim/sys/featp29';
import { memberFeatPreset29, memberOptions29 } from '../src/sim/sys/member29';
import { ctxMenu27, menuSections27 } from '../src/ui/ps/ctx27model';

const game = (seed = 'r29pf', year = 1975): GameState => { const s = createGame(defaultConfig(seed, { startYear: year })); s.player.cash += 50_000_000_00; return s; };
const live = (a: Act) => a.status === 'active' || a.status === 'emerging';
const okBand = (s: GameState, a: Act) => live(a) && a.members.length >= 3 && a.members.every((m) => s.persons[m]?.alive && !s.persons[m].isPlayer);
const freeBands = (s: GameState): Act[] => Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && okBand(s, a)).sort((a, b) => b.fame - a.fame);
const rivalBand = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && s.labels[a.owner]?.active && okBand(s, a)).sort((a, b) => b.fame - a.fame)[0];
/** Um ato seu com músicas inéditas prontas para receber convidado. */
function host(s: GameState): Act {
  const a = freeBands(s)[3];
  acceptOffer(s, a, { ...defaultOffer(s, a), id: `o-${a.id}`, week: s.week, status: 'pending', advance: 0 });
  composeSongs(s, rngOf(s), a, 4);
  expect(featSongs(s, a.id).length).toBeGreaterThan(1);
  return a;
}
/** Integrante "da frente" (líder/voz) e um de trás, da mesma banda. */
function frontBack(s: GameState, b: Act): [string, string] {
  const xs = b.members.slice().sort((x, y) => personFame(s, y).v - personFame(s, x).v);
  return [xs[0], xs[xs.length - 1]];
}

describe('R29 — feat de pessoa específica', () => {
  it('crédito com o nome da pessoa (não da banda); a banda reage; a ficha e a crônica listam o feat', () => {
    const s = game();
    const H = host(s);
    const band = freeBands(s)[0];
    const [pid] = frontBack(s, band);
    const so = featSongs(s, H.id)[0];
    const base = so.title;
    const mate = band.members.find((m) => m !== pid)!;
    const rel0 = s.persons[mate].rel[pid] ?? 0;
    const d = closeFeat29(s, so.id, { persons: [pid] }, fairFeat29(s, H.id, { persons: [pid] }), 0)!;
    expect(d).toBeTruthy();
    expect(s.songs[so.id].title).toBe(`${base} (feat. ${s.persons[pid].name})`);
    expect(s.songs[so.id].title).not.toContain(band.name);
    expect(songX(s, so.id).featuring).toBeUndefined(); // não é a banda inteira
    expect(featPersons29(s, so.id)).toEqual([pid]);
    expect(hasFeat29(s, so.id)).toBe(true);
    expect(featSongs(s, H.id).some((x) => x.id === so.id)).toBe(false);
    expect(d.guestPersons).toEqual([pid]);
    expect(d.guestActId).toBe('');
    // colegas de banda: ciúme (−2) ou orgulho (+1) — sem sorteio
    expect(s.persons[mate].rel[pid]).not.toBe(rel0);
    // ficha (Conexões) e crônica: a pessoa tem o feat
    expect(personFeats29(s, pid).some((x) => x.songId === so.id && x.via === 'person')).toBe(true);
    expect(s.memory.some((m) => m.kind === 'feature' && m.pid === pid && m.actId === H.id)).toBe(true);
    // a busca acha a pessoa pelo nome e pela banda, agrupada pelo ato de casa
    const g = searchFeatPersons29(s, H.id, s.persons[pid].name.split(' ')[0]);
    expect(g.some((x) => x.rows.some((r) => r.pid === pid))).toBe(true);
    const gb = searchFeatPersons29(s, H.id, band.name, 24);
    expect(gb.find((x) => x.actId === band.id)?.rows.length).toBeGreaterThan(1);
    expect(searchFeatPersons29(s, H.id, '', 10).reduce((t, x) => t + x.rows.length, 0)).toBeLessThanOrEqual(10);
  }, 60_000);

  it('efeitos pela fama da PESSOA (personFame), não do ato: cachê, apelo, performance e público cruzado', () => {
    const s = game('r29pf-b');
    const H = host(s);
    const band = freeBands(s)[0];
    const [front, back] = frontBack(s, band);
    const pf = personFame(s, front).v, pb = personFame(s, back).v;
    expect(pf).toBeGreaterThan(pb);
    expect(pf).toBeLessThan(band.fame + 30);
    // cachê: o da pessoa (pela fama dela) — o de trás custa menos; nenhum é o do ato inteiro
    const ff = fairFeat29(s, H.id, { persons: [front] }).fee, fb = fairFeat29(s, H.id, { persons: [back] }).fee;
    expect(ff).toBeGreaterThan(fb);
    expect(ff).not.toBe(fairFeat(s, H.id, band.id).fee);
    expect(ff).toBeLessThan(featureFee(s, { fame: pf } as Act) * 1.2 + 1);
    // apelo: pela fama da pessoa
    const ap = FEATP29_CORE.appeal!(s, [front], 'rock');
    expect(ap).toBeGreaterThan(1);
    expect(ap - 1).toBeLessThanOrEqual(Math.min(0.2, pf / 330) + 0.04 + 1e-9);
    // performance: ganho pela fama/habilidade da pessoa (limitado), menor que o do ato inteiro
    const [s1, s2] = featSongs(s, H.id);
    const p1 = s1.performance, p2 = s2.performance;
    closeFeat29(s, s1.id, { persons: [back] }, { fee: 0, split: 0.1 }, 0);
    closeFeat(s, s2.id, band.id, { fee: 0, split: 0.1 }, 0);
    expect(s.songs[s1.id].performance - p1).toBeLessThan(s.songs[s2.id].performance - p2 + 1e-9);
    expect(s.songs[s1.id].performance - p1).toBeLessThanOrEqual(12);
    // público cruzado no lançamento: vem dos fãs da banda da pessoa, em escala menor que o feat da banda inteira
    const c0 = H.fans.casual;
    crossPerson29(s, H, back);
    const gainP = H.fans.casual - c0;
    const c1 = H.fans.casual;
    crossAudience(s, H, band);
    const gainA = H.fans.casual - c1;
    expect(gainP).toBeGreaterThan(0);
    expect(gainP).toBeLessThan(gainA);
    expect(gainP).toBeLessThanOrEqual(Math.round((band.fans.casual * 0.03 + band.fans.active * 0.01) * (0.25 + pb / 250)) + 1);
  }, 60_000);

  it('liberação: pessoa de banda com selo rival paga taxa ao selo; rivalidade alta bloqueia com o motivo', () => {
    const s = game('r29pf-c');
    const H = host(s);
    const rb = rivalBand(s);
    const [pid] = frontBack(s, rb);
    const lb = s.labels[rb.owner!];
    s.rivalries[lb.id] = 30;
    const fee = fairFeat29(s, H.id, { persons: [pid] }).fee;
    const cl = clearance29(s, H.id, { persons: [pid] }, fee);
    expect(cl.blocked).toBe(false);
    expect(cl.cost).toBeGreaterThan(0);
    expect(cl.text.pt).toContain(lb.name);
    const cash0 = lb.cash;
    const so = featSongs(s, H.id)[0];
    closeFeat29(s, so.id, { persons: [pid] }, { fee, split: 0.1 }, cl.cost);
    expect(lb.cash).toBeGreaterThan(cash0);
    // rivalidade alta: o selo não libera — bloqueio com motivo (menu e proposta)
    s.rivalries[lb.id] = 80;
    expect(featPersonBlock29(s, rb.members[1])?.pt).toMatch(/rivalidade/);
    const so2 = featSongs(s, H.id)[0];
    const r = proposeFeat29(s, so2.id, { persons: [rb.members[1]] }, { fee, split: 0.1 });
    expect(r.result).toBe('invalid');
    expect(r.text.pt).toMatch(/rivalidade/);
  }, 60_000);

  it('o feat do ato inteiro segue igual (crédito da banda, sem pessoas, mesmo sorteio)', () => {
    const run = () => {
      const s = game('r29pf-d');
      const H = host(s);
      const band = freeBands(s)[0];
      const so = featSongs(s, H.id)[0];
      const fair = fairFeat(s, H.id, band.id);
      const res = proposeFeat(s, rngOf(s), so.id, band.id, { fee: fair.fee * 3, split: fair.split * 2 });
      return { s, H, band, so, res };
    };
    const a = run(), b = run();
    expect(a.res.result).toBe(b.res.result);
    expect(JSON.stringify(a.s.rng)).toBe(JSON.stringify(b.s.rng));
    // fechado pelo caminho do ato: crédito com o nome da banda, nada de pessoas
    const s = a.s;
    const so = featSongs(s, a.H.id)[0];
    const base = so.title;
    const d = closeFeat(s, so.id, a.band.id, { fee: 0, split: 0.1 }, 0)!;
    expect(s.songs[so.id].title).toBe(`${base} (feat. ${a.band.name})`);
    expect(songX(s, so.id).featuring).toBe(a.band.id);
    expect(songX(s, so.id).featPersons).toBeUndefined();
    expect(d.guestPersons).toBeUndefined();
    expect(d.guestActId).toBe(a.band.id);
  }, 120_000);

  it('várias pessoas (de bandas diferentes) e ato + pessoa: crédito "A & B", cachês e liberações somados', () => {
    const s = game('r29pf-e');
    const H = host(s);
    const [b1, b2, b3] = freeBands(s);
    const [p1] = frontBack(s, b1);
    const [p2] = frontBack(s, b2);
    const so = featSongs(s, H.id)[0];
    const base = so.title;
    const one = fairFeat29(s, H.id, { persons: [p1] });
    const two = fairFeat29(s, H.id, { persons: [p1, p2] });
    expect(two.fee).toBeGreaterThan(one.fee);
    expect(two.split).toBeGreaterThanOrEqual(one.split);
    // a chance do convite inteiro é a de quem for mais difícil (nunca maior que a de um só)
    expect(featChance29(s, so.id, { persons: [p1, p2] }, two)).toBeLessThanOrEqual(Math.max(featChance29(s, so.id, { persons: [p1] }, one), featChance29(s, so.id, { persons: [p2] }, fairFeat29(s, H.id, { persons: [p2] }))) + 1e-9);
    const d = closeFeat29(s, so.id, { persons: [p1, p2, p1] }, two, 0)!;
    expect(s.songs[so.id].title).toBe(`${base} (feat. ${s.persons[p1].name} & ${s.persons[p2].name})`);
    expect(d.guestPersons).toEqual([p1, p2]);
    expect(personFeats29(s, p2).some((x) => x.songId === so.id)).toBe(true);
    // ato + pessoa de outra banda (feat misto); a pessoa da própria banda convidada é redundante
    const so2 = featSongs(s, H.id)[0];
    const [p3] = frontBack(s, b3);
    expect(proposeFeat29(s, so2.id, { act: b3.id, persons: [p3] }, { fee: 0, split: 0 }).text.pt).toMatch(/já vem com/);
    const [q] = frontBack(s, freeBands(s)[4]);
    closeFeat29(s, so2.id, { act: b3.id, persons: [q] }, { fee: 0, split: 0.1 }, 0);
    expect(s.songs[so2.id].title).toContain(`(feat. ${b3.name} & ${s.persons[q].name})`);
    expect(songX(s, so2.id).featuring).toBe(b3.id);
  }, 60_000);

  it('morta, jovem demais, parada (sem banda viva) ou do seu elenco: bloqueadas com o motivo', () => {
    const s = game('r29pf-f');
    const H = host(s);
    const band = freeBands(s)[0];
    const [pid, other] = frontBack(s, band);
    expect(featPersonBlock29(s, pid)).toBeNull();
    s.persons[pid].alive = false;
    expect(featPersonBlock29(s, pid)?.pt).toMatch(/Faleceu/);
    const so = featSongs(s, H.id)[0];
    expect(proposeFeat29(s, so.id, { persons: [pid] }, { fee: 0, split: 0 }).result).toBe('invalid');
    expect(closeFeat29(s, so.id, { persons: [pid] }, { fee: 0, split: 0 }, 0)).toBeNull();
    s.persons[pid].alive = true;
    s.persons[other].born = s.year - 10;
    expect(featPersonBlock29(s, other)?.pt).toMatch(/Jovem demais/);
    // banda aposentada e a pessoa sem outra carreira: fora de atividade nesta época
    const retired = Object.values(s.acts).find((a) => a.status === 'retired' && a.members.some((m) => s.persons[m]?.alive && !homeAct29(s, m)));
    if (retired) {
      const m = retired.members.find((x) => s.persons[x]?.alive && !homeAct29(s, x))!;
      expect(featPersonBlock29(s, m)?.pt).toMatch(/Fora de atividade|Jovem/);
    }
    expect(featPersonBlock29(s, H.members[0])?.pt).toMatch(/elenco|neste artista|É você/);
    // a busca mostra quem não pode com o motivo, depois dos disponíveis
    s.persons[pid].alive = false;
    const rows = searchFeatPersons29(s, H.id, s.persons[pid].name).flatMap((x) => x.rows);
    expect(rows.find((x) => x.pid === pid)?.block?.pt).toMatch(/Faleceu/);
  }, 60_000);

  it('member29 "Participação" e o menu da pessoa pré-escolhem a PESSOA (não a banda)', () => {
    const s = game('r29pf-g');
    const H = host(s);
    const band = freeBands(s)[0];
    const pid = band.members[1];
    const op = memberOptions29(s, pid).find((x) => x.id === 'mo.feat')!;
    expect(op.block).toBeNull();
    expect(op.label.pt).toContain(s.persons[pid].name);
    expect(op.label.pt).not.toContain(band.name);
    const pre = memberFeatPreset29(s, pid);
    expect(pre.persons).toEqual([pid]);
    expect(pre.host).toBe(H.id);
    expect((pre as { guest?: string }).guest).toBeUndefined();
    // clique direito na pessoa: "Convidar {nome} para um feat…" em Música e projetos
    const m = ctxMenu27(s, 'person', `p:${pid}`)!;
    const mus = menuSections27(m).find((x) => x.sec === 'music')!;
    const it0 = mus.items.find((x) => x.id === 'person.feat29')!;
    expect(it0.block).toBeNull();
    expect(it0.label.pt).toBe(`Convidar ${s.persons[pid].name} para um feat…`);
    s.persons[pid].alive = false;
    expect(ctxMenu27(s, 'person', `p:${pid}`)!.items.find((x) => x.id === 'person.feat29')?.block?.pt).toMatch(/Faleceu/);
  }, 60_000);

  it('determinismo: mesma semente → mesmo resultado; o fluxo compartilhado não anda', () => {
    const run = () => {
      const s = game('r29pf-h');
      const H = host(s);
      const out: string[] = [];
      const rng0 = JSON.stringify(s.rng);
      const bands = freeBands(s);
      for (let i = 0; i < 4; i++) {
        const so = featSongs(s, H.id)[0];
        if (!so) break;
        const [pid] = frontBack(s, bands[i]);
        const f = fairFeat29(s, H.id, { persons: [pid] });
        const r = proposeFeat29(s, so.id, { persons: [pid] }, { fee: Math.round(f.fee * (0.6 + i * 0.4)), split: f.split });
        out.push(`${r.result}:${r.deal?.status ?? ''}:${s.songs[so.id].title}`);
      }
      expect(JSON.stringify(s.rng)).toBe(rng0);
      return { out, n: feats(s).n29, deals: feats(s).deals.map((d) => `${d.status}|${(d.guestPersons ?? []).join(',')}`) };
    };
    const a = run(), b = run();
    expect(a).toEqual(b);
    expect(a.n).toBeGreaterThan(0);
  }, 120_000);

  it('a banda reage sem sorteio: ciúme quando o anfitrião não é bem maior', () => {
    const s = game('r29pf-i');
    const H = host(s);
    const band = freeBands(s)[0];
    const [pid] = frontBack(s, band);
    H.fame = band.fame - 5;
    const mate = band.members.find((m) => m !== pid)!;
    const r0 = s.persons[mate].rel[pid] ?? 0;
    expect(bandReact29(s, pid, H)).toBe(-2);
    expect(s.persons[mate].rel[pid]).toBe(Math.max(-100, r0 - 2));
    H.fame = band.fame + 20;
    expect(bandReact29(s, pid, H)).toBe(1);
  }, 60_000);
});
