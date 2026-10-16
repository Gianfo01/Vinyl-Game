// R31 · onda 5 (TEC) — gerador da especificação das telas (docs/r31/onda5-telas.md) e da tabela de teclas
// (docs/r31/onda5-teclas.md, bloco gerado). Puro, sem DOM: o teste tests/r31-w5-tec.test.ts gera e compara com os
// arquivos (UPDATE5=1 regrava). Assim o documento nunca fica velho em relação a objects5.ts e keys5.ts.

import type { TabRow27 } from '../ps/tabsreg27';
import { chordLabel5, key5, keys5, KEY_CHANGES5, type Bind5 } from './keys5';
import { FRAME_L5, MOVE_SPECIAL5, PAUSE5, PLACES5, REGION_L5, movedInto5, moveOf5, objects5, ownerOf5, regionOf5, type Obj5 } from './objects5';

export interface Page5 { id: string; label: string }

const keyOf = (o: Obj5): string => {
  const own = key5(`obj:${o.id}`)?.chord;
  if (own) return chordLabel5(own);
  if (o.keyRef) { const b = key5(o.keyRef); return b ? `${chordLabel5(b.chord)} (${b.label.pt.toLowerCase()})` : '—'; }
  return '—';
};
const markerKeys = (o: Obj5): string[] => keys5().filter((b) => b.act.kind === 'marker' && b.act.obj === o.id).map((b) => chordLabel5(b.chord));
const objLabel = (id: string): string => objects5().find((o) => o.id === id)?.label.pt ?? MOVE_SPECIAL5[id]?.pt ?? id;
const esc = (s: string): string => s.replace(/\|/g, '\\|');

/** Abas da página que FICAM no papel dono (as outras saem pelas MOVES5). */
function stays(area: string, tabs: TabRow27[]): TabRow27[] { return tabs.filter((r) => r[0] === area && !moveOf5(r[0], r[1], r[2])); }
function leaves(area: string, tabs: TabRow27[]): TabRow27[] { return tabs.filter((r) => r[0] === area && !!moveOf5(r[0], r[1], r[2])); }

/** Página (`id`) citada no mapa da onda 5? */
export const inMapa5 = (id: string, mapa: string): boolean => mapa.includes(`\`${id}\``) || new RegExp(`[\\s(,]${id.replace(/[-]/g, '\\-')}[\\s),]`).test(mapa);

export function telasDoc5(pages: Page5[], tabs: TabRow27[], mapa: string): string {
  const name = new Map(pages.map((p) => [p.id, p.label]));
  const pn = (a: string) => `\`${a}\` (${name.get(a) ?? a})`;
  const out: string[] = [];
  out.push('# Onda 5 · especificação de cada tela no padrão aprovado', '');
  out.push('> **Gerado** por `src/ui/r31/spec5.ts` a partir de `src/ui/r31/objects5.ts`, `src/ui/r31/keys5.ts` e `src/ui/ps/tabsreg27.ts`.',
    '> Não edite à mão: mude o código e rode `UPDATE5=1 npx vitest run tests/r31-w5-tec.test.ts`. O teste falha se este arquivo ficar velho.', '');
  out.push('Padrão aprovado (PLANO, onda 5): cada tela é um objeto do mundo aberto por cima da cena, com as abas de hoje como marcadores do',
    'próprio objeto; topo fixo (data, caixa, fama, avançar); embaixo os botões de viagem e o bolso; Esc fecha; cada objeto tem tecla própria.',
    'Nesta etapa (TEC) o objeto ainda abre a página antiga (`open5`); a lista abaixo é o endereço de cada página no mundo novo.', '');
  const nPages = pages.length, nTabs = tabs.length;
  const missing = pages.filter((p) => !inMapa5(p.id, mapa));
  out.push(`Inventário: **${nPages} páginas** registradas hoje (base + \`registerArea\` + virtuais) e **${nTabs} abas** (\`TABS_REG27\`).`,
    `${objects5().length} objetos; ${Object.keys(PAUSE5).length} páginas ficam no menu de pausa; ${missing.length} páginas não estavam no mapa (marcadas com ⚑).`, '');
  out.push('Como ler: **Lugar** = região › cômodo/prédio; **Papel** = a moldura que abre; **Marcadores** = abas que ficam no papel',
    '(as que chegam de outra página vêm marcadas com ←); **"!"** = o que acende o ponto de novidade (por padrão, pendências únicas',
    'cujo dono é uma destas páginas, `nav5.bangs5`); **Sai daqui** = abas que vão para outro objeto, para o topo ou para o índice da pausa.', '');

  // ---- por região › lugar › objeto
  for (const r of ['sede', 'casa', 'cidade', 'mundo'] as const) {
    out.push(`## ${REGION_L5[r].pt}`, '');
    const objs = objects5().filter((o) => regionOf5(o.place) === r);
    for (const o of objs) {
      const mk = markerKeys(o);
      out.push(`### ${o.label.pt} · tecla ${keyOf(o)}${mk.length ? ` (marcadores: ${mk.join(', ')})` : ''}`);
      out.push(`- **Lugar:** ${REGION_L5[r].pt} › ${PLACES5[o.place].pt}${o.career ? ` · carreira \`${o.career}\`` : ''}${o.era ? ` · existe de ${o.era[0]} a ${o.era[1]}` : ''}`);
      out.push(`- **Papel:** ${FRAME_L5[o.frame].pt}`);
      if (o.opens.length) out.push(`- **Páginas (dono):** ${o.opens.map((x) => `${pn(x.area)}${inMapa5(x.area, mapa) ? '' : ' ⚑'}`).join(', ')}`);
      if (o.links?.length) out.push(`- **Atalho para:** ${o.links.map((x) => `${pn(x.area)}${x.tab ? ` › ${x.tab[1]}` : ''} (dono: ${ownerOf5(x.area)?.label.pt ?? '—'})`).join(', ')}`);
      const marks = [...new Set(o.opens.map((x) => x.area))].flatMap((a) => stays(a, tabs).map((t) => t[3]));
      const into = movedInto5(o.id).flatMap((m) => tabs.filter((t) => t[0] === m.area && t[1] === m.key && (m.tab === undefined || t[2] === m.tab)).map((t) => `← ${t[3]}`));
      const extraInto = movedInto5(o.id).filter((m) => m.tab && !tabs.some((t) => t[0] === m.area && t[1] === m.key && t[2] === m.tab)).map((m) => `← ${m.tab}`);
      const all = [...marks, ...into, ...extraInto];
      out.push(`- **Marcadores:** ${all.length ? all.join(' · ') : '— (papel de uma folha só)'}`);
      out.push(`- **"!":** ${o.bang?.pt ?? (o.opens.length ? 'pendências com dono nestas páginas' : '—')}`);
      const gone = o.opens.flatMap((x) => leaves(x.area, tabs)).map((t) => `${t[3]} → ${objLabel(moveOf5(t[0], t[1], t[2])!.to)}`);
      if (gone.length) out.push(`- **Sai daqui:** ${[...new Set(gone)].join(' · ')}`);
      if (o.forms?.length) out.push(`- **Forma por época:** ${o.forms.map((f) => `${f.era[0]}–${f.era[1]} ${f.label.pt}`).join(' · ')}`);
      if (o.note) out.push(`- **Nota:** ${o.note.pt}`);
      out.push('');
    }
  }
  out.push('## Fora do mundo (menu de pausa: Esc ou engrenagem)', '');
  for (const [id, lab] of Object.entries(PAUSE5)) out.push(`- ${pn(id)} — ${lab.pt}${inMapa5(id, mapa) ? '' : ' ⚑'}`);
  out.push('- Salvar/carregar e opções (inclui Nomes reais) continuam como utilidades da pausa.', '');

  // ---- tabela por página
  out.push('## Todas as páginas', '', '| Página | Objeto | Lugar | Papel | Tecla | No mapa | Abas (ficam/saem) |', '|---|---|---|---|---|---|---|');
  for (const p of [...pages].sort((a, b) => a.id.localeCompare(b.id))) {
    const o = ownerOf5(p.id);
    const st = stays(p.id, tabs).length, lv = leaves(p.id, tabs).length;
    if (o) out.push(`| \`${p.id}\` ${esc(p.label)} | ${esc(o.label.pt)} | ${REGION_L5[regionOf5(o.place)].pt} › ${PLACES5[o.place].pt} | ${FRAME_L5[o.frame].pt} | ${esc(keyOf(o))} | ${inMapa5(p.id, mapa) ? 'sim' : '⚑ não'} | ${st}/${lv} |`);
    else if (PAUSE5[p.id]) out.push(`| \`${p.id}\` ${esc(p.label)} | — | menu de pausa | — | Esc | ${inMapa5(p.id, mapa) ? 'sim' : '⚑ não'} | ${st}/${lv} |`);
    else out.push(`| \`${p.id}\` ${esc(p.label)} | **sem dono** | — | — | — | ${inMapa5(p.id, mapa) ? 'sim' : '⚑ não'} | ${st}/${lv} |`);
  }
  out.push('');

  // ---- tabela por aba
  out.push('## Todas as abas', '', 'Aba de hoje → marcador de qual objeto na onda 5 (ou topo/índice da pausa).', '', '| Página | Aba | Marcador em | Por quê |', '|---|---|---|---|');
  for (const t of tabs) {
    const mv = moveOf5(t[0], t[1], t[2]);
    const dono = mv ? objLabel(mv.to) : ownerOf5(t[0])?.label.pt ?? (PAUSE5[t[0]] ? 'menu de pausa' : '**sem dono**');
    out.push(`| \`${t[0]}\` | ${esc(t[3])} | ${esc(dono)}${mv ? ' (muda)' : ''} | ${mv ? esc(mv.why.pt) : ''} |`);
  }
  out.push('');
  return out.join('\n');
}

/** Bloco gerado do onda5-teclas.md (tabelas de teclas). */
export function keysTable5(list: readonly Bind5[] = keys5()): string {
  const out: string[] = [];
  const row = (b: Bind5) => `| ${chordLabel5(b.chord)} | ${esc(b.label.pt)} | ${b.legacy && b.legacy !== b.chord ? `antes: ${chordLabel5(b.legacy)}` : b.legacy ? 'igual' : 'nova'} |`;
  const sec = (title: string, xs: Bind5[]) => { if (!xs.length) return; out.push(`### ${title}`, '', '| Tecla | Função | Antes |', '|---|---|---|', ...xs.map(row), ''); };
  const globals = list.filter((b) => b.scope === 'global');
  sec('Sistema', globals.filter((b) => b.act.kind === 'sys'));
  sec('Viagem (botões fixos)', globals.filter((b) => b.act.kind === 'travel'));
  const objs = globals.filter((b) => b.act.kind === 'object');
  const ord = (c: string) => (c.startsWith('shift+') ? 2 : /^[0-9]$/.test(c) ? 0 : /^[a-z]$/.test(c) ? 1 : 3);
  sec('Objetos', [...objs].sort((a, b) => ord(a.chord) - ord(b.chord) || a.chord.localeCompare(b.chord)));
  sec('Teclas de marcador (atalhos de hoje que abrem o objeto já no marcador)', globals.filter((b) => b.act.kind === 'marker'));
  const scopes = [...new Set(list.filter((b) => b.scope !== 'global').map((b) => b.scope))];
  for (const s of scopes) sec(`Dentro do papel "${s}" (ganham das globais enquanto ele está aberto)`, list.filter((b) => b.scope === s));
  out.push('### O que mudou', '', '| Tecla | Antes | Agora | Por quê |', '|---|---|---|---|');
  for (const c of KEY_CHANGES5) out.push(`| ${c.chord.includes('…') ? c.chord : chordLabel5(c.chord)} | ${esc(c.before.pt)} | ${esc(c.after.pt)} | ${esc(c.why.pt)} |`);
  out.push('');
  return out.join('\n');
}
