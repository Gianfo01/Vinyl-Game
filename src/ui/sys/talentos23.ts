// Rodada 23 — tela única TALENTOS (substitui "Radar e pipeline" + "Olheiros, concursos e demos").
// Três verbos: PROCURAR (ações ativas com custo, duração e rendimento; o boca a boca explicado),
// FUNIL (Rumor → Observado → Acompanhado → Audição → Pronto para propor; um próximo passo por card) e
// DECIDIR (até três lado a lado → proposta). Lista/relatórios, leilões, equipe e abas extras continuam aqui.

import { CITIES, FAMILIES, MARKETS, cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { t } from '../../i18n/strings';
import { attendContest } from '../../sim/discovery';
import { defaultOffer } from '../../sim/contracts';
import { dropSignal, passiveCount23, passiveSources23, scoutActionsPerMonth, syncPipeline, visibleFields } from '../../sim/scouting';
import { CH18, chCost18, chNoise18, chNow18, dig18, showsNow18, watchShow18 } from '../../sim/sys/discover18';
import { energyLeft, maxEnergy } from '../../sim/sys/life';
import { isWatched, scout11, toggleCompare, toggleWatch } from '../../sim/sys/scout11';
import { COLS23, COL_ORDER23, column23, demoCallOpen23, demoCallQuote23, freeScouts23, isPassive23, marketName23, nextStep23, openDemoCall23, originText23, reportAge23, rivalWatch23, sceneQuote23, scout23, startSceneTrip23, startStep23, unc23, type Unc23 } from '../../sim/sys/scout23';
import type { GameState, Knowledge } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, actLink, cityName, genreName, logo, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { openDossier } from '../dossierView';
import { openOffer } from '../ficha';
import { auctionsSection, contestsSection, demosSection, scoutsSection } from '../panels/discovery';
import { professionals } from '../panels/market';
import { mergeTabs } from '../registry';
import { getTab, ic, setTab, tabs } from '../vis';
import './talentos23.css';
import { playBtn27 } from '../act27/mode27';
import { openNight27 } from '../act27/night27';

const say = (e: L | null, ok: L) => toast(t(e ?? ok), e ? 'bad' : 'good');
const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const famOpts = () => [{ value: 'any', label: t(l('Qualquer gênero', 'Any genre')) }, ...FAMILIES.map((f) => ({ value: f.id as string, label: t(f.name) })).sort((a, b) => a.label.localeCompare(b.label))];
const balls = (n: number) => (n ? '●'.repeat(n) : '—');

/** Metadados de uma ação: custo · duração · rendimento esperado. */
function meta(cost: string, time: L | string, yieldTxt: L | string): HTMLElement {
  return h('div', { class: 't23-meta' },
    h('span', null, h('small', null, t(l('Custo', 'Cost'))), h('b', null, cost)),
    h('span', null, h('small', null, t(l('Duração', 'Time'))), h('b', null, T(time))),
    h('span', null, h('small', null, t(l('Rende', 'Yield'))), h('b', null, T(yieldTxt))));
}
function action(icon: string, title: L, desc: L, m: HTMLElement, ...controls: (Node | null)[]): HTMLElement {
  return h('article', { class: 't23-act' }, h('header', null, ic(icon), h('b', null, t(title))), h('p', { class: 'muted small' }, t(desc)), m, h('div', { class: 'row wrap t23-ctl' }, ...controls));
}

// ---------------------------------------------------------------- PROCURAR
const P = { city: '', fam: 'any', who: '', demoFam: 'any', ch: '', level: 'any' };
/** r27 (CTX): "Mandar olheiro a esta cena" no menu de uma cidade abre Procurar com a cidade já escolhida. */
export function presetCity23(city: string): void { P.city = city; }

function procurar(s: GameState): HTMLElement {
  if (!P.city || !cityById[P.city]) P.city = s.config.homeCity;
  const home = cityById[s.config.homeCity]?.market;
  const cities = CITIES.slice().sort((a, b) => Number(b.market === home) - Number(a.market === home) || t(a.name).localeCompare(t(b.name)));
  const free = freeScouts23(s);
  if (P.who && !free.some((x) => x.id === P.who)) P.who = '';
  const q = sceneQuote23(s, P.city, P.fam, P.who || undefined);
  const st = scout23(s);
  const max = scoutActionsPerMonth(s);
  const en = energyLeft(s);
  const shows = showsNow18(s);
  const contests = s.contests.filter((c) => !c.winner);
  const chs = chNow18(s);
  if (!chs.some((c) => c.id === P.ch)) P.ch = chs.some((c) => c.id === 'referral') && playerActs(s).length ? 'referral' : chs[0]?.id ?? '';
  const chSel = CH18.find((c) => c.id === P.ch);
  const dq = demoCallQuote23(s);
  const wom = passiveCount23(s);
  const womThisMonth = Object.values(s.knowledge).filter((k) => isPassive23(k) && (k.origin?.w ?? k.updatedWeek) > s.week - 5 && s.acts[k.actId]?.owner !== 'player').length;
  return h('div', { class: 't23' },
    h('div', { class: 't23-strip' },
      h('span', null, t(l('Ações de A&R no mês', 'A&R actions this month')), ' ', h('b', null, `${Math.max(0, max - s.scoutActionsUsed)}/${max}`)),
      h('span', null, t(l('Tempo livre', 'Free time')), ' ', h('b', { class: 't23-balls' }, '●'.repeat(en) + '○'.repeat(Math.max(0, maxEnergy(s) - en)))),
      h('span', { class: 'muted small' }, t(l('Nomes novos entram no Funil como Rumor ou Observado. Cada card diz de onde veio.', 'New names enter the Funnel as Rumor or Observed. Each card says where it came from.')))),
    h('div', { class: 't23-grid' },
      action('globe', l('Mandar olheiro a uma cena', 'Send a scout to a scene'), l('Escolha cidade e gênero. Um freelancer (ou olheiro da casa) passa semanas nos clubes de lá e manda nomes aos poucos.', 'Pick a city and a genre. A freelancer (or a staff scout) spends weeks in the clubs there and sends names bit by bit.'),
        meta($(q.cost), fmtW(q.weeks), l(`~${q.n} nome(s), grau ${q.deg}`, `~${q.n} name(s), degree ${q.deg}`)),
        select<string>(P.city, cities.map((c) => ({ value: c.id, label: `${t(c.name)} · ${t(marketName23(c.market))}` })), (v) => { P.city = v; rerender(); }, { 'aria-label': t(l('Cidade', 'City')) }),
        select<string>(P.fam, famOpts(), (v) => { P.fam = v; rerender(); }, { 'aria-label': t(l('Gênero', 'Genre')) }),
        select<string>(P.who, [{ value: '', label: t(l('Freelancer', 'Freelancer')) }, ...free.map((sc) => ({ value: sc.id, label: `${sc.name} (${sc.skill})` }))], (v) => { P.who = v; rerender(); }, { 'aria-label': t(l('Quem vai', 'Who goes')) }),
        select<string>(P.level, [{ value: 'any', label: t(l('Qualquer nível', 'Any level')) }, { value: 'beginner', label: t(l('Iniciantes', 'Beginners')) }, { value: 'promising', label: t(l('Promissores', 'Promising')) }], (v) => { P.level = v; }, { 'aria-label': t(l('Nível', 'Level')) }),
        h('button', { class: 'btn small primary', onclick: () => { say(startSceneTrip23(s, P.city, P.fam, P.who || undefined, { level: P.level, role: 'any' }), l('Olheiro a caminho: os nomes chegam semana a semana.', 'Scout on the way: names arrive week by week.')); rerender(); } }, t(l('Mandar', 'Send'))),
        playBtn27(l('Noite de olheiro', 'Scouting night'), openNight27, false, l('Você mesmo sai uma noite pelas casas da sua cidade (1 bolinha).', 'Go out yourself for a night around your city\'s venues (1 energy).'))),
      action('mic', l('Ir a um show você mesmo', 'Go to a show yourself'), l('Vá ao show de um nome grande da sua região e preste atenção em quem abre. Você vê de perto.', 'Go to a big name\'s show in your region and watch the opener. You see them up close.'),
        meta(shows.length ? `${$(money(s, 60 + shows[0].fame * 4))}+ · 1●` : '—', l('na hora', 'right away'), l('1 nome, grau 3 (Acompanhado)', '1 name, degree 3 (Followed)')),
        ...(shows.length ? shows.slice(0, 4).map((a) => h('button', { class: 'btn small', disabled: en < 1, title: en < 1 ? t(l('Sem tempo livre neste mês.', 'No free time this month.')) : '', onclick: () => { const r = watchShow18(s, a.id); toast(t(r.text), r.ok ? 'good' : 'info'); rerender(); } }, `${a.name} · ${$(money(s, 60 + a.fame * 4))}`))
          : [h('span', { class: 'muted small' }, t(l('Nenhum show grande na sua região agora.', 'No big show in your region right now.')))])),
      action('cassette', l('Abrir chamada de demos', 'Open a demo call'), l('Anúncio "mande sua demo" na sua região. Demos dizem pouco do palco, mas chegam sem você sair do escritório.', '"Send us your demo" ad in your region. Demos say little about the stage, but arrive without you leaving the office.'),
        meta($(dq.cost), fmtW(dq.weeks), l(`~${dq.n} demos, grau 2 (ruído alto)`, `~${dq.n} demos, degree 2 (noisy)`)),
        select<string>(P.demoFam, famOpts(), (v) => { P.demoFam = v; }, { 'aria-label': t(l('Gênero', 'Genre')) }),
        h('button', { class: 'btn small', disabled: demoCallOpen23(s), onclick: () => { say(openDemoCall23(s, P.demoFam), l('Chamada aberta.', 'Call opened.')); rerender(); } }, demoCallOpen23(s) ? t(l('Chamada aberta', 'Call open')) : t(l('Abrir', 'Open')))),
      action('trophy', l('Concurso de talentos', 'Talent contest'), l('Assista a um concurso anunciado: no dia, você vê todos os inscritos (o vencedor de perto). Rivais também vão.', 'Attend an announced contest: on the day you see every entrant (the winner up close). Rivals go too.'),
        meta(contests.length ? `${$(money(s, 300))}–${$(money(s, 1500))}` : '—', l('até o dia do concurso', 'until contest day'), l('todos os inscritos, grau 2–3', 'all entrants, degree 2–3')),
        ...(contests.length ? contests.slice(0, 4).map((c) => c.attended ? pill(`${t(c.name)} ✓`, 'good')
          : h('button', { class: 'btn small', onclick: () => { say(attendContest(s, c.id), l('Presença confirmada.', 'Attendance confirmed.')); rerender(); } }, `${t(c.name)} · ${t(l('sem.', 'wk'))} ${c.week} · ${c.entrants.length}👤`))
          : [h('span', { class: 'muted small' }, t(l('Nenhum concurso anunciado agora.', 'No contest announced right now.')))])),
      action('handshake', l('Pedir indicações e outros canais', 'Ask for referrals and other channels'), l('Seu elenco e produtores indicam quem tocou com eles; rádio, escolas, festivais e plataformas da época trazem mais nomes (canais públicos atraem rivais).', 'Your roster and producers point to who played with them; radio, schools, festivals and era platforms bring more names (public channels attract rivals).'),
        chSel ? meta(`${chCost18(s, chSel) ? $(chCost18(s, chSel)) : t(l('grátis', 'free'))} · ${balls(chSel.balls)}`, l('na hora (1×/mês)', 'right away (1×/month)'), l(`${chSel.n[0]}–${chSel.n[1]} nome(s), grau ${chSel.deg} ±${Math.round(chNoise18(s, chSel))}${chSel.vis > 0.3 ? ' · rivais!' : ''}`, `${chSel.n[0]}–${chSel.n[1]} name(s), degree ${chSel.deg} ±${Math.round(chNoise18(s, chSel))}${chSel.vis > 0.3 ? ' · rivals!' : ''}`)) : h('span'),
        select<string>(P.ch, chs.map((c) => ({ value: c.id, label: t(c.name) })), (v) => { P.ch = v; rerender(); }, { 'aria-label': t(l('Canal', 'Channel')) }),
        h('button', { class: 'btn small', onclick: () => { const r = dig18(s, P.ch); toast(t(r.text), r.ok ? 'good' : 'info'); rerender(); } }, t(l('Ir atrás', 'Go looking')))),
    ),
    st.trips.length ? section(t(l('Em campo agora', 'In the field now')), ...st.trips.map((tr) => h('div', { class: 't23-trip' },
      h('div', { class: 'small' }, h('b', null, tr.kind === 'demo' ? t(l('Chamada de demos', 'Demo call')) : tr.by), ' · ', tr.city ? cityName(tr.city) : t(marketName23(tr.market)), ' · ', tr.fam === 'any' ? t(l('qualquer gênero', 'any genre')) : t(FAMILIES.find((f) => f.id === tr.fam)?.name),
        ` · ${tr.found.length}/${tr.target} ${t(l('nome(s)', 'name(s)'))} · ${t(l('volta na sem.', 'back wk'))} ${tr.until}`),
      bar(((s.week - tr.start) / Math.max(1, tr.until - tr.start)) * 100),
      tr.found.length ? h('div', { class: 'row wrap small' }, ...tr.found.map((id) => actLink(s, id))) : null))) : null,
    section(t(l('Boca a boca (passivo)', 'Word of mouth (passive)')),
      h('p', { class: 'small' }, t(l('Além do que você procura, nomes chegam sozinhos no fechamento de cada mês: ~{a}–{b} por mês (mais com A&R na equipe). Este mês: {n}.', 'Besides what you go looking for, names arrive on their own at each month end: ~{a}–{b} per month (more with A&R staff). This month: {n}.'), { a: wom.lo, b: wom.hi, n: womThisMonth })),
      h('div', { class: 'row wrap' }, ...passiveSources23(s).filter((x) => x.id !== 'watch' && x.id !== 'scout').map((x) => pill(t(x.name)))),
      h('p', { class: 'muted small' }, t(l('Os de perto de casa e os mais famosos aparecem mais. Eles entram no Funil como Rumor.', 'Acts near home and more famous ones show up more. They enter the Funnel as Rumor.')))),
    s.demos.length ? demosSection(s) : null,
    st.log.length ? section(t(l('Últimas notícias do campo', 'Latest field news')), h('ul', { class: 'small muted' }, st.log.slice(-6).reverse().map((x) => h('li', null, `${t(l('sem.', 'wk'))} ${x.w}: `, t(x.t))))) : null,
  );
}
const fmtW = (w: number): L => l(`${w} semana${w > 1 ? 's' : ''}`, `${w} week${w > 1 ? 's' : ''}`);

// ---------------------------------------------------------------- incerteza e card

function uncEl(u: Unc23, label: L): HTMLElement {
  const cls = u.kind === '?' ? 'unk' : u.kind === '~' ? 'est' : 'ok';
  const tip = u.kind === '?' ? l('desconhecido: aprofunde para ver', 'unknown: dig deeper to see') : u.kind === '~' ? l('faixa estimada (pode errar)', 'estimated range (may be off)') : l('confirmado', 'confirmed');
  return h('span', { class: `t23-u ${cls}`, title: `${t(label)}: ${t(tip)}` }, h('small', null, t(label)), h('b', null, u.kind === '?' ? '?' : u.kind === '✓' ? `✓ ${u.v}` : `~ ${u.lo}–${u.hi}`));
}
function attrs(s: GameState, id: string): HTMLElement {
  return h('div', { class: 't23-attrs' }, uncEl(unc23(s, id, 'fame'), l('Alcance', 'Reach')), uncEl(unc23(s, id, 'talent'), l('Talento', 'Talent')), uncEl(unc23(s, id, 'potential'), l('Potencial', 'Potential')));
}

function stepBtn(s: GameState, id: string): HTMLElement {
  const st = nextStep23(s, id);
  const a = s.acts[id];
  if (!st) return h('button', { class: 'btn small primary', disabled: !!a.owner, onclick: () => openOffer(id) }, t(l('Fazer proposta', 'Make an offer')));
  if (st.until) return h('button', { class: 'btn small', disabled: true }, t(l('Relatório na sem. {w}', 'Report on wk {w}'), { w: st.until }));
  return h('button', { class: 'btn small', disabled: !st.ok, title: st.why ? t(st.why) : '', onclick: () => { say(startStep23(s, id), l('Pedido feito: o relatório chega em breve.', 'Done: the report arrives soon.')); rerender(); } },
    `${t(st.label)}: ${$(st.cost)}, ${t(fmtW(st.weeks))}${st.balls ? ` + ${balls(st.balls)}` : ''}`);
}

function card(s: GameState, k: Knowledge): HTMLElement {
  const a = s.acts[k.actId];
  const rv = rivalWatch23(s, a.id);
  const age = reportAge23(s, k);
  const cmp = scout11(s).compare.includes(a.id);
  const w = isWatched(s, a.id);
  const offer = s.offers.find((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'));
  return h('article', { class: `t23-card${cmp ? ' sel' : ''}${a.owner ? ' signed' : ''}` },
    h('header', null, logo(a, 28), h('div', { class: 'grow' }, actLink(s, a.id), h('div', { class: 'muted small' }, `${genreName(a.genre)} · ${cityName(a.city)} · ${a.members.length > 1 ? t(l('banda', 'band')) : t(l('solo', 'solo'))}`)),
      h('button', { class: `btn tiny ghost${w ? ' on' : ''}`, title: t(w ? l('Tirar da observação', 'Unwatch') : l('Observar (alertas mensais)', 'Watch (monthly alerts)')), 'aria-pressed': w ? 'true' : 'false', onclick: () => { toggleWatch(s, a.id); rerender(); } }, w ? '★' : '☆')),
    h('div', { class: 't23-origin small' }, ic('pin'), ' ', t(originText23(s, k))),
    attrs(s, a.id),
    rv ? h('div', { class: `t23-rival small ${rv.hard ? 'hard' : ''}` }, '⚠ ', t(rv.text)) : null,
    a.owner ? h('div', { class: 't23-rival small hard' }, t(l('Assinou com {l}.', 'Signed with {l}.'), { l: s.labels[a.owner]?.name ?? '?' })) : null,
    offer ? pill(offer.status === 'counter' ? t(l('contraproposta', 'counter-offer')) : t(l('proposta enviada', 'offer sent')), 'warn') : null,
    age.stale ? h('div', { class: 'small warn-t' }, t(l('Relatório de {n} meses: pode estar velho.', '{n}-month-old report: may be stale.'), { n: age.months })) : null,
    h('div', { class: 'row wrap t23-cact' },
      a.owner ? null : stepBtn(s, a.id),
      h('label', { class: 'check small', title: t(l('Comparar em Decidir (até 3)', 'Compare in Decide (up to 3)')) }, h('input', { type: 'checkbox', checked: cmp, onchange: () => { toggleCompare(s, a.id); rerender(); } }), t(l('Comparar', 'Compare'))),
      h('button', { class: 'btn tiny ghost', title: t(l('Dossiê de A&R', 'A&R dossier')), onclick: () => openDossier(a.id) }, t(l('Dossiê', 'Dossier'))),
      offer ? null : h('button', { class: 'btn tiny ghost', title: t(l('Descartar', 'Drop')), onclick: () => { dropSignal(s, a.id); rerender(); } }, '✕')),
  );
}

// ---------------------------------------------------------------- FUNIL
const F = { fam: 'any', market: 'any', minDeg: 1, status: 'free' as 'free' | 'all' | 'rival' | 'offer' | 'hot', watch: false, q: '', src: 'all' as 'all' | 'active' | 'passive' };

function known(s: GameState): Knowledge[] {
  const q = F.q.trim().toLowerCase();
  return Object.values(s.knowledge).filter((k) => {
    const a = s.acts[k.actId];
    if (!a || a.owner === 'player') return false;
    if (F.status === 'free' && a.owner) return false;
    if (F.status === 'rival' && !a.owner) return false;
    if (F.status === 'offer' && !s.offers.some((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'))) return false;
    if (F.status === 'hot' && !rivalWatch23(s, a.id)?.hard) return false;
    if (F.fam !== 'any' && familyOf(a.genre) !== F.fam) return false;
    if (F.market !== 'any' && cityById[a.city]?.market !== F.market) return false;
    if (k.degree < F.minDeg) return false;
    if (F.src !== 'all' && (F.src === 'passive') !== isPassive23(k)) return false;
    if (F.watch && !isWatched(s, a.id)) return false;
    return !q || `${a.name} ${genreName(a.genre)} ${cityName(a.city)}`.toLowerCase().includes(q);
  }).sort((a, b) => b.degree - a.degree || b.updatedWeek - a.updatedWeek);
}

function filters(): HTMLElement {
  return h('div', { class: 'row wrap t23-filters' },
    h('input', { type: 'search', placeholder: t(l('Nome, gênero ou cidade…', 'Name, genre or city…')), value: F.q, 'aria-label': t(l('Buscar', 'Search')), onchange: (e: Event) => { F.q = (e.target as HTMLInputElement).value; rerender(); } }),
    select<string>(F.fam, [{ value: 'any', label: t(l('Todos os gêneros', 'All genres')) }, ...FAMILIES.map((x) => ({ value: x.id as string, label: t(x.name) }))], (v) => { F.fam = v; rerender(); }),
    select<string>(F.market, [{ value: 'any', label: t(l('Todas as regiões', 'All regions')) }, ...MARKETS.map((x) => ({ value: x.id as MarketId as string, label: t(x.name) }))], (v) => { F.market = v; rerender(); }),
    select<number>(F.minDeg, [1, 2, 3, 4].map((d) => ({ value: d, label: d === 1 ? t(l('Qualquer grau', 'Any degree')) : t(l('A partir de {c}', 'From {c}'), { c: COLS23[COL_ORDER23[d - 1]].name }) })), (v) => { F.minDeg = v; rerender(); }),
    select<string>(F.status, [
      { value: 'free', label: t(l('Livres', 'Unsigned')) }, { value: 'all', label: t(l('Todos (inclui contratados)', 'All (incl. signed)')) },
      { value: 'rival', label: t(l('Assinaram com rivais', 'Signed to rivals')) }, { value: 'offer', label: t(l('Com proposta minha', 'With my offer')) }, { value: 'hot', label: t(l('Rival de olho', 'Rival circling')) },
    ], (v) => { F.status = v as typeof F.status; rerender(); }),
    select<string>(F.src, [{ value: 'all', label: t(l('Todas as origens', 'All sources')) }, { value: 'active', label: t(l('Que eu procurei', 'Found by me')) }, { value: 'passive', label: t(l('Boca a boca', 'Word of mouth')) }], (v) => { F.src = v as typeof F.src; rerender(); }),
    h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: F.watch, onchange: (e: Event) => { F.watch = (e.target as HTMLInputElement).checked; rerender(); } }), '★ ', t(l('Só observados', 'Watchlist only'))),
  );
}

function funil(s: GameState): HTMLElement {
  syncPipeline(s);
  const ks = known(s);
  return h('div', { class: 't23' },
    h('p', { class: 'muted small' }, t(l('Cada coluna é o quanto você sabe. O botão de cada card é o próximo passo, com custo e tempo; o relatório chega depois. ? = desconhecido · ~ a–b = faixa estimada · ✓ x = confirmado.', 'Each column is how much you know. Each card\'s button is the next step, with cost and time; the report arrives later. ? = unknown · ~ a–b = estimated range · ✓ x = confirmed.'))),
    filters(),
    h('div', { class: 't23-kanban' }, COL_ORDER23.map((c) => {
      const col = ks.filter((k) => column23(s, k) === c);
      return h('section', { class: 't23-col' },
        h('h4', null, t(COLS23[c].name), h('span', { class: 'badge' }, String(col.length))),
        h('p', { class: 'muted tiny' }, t(COLS23[c].desc)),
        col.length ? col.slice(0, 30).map((k) => card(s, k)) : h('p', { class: 'muted small' }, '—'),
        col.length > 30 ? h('small', { class: 'muted' }, t(l('+{n} (use os filtros ou a Lista)', '+{n} (use filters or the List)'), { n: col.length - 30 })) : null);
    })),
    ks.length ? null : h('p', { class: 'muted' }, t(l('Ninguém no funil com esses filtros. Vá em Procurar para achar nomes.', 'Nobody in the funnel with these filters. Go to Search to find names.'))),
  );
}

// ---------------------------------------------------------------- DECIDIR
function decidir(s: GameState): HTMLElement {
  const ids = scout11(s).compare.filter((id) => s.acts[id] && s.knowledge[id]);
  if (!ids.length) return h('div', { class: 't23' }, h('p', { class: 'muted' }, t(l('Marque "Comparar" em até três cards do Funil para vê-los lado a lado aqui.', 'Tick "Compare" on up to three Funnel cards to see them side by side here.'))));
  const k = (id: string) => s.knowledge[id];
  const rows: [L, (id: string) => Node | string][] = [
    [l('Origem', 'Origin'), (id) => t(originText23(s, k(id)))],
    [l('Etapa', 'Stage'), (id) => t(COLS23[column23(s, k(id))].name)],
    [l('Gênero · cidade', 'Genre · city'), (id) => `${genreName(s.acts[id].genre)} · ${cityName(s.acts[id].city)}`],
    [l('Formato', 'Format'), (id) => (s.acts[id].members.length > 1 ? t(l('banda', 'band')) : t(l('solo', 'solo')))],
    [l('Alcance', 'Reach'), (id) => uncEl(unc23(s, id, 'fame'), l('Alcance', 'Reach'))],
    [l('Talento', 'Talent'), (id) => uncEl(unc23(s, id, 'talent'), l('Talento', 'Talent'))],
    [l('Potencial', 'Potential'), (id) => uncEl(unc23(s, id, 'potential'), l('Potencial', 'Potential'))],
    [l('Ambição e traços', 'Ambition and traits'), (id) => (visibleFields(k(id).degree).traits ? t(l('conhecidos (ver dossiê)', 'known (see dossier)')) : visibleFields(k(id).degree).ambition ? t(l('ambição conhecida', 'ambition known')) : '?')],
    [l('Relatório', 'Report'), (id) => t(l('{n} mês(es)', '{n} month(s)'), { n: reportAge23(s, k(id)).months })],
    [l('Rivais', 'Rivals'), (id) => { const r = rivalWatch23(s, id); return r ? h('span', { class: r.hard ? 'bad-t' : 'warn-t' }, t(r.text)) : '—'; }],
    [l('Adiantamento esperado', 'Expected advance'), (id) => $(defaultOffer(s, s.acts[id]).advance)],
    [l('Próximo passo', 'Next step'), (id) => (s.acts[id].owner ? '—' : stepBtn(s, id))],
  ];
  return h('div', { class: 't23' },
    h('p', { class: 'muted small' }, t(l('Faixas largas = pouca informação. Se "Potencial" ainda é ?, um passo a mais pode evitar um contrato caro.', 'Wide ranges = little info. If "Potential" is still ?, one more step may save you an expensive deal.'))),
    h('div', { class: 't23-scroll' }, h('table', { class: 'tbl compact t23-cmp' },
      h('thead', null, h('tr', null, h('th', null, ''), ...ids.map((id) => h('th', null, logo(s.acts[id], 28), ' ', actLink(s, id), ' ', h('button', { class: 'btn tiny ghost', title: t(l('Remover', 'Remove')), onclick: () => { toggleCompare(s, id); rerender(); } }, '✕'))))),
      h('tbody', null, rows.map(([lab, f]) => h('tr', null, h('th', null, t(lab)), ...ids.map((id) => h('td', null, f(id))))),
        h('tr', null, h('th', null, ''), ...ids.map((id) => h('td', null, s.acts[id].owner ? pill(t(l('contratado', 'signed')), 'bad')
          : h('button', { class: 'btn primary', onclick: () => openOffer(id) }, t(l('Abrir proposta', 'Open offer'))), ' ', h('button', { class: 'btn small ghost', onclick: () => openDossier(id) }, t(l('Dossiê', 'Dossier'))))))))),
  );
}

// ---------------------------------------------------------------- LISTA (relatórios)
function lista(s: GameState): HTMLElement {
  const ks = known(s);
  return h('div', { class: 't23' },
    h('p', { class: 'muted small' }, t(l('Todos os nomes que você conhece, com a idade do relatório. Relatórios com mais de um ano podem perder grau.', 'Every name you know, with report age. Reports over a year old may lose a degree.'))),
    filters(),
    h('div', { class: 't23-scroll' }, h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Artista', 'Act'), l('Etapa', 'Stage'), l('Origem', 'Origin'), l('Alcance', 'Reach'), l('Talento', 'Talent'), l('Potencial', 'Potential'), l('Relatório', 'Report'), l('', '')].map((x) => h('th', null, t(x))))),
      h('tbody', null, ks.slice(0, 200).map((k) => {
        const age = reportAge23(s, k);
        return h('tr', null,
          h('td', null, isWatched(s, k.actId) ? '★ ' : '', actLink(s, k.actId)),
          h('td', null, t(COLS23[column23(s, k)].name)),
          h('td', { class: 'small muted' }, t(originText23(s, k))),
          ...(['fame', 'talent', 'potential'] as const).map((f) => { const u = unc23(s, k.actId, f); return h('td', { class: `t23-u ${u.kind === '?' ? 'unk' : u.kind === '~' ? 'est' : 'ok'}` }, u.kind === '?' ? '?' : u.kind === '✓' ? `✓ ${u.v}` : `~ ${u.lo}–${u.hi}`); }),
          h('td', { class: age.stale ? 'warn-t' : '' }, t(l('{n} m', '{n} mo'), { n: age.months })),
          h('td', null, h('button', { class: 'btn tiny ghost', onclick: () => openDossier(k.actId) }, t(l('Dossiê', 'Dossier')))));
      })))),
  );
}

// ---------------------------------------------------------------- hub
const OLD: Record<string, string> = { classic: 'funnel', discovery: 'search' };

/** Tela Talentos (área 'market'): mantém as rotas antigas (#/market/marketHub=classic|discovery) redirecionando. */
export function talentosHub23(g: GameState, render: () => void): HTMLElement {
  const cur = getTab('marketHub');
  if (cur && OLD[cur]) setTab('marketHub', OLD[cur]);
  const inFunnel = Object.values(g.knowledge).filter((k) => g.acts[k.actId] && !g.acts[k.actId].owner).length;
  const ready = Object.values(g.knowledge).filter((k) => g.acts[k.actId] && !g.acts[k.actId].owner && column23(g, k) === 'ready').length;
  const isLabel = g.config.role !== 'artist';
  return h('div', { class: 'hub' },
    h('p', { class: 'muted small t23-title' }, t(l('Procurar nomes → filtrar no Funil → Decidir e propor.', 'Search for names → sift in the Funnel → Decide and offer.'))),
    tabs('marketHub', mergeTabs([
      ...(isLabel ? [
        { id: 'search', label: t(l('Procurar', 'Search')), icon: 'globe', badge: scout23(g).trips.length || undefined, render: () => procurar(g) },
        { id: 'funnel', label: t(l('Funil', 'Funnel')), icon: 'fans', badge: inFunnel || undefined, render: () => funil(g) },
        { id: 'decide', label: t(l('Decidir', 'Decide')), icon: 'handshake', badge: ready || undefined, render: () => decidir(g) },
        { id: 'list', label: t(l('Lista e relatórios', 'List and reports')), icon: 'note', render: () => lista(g) },
      ] : []),
      { id: 'auctions', label: t(l('Leilões', 'Auctions')), icon: 'gavel', badge: g.auctions.filter((a) => a.status === 'open').length || undefined, render: () => auctionsSection(g) },
      { id: 'team', label: t(l('Olheiros e equipe', 'Scouts and staff')), icon: 'star', render: () => h('div', null, scoutsSection(g), contestsSection(g), professionals(g)) },
    ], 'marketHub', g), render));
}
