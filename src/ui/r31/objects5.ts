// R31 · onda 5 (TEC) — REGISTRO DE OBJETOS do jogo explorável (sem DOM; testes em tests/r31-w5-tec.test.ts).
// Mapa das telas: docs/r31/onda5-mapa.md; especificação de cada tela: docs/r31/onda5-telas.md (gerada daqui).
//
// Cada função do jogo é um objeto (ou uma pessoa, um prédio, um lugar) e cada objeto abre um papel por cima da cena
// (moldura: cortiça, quadro, caderno, livro-caixa, revista, caixa de entrada da época…), com as abas de hoje como
// marcadores do próprio papel. Nesta etapa o objeto ainda abre a PÁGINA ANTIGA (open5 em nav5.ts): a tabela abaixo é o
// endereço de cada página no mundo novo, não uma tela nova.
//
// Regras (travadas por teste):
//  - toda página registrada tem exatamente UM objeto dono (`opens`) ou fica no menu de pausa (`PAUSE5`);
//  - todo objeto que é dono de página ou de marcador tem tecla (própria ou `keyRef` para a viagem);
//  - abas que mudam de objeto estão em `MOVES5` (o que vai para outro papel, o que vira topo e o que fica no índice);
//  - objetos "atalho" (`links`) só levam ao dono, não contam como dono e não precisam de tecla.

import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { KEY17 } from '../nav17';
import { registerKey5, type Region5 } from './keys5';

export type Frame5 =
  | 'cena' | 'caixa' | 'quadro' | 'cortica' | 'agenda' | 'livro' | 'caderno' | 'fichario' | 'pasta' | 'jornal' | 'revista'
  | 'tela' | 'telefone' | 'planta' | 'ficha' | 'mapa' | 'album' | 'pessoa' | 'predio' | 'bilhete';

/** Página antiga (+ aba) que um objeto abre. */
export interface Open5 { area: string; tab?: [string, string] }

/** Forma do objeto por época (a função não muda; muda a aparência). */
export interface Form5 { era: [number, number]; label: L }

export interface Obj5 {
  id: string;
  label: L;
  /** região e cômodo/prédio: 'sede.sala', 'casa.quarto', 'cidade.beco', 'mundo.mapa' */
  place: string;
  /** anos em que o objeto existe [de, até] (ausente = sempre) */
  era?: [number, number];
  /** tecla própria (registrada em keys5 como `obj:<id>`) */
  key?: string;
  /** objeto-lugar: usa a tecla de outra ligação (ex.: 'travel:cidade') */
  keyRef?: string;
  /** páginas de que este objeto é DONO; a 1ª é a que abre (com a aba indicada) */
  opens: Open5[];
  /** atalhos: levam a páginas de outro dono (prédio da cidade que abre a mesma página da sede…) */
  links?: Open5[];
  /** tipo de papel/moldura que abre */
  frame: Frame5;
  /** "!" próprio; ausente = pendências cujo dono cai neste objeto (nav5.badge5) */
  badge?: (s: GameState) => number;
  /** formas por época */
  forms?: Form5[];
  /** página de carreira: vira a sede quando é a carreira principal (★ na cidade nas outras) */
  career?: string;
  /** nota curta para a especificação (o que muda de lugar, o que entra como "!") */
  note?: L;
  /** o que entra como "!" (texto da especificação) */
  bang?: L;
}

export const REGION_L5: Record<Region5, L> = { sede: l('Sede', 'HQ'), casa: l('Casa', 'Home'), cidade: l('Cidade', 'City'), mundo: l('Mundo', 'World') };

/** Cômodos e prédios (rótulo do lugar). */
export const PLACES5: Record<string, L> = {
  'sede.lugar': l('Sede (cena inteira)', 'HQ (whole scene)'),
  'sede.recepcao': l('Recepção', 'Reception'),
  'sede.sala': l('Sua sala', 'Your office'),
  'sede.reuniao': l('Sala de reunião', 'Meeting room'),
  'sede.ar': l('A&R', 'A&R'),
  'sede.lounge': l('Lounge', 'Lounge'),
  'sede.estudio': l('Estúdio', 'Studio'),
  'sede.ensaio': l('Ensaio e palco', 'Rehearsal and stage'),
  'sede.arquivo': l('Arquivo', 'Archive'),
  'sede.financeiro': l('Financeiro', 'Finance office'),
  'sede.rh': l('RH', 'HR'),
  'sede.pesquisa': l('Pesquisa', 'Research'),
  'sede.corredor': l('Corredor', 'Hallway'),
  'casa.lugar': l('Casa (cena inteira)', 'Home (whole scene)'),
  'casa.sala': l('Sala de estar', 'Living room'),
  'casa.quarto': l('Quarto', 'Bedroom'),
  'casa.cozinha': l('Cozinha', 'Kitchen'),
  'casa.escritorio': l('Escritório em casa', 'Home office'),
  'casa.garagem': l('Garagem', 'Garage'),
  'cidade.lugar': l('Cidade (mapa da cidade)', 'City (city map)'),
  'cidade.shows': l('Casa de shows', 'Venue'),
  'cidade.radio': l('Rádio e TV', 'Radio and TV'),
  'cidade.jornal': l('Jornal', 'Newspaper'),
  'cidade.bar': l('Bar', 'Bar'),
  'cidade.empresarios': l('Empresários', 'Managers'),
  'cidade.estudios': l('Estúdios de terceiros', 'Third-party studios'),
  'cidade.rivais': l('Prédios dos rivais', 'Rival buildings'),
  'cidade.beco': l('Beco do submundo', 'Underworld alley'),
  'cidade.prefeitura': l('Prefeitura', 'City hall'),
  'cidade.fabrica': l('Fábrica', 'Plant'),
  'cidade.banco': l('Banco', 'Bank'),
  'cidade.aeroporto': l('Aeroporto e porto', 'Airport and port'),
  'cidade.leiloes': l('Casa de leilões', 'Auction house'),
  'cidade.loja': l('Loja de instrumentos', 'Instrument shop'),
  'cidade.festival': l('Terreno do festival', 'Festival grounds'),
  'cidade.fossati': l('Casa Fossati e praça', 'Fossati house and square'),
  'cidade.carreira': l('Prédio da carreira (★; é a sede quando é a carreira principal)', 'Career building (★; it is the HQ when it is the main career)'),
  'mundo.lugar': l('Mundo (mapa-múndi)', 'World (world map)'),
  'mundo.mapa': l('Mapa-múndi', 'World map'),
  'mundo.borda': l('Borda do mapa', 'Map edge'),
};
export const regionOf5 = (place: string): Region5 => place.split('.')[0] as Region5;

export const FRAME_L5: Record<Frame5, L> = {
  cena: l('cena em pixel art', 'pixel art scene'), caixa: l('correspondência da época', 'era mail'), quadro: l('quadro na parede', 'wall board'),
  cortica: l('mural de cortiça', 'corkboard'), agenda: l('agenda de couro', 'leather planner'), livro: l('livro', 'ledger book'),
  caderno: l('caderno', 'notebook'), fichario: l('fichário (rolodex)', 'rolodex'), pasta: l('pasta do arquivo', 'file folder'),
  jornal: l('jornal', 'newspaper'), revista: l('revista', 'magazine'), tela: l('tela (rádio/TV/monitor)', 'screen (radio/TV/monitor)'),
  telefone: l('telefone e lista', 'phone and directory'), planta: l('planta do prédio', 'building blueprint'), ficha: l('ficha', 'record card'),
  mapa: l('mapa', 'map'), album: l('álbum', 'album'), pessoa: l('conversa com a pessoa + "ver números"', 'talk to the person + "see numbers"'),
  predio: l('fachada do prédio (cena)', 'building front (scene)'), bilhete: l('bloco de recados', 'message pad'),
};

// ---------------------------------------------------------------- registro

const OBJS5 = new Map<string, Obj5>();

/** Registra (ou substitui) um objeto e a sua tecla (`obj:<id>` em keys5). */
export function registerObject5(o: Obj5): void {
  if (!PLACES5[o.place]) throw new Error(`objects5: lugar desconhecido "${o.place}" em ${o.id}`);
  OBJS5.set(o.id, o);
  // tecla de antes: a de KEY17 de alguma página dona (a mesma tecla = "igual" na tabela; outra = "mudou")
  const legacy = o.opens.map((x) => KEY17[x.area]).find((k) => !!k);
  if (o.key) registerKey5({ id: `obj:${o.id}`, chord: o.key, act: { kind: 'object', id: o.id }, label: o.label, scope: 'global', legacy });
}
export const objects5 = (): Obj5[] => [...OBJS5.values()];
export const object5 = (id: string): Obj5 | undefined => OBJS5.get(id);

// ---------------------------------------------------------------- páginas fora do mundo e abas que mudam

/** Páginas que ficam no menu de pausa (fora do mundo). */
export const PAUSE5: Record<string, L> = {
  tut18: l('Ajuda', 'Help'),
  editor31: l('Editor (modo editor)', 'Editor (editor mode)'),
  lists30: l('Índice completo (consulta)', 'Full index (reference)'),
};

/** Aba que sai do papel dono da página: vai para outro objeto, para o topo (HUD) ou para o índice do menu de pausa.
 *  `tab` ausente = todas as abas daquela faixa (`key`). */
export interface Move5 { area: string; key: string; tab?: string; to: string; why: L }
export const MOVES5: Move5[] = [
  { area: 'cockpit', key: 'ck20', tab: 'inbox', to: 'correspondencia', why: l('A caixa de entrada é a correspondência da época (tecla E).', 'The inbox is the era\'s mail (key E).') },
  { area: 'cockpit', key: 'ck20', tab: 'panel', to: 'topo', why: l('O painel vira o topo (data, caixa, fama), ampliável com um clique; detalhes no livro-caixa.', 'The panel becomes the top bar (date, cash, fame), expandable with one click; details in the ledger.') },
  { area: 'agenda17', key: 'agenda17', tab: 'hire', to: 'jornal', why: l('Contratar: anúncio no jornal abre a vaga; candidatos esperam na recepção.', 'Hiring: a newspaper ad opens the post; candidates wait at reception.') },
  { area: 'agenda17', key: 'agenda17', tab: 'free', to: 'telefone', why: l('Freelancers atendem no telefone.', 'Freelancers answer the phone.') },
  { area: 'agenda17', key: 'agenda17', tab: 'session', to: 'telefone', why: l('Músicos de estúdio atendem no telefone.', 'Session players answer the phone.') },
  { area: 'creation', key: 'creation-write', tab: 'repertoire', to: 'piano', why: l('Compor fica no piano.', 'Writing lives at the piano.') },
  { area: 'creation', key: 'creation-write', tab: 'writers19', to: 'piano', why: l('Créditos e autores ficam no piano.', 'Credits and writers live at the piano.') },
  { area: 'creation', key: 'creation-write', tab: 'cr-themes', to: 'piano', why: l('Temas e tendências ficam no piano.', 'Themes and trends live at the piano.') },
  { area: 'creation', key: 'creation-write', tab: 'cr-partners', to: 'piano', why: l('Parcerias ficam no piano.', 'Partnerships live at the piano.') },
  { area: 'creation', key: 'creation-write', tab: 'cr-comm', to: 'piano', why: l('Encomendas ficam no piano.', 'Commissions live at the piano.') },
  { area: 'finance', key: 'business-finance', tab: 'capital', to: 'cofre', why: l('Capital e sócios ficam no cofre da empresa.', 'Capital and partners live in the company safe.') },
  { area: 'finance', key: 'business-finance', tab: 'stakes8', to: 'cofre', why: l('Participações em selos ficam no cofre.', 'Stakes in labels live in the safe.') },
  { area: 'business', key: 'business-business', tab: 'learn31', to: 'caderno', why: l('Aprendizados ficam no caderno da estante.', 'Learnings live in the shelf notebook.') },
  { area: 'business', key: 'business-business', tab: 'results31', to: 'caderno', why: l('Resultados ficam no caderno da estante.', 'Results live in the shelf notebook.') },
  { area: 'people', key: 'people', tab: 'health', to: 'lounge', why: l('Saúde do elenco: quem está no lounge conversa.', 'Roster health: whoever is in the lounge talks.') },
  { area: 'people', key: 'people', tab: 'relations', to: 'lounge', why: l('Relações do elenco ficam no lounge.', 'Roster relations live in the lounge.') },
  { area: 'people', key: 'people', tab: 'feed', to: 'lounge', why: l('Cartas e recados do elenco ficam no lounge.', 'Roster letters and notes live in the lounge.') },
  { area: 'world', key: 'worldcharts', to: 'revista', why: l('Paradas por região e gênero viram capítulos da revista de paradas.', 'Charts by region and genre become chapters of the charts magazine.') },
  { area: 'world', key: 'worldHub', tab: 'fossati31', to: 'portaretrato', why: l('Família Fossati: porta-retrato da sua sala.', 'Fossati family: picture frame in your office.') },
  { area: 'world', key: 'worldHub', tab: 'extras31', to: 'portaretrato', why: l('Extras da família ficam com o porta-retrato.', 'Family extras stay with the picture frame.') },
  { area: 'media', key: 'mediaHub', tab: 'w4method', to: 'revista', why: l('Metodologia das paradas é o expediente da revista.', 'Chart methodology is the magazine\'s masthead page.') },
  { area: 'releases', key: 'creation-release', tab: 'cr-catalog', to: 'prateleiras', why: l('Remaster e standards ficam nas prateleiras de masters.', 'Remasters and standards live on the master shelves.') },
  { area: 'you', key: 'life-you', tab: 'diary', to: 'diario', why: l('O diário pessoal fica no diário da gaveta.', 'The personal diary lives in the drawer diary.') },
  { area: 'hq', key: 'hqHub', tab: 'all', to: 'pausa', why: l('"Tudo (especialista)" é lista: fica no índice do menu de pausa.', '"Everything (expert)" is a list: it stays in the pause menu index.') },
  { area: 'shows', key: 'showsHub', tab: 'all', to: 'pausa', why: l('"Tudo (especialista)" é lista: fica no índice do menu de pausa.', '"Everything (expert)" is a list: it stays in the pause menu index.') },
];
/** Destinos especiais de `Move5.to` que não são objetos. */
export const MOVE_SPECIAL5: Record<string, L> = { topo: l('topo (HUD)', 'top bar (HUD)'), pausa: l('índice do menu de pausa', 'pause menu index') };

/** Para onde vai uma aba (objeto, 'topo', 'pausa') — undefined = fica no papel dono da página. */
export function moveOf5(area: string, key: string, tab: string): Move5 | undefined {
  return MOVES5.find((m) => m.area === area && m.key === key && (m.tab === undefined || m.tab === tab));
}

// ---------------------------------------------------------------- objetos padrão

const O = (id: string, label: L, place: string, frame: Frame5, key: string | undefined, opens: (string | Open5)[], o: Partial<Obj5> = {}): Obj5 =>
  ({ id, label, place, frame, key, opens: opens.map((x) => (typeof x === 'string' ? { area: x } : x)), ...o });
const ln = (area: string, tab?: [string, string]): Open5 => ({ area, tab });
const bangPend = (what: L): L => what;

export const DEFAULT_OBJECTS5: Obj5[] = [
  // ======================================================== SEDE
  O('sede', l('Sede', 'HQ'), 'sede.lugar', 'cena', undefined, ['sede25', 'sala31'], { keyRef: 'travel:sede',
    note: l('Botão de viagem; H também volta à sede. Com outra carreira principal, a sede é o prédio dessa carreira.', 'Travel button; H also goes back. With another main career, the HQ is that career\'s building.'),
    bang: l('soma dos "!" dos objetos da sede', 'sum of the HQ objects\' "!"') }),
  O('porta', l('Porta da rua', 'Front door'), 'sede.recepcao', 'cena', undefined, [], { links: [ln('campus18')], keyRef: 'travel:cidade' }),
  O('mapaparede', l('Mapa-múndi na parede', 'Wall world map'), 'sede.recepcao', 'mapa', undefined, [], { links: [ln('world', ['worldHub', 'map27'])], keyRef: 'travel:mundo' }),
  O('secretaria', l('Secretária eletrônica (recados)', 'Answering machine (messages)'), 'sede.recepcao', 'bilhete', 'shift+e', [], {
    links: [ln('cockpit', ['ck20', 'panel'])],
    forms: [{ era: [1889, 1969], label: l('Bloco de recados da recepcionista', 'Receptionist\'s message pad') }, { era: [1970, 2009], label: l('Secretária eletrônica que pisca', 'Blinking answering machine') }, { era: [2010, 2040], label: l('Notificações no celular', 'Phone notifications') }],
    note: l('Avisos do mês, cada um com "ir até lá".', 'The month\'s notices, each with "go there".'), bang: l('avisos novos da fila de atenção', 'new notices in the attention queue') }),
  O('chaveiro', l('Chaveiro (suas casas)', 'Key ring (your houses)'), 'sede.recepcao', 'cena', undefined, [], { keyRef: 'sys:houses', note: l('Aparece com 2+ carreiras ativas; Tab troca de casa.', 'Shows with 2+ active careers; Tab switches house.') }),
  O('mesames', l('Mesa do mês', 'Monthly desk'), 'sede.sala', 'cena', '1', [ln('cockpit', ['ck20', 'desk']), 'desk'], { bang: bangPend(l('decisões do mês (pendências "decision")', 'month\'s decisions ("decision" pending items)')) }),
  O('correspondencia', l('Correspondência', 'Mail'), 'sede.sala', 'caixa', 'e', ['inbox'], {
    forms: [
      { era: [1889, 1919], label: l('Escrivaninha com envelopes', 'Writing desk with envelopes') }, { era: [1920, 1969], label: l('Cartas e telegramas', 'Letters and telegrams') },
      { era: [1970, 1989], label: l('Telex e fax', 'Telex and fax') }, { era: [1990, 2009], label: l('Computador', 'Computer') }, { era: [2010, 2040], label: l('Celular e app', 'Phone and app') }],
    note: l('Mesmos filtros, respostas e teclas em qualquer época; muda só a forma.', 'Same filters, replies and keys in every era; only the look changes.'),
    bang: l('mensagens que pedem resposta (pendências "inbox:*")', 'messages awaiting a reply ("inbox:*" pending items)') }),
  O('quadroplan', l('Quadro de planejamento', 'Planning board'), 'sede.sala', 'quadro', 'c', ['plan'], { note: l('Linhas = artistas, colunas = 12 meses; conflito em vermelho.', 'Rows = artists, columns = 12 months; conflicts in red.'), bang: l('conflitos de agenda do elenco', 'roster schedule conflicts') }),
  O('agenda', l('Agenda de couro', 'Leather planner'), 'sede.sala', 'agenda', 'g', ['agenda17', 'calendar19', 'cal17'], { note: l('As bolinhas viram horários do mês; carreira delegada aparece como "diretor cuida".', 'The dots become the month\'s slots; a delegated career shows as "director handles it".'), bang: l('prazos da semana que pedem ação (calendar19 com "act")', 'this week\'s deadlines that need action (calendar19 "act")') }),
  O('livrocaixa', l('Livro-caixa', 'Ledger'), 'sede.sala', 'livro', 'z', ['finance'], { bang: l('pendências com dono em Finanças (sócios, dívida)', 'pending items owned by Finance (partners, debt)') }),
  O('cofre', l('Cofre da empresa', 'Company safe'), 'sede.sala', 'livro', 'shift+z', [], { links: [ln('finance', ['business-finance', 'capital'])], note: l('Marcadores Capital e sócios, Participações (vindos de Finanças).', 'Markers Capital and partners, Stakes (from Finance).') }),
  O('arquivoaco', l('Arquivo de aço', 'Steel filing cabinet'), 'sede.sala', 'pasta', 'shift+c', ['contracts19', 'rights18', 'artist18'], { bang: l('contratos vencendo e cláusulas com prazo', 'expiring contracts and clauses with deadlines') }),
  O('fichario', l('Fichário de contatos', 'Rolodex'), 'sede.sala', 'fichario', 'a', ['directory', 'knownacts27'], { note: l('Gavetas por letra, gênero e país; marcar cartões e "comparar".', 'Drawers by letter, genre and country; tick cards and "compare".') }),
  O('telefone', l('Telefone', 'Telephone'), 'sede.sala', 'telefone', 'shift+t', ['managers14'], {
    forms: [{ era: [1889, 1919], label: l('Mensageiro na porta', 'Messenger at the door') }, { era: [1920, 1984], label: l('Telefone de mesa', 'Desk phone') }, { era: [1985, 2009], label: l('Telefone sem fio', 'Cordless phone') }, { era: [2010, 2040], label: l('Celular', 'Mobile phone') }],
    bang: l('empresários e agentes esperando resposta', 'managers and agents waiting for a reply') }),
  O('jornal', l('Jornal na mesa', 'Newspaper on the desk'), 'sede.sala', 'jornal', "'", ['news17', 'critics', 'zines19', 'fakes19', 'known27'], { bang: l('notícia nova sobre você ou o seu elenco', 'new story about you or your roster') }),
  O('radiotv', l('Rádio/TV', 'Radio/TV'), 'sede.sala', 'tela', '6', ['media'], {
    forms: [{ era: [1889, 1919], label: l('Gramofone', 'Gramophone') }, { era: [1920, 1949], label: l('Rádio de válvula', 'Valve radio') }, { era: [1950, 2009], label: l('Rádio e TV', 'Radio and TV') }, { era: [2010, 2040], label: l('Tela plana', 'Flat screen') }],
    bang: l('campanha terminando ou convite de mídia', 'campaign ending or media invitation') }),
  O('revista', l('Revista de paradas', 'Charts magazine'), 'sede.sala', 'revista', '3', ['charts'], { note: l('Capítulos por parada; recebe as paradas por região e gênero do Mundo.', 'Chapters per chart; takes the region and genre charts from World.'), bang: l('disco seu entrando ou subindo nas paradas', 'your record entering or climbing the charts') }),
  O('quadrometas', l('Quadro de metas', 'Goals board'), 'sede.sala', 'quadro', 'f', ['goals'], { bang: l('meta cumprida ou perto do prazo', 'goal met or near its deadline') }),
  O('diario', l('Diário na gaveta', 'Diary in the drawer'), 'sede.sala', 'caderno', 'd', ['diary', 'dm18'], { note: l('Fios do Mestre viram anotações do diário.', 'Master\'s threads become diary notes.') }),
  O('caderno', l('Caderno na estante', 'Notebook on the shelf'), 'sede.sala', 'caderno', 'shift+0', [], { links: [ln('business', ['business-business', 'learn31'])], note: l('Marcadores Aprendizados e Resultados (vindos de Empresa).', 'Markers Learnings and Results (from Company).') }),
  O('portaretrato', l('Porta-retrato', 'Picture frame'), 'sede.sala', 'album', 'shift+f', [], { links: [ln('world', ['worldHub', 'fossati31'])], note: l('Família Fossati e extras (vindos do Mundo).', 'Fossati family and extras (from World).') }),
  O('chefe', l('Chefe de gabinete', 'Chief of staff'), 'sede.sala', 'pessoa', 'shift+d', ['deleg31'], { bang: l('relatório de delegação novo', 'new delegation report') }),
  O('quadrobranco', l('Quadro branco', 'Whiteboard'), 'sede.reuniao', 'quadro', 'u', ['releases'], { note: l('Rollout, capa e vídeo; "abrir reunião de lançamento".', 'Rollout, cover and video; "open release meeting".'), bang: l('lançamento pronto para sair ou etapa atrasada', 'release ready to go or a late step') }),
  O('mesareuniao', l('Mesa de reunião', 'Meeting table'), 'sede.reuniao', 'cena', 'shift+r', ['long18', 'car31'], { bang: l('decisão de carreira ou de rumo esperando', 'career or course decision waiting') }),
  O('maquete', l('Maquete do prédio', 'Building model'), 'sede.reuniao', 'planta', '2', ['hq'], { bang: l('obra terminada ou sala nova à venda', 'works finished or a new room for sale') }),
  O('mural', l('Mural de cortiça', 'Corkboard'), 'sede.ar', 'cortica', '4', ['artists', 'people'], { note: l('Uma polaroid por artista, com selos de estado; clicar = ficha + "Ações ▾".', 'One polaroid per artist with status stamps; click = profile + "Actions ▾".'), bang: l('artista com contrato vencendo, saúde ruim ou pedido', 'artist with contract expiring, poor health or a request') }),
  O('olheiro', l('Mesa do olheiro (caderno)', 'Scout\'s desk (notebook)'), 'sede.ar', 'caderno', '5', ['market'], { bang: l('contrapropostas e talentos prontos para proposta (pendências "offer_counter")', 'counter-offers and talents ready for an offer ("offer_counter" pending items)') }),
  O('demos', l('Pilha de demos', 'Demo pile'), 'sede.ar', 'cena', 'shift+9', ['talent18'], { bang: l('demo nova', 'new demo') }),
  O('lounge', l('Lounge (artistas sentados)', 'Lounge (artists sitting)'), 'sede.lounge', 'cena', 'shift+l', ['dyn18'], { note: l('Clicar na pessoa = ficha; recebe Saúde, Relações e Cartas do elenco.', 'Click a person = profile; takes roster Health, Relations and Letters.'), bang: l('briga, crise de saúde ou carta nova no elenco', 'fight, health crisis or new letter in the roster') }),
  O('mesasom', l('Mesa de som', 'Mixing desk'), 'sede.estudio', 'cena', 's', ['studio', 'creation'], { bang: l('sessão marcada para esta semana', 'session booked this week') }),
  O('piano', l('Piano', 'Piano'), 'sede.estudio', 'caderno', 'shift+8', ['songmkt27'], { note: l('Compor, temas, parcerias, encomendas e mercado de canções.', 'Write, themes, partnerships, commissions and song market.'), bang: l('encomenda com prazo', 'commission with a deadline') }),
  O('salagravacao', l('Sala de gravação', 'Recording room'), 'sede.estudio', 'cena', '\\', ['project'], { bang: l('projeto parado esperando você', 'project stalled waiting for you') }),
  O('palco', l('Palco de ensaio', 'Rehearsal stage'), 'sede.ensaio', 'cena', '9', ['shows', 'live19'], { bang: l('show marcado sem equipe ou turnê para fechar', 'booked show without crew or tour to close') }),
  O('prateleiras', l('Prateleiras de masters', 'Master shelves'), 'sede.arquivo', 'cena', '7', ['catalog', 'tribute19', 'media19'], { bang: l('pedido de sync ou relançamento', 'sync or reissue request') }),
  O('contador', l('Contador', 'Accountant'), 'sede.financeiro', 'pessoa', 'b', ['business'], { bang: l('pendências com dono em Empresa (sócios: soc31)', 'pending items owned by Company (partners: soc31)') }),
  O('quadrofunc', l('Quadro de funcionários', 'Staff board'), 'sede.rh', 'quadro', 't', ['team', 'company', 'firm19'], { bang: l('funcionário pedindo aumento ou saindo', 'staff asking for a raise or leaving') }),
  O('graficos', l('Gráficos na parede', 'Charts on the wall'), 'sede.pesquisa', 'quadro', 'i', ['industry', 'market19a'] ),
  O('trofeus', l('Estante de troféus', 'Trophy shelf'), 'sede.corredor', 'cena', 'o', ['awards', 'rockhall'], { bang: l('indicação ou prêmio novo', 'new nomination or award') }),
  // ======================================================== CARREIRAS (sede da carreira principal; ★ na cidade nas outras)
  O('car:label', l('Gravadora (identidade e venda)', 'Record label (identity and sale)'), 'cidade.carreira', 'cena', 'l', ['cp17-label', 'identity', 'biz17'], { career: 'label' }),
  O('car:musician', l('QG da banda', 'Band HQ'), 'cidade.carreira', 'cena', 'shift+m', ['cp17-musician'], { career: 'musician' }),
  O('car:manager', l('Escritório de empresário', 'Manager\'s office'), 'cidade.carreira', 'cena', 'shift+g', ['cp17-manager', 'management'], { career: 'manager' }),
  O('car:booking', l('Agência', 'Agency'), 'cidade.carreira', 'cena', '[', ['cp17-booking', 'tour12'], { career: 'booking' }),
  O('car:festival', l('Terreno do seu festival', 'Your festival grounds'), 'cidade.carreira', 'cena', 'shift+j', ['cp17-festival'], { career: 'festival' }),
  O('car:venue', l('Sua casa de shows', 'Your venue'), 'cidade.carreira', 'cena', '=', ['cp17-venue'], { career: 'venue' }),
  O('car:studio', l('Seu estúdio', 'Your studio'), 'cidade.carreira', 'cena', ']', ['cp17-studio', 'studio12'], { career: 'studio' }),
  O('car:publisher', l('Sua editora', 'Your publisher'), 'cidade.carreira', 'cena', '-', ['cp17-publisher', 'publishing16'], { career: 'publisher' }),
  O('car:media', l('Redação', 'Newsroom'), 'cidade.carreira', 'cena', ',', ['cp17-media', 'outlets16'], { career: 'media' }),
  O('car:platform', l('Sala de servidores', 'Server room'), 'cidade.carreira', 'cena', '.', ['cp17-platform', 'platform16'], { career: 'platform' }),
  O('car:screen', l('Estúdio de cinema', 'Film studio'), 'cidade.carreira', 'cena', 'shift+s', ['cp17-screen'], { career: 'screen' }),
  O('car:critic', l('Sua mesa no jornal', 'Your desk at the paper'), 'cidade.carreira', 'cena', 'shift+q', ['cp17-critic'], { career: 'critic' }),
  // ======================================================== CASA (substitui "Você")
  O('casa', l('Casa', 'Home'), 'casa.lugar', 'cena', undefined, ['casa31'], { keyRef: 'travel:casa', bang: l('soma dos "!" dos objetos da casa', 'sum of the home objects\' "!"') }),
  O('espelho', l('Espelho', 'Mirror'), 'casa.sala', 'ficha', 'v', ['you'], { note: l('Ficha do personagem, como está (só polida).', 'Character sheet, as it is (only polished).') }),
  O('retratoscasa', l('Porta-retratos', 'Picture frames'), 'casa.sala', 'album', 'y', ['personal'], { note: l('Parceiro, filhos, família e aba Coração.', 'Partner, children, family and Heart tab.'), bang: l('pedido de família ou encontro marcado', 'family request or date booked') }),
  O('cofrecasa', l('Cofre de casa', 'Home safe'), 'casa.quarto', 'livro', 'x', ['wealth']),
  O('escritoriocasa', l('Escritório em casa', 'Home office'), 'casa.escritorio', 'cena', 'n', ['ventures', 'careers', 'shared18'], { note: l('Outras carreiras, negócios e sociedades.', 'Other careers, ventures and partnerships.') }),
  O('telefonecasa', l('Telefone de casa', 'Home phone'), 'casa.sala', 'telefone', 'shift+v', ['known31'], { note: l('Contatos e "chamar para sair" (AMOR).', 'Contacts and "ask out" (AMOR).') }),
  O('estante', l('Estante de lembranças', 'Keepsake shelf'), 'casa.sala', 'album', 'shift+7', ['scenes17']),
  O('cama', l('Cama', 'Bed'), 'casa.quarto', 'cena', undefined, [], { links: [ln('you')], note: l('Descansar e energia.', 'Rest and energy.') }),
  O('calcozinha', l('Calendário da cozinha', 'Kitchen calendar'), 'casa.cozinha', 'agenda', undefined, [], { links: [ln('personal', ['life-personal', 'agenda8'])] }),
  O('garagem', l('Garagem', 'Garage'), 'casa.garagem', 'cena', undefined, [], { links: [ln('wealth', ['goods8', 'mine'])], note: l('Veículos.', 'Vehicles.') }),
  // ======================================================== CIDADE
  O('cidade', l('Cidade', 'City'), 'cidade.lugar', 'mapa', undefined, ['campus18'], { keyRef: 'travel:cidade', bang: l('prédios com novidade', 'buildings with news') }),
  O('casashows', l('Casa de shows', 'Venue'), 'cidade.shows', 'predio', undefined, [], { links: [ln('shows'), ln('live19')] }),
  O('radiopredio', l('Rádio e TV', 'Radio and TV'), 'cidade.radio', 'predio', undefined, [], { links: [ln('media')] }),
  O('jornalpredio', l('Jornal', 'Newspaper'), 'cidade.jornal', 'predio', undefined, [], { links: [ln('news17')] }),
  O('bar', l('Bar', 'Bar'), 'cidade.bar', 'predio', 'shift+b', ['after18', 'night14'], { links: [ln('talent18')], note: l('Noite, depois do expediente e talentos tocando.', 'Night out, after hours and talent playing.') }),
  O('empresarios', l('Escritórios de empresários', 'Managers\' offices'), 'cidade.empresarios', 'predio', undefined, [], { links: [ln('managers14')] }),
  O('produtores', l('Estúdios e produtores', 'Studios and producers'), 'cidade.estudios', 'predio', 'shift+p', ['producers15']),
  O('rivais', l('Gravadoras rivais', 'Rival labels'), 'cidade.rivais', 'predio', 'k', ['labels'], { note: l('Clicar no prédio = ficha do selo.', 'Click a building = label profile.') }),
  O('beco', l('Beco do submundo', 'Underworld alley'), 'cidade.beco', 'predio', ';', ['crime', 'bauc31'], { bang: l('plano em andamento ou polícia de olho', 'plan underway or police watching') }),
  O('prefeitura', l('Prefeitura', 'City hall'), 'cidade.prefeitura', 'predio', 'shift+k', ['society18'], { bang: l('votação de lei perto do prazo', 'law vote near its deadline') }),
  O('fabrica', l('Fábrica', 'Plant'), 'cidade.fabrica', 'predio', 'shift+i', ['supply18'], { bang: l('falta de estoque ou prensagem atrasada', 'stock shortage or late pressing') }),
  O('banco', l('Banco', 'Bank'), 'cidade.banco', 'predio', undefined, [], { links: [ln('finance', ['business-finance', 'loans7'])] }),
  O('aeroporto', l('Aeroporto e porto', 'Airport and port'), 'cidade.aeroporto', 'predio', 'shift+a', ['airport31', 'customs31'], { bang: l('carga parada na alfândega', 'cargo held at customs') }),
  O('leiloes', l('Casa de leilões', 'Auction house'), 'cidade.leiloes', 'predio', 'shift+x', ['auction31', 'sealed31'], { bang: l('lance coberto ou abertura de envelopes', 'outbid or envelope opening') }),
  O('loja', l('Loja de instrumentos', 'Instrument shop'), 'cidade.loja', 'predio', 'shift+y', ['loja31']),
  O('festival', l('Terreno do festival', 'Festival grounds'), 'cidade.festival', 'predio', 'j', ['festivals']),
  O('fossati', l('Casa Fossati e praça', 'Fossati house and square'), 'cidade.fossati', 'predio', undefined, [], { links: [ln('world', ['worldHub', 'fossati31'])] }),
  // ======================================================== MUNDO
  O('mundo', l('Mundo', 'World'), 'mundo.lugar', 'mapa', undefined, [], { keyRef: 'travel:mundo', links: [ln('world', ['worldHub', 'map27'])], bang: l('países com novidade', 'countries with news') }),
  O('mapa', l('Mapa-múndi', 'World map'), 'mundo.mapa', 'mapa', 'w', ['world', 'regions18', 'regions19', 'cidade5'], { note: l('Clicar no país = mercado, cidades e cultura; clicar numa cidade = o mapa dela (cidade5, onda 5 MAPA).', 'Click a country = market, cities and culture; click a city = its own map (cidade5, wave 5 MAPA).') }),
  O('telex', l('Telex na borda', 'Telex on the edge'), 'mundo.borda', 'jornal', 'shift+w', ['mundo27', 'world17'], {
    forms: [{ era: [1889, 1929], label: l('Telégrafo', 'Telegraph') }, { era: [1930, 1989], label: l('Telex', 'Telex') }, { era: [1990, 2040], label: l('Agência de notícias na tela', 'Newswire on screen') }],
    bang: l('acontecimento grande no mundo este mês', 'big world event this month') }),
  O('cultura', l('Livro "Cultura"', '"Culture" book'), 'mundo.borda', 'livro', 'm', ['movements', 'lendas'], { note: l('Movimentos, lendas e era.', 'Movements, legends and era.') }),
];
for (const o of DEFAULT_OBJECTS5) registerObject5(o);

// ---------------------------------------------------------------- página/aba → objeto

/** Objeto dono de uma página (undefined = fica na pausa ou é desconhecida). */
export function ownerOf5(area: string): Obj5 | undefined {
  for (const o of OBJS5.values()) if (o.opens.some((x) => x.area === area)) return o;
  return undefined;
}

/** Objeto que mostra uma página + aba: a aba pode ter mudado de objeto (MOVES5); senão é o dono da página. */
export function objectFor5(area: string, tab?: [string, string]): Obj5 | undefined {
  if (tab) {
    const mv = moveOf5(area, tab[0], tab[1]);
    if (mv && OBJS5.has(mv.to)) return OBJS5.get(mv.to);
  }
  return ownerOf5(area);
}

/** Marcadores (abas) que um objeto recebe de outras páginas (pelas MOVES5). */
export const movedInto5 = (id: string): Move5[] => MOVES5.filter((m) => m.to === id);
