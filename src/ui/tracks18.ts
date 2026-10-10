// Rodada 18 (tutorial18) — trilhas guiadas por carreira e dicas de primeira vez (sem DOM: testáveis).
// Tudo só LÊ o estado (leituras cruas de s.x4, sem inicializar sistemas) — nada muda a simulação nem o RNG.

import { l, type L } from '../data/world';
import type { GameState } from '../sim/types';

type X4 = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const x4 = (s: GameState): X4 => ((s as unknown as { x4?: X4 }).x4 ?? {});
const st = (s: GameState) => s.player.stats;
const mine = (s: GameState): string[] => Object.values(s.acts).filter((a) => a.owner === 'player' || (a as { playerBand?: boolean }).playerBand).map((a) => a.id);
const vlist = (s: GameState, kind: string): X4[] => ((x4(s).ventures9?.list ?? x4(s).ventures?.list ?? []) as X4[]).filter((v) => v.kind === kind);
const facts = (s: GameState): { kind: string; actors: string[]; visibility: string }[] => x4(s).facts17?.f ?? [];
const inbox = (s: GameState): { ref?: Record<string, unknown> }[] => x4(s).people?.inbox ?? [];
const anyFact = (s: GameState, kinds: string[], who?: 'me'): boolean => {
  const me = who ? new Set(['player', ...mine(s)]) : null;
  return facts(s).some((f) => kinds.includes(f.kind) && (!me || f.actors.some((a) => me.has(a))));
};
const anyMsg = (s: GameState, pred: (k: string) => boolean): boolean => inbox(s).some((m) => pred(String(m.ref?.k18 ?? '')));
const yearsIn = (s: GameState): number => s.year - s.config.startYear;

// ---------------------------------------------------------------- trilhas por carreira

export interface Obj18 {
  id: string;
  label: L;
  /** página para onde o objetivo leva (e que conta como visitada) */
  area: string;
  /** concluído pelo estado da partida; sem `check`, conta a visita à página */
  check?: (s: GameState) => boolean;
}
export interface Track18 { id: string; name: L; intro: L; objs: Obj18[] }

const o = (id: string, pt: string, en: string, area: string, check?: (s: GameState) => boolean): Obj18 => ({ id, label: l(pt, en), area, check });

export const TRACKS18: Track18[] = [
  { id: 'label', name: l('Gravadora', 'Record label'), intro: l('Do primeiro contrato ao primeiro disco de ouro.', 'From the first signing to the first gold record.'), objs: [
    o('market', 'Abrir o Mercado e ver o radar de talentos', 'Open the Market and check the talent radar', 'market'),
    o('sign', 'Contratar o primeiro artista', 'Sign your first act', 'market', (s) => st(s).signed >= 1 || mine(s).length > 0),
    o('staff', 'Ter 2 pessoas na equipe (ex.: A&R e promotor)', 'Have 2 staff (e.g. A&R and promoter)', 'team', (s) => s.player.staff.length >= 2),
    o('record', 'Abrir o Projeto musical e montar um disco', 'Open the Music project and build a record', 'project'),
    o('release', 'Lançar o primeiro disco', 'Release your first record', 'releases', (s) => st(s).releases >= 1),
    o('pm', 'Ler o post-mortem de um lançamento', 'Read a release post-mortem', 'long18', (s) => anyFact(s, ['release_review'])),
    o('top10', 'Colocar um disco no top 10', 'Get a record into the top 10', 'charts', (s) => st(s).top10s >= 1),
    o('dre', 'Conferir a DRE (lucro operacional e caixa)', 'Check the P&L (operating profit and cash)', 'finance'),
    o('gold', 'Conquistar um disco de ouro', 'Earn a gold record', 'catalog', (s) => st(s).gold >= 1),
  ] },
  { id: 'musician', name: l('Músico', 'Musician'), intro: l('Banda, palco e a primeira gravação.', 'Band, stage and the first recording.'), objs: [
    o('band', 'Abrir a página da sua banda', 'Open your band page', 'cp17-musician'),
    o('compose', 'Compor músicas novas', 'Write new songs', 'creation'),
    o('show', 'Fazer o primeiro show', 'Play your first show', 'shows', (s) => anyFact(s, ['show', 'tour_done'], 'me')),
    o('release', 'Lançar a primeira gravação', 'Release your first recording', 'releases', (s) => st(s).releases >= 1),
    o('skills', 'Ver suas habilidades e personalidade', 'Check your skills and personality', 'you'),
    o('fame', 'Chegar a fama 25 com a banda', 'Reach fame 25 with the band', 'artists', (s) => mine(s).some((id) => (s.acts[id]?.fame ?? 0) >= 25)),
  ] },
  { id: 'manager', name: l('Empresário', 'Manager'), intro: l('Clientes, comissões e contratos melhores.', 'Clients, commissions and better deals.'), objs: [
    o('page', 'Abrir a gestão de artistas', 'Open artist management', 'cp17-manager'),
    o('client', 'Agenciar o primeiro cliente', 'Take on your first client', 'cp17-manager', (s) => (x4(s).ventures9?.mg?.clients ?? x4(s).ventures?.mg?.clients ?? []).length >= 1),
    o('mgrs', 'Conhecer os empresários rivais', 'Meet the rival managers', 'managers14'),
    o('three', 'Ter 3 clientes ao mesmo tempo', 'Have 3 clients at once', 'cp17-manager', (s) => (x4(s).ventures9?.mg?.clients ?? x4(s).ventures?.mg?.clients ?? []).length >= 3),
    o('dyn', 'Ver a dinâmica das bandas', 'Check band dynamics', 'dyn18'),
  ] },
  { id: 'booking', name: l('Agente e promotor', 'Agent & promoter'), intro: l('Rotas, propostas e a parte de cada noite.', 'Routes, offers and a cut of every night.'), objs: [
    o('page', 'Abrir rotas e propostas', 'Open routes and offers', 'cp17-booking'),
    o('show', 'Fechar o primeiro show', 'Book the first show', 'cp17-booking', (s) => (x4(s).tour12?.shows ?? []).length >= 1 || (x4(s).tour12?.promoter?.n ?? 0) >= 1),
    o('cal', 'Ver a agenda de shows (concorrência)', 'Check the show calendar (competition)', 'cal17'),
    o('fest', 'Olhar o circuito de festivais', 'Look at the festival circuit', 'festivals'),
    o('ten', 'Somar 10 shows agenciados', 'Book 10 shows in total', 'cp17-booking', (s) => (x4(s).tour12?.shows ?? []).length + (x4(s).tour12?.promoter?.n ?? 0) >= 10),
  ] },
  { id: 'festival', name: l('Dono de festival', 'Festival owner'), intro: l('Line-up, local, preço e a primeira edição.', 'Line-up, site, price and the first edition.'), objs: [
    o('page', 'Abrir seus festivais', 'Open your festivals', 'cp17-festival'),
    o('own', 'Ter um festival', 'Own a festival', 'cp17-festival', (s) => vlist(s, 'festival').length > 0),
    o('lineup', 'Montar um line-up com 3+ atrações', 'Build a line-up with 3+ acts', 'cp17-festival', (s) => vlist(s, 'festival').some((v) => (v.lineup ?? []).length >= 3)),
    o('edition', 'Realizar a primeira edição', 'Hold the first edition', 'cp17-festival', (s) => vlist(s, 'festival').some((v) => (v.editions ?? []).length >= 1)),
    o('profit', 'Ter uma edição "boa" ou "lendária"', 'Have a "solid" or "legendary" edition', 'cp17-festival', (s) => vlist(s, 'festival').some((v) => (v.editions ?? []).some((e: X4) => e.verdict === 'ok' || e.verdict === 'legend'))),
  ] },
  { id: 'venue', name: l('Casa de shows', 'Venue owner'), intro: l('Programação, bar e público fiel.', 'Programming, bar and regulars.'), objs: [
    o('page', 'Abrir sua casa e programação', 'Open your venue and programming', 'cp17-venue'),
    o('own', 'Ter uma casa de shows', 'Own a venue', 'cp17-venue', (s) => !!x4(s).venue12?.v || (x4(s).venues17?.own ?? []).length > 0),
    o('nights', 'Fechar 3 meses de programação', 'Run 3 months of programming', 'cp17-venue', (s) => (x4(s).venue12?.v?.hist ?? []).length >= 3),
    o('black', 'Ter um mês no azul', 'Have a month in the black', 'cp17-venue', (s) => (x4(s).venue12?.v?.hist ?? []).some((h: X4) => h.net > 0)),
  ] },
  { id: 'studio', name: l('Estúdio e produtor', 'Studio & producer'), intro: l('Horas vendidas, discos produzidos e assinatura sonora.', 'Hours sold, records produced and a sonic signature.'), objs: [
    o('page', 'Abrir estúdio e produção', 'Open studio and production', 'cp17-studio'),
    o('own', 'Ter um estúdio ou atuar como produtor', 'Own a studio or work as a producer', 'cp17-studio', (s) => vlist(s, 'studio').length > 0 || !!x4(s).studio12?.prod?.on),
    o('credit', 'Primeiro crédito de produção', 'First production credit', 'cp17-studio', (s) => (x4(s).studio12?.prod?.credits ?? []).length >= 1),
    o('prods', 'Conhecer os produtores reais', 'Meet the real producers', 'producers15'),
  ] },
  { id: 'publisher', name: l('Editora musical', 'Music publisher'), intro: l('Compositores, obras e cada execução.', 'Songwriters, works and every play.'), objs: [
    o('page', 'Abrir compositores e catálogo', 'Open songwriters and catalog', 'cp17-publisher'),
    o('writer', 'Contratar um compositor', 'Sign a songwriter', 'cp17-publisher', (s) => vlist(s, 'publisher').some((v) => (v.writers ?? []).length > 0)),
    o('place', 'Colocar uma obra com um artista', 'Place a song with an act', 'cp17-publisher', (s) => vlist(s, 'publisher').some((v) => (v.cat ?? []).length > 0)),
    o('rights', 'Entender sociedades e splits (Direitos)', 'Understand societies and splits (Rights)', 'rights18'),
  ] },
  { id: 'media', name: l('Dono de mídia', 'Media owner'), intro: l('Audiência, credibilidade e influência nas paradas.', 'Audience, credibility and chart influence.'), objs: [
    o('page', 'Abrir seus veículos', 'Open your outlets', 'cp17-media'),
    o('own', 'Ter um veículo', 'Own an outlet', 'cp17-media', (s) => vlist(s, 'media').length > 0),
    o('press', 'Ver imprensa e crítica', 'Check press and critics', 'media'),
    o('news', 'Acompanhar notícias e boatos', 'Follow news and rumors', 'news17'),
  ] },
  { id: 'platform', name: l('Plataforma', 'Platform'), intro: l('Catálogo, assinantes e algoritmo.', 'Catalog, subscribers and algorithm.'), objs: [
    o('page', 'Abrir sua plataforma', 'Open your platform', 'cp17-platform'),
    o('own', 'Lançar a plataforma', 'Launch the platform', 'cp17-platform', (s) => vlist(s, 'platform').length > 0),
    o('stream', 'Entender o pró-rata (Mídia › Streaming)', 'Understand pro-rata (Media › Streaming)', 'media'),
  ] },
  { id: 'screen', name: l('Trilhas e palco', 'Screen & stage'), intro: l('Encomendas, prazos e temas que tocam por anos.', 'Commissions, deadlines and themes that play for years.'), objs: [
    o('page', 'Abrir encomendas e trilhas', 'Open commissions and scores', 'cp17-screen'),
    o('comm', 'Aceitar a primeira encomenda', 'Accept the first commission', 'cp17-screen', (s) => (x4(s).screen18?.list ?? []).length >= 1),
    o('paid', 'Receber por uma trilha', 'Get paid for a score', 'cp17-screen', (s) => (x4(s).screen18?.earned ?? 0) > 0),
    o('nom', 'Ser indicado a um prêmio de trilha', 'Get nominated for a score award', 'cp17-screen', (s) => (x4(s).screen18?.noms ?? 0) >= 1),
  ] },
  { id: 'critic', name: l('Jornalismo', 'Journalism'), intro: l('Resenhas, furos e credibilidade.', 'Reviews, scoops and credibility.'), objs: [
    o('page', 'Abrir resenhas e redação', 'Open reviews and newsroom', 'cp17-critic'),
    o('rev', 'Publicar a primeira resenha', 'Publish your first review', 'cp17-critic', (s) => (x4(s).press18?.n ?? 0) >= 1),
    o('critics', 'Conhecer os críticos', 'Meet the critics', 'critics'),
    o('cred', 'Chegar a credibilidade 60', 'Reach credibility 60', 'cp17-critic', (s) => (x4(s).press18?.cred ?? 0) >= 60),
  ] },
];
/** Passos comuns a toda carreira (vêm antes). */
export const COMMON18: Obj18[] = [
  o('cockpit', 'Abrir o Cockpit e ler os próximos passos', 'Open the Cockpit and read next steps', 'cockpit'),
  o('agenda', 'Ver sua agenda (bolinhas do mês)', 'Check your agenda (monthly balls)', 'agenda17'),
  o('year', 'Completar o primeiro ano', 'Complete the first year', 'cockpit', (s) => yearsIn(s) >= 1),
];
export const track18 = (id: string): Track18 | undefined => TRACKS18.find((t) => t.id === id);

/** Estado de uma trilha: feito = estado da partida OU visita (área) OU já marcado antes (pegajoso). */
export function trackState18(s: GameState, id: string, visits: Record<string, number>, done: Record<string, number>): { obj: Obj18; ok: boolean }[] {
  const tr = track18(id);
  if (!tr) return [];
  return [...COMMON18, ...tr.objs].map((obj) => {
    const key = `${id}:${obj.id}`;
    let ok = !!done[key];
    if (!ok) { try { ok = obj.check ? obj.check(s) : !!visits[obj.area]; } catch { ok = false; } }
    return { obj, ok };
  });
}

// ---------------------------------------------------------------- dicas de primeira vez

export interface Tip18 { id: string; title: L; text: L; area?: string; gloss?: string; seen: (s: GameState) => boolean }
const tip = (id: string, title: [string, string], text: [string, string], seen: (s: GameState) => boolean, area?: string, gloss?: string): Tip18 => ({ id, title: l(...title), text: l(...text), seen, area, gloss });

export const TIPS18: Tip18[] = [
  tip('offer', ['Primeira proposta', 'First offer'], ['Uma proposta tem adiantamento, royalty, prazo e cláusulas. O adiantamento é recuperado dos royalties: alto demais e o artista nunca recebe — e fica infeliz.', 'An offer has advance, royalty, term and clauses. The advance is recouped from royalties: too high and the act never gets paid — and grows unhappy.'], (s) => s.offers.length > 0, 'market', 'recoup'),
  tip('clauses', ['Negociando cláusulas', 'Negotiating clauses'], ['Cada cláusula (360, opções, controle criativo, recuperação) muda a chance de aceite e o seu ganho. Passe o mouse no "por quê" da chance para ver termo a termo.', 'Each clause (360, options, creative control, recoupment) shifts acceptance chance and your take. Hover the chance "why" to see term by term.'], (s) => Object.values(s.contracts).some((c) => { const k = (c as { clauses18?: { pkg?: string } }).clauses18; return !!k && k.pkg !== 'legacy'; }), 'market', 'deal360'),
  tip('scandal', ['Primeiro escândalo', 'First scandal'], ['A reação depende da censura e religião do país, da imprensa local e do gênero. Abafar pode piorar (efeito Streisand); assumir cedo costuma custar menos.', 'The reaction depends on the country\'s censorship and religion, local press and genre. Hushing can backfire (Streisand effect); owning it early usually costs less.'], (s) => anyFact(s, ['scandal']), 'news17', 'streisand'),
  tip('rumor', ['Primeiro boato', 'First rumor'], ['Boatos são fatos com visibilidade parcial: podem ser verdade. Em Notícias e boatos você nega, assume, abafa, processa ou cala — cada um com risco.', 'Rumors are facts with partial visibility: they may be true. In News and rumors you deny, own it, hush, sue or stay silent — each with risk.'], (s) => facts(s).some((f) => f.visibility === 'rumor') || anyFact(s, ['rumor']), 'news17', 'rumor'),
  tip('feud', ['Primeira rixa', 'First feud'], ['Rixas escalam: farpas → diss → guerra de faixas → confronto. Mediar cedo é barato; deixar correr vende disco e arrisca violência.', 'Feuds escalate: jabs → diss → track war → showdown. Mediating early is cheap; letting it run sells records and risks violence.'], (s) => anyFact(s, ['feud_start', 'feud']) || anyMsg(s, (k) => k === 'feud18'), 'dm18', 'feud'),
  tip('scene', ['Primeira cena', 'First scene'], ['Cenas interativas aparecem em momentos-chave (prêmios, TV, tribunal). Suas escolhas mudam relações e fama; reveja no Álbum de cenas.', 'Interactive scenes appear at key moments (awards, TV, court). Your choices change relations and fame; replay them in the Scene album.'], (s) => (s.cutscenes ?? []).length > 0, 'scenes17'),
  tip('relic', ['Primeira relíquia', 'First relic'], ['Relíquias reais (instrumentos, fitas master) seguem a história: roubo, leilão, museu. Você pode arrematar e emprestar a exposições para ganhar prestígio.', 'Real relics (instruments, master tapes) follow history: theft, auction, museum. You can buy them and lend them to exhibitions for prestige.'], (s) => anyFact(s, ['relic']) || anyMsg(s, (k) => k.startsWith('relic')), 'lendas', 'relic'),
  tip('dm', ['O Mestre abriu um fio', 'The Master opened a thread'], ['O Diário do Mestre controla a tensão da história. Em clímax, NPCs agem mais e rixas escalam; na calmaria é a hora de arriscar.', 'The Master\'s journal drives story tension. In a climax NPCs act more and feuds escalate; in calm periods it is time to take risks.'], (s) => anyMsg(s, (k) => k === 'dm18') || anyFact(s, ['arc']), 'dm18'),
  tip('pressing', ['Atraso na prensagem', 'Pressing delay'], ['A fábrica não entrega a tempo. Adie, pague prioridade ou lance só digital até o disco chegar. Reservar cedo e ter contrato de capacidade evita isso.', 'The plant will not deliver on time. Delay, pay for priority or launch digital-only until stock arrives. Booking early and a capacity deal prevent it.'], (s) => anyMsg(s, (k) => k === 'supply_late' || k === 'supply_bump'), 'supply18', 'pd'),
  tip('postmortem', ['Primeiro post-mortem', 'First post-mortem'], ['12 semanas após o lançamento sai o previsto × realizado: alcance, retorno, conversão em fãs e campanha. O fator vermelho é o que corrigir no próximo.', '12 weeks after release comes forecast × actual: reach, retention, fan conversion and campaign. The red factor is what to fix next time.'], (s) => anyFact(s, ['release_review']) || anyMsg(s, (k) => k === 'review18'), 'long18', 'postmortem'),
  tip('capa', ['Revelação de potencial (CA/PA)', 'Potential revealed (CA/PA)'], ['Cada pessoa tem habilidade atual (CA) e um teto (PA) escondido. A faixa de estrelas estreita com olheiro e convivência; estrada, estúdio, aulas e mentor fazem crescer.', 'Everyone has current ability (CA) and a hidden ceiling (PA). The star range narrows with scouting and contact; road, studio, lessons and a mentor make them grow.'], (s) => anyMsg(s, (k) => k === 'ability18'), 'artists', 'capa'),
  tip('chart', ['Primeira entrada nas paradas', 'First chart entry'], ['Posição depende da metodologia da época (vendas, rádio, streams). Hype cai rápido: turnê e single seguinte seguram o disco.', 'Position depends on the era\'s methodology (sales, radio, streams). Hype fades fast: a tour and the next single hold the record up.'], (s) => anyFact(s, ['chart'], 'me'), 'charts', 'chartmeth'),
  tip('payola', ['Jabá à vista', 'Payola in sight'], ['Pagar por execução funciona — até vazar. Investigações vêm em ondas e o escândalo atinge selo e artista.', 'Paying for plays works — until it leaks. Probes come in waves and the scandal hits label and act.'], (s) => anyFact(s, ['payola']) || anyMsg(s, (k) => k === 'radio_payola' || k === 'radio18_leak'), 'media', 'payola'),
  tip('viral', ['Algo viralizou', 'Something went viral'], ['Viral de catálogo dura pouco: impulsione, faça remix oficial ou deixe correr. Decida rápido.', 'A catalog viral is short-lived: boost it, do an official remix or let it run. Decide fast.'], (s) => anyFact(s, ['viral']) || anyMsg(s, (k) => k === 'media18_viral'), 'media', 'remix'),
  tip('rights', ['Primeira disputa de direitos', 'First rights dispute'], ['Crédito disputado congela o dinheiro em caução até decidir. Splits limpos no lançamento evitam a caixa preta.', 'A disputed credit freezes the money in escrow until resolved. Clean splits at release avoid the black box.'], (s) => anyFact(s, ['credit_dispute', 'audit']) || anyMsg(s, (k) => k === 'rights18'), 'rights18', 'blackbox'),
  tip('stress', ['Estresse no limite', 'Stress at the limit'], ['Estresse junta saúde, cansaço, moral e pressão. Estourado vira recaída, esgotamento ou escândalo: dê folga, terapia ou corte agenda.', 'Stress combines health, fatigue, morale and pressure. Burst, it becomes relapse, burnout or scandal: give time off, therapy or cut the agenda.'], (s) => anyFact(s, ['stress', 'breakdown']), 'artists', 'stress'),
  tip('poach', ['Rival tentou levar alguém', 'A rival tried to poach someone'], ['Rivais aliciam artistas e equipe. Lealdade, promessas cumpridas e contrato com cláusulas certas seguram.', 'Rivals poach acts and staff. Loyalty, kept promises and the right clauses hold them.'], (s) => anyFact(s, ['poach']) || anyMsg(s, (k) => k === 'sess18_poach'), 'labels'),
  tip('award', ['Primeira premiação', 'First award'], ['Prêmios rendem vendas e prestígio. Júris evitam quem teve escândalo recente.', 'Awards bring sales and prestige. Juries avoid acts with a recent scandal.'], (s) => anyFact(s, ['award'], 'me'), 'awards'),
  tip('crime', ['O submundo bateu à porta', 'The underworld knocked'], ['Toda ação no Submundo mostra chance, risco de exposição, custo e gravidade. Polícia e imprensa leem os mesmos fatos.', 'Every Underworld action shows chance, exposure risk, cost and severity. Police and press read the same facts.'], (s) => anyFact(s, ['arrest', 'crime', 'theft'], 'me'), 'crime', 'rico'),
  tip('split', ['Banda em crise', 'Band in crisis'], ['Separações vêm de tensão na dinâmica: veja quem apoia e quem atrita antes que o porta-voz decida sair.', 'Splits come from tension in the dynamics: see who supports and who clashes before the spokesperson decides to leave.'], (s) => anyFact(s, ['split', 'exit'], 'me'), 'dyn18'),
];
export const tip18 = (id: string): Tip18 | undefined => TIPS18.find((t) => t.id === id);

/** Dicas cujo gatilho já aconteceu e que ainda não foram vistas (no máx. `max`). */
export function dueTips18(s: GameState, seen: Record<string, number>, max = 1): Tip18[] {
  const out: Tip18[] = [];
  for (const t of TIPS18) {
    if (seen[t.id]) continue;
    let ok = false;
    try { ok = t.seen(s); } catch { ok = false; }
    if (ok) { out.push(t); if (out.length >= max) break; }
  }
  return out;
}
