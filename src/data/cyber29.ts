// Rodada 29 (Submundo) — CRIME DIGITAL dos anos 1995+. Organizações INVENTADAS (ids 'f…', como as fictícias do
// orgs17: existem em todos os modos, claramente fictícias — nenhuma pessoa ou grupo real): fazendas de robôs e de
// streams, quadrilhas de vazamento/ransomware, redes de cambismo por robôs, estúdios de voz clonada por IA e
// pirataria na darknet. Cada uma com época (warez 1995+, fazenda de streams 2005+, clones de IA 2015+) e região.
// Ficam FORA da lista padrão orgs17(s) (os NPCs do crime17/crimemem23 não as usam: mundos sem interação do jogador
// ficam iguais); entram pelo mob29 (medidor, interações, serviços) com orgs17(s, false, true) e orgById. Atuam online:
// alcançam qualquer país (mob29.present29).
import { l } from './world';
import type { OrgDef17 } from './orgs17';

export const CYBER29: OrgDef17[] = [
  { id: 'fwarez', name: l('Cena 0day "Nulo"', '0day scene "Null"'), kind: 'cyber', city: '', from: 1995, to: 2014, real: false, power: 35, rackets: ['leaks', 'darknet', 'bootleg'],
    desc: l('Grupos de "release" que vazam discos semanas antes do lançamento — por prestígio, depois por dinheiro.', 'Release groups that leak records weeks before street date — for prestige, then for money.'),
    f: { coragem: 55, empatia: 40, ambicao: 60, impulsividade: 45, lealdade: 50, disciplina: 70 } },
  { id: 'fleak', name: l('Coletivo Vazamento Zero', 'Zero Leak Collective'), kind: 'cyber', city: 'kyiv', from: 1999, to: 2100, real: false, power: 55, rackets: ['leaks', 'clones', 'laundering'],
    desc: l('Invasores e "ransomware": sequestram masters inéditos e pedem resgate — ou vendem o serviço.', 'Intruders and ransomware: they hold unreleased masters hostage — or sell the service.'),
    f: { coragem: 70, empatia: 15, ambicao: 85, impulsividade: 40, lealdade: 35, disciplina: 75 } },
  { id: 'fstream', name: l('Fazenda de Plays Aurora', 'Aurora Play Farm'), kind: 'cyber', city: 'manila', from: 2005, to: 2100, real: false, power: 45, rackets: ['streams', 'bots'],
    desc: l('Galpões com milhares de celulares tocando a mesma faixa em loop; contas falsas para as paradas e para votos populares.', 'Warehouses of phones playing the same track on loop; fake accounts for charts and fan votes.'),
    f: { coragem: 40, empatia: 30, ambicao: 80, impulsividade: 30, lealdade: 45, disciplina: 80 } },
  { id: 'fscalp', name: l('Rede Bilhete-Bot', 'Ticket-Bot Network'), kind: 'cyber', city: '', from: 2008, to: 2100, real: false, power: 40, rackets: ['scalp', 'bots'],
    desc: l('Robôs que compram o estádio inteiro em segundos e revendem pelo triplo.', 'Bots that buy the whole stadium in seconds and resell at triple the price.'),
    f: { coragem: 45, empatia: 20, ambicao: 85, impulsividade: 35, lealdade: 40, disciplina: 70 } },
  { id: 'fclone', name: l('Estúdio Espelho', 'Mirror Studio'), kind: 'cyber', city: 'seoul', from: 2015, to: 2100, real: false, power: 50, rackets: ['clones', 'bots'],
    desc: l('Vozes clonadas por IA e perfis falsos: "inéditas" de astros que nunca as gravaram.', 'AI-cloned voices and fake profiles: "unreleased" tracks by stars who never recorded them.'),
    f: { coragem: 50, empatia: 20, ambicao: 85, impulsividade: 40, lealdade: 35, disciplina: 75 } },
  { id: 'fdark', name: l('Mercado Sombra', 'Shadow Market'), kind: 'cyber', city: 'berlin', from: 2011, to: 2100, real: false, power: 45, rackets: ['darknet', 'bootleg', 'laundering'],
    desc: l('Pirataria e masters roubados na darknet, pagos em criptomoeda.', 'Piracy and stolen masters on the darknet, paid in crypto.'),
    f: { coragem: 55, empatia: 25, ambicao: 80, impulsividade: 40, lealdade: 40, disciplina: 65 } },
];

// Rodada 29 (Facções × gêneros e cenas) — organizações que faltavam para as afinidades culturais. Uma REAL, bem
// documentada e descrita de forma neutra (PCC); as outras INVENTADAS (ids 'f…') para o que seria especulativo (gangues
// de drill de Chicago e de Londres). Como o crime digital, ficam fora da lista padrão (mundo sem interação igual).
export const STREET29: OrgDef17[] = [
  { id: 'pcc', name: l('Primeiro Comando da Capital (PCC)', 'Primeiro Comando da Capital (PCC)'), kind: 'gang', city: 'sao_paulo', from: 1993, to: 2026, real: true, power: 75, rackets: ['protection', 'violence', 'laundering'],
    desc: l('Facção criminosa nascida em 1993 no sistema prisional paulista. Músicas de funk "proibidão" que a citam circulam desde os anos 2000.', 'A criminal faction born in 1993 in São Paulo\'s prison system. "Proibidão" funk songs that name it have circulated since the 2000s.'),
    f: { coragem: 80, empatia: 15, ambicao: 85, impulsividade: 40, lealdade: 80, disciplina: 85 } },
  { id: 'fblock', name: l('Os do Quarteirão', 'The Block Boys'), kind: 'gang', city: 'chicago', from: 2010, to: 2100, real: false, power: 35, rackets: ['violence', 'protection'],
    desc: l('Gangue de bairro (inventada) que disputa esquinas — e faixas de drill — com o quarteirão vizinho.', 'An (invented) neighborhood gang fighting over corners — and drill tracks — with the next block.'),
    f: { coragem: 85, empatia: 15, ambicao: 60, impulsividade: 85, lealdade: 65, disciplina: 25 } },
  { id: 'fpost', name: l('Turma do Código Postal', 'The Postcode Crew'), kind: 'gang', city: 'london', from: 2013, to: 2100, real: false, power: 35, rackets: ['violence', 'protection'],
    desc: l('Turma (inventada) de um código postal do sul de Londres; rivalidade de bairro que vira faixa de drill.', 'An (invented) South London postcode crew; a turf rivalry that becomes drill tracks.'),
    f: { coragem: 85, empatia: 20, ambicao: 60, impulsividade: 80, lealdade: 70, disciplina: 30 } },
];
