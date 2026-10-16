import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { FACT_CAP, emitFact, facts17, recentFacts } from '../src/sim/facts17';
import { RESERVED19, WHITELIST19, consumed19, factMatrix19 } from '../src/sim/factmatrix19';
import { RNG_VERSION19, STREAMS19, rng19 } from '../src/sim/rng19';
import { APPEAL_CAT19, catAdj19, modCat19 } from '../src/sim/caps18';
import { applyMods, registerSimHook } from '../src/sim/ext4';
import { simulatePlayer } from '../src/sim/playbot16';
import { inboxKinds18 } from '../src/sim/inbox18';
import { P } from '../src/sim/sys/people/state';
import { STREAM_PAYOUT17 } from '../src/sim/market';
import { MEDIA18 } from '../src/sim/media18hook';
import { payout18 } from '../src/sim/sys/stream18';
import { press } from '../src/sim/sys/press9';
import { l } from '../src/data/world';
import type { GameState } from '../src/sim/types';

const SRC = path.join(__dirname, '..', 'src');
function files(d = SRC, out: string[] = []): string[] {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) files(p, out); else if (p.endsWith('.ts')) out.push(p); }
  return out;
}
/** varredura estática: tipos emitidos (emitFact), tipos da crônica (chron9 → ponte) e leitores (recentFacts/f.kind) */
function scan(): { emitted: Record<string, string[]>; chron: Set<string>; readers: Record<string, string[]> } {
  const emitted: Record<string, string[]> = {}, readers: Record<string, string[]> = {}, chron = new Set<string>();
  const add = (o: Record<string, string[]>, k: string, f: string) => { (o[k] ??= []).includes(f) || o[k].push(f); };
  for (const p of files()) {
    const t = fs.readFileSync(p, 'utf8'), f = path.basename(p);
    for (const m of t.matchAll(/emitFact\(\s*s\s*,\s*\{\s*kind:\s*'([a-z0-9_]+)'/g)) add(emitted, m[1], f);
    for (const m of t.matchAll(/chron\(\s*s\s*,\s*\{\s*k:\s*'([a-z0-9_]+)'/g)) chron.add(m[1]);
    for (const m of t.matchAll(/(?:recentFacts|factsAbout)\(\s*s\s*,[^)]{0,120}?\bkinds?:\s*(\[[^\]]*\]|'[a-z0-9_]+')/g)) for (const k of m[1].matchAll(/'([a-z0-9_]+)'/g)) add(readers, k[1], f);
    for (const m of t.matchAll(/\bf\.kind\s*[!=]==\s*'([a-z0-9_]+)'/g)) add(readers, m[1], f);
  }
  // ponte da crônica: tipos que viram fato com o mesmo nome (os do mapa KMAP viram outro tipo)
  const kmap = fs.readFileSync(path.join(SRC, 'sim/sys/bridge17.ts'), 'utf8').match(/const KMAP[^=]*=\s*\{([\s\S]*?)\n\};/)![1];
  const mapped = new Set([...kmap.matchAll(/([a-z0-9_]+):\s*'([a-z0-9_]+)'/g)].map((m) => m[1]));
  for (const k of [...chron]) if (mapped.has(k)) chron.delete(k); else add(emitted, k, 'chron9.ts');
  return { emitted, chron, readers };
}

describe('r19 0.1 — rng por sistema', () => {
  it('jogo novo tem rngVersion; todo sorteio persistente é por sistema (r31: sem caminho legado)', () => {
    const s = createGame(defaultConfig('r19-rng'));
    expect(s.rngVersion).toBe(RNG_VERSION19);
    const a = rng19(s, 'events'), b = rng19(s, 'events');
    a.next(); // o mesmo estado guardado no save: o segundo gerador continua de onde o primeiro parou
    const c = createGame(defaultConfig('r19-rng')); const ca = rng19(c, 'events'); ca.next();
    expect(b.next()).toBe(ca.next());
    expect(Object.keys(STREAMS19)).toContain('market');
  });
  it('um sorteio a mais no fluxo comum não muda os fluxos dos sistemas', () => {
    const a = createGame(defaultConfig('r19-ind'));
    const b = createGame(defaultConfig('r19-ind'));
    rng19(b, 'act').next(); rng19(b, 'act').next(); // "um evento a mais" num outro fluxo (ações do jogador)
    advanceMonth(a); advanceMonth(b);
    const st = (s: GameState) => (s as unknown as { x4: { rng19: { st: Record<string, number[]> } } }).x4.rng19.st;
    expect(st(b).market).toEqual(st(a).market);
    expect(st(b).dm18).toEqual(st(a).dm18);
    expect(st(b).ag18).toEqual(st(a).ag18);
  });
});

describe('r19 11.1 — volume de fatos', () => {
  it('chart só nos marcos: o 2º nº 1 de país no mês soma no primeiro', () => {
    const s = createGame(defaultConfig('r19-ch'));
    const n0 = facts17(s).f.length;
    const fa = emitFact(s, { kind: 'chart', actors: ['a1'], tags: ['good', 'mem:no1_country'], text: l('nº 1 em A', 'No. 1 in A') });
    const fb = emitFact(s, { kind: 'chart', actors: ['a1'], tags: ['good', 'mem:no1_country'], text: l('nº 1 em B', 'No. 1 in B') });
    emitFact(s, { kind: 'chart', actors: ['a1'], tags: ['good', 'chron:number1'], text: l('nº 1 mundial', 'world No. 1') });
    expect(fb).toBe(fa);
    expect(fa.data?.more).toBe(1);
    expect(facts17(s).f.length - n0).toBe(2);
  });
  it('anel por gravidade e tipo: enxurrada de um tipo não apaga o fato grave', () => {
    const s = createGame(defaultConfig('r19-ring'));
    const grave = emitFact(s, { kind: 'death', actors: ['x'], severity: 85, text: l('morte', 'death') });
    const rare = emitFact(s, { kind: 'law', actors: [], severity: 40, text: l('lei', 'law') });
    s.week += 200;
    for (let i = 0; i < FACT_CAP * 2; i++) { s.week += 1; emitFact(s, { kind: 'release', actors: [`r${i}`], severity: 30, text: l(`l${i}`, `r${i}`) }); }
    const f = facts17(s).f;
    expect(f.length).toBeLessThanOrEqual(FACT_CAP);
    expect(f.some((x) => x.id === grave.id)).toBe(true);
    expect(f.some((x) => x.id === rare.id)).toBe(true);
    expect(f.filter((x) => x.kind === 'release').length).toBeLessThan(FACT_CAP);
  });
});

describe('r19 0.2 — matriz fato → consumidores', () => {
  const { emitted, chron, readers } = scan();
  const rows = factMatrix19(Object.keys(emitted), readers, chron);
  it('todo tipo emitido tem consumidor ou está na lista justificada', () => {
    const orphan = rows.filter((r) => !consumed19(r) && !WHITELIST19[r.kind]).map((r) => `${r.kind} (${emitted[r.kind].join(',')})`);
    expect(orphan).toEqual([]);
    for (const [k, why] of Object.entries(WHITELIST19)) expect(why.length, k).toBeGreaterThan(20);
  });
  it('lista de exceções sem entradas velhas (tipo sumiu ou ganhou consumidor)', () => {
    const stale = Object.keys(WHITELIST19).filter((k) => !emitted[k] || consumed19(rows.find((r) => r.kind === k)!));
    expect(stale).toEqual([]);
  });
  it('relic, situation, rise, masterwork, hologram e echo têm ouvinte direto', () => {
    for (const k of ['relic', 'situation', 'rise', 'masterwork', 'hologram', 'echo']) {
      const r = rows.find((x) => x.kind === k) ?? factMatrix19([k])[0];
      expect(r.listeners.length, k).toBeGreaterThan(0);
    }
  });
  it('tipos reservados da Frente 9: não colidem e já têm consumidores previstos', () => {
    expect(Object.keys(RESERVED19).length).toBeGreaterThanOrEqual(39);
    expect(new Set(Object.values(RESERVED19).map((x) => x.sys)).size).toBe(13);
    // emitido (sistema já implementado) → precisa ter consumidor; ainda não emitido → só reservado
    for (const [k, v] of Object.entries(RESERVED19)) { if (emitted[k]) expect(consumed19(rows.find((r) => r.kind === k)!), k).toBe(true); expect(v.to.length, k).toBeGreaterThan(0); }
  });
  it('ouvintes novos agem: obra-prima vira manchete e fama', () => {
    const s = createGame(defaultConfig('r19-mw'));
    const a = Object.values(s.acts)[0];
    const fame = a.fame;
    emitFact(s, { kind: 'masterwork', actors: [a.id], severity: 60, text: l('Obra-prima de teste', 'Test masterwork') });
    expect(a.fame).toBeGreaterThan(fame);
    expect(press(s).hl.some((h) => h.t.pt === 'Obra-prima de teste')).toBe(true);
    expect(recentFacts(s, { kind: 'masterwork' }).length).toBe(1);
  });
});

describe('r19 0.4 — teto de appeal por família', () => {
  it('todas as fontes registradas têm família', () => {
    const ids = new Set<string>();
    for (const p of files()) for (const m of fs.readFileSync(p, 'utf8').matchAll(/registerMod\('appeal',\s*(?:'([^']+)'|`([^`$]+)\$)/g)) ids.add(m[1] ?? `${m[2]}x`);
    ids.delete('music'); // exemplo no comentário de ext4.ts
    const missing = [...ids].filter((id) => !modCat19('appeal', id));
    expect(missing).toEqual([]);
    expect(ids.size).toBeGreaterThanOrEqual(60);
    expect(Object.keys(APPEAL_CAT19).length).toBe(5);
  });
  it('retorno decrescente dentro da família; penalidade fica inteira', () => {
    expect(catAdj19('appeal', 1.15)).toBe(1);
    expect(catAdj19('appeal', 1.6)).toBeLessThan(1);
    expect(1.6 * catAdj19('appeal', 1.6)).toBeGreaterThan(1.4);
    expect(catAdj19('appeal', 0.7)).toBe(1);
    const s = createGame(defaultConfig('r19-ap'));
    expect(applyMods(s, 'appeal', 50).value).toBeGreaterThan(0);
  });
});

describe('r19 0.5 — streaming sem dupla contagem', () => {
  it('payout18 já inclui a base STREAM_PAYOUT17 e substitui (não multiplica) a tarifa antiga', () => {
    const s = createGame(defaultConfig('r19-st', { startYear: 2016 }));
    const base = Object.values(s.releases).find((r) => s.acts[r.actId])!;
    const rel = { ...base, owner: 'player', territories: [] } as typeof base;
    const k = payout18(s, rel).k;
    expect(MEDIA18.payout?.(s, rel, ['streaming'])).toBe(k);
    // a base aparece uma vez: k / base é só o produto dos ajustes (território^0,6 · diluição · DM · fazenda), perto de 1
    expect(k / STREAM_PAYOUT17).toBeGreaterThan(0.5);
    expect(k / STREAM_PAYOUT17).toBeLessThan(1.5);
  });
});

// ---------------------------------------------------------------- 11.9 cobertura da Caixa por era × carreira
/** Tipos que não aparecem com segurança em bots curtos (1 ano), com o motivo (levantamento: 6 bots de 3 anos, 1889–2015,
 *  selo/artista/híbrido — 25 de 74 tipos apareceram). Revisar quando um tipo novo entrar. */
const INBOX_RARE19: Record<string, string> = {
  songmkt27_gift: 'songmkt27: presente de canção só com laço de amizade/parceria com outro ato (7%/mês)',
  rv27_copy: 'rivals27: selo imitador copia um top 10 seu — bots curtos quase nunca emplacam top 10',
  deleg31: 'delegação única (r31 Q; antes dlg19 e policy18): exceções e pedidos só com alguma responsabilidade delegada com diretriz que trava (desligada por padrão)',
  m19_call: 'money19: banco chama a dívida só com empréstimo e covenant quebrado (3 trimestres no prejuízo ou dívida > receita de 12 meses)',
  m19_auc: 'money19: leilão só quando um selo NPC quebra (raro em bots curtos)',
  af19_suit: 'espólio processa pelos masters: exige morte de artista do seu elenco com masters retidos (raro em bots curtos)',
  af19_offer: 'proposta do espólio: só com artista morto do seu catálogo e legado alto (anos depois da morte)',
  gear19_offer: 'endosso de instrumento: artista do elenco com fama 40+ e sorteio de ~3%/mês (1930+)',
  c19_fest_skip: 'careers19: aviso de edição pulada só com festival próprio sem line-up a 3 meses (bots de selo não fundam festival)',
  // vistos às vezes em 1 ano (1 mensagem): exigir seria frágil a qualquer mudança de sorteio
  a18_rep: 'artista: relatório da gravadora só depois de assinar (depende do sorteio de ofertas)',
  analyst: 'relatório do analista: sem ação, vai para o boletim semanal (notify19) e não aparece como item próprio',
  market18: 'nota de mercado: informativa, agrupada no boletim semanal (notify19)',
  review18: 'balanço do ano: informativo, agrupado no boletim semanal (notify19)',
  lv19_hear: 'live19: audiência antitruste só existe se o jogador boicotar o gigante dos ingressos (bots não boicotam) e o caso for arquivado',
  lv19_rsd: 'live19: Record Store Day só a partir de 2008, em fevereiro, com disco próprio no catálogo',
  ct19_sign: 'contests19: contrato pronto do vencedor só para quem patrocinou ou produz o concurso (bots não patrocinam)',
  ch19_crisis: 'charity19: crise mundial só nos anos reais (1971, 1984–85, 2001, 2005, 2010, 2020) ou sorteada a ~1%/mês',
  follow19: 'carta enfileirada: só quando a Mesa já tem 6+ decisões (raro em bots de 1 ano)',
  era1889_patent: 'só 1889–1910 (guerra de patentes); 1 aparição por partida',
  ability18: 'relatório de potencial: depende do olheiro achar um jovem com PA alto',
  rivalmind18_pact: 'pacto entre rivais: sorteio raro da mente rival',
  a18_show: 'artista: convite de show depende de fama mínima',
  rights18: 'auditoria/direitos: só com catálogo com receita (2º ano em diante)',
  traj18: 'virada de trajetória: só após 2–3 lançamentos (visto em bots de 3 anos)',
  feud18: 'rixa: exige atrito acumulado entre atos (visto em 3 anos, 1889)',
  relic18_fake: 'relíquia falsa: só com mercado de relíquias aberto (visto em 3 anos)',
  media18_viral: 'viral de mídia: 1990+ e lançamento forte (visto em 3 anos, 1990/2005)',
  aw18_snub: 'esnobada em prêmio: exige indicação (visto em 3 anos, 1960 artista)',
  scn19_fit: 'figurino do tapete vermelho: exige indicado oficial seu aos Gramófonos (1959+, novembro)',
  a18_stmt: 'artista: declaração pública pedida após polêmica (visto em 3 anos)',
  supply_bump: 'cadeia física: choque de fornecimento aleatório (visto em 3 anos)',
  st18_rival: 'streaming 2015+: denúncia de fazenda rival, sorteio de 3,5%/mês (visto em 3 anos)',
  // situações que bots curtos não criam
  world18_invest: 'convite de investimento mundial: exige caixa alto e era de crise',
  disc18_more: 'descoberta: segunda etapa de uma pista aberta pelo jogador',
  disc18_hot: 'descoberta: rival disputando um nome que o jogador está seguindo',
  camps18_cut: 'camp de composição: corte só depois de um pitch aceito',
  reg19_raid: 'regions19: batida só em comuna declarada pelo jogador (opt-in, 1965+)',
  reg19_strike_warn: 'regions19: aviso de greve só em jun/1942 e nov/1947 (partidas que começam antes)',
  reg19_strike: 'regions19: greve de gravação só 1942–44 e 1948, sem acordo sindical',
  reg19_campaign: 'regions19: exige hit top 10 do jogador em agosto de ano de eleição (55%)',
  ses19_doc: 'session19: documentário só 15+ anos depois do fim de um coletivo com quem você gravou',
  wr19_ghost: 'writers19: aviso do ghostwriter só com rancor 60+ (meses de contrato e hits)',
  wr19_offer: 'writers19: oferta de canção de fora (20%/mês, exige compositor do gênero em outro selo)',
  wr19_plag: 'writers19: acusação de plágio só para hit top 5 do jogador',
  wr19_sue: 'writers19: chance de processar só com catálogo lançado original no gênero do hit alheio',
  sess18_revolt: 'sessão: revolta de músicos exige sessões longas e moral baixa',
  sess18_poach: 'sessão: rival tenta levar músico de estúdio contratado',
  supply_late: 'cadeia física: fábrica atrasada (fila cheia, grandes tiragens)',
  supply_bust: 'cadeia física: falência de fornecedor (raro)',
  supply_takedown: 'cadeia física: retirada de estoque por processo (raro)',
  deal_dev: 'deals18: proposta de desenvolvimento exige selo médio/grande',
  deal_imp: 'deals18: imprint exige reputação alta',
  deal_jv: 'deals18: joint venture exige caixa e reputação altas',
  st18_drop: 'streaming: queda de dependência só com catálogo grande no streaming',
  st18_down: 'streaming: derrubada só após fraude de streams do jogador',
  radio18_leak: 'rádio: vazamento antes do lançamento (raro, 1950+)',
  fans18: 'fãs: pedido do fã-clube exige fã-clube grande',
  fest18: 'festival: convite exige ato com fama de cartaz',
  regions18: 'regiões: seu gênero viajar para outro submercado (virada rara)',
  kpop18_mil: 'K-pop: serviço militar só com ídolo coreano no elenco',
  kpop18_suit: 'K-pop: processo de contrato-escravo só com ídolo coreano',
  kpop18_seven: 'K-pop: maldição dos 7 anos só com grupo de 7 anos de contrato',
  idols18_grad: 'idols japoneses: graduação só com grupo idol no elenco',
  idols18_kohaku: 'idols japoneses: convite do Kohaku só com ato japonês famoso',
  screen18_offer: 'cinema/TV: oferta de filme exige fama alta',
  screen18_ost: 'cinema/TV: trilha exige filme em produção',
  screen18_late: 'cinema/TV: atraso de estreia só com projeto em curso',
  ai18_fake: 'IA (2020+): voz falsa do seu artista',
  ai18_suit: 'IA (2020+): processo contra IA',
  press18_scoop: 'imprensa: furo só para quem tem veículo próprio (press18)',
  press18_bribe: 'imprensa: suborno só para quem é crítico/editor',
  press18_embargo: 'imprensa: embargo de selo só para quem tem veículo',
  press18_job: 'imprensa: convite de emprego na carreira de crítico',
  soc18_censor: 'sociedade: censura só em regimes/épocas com censor ativo',
  soc18_exile: 'sociedade: exílio só sob ditadura e artista engajado',
  soc18_home: 'sociedade: volta do exílio depende de exílio anterior',
  soc18_boycott: 'sociedade: boicote só após declaração polêmica',
  soc18_rent: 'sociedade: aluguel/despejo de espaço cultural (raro)',
  a18_info: 'artista: informação de bastidor do agente (contrato em negociação)',
  a18_ar: 'artista: A&R do selo NPC pede mudança (artista contratado)',
  a18_deliver: 'artista: cobrança de entrega de disco (contrato com selo NPC)',
  a18_buried: 'artista: disco engavetado pelo selo NPC',
  a18_drop: 'artista: dispensa pelo selo NPC após fracasso',
  a18_merge: 'artista: fusão do seu selo NPC',
  sh18_prop: 'sociedade com NPC: proposta exige artista com caixa e fama',
  sh18_fall: 'sociedade com NPC: rompimento exige sociedade ativa',
  campus18: 'Nosso mundo: obra/desastre só com obra própria iniciada',
  trib19_lab: 'tributos: só quando nasce tributo a um ato do seu catálogo (fama 40+ e original ausente)',
  trib19_art: 'tributos: só quando nasce tributo à sua própria banda (carreira de músico famosa)',
  trib19_renew: 'tributos: renovação um ano depois de licenciar um tributo',
  rev19_dec: 'sucesso tardio: faixa sua com 10+ anos precisa juntar calor 60 em usos de mídia',
  // r19 links19b (Frente 1, grupo B): cartas que dependem de inteligência, pacto, obra atrasada e desastre
  l19b_intel: 'intenção de rival revelada: exige espionagem ou analista 60+ com rival tenso',
  l19b_betray: 'traição de pacto: exige pacto ativo e calor 35+',
  l19b_delay: 'obra do campus atrasada: só com obra própria em andamento',
  l19b_ins: 'prédio danificado (incêndio/desastre): raro',
  // r19 T2 money-b (moneyb19): cartas que dependem de janela, aperto de caixa, ato insatisfeito ou banda famosa
  mb19_bid: 'lance por contrato: só na janela (jan, jul–ago) ou no aperto de caixa, com astro de fama 35+',
  mb19_mgr: 'empresário total: 5%/mês a partir de 1945, ato de fama 25–75',
  mb19_revolt: 'revolta contra o empresário total: só depois de meses com empresário total',
  mb19_junk: 'disco de cumprimento: ato com confiança < 25 e discos devidos',
  mb19_klein: 'briga de gestão: banda de 3+ com fama 35+ e masters no catálogo (4%/mês, 1955+)',
  // r19 market19a (T6, mercado A): cartas que dependem de patamar nacional, ação do jogador, era ou fusão grande
  mka19_cert: 'certificação nacional: disco seu precisa passar do patamar do país (ouro 35 mil+ unidades num mercado)',
  mka19_test: 'pesquisa de mercado: só quando o jogador encomenda um teste de faixa (o bot não encomenda)',
  mka19_ghost: 'faixas sem rosto: só 2015+, 35% por ano, uma vez a cada 3 anos',
  mka19_360: 'promotora 360: só 2007+ com ato próprio de fama 70+ e contrato acabando em até 1 ano',
  mka19_divest: 'leilão antitruste: só depois de fusão que passa do limiar do regulador',
  mka19_rush: 'corrida do ouro: cena na sua cidade ou com ato seu entrando na fase de corrida',
  fk19_ghost: 'banda falsa com o nome de um ato SEU: exige ato do selo famoso (55+) separado/em hiato ou cena em febre',
  fk19_whistle: 'cantor ameaça contar: só com voz-fantasma do jogador e risco 40+',
  zn19_coi: 'conflito de interesse: exige revista/fanzine próprio e lançamentos seguidos',
  // r19 Frente 7, mercado B (remix19/adsync19/score19/cancel19/insure19/naming19)
  rmx19_res: 'remix19: convite de residência só após remix que pegou ou nº 1 nas pistas de um ato seu (1975+)',
  rmx19_offer: 'remix19: DJ pede fracasso seu com 8+ anos (5%/mês, 1975+)',
  ad19_offer: 'adsync19: oferta de marca sorteada (~4%/mês por ato com fama 15+); bots curtos às vezes não veem',
  sc19_theme: 'score19: canção-tema exige ato com fama 30+ (≈3%/mês, no máximo 1 por trimestre)',
  sc19_needle: 'score19: needle drop sorteado (3%/mês) entre faixas suas com 1+ ano',
  cx19_wave: 'cancel19: onda só 2010+ e escândalo público de ato seu com fama 15+',
  cx19_back: 'cancel19: retorno só depois que uma onda contra ato seu acaba',
  ins19_risk: 'insure19: oferta da corretora só após colapso de astro seu (fama 35+) sem seguro',
  nm19_renew: 'naming19: renovação só quando vence um contrato de nome (3–5 anos)',
};
const RUNS19: [number, 'label' | 'artist'][] = [[1889, 'label'], [1960, 'artist'], [2010, 'label'], [2016, 'artist']];

// A cobertura completa (4 bots de 1 ano: era × carreira) é longa: roda com BALANCE_FULL=1. Sempre: a lista de exceções
// confere com os tipos registrados e um bot curto (3 meses, 2010, base pequena) entrega mensagens tipadas na Caixa.
const FULL19 = !!process.env.BALANCE_FULL;
describe('r19 11.9 — cobertura dos tipos da Caixa', () => {
  const collect = (runs: [number, 'label' | 'artist'][], years: number, db?: 'small') => {
    const seen: Record<string, number> = {};
    const ids = new Set<string>();
    registerSimHook('month', 'test:inbox19', (s) => { for (const m of P(s).inbox) { const k = m.ref?.k18; if (k && !ids.has(m.id)) { ids.add(m.id); seen[String(k)] = (seen[String(k)] ?? 0) + 1; } } });
    try { for (const [y, role] of runs) simulatePlayer(defaultConfig(`ib19-${y}`, { startYear: y, role, ...(db ? { dbSize: db } : {}) }), years, 'balanced'); }
    finally { registerSimHook('month', 'test:inbox19', () => {}); }
    return seen;
  };
  it('lista de exceções sem entradas velhas e com motivo', () => {
    const kinds = inboxKinds18();
    const stale = Object.keys(INBOX_RARE19).filter((k) => !kinds.includes(k));
    expect(stale).toEqual([]);
    for (const [k, why] of Object.entries(INBOX_RARE19)) expect(why.length, k).toBeGreaterThan(15);
  });
  it('bot curto entrega mensagens tipadas na Caixa', () => {
    const seen = collect([[2010, 'label']], 0.25, 'small');
    expect(Object.keys(seen).length).toBeGreaterThan(0);
  }, 120000);
  it.runIf(FULL19)('todo registerInboxKind aparece em bots curtos por era × carreira ou tem motivo', () => {
    const seen = collect(RUNS19, 1);
    const kinds = inboxKinds18();
    const never = kinds.filter((k) => !seen[k] && !INBOX_RARE19[k]);
    console.log('IB19 seen', JSON.stringify(seen), 'never', JSON.stringify(never));
    expect(never).toEqual([]);
  }, 900000);
});
