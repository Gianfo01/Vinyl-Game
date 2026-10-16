// Rodada 19 (0.1) — UM FLUXO DE SORTEIO POR SISTEMA. Cada chave tem seu próprio estado sfc32 (semeado por
// seed+chave e guardado no save em s.x4.rng19), então o mercado, os eventos e o diretor sorteiam sempre a mesma
// sequência, não importa o que os outros fizeram.
// Rodada 31 (W0-RNG): o fluxo único antigo (`rngOf`/`s.rng`) e o caminho de save antigo foram removidos — toda
// sorte persistente passa por aqui, com a chave registrada em STREAMS19. Sorte pura por chave continua sendo
// `Rng.fromSeed(\`${s.config.seed}|...\`)`.
//
//   const r = rng19(s, 'events');   // fluxo persistente da chave
//
// Módulo puro (só ext4 e core/rng): importável de qualquer lugar sem ciclo.

import { Rng, seedState, type RngState } from '../core/rng';
import { registerExt4 } from './ext4';
import type { GameState } from './types';

/** Versão do esquema de sorteio gravada em s.rngVersion e no envelope do save (19 = um fluxo por sistema). */
export const RNG_VERSION19 = 19;
export interface Rng19State { st: Record<string, RngState> }
declare module './ext4' { interface Ext4 { rng19: Rng19State } }
registerExt4('rng19', () => ({ st: {} }));

/** Chaves em uso (documentação + teste): quem tem fluxo próprio. */
export const STREAMS19: Record<string, string> = {
  money19: 'dívida e catálogo: leilões de masters, juras de regravação, banco x selos NPC (money19)',
  events: 'storyteller: quais eventos/decisões aparecem no mês (events.ts)',
  decide: 'resolução das opções escolhidas nas decisões (events.ts resolveDecision)',
  director: 'diretor de arcos e lembranças (director.ts)',
  market: 'ruído semanal das paradas (market.ts marketWeek)',
  launch: 'sorte do lançamento no apelo (market.ts computeAppeal)',
  dm18: 'mestre de drama: fases e fios (dm18)',
  sit17: 'situações do mês (situations17)',
  ag18: 'agência dos NPCs (agency18)',
  disc18: 'demos e descobertas do mês (discover18)',
  tribute19: 'tributos e covers: nascimentos, sósia, despedida falsa, tribunal (tribute19)',
  revival19: 'sucesso tardio: usos em mídia, decisão de NPC, vendas da onda (revival19)',
  ses19: 'músicos de estúdio: hits alheios, documentários, processos e carreiras (session19)',
  wr19: 'compositores: ghostwriters, ofertas de canções, plágio (writers19)',
  links19a: 'ligações R19 grupo A: tragédia em festival lotado (links19a)',
  mb19: 'mercado de contratos: lances, cláusulas pagas, empréstimos, empresário total, disco de cumprimento, briga de gestão (moneyb19)',
  reg19: 'regiões e política: batidas na comuna, clashes, versões, vistos, campanhas (regions19)',
  sch19: 'celeiros: coros que formam cantores, gospel→soul (schools19)',
  live19: 'ao vivo e temporada: audiência antitruste, boicote de NPC, festival gratuito (incidente), descoberta no palco aberto (live19)',
  charity19: 'beneficentes: crises sorteadas, recrutamento de NPC, rivais no palco, dinheiro que some (charity19)',
  contests19: 'concursos de rádio/TV: inscritos, notas do júri, rixas de jurado (contests19)',
  af19: 'pós-vida: processos e propostas do espólio, residências de avatares, prêmios póstumos (afterlife19)',
  gear19: 'equipamento: ofertas de endosso, modelo-assinatura, herança do instrumento-ícone (gear19)',
  l19b: 'malha de ligações B: crises cambiais sorteadas, bônus de descoberta do campus, corrida por talento, traição de pactos (links19b)',
  mka19: 'mercado A: erro dos testes de faixa, vazamentos, faixas sem rosto, saídas 360, leilões antitruste, ciclo das cenas (market19a)',
  zn19: 'fanzines e imprensa: nascimento de fanzines, críticos que viram editores, conflito de interesse (zines19)',
  fk19: 'fraudes: dublagem exposta, bandas-fantasma, vozes de IA, processos (fakes19)',
  remix19: 'remix de catálogo, white labels, pedidos de DJs e remixes de NPCs (remix19)',
  adsync19: 'ofertas de marcas, contraproposta e licenças de NPCs (adsync19)',
  score19: 'canções-tema, bilheteria, indicações e needle drops (score19)',
  cancel19: 'ondas de cancelamento: resposta de NPCs e contra-ataque (cancel19)',
  culture19: 'cultura caótica: erros de metadados e vazamentos (culture19)',
  dlg19: 'delegação por carreira: renovações de mandato feitas pela equipe (budget19)',
  exch20: 'residência de intercâmbio entre cenas: convites, ecos e parcerias com músicos locais (exch20)',
  union20: 'negociação coletiva de músicos de estúdio e equipe de estrada: pautas, greves e locautes (union20)',
  r21: 'funções múltiplas por pessoa: quem abre selo, empresaria ou cria festival (roles21)',
  // r31 (W0-RNG): chaves que substituíram o fluxo único antigo (rngOf / s.rng)
  world: 'geração do mundo inicial: datas das tecnologias, gêneros, gravadoras, artistas e pessoas (worldgen)',
  tick: 'motor da semana e do mês: dias, abertura do mês e os sistemas que recebem o sorteio do motor (tick)',
  act: 'ações do jogador: botões das telas, respostas, ofertas e os robôs que jogam no lugar dele (ui, bots, testes)',
  contracts: 'renovação de contrato: talento novo que surge na renovação (contracts renewContract)',
  scout: 'olheiros: viés inicial da leitura de um artista recém-observado (scouting)',
  dossier8: 'dossiê: ruído de cada leitura nova sobre um artista (dossier8)',
  scenes4: 'cenas locais: talento que aparece para o selo que bancou a cena (world4/scenes)',
  bonds9: 'laços: banda nova formada a partir de amizades, quando o chamador não passa sorteio (bonds9)',
};

function stream(s: GameState, key: string): Rng {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.rng19 ??= { st: {} }) as Rng19State;
  st.st ??= {};
  // o array do estado é o mesmo do save: Rng.next muta no lugar
  return new Rng((st.st[key] ??= seedState(`${s.config.seed}|rng19|${key}`)));
}

/** Gerador persistente do sistema `key` (registre a chave em STREAMS19). */
export function rng19(s: GameState, key: string): Rng {
  return stream(s, key);
}

/** Retrato (JSON) do estado de sorteio — de todos os fluxos, ou só da chave `key`. Para testes de "explorar não sorteia". */
export function rngSnapshot19(s: GameState, key?: string): string {
  const st = ((s as unknown as { x4?: { rng19?: Rng19State } }).x4?.rng19?.st) ?? {};
  return JSON.stringify(key ? st[key] ?? null : Object.keys(st).sort().map((k) => [k, st[k]]));
}
