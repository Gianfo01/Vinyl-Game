// Liga o conteúdo autoral (data/content.ts) aos sistemas: críticos com viés, marcas e clientes de
// sync, produtores com assinatura, geopolítica/censura e prêmios regionais. Importado uma vez no
// carregamento da simulação; idempotente.

import { AWARDS, BRANDS as C_BRANDS, CRITICS as C_CRITICS, GEOPOLITICS, PRODUCERS as C_PRODUCERS, outletById } from '../data/content';
import { l } from '../data/world';
import { setCritics, setCensorRules, type CensorRule } from './media';
import { setBrands, type BrandDef } from './brands';
import { PRODUCERS, SIGNATURES, type ProducerDef } from './studio';
import { setGeoEvents, type GeoEvent } from './culture';
import { setRegionalAwards, type AwardDef } from './awards2';

const SIG: Record<string, ProducerDef['signature']> = {
  wall_of_sound: 'wall_of_sound', lo_fi: 'lofi', maximalist: 'maximalist', dry: 'dry', organic: 'organic', trap_808: 'trap808', neural: 'neural',
  live_room: 'organic', orchestral: 'swing', tape_echo: 'dry', gated_reverb: 'maximalist', loudness: 'glossy', sample_collage: 'lofi',
  dub_space: 'dub', autotune: 'glossy', minimal: 'dry', arranger: 'swing',
};

let done = false;

export function applyContent(): void {
  if (done) return;
  done = true;
  setCritics(C_CRITICS.map((c) => {
    const o = outletById[c.outlet];
    return { name: c.name, outlet: o?.name ?? c.outlet, from: c.start, to: c.end, favors: c.favored, dislikes: c.disfavored, mainstream: c.mainstream, harsh: c.harshness, prestige: o?.bias.prestige ?? 60, realRef: o?.realRef, id: c.id, region: o?.market ?? 'global' };
  }));

  const kindOf = (cat: string): BrandDef['kind'] =>
    cat === 'film_studio' ? 'sync_film' : cat === 'tv_network' || cat === 'novela' || cat === 'streaming_original' ? 'sync_tv' : cat === 'game_studio' ? 'sync_game' : cat === 'ad_agency' ? 'sync_ad' : cat === 'radio_maker' ? 'license' : 'sponsor';
  const imageOf = (vals: string[]): BrandDef['image'] =>
    vals.includes('luxury') ? 'luxury' : vals.includes('edgy') ? 'edgy' : vals.includes('tech') ? 'tech' : vals.includes('youth') || vals.includes('sport') ? 'youth' : 'family';
  setBrands(C_BRANDS.map((b) => ({ name: b.name, realRef: b.realRef, kind: kindOf(b.category), from: b.start, to: b.end ?? 2040, image: imageOf(b.values), budget: [0, 3000, 7000, 12000, 20000, 35000][b.budget] })));

  const mapped: ProducerDef[] = C_PRODUCERS.map((p) => {
    const sig = SIG[p.signature] ?? 'organic';
    return { id: p.id, name: p.name, signature: sig, from: p.start, to: p.end, families: p.families.length ? p.families : SIGNATURES[sig].families, skill: p.skill, fee: Math.max(80, Math.round(p.fee / 10)), ego: p.ego };
  });
  if (mapped.length) PRODUCERS.splice(0, PRODUCERS.length, ...mapped);

  const geo: GeoEvent[] = GEOPOLITICS.map((g) => ({
    id: g.id, name: g.name, from: g.from, to: g.to, markets: g.markets, demand: g.effects.demandMult,
    liveBlocked: g.effects.touringBlocked, pressingMult: g.kind === 'oil_crisis' ? 1.5 : g.kind === 'war' ? 1.3 : undefined, note: g.desc,
  }));
  setGeoEvents(geo);
  const cens: CensorRule[] = GEOPOLITICS.filter((g) => g.effects.censorshipLevel >= 0.3).map((g) => {
    const banned: string[] = [...g.effects.bannedTags];
    if (g.effects.bannedTags.some((t) => t === 'western' || t === 'decadent')) banned.push('rock', 'electronic', 'hiphop');
    if (g.effects.bannedTags.includes('foreign')) banned.push('blues_jazz');
    if (g.effects.bannedTags.includes('protest')) banned.push('political', 'country_folk');
    return { id: g.id, name: g.name, markets: g.markets, from: g.from, to: g.to, level: g.effects.censorshipLevel * 0.6, banned };
  });
  setCensorRules(cens);

  const regional: Record<string, AwardDef> = {};
  for (const a of AWARDS) if (a.kind === 'regional' && a.market !== 'global' && !regional[a.market]) regional[a.market] = { id: a.id, name: l(a.name), realRef: a.realRef };
  setRegionalAwards(regional);
}

applyContent();
