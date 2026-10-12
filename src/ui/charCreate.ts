// Ficha de criação do personagem (rodadas 5, 6 e 9; r22: em cartões separados na etapa Personagem):
// "Seu personagem" (identidade, trajetória, vida pessoal, crenças e aparência), "Traços de personalidade" e o
// distribuidor de pontos livres dos atributos (o cartão Atributos junta isso ao que o passado soma e à prévia).
// r22: sem pronome escolhido (sai do sexo) e sem árvore de habilidades (saiu do jogo).

import { CITIES, GENRES, l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { backgroundById, type BackgroundId } from '../sim/sys/life/data';
import { FREE_POINTS, VISUALS, playerTraitById, type OwnerAttrId } from '../sim/sys/persona/data';
import { careerOfSpec, deriveAttrs, pointsUsed } from '../sim/sys/persona';
import { ORIGINS, originById } from '../sim/sys/identity/data';
import { defaultCharacter20 } from '../sim/past20';
import { POLS, POL_HINT, RELS, polById, relById } from '../sim/beliefs';
import { ROLE_NAMES, type Role } from '../sim/sys/talent/attrs';
import type { Appearance, CharacterSpec, RunConfig } from '../sim/types';
import { cityName } from './common';
import { h, select } from './dom';
import { appearanceEditor, fitLookToSex, type Sex } from './pixel/editor';
import { helpTip, hl, traitFx, traitPicker } from './newgame13';

/** Rodada 17: orientação, armário, filhos e estado civil no começo do jogo (efeitos explicados ao lado). */
export function lifeRow17(ch: CharacterSpec): HTMLElement {
  const hint = h('small', { class: 'muted' });
  const draw = () => hint.replaceChildren(t((ch.orient === 'gay' || ch.orient === 'bi')
    ? (ch.closet ? l('No armário: mais estresse e risco de exposição (pior em países e épocas hostis); casamento de fachada possível. Você pode sair do armário quando quiser (aba Coração).', 'In the closet: more stress and an outing risk (worse in hostile countries and eras); lavender marriage possible. You can come out any time (Heart tab).')
      : l('Assumido(a): artistas LGBT confiam mais em você; religiosos estritos, menos. Antes do casamento igualitário no país, a união é simbólica (sem partilha nem herança garantida).', 'Out: LGBT artists trust you more; strict religious ones less. Before marriage equality in the country, a union is symbolic (no split nor guaranteed inheritance).'))
    : l('Filhos começam com idades até a sua menos 18; casado(a) traz o par; divorciado(a) começa pagando pensão dos filhos; viúvo(a) começa de luto.', 'Children start aged up to your age minus 18; married brings a partner; divorced starts paying child support; widowed starts in mourning.')));
  draw();
  return h('div', null, h('div', { class: 'row wrap cc-row' },
    h('label', null, t(l('Orientação', 'Orientation')), select(ch.orient ?? 'het', [{ value: 'het', label: t(l('Heterossexual', 'Heterosexual')) }, { value: 'gay', label: t(l('Gay / lésbica', 'Gay / lesbian')) }, { value: 'bi', label: t(l('Bissexual', 'Bisexual')) }, { value: 'ace', label: t(l('Assexual', 'Asexual')) }], (v) => { ch.orient = v as CharacterSpec['orient']; draw(); })),
    h('label', null, t(l('Vida pública', 'Public life')), select(ch.closet ? 'closet' : 'out', [{ value: 'out', label: t(l('Assumida', 'Out')) }, { value: 'closet', label: t(l('No armário', 'In the closet')) }], (v) => { ch.closet = v === 'closet'; draw(); })),
    h('label', null, t(l('Estado civil', 'Marital status')), select(ch.marital ?? 'single', [{ value: 'single', label: t(l('Solteiro(a)', 'Single')) }, { value: 'married', label: t(l('Casado(a)', 'Married')) }, { value: 'divorced', label: t(l('Divorciado(a)', 'Divorced')) }, { value: 'widowed', label: t(l('Viúvo(a)', 'Widowed')) }], (v) => { ch.marital = v as CharacterSpec['marital']; draw(); })),
    h('label', null, t(l('Filhos', 'Children')), h('input', { type: 'number', min: 0, max: 4, value: ch.kids ?? 0, oninput: (e: Event) => { ch.kids = Math.max(0, Math.min(4, Number((e.target as HTMLInputElement).value) || 0)); } })),
  ), hint);
}

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

const pronounOf = (sex: Sex): CharacterSpec['pronoun'] => (sex === 'm' ? 'he' : sex === 'f' ? 'she' : 'they');

/** r22: cartão "Seu personagem" — identidade, trajetória (com o que dá e o que custa), vida pessoal, crenças e aparência. */
export function identityCard22(cfg: RunConfig, onChange: () => void): HTMLElement {
  const ch = (cfg.character ??= defaultCharacter20());
  ch.traits ??= [];
  ch.points ??= {};
  ch.sex ??= 'x';
  ch.pronoun = pronounOf(ch.sex);
  const fake: { id: string; role: Role; look?: Appearance } = { id: 'player-new', role: ch.role ?? 'guitar', look: ch.look };
  const lookBox = h('div', { class: 'ng-look' });
  const drawLook = () => lookBox.replaceChildren(appearanceEditor(fake, (look) => { ch.look = look; fake.look = look; }, cfg.startYear, ch.sex));
  const roles: Role[] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings', 'dj', 'producer', 'mc'];
  const roleSel = select<Role>(ch.role ?? 'guitar', roles.map((r) => ({ value: r, label: t(ROLE_NAMES[r]) })), (v) => { ch.role = v; fake.role = v; drawLook(); });
  const pathInfo = h('div', { class: 'ng22-path-info small' });
  const drawPath = () => {
    const cur = originById[careerOfSpec(ch)];
    const bg = backgroundById[cur.bg as BackgroundId];
    pathInfo.replaceChildren(
      h('p', { class: 'muted' }, t(cur.desc)),
      bg?.effects ? h('p', { class: 'good' }, h('b', null, t(l('Base: ', 'Base: '))), t(bg.effects)) : '',
      h('p', null, h('b', null, t(l('Contatos: ', 'Contacts: '))), t(cur.contacts)),
      h('p', null, h('b', null, t(l('Vantagem: ', 'Advantage: '))), t(cur.advantages)),
      h('p', { class: 'bad' }, h('b', null, t(l('Preço: ', 'Price: '))), t(cur.drawbacks)));
  };
  const pathSel = select<string>(careerOfSpec(ch), ORIGINS.map((o) => ({ value: o.id, label: t(o.name) })), (id) => {
    const o = originById[id as keyof typeof originById];
    ch.career = o.id; ch.background = o.bg; const r = backgroundById[o.bg].role; ch.role = r; fake.role = r; roleSel.value = r;
    drawPath(); drawLook(); onChange();
  }, { class: 'cc-path-sel', 'aria-label': t(l('Trajetória profissional', 'Professional path')) });

  const beliefHint = h('small', { class: 'muted' });
  const drawBelief = () => beliefHint.replaceChildren(
    ch.politics ? `${t(POL_HINT[ch.politics as keyof typeof POL_HINT])} ` : '', ch.religion ? t(relById[ch.religion as keyof typeof relById].hint) : '',
    !ch.politics && !ch.religion ? t(l('Sem escolha, o mundo sorteia conforme sua cidade e época. Visões parecidas aproximam artistas, equipe e parceiros; opostas criam atrito.', 'Left blank, the world draws them from your city and era. Similar views bring artists, staff and partners closer; opposed ones create friction.')) : '');
  drawBelief();
  const polSel = select(ch.politics ?? '', [{ value: '', label: t(l('(sorteado)', '(drawn)')) }, ...POLS.map((p) => ({ value: p.id, label: t(polById[p.id].name) }))], (v) => { ch.politics = v || undefined; drawBelief(); });
  const relSel = select(ch.religion ?? '', [{ value: '', label: t(l('(sorteada)', '(drawn)')) }, ...RELS.map((r) => ({ value: r.id, label: t(r.name) }))], (v) => { ch.religion = v || undefined; drawBelief(); });
  const genres = GENRES.filter((g) => g.born <= cfg.startYear).sort((a, b) => t(a.name).localeCompare(t(b.name)));
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
  drawLook(); drawPath();
  const grp = (title: L, ...xs: (HTMLElement | string)[]) => h('fieldset', { class: 'ng22-grp' }, h('legend', null, t(title)), ...xs);
  return h('section', { class: 'card wide ng22-you' },
    h('h3', null, ...hl(l('Seu personagem', 'Your character'), 'character')),
    h('p', { class: 'muted small' }, t(l('Você é o dono do negócio e também uma pessoa no mundo: pode namorar, casar, ter filhos, tocar e formar uma banda. Tudo aqui é opcional; o que ficar em branco é sorteado.', 'You own the business and are also a person in the world: date, marry, have children, play and form a band. Everything here is optional; blanks are drawn.'))),
    h('div', { class: 'ng22-you-grid' },
      h('div', { class: 'ng22-you-main' },
        grp(l('Identidade', 'Identity'),
          h('div', { class: 'ng22-row' },
            h('label', { class: 'ng22-grow' }, ...hl(l('Nome', 'Name'), 'identity'), h('input', { type: 'text', value: ch.name, placeholder: t(l('(gerado)', '(generated)')), maxlength: 40, oninput: (e: Event) => (ch.name = (e.target as HTMLInputElement).value) })),
            h('label', null, t(l('Apelido', 'Nickname')), h('input', { type: 'text', value: ch.nickname ?? '', maxlength: 24, placeholder: t(l('opcional', 'optional')), oninput: (e: Event) => (ch.nickname = (e.target as HTMLInputElement).value) }))),
          h('div', { class: 'ng22-row' },
            h('label', null, t(l('Sexo', 'Sex')), select<Sex>(ch.sex ?? 'x', SEXES.map((x) => ({ value: x.id, label: t(x.name) })), (v) => {
              ch.sex = v; ch.pronoun = pronounOf(v);
              if (ch.look) { ch.look = fitLookToSex(ch.look, v); fake.look = ch.look; }
              drawLook();
            })),
            h('label', null, t(l('Idade', 'Age')), h('input', { type: 'number', min: 18, max: 70, value: ch.age, oninput: (e: Event) => (ch.age = Math.max(18, Math.min(70, Number((e.target as HTMLInputElement).value) || 30))) })),
            h('label', null, ...hl(l('Cidade natal', 'Hometown'), 'hometown'), select(ch.hometown ?? '', [{ value: '', label: t(l('(a cidade da sede)', '(the HQ city)')) }, ...cities.map((c) => ({ value: c.id, label: cityName(c.id) }))], (v) => (ch.hometown = v || undefined))))),
        grp(l('Trajetória — como você entrou na indústria', 'Path — how you got into the industry'),
          h('div', { class: 'ng22-row' }, h('label', { class: 'ng22-grow' }, ...hl(l('Trajetória', 'Path'), 'path'), pathSel)),
          pathInfo),
        grp(l('Música e estilo', 'Music and style'),
          h('div', { class: 'ng22-row' },
            h('label', null, ...hl(l('Instrumento principal', 'Main instrument'), 'instrument'), roleSel),
            h('label', null, ...hl(l('Gênero do coração', 'Favourite genre'), 'favGenre'), select(ch.favGenre ?? '', [{ value: '', label: t(l('(nenhum)', '(none)')) }, ...genres.map((g) => ({ value: g.id, label: t(g.name) }))], (v) => (ch.favGenre = v || undefined))),
            h('label', null, ...hl(l('Visual', 'Look'), 'visual'), select(ch.visual ?? 'casual', VISUALS.map((v) => ({ value: v.id, label: `${t(v.name)} — ${t(v.desc)}` })), (v) => { ch.visual = v; onChange(); })))),
        grp(l('Vida pessoal e crenças', 'Personal life and beliefs'),
          lifeRow17(ch),
          h('div', { class: 'ng22-row' }, h('label', null, ...hl(l('Visão política', 'Political view'), 'beliefs'), polSel), h('label', null, t(l('Religião', 'Religion')), relSel)),
          beliefHint)),
      h('div', { class: 'ng22-you-look' }, h('b', { class: 'small' }, t(l('Aparência', 'Appearance')), ' ', helpTip('look')), lookBox)),
  );
}

/** r22: cartão "Traços de personalidade". */
export function traitsCard22(cfg: RunConfig, onChange: () => void): HTMLElement {
  const ch = (cfg.character ??= defaultCharacter20());
  ch.traits ??= [];
  return h('section', { class: 'card wide' },
    h('h3', null, ...hl(l('Traços de personalidade', 'Personality traits'), 'traits')),
    h('p', { class: 'muted small' }, t(l('Escolha até 3. Em verde, o efeito em jogo; em vermelho, por que um traço está bloqueado. ✦ = dom hereditário.', 'Pick up to 3. Green shows the in-game effect; red shows why a trait is blocked. ✦ = inheritable gift.'))),
    traitPicker(ch, onChange));
}

/** r22: distribuidor dos pontos livres (parte do cartão Atributos). */
export function attrAlloc22(cfg: RunConfig, onChange: () => void): { el: HTMLElement; draw: () => void } {
  const el = h('div', { class: 'ng22-alloc' });
  const draw = () => {
    const ch = (cfg.character ??= defaultCharacter20());
    ch.points ??= {};
    const a = deriveAttrs(ch);
    const left = FREE_POINTS - pointsUsed(ch);
    el.replaceChildren(
      h('div', { class: 'ng22-free' }, h('span', null, t(l('Pontos livres', 'Free points'))), h('b', { class: left ? '' : 'muted' }, `${left}/${FREE_POINTS}`)),
      ...(Object.keys(ATTR_NAMES) as OwnerAttrId[]).map((k) => h('div', { class: 'cc-attr ng22-attr' },
        h('span', null, t(ATTR_NAMES[k]), (ch.points![k] ?? 0) ? h('small', { class: 'good' }, ` +${ch.points![k]}`) : null),
        h('button', { class: 'btn small ghost', type: 'button', 'aria-label': `− ${t(ATTR_NAMES[k])}`, disabled: (ch.points![k] ?? 0) <= 0, onclick: () => { ch.points![k] = (ch.points![k] ?? 0) - 1; draw(); onChange(); } }, '−'),
        h('span', { class: 'meter-bar' }, h('span', { style: `width:${a[k]}%` })),
        h('b', null, String(a[k])),
        h('button', { class: 'btn small ghost', type: 'button', 'aria-label': `+ ${t(ATTR_NAMES[k])}`, disabled: left <= 0, onclick: () => { ch.points![k] = (ch.points![k] ?? 0) + 1; draw(); onChange(); } }, '+'))),
      (ch.traits ?? []).length ? h('div', { class: 'small' }, h('b', null, t(l('O que seus traços mudam:', 'What your traits change:'))),
        h('ul', null, (ch.traits ?? []).map((x) => h('li', null, h('b', null, t(playerTraitById[x]?.name)), ': ', traitFx(x) || t(playerTraitById[x]?.desc))))) : '');
  };
  draw();
  return { el, draw };
}
