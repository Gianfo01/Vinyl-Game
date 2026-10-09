// Leitura do resultado (rodada 8): cada lançamento do jogador ganha uma explicação curta em linguagem
// natural — os três fatores que mais ajudaram, os dois que mais atrapalharam, o resultado contra a
// expectativa guardada no lançamento e uma oportunidade concreta para a próxima decisão.
// Tudo derivado da autópsia (computeAppeal), da previsão (Release.fc) e da crítica; nada pesa no save
// além de dois campos opcionais no lançamento.

import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { decay, genreLabel } from '../market';
import { criticScore } from '../relinfo';
import type { AutopsyFactor, GameState, Release } from '../types';
import { fmtL, notify, playerActs } from '../util';

export interface ExplainFactor { key: string; label: L; value: number; impact: number; text: L }
export interface Explanation {
  helped: ExplainFactor[];
  hurt: ExplainFactor[];
  /** unidades esperadas para as semanas já decorridas (null sem previsão guardada) */
  expected: number | null;
  actual: number;
  weeks: number;
  /** actual / expected */
  ratio: number | null;
  verdict: 'smash' | 'above' | 'par' | 'below' | 'flop' | 'unknown';
  verdictText: L;
  summary: L;
  opportunity: L;
}

/** Semanas consideradas na comparação (a previsão cobre as 10 primeiras). */
export const EXPLAIN_WEEKS = 10;
/** Semanas depois do lançamento em que a leitura chega como notificação. */
export const EXPLAIN_NOTIFY_AFTER = 6;

const both = (a: L, b: L, join: L): L => ({ pt: `${a.pt}${join.pt}${b.pt}`, en: `${a.en}${join.en}${b.en}` });
const cap = (x: L): L => ({ pt: x.pt.charAt(0).toUpperCase() + x.pt.slice(1), en: x.en.charAt(0).toUpperCase() + x.en.slice(1) });

/** Frase de cada fator, para quando ajudou (up) ou atrapalhou (down). */
function phrase(s: GameState, rel: Release, f: AutopsyFactor, up: boolean): L {
  const act = s.acts[rel.actId];
  const name = act?.name ?? '—';
  const g = act ? { pt: genreLabel(act.genre, 'pt'), en: genreLabel(act.genre, 'en') } : l('o gênero', 'the genre');
  const P = (pt: string, en: string) => fmtL(l(pt, en), { a: name, g, c: f.label });
  switch (f.key) {
    case 'quality': return up ? P('as músicas eram fortes', 'the songs were strong') : P('as músicas não convenceram', 'the songs did not convince');
    case 'fame': return up ? P('{a} tem fãs fiéis e nome conhecido', '{a} has loyal fans and a known name') : P('{a} ainda é pouco conhecido', '{a} is still little known');
    case 'genre': return up ? P('encontrou o {g} em alta', 'it found {g} on the rise') : P('o {g} está em baixa', '{g} is out of favor');
    case 'coverage': return up ? P('a distribuição chegou a muitos mercados', 'distribution reached many markets') : P('a distribuição cobriu poucos mercados', 'distribution covered few markets');
    case 'era': return up ? P('o formato combinava com a época', 'the format suited the era') : P('o formato não combinava com a época', 'the format did not suit the era');
    case 'momentum': return up ? P('a carreira vinha em boa fase', 'the career was on a roll') : P('a carreira estava esfriando', 'the career was cooling down');
    case 'luck': return up ? P('o acaso deu uma mão', 'chance lent a hand') : P('o acaso não ajudou', 'chance did not help');
    case 'hook': return up ? P('o refrão grudou', 'the chorus stuck') : P('faltou gancho no single', 'the single lacked a hook');
    case 'overexposure': return P('o público estava cansado de tantos lançamentos', 'the audience was tired of so many releases');
    case 'hype': return up ? P('o rollout e os superfãs aqueceram a estreia', 'the rollout and superfans warmed up the debut') : P('a campanha de rollout não pegou', 'the rollout campaign did not catch on');
    case 'marketing': return up ? P('a divulgação trouxe ouvintes', 'promotion brought listeners') : P('a divulgação foi tímida', 'promotion was timid');
    case 'cover': return up ? P('a capa ({c}) chamou atenção', 'the cover ({c}) drew attention') : P('a capa ({c}) atrapalhou', 'the cover ({c}) got in the way');
    case 'critics': return up ? P('a crítica aplaudiu', 'critics applauded') : P('a crítica torceu o nariz', 'critics turned up their noses');
    case 'shortage': return P('faltou disco nas lojas', 'stores ran out of copies');
    default: return up ? P('pesou a favor o fator "{c}"', 'the "{c}" factor helped') : P('pesou contra o fator "{c}"', 'the "{c}" factor got in the way');
  }
}

/** Oportunidade concreta a partir do fator que mais atrapalhou (ou do embalo, se nada atrapalhou). */
function opportunityFor(s: GameState, rel: Release, worst: ExplainFactor | undefined, verdict: Explanation['verdict']): L {
  const act = s.acts[rel.actId];
  if (!worst || worst.impact > -0.12) {
    if (verdict === 'smash' || verdict === 'above') return l('Aproveite o embalo: extraia outro single, marque shows nas cidades onde o disco pegou e comece o próximo projeto enquanto o nome está quente.', 'Ride the wave: pull another single, book shows where the record caught on and start the next project while the name is hot.');
    return l('Nada pesou muito contra: repita a receita, mas com um single mais forte à frente.', 'Nothing weighed much against it: repeat the recipe, but lead with a stronger single.');
  }
  switch (worst.key) {
    case 'fame': return l('Construa público antes do próximo disco: shows de abertura, entrevistas e um single antes do álbum.', 'Build an audience before the next record: opening slots, interviews and a single before the album.');
    case 'quality': return l('Grave com mais calma (abordagem minuciosa) ou com um produtor cuja assinatura combine com o gênero, e revise as músicas fracas antes de gravar.', 'Record with more care (meticulous approach) or with a producer whose signature fits the genre, and revise weak songs before recording.');
    case 'genre': return l('O gênero está em baixa: segure o próximo lançamento, aposte num single mais crossover ou mude o posicionamento.', 'The genre is down: hold the next release, bet on a more crossover single or shift the positioning.');
    case 'coverage': return l('Abra mais territórios (ou licencie para um parceiro) antes de lançar de novo.', 'Open more territories (or license to a partner) before releasing again.');
    case 'era': return rel.type === 'lp'
      ? l('Nesta época o público quer faixas avulsas: lance singles antes e deixe o álbum para quando houver hits.', 'In this era people want tracks: release singles first and save the album for when there are hits.')
      : l('Nesta época o álbum pesa mais: junte as melhores faixas num LP.', 'In this era albums matter more: gather the best tracks into an LP.');
    case 'momentum': return fmtL(l('Reaqueça a carreira de {a} com shows e mídia antes de lançar de novo.', 'Warm {a}\'s career back up with shows and media before releasing again.'), { a: act?.name ?? '—' });
    case 'luck': return l('Foi azar: o plano estava certo — repita a receita, de preferência com um rollout para diluir o risco.', 'It was bad luck: the plan was right — repeat it, ideally with a rollout to spread the risk.');
    case 'hook': return l('Escolha como single a faixa com mais gancho (perfil comercial), não só a de maior Q.', 'Pick the track with the strongest hook (commercial profile) as the single, not just the highest Q.');
    case 'overexposure': return l('Espace os lançamentos: pelo menos 6 a 9 meses entre discos do mesmo artista.', 'Space out releases: at least 6 to 9 months between records by the same act.');
    case 'marketing': return l('Ponha verba de divulgação no canal certo da época — mesmo pouca, a primeira fatia rende muito (retorno decrescente).', 'Put some promotion budget on the right channel for the era — even a little goes a long way (diminishing returns).');
    case 'cover': return l('Na próxima capa, escolha um estilo que combine com o momento: retrato para quem já é conhecido, conceitual para a crítica, cena local para a base.', 'On the next cover pick a style that fits the moment: portrait for known acts, concept for critics, local scene for the base.');
    case 'critics': return l('A crítica não gostou: invista em originalidade, numa capa conceitual e no canal de imprensa.', 'Critics did not like it: invest in originality, a concept cover and the press channel.');
    case 'shortage': return l('Prense mais cópias (ou reprense rápido): houve procura que não encontrou disco.', 'Press more copies (or repress fast): there was demand that found no record.');
    case 'hype': return l('Planeje o rollout com mais antecedência: teaser e pré-save funcionam melhor com uma base de fãs ativa.', 'Plan the rollout earlier: teasers and pre-saves work best with an active fan base.');
    default: return fmtL(l('Observe "{c}" antes da próxima decisão.', 'Watch "{c}" before the next decision.'), { c: worst.label });
  }
}

/** Fatores normalizados (impacto = ln do multiplicador relativo ao "neutro"). */
function factorsOf(s: GameState, rel: Release): ExplainFactor[] {
  const out: ExplainFactor[] = [];
  for (const f of rel.autopsy ?? []) {
    // marketing é sempre ≥1: compara com uma campanha típica (E ≈ 0,3)
    const value = f.key === 'marketing' ? f.value / 1.75 : f.value;
    if (!(value > 0)) continue;
    const impact = Math.log(value);
    out.push({ key: f.key, label: f.label, value, impact, text: phrase(s, rel, { ...f, value }, impact >= 0) });
  }
  const crit = criticScore(s, rel);
  if (!crit.estimated && crit.n > 0) {
    const impact = (crit.score - 62) / 60;
    out.push({ key: 'critics', label: fmtL(l('Crítica ({n})', 'Critics ({n})'), { n: crit.score }), value: Math.exp(impact), impact, text: phrase(s, rel, { key: 'critics', label: l(''), value: 1, confidence: 'medium' }, impact >= 0) });
  }
  if (rel.shortage > 0 && rel.totalUnits > 0) {
    const lost = rel.shortage / (rel.totalUnits + rel.shortage);
    const impact = Math.log(Math.max(0.05, 1 - lost));
    out.push({ key: 'shortage', label: l('Falta de estoque', 'Stock-outs'), value: Math.exp(impact), impact, text: phrase(s, rel, { key: 'shortage', label: l(''), value: 1, confidence: 'high' }, false) });
  }
  return out;
}

/** Unidades esperadas nas primeiras `weeks` semanas, pela curva de decaimento do tipo. */
export function expectedFor(rel: Release, weeks: number): number | null {
  if (rel.fc === undefined) return null;
  let tot = 0;
  let part = 0;
  for (let age = 0; age < EXPLAIN_WEEKS; age++) {
    const w = decay(rel.type, age);
    tot += w;
    if (age < weeks) part += w;
  }
  return Math.round((rel.fc * part) / Math.max(1e-9, tot));
}

export function explainRelease(s: GameState, rel: Release): Explanation | null {
  if (!rel.autopsy?.length) return null;
  const all = factorsOf(s, rel);
  const helped = all.filter((f) => f.impact > 0.02).sort((a, b) => b.impact - a.impact).slice(0, 3);
  const hurt = all.filter((f) => f.impact < -0.02).sort((a, b) => a.impact - b.impact).slice(0, 2);
  // semanas desde o lançamento (até 10); o total real das 10 primeiras fica guardado em `fa`
  const weeks = Math.max(0, Math.min(EXPLAIN_WEEKS, s.week - rel.week));
  const actual = rel.fa ?? rel.totalUnits;
  const expected = weeks > 0 ? expectedFor(rel, weeks) : null;
  const ratio = expected !== null && expected > 0 ? actual / expected : null;
  const verdict: Explanation['verdict'] = ratio === null ? 'unknown' : ratio >= 1.5 ? 'smash' : ratio >= 1.12 ? 'above' : ratio >= 0.88 ? 'par' : ratio >= 0.6 ? 'below' : 'flop';
  const isAlbum = rel.type !== 'single';
  const what = isAlbum ? l('O disco', 'The record') : l('O single', 'The single');
  const VERDICT: Record<Explanation['verdict'], L> = {
    smash: l('superou de longe a expectativa', 'far exceeded expectations'),
    above: l('estreou acima do esperado', 'debuted above expectations'),
    par: l('saiu como o esperado', 'landed as expected'),
    below: l('ficou abaixo do esperado', 'fell short of expectations'),
    flop: l('decepcionou', 'disappointed'),
    unknown: rel.peak <= 10 ? l('estreou bem', 'debuted well') : rel.peak < 999 ? l('entrou na parada', 'made the chart') : l('passou longe da parada', 'missed the chart'),
  };
  const verdictText = VERDICT[verdict];
  // "O disco estreou bem porque A e B. C ajudou, mas D atrapalhou."
  let summary: L = fmtL(l('{w} "{t}" {v}', '{w} "{t}" {v}'), { w: what, t: rel.title, v: verdictText });
  if (helped.length) {
    const reasons = helped.length >= 2 ? both(helped[0].text, helped[1].text, l(' e ', ' and ')) : helped[0].text;
    summary = both(summary, reasons, verdict === 'below' || verdict === 'flop' ? l(' — e olha que ', ' — even though ') : l(' porque ', ' because '));
  }
  summary = both(summary, l('.', '.'), l('', ''));
  if (hurt.length) {
    const h0 = hurt.length >= 2 ? both(hurt[0].text, hurt[1].text, l(' e ', ' and ')) : hurt[0].text;
    const lead = helped[2] ? both(cap(helped[2].text), h0, l(', mas ', ', but ')) : both(l('Por outro lado, ', 'On the other hand, '), h0, l('', ''));
    summary = both(summary, both(lead, l('.', '.'), l('', '')), l(' ', ' '));
  } else if (helped[2]) {
    summary = both(summary, both(cap(helped[2].text), l(' também.', ' too.'), l('', '')), l(' ', ' '));
  }
  return { helped, hurt, expected, actual, weeks, ratio, verdict, verdictText, summary, opportunity: opportunityFor(s, rel, hurt[0], verdict) };
}

// algumas semanas depois do lançamento, a leitura chega como notificação
registerSimHook('week', 'explain8', (s) => {
  for (const actId of playerActs(s)) {
    const act = s.acts[actId];
    if (!act) continue;
    for (const id of act.releases.slice(-8)) {
      const rel = s.releases[id];
      if (!rel || rel.fc === undefined) continue;
      const age = s.week - rel.week;
      if (rel.fa === undefined && age >= EXPLAIN_WEEKS) rel.fa = rel.totalUnits;
      if (rel.expl || age < EXPLAIN_NOTIFY_AFTER) continue;
      rel.expl = true;
      const ex = explainRelease(s, rel);
      if (!ex) continue;
      notify(s, both(both(l('Leitura: ', 'Debrief: '), ex.summary, l('', '')), ex.opportunity, l(' Próximo passo: ', ' Next step: ')), ex.verdict === 'flop' || ex.verdict === 'below' ? 'bad' : ex.verdict === 'smash' || ex.verdict === 'above' ? 'good' : 'info');
    }
  }
});
