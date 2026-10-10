// Aba "Personalidade" da área Você (rodada 6): traços, estilo de vida (rodada 9: derivado das habilidades),
// válvulas de escape, identidade (apelido, pronome, visual, lema) e o quadro "Seus bônus" com todas as
// fontes de perks (origem, traços, estilo, cartas, mutators, sócios…).

import { CITIES, GENRES, genreById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { bumpPerks, perkEntries, type PerkKey } from '../../sim/perks';
import { COPING, PRONOUNS, VISUALS, chooseCoping, dropCoping, lifestyleById, persona, playerTraitById, skills, type CopingId } from '../../sim/sys/persona';
import type { PerkValues } from '../../sim/perks';
import { backgroundById, life } from '../../sim/sys/life';
import { ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import { cityName, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { ic } from '../vis';

const say = (e: L | null, ok?: L) => { if (e) toast(t(e), 'bad'); else if (ok) toast(t(ok), 'good'); rerender(); };

export const PERK_NAMES: Record<PerkKey, L> = {
  offer: l('Atratividade das ofertas', 'Offer appeal'),
  critics: l('Nota da crítica', 'Critics\' score'),
  songQ: l('Qualidade das músicas', 'Song quality'),
  trust: l('Confiança ao assinar', 'Trust on signing'),
  morale: l('Moral do elenco/mês', 'Roster morale/month'),
  scoutActions: l('Ações de scouting', 'Scouting actions'),
  signals: l('Sinais novos/mês', 'New signals/month'),
  energy: l('Tempo livre/mês', 'Free time/month'),
  demos: l('Demos/mês', 'Demos/month'),
  reputation: l('Reputação institucional/ano', 'Institutional reputation/year'),
  appeal: l('Apelo dos lançamentos', 'Release appeal'),
  showRevenue: l('Bilheteria', 'Box office'),
  chartUnits: l('Vendas', 'Sales'),
  pressingCost: l('Custo de fabricação', 'Manufacturing cost'),
  scoutAccuracy: l('Precisão do scouting', 'Scouting precision'),
  stress: l('Estresse', 'Stress'),
  xp: l('Aprendizado', 'Learning'),
  valuation: l('Valor de mercado', 'Market value'),
  staffCost: l('Salários', 'Salaries'),
  wealth: l('Renda pessoal ($/mês)', 'Personal income ($/month)'),
  advance: l('Adiantamento esperado', 'Expected advance'),
  scheme: l('Sucesso das tramas', 'Scheme success'),
  metadata: l('Metadados (menos royalties não identificados)', 'Metadata (fewer unidentified royalties)'),
};
const PCT: PerkKey[] = ['appeal', 'showRevenue', 'chartUnits', 'pressingCost', 'scoutAccuracy', 'stress', 'xp', 'valuation', 'staffCost', 'advance', 'scheme', 'metadata'];

export function fmtPerk(k: PerkKey, v: number): string {
  if (PCT.includes(k)) return `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
  if (k === 'offer') return `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;
  return `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}`;
}

/** Texto curto dos efeitos de um conjunto de perks (ex.: "Confiança ao assinar +3 · Estresse −10%"). */
export function fxText(v: PerkValues | undefined, attrs?: Partial<Record<string, number>>): string {
  const ATTR: Record<string, L> = { ear: l('Ouvido', 'Ear'), negotiation: l('Negociação', 'Negotiation'), charisma: l('Carisma', 'Charisma'), management: l('Gestão', 'Management') };
  const parts = (Object.entries(v ?? {}) as [PerkKey, number][]).filter(([, x]) => x).map(([k, x]) => `${t(PERK_NAMES[k])} ${fmtPerk(k, x).replace('-', '−')}`);
  for (const [k, x] of Object.entries(attrs ?? {})) if (x && ATTR[k]) parts.push(`${t(ATTR[k])} ${x > 0 ? '+' : '−'}${Math.abs(x)}`);
  return parts.join(' · ');
}

export function bonusTable(s: GameState): HTMLElement {
  const rows = perkEntries(s).flatMap((e) => (Object.entries(e.values) as [PerkKey, number][]).filter(([, v]) => v).map(([k, v]) => ({ k, v, label: e.label, cond: !!e.act })));
  if (!rows.length) return h('p', { class: 'muted small' }, t(l('Nenhum bônus ativo.', 'No active bonuses.')));
  return h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, h('th', null, t(l('Fonte', 'Source'))), h('th', null, t(l('Efeito', 'Effect'))), h('th', null, ''))),
    h('tbody', null, rows.map((r) => h('tr', null,
      h('td', null, t(r.label)),
      h('td', null, t(PERK_NAMES[r.k]), r.cond ? h('small', { class: 'muted' }, t(l(' (só alguns atos)', ' (some acts only)'))) : null),
      h('td', { class: (r.v > 0) !== (r.k === 'stress' || r.k === 'pressingCost' || r.k === 'staffCost' || r.k === 'advance') ? 'good' : 'bad' }, fmtPerk(r.k, r.v))))));
}

export function personaTab(s: GameState): HTMLElement {
  const P0 = persona(s);
  const o = ownerOf(s);
  const S0 = skills(s);
  const ls = S0.lifestyle ? lifestyleById[S0.lifestyle] : undefined;
  const bg = backgroundById[life(s).background];
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(l('Traços', 'Traits')),
        h('div', { class: 'row wrap' }, P0.traits.length ? P0.traits.map((x) => h('span', { class: 'chip-btn on', title: t(playerTraitById[x]?.desc) }, t(playerTraitById[x]?.name))) : h('span', { class: 'muted' }, '—')),
        bg ? h('p', { class: 'small' }, h('b', null, t(bg.name)), ': ', t(bg.effects ?? bg.desc)) : null,
      ),
      section(`${t(l('Estilo de vida', 'Lifestyle'))}: ${ls ? t(ls.name) : '—'}`,
        ls ? h('p', { class: 'small' }, t(ls.desc)) : null,
        h('p', { class: 'muted small' }, t(l('O estilo de vida nasce de onde você investe os pontos de habilidade. Pontos livres: {n} — gaste na aba Habilidades.', 'Your lifestyle comes from where you invest ability points. Free points: {n} — spend them in the Abilities tab.'), { n: S0.points })),
      ),
      section(t(l('Válvulas de escape', 'Coping mechanisms')),
        P0.copingPrompt ? h('div', null,
          h('p', { class: 'bad' }, t(l('O estresse estourou ({s}). Como você lida com isso? A escolha vira hábito.', 'Stress boiled over ({s}). How do you cope? The choice becomes a habit.'), { s: Math.round(o.stress) })),
          h('div', { class: 'card-grid' }, (Object.keys(COPING) as CopingId[]).filter((c) => !P0.coping.includes(c)).map((c) => h('button', { class: 'pick', onclick: () => say(chooseCoping(s, c), l('Hábito adquirido.', 'Habit acquired.')) }, h('b', null, t(COPING[c].name)), h('small', null, t(COPING[c].desc)))))) : null,
        P0.coping.length ? h('ul', null, P0.coping.map((c) => h('li', null, h('b', null, t(COPING[c].name)), ' — ', t(COPING[c].desc), ' ', h('button', { class: 'btn small ghost', onclick: () => say(dropCoping(s, c), l('Hábito largado (custou tempo e estresse).', 'Habit dropped (cost time and stress).')) }, t(l('Largar', 'Quit')))))) : (!P0.copingPrompt ? h('p', { class: 'muted small' }, t(l('Nenhuma. Quando o estresse passar de 85, você terá de escolher uma.', 'None. When stress goes above 85 you will have to pick one.'))) : null),
      ),
      section(t(l('Seus bônus', 'Your bonuses')), h('p', { class: 'muted small' }, t(l('Tudo o que mexe na simulação a seu favor (ou contra): origem, traços, estilo, gosto, cidade natal, carta do selo, mutators e sócios.', 'Everything that tilts the simulation for (or against) you: background, traits, style, taste, hometown, label card, mutators and partners.'))), bonusTable(s)),
    ),
    h('aside', { class: 'col-side' },
      section(t(l('Identidade', 'Identity')),
        h('label', null, t(l('Apelido', 'Nickname')), h('input', { type: 'text', value: P0.nickname ?? '', maxlength: 24, onchange: (e: Event) => { P0.nickname = (e.target as HTMLInputElement).value.trim() || undefined; rerender(); } })),
        h('label', null, t(l('Pronome', 'Pronoun')), select(P0.pronoun, PRONOUNS.map((p) => ({ value: p.id, label: t(p.name) })), (v) => { P0.pronoun = v; rerender(); })),
        h('label', null, t(l('Visual', 'Look')), select(P0.visual, VISUALS.map((v) => ({ value: v.id, label: t(v.name) })), (v) => { P0.visual = v; bumpPerks(); rerender(); })),
        h('label', null, t(l('Gênero do coração', 'Favourite genre')), select(P0.favGenre ?? '', [{ value: '', label: '—' }, ...GENRES.filter((g) => g.born <= s.year).sort((a, b) => t(a.name).localeCompare(t(b.name))).map((g) => ({ value: g.id, label: t(g.name) }))], (v) => { P0.favGenre = v || undefined; bumpPerks(); rerender(); })),
        h('p', { class: 'small' }, ic('house'), ' ', t(l('Cidade natal', 'Hometown')), ': ', P0.hometown && CITIES.some((c) => c.id === P0.hometown) ? cityName(P0.hometown) : '—'),
        P0.favGenre && genreById[P0.favGenre] ? h('p', { class: 'muted small' }, t(l('Mudar de gosto não custa nada, mas o visual e o gênero mexem nos bônus.', 'Changing taste is free, but look and genre change your bonuses.'))) : null,
      ),
      P0.history.length ? section(t(l('Perks recentes', 'Recent perks')), h('ul', { class: 'small' }, P0.history.slice(0, 8).map((x) => h('li', null, t(x.text))))) : null,
    ),
  );
}
