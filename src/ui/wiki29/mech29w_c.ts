// Rodada 29 (WIKI) — artigos de mecânica: sede e equipe, vida pessoal, imprensa e escândalos, submundo e jurídico.
// Conteúdo derivado do código (src/data/rules, src/sim/economy, src/sim/branches, src/sim/sys/hq6, hqrooms27,
// managers14, life, life12, stress17, vices, people/health, persona13, heirs8, scandal17, mech29, bridge17, media17,
// criticrel, press18, press27, zines19, image17, fanscandal28, crime17, heist27, world4/charts, cancel19, dispute15,
// fakes19, insure19) e de docs/connect29.md, docs/crimealvos29.md e docs/econ18.md.
//
// O primeiro import (tick) carrega a simulação inteira na ordem certa: vários módulos de sistema têm import circular
// e quebram (TDZ) se forem os primeiros a carregar no Node. No navegador o jogo já carregou tudo antes da wiki.
import '../../sim/tick';
import { l } from '../../data/world';
import type { GameState } from '../../sim/types';
import type { Faq29, MechArt29, Term29 } from './wiki29types';
import { BRANCH_LEVELS, HQ_LEVELS } from '../../data/rules';
import { money } from '../../sim/util';
import { INSOLVENT_AT } from '../../sim/economy';
import { DEPTS } from '../../sim/sys/hq6';
import { ROOM_DEFS27 } from '../../sim/sys/hqrooms27';
import { LUNCH_COST } from '../../sim/sys/managers14';
import { ENERGY_PER_MONTH, WEDDINGS } from '../../sim/sys/life';
import { BREAK_LONG, BREAK_SHORT } from '../../sim/stress17';
import { VICE_INFO } from '../../sim/sys/vices';
import { GIFT_COST } from '../../sim/sys/persona13';
import { TREATMENT } from '../../sim/sys/people/health';
import { CRIT_ACTIONS } from '../../sim/criticrel';
import { SCENE_HEAT19 } from '../../sim/sys/zines19';
import { STANCES27 } from '../../sim/sys/press27';
import { MIN_SHARE, PRED_CAP } from '../../sim/sys/image17';
import { CRIMES17, SEC17 } from '../../sim/sys/crime17';
import { PAYOLA_TIERS } from '../../sim/sys/world4/charts';
import { CANCEL_FROM19, RESP19 } from '../../sim/sys/cancel19';
import { KEYMAN_FROM19 } from '../../sim/sys/insure19';
import { peek29n } from '../../sim/sys/aff29npc';
import { ADULT29, CAP29, CHILD_MIN29, LAWS29, birthRate29 } from '../../sim/sys/family29';

// Valores em "dólares reais" (base 2020): o jogo converte para o preço da época com money(s, x) (centavos nominais).
// Sem jogo carregado mostra o valor-base; com jogo, o preço no ano corrente.
const usd = (s: GameState | null, real: number): string =>
  'US$ ' + Math.round(s ? money(s, real) / 100 : real).toLocaleString('pt-BR') + (s ? '' : ' (2020)');
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const safe = (f: () => string): string => { try { return f(); } catch { return '—'; } };

export const MECH_C: MechArt29[] = [
  // ------------------------------------------------------------------------------------------------ sede
  {
    id: 'hq',
    title: l('Sede, equipe e departamentos', 'HQ, staff and departments'),
    icon: 'building',
    summary: l('A sede define quantas carreiras, funcionários, sessões e equipamentos cabem no selo. Departamentos, salas e filiais somam bônus reais, mas cobram manutenção todo mês.',
      'Your HQ sets how many careers, staff, sessions and gear the label can hold. Departments, rooms and branches add real bonuses, but charge upkeep every month.'),
    what: [
      l('Você começa na Garagem e pode subir até o Campus futurista. Cada nível da sede tem vagas fixas de carreiras, equipe, sessões de estúdio ao mesmo tempo e equipamento, além de um aluguel mensal.',
        'You start in the Garage and can climb to the Futuristic campus. Each HQ level has fixed slots for careers, staff, simultaneous studio sessions and equipment, plus monthly rent.'),
      l('Dentro da sede você monta departamentos (A&R, marketing, jurídico, financeiro, bem-estar, estúdio interno, agência de shows, digital) e compra salas e andares extras. Tudo vira bônus que aparecem no "por quê" dos resultados.',
        'Inside the HQ you build departments (A&R, marketing, legal, finance, wellbeing, in-house studio, booking agency, digital) and buy extra rooms and floors. Everything becomes bonuses shown in the "why" of results.'),
      l('A equipe vem do mercado de profissionais. Empresários reais do ramo (managers) disputam clientes com você: dá para almoçar com eles, fazer as pazes ou pedir indicações. Filiais e subselos levam o selo para outras cidades e gêneros.',
        'Staff come from the professionals market. Real industry managers compete with you for clients: you can lunch with them, make peace or ask for referrals. Branches and sub-labels take the label to other cities and genres.'),
    ],
    inputs: [
      l('Caixa livre: toda obra, contratação e departamento exige o dinheiro na hora.', 'Free cash: every build, hire and department needs the money up front.'),
      l('Ano: a Torre só existe a partir de 1968 e o Campus a partir de 2026 (com hologramas).', 'Year: the Tower exists from 1968 and the Campus from 2026 (with holograms).'),
      l('Reputação comercial: a Torre pede 55 e o Campus pede 65.', 'Commercial reputation: the Tower needs 55 and the Campus 65.'),
      l('Tecnologia: o departamento Digital exige a internet.', 'Technology: the Digital department needs the internet.'),
      l('Cidade e bairro: salas custam mais em mercados caros (América do Norte ×1) e menos em outros (África ×0,5).', 'City and neighborhood: rooms cost more in pricey markets (North America ×1) and less elsewhere (Africa ×0.5).'),
      l('Seu carisma: pesa no almoço com empresários.', 'Your charisma: matters in lunches with managers.'),
    ],
    outputs: [
      l('Quantas carreiras e artistas você consegue tocar e quantos funcionários cabem.', 'How many careers and acts you can run and how many staff fit.'),
      l('Apelo, vendas, bilheteria e qualidade das gravações (via departamentos, salas e foco das filiais).', 'Appeal, sales, box office and recording quality (via departments, rooms and branch focus).'),
      l('Custo fixo mensal: aluguel, salários, manutenção de departamentos e salas. Ver [[mech:money]].', 'Monthly fixed cost: rent, salaries, upkeep of departments and rooms. See [[mech:money]].'),
      l('Moral e estresse do elenco e do dono (bem-estar, jardim, lounge).', 'Roster and owner morale and stress (wellbeing, garden, lounge).'),
      l('Mercados alcançados sem distribuidor (1 a 4, conforme o nível).', 'Markets reached without a distributor (1 to 4, by level).'),
    ],
    rules: [
      l('Contratar um profissional custa na hora metade do salário mensal dele (luvas). Demitir custa um salário inteiro de rescisão. Sem vaga de equipe na sede, não dá para contratar.',
        'Hiring a professional costs half their monthly salary up front (sign-on). Firing costs one full salary in severance. With no staff slot in the HQ, you cannot hire.'),
      l('Vagas de [[glossario:departamento|departamento]] por nível: 1, 2, 4, 6, 8, 8. Cada departamento tem 3 níveis; o nível seguinte pede uma sede maior. A manutenção é por nível, todo mês.',
        'Department slots by level: 1, 2, 4, 6, 8, 8. Each department has 3 levels; the next level needs a bigger HQ. Upkeep is per level, every month.'),
      l('Efeito por nível: marketing +4% de apelo; estúdio interno +0,8 de qualidade; agência de shows +5% de bilheteria; digital +4% de vendas nas paradas; jurídico adiantamentos 4% menores. Desde a rodada 29 os bônus de apelo, vendas e bilheteria valem de verdade (antes eram só texto) e passam pelo teto de bônus.',
        'Per level: marketing +4% appeal; in-house studio +0.8 quality; booking agency +5% box office; digital +4% chart sales; legal 4% smaller advances. Since round 29 the appeal, sales and box office bonuses really apply (before they were text only) and go through the bonus cap.'),
      l('Salas extras abrem depois da obra (1 a 4 meses) e pagam manutenção: ex. Estúdio B dá +1 sessão, Sala de reunião +2 carreiras, Sala de imprensa +3% de apelo. Salas são do selo e vão junto na mudança; andares ficam no prédio.',
        'Extra rooms open after construction (1 to 4 months) and pay upkeep: e.g. Studio B gives +1 session, Meeting room +2 careers, Press room +3% appeal. Rooms belong to the label and move with you; floors stay with the building.'),
      l('Comprar o prédio custa 90 meses de aluguel e acaba com o aluguel até a próxima mudança de sede.', 'Buying the building costs 90 months of rent and ends rent until the next HQ move.'),
      l('Filiais abrem a partir do Loft, até (nível × 2 − 2). O foco da filial rende mais com o nível dela (×1 + 0,5 por nível) e ×1,5 com diretor regional.',
        'Branches open from the Loft, up to (level × 2 − 2). Branch focus grows with its level (×1 + 0.5 per level) and ×1.5 with a regional director.'),
      l('Almoço com empresário: a cada 6 meses; a opinião sobe 5 + carisma. Indicação: exige opinião +20, uma por ano, e o cliente indicado vale mais nas propostas por 3 meses.',
        'Manager lunch: every 6 months; opinion rises 5 + charisma. Referral: needs opinion +20, once a year, and the referred client counts more in offers for 3 months.'),
      l('Subselo: exige Loft; instalação de US$ 5 mil (2020) mais o capital inicial, que é transferência, não lucro.', 'Sub-label: needs a Loft; US$ 5k (2020) setup plus starting capital, which is a transfer, not profit.'),
    ],
    tips: [
      l('Antes de ampliar a sede, some aluguel + manutenção ao custo fixo: [[mech:money|caixa negativo]] por meses seguidos quebra o selo.', 'Before upgrading, add rent + upkeep to your fixed cost: negative cash for consecutive months bankrupts the label.'),
      l('O departamento mais barato de manter (A&R) já rende mais ações de scouting; ótimo para o começo.', 'The cheapest department to keep (A&R) already gives more scouting actions; great early on.'),
      l('Salas que dão vagas (reunião, Estúdio B) às vezes valem mais que mudar de sede inteira.', 'Rooms that add slots (meeting, Studio B) are sometimes worth more than a full HQ move.'),
      l('Empresário em rixa dificulta propostas aos clientes dele por 4 anos; pagar o acordo pode sair barato.', 'A feuding manager hurts offers to their clients for 4 years; paying the settlement can be cheap.'),
    ],
    pages: ['hq', 'sede25', 'campus18', 'team', 'management', 'managers14'],
    see: ['mech:money', 'mech:careers', 'mech:scouting', 'mech:contracts'],
    nums: (s) => {
      const lv = s ? HQ_LEVELS[Math.min(HQ_LEVELS.length - 1, Math.max(0, s.player?.hq ?? 0))] : undefined;
      const top = HQ_LEVELS[HQ_LEVELS.length - 1];
      const mkt = DEPTS.find((d) => d.id === 'marketing');
      return [
        [l('Níveis de sede', 'HQ levels'), `${HQ_LEVELS.length} (${HQ_LEVELS[0].name.pt} → ${top.name.pt})`],
        [l('Sua sede: carreiras / equipe / sessões', 'Your HQ: careers / staff / sessions'), lv ? `${lv.name.pt}: ${lv.careers} / ${lv.staff} / ${lv.sessions}` : '—'],
        [l('Ampliar até o Campus', 'Upgrade to the Campus'), usd(s, top.upgradeCost)],
        [l('Departamentos disponíveis', 'Departments available'), String(DEPTS.length)],
        [l('Marketing: apelo por nível', 'Marketing: appeal per level'), mkt ? `+${pct(mkt.perLevel.appeal ?? 0)}` : '—'],
        [l('Estúdio B: custo da obra', 'Studio B: build cost'), usd(s, ROOM_DEFS27.studioB.cost)],
        [l('Filial: escritório regional', 'Branch: regional office'), usd(s, BRANCH_LEVELS[0].cost)],
        [l('Almoço com empresário', 'Manager lunch'), usd(s, LUNCH_COST)],
      ];
    },
    docs: ['docs/connect29.md', 'docs/econ18.md'],
  },

  // ------------------------------------------------------------------------------------------------ vida
  {
    id: 'life',
    title: l('Vida pessoal e saúde', 'Personal life and health'),
    icon: 'heart',
    summary: l('Você é uma pessoa no mundo: tem tempo livre limitado, patrimônio próprio, amores, filhos, vícios, saúde e estresse. Se o dono morre sem herdeiro, a partida acaba.',
      'You are a person in the world: limited free time, your own wealth, loves, children, vices, health and stress. If the owner dies with no heir, the run ends.'),
    what: [
      l('Todo mês você tem algumas [[glossario:bolinhas|bolinhas]] de tempo livre. Elas pagam namoro, casamento, família, prática, terapia, academia, noitadas e ações sobre pessoas. Carreiras que passam do expediente comem bolinhas pessoais.',
        'Each month you get a few free-time slots. They pay for dating, marriage, family, practice, therapy, gym, nights out and actions on people. Careers that run past office hours eat personal slots.'),
      l('Seu patrimônio pessoal é separado do caixa da empresa: casamento, viagens e vícios saem do seu bolso. Rotinas (terapia, academia, jantar a dois, família, hobby, prática) podem rodar sozinhas no fim do mês quando precisar.',
        'Your personal wealth is separate from company cash: weddings, trips and vices come out of your pocket. Routines (therapy, gym, date night, family, hobby, practice) can run on their own at month end when needed.'),
      l('Eventos de vida aparecem como pop-ups com respostas e custos visíveis. Filhos crescem, ganham temperamento e aos 18 escolhem um caminho. Quando o dono morre, se afasta ou se aposenta, você passa a jogar com um herdeiro.',
        'Life events pop up with visible answers and costs. Kids grow up, gain a temperament and at 18 choose a path. When the owner dies, steps away or retires, you continue as an heir.'),
      l(`Família no mundo inteiro (R29): todo artista NPC também namora, casa, tem filhos, se separa e deixa herança — em rodízio de ${CAP29} pessoas por mês (quem fica meses sem vez recupera a chance acumulada, então o banco enorme anda no mesmo ritmo). Casais célebres (duas pessoas do mundo) gravam duetos e fazem turnê do casal; divórcio dentro da mesma banda vira rixa e pode rachar o grupo; com filhos e fama, a guarda vira manchete. Filhos musicais estreiam entre 17 e 24 anos (ou de 12 a 16, se forem prodígios e a época tiver crianças no palco) com fama e fãs herdados — às vezes na banda do pai/mãe. Filhos de empresários, produtores, líderes de selo, equipe e críticos crescem e seguem carreira (artista, produtor, empresário, equipe/A&R, crítico ou executivo), com a porta aberta pelo sobrenome. A aba Família da ficha mostra a árvore em retratos; o diretório tem o filtro Família e a busca (Ctrl+K) acha os filhos, até os bebês.`,
        `Family across the whole world (R29): every NPC artist also dates, marries, has children, splits up and leaves an inheritance — on a rotation of ${CAP29} people a month (anyone skipped for months catches up through accumulated odds, so a huge database moves at the same pace). Celebrity couples (two people of the world) record duets and tour together; a divorce inside the same band becomes a feud and can split the group; with children and fame, custody makes the headlines. Musical children debut between 17 and 24 (or 12 to 16 if they are prodigies and the era puts kids on stage) with inherited fame and fans — sometimes in their parent's band. Children of managers, producers, label heads, staff and critics grow up and pick a career (artist, producer, manager, staff/A&R, critic or executive), with the surname opening doors. The person sheet's Family tab shows a portrait tree; the directory has a Family filter and search (Ctrl+K) finds the children, even babies.`),
      l(`Estrelas mirins (R29): a partir de ${CHILD_MIN29} anos, conforme a época — criança-prodígio (1920–1965), concurso de calouros (1930+), programa infantil de TV (1950+), grupo infantil ou de irmãos (1960–2005, muitas vezes irmãos de verdade, no estilo Jackson 5 ou Menudo), trainee de idol em Seul ou Tóquio (1992+) e escola de música (1970+). Todo menor de ${ADULT29} anos num ato tem responsável (o pai/mãe; para gente real, só o documentado — nunca um nome inventado), fundo pela lei da época, escola e limite de horas na agenda, tutor na estrada e risco de exploração. O cabeçalho da ficha mostra "Menor · responsável".`,
        `Child stars (R29): from age ${CHILD_MIN29}, depending on the era — child prodigy (1920–1965), talent contest (1930+), kids' TV show (1950+), kid or sibling group (1960–2005, often real siblings, Jackson 5 or Menudo style), idol trainee in Seoul or Tokyo (1992+) and music school (1970+). Every minor under ${ADULT29} in an act has a guardian (the parent; for real people, only the documented one — never an invented name), a trust fund under the era's law, school and hour limits on the schedule, a road tutor and exploitation risk. The sheet header shows "Minor · guardian".`),
    ],
    inputs: [
      l('Traços, idade, fama e patrimônio do dono.', 'The owner\'s traits, age, fame and wealth.'),
      l('Agenda das carreiras (reserva bolinhas) e perks de energia.', 'Career schedule (reserves slots) and energy perks.'),
      l('Turnês, crises, escândalos e vícios, que somam estresse.', 'Tours, crises, scandals and vices, which add stress.'),
      l('Época e país: imposto de herança, drogas da época, costumes.', 'Era and country: inheritance tax, drugs of the time, customs.'),
      l('Equipe médica contratada (médico, fonoaudiólogo, psicólogo).', 'Hired medical staff (doctor, voice therapist, therapist).'),
      l('Departamento de bem-estar e salas como o jardim (menos estresse). Ver [[mech:hq]].', 'Wellbeing department and rooms like the garden (less stress). See [[mech:hq]].'),
      l('Natalidade e leis do trabalho infantil da época e do país (família de todos os artistas, estrelas mirins).', 'The era\'s and country\'s birth rate and child labor laws (every artist\'s family, child stars).'),
    ],
    outputs: [
      l('Saúde e estresse: quebra leva a colapso, vício, doença ou escândalo.', 'Health and stress: a breakdown leads to collapse, addiction, illness or scandal.'),
      l('Herdeiros e continuidade da partida.', 'Heirs and the continuation of the run.'),
      l('Opinião das pessoas sobre você (presentes, favores, ações).', 'People\'s opinion of you (gifts, favors, actions).'),
      l('Fama pessoal e reputação institucional (casamento de gala, escândalos).', 'Personal fame and institutional reputation (gala wedding, scandals).'),
      l('Shows e gravações: problemas de voz ou lesão sem tratamento derrubam bilheteria e qualidade.', 'Shows and recordings: untreated voice or injury problems cut box office and quality.'),
      l('Família dos artistas (R29): casal célebre soma fama e público cruzado nos dois atos; casamento, divórcio, guarda, caso extraconjugal e estreia de filho viram notícia ([[mech:press]]); o caso que vira boato chega à sua assessoria como segredo guardado ([[mech:underworld]]); herdeiros com nome entram no espólio, nas brigas por relíquias e nos projetos póstumos ([[mech:awards]]).',
        'Artists\' families (R29): a celebrity couple adds fame and cross-over audience to both acts; weddings, divorces, custody, affairs and a child\'s debut become news ([[mech:press]]); an affair that turns into a rumor reaches your PR team as a kept secret ([[mech:underworld]]); named heirs enter estates, relic disputes and posthumous projects ([[mech:awards]]).'),
      l('Contratos com menores: o responsável negocia duro (proposta −0,04, ou −0,02 com 16–17 anos; −0,03 a mais com pai/mãe-empresário) e renova menos; filho com pai/mãe no seu elenco ganha "a família conhece você: porta aberta" (+0,05). Ver [[mech:contracts]].',
        'Contracts with minors: the guardian bargains hard (offer −0.04, or −0.02 at 16–17; another −0.03 with a parent-manager) and renews less; a child whose parent is on your roster gets "the family knows you: open door" (+0.05). See [[mech:contracts]].'),
    ],
    rules: [
      l('Tempo livre: ENERGY_PER_MONTH bolinhas por mês (mais os perks de energia), mínimo 1.', 'Free time: ENERGY_PER_MONTH slots a month (plus energy perks), minimum 1.'),
      l('[[glossario:desgaste|Estresse]] tem duas camadas: curto prazo e desgaste longo. Só quebra quando o curto passa de 65 E o longo passa de 45; a chance mensal chega a no máximo 35%.',
        'Stress has two layers: short term and long-term wear. It only breaks when short is above 65 AND long is above 45; the monthly chance tops out at 35%.'),
      l('O desgaste longo sobe quando o curto fica acima de 40 e cai devagar quando fica abaixo de 30. Terapia, férias e família aliviam.',
        'Long-term wear rises while short stress stays above 40 and falls slowly below 30. Therapy, holidays and family relieve it.'),
      l('Casamento: três opções (cartório, festa, gala). A gala dá +10 de fama pessoal e +2 de reputação institucional; todas gastam 2 bolinhas.',
        'Wedding: three options (registry, party, gala). The gala gives +10 personal fame and +2 institutional reputation; all cost 2 slots.'),
      l('Vícios: cigarro, bebida e drogas aliviam estresse na hora, mas criam dependência e tiram saúde. Reabilitação exige dependência 20+ e custa US$ 6 mil (2020).',
        'Vices: cigarettes, drinking and drugs relieve stress now, but build dependency and cost health. Rehab needs dependency 20+ and costs US$ 6k (2020).'),
      l('Morte do dono: dependência pesada (70+) com saúde abaixo de 40 tem chance de overdose; acima de 60 anos com saúde abaixo de 20, 5% ao mês.',
        'Owner death: heavy dependency (70+) with health below 40 risks overdose; over 60 with health below 20, 5% a month.'),
      l('Herança de família paga imposto da época (15% antes de 1940, 35% até 1980, 25% depois; +8% acima de US$ 2 milhões; cônjuge paga metade). Em vida, o dono passa 60% do patrimônio.',
        'Family inheritance pays the era\'s tax (15% before 1940, 35% until 1980, 25% after; +8% above US$ 2 million; spouse pays half). In life, the owner hands over 60% of wealth.'),
      l('Presente: US$ 600 (2020), uma vez por ano por pessoa; vale +7 de opinião (mais com gente vaidosa ou pouco generosa).', 'Gift: US$ 600 (2020), once a year per person; worth +7 opinion (more with vain or stingy people).'),
      l(`Família NPC, chance por mês antes do acúmulo: começar a namorar 1,1% (18–68 anos), casar 0,7%, filho de casados 0,95% × natalidade (pais de 21–45 anos, até 4 filhos), separação 0,35% (+0,8% com vício, +0,4% com estresse acima de 70, +0,2% em turnê). Natalidade: ×${birthRate29(1930)} até 1945, ×${birthRate29(1955)} no baby boom (1946–64), ×${birthRate29(1970)} até 1979, ×${birthRate29(1990)} até 1999, ×${birthRate29(2010)} depois. Divórcio: estresse +18, moral −12 e a casa dividida (×0,55). Casal célebre, uma vez por ano: 22% de dueto e 15% de turnê do casal (+6 de embalo nos dois atos).`,
        `NPC family, monthly odds before accumulation: start dating 1.1% (ages 18–68), marry 0.7%, a married couple's child 0.95% × birth rate (parents aged 21–45, up to 4 children), separation 0.35% (+0.8% with an addiction, +0.4% with stress above 70, +0.2% on tour). Birth rate: ×${birthRate29(1930)} until 1945, ×${birthRate29(1955)} in the baby boom (1946–64), ×${birthRate29(1970)} until 1979, ×${birthRate29(1990)} until 1999, ×${birthRate29(2010)} after. Divorce: stress +18, morale −12 and the household split (×0.55). Celebrity couple, once a year: 22% chance of a duet and 15% of a couple's tour (+6 momentum for both acts).`),
      l(`Leis do artista menor (parte dos ganhos que vai para o fundo): ${LAWS29.map((x) => `${x.cc === '*' ? 'demais países' : x.cc} desde ${x.y}: ${pct(x.trust)}`).join(' · ')}. Antes delas não há fundo nem limite. O fundo sai dos ganhos do próprio menor (não é custo do selo) e passa a ele aos 18. Tutor na estrada: US$ 300 (2020) por mês de turnê.`,
        `Child performer laws (share of earnings put in trust): ${LAWS29.map((x) => `${x.cc === '*' ? 'other countries' : x.cc} from ${x.y}: ${pct(x.trust)}`).join(' · ')}. Before them there is no trust and no limit. The trust comes out of the minor's own earnings (not a label cost) and goes to them at 18. Road tutor: US$ 300 (2020) per touring month.`),
      l('Exploração: um menor seu com carga acima de 70 (85 aos 16–17; 90 sem lei) ou mais de 10 dias de estrada no mês (16 aos 16–17; 18 sem lei) por 3 meses seguidos pode virar denúncia — reputação com artistas −4, institucional −3, multa (onde há lei) e escândalo de conduta. Pai/mãe-empresário: 5% ao ano de sumir com o fundo e 12% de briga. "Maldição da estrela mirim": dos 18 aos 30, 3,5% + fama/2500 + estresse/3000 ao ano de cair no vício.',
        'Exploitation: a minor of yours with load above 70 (85 at 16–17; 90 with no law) or more than 10 road days a month (16 at 16–17; 18 with no law) for 3 straight months may be reported — reputation with artists −4, institutional −3, a fine (where there is a law) and a conduct scandal. Parent-manager: 5% a year of running off with the trust and 12% of a fight. "Child-star curse": from 18 to 30, 3.5% + fame/2500 + stress/3000 a year of falling into addiction.'),
      l('Pessoas reais: no modo exato só a família documentada (nada de namoro, casamento, filho ou pai/mãe-empresário inventado). Nos mundos alternativos, depois do início, casamentos e filhos simulados valem como história alternativa e aparecem marcados "simulado" — nunca antes do início nem contra o documentado.',
        'Real people: in exact mode only the documented family (no invented dating, marriage, child or parent-manager). In alternative worlds, after the start, simulated marriages and children count as alternative history and are marked "simulated" — never before the start nor against the documented record.'),
    ],
    tips: [
      l('Ligue a rotina de terapia em "quando precisar": ela entra sozinha quando o estresse passa de 55.', 'Set therapy to "when needed": it kicks in by itself when stress goes above 55.'),
      l('Ter um filho adulto ou cônjuge garante herdeiro de família, que recebe o patrimônio; quem é de fora assume só o selo.', 'An adult child or spouse guarantees a family heir, who gets the wealth; outsiders take only the label.'),
      l('Um mês de folga zera pouco o curto prazo; o que salva é baixar o desgaste longo antes que ele passe de 45.', 'A month off barely dents short stress; what saves you is lowering long-term wear before it passes 45.'),
      l('Seguro de pessoa-chave paga se a estrela morrer. Ver [[mech:underworld]].', 'Key-person insurance pays if the star dies. See [[mech:underworld]].'),
      l('Estrela mirim rende manchete e público jovem, mas respeite a escola e o limite de turnê: três meses de sobrecarga seguidos viram denúncia.', 'A child star brings headlines and a young audience, but respect school and the touring limit: three straight months of overload become a complaint.'),
      l('Quer o filho de uma estrela? Se o pai/mãe está no seu elenco (ou gosta de você), a proposta já começa com a porta aberta; sobrenome famoso de outro selo encarece.', 'Want a star\'s child? If the parent is on your roster (or likes you), the offer starts with an open door; a famous surname from another label costs more.'),
    ],
    pages: ['personal', 'you', 'night14', 'wealth', 'diary', 'directory'],
    see: ['mech:hq', 'mech:story', 'mech:connections', 'mech:underworld', 'mech:careers', 'glossario:estrela-mirim', 'glossario:casal-celebre', 'cat:familia-leis-menores'],
    nums: (s) => [
      [l('Bolinhas de tempo livre por mês', 'Free-time slots per month'), String(ENERGY_PER_MONTH)],
      [l('Quebra: estresse curto / longo acima de', 'Breakdown: short / long stress above'), `${BREAK_SHORT} / ${BREAK_LONG}`],
      [l('Casamento de gala', 'Gala wedding'), usd(s, WEDDINGS.gala.cost)],
      [l('Uma dose de drogas', 'A dose of drugs'), usd(s, VICE_INFO.drugs.cost)],
      [l('Clínica de reabilitação (equipe médica)', 'Rehab clinic (medical staff)'), usd(s, TREATMENT.rehab.cost)],
      [l('Presente para alguém', 'Gift for someone'), usd(s, GIFT_COST)],
      [l('Família NPC: pessoas por mês no rodízio', 'NPC family: people per month in the rotation'), String(CAP29)],
      [l('Estrela mirim: idade mínima · maioridade', 'Child star: minimum age · adulthood'), `${CHILD_MIN29} · ${ADULT29}`],
      [l('Natalidade agora (× chance de filho)', 'Birth rate now (× child odds)'), s ? `×${birthRate29(s.year)}` : '×0.72–×1.35'],
      [l('Leis do artista menor registradas', 'Child performer laws on record'), String(LAWS29.length)],
    ],
    docs: ['docs/rodada17.md', 'docs/familia29.md'],
  },

  // ------------------------------------------------------------------------------------------------ imprensa
  {
    id: 'press',
    title: l('Imprensa, críticos e escândalos', 'Press, critics and scandals'),
    icon: 'newspaper',
    summary: l('Veículos, críticos, boatos e entrevistas mexem no apelo e na fama. Escândalos têm tipo e gravidade, a reação depende do país e da época, e um escândalo pesado derruba o próximo disco.',
      'Outlets, critics, rumors and interviews move appeal and fame. Scandals have a type and severity, the reaction depends on country and era, and a heavy scandal drags down the next record.'),
    what: [
      l('O mundo tem veículos por época (revistas, TV, rádio, tabloides, fanzines, blogs, redes) com linha editorial, alcance e credibilidade. Boatos nascem numa cidade e se espalham. Você pode plantar notícias, dar exclusivas e responder a boatos.',
        'The world has outlets by era (magazines, TV, radio, tabloids, zines, blogs, social media) with an editorial line, reach and credibility. Rumors start in a city and spread. You can plant news, give exclusives and answer rumors.'),
      l('Críticos dão notas aos lançamentos. A relação com cada um (de −50 a +50) mexe um pouco nas notas futuras. Você também pode seguir carreira de jornalista, fundar um fanzine ou comprar uma revista.',
        'Critics score releases. Your relationship with each one (−50 to +50) nudges future scores a bit. You can also follow a journalist career, found a zine or buy a magazine.'),
      l('Entrevistas e coletivas são jogáveis: você escolhe uma postura por pergunta (polêmica, charmosa, misteriosa ou esquiva). Escândalos passam por um pipeline único que calcula a reação sem sorteio.',
        'Interviews and press conferences are playable: you pick a stance per question (controversial, charming, mysterious or evasive). Scandals go through a single pipeline that computes the reaction without dice.'),
    ],
    inputs: [
      l('Tipo e gravidade do escândalo (drogas, sexo, violência, blasfêmia, política, dinheiro, conduta, ofensa, surto, crime).', 'Scandal type and severity (drugs, sex, violence, blasphemy, politics, money, conduct, offense, meltdown, crime).'),
      l('Religiosidade e censura do país na época.', 'Religiosity and censorship of the country at the time.'),
      l('Dureza da imprensa local e se ela já não gostava do gênero.', 'Harshness of the local press and whether it already disliked the genre.'),
      l('Fãs de núcleo do ato (amortecem) e fama no país (mais gente vê).', 'The act\'s core fans (soften it) and fame in the country (more people see it).'),
      l('Gênero rebelde (rock, hip-hop, eletrônica).', 'Rebel genre (rock, hip-hop, electronic).'),
      l('Sua relação com críticos e veículos; sala de imprensa e assessoria.', 'Your relationship with critics and outlets; press room and publicist.'),
    ],
    outputs: [
      l('Fama no país do escândalo e na região. Ver [[mech:fame]].', 'Fame in the scandal\'s country and region. See [[mech:fame]].'),
      l('Patrocínios: marcas "família" rompem primeiro, as "ousadas" nunca.', 'Sponsorships: "family" brands drop first, "edgy" ones never.'),
      l('Estresse e relações no elenco (colegas devotos se ressentem).', 'Stress and relations in the roster (devout bandmates resent it).'),
      l('Apelo de estreia e vendas nas paradas.', 'Launch appeal and chart sales.'),
      l('Facções de fãs: puristas, mainstream, colecionadores e comunidade reagem diferente a cada tipo.', 'Fan factions: purists, mainstream, collectors and community react differently to each type.'),
      l('Hype, fãs, superfãs e haters (entrevistas); reputação (jabá descoberto).', 'Hype, fans, superfans and haters (interviews); reputation (exposed payola).'),
    ],
    rules: [
      l('Gravidade efetiva = gravidade × multiplicadores (fé, censura, imprensa, fãs de núcleo até −35%, gênero rebelde ×0,80, fama no país). Abaixo de 25 fica como boato; de 25 para cima é público.',
        'Effective severity = severity × multipliers (faith, censorship, press, core fans up to −35%, rebel genre ×0.80, fame in the country). Below 25 it stays a rumor; 25 and up it is public.'),
      l('Escândalo → próximo disco (rodada 29): lançamento até 26 semanas depois de escândalo com efeito 40+ (fora do gênero rebelde) estreia com apelo menor, até −15% (efeito ÷ 600). Vale para NPCs também.',
        'Scandal → next record (round 29): a release up to 26 weeks after a scandal with effect 40+ (outside rebel genres) launches with lower appeal, up to −15% (effect ÷ 600). NPCs too.'),
      l('[[glossario:efeito-streisand|Efeito Streisand]]: no gênero rebelde, polêmica recente (até 8 semanas, efeito 20+) dá +6% nas vendas; fora dele, escândalo de efeito 60+ tira 5% por 6 semanas.',
        'Streisand effect: in rebel genres, a recent controversy (up to 8 weeks, effect 20+) gives +6% sales; outside them, a scandal with effect 60+ costs 5% for 6 weeks.'),
      l('Críticos: cópia antecipada (+6 de relação), audição com jantar (+15, mas 12% de chance de virar notícia de jabá: −10 e −4 de reputação institucional), rebater em público (−25, +2 de reputação com artistas). A relação ajusta notas em até ±0,5.',
        'Critics: advance copy (+6), private listening with dinner (+15, but 12% chance of a payola story: −10 and −4 institutional reputation), public rebuttal (−25, +2 artist reputation). The relationship shifts scores by up to ±0.5.'),
      l('Sua resenha como jornalista entra nas vendas das primeiras 12 semanas (até +10%), conforme credibilidade × alcance.', 'Your review as a journalist counts in the first 12 weeks of sales (up to +10%), by credibility × reach.'),
      l('Responder a boato: negar o que é falso corta o estrago; negar o que é verdade vira escândalo de mentira se provarem; assumir antes reduz o escândalo a 60%; processar algo verdadeiro quase sempre perde e espalha o boato.',
        'Answering a rumor: denying a falsehood cuts the damage; denying the truth becomes a lying scandal if proven; owning it first cuts the scandal to 60%; suing over the truth almost always loses and spreads it.'),
      l('Entrevista: a postura polêmica acumula calor; no fim há chance (calor ÷ 120) de virar escândalo.', 'Interview: the controversial stance builds heat; at the end there is a chance (heat ÷ 120) of a scandal.'),
      l('Fanzines esquentam a dupla cidade × gênero; com 25 de calor nasce uma cena local.', 'Zines heat up a city × genre pair; at 25 heat a local scene is born.'),
    ],
    tips: [
      l('Programe lançamentos longe de escândalos pesados: espere 26 semanas ou aposte num gênero rebelde.', 'Schedule releases away from heavy scandals: wait 26 weeks or bet on a rebel genre.'),
      l('Cópias antecipadas são baratas e seguras; deixe o jantar para críticos que realmente pesam.', 'Advance copies are cheap and safe; save dinners for critics who really matter.'),
      l('Na dúvida, fique em silêncio: o boato morre sozinho ou é provado, sem escândalo extra.', 'When in doubt, stay silent: the rumor dies or is proven, with no extra scandal.'),
      l('Revista própria "da casa" empurra seus discos, mas acumula conflito de interesse. Ver [[mech:reputation]].', 'Your own "house" magazine pushes your records but builds conflict of interest. See [[mech:reputation]].'),
    ],
    pages: ['media', 'media19', 'critics', 'outlets16', 'zines19', 'news17'],
    see: ['mech:fame', 'mech:reputation', 'mech:music', 'mech:underworld'],
    nums: (s) => [
      [l('Ações com críticos', 'Critic actions'), CRIT_ACTIONS.map((a) => `${a.name.pt}: ${a.cost ? usd(s, a.cost) : 'grátis'}`).join(' · ')],
      [l('Posturas de entrevista', 'Interview stances'), String(STANCES27.length)],
      [l('Calor para nascer cena (fanzines)', 'Heat for a scene (zines)'), String(SCENE_HEAT19)],
      [l('Direito de imagem: fatia mínima', 'Image rights: minimum share'), pct(MIN_SHARE)],
      [l('Acordos predatórios por ano (máx.)', 'Predatory deals per year (max)'), String(PRED_CAP)],
    ],
    docs: ['docs/connect29.md', 'docs/rodada17.md'],
  },

  // ------------------------------------------------------------------------------------------------ submundo
  {
    id: 'underworld',
    title: l('Submundo: crime, fraude e jurídico', 'Underworld: crime, fraud and legal'),
    icon: 'mask',
    summary: l('Crimes com chance e risco de exposição visíveis, calor policial por país, organizações, lavagem, jabá e fraudes. Do outro lado, a parte legal: processos, disputas de contrato, cancelamentos e seguros.',
      'Crimes with visible odds and exposure risk, police heat by country, organizations, laundering, payola and frauds. On the other side, the legal part: lawsuits, contract disputes, cancellations and insurance.'),
    what: [
      l('No Submundo você planeja ações contra qualquer personagem, ato ou selo que já exista no ano: intimidar, chantagear, sabotar, grampear, subornar, roubar relíquias, piratear, fraudar paradas, desviar royalties e coisa pior. Antes de agir você vê a chance, a exposição, o custo e o porquê.',
        'In the Underworld you plan actions against any character, act or label that exists that year: intimidate, blackmail, sabotage, wiretap, bribe, steal relics, bootleg, rig charts, skim royalties and worse. Before acting you see the odds, exposure, cost and why.'),
      l('Cada crime deixa [[glossario:calor|calor]] no país. Calor alto abre investigação; um caso pode virar indiciamento, com delação, julgamento, suborno do juiz ou fuga. Algumas ações viram operação jogável em 3 etapas: preparar, executar e encobrir.',
        'Every crime leaves heat in the country. High heat opens an investigation; a case can become an indictment, with plea deal, trial, bribing the judge or fleeing. Some actions become a playable 3-step operation: prepare, execute and cover up.'),
      l('Fora do crime há o lado legal e de imagem: disputas de contrato (auditoria, greve, ataque na imprensa), ondas de cancelamento nas redes (2010+), sindicatos, voz-fantasma e bandas falsas, seguro de pessoa-chave e plano de saúde.',
        'Beyond crime there is the legal and image side: contract disputes (audit, strike, press attack), social media cancel waves (2010+), unions, ghost voices and fake bands, key-person insurance and health plans.'),
    ],
    inputs: [
      l('Traços de quem executa: coragem, impulsividade, disciplina; rosto famoso aumenta a exposição.', 'Executor traits: courage, impulsiveness, discipline; a famous face raises exposure.'),
      l('Organização contratada (poder e especialidade) e sócios no conluio.', 'Hired organization (power and racket) and partners in collusion.'),
      l('Fama do alvo e segredos que você já guarda dele.', 'Target fame and secrets you already hold on them.'),
      l('Calor no país, perícia da época e corrupção local.', 'Heat in the country, forensics of the era and local corruption.'),
      l('Sua segurança (guarda-costas até firma privada) contra planos dos outros.', 'Your security (bodyguard up to private firm) against others\' plans.'),
      l('Jurídico, administração e gestor de direitos na equipe (disputas e auditorias). Ver [[mech:contracts]].', 'Legal, admin and rights manager on staff (disputes and audits). See [[mech:contracts]].'),
    ],
    outputs: [
      l('Dinheiro (golpes), dano a rivais, ou multas, prisão e confisco.', 'Money (schemes), damage to rivals, or fines, prison and seizure.'),
      l('Boatos e fatos públicos, escândalos e reputação. Ver [[mech:press]].', 'Rumors and public facts, scandals and reputation. See [[mech:press]].'),
      l('Obrigações: testemunhas, medo, chantagem; mágoas de vítimas e organizações.', 'Obligations: witnesses, fear, blackmail; grudges from victims and organizations.'),
      l('Integrante preso: bilheteria do ato cai para 35%.', 'Jailed member: the act\'s box office drops to 35%.'),
      l('Rádio e paradas (jabá), fãs e marcas (cancelamento).', 'Radio and charts (payola), fans and brands (cancellation).'),
    ],
    rules: [
      l('Famílias (R29): cada família tem um medidor de respeito, medo, dívida e hostilidade, e 11 interações com custo, chance e consequência — aproximar-se, pagar ou recusar proteção, agiota, lavagem, show no clube deles, jabá de jukebox/rádio, proteção para um artista, virar sócio, pagar a dívida e denunciar. A época e a região mudam o que existe (Lei Seca, clubes e jukebox de 1950–79, jukebox acaba em 1985, jabá vira playlist depois de 2005) e a família só age no próprio país, salvo se for muito poderosa. "Contratar {família} para…" (no clique direito de pessoa, ato, selo ou organização) põe a família para executar um crime: cerca de +8% de chance, 35% do calor cai em você, cachê e um favor devido. Quando o favor vence, pedem algo (assinar um protegido, um show no clube, lavar, esconder alguém, uma fatia de lançamento, um voto) com prazo de 4 semanas; recusar escala: ameaça → sabotagem → intimidação → incêndio no estúdio. Laços pessoa ↔ organização (documentado, membro, associado, deve favor, a família deve, inimizade, sócio) aparecem no cartão da organização e na ficha da pessoa.', 'Families (R29): each family has a meter of respect, fear, debt and hostility, and 11 interactions with cost, odds and consequence — approach, pay or refuse protection, loan shark, laundering, a show at their club, jukebox/radio payola, protection for an act, become a partner, pay the debt and inform on them. Era and region change what exists (Prohibition, 1950–79 clubs and jukeboxes, jukeboxes end in 1985, payola becomes playlists after 2005) and a family only acts in its own country unless very powerful. "Hire {family} for…" (right-click on a person, act, label or organization) has the family run a crime: about +8% odds, 35% of the heat lands on you, a fee and an owed favor. When the favor comes due they ask for something (sign a protégé, a club show, launder, hide someone, a cut of a release, a vote) with a 4-week deadline; refusing escalates: threat → sabotage → intimidation → studio fire. Person ↔ organization ties (documented, member, associate, owes a favor, the family owes, bad blood, partner) show on the organization card and the person sheet.'),
      l('Votação de prêmio comprada (R29): três entradas para o mesmo caminho — ação direta do Submundo (para qualquer ato, o seu ou outro), serviço de uma família (tradicionais subornam um jurado; o crime digital usa robôs no voto popular) e o pedido "vote como a gente quer" (com voto na academia — reputação institucional 50+ ou 3+ prêmios — o seu voto pesa; sem voto, é lobby pago). Métodos: subornar um jurado (força 6, 22% de vazar), lobby na academia (4, 12%), encher as urnas do voto popular (1950–1999; 5, 28%), fazenda de robôs no voto online (2005+; 7, 30% e sobe com os anos), seu voto na academia (4, 8%). Vale para Gramófonos, Prêmios do Ofício, Prêmio da Crítica, prêmios nacionais de júri local e Hall da Fama. Se o ato ganha, há um sorteio de exposição (método + calor): se vazar, o prêmio é cassado, sai escândalo, a reputação institucional cai e abre caso na polícia. Compra que não ganha nada vence em cerca de um ano.',
        'Rigged award votes (R29): three entry points for the same path — a direct Underworld action (for any act, yours or another), a family service (traditional families bribe a juror; cybercrime uses bots in the popular vote) and the "vote our way" request (with an academy vote — institutional reputation 50+ or 3+ awards — your vote counts; without one it is paid lobbying). Methods: bribe a juror (power 6, 22% leak), academy lobbying (4, 12%), stuff the popular-vote ballots (1950–1999; 5, 28%), online bot farm (2005+; 7, 30% and rising), your academy vote (4, 8%). Works for the Gramophones, Craft Awards, Critics\' Prize, national local-jury awards and the Hall of Fame. If the act wins there is an exposure roll (method + heat): on a leak the award is revoked, a scandal breaks, institutional reputation drops and a police case opens. A purchase that wins nothing expires in about a year.'),
      l('Crime digital (R29, 1995+): seis organizações inventadas que agem online e alcançam qualquer país — Cena 0day "Nulo" (1995–2014), Coletivo Vazamento Zero (1999+), Fazenda de Plays Aurora (2005+), Rede Bilhete-Bot (2008+), Mercado Sombra (2011+) e Estúdio Espelho (vozes clonadas por IA, 2015+). Serviços: inflar streams (as plataformas procuram: derrubada, multa, lista negra, escândalo), vazar o álbum de um rival, invadir um selo, doxxing, cambismo por robôs no seu show, clonar a voz de um astro (fato de voz falsa por IA), pirataria na darknet e robôs no voto popular de um prêmio. Os NPCs do mundo não as usam: só entram pelas suas interações.',
        'Cybercrime (R29, 1995+): six invented organizations that act online and reach any country — 0day scene "Null" (1995–2014), Zero Leak Collective (1999+), Aurora Play Farm (2005+), Ticket-Bot Network (2008+), Shadow Market (2011+) and Mirror Studio (AI voice clones, 2015+). Services: inflate streams (platforms look for it: takedown, fine, blacklist, scandal), leak a rival\'s album, hack a label, doxxing, bot-scalping your show, cloning a star\'s voice (an AI fake-voice fact), darknet piracy and bots in an award\'s popular vote. World NPCs do not use them: they only enter through your interactions.'),
      l('Cockpit "Favores e dívidas" (R29): aparece quando há algo — pedidos com prazo e nível de escalada, o que você deve e quando cobram, o que as famílias devem a você e os medidores. Ações: Cumprir, Negociar prazo (+4 semanas, uma vez, com custo e respeito −2), Recusar e Pagar (quita a dívida). Os prazos entram no calendário único.',
        'Cockpit "Favors and debts" (R29): shows up when there is something — requests with deadline and escalation level, what you owe and when they collect, what families owe you and the meters. Actions: Fulfill, Negotiate deadline (+4 weeks, once, with a cost and −2 respect), Refuse and Pay (clears the debt). Deadlines go into the single calendar.'),
      l('Facções × gêneros e cenas (R29): uma organização tem afinidade com um gênero ou cena, com época e território (o país dela) — ex.: Comando Vermelho ↔ funk proibidão (1995+), PCC ↔ funk em São Paulo (2001+), Sinaloa ↔ narcocorridos, Camorra ↔ neomelódicos, Yamaguchi-gumi ↔ enka (até a lei de 1992), Bloods ↔ gangsta rap, Shower Posse ↔ dancehall, Outfit/Genovese ↔ boates e jukeboxes (1945–1979). Com ato seu do gênero no território: convite para o baile (cachê, fama, risco de batida e pânico moral), pedágio para tocar (recusar vira dívida), pressão para escrever sobre a facção (laço de rua "nesta partida (simulado)", censura e calor); movimentos do gênero ali crescem mais rápido, mas com estigma. Regra de segurança: a afinidade é de gênero e cena, nunca de pessoa; laços de gente real só aparecem se documentados.',
        'Factions × genres and scenes (R29): an organization has an affinity with a genre or scene, with period and territory (its country) — e.g. Comando Vermelho ↔ proibidão funk (1995+), PCC ↔ São Paulo funk (2001+), Sinaloa ↔ narcocorridos, Camorra ↔ neomelodici, Yamaguchi-gumi ↔ enka (until the 1992 law), Bloods ↔ gangsta rap, Shower Posse ↔ dancehall, Outfit/Genovese ↔ nightclubs and jukeboxes (1945–1979). With an act of yours in that genre and territory: a party invitation (fee, fame, risk of a raid and moral panic), a toll to play (refusing becomes a debt), pressure to write about the faction (a street tie "in this run (simulated)", censorship and heat); the genre\'s movements there grow faster but carry stigma. Safety rule: the affinity is by genre and scene, never by person; real people\'s ties only appear when documented.'),
      l('Facções × artistas do mundo (R29c): as mesmas facções das cenas abordam também os atos NPC — de selos rivais e independentes — com os mesmos gatilhos (gênero no território, época). Chance por ato e mês de 1% a 5% (sobe com a fama e o estigma da cena, cai em cena com mais de 40 atos); cada organização faz no máximo 1 abordagem por mês (2 em cena de estigma 0,6+) e espera 1 ano para voltar ao mesmo ato. Quem decide é o NPC, com o porquê: traços do líder (rua, rebelde, polêmico, oportunista topam; disciplinado, reservado, religioso recusam), selo (major −25%, selo de cena +8%, sem selo +12%), a era das boates (1945–79, +10% no convite), caixa baixo (+10%) e fama (50+ −12%; abaixo de 15, +6%). Desfechos pelos sistemas de sempre: cachê, embalo e fãs; batida policial e pânico moral; laço de rua e censura ao gravar a faixa; recados e shows cancelados ao recusar o pedágio (6 meses sob pressão); rixa de cena; dispensa pelo selo (major quase sempre); o movimento do gênero cresce; e o selo que tem artista ligado a facção perde peso nas ofertas. Cada abordagem vira o fato "abordagem de facção" — notícia no Feed do Mundo, seção "Facções e o artista" na ficha do ato, "Artistas da cena que eles procuraram" no card da organização e "Elenco e facções" na ficha do selo rival.',
        'Factions × world artists (R29c): the same scene factions also approach NPC acts — on rival labels and independents — with the same triggers (genre in the territory, era). Odds per act and month from 1% to 5% (rising with fame and the scene\'s stigma, falling in scenes with more than 40 acts); each organization makes at most 1 approach a month (2 in scenes with stigma 0.6+) and waits a year before returning to the same act. The NPC decides, with the why: leader traits (street, rebel, provocative, opportunist accept; disciplined, reserved, religious refuse), label (major −25%, scene label +8%, unsigned +12%), the nightclub era (1945–79, +10% on invitations), low cash (+10%) and fame (50+ −12%; under 15, +6%). Outcomes go through the usual systems: fee, momentum and fans; police raids and moral panic; a street tie and censorship for recording the track; threats and cancelled shows for refusing the toll (6 months under pressure); scene feuds; being dropped by the label (majors almost always); the genre\'s movement grows; and a label with an act tied to a faction weighs less in offers. Each approach becomes a "faction approach" fact — news in the World feed, a "Factions and the artist" section on the act sheet, "Scene artists they approached" on the organization card and "Roster and factions" on the rival label sheet.'),
      l('O que você pode fazer com um ato do mundo abordado (menu de ações do ato ou card da organização): "Denunciar a ligação" — só depois de o ato topar, uma vez por ano, chance 45% + reputação institucional/200; se colar, escândalo para o ato, caso contra a facção e +2 de reputação institucional (mas a facção guarda mágoa); se não, −1 e eles sabem de onde veio. "Tirar do esquema (oferecer proteção)" — você paga o acerto, o ato sai do laço e fica devendo um favor. Na negociação, ato sob pressão aceita sua proposta com +8%, ato que você tirou do esquema com +15%, e o buyout de um ato com selo sob pressão sai 25% mais barato. No modo exato, a facção não aborda artista real sem laço documentado.',
        'What you can do about an approached world act (act action menu or organization card): "Report the tie" — only after the act accepted, once a year, odds 45% + institutional reputation/200; if it sticks, a scandal for the act, a case against the faction and +2 institutional reputation (but the faction holds a grudge); if not, −1 and they know where it came from. "Get them out (offer protection)" — you pay the settlement, the act leaves the tie and owes you a favor. In negotiation, an act under pressure takes your offer at +8%, one you got out at +15%, and the buyout of a signed act under pressure is 25% cheaper. In exact mode, a faction does not approach a real artist without a documented tie.'),
      l('Chance e exposição ficam entre 5–95% e 3–90%. Calor soma exposição (calor ÷ 250). Perícia: +4% a partir de 1970, +8% de 1990 (DNA), +12% de 2005 (câmeras e celulares).',
        'Odds and exposure stay within 5–95% and 3–90%. Heat adds exposure (heat ÷ 250). Forensics: +4% from 1970, +8% from 1990 (DNA), +12% from 2005 (cameras and phones).'),
      l('Calor cai 3 por mês (1,5 se há caso aberto no país). Com 60 ou mais, abre investigação. Em liberdade condicional o calor sobe 30% mais e a exposição ganha +10%.',
        'Heat falls 3 a month (1.5 with an open case in the country). At 60 or more, an investigation opens. On parole heat rises 30% faster and exposure gets +10%.'),
      l('Sócios: cada um dá +6% de chance e +5% de exposição e divide o custo, mas pode trair conforme a lealdade.', 'Partners: each gives +6% odds and +5% exposure and splits the cost, but may betray depending on loyalty.'),
      l('Indiciado: a delação cobra 40% da multa sem prisão (mas entrega sócios); julgamento é tudo ou nada; fugir fecha o caso, mas você nunca mais age nem faz turnê naquele país.',
        'Indicted: the plea deal costs 40% of the fine with no prison (but gives up partners); trial is all or nothing; fleeing closes the case, but you can never act or tour in that country again.'),
      l('[[glossario:lavagem|Lavagem]]: rende uma taxa mensal como receita de serviços, mas +3 de calor por mês e a organização passa a ter um segredo seu. Denunciar uma organização tira 15 de calor e dá +3 de reputação institucional — e ela jura vingança.',
        'Laundering: pays a monthly fee as service revenue, but +3 heat a month and the organization now holds a secret on you. Reporting an organization removes 15 heat and gives +3 institutional reputation — and it swears revenge.'),
      l('[[glossario:jaba|Jabá]] muda com a época: tolerado antes de 1960, ilegal depois, promotores independentes (1980–2004, ×1,6 no preço), curadores de playlist no streaming (2012+). Uma vez por semana.',
        'Payola changes with the era: tolerated before 1960, illegal after, independent promoters (1980–2004, ×1.6 price), playlist curators in streaming (2012+). Once a week.'),
      l('[[glossario:onda-de-cancelamento|Cancelamento]] (2010+): pedir desculpas dentro da janela de 2 semanas multiplica a onda por 0,45 ao mês; silêncio, por 0,7; contra-atacar é aposta (0,55 ou 1,15).',
        'Cancellation (2010+): apologizing inside the 2-week window multiplies the wave by 0.45 a month; silence, by 0.7; hitting back is a gamble (0.55 or 1.15).'),
      l('Disputa no tribunal: chance 35% + jurídico na equipe (até +40%) + histórico, entre 15% e 85%. Antes de 1980 os livros raramente estão limpos (−15%).',
        'Court dispute: 35% + legal staff (up to +40%) + track record, between 15% and 85%. Before 1980 the books are rarely clean (−15%).'),
    ],
    tips: [
      l('Olhe o calor do país antes de cada ação: dois golpes seguidos no mesmo lugar ficam bem mais arriscados.', 'Check the country\'s heat before each action: two schemes in a row in the same place get much riskier.'),
      l('Pirataria, chantagem e desvio de royalties repetidos em 12 meses rendem menos (mercado saturado, vítimas espertas).', 'Bootlegging, blackmail and royalty skimming repeated within 12 months pay less (saturated market, wary victims).'),
      l('No modo "Vida real exata" pessoas e selos reais não cometem crimes inventados e ninguém real pode ser morto.', 'In "Exact real life" mode real people and labels do not commit invented crimes and no real person can be killed.'),
      l('Ato de selo rival dispensado depois de uma abordagem de facção fica barato e disposto a mudar de ares: tire-o do esquema e faça a proposta.', 'A rival-label act dropped after a faction approach is cheap and keen for a change: get them out of the scheme and make your offer.'),
      l('Um jurídico e um gestor de direitos na equipe pagam a si mesmos na primeira auditoria. Ver [[mech:hq]].', 'A lawyer and a rights manager on staff pay for themselves at the first audit. See [[mech:hq]].'),
    ],
    pages: ['crime', 'fakes19', 'rights18', 'contracts19'],
    see: ['mech:press', 'mech:contracts', 'mech:reputation', 'mech:hq', 'glossario:abordagem-de-faccao', 'cat:faccoes-cenas'],
    nums: (s) => [
      [l('Tipos de crime', 'Crime types'), String(CRIMES17.length)],
      [l('Segurança mais forte (custo mensal / defesa)', 'Strongest security (monthly / defense)'), safe(() => { const t = SEC17[SEC17.length - 1]; return `${usd(s, t.cost)} / −${pct(t.def)}`; })],
      [l('Jabá: pacote nacional', 'Payola: nationwide package'), safe(() => usd(s, PAYOLA_TIERS[PAYOLA_TIERS.length - 1].real))],
      [l('Cancelamento existe a partir de', 'Cancel waves exist from'), String(CANCEL_FROM19)],
      [l('Cancelamento: fator do silêncio', 'Cancellation: silence factor'), `×${RESP19.silent.k}`],
      [l('Seguro de pessoa-chave a partir de', 'Key-person insurance from'), String(KEYMAN_FROM19)],
      [l('Meses no vermelho até a insolvência', 'Months in the red until insolvency'), String(INSOLVENT_AT)],
      [l('Abordagens de facção a atos do mundo nesta partida (últimas)', 'Faction approaches to world acts in this run (recent)'), s ? String(peek29n(s)?.log.length ?? 0) : '—'],
    ],
    docs: ['docs/crimealvos29.md', 'docs/submundo29.md', 'docs/rodada17.md', 'docs/rodada19.md'],
  },
];

export const TERMS_C: Term29[] = [
  { id: 'estrela-mirim', term: l('Estrela mirim', 'Child star'), def: l('Artista menor de 18 anos (a partir de 12, conforme a época). Tem responsável, fundo pela lei da época, escola e limite de horas; sobrecarga por 3 meses vira denúncia de exploração.', 'An artist under 18 (from 12, depending on the era). Has a guardian, a trust fund under the era\'s law, school and hour limits; 3 months of overload become an exploitation complaint.'), see: ['mech:life', 'cat:familia-leis-menores', 'cat:estrelas-mirins-fontes'] },
  { id: 'casal-celebre', term: l('Casal célebre', 'Celebrity couple'), def: l('Duas pessoas do mundo casadas entre si. Gravam duetos, fazem turnê do casal, somam fama e público cruzado; a morte de um derruba a moral do outro e o divórcio vira manchete.', 'Two people of the world married to each other. They record duets, tour together, add fame and cross-over audience; one\'s death crushes the other\'s morale and a divorce makes headlines.'), see: ['mech:life', 'mech:fame'] },
  { id: 'fundo-coogan', term: l('Fundo Coogan', 'Coogan trust'), def: l('A parte dos ganhos de um menor que a lei manda guardar até os 18 (Lei Coogan, EUA, 1939: 15%; outros países pelas leis da época). Sai do ganho do próprio artista, não do selo.', 'The share of a minor\'s earnings the law requires to be held until 18 (Coogan Law, USA, 1939: 15%; other countries by their era\'s laws). It comes out of the artist\'s own earnings, not the label\'s.'), see: ['mech:life', 'cat:familia-leis-menores'] },
  { id: 'nepo-baby', term: l('Filho de famoso ("nepo baby")', 'Nepo baby'), def: l('Filho de artista ou de gente da indústria que segue carreira. O sobrenome abre portas (fama inicial, contatos, assinatura no selo da família), mas a comparação pesa e a estreia pode levar vaia.', 'Child of an artist or industry figure who follows a career. The surname opens doors (starting fame, contacts, signing with the family label), but the comparison weighs and the debut may get booed.'), see: ['mech:life', 'mech:careers'] },
  { id: 'abordagem-de-faccao', term: l('Abordagem de facção', 'Faction approach'), def: l('Quando uma facção ligada a uma cena chama um artista (seu ou do mundo) para tocar no baile, pagar pedágio ou gravar uma faixa sobre ela. O NPC decide sozinho; o desfecho passa pela polícia, imprensa, selo e cena.', 'When a faction tied to a scene asks an artist (yours or the world\'s) to play their party, pay a toll or record a track about them. NPCs decide on their own; the outcome runs through police, press, label and scene.'), see: ['mech:underworld', 'cat:faccoes-cenas'] },
  { id: 'departamento', term: l('Departamento (sede)', 'Department (HQ)'), def: l('Setor montado dentro da sede (A&R, marketing, jurídico…). Tem até 3 níveis, cada um com bônus e manutenção mensal; o número de vagas cresce com a sede.', 'A unit built inside the HQ (A&R, marketing, legal…). Up to 3 levels, each with a bonus and monthly upkeep; slots grow with the HQ.'), see: ['mech:hq'] },
  { id: 'bolinhas', term: l('Bolinhas (tempo livre)', 'Slots (free time)'), def: l('Unidades de tempo pessoal do mês. Pagam vida pessoal, rotinas e ações sobre pessoas; carreiras que passam do expediente consomem algumas.', 'Units of personal time per month. They pay for personal life, routines and actions on people; careers that run long consume some.'), see: ['mech:life', 'mech:careers'] },
  { id: 'desgaste', term: l('Desgaste (estresse longo)', 'Wear (long-term stress)'), def: l('A camada lenta do estresse. Sobe com meses de estresse alto e cai devagar. Só há quebra quando o estresse curto passa de 65 e o desgaste passa de 45.', 'The slow layer of stress. It rises with months of high stress and falls slowly. A breakdown only happens when short stress passes 65 and wear passes 45.'), see: ['mech:life'] },
  { id: 'efeito-streisand', term: l('Efeito Streisand', 'Streisand effect'), def: l('Quando a polêmica vende: em gêneros rebeldes (rock, hip-hop, eletrônica) parte do escândalo vira notoriedade e as vendas sobem um pouco; processar boato verdadeiro também o espalha.', 'When controversy sells: in rebel genres (rock, hip-hop, electronic) part of a scandal becomes notoriety and sales rise a little; suing over a true rumor also spreads it.'), see: ['mech:press'] },
  { id: 'voto-comprado', term: l('Voto comprado', 'Rigged vote'), def: l('Manipular a votação de um prêmio (jurado, lobby, urnas ou robôs). Se o ato ganhar e vazar, o prêmio é cassado e vira escândalo.', 'Rigging an award vote (juror, lobbying, ballots or bots). If the act wins and it leaks, the award is revoked and becomes a scandal.'), see: ['mech:underworld', 'mech:awards', 'cat:voto-comprado'] },
  { id: 'crime-digital', term: l('Crime digital', 'Cybercrime'), def: l('Organizações inventadas (1995+) que agem online: fazendas de streams, vazamentos, cambismo por robôs, vozes clonadas por IA, darknet.', 'Invented organizations (1995+) acting online: stream farms, leaks, ticket bots, AI voice clones, darknet.'), see: ['mech:underworld', 'cat:servicos-submundo'] },
  { id: 'afinidade-de-cena', term: l('Afinidade de cena', 'Scene affinity'), def: l('Ligação cultural entre uma facção e um gênero ou cena, com época e território. Nunca liga uma pessoa à facção.', 'A cultural link between a faction and a genre or scene, with period and territory. It never ties a person to the faction.'), see: ['mech:underworld', 'cat:faccoes-cenas'] },
  { id: 'calor', term: l('Calor', 'Heat'), def: l('Atenção da polícia sobre você num país (0–100). Aumenta a exposição dos crimes, cai 3 por mês e, com 60+, abre investigação.', 'Police attention on you in a country (0–100). It raises crime exposure, falls 3 a month and, at 60+, opens an investigation.'), see: ['mech:underworld'] },
  { id: 'lavagem', term: l('Lavagem de dinheiro', 'Money laundering'), def: l('Passar dinheiro de uma organização pelo selo em troca de taxa mensal. Rende, mas gera calor todo mês e dá a eles um segredo contra você.', 'Running an organization\'s money through the label for a monthly fee. It pays, but adds heat every month and gives them a secret on you.'), see: ['mech:underworld'] },
  { id: 'jaba', term: l('Jabá', 'Payola'), def: l('Pagar DJs, programadores ou curadores para tocar seus discos. Cada época tem regras, preço e risco diferentes.', 'Paying DJs, programmers or curators to play your records. Each era has different rules, price and risk.'), see: ['mech:underworld', 'mech:music'] },
  { id: 'onda-de-cancelamento', term: l('Onda de cancelamento', 'Cancel wave'), def: l('Reação nas redes (2010+) a um escândalo de quem tem alcance: sobe até um pico e esfria conforme a sua resposta. No pico o ato perde marcas e patrocínios.', 'A social media backlash (2010+) to a scandal by someone with reach: it rises to a peak and cools depending on your response. At the peak the act loses brands and sponsors.'), see: ['mech:underworld', 'mech:press'] },
];

export const FAQ_C: Faq29[] = [
  { id: 'faq-estrela-mirim', q: l('Posso contratar uma estrela mirim?', 'Can I sign a child star?'), a: l('Pode. O responsável negocia duro e exige escola, fundo e limite de turnê; o menor ocupa mais agenda e custa um tutor na estrada. Passe 3 meses seguidos do limite e vem a denúncia (reputação, multa, escândalo). Aos 18 o fundo vai para o artista.', 'Yes. The guardian bargains hard and demands school, a trust fund and touring limits; the minor takes up more schedule and needs a road tutor. Exceed the limit for 3 straight months and a complaint follows (reputation, fine, scandal). At 18 the trust goes to the artist.'), see: ['mech:life', 'glossario:estrela-mirim'] },
  { id: 'faq-familia-real', q: l('Por que um artista real ganhou um filho que não existiu?', 'Why did a real artist get a child who never existed?'), a: l('Nos mundos alternativos (o padrão), depois do início da partida, casamentos e filhos simulados valem como história alternativa e aparecem marcados "simulado". No modo exato só existe a família documentada.', 'In alternative worlds (the default), after the run starts, simulated marriages and children count as alternative history and are marked "simulated". In exact mode only the documented family exists.'), see: ['mech:life', 'mech:modes'] },
  { id: 'faq-faccao-npc', q: l('Uma facção abordou um artista de outro selo. Isso me afeta?', 'A faction approached another label\'s artist. Does that affect me?'), a: l('Pode ser uma oportunidade: se o ato topou, dá para denunciar a ligação; se ficou sob pressão ou foi dispensado, ele aceita melhor a sua proposta e o buyout sai mais barato. Selos com artistas ligados a facções também perdem peso nas ofertas.', 'It can be an opportunity: if the act accepted, you can report the tie; if it ended up under pressure or dropped, it takes your offer more readily and the buyout is cheaper. Labels with acts tied to factions also weigh less in offers.'), see: ['mech:underworld', 'glossario:abordagem-de-faccao'] },
  { id: 'nao-consigo-contratar', q: l('Por que não consigo contratar mais ninguém para a equipe?', 'Why can\'t I hire more staff?'), a: l('Cada nível de sede tem um número fixo de vagas de equipe (filiais e salas somam mais). Além disso, contratar exige caixa livre para as luvas: metade do salário mensal na hora.', 'Each HQ level has a fixed number of staff slots (branches and rooms add more). Hiring also needs free cash for the sign-on: half the monthly salary up front.'), see: ['mech:hq'] },
  { id: 'dono-morreu', q: l('O que acontece se o meu personagem morrer?', 'What happens if my character dies?'), a: l('A partida continua com um herdeiro: filho adulto, cônjuge, parente, funcionário de confiança ou artista próximo. Família herda o patrimônio (menos o imposto da época); quem é de fora assume só o selo. Sem herdeiro, a partida termina.', 'The run continues with an heir: adult child, spouse, relative, trusted staff or a close artist. Family inherits the wealth (minus the era\'s tax); outsiders take only the label. With no heir, the run ends.'), see: ['mech:life'] },
  { id: 'escandalo-disco', q: l('Um escândalo atrapalha o próximo lançamento?', 'Does a scandal hurt the next release?'), a: l('Sim. Um disco lançado até 26 semanas depois de um escândalo com efeito 40 ou mais estreia com até 15% menos apelo — exceto em gêneros rebeldes, onde a polêmica recente pode até vender mais.', 'Yes. A record released up to 26 weeks after a scandal with effect 40 or more launches with up to 15% less appeal — except in rebel genres, where recent controversy can even sell more.'), see: ['mech:press'] },
  { id: 'calor-alto', q: l('Como baixar o calor da polícia?', 'How do I lower police heat?'), a: l('Espere (cai 3 por mês sem caso aberto), suborne a polícia (corta 35, funciona melhor onde há corrupção), denuncie uma organização (−15) ou encubra uma operação sumindo do mapa. Evite agir de novo no mesmo país.', 'Wait (falls 3 a month with no open case), bribe the police (cuts 35, works better where corruption runs deep), report an organization (−15) or lie low after an operation. Avoid acting again in the same country.'), see: ['mech:underworld'] },
];
