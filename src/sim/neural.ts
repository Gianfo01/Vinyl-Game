// Era sintética (GDD §24 + pedido do criador): shows com hologramas de artistas mortos, lançamentos
// póstumos de inéditas e músicas novas com a voz do artista via IA. Tudo comprado nas eras
// 2027+; exige direitos de imagem — se não forem seus, é preciso negociar com o espólio.

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { composeSongs, songQ } from './production';
import type { Act, GameState, Person } from './types';
import type { HologramShow } from './xtypes';
import { fmtL, hasTech, money, nextId, notify, post, remember } from './util';
import { addAsset } from './finance';

export function hologramReady(s: GameState): boolean {
  return hasTech(s, 'hologram');
}

export function aiVoiceReady(s: GameState): boolean {
  return hasTech(s, 'synthetic_voice');
}

/** Pessoas falecidas com obra relevante — candidatas a holograma, póstumo ou voz IA. */
export function deceasedLegends(s: GameState): { person: Person; act: Act }[] {
  const out: { person: Person; act: Act }[] = [];
  for (const act of Object.values(s.acts)) {
    if (act.fame < 15 && !act.catalogNo) continue;
    for (const id of act.members) {
      const p = s.persons[id];
      if (p && !p.alive && p.role !== 'synthetic') out.push({ person: p, act });
    }
  }
  return out;
}

export function rightsHolder(s: GameState, personId: string): { holder: string; ask: number; ownedByPlayer: boolean } {
  const ir = s.imageRights[personId];
  const ownedByPlayer = ir?.holder === 'player';
  return { holder: ir?.holder ?? 'estate', ask: ir?.feeAsk ?? money(s, 30000), ownedByPlayer };
}

/** Negociar direitos de imagem/voz com o espólio. Consentimento importa para o legado. */
export function negotiateImageRights(s: GameState, r: Rng, personId: string, offer: number): L {
  const p = s.persons[personId];
  if (!p || p.alive) return l('Só para artistas falecidos.', 'Only for deceased artists.');
  const ir = (s.imageRights[personId] ??= { personId, holder: 'estate', feeAsk: money(s, 30000), consent: false });
  if (ir.holder === 'player') return l('Os direitos já são seus.', 'You already own the rights.');
  if (s.player.cash < offer) return l('Caixa insuficiente.', 'Not enough cash.');
  const ratio = offer / ir.feeAsk;
  const trustBonus = s.player.reputation.artists / 200;
  const chance = clamp(ratio * 0.6 + trustBonus - (s.player.neural.voiceScandal ? 0.25 : 0), 0.02, 0.95);
  if (!r.chance(chance)) {
    ir.feeAsk = Math.round(ir.feeAsk * 1.1);
    return fmtL(l('O espólio de {p} recusou. Pedem agora {x}.', '{p}\'s estate refused. They now ask {x}.'), { p: p.name, x: String(Math.round(ir.feeAsk / 100)) });
  }
  post(s, `imgrights:${personId}`, -offer, 'rights', `Direitos de imagem de ${p.name}`);
  ir.holder = 'player';
  ir.consent = true;
  addAsset(s, { kind: 'voice', name: fmtL(l('Imagem e voz de {p}', '{p} image and voice'), { p: p.name }), cost: offer, lifeMonths: 120, refId: personId });
  s.player.neural.voiceLicenses += 1;
  if (s.player.neural.consentPolicy === 'none') s.player.neural.consentPolicy = 'consent';
  remember(s, 'image_rights', fmtL(l('O espólio de {p} licencia imagem e voz ao selo.', '{p}\'s estate licenses image and voice to the label.'), { p: p.name }), { important: true });
  return l('Acordo assinado: imagem e voz licenciadas com consentimento.', 'Deal signed: image and voice licensed with consent.');
}

/** Usar sem consentimento: possível, barato e perigoso (escândalo, processo, final "Voz Calada"). */
function unauthorizedUse(s: GameState, r: Rng, p: Person, act: Act): void {
  s.player.neural.consentPolicy = 'no_consent';
  if (r.chance(0.45)) {
    s.player.neural.voiceScandal = true;
    s.player.reputation.artists = clamp(s.player.reputation.artists - 15, 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 10, 0, 100);
    s.lawsuits.push({ id: nextId(s, 'ls'), kind: 'image', plaintiff: fmtL(l('Espólio de {p}', '{p} estate'), { p: p.name }).pt, defendant: 'player', actId: act.id, claim: money(s, 250000), odds: 0.1, stage: 'filed', nextWeek: s.week + 8, text: fmtL(l('Uso não autorizado da imagem de {p}.', 'Unauthorized use of {p}\'s likeness.'), { p: p.name }) });
    notify(s, fmtL(l('Escândalo: uso da voz/imagem de {p} sem consentimento.', 'Scandal: {p}\'s voice/likeness used without consent.'), { p: p.name }), 'bad');
    remember(s, 'voice_scandal', fmtL(l('Escândalo da voz: {p} usado(a) sem autorização.', 'Voice scandal: {p} used without authorization.'), { p: p.name }), { important: true });
  }
}

// ---------- Hologramas ----------

export function hologramCost(s: GameState): number {
  return money(s, 180000);
}

export function startHologramShow(s: GameState, r: Rng, personId: string, months: number, authorized: boolean): HologramShow | L {
  if (!hologramReady(s)) return l('A tecnologia de hologramas ainda não existe.', 'Hologram technology does not exist yet.');
  const p = s.persons[personId];
  if (!p || p.alive) return l('Só artistas que já partiram.', 'Only artists who have passed.');
  const act = Object.values(s.acts).find((a) => a.members.includes(personId));
  if (!act) return l('Sem carreira associada.', 'No associated career.');
  const rights = rightsHolder(s, personId);
  if (authorized && !rights.ownedByPlayer) return l('Negocie os direitos de imagem com o espólio primeiro.', 'Negotiate image rights with the estate first.');
  const cost = hologramCost(s) + money(s, 8000 * months);
  if (s.player.cash < cost) return l('Caixa insuficiente para produção do holograma.', 'Not enough cash for hologram production.');
  post(s, `holo:${personId}:${s.week}`, -cost, 'live_costs', `Holograma de ${p.name}`);
  addAsset(s, { kind: 'hologram', name: fmtL(l('Holograma de {p}', '{p} hologram'), { p: p.name }), cost: hologramCost(s), lifeMonths: 36, refId: personId });
  const show: HologramShow = { id: nextId(s, 'ho'), actId: act.id, personId, rights: rights.ownedByPlayer ? 'owned' : 'licensed', estateFee: rights.ownedByPlayer ? 0 : rights.ask, shows: 0, revenue: 0, untilWeek: s.week + Math.round(months * 4.35) };
  s.holograms.push(show);
  s.player.neural.ghostVoice = true;
  s.player.neural.neuralAdopted = true;
  if (!authorized) unauthorizedUse(s, r, p, act);
  remember(s, 'hologram', fmtL(l('{p} volta ao palco como holograma ({a}).', '{p} returns to the stage as a hologram ({a}).'), { p: p.name, a: act.name }), { actId: act.id, important: true });
  return show;
}

function hologramsMonth(s: GameState, r: Rng): void {
  for (const h of s.holograms) {
    if (h.untilWeek < s.week) continue;
    const act = s.acts[h.actId];
    if (!act) continue;
    // novidade cai mês a mês; nostalgia sustenta parte
    const age = h.shows / 12;
    const demand = (act.fans.core * 1.2 + act.fans.active * 0.4 + act.fans.casual * 0.02) * Math.max(0.15, 1 - age * 0.25);
    const shows = 12;
    const sold = Math.round(Math.min(demand, 8000 * shows) * r.float(0.8, 1.15));
    const rev = sold * money(s, 70);
    h.shows += shows;
    h.revenue += rev;
    post(s, `holoshow:${h.id}`, rev, 'live', `Residência holográfica ${act.name}`);
    if (h.rights === 'owned') post(s, `holofee:${h.id}`, -Math.round(rev * 0.1), 'rights', 'Repasse ao espólio');
    act.fans.casual += Math.round(sold * 0.1);
    s.player.neural.humanFocus -= 0.5;
  }
  s.holograms = s.holograms.filter((h) => h.untilWeek > s.week - 52);
}

// ---------- Póstumos ----------

export function posthumousRelease(s: GameState, r: Rng, personId: string, authorized: boolean): L | null {
  const p = s.persons[personId];
  if (!p || p.alive) return l('Só artistas que já partiram.', 'Only artists who have passed.');
  const vault = (s.vault[personId] ?? []).filter((id) => s.songs[id] && !s.songs[id].releaseId);
  if (!vault.length) return l('Não há inéditas no cofre.', 'No unreleased songs in the vault.');
  const rights = rightsHolder(s, personId);
  if (authorized && !rights.ownedByPlayer) return l('Negocie os direitos com o espólio primeiro.', 'Negotiate rights with the estate first.');
  const act = Object.values(s.acts).find((a) => a.members.includes(personId))!;
  const cost = money(s, 6000 + vault.length * 1500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `posth:${personId}`, -cost, 'recording', `Finalização póstuma: ${p.name}`);
  for (const id of vault) {
    const song = s.songs[id];
    song.performance = clamp(song.melody * 0.7 + (aiVoiceReady(s) ? 15 : 5) + r.normal(0, 5), 5, 100);
    song.production = clamp(55 + r.normal(0, 6), 5, 100);
    song.q = songQ(song);
    song.recorded = true;
    song.posthumous = true;
    song.vault = false;
    // a carreira precisa estar com o selo para o lançamento
    if (act.owner !== 'player') act.owner = 'player';
  }
  if (!authorized) unauthorizedUse(s, r, p, act);
  remember(s, 'posthumous', fmtL(l('Inéditas de {p} saem do cofre para um disco póstumo.', '{p}\'s unreleased songs leave the vault for a posthumous record.'), { p: p.name }), { actId: act.id, important: true });
  s.flags[`posthumousReady:${act.id}`] = 1;
  return null;
}

// ---------- Voz IA ----------

export function aiVoiceSongs(s: GameState, r: Rng, personId: string, n: number, authorized: boolean): L | null {
  if (!aiVoiceReady(s)) return l('Vozes sintéticas ainda não existem.', 'Synthetic voices do not exist yet.');
  const p = s.persons[personId];
  if (!p) return l('Inválido.', 'Invalid.');
  const rights = rightsHolder(s, personId);
  if (!p.alive && authorized && !rights.ownedByPlayer) return l('Negocie os direitos com o espólio primeiro.', 'Negotiate rights with the estate first.');
  const act = Object.values(s.acts).find((a) => a.members.includes(personId));
  if (!act) return l('Sem carreira associada.', 'No associated career.');
  const cost = money(s, 12000 * n);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `aivoice:${personId}:${s.week}`, -cost, 'recording', `Voz sintética: ${p.name}`);
  const songs = composeSongs(s, r, act, n);
  for (const song of songs) {
    song.aiVoice = true;
    song.synthetic = true;
    song.performance = clamp(p.skills.voice * 0.9 + r.normal(0, 4), 5, 100);
    song.production = clamp(70 + r.normal(0, 5), 5, 100);
    song.originality = clamp(song.originality - 10, 0, 100);
    song.q = songQ(song);
    song.recorded = true;
  }
  if (act.owner !== 'player') act.owner = 'player';
  s.player.neural.neuralAdopted = true;
  s.player.neural.voiceLicenses += authorized ? 1 : 0;
  if (!authorized) unauthorizedUse(s, r, p, act);
  else if (s.player.neural.consentPolicy !== 'no_consent') s.player.neural.consentPolicy = 'consent';
  remember(s, 'ai_voice', fmtL(l('{n} faixa(s) novas com a voz sintética de {p}.', '{n} new track(s) with {p}\'s synthetic voice.'), { n, p: p.name }), { actId: act.id, important: true });
  return null;
}

export function neuralMonth(s: GameState, r: Rng): void {
  hologramsMonth(s, r);
}
