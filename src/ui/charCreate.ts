// Ficha de criação do personagem (rodadas 5, 6 e 9): identidade, sexo, trajetória profissional com
// efeitos (rodada 9: uma lista só — a antiga "origem" virou a base de cada trajetória), traços com os
// efeitos à vista, pontos iniciais na árvore de habilidades (o estilo de vida sai daí, com prévia ao vivo),
// gênero do coração, cidade natal, visual, aparência e pontos livres.

import { CITIES, GENRES, l } from '../data/world';
import { t } from '../i18n/strings';
import { backgroundById, type BackgroundId } from '../sim/sys/life/data';
import { FREE_POINTS, PRONOUNS, VISUALS, playerTraitById, type OwnerAttrId } from '../sim/sys/persona/data';
import { BRANCHES, SKILL_TREE, START_SKILL_POINTS, canBuySkill, lifestyleById, lifestyleOf, skillById, validStartSkills } from '../sim/sys/persona/skills';
import { careerOfSpec, deriveAttrs, pointsUsed } from '../sim/sys/persona';
import { ORIGINS, originById } from '../sim/sys/identity/data';
import { POLS, POL_HINT, RELS, polById, relById } from '../sim/beliefs';
import { ROLE_NAMES, type Role } from '../sim/sys/talent/attrs';
import type { Appearance, CharacterSpec, RunConfig } from '../sim/types';
import { cityName } from './common';
import { h, select } from './dom';
import { appearanceEditor, fitLookToSex, type Sex } from './pixel/editor';
import { fxText } from './sys/persona';
import { helpTip, hl, traitFx, traitPicker } from './newgame13';
import './sys/skills.css';

const ATTR_NAMES: Record<OwnerAttrId, ReturnType<typeof l>> = {
  ear: l('Ouvido', 'Ear'),
  negotiation: l('Negociação', 'Negotiation'),
  charisma: l('Carisma', 'Charisma'),
  management: l('Gestão', 'Management'),
};
const SEXES: { id: Sex; name: ReturnType<typeof l> }[] = [
  { id: 'm', name: l('Masculino', 'Male') },
  { id: 'f', name: l('Feminino', 'Female') },
  { id: 'x', name: l('Outro', 'Other') },
];

/** Árvore inicial: pontos de habilidade na criação com prévia do estilo de vida. */
export function skillPicker(ch: CharacterSpec, onChange: () => void): HTMLElement {
  const box = h('div', { class: 'cc-skills' });
  const draw = () => {
    const owned = validStartSkills(ch.skills ?? []);
    ch.skills = owned;
    const left = START_SKILL_POINTS - owned.reduce((x, id) => x + skillById[id].cost, 0);
    const ls = lifestyleOf(owned);
    box.replaceChildren(
      h('p', { class: 'small' }, h('b', null, t(l('Pontos: {n}/{m}', 'Points: {n}/{m}'), { n: left, m: START_SKILL_POINTS })), ' · ',
        t(l('Estilo de vida resultante: ', 'Resulting lifestyle: ')), h('b', null, ls ? t(lifestyleById[ls].name) : '—'),
        ls ? h('span', { class: 'muted' }, ` — ${t(lifestyleById[ls].desc)}`) : null),
      h('div', { class: 'sk-tree' }, BRANCHES.map((b) => h('div', { class: 'sk-branch' }, h('b', null, t(b.name)),
        ...SKILL_TREE.filter((x) => x.branch === b.id && x.tier <= 3).map((d) => {
          const on = owned.includes(d.id);
          const ok = on || canBuySkill(owned, left, d.id);
          return h('button', { type: 'button', class: `sk ${on ? 'on' : ''}`, disabled: !ok, title: fxText(d.values, d.attrs),
            onclick: () => { ch.skills = on ? owned.filter((x) => x !== d.id) : [...owned, d.id]; draw(); onChange(); } },
            h('span', null, `${t(d.name)} `, h('small', { class: 'muted' }, `(${d.cost})`)), h('small', { class: 'muted' }, fxText(d.values, d.attrs) || t(l('saúde +0,5/mês', 'health +0.5/month'))));
        })))),
    );
  };
  draw();
  return box;
}

export function characterCard(cfg: RunConfig): HTMLElement {
  const ch = (cfg.character ??= { name: '', age: 30, background: 'musician', career: 'musician', role: 'guitar', traits: [], style: 'mentor', visual: 'casual', pronoun: 'they', points: {}, sex: 'x', skills: [] });
  ch.traits ??= [];
  ch.points ??= {};
  ch.skills ??= [];
  ch.sex ??= 'x';
  const fake: { id: string; role: Role; look?: Appearance } = { id: 'player-new', role: ch.role ?? 'guitar', look: ch.look };
  const lookBox = h('div', { class: 'ng-look' });
  const drawLook = () => lookBox.replaceChildren(appearanceEditor(fake, (look) => { ch.look = look; fake.look = look; }, cfg.startYear, ch.sex));
  const roles: Role[] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings', 'dj', 'producer', 'mc'];
  const roleSel = select<Role>(ch.role ?? 'guitar', roles.map((r) => ({ value: r, label: t(ROLE_NAMES[r]) })), (v) => { ch.role = v; fake.role = v; drawLook(); });
  const pronounSel = select(ch.pronoun ?? 'they', PRONOUNS.map((p) => ({ value: p.id, label: t(p.name) })), (v) => (ch.pronoun = v));

  const preview = h('div', { class: 'cc-preview' });
  const drawPreview = () => {
    const a = deriveAttrs(ch);
    const left = FREE_POINTS - pointsUsed(ch);
    preview.replaceChildren(
      h('h4', null, ...hl(l('Atributos resultantes', 'Resulting attributes'), 'attrs'), ' ', h('small', { class: 'muted' }, t(l('pontos livres: {n}', 'free points: {n}'), { n: left }))),
      ...(Object.keys(ATTR_NAMES) as OwnerAttrId[]).map((k) => h('div', { class: 'cc-attr' },
        h('span', null, t(ATTR_NAMES[k])),
        h('button', { class: 'btn small ghost', type: 'button', disabled: (ch.points![k] ?? 0) <= 0, onclick: () => { ch.points![k] = (ch.points![k] ?? 0) - 1; drawPreview(); } }, '−'),
        h('span', { class: 'meter-bar' }, h('span', { style: `width:${a[k]}%` })),
        h('b', null, String(a[k])),
        h('button', { class: 'btn small ghost', type: 'button', disabled: left <= 0, onclick: () => { ch.points![k] = (ch.points![k] ?? 0) + 1; drawPreview(); } }, '+'))),
      (ch.traits ?? []).length ? h('div', { class: 'small' }, h('b', null, t(l('O que seus traços mudam:', 'What your traits change:'))),
        h('ul', null, (ch.traits ?? []).map((x) => h('li', null, h('b', null, t(playerTraitById[x]?.name)), ': ', traitFx(x) || t(playerTraitById[x]?.desc))))) : '',
    );
  };

  // trajetória profissional (rodada 9: uma lista só; rodada 13: lista suspensa + detalhe da escolhida)
  const careerBox = h('div', { class: 'cc-path' });
  const careerInfo = h('div', { class: 'cc-career' });
  const drawCareer = () => {
    const cur = originById[careerOfSpec(ch)];
    careerBox.replaceChildren(h('label', null, t(l('Trajetória', 'Path')), select<string>(cur.id, ORIGINS.map((o) => ({ value: o.id, label: t(o.name) })), (id) => {
      const o = originById[id as keyof typeof originById];
      ch.career = o.id; ch.background = o.bg; const r = backgroundById[o.bg].role; ch.role = r; fake.role = r; roleSel.value = r; drawCareer(); drawLook(); drawPreview();
    }, { class: 'cc-path-sel', 'aria-label': t(l('Trajetória profissional', 'Professional path')) })));
    const bg = backgroundById[cur.bg as BackgroundId];
    careerInfo.replaceChildren(
      h('h4', null, t(cur.name), ' ', h('small', { class: 'muted' }, t(cur.desc))),
      bg?.effects ? h('p', { class: 'small good' }, h('b', null, t(l('Base: ', 'Base: '))), t(bg.effects)) : '',
      h('p', { class: 'small' }, h('b', null, t(l('Contatos: ', 'Contacts: '))), t(cur.contacts)),
      h('p', { class: 'small' }, h('b', null, t(l('Vantagem: ', 'Advantage: '))), t(cur.advantages)),
      h('p', { class: 'small bad' }, h('b', null, t(l('Preço: ', 'Price: '))), t(cur.drawbacks)),
    );
  };

  const traitBox = traitPicker(ch, () => drawPreview());

  const beliefHint = h('small', { class: 'muted' });
  const drawBelief = () => beliefHint.replaceChildren(
    ch.politics ? `${t(POL_HINT[ch.politics as keyof typeof POL_HINT])} ` : '', ch.religion ? t(relById[ch.religion as keyof typeof relById].hint) : '',
    !ch.politics && !ch.religion ? t(l('Sem escolha, o mundo sorteia conforme sua cidade e época. Visões parecidas aproximam artistas, equipe e parceiros; opostas criam atrito.', 'Left blank, the world draws them from your city and era. Similar views bring artists, staff and partners closer; opposed ones create friction.')) : '');
  drawBelief();
  const polSel = select(ch.politics ?? '', [{ value: '', label: t(l('(sorteado)', '(drawn)')) }, ...POLS.map((p) => ({ value: p.id, label: t(polById[p.id].name) }))], (v) => { ch.politics = v || undefined; drawBelief(); });
  const relSel = select(ch.religion ?? '', [{ value: '', label: t(l('(sorteada)', '(drawn)')) }, ...RELS.map((r) => ({ value: r.id, label: t(r.name) }))], (v) => { ch.religion = v || undefined; drawBelief(); });

  const genres = GENRES.filter((g) => g.born <= cfg.startYear).sort((a, b) => t(a.name).localeCompare(t(b.name)));
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));

  drawLook(); drawPreview(); drawCareer();
  return h('section', { class: 'card wide' },
    h('h3', null, ...hl(l('Seu personagem', 'Your character'), 'character')),
    h('p', { class: 'muted small' }, t(l('Você é o dono do selo e também uma pessoa no mundo: pode namorar, casar, ter filhos, tocar, formar ou entrar numa banda (área Você, tecla V). Trajetória, traços, habilidades e visual definem seus atributos e bônus.', 'You own the label and are also a person in the world: date, marry, have children, play, form or join a band (You area, key V). Path, traits, abilities and look define your attributes and bonuses.'))),
    h('div', { class: 'ng-char' },
      h('div', null,
        h('label', null, ...hl(l('Nome', 'Name'), 'identity'), h('input', { type: 'text', value: ch.name, placeholder: t(l('(gerado)', '(generated)')), maxlength: 40, oninput: (e: Event) => (ch.name = (e.target as HTMLInputElement).value) })),
        h('div', { class: 'row wrap cc-row' },
          h('label', null, t(l('Sexo', 'Sex')), select<Sex>(ch.sex ?? 'x', SEXES.map((x) => ({ value: x.id, label: t(x.name) })), (v) => {
            ch.sex = v;
            if (v !== 'x') { ch.pronoun = v === 'm' ? 'he' : 'she'; pronounSel.value = ch.pronoun; }
            if (ch.look) { ch.look = fitLookToSex(ch.look, v); fake.look = ch.look; }
            drawLook();
          })),
          h('label', null, t(l('Pronome', 'Pronoun')), pronounSel),
          h('label', null, t(l('Apelido', 'Nickname')), h('input', { type: 'text', value: ch.nickname ?? '', maxlength: 24, placeholder: t(l('opcional', 'optional')), oninput: (e: Event) => (ch.nickname = (e.target as HTMLInputElement).value) })),
          h('label', null, t(l('Idade', 'Age')), h('input', { type: 'number', min: 18, max: 70, value: ch.age, oninput: (e: Event) => (ch.age = Math.max(18, Math.min(70, Number((e.target as HTMLInputElement).value) || 30))) })),
        ),
        h('div', { class: 'row wrap cc-row' },
          h('label', null, ...hl(l('Instrumento principal', 'Main instrument'), 'instrument'), roleSel),
          h('label', null, ...hl(l('Gênero do coração', 'Favourite genre'), 'favGenre'), select(ch.favGenre ?? '', [{ value: '', label: t(l('(nenhum)', '(none)')) }, ...genres.map((g) => ({ value: g.id, label: t(g.name) }))], (v) => (ch.favGenre = v || undefined))),
        ),
        h('div', { class: 'row wrap cc-row' },
          h('label', null, ...hl(l('Cidade natal', 'Hometown'), 'hometown'), select(ch.hometown ?? '', [{ value: '', label: t(l('(a cidade da sede)', '(the HQ city)')) }, ...cities.map((c) => ({ value: c.id, label: cityName(c.id) }))], (v) => (ch.hometown = v || undefined))),
          h('label', null, ...hl(l('Visual', 'Look'), 'visual'), select(ch.visual ?? 'casual', VISUALS.map((v) => ({ value: v.id, label: `${t(v.name)} — ${t(v.desc)}` })), (v) => { ch.visual = v; drawPreview(); })),
        ),
        h('div', { class: 'row wrap cc-row' }, h('label', null, ...hl(l('Visão política', 'Political view'), 'beliefs'), polSel), h('label', null, t(l('Religião', 'Religion')), relSel)),
        beliefHint,
        preview,
      ),
      h('div', null, h('small', { class: 'muted' }, t(l('Aparência', 'Appearance')), ' ', helpTip('look')), lookBox),
    ),
    h('h4', null, ...hl(l('Trajetória profissional', 'Professional path'), 'path')),
    h('p', { class: 'muted small' }, t(l('Como você chegou à indústria. Cada trajetória traz uma base (atributos, instrumento, patrimônio e bônus), contatos, vantagens e um preço. O estilo de liderança nasce depois, das suas decisões (área Identidade, tecla L).', 'How you got into the industry. Each path brings a base (attributes, instrument, wealth and bonuses), contacts, advantages and a price. Your leadership style emerges later from your decisions (Identity area, key L).'))),
    careerBox,
    careerInfo,
    h('h4', null, ...hl(l('Traços de personalidade', 'Personality traits'), 'traits')),
    h('p', { class: 'muted small' }, t(l('Escolha até 3. Em verde, o efeito em jogo; em vermelho, por que um traço está bloqueado. ✦ = dom hereditário.', 'Pick up to 3. Green shows the in-game effect; red shows why a trait is blocked. ✦ = inheritable gift.'))),
    traitBox,
    h('h4', null, ...hl(l('Habilidades iniciais e estilo de vida', 'Starting abilities and lifestyle'), 'skills')),
    h('p', { class: 'muted small' }, t(l('Distribua {n} pontos na árvore. Você ganha mais pontos a cada ano e em marcos da carreira (área Você → Habilidades). O estilo de vida não se escolhe: ele nasce de onde você investe.', 'Spend {n} points in the tree. You earn more each year and at career milestones (You → Abilities). Lifestyle is not picked: it comes from where you invest.'), { n: START_SKILL_POINTS })),
    skillPicker(ch, drawPreview),
  );
}
