// R31 · onda 3 (CAR) — TELA "DECISÕES DE CARREIRA" (área 'car31') + painel rápido + cena-assinatura.
//   Abas: Rádio/TV/revista (grade da semana, formato, audiência, ibope, jabá, diretor de programação), Plataforma
//   (playlists com vagas, exigências, suspeitas), Palcos (aberturas da casa, prestígio, festivais), Empresário e
//   agência (pedidos, mercados-alvo), Crítica (lista do ano) e Degraus (progressão, objetivo e fim de jogo das 12).
//   Painel rápido (artista): "Tocar na sua rádio", "Pôr na sua playlist", "Abrir a noite na sua casa", "Pedir pelo
//   cliente". Cena-assinatura (salas31): os objetos ganham as mesmas decisões em 1 clique (RUN31) e a lista de degraus.
// A tela só lê; cada clique chama a função do sistema dono (sys/car31*.ts). Fama de quem não é seu passa por know.

import { l, type L } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import { MODE31, modeOf31, setMode31 } from '../../sim/deleg31';
import { recentFacts } from '../../sim/facts17';
import { visibleAct } from '../../sim/future';
import { band, bandText, know } from '../../sim/know';
import { car31On, ledger31, ledgerSummary31, relW31, SRC31 } from '../../sim/sys/car31';
import { FMT_NAME31, ROTS31, addGrid31, answerJaba31, cands31, dropGrid31, fmtsFor31, kindOf31, lawRisk31, mediaVentures31, power31, rotName31, setFmt31, setRot31, slotsOf31, stRo31, used31, BURN_W31, type Rot31 } from '../../sim/sys/car31media';
import { LISTS31, LIST_NAME31, LIST_SIZE31, addList31, cands31p, dropList31, farmSeen31, moodOn31, platRo31, platVentures31, purgeFarm31, subsShare31 } from '../../sim/sys/car31plat';
import { NEW_FAME31, setOpener31, stageRo31, venueNow31 } from '../../sim/sys/car31stage';
import { ASK31, askFor31, askLock31, askOdds31, moreRo31, setTarget31, targetOf31, yearList31, type Ask31k } from '../../sim/sys/car31more';
import { CARS31, DEF31, activeCars31, progView31, type Car31 } from '../../sim/sys/car31prog';
import { countryName, countryOfCity } from '../../data/geo';
import type { Act, GameState, Release } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerArea } from '../registry';
import { getTab, setTab } from '../vis';
import { lockBtn31 } from './lock31';
import { goDest31 } from './quick31';
import { registerQuick31 } from './quick31core';
import { RUN31, SIG31, type Btn31, type Career31, type Row31 } from './salas31model';

export const CAR_AREA31 = 'car31';
type Tab = 'media' | 'plat' | 'stage' | 'mgr' | 'crit' | 'prog';
const TABS: { id: Tab; name: L; on: (s: GameState) => boolean }[] = [
  { id: 'media', name: l('Rádio, TV e revista', 'Radio, TV and magazine'), on: (s) => mediaVentures31(s).length > 0 },
  { id: 'plat', name: l('Plataforma', 'Platform'), on: (s) => platVentures31(s).length > 0 },
  { id: 'stage', name: l('Palcos', 'Stages'), on: (s) => !!venueNow31(s) || hasKind(s, 'festival') },
  { id: 'mgr', name: l('Empresário e agência', 'Manager and agency'), on: (s) => mgClients(s).length > 0 || hasKind(s, 'booking') },
  { id: 'crit', name: l('Crítica', 'Criticism'), on: (s) => activeCars31(s).includes('critic') },
  { id: 'prog', name: l('Degraus e fim de jogo', 'Steps and endgame'), on: () => true },
];
const vl = (s: GameState) => ((s.x4 as unknown as { ventures9?: { list?: { kind: string; id: string; name: string; clients?: { actId: string }[] }[] } }).ventures9?.list ?? []);
const hasKind = (s: GameState, k: string) => vl(s).some((v) => v.kind === k);
const mgClients = (s: GameState): string[] => ((s.x4 as unknown as { ventures9?: { mg?: { clients?: { actId: string }[] } } }).ventures9?.mg?.clients ?? []).map((c) => c.actId);
const say = (e: L | null, ok: L): void => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const pct = (v: number): string => { const x = String(Math.round(v * 1000) / 10); return `${getLang() === 'pt' ? x.replace('.', ',') : x}%`; };
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
/** fama vista pelo jogador (faixa de know; a sua: exata) */
function fameTxt(s: GameState, a: Act): string { return mine(a) ? String(Math.round(a.fame)) : bandText(band(s, a.id, 'fame', a.fame, know(s, a.id).width('fame'))); }
const relRow = (s: GameState, r: Release): HTMLElement => h('span', null, h('b', null, `"${r.title}"`), ' · ', actLink(s, r.actId), h('small', { class: 'muted' }, ` · ${t(l('fama', 'fame'))} ${fameTxt(s, s.acts[r.actId])}`));
/** o que a execução faz no país (peso → % a mais no país, mesma conta das paradas) */
const effTxt = (s: GameState, relId: string, a3: string): string => { const w = relW31(s, relId, a3); return w > 0.001 ? `+${Math.round(w * 150)}% ${t(l('no país', 'in the country'))}` : '—'; };

// ---------------------------------------------------------------- rádio / TV / revista

function mediaView(s: GameState): HTMLElement {
  if (!car31On(s, 'media')) return h('p', { class: 'muted' }, t(l('A grade e a audiência estão desligadas nas regras desta partida.', 'The grid and audience are turned off in this game\'s rules.')));
  return h('div', null, ...mediaVentures31(s).map((v) => {
    const st = stRo31(s, v), pw = power31(s, v, st), k = kindOf31(v);
    const ib = st.ib.at(-1);
    const sl = slotsOf31(st);
    const country = (relId: string) => { const L0 = ledger31(s).list.find((e) => e.rel === relId && e.by === v.id); return L0?.a3 ?? ''; };
    const pd = modeOf31(s, 'radio');
    return section(`${v.name} · ${t(FMT_NAME31[st.fmt])}`,
      h('p', null,
        pill(t(fmtL(l('audiência {p}', 'audience {p}'), { p: pct(st.share) }))), ' ',
        pill(t(fmtL(l('tendência {p}', 'trend {p}'), { p: pct(pw.target) }))), ' ',
        ib ? pill(t(fmtL(l('ibope {q}º tri: {r}º de {n}', 'ratings Q{q}: No. {r} of {n}'), { q: ib.q, r: ib.rank, n: ib.n }))) : null, ' ',
        pill(t(fmtL(l('credibilidade {c}', 'credibility {c}'), { c: Math.round(v.rep) }))), ' ',
        st.ear ? pill(t(fmtL(l('ouvido de ouro ×{n}', 'golden ear ×{n}'), { n: st.ear })), 'good') : null, ' ',
        st.copy ? pill(t(fmtL(l('copiada por rivais ×{n}', 'copied by rivals ×{n}'), { n: st.copy })), 'bad') : null),
      h('p', { class: 'small muted' }, t(l('Sucesso segura a audiência mas não dá prestígio; aposta em artista novo custa audiência agora e, se estourar no país, vira "ouvido de ouro". Rotação pesada cansa depois de 8 semanas. Tocar o seu selo custa audiência e vale menos (conflito de interesse).', 'Hits hold the audience but bring no prestige; betting on a new act costs audience now and, if it breaks nationally, earns a "golden ear". Heavy rotation tires after 8 weeks. Playing your own label costs audience and counts less (conflict of interest).'))),
      fmtsFor31(s, v).length > 1 ? h('div', { class: 'row wrap' }, h('b', null, t(l('Formato:', 'Format:'))), ...fmtsFor31(s, v).map((f) => h('button', { type: 'button', class: `btn small${f === st.fmt ? ' primary' : ''}`, title: t(l('Trocar custa credibilidade e parte do público', 'Switching costs credibility and part of the audience')), onclick: () => say(setFmt31(s, v.id, f), l('Formato trocado.', 'Format changed.')) }, t(FMT_NAME31[f])))) : null,
      h('div', { class: 'row wrap small' }, h('b', null, t(l('Diretor de programação:', 'Programme director:'))), ' ', t(MODE31[pd].name), ' ',
        ...(['me', 'rule', 'staff'] as const).map((m) => h('button', { type: 'button', class: `btn small${m === pd ? ' primary' : ''}`, onclick: () => say(setMode31(s, 'radio', m), l('Delegação atualizada.', 'Delegation updated.')) }, t(MODE31[m].name)))),
      h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Faixa', 'Track'))), h('th', null, t(l('Rotação', 'Rotation'))), h('th', null, t(l('Semanas', 'Weeks'))), h('th', null, t(l('Efeito', 'Effect'))), h('th', null, ''))),
        h('tbody', null, ...st.grid.map((x) => {
          const r = s.releases[x.rel];
          if (!r) return null;
          const wk = s.week - x.w;
          return h('tr', null, h('td', null, relRow(s, r), x.jab ? pill(t(l('jabá', 'payola')), 'bad') : null),
            h('td', null, ...ROTS31.map((ro) => h('button', { type: 'button', class: `btn tiny${ro === x.rot ? ' primary' : ''}`, onclick: () => say(setRot31(s, v.id, x.rel, ro), l('Rotação trocada.', 'Rotation changed.')) }, t(rotName31(k, ro))))),
            h('td', null, String(wk), x.rot === 'heavy' && wk > BURN_W31 ? pill(t(l('cansou', 'burned out')), 'bad') : null),
            h('td', null, effTxt(s, x.rel, country(x.rel))),
            h('td', null, h('button', { type: 'button', class: 'btn tiny ghost', onclick: () => { dropGrid31(s, v.id, x.rel); rerender(); } }, t(l('Tirar', 'Drop')))));
        }))),
      h('p', { class: 'small' }, ...ROTS31.map((ro) => `${t(rotName31(k, ro))}: ${used31(st, ro)}/${sl[ro]}  `)),
      st.offers.length ? h('div', null, h('h4', null, t(l('Propostas de jabá', 'Payola offers'))), ...st.offers.map((o) => {
        const r = s.releases[o.rel];
        return h('div', { class: 'row wrap' }, r ? relRow(s, r) : null, ' ', h('b', null, $(o.amt)), ' ',
          h('small', { class: 'muted' }, t(fmtL(l('risco legal aqui e agora: {r}', 'legal risk here and now: {r}'), { r: lawRisk31(countryOf(s, v.city), s.year) >= 0.7 ? l('alto', 'high') : lawRisk31(countryOf(s, v.city), s.year) >= 0.4 ? l('médio', 'medium') : l('baixo', 'low') }))),
          h('button', { type: 'button', class: 'btn small', onclick: () => say(answerJaba31(s, v.id, o.id, true), l('Aceito. Melhor ninguém descobrir.', 'Accepted. Better nobody finds out.')) }, t(l('Aceitar', 'Accept'))),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => say(answerJaba31(s, v.id, o.id, false), l('Recusado.', 'Refused.')) }, t(l('Recusar', 'Refuse'))));
      })) : null,
      h('details', null, h('summary', null, t(l('Faixas para a grade (melhor encaixe primeiro)', 'Tracks for the grid (best fit first)'))),
        h('table', { class: 'tbl compact' }, h('tbody', null, ...cands31(s, v, 24).map((r) => {
          const a = s.acts[r.actId];
          return h('tr', null, h('td', null, relRow(s, r)),
            h('td', null, ...ROTS31.map((ro) => lockBtn31(t(rotName31(k, ro)), used31(st, ro) >= sl[ro] ? l('Sem vaga nesta rotação', 'No slot in this rotation') : ro === 'bet' && a.fame >= 35 ? l('Aposta é só para artista novo', 'A bet is only for a new act') : null, () => say(addGrid31(s, v.id, r.id, ro), l('Na grade.', 'On the grid.')), { cls: 'btn tiny' }))));
        })))));
  }));
}
const countryOf = (_s: GameState, city: string): string => countryOfCity(city) ?? 'USA';

// ---------------------------------------------------------------- plataforma

function platView(s: GameState): HTMLElement {
  if (!car31On(s, 'plat')) return h('p', { class: 'muted' }, t(l('As playlists estão desligadas nas regras desta partida.', 'Playlists are turned off in this game\'s rules.')));
  return h('div', null, ...platVentures31(s).map((v) => {
    const p = platRo31(s, v.id), sh = subsShare31(s, v), farm = farmSeen31(s, v.id);
    return section(v.name,
      h('p', { class: 'small' }, t(l('Assinantes por país (fatia entre quem ouve streaming):', 'Subscribers by country (share of streaming listeners):')), ' ', ...sh.slice(0, 6).map((c) => pill(`${t(countryName(c.a3))} ${pct(c.share)}`))),
      h('p', { class: 'small muted' }, t(l('Streams = seguidores × posição × quanto o público salva. Vaga vazia: o algoritmo preenche pelo critério de destaque. Gravadoras grandes exigem vagas; o seu selo nas playlists é conflito.', 'Streams = followers × position × how much people save it. Empty slot: the algorithm fills it by the featuring criterion. Big labels demand slots; your own label on the playlists is a conflict.'))),
      p.dem.length ? h('div', null, ...p.dem.map((d) => h('p', null, pill(t(l('exigência', 'demand')), 'bad'), ' ', t(fmtL(l('{b} quer {n} vagas no Top até a semana {w}.', '{b} wants {n} Top slots by week {w}.'), { b: s.labels[d.lab]?.name ?? '?', n: d.n, w: d.u }))))) : null,
      farm.length ? h('p', null, pill(t(l('suspeita de fazenda', 'stream-farm suspicion')), 'bad'), ' ', h('button', { type: 'button', class: 'btn small', onclick: () => say(null, fmtL(l('{n} faixa(s) retirada(s).', '{n} track(s) removed.'), { n: purgeFarm31(s, v.id) })) }, t(l('Tirar as suspeitas', 'Remove suspects')))) : null,
      ...LISTS31.filter((x) => x !== 'mood' || moodOn31(s)).map((list) => h('div', null,
        h('h4', null, `${t(LIST_NAME31[list])} (${p.lists[list].length}/${LIST_SIZE31[list]})`),
        h('ol', { class: 'small' }, ...p.lists[list].map((id) => { const r = s.releases[id]; return r ? h('li', null, relRow(s, r), ' ', h('button', { type: 'button', class: 'btn tiny ghost', onclick: () => { dropList31(s, v.id, list, id); rerender(); } }, t(l('Tirar', 'Drop')))) : null; })))),
      h('details', null, h('summary', null, t(l('Faixas para as playlists', 'Tracks for the playlists'))),
        h('table', { class: 'tbl compact' }, h('tbody', null, ...cands31p(s, 24).map((r) => h('tr', null, h('td', null, relRow(s, r)),
          h('td', null, ...LISTS31.filter((x) => x !== 'mood' || moodOn31(s)).map((list) => lockBtn31(t(LIST_NAME31[list]), p.lists[list].length >= LIST_SIZE31[list] ? l('Playlist cheia', 'Playlist full') : null, () => say(addList31(s, v.id, list, r.id, 0), l('Na playlist (no topo).', 'On the playlist (at the top).')), { cls: 'btn tiny' })))))))));
  }));
}

// ---------------------------------------------------------------- palcos

function stageView(s: GameState): HTMLElement {
  const vn = venueNow31(s), st = stageRo31(s);
  const cands = (n: number) => Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && visibleAct(s, a) && a.debutYear <= s.year && (a.city === vn?.cityId || mine(a))).sort((a, b) => a.fame - b.fame || (a.id < b.id ? -1 : 1)).slice(0, n);
  return h('div', null,
    vn ? section(`${vn.name} · ${t(l('prestígio', 'prestige'))} ${Math.round(st.pres)}`,
      h('p', { class: 'small muted' }, t(fmtL(l('Quem fecha e quem abre cada noite ganha fama na cidade (abertura vale metade). Abrir com artista novo (fama abaixo de {n}) custa cachê e esvazia o bar, mas dá prestígio. Noites lendárias até agora: {k}.', 'Whoever closes and opens each night gains fame in the city (opener counts half). Opening with a new act (fame below {n}) costs a fee and empties the bar, but brings prestige. Legendary nights so far: {k}.'), { n: NEW_FAME31, k: st.legends }))),
      h('table', { class: 'tbl compact' }, h('tbody', null, ...vn.x.prog.map((n) => h('tr', null,
        h('td', null, n.name), h('td', null, n.actId ? actLink(s, n.actId) : '—'),
        h('td', null, st.open[n.id] ? h('span', null, t(l('abre:', 'opens:')), ' ', actLink(s, st.open[n.id]), ' ', h('button', { type: 'button', class: 'btn tiny ghost', onclick: () => say(setOpener31(s, n.id), l('Sem abertura.', 'No opener.')) }, '✕'))
          : h('span', null, ...cands(4).map((a) => h('button', { type: 'button', class: 'btn tiny', title: t(fmtL(l('fama {f}', 'fame {f}'), { f: fameTxt(s, a) })), onclick: () => say(setOpener31(s, n.id, a.id), l('Abertura escalada.', 'Opener booked.')) }, a.name))))))))) : null,
    hasKind(s, 'festival') ? section(t(l('Festivais', 'Festivals')), h('p', { class: 'small' }, t(fmtL(l('Depois de cada edição, cada atração ganha fama no país pela posição no cartaz (tarde → headliner) e pela nota; a revelação ganha um empurrão nas paradas. Revelações até agora: {n}.', 'After each edition, every act gains fame in the country by billing (afternoon → headliner) and by the rating; the breakout gets a chart push. Breakouts so far: {n}.'), { n: st.reveals }))),
      h('button', { type: 'button', class: 'btn small', onclick: () => goDest31({ area: 'festivals' }) }, t(l('Montar o line-up', 'Build the line-up')))) : null);
}

// ---------------------------------------------------------------- empresário e agência

function mgrView(s: GameState): HTMLElement {
  const ks: Ask31k[] = ['radio', 'festival', 'push'];
  const book = vl(s).filter((v) => v.kind === 'booking').flatMap((v) => (v.clients ?? []).map((c) => c.actId));
  const markets = ['USA', 'GBR', 'DEU', 'FRA', 'JPN', 'BRA', 'MEX', 'CAN', 'AUS', 'ESP', 'ITA', 'ARG'];
  return h('div', null,
    mgClients(s).length ? section(t(l('Plano de carreira: pedidos ao mundo', 'Career plan: requests to the world')),
      h('p', { class: 'small muted' }, t(l('Cada pedido vai para quem decide de verdade e pode ser recusado (fama, satisfação do cliente, relação com o selo). Um pedido de cada tipo por cliente a cada 13 semanas.', 'Each request goes to whoever really decides and may be refused (fame, client satisfaction, label relationship). One request of each kind per client every 13 weeks.'))),
      h('table', { class: 'tbl compact' }, h('tbody', null, ...mgClients(s).map((id) => { const a = s.acts[id]; return a ? h('tr', null, h('td', null, actLink(s, id)),
        h('td', null, ...ks.map((k) => lockBtn31(`${t(ASK31[k].name)} (${Math.round(askOdds31(s, a, k) * 100)}%)`, askLock31(s, id, k), () => { const r = askFor31(s, id, k); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); }, { cls: 'btn tiny', title: t(ASK31[k].desc) })))) : null; })))) : null,
    book.length ? section(t(l('Agência: mercados-alvo', 'Agency: target markets')),
      h('p', { class: 'small muted' }, t(l('A turnê roteirizada passa por cidades do mercado-alvo (fama no país). Onde o artista é desconhecido, abrir mercado dá prejuízo.', 'The routed tour goes through target-market cities (fame in that country). Where the act is unknown, opening the market loses money.'))),
      h('table', { class: 'tbl compact' }, h('tbody', null, ...book.map((id) => { const a = s.acts[id]; return a ? h('tr', null, h('td', null, actLink(s, id)), h('td', null, h('b', null, t(countryName(targetOf31(s, a))))),
        h('td', null, ...markets.map((m) => h('button', { type: 'button', class: `btn tiny${targetOf31(s, a) === m ? ' primary' : ''}`, onclick: () => say(setTarget31(s, id, m), l('Mercado-alvo definido.', 'Target market set.')) }, m)))) : null; })))) : null,
    !mgClients(s).length && !book.length ? h('p', { class: 'muted' }, t(l('Sem clientes ainda.', 'No clients yet.'))) : null);
}

// ---------------------------------------------------------------- crítica

function critView(s: GameState): HTMLElement {
  const list = yearList31(s);
  return section(t(l('Lista do ano', 'Best of the year')),
    h('p', { class: 'small muted' }, t(l('Resenha boa (nota acima de 60) pesa nas vendas no país do seu veículo por três meses. Em dezembro sai a lista do ano: os discos dela voltam a vender em janeiro e fevereiro. Sem escolha, vale a ordem das suas notas.', 'A good review (above 60) weighs on sales in your outlet\'s country for three months. In December the year list comes out: its records sell again in January and February. Without a choice, your scores decide the order.'))),
    h('ol', null, ...list.map((id) => { const r = s.releases[id]; return r ? h('li', null, relRow(s, r)) : null; })),
    moreRo31(s).yl.length ? pill(t(l('escolhida por você', 'picked by you'))) : pill(t(l('automática pelas suas notas', 'automatic by your scores'))));
}

// ---------------------------------------------------------------- degraus

function progView(s: GameState): HTMLElement {
  const act = new Set(activeCars31(s));
  return h('div', null, ...CARS31.filter((c) => act.has(c)).map((c) => {
    const v = progView31(s, c), d = DEF31[c];
    return section(`${t(v.name)} · ${v.tier + 1}/${d.tiers.length}`,
      h('p', { class: 'small' }, d.tiers.map((x, i) => (i === v.tier ? `【${t(x)}】` : t(x))).join(' → ')),
      v.next?.pt ? h('p', null, h('b', null, t(l('Próximo objetivo:', 'Next goal:'))), ' ', t(v.next)) : h('p', null, pill(t(l('topo da carreira', 'top of the career')), 'good')),
      h('p', { class: 'small muted' }, h('b', null, t(l('Tensão central:', 'Core tension:'))), ' ', t(v.tension)),
      v.end ? h('p', null, pill(t(l('fim de jogo', 'endgame')), 'bad'), ' ', h('b', null, t(d.end.name)), ' — ', t(d.end.desc), ' ', t(l('Meta:', 'Goal:')), ' ', t(d.end.target(v.end.base)), ' ', t(fmtL(l('(até a semana {w})', '(by week {w})'), { w: v.end.due })))
        : v.top ? h('p', { class: 'small' }, t(fmtL(l('No topo, o desafio "{n}" pode aparecer a qualquer momento.', 'At the top, the "{n}" challenge may show up at any time.'), { n: d.end.name }))) : h('p', { class: 'small muted' }, t(l('O desafio de fim de jogo só aparece no último degrau.', 'The endgame challenge only shows up on the last step.'))));
  }), !act.size ? h('p', { class: 'muted' }, t(l('Nenhuma carreira ativa.', 'No active career.'))) : null);
}

// ---------------------------------------------------------------- página

function page(s: GameState): HTMLElement {
  const open = TABS.filter((x) => x.on(s));
  const cur = (open.find((x) => x.id === getTab(CAR_AREA31)) ?? open[0]).id;
  const sum = ledgerSummary31(s);
  const body = cur === 'media' ? mediaView(s) : cur === 'plat' ? platView(s) : cur === 'stage' ? stageView(s) : cur === 'mgr' ? mgrView(s) : cur === 'crit' ? critView(s) : progView(s);
  return h('div', { class: 'page car31' },
    h('h2', null, t(l('Decisões que mudam o mundo', 'Decisions that change the world'))),
    h('p', { class: 'small muted' }, t(fmtL(l('Esta semana as suas carreiras expõem {r} lançamento(s) e {a} artista(s): vira venda no país (paradas) e fama local.', 'This week your careers expose {r} release(s) and {a} act(s): it turns into sales in the country (charts) and local fame.'), { r: sum.rels, a: sum.acts })),
      ' ', ...sum.src.slice(0, 5).map(([k]) => pill(t(SRC31[k])))),
    h('div', { class: 'row wrap' }, ...open.map((x) => h('button', { type: 'button', class: `btn small${x.id === cur ? ' primary' : ''}`, onclick: () => { setTab(CAR_AREA31, x.id); rerender(); } }, t(x.name)))),
    body, journal(s));
}
/** Diário das carreiras: o que as suas decisões fizeram (fatos do barramento; só leitura). */
function journal(s: GameState): HTMLElement | null {
  const fs = recentFacts(s, { months: 24, kinds: ['ibope', 'format_copied', 'format_dead', 'golden_ear', 'payola', 'payola_taken', 'platform_conflict', 'catalog_pulled', 'slot_demand', 'stream_farm', 'own_bill', 'festival_breakout', 'cover_recorded', 'manager_ask_ok', 'manager_ask_no', 'critic_list', 'career_step', 'endgame_start', 'endgame_ok', 'endgame_fail'] })
    .filter((f) => f.visibility !== 'secret' || f.actors.includes('player')).slice(-14).reverse();
  return fs.length ? section(t(l('O que as suas decisões fizeram', 'What your decisions did')), h('ul', { class: 'small' }, ...fs.map((f) => h('li', null, h('span', { class: 'muted' }, `${f.y} · `), t(f.text))))) : null;
}
registerArea({ id: CAR_AREA31, label: l('Decisões de carreira', 'Career decisions'), icon: 'star', key: '', render: page, visible: () => false });
const go = (tab: Tab) => { setTab(CAR_AREA31, tab); goDest31({ area: CAR_AREA31 }); };

// ---------------------------------------------------------------- painel rápido (artista)

const latest = (s: GameState, id: string): Release | undefined => { const a = s.acts[id]; for (let i = (a?.releases.length ?? 0) - 1; i >= 0; i--) { const r = s.releases[a!.releases[i]]; if (r?.live) return r; } return undefined; };
registerQuick31({
  id: 'q.car31.radio', verb: 'more', icon: 'bulb', kinds: ['act'], label: l('Tocar na sua rádio/TV/revista', 'Play on your radio/TV/magazine'),
  applies: (s) => car31On(s, 'media') && mediaVentures31(s).length > 0,
  lock: (s, tg) => (!latest(s, tg.id) ? { why: l('Sem disco em circulação', 'No record in circulation'), unlock: l('Espere o próximo lançamento', 'Wait for the next release') } : null),
  dest: () => ({ area: CAR_AREA31, tab: `${CAR_AREA31}/media` }),
  run: (s, tg) => {
    const v = mediaVentures31(s)[0], r = latest(s, tg.id);
    if (!v || !r) return;
    const st = stRo31(s, v), sl = slotsOf31(st);
    const ro: Rot31 = (['light', 'mid', 'bet', 'heavy'] as Rot31[]).find((x) => used31(st, x) < sl[x] && (x !== 'bet' || s.acts[tg.id].fame < 35)) ?? 'light';
    say(addGrid31(s, v.id, r.id, ro), fmtL(l('"{t}" entra na grade ({r}).', '"{t}" joins the grid ({r}).'), { t: r.title, r: rotName31(kindOf31(v), ro) }));
    go('media');
  },
});
registerQuick31({
  id: 'q.car31.plat', verb: 'more', icon: 'globe', kinds: ['act'], label: l('Pôr na sua playlist (Novidades)', 'Add to your playlist (New)'),
  applies: (s) => car31On(s, 'plat') && platVentures31(s).length > 0,
  lock: (s, tg) => (!latest(s, tg.id) ? { why: l('Sem disco em circulação', 'No record in circulation'), unlock: l('Espere o próximo lançamento', 'Wait for the next release') } : null),
  dest: () => ({ area: CAR_AREA31, tab: `${CAR_AREA31}/plat` }),
  run: (s, tg) => { const v = platVentures31(s)[0], r = latest(s, tg.id); if (v && r) say(addList31(s, v.id, 'new', r.id, 0), l('Na playlist.', 'On the playlist.')); go('plat'); },
});
registerQuick31({
  id: 'q.car31.open', verb: 'lineup', icon: 'mic', kinds: ['act'], label: l('Abrir uma noite na sua casa', 'Open a night at your venue'),
  applies: (s, tg) => car31On(s, 'stage') && !!venueNow31(s) && visibleAct(s, s.acts[tg.id]) && (s.acts[tg.id]?.debutYear ?? 9999) <= s.year,
  lock: (s) => (!(venueNow31(s)?.x.prog ?? []).some((n) => n.k !== 'private' && !stageRo31(s).open[n.id]) ? { why: l('Todas as noites já têm abertura', 'Every night already has an opener'), unlock: l('Tire uma abertura em Palcos', 'Remove an opener under Stages') } : null),
  dest: () => ({ area: CAR_AREA31, tab: `${CAR_AREA31}/stage` }),
  run: (s, tg) => { const n = (venueNow31(s)?.x.prog ?? []).find((x) => x.k !== 'private' && !stageRo31(s).open[x.id] && x.actId !== tg.id); if (n) say(setOpener31(s, n.id, tg.id), l('Abertura escalada.', 'Opener booked.')); go('stage'); },
});
registerQuick31({
  id: 'q.car31.ask', verb: 'more', icon: 'handshake', kinds: ['act'], label: l('Pedir pelo cliente (rádio, festival, selo)', 'Ask on the client\'s behalf (radio, festival, label)'),
  applies: (s, tg) => car31On(s, 'manager') && mgClients(s).includes(tg.id), passive: true,
  dest: () => ({ area: CAR_AREA31, tab: `${CAR_AREA31}/mgr` }),
  run: () => go('mgr'),
});

// ---------------------------------------------------------------- cena-assinatura: decisões em 1 clique

RUN31['car31.go'] = (_s, arg) => { go((arg as Tab) || 'prog'); return null; };
RUN31['car31.pd'] = (s) => setMode31(s, 'radio', modeOf31(s, 'radio') === 'me' ? 'rule' : 'me');
RUN31['car31.jaba'] = (s, arg) => { const [vid, oid, yes] = String(arg ?? '').split('|'); return answerJaba31(s, vid, oid, yes === '1'); };
RUN31['car31.purge'] = (s, arg) => { const n = purgeFarm31(s, String(arg ?? '')); return n ? null : l('Nada suspeito à vista.', 'Nothing suspicious in sight.'); };
const B = (id: string, label: L, d: Btn31['do'], main = false, lock: L | null = null): Btn31 => ({ id, label, do: d, main, lock });
SIG31.acts = (s, c, hot) => {
  const out: Btn31[] = [];
  if (c === 'media' && (hot === 'grid' || hot === 'booth')) {
    out.push(B('grid31', l('Montar a grade da semana', 'Build the week\'s grid'), { k: 'run', id: 'car31.go', arg: 'media' }, true, mediaVentures31(s).length ? null : l('Abra uma rádio, TV ou revista', 'Found a radio, TV or magazine')));
    out.push(B('pd31', modeOf31(s, 'radio') === 'me' ? l('Delegar ao diretor de programação', 'Delegate to the programme director') : l('Voltar a montar você mesmo', 'Go back to building it yourself'), { k: 'run', id: 'car31.pd' }));
    for (const v of mediaVentures31(s)) for (const o of stRo31(s, v).offers.slice(0, 1)) {
      out.push(B(`jy${o.id}`, fmtL(l('Aceitar jabá ({v})', 'Take payola ({v})'), { v: $(o.amt) }), { k: 'run', id: 'car31.jaba', arg: `${v.id}|${o.id}|1` }));
      out.push(B(`jn${o.id}`, l('Recusar jabá', 'Refuse payola'), { k: 'run', id: 'car31.jaba', arg: `${v.id}|${o.id}|0` }));
    }
  }
  if (c === 'platform' && hot === 'playlists') {
    out.push(B('pl31', l('Escolher as faixas das playlists', 'Pick the playlist tracks'), { k: 'run', id: 'car31.go', arg: 'plat' }, true, platVentures31(s).length ? null : l('Abra uma plataforma', 'Found a platform')));
    for (const v of platVentures31(s)) if (farmSeen31(s, v.id).length) out.push(B(`pf${v.id}`, l('Tirar as faixas suspeitas', 'Remove the suspect tracks'), { k: 'run', id: 'car31.purge', arg: v.id }));
  }
  if (c === 'venue' && hot === 'stage') out.push(B('op31', l('Escalar as aberturas do mês', 'Book this month\'s openers'), { k: 'run', id: 'car31.go', arg: 'stage' }, true, venueNow31(s) ? null : l('Compre uma casa de shows', 'Buy a venue')));
  if (c === 'festival' && hot === 'stages') out.push(B('fs31', l('Ver o que o cartaz faz pela fama', 'See what the bill does for fame'), { k: 'run', id: 'car31.go', arg: 'stage' }, true));
  if (c === 'manager' && hot === 'clients') out.push(B('mg31', l('Fazer pedidos pelos clientes', 'Make requests for clients'), { k: 'run', id: 'car31.go', arg: 'mgr' }, true, mgClients(s).length ? null : l('Sem clientes ainda', 'No clients yet')));
  if (c === 'booking' && hot === 'map') out.push(B('bk31', l('Definir mercados-alvo', 'Set target markets'), { k: 'run', id: 'car31.go', arg: 'mgr' }, true));
  if (c === 'critic' && hot === 'pile') out.push(B('cr31', l('Ver a lista do ano', 'See the year list'), { k: 'run', id: 'car31.go', arg: 'crit' }, true));
  out.push(B('pg31', l('Degraus e fim de jogo da carreira', 'Career steps and endgame'), { k: 'run', id: 'car31.go', arg: 'prog' }));
  return out;
};
SIG31.listTitle = l('Degraus da carreira', 'Career steps');
SIG31.list = (s, c): Row31[] => {
  if (!(CARS31 as string[]).includes(c)) return [];
  const v = progView31(s, c as Car31), d = DEF31[c as Car31];
  const rows: Row31[] = d.tiers.map((x, i) => ({ id: `t${i}`, t: x, d: i === v.tier ? l('você está aqui', 'you are here') : i < v.tier ? l('feito', 'done') : d.goal[i], chip: i === v.tier ? { sym: '▶', text: l('agora', 'now'), tone: 'good' } : undefined, do: { k: 'run', id: 'car31.go', arg: 'prog' } }));
  if (v.end) rows.push({ id: 'end', t: d.end.name, d: d.end.target(v.end.base), chip: { sym: '!', text: l('fim de jogo', 'endgame'), tone: 'soon' }, do: { k: 'run', id: 'car31.go', arg: 'prog' } });
  return rows;
};
SIG31.alerts = (s, c: Career31) => {
  if (c === 'media') { const n = mediaVentures31(s).reduce((t0, v) => t0 + stRo31(s, v).offers.length, 0); if (n) return [{ sym: '$', text: fmtL(l('{n} proposta(s) de jabá na mesa', '{n} payola offer(s) on the desk'), { n }), tone: 'soon' }]; }
  if (c === 'platform') { const n = platVentures31(s).reduce((t0, v) => t0 + platRo31(s, v.id).dem.length, 0); if (n) return [{ sym: '!', text: fmtL(l('{n} gravadora(s) exigindo vagas', '{n} label(s) demanding slots'), { n }), tone: 'soon' }]; }
  const v = (CARS31 as string[]).includes(c) ? progView31(s, c as Car31) : null;
  return v?.end ? [{ sym: '!', text: DEF31[c as Car31].end.name, tone: 'crit' }] : [];
};
