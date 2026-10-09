// Repertório: todas as composições do ato, com status, onde foram usadas (singles, EPs, LPs,
// coletâneas, ao vivo), perfil comercial, autores e o que fazer com cada uma.

import { l, type L } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { makeRemix } from '../../sim/studio';
import {
  REVISE_FOCUS, STATUS_NAMES, derivedSongs, discardIdea, discardSong, liveCandidates, pitchSync, releaseCompilation,
  releaseDemo, releaseLive, releaseSingle, repertoire, restoreSong, reviseCost, reviseSong, songProfile, songStatus, songUses, toggleVault,
  type ReviseFocus, type SongStatus,
} from '../../sim/repertoire';
import type { GameState, Song } from '../../sim/types';
import { rngOf } from '../../sim/util';
import { $, N, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { store } from '../store';
import { chips, ic, portrait, setTab, stat } from '../vis';
import { preselectSession } from './studio';
import { songAttrs } from '../songAttrs';
import { closeSale, fairTerms, offerSong, saleChance, saleTargets, type SaleTerms } from '../../sim/sys/songsale';

/** Botões extras no cabeçalho de cada música (ouvir a música). */
export const REP_SONG_EXTRAS: ((s: GameState, so: Song) => HTMLElement | null)[] = [];
/** Blocos extras no corpo de cada música (rodada 8: direção sonora); `open` = cartão aberto. */
export const REP_SONG_BODY: ((s: GameState, so: Song, open: boolean) => HTMLElement | null)[] = [];

// ---------- venda de composição (rodada 7) ----------
const sale: { songId: string; target: string; fee: number; royalty: number; labelShare: number; reply: { text: L; counter?: SaleTerms } | null } = { songId: '', target: '', fee: 0, royalty: 0.08, labelShare: 50, reply: null };

function saleBox(s: GameState, so: Song): HTMLElement {
  const targets = saleTargets(s, so);
  if (!targets.length) return h('small', { class: 'muted' }, t(l('Ninguém em atividade para comprar esta música agora.', 'Nobody active to buy this song right now.')));
  if (sale.songId !== so.id) {
    sale.songId = so.id;
    sale.target = targets[0].id;
    const f = fairTerms(s, so, sale.target);
    sale.fee = Math.round(f.fee / 100);
    sale.royalty = Math.round(f.royalty * 1000) / 10;
    sale.reply = null;
  }
  if (!targets.some((a) => a.id === sale.target)) sale.target = targets[0].id;
  const terms = (): SaleTerms => ({ fee: Math.round(sale.fee * 100), royalty: sale.royalty / 100, labelShare: sale.labelShare / 100 });
  const p = saleChance(s, so, sale.target, terms());
  const band = p > 0.66 ? 'likely' : p > 0.36 ? 'uncertain' : 'unlikely';
  const fair = fairTerms(s, so, sale.target);
  const num = (v: number, step: number, set: (x: number) => void, max?: number) => h('input', { type: 'number', value: v, step, min: 0, max, class: 'num-sm', onchange: (e: Event) => { set(Number((e.target as HTMLInputElement).value)); sale.reply = null; rerender(); } });
  return h('div', { class: 'sale-box' },
    h('b', null, ic('handshake'), ' ', t(l('Vender a composição', 'Sell the song'))),
    h('div', { class: 'row wrap' },
      select(sale.target, targets.map((a) => ({ value: a.id, label: `${a.name} (★${Math.round(a.fame)}${a.genre === so.genre ? ' ✓' : ''})` })), (v) => { sale.target = v; sale.reply = null; rerender(); }, { 'aria-label': t(l('Comprador', 'Buyer')) }),
      h('label', null, t(l('Valor $', 'Price $')), num(sale.fee, 50, (x) => (sale.fee = x))),
      h('label', null, t(l('Royalties %', 'Royalties %')), num(sale.royalty, 0.5, (x) => (sale.royalty = x), 30)),
      h('label', null, t(l('Parte do selo %', 'Label share %')), num(sale.labelShare, 5, (x) => (sale.labelShare = Math.min(100, x)), 100)),
    ),
    h('small', { class: 'muted' }, t(l('Referência do mercado: {f} e {r}% de royalties. O selo fica com {ls}% do que entrar (edição); o resto vai para os compositores. Chance: ', 'Market reference: {f} and {r}% royalties. The label keeps {ls}% of the income (publishing); the rest goes to the writers. Chance: '), { f: $(fair.fee), r: (fair.royalty * 100).toFixed(1), ls: sale.labelShare }), pill(t(S[band]), band)),
    h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: () => {
      const res = offerSong(s, rngOf(s), so.id, sale.target, terms());
      if (res.result === 'accepted') { toast(t(res.text), 'good'); sale.songId = ''; rerender(); return; }
      sale.reply = { text: res.text, counter: res.counter };
      rerender();
    } }, ic('handshake'), ' ', t(l('Propor agora', 'Propose now')))),
    sale.reply ? h('div', { class: 'small' }, t(sale.reply.text), sale.reply.counter ? h('button', { class: 'btn small primary', onclick: () => { const c = sale.reply!.counter!; closeSale(s, rngOf(s), so.id, sale.target, c); toast(t(l('Venda fechada.', 'Sale closed.')), 'good'); sale.songId = ''; rerender(); } }, t(l('Aceitar contraproposta', 'Accept counter'))) : null) : null,
  );
}

const view = { status: 'all' as SongStatus | 'all' | 'unused', sort: 'recent' as 'recent' | 'q' | 'hook', open: '' as string, pitchTo: '' as string, comp: new Set<string>() };

const say = (res: L | null, ok: L) => toast(t(res ?? ok), res ? 'bad' : 'good');

const STATUS_CLS: Record<SongStatus, string> = { written: 'written', recorded: 'recorded', scheduled: 'recorded', released: 'released', vault: 'vault', discarded: 'written' };
const KIND_NAMES: Record<string, L> = {
  single: l('Single', 'Single'), ep: l('EP', 'EP'), lp: l('LP', 'LP'), compilation: l('Coletânea', 'Compilation'), live: l('Ao vivo', 'Live'), demo: l('Demo', 'Demo'),
  deluxe: l('Deluxe', 'Deluxe'), limited: l('Limitada', 'Limited'), anniversary: l('Aniversário', 'Anniversary'), tribute: l('Tributo', 'Tribute'), remix: l('Remix', 'Remix'),
  posthumous: l('Póstumo', 'Posthumous'), translation: l('Versão', 'Version'),
};

export function qBars(so: Song): HTMLElement {
  const bar = (v: number, cls: string, name: L) => h('i', { class: cls, style: `height:${Math.max(8, Math.round(v))}%`, title: `${t(name)} ${Math.round(v)}` });
  return h('span', { class: 'rep-q', role: 'img', 'aria-label': `Q ${Math.round(so.q)}` },
    bar(so.melody, 'm', l('Melodia', 'Melody')), bar(so.lyrics, 'l', l('Letra', 'Lyrics')),
    so.recorded ? bar(so.performance, '', l('Performance', 'Performance')) : null, so.recorded ? bar(so.production, '', l('Produção', 'Production')) : null,
    bar(so.originality, 'o', l('Originalidade', 'Originality')));
}

function flags(s: GameState, so: Song): HTMLElement[] {
  const out: HTMLElement[] = [];
  const src = (id?: string) => (id ? s.songs[id]?.title ?? '?' : '');
  if (so.coverOf) out.push(pill(`cover: ${src(so.coverOf)}`));
  if (so.remixOf) out.push(pill(`remix: ${src(so.remixOf)}`));
  if (so.translationOf) out.push(pill(`${t(l('versão', 'version'))}${so.lang ? ` ${so.lang}` : ''}`));
  if (so.sampleOf) out.push(pill('sample'));
  if (s.flags[`liveOf:${so.id}`] !== undefined) out.push(pill(t(l('ao vivo', 'live'))));
  if (so.posthumous) out.push(pill(t(l('póstuma', 'posthumous')), 'warn'));
  if (so.aiVoice) out.push(pill(t(l('voz IA', 'AI voice')), 'warn'));
  if (so.synthetic) out.push(pill(t(l('sintética', 'synthetic'))));
  if (so.revisions) out.push(pill(`${so.revisions}× ${t(l('revisada', 'revised'))}`));
  if (s.flags[`pitched:${so.id}`]) out.push(pill(t(l('cedida a outro artista', 'given to another artist')), 'good'));
  return out;
}

function writers(s: GameState, so: Song): HTMLElement {
  const sp = so.splits?.length ? so.splits : so.writers.map((w) => ({ personId: w, share: 1 / Math.max(1, so.writers.length) }));
  return h('span', { class: 'row', style: 'gap:4px' }, ic('pen'), sp.map((x) => h('span', { class: 'row', style: 'gap:2px', title: s.persons[x.personId]?.name ?? '' }, portrait(s.persons[x.personId], 20), h('small', null, `${Math.round(x.share * 100)}%`))));
}

function usedIn(s: GameState, so: Song): HTMLElement {
  const uses = songUses(s, so.id);
  const der = derivedSongs(s, so.id);
  return h('div', { class: 'rep-used' },
    ic('cd'),
    uses.length ? uses.map((u) => pill(`${t(KIND_NAMES[u.kind && u.kind !== 'standard' ? u.kind : u.type] ?? KIND_NAMES[u.type])} · ${u.title} · ${u.pending ? t(l('programado', 'scheduled')) : u.year}`, u.pending ? 'warn' : 'good'))
      : h('span', { class: 'muted' }, t(l('Ainda não entrou em nenhum disco.', 'Not on any record yet.'))),
    der.length ? pill(`${der.length} ${t(l('versões derivadas', 'derived versions'))}`) : null);
}

function actions(s: GameState, so: Song, st: SongStatus): HTMLElement {
  const r = rngOf(s);
  const btn = (icon: string, label: L, fn: () => void, attrs: Record<string, unknown> = {}) => h('button', { class: 'btn small', onclick: () => { fn(); rerender(); }, ...attrs }, ic(icon), ' ', t(label));
  const list: (HTMLElement | null)[] = [];
  if (st === 'written') {
    for (const f of Object.keys(REVISE_FOCUS) as ReviseFocus[]) list.push(btn('pen', REVISE_FOCUS[f].name, () => say(reviseSong(s, r, so.id, f), l('Música revisada.', 'Song revised.')), { title: `${t(REVISE_FOCUS[f].desc)} ${$(reviseCost(s, so))}`, disabled: (so.revisions ?? 0) >= 4 }));
    list.push(btn('mic', l('Gravar no estúdio', 'Record in the studio'), () => { preselectSession([so.id]); setTab('creation', 'session'); }));
    list.push(btn('cassette', l('Lançar como demo', 'Release as a demo'), () => say(releaseDemo(s, r, so.id), l('Demo programada.', 'Demo scheduled.'))));
  }
  if (st === 'recorded') {
    list.push(btn('disc', l('Lançar como single', 'Release as a single'), () => say(releaseSingle(s, r, so.id), l('Single programado.', 'Single scheduled.'))));
    list.push(btn('cd', l('Montar disco com ela', 'Build a record with it'), () => setTab('creation', 'launch')));
    list.push(btn('cassette', l('Lançar como demo', 'Release as a demo'), () => say(releaseDemo(s, r, so.id), l('Demo programada.', 'Demo scheduled.'))));
  }
  if (st === 'recorded' || st === 'released') list.push(btn('sparkle', l('Remix', 'Remix'), () => { const res = makeRemix(s, so.id); say('pt' in res && !('id' in res) ? (res as L) : null, l('Remix criado no repertório.', 'Remix added to the repertoire.')); }));
  if (st === 'released') {
    list.push(btn('film', l('Oferecer para sync', 'Pitch for sync'), () => { const res = pitchSync(s, r, so.id); toast(t(res), 'info'); }));
    list.push(h('label', { class: 'chip-btn' + (view.comp.has(so.id) ? ' on' : '') }, h('input', { type: 'checkbox', checked: view.comp.has(so.id), onchange: () => { if (view.comp.has(so.id)) view.comp.delete(so.id); else view.comp.add(so.id); rerender(); } }), ' ', t(l('Para coletânea', 'For a compilation'))));
  }
  if (st === 'written' || st === 'recorded' || st === 'vault') list.push(saleBox(s, so));
  if (st === 'written' || st === 'recorded') list.push(btn('vault', l('Guardar no cofre', 'Put in the vault'), () => say(toggleVault(s, so.id), l('Guardada no cofre.', 'Put in the vault.'))));
  if (st === 'vault') list.push(btn('vault', l('Tirar do cofre', 'Take out of the vault'), () => say(toggleVault(s, so.id), l('De volta ao repertório.', 'Back in the repertoire.'))));
  if (st === 'written' || st === 'recorded') list.push(btn('skull', l('Descartar', 'Discard'), () => say(discardSong(s, so.id), l('Descartada.', 'Discarded.'))));
  if (st === 'discarded') list.push(btn('sparkle', l('Recuperar', 'Restore'), () => { restoreSong(s, so.id); }));
  return h('div', { class: 'rep-actions' }, list.filter(Boolean) as HTMLElement[]);
}

function songCard(s: GameState, so: Song): HTMLElement {
  const st = songStatus(s, so);
  const open = view.open === so.id;
  return h('article', { class: `rep-song ${STATUS_CLS[st]}` },
    h('div', { class: 'rep-head' },
      h('span', { class: 'row', style: 'gap:6px' }, ic(so.recorded ? 'disc' : 'note'), h('b', null, so.title), pill(t(STATUS_NAMES[st]), st === 'released' ? 'good' : st === 'vault' ? 'warn' : '')),
      h('span', { class: 'row', style: 'gap:6px' }, ...REP_SONG_EXTRAS.map((f) => f(s, so)), stat('sparkle', Math.round(so.q), l('Qualidade Q', 'Quality Q')),
        h('button', { class: 'btn small ghost', 'aria-expanded': open ? 'true' : 'false', onclick: () => { view.open = open ? '' : so.id; rerender(); } }, t(open ? l('Fechar', 'Close') : l('O que fazer', 'What to do'))))),
    so.theme ? h('small', { class: 'muted' }, ic('bulb'), ` ${t(l('Tema', 'Theme'))}: ${t(so.theme)}`) : null,
    songAttrs(so, { compact: !open }),
    ...REP_SONG_BODY.map((f) => f(s, so, open)),
    chips(writers(s, so), ...flags(s, so)),
    usedIn(s, so),
    open ? actions(s, so, st) : null,
  );
}

export function repertoireTab(s: GameState): HTMLElement {
  const a = s.acts[store.selectedAct ?? ''];
  if (!a) return h('p', null, '—');
  const all = repertoire(s, a, true);
  const counts: Record<string, number> = {};
  for (const so of all) {
    const st = songStatus(s, so);
    counts[st] = (counts[st] ?? 0) + 1;
    if (!songUses(s, so.id).length && st !== 'discarded') counts.unused = (counts.unused ?? 0) + 1;
  }
  let list = all.filter((so) => {
    const st = songStatus(s, so);
    if (view.status === 'all') return st !== 'discarded';
    if (view.status === 'unused') return st !== 'discarded' && !songUses(s, so.id).length;
    return st === view.status;
  });
  list = list.sort((x, y) => (view.sort === 'q' ? y.q - x.q : view.sort === 'hook' ? songProfile(y).hook - songProfile(x).hook : y.createdWeek - x.createdWeek));
  const filt = (id: typeof view.status, label: L) => h('button', { type: 'button', class: `chip-btn ${view.status === id ? 'on' : ''}`, 'aria-pressed': view.status === id ? 'true' : 'false', onclick: () => { view.status = id; rerender(); } }, `${t(label)} (${id === 'all' ? all.length - (counts.discarded ?? 0) : counts[id] ?? 0})`);
  const ideas = s.ideas[a.id] ?? [];
  const live = liveCandidates(s, a.id);
  const compIds = [...view.comp].filter((id) => s.songs[id]?.actId === a.id);
  return h('div', null,
    section(t(l('Repertório de {a}', "{a}'s repertoire"), { a: a.name }),
      h('div', { class: 'rep-summary' },
        stat('note', all.length, l('Composições', 'Compositions')),
        stat('pen', counts.written ?? 0, l('Só escritas', 'Written only')),
        stat('disc', counts.recorded ?? 0, l('Gravadas inéditas', 'Recorded, unreleased')),
        stat('cd', counts.released ?? 0, l('Lançadas', 'Released')),
        stat('vault', counts.vault ?? 0, l('No cofre', 'In the vault')),
      ),
      h('p', { class: 'muted small' }, ic('fire'), ` ${t(l('gancho (singles)', 'hook (singles)'))} · `, ic('radio'), ` ${t(l('acessibilidade (rádio, sync)', 'accessibility (radio, sync)'))} · `, ic('clock'), ` ${t(l('durabilidade (catálogo)', 'durability (catalog)'))} · `, t(l('barras: melodia, letra, performance, produção, originalidade', 'bars: melody, lyrics, performance, production, originality'))),
      h('div', { class: 'rep-filters' },
        filt('all', l('Todas', 'All')), filt('unused', l('Nunca usadas em disco', 'Never on a record')), filt('written', l('Escritas', 'Written')), filt('recorded', l('Gravadas', 'Recorded')),
        filt('scheduled', l('Programadas', 'Scheduled')), filt('released', l('Lançadas', 'Released')), filt('vault', l('Cofre', 'Vault')), filt('discarded', l('Descartadas', 'Discarded')),
        select(view.sort, [{ value: 'recent', label: t(l('Mais recentes', 'Newest')) }, { value: 'q', label: t(l('Maior Q', 'Highest Q')) }, { value: 'hook', label: t(l('Maior gancho', 'Strongest hook')) }], (v) => { view.sort = v; rerender(); }, { 'aria-label': t(l('Ordenar', 'Sort')) }),
      ),
      list.length ? h('div', { class: 'rep-list' }, list.map((so) => songCard(s, so))) : h('p', { class: 'muted small' }, t(l('Nada aqui. Coloque "Compor" na agenda ou use ideias do caderno.', 'Nothing here. Add "Write songs" to the agenda or use notebook ideas.'))),
    ),
    compIds.length ? section(t(l('Coletânea', 'Compilation')),
      h('p', { class: 'small' }, `${compIds.length} ${t(l('músicas marcadas (mínimo 6, já lançadas).', 'songs marked (minimum 6, already released).'))}`),
      h('button', { class: 'btn primary', disabled: compIds.length < 6, onclick: () => { const e = releaseCompilation(s, rngOf(s), a.id, compIds); say(e, l('Coletânea programada!', 'Compilation scheduled!')); if (!e) view.comp.clear(); rerender(); } }, ic('cd'), ' ', t(l('Programar coletânea', 'Schedule compilation')))) : null,
    live.length ? section(t(l('Disco ao vivo', 'Live album')), h('div', { class: 'row wrap' }, live.map((tr) => h('button', { class: 'btn', onclick: () => { say(releaseLive(s, rngOf(s), tr.id), l('Disco ao vivo programado!', 'Live album scheduled!')); rerender(); } }, ic('mic'), ` ${tr.name} (${tr.stops.filter((x) => x.status === 'played').length} ${t(l('shows', 'shows'))})`)))) : null,
    section(t(l('Caderno de ideias', 'Idea notebook')),
      h('p', { class: 'muted small' }, t(l('Estrada, família, perdas, cenas e política viram temas. A ideia mais forte entra na próxima composição (melodia, letra e originalidade sobem).', 'The road, family, loss, scenes and politics become themes. The strongest idea goes into the next song (melody, lyrics and originality rise).'))),
      ideas.length ? h('div', { class: 'idea-list' }, ideas.map((i) => h('span', { class: 'idea', title: `${i.source} · ${i.strength}/10` }, ic('bulb'), ` ${t(i.theme)} `, h('small', { class: 'muted' }, `${i.strength}/10`), ' ', h('button', { class: 'btn small ghost', 'aria-label': t(l('Descartar ideia', 'Discard idea')), onclick: () => { discardIdea(s, a.id, i.id); rerender(); } }, '×'))))
        : h('p', { class: 'muted small' }, t(l('Nenhuma ideia anotada ainda.', 'No ideas noted yet.'))),
    ),
    h('p', { class: 'muted small' }, actLink(s, a.id), ` · ${N(a.fans.core)} ${t(l('fãs fiéis', 'core fans'))}`),
  );
}
