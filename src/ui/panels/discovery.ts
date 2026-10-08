// Descoberta e rivais: olheiros (viés, custo, missões), concursos, demos, leilões; arquétipos dos
// rivais, espionagem e segurança.

import { FAMILIES, MARKETS, l, type L, type MarketId } from '../../data/world';
import { t } from '../../i18n/strings';
import { attendContest, fireScout, hireScout, listenDemo, raiseBid, scoutPool, sendScout, sponsorContest, startAuction, withdrawAuction } from '../../sim/discovery';
import { ARCHETYPES, archetypeOf, buySecurity, spyOnRival } from '../../sim/rivals2';
import { defaultOffer } from '../../sim/contracts';
import type { GameState } from '../../sim/types';
import type { Scout } from '../../sim/xtypes';
import { rngOf } from '../../sim/util';
import { $, actLink, cityName, genreName, labelLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { chips, ic, stat, tile } from '../vis';

const say = (e: L | null, ok: L) => toast(t(e ?? ok), e ? 'bad' : 'good');
let pool: Scout[] = [];
let poolMonth = -1;

export function scoutsSection(s: GameState): HTMLElement {
  const r = rngOf(s);
  const m = s.year * 12 + s.month;
  if (poolMonth !== m) {
    pool = scoutPool(s, r);
    poolMonth = m;
  }
  const famName = (id: string) => t(FAMILIES.find((f) => f.id === id)?.name) || id;
  const mkName = (id: string) => t(MARKETS.find((x) => x.id === id)?.name) || id;
  return section(t(l('Olheiros', 'Scouts')),
    s.scouts.length ? h('div', { class: 'cards' }, s.scouts.map((sc) => tile('fans', sc.name, [
      chips(stat('globe', mkName(sc.region), l('Região', 'Region')), stat('guitar', famName(sc.family), l('Especialidade', 'Specialty')), stat('sparkle', sc.skill, l('Habilidade', 'Skill')), stat('money', $(sc.salary), l('Salário', 'Salary'))),
      h('small', { class: 'muted' }, t(l('Viés: {b}', 'Bias: {b}'), { b: sc.bias > 3 ? t(l('otimista', 'optimistic')) : sc.bias < -3 ? t(l('pessimista', 'pessimistic')) : t(l('equilibrado', 'balanced')) }), ` · ${sc.found} ${t(l('achados', 'finds'))}`),
      sc.mission ? pill(`${t(l('em missão até sem.', 'on mission until wk'))} ${sc.mission.untilWeek}`, 'warn') : h('div', { class: 'row wrap' },
        select('', [{ value: '', label: t(l('Enviar a…', 'Send to…')) }, ...MARKETS.map((x) => ({ value: x.id, label: `${t(x.name)}${x.id === sc.region ? ' (1 mês)' : ' (2 meses)'}` }))], (v) => { if (v) { say(sendScout(s, sc.id, v as MarketId, sc.family), l('Olheiro em missão.', 'Scout on mission.')); rerender(); } }),
        h('button', { class: 'btn small ghost', onclick: () => { fireScout(s, sc.id); rerender(); } }, t(l('Dispensar', 'Let go'))),
      ),
    ]))) : h('p', { class: 'muted small' }, t(l('Sem olheiros. Cada um tem região, especialidade, viés e salário.', 'No scouts. Each has a region, specialty, bias and salary.'))),
    h('h4', null, t(l('Disponíveis este mês', 'Available this month'))),
    h('div', { class: 'cards' }, pool.map((sc) => tile('fans', sc.name, [
      chips(stat('globe', mkName(sc.region), l('Região', 'Region')), stat('guitar', famName(sc.family), l('Especialidade', 'Specialty')), stat('sparkle', sc.skill, l('Habilidade', 'Skill'))),
      h('button', { class: 'btn small', onclick: () => { say(hireScout(s, sc), l('Contratado.', 'Hired.')); pool = pool.filter((x) => x !== sc); rerender(); } }, `${t(l('Contratar', 'Hire'))} ${$(sc.salary)}/${t(l('mês', 'mo'))}`),
    ]))),
  );
}

export function contestsSection(s: GameState): HTMLElement {
  const open = s.contests.filter((c) => !c.winner);
  const done = s.contests.filter((c) => c.winner).slice(-4);
  return section(t(l('Concursos e festivais de revelação', 'Talent contests and showcases')),
    open.length ? h('div', { class: 'cards' }, open.map((c) => tile(c.kind === 'showcase' ? 'mic' : 'trophy', t(c.name), [
      h('small', null, `${cityName(c.city)} · ${t(l('semana', 'week'))} ${c.week} · ${c.entrants.length} ${t(l('inscritos', 'entrants'))}`),
      c.attended ? pill(t(l('você vai assistir', 'you will attend')), 'good') : h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => { say(attendContest(s, c.id), l('Presença confirmada: verá todos de perto.', 'Attendance confirmed: you will see everyone up close.')); rerender(); } }, t(l('Assistir', 'Attend'))),
        h('button', { class: 'btn small ghost', onclick: () => { say(sponsorContest(s, c.id), l('Concurso patrocinado.', 'Contest sponsored.')); rerender(); } }, t(l('Patrocinar', 'Sponsor')))),
    ]))) : h('p', { class: 'muted small' }, t(l('Nenhum concurso anunciado.', 'No contest announced.'))),
    done.length ? h('ul', { class: 'small' }, done.map((c) => h('li', null, ic('trophy'), ' ', t(c.name), ': ', actLink(s, c.winner)))) : null,
  );
}

export function demosSection(s: GameState): HTMLElement {
  const r = rngOf(s);
  return section(t(l('Demos recebidas', 'Incoming demos')), s.demos.length ? h('div', { class: 'cards' }, s.demos.map((d) => {
    const a = s.acts[d.actId];
    return tile('cassette', a?.name ?? '?', [
      h('small', null, `${genreName(a?.genre ?? '')} · ${cityName(a?.city ?? '')}`),
      d.heard ? h('span', null, t(l('Impressão: ', 'Impression: ')), h('b', null, `${d.hint}`), h('small', { class: 'muted' }, t(l(' (uma demo engana)', ' (a demo can mislead)')))) : h('button', { class: 'btn small', onclick: () => { say(listenDemo(s, r, d.id), l('Ouvida. O ato entrou no radar.', 'Listened. The act is on your radar.')); rerender(); } }, ic('cassette'), ' ', t(l('Ouvir', 'Listen'))),
      h('small', { class: 'muted' }, t(l('expira na semana {w}', 'expires week {w}'), { w: d.expires })),
    ]);
  })) : h('p', { class: 'muted small' }, t(l('Nenhuma demo. Reputação com artistas atrai mais.', 'No demos. Reputation with artists attracts more.'))));
}

export function auctionsSection(s: GameState): HTMLElement {
  const r = rngOf(s);
  const hot = Object.values(s.acts).filter((a) => !a.owner && a.fame > 12 && (s.knowledge[a.id]?.degree ?? 0) >= 2 && !s.auctions.some((x) => x.actId === a.id && x.status === 'open')).slice(0, 6);
  const open = s.auctions.filter((a) => a.status === 'open');
  return section(t(l('Leilões de contrato', 'Contract bidding wars')),
    open.map((au) => {
      const a = s.acts[au.actId];
      const parties = [...new Set(au.bids.map((b) => b.party))];
      const best = (p: string) => au.bids.filter((b) => b.party === p).sort((x, y) => y.advance - x.advance)[0];
      const top = Math.max(...au.bids.map((b) => b.advance));
      const mine = best('player');
      return h('div', { class: 'auction' },
        h('header', null, ic('gavel', 2), h('b', null, a?.name ?? ''), pill(`${t(l('termina na semana', 'ends week'))} ${au.endsWeek}`)),
        h('ul', { class: 'bids' }, parties.map((p) => { const b = best(p); return h('li', { class: p === 'player' ? 'mine' : '' }, p === 'player' ? s.config.companyName : labelLink(s, p), ` — ${$(b.advance)} · ${Math.round(b.royalty * 100)}%`); })),
        h('div', { class: 'row' },
          h('button', { class: 'btn small primary', onclick: () => { say(raiseBid(s, au.id, Math.round(top * 1.15), (mine?.royalty ?? 0.15) + 0.01), l('Lance coberto.', 'Bid raised.')); rerender(); } }, `${t(l('Cobrir', 'Raise'))} ${$(Math.round(top * 1.15))}`),
          h('button', { class: 'btn small ghost', onclick: () => { withdrawAuction(s, au.id); rerender(); } }, t(l('Desistir', 'Withdraw'))),
        ),
        h('p', { class: 'muted small' }, t(l('O artista escolhe pela utilidade (dinheiro, royalties, reputação), não só pelo maior lance.', 'The artist picks by utility (money, royalties, reputation), not just the highest bid.'))),
      );
    }),
    hot.length ? h('div', { class: 'cards' }, hot.map((a) => tile('fire', a.name, [
      h('small', null, `★${Math.round(a.fame)} · ${genreName(a.genre)}`),
      h('button', { class: 'btn small', onclick: () => { const o = defaultOffer(s, a); const res = startAuction(s, r, a.id, o.advance, o.royalty); if ('pt' in res) toast(t(res), 'bad'); else toast(t(l('Leilão aberto: rivais podem entrar.', 'Bidding opened: rivals may join.')), 'good'); rerender(); } }, `${t(l('Abrir disputa', 'Open bidding'))} ${$(defaultOffer(s, a).advance)}`),
    ]))) : h('p', { class: 'muted small' }, t(l('Atos promissores no radar (grau 2+) podem ir a leilão.', 'Promising acts on your radar (degree 2+) can go to auction.'))),
  );
}

export function rivalsExtra(s: GameState): HTMLElement {
  const r = rngOf(s);
  const labels = Object.values(s.labels).filter((x) => x.active).sort((a, b) => (s.rivalries[b.id] ?? 0) - (s.rivalries[a.id] ?? 0)).slice(0, 12);
  return section(t(l('Arquétipos, rivalidades e inteligência', 'Archetypes, rivalries and intel')),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => { say(buySecurity(s), l('Segurança reforçada por 12 meses.', 'Security reinforced for 12 months.')); rerender(); } }, ic('lock'), ' ', t(l('Contraespionagem', 'Counter-intelligence'))),
      (s.flags.securityUntil ?? 0) > s.week ? pill(t(l('protegido', 'protected')), 'good') : null,
    ),
    h('table', { class: 'tbl compact' }, h('tbody', null, labels.map((lb) => {
      const ar = archetypeOf(lb);
      const riv = Math.round(s.rivalries[lb.id] ?? 0);
      return h('tr', null,
        h('td', null, labelLink(s, lb.id), lb.ceo ? h('small', { class: 'muted' }, ` · CEO ${lb.ceo}`) : null),
        h('td', { title: t(ARCHETYPES[ar].desc) }, t(ARCHETYPES[ar].name)),
        h('td', null, riv ? h('span', { class: `meter-bar ${riv > 50 ? 'bad' : 'mid'}`, title: `${riv}` }, h('span', { style: `width:${Math.min(100, riv)}%` })) : '—'),
        h('td', null, h('button', { class: 'btn small ghost', onclick: () => { toast(t(spyOnRival(s, r, lb.id)), 'info'); rerender(); } }, ic('camera'), ' ', t(l('Espionar', 'Spy')))),
      );
    }))),
  );
}
