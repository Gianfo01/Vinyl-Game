// Rodada 18 (talent18) — área "Talentos e formação": canais de descoberta (com qualidade/visibilidade da informação),
// shows para ver quem abre, disputas com rivais e "os que escaparam"; camps de composição e pedidos de canção das
// estrelas; banda da casa; escolas de música e bolsas; TV de talentos. E a aba "Acervo vivo" em Lendas (relíquias
// nascidas na partida, legado → valor, perícia, ala-museu, exposição itinerante).

import { FAMILIES, l, type FamilyId, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { estimate } from '../../sim/scouting';
import { CAMP_SIZE18, campCost18, campModel18, camps18, holdCamp18, pitchable18, pitchOdds18, pitchSong18 } from '../../sim/sys/camps18';
import { CH18, chCost18, chNoise18, chNow18, demoMedium18, dig18, disc18, showsNow18, watchShow18 } from '../../sim/sys/discover18';
import { playerPerson } from '../../sim/sys/life';
import { actOfPerson17 } from '../../sim/sys/love17';
import { ORIGIN18, WING18, authFee18, authenticate18, buildWing18, legacy18, rel18, shown18, tourExhibit18, wingYield18 } from '../../sim/sys/relics18';
import { RELIC_KIND, RELIC_ST, relics, toggleExhibit } from '../../sim/sys/relics9';
import { OWN18, SCHOOLS18, bolsaCost18, foundSchool18, school18, schoolName18, schoolYield18, schoolsNow18, setBolsas18, setTeacher18 } from '../../sim/sys/school18';
import { disbandHB18, foundHB18, hbMaxQ18, hbSalary18, hbSetup18, sess18, setCredit18, setRent18 } from '../../sim/sys/session18';
import { FR18, becomePartner18, frName18, frNow18, ownCost18, partnerFee18, produceShow18, pushCost18, pushVotes18, setJudge18, tv18, voteScore18 } from '../../sim/sys/tv18';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok?: L) => { if (r) toast(T(r), 'info'); else if (ok) toast(T(ok), 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false, cls = 'btn small') => h('button', { class: cls, disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const card = (...k: (Node | string | null)[]) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const rng = (s: GameState, id: string, f: 'talent' | 'potential') => { const e = estimate(s, id, f); return e ? `${e.lo}–${e.hi}` : '?'; };
const chName = (id: string): L => CH18.find((c) => c.id === id)?.name ?? (id === 'opener' ? l('Banda de abertura', 'Opening act') : id === 'demo' ? l('Demo', 'Demo') : id === 'tv' ? l('TV', 'TV') : l(id, id));

// ---------------------------------------------------------------- descoberta
function discTab(s: GameState): HTMLElement {
  const st = disc18(s);
  const chs = chNow18(s);
  const hot = Object.entries(st.hot).filter(([id]) => s.acts[id] && !s.acts[id].owner);
  const leads = st.leads.slice().reverse().slice(0, 18);
  const gone = Object.keys(st.gone).map((id) => s.acts[id]).filter(Boolean);
  return h('div', null,
    section(t(l('Canais desta época', 'Channels of this era')),
      muted(fmtLs(l('Demos chegam sozinhas pela Caixa ({m}). Canais públicos acham mais gente, mas com informação pior e rivais de olho.', 'Demos arrive on their own in the Inbox ({m}). Public channels find more people, but with worse info and rivals watching.'), { m: t(demoMedium18(s)) })),
      ...chs.map((c) => card(
        row(h('b', null, t(c.name)), pill(`${$(chCost18(s, c))} · ${c.balls}●`), why18(s, 'disc18.ch', { ch: c.id }, pill(fmtLs(l('grau {d} · ±{e}', 'degree {d} · ±{e}'), { d: c.deg, e: Math.round(chNoise18(s, c)) }), c.deg >= 3 ? 'good' : '')),
          pill(fmtLs(l('rivais {v}%', 'rivals {v}%'), { v: Math.round(c.vis * 100) }), c.vis > 0.3 ? 'bad' : '')),
        muted(c.desc), muted(fmtLs(l('Você aprende: {w}', 'You learn: {w}'), { w: t(c.sees) })),
        btn(l('Ir atrás', 'Go looking'), () => { const r = dig18(s, c.id); toast(t(r.text), r.ok ? 'good' : 'info'); rerender(); })))),
    section(t(l('Ir a um show e ver quem abre', 'Go to a show and watch the opener')),
      ...(showsNow18(s).length ? showsNow18(s).map((a) => row(actLink(s, a.id), pill(`${Math.round(a.fame)}★`), btn(l('Ir ao show (1●)', 'Go to the show (1●)'), () => { const r = watchShow18(s, a.id); toast(t(r.text), r.ok ? 'good' : 'info'); rerender(); }))) : [muted(l('Nenhum cabeça de cartaz no seu mercado agora.', 'No headliners in your market right now.'))])),
    hot.length ? section(t(l('Disputas com rivais', 'Bidding against rivals')), ...hot.map(([id, x]) => row(actLink(s, id), pill(s.labels[x.lb]?.name ?? '?', 'bad'), pill(fmtLs(l('{w} sem.', '{w} wk'), { w: Math.max(0, x.w - s.week) }), 'warn'), muted(l('Faça a proposta na ficha do artista antes do prazo.', 'Make the offer on the artist page before the deadline.'))))) : null,
    section(t(l('Seus achados', 'Your finds')),
      leads.length ? h('table', { class: 'table small' }, h('tr', null, ...[l('Artista', 'Artist'), l('Canal', 'Channel'), l('Talento', 'Talent'), l('Potencial', 'Potential'), l('Situação', 'Status'), l('Nota', 'Note')].map((x) => h('th', null, t(x)))),
        ...leads.map((x) => { const a = s.acts[x.a]; return a ? h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, t(chName(x.ch))), h('td', null, rng(s, a.id, 'talent')), h('td', null, rng(s, a.id, 'potential')),
          h('td', null, a.owner === 'player' ? pill(t(l('seu', 'yours')), 'good') : a.owner ? pill(s.labels[a.owner]?.name ?? '?', 'bad') : st.hot[a.id] ? pill(t(l('disputado', 'contested')), 'warn') : pill(t(l('livre', 'free')))), h('td', { class: 'muted' }, t(x.note))) : null; }))
        : muted(l('Ninguém ainda. Use um canal acima, vá a um show ou ouça as demos da Caixa.', 'Nobody yet. Use a channel above, go to a show or listen to the Inbox demos.'))),
    gone.length ? section(t(l('Os que escaparam', 'The ones that got away')), ...gone.map((a) => row(actLink(s, a.id), pill(`${Math.round(a.fame)}★`), pill(s.labels[a.owner ?? '']?.name ?? '?'), st.passed[a.id] !== undefined ? pill(t(l('você recusou a demo', 'you passed on the demo')), 'bad') : null))) : null);
}
function fmtLs(x: L, p: Record<string, string | number>): string { return t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? '')); }

// ---------------------------------------------------------------- camps e pitching
const F = { host: '', size: 2, top: 1, song: {} as Record<string, string>, cut: {} as Record<string, boolean>, fam: 'rnb' as FamilyId, credit: true, show: '' };
function campsTab(s: GameState): HTMLElement {
  const st = camps18(s);
  const mine = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  if (!F.host || !s.acts[F.host] || s.acts[F.host].owner !== 'player') F.host = mine[0]?.id ?? '';
  const songs = pitchable18(s);
  const open = st.pitches.filter((p) => !p.done && p.until >= s.week);
  return h('div', null,
    section(t(l('Acampamento de composição', 'Songwriting camp')),
      muted(fmtLs(l('Modelo da época: {m}. Topliners rendem refrões fortes (mais melodia) e cobram parte da edição; a originalidade cai um pouco.', 'Model of the era: {m}. Topliners bring strong hooks (more melody) and take a share of publishing; originality drops a little.'), { m: t(campModel18(s)) })),
      mine.length ? row(
        select(F.host, mine.map((a) => ({ value: a.id, label: a.name })), (v) => { F.host = v; rerender(); }),
        select(F.size, [1, 2, 3].map((n) => ({ value: n, label: `${t(CAMP_SIZE18[n].name)} (${CAMP_SIZE18[n].songs})` })), (v) => { F.size = Number(v); rerender(); }),
        select(F.top, [0, 1, 2, 3, 4].map((n) => ({ value: n, label: fmtLs(l('{n} topliner(s)', '{n} topliner(s)'), { n }) })), (v) => { F.top = Number(v); rerender(); }),
        pill($(campCost18(s, F.size, F.top))),
        btn(l('Fazer o camp (2 semanas)', 'Run the camp (2 weeks)'), () => say(holdCamp18(s, F.host, F.size, F.top), l('Camp marcado: canções em 2 semanas.', 'Camp booked: songs in 2 weeks.')))) : muted(l('Precisa de um ato no elenco.', 'You need an act on the roster.')),
      ...st.camps.slice().reverse().slice(0, 5).map((c) => row(actLink(s, c.host), pill(t(CAMP_SIZE18[c.size].name)), c.songs ? h('span', { class: 'small' }, c.songs.map((id) => s.songs[id] ? `"${s.songs[id].title}" Q${Math.round(s.songs[id].q)}` : '').join(' · ')) : pill(t(l('em andamento', 'running')), 'warn')))),
    section(t(l('Pedidos de canção (pitching)', 'Song requests (pitching)')),
      muted(l('Estrelas de outros selos procuram repertório. Se gravarem a sua, entra cachê agora e royalties enquanto vender. Crédito pedido ("cut-in") aumenta a chance, mas custa royalties — e o compositor pode não engolir se virar hit.', 'Stars from other labels look for material. If they record yours, a fee now and royalties while it sells. A credit demand ("cut-in") raises the odds, but costs royalties — and your writer may not swallow it if it becomes a hit.')),
      open.length ? h('div', null, ...open.map((p) => {
        const a = s.acts[p.a];
        if (!a) return null;
        const sid = F.song[p.id] && s.songs[F.song[p.id]] ? F.song[p.id] : songs[0]?.id ?? '';
        const odds = sid ? pitchOdds18(s, p.id, sid, !!F.cut[p.id]) : null;
        return card(row(actLink(s, a.id), pill(a.genre.replace(/_/g, ' ')), pill(`Q${p.minQ}+`), pill($(p.fee)), pill(fmtLs(l('{w} sem.', '{w} wk'), { w: p.until - s.week })), p.cut ? pill(fmtLs(l('quer {p}% do crédito', 'wants {p}% of credit'), { p: Math.round(p.cut * 100) }), 'warn') : null),
          songs.length ? row(select(sid, songs.map((x) => ({ value: x.id, label: `${x.title} · Q${Math.round(x.q)} · ${s.acts[x.actId]?.name ?? ''}` })), (v) => { F.song[p.id] = v; rerender(); }),
            p.cut ? h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: !!F.cut[p.id], onchange: () => { F.cut[p.id] = !F.cut[p.id]; rerender(); } }), ' ', t(l('ceder o crédito', 'give up the credit'))) : null,
            odds ? why18(s, 'camps18.pitch', { pitch: p.id, song: sid, cut: F.cut[p.id] ? 1 : 0 }, pill(`${Math.round(odds.p * 100)}%`, odds.p > 0.5 ? 'good' : '')) : null,
            btn(l('Oferecer', 'Pitch'), () => { toast(t(pitchSong18(s, p.id, sid, !!F.cut[p.id])), 'info'); rerender(); })) : muted(l('Sem inéditas para oferecer (faça um camp).', 'No unreleased songs to pitch (run a camp).')));
      })) : muted(l('Nenhum pedido aberto. Eles chegam pela Caixa.', 'No open requests. They arrive in the Inbox.'))));
}

// ---------------------------------------------------------------- banda da casa
function bandTab(s: GameState): HTMLElement {
  const hb = sess18(s).hb;
  const log = sess18(s).log.slice().reverse().slice(0, 8);
  if (!hb) return section(t(l('Banda da casa', 'House band')),
    muted(l('Funk Brothers na Motown, Wrecking Crew em LA, Swampers em Muscle Shoals: um time fixo que grava com todo o elenco. Som de assinatura com o tempo — e a velha briga por crédito.', 'Funk Brothers at Motown, the Wrecking Crew in LA, the Swampers in Muscle Shoals: a fixed team that records with the whole roster. A signature sound over time — and the old fight over credit.')),
    row(select(F.fam, FAMILIES.map((f) => ({ value: f.id, label: t(f.name) })), (v) => { F.fam = v; rerender(); }),
      h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.credit, onchange: () => { F.credit = !F.credit; rerender(); } }), ' ', t(l('crédito na capa (+20% de salário, sem revolta)', 'sleeve credit (+20% salary, no revolt)'))),
      pill(fmtLs(l('montagem {c} · {m}/mês', 'setup {c} · {m}/month'), { c: $(hbSetup18(s)), m: $(hbSalary18(s, { credit: F.credit } as never)) })),
      btn(l('Montar a banda da casa', 'Form the house band'), () => say(foundHB18(s, F.fam, F.credit), l('Banda montada.', 'Band formed.')))));
  return section(fmtLs(l('Banda da casa: {n}', 'House band: {n}'), { n: hb.name }),
    row(pill(fmtLs(l('qualidade {q} (teto {m})', 'quality {q} (cap {m})'), { q: hb.q.toFixed(2), m: hbMaxQ18(hb).toFixed(2) }), 'good'), why18(s, 'sess18.bonus', {}, pill(fmtLs(l('+{v} por faixa', '+{v} per track'), { v: (0.4 + 1.6 * hb.q).toFixed(1) }))),
      pill(fmtLs(l('{n} sessões', '{n} sessions'), { n: hb.sess })), pill(t(FAMILIES.find((f) => f.id === hb.fam)?.name ?? l('?', '?'))), pill(`${$(hbSalary18(s, hb))}/${t(l('mês', 'mo'))}`),
      hb.strike > s.week ? pill(t(l('EM GREVE', 'ON STRIKE')), 'bad') : null),
    row(h('span', { class: 'small' }, t(l('Ressentimento', 'Resentment'))), h('span', { style: `display:inline-block;width:160px;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--bad,#d04040) ${hb.res}%,rgba(128,128,128,.25) ${hb.res}%)` }), h('span', { class: 'small' }, `${Math.round(hb.res)}/100`)),
    muted(fmtLs(l('Músicos: {p}. Estrela da banda: {a}.', 'Players: {p}. Band star: {a}.'), { p: hb.players.join(', '), a: hb.ace })),
    row(btn(hb.credit ? l('Tirar crédito (−20% salário, ressentimento volta)', 'Remove credit (−20% salary, resentment returns)') : l('Dar crédito na capa', 'Give sleeve credit'), () => say(setCredit18(s, !hb.credit))),
      btn(hb.rent ? l('Parar de alugar', 'Stop renting out') : l('Alugar a outros selos (bônus pela metade)', 'Rent to other labels (half bonus)'), () => say(setRent18(s, !hb.rent))),
      btn(l('Dissolver', 'Disband'), () => say(disbandHB18(s)), false, 'btn small danger')),
    log.length ? h('ul', { class: 'small' }, ...log.map((x) => h('li', null, t(x.t)))) : null);
}

// ---------------------------------------------------------------- escolas
function schoolTab(s: GameState): HTMLElement {
  const st = school18(s);
  const o = st.own;
  const y = schoolYield18(s);
  const pp = playerPerson(s);
  const people = [...(pp ? [pp.id] : []), ...playerActs(s).flatMap((id) => s.acts[id]?.members ?? [])].filter((id, i, a) => a.indexOf(id) === i && s.persons[id]?.alive);
  return h('div', null,
    section(t(l('Bolsas de estudo', 'Scholarships')),
      muted(l('Cada bolsa custa por ano; em 3 anos cerca de 1 em 3 bolsistas monta um ato — já conhecido (grau 4) e sem rival na disputa. Bolsas também dão prestígio institucional.', 'Each scholarship costs yearly; in 3 years about 1 in 3 scholars forms an act — already known (degree 4) and with no rival in the race. Scholarships also give institutional prestige.')),
      ...schoolsNow18(s).map((sc) => card(row(h('b', null, t(schoolName18(s, sc))), pill(`${$(bolsaCost18(s, sc))}/${t(l('ano', 'yr'))}`),
        select(st.bolsas[sc.id] ?? 0, [0, 1, 2, 3, 5, 8, 10].map((n) => ({ value: n, label: fmtLs(l('{n} bolsa(s)', '{n} scholarship(s)'), { n }) })), (v) => say(setBolsas18(s, sc.id, Number(v))))), muted(sc.desc))),
      st.cohorts.length ? muted(fmtLs(l('Turmas a formar: {c}', 'Cohorts to graduate: {c}'), { c: st.cohorts.map((c) => `${t(schoolName18(s, SCHOOLS18.find((x) => x.id === c.sc)!))} ${c.y} (${c.n})`).join(' · ') })) : null),
    section(t(l('Escola do selo', 'Label school')),
      o ? h('div', null, row(pill(t(OWN18[o.lv].name), 'good'), pill(fmtLs(l('{n} alunos', '{n} students'), { n: y.students })), pill(fmtLs(l('prestígio {p}', 'prestige {p}'), { p: Math.round(o.prest) })), why18(s, 'school18.yield', {}, pill(`${$(y.rev - y.cost)}/${t(l('ano', 'yr'))}`, y.rev >= y.cost ? 'good' : 'bad'))),
        row(h('span', { class: 'small' }, t(l('Professor famoso:', 'Famous teacher:'))), select(o.teacher ?? '', [{ value: '', label: '—' }, ...people.map((id) => ({ value: id, label: `${s.persons[id].name}${actOfPerson17(s, id) ? ` (${actOfPerson17(s, id)!.name})` : ''}` }))], (v) => say(setTeacher18(s, v || undefined)))),
        muted(l('Dar aulas é carreira: o professor ganha salário e paz (estresse −6/ano); fama dele enche a escola. Masterclass avulsa: menu de ações da pessoa.', 'Teaching is a career: the teacher earns a salary and peace (stress −6/yr); their fame fills the school. One-off masterclass: the person action menu.'))) : muted(l('Ainda não há escola do selo.', 'No label school yet.')),
      OWN18[(o?.lv ?? 0) + 1] ? row(btn(fmtLs(l('{a}: {n} ({c})', '{a}: {n} ({c})'), { a: t(o ? l('Ampliar', 'Expand') : l('Fundar', 'Found')), n: t(OWN18[(o?.lv ?? 0) + 1].name), c: $(money(s, OWN18[(o?.lv ?? 0) + 1].cost)) }), () => say(foundSchool18(s), l('Feito.', 'Done.'))), muted(OWN18[(o?.lv ?? 0) + 1].desc)) : null));
}

// ---------------------------------------------------------------- TV
function tvTab(s: GameState): HTMLElement {
  const st = tv18(s);
  const se = st.cur && st.cur.y === s.year ? st.cur : undefined;
  const f = frNow18(s);
  const fr = se ? FR18.find((x) => x.id === se.fr) ?? f : f;
  const pp = playerPerson(s);
  const judges = [...(pp ? [pp.id] : []), ...playerActs(s).flatMap((id) => s.acts[id]?.members ?? [])].filter((id, i, a) => a.indexOf(id) === i && s.persons[id]?.alive);
  return h('div', null,
    section(fr ? t(frName18(s, fr)) : t(l('TV de talentos', 'TV talent shows')),
      fr ? muted(fr.desc) : muted(l('Nenhum programa de calouros no seu mercado nesta época.', 'No talent show in your market in this era.')),
      se ? h('div', null,
        row(pill(t(se.stage === 'casting' ? l('seleção', 'casting') : se.stage === 'live' ? l('ao vivo', 'live') : l('encerrada', 'finished')), se.stage === 'live' ? 'warn' : ''),
          pill(se.partner === 'player' ? t(l('você é o selo parceiro', 'you are the partner label')) : se.partner ? fmtLs(l('parceiro: {l}', 'partner: {l}'), { l: s.labels[se.partner]?.name ?? '?' }) : t(l('sem parceiro', 'no partner')), se.partner === 'player' ? 'good' : ''),
          se.judge ? pill(fmtLs(l('jurado: {p}', 'judge: {p}'), { p: s.persons[se.judge]?.name ?? '?' })) : null),
        se.stage === 'casting' && !se.partner && fr ? row(btn(fmtLs(l('Ser o selo parceiro ({c})', 'Become the partner label ({c})'), { c: $(partnerFee18(s, fr)) }), () => say(becomePartner18(s), l('Parceria fechada: o vencedor assina com você.', 'Partnership closed: the winner signs with you.'))), muted(l('Contrato do formato: 360 (20%), royalty 12%, adiantamento pela metade.', 'Format deal: 360 (20%), 12% royalty, half advance.'))) : null,
        se.stage !== 'done' && !se.judge && judges.length ? row(select(F.show || judges[0], judges.map((id) => ({ value: id, label: s.persons[id].name })), (v) => { F.show = v; rerender(); }), btn(l('Indicar como jurado', 'Put forward as judge'), () => say(setJudge18(s, F.show || judges[0]), l('Jurado confirmado.', 'Judge confirmed.')))) : null,
        se.cont.length ? h('table', { class: 'table small' }, h('tr', null, ...[l('Participante', 'Contestant'), l('Voto', 'Vote'), l('Talento', 'Talent'), l('Situação', 'Status'), l('Campanha', 'Campaign')].map((x) => h('th', null, t(x)))),
          ...se.cont.slice().sort((a, b) => voteScore18(s, se, b) - voteScore18(s, se, a)).map((c) => h('tr', null, h('td', null, actLink(s, c.a)), h('td', null, why18(s, 'tv18.vote', { act: c.a }, String(Math.round(voteScore18(s, se, c))))), h('td', null, rng(s, c.a, 'talent')),
            h('td', null, c.out !== undefined ? pill(t(l('eliminado', 'out')), 'bad') : se.top?.[0] === c.a ? pill(t(l('VENCEDOR', 'WINNER')), 'good') : se.top?.indexOf(c.a) === 1 || se.top?.indexOf(c.a) === 2 ? pill(t(l('pódio', 'podium'))) : pill(t(l('na disputa', 'in the race')))),
            h('td', null, se.stage === 'live' && c.out === undefined ? h('span', null, btn(fmtLs(l('Campanha {c}', 'Campaign {c}'), { c: $(pushCost18(s)) }), () => say(pushVotes18(s, c.a, false), l('Campanha no ar.', 'Campaign on air.'))), ' ', btn(l('Votos em massa (arriscado)', 'Mass votes (risky)'), () => say(pushVotes18(s, c.a, true), l('Centrais de voto contratadas. Torça para não vazar.', 'Call centres hired. Hope it does not leak.')), false, 'btn small danger')) : null))))
          : muted(l('Os participantes aparecem em abril, quando começam os programas ao vivo.', 'Contestants appear in April, when the live shows start.'))) : muted(l('A temporada abre em fevereiro.', 'The season opens in February.'))),
    st.past.length ? section(t(l('Temporadas anteriores', 'Past seasons')), ...st.past.slice().reverse().slice(0, 8).map((p) => row(pill(String(p.y)), h('span', { class: 'small' }, t(frName18(s, FR18.find((x) => x.id === p.fr) ?? fr ?? FR18[0]))), p.top?.[0] ? actLink(s, p.top[0]) : null, p.top?.[0] && s.acts[p.top[0]] ? pill(`${Math.round(s.acts[p.top[0]].fame)}★`) : null, p.partner === 'player' ? pill(t(l('seu', 'yours')), 'good') : null))) : null,
    section(t(l('Produzir o seu programa', 'Produce your own show')),
      st.own ? row(pill(st.own.name, 'good'), pill(fmtLs(l('desde {y}', 'since {y}'), { y: st.own.since })), pill(`${$(st.own.inc)}/${t(l('ano', 'yr'))}`, st.own.inc >= 0 ? 'good' : 'bad'), muted(l('Você é parceiro de toda temporada: vencedores assinam com você; publicidade paga a produção.', 'You partner every season: winners sign with you; advertising pays for production.')))
        : s.year >= 1950 ? row(h('input', { type: 'text', placeholder: t(l('Nome do programa', 'Show name')), value: F.show && !s.persons[F.show] ? F.show : '', oninput: (e: Event) => { F.show = (e.target as HTMLInputElement).value; } }), btn(fmtLs(l('Produzir ({c})', 'Produce ({c})'), { c: $(ownCost18(s)) }), () => say(produceShow18(s, F.show && !s.persons[F.show] ? F.show : t(l('Talento Total', 'Total Talent'))), l('Programa no ar a partir da próxima temporada.', 'Show on air from next season.'))))
          : muted(l('Ainda não há TV.', 'No TV yet.'))));
}

registerArea({ id: 'talent18', label: l('Talentos e formação', 'Talent & training'), icon: 'star', key: '', render: (s) => h('div', { class: 'page' },
  h('h2', null, t(l('Talentos e formação', 'Talent & training'))),
  tabs('talent18', [
    { id: 'disc', label: t(l('Descoberta', 'Discovery')), icon: 'fans', badge: Object.keys(disc18(s).hot).length || undefined, render: () => discTab(s) },
    { id: 'camps', label: t(l('Composição', 'Songwriting')), icon: 'pen', badge: camps18(s).pitches.filter((p) => !p.done && p.until >= s.week).length || undefined, render: () => campsTab(s) },
    { id: 'band', label: t(l('Banda da casa', 'House band')), icon: 'guitar', render: () => bandTab(s) },
    { id: 'school', label: t(l('Escolas', 'Schools')), icon: 'note', render: () => schoolTab(s) },
    { id: 'tv', label: t(l('TV de talentos', 'TV talent shows')), icon: 'star', render: () => tvTab(s) },
  ], rerender)) });

// ---------------------------------------------------------------- Lendas → Acervo vivo
export function relics18Tab(s: GameState): HTMLElement {
  const st = rel18(s);
  const list = relics(s).list.filter((x) => x.st !== 'lost');
  const born = list.filter((x) => st.m[x.id] && !['base', 'real'].includes(st.m[x.id].o)).sort((a, b) => b.y - a.y).slice(0, 24);
  const mine = list.filter((x) => x.st === 'player');
  const auc = list.filter((x) => x.st === 'auction' && !x.rr);
  const w = WING18[st.wing], nx = WING18[st.wing + 1];
  const y = wingYield18(s);
  const relRow = (x: typeof list[number]) => {
    const m = st.m[x.id];
    const lg = legacy18(s, x);
    return card(row(h('b', null, t(x.n)), pill(t(RELIC_KIND[x.k])), pill(String(x.y)), m ? pill(t(ORIGIN18[m.o] ?? ORIGIN18.base)) : null, m?.alt ? pill(t(l('história alternativa', 'alternate history')), 'warn') : null, pill(t(RELIC_ST[x.st])),
      why18(s, 'relic.value', { id: x.id }, pill($(money(s, x.v)), 'good')), pill(`×${lg.m.toFixed(2)}`), m?.auth ? pill(t(l('autenticada', 'authenticated')), 'good') : null, x.a ? actLink(s, x.a) : null),
      m?.st ? muted(m.st) : null,
      row(x.st === 'auction' && !m?.auth ? btn(fmtLs(l('Perícia ({c})', 'Appraisal ({c})'), { c: $(authFee18(s, x)) }), () => { toast(t(authenticate18(s, x.id)), 'info'); rerender(); }) : null,
        x.st === 'player' && !x.ln ? btn(x.ex ? l('Guardar no cofre', 'Back to vault') : l('Expor', 'Put on show'), () => say(toggleExhibit(s, x.id))) : null,
        x.st === 'player' && !m?.auth ? btn(l('Certificar', 'Certify'), () => { toast(t(authenticate18(s, x.id)), 'info'); rerender(); }) : null));
  };
  return h('div', null,
    muted(s.config.realNames ? l('Peças reais (catálogo histórico) e peças nascidas nesta partida. Fora do modo "Vida real exata", depois do início a história das peças reais vira alternativa.', 'Real pieces (historic catalogue) and pieces born in this run. Outside "Exact real life" mode, after the start the history of real pieces becomes alternate.')
      : l('Modo fictício: toda relíquia nasce dos fatos desta partida.', 'Fictional mode: every relic is born from the facts of this run.')),
    section(t(l('Ala-museu do selo', 'Label museum wing')),
      row(pill(t(w.name), st.wing ? 'good' : ''), pill(fmtLs(l('{n} peças expostas', '{n} pieces on show'), { n: shown18(s).length })), pill(fmtLs(l('{v} visitantes/ano', '{v} visitors/yr'), { v: y.vis.toLocaleString() })), st.wing ? pill(`${$(st.inc)}/${t(l('ano', 'yr'))}`, st.inc >= 0 ? 'good' : 'bad') : null),
      muted(y.why.map((x) => t(x)).join(' · ')),
      row(nx ? btn(fmtLs(l('Construir: {n} ({c})', 'Build: {n} ({c})'), { n: t(nx.name), c: $(money(s, nx.cost)) }), () => say(buildWing18(s), l('Inaugurado!', 'Opened!'))) : null,
        btn(l('Exposição itinerante (6 meses)', 'Touring exhibition (6 months)'), () => { toast(t(tourExhibit18(s)), 'info'); rerender(); }, mine.filter((x) => x.ex).length < 3))),
    auc.length ? section(t(l('Em leilão — confira a procedência', 'At auction — check provenance')), muted(l('Cerca de 1 em 12 lotes não catalogados é falso. Perícia antes do lance evita o vexame.', 'About 1 in 12 uncatalogued lots is fake. An appraisal before bidding avoids the embarrassment.')), ...auc.map(relRow)) : null,
    mine.length ? section(t(l('Seu acervo', 'Your collection')), ...mine.map(relRow)) : null,
    section(t(l('Nascidas nesta partida', 'Born in this run')), born.length ? h('div', null, ...born.map(relRow)) : muted(l('Shows lendários, nº 1, prêmios, mortes, escândalos e capas criam peças com história.', 'Legendary shows, #1s, awards, deaths, scandals and covers create pieces with a story.'))));
}
