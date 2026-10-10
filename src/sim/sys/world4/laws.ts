import { deferEvents } from '../../ext4';
// Leis e indústria: sindicato dos músicos (piso, acordo, greves), sociedades de direitos rivais,
// associação do setor com votação de leis, selo de conteúdo explícito e pirataria com resposta.

import { clamp, type Rng } from '../../../core/rng';
import { cityById, familyOf, l, type L } from '../../../data/world';
import { type EventDef } from '../../events';
import { registerMod } from '../../ext4';
import type { GameState } from '../../types';
import { fmtL, hasMutator, hasTech, money, notify, post, remember } from '../../util';
import { liveMine, liveMineReleases, mineRel, rep } from './common';
import { STANCE_NAME, setStance } from './milestones';
import { w4, type LawState, type PiracyStance, type Society } from './state';
import { emitFact } from '../../facts17';

// ======================================================================= sindicato

export function setUnion(s: GameState, on: boolean): L | null {
  const w = w4(s);
  if (w.union === on) return null;
  w.union = on;
  if (on) rep(s, 'artists', 3);
  else rep(s, 'artists', -4);
  remember(s, 'union', on ? l('O selo assina o acordo sindical (piso dos músicos).', 'The label signs the union agreement (musicians\' scale).') : l('O selo rompe o acordo sindical.', 'The label breaks the union agreement.'));
  return null;
}

export function unionMonthlyCost(s: GameState): number {
  return money(s, 100 + 60 * liveMine(s).length);
}

// ======================================================================= sociedades

export const SOCIETIES: Record<Society, { name: L; realRef: string; from: number; rate: number; fee: number; desc: L }> = {
  scae: { name: l('SCAE — Sociedade de Compositores, Autores e Editores', 'SCAE — Society of Composers, Authors and Editors'), realRef: 'ASCAP', from: 1914, rate: 0.055, fee: 0.15, desc: l('A tradicional: paga mais por execução, cobra taxa alta e tem gosto conservador.', 'The old guard: pays more per play, charges a high fee and has conservative taste.') },
  rmr: { name: l('RMR — Radiodifusão Música Registrada', 'RMR — Registered Broadcast Music'), realRef: 'BMI', from: 1941, rate: 0.05, fee: 0.07, desc: l('A das rádios: taxa menor e aberta a country, R&B, latina e rap.', 'The broadcasters\' society: lower fee, open to country, R&B, Latin and rap.') },
};

export function societyAvailable(s: GameState, soc: Society): boolean {
  return s.year >= SOCIETIES[soc].from || (soc === 'rmr' && w4(s).ms.ascap !== undefined);
}

export function setSociety(s: GameState, soc: Society | undefined): L | null {
  const w = w4(s);
  if (w.society === soc) return null;
  if (soc && !societyAvailable(s, soc)) return l('Essa sociedade ainda não existe.', 'That society does not exist yet.');
  if (w.society && soc) {
    const cost = money(s, 1500);
    if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, 'w4socswitch', -cost, 'w4_rights', 'Transferência de sociedade (auditoria)');
  }
  w.society = soc;
  return null;
}

registerMod('appeal', 'w4society', (s, value, ctx) => {
  if (w4(s).society !== 'rmr' || !ctx.release || !ctx.act || !mineRel(s, ctx.release)) return null;
  return ['country_folk', 'rnb', 'latin', 'caribbean', 'hiphop'].includes(familyOf(ctx.act.genre)) ? { value: value * 1.05, label: l('RMR abre portas nas rádios', 'RMR opens radio doors') } : null;
});

// ======================================================================= associação e leis

export interface LawDef {
  id: string;
  year: number;
  name: L;
  realRef: string;
  desc: L;
  yes: L; // efeito se aprovada
  base: number; // chance de aprovação sem o jogador
}

export const LAWS: LawDef[] = [
  { id: 'radio_quota', year: 1971, name: l('Cotas de música nacional no rádio', 'National music quotas on radio'), realRef: 'CanCon (Canadá, 1971); cotas no Brasil e na França', desc: l('Rádios teriam de tocar uma parte mínima de artistas nacionais.', 'Stations would have to play a minimum share of national artists.'), yes: l('Artistas da sua praça +10% em casa; estrangeiros −7%.', 'Acts from your home market +10% at home; foreign acts −7%.'), base: 0.5 },
  { id: 'blank_tax', year: 1985, name: l('Imposto sobre fitas e mídias virgens', 'Levy on blank tapes and media'), realRef: 'Taxas de cópia privada (Alemanha 1965, EUA AHRA 1992)', desc: l('Parte do preço de cada fita virgem iria para gravadoras e autores.', 'Part of each blank tape\'s price would go to labels and writers.'), yes: l('Repasse mensal pela sua fatia de mercado; pirataria −15%.', 'Monthly levy by your market share; piracy −15%.'), base: 0.45 },
  { id: 'term', year: 1998, name: l('Extensão do prazo de direito autoral', 'Copyright term extension'), realRef: 'Sonny Bono Act (EUA, 1998); diretiva europeia de 2011', desc: l('Gravações antigas ficariam protegidas por mais 20 anos.', 'Old recordings would stay protected for 20 more years.'), yes: l('Reedições e coletâneas +15%; direitos +5%.', 'Reissues and compilations +15%; rights +5%.'), base: 0.6 },
  { id: 'ai_rules', year: 2024, name: l('Regras para música gerada por IA', 'Rules for AI-generated music'), realRef: 'AI Act europeu, leis de voz (ELVIS Act, 2024)', desc: l('Rótulo obrigatório para música sintética e consentimento para clonar vozes.', 'Mandatory labels for synthetic music and consent to clone voices.'), yes: l('Atos sintéticos −15%; humanos +4%.', 'Synthetic acts −15%; human acts +4%.'), base: 0.55 },
];

export const lawById: Record<string, LawDef> = Object.fromEntries(LAWS.map((x) => [x.id, x]));

export const passed = (s: GameState, id: string) => w4(s).laws[id]?.status === 'passed';

export function assocDues(s: GameState): number {
  return money(s, 1200 + s.player.hq * 900);
}

export function joinAssoc(s: GameState, on: boolean): L | null {
  const w = w4(s);
  if (w.assoc === on) return null;
  if (on) {
    const cost = assocDues(s);
    if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, 'w4assoc', -cost, 'w4_rights', 'Anuidade da associação de gravadoras');
    rep(s, 'institutional', 2);
  }
  w.assoc = on;
  return null;
}

/** Influência do selo na associação (0..1). */
export function influence(s: GameState): number {
  const w = w4(s);
  if (!w.assoc) return 0;
  return clamp(0.04 + s.stats.marketShare * 0.6 + s.player.reputation.institutional / 400, 0, 0.5);
}

export function lobby(s: GameState, lawId: string): L | null {
  const st = w4(s).laws[lawId];
  if (!st || st.status !== 'pending') return l('Nada em votação.', 'Nothing up for a vote.');
  if (!w4(s).assoc) return l('Só membros da associação fazem lobby.', 'Only association members can lobby.');
  const cost = money(s, 3000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4lobby:${lawId}:${st.lobby}`, -cost, 'w4_rights', `Lobby ${lawId}`);
  st.lobby += 1;
  return null;
}

export function castVote(s: GameState, lawId: string, vote: 'yes' | 'no'): void {
  const st = w4(s).laws[lawId];
  if (st && st.status === 'pending') st.vote = vote;
}

/** Chance de aprovação dado o voto e o lobby do jogador. */
export function lawChance(s: GameState, lawId: string): number {
  const d = lawById[lawId];
  const st = w4(s).laws[lawId];
  if (!d || !st) return 0;
  const sign = st.vote === 'yes' ? 1 : st.vote === 'no' ? -1 : 0;
  return clamp(d.base + sign * (influence(s) + st.lobby * 0.06), 0.05, 0.95);
}

const lawEvents: EventDef[] = LAWS.map((d) => ({
  id: `w4_law_${d.id}`, cat: 'world', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
  title: fmtL(l('Votação na associação: {n}', 'Association vote: {n}'), { n: d.name }),
  text: fmtL(l('{d} Se aprovada: {y} A votação fecha em três meses; lobby aumenta seu peso.', '{d} If passed: {y} Voting closes in three months; lobbying adds weight.'), { d: d.desc, y: d.yes }),
  options: [
    { id: 'yes', label: l('Votar a favor', 'Vote yes'), apply: (s: GameState) => castVote(s, d.id, 'yes') },
    { id: 'no', label: l('Votar contra', 'Vote no'), apply: (s: GameState) => castVote(s, d.id, 'no') },
    { id: 'abstain', label: l('Abster-se', 'Abstain'), apply: () => {} },
  ],
}));
deferEvents(lawEvents);

function lawsMonth(s: GameState, r: Rng, emit: (id: string) => void): void {
  const w = w4(s);
  for (const d of LAWS) {
    const st: LawState | undefined = w.laws[d.id];
    if (!st && s.year >= d.year && s.year < d.year + 3) {
      w.laws[d.id] = { status: 'pending', year: s.year, lobby: 0, closes: s.week + 13 };
      notify(s, fmtL(l('Em votação: {n}.', 'Up for a vote: {n}.'), { n: d.name }), 'event');
      if (w.assoc) emit(`w4_law_${d.id}`);
      continue;
    }
    if (!st && s.year >= d.year + 3) {
      // começou a partida depois: a lei já foi decidida pela história
      w.laws[d.id] = { status: d.base >= 0.5 ? 'passed' : 'failed', year: d.year, lobby: 0 };
      continue;
    }
    const closes = st?.closes ?? 0;
    if (st && st.status === 'pending' && s.week >= closes) {
      const ok = r.chance(lawChance(s, d.id));
      st.status = ok ? 'passed' : 'failed';
      st.year = s.year;
      if (ok && d.id === 'term') s.economy.rightsMult = clamp(s.economy.rightsMult * 1.05, 0.6, 1.8);
      const text = fmtL(ok ? l('Aprovada: {n}.', 'Passed: {n}.') : l('Rejeitada: {n}.', 'Rejected: {n}.'), { n: d.name });
      remember(s, 'law', text, { important: true });
      notify(s, text, 'event');
      if (st.vote && (st.vote === 'yes') === ok) rep(s, 'institutional', 1);
    }
  }
  if (w.assoc && s.month === 0) post(s, 'w4assocdues', -assocDues(s), 'w4_rights', 'Anuidade da associação de gravadoras');
  if (passed(s, 'blank_tax')) post(s, 'w4levy', money(s, 80 + s.stats.marketShare * 15000), 'w4_rights', 'Repasse do imposto sobre mídia virgem');
}

registerMod('appeal', 'w4laws', (s, value, ctx) => {
  const rel = ctx.release;
  const act = ctx.act;
  if (!rel || !act) return null;
  let k = 1;
  if (passed(s, 'radio_quota')) {
    const home = cityById[s.config.homeCity]?.market;
    const am = cityById[act.city]?.market;
    if (home && rel.territories.includes(home)) k *= am === home ? 1.1 : 0.93;
  }
  if (passed(s, 'term') && (rel.reissueOf || rel.kind === 'compilation' || rel.kind === 'anniversary')) k *= 1.15;
  if (passed(s, 'ai_rules')) k *= act.archetype === 'synthetic' ? 0.85 : 1.04;
  return k === 1 ? null : { value: value * k, label: l('Leis do setor', 'Industry laws') };
});

// ======================================================================= selo de conteúdo explícito

export const EDGY = ['hiphop', 'rock'];
export const advisoryOn = (s: GameState) => w4(s).ms.pmrc !== undefined;

export function stickerRelease(s: GameState, relId: string): L | null {
  const rel = s.releases[relId];
  const w = w4(s);
  if (!rel || !mineRel(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (!advisoryOn(s)) return l('O selo de aviso ainda não existe.', 'The warning sticker does not exist yet.');
  const cur = w.advisory[relId];
  if (cur === 'sticker' || cur === 'both') return l('Já tem selo.', 'Already stickered.');
  const edgy = EDGY.includes(familyOf(s.acts[rel.actId]?.genre ?? ''));
  rel.appeal *= edgy ? 1.04 : 0.85;
  if (edgy) rep(s, 'artistic', 1);
  w.advisory[relId] = cur === 'clean' ? 'both' : 'sticker';
  return null;
}

export function cleanEdit(s: GameState, relId: string): L | null {
  const rel = s.releases[relId];
  const w = w4(s);
  if (!rel || !mineRel(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  const cur = w.advisory[relId];
  if (cur === 'clean' || cur === 'both') return l('Já tem versão limpa.', 'Already has a clean edit.');
  const cost = money(s, 1200);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4clean:${relId}`, -cost, 'w4_release', `Versão editada ${rel.title}`);
  rel.appeal *= 1.06;
  w.advisory[relId] = cur === 'sticker' ? 'both' : 'clean';
  return null;
}

function advisoryMonth(s: GameState, r: Rng): void {
  const w = w4(s);
  for (const id of Object.keys(w.advisory)) if (!s.releases[id]?.live) delete w.advisory[id];
  if (!advisoryOn(s) || !r.chance(0.08)) return;
  const cand = liveMineReleases(s, 26).filter((rel) => EDGY.includes(familyOf(s.acts[rel.actId]?.genre ?? '')) && !w.advisory[rel.id]);
  if (!cand.length) return;
  const rel = r.pick(cand);
  rel.appeal *= 0.9;
  w.advisory[rel.id] = 'sticker';
  rep(s, 'institutional', -3);
  const text = fmtL(l('Conselho de pais denuncia "{t}": o disco ganha selo de aviso à força e some de algumas redes.', 'A parents\' council denounces "{t}": the record is forced to carry a warning and vanishes from some chains.'), { t: rel.title });
  remember(s, 'advisory', text, { actId: rel.actId });
  notify(s, text, 'bad');
}

// ======================================================================= pirataria

export function piracyLevel(s: GameState): { level: number; name: L } {
  const w = w4(s);
  let level = 0.02;
  let name = l('Cópias caseiras raras', 'Rare home copies');
  if (hasTech(s, 'cassette')) { level = 0.08; name = l('Fita cassete e cópia doméstica', 'Cassette and home taping'); }
  if (s.year >= 1996 && hasTech(s, 'cd')) { level = 0.12; name = l('CD-R e camelôs', 'CD-R and street vendors'); }
  const p2p = s.techDates.p2p;
  const st = s.techDates.streaming;
  if (p2p !== undefined && s.year >= p2p && (st === undefined || s.year < st + 3)) { level = 0.3; name = l('Compartilhamento P2P', 'P2P file sharing'); }
  else if (st !== undefined && s.year >= st + 3) { level = 0.07; name = l('Ripadores e sites de stream ilegais', 'Rippers and illegal stream sites'); }
  if (w.ms.tapecampaign !== undefined && s.year < 1996) level *= 0.8;
  if (passed(s, 'blank_tax')) level *= 0.85;
  if (hasMutator(s, 'heavy_piracy')) level += 0.1;
  return { level: clamp(level, 0, 0.6), name };
}

export const STANCES: { id: PiracyStance; recover: number; name: L; desc: L; needs?: string }[] = [
  { id: 'none', recover: 0, name: STANCE_NAME.none, desc: l('Deixar como está.', 'Leave it be.') },
  { id: 'sue', recover: 0.25, name: STANCE_NAME.sue, desc: l('Recupera parte da perda; custo jurídico; artistas e fãs se irritam.', 'Recovers some losses; legal costs; artists and fans get angry.') },
  { id: 'cheap', recover: 0.15, name: STANCE_NAME.cheap, desc: l('Discos mais baratos: menos margem, mais apelo.', 'Cheaper records: less margin, more appeal.') },
  { id: 'drm', recover: 0.3, name: STANCE_NAME.drm, desc: l('Recupera mais, mas pode virar escândalo (discos que travam computadores).', 'Recovers more, but may become a scandal (discs that break computers).'), needs: 'cd' },
  { id: 'license', recover: 0.3, name: STANCE_NAME.license, desc: l('Licenciar serviços: recupera bem e melhora a imagem comercial.', 'License services: recovers well and improves commercial image.'), needs: 'internet' },
];

export function choosePiracy(s: GameState, st: PiracyStance): L | null {
  const d = STANCES.find((x) => x.id === st);
  if (!d) return l('Inválido.', 'Invalid.');
  if (d.needs && !hasTech(s, d.needs)) return l('Ainda não é possível nesta era.', 'Not possible in this era yet.');
  setStance(s, st);
  return null;
}

registerMod('appeal', 'w4cheap', (s, value, ctx) => (w4(s).piracy.stance === 'cheap' && ctx.release && mineRel(s, ctx.release) ? { value: value * 1.05, label: l('Preço baixo contra a pirataria', 'Low prices against piracy') } : null));

function piracyMonth(s: GameState, r: Rng, salesDelta: number): void {
  const w = w4(s);
  const p = w.piracy;
  const { level } = piracyLevel(s);
  const lost = Math.round((salesDelta * level) / Math.max(0.1, 1 - level));
  p.lost += lost;
  const d = STANCES.find((x) => x.id === p.stance) ?? STANCES[0];
  if (d.needs && !hasTech(s, d.needs)) return;
  const rec = Math.round(lost * d.recover);
  if (rec > 0) {
    post(s, 'w4pirrec', rec, 'w4_piracy', 'Recuperação contra pirataria');
    p.recovered += rec;
  }
  if (p.stance === 'sue') {
    post(s, 'w4pirsue', -money(s, 400), 'w4_legal', 'Processos contra fãs');
    rep(s, 'artists', -0.5);
    for (const a of liveMine(s)) a.fans.casual = Math.round(a.fans.casual * 0.995);
  } else if (p.stance === 'cheap') {
    if (salesDelta > 0) post(s, 'w4pircheap', -Math.round(salesDelta * 0.05), 'w4_piracy', 'Desconto ao varejo');
  } else if (p.stance === 'license') {
    rep(s, 'commercial', 0.2);
  } else if (p.stance === 'drm' && r.chance(0.04)) {
    post(s, 'w4drmrecall', -money(s, 6000), 'w4_legal', 'Recall de discos com anticópia');
    rep(s, 'institutional', -8);
    rep(s, 'artistic', -4);
    p.scandals += 1;
    emitFact(s, { kind: 'scandal', actors: ['player'], place: s.config.homeCity, severity: 45, tags: ['money', 'bad', 'drm'], text: l('Recall de discos com anticópia: o selo vira piada nacional.', 'Copy-protected discs recalled: the label becomes a national joke.'), src: 'w4laws' });
    setStance(s, 'none');
    const text = l('Escândalo: a anticópia dos seus discos instala software escondido nos computadores. Recall e processo.', 'Scandal: your discs\' copy protection secretly installs software on computers. Recall and lawsuit.');
    remember(s, 'drm', text, { important: true });
    notify(s, text, 'bad');
  }
}

// ======================================================================= mês

export function lawsAndIndustryMonth(s: GameState, r: Rng, emit: (id: string) => void): void {
  const w = w4(s);
  const sales = s.player.totals.sales ?? 0;
  const delta = Math.max(0, sales - (w.lastSales || sales));
  w.lastSales = sales;
  // sindicato
  if (w.union) {
    post(s, 'w4union', -unionMonthlyCost(s), 'w4_union', 'Fundo sindical e piso dos músicos');
    for (const a of liveMine(s)) a.trust = clamp(a.trust + 0.3, 0, 100);
  }
  // sociedade de direitos
  if (w.society && delta > 0) {
    const sc = SOCIETIES[w.society];
    const amount = Math.round(delta * sc.rate * (1 - sc.fee) * s.economy.rightsMult);
    if (amount > 0) {
      post(s, 'w4society', amount, 'w4_rights', `Arrecadação de execução (${w.society.toUpperCase()})`);
      const last = w.societyLog[w.societyLog.length - 1];
      if (last && last.year === s.year) last.amount += amount;
      else w.societyLog.push({ year: s.year, amount });
      if (w.societyLog.length > 15) w.societyLog.splice(0, w.societyLog.length - 15);
    }
  }
  lawsMonth(s, r, emit);
  advisoryMonth(s, r);
  piracyMonth(s, r, delta);
}
