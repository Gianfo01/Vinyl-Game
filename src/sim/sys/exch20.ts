// Rodada 20c (N3.3a) — RESIDÊNCIA DE INTERCÂMBIO ENTRE CENAS [INFERÊNCIA: dinâmica plausível, sem calendário real].
// Um convite (ou a decisão do jogador) manda um ATO ou um PRODUTOR da casa passar semanas na cena de outra cidade.
//  • Criativo: durante a residência e por 26 semanas depois, as faixas do ato (ou de todo o elenco, se foi o produtor)
//    ganham qualidade (songQ) — mais se a faixa for do gênero da cena anfitriã; a cena anfitriã ganha um pouco do
//    gênero do ato (s.scenes, polinização cruzada).
//  • Operacional: viagem cansa (fadiga na ida), inspira na volta; shows longe da cidade anfitriã durante a residência
//    correm mais risco (agenda partida); shows no mercado anfitrião vendem um pouco mais (presença local).
//  • Financeiro: custo de viagem e estadia por semana (mais caro entre continentes); bolsa de intercâmbio cultural
//    (programa fictício) cobre metade a partir de 1946.
//  • Relação com a cena local: cada residência aumenta a relação com a cidade; relação alta barateia a próxima e rende
//    ecos (parceria com músicos locais). Locaute contra o sindicato (union20) esfria todas as cenas.
// Era: o meio de transporte do texto segue o ano (navio/trem/avião). Determinismo: fluxo rng19 'exch20'.
import { Rng, clamp } from '../../core/rng';
import { CITIES, cityById, familyOf, l, type L } from '../../data/world';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { genreAvailable20 } from '../genretime20';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';

export type ExchWho20 = 'act' | 'producer';
export interface Res20 { id: string; who: ExchWho20; act: string; city: string; genre: string; from: number; until: number; cost: number; grant: number }
export interface Exch20 {
  /** residência em curso (uma por vez) */
  cur?: Res20;
  /** influência criativa: ato (ou '*' = elenco, produtor) → cena e até quando */
  inf: Record<string, { city: string; genre: string; until: number; k: number }>;
  /** relação com a cena de cada cidade (0–100) */
  rel: Record<string, number>;
  /** convite em aberto */
  inv?: { act: string; city: string; genre: string };
  next: number;
  seq: number;
  log: [number, number, L][];
}
declare module '../ext4' { interface Ext4 { exch20: Exch20 } }
const fresh = (): Exch20 => ({ inf: {}, rel: {}, next: 0, seq: 0, log: [] });
registerExt4('exch20', fresh);
export function exch20(s: GameState): Exch20 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const t = (x.exch20 ??= fresh()) as Exch20;
  t.inf ??= {}; t.rel ??= {}; t.next ??= 0; t.seq ??= 0; t.log ??= [];
  return t;
}
const rng = (s: GameState) => rng19(s, 'exch20', () => Rng.fromSeed(`${s.config.seed}|exch20|${s.week}`));
const mine = (a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand) && a.status !== 'retired' && a.status !== 'split' && !a.deceased;
const usd = (c: number) => l(`US$ ${Math.round(c / 100).toLocaleString('pt-BR')}`, `US$${Math.round(c / 100).toLocaleString('en-US')}`);

/** Meio de transporte pela época (só texto) e se a viagem cruza mercados. */
export function travel20(s: GameState, from: string, to: string): { far: boolean; how: L } {
  const far = cityById[from]?.market !== cityById[to]?.market;
  if (!far) return { far, how: s.year < 1925 ? l('de trem', 'by train') : l('de trem ou ônibus', 'by train or bus') };
  return { far, how: s.year < 1930 ? l('de navio e trem', 'by ship and train') : s.year < 1958 ? l('de navio ou hidroavião', 'by ship or flying boat') : l('de avião', 'by plane') };
}
/** Custo (centavos nominais), bolsa e semanas de uma residência. */
export function resCost20(s: GameState, who: ExchWho20, actId: string, city: string, weeks: number): { cost: number; grant: number } {
  const a = s.acts[actId];
  const { far } = travel20(s, a?.city ?? city, city);
  const heads = who === 'producer' ? 1 : Math.max(1, a?.members.length ?? 1);
  const relDisc = 1 - Math.min(0.3, (exch20(s).rel[city] ?? 0) / 300);
  const cost = money(s, ((far ? 1400 : 500) * heads + weeks * 260 * heads) * relDisc);
  const grant = s.year >= 1946 ? Math.round(cost * 0.5) : 0;
  return { cost, grant };
}
/** Cidades anfitriãs candidatas para um ato: cena forte num gênero que já existe no ano, fora da cidade do ato. */
export function hosts20(s: GameState, a: Act): { city: string; genre: string; score: number }[] {
  const fam = familyOf(a.genre);
  const out: { city: string; genre: string; score: number }[] = [];
  for (const c of CITIES) {
    if (c.id === a.city) continue;
    for (const g of c.scenes) {
      if (!genreAvailable20(s, g)) continue;
      const sc = (s.scenes?.[`${c.id}:${g}`] ?? 0.5) * (familyOf(g) === fam ? 1.4 : 1) * (1 + (exch20(s).rel[c.id] ?? 0) / 200);
      out.push({ city: c.id, genre: g, score: sc });
    }
  }
  return out.sort((x, y) => y.score - x.score || (x.city + x.genre < y.city + y.genre ? -1 : 1));
}

/** Começa uma residência. Devolve o texto do resultado (ou do bloqueio). */
export function startRes20(s: GameState, who: ExchWho20, actId: string, city: string, genre: string, weeks: number): L {
  const st = exch20(s), a = s.acts[actId];
  if (st.cur && st.cur.until > s.week) return l('Já há uma residência em curso.', 'A residency is already under way.');
  if (!mine(a)) return l('Ato indisponível.', 'Act unavailable.');
  if (!cityById[city]) return l('Cidade desconhecida.', 'Unknown city.');
  const { cost, grant } = resCost20(s, who, actId, city, weeks);
  if (s.player.cash < cost - grant) return fmtL(l('Caixa insuficiente: a residência custa {c}.', 'Not enough cash: the residency costs {c}.'), { c: usd(cost - grant) });
  const id = `ex20-${++st.seq}`;
  post(s, `exch20:cost:${id}`, -cost, 'artist_dev', `Residência em ${cityById[city].name.pt}`);
  if (grant) post(s, `exch20:grant:${id}`, grant, 'other_income', 'Bolsa de intercâmbio cultural');
  st.cur = { id, who, act: actId, city, genre, from: s.week, until: s.week + weeks, cost, grant };
  st.inf[who === 'producer' ? '*' : actId] = { city, genre, until: s.week + weeks + 26, k: who === 'producer' ? 0.02 : 0.05 };
  if (who === 'act') for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.fatigue = clamp(p.fatigue + 6, 0, 100); }
  st.rel[city] = clamp((st.rel[city] ?? 0) + (weeks >= 10 ? 14 : 8), 0, 100);
  // polinização cruzada: o gênero do ato ganha um pouco de força na cena anfitriã
  const k = `${city}:${a.genre}`;
  if (s.scenes) s.scenes[k] = clamp((s.scenes[k] ?? 0) + 0.05, 0, 3);
  const tv = travel20(s, a.city, city);
  const text = fmtL(who === 'producer'
    ? l('O produtor da casa parte {h} para {w} semanas na cena {g} de {c}.', 'The house producer leaves {h} for {w} weeks in the {g} scene of {c}.')
    : l('{a} parte {h} para {w} semanas de residência na cena {g} de {c}.', '{a} leaves {h} for a {w}-week residency in the {g} scene of {c}.'), { a: a.name, h: tv.how, w: weeks, g: genre, c: cityById[city].name });
  st.log.unshift([s.year, s.month, text]); if (st.log.length > 20) st.log.length = 20;
  emitFact(s, { kind: 'scene_residency', actors: [a.id, 'player'], severity: 25, visibility: 'public', tags: ['exch20', who, 'good'], place: city, text, src: 'exch20', data: { city, genre, weeks, who } });
  return text;
}

// ---------------------------------------------------------------- efeitos

registerMod('songQ', 'exch20', (s, v, c) => {
  const a = c.act, song = c.song;
  if (!mine(a) || !song) return null;
  const st = exch20(s);
  const f = st.inf[a.id] ?? st.inf['*'];
  if (!f || f.until < s.week) return null;
  const k = f.k * (song.genre === f.genre ? 1.5 : 1);
  return { value: v * (1 + k), label: fmtL(l('Residência em {c}', 'Residency in {c}'), { c: cityById[f.city]?.name ?? l('?', '?') }) };
});
registerMod('tourRisk', 'exch20', (s, v, c) => {
  const cur = exch20(s).cur;
  if (!cur || cur.who !== 'act' || cur.until < s.week || c.act?.id !== cur.act || !c.cityId) return null;
  if (cityById[c.cityId]?.market === cityById[cur.city]?.market) return null;
  return { value: v + 0.01, label: l('Agenda partida pela residência', 'Schedule split by the residency') };
});
registerMod('cityDemand', 'exch20', (s, v, c) => {
  const cur = exch20(s).cur;
  if (!cur || cur.who !== 'act' || cur.until < s.week || c.act?.id !== cur.act || !c.cityId) return null;
  if (cityById[c.cityId]?.market !== cityById[cur.city]?.market) return null;
  return { value: v * 1.05, label: l('Presença na cena local (residência)', 'Presence in the local scene (residency)') };
});

registerSimHook('month', 'exch20', (s) => {
  const st = exch20(s);
  for (const [k, f] of Object.entries(st.inf)) if (f.until < s.week) delete st.inf[k];
  const cur = st.cur;
  if (cur && cur.until <= s.week) {
    const a = s.acts[cur.act];
    if (a && cur.who === 'act') for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.inspiration = clamp(p.inspiration + 10, 0, 100); }
    st.cur = undefined;
    st.next = s.week + 26;
  }
  // convite: só com ato do jogador, sem residência em curso, a cada ~meio ano no máximo
  if (st.cur || st.inv || s.week < st.next) return;
  const acts = playerActs(s).map((id) => s.acts[id]).filter(mine).sort((x, y) => y.fame - x.fame || (x.id < y.id ? -1 : 1));
  if (!acts.length) return;
  const r = rng(s);
  if (!r.chance(0.12)) return;
  const a = acts[0];
  const hs = hosts20(s, a).slice(0, 3);
  if (!hs.length) return;
  const h = hs[r.int(0, hs.length - 1)];
  st.inv = { act: a.id, city: h.city, genre: h.genre };
  st.next = s.week + 26;
  const c6 = resCost20(s, 'act', a.id, h.city, 6), cp = resCost20(s, 'producer', a.id, h.city, 6);
  pushInbox18(s, 'exch20', {
    from: l('Coletivo de músicos', 'Musicians\' collective').pt, tone: 'info', ref: { act: a.id, city: h.city }, weeks: 4,
    subject: fmtL(l('Convite: residência na cena {g} de {c}', 'Invitation: residency in the {g} scene of {c}'), { g: h.genre, c: cityById[h.city].name }),
    body: fmtL(l('A cena de {c} convida {a} para semanas de troca: tocar nos clubes, compor com músicos locais, absorver o som. Seis semanas custam {x} (bolsa já descontada); doze rendem mais e cansam mais. Ou mande só o produtor da casa ({p}): influência menor, para todo o elenco. Shows longe de {c} no período ficam mais arriscados.', '{c}\'s scene invites {a} for weeks of exchange: playing the clubs, writing with local musicians, soaking up the sound. Six weeks cost {x} (grant already deducted); twelve give more and tire more. Or send only the house producer ({p}): smaller influence, for the whole roster. Shows far from {c} in that period get riskier.'),
      { c: cityById[h.city].name, a: a.name, x: usd(c6.cost - c6.grant), p: usd(cp.cost - cp.grant) }),
    actions: [{ id: 'act6', label: l('Mandar o ato (6 semanas)', 'Send the act (6 weeks)') }, { id: 'act12', label: l('Mandar o ato (12 semanas)', 'Send the act (12 weeks)') },
      { id: 'producer', label: l('Mandar só o produtor', 'Send only the producer') }, { id: 'decline', label: l('Recusar', 'Decline') }],
  });
});

export function answerExch20(s: GameState, act: string): L {
  const st = exch20(s), inv = st.inv;
  st.inv = undefined;
  if (!inv) return l('O convite já passou.', 'The invitation has passed.');
  if (act === 'decline') { st.rel[inv.city] = clamp((st.rel[inv.city] ?? 0) - 2, 0, 100); return l('Convite recusado.', 'Invitation declined.'); }
  const who: ExchWho20 = act === 'producer' ? 'producer' : 'act';
  return startRes20(s, who, inv.act, inv.city, inv.genre, act === 'act12' ? 12 : 6);
}
registerInboxKind('exch20', { label: l('Intercâmbio', 'Exchange'), cat: 'decision', icon: 'star', prio: 1, goto: () => ({ area: 'artists' }),
  handle: (s, _m, a) => answerExch20(s, a) });

const T = (pt: string, en: string): L => l(pt, en);
registerConseq18('ib:exch20:act6', { now: T('Ato viaja; fadiga na ida, inspiração na volta.', 'Act travels; fatigue going, inspiration coming back.'),
  later: [{ in: [4, 10], p: 0.35, tone: 'good', hint: T('Músicos locais podem virar parceiros.', 'Local musicians may become partners.'), fx: (f) => { f.fame(1).mood('inspiration', 4); return T('Um músico da cena anfitriã grava como convidado e leva o público dele.', 'A host-scene musician guests on a track and brings their audience.'); } }] });
registerConseq18('ib:exch20:act12', { now: T('Residência longa: mais influência, mais cansaço.', 'Long residency: more influence, more fatigue.'),
  later: [{ in: [6, 14], p: 0.5, tone: 'good', hint: T('A cena pode adotar o ato.', 'The scene may adopt the act.'), fx: (f) => { f.fame(2).fans(2); return T('A imprensa local trata o ato como "da casa".', 'Local press treats the act as one of its own.'); } },
    { in: [3, 8], p: 0.25, tone: 'bad', hint: T('Muito tempo fora cobra o preço.', 'Long time away takes a toll.'), fx: (f) => { f.mood('stress', 5); return T('Saudade e brigas de convivência na casa alugada.', 'Homesickness and house-share quarrels.'); } }] });
registerConseq18('ib:exch20:producer', { now: T('O produtor volta com ideias para todo o elenco.', 'The producer comes back with ideas for the whole roster.'),
  later: [{ in: [4, 12], p: 0.3, tone: 'good', hint: T('Técnicas novas no estúdio.', 'New studio techniques.'), fx: (f) => { f.rep('artistic', 1); return T('O produtor importa um truque de gravação da cena visitada.', 'The producer imports a recording trick from the visited scene.'); } }] });
registerConseq18('ib:exch20:decline', { later: [{ in: [2, 8], p: 0.15, tone: 'bad', hint: T('A cena lembra de quem recusou.', 'The scene remembers who said no.'), fx: (f) => { f.rep('artists', -1); return T('O coletivo convida um selo rival no seu lugar.', 'The collective invites a rival label instead.'); } }] });

// consumidores de fatos: o próprio intercâmbio (diário) e o sindicato — locaute esfria todas as cenas
onFact('scene_residency', (s, f) => { const c = String(f.data?.city ?? ''); if (c) exch20(s).rel[c] = clamp((exch20(s).rel[c] ?? 0) + 1, 0, 100); }, 'exch20:rel');
onFact('union_clash', (s) => { const st = exch20(s); for (const k of Object.keys(st.rel)) st.rel[k] = clamp(st.rel[k] - 5, 0, 100); }, 'exch20:union');

registerExplain('exch20.res', (s, c) => {
  const a = s.acts[String(c.act ?? '')];
  const city = String(c.city ?? exch20(s).cur?.city ?? '');
  if (!a || !cityById[city]) return null;
  const who = (c.who === 'producer' ? 'producer' : 'act') as ExchWho20, weeks = Number(c.weeks ?? 6);
  const { cost, grant } = resCost20(s, who, a.id, city, weeks), tv = travel20(s, a.city, city);
  const parts: WhyPart[] = [
    { label: fmtL(l('Viagem {h}', 'Travel {h}'), { h: tv.how }), value: tv.far ? l('outro mercado', 'another market').pt : l('mesmo mercado', 'same market').pt, fmt: 'text' },
    { label: l('Custo (viagem + estadia)', 'Cost (travel + stay)'), value: cost, fmt: 'money' },
    { label: l('Bolsa de intercâmbio (1946+)', 'Exchange grant (1946+)'), value: grant, fmt: 'money', tone: grant ? 'good' : '' },
    { label: l('Qualidade das faixas (gênero da cena ×1,5)', 'Track quality (host genre ×1.5)'), value: who === 'producer' ? 0.02 : 0.05, fmt: 'pct', tone: 'good' },
    { label: l('Relação com a cena local', 'Relationship with the local scene'), value: exch20(s).rel[city] ?? 0, fmt: 'num' },
  ];
  return { title: l('Residência de intercâmbio', 'Exchange residency'), value: cost - grant, fmt: 'money', parts,
    note: l('Fadiga na ida, inspiração na volta; shows fora do mercado anfitrião ficam mais arriscados durante a residência e os do mercado anfitrião vendem um pouco mais. Influência dura a residência + 26 semanas.', 'Fatigue going, inspiration coming back; shows outside the host market get riskier during the residency and host-market shows sell a bit more. Influence lasts the residency + 26 weeks.') };
});
