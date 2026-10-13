// Rodada 29 (WIKI) — artigos de mecânica: dinheiro, contratos, descoberta de talentos e escada de início.
// Conteúdo derivado do código (src/sim/economy.ts, oblig20, finance, ledger18, sys/econ18, sys/overhead13, sys/money19,
// contracts.ts, sys/nego27, sys/promises28, sys/rivalsense28, sys/rivals27, sys/deal360_17, sys/dispute15, sys/explain12,
// scouting.ts, scout20, sys/scout23, sys/knownacts27, start17/start28data/start29data, sys/start29, worldgen) e dos
// docs (econ18, rodada20, f5-r28, act27, fixes29, connect29). Nada aqui revela valor escondido (talento real,
// mínimo da negociação, reserva dos rivais): só diz que existem.
import { l } from '../../data/world';
import type { L } from '../../data/world';
import type { GameState } from '../../sim/types';
import type { Faq29, MechArt29, Term29 } from './wiki29types';
import { INSOLVENT_AT, loanOffer, monthlyCosts } from '../../sim/economy';
import { freeCash20, otherReserves20, reservedAdvances20 } from '../../sim/oblig20';
import { DIGITAL_LAG18 } from '../../sim/sys/econ18';
import { capRate } from '../../sim/sys/overhead13';
import { OWED_RATE28, TOUR_GIG_WEEKS28 } from '../../sim/sys/promises28';
import { cap360 } from '../../sim/sys/deal360_17';
import { TEMPER27 } from '../../sim/sys/rivals27';
import { DEGREES, scoutActionsPerMonth, scoutCost } from '../../sim/scouting';
import { COL_ORDER23, MISSION_WEEKS } from '../../sim/sys/scout23';
import { KNOW27, limits27 } from '../../sim/sys/knownacts27';
import { SITS29 } from '../../sim/start29data';
import { REC_YEARS28, STARTS28 } from '../../sim/start28data';
import { DIFF17, RANKS17 } from '../../sim/start17';
import { EQUAL_REP, EQUAL_START_REAL, LABELS_MAX22 } from '../../sim/worldgen';
import { RIVS29, riv29ById, rivOf29 } from '../../sim/rivals29data';
import { eraBig29 } from '../../sim/sys/rivals29start';
import { FREQS29, NS29, eraCap29, eraWave29 } from '../../sim/labels29data';

// centavos nominais → texto; dólares reais (2020) → texto
const usd = (c: number): string => 'US$ ' + Math.round(c / 100).toLocaleString('pt-BR');
const usdR = (d: number): string => 'US$ ' + Math.round(d).toLocaleString('pt-BR');
const pct = (x: number): string => Math.round(x * 100) + '%';
const row = (pt: string, en: string, v: string): [L, string] => [l(pt, en), v];

export const MECH_A: MechArt29[] = [
  // ------------------------------------------------------------------ DINHEIRO
  {
    id: 'money',
    title: l('Dinheiro e livro-caixa', 'Money and the ledger'),
    icon: 'money',
    summary: l('Caixa, caixa livre, despesas mensais, crédito e insolvência: como o dinheiro entra, sai e quando o selo quebra.',
      'Cash, free cash, monthly costs, credit and insolvency: how money comes in, goes out and when the label goes bust.'),
    what: [
      l('Todo valor do jogo é guardado em dólares de 2020 e convertido para o preço da época quando aparece na tela. Por isso um estúdio custa bem menos em 1960 do que em 2010: o índice de preços sobe com as décadas.',
        'Every amount is stored in 2020 dollars and converted to the price of the era when it shows on screen. That is why a studio costs far less in 1960 than in 2010: the price index rises with the decades.'),
      l('Cada movimento vira uma linha no livro-caixa, separada em receita operacional, custos, investimento e financiamento. Empréstimo, aporte e venda de ativo mexem no caixa, mas não contam como lucro.',
        'Every movement becomes a ledger line, split into operating revenue, costs, investing and financing. Loans, capital injections and asset sales change your cash but do not count as profit.'),
      l('Vender não é receber: a receita é reconhecida na hora, mas o dinheiro chega no prazo do distribuidor ou da plataforma. Os royalties dos artistas também saem depois, na prestação de contas do contrato.',
        'Selling is not getting paid: revenue is recognized right away, but the cash arrives on the distributor\'s or platform\'s schedule. Artist royalties also leave later, at the contract\'s statement date.'),
      l('O número que manda nas decisões é o caixa livre: o caixa menos o que já está prometido. Fique no vermelho tempo demais e o selo fecha as portas.',
        'The number that rules your decisions is free cash: cash minus what is already promised. Stay in the red too long and the label shuts down.'),
    ],
    inputs: [
      l('Vendas e streams dos seus lançamentos (menos taxa do distribuidor e royalties).', 'Sales and streams of your releases (minus distributor fee and royalties).'),
      l('Shows, edição, sync, licenças e a fatia 360 de turnês e merch.', 'Live shows, publishing, sync, licences and the 360 cut of tours and merch.'),
      l('Aluguel da sede, salários, manutenção de equipamento e terceirização de carreiras acima da capacidade.', 'HQ rent, salaries, equipment upkeep and outsourcing for careers above capacity.'),
      l('Despesas gerais que crescem com o porte (elenco, lançamentos, países, equipe, faturamento) e a época.', 'Overhead that grows with size (roster, releases, countries, staff, revenue) and with the era.'),
      l('Adiantamentos de [[mech:contracts|contratos]], verbas de promessas e multas.', 'Advances on [[mech:contracts|contracts]], promise budgets and penalties.'),
      l('Empréstimos, credores, títulos de catálogo e sócios ou investidores.', 'Loans, creditors, catalog bonds and partners or investors.'),
    ],
    outputs: [
      l('O que você pode gastar: quase todo gasto checa o caixa LIVRE, não o bruto.', 'What you can spend: almost every expense checks FREE cash, not gross cash.'),
      l('Ampliar a [[mech:hq|sede]], contratar equipe e abrir mercados.', 'Upgrading your [[mech:hq|HQ]], hiring staff and opening markets.'),
      l('Quanto você pode oferecer de adiantamento a um artista.', 'How big an advance you can offer an act.'),
      l('Crédito do banco: juros e tamanho do próximo empréstimo.', 'Bank credit: the rate and size of your next loan.'),
      l('Insolvência e fim de jogo.', 'Insolvency and game over.'),
      l('Lucro e receita por ano, usados por metas, conselho e pontuação.', 'Yearly profit and revenue, used by goals, the board and scoring.'),
    ],
    rules: [
      l('Caixa livre = caixa − adiantamentos de ofertas pendentes − verbas de promessas abertas. Reserva não é dívida: some sozinha quando a oferta é recusada, expira ou é assinada.',
        'Free cash = cash − advances on pending offers − budgets of open promises. A reserve is not debt: it disappears on its own when the offer is refused, lapses or is signed.'),
      l('Prazos de recebimento: distribuidor físico paga em 4 meses antes de 1970 e 3 depois; plataformas digitais, cerca de 2 meses depois. Brasil, América Latina e África (e países em crise cambial) atrasam mais.',
        'Payment terms: physical distributors pay in 4 months before 1970 and 3 after; digital platforms about 2 months later. Brazil, Latin America and Africa (and countries in a currency crisis) pay later.'),
      l('Antecipar recebíveis custa 3% + 1,5% por mês até o vencimento (+2 pontos em país em crise), entre 2% e 15%.',
        'Factoring receivables costs 3% + 1.5% per month until due (+2 points in a crisis country), between 2% and 15%.'),
      l('Despesas gerais por faixa de receita anual (dólares de 2020): indie abaixo de 600 mil, selo pequeno até 3 milhões, médio até 15 milhões, major acima. Quem fatura menos de 120 mil quase não paga; há um teto como fatia da receita.',
        'Overhead by yearly revenue band (2020 dollars): indie below 600k, small label up to 3M, mid-size up to 15M, major above. Under 120k you pay almost nothing; there is a cap as a share of revenue.'),
      l('Empréstimo do banco: 36 meses, até 3 abertos. Valor = 20 mil + 600 × (reputação comercial + institucional) + 30 mil por nível de sede, e cada empréstimo aberto encolhe o próximo para 65%. Juros de 16% menos reputação/1.500, +4 pontos em recessão e +4 por empréstimo aberto (entre 4% e 30%).',
        'Bank loan: 36 months, up to 3 open. Amount = 20k + 600 × (commercial + institutional reputation) + 30k per HQ level, and each open loan shrinks the next to 65%. Rate 16% minus reputation/1,500, +4 points in a recession and +4 per open loan (between 4% and 30%).'),
      l('O banco não empresta a quem está no vermelho há 2 meses ou mais. Se a dívida passar da receita de 12 meses (ou houver 3 trimestres seguidos de prejuízo), ele chama a dívida: pagar, empenhar masters, vender masters ou aceitar a aceleração.',
        'The bank will not lend to anyone in the red for 2+ months. If debt exceeds 12 months of revenue (or you post 3 straight losing quarters), it calls the debt: pay, pledge masters, sell masters or accept acceleration.'),
      l('Insolvência: 4 meses seguidos de caixa negativo (INSOLVENT_AT) encerram a partida. Dívida funda (abaixo de 2 meses de custo fixo, mínimo US$ 15 mil de 2020) faz o mês contar em dobro. No 2º mês surge proposta de venda de emergência; no 3º, venda forçada do equipamento a 40% e corte da equipe.',
        'Insolvency: 4 straight months of negative cash (INSOLVENT_AT) end the game. Deep debt (below 2 months of fixed costs, at least US$15k in 2020 money) makes a month count double. In month 2 an emergency sale offer appears; in month 3, a forced sale of equipment at 40% and a staff cut.'),
      l('Caixa negativo cria credores: o banco perde paciência todo mês e, abaixo de −US$ 30 mil, o fornecedor também. Credor sem paciência retoma o seu ativo mais valioso por 60% do valor contábil.',
        'Negative cash creates creditors: the bank loses patience every month and, below −US$30k, so does the supplier. A creditor out of patience seizes your most valuable asset for 60% of book value.'),
    ],
    tips: [
      l('Olhe o caixa livre antes de abrir várias ofertas: cada adiantamento prometido trava dinheiro até a resposta.', 'Check free cash before opening several offers: every promised advance locks money until the answer.'),
      l('Peça crédito ANTES de apertar. Depois de 2 meses no vermelho o banco fecha a porta.', 'Borrow BEFORE things get tight. After 2 months in the red the bank closes the door.'),
      l('Crescer custa: mais elenco, mais países e mais lançamentos sobem as despesas gerais. Contratar administradores alivia a burocracia.', 'Growth costs: more acts, countries and releases raise overhead. Hiring admins eases bureaucracy.'),
      l('Lucro no papel não paga conta: confira a previsão de caixa dos próximos meses na página de finanças.', 'Paper profit does not pay bills: check the cash forecast for the coming months on the finance page.'),
    ],
    pages: ['finance', 'business', 'wealth', 'supply18'],
    see: ['mech:contracts', 'mech:hq', 'mech:start', 'mech:careers', 'glossario:caixa-livre', 'glossario:insolvencia'],
    nums: (s: GameState | null) => {
      const out: [L, string][] = [row('Meses no vermelho até a insolvência', 'Months in the red until insolvency', String(INSOLVENT_AT))];
      out.push(row('Defasagem do pagamento digital (meses)', 'Digital payment lag (months)', String(DIGITAL_LAG18)));
      const y = s?.year ?? 2000;
      out.push(row(`Teto das despesas gerais, indie → major (${y})`, `Overhead cap, indie → major (${y})`, `${pct(capRate(0, y))} → ${pct(capRate(20e6, y))}`));
      if (!s) return out;
      const c = monthlyCosts(s);
      out.push(row('Caixa agora', 'Cash now', usd(s.player.cash)));
      out.push(row('Caixa livre', 'Free cash', usd(freeCash20(s))));
      out.push(row('Reservado (ofertas + promessas)', 'Reserved (offers + promises)', usd(reservedAdvances20(s) + otherReserves20(s))));
      out.push(row('Custo fixo do mês', 'Fixed cost this month', usd(c.rent + c.salaries + c.outsourcing + c.loans + c.equipment)));
      const lo = loanOffer(s);
      out.push(row('Próximo empréstimo', 'Next loan', lo ? `${usd(lo.amount)} · ${pct(lo.rate)}` : '—'));
      return out;
    },
    docs: ['docs/econ18.md', 'docs/rodada20.md', 'docs/precos20.md', 'docs/f5-r28.md', 'docs/connect29.md'],
  },

  // ------------------------------------------------------------------ CONTRATOS
  {
    id: 'contracts',
    title: l('Contratos, promessas, rivais e negociação', 'Contracts, promises, rivals and negotiation'),
    icon: 'contract',
    summary: l('Como fazer uma oferta, negociar na mesa, cumprir promessas, renovar e não perder artistas para selos rivais.',
      'How to make an offer, negotiate at the table, keep promises, renew and avoid losing acts to rival labels.'),
    what: [
      l('Um contrato define adiantamento, royalty, prazo, discos devidos, controle criativo e modelo (clássico, 360, licenciamento, distribuição ou edição). O adiantamento sai do seu caixa na assinatura e é recuperado dos royalties do artista (recoupment).',
        'A contract sets the advance, royalty, term, records owed, creative control and model (classic, 360, licensing, distribution or publishing). The advance leaves your cash at signing and is recovered from the act\'s royalties (recoupment).'),
      l('Na oferta rápida o artista avalia o pacote inteiro e responde com uma faixa (provável, incerto, improvável), nunca uma porcentagem exata. Na mesa de negociação você troca propostas em rodadas e tenta ler o outro lado.',
        'With a quick offer the act weighs the whole package and you see a band (likely, uncertain, unlikely), never an exact percentage. At the negotiation table you trade offers in rounds and try to read the other side.'),
      l('Cada artista tem um mínimo aceitável escondido. Você vê só uma faixa onde ele deve estar, mais estreita quanto mais conhece o artista e melhor é a sua equipe.',
        'Every act has a hidden minimum it will accept. You only see a range where it probably lies, narrower the better you know the act and the better your staff.'),
      l('Selos rivais disputam artistas visíveis. Eles não sabem o que você sabe: deduzem pela fama pública, paradas e boatos, e cada um tem um limite próprio que você não vê.',
        'Rival labels fight over visible acts. They do not know what you know: they infer from public fame, charts and rumors, and each has its own limit that you cannot see.'),
      l('Além da banda inteira, dá para abordar UM integrante: clique direito na pessoa (ou na ficha dela) → Carreira e contrato → "Oferecer a {nome}…". As opções são carreira solo no seu selo (assinada pela mesma oferta/mesa de sempre; a pessoa só sai da banda ao assinar), entrar ou substituir alguém numa banda sua, músico de sessão por 6 meses (com crédito), projeto paralelo/supergrupo, produtor ou A&R na equipe (habilidade ≥ 50), compor em segredo (ghostwriter) ou um feat da banda dela.',
        'Besides the whole band, you can approach ONE member: right-click the person (or their sheet) → Career and contract → "Offer {name}…". The options are a solo career on your label (signed through the usual offer/table; the person only leaves the band on signing), joining or replacing someone in one of your bands, session musician for 6 months (credited), side project/supergroup, producer or A&R on staff (skill ≥ 50), secret songwriting (ghostwriter) or a feature by their band.'),
    ],
    inputs: [
      l('Adiantamento comparado ao que o artista espera (cresce com o quadrado da fama).', 'Advance versus what the act expects (grows with the square of fame).'),
      l('Royalty, controle criativo, prazo, modelo e ficha de direitos.', 'Royalty, creative control, term, model and the rights sheet.'),
      l('A ambição principal do artista: dinheiro, segurança, arte, liberdade, fama…', 'The act\'s main ambition: money, security, art, freedom, fame…'),
      l('Alcance do selo: territórios, sede e reputação comercial.', 'Label reach: territories, HQ and commercial reputation.'),
      l('[[mech:reputation|Reputação]] com artistas e a confiança do ato em você.', '[[mech:reputation|Reputation]] with artists and the act\'s trust in you.'),
      l('Promessas (turnê, prioridade de lançamento, liberdade).', 'Promises (tour, release priority, freedom).'),
      l('Equipe: analista, jurídico, empresário e olheiro melhoram a leitura.', 'Staff: analyst, legal, manager and scout improve your read.'),
      l('O quanto você conhece o ato pelo [[mech:scouting|scouting]].', 'How well you know the act through [[mech:scouting|scouting]].'),
      l('Na oferta a um integrante: pressão para sair da banda, relação com os colegas e o líder, ressentimento, moral, sucesso da banda × fama própria, tamanho da fatia, lealdade e, no solo, o sonho de carreira solo, a ambição de fama e ser a voz/rosto da banda.',
        'In an offer to a member: pressure to leave the band, relationship with bandmates and the leader, resentment, morale, band success × own fame, size of the share, loyalty and, for solo, the solo-career dream, fame ambition and being the band\'s voice/face.'),
    ],
    outputs: [
      l('Quem entra no seu elenco e por quanto.', 'Who joins your roster and at what price.'),
      l('Caixa: adiantamento, bônus de renovação, verbas e multas.', 'Cash: advance, renewal bonus, budgets and penalties.'),
      l('Royalties devidos ao artista em cada venda (depois do recoupment).', 'Royalties owed to the act on every sale (after recoupment).'),
      l('Confiança do artista, reputação com artistas e mágoa dos rivais.', 'The act\'s trust, reputation with artists and rival grudges.'),
      l('Disputas: auditoria de royalties, greve de estúdio ou briga na imprensa.', 'Disputes: royalty audits, studio strikes or fights in the press.'),
      l('Quando um integrante sai para você: a banda que fica perde moral (−8), confiança em você (−10) e momento (−5) e pode acabar; quem recebe ganha manchete e momento; a pessoa passa a ex-integrante na página da banda.',
        'When a member leaves for you: the band left behind loses morale (−8), trust in you (−10) and momentum (−5) and may break up; the receiving act gets a headline and momentum; the person becomes a former member on the band\'s page.'),
    ],
    rules: [
      l('Oferta padrão: modelo clássico, royalty de 14% + fama/600, 36 meses, 3 discos e taxa de distribuição de 20%. O adiantamento esperado é 800 + 30 × fama² + 150 × fama (dólares de 2020).',
        'Default offer: classic model, royalty of 14% + fame/600, 36 months, 3 records and a 20% distribution fee. The expected advance is 800 + 30 × fame² + 150 × fame (2020 dollars).'),
      l('A faixa mostrada tem ruído: ±12% sem analista, ±5% com analista. Cada promessa soma a favor; artista com fama acima de 12 já sente interesse de rivais.',
        'The band shown is noisy: ±12% without an analyst, ±5% with one. Each promise helps; an act above fame 12 already feels rival interest.'),
      l('Recusa custa 3 de confiança. Se a chance era razoável, há 60% de contraproposta com adiantamento 25–60% maior. Na oferta ao vivo, quem está em dúvida pode pedir 1–2 semanas; pressionar custa 4 de confiança.',
        'A refusal costs 3 trust. If the odds were fair, there is a 60% chance of a counter with a 25–60% higher advance. On a live offer, an undecided act may ask for 1–2 weeks; pressing costs 4 trust.'),
      l('Mesa de negociação: até 4 rodadas (5 com empresário experiente) e uma paciência que cai quando a proposta fica longe do mínimo. Táticas: blefar, dar prazo, chamar um rival (+15 de paciência e +1 rodada, mas agora é preciso cobrir o lance) ou sair da mesa (perto do mínimo, às vezes eles ligam de volta). Voltar à mesa no mesmo mês sai mais caro.',
        'Negotiation table: up to 4 rounds (5 with a seasoned manager) and patience that drops when your offer is far from the minimum. Tactics: bluff, set a deadline, bring in a rival (+15 patience and +1 round, but now you must top the bid) or walk away (close to the minimum, they sometimes call back). Coming back to the table in the same month costs more.'),
      l('Promessas: turnê (26 semanas, verba de 35% do adiantamento esperado), prioridade (52 semanas, 30%) e liberdade (o contrato todo). A multa é 60% da verba (25% do adiantamento esperado na liberdade). Turnê vale com turnê do selo ou 6 semanas de shows. Quebrar: −18 de confiança e −3 de reputação com artistas; cumprir: +6.',
        'Promises: tour (26 weeks, budget of 35% of the expected advance), priority (52 weeks, 30%) and freedom (the whole contract). The penalty is 60% of the budget (25% of the expected advance for freedom). A tour counts with a label tour or 6 weeks of gigs. Breaking one: −18 trust and −3 reputation with artists; keeping it: +6.'),
      l('Renovação: chance = 25% + confiança/100 + 0,3 × (bônus ÷ adiantamento esperado) + ajustes, até 97%. Renovar soma discos devidos e zera o poder de barganha acumulado; falhar custa 4 de confiança.',
        'Renewal: chance = 25% + trust/100 + 0.3 × (bonus ÷ expected advance) + adjustments, up to 97%. Renewing adds records owed and resets accumulated bargaining power; failing costs 4 trust.'),
      l('360: o selo leva a fatia contratada de shows e merch até a fama 45; depois a fatia encolhe até 40% dela na fama 93+. Há um teto anual por ato que cresce com a época (maior a partir de 1990 e de 2005).',
        '360: the label takes its contracted cut of live and merch up to fame 45; beyond that the cut shrinks to 40% of it at fame 93+. There is a yearly cap per act that grows with the era (higher from 1990 and from 2005).'),
      l('Integrante de banda de selo rival: pague a rescisão (adiantamento esperado da banda ÷ integrantes × (0,6 + parte do contrato que falta) + US$ 1.500 da época; mágoa pequena) ou, só no solo, alicie sem pagar: chance menor, mágoa grande, +10 de rivalidade e risco de processo de 35% (+20% se o selo for vingativo), entre 10% e 80%. Se a rivalidade passar de 60, o selo não libera sessão nem projeto paralelo. Recusa dá 8 a 13 semanas de espera.',
        'Member of a rival label\'s band: pay the buyout (band\'s expected advance ÷ members × (0.6 + remaining share of the contract) + US$1,500 of the era; small grudge) or, for solo only, poach without paying: lower odds, big grudge, +10 rivalry and a 35% lawsuit risk (+20% if the label is vengeful), between 10% and 80%. Above rivalry 60, the label won\'t clear session work or side projects. A refusal means 8 to 13 weeks of waiting.'),
      l('Rivais têm temperamento (vingativo, frio, imitador, orgulhoso) e guardam mágoa quando você leva um artista deles. Perder uma disputa soma calor de rivalidade. Artista insatisfeito (confiança baixa) pode abrir disputa; tribunal custa 25% e, na derrota, você paga 160% da cobrança.',
        'Rivals have a temperament (vengeful, cold, copycat, proud) and hold grudges when you take one of their acts. Losing a bidding war adds rivalry heat. An unhappy act (low trust) may open a dispute; court costs 25% and, if you lose, you pay 160% of the claim.'),
    ],
    tips: [
      l('Conheça antes de propor: com mais graus de conhecimento a faixa do mínimo fica estreita e a ambição aparece.', 'Know them before you offer: more knowledge degrees narrow the range of the minimum and reveal the ambition.'),
      l('Dê ao artista o que a ambição dele pede: controle para quem quer arte, adiantamento para quem quer segurança.', 'Give the act what their ambition wants: control for art, advance for security.'),
      l('Só prometa o que vai cumprir: a verba sai do caixa livre e a promessa quebrada vira boato que os rivais usam.', 'Only promise what you will deliver: the budget leaves free cash and a broken promise becomes a rumor rivals use.'),
      l('Renove cedo quem fatura muito: rivais miram artistas de quem você depende.', 'Renew big earners early: rivals target the acts you depend on.'),
      l('Quer só a estrela da banda? A voz que sonha com carreira solo, briga com o líder e tem fama maior que a do grupo é a mais fácil de tirar — mas aliciar de um rival pode virar processo.', 'Only want the band\'s star? The singer who dreams of going solo, fights with the leader and is more famous than the group is the easiest to pull — but poaching from a rival can end in court.'),
    ],
    pages: ['contracts19', 'market', 'labels', 'artist18', 'rights18'],
    see: ['mech:money', 'mech:scouting', 'mech:reputation', 'mech:fame', 'glossario:adiantamento', 'glossario:mesa-de-negociacao'],
    nums: (s: GameState | null) => {
      const out: [L, string][] = [
        row('Semanas de shows que valem como turnê', 'Gig weeks that count as a tour', String(TOUR_GIG_WEEKS28)),
        row('Parte do caixa por semana para multa devida', 'Share of cash per week for owed penalties', pct(OWED_RATE28)),
        row('Temperamentos de rival', 'Rival temperaments', String(Object.keys(TEMPER27).length)),
      ];
      if (s) {
        out.push(row('Teto anual do 360 por ato', '360 yearly cap per act', usd(cap360(s))));
        out.push(row('Ofertas pendentes', 'Pending offers', String((s.offers ?? []).filter((o) => o.status === 'pending').length)));
        out.push(row('Adiantamentos reservados', 'Reserved advances', usd(reservedAdvances20(s))));
      }
      return out;
    },
    docs: ['docs/act27.md', 'docs/f5-r28.md', 'docs/rodada20.md', 'docs/connect29.md', 'docs/balance17.md', 'docs/integrante29.md'],
  },

  // ------------------------------------------------------------------ DESCOBRIR TALENTOS
  {
    id: 'scouting',
    title: l('Descobrir talentos', 'Scouting'),
    icon: 'eye',
    summary: l('Olheiros, sinais e graus de conhecimento: o que dá para saber de um artista antes de propor — e o que fica escondido.',
      'Scouts, signals and knowledge degrees: what you can learn about an act before offering — and what stays hidden.'),
    what: [
      l('Talento e potencial de um artista nunca aparecem como número exato para quem é de fora. Você vê estimativas em faixa, que encolhem conforme o conhecimento sobe. O relatório também pode vir torto, para cima ou para baixo.',
        'An act\'s talent and potential never show as exact numbers to outsiders. You see estimated ranges that shrink as your knowledge grows. A report can also be off, up or down.'),
      l('O conhecimento tem 5 graus: Rumor, Observação, Acompanhamento, Audição ou conversa e Convivência. Na página de talentos isso vira um funil: Rumor → Observado → Acompanhado → Audição → Pronto para propor.',
        'Knowledge has 5 degrees: Rumor, Observation, Follow-up, Audition or talk and Close contact. On the talent page this becomes a funnel: Rumor → Observed → Followed → Audition → Ready to offer.'),
      l('Nomes chegam sozinhos (boca a boca mensal: clubes, demos, rádio, TV, viralização, conforme a época) ou porque você foi buscar: viagem de olheiro a uma cena, missão da equipe num mercado, chamada de demos e noites de olheiro.',
        'Names arrive on their own (monthly word of mouth: clubs, demos, radio, TV, virality, depending on the era) or because you went looking: a scout trip to a scene, a staff mission to a market, a demo call and scouting nights.'),
    ],
    inputs: [
      l('Olheiros e A&R na equipe (habilidade, região e gênero de especialidade).', 'Scouts and A&R staff (skill, region and genre specialty).'),
      l('Ações de A&R por mês e o seu tempo livre (bolinhas) para audições.', 'A&R actions per month and your free time (energy) for auditions.'),
      l('Caixa livre: cada passo do funil e cada viagem custam dinheiro.', 'Free cash: every funnel step and every trip costs money.'),
      l('Época e tecnologia: as fontes de sinal mudam (TV de talentos, MySpace, TikTok…).', 'Era and technology: signal sources change (TV talent shows, MySpace, TikTok…).'),
      l('Seus mercados: artistas da sua região aparecem muito mais.', 'Your markets: acts from your region show up far more often.'),
      l('A [[mech:fame|fama]] do artista: quem é famoso é visível sem olheiro.', 'The act\'s [[mech:fame|fame]]: famous acts are visible without a scout.'),
    ],
    outputs: [
      l('Quem entra no seu radar e no funil.', 'Who enters your radar and the funnel.'),
      l('A precisão das estimativas de talento, habilidades e potencial.', 'How precise the talent, skill and potential estimates are.'),
      l('A leitura da mesa de [[mech:contracts|negociação]] (faixa do mínimo, ambição, traços).', 'Your read at the [[mech:contracts|negotiation]] table (range of the minimum, ambition, traits).'),
      l('A lista de artistas conhecidos e o motivo de você conhecer cada um.', 'The known-acts list and why you know each one.'),
      l('Disputas: canais públicos chamam a atenção dos rivais.', 'Bidding wars: public channels draw rivals\' attention.'),
    ],
    rules: [
      l('O que cada grau revela: talento e habilidades a partir do 2, potencial e ambição a partir do 3, traços a partir do 4 e vida privada no 5.',
        'What each degree reveals: talent and skills from 2, potential and ambition from 3, traits from 4 and private life at 5.'),
      l('Largura das faixas, do grau 1 ao 5: talento 40/26/15/8/3 pontos; potencial 40/30/20/11/5; fama 16/10/6/4/2. Um A&R habilidoso estreita a faixa.',
        'Range width, from degree 1 to 5: talent 40/26/15/8/3 points; potential 40/30/20/11/5; fame 16/10/6/4/2. A skilled A&R narrows the range.'),
      l('Fama é pública: com fama 30+ você vê o número exato; com 10+ já há uma faixa sem olheiro.', 'Fame is public: at fame 30+ you see the exact number; at 10+ there is a range without a scout.'),
      l('Próximo passo do funil: Observar mais (1 semana), Acompanhar (2 semanas) e Chamar para audição (1 semana e 1 bolinha). Custo pelo grau atual: US$ 80 / 200 / 450 / 900 / 1.500 (dólares de 2020). O relatório chega depois, não na hora.',
        'Next funnel step: Observe more (1 week), Follow up (2 weeks) and Call for an audition (1 week and 1 energy). Cost by current degree: US$80 / 200 / 450 / 900 / 1,500 (2020 dollars). The report arrives later, not instantly.'),
      l('Ações de A&R por mês = 3 + A&R na equipe + olheiros + 1 com sede nível 2 ou mais. O boca a boca traz 1 nome + 1 por A&R (até 3) por mês. Relatório com mais de um ano pode perder um grau.',
        'A&R actions per month = 3 + A&R staff + scouts + 1 with an HQ of level 2 or more. Word of mouth brings 1 name + 1 per A&R (up to 3) a month. A report older than a year may lose a degree.'),
      l('Viagem a uma cena: freelancer US$ 900 na sua região ou 2.200 fora; olheiro da casa paga só a viagem (200 ou 900). Missão da equipe: 4, 8 ou 12 semanas (+4 fora da região do olheiro); missões longas levam os relatórios mais fundo.',
        'Trip to a scene: a freelancer costs US$900 in your region or 2,200 elsewhere; an in-house scout only pays travel (200 or 900). Staff mission: 4, 8 or 12 weeks (+4 outside the scout\'s region); longer missions take reports deeper.'),
      l('Só é contratável quem não tem contrato e está ativo ou começando. Em hiato, assinar é propor a volta; aposentado, separado ou sem integrante vivo não assina. Um pedido de "estabelecido" nunca cria um nome do nada.',
        'Only unsigned, active or emerging acts can be signed. On hiatus, signing means proposing a comeback; retired, split or with no living member cannot sign. A request for an "established" act never conjures a name out of nowhere.'),
      l('Artistas conhecidos: entra quem tem laço com você (elenco, radar, contatos, paradas, imprensa, cena local). Superestrela a partir de fama 72; o limiar de "famoso" cai com a época, de 46 antes de 1970 para 35 depois de 2010.',
        'Known acts: anyone with a tie to you gets in (roster, radar, contacts, charts, press, local scene). Superstar from fame 72; the "famous" threshold drops with the era, from 46 before 1970 to 35 after 2010.'),
    ],
    tips: [
      l('Leve até a audição só quem tem chance: cada grau a mais custa mais caro.', 'Only take promising names to an audition: each extra degree costs more.'),
      l('Contrate um A&R cedo: mais nomes por mês e faixas mais estreitas.', 'Hire an A&R early: more names per month and narrower ranges.'),
      l('Talentos de canal público (concurso, TV, viral) atraem rivais. Decida rápido.', 'Talent from public channels (contests, TV, viral) attracts rivals. Decide fast.'),
      l('Compare até três candidatos lado a lado antes de propor.', 'Compare up to three candidates side by side before offering.'),
    ],
    pages: ['market', 'knownacts27', 'directory', 'talent18'],
    see: ['mech:contracts', 'mech:fame', 'mech:world', 'glossario:grau-de-conhecimento'],
    nums: (s: GameState | null) => {
      const lim = limits27(s?.year ?? 2000);
      const out: [L, string][] = [
        row('Graus de conhecimento', 'Knowledge degrees', String(DEGREES.length)),
        row('Colunas do funil', 'Funnel columns', String(COL_ORDER23.length)),
        row('Duração das missões (semanas)', 'Mission lengths (weeks)', MISSION_WEEKS.join(' / ')),
        row('Níveis de "quanto se sabe"', '"How much you know" levels', String(KNOW27.length)),
        row(`Fama para "famoso" (${s?.year ?? 2000})`, `Fame for "famous" (${s?.year ?? 2000})`, String(lim.famous)),
      ];
      if (s) {
        out.push(row('Ações de A&R por mês', 'A&R actions per month', String(scoutActionsPerMonth(s))));
        out.push(row('Passo do grau 1 / grau 4', 'Step from degree 1 / degree 4', `${usd(scoutCost(s, 1))} / ${usd(scoutCost(s, 4))}`));
      }
      return out;
    },
    docs: ['docs/rodada20.md', 'docs/act27.md', 'docs/plano28.md', 'docs/conexoes23.md'],
  },

  // ------------------------------------------------------------------ ESCADA DE INÍCIO
  {
    id: 'start',
    title: l('Escada de início e níveis de rival', 'Starting ladder and rival levels'),
    icon: 'signpost',
    summary: l('Do zero ao líder do mercado: a situação inicial da Nova run, o caixa de partida, a dificuldade e como as gravadoras rivais começam.',
      'From zero to market leader: the New run\'s starting situation, starting cash, difficulty and how rival labels start.'),
    what: [
      l('Na Nova run você escolhe a situação inicial numa escada de porte que vale igual para as 12 carreiras: do zero, emergente, médio, hipster, estabelecido, top 5, líder do mercado e em crise. O status combina carreira e situação ("Produtor top 5", "Selo emergente").',
        'In the New run you pick a starting situation on a size ladder that works the same for all 12 careers: zero, emerging, mid-size, hipster, established, top 5, market leader and in crisis. Your status combines career and situation ("Top-5 producer", "Emerging label").'),
      l('Cada degrau muda caixa, reputação, sede, equipe, mercados, elenco (ou a fama da sua banda), a atenção dos rivais e, no gigante caído, uma dívida de verdade. Começar grande dá mais ferramentas e mais custo fixo.',
        'Each rung changes cash, reputation, HQ, staff, markets, roster (or your band\'s fame), rival attention and, for the fallen giant, a real debt. Starting big gives you more tools and more fixed costs.'),
      l('Os rivais também têm nível: na Nova run (rápida e completa) o campo "Nível dos rivais" põe as gravadoras rivais numa escada parecida — do zero, emergentes, médios, hipsters / indie de prestígio, estabelecidos, gigantes (top 5), um líder dominante ou mistura realista (o padrão, o mundo de sempre). O status junta os dois: "Selo emergente · rivais gigantes".',
        'Rivals have a level too: in the New run (quick and full) the "Rival level" field puts the rival labels on a similar ladder — from zero, emerging, mid-size, hipsters / prestige indies, established, giants (top 5), one dominant leader or realistic mix (the default, the usual world). The status joins both: "Emerging label · giant rivals".'),
      l('O nível dos rivais mexe no caixa, na reputação artística e comercial, no porte, no elenco (cortado ou reforçado com nomes livres), na fama do elenco, nos mercados e na agressividade de cada selo rival. Os negócios rivais da sua carreira (estúdios, festivais, agências, editoras, mídia, plataformas) também nascem pelo nível. Ainda dá para ajustar quantas gravadoras existem e o eixo Rivais da dificuldade, e há um começo sorteado pela semente (herança, amigo na rádio…) que é pulado quando contradiz a situação.',
        'The rival level changes each rival label\'s cash, artistic and commercial reputation, size, roster (cut or reinforced with free names), roster fame, markets and aggressiveness. Your career\'s rival businesses (studios, festivals, agencies, publishers, media, platforms) are also created by level. You can still set how many labels exist and the Rivals difficulty axis, and there is a seed-rolled start (inheritance, a friend at the station…) that is skipped when it contradicts the situation.'),
    ],
    inputs: [
      l('A situação escolhida na escada.', 'The situation picked on the ladder.'),
      l('A [[mech:careers|carreira]] (negócio, artista ou híbrido): define o caixa base.', 'Your [[mech:careers|career]] (business, artist or hybrid): sets the base cash.'),
      l('Dificuldade geral (fácil, normal, difícil) e os 4 eixos detalhados.', 'Overall difficulty (easy, normal, hard) and the 4 detailed axes.'),
      l('Quantas gravadoras existem no início (padrão, poucas 3–5, algumas 6–10, muitas 11–20, mercado lotado 21–40, indústria gigante 41–120; na Nova run completa, número exato até 400), a fatia de selos reais, o porte (muitas indies / misto / poucas majors), a região e quantos concorrentes da sua carreira (nenhum até 12).', 'How many labels exist at start (default, few 3–5, some 6–10, many 11–20, crowded market 21–40, huge industry 41–120; in the full New run, an exact number up to 400), the share of real labels, the size mix (many indies / mixed / few majors), the region and how many competitors of your career (none up to 12).'),
      l('O nível dos rivais (do zero até um líder dominante; mistura realista é o padrão).', 'The rival level (from zero up to one dominant leader; realistic mix is the default).'),
      l('Como as gravadoras começam e quantas são.', 'How labels start and how many there are.'),
      l('Ajustes personalizados (caixa, sede, elenco, equipe, mercados) valem por cima de tudo.', 'Custom settings (cash, HQ, roster, staff, markets) override everything.'),
      l('O começo sorteado pela semente.', 'The seed-rolled start.'),
    ],
    outputs: [
      l('Caixa, reputação, sede, equipe e mercados do primeiro dia.', 'Cash, reputation, HQ, staff and markets on day one.'),
      l('Elenco inicial ou fama e fãs da sua banda.', 'Starting roster or your band\'s fame and fans.'),
      l('Mágoa inicial dos maiores rivais (top 5, líder, em crise).', 'Initial grudges of the biggest rivals (top 5, leader, in crisis).'),
      l('Dívida bancária herdada no gigante caído.', 'Inherited bank debt for the fallen giant.'),
      l('Agressividade dos rivais em leilões, aliciamento e propostas.', 'Rival aggression in auctions, poaching and bids.'),
    ],
    rules: [
      l('Caixa base de quem tem selo (dólares de 2020): 34 mil do zero, 100 mil emergente, 650 mil estabelecido; artista 60 mil e híbrido 55 mil. Fácil ×1,5, difícil ×0,7.',
        'Base cash for a label (2020 dollars): 34k from zero, 100k emerging, 650k established; artist 60k and hybrid 55k. Easy ×1.5, hard ×0.7.'),
      l('A escada multiplica o caixa do começo emergente da carreira: do zero ×0,34, médio ×2, hipster ×0,8, estabelecido ×6,5, top 5 ×14, líder ×28, em crise ×2,2.',
        'The ladder multiplies the career\'s emerging cash: zero ×0.34, mid-size ×2, hipster ×0.8, established ×6.5, top 5 ×14, leader ×28, in crisis ×2.2.'),
      l('Hipster troca alcance por prestígio: +22 de reputação artística, −8 de comercial e +10 de potencial no elenco. Top 5 deixa 3 rivais com mágoa 18; líder, 5 rivais com mágoa 30; em crise, 2 rivais com mágoa 10.',
        'Hipster trades reach for prestige: +22 artistic reputation, −8 commercial and +10 potential on the roster. Top 5 leaves 3 rivals with grudge 18; leader, 5 rivals with grudge 30; in crisis, 2 rivals with grudge 10.'),
      l('Em crise: dívida de 1,6 × o caixa inicial como empréstimo de 60 meses a 14% ao ano, cobrado todo mês. Veja [[mech:money|dinheiro]].',
        'In crisis: debt of 1.6 × starting cash as a 60-month loan at 14% a year, charged every month. See [[mech:money|money]].'),
      l('Como as gravadoras começam: pela história (padrão), aleatório, todos iguais, mundo virado, gigantes ou todas novatas. "Todos iguais" dá a todos, você incluso, US$ 600 mil de 2020, reputação 40 e nenhum artista — e pula a escada.',
        'How labels start: by history (default), random, all equal, upside down, giants or all newcomers. "All equal" gives everyone, you included, US$600k in 2020 money, reputation 40 and no acts — and skips the ladder.'),
      l('Nível dos rivais, exemplos do perfil: do zero = caixa ×0,06 e um artista por selo; hipsters = reputação artística 72–90 e comercial 12–28; gigantes = os 5 maiores com caixa ×3,2, comercial 80–94 e +15 nomes livres cada; líder dominante = o maior com caixa ×10 e +45 nomes, os demais pequenos. A agressividade vai de ×0,55 (do zero) a ×1,4 (líder).',
        'Rival level, profile examples: from zero = cash ×0.06 and one act per label; hipsters = artistic reputation 72–90 and commercial 12–28; giants = the 5 biggest with cash ×3.2, commercial 80–94 and +15 free names each; dominant leader = the biggest with cash ×10 and +45 names, the others small. Aggressiveness goes from ×0.55 (from zero) to ×1.4 (leader).'),
      l('Gravadoras no início: as reais que existiam na data entram primeiro; as que faltam são inventadas com nome da época ("Laurel Phonograph Co.", "Comet-Tone", "Discos X"). Antes de 1950 a era limita o total: 8 antes de 1900, 12 antes de 1920, 24 antes de 1946 e 40 em 1946–49; depois de 1950 não há teto. Durante a partida nascem selos novos pela frequência escolhida (nenhuma, rara ≈0,36/ano, normal ≈0,95, frequente ≈1,91, caótica), com ondas de época: ×1,9 em 1950–62, ×1,8 em 1977–85, ×1,5 nos anos 90, ×0,8 em 2000–04, ×1,9 desde 2005 e ×0,35 em anos de depressão e guerra, além de anos de seca e de explosão. Um interruptor decide se selos podem fechar e se fundir.',
        'Labels at start: the real ones that existed at that date come first; missing ones are invented with era names ("Laurel Phonograph Co.", "Comet-Tone", "Discos X"). Before 1950 the era caps the total: 8 before 1900, 12 before 1920, 24 before 1946 and 40 in 1946–49; from 1950 there is no cap. During the run new labels appear at the chosen frequency (none, rare ≈0.36/year, normal ≈0.95, frequent ≈1.91, chaotic), with era waves: ×1.9 in 1950–62, ×1.8 in 1977–85, ×1.5 in the 1990s, ×0.8 in 2000–04, ×1.9 from 2005 and ×0.35 in depression and war years, plus drought and burst years. A switch decides whether labels can close and merge.'),
      l('Eras: a era limita quantos gigantes cabem — 2 antes de 1920, 3 antes de 1950, 5 depois. Multiplicadores de crescimento valem pela metade antes de 1920 e ¾ antes de 1950, e "o mundo" de um gigante é o da época. Cenário histórico, "assumir gravadora" e um "Como começam" escolhido anulam o nível dos rivais.',
        'Eras: the era limits how many giants fit — 2 before 1920, 3 before 1950, 5 after. Growth multipliers count half before 1920 and ¾ before 1950, and a giant\'s "world" is the era\'s. A historical scenario, "take over a label" and a chosen "How labels start" override the rival level.'),
      l('Eixo Rivais da dificuldade (−2 a +2): positivo deixa os rivais mansos. Cada passo multiplica a agressividade por 1 − 0,2 × passo e soma 2 pontos às suas propostas. Dá para escolher de 0 a 100 gravadoras rivais.',
        'Rivals difficulty axis (−2 to +2): positive makes rivals tame. Each step multiplies aggression by 1 − 0.2 × step and adds 2 points to your offers. You can pick 0 to 100 rival labels.'),
      l('O Recomendado sugere 25 anos de partida; com prazo, a pontuação final dá uma patente, de "Selo de garagem" a "Lenda da indústria". "Assumir gravadora" e cenários históricos têm começo próprio. As predefinições de apresentação (Guiado, Livre, Contemplativo) não mexem em regras: veja [[mech:modes|modos]].',
        'Recommended suggests a 25-year run; with a deadline, the final score gives a rank, from "Garage label" to "Industry legend". "Take over a label" and historical scenarios have their own start. Presentation presets (Guided, Free, Contemplative) do not change rules: see [[mech:modes|modes]].'),
    ],
    tips: [
      l('Primeira partida? Emergente ou médio dão margem para errar sem a folha pesada de uma major.', 'First run? Emerging or mid-size leave room for mistakes without a major\'s heavy payroll.'),
      l('Top 5 e líder começam com rivais magoados: proteja seus artistas principais desde o começo.', 'Top 5 and leader start with grudging rivals: protect your key acts from day one.'),
      l('No gigante caído, a parcela do banco vem todo mês: corte custos e gere caixa antes de crescer.', 'As a fallen giant, the bank installment comes every month: cut costs and build cash before growing.'),
      l('Quer desafio sem mudar a sua situação? Escolha rivais "Gigantes" ou "Um líder dominante", ou o eixo Rivais negativo.', 'Want a challenge without changing your own situation? Pick "Giants" or "One dominant leader" rivals, or a negative Rivals axis.'),
      l('Rivais "Do zero" deixam os artistas famosos livres no mercado: bom para montar elenco cedo, mas o caixa decide quem você assina primeiro.', '"From zero" rivals leave famous acts free on the market: good for building a roster early, but cash decides whom you sign first.'),
    ],
    pages: ['goals', 'plan', 'cockpit'],
    see: ['mech:modes', 'mech:careers', 'mech:money', 'mech:contracts', 'glossario:situacao-inicial'],
    nums: (s: GameState | null) => {
      const sit = SITS29.find((x) => x.id === (s?.config as { start29?: string } | undefined)?.start29);
      const out: [L, string][] = [
        row('Situações na escada', 'Situations on the ladder', String(SITS29.length)),
        row('Caixa do líder do mercado (× emergente)', 'Market leader cash (× emerging)', '×' + String(SITS29.find((x) => x.id === 'leader')?.cash ?? '?')),
        row('"Todos iguais": caixa e reputação', '"All equal": cash and reputation', `${usdR(EQUAL_START_REAL)} · ${EQUAL_REP}`),
        row('Máximo de gravadoras rivais', 'Max rival labels', String(LABELS_MAX22)),
        row('Prazo sugerido (anos)', 'Suggested run length (years)', String(REC_YEARS28)),
        row('Começos sorteados · eixos de dificuldade · patentes', 'Rolled starts · difficulty axes · ranks', `${STARTS28.length} · ${DIFF17.length} · ${RANKS17.length}`),
      ];
      out.push(row('Quantidades de gravadoras no início', 'Label counts at start', NS29.map((x) => x.name.pt).join(' · ')));
      const cap = (y: number) => (Number.isFinite(eraCap29(y)) ? String(eraCap29(y)) : '∞');
      out.push(row('Teto de gravadoras pela era (1890 · 1910 · 1930 · 1948 · 1980)', 'Label cap by era (1890 · 1910 · 1930 · 1948 · 1980)', `${cap(1890)} · ${cap(1910)} · ${cap(1930)} · ${cap(1948)} · ${cap(1980)}`));
      out.push(row('Selos novos por ano (média por frequência)', 'New labels per year (mean by frequency)', FREQS29.map((f) => `${f.name.pt} ${f.mean}`).join(' · ')));
      out.push(row('Onda de selos novos (1955 · 1980 · 2002 · 2010)', 'New-label wave (1955 · 1980 · 2002 · 2010)', `×${eraWave29(1955)} · ×${eraWave29(1980)} · ×${eraWave29(2002)} · ×${eraWave29(2010)}`));
      out.push(row('Níveis de rival (padrão: mistura realista)', 'Rival levels (default: realistic mix)', String(RIVS29.length)));
      out.push(row('Gigantes que a era comporta (antes de 1920 · 1950 · depois)', 'Giants the era allows (before 1920 · 1950 · after)', `${eraBig29(1900, 5)} · ${eraBig29(1940, 5)} · ${eraBig29(1980, 5)}`));
      if (sit) out.push(row('Sua situação', 'Your situation', sit.name.pt));
      if (s) out.push(row('Nível dos rivais nesta partida', 'Rival level in this run', riv29ById(rivOf29(s.config))?.name.pt ?? '—'));
      return out;
    },
    docs: ['docs/fixes29.md', 'docs/f4-r28.md', 'docs/rodada17.md', 'docs/reorg29.md', 'docs/rivais29.md', 'docs/gravadoras29.md'],
  },
];

export const TERMS_A: Term29[] = [
  { id: 'nivel-dos-rivais', term: l('Nível dos rivais', 'Rival level'),
    def: l('Escolha da Nova run que põe as gravadoras rivais (e os negócios rivais da sua carreira) numa escada: do zero, emergentes, médios, hipsters, estabelecidos, gigantes, um líder dominante ou mistura realista (padrão).', 'New run choice that puts rival labels (and your career\'s rival businesses) on a ladder: from zero, emerging, mid-size, hipsters, established, giants, one dominant leader or realistic mix (default).'),
    see: ['mech:start'] },
  { id: 'oferta-a-integrante', term: l('Oferta a um integrante', 'Offer to a band member'),
    def: l('Abordar uma pessoa de qualquer banda em vez da banda inteira: carreira solo, entrar numa banda sua, sessão, projeto paralelo, equipe, ghostwriter ou feat. Com selo rival, há rescisão ou aliciamento.', 'Approaching one person from any band instead of the whole band: solo career, joining one of your bands, session work, side project, staff, ghostwriter or feature. With a rival label, there is a buyout or poaching.'),
    see: ['mech:contracts'] },
  { id: 'caixa-livre', term: l('Caixa livre', 'Free cash'),
    def: l('Caixa menos o que já está prometido: adiantamentos de ofertas pendentes e verbas de promessas abertas. É ele que os gastos checam.', 'Cash minus what is already promised: advances on pending offers and budgets of open promises. It is what spending checks against.'),
    see: ['mech:money'] },
  { id: 'insolvencia', term: l('Insolvência', 'Insolvency'),
    def: l('Fim da empresa depois de meses seguidos de caixa negativo. Dívida funda faz o mês contar em dobro.', 'The company\'s end after consecutive months of negative cash. Deep debt makes a month count double.'),
    see: ['mech:money'] },
  { id: 'despesas-gerais', term: l('Despesas gerais', 'Overhead'),
    def: l('Custos que crescem com o porte e a época: gestão do elenco, burocracia, jurídico, contabilidade e equipes de TV ou de playlists.', 'Costs that grow with size and era: roster management, bureaucracy, legal, accounting and TV or playlist teams.'),
    see: ['mech:money'] },
  { id: 'adiantamento', term: l('Adiantamento', 'Advance'),
    def: l('Dinheiro pago ao artista na assinatura (ou na renovação). O selo recupera esse valor dos royalties do artista antes de pagá-los.', 'Money paid to the act at signing (or renewal). The label recovers it from the act\'s royalties before paying them out.'),
    see: ['mech:contracts', 'glossario:recoupment'] },
  { id: 'recoupment', term: l('Recoupment', 'Recoupment'),
    def: l('Recuperação do adiantamento: a parte do artista em cada venda abate o saldo devedor até zerar; só então o royalty chega ao bolso dele.', 'Recovering the advance: the act\'s share of each sale pays down the balance until it hits zero; only then does the royalty reach their pocket.'),
    see: ['mech:contracts'] },
  { id: 'mesa-de-negociacao', term: l('Mesa de negociação', 'Negotiation table'),
    def: l('Proposta e contraproposta em rodadas, com paciência, táticas e um mínimo escondido do artista, do qual você só vê uma faixa.', 'Offer and counteroffer in rounds, with patience, tactics and the act\'s hidden minimum, of which you only see a range.'),
    see: ['mech:contracts'] },
  { id: 'grau-de-conhecimento', term: l('Grau de conhecimento', 'Knowledge degree'),
    def: l('De 1 (Rumor) a 5 (Convivência): o quanto você sabe de um artista. Cada grau estreita as estimativas e revela mais campos.', 'From 1 (Rumor) to 5 (Close contact): how much you know about an act. Each degree narrows the estimates and reveals more fields.'),
    see: ['mech:scouting'] },
  { id: 'situacao-inicial', term: l('Situação inicial', 'Starting situation'),
    def: l('O degrau da escada escolhido na Nova run (do zero até líder do mercado, ou em crise), que define o porte do seu começo.', 'The ladder rung picked in the New run (from zero up to market leader, or in crisis), which sets the size of your start.'),
    see: ['mech:start'] },
];

export const FAQ_A: Faq29[] = [
  { id: 'faq-caixa-livre', q: l('Tenho dinheiro em caixa, mas o jogo diz que não posso gastar. Por quê?', 'I have cash, but the game says I cannot spend it. Why?'),
    a: l('Parte do caixa está reservada para adiantamentos de ofertas pendentes e verbas de promessas. Retire ofertas ou espere as respostas para liberar o caixa livre.', 'Part of your cash is reserved for advances on pending offers and promise budgets. Withdraw offers or wait for answers to free it up.'),
    see: ['mech:money', 'glossario:caixa-livre'] },
  { id: 'faq-quebrar', q: l('Quando o selo quebra?', 'When does the label go bust?'),
    a: l('Depois de 4 meses seguidos com caixa negativo. Se a dívida for funda, o mês conta em dobro. Antes disso aparecem venda de emergência, venda forçada de equipamento e corte de equipe.', 'After 4 straight months of negative cash. If the debt is deep, a month counts double. Before that come an emergency sale, a forced equipment sale and a staff cut.'),
    see: ['mech:money'] },
  { id: 'faq-minimo', q: l('Dá para saber o mínimo que o artista aceita?', 'Can I find out the minimum an act will accept?'),
    a: l('Não exatamente: o mínimo é escondido. Você vê uma faixa, mais estreita com mais graus de conhecimento, analista, jurídico e empresário na equipe.', 'Not exactly: the minimum is hidden. You see a range, narrower with more knowledge degrees and with an analyst, legal staff and a manager.'),
    see: ['mech:contracts', 'mech:scouting'] },
  { id: 'faq-escada', q: l('Qual situação inicial escolher na primeira partida?', 'Which starting situation should I pick on my first run?'),
    a: l('Emergente ou de porte médio: caixa suficiente para errar uma vez, sem a folha pesada nem os rivais magoados de top 5 e líder.', 'Emerging or mid-size: enough cash to make one mistake, without the heavy payroll or grudging rivals of top 5 and leader.'),
    see: ['mech:start'] },
];
