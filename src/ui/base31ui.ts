// R31 · onda 1 (EDT) — EDITOR DE BASE na tela inicial (estilo pré-editor do Football Manager).
// Bases salvas neste navegador (localStorage, com try/catch): criar, editar (artistas e bandas, gravadoras, cidades,
// relíquias), validar, juntar várias, exportar/importar como arquivo .json ou como código "M31B1:…", e escolher a base
// da próxima partida (`attachBase31` no launchRun27 grava `config.base31`). O modelo e a validação ficam em
// sim/r31/base31.ts; aqui só a tela. Sem janelas do navegador: confirmações e mensagens ficam na própria página.

import { CITIES, GENRES, l, type L } from '../data/world';
import { t } from '../i18n/strings';
import {
  baseCode31, baseJson31, cleanBase31, emptyBase31, importBase31, mergeBases31, nextActNo31, origActs31, origCity31, origLabels31, origRelics31,
  resolvedActs31, resolvedLabels31, resolvedRelics31, summarizeBase31, validateBase31, type BaseData31,
} from '../sim/r31/base31';
import { RELIC_KIND } from '../sim/sys/relics9';
import type { RunConfig } from '../sim/types';
import { toast } from './common';
import { h } from './dom';
import { copyText } from './store';
import './editor31.css';

const LIST_KEY = 'masters31.bases';
const SEL_KEY = 'masters31.baseSel';

export interface SavedBase31 { name: string; data: BaseData31; at: number }
export function savedBases31(): SavedBase31[] {
  // o que está no navegador também é entrada não confiável: só bases que passam pela limpeza (cópia canônica)
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LIST_KEY) ?? '[]');
    if (!Array.isArray(v)) return [];
    const out: SavedBase31[] = [];
    for (const x of v as { name?: unknown; data?: unknown; at?: unknown }[]) {
      if (!x || typeof x.name !== 'string' || !x.name) continue;
      const cl = cleanBase31(x.data), c = cl.errors.length ? undefined : cl.base;
      if (c) out.push({ name: x.name, data: c, at: typeof x.at === 'number' ? x.at : 0 });
    }
    return out;
  } catch { return []; }
}
function storeBases(list: SavedBase31[]): boolean { try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); return true; } catch { return false; } }
export function selectedBase31(): SavedBase31 | undefined { try { const n = localStorage.getItem(SEL_KEY); return n ? savedBases31().find((b) => b.name === n) : undefined; } catch { return undefined; } }
function select31(name: string | null): void { try { if (name) localStorage.setItem(SEL_KEY, name); else localStorage.removeItem(SEL_KEY); } catch { /* sem armazenamento */ } }
function saveBase(b: BaseData31): boolean {
  const list = savedBases31().filter((x) => x.name !== b.name);
  list.push({ name: b.name, data: b, at: Date.now() });
  return storeBases(list);
}

/** Nova partida: grava a base escolhida (se houver e for válida) na configuração. */
export function attachBase31(cfg: RunConfig): void {
  const b = selectedBase31();
  if (b && validateBase31(b.data).ok) cfg.base31 = { name: b.name, data: JSON.parse(JSON.stringify(b.data)) as BaseData31 };
  else delete cfg.base31;
}
/** Texto curto para a tela inicial ("Base: X"). */
export const baseLabel31 = (): string => { const b = selectedBase31(); return b ? t(l(`Base: ${b.name}`, `Database: ${b.name}`)) : t(l('Base original', 'Original database')); };

function download(name: string, text: string): void {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = h('a', { href: url, download: name }) as HTMLAnchorElement;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { toast(t(l('Download bloqueado: use "Copiar código".', 'Download blocked: use "Copy code".')), 'bad'); }
}
const fileName = (n: string) => `base-${n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'masters'}.json`;
const errBox = (errors: L[]): HTMLElement | null => (errors.length ? h('div', { class: 'b31-errors', role: 'alert' }, h('b', null, t(l('Corrija antes de salvar:', 'Fix before saving:'))), h('ul', null, errors.slice(0, 30).map((e) => h('li', null, t(e)))), errors.length > 30 ? h('small', null, `+${errors.length - 30}`) : null) : null);

// ---------------------------------------------------------------- tela principal

export function baseEditorScreen31(root: HTMLElement, back: () => void): void {
  const redraw = () => baseEditorScreen31(root, back);
  const list = savedBases31();
  const sel = selectedBase31();
  const msg = h('div', { class: 'b31-msg', 'aria-live': 'polite' });
  const say = (x: L | HTMLElement, bad = false) => msg.replaceChildren(x instanceof HTMLElement ? x : h('p', { class: bad ? 'bad' : 'good' }, t(x)));

  // nova base
  const newName = h('input', { type: 'text', placeholder: t(l('Nome da base (ex.: Brasil anos 80 turbinado)', 'Database name (e.g. Brazil 80s boosted)')), 'aria-label': t(l('Nome da nova base', 'New database name')) }) as HTMLInputElement;
  const create = () => {
    const n = newName.value.trim();
    if (!n) return say(l('Dê um nome à base.', 'Name the database.'), true);
    if (list.some((b) => b.name === n)) return say(l('Já existe uma base com esse nome.', 'A database with that name already exists.'), true);
    saveBase(emptyBase31(n));
    baseEdit31(root, emptyBase31(n), redraw);
  };

  // juntar
  const pick = new Set<string>();
  const mergeName = h('input', { type: 'text', placeholder: t(l('Nome da base juntada', 'Merged database name')), 'aria-label': t(l('Nome da base juntada', 'Merged database name')) }) as HTMLInputElement;
  const merge = () => {
    const chosen = list.filter((b) => pick.has(b.name));
    const n = mergeName.value.trim();
    if (chosen.length < 2) return say(l('Marque pelo menos duas bases para juntar (a de baixo ganha quando as duas mudam a mesma coisa).', 'Tick at least two databases to merge (the lower one wins when both change the same thing).'), true);
    if (!n) return say(l('Dê um nome à base juntada.', 'Name the merged database.'), true);
    const m = mergeBases31(n, ...chosen.map((b) => b.data));
    const chk = validateBase31(m);
    if (!chk.ok) return say(errBox(chk.errors)!);
    saveBase(m); redraw();
  };

  // importar (código colado ou arquivo .json)
  const paste = h('textarea', { rows: 3, placeholder: t(l('Cole aqui um código M31B1:… ou o conteúdo de um arquivo .json de base', 'Paste an M31B1:… code or a database .json file here')), 'aria-label': t(l('Importar base', 'Import database')) }) as HTMLTextAreaElement;
  const preview = h('div', { class: 'b31-preview' });
  const read = (text: string) => {
    let r: ReturnType<typeof importBase31>;
    try { r = importBase31(text); } catch { r = { ok: false, errors: [l('A base não pôde ser lida (formato inesperado).', 'The database could not be read (unexpected format).')] }; }
    if (!r.ok) { preview.replaceChildren(errBox(r.errors) ?? h('span')); return; }
    const b = r.base!;
    const exists = list.some((x) => x.name === b.name);
    preview.replaceChildren(h('div', { class: 'card' },
      h('b', null, b.name), h('p', { class: 'small' }, t(r.summary!)),
      exists ? h('p', { class: 'small muted' }, t(l('Já existe uma base com esse nome: salvar substitui.', 'A database with that name already exists: saving replaces it.'))) : null,
      h('button', { type: 'button', class: 'btn primary small', onclick: () => { saveBase(b); redraw(); } }, t(l('Salvar esta base', 'Save this database')))));
  };
  const file = h('input', { type: 'file', accept: '.json,application/json,text/plain', 'aria-label': t(l('Importar arquivo de base', 'Import database file')),
    onchange: async (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) read(await f.text()); } }) as HTMLInputElement;

  const row = (b: SavedBase31) => {
    const chk = validateBase31(b.data);
    const code = h('textarea', { rows: 2, readonly: true, hidden: true, class: 'b31-code', 'aria-label': t(l('Código da base', 'Database code')) }) as HTMLTextAreaElement;
    const delBox = h('span');
    return h('li', { class: `b31-item ${sel?.name === b.name ? 'on' : ''}` },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) pick.add(b.name); else pick.delete(b.name); } }), ' ', h('b', null, b.name)),
      h('small', null, t(summarizeBase31(b.data))),
      chk.ok ? null : h('small', { class: 'bad' }, t(l('Base com erros: abra para corrigir.', 'Database has errors: open it to fix.'))),
      h('div', { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn small', onclick: () => baseEdit31(root, JSON.parse(JSON.stringify(b.data)) as BaseData31, redraw) }, t(l('Editar', 'Edit'))),
        sel?.name === b.name
          ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => { select31(null); redraw(); } }, t(l('Voltar à base original', 'Back to the original database')))
          : h('button', { type: 'button', class: 'btn small primary', disabled: !chk.ok, onclick: () => { select31(b.name); redraw(); } }, t(l('Usar na próxima partida', 'Use in the next game'))),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => download(fileName(b.name), baseJson31(b.data)) }, t(l('Baixar arquivo', 'Download file'))),
        h('button', { type: 'button', class: 'btn small ghost', onclick: async () => { const c = baseCode31(b.data); code.value = c; code.hidden = false; const ok = await copyText(c); if (!ok) { code.focus(); code.select(); } toast(t(ok ? l('Código copiado.', 'Code copied.') : l('Selecionei o código: use Ctrl+C.', 'Code selected: press Ctrl+C.')), 'good'); } }, t(l('Copiar código', 'Copy code'))),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => { const n = `${b.name} (cópia)`; saveBase({ ...JSON.parse(JSON.stringify(b.data)), name: n }); redraw(); } }, t(l('Duplicar', 'Duplicate'))),
        h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => delBox.replaceChildren(
          h('span', { class: 'small' }, t(l('Apagar mesmo? ', 'Really delete? '))),
          h('button', { type: 'button', class: 'btn small danger', onclick: () => { storeBases(savedBases31().filter((x) => x.name !== b.name)); if (sel?.name === b.name) select31(null); redraw(); } }, t(l('Apagar', 'Delete'))),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => delBox.replaceChildren() }, t(l('Cancelar', 'Cancel')))) }, t(l('Apagar', 'Delete'))),
        delBox),
      code);
  };

  root.replaceChildren(h('div', { class: 'b31 page', id: 'main', role: 'main', tabindex: '-1' },
    h('header', { class: 'row' },
      h('button', { type: 'button', class: 'btn ghost', onclick: back }, '← ', t(l('Voltar', 'Back'))),
      h('h1', null, t(l('Editor de base', 'Database editor')))),
    h('p', { class: 'muted' }, t(l('Mude artistas e bandas, gravadoras, cidades e relíquias antes de começar. Cada base guarda só as diferenças da base original; a mesma base com a mesma semente dá a mesma partida. Partidas com base editada ficam marcadas e não contam para conquistas.', 'Change acts, labels, cities and relics before you start. Each database keeps only the differences from the original; the same database with the same seed gives the same game. Games with an edited database are flagged and do not count for achievements.'))),
    h('p', null, h('b', null, t(l('Próxima partida: ', 'Next game: '))), sel ? sel.name : t(l('base original', 'original database'))),
    msg,
    h('section', { class: 'card' }, h('h3', null, t(l('Suas bases', 'Your databases'))),
      list.length ? h('ul', { class: 'b31-list' }, list.map(row)) : h('p', { class: 'muted' }, t(l('Nenhuma base salva ainda.', 'No saved databases yet.'))),
      list.length >= 2 ? h('div', { class: 'row wrap' }, mergeName, h('button', { type: 'button', class: 'btn small', onclick: merge }, t(l('Juntar as marcadas', 'Merge the ticked ones')))) : null),
    h('section', { class: 'card' }, h('h3', null, t(l('Nova base', 'New database'))), h('div', { class: 'row wrap' }, newName, h('button', { type: 'button', class: 'btn primary small', onclick: create }, t(l('Criar e editar', 'Create and edit'))))),
    h('section', { class: 'card' }, h('h3', null, t(l('Importar', 'Import'))),
      h('p', { class: 'small muted' }, t(l('Antes de salvar você vê o resumo do que muda; base com erro é recusada com o motivo.', 'Before saving you see a summary of the changes; a database with errors is refused with the reason.'))),
      paste, h('div', { class: 'row wrap' }, h('button', { type: 'button', class: 'btn small', onclick: () => read(paste.value) }, t(l('Ler código colado', 'Read pasted code'))), file), preview)));
}

// ---------------------------------------------------------------- edição de uma base

type Part = 'acts' | 'labels' | 'cities' | 'relics';
const PARTS: { id: Part; label: L }[] = [
  { id: 'acts', label: l('Artistas e bandas', 'Acts and bands') }, { id: 'labels', label: l('Gravadoras', 'Labels') },
  { id: 'cities', label: l('Cidades', 'Cities') }, { id: 'relics', label: l('Relíquias', 'Relics') },
];
const ED = { part: 'acts' as Part, q: '' };

/** Diferença (só os campos mudados) entre o registro editado e o original; vazio = sem mudança. */
function diff<T extends object>(orig: T | undefined, cur: Partial<T>, keys: (keyof T)[]): Partial<T> | null {
  const out: Partial<T> = {};
  for (const k of keys) if (!orig || JSON.stringify(orig[k]) !== JSON.stringify(cur[k])) out[k] = cur[k];
  return Object.keys(out).length ? out : null;
}

export function baseEdit31(root: HTMLElement, b: BaseData31, back: () => void): void {
  const redraw = () => baseEdit31(root, b, back);
  const msg = h('div', { class: 'b31-msg', 'aria-live': 'polite' });
  const field = (lab: L, el: HTMLElement) => h('label', { class: 'b31-f' }, h('span', null, t(lab)), el);
  const txt = (v: unknown) => h('input', { type: 'text', value: String(v ?? '') }) as HTMLInputElement;
  const num = (v: unknown) => h('input', { type: 'number', value: String(v ?? '') }) as HTMLInputElement;
  const pickOf = (v: string, opts: { value: string; label: string }[]) => h('select', null, opts.map((o) => h('option', { value: o.value, selected: o.value === v }, o.label))) as HTMLSelectElement;
  const genreOpts = GENRES.map((g) => ({ value: g.id, label: `${t(g.name)} (${g.born})` }));
  const cityOpts = CITIES.map((c) => ({ value: c.id, label: t(c.name) }));
  const match = (s: string) => !ED.q.trim() || s.toLowerCase().includes(ED.q.trim().toLowerCase());
  const first = <T extends { edited?: boolean; added?: boolean }>(xs: T[]): T[] => [...xs.filter((x) => x.added), ...xs.filter((x) => x.edited && !x.added), ...xs.filter((x) => !x.added && !x.edited)];
  const tag = (x: { edited?: boolean; added?: boolean }) => (x.added ? h('span', { class: 'pill good' }, t(l('nova', 'new'))) : x.edited ? h('span', { class: 'pill' }, t(l('mudada', 'changed'))) : null);
  const rmBtn = (rec: Record<string, unknown>, k: string, isOrig: boolean) => h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { if (isOrig) rec[k] = null; else delete rec[k]; redraw(); } }, t(isOrig ? l('Remover', 'Remove') : l('Descartar', 'Discard')));
  const resetBtn = (rec: Record<string, unknown>, k: string) => (k in rec ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => { delete rec[k]; redraw(); } }, t(l('Restaurar original', 'Restore original'))) : null);

  let body: HTMLElement[] = [];
  if (ED.part === 'acts') {
    const origs = new Map(origActs31().map((a) => [String(a.no), a]));
    const removed = Object.entries(b.acts).filter(([, p]) => p === null).map(([k]) => origs.get(k)).filter((x) => !!x);
    body = first(resolvedActs31(b)).filter((a) => match(`${a.name} ${a.city} ${a.genre}`)).slice(0, 40).map((a) => {
      const k = String(a.no);
      const f = { name: txt(a.name), genre: pickOf(a.genre, genreOpts), city: pickOf(a.city, cityOpts), debut: num(a.debut), members: num(a.members) };
      return h('div', { class: 'b31-rec' }, h('b', null, a.name || `nº ${a.no}`, ' ', tag(a)),
        h('div', { class: 'row wrap' }, field(l('Nome', 'Name'), f.name), field(l('Gênero', 'Genre'), f.genre), field(l('Cidade', 'City'), f.city), field(l('Estreia', 'Debut'), f.debut), field(l('Integrantes', 'Members'), f.members)),
        h('div', { class: 'row wrap' },
          h('button', { type: 'button', class: 'btn small', onclick: () => {
            const cur = { name: f.name.value.trim(), genre: f.genre.value, city: f.city.value, debut: Number(f.debut.value), members: Number(f.members.value) };
            const d = diff(origs.get(k), cur, ['name', 'genre', 'city', 'debut', 'members']);
            if (d) b.acts[k] = d; else delete b.acts[k];
            redraw();
          } }, t(l('Guardar mudança', 'Keep change'))), resetBtn(b.acts, k), rmBtn(b.acts, k, origs.has(k))));
    });
    body.unshift(h('button', { type: 'button', class: 'btn small primary', onclick: () => { b.acts[String(nextActNo31(b))] = { name: t(l('Novo artista', 'New act')), genre: 'rnr', city: 'new_york', debut: 1965, members: 1 }; ED.q = ''; redraw(); } }, '+ ', t(l('Novo artista ou banda', 'New act or band'))));
    if (removed.length) body.push(h('p', { class: 'small muted' }, t(l('Removidos: ', 'Removed: ')), removed.map((a) => h('button', { type: 'button', class: 'btn small ghost', onclick: () => { delete b.acts[String(a!.no)]; redraw(); } }, '↺ ', a!.name))));
  } else if (ED.part === 'labels') {
    const origs = new Map(origLabels31().map((x) => [x.id, x]));
    body = first(resolvedLabels31(b)).filter((x) => match(`${x.name} ${x.city}`)).map((x) => {
      const f = { name: txt(x.name), city: pickOf(x.city, cityOpts), founded: num(x.founded), family: pickOf(x.family, ['A', 'B', 'C', 'D'].map((v) => ({ value: v, label: v }))) };
      return h('div', { class: 'b31-rec' }, h('b', null, x.name || x.id, ' ', tag(x)),
        h('div', { class: 'row wrap' }, field(l('Nome', 'Name'), f.name), field(l('Cidade', 'City'), f.city), field(l('Fundação', 'Founded'), f.founded), field(l('Política (A–D)', 'Policy (A–D)'), f.family)),
        h('div', { class: 'row wrap' },
          h('button', { type: 'button', class: 'btn small', onclick: () => {
            const cur = { name: f.name.value.trim(), city: f.city.value, founded: Number(f.founded.value), family: f.family.value as 'A' };
            const d = diff(origs.get(x.id), cur, ['name', 'city', 'founded', 'family']);
            if (d) b.labels[x.id] = d; else delete b.labels[x.id];
            redraw();
          } }, t(l('Guardar mudança', 'Keep change'))), resetBtn(b.labels, x.id), rmBtn(b.labels, x.id, origs.has(x.id))));
    });
    body.unshift(h('button', { type: 'button', class: 'btn small primary', onclick: () => { let i = 1; while (b.labels[`ed_label_${i}`] || origLabels31().some((x) => x.id === `ed_label_${i}`)) i++; b.labels[`ed_label_${i}`] = { name: t(l('Nova gravadora', 'New label')), city: 'new_york', founded: 1960, family: 'B' }; redraw(); } }, '+ ', t(l('Nova gravadora', 'New label'))));
  } else if (ED.part === 'cities') {
    body = CITIES.filter((c) => match(`${c.name.pt} ${c.name.en}`)).slice(0, 40).map((c) => {
      const o = origCity31(c.id)!;
      const p = b.cities[c.id] ?? {};
      const f = { pt: txt((p.name ?? o.name)!.pt), en: txt((p.name ?? o.name)!.en), scenes: txt((p.scenes ?? o.scenes ?? []).join(', ')) };
      return h('div', { class: 'b31-rec' }, h('b', null, t(o.name!), ' ', b.cities[c.id] ? h('span', { class: 'pill' }, t(l('mudada', 'changed'))) : null),
        h('div', { class: 'row wrap' }, field(l('Nome (pt)', 'Name (pt)'), f.pt), field(l('Nome (en)', 'Name (en)'), f.en), field(l('Cenas (gêneros, separados por vírgula)', 'Scenes (genres, comma separated)'), f.scenes)),
        h('div', { class: 'row wrap' },
          h('button', { type: 'button', class: 'btn small', onclick: () => {
            const name = { pt: f.pt.value.trim(), en: f.en.value.trim() };
            const scenes = f.scenes.value.split(',').map((x) => x.trim()).filter(Boolean);
            const d: typeof p = {};
            if (JSON.stringify(name) !== JSON.stringify(o.name)) d.name = name;
            if (JSON.stringify(scenes) !== JSON.stringify(o.scenes)) d.scenes = scenes;
            if (Object.keys(d).length) b.cities[c.id] = d; else delete b.cities[c.id];
            redraw();
          } }, t(l('Guardar mudança', 'Keep change'))), resetBtn(b.cities as Record<string, unknown>, c.id)));
    });
  } else {
    const origs = new Map(origRelics31().map((x) => [x.id, x]));
    const kinds = Object.keys(RELIC_KIND).map((k) => ({ value: k, label: t(RELIC_KIND[k as keyof typeof RELIC_KIND]) }));
    body = first(resolvedRelics31(b)).filter((x) => match(`${x.name.pt} ${x.owner}`)).slice(0, 40).map((x) => {
      const f = { pt: txt(x.name.pt), en: txt(x.name.en), owner: txt(x.owner), year: num(x.year), kind: pickOf(x.kind, kinds), value: num(x.value) };
      return h('div', { class: 'b31-rec' }, h('b', null, x.name.pt || x.id, ' ', tag(x)),
        h('div', { class: 'row wrap' }, field(l('Nome (pt)', 'Name (pt)'), f.pt), field(l('Nome (en)', 'Name (en)'), f.en), field(l('Dono original', 'Original owner'), f.owner), field(l('Ano', 'Year'), f.year), field(l('Tipo', 'Kind'), f.kind), field(l('Nível (valor)', 'Level (value)'), f.value)),
        h('div', { class: 'row wrap' },
          h('button', { type: 'button', class: 'btn small', onclick: () => {
            const cur = { name: { pt: f.pt.value.trim(), en: f.en.value.trim() || f.pt.value.trim() }, owner: f.owner.value.trim(), year: Number(f.year.value), kind: f.kind.value as 'guitar', value: Number(f.value.value) };
            const d = diff(origs.get(x.id), cur, ['name', 'owner', 'year', 'kind', 'value']);
            if (d) b.relics[x.id] = d; else delete b.relics[x.id];
            redraw();
          } }, t(l('Guardar mudança', 'Keep change'))), resetBtn(b.relics, x.id), rmBtn(b.relics, x.id, origs.has(x.id))));
    });
    body.unshift(h('button', { type: 'button', class: 'btn small primary', onclick: () => { let i = 1; while (b.relics[`ed_relic_${i}`]) i++; b.relics[`ed_relic_${i}`] = { name: l('Nova relíquia', 'New relic'), owner: '', year: 1970, month: 0, kind: 'guitar', value: 1000, story: l('', ''), location: l('', '') }; redraw(); } }, '+ ', t(l('Nova relíquia', 'New relic'))));
  }

  const q = h('input', { type: 'search', value: ED.q, placeholder: t(l('Filtrar pelo nome…', 'Filter by name…')), 'aria-label': t(l('Filtrar', 'Filter')), onchange: (e: Event) => { ED.q = (e.target as HTMLInputElement).value; redraw(); } });
  const validate = () => { const c = validateBase31(b); msg.replaceChildren(c.ok ? h('p', { class: 'good' }, t(l('Tudo certo: a base é válida.', 'All good: the database is valid.'))) : errBox(c.errors)!); return c.ok; };
  root.replaceChildren(h('div', { class: 'b31 page', id: 'main', role: 'main', tabindex: '-1' },
    h('header', { class: 'row' },
      h('button', { type: 'button', class: 'btn ghost', onclick: back }, '← ', t(l('Bases', 'Databases'))),
      h('h1', null, t(l('Editando: ', 'Editing: ')), b.name)),
    h('p', { class: 'small muted' }, t(summarizeBase31(b))),
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn', onclick: validate }, t(l('Validar', 'Validate'))),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { if (!validate()) return; saveBase(b); toast(t(l('Base salva.', 'Database saved.')), 'good'); back(); } }, t(l('Salvar base', 'Save database')))),
    msg,
    h('div', { class: 'tabs', role: 'tablist' }, PARTS.map((p) => h('button', { type: 'button', role: 'tab', 'aria-selected': ED.part === p.id ? 'true' : 'false', class: ED.part === p.id ? 'on' : '', onclick: () => { ED.part = p.id; ED.q = ''; redraw(); } }, t(p.label)))),
    q,
    h('section', { class: 'card b31-body' }, body.length ? body : h('p', { class: 'muted' }, t(l('Nada com esse nome.', 'Nothing by that name.')))),
    h('p', { class: 'small muted' }, t(l('Mostrando até 40 por vez: use o filtro para achar o resto.', 'Showing up to 40 at a time: use the filter to find the rest.')))));
}
