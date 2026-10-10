// Rodada 18 (society18, frente G — S1) — IA NA MÚSICA, POR ATO E POR LANÇAMENTO (consent8 cuida do selo como um todo:
// uso geral, consentimento, leis, certificação). Aqui:
//  • IA no estúdio por ato: nenhuma / assistência (+qualidade leve) / geração (gravação 60% mais barata, faixa genérica,
//    inelegível ao prêmio desde a regra de autoria humana de 2023; rótulo "feito com IA" ou esconder e arriscar exposição,
//    que fica mais provável quando as plataformas passam a detectar e rotular — 2024 YouTube, 2025 Deezer).
//  • Deepfake viral (2023+, o caso "Heart on My Sleeve"): dueto falso de um astro seu viraliza → derrubar, monetizar,
//    processar ou ignorar, com efeitos em fama, confiança do artista e caixa.
//  • Clone de voz licenciado (modelo Grimes/Elf.Tech, 2023): exige o direito de voz por IA (image17) ou o consentimento
//    (consent8); paga adiantamento + parte mensal; risco de mau uso que vira escândalo do artista.
//  • Processo coletivo das gravadoras contra geradores (jun/2024): entrar na coalizão (honorários mensais) ou licenciar o
//    catálogo antes. No modo exato o desfecho segue o real (acordos out-nov/2025, viram licenças); nos outros é sorteado.
//  • Políticas de plataforma por ano e o ramo especulativo de eras18 (2027+): regulamentado (IA escondida dá multa, voz
//    paga menos, deepfake raro), sem regra (deepfake frequente, backlash menor), licença coletiva (voz pela sociedade, sem
//    risco de mau uso).

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { scandal } from '../scandal17';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { aiEra, consentOf, humanPref } from './consent8';
import { spec18 } from './eras18';
import { hasRight } from './image17';

export type AiMode18 = 'none' | 'assist' | 'gen';
export const AIMODE18: Record<AiMode18, { name: L; desc: L }> = {
  none: { name: l('Sem IA', 'No AI'), desc: l('Tudo humano. Vale mais onde o público prefere "feito por humanos".', 'All human. Worth more where audiences prefer "made by humans".') },
  assist: { name: l('Assistência', 'Assistance'), desc: l('Limpeza, mixagem, demos: +3% de qualidade, sem polêmica.', 'Cleanup, mixing, demos: +3% quality, no controversy.') },
  gen: { name: l('Geração', 'Generation'), desc: l('A IA compõe e canta: gravação 60% mais barata, faixa genérica (−12%), sem prêmio; esconder pode virar escândalo.', 'AI writes and sings: recording 60% cheaper, generic track (−12%), no awards; hiding it can become a scandal.') },
};
export interface Clone18 { act: string; co: string; up: number; mo: number; until: number; share: number }
export interface Ai18 {
  mode: Record<string, AiMode18>;
  /** lançamentos gerados por IA: id → 1 rotulado, 0 escondido, 2 exposto */
  gen: Record<string, 0 | 1 | 2>;
  disclose: boolean;
  clones: Clone18[];
  fakes: { w: number; act: string; ch?: string }[];
  suit: { st: 'none' | 'joined' | 'licensed' | 'settled' | 'lost' | 'won'; since?: number; paid: number };
  log: { y: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { ai18: Ai18 } }
const init = (): Ai18 => ({ mode: {}, gen: {}, disclose: true, clones: [], fakes: [], suit: { st: 'none', paid: 0 }, log: [] });
registerExt4('ai18', init);
export function ai18(s: GameState): Ai18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.ai18 ??= init()) as Ai18;
  st.mode ??= {}; st.gen ??= {}; st.clones ??= []; st.fakes ??= []; st.suit ??= { st: 'none', paid: 0 }; st.log ??= [];
  return st;
}
const logA = (s: GameState, t: L) => { const st = ai18(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 30) st.log.length = 30; };
export const modeOf18 = (s: GameState, actId: string): AiMode18 => ai18(s).mode[actId] ?? 'none';
export const isGenRel18 = (s: GameState, relId: string): boolean => ai18(s).gen[relId] !== undefined;

/** Política das plataformas no ano (o que muda para faixas geradas). */
export function platformPolicy18(s: GameState): { detect: number; demote: number; name: L } {
  const y = s.year, sp = s.year >= 2029 ? spec18(s).voices : null;
  if (sp === 'regulated') return { detect: 0.6, demote: 0.2, name: l('Lei de rotulagem: IA escondida é infração (multa).', 'Labelling law: hidden AI is an offence (fine).') };
  if (sp === 'wild') return { detect: 0.12, demote: 0.03, name: l('Sem regra: plataformas desistem de filtrar.', 'No rules: platforms give up filtering.') };
  if (y >= 2025) return { detect: 0.35, demote: 0.12, name: l('Plataformas detectam e rotulam álbuns de IA e os tiram das recomendações (2025).', 'Platforms detect and label AI albums and pull them from recommendations (2025).') };
  if (y >= 2024) return { detect: 0.2, demote: 0.06, name: l('Rótulo obrigatório de conteúdo sintético em vídeo (2024).', 'Mandatory synthetic-content labels on video (2024).') };
  return { detect: 0.08, demote: 0.03, name: l('Plataformas removem faixas de IA ligadas a fraude de streams (2023).', 'Platforms remove AI tracks tied to stream fraud (2023).') };
}

export function setAiMode18(s: GameState, actId: string, m: AiMode18): L | null {
  const a = s.acts[actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return l('Só atos seus.', 'Only your acts.');
  if (m !== 'none' && !aiEra(s)) return l('A tecnologia ainda não chegou.', 'The technology has not arrived yet.');
  const st = ai18(s);
  const prev = st.mode[actId] ?? 'none';
  st.mode[actId] = m;
  if (m === 'gen' && prev !== 'gen') {
    // artista que se vê substituído pela máquina perde confiança (menos se for projeto virtual sem integrantes vivos)
    a.trust = clamp(a.trust - (a.members.length ? 12 : 0), 0, 100);
    logA(s, fmtL(l('{a} passa a gravar com IA generativa.', '{a} starts recording with generative AI.'), { a: a.name }));
  }
  return null;
}

/** Multiplicador de apelo de um lançamento gerado: preferência por humanos × política da plataforma × rótulo. */
export function genAppeal18(s: GameState, rel: Release): { v: number; why: [L, number][] } {
  const st = ai18(s), g = st.gen[rel.id];
  if (g === undefined) return { v: 1, why: [] };
  const why: [L, number][] = [[l('Faixa genérica', 'Generic track'), 0.92], [l('Rebaixada pela plataforma', 'Platform demotion'), 1 - platformPolicy18(s).demote]];
  if (g === 1) why.push([l('Rótulo "feito com IA" (quem prefere humanos)', '"Made with AI" label (human-preferring fans)'), 1 - humanPref(s) * 0.3]);
  if (g === 2) why.push([l('Exposto como IA escondida', 'Exposed as hidden AI'), 0.6]);
  return { v: why.reduce((t, x) => t * x[1], 1), why };
}
registerMod('appeal', 'ai18', (s, v, c) => {
  if (!c.release) return null;
  const g = genAppeal18(s, c.release);
  return g.v !== 1 ? { value: v * g.v, label: l('IA generativa', 'Generative AI') } : null;
});
registerMod('songQ', 'ai18', (s, v, c) => {
  if (!c.act) return null;
  const m = modeOf18(s, c.act.id);
  return m === 'assist' ? { value: v * 1.03, label: l('IA de assistência', 'AI assistance') } : m === 'gen' ? { value: v * 0.88, label: l('IA generativa (genérica)', 'Generative AI (generic)') } : null;
});
// gravação gerada: a maior parte da sessão não é paga (devolução do custo do estúdio)
registerSimHook('record', 'ai18', (s, _r, a) => {
  const song = a.song;
  if (!song || modeOf18(s, song.actId) !== 'gen') return;
  const act = s.acts[song.actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return;
  post(s, `ai18reb:${song.id}`, money(s, 1200), 'recording', `IA generativa: sessão sem músicos (${song.title})`);
});
registerSimHook('launch', 'ai18', (s, _r, a) => {
  const rel = a.release;
  if (!rel || (rel.owner !== 'player' && !s.acts[rel.actId]?.playerBand)) return;
  if (modeOf18(s, rel.actId) !== 'gen') return;
  const st = ai18(s);
  st.gen[rel.id] = st.disclose ? 1 : 0;
  if (st.disclose) emitFact(s, { kind: 'statement', actors: [rel.actId, 'player'], severity: 25, visibility: 'public', tags: ['ai', 'ai18'], src: 'ai18', place: s.acts[rel.actId]?.city, text: fmtL(l('"{t}" sai com o selo "feito com IA".', '"{t}" comes out labelled "made with AI".'), { t: rel.title }) });
  const ids = Object.keys(st.gen);
  if (ids.length > 200) for (const id of ids.slice(0, ids.length - 200)) delete st.gen[id];
});

// ---------------------------------------------------------------- deepfake viral

export type FakeChoice18 = 'takedown' | 'monetize' | 'sue' | 'ignore';
export function fakeOdds18(s: GameState, ch: FakeChoice18): { p: number; why: L[] } {
  const pol = platformPolicy18(s);
  if (ch === 'takedown') return { p: clamp(0.45 + pol.detect, 0.2, 0.95), why: [l('Notificação às plataformas; detecção melhora a cada ano.', 'Notices to platforms; detection improves every year.')] };
  if (ch === 'sue') return { p: s.year >= 2029 && spec18(s).voices === 'regulated' ? 0.75 : 0.35, why: [l('Sem lei específica, o anônimo é difícil de alcançar.', 'Without a specific law, the anonymous uploader is hard to reach.')] };
  return { p: 1, why: [] };
}
export function resolveFake18(s: GameState, actId: string, ch: FakeChoice18, r: Rng): L {
  const a = s.acts[actId];
  const st = ai18(s);
  const f = st.fakes.find((x) => x.act === actId && !x.ch);
  if (!a || !f) return l('Nada a decidir.', 'Nothing to decide.');
  f.ch = ch;
  const ok = r.chance(fakeOdds18(s, ch).p);
  let t: L;
  if (ch === 'takedown') { t = ok ? l('A faixa falsa sai do ar; o artista agradece.', 'The fake track comes down; the artist is grateful.') : l('Cópias reaparecem em todo lugar: o falso continua tocando.', 'Copies resurface everywhere: the fake keeps playing.'); a.trust = clamp(a.trust + (ok ? 4 : 0), 0, 100); }
  else if (ch === 'monetize') { const v = money(s, 3000 + a.fame * 250); post(s, `ai18fake:${actId}:${s.week}`, v, 'licensing', `Monetização do deepfake de ${a.name}`); a.trust = clamp(a.trust - 8, 0, 100); a.fame = clamp(a.fame + 1.5, 0, 100); t = l('Você reivindica a faixa e embolsa os streams — o artista detesta ver a própria voz à venda.', 'You claim the track and pocket the streams — the artist hates seeing their voice for sale.'); }
  else if (ch === 'sue') { post(s, `ai18sue:${actId}:${s.week}`, -money(s, 8000), 'legal', `Processo por deepfake de ${a.name}`); if (ok) post(s, `ai18won:${actId}:${s.week}`, money(s, 15000), 'legal', 'Indenização por deepfake'); a.trust = clamp(a.trust + 6, 0, 100); t = ok ? l('Vitória: indenização e precedente.', 'Win: damages and a precedent.') : l('Processo arquivado: autor não identificado.', 'Case dismissed: uploader not identified.'); }
  else { a.fame = clamp(a.fame + 0.5, 0, 100); a.trust = clamp(a.trust - 3, 0, 100); t = l('Você deixa rolar: buzz grátis, artista se sente desprotegido.', 'You let it run: free buzz, the artist feels unprotected.'); }
  logA(s, fmtL(l('Deepfake de {a}: {t}', 'Deepfake of {a}: {t}'), { a: a.name, t }));
  return t;
}
registerInboxKind('ai18_fake', { label: l('IA', 'AI'), cat: 'decision', icon: 'alert', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : { area: 'society18' }),
  handle: (s, m, a, r) => resolveFake18(s, String(m.ref?.act), a as FakeChoice18, r) });

// ---------------------------------------------------------------- clone de voz licenciado

export const canClone18 = (s: GameState, a: Act): L | null => {
  if (!aiEra(s)) return l('A tecnologia ainda não chegou.', 'The technology has not arrived yet.');
  if (ai18(s).clones.some((c) => c.act === a.id && c.until > s.week)) return l('Já há um clone licenciado.', 'A clone is already licensed.');
  if (hasRight(s, a.id, 'voice_ai') || consentOf(s, a.id)?.v === 'g') return null;
  return l('Precisa do direito de voz por IA (Imagem & voz) ou do consentimento de voz do artista.', 'Needs the AI voice right (Image & voice) or the artist\'s voice consent.');
};
export function cloneTerms18(s: GameState, a: Act): { up: number; mo: number; share: number } {
  const sp = s.year >= 2029 ? spec18(s).voices : null;
  const k = sp === 'regulated' ? 0.7 : sp === 'wild' ? 1.3 : sp === 'collective' ? 0.85 : 1;
  return { up: money(s, (4000 + a.fame * 300) * k), mo: money(s, (300 + a.fame * 40) * k), share: 0.5 };
}
export function licenseClone18(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return l('Só atos seus.', 'Only your acts.');
  const b = canClone18(s, a);
  if (b) return b;
  const t = cloneTerms18(s, a);
  ai18(s).clones.push({ act: a.id, co: s.config.realNames && histMode(s) === 'strict' ? 'VoiceSwap' : 'Vozmatic', up: t.up, mo: t.mo, until: s.week + 104, share: t.share });
  post(s, `ai18clone:${a.id}`, Math.round(t.up * (1 - t.share)), 'licensing', `Clone de voz licenciado: ${a.name}`);
  a.cash += Math.round(t.up * t.share);
  emitFact(s, { kind: 'deal', actors: [a.id, 'player'], severity: 35, visibility: 'public', tags: ['ai', 'ai18', 'voice_clone'], src: 'ai18', place: a.city, text: fmtL(l('{a} licencia um clone oficial da própria voz: metade de cada faixa feita com ela.', '{a} licenses an official clone of their voice: half of every track made with it.'), { a: a.name }) });
  return null;
}

// ---------------------------------------------------------------- processo das gravadoras contra geradores

export const SUIT_Y18 = 2024;
export const suitFee18 = (s: GameState) => money(s, 2500);
export const licDeal18 = (s: GameState) => money(s, 6000 + Math.min(400, Object.values(s.releases).filter((r) => r.owner === 'player').length) * 220);
export function joinSuit18(s: GameState, how: 'join' | 'license'): L | null {
  const st = ai18(s).suit;
  if (s.year < SUIT_Y18 || st.st !== 'none') return l('Não disponível agora.', 'Not available now.');
  if (how === 'join') { st.st = 'joined'; st.since = s.week; logA(s, l('O selo entra na coalizão de gravadoras contra os geradores de música.', 'The label joins the labels\' coalition against music generators.')); return null; }
  st.st = 'licensed';
  const v = licDeal18(s);
  post(s, 'ai18lic', v, 'licensing', 'Licença do catálogo para treino de IA');
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a && !a.deceased) a.trust = clamp(a.trust - 6, 0, 100); }
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 45, visibility: 'public', tags: ['bad', 'ai', 'ai18', 'training'], src: 'ai18', place: s.config.homeCity, text: fmtL(l('{c} licencia o catálogo inteiro para treinar um gerador de música; artistas reclamam que ninguém perguntou.', '{c} licenses its whole catalog to train a music generator; artists complain nobody asked.'), { c: s.config.companyName }) });
  return null;
}
function suitMonth(s: GameState, r: Rng): void {
  const st = ai18(s).suit;
  if (st.st !== 'joined') return;
  post(s, `ai18fees:${s.week}`, -suitFee18(s), 'legal', 'Honorários: coalizão contra geradores de IA');
  st.paid += suitFee18(s);
  const exact = histMode(s) === 'strict';
  const due = exact ? s.year > 2025 || (s.year === 2025 && s.month >= 10) : s.week - (st.since ?? s.week) >= 64 && r.chance(0.12);
  if (!due) return;
  const roll = exact ? 0.2 : r.next();
  const out: 'settled' | 'won' | 'lost' = roll < 0.6 ? 'settled' : roll < 0.8 ? 'won' : 'lost';
  st.st = out;
  const v = out === 'settled' ? licDeal18(s) * 1.6 : out === 'won' ? licDeal18(s) * 2.5 : 0;
  if (v) post(s, 'ai18settle', Math.round(v), 'legal', 'Acordo/indenização: geradores de IA');
  const t = out === 'settled' ? l('As gravadoras fecham acordo com os geradores: indenização e licenças com pagamento por uso (como em out-nov/2025).', 'Labels settle with the generators: damages and pay-per-use licences (as in Oct-Nov 2025).')
    : out === 'won' ? l('Vitória no tribunal: treinar sem licença é violação; geradores pagam.', 'Court win: training without a licence is infringement; generators pay.')
    : l('Derrota: o tribunal vê "uso justo" no treino. Honorários perdidos.', 'Defeat: the court finds training to be "fair use". Fees lost.');
  logA(s, t);
  emitFact(s, { kind: 'case_ruling', actors: ['player'], severity: 55, visibility: 'public', tags: [out === 'lost' ? 'bad' : 'good', 'ai', 'ai18', 'law', 'rights'], src: 'ai18', place: s.config.homeCity, text: t });
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'ai18', (s) => {
  if (!aiEra(s)) return;
  const st = ai18(s);
  const r = Rng.fromSeed(`${s.config.seed}|ai18|${s.week}`);
  const pol = platformPolicy18(s);
  const sp = s.year >= 2029 ? spec18(s).voices : null;
  // lançamentos gerados e escondidos podem ser expostos
  for (const [id, g] of Object.entries(st.gen)) {
    if (g !== 0) continue;
    const rel = s.releases[id];
    if (!rel || s.week - rel.week > 52) continue;
    if (!r.chance(pol.detect * 0.25)) continue;
    st.gen[id] = 2;
    const sev = sp === 'wild' ? 30 : 50;
    scandal(s, rel.actId, 'conduct', sev, fmtL(l('"{t}" foi feita por IA e vendida como humana', '"{t}" was AI-made and sold as human'), { t: rel.title }), { tags: ['ai', 'ai18'], place: s.acts[rel.actId]?.city });
    if (sp === 'regulated') post(s, `ai18fine:${id}`, -money(s, 12000), 'legal', 'Multa: IA sem rótulo');
    s.player.reputation.artistic = clamp(s.player.reputation.artistic - 3, 0, 100);
    logA(s, fmtL(l('Exposto: "{t}" era IA escondida.', 'Exposed: "{t}" was hidden AI.'), { t: rel.title }));
  }
  // deepfake viral de um astro seu
  const pFake = (sp === 'wild' ? 0.05 : sp === 'regulated' ? 0.008 : 0.02);
  const stars = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.fame >= 45 && a.members.length > 0);
  if (stars.length && !st.fakes.some((f) => !f.ch && s.week - f.w < 8) && r.chance(pFake * Math.min(3, stars.length))) {
    const a = r.pick(stars);
    st.fakes.push({ w: s.week, act: a.id });
    if (st.fakes.length > 20) st.fakes.shift();
    emitFact(s, { kind: 'statement', actors: [a.id], severity: 50, visibility: 'public', tags: ['ai', 'ai18', 'deepfake'], src: 'ai18', place: a.city, text: fmtL(l('Um dueto falso de {a}, feito com IA, viraliza: milhões de plays antes de alguém perceber.', 'A fake AI duet by {a} goes viral: millions of plays before anyone notices.'), { a: a.name }) });
    pushInbox18(s, 'ai18_fake', { from: a.name, subject: fmtL(l('Deepfake de {a} viralizou', 'A deepfake of {a} went viral'), { a: a.name }),
      body: fmtL(l('Derrubar ({p}% de chance de sumir), monetizar (dinheiro e fama, artista −8 de confiança), processar (custa, {q}% de ganhar) ou ignorar.', 'Take down ({p}% chance it disappears), monetize (cash and fame, artist −8 trust), sue (costly, {q}% to win) or ignore.'), { p: Math.round(fakeOdds18(s, 'takedown').p * 100), q: Math.round(fakeOdds18(s, 'sue').p * 100) }),
      ref: { act: a.id }, actions: [{ id: 'takedown', label: l('Derrubar', 'Take down') }, { id: 'monetize', label: l('Monetizar', 'Monetize') }, { id: 'sue', label: l('Processar', 'Sue') }, { id: 'ignore', label: l('Ignorar', 'Ignore') }], weeks: 4 });
  }
  // clones de voz: renda mensal; risco de mau uso (menor na licença coletiva)
  for (const c of st.clones) {
    if (c.until <= s.week) continue;
    const a = s.acts[c.act];
    if (!a) continue;
    post(s, `ai18clm:${c.act}`, Math.round(c.mo * (1 - c.share)), 'licensing', `Clone de voz: ${a.name}`);
    a.cash += Math.round(c.mo * c.share);
    if (r.chance(sp === 'collective' ? 0.004 : 0.015)) {
      c.until = s.week;
      scandal(s, a.id, 'offense', 45, l('A voz clonada aparece em faixas ofensivas', 'The cloned voice turns up on offensive tracks'), { tags: ['ai', 'ai18', 'voice_clone'], place: a.city });
      a.trust = clamp(a.trust - 10, 0, 100);
      logA(s, fmtL(l('Mau uso do clone de {a}: contrato suspenso.', 'Misuse of {a}\'s clone: deal suspended.'), { a: a.name }));
    }
  }
  if (s.year === SUIT_Y18 && s.month === 5 && st.suit.st === 'none') pushInbox18(s, 'ai18_suit', { from: l('Associação das gravadoras', 'Labels\' association').pt,
    subject: l('Processo contra os geradores de música', 'Lawsuit against the music generators'),
    body: fmtL(l('As grandes processam os geradores por treino sem licença. Entrar na coalizão custa {f}/mês até o desfecho; licenciar o catálogo para treino paga {v} agora, mas o elenco não gosta.', 'The majors sue the generators for unlicensed training. Joining the coalition costs {f}/month until the outcome; licensing the catalog for training pays {v} now, but the roster dislikes it.'), { f: `$${Math.round(suitFee18(s) / 100).toLocaleString('en-US')}`, v: `$${Math.round(licDeal18(s) / 100).toLocaleString('en-US')}` }),
    actions: [{ id: 'join', label: l('Entrar na coalizão', 'Join the coalition') }, { id: 'license', label: l('Licenciar o catálogo', 'License the catalog') }, { id: 'no', label: l('Ficar de fora', 'Stay out') }], weeks: 10 });
  suitMonth(s, r);
});
registerInboxKind('ai18_suit', { label: l('IA', 'AI'), cat: 'deals', icon: 'scale', prio: 1, goto: () => ({ area: 'society18', tab: ['society18', 'ai'] }),
  handle: (s, _m, a) => (a === 'no' ? l('Você fica de fora.', 'You stay out.') : joinSuit18(s, a as 'join' | 'license') ?? l('Feito.', 'Done.')) });

registerExplain('ai18.appeal', (s, c) => {
  const rel = s.releases[String(c.rel)];
  if (!rel) return null;
  const g = genAppeal18(s, rel);
  return { title: l('Apelo de faixa gerada por IA', 'AI-generated release appeal'), value: g.v, fmt: 'mult', parts: g.why.map(([label, value]) => ({ label, value, fmt: 'mult' as const })), note: platformPolicy18(s).name };
});
registerAdvisorTip('ai18', (s) => {
  const st = ai18(s);
  const out = [] as ReturnType<Parameters<typeof registerAdvisorTip>[1]>;
  const hidden = Object.values(st.gen).filter((g) => g === 0).length;
  if (hidden) out.push({ id: 'ai18-hidden', level: 'warn', cat: 'release', score: 50, text: fmtL(l('{n} lançamento(s) com IA escondida: a detecção das plataformas está em {p}%/ano.', '{n} release(s) with hidden AI: platform detection is at {p}%/year.'), { n: hidden, p: Math.round(platformPolicy18(s).detect * 100) }), goto: { area: 'society18', tab: ['society18', 'ai'] } });
  return out;
});
