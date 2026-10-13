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
    ],
    inputs: [
      l('Traços, idade, fama e patrimônio do dono.', 'The owner\'s traits, age, fame and wealth.'),
      l('Agenda das carreiras (reserva bolinhas) e perks de energia.', 'Career schedule (reserves slots) and energy perks.'),
      l('Turnês, crises, escândalos e vícios, que somam estresse.', 'Tours, crises, scandals and vices, which add stress.'),
      l('Época e país: imposto de herança, drogas da época, costumes.', 'Era and country: inheritance tax, drugs of the time, customs.'),
      l('Equipe médica contratada (médico, fonoaudiólogo, psicólogo).', 'Hired medical staff (doctor, voice therapist, therapist).'),
      l('Departamento de bem-estar e salas como o jardim (menos estresse). Ver [[mech:hq]].', 'Wellbeing department and rooms like the garden (less stress). See [[mech:hq]].'),
    ],
    outputs: [
      l('Saúde e estresse: quebra leva a colapso, vício, doença ou escândalo.', 'Health and stress: a breakdown leads to collapse, addiction, illness or scandal.'),
      l('Herdeiros e continuidade da partida.', 'Heirs and the continuation of the run.'),
      l('Opinião das pessoas sobre você (presentes, favores, ações).', 'People\'s opinion of you (gifts, favors, actions).'),
      l('Fama pessoal e reputação institucional (casamento de gala, escândalos).', 'Personal fame and institutional reputation (gala wedding, scandals).'),
      l('Shows e gravações: problemas de voz ou lesão sem tratamento derrubam bilheteria e qualidade.', 'Shows and recordings: untreated voice or injury problems cut box office and quality.'),
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
    ],
    tips: [
      l('Ligue a rotina de terapia em "quando precisar": ela entra sozinha quando o estresse passa de 55.', 'Set therapy to "when needed": it kicks in by itself when stress goes above 55.'),
      l('Ter um filho adulto ou cônjuge garante herdeiro de família, que recebe o patrimônio; quem é de fora assume só o selo.', 'An adult child or spouse guarantees a family heir, who gets the wealth; outsiders take only the label.'),
      l('Um mês de folga zera pouco o curto prazo; o que salva é baixar o desgaste longo antes que ele passe de 45.', 'A month off barely dents short stress; what saves you is lowering long-term wear before it passes 45.'),
      l('Seguro de pessoa-chave paga se a estrela morrer. Ver [[mech:underworld]].', 'Key-person insurance pays if the star dies. See [[mech:underworld]].'),
    ],
    pages: ['personal', 'you', 'night14', 'wealth', 'diary'],
    see: ['mech:hq', 'mech:story', 'mech:connections', 'mech:underworld'],
    nums: (s) => [
      [l('Bolinhas de tempo livre por mês', 'Free-time slots per month'), String(ENERGY_PER_MONTH)],
      [l('Quebra: estresse curto / longo acima de', 'Breakdown: short / long stress above'), `${BREAK_SHORT} / ${BREAK_LONG}`],
      [l('Casamento de gala', 'Gala wedding'), usd(s, WEDDINGS.gala.cost)],
      [l('Uma dose de drogas', 'A dose of drugs'), usd(s, VICE_INFO.drugs.cost)],
      [l('Clínica de reabilitação (equipe médica)', 'Rehab clinic (medical staff)'), usd(s, TREATMENT.rehab.cost)],
      [l('Presente para alguém', 'Gift for someone'), usd(s, GIFT_COST)],
    ],
    docs: ['docs/rodada17.md'],
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
      l('Um jurídico e um gestor de direitos na equipe pagam a si mesmos na primeira auditoria. Ver [[mech:hq]].', 'A lawyer and a rights manager on staff pay for themselves at the first audit. See [[mech:hq]].'),
    ],
    pages: ['crime', 'fakes19', 'rights18', 'contracts19'],
    see: ['mech:press', 'mech:contracts', 'mech:reputation', 'mech:hq'],
    nums: (s) => [
      [l('Tipos de crime', 'Crime types'), String(CRIMES17.length)],
      [l('Segurança mais forte (custo mensal / defesa)', 'Strongest security (monthly / defense)'), safe(() => { const t = SEC17[SEC17.length - 1]; return `${usd(s, t.cost)} / −${pct(t.def)}`; })],
      [l('Jabá: pacote nacional', 'Payola: nationwide package'), safe(() => usd(s, PAYOLA_TIERS[PAYOLA_TIERS.length - 1].real))],
      [l('Cancelamento existe a partir de', 'Cancel waves exist from'), String(CANCEL_FROM19)],
      [l('Cancelamento: fator do silêncio', 'Cancellation: silence factor'), `×${RESP19.silent.k}`],
      [l('Seguro de pessoa-chave a partir de', 'Key-person insurance from'), String(KEYMAN_FROM19)],
      [l('Meses no vermelho até a insolvência', 'Months in the red until insolvency'), String(INSOLVENT_AT)],
    ],
    docs: ['docs/crimealvos29.md', 'docs/rodada17.md', 'docs/rodada19.md'],
  },
];

export const TERMS_C: Term29[] = [
  { id: 'departamento', term: l('Departamento (sede)', 'Department (HQ)'), def: l('Setor montado dentro da sede (A&R, marketing, jurídico…). Tem até 3 níveis, cada um com bônus e manutenção mensal; o número de vagas cresce com a sede.', 'A unit built inside the HQ (A&R, marketing, legal…). Up to 3 levels, each with a bonus and monthly upkeep; slots grow with the HQ.'), see: ['mech:hq'] },
  { id: 'bolinhas', term: l('Bolinhas (tempo livre)', 'Slots (free time)'), def: l('Unidades de tempo pessoal do mês. Pagam vida pessoal, rotinas e ações sobre pessoas; carreiras que passam do expediente consomem algumas.', 'Units of personal time per month. They pay for personal life, routines and actions on people; careers that run long consume some.'), see: ['mech:life', 'mech:careers'] },
  { id: 'desgaste', term: l('Desgaste (estresse longo)', 'Wear (long-term stress)'), def: l('A camada lenta do estresse. Sobe com meses de estresse alto e cai devagar. Só há quebra quando o estresse curto passa de 65 e o desgaste passa de 45.', 'The slow layer of stress. It rises with months of high stress and falls slowly. A breakdown only happens when short stress passes 65 and wear passes 45.'), see: ['mech:life'] },
  { id: 'efeito-streisand', term: l('Efeito Streisand', 'Streisand effect'), def: l('Quando a polêmica vende: em gêneros rebeldes (rock, hip-hop, eletrônica) parte do escândalo vira notoriedade e as vendas sobem um pouco; processar boato verdadeiro também o espalha.', 'When controversy sells: in rebel genres (rock, hip-hop, electronic) part of a scandal becomes notoriety and sales rise a little; suing over a true rumor also spreads it.'), see: ['mech:press'] },
  { id: 'calor', term: l('Calor', 'Heat'), def: l('Atenção da polícia sobre você num país (0–100). Aumenta a exposição dos crimes, cai 3 por mês e, com 60+, abre investigação.', 'Police attention on you in a country (0–100). It raises crime exposure, falls 3 a month and, at 60+, opens an investigation.'), see: ['mech:underworld'] },
  { id: 'lavagem', term: l('Lavagem de dinheiro', 'Money laundering'), def: l('Passar dinheiro de uma organização pelo selo em troca de taxa mensal. Rende, mas gera calor todo mês e dá a eles um segredo contra você.', 'Running an organization\'s money through the label for a monthly fee. It pays, but adds heat every month and gives them a secret on you.'), see: ['mech:underworld'] },
  { id: 'jaba', term: l('Jabá', 'Payola'), def: l('Pagar DJs, programadores ou curadores para tocar seus discos. Cada época tem regras, preço e risco diferentes.', 'Paying DJs, programmers or curators to play your records. Each era has different rules, price and risk.'), see: ['mech:underworld', 'mech:music'] },
  { id: 'onda-de-cancelamento', term: l('Onda de cancelamento', 'Cancel wave'), def: l('Reação nas redes (2010+) a um escândalo de quem tem alcance: sobe até um pico e esfria conforme a sua resposta. No pico o ato perde marcas e patrocínios.', 'A social media backlash (2010+) to a scandal by someone with reach: it rises to a peak and cools depending on your response. At the peak the act loses brands and sponsors.'), see: ['mech:underworld', 'mech:press'] },
];

export const FAQ_C: Faq29[] = [
  { id: 'nao-consigo-contratar', q: l('Por que não consigo contratar mais ninguém para a equipe?', 'Why can\'t I hire more staff?'), a: l('Cada nível de sede tem um número fixo de vagas de equipe (filiais e salas somam mais). Além disso, contratar exige caixa livre para as luvas: metade do salário mensal na hora.', 'Each HQ level has a fixed number of staff slots (branches and rooms add more). Hiring also needs free cash for the sign-on: half the monthly salary up front.'), see: ['mech:hq'] },
  { id: 'dono-morreu', q: l('O que acontece se o meu personagem morrer?', 'What happens if my character dies?'), a: l('A partida continua com um herdeiro: filho adulto, cônjuge, parente, funcionário de confiança ou artista próximo. Família herda o patrimônio (menos o imposto da época); quem é de fora assume só o selo. Sem herdeiro, a partida termina.', 'The run continues with an heir: adult child, spouse, relative, trusted staff or a close artist. Family inherits the wealth (minus the era\'s tax); outsiders take only the label. With no heir, the run ends.'), see: ['mech:life'] },
  { id: 'escandalo-disco', q: l('Um escândalo atrapalha o próximo lançamento?', 'Does a scandal hurt the next release?'), a: l('Sim. Um disco lançado até 26 semanas depois de um escândalo com efeito 40 ou mais estreia com até 15% menos apelo — exceto em gêneros rebeldes, onde a polêmica recente pode até vender mais.', 'Yes. A record released up to 26 weeks after a scandal with effect 40 or more launches with up to 15% less appeal — except in rebel genres, where recent controversy can even sell more.'), see: ['mech:press'] },
  { id: 'calor-alto', q: l('Como baixar o calor da polícia?', 'How do I lower police heat?'), a: l('Espere (cai 3 por mês sem caso aberto), suborne a polícia (corta 35, funciona melhor onde há corrupção), denuncie uma organização (−15) ou encubra uma operação sumindo do mapa. Evite agir de novo no mesmo país.', 'Wait (falls 3 a month with no open case), bribe the police (cuts 35, works better where corruption runs deep), report an organization (−15) or lie low after an operation. Avoid acting again in the same country.'), see: ['mech:underworld'] },
];
