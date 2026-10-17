// R33 · GENTE33 parte A — ações nos cartões de objeto (ACOES5, EXP-13), sem tela nova:
//   • mapa da parede da sede (as filiais): contratar diretor(a) de filial, trocar a linha (ousado/conservador);
//   • mesa da sala de reunião: contratar/dispensar o CEO, instalar o conselho (e as linhas das últimas decisões);
//   • garagem, porta e espelho: motorista, segurança, personal trainer e médico particular;
//   • mural do elenco, jornal da mesa e quadro da equipe: presidente do fã-clube, jornalista, representante do sindicato.
// Cada ação chama a função de src/sim/r33/gente33.ts (fonte única, `src` + `fn` como pede o teste r31-acoes5) e só
// aparece com `exp33.gente` ligado (`when`). Montar o cartão só lê (peek33/cands33 não criam estado).

import { l, type L } from '../../data/world';
import {
  CREW33, FIX33, adoptFixed33, board33, boardLock33, ceo33, ceoLock33, courtFixed33, crew33, crewLock33, dirOf33, fireCeo33, fixLock33,
  fixed33, freeBranch33, gente33On, hireCeo33, hireCrew33, hireFirstBranchDir33, log33Of, peek33, seatBoard33, toggleBranchLine33, canHireBranchDir33,
  type Crew33, type Fixed33,
} from '../../sim/r33/gente33';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { CARDS5 } from '../r31/acoes5data';
import { ACTS_CAT5, LINES_CAT5, NUMS_CAT5 } from '../r31/acoes5cat';
import type { ActDef5, ActRes5, NumDef5 } from '../r31/acoes5model';

const done = (err: L | null, ok: L): ActRes5 => (err ? { text: err, bad: true } : { text: ok });
const M = 'sim/r33/gente33';

function A(label: L, fn: (...a: never[]) => unknown, name: string, home: string, when: (s: GameState) => boolean, call: (s: GameState) => L | null, ok: L, lock?: (s: GameState) => L | null): ActDef5 {
  return { label, kind: 'do', src: [M, name], fn, home, when: (s) => gente33On(s) && when(s), lock, run: (s) => done(call(s), ok), same: (s) => { call(s); } };
}
const crew = (k: Crew33, home: string): ActDef5 =>
  A(l(`Contratar ${CREW33[k].n.pt.toLowerCase()}`, `Hire a ${CREW33[k].n.en.toLowerCase()}`), hireCrew33, 'hireCrew33', home, (s) => !crew33(s, k), (s) => hireCrew33(s, k), fmtL(l('{n} contratado(a).', '{n} hired.'), { n: CREW33[k].n }), (s) => crewLock33(s, k));
const fix = (k: Fixed33, home: string, label: L): ActDef5 =>
  A(label, adoptFixed33, 'adoptFixed33', home, (s) => !fixed33(s, k), (s) => adoptFixed33(s, k), fmtL(l('{n}: agora acompanha você.', '{n}: now follows you.'), { n: FIX33[k].n }), (s) => fixLock33(s, k));

const ADD: Record<string, ActDef5> = {
  'g33.filialDir': A(l('Contratar diretor(a) de filial', 'Hire a branch director'), hireFirstBranchDir33, 'hireFirstBranchDir33', 'mapaparede', (s) => !!freeBranch33(s),
    hireFirstBranchDir33, l('A filial tem quem mande.', 'The branch has someone in charge.'), (s) => { const id = freeBranch33(s); return id ? canHireBranchDir33(s, id) : null; }),
  'g33.filialLinha': A(l('Trocar a linha da filial (ousado/conservador)', 'Switch the branch line (bold/conservative)'), toggleBranchLine33, 'toggleBranchLine33', 'mapaparede',
    (s) => Object.keys(peek33(s)?.br ?? {}).length > 0, toggleBranchLine33, l('Linha da filial trocada.', 'Branch line switched.')),
  'g33.ceo': A(l('Contratar CEO (você preside o conselho)', 'Hire a CEO (you chair the board)'), hireCeo33, 'hireCeo33', 'mesareuniao', (s) => !ceo33(s),
    (s) => hireCeo33(s), l('A empresa tem CEO; você preside o conselho.', 'The company has a CEO; you chair the board.'), ceoLock33),
  'g33.ceoFora': A(l('Dispensar o CEO', 'Dismiss the CEO'), fireCeo33, 'fireCeo33', 'mesareuniao', (s) => !!ceo33(s), (s) => fireCeo33(s), l('O CEO saiu; a delegação voltou a ser sua.', 'The CEO left; delegation is yours again.')),
  'g33.conselho': A(l('Instalar o conselho de acionistas', 'Seat the shareholders\' board'), seatBoard33, 'seatBoard33', 'mesareuniao', (s) => !board33(s),
    seatBoard33, l('Conselho instalado: reunião anual com votos.', 'Board seated: an annual meeting with votes.'), boardLock33),
  'g33.motorista': crew('driver', 'garagem'),
  'g33.seguranca': crew('guard', 'porta'),
  'g33.treinador': crew('trainer', 'espelho'),
  'g33.medico': crew('doctor', 'espelho'),
  'g33.fa': fix('fan', 'mural', l('Conhecer o(a) presidente do fã-clube', 'Meet the fan club president')),
  'g33.jornalista': fix('press', 'jornal', l('Ter um(a) jornalista que acompanha você', 'Get a journalist on your beat')),
  'g33.agrado': A(l('Dar uma exclusiva ao(à) jornalista', 'Give the journalist an exclusive'), courtFixed33, 'courtFixed33', 'jornal', (s) => !!fixed33(s, 'press'),
    (s) => courtFixed33(s, 'press'), l('Exclusiva dada: a relação melhorou.', 'Exclusive given: the relationship improved.')),
  'g33.sindicato': fix('union', 'quadrofunc', l('Receber o(a) representante do sindicato', 'Meet the union representative')),
};
Object.assign(ACTS_CAT5, ADD);

const NUM: Record<string, NumDef5> = {
  'g33.filiais': { label: l('Filiais com diretor(a)', 'Branches with a director'), val: (s) => {
    if (!gente33On(s) || !s.branches.length) return null;
    const n = s.branches.filter((b) => dirOf33(s, b.id)).length;
    return { value: `${n}/${s.branches.length}`, bar: n / s.branches.length };
  } },
  'g33.conselho': { label: l('Conselho', 'Board'), val: (s) => {
    const c = ceo33(s), b = board33(s);
    if (!gente33On(s) || (!c && !b)) return null;
    const v = [c ? fmtL(l('CEO {n}', 'CEO {n}'), { n: c.n }).pt : '', b ? fmtL(l('confiança {c}', 'confidence {c}'), { c: Math.round(b.conf) }).pt : ''].filter(Boolean).join(' · ');
    return { value: v, bar: b ? b.conf / 100 : undefined, tone: b && b.conf < 35 ? 'bad' : undefined };
  } },
};
Object.assign(NUMS_CAT5, NUM);
LINES_CAT5.g33 = (s) => (gente33On(s) ? log33Of(s).slice(0, 3).map(([, t]) => t) : []);

function put(card: string, acts: string[], nums: string[], lines?: string): void {
  const c = CARDS5[card];
  if (!c) return;
  for (const a of acts) if (!c.acts.includes(a)) c.acts.push(a);
  for (const n of nums) if (!c.nums.includes(n)) c.nums.push(n);
  if (lines && !c.lines) c.lines = lines;
}
put('mapaparede', ['g33.filialDir', 'g33.filialLinha'], ['g33.filiais']);
put('mesareuniao', ['g33.ceo', 'g33.ceoFora', 'g33.conselho'], ['g33.conselho'], 'g33');
put('garagem', ['g33.motorista'], []);
put('porta', ['g33.seguranca'], []);
put('espelho', ['g33.treinador', 'g33.medico'], []);
put('mural', ['g33.fa'], []);
put('jornal', ['g33.jornalista', 'g33.agrado'], []);
put('quadrofunc', ['g33.sindicato'], []);
