// Rodada 17 (D) — página "Notícias e boatos": feed com origem (veículo, colunista, informante, paparazzo),
// verdade, status (aberto/confirmado/desmentido/retratado), alcance por país e respostas com chance e custo;
// ferramentas para criar (plantar boato, exclusiva, entrevista, detetive, vender segredo); veículos com linha
// editorial, alcance, credibilidade, posição, dono e sua relação; críticos (reais por era) e processos.
// Também a aba "Na imprensa" na página do artista.

import { countryName } from '../../data/geo';
import { COUNTRY_INFO } from '../../data/countries';
import { FAMILIES, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { relWith } from '../../sim/criticrel';
import { holdsOf } from '../../sim/holds17';
import { activeCritics } from '../../sim/media';
import { KIND17, LINE17, outletName, type O17 } from '../../sim/outlets17';
import { CRITICS17 } from '../../data/media17';
import { press } from '../../sim/sys/press9';
import {
  court, courtOdds, feed17, interview, interviewOdds, m17, outlets17, plantOdds, plantRumor, releaseNews, releaseOdds, respond, respondOdds,
  sellOdds, sellSecret, stakeout, stakeoutOdds, storyOutlet, storyWeight, tplsIn, REAL_CRITICS, type Court, type Odds, type Resp, type Story,
} from '../../sim/sys/media17';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, monthName, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerArea, registerPageTab } from '../registry';

const ST_NAME: Record<Story['st'], [L, string]> = {
  open: [l('em aberto', 'open'), 'warn'], confirmed: [l('confirmado', 'confirmed'), ''], denied: [l('desmentido', 'denied'), 'good'],
  debunked: [l('era mentira', 'debunked'), 'good'], retracted: [l('retratado', 'retracted'), 'good'], killed: [l('abafado', 'killed'), 'trait'], faded: [l('esquecido', 'faded'), 'muted'],
};
const SRC_NAME: Record<Story['src'], L> = {
  fact: l('apuração', 'reporting'), insider: l('informante', 'insider'), paparazzi: l('paparazzi', 'paparazzi'), player: l('comunicado', 'press release'),
  npc: l('fofoca de bastidor', 'backstage gossip'), columnist: l('coluna de fofoca', 'gossip column'), hoax: l('teoria de fã', 'fan theory'),
};
const kindOf = (x: Story): [L, string] => x.news ? (x.src === 'paparazzi' ? [l('Paparazzi', 'Paparazzi'), 'trait'] : x.tpl === 'exclusive' ? [l('Exclusiva', 'Exclusive'), 'gold'] : [l('Notícia', 'News'), '']) : x.src === 'fact' ? [l('Boato', 'Rumor'), 'warn'] : [l('Fofoca', 'Gossip'), 'warn'];
const pct = (p: number) => `${Math.round(p * 100)}%`;
const stanceTxt = (v: number): string => t(v >= 0.25 ? l('conservador', 'conservative') : v <= -0.25 ? l('progressista', 'progressive') : l('neutro', 'neutral'));
const relTxt = (v: number) => h('b', { class: v >= 10 ? 'good' : v <= -10 ? 'bad' : '' }, `${v > 0 ? '+' : ''}${Math.round(v)}`);

function oddsLine(od: Odds): HTMLElement {
  return h('div', { class: 'small' },
    od.cost > 0 ? pill(`${t(l('custo', 'cost'))} ${$(od.cost)}`) : od.cost < 0 ? pill(`${t(l('recebe', 'get'))} ${$(-od.cost)}`, 'good') : null, ' ',
    pill(`${t(l('chance', 'odds'))} ${pct(od.p)}`, od.p >= 0.6 ? 'good' : od.p < 0.3 ? 'bad' : ''), ' ',
    od.trace ? pill(`${t(l('rastreiam até você', 'traced to you'))} ${pct(od.trace)}`, od.trace >= 0.3 ? 'bad' : 'warn') : null, ' ',
    od.suit ? pill(`${t(l('processo se rastrearem', 'lawsuit if traced'))} ${pct(od.suit)}`, 'bad') : null, ' ',
    od.truth === null ? null : pill(t(od.truth ? l('você sabe: é verdade', 'you know: true') : l('você sabe: é mentira', 'you know: false')), od.truth ? 'good' : 'bad'),
    od.notes.length ? h('ul', { class: 'muted' }, od.notes.map((n) => h('li', null, t(n)))) : null);
}
const act = (s: GameState, f: () => { ok: boolean; text: L }) => { const r = f(); toast(t(r.text), r.ok ? 'info' : 'bad'); rerender(); };

// ---------------------------------------------------------------- cartão de história

const RESP: [Resp, L][] = [['deny', l('Desmentir', 'Deny')], ['confirm', l('Assumir', 'Own it')], ['kill', l('Abafar (comprar)', 'Kill (buy it)')], ['sue', l('Processar', 'Sue')], ['silent', l('Sem comentários', 'No comment')]];
function storyCard(s: GameState, x: Story): HTMLElement {
  const o = storyOutlet(s, x);
  const mine = !!x.a && playerActs(s).includes(x.a);
  const known = mine || x.mine || x.st === 'confirmed' || x.st === 'debunked' || x.st === 'retracted';
  const [kn, kc] = kindOf(x), [sn, sc] = ST_NAME[x.st];
  const reach = x.reach.slice(0, 8).map((a3) => t(countryName(a3))).join(', ') + (x.reach.length > 8 ? ` +${x.reach.length - 8}` : '');
  const btns = mine ? RESP.map(([v, n]) => { const od = respondOdds(s, x.id, v); return od.ok ? h('button', { class: 'btn small', title: od.notes.map((z) => t(z)).join(' '), onclick: () => act(s, () => respond(s, x.id, v)) }, `${t(n)}${v === 'silent' || v === 'deny' || v === 'confirm' ? '' : ` · ${pct(od.p)}`}${od.cost > 0 ? ` · ${$(od.cost)}` : ''}`) : null; }).filter(Boolean) : [];
  return h('div', { class: `eval ${x.tone < 0 ? 'bad' : x.tone > 0 ? 'good' : ''}` },
    h('div', { class: 'row wrap', style: 'gap:.3rem;align-items:center' }, pill(t(kn), kc), pill(t(sn), sc), x.mine ? pill(t(l('obra sua', 'your doing')), 'gold') : null, h('b', null, t(x.t))),
    h('div', { class: 'small muted' },
      `${t(l('Fonte', 'Source'))}: ${o ? `${outletName(o)} (${t(KIND17[o.kind])}, ${t(LINE17[o.line][0])})` : '?'} · ${t(SRC_NAME[x.src])}${x.via ? ` — ${x.via}` : ''} · ${t(l('credibilidade', 'credibility'))} ${Math.round(x.cred)} · ${monthName(x.m)} ${x.y}`),
    h('div', { class: 'small' },
      x.a ? actLink(s, x.a) : null, x.b ? ' · ' : null, x.b ? actLink(s, x.b) : null, ' · ',
      `${t(l('Verdade', 'True'))}: ${known ? t(x.truth ? l('sim', 'yes') : l('não', 'no')) : '?'}`, ' · ',
      `${t(l('Espalhado em', 'Spread to'))} ${x.reach.length} ${t(l('país(es)', 'country(ies)'))}: ${reach}`,
      x.tone ? ` · ${t(l('peso na fama local por país ~{w}', 'local fame weight per country ~{w}'), { w: `${x.tone < 0 ? '−' : '+'}${storyWeight(x)}` })}` : ''),
    x.why ? h('p', { class: 'small muted' }, t(x.why)) : null,
    x.resp && mine ? h('p', { class: 'small muted' }, t(l('Sua resposta: {r}', 'Your answer: {r}'), { r: t(RESP.find((z) => z[0] === x.resp)?.[1]) })) : null,
    btns.length ? h('div', { class: 'row wrap' }, ...btns) : null);
}

// ---------------------------------------------------------------- abas

let tab = 'feed', filt = '*';
const F = { tgt: '', tpl: '', out: '', own: '', rout: '', iout: '', stk: '', sout: '', okind: '*' };
const FILTERS: [string, L][] = [['*', l('Tudo', 'All')], ['mine', l('Seus artistas', 'Your acts')], ['open', l('Boatos em aberto', 'Open rumors')], ['confirmed', l('Confirmados', 'Confirmed')], ['false', l('Desmentidos', 'Debunked')]];

function feedTab(s: GameState): HTMLElement {
  const p = press(s);
  const hl = p.hl.filter((x) => x.y * 12 + x.m >= s.year * 12 + s.month - 1).slice(-4).reverse();
  let list = feed17(s, { mine: filt === 'mine', open: filt === 'open' });
  if (filt === 'confirmed') list = list.filter((x) => x.st === 'confirmed' && !x.news);
  if (filt === 'false') list = list.filter((x) => x.st === 'debunked' || x.st === 'retracted' || x.st === 'denied');
  return h('div', null,
    hl.length ? section(t(l('Manchetes do mês', 'This month\'s headlines')), h('ul', null, hl.map((x) => h('li', null, t(x.t))))) : null,
    h('div', { class: 'row wrap' }, FILTERS.map(([k, n]) => h('button', { class: `btn small ${filt === k ? 'primary' : 'ghost'}`, onclick: () => { filt = k; rerender(); } }, t(n)))),
    list.length ? h('div', null, list.slice(0, 40).map((x) => storyCard(s, x))) : h('p', { class: 'muted' }, t(l('Nada por aqui ainda.', 'Nothing here yet.'))));
}

function sel(val: string, set: (v: string) => void, opts: [string, string][], ph?: string): HTMLElement {
  return h('select', { onchange: (e: Event) => { set((e.target as HTMLSelectElement).value); rerender(); } }, ph ? h('option', { value: '' }, ph) : null, ...opts.map(([v, n]) => h('option', { value: v, selected: v === val }, n)));
}
function createTab(s: GameState): HTMLElement {
  const outs = outlets17(s).slice().sort((a, b) => b.reach - a.reach);
  const oOpt = (pred: (o: O17) => boolean = () => true): [string, string][] => outs.filter(pred).map((o) => [o.id, `${outletName(o)} — ${t(KIND17[o.kind])}${o.mine ? ` (${t(l('seu', 'yours'))})` : ''}`]);
  const mineIds = playerActs(s);
  const famous = Object.values(s.acts).filter((a) => (a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus') && (a.fame >= 25 || mineIds.includes(a.id))).sort((a, b) => b.fame - a.fame).slice(0, 80);
  const aOpt = (xs = famous): [string, string][] => xs.map((a) => [a.id, `${a.name} (${Math.round(a.fame)})${mineIds.includes(a.id) ? ' ★' : ''}`]);
  const tpls = tplsIn(s.year);
  F.tgt ||= famous.find((a) => !mineIds.includes(a.id))?.id ?? ''; F.tpl ||= tpls[0]?.id ?? ''; F.out ||= outs.find((o) => o.line === 'tabloid')?.id ?? outs[0]?.id ?? '';
  F.own ||= mineIds[0] ?? ''; F.rout ||= outs[0]?.id ?? ''; F.iout ||= outs.find((o) => o.kind === 'magazine')?.id ?? outs[0]?.id ?? '';
  F.stk ||= famous.find((a) => !mineIds.includes(a.id))?.id ?? ''; F.sout ||= outs.find((o) => o.line === 'tabloid' && !o.mine)?.id ?? '';
  const po = plantOdds(s, F.tgt, F.tpl, F.out);
  const ro = releaseOdds(s, F.own, F.rout, true), ra = releaseOdds(s, F.own, F.rout, false);
  const io = interviewOdds(s, F.own, F.iout);
  const so = stakeoutOdds(s, F.stk);
  const secrets = holdsOf(s, 'player').has.filter((x) => x.kind === 'secret' && x.status === 'open');
  const btn = (od: Odds, label: L, fn: () => { ok: boolean; text: L }) => h('button', { class: 'btn small primary', disabled: !od.ok, title: od.why ? t(od.why) : '', onclick: () => act(s, fn) }, od.ok ? t(label) : t(od.why ?? l('Indisponível', 'Unavailable')));
  return h('div', null,
    section(t(l('Plantar boato ou fofoca', 'Plant a rumor or gossip')),
      h('p', { class: 'small muted' }, t(l('Sobre rivais (ou golpe de publicidade com o seu artista). Verdade vira escândalo quando confirmada; mentira é desmentida, derruba a credibilidade do veículo e pode virar processo contra você se rastrearem.', 'About rivals (or a publicity stunt with your own act). Truth becomes a scandal when confirmed; lies get debunked, hurt the outlet\'s credibility and may become a lawsuit against you if traced.'))),
      h('div', { class: 'row wrap' }, sel(F.tgt, (v) => { F.tgt = v; }, aOpt()), sel(F.tpl, (v) => { F.tpl = v; }, tpls.map((x) => [x.id, t(x.name)])), sel(F.out, (v) => { F.out = v; }, oOpt())),
      oddsLine(po), btn(po, l('Plantar', 'Plant it'), () => plantRumor(s, F.tgt, F.tpl, F.out))),
    mineIds.length ? section(t(l('Soltar notícia ou exclusiva', 'Release news or an exclusive')),
      h('div', { class: 'row wrap' }, sel(F.own, (v) => { F.own = v; }, aOpt(mineIds.map((id) => s.acts[id]).filter(Boolean))), sel(F.rout, (v) => { F.rout = v; }, oOpt())),
      oddsLine(ro), h('div', { class: 'row wrap' }, btn(ro, l('Dar exclusiva', 'Give an exclusive'), () => releaseNews(s, F.own, F.rout, true)), btn(ra, l('Comunicado geral', 'General press release'), () => releaseNews(s, F.own, F.rout, false)))) : null,
    mineIds.length ? section(t(l('Entrevista de capa', 'Cover interview')),
      h('div', { class: 'row wrap' }, sel(F.own, (v) => { F.own = v; }, aOpt(mineIds.map((id) => s.acts[id]).filter(Boolean))), sel(F.iout, (v) => { F.iout = v; }, oOpt((o) => o.kind !== 'social' && o.kind !== 'fanzine'))),
      oddsLine(io), btn(io, l('Marcar entrevista', 'Book the interview'), () => interview(s, F.own, F.iout))) : null,
    section(t(s.year < 1960 ? l('Detetive particular', 'Private eye') : l('Paparazzo exclusivo', 'Dedicated paparazzo')),
      h('div', { class: 'row wrap' }, sel(F.stk, (v) => { F.stk = v; }, aOpt(famous.filter((a) => !mineIds.includes(a.id))))),
      oddsLine(so), btn(so, l('Contratar por um mês', 'Hire for a month'), () => stakeout(s, F.stk))),
    section(t(l('Vender segredo a um tabloide', 'Sell a secret to a tabloid')),
      secrets.length ? h('div', null, h('div', { class: 'row wrap' }, sel(F.sout, (v) => { F.sout = v; }, oOpt((o) => !o.mine && (o.line === 'tabloid' || o.line === 'fan')))),
        secrets.map((hd) => { const od = sellOdds(s, hd.id, F.sout); return h('div', { class: 'eval' }, h('b', null, t(hd.text)), oddsLine(od), btn(od, l('Vender', 'Sell'), () => sellSecret(s, hd.id, F.sout))); }))
        : h('p', { class: 'small muted' }, t(l('Você não tem segredos de ninguém. Detetive, informantes e intrigas rendem segredos (aba Fatos & Obrigações).', 'You hold nobody\'s secrets. Private eyes, insiders and intrigue yield secrets (Facts & Obligations tab).')))));
}

const KF: [string, L][] = [['*', l('Todos', 'All')], ['tabloid', l('Tabloides', 'Tabloids')], ['serious', l('Sérios', 'Serious')], ['tv', l('TV e rádio', 'TV and radio')], ['social', l('Redes e blogs', 'Networks and blogs')]];
function outletsTab(s: GameState): HTMLElement {
  const st = m17(s);
  const list = outlets17(s).filter((o) => F.okind === '*' || (F.okind === 'tabloid' ? o.line === 'tabloid' : F.okind === 'serious' ? o.line === 'serious' || o.line === 'trade' || o.line === 'underground' : F.okind === 'tv' ? o.kind === 'tv' || o.kind === 'radio' : o.kind === 'social' || o.kind === 'blog' || o.kind === 'fanzine')).sort((a, b) => b.reach - a.reach);
  const cbtn = (o: O17, v: Court, n: L) => { const od = courtOdds(s, o.id, v); return h('button', { class: 'btn small ghost', disabled: !od.ok, title: od.notes.map((z) => t(z)).join(' ') || (od.why ? t(od.why) : ''), onclick: () => act(s, () => court(s, o.id, v)) }, `${t(n)}${od.ok ? ` ${$(od.cost)}` : ''}`); };
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Cada veículo tem linha editorial, alcance (quanto espalha), credibilidade (quanto pesa; cai quando publica mentira), posição e dono. Conglomerados (selos donos de revista/TV) protegem os artistas do grupo e puxam as notas deles. Sua relação com os veículos sérios mexe nas resenhas dos seus discos (até ±0,4).', 'Each outlet has an editorial line, reach (how far it spreads), credibility (how much it weighs; drops when it prints lies), stance and owner. Conglomerates (labels owning magazines/TV) protect their acts and lift their scores. Your relationship with serious outlets moves your records\' reviews (up to ±0.4).'))),
    h('div', { class: 'row wrap' }, KF.map(([k, n]) => h('button', { class: `btn small ${F.okind === k ? 'primary' : 'ghost'}`, onclick: () => { F.okind = k; rerender(); } }, t(n)))),
    h('table', { class: 'tbl small' },
      h('thead', null, h('tr', null, ...[l('Veículo', 'Outlet'), l('Tipo', 'Type'), l('Linha', 'Line'), l('Mercado', 'Market'), l('Alcance', 'Reach'), l('Credib.', 'Cred.'), l('Posição', 'Stance'), l('Dono', 'Owner'), l('Relação', 'Relation'), l('', '')].map((x) => h('th', null, t(x))))),
      h('tbody', null, list.slice(0, 70).map((o) => h('tr', null,
        h('td', { title: o.desc ? t(o.desc) : '' }, outletName(o)), h('td', null, t(KIND17[o.kind])), h('td', { title: t(LINE17[o.line][1]) }, t(LINE17[o.line][0])), h('td', null, o.market),
        h('td', null, String(o.reach)), h('td', null, `${Math.round(o.cred)}${st.credD[o.id] ? ` (${st.credD[o.id] > 0 ? '+' : ''}${st.credD[o.id]})` : ''}`), h('td', null, stanceTxt(o.stance)),
        h('td', null, o.mine ? t(l('você', 'you')) : st.own[o.id] ? h('b', { class: 'warn' }, s.labels[st.own[o.id]]?.name ?? '?') : o.owner ?? '—'), h('td', null, relTxt(st.rel[o.id] ?? 0)),
        h('td', null, o.mine ? null : h('span', null, cbtn(o, 'lunch', l('Almoço', 'Lunch')), cbtn(o, 'ads', l('Anúncios', 'Ads')))))))));
}

function criticsTab(s: GameState): HTMLElement {
  const fam = (ids: string[]) => ids.map((id) => t(FAMILIES.find((f) => f.id === id)?.name) || id).join(', ');
  const cs = activeCritics(s).slice().sort((a, b) => b.prestige - a.prestige);
  return h('div', null,
    h('p', { class: 'small muted' }, t(l('Críticos ativos neste ano. Os marcados "real" escreveram de verdade nessa época; os outros são do mundo do jogo. Resenha muito dura de artista famoso vira situação: responder, convidar ou ignorar.', 'Critics active this year. Those marked "real" actually wrote in this era; the others belong to the game world. A very harsh review of a famous act becomes a situation: hit back, invite or ignore.'))),
    h('table', { class: 'tbl small' },
      h('thead', null, h('tr', null, ...[l('Crítico', 'Critic'), l('Veículo', 'Outlet'), l('Região', 'Region'), l('Gosta', 'Likes'), l('Detesta', 'Dislikes'), l('Rigor', 'Harshness'), l('Prestígio', 'Prestige'), l('Relação', 'Relation')].map((x) => h('th', null, t(x))))),
      h('tbody', null, cs.map((c) => { const n = CRITICS17.find((x) => x.name === c.name)?.note; return h('tr', null,
        h('td', { title: n ? t(n) : '' }, c.name, REAL_CRITICS.has(c.name) ? ' ' : null, REAL_CRITICS.has(c.name) ? pill('real', 'gold') : null), h('td', null, c.realRef && !REAL_CRITICS.has(c.name) ? `${c.outlet} (≈ ${c.realRef})` : c.outlet), h('td', null, c.region ?? 'global'),
        h('td', null, fam(c.favors)), h('td', null, fam(c.dislikes)), h('td', null, `${Math.round(c.harsh * 10)}/10`), h('td', null, String(c.prestige)), h('td', null, relTxt(relWith(s, c.name)))); }))));
}

function suitsTab(s: GameState): HTMLElement {
  const st = m17(s);
  return h('div', null,
    section(t(l('Processos por difamação', 'Defamation suits')), st.suits.length ? h('ul', null, st.suits.map((x) => h('li', null,
      t(x.vsPlayer ? l('Contra você: "{t}" — decisão em ~{n} meses (risco {p}).', 'Against you: "{t}" — ruling in ~{n} months (risk {p}).') : l('"{t}" ({a} x {o}) — decisão em ~{n} meses (chance {p}).', '"{t}" ({a} v. {o}) — ruling in ~{n} months (odds {p}).'),
        { t: t(x.t), a: s.acts[x.who]?.name ?? s.config.companyName, o: outlets17(s).find((o) => o.id === x.out)?.name ?? '?', n: Math.max(0, Math.round((x.due - s.week) / 4.35)), p: pct(x.p) })))) : h('p', { class: 'muted small' }, '—')),
    section(t(l('Bastidores da imprensa', 'Press backstage')), st.log.length ? h('ul', { class: 'small' }, st.log.slice(0, 20).map(([y, m, x]) => h('li', null, `${monthName(m)} ${y}: `, t(x)))) : h('p', { class: 'muted small' }, '—')));
}

const TABS: [string, L, (s: GameState) => HTMLElement][] = [
  ['feed', l('Notícias', 'News'), feedTab], ['create', l('Criar e soltar', 'Create and leak'), createTab], ['outlets', l('Veículos', 'Outlets'), outletsTab],
  ['critics', l('Críticos', 'Critics'), criticsTab], ['suits', l('Processos', 'Lawsuits'), suitsTab],
];
export function newsPage17(s: GameState): HTMLElement {
  const cur = TABS.find((x) => x[0] === tab) ?? TABS[0];
  const open = feed17(s, { mine: true, open: true }).length;
  return h('div', null,
    h('h2', null, t(l('Notícias, boatos e fofocas', 'News, rumors and gossip'))),
    h('p', { class: 'muted small' }, t(l('Tudo que se diz no mundo da música, com a origem. Quanto mais famoso, mais aparece. Boatos podem ser verdade ou mentira; espalham-se pelos países onde a pessoa é conhecida e mexem na fama local, no hype e no estresse. Segredos vazam por informantes e paparazzi; segurança do artista reduz.', 'Everything said in the music world, with its source. The more famous, the more it shows. Rumors can be true or false; they spread to countries where the person is known and move local fame, hype and stress. Secrets leak through insiders and paparazzi; the act\'s security reduces that.'))),
    h('div', { class: 'row wrap' }, TABS.map(([k, n]) => h('button', { class: `btn small ${cur[0] === k ? 'primary' : 'ghost'}`, onclick: () => { tab = k; rerender(); } }, t(n), k === 'feed' && open ? ` (${open})` : ''))),
    cur[2](s));
}

registerArea({ id: 'news17', label: l('Notícias e boatos', 'News & rumors'), icon: 'newspaper', key: '', render: newsPage17, badge: (s) => feed17(s, { mine: true, open: true }).filter((x) => !x.resp && !x.mine).length || undefined });

registerPageTab('act', {
  id: 'press17', label: l('Na imprensa', 'In the press'), icon: 'newspaper', order: 46,
  when: (s, id) => !!s.acts[id],
  render: (s, id) => { const list = feed17(s, { act: id }).slice(0, 15); return h('div', null, list.length ? list.map((x) => storyCard(s, x)) : h('p', { class: 'muted' }, t(l('A imprensa ainda não falou deste artista.', 'The press has not covered this act yet.')))); },
});
void COUNTRY_INFO;
