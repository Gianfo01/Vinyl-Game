// Sistemas da rodada 4, na ordem em que entram no tick (a ordem importa para o determinismo).
import './music';
import './creation';
import './people';
import './industry';
import './world4';
import './scenes';
import './live';
import './talent';
import './life';
import './temper';
import './persona';
import './cards6';
import './capital';
import './hq6';
import './intrigue';
import './charts7';
import './instruments';
import './realworld';
import './lifecycle7';
import './furnish';
import './custom7';
import './vices';
import './songsale';
import './agenda7';
import './warmup8';
import './fests8';
import './ceremonies8';
import './relevance8';
import './goods8';
import './mapx8';
import './explain8';
import './project8';
import './identity';
import './sound';
// Rodada 8: relações entre artistas, feats negociados, participações em selos e herdeiros.
import './social8';
import './stakes8';
import './feats8';
import './heirs8';
import './crew8';
import './route8';
import './consent8';
import './eras8';
import './pacing8';
import './hq8';
import './identity8';
import './audience8';
import './rivals8';
import './stories8';
// Rodada 9: laços duradouros entre artistas e movimentos completos.
import './bonds9';
import './movements9';
import './rights8';
import './dossier8';
// Rodada 10: vida pessoal (eventos mensais), política e religião.
import './beliefs10';
import './lifeevents10';
// Rodada 9: prestígio dos selos e empreendimentos (festival, editora, estúdio, agência, mídia, streaming, gestão).
import './standing9';
import './ventures9';
import './tour12';
import './studio12';
// Rodada 11: ofício de empresário (metas, turnês, propostas, imagem, conflitos, rivais) e scouting com névoa.
import './manager11';
import './scout11';
// Rodada 9: mundo vivo — crônica (Lendas), alma das pessoas, relíquias, boatos e jornal, história prévia.
import './pace9';
import './chron9';
import './soul9';
import './relics9';
import './press9';
import './world9';
import './rockhall9';
// Rodada 9: novidades do ano no noticiário (nada do futuro aparece nas telas).
import './novelty9';
// Rodada 10: bolsa de valores (ações de selos, plataformas, mídia e fabricantes) e aluguel só de imóveis próprios.
import './bolsa10';
import './leaders10';
import './offers12';
import './explain12';
// Rodada 12: carreiras de editora, mídia e plataforma.
import './ventures12';
import './media12';
import './platform12';
// Rodada 12: estrutura da empresa x era (reorganização) e cenas locais como redes (filiais escolhem parceiros).
import './eras12';
import './scenes12';
// Rodada 12: carreiras (atividades, origem, ambição, herdeiro), mercado de serviços de NPCs e empresário com confiança.
import './careers12';
import './services12';
import './manager12';
// Rodada 12: projeto musical como centro (intenção, compromissos, problemas, próximo passo) e estúdio sob medida.
import './recipe12';
import './project12';
import './rivals12';
// Rodada 12: arcos de personagem (memória → decisão), vida pessoal que cruza com o selo e história do selo.
import './arcs12';
import './life12';
import './story12';
// Rodada 12: dono de festival (festival unificado: Empreendimentos + terreno) e dono de casa de shows.
import './fest12';
import './venue12';
// Rodada 12: hype unificado (artistas, lançamentos, relíquias, festivais, turnês, selos e cenas).
import './hype12';
// Rodada 13: pontos de habilidade por conquistas.
import './skillpts13';
import './project13';
// Rodada 13: despesas que escalam com porte e época (burocracia, jurídico, equipes de época, promoção mínima).
import './overhead13';
import './persona13';
import './notoriety14';
import './leisure14';
// Rodada 14: empresários reais (representam artistas, exigências, indicações, rixas, concorrência).
import './managers14';
// Rodada 14: capacidade mensal (você, atos, equipe e rivais).
import './capacity14';
// Rodada 15: modos de história dos artistas reais (exata / com variações / aleatória).
import './history15';
import './kin15';
// Rodada 15: produtores musicais reais (catálogo, som próprio, cachê, agenda, demanda de selos rivais).
import './producers15';
import './fame15';
// Rodada 16: fama regional (por país, base + desvio local).
import './fame16';
// Rodada 15: visual de artistas reais por fase.
import './looks15';
// Rodada 15: aprofundamentos — sync por briefing, fandom que pede e briga, disputas de contrato (prêmios com júri local ficam em charts7/awards15).
import './sync15';
import './fan15';
import './dispute15';
// Rodada 16: agentes de shows e promotores com ordens delegadas.
import './deleg16';
// Rodada 16: momentos ilustrados (cena só quando algo acontece) e preço de matéria-prima já na época.
import './moments16';
import './supply16';
// Rodada 16: conexões entre sistemas (fama→notoriedade, sync→paradas, lazer→scouting, família→arcos/estúdio, produtor×conceito, veículo próprio→hype, rixas→imprensa, sobrecarga→aliciamento, esnobada→júri com memória, demos).
import './links16';
// Rodada 16: uma identidade por pessoa, empresários da praça, vida (vícios, mortes, casamentos) para toda a indústria e sucessão nos selos.
import './people16';
// Rodada 16: formações vivas (saídas, solos, bandas novas, voltas, renomes, linha do tempo).
import './lineup16';
// Rodada 17 — fundação da integração: pontes de Fatos (remember/chron/press9), obrigações, estresse único,
// ligações entre sistemas e situações do diretor com orçamento de drama.
import './bridge17';
import './situations17';
import './sits17';
// Rodada 17 (F) — negócios: venda do selo, canais de lançamento, casas, licenças, agenda com concorrência, imagem, merch, circuito.
import './sale17';
import './outlets17';
import './venues17';
import './license17';
import './clash17';
import './image17';
import './merch17';
import './circuit17';
// Rodada 17 (D): imprensa viva — notícias, boatos, veículos, críticos reais, processos e situações de crítica.
import './media17';
import './sitsworld17';
// Rodada 17 (onda 1, B): mundo orgânico dos NPCs — rompimentos, selos novos, carreiras, estratégias de selo.
import './npc17';
// Rodada 17 (onda 1, A): crime — organizações, ações de todos contra todos, casos, mercado negro, NPCs tramando.
import './crime17';
import './crimenpc17';
// Rodada 17 (E): alcance mundial (exceções globais, hit viral, one-hit wonder) e gêneros em alta pelas paradas.
import './reach17';
import './trends17';
import './heritage17';
import '../relics17';
// Rodada 17 (onda 1, C — vida pessoal): sexualidade, amor/traição/divórcio, filhos que crescem, aparência como jogo, extras (terapia do elenco, fé, herança).
import './sex17';
import './love17';
import './kids17';
import './looks17';
import './extras17';
// Rodada 17 (H): agenda com bolinhas por carreira, delegação, contratação, freelancers e músicos de estúdio.
import './agenda17';
// Rodada 17 (onda 2, G): experiência no ofício alivia a agenda de cada carreira.
import './exp17';
// Rodada 17 (onda 2, J): cenas interativas (motor + catálogo), álbum de cenas e fotos icônicas.
import './scene17';
import './scenedefs17';
// Rodada 17 (onda 2, I — novo jogo): cenários de época com regras especiais; efeitos das opções novas (real até o início, dificuldade detalhada, prazo).
import './scenarios17';
import './start17';
// Rodada 18 (core18): explicações encadeadas (explain18) dos números principais.
import './why18';
import './inbox18';
import './personact18';
// Rodada 18 (art18): qualidade multidimensional e trajetória artística (cada disco muda o próximo).
import './quality18';
import './traj18';
// Rodada 18 (dm18, onda 1): rixas para qualquer um (escada até a violência), qualquer um contra qualquer um, o Mestre (fios, ganchos, curva de tensão) e 32 situações combináveis.
import './feud18';
import './agency18';
import './verbs18';
import './dm18';
import './dmsits18';
import './econ18';
import './contracts18';
import './rights18';
import './eras18';
// Rodada 18 (ability18): habilidade atual e potencial (CA/PA estilo FM) para todas as pessoas.
import './ability18';
// Rodada 18 (talent18, onda 1): relíquias criadas no jogo + mais reais, descoberta por canais/demos, camps e pitching, banda da casa, escolas e TV de talentos.
import './relics18';
import './discover18';
import './camps18';
import './session18';
import './school18';
import './tv18';
import './world18';
import './rivalmind18';
// Rodada 18 (supply18, onda 1): fábricas/distribuidoras/agregadores, acordos de desenvolvimento/imprint/JV e relatório de mercado.
import './supply18';
import './deals18';
import './report18';
// Rodada 18 (media18, onda 1): marketing com saturação/públicos/atraso, streaming por fontes de descoberta e pró-rata, rádio por formatos, clipes, viral e DJs/remix.
import './mkt18';
import './stream18';
import './radio18';
import './media18';
// Rodada 18 (live18, onda 2): fãs com motivos e facções, logística/acerto/seguro/post-mortem de turnê, gigantes de bilhetagem, segurança de público, festival (curadoria, vizinhos, patrocinadores, experiência).
import './fans18';
import './live18';
import './fest18';
import './regions18';
import './circuits18';
import './kpop18';
import './idols18';
