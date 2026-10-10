// Rodada 18 (talent18, K3) — EDUCAÇÃO MUSICAL: escolas por época (conservatório, Berklee 1945, El Sistema 1975,
// BRIT School 1991, LIPA 1996, academias de trainees 1996, School of Rock 1998, aulas online 2008) como fonte de
// talento e política cultural. O selo pode bancar BOLSAS (formandos em 3 anos chegam já conhecidos, grau 4, e
// com "primeira opção" — rival não fura), FUNDAR a própria escola (ingressos de mensalidade, prestígio institucional,
// formandos todo ano) e pôr um PROFESSOR famoso (você ou alguém do elenco: carreira de ensino — fama atrai alunos,
// o professor ganha paz e salário). Masterclass entra no menu de ações de pessoa.

import { clamp, Rng } from '../../core/rng';
import { GENRES, familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { registerAdvisorTip } from '../inbox18';
import { registerPersonAction } from '../personact18';
import { addStress } from '../stress17';
import type { GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { actOfPerson17 } from './love17';
import { addLead18, disc18 } from './discover18';

export interface School18 { id: string; real: string; alt: L; from: number; to: number; city: string; fams: FamilyId[]; usd: number; q: number; desc: L }
export const SCHOOLS18: School18[] = [
  { id: 'conserv', real: 'Juilliard', alt: l('Conservatório Real', 'Royal Conservatory'), from: 1905, to: 9999, city: 'new_york', fams: ['europe', 'blues_jazz', 'sacred'], usd: 2500, q: 9, desc: l('Clássico e jazz de excelência; formandos lêem tudo e tocam em qualquer orquestra.', 'Classical and jazz excellence; graduates read anything and play in any orchestra.') },
  { id: 'berklee', real: 'Berklee', alt: l('Escola de jazz da costa leste', 'East Coast jazz school'), from: 1945, to: 9999, city: 'boston', fams: ['blues_jazz', 'pop', 'rock', 'rnb'], usd: 3000, q: 7, desc: l('Jazz, depois pop e produção: fábrica de músicos de estúdio e compositores.', 'Jazz, later pop and production: a factory of session players and writers.') },
  { id: 'sistema', real: 'El Sistema', alt: l('Programa social de orquestras', 'Social orchestra program'), from: 1975, to: 9999, city: 'caracas', fams: ['europe', 'latin'], usd: 600, q: 6, desc: l('Orquestras para crianças pobres: barato, enorme impacto social e reputação.', 'Orchestras for poor kids: cheap, huge social impact and reputation.') },
  { id: 'brit', real: 'BRIT School', alt: l('Escola pública de artes cênicas', 'Public performing-arts school'), from: 1991, to: 9999, city: 'london', fams: ['pop', 'rnb', 'rock'], usd: 1500, q: 5, desc: l('Gratuita, forma cantoras pop com palco desde os 14 anos.', 'Free, trains pop singers with stage time from age 14.') },
  { id: 'lipa', real: 'LIPA', alt: l('Instituto de artes de Liverpool', 'Liverpool arts institute'), from: 1996, to: 9999, city: 'liverpool', fams: ['rock', 'pop', 'electronic'], usd: 2500, q: 5, desc: l('Banda, produção e negócio da música no mesmo prédio.', 'Band, production and music business under one roof.') },
  { id: 'trainee', real: 'SM/YG Trainee Academy', alt: l('Academia de trainees de idols', 'Idol trainee academy'), from: 1996, to: 9999, city: 'seoul', fams: ['pop', 'asia_me'], usd: 4000, q: 8, desc: l('Dança, voz e mídia por anos — disciplina férrea, contratos longos.', 'Dance, voice and media training for years — iron discipline, long contracts.') },
  { id: 'rockschool', real: 'School of Rock', alt: l('Escola de rock', 'Rock school'), from: 1998, to: 9999, city: 'philadelphia', fams: ['rock'], usd: 1200, q: 3, desc: l('Bandas de adolescentes tocando os clássicos ao vivo.', 'Teen bands playing the classics live.') },
  { id: 'online', real: 'Aulas online', alt: l('Aulas online', 'Online lessons'), from: 2008, to: 9999, city: '', fams: ['pop', 'hiphop', 'electronic', 'rock'], usd: 300, q: 2, desc: l('Tutoriais e cursos pela internet: muita gente, técnica irregular.', 'Tutorials and courses online: lots of people, uneven technique.') },
];
export const schoolName18 = (s: GameState, sc: School18): L => (s.config.realNames ? l(sc.real, sc.real) : sc.alt);
export const schoolsNow18 = (s: GameState) => SCHOOLS18.filter((x) => s.year >= x.from && s.year <= x.to);

export interface Own18 { lv: number; since: number; prest: number; teacher?: string; students: number; inc: number }
export interface School18State { bolsas: Record<string, number>; cohorts: { sc: string; y: number; n: number }[]; alumni: Record<string, string>; own?: Own18 }
declare module '../ext4' { interface Ext4 { school18: School18State } }
const fresh = (): School18State => ({ bolsas: {}, cohorts: [], alumni: {} });
registerExt4('school18', fresh);
export function school18(s: GameState): School18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.school18 ??= fresh()) as School18State;
  st.bolsas ??= {}; st.cohorts ??= []; st.alumni ??= {};
  return st;
}
export const bolsaCost18 = (s: GameState, sc: School18) => money(s, sc.usd);
export function setBolsas18(s: GameState, id: string, n: number): L | null {
  const sc = SCHOOLS18.find((x) => x.id === id);
  if (!sc || s.year < sc.from) return l('Escola indisponível nesta época.', 'School not available in this era.');
  school18(s).bolsas[id] = clamp(Math.round(n), 0, 10);
  return null;
}

export const OWN18: { name: L; cost: number; seats: number; desc: L }[] = [
  { name: l('—', '—'), cost: 0, seats: 0, desc: l('', '') },
  { name: l('Escola de música do selo', 'Label music school'), cost: 60000, seats: 60, desc: l('Salas de aula na sede: aulas de instrumento e canto.', 'Classrooms at the HQ: instrument and voice lessons.') },
  { name: l('Academia', 'Academy'), cost: 220000, seats: 200, desc: l('Prédio próprio, estúdio-escola, palco de formatura.', 'Its own building, teaching studio, graduation stage.') },
  { name: l('Conservatório', 'Conservatory'), cost: 700000, seats: 600, desc: l('Diploma reconhecido, bolsas para a cidade toda, referência nacional.', 'Recognized degree, scholarships city-wide, a national reference.') },
];
export function foundSchool18(s: GameState): L | null {
  const st = school18(s);
  const lv = (st.own?.lv ?? 0) + 1;
  const def = OWN18[lv];
  if (!def) return l('Já está no nível máximo.', 'Already at the top level.');
  const c = money(s, def.cost);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `venture:school18:${lv}`, -c, 'capex', `Escola: ${def.name.pt}`);
  st.own = st.own ? { ...st.own, lv } : { lv, since: s.year, prest: 20, students: 0, inc: 0 };
  emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 15 + lv * 10, visibility: 'public', tags: ['good', 'school', 'education'], src: 'school18', text: fmtL(l('{c} abre: {n}.', '{c} opens: {n}.'), { c: s.config.companyName, n: def.name }) });
  return null;
}
/** Pessoas que podem dar aulas: você e integrantes do seu elenco. */
export function teacherFame18(s: GameState, pid?: string): number {
  if (!pid) return 0;
  const a = actOfPerson17(s, pid);
  return a ? a.fame : s.persons[pid]?.isPlayer ? 30 : 10;
}
export function setTeacher18(s: GameState, pid?: string): L | null {
  const o = school18(s).own;
  if (!o) return l('Funde a escola primeiro.', 'Found the school first.');
  o.teacher = pid;
  if (pid) emitFact(s, { kind: 'statement', actors: [pid, 'player'], severity: 12, visibility: 'public', tags: ['good', 'school', 'teaching'], src: 'school18', text: fmtL(l('{p} passa a dar aulas na escola de {c}.', '{p} starts teaching at {c}\'s school.'), { p: s.persons[pid]?.name ?? '?', c: s.config.companyName }) });
  return null;
}
/** Matrículas e receita anuais estimadas (com porquê). */
export function schoolYield18(s: GameState): { students: number; rev: number; cost: number; why: L[] } {
  const o = school18(s).own;
  if (!o) return { students: 0, rev: 0, cost: 0, why: [] };
  const def = OWN18[o.lv];
  const tf = teacherFame18(s, o.teacher);
  const fill = clamp(0.35 + o.prest / 160 + tf / 200, 0.2, 1);
  const students = Math.round(def.seats * fill);
  const why = [fmtL(l('Prestígio {p} → ocupação {o}%', 'Prestige {p} → {o}% full'), { p: Math.round(o.prest), o: Math.round(fill * 100) })];
  if (o.teacher) why.push(fmtL(l('Professor famoso ({p}, fama {f}) atrai alunos', 'Famous teacher ({p}, fame {f}) draws students'), { p: s.persons[o.teacher]?.name ?? '?', f: Math.round(tf) }));
  return { students, rev: money(s, students * 900), cost: money(s, def.cost * 0.12 + (o.teacher ? 6000 : 0)), why };
}

const graduate = (s: GameState, r: Rng, fams: FamilyId[], q: number, deg: number, note: L, schoolId: string) => {
  const gs = GENRES.filter((g) => fams.includes(familyOf(g.id)) && g.born <= s.year);
  const a = spawnProceduralAct(s, r, { genre: gs.length ? r.pick(gs).id : undefined, formedYear: s.year, potential: clamp(r.normal(55 + q, 11), 25, 96) });
  addLead18(s, r, a, 'school', deg, 5, note);
  school18(s).alumni[a.id] = schoolId;
  return a;
};

registerSimHook('year', 'school18', (s) => {
  const st = school18(s);
  const r = Rng.fromSeed(`${s.config.seed}|school18|${s.year}`);
  // bolsas: pagas no ano, formam em 3
  for (const [id, n] of Object.entries(st.bolsas)) {
    const sc = SCHOOLS18.find((x) => x.id === id);
    if (!sc || !n) continue;
    post(s, `sch18bolsa:${id}`, -bolsaCost18(s, sc) * n, 'artist_dev', `Bolsas: ${schoolName18(s, sc).pt}`);
    st.cohorts.push({ sc: id, y: s.year + 3, n });
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + (sc.id === 'sistema' ? 1 : 0.5), 0, 100);
  }
  const due = st.cohorts.filter((c) => c.y <= s.year);
  st.cohorts = st.cohorts.filter((c) => c.y > s.year);
  const names: string[] = [];
  for (const c of due) {
    const sc = SCHOOLS18.find((x) => x.id === c.sc);
    if (!sc) continue;
    // nem todo bolsista vira artista: ~1 em 3 monta um ato
    const k = Math.max(c.n >= 2 ? 1 : 0, Math.round(c.n / 3 + r.float(-0.3, 0.3)));
    for (let i = 0; i < k; i++) names.push(graduate(s, r, sc.fams, sc.q, 4, fmtL(l('Bolsista do selo em {s}: primeira opção é sua.', 'Label scholar at {s}: first option is yours.'), { s: schoolName18(s, sc) }), sc.id).name);
  }
  if (names.length) notify(s, fmtL(l('Formatura dos seus bolsistas: {n}. Já conhecidos (grau 4) e sem rival na disputa.', 'Your scholars graduate: {n}. Already known (degree 4) and no rival in the race.'), { n: names.join(', ') }), 'good');
  // escola própria
  const o = st.own;
  if (o) {
    const y = schoolYield18(s);
    o.students = y.students;
    o.inc = y.rev - y.cost;
    post(s, 'sch18rev', y.rev, 'services', 'Escola: mensalidades');
    post(s, 'sch18cost', -y.cost, 'salaries', 'Escola: professores e prédio');
    o.prest = clamp(o.prest + 2 + o.lv + teacherFame18(s, o.teacher) / 25 - (s.year - o.since > 30 ? 1 : 0), 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + o.lv * 0.7, 0, 100);
    const n = Math.max(1, Math.round(o.lv * (0.6 + o.prest / 100)));
    const g0 = s.acts[playerActs(s)[0]]?.genre;
    const fams: FamilyId[] = g0 ? [familyOf(g0), 'pop'] : ['pop', 'rock'];
    for (let i = 0; i < n; i++) graduate(s, r, fams, 2 + o.lv * 2 + o.prest / 20, 3, l('Formando da sua escola.', 'Graduate of your school.'), 'own');
    if (o.teacher) { addStress(s, o.teacher, -6, l('Dar aulas', 'Teaching')); if (s.persons[o.teacher] && !s.persons[o.teacher].isPlayer) s.personalCash[o.teacher] = (s.personalCash[o.teacher] ?? 0) + money(s, 6000); }
  }
  // bolsistas não podem ser furados por rival: tira da disputa
  const d = disc18(s);
  for (const id of Object.keys(d.hot)) if (st.alumni[id]) delete d.hot[id];
});

registerPersonAction({
  id: 'masterclass18', label: l('Dar uma masterclass', 'Give a masterclass'), group: 'career', icon: 'pen', cooldown: 26,
  desc: l('Uma tarde ensinando alunos de música: fama com a nova geração, prestígio para a sua escola e um respiro para quem ensina.', 'An afternoon teaching music students: fame with the next generation, prestige for your school and a breather for the teacher.'),
  cost: () => ({ balls: 1 }),
  visible: (s, key) => key.startsWith('p:') && (!!s.persons[key.slice(2)]?.isPlayer || playerActs(s).some((id) => s.acts[id]?.members.includes(key.slice(2)))),
  run: (s, key) => {
    const pid = key.slice(2), a = actOfPerson17(s, pid), o = school18(s).own;
    if (a) a.fame = clamp(a.fame + 0.6, 0, 100);
    if (o) o.prest = clamp(o.prest + 3, 0, 100);
    addStress(s, pid, -4, l('Masterclass', 'Masterclass'));
    return { ok: true, text: fmtL(l('{p} deu uma masterclass lotada: fama +0,6{e}, estresse −4.', '{p} gave a packed masterclass: fame +0.6{e}, stress −4.'), { p: s.persons[pid]?.name ?? '?', e: o ? l(', prestígio da escola +3', ', school prestige +3') : '' }) };
  },
});

registerExplain('school18.yield', (s) => {
  const y = schoolYield18(s);
  if (!school18(s).own) return null;
  return { title: l('Escola do selo', 'Label school'), value: y.rev - y.cost, fmt: 'money', parts: [
    { label: l('Alunos', 'Students'), value: y.students, fmt: 'num' }, { label: l('Mensalidades', 'Tuition'), value: y.rev, fmt: 'money', tone: 'good' }, { label: l('Professores e prédio', 'Teachers and building'), value: -y.cost, fmt: 'money', tone: 'bad' },
    ...y.why.map((w) => ({ label: w }))], note: l('Formandos todo ano viram pistas conhecidas (grau 3).', 'Graduates every year become known leads (degree 3).') };
});
registerAdvisorTip('school18', (s) => {
  const st = school18(s);
  if (st.own || Object.values(st.bolsas).some(Boolean) || s.player.reputation.institutional > 40 || playerActs(s).length < 3) return [];
  return [{ id: 'school18-bolsa', level: 'info', cat: 'opportunity', score: 18, text: l('Bolsas numa escola de música formam talentos que já chegam seus.', 'Scholarships at a music school grow talent that arrives already yours.'), effect: l('Custo anual baixo; prestígio institucional; formandos em 3 anos.', 'Low yearly cost; institutional prestige; graduates in 3 years.'), goto: { area: 'talent18', tab: ['talent18', 'school'] } }];
});
