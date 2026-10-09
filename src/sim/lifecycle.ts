// Pessoas e atos ao longo do tempo: estados, crescimento, bandas, carreira em 3 eixos,
// aposentadoria, ato fênix, surgimento do catálogo e atos procedurais (GDD §5.3, §9, §19).

import { clamp, type Rng } from '../core/rng';
import { CITIES, MARKETS, l } from '../data/world';
import { makeAct } from './people';
import { growPerson, traitMod } from './people';
import { composeSongs, recordSongs, unrecorded, unreleasedRecorded } from './production';
import { launchNpcRelease } from './market';
import type { Act, GameState } from './types';
import { endContract } from './contracts';
import { addSignal, spawnProceduralAct } from './worldgen';
import { dbSizeInfo } from './dbsize14';
import { fmtL, hasMutator, money, nextId, notify, remember } from './util';
import { emitEvent } from './events';
import { histLocked } from './history15';

export function monthlyPeople(s: GameState, r: Rng): void {
  for (const act of Object.values(s.acts)) {
    if (act.status === 'retired' || act.status === 'split') continue;
    if (act.hiatusUntil && act.hiatusUntil <= s.week) {
      act.hiatusUntil = undefined;
      act.status = 'active';
      act.momentum = clamp(act.momentum + 25, 0, 100);
      remember(s, 'return', fmtL(l('{a} volta da pausa.', '{a} returns from hiatus.'), { a: act.name }), { actId: act.id, important: !!act.catalogNo || act.owner === 'player' });
    }
    const mine = act.owner === 'player';
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p || !p.alive) continue;
      p.fatigue = clamp(p.fatigue - 9, 0, 100);
      p.stress = clamp(p.stress + (p.fatigue > 60 ? 4 : -4) + traitMod(s, act, 'stress') / 6, 0, 100);
      p.inspiration = clamp(p.inspiration + 7, 0, 100);
      const success = (act.momentum - 40) / 20;
      const trustF = mine && !act.playerBand ? (act.trust - 50) / 12 : 0;
      const target = 60 + success * 4 + trustF + traitMod(s, act, 'morale') - p.fatigue / 8 - p.stress / 10;
      p.morale = clamp(p.morale + (target - p.morale) * 0.25, 0, 100);
      // experiência natural
      if (act.status === 'active') for (const k of ['comp', 'voice', 'instr', 'stage'] as const) growPerson(p, k, 0.18);
      // envelhecimento: voz e palco declinam depois dos 55
      const age = s.year - p.born;
      if (age > 55) {
        p.skills.voice = Math.max(5, p.skills.voice - 0.08);
        p.skills.stage = Math.max(5, p.skills.stage - 0.06);
      }
      if (p.health !== 'ok' && r.chance(0.12)) p.health = p.health === 'recovering' ? 'ok' : 'recovering';
      // saída de membro (GDD §9: moral < 25 ou confiança < 20 por 3 meses)
      const unhappy = p.morale < 25 || (mine && !act.playerBand && act.trust < 20);
      p.lowMoraleMonths = unhappy ? p.lowMoraleMonths + 1 : 0;
      if (p.lowMoraleMonths >= 3 && act.members.length > 1) {
        emitEvent(s, r, 'member_leaves', { act: act.id, person: p.id });
        p.lowMoraleMonths = 0;
      }
    }
    // carreira em 3 eixos com histerese
    const target = Math.max(0, 11 * Math.log10(1 + act.fans.casual + act.fans.active * 4 + act.fans.core * 15) - 24);
    act.fame = clamp(act.fame + (target - act.fame) * (target > act.fame ? 0.06 : 0.025), 0, 100);
    if (hasMutator(s, 'no_stars')) act.fame = Math.min(act.fame, 80);
    act.momentum = clamp(act.momentum * 0.94 + (s.week - act.lastRelease < 20 ? 2 : -1), 0, 100);
    act.networking *= 0.92;
    if (act.gigSat) act.gigSat *= 0.7;
    const fanMult = hasMutator(s, 'strong_fanclubs') ? 1.5 : 1;
    act.fans.casual = Math.round(act.fans.casual * 0.982);
    act.fans.active = Math.round(act.fans.active * 0.99 + act.fans.casual * 0.004);
    act.fans.core = Math.round(act.fans.core * 0.997 + act.fans.active * 0.006 * fanMult);
    if (mine && !act.playerBand) {
      act.trust = clamp(act.trust + (c?.recoupBalance === 0 ? 0.6 : 0) + (act.momentum > 50 ? 0.5 : -0.2), 0, 100);
      // estrelas querem royalties à altura da fama (feedback negativo contra bola de neve)
      if (c && act.fame > 35) {
        const want = 0.14 + act.fame / 400;
        if (c.royalty < want) act.trust = clamp(act.trust - (want - c.royalty) * 25, 0, 100);
      }
    }
    // legado
    if (!act.legend && act.number1s >= 3 && act.fame > 70) {
      act.legend = true;
      remember(s, 'legend', fmtL(l('{a} vira lenda.', '{a} becomes a legend.'), { a: act.name }), { actId: act.id, important: true });
      if (mine) s.player.stats.influential += 1;
    }
    // quem não decola desiste (atos procedurais sem contrato)
    if (!act.owner && !act.catalogNo && !act.playerBand && act.fame < 8 && s.year - act.formed >= 5 && r.chance(0.05)) {
      act.status = 'split';
      act.careerEnd = s.year;
      continue;
    }
    // aposentadoria e fênix
    if (s.year >= act.careerEnd && !act.playerBand && act.status !== 'hiatus') {
      if (r.chance(0.08) && !histLocked(s, act)) {
        act.status = 'hiatus';
        act.hiatusUntil = s.week + r.int(260, 700);
        act.archetype = act.archetype ?? 'phoenix';
        act.careerEnd = s.year + r.int(12, 25);
        remember(s, 'hiatus', fmtL(l('{a} entra em pausa por tempo indeterminado.', '{a} goes on indefinite hiatus.'), { a: act.name }), { actId: act.id, important: !!act.catalogNo || mine });
      } else retireAct(s, act);
    }
  }
}

export function retireAct(s: GameState, act: Act): void {
  if (act.owner && act.owner !== 'player') endContract(s, act, 'expired');
  if (act.owner === 'player' && !act.playerBand) endContract(s, act, 'expired');
  act.status = 'retired';
  remember(s, 'retired', fmtL(l('{a} se aposenta dos palcos.', '{a} retires from the stage.'), { a: act.name }), { actId: act.id, important: !!act.catalogNo || act.legend });
}

/** Atos fora do jogador produzem e lançam conforme dono (selo rival ou independente). */
export function npcProduction(s: GameState, r: Rng): void {
  for (const act of Object.values(s.acts)) {
    if (act.owner === 'player' || (act.status !== 'active' && act.status !== 'emerging') || histLocked(s, act)) continue;
    const lb = act.owner ? s.labels[act.owner] : undefined;
    const pace = lb ? 0.35 : 0.12;
    let unrec = unrecorded(s, act);
    if (unrec.length < 5 && r.chance(pace)) {
      composeSongs(s, r, act, r.int(1, 2));
      unrec = unrecorded(s, act);
    }
    if (unrec.length >= 3) {
      if (lb && lb.cash > 0) {
        const tier = lb.family === 'B' ? r.int(1, 2) : lb.family === 'A' || lb.family === 'C' ? r.int(2, 3) : 2;
        recordSongs(s, r, act, unrec.slice(0, 5).map((x) => x.id), tier, r.pick(['spontaneous', 'balanced', 'meticulous']), lb.id);
      } else if (!lb && r.chance(0.35)) {
        recordSongs(s, r, act, unrec.slice(0, 3).map((x) => x.id), act.cash > money(s, 4000) ? 1 : 0, 'spontaneous', 'act');
      }
    }
    let ready = unreleasedRecorded(s, act);
    const since = s.week - act.lastRelease;
    if (ready.length && since > (lb ? r.int(18, 40) : r.int(30, 70))) {
      // era do álbum: selos completam o repertório para lançar LP
      if (lb && s.year >= 1958 && act.releases.length >= 1 && ready.length < 8 && r.chance(s.year >= 1965 && s.year < 2008 ? 0.45 : 0.2)) {
        const extra = composeSongs(s, r, act, 8 - ready.length);
        recordSongs(s, r, act, extra.map((x) => x.id), 2, 'balanced', lb.id);
        ready = unreleasedRecorded(s, act);
      }
      const type = ready.length >= 8 && s.year >= 1955 ? 'lp' : 'single';
      const songs = type === 'lp' ? ready.slice(0, 10) : [ready.sort((a, b) => b.q - a.q)[0]];
      const fam = lb?.family;
      const budget = lb ? (fam === 'A' ? 20000 : fam === 'C' ? 16000 : fam === 'D' ? 6000 : 4000) * (0.5 + act.fame / 40) : 0;
      if (lb && lb.cash < money(s, budget)) continue;
      if (lb) lb.cash -= money(s, budget);
      launchNpcRelease(s, r, act, lb ? lb.id : 'indie', songs.map((x) => x.id), type, budget);
    }
  }
}

/** Mundo vivo: surgem atos do catálogo (com rumor antes) e procedurais. */
export function worldSpawns(s: GameState, r: Rng): void {
  for (const u of [...s.upcoming]) {
    if (s.year < u.debut - 2) continue;
    s.upcoming.splice(s.upcoming.indexOf(u), 1);
    const act = makeAct(s, r, {
      name: u.name, genre: u.genre, city: u.city, members: u.members, potential: u.potential,
      formed: s.year, debutYear: u.debut, catalogNo: u.no, archetype: u.synthetic ? 'synthetic' : undefined,
      fame: r.float(0.5, 3), startFrac: r.float(0.5, 0.62), rs: u.rs,
    });
    act.name = u.name;
    act.careerEnd = u.debut + r.int(14, 44);
    // rumor de cena: quem mora perto ouve primeiro
    if (s.config.role !== 'artist' && (s.player.territories.includes(CITIES.find((c) => c.id === u.city)?.market ?? 'na') || r.chance(0.35))) {
      addSignal(s, r, act.id, 'scene');
    }
  }
  const base = hasMutator(s, 'small_world') ? 0.9 : hasMutator(s, 'giant_world') ? 3 : 1.7;
  const n = Math.round(base * (s.config.mode === 'historic' ? 0.9 : 1.1) * r.float(0.6, 1.4) * dbSizeInfo(s.config).yearly);
  for (let i = 0; i < n; i++) spawnProceduralAct(s, r);
}

/** Mantém o save leve: apaga atos irrelevantes aposentados há muito tempo. */
export function prune(s: GameState): void {
  const keepActs = new Set<string>();
  for (const k of Object.keys(s.knowledge)) keepActs.add(k);
  for (const a of Object.values(s.acts)) {
    const old = a.status === 'retired' || a.status === 'split';
    const notable = a.catalogNo || a.hits > 0 || a.owner === 'player' || a.playerBand || a.legend || keepActs.has(a.id);
    const stale = !old && !a.owner && a.fame < 3 && s.year - a.formed > 8 && a.releases.length === 0;
    if (((old && s.year - a.careerEnd > 3) || stale) && !notable) {
      // a pessoa pode estar em outro ato (carreira solo, supergrupo) ou ser você: só sai se ninguém mais usa
      for (const id of a.members) if (!s.persons[id]?.isPlayer && !Object.values(s.acts).some((b) => b !== a && b.members.includes(id))) delete s.persons[id];
      for (const id of a.songs) delete s.songs[id];
      for (const id of a.releases) delete s.releases[id];
      if (a.contractId) delete s.contracts[a.contractId];
      delete s.acts[a.id];
    }
  }
  // lançamentos de terceiros fora de catálogo ativo: só ficam os que marcaram época
  for (const rel of Object.values(s.releases)) {
    if (rel.live || rel.owner === 'player' || s.acts[rel.actId]?.playerBand) continue;
    const act = s.acts[rel.actId];
    const notable = rel.hist || rel.peak <= 3 || (act && (act.catalogNo || act.legend) && rel.peak <= 20);
    if (!notable && s.week - rel.week > 60) {
      for (const id of rel.songs) delete s.songs[id];
      if (act) {
        act.songs = act.songs.filter((id) => s.songs[id]);
        act.releases = act.releases.filter((id) => id !== rel.id);
      }
      delete s.releases[rel.id];
      continue;
    }
    if (rel.weekly.length > 8) rel.weekly = rel.weekly.slice(0, 8);
    rel.autopsy = undefined;
    if (s.week - rel.week > 60 && rel.songs.length) {
      for (const id of rel.songs) delete s.songs[id];
      rel.songs = [];
      if (act) act.songs = act.songs.filter((id) => s.songs[id]);
    }
  }
  // músicas antigas nunca gravadas
  for (const song of Object.values(s.songs)) {
    if (!song.recorded && s.week - song.createdWeek > 156 && s.acts[song.actId]?.owner !== 'player') {
      const act = s.acts[song.actId];
      if (act) act.songs = act.songs.filter((x) => x !== song.id);
      delete s.songs[song.id];
    }
  }
  // contratos encerrados de terceiros
  for (const c of Object.values(s.contracts)) {
    if (c.endWeek < s.week - 52 && c.party !== 'player' && s.acts[c.actId]?.contractId !== c.id) delete s.contracts[c.id];
  }
}

export function newRivalLabel(s: GameState, r: Rng): void {
  const active = Object.values(s.labels).filter((x) => x.active).length;
  if (active >= 14 || !r.chance(0.08)) return;
  const city = r.pick(CITIES.filter((c) => MARKETS.find((m) => m.id === c.market)!.size(s.year) > 0.2));
  const word = r.pick(['Lantern', 'Copper', 'Riverside', 'Paper Moon', 'Static', 'Hollow Oak', 'Sundial', 'Velvet Rope', 'Night Owl', 'Brass Tacks', 'Orbit', 'Magnolia']);
  const id = nextId(s, 'lb');
  s.labels[id] = {
    id, name: `${word} Records`, family: 'B', city: city.id, founded: s.year, focus: [], cash: money(s, r.int(150000, 600000)),
    reputation: 30, roster: [], active: true, aggression: r.float(0.3, 0.7), strategy: 'niche', territories: [city.market],
    revenueYear: 0, revenueLastYear: 0, procedural: true,
  };
  remember(s, 'label_new', fmtL(l('Novo selo independente: {n} ({c}).', 'New indie label: {n} ({c}).'), { n: `${word} Records`, c: city.name }));
  notify(s, fmtL(l('Novo rival: {n}.', 'New rival: {n}.'), { n: `${word} Records` }), 'info');
}
