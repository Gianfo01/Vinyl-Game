// O dono do selo como personagem (FIFA Manager / Crusader Kings III): atributos (ouvido, negociação,
// carisma, gestão), estresse, saúde, família, patrimônio pessoal separado da empresa (retirada e
// aporte com categoria própria no extrato), casas por era, envelhecimento e sucessão.
// Atributos dão bônus reais: negociação na Mesa de negociação e nos pedidos de aumento; ouvido
// estreita o erro dos relatórios de olheiros; carisma suaviza crises e soma apelo; gestão segura a equipe.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { queueCutscene, registerMod, registerSimHook } from '../../ext4';
import { personName, langForCity } from '../../people';
import type { GameState } from '../../types';
import { fmtL, money, notify, post, remember } from '../../util';
import { P, clamp01, type Owner } from './state';

export type OwnerAttr = keyof Owner['attrs'];

export const ATTR_NAME: Record<OwnerAttr, L> = {
  ear: l('Ouvido', 'Ear'),
  negotiation: l('Negociação', 'Negotiation'),
  charisma: l('Carisma', 'Charisma'),
  management: l('Gestão', 'Management'),
};

export const ATTR_DESC: Record<OwnerAttr, L> = {
  ear: l('Relatórios de olheiros mais precisos.', 'Sharper scouting reports.'),
  negotiation: l('Mais paciência e concessões na Mesa de negociação; aumentos mais baratos.', 'More patience and concessions at the negotiating table; cheaper raises.'),
  charisma: l('Crises mais brandas, apelo dos lançamentos e elogios que pegam.', 'Milder crises, release appeal and praise that lands.'),
  management: l('Equipe mais leal e dono menos estressado.', 'More loyal staff and a less stressed owner.'),
};

export interface HouseDef {
  id: string;
  name: L;
  from: number;
  to: number;
  price: number; // dólares reais
  relief: number; // estresse a menos por mês
  prestige: number;
}

export const HOUSES: HouseDef[] = [
  { id: 'apartment', name: l('Apartamento no centro', 'Downtown apartment'), from: 1920, to: 2040, price: 30000, relief: 2, prestige: 1 },
  { id: 'artdeco', name: l('Mansão art déco', 'Art deco mansion'), from: 1920, to: 1960, price: 220000, relief: 5, prestige: 4 },
  { id: 'suburb', name: l('Casa no subúrbio', 'Suburban house'), from: 1946, to: 2040, price: 70000, relief: 3, prestige: 2 },
  { id: 'modernist', name: l('Casa modernista com piscina', 'Modernist house with pool'), from: 1955, to: 2040, price: 380000, relief: 6, prestige: 5 },
  { id: 'ranch', name: l('Rancho com estúdio caseiro', 'Ranch with home studio'), from: 1965, to: 2040, price: 900000, relief: 7, prestige: 6 },
  { id: 'loft', name: l('Loft industrial', 'Industrial loft'), from: 1975, to: 2040, price: 320000, relief: 5, prestige: 4 },
  { id: 'penthouse', name: l('Cobertura com vista', 'Penthouse with a view'), from: 1982, to: 2040, price: 1200000, relief: 7, prestige: 7 },
  { id: 'smart', name: l('Casa inteligente', 'Smart home'), from: 2015, to: 2040, price: 1800000, relief: 8, prestige: 8 },
];

export function availableHouses(s: GameState): HouseDef[] {
  return HOUSES.filter((h) => s.year >= h.from && s.year <= h.to);
}

function makeOwner(s: GameState, r: Rng, gen = 1): Owner {
  const role = s.config.role;
  const base = () => r.int(38, 58);
  const attrs = { ear: base(), negotiation: base(), charisma: base(), management: base() };
  if (role === 'artist' || role === 'hybrid') attrs.ear += 8;
  if (role === 'manager') attrs.negotiation += 8;
  if (role === 'publisher') attrs.management += 8;
  if (role === 'label') attrs.charisma += 4;
  return {
    name: personName(r, langForCity(s.config.homeCity, r)),
    born: s.year - r.int(28, 38),
    attrs,
    xp: { ear: 0, negotiation: 0, charisma: 0, management: 0 },
    stress: 25,
    health: 90,
    wealth: money(s, 8000),
    salary: 0,
    house: -1,
    kids: [],
    generation: gen,
    since: s.year,
    retired: [],
  };
}

export function ownerOf(s: GameState, r?: Rng): Owner {
  const st = P(s);
  if (!st.owner) {
    // saves antigos: dono criado sem consumir a semente (gerador local)
    let h = 0;
    for (const ch of s.config.seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const local = r ?? ({
      int: (a: number, b: number) => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 1) >>> 0; return a + (h % (b - a + 1)); },
      pick: <T>(arr: readonly T[]) => { h = (Math.imul(h ^ (h >>> 13), 3266489909) + 7) >>> 0; return arr[h % arr.length]; },
      chance: () => false,
      float: (a: number) => a,
      next: () => 0.5,
      normal: (m: number) => m,
    } as unknown as Rng);
    st.owner = makeOwner(s, local);
  }
  return st.owner;
}

/** Bônus de −1..+0,9 a partir do atributo (50 = neutro). */
export function ownerBonus(s: GameState, a: OwnerAttr): number {
  const o = P(s).owner;
  if (!o) return 0;
  return (o.attrs[a] - 50) / 50;
}

export function ownerAge(s: GameState): number {
  return s.year - ownerOf(s).born;
}

export function gainXp(s: GameState, a: OwnerAttr, n: number): void {
  const o = P(s).owner;
  if (!o) return;
  o.xp[a] += n;
  while (o.xp[a] >= 10) {
    o.xp[a] -= 10;
    if (o.attrs[a] < 95) o.attrs[a] += 1;
  }
}

// ---------------------------------------------------------------- ações do dono

export function setSalary(s: GameState, realDollars: number): L | null {
  const o = ownerOf(s);
  o.salary = money(s, Math.max(0, Math.min(50000, realDollars)));
  return null;
}

/** Retirada extra (empresa → patrimônio pessoal). */
export function withdraw(s: GameState, amount: number): L | null {
  const o = ownerOf(s);
  if (amount <= 0) return l('Valor inválido.', 'Invalid amount.');
  if (s.player.cash < amount) return l('A empresa não tem esse caixa.', 'The company does not have that cash.');
  post(s, `ownerdraw:${s.week}`, -amount, 'owner_draw', 'Retirada do dono');
  o.wealth += amount;
  s.player.reputation.artists = clamp01(s.player.reputation.artists - Math.min(3, amount / Math.max(1, money(s, 50000))));
  return null;
}

/** Aporte (patrimônio pessoal → empresa). */
export function invest(s: GameState, amount: number): L | null {
  const o = ownerOf(s);
  if (amount <= 0) return l('Valor inválido.', 'Invalid amount.');
  if (o.wealth < amount) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  post(s, `ownerinvest:${s.week}`, amount, 'owner_draw', 'Aporte do dono');
  o.wealth -= amount;
  return null;
}

export function buyHouse(s: GameState, id: string): L | null {
  const o = ownerOf(s);
  const idx = HOUSES.findIndex((x) => x.id === id);
  const def = HOUSES[idx];
  if (!def || s.year < def.from || s.year > def.to) return l('Casa indisponível nesta época.', 'House not available in this era.');
  if (o.house === idx) return l('Você já mora aqui.', 'You already live here.');
  const resale = o.house >= 0 ? Math.round(money(s, HOUSES[o.house].price) * 0.7) : 0;
  const price = money(s, def.price);
  if (o.wealth + resale < price) return l('Patrimônio pessoal insuficiente (a casa sai do seu bolso, não da empresa).', 'Not enough personal wealth (the house comes out of your pocket, not the company).');
  o.wealth += resale - price;
  o.house = idx;
  o.stress = clamp01(o.stress - 10);
  remember(s, 'owner_house', fmtL(l('{o} se muda: {h}.', '{o} moves into: {h}.'), { o: o.name, h: def.name }));
  return null;
}

export function vacation(s: GameState): L | null {
  const o = ownerOf(s);
  if (o.vacationUntil && o.vacationUntil > s.week) return l('Já está de férias.', 'Already on vacation.');
  const cost = money(s, 1500 + o.kids.length * 300);
  if (o.wealth < cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  o.wealth -= cost;
  o.vacationUntil = s.week + 3;
  o.stress = clamp01(o.stress - 25);
  o.health = clamp01(o.health + 3);
  return null;
}

/** Curso pessoal: paga do bolso, ganha experiência num atributo. */
export function ownerCourse(s: GameState, a: OwnerAttr): L | null {
  const o = ownerOf(s);
  const cost = money(s, 2500);
  if (o.wealth < cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  if (s.flags[`ownercourse:${a}`] && s.week - s.flags[`ownercourse:${a}`] < 26) return l('Um curso por atributo a cada seis meses.', 'One course per attribute every six months.');
  o.wealth -= cost;
  s.flags[`ownercourse:${a}`] = s.week;
  gainXp(s, a, 25);
  o.stress = clamp01(o.stress + 4);
  return null;
}

export function setHeir(s: GameState, heir: string | undefined): L | null {
  const o = ownerOf(s);
  if (heir?.startsWith('kid:')) {
    const k = o.kids[Number(heir.slice(4))];
    if (!k) return l('Herdeiro inválido.', 'Invalid heir.');
    if (s.year - k.born < 18) return l('Precisa ter 18 anos ou mais.', 'Must be 18 or older.');
  } else if (heir?.startsWith('staff:')) {
    if (!s.player.staff.some((x) => x.id === heir.slice(6))) return l('Funcionário inválido.', 'Invalid staff member.');
  }
  o.heir = heir;
  return null;
}

/** Passa o selo adiante (aposentadoria voluntária ou morte). */
export function succession(s: GameState, r: Rng, reason: 'retire' | 'death' | 'health'): void {
  const st = P(s);
  const old = ownerOf(s);
  let next: Owner;
  const heir = old.heir;
  if (heir?.startsWith('kid:') && old.kids[Number(heir.slice(4))] && s.year - old.kids[Number(heir.slice(4))].born >= 18) {
    const k = old.kids[Number(heir.slice(4))];
    next = makeOwner(s, r, old.generation + 1);
    next.name = k.name;
    next.born = k.born;
    next.since = s.year;
    for (const a of Object.keys(next.attrs) as OwnerAttr[]) next.attrs[a] = Math.round(old.attrs[a] * 0.4 + k.aptitude * 0.4 + next.attrs[a] * 0.2);
    next.wealth = Math.round(old.wealth * 0.7); // imposto de herança
    next.house = old.house;
  } else if (heir?.startsWith('staff:') && s.player.staff.some((x) => x.id === heir.slice(6))) {
    const sf = s.player.staff.find((x) => x.id === heir.slice(6))!;
    next = makeOwner(s, r, old.generation + 1);
    next.name = sf.name;
    const boost = Math.round((sf.skill - 50) / 2);
    const key: OwnerAttr = sf.role === 'anr' || sf.role === 'producer' ? 'ear' : sf.role === 'legal' || sf.role === 'manager' ? 'negotiation' : sf.role === 'publicist' ? 'charisma' : 'management';
    next.attrs[key] = clamp01(next.attrs[key] + 10 + boost, 10, 95);
    next.wealth = money(s, 5000);
    s.player.staff = s.player.staff.filter((x) => x !== sf);
  } else {
    next = makeOwner(s, r, old.generation + 1);
    next.wealth = money(s, 3000);
    s.player.reputation.institutional = clamp01(s.player.reputation.institutional - 5);
  }
  next.retired = [...(old.retired ?? []), { name: old.name, years: `${old.since ?? old.born + 30}–${s.year}` }].slice(-6);
  st.owner = next;
  const why = reason === 'death' ? l('morreu', 'died') : reason === 'health' ? l('se afastou por saúde', 'stepped down for health reasons') : l('se aposentou', 'retired');
  const text = fmtL(l('{o} {w}. {n} assume o comando de {c}.', '{o} {w}. {n} takes over {c}.'), { o: old.name, w: why, n: next.name, c: s.config.companyName });
  remember(s, 'succession', text, { important: true });
  notify(s, text, 'event');
  queueCutscene(s, 'people_succession', { title: l('Sucessão', 'Succession'), text, old: old.name, next: next.name });
}

// ---------------------------------------------------------------- mês

export function ownerMonth(s: GameState, r: Rng, signedBefore: number): void {
  const o = ownerOf(s, r);
  const st = P(s);
  const age = s.year - o.born;
  // salário (retirada) e custo de vida
  if (o.salary > 0) {
    // a retirada só sai se a empresa aguentar seis meses dela
    if (s.player.cash > o.salary * 6) {
      post(s, 'owner_salary', -o.salary, 'owner_draw', 'Retirada do dono');
      o.wealth += o.salary;
    } else o.stress = clamp01(o.stress + 3);
  }
  const house = o.house >= 0 ? HOUSES[o.house] : undefined;
  o.wealth -= money(s, 200 + o.kids.length * 120 + (house ? house.price * 0.001 : 150) + (o.spouse ? 100 : 0));
  // estresse e saúde
  let ds = 0;
  if (s.player.cash < 0) ds += 6;
  ds += Math.min(4, s.decisions.length);
  ds += Math.min(4, s.crises.filter((c) => !c.resolved).length * 2);
  ds += st.breakdowns.filter((b) => s.week - b.week < 5).length * 2;
  if (o.wealth < 0) ds += 4;
  ds -= 3 + (house?.relief ?? 0) + ownerBonus(s, 'management') * 3;
  if (o.vacationUntil && o.vacationUntil > s.week) ds -= 10;
  o.stress = clamp01(o.stress + ds);
  o.health = clamp01(o.health + (o.stress > 70 ? -1.5 : o.stress < 35 ? 0.4 : 0) - (age > 55 ? (age - 55) * 0.06 : 0));
  // experiência
  if (s.player.stats.signed > signedBefore) gainXp(s, 'ear', 4 * (s.player.stats.signed - signedBefore));
  if (s.player.staff.length >= 3) gainXp(s, 'management', 1);
  if (house && HOUSES[o.house].id === 'ranch') gainXp(s, 'ear', 1);
  if (age > 66 && r.chance(0.1)) {
    const a = r.pick(['ear', 'charisma', 'management'] as OwnerAttr[]);
    o.attrs[a] = Math.max(10, o.attrs[a] - 1);
  }
  // família (sem personagem criado: a vida segue sozinha; com personagem, o jogador decide)
  if (!o.personId && !o.spouse && age >= 24 && age <= 50 && r.chance(0.015)) {
    o.spouse = personName(r, langForCity(s.config.homeCity, r));
    remember(s, 'owner_family', fmtL(l('{o} se casa com {p}.', '{o} marries {p}.'), { o: o.name, p: o.spouse }));
  }
  if (!o.personId && o.spouse && age <= 46 && o.kids.length < 3 && r.chance(0.012)) {
    const k = { name: personName(r, langForCity(s.config.homeCity, r)), born: s.year, aptitude: r.int(25, 85) };
    o.kids.push(k);
    remember(s, 'owner_family', fmtL(l('Nasce {k}, filho(a) de {o}.', '{k} is born to {o}.'), { k: k.name, o: o.name }));
  }
  // ouvido do dono: relatórios com menos viés
  const ear = ownerBonus(s, 'ear');
  if (ear > 0) for (const k of Object.values(s.knowledge)) k.bias *= 1 - ear * 0.08;
  // fim da linha: saúde, idade ou morte
  if (o.health <= 0 || (age > 72 && r.chance((age - 72) * 0.004))) succession(s, r, o.health <= 0 && age < 72 ? 'health' : 'death');
  else if (o.health < 15) notify(s, fmtL(l('A saúde de {o} preocupa. Escolha um sucessor.', '{o}\'s health is worrying. Choose a successor.'), { o: o.name }), 'bad');
}

registerSimHook('newgame', 'people-owner', (s, r) => {
  ownerOf(s, r);
});

/** Carisma: crises novas chegam mais brandas (ou mais fortes, com dono antipático). */
registerSimHook('week', 'people-owner', (s) => {
  const st = P(s);
  if (!st.owner) return;
  const ch = ownerBonus(s, 'charisma');
  for (const c of s.crises) {
    if (st.seenCrises[c.id]) continue;
    st.seenCrises[c.id] = 1;
    c.severity = Math.round(clamp01(c.severity * (1 - ch * 0.2)));
    gainXp(s, 'charisma', 2);
  }
  const keys = Object.keys(st.seenCrises);
  if (keys.length > 80) for (const k of keys.slice(0, keys.length - 80)) delete st.seenCrises[k];
});

registerMod('appeal', 'people-owner', (s, value, ctx) => {
  if (!ctx.release || ctx.release.owner !== 'player' || !P(s).owner) return null;
  const ch = ownerBonus(s, 'charisma');
  if (Math.abs(ch) < 0.1) return null;
  return { value: value * (1 + ch * 0.03), label: l('Carisma do dono', 'Owner charisma') };
});
