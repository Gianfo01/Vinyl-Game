// Rodada 29 — "Seu personagem" na Nova run rápida e o seletor de funções (até 3 instrumentos) usado também pela ficha
// completa (charCreate identityCard22). Só apresentação: o modelo e os setters estão em char29model.ts e sim/char29data.ts.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { AGE29_MAX, AGE29_MIN, ROLES29, ROLES29_MAX, ROLE_FROM29, clampAge29, roleOpen29, rolesOpen29, type Role29 } from '../../sim/char29data';
import { h, select } from '../dom';
import { portraitCanvas } from '../pixel/avatar';
import { fitLookToSex, type Sex } from '../pixel/editor';
import { artDefaults29, bandName29, canAddRole29, charDefaults29, genresOpen29, isArtist29, lookFor29, refreshChar29, roleName29, toggleExtra29 } from './char29model';
import type { QuickRun27 } from './home27model';
import './char29.css';

export const SEXES29: { id: Sex; name: ReturnType<typeof l> }[] = [
  { id: 'f', name: l('Feminino', 'Female') }, { id: 'm', name: l('Masculino', 'Male') }, { id: 'x', name: l('Outro', 'Other') },
];

/** Seletor das funções extras (chips): a principal aparece marcada e fixa; no máximo 3 no total; fora da época, desligada. */
export function roleChips29(o: { year: () => number; main: () => string; extras: () => string[]; toggle: (r: string) => void; onChange?: () => void }): { el: HTMLElement; draw: () => void } {
  const hint = h('small', { class: 'c29-hint muted', 'aria-live': 'polite' });
  const box = h('div', { class: 'c29-chips', role: 'group', 'aria-label': t(l('Também toca ou canta', 'Also plays or sings')) });
  const btns = ROLES29.map((r) => h('button', { type: 'button', class: 'c29-chip', 'data-role': r, onclick: () => { o.toggle(r); draw(); o.onChange?.(); } }, t(roleName29(r))) as HTMLButtonElement);
  box.append(...btns);
  const draw = () => {
    const y = o.year(), main = o.main(), xs = o.extras();
    const full = !canAddRole29({ role: main, extra: xs });
    for (const b of btns) {
      const r = b.dataset.role!;
      const isMain = r === main, on = isMain || xs.includes(r), open = roleOpen29(r, y);
      b.classList.toggle('on', on);
      b.classList.toggle('main', isMain);
      b.setAttribute('aria-pressed', String(on));
      b.disabled = isMain || (!on && (!open || full));
      b.hidden = !open && !on;
      b.title = isMain ? t(l('Função principal (troque no campo acima)', 'Main role (change it in the field above)'))
        : !open ? t(l('Ainda não existe em {y}', 'Does not exist yet in {y}'), { y }) : !on && full ? t(l('Limite de {n} instrumentos', 'Limit of {n} instruments'), { n: ROLES29_MAX }) : '';
    }
    const closed = ROLES29.filter((r) => !roleOpen29(r, y)).map((r) => `${t(roleName29(r))} ${ROLE_FROM29[r as Role29]}`);
    hint.textContent = (full
      ? t(l('Limite de {n} instrumentos atingido: desmarque um para trocar.', 'Limit of {n} instruments reached: untick one to swap.'), { n: ROLES29_MAX })
      : t(l('Até {n} instrumentos no total (a principal e mais {m}). Quem marca Vocal ou MC canta: a banda não precisa de outro cantor.', 'Up to {n} instruments in total (the main one plus {m}). Ticking Vocals or MC means you sing: the band needs no other singer.'), { n: ROLES29_MAX, m: ROLES29_MAX - 1 }))
      + (closed.length ? ` ${t(l('Ainda não existem: {x}.', 'Not yet invented: {x}.'), { x: closed.join(', ') })}` : '');
  };
  draw();
  return { el: h('div', { class: 'c29-roles' }, box, hint), draw };
}

/** Bloco "Seu personagem" da Nova run rápida. `refresh` = depois de mudar atividade, ano, cidade ou situação. */
export function quickCharBlock29(q: QuickRun27, onChange: () => void): { el: HTMLElement; refresh: () => void } {
  const c = (q.char29 ??= charDefaults29(q));
  const art = () => (q.art29 ??= artDefaults29());
  const pic = h('span', { class: 'c29-pic', 'aria-hidden': 'true' });
  const drawPic = () => { try { pic.replaceChildren(portraitCanvas({ id: 'player-new', look: c.look, role: (q.art29?.role ?? 'guitar') as never }, q.startYear, 2)); } catch { /* sem canvas (testes) */ } };
  const nameIn = h('input', { type: 'text', id: 'c29-name', value: c.name, maxlength: 40, autocomplete: 'off', oninput: (e: Event) => { c.name = (e.target as HTMLInputElement).value; c.nameAuto = false; onChange(); } }) as HTMLInputElement;
  const ageIn = h('input', { type: 'number', id: 'c29-age', min: AGE29_MIN, max: AGE29_MAX, step: 1, value: c.age, inputmode: 'numeric',
    onchange: (e: Event) => { c.age = clampAge29(Number((e.target as HTMLInputElement).value)); c.ageAuto = false; ageIn.value = String(c.age); onChange(); } }) as HTMLInputElement;
  const reroll = h('button', { type: 'button', class: 'c29-dice', title: t(l('Sortear outro nome', 'Roll another name')), 'aria-label': t(l('Sortear outro nome', 'Roll another name')),
    onclick: () => { c.k = (c.k ?? 0) + 1; c.nameAuto = true; refreshChar29(q); nameIn.value = c.name; onChange(); } }, '🎲');
  const lookBtn = h('button', { type: 'button', class: 'c29-dice c29-look', title: t(l('Sortear outra aparência', 'Roll another look')), 'aria-label': t(l('Sortear outra aparência', 'Roll another look')),
    onclick: () => { c.lk = (c.lk ?? 0) + 1; c.look = lookFor29(q.seed, q.startYear, c.sex, c.lk); drawPic(); } }, '🎲');
  const sexSel = select<Sex>(c.sex, SEXES29.map((x) => ({ value: x.id, label: t(x.name) })), (v) => {
    c.sex = v; if (c.look) c.look = fitLookToSex(c.look, v);
    refreshChar29(q); nameIn.value = c.name; drawPic(); onChange();
  }, { id: 'c29-sex' });

  // ---- artista (só com banda própria)
  const artBox = h('div', { class: 'c29-art' });
  const roleSel = h('select', { id: 'c29-role' }) as HTMLSelectElement;
  roleSel.onchange = () => { const a = art(); a.role = roleSel.value; a.extra = a.extra.filter((x) => x !== a.role); chips.draw(); drawPic(); onChange(); };
  const chips = roleChips29({ year: () => q.startYear, main: () => art().role, extras: () => art().extra, toggle: (r) => toggleExtra29(art(), r, q.startYear), onChange });
  const genreSel = h('select', { id: 'c29-genre', onchange: () => { art().genre = genreSel.value; onChange(); } }) as HTMLSelectElement;
  const MEMBERS = [
    { value: '', label: t(l('Sorteada (1–4)', 'Random (1–4)')) }, { value: '1', label: t(l('Solo', 'Solo')) }, { value: '2', label: t(l('Dupla', 'Duo')) }, { value: '3', label: t(l('Trio', 'Trio')) },
    { value: '4', label: t(l('Banda de 4', '4-piece band')) }, { value: '5', label: t(l('Banda de 5', '5-piece band')) }, { value: '6', label: t(l('Banda de 6', '6-piece band')) },
  ];
  const bandIn = h('input', { type: 'text', id: 'c29-band', maxlength: 40, placeholder: t(l('(gerado)', '(generated)')), oninput: (e: Event) => { art().bandName = (e.target as HTMLInputElement).value; onChange(); } }) as HTMLInputElement;
  const bandDice = h('button', { type: 'button', class: 'c29-dice', title: t(l('Sortear nome de banda', 'Roll a band name')), 'aria-label': t(l('Sortear nome de banda', 'Roll a band name')),
    onclick: () => { const a = art(); bandK++; a.bandName = bandName29(q.seed, q.homeCity, a.genre ?? genreSel.value, a.members ?? 4, bandK); bandIn.value = a.bandName; onChange(); } }, '🎲');
  let bandK = 0;
  const bandField = h('label', { class: 'h27-field c29-bandname', for: 'c29-band' }, h('span', null, t(l('Nome da banda', 'Band name'))), h('div', { class: 'c29-inrow' }, bandIn, bandDice));
  const memSel = select<string>(q.art29?.members === undefined ? '' : String(q.art29.members), MEMBERS, (v) => { art().members = v === '' ? undefined : Number(v); drawBandName(); onChange(); }, { id: 'c29-members' });
  const drawBandName = () => { bandField.hidden = art().members === 1; };
  artBox.append(
    h('div', { class: 'h27-2' },
      h('label', { class: 'h27-field', for: 'c29-role' }, h('span', null, t(l('Função principal', 'Main role'))), roleSel),
      h('label', { class: 'h27-field', for: 'c29-genre' }, h('span', null, t(l('Gênero da banda', 'Band genre'))), genreSel)),
    h('div', { class: 'h27-field' }, h('span', null, t(l('Também toca ou canta', 'Also plays or sings'))), chips.el),
    h('div', { class: 'h27-2' },
      h('label', { class: 'h27-field', for: 'c29-members' }, h('span', null, t(l('Solo ou banda', 'Solo or band'))), memSel),
      bandField),
    h('small', { class: 'muted c29-note' }, t(l('Os outros integrantes são gerados para completar as funções que faltam.', 'The other members are generated to fill the missing roles.'))));

  const drawArt = () => {
    const on = isArtist29(q.career);
    artBox.hidden = !on;
    if (!on) return;
    const a = art();
    const open = rolesOpen29(q.startYear);
    if (!open.includes(a.role as Role29)) a.role = 'vocal';
    roleSel.replaceChildren(...open.map((r) => h('option', { value: r, selected: r === a.role }, t(roleName29(r)))));
    roleSel.value = a.role;
    toggleExtra29(a, a.role, q.startYear); // normaliza (época, repetição, limite) sem mudar nada
    const gs = genresOpen29(q.startYear);
    if (a.genre && !gs.some((g) => g.id === a.genre)) a.genre = undefined;
    genreSel.replaceChildren(...gs.map((g) => h('option', { value: g.id, selected: g.id === (a.genre ?? gs[0]?.id) }, t(g.name))));
    bandIn.value = a.bandName;
    drawBandName();
    chips.draw();
  };
  const small = (() => { try { return window.matchMedia?.('(max-width: 760px)').matches ?? false; } catch { return false; } })();
  const more = h('details', { class: 'c29-more', ...(small ? {} : { open: true }) },
    h('summary', null, h('b', null, t(l('Personagem', 'Character'))), ' ▾ ', h('small', { class: 'muted' }, t(l('sexo, aparência e, para artistas, instrumentos e banda', 'sex, looks and, for artists, instruments and band')))),
    h('div', { class: 'h27-2' },
      h('label', { class: 'h27-field', for: 'c29-sex' }, h('span', null, t(l('Sexo', 'Sex'))), sexSel),
      h('div', { class: 'h27-field' }, h('span', null, t(l('Aparência', 'Looks'))), h('div', { class: 'c29-inrow' }, lookBtn, h('small', { class: 'muted' }, t(l('a mesma do retrato ao lado', 'the one in the portrait')))))),
    artBox);
  const el = h('section', { class: 'c29', 'aria-label': t(l('Seu personagem', 'Your character')) },
    h('p', { class: 'c29-title' }, t(l('Seu personagem', 'Your character'))),
    h('div', { class: 'c29-head' },
      h('div', { class: 'c29-picbox' }, pic),
      h('label', { class: 'h27-field c29-name', for: 'c29-name' }, h('span', null, t(l('Nome', 'Name'))), h('div', { class: 'c29-inrow' }, nameIn, reroll)),
      h('label', { class: 'h27-field c29-age', for: 'c29-age' }, h('span', null, t(l('Idade', 'Age'))), ageIn)),
    more);
  const refresh = () => {
    refreshChar29(q);
    nameIn.value = c.name;
    ageIn.value = String(c.age);
    drawArt();
    drawPic();
  };
  refresh();
  return { el, refresh };
}
