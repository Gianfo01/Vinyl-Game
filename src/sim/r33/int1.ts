// R33 · INT-1 — interiores próprios dos prédios que emprestavam outro (escola, fábrica, museu, plataforma, agência de
// turnê, filial) e ações no lugar para hotel, escritório, apartamentos e sede rival. Tudo atrás de `exp33.int1`
// (desligado no código): sem ele o jogo é idêntico ao da 32. Este módulo só LÊ o que os sistemas já guardam (linhas dos
// painéis) e abre ganchos para as outras frentes; as ações do hotel/apartamentos/sede rival usam sistemas que já existem
// (estresse, radar, conhecer) e não sorteiam nada do jogo (hash estável), então goldens não mudam nem ligado.

import { cityById, l, type L } from '../../data/world';
import { BRANCH_LEVELS } from '../../data/rules';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { cashWhy20, freeCash20 } from '../oblig20';
import { registerSwitch, sw } from '../r31/switches';
import type { BKind, Bld18 } from '../sys/campus18';
import { meetHere31, scoutHere31 } from '../sys/gente31';
import { INT33, cdLeft27, cdSet27, npcName27, type IntK33, type PAct27, type Person27, type Place27 } from '../sys/place27';
import { MATERIAL_NAMES, PLANT_LEVELS, mainMaterial } from '../sys/industry/supply';
import { OWN18 } from '../sys/school18';
import { WING18 } from '../sys/relics18';

registerSwitch({
  id: 'exp33.int1', def: false, scope: 'game',
  desc: l('R33 · interiores próprios (escola, fábrica de discos, museu, plataforma, agência, filial) e ações no hotel, escritório, apartamentos e sede rival.',
    'R33 · own interiors (school, pressing plant, museum, platform, booking agency, branch) and actions at the hotel, offices, apartments and rival HQ.'),
});
export const int1On = (s: GameState): boolean => sw<boolean>(s, 'exp33.int1');

export const INT33_KINDS: readonly IntK33[] = ['school', 'plant', 'museum', 'platform', 'agency', 'branch'];
export const isInt33 = (k: string): k is IntK33 => (INT33_KINDS as readonly string[]).includes(k);
/** Lugares de terceiros que ganham ações e a cena que preenche a área (não têm interior novo, só ações). */
export const ACT33_KINDS = ['hotel', 'office', 'apartments', 'label'] as const;

/** Que interior um prédio seu usa (a sede tem a tela própria; rádio/imprensa/estúdio/casa de shows já têm o seu). */
export function ownKind33(kind: BKind): IntK33 | null {
  switch (kind) {
    case 'school': return 'school';
    case 'plant': return 'plant';
    case 'museum': return 'museum';
    case 'platform': return 'platform';
    case 'booking': return 'agency';
    case 'branch': case 'office': return 'branch';
    default: return null;
  }
}

/** Ganchos para as outras frentes: ações de um interior próprio (fábrica: prensar para terceiros — CATÁLOGO; museu: ingresso;
 *  plataforma: curadoria — GESTÃO). `acts` lista, `run` executa (devolve null se a ação não é sua). O painel só mostra e chama. */
export const OWNACT33: {
  acts?: (s: GameState, k: IntK33, bldId: string) => PAct27[];
  run?: (s: GameState, k: IntK33, bldId: string, id: string) => { ok: boolean; text: L } | null;
} = {};

// ---------------------------------------------------------------- leitura segura (ler não cria estado)

type X4 = Record<string, unknown>;
const x4 = (s: GameState): X4 => (s.x4 as unknown as X4) ?? {};
const hash = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x / 4294967296; };
const usd = (s: GameState, c: number): string => `$${Math.round(money(s, c) / 100).toLocaleString('en-US')}`;
const pct = (v: number): string => `${Math.round(v * 100)}%`;

interface IndLite { matPrice: Record<string, number>; plants: { id: string; city: string; level: number; capacity: number; contractUnits: number }[]; orders: { ready: number; own: boolean; units: number }[]; defectsYear: number }
interface VenLite { list: { id: string; kind: string; name: string; rep: number; level: number; subs?: number; payout?: number; deals?: string[]; clients?: { actId: string; rate: number }[]; pl: { rev: number; cost: number }[] }[] }
const ind = (s: GameState): IndLite | undefined => x4(s).industry as IndLite | undefined;
const ven = (s: GameState): VenLite | undefined => x4(s).ventures9 as VenLite | undefined;
const venOf = (s: GameState, bldId: string) => ven(s)?.list.find((v) => `v:${v.id}` === bldId);

/** Os números do que a fábrica mostra: material do ano, preço sobre o custo base, fila, defeitos. */
export function plantFacts33(s: GameState): { mat: L; price: number; plants: number; cap: number; queue: number; defects: number; third: number; period: L } {
  const st = ind(s), m = mainMaterial(s.year);
  const cap = (st?.plants ?? []).reduce((t, p) => t + p.capacity, 0);
  return { mat: MATERIAL_NAMES[m], price: st?.matPrice?.[m] ?? 1, plants: st?.plants.length ?? 0, cap, queue: (st?.orders ?? []).filter((o) => o.ready > s.week).length,
    defects: st?.defectsYear ?? 0, third: (st?.plants ?? []).reduce((t, p) => t + p.contractUnits, 0), period: pressEra33(s.year) };
}
/** Como se prensa em cada época (o que a máquina da cena mostra). */
export function pressEra33(year: number): L {
  return year < 1920 ? l('prensa manual de goma-laca, a vapor', 'steam-driven hand press for shellac')
    : year < 1950 ? l('prensa hidráulica de 78 rpm (goma-laca)', 'hydraulic 78 rpm press (shellac)')
    : year < 1970 ? l('prensa de vinil (LP e compacto)', 'vinyl press (LP and single)')
    : year < 1990 ? l('prensa automática de vinil e duplicadora de fitas', 'automatic vinyl press and tape duplicator')
    : year < 2010 ? l('injeção de CD em sala limpa', 'CD injection moulding in a clean room')
    : l('prensas de vinil restauradas com controle de qualidade por robô', 'refurbished vinyl presses with robot quality control');
}

// ---------------------------------------------------------------- linhas dos painéis (só leitura)

/** Linhas de informação de um objeto do interior próprio. `bldId` = id do prédio (`school`, `museum`, `pl:…`, `v:…`, `br:…`, `of:…`). */
export function int1Lines(s: GameState, k: IntK33, key: string, bldId: string): L[] {
  const out: L[] = [];
  const name = (id?: string) => (id ? s.persons[id]?.name ?? '?' : '?');
  if (k === 'school') {
    const so = (x4(s).school18 as { own?: { lv: number; students: number; prest: number; teacher?: string; inc: number }; cohorts?: { sc: string; y: number; n: number }[] } | undefined);
    const own = so?.own;
    if (key === 'board') {
      if (own) out.push(fmtL(l('{n}: {s} aluno(s), prestígio {p}.', '{n}: {s} student(s), prestige {p}.'), { n: OWN18[own.lv]?.name ?? l('Escola', 'School'), s: own.students, p: Math.round(own.prest) }));
      out.push(own?.teacher ? fmtL(l('Professor: {p}.', 'Teacher: {p}.'), { p: name(own.teacher) }) : l('Sem professor famoso: ponha você ou alguém do elenco para dar aula na tela da escola.', 'No famous teacher: put yourself or someone from the roster to teach on the school screen.'));
    } else if (key === 'class') {
      const cs = (so?.cohorts ?? []).slice(-3).reverse();
      for (const c of cs) out.push(fmtL(l('Turma de {y}: {n} formando(s).', 'Class of {y}: {n} graduate(s).'), { y: c.y, n: c.n }));
      if (!cs.length) out.push(l('Nenhuma turma se formou ainda: a primeira sai em três anos.', 'No class has graduated yet: the first one comes out in three years.'));
    } else if (key === 'piano') out.push(l('O piano de aula: é onde o professor ouve a audição dos alunos antes de cada formatura.', 'The teaching piano: where the teacher hears the students\' audition before each graduation.'));
    else if (key === 'rack') out.push(s.year < 1950 ? l('Instrumentos de orquestra e violões de estudo, emprestados aos alunos.', 'Orchestra instruments and study guitars, lent to students.') : l('Guitarras, baixos e teclados de estudo, emprestados aos alunos.', 'Study guitars, basses and keyboards, lent to students.'));
    if (own && key === 'board') out.push(fmtL(l('Mensalidades: {v} por ano.', 'Tuition: {v} a year.'), { v: usd(s, own.inc) }));
  } else if (k === 'plant') {
    const f = plantFacts33(s), p = ind(s)?.plants.find((x) => `pl:${x.id}` === bldId);
    if (key === 'press') {
      out.push(f.period);
      if (p) out.push(fmtL(l('{n}: capacidade {c} cópias por semana.', '{n}: capacity {c} copies a week.'), { n: PLANT_LEVELS[p.level - 1]?.name ?? l('Fábrica', 'Plant'), c: p.capacity.toLocaleString('en-US') }));
      out.push(fmtL(l('Fila de prensagem: {n} pedido(s) esperando.', 'Pressing queue: {n} order(s) waiting.'), { n: f.queue }));
    } else if (key === 'mat') {
      out.push(fmtL(l('{m}: custo ×{p} sobre o base.', '{m}: cost ×{p} over base.'), { m: f.mat, p: f.price.toFixed(2) }));
      out.push(l('Cada fábrica própria baixa o custo da prensagem dos seus discos (até 35%).', 'Each own plant lowers the pressing cost of your records (up to 35%).'));
    } else if (key === 'qc') {
      out.push(fmtL(l('Cópias defeituosas este ano: {n}.', 'Defective copies this year: {n}.'), { n: f.defects.toLocaleString('en-US') }));
      out.push(l('Fábrica própria e controle de qualidade reduzem a taxa de defeito dos seus lançamentos.', 'An own plant and quality control lower the defect rate of your releases.'));
    } else if (key === 'ship') {
      out.push(fmtL(l('Prensagem para terceiros: {n} cópias no mês, com a capacidade ociosa.', 'Pressing for third parties: {n} copies this month, using idle capacity.'), { n: (p?.contractUnits ?? f.third).toLocaleString('en-US') }));
    }
  } else if (k === 'museum') {
    const w = x4(s).relics18 as { wing?: number; vis?: number; inc?: number } | undefined, wing = w?.wing ?? 0;
    if (key === 'ticket') {
      out.push(WING18[wing]?.name ?? WING18[0].name);
      out.push(WING18[wing]?.desc ?? WING18[0].desc);
      if (w?.vis) out.push(fmtL(l('Visitantes por ano: {v}; ingresso médio {t}.', 'Visitors a year: {v}; average ticket {t}.'), { v: Math.round(w.vis).toLocaleString('en-US'), t: usd(s, (w.inc ?? 0) / Math.max(1, w.vis)) }));
    } else if (key === 'gold') {
      const rs = Object.values(s.releases).filter((r) => r.owner === 'player' && r.peak > 0 && r.peak <= 10).sort((a, b) => a.peak - b.peak || b.week - a.week).slice(0, 6);
      for (const r of rs) out.push(fmtL(l('"{t}" — {a} (#{p})', '"{t}" — {a} (#{p})'), { t: r.title, a: s.acts[r.actId]?.name ?? '?', p: r.peak }));
      if (!rs.length) out.push(l('Nenhum disco seu entre os dez primeiros ainda: a parede espera o primeiro.', 'None of your records in the top ten yet: the wall awaits the first.'));
    } else if (key === 'cases') {
      const list = ((x4(s).relics9 as { list?: { st: string; ex?: boolean; ln?: boolean; brw?: boolean; v: number; n: L }[] } | undefined)?.list ?? [])
        .filter((r) => (r.st === 'player' && r.ex && !r.ln) || r.brw).sort((a, b) => b.v - a.v).slice(0, 6);
      for (const r of list) out.push(r.n);
      if (!list.length) out.push(l('Vitrines vazias: exponha relíquias suas na tela de Lendas.', 'Empty cases: put your relics on show on the Legends screen.'));
    }
  } else if (k === 'platform') {
    const v = venOf(s, bldId);
    if (key === 'rack') out.push(fmtL(l('{n} assinantes nos servidores.', '{n} subscribers on the servers.'), { n: Math.round(v?.subs ?? 0).toLocaleString('en-US') }));
    else if (key === 'curate') {
      const ds = (v?.deals ?? []).map((id) => s.labels[id]?.name).filter((x): x is string => !!x);
      out.push(fmtL(l('Repasse às gravadoras: {p}.', 'Payout to the labels: {p}.'), { p: pct(v?.payout ?? 0.65) }));
      out.push(ds.length ? fmtL(l('Catálogos licenciados: {d}.', 'Licensed catalogues: {d}.'), { d: ds.join(', ') }) : l('Nenhum catálogo licenciado: a curadoria só tem o seu.', 'No licensed catalogue: curation only has yours.'));
    } else if (key === 'chart') {
      const last = v?.pl[v.pl.length - 1];
      out.push(last ? fmtL(l('Último mês: receita {r}, custo {c}.', 'Last month: revenue {r}, cost {c}.'), { r: usd(s, last.rev), c: usd(s, last.cost) }) : l('Ainda sem fechamento de mês.', 'No month closed yet.'));
    }
  } else if (k === 'agency') {
    const v = venOf(s, bldId), cs = v?.clients ?? [];
    if (key === 'map') {
      for (const c of cs.slice(0, 6)) out.push(fmtL(l('{a} — comissão {r}.', '{a} — commission {r}.'), { a: s.acts[c.actId]?.name ?? '?', r: pct(c.rate) }));
      if (!cs.length) out.push(l('Nenhum cliente na carteira: o mapa está limpo.', 'No client on the books: the map is clear.'));
    } else if (key === 'phones') out.push(fmtL(l('Reputação da agência: {r}/100; {n} cliente(s).', 'Agency reputation: {r}/100; {n} client(s).'), { r: Math.round(v?.rep ?? 0), n: cs.length }));
    else if (key === 'wall') {
      const last = v?.pl[v.pl.length - 1];
      out.push(last ? fmtL(l('Comissões do último mês: {r}.', 'Commissions last month: {r}.'), { r: usd(s, last.rev) }) : l('Ainda sem comissões fechadas.', 'No commissions closed yet.'));
    }
  } else if (k === 'branch') {
    const b = (s.branches ?? []).find((x) => `br:${x.id}` === bldId);
    if (b) {
      const lv = BRANCH_LEVELS[b.level];
      out.push(fmtL(l('Filial em {c}: {n}.', 'Branch in {c}: {n}.'), { c: cityById[b.city]?.name ?? l(b.city, b.city), n: lv?.name ?? l('Filial', 'Branch') }));
    } else out.push(l('Escritório próprio no exterior: abre portas para artistas e contratos da região.', 'Own office abroad: opens doors to the region\'s acts and deals.'));
    if (key === 'clocks') out.push(l('Os relógios mostram a hora das praças onde o selo tem gente.', 'The clocks show the time in the cities where the label has people.'));
  }
  return out;
}

/** Quem está no prédio: a equipe de verdade da escola/agência (professor, cliente) e funcionários com nome estável (hash, sem sorteio). */
export function crew33(s: GameState, b: Pick<Bld18, 'id'>, k: IntK33): Person27[] {
  const npc = (role: L, i: number): Person27 => ({ name: npcName27(s, `int1|${b.id}|${k}|${i}`), role, staff: true });
  const out: Person27[] = [];
  if (k === 'school') {
    const so = (x4(s).school18 as { own?: { teacher?: string; students: number } } | undefined)?.own;
    const t = so?.teacher ? s.persons[so.teacher] : undefined;
    if (t) out.push({ name: t.name, role: l('Professor(a)', 'Teacher'), pid: t.id, staff: true });
    else out.push(npc(l('Professor(a)', 'Teacher'), 0));
    const n = Math.min(3, Math.ceil((so?.students ?? 0) / 20));
    for (let i = 0; i < n; i++) out.push({ name: npcName27(s, `int1|${b.id}|aluno|${i}`), role: l('Aluno(a)', 'Student') });
  } else if (k === 'plant') out.push(npc(l('Operador(a) da prensa', 'Press operator'), 0), npc(l('Controle de qualidade', 'Quality control'), 1));
  else if (k === 'museum') out.push(npc(l('Guia do museu', 'Museum guide'), 0), npc(l('Segurança', 'Security'), 1));
  else if (k === 'platform') out.push(npc(l('Curador(a) de listas', 'Playlist curator'), 0), npc(l('Engenheiro(a) de servidores', 'Server engineer'), 1));
  else if (k === 'agency') {
    out.push(npc(l('Agente de turnê', 'Tour booker'), 0));
    const c = venOf(s, b.id)?.clients?.[0], a = c ? s.acts[c.actId] : undefined;
    if (a && a.members[0] && s.persons[a.members[0]]) out.push({ name: s.persons[a.members[0]].name, role: l('Cliente (na agência)', 'Client (at the agency)'), pid: a.members[0], actId: a.id, mine: a.owner === 'player' });
  } else out.push(npc(l('Gerente da filial', 'Branch manager'), 0), npc(l('Recepcionista', 'Receptionist'), 1));
  return out;
}

// ---------------------------------------------------------------- ações no lugar: hotel, escritório, apartamentos, sede rival

const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased);
const SUITE_COST = 400;
const chosen = (s: GameState, actId?: string): Act | undefined => { const m = mine(s); return (actId ? m.find((x) => x.id === actId) : undefined) ?? m[0]; };
/** Artista de fora que ensaia na cidade e que você ainda não tem no radar (estável por semana e lote: sem sorteio do jogo). */
function wallAct(s: GameState, lotKey: string): Act | undefined {
  const xs = Object.values(s.acts).filter((a) => a.city === s.config.homeCity && a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && !a.deceased && !s.knowledge[a.id]);
  if (!xs.length) return undefined;
  return xs.sort((a, b) => (a.id < b.id ? -1 : 1))[Math.floor(hash(`${s.config.seed}|int1|wall|${lotKey}|${s.week}`) * xs.length)];
}
const rivalOf = (s: GameState, owner?: string) => (owner ? Object.values(s.labels).find((y) => y.name === owner) : undefined);

function actsFor33(s: GameState, p: Pick<Place27, 'k' | 'id'> & Partial<Pick<Place27, 'lot' | 'owner'>>, actId?: string): PAct27[] {
  if (!int1On(s)) return [];
  const out: PAct27[] = [];
  const a = chosen(s, actId);
  if (p.k === 'hotel') {
    const c = money(s, SUITE_COST), cdw = a ? cdLeft27(s, `ht:${a.id}`) : 0;
    out.push({ id: 'suite', act: true, label: l('Hospedar um artista seu na suíte', 'Put one of your acts up in the suite'), desc: l('Uma semana de descanso longe da estrada: o estresse de cada integrante cai.', 'A week of rest away from the road: each member\'s stress drops.'), cost: c,
      dis: !a ? l('Você não tem artista ativo no elenco.', 'You have no active act on the roster.') : cdw ? l('Já descansaram aqui há pouco.', 'They rested here recently.') : freeCash20(s) < c ? cashWhy20(s, c, l('Caixa insuficiente.', 'Not enough cash.')) : undefined });
  } else if (p.k === 'apartments') {
    const w = wallAct(s, p.id), cdw = cdLeft27(s, `ap:${p.id}`);
    out.push({ id: 'wall', label: l('Ouvir o ensaio pela parede', 'Listen to rehearsal through the wall'), desc: l('Um vizinho ensaia: se for bom, o artista entra no seu radar.', 'A neighbour is rehearsing: if they are good, the act goes on your radar.'),
      dis: cdw ? l('Já passou por aqui nesta semana.', 'You were here this week already.') : !w ? l('Ninguém ensaiando que você ainda não conheça.', 'Nobody rehearsing that you do not know yet.') : undefined });
  } else if (p.k === 'label') {
    const rv = rivalOf(s, p.owner), key = rv?.leaderId ? `l:${rv.leaderId}` : undefined;
    out.push({ id: 'lunch', label: l('Almoçar com o CEO rival', 'Lunch with the rival CEO'), desc: l('Vocês se conhecem: abre a conversa de sociedade e compra.', 'You get acquainted: opens the partnership and buyout talk.'),
      dis: !key ? l('O CEO deste selo não recebe visitas.', 'This label\'s CEO takes no visitors.') : undefined });
    const rost = rv?.roster.map((id) => s.acts[id]).find((x) => x && !s.knowledge[x.id] && x.members.some((m) => s.persons[m]));
    out.push({ id: 'demo', label: l('Ouvir a fita demo na recepção', 'Listen to the demo tape at reception'), desc: l('A recepção toca a demo de um artista deles: bom sinal e ele entra no seu radar.', 'Reception plays a demo by one of their acts: if it is good, the act goes on your radar.'),
      dis: rost ? undefined : l('Nenhum artista deles fora do seu radar.', 'None of their acts outside your radar.') });
  }
  return out;
}

function runFor33(s: GameState, p: Pick<Place27, 'k' | 'id' | 'name'> & Partial<Pick<Place27, 'lot' | 'owner'>>, id: string, actId?: string): { ok: boolean; text: L } | null {
  if (!int1On(s)) return null;
  if (p.k === 'hotel' && id === 'suite') {
    const a = chosen(s, actId)!, c = money(s, SUITE_COST);
    post(s, `int1:suite:${a.id}:${s.week}`, -c, 'marketing', `Suíte: ${a.name}`);
    cdSet27(s, `ht:${a.id}`, 8);
    for (const m of a.members) addStress(s, m, -4, l('Semana de descanso no hotel', 'A week of rest at the hotel'));
    return { ok: true, text: fmtL(l('{a} descansou em {p}: menos estresse.', '{a} rested at {p}: less stress.'), { a: a.name, p: p.name }) };
  }
  if (p.k === 'apartments' && id === 'wall') {
    const w = wallAct(s, p.id);
    if (!w) return { ok: false, text: l('Ninguém ensaiando agora.', 'Nobody rehearsing now.') };
    cdSet27(s, `ap:${p.id}`, 1);
    return scoutHere31(s, w.id);
  }
  if (p.k === 'label' && id === 'lunch') {
    const rv = rivalOf(s, p.owner);
    return rv?.leaderId ? meetHere31(s, `l:${rv.leaderId}`) : { ok: false, text: l('O CEO não recebe.', 'The CEO takes no visitors.') };
  }
  if (p.k === 'label' && id === 'demo') {
    const rv = rivalOf(s, p.owner), a = rv?.roster.map((x) => s.acts[x]).find((x) => x && !s.knowledge[x.id]);
    return a ? scoutHere31(s, a.id) : { ok: false, text: l('Nada novo na recepção.', 'Nothing new at reception.') };
  }
  return null;
}

INT33.acts = actsFor33;
INT33.run = runFor33;
