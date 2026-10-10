// Rodada 17 — FILHOS que crescem. Cada filho(a) do jogador ganha temperamento (rebeldia, estudo, arte,
// sociabilidade) herdado de você e do par, aparência herdada (pele/cabelo → retrato envelhece junto), traços
// herdados, fases (bebê, escola, adolescência com fase rebelde, adulto) e muda de personalidade conforme o
// vínculo, a escola, a sua fama, o estresse da casa e o divórcio. Aos 18 escolhe um caminho: música pelo seu
// selo, trabalhar no selo (herdeiro), outra vida — ou, magoado(a), assinar com a concorrência.
// Também: começar o jogo já com filhos e estado civil (ficha de criação).

import { clamp, hashString, Rng } from '../../core/rng';
import { GENRES, familyOf, genreById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { makeAct } from '../people';
import { addStress, relieveLong } from '../stress17';
import type { Appearance, GameState } from '../types';
import { fmtL, money, notify } from '../util';
import { signToBestRival } from '../worldgen';
import { addKid, life, playerPerson } from './life';
import { love17, playerFame } from './love17';
import { ownerOf } from './people/owner';
import { persona } from './persona';
import { registerSituation } from './situations17';

export type Temper17 = 'calm' | 'rebel' | 'artsy' | 'studious' | 'social';
export const TEMPER17: Record<Temper17, L> = {
  calm: l('tranquilo(a)', 'easygoing'), rebel: l('rebelde', 'rebellious'), artsy: l('artístico(a)', 'artsy'), studious: l('estudioso(a)', 'studious'), social: l('popular', 'popular'),
};
export type Path17 = 'music' | 'label' | 'other' | 'estranged' | 'rival';
export const PATH17: Record<Path17, L> = {
  music: l('quer ser artista', 'wants to be an artist'), label: l('quer trabalhar no selo (herdeiro)', 'wants to work at the label (heir)'), other: l('seguiu outra profissão', 'chose another profession'),
  estranged: l('afastado(a) da família', 'estranged from the family'), rival: l('assinou com a concorrência', 'signed with the competition'),
};
export interface Kid17 { reb: number; stu: number; art: number; soc: number; grade: number; skin: number; hair: number; inh: string[]; path?: Path17; ev?: number; band?: 1; hist: [number, L][] }
export interface Kids17State { k: Record<string, Kid17>; pend?: { key: string; ev: string }; start?: 1 }
declare module '../ext4' { interface Ext4 { kids17: Kids17State } }
const fresh = (): Kids17State => ({ k: {} });
registerExt4('kids17', fresh);
export function kids17(s: GameState): Kids17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.kids17 ??= fresh()) as Kids17State;
  st.k ??= {};
  return st;
}
export const kidKey = (k: { name: string; born: number }): string => `${k.name}|${k.born}`;
const INHERIT = ['perfect_pitch', 'charismatic', 'shy', 'rebel', 'romantic', 'spiritual', 'intellectual', 'perfectionist', 'bohemian', 'workaholic', 'calm'];

/** Perfil do filho(a): criado na primeira leitura, herdado de você e do par (determinístico pela semente). */
export function kidOf(s: GameState, k: { name: string; born: number }): Kid17 {
  const st = kids17(s);
  const key = kidKey(k);
  let x = st.k[key];
  if (x) return x;
  const r = Rng.fromSeed(`${s.config.seed}:kids17:${key}`);
  const tr = persona(s).traits;
  const pt = life(s).partner;
  const has = (t: string) => tr.includes(t);
  const look = playerPerson(s)?.look;
  x = {
    reb: clamp(r.int(25, 60) + (has('rebel') || has('bohemian') ? 12 : 0) - (has('disciplined') || has('traditional') ? 8 : 0), 0, 100),
    stu: clamp(r.int(30, 65) + (has('intellectual') || has('perfectionist') ? 10 : 0), 0, 100),
    art: clamp(r.int(25, 65) + (has('perfect_pitch') || has('visionary') ? 12 : 0) + (pt?.trait === 'artsy' ? 8 : 0), 0, 100),
    soc: clamp(r.int(30, 65) + (has('charismatic') ? 12 : has('shy') ? -10 : 0) + (pt?.trait === 'glam' ? 6 : 0), 0, 100),
    grade: 55,
    // pele e cabelo herdados (par com aparência sorteada pela semente)
    skin: clamp((look?.skin ?? r.int(0, 3)) + (r.chance(0.5) ? 0 : r.pick([-1, 1])), 0, 3),
    hair: r.chance(0.55) && look ? look.hairColor % 6 : r.int(0, 5),
    inh: tr.filter((t) => INHERIT.includes(t) && r.chance(t === 'perfect_pitch' ? 0 : 0.35)),
    hist: [],
  };
  st.k[key] = x;
  return x;
}
export function temperOf(x: Kid17): Temper17 {
  const m = Math.max(x.reb, x.stu, x.art, x.soc);
  if (m < 58) return 'calm';
  return m === x.reb ? 'rebel' : m === x.art ? 'artsy' : m === x.stu ? 'studious' : 'social';
}
export function stageOf(age: number): L {
  return age < 6 ? l('primeira infância', 'early childhood') : age < 13 ? l('idade escolar', 'school age') : age < 18 ? l('adolescência', 'adolescence') : l('adulto(a)', 'adult');
}
const note = (x: Kid17, y: number, t: L) => { x.hist.unshift([y, t]); if (x.hist.length > 12) x.hist.length = 12; };
/** Aparência herdada (usada quando o filho vira pessoa do mundo). */
export function kidLook(s: GameState, k: { name: string; born: number }, sx?: 'm' | 'f'): Appearance {
  const x = kidOf(s, k);
  const h = hashString(`${s.config.seed}:kidlook:${kidKey(k)}`);
  return { body: h % 3, face: (h >> 3) % 3, skin: x.skin, hair: 1 + ((h >> 6) % 14), hairColor: x.hair, outfit: (h >> 10) % 4, outfitColor: (h >> 13) % 8, glasses: (h >> 16) % 6 === 0, hat: false, beard: sx === 'm' && (h >> 19) % 4 === 0, ...(sx ? { sx } : {}) };
}

// ---------------------------------------------------------------- ano: crescer, mudar, escolher

registerSimHook('year', 'kids17', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:kids17y:${s.year}`);
  const o = ownerOf(s);
  const L0 = life(s);
  const L7 = love17(s);
  const st = kids17(s);
  const fame = playerFame(s);
  const divorced = L7.divW !== undefined && s.week - L7.divW < 60;
  o.kids.forEach((k, i) => {
    const x = kidOf(s, k);
    const kx = (L0.kidsX[i] ??= { edu: 'public', bond: 55 });
    const age = s.year - k.born;
    if (age < 1) return;
    const why: string[] = [];
    // personalidade muda com a casa
    if (kx.bond < 35) { x.reb += 6; why.push('vínculo baixo'); } else if (kx.bond > 70) x.reb -= 3;
    if (o.stress > 70) { x.reb += 3; why.push('casa tensa'); }
    if (divorced) { x.reb += 8; why.push('divórcio dos pais'); }
    if (fame > 40 && age >= 8) { x.soc += 3; x.reb += 2; why.push('pai/mãe famoso(a)'); }
    if (kx.edu === 'music') x.art += 4; else if (kx.edu === 'elite') x.stu += 4; else x.soc += 1;
    if (age >= 13 && age <= 17) x.reb += 4; else if (age >= 20) x.reb -= 5;
    x.reb = clamp(x.reb + r.int(-3, 3), 0, 100); x.stu = clamp(x.stu + r.int(-2, 2), 0, 100); x.art = clamp(x.art + r.int(-2, 3), 0, 100); x.soc = clamp(x.soc + r.int(-2, 2), 0, 100);
    if (age >= 6 && age < 18) x.grade = clamp(50 + (x.stu - 50) * 0.6 + (kx.bond - 50) * 0.2 + (kx.edu === 'elite' ? 12 : kx.edu === 'music' ? 4 : 0) - Math.max(0, x.reb - 50) * 0.35 + r.int(-6, 6), 0, 100);
    if (x.art > 60) k.aptitude = clamp(k.aptitude + 1.5, 0, 99);
    const before = temperOf(x);
    if (why.length && before === 'rebel' && r.chance(0.5)) note(x, s.year, fmtL(l('Mais rebelde este ano ({w}).', 'More rebellious this year ({w}).'), { w: why.join(', ') }));
    // adolescência: fase rebelde vira situação para você decidir
    if (age >= 13 && age <= 17 && x.reb > 55 && !st.pend && r.chance(0.55) && (x.ev ?? 0) < s.year && !s.config.contentFilters.includes('romance')) {
      const ev = r.weighted(['tattoo', 'party', 'runaway', 'dropout', 'band', 'arrest'] as const, (e) => e === 'band' ? x.art / 40 : e === 'arrest' ? (x.reb > 80 && !s.config.contentFilters.includes('crime') ? 0.4 : 0) : e === 'party' ? 1 + fame / 50 : e === 'dropout' ? (100 - x.grade) / 60 : 1)!;
      st.pend = { key: kidKey(k), ev };
      x.ev = s.year;
    }
    // 18: caminho
    if (age === 18 && !x.path) {
      const music = k.aptitude + x.art / 2 + (x.band ? 15 : 0);
      const label = x.stu / 2 + x.soc / 3 + kx.bond / 2;
      if (kx.bond < 22) x.path = 'estranged';
      else if (music >= 95 && kx.bond < 38) x.path = 'rival';
      else if (music >= 85) x.path = 'music';
      else if (label >= 85) x.path = 'label';
      else x.path = 'other';
      if (x.path === 'label') k.aptitude = clamp(k.aptitude + 8, 0, 99);
      if (x.path === 'rival' && !kx.actId) {
        const g = GENRES.filter((gg) => gg.born <= s.year && ['pop', 'rock', 'hiphop', 'electronic', 'rnb'].includes(familyOf(gg.id)));
        const genre = g.length ? r.pick(g).id : 'pop';
        const act = makeAct(s, r, { genre, city: s.config.homeCity, members: 1, potential: clamp(k.aptitude + 5, 20, 95), formed: s.year, debutYear: s.year, fame: clamp(fame / 4, 0, 18), name: k.name });
        const p = s.persons[act.members[0]];
        if (p) { p.born = k.born; p.parentId = o.personId; p.look = kidLook(s, k); }
        signToBestRival(s, r, act);
        kx.actId = act.id;
        emitFact(s, { kind: 'signing', actors: [act.id, ...(act.owner ? [act.owner] : []), 'player'], place: s.config.homeCity, severity: 45, visibility: 'public', tags: ['family', 'bad'], text: fmtL(l('{k}, filho(a) de {o}, estreia — pelo selo rival.', '{k}, {o}\'s child, debuts — on a rival label.'), { k: k.name, o: o.name }), src: 'kids17' });
      }
      const t = fmtL(l('{k} fez 18 anos e {p}.', '{k} turned 18 and {p}.'), { k: k.name, p: PATH17[x.path] });
      note(x, s.year, t);
      notify(s, t, x.path === 'rival' || x.path === 'estranged' ? 'bad' : 'info');
    }
    if (temperOf(x) !== before) note(x, s.year, fmtL(l('Mudou: de {a} para {b}.', 'Changed: from {a} to {b}.'), { a: TEMPER17[before], b: TEMPER17[temperOf(x)] }));
  });
});
// filho(a) que estreia pelo selo herda a aparência
registerSimHook('month', 'kids17look', (s) => {
  const o = ownerOf(s);
  o.kids.forEach((k, i) => {
    const id = life(s).kidsX[i]?.actId;
    const p = id ? s.persons[s.acts[id]?.members[0] ?? ''] : undefined;
    if (p && !p.look) p.look = kidLook(s, k);
  });
});

// ---------------------------------------------------------------- adolescência: cartão de decisão

const EV: Record<string, [L, L]> = {
  tattoo: [l('apareceu com uma tatuagem enorme', 'showed up with a huge tattoo'), l('Nada grave, mas a casa ferveu.', 'Nothing serious, but the house boiled over.')],
  party: [l('foi fotografado(a) numa festa de madrugada', 'was photographed at an all-night party'), l('Com sobrenome famoso, vira nota de tabloide.', 'With a famous surname, it becomes a tabloid item.')],
  runaway: [l('fugiu de casa por dois dias', 'ran away from home for two days'), l('Voltou, mas algo quebrou.', 'Came back, but something broke.')],
  dropout: [l('quer largar a escola', 'wants to drop out of school'), l('As notas despencaram.', 'Grades collapsed.')],
  band: [l('montou uma banda na garagem', 'started a garage band'), l('Barulho todo dia — e talento.', 'Noise every day — and talent.')],
  arrest: [l('passou a noite na delegacia', 'spent the night at the police station'), l('Pichação e briga; o advogado resolve, a imprensa fareja.', 'Graffiti and a fight; the lawyer handles it, the press sniffs around.')],
};
const pendKid = (s: GameState) => { const p = kids17(s).pend; if (!p) return null; const i = ownerOf(s).kids.findIndex((k) => kidKey(k) === p.key); return i < 0 ? null : { i, k: ownerOf(s).kids[i], ev: p.ev }; };
const close = (s: GameState) => { kids17(s).pend = undefined; };
registerSituation({
  id: 'teen17', pressure: 'heart', cost: 1, cooldown: 3, playerOnly: true,
  when: (s) => !!pendKid(s),
  actorsPick: (s) => { const p = pendKid(s); if (!p) { close(s); return null; } return { hero: 'player', cast: {}, data: { i: p.i, ev: p.ev } }; },
  title: (s, c) => fmtL(l('{k} {e}', '{k} {e}'), { k: ownerOf(s).kids[Number(c.data.i)]?.name ?? '?', e: EV[String(c.data.ev)]?.[0] ?? l('aprontou', 'acted out') }),
  text: (s, c) => { const k = ownerOf(s).kids[Number(c.data.i)]; const x = kidOf(s, k); return fmtL(l('{t} {k} tem {a} anos, temperamento {p} (rebeldia {r}/100, notas {g}/100).', '{t} {k} is {a}, {p} temperament (rebellion {r}/100, grades {g}/100).'), { t: EV[String(c.data.ev)]?.[1] ?? '', k: k.name, a: s.year - k.born, p: TEMPER17[temperOf(x)], r: Math.round(x.reb), g: Math.round(x.grade) }); },
  options: [
    { id: 'strict', label: l('Pulso firme (castigo / internato)', 'Firm hand (grounded / boarding school)'), hint: l('Rebeldia −12, notas +8; vínculo −12.', 'Rebellion −12, grades +8; bond −12.'),
      apply: (s, c) => { const i = Number(c.data.i); const k = ownerOf(s).kids[i]; const x = kidOf(s, k); x.reb = clamp(x.reb - 12, 0, 100); x.grade = clamp(x.grade + 8, 0, 100); const kx = life(s).kidsX[i]; if (kx) kx.bond = clamp(kx.bond - 12, 0, 100); note(x, s.year, l('Castigo pesado.', 'Heavy punishment.')); close(s); } },
    { id: 'talk', label: l('Conversar + terapia familiar', 'Talk + family therapy'), hint: l('Custa $800 (era) e 1 de tempo livre: rebeldia −6, vínculo +8, seu estresse −5.', 'Costs $800 (era) and 1 free time: rebellion −6, bond +8, your stress −5.'),
      apply: (s, c) => { const i = Number(c.data.i); const k = ownerOf(s).kids[i]; const x = kidOf(s, k); ownerOf(s).wealth -= money(s, 800); x.reb = clamp(x.reb - 6, 0, 100); const kx = life(s).kidsX[i]; if (kx) kx.bond = clamp(kx.bond + 8, 0, 100); const pp = playerPerson(s); if (pp) relieveLong(s, pp.id, 5); note(x, s.year, l('Terapia em família.', 'Family therapy.')); close(s); } },
    { id: 'free', label: l('Deixar viver a fase', 'Let them live it'), hint: l('Rebeldia +5, vínculo +4. Banda: talento +6. Festa/delegacia: boato se você for famoso(a).', 'Rebellion +5, bond +4. Band: talent +6. Party/arrest: rumor if you are famous.'),
      apply: (s, c) => {
        const i = Number(c.data.i); const k = ownerOf(s).kids[i]; const x = kidOf(s, k); const ev = String(c.data.ev);
        x.reb = clamp(x.reb + 5, 0, 100); const kx = life(s).kidsX[i]; if (kx) kx.bond = clamp(kx.bond + 4, 0, 100);
        if (ev === 'band') { k.aptitude = clamp(k.aptitude + 6, 0, 99); x.art = clamp(x.art + 10, 0, 100); x.band = 1; }
        if (ev === 'dropout') x.grade = clamp(x.grade - 20, 0, 100);
        if ((ev === 'party' || ev === 'arrest') && playerFame(s) >= 25) {
          emitFact(s, { kind: ev === 'arrest' ? 'arrest' : 'statement', actors: ['player'], place: s.config.homeCity, severity: ev === 'arrest' ? 40 : 30, visibility: 'rumor', tags: ['family', 'bad'], text: fmtL(l('Filho(a) de {o}, {k} {e}.', '{o}\'s child {k} {e}.'), { o: ownerOf(s).name, k: k.name, e: EV[ev][0] }), src: 'kids17' });
          const pp = playerPerson(s); if (pp) addStress(s, pp.id, 6, l('Filho(a) no tabloide', 'Child in the tabloids'));
        }
        note(x, s.year, EV[ev]?.[0] ?? l('Fase.', 'Phase.')); close(s);
      } },
  ],
});

// ---------------------------------------------------------------- começar o jogo com filhos e estado civil

registerSimHook('newgame', 'kids17', (s) => {
  const spec = s.config.character;
  const n = clamp(Math.round(spec?.kids ?? 0), 0, 4);
  const mar = spec?.marital ?? 'single';
  if (!spec || (!n && mar === 'single')) return;
  const r = Rng.fromSeed(`${s.config.seed}:kids17:start`);
  const o = ownerOf(s);
  const L0 = life(s);
  const L7 = love17(s);
  const age = s.year - o.born;
  const maxKid = Math.max(0, Math.min(age - 18, 26));
  const ages = Array.from({ length: maxKid >= 0 ? n : 0 }, () => r.int(0, maxKid)).sort((a, b) => b - a);
  for (const a of ages) {
    addKid(s, r, false);
    const k = o.kids[o.kids.length - 1];
    k.born = s.year - a;
    k.aptitude = clamp(k.aptitude + a * 0.4, 0, 99);
    const kx = L0.kidsX[o.kids.length - 1];
    if (kx) kx.bond = mar === 'divorced' ? 45 : mar === 'widowed' ? 70 : 60;
  }
  const yrs = Math.max(1, Math.min(age - 20, (ages[0] ?? r.int(1, 6)) + r.int(1, 3)));
  const pname = `${r.pick(['Helena', 'Clara', 'Rita', 'Joana', 'Susan', 'Grace', 'Marco', 'Pedro', 'Daniel', 'Victor', 'Lena', 'Sam'])} ${r.pick(['Alves', 'Prado', 'Reed', 'Brooks', 'Moreau', 'Lopes'])}`;
  if (mar === 'married') {
    L0.partner = { name: pname, born: o.born + r.int(-4, 4), job: l('companheiro(a) de longa data', 'long-time partner'), trait: r.pick(['homebody', 'practical', 'artsy', 'zen', 'glam']), affinity: 62, since: s.week - yrs * 52, stage: 'married', lastDate: s.week };
    o.spouse = pname;
    L7.mw = s.week - yrs * 52; L7.pname = pname; L7.pk = L0.partner.since;
  } else if (mar === 'divorced') {
    L7.exes.push({ name: pname, born: o.born + r.int(-4, 4), aff: 35, w: s.week - r.int(1, 4) * 52, married: 1 });
    for (const k of o.kids) if (s.year - k.born < 18) L7.pay.push({ kind: 'child', to: pname, amt: Math.round(money(s, 220) + Math.max(0, o.wealth) * 0.0006), until: k.born + 18, kid: k.name });
  } else if (mar === 'widowed') {
    o.stress = clamp(o.stress + 12, 0, 100);
    const pp = playerPerson(s);
    if (pp) addStress(s, pp.id, 10, l('Luto pelo cônjuge', 'Grieving a spouse'));
    L7.log.unshift([s.year, fmtL(l('Você perdeu {p} há pouco tempo.', 'You lost {p} not long ago.'), { p: pname })]);
  }
  kids17(s).start = 1;
});

export const genreOk17 = (s: GameState, g: string): boolean => !!genreById[g] && genreById[g].born <= s.year;
