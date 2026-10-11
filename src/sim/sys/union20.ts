// Rodada 20c (N3.3b) — NEGOCIAÇÃO COLETIVA de músicos de estúdio e equipe de estrada [INFERÊNCIA: dinâmica plausível].
// De tempos em tempos a entidade dos profissionais (fictícia; "Guilda dos Músicos de Sessão" / "Sindicato da Estrada")
// apresenta uma pauta ao selo: piso de cachê, jornada, segurança ou créditos. As greves REAIS documentadas (proibição
// de gravação de 1942–44 e de 1948 nos EUA) continuam no world4/regions19; aqui não se abre pauta enquanto uma delas
// estiver em vigor. Antes de 1900 não há pauta (entidades de músicos ainda incipientes); equipe de estrada só de 1965.
// Escolhas: aceitar / negociar (chance visível) / contratar fora do sindicato / locaute — com efeitos:
//  • criativo: qualidade das faixas (songQ) sobe com jornada/créditos aceitos, cai com não-sindicalizados e locaute;
//  • operacional: risco de turnê (tourRisk) cai com segurança aceita, sobe com equipe improvisada e locaute;
//  • financeiro: piso de cachê vira custo por faixa gravada (gancho 'record') e fatia da bilheteria (showRevenue);
//  • relação: confiança da entidade (0–100) muda a chance de negociar e a frequência das pautas.
// Determinismo: fluxo rng19 'union20'. Fatos: union_deal / union_clash (consumidos aqui e no exch20).
import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { strikeActive } from './world4/common';

export type UGrp20 = 'session' | 'road';
export type UDem20 = 'pay' | 'hours' | 'safety' | 'credits';
export type UOpt20 = 'accept' | 'negotiate' | 'nonunion' | 'lockout';
export interface Union20 {
  /** pauta em aberto */
  cur?: { grp: UGrp20; dem: UDem20; w: number };
  /** termos em vigor: piso (fração extra) por grupo e cláusulas */
  pay: Record<UGrp20, number>;
  hours: boolean;
  safety: boolean;
  credits: boolean;
  /** fora do sindicato / locaute até a semana */
  non: Partial<Record<UGrp20, number>>;
  lock: Partial<Record<UGrp20, number>>;
  /** confiança da entidade no selo (0–100) */
  trust: number;
  next: number;
  log: [number, number, L][];
}
declare module '../ext4' { interface Ext4 { union20: Union20 } }
const fresh = (): Union20 => ({ pay: { session: 0, road: 0 }, hours: false, safety: false, credits: false, non: {}, lock: {}, trust: 50, next: 0, log: [] });
registerExt4('union20', fresh);
export function union20(s: GameState): Union20 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const t = (x.union20 ??= fresh()) as Union20;
  t.pay ??= { session: 0, road: 0 }; t.non ??= {}; t.lock ??= {}; t.trust ??= 50; t.next ??= 0; t.log ??= [];
  return t;
}
const rng = (s: GameState) => rng19(s, 'union20', () => Rng.fromSeed(`${s.config.seed}|union20|${s.week}`));
const T = (pt: string, en: string): L => l(pt, en);
export const GRP20: Record<UGrp20, { n: L; from: number }> = {
  session: { n: T('Guilda dos Músicos de Sessão', 'Session Musicians\' Guild'), from: 1900 },
  road: { n: T('Sindicato da Estrada (técnicos e roadies)', 'Road Crew Union (techs and roadies)'), from: 1965 },
};
export const DEM20: Record<UDem20, { n: L; d: L }> = {
  pay: { n: T('Piso de cachê', 'Minimum scale'), d: T('+8% no piso (custo por faixa gravada / fatia da bilheteria).', '+8% on scale (cost per recorded track / share of the gate).') },
  hours: { n: T('Jornada', 'Hours'), d: T('Sessões mais curtas: menos erro por cansaço (+1% qualidade), pequeno custo.', 'Shorter sessions: fewer tired mistakes (+1% quality), small cost.') },
  safety: { n: T('Segurança', 'Safety'), d: T('Equipamento e regras de palco: −10% de risco de turnê, custo único.', 'Gear and stage rules: −10% tour risk, one-off cost.') },
  credits: { n: T('Créditos', 'Credits'), d: T('Nome dos músicos na capa: +1% qualidade, reputação com artistas.', 'Players named on the sleeve: +1% quality, reputation with artists.') },
};
/** Pautas possíveis por grupo e época. */
export function demands20(s: GameState, g: UGrp20): UDem20[] {
  const out: UDem20[] = ['pay', 'hours'];
  if (g === 'road' || s.year >= 1970) out.push('safety');
  if (g === 'session' && s.year >= 1970) out.push('credits');
  return out;
}
const oneOff = (s: GameState, d: UDem20) => money(s, d === 'safety' ? 6000 : d === 'hours' ? 2500 : d === 'credits' ? 1500 : 0);
/** Chance de a negociação dar certo (com o porquê). */
export function negOdds20(s: GameState): { p: number; why: L[] } {
  const u = union20(s), rep = s.player.reputation.artists;
  const p = clamp(0.3 + (u.trust - 50) / 200 + rep / 400, 0.1, 0.8);
  return { p, why: [fmtL(T('Confiança da entidade {t}/100', 'Guild trust {t}/100'), { t: Math.round(u.trust) }), fmtL(T('Reputação com artistas {r}', 'Reputation with artists {r}'), { r: Math.round(rep) })] };
}

function apply(s: GameState, g: UGrp20, d: UDem20, k: number): void {
  const u = union20(s);
  if (d === 'pay') u.pay[g] = Math.min(0.4, u.pay[g] + 0.08 * k);
  else if (k >= 1) { if (d === 'hours') u.hours = true; if (d === 'safety') u.safety = true; if (d === 'credits') u.credits = true; }
  const c = Math.round(oneOff(s, d) * k);
  if (c) post(s, `union20:${d}:${s.week}`, -c, 'legal', `Acordo coletivo: ${DEM20[d].n.pt}`);
}

/** Resposta do jogador à pauta (também usada no padrão ao expirar). */
export function answerUnion20(s: GameState, opt: UOpt20, r: Rng = rng(s)): L {
  const u = union20(s), cur = u.cur;
  if (!cur) return T('Não há pauta em aberto.', 'No open demand.');
  u.cur = undefined;
  u.next = s.week + 52 + r.int(0, 52);
  const g = cur.grp, d = cur.dem, nm = GRP20[g].n;
  let text: L;
  if (opt === 'accept') {
    apply(s, g, d, 1); u.trust = clamp(u.trust + 10, 0, 100);
    s.player.reputation.artists = clamp(s.player.reputation.artists + 1, 0, 100);
    text = fmtL(T('Acordo assinado com {g}: {d}.', 'Agreement signed with {g}: {d}.'), { g: nm, d: DEM20[d].n });
  } else if (opt === 'negotiate') {
    const ok = r.chance(negOdds20(s).p);
    if (ok) { apply(s, g, d, 0.5); u.trust = clamp(u.trust + 4, 0, 100); text = fmtL(T('Meio-termo com {g}: metade da pauta ({d}).', 'Middle ground with {g}: half the demand ({d}).'), { g: nm, d: DEM20[d].n }); }
    else { apply(s, g, d, 1); u.trust = clamp(u.trust - 8, 0, 100); text = fmtL(T('A negociação emperrou; {g} impôs a pauta inteira ({d}) e saiu desconfiada.', 'Talks stalled; {g} imposed the full demand ({d}) and left wary.'), { g: nm, d: DEM20[d].n }); }
  } else if (opt === 'nonunion') {
    u.non[g] = s.week + 26; u.trust = clamp(u.trust - 20, 0, 100);
    s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
    text = fmtL(T('Você contrata fora do sindicato por 26 semanas: mais barato, menos experiente. {g} protesta.', 'You hire non-union for 26 weeks: cheaper, less seasoned. {g} protests.'), { g: nm });
  } else {
    u.lock[g] = s.week + 8; u.trust = clamp(u.trust - 35, 0, 100);
    s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
    text = fmtL(T('Locaute: o selo fecha as portas a {g} por 8 semanas.', 'Lockout: the label shuts {g} out for 8 weeks.'), { g: nm });
  }
  u.log.unshift([s.year, s.month, text]); if (u.log.length > 20) u.log.length = 20;
  const clash = opt === 'nonunion' || opt === 'lockout';
  emitFact(s, { kind: clash ? 'union_clash' : 'union_deal', actors: ['player'], severity: clash ? 40 : 20, visibility: 'public', tags: ['union20', g, d, opt, clash ? 'bad' : 'good'], text, src: 'union20', data: { grp: g, dem: d, opt } });
  return text;
}
registerInboxKind('union20', { label: T('Sindicato', 'Union'), cat: 'decision', icon: 'person', prio: 2, goto: () => ({ area: 'finance' }),
  handle: (s, _m, a, r) => answerUnion20(s, a as UOpt20, r) });

/** Abre uma pauta (exportado para testes/ações). */
export function openDemand20(s: GameState, g: UGrp20, d: UDem20): void {
  const u = union20(s);
  u.cur = { grp: g, dem: d, w: s.week };
  const od = negOdds20(s);
  pushInbox18(s, 'union20', {
    from: GRP20[g].n.pt, tone: 'info', weeks: 4,
    subject: fmtL(T('{g} apresenta pauta: {d}', '{g} tables a demand: {d}'), { g: GRP20[g].n, d: DEM20[d].n }),
    body: fmtL(T('{d2} Negociar tem {p}% de chance de fechar pela metade (senão a pauta inteira passa e a entidade sai desconfiada). Contratar fora do sindicato barateia por 26 semanas, mas a qualidade e a segurança caem; locaute fecha a porta por 8 semanas e esfria as cenas que recebem seus artistas. Sem resposta, vale aceitar.',
      '{d2} Negotiating has a {p}% chance of closing at half (otherwise the full demand passes and the guild leaves wary). Hiring non-union is cheaper for 26 weeks, but quality and safety drop; a lockout shuts the door for 8 weeks and cools the scenes that host your artists. No answer means accept.'),
      { d2: DEM20[d].d, p: Math.round(od.p * 100) }),
    actions: [{ id: 'negotiate', label: T('Negociar', 'Negotiate') }, { id: 'nonunion', label: T('Contratar fora do sindicato', 'Hire non-union') }, { id: 'lockout', label: T('Locaute', 'Lockout') }, { id: 'accept', label: T('Aceitar a pauta', 'Accept the demand') }],
  });
}

registerSimHook('month', 'union20', (s) => {
  const u = union20(s);
  if (u.cur && s.week - u.cur.w > 8) answerUnion20(s, 'accept'); // segurança: pauta órfã (mensagem apagada) vale o padrão
  if (u.cur || s.week < u.next || s.year < GRP20.session.from || !playerActs(s).length || strikeActive(s)) return;
  const r = rng(s);
  if (!r.chance(0.06 + (50 - u.trust) / 1000)) return;
  const grps = (Object.keys(GRP20) as UGrp20[]).filter((g) => s.year >= GRP20[g].from);
  const g = grps[r.int(0, grps.length - 1)];
  const ds = demands20(s, g);
  openDemand20(s, g, ds[r.int(0, ds.length - 1)]);
});

// ---------------------------------------------------------------- efeitos

const on = (s: GameState, x: Partial<Record<UGrp20, number>>, g: UGrp20) => (x[g] ?? 0) > s.week;
registerMod('songQ', 'union20', (s, v, c) => {
  if (!c.act || (c.act.owner !== 'player' && !c.act.playerBand)) return null;
  const u = union20(s);
  let m = 1 + (u.hours ? 0.01 : 0) + (u.credits ? 0.01 : 0);
  if (on(s, u.non, 'session')) m -= 0.04;
  if (on(s, u.lock, 'session')) m -= 0.06;
  return Math.abs(m - 1) < 1e-9 ? null : { value: v * m, label: T('Acordo com os músicos de sessão', 'Session musicians\' agreement') };
});
registerMod('tourRisk', 'union20', (s, v, c) => {
  if (!c.act || (c.act.owner !== 'player' && !c.act.playerBand)) return null;
  const u = union20(s);
  let m = u.safety ? 0.9 : 1;
  if (on(s, u.non, 'road')) m *= 1.15;
  if (on(s, u.lock, 'road')) m *= 1.25;
  return m === 1 ? null : { value: v * m, label: T('Equipe de estrada (acordo coletivo)', 'Road crew (collective agreement)') };
});
registerMod('showRevenue', 'union20', (s, v, c) => {
  if (!c.act || (c.act.owner !== 'player' && !c.act.playerBand)) return null;
  const u = union20(s);
  const k = on(s, u.non, 'road') ? 0 : u.pay.road * 0.1; // o piso da equipe come uma fatia pequena da bilheteria
  return k <= 0 ? null : { value: v * (1 - k), label: T('Piso da equipe de estrada', 'Road crew scale') };
});
registerSimHook('record', 'union20', (s, _r, a) => {
  const song = a.song, act = song ? s.acts[song.actId] : undefined;
  if (!song || !act || (act.owner !== 'player' && !act.playerBand)) return;
  const u = union20(s);
  const non = on(s, u.non, 'session');
  const k = non ? -0.15 : u.pay.session;
  if (!k) return;
  post(s, `union20:rec:${song.id}`, -Math.round(money(s, 150) * k), 'recording', non ? 'Músicos fora do sindicato (economia)' : 'Piso dos músicos de sessão');
});

// ---------------------------------------------------------------- ecos e consumidores

registerConseq18('ib:union20:accept', { now: T('Custo maior, paz no estúdio e na estrada.', 'Higher cost, peace in the studio and on the road.'),
  later: [{ in: [4, 16], p: 0.3, tone: 'good', hint: T('Bons músicos procuram quem cumpre o acordo.', 'Good players seek out labels that honour the deal.'), fx: (f) => { f.rep('artists', 1); return T('Um músico de sessão disputado prefere trabalhar com o selo.', 'A sought-after session player prefers to work with the label.'); } }] });
registerConseq18('ib:union20:negotiate', { odds: (s) => negOdds20(s) });
registerConseq18('ib:union20:nonunion', { now: T('Mais barato agora; qualidade e segurança caem.', 'Cheaper now; quality and safety drop.'),
  later: [{ in: [2, 10], p: 0.4, tone: 'bad', hint: T('Piquete na porta do estúdio.', 'A picket at the studio door.'), fx: (f) => { f.rep('artists', -1).mood('stress', 4); return T('Piquete na porta do estúdio: artistas atravessam a linha constrangidos.', 'A picket at the studio door: artists cross the line, embarrassed.'); } }] });
registerConseq18('ib:union20:lockout', { now: T('Porta fechada por 8 semanas: faixas e shows pioram.', 'Door shut for 8 weeks: tracks and shows suffer.'),
  later: [{ in: [3, 12], p: 0.5, tone: 'bad', hint: T('A imprensa toma partido.', 'The press takes sides.'), fx: (f) => { f.rep('artists', -2).rep('institutional', -1); return T('Colunistas chamam o locaute de "mesquinho"; artistas evitam o selo.', 'Columnists call the lockout "petty"; artists avoid the label.'); } }] });

// a entidade lembra: conflito antecipa a próxima pauta; acordo a adia um pouco
onFact('union_clash', (s) => { const u = union20(s); u.next = Math.min(u.next, s.week + 26); }, 'union20:clash');
onFact('union_deal', (s) => { const u = union20(s); u.next += 4; }, 'union20:deal');

registerExplain('union20.terms', (s) => {
  const u = union20(s);
  const parts: WhyPart[] = [
    { label: l('Piso extra — sessão (por faixa gravada)', 'Extra scale — session (per recorded track)'), value: u.pay.session, fmt: 'pct' },
    { label: l('Piso extra — estrada (fatia da bilheteria ×0,1)', 'Extra scale — road (gate share ×0.1)'), value: u.pay.road, fmt: 'pct' },
    { label: l('Jornada / créditos (qualidade)', 'Hours / credits (quality)'), value: (u.hours ? 0.01 : 0) + (u.credits ? 0.01 : 0), fmt: 'pct', tone: 'good' },
    { label: l('Segurança (risco de turnê)', 'Safety (tour risk)'), value: u.safety ? 0.9 : 1, fmt: 'mult', tone: u.safety ? 'good' : '' },
    { label: l('Fora do sindicato / locaute em vigor', 'Non-union / lockout in force'), value: (['session', 'road'] as UGrp20[]).some((g) => on(s, u.non, g) || on(s, u.lock, g)) ? l('sim', 'yes').pt : l('não', 'no').pt, fmt: 'text' },
    { label: l('Confiança da entidade', 'Guild trust'), value: u.trust, fmt: 'num' },
  ];
  return { title: l('Acordo coletivo em vigor', 'Collective agreement in force'), value: u.trust, fmt: 'num', parts,
    note: l('Entidades fictícias; as greves reais de 1942–44 e 1948 (EUA) seguem no calendário histórico e suspendem novas pautas enquanto duram.', 'Fictional bodies; the real 1942–44 and 1948 US recording bans stay on the historical calendar and pause new demands while they last.') };
});
