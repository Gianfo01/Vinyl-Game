// Interface da criação (rodada 4): abas em Criação e a cena de crítica do lançamento.

import { openFeatModal } from './round8';
import { FAMILIES, MARKETS, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  CHALLENGES, DIVISIONS, EFFECTS, SHOTS, THEMES, acceptCommission, availableIngredients, closeDivision, commissionName, declineCommission, effectsOf,
  featureCandidates, featureFee, hireWriter, hotThemes, inviteFeature, marketCraving, openDivision, remaster, remasterOptions, setCover, setRecipe,
  shootClip, songTheme, songX, standards, themeById, viralPush, writerPool,
} from '../../sim/sys/creation/core';
import { songStatus } from '../../sim/repertoire';
import type { GameState, Song } from '../../sim/types';
import { hasTech, money, playerActs, rngOf } from '../../sim/util';
import { $, N, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { portraitDataUrl } from '../pixel/avatar';
import { registerCutscene, registerTab, openScene } from '../registry';
import { store } from '../store';
import { chips, ic, scoreBadge, stat, tile } from '../vis';
import './creation.css';
import { reviewCard, reviewSummary } from '../reviewView';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const ui = { recipeSong: '', featSong: '', featGuest: '', clipSong: '', commAct: '' };

function curAct(s: GameState) {
  return s.acts[store.selectedAct ?? ''] ?? s.acts[playerActs(s)[0]];
}

function unreleased(s: GameState, actId: string): Song[] {
  return (s.acts[actId]?.songs ?? []).map((id) => s.songs[id]).filter((so): so is Song => !!so && !so.releaseId && !so.vault);
}

// ------------------------------------------------------------------ temas e tendências

function themesTab(s: GameState): HTMLElement {
  const st = s.x4.creation;
  const hot = hotThemes(s, 5);
  const act = curAct(s);
  return h('div', null,
    section(t(l('Temas em alta', 'Hot themes')),
      h('div', { class: 'cr-hot' }, hot.map((x) => h('div', { class: 'cr-hot-item' }, h('b', null, t(themeById[x.id].name)), h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((x.trend - 0.7) / 0.65 * 100)}%` })), h('small', null, `×${x.trend.toFixed(2)}`)))),
      h('p', { class: 'muted small' }, t(l('Cada música ganha um tema ao ser composta (do caderno de ideias ou do estilo do artista). Temas em alta e combinações certas com o gênero vendem mais.', 'Each song gets a theme when written (from the idea notebook or the act\'s style). Hot themes and the right genre pairing sell more.'))),
    ),
    section(t(l('Caderno de combinações gênero × tema', 'Genre × theme notebook')),
      h('p', { class: 'muted small' }, t(l('As notas aparecem quando você lança uma música com aquela combinação. Verde funciona; vermelho atrapalha.', 'Scores appear once you release a song with that pairing. Green works; red hurts.'))),
      h('div', { class: 'cr-matrix-wrap' }, h('table', { class: 'tbl compact cr-matrix' },
        h('thead', null, h('tr', null, h('th', null, ''), THEMES.map((th) => h('th', { title: t(th.name) }, t(th.name).slice(0, 4))))),
        h('tbody', null, FAMILIES.map((f) => h('tr', null, h('td', null, t(f.name)), THEMES.map((th) => {
          const v = st.seen[`${f.id}:${th.id}`];
          return h('td', { class: v === undefined ? 'muted' : v > 0.2 ? 'good' : v < -0.2 ? 'bad' : '', title: v === undefined ? '?' : v.toFixed(1) }, v === undefined ? '?' : v > 0.2 ? '▲' : v < -0.2 ? '▼' : '•');
        })))))),
    ),
    act ? section(t(l('Temas das músicas de {a}', "{a}'s song themes"), { a: act.name }), h('ul', { class: 'small' }, act.songs.slice(-12).reverse().map((id) => s.songs[id]).filter(Boolean).map((so) => {
      const th = songTheme(s, so);
      return h('li', null, `"${so.title}" — `, th ? pill(t(themeById[th]?.name ?? so.theme ?? l('?', '?'))) : h('span', { class: 'muted' }, '—'));
    }))) : null,
  );
}

// ------------------------------------------------------------------ receita sonora

function recipeTab(s: GameState): HTMLElement {
  const act = curAct(s);
  if (!act) return h('p', null, '—');
  const songs = unreleased(s, act.id);
  if (!songs.some((x) => x.id === ui.recipeSong)) ui.recipeSong = songs[0]?.id ?? '';
  const x = ui.recipeSong ? s.x4.creation.songs[ui.recipeSong] : undefined;
  const recipe = x?.recipe ?? [];
  const toggle = (id: string) => {
    const next = recipe.includes(id) ? recipe.filter((r) => r !== id) : [...recipe, id];
    const e = setRecipe(s, ui.recipeSong, next);
    if (e) toast(t(e), 'bad');
    rerender();
  };
  return h('div', null,
    section(t(l('O que cada mercado procura agora', 'What each market craves right now')), h('div', { class: 'cards' }, MARKETS.filter((m) => s.player.territories.includes(m.id)).map((m) => tile('globe', t(m.name), [chips(...marketCraving(s, m.id).map((e) => pill(t(EFFECTS[e]), 'good')))])))),
    section(t(l('Receita sonora', 'Sound recipe')),
      songs.length ? h('div', null,
        select(ui.recipeSong, songs.map((so) => ({ value: so.id, label: so.title })), (v) => { ui.recipeSong = v; rerender(); }, { 'aria-label': t(l('Música', 'Song')) }),
        h('p', { class: 'muted small' }, t(l('Escolha até 4 ingredientes. Eles somam efeitos; efeitos que os mercados procuram dão bônus no lançamento.', 'Pick up to 4 ingredients. They add up to effects; effects the markets crave boost the release.'))),
        h('div', { class: 'cr-ingredients' }, availableIngredients(s).map((ing) => h('button', { class: `chip-btn ${recipe.includes(ing.id) ? 'on' : ''}`, 'aria-pressed': recipe.includes(ing.id) ? 'true' : 'false', onclick: () => toggle(ing.id) }, t(ing.name), h('small', { class: 'muted' }, ` (${ing.effects.map((e) => t(EFFECTS[e])).join(', ')})`)))),
        h('p', null, h('b', null, t(l('Efeitos: ', 'Effects: '))), effectsOf(recipe).length ? chips(...effectsOf(recipe).map((e) => pill(t(EFFECTS[e])))) : h('span', { class: 'muted' }, '—')),
      ) : h('p', { class: 'muted small' }, t(l('Nenhuma música inédita. Componha primeiro.', 'No unreleased songs. Write some first.'))),
    ),
  );
}

// ------------------------------------------------------------------ encomendas

function commissionsTab(s: GameState): HTMLElement {
  const st = s.x4.creation;
  const acts = playerActs(s);
  if (!acts.includes(ui.commAct)) ui.commAct = acts[0] ?? '';
  const list = [...st.commissions].reverse();
  return section(t(l('Encomendas', 'Commissions')),
    h('p', { class: 'muted small' }, t(l('Jingles, trilhas, temas de novela e de jogos, hinos de clube. Dinheiro previsível; se a entrega não agradar, só o sinal é pago.', 'Jingles, scores, soap and game themes, club anthems. Predictable money; if the delivery disappoints, only the deposit is paid.'))),
    acts.length ? h('div', { class: 'row' }, h('span', { class: 'small' }, t(l('Quem faz:', 'Who delivers:'))), select(ui.commAct, acts.map((id) => ({ value: id, label: s.acts[id].name })), (v) => { ui.commAct = v; rerender(); })) : null,
    list.length ? h('div', { class: 'cards' }, list.slice(0, 12).map((c) => tile('contract', `${t(commissionName(c.kind))} — ${c.client}`, [
      h('small', null, `${$(c.pay)} · ${t(l('qualidade mínima', 'minimum quality'))} ${c.minQ} · ${t(l('prazo semana', 'due week'))} ${c.due}`),
      c.status === 'offered' ? h('div', { class: 'row' }, h('button', { class: 'btn small primary', disabled: !ui.commAct, onclick: () => say(acceptCommission(s, c.id, ui.commAct), l('Encomenda aceita.', 'Commission accepted.')) }, t(l('Aceitar', 'Accept'))), h('button', { class: 'btn small ghost', onclick: () => { declineCommission(s, c.id); rerender(); } }, t(l('Recusar', 'Decline'))))
        : pill(c.status === 'accepted' ? `${t(l('em produção', 'in production'))} · ${s.acts[c.actId ?? '']?.name ?? ''}` : c.status === 'done' ? t(l('entregue', 'delivered')) : c.status === 'failed' ? t(l('reprovada', 'rejected')) : t(l('recusada', 'declined')), c.status === 'done' ? 'good' : c.status === 'failed' ? 'bad' : ''),
    ]))) : h('p', { class: 'muted small' }, t(l('Nenhuma encomenda ainda. Elas chegam todo mês.', 'No commissions yet. They arrive every month.'))),
  );
}

// ------------------------------------------------------------------ parcerias e compositores

function partnersTab(s: GameState): HTMLElement {
  const act = curAct(s);
  const songs = act ? unreleased(s, act.id) : [];
  if (!songs.some((x) => x.id === ui.featSong)) ui.featSong = songs[0]?.id ?? '';
  const song = s.songs[ui.featSong];
  const cands = song ? featureCandidates(s, song) : [];
  if (!cands.some((a) => a.id === ui.featGuest)) ui.featGuest = cands[0]?.id ?? '';
  const st = s.x4.creation;
  return h('div', null,
    section(t(l('Participações e duetos', 'Features and duets')),
      song ? h('div', { class: 'row wrap' },
        select(ui.featSong, songs.map((so) => ({ value: so.id, label: so.title })), (v) => { ui.featSong = v; rerender(); }, { 'aria-label': t(l('Música', 'Song')) }),
        select(ui.featGuest, cands.map((a) => ({ value: a.id, label: `${a.name} (${Math.round(a.fame)}) · ${$(featureFee(s, a))}` })), (v) => { ui.featGuest = v; rerender(); }, { 'aria-label': t(l('Convidado', 'Guest')) }),
        h('button', { class: 'btn primary', disabled: !ui.featGuest, onclick: () => openFeatModal(s, { host: song.actId, song: ui.featSong, guest: ui.featGuest }) }, t(l('Negociar', 'Negotiate'))),
        h('button', { class: 'btn ghost', disabled: !ui.featGuest, title: t(l('Convite rápido com o cachê de tabela, sem negociar.', 'Quick invite at the list fee, no negotiation.')), onclick: () => { toast(t(inviteFeature(s, rngOf(s), ui.featSong, ui.featGuest)), 'info'); rerender(); } }, t(l('Convite rápido', 'Quick invite')))) : h('p', { class: 'muted small' }, t(l('Precisa de uma música inédita.', 'You need an unreleased song.'))),
      h('p', { class: 'muted small' }, t(l('Convidados famosos e de outros gêneros trazem público novo. Selos rivais podem barrar.', 'Famous guests and other genres bring new audiences. Rival labels may block it.'))),
      st.features.length ? h('ul', { class: 'small' }, st.features.slice(-8).reverse().map((f) => h('li', null, `${s.songs[f.songId]?.title ?? '?'} + ${s.acts[f.guestActId]?.name ?? '?'} — `, pill(f.status === 'done' ? t(l('gravada', 'recorded')) : t(l('recusada', 'refused')), f.status === 'done' ? 'good' : 'bad')))) : null,
    ),
    section(t(l('Compositores profissionais', 'Professional songwriters')),
      h('p', { class: 'muted small' }, t(l('Contrate por 6 meses: as músicas compostas pelos seus atos melhoram. Como fantasma, o crédito fica com o artista — até alguém contar.', 'Hire for 6 months: songs written by your acts improve. As a ghostwriter, the credit stays with the artist — until someone talks.'))),
      h('div', { class: 'cards' }, writerPool(s).map((w) => tile('pen', w.name, [
        h('small', null, `${t(FAMILIES.find((f) => f.id === w.style)!.name)} · ${t(l('habilidade', 'skill'))} ${w.skill}`),
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => say(hireWriter(s, w.id, false), l('Compositor contratado.', 'Songwriter hired.')) }, `${t(l('Contratar', 'Hire'))} ${$(money(s, 800 + w.skill * 25))}`), h('button', { class: 'btn small ghost', onclick: () => say(hireWriter(s, w.id, true), l('Fantasma contratado.', 'Ghostwriter hired.')) }, t(l('Como fantasma', 'As ghostwriter')))),
      ]))),
      st.writers.filter((w) => w.until > s.week).length ? h('ul', { class: 'small' }, st.writers.filter((w) => w.until > s.week).map((w) => h('li', null, `${w.name}${w.ghost ? ` (${t(l('fantasma', 'ghost'))})` : ''} · ${w.songs} ${t(l('músicas', 'songs'))} · ${t(l('até a semana', 'until week'))} ${w.until}`))) : null,
    ),
  );
}

// ------------------------------------------------------------------ divisões

function divisionsTab(s: GameState): HTMLElement {
  const st = s.x4.creation;
  return h('div', null,
    section(t(l('Divisões especializadas', 'Specialist divisions')), h('div', { class: 'cards' }, DIVISIONS.filter((d) => s.year >= d.from || st.divisions[d.id]).map((d) => {
      const dv = st.divisions[d.id];
      return tile('cd', t(d.name), [
        dv ? chips(stat('fame', Math.round(dv.prestige), l('Prestígio', 'Prestige')), stat('trophy', dv.awards, l('Prêmios', 'Awards'))) : h('small', null, `${t(l('Abertura', 'Setup'))} ${$(money(s, d.cost * 5))} · ${t(l('custo', 'cost'))} ${$(money(s, d.cost))}/m`),
        dv ? h('button', { class: 'btn small ghost', onclick: () => { closeDivision(s, d.id); rerender(); } }, t(l('Fechar', 'Close'))) : h('button', { class: 'btn small', onclick: () => say(openDivision(s, d.id), l('Divisão aberta.', 'Division opened.')) }, t(l('Abrir', 'Open'))),
      ], { cls: dv ? 'on' : '' });
    }))),
    st.divisionAwards.length ? section(t(l('Prêmios das divisões', 'Division awards')), h('ul', { class: 'small' }, st.divisionAwards.slice(0, 12).map((a) => h('li', { class: a.mine ? 'good' : '' }, `${a.year} · ${t(DIVISIONS.find((d) => d.id === a.division)!.name)}: ${a.title}`)))) : null,
  );
}

// ------------------------------------------------------------------ catálogo: remaster e standards

function catalogTab(s: GameState): HTMLElement {
  const opts = remasterOptions(s);
  const mine = Object.values(s.releases).filter((r) => r.owner === 'player' && s.year - r.year >= 8 && !s.x4.creation.remasters.includes(r.id)).sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 10);
  const std = standards(s);
  return h('div', null,
    section(t(l('Remasterização', 'Remastering')),
      opts.length ? h('p', { class: 'small' }, t(l('Tecnologias disponíveis: ', 'Available technologies: ')), opts.map((o) => t(o.name)).join(', ')) : h('p', { class: 'muted small' }, t(l('Remasterizar faz sentido quando chega uma tecnologia nova de som ou de formato.', 'Remastering makes sense when a new sound or format technology arrives.'))),
      opts.length && mine.length ? h('ul', { class: 'small' }, mine.map((r) => h('li', null, `${r.title} (${r.year}) · ${N(r.totalUnits)} `, h('button', { class: 'btn small', onclick: () => say(remaster(s, rngOf(s), r.id), l('Remaster programado.', 'Remaster scheduled.')) }, t(l('Remasterizar e relançar', 'Remaster and reissue')))))) : null,
    ),
    section(t(l('Standards e domínio público', 'Standards and public domain')),
      h('p', { class: 'muted small' }, t(l('Clássicos regravados por gerações. Em domínio público, regravar não paga autor e o público reconhece.', 'Classics recorded by generation after generation. In the public domain, covers pay no songwriter and audiences recognize them.'))),
      std.length ? h('table', { class: 'tbl compact' }, h('tbody', null, std.map((x) => h('tr', null, h('td', null, `"${x.song.title}"`), h('td', null, actLink(s, x.rel.actId)), h('td', null, String(x.rel.year)), h('td', null, `${x.covers} ${t(l('versões', 'versions'))}`), h('td', null, x.pd ? pill(t(l('domínio público', 'public domain')), 'good') : ''))))) : h('p', { class: 'muted small' }, t(l('Ainda não há clássicos com 20 anos ou mais.', 'No classics 20+ years old yet.'))),
    ),
  );
}

// ------------------------------------------------------------------ mini-jogos: capa, clipe, viral

const FONTS: { id: string; name: L; css: string; eras: [number, number] }[] = [
  { id: 'deco', name: l('Art déco', 'Art deco'), css: '700 22px Georgia, serif', eras: [1920, 1950] },
  { id: 'script', name: l('Cursiva', 'Script'), css: 'italic 22px "Brush Script MT", cursive', eras: [1940, 1965] },
  { id: 'psych', name: l('Psicodélica', 'Psychedelic'), css: '900 24px "Cooper Black", Georgia, serif', eras: [1965, 1978] },
  { id: 'block', name: l('Bloco grosso', 'Heavy block'), css: '900 24px Impact, sans-serif', eras: [1975, 1995] },
  { id: 'neon', name: l('Neon', 'Neon'), css: '700 22px "Trebuchet MS", sans-serif', eras: [1980, 1992] },
  { id: 'grunge', name: l('Máquina de escrever', 'Typewriter'), css: '700 20px "Courier New", monospace', eras: [1988, 2005] },
  { id: 'minimal', name: l('Minimalista', 'Minimal'), css: '300 20px Helvetica, Arial, sans-serif', eras: [2000, 2040] },
];
const BGS = ['#1b1b1f', '#f2e6c9', '#c8462f', '#2a5c8a', '#3a7d44', '#7b3fa0', '#e8b23a', '#101820'];
const ELEMENTS: { id: string; name: L }[] = [
  { id: 'none', name: l('Nada', 'Nothing') }, { id: 'sun', name: l('Sol', 'Sun') }, { id: 'stars', name: l('Estrelas', 'Stars') },
  { id: 'bolt', name: l('Raio', 'Lightning') }, { id: 'stripes', name: l('Listras', 'Stripes') }, { id: 'grid', name: l('Grade', 'Grid') },
];

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function coverScore(s: GameState, c: { bg: string; fg: string; font: string; el: string; photo: boolean }, fame: number): { score: number; notes: L[] } {
  const notes: L[] = [];
  let score = 40;
  const contrast = Math.abs(luminance(c.bg) - luminance(c.fg));
  score += contrast * 30;
  if (contrast < 0.3) notes.push(l('Título difícil de ler.', 'Title hard to read.'));
  const f = FONTS.find((x) => x.id === c.font)!;
  if (s.year >= f.eras[0] && s.year <= f.eras[1]) { score += 12; notes.push(l('Tipografia da época.', 'Period typography.')); } else if (s.year < f.eras[0]) { score += 6; notes.push(l('Tipografia à frente do tempo: arriscado, mas marcante.', 'Typography ahead of its time: risky but striking.')); } else notes.push(l('Tipografia datada.', 'Dated typography.'));
  if (c.photo) { score += fame > 30 ? 10 : 2; if (fame > 30) notes.push(l('Rosto conhecido vende.', 'A known face sells.')); }
  if (c.el !== 'none') score += 5;
  if (c.el === 'grid' && s.year >= 1980 && s.year <= 1990) score += 5;
  if (c.el === 'stars' && s.year >= 1965 && s.year <= 1975) score += 5;
  return { score: Math.max(0, Math.min(100, Math.round(score))), notes };
}

function drawCover(cv: HTMLCanvasElement, c: { bg: string; fg: string; font: string; el: string; photo: boolean }, title: string, actName: string, photoUrl?: string): void {
  const ctx = cv.getContext('2d')!;
  const W = cv.width;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, W);
  ctx.fillStyle = c.fg;
  ctx.globalAlpha = 0.35;
  if (c.el === 'sun') { ctx.beginPath(); ctx.arc(W * 0.7, W * 0.3, W * 0.18, 0, Math.PI * 2); ctx.fill(); }
  if (c.el === 'stars') for (let i = 0; i < 24; i++) ctx.fillRect((i * 53) % W, (i * 97) % W, 3, 3);
  if (c.el === 'bolt') { ctx.beginPath(); ctx.moveTo(W * 0.55, W * 0.1); ctx.lineTo(W * 0.4, W * 0.5); ctx.lineTo(W * 0.52, W * 0.5); ctx.lineTo(W * 0.42, W * 0.9); ctx.lineTo(W * 0.66, W * 0.42); ctx.lineTo(W * 0.54, W * 0.42); ctx.closePath(); ctx.fill(); }
  if (c.el === 'stripes') for (let i = 0; i < W; i += 16) ctx.fillRect(0, i, W, 6);
  if (c.el === 'grid') { for (let i = 0; i < W; i += 16) { ctx.fillRect(i, W / 2, 1, W / 2); ctx.fillRect(0, W / 2 + i / 2, W, 1); } }
  ctx.globalAlpha = 1;
  const finish = () => {
    ctx.fillStyle = c.fg;
    ctx.font = FONTS.find((x) => x.id === c.font)!.css;
    ctx.textAlign = 'center';
    ctx.fillText(title.slice(0, 18), W / 2, W - 34);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(actName.slice(0, 26), W / 2, W - 14);
  };
  if (c.photo && photoUrl) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, W * 0.25, W * 0.12, W * 0.5, W * 0.5); finish(); };
    img.src = photoUrl;
  } else finish();
}

export function openCoverEditor(s: GameState, songId: string): void {
  const so = s.songs[songId];
  const act = so ? s.acts[so.actId] : undefined;
  if (!so || !act) return;
  const lead = act.members.map((id) => s.persons[id]).find(Boolean);
  const photoUrl = lead ? portraitDataUrl(lead, 64, s.year) : undefined;
  const c = { bg: BGS[0], fg: '#f2e6c9', font: FONTS.find((f) => s.year >= f.eras[0] && s.year <= f.eras[1])?.id ?? 'minimal', el: 'none', photo: true };
  openScene(l('Capa do disco', 'Album cover'), (close) => {
    const cv = h('canvas', { width: 200, height: 200, class: 'cr-cover', role: 'img', 'aria-label': t(l('Prévia da capa', 'Cover preview')) }) as HTMLCanvasElement;
    const info = h('div', { class: 'cr-cover-info' });
    const paint = () => {
      drawCover(cv, c, so.title, act.name, photoUrl);
      const sc = coverScore(s, c, act.fame);
      info.replaceChildren(h('p', null, t(l('Impacto previsto: ', 'Expected impact: ')), h('b', null, String(sc.score))), h('ul', { class: 'small' }, sc.notes.map((n) => h('li', null, t(n)))));
    };
    const swatches = (key: 'bg' | 'fg') => h('div', { class: 'row wrap' }, BGS.concat(['#ffffff']).map((col) => h('button', { class: 'swatch', style: `background:${col}`, 'aria-label': col, onclick: () => { c[key] = col; paint(); } })));
    const fontSel = select(c.font, FONTS.filter((f) => f.eras[0] <= s.year || f.id === c.font).map((f) => ({ value: f.id, label: `${t(f.name)} (${f.eras[0]}–${f.eras[1] <= s.year ? f.eras[1] : '…'})` })), (v) => { c.font = v; paint(); }, { 'aria-label': t(l('Tipografia', 'Typography')) });
    const elSel = select(c.el, ELEMENTS.map((e) => ({ value: e.id, label: t(e.name) })), (v) => { c.el = v; paint(); }, { 'aria-label': t(l('Elemento', 'Element')) });
    const photo = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.photo, onchange: (e: Event) => { c.photo = (e.target as HTMLInputElement).checked; paint(); } }), t(l('Foto da banda', 'Band photo')));
    const save = (score: number) => { setCover(s, songId, score); close(); toast(t(l('Capa aprovada.', 'Cover approved.')), 'good'); rerender(); };
    setTimeout(paint, 0);
    return h('div', { class: 'cr-cover-editor' },
      h('div', null, cv, info),
      h('div', { class: 'form' },
        h('label', null, t(l('Fundo', 'Background')), swatches('bg')),
        h('label', null, t(l('Cor do título', 'Title colour')), swatches('fg')),
        h('label', null, t(l('Tipografia', 'Typography')), fontSel),
        h('label', null, t(l('Elemento gráfico', 'Graphic element')), elSel),
        photo,
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', onclick: () => save(coverScore(s, c, act.fame).score) }, t(l('Aprovar capa', 'Approve cover'))),
          h('button', { class: 'btn ghost', onclick: () => save(55 + Math.round(act.fame / 5)) }, t(l('Resolver automático', 'Auto-resolve')))),
      ));
  });
}

function openClipEditor(s: GameState, songId: string): void {
  const picked: string[] = [];
  openScene(l('Roteiro do videoclipe', 'Music video storyboard'), (close) => {
    const board = h('div', { class: 'cr-board' });
    const cost = h('p', { class: 'small' });
    const paint = () => {
      board.replaceChildren(...Array.from({ length: 6 }, (_, i) => h('div', { class: `cr-shot ${picked[i] ? 'on' : ''}` }, h('small', null, `${i + 1}`), picked[i] ? t(SHOTS.find((x) => x.id === picked[i])!.name) : '—')));
      const budget = picked.reduce((t2, id) => t2 + (SHOTS.find((x) => x.id === id)?.cost ?? 0), 0);
      cost.textContent = `${t(l('Custo', 'Cost'))}: ${$(money(s, budget * 1500))} · ${t(l('variedade', 'variety'))} ${new Set(picked).size}/6`;
    };
    setTimeout(paint, 0);
    const done = (shots: string[]) => { const e = shootClip(s, rngOf(s), songId, shots); toast(t(e ?? l('Clipe gravado! Ele vai ajudar o lançamento.', 'Video shot! It will help the release.')), e ? 'warn' : 'good'); close(); rerender(); };
    return h('div', null,
      h('p', { class: 'muted small' }, t(l('Escolha 6 planos. Variedade e planos ousados podem virar lenda — ou fiasco.', 'Pick 6 shots. Variety and bold shots may become legend — or a flop.'))),
      board, cost,
      h('div', { class: 'row wrap' }, SHOTS.map((sh) => h('button', { class: 'btn small', onclick: () => { if (picked.length < 6) picked.push(sh.id); paint(); } }, `${t(sh.name)} (${sh.cost})`))),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost small', onclick: () => { picked.pop(); paint(); } }, t(l('Desfazer', 'Undo'))),
        h('button', { class: 'btn primary', onclick: () => { if (picked.length === 6) done([...picked]); else toast(t(l('Faltam planos.', 'Shots missing.')), 'bad'); } }, t(l('Gravar clipe', 'Shoot video'))),
        h('button', { class: 'btn ghost', onclick: () => done(['band', 'story', 'dance', 'band', 'one_take', 'story']) }, t(l('Resolver automático', 'Auto-resolve')))),
    );
  });
}

function openViral(s: GameState, songId: string): void {
  let start = 45;
  let challenge = 'dance';
  openScene(l('O trecho viral', 'The viral snippet'), (close) => {
    const bar = h('div', { class: 'cr-wave', role: 'img', 'aria-label': t(l('Forma de onda da música', 'Song waveform')) });
    const paint = () => bar.replaceChildren(...Array.from({ length: 60 }, (_, i) => h('i', { class: i >= start * 0.6 && i < start * 0.6 + 9 ? 'on' : '', style: `height:${20 + Math.round(40 * Math.abs(Math.sin(i * 0.7 + songId.length)))}%` })));
    setTimeout(paint, 0);
    const run = () => { toast(t(viralPush(s, rngOf(s), songId, start, challenge)), 'info'); close(); rerender(); };
    return h('div', null,
      h('p', { class: 'muted small' }, t(l('Escolha os 15 segundos e o tipo de desafio. O refrão costuma estar entre 35% e 55% da música.', 'Pick the 15 seconds and the challenge type. The chorus usually sits between 35% and 55% of the song.'))),
      bar,
      h('label', null, `${t(l('Início do trecho', 'Snippet start'))}: `, h('input', { type: 'range', min: 0, max: 85, value: start, oninput: (e: Event) => { start = Number((e.target as HTMLInputElement).value); paint(); } })),
      h('div', { class: 'row wrap' }, CHALLENGES.map((c) => h('button', { class: 'chip-btn', onclick: (e: Event) => { challenge = c.id; (e.currentTarget as HTMLElement).parentElement?.querySelectorAll('.chip-btn').forEach((b) => b.classList.remove('on')); (e.currentTarget as HTMLElement).classList.add('on'); } }, t(c.name)))),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: run }, t(l('Soltar o desafio', 'Launch the challenge'))), h('button', { class: 'btn ghost', onclick: () => { start = 45; challenge = 'dance'; run(); } }, t(l('Resolver automático', 'Auto-resolve')))),
    );
  });
}

function visualsTab(s: GameState): HTMLElement {
  const act = curAct(s);
  if (!act) return h('p', null, '—');
  const songs = act.songs.map((id) => s.songs[id]).filter((so): so is Song => !!so && songStatus(s, so) !== 'discarded').slice(-15).reverse();
  return section(t(l('Capa, clipe e vídeo curto', 'Cover, video and short video')),
    h('p', { class: 'muted small' }, t(l('A capa é escolhida entre três propostas na hora de programar o lançamento; o clipe vale para o lançamento em que a música for a faixa principal.', 'The cover is picked from three proposals when scheduling the release; the video applies to the release where the song is the lead track.'))),
    h('table', { class: 'tbl compact' }, h('tbody', null, songs.map((so) => {
      const x = s.x4.creation.songs[so.id] ?? {};
      return h('tr', null, h('td', null, so.title),
        h('td', null, x.cover !== undefined ? scoreBadge(x.cover / 10) : h('small', { class: 'muted' }, t(l('capa: escolhida ao programar o lançamento', 'cover: picked when scheduling the release')))),
        h('td', null, x.clip ? pill(`${t(l('clipe', 'video'))} ${Math.round(x.clip.result * 50)}`, 'good') : s.year >= 1981 ? h('button', { class: 'btn small', onclick: () => openClipEditor(s, so.id) }, ic('film'), ` ${t(l('Clipe', 'Video'))}`) : h('small', { class: 'muted' }, '—')),
        h('td', null, x.viral ? pill(x.viral.result > 0.5 ? t(l('viralizou', 'went viral')) : t(l('não pegou', "didn't catch on")), x.viral.result > 0.5 ? 'good' : '') : hasTech(s, 'short_video') && so.recorded ? h('button', { class: 'btn small', onclick: () => openViral(s, so.id) }, ic('stream'), ` ${t(l('Viral', 'Viral'))}`) : h('small', { class: 'muted' }, '—')));
    }))),
    s.x4.creation.museum.length ? h('p', { class: 'small' }, `${t(l('Capas icônicas no museu', 'Iconic covers in the museum'))}: ${s.x4.creation.museum.map((id) => s.releases[id]?.title).filter(Boolean).join(', ')}`) : null,
  );
}

// ------------------------------------------------------------------ registro

registerTab('creation', { id: 'cr-themes', label: l('Temas e tendências', 'Themes and trends'), icon: 'chart-up', render: themesTab, order: 61 });
registerTab('creation', { id: 'cr-recipe', label: l('Receita sonora', 'Sound recipe'), icon: 'sparkle', render: recipeTab, order: 62 });
registerTab('creation', { id: 'cr-visuals', label: l('Capa e vídeo', 'Cover and video'), icon: 'camera', render: visualsTab, order: 63 });
registerTab('creation', { id: 'cr-partners', label: l('Parcerias', 'Partners'), icon: 'handshake', render: partnersTab, order: 64 });
registerTab('creation', { id: 'cr-comm', label: l('Encomendas', 'Commissions'), icon: 'contract', render: commissionsTab, order: 65, badge: (s) => s.x4.creation.commissions.filter((c) => c.status === 'offered').length || undefined });
registerTab('creation', { id: 'cr-div', label: l('Divisões', 'Divisions'), icon: 'cd', render: divisionsTab, order: 66 });
registerTab('creation', { id: 'cr-catalog', label: l('Remaster e standards', 'Remasters and standards'), icon: 'disc', render: catalogTab, order: 67 });

/** Cena: as críticas completas do lançamento, reveladas uma a uma, e a nota dos fãs no fim. */
registerCutscene('review', (s, cs, close) => {
  const rel = s.releases[String(cs.data.releaseId)];
  const rv = rel ? s.reviews[rel.id] ?? [] : [];
  const box = h('div', { class: 'cr-reviews' });
  let shown = 0;
  const next = () => {
    if (shown >= rv.length || !rel) return;
    const r = rv[shown++];
    box.querySelectorAll('details').forEach((d) => d.removeAttribute('open'));
    box.appendChild(reviewCard(s, rel, r));
    if (shown === rv.length) {
      const avg = rv.reduce((t2, x) => t2 + x.score, 0) / Math.max(1, rv.length);
      box.appendChild(h('p', { class: 'cr-verdict' }, t(l('Média: ', 'Average: ')), scoreBadge(avg), ' ', avg >= 8 ? t(l('A crítica se rendeu.', 'The critics surrendered.')) : avg >= 6 ? t(l('Recepção boa.', 'Good reception.')) : avg >= 4.5 ? t(l('Recepção morna.', 'Lukewarm reception.')) : t(l('A crítica não perdoou.', 'The critics showed no mercy.'))));
      const sum = reviewSummary(s, rel);
      if (sum) box.appendChild(sum);
      nextBtn.hidden = true;
    }
  };
  const nextBtn = h('button', { class: 'btn primary', onclick: next }, t(l('Próxima crítica', 'Next review')));
  setTimeout(next, 0);
  return h('div', null,
    rel ? h('p', null, h('b', null, rel.title), ' — ', actLink(s, rel.actId)) : null,
    box,
    h('div', { class: 'row' }, nextBtn, h('button', { class: 'btn ghost', onclick: () => { while (shown < rv.length) next(); } }, t(l('Mostrar todas', 'Show all'))), h('button', { class: 'btn ghost', onclick: close }, t(l('Fechar', 'Close')))),
  );
});

export { openViral, openClipEditor, songX };
