// Rodada 29 (WIKI, bíblia) — catálogos das frentes novas do base: arquétipos das relíquias procedurais (relics29),
// interações com as famílias do Submundo (mob29) e tipos de laço pessoa ↔ organização (orglinks29).
import '../../sim/tick';
import { l, type L } from '../../data/world';
import { ARCH29, ARCHDEF29, CAPS29, COND29, PROV29 } from '../../sim/sys/relics29';
import { METER29, MOB29 } from '../../sim/sys/mob29';
import { LINK29 } from '../../sim/sys/orglinks29';
import { CONTRACT_MODELS, ROLES } from '../../data/rules';
import { END29_NAME, HOW29, advFactor29, expRoy29 } from '../../sim/terms29';
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
];
