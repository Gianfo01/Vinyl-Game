// R33 (GESTÃO · 7) — DIRETORES DE IMPRENSA/CRISES, JURÍDICO E EQUIPE (RH). Interruptor `exp33.dir` (desligado no
// código). Ligado, as três linhas que a delegação única deixava travadas ("Imprensa e crises", "Jurídico e disputas",
// "Equipe: aumentos e saídas") ganham o modo "Delegar" para quem tem o cargo (assessoria, jurídico, administração).
// Com "Delegar", toda semana o diretor responde no seu lugar, pelas funções de sempre, e anota no registro de automação:
//   • Imprensa (assessoria): cartões de escândalo (eventos 'scandal') pela linha da casa — nota, desculpa, humor,
//     silêncio; nunca briga (processar, dobrar a aposta, culpar). Abre a sala de crise de PRISÃO de alguém do elenco
//     (crisis27), que a equipe já toca semana a semana. Assessoria fraca só deixa o padrão do cartão.
//   • Jurídico: cartões de disputa (plágio, sample, coautoria, nome da banda, espólio, auditoria, cláusula moral, IA)
//     — briga no tribunal quem lê bem as chances (jurídico bom), faz acordo o fraco; abre a sala de crise de PROCESSO.
//     Casos de outras frentes (cartório/tribunal da INT-2, sampling e regravação da CATÁLOGO) entram pelo registro
//     `registerLegalCase33`: o diretor decide brigar ou fazer acordo dentro do teto da diretriz.
//   • Equipe/RH (administração): pedidos de aumento e propostas de rivais pela sua equipe — segura quem é bom e cabe no
//     teto anual de aumento da diretriz; senão, a saída barata (bônus, título, trabalhos externos) ou deixa ir.
// Sem interruptor, ou com "Eu decido", nada muda (as linhas voltam travadas). Sem sorteio próprio: o desfecho de cada
// opção é o do próprio cartão (fluxo 'decide' do rng19, como a resposta do jogador).

import { toReal } from '../../core/money';
import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { RESP_X31, logAuto31, modeOf31, rule31, staffFor31, usd31, type Resp31 } from '../deleg31';
import { eventById, resolveDecision } from '../events';
import { registerSimHook } from '../ext4';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { crisisCands27, openCrisis27, type CrisisKind27 } from '../sys/crisis27';
import { quality } from '../sys/deleg16';
import type { Decision, GameState, StaffMember } from '../types';
import { fmtL } from '../util';

export const SW_DIR33 = 'exp33.dir';
registerSwitch({
  id: SW_DIR33, def: true, scope: 'game',
  desc: l('Versão 33 · diretores de imprensa, jurídico e equipe: com o cargo na equipe, você pode delegar crises de imagem, disputas e pedidos de aumento. Desligado: tudo chega para você, como antes.',
    'Version 33 · press, legal and staff directors: with the role on staff, you can delegate image crises, disputes and raise requests. Off: everything comes to you, as before.'),
});
export const dirOn33 = (s: GameState): boolean => sw<boolean>(s, SW_DIR33);
registerEditable({ id: `sw.${SW_DIR33}`, area: 'tools', kind: 'bool', label: l('V33 · diretores de imprensa, jurídico e equipe', 'V33 · press, legal and staff directors'),
  get: (s) => dirOn33(s), set: (s, v) => { setSw(s, SW_DIR33, !!v); } });

/** Números da regra (editáveis). Qualidade do diretor 0,1..1,1 (deleg16.quality). */
export const DIR33 = { weak: 0.35, fight: 0.6, crisis: 0.5 };

// ---------------------------------------------------------------- linhas da delegação abertas

const OPEN33: Partial<Record<Resp31, { desc: L; dirs: ('cap')[]; defDir: { cap?: number } }>> = {
  press: { desc: l('A assessoria responde a escândalos pela linha da casa (nota, desculpa, humor, silêncio — nunca briga) e abre a sala de crise quando alguém do elenco é preso.', 'The publicist answers scandals by the house line (statement, apology, humour, silence — never a fight) and opens the crisis room when someone on the roster is arrested.'), dirs: [], defDir: {} },
  legal: { desc: l('O jurídico responde a disputas (plágio, samples, coautoria, nomes, espólios): briga quando lê boas chances, faz acordo dentro do teto; abre a sala de crise de processo.', 'Legal answers disputes (plagiarism, samples, co-writing, names, estates): fights when it reads good odds, settles within the cap; opens the lawsuit crisis room.'), dirs: ['cap'], defDir: { cap: 0 } },
  people: { desc: l('A administração responde a pedidos de aumento e propostas de rivais: segura quem é bom dentro do teto anual de aumento; senão, a saída barata.', 'Administration answers raise requests and rival offers: keeps the good ones within the yearly raise cap; otherwise, the cheap way out.'), dirs: ['cap'], defDir: { cap: 0 } },
};
for (const [id, o] of Object.entries(OPEN33) as [Resp31, NonNullable<(typeof OPEN33)[Resp31]>][])
  RESP_X31[id] = (s) => (dirOn33(s) ? { modes: ['me', 'staff'], locked: undefined, desc: o.desc, dirs: o.dirs, defDir: o.defDir } : null);

/** Quem dirige esta linha agora (null = você decide, ou interruptor desligado, ou ninguém com o cargo). */
export function director33(s: GameState, r: Resp31): StaffMember | null {
  if (!dirOn33(s) || modeOf31(s, r) !== 'staff') return null;
  return staffFor31(s, r) ?? null;
}
const q33 = (s: GameState, st: StaffMember): number => quality(s, st).q;

// ---------------------------------------------------------------- escolhas (puras)

/** Imprensa: a linha da casa, em ordem. Fica de fora tudo que briga (processar, dobrar, culpar, expor, atacar). */
export const PRESS33 = ['pr', 'spin', 'statement', 'apologize', 'apology', 'own', 'humor', 'laugh', 'embrace', 'credit', 'support', 'rehab', 'cooperate', 'open', 'vague', 'notes', 'silence', 'silent', 'quiet', 'wait', 'ignore', 'nothing', 'deny'];
/** Jurídico: [brigar, acordo] por cartão. */
export const LEGAL33: Record<string, [string, string]> = {
  plagiarism_suit: ['musicologist', 'settle'], sampling_claim: ['fight', 'settle'], cowriter_claim: ['court', 'share'], band_name_dispute: ['court', 'buy'],
  estate_dispute: ['court', 'settle'], dsp15_audit: ['court', 'settle'], morality_clause: ['fight', 'refund'], sample_uncleared: ['clear', 'clear'],
  h19_ai_suits: ['lobby', 'comply'], reverse_plagiarism: ['sue', 'let'], m19p_hh_old: ['clear', 'clear'], m19p_hh_new: ['clear', 'clear'], m19p_dance: ['clear', 'clear'],
  m19p_pop: ['clear', 'clear'], m19p_latin: ['clear', 'clear'], m19p_afro: ['clear', 'clear'],
};
/** RH: [segurar, saída barata, deixar ir] e o aumento (fração) que segurar custa. */
export const PEOPLE33: Record<string, { keep: string; cheap?: string; go: string; raise: number; key: string }> = {
  r11_staff_raise: { keep: 'raise', cheap: 'partial', go: 'let_go', raise: 0.3, key: 'staffId' },
  rival_poach_staff: { keep: 'raise', cheap: 'bonus', go: 'let', raise: 0.25, key: 'staff' },
  producer_award_poach: { keep: 'raise', cheap: 'freelance', go: 'nothing', raise: 0.2, key: 'staff' },
};

const has = (d: Decision, id: string): boolean => d.options.some((o) => o.id === id);

export function pressPick33(d: Decision, q: number): string {
  if (q < DIR33.weak) return d.defaultOption;
  return PRESS33.find((id) => has(d, id)) ?? d.defaultOption;
}
export function legalPick33(d: Decision, q: number): string | null {
  const m = LEGAL33[d.eventId];
  if (!m) return null;
  const want = q >= DIR33.fight ? m[0] : m[1];
  return has(d, want) ? want : has(d, m[1]) ? m[1] : null;
}
export function peoplePick33(s: GameState, d: Decision, q: number): { opt: string; why: L } | null {
  const m = PEOPLE33[d.eventId];
  if (!m) return null;
  const st = s.player.staff.find((x) => x.id === String(d.ctx[m.key]));
  if (!st) return { opt: m.go, why: l('a pessoa já não está na equipe', 'the person is no longer on staff') };
  const yearly = toReal(st.salary * m.raise * 12, s.year), cap = rule31(s, 'people', 'cap');
  const good = st.skill >= 55 + (1 - clamp(q, 0, 1)) * 20; // RH bom reconhece talento mais cedo
  if (good && (!cap || yearly <= cap)) return { opt: m.keep, why: fmtL(l('{n} é peça boa (nível {k}); o aumento custa {v} por ano', '{n} is a good asset (skill {k}); the raise costs {v} a year'), { n: st.name, k: Math.round(st.skill), v: usd31(yearly) }) };
  if (m.cheap && has(d, m.cheap)) return { opt: m.cheap, why: good ? fmtL(l('aumento de {v}/ano passa do teto de {c}', 'a {v}/yr raise is above the {c} cap'), { v: usd31(yearly), c: usd31(cap) }) : fmtL(l('nível {k}: não vale o aumento inteiro', 'skill {k}: not worth the full raise'), { k: Math.round(st.skill) }) };
  return { opt: m.go, why: fmtL(l('nível {k}: não vale segurar', 'skill {k}: not worth keeping'), { k: Math.round(st.skill) }) };
}

// ---------------------------------------------------------------- casos de outras frentes (gancho)

/** Um caso jurídico aberto por outra regra (cartório/tribunal, sampling, regravação, rescisão…). */
export interface LegalCase33 {
  id: string; t: L;
  /** custo do acordo (centavos nominais); 0 = sem acordo possível */
  settle: number;
  /** chance de ganhar no tribunal pela leitura de um jurídico médio (0..1) */
  win: number;
}
export interface LegalSrc33 {
  id: string;
  /** casos que esperam decisão agora */
  list: (s: GameState) => LegalCase33[];
  /** executa: brigar ou fazer acordo (devolve o motivo se não deu) */
  decide: (s: GameState, caseId: string, how: 'fight' | 'settle', who: StaffMember) => L | null;
}
export const LEGAL_SRC33: LegalSrc33[] = [];
export function registerLegalCase33(src: LegalSrc33): void {
  const i = LEGAL_SRC33.findIndex((x) => x.id === src.id);
  if (i >= 0) LEGAL_SRC33[i] = src; else LEGAL_SRC33.push(src);
}
/** Brigar ou acordo: o jurídico lê a chance (melhor quanto melhor ele é) e só faz acordo dentro do teto. */
export function caseHow33(s: GameState, c: LegalCase33, q: number): 'fight' | 'settle' {
  const read = clamp(c.win + (q - 0.6) * 0.3, 0, 1), cap = rule31(s, 'legal', 'cap');
  if (!c.settle || (cap > 0 && toReal(c.settle, s.year) > cap)) return 'fight';
  return read >= 0.55 ? 'fight' : 'settle';
}

// ---------------------------------------------------------------- semana

function answer(s: GameState, r: Resp31, st: StaffMember, d: Decision, opt: string, why?: L): void {
  const label = d.options.find((o) => o.id === opt)?.label ?? l(opt, opt);
  if (!resolveDecision(s, d.id, opt)) return;
  logAuto31(s, { r, who: st.id, tone: 'good', act: d.ctx.act ? String(d.ctx.act) : undefined, x: d.eventId, why,
    t: fmtL(l('{n} respondeu "{t}": {o}.', '{n} answered "{t}": {o}.'), { n: st.name, t: d.title, o: label }) });
}
function crisis(s: GameState, r: Resp31, st: StaffMember, k: CrisisKind27, q: number): void {
  if (q < DIR33.crisis) return;
  for (const c of crisisCands27(s).filter((x) => x.k === k)) {
    const o = openCrisis27(s, c.id);
    if ('id' in o) logAuto31(s, { r, who: st.id, tone: 'info', act: c.ref.act, x: `crisis:${k}`, t: fmtL(l('{n} abriu a sala de crise: {t}', '{n} opened the crisis room: {t}'), { n: st.name, t: o.title }), why: c.text });
  }
}

export function dirWeek33(s: GameState): void {
  if (!dirOn33(s)) return;
  const press = director33(s, 'press'), legal = director33(s, 'legal'), people = director33(s, 'people');
  if (!press && !legal && !people) return;
  for (const d of [...s.decisions]) {
    if (!eventById[d.eventId]) continue;
    if (people && PEOPLE33[d.eventId]) { const p = peoplePick33(s, d, q33(s, people)); if (p) answer(s, 'people', people, d, p.opt, p.why); continue; }
    if (legal && LEGAL33[d.eventId]) { const o = legalPick33(d, q33(s, legal)); if (o) answer(s, 'legal', legal, d, o); continue; }
    if (press && d.cat === 'scandal') answer(s, 'press', press, d, pressPick33(d, q33(s, press)));
  }
  if (press) crisis(s, 'press', press, 'arrest', q33(s, press));
  if (legal) {
    const q = q33(s, legal);
    crisis(s, 'legal', legal, 'lawsuit', q);
    for (const src of LEGAL_SRC33) for (const c of src.list(s)) {
      const how = caseHow33(s, c, q), no = src.decide(s, c.id, how, legal);
      logAuto31(s, { r: 'legal', who: legal.id, tone: no ? 'ask' : 'good', x: no ? 'case' : `case:${how}`, why: no ?? undefined,
        t: fmtL(how === 'fight' ? l('{n} levou ao tribunal: {t}', '{n} took it to court: {t}') : l('{n} fez acordo ({v}): {t}', '{n} settled ({v}): {t}'), { n: legal.name, t: c.t, v: usd31(toReal(c.settle, s.year)) }) });
    }
  }
}
registerSimHook('week', 'dir33', (s) => dirWeek33(s));

registerEditable({ id: 'dir33.fight', area: 'tools', kind: 'number', raw: true, min: 0.1, max: 1.1, step: 0.05,
  label: l('V33 · jurídico: qualidade a partir da qual briga no tribunal', 'V33 · legal: quality from which it fights in court'),
  get: () => DIR33.fight, set: (_s, v) => { DIR33.fight = clamp(Number(v) || 0.6, 0.1, 1.1); } });
registerEditable({ id: 'dir33.weak', area: 'tools', kind: 'number', raw: true, min: 0, max: 1.1, step: 0.05,
  label: l('V33 · assessoria: abaixo desta qualidade só deixa o padrão do cartão', 'V33 · publicist: below this quality it just leaves the card default'),
  get: () => DIR33.weak, set: (_s, v) => { DIR33.weak = clamp(Number(v) || 0, 0, 1.1); } });
