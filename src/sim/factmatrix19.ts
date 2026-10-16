// Rodada 19 (0.2) — MATRIZ FATO → CONSUMIDORES. Junta, para cada tipo de fato emitido, quem reage a ele:
//  • ouvintes diretos (onFact('kind')), lidos do barramento em tempo real (factListeners19);
//  • ouvintes curinga (onFact('*')) que filtram por um conjunto de tipos — declarados em WILDCARD19;
//  • leitores (recentFacts/factsAbout com `kind`/`kinds`, `f.kind === …`) — achados pelo teste na varredura do código;
//  • a crônica (chron9): todo fato que vem dela também concorre às manchetes do mês do press9.
// tests/r19-infra.test.ts falha se um tipo emitido não tiver consumidor nem estiver em WHITELIST19 (com motivo).
// RESERVED19 pré-registra os tipos dos 13 sistemas planejados da Frente 9 (plano19), com os consumidores previstos,
// para que nasçam já ligados à malha.

import { factListeners19 } from './facts17';

/** Ouvintes curinga e os tipos que eles realmente tratam (ver o arquivo citado). */
export const WILDCARD19: Record<string, string[]> = {
  /** dm18: fatos viram ganchos de fios dramáticos */
  'dm18:hooks': ['crime', 'scandal', 'affair', 'arrest', 'death', 'betrayal', 'poach', 'feud', 'statement', 'secret_exposed', 'hold_used', 'situation', 'split', 'exit', 'award', 'chart', 'law', 'shooting', 'fan_war', 'deal'],
  /** agency18: motivos dos NPCs (inveja, gratidão, rancor) */
  'agency18:motive': ['chart', 'award', 'signing', 'release', 'show', 'festival', 'rise', 'masterwork', 'masterpiece', 'legend', 'comeback', 'revival',
    'scandal', 'arrest', 'health', 'breakdown', 'rehab', 'addiction', 'stress', 'tour_cancel', 'case_ruling', 'poach', 'law', 'secret_exposed', 'blackmail',
    'plagiarism', 'hold_used', 'leak', 'crime', 'theft', 'favor', 'forgiven', 'breakup', 'split', 'feud', 'solo', 'marriage', 'birth', 'romance', 'death', 'exit', 'statement'],
  /** tutorial18 (interface): acende a dica de imprensa/boatos */
  tutorial18: ['scandal', 'rumor', 'feud', 'feud_start', 'relic', 'arc', 'release_review', 'chart', 'payola', 'viral', 'credit_dispute', 'audit', 'stress', 'breakdown',
    'poach', 'award', 'arrest', 'crime', 'theft', 'split', 'exit', 'show', 'tour_done'],
};
/** Ouvintes curinga genéricos (todo tipo com gravidade/visibilidade suficiente): não contam como consumidor específico. */
export const GENERIC19 = ['bridge17:press', 'cine18:mem', 'post18:hall'];

/** Tipos emitidos sem consumidor, com o motivo (revisar a cada rodada). */
export const WHITELIST19: Record<string, string> = {
  bail31: 'fiança paga pelo jogador na delegacia (under31): o efeito já sai na própria ação (a pessoa sai da cela, opinião e calor); o fato é o registro público no diário e no noticiário',
  look: 'aparência (look31): ensaio, transformação, corte, ícone, crítico — o efeito já sai na própria escolha (apelo, imagem, humor, opinião); o fato é o registro no diário e na ficha',
  look_rumor: 'boato de procedimento estético (look31): o próprio look31 decide a descoberta pela imprensa (vira secret_exposed); o fato é o registro do boato na ficha',
  editor: 'edição pelo editor de testes (r31/editor.ts): o fato é só registro — o diário o recebe pelo ouvinte central (diary) e a partida fica marcada em edit31; nenhum sistema deve reagir a uma edição',
  fans_region: 'notícia pública (terr20): mercado fora da região de origem passou de 25% dos fãs; registro na crônica/noticiário e factsAbout, sem reação sistêmica pretendida',
  memory: 'ponte genérica de remember(): o conteúdo já é consumido pelo tipo de origem (tags mem:*), não pelo rótulo',
  agenda: 'registro da agenda (agenda17) para a linha do tempo/porquê; só leitura na interface (factsAbout)',
  hire: 'contratação: aparece na ficha da pessoa (factsAbout); sem reação sistêmica pretendida',
  fire: 'demissão: aparece na ficha da pessoa (factsAbout); o rancor já sai pelo holds17 no próprio agenda17',
  crime_join: 'entrada de pessoa em organização (crimemem23): o efeito sai do estado de membros (rumores, holds, apelo), o fato é só registro e boato na ficha',
  crime_leave: 'saída de organização (crimemem23): o estado de membros já dispara as consequências; o fato vira linha do tempo e boato',
  crime_member: 'vínculo revelado (crimemem23): segredo que passou a rumor/público; reações saem de secrets23/links23 pelo estado, não pelo tipo do fato',
  secret23: 'segredo (secrets23): descoberto/vazado pelo próprio sistema de segredos, que já aplica escândalo, holds e stress; o fato é o registro visível',
  board27: 'reunião de diretoria (board27): os efeitos saem na própria decisão (caixa, hype, ordens, políticas, lealdade); o fato é o registro na linha do tempo',
  crisis27: 'crise com relógio (crisis27): o desfecho já aplica caixa, reputação, insolvência, datas e confiança; o fato é o registro na linha do tempo',
  cover_up: 'encobrimento no Submundo jogável (heist27): o efeito já sai no próprio plano (calor, provas, rancores, segredos); o fato é o registro na linha do tempo',
  scenario: 'abertura de cenário (scenarios17): marco da linha do tempo, não um acontecimento a reagir',
  run_end: 'fim de partida (start17): consumido pelo epitáfio/resumo, não por sistemas do mundo',
  doctrine: 'mudança de doutrina (paths18): efeito aplicado no próprio paths18',
  milestone: 'marco de caminho (paths18): efeito aplicado no próprio paths18',
  art_turn: 'virada artística (traj18): a trajetória já recalcula o apelo; fato é crônica',
  consent: 'consentimento de imagem (image17): o contrato de imagem já carrega o efeito',
  review: 'crítica de mídia (media17): a nota já entra em critic/apelo do lançamento',
  career: 'troca de carreira em mídia (media18): efeito aplicado no próprio media18',
  merch_drop: 'lançamento de merch (merch17): receita já no ledger; sem reação de terceiros',
  street_team: 'equipe de rua (fans18): efeito local nos fãs',
  playlist: 'playlist editorial (stream18): efeito local no streaming',
  venue_event: 'evento de casa de show (venues17): efeito local',
  tie: 'laço entre NPCs (crimenpc17): consumido pelo grafo social (social8), não pelo barramento',
  release_jail: 'saída da prisão (crime17): crônica; a pessoa volta pelo próprio crime17',
  road_fight: 'briga na estrada (live18): estresse e relações aplicados no live18',
  succession: 'sucessão (saga18): consumida pela própria saga e pela crônica',
  // r28 F8: 'dispute' saiu da lista — agora a cena dos herdeiros (ui/ps/cut28model.ts) lê o fato
  termination: 'rescisão (rights18): direitos voltam no próprio rights18',
  press: 'ação de imprensa do jogador (verbs18): efeito local',
  arc: 'batida de fio do dm18: o próprio fio é o consumidor (diário do mestre de drama)',
  audit: 'auditoria de royalties (rights18): dinheiro e relação aplicados no rights18; a dica do tutorial18 lê na interface',
  feud_start: 'início de rixa (feud18): a rixa é o próprio estado; dm18 já ouve `feud`',
  feud_end: 'fim de rixa (feud18): a rixa é o próprio estado',
  release_review: 'crítica do lançamento (review18): a nota já entra no lançamento; tutorial18 lê na interface',
  rumor: 'boato de crime (crime17): já nasce como boato no press9 pelo próprio crime17',
  // R29: 'tour_done' saiu da lista — relics29 ouve (turnê grande → jaqueta/credencial da turnê)
};

/** Tipos reservados dos 13 sistemas da Frente 9 (plano19) → consumidores previstos. Quando o sistema nasce e emite, o tipo
 *  precisa de consumidor (teste r19-infra). session19 e writers19 (onda 2) já emitem os seus. */
export const RESERVED19: Record<string, { sys: string; to: string[] }> = {
  tribute_born: { sys: 'tribute19', to: ['rights18', 'press18', 'fans18'] },
  tribute_licensed: { sys: 'tribute19', to: ['ledger18', 'rights18'] },
  tribute_sued: { sys: 'tribute19', to: ['crime17', 'press18', 'holds17'] },
  soundalike_hired: { sys: 'tribute19', to: ['live18', 'fans18', 'cine18'] },
  fake_farewell: { sys: 'tribute19', to: ['press18', 'scandal17'] },
  session_credit: { sys: 'session19', to: ['rights18', 'quality18'] },
  session_lawsuit: { sys: 'session19', to: ['holds17', 'crime17', 'screen18'] },
  session_star: { sys: 'session19', to: ['artist18', 'tribute19'] },
  cowrite_split: { sys: 'writers19', to: ['rights18', 'contracts18'] },
  ghostwriter_revealed: { sys: 'writers19', to: ['scandal17', 'press18', 'feud18'] },
  plagiarism_suit: { sys: 'writers19', to: ['crime17', 'agency18'] },
  remix_hit: { sys: 'remix19', to: ['stream18', 'revival19', 'fest18'] },
  white_label: { sys: 'remix19', to: ['scene17', 'hype17'] },
  dj_residency: { sys: 'remix19', to: ['venues17', 'careerpages17'] },
  revival_hit: { sys: 'revival19', to: ['fans18', 'sale17', 'tribute19', 'post18'] },
  late_cert: { sys: 'revival19', to: ['awards18', 'press9'] },
  catalog_rerelease: { sys: 'revival19', to: ['market', 'sale17'] },
  ad_sync: { sys: 'adsync19', to: ['license17', 'rights18', 'revival19'] },
  jingle: { sys: 'adsync19', to: ['ledger18', 'identity'] },
  sellout_backlash: { sys: 'adsync19', to: ['fans18', 'press18'] },
  score_hired: { sys: 'score19', to: ['screen18', 'hire17'] },
  needle_drop: { sys: 'score19', to: ['revival19', 'stream18'] },
  theme_award: { sys: 'score19', to: ['awards18', 'paths18', 'cine18'] },
  charity_show: { sys: 'charity19', to: ['holds17', 'cine18', 'identity'] },
  charity_single: { sys: 'charity19', to: ['market', 'press9'] },
  charity_scandal: { sys: 'charity19', to: ['scandal17', 'crime17'] },
  school_founded: { sys: 'schools19', to: ['campus18', 'discover18'] },
  prodigy_found: { sys: 'schools19', to: ['discover18', 'ability18'] },
  choir_alumni: { sys: 'schools19', to: ['contests19', 'regions18'] },
  zine_founded: { sys: 'zines19', to: ['press18', 'scene17'] },
  zine_scene: { sys: 'zines19', to: ['scenedefs17', 'hype17'] },
  critic_editor: { sys: 'zines19', to: ['press18', 'criticrel'] },
  conflict_interest: { sys: 'zines19', to: ['scandal17', 'press18'] },
  lipsync_exposed: { sys: 'fakes19', to: ['scandal17', 'awards18'] },
  ghost_band: { sys: 'fakes19', to: ['crime17', 'tribute19', 'law'] },
  ai_voice_fake: { sys: 'fakes19', to: ['ai18', 'rights18', 'crime17'] },
  award_revoked: { sys: 'fakes19', to: ['awards18', 'press9'] },
  contest_final: { sys: 'contests19', to: ['cine18', 'tv18'] },
  contest_winner: { sys: 'contests19', to: ['discover18', 'contracts18'] },
  judge_feud: { sys: 'contests19', to: ['feud18', 'press18'] },
  gear_endorse: { sys: 'gear19', to: ['ledger18', 'identity'] },
  signature_model: { sys: 'gear19', to: ['deals18', 'quality18'] },
  icon_instrument: { sys: 'gear19', to: ['relics18', 'post18'] },
};

/** R19 Frente 1 (ligações, grupo A + 11.7) — tipos novos: quem emite e quem ouve (sys/links19a.ts). */
export const LINKFACTS19: Record<string, { from: string; to: string[] }> = {
  estate_rights: { from: 'neural.ts (holograma, cofre, voz IA) via links19a', to: ['links19a:estate (post18 espólio, herdeiros, scandal17, manchete)'] },
  release_delayed: { from: 'supply18 (fila da fábrica) via links19a', to: ['links19a:delay (hype12, radio18, calendar19)'] },
  banned_song: { from: 'society18 (censura) via links19a', to: ['links19a:banned (pirataria world4, rádio pirata hype12, fama16)'] },
  fan_region: { from: 'fandom19 (fãs por região) via links19a', to: ['links19a:region (demanda de shows, circuitos18)'] },
  crowd_incident: { from: 'live18, fest12 via links19a', to: ['links19a:crowd (processo, lei de segurança, live18 normas)'] },
  video_banned: { from: 'media18', to: ['links19a:video (pirataria e culto)'] },
  echo: { from: 'decide18', to: ['links19a:echo (cena curta cine18)'] },
};

/** Ligações da Frente 1, grupo B (sys/links19b.ts): tipos novos → ouvintes (todos com efeito real). */
export const LINKS19B: Record<string, { sys: string; to: string[] }> = {
  session_mark: { sys: 'links19b', to: ['links19b:session (moral do elenco / confiança do ato)'] },
  fx_crisis: { sys: 'links19b', to: ['links19b:fx (caixa dos selos do submercado, embalo dos atos de lá, diário de regions18, manchete)'] },
  rival_intel: { sys: 'links19b', to: ['links19b:intel (carta: pacto, vazar, observar)'] },
  pact_betrayal: { sys: 'links19b', to: ['links19b:betray (calor da rivalidade, carta: processar, retaliar, perdoar)'] },
  campus_invest: { sys: 'links19b', to: ['links19b:campus (desbloqueio decide18 → quality18/discover18, lealdade da equipe)'] },
  insurance_claim: { sys: 'links19b', to: ['links19b:ins (prêmio do seguro)'] },
  jury_nod: { sys: 'links19b', to: ['links19b:jury (reputação artística, manchete)'] },
  talent_race: { sys: 'links19b', to: ['links19b:race (calor com o selo rival)'] },
  pa_bet: { sys: 'links19b', to: ['links19b:pabet (inspiração da banda)'] },
};

/** r19 onda 3 (T1 money-a, `sys/money19.ts`): fatos novos e quem ouve. */
export const MONEY19A: Record<string, { sys: string; to: string[] }> = {
  debt_called: { sys: 'money19', to: ['money19:called (confiança do elenco, calor do rival abutre, manchete no pedido de falência)'] },
  label_bankrupt: { sys: 'money19', to: ['money19:auction (abre o leilão de masters, carta na Caixa, manchete)'] },
  master_auction: { sys: 'money19', to: ['money19:won (calor com quem venceu você, risco de regravação, reputação comercial)'] },
  rerecord_vow: { sys: 'money19', to: ['money19:vow (fãs escolhem um lado: mobilização/embalo; mágoa e reputação se os masters são seus)'] },
  rofr_used: { sys: 'money19', to: ['money19:rofr (confiança do ato, reputação com artistas)'] },
  bond_issued: { sys: 'money19', to: ['money19:bond (notícia na bolsa, reputação comercial)'] },
  bond_rating: { sys: 'money19', to: ['money19:rating (notícia na bolsa, reputação institucional)'] },
  bond_default: { sys: 'money19', to: ['money19:default (credores executam os masters → leilão, crédito fechado)'] },
  rate_shift: { sys: 'money19', to: ['money19:rates (dívida dos selos NPC, notícia na bolsa)'] },
};

/** R19 Frente 6 (T5, sys/regions19.ts + schools19.ts): tipos novos → ouvintes (todos com efeito real). schools19 emite os reservados. */
export const REG19: Record<string, { sys: string; to: string[] }> = {
  industry_born: { sys: 'regions19', to: ['regions19:born (gosto do submercado regions18, manchete)'] },
  sound_clash: { sys: 'regions19', to: ['regions19:clash (fama dos atos de reggae, fama16 na Jamaica, regions18)'] },
  street_hit: { sys: 'regions19', to: ['regions19:street (fama/embalo; royalties "de rua" → confiança −)'] },
  allstars_show: { sys: 'regions19', to: ['regions19:allstars (fãs, fama16 em Porto Rico, regions18 Caribe, manchete)'] },
  industry_suit: { sys: 'regions19', to: ['regions19:suit (reputação institucional, manchete)'] },
  commune_founded: { sys: 'regions19', to: ['regions19:commune (calor do regime soc18, estresse, Ligações do mês)'] },
  commune_raid: { sys: 'regions19', to: ['regions19:raid (manchete, fama16 em casa, lealdade fans18)'] },
  visa_denied: { sys: 'regions19', to: ['regions19:visa (estresse, fama16 no país, Ligações do mês)'] },
  radio_session: { sys: 'regions19', to: ['regions19:session (fama16 no Reino Unido)'] },
  strike_settled: { sys: 'regions19', to: ['regions19:union (confiança do elenco, manchete)'] },
  campaign_song: { sys: 'regions19', to: ['regions19:campaign (estresse no protesto, manchete)'] },
};

/** R19 onda 3, T6 (Frente 7, mercado A; sys/market19a.ts): tipos novos → ouvintes. `scene_boom`/`scene_bust` também
 *  alimentam a cadeia 6 (zines19/fakes19 da T9 ouvem pelo nome). */
export const MARKETA19: Record<string, { sys: string; to: string[] }> = {
  cert_award: { sys: 'market19a', to: ['market19a:cert:press (press9, fama)', 'market19a:cert:value (prestígio do sale17, vitrine)', 'market19a:cert:revival (revival19)', 'GRAMO_ADJ (júri)'] },
  track_test: { sys: 'market19a', to: ['market19a:test (confiança do ato; vazamento → embalo)'] },
  ghost_tracks: { sys: 'market19a', to: ['market19a:ghost:press (manchete)', 'market19a:ghost:artists (reputação, confiança do elenco)'] },
  star_360: { sys: 'market19a', to: ['market19a:360 (manchete, reputação de quem perdeu a estrela)'] },
  antitrust_remedy: { sys: 'market19a', to: ['market19a:anti (manchete, reputação da major)'] },
  scene_boom: { sys: 'market19a', to: ['market19a:boom (manchete, gênero em alta)', 'zines19/fakes19 (cadeia 6, T9)'] },
  scene_bust: { sys: 'market19a', to: ['market19a:bust (gênero cai, calor da cena ×0,5)', 'zines19/fakes19 (cadeia 6, T9)'] },
};

/** Frente 5 (onda 3, T4): ao vivo e temporada (sys/live19.ts) e crises (sys/charity19.ts) — tipos novos → ouvintes. */
export const LIVE19: Record<string, { sys: string; to: string[] }> = {
  antitrust_ruling: { sys: 'live19', to: ['live19:ruling (taxa do gigante do live18, lealdade fans18, promotores tour12, manchete)'] },
  free_fest: { sys: 'live19', to: ['live19:freefest (fãs e mobilização fans18, fama, discover18 palco aberto, manchete)'] },
  rsd_exclusive: { sys: 'live19', to: ['live19:rsd (superfãs fandom19, reputação com artistas, manchete)'] },
  world_crisis: { sys: 'charity19', to: ['charity19:crisis (carta ao jogador; megashow de outro selo; manchete)'] },
};

/** R19 onda 3 (T3, sys/afterlife19.ts + gear19.ts): tipos novos do pós-vida → ouvintes. */
export const AFTERLIFE19: Record<string, { sys: string; to: string[] }> = {
  estate_contract: { sys: 'afterlife19', to: ['af19:contract (opinião dos herdeiros, Ligações, manchete)'] },
  estate_suit: { sys: 'afterlife19', to: ['af19:suit (fama, estresse do ato, manchete)'] },
  estate_offer: { sys: 'afterlife19', to: ['af19:offer (legado do espólio post18)'] },
  estate_partner: { sys: 'afterlife19', to: ['af19:partner (sociedade shared18: herdeiro e oferta de venda)'] },
  arena_open: { sys: 'afterlife19', to: ['af19:arena (reputação comercial, manchete)'] },
  avatar_residency: { sys: 'afterlife19', to: ['af19:residency (fama, lealdade dos fãs fans18, manchete)'] },
};

export interface FactRow19 { kind: string; listeners: string[]; wildcard: string[]; readers: string[]; chron: boolean; why?: string }

/** Monta a matriz para os tipos emitidos (`readers`: tipo → arquivos que leem; `chron`: tipos que passam pela crônica). */
export function factMatrix19(emitted: string[], readers: Record<string, string[]> = {}, chron: Set<string> = new Set()): FactRow19[] {
  const ls = factListeners19();
  return [...new Set(emitted)].sort().map((kind) => ({
    kind,
    listeners: ls.filter((x) => x.kind === kind).map((x) => x.id),
    wildcard: Object.entries(WILDCARD19).filter(([id, ks]) => ks.includes(kind) && ls.some((x) => x.id === id)).map(([id]) => id),
    readers: readers[kind] ?? [],
    chron: chron.has(kind),
    ...(WHITELIST19[kind] ? { why: WHITELIST19[kind] } : {}),
  }));
}
export const consumed19 = (r: FactRow19): boolean => r.listeners.length + r.wildcard.length + r.readers.length > 0 || r.chron;

/** R19 T2 money-b (sys/moneyb19.ts): mercado de contratos, empresário total, disco de cumprimento, briga de gestão. */
/** Rodada 19 (onda 5, B.5): delegação por carreira (budget19). */
export const BUDGET19: Record<string, { sys: string; to: string[] }> = {
  deleg_exc: { sys: 'budget19', to: ['budget19:deleg (mensagem "A equipe precisa de você" na Caixa; exceção no registro de automação da tela de delegação)'] },
};
export const MONEYB19: Record<string, { sys: string; to: string[] }> = {
  contract_sold: { sys: 'moneyb19', to: ['moneyb19:sold (reputação com artistas, confiança do elenco, calor do comprador, diário, manchete)'] },
  sale_regret: { sys: 'moneyb19', to: ['moneyb19:regret (reputação comercial, diário "arrependimento", manchete)'] },
  release_clause: { sys: 'moneyb19', to: ['moneyb19:clause (calor da rivalidade, reputação, manchete)'] },
  total_manager: { sys: 'moneyb19', to: ['moneyb19:mgr (embalo e confiança do ato, Ligações do mês)'] },
  manager_exposed: { sys: 'moneyb19', to: ['moneyb19:exposed (scandal17 dinheiro, manchete)'] },
  junk_record: { sys: 'moneyb19', to: ['moneyb19:junk (moral da banda, manchete)'] },
  name_protest: { sys: 'moneyb19', to: ['moneyb19:name (fama −, núcleo de fãs +, manchete)'] },
  mgmt_takeover: { sys: 'moneyb19', to: ['moneyb19:takeover (moral/estresse da minoria, manchete)'] },
  mgmt_split: { sys: 'moneyb19', to: ['moneyb19:split (feud18 entre a banda e a dissidência, manchete)'] },
};

/** R19 T8 (sys/history19.ts): marcos da história 1926–2026. */
export const HIST19: Record<string, { sys: string; to: string[] }> = {
  milestone_turn: { sys: 'history19', to: ['history19:world (manchete press9 + embalo dos atos de NPC do estilo; crise tira embalo)'] },
  real_history: { sys: 'history19 (escolha no cartão do marco)', to: ['realhist19:diary (memória importante no Diário)'] },
};

/** R19 Frente 7, mercado B (M20, M17, M4, M30): tipos novos → ouvintes (todos com efeito real). */
export const MARKETB19: Record<string, { sys: string; to: string[] }> = {
  cancel_wave: { sys: 'cancel19', to: ['cancel19:fans (facções fans18, haters)', 'adsync19:clause (campanhas canceladas, 25% de volta)', 'naming19:cancel (marca sai do nome da casa/festival)'] },
  cancel_comeback: { sys: 'cancel19', to: ['cancel19:back (fama, fãs, lealdade, manchete)'] },
  keyman_claim: { sys: 'insure19', to: ['insure19:heirs (prêmio reajustado; espólio post18: união e herdeiros)'] },
  culture_shift: { sys: 'culture19', to: ['culture19:staff (lealdade da equipe, confiança do elenco, manchete)'] },
  naming_deal: { sys: 'naming19', to: ['naming19:rep (reputação da casa/festival, manchete)'] },
  naming_pulled: { sys: 'naming19', to: ['naming19:back (nome antigo volta, manchete)'] },
};

/** R19 Frente 8 (onda 4, sys/ux19.ts): viradas de década/era e metas da era → ouvintes. */
export const UX19: Record<string, { sys: string; to: string[] }> = {
  era_turn: { sys: 'ux19', to: ['ux19:era (manchete press9 + Diário; a interface abre o cartão da virada)'] },
  era_goal: { sys: 'ux19', to: ['ux19:goal (moral do elenco +2, Diário)'] },
};

/** R19 onda 5, A (sys/careers19.ts, sys/intra19.ts): carreiras que sustentam a partida e economia interna. */
export const CAREERS19: Record<string, { sys: string; to: string[] }> = {
  mandate: { sys: 'careers19 (cartão de renovação do mandato)', to: ['careers19:mandate (boca a boca: confiança dos outros clientes)'] },
  fest_ground: { sys: 'careers19 (passo de terreno do festival)', to: ['careers19:ground (expectativa da próxima edição, cena da cidade)'] },
  house_deal: { sys: 'intra19 (serviço entre negócios seus a preço de mercado ou com desconto da casa)', to: ['intra19:house (reputação com artistas cai com desconto da casa no próprio elenco)'] },
};

/** R20c (N3, sys/exch20.ts e sys/union20.ts): residência entre cenas e negociação coletiva → ouvintes. */
export const R20C: Record<string, { sys: string; to: string[] }> = {
  scene_residency: { sys: 'exch20 (residência de ato/produtor em outra cena)', to: ['exch20:rel (relação com a cena anfitriã +1)'] },
  union_deal: { sys: 'union20 (acordo/meio-termo com a entidade)', to: ['union20:deal (próxima pauta adiada)'] },
  union_clash: { sys: 'union20 (fora do sindicato / locaute)', to: ['union20:clash (próxima pauta antecipada)', 'exch20:union (relação com todas as cenas −5)'] },
};

/** R27 AUD2 (sys/aud27/): tipos que só o emissor ouvia → consumidores de fora (e choques macro que chegam no dinheiro). */
export const AUD2_27: Record<string, string[]> = {
  tribute_born: ['reach27:tribute (fãs do original, embalo, manchete, reputação comercial do dono)'],
  tribute_licensed: ['reach27:licensed (confiança do ato seu, reputação com artistas)'],
  tribute_sued: ['reach27:sued (reputação com artistas, fãs do original)'],
  cert_award: ['reach27:cert (bolsa10 do dono, confiança do ato, mágoa do rival — rivals27)'],
  cowrite_split: ['reach27:split (moral/ressentimento da banda, relação com o líder)'],
  zine_founded: ['reach27:zine (calor da cena — scenes27, embalo dos seus atos da cidade)'],
  ghost_band: ['reach27:ghost (embalo e fãs do ato real)'],
  contest_winner: ['reach27:contest (mercado corteja o vencedor — world18, cena)'],
  judge_feud: ['reach27:judge (simpatia, fama do jurado, relação dos líderes)'],
  choir_alumni: ['reach27:choir (embalo, cena local)'],
  legend: ['reach27:legend (fãs, bolsa do dono, reputação)'],
  revival_hit: ['reach27:revival (bolsa do dono, confiança, cena)'],
  catalog_rerelease: ['reach27:rerelease (núcleo de fãs)'],
  critic_editor: ['critic27:editor (relação com o crítico)'],
  conflict_interest: ['critic27:conflict (relação com todos os críticos)'],
  payola: ['critic27:payola (críticos se afastam)'],
  rate_shift: ['macro27:rates (juros dos empréstimos flutuantes, bolsa, fundos do goods8)'],
  bond_default: ['macro27:default (sua ação, juros)'],
  label_bankrupt: ['macro27:bankrupt (ação do selo e do setor)'],
  fx_crisis: ['macro27:fx (bolsa do submercado, estrada mais cara 12 meses, fundo de ações)'],
};
