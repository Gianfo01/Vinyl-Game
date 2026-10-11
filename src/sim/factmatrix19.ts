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
  memory: 'ponte genérica de remember(): o conteúdo já é consumido pelo tipo de origem (tags mem:*), não pelo rótulo',
  agenda: 'registro da agenda (agenda17) para a linha do tempo/porquê; só leitura na interface (factsAbout)',
  hire: 'contratação: aparece na ficha da pessoa (factsAbout); sem reação sistêmica pretendida',
  fire: 'demissão: aparece na ficha da pessoa (factsAbout); o rancor já sai pelo holds17 no próprio agenda17',
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
  piracy: 'pirataria (crime17): efeito no mercado aplicado no crime17',
  road_fight: 'briga na estrada (live18): estresse e relações aplicados no live18',
  succession: 'sucessão (saga18): consumida pela própria saga e pela crônica',
  dispute: 'disputa de espólio (post18): efeito no próprio espólio',
  termination: 'rescisão (rights18): direitos voltam no próprio rights18',
  press: 'ação de imprensa do jogador (verbs18): efeito local',
  arc: 'batida de fio do dm18: o próprio fio é o consumidor (diário do mestre de drama)',
  audit: 'auditoria de royalties (rights18): dinheiro e relação aplicados no rights18; a dica do tutorial18 lê na interface',
  feud_start: 'início de rixa (feud18): a rixa é o próprio estado; dm18 já ouve `feud`',
  feud_end: 'fim de rixa (feud18): a rixa é o próprio estado',
  release_review: 'crítica do lançamento (review18): a nota já entra no lançamento; tutorial18 lê na interface',
  rumor: 'boato de crime (crime17): já nasce como boato no press9 pelo próprio crime17',
  tour_done: 'fim de turnê (live18): balanço aplicado no live18; tutorial18 lê na interface',
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
