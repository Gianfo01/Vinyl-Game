// R33 · INT-1 — objetos clicáveis dos interiores próprios (modelo PURO, sem DOM). Cada objeto fica no mesmo lugar em que a
// arte o pinta (`LAY33`) e leva a uma ação no lugar: ler o que o sistema já sabe (`info:`), abrir a tela do prédio (`go:`) ou
// as ações de outra frente (`own:`, ganchos de `OWNACT33`). Nada de tela nova: tudo cai no painel curto embaixo da cena.

import { l, type L } from '../../data/world';
import type { IntK33 } from '../../sim/sys/place27';

export interface Obj33 {
  id: string; /** chave em LAY33[k] */ lay: string; label: L; tip: L; go: string;
  /** faixa vertical: parede, chão ou o alto todo */ band: 'wall' | 'floor' | 'all';
}
const O = (id: string, lay: string, band: Obj33['band'], label: L, tip: L, go: string): Obj33 => ({ id, lay, band, label, tip, go });

export const OBJS33: Record<IntK33, Obj33[]> = {
  school: [
    O('board', 'board', 'wall', l('Lousa', 'Blackboard'), l('Alunos, prestígio e o professor da escola.', 'Students, prestige and the school\'s teacher.'), 'info:board'),
    O('stands', 'stands', 'floor', l('Estantes de partitura', 'Music stands'), l('As turmas que já se formaram.', 'The classes that have graduated.'), 'info:class'),
    O('piano', 'piano', 'floor', l('Piano de aula', 'Teaching piano'), l('Onde o professor ouve a audição dos alunos.', 'Where the teacher hears the students\' audition.'), 'info:piano'),
    O('rack', 'rack', 'wall', l('Instrumentos de estudo', 'Study instruments'), l('O que a escola empresta aos alunos.', 'What the school lends to students.'), 'info:rack'),
    O('door', 'door', 'all', l('Sala de ensaio', 'Practice room'), l('Abrir a tela da escola: bolsas, professor e formandos.', 'Open the school screen: scholarships, teacher and graduates.'), 'go:own'),
  ],
  plant: [
    O('hopper', 'hopper', 'all', l('Matéria-prima', 'Raw material'), l('Material do ano e quanto custa sobre o base.', 'The year\'s material and what it costs over base.'), 'info:mat'),
    O('press', 'press', 'all', l('Prensa', 'Press'), l('Como se prensa nesta época, capacidade e fila de pedidos.', 'How records are pressed in this era, capacity and the order queue.'), 'info:press'),
    O('belt', 'belt', 'floor', l('Esteira de saída', 'Output belt'), l('Cópias prontas, defeitos e a tela da indústria.', 'Finished copies, defects and the industry screen.'), 'go:own'),
    O('qc', 'qc', 'floor', l('Controle de qualidade', 'Quality control'), l('Defeitos do ano e o que reduz a taxa.', 'This year\'s defects and what lowers the rate.'), 'info:qc'),
    O('ship', 'ship', 'floor', l('Expedição', 'Shipping'), l('Prensagem para terceiros com a capacidade ociosa.', 'Pressing for third parties with idle capacity.'), 'own:ship'),
  ],
  museum: [
    O('gold', 'gold', 'wall', l('Parede de discos de ouro', 'Gold record wall'), l('Os seus discos entre os dez primeiros.', 'Your records in the top ten.'), 'info:gold'),
    O('case0', 'case0', 'all', l('Vitrine de instrumentos', 'Instrument case'), l('Relíquias expostas: quanto vale e de quem foi.', 'Relics on show: what it is worth and whose it was.'), 'info:cases'),
    O('case1', 'case1', 'all', l('Vitrine do violino', 'Violin case'), l('Relíquias expostas: quanto vale e de quem foi.', 'Relics on show: what it is worth and whose it was.'), 'info:cases'),
    O('case2', 'case2', 'all', l('Vitrine dos discos', 'Records case'), l('Relíquias expostas: quanto vale e de quem foi.', 'Relics on show: what it is worth and whose it was.'), 'info:cases'),
    O('ticket', 'ticket', 'floor', l('Bilheteria', 'Ticket booth'), l('Visitantes por ano, ingresso e a ala do museu.', 'Visitors a year, ticket and the museum wing.'), 'own:ticket'),
  ],
  platform: [
    O('rack', 'rack', 'all', l('Servidores', 'Servers'), l('Assinantes que a plataforma atende agora.', 'Subscribers the platform serves right now.'), 'info:rack'),
    O('wall', 'wall', 'wall', l('Parede de curadoria', 'Curation wall'), l('Repasse, catálogos licenciados e a lista em destaque.', 'Payout, licensed catalogues and the featured list.'), 'own:curate'),
    O('desk', 'desk', 'floor', l('Mesa do curador', 'Curator\'s desk'), l('Quem escolhe o que entra nas listas.', 'Who picks what goes on the lists.'), 'info:curate'),
    O('chart', 'chart', 'wall', l('Painel de assinantes', 'Subscriber board'), l('Receita e custo do último mês.', 'Revenue and cost of last month.'), 'info:chart'),
  ],
  agency: [
    O('map', 'map', 'wall', l('Mapa de turnês', 'Tour map'), l('Os artistas na carteira e a comissão de cada um.', 'The acts on the books and each one\'s commission.'), 'info:map'),
    O('desks', 'desks', 'floor', l('Mesas dos agentes', 'Bookers\' desks'), l('Reputação da agência e clientes.', 'Agency reputation and clients.'), 'info:phones'),
    O('wall', 'wall', 'wall', l('Calendário de datas', 'Date calendar'), l('Comissões fechadas no último mês.', 'Commissions closed last month.'), 'info:wall'),
    O('posters', 'posters', 'wall', l('Cartazes dos clientes', 'Client posters'), l('Abrir a tela da agência: carteira e turnês.', 'Open the agency screen: roster and tours.'), 'go:own'),
  ],
  branch: [
    O('clocks', 'clocks', 'wall', l('Relógios do mundo', 'World clocks'), l('As praças onde o selo tem gente.', 'The cities where the label has people.'), 'info:clocks'),
    O('map', 'map', 'wall', l('Mapa-múndi', 'World map'), l('A região que a filial cobre.', 'The region the branch covers.'), 'info:region'),
    O('desks', 'desks', 'floor', l('Mesas da equipe', 'Team desks'), l('Abrir a tela da sede: filiais e equipe.', 'Open the HQ screen: branches and staff.'), 'go:own'),
    O('reception', 'reception', 'floor', l('Recepção', 'Front desk'), l('Quem trabalha aqui e a região coberta.', 'Who works here and the covered region.'), 'info:meet'),
  ],
};

/** Dica de cada chave de leitura quando o sistema ainda não tem o que contar. */
export const EMPTY33: L = l('Nada a contar ainda.', 'Nothing to report yet.');
