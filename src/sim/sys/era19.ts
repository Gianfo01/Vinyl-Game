// Rodada 19 (11.5, era19) — a ERA 1889 fala com a camada de decisão:
//  · fatores vivos da era para o card "A era" do Cockpit (crise/boato de pânico, guerra de formatos, patentes,
//    circuito de vaudeville, costume dos contratos) — só o que já se sabe no ano (nada do futuro);
//  · dicas do Conselheiro (boato de corrida aos bancos, licença de patentes, disco × cilindro, vaudeville);
//  · ecos de época: escolha de patentes (Caixa: licenciar × arriscar), aposta goma-laca × cilindro (evento novo),
//    acordo com circuito de vaudeville (evento novo, com a lista negra dos circuitos), quebra e racionamento de goma-laca;
//  · pacotes de contrato da época (cachê por sessão; royalty por lado) nos contratos do selo (contracts18).
// Fato com ouvinte: a liminar de patentes (era1889 'case_ruling' #patent) deixa os circuitos de vaudeville desconfiados
// e vira dica; a aposta de formato publica 'format_bet' (lida pelo card e pela história real).

import { clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerConseq18, type Fx18 } from '../decide18';
import type { EventDef } from '../events';
import { deferEvents, registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { registerAdvisorTip, type AdvTip18 } from '../inbox18';
import { GEO_EVENTS } from '../culture';
import type { Act, GameState } from '../types';
import { fmtL, hasTech, money, playerActs, post } from '../util';
import { era1889 } from './era1889';
import { PKG18 } from './contracts18';
import { eraK19, eraWhy19, ROY_YEAR19, MASTER_YEAR19 } from './eracon19';

export const ERA_END19 = 1932;
export interface Era19State { bet?: 'disc' | 'cyl' | 'both'; betY?: number; vaud?: { act: string; until: number; bl?: 1 }; inj?: number }
declare module '../ext4' { interface Ext4 { era19: Era19State } }
registerExt4('era19', () => ({}));
export function era19(s: GameState): Era19State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  return (x.era19 ??= {}) as Era19State;
}
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && a.members.length);
const homeMkt = (s: GameState): string => cityById[s.config.homeCity]?.market ?? 'na';

// ---------------------------------------------------------------- pacotes de contrato da época (contracts18)

const K0 = { video: false, tour: false, mkt: 0 as const, cap: 0, cross: false, base: 'wholesale' as const, stmt: 'a' as const, lag: 3, audit: false, minRel: 0, promo: 0 };
const addPkg19 = (): void => { if (!PKG18.some((p) => p.id === 'session')) PKG18.push(
  { id: 'session', from: 0, to: ROY_YEAR19, roy: 0, name: l('Cachê por sessão (costume da época)', 'Session fee (custom of the era)'),
    desc: l('Cachê fixo por sessão ou por cilindro gravado, pago na entrega das ceras; exclusividade com o selo; sem royalty. As matrizes ficam com a fábrica.', 'A flat fee per session or per cylinder recorded, paid when the waxes are delivered; exclusive to the label; no royalty. The matrices belong to the company.'),
    c: { pkg: 'session', rec: 0, ...K0 }, rights: { reversionYears: 0 } },
  { id: 'side', from: ROY_YEAR19, to: MASTER_YEAR19, roy: 0.04, name: l('Royalty por lado + edição à parte', 'Per-side royalty + separate publishing'),
    desc: l('Royalty baixo por lado vendido (4%; estrelas negociam mais), metade da gravação recuperável, contas anuais; a partitura é contratada à parte. As matrizes ficam com a fábrica.', 'A low royalty per side sold (4%; stars negotiate more), half of recording recoupable, yearly statements; sheet music is contracted separately. The matrices belong to the company.'),
    c: { pkg: 'side', rec: 0.5, ...K0 }, rights: { reversionYears: 0 } },
); };
// contracts18 pode ainda não ter avaliado quando os dados são importados primeiro (ciclo de imports): adia para depois do grafo.
// r19 T9: ler PKG18 antes da avaliação lança ReferenceError (TDZ) no bundle — o teste precisa de try.
const pkgReady19 = (): boolean => { try { return !!PKG18; } catch { return false; } };
if (pkgReady19()) addPkg19(); else queueMicrotask(addPkg19);

// ---------------------------------------------------------------- fatores vivos (card "A era")

export interface EraFactor19 { id: string; t: L; d: L; tone: 'good' | 'bad' | 'info' }
export function eraFactors19(s: GameState): EraFactor19[] {
  if (s.year >= ERA_END19) return [];
  const out: EraFactor19[] = [];
  const st = era1889(s), e = era19(s), mk = homeMkt(s);
  const crisis = GEO_EVENTS.find((g) => g.from <= s.year && g.to >= s.year && g.from < ERA_END19 && g.markets.includes(mk as never));
  const soon = GEO_EVENTS.find((g) => g.id.startsWith('panic') && g.markets.includes(mk as never) && ((g.from === s.year + 1 && s.month >= 9) || (g.from === s.year && s.month <= 1)));
  if (crisis) out.push({ id: 'crisis', t: crisis.name, d: fmtL(l('{n} Demanda ×{d}.', '{n} Demand ×{d}.'), { n: crisis.note, d: crisis.demand }), tone: 'bad' });
  else if (soon) out.push({ id: 'rumor', t: l('Boatos de corrida aos bancos', 'Rumours of a bank run'), d: l('Os jornais de finanças falam em bancos frágeis: guarde caixa e não encha o estoque.', 'The financial papers talk of shaky banks: keep cash and don\'t overstock.'), tone: 'bad' });
  if (s.year < 1930) {
    const d = !hasTech(s, 'disc') ? l('Só existe o cilindro de cera: cada cópia até 1902 é uma nova gravação.', 'Only the wax cylinder exists: until 1902 each copy is a new recording.')
      : s.year < 1905 ? l('Disco plano × cilindro: muitos lares ainda têm fonógrafo de cilindro.', 'Flat disc vs cylinder: many homes still own a cylinder phonograph.')
        : s.year < 1912 ? l('O disco ganha terreno; o cilindro resiste no interior.', 'The disc gains ground; the cylinder holds on in the countryside.')
          : l('O disco venceu (a Columbia largou o cilindro em 1912); Edison ainda insiste.', 'The disc won (Columbia dropped the cylinder in 1912); Edison still insists.');
    const bet = e.bet ? fmtL(l(' Sua aposta: {b}.', ' Your bet: {b}.'), { b: BET_NAME[e.bet] }) : l('', '');
    out.push({ id: 'format', t: l('Guerra dos formatos', 'Format war'), d: fmtL(l('{d}{b}', '{d}{b}'), { d, b: bet }), tone: 'info' });
  }
  if (s.year < 1912 && s.config.role !== 'artist') out.push({ id: 'patent', t: l('Guerra de patentes', 'Patent war'),
    d: st.pat === 'lic' ? l('Licenciado: 6% das vendas físicas vão para o pool.', 'Licensed: 6% of physical sales go to the pool.')
      : st.pat === 'risk' ? fmtL(l('Sem licença: liminares possíveis ({n} até agora).', 'Unlicensed: injunctions possible ({n} so far).'), { n: st.injunctions }) : l('Ainda sem decisão: a pergunta chega na Caixa quando você prensar.', 'No decision yet: the question arrives in your Inbox once you press.'),
    tone: st.pat === 'risk' ? 'bad' : st.pat === 'lic' ? 'good' : 'info' });
  if (e.vaud && e.vaud.until > s.week) out.push({ id: 'vaud', t: l('Circuito de vaudeville', 'Vaudeville circuit'), d: fmtL(l('{a} em turnê exclusiva pelo circuito{b}.', '{a} on an exclusive circuit tour{b}.'), { a: s.acts[e.vaud.act]?.name ?? '—', b: e.vaud.bl ? l(' — na lista negra do circuito rival', ' — blacklisted by the rival circuit') : l('', '') }), tone: e.vaud.bl ? 'bad' : 'good' });
  out.push({ id: 'contract', t: eraK19(s.year) === 'session' ? l('Cachê por sessão', 'Session fees') : eraK19(s.year) === 'side' ? l('Royalty por lado', 'Per-side royalty') : l('Royalty da década', 'This decade\'s royalty'), d: eraWhy19(s.year), tone: 'info' });
  return out;
}
registerExplain('era19.factors', (s) => {
  const f = eraFactors19(s);
  if (!f.length) return null;
  return { title: l('A era', 'The era'), value: f.length, fmt: 'num', parts: f.map((x) => ({ label: x.t, note: x.d, tone: x.tone === 'bad' ? 'bad' : x.tone === 'good' ? 'good' : '' })),
    note: l('Só o que se sabe no ano: o card não antecipa o futuro (boatos aparecem poucos meses antes de uma crise).', 'Only what is known that year: the card never spoils the future (rumours appear a few months before a crisis).') };
});

// ---------------------------------------------------------------- Conselheiro

registerAdvisorTip('era1889', (s) => {
  if (s.year >= ERA_END19) return [];
  const out: AdvTip18[] = [];
  const st = era1889(s), e = era19(s);
  for (const f of eraFactors19(s)) {
    if (f.id === 'rumor') out.push({ id: 'era19_panic', level: 'warn', cat: 'cash', text: l('Boatos de pânico bancário: reserve caixa e prense pouco.', 'Bank panic rumours: hold cash and press small runs.'), why: [f.d], effect: l('Menos encalhe quando a demanda cair', 'Less dead stock when demand falls'), goto: { area: 'finance' } });
    if (f.id === 'crisis') out.push({ id: 'era19_crisis', level: 'warn', cat: 'cash', text: fmtL(l('{n}: tiragens menores e shows locais.', '{n}: smaller runs and local shows.'), { n: f.t }), why: [f.d] });
  }
  if (s.year < 1912 && s.config.role !== 'artist' && !st.pat) out.push({ id: 'era19_patent', level: 'info', cat: 'other', text: l('Patentes: decida entre licenciar (taxa + 6%) e arriscar liminares antes de prensar muito.', 'Patents: choose between licensing (fee + 6%) and risking injunctions before pressing a lot.'), why: [l('Edison, Columbia e Victor processam quem fabrica sem licença.', 'Edison, Columbia and Victor sue unlicensed manufacturers.')], goto: { area: 'inbox' } });
  if (e.inj && s.week - e.inj < 52 && st.pat === 'risk') out.push({ id: 'era19_inj', level: 'bad', cat: 'cash', text: l('Depois da liminar, licenciar sai mais barato que a próxima apreensão.', 'After the injunction, licensing is cheaper than the next seizure.'), why: [l('Os circuitos de vaudeville evitam selos processados.', 'Vaudeville circuits avoid labels under lawsuit.')] });
  if (s.year >= 1905 && s.year < 1930 && hasTech(s, 'disc')) {
    const cylOnly = Object.values(s.releases).some((r) => r.owner === 'player' && s.week - r.week < 52 && r.formats.includes('cylinder') && !r.formats.includes('shellac'));
    if (cylOnly) out.push({ id: 'era19_disc', level: 'warn', cat: 'release', text: l('Prense também em goma-laca: lançamentos só em cilindro vendem cada vez menos.', 'Press in shellac too: cylinder-only releases sell less every year.'), why: [l('A guerra dos formatos pende para o disco depois de 1905.', 'The format war tilts to the disc after 1905.')], goto: { area: 'releases' } });
  }
  if (s.year < 1930 && !e.vaud && mine(s).some((a) => ['vaudeville', 'tin_pan_alley', 'ragtime', 'barbershop', 'march'].includes(a.genre))) out.push({ id: 'era19_vaud', level: 'info', cat: 'opportunity', text: l('O vaudeville faz a fama antes do rádio: um circuito pode levar seu ato a 30 cidades.', 'Vaudeville makes fame before radio: a circuit can take your act to 30 cities.'), why: [l('Partitura e disco vendem onde o ato passa.', 'Sheet music and records sell where the act plays.')], goto: { area: 'shows' } });
  return out;
});

// ---------------------------------------------------------------- fatos

// aposta de formato: lojistas reagem (disco depois de 1900 = confiança; cilindro depois de 1905 = desconfiança)
onFact('format_bet', (s, f) => {
  const R = s.player.reputation;
  if (f.tags?.includes('disc') && s.year >= 1900) R.commercial = clamp(R.commercial + 1, 0, 100);
  if (f.tags?.includes('cyl') && s.year >= 1905) R.commercial = clamp(R.commercial - 1, 0, 100);
}, 'era19:bet');
onFact('case_ruling', (s, f) => { if (f.tags?.includes('patent') && s.year < ERA_END19) era19(s).inj = s.week; }, 'era19:patent');

// ---------------------------------------------------------------- eventos de época (com ecos)

const BET_NAME: Record<NonNullable<Era19State['bet']>, L> = { disc: l('disco de goma-laca', 'shellac disc'), cyl: l('cilindro de cera', 'wax cylinder'), both: l('os dois formatos', 'both formats') };
const pay = (s: GameState, k: string, real: number, memo: string) => post(s, `era19:${k}:${s.week}`, -money(s, real), 'capex', memo);
const N = (pt: string, en: string): L => l(pt, en);
const setBet = (s: GameState, b: NonNullable<Era19State['bet']>) => {
  const e = era19(s); e.bet = b; e.betY = s.year;
  emitFact(s, { kind: 'format_bet', actors: ['player'], severity: 20, visibility: 'public', tags: ['era19', b], src: 'era19', text: fmtL(l('O selo aposta no {b}.', 'The label bets on the {b}.'), { b: BET_NAME[b] }) });
};
const cylBet: EventDef = {
  id: 'era19_cyl_bet', cat: 'tech', tone: 'neutral', tags: ['era1889'], cooldown: 120, weight: 0.7,
  find: (s, r) => (s.year >= 1895 && s.year <= 1910 && hasTech(s, 'disc') && !era19(s).bet && s.config.role !== 'artist' && r.chance(0.2) ? {} : null),
  title: N('Goma-laca ou cilindro?', 'Shellac or cylinder?'),
  text: N('Berliner prensa milhares de discos de uma só matriz; Edison jura que o cilindro soa melhor e os lares do interior têm fonógrafo. Equipar a fábrica para um formato custa caro. Em que você aposta?', 'Berliner presses thousands of discs from one master plate; Edison swears the cylinder sounds better and farm homes own phonographs. Tooling the plant for one format is expensive. What do you bet on?'),
  options: [
    { id: 'disc', label: N('Apostar no disco de goma-laca', 'Bet on the shellac disc'), hint: N('Prensa nova agora; o disco pode dominar.', 'New press now; the disc may take over.'), apply: (s) => { pay(s, 'disc', 2500, 'Prensa de discos (goma-laca)'); setBet(s, 'disc'); } },
    { id: 'cyl', label: N('Ficar com o cilindro', 'Stay with the cylinder'), hint: N('Nada agora; o público rural é fiel.', 'Nothing now; rural buyers are loyal.'), apply: (s) => setBet(s, 'cyl') },
    { id: 'both', label: N('Fabricar os dois', 'Make both'), hint: N('Custo médio; nunca o melhor dos dois.', 'Medium cost; never the best of both.'), apply: (s) => { pay(s, 'both', 1500, 'Linha mista disco/cilindro'); setBet(s, 'both'); } },
  ],
};
const vaud: EventDef = {
  id: 'era19_vaud', cat: 'stage', tone: 'good', tags: ['era1889'], cooldown: 30, weight: 0.6,
  find: (s, r) => {
    if (s.year >= 1930 || s.config.role === 'artist' || (era19(s).vaud?.until ?? 0) > s.week || !r.chance(era19(s).inj && s.week - era19(s).inj! < 52 ? 0.05 : 0.12)) return null;
    const a = mine(s).sort((x, y) => y.fame - x.fame)[0];
    return a ? { act: a.id } : null;
  },
  title: N('O circuito de vaudeville quer {act}', 'The vaudeville circuit wants {act}'),
  text: N('O escritório de reservas do maior circuito oferece 30 semanas de teatros para {act}: cachê garantido e a canção cantada em cada cidade. A condição: exclusividade. Quem toca no circuito rival entra na lista negra deles.', 'The biggest circuit\'s booking office offers {act} 30 weeks of theatres: a guaranteed fee and the song sung in every town. The catch: exclusivity. Whoever plays the rival circuit lands on their blacklist.'),
  options: [
    { id: 'exclusive', label: N('Assinar com exclusividade', 'Sign exclusively'), hint: N('Cachê mensal e fama; o circuito rival vai lembrar.', 'Monthly fee and fame; the rival circuit will remember.'),
      apply: (s, _r, c) => { era19(s).vaud = { act: String(c.act), until: s.week + 30 }; const a = s.acts[String(c.act)]; if (a) a.fame = clamp(a.fame + 2, 0, 100); } },
    { id: 'plug', label: N('Só pagar astros para cantar a canção', 'Just pay stars to sing the song'), hint: N('Custo agora; a partitura pode voar.', 'Cost now; sheet music may fly.'), apply: (s) => pay(s, 'plug', 700, 'Astros do vaudeville cantando a canção') },
    { id: 'pass', label: N('Recusar: ficamos livres', 'Decline: we stay free'), hint: N('Nada agora; tocam onde quiserem.', 'Nothing now; play wherever you like.'), apply: () => {} },
  ],
};
deferEvents<EventDef>([cylBet, vaud]);
export const ERA_EVENTS19 = ['era19_cyl_bet', 'era19_vaud'];

// circuito exclusivo: cachê do escritório de reservas por mês enquanto dura
registerSimHook('month', 'era19', (s) => {
  const v = era19(s).vaud;
  if (!v || v.until <= s.week) return;
  const a = s.acts[v.act];
  if (!a || a.owner !== 'player') { era19(s).vaud = undefined; return; }
  post(s, `era19:vaud:${s.year}:${s.month}`, money(s, v.bl ? 150 : 350 + a.fame * 6), 'live', 'Circuito de vaudeville (exclusivo)');
});

const T = (f: Fx18, pt: string, en: string): L => fmtL(l(pt, en), { a: f.act?.name ?? l('o selo', 'the label') });
const E = (key: string, x: Parameters<typeof registerConseq18>[1]) => registerConseq18(key, x);
E('ev:era19_cyl_bet:disc', { later: [{ in: [12, 30], p: (s) => (s.year >= 1900 ? 0.75 : 0.6), tone: 'mixed', hint: N('A guerra dos formatos decide em anos, não em meses.', 'The format war is decided in years, not months.'),
  fx: (f) => { f.cash(4000, 'Discos de goma-laca', 'sales').rep('commercial', 3); return N('A aposta no disco pagou: lojas pedem goma-laca e o cilindro encalha nos rivais.', 'The disc bet paid off: stores want shellac and cylinders pile up at rivals.'); },
  miss: (f) => { f.cash(-1500, 'Discos quebrados no transporte', 'misc'); return N('Ainda cedo: o disco quebra no transporte e os lares seguem com cilindro.', 'Still early: discs break in transit and homes stay with cylinders.'); } }] });
E('ev:era19_cyl_bet:cyl', { later: [{ in: [12, 30], p: (s) => (s.year >= 1905 ? 0.7 : 0.4), tone: 'bad', hint: N('Fidelidade ao formato pode virar estoque morto.', 'Loyalty to a format can become dead stock.'),
  fx: (f) => { f.cash(-3000, 'Cilindros encalhados', 'misc').rep('commercial', -2); return N('As lojas da cidade só querem disco: seus cilindros encalham.', 'City stores only want discs: your cylinders pile up.'); },
  miss: (f) => { f.cash(1500, 'Fiéis do cilindro', 'sales'); return N('O interior seguiu fiel ao cilindro — por enquanto.', 'The countryside stayed loyal to the cylinder — for now.'); } }] });
E('ev:era19_cyl_bet:both', { later: [{ in: [12, 24], p: 0.5, tone: 'mixed', hint: N('Dois formatos, duas filas na fábrica.', 'Two formats, two queues at the plant.'),
  fx: (f) => { f.cash(1500, 'Dois formatos', 'sales'); return N('Fabricar os dois segurou os clientes dos dois lados.', 'Making both kept customers on both sides.'); },
  miss: (f) => { f.cash(-1200, 'Fábrica dividida', 'misc'); return N('A fábrica dividida não foi a melhor em nenhum formato.', 'The split plant was the best at neither format.'); } }] });
E('ev:era19_vaud:exclusive', { later: [{ in: [3, 8], p: 0.6, tone: 'mixed', hint: N('Exclusividade: fama no circuito, inimigos no outro.', 'Exclusivity: fame on one circuit, enemies on the other.'),
  fx: (f) => { f.fans(5).fame(2); return T(f, '{a} lotou 30 teatros: a partitura vende em cada cidade por onde passou.', '{a} filled 30 theatres: the sheet music sells in every town they played.'); },
  miss: (f) => { const v = era19(f.s).vaud; if (v) v.bl = 1; f.momentum(-4); return T(f, 'O circuito rival pôs {a} na lista negra: metade dos teatros fechou a porta.', 'The rival circuit blacklisted {a}: half the theatres shut their doors.'); } }] });
E('ev:era19_vaud:plug', { later: [{ in: [2, 6], p: 0.55, tone: 'mixed', hint: N('Pagar astro para cantar: a canção pega ou não.', 'Paying a star to sing: the song catches on or not.'),
  fx: (f) => { f.cash(1800, 'Partituras vendidas pelo vaudeville', 'publishing'); return N('Os astros do vaudeville cantaram a sua canção: a partitura esgotou.', 'Vaudeville stars sang your song: the sheet music sold out.'); },
  miss: () => N('O astro cantou a canção uma noite e trocou por outra.', 'The star sang the song one night and swapped it for another.') }] });
E('ev:era19_vaud:pass', { later: [{ in: [4, 10], p: 0.35, tone: 'mixed', hint: N('Livre do circuito, longe dos teatros grandes.', 'Free of the circuit, far from the big theatres.'),
  fx: (f) => { f.trust(3); return T(f, '{a} gostou de tocar onde quis — mas os teatros grandes chamaram outro.', '{a} liked playing where they wanted — but the big theatres booked someone else.'); } }] });
// patentes (Caixa de era1889: 'ib:<k18>:<resposta>')
E('ib:era1889_patent:lic', { later: [{ in: [6, 18], p: 0.5, tone: 'good', hint: N('Licenciado, você dorme tranquilo — e pode ser chamado para o pool.', 'Licensed, you sleep soundly — and may be invited into the pool.'),
  fx: (f) => { f.rep('institutional', 3).rep('commercial', 1); return N('Os advogados do pool citam o selo como "fabricante licenciado": lojas grandes passam a comprar de você.', 'Pool lawyers list the label as a "licensed manufacturer": big stores start buying from you.'); } }] });
E('ib:era1889_patent:risk', { later: [{ in: [3, 12], p: 0.45, tone: 'mixed', hint: N('Sem licença, a carta do tribunal pode chegar.', 'Without a license, the court letter may come.'),
  fx: (f) => { f.cash(2000, 'Economia de royalties de patente', 'other_income'); return N('Ninguém bateu à porta: o dinheiro da licença ficou no caixa.', 'Nobody knocked: the license money stayed in the till.'); },
  miss: (f) => { f.cash(-2500, 'Advogados de patentes', 'legal').rep('institutional', -2); return N('Uma carta do escritório de patentes: advogados caros só para empurrar o processo.', 'A letter from the patent office: expensive lawyers just to stall the suit.'); } }] });
// goma-laca (events_more)
E('ev:shellac_breakage:repress', { later: [{ in: [2, 6], p: 0.55, tone: 'good', hint: N('Palha e caixote: a próxima remessa chega inteira.', 'Straw and crates: the next shipment arrives whole.'),
  fx: (f) => { f.rep('commercial', 2); return N('Os lojistas elogiam a embalagem nova: nenhum disco quebrado no mês.', 'Dealers praise the new packing: not one broken record this month.'); } }] });
E('ev:shellac_breakage:absorb', { later: [{ in: [2, 6], p: 0.45, tone: 'bad', hint: N('Absorver ensina o transportador a não ter cuidado.', 'Absorbing it teaches the carrier not to care.'),
  fx: (f) => { f.cash(-800, 'Nova quebra no transporte', 'misc'); return N('A transportadora quebrou outra remessa: ninguém mudou nada.', 'The carrier broke another shipment: nothing changed.'); } }] });
E('ev:shellac_ration:recycle', { later: [{ in: [3, 8], p: 0.55, tone: 'good', hint: N('Campanha patriótica rende boa vontade.', 'A patriotic drive earns goodwill.'),
  fx: (f) => { f.rep('institutional', 3).cash(900, 'Discos reciclados', 'sales'); return N('A campanha de reciclagem virou notícia: discos velhos viraram tiragem nova.', 'The recycling drive made the news: old records became a new run.'); } }] });
E('ev:shellac_ration:halve', { later: [{ in: [3, 8], p: 0.45, tone: 'bad', hint: N('Tiragem curta deixa loja vazia.', 'A short run leaves empty shelves.'),
  fx: (f) => { f.momentum(-3); return N('Faltou disco nas lojas; os fãs compraram o de quem reciclou.', 'Stores ran out; fans bought from whoever recycled.'); } }] });
E('ev:sheet_music_boom:license', { later: [{ in: [3, 8], p: 0.5, tone: 'good', hint: N('Editora grande espalha a partitura.', 'A big publisher spreads the sheet music.'),
  fx: (f) => { f.cash(1200, 'Royalties de partitura', 'publishing'); return N('A editora pôs a partitura em toda loja de pianos: royalties chegando.', 'The publisher put the sheet music in every piano store: royalties coming in.'); } }] });
E('ev:sheet_music_boom:own', { later: [{ in: [3, 8], p: 0.5, tone: 'mixed', hint: N('Imprimir sozinho: margem cheia, alcance curto.', 'Printing yourself: full margin, short reach.'),
  fx: (f) => { f.cash(2000, 'Partituras próprias', 'publishing'); return N('A gráfica do bairro não dá conta: a partitura própria vende tudo.', 'The local printer can\'t keep up: your own sheet music sells out.'); },
  miss: (f) => { f.cash(-700, 'Partituras encalhadas', 'misc'); return N('Sem pluggers nas lojas, a partitura própria encalhou.', 'With no pluggers in stores, your own sheet music sat unsold.'); } }] });
E('ev:sheet_music_boom:pass', { later: [{ in: [3, 8], p: 0.35, tone: 'bad', hint: N('Partitura sem dono acha dono.', 'Unclaimed sheet music finds an owner.'),
  fx: (f) => { f.rep('commercial', -1); return N('Uma editora pirata imprimiu a canção e ficou com o lucro.', 'A pirate publisher printed the song and kept the profit.'); } }] });

/** chance de a aposta de formato ter dado certo agora (para a interface e a história real) */
export const betRight19 = (s: GameState): boolean | null => { const b = era19(s).bet; return !b ? null : s.year < 1905 ? null : b !== 'cyl'; };
