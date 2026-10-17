// R31 · onda 5 (ACOES5, EXP-13) — DADOS: o que entra no cartão de cada objeto (ações do catálogo acoes5cat.ts, até 6;
// números, até 3; linhas lidas ali). Chave = id de objects5; peças que só existem na cena da casa = `casa.<id>`.
// Papéis já feitos (livro-caixa, mural, revista…) ganham "abrir ▸" sozinhos (acoes5model.card5); "ver tudo ▸" abre a
// página antiga inteira. Fonte das funções de cada objeto: docs/r31/onda5-telas.md (página e abas de cada um).
import { l, type L } from '../../data/world';
import type { Open5 } from './objects5';

export interface CardSpec5 { acts: string[]; nums: string[]; lines?: string; tip?: L; title?: L; all?: Open5 }

const C = (acts: string[], nums: string[], o: Partial<CardSpec5> = {}): CardSpec5 => ({ acts, nums, ...o });
const career = (c: string): CardSpec5 => C([`car.abrir:${c}`, `car.liderar:${c}`], ['carreirasAtivas', 'caixa']);

export const CARDS5: Record<string, CardSpec5> = {
  // ======================================================== SEDE
  sede: C(['irRecado', 'ampliarSede'], ['recados', 'caixa']),
  porta: C(['irCidade', 'sairNoite'], ['energia']),
  mapaparede: C(['irMundo', 'territorio'], ['caixa']),
  secretaria: C(['irRecado'], ['recados'], { lines: 'recados' }),
  chaveiro: C(['irCasa'], ['carreirasAtivas']),
  mesames: C(['decidirMes', 'responderCarta'], ['decisoes', 'ultimoMes'], { lines: 'decisoes' }),
  correspondencia: C(['lerTudo'], ['naoLidas', 'recados']),
  quadroplan: C(['reservar', 'gravar', 'marcarShow'], ['planos', 'artistas']),
  agenda: C(['networking', 'liderar', 'descansar', 'reservar'], ['energia', 'planos']),
  livrocaixa: C(['emprestimo', 'pagarDivida', 'socios'], ['caixa', 'lucroMes', 'divida']),
  cofre: C(['socios', 'transferir', 'emprestimo'], ['participacao', 'caixaLivre']),
  arquivoaco: C(['renovar', 'contratarArtista'], ['vencendo', 'artistas']),
  fichario: C(['contratarArtista', 'renovar'], ['conhecidos', 'artistas']),
  telefone: C(['almoco', 'ligar', 'contratarFunc'], ['contatos']),
  jornal: C(['tv', 'contratarFunc'], ['fama', 'noticias'], { lines: 'manchetes' }),
  radiotv: C(['tv', 'campanha'], ['fama']),
  revista: C(['tv', 'lancar'], ['melhorParada', 'numero1']),
  quadrometas: C(['meta', 'decidirMes'], ['conquistas', 'fama'], { lines: 'metas' }),
  diario: C(['comporSozinho', 'praticar'], ['energia']),
  caderno: C(['meta'], ['ultimoMes', 'fama'], { lines: 'metas' }),
  portaretrato: C(['almocoLucia', 'visitarFossati'], ['filhos']),
  chefe: C(['aprovarPedido', 'liderar'], ['pedidosChefe'], { lines: 'pedidosChefe' }),
  quadrobranco: C(['lancar', 'mixar', 'campanha'], ['lancamentos', 'melhorParada']),
  mesareuniao: C(['decidirMes', 'liderar', 'carreiras'], ['decisoes', 'carreirasAtivas']),
  maquete: C(['ampliarSede'], ['sedeNivel', 'sedeCusto', 'caixaLivre']),
  mural: C(['descansoArtista', 'elogiar', 'renovar', 'gravar'], ['artistas', 'vencendo']),
  olheiro: C(['contratarArtista', 'garimpar'], ['conhecidos']),
  demos: C(['garimpar', 'contratarArtista'], ['conhecidos']),
  lounge: C(['elogiar', 'descansoArtista'], ['artistas']),
  mesasom: C(['mixar', 'gravar', 'compor'], ['sessoes', 'faixas']),
  piano: C(['compor', 'comporSozinho'], ['faixas']),
  salagravacao: C(['mixar', 'gravar'], ['sessoes', 'faixas']),
  palco: C(['marcarShow', 'ensaiar', 'descansoArtista'], ['artistas']),
  prateleiras: C(['remaster', 'lancar'], ['lancamentos']),
  contador: C(['emprestimo', 'socios', 'retirar'], ['caixa', 'ultimoMes', 'divida']),
  quadrofunc: C(['contratarFunc', 'treinar'], ['equipe', 'caixaLivre']),
  graficos: C(['fabricaPropria', 'territorio'], ['melhorParada', 'fama']),
  trofeus: C(['campanha'], ['premios', 'ouro', 'numero1']),
  // ======================================================== CARREIRAS
  'car:label': career('label'), 'car:musician': career('musician'), 'car:manager': career('manager'), 'car:booking': career('booking'),
  'car:festival': career('festival'), 'car:venue': career('venue'), 'car:studio': career('studio'), 'car:publisher': career('publisher'),
  'car:media': career('media'), 'car:platform': career('platform'), 'car:screen': career('screen'), 'car:critic': career('critic'),
  // ======================================================== CASA (EXP-6: a vida pessoal; informação vira coisa do mundo)
  casa: C(['irCasa', 'descansar'], ['energia', 'pessoal']),
  espelho: C(['aparencia', 'ficha', 'praticar'], ['saude', 'estresse', 'famaPessoal'], { lines: 'ambicao' }),
  retratoscasa: C(['encontro', 'familia', 'chamarSair', 'encontroCena'], ['parceiro', 'filhos']),
  cofrecasa: C(['transferir', 'emprestarEmpresa', 'retirar'], ['pessoal', 'caixa', 'participacao']),
  escritoriocasa: C(['carreiras', 'networking', 'liderar'], ['carreirasAtivas', 'caixa']),
  telefonecasa: C(['ligar', 'chamarSair'], ['contatos', 'parceiro']),
  estante: C(['encontroCena', 'estudar', 'praticar'], ['lembrancas', 'famaPessoal']),
  cama: C(['descansar', 'ferias', 'feriasPagas', 'terapia'], ['energia', 'saude', 'estresse']),
  calcozinha: C(['estudar', 'aparicao', 'palestra', 'descansar'], ['energia']),
  garagem: C(['veiculo'], ['veiculos', 'pessoal']),
  'casa.sofa': C(['descansar', 'academia', 'terapia'], ['energia', 'estresse'], { title: l('Sofá', 'Sofa'), all: { area: 'personal', tab: ['life-personal', 'leisure'] } }),
  'casa.escrivaninha': C(['transferir', 'retirar', 'estudar', 'comporSozinho'], ['pessoal', 'caixa', 'energia'], { title: l('Escrivaninha', 'Writing desk'), all: { area: 'wealth' } }),
  'casa.instrumento': C(['praticar', 'comporSozinho'], ['energia', 'famaPessoal'], { title: l('Instrumento', 'Instrument'), all: { area: 'you', tab: ['life-you', 'music'] } }),
  'casa.criancas': C(['familia'], ['filhos'], { title: l('Quarto das crianças', "Kids' room"), all: { area: 'personal', tab: ['life-personal', 'kids17'] } }),
  'casa.discos': C(['campanha'], ['ouro', 'premios'], { title: l('Discos na parede', 'Records on the wall'), all: { area: 'awards' } }),
  'casa.voce': C(['ficha', 'aparencia'], ['famaPessoal', 'idade', 'saude'], { title: l('Você', 'You'), all: { area: 'you' } }),
  'casa.porta': C(['irCidade', 'sairNoite'], ['energia'], { title: l('Porta', 'Door'), all: { area: 'campus18' } }),
  'casa.janela': C(['irCidade'], ['pessoal'], { title: l('Janela', 'Window'), tip: l('Casas à venda e imóveis: "ver tudo".', 'Houses for sale and property: "see all".'), all: { area: 'wealth', tab: ['life-wealth', 'goods8'] } }),
  // ======================================================== CIDADE
  cidade: C(['irCidade'], ['caixa']),
  casashows: C(['marcarShow', 'ensaiar'], ['artistas']),
  radiopredio: C(['tv', 'campanha'], ['fama']),
  jornalpredio: C(['tv'], ['fama', 'noticias'], { lines: 'manchetes' }),
  bar: C(['sairNoite', 'garimpar'], ['energia']),
  empresarios: C(['almoco'], ['contatos']),
  produtores: C(['jantarProdutor', 'gravar'], ['caixaLivre']),
  rivais: C(['contratarArtista'], ['fama']),
  beco: C(['pedidoFamilia'], ['calor']),
  prefeitura: C(['vereadores'], ['fama']),
  fabrica: C(['fabricaPropria'], ['lancamentos']),
  banco: C(['emprestimo', 'pagarDivida'], ['caixa', 'divida']),
  aeroporto: C(['irMundo'], ['caixa']),
  leiloes: C(['remaster'], ['caixaLivre']),
  loja: C(['comprarLoja', 'veiculo'], ['pessoal']),
  decoracao: C(['comprarLoja'], ['pessoal']), // lojas de decoração (DECO-L): o cartão leva à loja; o catálogo abre por "ver tudo"
  festival: C(['aceitarConvite', 'marcarShow'], ['artistas']),
  fossati: C(['almocoLucia', 'visitarFossati'], ['filhos']),
  // ======================================================== MUNDO
  mundo: C(['irMundo', 'territorio'], ['caixa']),
  mapa: C(['territorio'], ['caixa', 'fama']),
  telex: C(['irRecado'], ['ano'], { lines: 'manchetes' }),
  cultura: C(['compor'], ['ano']),
};
