// Eventos extras (expansão de conteúdo): eras 1920–59 e 2030–40, geopolítica e censura,
// crises de mídia e cancelamento, rituais de fandom, eras tecnológicas, acidentes de palco,
// marcas e sync, processos, família, conflitos de banda, espionagem de rivais e críticos com viés.
//
// Só `import type` de './events' (apagado na compilação): sem ciclo em tempo de execução.
// Regras: find() só lê o estado (nunca muta); a ÚLTIMA opção é a mais neutra (é a padrão
// e a aplicada quando o evento é filtrado); tags sensíveis sempre com `act` no contexto
// para a regra RS funcionar.

import type { Ctx, EventDef } from './events';
import { clamp, type Rng } from '../core/rng';
import { FESTIVALS } from '../data/catalog';
import { AWARDS, BRANDS, CRITICS, MOVEMENTS, PRODUCERS, censorshipIn, displayName, geoActive, outletById } from '../data/content';
import { CITIES, cityById, familyOf, genreById, l, type FamilyId, type MarketId } from '../data/world';
import { langForCity, makePerson } from './people';
import type { Act, GameState, Person, Release } from './types';
import { fmtL, hasTech, money, notify, playerActs, post, remember, staffSkill, type Param } from './util';
import { scandal } from './scandal17';
import { actsTouched17 } from './actidx17';

type Opt = EventDef['options'][number];
type Apply = Opt['apply'];
type Find = NonNullable<EventDef['find']>;

// ---------- construtores ----------
const o = (id: string, pt: string, en: string, apply: Apply, hint?: [string, string]): Opt =>
  ({ id, label: l(pt, en), hint: hint ? l(hint[0], hint[1]) : undefined, apply });

function E(
  id: string, cat: EventDef['cat'], tone: EventDef['tone'], tags: string[], cooldown: number, find: Find,
  title: [string, string], text: [string, string], options: Opt[], weight = 0.7,
): EventDef {
  return { id, cat, tone, tags, cooldown, weight, find, title: l(title[0], title[1]), text: l(text[0], text[1]), options };
}

const noop: Apply = () => {};

// ---------- leitura de estado ----------
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter(Boolean);
const pick = (s: GameState, r: Rng, f: (a: Act) => boolean = () => true): Act | undefined => {
  const list = mine(s).filter(f);
  return list.length ? r.pick(list) : undefined;
};
const crew = (s: GameState, a: Act): Person[] => a.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
const fam = (a: Act): FamilyId => familyOf(a.genre);
const mkt = (a: Act): MarketId => cityById[a.city]?.market ?? 'na';
const era = (s: GameState, from: number, to: number) => s.year >= from && s.year <= to;
// Caches por semana: o diretor chama find() de todos os eventos várias vezes por mês;
// varrer milhares de lançamentos/memórias em cada chamada deixaria a simulação lenta.
let relCache: { s: GameState; week: number; seq: number; list: Release[] } | null = null;
const playerRels = (s: GameState): Release[] => {
  if (!relCache || relCache.s !== s || relCache.week !== s.week || relCache.seq !== s.idSeq) {
    relCache = { s, week: s.week, seq: s.idSeq, list: Object.values(s.releases).filter((x) => x.owner === 'player' || s.acts[x.actId]?.playerBand) };
  }
  return relCache.list;
};
const myRels = (s: GameState, f: (x: Release) => boolean = () => true): Release[] => playerRels(s).filter((x) => s.releases[x.id] === x && f(x));
let gigCache: { s: GameState; week: number; n: number; last: Record<string, number> } | null = null;
const recentGig = (s: GameState, a: Act, weeks = 8) => {
  if (!gigCache || gigCache.s !== s || gigCache.week !== s.week || gigCache.n !== s.memory.length) {
    const last: Record<string, number> = {};
    for (const m of s.memory) if (m.kind === 'gigs' && m.actId && (last[m.actId] ?? -1) < m.week) last[m.actId] = m.week;
    gigCache = { s, week: s.week, n: s.memory.length, last };
  }
  const w = gigCache.last[a.id];
  return w !== undefined && s.week - w < weeks;
};
const isLabel = (s: GameState) => s.config.role !== 'artist';
const active = (a: Act) => a.status === 'active' || a.status === 'emerging';
const traitIn = (s: GameState, a: Act, t: string) => crew(s, a).some((p) => p.traits.includes(t));
const ambitionIn = (s: GameState, a: Act, amb: string) => crew(s, a).some((p) => p.ambition === amb);
const lead = (s: GameState, a: Act): Person | undefined =>
  [...crew(s, a)].sort((x, y) => (y.traits.includes('big_ego') ? 20 : 0) + y.skills.comp + y.skills.stage - ((x.traits.includes('big_ego') ? 20 : 0) + x.skills.comp + x.skills.stage))[0];
const geoIn = (s: GameState, a: Act) => geoActive(s.year, mkt(a));
const withinFlag = (s: GameState, k: string, weeks: number) => s.flags[k] !== undefined && s.week - s.flags[k] < weeks;

// ---------- efeitos ----------
const A = (s: GameState, c: Ctx) => s.acts[String(c.act)];
const P = (s: GameState, c: Ctx) => s.persons[String(c.person)];
const pay = (s: GameState, key: string, real: number, cat: string, memo: string) => post(s, key, -money(s, real), cat, memo);
const gain = (s: GameState, key: string, real: number, cat: string, memo: string) => post(s, key, money(s, real), cat, memo);
const rep = (s: GameState, k: keyof GameState['player']['reputation'], v: number) => {
  s.player.reputation[k] = clamp(s.player.reputation[k] + v, 0, 100);
};
const fame = (a: Act, v: number) => { a.fame = clamp(a.fame + v, 0, 100); };
const mom = (a: Act, v: number) => { a.momentum = clamp(a.momentum + v, 0, 100); };
const trust = (a: Act, v: number) => { a.trust = clamp(a.trust + v, 0, 100); };
const fans = (a: Act, casual: number, active = 0, core = 0) => {
  a.fans.casual = Math.max(0, Math.round(a.fans.casual + casual));
  a.fans.active = Math.max(0, Math.round(a.fans.active + active));
  a.fans.core = Math.max(0, Math.round(a.fans.core + core));
};
const fansMul = (a: Act, casual: number, active = 1, core = 1) => {
  a.fans.casual = Math.round(a.fans.casual * casual);
  a.fans.active = Math.round(a.fans.active * active);
  a.fans.core = Math.round(a.fans.core * core);
};
const mood = (s: GameState, a: Act, k: 'morale' | 'fatigue' | 'stress' | 'inspiration' | 'resentment', v: number) => {
  for (const p of crew(s, a)) p[k] = clamp(p[k] + v, 0, 100);
};
const pmood = (p: Person | undefined, k: 'morale' | 'fatigue' | 'stress' | 'inspiration' | 'resentment', v: number) => {
  if (p) p[k] = clamp(p[k] + v, 0, 100);
};
const hiatus = (s: GameState, a: Act, weeks: number) => {
  a.hiatusUntil = s.week + weeks;
  a.status = 'hiatus';
};
const legal = (s: GameState, base: number) => (staffSkill(s, 'legal') ? Math.round(base * 0.35) : base);
const winOdds = (s: GameState, base: number) => clamp(base + staffSkill(s, 'legal') / 200, 0.05, 0.9);
/** Receita de marca/sync dividida entre selo e artista (banda do jogador recebe tudo). */
const split = (s: GameState, a: Act, key: string, real: number, cat: string, memo: string, labelShare = 0.5) => {
  if (a.playerBand) gain(s, key, real, cat, memo);
  else {
    gain(s, key, real * labelShare, cat, memo);
    a.cash += money(s, real * (1 - labelShare));
  }
};
const feeBy = (a: Act, base: number, perFame: number, cap: number) => Math.round(Math.min(cap, base + a.fame * perFame));
const log = (s: GameState, kind: string, pt: string, en: string, params: Record<string, Param> = {}, actId?: string, important = false) =>
  remember(s, kind, fmtL(l(pt, en), params), { actId, important });
const appeal = (s: GameState, c: Ctx, m: number) => { const rel = s.releases[String(c.release)]; if (rel) rel.appeal *= m; };
const latestRel = (s: GameState, a: Act, weeks = 26): Release | undefined =>
  myRels(s, (x) => x.actId === a.id && s.week - x.week < weeks).sort((x, y) => y.week - x.week)[0];
const signal = (s: GameState, r: Rng, actId: string, degree = 1) => {
  if (!isLabel(s) || s.knowledge[actId]) return;
  s.knowledge[actId] = { actId, degree, stage: degree >= 2 ? 'monitoring' : 'signal', bias: r.normal(0, 8), updatedWeek: s.week, source: 'event' };
};

// =====================================================================================
// 1. ERAS 1920–1959
// =====================================================================================
const ERA_EARLY: EventDef[] = [
  E('shellac_breakage', 'manufacturing', 'bad', [], 10,
    (s, r) => {
      if (s.year > 1952) return null;
      const rel = myRels(s, (x) => x.formats.includes('shellac') && s.week - x.week < 8)[0];
      return rel && r.chance(0.4) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Remessa de 78 rpm quebrada', 'Broken 78 rpm shipment'],
    ['Um vagão inteiro de discos de "{releaseTitle}" chegou em cacos. Goma-laca não perdoa solavancos.', 'A whole railcar of "{releaseTitle}" records arrived in pieces. Shellac does not forgive bumps.'],
    [
      o('repress', 'Prensar de novo e embalar em palha', 'Re-press and pack in straw', (s, _r, c) => { pay(s, `shellac:${c.release}`, 900, 'release', 'Reprensagem 78'); }, ['Custo; as lojas recebem.', 'Cost; stores get stock.']),
      o('absorb', 'Absorver a perda', 'Absorb the loss', (s, _r, c) => { appeal(s, c, 0.88); }),
    ]),
  E('sheet_music_boom', 'market', 'good', [], 8,
    (s, r) => {
      if (s.year > 1955) return null;
      const rel = myRels(s, (x) => x.totalUnits > 3000 && s.week - x.week < 30)[0];
      return rel && r.chance(0.45) ? { release: rel.id, act: rel.actId, fee: Math.round(800 + Math.sqrt(rel.totalUnits) * 8) } : null;
    },
    ['Partitura de "{releaseTitle}" esgota', '"{releaseTitle}" sheet music sells out'],
    ['Pianos de sala em todo o país querem tocar "{releaseTitle}". Uma editora de Tin Pan Alley oferece {feeTxt} pela edição impressa.', 'Parlour pianos everywhere want "{releaseTitle}". A Tin Pan Alley publisher offers {feeTxt} for the printed edition.'],
    [
      o('license', 'Licenciar a partitura', 'License the sheet music', (s, _r, c) => { const a = A(s, c); split(s, a, `sheet:${c.release}`, Number(c.fee), 'publishing', 'Partitura'); fans(a, 4000, 500); }),
      o('own', 'Imprimir por conta própria', 'Print it ourselves', (s, r, c) => { pay(s, `sheetp:${c.release}`, 700, 'publishing', 'Impressão'); if (r.chance(0.6)) gain(s, `sheetg:${c.release}`, Number(c.fee) * 1.6, 'publishing', 'Venda de partituras'); }, ['Mais lucro se vender; risco de encalhe.', 'More profit if it sells; risk of unsold stock.']),
      o('pass', 'Deixar para lá', 'Let it go', noop),
    ]),
  E('radio_barn_invite', 'stage', 'good', [], 10,
    (s, r) => {
      if (!era(s, 1925, 1975)) return null;
      const a = pick(s, r, (x) => active(x) && ['country_folk', 'sacred', 'blues_jazz'].includes(fam(x)));
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['Convite do Saturday Barn Jamboree', 'Saturday Barn Jamboree invitation'],
    ['O baile de celeiro mais ouvido do rádio (≈ Grand Ole Opry) quer {act} no sábado. Tocar ali é virar "da família".', 'Radio\'s most-heard barn dance (≈ Grand Ole Opry) wants {act} on Saturday. Playing there makes you "family".'],
    [
      o('accept', 'Aceitar e ensaiar o repertório tradicional', 'Accept and rehearse the traditional set', (s, _r, c) => { const a = A(s, c); fame(a, 2.5); fans(a, 25000, 3000, 300); rep(s, 'institutional', 2); log(s, 'radio_barn', '{a} toca no Saturday Barn Jamboree.', '{a} plays the Saturday Barn Jamboree.', { a: a.name }, a.id); }),
      o('modern', 'Aceitar, mas com bateria elétrica', 'Accept, but with electric drums', (s, r, c) => { const a = A(s, c); if (r.chance(0.5)) { fame(a, 3.5); fans(a, 30000, 4000); } else { rep(s, 'institutional', -3); mom(a, -5); } }, ['Polêmico: pode virar marco ou escândalo.', 'Controversial: may become a landmark or a scandal.']),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('ballroom_battle', 'stage', 'neutral', [], 12,
    (s, r) => {
      if (!era(s, 1925, 1960)) return null;
      const a = pick(s, r, (x) => active(x) && x.members.length >= 3 && ['blues_jazz', 'latin', 'caribbean', 'pop'].includes(fam(x)));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Batalha de orquestras: {act}', 'Battle of the bands: {act}'],
    ['O Harlem Ballroom Jubilee desafia {act} contra a orquestra da casa. Os dançarinos são o júri.', 'The Harlem Ballroom Jubilee pits {act} against the house band. The dancers are the judges.'],
    [
      o('fight', 'Aceitar o duelo', 'Take the duel', (s, r, c) => {
        const a = A(s, c);
        const stage = crew(s, a).reduce((t, p) => t + p.skills.stage, 0) / Math.max(1, crew(s, a).length);
        if (r.chance(clamp(stage / 100 + a.rehearsed / 200, 0.15, 0.85))) { fame(a, 4); fans(a, 20000, 3000, 600); mood(s, a, 'morale', 10); log(s, 'battle', '{a} vence a batalha de orquestras.', '{a} wins the battle of the bands.', { a: a.name }, a.id); }
        else { mood(s, a, 'morale', -8); mom(a, -4); }
      }, ['Ensaio e palco decidem.', 'Rehearsal and stagecraft decide.']),
      o('friendly', 'Fazer uma jam amistosa', 'Make it a friendly jam', (s, _r, c) => { const a = A(s, c); fans(a, 6000, 800); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('talkie_musical', 'contract', 'good', [], 14,
    (s, r) => {
      if (!era(s, 1928, 1958)) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 12);
      return a && r.chance(0.3) ? { act: a.id, fee: feeBy(a, 3000, 120, 12000) } : null;
    },
    ['Cinema falado quer {act}', 'The talkies want {act}'],
    ['Lion Gate Pictures (≈ MGM) quer {act} num curta musical. Cachê de {feeTxt}, mas a filmagem toma um mês.', 'Lion Gate Pictures (≈ MGM) wants {act} in a musical short. Fee {feeTxt}, but filming takes a month.'],
    [
      o('accept', 'Filmar', 'Shoot it', (s, _r, c) => { const a = A(s, c); split(s, a, `talkie:${a.id}`, Number(c.fee), 'sync', 'Curta musical'); fame(a, 3); fans(a, 30000, 2000); mood(s, a, 'fatigue', 15); }),
      o('decline', 'Recusar (agenda cheia)', 'Decline (busy schedule)', noop),
    ]),
  E('depression_budget_line', 'business', 'neutral', [], 36,
    (s, r) => {
      if (!era(s, 1929, 1938) || !isLabel(s) || s.flags.budgetLine) return null;
      return r.chance(0.4) ? {} : null;
    },
    ['Depressão: discos a preço de banana?', 'Depression: bargain-bin records?'],
    ['Ninguém tem dinheiro para discos caros. Um distribuidor sugere uma linha barata de 35 centavos vendida em lojas de variedades.', 'Nobody can afford pricey records. A distributor suggests a 35-cent budget line sold in dime stores.'],
    [
      o('launch', 'Lançar a linha econômica', 'Launch the budget line', (s) => { pay(s, 'budgetline', 1500, 'release', 'Linha econômica'); s.flags.budgetLine = s.week; rep(s, 'commercial', 4); rep(s, 'artistic', -2); for (const a of mine(s)) fans(a, 3000); }),
      o('radio', 'Apostar no rádio gratuito', 'Bet on free radio', (s) => { rep(s, 'institutional', 2); for (const a of mine(s)) fame(a, 0.5); }),
      o('wait', 'Esperar a tempestade passar', 'Wait out the storm', noop),
    ]),
  E('shellac_ration', 'manufacturing', 'bad', ['war'], 24,
    (s, r) => {
      if (!era(s, 1942, 1945)) return null;
      const pr = s.pendingReleases.find((p) => p.press > 0);
      return pr && r.chance(0.5) ? { pending: pr.id } : null;
    },
    ['Racionamento de goma-laca', 'Shellac rationing'],
    ['A guerra corta a goma-laca. "{pendingTitle}" só sai com metade da tiragem — ou com discos velhos reciclados.', 'The war cuts shellac supplies. "{pendingTitle}" ships at half the run — or with recycled old records.'],
    [
      o('recycle', 'Campanha de reciclagem de discos', 'Record recycling drive', (s) => { pay(s, 'recycle', 500, 'release', 'Reciclagem'); rep(s, 'institutional', 3); }),
      o('halve', 'Cortar a tiragem pela metade', 'Halve the run', (s, _r, c) => { const p = s.pendingReleases.find((x) => x.id === c.pending); if (p) p.press = Math.floor(p.press / 2); }),
    ]),
  E('member_drafted', 'people', 'bad', ['war'], 30,
    (s, r) => {
      const warYears = era(s, 1940, 1945) || era(s, 1950, 1953) || era(s, 1965, 1972);
      if (!warYears) return null;
      const a = pick(s, r, (x) => ['na', 'eu', 'asia', 'oceania'].includes(mkt(x)) && crew(s, x).some((p) => s.year - p.born >= 18 && s.year - p.born <= 30));
      if (!a || !r.chance(0.3)) return null;
      const p = crew(s, a).find((m) => s.year - m.born >= 18 && s.year - m.born <= 30)!;
      return { act: a.id, person: p.id };
    },
    ['{person} foi convocado', '{person} has been drafted'],
    ['A carta chegou: {person} ({act}) vai servir. A banda precisa decidir o que fazer até a volta.', 'The letter arrived: {person} ({act}) must serve. The band must decide what to do until the return.'],
    [
      o('wait', 'Pausar a banda até a volta', 'Pause the band until the return', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 26); trust(a, 6); log(s, 'drafted', '{p} é convocado; {a} entra em pausa.', '{p} is drafted; {a} goes on hiatus.', { p: P(s, c)?.name ?? '', a: a.name }, a.id); }),
      o('sub', 'Substituto temporário', 'Temporary substitute', (s, _r, c) => { const a = A(s, c); pay(s, `draftsub:${a.id}`, 1500, 'artist_dev', 'Substituto'); mood(s, a, 'morale', -5); }),
      o('carry', 'Seguir como der', 'Carry on as best we can', (s, _r, c) => { const a = A(s, c); mom(a, -8); }),
    ]),
  E('troop_tour', 'stage', 'neutral', ['war'], 24,
    (s, r) => {
      if (!(era(s, 1942, 1945) || era(s, 1951, 1953) || era(s, 1966, 1971))) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 10 && ['na', 'eu', 'oceania'].includes(mkt(x)));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Turnê para as tropas', 'Tour for the troops'],
    ['Uma organização de entretenimento militar quer {act} em bases no exterior. Sem cachê, com muita estrada.', 'A military entertainment organization wants {act} at bases abroad. No fee, lots of road.'],
    [
      o('go', 'Ir', 'Go', (s, _r, c) => { const a = A(s, c); fame(a, 3); fans(a, 40000, 5000, 500); mood(s, a, 'fatigue', 25); rep(s, 'institutional', 4); }),
      o('decline', 'Recusar', 'Decline', (s, _r, c) => { if (ambitionIn(s, A(s, c), 'security')) mood(s, A(s, c), 'morale', 3); }),
    ]),
  E('jukebox_route', 'market', 'good', [], 8,
    (s, r) => {
      if (!era(s, 1934, 1978)) return null;
      const rel = myRels(s, (x) => x.type === 'single' && s.week - x.week < 12 && x.q > 45)[0];
      return rel && r.chance(0.4) ? { release: rel.id, act: rel.actId, fee: 1200 } : null;
    },
    ['Operador de jukebox quer "{releaseTitle}"', 'Jukebox operator wants "{releaseTitle}"'],
    ['Uma rota de 400 jukeboxes (≈ operadores Wurlitzer/Seeburg) quer "{releaseTitle}" em todos os bares. Pede exclusividade de um mês na região.', 'A 400-machine jukebox route (≈ Wurlitzer/Seeburg operators) wants "{releaseTitle}" in every bar. It asks for a month of regional exclusivity.'],
    [
      o('exclusive', 'Aceitar com exclusividade', 'Accept with exclusivity', (s, _r, c) => { gain(s, `juke:${c.release}`, Number(c.fee), 'sales', 'Rota de jukebox'); appeal(s, c, 1.12); }),
      o('open', 'Vender sem exclusividade', 'Sell without exclusivity', (s, _r, c) => { gain(s, `juke2:${c.release}`, Number(c.fee) * 0.5, 'sales', 'Jukebox'); appeal(s, c, 1.05); }),
      o('pass', 'Passar', 'Pass', noop),
    ]),
  E('crooner_microphone', 'career', 'good', [], 20,
    (s, r) => {
      if (!era(s, 1925, 1945)) return null;
      const a = pick(s, r, (x) => crew(s, x).some((p) => p.role === 'vocal' && p.skills.voice < 80));
      if (!a || !r.chance(0.3)) return null;
      return { act: a.id, person: crew(s, a).find((p) => p.role === 'vocal')!.id };
    },
    ['O microfone muda o canto de {person}', 'The microphone changes {person}\'s singing'],
    ['Com a gravação elétrica, {person} ({act}) não precisa mais gritar para a corneta. Um professor ensina a cantar "ao pé do ouvido".', 'With electrical recording, {person} ({act}) no longer has to shout into the horn. A coach teaches intimate "crooning".'],
    [
      o('coach', 'Pagar as aulas', 'Pay for lessons', (s, _r, c) => { pay(s, `croon:${c.person}`, 600, 'artist_dev', 'Aulas de canto'); const p = P(s, c); if (p) p.skills.voice = clamp(p.skills.voice + 4, 0, 100); }),
      o('self', 'Deixar aprender sozinho', 'Let them learn alone', (s, _r, c) => { pmood(P(s, c), 'inspiration', 8); }),
    ]),
  E('radio_queen_contest', 'culture', 'neutral', [], 12,
    (s, r) => {
      if (!era(s, 1937, 1958)) return null;
      const a = pick(s, r, (x) => mkt(x) === 'br' && x.members.length <= 2 && x.fame > 5);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['Coroa do Rádio: {act} concorre', 'Radio Crown: {act} competes'],
    ['O concurso de rainhas e reis do rádio (≈ Rainha do Rádio) vota por cupons de revista. Fã-clubes rivais compram pilhas de exemplares.', 'The radio queens and kings contest (≈ Rainha do Rádio) votes via magazine coupons. Rival fan clubs buy stacks of copies.'],
    [
      o('buy', 'Comprar cupons em segredo', 'Secretly buy coupons', (s, r, c) => { const a = A(s, c); pay(s, `coupons:${a.id}`, 1200, 'marketing', 'Cupons'); if (r.chance(0.6)) { fame(a, 5); fans(a, 50000, 6000, 1000); log(s, 'radio_crown', '{a} é coroado no concurso do rádio.', '{a} is crowned in the radio contest.', { a: a.name }, a.id, true); } if (r.chance(0.2)) rep(s, 'institutional', -5); }, ['Pode vencer; pode vazar.', 'May win; may leak.']),
      o('fans', 'Mobilizar o fã-clube', 'Mobilize the fan club', (s, r, c) => { const a = A(s, c); if (r.chance(0.3 + a.fans.core / 40000)) { fame(a, 4); fans(a, 40000, 5000); } else fans(a, 5000, 1500, 400); }),
      o('ignore', 'Não participar', 'Sit it out', noop),
    ]),
  E('marchinha_carnaval', 'culture', 'good', [], 12,
    (s, r) => {
      if (!era(s, 1920, 1970) || s.month > 1) return null;
      const a = pick(s, r, (x) => mkt(x) === 'br' && active(x));
      return a && r.chance(0.5) ? { act: a.id } : null;
    },
    ['Marchinha para o carnaval', 'A marchinha for carnival'],
    ['Faltam semanas para o carnaval. Se {act} lançar uma marchinha agora, ela pode tomar os blocos — ou morrer na Quarta-Feira de Cinzas.', 'Carnival is weeks away. If {act} drops a marchinha now, it may take over the street parades — or die on Ash Wednesday.'],
    [
      o('write', 'Compor e lançar às pressas', 'Write and rush it out', (s, r, c) => { const a = A(s, c); pay(s, `march:${a.id}`, 500, 'release', 'Marchinha'); if (r.chance(0.5)) { fame(a, 3); fans(a, 60000, 3000); } else fans(a, 8000); mood(s, a, 'fatigue', 8); }),
      o('skip', 'Pular este carnaval', 'Skip this carnival', noop),
    ]),
  E('race_records', 'market', 'neutral', ['political'], 24,
    (s, r) => {
      if (!era(s, 1920, 1965)) return null;
      const a = pick(s, r, (x) => mkt(x) === 'na' && ['rnb', 'blues_jazz', 'sacred'].includes(fam(x)) && x.fame > 8);
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Paradas separadas para {act}', 'Separate charts for {act}'],
    ['As rádios brancas não tocam {act}; o disco fica preso na parada "racial". Um DJ propõe furar a barreira com sessões noturnas.', 'White radio won\'t play {act}; the record is stuck on the "race" chart. A DJ proposes breaking the barrier with late-night sessions.'],
    [
      o('cross', 'Bancar a travessia (divulgação)', 'Fund the crossover (promotion)', (s, r, c) => { const a = A(s, c); pay(s, `cross:${a.id}`, 1500, 'marketing', 'Divulgação'); if (r.chance(0.5)) { a.positioning = clamp(a.positioning + 12, 0, 100); fans(a, 50000, 5000); rep(s, 'artists', 3); } else mom(a, -3); }),
      o('circuit', 'Fortalecer o circuito próprio', 'Strengthen their own circuit', (s, _r, c) => { const a = A(s, c); fans(a, 10000, 3000, 800); trust(a, 3); }),
      o('nothing', 'Nada a fazer', 'Nothing to be done', noop),
    ]),
  E('segregated_venue', 'stage', 'bad', ['political'], 18,
    (s, r) => {
      if (!era(s, 1930, 1965)) return null;
      const a = pick(s, r, (x) => mkt(x) === 'na' && recentGig(s, x, 10));
      return a && r.chance(0.25) ? { act: a.id, fee: feeBy(a, 1500, 60, 6000) } : null;
    },
    ['Casa exige plateia separada', 'Venue demands a segregated audience'],
    ['Uma casa no Sul quer {act}, mas com plateias separadas por cor. Cachê: {feeTxt}.', 'A Southern venue wants {act}, but with audiences separated by colour. Fee: {feeTxt}.'],
    [
      o('refuse', 'Recusar e denunciar', 'Refuse and speak out', (s, _r, c) => { const a = A(s, c); rep(s, 'artists', 4); trust(a, 6); fans(a, 0, 1000, 600); log(s, 'refuse_segregation', '{a} recusa tocar para plateia segregada.', '{a} refuses to play a segregated show.', { a: a.name }, a.id); }),
      o('integrated', 'Exigir plateia integrada (risco de cancelamento)', 'Demand an integrated crowd (may be cancelled)', (s, r, c) => { const a = A(s, c); if (r.chance(0.4)) { split(s, a, `integ:${a.id}`, Number(c.fee), 'live', 'Show'); fame(a, 2); rep(s, 'artists', 3); } else trust(a, 3); }),
      o('play', 'Tocar assim mesmo', 'Play anyway', (s, _r, c) => { const a = A(s, c); split(s, a, `segr:${a.id}`, Number(c.fee), 'live', 'Show'); trust(a, -4); rep(s, 'artists', -3); }),
    ]),
  E('rock_moral_panic', 'culture', 'bad', ['controversy'], 18,
    (s, r) => {
      if (!era(s, 1954, 1966)) return null;
      const a = pick(s, r, (x) => ['rock', 'rnb'].includes(fam(x)) && x.fame > 10);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['Pânico moral contra {act}', 'Moral panic over {act}'],
    ['Pregadores organizam fogueiras de discos de {act}, "música que corrompe a juventude".', 'Preachers organize bonfires of {act} records, "music that corrupts the youth".'],
    [
      o('defy', 'Transformar em marketing', 'Turn it into marketing', (s, _r, c) => { const a = A(s, c); fame(a, 2); fansMul(a, 1, 1.1, 1.15); rep(s, 'institutional', -4); scandal(s, a.id, 'sex', 35); }),
      o('clean', 'Limpar a imagem (terno e gravata)', 'Clean up the image (suit and tie)', (s, _r, c) => { const a = A(s, c); trust(a, -6); a.positioning = clamp(a.positioning + 6, 0, 100); rep(s, 'institutional', 2); }),
      o('wait', 'Esperar passar', 'Wait it out', (s, _r, c) => { mom(A(s, c), -4); }),
    ]),
  E('tv_waist_up', 'culture', 'neutral', [], 18,
    (s, r) => {
      if (!era(s, 1955, 1966) || !hasTech(s, 'tv_music')) return null;
      const a = pick(s, r, (x) => ['rock', 'rnb', 'latin', 'caribbean'].includes(fam(x)) && x.fame > 15);
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['TV só filma da cintura para cima', 'TV will only film from the waist up'],
    ['O Gala de Domingo (≈ The Ed Sullivan Show) aceita {act}, mas a câmera não mostrará os quadris. O país inteiro estará vendo.', 'Gala de Domingo (≈ The Ed Sullivan Show) will take {act}, but the camera won\'t show the hips. The whole country will be watching.'],
    [
      o('accept', 'Aceitar as regras', 'Accept the rules', (s, _r, c) => { const a = A(s, c); fame(a, 4); fans(a, 120000, 8000); }),
      o('wink', 'Aceitar e piscar para a câmera', 'Accept and wink at the camera', (s, _r, c) => { const a = A(s, c); fame(a, 5); fans(a, 140000, 12000, 1500); rep(s, 'institutional', -3); }),
      o('refuse', 'Recusar', 'Refuse', (s, _r, c) => { A(s, c).positioning -= 3; }),
    ]),
  E('skiffle_craze', 'scouting', 'good', [], 24,
    (s, r) => {
      if (!era(s, 1955, 1963) || !isLabel(s)) return null;
      const cands = Object.values(s.acts).filter((x) => !x.owner && mkt(x) === 'eu' && active(x) && !s.knowledge[x.id]);
      return cands.length && r.chance(0.4) ? { city: r.pick(['liverpool', 'london', 'glasgow', 'hamburg']) } : null;
    },
    ['Febre skiffle em {cityName}', 'Skiffle craze in {cityName}'],
    ['Adolescentes com tábuas de lavar e baixos de caixote formam mil bandas. Seu A&R pode passar uma semana nos porões de {cityName}.', 'Teens with washboards and tea-chest basses form a thousand bands. Your A&R could spend a week in the {cityName} cellars.'],
    [
      o('scout', 'Mandar o A&R', 'Send the A&R', (s, r, c) => { pay(s, `skiffle:${c.city}`, 400, 'scouting', 'Viagem de A&R'); const list = Object.values(s.acts).filter((x) => !x.owner && mkt(x) === 'eu' && active(x)); for (const x of r.shuffle(list).slice(0, 3)) signal(s, r, x.id, 1); s.genrePop.skiffle = clamp((s.genrePop.skiffle ?? 0.6) + 0.2, 0, 2.2); }),
      o('ignore', 'É moda passageira', 'It\'s a passing fad', noop),
    ]),
  E('payola_hearings', 'world', 'neutral', ['crime'], 999,
    (s) => (era(s, 1959, 1961) && !s.flags.payolaHearings ? {} : null),
    ['Audiências sobre o jabá', 'Payola hearings'],
    ['O Congresso investiga pagamentos a DJs. Selos com acordos "por fora" estão na mira.', 'Congress investigates payments to DJs. Labels with under-the-table deals are in the crosshairs.'],
    [
      o('audit', 'Auditoria interna e transparência', 'Internal audit and transparency', (s) => { s.flags.payolaHearings = s.week; pay(s, 'payola_audit', 2000, 'legal', 'Auditoria'); rep(s, 'institutional', 5); if (s.flags.payola) delete s.flags.payola; }),
      o('quiet', 'Ficar quieto', 'Stay quiet', (s) => { s.flags.payolaHearings = s.week; if (s.flags.payola) rep(s, 'institutional', -6); }),
    ]),
  E('hit_parade_radio', 'market', 'good', [], 6,
    (s, r) => {
      if (!era(s, 1935, 1960) || !hasTech(s, 'radio')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 10 && x.q > 50)[0];
      return rel && r.chance(0.35) ? { release: rel.id, act: rel.actId } : null;
    },
    ['"{releaseTitle}" na parada do rádio', '"{releaseTitle}" on the radio hit parade'],
    ['A orquestra do programa de sábado vai tocar sua própria versão de "{releaseTitle}" na contagem das mais pedidas.', 'The Saturday show orchestra will play its own version of "{releaseTitle}" on the most-requested countdown.'],
    [
      o('thanks', 'Mandar flores ao maestro', 'Send flowers to the bandleader', (s, _r, c) => { pay(s, `flowers:${c.release}`, 150, 'marketing', 'Cortesia'); appeal(s, c, 1.15); }),
      o('ok', 'Ótimo', 'Great', (s, _r, c) => { appeal(s, c, 1.1); }),
    ]),
  E('tinpan_buyout', 'contract', 'neutral', [], 14,
    (s, r) => {
      if (!era(s, 1920, 1960)) return null;
      const rel = myRels(s, (x) => x.totalUnits > 8000)[0];
      return rel && r.chance(0.3) ? { release: rel.id, act: rel.actId, price: Math.round(2000 + Math.sqrt(rel.totalUnits) * 20) } : null;
    },
    ['Editora quer comprar "{releaseTitle}"', 'Publisher wants to buy "{releaseTitle}"'],
    ['Uma editora de Tin Pan Alley oferece {priceTxt} à vista pela edição de "{releaseTitle}" — para sempre.', 'A Tin Pan Alley publisher offers {priceTxt} cash for the publishing of "{releaseTitle}" — forever.'],
    [
      o('sell', 'Vender (dinheiro agora)', 'Sell (cash now)', (s, _r, c) => { const a = A(s, c); split(s, a, `tinpan:${c.release}`, Number(c.price), 'publishing', 'Venda de edição'); appeal(s, c, 0.95); if (ambitionIn(s, a, 'legacy')) trust(a, -6); }, ['Perde a cauda longa.', 'Lose the long tail.']),
      o('keep', 'Manter os direitos', 'Keep the rights', noop),
    ]),
  E('lp_transition', 'tech', 'neutral', [], 999,
    (s) => (hasTech(s, 'lp') && s.year <= 1958 && !s.flags.lpAsked && isLabel(s) && myRels(s).length > 2 ? {} : null),
    ['O long-play chegou', 'The long-play has arrived'],
    ['O LP de 33 rpm cabe 20 minutos por lado. Remasterizar o catálogo em LP custa, mas abre o mercado de álbuns.', 'The 33 rpm LP holds 20 minutes a side. Remastering the catalog onto LP costs money but opens the album market.'],
    [
      o('remaster', 'Remasterizar o catálogo', 'Remaster the catalog', (s) => { s.flags.lpAsked = s.week; pay(s, 'lp_remaster', 3000, 'release', 'Remasterização LP'); for (const rel of myRels(s)) rel.appeal *= 1.08; rep(s, 'commercial', 3); }),
      o('wait', 'Esperar o formato provar', 'Wait for the format to prove itself', (s) => { s.flags.lpAsked = s.week; }),
    ]),
  E('fan_mail_radio', 'career', 'good', [], 10,
    (s, r) => {
      if (!era(s, 1922, 1962) || !hasTech(s, 'radio')) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 6 && x.fame < 50);
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Sacos de cartas para {act}', 'Sacks of fan mail for {act}'],
    ['A rádio recebeu três mil cartas pedindo {act}. O diretor quer um programa semanal.', 'The station got three thousand letters asking for {act}. The director wants a weekly show.'],
    [
      o('weekly', 'Aceitar o programa semanal', 'Accept the weekly show', (s, _r, c) => { const a = A(s, c); fame(a, 3); fans(a, 30000, 6000, 800); mood(s, a, 'fatigue', 10); split(s, a, `radioshow:${a.id}`, 900, 'live', 'Programa de rádio'); }),
      o('special', 'Só um especial', 'Just one special', (s, _r, c) => { const a = A(s, c); fame(a, 1); fans(a, 10000, 1500); }),
    ]),
];

// =====================================================================================
// 2. GEOPOLÍTICA, GUERRAS, REGIMES E CENSURA
// =====================================================================================
const exileCity = (a: Act): string => (mkt(a) === 'br' ? 'london' : mkt(a) === 'latam' ? 'paris' : mkt(a) === 'asia' ? 'los_angeles' : mkt(a) === 'africa' ? 'paris' : 'london');

const GEO: EventDef[] = [
  E('censor_lyrics', 'culture', 'bad', ['censorship', 'political'], 10,
    (s, r) => {
      const rels = myRels(s, (x) => x.live && s.week - x.week < 20 && x.territories.some((m) => censorshipIn(s.year, m).level >= 0.4));
      if (!rels.length || !r.chance(0.4)) return null;
      const rel = r.pick(rels);
      const m = rel.territories.find((t) => censorshipIn(s.year, t).level >= 0.4)!;
      const g = geoActive(s.year, m).sort((x, y) => y.effects.censorshipLevel - x.effects.censorshipLevel)[0];
      return { release: rel.id, act: rel.actId, market: m, gpt: g.name.pt, gen: g.name.en };
    },
    ['Censor veta letras de "{releaseTitle}"', 'Censor bans lyrics on "{releaseTitle}"'],
    ['Sob o {gpt}, o departamento de censura exige cortes em "{releaseTitle}" de {act}. Sem o carimbo, o disco não toca nem é vendido lá.', 'Under the {gen}, the censorship office demands cuts to "{releaseTitle}" by {act}. Without the stamp, the record can\'t be played or sold there.'],
    [
      o('edit', 'Aceitar os cortes', 'Accept the cuts', (s, _r, c) => { const a = A(s, c); trust(a, -8); appeal(s, c, 0.95); mood(s, a, 'morale', -6); }),
      o('metaphor', 'Regravar com metáforas', 'Re-record with metaphors', (s, r, c) => { const a = A(s, c); pay(s, `metaphor:${c.release}`, 1500, 'release', 'Regravação'); if (r.chance(0.6)) { fame(a, 2); fans(a, 0, 3000, 1500); rep(s, 'artistic', 3); } else { const rel = s.releases[String(c.release)]; if (rel) rel.territories = rel.territories.filter((t) => t !== c.market); } }, ['Pode virar hino — ou ser vetado de novo.', 'May become an anthem — or be banned again.']),
      o('withdraw', 'Retirar o disco daquele mercado', 'Withdraw the record from that market', (s, _r, c) => { const rel = s.releases[String(c.release)]; if (rel) rel.territories = rel.territories.filter((t) => t !== c.market); const a = A(s, c); trust(a, 2); }),
    ]),
  E('artist_exile', 'people', 'bad', ['political'], 36,
    (s, r) => {
      const a = pick(s, r, (x) => (traitIn(s, x, 'engaged') || traitIn(s, x, 'controversial')) && geoIn(s, x).some((g) => g.kind === 'dictatorship' || g.kind === 'revolution' || g.kind === 'occupation'));
      if (!a || !r.chance(0.35)) return null;
      const g = geoIn(s, a).find((x) => x.kind === 'dictatorship' || x.kind === 'revolution' || x.kind === 'occupation')!;
      return { act: a.id, city: exileCity(a), gpt: g.name.pt, gen: g.name.en };
    },
    ['{act} sob pressão do regime', '{act} under regime pressure'],
    ['Depois de um show, {act} foi "convidado a depor". Amigos sugerem o exílio em {cityName} enquanto durar o {gpt}.', 'After a show, {act} was "invited to testify". Friends suggest exile in {cityName} while the {gen} lasts.'],
    [
      o('exile', 'Bancar o exílio', 'Fund the exile', (s, _r, c) => { const a = A(s, c); pay(s, `exile:${a.id}`, 4000, 'artist_dev', 'Exílio'); a.city = String(c.city); trust(a, 12); mood(s, a, 'inspiration', 20); mood(s, a, 'morale', -10); log(s, 'exile', '{a} parte para o exílio em {c}.', '{a} goes into exile in {c}.', { a: a.name, c: cityById[String(c.city)]?.name ?? String(c.city) }, a.id, true); }),
      o('defiant', 'Show de despedida desafiador', 'Defiant farewell show', (s, r, c) => { const a = A(s, c); fame(a, 4); fans(a, 30000, 6000, 3000); rep(s, 'artists', 3); if (r.chance(0.5)) hiatus(s, a, 26); }, ['Vira símbolo; pode ser proibido de tocar.', 'Becomes a symbol; may be banned from playing.']),
      o('lowprofile', 'Baixar a cabeça por um tempo', 'Keep a low profile for a while', (s, _r, c) => { const a = A(s, c); mom(a, -10); trust(a, -4); }),
    ]),
  E('coded_anthem', 'culture', 'good', ['political'], 24,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && geoIn(s, x).some((g) => g.effects.censorshipLevel >= 0.5) && crew(s, x).some((p) => p.skills.lyr > 55));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Uma canção cifrada de {act}', 'A coded song by {act}'],
    ['A nova letra de {act} fala de "um dia que vai raiar". Os censores não entenderam. O público entendeu tudo.', '{act}\'s new lyric talks about "a day that will dawn". The censors didn\'t get it. The audience got everything.'],
    [
      o('release', 'Lançar já', 'Release it now', (s, r, c) => { const a = A(s, c); fame(a, 4); fans(a, 50000, 8000, 3000); rep(s, 'artistic', 4); if (r.chance(0.25)) { s.flags[`banned:${a.id}`] = s.week; mom(a, -10); } log(s, 'coded', 'Canção cifrada de {a} vira hino.', '{a}\'s coded song becomes an anthem.', { a: a.name }, a.id, true); }),
      o('shelve', 'Guardar para tempos melhores', 'Shelve it for better times', (s, _r, c) => { mood(s, A(s, c), 'inspiration', 10); }),
    ]),
  E('festival_booing', 'stage', 'neutral', ['political'], 18,
    (s, r) => {
      if (!era(s, 1965, 1972)) return null;
      const a = pick(s, r, (x) => mkt(x) === 'br' && active(x) && x.fame > 8);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['Vaias no Grande Festival da Canção', 'Booing at the Grande Festival da Canção'],
    ['A plateia universitária (≈ Festival de MPB da Record) vaia {act} por usar guitarra elétrica. A TV está ao vivo.', 'The student crowd (≈ Record TV MPB Festival) boos {act} for using electric guitar. TV is live.'],
    [
      o('speech', 'Discurso inflamado contra a plateia', 'Fiery speech at the crowd', (s, _r, c) => { const a = A(s, c); fame(a, 5); fans(a, 40000, 8000, 2000); rep(s, 'artistic', 3); scandal(s, a.id, 'politics', 35); }),
      o('play_on', 'Tocar até o fim, impassível', 'Play to the end, unfazed', (s, _r, c) => { const a = A(s, c); fame(a, 2); mood(s, a, 'stress', 10); }),
      o('leave', 'Sair do palco', 'Walk off stage', (s, _r, c) => { mom(A(s, c), -6); }),
    ]),
  E('embargo_customs', 'manufacturing', 'bad', ['political'], 18,
    (s, r) => {
      const rels = myRels(s, (x) => x.live && s.week - x.week < 15 && x.territories.some((m) => geoActive(s.year, m).some((g) => g.effects.importBlocked || g.effects.exportBlocked)));
      if (!rels.length || !r.chance(0.35)) return null;
      const rel = r.pick(rels);
      return { release: rel.id, act: rel.actId };
    },
    ['Discos presos na alfândega', 'Records stuck at customs'],
    ['Por causa de embargos e restrições de importação, caixas de "{releaseTitle}" estão retidas no porto.', 'Because of embargoes and import restrictions, boxes of "{releaseTitle}" are held at the port.'],
    [
      o('reroute', 'Desviar por um terceiro país', 'Reroute through a third country', (s, _r, c) => { pay(s, `reroute:${c.release}`, 1800, 'release', 'Frete alternativo'); }),
      o('license', 'Licenciar para um selo local', 'License to a local label', (s, _r, c) => { gain(s, `lic_local:${c.release}`, 800, 'sales', 'Licença local'); appeal(s, c, 0.92); }),
      o('wait', 'Esperar liberação', 'Wait for clearance', (s, _r, c) => { appeal(s, c, 0.85); }),
    ]),
  E('tour_blocked', 'stage', 'bad', ['war'], 12,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && x.fame > 10 && geoIn(s, x).some((g) => g.effects.touringBlocked));
      if (!a || !r.chance(0.3)) return null;
      const g = geoIn(s, a).find((x) => x.effects.touringBlocked)!;
      return { act: a.id, gpt: g.name.pt, gen: g.name.en, fee: feeBy(a, 2000, 120, 15000) };
    },
    ['Turnê de {act} cancelada', '{act} tour cancelled'],
    ['Com {gpt}, fronteiras e casas fecham. A turnê de {act} está suspensa; ingressos vendidos somam {feeTxt}.', 'With the {gen}, borders and venues close. {act}\'s tour is suspended; tickets sold total {feeTxt}.'],
    [
      o('refund', 'Reembolsar todos os ingressos', 'Refund every ticket', (s, _r, c) => { const a = A(s, c); if (a.playerBand) pay(s, `refund:${a.id}`, Number(c.fee) * 0.3, 'live_costs', 'Reembolso'); rep(s, 'institutional', 2); fans(a, 0, 500, 300); }),
      o('postpone', 'Remarcar (ingressos valem depois)', 'Postpone (tickets valid later)', (s, _r, c) => { const a = A(s, c); mood(s, a, 'morale', -6); mom(a, -5); }),
      o('broadcast', 'Show transmitido pelo rádio/streaming', 'Broadcast show on radio/streaming', (s, _r, c) => { const a = A(s, c); fame(a, 1.5); fans(a, 15000, 2000); mom(a, -2); }),
    ]),
  E('benefit_concert', 'stage', 'good', ['charity'], 18,
    (s, r) => {
      const crisis = geoActive(s.year).some((g) => ['war', 'pandemic', 'recession'].includes(g.kind)) || FESTIVALS.some((f) => f.vibe === 'charity' && f.start === s.year);
      if (!crisis) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 20);
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Concerto beneficente chama {act}', 'Benefit concert calls on {act}'],
    ['Artistas se unem para arrecadar fundos. Não há cachê, mas a transmissão alcança o mundo.', 'Artists unite to raise funds. There is no fee, but the broadcast reaches the world.'],
    [
      o('join', 'Participar', 'Join', (s, _r, c) => { const a = A(s, c); fame(a, 3); fans(a, 80000, 6000, 800); rep(s, 'institutional', 4); rep(s, 'artists', 2); mood(s, a, 'morale', 8); log(s, 'benefit', '{a} toca em concerto beneficente.', '{a} plays a benefit concert.', { a: a.name }, a.id); }),
      o('donate', 'Doar sem aparecer', 'Donate without appearing', (s) => { pay(s, 'benefit_donation', 2000, 'marketing', 'Doação'); rep(s, 'institutional', 2); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('oil_vinyl_shock', 'manufacturing', 'bad', [], 24,
    (s, r) => {
      if (!(era(s, 1973, 1975) || era(s, 1979, 1981))) return null;
      return s.pendingReleases.some((p) => p.press > 0) && r.chance(0.5) ? {} : null;
    },
    ['Choque do petróleo encarece o vinil', 'Oil shock makes vinyl expensive'],
    ['Vinil é derivado de petróleo. As fábricas cobram 40% a mais e algumas reciclam discos encalhados.', 'Vinyl is an oil product. Plants charge 40% more and some recycle unsold records.'],
    [
      o('pay', 'Pagar o reajuste', 'Pay the surcharge', (s) => { const units = s.pendingReleases.reduce((t, p) => t + p.press, 0); pay(s, 'oil_surcharge', Math.min(8000, 300 + units * 0.3), 'release', 'Reajuste do vinil'); }),
      o('thin', 'Aceitar vinil reciclado e mais fino', 'Accept thinner recycled vinyl', (s) => { for (const a of mine(s)) mom(a, -1); rep(s, 'artistic', -2); }),
    ]),
  E('hyperinflation', 'business', 'bad', [], 24,
    (s, r) => {
      if (!isLabel(s)) return null;
      const hit = s.player.territories.some((m) => geoActive(s.year, m).some((g) => (g.effects.inflationShock ?? 0) >= 0.4));
      return hit && r.chance(0.35) ? {} : null;
    },
    ['Inflação galopante', 'Runaway inflation'],
    ['Preços mudam toda semana. Artistas pedem cachês em dólar e o varejo atrasa pagamentos.', 'Prices change every week. Artists want fees in dollars and retail delays payments.'],
    [
      o('dollar', 'Dolarizar contratos', 'Dollarize contracts', (s) => { pay(s, 'dollarize', 1500, 'legal', 'Revisão de contratos'); rep(s, 'artists', 3); }),
      o('index', 'Indexar e cobrar o varejo à vista', 'Index prices and demand cash from retail', (s) => { rep(s, 'commercial', -2); for (const a of mine(s)) trust(a, -2); }),
      o('ride', 'Aguentar', 'Ride it out', (s) => { for (const a of mine(s)) trust(a, -3); }),
    ]),
  E('iron_curtain_bootleg', 'culture', 'good', [], 30,
    (s, r) => {
      if (!era(s, 1950, 1989)) return null;
      const a = pick(s, r, (x) => x.fame > 25 && ['rock', 'blues_jazz', 'pop', 'rnb'].includes(fam(x)));
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    ['{act} gravado em radiografias', '{act} bootlegged on X-rays'],
    ['Do outro lado da Cortina de Ferro, fãs copiam discos de {act} em chapas de raio X. Um comitê cultural sugere uma turnê oficial.', 'Behind the Iron Curtain, fans copy {act} records onto X-ray film. A cultural committee suggests an official tour.'],
    [
      o('tour', 'Fazer a turnê oficial', 'Do the official tour', (s, r, c) => { const a = A(s, c); pay(s, `eastour:${a.id}`, 3000, 'live_costs', 'Turnê no Leste'); fame(a, 4); fans(a, 200000, 15000, 4000); rep(s, 'institutional', 3); if (r.chance(0.3)) { mood(s, a, 'stress', 15); } log(s, 'east_tour', '{a} faz turnê histórica atrás da Cortina de Ferro.', '{a} plays a historic tour behind the Iron Curtain.', { a: a.name }, a.id, true); }),
      o('enjoy', 'Curtir a lenda à distância', 'Enjoy the legend from afar', (s, _r, c) => { fans(A(s, c), 0, 0, 1500); }),
    ]),
  E('diplomacy_tour', 'stage', 'good', [], 30,
    (s, r) => {
      if (!era(s, 1956, 1989)) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 20 && ['blues_jazz', 'rock', 'country_folk', 'rnb'].includes(fam(x)) && ['na', 'eu'].includes(mkt(x)));
      return a && r.chance(0.25) ? { act: a.id, fee: feeBy(a, 5000, 150, 20000) } : null;
    },
    ['Embaixadores do som', 'Sound ambassadors'],
    ['O governo quer {act} numa turnê de "diplomacia cultural" por 8 países. Cachê de {feeTxt} e um roteiro com guardas.', 'The government wants {act} on a "cultural diplomacy" tour of 8 countries. Fee {feeTxt} and an itinerary with minders.'],
    [
      o('go', 'Aceitar', 'Accept', (s, _r, c) => { const a = A(s, c); split(s, a, `diplo:${a.id}`, Number(c.fee), 'live', 'Turnê diplomática'); fame(a, 3); mood(s, a, 'fatigue', 20); mood(s, a, 'inspiration', 15); rep(s, 'institutional', 4); }),
      o('refuse', 'Recusar (não somos propaganda)', 'Refuse (we are not propaganda)', (s, _r, c) => { const a = A(s, c); if (ambitionIn(s, a, 'art') || traitIn(s, a, 'engaged')) trust(a, 5); }),
    ]),
  E('resort_boycott', 'culture', 'neutral', ['political'], 36,
    (s, r) => {
      if (!era(s, 1975, 1993)) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 30);
      return a && r.chance(0.2) ? { act: a.id, fee: feeBy(a, 20000, 600, 80000) } : null;
    },
    ['Proposta milionária num resort sob boicote', 'Million-dollar resort offer under boycott'],
    ['Um resort em país sob boicote cultural internacional oferece {feeTxt} por uma temporada de {act}. O movimento antissegregação pede recusa.', 'A resort in a country under international cultural boycott offers {feeTxt} for a {act} residency. The anti-segregation movement asks for a refusal.'],
    [
      o('accept', 'Aceitar o dinheiro', 'Take the money', (s, _r, c) => { const a = A(s, c); split(s, a, `resort:${a.id}`, Number(c.fee), 'live', 'Temporada no resort'); rep(s, 'artists', -10); rep(s, 'institutional', -6); scandal(s, a.id, 'politics', 40); log(s, 'boycott_break', '{a} fura o boicote cultural.', '{a} breaks the cultural boycott.', { a: a.name }, a.id, true); }),
      o('refuse', 'Recusar publicamente', 'Refuse publicly', (s, _r, c) => { const a = A(s, c); rep(s, 'artists', 5); fans(a, 0, 2000, 1500); trust(a, 4); }),
      o('quiet', 'Recusar em silêncio', 'Decline quietly', noop),
    ]),
  E('diaspora_scene', 'people', 'neutral', ['political'], 36,
    (s, r) => {
      const a = pick(s, r, (x) => geoIn(s, x).some((g) => g.kind === 'revolution' && (g.effects.importBlocked || g.effects.censorshipLevel > 0.7)));
      return a && r.chance(0.4) ? { act: a.id, city: 'los_angeles' } : null;
    },
    ['A cena de {act} se muda', '{act}\'s scene relocates'],
    ['Com a música popular proibida em casa, a cena inteira de {act} se reorganiza em {cityName}, na diáspora.', 'With pop music banned at home, {act}\'s entire scene regroups in {cityName}, in the diaspora.'],
    [
      o('move', 'Mudar o ato para a diáspora', 'Move the act to the diaspora', (s, _r, c) => { const a = A(s, c); pay(s, `diaspora:${a.id}`, 3000, 'artist_dev', 'Mudança'); a.city = String(c.city); fans(a, 20000, 4000, 2000); trust(a, 8); }),
      o('stay', 'Ficar e gravar em segredo', 'Stay and record in secret', (s, _r, c) => { const a = A(s, c); mood(s, a, 'stress', 12); fans(a, 0, 0, 1200); mom(a, -8); }),
    ]),
  E('wall_opens_markets', 'market', 'good', [], 999,
    (s) => (era(s, 1989, 1992) && isLabel(s) && !s.flags.wallOpened ? {} : null),
    ['O Muro caiu', 'The Wall has fallen'],
    ['Mercados do Leste se abrem da noite para o dia. Clubes ocupam fábricas vazias e há fome de discos ocidentais.', 'Eastern markets open overnight. Clubs squat empty factories and there is hunger for Western records.'],
    [
      o('push', 'Campanha imediata no Leste', 'Immediate Eastern campaign', (s) => { s.flags.wallOpened = s.week; pay(s, 'east_campaign', 4000, 'marketing', 'Campanha no Leste'); for (const a of mine(s)) fans(a, 15000, 1500); rep(s, 'commercial', 3); s.genrePop.techno = clamp((s.genrePop.techno ?? 1) + 0.15, 0, 2.2); }),
      o('watch', 'Observar', 'Watch', (s) => { s.flags.wallOpened = s.week; s.genrePop.techno = clamp((s.genrePop.techno ?? 1) + 0.1, 0, 2.2); }),
    ]),
  E('lockdown_livestream', 'world', 'neutral', [], 12,
    (s, r) => {
      if (!geoActive(s.year).some((g) => g.kind === 'pandemic')) return null;
      const a = pick(s, r, (x) => active(x));
      return a && r.chance(0.5) ? { act: a.id } : null;
    },
    ['Palcos fechados: {act} em casa', 'Stages closed: {act} at home'],
    ['Shows proibidos. {act} pode fazer uma live da sala de estar ou usar o tempo para compor.', 'Shows are banned. {act} can stream from the living room or use the time to write.'],
    [
      o('live', 'Live com doações', 'Livestream with donations', (s, _r, c) => { const a = A(s, c); fans(a, 30000, 5000, 1000); split(s, a, `live_tip:${a.id}:${s.year}`, Math.min(6000, 500 + a.fans.core * 0.1), 'live', 'Doações da live'); }),
      o('write', 'Compor o "disco da quarentena"', 'Write the "lockdown album"', (s, _r, c) => { const a = A(s, c); mood(s, a, 'inspiration', 25); mood(s, a, 'fatigue', -20); }),
      o('rest', 'Descansar', 'Rest', (s, _r, c) => { mood(s, A(s, c), 'fatigue', -25); }),
    ]),
  E('platform_exits_market', 'market', 'bad', ['political'], 999,
    (s) => (era(s, 2022, 2026) && !s.flags.platformExit && mine(s).some((a) => ['eu'].includes(mkt(a))) ? {} : null),
    ['Plataformas deixam um país sob sanções', 'Platforms leave a sanctioned country'],
    ['Streamhaven (≈ Spotify) e TuneShop (≈ iTunes) saem de um grande mercado do Leste. Sua base de fãs lá some dos relatórios.', 'Streamhaven (≈ Spotify) and TuneShop (≈ iTunes) exit a large Eastern market. Your fan base there vanishes from the reports.'],
    [
      o('statement', 'Declaração pública de apoio às vítimas', 'Public statement supporting the victims', (s) => { s.flags.platformExit = s.week; rep(s, 'artists', 2); rep(s, 'institutional', 2); }),
      o('silent', 'Sem comentários', 'No comment', (s) => { s.flags.platformExit = s.week; for (const a of mine(s)) fansMul(a, 0.98, 0.98, 1); }),
    ]),
  E('language_quota', 'market', 'neutral', [], 36,
    (s, r) => {
      if (s.year < 1970) return null;
      const a = pick(s, r, (x) => active(x) && ['br', 'latam', 'eu'].includes(mkt(x)) && cityById[x.city]?.lang !== 'en');
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Cota de música nacional no rádio', 'National music quota on radio'],
    ['Uma lei obriga as rádios a tocar 40% de música no idioma local. {act} pode ganhar espaço — se tiver repertório.', 'A law forces radio to play 40% local-language music. {act} may gain airtime — if they have the repertoire.'],
    [
      o('local', 'Gravar versões no idioma local', 'Record local-language versions', (s, _r, c) => { const a = A(s, c); pay(s, `quota:${a.id}`, 1200, 'release', 'Versões locais'); fame(a, 2); fans(a, 40000, 4000); }),
      o('ok', 'Seguir como está', 'Keep as is', (s, _r, c) => { fans(A(s, c), 8000); }),
    ]),
  E('neural_act_rating', 'neural', 'neutral', ['censorship'], 999,
    (s) => (hasTech(s, 'neural') && geoActive(s.year).some((g) => g.id === 'geo_neural_regulation') && !s.flags.neuralRating ? {} : null),
    ['Classificação etária neural', 'Neural age ratings'],
    ['A Lei de Proteção Neural cria selos etários para música transmitida direto ao cérebro. Classificar o catálogo custa caro.', 'The Neural Protection Act creates age ratings for brain-streamed music. Rating the catalog is expensive.'],
    [
      o('rate', 'Classificar tudo', 'Rate everything', (s) => { s.flags.neuralRating = s.week; pay(s, 'neural_rating', 6000, 'legal', 'Classificação neural'); rep(s, 'institutional', 5); }),
      o('opt_out', 'Tirar o catálogo do feed neural', 'Pull the catalog from the neural feed', (s) => { s.flags.neuralRating = s.week; s.player.neural.humanFocus += 1; rep(s, 'commercial', -3); }),
    ]),
];

// =====================================================================================
// 3. MÍDIA, RELAÇÕES PÚBLICAS E CANCELAMENTO
// =====================================================================================
const MEDIA_PR: EventDef[] = [
  E('old_posts_resurface', 'scandal', 'bad', ['controversy'], 18,
    (s, r) => {
      if (s.year < 2009) return null;
      const a = pick(s, r, (x) => x.fame > 25 && (traitIn(s, x, 'impulsive') || traitIn(s, x, 'controversial') || traitIn(s, x, 'big_ego')));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Postagens antigas de {act} ressurgem', 'Old {act} posts resurface'],
    ['Alguém desenterrou postagens de dez anos atrás de {act}. A hashtag sobe no Chirper (≈ Twitter).', 'Someone dug up decade-old {act} posts. The hashtag climbs on Chirper (≈ Twitter).'],
    [
      o('apology', 'Pedido de desculpas sincero e ação concreta', 'Sincere apology and concrete action', (s, _r, c) => { const a = A(s, c); pay(s, `amends:${a.id}`, 2000, 'marketing', 'Reparação'); mom(a, -5); rep(s, 'institutional', 2); }),
      o('notes', 'Desculpa protocolar no bloco de notas', 'Boilerplate notes-app apology', (s, _r, c) => { const a = A(s, c); mom(a, -10); fansMul(a, 0.95, 0.95, 1); }),
      o('double', 'Dobrar a aposta', 'Double down', (s, _r, c) => { const a = A(s, c); fame(a, 1); fansMul(a, 0.85, 1, 1.1); rep(s, 'institutional', -6); scandal(s, a.id, 'offense', 35); }),
      o('silence', 'Silêncio', 'Silence', (s, _r, c) => { mom(A(s, c), -8); }),
    ]),
  E('cancel_campaign', 'scandal', 'bad', ['controversy'], 24,
    (s, r) => {
      if (s.year < 2012) return null;
      const a = pick(s, r, (x) => x.fame > 35 && x.scandals > 0);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['Campanha de cancelamento contra {act}', 'Cancellation campaign against {act}'],
    ['Patrocinadores ligam, playlists removem {act} e a imprensa quer uma posição em 24 horas.', 'Sponsors call, playlists drop {act} and the press wants a position within 24 hours.'],
    [
      o('pr', 'Contratar gestão de crise', 'Hire crisis management', (s, _r, c) => { const a = A(s, c); pay(s, `crisis:${a.id}`, staffSkill(s, 'publicist') ? 2500 : 7000, 'marketing', 'Gestão de crise'); mom(a, -6); s.player.stats.scandalsSurvived += 1; }),
      o('offline', 'Sumir das redes por um tempo', 'Go offline for a while', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 8); mom(a, -12); mood(s, a, 'stress', -10); }),
      o('fans', 'Convocar os fãs para defender', 'Rally the fans to defend', (s, _r, c) => { const a = A(s, c); fansMul(a, 0.8, 1.05, 1.15); rep(s, 'institutional', -5); scandal(s, a.id, 'offense', 40); }, ['Pode virar guerra de fandom.', 'May turn into a fandom war.']),
      o('wait', 'Esperar o ciclo de notícias', 'Wait for the news cycle', (s, _r, c) => { const a = A(s, c); mom(a, -15); fansMul(a, 0.9, 0.95, 1); }),
    ]),
  E('paparazzi', 'scandal', 'neutral', [], 12,
    (s, r) => {
      if (s.year < 1950) return null;
      const a = pick(s, r, (x) => x.fame > 40);
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Fotógrafos cercam {act}', 'Photographers swarm {act}'],
    ['Fotos de {act} na praia estampam um tabloide. A família está furiosa; os fãs, curiosos.', 'Beach photos of {act} are on a tabloid cover. The family is furious; fans are curious.'],
    [
      o('sue', 'Processar o tabloide', 'Sue the tabloid', (s, r, c) => { const a = A(s, c); pay(s, `tabloid:${a.id}`, legal(s, 3000), 'legal', 'Processo'); if (r.chance(winOdds(s, 0.45))) { gain(s, `tabloidw:${a.id}`, 6000, 'legal', 'Indenização'); trust(a, 5); } }),
      o('embrace', 'Abraçar a exposição', 'Embrace the exposure', (s, _r, c) => { const a = A(s, c); fame(a, 1.5); mood(s, a, 'stress', 8); }),
      o('ignore', 'Ignorar', 'Ignore', (s, _r, c) => { mood(s, A(s, c), 'stress', 4); }),
    ]),
  E('death_hoax', 'scandal', 'neutral', ['death'], 30,
    (s, r) => {
      if (s.year < 1967) return null;
      const a = pick(s, r, (x) => x.fame > 30 && active(x));
      return a && r.chance(0.12) ? { act: a.id } : null;
    },
    ['Boato: "{act} morreu"', 'Hoax: "{act} is dead"'],
    ['Um boato de morte de alguém de {act} se espalha; fãs analisam capas de disco em busca de "pistas".', 'A death hoax about someone in {act} spreads; fans pore over album covers for "clues".'],
    [
      o('prove', 'Aparição surpresa ao vivo', 'Surprise live appearance', (s, _r, c) => { const a = A(s, c); fame(a, 2); mom(a, 10); fans(a, 30000, 4000); }),
      o('play', 'Brincar com as "pistas"', 'Play along with the "clues"', (s, _r, c) => { const a = A(s, c); mom(a, 6); fans(a, 10000, 6000, 1000); rep(s, 'institutional', -2); }),
      o('ignore', 'Ignorar', 'Ignore', noop),
    ]),
  E('misquote', 'culture', 'bad', [], 12,
    (s, r) => {
      const a = pick(s, r, (x) => x.fame > 12);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['{act} citado errado', '{act} misquoted'],
    ['Uma revista publicou que {act} chamou o próprio público de "ovelhas". A gravação mostra outra coisa.', 'A magazine printed that {act} called their own fans "sheep". The tape says otherwise.'],
    [
      o('correction', 'Exigir correção com a fita', 'Demand a correction with the tape', (s, _r, c) => { const a = A(s, c); pay(s, `correction:${a.id}`, legal(s, 800), 'legal', 'Notificação'); trust(a, 4); rep(s, 'institutional', 1); }),
      o('joke', 'Responder com humor', 'Respond with humor', (s, _r, c) => { const a = A(s, c); mom(a, 3); }),
      o('let', 'Deixar passar', 'Let it pass', (s, _r, c) => { mom(A(s, c), -4); }),
    ]),
  E('contract_leak', 'business', 'bad', [], 30,
    (s, r) => {
      if (!isLabel(s) || s.year < 1975) return null;
      const a = pick(s, r, (x) => !x.playerBand && !!x.contractId && s.contracts[x.contractId]?.royalty < 0.16);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Contrato de {act} vaza', '{act}\'s contract leaks'],
    ['Os royalties de {act} foram publicados num fórum. Outros artistas do elenco fazem as contas.', '{act}\'s royalty rate was posted on a forum. Other roster artists do the math.'],
    [
      o('raise', 'Melhorar os royalties do ato', 'Raise the act\'s royalties', (s, _r, c) => { const a = A(s, c); const k = a.contractId ? s.contracts[a.contractId] : undefined; if (k) k.royalty = Math.min(0.25, k.royalty + 0.03); trust(a, 10); rep(s, 'artists', 3); }),
      o('spin', 'Explicar o adiantamento e os custos', 'Explain the advance and costs', (s) => { rep(s, 'artists', -2); }),
      o('nothing', 'Não comentar', 'No comment', (s, _r, c) => { rep(s, 'artists', -4); trust(A(s, c), -5); }),
    ]),
  E('viral_clip', 'career', 'good', [], 6,
    (s, r) => {
      if (!hasTech(s, 'short_video')) return null;
      const a = pick(s, r, (x) => active(x) && x.fame < 60);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['Trecho de {act} viraliza', '{act} clip goes viral'],
    ['15 segundos de {act} explodem no Loopit (≈ TikTok). Criadores fazem milhares de vídeos com o trecho.', '15 seconds of {act} blow up on Loopit (≈ TikTok). Creators make thousands of videos with the snippet.'],
    [
      o('lean', 'Pagar criadores para manter a onda', 'Pay creators to keep the wave', (s, _r, c) => { const a = A(s, c); pay(s, `viral:${a.id}`, 3000, 'marketing', 'Criadores'); fame(a, 4); fans(a, 150000, 12000, 800); mom(a, 15); }),
      o('organic', 'Deixar orgânico', 'Keep it organic', (s, _r, c) => { const a = A(s, c); fame(a, 2); fans(a, 80000, 5000, 400); mom(a, 8); }),
    ]),
  E('meme_mockery', 'scandal', 'bad', [], 14,
    (s, r) => {
      if (!hasTech(s, 'internet')) return null;
      const a = pick(s, r, (x) => x.fame > 20);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['{act} virou meme (do jeito ruim)', '{act} became a meme (the bad way)'],
    ['Uma nota desafinada de {act} virou piada global com milhões de remixes.', 'A sour note from {act} became a global joke with millions of remixes.'],
    [
      o('laugh', 'Rir junto e lançar a "versão oficial"', 'Laugh along and drop the "official version"', (s, _r, c) => { const a = A(s, c); mom(a, 8); fans(a, 50000, 2000); mood(s, a, 'morale', -3); }),
      o('hide', 'Esconder-se até passar', 'Hide until it passes', (s, _r, c) => { const a = A(s, c); mood(s, a, 'morale', -10); mom(a, -6); }),
    ]),
  E('magazine_cover', 'career', 'good', [], 8,
    (s, r) => {
      const outs = Object.values(outletById).filter((x) => x.kind === 'magazine' && x.start <= s.year && (x.end === undefined || x.end >= s.year));
      const a = pick(s, r, (x) => x.fame > 30 && active(x));
      if (!a || !outs.length || !r.chance(0.3)) return null;
      const out = r.weighted(outs, (x) => (x.bias.favored.includes(fam(a)) ? 3 : x.bias.disfavored.includes(fam(a)) ? 0.1 : 1))!;
      return { act: a.id, outlet: displayName(out) };
    },
    ['Capa de {outlet}', 'Cover of {outlet}'],
    ['{outlet} quer {act} na capa da próxima edição. A sessão de fotos pode definir a imagem da década.', '{outlet} wants {act} on next issue\'s cover. The photo shoot may define the decade\'s image.'],
    [
      o('stylist', 'Contratar fotógrafo e figurinista de grife', 'Hire a top photographer and stylist', (s, _r, c) => { const a = A(s, c); pay(s, `cover:${a.id}`, 2500, 'marketing', 'Sessão de capa'); fame(a, 4); fans(a, 60000, 6000, 1000); rep(s, 'artistic', 1); }),
      o('basic', 'Aceitar como vier', 'Accept as is', (s, _r, c) => { const a = A(s, c); fame(a, 2.5); fans(a, 30000, 3000); }),
    ]),
  E('documentary_offer', 'career', 'good', [], 30,
    (s, r) => {
      if (s.year < 1990) return null;
      const a = pick(s, r, (x) => x.fame > 35);
      return a && r.chance(0.2) ? { act: a.id, fee: feeBy(a, 10000, 400, 50000) } : null;
    },
    ['Documentário sobre {act}', 'Documentary about {act}'],
    ['Streamflix (≈ Netflix) quer acesso total aos bastidores de {act} por um ano. Oferece {feeTxt}.', 'Streamflix (≈ Netflix) wants all-access to {act}\'s backstage for a year. Offers {feeTxt}.'],
    [
      o('full', 'Acesso total', 'Full access', (s, r, c) => { const a = A(s, c); split(s, a, `doc:${a.id}`, Number(c.fee), 'sync', 'Documentário'); fame(a, 5); fans(a, 200000, 15000, 3000); mood(s, a, 'stress', 15); if (r.chance(0.3)) { for (const p of crew(s, a)) p.resentment = clamp(p.resentment + 10, 0, 100); } }),
      o('curated', 'Acesso controlado (menos verba)', 'Controlled access (less money)', (s, _r, c) => { const a = A(s, c); split(s, a, `doc2:${a.id}`, Number(c.fee) * 0.4, 'sync', 'Documentário'); fame(a, 2); fans(a, 60000, 5000); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('biopic_rights', 'contract', 'good', [], 36,
    (s, r) => {
      const legends = Object.values(s.acts).filter((x) => (x.legend || x.hits > 2) && (x.status === 'retired' || x.status === 'split') && myRels(s, (rel) => rel.actId === x.id).length > 0);
      return legends.length && r.chance(0.2) ? { act: r.pick(legends).id, fee: 25000 } : null;
    },
    ['Cinebiografia de {act}', '{act} biopic'],
    ['Um estúdio quer filmar a vida de {act} e usar as masters do seu catálogo. Oferta: {feeTxt}.', 'A studio wants to film {act}\'s life using the masters in your catalog. Offer: {feeTxt}.'],
    [
      o('license', 'Licenciar o catálogo', 'License the catalog', (s, _r, c) => { gain(s, `biopic:${c.act}`, Number(c.fee), 'sync', 'Cinebiografia'); for (const rel of myRels(s, (x) => x.actId === c.act)) rel.appeal *= 1.3; log(s, 'biopic', 'Cinebiografia de {a} revive o catálogo.', '{a} biopic revives the catalog.', { a: A(s, c).name }, String(c.act), true); }),
      o('consult', 'Exigir consultoria criativa (menos verba)', 'Demand creative consulting (less money)', (s, _r, c) => { gain(s, `biopic2:${c.act}`, Number(c.fee) * 0.6, 'sync', 'Cinebiografia'); rep(s, 'artistic', 3); for (const rel of myRels(s, (x) => x.actId === c.act)) rel.appeal *= 1.2; }),
      o('refuse', 'Recusar', 'Refuse', noop),
    ]),
  E('interview_walkout', 'scandal', 'neutral', ['controversy'], 14,
    (s, r) => {
      const a = pick(s, r, (x) => x.fame > 25 && (traitIn(s, x, 'quarrelsome') || traitIn(s, x, 'big_ego')));
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    ['{act} abandona entrevista ao vivo', '{act} walks out of a live interview'],
    ['Irritado com uma pergunta, alguém de {act} arrancou o microfone e saiu do estúdio. O vídeo circula.', 'Annoyed by a question, someone in {act} ripped off the mic and left the studio. The video spreads.'],
    [
      o('own', 'Assumir e pedir desculpas ao apresentador', 'Own it and apologize to the host', (s, _r, c) => { const a = A(s, c); rep(s, 'institutional', 2); mom(a, -2); }),
      o('legend', 'Vender como "autenticidade"', 'Sell it as "authenticity"', (s, _r, c) => { const a = A(s, c); fame(a, 1.5); fans(a, 0, 3000, 1500); rep(s, 'institutional', -4); scandal(s, a.id, 'conduct', 25); }),
      o('nothing', 'Não comentar', 'No comment', (s, _r, c) => { mom(A(s, c), -3); }),
    ]),
];

// =====================================================================================
// 4. FANDOM: rituais, superfãs, haters e comunidades tóxicas
// =====================================================================================
const FANDOM: EventDef[] = [
  E('fan_club_founded', 'career', 'good', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.fans.active > 15000 && !s.flags[`fanclub:${x.id}`]);
      return a && r.chance(0.4) ? { act: a.id } : null;
    },
    ['Nasce o fã-clube oficial de {act}', '{act}\'s official fan club is born'],
    ['Fãs de {act} organizaram carteirinhas, boletins e encontros. Querem o selo oficial.', '{act} fans organized membership cards, newsletters and meetups. They want official status.'],
    [
      o('fund', 'Bancar o fã-clube (boletim, brindes)', 'Fund the fan club (newsletter, perks)', (s, _r, c) => { const a = A(s, c); s.flags[`fanclub:${a.id}`] = s.week; pay(s, `fanclub:${a.id}`, 1500, 'marketing', 'Fã-clube'); fans(a, 0, 3000, Math.round(a.fans.active * 0.06)); }),
      o('bless', 'Dar a bênção, sem verba', 'Give the blessing, no money', (s, _r, c) => { const a = A(s, c); s.flags[`fanclub:${a.id}`] = s.week; fans(a, 0, 1000, Math.round(a.fans.active * 0.02)); }),
    ]),
  E('fandom_name', 'career', 'good', [], 999,
    (s, r) => {
      if (s.year < 1990) return null;
      const a = pick(s, r, (x) => x.fans.core > 3000 && ['pop', 'asia_me', 'hiphop', 'rnb', 'latin'].includes(fam(x)) && !s.flags[`fandom:${x.id}`]);
      return a && r.chance(0.35) ? { act: a.id } : null;
    },
    ['Fandom de {act} ganha nome e cor', '{act}\'s fandom gets a name and colour'],
    ['Os fãs votaram: agora têm nome, cor oficial e um lightstick. Lojas querem licenciar o produto.', 'Fans voted: they now have a name, an official colour and a lightstick. Shops want to license the merch.'],
    [
      o('merch', 'Licenciar o lightstick', 'License the lightstick', (s, _r, c) => { const a = A(s, c); s.flags[`fandom:${a.id}`] = s.week; split(s, a, `lightstick:${a.id}`, Math.min(15000, 1000 + a.fans.core * 0.5), 'merch', 'Lightstick'); fans(a, 0, 2000, 1500); }),
      o('free', 'Deixar o símbolo livre para os fãs', 'Leave the symbol free for fans', (s, _r, c) => { const a = A(s, c); s.flags[`fandom:${a.id}`] = s.week; fans(a, 0, 3000, 3000); trust(a, 3); }),
    ]),
  E('superfan_tattoo', 'people', 'neutral', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => x.fans.core > 5000);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Superfã tatua {act}', 'Superfan tattoos {act}'],
    ['Um superfã tatuou o rosto de {act} nas costas e veio de ônibus de outro estado para mostrar.', 'A superfan tattooed {act}\'s face on their back and took a bus across the country to show it.'],
    [
      o('meet', 'Receber no camarim', 'Invite backstage', (s, _r, c) => { const a = A(s, c); mood(s, a, 'morale', 6); fans(a, 5000, 1000, 500); mom(a, 3); }),
      o('post', 'Repostar a foto', 'Repost the photo', (s, _r, c) => { fans(A(s, c), 8000, 800, 200); }),
      o('ignore', 'Agradecer de longe', 'Thank them from afar', noop),
    ]),
  E('obsessive_fan', 'people', 'bad', ['violence'], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.fame > 40);
      if (!a || !r.chance(0.15)) return null;
      return { act: a.id, person: r.pick(a.members) };
    },
    ['Fã obsessivo persegue {person}', 'Obsessive fan stalks {person}'],
    ['Alguém segue {person} ({act}) do hotel ao estúdio e deixa cartas na porta de casa.', 'Someone follows {person} ({act}) from hotel to studio and leaves letters at home.'],
    [
      o('security', 'Segurança particular', 'Private security', (s, _r, c) => { const a = A(s, c); pay(s, `security:${a.id}`, 3000, 'artist_dev', 'Segurança'); pmood(P(s, c), 'stress', -10); trust(a, 4); }),
      o('court', 'Medida protetiva na justiça', 'Restraining order', (s, _r, c) => { pay(s, `restrain:${c.person}`, legal(s, 1500), 'legal', 'Medida protetiva'); pmood(P(s, c), 'stress', -6); }),
      o('nothing', 'Não fazer nada', 'Do nothing', (s, _r, c) => { pmood(P(s, c), 'stress', 15); pmood(P(s, c), 'morale', -8); }),
    ]),
  E('toxic_fandom', 'scandal', 'bad', ['controversy'], 18,
    (s, r) => {
      if (s.year < 2008) return null;
      const a = pick(s, r, (x) => x.fans.core > 8000);
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    ['Fãs de {act} atacam um crítico', '{act} fans attack a critic'],
    ['Depois de uma resenha negativa, fãs de {act} inundam o crítico de ofensas. A imprensa cobra uma posição.', 'After a negative review, {act} fans flood the critic with abuse. The press demands a stance.'],
    [
      o('condemn', 'Condenar publicamente', 'Condemn publicly', (s, _r, c) => { const a = A(s, c); fansMul(a, 1, 0.97, 0.92); rep(s, 'institutional', 4); rep(s, 'artistic', 1); }),
      o('vague', 'Nota vaga pedindo "paz"', 'Vague note asking for "peace"', (s) => { rep(s, 'institutional', -1); }),
      o('silent', 'Silêncio', 'Silence', (s, _r, c) => { rep(s, 'institutional', -4); scandal(s, A(s, c).id, 'conduct', 20); }),
    ]),
  E('fan_war', 'culture', 'neutral', [], 12,
    (s, r) => {
      if (s.year < 2005) return null;
      const a = pick(s, r, (x) => x.fans.core > 5000 && ['pop', 'hiphop', 'asia_me', 'latin', 'rnb'].includes(fam(x)));
      if (!a) return null;
      const rivals = Object.values(s.acts).filter((x) => x.owner && x.owner !== 'player' && fam(x) === fam(a) && x.fame > a.fame * 0.6);
      return rivals.length && r.chance(0.3) ? { act: a.id, rival: r.pick(rivals).name } : null;
    },
    ['Guerra de fandoms: {act} × {rival}', 'Fandom war: {act} vs {rival}'],
    ['Os fãs de {act} e de {rival} disputam a mesma semana de lançamento. Há mutirões de streaming e trocas de ofensas.', '{act} and {rival} fans fight over the same release week. Streaming parties and insults fly.'],
    [
      o('fuel', 'Alimentar a rivalidade', 'Fuel the rivalry', (s, _r, c) => { const a = A(s, c); mom(a, 12); fans(a, 20000, 5000, 1000); rep(s, 'institutional', -3); }),
      o('collab', 'Propor colaboração entre os dois', 'Propose a collaboration between them', (s, r, c) => { const a = A(s, c); if (r.chance(0.4)) { fame(a, 3); fans(a, 60000, 6000); rep(s, 'institutional', 3); } else mom(a, 3); }),
      o('calm', 'Pedir calma', 'Ask for calm', (s, _r, c) => { mom(A(s, c), 2); }),
    ]),
  E('streaming_party', 'market', 'good', [], 8,
    (s, r) => {
      if (!hasTech(s, 'streaming')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 4 && (s.acts[x.actId]?.fans.core ?? 0) > 5000)[0];
      return rel && r.chance(0.4) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Mutirão de streaming para "{releaseTitle}"', 'Streaming party for "{releaseTitle}"'],
    ['Os fãs criaram contas extras e playlists em loop para empurrar "{releaseTitle}" à parada. Críticos falam em manipulação.', 'Fans made extra accounts and looped playlists to push "{releaseTitle}" up the chart. Critics cry manipulation.'],
    [
      o('endorse', 'Agradecer e incentivar', 'Thank and encourage', (s, r, c) => { appeal(s, c, 1.15); if (r.chance(0.3)) { appeal(s, c, 0.85); rep(s, 'institutional', -4); notify(s, l('A parada descontou streams suspeitos.', 'The chart discounted suspicious streams.'), 'bad'); } }),
      o('guide', 'Pedir que sigam as regras da parada', 'Ask them to follow chart rules', (s, _r, c) => { appeal(s, c, 1.06); rep(s, 'institutional', 1); }),
    ]),
  E('review_bombing', 'scandal', 'bad', [], 14,
    (s, r) => {
      if (!hasTech(s, 'internet')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 6)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Haters derrubam a nota de "{releaseTitle}"', 'Haters tank "{releaseTitle}"\'s rating'],
    ['Uma comunidade rival deu nota mínima a "{releaseTitle}" em massa antes mesmo do lançamento.', 'A rival community mass-rated "{releaseTitle}" at the minimum before it even came out.'],
    [
      o('report', 'Denunciar à plataforma', 'Report to the platform', (s, r, c) => { pay(s, `bomb:${c.release}`, 400, 'marketing', 'Denúncia'); if (r.chance(0.6)) appeal(s, c, 1.02); else appeal(s, c, 0.95); }),
      o('humor', 'Responder com humor', 'Respond with humor', (s, _r, c) => { const a = A(s, c); mom(a, 4); appeal(s, c, 0.97); }),
      o('ignore', 'Ignorar', 'Ignore', (s, _r, c) => { appeal(s, c, 0.93); }),
    ]),
  E('fan_letter', 'people', 'good', [], 8,
    (s, r) => {
      const a = pick(s, r, (x) => crew(s, x).some((p) => p.inspiration < 45));
      return a && r.chance(0.25) ? { act: a.id } : null;
    },
    ['Uma carta para {act}', 'A letter for {act}'],
    ['Uma fã escreveu que uma música de {act} a ajudou a atravessar o pior ano da vida. A banda leu em voz alta no ensaio.', 'A fan wrote that a {act} song got her through the worst year of her life. The band read it aloud at rehearsal.'],
    [
      o('reply', 'Responder à mão e convidar para o show', 'Reply by hand and invite to the show', (s, _r, c) => { const a = A(s, c); mood(s, a, 'inspiration', 20); mood(s, a, 'morale', 8); fans(a, 0, 0, 100); }),
      o('frame', 'Emoldurar no estúdio', 'Frame it in the studio', (s, _r, c) => { mood(s, A(s, c), 'inspiration', 12); }),
    ]),
  E('crowdfund_album', 'business', 'good', [], 24,
    (s, r) => {
      if (s.year < 2009) return null;
      const a = pick(s, r, (x) => x.fans.core > 2500 && (x.playerBand || x.trust > 40));
      return a && r.chance(0.25) ? { act: a.id, amount: Math.min(40000, 2000 + Math.round(a.fans.core * 1.5)) } : null;
    },
    ['Fãs querem financiar o disco de {act}', 'Fans want to fund {act}\'s album'],
    ['Uma campanha de financiamento coletivo pode levantar {amountTxt} em pré-vendas e recompensas.', 'A crowdfunding campaign could raise {amountTxt} in pre-sales and rewards.'],
    [
      o('launch', 'Lançar a campanha', 'Launch the campaign', (s, r, c) => { const a = A(s, c); const got = Number(c.amount) * (r.chance(0.7) ? 1 : 0.4); split(s, a, `crowd:${a.id}`, got, 'sales', 'Financiamento coletivo', 0.3); fans(a, 0, 2000, 1500); trust(a, 4); }),
      o('no', 'Não precisamos', 'We don\'t need it', noop),
    ]),
  E('taper_bootlegs', 'market', 'neutral', [], 18,
    (s, r) => {
      if (!era(s, 1966, 2005) || !hasTech(s, 'cassette')) return null;
      const a = pick(s, r, (x) => recentGig(s, x, 12) && x.fans.core > 1500);
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Gravações piratas dos shows de {act}', 'Bootleg tapes of {act} shows'],
    ['Fãs gravam cada show de {act} e trocam fitas por correio. Uma comunidade de "tapers" pede permissão oficial.', 'Fans tape every {act} show and trade cassettes by mail. A "taper" community asks for official permission.'],
    [
      o('allow', 'Liberar a gravação (sem venda)', 'Allow taping (no selling)', (s, _r, c) => { const a = A(s, c); fans(a, 5000, 4000, 2500); trust(a, 2); }),
      o('official', 'Lançar um ao vivo oficial', 'Release an official live album', (s, _r, c) => { const a = A(s, c); pay(s, `livealb:${a.id}`, 1500, 'release', 'Ao vivo oficial'); split(s, a, `livealbg:${a.id}`, Math.min(12000, 1500 + a.fans.core * 1.2), 'sales', 'Disco ao vivo'); }),
      o('ban', 'Proibir gravadores', 'Ban recorders', (s, _r, c) => { const a = A(s, c); fansMul(a, 1, 0.97, 0.95); }),
    ]),
  E('fan_theory', 'culture', 'neutral', [], 18,
    (s, r) => {
      if (s.year < 1967) return null;
      const a = pick(s, r, (x) => x.fans.active > 20000);
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Teoria dos fãs sobre {act}', 'Fan theory about {act}'],
    ['Fãs juram que as capas de {act} escondem um enredo secreto. Fóruns inteiros decifram "pistas".', 'Fans swear {act}\'s covers hide a secret storyline. Whole forums decode "clues".'],
    [
      o('play', 'Plantar novas pistas no próximo disco', 'Plant new clues on the next record', (s, _r, c) => { const a = A(s, c); pay(s, `clues:${a.id}`, 800, 'marketing', 'Arte com pistas'); fans(a, 10000, 6000, 1500); mom(a, 6); }),
      o('deny', 'Desmentir com bom humor', 'Deny it with good humour', (s, _r, c) => { mom(A(s, c), 2); }),
    ]),
  E('fan_pilgrimage', 'culture', 'good', [], 30,
    (s, r) => {
      const a = pick(s, r, (x) => (x.legend || x.hits > 2) && x.fans.core > 8000);
      return a && r.chance(0.2) ? { act: a.id, city: a.city } : null;
    },
    ['Peregrinação a {cityName}', 'Pilgrimage to {cityName}'],
    ['Fãs de {act} viajam a {cityName} para ver o bar do primeiro show. A prefeitura quer uma placa.', '{act} fans travel to {cityName} to see the bar of the first gig. The city wants a plaque.'],
    [
      o('plaque', 'Apoiar a placa e um show na cidade', 'Back the plaque and a hometown show', (s, _r, c) => { const a = A(s, c); fame(a, 1.5); fans(a, 20000, 3000, 2000); rep(s, 'institutional', 2); s.scenes[`${a.city}:${a.genre}`] = (s.scenes[`${a.city}:${a.genre}`] ?? 0) + 3; }),
      o('ok', 'Que bonito', 'How lovely', (s, _r, c) => { fans(A(s, c), 0, 0, 500); }),
    ]),
];

// =====================================================================================
// 5. ERAS TECNOLÓGICAS (8-track, cassete, CD, P2P, ringtones, vídeo curto…)
// =====================================================================================
const TECH: EventDef[] = [
  E('eight_track_bundle', 'tech', 'good', [], 30,
    (s, r) => {
      if (!era(s, 1966, 1980) || !isLabel(s)) return null;
      const rel = myRels(s, (x) => x.type === 'lp' && x.totalUnits > 10000)[0];
      return rel && r.chance(0.3) ? { release: rel.id, act: rel.actId, fee: 2500 } : null;
    },
    ['"{releaseTitle}" em cartucho 8-track', '"{releaseTitle}" on 8-track'],
    ['Uma montadora (≈ Ford) quer "{releaseTitle}" em 8-track como brinde nos carros novos. Oferta: {feeTxt}.', 'A carmaker (≈ Ford) wants "{releaseTitle}" on 8-track as a freebie in new cars. Offer: {feeTxt}.'],
    [
      o('deal', 'Fechar', 'Close the deal', (s, _r, c) => { gain(s, `8track:${c.release}`, Number(c.fee), 'sales', '8-track'); appeal(s, c, 1.05); }),
      o('pass', 'Passar', 'Pass', noop),
    ]),
  E('home_taping', 'tech', 'bad', [], 36,
    (s, r) => (era(s, 1978, 1995) && hasTech(s, 'cassette') && isLabel(s) && r.chance(0.3) ? {} : null),
    ['"Gravar em casa está matando a música"', '"Home taping is killing music"'],
    ['Fitas virgens vendem mais que discos. A AMIF (≈ IFPI) propõe uma taxa sobre fitas virgens e uma campanha com caveira.', 'Blank tapes outsell records. AMIF (≈ IFPI) proposes a blank-tape levy and a skull-logo campaign.'],
    [
      o('levy', 'Apoiar a taxa', 'Support the levy', (s) => { rep(s, 'institutional', 4); rep(s, 'commercial', 1); for (const a of mine(s)) fansMul(a, 0.99, 1, 1); }),
      o('mixtape', 'Abraçar as mixtapes (lado B gravável)', 'Embrace mixtapes (blank B-side)', (s) => { rep(s, 'institutional', -3); rep(s, 'artistic', 3); for (const a of mine(s)) fans(a, 5000, 1000); }),
      o('ignore', 'Ignorar', 'Ignore', noop),
    ]),
  E('walkman_ad', 'contract', 'good', [], 24,
    (s, r) => {
      if (!era(s, 1979, 1995)) return null;
      const a = pick(s, r, (x) => x.fame > 20 && ['pop', 'rock', 'electronic', 'asia_me'].includes(fam(x)));
      return a && r.chance(0.25) ? { act: a.id, fee: feeBy(a, 6000, 250, 30000) } : null;
    },
    ['Pocketone quer {act} no comercial', 'Pocketone wants {act} in its ad'],
    ['A Pocketone (≈ Sony Walkman) quer uma música de {act} no comercial de fones na rua. Cachê: {feeTxt}.', 'Pocketone (≈ Sony Walkman) wants a {act} song in its street-headphones ad. Fee: {feeTxt}.'],
    [
      o('sign', 'Licenciar', 'License', (s, _r, c) => { const a = A(s, c); split(s, a, `walkman:${a.id}`, Number(c.fee), 'sync', 'Comercial'); fame(a, 2.5); fans(a, 60000, 3000); if (ambitionIn(s, a, 'art')) trust(a, -4); }),
      o('pass', 'Recusar', 'Decline', noop),
    ]),
  E('cd_catalog_boom', 'tech', 'good', [], 999,
    (s) => (hasTech(s, 'cd') && era(s, 1985, 2000) && isLabel(s) && !s.flags.cdBoom && myRels(s, (x) => s.year - x.year > 10).length >= 3 ? { n: myRels(s, (x) => s.year - x.year > 10).length } : null),
    ['Febre do CD: o catálogo vale ouro', 'CD fever: the catalog is gold'],
    ['Todo mundo recompra a coleção em CD. Seus {n} lançamentos antigos podem virar caixas remasterizadas.', 'Everyone is rebuying their collection on CD. Your {n} old releases could become remastered box sets.'],
    [
      o('remaster', 'Remasterizar tudo', 'Remaster everything', (s, _r, c) => { s.flags.cdBoom = s.week; pay(s, 'cd_remaster', 1500 + Number(c.n) * 300, 'release', 'Remasterização'); gain(s, 'cd_comp', 2000 + Number(c.n) * 900, 'sales', 'Coletâneas em CD'); for (const rel of myRels(s, (x) => s.year - x.year > 10)) rel.appeal *= 1.15; }),
      o('license', 'Licenciar para coletâneas', 'License to compilations', (s, _r, c) => { s.flags.cdBoom = s.week; gain(s, 'cd_lic', 1000 + Number(c.n) * 400, 'sales', 'Licença de coletânea'); }),
    ]),
  E('minidisc_bet', 'tech', 'neutral', [], 999,
    (s) => (era(s, 1992, 1997) && isLabel(s) && !s.flags.minidisc ? {} : null),
    ['Apostar no MiniDisc?', 'Bet on MiniDisc?'],
    ['Um fabricante de eletrônicos oferece subsídio parcial para lançar o catálogo em MiniDisc. Elegante, regravável — e talvez ignorado.', 'An electronics maker offers a partial subsidy to put the catalog on MiniDisc. Elegant, rewritable — and maybe ignored.'],
    [
      o('bet', 'Apostar', 'Bet on it', (s, r) => { s.flags.minidisc = s.week; pay(s, 'minidisc', 2500, 'release', 'MiniDisc'); if (r.chance(0.25)) gain(s, 'minidisc_win', 6000, 'sales', 'Vendas em MiniDisc'); rep(s, 'commercial', 1); }),
      o('skip', 'Não apostar', 'Skip it', (s) => { s.flags.minidisc = s.week; }),
    ]),
  E('p2p_prerelease_leak', 'tech', 'bad', [], 12,
    (s, r) => {
      if (!era(s, 1999, 2010) || !hasTech(s, 'p2p')) return null;
      const p = s.pendingReleases[0];
      return p && r.chance(0.35) ? { pending: p.id, act: p.actId } : null;
    },
    ['"{pendingTitle}" vazou no ShareWave', '"{pendingTitle}" leaked on ShareWave'],
    ['Semanas antes do lançamento, "{pendingTitle}" já circula no ShareWave (≈ Napster).', 'Weeks before release, "{pendingTitle}" is already on ShareWave (≈ Napster).'],
    [
      o('sue_fans', 'Processar quem baixou', 'Sue the downloaders', (s) => { pay(s, 'sue_fans', legal(s, 4000), 'legal', 'Processos'); rep(s, 'artists', -4); rep(s, 'commercial', -2); for (const a of mine(s)) fansMul(a, 0.97, 0.97, 0.98); }),
      o('rush', 'Antecipar o lançamento', 'Move the release up', (s, _r, c) => { const p = s.pendingReleases.find((x) => x.id === c.pending); if (p) p.week = Math.max(s.week + 1, p.week - 2); }),
      o('drm', 'Proteção anticópia no CD', 'Copy protection on the CD', (s, r) => { pay(s, 'drm', 1500, 'release', 'Proteção anticópia'); if (r.chance(0.4)) rep(s, 'commercial', -4); }),
      o('embrace', 'Abraçar e focar no show', 'Embrace it and focus on live', (s, _r, c) => { const a = A(s, c); if (a) { fans(a, 20000, 4000); mom(a, 6); } }),
    ]),
  E('myplace_discovery', 'scouting', 'good', [], 6,
    (s, r) => {
      if (!era(s, 2004, 2011) || !isLabel(s)) return null;
      const cands = Object.values(s.acts).filter((x) => !x.owner && active(x) && !s.knowledge[x.id] && x.potential > 55);
      return cands.length && r.chance(0.4) ? { act: r.pick(cands).id } : null;
    },
    ['{act} bomba no MyPlace', '{act} blowing up on MyPlace'],
    ['O perfil de {act} no MyPlace (≈ MySpace) tem milhões de plays e um top 8 cheio de bandas conhecidas.', '{act}\'s MyPlace (≈ MySpace) profile has millions of plays and a top 8 full of known bands.'],
    [
      o('watch', 'Pôr no radar', 'Add to the radar', (s, r, c) => { signal(s, r, String(c.act), 2); }),
      o('pass', 'Passar', 'Pass', noop),
    ]),
  E('ringtone_deal', 'tech', 'good', [], 12,
    (s, r) => {
      if (!era(s, 2002, 2011)) return null;
      const rel = myRels(s, (x) => x.type === 'single' && x.totalUnits > 15000 && s.week - x.week < 60)[0];
      return rel && r.chance(0.35) ? { release: rel.id, act: rel.actId, fee: Math.round(Math.min(25000, 1500 + Math.sqrt(rel.totalUnits) * 25)) } : null;
    },
    ['Ringtone de "{releaseTitle}"', '"{releaseTitle}" ringtone'],
    ['A ToqueMania (≈ Jamster) quer o refrão de "{releaseTitle}" como ringtone. Adiantamento: {feeTxt}.', 'ToqueMania (≈ Jamster) wants the hook of "{releaseTitle}" as a ringtone. Advance: {feeTxt}.'],
    [
      o('yes', 'Licenciar o refrão', 'License the hook', (s, _r, c) => { const a = A(s, c); split(s, a, `ring:${c.release}`, Number(c.fee), 'sales', 'Ringtone'); fans(a, 30000); rep(s, 'artistic', -1); }),
      o('no', 'Recusar (é uma canção, não um toque)', 'Refuse (it\'s a song, not a ringtone)', (s, _r, c) => { if (ambitionIn(s, A(s, c), 'art')) trust(A(s, c), 3); }),
    ]),
  E('download_unbundling', 'tech', 'neutral', [], 999,
    (s) => (hasTech(s, 'download') && isLabel(s) && !s.flags.unbundle && s.year <= 2012 ? {} : null),
    ['TuneShop quer vender faixas avulsas', 'TuneShop wants to sell single tracks'],
    ['A TuneShop (≈ iTunes Store) exige o catálogo faixa a faixa a 99 centavos. Álbuns inteiros deixarão de ser comprados.', 'TuneShop (≈ iTunes Store) demands the catalog track-by-track at 99 cents. Whole albums will stop selling.'],
    [
      o('all', 'Liberar tudo', 'Release everything', (s) => { s.flags.unbundle = s.week; rep(s, 'commercial', 4); for (const rel of myRels(s, (x) => x.type === 'single')) rel.appeal *= 1.08; }),
      o('albums', 'Só álbuns completos', 'Full albums only', (s) => { s.flags.unbundle = s.week; rep(s, 'artistic', 3); rep(s, 'commercial', -3); }),
    ]),
  E('playlist_pitch', 'market', 'neutral', ['crime'], 12,
    (s, r) => {
      if (!hasTech(s, 'streaming')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 5)[0];
      return rel && r.chance(0.3) ? { release: rel.id, act: rel.actId } : null;
    },
    ['"Curador" oferece playlist', '"Curator" offers a playlist slot'],
    ['Um curador de playlists de 2 milhões de seguidores oferece lugar para "{releaseTitle}"... por um "cachê de divulgação".', 'A 2-million-follower playlist curator offers a slot for "{releaseTitle}"... for a "promo fee".'],
    [
      o('pay', 'Pagar o cachê', 'Pay the fee', (s, r, c) => { pay(s, `plpay:${c.release}`, 1500, 'marketing', 'Divulgação (?)'); appeal(s, c, 1.15); if (r.chance(0.25)) { rep(s, 'institutional', -6); appeal(s, c, 0.8); notify(s, l('A plataforma removeu a faixa da playlist paga.', 'The platform removed the track from the paid playlist.'), 'bad'); } }, ['Funciona até a plataforma descobrir.', 'Works until the platform finds out.']),
      o('pitch', 'Fazer o pitch editorial oficial', 'Use the official editorial pitch', (s, r, c) => { if (r.chance(0.3 + staffSkill(s, 'publicist') / 200)) appeal(s, c, 1.12); }),
      o('refuse', 'Recusar', 'Refuse', (s) => { rep(s, 'institutional', 1); }),
    ]),
  E('stream_fraud', 'scandal', 'bad', ['crime'], 24,
    (s, r) => {
      if (!hasTech(s, 'streaming')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 10 && x.totalUnits > 5000)[0];
      return rel && r.chance(0.12) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Streams falsos em "{releaseTitle}"', 'Fake streams on "{releaseTitle}"'],
    ['A plataforma detectou bots em "{releaseTitle}" — comprados por um distribuidor terceirizado, sem seu conhecimento.', 'The platform detected bots on "{releaseTitle}" — bought by a third-party distributor without your knowledge.'],
    [
      o('cooperate', 'Cooperar e trocar de distribuidor', 'Cooperate and switch distributors', (s, _r, c) => { pay(s, `fraud:${c.release}`, 1000, 'legal', 'Auditoria'); appeal(s, c, 0.9); rep(s, 'institutional', 2); }),
      o('blame', 'Culpar o distribuidor publicamente', 'Blame the distributor publicly', (s, _r, c) => { appeal(s, c, 0.85); rep(s, 'institutional', -1); }),
    ]),
  E('dance_challenge', 'tech', 'good', [], 8,
    (s, r) => {
      if (!hasTech(s, 'short_video')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 12 && ['pop', 'hiphop', 'africa', 'latin', 'caribbean', 'brazil', 'electronic'].includes(familyOf(s.acts[x.actId]?.genre ?? 'pop')))[0];
      return rel && r.chance(0.35) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Desafio de dança com "{releaseTitle}"', 'Dance challenge with "{releaseTitle}"'],
    ['Uma coreografia de 15 segundos com "{releaseTitle}" pode virar trend. Criadores pedem cachê.', 'A 15-second routine to "{releaseTitle}" could trend. Creators want paying.'],
    [
      o('creators', 'Pagar 20 criadores', 'Pay 20 creators', (s, r, c) => { const a = A(s, c); pay(s, `dance:${c.release}`, 2500, 'marketing', 'Criadores'); if (r.chance(0.6)) { appeal(s, c, 1.3); fans(a, 120000, 8000); } else appeal(s, c, 1.05); }),
      o('organic', 'Ensinar a coreografia e torcer', 'Teach the routine and hope', (s, r, c) => { if (r.chance(0.35)) { appeal(s, c, 1.2); fans(A(s, c), 60000, 3000); } }),
    ]),
  E('sped_up_version', 'tech', 'neutral', [], 12,
    (s, r) => {
      if (!hasTech(s, 'short_video')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 30 && x.totalUnits > 3000)[0];
      return rel && r.chance(0.25) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Fãs preferem a versão acelerada', 'Fans prefer the sped-up version'],
    ['Uma versão acelerada não oficial de "{releaseTitle}" tem mais plays que a original.', 'An unofficial sped-up version of "{releaseTitle}" has more plays than the original.'],
    [
      o('official', 'Lançar a versão acelerada oficial', 'Release the official sped-up version', (s, _r, c) => { pay(s, `sped:${c.release}`, 300, 'release', 'Versão acelerada'); appeal(s, c, 1.15); const a = A(s, c); if (ambitionIn(s, a, 'art')) trust(a, -4); }),
      o('takedown', 'Derrubar a pirata', 'Take down the bootleg', (s, _r, c) => { pay(s, `spedtd:${c.release}`, legal(s, 500), 'legal', 'Remoção'); appeal(s, c, 0.97); }),
      o('ignore', 'Deixar rolar', 'Let it ride', (s, _r, c) => { appeal(s, c, 1.04); }),
    ]),
  E('ai_cover_flood', 'neural', 'bad', ['legal'], 12,
    (s, r) => {
      if (!hasTech(s, 'synthetic_voice')) return null;
      const a = pick(s, r, (x) => x.fame > 25 && x.archetype !== 'synthetic');
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Enxurrada de covers de IA com a voz de {act}', 'Flood of AI covers in {act}\'s voice'],
    ['Milhares de faixas geradas imitam {act} cantando de tudo, de jingles a hinos de time.', 'Thousands of generated tracks mimic {act} singing everything from jingles to football chants.'],
    [
      o('takedown', 'Notificações em massa', 'Mass takedowns', (s, _r, c) => { pay(s, `aitd:${c.act}`, legal(s, 3000), 'legal', 'Remoções'); trust(A(s, c), 5); }),
      o('license', 'Licenciar via Voxera com consentimento', 'License via Voxera with consent', (s, r, c) => { const a = A(s, c); if (r.chance(0.4 + a.trust / 200)) { split(s, a, `aivox:${a.id}`, 4000 + a.fame * 150, 'neural', 'Licença de voz', 0.4); s.player.neural.voiceLicenses += 1; } else trust(a, -6); }),
      o('ignore', 'Ignorar', 'Ignore', (s, _r, c) => { trust(A(s, c), -4); }),
    ]),
];

// =====================================================================================
// 6. PALCO: acidentes, cancelamentos e imprevistos
// =====================================================================================
const LIVE: EventDef[] = [
  E('power_outage', 'stage', 'bad', [], 10,
    (s, r) => {
      if (s.year < 1935) return null;
      const a = pick(s, r, (x) => recentGig(s, x, 7));
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Apagão no show de {act}', 'Blackout at {act}\'s show'],
    ['No meio do terceiro número, a luz caiu. Duas mil pessoas no escuro.', 'Midway through the third song, the power died. Two thousand people in the dark.'],
    [
      o('acoustic', 'Seguir no acústico, com o público cantando', 'Go acoustic, crowd singing along', (s, r, c) => { const a = A(s, c); const stage = crew(s, a).reduce((t, p) => t + p.skills.stage, 0) / Math.max(1, crew(s, a).length); if (r.chance(stage / 110)) { fame(a, 2); fans(a, 5000, 2000, 1500); mood(s, a, 'morale', 10); log(s, 'blackout', 'O show acústico no escuro vira lenda de {a}.', 'The acoustic blackout show becomes {a} legend.', { a: a.name }, a.id); } else mom(a, -4); }),
      o('refund', 'Encerrar e devolver ingressos', 'End it and refund tickets', (s, _r, c) => { const a = A(s, c); if (a.playerBand) pay(s, `outage:${a.id}`, 1500, 'live_costs', 'Reembolso'); else a.cash -= Math.min(a.cash, money(s, 1500)); }),
      o('wait', 'Esperar a luz voltar', 'Wait for the power', (s, _r, c) => { mom(A(s, c), -2); }),
    ]),
  E('festival_storm', 'stage', 'bad', [], 12,
    (s, r) => {
      const a = pick(s, r, (x) => s.memory.some((m) => m.actId === x.id && m.kind === 'festival' && s.week - m.week < 4));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Tempestade no festival', 'Storm at the festival'],
    ['Raios cancelam o set de {act} no festival. A organização oferece remarcar para o fim da noite, com metade do público.', 'Lightning cancels {act}\'s festival set. Organizers offer a late-night slot with half the crowd.'],
    [
      o('late', 'Tocar de madrugada para os fiéis', 'Play late for the faithful', (s, _r, c) => { const a = A(s, c); fans(a, 0, 3000, 2500); mood(s, a, 'fatigue', 10); }),
      o('mud', 'Tocar na chuva mesmo (risco)', 'Play in the rain anyway (risky)', (s, r, c) => { const a = A(s, c); if (r.chance(0.6)) { fame(a, 3); fans(a, 30000, 5000, 2000); log(s, 'storm_set', '{a} faz o show na tempestade.', '{a} plays through the storm.', { a: a.name }, a.id); } else { pay(s, `stormgear:${a.id}`, 3000, 'live_costs', 'Equipamento molhado'); } }),
      o('cancel', 'Cancelar', 'Cancel', (s, _r, c) => { mom(A(s, c), -3); }),
    ]),
  E('gear_stolen', 'stage', 'bad', ['crime'], 18,
    (s, r) => {
      const a = pick(s, r, (x) => recentGig(s, x, 8) && x.members.length >= 2);
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['Equipamento de {act} roubado', '{act}\'s gear stolen'],
    ['Arrombaram a van de {act}. Foram-se guitarras, amplificadores e a fita com as demos.', 'Someone broke into {act}\'s van. Guitars, amps and the demo tape are gone.'],
    [
      o('replace', 'Repor tudo', 'Replace everything', (s, _r, c) => { pay(s, `stolen:${c.act}`, 4000, 'equipment', 'Reposição'); mood(s, A(s, c), 'morale', -4); }),
      o('appeal', 'Apelo aos fãs e à imprensa', 'Appeal to fans and press', (s, r, c) => { const a = A(s, c); fans(a, 5000, 1000, 500); if (r.chance(0.4)) mood(s, a, 'morale', 6); else pay(s, `stolen2:${a.id}`, 2000, 'equipment', 'Reposição parcial'); }),
      o('borrow', 'Pegar emprestado e seguir', 'Borrow gear and carry on', (s, _r, c) => { const a = A(s, c); mood(s, a, 'morale', -8); a.rehearsed = Math.max(0, a.rehearsed - 20); }),
    ]),
  E('visa_denied', 'stage', 'bad', [], 18,
    (s, r) => {
      if (s.year < 1950) return null;
      const a = pick(s, r, (x) => active(x) && x.fame > 20 && ['africa', 'latam', 'asia', 'br'].includes(mkt(x)));
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['Visto negado para {act}', 'Visa denied for {act}'],
    ['O consulado negou os vistos de trabalho de {act} a duas semanas da turnê no exterior.', 'The consulate denied {act}\'s work visas two weeks before the overseas tour.'],
    [
      o('lawyer', 'Advogado de imigração (taxa de urgência)', 'Immigration lawyer (rush fee)', (s, r, c) => { const a = A(s, c); pay(s, `visa:${a.id}`, legal(s, 3500), 'legal', 'Vistos'); if (!r.chance(winOdds(s, 0.55))) mom(a, -6); }),
      o('virtual', 'Fazer a turnê por transmissão (se houver)', 'Do it as a broadcast (if possible)', (s, _r, c) => { const a = A(s, c); if (hasTech(s, 'streaming')) fans(a, 20000, 2000); else mom(a, -4); }),
      o('cancel', 'Cancelar a perna internacional', 'Cancel the international leg', (s, _r, c) => { const a = A(s, c); mom(a, -8); mood(s, a, 'morale', -6); }),
    ]),
  E('promoter_vanishes', 'stage', 'bad', ['crime'], 24,
    (s, r) => {
      const a = pick(s, r, (x) => recentGig(s, x, 8));
      return a && r.chance(0.12) ? { act: a.id, fee: feeBy(a, 1000, 80, 12000) } : null;
    },
    ['Promotor some com a bilheteria', 'Promoter vanishes with the box office'],
    ['O promotor dos últimos shows de {act} sumiu com {feeTxt} da bilheteria.', 'The promoter of {act}\'s last shows disappeared with {feeTxt} of ticket money.'],
    [
      o('sue', 'Processar', 'Sue', (s, r, c) => { const a = A(s, c); pay(s, `promsue:${a.id}`, legal(s, 2500), 'legal', 'Processo'); if (r.chance(winOdds(s, 0.4))) split(s, a, `promwin:${a.id}`, Number(c.fee) * 0.7, 'live', 'Recuperação'); }),
      o('cover', 'Pagar a equipe do próprio bolso', 'Pay the crew out of pocket', (s, _r, c) => { const a = A(s, c); pay(s, `promcov:${a.id}`, Math.min(5000, Number(c.fee) * 0.3), 'live_costs', 'Equipe'); trust(a, 5); }),
      o('absorb', 'Absorver o prejuízo', 'Absorb the loss', (s, _r, c) => { mood(s, A(s, c), 'morale', -8); }),
    ]),
  E('stage_fall', 'health', 'bad', ['health', 'violence'], 18,
    (s, r) => {
      const a = pick(s, r, (x) => recentGig(s, x, 7) && crew(s, x).some((p) => p.fatigue > 50));
      if (!a || !r.chance(0.2)) return null;
      return { act: a.id, person: crew(s, a).sort((x, y) => y.fatigue - x.fatigue)[0].id };
    },
    ['{person} cai do palco', '{person} falls off stage'],
    ['Exausto, {person} ({act}) errou o passo e caiu do palco. Fratura no pé.', 'Exhausted, {person} ({act}) missed a step and fell off the stage. Broken foot.'],
    [
      o('rest', 'Parar 6 semanas', 'Stop for 6 weeks', (s, _r, c) => { const a = A(s, c); hiatus(s, a, 6); pmood(P(s, c), 'fatigue', -40); pay(s, `fall:${c.person}`, 1500, 'artist_dev', 'Tratamento'); }),
      o('chair', 'Tocar sentado no resto da turnê', 'Play seated for the rest of the tour', (s, _r, c) => { const a = A(s, c); fans(a, 5000, 1000, 600); pmood(P(s, c), 'stress', 10); }),
    ]),
  E('crowd_surge', 'stage', 'bad', ['violence'], 24,
    (s, r) => {
      if (s.year < 1955) return null;
      const a = pick(s, r, (x) => recentGig(s, x, 7) && x.fame > 35 && ['rock', 'hiphop', 'electronic', 'pop'].includes(fam(x)));
      return a && r.chance(0.12) ? { act: a.id } : null;
    },
    ['Empurra-empurra no show de {act}', 'Crowd crush at {act}\'s show'],
    ['A grade da frente cedeu na abertura de {act}. Há pessoas passando mal.', 'The front barrier buckled as {act} opened. People are fainting.'],
    [
      o('stop', 'Parar o show até tudo se acalmar', 'Stop the show until it calms down', (s, _r, c) => { const a = A(s, c); rep(s, 'institutional', 4); fans(a, 0, 1000, 800); mood(s, a, 'stress', 8); }),
      o('safety', 'Parar e pagar estrutura nova para a turnê', 'Stop and pay for new safety gear for the tour', (s, _r, c) => { const a = A(s, c); pay(s, `safety:${a.id}`, 5000, 'live_costs', 'Segurança'); rep(s, 'institutional', 6); }),
      o('continue', 'Continuar tocando', 'Keep playing', (s, r, c) => { const a = A(s, c); if (r.chance(0.3)) { pay(s, `surge:${a.id}`, 8000, 'legal', 'Indenizações'); rep(s, 'institutional', -8); scandal(s, a.id, 'violence', 40); } }),
    ]),
  E('opener_steals_show', 'stage', 'neutral', [], 12,
    (s, r) => {
      if (!isLabel(s)) return null;
      const a = pick(s, r, (x) => recentGig(s, x, 8) && x.fame > 20);
      const op = Object.values(s.acts).filter((x) => !x.owner && active(x) && x.potential > 60 && fam(x) === (a ? fam(a) : ''));
      if (!a || !op.length || !r.chance(0.25)) return null;
      const chosen = r.pick(op);
      return { act: a.id, opener: chosen.id, openerName: chosen.name };
    },
    ['A banda de abertura roubou a noite', 'The opening act stole the night'],
    ['{openerName}, que abriu para {act}, foi aplaudido de pé. {act} ficou furioso.', '{openerName}, who opened for {act}, got a standing ovation. {act} is furious.'],
    [
      o('scout', 'Levar o A&R para conversar com eles', 'Send the A&R to talk to them', (s, r, c) => { signal(s, r, String(c.opener), 3); mood(s, A(s, c), 'morale', -4); }),
      o('fire', 'Trocar a banda de abertura', 'Replace the opening act', (s, _r, c) => { trust(A(s, c), 4); }),
      o('nothing', 'Faz parte', 'It happens', (s, _r, c) => { mood(s, A(s, c), 'inspiration', 6); }),
    ]),
  E('extra_date', 'stage', 'good', [], 8,
    (s, r) => {
      const a = pick(s, r, (x) => recentGig(s, x, 7) && x.fame > 25 && x.status === 'active');
      return a && r.chance(0.3) ? { act: a.id, fee: feeBy(a, 1500, 150, 25000) } : null;
    },
    ['Ingressos esgotados: data extra para {act}?', 'Sold out: extra date for {act}?'],
    ['A casa abriu fila de espera. Uma data extra renderia uns {feeTxt} líquidos.', 'The venue has a waiting list. An extra date would net about {feeTxt}.'],
    [
      o('add', 'Abrir a data extra', 'Add the extra date', (s, _r, c) => { const a = A(s, c); split(s, a, `extra:${a.id}`, Number(c.fee), 'live', 'Data extra', 0.3); fans(a, 8000, 1500, 300); mood(s, a, 'fatigue', 12); }),
      o('rest', 'Não: a banda precisa descansar', 'No: the band needs rest', (s, _r, c) => { mood(s, A(s, c), 'fatigue', -5); }),
    ]),
  E('bus_breakdown', 'stage', 'bad', [], 10,
    (s, r) => {
      if (s.year < 1930) return null;
      const a = pick(s, r, (x) => recentGig(s, x, 7) && x.members.length >= 2);
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['O ônibus de {act} quebrou', '{act}\'s tour bus broke down'],
    ['Na estrada, no meio do nada. O próximo show é amanhã a 600 km.', 'On the road, in the middle of nowhere. The next show is tomorrow, 600 km away.'],
    [
      o('flight', 'Voar e alugar equipamento', 'Fly and rent gear', (s, _r, c) => { pay(s, `bus:${c.act}`, 2500, 'live_costs', 'Voos e aluguel'); }),
      o('hitch', 'Dar um jeito (carona, trem, fé)', 'Make do (rides, trains, faith)', (s, r, c) => { const a = A(s, c); mood(s, a, 'fatigue', 15); if (r.chance(0.5)) { mood(s, a, 'morale', 6); fans(a, 0, 500, 400); } else mom(a, -4); }),
      o('cancel', 'Cancelar o show', 'Cancel the show', (s, _r, c) => { mom(A(s, c), -4); }),
    ]),
  E('city_ban', 'stage', 'bad', ['violence'], 30,
    (s, r) => {
      if (s.year < 1955) return null;
      const a = pick(s, r, (x) => x.fame > 25 && ['rock', 'hiphop', 'caribbean', 'brazil'].includes(fam(x)) && (traitIn(s, x, 'controversial') || x.scandals > 0));
      return a && r.chance(0.15) ? { act: a.id, city: r.pick(CITIES.filter((c) => c.market === mkt(a))).id } : null;
    },
    ['{cityName} proíbe shows de {act}', '{cityName} bans {act} shows'],
    ['A câmara de {cityName} proibiu {act} depois de boatos de briga num show. Nenhuma prova, só manchetes.', '{cityName}\'s council banned {act} after rumours of a fight at a show. No proof, just headlines.'],
    [
      o('court', 'Contestar na justiça', 'Challenge in court', (s, r, c) => { const a = A(s, c); pay(s, `ban:${a.id}`, legal(s, 2500), 'legal', 'Contestação'); if (r.chance(winOdds(s, 0.5))) { fame(a, 2); fans(a, 0, 2000, 2000); } }),
      o('free_show', 'Show gratuito na cidade vizinha', 'Free show in the next town over', (s, _r, c) => { const a = A(s, c); pay(s, `banshow:${a.id}`, 1500, 'live_costs', 'Show gratuito'); fans(a, 15000, 3000, 2000); scandal(s, a.id, 'violence', 30); }),
      o('accept', 'Aceitar e seguir', 'Accept and move on', (s, _r, c) => { mom(A(s, c), -3); }),
    ]),
];

// =====================================================================================
// 7. MARCAS, PATROCÍNIO E SYNC
// =====================================================================================
const brandsFor = (s: GameState, a: Act, kind?: string) =>
  BRANDS.filter((b) => b.start <= s.year && (b.end === undefined || b.end >= s.year) && b.markets.includes(mkt(a)) && (!kind || b.sync.includes(kind as never)));

const BRAND: EventDef[] = [
  E('brand_sponsorship', 'contract', 'good', [], 10,
    (s, r) => {
      if (s.year < 1925) return null;
      const a = pick(s, r, (x) => x.fame > 18 && active(x) && !withinFlag(s, `sponsor:${x.id}`, 104));
      if (!a || !r.chance(0.3)) return null;
      const bs = brandsFor(s, a).filter((b) => !(b.values.includes('family') && (a.scandals > 1 || traitIn(s, a, 'controversial'))));
      if (!bs.length) return null;
      const b = r.weighted(bs, (x) => x.budget)!;
      return { act: a.id, brand: displayName(b), edgy: b.values.includes('edgy') ? 1 : 0, fee: Math.round(Math.min(70000, b.budget * (1200 + a.fame * a.fame * 4))) };
    },
    ['{brand} quer patrocinar {act}', '{brand} wants to sponsor {act}'],
    ['Contrato de um ano: {act} em anúncios, eventos e embalagens. Pagamento de {feeTxt}.', 'One-year deal: {act} in ads, events and packaging. Payment {feeTxt}.'],
    [
      o('accept', 'Assinar', 'Sign', (s, _r, c) => { const a = A(s, c); split(s, a, `sponsor:${a.id}`, Number(c.fee), 'sponsorship', String(c.brand)); s.flags[`sponsor:${a.id}`] = s.week; s.flags[`sponsorFee:${a.id}`] = Number(c.fee); fame(a, 2); a.positioning = clamp(a.positioning + 5, 0, 100); if (ambitionIn(s, a, 'art') && !Number(c.edgy)) trust(a, -6); log(s, 'sponsor', '{a} fecha patrocínio com {b}.', '{a} signs a sponsorship with {b}.', { a: a.name, b: String(c.brand) }, a.id); }),
      o('control', 'Assinar com controle criativo (menos verba)', 'Sign with creative control (less money)', (s, _r, c) => { const a = A(s, c); split(s, a, `sponsor2:${a.id}`, Number(c.fee) * 0.65, 'sponsorship', String(c.brand)); s.flags[`sponsor:${a.id}`] = s.week; s.flags[`sponsorFee:${a.id}`] = Math.round(Number(c.fee) * 0.65); fame(a, 1.5); trust(a, 2); }),
      o('decline', 'Recusar', 'Decline', (s, _r, c) => { if (ambitionIn(s, A(s, c), 'art')) trust(A(s, c), 3); }),
    ]),
  E('morality_clause', 'contract', 'bad', ['controversy'], 24,
    (s, r) => {
      const a = pick(s, r, (x) => withinFlag(s, `sponsor:${x.id}`, 104) && x.scandals > 0);
      return a && r.chance(0.35) ? { act: a.id, fee: Math.round((s.flags[`sponsorFee:${a.id}`] ?? 5000) * 0.4) } : null;
    },
    ['Patrocinador aciona cláusula moral', 'Sponsor invokes the morality clause'],
    ['Depois das polêmicas, o patrocinador de {act} rompe o contrato e cobra {feeTxt} de volta.', 'After the controversies, {act}\'s sponsor breaks the deal and wants {feeTxt} back.'],
    [
      o('fight', 'Contestar a cláusula', 'Contest the clause', (s, r, c) => { const a = A(s, c); delete s.flags[`sponsor:${a.id}`]; pay(s, `moral:${a.id}`, legal(s, 2500), 'legal', 'Contestação'); if (!r.chance(winOdds(s, 0.45))) pay(s, `moral2:${a.id}`, Number(c.fee), 'sponsorship', 'Devolução'); }),
      o('refund', 'Devolver e encerrar', 'Refund and end it', (s, _r, c) => { const a = A(s, c); delete s.flags[`sponsor:${a.id}`]; if (a.playerBand) pay(s, `moralr:${a.id}`, Number(c.fee), 'sponsorship', 'Devolução'); else pay(s, `moralr:${a.id}`, Number(c.fee) * 0.5, 'sponsorship', 'Devolução'); mom(a, -4); }),
    ]),
  E('jingle_commission', 'contract', 'good', [], 10,
    (s, r) => {
      if (!era(s, 1925, 2010)) return null;
      const a = pick(s, r, (x) => crew(s, x).some((p) => p.skills.comp > 50));
      if (!a || !r.chance(0.25)) return null;
      const bs = brandsFor(s, a, 'jingle');
      if (!bs.length) return null;
      const b = r.pick(bs);
      return { act: a.id, brand: displayName(b), fee: 800 + b.budget * 700 };
    },
    ['Jingle para {brand}', 'Jingle for {brand}'],
    ['{brand} encomenda a {act} um jingle de 30 segundos. Paga {feeTxt} e o refrão vai grudar no país.', '{brand} commissions a 30-second jingle from {act}. Pays {feeTxt} and the hook will stick nationwide.'],
    [
      o('write', 'Compor o jingle', 'Write the jingle', (s, _r, c) => { const a = A(s, c); split(s, a, `jingle:${a.id}`, Number(c.fee), 'sync', 'Jingle'); fans(a, 15000); mood(s, a, 'inspiration', -8); }),
      o('ghost', 'Compor sem crédito', 'Write it uncredited', (s, _r, c) => { const a = A(s, c); split(s, a, `jingleg:${a.id}`, Number(c.fee) * 0.8, 'sync', 'Jingle'); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('novela_theme', 'contract', 'good', [], 10,
    (s, r) => {
      if (s.year < 1965) return null;
      const rel = myRels(s, (x) => s.week - x.week < 40 && !!s.acts[x.actId] && ['br', 'latam'].includes(mkt(s.acts[x.actId])))[0];
      if (!rel || !r.chance(0.3)) return null;
      const a = s.acts[rel.actId];
      const b = brandsFor(s, a, 'novela')[0];
      return b ? { release: rel.id, act: rel.actId, brand: displayName(b), fee: 4000 } : null;
    },
    ['"{releaseTitle}" vira tema de novela', '"{releaseTitle}" becomes a soap theme'],
    ['{brand} quer "{releaseTitle}" como tema da novela das oito. Toca toda noite para milhões. Licença: {feeTxt}.', '{brand} wants "{releaseTitle}" as the prime-time soap theme. It plays every night for millions. License: {feeTxt}.'],
    [
      o('accept', 'Aceitar', 'Accept', (s, _r, c) => { const a = A(s, c); split(s, a, `novela:${c.release}`, Number(c.fee), 'sync', 'Tema de novela'); appeal(s, c, 1.35); fame(a, 4); fans(a, 200000, 10000, 1000); log(s, 'novela', '"{t}" vira tema de novela.', '"{t}" becomes a soap theme.', { t: s.releases[String(c.release)]?.title ?? '' }, a.id, true); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('game_soundtrack', 'contract', 'good', [], 12,
    (s, r) => {
      if (s.year < 1985) return null;
      const rel = myRels(s, (x) => x.totalUnits > 4000)[0];
      if (!rel || !r.chance(0.25)) return null;
      const bs = BRANDS.filter((b) => b.category === 'game_studio' && b.start <= s.year);
      if (!bs.length) return null;
      const b = r.pick(bs);
      return { release: rel.id, act: rel.actId, brand: displayName(b), fee: 2000 + b.budget * 1500 };
    },
    ['"{releaseTitle}" num videogame', '"{releaseTitle}" in a video game'],
    ['{brand} quer "{releaseTitle}" na trilha do próximo jogo. Uma geração inteira vai decorar a música. Oferta: {feeTxt}.', '{brand} wants "{releaseTitle}" on its next game soundtrack. A whole generation will learn it by heart. Offer: {feeTxt}.'],
    [
      o('license', 'Licenciar', 'License', (s, _r, c) => { const a = A(s, c); split(s, a, `game:${c.release}`, Number(c.fee), 'sync', 'Videogame'); fans(a, 50000, 6000, 800); appeal(s, c, 1.1); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('trailer_sync', 'contract', 'good', [], 10,
    (s, r) => {
      if (s.year < 1975) return null;
      const rel = myRels(s, (x) => x.q > 55)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId, fee: Math.round(5000 + Math.sqrt(rel.totalUnits + 1) * 20) } : null;
    },
    ['Trailer de cinema com "{releaseTitle}"', 'Movie trailer with "{releaseTitle}"'],
    ['Um estúdio quer "{releaseTitle}" no trailer de um blockbuster — numa versão orquestral lenta e sombria. Oferta: {feeTxt}.', 'A studio wants "{releaseTitle}" in a blockbuster trailer — as a slow, dark orchestral version. Offer: {feeTxt}.'],
    [
      o('license', 'Licenciar a regravação', 'License the re-record', (s, _r, c) => { const a = A(s, c); split(s, a, `trailer:${c.release}`, Math.min(40000, Number(c.fee)), 'sync', 'Trailer'); appeal(s, c, 1.2); fans(a, 80000, 4000); }),
      o('original', 'Só a versão original', 'Original version only', (s, r, c) => { if (r.chance(0.5)) { const a = A(s, c); split(s, a, `trailer2:${c.release}`, Math.min(30000, Number(c.fee) * 0.8), 'sync', 'Trailer'); appeal(s, c, 1.15); } }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('luxury_ambassador', 'contract', 'good', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.fame > 50 && ['pop', 'rnb', 'hiphop', 'asia_me', 'latin'].includes(fam(x)));
      if (!a || !r.chance(0.25)) return null;
      const b = BRANDS.find((x) => x.values.includes('luxury') && x.category === 'fashion' && x.start <= s.year);
      return b ? { act: a.id, brand: displayName(b), fee: feeBy(a, 20000, 600, 90000) } : null;
    },
    ['{act}, embaixador de {brand}', '{act}, {brand} ambassador'],
    ['A grife {brand} quer {act} como rosto da coleção. Cachê de {feeTxt}, primeira fila nos desfiles.', 'Fashion house {brand} wants {act} as the face of the collection. Fee {feeTxt}, front row at the shows.'],
    [
      o('accept', 'Aceitar', 'Accept', (s, _r, c) => { const a = A(s, c); split(s, a, `lux:${a.id}`, Number(c.fee), 'sponsorship', String(c.brand)); fame(a, 3); a.positioning = clamp(a.positioning + 8, 0, 100); fansMul(a, 1.05, 1, 0.97); if (traitIn(s, a, 'engaged')) trust(a, -5); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('gear_endorsement', 'business', 'good', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => crew(s, x).some((p) => p.skills.instr > 70));
      if (!a || !r.chance(0.25)) return null;
      const p = crew(s, a).sort((x, y) => y.skills.instr - x.skills.instr)[0];
      return { act: a.id, person: p.id };
    },
    ['Endosso de instrumento para {person}', 'Instrument endorsement for {person}'],
    ['Um fabricante quer {person} ({act}) no catálogo e na feira Tonewood Expo (≈ NAMM). Dá instrumentos e um pequeno cachê.', 'A maker wants {person} ({act}) in its catalog and at the Tonewood Expo (≈ NAMM). Free instruments and a small fee.'],
    [
      o('accept', 'Aceitar o endosso', 'Accept the endorsement', (s, _r, c) => { const a = A(s, c); split(s, a, `endorse:${c.person}`, 1500, 'sponsorship', 'Endosso'); pmood(P(s, c), 'morale', 10); fans(a, 5000, 1500); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
];

// =====================================================================================
// 8. PROCESSOS: plágio, samples, auditorias, nome, espólio
// =====================================================================================
const LAW: EventDef[] = [
  E('plagiarism_suit', 'contract', 'bad', ['legal'], 18,
    (s, r) => {
      const rel = myRels(s, (x) => x.totalUnits > 20000 && s.week - x.week < 80)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Processo de plágio contra "{releaseTitle}"', 'Plagiarism suit over "{releaseTitle}"'],
    ['Um compositor alega que a melodia de "{releaseTitle}" copia uma canção dele de anos atrás.', 'A songwriter claims "{releaseTitle}"\'s melody copies a song of theirs from years ago.'],
    [
      o('musicologist', 'Contratar musicólogo e lutar', 'Hire a musicologist and fight', (s, r, c) => { pay(s, `plag:${c.release}`, legal(s, 4500), 'legal', 'Perícia'); if (!r.chance(winOdds(s, 0.5))) { const rel = s.releases[String(c.release)]; pay(s, `plagloss:${c.release}`, Math.min(60000, 8000 + (rel ? rel.totalUnits * 0.05 : 0)), 'legal', 'Condenação'); rep(s, 'institutional', -4); } else rep(s, 'artistic', 2); }),
      o('credit', 'Dar coautoria ao reclamante', 'Give the claimant co-writing credit', (s, _r, c) => { appeal(s, c, 0.97); const a = A(s, c); trust(a, -5); }),
      o('settle', 'Acordo discreto', 'Quiet settlement', (s, _r, c) => { pay(s, `plagset:${c.release}`, 5000, 'legal', 'Acordo'); }),
    ]),
  E('reverse_plagiarism', 'contract', 'neutral', ['legal'], 24,
    (s, r) => {
      const rel = myRels(s, (x) => x.q > 55 && x.totalUnits > 5000)[0];
      const rival = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 100000));
      return rel && rival.length && r.chance(0.15) ? { release: rel.id, act: rel.actId, label: r.pick(rival).id } : null;
    },
    ['Hit de {labelName} parece "{releaseTitle}"', '{labelName} hit sounds like "{releaseTitle}"'],
    ['O novo sucesso de {labelName} tem o mesmo refrão de "{releaseTitle}". Os fãs já fizeram comparações lado a lado.', '{labelName}\'s new hit has the same hook as "{releaseTitle}". Fans already made side-by-side comparisons.'],
    [
      o('sue', 'Processar', 'Sue', (s, r, c) => { pay(s, `rplag:${c.release}`, legal(s, 5000), 'legal', 'Processo'); if (r.chance(winOdds(s, 0.4))) { gain(s, `rplagw:${c.release}`, 25000, 'legal', 'Indenização'); log(s, 'lawsuit_win', 'Selo vence processo de plágio contra rival.', 'Label wins a plagiarism suit against a rival.', {}, String(c.act), true); } }),
      o('public', 'Expor nas redes', 'Call it out publicly', (s, _r, c) => { const a = A(s, c); fame(a, 1); appeal(s, c, 1.1); rep(s, 'institutional', -1); }),
      o('let', 'Deixar para lá', 'Let it go', noop),
    ]),
  E('sample_uncleared', 'contract', 'bad', ['legal'], 10,
    (s, r) => {
      if (s.year < 1987) return null;
      const p = s.pendingReleases.find((x) => ['hiphop', 'electronic'].includes(familyOf(s.acts[x.actId]?.genre ?? 'pop')));
      return p && r.chance(0.35) ? { pending: p.id, act: p.actId } : null;
    },
    ['Sample não liberado em "{pendingTitle}"', 'Uncleared sample on "{pendingTitle}"'],
    ['Faltando semanas para o lançamento, alguém percebeu que o loop principal de "{pendingTitle}" não foi liberado.', 'Weeks before release, someone noticed the main loop on "{pendingTitle}" was never cleared.'],
    [
      o('clear', 'Pagar a liberação', 'Pay for clearance', (s, _r, c) => { pay(s, `clear:${c.pending}`, 3500, 'legal', 'Liberação de sample'); }),
      o('risk', 'Lançar assim mesmo', 'Release anyway', (s, _r, c) => { s.flags[`unclearedSample:${c.pending}`] = s.week; }, ['Pode virar processo depois.', 'May become a lawsuit later.']),
      o('replay', 'Regravar o trecho com músicos', 'Replay the part with session players', (s, _r, c) => { const p = s.pendingReleases.find((x) => x.id === c.pending); if (p) p.week += 3; pay(s, `replay:${c.pending}`, 800, 'release', 'Regravação'); }),
    ]),
  E('distributor_audit', 'business', 'good', ['legal'], 30,
    (s, r) => {
      if (!isLabel(s) || s.year < 1955 || myRels(s).length < 4) return null;
      return r.chance(0.2) ? { n: myRels(s).length } : null;
    },
    ['Auditoria no distribuidor', 'Audit the distributor'],
    ['Seu analista desconfia das planilhas do distribuidor: devoluções "fantasmas" e territórios sem relatório.', 'Your analyst distrusts the distributor\'s spreadsheets: "phantom" returns and unreported territories.'],
    [
      o('audit', 'Contratar auditoria', 'Hire auditors', (s, r, c) => { pay(s, 'dist_audit', 2500, 'legal', 'Auditoria'); if (r.chance(0.55 + staffSkill(s, 'rights') / 300)) gain(s, 'dist_audit_win', Math.min(20000, 2000 + Number(c.n) * 600), 'royalties', 'Diferença recuperada'); }),
      o('trust', 'Confiar no parceiro', 'Trust the partner', noop),
    ]),
  E('cowriter_claim', 'contract', 'bad', ['legal'], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.songs.length > 6 && x.releases.length > 1);
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['Ex-músico de estúdio reivindica coautoria', 'Ex-session player claims co-writing'],
    ['Um músico que gravou com {act} anos atrás diz que criou o riff principal e quer parte da edição.', 'A player who recorded with {act} years ago says he created the main riff and wants a publishing share.'],
    [
      o('court', 'Ir ao tribunal', 'Go to court', (s, r, c) => { pay(s, `cowr:${c.act}`, legal(s, 3000), 'legal', 'Processo'); if (!r.chance(winOdds(s, 0.55))) pay(s, `cowrl:${c.act}`, 7000, 'publishing', 'Parte da edição'); }),
      o('share', 'Ceder 10% da edição', 'Give up 10% of publishing', (s, _r, c) => { pay(s, `cowrs:${c.act}`, 2500, 'publishing', 'Acordo de edição'); trust(A(s, c), -2); }),
    ]),
  E('band_name_dispute', 'contract', 'bad', ['legal'], 36,
    (s, r) => {
      const a = pick(s, r, (x) => x.fame > 15 && x.members.length > 1 && !s.flags[`renamed:${x.id}`]);
      return a && r.chance(0.12) ? { act: a.id, city: r.pick(CITIES.filter((c) => c.market !== mkt(a))).id } : null;
    },
    ['Outra banda se chama {act}', 'Another band is called {act}'],
    ['Uma banda de {cityName} registrou o nome "{act}" primeiro e exige que vocês parem de usá-lo.', 'A band from {cityName} registered the name "{act}" first and demands you stop using it.'],
    [
      o('buy', 'Comprar os direitos do nome', 'Buy the name rights', (s, _r, c) => { pay(s, `name:${c.act}`, 5000, 'legal', 'Direitos do nome'); s.flags[`renamed:${c.act}`] = s.week; }),
      o('rename', 'Mudar de nome', 'Change the name', (s, _r, c) => { const a = A(s, c); const old = a.name; a.name = `${a.name} (${cityById[a.city]?.name.en ?? a.city})`; s.flags[`renamed:${a.id}`] = s.week; fame(a, -a.fame * 0.15); log(s, 'rename', '{o} passa a se chamar {n}.', '{o} is now called {n}.', { o: old, n: a.name }, a.id, true); }),
      o('court', 'Disputar na justiça', 'Fight in court', (s, r, c) => { pay(s, `namec:${c.act}`, legal(s, 3000), 'legal', 'Processo'); s.flags[`renamed:${c.act}`] = s.week; if (!r.chance(winOdds(s, 0.5))) pay(s, `namecl:${c.act}`, 6000, 'legal', 'Indenização'); }),
    ]),
  E('estate_dispute', 'contract', 'neutral', ['death', 'legal'], 36,
    (s, r) => {
      const gone = Object.values(s.acts).filter((x) => (x.status === 'retired' || x.status === 'split') && (x.legend || x.hits > 1) && s.year - x.careerEnd > 3 && myRels(s, (rel) => rel.actId === x.id).length > 0);
      return gone.length && r.chance(0.15) ? { act: r.pick(gone).id } : null;
    },
    ['Herdeiros de {act} contestam o catálogo', '{act}\'s heirs contest the catalog'],
    ['Os herdeiros de um integrante de {act} dizem que o contrato original não cobria reedições digitais.', 'The heirs of a {act} member say the original contract did not cover digital reissues.'],
    [
      o('settle', 'Renegociar com os herdeiros', 'Renegotiate with the heirs', (s, _r, c) => { pay(s, `estate:${c.act}`, 6000, 'royalties', 'Acordo com herdeiros'); rep(s, 'artists', 3); }),
      o('court', 'Defender o contrato na justiça', 'Defend the contract in court', (s, r, c) => { pay(s, `estatec:${c.act}`, legal(s, 4000), 'legal', 'Processo'); if (!r.chance(winOdds(s, 0.5))) { for (const rel of myRels(s, (x) => x.actId === c.act)) rel.appeal *= 0.8; rep(s, 'artists', -3); } }),
    ]),
];

// =====================================================================================
// 9. FAMÍLIA COM AGENDA PRÓPRIA
// =====================================================================================
const youngest = (s: GameState, a: Act) => [...crew(s, a)].sort((x, y) => y.born - x.born)[0];

const FAMILY: EventDef[] = [
  E('parent_manager', 'people', 'neutral', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => crew(s, x).some((p) => s.year - p.born < 24));
      if (!a || !r.chance(0.25)) return null;
      return { act: a.id, person: youngest(s, a).id };
    },
    ['O pai de {person} quer ser empresário', '{person}\'s father wants to be manager'],
    ['O pai de {person} ({act}) quer assumir a carreira: aprovar contratos, agenda e até o figurino.', '{person}\'s ({act}) father wants to take over the career: approve contracts, schedule and even wardrobe.'],
    [
      o('accept', 'Aceitar como empresário', 'Accept him as manager', (s, _r, c) => { const a = A(s, c); trust(a, 6); s.flags[`familyManager:${a.id}`] = s.week; mood(s, a, 'resentment', 5); pmood(P(s, c), 'morale', 10); }),
      o('advisor', 'Só como conselheiro', 'Only as an advisor', (s, _r, c) => { pmood(P(s, c), 'morale', 3); }),
      o('refuse', 'Recusar', 'Refuse', (s, _r, c) => { pmood(P(s, c), 'morale', -8); pmood(P(s, c), 'resentment', 6); }),
    ]),
  E('sibling_wants_in', 'band', 'neutral', [], 30,
    (s, r) => {
      const a = pick(s, r, (x) => x.members.length >= 2 && x.members.length <= 5 && !x.playerBand);
      return a && r.chance(0.15) ? { act: a.id, person: r.pick(a.members) } : null;
    },
    ['O irmão de {person} quer entrar', '{person}\'s sibling wants in'],
    ['{person} insiste que o irmão toque em {act}. "Ele é melhor do que parece."', '{person} insists their sibling should join {act}. "They\'re better than they seem."'],
    [
      o('join', 'Aceitar na banda', 'Let them join', (s, r, c) => {
        const a = A(s, c); const sib = P(s, c);
        if (!sib) return;
        const np = makePerson(s, r, { lang: langForCity(a.city, r), role: r.pick(['keys', 'guitar', 'horns', 'strings'] as Person['role'][]), potential: clamp(sib.potential - r.int(5, 20), 20, 90), born: sib.born + r.int(-4, 4), startFrac: 0.6 });
        np.name = `${np.name.split(' ')[0]} ${sib.name.split(' ').slice(1).join(' ') || sib.name}`;
        s.persons[np.id] = np; a.members.push(np.id); actsTouched17(s); // r17: índice pessoa→atos
        pmood(sib, 'morale', 12); mood(s, a, 'resentment', 4);
        log(s, 'lineup', '{n} entra em {a}.', '{n} joins {a}.', { n: np.name, a: a.name }, a.id);
      }),
      o('audition', 'Fazer audição justa', 'Hold a fair audition', (s, r, c) => { const a = A(s, c); if (r.chance(0.3)) mood(s, a, 'morale', 3); else pmood(P(s, c), 'morale', -6); }),
      o('refuse', 'Recusar', 'Refuse', (s, _r, c) => { pmood(P(s, c), 'resentment', 8); }),
    ]),
  E('spouse_touring', 'people', 'bad', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => recentGig(s, x, 10) && crew(s, x).some((p) => s.year - p.born > 28));
      if (!a || !r.chance(0.2)) return null;
      return { act: a.id, person: crew(s, a).find((p) => s.year - p.born > 28)!.id };
    },
    ['Família de {person} quer menos estrada', '{person}\'s family wants less road'],
    ['O cônjuge de {person} ({act}) deu um ultimato: ou a turnê encurta, ou o casamento acaba.', '{person}\'s ({act}) spouse gave an ultimatum: either the tour shrinks or the marriage ends.'],
    [
      o('shorten', 'Encurtar a turnê', 'Shorten the tour', (s, _r, c) => { const a = A(s, c); mood(s, a, 'fatigue', -15); pmood(P(s, c), 'morale', 12); mom(a, -4); trust(a, 5); }),
      o('family_tour', 'Levar a família na estrada (custo)', 'Bring the family on the road (cost)', (s, _r, c) => { pay(s, `famtour:${c.person}`, 1500, 'live_costs', 'Família na turnê'); pmood(P(s, c), 'morale', 8); }),
      o('insist', 'Manter a agenda', 'Keep the schedule', (s, _r, c) => { pmood(P(s, c), 'stress', 15); pmood(P(s, c), 'resentment', 10); }),
    ]),
  E('family_debt', 'people', 'neutral', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => !x.playerBand && x.members.length > 0);
      return a && r.chance(0.15) ? { act: a.id, person: r.pick(a.members) } : null;
    },
    ['{person} pede um adiantamento', '{person} asks for an advance'],
    ['A família de {person} ({act}) está endividada. Pede um adiantamento pessoal de royalties.', '{person}\'s ({act}) family is in debt. They ask for a personal royalty advance.'],
    [
      o('lend', 'Adiantar (recuperável)', 'Advance it (recoupable)', (s, _r, c) => { const a = A(s, c); const amt = money(s, 2500); post(s, `famdebt:${c.person}`, -amt, 'advances', 'Adiantamento pessoal'); a.cash += amt; const k = a.contractId ? s.contracts[a.contractId] : undefined; if (k) k.recoupBalance += amt; trust(a, 8); }),
      o('gift', 'Dar de presente', 'Give it as a gift', (s, _r, c) => { const a = A(s, c); pay(s, `famgift:${c.person}`, 1500, 'artist_dev', 'Ajuda'); trust(a, 12); }),
      o('refuse', 'Recusar', 'Refuse', (s, _r, c) => { trust(A(s, c), -6); pmood(P(s, c), 'resentment', 8); }),
    ]),
  E('stage_parent_feud', 'people', 'bad', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => !x.playerBand && x.fame > 15 && crew(s, x).some((p) => s.year - p.born < 22));
      return a && r.chance(0.15) ? { act: a.id, person: youngest(s, a).id } : null;
    },
    ['Mãe de {person} ataca o selo', '{person}\'s mother attacks the label'],
    ['Numa entrevista, a mãe de {person} ({act}) acusa o selo de "explorar uma criança".', 'In an interview, {person}\'s ({act}) mother accuses the label of "exploiting a child".'],
    [
      o('meet', 'Reunião e plano de estudos/descanso', 'Meet and agree a study/rest plan', (s, _r, c) => { const a = A(s, c); pay(s, `tutor:${c.person}`, 1500, 'artist_dev', 'Tutor e descanso'); trust(a, 6); rep(s, 'institutional', 2); pmood(P(s, c), 'fatigue', -15); }),
      o('statement', 'Nota oficial defendendo o selo', 'Official statement defending the label', (s) => { rep(s, 'institutional', -2); rep(s, 'artists', -2); }),
      o('ignore', 'Ignorar', 'Ignore', (s, _r, c) => { rep(s, 'artists', -3); trust(A(s, c), -4); }),
    ]),
];

// =====================================================================================
// 10. CONFLITOS DE LÍDER E DE BANDA
// =====================================================================================
const BAND: EventDef[] = [
  E('leader_solo', 'band', 'bad', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.members.length >= 3 && !!lead(s, x) && (lead(s, x)!.traits.includes('big_ego') || lead(s, x)!.ambition === 'fame'));
      return a && r.chance(0.2) ? { act: a.id, person: lead(s, a)!.id } : null;
    },
    ['{person} quer disco solo', '{person} wants a solo album'],
    ['O líder de {act}, {person}, quer gravar um disco solo "só para experimentar". O resto da banda ouve "fim da banda".', '{act}\'s leader, {person}, wants to cut a solo record "just to experiment". The rest of the band hears "the end".'],
    [
      o('allow', 'Liberar o projeto paralelo', 'Allow the side project', (s, _r, c) => { const a = A(s, c); const p = P(s, c); pmood(p, 'morale', 15); pmood(p, 'inspiration', 15); for (const m of crew(s, a)) if (m !== p) { m.resentment = clamp(m.resentment + 10, 0, 100); } }),
      o('after', 'Só depois do próximo álbum da banda', 'Only after the band\'s next album', (s, _r, c) => { pmood(P(s, c), 'resentment', 6); }),
      o('refuse', 'Proibir', 'Forbid it', (s, _r, c) => { pmood(P(s, c), 'resentment', 15); pmood(P(s, c), 'morale', -10); }),
    ]),
  E('leader_fires_member', 'band', 'bad', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.members.length >= 3 && !!lead(s, x));
      if (!a || !r.chance(0.15)) return null;
      const l0 = lead(s, a)!;
      const weak = crew(s, a).filter((p) => p.id !== l0.id).sort((x, y) => (x.skills.instr + x.skills.stage) - (y.skills.instr + y.skills.stage))[0];
      return weak ? { act: a.id, person: weak.id, leader: l0.name } : null;
    },
    ['{leader} quer demitir {person}', '{leader} wants to fire {person}'],
    ['{leader} diz que {person} "atrasa a banda" e exige a saída. {act} está dividido.', '{leader} says {person} "holds the band back" and demands their exit. {act} is split.'],
    [
      o('back', 'Apoiar o líder', 'Back the leader', (s, _r, c) => { const a = A(s, c); const p = P(s, c); if (!p || a.members.length < 2) return; a.members = a.members.filter((x) => x !== p.id); mood(s, a, 'resentment', 6); log(s, 'lineup', '{p} é demitido de {a}.', '{p} is fired from {a}.', { p: p.name, a: a.name }, a.id, true); }),
      o('mediate', 'Mediação com psicólogo de banda', 'Mediation with a band therapist', (s, r, c) => { const a = A(s, c); pay(s, `bandtherapy:${a.id}`, 2000, 'artist_dev', 'Mediação'); if (r.chance(0.6)) mood(s, a, 'resentment', -10); }),
      o('refuse', 'Ninguém sai', 'Nobody leaves', (s, _r, c) => { const a = A(s, c); const l0 = lead(s, a); pmood(l0, 'resentment', 12); }),
    ]),
  E('direction_split', 'band', 'neutral', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.members.length >= 2 && ambitionIn(s, x, 'art') && (ambitionIn(s, x, 'money') || ambitionIn(s, x, 'fame')));
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['{act} dividido sobre o rumo', '{act} split over direction'],
    ['Metade de {act} quer rádio e estádio; a outra metade quer um disco difícil e sem single.', 'Half of {act} wants radio and stadiums; the other half wants a difficult record with no single.'],
    [
      o('pop', 'Rumo comercial', 'Commercial route', (s, _r, c) => { const a = A(s, c); a.positioning = clamp(a.positioning + 15, 0, 100); for (const p of crew(s, a)) if (p.ambition === 'art') p.resentment = clamp(p.resentment + 12, 0, 100); }),
      o('art', 'Rumo artístico', 'Artistic route', (s, _r, c) => { const a = A(s, c); a.positioning = clamp(a.positioning - 15, 0, 100); mood(s, a, 'inspiration', 10); for (const p of crew(s, a)) if (p.ambition === 'money' || p.ambition === 'fame') p.resentment = clamp(p.resentment + 12, 0, 100); }),
      o('both', 'Um de cada: single comercial, álbum ousado', 'One of each: commercial single, bold album', (s, _r, c) => { mood(s, A(s, c), 'stress', 6); }),
    ]),
  E('live_money_split', 'band', 'bad', [], 24,
    (s, r) => {
      const a = pick(s, r, (x) => x.members.length >= 3 && recentGig(s, x, 12));
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['Briga pela divisão do cachê', 'Fight over the fee split'],
    ['Os integrantes de {act} descobriram que o vocalista recebe o dobro nos shows.', '{act} members found out the singer gets double at shows.'],
    [
      o('equal', 'Divisão igual daqui em diante', 'Equal split from now on', (s, _r, c) => { const a = A(s, c); mood(s, a, 'resentment', -8); const l0 = lead(s, a); pmood(l0, 'resentment', 10); }),
      o('bonus', 'Bônus para os músicos (do selo)', 'Bonus for the players (label pays)', (s, _r, c) => { const a = A(s, c); pay(s, `livebonus:${a.id}`, 1500, 'artist_dev', 'Bônus'); mood(s, a, 'morale', 6); }),
      o('keep', 'Manter como está', 'Keep it as is', (s, _r, c) => { mood(s, A(s, c), 'resentment', 6); }),
    ]),
  E('outside_manager', 'band', 'neutral', [], 36,
    (s, r) => {
      const a = pick(s, r, (x) => !x.playerBand && x.fame > 20 && x.trust < 60);
      return a && r.chance(0.15) ? { act: a.id } : null;
    },
    ['{act} contrata empresário próprio', '{act} hires their own manager'],
    ['{act} votou por um empresário independente. Ele vai revisar tudo o que o selo decide.', '{act} voted for an independent manager. He will review everything the label decides.'],
    [
      o('welcome', 'Dar boas-vindas e abrir os números', 'Welcome him and open the books', (s, _r, c) => { const a = A(s, c); trust(a, 8); rep(s, 'artists', 2); s.flags[`manager:${a.id}`] = s.week; }),
      o('resist', 'Resistir (o contrato é com a banda)', 'Resist (the contract is with the band)', (s, _r, c) => { trust(A(s, c), -8); }),
      o('fine', 'Tanto faz', 'Whatever', (s, _r, c) => { s.flags[`manager:${c.act}`] = s.week; }),
    ]),
];

// =====================================================================================
// 11. RIVAIS: aliciamento, espionagem e jogo sujo
// =====================================================================================
const RIVALS: EventDef[] = [
  E('rival_poach_staff', 'market', 'bad', [], 18,
    (s, r) => {
      if (!isLabel(s)) return null;
      const st = s.player.staff.filter((x) => x.skill > 60);
      const lb = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 150000));
      if (!st.length || !lb.length || !r.chance(0.2)) return null;
      const who = r.pick(st);
      return { staff: who.id, staffName: who.name, label: r.pick(lb).id };
    },
    ['{labelName} quer {staffName}', '{labelName} wants {staffName}'],
    ['{labelName} ofereceu o dobro do salário a {staffName}, da sua equipe.', '{labelName} offered {staffName}, from your team, double the salary.'],
    [
      o('raise', 'Cobrir com aumento de 25%', 'Counter with a 25% raise', (s, _r, c) => { const st = s.player.staff.find((x) => x.id === c.staff); if (st) st.salary = Math.round(st.salary * 1.25); }),
      o('bonus', 'Bônus único e apelo pessoal', 'One-off bonus and personal appeal', (s, r, c) => { pay(s, `staffbonus:${c.staff}`, 2000, 'staff', 'Bônus de retenção'); if (!r.chance(0.6)) s.player.staff = s.player.staff.filter((x) => x.id !== c.staff); }),
      o('let', 'Deixar ir', 'Let them go', (s, _r, c) => { s.player.staff = s.player.staff.filter((x) => x.id !== c.staff); log(s, 'staff_poached', '{n} troca o selo por {l}.', '{n} leaves for {l}.', { n: String(c.staffName), l: s.labels[String(c.label)]?.name ?? '' }); }),
    ]),
  E('rival_spy_demo', 'market', 'bad', ['crime'], 18,
    (s, r) => {
      if (!isLabel(s)) return null;
      const p = s.pendingReleases[0];
      const lb = Object.values(s.labels).filter((x) => x.active);
      return p && lb.length && r.chance(0.15) ? { pending: p.id, act: p.actId, label: r.pick(lb).id } : null;
    },
    ['{labelName} ouviu sua demo', '{labelName} heard your demo'],
    ['Um engenheiro levou cópias de "{pendingTitle}" para {labelName}, que prepara algo parecido para a mesma semana.', 'An engineer took copies of "{pendingTitle}" to {labelName}, which is rushing something similar for the same week.'],
    [
      o('rush', 'Antecipar o lançamento', 'Move the release up', (s, _r, c) => { const p = s.pendingReleases.find((x) => x.id === c.pending); if (p) p.week = Math.max(s.week + 1, p.week - 2); }),
      o('legal', 'Notificar judicialmente', 'Send a legal notice', (s, _r, c) => { pay(s, `spy:${c.pending}`, legal(s, 2000), 'legal', 'Notificação'); rep(s, 'institutional', 1); }),
      o('ignore', 'Seguir o plano', 'Stick to the plan', noop),
    ]),
  E('rival_copycat', 'market', 'neutral', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => x.fame > 30 && x.hits > 0);
      const lb = Object.values(s.labels).filter((x) => x.active);
      return a && lb.length && r.chance(0.15) ? { act: a.id, label: r.pick(lb).id } : null;
    },
    ['{labelName} lança um clone de {act}', '{labelName} launches a {act} clone'],
    ['Mesmo visual, mesmo som, nome parecido. {labelName} quer pegar carona no sucesso de {act}.', 'Same look, same sound, similar name. {labelName} wants to ride {act}\'s success.'],
    [
      o('evolve', 'Mudar de fase: visual e som novos', 'Move on: new look and sound', (s, _r, c) => { const a = A(s, c); pay(s, `evolve:${a.id}`, 2500, 'marketing', 'Nova fase'); mom(a, 8); mood(s, a, 'inspiration', 10); }),
      o('mock', 'Zoar o clone publicamente', 'Mock the clone publicly', (s, _r, c) => { const a = A(s, c); mom(a, 4); rep(s, 'institutional', -1); }),
      o('ignore', 'Ignorar', 'Ignore', (s, _r, c) => { mom(A(s, c), -3); }),
    ]),
  E('rival_smear', 'scandal', 'bad', [], 24,
    (s, r) => {
      if (!isLabel(s)) return null;
      const lb = Object.values(s.labels).filter((x) => x.active && x.aggression > 0.5);
      return lb.length && r.chance(0.12) ? { label: r.pick(lb).id } : null;
    },
    ['Boato plantado sobre o selo', 'Planted rumour about the label'],
    ['Uma coluna de fofocas diz que o selo "não paga artistas". A fonte, dizem, é gente de {labelName}.', 'A gossip column says the label "doesn\'t pay its artists". The source, they say, is someone at {labelName}.'],
    [
      o('open', 'Publicar auditoria independente', 'Publish an independent audit', (s) => { pay(s, 'smear_audit', 2500, 'legal', 'Auditoria pública'); rep(s, 'artists', 4); rep(s, 'institutional', 2); }),
      o('counter', 'Contra-atacar com outro boato', 'Counter with a rumour of our own', (s) => { rep(s, 'institutional', -4); }),
      o('ignore', 'Ignorar', 'Ignore', (s) => { rep(s, 'artists', -3); }),
    ]),
  E('insider_offer', 'market', 'neutral', ['crime'], 36,
    (s, r) => {
      if (!isLabel(s)) return null;
      const lb = Object.values(s.labels).filter((x) => x.active);
      return lb.length && r.chance(0.1) ? { label: r.pick(lb).id } : null;
    },
    ['Um infiltrado de {labelName}', 'An insider from {labelName}'],
    ['Um funcionário insatisfeito de {labelName} oferece o calendário de lançamentos e os contratos do rival.', 'A disgruntled {labelName} employee offers the rival\'s release calendar and contracts.'],
    [
      o('buy', 'Comprar as informações', 'Buy the information', (s) => { pay(s, 'insider', 2000, 'marketing', 'Consultoria (?)'); s.flags.espionage = s.week; for (const a of mine(s)) mom(a, 3); }, ['Vantagem agora; escândalo se vazar.', 'An edge now; scandal if it leaks.']),
      o('report', 'Avisar o rival', 'Warn the rival', (s) => { rep(s, 'institutional', 5); }),
      o('refuse', 'Recusar', 'Refuse', noop),
    ]),
  E('espionage_exposed', 'scandal', 'bad', ['crime'], 60,
    (s, r) => (s.flags.espionage !== undefined && s.week - s.flags.espionage > 20 && r.chance(0.25) ? {} : null),
    ['Espionagem exposta', 'Espionage exposed'],
    ['Os documentos comprados do rival vazaram — junto com o recibo.', 'The documents bought from the rival leaked — along with the receipt.'],
    [
      o('settle', 'Acordo e pedido de desculpas', 'Settlement and apology', (s) => { delete s.flags.espionage; pay(s, 'espionage_settle', 10000, 'legal', 'Acordo'); rep(s, 'institutional', -6); s.player.stats.scandalsSurvived += 1; }),
      o('deny', 'Negar', 'Deny', (s, r) => { delete s.flags.espionage; rep(s, 'institutional', -12); if (r.chance(0.4)) pay(s, 'espionage_fine', 20000, 'legal', 'Condenação'); }),
    ]),
];

// =====================================================================================
// 12. CRÍTICOS COM VIÉS, PRÊMIOS E PRODUTORES
// =====================================================================================
const criticFor = (s: GameState, r: Rng, f: FamilyId, mode: 'favored' | 'disfavored') => {
  const list = CRITICS.filter((c) => c.start <= s.year && c.end >= s.year && c[mode].includes(f));
  return list.length ? r.pick(list) : undefined;
};

const CRITIC_AWARD: EventDef[] = [
  E('critic_bias_pan', 'culture', 'bad', [], 6,
    (s, r) => {
      const rel = myRels(s, (x) => s.week - x.week < 6)[0];
      if (!rel || !r.chance(0.35)) return null;
      const a = s.acts[rel.actId];
      const cr = a && criticFor(s, r, fam(a), 'disfavored');
      return cr && cr.harshness > 0.4 ? { release: rel.id, act: a.id, critic: cr.name, outlet: displayName(outletById[cr.outlet]) } : null;
    },
    ['{critic} detona "{releaseTitle}"', '{critic} trashes "{releaseTitle}"'],
    ['{critic}, de {outlet}, que notoriamente despreza o gênero de {act}, deu nota mínima a "{releaseTitle}".', '{critic} of {outlet}, who notoriously despises {act}\'s genre, gave "{releaseTitle}" the lowest score.'],
    [
      o('reply', 'Responder publicamente', 'Reply publicly', (s, _r, c) => { const a = A(s, c); fame(a, 1); fans(a, 0, 1500, 800); rep(s, 'institutional', -2); }),
      o('invite', 'Convidar o crítico ao estúdio', 'Invite the critic to the studio', (s, r, c) => { pay(s, `critvisit:${c.release}`, 500, 'marketing', 'Visita de crítico'); if (r.chance(0.35)) { appeal(s, c, 1.08); rep(s, 'artistic', 2); } }),
      o('ignore', 'Ignorar', 'Ignore', (s, _r, c) => { appeal(s, c, 0.93); mood(s, A(s, c), 'morale', -4); }),
    ]),
  E('critic_champion', 'culture', 'good', [], 6,
    (s, r) => {
      const rel = myRels(s, (x) => s.week - x.week < 8 && x.q > 45)[0];
      if (!rel || !r.chance(0.35)) return null;
      const a = s.acts[rel.actId];
      const cr = a && criticFor(s, r, fam(a), 'favored');
      return cr ? { release: rel.id, act: a.id, critic: cr.name, outlet: displayName(outletById[cr.outlet]), quirkPt: cr.quirk.pt, quirkEn: cr.quirk.en } : null;
    },
    ['{critic} adota {act}', '{critic} champions {act}'],
    ['{critic} ({outlet}) chama "{releaseTitle}" de "o disco do ano". Conhecido por um hábito curioso — {quirkPt}', '{critic} ({outlet}) calls "{releaseTitle}" "the record of the year". Known for a curious habit — {quirkEn}'],
    [
      o('exclusive', 'Dar uma entrevista exclusiva', 'Give an exclusive interview', (s, _r, c) => { const a = A(s, c); appeal(s, c, 1.15); fans(a, 10000, 3000, 1500); rep(s, 'artistic', 3); }),
      o('ok', 'Agradecer', 'Say thanks', (s, _r, c) => { appeal(s, c, 1.1); rep(s, 'artistic', 2); }),
    ]),
  E('critic_bribe', 'scandal', 'neutral', ['crime'], 30,
    (s, r) => {
      const rel = myRels(s, (x) => s.week - x.week < 3)[0];
      const cr = CRITICS.filter((c) => c.start <= s.year && c.end >= s.year);
      return rel && cr.length && r.chance(0.12) ? { release: rel.id, act: rel.actId, critic: r.pick(cr).name } : null;
    },
    ['Um crítico à venda', 'A critic for sale'],
    ['Um intermediário diz que {critic} pode escrever uma resenha "muito favorável" de "{releaseTitle}" mediante "consultoria".', 'A middleman says {critic} could write a "very favourable" review of "{releaseTitle}" for a "consulting fee".'],
    [
      o('pay', 'Pagar a consultoria', 'Pay the fee', (s, r, c) => { pay(s, `bribe:${c.release}`, 1500, 'marketing', 'Consultoria (?)'); appeal(s, c, 1.12); if (r.chance(0.3)) { rep(s, 'institutional', -8); rep(s, 'artistic', -4); scandal(s, A(s, c).id, 'money', 45); } }),
      o('expose', 'Denunciar o esquema', 'Expose the scheme', (s) => { rep(s, 'institutional', 4); rep(s, 'artistic', 1); }),
      o('refuse', 'Recusar', 'Refuse', noop),
    ]),
  E('critics_poll_win', 'career', 'good', [], 12,
    (s, r) => {
      if (s.year < 1971 || s.month !== 0) return null;
      const rel = myRels(s, (x) => x.year === s.year - 1 && x.q > 68 && x.songs.some((id) => (s.songs[id]?.originality ?? 0) > 60))[0];
      return rel && r.chance(0.5) ? { release: rel.id, act: rel.actId } : null;
    },
    ['"{releaseTitle}" vence a Votação da Crítica', '"{releaseTitle}" wins the Critics\' Poll'],
    ['Na Votação da Crítica Agulha (≈ Pazz & Jop / Mercury Prize), "{releaseTitle}" de {act} ficou em primeiro.', 'In the Agulha Critics\' Poll (≈ Pazz & Jop / Mercury Prize), "{releaseTitle}" by {act} came first.'],
    [
      o('party', 'Festa para a equipe e a banda', 'Party for the team and the band', (s, _r, c) => { const a = A(s, c); pay(s, `pollparty:${c.release}`, 500, 'marketing', 'Comemoração'); a.awards += 1; rep(s, 'artistic', 6); mood(s, a, 'morale', 10); appeal(s, c, 1.15); log(s, 'award', '{a} vence a Votação da Crítica.', '{a} wins the Critics\' Poll.', { a: a.name }, a.id, true); }),
      o('ok', 'Comemorar discretamente', 'Celebrate quietly', (s, _r, c) => { const a = A(s, c); a.awards += 1; rep(s, 'artistic', 5); appeal(s, c, 1.12); log(s, 'award', '{a} vence a Votação da Crítica.', '{a} wins the Critics\' Poll.', { a: a.name }, a.id, true); }),
    ]),
  E('regional_award', 'career', 'good', [], 10,
    (s, r) => {
      const a = pick(s, r, (x) => x.fame > 15 && x.releases.length > 0);
      if (!a || !r.chance(0.35)) return null;
      const aw = AWARDS.filter((w) => (w.market === mkt(a) || (w.kind === 'genre' && w.categories.some((k) => k.families?.includes(fam(a))))) && w.start <= s.year && w.month === s.month);
      if (!aw.length) return null;
      const w = r.pick(aw);
      const k = w.categories.find((x) => !x.families || x.families.includes(fam(a))) ?? w.categories[0];
      return { act: a.id, award: displayName(w), catPt: k.name.pt, catEn: k.name.en };
    },
    ['{act} indicado: {award}', '{act} nominated: {award}'],
    ['{act} concorre a "{catPt}" no {award}. Campanha junto aos votantes pode ajudar.', '{act} is up for "{catEn}" at {award}. Campaigning among voters may help.'],
    [
      o('campaign', 'Fazer campanha', 'Campaign', (s, r, c) => { const a = A(s, c); pay(s, `awcamp:${a.id}`, 2000, 'marketing', 'Campanha de prêmio'); if (r.chance(0.3 + a.fame / 250)) { a.awards += 1; fame(a, 3); fans(a, 30000, 3000); rep(s, 'institutional', 3); log(s, 'award', '{a} vence {w}.', '{a} wins {w}.', { a: a.name, w: String(c.award) }, a.id, true); } }),
      o('attend', 'Só comparecer', 'Just attend', (s, r, c) => { const a = A(s, c); if (r.chance(0.2 + a.fame / 400)) { a.awards += 1; fame(a, 2.5); log(s, 'award', '{a} vence {w}.', '{a} wins {w}.', { a: a.name, w: String(c.award) }, a.id, true); } else fame(a, 0.5); }),
    ]),
  E('award_snub', 'culture', 'bad', [], 12,
    (s, r) => {
      if (s.year < 1959 || s.month !== 2) return null;
      const rel = myRels(s, (x) => x.year === s.year - 1 && x.q > 70)[0];
      const a = rel && s.acts[rel.actId];
      return a && a.awards === 0 && r.chance(0.5) ? { act: a.id, release: rel!.id } : null;
    },
    ['Gramófonos esnobam {act}', 'Gramophones snub {act}'],
    ['"{releaseTitle}" foi ignorado pelos Gramófonos de Ouro (≈ Grammy). Os fãs estão revoltados.', '"{releaseTitle}" was ignored by the Golden Gramophones (≈ Grammy). Fans are furious.'],
    [
      o('boycott', 'Boicotar a cerimônia', 'Boycott the ceremony', (s, _r, c) => { const a = A(s, c); fans(a, 0, 2000, 2000); rep(s, 'institutional', -4); rep(s, 'artistic', 2); }),
      o('gracious', 'Parabenizar os vencedores', 'Congratulate the winners', (s, _r, c) => { rep(s, 'institutional', 3); mood(s, A(s, c), 'morale', -4); }),
    ]),
  E('label_of_year', 'business', 'good', [], 12,
    (s, r) => {
      if (!isLabel(s) || s.year < 1975 || s.month !== 3) return null;
      const rp = s.player.reputation;
      return (rp.commercial + rp.artistic + rp.institutional) / 3 > 55 && r.chance(0.4) ? {} : null;
    },
    ['Selo do Ano na Guilda AMIF', 'Label of the Year at the AMIF Guild'],
    ['Os Prêmios da Guilda AMIF (≈ Music Week Awards) elegeram o seu selo como Selo do Ano.', 'The AMIF Guild Awards (≈ Music Week Awards) named your label Label of the Year.'],
    [
      o('artists', 'Discurso dedicado aos artistas', 'Speech dedicated to the artists', (s) => { rep(s, 'artists', 4); rep(s, 'institutional', 4); for (const a of mine(s)) trust(a, 2); log(s, 'award', '{c} é eleito Selo do Ano.', '{c} is named Label of the Year.', { c: s.config.companyName }, undefined, true); }),
      o('team', 'Discurso dedicado à equipe', 'Speech dedicated to the team', (s) => { rep(s, 'institutional', 5); log(s, 'award', '{c} é eleito Selo do Ano.', '{c} is named Label of the Year.', { c: s.config.companyName }, undefined, true); }),
    ]),
  E('hall_of_echoes', 'career', 'good', [], 12,
    (s, r) => {
      if (s.year < 1986) return null;
      const cands = Object.values(s.acts).filter((x) => s.year - x.debutYear >= 25 && (x.legend || x.hits >= 3) && !s.flags[`hall:${x.id}`] && (x.owner === 'player' || myRels(s, (rel) => rel.actId === x.id).length > 0));
      return cands.length && r.chance(0.4) ? { act: r.pick(cands).id } : null;
    },
    ['{act} no Hall of Echoes', '{act} enters the Hall of Echoes'],
    ['25 anos depois da estreia, {act} é induzido ao Hall of Echoes (≈ Rock & Roll Hall of Fame). A cerimônia pede uma reunião no palco.', '25 years after their debut, {act} is inducted into the Hall of Echoes (≈ Rock & Roll Hall of Fame). The ceremony wants an onstage reunion.'],
    [
      o('reunite', 'Bancar a apresentação de reunião', 'Fund the reunion performance', (s, _r, c) => { const a = A(s, c); s.flags[`hall:${a.id}`] = s.week; pay(s, `hall:${a.id}`, 3000, 'live_costs', 'Cerimônia'); a.awards += 1; fame(a, 4); for (const rel of myRels(s, (x) => x.actId === a.id)) rel.appeal *= 1.25; log(s, 'hall', '{a} entra no Hall of Echoes com reunião no palco.', '{a} enters the Hall of Echoes with an onstage reunion.', { a: a.name }, a.id, true); }),
      o('speech', 'Só discurso', 'Speech only', (s, _r, c) => { const a = A(s, c); s.flags[`hall:${a.id}`] = s.week; a.awards += 1; fame(a, 2); for (const rel of myRels(s, (x) => x.actId === a.id)) rel.appeal *= 1.12; log(s, 'hall', '{a} entra no Hall of Echoes.', '{a} enters the Hall of Echoes.', { a: a.name }, a.id, true); }),
    ]),
  E('video_awards_stunt', 'stage', 'neutral', ['controversy'], 12,
    (s, r) => {
      if (!hasTech(s, 'clipnet') || s.month !== 8) return null;
      const a = pick(s, r, (x) => x.fame > 30 && ['pop', 'rock', 'hiphop', 'rnb'].includes(fam(x)));
      return a && r.chance(0.4) ? { act: a.id } : null;
    },
    ['{act} nos Prêmios ClipNet', '{act} at the ClipNet Awards'],
    ['{act} vai se apresentar nos Prêmios ClipNet de Vídeo (≈ MTV VMAs). A direção sugere "algo de que todos falem amanhã".', '{act} will perform at the ClipNet Video Awards (≈ MTV VMAs). The producers suggest "something everyone talks about tomorrow".'],
    [
      o('stunt', 'Fazer o número polêmico', 'Do the shocking number', (s, _r, c) => { const a = A(s, c); fame(a, 4); fans(a, 150000, 10000, 1000); rep(s, 'institutional', -4); scandal(s, a.id, 'sex', 30); }),
      o('classy', 'Performance impecável', 'Flawless performance', (s, _r, c) => { const a = A(s, c); fame(a, 2); fans(a, 60000, 5000); rep(s, 'artistic', 1); }),
    ]),
  E('producer_award_poach', 'business', 'neutral', [], 24,
    (s, r) => {
      if (s.year < 1975 || !isLabel(s)) return null;
      const p = s.player.staff.find((x) => x.role === 'producer' && x.skill >= 70);
      return p && r.chance(0.2) ? { staff: p.id, staffName: p.name } : null;
    },
    ['{staffName}, produtor do ano', '{staffName}, producer of the year'],
    ['{staffName} ganhou o prêmio de Produtor do Ano. Agora todo mundo quer contratar — inclusive para longe de você.', '{staffName} won Producer of the Year. Now everyone wants to hire them — including away from you.'],
    [
      o('raise', 'Aumento de 20% e sala própria', '20% raise and their own room', (s, _r, c) => { const st = s.player.staff.find((x) => x.id === c.staff); if (st) { st.salary = Math.round(st.salary * 1.2); st.skill = Math.min(99, st.skill + 2); } rep(s, 'institutional', 2); }),
      o('freelance', 'Liberar para trabalhos externos', 'Allow outside work', (s, _r, c) => { gain(s, `freelance:${c.staff}`, 2000, 'services', 'Produções externas'); rep(s, 'institutional', 1); }),
      o('nothing', 'Parabéns e só', 'Congrats, that\'s all', (s, r, c) => { if (r.chance(0.35)) s.player.staff = s.player.staff.filter((x) => x.id !== c.staff); }),
    ]),
  E('legendary_producer', 'career', 'good', [], 12,
    (s, r) => {
      const a = pick(s, r, (x) => x.songs.some((id) => s.songs[id]?.recorded && !s.songs[id]?.releaseId));
      if (!a || !r.chance(0.3)) return null;
      const ps = PRODUCERS.filter((p) => p.start <= s.year && p.end >= s.year && p.families.includes(fam(a)));
      if (!ps.length) return null;
      const p = r.pick(ps);
      return { act: a.id, producer: p.name, sigPt: p.trait.pt, sigEn: p.trait.en, fee: Math.round(p.fee * 0.4), skill: p.skill, ego: p.ego };
    },
    ['{producer} quer mixar {act}', '{producer} wants to mix {act}'],
    ['O produtor {producer} ouviu as gravações de {act} e quer refazer a mixagem. A assinatura dele: {sigPt} Cachê: {feeTxt}.', 'Producer {producer} heard {act}\'s recordings and wants to redo the mix. His signature: {sigEn} Fee: {feeTxt}.'],
    [
      o('hire', 'Contratar', 'Hire', (s, _r, c) => {
        const a = A(s, c);
        pay(s, `prod:${a.id}`, Number(c.fee), 'recording', `Produtor ${String(c.producer)}`);
        const boost = (Number(c.skill) - 55) / 2;
        for (const id of a.songs) { const sg = s.songs[id]; if (sg && sg.recorded && !sg.releaseId) { sg.production = clamp(sg.production + boost, 0, 100); if (Number(c.ego) > 70) sg.originality = clamp(sg.originality - 5, 0, 100); sg.q = Math.round(0.25 * sg.melody + 0.2 * sg.lyrics + 0.25 * sg.performance + 0.2 * sg.production + 0.1 * sg.originality); } }
        if (Number(c.ego) > 70 && (traitIn(s, a, 'purist') || traitIn(s, a, 'experimental'))) trust(a, -5);
        log(s, 'producer', '{p} produz {a}.', '{p} produces {a}.', { p: String(c.producer), a: a.name }, a.id);
      }, ['Mixagem melhor; ego grande pode irritar a banda.', 'Better mix; a big ego may annoy the band.']),
      o('pass', 'Manter a mixagem atual', 'Keep the current mix', noop),
    ]),
  E('signature_sound_trend', 'market', 'neutral', [], 36,
    (s, r) => {
      if (!isLabel(s)) return null;
      const ps = PRODUCERS.filter((p) => p.start <= s.year && p.end >= s.year && p.skill >= 82);
      if (!ps.length || !r.chance(0.12)) return null;
      const p = r.pick(ps);
      return { producer: p.name, sigPt: p.trait.pt, sigEn: p.trait.en };
    },
    ['Todo mundo quer o som de {producer}', 'Everyone wants {producer}\'s sound'],
    ['A assinatura de {producer} domina as paradas: {sigPt} Seus artistas perguntam se vão soar "datados".', '{producer}\'s signature rules the charts: {sigEn} Your artists ask whether they\'ll sound "dated".'],
    [
      o('gear', 'Comprar o equipamento e imitar', 'Buy the gear and imitate', (s) => { pay(s, 'trend_gear', 3000, 'equipment', 'Equipamento da moda'); rep(s, 'commercial', 3); rep(s, 'artistic', -2); }),
      o('resist', 'Apostar no contrário', 'Bet on the opposite', (s) => { rep(s, 'artistic', 3); for (const a of mine(s)) mood(s, a, 'inspiration', 5); }),
    ]),
];

// =====================================================================================
// 13. FESTIVAIS COM IDENTIDADE E MOVIMENTOS CULTURAIS
// =====================================================================================
const liveFests = (s: GameState) => FESTIVALS.filter((f) => f.start <= s.year && (f.end === undefined || f.end >= s.year) && !f.scouting);

const FEST_MOVE: EventDef[] = [
  E('festival_identity_clash', 'stage', 'neutral', [], 12,
    (s, r) => {
      const fs = liveFests(s).filter((f) => f.vibe === 'underground' || f.vibe === 'boutique' || f.vibe === 'jazz');
      const a = pick(s, r, (x) => x.fame > 40 && x.positioning > 55 && active(x));
      if (!fs.length || !a || !r.chance(0.2)) return null;
      const f = r.pick(fs);
      if (f.focus.includes(fam(a))) return null;
      return { act: a.id, festival: f.realRef ? `${f.name} (≈ ${f.realRef})` : f.name, fee: feeBy(a, 6000, 300, 40000) };
    },
    ['{festival} chama {act} — e os puristas reclamam', '{festival} books {act} — and purists complain'],
    ['O {festival}, conhecido pela curadoria fora do mainstream, convida {act} como atração-surpresa. Cachê: {feeTxt}.', '{festival}, known for off-mainstream curation, invites {act} as a surprise act. Fee: {feeTxt}.'],
    [
      o('play', 'Tocar com um set ousado', 'Play a bold set', (s, r, c) => { const a = A(s, c); split(s, a, `clash:${a.id}`, Number(c.fee), 'live', String(c.festival), 0.3); if (r.chance(0.55)) { rep(s, 'artistic', 4); fans(a, 20000, 4000, 2000); a.positioning = clamp(a.positioning - 8, 0, 100); } else { mom(a, -4); } }),
      o('hits', 'Tocar os hits', 'Play the hits', (s, _r, c) => { const a = A(s, c); split(s, a, `clash2:${a.id}`, Number(c.fee), 'live', String(c.festival), 0.3); fans(a, 15000, 1000); rep(s, 'artistic', -1); }),
      o('decline', 'Recusar', 'Decline', noop),
    ]),
  E('tv_song_contest', 'stage', 'neutral', [], 12,
    (s, r) => {
      const fs = liveFests(s).filter((f) => f.vibe === 'tv_contest');
      const a = pick(s, r, (x) => active(x) && x.fame > 5 && x.fame < 60);
      if (!fs.length || !a || !r.chance(0.25)) return null;
      const f = fs.find((x) => cityById[x.city]?.market === mkt(a)) ?? (mkt(a) === 'eu' ? fs.find((x) => x.name === 'Concurso Eurocanção') : undefined);
      if (!f) return null;
      return { act: a.id, festival: f.realRef ? `${f.name} (≈ ${f.realRef})` : f.name };
    },
    ['{act} no {festival}?', '{act} at {festival}?'],
    ['O {festival} abriu inscrições. Uma canção, três minutos, milhões assistindo pela TV.', '{festival} is open for entries. One song, three minutes, millions watching on TV.'],
    [
      o('enter', 'Inscrever e caprichar na produção', 'Enter with a big production', (s, r, c) => {
        const a = A(s, c);
        pay(s, `contest:${a.id}`, 2500, 'marketing', 'Inscrição e figurino');
        const rel = latestRel(s, a, 104);
        if (r.chance(clamp(((rel?.q ?? 45) - 30) / 70, 0.1, 0.6))) { fame(a, 7); fans(a, 300000, 20000, 3000); log(s, 'contest_win', '{a} vence o {f}!', '{a} wins {f}!', { a: a.name, f: String(c.festival) }, a.id, true); }
        else { fame(a, 1.5); fans(a, 40000, 2000); mood(s, a, 'morale', -6); }
      }),
      o('decline', 'Não é a nossa praia', 'Not our thing', noop),
    ]),
  E('samba_school_pick', 'culture', 'good', [], 12,
    (s, r) => {
      if (s.month > 1 || s.year < 1930) return null;
      const a = pick(s, r, (x) => mkt(x) === 'br' && ['samba', 'samba_enredo', 'samba_cancao', 'pagode', 'mpb', 'marchinha'].includes(x.genre));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Escola de samba canta {act}', 'Samba school sings {act}'],
    ['Uma escola do grupo especial escolheu o samba de {act} para o desfile. A Passarela do Samba (≈ Sambódromo) vai cantar junto.', 'A top-league samba school chose {act}\'s samba for its parade. The Passarela do Samba (≈ Sambódromo) will sing along.'],
    [
      o('parade', 'Desfilar com a escola', 'Parade with the school', (s, _r, c) => { const a = A(s, c); fame(a, 4); fans(a, 150000, 10000, 2000); mood(s, a, 'fatigue', 10); gain(s, `enredo:${a.id}`, 1200, 'publishing', 'Samba-enredo'); }),
      o('ok', 'Só ceder a música', 'Just license the song', (s, _r, c) => { const a = A(s, c); fame(a, 2); gain(s, `enredo2:${a.id}`, 1200, 'publishing', 'Samba-enredo'); }),
    ]),
  E('headliner_dropout', 'stage', 'good', [], 10,
    (s, r) => {
      const fs = liveFests(s).filter((f) => f.month === undefined || f.month === s.month);
      const a = pick(s, r, (x) => active(x) && x.fame > 25 && x.fame < 65);
      if (!fs.length || !a || !r.chance(0.2)) return null;
      const f = r.weighted(fs, (x) => (x.focus.includes(fam(a)) ? 3 : 0.4));
      return f ? { act: a.id, festival: f.realRef ? `${f.name} (≈ ${f.realRef})` : f.name, fee: feeBy(a, 15000, 500, 60000) } : null;
    },
    ['Headliner desistiu: {act} assume?', 'Headliner dropped out: will {act} step up?'],
    ['A atração principal do {festival} cancelou em cima da hora. Querem {act} no lugar. Cachê: {feeTxt}.', '{festival}\'s headliner cancelled at the last minute. They want {act} instead. Fee: {feeTxt}.'],
    [
      o('accept', 'Assumir o palco principal', 'Take the main stage', (s, r, c) => { const a = A(s, c); split(s, a, `drop:${a.id}`, Number(c.fee), 'live', String(c.festival), 0.3); mood(s, a, 'fatigue', 12); s.player.stats.headlines += 1; if (r.chance(0.7)) { fame(a, 5); fans(a, 200000, 15000, 3000); log(s, 'festival', '{a} salva o {f} como headliner de última hora.', '{a} saves {f} as last-minute headliner.', { a: a.name, f: String(c.festival) }, a.id, true); } else { fame(a, 1); mom(a, -5); } }),
      o('decline', 'Recusar (não estamos prontos)', 'Decline (we\'re not ready)', noop),
    ]),
  E('heatwave_festival', 'world', 'bad', [], 12,
    (s, r) => {
      if (s.year < 2030 || s.month < 5 || s.month > 7) return null;
      const a = pick(s, r, (x) => x.fame > 20 && ['eu', 'na', 'oceania', 'asia'].includes(mkt(x)));
      return a && r.chance(0.3) ? { act: a.id } : null;
    },
    ['Onda de calor no festival', 'Heatwave at the festival'],
    ['46 °C. O festival proíbe shows diurnos e o set de {act} vai para as 2h da manhã.', '46 °C. The festival bans daytime shows and {act}\'s set moves to 2 a.m.'],
    [
      o('late', 'Tocar de madrugada', 'Play at 2 a.m.', (s, _r, c) => { const a = A(s, c); mood(s, a, 'fatigue', 12); fans(a, 0, 2000, 1500); }),
      o('water', 'Pagar estações de água e sombra para o público', 'Pay for water and shade stations for the crowd', (s, _r, c) => { pay(s, `heat:${c.act}`, 2500, 'live_costs', 'Estrutura contra calor'); rep(s, 'institutional', 3); fans(A(s, c), 10000, 2000); }),
      o('cancel', 'Cancelar', 'Cancel', (s, _r, c) => { mom(A(s, c), -3); }),
    ]),
  E('movement_born', 'culture', 'neutral', [], 18,
    (s, r) => {
      const ms = MOVEMENTS.filter((m) => m.from <= s.year && m.to >= s.year && !s.flags[`movement:${m.id}`]);
      if (!ms.length || !r.chance(0.25)) return null;
      const m = r.pick(ms);
      const cityId = r.pick(m.cities);
      const city = cityById[cityId];
      const parent = r.pick(m.parents);
      if (!city) return null;
      const fill = (pat: string, lang: 'pt' | 'en') => pat.replace('{city}', city.name[lang]).replace('{parent}', genreById[parent]?.name[lang] ?? parent);
      return { movement: m.id, city: cityId, genre: parent, mpt: fill(r.pick(m.namePatterns.pt), 'pt'), men: fill(r.pick(m.namePatterns.en), 'en'), lookPt: m.look.pt, lookEn: m.look.en };
    },
    ['Nasce um movimento em {cityName}', 'A movement is born in {cityName}'],
    ['Jornais já chamam de "{mpt}": derivado de {genreName}, com visual próprio — {lookPt}', 'Papers already call it "{men}": derived from {genreName}, with its own look — {lookEn}'],
    [
      o('showcase', 'Patrocinar uma noite-vitrine', 'Sponsor a showcase night', (s, r, c) => {
        s.flags[`movement:${c.movement}`] = s.week;
        pay(s, `move:${c.movement}`, 2000, 'marketing', 'Vitrine de cena');
        const g = String(c.genre);
        s.scenes[`${c.city}:${g}`] = (s.scenes[`${c.city}:${g}`] ?? 0) + 10;
        s.genrePop[g] = clamp((s.genrePop[g] ?? 0.6) + 0.2, 0, 2.2);
        for (const x of Object.values(s.acts).filter((y) => !y.owner && y.city === c.city && active(y)).slice(0, 3)) signal(s, r, x.id, 1);
        log(s, 'movement', 'Selo apoia o nascimento de "{m}".', 'Label backs the birth of "{m}".', { m: l(String(c.mpt), String(c.men)) }, undefined, true);
      }),
      o('dress', 'Vestir seus artistas da cidade com a estética', 'Dress your artists from that city in the look', (s, _r, c) => { s.flags[`movement:${c.movement}`] = s.week; for (const a of mine(s).filter((x) => x.city === c.city)) { mom(a, 6); fans(a, 10000, 2000, 500); } }),
      o('observe', 'Observar', 'Observe', (s, _r, c) => { s.flags[`movement:${c.movement}`] = s.week; const g = String(c.genre); s.genrePop[g] = clamp((s.genrePop[g] ?? 0.6) + 0.08, 0, 2.2); }),
    ]),
  E('scene_look_adopted', 'career', 'good', [], 18,
    (s, r) => {
      const a = pick(s, r, (x) => active(x) && MOVEMENTS.some((m) => m.from <= s.year && m.to >= s.year && m.cities.includes(x.city) && s.flags[`movement:${m.id}`] !== undefined));
      if (!a || !r.chance(0.3)) return null;
      const m = MOVEMENTS.find((mm) => mm.from <= s.year && mm.to >= s.year && mm.cities.includes(a.city))!;
      return { act: a.id, lookPt: m.look.pt, lookEn: m.look.en };
    },
    ['{act} vira ícone visual da cena', '{act} becomes the scene\'s style icon'],
    ['Fotos de {act} definem a moda local: {lookPt}', 'Photos of {act} define the local fashion: {lookEn}'],
    [
      o('line', 'Lançar uma linha de roupas', 'Launch a clothing line', (s, _r, c) => { const a = A(s, c); pay(s, `cloth:${a.id}`, 1500, 'merch', 'Linha de roupas'); split(s, a, `clothg:${a.id}`, Math.min(12000, 2000 + a.fans.core * 0.6), 'merch', 'Vendas de roupas'); fame(a, 1.5); }),
      o('ok', 'Curtir o momento', 'Enjoy the moment', (s, _r, c) => { const a = A(s, c); fame(a, 1); fans(a, 8000, 1500); }),
    ]),
];

// =====================================================================================
// 14. ERA SINTÉTICA E NEURAL (2030–2040)
// =====================================================================================
const NEURAL: EventDef[] = [
  E('neural_feed_stems', 'neural', 'neutral', [], 12,
    (s, r) => {
      if (!hasTech(s, 'neural')) return null;
      const a = pick(s, r, (x) => x.fame > 15);
      return a && r.chance(0.35) ? { act: a.id, fee: feeBy(a, 6000, 300, 40000) } : null;
    },
    ['CortexFeed quer os stems de {act}', 'CortexFeed wants {act}\'s stems'],
    ['O CortexFeed quer as faixas separadas de {act} para "adaptar" a música ao humor de cada ouvinte em tempo real. Oferta: {feeTxt}.', 'CortexFeed wants {act}\'s separated tracks to "adapt" the music to each listener\'s mood in real time. Offer: {feeTxt}.'],
    [
      o('license', 'Licenciar os stems', 'License the stems', (s, _r, c) => { const a = A(s, c); split(s, a, `stems:${a.id}`, Number(c.fee), 'neural', 'Stems adaptativos', 0.5); fans(a, 100000, 4000); if (ambitionIn(s, a, 'art')) trust(a, -6); }),
      o('limited', 'Só versões aprovadas pela banda', 'Band-approved versions only', (s, _r, c) => { const a = A(s, c); split(s, a, `stems2:${a.id}`, Number(c.fee) * 0.5, 'neural', 'Stems aprovados', 0.5); trust(a, 2); }),
      o('refuse', 'Recusar', 'Refuse', (s) => { s.player.neural.humanFocus += 1; }),
    ]),
  E('neural_headache', 'neural', 'bad', ['health'], 24,
    (s, r) => {
      if (!hasTech(s, 'neural')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 8)[0];
      return rel && r.chance(0.15) ? { release: rel.id, act: rel.actId } : null;
    },
    ['Ouvintes neurais relatam enxaqueca', 'Neural listeners report migraines'],
    ['A mixagem neural de "{releaseTitle}" estaria causando dores de cabeça em quem ouve pela interface.', '"{releaseTitle}"\'s neural mix is reportedly causing headaches for interface listeners.'],
    [
      o('recall', 'Retirar a mixagem e refazer', 'Pull the mix and redo it', (s, _r, c) => { pay(s, `nrecall:${c.release}`, 4000, 'neural', 'Recall neural'); rep(s, 'institutional', 3); appeal(s, c, 0.95); }),
      o('warn', 'Adicionar aviso e limitar volume', 'Add a warning and cap the volume', (s, _r, c) => { pay(s, `nwarn:${c.release}`, 800, 'neural', 'Aviso'); appeal(s, c, 0.92); }),
      o('deny', 'Negar o problema', 'Deny the problem', (s, r, c) => { if (r.chance(0.5)) { rep(s, 'institutional', -8); pay(s, `nsuit:${c.release}`, 12000, 'legal', 'Ação coletiva'); } }),
    ]),
  E('synthetic_bandmate', 'band', 'neutral', [], 30,
    (s, r) => {
      if (!hasTech(s, 'synthetic_voice')) return null;
      const a = pick(s, r, (x) => x.members.length >= 2 && x.archetype !== 'synthetic');
      return a && r.chance(0.2) ? { act: a.id } : null;
    },
    ['{act} quer um integrante sintético', '{act} wants a synthetic member'],
    ['{act} quer um "quinto integrante": uma voz sintética treinada nas próprias vozes da banda, com crédito.', '{act} wants a "fifth member": a synthetic voice trained on the band\'s own voices, with credit.'],
    [
      o('yes', 'Apoiar (com consentimento de todos)', 'Support it (with everyone\'s consent)', (s, _r, c) => { const a = A(s, c); pay(s, `synthmate:${a.id}`, 3000, 'neural', 'Modelo de voz'); trust(a, 5); fans(a, 30000, 3000); rep(s, 'artistic', -1); }),
      o('no', 'Recusar', 'Refuse', (s, _r, c) => { trust(A(s, c), -3); s.player.neural.humanFocus += 1; }),
    ]),
  E('consent_wave_manifesto', 'neural', 'good', [], 999,
    (s, r) => {
      if (s.year < 2033 || s.flags.consentManifesto !== undefined) return null;
      const a = pick(s, r, (x) => x.archetype !== 'synthetic' && (traitIn(s, x, 'engaged') || ambitionIn(s, x, 'art')));
      return a && r.chance(0.4) ? { act: a.id } : null;
    },
    ['Manifesto consent-wave', 'Consent-wave manifesto'],
    ['{act} quer assinar o manifesto consent-wave: a própria voz só pode ser clonada com regras públicas e revogáveis.', '{act} wants to sign the consent-wave manifesto: their voice may only be cloned under public, revocable rules.'],
    [
      o('sign', 'Assinar junto, como selo', 'Co-sign as a label', (s, _r, c) => { s.flags.consentManifesto = s.week; const a = A(s, c); s.player.neural.humanFocus += 2; rep(s, 'artists', 5); trust(a, 8); if (s.player.neural.consentPolicy === 'none') s.player.neural.consentPolicy = 'consent'; s.genrePop.consent_wave = clamp((s.genrePop.consent_wave ?? 0.5) + 0.25, 0, 2.2); }),
      o('artist_only', 'Deixar o artista assinar sozinho', 'Let the artist sign alone', (s, _r, c) => { s.flags.consentManifesto = s.week; trust(A(s, c), 3); }),
      o('discourage', 'Desencorajar', 'Discourage it', (s, _r, c) => { s.flags.consentManifesto = s.week; trust(A(s, c), -6); }),
    ]),
  E('human_cert_audit', 'neural', 'neutral', [], 36,
    (s, r) => (s.year >= 2033 && isLabel(s) && r.chance(0.2) ? {} : null),
    ['Auditoria "Feito por Humanos"', '"Made by Humans" audit'],
    ['O Selo Feito por Humanos quer auditar seu estúdio. Passar abre festivais como o Human Hands Gathering; falhar vira manchete.', 'The Made by Humans seal wants to audit your studio. Passing opens festivals like the Human Hands Gathering; failing makes headlines.'],
    [
      o('audit', 'Aceitar a auditoria', 'Accept the audit', (s) => {
        pay(s, 'human_audit', 1500, 'neural', 'Auditoria humana');
        const clean = s.player.neural.consentPolicy !== 'no_consent' && !s.player.neural.catalogTraining && s.player.neural.synthActs === 0;
        if (clean) { rep(s, 'artistic', 5); s.player.neural.humanFocus += 2; s.flags.humanCertified = s.week; log(s, 'human_cert', 'O selo recebe a certificação "Feito por Humanos".', 'The label earns the "Made by Humans" certification.', {}, undefined, true); }
        else { rep(s, 'artistic', -5); rep(s, 'artists', -2); }
      }),
      o('skip', 'Recusar a auditoria', 'Decline the audit', (s) => { rep(s, 'artistic', -1); }),
    ]),
  E('hologram_tour', 'neural', 'neutral', [], 24,
    (s, r) => {
      if (s.year < 2031) return null;
      const a = pick(s, r, (x) => x.fame > 35);
      return a && r.chance(0.2) ? { act: a.id, fee: feeBy(a, 15000, 500, 70000) } : null;
    },
    ['Holograma de {act} em turnê', '{act} hologram on tour'],
    ['A Holo Arena Tour quer um avatar de {act} tocando em 40 cidades simultaneamente. Pagamento: {feeTxt}. A banda real fica em casa.', 'Holo Arena Tour wants a {act} avatar playing 40 cities at once. Payment: {feeTxt}. The real band stays home.'],
    [
      o('license', 'Licenciar o avatar', 'License the avatar', (s, _r, c) => { const a = A(s, c); split(s, a, `holo:${a.id}`, Number(c.fee), 'neural', 'Turnê de holograma', 0.5); fans(a, 150000, 5000); if (ambitionIn(s, a, 'art') || traitIn(s, a, 'purist')) trust(a, -8); mood(s, a, 'fatigue', -10); }),
      o('hybrid', 'Só com a banda ao vivo em uma cidade', 'Only with the live band in one city', (s, _r, c) => { const a = A(s, c); split(s, a, `holo2:${a.id}`, Number(c.fee) * 0.5, 'neural', 'Turnê híbrida', 0.5); fans(a, 60000, 4000, 800); }),
      o('refuse', 'Recusar', 'Refuse', (s) => { s.player.neural.humanFocus += 1; }),
    ]),
  E('timbre_bank_heirs', 'neural', 'neutral', ['death'], 36,
    (s, r) => {
      if (!hasTech(s, 'synthetic_voice')) return null;
      const gone = Object.values(s.acts).filter((x) => x.status === 'retired' && (x.legend || x.hits > 1) && myRels(s, (rel) => rel.actId === x.id).length > 0);
      return gone.length && r.chance(0.15) ? { act: r.pick(gone).id, fee: 15000 } : null;
    },
    ['TimbreBank e os herdeiros de {act}', 'TimbreBank and {act}\'s heirs'],
    ['Os herdeiros de {act} toparam vender o timbre ao TimbreBank — se o selo, dono das masters, entrar no acordo. Sua parte: {feeTxt}.', '{act}\'s heirs agreed to sell the timbre to TimbreBank — if the label, owner of the masters, joins. Your share: {feeTxt}.'],
    [
      o('join', 'Entrar no acordo', 'Join the deal', (s, _r, c) => { gain(s, `timbre:${c.act}`, Number(c.fee), 'neural', 'TimbreBank'); s.player.neural.voiceLicenses += 1; rep(s, 'artistic', -3); }),
      o('veto', 'Vetar o uso das masters', 'Veto use of the masters', (s) => { s.player.neural.humanFocus += 1; rep(s, 'artistic', 2); }),
    ]),
  E('dream_feed_commission', 'neural', 'good', [], 18,
    (s, r) => {
      if (s.year < 2037 || !hasTech(s, 'neural')) return null;
      const a = pick(s, r, (x) => ['electronic', 'sacred', 'pop'].includes(fam(x)) || x.genre === 'ambient');
      return a && r.chance(0.3) ? { act: a.id, fee: feeBy(a, 5000, 200, 25000) } : null;
    },
    ['Dreamline encomenda música para sonhos', 'Dreamline commissions dream music'],
    ['A Dreamline quer oito horas de música de {act} para guiar o sono de assinantes. Oferta: {feeTxt}.', 'Dreamline wants eight hours of {act} music to guide subscribers\' sleep. Offer: {feeTxt}.'],
    [
      o('compose', 'Compor', 'Compose', (s, _r, c) => { const a = A(s, c); split(s, a, `dream:${a.id}`, Number(c.fee), 'neural', 'Dreamline', 0.5); mood(s, a, 'inspiration', -10); s.genrePop.dream_feed = clamp((s.genrePop.dream_feed ?? 0.5) + 0.1, 0, 2.2); }),
      o('refuse', 'Recusar', 'Refuse', noop),
    ]),
  E('latent_versions', 'neural', 'neutral', [], 18,
    (s, r) => {
      if (!hasTech(s, 'synthetic_voice')) return null;
      const rel = myRels(s, (x) => s.week - x.week < 20 && x.totalUnits > 2000)[0];
      return rel && r.chance(0.2) ? { release: rel.id, act: rel.actId } : null;
    },
    ['"{releaseTitle}" em infinitas versões?', '"{releaseTitle}" in infinite versions?'],
    ['Uma plataforma de latent-core quer gerar uma versão diferente de "{releaseTitle}" para cada ouvinte.', 'A latent-core platform wants to generate a different version of "{releaseTitle}" for every listener.'],
    [
      o('allow', 'Permitir (receita por geração)', 'Allow it (revenue per generation)', (s, _r, c) => { appeal(s, c, 1.15); gain(s, `latent:${c.release}`, 3000, 'neural', 'Versões latentes'); const a = A(s, c); if (ambitionIn(s, a, 'art')) trust(a, -5); }),
      o('deny', 'Negar', 'Deny', (s) => { s.player.neural.humanFocus += 1; }),
    ]),
];

export const MORE_EVENTS: EventDef[] = [
  ...ERA_EARLY, ...GEO, ...MEDIA_PR, ...FANDOM, ...TECH, ...LIVE,
  ...BRAND, ...LAW, ...FAMILY, ...BAND, ...RIVALS, ...CRITIC_AWARD, ...FEST_MOVE, ...NEURAL,
];

/** Construtores e efeitos reaproveitados pelos eventos da rodada 11 (events_more11.ts). */
export const EH = {
  o, E, noop, mine, pick, crew, fam, mkt, era, myRels, isLabel, active, traitIn, ambitionIn, lead, withinFlag,
  A, P, pay, gain, rep, fame, mom, trust, fans, fansMul, mood, pmood, hiatus, legal, winOdds, split, feeBy, log, appeal, latestRel, signal,
};
