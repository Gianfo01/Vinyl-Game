// Rodada 18 (society18, frente H — M5) — JORNALISMO MUSICAL COMO CARREIRA. Você resenha os lançamentos do mês (de
// qualquer selo): a nota mistura-se à média da crítica e mexe no apelo do disco conforme sua CREDIBILIDADE × ALCANCE;
// acertar (nota perto da qualidade real; apostar num desconhecido que depois estoura) sobe a credibilidade, errar feio
// derruba. Escada: frila (cachê por texto) → crítico da casa (salário) → editor (salário maior, alcance) → seu próprio
// veículo por época (revista, fanzine 1976+, blog 2000+, canal de vídeo 2008+, newsletter 2017+: assinantes, anúncios,
// custos). Ética e poder: selo oferece dinheiro ou capa por resenha boa (aceitar, recusar, denunciar); cópia antecipada
// sob embargo (respeitar = acesso; furar = furo e fim do acesso); furo sobre um segredo (fatos secretos de facts17):
// publicar, guardar como trunfo (holds17) ou enterrar em troca de favor. Resenhar o próprio selo é conflito de interesse.
// Artistas lembram de quem os detonou (relação; agency18 pode revidar).

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact, facts17, raiseVisibility, type Fact } from '../facts17';
import { histMode } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { scandal } from '../scandal17';
import type { GameState, Release } from '../types';
import { fmtL, money, post } from '../util';
import { adjRel18 } from './agency18';
import { careers, registerCareer } from './careers12';
import { registerNoto14 } from './notoriety14';
import { realKey18 } from './personact18';

export type OutK18 = 'magazine' | 'zine' | 'blog' | 'video' | 'newsletter';
export const OUTK18: Record<OutK18, { name: L; from: number; cost: number; price: number; run: number }> = {
  magazine: { name: l('Revista', 'Magazine'), from: 1900, cost: 60000, price: 0.6, run: 3500 },
  zine: { name: l('Fanzine', 'Fanzine'), from: 1976, cost: 2500, price: 0.3, run: 200 },
  blog: { name: l('Blog', 'Blog'), from: 2000, cost: 1500, price: 0.15, run: 300 },
  video: { name: l('Canal de vídeo de crítica', 'Video review channel'), from: 2008, cost: 3000, price: 0.25, run: 600 },
  newsletter: { name: l('Newsletter paga', 'Paid newsletter'), from: 2017, cost: 500, price: 0.9, run: 250 },
};
export const STAGE18: L[] = [l('Frila', 'Freelancer'), l('Crítico da casa', 'Staff critic'), l('Editor', 'Editor'), l('Dono do veículo', 'Outlet owner')];
export interface Rev18 { rel: string; sc: number; w: number; y: number; bet?: 1; paid?: 1 }
export interface Press18 {
  stage: number; cred: number; reach: number; n: number;
  out?: { name: string; k: OutK18; since: number; subs: number };
  revs: Rev18[]; infl: Record<string, number>; access: Record<string, number>;
  bribe?: { rel: string; lb: string; v: number; w: number; cover: boolean };
  earned: number; scoops: number; log: { y: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { press18: Press18 } }
const init = (): Press18 => ({ stage: 0, cred: 40, reach: 8, n: 0, revs: [], infl: {}, access: {}, earned: 0, scoops: 0, log: [] });
registerExt4('press18', init);
export function pr18(s: GameState): Press18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.press18 ??= init()) as Press18;
  st.revs ??= []; st.infl ??= {}; st.access ??= {}; st.log ??= [];
  return st;
}
const logP = (s: GameState, t: L) => { const st = pr18(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 30) st.log.length = 30; };
const on = (s: GameState) => careers(s).active.includes('critic');
const isMine = (s: GameState, rel: Release) => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
/** Influência de uma resenha sua (0..0.12): credibilidade × alcance. */
export const influence18 = (s: GameState): number => { const st = pr18(s); return clamp((st.cred / 100) * (Math.min(100, st.reach + (st.out ? Math.log10(1 + st.out.subs) * 8 : 0)) / 100) * 0.16, 0, 0.12); };
/** Lançamentos para resenhar: das últimas 6 semanas, mais famosos primeiro, ainda não resenhados por você. */
export function queue18(s: GameState): Release[] {
  const done = new Set(pr18(s).revs.map((r) => r.rel));
  return Object.values(s.releases).filter((r) => !r.hist && s.week - r.week <= 6 && s.week >= r.week && !done.has(r.id))
    .sort((a, b) => (s.acts[b.actId]?.fame ?? 0) - (s.acts[a.actId]?.fame ?? 0)).slice(0, 6);
}

export function review18(s: GameState, relId: string, sc: number): L | null {
  const st = pr18(s), rel = s.releases[relId];
  if (!rel) return l('Lançamento não encontrado.', 'Release not found.');
  if (st.revs.some((r) => r.rel === relId)) return l('Você já resenhou esse.', 'You already reviewed that one.');
  if (st.revs.filter((r) => r.y === s.year && Math.floor(r.w / 4) === Math.floor(s.week / 4)).length >= 4) return l('Quatro resenhas por mês é o limite do seu tempo.', 'Four reviews a month is all your time allows.');
  sc = clamp(Math.round(sc), 0, 100);
  const inf = influence18(s);
  const a = s.acts[rel.actId];
  const truth = clamp(rel.q, 0, 100);
  const diff = Math.abs(sc - truth);
  const rv: Rev18 = { rel: relId, sc, w: s.week, y: s.year };
  // a média da crítica absorve sua nota com peso pela influência
  const n = rel.criticN ?? 0, w = 0.5 + inf * 20;
  rel.critic = Math.round(((rel.critic ?? sc) * n + sc * w) / (n + w));
  rel.criticN = n + 1;
  st.infl[relId] = Math.round(((sc - 60) / 40) * inf * 1000) / 1000;
  st.cred = clamp(st.cred + (diff < 12 ? 1.2 : diff < 22 ? 0.3 : diff > 32 ? -2.5 : -0.8), 0, 100);
  st.reach = clamp(st.reach + 0.3 + (a?.fame ?? 0) / 200, 0, 100);
  if (sc >= 80 && (a?.fame ?? 0) < 30) rv.bet = 1;
  const lb = rel.owner && s.labels[rel.owner] ? rel.owner : null;
  if (lb && (st.access[lb] ?? 0) > 0 && s.week - rel.week <= 1) st.reach = clamp(st.reach + 1, 0, 100);
  // o artista lembra
  const lead = a?.members[0];
  if (lead && s.persons[lead]) adjRel18(s, `p:${lead}`, 'player', Math.round((sc - 60) / 4), sc >= 60 ? l('Elogiou meu disco', 'Praised my record') : l('Detonou meu disco', 'Trashed my record'));
  if (sc < 35 && a && (a.fame ?? 0) >= 40) emitFact(s, { kind: 'statement', actors: ['player', a.id], severity: 30 + inf * 200, visibility: 'public', tags: ['press', 'press18', 'review', 'bad'], src: 'press18', place: a.city, text: fmtL(l('Resenha demolidora de "{t}" ({a}) circula: {n}/100.', 'A scathing review of "{t}" ({a}) circulates: {n}/100.'), { t: rel.title, a: a.name, n: sc }) });
  // conflito de interesse: resenhar o próprio selo bem demais
  if (isMine(s, rel) && sc >= 70) {
    const r = Rng.fromSeed(`${s.config.seed}|press18coi|${relId}`);
    if (r.chance(0.12 + (sc - 70) / 100)) {
      st.cred = clamp(st.cred - 18, 0, 100);
      scandal(s, rel.actId, 'conduct', 35, l('O crítico que elogiou o disco é o dono do selo', 'The critic who praised the record owns the label'), { tags: ['press', 'press18', 'conflict'] });
      logP(s, l('Exposto: você resenhou o próprio selo. Credibilidade despenca.', 'Exposed: you reviewed your own label. Credibility plunges.'));
    }
  }
  // cachê por texto (frila) ou nada (assalariado)
  if (st.stage === 0) { const v = money(s, 180 + st.reach * 6); post(s, `pr18fee:${relId}`, v, 'services', `Resenha: ${rel.title}`); st.earned += v; }
  if (st.bribe && st.bribe.rel === relId) { rv.paid = 1; if (sc < 80) { st.cred = clamp(st.cred + 2, 0, 100); if (st.bribe.lb && s.labels[st.bribe.lb]) adjRel18(s, `l:${st.bribe.lb}`, 'player', -10, l('Pagou e levou nota baixa', 'Paid and got a low score')); } st.bribe = undefined; }
  st.revs.push(rv); st.n++;
  if (st.revs.length > 200) st.revs.shift();
  return null;
}
registerMod('appeal', 'press18', (s, v, c) => {
  if (!c.release) return null;
  const k = pr18(s).infl[c.release.id];
  return k ? { value: v * (1 + k), label: l('Sua resenha', 'Your review') } : null;
});

export function foundOutlet18(s: GameState, k: OutK18, name: string): L | null {
  const st = pr18(s), d = OUTK18[k];
  if (st.out) return l('Você já tem um veículo.', 'You already own an outlet.');
  if (s.year < d.from) return l('Esse formato ainda não existe.', 'That format does not exist yet.');
  const v = money(s, d.cost);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `venture:pr18:${k}`, -v, 'capex', `Fundação: ${name}`);
  st.out = { name: name.trim() || 'Ruído', k, since: s.year, subs: Math.round(200 + st.reach * 40) };
  st.stage = 3;
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 35, visibility: 'public', tags: ['press', 'press18', 'venture'], src: 'press18', place: s.config.homeCity, text: fmtL(l('Nasce "{n}" ({k}), do crítico {p}.', '"{n}" ({k}) launches, from critic {p}.'), { n: st.out.name, k: d.name, p: s.config.ownerName ?? s.config.companyName }) });
  return null;
}

/** Furo: um fato secreto recente sobre alguém (não você; no modo exato, não gente real). */
function scoopFact(s: GameState, r: Rng): Fact | undefined {
  const exact = histMode(s) === 'strict';
  const pool = facts17(s).f.filter((f) => f.visibility === 'secret' && s.week - f.w < 52 && f.actors.length && !f.actors.includes('player') && !f.tags.includes('press18') && !(exact && f.actors.some((k) => realKey18(s, k.includes(':') ? k : `p:${k}`) || !!s.acts[k]?.catalogNo)));
  return pool.length ? r.pick(pool.slice(-20)) : undefined;
}
export function scoop18(s: GameState, fid: string, how: 'publish' | 'hold' | 'bury'): L {
  const st = pr18(s), f = facts17(s).f.find((x) => x.id === fid);
  if (!f || f.visibility !== 'secret') return l('O furo esfriou.', 'The scoop went cold.');
  const t = f.actors[0];
  if (how === 'publish') {
    raiseVisibility(f, 'public');
    st.reach = clamp(st.reach + 6, 0, 100); st.cred = clamp(st.cred + 2, 0, 100); st.scoops++;
    adjRel18(s, t.includes(':') ? t : `p:${t}`, 'player', -15, l('Publicou meu segredo', 'Published my secret'));
    emitFact(s, { kind: 'secret_exposed', actors: [...f.actors, 'player'], severity: Math.max(45, f.severity), visibility: 'public', tags: ['press', 'press18', 'scoop'], src: 'press18', cause: [f.id], text: fmtL(l('Furo de {p}: {t}', 'Scoop by {p}: {t}'), { p: s.config.ownerName ?? s.config.companyName, t: f.text }) });
    logP(s, fmtL(l('Furo publicado: {t}', 'Scoop published: {t}'), { t: f.text }));
    return l('Publicado: alcance e credibilidade sobem; o alvo não esquece.', 'Published: reach and credibility rise; the target won\'t forget.');
  }
  if (how === 'hold') { grantHold(s, { holder: 'player', target: t, kind: 'secret', strength: Math.round(30 + f.severity / 2), text: f.text, factId: f.id, proof: 1, src: 'press18' }); return l('Guardado como trunfo (Obrigações).', 'Kept as leverage (Obligations).'); }
  grantHold(s, { holder: 'player', target: t, kind: 'favor', strength: 35, text: fmtL(l('Você enterrou: {t}', 'You buried: {t}'), { t: f.text }), factId: f.id, src: 'press18' });
  return l('Enterrado: a pessoa lhe deve um favor.', 'Buried: the person owes you a favour.');
}
registerInboxKind('press18_scoop', { label: l('Redação', 'Newsroom'), cat: 'press', icon: 'newspaper', prio: 2, goto: () => ({ area: 'cp17-critic' }),
  handle: (s, m, a) => scoop18(s, String(m.ref?.f), a as 'publish' | 'hold' | 'bury') });
export function bribe18(s: GameState, how: 'take' | 'refuse' | 'expose'): L {
  const st = pr18(s), b = st.bribe;
  if (!b) return l('Nada a decidir.', 'Nothing to decide.');
  const lb = s.labels[b.lb];
  if (how === 'take') { post(s, `pr18brb:${b.rel}`, b.v, 'other_income', `"Apoio editorial": ${s.releases[b.rel]?.title ?? ''}`); return l('Aceito: agora a resenha precisa ser 80+ (ou o selo se vinga).', 'Taken: the review now has to be 80+ (or the label takes revenge).'); }
  st.bribe = undefined;
  if (how === 'expose') {
    st.cred = clamp(st.cred + 6, 0, 100); st.reach = clamp(st.reach + 3, 0, 100);
    if (lb) adjRel18(s, `l:${b.lb}`, 'player', -25, l('Denunciou nossa oferta', 'Exposed our offer'));
    emitFact(s, { kind: 'scandal', actors: [b.lb, 'player'], severity: 45, visibility: 'public', tags: ['press', 'press18', 'payola'], src: 'press18', text: fmtL(l('Crítico denuncia: {lb} ofereceu dinheiro por resenha boa.', 'Critic reveals: {lb} offered money for a good review.'), { lb: lb?.name ?? '?' }) });
    return l('Denunciado: credibilidade sobe, o selo vira inimigo.', 'Exposed: credibility up, the label becomes an enemy.');
  }
  st.cred = clamp(st.cred + 1, 0, 100);
  return l('Recusado.', 'Refused.');
}
registerInboxKind('press18_bribe', { label: l('Redação', 'Newsroom'), cat: 'press', icon: 'coins', prio: 2, goto: () => ({ area: 'cp17-critic' }), handle: (s, _m, a) => bribe18(s, a as 'take' | 'refuse' | 'expose') });
export function embargo18(s: GameState, lb: string, keep: boolean): L {
  const st = pr18(s);
  if (keep) { st.access[lb] = clamp((st.access[lb] ?? 0) + 1, -3, 5); return l('Embargo respeitado: o selo manda as próximas cópias antes.', 'Embargo kept: the label sends the next copies early.'); }
  st.access[lb] = -3; st.reach = clamp(st.reach + 8, 0, 100); st.scoops++;
  adjRel18(s, `l:${lb}`, 'player', -20, l('Furou nosso embargo', 'Broke our embargo'));
  emitFact(s, { kind: 'statement', actors: ['player', lb], severity: 35, visibility: 'public', tags: ['press', 'press18', 'embargo'], src: 'press18', text: fmtL(l('{p} fura o embargo de {lb} e publica a primeira resenha do disco do ano.', '{p} breaks {lb}\'s embargo and runs the first review of the record of the year.'), { p: s.config.ownerName ?? s.config.companyName, lb: s.labels[lb]?.name ?? '?' }) });
  return l('Furo! Alcance +8; o selo corta seu acesso.', 'Scoop! Reach +8; the label cuts your access.');
}
registerInboxKind('press18_embargo', { label: l('Redação', 'Newsroom'), cat: 'press', icon: 'lock', prio: 1, goto: () => ({ area: 'cp17-critic' }), handle: (s, m, a) => embargo18(s, String(m.ref?.lb), a !== 'break') });
registerInboxKind('press18_job', { label: l('Redação', 'Newsroom'), cat: 'people', icon: 'newspaper', prio: 1, goto: () => ({ area: 'cp17-critic' }),
  handle: (s, m, a) => { if (a !== 'yes') return l('Você segue como está.', 'You stay as you are.'); const st = pr18(s); st.stage = Math.max(st.stage, Number(m.ref?.st ?? 1)); return fmtL(l('Agora você é {s}.', 'You are now {s}.'), { s: STAGE18[st.stage] }); } });

registerCareer({ id: 'critic', name: l('Jornalista/crítico musical', 'Music journalist/critic'), desc: l('Resenhas que mexem nas vendas, credibilidade, furos, embargos, ofertas indecentes e seu próprio veículo.', 'Reviews that move sales, credibility, scoops, embargoes, indecent offers and your own outlet.'), from: 1900, icon: 'newspaper', area: 'cp17-critic', load: 0.25,
  status: (s) => { const st = pr18(s); return fmtL(l('{s} · credibilidade {c} · alcance {r}', '{s} · credibility {c} · reach {r}'), { s: STAGE18[st.stage], c: Math.round(st.cred), r: Math.round(st.reach) }); } });
registerNoto14('critic', (s) => { const st = pr18(s); return st.n * 0.4 + st.scoops * 3 + st.cred * 0.1 + (st.out ? Math.log10(1 + st.out.subs) * 2 : 0); }, l('resenhas, furos e credibilidade', 'reviews, scoops and credibility'), l('Jornalismo', 'Journalism'));

registerSimHook('month', 'press18', (s) => {
  const st = pr18(s);
  const r = Rng.fromSeed(`${s.config.seed}|press18|${s.week}`);
  // apostas que se confirmam (o desconhecido que você bancou estourou)
  for (const rv of st.revs) if (rv.bet === 1 && s.week - rv.w >= 20) { rv.bet = undefined; const rel = s.releases[rv.rel]; if (rel && rel.peak > 0 && rel.peak <= 20) { st.cred = clamp(st.cred + 5, 0, 100); st.reach = clamp(st.reach + 3, 0, 100); logP(s, fmtL(l('Você apostou cedo em "{t}" — e acertou. Credibilidade +5.', 'You backed "{t}" early — and were right. Credibility +5.'), { t: rel.title })); } }
  for (const k of Object.keys(st.infl)) { const rel = s.releases[k]; if (!rel || s.week - rel.week > 26) delete st.infl[k]; }
  if (!on(s)) return;
  // salário
  if (st.stage === 1 || st.stage === 2) { const v = money(s, st.stage === 1 ? 2200 : 4200); post(s, `pr18sal:${s.week}`, v, 'services', st.stage === 1 ? 'Salário de crítico' : 'Salário de editor'); st.earned += v; }
  // veículo próprio
  if (st.out) {
    const d = OUTK18[st.out.k];
    const recent = st.revs.filter((x) => s.week - x.w <= 8).length;
    st.out.subs = Math.max(50, Math.round(st.out.subs * (1 + (st.cred - 45) / 900 + recent * 0.006 + r.normal(0, 0.01))));
    const rev = money(s, st.out.subs * d.price * (1 + st.reach / 200)), cost = money(s, d.run * (1 + st.out.subs / 40000));
    post(s, `pr18out:${s.week}`, rev, 'media', `${st.out.name}: assinaturas e anúncios`);
    post(s, `pr18ouc:${s.week}`, -cost, 'salaries', `${st.out.name}: redação e produção`);
    st.earned += rev - cost;
  }
  // promoção na escada
  if (st.stage === 0 && st.cred >= 55 && st.n >= 10 && r.chance(0.3)) pushInbox18(s, 'press18_job', { from: 'Editor-chefe', subject: l('Vaga de crítico fixo', 'Staff critic opening'), body: l('Salário mensal em vez de cachê por texto; mais alcance.', 'A monthly salary instead of per-piece fees; more reach.'), ref: { st: 1 }, actions: [{ id: 'yes', label: l('Aceitar', 'Accept') }, { id: 'no', label: l('Seguir frila', 'Stay freelance') }] });
  else if (st.stage === 1 && st.cred >= 70 && st.n >= 40 && r.chance(0.2)) pushInbox18(s, 'press18_job', { from: 'Diretoria', subject: l('Convite para editor', 'Editor invitation'), body: l('Você define a pauta: salário maior e mais alcance.', 'You set the agenda: higher salary and more reach.'), ref: { st: 2 }, actions: [{ id: 'yes', label: l('Aceitar', 'Accept') }, { id: 'no', label: l('Recusar', 'Decline') }] });
  if (st.stage >= 1) st.reach = clamp(st.reach + (st.stage === 2 ? 0.6 : 0.3), 0, 100);
  // oferta indecente
  const q = queue18(s).filter((x) => x.owner && s.labels[x.owner]);
  if (!st.bribe && q.length && r.chance(0.07 + influence18(s))) {
    const rel = r.pick(q), cover = r.chance(0.4);
    st.bribe = { rel: rel.id, lb: rel.owner, v: money(s, (cover ? 4000 : 1500) * (0.5 + st.reach / 50)), w: s.week, cover };
    pushInbox18(s, 'press18_bribe', { from: s.labels[rel.owner].name, subject: cover ? fmtL(l('Capa para {a}?', 'A cover for {a}?'), { a: s.acts[rel.actId]?.name ?? '?' }) : fmtL(l('"Apoio editorial" para "{t}"', '"Editorial support" for "{t}"'), { t: rel.title }),
      body: fmtL(l('O selo oferece {v} por uma resenha 80+. Aceitar (se vazar: credibilidade −25), recusar ou denunciar publicamente.', 'The label offers {v} for an 80+ review. Take it (if it leaks: credibility −25), refuse or expose it publicly.'), { v: `$${Math.round(st.bribe.v / 100).toLocaleString('en-US')}` }),
      actions: [{ id: 'take', label: l('Aceitar', 'Take it') }, { id: 'expose', label: l('Denunciar', 'Expose') }, { id: 'refuse', label: l('Recusar', 'Refuse') }], weeks: 4 });
  }
  if (st.bribe && s.week - st.bribe.w > 10) {
    const b = st.bribe; st.bribe = undefined;
    const rv = st.revs.find((x) => x.rel === b.rel);
    if (rv?.paid && rv.sc >= 80 && r.chance(0.2)) { st.cred = clamp(st.cred - 25, 0, 100); scandal(s, 'player', 'money', 45, l('Crítico recebeu do selo pela resenha', 'Critic took label money for the review'), { tags: ['press', 'press18', 'payola'] }); }
  }
  // cópia antecipada sob embargo
  if (st.stage >= 1 && r.chance(0.05)) {
    const lbs = Object.values(s.labels).filter((x) => x.active && (st.access[x.id] ?? 0) >= 0);
    if (lbs.length) { const lb = r.pick(lbs); pushInbox18(s, 'press18_embargo', { from: lb.name, subject: l('Cópia antecipada, sob embargo', 'Advance copy, under embargo'), body: l('Respeitar o embargo garante cópias antes no futuro; furar dá o furo do mês e queima a ponte.', 'Keeping the embargo means early copies in future; breaking it gives you the scoop of the month and burns the bridge.'), ref: { lb: lb.id }, actions: [{ id: 'break', label: l('Furar o embargo', 'Break the embargo') }, { id: 'keep', label: l('Respeitar', 'Keep it') }], weeks: 3 }); }
  }
  // furo
  if (r.chance(0.04 + st.reach / 1000)) {
    const f = scoopFact(s, r);
    if (f) pushInbox18(s, 'press18_scoop', { from: l('Fonte anônima', 'Anonymous source').pt, subject: l('Uma fonte tem uma história', 'A source has a story'), body: fmtL(l('"{t}" — publicar (furo), guardar como trunfo ou enterrar em troca de um favor.', '"{t}" — publish (scoop), keep as leverage or bury in exchange for a favour.'), { t: f.text }), ref: { f: f.id }, actions: [{ id: 'publish', label: l('Publicar', 'Publish') }, { id: 'hold', label: l('Guardar', 'Keep') }, { id: 'bury', label: l('Enterrar', 'Bury') }], weeks: 4 });
  }
  st.cred = clamp(st.cred + (45 - st.cred) * 0.005, 0, 100);
});

registerExplain('press18.infl', (s) => {
  const st = pr18(s), inf = influence18(s);
  return { title: l('Peso da sua resenha', 'Weight of your review'), value: Math.round(inf * 1000) / 10, fmt: 'num', parts: [
    { label: l('Credibilidade', 'Credibility'), value: Math.round(st.cred), fmt: 'num', note: l('Sobe com notas perto da qualidade real e apostas certeiras; cai com erros e escândalos.', 'Rises with scores close to real quality and good bets; falls with misses and scandals.') },
    { label: l('Alcance', 'Reach'), value: Math.round(st.reach), fmt: 'num', note: l('Cargo, furos, veículo próprio.', 'Position, scoops, own outlet.') },
    ...(st.out ? [{ label: l('Assinantes do veículo', 'Outlet subscribers'), value: st.out.subs, fmt: 'num' as const }] : [])],
    note: l('Nota 100 move o apelo em +peso%; nota 20 em −peso%. Até ±12%.', 'A 100 score moves appeal by +weight%; a 20 by −weight%. Up to ±12%.') };
});
registerAdvisorTip('press18', (s) => {
  if (!on(s)) return [];
  const q = queue18(s);
  return q.length ? [{ id: 'press18-q', level: 'info', cat: 'career', score: 30, text: fmtL(l('{n} lançamento(s) novos para resenhar.', '{n} new release(s) to review.'), { n: q.length }), goto: { area: 'cp17-critic' } }] : [];
});
