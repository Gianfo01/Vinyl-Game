// Rodada 12 — vida pessoal que cruza com a carreira. (1) Rotinas: cuidados repetitivos (academia, terapia,
// família, encontros, hobby, prática) viram configurações "sempre / quando precisar / desligado" que rodam
// no fim do mês com o tempo livre que sobrou, com custo e efeito no relatório — o jogador só decide o que
// muda a história. (2) Eventos que misturam vida e selo (entram no sorteio de lifeevents10): o filho que
// quer herdar mas rejeita sua estratégia, o romance com alguém do elenco (conflito de interesse), a venda
// das fitas-mestras que salvaria suas finanças e o que o herdeiro faz quando assume.

import { clamp, hashString, Rng } from '../../core/rng';
import { formatMoney } from '../../core/money';
import { l, type L } from '../../data/world';
import { endContract } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { arcAdd, mastersKept, mastersSold } from './arcs12';
import { energyLeft, familyTime, goOnDate, gym, hobby, life, practice, therapy, playerAct, HOBBIES, type HobbyId } from './life';
import { names, type Def, type Env, type LeCtx } from './lifeevents10';
import { C, EVENTS } from './lifeevents10/data';
import { ownerOf } from './people/owner';
import { vices } from './vices';

export type RId = 'gym' | 'therapy' | 'family' | 'date' | 'hobby' | 'practice';
export type RMode = 'off' | 'need' | 'always';
export type Vision = 'hits' | 'art' | 'expand' | 'cashout';
export interface HeirPlan { kid: number; name: string; vision: Vision; stance: 'groomed' | 'testing' | 'tested' | 'refused'; y: number }
export interface Life12 {
  rt: Partial<Record<RId, RMode>>;
  hobby: HobbyId;
  rep?: { y: number; m: number; done: L[]; skip: L[]; w: number; st: number; h: number };
  plan?: HeirPlan;
  coi?: { pid: string; act: string; since: number; fw?: 1 };
  gen: number;
  log: { y: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { life12: Life12 } }
const fresh = (): Life12 => ({ rt: {}, hobby: 'records', gen: 0, log: [] });
registerExt4('life12', fresh);
export function life12(s: GameState): Life12 {
  const x = s.x4 as unknown as { life12?: Life12 };
  x.life12 ??= fresh();
  const st = x.life12;
  st.rt ??= {}; st.log ??= []; st.gen ??= 0; st.hobby ??= 'records';
  return st;
}
const logL = (s: GameState, t: L) => { const st = life12(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 30) st.log.length = 30; };

// ---------------------------------------------------------------- rotinas

export const ROUTINES: { id: RId; name: L; need: L; cost: L }[] = [
  { id: 'therapy', name: l('Terapia', 'Therapy'), need: l('quando o estresse passa de 55', 'when stress is above 55'), cost: l('$300 e 1 tempo · −15 estresse', '$300 and 1 slot · −15 stress') },
  { id: 'gym', name: l('Academia', 'Gym'), need: l('quando a saúde cai abaixo de 75', 'when health drops below 75'), cost: l('$60 e 1 tempo · +3 saúde, −4 estresse', '$60 and 1 slot · +3 health, −4 stress') },
  { id: 'date', name: l('Jantar a dois', 'Dinner date'), need: l('quando faz mais de um mês sem programa', 'when it has been over a month'), cost: l('$150 e 1 tempo · afinidade do par', '$150 and 1 slot · partner affinity') },
  { id: 'family', name: l('Tempo em família', 'Family time'), need: l('quando o vínculo com filhos/par cai abaixo de 60', 'when the bond with kids/partner falls below 60'), cost: l('1 tempo · vínculo +10, −8 estresse', '1 slot · bond +10, −8 stress') },
  { id: 'hobby', name: l('Hobby', 'Hobby'), need: l('quando o estresse passa de 40', 'when stress is above 40'), cost: l('custo do hobby e 1 tempo', 'hobby cost and 1 slot') },
  { id: 'practice', name: l('Praticar o instrumento', 'Practice your instrument'), need: l('quando você toca numa banda', 'when you play in a band'), cost: l('1 tempo · técnica', '1 slot · technique') },
];

function needs(s: GameState, id: RId): boolean {
  const o = ownerOf(s);
  const L0 = life(s);
  const pt = L0.partner;
  switch (id) {
    case 'therapy': return o.stress > 55;
    case 'gym': return o.health < 75;
    case 'date': return !!pt && s.week - pt.lastDate > 4;
    case 'family': return (!!pt && pt.affinity < 60) || Object.values(L0.kidsX).some((k) => k.bond < 60);
    case 'hobby': return o.stress > 40;
    case 'practice': return !!playerAct(s);
  }
}

export function setRoutine(s: GameState, id: RId, m: RMode): void { life12(s).rt[id] = m; }

/** Roda as rotinas ligadas com o tempo livre que sobrou no mês (testável). */
export function runRoutines(s: GameState): NonNullable<Life12['rep']> {
  const st = life12(s);
  const o = ownerOf(s);
  const w0 = o.wealth; const st0 = o.stress; const h0 = o.health;
  const done: L[] = []; const skip: L[] = [];
  const r = Rng.fromSeed(`life12rt:${s.config.seed}:${s.year}:${s.month}`);
  for (const R of ROUTINES) {
    const m = st.rt[R.id] ?? 'off';
    if (m === 'off' || (m === 'need' && !needs(s, R.id))) continue;
    if (energyLeft(s) < 1) { skip.push(fmtL(l('{n}: sem tempo livre', '{n}: no free time left'), { n: R.name })); continue; }
    const e = R.id === 'gym' ? gym(s) : R.id === 'therapy' ? therapy(s) : R.id === 'family' ? familyTime(s) : R.id === 'date' ? goOnDate(s, r, 'dinner') : R.id === 'hobby' ? hobby(s, st.hobby) : practice(s);
    if (e) skip.push(fmtL(l('{n}: {e}', '{n}: {e}'), { n: R.name, e }));
    else done.push(R.id === 'hobby' ? HOBBIES.find((x) => x.id === st.hobby)?.name ?? R.name : R.name);
  }
  st.rep = { y: s.year, m: s.month, done, skip, w: o.wealth - w0, st: Math.round(o.stress - st0), h: Math.round(o.health - h0) };
  return st.rep;
}

// ---------------------------------------------------------------- eventos que cruzam vida e selo

export const VISION_TXT: Record<Vision, [L, L]> = {
  hits: [l('trocar a paciência com artistas por hits rápidos, jingles e trilhas', 'trade patience with artists for quick hits, jingles and soundtracks'), l('Hits acima de tudo', 'Hits above all')],
  art: [l('virar uma casa só de discos de prestígio, mesmo vendendo menos', 'become a prestige-only house, even selling less'), l('Só prestígio', 'Prestige only')],
  expand: [l('abrir escritórios fora e crescer a qualquer custo', 'open offices abroad and grow at any cost'), l('Crescer a qualquer custo', 'Growth at any cost')],
  cashout: [l('vender uma fatia para uma major e viver do catálogo', 'sell a stake to a major and live off the catalog'), l('Vender e viver de catálogo', 'Sell and live off the catalog')],
};
const VIS: Vision[] = ['hits', 'art', 'expand', 'cashout'];
export const visionOf = (s: GameState, name: string): Vision => VIS[hashString(`${s.config.seed}|vision|${name}`) % 4];

const adultKid = (e: Env) => {
  const ks = e.o.kids.map((k, i) => ({ k, i })).filter((x) => e.year - x.k.born >= 20 && x.k.aptitude >= 35).sort((a, b) => b.k.aptitude - a.k.aptitude);
  return ks.length ? { kid: ks[0].i } : null;
};
const fmtM = (s: GameState, real: number): L => ({ pt: formatMoney(money(s, real), 'pt-BR'), en: formatMoney(money(s, real), 'en-US') });
const kidName = (s: GameState, c: LeCtx) => ownerOf(s).kids[c.kid ?? -1]?.name ?? '';
const testOk = (s: GameState, c: LeCtx) => (ownerOf(s).kids[c.kid ?? -1]?.aptitude ?? 0) + (hashString(`${s.config.seed}|test|${kidName(s, c)}`) % 40) >= 75;

/** Discos antigos do selo que uma major compraria (mais velhos primeiro, até 8). */
export function oldMasters(s: GameState): string[] {
  return Object.values(s.releases).filter((r) => r.owner === 'player' && !r.hist && s.year - r.year >= 5 && !s.acts[r.actId]?.playerBand).sort((a, b) => a.week - b.week).slice(0, 8).map((r) => r.id);
}
const mastersPrice = (n: number) => 25000 + n * 6000;
const bigLabel = (s: GameState) => Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash)[0];
const coiAct = (s: GameState): Act | undefined => {
  const pid = life(s).partner?.personId;
  return pid ? Object.values(s.acts).find((a) => a.owner === 'player' && !a.playerBand && a.members.includes(pid) && a.status !== 'retired' && a.status !== 'split') : undefined;
};

const DEFS: Def[] = [
  { id: 'r12_heir_vision', name: l('O herdeiro tem outros planos', 'The heir has other plans'), cool: 60,
    w: (e) => (e.age >= 45 && !life12(e.s).plan && adultKid(e) ? 1.6 : 0), pick: (e) => adultKid(e),
    text: (s, c) => fmtL(l('{k} quer assumir o selo um dia — mas acha sua estratégia ultrapassada. O plano: {v}. Os artistas que você cuidou por anos ouvem a conversa no corredor.', '{k} wants to run the label one day — but calls your strategy outdated. The plan: {v}. The acts you nurtured for years overhear it in the hallway.'), { ...names(s, c), v: VISION_TXT[visionOf(s, kidName(s, c))][0] }),
    def: 'refuse', ch: [
      C('groom', 'Preparar {k} como herdeiro(a), aceitando a visão', 'Groom {k} as heir, accepting the vision', { kidBond: 12, st: -2 }, '{k} vira herdeiro(a) designado(a). A visão entra em vigor no dia em que assumir.', '{k} becomes your designated heir. The vision takes effect the day they take over.',
        { energy: 1, dyn: (s, c) => { const k = kidName(s, c); life12(s).plan = { kid: c.kid ?? 0, name: k, vision: visionOf(s, k), stance: 'groomed', y: s.year }; ownerOf(s).heir = `kid:${c.kid}`; return {}; } }),
      C('test', 'Dar a {k} um selo de teste por um ano', 'Give {k} a test imprint for a year', { cash: -15000, kidBond: 6 }, '{k} ganha uma sala, um orçamento e um ano para provar a ideia.', '{k} gets an office, a budget and a year to prove the idea.',
        { nt: ['Desfecho em 12 meses; depende da aptidão.', 'Outcome in 12 months; depends on aptitude.'], next: { ev: 'r12_heir_test', m: 12 }, dyn: (s, c) => { const k = kidName(s, c); life12(s).plan = { kid: c.kid ?? 0, name: k, vision: visionOf(s, k), stance: 'testing', y: s.year }; return {}; } }),
      C('refuse', 'Do meu jeito, enquanto eu estiver aqui', 'My way, while I am here', { kidBond: -15, st: 3 }, '{k} sai batendo a porta. Se um dia herdar, herda com mágoa.', '{k} storms out. If they ever inherit, they inherit with a grudge.',
        { dyn: (s, c) => { const k = kidName(s, c); life12(s).plan = { kid: c.kid ?? 0, name: k, vision: visionOf(s, k), stance: 'refused', y: s.year }; return {}; } }),
    ] },
  { id: 'r12_heir_test', name: l('O ano de teste', 'The test year'), cool: 1, chain: true, w: () => 0,
    text: (s, c) => fmtL(testOk(s, c) ? l('Um ano depois, o selo de teste de {k} deu lucro e assinou dois nomes que a imprensa adora. Talvez a visão não fosse tão louca.', 'A year on, {k}\'s test imprint turned a profit and signed two names the press loves. Maybe the vision was not so crazy.') : l('Um ano depois, o selo de teste de {k} queimou o orçamento. {k} aprendeu muito — e quer outra chance.', 'A year on, {k}\'s test imprint burned through its budget. {k} learned a lot — and wants another shot.'), names(s, c)),
    def: 'thanks', ch: [
      C('heir', 'Nomear {k} herdeiro(a)', 'Name {k} as heir', { kidBond: 10 }, '{k} será o(a) próximo(a) dono(a) — com a visão que testou.', '{k} will be the next owner — with the vision they tested.',
        { dyn: (s, c) => { const p = life12(s).plan; if (p) p.stance = 'groomed'; ownerOf(s).heir = `kid:${c.kid}`; const k = ownerOf(s).kids[c.kid ?? -1]; if (k) k.aptitude = clamp(k.aptitude + (testOk(s, c) ? 8 : 3), 0, 99); return testOk(s, c) ? { com: 2 } : {}; } }),
      C('thanks', 'Agradecer e fechar o selo de teste', 'Thank them and close the imprint', { kidBond: -3 }, 'O selo de teste fecha. {k} fica com a experiência — e com a dúvida.', 'The imprint closes. {k} keeps the experience — and the doubt.',
        { dyn: (s, c) => { const p = life12(s).plan; if (p) p.stance = 'tested'; const k = ownerOf(s).kids[c.kid ?? -1]; if (k) k.aptitude = clamp(k.aptitude + (testOk(s, c) ? 5 : 2), 0, 99); return {}; } }),
    ] },
  { id: 'r12_artist_crush', name: l('Paixão no elenco', 'Romance on the roster'), cool: 48,
    w: (e) => (!e.partner && e.acts.some((a) => crushOf(e, a)) ? 0.9 : 0),
    pick: (e, r) => { const list = e.acts.filter((a) => crushOf(e, a)); if (!list.length) return null; const a = r.pick(list); return { act: a.id, pid: crushOf(e, a) }; },
    text: (s, c) => fmtL(l('Depois de uma sessão que varou a madrugada, {p} ({a}) confessa estar apaixonado(a) por você. Você é o(a) dono(a) do contrato de {a}.', 'After a session that ran until dawn, {p} ({a}) confesses being in love with you. You own {a}\'s contract.'), names(s, c)),
    def: 'decline', ch: [
      C('date', 'Viver o romance', 'Live the romance', { st: -5, mor: 10 }, 'Vocês começam a namorar. O resto do elenco começa a contar quem ganha mais estúdio.', 'You start dating. The rest of the roster starts counting who gets more studio time.',
        { nt: ['Conflito de interesse: o par ganha confiança, o resto do elenco perde.', 'Conflict of interest: your partner gains trust, the rest of the roster loses it.'], dyn: (s, c) => { const p = s.persons[c.pid ?? '']; if (p) life(s).partner = { name: p.name, born: p.born, job: fmtL(l('artista ({a})', 'artist ({a})'), names(s, c)), trait: 'artsy', affinity: 60, since: s.week, stage: 'dating', personId: p.id, lastDate: s.week }; return {}; } }),
      C('decline', 'Recusar com carinho', 'Decline gently', { mor: -6, res: 4 }, '{p} entende. Ou diz que entende.', '{p} understands. Or says so.',
        { dyn: (s, c) => { if (c.act) arcAdd(s, c.act, 'declined', fmtL(l('{p} se declarou ao dono do selo em {y} e ouviu um não.', '{p} confessed love to the label owner in {y} and heard a no.'), { p: s.persons[c.pid ?? '']?.name ?? '', y: s.year }), 0); return {}; } }),
    ] },
  { id: 'r12_coi', name: l('Conflito de interesse', 'Conflict of interest'), cool: 18,
    w: () => 0,
    text: (s, c) => fmtL(l('Seu par, {p}, é de {a} — e o elenco reclama: {a} ganha os melhores horários de estúdio, a divulgação mais cara, a primeira escolha de canções. Até {x} percebe o clima.', 'Your partner, {p}, is in {a} — and the roster is complaining: {a} gets the best studio slots, the biggest push, first pick of songs. Even {x} feels the tension.'), names(s, c)),
    def: 'keep', ch: [
      C('firewall', 'Contratar um empresário independente para {a}', 'Hire an independent manager for {a}', { cash: -8000, arts: 2 }, 'Decisões sobre {a} saem da sua mesa. O elenco respira.', 'Decisions about {a} leave your desk. The roster breathes again.',
        { dyn: (s) => { const k = life12(s).coi; if (k) k.fw = 1; return {}; } }),
      C('release', 'Liberar {a} do contrato', 'Release {a} from the contract', { love: 8, arts: 3, st: -3 }, '{a} assina com outro selo. Em casa, nunca foi tão leve.', '{a} signs elsewhere. At home, it has never felt lighter.',
        { dyn: (s, c) => { const a = s.acts[c.act ?? '']; if (a && a.owner === 'player') { arcAdd(s, a.id, 'released', fmtL(l('você nos liberou do contrato em {y} para não misturar amor e negócio.', 'you released us in {y} so love and business would not mix.'), { y: s.year }), 0.15); endContract(s, a, 'terminated'); } life12(s).coi = undefined; return {}; } }),
      C('keep', 'Fingir que não é com você', 'Pretend it is not your problem', { love: 3 }, 'O favoritismo vira piada nos bastidores — e mágoa nos contratos.', 'The favoritism becomes a backstage joke — and a grudge in the contracts.',
        { dyn: (s, c) => { for (const id of playerActs(s)) if (id !== c.act && !s.acts[id]?.playerBand) arcAdd(s, id, 'favoritism', fmtL(l('o selo favoreceu {a}, o par do dono, em {y}.', 'the label favoured {a}, the owner\'s partner, in {y}.'), { a: s.acts[c.act ?? '']?.name ?? '', y: s.year }), -0.08); return {}; } }),
    ] },
  { id: 'r12_masters', name: l('A oferta pelas fitas-mestras', 'An offer for the masters'), cool: 48,
    w: (e) => (oldMasters(e.s).length >= 4 && bigLabel(e.s) && (e.wealth < 30000 || vices(e.s).loans.length > 0 || e.cash < 0) ? 1.3 : 0),
    pick: (e) => { const lb = bigLabel(e.s); return lb ? { lab: lb.id, n: oldMasters(e.s).length } : null; },
    text: (s, c) => fmtL(l('{lab} oferece {v} pelas fitas-mestras de {n} discos antigos do selo. O dinheiro iria para o seu bolso e resolveria suas finanças pessoais — mas o catálogo é a memória do selo, e os artistas desses discos vão saber.', '{lab} offers {v} for the masters of {n} of the label\'s old records. The money would go to your pocket and fix your personal finances — but the catalog is the label\'s memory, and the artists on those records will know.'), { ...names(s, c), v: fmtM(s, mastersPrice(c.n ?? 0)) }),
    def: 'refuse', ch: [
      C('sell', 'Vender as fitas-mestras', 'Sell the masters', { arts: -3, st: -8 }, '{lab} leva {n} discos — e toda a receita futura deles. Os artistas lembram.', '{lab} takes {n} records — and all their future revenue. The artists remember.',
        { nt: ['Dinheiro entra no patrimônio pessoal.', 'Money goes to personal wealth.'], dyn: (s, c) => {
          const ids = oldMasters(s); const lb = s.labels[c.lab ?? '']; if (!lb) return {};
          for (const id of ids) s.releases[id].owner = lb.id;
          mastersSold(s, ids.map((id) => s.releases[id].actId), lb.name);
          remember(s, 'masters_sold', fmtL(l('Fitas-mestras de {n} discos vendidas para {lab}.', 'Masters of {n} records sold to {lab}.'), { n: ids.length, lab: lb.name }), { important: true });
          return { w: mastersPrice(ids.length) };
        } }),
      C('license', 'Licenciar por dez anos (sem vender)', 'License for ten years (no sale)', { arts: -1 }, 'Entra dinheiro no caixa do selo; as fitas continuam suas. Os artistas reclamam de não serem consultados.', 'Cash comes into the label; the masters stay yours. The artists grumble they were not asked.',
        { dyn: (s, c) => { for (const id of new Set(oldMasters(s).map((x) => s.releases[x].actId))) arcAdd(s, id, 'licensed', fmtL(l('você licenciou nosso catálogo sem nos consultar ({y}).', 'you licensed our catalog without asking us ({y}).'), { y: s.year }), -0.06); post(s, `r12lic:${s.week}`, money(s, Math.round(mastersPrice(c.n ?? 0) * 0.4)), 'misc', 'Licenciamento de catálogo'); return {}; } }),
      C('refuse', 'Recusar: o catálogo não está à venda', 'Refuse: the catalog is not for sale', { st: 6 }, 'As contas continuam apertadas. Mas os artistas souberam — e lembram.', 'The bills stay tight. But the artists heard — and they remember.',
        { dyn: (s) => { mastersKept(s, oldMasters(s).map((id) => s.releases[id].actId)); return {}; } }),
    ] },
];
function crushOf(e: Env, a: Act): string | undefined {
  if (a.playerBand || a.trust < 55) return undefined;
  const pid = a.leaderId ?? a.members[0];
  const p = e.s.persons[pid];
  return p && p.alive && !p.isPlayer && Math.abs((e.year - p.born) - e.age) < 15 && e.year - p.born >= 21 ? pid : undefined;
}
for (const d of DEFS) if (!EVENTS.some((x) => x.id === d.id)) EVENTS.push(d);

// ---------------------------------------------------------------- sucessão: o herdeiro executa a visão

function applyVision(s: GameState, p: HeirPlan, name: string): void {
  const rep = s.player.reputation;
  const mult = p.stance === 'refused' ? 1.5 : 1;
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.playerBand);
  const hit = (pred: (a: Act) => boolean, t: L, w: number) => { for (const a of acts) if (pred(a)) { a.trust = clamp(a.trust - 8 * mult, 0, 100); arcAdd(s, a.id, 'vision', t, w); } };
  const why = VISION_TXT[p.vision][1];
  if (p.vision === 'hits') { rep.commercial = clamp(rep.commercial + 6, 0, 100); rep.artistic = clamp(rep.artistic - 6 * mult, 0, 100); hit((a) => a.fame < 30, fmtL(l('{n} assumiu em {y} e só quer hits — nossa vez acabou.', '{n} took over in {y} and only wants hits — our turn is over.'), { n: name, y: s.year }), -0.15); }
  if (p.vision === 'art') { rep.artistic = clamp(rep.artistic + 6, 0, 100); rep.commercial = clamp(rep.commercial - 5 * mult, 0, 100); hit((a) => a.fame >= 45, fmtL(l('{n} assumiu em {y} e torce o nariz para quem vende.', '{n} took over in {y} and sneers at whoever sells.'), { n: name, y: s.year }), -0.12); }
  if (p.vision === 'expand') { post(s, `r12vis:${s.week}`, -money(s, 30000 * mult), 'misc', 'Expansão do herdeiro'); rep.institutional = clamp(rep.institutional + 5, 0, 100); }
  if (p.vision === 'cashout') { const o = ownerOf(s); const v = money(s, 40000); o.wealth += v; post(s, `r12vis:${s.week}`, -v, 'misc', 'Dividendo do herdeiro'); rep.artists = clamp(rep.artists - 6 * mult, 0, 100); hit(() => true, fmtL(l('{n} assumiu em {y} falando em vender o selo.', '{n} took over in {y} talking about selling the label.'), { n: name, y: s.year }), -0.1); }
  if (p.stance === 'groomed') rep.artists = clamp(rep.artists + 3, 0, 100);
  const t = fmtL(p.stance === 'refused'
    ? l('{n} assume com a mágoa da conversa de {y0} e aplica "{v}" com força dobrada.', '{n} takes over carrying the grudge from {y0} and applies "{v}" twice as hard.')
    : l('{n} assume e põe em prática a visão combinada: "{v}".', '{n} takes over and puts the agreed vision into practice: "{v}".'), { n: name, y0: p.y, v: why });
  notify(s, t, p.stance === 'refused' ? 'bad' : 'event');
  logL(s, t);
}

registerSimHook('month', 'life12', (s) => {
  if (s.ended) return;
  const st = life12(s);
  const o = ownerOf(s);
  const g = o.generation ?? 1;
  if (!st.gen) st.gen = g;
  else if (g !== st.gen) {
    st.gen = g;
    const p = st.plan;
    if (p && p.name === o.name) applyVision(s, p, o.name);
    else if (p && p.stance === 'groomed') logL(s, fmtL(l('{k} foi preparado(a) para herdar, mas o selo foi para {n}. A família não esquece.', '{k} was groomed to inherit, but the label went to {n}. The family will not forget.'), { k: p.name, n: o.name }));
    st.plan = undefined;
    st.coi = undefined;
  }
  // conflito de interesse: romance com alguém do elenco
  const a = coiAct(s);
  const pid = life(s).partner?.personId;
  if (st.coi && (!a || st.coi.pid !== pid)) {
    const old = s.acts[st.coi.act];
    if (old && old.owner === 'player' && st.coi.pid !== pid) {
      old.trust = clamp(old.trust - 25, 0, 100);
      arcAdd(s, old.id, 'heartbreak', fmtL(l('o romance com o dono do selo acabou mal em {y}.', 'the romance with the label owner ended badly in {y}.'), { y: s.year }), -0.35);
      const t = fmtL(l('O fim do romance contamina o contrato: {a} perdeu a confiança no selo.', 'The breakup spills into the contract: {a} lost faith in the label.'), { a: old.name });
      notify(s, t, 'bad'); logL(s, t);
    }
    st.coi = undefined;
  }
  if (a && pid && !st.coi) { st.coi = { pid, act: a.id, since: s.year }; logL(s, fmtL(l('Conflito de interesse: você namora alguém de {a}.', 'Conflict of interest: you are dating someone in {a}.'), { a: a.name })); }
  if (st.coi && a && !st.coi.fw) {
    a.trust = clamp(a.trust + 0.5, 0, 100);
    for (const id of playerActs(s)) { const b = s.acts[id]; if (b && b !== a && !b.playerBand) b.trust = clamp(b.trust - 0.4, 0, 100); }
    s.player.reputation.artists = clamp(s.player.reputation.artists - 0.15, 0, 100);
    // a cada ~ano e meio, o elenco cobra (vira evento de vida pessoal)
    const le = (s.x4 as unknown as { life10?: { cd: Record<string, number>; pend: { due: number; ev: string; ctx: LeCtx }[] } }).life10;
    const now = s.year * 12 + s.month;
    if (le && !le.pend.some((x) => x.ev === 'r12_coi') && (le.cd.r12_coi === undefined || now - le.cd.r12_coi >= 18) && now - (st.coi.since * 12) >= 3) {
      le.pend.push({ due: now + 1, ev: 'r12_coi', ctx: { act: a.id, pid } });
      le.cd.r12_coi = now;
    }
  }
  runRoutines(s);
});
