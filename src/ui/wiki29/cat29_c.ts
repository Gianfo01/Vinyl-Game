// Rodada 29 (WIKI, bíblia) — catálogos das frentes novas do base: arquétipos das relíquias procedurais (relics29),
// interações com as famílias do Submundo (mob29) e tipos de laço pessoa ↔ organização (orglinks29).
import '../../sim/tick';
import { l, type L } from '../../data/world';
import { ARCH29, ARCHDEF29, COND29, DENS29, DENS29_NAME, PROV29 } from '../../sim/sys/relics29';
import { ADULT29, CHILD_MIN29, LAWS29, SRC29, birthRate29, childSources29 } from '../../sim/sys/family29';
import { AGE29, ATT29, EL29, FMT_AGE29, MERCH29, PHYS_AGE29, REF29, demog29 } from '../../sim/sys/demo29';
import { GENRE29_TOP, suggestGenres29 } from '../../sim/genre29data';
import { cityById } from '../../data/world';
import { METER29, MOB29 } from '../../sim/sys/mob29';
import { LINK29 } from '../../sim/sys/orglinks29';
import { CONTRACT_MODELS, ROLES } from '../../data/rules';
import { END29_NAME, HOW29, advFactor29, expRoy29 } from '../../sim/terms29';
import { ASKS29, JOBS29 } from '../../sim/sys/mob29';
import { RIGM29 } from '../../sim/sys/rig29';
import { AFF29 } from '../../sim/sys/aff29';
import { ORGS17 } from '../../data/orgs17';
import { CYBER29, STREET29 } from '../../data/cyber29';
import { genreById } from '../../data/world';
import { ROLES29, ROLE_FROM29 } from '../../sim/char29data';
import { ROLE_L } from './wiki29core';
import type { Cat29, CatItem29 } from './wiki29types';

type Row = [L, string | L];
const DRV: Record<string, [string, string]> = { F: ['fama', 'fame'], R: ['raridade', 'rarity'], E: ['época', 'era'], S: ['peso da história', 'story weight'], C: ['estado', 'condition'], P: ['procedência', 'provenance'] };
const usd = (v: number) => `US$ ${v.toLocaleString('pt-BR')} (2020)`;
const pc = (x: number) => `${Math.round(x * 100)}%`;
const mul = (x: number) => `×${x}`;
/** cidade × ano de exemplo para o catálogo de gêneros sugeridos */
const SCENES29: [string, number][] = [
  ['new_orleans', 1925], ['chicago', 1950], ['memphis', 1955], ['london', 1962], ['liverpool', 1963], ['rio', 1962], ['detroit', 1965], ['san_francisco', 1967],
  ['kingston', 1972], ['lagos', 1975], ['new_york', 1975], ['berlin', 1978], ['london', 1977], ['los_angeles', 1985], ['seattle', 1991], ['manchester', 1989],
  ['bristol', 1994], ['atlanta', 2010], ['seoul', 2012], ['sao_paulo', 2015], ['tokyo', 1985], ['paris', 1998], ['medellin', 2018], ['lagos', 2020],
];
const DK = ['few', 'normal', 'many', 'all'] as const;

export const CATS_C: Cat29[] = [
  { id: 'reliquias-arquetipos', title: l('Relíquias: arquétipos procedurais', 'Relics: procedural archetypes'), icon: 'diamond', group: 'objetos',
    desc: l(`As relíquias reais viram ${ARCH29.length} arquétipos; qualquer artista pode ganhar versões novas quando um fato acontece. Quantas nascem depende da densidade (padrão ${DENS29_NAME.many.pt}: ${DENS29.many.year} por ano num mundo médio, ${DENS29.many.total} vivas).`, `Real relics become ${ARCH29.length} archetypes; any act can get new versions when a fact happens. How many are born depends on the density (default ${DENS29_NAME.many.en}: ${DENS29.many.year} a year in a medium world, ${DENS29.many.total} alive).`),
    items: () => {
      const out: CatItem29[] = ARCH29.map((id): CatItem29 => {
        const d = ARCHDEF29[id];
        const rows: Row[] = [
          [l('Valor base', 'Base value'), usd(d.base)],
          [l('O que pesa no valor', 'What drives value'), l([...d.drv].map((c) => DRV[c]?.[0] ?? c).join(', '), [...d.drv].map((c) => DRV[c]?.[1] ?? c).join(', '))],
          [l('Nasce de', 'Born from'), d.trig.join(', ')],
          [l('Peças reais deste tipo', 'Real pieces of this kind'), d.ex.length ? String(d.ex.length) : '—'],
        ];
        if (d.generic) rows.push([l('Genérico', 'Generic'), l('sim (qualquer artista)', 'yes (any act)')]);
        if (d.label) rows.push([l('Pode ficar com o selo', 'Can stay with the label'), l('sim', 'yes')]);
        return { id, title: d.name, rows, see: ['mech:awards'] };
      });
      out.push({ id: 'estado-procedencia', title: l('Estados e procedências', 'Conditions and provenances'), rows: [
        [l('Estados', 'Conditions'), l(COND29.map((x) => x.pt).join(', '), COND29.map((x) => x.en).join(', '))],
        [l('Procedências', 'Provenances'), l(Object.values(PROV29).map((x) => x.pt).join(', '), Object.values(PROV29).map((x) => x.en).join(', '))],
      ], see: ['mech:awards'] });
      return out;
    } },
  { id: 'familias-interacoes', title: l('Submundo: interações com as famílias', 'Underworld: family interactions'), icon: 'skull', group: 'regras',
    desc: l(`Cada família tem um medidor (${Object.values(METER29).map((x) => x.pt).join(', ')}). As interações abaixo têm custo, chance e consequência.`, `Each family has a meter (${Object.values(METER29).map((x) => x.en).join(', ')}). The interactions below have cost, odds and consequences.`),
    items: () => MOB29.map((x): CatItem29 => ({ id: x.id, title: x.name, sub: x.desc, rows: [[l('Consequências', 'Consequences'), x.fx]], see: ['mech:underworld'] })) },
  { id: 'lacos-organizacao', title: l('Submundo: laços pessoa ↔ organização', 'Underworld: person ↔ organization ties'), icon: 'network', group: 'regras',
    desc: l('Os tipos de laço que aparecem no cartão da organização e na ficha da pessoa (uma fonte só).', 'The tie kinds shown on the organization card and on the person sheet (one source).'),
    items: () => Object.entries(LINK29).map(([id, name]): CatItem29 => ({ id, title: name, rows: [], see: ['mech:underworld'] })) },
  { id: 'modelos-contrato', title: l('Modelos de contrato e papéis', 'Contract models and roles'), icon: 'contract', group: 'regras',
    desc: l(`Os ${CONTRACT_MODELS.length} modelos do formulário de oferta e da mesa: os cinco clássicos e os três acordos especiais (empresariamento, produção e joint venture), mais os papéis de início.`, `The ${CONTRACT_MODELS.length} models of the offer form and the table: the five classic ones and the three special deals (management, production and joint venture), plus the starting roles.`),
    items: () => [
      ...CONTRACT_MODELS.map((m): CatItem29 => {
        const rows: Row[] = [
          [l('Termo que o artista espera (fama 0 → 50)', 'Term the act expects (fame 0 → 50)'), `${Math.round(expRoy29(m.id, 0) * 100)}% → ${Math.round(expRoy29(m.id, 50) * 100)}%`],
          [l('Adiantamento esperado (× clássico)', 'Expected advance (× classic)'), `${Math.round(advFactor29(m.id) * 100)}%`],
          [l('Quem oferece', 'Who offers it'), m.id === 'management' ? l('jogador e empresários NPC', 'player and NPC managers') : m.id === 'production' ? l('jogador e produtoras NPC (produtores reais e estúdios dos selos rivais)', 'player and NPC production companies (real producers and rival labels\' studios)') : m.id === 'jv' ? l('jogador, selos NPC (selo-vaidade de estrela) e estrelas que propõem ao seu selo', 'player, NPC labels (a star\'s vanity label) and stars proposing to your label') : l('jogador e selos NPC', 'player and NPC labels')],
        ];
        return { id: m.id, title: m.name, sub: m.desc, rows, text: HOW29[m.id] ? [HOW29[m.id]!] : undefined, see: ['mech:contracts', 'mech:money'] };
      }),
      { id: 'fins-acordos', title: l('Como os acordos especiais terminam', 'How special deals end'), rows: Object.entries(END29_NAME).map(([k, v]): Row => [l(k, k), v]), see: ['mech:contracts'] },
      ...ROLES.map((r): CatItem29 => ({ id: 'papel-' + r.id, title: r.name, sub: r.desc, rows: [[l('Atividades em que começa', 'Starting activities'), r.careers.join(', ')]], see: ['mech:careers'] })),
    ] },
  { id: 'voto-comprado', title: l('Submundo: métodos de voto comprado', 'Underworld: rigged-vote methods'), icon: 'trophy', group: 'regras',
    desc: l('Como manipular a votação de um prêmio (rig29): força e chance base de vazar de cada método. Vale para Gramófonos, Prêmios do Ofício, Prêmio da Crítica, prêmios nacionais de júri local e Hall da Fama.', 'How to rig an award vote (rig29): power and base leak odds of each method. Works for the Gramophones, Craft Awards, Critics\' Prize, national local-jury awards and the Hall of Fame.'),
    items: () => {
      const era: Record<string, L> = { jury: l('sempre', 'always'), lobby: l('sempre', 'always'), ballot: l('1950–1999', '1950–1999'), bots: l('2005+ (a chance de vazar sobe com os anos)', '2005+ (leak odds rise over the years)'), vote: l('com voto na academia (reputação institucional 50+ ou 3+ prêmios)', 'with an academy vote (institutional reputation 50+ or 3+ awards)') };
      return Object.entries(RIGM29).map(([id, m]): CatItem29 => ({ id, title: m.name, rows: [[l('Força', 'Power'), String(m.pow)], [l('Chance base de vazar', 'Base leak odds'), `${Math.round(m.q * 100)}%`], [l('Quando', 'When'), era[id] ?? '—']], see: ['mech:underworld', 'mech:awards'] }));
    } },
  { id: 'servicos-submundo', title: l('Submundo: serviços das famílias e do crime digital', 'Underworld: family and cybercrime services'), icon: 'skull', group: 'regras',
    desc: l('O que dá para contratar de uma organização ("Contratar … para…"): tradicionais, crime digital ou ambas, e quem oferece cada serviço.', 'What you can hire an organization for ("Hire … to…"): traditional, cybercrime or both, and who offers each service.'),
    items: () => {
      const all = [...ORGS17, ...CYBER29, ...STREET29];
      return JOBS29.map((j): CatItem29 => {
        const who = all.filter((o) => (!j.for || (j.for === 'cyber') === (o.kind === 'cyber')) && (!j.racket || j.racket.some((r) => (o.rackets as string[]).includes(r))));
        return { id: j.id.replace(/[:]/g, '-'), title: j.name, rows: [[l('Quem oferece', 'Offered by'), j.for === 'cyber' ? l('crime digital', 'cybercrime') : j.for === 'trad' ? l('famílias tradicionais', 'traditional families') : l('todas', 'all')], [l('Organizações', 'Organizations'), l(who.map((o) => o.name.pt).join(', ') || '—', who.map((o) => o.name.en).join(', ') || '—')]], see: ['mech:underworld'] };
      });
    } },
  { id: 'pedidos-familia', title: l('Submundo: pedidos das famílias', 'Underworld: family requests'), icon: 'scroll', group: 'regras',
    desc: l('O que uma família pode pedir a você (com prazo, no Cockpit "Favores e dívidas" e no calendário): cumprir, negociar prazo, recusar ou pagar.', 'What a family may ask of you (with a deadline, in the Cockpit "Favors and debts" card and the calendar): fulfill, negotiate the deadline, refuse or pay.'),
    items: () => ASKS29.map((a): CatItem29 => ({ id: a.k, title: a.name, sub: a.desc, rows: [[l('Consequências', 'Consequences'), a.fx]], see: ['mech:underworld'] })) },
  { id: 'faccoes-cenas', title: l('Submundo: facções × gêneros e cenas', 'Underworld: factions × genres and scenes'), icon: 'network', group: 'regras',
    desc: l('Afinidade cultural de uma organização com um gênero ou cena, com época e território. É de gênero e cena, nunca de pessoa.', 'An organization\'s cultural affinity with a genre or scene, with period and territory. By genre and scene, never by person.'),
    items: () => {
      const all = [...ORGS17, ...CYBER29, ...STREET29];
      return AFF29.map((a, i): CatItem29 => {
        const o = all.find((x) => x.id === a.o);
        const gs = a.genres.map((g) => genreById[g]?.name ?? l(g, g));
        return { id: `${a.o}-${i}`, title: l(`${o?.name.pt ?? a.o} — ${a.scene.pt}`, `${o?.name.en ?? a.o} — ${a.scene.en}`), rows: [
          [l('Gêneros', 'Genres'), l(gs.map((g) => g.pt).join(', '), gs.map((g) => g.en).join(', '))],
          [l('Época', 'Period'), `${a.from}–${a.to >= 2100 ? '' : a.to}`],
          [l('Tipo', 'Kind'), a.doc ? l('cena documentada', 'documented scene') : l('afinidade de jogo', 'game affinity')],
          [l('Estigma (pânico moral, censura)', 'Stigma (moral panic, censorship)'), `${Math.round(a.stigma * 100)}%`],
        ], text: [a.note], see: ['mech:underworld', `org:${a.o}`] };
      });
    } },
  { id: 'publico-faixas', title: l('Público: faixas de idade', 'Audience: age bands'), icon: 'fans', group: 'pessoas',
    desc: l(`As ${AGE29.length} faixas em que os fãs de cada ato se dividem (demo29) e como cada uma reage. Os perfis valem relativos à mistura de referência (um ato em início/meio de carreira), então só a diferença entre públicos pesa.`, `The ${AGE29.length} bands each act's fans split into (demo29) and how each one behaves. Profiles count relative to the reference mix (an early/mid-career act), so only the difference between audiences matters.`),
    items: () => AGE29.map((b, i): CatItem29 => ({ id: b.id, title: l(`${b.name.pt} anos`, `Ages ${b.name.en}`), rows: [
      [l('Fatia na mistura de referência', 'Share of the reference mix'), pc(REF29[i])],
      [l('Envelhece para a faixa seguinte', 'Ages into the next band'), b.w ? l(`1/${b.w} por ano (na virada do ano)`, `1/${b.w} a year (at the turn of the year)`) : l('não (perde ~4% ao ano)', 'no (loses ~4% a year)')],
      [l('Ida a shows', 'Show attendance'), mul(ATT29[i])],
      [l('Sensibilidade ao preço do ingresso', 'Ticket price sensitivity'), mul(EL29[i])],
      [l('Gasto na banca (merch)', 'Merch spending'), mul(MERCH29[i])],
      [l('Compra de físico (vinil, CD)', 'Physical buying (vinyl, CD)'), mul(PHYS_AGE29[i])],
      [l('Single · LP · relançamento', 'Single · LP · reissue'), `${mul(FMT_AGE29.single[i])} · ${mul(FMT_AGE29.lp[i])} · ${mul(FMT_AGE29.catalog[i])}`],
      [l('Peso na população 13+ (América do Norte 1965 · 2010)', 'Share of the 13+ population (North America 1965 · 2010)'), `${pc(demog29('na', 1965)[i])} · ${pc(demog29('na', 2010)[i])}`],
      [l('Peso na população 13+ (Brasil 1965 · 2010)', 'Share of the 13+ population (Brazil 1965 · 2010)'), `${pc(demog29('br', 1965)[i])} · ${pc(demog29('br', 2010)[i])}`],
    ], see: ['mech:fame', 'glossario:faixa-etaria'] })) },
  { id: 'familia-leis-menores', title: l('Família: leis do artista menor', 'Family: child performer laws'), icon: 'scroll', group: 'regras',
    desc: l(`Leis que valem para estrelas mirins (de ${CHILD_MIN29} a ${ADULT29 - 1} anos) por país e ano: a parte dos ganhos que vai para o fundo e a fração da carga que conta em dobro (limite de horas e de turnê). Antes delas não há fundo nem limite.`, `Laws for child stars (ages ${CHILD_MIN29} to ${ADULT29 - 1}) by country and year: the share of earnings put in trust and the fraction of the workload that counts double (hour and touring limits). Before them there is no trust and no limit.`),
    items: () => [
      ...LAWS29.map((x): CatItem29 => ({ id: `lei-${x.cc === '*' ? 'onu' : x.cc.toLowerCase()}`, title: x.name, rows: [
        [l('País', 'Country'), x.cc === '*' ? l('demais países', 'other countries') : x.cc],
        [l('Desde', 'Since'), String(x.y)],
        [l('Parte dos ganhos no fundo', 'Share of earnings in trust'), pc(x.trust)],
        [l('Fração da carga que conta em dobro', 'Workload fraction counted double'), pc(x.hours)],
      ], see: ['mech:life', 'glossario:fundo-coogan'] })),
      { id: 'natalidade', title: l('Natalidade por época', 'Birth rate by era'), rows: [1930, 1955, 1970, 1990, 2010].map((y): Row => [l(`por volta de ${y}`, `around ${y}`), `×${birthRate29(y)}`]), see: ['mech:life'] },
    ] },
  { id: 'estrelas-mirins-fontes', title: l('Estrelas mirins: de onde vêm, por época', 'Child stars: where they come from, by era'), icon: 'star', group: 'historia',
    desc: l('Fontes de estrelas mirins geradas no mundo, com o peso de cada uma por ano. Grupos infantis muitas vezes são irmãos de verdade (com laço de família).', 'Sources of child stars generated in the world, with each one\'s weight per year. Kid groups are often real siblings (with a family tie).'),
    items: () => (Object.keys(SRC29) as (keyof typeof SRC29)[]).filter((k) => [1925, 1945, 1965, 1985, 2000, 2015].some((y) => childSources29(y).some(([s]) => s === k))).map((k): CatItem29 => ({ id: `fonte-${k}`, title: SRC29[k], rows:
      [1925, 1945, 1965, 1985, 2000, 2015].map((y): Row => [l(String(y), String(y)), (() => { const w = childSources29(y).find(([s]) => s === k)?.[1]; return w ? String(w) : '—'; })()]), see: ['mech:life', 'glossario:estrela-mirim'] })) },
  { id: 'reliquias-densidade', title: l('Relíquias: densidade', 'Relics: density'), icon: 'diamond', group: 'objetos',
    desc: l(`A opção "Relíquias" da Nova run completa e das Opções (padrão ${DENS29_NAME.many.pt}). Fora de "${DENS29_NAME.few.pt}", o teto anual escala com o tamanho da base e com os atos famosos ativos; os tetos por ato são os de uma superestrela.`, `The "Relics" option in the full New run and in Options (default ${DENS29_NAME.many.en}). Outside "${DENS29_NAME.few.en}", the yearly cap scales with database size and active famous acts; per-act caps are a superstar's.`),
    items: () => DK.map((k): CatItem29 => { const c = DENS29[k]; return { id: `densidade-${k}`, title: DENS29_NAME[k], rows: [
      [l('Teto por ano (mundo médio)', 'Yearly cap (medium world)'), c.flat ? l(`${c.year} (fixo)`, `${c.year} (fixed)`) : String(c.year)],
      [l('Por ato por ano · vivas por ato', 'Per act per year · alive per act'), `${c.actYear} · ${c.actLive}`],
      [l('Mesmo arquétipo por ato', 'Same archetype per act'), String(c.archAct)],
      [l('Vivas no total · falsificações vivas', 'Alive in total · live forgeries'), `${c.total} · ${c.fakes}`],
      [l('Chance dos gatilhos', 'Trigger odds'), `×${c.p}`],
      [l('Acervo histórico a partir de', 'Historical archive from'), c.archive ? l(`${c.archive} anos`, `${c.archive} years`) : l('nunca', 'never')],
      [l('Falsários por ano · leilão do ano', 'Forgers a year · auction of the year'), `${c.forge} · ${c.famous ? pc(c.famous) : '—'}`],
    ], see: ['mech:awards', 'glossario:acervo-historico'] }; }) },
  { id: 'generos-sugeridos', title: l('Gêneros sugeridos por cena', 'Suggested genres by scene'), icon: 'globe', group: 'mundo',
    desc: l(`O que a Nova run sugere para a banda em cada cidade e ano (as ${GENRE29_TOP} primeiras da lista, a melhor primeiro): cena da cidade, do país e da região, gosto do mercado e do país pela época e idade do gênero. Calculado ao vivo pelo código.`, `What the New run suggests for the band in each city and year (the first ${GENRE29_TOP} on the list, best first): city, country and region scenes, the market's and country's taste for the era and the genre's age. Computed live from the code.`),
    items: () => SCENES29.filter(([c]) => cityById[c]).map(([c, y]): CatItem29 => {
      const gs = suggestGenres29(c, y).map((g) => genreById[g]?.name ?? l(g, g));
      return { id: `${c}-${y}`, title: l(`${cityById[c].name.pt}, ${y}`, `${cityById[c].name.en}, ${y}`), rows: gs.map((g, i): Row => [l(`${i + 1}ª sugestão`, `Suggestion ${i + 1}`), g]), see: ['mech:start', `city:${c}`] };
    }) },
  { id: 'funcoes-personagem', title: l('Seu personagem: funções', 'Your character: roles'), icon: 'mic', group: 'pessoas',
    desc: l('Funções que o seu personagem artista pode ter (principal + até 2 extras), com o ano a partir do qual existem.', 'Roles your artist character can have (main + up to 2 extras), with the year they exist from.'),
    items: () => ROLES29.map((r): CatItem29 => ({ id: r, title: ROLE_L[r] ?? r, rows: [[l('Existe desde', 'Exists since'), ROLE_FROM29[r] ? String(ROLE_FROM29[r]) : l('sempre', 'always')], [l('Conta como cantor', 'Counts as singer'), r === 'vocal' || r === 'mc' ? l('sim (a banda não ganha outro)', 'yes (the band gets no extra singer)') : l('não', 'no')]], see: ['mech:start'] })) },
];
