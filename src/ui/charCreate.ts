// Ficha de criação do personagem (rodadas 5 e 6): identidade, origem com efeitos, traços (até 3,
// opostos se excluem), estilo de vida, gênero do coração, cidade natal, visual, aparência e pontos
// livres. A prévia mostra os atributos que resultam de tudo isso.

import { CITIES, GENRES, l } from '../data/world';
import { t } from '../i18n/strings';
import { BACKGROUNDS, backgroundById, type BackgroundId } from '../sim/sys/life/data';
import { FREE_POINTS, PLAYER_TRAITS, PRONOUNS, STYLES, VISUALS, playerTraitById, type OwnerAttrId, type StyleId } from '../sim/sys/persona/data';
import { canAddTrait, deriveAttrs, pointsUsed } from '../sim/sys/persona';
import { ROLE_NAMES, type Role } from '../sim/sys/talent/attrs';
import type { Appearance, RunConfig } from '../sim/types';
import { cityName } from './common';
import { h, select } from './dom';
import { appearanceEditor } from './pixel/editor';

const ATTR_NAMES: Record<OwnerAttrId, ReturnType<typeof l>> = {
  ear: l('Ouvido', 'Ear'),
  negotiation: l('Negociação', 'Negotiation'),
  charisma: l('Carisma', 'Charisma'),
  management: l('Gestão', 'Management'),
};

export function characterCard(cfg: RunConfig): HTMLElement {
  const ch = (cfg.character ??= { name: '', age: 30, background: 'musician', role: 'guitar', traits: [], style: 'mentor', visual: 'casual', pronoun: 'they', points: {} });
  ch.traits ??= [];
  ch.points ??= {};
  ch.style ??= 'mentor';
  const fake: { id: string; role: Role; look?: Appearance } = { id: 'player-new', role: ch.role ?? 'guitar', look: ch.look };
  const lookBox = h('div', { class: 'ng-look' });
  const drawLook = () => lookBox.replaceChildren(appearanceEditor(fake, (look) => { ch.look = look; fake.look = look; }, cfg.startYear));
  const roles: Role[] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings', 'dj', 'producer', 'mc'];
  const roleSel = select<Role>(ch.role ?? 'guitar', roles.map((r) => ({ value: r, label: t(ROLE_NAMES[r]) })), (v) => { ch.role = v; fake.role = v; drawLook(); });

  const preview = h('div', { class: 'cc-preview' });
  const drawPreview = () => {
    const a = deriveAttrs(ch);
    const left = FREE_POINTS - pointsUsed(ch);
    const bg = backgroundById[ch.background as BackgroundId];
    preview.replaceChildren(
      h('h4', null, t(l('Atributos resultantes', 'Resulting attributes')), ' ', h('small', { class: 'muted' }, t(l('pontos livres: {n}', 'free points: {n}'), { n: left }))),
      ...(Object.keys(ATTR_NAMES) as OwnerAttrId[]).map((k) => h('div', { class: 'cc-attr' },
        h('span', null, t(ATTR_NAMES[k])),
        h('button', { class: 'btn small ghost', type: 'button', disabled: (ch.points![k] ?? 0) <= 0, onclick: () => { ch.points![k] = (ch.points![k] ?? 0) - 1; drawPreview(); } }, '−'),
        h('span', { class: 'meter-bar' }, h('span', { style: `width:${a[k]}%` })),
        h('b', null, String(a[k])),
        h('button', { class: 'btn small ghost', type: 'button', disabled: left <= 0, onclick: () => { ch.points![k] = (ch.points![k] ?? 0) + 1; drawPreview(); } }, '+'))),
      bg?.effects ? h('p', { class: 'small' }, h('b', null, t(l('Efeitos da origem: ', 'Background effects: '))), t(bg.effects)) : '',
      (ch.traits ?? []).length ? h('p', { class: 'small' }, h('b', null, t(l('Traços: ', 'Traits: '))), (ch.traits ?? []).map((x) => t(playerTraitById[x]?.desc)).join(' ')) : '',
    );
  };

  const bgBox = h('div', { class: 'card-grid' });
  const drawBg = () => bgBox.replaceChildren(...BACKGROUNDS.map((b) => h('button', { class: `pick ${ch.background === b.id ? 'on' : ''}`, type: 'button', onclick: () => { ch.background = b.id; ch.role = b.role; fake.role = b.role; roleSel.value = b.role; drawBg(); drawLook(); drawPreview(); } },
    h('b', null, t(b.name)), h('small', null, t(b.desc)), b.effects ? h('small', { class: 'muted' }, t(b.effects)) : null)));

  const traitBox = h('div', { class: 'cc-traits' });
  const drawTraits = () => traitBox.replaceChildren(...PLAYER_TRAITS.map((tr) => {
    const on = ch.traits!.includes(tr.id);
    const ok = canAddTrait(ch, tr.id);
    return h('button', { type: 'button', class: `chip-btn ${on ? 'on' : ''}`, disabled: !ok, title: t(tr.desc) + (tr.opposite ? ` (${t(l('oposto', 'opposite'))}: ${t(playerTraitById[tr.opposite]?.name)})` : ''),
      onclick: () => { ch.traits = on ? ch.traits!.filter((x) => x !== tr.id) : [...ch.traits!, tr.id]; drawTraits(); drawPreview(); } },
      t(tr.name), tr.congenital ? ' ✦' : '');
  }), h('p', { class: 'muted small' }, t(l('Escolha até 3. Opostos não combinam. ✦ = dom hereditário (filhos podem herdar). Traços de temperamento (Rebelde, Romântico, Espiritual…) puxam a sua música para certos gêneros.', 'Pick up to 3. Opposites do not mix. ✦ = inheritable gift (children may inherit). Temperament traits (Rebel, Romantic, Spiritual…) pull your own music towards certain genres.'))));

  const styleBox = h('div', { class: 'card-grid' });
  const drawStyles = () => styleBox.replaceChildren(...STYLES.map((st) => h('button', { type: 'button', class: `pick ${ch.style === st.id ? 'on' : ''}`, onclick: () => { ch.style = st.id; drawStyles(); drawPreview(); } },
    h('b', null, t(st.name)), h('small', null, t(st.desc)),
    h('small', { class: 'muted' }, st.perks.map((p) => t(p.name)).join(' → ')))));

  const genres = GENRES.filter((g) => g.born <= cfg.startYear).sort((a, b) => t(a.name).localeCompare(t(b.name)));
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));

  drawLook(); drawBg(); drawTraits(); drawStyles(); drawPreview();
  return h('section', { class: 'card wide' },
    h('h3', null, t(l('Seu personagem', 'Your character'))),
    h('p', { class: 'muted small' }, t(l('Você é o dono do selo e também uma pessoa no mundo: pode namorar, casar, ter filhos, tocar, formar ou entrar numa banda (área Você, tecla V). Origem, traços, estilo e visual definem seus atributos e bônus.', 'You own the label and are also a person in the world: date, marry, have children, play, form or join a band (You area, key V). Background, traits, style and look define your attributes and bonuses.'))),
    h('div', { class: 'ng-char' },
      h('div', null,
        h('label', null, t(l('Nome', 'Name')), h('input', { type: 'text', value: ch.name, placeholder: t(l('(gerado)', '(generated)')), maxlength: 40, oninput: (e: Event) => (ch.name = (e.target as HTMLInputElement).value) })),
        h('div', { class: 'row wrap cc-row' },
          h('label', null, t(l('Apelido', 'Nickname')), h('input', { type: 'text', value: ch.nickname ?? '', maxlength: 24, placeholder: t(l('opcional', 'optional')), oninput: (e: Event) => (ch.nickname = (e.target as HTMLInputElement).value) })),
          h('label', null, t(l('Pronome', 'Pronoun')), select(ch.pronoun ?? 'they', PRONOUNS.map((p) => ({ value: p.id, label: t(p.name) })), (v) => (ch.pronoun = v))),
          h('label', null, t(l('Idade', 'Age')), h('input', { type: 'number', min: 18, max: 70, value: ch.age, oninput: (e: Event) => (ch.age = Math.max(18, Math.min(70, Number((e.target as HTMLInputElement).value) || 30))) })),
        ),
        h('div', { class: 'row wrap cc-row' },
          h('label', null, t(l('Instrumento principal', 'Main instrument')), roleSel),
          h('label', null, t(l('Gênero do coração', 'Favourite genre')), select(ch.favGenre ?? '', [{ value: '', label: t(l('(nenhum)', '(none)')) }, ...genres.map((g) => ({ value: g.id, label: t(g.name) }))], (v) => (ch.favGenre = v || undefined))),
        ),
        h('div', { class: 'row wrap cc-row' },
          h('label', null, t(l('Cidade natal', 'Hometown')), select(ch.hometown ?? '', [{ value: '', label: t(l('(a cidade da sede)', '(the HQ city)')) }, ...cities.map((c) => ({ value: c.id, label: cityName(c.id) }))], (v) => (ch.hometown = v || undefined))),
          h('label', null, t(l('Visual', 'Look')), select(ch.visual ?? 'casual', VISUALS.map((v) => ({ value: v.id, label: `${t(v.name)} — ${t(v.desc)}` })), (v) => { ch.visual = v; drawPreview(); })),
        ),
        h('label', null, t(l('Lema', 'Motto')), h('input', { type: 'text', value: ch.motto ?? '', maxlength: 120, placeholder: t(l('Ex.: "Disco bom não tem prazo de validade."', 'E.g. "A good record never expires."')), oninput: (e: Event) => (ch.motto = (e.target as HTMLInputElement).value) })),
        preview,
      ),
      lookBox,
    ),
    h('h4', null, t(l('Origem', 'Background'))),
    bgBox,
    h('h4', null, t(l('Traços de personalidade', 'Personality traits'))),
    traitBox,
    h('h4', null, t(l('Estilo de jogo (estilo de vida)', 'Play style (lifestyle)'))),
    h('p', { class: 'muted small' }, t(l('Seu foco: ganha XP todo mês e desbloqueia 6 perks em sequência. Dá para trocar depois (área Você), mas o progresso do próximo perk zera.', 'Your focus: earns XP monthly and unlocks 6 perks in order. You can switch later (You area), but progress towards the next perk resets.'))),
    styleBox,
  );
}

export type { StyleId };
