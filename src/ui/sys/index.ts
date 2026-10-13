// Interfaces dos sistemas da rodada 4.
import './music';
import './creation';
import './people';
import './industry';
import './world4';
import './scenes';
import './live';
import './life';
import './songmkt27'; // r27 (SONG): Mercado de canções — comprar, ganhar, vender/dar e licenciar (Projetos › Criar)
import './knownacts27'; // r27 (KNOWN): Artistas conhecidos — quem a sua empresa conhece e por quê (antes de Todos os artistas)
import './directory';
import './capital';
import './hq6';
import './intrigue';
import './charts7';
import './furnish';
import './hubs8';
import './project8';
import './retro8';
import './identity';
import './sound';
// Rodada 8: herdeiros, participações em selos, relações entre artistas e feats negociados.
import './round8';
// Rodada 9: laços duradouros, movimentos e rede de relações.
import './bonds9';
import './route8';
import './consent8';
import './pacing8';
import './eras8';
import './hq8';
import './stories8';
import './rights8';
// Rodada 9: empreendimentos, gestão de artistas e prestígio dos selos.
import './ventures9';
// Rodada 9: Lendas (crônica do mundo, biografias, relíquias, jornal, livro e mundo persistente).
import './lendas9';
import '../newgame14db';
import './rockhall9';
import './menus9';
import './tour12';
import './studio12';
import './leaders10';
// Rodada 12: negociação por pacote e "Por que deu nisso?" ampliado.
import './offers12';
import './explain12';
// Rodada 12: estrutura da empresa x era e cenas locais como redes.
import './eras12';
import './scenes12';
// Rodada 12: carreiras (Você → Carreiras, cartões na mesa) e empresário com confiança e mercado de serviços.
import './careers12';
import './manager12';
// Rodada 12: projeto musical como centro (hub em Música e cartão no Início).
import './project12';
import './rivals12';
import './hq12';
// Rodada 12: aba Arco do artista, rotinas pessoais e História do selo.
import './arcs12';
import './story12';
// Rodada 12: dono de festival (ficha única em Shows e Empreendimentos) e dono de casa de shows.
import './fest12';
import './venue12';
// Rodada 12: hype unificado (medidor com motivos, alavancas, ranking nas paradas).
import './hype12';
// Rodada 13: dossiê completo do selo, marcos/contratos/relíquias/vida pessoal do artista e mapa legível.
import './dossier13';
import './project13';
import './careerui13';
// Rodada 13: quebra das despesas gerais na aba Finanças.
import './overhead13';
import './persona13';
import './persona13tab';
import './notoriety14';
// Rodada 14: cockpit (mesa + caixa de entrada + sede) e tema claro/escuro.
import './cockpit14';
import './theme14';
import './leisure14';
// Rodada 14: diretório e fichas de empresários reais.
import './managers14';
// Rodada 14: barras de capacidade (mesa, equipe, ato, rival).
import './capacity14';
// Rodada 15: modo de história no Novo Jogo + aba Vida real no ato.
import '../history15';
import './kin15';
// Rodada 15: lista e página de produtores reais.
import './producers15';
// Rodada 15: fama (aba, gráfico, segurança) e o quadro 'O que se sabe'.
import './fame15';
// Rodada 16: fama por região (bloco exportado + camada do mapa).
import './fame16';
// Rodada 15: retratos coerentes (artistas reais e procedurais com pele/sexo da ficha).
import './looks15';
// Rodada 15: aprofundamentos (Sync, Disputas, Fandom do ato, júri dos prêmios).
import './deep15';
// Rodada 16: painel Delegar (equipe) e 'Agenciado por' (ato).
import './deleg16';
// Rodada 16: momentos ilustrados (cena só quando algo acontece; "ver cena" no diário).
import './moments16';
import './layout16';
// Rodada 16: página única de pessoa (todos os personagens), empresário/produtor no artista, obras com pop-up, sucessão no selo.
import './people16';
// Rodada 16: páginas próprias de Festivais, Editora, Veículos de mídia e Plataforma; Empreendimentos vira a carteira.
import './ventures16';
// Rodada 16: formação (linha do tempo) e trajetória da pessoa.
import './lineup16';
// Rodada 17: Fatos & Obrigações (estresse, obrigações e fatos) na página de pessoa e do ato.
import './found17';
// Rodada 17 (F): Negócios 17 (venda, canais, casas, licenças, imagem, merch, circuito) e Agenda de shows.
import './biz17';
// Rodada 17 (D): página Notícias e boatos (veículos, críticos, processos) e aba Na imprensa do artista.
import './media17';
// Rodada 17 (onda 1, B): Mundo vivo — diretor criativo, situações para todos e jogadas dos NPCs com o porquê.
import './npc17';
// Rodada 17 (onda 1, A): menu Crime (organizações, planos, espionagem movida, mercado negro, polícia, histórico).
import './crime17';
import './crimemem23'; // r23: membros de organizações na ficha da pessoa
import './mob29ui'; // R29 (Submundo): ligações com famílias na ficha da indústria e famílias na busca
import './connect29'; // R29 (CONNECT): correio, promessas, relíquias/prêmios e submundo na ficha; fatos e rivalidade no selo
import './secrets23'; // r23: aba "O que sabemos" (segredos e vínculos)
// Rodada 17 (E): estilo nos cartões, gêneros em alta pelas paradas, alcance mundial do ato.
import './trends17';
// Rodada 17 (H): agenda, contratação, freelancers e músicos de estúdio.
import './agenda17';
// Rodada 17 (onda 2, G): página exclusiva de cada carreira (Você › Carreiras) e personagem com origem/ambição travadas.
import './careerpages17';
import './char17';
import './pop17';
// Rodada 17 (onda 2, J): cenas interativas (cartao, momentos, premios), Album de cenas e popups do mapa.
import './scene17';
// Rodada 23 (A): cenas que não interromperam (caixa de entrada + Rever cena no Álbum).
import './quiet23';
import './attn28'; // r28 F3: orçamento único de atenção (cenas e dicas)
// Rodada 18 (art18): trajetória artística (aba no artista) e qualidade em dimensões (disco e projeto).
import './art18';
// Rodada 18 (dm18, onda 1): Diário do Mestre (curva de tensão, fios, rixas, quem agiu contra quem) e aba Rixas no ato.
import './dm18';
// Rodada 18 (ability18): estrelas de habilidade atual/potencial e aba Desenvolvimento.
import './ability18';
// Rodada 18 (rights18, onda 1): página Direitos (obras, gravações, splits, autorizações, disputas, sociedades, extratos, catálogo, editora, precedentes).
import './rights18';
// Rodada 18 (talent18, onda 1): Talentos e formação (descoberta, camps, banda da casa, escolas, TV) e Acervo vivo em Lendas.
import './talent18';
import './world18';
import './roles21'; // r21: aba Funções (linha do tempo de funções da pessoa)
// Rodada 18 (supply18, onda 1): cadeia física (fábricas, distribuição, estoque), acordos (desenvolvimento, imprint, JV) e relatório de mercado.
import './supply18';
// Rodada 18 (media18, onda 1): abas de mídia (público e streaming, campanhas, rádio por formatos, clipes/virais/pistas).
import './media18';
// Rodada 18 (live18, onda 2): logística/post-mortem de turnê, políticas da estrada, festival e aba Fãs.
import './live18';
// Rodada 18 (regions18, onda 2): Mundo › Mercados (submercados, circuitos, K-pop, Japão, afinidades).
import './regions18';
// Rodada 18 (society18, onda 2): páginas Trilhas e palco, Jornalismo e Mundo › Sociedade.
import './society18';
// Rodada 18 (long18, onda 2): três perguntas no Cockpit e área Rumo do selo (caminhos, doutrinas, políticas, post-mortems, ano, biografia, casa).
import './long18';
// Rodada 18 (cine18): storyboards de cerimônias e grandes momentos, Cinemateca e Legado póstumo.
import './cine18';
// Rodada 19 (Frente 6, T5): Mundo › Regiões e política (selos regionais, comuna, vistos, greves, campanhas, leis, celeiros).
import './regions19';
// Rodada 19 (onda 3, T6): Mercado — certificados por país, pesquisa de mercado, cenas, plataformas/360 e fusões.
import './market19a';
import './finance18';
import './eras18';
// Rodada 18 (artist18): Contratos do artista (selos NPC, extrato, equipe) e Sociedades.
import './artist18';
// Rodada 18 (campus18): Nosso mundo — mapa em pixel art de tudo o que o jogador possui.
import './campus18';
// Rodada 18 (decide18): consequências, Cockpit vivo e ligações entre sistemas.
import './decide18';
import './home18';
import './links18';
// Rodada 18 (era1889): Mundo › Era acústica e a seção de partituras em Paradas.
import './era1889';
// Rodada 19 (Frente 8): calendário único (faixa + página), topo Hoje/Ameaças/Andamento e blocos com peso.
import './calendar19';
import './cockpit19';
// Rodada 19 (Frente 9.1/9.5): Tributos e covers (tributos, sósias, sucesso tardio).
import './tribute19';
// Rodada 19 (Frente 9.2/9.3): Músicos de sessão (Estúdio) e Créditos e autores (Compor/Editora).
import './session19';
// Rodada 19 (onda 2: 11.5 + Frente 2): card "A era" no Cockpit e cartões "A história real".
import './era19';
// Rodada 19 (T2 money-b): Mercado de contratos (cláusulas, lances, empresários, briga de gestão; r22: sem janelas nem empréstimos).
import './moneyb19';
// Rodada 19 (onda 3, T1): Finanças › Dívida e catálogo.
import './money19';
// Rodada 19 (Frente 6, T5): Mundo › Regiões e política (selos regionais, comuna, vistos, greves, campanhas, leis, celeiros).
import './regions19';
import './history19'; // r19 T8: Mundo › Marcos da história + bloco do Cockpit
// Rodada 19 (onda 3, T6): Mercado — certificados por país, pesquisa de mercado, cenas, plataformas/360 e fusões.
import './market19a';
// Rodada 19 (onda 3, T9): Imprensa e fanzines (zines19) e Fraudes e sósias (fakes19).
import './media19';
// Rodada 19 (Frente 7, mercado B): Remix, anúncios e trilhas (Música) e Crises, seguros e cultura (Selo).
import './market19b';
// Rodada 19 (Frente 5, onda 3 — T4): Palco e temporada (ingressos, festival grátis, vinil/RSD, temporada, beneficentes, concursos).
import './live19';
// Rodada 19 (onda 3, T3): Lendas › Espólio (herdeiros, masters, arena digital) e Estúdio › Equipamento (endossos, ícones).
import './afterlife19';
import './gear19';
// Rodada 19 (Frente 8, onda 4): viradas de década/era, metas, recibo de decisão, "por que perdi?", epitáfio, divulgação progressiva e acessibilidade.
import './ux19';
// Rodada 19 (onda 5, B): cockpit por profissão, aviso antes de avançar e delegação por carreira.
import './prof19';
import './advance19';
import './scenes19'; // r19 cenas: resultado da cerimônia só depois de vista
// Rodada 19 (onda 5, A): pacote inicial no Novo Jogo, terreno do festival e Finanças do grupo (consolidado).
import './careers19';
// Rodada 20 (G7): aba Fãs por região e seção Fãs e preço por mercado.
import './terr20';
import './demo29'; // R29 (DEMO): público por idade e região — aba Público, Artistas, Paradas, Projeto
// Rodada 20 (G5): Shows, Sede e Mundo por intenção (hubs com subáreas; painel antigo vira "Tudo").
import './hubs20';
import './fin20'; // r20 G2: Finanças → Posição (agora × fechamento, obrigações, reconciliação)
// Rodada 20 (G6): cockpit em primeiro plano, pós-turno, densidade, gráficos acessíveis, oferta em camadas e revisão de fase.
import './ui20';
import '../act27/p2b27'; // r27 (P2B): turnê no mapa, crises com relógio e reunião de diretoria (Cockpit, Políticas, avisos)
import './mundo27'; // r27 (E1): Mundo — Este mês no mundo, mapa pixel art com ficha da cidade, linha das eras, O que sabemos
// Rodada 18 (core18, onda 0): tooltips encadeados, Caixa de entrada 2.0, menu de ações por pessoa e Dinâmica (sempre por último).
import './core18';
import './eggs27';
import './prov27'; // r27 (F): linha "fonte/certeza" na ficha (confirmado / aproximado / não conferido / simulado) // r27 ovos de Páscoa: Konami, pele 1889/chiptune, registros para busca/sede/mapa (docs/eggs27.md)
import './contracts29reg'; // R29 (contratos+): "Propor empresariamento" na ficha de ato com selo rival
