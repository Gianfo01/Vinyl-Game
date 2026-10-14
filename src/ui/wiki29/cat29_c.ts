// Rodada 29 (WIKI, bíblia) — catálogos das frentes novas do base: arquétipos das relíquias procedurais (relics29),
// interações com as famílias do Submundo (mob29) e tipos de laço pessoa ↔ organização (orglinks29).
import '../../sim/tick';
import { l, type L } from '../../data/world';
import { ARCH29, ARCHDEF29, CAPS29, COND29, PROV29 } from '../../sim/sys/relics29';
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

export const CATS_C: Cat29[] = [
  { id: 'reliquias-arquetipos', title: l('Relíquias: arquétipos procedurais', 'Relics: procedural archetypes'), icon: 'diamond', group: 'objetos',
    desc: l(`As relíquias reais viram ${ARCH29.length} arquétipos; qualquer artista pode ganhar versões novas quando um fato acontece. Limites: ${CAPS29.year} por ano, ${CAPS29.actYear} por artista por ano, ${CAPS29.total} vivas.`, `Real relics become ${ARCH29.length} archetypes; any act can get new versions when a fact happens. Caps: ${CAPS29.year} a year, ${CAPS29.actYear} per act per year, ${CAPS29.total} alive.`),
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
          [l('Quem oferece', 'Who offers it'), ['management', 'production', 'jv'].includes(m.id) ? l('só o jogador', 'player only') : l('jogador e selos NPC', 'player and NPC labels')],
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
  { id: 'funcoes-personagem', title: l('Seu personagem: funções', 'Your character: roles'), icon: 'mic', group: 'pessoas',
    desc: l('Funções que o seu personagem artista pode ter (principal + até 2 extras), com o ano a partir do qual existem.', 'Roles your artist character can have (main + up to 2 extras), with the year they exist from.'),
    items: () => ROLES29.map((r): CatItem29 => ({ id: r, title: ROLE_L[r] ?? r, rows: [[l('Existe desde', 'Exists since'), ROLE_FROM29[r] ? String(ROLE_FROM29[r]) : l('sempre', 'always')], [l('Conta como cantor', 'Counts as singer'), r === 'vocal' || r === 'mc' ? l('sim (a banda não ganha outro)', 'yes (the band gets no extra singer)') : l('não', 'no')]], see: ['mech:start'] })) },
];
