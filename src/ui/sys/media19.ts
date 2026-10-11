// Rodada 19 (Frente 9.10/9.11 + WP-I, onda 3 — T9) — páginas "Imprensa e fanzines" (zines19: fanzines, cenas que eles
// criam, sua revista e a linha editorial, críticos que viram editores, arquivo de mídia da época) e "Fraudes e sósias"
// (fakes19: voz-fantasma e dublagem, bandas-fantasma, vozes de IA, leis e crônica real).

import { OUTLETS17 } from '../../data/media17';
import { SCENES17 } from '../../data/heritage17';
import { cityById, genreById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { REAL_FK19, endLip19, fk19, ghostAct19, ghostsLive19, lipOdds19, startLip19, suitCost19, suitOdds19 } from '../../sim/sys/fakes19';
import { media19Counts, showName19, showsNow19 } from '../../sim/sys/media19';
import { FR18 } from '../../sim/sys/tv18';
import { SCENE_HEAT19, buyOutlet19, buyable19, closeZine19, editorPay19, editorsFor19, foundZine19, hireEditor19, outletPrice19, ownOutlet19, sellOutlet19, setLine19, zScenesLive19, zineCost19, zinesLive19, zn19 } from '../../sim/sys/zines19';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const card = (...k: (Node | string | null)[]) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fmtS = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const cn = (c: string) => T(cityById[c]?.name ?? c);
const gn = (g: string) => T(genreById[g]?.name ?? g);
const mine = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
const list = (xs: (Node | string)[]) => h('ul', { class: 'small' }, ...xs.map((x) => h('li', null, x)));

// ================================================================ Imprensa e fanzines
function zinesTab(s: GameState): HTMLElement {
  const st = zn19(s), zs = zinesLive19(s);
  const heat = Object.entries(st.heat).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const cities = [...new Set([s.config.homeCity, ...mine(s).map((a) => a.city)])];
  const genres = [...new Set(mine(s).map((a) => a.genre))].filter((g) => genreById[g] && genreById[g].born <= s.year);
  let city = cities[0], g = genres[0] ?? '', name = '';
  return h('div', null,
    muted(l('Fanzines (1966+) e blogs (2000+) nascem onde um gênero cresce numa cidade. Cada um esquenta a dupla cidade×gênero; com 25 de calor nasce uma cena local: gênero em alta, hype e +5% de apelo para os atos de lá. Cenas em febre atraem gravadoras — e bandas-fantasma.', 'Fanzines (1966+) and blogs (2000+) are born where a genre grows in a city. Each heats the city×genre pair; at 25 heat a local scene is born: the genre rises, hype and +5% appeal for local acts. Hot scenes draw labels — and ghost bands.')),
    s.year >= 1966 ? card(h('b', null, T(l('Fundar um fanzine seu', 'Launch your own fanzine'))),
      row(h('select', { onchange: (e: Event) => { city = (e.target as HTMLSelectElement).value; } }, ...cities.map((c) => h('option', { value: c }, cn(c)))),
        genres.length ? h('select', { onchange: (e: Event) => { g = (e.target as HTMLSelectElement).value; } }, ...genres.map((x) => h('option', { value: x }, gn(x)))) : muted(l('Sem gênero (contrate atos).', 'No genre (sign acts).')),
        h('input', { type: 'text', placeholder: T(l('Nome', 'Name')), oninput: (e: Event) => { name = (e.target as HTMLInputElement).value; } }),
        btn(fmtS(l('Fundar ({c})', 'Launch ({c})'), { c: $(zineCost19(s)) }), () => say(foundZine19(s, city, g, name)), !genres.length))) : muted(l('Fanzines de música ainda não existem (1966+).', 'Music fanzines do not exist yet (1966+).')),
    section(t(l('Fanzines e blogs na ativa', 'Active fanzines and blogs')), zs.length ? h('div', null, ...zs.slice(-20).reverse().map((z) => row(h('b', null, z.name), pill(z.k === 'blog' ? 'blog' : 'zine'), cn(z.city), ' · ', gn(z.g), ` · ${T(l('alcance', 'reach'))} ${z.reach}`,
      z.by === 'player' ? pill(t(l('seu', 'yours')), 'good') : null, z.by === 'player' ? btn(l('Fechar', 'Close'), () => say(closeZine19(s, z.id))) : null))) : muted(l('Nenhum ainda.', 'None yet.'))),
    section(t(l('Calor das cenas (cidade × gênero)', 'Scene heat (city × genre)')), heat.length ? list(heat.map(([k, v]) => { const [c, gg] = k.split('|'); return why18(s, 'zn19.heat', { c, g: gg }, `${cn(c)} · ${gn(gg)}: ${Math.round(v)}/${SCENE_HEAT19}`); })) : muted(l('Nada esquentando.', 'Nothing heating up.'))),
    section(t(l('Cenas criadas pelos fanzines', 'Scenes born from fanzines')), zScenesLive19(s).length ? list(zScenesLive19(s).map((x) => `${cn(x.city)} · ${gn(x.g)} (${x.y}–${x.to})`)) : muted(l('Nenhuma ainda.', 'None yet.'))));
}
function outletTab(s: GameState): HTMLElement {
  const st = zn19(s), o = ownOutlet19(s);
  if (st.own && o) {
    const eds = editorsFor19(s).slice(0, 8);
    return h('div', null,
      card(row(h('b', null, o.real && s.config.realNames ? `${o.name} (≈ ${o.real})` : o.name), pill(T(st.own.line === 'house' ? l('linha da casa', 'house line') : l('linha independente', 'independent line')), st.own.line === 'house' ? 'warn' : 'good'),
        st.own.ed ? pill(fmtS(l('editor: {e}', 'editor: {e}'), { e: st.own.ed })) : null),
        row(`${T(l('Alcance', 'Reach'))} ${o.reach} · ${T(l('credibilidade', 'credibility'))} ${o.cred} · `, why18(s, 'zn19.coi', {}, fmtS(l('conflito de interesse {v}', 'conflict of interest {v}'), { v: Math.round(st.coi) }))),
        row(btn(l('Linha independente', 'Independent line'), () => say(setLine19(s, 'indep')), st.own.line === 'indep'), btn(l('Linha da casa (empurra seus discos)', 'House line (pushes your records)'), () => say(setLine19(s, 'house')), st.own.line === 'house'), btn(l('Vender a revista', 'Sell the magazine'), () => say(sellOutlet19(s))))),
      section(t(l('Contratar um crítico como editor', 'Hire a critic as editor')), eds.length ? h('div', null, ...eds.map((c) => row(h('b', null, c.name), ` (${c.outlet}) · ${c.favors.join(', ')} · ${$(editorPay19(s, c.prestige))}/${T(l('mês', 'mo'))}`, btn(l('Contratar', 'Hire'), () => say(hireEditor19(s, c.name)), st.own?.ed === c.name)))) : muted(l('Nenhum crítico disponível no mercado da revista.', 'No critic available in the magazine\'s market.'))));
  }
  const xs = buyable19(s).sort((a, b) => b.reach - a.reach).slice(0, 20);
  return h('div', null,
    muted(l('Compre uma revista existente: receita de vendas e anúncios, voz própria — e o risco de usá-la para elogiar os próprios discos (conflito de interesse). No modo "Vida real exata", os veículos reais não estão à venda.', 'Buy an existing magazine: sales and ad income, a voice of your own — and the risk of using it to praise your own records (conflict of interest). In "Exact real life", real outlets are not for sale.')),
    xs.length ? h('div', null, ...xs.map((o) => row(h('b', null, o.real && s.config.realNames ? `${o.name} (≈ ${o.real})` : o.name), pill(o.kind), ` ${o.market} · ${T(l('alcance', 'reach'))} ${o.reach} · cred ${o.cred}`, btn(fmtS(l('Comprar ({p})', 'Buy ({p})'), { p: $(outletPrice19(s, o)) }), () => say(buyOutlet19(s, o.id)))))) : muted(l('Nada à venda nesta época.', 'Nothing for sale in this era.')));
}
function editorsTab(s: GameState): HTMLElement {
  const st = zn19(s);
  const eds = Object.entries(st.ed);
  return h('div', null,
    muted(l('Críticos viram editores e a revista passa a favorecer os gêneros deles: discos dessas famílias ganham +2% de apelo quando o veículo é grande (alcance 60+).', 'Critics become editors and the magazine starts favouring their genres: records in those families get +2% appeal when the outlet is big (reach 60+).')),
    eds.length ? list(eds.map(([oid, e]) => `${OUTLETS17.find((o) => o.id === oid)?.name ?? oid}: ${e.c} (${e.y}) — ${e.fav.join(', ')}`)) : muted(l('Nenhum ainda.', 'None yet.')),
    section(t(l('Diário da redação', 'Newsroom log')), st.log.length ? list(st.log.slice(0, 15).map(([y, m, x]) => `${y}/${m + 1} — ${t(x)}`)) : muted(l('Nada ainda.', 'Nothing yet.'))));
}
const CNT19: Record<string, L> = { events: l('eventos', 'events'), situations: l('situações', 'situations'), outlets: l('veículos', 'outlets'), formats: l('programas e concursos', 'shows and contests'), covers: l('covers/samples', 'covers/samples'), scenes: l('cenas locais', 'local scenes'), relics: l('relíquias', 'relics'), orgs: l('organizações', 'organisations'), chronicles: l('crônicas do crime', 'crime chronicles') };
function archiveTab(s: GameState): HTMLElement {
  const c = media19Counts();
  const outs = OUTLETS17.filter((o) => s.year >= o.from && s.year <= o.to);
  const shows = showsNow19(s);
  const fr = FR18.filter((f) => s.year >= f.from && s.year <= f.to);
  const scenes = SCENES17.filter((x) => s.year >= x[3] && s.year <= x[4]);
  return h('div', null,
    row(...Object.entries(c).map(([k, v]) => pill(`${T(CNT19[k] ?? l(k, k))}: ${v}`))),
    section(t(l('Veículos da época', 'Outlets of the era')), list(outs.slice(0, 40).map((o) => `${o.real && s.config.realNames ? `${o.name} (≈ ${o.real})` : o.name} — ${o.kind}, ${o.market}: ${t(o.desc)}`))),
    section(t(l('Programas no ar', 'Shows on air')), shows.length ? list(shows.map((x) => `${showName19(s, x)} (${x.mk.join(', ')}) — ${t(x.desc)}`)) : muted(l('Nenhum programa-vitrine ainda.', 'No showcase programme yet.'))),
    section(t(l('Concursos e festivais da canção', 'Contests and song festivals')), fr.length ? list(fr.map((f) => `${s.config.realNames ? f.real : t(f.alt)} (${f.mk.join(', ')}) — ${t(f.desc)}`)) : muted(l('Nenhum ainda.', 'None yet.'))),
    section(t(l('Cenas locais ativas', 'Active local scenes')), scenes.length ? list(scenes.map((x) => `${t(l(x[5], x[6]))} (${x[3]}–${x[4]}) — ${t(l(x[7], x[8]))}`)) : muted(l('Nenhuma.', 'None.'))));
}
function zinesPage(s: GameState): HTMLElement {
  return h('div', null, h('h2', null, t(l('Imprensa e fanzines', 'Press and fanzines'))),
    tabs('zines19', [
      { id: 'z', label: t(l('Fanzines e cenas', 'Fanzines and scenes')), badge: zinesLive19(s).filter((z) => z.by === 'player').length || undefined, render: () => zinesTab(s) },
      { id: 'o', label: t(l('Sua revista', 'Your magazine')), render: () => outletTab(s) },
      { id: 'e', label: t(l('Críticos e editores', 'Critics and editors')), render: () => editorsTab(s) },
      { id: 'a', label: t(l('Arquivo da mídia', 'Media archive')), render: () => archiveTab(s) },
    ], rerender));
}
registerArea({ id: 'zines19', label: l('Imprensa e fanzines', 'Press and fanzines'), icon: 'newspaper', key: '', render: zinesPage, badge: (s) => (zn19(s).coi >= 30 ? 1 : undefined) });

// ================================================================ Fraudes e sósias
function lipTab(s: GameState): HTMLElement {
  const st = fk19(s);
  const acts = mine(s).filter((a) => !a.playerBand);
  return h('div', null,
    muted(l('Voz-fantasma: um cantor de estúdio grava escondido e o ato só dubla. Discos +10% de apelo; o risco sobe todo mês com a fama e a cada playback na TV. Exposto: escândalo, reembolsos, fãs embora e prêmios dos últimos 5 anos cassados.', 'Ghost voice: a session singer records in secret and the act just mimes. Records get +10% appeal; the risk rises every month with fame and with each TV playback. Exposed: scandal, refunds, fans leaving and awards from the last 5 years revoked.')),
    acts.length ? h('div', null, ...acts.map((a) => {
      const x = st.lip.find((y) => y.act === a.id && !y.exp);
      return card(row(actLink(s, a.id), x ? pill(t(x.end ? l('parado (risco esfriando)', 'stopped (risk cooling)') : l('voz-fantasma ativa', 'ghost voice active')), 'warn') : null,
        x ? why18(s, 'fk19.risk', { a: a.id }, fmtS(l('risco {r} ({p}%/mês)', 'risk {r} ({p}%/mo)'), { r: Math.round(x.risk), p: Math.round(lipOdds19(x) * 100) })) : null,
        !x ? btn(l('Usar voz-fantasma', 'Use a ghost voice'), () => say(startLip19(s, a.id))) : null,
        x && !x.end ? btn(l('Parar em silêncio', 'Stop quietly'), () => say(endLip19(s, a.id, 'quiet'))) : null,
        x ? btn(l('Confessar', 'Confess'), () => say(endLip19(s, a.id, 'confess'))) : null));
    })) : muted(l('Sem atos no selo.', 'No acts on the label.')),
    section(t(l('Expostos', 'Exposed')), st.lip.filter((x) => x.exp && x.risk > 0).length ? list(st.lip.filter((x) => x.exp).slice(-12).reverse().map((x) => `${s.acts[x.act]?.name ?? '?'} (${x.by === 'player' ? T(l('seu selo', 'your label')) : 'NPC'})`)) : muted(l('Ninguém ainda.', 'No one yet.'))),
    section(t(l('Prêmios cassados', 'Revoked awards')), st.rev.length ? list(st.rev.slice(0, 10).map(([y, a, n]) => `${y}: ${s.acts[a]?.name ?? '?'} (${n})`)) : muted(l('Nenhum.', 'None.'))));
}
function ghostTab(s: GameState): HTMLElement {
  const st = fk19(s), live = ghostsLive19(s);
  const ended = st.gb.filter((g) => g.end).slice(-10).reverse();
  return h('div', null,
    muted(l('Bandas-fantasma excursionam com o nome de um ato famoso que sumiu (separação, hiato, morte) ou se dizem "da cena" que virou febre. Se o nome é seu: processar, licenciar como tributo oficial ou ignorar. Três num mercado e passa uma lei de propaganda enganosa.', 'Ghost bands tour under the name of a famous act that disappeared (split, hiatus, death) or claim to be "from the scene" in a craze. If the name is yours: sue, license it as an official tribute or ignore it. Three in one market and a false-advertising law passes.')),
    live.length ? h('div', null, ...live.map((g) => {
      const a = g.of ? s.acts[g.of] : undefined, own = !!a && (a.owner === 'player') && !a.playerBand;
      return card(row(h('b', null, `"${g.name}"`), pill(T(g.k === 'scene' ? l('febre de cena', 'scene craze') : l('nome famoso', 'famous name'))), cn(g.city), a ? actLink(s, a.id) : null, g.lic ? pill(t(l('licenciada', 'licensed')), 'good') : null,
        g.court ? pill(fmtS(l('sentença em {w} sem.', 'ruling in {w} wks'), { w: g.court - s.week }), 'warn') : null),
        own && !g.lic && !g.court ? row(why18(s, 'fk19.suit', { g: g.id }, btn(fmtS(l('Processar ({c}, {p}%)', 'Sue ({c}, {p}%)'), { c: $(suitCost19(s)), p: Math.round(suitOdds19(s, g) * 100) }), () => say(ghostAct19(s, g.id, 'sue')))), btn(l('Licenciar', 'License'), () => say(ghostAct19(s, g.id, 'license')))) : null);
    })) : muted(l('Nenhuma banda-fantasma na estrada.', 'No ghost band on the road.')),
    ended.length ? section(t(l('Encerradas', 'Ended')), list(ended.map((g) => `"${g.name}" — ${g.why ? t(g.why) : ''}`))) : null);
}
function lawTab(s: GameState): HTMLElement {
  const st = fk19(s);
  const laws = Object.entries(st.law);
  const real = REAL_FK19.filter((x) => s.year > x.y || (s.year === x.y && s.month >= x.m));
  return h('div', null,
    muted(l('Pressão por lei por mercado: cada banda-fantasma soma 1 (1,5 se nasce de uma febre de cena), cada despedida falsa 0,5; com 3, passa a lei de propaganda enganosa. Vozes de IA sem autorização: 3 num mercado e a voz vira direito protegido. No modo exato, só as leis reais (EUA 2006 e 2024).', 'Law pressure per market: each ghost band adds 1 (1.5 if born from a scene craze), each fake farewell 0.5; at 3, a false-advertising law passes. Unauthorised AI voices: 3 in one market and the voice becomes a protected right. In exact mode, only the real laws (US 2006 and 2024).')),
    row(...Object.entries(st.pr).filter(([, v]) => v > 0.1).map(([k, v]) => pill(`${k}: ${v.toFixed(1)}/3`)), ...Object.entries(st.ai).map(([k, v]) => pill(`IA ${k}: ${v}/3`))),
    section(t(l('Leis aprovadas', 'Laws passed')), laws.length ? list(laws.map(([k, y]) => `${y} — ${k.startsWith('t:') ? T(l('propaganda enganosa', 'false advertising')) : T(l('voz de IA', 'AI voice'))} (${k.slice(2)})`)) : muted(l('Nenhuma ainda.', 'None yet.'))),
    section(t(l('A história real', 'The real history')), real.length ? list(real.map((x) => `${x.y} — ${t(x.text)}`)) : muted(l('Nada ainda nesta época.', 'Nothing yet in this era.'))),
    section(t(l('Diário das fraudes', 'Fraud log')), st.log.length ? list(st.log.slice(0, 15).map(([y, m, x]) => `${y}/${m + 1} — ${t(x)}`)) : muted(l('Nada ainda.', 'Nothing yet.'))));
}
function fakesPage(s: GameState): HTMLElement {
  return h('div', null, h('h2', null, t(l('Fraudes e sósias', 'Frauds and impostors'))),
    tabs('fakes19', [
      { id: 'l', label: t(l('Voz-fantasma e dublagem', 'Ghost voices and miming')), render: () => lipTab(s) },
      { id: 'g', label: t(l('Bandas-fantasma', 'Ghost bands')), badge: ghostsLive19(s).filter((g) => g.of && s.acts[g.of]?.owner === 'player' && !g.lic).length || undefined, render: () => ghostTab(s) },
      { id: 'w', label: t(l('Leis e história', 'Laws and history')), render: () => lawTab(s) },
    ], rerender));
}
registerArea({ id: 'fakes19', label: l('Fraudes e sósias', 'Frauds and impostors'), icon: 'alert', key: '', render: fakesPage,
  badge: (s) => fk19(s).lip.filter((x) => x.by === 'player' && !x.exp && !x.end && x.risk >= 30).length || undefined });
